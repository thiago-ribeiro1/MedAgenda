const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { Usuario, Paciente } = require("../models");
const { autenticar, permitir } = require("../middleware/auth");
const v = require("../services/validacoes");

const router = express.Router();
router.use(autenticar);

function validarUsuario(d, novo) {
  const erros = [];
  if (novo || d.nome !== undefined) if (!v.texto(d.nome, 3, 120)) erros.push("nome: de 3 a 120 caracteres");
  if (novo || d.email !== undefined) if (!v.emailValido(d.email)) erros.push("email: formato inválido");
  if (novo && !v.senhaForte(d.senha)) erros.push("senha: mínimo de 8 caracteres, com maiúscula, minúscula e número");
  if (novo && !["MEDICO", "SECRETARIA", "PACIENTE"].includes(d.perfil)) erros.push("perfil: MEDICO, SECRETARIA ou PACIENTE");
  if (d.perfil === "MEDICO") {
    if (!v.crmValido(d.crm)) erros.push("crm: formato CRM/UF 12345");
    if (!v.texto(d.especialidade, 3, 60)) erros.push("especialidade: obrigatória");
    if (!(Number(d.valorConsulta) > 0)) erros.push("valorConsulta: maior que zero");
    if (![15, 20, 30, 40, 60].includes(Number(d.duracaoConsulta))) erros.push("duracaoConsulta: 15, 20, 30, 40 ou 60 minutos");
    erros.push(...v.validarAgenda(d.agenda));
  }
  return erros;
}

const podeCriar = (req, res, next) =>
  req.usuario.perfil === "ADMIN" || (req.usuario.perfil === "SECRETARIA" && req.body && req.body.perfil === "PACIENTE")
    ? next()
    : res.status(403).json({ erro: "Apenas o administrador pode criar contas" });

router.get("/", permitir("ADMIN"), async (req, res, next) => {
  try {
    const filtro = req.query.perfil ? { perfil: req.query.perfil } : {};
    const lista = await Usuario.find(filtro).select("-senhaHash -__v").populate("paciente", "nome cpf").sort({ perfil: 1, nome: 1 });
    res.json(lista);
  } catch (e) { next(e); }
});

router.post("/", podeCriar, async (req, res, next) => {
  try {
    const d = req.body || {};
    const erros = validarUsuario(d, true);
    if (d.perfil === "PACIENTE" && !mongoose.isValidObjectId(d.pacienteId)) erros.push("pacienteId: vincule a conta a uma ficha de paciente");
    if (erros.length) return res.status(400).json({ erro: "Dados inválidos", detalhes: erros });

    if (await Usuario.exists({ email: d.email.trim().toLowerCase() })) return res.status(409).json({ erro: "E-mail já cadastrado" });
    if (d.perfil === "PACIENTE") {
      if (!(await Paciente.exists({ _id: d.pacienteId }))) return res.status(404).json({ erro: "Ficha de paciente não encontrada" });
      if (await Usuario.exists({ paciente: d.pacienteId })) return res.status(409).json({ erro: "Esta ficha já tem uma conta de acesso" });
    }

    const u = await Usuario.create({
      nome: d.nome.trim(), email: d.email, perfil: d.perfil, telefone: d.telefone || "",
      senhaHash: await bcrypt.hash(d.senha, 10),
      ...(d.perfil === "MEDICO" ? {
        crm: d.crm.trim(), especialidade: d.especialidade.trim(), valorConsulta: Number(d.valorConsulta),
        duracaoConsulta: Number(d.duracaoConsulta), agenda: d.agenda,
      } : {}),
      ...(d.perfil === "PACIENTE" ? { paciente: d.pacienteId } : {}),
    });
    res.status(201).json(u.publico());
  } catch (e) { next(e); }
});

router.put("/:id", permitir("ADMIN"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: "Usuário não encontrado" });
    const u = await Usuario.findById(req.params.id);
    if (!u) return res.status(404).json({ erro: "Usuário não encontrado" });
    const d = { ...u.toObject(), ...req.body, perfil: u.perfil };
    const erros = validarUsuario(d, false);
    if (erros.length) return res.status(400).json({ erro: "Dados inválidos", detalhes: erros });
    if (req.body.email && req.body.email.toLowerCase() !== u.email && await Usuario.exists({ email: req.body.email.toLowerCase() }))
      return res.status(409).json({ erro: "E-mail já cadastrado" });
    for (const campo of ["nome", "email", "telefone", "crm", "especialidade", "valorConsulta", "duracaoConsulta", "agenda"]) {
      if (req.body[campo] !== undefined) u[campo] = req.body[campo];
    }
    await u.save();
    res.json(u.publico());
  } catch (e) { next(e); }
});

router.patch("/:id/ativo", permitir("ADMIN"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: "Usuário não encontrado" });
    if (req.params.id === req.usuario.id) return res.status(422).json({ erro: "O administrador não pode desativar a própria conta" });
    const u = await Usuario.findByIdAndUpdate(req.params.id, { ativo: Boolean(req.body.ativo) }, { new: true });
    if (!u) return res.status(404).json({ erro: "Usuário não encontrado" });
    res.json(u.publico());
  } catch (e) { next(e); }
});

router.post("/:id/senha", permitir("ADMIN"), async (req, res, next) => {
  try {
    if (!v.senhaForte(req.body.novaSenha)) return res.status(400).json({ erro: "Senha fraca: mínimo de 8 caracteres, com maiúscula, minúscula e número" });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: "Usuário não encontrado" });
    const u = await Usuario.findByIdAndUpdate(req.params.id, { senhaHash: await bcrypt.hash(req.body.novaSenha, 10) });
    if (!u) return res.status(404).json({ erro: "Usuário não encontrado" });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;

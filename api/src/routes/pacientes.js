const express = require("express");
const mongoose = require("mongoose");
const { Paciente, Consulta, Usuario } = require("../models");
const { autenticar, permitir } = require("../middleware/auth");
const v = require("../services/validacoes");

const router = express.Router();
router.use(autenticar);

const escapar = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/eu", permitir("PACIENTE"), async (req, res, next) => {
  try {
    const p = await Paciente.findById(req.usuario.paciente);
    if (!p) return res.status(404).json({ erro: "Ficha não encontrada" });
    res.json(p);
  } catch (e) { next(e); }
});

router.get("/", permitir("ADMIN", "SECRETARIA", "MEDICO"), async (req, res, next) => {
  try {
    const filtro = {};
    const busca = (req.query.busca || "").trim();
    if (busca) {
      const digitos = v.somenteDigitos(busca);
      filtro.$or = [{ nome: { $regex: escapar(busca), $options: "i" } }];
      if (digitos.length >= 3) filtro.$or.push({ cpf: { $regex: digitos } });
    }
    if (req.usuario.perfil === "MEDICO") {
      filtro._id = { $in: await Consulta.distinct("paciente", { medico: req.usuario.id }) };
    }
    const lista = await Paciente.find(filtro).sort({ nome: 1 }).limit(200);
    const comConta = new Set((await Usuario.find({ paciente: { $in: lista.map(p => p._id) } }).select("paciente")).map(u => String(u.paciente)));
    res.json(lista.map(p => ({ ...p.toObject(), temConta: comConta.has(String(p._id)) })));
  } catch (e) { next(e); }
});

router.get("/:id", permitir("ADMIN", "SECRETARIA", "MEDICO"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: "Paciente não encontrado" });
    if (req.usuario.perfil === "MEDICO" && !(await Consulta.exists({ medico: req.usuario.id, paciente: req.params.id })))
      return res.status(403).json({ erro: "Paciente sem consultas com você" });
    const p = await Paciente.findById(req.params.id);
    if (!p) return res.status(404).json({ erro: "Paciente não encontrado" });
    res.json(p);
  } catch (e) { next(e); }
});

router.post("/", permitir("ADMIN", "SECRETARIA"), async (req, res, next) => {
  try {
    const d = req.body || {};
    const erros = v.validarPaciente(d);
    if (erros.length) return res.status(400).json({ erro: "Dados inválidos", detalhes: erros });
    const p = await Paciente.create({ ...d, cpf: v.formatarCpf(d.cpf), nome: d.nome.trim() });
    res.status(201).json(p);
  } catch (e) { next(e); }
});

router.put("/:id", permitir("ADMIN", "SECRETARIA"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: "Paciente não encontrado" });
    const erros = v.validarPaciente(req.body || {}, true);
    if (erros.length) return res.status(400).json({ erro: "Dados inválidos", detalhes: erros });
    const dados = { ...req.body };
    if (dados.cpf) dados.cpf = v.formatarCpf(dados.cpf);
    const p = await Paciente.findByIdAndUpdate(req.params.id, dados, { new: true, runValidators: true });
    if (!p) return res.status(404).json({ erro: "Paciente não encontrado" });
    res.json(p);
  } catch (e) { next(e); }
});

module.exports = router;

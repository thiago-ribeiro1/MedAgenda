const express = require("express");
const bcrypt = require("bcryptjs");
const { Usuario } = require("../models");
const { autenticar } = require("../middleware/auth");
const v = require("../services/validacoes");

const router = express.Router();
router.use(autenticar);

router.get("/", async (req, res, next) => {
  try {
    const u = await Usuario.findById(req.usuario.id).populate("paciente");
    if (!u) return res.status(404).json({ erro: "Usuário não encontrado" });
    res.json(u.publico());
  } catch (e) { next(e); }
});

router.put("/", async (req, res, next) => {
  try {
    const u = await Usuario.findById(req.usuario.id);
    const erros = [];
    if (req.body.nome !== undefined && !v.texto(req.body.nome, 3, 120)) erros.push("nome: de 3 a 120 caracteres");
    if (req.body.telefone !== undefined && !/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(req.body.telefone)) erros.push("telefone: formato (83) 99999-9999");
    if (erros.length) return res.status(400).json({ erro: "Dados inválidos", detalhes: erros });

    const editaveis = u.perfil === "MEDICO" ? ["nome", "telefone", "valorConsulta"] : ["nome", "telefone"];
    for (const campo of editaveis) if (req.body[campo] !== undefined) u[campo] = req.body[campo];
    await u.save();
    res.json(u.publico());
  } catch (e) { next(e); }
});

router.put("/senha", async (req, res, next) => {
  try {
    const { senhaAtual, novaSenha } = req.body || {};
    const u = await Usuario.findById(req.usuario.id);
    if (!senhaAtual || !(await bcrypt.compare(String(senhaAtual), u.senhaHash))) {
      return res.status(400).json({ erro: "Senha atual incorreta" });
    }
    if (!novaSenha) return res.status(400).json({ erro: "Informe a nova senha" });
    u.senhaHash = await bcrypt.hash(String(novaSenha), 10);
    await u.save();
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;

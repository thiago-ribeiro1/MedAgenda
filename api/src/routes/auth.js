const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");
const { JWT_SECRET, JWT_EXPIRA_EM } = require("../config");

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, senha } = req.body || {};
    if (!email || !senha) return res.status(400).json({ erro: "Informe e-mail e senha" });
    const u = await Usuario.findOne({ email: String(email).trim().toLowerCase() });
    if (!u || !(await bcrypt.compare(String(senha), u.senhaHash))) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos" });
    }
    const token = jwt.sign(
      { sub: String(u._id), perfil: u.perfil, nome: u.nome, paciente: u.paciente ? String(u.paciente) : null },
      JWT_SECRET, { expiresIn: JWT_EXPIRA_EM });
    res.json({ token, usuario: u.publico() });
  } catch (e) { next(e); }
});

module.exports = router;

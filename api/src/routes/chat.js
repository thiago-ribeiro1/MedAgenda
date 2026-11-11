const express = require("express");
const { MensagemChat } = require("../models");
const { autenticar } = require("../middleware/auth");
const { responder } = require("../services/assistente");

const router = express.Router();
router.use(autenticar);

router.get("/", async (req, res, next) => {
  try {
    const msgs = await MensagemChat.find({ usuario: req.usuario.id }).sort({ createdAt: -1 }).limit(50);
    res.json(msgs.reverse());
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const texto = String((req.body && req.body.mensagem) || "").trim();
    if (!texto) return res.status(400).json({ erro: "Escreva uma mensagem" });
    if (texto.length > 500) return res.status(400).json({ erro: "Mensagem com no máximo 500 caracteres" });
    await MensagemChat.create({ usuario: req.usuario.id, autor: "USUARIO", texto });
    const resposta = await responder(req.usuario, texto);
    const m = await MensagemChat.create({ usuario: req.usuario.id, autor: "ASSISTENTE", texto: resposta });
    res.status(201).json(m);
  } catch (e) { next(e); }
});

router.delete("/", async (req, res, next) => {
  try {
    await MensagemChat.deleteMany({ usuario: req.usuario.id });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;

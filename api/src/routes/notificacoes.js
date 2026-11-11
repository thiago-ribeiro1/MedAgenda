const express = require("express");
const mongoose = require("mongoose");
const { Notificacao } = require("../models");
const { autenticar } = require("../middleware/auth");

const router = express.Router();
router.use(autenticar);

router.get("/", async (req, res, next) => {
  try {
    const filtro = { usuario: req.usuario.id };
    if (req.query.naoLidas === "true") filtro.lida = false;
    res.json(await Notificacao.find(filtro).sort({ createdAt: -1 }).limit(100));
  } catch (e) { next(e); }
});

router.get("/contagem", async (req, res, next) => {
  try {
    res.json({ naoLidas: await Notificacao.countDocuments({ usuario: req.usuario.id, lida: false }) });
  } catch (e) { next(e); }
});

router.patch("/lidas", async (req, res, next) => {
  try {
    const recentes = await Notificacao.find({ usuario: req.usuario.id, lida: false }).sort({ createdAt: -1 }).limit(10).select("_id");
    const r = await Notificacao.updateMany({ _id: { $in: recentes.map(n => n._id) } }, { lida: true });
    res.json({ marcadas: r.modifiedCount });
  } catch (e) { next(e); }
});

router.patch("/:id/lida", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: "Notificação não encontrada" });
    const n = await Notificacao.findOneAndUpdate({ _id: req.params.id, usuario: req.usuario.id }, { lida: true }, { new: true });
    if (!n) return res.status(404).json({ erro: "Notificação não encontrada" });
    res.json(n);
  } catch (e) { next(e); }
});

module.exports = router;

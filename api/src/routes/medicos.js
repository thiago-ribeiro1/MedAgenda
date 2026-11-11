const express = require("express");
const mongoose = require("mongoose");
const { Usuario } = require("../models");
const { autenticar } = require("../middleware/auth");
const { horariosLivres } = require("../services/agenda");

const router = express.Router();
router.use(autenticar);

router.get("/", async (req, res, next) => {
  try {
    const lista = await Usuario.find({ perfil: "MEDICO", ativo: true })
      .select("nome especialidade crm valorConsulta duracaoConsulta agenda").sort({ nome: 1 });
    res.json(lista);
  } catch (e) { next(e); }
});

router.get("/:id/horarios", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: "Médico não encontrado" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.data || "")) return res.status(400).json({ erro: "Informe data=AAAA-MM-DD" });
    const medico = await Usuario.findOne({ _id: req.params.id, perfil: "MEDICO", ativo: true });
    if (!medico) return res.status(404).json({ erro: "Médico não encontrado" });
    res.json({ data: req.query.data, duracao: medico.duracaoConsulta, horarios: await horariosLivres(medico, req.query.data) });
  } catch (e) { next(e); }
});

module.exports = router;

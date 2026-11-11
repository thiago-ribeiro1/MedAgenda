const express = require("express");
const { Consulta, Usuario, Paciente, Notificacao } = require("../models");
const { autenticar } = require("../middleware/auth");
const { DIA, HORA } = require("../services/agenda");

const router = express.Router();
router.use(autenticar);

const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const pop = q => q.select("-prontuario").populate("paciente", "nome telefone").populate("medico", "nome especialidade");

router.get("/", async (req, res, next) => {
  try {
    const { perfil, id, paciente } = req.usuario;
    const ini = hoje(), fimDia = new Date(ini.getTime() + DIA), agora = new Date();
    const naoLidas = await Notificacao.countDocuments({ usuario: id, lida: false });
    const r = { perfil, naoLidas };

    if (perfil === "ADMIN") {
      const porPerfil = await Usuario.aggregate([{ $group: { _id: "$perfil", total: { $sum: 1 } } }]);
      const inicioMes = new Date(ini.getFullYear(), ini.getMonth(), 1);
      const receitaMes = await Consulta.aggregate([
        { $match: { status: "REALIZADA", inicio: { $gte: inicioMes, $lt: fimDia } } },
        { $group: { _id: null, total: { $sum: "$valor" } } },
      ]);
      Object.assign(r, {
        usuarios: Object.fromEntries(porPerfil.map(p => [p._id, p.total])),
        pacientes: await Paciente.countDocuments(),
        consultasHoje: await Consulta.countDocuments({ inicio: { $gte: ini, $lt: fimDia }, status: { $ne: "CANCELADA" } }),
        receitaMes: receitaMes[0] ? receitaMes[0].total : 0,
      });
    }
    if (perfil === "ADMIN" || perfil === "SECRETARIA") {
      Object.assign(r, {
        agendaHoje: await pop(Consulta.find({ inicio: { $gte: ini, $lt: fimDia } }).sort({ inicio: 1 })),
        aConfirmar: await pop(Consulta.find({ status: "AGENDADA", inicio: { $gt: agora, $lt: new Date(agora.getTime() + 48 * HORA) } }).sort({ inicio: 1 })),
      });
    }
    if (perfil === "MEDICO") {
      const agendaHoje = await pop(Consulta.find({ medico: id, inicio: { $gte: ini, $lt: fimDia }, status: { $ne: "CANCELADA" } }).sort({ inicio: 1 }));
      Object.assign(r, {
        agendaHoje,
        emAtendimento: agendaHoje.filter(c => c.status === "EM_ATENDIMENTO").length,
        proximas: await pop(Consulta.find({ medico: id, inicio: { $gte: fimDia }, status: { $in: ["AGENDADA", "CONFIRMADA"] } }).sort({ inicio: 1 }).limit(10)),
      });
    }
    if (perfil === "PACIENTE") {
      Object.assign(r, {
        proximas: await pop(Consulta.find({ paciente, inicio: { $gt: agora }, status: { $in: ["AGENDADA", "CONFIRMADA"] } }).sort({ inicio: 1 })),
        historico: await pop(Consulta.find({ paciente, status: "REALIZADA" }).sort({ inicio: -1 }).limit(5)),
      });
    }
    res.json(r);
  } catch (e) { next(e); }
});

module.exports = router;

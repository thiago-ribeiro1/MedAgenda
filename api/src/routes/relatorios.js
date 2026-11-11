const express = require("express");
const mongoose = require("mongoose");
const { Consulta, Usuario } = require("../models");
const { autenticar, permitir } = require("../middleware/auth");
const { DIA } = require("../services/agenda");
const { fmt } = require("../services/notificacoes");
const pdf = require("../services/pdf");

const router = express.Router();
router.use(autenticar);

const ROTULOS = {
  AGENDADA: "Agendada", CONFIRMADA: "Confirmada", EM_ATENDIMENTO: "Em atendimento",
  REALIZADA: "Realizada", CANCELADA: "Cancelada", FALTOU: "Faltou",
};
const real = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = iso => iso.split("-").reverse().join("/");
const pct = v => `${(v * 100).toFixed(1).replace(".", ",")}%`;

function periodo(req, res) {
  const { inicio, fim } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio || "") || !/^\d{4}-\d{2}-\d{2}$/.test(fim || "")) {
    res.status(400).json({ erro: "Informe inicio e fim no formato AAAA-MM-DD" });
    return null;
  }
  const local = s => { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); };
  const ini = local(inicio), f = local(fim);
  if (f < ini) { res.status(400).json({ erro: "A data final deve ser igual ou posterior à inicial" }); return null; }
  if (f - ini > 366 * DIA) { res.status(400).json({ erro: "Período máximo de 1 ano" }); return null; }
  return { inicio, fim, filtro: { $gte: ini, $lt: f } };
}

async function filtroBase(req, res) {
  const p = periodo(req, res);
  if (!p) return null;
  const filtro = { inicio: p.filtro };
  if (req.usuario.perfil === "MEDICO") filtro.medico = new mongoose.Types.ObjectId(req.usuario.id);
  else if (req.query.medicoId) {
    if (!mongoose.isValidObjectId(req.query.medicoId)) { res.status(400).json({ erro: "medicoId inválido" }); return null; }
    filtro.medico = new mongoose.Types.ObjectId(req.query.medicoId);
  }
  return { p, filtro };
}

async function dadosConsultas(filtro) {
  const lista = await Consulta.find(filtro).select("-prontuario")
    .populate("paciente", "nome").populate("medico", "nome especialidade").sort({ inicio: 1 });
  const porStatus = Object.fromEntries(Object.keys(ROTULOS).map(s => [s, 0]));
  const porMedico = {};
  for (const c of lista) {
    porStatus[c.status]++;
    const nome = c.medico ? c.medico.nome : "—";
    porMedico[nome] = porMedico[nome] || { medico: nome, total: 0, realizadas: 0, faltas: 0 };
    porMedico[nome].total++;
    if (c.status === "REALIZADA") porMedico[nome].realizadas++;
    if (c.status === "FALTOU") porMedico[nome].faltas++;
  }
  const total = lista.length;
  return {
    total, porStatus,
    taxaFaltas: total ? porStatus.FALTOU / total : 0,
    taxaCancelamento: total ? porStatus.CANCELADA / total : 0,
    porMedico: Object.values(porMedico).sort((a, b) => b.total - a.total),
    consultas: lista,
  };
}

async function dadosFinanceiro(filtro) {
  const lista = await Consulta.find({ ...filtro, status: { $ne: "FALTOU" } }).populate("medico", "nome");
  const porMedico = {}, porConvenio = {};
  let receita = 0;
  for (const c of lista) {
    receita += c.valor;
    const m = c.medico ? c.medico.nome : "—";
    porMedico[m] = porMedico[m] || { medico: m, atendimentos: 0, receita: 0 };
    porMedico[m].atendimentos++; porMedico[m].receita += c.valor;
    porConvenio[c.convenio] = porConvenio[c.convenio] || { convenio: c.convenio, atendimentos: 0, receita: 0 };
    porConvenio[c.convenio].atendimentos++; porConvenio[c.convenio].receita += c.valor;
  }
  const atendimentos = lista.length;
  return {
    receita, atendimentos, ticketMedio: atendimentos ? receita / atendimentos : 0,
    porMedico: Object.values(porMedico).sort((a, b) => b.receita - a.receita),
    porConvenio: Object.values(porConvenio).sort((a, b) => b.receita - a.receita),
  };
}

const horaUTC = d => {
  const x = new Date(d);
  return `${String(x.getUTCDate()).padStart(2, "0")}/${String(x.getUTCMonth() + 1).padStart(2, "0")} ${String(x.getUTCHours()).padStart(2, "0")}:${String(x.getUTCMinutes()).padStart(2, "0")}`;
};

// ---------- consultas ----------
router.get("/consultas", permitir("ADMIN", "SECRETARIA", "MEDICO"), async (req, res, next) => {
  try {
    const b = await filtroBase(req, res);
    if (!b) return;
    const d = await dadosConsultas(b.filtro);
    res.json({ periodo: { inicio: b.p.inicio, fim: b.p.fim }, ...d });
  } catch (e) { next(e); }
});

router.get("/consultas.pdf", permitir("ADMIN", "SECRETARIA", "MEDICO"), async (req, res, next) => {
  try {
    const b = await filtroBase(req, res);
    if (!b) return;
    const d = await dadosConsultas(b.filtro);
    const doc = pdf.novoPdf(res, `relatorio-consultas-${b.p.inicio}-a-${b.p.fim}.pdf`, "Relatório de consultas");
    pdf.campo(doc, "Período", `${dataBR(b.p.inicio)} a ${dataBR(b.p.fim)}`);
    if (b.filtro.medico) {
      const m = await Usuario.findById(b.filtro.medico).select("nome");
      pdf.campo(doc, "Médico", m ? m.nome : "—");
    }
    pdf.campo(doc, "Emitido por", req.usuario.nome);
    doc.moveDown(0.8).font("Helvetica-Bold").fontSize(12).fillColor(pdf.AZUL).text("Resumo").fillColor("#1D2733");
    pdf.tabela(doc, ["Total", "Agend.", "Confirm.", "Em atend.", "Realiz.", "Cancel.", "Faltas", "% faltas", "% cancel."],
      [[d.total, ...Object.keys(ROTULOS).map(s => d.porStatus[s]), pct(d.taxaFaltas), pct(d.taxaCancelamento)]],
      [45, 52, 58, 58, 52, 52, 45, 66, 67]);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(pdf.AZUL).text("Por médico").fillColor("#1D2733");
    pdf.tabela(doc, ["Médico", "Total", "Realizadas", "Faltas"],
      d.porMedico.map(m => [m.medico, m.total, m.realizadas, m.faltas]), [235, 80, 90, 90]);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(pdf.AZUL).text("Consultas do período").fillColor("#1D2733");
    pdf.tabela(doc, ["Data/hora", "Paciente", "Médico", "Tipo", "Situação"],
      d.consultas.map(c => [horaUTC(c.inicio), c.paciente ? c.paciente.nome : "—", c.medico ? c.medico.nome : "—",
        c.tipo === "RETORNO" ? "Retorno" : "Primeira", ROTULOS[c.status]]),
      [70, 140, 130, 70, 85]);
    pdf.rodape(doc, `Gerado em ${fmt(new Date())} · Clínica MedAgenda`);
    doc.end();
  } catch (e) { next(e); }
});

// ---------- financeiro ----------
router.get("/financeiro", permitir("ADMIN"), async (req, res, next) => {
  try {
    const b = await filtroBase(req, res);
    if (!b) return;
    res.json({ periodo: { inicio: b.p.inicio, fim: b.p.fim }, ...(await dadosFinanceiro(b.filtro)) });
  } catch (e) { next(e); }
});

router.get("/financeiro.pdf", permitir("ADMIN"), async (req, res, next) => {
  try {
    const b = await filtroBase(req, res);
    if (!b) return;
    const d = await dadosFinanceiro(b.filtro);
    const doc = pdf.novoPdf(res, `relatorio-financeiro-${b.p.inicio}-a-${b.p.fim}.pdf`, "Relatório financeiro");
    pdf.campo(doc, "Período", `${dataBR(b.p.inicio)} a ${dataBR(b.p.fim)}`);
    pdf.campo(doc, "Receita total", real(d.receita));
    pdf.campo(doc, "Atendimentos", String(d.atendimentos));
    pdf.campo(doc, "Ticket médio", real(d.ticketMedio));
    doc.moveDown(0.8).font("Helvetica-Bold").fontSize(12).fillColor(pdf.AZUL).text("Por médico").fillColor("#1D2733");
    pdf.tabela(doc, ["Médico", "Atendimentos", "Receita"], d.porMedico.map(m => [m.medico, m.atendimentos, real(m.receita)]), [255, 110, 130]);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(pdf.AZUL).text("Por convênio").fillColor("#1D2733");
    pdf.tabela(doc, ["Convênio", "Atendimentos", "Receita"], d.porConvenio.map(m => [m.convenio, m.atendimentos, real(m.receita)]), [255, 110, 130]);
    pdf.rodape(doc, `Gerado em ${fmt(new Date())} · Documento de uso interno`);
    doc.end();
  } catch (e) { next(e); }
});

module.exports = router;

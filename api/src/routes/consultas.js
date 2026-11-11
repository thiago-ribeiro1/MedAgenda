const express = require("express");
const mongoose = require("mongoose");
const { Consulta, Paciente, Usuario } = require("../models");
const { autenticar, permitir } = require("../middleware/auth");
const ag = require("../services/agenda");
const { avisarConsulta, fmt } = require("../services/notificacoes");
const pdf = require("../services/pdf");

const router = express.Router();
router.use(autenticar);

const POPULAR = [["paciente", "nome cpf dataNascimento convenio telefone alergias"], ["medico", "nome especialidade crm"]];
const popular = q => POPULAR.reduce((acc, [c, campos]) => acc.populate(c, campos), q);

function visivel(req, c) {
  const { perfil, id, paciente } = req.usuario;
  if (perfil === "ADMIN" || perfil === "SECRETARIA") return true;
  if (perfil === "MEDICO") return String(c.medico._id || c.medico) === id;
  return String(c.paciente._id || c.paciente) === String(paciente);
}

async function carregar(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ erro: "Consulta não encontrada" }); return null; }
  const c = await popular(Consulta.findById(req.params.id));
  if (!c) { res.status(404).json({ erro: "Consulta não encontrada" }); return null; }
  if (!visivel(req, c)) { res.status(403).json({ erro: "Consulta de outro paciente ou médico" }); return null; }
  return c;
}

const ehMedicoDa = (req, c) => req.usuario.perfil === "MEDICO" && String(c.medico._id) === req.usuario.id;

// ---------- listagem e detalhe ----------
router.get("/", async (req, res, next) => {
  try {
    const { perfil, id, paciente } = req.usuario;
    const filtro = {};
    if (req.query.status) filtro.status = req.query.status;
    if (req.query.medicoId) filtro.medico = req.query.medicoId;
    if (req.query.pacienteId) filtro.paciente = req.query.pacienteId;
    if (req.query.data) {
      const [a, m, d] = req.query.data.split("-").map(Number);
      const ini = new Date(a, m - 1, d);
      filtro.inicio = { $gte: ini, $lt: new Date(ini.getTime() + ag.DIA) };
    }
    if (perfil === "MEDICO") filtro.medico = id;
    if (perfil === "PACIENTE" && !req.query.pacienteId) filtro.paciente = paciente;

    const lista = await popular(Consulta.find(filtro).select("-prontuario").sort({ inicio: req.query.ordem === "desc" ? -1 : 1 }).limit(500));
    res.json(lista);
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const c = await carregar(req, res);
    if (c) res.json(c);
  } catch (e) { next(e); }
});

// ---------- agendamento ----------
router.post("/", permitir("PACIENTE", "SECRETARIA", "ADMIN"), async (req, res, next) => {
  try {
    const d = req.body || {};
    const ehPaciente = req.usuario.perfil === "PACIENTE";
    const pacienteId = ehPaciente ? req.usuario.paciente : d.pacienteId;
    if (!mongoose.isValidObjectId(pacienteId)) return res.status(400).json({ erro: "pacienteId inválido" });
    if (!mongoose.isValidObjectId(d.medicoId)) return res.status(400).json({ erro: "medicoId inválido" });
    const inicio = new Date(d.inicio);
    if (isNaN(inicio)) return res.status(400).json({ erro: "inicio: data e hora inválidas" });
    const tipo = d.tipo || "PRIMEIRA";
    if (!["PRIMEIRA", "RETORNO"].includes(tipo)) return res.status(400).json({ erro: "tipo: PRIMEIRA ou RETORNO" });

    const [paciente, medico] = await Promise.all([
      Paciente.findById(pacienteId),
      Usuario.findOne({ _id: d.medicoId, perfil: "MEDICO", ativo: true }),
    ]);
    if (!paciente) return res.status(404).json({ erro: "Paciente não encontrado" });
    if (!medico) return res.status(404).json({ erro: "Médico não encontrado" });

    const agora = Date.now();
    if (ehPaciente) {
      if (inicio.getTime() < agora + ag.ANTECEDENCIA_MINIMA_PACIENTE)
        return res.status(422).json({ erro: "Agende com pelo menos 2 horas de antecedência" });
    }
    const fim = new Date(inicio.getTime() + medico.duracaoConsulta * ag.MINUTO);
    if (!ag.dentroDaAgenda(medico, inicio)) return res.status(422).json({ erro: "Horário fora da agenda do médico" });
    if (await ag.temConflito(medico._id, inicio, fim)) return res.status(409).json({ erro: "Horário já ocupado" });

    const futuras = await Consulta.countDocuments({ paciente: paciente._id, status: "AGENDADA", inicio: { $gt: new Date() } });
    if (futuras >= ag.MAX_CONSULTAS_FUTURAS)
      return res.status(422).json({ erro: `O paciente já tem ${ag.MAX_CONSULTAS_FUTURAS} consultas futuras` });

    let valor = medico.valorConsulta;
    if (tipo === "RETORNO") {
      const desde = new Date(inicio.getTime() - ag.PRAZO_RETORNO_DIAS * ag.DIA);
      const anterior = await Consulta.exists({ paciente: paciente._id, medico: medico._id, inicio: { $gte: desde, $lt: inicio } });
      if (!anterior) return res.status(422).json({ erro: "Retorno exige consulta realizada com o mesmo médico nos últimos 30 dias" });
      valor = 0;
    }

    const c = await Consulta.create({
      paciente: paciente._id, medico: medico._id, inicio, fim, tipo, valor,
      convenio: paciente.convenio, motivo: (d.motivo || "").slice(0, 300), criadaPor: req.usuario.id,
    });
    await avisarConsulta(c, "AGENDADA");
    res.status(201).json(await popular(Consulta.findById(c._id)));
  } catch (e) { next(e); }
});

// ---------- mudanças de status ----------
router.patch("/:id/confirmar", permitir("SECRETARIA", "ADMIN"), async (req, res, next) => {
  try {
    const c = await carregar(req, res);
    if (!c) return;
    if (c.status !== "AGENDADA") return res.status(422).json({ erro: "Só consultas agendadas podem ser confirmadas" });
    c.status = "CONFIRMADA";
    await c.save();
    await avisarConsulta(c, "CONFIRMADA");
    res.json(c);
  } catch (e) { next(e); }
});

router.patch("/:id/cancelar", permitir("PACIENTE", "SECRETARIA", "ADMIN"), async (req, res, next) => {
  try {
    const c = await carregar(req, res);
    if (!c) return;
    if (req.usuario.perfil === "PACIENTE" && c.inicio.getTime() - Date.now() < ag.LIMITE_CANCELAMENTO_PACIENTE)
      return res.status(422).json({ erro: "Cancelamento pelo paciente só é possível até 24 horas antes. Fale com a recepção." });
    c.status = "CANCELADA";
    c.canceladaPor = req.usuario.id;
    c.motivoCancelamento = (req.body && req.body.motivo) || "";
    await c.save();
    await avisarConsulta(c, "CANCELADA");
    res.json(c);
  } catch (e) { next(e); }
});

router.patch("/:id/falta", permitir("SECRETARIA", "ADMIN"), async (req, res, next) => {
  try {
    const c = await carregar(req, res);
    if (!c) return;
    if (!["AGENDADA", "CONFIRMADA"].includes(c.status)) return res.status(422).json({ erro: "Status não permite registrar falta" });
    if (c.inicio > new Date()) return res.status(422).json({ erro: "Só é possível registrar falta depois do horário da consulta" });
    c.status = "FALTOU";
    await c.save();
    res.json(c);
  } catch (e) { next(e); }
});

router.patch("/:id/iniciar", permitir("MEDICO"), async (req, res, next) => {
  try {
    const c = await carregar(req, res);
    if (!c) return;
    if (!ehMedicoDa(req, c)) return res.status(403).json({ erro: "Consulta de outro médico" });
    if (c.status !== "CONFIRMADA") return res.status(422).json({ erro: "Só consultas confirmadas podem ser iniciadas" });
    c.status = "EM_ATENDIMENTO";
    await c.save();
    res.json(c);
  } catch (e) { next(e); }
});

router.put("/:id/prontuario", permitir("MEDICO"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: "Consulta não encontrada" });
    const c = await popular(Consulta.findById(req.params.id));
    if (!c) return res.status(404).json({ erro: "Consulta não encontrada" });
    if (c.status !== "EM_ATENDIMENTO") return res.status(422).json({ erro: "O prontuário só pode ser registrado durante o atendimento" });
    const d = req.body || {};
    const dias = Number(d.atestadoDias || 0);
    if (!Number.isInteger(dias) || dias > 15) return res.status(400).json({ erro: "atestadoDias: de 0 a 15" });
    const prescricao = Array.isArray(d.prescricao) ? d.prescricao.filter(i => i && i.medicamento) : [];
    c.prontuario = {
      queixa: d.queixa || "", anamnese: d.anamnese || "", diagnostico: d.diagnostico || "", conduta: d.conduta || "",
      prescricao, atestadoDias: dias, registradoPor: req.usuario.id, registradoEm: new Date(),
    };
    await c.save();
    res.json(c);
  } catch (e) { next(e); }
});

router.patch("/:id/finalizar", permitir("MEDICO"), async (req, res, next) => {
  try {
    const c = await carregar(req, res);
    if (!c) return;
    if (!ehMedicoDa(req, c)) return res.status(403).json({ erro: "Consulta de outro médico" });
    if (c.status !== "EM_ATENDIMENTO") return res.status(422).json({ erro: "Só consultas em atendimento podem ser finalizadas" });
    if (!c.prontuario || !c.prontuario.diagnostico) return res.status(422).json({ erro: "Registre o prontuário com diagnóstico antes de finalizar" });
    c.status = "REALIZADA";
    await c.save();
    await avisarConsulta(c, "REALIZADA");
    res.json(c);
  } catch (e) { next(e); }
});

// ---------- documentos em PDF ----------
async function documento(req, res, next, tipo) {
  try {
    if (req.usuario.perfil === "SECRETARIA") return res.status(403).json({ erro: "Documentos clínicos são restritos ao médico e ao paciente" });
    const c = await carregar(req, res);
    if (!c) return;
    if (tipo !== "comprovante" && c.status !== "REALIZADA") return res.status(422).json({ erro: "Documento disponível após a consulta" });
    const p = c.paciente, m = c.medico, pr = c.prontuario || {};
    if (tipo === "receita" && !(pr.prescricao && pr.prescricao.length)) return res.status(404).json({ erro: "Consulta sem prescrição" });
    if (tipo === "atestado" && !(pr.atestadoDias > 0)) return res.status(404).json({ erro: "Consulta sem atestado" });

    const titulos = { receita: "Receituário", atestado: "Atestado médico", comprovante: "Comprovante de agendamento" };
    const doc = pdf.novoPdf(res, `${tipo}-${c._id}.pdf`, titulos[tipo]);
    pdf.campo(doc, "Paciente", p.nome);
    pdf.campo(doc, "CPF", p.cpf);
    pdf.campo(doc, "Data da consulta", fmt(c.inicio));
    doc.moveDown();
    if (tipo === "receita") {
      pr.prescricao.forEach((i, n) => {
        doc.font("Helvetica-Bold").fontSize(12).text(`${n + 1}. ${i.medicamento}`);
        doc.font("Helvetica").fontSize(11).text(i.posologia || "", { indent: 16 }).moveDown(0.6);
      });
      pdf.assinatura(doc, m);
    } else if (tipo === "atestado") {
      doc.fontSize(12).text(
        `Atesto, para os devidos fins, que ${p.nome} esteve sob meus cuidados nesta data e necessita de ` +
        `${pr.atestadoDias} dia(s) de afastamento de suas atividades a partir de ${fmt(c.inicio).split(" ")[0]}.`,
        { align: "justify", lineGap: 4 });
      pdf.assinatura(doc, m);
    } else {
      pdf.campo(doc, "Médico", `${m.nome} (${m.especialidade})`);
      pdf.campo(doc, "Tipo", c.tipo === "RETORNO" ? "Retorno" : "Primeira consulta");
      pdf.campo(doc, "Situação", c.status);
      pdf.campo(doc, "Convênio", c.convenio);
      pdf.campo(doc, "Valor", c.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
    }
    pdf.rodape(doc, `Documento emitido eletronicamente em ${fmt(new Date())} · Código ${c._id}`);
    doc.end();
  } catch (e) { next(e); }
}

router.get("/:id/receita.pdf", (req, res, next) => documento(req, res, next, "receita"));
router.get("/:id/atestado.pdf", (req, res, next) => documento(req, res, next, "atestado"));
router.get("/:id/comprovante.pdf", (req, res, next) => documento(req, res, next, "comprovante"));

module.exports = router;

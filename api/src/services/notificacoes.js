const { Notificacao, Usuario, Consulta } = require("../models");
const { HORA } = require("./agenda");

const fmt = d => new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

async function notificar(usuarioId, tipo, titulo, mensagem, consultaId) {
  if (!usuarioId) return;
  await Notificacao.create({ usuario: usuarioId, tipo, titulo, mensagem, consulta: consultaId });
}

async function usuarioDoPaciente(pacienteId) {
  const u = await Usuario.findOne({ paciente: pacienteId, perfil: "PACIENTE" }).select("_id");
  return u ? u._id : null;
}

async function avisarConsulta(consulta, evento) {
  const c = await Consulta.findById(consulta._id).populate("paciente", "nome").populate("medico", "nome");
  const quando = fmt(c.inicio);
  const idPaciente = await usuarioDoPaciente(c.paciente._id);
  if (evento === "AGENDADA") {
    await notificar(idPaciente, "CONSULTA", "Consulta agendada", `Sua consulta com ${c.medico.nome} foi agendada para ${quando}.`, c._id);
    await notificar(c.medico._id, "CONSULTA", "Nova consulta na agenda", `${c.paciente.nome} em ${quando}.`, c._id);
  } else if (evento === "CONFIRMADA") {
    await notificar(idPaciente, "CONSULTA", "Consulta confirmada", `Sua consulta de ${quando} com ${c.medico.nome} foi confirmada.`, c._id);
  } else if (evento === "CANCELADA") {
    await notificar(idPaciente, "CANCELAMENTO", "Consulta cancelada", `A consulta de ${quando} com ${c.medico.nome} foi cancelada.`, c._id);
    await notificar(c.medico._id, "CANCELAMENTO", "Consulta cancelada", `${c.paciente.nome}, ${quando}, foi cancelada.`, c._id);
  } else if (evento === "REALIZADA") {
    await notificar(idPaciente, "DOCUMENTO", "Atendimento concluído", `Os documentos da consulta de ${quando} já estão disponíveis.`, c._id);
  }
}

async function enviarLembretes() {
  const agora = new Date();
  const pendentes = await Consulta.find({
    inicio: { $gt: agora, $lte: new Date(agora.getTime() + 24 * HORA) },
    lembreteEnviado: false,
  }).populate("medico", "nome");
  for (const c of pendentes) {
    const idPaciente = await usuarioDoPaciente(c.paciente);
    await notificar(idPaciente, "LEMBRETE", "Lembrete de consulta", `Você tem consulta com ${c.medico.nome} em ${fmt(c.inicio)}.`, c._id);
    c.lembreteEnviado = true;
    await c.save();
  }
  return pendentes.length;
}

module.exports = { notificar, avisarConsulta, enviarLembretes, fmt };

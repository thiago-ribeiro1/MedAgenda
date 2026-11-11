// Regras de agendamento (ver especificação de requisitos)
const { Consulta } = require("../models");

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const ATIVAS = ["AGENDADA", "CONFIRMADA", "EM_ATENDIMENTO"];

const ANTECEDENCIA_MINIMA_PACIENTE = 2 * MINUTO;
const LIMITE_CANCELAMENTO_PACIENTE = 12 * HORA;
const MAX_CONSULTAS_FUTURAS = 3;
const PRAZO_RETORNO_DIAS = 30;

const paraMinutos = hhmm => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function dentroDaAgenda(medico, inicio) {
  const dia = inicio.getDay();
  const minutos = inicio.getHours() * 60 + inicio.getMinutes();
  return (medico.agenda || []).some(b =>
    b.diaSemana === dia && minutos >= paraMinutos(b.inicio) && minutos <= paraMinutos(b.fim));
}

async function temConflito(medicoId, inicio, fim, ignorarId) {
  const filtro = { medico: medicoId, status: { $in: ATIVAS }, inicio };
  if (ignorarId) filtro._id = { $ne: ignorarId };
  return Boolean(await Consulta.exists(filtro));
}

async function horariosLivres(medico, dataISO) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const base = new Date(ano, mes - 1, dia);
  const blocos = (medico.agenda || []).filter(b => b.diaSemana === base.getDay());
  const doDia = await Consulta.find({
    medico: medico._id, status: { $in: ATIVAS },
    inicio: { $gte: base, $lt: new Date(base.getTime() + DIA) },
  });
  const agora = Date.now();
  const livres = [];
  for (const b of blocos) {
    for (let m = paraMinutos(b.inicio); m + medico.duracaoConsulta <= paraMinutos(b.fim); m += medico.duracaoConsulta) {
      const ini = new Date(ano, mes - 1, dia, Math.floor(m / 60), m % 60);
      const fim = new Date(ini.getTime() + medico.duracaoConsulta * MINUTO);
      const ocupado = doDia.some(c => c.inicio < fim && c.fim > ini);
      if (!ocupado && ini.getTime() > agora) livres.push(ini.toISOString());
    }
  }
  return livres;
}

module.exports = {
  MINUTO, HORA, DIA, ATIVAS,
  ANTECEDENCIA_MINIMA_PACIENTE, LIMITE_CANCELAMENTO_PACIENTE, MAX_CONSULTAS_FUTURAS, PRAZO_RETORNO_DIAS,
  dentroDaAgenda, temConflito, horariosLivres, paraMinutos,
};

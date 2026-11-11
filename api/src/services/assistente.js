// Assistente virtual da clínica: orientações administrativas, nunca diagnóstico
const { Consulta, Usuario } = require("../models");
const { IA_API_KEY, IA_MODELO, NOME_CLINICA } = require("../config");
const { fmt } = require("./notificacoes");

const SINAIS_DE_URGENCIA = ["dor no peito", "falta de ar", "desmaio", "sangramento", "convulsão", "convulsao"];

const RESPOSTA_URGENCIA =
  "Isso pode ser uma emergência. Ligue agora para o SAMU (192) ou procure a UPA ou o pronto-socorro mais próximo. " +
  "O agendamento de consultas não é indicado para situações de urgência.";

const RESPOSTA_SEM_DIAGNOSTICO =
  "Não posso avaliar sintomas, indicar diagnósticos ou medicamentos. Para isso, agende uma consulta com um de nossos médicos. " +
  "Se os sintomas forem intensos ou piorarem, procure atendimento de urgência.";

const normalizar = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const contem = (texto, termos) => termos.some(t => texto.includes(t));

async function proximaConsulta(usuario) {
  if (!usuario.paciente) return null;
  return Consulta.findOne({ paciente: usuario.paciente, inicio: { $gt: new Date() }, status: { $in: ["AGENDADA", "CONFIRMADA"] } })
    .sort({ inicio: -1 }).populate("medico", "nome especialidade");
}

async function responderLocal(usuario, mensagem) {
  const t = normalizar(mensagem);

  if (contem(mensagem, SINAIS_DE_URGENCIA)) return RESPOSTA_URGENCIA;

  if (contem(t, ["oi", "ola", "bom dia", "boa tarde", "boa noite"]) && t.length < 25)
    return `Olá, ${usuario.nome.split(" ")[0]}! Sou o assistente virtual da ${NOME_CLINICA}. Posso ajudar com consultas, horários, médicos e documentos.`;

  if (contem(t, ["proxima consulta", "minha consulta", "minhas consultas", "quando e minha"])) {
    if (usuario.perfil !== "PACIENTE") return "Essa consulta é para pacientes. Para ver a agenda, use o menu Agenda.";
    const c = await proximaConsulta(usuario);
    return c
      ? `Sua próxima consulta é em ${fmt(c.inicio)}, com ${c.medico.nome} (${c.medico.especialidade}). Status: ${c.status.toLowerCase()}.`
      : "Você não tem consultas futuras. Para agendar, use o menu Agendar consulta.";
  }

  if (contem(t, ["tenho ", "estou com", "sintoma", "remedio", "medicamento", "posso tomar", "diagnostico", "doenca"]))
    return RESPOSTA_SEM_DIAGNOSTICO;

  if (contem(t, ["cancelar", "desmarcar"]))
    return "Pacientes podem cancelar pelo menu Minhas consultas até 24 horas antes do horário. Com menos de 24 horas, fale com a recepção pelo telefone (83) 3333-0000.";

  if (contem(t, ["agendar", "marcar", "agenda"]))
    return "Para agendar, abra Agendar consulta, escolha o médico, a data e um dos horários livres. A consulta precisa ser marcada com pelo menos 2 horas de antecedência.";

  if (contem(t, ["medico", "medica", "especialidade", "doutor", "doutora"])) {
    const medicos = await Usuario.find({ perfil: "MEDICO", ativo: true }).select("nome especialidade").sort({ nome: 1 });
    return "Nossos médicos: " + medicos.map(m => `${m.nome} (${m.especialidade})`).join("; ") + ".";
  }

  if (contem(t, ["horario", "funcionamento", "abre", "fecha"]))
    return "A clínica funciona de segunda a sexta, das 7h às 19h. Os horários de cada médico aparecem na tela de agendamento.";

  if (contem(t, ["atestado", "receita", "documento", "comprovante"]))
    return "Depois da consulta, receita, atestado e comprovante ficam disponíveis em Minhas consultas, no botão de cada documento, em PDF.";

  if (contem(t, ["convenio", "plano", "valor", "preco", "pagamento"]))
    return "Atendemos particular e os convênios cadastrados na recepção. O valor da consulta particular aparece ao escolher o médico. Retornos em até 30 dias são gratuitos.";

  return "Não entendi. Posso ajudar com: próxima consulta, agendar, cancelar, médicos e especialidades, horários, documentos e convênios.";
}

async function responderComIA(usuario, mensagem) {
  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": IA_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: IA_MODELO,
      max_tokens: 400,
      system:
        `Você é o assistente virtual da ${NOME_CLINICA}. Responda em português, de forma breve, apenas sobre assuntos administrativos ` +
        "da clínica: agendamento, cancelamento, horários, médicos, documentos e convênios. Nunca faça diagnóstico nem indique medicamentos; " +
        "nesses casos, oriente a agendar consulta. Em sinais de urgência, oriente ligar 192 (SAMU).",
      messages: [{ role: "user", content: mensagem }],
    }),
  });
  if (!resposta.ok) throw new Error(`IA indisponível (${resposta.status})`);
  const dados = await resposta.json();
  return dados.content.map(b => b.text || "").join("").trim();
}

async function responder(usuario, mensagem) {
  if (IA_API_KEY) {
    if (contem(normalizar(mensagem), SINAIS_DE_URGENCIA)) return RESPOSTA_URGENCIA;
    try {
      return await responderComIA(usuario, mensagem);
    } catch (e) {
      console.error(e.message);
    }
  }
  return responderLocal(usuario, mensagem);
}

module.exports = { responder, responderLocal };

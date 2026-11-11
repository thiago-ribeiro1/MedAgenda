// Dados de demonstração do MedAgenda.
// Uso: npm run seed  (apaga tudo e recria)  — a API também popula o banco vazio ao iniciar.
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Usuario, Paciente, Consulta, Notificacao, MensagemChat } = require("./models");
const { MONGO_URL } = require("./config");

const MIN = 60 * 1000, DIA = 24 * 60 * MIN;

// ---------- utilitários ----------
function gerarCpf(base9) {
  const d = String(base9).padStart(9, "0").split("").map(Number);
  const dv = n => { const s = d.slice(0, n).reduce((a, x, i) => a + x * (n + 1 - i), 0); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  d.push(dv(9)); d.push(dv(10));
  const s = d.join("");
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

let semente = 20262;
const aleatorio = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
const escolher = lista => lista[Math.floor(aleatorio() * lista.length)];

const hojeZero = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const paraMin = hhmm => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

function slotsDoDia(medico, dia) {
  const lista = [];
  for (const b of medico.agenda.filter(b => b.diaSemana === dia.getDay())) {
    for (let m = paraMin(b.inicio); m + medico.duracaoConsulta <= paraMin(b.fim); m += medico.duracaoConsulta) {
      lista.push(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(m / 60), m % 60));
    }
  }
  return lista;
}

// ---------- dados ----------
const MEDICOS = [
  {
    nome: "Dra. Helena Costa", email: "helena.costa@medagenda.dev", telefone: "(83) 98811-2001",
    crm: "CRM/PB 10234", especialidade: "Clínica Geral", valorConsulta: 200, duracaoConsulta: 30,
    agenda: [1, 2, 3, 4, 5].flatMap(d => [{ diaSemana: d, inicio: "08:00", fim: "12:00" }, { diaSemana: d, inicio: "14:00", fim: "18:00" }]),
  },
  {
    nome: "Dr. Ricardo Alves", email: "ricardo.alves@medagenda.dev", telefone: "(83) 98811-2002",
    crm: "CRM/PB 20456", especialidade: "Cardiologia", valorConsulta: 350, duracaoConsulta: 40,
    agenda: [2, 4].map(d => ({ diaSemana: d, inicio: "08:00", fim: "17:00" })),
  },
  {
    nome: "Dra. Marina Duarte", email: "marina.duarte@medagenda.dev", telefone: "(83) 98811-2003",
    crm: "CRM/PB 30789", especialidade: "Pediatria", valorConsulta: 250, duracaoConsulta: 20,
    agenda: [1, 3, 5].map(d => ({ diaSemana: d, inicio: "13:00", fim: "18:00" })),
  },
];

const PACIENTES = [
  { nome: "Ana Beatriz Souza", nasc: "1990-03-14", sexo: "F", convenio: "Plano Saúde Vida", carteirinha: "PSV-004512", alergias: "Dipirona", telefone: "(83) 99901-1001", email: "ana.souza@email.dev", conta: true },
  { nome: "Carlos Eduardo Lima", nasc: "1978-11-02", sexo: "M", convenio: "Particular", telefone: "(83) 99901-1002", email: "carlos.lima@email.dev", conta: true },
  { nome: "Fernanda Rocha Alves", nasc: "1985-07-21", sexo: "F", convenio: "Plano Saúde Vida", carteirinha: "PSV-007733", telefone: "(83) 99901-1003", email: "fernanda.rocha@email.dev", conta: true },
  { nome: "Luíza Martins Costa", nasc: "1962-01-30", sexo: "F", convenio: "Particular", alergias: "Penicilina", telefone: "(83) 99901-1004", email: "luiza.costa@email.dev", conta: true },
  { nome: "Miguel Duarte Neves", nasc: "2019-05-09", sexo: "M", convenio: "Plano Saúde Vida", carteirinha: "PSV-010020", telefone: "(83) 99901-1005", observacoes: "Responsável: Carla Neves (mãe)" },
  { nome: "Roberto Farias", nasc: "1955-09-12", sexo: "M", convenio: "Particular", telefone: "(83) 99901-1006", observacoes: "Hipertenso, usa losartana" },
  { nome: "Patrícia Gomes", nasc: "1993-04-04", sexo: "F", convenio: "Bem Estar Saúde", carteirinha: "BES-88120", telefone: "(83) 99901-1007" },
  { nome: "Thiago Barbosa", nasc: "2001-12-18", sexo: "M", convenio: "Particular", telefone: "(83) 99901-1008" },
  { nome: "Helena Vitória Ramos", nasc: "2021-08-01", sexo: "F", convenio: "Bem Estar Saúde", carteirinha: "BES-90311", telefone: "(83) 99901-1009", observacoes: "Responsável: Marcos Ramos (pai)" },
  { nome: "José Antônio Pereira", nasc: "1948-06-25", sexo: "M", convenio: "Bem Estar Saúde", carteirinha: "BES-11002", alergias: "Ácido acetilsalicílico", telefone: "(83) 99901-1010" },
];

const QUEIXAS = [
  ["Dor de cabeça há 3 dias", "Cefaleia tensional", "Analgésico, hidratação e orientação postural", [{ medicamento: "Paracetamol 750 mg", posologia: "1 comprimido de 8/8 h se dor, por até 3 dias" }]],
  ["Tosse e coriza", "Resfriado comum", "Repouso, hidratação e lavagem nasal", [{ medicamento: "Soro fisiológico 0,9%", posologia: "Lavagem nasal 3 vezes ao dia" }]],
  ["Check-up anual", "Paciente hígido", "Exames laboratoriais de rotina", []],
  ["Palpitações ocasionais", "Extrassístoles benignas", "Reduzir cafeína; retorno com Holter", []],
  ["Pressão alta na farmácia", "Hipertensão arterial estágio 1", "Dieta hipossódica, atividade física e medicação", [{ medicamento: "Losartana 50 mg", posologia: "1 comprimido pela manhã, uso contínuo" }]],
  ["Febre e dor de garganta", "Faringite viral", "Sintomáticos e hidratação", [{ medicamento: "Ibuprofeno 400 mg", posologia: "1 comprimido de 8/8 h por 3 dias, após as refeições" }]],
];

// ---------- carga ----------
async function popular({ somenteSeVazio = false } = {}) {
  if (somenteSeVazio && (await Usuario.estimatedDocumentCount()) > 0) return false;
  await Promise.all([Usuario, Paciente, Consulta, Notificacao, MensagemChat].map(m => m.deleteMany({})));
  semente = 20262;

  const hash = s => bcrypt.hash(s, 10);
  const admin = await Usuario.create({ nome: "Administrador do Sistema", email: "admin@medagenda.dev", senhaHash: await hash("Admin@2026"), perfil: "ADMIN", telefone: "(83) 3333-0000" });
  const senhaMedico = await hash("Medico@2026");
  const medicos = [];
  for (const m of MEDICOS) medicos.push(await Usuario.create({ ...m, senhaHash: senhaMedico, perfil: "MEDICO" }));
  const [helena, ricardo, marina] = medicos;
  const senhaSec = await hash("Secretaria@2026");
  const joana = await Usuario.create({ nome: "Joana Lima", email: "joana.lima@medagenda.dev", senhaHash: senhaSec, perfil: "SECRETARIA", telefone: "(83) 98822-3001" });
  await Usuario.create({ nome: "Pedro Santos", email: "pedro.santos@medagenda.dev", senhaHash: senhaSec, perfil: "SECRETARIA", telefone: "(83) 98822-3002", ativo: false });

  const senhaPac = await hash("Paciente@2026");
  const pacientes = [];
  for (const [i, p] of PACIENTES.entries()) {
    const ficha = await Paciente.create({
      nome: p.nome, cpf: gerarCpf(123456700 + i * 1117), dataNascimento: new Date(`${p.nasc}T12:00:00`), sexo: p.sexo,
      telefone: p.telefone, email: p.email || "", convenio: p.convenio, carteirinha: p.carteirinha || "",
      alergias: p.alergias || "", observacoes: p.observacoes || "",
    });
    pacientes.push(ficha);
    if (p.conta) await Usuario.create({ nome: p.nome, email: p.email, senhaHash: senhaPac, perfil: "PACIENTE", telefone: p.telefone, paciente: ficha._id });
  }
  const [ana, carlos, fernanda, luiza, miguel, roberto, patricia, thiago, helenaV, jose] = pacientes;
  const adultos = [ana, carlos, fernanda, luiza, roberto, patricia, thiago, jose];
  const criancas = [miguel, helenaV];

  const ocupados = new Set();
  const consultas = [];
  const hoje = hojeZero();
  const agora = Date.now();

  const nova = (medico, paciente, inicio, extra = {}) => {
    const chave = `${medico._id}|${inicio.getTime()}`;
    if (ocupados.has(chave)) return null;
    ocupados.add(chave);
    const c = {
      paciente: paciente._id, medico: medico._id, inicio, fim: new Date(inicio.getTime() + medico.duracaoConsulta * MIN),
      tipo: "PRIMEIRA", status: "AGENDADA", valor: medico.valorConsulta, convenio: paciente.convenio,
      criadaPor: joana._id, motivo: "", ...extra,
    };
    if (c.tipo === "RETORNO") c.valor = 0;
    consultas.push(c);
    return c;
  };
  const realizada = (c, q, atestado = 0) => {
    if (!c) return;
    const [queixa, diagnostico, conduta, prescricao] = q;
    c.status = "REALIZADA";
    c.lembreteEnviado = true;
    c.prontuario = {
      queixa, anamnese: "Paciente relata o quadro descrito, sem outras queixas. Nega comorbidades não registradas.",
      diagnostico, conduta, prescricao, atestadoDias: atestado, registradoPor: c.medico, registradoEm: new Date(c.fim),
    };
  };
  // dia útil do médico a partir de um deslocamento em dias (para trás se negativo)
  const diaDoMedico = (medico, deslocamento) => {
    const passo = deslocamento < 0 ? -1 : 1;
    let d = new Date(hoje.getTime() + deslocamento * DIA);
    while (!medico.agenda.some(b => b.diaSemana === d.getDay())) d = new Date(d.getTime() + passo * DIA);
    return d;
  };
  const slot = (medico, deslocamento, indice) => {
    const s = slotsDoDia(medico, diaDoMedico(medico, deslocamento));
    return s[Math.min(indice, s.length - 1)];
  };

  // Histórico dos últimos 60 dias
  for (let desloc = -60; desloc <= -1; desloc++) {
    const dia = new Date(hoje.getTime() + desloc * DIA);
    for (const medico of medicos) {
      const slots = slotsDoDia(medico, dia);
      if (!slots.length) continue;
      const qtd = 1 + Math.floor(aleatorio() * 3);
      for (let k = 0; k < qtd; k++) {
        const inicio = escolher(slots);
        const paciente = medico === marina ? escolher(criancas) : escolher(adultos);
        const c = nova(medico, paciente, inicio, { lembreteEnviado: true });
        if (!c) continue;
        const r = aleatorio();
        if (r < 0.70) realizada(c, escolher(QUEIXAS), aleatorio() < 0.2 ? 1 + Math.floor(aleatorio() * 3) : 0);
        else if (r < 0.85) c.status = "FALTOU";
        else { c.status = "CANCELADA"; c.canceladaPor = joana._id; c.motivoCancelamento = "Solicitado pelo paciente por telefone"; }
      }
    }
  }

  // Casos de referência
  realizada(nova(helena, ana, slot(helena, -10, 2), { motivo: "Dor de cabeça frequente" }), QUEIXAS[0], 2);
  realizada(nova(marina, miguel, slot(marina, -5, 3), { motivo: "Febre há 2 dias" }), QUEIXAS[5], 3);
  const cancelCarlos = nova(ricardo, carlos, slot(ricardo, -15, 1), { motivo: "Avaliação cardiológica" });
  if (cancelCarlos) Object.assign(cancelCarlos, { status: "CANCELADA", canceladaPor: joana._id, motivoCancelamento: "Paciente viajou", lembreteEnviado: true });
  const faltaFernanda = nova(helena, fernanda, slot(helena, -20, 5));
  if (faltaFernanda) Object.assign(faltaFernanda, { status: "FALTOU", lembreteEnviado: true });
  realizada(nova(ricardo, roberto, slot(ricardo, -25, 0), { motivo: "Controle de pressão" }), QUEIXAS[4]);

  // Hoje: agenda da Dra. Helena (se for dia de atendimento)
  const slotsHoje = slotsDoDia(helena, hoje);
  const pacientesHoje = [patricia, thiago, luiza, jose, carlos, roberto];
  slotsHoje.filter((_, i) => i % 3 === 0).slice(0, 6).forEach((inicio, i) => {
    const c = nova(helena, pacientesHoje[i], inicio, { motivo: "Consulta de rotina" });
    if (!c) return;
    if (inicio.getTime() + 30 * MIN < agora) realizada(c, QUEIXAS[i % QUEIXAS.length]);
    else if (inicio.getTime() < agora) c.status = "EM_ATENDIMENTO";
    else c.status = "CONFIRMADA";
  });

  // Próximos dias
  nova(helena, ana, slot(helena, 3, 4), { motivo: "Resultado de exames", status: "AGENDADA" });
  nova(ricardo, ana, slot(ricardo, 5, 2), { motivo: "Avaliação cardiológica", status: "CONFIRMADA" });
  nova(helena, ana, slot(helena, 12, 9), { motivo: "Acompanhamento", status: "AGENDADA" });
  nova(ricardo, roberto, slot(ricardo, 2, 3), { tipo: "PRIMEIRA", status: "CONFIRMADA", motivo: "Dor no peito aos esforços" });
  nova(marina, helenaV, slot(marina, 1, 2), { status: "AGENDADA", motivo: "Puericultura" });
  nova(marina, miguel, slot(marina, 8, 0), { status: "AGENDADA", motivo: "Retorno de febre" });
  nova(helena, luiza, slot(helena, 4, 10), { status: "AGENDADA" });
  nova(helena, fernanda, slot(helena, 6, 1), { status: "AGENDADA", motivo: "Dor lombar" });
  nova(ricardo, jose, slot(ricardo, 9, 5), { status: "AGENDADA", motivo: "Check-up cardiológico" });

  // Próximas 24 horas: consultas que devem receber lembrete (uma delas cancelada)
  const proximos = [];
  for (let d = 0; d <= 1 && proximos.length < 3; d++) {
    for (const s of slotsDoDia(helena, new Date(hoje.getTime() + d * DIA))) {
      if (s.getTime() > agora + 3 * 60 * MIN && s.getTime() < agora + 23 * 60 * MIN && !ocupados.has(`${helena._id}|${s.getTime()}`)) proximos.push(s);
      if (proximos.length >= 3) break;
    }
  }
  if (proximos[0]) nova(helena, carlos, proximos[0], { status: "CONFIRMADA", motivo: "Renovação de receita" });
  if (proximos[1]) {
    const c = nova(helena, fernanda, proximos[1], { motivo: "Exame admissional" });
    if (c) Object.assign(c, { status: "CANCELADA", canceladaPor: joana._id, motivoCancelamento: "Paciente remarcou" });
  }

  await Consulta.insertMany(consultas);

  // Notificações e conversa de exemplo
  const contaAna = await Usuario.findOne({ paciente: ana._id });
  const notas = [];
  for (let i = 0; i < 14; i++) {
    notas.push({
      usuario: contaAna._id, tipo: i % 2 ? "LEMBRETE" : "CONSULTA", lida: false,
      titulo: i % 2 ? "Lembrete de consulta" : "Consulta agendada",
      mensagem: i % 2 ? "Você tem uma consulta nas próximas 24 horas." : "Sua consulta foi registrada pela recepção.",
      createdAt: new Date(agora - (i + 1) * 3 * 60 * 60 * 1000),
    });
  }
  notas.push({ usuario: helena._id, tipo: "CONSULTA", titulo: "Agenda de hoje", mensagem: "Confira os pacientes do dia.", lida: false });
  notas.push({ usuario: joana._id, tipo: "INFO", titulo: "Bem-vinda ao MedAgenda", mensagem: "Confirme as consultas das próximas 48 horas.", lida: false });
  notas.push({ usuario: admin._id, tipo: "INFO", titulo: "Sistema pronto", mensagem: "Dados de demonstração carregados.", lida: true });
  await Notificacao.insertMany(notas);
  await MensagemChat.insertMany([
    { usuario: contaAna._id, autor: "USUARIO", texto: "Oi", createdAt: new Date(agora - 2 * DIA) },
    { usuario: contaAna._id, autor: "ASSISTENTE", texto: "Olá, Ana! Sou o assistente virtual da Clínica MedAgenda. Posso ajudar com consultas, horários, médicos e documentos.", createdAt: new Date(agora - 2 * DIA + 2000) },
  ]);

  console.log(`Seed: ${medicos.length} médicos, ${pacientes.length} pacientes, ${consultas.length} consultas`);
  return true;
}

module.exports = { popular, gerarCpf };

if (require.main === module) {
  mongoose.connect(MONGO_URL)
    .then(() => popular())
    .then(() => mongoose.disconnect())
    .catch(e => { console.error(e); process.exit(1); });
}

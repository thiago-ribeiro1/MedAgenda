const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const ref = name => ({ type: Schema.Types.ObjectId, ref: name });

const PERFIS = ["ADMIN", "MEDICO", "SECRETARIA", "PACIENTE"];
const STATUS = ["AGENDADA", "CONFIRMADA", "EM_ATENDIMENTO", "REALIZADA", "CANCELADA", "FALTOU"];

const usuarioSchema = new Schema({
  nome: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senhaHash: { type: String, required: true },
  perfil: { type: String, enum: PERFIS, required: true },
  telefone: { type: String, default: "" },
  ativo: { type: Boolean, default: true },
  // dados de médico
  crm: { type: String, default: "" },
  especialidade: { type: String, default: "" },
  valorConsulta: { type: Number, default: 0 },
  duracaoConsulta: { type: Number, default: 30 },
  agenda: [{ _id: false, diaSemana: Number, inicio: String, fim: String }],
  // vínculo de paciente
  paciente: ref("Paciente"),
}, { timestamps: true });

usuarioSchema.methods.publico = function () {
  const o = this.toObject();
  delete o.senhaHash;
  delete o.__v;
  return o;
};

const pacienteSchema = new Schema({
  nome: { type: String, required: true, trim: true },
  cpf: { type: String, required: true },
  dataNascimento: { type: Date, required: true },
  sexo: { type: String, enum: ["F", "M", "OUTRO"], default: "OUTRO" },
  telefone: { type: String, default: "" },
  email: { type: String, default: "" },
  convenio: { type: String, default: "Particular" },
  carteirinha: { type: String, default: "" },
  alergias: { type: String, default: "" },
  observacoes: { type: String, default: "" },
}, { timestamps: true });

const prontuarioSchema = new Schema({
  _id: false,
  queixa: String,
  anamnese: String,
  diagnostico: String,
  conduta: String,
  prescricao: [{ _id: false, medicamento: String, posologia: String }],
  atestadoDias: { type: Number, default: 0 },
  registradoPor: ref("Usuario"),
  registradoEm: Date,
});

const consultaSchema = new Schema({
  paciente: { ...ref("Paciente"), required: true },
  medico: { ...ref("Usuario"), required: true },
  inicio: { type: Date, required: true },
  fim: { type: Date, required: true },
  tipo: { type: String, enum: ["PRIMEIRA", "RETORNO"], default: "PRIMEIRA" },
  status: { type: String, enum: STATUS, default: "AGENDADA" },
  motivo: { type: String, default: "" },
  valor: { type: Number, default: 0 },
  convenio: { type: String, default: "Particular" },
  criadaPor: ref("Usuario"),
  canceladaPor: ref("Usuario"),
  motivoCancelamento: { type: String, default: "" },
  prontuario: { type: prontuarioSchema, default: null },
  lembreteEnviado: { type: Boolean, default: false },
}, { timestamps: true });

const notificacaoSchema = new Schema({
  usuario: { ...ref("Usuario"), required: true },
  tipo: { type: String, default: "INFO" },
  titulo: String,
  mensagem: String,
  lida: { type: Boolean, default: false },
  consulta: ref("Consulta"),
}, { timestamps: true });

const mensagemChatSchema = new Schema({
  usuario: { ...ref("Usuario"), required: true },
  autor: { type: String, enum: ["USUARIO", "ASSISTENTE"] },
  texto: String,
}, { timestamps: true });

module.exports = {
  PERFIS,
  STATUS,
  Usuario: model("Usuario", usuarioSchema),
  Paciente: model("Paciente", pacienteSchema),
  Consulta: model("Consulta", consultaSchema),
  Notificacao: model("Notificacao", notificacaoSchema),
  MensagemChat: model("MensagemChat", mensagemChatSchema),
};

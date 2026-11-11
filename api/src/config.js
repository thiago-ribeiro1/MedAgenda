module.exports = {
  PORT: Number(process.env.PORT || 3000),
  MONGO_URL: process.env.MONGO_URL || "mongodb://localhost:27017/medagenda",
  JWT_SECRET: process.env.JWT_SECRET || "medagenda-segredo-dev",
  JWT_EXPIRA_EM: process.env.JWT_EXPIRA_EM || "8h",
  SEED_AO_INICIAR: (process.env.SEED_AO_INICIAR || "true") === "true",
  NOME_CLINICA: process.env.NOME_CLINICA || "Clínica MedAgenda",
  // Assistente virtual: se uma chave for informada, usa o modelo de IA; senão, usa o assistente local
  IA_API_KEY: process.env.IA_API_KEY || "",
  IA_MODELO: process.env.IA_MODELO || "claude-haiku-5-5",
};

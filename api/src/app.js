const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

app.get("/api/saude", (req, res) => res.json({ status: "ok", servico: "medagenda-api" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/perfil", require("./routes/perfil"));
app.use("/api/usuarios", require("./routes/usuarios"));
app.use("/api/pacientes", require("./routes/pacientes"));
app.use("/api/medicos", require("./routes/medicos"));
app.use("/api/consultas", require("./routes/consultas"));
app.use("/api/notificacoes", require("./routes/notificacoes"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/relatorios", require("./routes/relatorios"));
app.use("/api/dashboard", require("./routes/dashboard"));

app.use("/api", (req, res) => res.status(404).json({ erro: "Rota não encontrada" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ erro: "JSON inválido" });
  if (err.name === "ValidationError" || err.name === "CastError") return res.status(400).json({ erro: "Dados inválidos" });
  console.error(err);
  res.status(500).json({ erro: "Erro interno. Tente novamente mais tarde." });
});

module.exports = app;

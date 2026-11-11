const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || "").split(" ");
  if (tipo !== "Bearer" || !token) return res.status(401).json({ erro: "Faça login para continuar" });
  try {
    const d = jwt.verify(token, JWT_SECRET);
    req.usuario = { id: d.sub, perfil: d.perfil, nome: d.nome, paciente: d.paciente || null };
    next();
  } catch {
    res.status(401).json({ erro: "Sessão expirada. Faça login novamente" });
  }
}

const permitir = (...perfis) => (req, res, next) =>
  perfis.includes(req.usuario?.perfil) ? next() : res.status(403).json({ erro: "Você não tem permissão para esta ação" });

module.exports = { autenticar, permitir };

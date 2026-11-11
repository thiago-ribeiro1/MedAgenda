const somenteDigitos = v => String(v || "").replace(/\D/g, "");

function emailValido(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function senhaForte(senha) {
  return typeof senha === "string" && senha.length >= 8 && /[A-Z]/.test(senha) && /[a-z]/.test(senha) && /\d/.test(senha);
}

function cpfValido(cpf) {
  return somenteDigitos(cpf).length === 11;
}

function crmValido(crm) {
  return /^CRM\/[A-Z]{2} \d{4,6}$/.test(String(crm || "").trim());
}

function horaValida(h) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(h || "");
}

function texto(valor, min, max) {
  return typeof valor === "string" && valor.trim().length >= min && valor.trim().length <= max;
}

function formatarCpf(cpf) {
  const d = somenteDigitos(cpf);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

function validarPaciente(dados, parcial = false) {
  const erros = [];
  if (!parcial || dados.nome !== undefined) if (!texto(dados.nome, 3, 120)) erros.push("nome: de 3 a 120 caracteres");
  if (!parcial || dados.cpf !== undefined) if (!cpfValido(dados.cpf)) erros.push("cpf: CPF inválido");
  if (!parcial || dados.dataNascimento !== undefined) {
    const d = new Date(dados.dataNascimento);
    if (isNaN(d)) erros.push("dataNascimento: data inválida");
  }
  if (dados.telefone && !/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(dados.telefone)) erros.push("telefone: formato (83) 99999-9999");
  if (dados.email && !emailValido(dados.email)) erros.push("email: formato inválido");
  if (dados.sexo && !["F", "M", "OUTRO"].includes(dados.sexo)) erros.push("sexo: F, M ou OUTRO");
  return erros;
}

function validarAgenda(agenda) {
  if (!Array.isArray(agenda) || agenda.length === 0) return ["agenda: informe ao menos um período de atendimento"];
  const erros = [];
  agenda.forEach((b, i) => {
    if (!Number.isInteger(b.diaSemana) || b.diaSemana < 0 || b.diaSemana > 6) erros.push(`agenda[${i}].diaSemana: 0 (domingo) a 6 (sábado)`);
    if (!horaValida(b.inicio) || !horaValida(b.fim) || b.inicio >= b.fim) erros.push(`agenda[${i}]: horário inválido`);
  });
  return erros;
}

module.exports = { somenteDigitos, emailValido, senhaForte, cpfValido, crmValido, horaValida, texto, formatarCpf, validarPaciente, validarAgenda };

const TZ = "America/Sao_Paulo";

export const dataHora = d => new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: TZ });
export const data = d => new Date(d).toLocaleDateString("pt-BR", { timeZone: TZ });
export const hora = d => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
export const dataLonga = d => new Date(d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
export const real = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const pct = v => `${(Number(v || 0) * 100).toFixed(1).replace(".", ",")}%`;

// usado na listagem de consultas
export const dataHoraCurta = d => {
  const iso = new Date(d).toISOString();
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}`;
};

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const idade = nasc => {
  const n = new Date(nasc), h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
  return i;
};

export const STATUS = {
  AGENDADA: { rotulo: "Agendada", cor: "azul" },
  CONFIRMADA: { rotulo: "Confirmada", cor: "verde" },
  EM_ATENDIMENTO: { rotulo: "Em atendimento", cor: "roxo" },
  REALIZADA: { rotulo: "Realizada", cor: "cinza" },
  CANCELADA: { rotulo: "Cancelada", cor: "vermelho" },
  FALTOU: { rotulo: "Faltou", cor: "laranja" },
};

export const PERFIS = { ADMIN: "Administrador", MEDICO: "Médico(a)", SECRETARIA: "Secretária(o)", PACIENTE: "Paciente" };
export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

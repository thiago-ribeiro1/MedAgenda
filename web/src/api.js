const BASE = "/api";

export const sessao = {
  get token() { return localStorage.getItem("medagenda.token"); },
  get usuario() { try { return JSON.parse(localStorage.getItem("medagenda.usuario")); } catch { return null; } },
  salvar(token, usuario) {
    localStorage.setItem("medagenda.token", token);
    localStorage.setItem("medagenda.usuario", JSON.stringify(usuario));
  },
  limpar() {
    localStorage.removeItem("medagenda.token");
    localStorage.removeItem("medagenda.usuario");
  },
};

export class ErroApi extends Error {
  constructor(status, dados) {
    super(dados?.erro || `Erro ${status}`);
    this.status = status;
    this.detalhes = dados?.detalhes || [];
  }
}

export async function api(caminho, { metodo = "GET", corpo } = {}) {
  const resp = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(sessao.token ? { Authorization: `Bearer ${sessao.token}` } : {}),
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  if (resp.status === 401 && caminho !== "/auth/login") {
    sessao.limpar();
    window.location.href = "/login";
  }
  if (resp.status === 204) return null;
  const dados = await resp.json().catch(() => null);
  if (!resp.ok) throw new ErroApi(resp.status, dados);
  return dados;
}

export async function baixarPdf(caminho, nomeArquivo) {
  const resp = await fetch(BASE + caminho, { headers: { Authorization: `Bearer ${sessao.token}` } });
  if (!resp.ok) {
    const dados = await resp.json().catch(() => null);
    throw new ErroApi(resp.status, dados);
  }
  const url = URL.createObjectURL(await resp.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

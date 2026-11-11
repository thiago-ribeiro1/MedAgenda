import { createContext, useContext, useState } from "react";
import { api, sessao } from "./api";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(sessao.usuario);

  async function entrar(email, senha) {
    const r = await api("/auth/login", { metodo: "POST", corpo: { email, senha } });
    sessao.salvar(r.token, r.usuario);
    setUsuario(r.usuario);
    return r.usuario;
  }
  function sair() {
    sessao.limpar();
    setUsuario(null);
  }
  function atualizar(u) {
    sessao.salvar(sessao.token, u);
    setUsuario(u);
  }
  return <Ctx.Provider value={{ usuario, entrar, sair, atualizar }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

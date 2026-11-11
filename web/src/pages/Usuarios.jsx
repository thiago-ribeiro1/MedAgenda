import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Aviso, Campo, Carregando, Cartao, Vazio, useCarga } from "../componentes";
import { PERFIS } from "../formato";

export default function Usuarios() {
  const { usuario } = useAuth();
  const [perfil, setPerfil] = useState("");
  const { dados, erro, carregando, recarregar } = useCarga(() => api(`/usuarios${perfil ? `?perfil=${perfil}` : ""}`), [perfil]);
  const [msg, setMsg] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [senhaDe, setSenhaDe] = useState(null);
  const [novaSenha, setNovaSenha] = useState("");

  async function alternar(u) {
    setMsg(null); setErroAcao(null);
    try {
      await api(`/usuarios/${u._id}/ativo`, { metodo: "PATCH", corpo: { ativo: !u.ativo } });
      setMsg(`Conta de ${u.nome} ${u.ativo ? "desativada" : "reativada"}.`);
      recarregar();
    } catch (e) { setErroAcao(e); }
  }
  async function redefinir(e) {
    e.preventDefault();
    setMsg(null); setErroAcao(null);
    try {
      await api(`/usuarios/${senhaDe._id}/senha`, { metodo: "POST", corpo: { novaSenha } });
      setMsg(`Senha de ${senhaDe.nome} redefinida.`);
      setSenhaDe(null); setNovaSenha("");
    } catch (er) { setErroAcao(er); }
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <div><h1>Usuários</h1><p className="sub">Contas de acesso da equipe e dos pacientes</p></div>
        <Link className="botao" to="/usuarios/novo">+ Nova conta</Link>
      </div>
      <Aviso erro={erroAcao || erro} sucesso={msg} />
      {senhaDe && (
        <Cartao titulo={`Redefinir senha de ${senhaDe.nome}`}>
          <form onSubmit={redefinir} className="filtros">
            <Campo rotulo="Nova senha" id="nova-senha" dica="Mínimo de 8 caracteres, com maiúscula, minúscula e número">
              <input id="nova-senha" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
            </Campo>
            <button className="botao">Salvar</button>
            <button type="button" className="botao botao-texto" onClick={() => setSenhaDe(null)}>Cancelar</button>
          </form>
        </Cartao>
      )}
      <Cartao>
        <div className="filtros" style={{ marginBottom: 14 }}>
          <Campo rotulo="Perfil" id="f-perfil">
            <select id="f-perfil" value={perfil} onChange={e => setPerfil(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(PERFIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Campo>
        </div>
        {carregando && !dados ? <Carregando /> : !dados?.length ? <Vazio>Nenhum usuário.</Vazio> : (
          <div className="tabela-rolagem">
            <table>
              <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Detalhe</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                {dados.map(u => (
                  <tr key={u._id}>
                    <td><strong>{u.nome}</strong></td>
                    <td>{u.email}</td>
                    <td>{PERFIS[u.perfil]}</td>
                    <td className="suave">{u.perfil === "MEDICO" ? `${u.especialidade} · ${u.crm}` : u.perfil === "PACIENTE" ? `Ficha: ${u.paciente?.cpf || "—"}` : u.telefone}</td>
                    <td>{u.ativo ? <span className="selo selo-verde">Ativa</span> : <span className="selo selo-vermelho">Inativa</span>}</td>
                    <td className="num">
                      <div className="acoes" style={{ justifyContent: "flex-end" }}>
                        <Link className="botao botao-peq botao-sec" to={`/usuarios/${u._id}`}>Editar</Link>
                        <button className="botao botao-peq botao-sec" onClick={() => setSenhaDe(u)}>Senha</button>
                        {u._id !== usuario._id && (
                          <button className={`botao botao-peq ${u.ativo ? "botao-perigo" : ""}`} onClick={() => alternar(u)}>{u.ativo ? "Desativar" : "Reativar"}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Aviso, Campo, Carregando, Cartao, useCarga } from "../componentes";
import { DIAS, PERFIS } from "../formato";

const BASE = { nome: "", email: "", senha: "", telefone: "", perfil: "SECRETARIA", crm: "", especialidade: "", valorConsulta: "", duracaoConsulta: 30, agenda: [], pacienteId: "" };

function EditorAgenda({ agenda, mudar }) {
  const alterar = (i, campo, valor) => mudar(agenda.map((b, j) => (j === i ? { ...b, [campo]: campo === "diaSemana" ? Number(valor) : valor } : b)));
  return (
    <>
      {agenda.map((b, i) => (
        <div className="prescricao-item" key={i} style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
          <select aria-label={`Dia do bloco ${i + 1}`} value={b.diaSemana} onChange={e => alterar(i, "diaSemana", e.target.value)}>
            {DIAS.map((d, n) => <option key={n} value={n}>{d}</option>)}
          </select>
          <input aria-label={`Início do bloco ${i + 1}`} type="time" value={b.inicio} onChange={e => alterar(i, "inicio", e.target.value)} />
          <input aria-label={`Fim do bloco ${i + 1}`} type="time" value={b.fim} onChange={e => alterar(i, "fim", e.target.value)} />
          <button type="button" className="botao botao-texto" onClick={() => mudar(agenda.filter((_, j) => j !== i))}>Remover</button>
        </div>
      ))}
      <button type="button" className="botao botao-sec botao-peq" onClick={() => mudar([...agenda, { diaSemana: 1, inicio: "08:00", fim: "12:00" }])}>+ Bloco de atendimento</button>
    </>
  );
}

export default function UsuarioForm() {
  const { id } = useParams();
  const [qs] = useSearchParams();
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [u, setU] = useState(id ? null : { ...BASE, perfil: qs.get("perfil") || (usuario.perfil === "ADMIN" ? "SECRETARIA" : "PACIENTE"), pacienteId: qs.get("paciente") || "" });
  const [erro, setErro] = useState(null);
  const [msg, setMsg] = useState(null);
  const fichas = useCarga(() => api("/pacientes"));

  useEffect(() => {
    if (!id) return;
    api("/usuarios").then(lista => {
      const achado = lista.find(x => x._id === id);
      if (!achado) throw new Error("Usuário não encontrado");
      setU({ ...BASE, ...achado });
    }).catch(setErro);
  }, [id]);

  if (!u) return erro ? <Aviso erro={erro} /> : <Carregando />;
  const mudar = campo => e => setU({ ...u, [campo]: e.target.value });
  const perfisPermitidos = usuario.perfil === "ADMIN" ? ["MEDICO", "SECRETARIA", "PACIENTE"] : ["PACIENTE"];

  async function salvar(e) {
    e.preventDefault();
    setErro(null); setMsg(null);
    const corpo = { nome: u.nome, email: u.email, telefone: u.telefone };
    if (u.perfil === "MEDICO") Object.assign(corpo, { crm: u.crm, especialidade: u.especialidade, valorConsulta: Number(u.valorConsulta), duracaoConsulta: Number(u.duracaoConsulta), agenda: u.agenda });
    try {
      if (id) {
        await api(`/usuarios/${id}`, { metodo: "PUT", corpo });
        setMsg("Conta atualizada.");
      } else {
        await api("/usuarios", { metodo: "POST", corpo: { ...corpo, senha: u.senha, perfil: u.perfil, pacienteId: u.perfil === "PACIENTE" ? u.pacienteId : undefined } });
        navegar(usuario.perfil === "ADMIN" ? "/usuarios" : "/pacientes", { replace: true });
      }
    } catch (er) { setErro(er); }
  }

  return (
    <>
      <Link to={usuario.perfil === "ADMIN" ? "/usuarios" : "/pacientes"} className="suave">← Voltar</Link>
      <h1 style={{ marginTop: 6 }}>{id ? `Editar ${u.nome}` : "Nova conta de acesso"}</h1>
      <p className="sub">{id ? PERFIS[u.perfil] : "Defina o perfil e os dados de acesso"}</p>
      <Aviso erro={erro} sucesso={msg} />
      <form onSubmit={salvar}>
        <Cartao titulo="Acesso">
          {!id && (
            <Campo rotulo="Perfil" id="perfil">
              <select id="perfil" value={u.perfil} onChange={mudar("perfil")}>
                {perfisPermitidos.map(p => <option key={p} value={p}>{PERFIS[p]}</option>)}
              </select>
            </Campo>
          )}
          {!id && u.perfil === "PACIENTE" && (
            <Campo rotulo="Ficha do paciente" id="ficha" dica="Apenas fichas que ainda não têm conta">
              <select id="ficha" value={u.pacienteId} onChange={e => {
                const f = (fichas.dados || []).find(x => x._id === e.target.value);
                setU({ ...u, pacienteId: e.target.value, nome: f ? f.nome : u.nome, email: f?.email || u.email, telefone: f?.telefone || u.telefone });
              }}>
                <option value="">Selecione…</option>
                {(fichas.dados || []).filter(f => !f.temConta || f._id === u.pacienteId).map(f => <option key={f._id} value={f._id}>{f.nome} · {f.cpf}</option>)}
              </select>
            </Campo>
          )}
          <div className="linha-form">
            <Campo rotulo="Nome" id="u-nome"><input id="u-nome" value={u.nome} onChange={mudar("nome")} required /></Campo>
            <Campo rotulo="E-mail (login)" id="u-email"><input id="u-email" type="email" value={u.email} onChange={mudar("email")} required /></Campo>
          </div>
          <div className="linha-form">
            <Campo rotulo="Telefone" id="u-tel"><input id="u-tel" value={u.telefone} onChange={mudar("telefone")} /></Campo>
            {!id && (
              <Campo rotulo="Senha inicial" id="u-senha" dica="Mínimo de 8 caracteres, com maiúscula, minúscula e número">
                <input id="u-senha" type="password" value={u.senha} onChange={mudar("senha")} required />
              </Campo>
            )}
          </div>
        </Cartao>
        {u.perfil === "MEDICO" && (
          <Cartao titulo="Dados profissionais e agenda">
            <div className="linha-form">
              <Campo rotulo="CRM" id="crm" dica="Formato CRM/PB 12345"><input id="crm" value={u.crm} onChange={mudar("crm")} /></Campo>
              <Campo rotulo="Especialidade" id="esp"><input id="esp" value={u.especialidade} onChange={mudar("especialidade")} /></Campo>
            </div>
            <div className="linha-form">
              <Campo rotulo="Valor da consulta (R$)" id="valor"><input id="valor" type="number" step="0.01" value={u.valorConsulta} onChange={mudar("valorConsulta")} /></Campo>
              <Campo rotulo="Duração da consulta" id="dur">
                <select id="dur" value={u.duracaoConsulta} onChange={mudar("duracaoConsulta")}>{[15, 20, 30, 40, 60].map(d => <option key={d} value={d}>{d} minutos</option>)}</select>
              </Campo>
            </div>
            <h3>Blocos de atendimento</h3>
            <EditorAgenda agenda={u.agenda} mudar={agenda => setU({ ...u, agenda })} />
          </Cartao>
        )}
        <button className="botao">{id ? "Salvar alterações" : "Criar conta"}</button>
      </form>
    </>
  );
}

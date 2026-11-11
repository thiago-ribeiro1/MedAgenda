import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Aviso, Campo, Carregando, Cartao, useCarga } from "../componentes";
import { DIAS, PERFIS, data, real } from "../formato";

export default function Perfil() {
  const { atualizar } = useAuth();
  const { dados: u, erro, setDados } = useCarga(() => api("/perfil"));
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [erroForm, setErroForm] = useState(null);
  const [senha, setSenha] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [msgSenha, setMsgSenha] = useState(null);
  const [erroSenha, setErroSenha] = useState(null);

  if (erro) return <Aviso erro={erro} />;
  if (!u) return <Carregando />;
  const f = form || { nome: u.nome, telefone: u.telefone, valorConsulta: u.valorConsulta };

  async function salvar(e) {
    e.preventDefault();
    setMsg(null); setErroForm(null);
    try {
      const corpo = { nome: f.nome, telefone: f.telefone };
      if (u.perfil === "MEDICO") corpo.valorConsulta = Number(f.valorConsulta);
      const novo = await api("/perfil", { metodo: "PUT", corpo });
      setDados({ ...u, ...novo });
      atualizar({ ...novo, paciente: novo.paciente?._id || novo.paciente });
      setForm(null);
      setMsg("Dados atualizados.");
    } catch (er) { setErroForm(er); }
  }

  async function trocarSenha(e) {
    e.preventDefault();
    setMsgSenha(null); setErroSenha(null);
    if (senha.novaSenha !== senha.confirmar) return setErroSenha(new Error("A confirmação não confere com a nova senha"));
    try {
      await api("/perfil/senha", { metodo: "PUT", corpo: { senhaAtual: senha.senhaAtual, novaSenha: senha.novaSenha } });
      setSenha({ senhaAtual: "", novaSenha: "", confirmar: "" });
      setMsgSenha("Senha alterada com sucesso.");
    } catch (er) { setErroSenha(er); }
  }

  const iniciais = u.nome.replace(/^(Dra?\.)\s*/, "").split(" ").slice(0, 2).map(p => p[0]).join("");

  return (
    <>
      <div className="cabecalho-pagina" style={{ alignItems: "center" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span className="avatar" style={{ width: 64, height: 64, fontSize: "1.4rem" }}>{iniciais}</span>
          <div>
            <h1>{u.nome}</h1>
            <p className="sub" style={{ margin: 0 }}>{PERFIS[u.perfil]} · {u.email}</p>
          </div>
        </div>
      </div>

      <div className="grade grade-2" style={{ alignItems: "start" }}>
        <Cartao titulo="Meus dados">
          <Aviso erro={erroForm} sucesso={msg} />
          <form onSubmit={salvar}>
            <Campo rotulo="Nome" id="p-nome"><input id="p-nome" value={f.nome} onChange={e => setForm({ ...f, nome: e.target.value })} /></Campo>
            <Campo rotulo="E-mail" id="p-email" dica="Para alterar o e-mail, fale com o administrador"><input id="p-email" value={u.email} disabled /></Campo>
            <Campo rotulo="Telefone" id="p-tel"><input id="p-tel" value={f.telefone} onChange={e => setForm({ ...f, telefone: e.target.value })} placeholder="(83) 99999-9999" /></Campo>
            {u.perfil === "MEDICO" && (
              <Campo rotulo="Valor da consulta (R$)" id="p-valor">
                <input id="p-valor" type="number" step="0.01" value={f.valorConsulta} onChange={e => setForm({ ...f, valorConsulta: e.target.value })} />
              </Campo>
            )}
            <button className="botao">Salvar</button>
          </form>
        </Cartao>

        <Cartao titulo="Alterar senha">
          <Aviso erro={erroSenha} sucesso={msgSenha} />
          <form onSubmit={trocarSenha}>
            <Campo rotulo="Senha atual" id="s-atual"><input id="s-atual" type="password" value={senha.senhaAtual} onChange={e => setSenha({ ...senha, senhaAtual: e.target.value })} /></Campo>
            <Campo rotulo="Nova senha" id="s-nova" dica="Mínimo de 8 caracteres, com maiúscula, minúscula e número"><input id="s-nova" type="password" value={senha.novaSenha} onChange={e => setSenha({ ...senha, novaSenha: e.target.value })} /></Campo>
            <Campo rotulo="Confirmar nova senha" id="s-conf"><input id="s-conf" type="password" value={senha.confirmar} onChange={e => setSenha({ ...senha, confirmar: e.target.value })} /></Campo>
            <button className="botao">Alterar senha</button>
          </form>
        </Cartao>

        {u.perfil === "MEDICO" && (
          <Cartao titulo="Dados profissionais">
            <dl className="lista-dados">
              <dt>CRM</dt><dd>{u.crm}</dd>
              <dt>Especialidade</dt><dd>{u.especialidade}</dd>
              <dt>Duração</dt><dd>{u.duracaoConsulta} minutos</dd>
              <dt>Valor atual</dt><dd>{real(u.valorConsulta)}</dd>
              <dt>Agenda</dt><dd>{u.agenda.map((b, i) => <div key={i}>{DIAS[b.diaSemana]}: {b.inicio}–{b.fim}</div>)}</dd>
            </dl>
          </Cartao>
        )}
        {u.perfil === "PACIENTE" && u.paciente && (
          <Cartao titulo="Minha ficha">
            <dl className="lista-dados">
              <dt>CPF</dt><dd>{u.paciente.cpf}</dd>
              <dt>Nascimento</dt><dd>{data(u.paciente.dataNascimento)}</dd>
              <dt>Convênio</dt><dd>{u.paciente.convenio} {u.paciente.carteirinha && `· ${u.paciente.carteirinha}`}</dd>
              <dt>Alergias</dt><dd>{u.paciente.alergias || "Nenhuma informada"}</dd>
            </dl>
            <p className="suave">Para corrigir dados da ficha, procure a recepção.</p>
          </Cartao>
        )}
      </div>
    </>
  );
}

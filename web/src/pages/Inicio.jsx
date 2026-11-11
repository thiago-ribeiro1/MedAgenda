import { Link } from "react-router-dom";
import { api, baixarPdf } from "../api";
import { useAuth } from "../auth";
import { Aviso, Carregando, Cartao, Indicador, Status, Vazio, useCarga } from "../componentes";
import { dataHora, dataLonga, hora, real } from "../formato";
import { useState } from "react";

function TabelaAgenda({ consultas, acoes }) {
  if (!consultas.length) return <Vazio>Nenhuma consulta.</Vazio>;
  return (
    <div className="tabela-rolagem">
      <table>
        <thead><tr><th>Hora</th><th>Paciente</th><th>Médico</th><th>Situação</th><th></th></tr></thead>
        <tbody>
          {consultas.map(c => (
            <tr key={c._id}>
              <td><strong>{hora(c.inicio)}</strong></td>
              <td>{c.paciente?.nome}<div className="suave">{c.paciente?.telefone}</div></td>
              <td>{c.medico?.nome}</td>
              <td><Status valor={c.status} /></td>
              <td className="num">{acoes ? acoes(c) : <Link to={`/consultas/${c._id}`}>Abrir</Link>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Inicio() {
  const { usuario } = useAuth();
  const { dados, erro, carregando, recarregar } = useCarga(() => api("/dashboard"));
  const [msg, setMsg] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const primeiroNome = usuario.nome.replace(/^(Dra?\.)\s*/, "").split(" ")[0];

  async function acao(fn, texto) {
    setErroAcao(null); setMsg(null);
    try { await fn(); setMsg(texto); recarregar(); } catch (e) { setErroAcao(e); }
  }

  if (carregando && !dados) return <Carregando />;
  if (erro) return <Aviso erro={erro} />;

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Olá, {primeiroNome}</h1>
          <p className="sub">{dataLonga(new Date()).replace(/^./, l => l.toUpperCase())}</p>
        </div>
        {["SECRETARIA", "ADMIN", "PACIENTE"].includes(usuario.perfil) && <Link className="botao" to="/consultas/nova">+ Agendar consulta</Link>}
      </div>
      <Aviso erro={erroAcao} sucesso={msg} />

      {usuario.perfil === "ADMIN" && (
        <div className="grade grade-4" style={{ marginBottom: 20 }}>
          <Indicador rotulo="Consultas hoje" valor={dados.consultasHoje} />
          <Indicador rotulo="Pacientes" valor={dados.pacientes} />
          <Indicador rotulo="Receita do mês" valor={real(dados.receitaMes)} detalhe="consultas realizadas" />
          <Indicador rotulo="Usuários" valor={Object.values(dados.usuarios).reduce((a, b) => a + b, 0)}
            detalhe={`${dados.usuarios.MEDICO || 0} médicos · ${dados.usuarios.SECRETARIA || 0} secretárias · ${dados.usuarios.PACIENTE || 0} pacientes`} />
        </div>
      )}

      {(usuario.perfil === "ADMIN" || usuario.perfil === "SECRETARIA") && (
        <div className="grade grade-2">
          <Cartao titulo="Agenda de hoje" acoes={<Link to="/consultas">Ver agenda completa</Link>}>
            <TabelaAgenda consultas={dados.agendaHoje} />
          </Cartao>
          <Cartao titulo="Aguardando confirmação (48 h)">
            <TabelaAgenda consultas={dados.aConfirmar} acoes={c => (
              <button className="botao botao-peq" onClick={() => acao(() => api(`/consultas/${c._id}/confirmar`, { metodo: "PATCH" }), "Consulta confirmada.")}>Confirmar</button>
            )} />
          </Cartao>
        </div>
      )}

      {usuario.perfil === "MEDICO" && (
        <>
          <div className="grade grade-3" style={{ marginBottom: 20 }}>
            <Indicador rotulo="Pacientes hoje" valor={dados.agendaHoje.length} />
            <Indicador rotulo="Em atendimento" valor={dados.emAtendimento} />
            <Indicador rotulo="Próximas consultas" valor={dados.proximas.length} detalhe="a partir de amanhã" />
          </div>
          <Cartao titulo="Meus pacientes de hoje">
            <TabelaAgenda consultas={dados.agendaHoje} acoes={c => <Link className="botao botao-peq botao-sec" to={`/consultas/${c._id}`}>Atender</Link>} />
          </Cartao>
          <Cartao titulo="Próximos dias">
            {dados.proximas.length ? (
              <table><tbody>{dados.proximas.map(c => (
                <tr key={c._id}><td>{dataHora(c.inicio)}</td><td>{c.paciente?.nome}</td><td><Status valor={c.status} /></td></tr>
              ))}</tbody></table>
            ) : <Vazio>Sem consultas futuras.</Vazio>}
          </Cartao>
        </>
      )}

      {usuario.perfil === "PACIENTE" && (
        <div className="grade grade-2">
          <Cartao titulo="Próximas consultas">
            {dados.proximas.length ? dados.proximas.map(c => (
              <div key={c._id} className="notificacao">
                <div className="notificacao-corpo">
                  <strong>{dataHora(c.inicio)}</strong> <Status valor={c.status} />
                  <p>{c.medico?.nome} · {c.medico?.especialidade}</p>
                  <div className="acoes">
                    <Link className="botao botao-peq botao-sec" to={`/consultas/${c._id}`}>Detalhes</Link>
                    <button className="botao botao-peq botao-sec" onClick={() => baixarPdf(`/consultas/${c._id}/comprovante.pdf`, "comprovante.pdf").catch(setErroAcao)}>Comprovante</button>
                  </div>
                </div>
              </div>
            )) : <Vazio>Você não tem consultas marcadas.</Vazio>}
          </Cartao>
          <Cartao titulo="Últimos atendimentos">
            {dados.historico.length ? (
              <table><tbody>{dados.historico.map(c => (
                <tr key={c._id}><td>{dataHora(c.inicio)}</td><td>{c.medico?.nome}</td><td className="num"><Link to={`/consultas/${c._id}`}>Documentos</Link></td></tr>
              ))}</tbody></table>
            ) : <Vazio>Nenhum atendimento realizado ainda.</Vazio>}
          </Cartao>
        </div>
      )}
    </>
  );
}

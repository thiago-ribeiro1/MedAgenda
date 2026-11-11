import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, baixarPdf } from "../api";
import { useAuth } from "../auth";
import { Aviso, Campo, Carregando, Cartao, Status, useCarga } from "../componentes";
import { data, dataHora, idade, real } from "../formato";

const VAZIO = { queixa: "", anamnese: "", diagnostico: "", conduta: "", prescricao: [], atestadoDias: 0 };

function FormProntuario({ consulta, aoSalvar }) {
  const [p, setP] = useState(() => ({ ...VAZIO, ...(consulta.prontuario || {}) }));
  const [erro, setErro] = useState(null);
  const [ok, setOk] = useState(null);
  const mudar = campo => e => setP({ ...p, [campo]: e.target.value });
  const mudarItem = (i, campo) => e => setP({ ...p, prescricao: p.prescricao.map((x, j) => (j === i ? { ...x, [campo]: e.target.value } : x)) });

  async function salvar(e) {
    e.preventDefault();
    setErro(null); setOk(null);
    try {
      await api(`/consultas/${consulta._id}/prontuario`, { metodo: "PUT", corpo: { ...p, atestadoDias: Number(p.atestadoDias) } });
      setOk("Prontuário salvo.");
      aoSalvar();
    } catch (er) { setErro(er); }
  }

  return (
    <form onSubmit={salvar}>
      <Aviso erro={erro} sucesso={ok} />
      <Campo rotulo="Queixa principal" id="queixa"><input id="queixa" value={p.queixa} onChange={mudar("queixa")} /></Campo>
      <Campo rotulo="Anamnese" id="anamnese"><textarea id="anamnese" value={p.anamnese} onChange={mudar("anamnese")} /></Campo>
      <div className="linha-form">
        <Campo rotulo="Diagnóstico" id="diagnostico"><input id="diagnostico" value={p.diagnostico} onChange={mudar("diagnostico")} /></Campo>
        <Campo rotulo="Dias de atestado" id="atestado" dica="0 a 15 dias">
          <input id="atestado" type="number" value={p.atestadoDias} onChange={mudar("atestadoDias")} />
        </Campo>
      </div>
      <Campo rotulo="Conduta" id="conduta"><textarea id="conduta" value={p.conduta} onChange={mudar("conduta")} /></Campo>
      <h3>Prescrição</h3>
      {p.prescricao.map((item, i) => (
        <div className="prescricao-item" key={i}>
          <input aria-label={`Medicamento ${i + 1}`} placeholder="Medicamento e dose" value={item.medicamento} onChange={mudarItem(i, "medicamento")} />
          <input aria-label={`Posologia ${i + 1}`} placeholder="Posologia" value={item.posologia} onChange={mudarItem(i, "posologia")} />
          <button type="button" className="botao botao-texto" onClick={() => setP({ ...p, prescricao: p.prescricao.filter((_, j) => j !== i) })}>Remover</button>
        </div>
      ))}
      <div className="acoes" style={{ marginTop: 8 }}>
        <button type="button" className="botao botao-sec" onClick={() => setP({ ...p, prescricao: [...p.prescricao, { medicamento: "", posologia: "" }] })}>+ Medicamento</button>
        <button className="botao">Salvar prontuário</button>
      </div>
    </form>
  );
}

function VerProntuario({ p }) {
  return (
    <>
      <dl className="lista-dados">
        <dt>Queixa</dt><dd>{p.queixa || "—"}</dd>
        <dt>Anamnese</dt><dd>{p.anamnese || "—"}</dd>
        <dt>Diagnóstico</dt><dd><strong>{p.diagnostico || "—"}</strong></dd>
        <dt>Conduta</dt><dd>{p.conduta || "—"}</dd>
        <dt>Atestado</dt><dd>{p.atestadoDias ? `${p.atestadoDias} dia(s)` : "Não"}</dd>
        <dt>Registrado em</dt><dd>{p.registradoEm ? dataHora(p.registradoEm) : "—"}</dd>
      </dl>
      {p.prescricao?.length > 0 && (
        <>
          <h3>Prescrição</h3>
          <ol>{p.prescricao.map((i, n) => <li key={n}><strong>{i.medicamento}</strong> — {i.posologia}</li>)}</ol>
        </>
      )}
    </>
  );
}

export default function ConsultaDetalhe() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const local = useLocation();
  const { dados: c, erro, carregando, recarregar } = useCarga(() => api(`/consultas/${id}`), [id]);
  const [msg, setMsg] = useState(local.state?.msg || null);
  const [erroAcao, setErroAcao] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [msg, erroAcao]);

  if (carregando && !c) return <Carregando />;
  if (erro) return <Aviso erro={erro} />;

  const perfil = usuario.perfil;
  const equipe = perfil === "ADMIN" || perfil === "SECRETARIA";
  const meuAtendimento = perfil === "MEDICO" && c.medico?._id === usuario._id;
  const ativa = ["AGENDADA", "CONFIRMADA"].includes(c.status);

  async function acao(rota, texto, corpo) {
    setMsg(null); setErroAcao(null);
    try {
      await api(`/consultas/${id}/${rota}`, { metodo: "PATCH", corpo });
      setMsg(texto);
      setCancelando(false);
      recarregar();
    } catch (e) { setErroAcao(e); }
  }
  const pdf = (tipo, nome) => baixarPdf(`/consultas/${id}/${tipo}.pdf`, nome).catch(setErroAcao);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <Link to="/consultas" className="suave">← Voltar</Link>
          <h1 style={{ marginTop: 6 }}>Consulta de {dataHora(c.inicio)}</h1>
          <p className="sub"><Status valor={c.status} /> · {c.tipo === "RETORNO" ? "Retorno" : "Primeira consulta"}</p>
        </div>
        <div className="acoes">
          {equipe && c.status === "AGENDADA" && <button className="botao" onClick={() => acao("confirmar", "Consulta confirmada.")}>Confirmar</button>}
          {equipe && ativa && new Date(c.inicio) < new Date() && <button className="botao botao-sec" onClick={() => acao("falta", "Falta registrada.")}>Registrar falta</button>}
          {meuAtendimento && c.status === "CONFIRMADA" && <button className="botao" onClick={() => acao("iniciar", "Atendimento iniciado.")}>Iniciar atendimento</button>}
          {meuAtendimento && c.status === "EM_ATENDIMENTO" && <button className="botao" onClick={() => acao("finalizar", "Atendimento finalizado.")}>Finalizar atendimento</button>}
          {(equipe || perfil === "PACIENTE") && ativa && <button className="botao botao-perigo" onClick={() => setCancelando(true)}>Cancelar consulta</button>}
        </div>
      </div>

      <Aviso erro={erroAcao} sucesso={msg} />

      {cancelando && (
        <Cartao titulo="Cancelar consulta">
          <Campo rotulo="Motivo do cancelamento" id="motivo-cancel">
            <input id="motivo-cancel" value={motivo} onChange={e => setMotivo(e.target.value)} />
          </Campo>
          <div className="acoes">
            <button className="botao botao-perigo" onClick={() => acao("cancelar", "Consulta cancelada.", { motivo })}>Confirmar cancelamento</button>
            <button className="botao botao-texto" onClick={() => setCancelando(false)}>Voltar</button>
          </div>
        </Cartao>
      )}

      <div className="grade grade-2" style={{ alignItems: "start" }}>
        <Cartao titulo="Paciente">
          <dl className="lista-dados">
            <dt>Nome</dt><dd><strong>{c.paciente?.nome}</strong></dd>
            <dt>CPF</dt><dd>{c.paciente?.cpf}</dd>
            <dt>Nascimento</dt><dd>{c.paciente && `${data(c.paciente.dataNascimento)} (${idade(c.paciente.dataNascimento)} anos)`}</dd>
            <dt>Telefone</dt><dd>{c.paciente?.telefone || "—"}</dd>
            <dt>Alergias</dt><dd>{c.paciente?.alergias ? <strong style={{ color: "var(--vermelho)" }}>{c.paciente.alergias}</strong> : "Nenhuma informada"}</dd>
          </dl>
        </Cartao>
        <Cartao titulo="Atendimento">
          <dl className="lista-dados">
            <dt>Médico</dt><dd>{c.medico?.nome}<div className="suave">{c.medico?.especialidade} · {c.medico?.crm}</div></dd>
            <dt>Horário</dt><dd>{dataHora(c.inicio)} até {new Date(c.fim).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</dd>
            <dt>Convênio</dt><dd>{c.convenio}</dd>
            <dt>Valor</dt><dd>{real(c.valor)}</dd>
            <dt>Motivo</dt><dd>{c.motivo || "—"}</dd>
            {c.status === "CANCELADA" && <><dt>Cancelamento</dt><dd>{c.motivoCancelamento || "Sem motivo informado"}</dd></>}
          </dl>
          {perfil !== "SECRETARIA" && (
            <div className="acoes" style={{ marginTop: 16 }}>
              <button className="botao botao-sec botao-peq" onClick={() => pdf("comprovante", "comprovante.pdf")}>Comprovante (PDF)</button>
              {c.status === "REALIZADA" && <button className="botao botao-sec botao-peq" onClick={() => pdf("receita", "receita.pdf")}>Receita (PDF)</button>}
              {c.status === "REALIZADA" && <button className="botao botao-sec botao-peq" onClick={() => pdf("atestado", "atestado.pdf")}>Atestado (PDF)</button>}
            </div>
          )}
        </Cartao>
      </div>

      {perfil === "MEDICO" && c.status === "EM_ATENDIMENTO" ? (
        <Cartao titulo="Prontuário"><FormProntuario consulta={c} aoSalvar={recarregar} /></Cartao>
      ) : c.prontuario ? (
        <Cartao titulo="Prontuário"><VerProntuario p={c.prontuario} /></Cartao>
      ) : null}
    </>
  );
}

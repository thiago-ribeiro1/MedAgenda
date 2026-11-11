import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Aviso, Campo, Cartao, useCarga } from "../componentes";
import { DIAS, hojeISO, hora, real } from "../formato";

export default function NovaConsulta() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const equipe = usuario.perfil !== "PACIENTE";
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ pacienteId: "", medicoId: "", data: hojeISO(), tipo: "PRIMEIRA", motivo: "" });
  const [horario, setHorario] = useState("");
  const [encaixe, setEncaixe] = useState("");
  const [livres, setLivres] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const medicos = useCarga(() => api("/medicos"));
  const pacientes = useCarga(() => (equipe ? api(`/pacientes?busca=${encodeURIComponent(busca)}`) : Promise.resolve([])), [busca, equipe]);
  const medico = (medicos.dados || []).find(m => m._id === form.medicoId);

  useEffect(() => {
    setHorario(""); setLivres(null);
    if (!form.medicoId || !form.data) return;
    api(`/medicos/${form.medicoId}/horarios?data=${form.data}`).then(r => setLivres(r.horarios)).catch(setErro);
  }, [form.medicoId, form.data]);

  const mudar = campo => e => setForm({ ...form, [campo]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    let inicio = horario;
    if (equipe && encaixe) {
      const [a, m, d] = form.data.split("-").map(Number);
      const [h, mi] = encaixe.split(":").map(Number);
      inicio = new Date(a, m - 1, d, h, mi).toISOString();
    }
    if (!inicio) return setErro(new Error("Escolha um horário"));
    setEnviando(true);
    try {
      const c = await api("/consultas", {
        metodo: "POST",
        corpo: { pacienteId: equipe ? form.pacienteId : undefined, medicoId: form.medicoId, inicio, tipo: form.tipo, motivo: form.motivo },
      });
      navegar(`/consultas/${c._id}`, { state: { msg: "Consulta agendada com sucesso." } });
    } catch (er) {
      setErro(er);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <h1>Agendar consulta</h1>
      <p className="sub">Escolha o médico, o dia e um dos horários livres.</p>
      <Aviso erro={erro} />
      <form onSubmit={enviar} className="grade grade-2" style={{ alignItems: "start" }}>
        <Cartao titulo="Dados da consulta">
          {equipe && (
            <>
              <Campo rotulo="Buscar paciente (nome ou CPF)" id="busca">
                <input id="busca" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Digite para filtrar" />
              </Campo>
              <Campo rotulo="Paciente" id="paciente">
                <select id="paciente" value={form.pacienteId} onChange={mudar("pacienteId")} required>
                  <option value="">Selecione…</option>
                  {(pacientes.dados || []).map(p => <option key={p._id} value={p._id}>{p.nome} · {p.cpf}</option>)}
                </select>
              </Campo>
            </>
          )}
          <Campo rotulo="Médico" id="medico">
            <select id="medico" value={form.medicoId} onChange={mudar("medicoId")} required>
              <option value="">Selecione…</option>
              {(medicos.dados || []).map(m => <option key={m._id} value={m._id}>{m.nome} · {m.especialidade}</option>)}
            </select>
          </Campo>
          {medico && (
            <div className="aviso aviso-info">
              <strong>{medico.especialidade}</strong> · consulta de {medico.duracaoConsulta} min · {real(medico.valorConsulta)}
              <div className="suave" style={{ marginTop: 4 }}>
                Atende: {[...new Set(medico.agenda.map(b => b.diaSemana))].sort().map(d => DIAS[d]).join(", ")}
              </div>
            </div>
          )}
          <div className="linha-form">
            <Campo rotulo="Data" id="data">
              <input id="data" type="date" value={form.data} onChange={mudar("data")} required />
            </Campo>
            <Campo rotulo="Tipo" id="tipo">
              <select id="tipo" value={form.tipo} onChange={mudar("tipo")}>
                <option value="PRIMEIRA">Primeira consulta</option>
                <option value="RETORNO">Retorno (até 30 dias)</option>
              </select>
            </Campo>
          </div>
          <Campo rotulo="Motivo da consulta" id="motivo" dica="Opcional, até 300 caracteres">
            <textarea id="motivo" value={form.motivo} onChange={mudar("motivo")} maxLength={300} />
          </Campo>
        </Cartao>

        <Cartao titulo="Horários livres">
          {!form.medicoId ? <p className="vazio">Selecione um médico.</p> : livres === null ? <p className="carregando">Buscando horários…</p> : livres.length === 0 ? (
            <p className="vazio">Nenhum horário livre neste dia.</p>
          ) : (
            <div className="horarios" role="group" aria-label="Horários livres">
              {livres.map(h => (
                <button type="button" key={h} className={`horario ${horario === h && !encaixe ? "escolhido" : ""}`} onClick={() => { setHorario(h); setEncaixe(""); }}>
                  {hora(h)}
                </button>
              ))}
            </div>
          )}
          {equipe && (
            <div style={{ marginTop: 18 }}>
              <Campo rotulo="Encaixe (horário manual)" id="encaixe" dica="Use apenas para encaixes autorizados pelo médico">
                <input id="encaixe" type="time" value={encaixe} onChange={e => setEncaixe(e.target.value)} />
              </Campo>
            </div>
          )}
          <button className="botao" style={{ marginTop: 10 }} disabled={enviando}>{enviando ? "Agendando…" : "Confirmar agendamento"}</button>
        </Cartao>
      </form>
    </>
  );
}

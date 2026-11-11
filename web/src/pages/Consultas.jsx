import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Aviso, Campo, Carregando, Cartao, Status, Vazio, useCarga } from "../componentes";
import { STATUS, dataHoraCurta, hojeISO, real } from "../formato";

export default function Consultas() {
  const { usuario } = useAuth();
  const ehPaciente = usuario.perfil === "PACIENTE";
  const equipe = usuario.perfil === "ADMIN" || usuario.perfil === "SECRETARIA";
  const [filtro, setFiltro] = useState({ data: ehPaciente ? "" : hojeISO(), status: "", medicoId: "" });
  const [msg, setMsg] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);

  const medicos = useCarga(() => (equipe ? api("/medicos") : Promise.resolve([])), [equipe]);
  const qs = new URLSearchParams(Object.entries(filtro).filter(([, v]) => v)).toString();
  const { dados, erro, carregando, recarregar } = useCarga(() => api(`/consultas?${qs}${ehPaciente ? "&ordem=desc" : ""}`), [qs]);

  const mudar = campo => e => setFiltro({ ...filtro, [campo]: e.target.value });

  async function acao(id, rota, texto, corpo) {
    setMsg(null); setErroAcao(null);
    try {
      await api(`/consultas/${id}/${rota}`, { metodo: "PATCH", corpo });
      setMsg(texto);
      recarregar();
    } catch (e) { setErroAcao(e); }
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>{ehPaciente ? "Minhas consultas" : "Agenda"}</h1>
          <p className="sub">{ehPaciente ? "Consultas passadas e futuras" : "Consultas por dia, médico e situação"}</p>
        </div>
        {usuario.perfil !== "MEDICO" && <Link className="botao" to="/consultas/nova">+ Agendar consulta</Link>}
      </div>

      <Cartao>
        <div className="filtros">
          <Campo rotulo="Data" id="f-data">
            <input id="f-data" type="date" value={filtro.data} onChange={mudar("data")} />
          </Campo>
          <Campo rotulo="Situação" id="f-status">
            <select id="f-status" value={filtro.status} onChange={mudar("status")}>
              <option value="">Todas</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
            </select>
          </Campo>
          {equipe && (
            <Campo rotulo="Médico" id="f-medico">
              <select id="f-medico" value={filtro.medicoId} onChange={mudar("medicoId")}>
                <option value="">Todos</option>
                {(medicos.dados || []).map(m => <option key={m._id} value={m._id}>{m.nome}</option>)}
              </select>
            </Campo>
          )}
          <button className="botao botao-texto" onClick={() => setFiltro({ data: "", status: "", medicoId: "" })}>Limpar filtros</button>
        </div>
      </Cartao>

      <Aviso erro={erroAcao || erro} sucesso={msg} />

      <Cartao titulo={dados ? `${dados.length} consulta(s)` : "Consultas"}>
        {carregando && !dados ? <Carregando /> : !dados?.length ? <Vazio>Nenhuma consulta encontrada para os filtros.</Vazio> : (
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Data e hora</th>
                  {!ehPaciente && <th>Paciente</th>}
                  <th>Médico</th><th>Tipo</th><th>Convênio</th><th className="num">Valor</th><th>Situação</th><th></th>
                </tr>
              </thead>
              <tbody>
                {dados.map(c => (
                  <tr key={c._id}>
                    <td><strong>{dataHoraCurta(c.inicio)}</strong></td>
                    {!ehPaciente && <td>{c.paciente?.nome}</td>}
                    <td>{c.medico?.nome}<div className="suave">{c.medico?.especialidade}</div></td>
                    <td>{c.tipo === "RETORNO" ? "Retorno" : "Primeira"}</td>
                    <td>{c.convenio}</td>
                    <td className="num">{real(c.valor)}</td>
                    <td><Status valor={c.status} /></td>
                    <td className="num">
                      <div className="acoes" style={{ justifyContent: "flex-end" }}>
                        {equipe && c.status === "AGENDADA" && (
                          <button className="botao botao-peq" onClick={() => acao(c._id, "confirmar", "Consulta confirmada.")}>Confirmar</button>
                        )}
                        {equipe && ["AGENDADA", "CONFIRMADA"].includes(c.status) && new Date(c.inicio) < new Date() && (
                          <button className="botao botao-peq botao-sec" onClick={() => acao(c._id, "falta", "Falta registrada.")}>Faltou</button>
                        )}
                        <Link className="botao botao-peq botao-sec" to={`/consultas/${c._id}`}>Abrir</Link>
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

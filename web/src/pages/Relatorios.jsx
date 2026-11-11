import { useState } from "react";
import { api, baixarPdf } from "../api";
import { useAuth } from "../auth";
import { Aviso, Campo, Carregando, Cartao, Indicador, Vazio, useCarga } from "../componentes";
import { STATUS, pct, real } from "../formato";

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function Relatorios() {
  const { usuario } = useAuth();
  const hoje = new Date();
  const [aba, setAba] = useState("consultas");
  const [filtro, setFiltro] = useState({ inicio: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim: iso(hoje), medicoId: "" });
  const [aplicado, setAplicado] = useState(filtro);
  const [erroPdf, setErroPdf] = useState(null);
  const medicos = useCarga(() => (usuario.perfil === "MEDICO" ? Promise.resolve([]) : api("/medicos")));

  const qs = new URLSearchParams(Object.entries(aplicado).filter(([, v]) => v)).toString();
  const { dados, erro, carregando } = useCarga(() => api(`/relatorios/${aba}?${qs}`), [aba, qs]);

  async function exportar() {
    setErroPdf(null);
    try { await baixarPdf(`/relatorios/${aba}.pdf?${qs}`, `relatorio-${aba}-${aplicado.inicio}-a-${aplicado.fim}.pdf`); }
    catch (e) { setErroPdf(e); }
  }

  const maxMedico = dados?.porMedico ? Math.max(1, ...dados.porMedico.map(m => m.total || m.receita || 0)) : 1;

  return (
    <>
      <div className="cabecalho-pagina">
        <div><h1>Relatórios</h1><p className="sub">Indicadores de atendimento e faturamento por período</p></div>
        <button className="botao" onClick={exportar} disabled={!dados}>Exportar PDF</button>
      </div>

      <div className="abas" role="tablist">
        <button role="tab" aria-selected={aba === "consultas"} className={aba === "consultas" ? "ativa" : ""} onClick={() => setAba("consultas")}>Consultas</button>
        <button role="tab" aria-selected={aba === "financeiro"} className={aba === "financeiro" ? "ativa" : ""} onClick={() => setAba("financeiro")}>Financeiro</button>
      </div>

      <Cartao>
        <form className="filtros" onSubmit={e => { e.preventDefault(); setAplicado(filtro); }}>
          <Campo rotulo="De" id="r-ini"><input id="r-ini" type="date" value={filtro.inicio} onChange={e => setFiltro({ ...filtro, inicio: e.target.value })} /></Campo>
          <Campo rotulo="Até" id="r-fim"><input id="r-fim" type="date" value={filtro.fim} onChange={e => setFiltro({ ...filtro, fim: e.target.value })} /></Campo>
          {usuario.perfil !== "MEDICO" && (
            <Campo rotulo="Médico" id="r-med">
              <select id="r-med" value={filtro.medicoId} onChange={e => setFiltro({ ...filtro, medicoId: e.target.value })}>
                <option value="">Todos</option>
                {(medicos.dados || []).map(m => <option key={m._id} value={m._id}>{m.nome}</option>)}
              </select>
            </Campo>
          )}
          <button className="botao botao-sec">Aplicar</button>
        </form>
      </Cartao>

      <Aviso erro={erroPdf || erro} />
      {carregando && !dados ? <Carregando /> : dados && aba === "consultas" && dados.porStatus ? (
        <>
          <div className="grade grade-4" style={{ marginBottom: 20 }}>
            <Indicador rotulo="Consultas" valor={dados.total} />
            <Indicador rotulo="Realizadas" valor={dados.porStatus.REALIZADA} />
            <Indicador rotulo="Taxa de faltas" valor={pct(dados.taxaFaltas)} detalhe={`${dados.porStatus.FALTOU} falta(s)`} />
            <Indicador rotulo="Cancelamentos" valor={pct(dados.taxaCancelamento)} detalhe={`${dados.porStatus.CANCELADA} cancelada(s)`} />
          </div>
          <div className="grade grade-2">
            <Cartao titulo="Por situação">
              <table><tbody>{Object.entries(STATUS).map(([k, v]) => (
                <tr key={k}><td>{v.rotulo}</td><td style={{ width: "50%" }}><div className="barra"><span style={{ width: `${dados.total ? (dados.porStatus[k] / dados.total) * 100 : 0}%` }} /></div></td><td className="num">{dados.porStatus[k]}</td></tr>
              ))}</tbody></table>
            </Cartao>
            <Cartao titulo="Por médico">
              {!dados.porMedico.length ? <Vazio>Sem dados no período.</Vazio> : (
                <table>
                  <thead><tr><th>Médico</th><th className="num">Total</th><th className="num">Realizadas</th><th className="num">Faltas</th></tr></thead>
                  <tbody>{dados.porMedico.map(m => <tr key={m.medico}><td>{m.medico}</td><td className="num">{m.total}</td><td className="num">{m.realizadas}</td><td className="num">{m.faltas}</td></tr>)}</tbody>
                </table>
              )}
            </Cartao>
          </div>
        </>
      ) : dados && aba === "financeiro" && dados.porConvenio ? (
        <>
          <div className="grade grade-3" style={{ marginBottom: 20 }}>
            <Indicador rotulo="Receita" valor={real(dados.receita)} />
            <Indicador rotulo="Atendimentos" valor={dados.atendimentos} />
            <Indicador rotulo="Ticket médio" valor={real(dados.ticketMedio)} />
          </div>
          <div className="grade grade-2">
            <Cartao titulo="Receita por médico">
              <table><tbody>{dados.porMedico.map(m => (
                <tr key={m.medico}><td>{m.medico}<div className="barra" style={{ marginTop: 6 }}><span style={{ width: `${(m.receita / maxMedico) * 100}%` }} /></div></td><td className="num">{m.atendimentos}</td><td className="num">{real(m.receita)}</td></tr>
              ))}</tbody></table>
            </Cartao>
            <Cartao titulo="Receita por convênio">
              <table><tbody>{dados.porConvenio.map(c => (
                <tr key={c.convenio}><td>{c.convenio}</td><td className="num">{c.atendimentos}</td><td className="num">{real(c.receita)}</td></tr>
              ))}</tbody></table>
            </Cartao>
          </div>
        </>
      ) : null}
    </>
  );
}

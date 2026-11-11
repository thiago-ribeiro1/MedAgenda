import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Aviso, Carregando, Cartao, Vazio, useCarga } from "../componentes";
import { dataHora } from "../formato";

const ICONES = { CONSULTA: "📅", LEMBRETE: "⏰", CANCELAMENTO: "✖", DOCUMENTO: "📄", INFO: "ℹ" };

export default function Notificacoes() {
  const [soNaoLidas, setSoNaoLidas] = useState(false);
  const { dados, erro, carregando, recarregar } = useCarga(() => api(`/notificacoes${soNaoLidas ? "?naoLidas=true" : ""}`), [soNaoLidas]);
  const [msg, setMsg] = useState(null);

  async function marcar(n) {
    await api(`/notificacoes/${n._id}/lida`, { metodo: "PATCH" });
    recarregar();
  }
  async function marcarTodas() {
    const r = await api("/notificacoes/lidas", { metodo: "PATCH" });
    setMsg(`${r.marcadas} notificação(ões) marcada(s) como lida(s).`);
    recarregar();
  }

  const naoLidas = (dados || []).filter(n => !n.lida).length;

  return (
    <>
      <div className="cabecalho-pagina">
        <div><h1>Notificações</h1><p className="sub">{naoLidas} não lida(s)</p></div>
        <div className="acoes">
          <label className="suave" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" style={{ width: "auto" }} checked={soNaoLidas} onChange={e => setSoNaoLidas(e.target.checked)} /> Somente não lidas
          </label>
          <button className="botao botao-sec" onClick={marcarTodas}>Marcar todas como lidas</button>
        </div>
      </div>
      <Aviso erro={erro} sucesso={msg} />
      <Cartao>
        {carregando && !dados ? <Carregando /> : !dados?.length ? <Vazio>Nenhuma notificação.</Vazio> : dados.map(n => (
          <div key={n._id} className={`notificacao ${n.lida ? "" : "nao-lida"}`}>
            <span className="notificacao-ponto" />
            <span aria-hidden="true" style={{ fontSize: 18 }}>{ICONES[n.tipo] || "•"}</span>
            <div className="notificacao-corpo">
              <strong>{n.titulo}</strong>
              <p>{n.mensagem}</p>
              <span className="suave">{dataHora(n.createdAt)}</span>
              {n.consulta && <> · <Link to={`/consultas/${n.consulta}`}>Ver consulta</Link></>}
            </div>
            {!n.lida && <button className="botao botao-texto botao-peq" onClick={() => marcar(n)}>Marcar como lida</button>}
          </div>
        ))}
      </Cartao>
    </>
  );
}

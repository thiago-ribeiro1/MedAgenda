import { useEffect, useState, useCallback } from "react";
import { STATUS } from "./formato";

export function Status({ valor }) {
  const s = STATUS[valor] || { rotulo: valor, cor: "cinza" };
  return <span className={`selo selo-${s.cor}`}>{s.rotulo}</span>;
}

export function Aviso({ erro, sucesso }) {
  if (erro) {
    return (
      <div className="aviso aviso-erro" role="alert">
        <strong>{erro.message || String(erro)}</strong>
        {erro.detalhes?.length > 0 && <ul>{erro.detalhes.map(d => <li key={d}>{d}</li>)}</ul>}
      </div>
    );
  }
  if (sucesso) return <div className="aviso aviso-ok" role="status">{sucesso}</div>;
  return null;
}

export function Carregando() {
  return <p className="carregando">Carregando…</p>;
}

export function Vazio({ children }) {
  return <p className="vazio">{children}</p>;
}

export function Campo({ rotulo, id, children, dica }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      {children}
      {dica && <small>{dica}</small>}
    </div>
  );
}

export function Cartao({ titulo, acoes, children, className = "" }) {
  return (
    <section className={`cartao ${className}`}>
      {(titulo || acoes) && (
        <header className="cartao-topo">
          {titulo && <h2>{titulo}</h2>}
          {acoes && <div className="acoes">{acoes}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Indicador({ rotulo, valor, detalhe }) {
  return (
    <div className="indicador">
      <span className="indicador-rotulo">{rotulo}</span>
      <strong className="indicador-valor">{valor}</strong>
      {detalhe && <span className="indicador-detalhe">{detalhe}</span>}
    </div>
  );
}

// carrega dados de uma função assíncrona e permite recarregar
export function useCarga(funcao, deps = []) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      setDados(await funcao());
      setErro(null);
    } catch (e) {
      setErro(e);
    } finally {
      setCarregando(false);
    }
  }, deps);
  useEffect(() => { recarregar(); }, [recarregar]);
  return { dados, erro, carregando, recarregar, setDados };
}

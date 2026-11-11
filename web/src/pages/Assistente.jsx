import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Aviso, Cartao, useCarga } from "../componentes";
import { hora } from "../formato";

const SUGESTOES = ["Quando é minha próxima consulta?", "Como cancelo uma consulta?", "Quais médicos atendem aqui?", "Qual o horário de funcionamento?", "Como pego minha receita?"];

export default function Assistente() {
  const { dados, setDados, erro } = useCarga(() => api("/chat"));
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState(null);
  const fim = useRef(null);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: "smooth" }); }, [dados]);

  async function enviar(mensagem) {
    if (!mensagem.trim() || enviando) return;
    setErroEnvio(null);
    setEnviando(true);
    const minha = { _id: `tmp-${Date.now()}`, autor: "USUARIO", texto: mensagem, createdAt: new Date().toISOString() };
    setDados(d => [...(d || []), minha]);
    setTexto("");
    try {
      const resposta = await api("/chat", { metodo: "POST", corpo: { mensagem } });
      setDados(d => [...d, resposta]);
    } catch (e) {
      setErroEnvio(e);
    } finally {
      setEnviando(false);
    }
  }

  async function limpar() {
    await api("/chat", { metodo: "DELETE" });
    setDados([]);
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Assistente virtual</h1>
          <p className="sub">Tire dúvidas sobre consultas, horários e documentos. O assistente não faz diagnósticos.</p>
        </div>
        <button className="botao botao-texto" onClick={limpar}>Limpar conversa</button>
      </div>
      <Aviso erro={erro || erroEnvio} />
      <Cartao className="chat">
        <div className="chat-mensagens" aria-live="polite">
          {(dados || []).length === 0 && <p className="vazio" style={{ textAlign: "center" }}>Comece com uma das sugestões abaixo.</p>}
          {(dados || []).map(m => (
            <div key={m._id} className={`balao balao-${m.autor}`}>
              {m.texto}
              <small>{hora(m.createdAt)}</small>
            </div>
          ))}
          {enviando && <div className="balao balao-ASSISTENTE">Digitando…</div>}
          <div ref={fim} />
        </div>
        <div className="chat-sugestoes">
          {SUGESTOES.map(s => <button key={s} className="chip" onClick={() => enviar(s)}>{s}</button>)}
        </div>
        <form className="chat-entrada" onSubmit={e => { e.preventDefault(); enviar(texto); }}>
          <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Escreva sua pergunta…" maxLength={600} />
          <button className="botao" disabled={enviando}>Enviar</button>
        </form>
      </Cartao>
    </>
  );
}

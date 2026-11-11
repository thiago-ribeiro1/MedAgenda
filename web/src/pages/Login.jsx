import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Aviso, Campo } from "../componentes";

export default function Login() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await entrar(email, senha);
      navegar("/");
    } catch (er) {
      setErro(er);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <div className="login-arte">
        <div className="marca" style={{ border: 0, padding: 0 }}>
          <span className="marca-icone" aria-hidden="true">✚</span>
          <div><strong>MedAgenda</strong><small style={{ color: "#cfe5ea" }}>Clínica MedAgenda</small></div>
        </div>
        <div>
          <h1>Agenda, prontuário e atendimento em um só lugar.</h1>
          <p>Consultas, confirmações, documentos médicos, relatórios e um assistente virtual para pacientes e equipe da clínica.</p>
        </div>
        <small style={{ color: "#9fc2cb" }}>Rua das Acácias, 120 · Centro · Campina Grande - PB</small>
      </div>
      <div className="login-form">
        <form onSubmit={enviar}>
          <h1>Entrar</h1>
          <p className="sub">Use o e-mail e a senha fornecidos pela clínica.</p>
          <Aviso erro={erro} />
          <Campo rotulo="E-mail" id="email">
            <input id="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
          </Campo>
          <Campo rotulo="Senha" id="senha">
            <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} required />
          </Campo>
          <button className="botao" style={{ width: "100%", justifyContent: "center", padding: 12 }} disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
          <p className="suave" style={{ marginTop: 18 }}>Esqueceu a senha? Procure a recepção ou o administrador do sistema.</p>
        </form>
      </div>
    </div>
  );
}

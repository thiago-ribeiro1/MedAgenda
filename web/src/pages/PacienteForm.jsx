import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Aviso, Campo, Carregando, Cartao } from "../componentes";

const NOVO = { nome: "", cpf: "", dataNascimento: "", sexo: "F", telefone: "", email: "", convenio: "Particular", carteirinha: "", alergias: "", observacoes: "" };
const CONVENIOS = ["Particular", "Plano Saúde Vida", "Bem Estar Saúde", "Unimed", "Hapvida", "Outro"];

export default function PacienteForm() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [p, setP] = useState(id ? null : NOVO);
  const [erro, setErro] = useState(null);
  const [msg, setMsg] = useState(null);
  const somenteLeitura = usuario.perfil === "MEDICO";

  useEffect(() => {
    if (!id) return;
    api(`/pacientes/${id}`).then(d => setP({ ...NOVO, ...d, dataNascimento: d.dataNascimento?.slice(0, 10) })).catch(setErro);
  }, [id]);

  const mudar = campo => e => setP({ ...p, [campo]: e.target.value });

  async function salvar(e) {
    e.preventDefault();
    setErro(null); setMsg(null);
    try {
      const corpo = { nome: p.nome, cpf: p.cpf, dataNascimento: p.dataNascimento, sexo: p.sexo, telefone: p.telefone, email: p.email,
        convenio: p.convenio, carteirinha: p.carteirinha, alergias: p.alergias, observacoes: p.observacoes };
      if (id) {
        await api(`/pacientes/${id}`, { metodo: "PUT", corpo });
        setMsg("Ficha atualizada.");
      } else {
        const novo = await api("/pacientes", { metodo: "POST", corpo });
        navegar(`/pacientes/${novo._id}`, { replace: true });
        setMsg("Paciente cadastrado.");
      }
    } catch (er) { setErro(er); }
  }

  if (!p) return erro ? <Aviso erro={erro} /> : <Carregando />;

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <Link to="/pacientes" className="suave">← Pacientes</Link>
          <h1 style={{ marginTop: 6 }}>{id ? p.nome : "Novo paciente"}</h1>
        </div>
        {id && !somenteLeitura && (
          <Link className="botao botao-sec" to={`/usuarios/novo?perfil=PACIENTE&paciente=${id}`}>Criar acesso ao portal</Link>
        )}
      </div>
      <Aviso erro={erro} sucesso={msg} />
      <form onSubmit={salvar}>
        <fieldset disabled={somenteLeitura} style={{ border: 0, padding: 0, margin: 0 }}>
          <Cartao titulo="Identificação">
            <div className="linha-form">
              <Campo rotulo="Nome completo" id="nome"><input id="nome" value={p.nome} onChange={mudar("nome")} required /></Campo>
              <Campo rotulo="CPF" id="cpf" dica="Somente números ou 000.000.000-00"><input id="cpf" value={p.cpf} onChange={mudar("cpf")} required /></Campo>
            </div>
            <div className="linha-form">
              <Campo rotulo="Data de nascimento" id="nasc"><input id="nasc" type="date" value={p.dataNascimento} onChange={mudar("dataNascimento")} required /></Campo>
              <Campo rotulo="Sexo" id="sexo">
                <select id="sexo" value={p.sexo} onChange={mudar("sexo")}>
                  <option value="F">Feminino</option><option value="M">Masculino</option><option value="OUTRO">Outro / não informar</option>
                </select>
              </Campo>
            </div>
          </Cartao>
          <Cartao titulo="Contato e convênio">
            <div className="linha-form">
              <Campo rotulo="Telefone" id="tel"><input id="tel" value={p.telefone} onChange={mudar("telefone")} placeholder="(83) 99999-9999" /></Campo>
              <Campo rotulo="E-mail" id="email-p"><input id="email-p" type="email" value={p.email} onChange={mudar("email")} /></Campo>
            </div>
            <div className="linha-form">
              <Campo rotulo="Convênio" id="conv">
                <select id="conv" value={p.convenio} onChange={mudar("convenio")}>{CONVENIOS.map(c => <option key={c}>{c}</option>)}</select>
              </Campo>
              <Campo rotulo="Nº da carteirinha" id="cart"><input id="cart" value={p.carteirinha} onChange={mudar("carteirinha")} /></Campo>
            </div>
          </Cartao>
          <Cartao titulo="Informações clínicas">
            <Campo rotulo="Alergias" id="alerg"><input id="alerg" value={p.alergias} onChange={mudar("alergias")} placeholder="Ex.: dipirona, penicilina" /></Campo>
            <Campo rotulo="Observações" id="obs"><textarea id="obs" value={p.observacoes} onChange={mudar("observacoes")} /></Campo>
          </Cartao>
          {!somenteLeitura && <button className="botao">{id ? "Salvar alterações" : "Cadastrar paciente"}</button>}
        </fieldset>
      </form>
    </>
  );
}

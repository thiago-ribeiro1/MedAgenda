import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Aviso, Campo, Carregando, Cartao, Vazio, useCarga } from "../componentes";
import { data, idade } from "../formato";

export default function Pacientes() {
  const { usuario } = useAuth();
  const [busca, setBusca] = useState("");
  const { dados, erro, carregando } = useCarga(() => api(`/pacientes?busca=${encodeURIComponent(busca)}`), [busca]);
  const podeEditar = usuario.perfil !== "MEDICO";

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Pacientes</h1>
          <p className="sub">{usuario.perfil === "MEDICO" ? "Pacientes que já tiveram consulta com você" : "Fichas cadastrais da clínica"}</p>
        </div>
        {podeEditar && <Link className="botao" to="/pacientes/novo">+ Novo paciente</Link>}
      </div>
      <Cartao>
        <Campo rotulo="Buscar por nome ou CPF" id="busca-pac">
          <input id="busca-pac" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Ex.: Ana ou 123.456" />
        </Campo>
        <Aviso erro={erro} />
        {carregando && !dados ? <Carregando /> : !dados?.length ? <Vazio>Nenhum paciente encontrado.</Vazio> : (
          <div className="tabela-rolagem">
            <table>
              <thead><tr><th>Nome</th><th>CPF</th><th>Nascimento</th><th>Convênio</th><th>Telefone</th><th>Acesso</th><th></th></tr></thead>
              <tbody>
                {dados.map(p => (
                  <tr key={p._id}>
                    <td><strong>{p.nome}</strong>{p.alergias && <div className="suave" style={{ color: "var(--vermelho)" }}>Alergia: {p.alergias}</div>}</td>
                    <td>{p.cpf}</td>
                    <td>{data(p.dataNascimento)} <span className="suave">({idade(p.dataNascimento)} anos)</span></td>
                    <td>{p.convenio}</td>
                    <td>{p.telefone}</td>
                    <td>{p.temConta ? <span className="selo selo-verde">Com conta</span> : <span className="selo selo-cinza">Sem conta</span>}</td>
                    <td className="num"><Link to={`/pacientes/${p._id}`}>{podeEditar ? "Editar" : "Ver ficha"}</Link></td>
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

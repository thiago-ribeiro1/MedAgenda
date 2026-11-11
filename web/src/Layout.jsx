import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { api } from "./api";
import { PERFIS } from "./formato";

const MENU = [
  { para: "/", rotulo: "Início", icone: "⌂", perfis: ["ADMIN", "SECRETARIA", "MEDICO", "PACIENTE"] },
  { para: "/consultas", rotulo: "Agenda", icone: "▦", perfis: ["ADMIN", "SECRETARIA", "MEDICO"] },
  { para: "/consultas", rotulo: "Minhas consultas", icone: "▦", perfis: ["PACIENTE"] },
  { para: "/consultas/nova", rotulo: "Agendar consulta", icone: "+", perfis: ["ADMIN", "SECRETARIA", "PACIENTE"] },
  { para: "/pacientes", rotulo: "Pacientes", icone: "☰", perfis: ["ADMIN", "SECRETARIA", "MEDICO"] },
  { para: "/usuarios", rotulo: "Usuários", icone: "⚙", perfis: ["ADMIN"] },
  { para: "/relatorios", rotulo: "Relatórios", icone: "▤", perfis: ["ADMIN", "SECRETARIA", "MEDICO"] },
  { para: "/assistente", rotulo: "Assistente virtual", icone: "✦", perfis: ["ADMIN", "SECRETARIA", "MEDICO", "PACIENTE"] },
];

export default function Layout() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();
  const [naoLidas, setNaoLidas] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    let ativo = true;
    const buscar = () => api("/notificacoes/contagem").then(r => ativo && setNaoLidas(r.naoLidas)).catch(() => {});
    buscar();
    const t = setInterval(buscar, 5 * 60 * 1000);
    return () => { ativo = false; clearInterval(t); };
  }, []);

  const iniciais = usuario.nome.replace(/^(Dra?\.)\s*/, "").split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("");

  return (
    <div className={`casca ${menuAberto ? "menu-aberto" : ""}`}>
      <aside className="lateral">
        <div className="marca">
          <span className="marca-icone" aria-hidden="true">✚</span>
          <div>
            <strong>MedAgenda</strong>
            <small>Clínica MedAgenda</small>
          </div>
        </div>
        <nav aria-label="Menu principal">
          {MENU.filter(m => m.perfis.includes(usuario.perfil)).map(m => (
            <NavLink key={m.rotulo} to={m.para} end onClick={() => setMenuAberto(false)}>
              <span className="nav-icone" aria-hidden="true">{m.icone}</span>{m.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="lateral-rodape">v1.0 · ambiente de testes</div>
      </aside>

      <div className="principal">
        <header className="topo">
          <button className="botao-menu" aria-label="Abrir menu" onClick={() => setMenuAberto(!menuAberto)}>☰</button>
          <div className="topo-espaco" />
          <button className="sino" onClick={() => navegar("/notificacoes")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
            {naoLidas > 0 && <span className="sino-contador">{naoLidas > 99 ? "99+" : naoLidas}</span>}
          </button>
          <NavLink to="/perfil" className="usuario-topo">
            <span className="avatar">{iniciais}</span>
            <span className="usuario-nome">
              <strong>{usuario.nome}</strong>
              <small>{PERFIS[usuario.perfil]}</small>
            </span>
          </NavLink>
          <button className="botao botao-texto" onClick={() => { sair(); navegar("/login"); }}>Sair</button>
        </header>
        <main className="conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

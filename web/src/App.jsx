import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Layout from "./Layout";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import Consultas from "./pages/Consultas";
import NovaConsulta from "./pages/NovaConsulta";
import ConsultaDetalhe from "./pages/ConsultaDetalhe";
import Pacientes from "./pages/Pacientes";
import PacienteForm from "./pages/PacienteForm";
import Usuarios from "./pages/Usuarios";
import UsuarioForm from "./pages/UsuarioForm";
import Relatorios from "./pages/Relatorios";
import Notificacoes from "./pages/Notificacoes";
import Assistente from "./pages/Assistente";
import Perfil from "./pages/Perfil";

function Protegida({ perfis, children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (perfis && !perfis.includes(usuario.perfil)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { usuario } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Protegida><Layout /></Protegida>}>
        <Route index element={<Inicio />} />
        <Route path="consultas" element={<Consultas />} />
        <Route path="consultas/nova" element={<Protegida perfis={["ADMIN", "SECRETARIA", "PACIENTE"]}><NovaConsulta /></Protegida>} />
        <Route path="consultas/:id" element={<ConsultaDetalhe />} />
        <Route path="pacientes" element={<Protegida perfis={["ADMIN", "SECRETARIA", "MEDICO"]}><Pacientes /></Protegida>} />
        <Route path="pacientes/novo" element={<Protegida perfis={["ADMIN", "SECRETARIA"]}><PacienteForm /></Protegida>} />
        <Route path="pacientes/:id" element={<Protegida perfis={["ADMIN", "SECRETARIA", "MEDICO"]}><PacienteForm /></Protegida>} />
        <Route path="usuarios" element={<Protegida perfis={["ADMIN"]}><Usuarios /></Protegida>} />
        <Route path="usuarios/novo" element={<Protegida perfis={["ADMIN", "SECRETARIA"]}><UsuarioForm /></Protegida>} />
        <Route path="usuarios/:id" element={<Protegida perfis={["ADMIN"]}><UsuarioForm /></Protegida>} />
        <Route path="relatorios" element={<Protegida perfis={["ADMIN", "SECRETARIA", "MEDICO"]}><Relatorios /></Protegida>} />
        <Route path="notificacoes" element={<Notificacoes />} />
        <Route path="assistente" element={<Assistente />} />
        <Route path="perfil" element={<Perfil />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

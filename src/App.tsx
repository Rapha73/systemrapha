import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import CadastroPaciente from './pages/CadastroPaciente';
import DetalhesPaciente from './pages/DetalhesPaciente';
import CadastroConsulta from './pages/CadastroConsulta';
import EditarPaciente from './pages/EditarPaciente';
import MainLayout from './components/MainLayout';
import SnakeDecorativa from './components/SnakeDecorativa';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>;
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
};

// Public Route Component (Redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>;
  if (user) return <Navigate to="/dashboard" />;

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SnakeDecorativa />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

          {/* Protected Routes (nested inside MainLayout) */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/pacientes/cadastro" element={<CadastroPaciente />} />
            <Route path="/pacientes/:id" element={<DetalhesPaciente />} />
            <Route path="/pacientes/:id/consultas/cadastro" element={<CadastroConsulta />} />
            <Route path="/pacientes/:id/editar" element={<EditarPaciente />} />
          </Route>

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

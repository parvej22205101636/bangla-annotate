import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Navbar from './components/Navbar.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Projects from './pages/Projects.jsx';
import ProjectAdmin from './pages/ProjectAdmin.jsx';
import Annotate from './pages/Annotate.jsx';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center muted">Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/" element={<Private><Projects /></Private>} />
          <Route path="/projects/:id" element={<Private><ProjectAdmin /></Private>} />
          <Route path="/projects/:id/annotate" element={<Private><Annotate /></Private>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">অ</span> Bangla Annotate
        </Link>
        {user && (
          <div className="nav-right">
            <span className="muted">
              {user.name} · <span className="pill">{user.role}</span>
            </span>
            <button className="btn ghost" onClick={logout}>Log out</button>
          </div>
        )}
      </div>
    </header>
  );
}

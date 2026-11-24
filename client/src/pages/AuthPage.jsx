import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function AuthPage({ mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div className="auth">
      <div className="auth-intro">
        <h1>Label Bangla text as a team.</h1>
        <p className="muted">
          Upload a CSV, invite annotators, label items one by one with keyboard shortcuts, and check how much your
          team agrees with Cohen&apos;s kappa before you train a model.
        </p>
      </div>
      <form className="card auth-card" onSubmit={submit}>
        <h2>{isLogin ? 'Log in' : 'Create an account'}</h2>
        {!isLogin && (
          <label>Name<input required {...field('name')} /></label>
        )}
        <label>E-mail<input type="email" required autoComplete="email" {...field('email')} /></label>
        <label>
          Password
          <input type="password" required minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? 'current-password' : 'new-password'} {...field('password')} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Register'}</button>
        <p className="muted small">
          {isLogin ? <>No account? <Link to="/register">Register</Link></> : <>Have an account? <Link to="/login">Log in</Link></>}
        </p>
      </form>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

function NewProject({ onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', labels: 'real, fake, unsure', annotationsPerItem: 2 });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { project } = await api('/projects', { method: 'POST', body: form });
      onCreated(project);
      setForm({ ...form, name: '', description: '' });
    } catch (err) {
      setError(err.message);
    }
  };
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <form className="card" onSubmit={submit}>
      <h3>New project</h3>
      <div className="grid-2">
        <label>Name<input required maxLength={100} {...field('name')} /></label>
        <label>Labels (comma separated, 2–9)<input required {...field('labels')} /></label>
      </div>
      <label>Description<input maxLength={500} {...field('description')} /></label>
      <label className="inline">
        Annotators per item
        <select {...field('annotationsPerItem')}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn">Create project</button>
    </form>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/projects').then((d) => setProjects(d.projects)).catch((e) => setError(e.message));
  }, []);

  const isAdmin = user.role === 'admin';

  return (
    <>
      <div className="page-head">
        <h1>Projects</h1>
        <p className="muted">{isAdmin ? 'Projects you manage.' : 'Projects you have been invited to.'}</p>
      </div>
      {isAdmin && <NewProject onCreated={(p) => setProjects([{ ...p, progress: { total: 0, done: 0, mine: 0 } }, ...projects])} />}
      {error && <p className="error">{error}</p>}
      {projects === null ? (
        <p className="muted">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="card empty">
          {isAdmin ? 'No projects yet. Create one above.' : 'No projects yet. Ask your admin to add your e-mail to a project.'}
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <div key={p._id} className="card project-card">
              <h3>{p.name}</h3>
              {p.description && <p className="muted small">{p.description}</p>}
              <div className="labels">
                {p.labels.map((l) => <span key={l.name} className="tag" style={{ borderColor: l.color, color: l.color }}>{l.name}</span>)}
              </div>
              <ProgressBar value={p.progress.done} total={p.progress.total} />
              <p className="small muted">
                {p.progress.done} of {p.progress.total} items done · you labelled {p.progress.mine}
              </p>
              <div className="row">
                <Link className="btn" to={`/projects/${p._id}/annotate`}>Start labelling</Link>
                {isAdmin && <Link className="btn ghost" to={`/projects/${p._id}`}>Manage</Link>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

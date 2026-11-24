import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, download } from '../api.js';
import ProgressBar from '../components/ProgressBar.jsx';

function Stat({ label, value }) {
  return (
    <div className="card stat">
      <div className="stat-value">{value}</div>
      <div className="small muted">{label}</div>
    </div>
  );
}

export default function ProjectAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [file, setFile] = useState(null);
  const [textColumn, setTextColumn] = useState('');
  const [email, setEmail] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api(`/projects/${id}`), api(`/projects/${id}/stats`)]);
      setProject(p.project);
      setStats(s);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      await fn();
      if (message) setNotice(message);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const uploadCsv = (e) => {
    e.preventDefault();
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    if (textColumn) body.append('textColumn', textColumn);
    run(async () => {
      const d = await api(`/projects/${id}/items`, { method: 'POST', body });
      setNotice(`Added ${d.added} items.`);
      setFile(null);
      e.target.reset();
    });
  };

  const addMember = (e) => {
    e.preventDefault();
    run(async () => {
      await api(`/projects/${id}/members`, { method: 'POST', body: { email } });
      setEmail('');
    }, 'Member added.');
  };

  const removeProject = () => {
    if (!window.confirm('Delete this project with all items and labels? This cannot be undone.')) return;
    run(async () => {
      await api(`/projects/${id}`, { method: 'DELETE' });
      navigate('/');
    });
  };

  if (!project || !stats) return error ? <p className="error">{error}</p> : <p className="muted center">Loading…</p>;

  const maxLabel = Math.max(1, ...Object.values(stats.labelCounts));
  const colorOf = (name) => project.labels.find((l) => l.name === name)?.color || 'var(--brand)';
  const slug = project.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

  return (
    <>
      <div className="page-head">
        <Link to="/" className="small">← All projects</Link>
        <h1>{project.name}</h1>
        <p className="muted">{project.description || 'No description'} · {project.annotationsPerItem} annotator(s) per item</p>
        <div className="row">
          <Link className="btn" to={`/projects/${id}/annotate`}>Start labelling</Link>
          <button className="btn ghost" onClick={() => download(`/projects/${id}/export?format=csv`, `${slug}.csv`)}>Export CSV</button>
          <button className="btn ghost" onClick={() => download(`/projects/${id}/export?format=json`, `${slug}.json`)}>Export JSON</button>
        </div>
      </div>

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{error}</p>}

      <div className="stats">
        <Stat label="Items" value={stats.total} />
        <Stat label="Finished items" value={stats.done} />
        <Stat label="Labels given" value={stats.annotations} />
        <Stat label="Members" value={project.members.length} />
      </div>
      <div className="card">
        <h3>Progress</h3>
        <ProgressBar value={stats.done} total={stats.total} />
        <p className="small muted">{stats.total ? Math.round((stats.done / stats.total) * 100) : 0}% of items have enough labels</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Label distribution</h3>
          {Object.entries(stats.labelCounts).map(([name, count]) => (
            <div key={name} className="bar-row">
              <span className="bar-name">{name}</span>
              <div className="bar"><div className="bar-fill" style={{ width: `${(count / maxLabel) * 100}%`, background: colorOf(name) }} /></div>
              <span className="bar-count">{count}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Agreement between annotators</h3>
          {stats.agreement.length === 0 ? (
            <p className="muted small">Shows up once two people have labelled the same items.</p>
          ) : (
            <table>
              <thead><tr><th>Pair</th><th>Shared</th><th>Agree</th><th>Kappa</th></tr></thead>
              <tbody>
                {stats.agreement.map((a) => (
                  <tr key={a.a + a.b}>
                    <td>{a.a} × {a.b}</td>
                    <td>{a.n}</td>
                    <td>{Math.round(a.observed * 100)}%</td>
                    <td>{a.kappa === null ? '–' : a.kappa.toFixed(2)} <span className="muted small">{a.meaning}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="small muted">Cohen&apos;s kappa corrects agreement for chance. Above 0.6 is usually good enough to train on.</p>
        </div>
      </div>

      <div className="grid-2">
        <form className="card" onSubmit={uploadCsv}>
          <h3>Upload items</h3>
          <p className="small muted">CSV with a <code>text</code> column (optional <code>id</code> column). Up to 5,000 rows, 5 MB.</p>
          <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files[0])} />
          <label>Text column (optional)<input placeholder="text" value={textColumn} onChange={(e) => setTextColumn(e.target.value)} /></label>
          <button className="btn" disabled={!file}>Upload</button>
        </form>

        <div className="card">
          <h3>Members</h3>
          <table>
            <thead><tr><th>Name</th><th>Labelled</th><th /></tr></thead>
            <tbody>
              {stats.annotators.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}<div className="small muted">{m.email}</div></td>
                  <td>{m.count}</td>
                  <td>
                    {String(m.id) !== String(project.owner) && (
                      <button className="link-btn" onClick={() => run(() => api(`/projects/${id}/members/${m.id}`, { method: 'DELETE' }), 'Member removed.')}>Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form className="row" onSubmit={addMember}>
            <input type="email" required placeholder="annotator@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn">Add</button>
          </form>
          <p className="small muted">The person must register first.</p>
        </div>
      </div>

      <div className="danger">
        <button className="link-btn" onClick={removeProject}>Delete project</button>
      </div>
    </>
  );
}

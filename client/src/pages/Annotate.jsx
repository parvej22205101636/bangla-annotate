import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function Annotate() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [item, setItem] = useState(undefined); // undefined = loading, null = nothing left
  const [remaining, setRemaining] = useState(0);
  const [done, setDone] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadNext = useCallback(async () => {
    const d = await api(`/projects/${id}/next`);
    setItem(d.item);
    setRemaining(d.remaining);
  }, [id]);

  useEffect(() => {
    api(`/projects/${id}`)
      .then((d) => {
        setProject(d.project);
        setDone(d.progress.mine);
        return loadNext();
      })
      .catch((e) => setError(e.message));
  }, [id, loadNext]);

  const choose = useCallback(
    async (label) => {
      if (!item || saving) return;
      setSaving(true);
      setError('');
      try {
        await api(`/projects/${id}/annotations`, { method: 'POST', body: { itemId: item._id, label } });
        setDone((n) => n + 1);
        await loadNext();
      } catch (e) {
        setError(e.message);
      } finally {
        setSaving(false);
      }
    },
    [id, item, saving, loadNext],
  );

  // Keyboard shortcuts: keys 1–9 pick the matching label.
  useEffect(() => {
    const onKey = (e) => {
      if (!project || e.target.tagName === 'INPUT') return;
      const n = Number(e.key);
      if (n >= 1 && n <= project.labels.length) choose(project.labels[n - 1].name);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [project, choose]);

  if (error && !project) return <p className="error">{error}</p>;
  if (!project || item === undefined) return <p className="muted center">Loading…</p>;

  return (
    <div className="annotate">
      <div className="page-head">
        <Link to="/" className="small">← All projects</Link>
        <h1>{project.name}</h1>
        {project.description && <p className="muted">{project.description}</p>}
      </div>

      {item === null ? (
        <div className="card empty">
          <h3>All done 🎉</h3>
          <p className="muted">You have labelled every item that still needs a label. You labelled {done} in total.</p>
        </div>
      ) : (
        <>
          <div className="counter small muted">You labelled {done} · {remaining} left for you</div>
          <div className="card text-card" lang="bn">
            {item.externalId && <span className="small muted">#{item.externalId}</span>}
            <p className="bangla">{item.text}</p>
          </div>
          <div className="label-buttons">
            {project.labels.map((l, i) => (
              <button key={l.name} className="label-btn" style={{ '--c': l.color }} disabled={saving} onClick={() => choose(l.name)}>
                <kbd>{i + 1}</kbd> {l.name}
              </button>
            ))}
          </div>
          <p className="small muted center">Tip: press the number keys to label faster.</p>
          {error && <p className="error center">{error}</p>}
        </>
      )}
    </div>
  );
}

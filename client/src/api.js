const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export const getToken = () => localStorage.getItem('token');
export const setToken = (t) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token'));

export async function api(path, { method = 'GET', body, raw = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = body instanceof FormData;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}/api${path}`, { method, headers, body: isForm ? body : body && JSON.stringify(body) });
  if (raw && res.ok) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Downloads a file from an authenticated endpoint.
export async function download(path, filename) {
  const res = await api(path, { raw: true });
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

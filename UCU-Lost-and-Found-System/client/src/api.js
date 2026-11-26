const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function request(path, options = {}) {
  const token = localStorage.getItem('ucu_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'The request could not be completed.');
  return data;
}

export async function uploadPhoto(file) {
  const token = localStorage.getItem('ucu_token');
  const body = new FormData();
  body.append('photo', file);
  const response = await fetch(`${API}/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Image upload failed.');
  return data;
}

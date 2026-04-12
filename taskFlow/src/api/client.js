const BASE_URL = 'http://localhost:4000';
const TOKEN_KEY = 'taskflow_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 204 No Content has no body
  let data = null;
  if (response.status !== 204) {
    data = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const err = new Error(data?.error ?? 'Request failed');
    err.status = response.status;
    err.fields = data?.fields ?? null;
    throw err;
  }

  return data;
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) =>
    request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: (endpoint, body) =>
    request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

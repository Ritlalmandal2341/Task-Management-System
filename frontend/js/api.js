// API utility — handles all HTTP requests to the backend
const API = {
  BASE_URL: '/api',

  getToken() {
    return localStorage.getItem('taskflow_token');
  },

  setToken(token) {
    localStorage.setItem('taskflow_token', token);
  },

  removeToken() {
    localStorage.removeItem('taskflow_token');
  },

  getUser() {
    const u = localStorage.getItem('taskflow_user');
    return u ? JSON.parse(u) : null;
  },

  setUser(user) {
    localStorage.setItem('taskflow_user', JSON.stringify(user));
  },

  removeUser() {
    localStorage.removeItem('taskflow_user');
  },

  async request(endpoint, options = {}) {
    const url = `${this.BASE_URL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      return data;
    } catch (err) {
      throw err;
    }
  },

  // Auth
  register(name, email, password) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
  },
  login(email, password) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  getMe() {
    return this.request('/auth/me');
  },

  // Tasks
  getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tasks${query ? '?' + query : ''}`);
  },
  createTask(task) {
    return this.request('/tasks', { method: 'POST', body: JSON.stringify(task) });
  },
  updateTask(id, data) {
    return this.request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteTask(id) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  },
  reorderTasks(tasks) {
    return this.request('/tasks/reorder/batch', { method: 'PUT', body: JSON.stringify({ tasks }) });
  },
  getStats() {
    return this.request('/tasks/stats/summary');
  }
};

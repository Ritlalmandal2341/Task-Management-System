// Auth module — handles login/register UI logic
const Auth = {
  init() {
    console.log('🔐 Auth module initializing...');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginPassInput = document.getElementById('login-password');
    const registerPassInput = document.getElementById('register-password');

    if (loginBtn) loginBtn.addEventListener('click', () => this.handleLogin());
    if (registerBtn) registerBtn.addEventListener('click', () => this.handleRegister());
    if (showRegisterLink) showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); this.showForm('register'); });
    if (showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); this.showForm('login'); });

    // Enter key support
    if (loginPassInput) loginPassInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.handleLogin(); });
    if (registerPassInput) registerPassInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.handleRegister(); });
    
    console.log('✅ Auth module initialized');
  },

  showForm(type) {
    document.getElementById('login-form').classList.toggle('active', type === 'login');
    document.getElementById('register-form').classList.toggle('active', type === 'register');
    this.clearErrors();
  },

  clearErrors() {
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('register-error').classList.add('hidden');
  },

  showError(formType, message) {
    const el = document.getElementById(`${formType}-error`);
    el.textContent = message;
    el.classList.remove('hidden');
  },

  setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    if (loading) {
      text.classList.add('hidden');
      loader.classList.remove('hidden');
      btn.disabled = true;
    } else {
      text.classList.remove('hidden');
      loader.classList.add('hidden');
      btn.disabled = false;
    }
  },

  async handleLogin() {
    this.clearErrors();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      this.showError('login', 'Please fill in all fields');
      return;
    }

    this.setLoading('login-btn', true);
    try {
      const data = await API.login(email, password);
      API.setToken(data.token);
      API.setUser(data.user);
      App.showApp();
    } catch (err) {
      this.showError('login', err.message);
    } finally {
      this.setLoading('login-btn', false);
    }
  },

  async handleRegister() {
    this.clearErrors();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
      this.showError('register', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      this.showError('register', 'Password must be at least 6 characters');
      return;
    }

    this.setLoading('register-btn', true);
    try {
      const data = await API.register(name, email, password);
      API.setToken(data.token);
      API.setUser(data.user);
      App.showApp();
    } catch (err) {
      this.showError('register', err.message);
    } finally {
      this.setLoading('register-btn', false);
    }
  },

  logout() {
    API.removeToken();
    API.removeUser();
    App.showAuth();
  }
};

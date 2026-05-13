// App module — main controller
const App = {
  currentView: 'board',

  init() {
    Auth.init();
    Tasks.init();
    DragDrop.init();
    Socket.init();

    // Check if user is logged in
    const token = API.getToken();
    if (token) {
      this.showApp();
    } else {
      this.showAuth();
    }

    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());

    // View switching
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        this.switchView(view);
        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('open');
      });
    });

    // Set greeting
    this.setGreeting();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Tasks.closeModal();
        Tasks.closeDeleteModal();
      }
      if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        Tasks.openModal();
      }
    });
  },

  showAuth() {
    document.getElementById('auth-container')?.classList.remove('hidden');
    document.getElementById('app-container')?.classList.add('hidden');
  },

  async showApp() {
    document.getElementById('auth-container')?.classList.add('hidden');
    document.getElementById('app-container')?.classList.remove('hidden');

    // Load user info
    const user = API.getUser();
    if (user) {
      const nameEl = document.getElementById('user-name');
      const emailEl = document.getElementById('user-email');
      const avatarEl = document.getElementById('user-avatar');
      if (nameEl) nameEl.textContent = user.name;
      if (emailEl) emailEl.textContent = user.email;
      if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
      Socket.joinRoom(user.id);
    }

    // Load tasks
    await Tasks.loadTasks();
  },

  switchView(view) {
    this.currentView = view;
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.sidebar-link[data-view="${view}"]`).classList.add('active');

    const board = document.getElementById('board-view');
    const list = document.getElementById('list-view');

    if (Tasks.allTasks.length > 0) {
      board.classList.toggle('active', view === 'board');
      list.classList.toggle('active', view === 'list');
    }

    const title = document.querySelector('.page-title');
    title.textContent = view === 'board' ? 'Task Board' : 'Task List';
  },

  setGreeting() {
    const hour = new Date().getHours();
    let greeting;
    if (hour < 12) greeting = 'Good morning!';
    else if (hour < 17) greeting = 'Good afternoon!';
    else greeting = 'Good evening!';
    document.getElementById('greeting').textContent = `${greeting} Here's your task overview.`;
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ'
    };
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Boot the app
document.addEventListener('DOMContentLoaded', () => App.init());

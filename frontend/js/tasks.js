// Tasks module — handles CRUD, rendering, and filtering
const Tasks = {
  allTasks: [],
  editingTaskId: null,
  deleteTaskId: null,

  init() {
    // Add task buttons
    document.getElementById('add-task-btn')?.addEventListener('click', () => this.openModal());
    document.getElementById('empty-add-btn')?.addEventListener('click', () => this.openModal());
    document.getElementById('mobile-add-btn')?.addEventListener('click', () => this.openModal());

    // Column add buttons
    document.querySelectorAll('.column-add-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openModal(btn.dataset.status));
    });

    // Modal events
    document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-save')?.addEventListener('click', () => this.saveTask());

    // Delete modal
    document.getElementById('confirm-delete-btn')?.addEventListener('click', () => this.confirmDelete());
    document.querySelectorAll('.delete-modal-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeDeleteModal());
    });

    // Close modals on overlay click
    const taskModal = document.getElementById('task-modal');
    const deleteModal = document.getElementById('delete-modal');

    if (taskModal) taskModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });
    if (deleteModal) deleteModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeDeleteModal();
    });

    // Search & filter
    const searchInput = document.getElementById('search-input');
    const priorityFilter = document.getElementById('filter-priority');

    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => this.loadTasks(), 300);
      });
    }
    
    if (priorityFilter) {
      priorityFilter.addEventListener('change', () => this.loadTasks());
    }
  },

  async loadTasks() {
    const search = document.getElementById('search-input').value.trim();
    const priority = document.getElementById('filter-priority').value;

    const params = {};
    if (search) params.search = search;
    if (priority !== 'all') params.priority = priority;

    try {
      const data = await API.getTasks(params);
      this.allTasks = data.tasks;
      this.renderBoard();
      this.renderList();
      this.updateColumnCounts();
      this.updateStats();
      this.toggleEmptyState();
    } catch (err) {
      App.showToast('Failed to load tasks', 'error');
    }
  },

  renderBoard() {
    const columns = { todo: [], 'in-progress': [], done: [] };
    this.allTasks.forEach(t => {
      if (columns[t.status]) columns[t.status].push(t);
    });

    Object.keys(columns).forEach(status => {
      const colId = status === 'in-progress' ? 'column-progress' : `column-${status}`;
      const col = document.getElementById(colId);
      col.innerHTML = '';
      columns[status]
        .sort((a, b) => a.order - b.order)
        .forEach(task => {
          col.appendChild(this.createTaskCard(task));
        });
    });
  },

  renderList() {
    const body = document.getElementById('list-body');
    body.innerHTML = '';
    this.allTasks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach(task => {
        body.appendChild(this.createListRow(task));
      });
  },

  createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.id = task._id;
    card.dataset.status = task.status;

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    const dueStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const tagsHtml = (task.tags || []).map(t => `<span class="task-tag">${t}</span>`).join('');

    card.innerHTML = `
      <div class="task-card-header">
        <span class="task-card-title">${this.escapeHtml(task.title)}</span>
        <div class="task-card-actions">
          <button class="task-card-btn edit-btn" title="Edit" data-id="${task._id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="task-card-btn delete-btn" title="Delete" data-id="${task._id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
      ${task.description ? `<p class="task-card-desc">${this.escapeHtml(task.description)}</p>` : ''}
      <div class="task-card-footer">
        <div class="task-card-tags">${tagsHtml}</div>
        <div class="task-card-meta">
          <span class="priority-badge priority-${task.priority}">${task.priority}</span>
          ${dueStr ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">📅 ${dueStr}</span>` : ''}
        </div>
      </div>
    `;

    // Event listeners
    card.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openModal(null, task);
    });
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openDeleteModal(task._id);
    });

    DragDrop.makeDraggable(card);
    return card;
  },

  createListRow(task) {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.dataset.id = task._id;

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    const dueStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
    const statusLabel = task.status === 'in-progress' ? 'In Progress' : task.status === 'todo' ? 'To Do' : 'Done';

    row.innerHTML = `
      <div><div class="list-row-title">${this.escapeHtml(task.title)}</div>${task.description ? `<div class="list-row-desc">${this.escapeHtml(task.description)}</div>` : ''}</div>
      <div><span class="priority-badge priority-${task.priority}">${task.priority}</span></div>
      <div><span class="status-badge status-${task.status}">${statusLabel}</span></div>
      <div class="${isOverdue ? 'overdue' : ''}">${dueStr}</div>
      <div class="list-row-actions">
        <button class="task-card-btn edit-btn" data-id="${task._id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="task-card-btn delete-btn" data-id="${task._id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
      </div>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => this.openModal(null, task));
    row.querySelector('.delete-btn').addEventListener('click', () => this.openDeleteModal(task._id));
    return row;
  },

  // Modal operations
  openModal(defaultStatus, task) {
    this.editingTaskId = task ? task._id : null;
    const modal = document.getElementById('task-modal');
    document.getElementById('modal-title').textContent = task ? 'Edit Task' : 'New Task';
    document.getElementById('modal-save').querySelector('.btn-text').textContent = task ? 'Save Changes' : 'Create Task';

    document.getElementById('task-title').value = task ? task.title : '';
    document.getElementById('task-desc').value = task ? (task.description || '') : '';
    document.getElementById('task-status').value = task ? task.status : (defaultStatus || 'todo');
    document.getElementById('task-priority').value = task ? task.priority : 'medium';
    document.getElementById('task-due').value = task && task.dueDate ? task.dueDate.split('T')[0] : '';
    document.getElementById('task-tags').value = task && task.tags ? task.tags.join(', ') : '';

    modal.classList.remove('hidden');
    document.getElementById('task-title').focus();
  },

  closeModal() {
    document.getElementById('task-modal').classList.add('hidden');
    this.editingTaskId = null;
  },

  async saveTask() {
    const title = document.getElementById('task-title').value.trim();
    if (!title) { App.showToast('Title is required', 'error'); return; }

    const taskData = {
      title,
      description: document.getElementById('task-desc').value.trim(),
      status: document.getElementById('task-status').value,
      priority: document.getElementById('task-priority').value,
      dueDate: document.getElementById('task-due').value || null,
      tags: document.getElementById('task-tags').value.split(',').map(t => t.trim()).filter(Boolean)
    };

    const btn = document.getElementById('modal-save');
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    text.classList.add('hidden');
    loader.classList.remove('hidden');
    btn.disabled = true;

    try {
      if (this.editingTaskId) {
        await API.updateTask(this.editingTaskId, taskData);
        App.showToast('Task updated', 'success');
      } else {
        await API.createTask(taskData);
        App.showToast('Task created', 'success');
      }
      this.closeModal();
      await this.loadTasks();
    } catch (err) {
      App.showToast(err.message, 'error');
    } finally {
      text.classList.remove('hidden');
      loader.classList.add('hidden');
      btn.disabled = false;
    }
  },

  openDeleteModal(taskId) {
    this.deleteTaskId = taskId;
    document.getElementById('delete-modal').classList.remove('hidden');
  },

  closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
    this.deleteTaskId = null;
  },

  async confirmDelete() {
    if (!this.deleteTaskId) return;
    try {
      await API.deleteTask(this.deleteTaskId);
      this.closeDeleteModal();
      App.showToast('Task deleted', 'success');
      await this.loadTasks();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  // DOM helpers for socket events
  addTaskToDOM(task) {
    if (!this.allTasks.find(t => t._id === task._id)) {
      this.allTasks.push(task);
      this.renderBoard();
      this.renderList();
      this.updateColumnCounts();
      this.toggleEmptyState();
    }
  },

  updateTaskInDOM(task) {
    const idx = this.allTasks.findIndex(t => t._id === task._id);
    if (idx !== -1) this.allTasks[idx] = task;
    this.renderBoard();
    this.renderList();
    this.updateColumnCounts();
  },

  removeTaskFromDOM(id) {
    this.allTasks = this.allTasks.filter(t => t._id !== id);
    this.renderBoard();
    this.renderList();
    this.updateColumnCounts();
    this.toggleEmptyState();
  },

  updateColumnCounts() {
    const counts = { todo: 0, 'in-progress': 0, done: 0 };
    this.allTasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
    document.getElementById('count-todo').textContent = counts.todo;
    document.getElementById('count-progress').textContent = counts['in-progress'];
    document.getElementById('count-done').textContent = counts.done;
  },

  async updateStats() {
    try {
      const data = await API.getStats();
      const s = data.stats;
      document.getElementById('stat-total').textContent = s.total;
      document.getElementById('stat-todo').textContent = s.todo;
      document.getElementById('stat-progress').textContent = s['in-progress'];
      document.getElementById('stat-done').textContent = s.done;
      document.getElementById('stat-overdue').textContent = s.overdue;
    } catch (e) { /* silent */ }
  },

  toggleEmptyState() {
    const empty = document.getElementById('empty-state');
    const board = document.getElementById('board-view');
    const list = document.getElementById('list-view');
    if (this.allTasks.length === 0) {
      empty.classList.remove('hidden');
      board.classList.remove('active');
      list.classList.remove('active');
    } else {
      empty.classList.add('hidden');
      // Restore current view
      const currentView = document.querySelector('.sidebar-link.active')?.dataset.view || 'board';
      board.classList.toggle('active', currentView === 'board');
      list.classList.toggle('active', currentView === 'list');
    }
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

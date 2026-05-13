// Drag & Drop module for Kanban board
const DragDrop = {
  draggedCard: null,
  placeholder: null,

  init() {
    this.placeholder = document.createElement('div');
    this.placeholder.className = 'drag-placeholder';

    // Attach listeners to all column drop zones
    document.querySelectorAll('.column-tasks').forEach(col => {
      col.addEventListener('dragover', (e) => this.onDragOver(e));
      col.addEventListener('dragenter', (e) => this.onDragEnter(e));
      col.addEventListener('dragleave', (e) => this.onDragLeave(e));
      col.addEventListener('drop', (e) => this.onDrop(e));
    });
  },

  makeDraggable(card) {
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', (e) => this.onDragStart(e));
    card.addEventListener('dragend', (e) => this.onDragEnd(e));
  },

  onDragStart(e) {
    this.draggedCard = e.target.closest('.task-card');
    if (!this.draggedCard) return;
    this.draggedCard.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.draggedCard.dataset.id);
  },

  onDragEnd(e) {
    if (this.draggedCard) this.draggedCard.classList.remove('dragging');
    this.draggedCard = null;
    if (this.placeholder.parentNode) this.placeholder.remove();
    document.querySelectorAll('.column-tasks').forEach(c => c.classList.remove('drag-over'));
  },

  onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const col = e.target.closest('.column-tasks');
    if (!col) return;

    const afterEl = this.getDragAfterElement(col, e.clientY);
    if (afterEl) {
      col.insertBefore(this.placeholder, afterEl);
    } else {
      col.appendChild(this.placeholder);
    }
  },

  onDragEnter(e) {
    e.preventDefault();
    const col = e.target.closest('.column-tasks');
    if (col) col.classList.add('drag-over');
  },

  onDragLeave(e) {
    const col = e.target.closest('.column-tasks');
    if (col && !col.contains(e.relatedTarget)) {
      col.classList.remove('drag-over');
    }
  },

  async onDrop(e) {
    e.preventDefault();
    const col = e.target.closest('.column-tasks');
    if (!col || !this.draggedCard) return;

    col.classList.remove('drag-over');
    if (this.placeholder.parentNode) {
      col.insertBefore(this.draggedCard, this.placeholder);
      this.placeholder.remove();
    } else {
      col.appendChild(this.draggedCard);
    }

    const newStatus = col.dataset.status;
    const taskId = this.draggedCard.dataset.id;

    // Build reorder payload
    const reorderData = [];
    col.querySelectorAll('.task-card').forEach((card, index) => {
      reorderData.push({ id: card.dataset.id, status: newStatus, order: index });
    });

    try {
      await API.reorderTasks(reorderData);
      // Update the local task's status attribute
      this.draggedCard.dataset.status = newStatus;
      Tasks.updateStats();
      Tasks.updateColumnCounts();
      App.showToast('Task moved', 'success');
    } catch (err) {
      App.showToast('Failed to reorder', 'error');
      Tasks.loadTasks(); // Reload to fix
    }
  },

  getDragAfterElement(col, y) {
    const cards = [...col.querySelectorAll('.task-card:not(.dragging)')];
    return cards.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
};

// Socket module — handles real-time updates via Socket.IO
const Socket = {
  socket: null,

  init() {
    try {
      this.socket = io();
      this.socket.on('connect', () => {
        console.log('⚡ Socket connected');
        const user = API.getUser();
        if (user) this.socket.emit('join', user.id);
      });

      this.socket.on('task:created', (task) => {
        Tasks.addTaskToDOM(task);
        Tasks.updateStats();
      });

      this.socket.on('task:updated', (task) => {
        Tasks.updateTaskInDOM(task);
        Tasks.updateStats();
      });

      this.socket.on('task:deleted', ({ id }) => {
        Tasks.removeTaskFromDOM(id);
        Tasks.updateStats();
      });

      this.socket.on('tasks:reordered', () => {
        Tasks.loadTasks();
      });
    } catch (e) {
      console.log('Socket.IO not available — running without real-time updates');
    }
  },

  joinRoom(userId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join', userId);
    }
  }
};

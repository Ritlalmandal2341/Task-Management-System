const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Serve frontend for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  // Join user's personal room for targeted events
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log(`💤 Socket disconnected: ${socket.id}`);
  });
});

// Connect to DB and start server
// For Vercel, we need to export the app and handle the DB connection in a way that works with serverless functions
let isConnected = false;
const connectToDatabase = async () => {
  if (isConnected) return;
  await connectDB();
  isConnected = true;
};

// Main handler for Vercel
module.exports = async (req, res) => {
  await connectToDatabase();
  return app(req, res);
};

// Local development server
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  connectToDatabase().then(() => {
    server.listen(PORT, () => {
      console.log(`\n🚀 Local Server running on http://localhost:${PORT}`);
    });
  });
}

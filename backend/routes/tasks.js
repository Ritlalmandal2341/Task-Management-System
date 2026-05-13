const express = require('express');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/tasks/stats/summary
// @desc    Get task statistics
// @access  Private
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Task.countDocuments({ user: req.user._id });
    const overdue = await Task.countDocuments({
      user: req.user._id,
      dueDate: { $lt: new Date() },
      status: { $ne: 'done' }
    });

    const summary = {
      total,
      todo: 0,
      'in-progress': 0,
      done: 0,
      overdue
    };

    stats.forEach(s => {
      summary[s._id] = s.count;
    });

    res.json({ success: true, stats: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tasks/reorder/batch
// @desc    Reorder tasks (for drag & drop)
// @access  Private
router.put('/reorder/batch', async (req, res) => {
  try {
    const { tasks } = req.body; // [{ id, status, order }]

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ success: false, message: 'Tasks array required' });
    }

    const bulkOps = tasks.map(t => ({
      updateOne: {
        filter: { _id: t.id, user: req.user._id },
        update: { status: t.status, order: t.order }
      }
    }));

    await Task.bulkWrite(bulkOps);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('tasks:reordered', tasks);
    }

    res.json({ success: true, message: 'Tasks reordered' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks
// @desc    Get all tasks for the authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { status, priority, search, sort } = req.query;

    const query = { user: req.user._id };

    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let sortObj = { order: 1, createdAt: -1 };
    if (sort === 'dueDate') sortObj = { dueDate: 1 };
    if (sort === 'priority') sortObj = { priority: 1 };
    if (sort === 'newest') sortObj = { createdAt: -1 };

    const tasks = await Task.find(query).sort(sortObj);

    res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, tags } = req.body;

    // Get the highest order number for the status column
    const lastTask = await Task.findOne({
      user: req.user._id,
      status: status || 'todo'
    }).sort({ order: -1 });

    const order = lastTask ? lastTask.order + 1 : 0;

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      tags,
      order,
      user: req.user._id
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('task:created', task);
    }

    res.status(201).json({ success: true, task });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Ensure user owns the task
    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('task:updated', task);
    }

    res.json({ success: true, task });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Ensure user owns the task
    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Task.findByIdAndDelete(req.params.id);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('task:deleted', { id: req.params.id });
    }

    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

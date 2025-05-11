const express = require('express');
const path = require('path');
const { kv } = require('@vercel/kv');
const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Root route serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await kv.get('tasks') || [];
    res.json(tasks);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Create a new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, duration, tags } = req.body;
    
    if (!title || !duration) {
      return res.status(400).json({ error: 'Title and duration are required' });
    }
    
    const id = Date.now().toString();
    const taskTags = Array.isArray(tags) && tags.length > 0 ? tags : ['general'];
    const newTask = { id, title, duration, tags: taskTags };
    
    // Get current tasks and add new one
    const tasks = await kv.get('tasks') || [];
    tasks.push(newTask);
    
    // Save updated tasks
    await kv.set('tasks', tasks);
    
    res.status(201).json(newTask);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete a task
app.delete('/api/tasks', async (req, res) => {
  try {
    const taskId = req.query.id;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    // Get current tasks and filter out the deleted one
    const tasks = await kv.get('tasks') || [];
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    
    // Save updated tasks
    await kv.set('tasks', updatedTasks);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Complete a task
app.post('/api/tasks/complete', async (req, res) => {
  try {
    const { taskId } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    // Get current stats and increment completed tasks
    const stats = await kv.get('stats') || { completedTasks: 0 };
    stats.completedTasks += 1;
    
    // Save updated stats
    await kv.set('stats', stats);
    
    // Remove the task from tasks list
    const tasks = await kv.get('tasks') || [];
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    await kv.set('tasks', updatedTasks);
    
    res.json({ completedTasks: stats.completedTasks });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get user stats
app.get('/api/tasks/stats', async (req, res) => {
  try {
    const stats = await kv.get('stats') || { completedTasks: 0 };
    res.json(stats);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Bag of Tasks app is running on http://localhost:${PORT}`);
});
// api/tasks.js
import { kv } from '@vercel/kv';

// Verify KV configuration
const verifyKvConfig = () => {
  const requiredEnvVars = ['KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
};

export default async function handler(req, res) {
  try {
    // Verify KV configuration first
    if (!verifyKvConfig()) {
      return res.status(500).json({ error: 'KV store is not properly configured' });
    }
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Parse JSON body for non-GET requests
    let body = {};
    if (req.method !== 'GET' && req.body) {
      if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else {
        body = req.body;
      }
    }
    
    // GET /api/tasks - Get all tasks
    if (req.method === 'GET' && !req.url.includes('/stats')) {
      const tasks = await kv.get('tasks') || [];
      return res.status(200).json(tasks);
    }
    
    // POST /api/tasks - Create a new task
    if (req.method === 'POST' && !req.url.includes('/complete')) {
      const { title, duration, tags } = body;
      
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
      
      return res.status(201).json(newTask);
    }
    
    // DELETE /api/tasks - Delete a task
    if (req.method === 'DELETE') {
      const taskId = req.query.id;
      
      if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
      // Get current tasks and filter out the deleted one
      const tasks = await kv.get('tasks') || [];
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      
      // Save updated tasks
      await kv.set('tasks', updatedTasks);
      
      return res.status(200).json({ message: 'Task deleted successfully' });
    }
    
    // POST /api/tasks/complete - Complete a task
    if (req.method === 'POST' && req.url.includes('/complete')) {
      const { taskId } = body;
      
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
      
      return res.status(200).json({ completedTasks: stats.completedTasks });
    }
    
    // GET /api/tasks/stats - Get user stats
    if (req.method === 'GET' && req.url.includes('/stats')) {
      const stats = await kv.get('stats') || { completedTasks: 0 };
      return res.status(200).json(stats);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
// api/tasks.js
import { kv } from '@vercel/kv';

// Helper function to verify configuration
const verifyConfig = () => {
  if (!process.env.KV2_KV_REST_API_URL || !process.env.KV2_KV_REST_API_TOKEN) {
    throw new Error('KV store is not properly configured');
  }
  return true;
};

// Initialize with sample data if empty
const initializeData = async () => {
  const existingTasks = await kv.get('tasks');
  if (!existingTasks || existingTasks.length === 0) {
    await kv.set('tasks', [
      {
        id: Date.now().toString(),
        title: 'Sample Task',
        duration: 25,
        tags: ['quick-win']
      }
    ]);
  }

  const existingStats = await kv.get('stats');
  if (!existingStats) {
    await kv.set('stats', { completedTasks: 0 });
  }
};

export default async function handler(req, res) {
  try {
    // Verify configuration
    verifyConfig();
    
    // Initialize data if needed
    await initializeData();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Parse request body
    const body = req.method !== 'GET' 
      ? typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      : {};

    // Route handling
    if (req.method === 'GET' && !req.url.includes('/stats')) {
      const tasks = await kv.get('tasks') || [];
      return res.status(200).json(tasks);
    }

    if (req.method === 'POST' && !req.url.includes('/complete')) {
      const { title, duration, tags } = body;
      if (!title || !duration) {
        return res.status(400).json({ error: 'Title and duration are required' });
      }
      
      const id = Date.now().toString();
      const taskTags = Array.isArray(tags) && tags.length > 0 ? tags : ['general'];
      const newTask = { id, title, duration, tags: taskTags };
      
      const tasks = await kv.get('tasks') || [];
      tasks.push(newTask);
      await kv.set('tasks', tasks);
      
      return res.status(201).json(newTask);
    }

    if (req.method === 'DELETE') {
      const taskId = req.query.id;
      if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
      const tasks = await kv.get('tasks') || [];
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      await kv.set('tasks', updatedTasks);
      
      return res.status(200).json({ message: 'Task deleted successfully' });
    }

    if (req.method === 'POST' && req.url.includes('/complete')) {
      const { taskId } = body;
      if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
      const stats = await kv.get('stats') || { completedTasks: 0 };
      stats.completedTasks += 1;
      await kv.set('stats', stats);
      
      const tasks = await kv.get('tasks') || [];
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      await kv.set('tasks', updatedTasks);
      
      return res.status(200).json({ completedTasks: stats.completedTasks });
    }

    if (req.method === 'GET' && req.url.includes('/stats')) {
      const stats = await kv.get('stats') || { completedTasks: 0 };
      return res.status(200).json(stats);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
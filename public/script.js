// DOM Elements
const taskPool = document.getElementById('task-pool');
const addTaskBtn = document.getElementById('add-task');
const addTaskModal = document.getElementById('add-task-modal');
const closeModal = document.querySelector('.close');
const taskForm = document.getElementById('task-form');
const randomTaskBtn = document.getElementById('random-task');
const moodSelect = document.getElementById('mood-select');
const tagFilters = document.querySelectorAll('.tag-filter');
const timerDisplay = document.getElementById('timer');
const timerTaskTitle = document.getElementById('timer-task-title');
const miniTimer = document.getElementById('mini-timer');
const pauseTimerBtn = document.getElementById('pause-timer');
const resetTimerBtn = document.getElementById('reset-timer');
const progressFill = document.querySelector('.progress-fill');
const successModal = document.getElementById('success-modal');
const closeSuccessBtn = document.getElementById('close-success');
const successSound = document.getElementById('success-sound');
const confettiCanvas = document.getElementById('confetti-canvas');
const loadingIndicator = document.getElementById('loading-indicator');

// Constants
// Change this URL for production/development
const API_BASE_URL = 'https://your-backend-vercel-url.vercel.app/api/tasks';
// For production, use:
// const API_BASE_URL = 'https://your-backend-vercel-url.vercel.app/api/tasks';

const LOADING_DELAY = 300; // ms to show loading indicator
const REQUEST_TIMEOUT = 5000; // 5 seconds timeout for API calls

// State
let tasks = [];
let timer;
let timerDuration = 25 * 60; // 25 minutes in seconds
let currentTime = timerDuration;
let isTimerRunning = false;
let currentTaskId = null;
let completedTasks = 0;
let pendingRequests = 0;
const quotes = [
    "One tomato at a time 🍅",
    "Small steps lead to big results",
    "You've got this!",
    "Progress, not perfection",
    "The secret of getting ahead is getting started"
];

// Initialize the app
async function init() {
    try {
        showLoading(true);
        await Promise.all([
            fetchWithTimeout(fetchTasks(), REQUEST_TIMEOUT),
            fetchWithTimeout(fetchStats(), REQUEST_TIMEOUT)
        ]);
        renderTaskCloud();
        setRandomQuote();
        setupEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
        showError(`Failed to load app: ${error.message}`);
    } finally {
        setTimeout(() => showLoading(false), LOADING_DELAY);
    }
}

// Helper function for fetch with timeout
function fetchWithTimeout(promise, timeout) {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), timeout)
        )
    ]);
}

// Show/hide loading indicator
function showLoading(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
    taskPool.style.visibility = show ? 'hidden' : 'visible';
}

// Show error message
function showError(message, duration = 5000) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        errorElement.classList.add('fade-out');
        setTimeout(() => errorElement.remove(), 300);
    }, duration);
}

// Fetch tasks from API
async function fetchTasks() {
    try {
        pendingRequests++;
        const response = await fetch(API_BASE_URL);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to load tasks (${response.status})`);
        }
        
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid tasks data received');
        
        tasks = data;
        return data;
    } catch (error) {
        console.error('Fetch tasks error:', error);
        throw error;
    } finally {
        pendingRequests--;
    }
}

// Fetch stats from API
async function fetchStats() {
    try {
        pendingRequests++;
        const response = await fetch(`${API_BASE_URL}/stats`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to load stats (${response.status})`);
        }
        
        const stats = await response.json();
        completedTasks = stats.completed_tasks || 0;
        updateProgressBar();
        return stats;
    } catch (error) {
        console.error('Fetch stats error:', error);
        throw error;
    } finally {
        pendingRequests--;
    }
}

// Set up event listeners
function setupEventListeners() {
    addTaskBtn.addEventListener('click', () => addTaskModal.style.display = 'flex');
    closeModal.addEventListener('click', () => addTaskModal.style.display = 'none');
    closeSuccessBtn.addEventListener('click', () => successModal.style.display = 'none');
    
    window.addEventListener('click', (e) => {
        if (e.target === addTaskModal) addTaskModal.style.display = 'none';
        if (e.target === successModal) successModal.style.display = 'none';
    });
    
    taskForm.addEventListener('submit', handleAddTask);
    randomTaskBtn.addEventListener('click', pickRandomTask);
    moodSelect.addEventListener('change', filterTasksByMood);
    
    tagFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            document.querySelector('.tag-filter.active').classList.remove('active');
            filter.classList.add('active');
            filterTasksByTag(filter.dataset.tag);
        });
    });
    
    pauseTimerBtn.addEventListener('click', pauseTimer);
    resetTimerBtn.addEventListener('click', resetTimer);
}

// Render tasks as a tag cloud
function renderTaskCloud(filteredTasks = tasks) {
    taskPool.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        taskPool.innerHTML = `
            <div class="empty-state">
                <p>${tasks.length === 0 ? 'Your bag is empty!' : 'No matching tasks'}</p>
                <p>${tasks.length === 0 ? 'Add some tasks to get started.' : 'Try different filters.'}</p>
            </div>
        `;
        return;
    }
    
    const sizes = ['size-s', 'size-m', 'size-l', 'size-xl'];
    
    filteredTasks.forEach(task => {
        const tagItem = document.createElement('div');
        const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
        const primaryTag = task.tags && task.tags.length > 0 ? task.tags[0] : '';
        
        tagItem.className = `task-tag-item ${primaryTag} ${randomSize}`;
        tagItem.dataset.id = task.id;
        tagItem.dataset.tags = task.tags ? task.tags.join(' ') : '';
        
        tagItem.innerHTML = `
            <span class="task-title">${task.title}</span>
            <span class="task-duration">${task.duration}m</span>
        `;
        
        tagItem.addEventListener('click', () => startTaskTimer(task.id));
        taskPool.appendChild(tagItem);
    });
    
    setTimeout(randomizePositions, 10);
}

// Randomize tag positions for cloud effect
function randomizePositions() {
    document.querySelectorAll('.task-tag-item').forEach(item => {
        const randomY = Math.floor(Math.random() * 20) - 10;
        item.style.transform = `translateY(${randomY}px)`;
    });
}

// Handle adding a new task
async function handleAddTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value.trim();
    const duration = parseInt(document.getElementById('task-duration').value) || 25;
    const tags = Array.from(document.querySelectorAll('input[name="tags"]:checked'))
        .map(checkbox => checkbox.value);
    
    if (!title) {
        showError('Task title is required');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetchWithTimeout(fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, duration, tags: tags.length ? tags : ['general'] })
        }), REQUEST_TIMEOUT);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to save task');
        }
        
        const newTask = await response.json();
        tasks.push(newTask);
        renderTaskCloud();
        
        addTaskModal.style.display = 'none';
        taskForm.reset();
    } catch (error) {
        console.error('Add task error:', error);
        showError(`Failed to add task: ${error.message}`);
    } finally {
        setTimeout(() => showLoading(false), LOADING_DELAY);
    }
}

// Pick a random task
function pickRandomTask() {
    const activeFilter = document.querySelector('.tag-filter.active').dataset.tag;
    const moodFilter = moodSelect.value;
    
    let filteredTasks = tasks.filter(task => {
        const taskTags = task.tags || [];
        return (activeFilter === 'all' || taskTags.includes(activeFilter)) &&
               (moodFilter === 'all' || taskTags.includes(moodFilter));
    });
    
    if (filteredTasks.length === 0) {
        showError("No tasks match your filters");
        return;
    }
    
    const randomTask = filteredTasks[Math.floor(Math.random() * filteredTasks.length)];
    const taskElement = document.querySelector(`.task-tag-item[data-id="${randomTask.id}"]`);
    
    if (taskElement) {
        taskElement.style.transform = 'translateY(-15px) scale(1.1)';
        taskElement.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Filter tasks by mood
function filterTasksByMood() {
    const mood = moodSelect.value;
    renderTaskCloud(mood === 'all' ? tasks : tasks.filter(task => {
        const taskTags = task.tags || [];
        return taskTags.includes(mood);
    }));
}

// Filter tasks by tag
function filterTasksByTag(tag) {
    renderTaskCloud(tag === 'all' ? tasks : tasks.filter(task => {
        const taskTags = task.tags || [];
        return taskTags.includes(tag);
    }));
}

// Timer functions
function startTaskTimer(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    timerDuration = task.duration * 60;
    currentTime = timerDuration;
    currentTaskId = taskId;
    timerTaskTitle.textContent = `Working on: ${task.title}`;
    miniTimer.style.display = 'flex';
    pauseTimerBtn.textContent = '⏸️';
    
    clearInterval(timer);
    isTimerRunning = true;
    timer = setInterval(updateTimer, 1000);
    updateTimerDisplay();
}

function updateTimer() {
    currentTime--;
    updateTimerDisplay();
    updateProgressBar();
    
    if (currentTime <= 0) {
        clearInterval(timer);
        isTimerRunning = false;
        completeTask(currentTaskId);
    }
}

function pauseTimer() {
    if (isTimerRunning) {
        clearInterval(timer);
        isTimerRunning = false;
        pauseTimerBtn.textContent = '▶️';
    } else {
        timer = setInterval(updateTimer, 1000);
        isTimerRunning = true;
        pauseTimerBtn.textContent = '⏸️';
    }
}

function resetTimer() {
    clearInterval(timer);
    miniTimer.style.display = 'none';
    currentTaskId = null;
}

function updateTimerDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateProgressBar() {
    const progressPercent = 100 - (currentTime / timerDuration * 100);
    progressFill.style.width = `${progressPercent}%`;
}

// Complete task
async function completeTask(taskId) {
    try {
        showLoading(true);
        
        const response = await fetchWithTimeout(fetch(`${API_BASE_URL}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId })
        }), REQUEST_TIMEOUT);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to complete task');
        }
        
        const result = await response.json();
               completedTasks = result.completed_tasks || completedTasks + 1;
        
        // Remove completed task from local state
        tasks = tasks.filter(task => task.id !== taskId);
        
        // Show success effects
        showSuccessEffects();
        updateProgressBar();
        renderTaskCloud();
    } catch (error) {
        console.error('Complete task error:', error);
        showError(`Failed to complete task: ${error.message}`);
    } finally {
        setTimeout(() => showLoading(false), LOADING_DELAY);
        resetTimer();
    }
}

// Show success effects
function showSuccessEffects() {
    // Play success sound
    successSound.currentTime = 0;
    successSound.play().catch(e => console.error('Audio play failed:', e));
    
    // Show confetti
    const confettiSettings = {
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
    };
    
    if (confettiCanvas) {
        const confettiCtx = confettiCanvas.getContext('2d');
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        
        // Using a simple confetti implementation
        // For a more robust solution, consider using a library like canvas-confetti
        const particles = [];
        for (let i = 0; i < confettiSettings.particleCount; i++) {
            particles.push({
                x: Math.random() * confettiCanvas.width,
                y: confettiCanvas.height * 0.6,
                size: Math.random() * 5 + 3,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                speed: Math.random() * 3 + 2,
                angle: Math.random() * Math.PI * 2,
                rotation: Math.random() * 0.2 - 0.1
            });
        }
        
        let animationId;
        const animateConfetti = () => {
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            
            let stillActive = false;
            particles.forEach(p => {
                p.x += Math.cos(p.angle) * p.speed;
                p.y += p.speed;
                p.angle += p.rotation;
                
                if (p.y < confettiCanvas.height) {
                    stillActive = true;
                    confettiCtx.fillStyle = p.color;
                    confettiCtx.beginPath();
                    confettiCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    confettiCtx.fill();
                }
            });
            
            if (stillActive) {
                animationId = requestAnimationFrame(animateConfetti);
            }
        };
        
        animateConfetti();
        setTimeout(() => cancelAnimationFrame(animationId), 3000);
    }
    
    // Show success modal
    successModal.style.display = 'flex';
}

// Set random motivational quote
function setRandomQuote() {
    const quoteElement = document.getElementById('motivational-quote');
    if (quoteElement && quotes.length > 0) {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        quoteElement.textContent = randomQuote;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
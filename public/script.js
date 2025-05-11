// public/script.js
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
const API_BASE_URL = '/api/tasks';
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
        completedTasks = stats.completedTasks || 0;
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
        const primaryTag = task.tags.length > 0 ? task.tags[0] : '';
        
        tagItem.className = `task-tag-item ${primaryTag} ${randomSize}`;
        tagItem.dataset.id = task.id;
        tagItem.dataset.tags = task.tags.join(' ');
        
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
        }, REQUEST_TIMEOUT);
        
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
    
    let filteredTasks = tasks.filter(task => 
        (activeFilter === 'all' || task.tags.includes(activeFilter)) &&
        (moodFilter === 'all' || task.tags.includes(moodFilter))
    );
    
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
    renderTaskCloud(mood === 'all' ? tasks : tasks.filter(task => task.tags.includes(mood)));
}

// Filter tasks by tag
function filterTasksByTag(tag) {
    renderTaskCloud(tag === 'all' ? tasks : tasks.filter(task => task.tags.includes(tag)));
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
        completedTasks = result.completedTasks;
        tasks = tasks.filter(task => task.id !== taskId);
        
        renderTaskCloud();
        miniTimer.style.display = 'none';
        showSuccessMessage();
    } catch (error) {
        console.error('Complete task error:', error);
        showError(`Failed to complete task: ${error.message}`);
    } finally {
        setTimeout(() => showLoading(false), LOADING_DELAY);
    }
}

// Success message with confetti
function showSuccessMessage() {
    successModal.style.display = 'flex';
    successSound.play().catch(e => console.error('Audio playback failed:', e));
    
    // Confetti animation
    const confettiCtx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    
    const confetti = [];
    const colors = [
        { front: '#4285F4', back: '#3372C3' },
        { front: '#EA4335', back: '#C52E20' },
        { front: '#FBBC05', back: '#DA921A' },
        { front: '#34A853', back: '#298043' }
    ];
    
    for (let i = 0; i < 200; i++) {
        confetti.push({
            color: colors[Math.floor(Math.random() * colors.length)],
            dimensions: { x: Math.random() * 10 + 5, y: Math.random() * 10 + 5 },
            position: { x: Math.random() * confettiCanvas.width, y: -Math.random() * confettiCanvas.height },
            rotation: Math.random() * 2 * Math.PI,
            velocity: { x: Math.random() * 25 - 12.5, y: Math.random() * 10 + 5 }
        });
    }
    
    function render() {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        
        confetti.forEach((confetto, i) => {
            confetto.velocity.x -= confetto.velocity.x * 0.075;
            confetto.velocity.y = Math.min(confetto.velocity.y + 0.5, 5);
            confetto.position.x += confetto.velocity.x;
            confetto.position.y += confetto.velocity.y;
            confetto.rotation += 0.1;
            
            confettiCtx.save();
            confettiCtx.translate(confetto.position.x, confetto.position.y);
            confettiCtx.rotate(confetto.rotation);
            confettiCtx.fillStyle = Math.random() > 0.5 ? confetto.color.front : confetto.color.back;
            confettiCtx.fillRect(-confetto.dimensions.x/2, -confetto.dimensions.y/2, confetto.dimensions.x, confetto.dimensions.y);
            confettiCtx.restore();
            
            if (confetto.position.y >= confettiCanvas.height) {
                confetti.splice(i, 1);
            }
        });
        
        if (confetti.length) {
            requestAnimationFrame(render);
        } else {
            confettiCanvas.style.display = 'none';
        }
    }
    
    confettiCanvas.style.display = 'block';
    requestAnimationFrame(render);
}

// Set random quote
function setRandomQuote() {
    document.querySelector('.quote').textContent = 
        quotes[Math.floor(Math.random() * quotes.length)];
}

// Initialize the app
init();
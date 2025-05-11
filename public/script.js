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

// State
let tasks = [];
let timer;
let timerDuration = 25 * 60; // 25 minutes in seconds
let currentTime = timerDuration;
let isTimerRunning = false;
let isBreakTime = false;
let currentTaskId = null;
let completedTasks = 0;
const quotes = [
    "One tomato at a time 🍅",
    "Small steps lead to big results",
    "You've got this!",
    "Progress, not perfection",
    "The secret of getting ahead is getting started"
];

// Initialize the app
async function init() {
    showLoading(true);
    try {
        await Promise.all([fetchTasks(), fetchStats()]);
        renderTaskCloud();
        setRandomQuote();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to load tasks. Please try refreshing the page.');
    } finally {
        showLoading(false);
    }
}

// Show or hide loading indicator
function showLoading(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
    taskPool.style.visibility = show ? 'hidden' : 'visible';
}

// Show error message
function showError(message) {
    taskPool.innerHTML = `
        <div class="empty-state">
            <p>Error: ${message}</p>
        </div>
    `;
}

// Fetch tasks from API
async function fetchTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) throw new Error('Failed to fetch tasks');
        tasks = await response.json();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        throw error;
    }
}

// Fetch stats from API
async function fetchStats() {
    try {
        const response = await fetch('/api/tasks/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const stats = await response.json();
        completedTasks = stats.completedTasks;
        updateProgressBar();
    } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
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
                <p>No tasks match your filters</p>
                <p>Try adjusting your mood or tags.</p>
            </div>
        `;
        return;
    }
    
    // Create random sizes for tag cloud effect
    const sizes = ['size-s', 'size-m', 'size-l', 'size-xl'];
    
    filteredTasks.forEach(task => {
        const tagItem = document.createElement('div');
        const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
        
        // Determine primary tag for background color
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
    
    // Randomly position elements for a more cloud-like appearance
    setTimeout(() => randomizePositions(), 10);
}

// Randomize tag positions slightly for cloud effect
function randomizePositions() {
    const tagItems = document.querySelectorAll('.task-tag-item');
    tagItems.forEach(item => {
        const randomY = Math.floor(Math.random() * 20) - 10;
        item.style.transform = `translateY(${randomY}px)`;
    });
}

// Handle adding a new task
async function handleAddTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value;
    const duration = parseInt(document.getElementById('task-duration').value) || 25;
    const tags = Array.from(document.querySelectorAll('input[name="tags"]:checked'))
        .map(checkbox => checkbox.value);
    
    const newTask = {
        title,
        duration,
        tags: tags.length > 0 ? tags : ['general']
    };
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newTask)
        });
        
        if (!response.ok) throw new Error('Failed to save task');
        
        const savedTask = await response.json();
        tasks.push(savedTask);
        renderTaskCloud();
        
        addTaskModal.style.display = 'none';
        taskForm.reset();
    } catch (error) {
        console.error('Error saving task:', error);
        alert('Failed to save task. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Pick a random task and highlight it
function pickRandomTask() {
    if (tasks.length === 0) return;
    
    // Get currently filtered tasks
    const activeFilter = document.querySelector('.tag-filter.active').dataset.tag;
    const moodFilter = moodSelect.value;
    let filteredTasks = [...tasks];
    
    if (activeFilter !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.tags.includes(activeFilter));
    }
    
    if (moodFilter !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.tags.includes(moodFilter));
    }
    
    if (filteredTasks.length === 0) {
        alert("No tasks match your current filters. Try adjusting your mood or tags.");
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * filteredTasks.length);
    const randomTask = filteredTasks[randomIndex];
    
    // Highlight the random task
    const taskItems = document.querySelectorAll('.task-tag-item');
    taskItems.forEach(item => {
        item.style.boxShadow = '';
        item.style.transform = `translateY(${Math.floor(Math.random() * 20) - 10}px)`;
        
        if (item.dataset.id === randomTask.id) {
            item.style.transform = 'translateY(-15px) scale(1.1)';
            item.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

// Filter tasks by selected mood
function filterTasksByMood() {
    const mood = moodSelect.value;
    
    if (mood === 'all') {
        renderTaskCloud();
        return;
    }
    
    const filteredTasks = tasks.filter(task => task.tags.includes(mood));
    renderTaskCloud(filteredTasks);
}

// Filter tasks by selected tag
function filterTasksByTag(tag) {
    if (tag === 'all') {
        renderTaskCloud();
        return;
    }
    
    const filteredTasks = tasks.filter(task => task.tags.includes(tag));
    renderTaskCloud(filteredTasks);
}

// Start timer for a specific task
function startTaskTimer(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    timerDuration = task.duration * 60;
    currentTime = timerDuration;
    isBreakTime = false;
    currentTaskId = taskId;
    updateTimerDisplay();
    timerTaskTitle.textContent = `Working on: ${task.title}`;
    
    // Show the mini timer
    miniTimer.style.display = 'flex';
    
    // Reset and start timer
    clearInterval(timer);
    isTimerRunning = true;
    timer = setInterval(updateTimer, 1000);
    pauseTimerBtn.textContent = '⏸️';
    
    // Update progress bar initial state
    updateProgressBar();
}

// Update timer
// ... [existing code remains the same until line 371]

function updateTimer() {
    currentTime--;
    updateTimerDisplay();
    const progressPercent = 100 - (currentTime / timerDuration * 100);
    document.querySelector('.progress-fill').style.width = `${progressPercent}%`;
    
    if (currentTime <= 0) {
        clearInterval(timer);
        isTimerRunning = false;
        
        // Complete the task
        completeTask(currentTaskId);
    }
}

// Complete task function
async function completeTask(taskId) {
    try {
        const response = await fetch('/api/tasks/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ taskId })
        });
        
        if (!response.ok) throw new Error('Failed to complete task');
        
        const result = await response.json();
        completedTasks = result.completedTasks;
        
        // Remove completed task from local array
        tasks = tasks.filter(task => task.id !== taskId);
        
        // Show success message
        showSuccessMessage();
        
        // Update UI
        renderTaskCloud();
        miniTimer.style.display = 'none';
        
    } catch (error) {
        console.error('Error completing task:', error);
        alert('Failed to complete task. Please try again.');
    }
}

// Pause timer
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

// Reset timer
function resetTimer() {
    clearInterval(timer);
    miniTimer.style.display = 'none';
    currentTaskId = null;
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update progress bar
function updateProgressBar() {
    if (currentTime <= 0) return;
    const progressPercent = 100 - (currentTime / timerDuration * 100);
    progressFill.style.width = `${progressPercent}%`;
}

// Show success message
function showSuccessMessage() {
    successModal.style.display = 'flex';
    successSound.play();
    
    // Animate confetti
    const confettiCtx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiCanvas.style.display = 'block';
    
    const confetti = [];
    const confettiCount = 200;
    const gravity = 0.5;
    const terminalVelocity = 5;
    const drag = 0.075;
    const colors = [
        { front: '#4285F4', back: '#3372C3' }, // Blue
        { front: '#EA4335', back: '#C52E20' }, // Red
        { front: '#FBBC05', back: '#DA921A' }, // Yellow
        { front: '#34A853', back: '#298043' }  // Green
    ];
    
    for (let i = 0; i < confettiCount; i++) {
        confetti.push({
            color: colors[Math.floor(Math.random() * colors.length)],
            dimensions: {
                x: Math.random() * 10 + 5,
                y: Math.random() * 10 + 5
            },
            position: {
                x: Math.random() * confettiCanvas.width,
                y: -Math.random() * confettiCanvas.height
            },
            rotation: Math.random() * 2 * Math.PI,
            scale: {
                x: 1,
                y: 1
            },
            velocity: {
                x: Math.random() * 25 - 12.5,
                y: Math.random() * 10 + 5
            }
        });
    }
    
    function renderConfetti() {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        
        confetti.forEach((confetto, index) => {
            let width = confetto.dimensions.x * confetto.scale.x;
            let height = confetto.dimensions.y * confetto.scale.y;
            
            // Apply forces
            confetto.velocity.x -= confetto.velocity.x * drag;
            confetto.velocity.y = Math.min(confetto.velocity.y + gravity, terminalVelocity);
            confetto.velocity.x += Math.random() > 0.5 ? Math.random() : -Math.random();
            
            // Update position
            confetto.position.x += confetto.velocity.x;
            confetto.position.y += confetto.velocity.y;
            
            // Update rotation
            confetto.rotation += 0.1;
            
            // Render confetto
            confettiCtx.save();
            confettiCtx.translate(confetto.position.x, confetto.position.y);
            confettiCtx.rotate(confetto.rotation);
            
            const colorSide = Math.random() > 0.5 ? confetto.color.front : confetto.color.back;
            
            confettiCtx.fillStyle = colorSide;
            confettiCtx.fillRect(-width / 2, -height / 2, width, height);
            confettiCtx.restore();
            
            // Remove confetti when past reset point
            if (confetto.position.y >= confettiCanvas.height) {
                confetti.splice(index, 1);
            }
        });
        
        // Keep animating if there are confetti left
        if (confetti.length) {
            requestAnimationFrame(renderConfetti);
        } else {
            confettiCanvas.style.display = 'none';
        }
    }
    
    requestAnimationFrame(renderConfetti);
}

// Set a random quote
function setRandomQuote() {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    document.querySelector('.quote').textContent = quotes[randomIndex];
}

// Initialize the app
init();
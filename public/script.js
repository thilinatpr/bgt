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

// State
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let timer;
let timerDuration = 25 * 60; // 25 minutes in seconds
let currentTime = timerDuration;
let isTimerRunning = false;
let isBreakTime = false;
let currentTaskId = null;
let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || 0;
const quotes = [
    "One tomato at a time 🍅",
    "Small steps lead to big results",
    "You've got this!",
    "Progress, not perfection",
    "The secret of getting ahead is getting started"
];

// Initialize the app
function init() {
    renderTaskCloud();
    updateProgressBar();
    setRandomQuote();
    setupEventListeners();
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

// Format tag name for display
function formatTagName(tag) {
    return tag.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Handle adding a new task
function handleAddTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value;
    const duration = parseInt(document.getElementById('task-duration').value) || 25;
    const tags = Array.from(document.querySelectorAll('input[name="tags"]:checked'))
        .map(checkbox => checkbox.value);
    
    const newTask = {
        id: Date.now().toString(),
        title,
        duration,
        tags: tags.length > 0 ? tags : ['general']
    };
    
    tasks.push(newTask);
    saveTasks();
    renderTaskCloud();
    addTaskModal.style.display = 'none';
    taskForm.reset();
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
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
}

// Update timer
function updateTimer() {
    currentTime--;
    updateTimerDisplay();
    updateProgressBar();
    
    if (currentTime <= 0) {
        clearInterval(timer);
        isTimerRunning = false;
        
        if (!isBreakTime) {
            // Work session completed
            completeTask();
            isBreakTime = true;
            currentTime = 5 * 60; // 5 minute break
            timerTaskTitle.textContent = 'Time for a break!';
        } else {
            // Break completed
            isBreakTime = false;
            miniTimer.style.display = 'none';
            currentTaskId = null;
        }
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
    isTimerRunning = false;
    miniTimer.style.display = 'none';
    currentTaskId = null;
}

function updateTimerDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Handle task completion
function completeTask() {
    completedTasks++;
    localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
    
    // Remove the completed task
    if (currentTaskId) {
        tasks = tasks.filter(task => task.id !== currentTaskId);
        saveTasks();
        renderTaskCloud();
    }
    
    updateProgressBar();
    showSuccess();
}

function updateProgressBar() {
    const progressPercentage = (completedTasks % 8) * 12.5; // 8 tasks = 100%
    progressFill.style.width = `${progressPercentage}%`;
}

function showSuccess() {
    // Show confetti
    confettiCanvas.style.display = 'block';
    const confettiSettings = {
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
    };
    createConfetti(confettiSettings);
    
    // Play success sound
    if (successSound) {
        successSound.play().catch(e => console.log("Audio play failed:", e));
    }
    
    // Show success modal
    successModal.style.display = 'flex';
    
    // Hide confetti after animation
    setTimeout(() => {
        confettiCanvas.style.display = 'none';
    }, 3000);
}

// Confetti function
function createConfetti(settings) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    const ctx = confettiCanvas.getContext('2d');
    const particles = [];
    const { particleCount, spread, origin } = settings;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: origin.x * confettiCanvas.width,
            y: origin.y * confettiCanvas.height,
            size: Math.random() * 5 + 3,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            speedX: Math.random() * spread - (spread / 2),
            speedY: Math.random() * spread * -1,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }
    
    animate();
    
    function animate() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            
            ctx.restore();
            
            p.x += p.speedX;
            p.y += p.speedY;
            p.speedY += 0.1; // gravity
            p.rotation += p.rotationSpeed;
            
            // Remove particles that are off screen
            if (p.y > confettiCanvas.height || p.x < 0 || p.x > confettiCanvas.width) {
                particles.splice(i, 1);
                i--;
            }
        }
        
        if (particles.length > 0) {
            requestAnimationFrame(animate);
        }
    }
}

// Set a random motivational quote
function setRandomQuote() {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    document.querySelector('.quote').textContent = quotes[randomIndex];
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);
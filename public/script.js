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
const quoteElement = document.querySelector('.quote');

// Constants
const API_BASE_URL = 'https://bag-of-tasks-api.vercel.app/api/tasks'; // Update with your backend URL
const LOADING_DELAY = 300;
const REQUEST_TIMEOUT = 5000;

// State
let tasks = [];
let timer;
let timerDuration = 25 * 60;
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
    if (pendingRequests > 0) return;
    
    // Set canvas dimensions
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    
    try {
        showLoading(true);
        
        // Load from local storage first
        const localTasks = localStorage.getItem('tasks');
        const localCompleted = localStorage.getItem('completedTasks');
        
        if (localTasks) tasks = JSON.parse(localTasks);
        if (localCompleted) completedTasks = parseInt(localCompleted);
        
        // Then try to sync with API
        await fetchWithTimeout(fetchTasks(), REQUEST_TIMEOUT);
        try {
            await fetchWithTimeout(fetchStats(), REQUEST_TIMEOUT);
        } catch (error) {
            console.log('Using local stats:', error.message);
        }
        
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

// [Keep all other existing functions from previous script.js...]
// Add this new function for better error handling:

async function completeTask(taskId) {
    try {
        showLoading(true);
        let completedCount = completedTasks + 1;
        
        try {
            const response = await fetchWithTimeout(fetch(`${API_BASE_URL}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId })
            }), REQUEST_TIMEOUT);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to complete task');
            }
            
            const result = await response.json();
            completedCount = result.completedTasks || completedCount;
            
            // Update local state only after successful API call
            tasks = tasks.filter(task => task.id !== taskId);
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } catch (error) {
            console.error('API completion failed:', error);
            showError('Task completed locally - sync when online');
        }

        // Update completed count in any case
        completedTasks = completedCount;
        localStorage.setItem('completedTasks', completedTasks);
        
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
let EXERCISES = [];

// UI State
let currentSets = [];
let selectedExercise = null;
let currentWorkoutExercises = [];

// Unit Management
function getExerciseUnit(exerciseId) {
    const units = JSON.parse(localStorage.getItem('exercise_units') || '{}');
    return units[exerciseId] || 'kg';
}

function setExerciseUnit(exerciseId, unit) {
    const units = JSON.parse(localStorage.getItem('exercise_units') || '{}');
    units[exerciseId] = unit;
    localStorage.setItem('exercise_units', JSON.stringify(units));
}

// DOM Elements
const viewLibrary = document.getElementById('view-library');
const viewLogger = document.getElementById('view-logger');
const viewHistory = document.getElementById('view-history');
const libraryGrid = document.getElementById('library-grid');
const muscleFilter = document.getElementById('muscle-filter');
const searchInput = document.getElementById('search-input');
const selectExercise = document.getElementById('select-exercise');
const selectVariation = document.getElementById('select-variation');
const exerciseInfo = document.getElementById('exercise-info');
const setsContainer = document.getElementById('sets-container');
const historyList = document.getElementById('history-list');
const viewTitle = document.getElementById('view-title');

// Initialize
function init() {
    try {
        if (typeof EXERCISES_DATA === 'undefined') {
            throw new Error('EXERCISES_DATA not found. Make sure data/exercises.js is loaded before app.js.');
        }

        EXERCISES = EXERCISES_DATA;
        
        // Attach Event Listeners
        selectExercise.addEventListener('change', () => {
            selectVariation.value = ''; // Reset variation when exercise group changes
            currentSets = [];
            updateLoggerUI();
        });
        
        selectVariation.addEventListener('change', () => {
            currentSets = [];
            updateLoggerUI();
        });
        
        if (muscleFilter) {
            muscleFilter.addEventListener('change', filterLibrary);
        }
        if (searchInput) {
            searchInput.addEventListener('input', filterLibrary);
        }

        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.contains('dark-mode');
                const newIsDark = !isDark;
                
                document.body.classList.toggle('dark-mode', newIsDark);
                localStorage.setItem('dark_mode', newIsDark ? 'true' : 'false');
                
                // Update icon
                darkModeToggle.textContent = newIsDark ? '🌙' : '☀️';
            });

            // Set initial dark mode
            const savedDarkMode = localStorage.getItem('dark_mode');
            if (savedDarkMode === 'true') {
                document.body.classList.add('dark-mode');
                darkModeToggle.textContent = '🌙';
            } else if (savedDarkMode === 'false') {
                document.body.classList.remove('dark-mode');
                darkModeToggle.textContent = '☀️';
            }
        }

        populateMuscleFilter();
        renderLibrary(EXERCISES);
        populateExerciseDropdown();
        loadHistory();
        updateLoggerUI();
        showView('logger');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

function populateMuscleFilter() {
    const muscles = new Set();
    EXERCISES.forEach(ex => {
        ex.primary_muscles.forEach(m => muscles.add(m));
        ex.secondary_muscles.forEach(m => muscles.add(m));
    });

    const sortedMuscles = Array.from(muscles).sort();
    sortedMuscles.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        muscleFilter.appendChild(opt);
    });
}

function renderLibrary(exercises) {
    libraryGrid.innerHTML = '';
    exercises.forEach(ex => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="exercise-name">${ex.name}</div>
            <div class="exercise-desc">${ex.description}</div>
            <div class="badge">Primary: ${ex.primary_muscles.join(', ')}</div>
            <div style="font-size: 0.8rem; margin-top: 8px; color: var(--text-light);">Equipment: ${ex.equipment}</div>
        `;
        card.onclick = () => selectExerciseForLogging(ex.id);
        libraryGrid.appendChild(card);
    });
}

function filterLibrary() {
    const query = searchInput.value.toLowerCase();
    const muscle = muscleFilter.value;

    const filtered = EXERCISES.filter(ex => {
        const matchesSearch = ex.name.toLowerCase().includes(query) || ex.description.toLowerCase().includes(query);
        const matchesMuscle = muscle === 'all' || ex.primary_muscles.includes(muscle) || ex.secondary_muscles.includes(muscle);
        return matchesSearch && matchesMuscle;
    });
    renderLibrary(filtered);
}

function populateExerciseDropdown() {
    if (!EXERCISES || EXERCISES.length === 0) {
        console.error("EXERCISES array is empty.");
        return;
    }
    selectExercise.innerHTML = '<option value="">-- Select Exercise --</option>';
    const groups = {};
    EXERCISES.forEach(ex => {
        if (!groups[ex.group_id]) {
            groups[ex.group_id] = { name: ex.group_name, exercises: [] };
        }
        groups[ex.group_id].exercises.push(ex);
    });

    Object.keys(groups).forEach(groupId => {
        const group = groups[groupId];
        const opt = document.createElement('option');
        opt.value = groupId;
        opt.textContent = group.name;
        selectExercise.appendChild(opt);
    });
}

function selectExerciseForLogging(id) {
    const ex = EXERCISES.find(e => e.id === id);
    if (ex) {
        selectExercise.value = ex.group_id;
        updateLoggerUI();
        selectVariation.value = ex.id;
        updateLoggerUI();
    }
    showView('logger');
}

function updateLoggerUI() {
    const groupId = selectExercise.value;
    const variationId = selectVariation.value;

    if (!groupId) {
        selectedExercise = null;
        selectVariation.innerHTML = '';
        selectVariation.classList.add('hidden');
        exerciseInfo.innerHTML = "Select an exercise to see details.";
        currentSets = [];
        renderSets();
        return;
    }

    const groupExercises = EXERCISES.filter(ex => ex.group_id == groupId);

    // Ensure the variation dropdown is populated correctly for the current group
    const currentOptions = Array.from(selectVariation.options).map(o => o.value);
    const expectedOptions = groupExercises.map(e => e.id);
    const isPopulated = expectedOptions.every(id => currentOptions.some(opt => opt == id));

    if (!isPopulated) {
        selectVariation.innerHTML = '<option value="">-- Select Variation --</option>';
        groupExercises.forEach(ex => {
            const opt = document.createElement('option');
            opt.value = ex.id;
            opt.textContent = ex.name;
            selectVariation.appendChild(opt);
        });

        if (variationId !== "" && variationId !== null && variationId !== undefined) {
            const isValid = groupExercises.some(ex => ex.id == variationId);
            if (isValid) {
                selectVariation.value = variationId;
            } else {
                selectVariation.value = "";
            }
        }
    }

    if (groupExercises.length === 1) {
        selectVariation.classList.add('hidden');
        selectVariation.value = groupExercises[0].id;
    } else {
        selectVariation.classList.remove('hidden');
    }

    const finalVariationId = selectVariation.value;
    
    if (finalVariationId !== "" && finalVariationId !== null && finalVariationId !== undefined) {
        const ex = groupExercises.find(e => e.id == finalVariationId);
        if (ex) {
            const oldExId = selectedExercise ? selectedExercise.id : null;
            
            if (oldExId !== null && oldExId !== ex.id) {
                syncCurrentSetsToList();
                currentSets = []; // Reset sets only when switching to a DIFFERENT exercise
            }

            selectedExercise = ex;
            exerciseInfo.innerHTML = `
                <strong style="font-size: 1.2rem;">${ex.name}</strong><br>
                ${ex.description}<br>
                <small>Equipment: ${ex.equipment}</small>
            `;

            // If we have an existing set saved in currentWorkoutExercises, pull it
            const existingInList = currentWorkoutExercises.find(item => item.id === ex.id);
            if (existingInList && currentSets.length === 0) {
                currentSets = existingInList.sets.map(set => ({ ...set }));
            } else if (currentSets.length === 0) {
                addSet();
            }
        } else {
            selectedExercise = null;
            exerciseInfo.innerHTML = "Please select a variation.";
            currentSets = [];
            renderSets();
        }
    } else {
        selectedExercise = null;
        exerciseInfo.innerHTML = "Please select a variation.";
        currentSets = [];
        renderSets();
    }

    if (selectedExercise) {
        renderSets();
    }
}

function renderSets() {
    setsContainer.innerHTML = '';
    const currentUnit = selectedExercise ? getExerciseUnit(selectedExercise.id) : 'kg';

    currentSets.forEach((set, index) => {
        const row = document.createElement('div');
        // Adds 'completed' class to the row so CSS outlines/styles it
        row.className = `set-row ${set.completed ? 'completed' : ''}`;
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';

        row.innerHTML = `
            <!-- Clickable Set Number Span -->
            <span 
                class="set-label ${set.completed ? 'completed' : ''}"
                style="width: 50px; flex-shrink: 0; cursor: pointer; user-select: none;" 
                onclick="toggleSetCompletion(${index})"
            >
                Set ${index + 1}
            </span>

            <!-- Equal-Width Weight Input -->
            <input 
                type="number" 
                placeholder="Weight" 
                value="${set.weight}" 
                onchange="updateSet(${index}, 'weight', this.value)" 
                style="flex: 1; width: 0; min-width: 0;"
            >

            <!-- Unit Toggle Button -->
            <button 
                class="btn" 
                style="padding: 8px 12px; width: auto; flex-shrink: 0;" 
                onclick="toggleUnit(${index})"
            >
                ${currentUnit === 'kg' ? 'lb' : 'kg'}
            </button>

            <!-- Equal-Width Reps Input -->
            <input 
                type="number" 
                placeholder="Reps" 
                value="${set.reps}" 
                onchange="updateSet(${index}, 'reps', this.value)" 
                style="flex: 1; width: 0; min-width: 0;"
            >

            <!-- Remove Button -->
            <button 
                class="btn" 
                style="width: auto; padding: 8px 12px; flex-shrink: 0;" 
                onclick="removeSet(${index})"
            >
                ×
            </button>
        `;

        setsContainer.appendChild(row);
    });
}

function toggleSetCompletion(index) {
    currentSets[index].completed = !currentSets[index].completed;
    renderSets();
}

function addSet() {
    if (!selectedExercise) return;
    const lastSet = currentSets.length > 0 ? currentSets[currentSets.length - 1] : null;
    
    let newWeight = '';
    let newReps = '';
    
    if (lastSet) {
        if (lastSet.weight === '') {
            lastSet.weight = '0';
            newWeight = '0';
        } else {
            newWeight = lastSet.weight;
        }
        newReps = lastSet.reps;
    }
    
    currentSets.push({ 
        weight: newWeight, 
        reps: newReps, 
        unit: getExerciseUnit(selectedExercise.id),
        completed: false
    });
    renderSets();
    syncCurrentSetsToList();
}

function updateSet(index, field, value) {
    currentSets[index][field] = value;
}

function toggleUnit(index) {
    if (!selectedExercise) return;
    const currentUnit = getExerciseUnit(selectedExercise.id);
    const newUnit = currentUnit === 'kg' ? 'lb' : 'kg';
    setExerciseUnit(selectedExercise.id, newUnit);
    
    currentSets.forEach(set => {
        set.unit = newUnit;
    });
    
    renderSets();
}

function removeSet(index) {
    currentSets.splice(index, 1);
    renderSets();
    syncCurrentSetsToList();
}

function renderWorkoutList() {
    const list = document.getElementById('workout-exercises-list');
    list.innerHTML = '';
    currentWorkoutExercises.forEach((ex, index) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.padding = '8px 12px';
        div.style.marginBottom = '4px';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.cursor = 'pointer';
        div.innerHTML = `
            <span style="font-size: 0.9rem;">${ex.exerciseName} (${ex.sets.length} sets)</span>
            <button class="btn" style="padding: 4px 8px; width: auto; background: #ef4444; color: white; font-size: 0.8rem;" onclick="removeExerciseFromWorkout(event, ${index})">×</button>
        `;
        div.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') {
                selectExerciseFromList(index);
            }
        };
        list.appendChild(div);
    });
}

function removeExerciseFromWorkout(event, index) {
    event.stopPropagation();
    currentWorkoutExercises.splice(index, 1);
    renderWorkoutList();
}

function addExerciseToWorkout() {
    if (!selectedExercise || currentSets.length === 0) {
        showToast("Please add at least one set for the exercise.", "error");
        return;
    }

    const existingIndex = currentWorkoutExercises.findIndex(ex => ex.id === selectedExercise.id);
    
    if (existingIndex > -1) {
        // Update existing entry
        currentWorkoutExercises[existingIndex] = {
            id: selectedExercise.id,
            group_id: selectedExercise.group_id,
            variation_id: selectedExercise.id, // This is the variation ID
            exerciseName: selectedExercise.name,
            sets: currentSets.map(set => ({ ...set }))
        };
    } else {
        // Add new entry
        currentWorkoutExercises.push({
            id: selectedExercise.id,
            group_id: selectedExercise.group_id,
            variation_id: selectedExercise.id,
            exerciseName: selectedExercise.name,
            sets: currentSets.map(set => ({ ...set }))
        });
    }

    renderWorkoutList();

    // Reset selection
    currentSets = [];
    selectedExercise = null;
    selectExercise.value = "";
    updateLoggerUI();
}

function syncCurrentSetsToList() {
    if (selectedExercise) {
        const listIndex = currentWorkoutExercises.findIndex(ex => ex.id === selectedExercise.id);
        if (listIndex > -1) {
            currentWorkoutExercises[listIndex].sets = currentSets.map(set => ({ ...set }));
            renderWorkoutList();
        }
    }
}

function selectExerciseFromList(index) {
    syncCurrentSetsToList();
    const exData = currentWorkoutExercises[index];
    
    const ex = EXERCISES.find(e => e.id === exData.id);
    
    if (ex) {
        // Set state first
        selectedExercise = ex;
        currentSets = exData.sets.map(set => ({ ...set }));
        
        // Update control values without letting change handlers overwrite currentSets

        selectExercise.value = ex.group_id;
        updateLoggerUI();
        
        selectVariation.value = ex.id;
        updateLoggerUI();
    }
}

function saveWorkout() {
    // Update the sets of the active exercise in the minimized list if it exists there
    if (selectedExercise) {
        const listIndex = currentWorkoutExercises.findIndex(ex => ex.id === selectedExercise.id);
        if (listIndex > -1) {
            currentWorkoutExercises[listIndex].sets = currentSets.map(set => ({ ...set }));
        }
    }

    const exercisesToSave = [];
    
    // 1. Add ones already in the list
    currentWorkoutExercises.forEach(ex => {
        exercisesToSave.push({
            id: ex.id,
            exerciseName: ex.exerciseName,
            sets: ex.sets
        });
    });

    // 2. Add the active one if it's NOT in the list
    if (selectedExercise) {
        const isAlreadyInList = currentWorkoutExercises.some(ex => ex.id === selectedExercise.id);
        if (!isAlreadyInList) {
            exercisesToSave.push({
                id: selectedExercise.id,
                exerciseName: selectedExercise.name,
                sets: currentSets.map(set => ({ ...set }))
            });
        }
    }

    if (exercisesToSave.length === 0) {
        showToast("Please add at least one exercise.", "error");
        return;
    }

    const name = document.getElementById('workout-name-input').value;

    const workout = {
        id: Date.now(),
        name: name || "Untitled Workout",
        date: new Date().toLocaleString(),
        exercises: exercisesToSave
    };

    const history = JSON.parse(localStorage.getItem('gym_history') || '[]');
    history.unshift(workout);
    localStorage.setItem('gym_history', JSON.stringify(history));

    showToast("Workout saved!");
    document.getElementById('workout-name-input').value = "";
    
    showView('history');
    loadHistory();

    // Reset logger state
    currentWorkoutExercises = [];
    currentSets = [];
    selectedExercise = null;
    selectExercise.value = "";
    renderWorkoutList();
    updateLoggerUI();

    
}

function repeatWorkout(workout) {
    if (!workout || !workout.exercises || !Array.isArray(workout.exercises)) {
        showToast("This workout record is incompatible with the repeat feature.", "error");
        return;
    }

    currentWorkoutExercises = [];
    currentSets = [];
    
    workout.exercises.forEach(ex => {
        const originalEx = EXERCISES.find(e => e.id === ex.id);
        if (originalEx) {
            currentWorkoutExercises.push({
                id: ex.id,
                group_id: originalEx.group_id,
                variation_id: originalEx.variation_id,
                exerciseName: originalEx.name,
                sets: ex.sets.map(set => ({ ...set, completed: false }))
            });
        }
    });

    if (currentWorkoutExercises.length > 0) {
        const firstEx = currentWorkoutExercises[0];
        const originalEx = EXERCISES.find(e => e.id === firstEx.id);
        selectedExercise = originalEx;
        currentSets = firstEx.sets.map(set => ({ ...set }));
        
        // Update UI
        document.getElementById('workout-name-input').value = workout.name || "Repeated Workout";
        selectExercise.value = firstEx.group_id;
        updateLoggerUI();
        selectVariation.value = firstEx.id;
        updateLoggerUI();
        
        renderWorkoutList();
        showView('logger');
    }
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('gym_history') || '[]');
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<p>No history found.</p>';
        return;
    }

    history.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const header = document.createElement('div');
        header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;";
        
        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = "font-size: 0.8rem; color: var(--text-light);";
        nameSpan.textContent = item.name || "Untitled Workout";
        
        const dateSpan = document.createElement('span');
        dateSpan.style.cssText = "font-size: 0.8rem; color: var(--text-light);";
        dateSpan.textContent = ` (${item.date})`;
        
        header.appendChild(nameSpan);
        header.appendChild(dateSpan);

        if (item.exercises && Array.isArray(item.exercises)) {
            const repeatBtn = document.createElement('button');
            repeatBtn.className = 'btn btn-secondary';
            repeatBtn.style.cssText = "padding: 4px 8px; width: auto; font-size: 0.7rem;";
            repeatBtn.textContent = 'Repeat';
            repeatBtn.onclick = (e) => {
                e.stopPropagation();
                repeatWorkout(item);
            };
            header.appendChild(repeatBtn);
        }
        
        card.appendChild(header);
        
        if (item.exercises && Array.isArray(item.exercises)) {
            item.exercises.forEach((ex, index) => {
                const exDiv = document.createElement('div');
                const isLast = index === item.exercises.length - 1;
                exDiv.style.marginBottom = isLast ? '0' : '12px';
                exDiv.style.paddingBottom = isLast ? '0' : '8px';
                exDiv.style.borderBottom = isLast ? 'none' : '1px solid var(--border)';
                
                exDiv.innerHTML = `<div class="exercise-name">${ex.exerciseName}</div>`;
                
                const setsContainer = document.createElement('div');
                setsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px; font-size: 0.85rem;';
                
                ex.sets.forEach((s, i) => {
                    const setSpan = document.createElement('span');
                    setSpan.style.cssText = 'white-space: nowrap;';
                    setSpan.textContent = `Set ${i+1}: ${s.weight}${s.unit} x ${s.reps} reps`;
                    setsContainer.appendChild(setSpan);
                });
                
                exDiv.appendChild(setsContainer);
                card.appendChild(exDiv);
            });
        } else {
            const exDiv = document.createElement('div');
            exDiv.innerHTML = `<div class="exercise-name">${item.exerciseName}</div>`;
            
            const setsContainer = document.createElement('div');
            setsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; font-size: 0.9rem;';
            
            (item.sets || []).forEach((s, i) => {
                const setSpan = document.createElement('span');
                setSpan.style.cssText = 'white-space: nowrap;';
                setSpan.textContent = `Set ${i+1}: ${s.weight}${s.unit} x ${s.reps} reps`;
                setsContainer.appendChild(setSpan);
            });
            
            exDiv.appendChild(setsContainer);
            card.appendChild(exDiv);
        }
        historyList.appendChild(card);
    });
}

function showView(viewId) {
    viewLibrary.classList.add('hidden');
    viewLogger.classList.add('hidden');
    viewHistory.classList.add('hidden');
    
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    
    if (viewId !== 'logger') {
        document.getElementById('workout-name-input').value = '';
    }
    
    const titleMap = {
        'library': 'Library',
        'logger': 'Log Workout',
        'history': 'History'
    };
    viewTitle.textContent = titleMap[viewId];

    // Handle visibility of the dark mode toggle
    if (viewId === 'history') {
        document.body.classList.add('show-history-toggle');
    } else {
        document.body.classList.remove('show-history-toggle');
    }

    // Update Nav active state
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const navMap = {
        'library': 'nav-lib',
        'logger': 'nav-log',
        'history': 'nav-hist'
    };
    document.getElementById(navMap[viewId]).classList.add('active');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Run on load
init();

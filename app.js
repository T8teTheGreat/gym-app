let EXERCISES = [];

// UI State
let currentSets = [];
let selectedExercise = null;
let currentWorkoutExercises = [];
let draggedIndex = null;

// Utility: Sanitize strings for DOM insertion
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Utility: Generate Unique ID
function generateId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Date.now().toString(36) + Math.random().toString(36).substring(2);
}

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
const workoutExercisesList = document.getElementById('workout-exercises-list');

// Initialize
function init() {
    try {
        if (typeof EXERCISES_DATA === 'undefined') {
            throw new Error('EXERCISES_DATA not found. Make sure data/exercises.js is loaded before app.js.');
        }

        EXERCISES = EXERCISES_DATA;
        
        // Attach Primary Event Listeners
        selectExercise.addEventListener('change', () => {
            selectVariation.value = ''; // Reset variation when exercise group changes
            currentSets = [];
            updateLoggerUI();
        });
        
        selectVariation.addEventListener('change', () => {
            currentSets = [];
            updateLoggerUI();
        });
        
        if (muscleFilter) muscleFilter.addEventListener('change', filterLibrary);
        if (searchInput) searchInput.addEventListener('input', filterLibrary);

        // Event Delegation for Sets (Fixes Focus Loss & Removes Inline Handlers)
        setsContainer.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            if (isNaN(index)) return;
            
            if (e.target.classList.contains('weight-input')) {
                currentSets[index].weight = e.target.value === '' ? '' : Number(e.target.value);
                syncCurrentSetsToList();
            } else if (e.target.classList.contains('reps-input')) {
                currentSets[index].reps = e.target.value === '' ? '' : Number(e.target.value);
                syncCurrentSetsToList();
            }
        });

        setsContainer.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            if (isNaN(index)) return;

            if (e.target.classList.contains('set-label')) {
                toggleSetCompletion(index);
            } else if (e.target.classList.contains('toggle-unit-btn')) {
                toggleUnit(index);
            } else if (e.target.classList.contains('remove-set-btn')) {
                removeSet(index);
            }
        });

        // Event Delegation for Workout List
        if (workoutExercisesList) {
            workoutExercisesList.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.remove-ex-btn');
                if (removeBtn) {
                    e.stopPropagation();
                    removeExerciseFromWorkout(parseInt(removeBtn.dataset.index, 10));
                    return;
                }
                const card = e.target.closest('.workout-ex-card');
                if (card) {
                    selectExerciseFromList(parseInt(card.dataset.index, 10));
                }
            });
        }

        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.contains('dark-mode');
                const newIsDark = !isDark;
                
                document.body.classList.toggle('dark-mode', newIsDark);
                localStorage.setItem('dark_mode', newIsDark ? 'true' : 'false');
                darkModeToggle.textContent = newIsDark ? '🌙' : '☀️';
            });

            if (localStorage.getItem('dark_mode') === 'true') {
                document.body.classList.add('dark-mode');
                darkModeToggle.textContent = '🌙';
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
            <div class="exercise-name">${escapeHTML(ex.name)}</div>
            <div class="exercise-desc">${escapeHTML(ex.description)}</div>
            <div class="badge">Primary: ${escapeHTML(ex.primary_muscles.join(', '))}</div>
            <div style="font-size: 0.8rem; margin-top: 8px; color: var(--text-light);">Equipment: ${escapeHTML(ex.equipment)}</div>
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
    if (!EXERCISES || EXERCISES.length === 0) return;
    
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
    const currentOptions = Array.from(selectVariation.options).map(o => o.value);
    const expectedOptions = groupExercises.map(e => String(e.id));
    const isPopulated = expectedOptions.every(id => currentOptions.includes(id));

    if (!isPopulated) {
        selectVariation.innerHTML = '<option value="">-- Select Variation --</option>';
        groupExercises.forEach(ex => {
            const opt = document.createElement('option');
            opt.value = ex.id;
            opt.textContent = ex.name;
            selectVariation.appendChild(opt);
        });

        if (variationId) {
            selectVariation.value = groupExercises.some(ex => ex.id == variationId) ? variationId : "";
        }
    }

    if (groupExercises.length === 1) {
        selectVariation.classList.add('hidden');
        selectVariation.value = groupExercises[0].id;
    } else {
        selectVariation.classList.remove('hidden');
    }

    const finalVariationId = selectVariation.value;
    
    if (finalVariationId) {
        const ex = groupExercises.find(e => e.id == finalVariationId);
        if (ex) {
            if (selectedExercise && selectedExercise.id !== ex.id) {
                syncCurrentSetsToList();
                currentSets = [];
            }

            selectedExercise = ex;
            exerciseInfo.innerHTML = `
                <strong style="font-size: 1.2rem;">${escapeHTML(ex.name)}</strong><br>
                ${escapeHTML(ex.description)}<br>
                <small>Equipment: ${escapeHTML(ex.equipment)}</small>
            `;

            const existingInList = currentWorkoutExercises.find(item => item.id === ex.id);
            if (existingInList && currentSets.length === 0) {
                currentSets = existingInList.sets.map(set => ({ ...set }));
            } else if (currentSets.length === 0) {
                addSet();
            }
        } else {
            resetVariationState();
        }
    } else {
        resetVariationState();
    }

    if (selectedExercise) {
        renderSets();
    }
}

function resetVariationState() {
    selectedExercise = null;
    exerciseInfo.innerHTML = "Please select a variation.";
    currentSets = [];
    renderSets();
}

function renderSets() {
    setsContainer.innerHTML = '';
    const currentUnit = selectedExercise ? getExerciseUnit(selectedExercise.id) : 'kg';

    currentSets.forEach((set, index) => {
        const row = document.createElement('div');
        row.className = `set-row ${set.completed ? 'completed' : ''}`;
        row.style.cssText = 'display: flex; align-items: center; gap: 8px;';

        row.innerHTML = `
            <span class="set-label ${set.completed ? 'completed' : ''}" data-index="${index}" style="width: 50px; flex-shrink: 0; cursor: pointer; user-select: none;">
                Set ${index + 1}
            </span>
            <input type="number" class="weight-input" data-index="${index}" placeholder="Weight" value="${set.weight}" style="flex: 1; width: 0; min-width: 0;">
            <button class="btn toggle-unit-btn" data-index="${index}" style="padding: 8px 12px; width: auto; flex-shrink: 0;">
                ${currentUnit === 'kg' ? 'lb' : 'kg'}
            </button>
            <input type="number" class="reps-input" data-index="${index}" placeholder="Reps" value="${set.reps}" style="flex: 1; width: 0; min-width: 0;">
            <button class="btn remove-set-btn" data-index="${index}" style="width: auto; padding: 8px 12px; flex-shrink: 0;">×</button>
        `;
        setsContainer.appendChild(row);
    });
}

function toggleSetCompletion(index) {
    currentSets[index].completed = !currentSets[index].completed;
    renderSets(); // Only re-renders on structural/visual shift, not typing
}

function addSet() {
    if (!selectedExercise) return;
    const lastSet = currentSets.length > 0 ? currentSets[currentSets.length - 1] : null;
    
    let newWeight = '';
    let newReps = '';
    
    if (lastSet) {
        newWeight = lastSet.weight === '' ? 0 : lastSet.weight;
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

function toggleUnit(index) {
    if (!selectedExercise) return;
    const currentUnit = getExerciseUnit(selectedExercise.id);
    const newUnit = currentUnit === 'kg' ? 'lb' : 'kg';
    setExerciseUnit(selectedExercise.id, newUnit);
    
    currentSets.forEach(set => set.unit = newUnit);
    renderSets();
}

function removeSet(index) {
    currentSets.splice(index, 1);
    renderSets();
    syncCurrentSetsToList();
}

// Drag and Drop Handlers
function handleDragStart(e, index) {
    draggedIndex = index;
    e.dataTransfer.setData('text/plain', index);
    e.currentTarget.style.opacity = '0.5';
}

function handleDragOver(e) {
    e.preventDefault();
    return false;
}

function handleDrop(e, targetIndex) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
        return;
    }

    const items = [...currentWorkoutExercises];
    const movedItem = items.splice(draggedIndex, 1)[0];
    items.splice(targetIndex, 0, movedItem);
    
    currentWorkoutExercises = items;
    renderWorkoutList();
    
    draggedIndex = null;
}

function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    draggedIndex = null;
}

function renderWorkoutList() {
    if (!workoutExercisesList) return;
    workoutExercisesList.innerHTML = '';
    
    currentWorkoutExercises.forEach((ex, index) => {
        const div = document.createElement('div');
        div.className = 'card workout-ex-card';
        div.dataset.index = index;
        div.style.cssText = 'padding: 8px 12px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;';
        
        div.innerHTML = `
            <span style="font-size: 0.9rem;">${escapeHTML(ex.exerciseName)} (${ex.sets.length} sets)</span>
            <button class="btn remove-ex-btn" data-index="${index}" style="padding: 4px 8px; width: auto; background: #ef4444; color: white; font-size: 0.8rem;">×</button>
        `;
        workoutExercisesList.appendChild(div);

        div.setAttribute('draggable', 'true');
        div.addEventListener('dragstart', (e) => handleDragStart(e, index));
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('dragenter', handleDragOver);
        div.addEventListener('drop', (e) => handleDrop(e, index));
        div.addEventListener('dragend', handleDragEnd);
    });
}

function removeExerciseFromWorkout(index) {
    currentWorkoutExercises.splice(index, 1);
    renderWorkoutList();
}

function addExerciseToWorkout() {
    if (!selectedExercise || currentSets.length === 0) {
        showToast("Please add at least one set for the exercise.", "error");
        return;
    }

    const existingIndex = currentWorkoutExercises.findIndex(ex => ex.id === selectedExercise.id);
    const exerciseData = {
        id: selectedExercise.id,
        group_id: selectedExercise.group_id,
        variation_id: selectedExercise.id,
        exerciseName: selectedExercise.name,
        sets: currentSets.map(set => ({ ...set }))
    };
    
    if (existingIndex > -1) {
        currentWorkoutExercises[existingIndex] = exerciseData;
    } else {
        currentWorkoutExercises.push(exerciseData);
    }

    renderWorkoutList();
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
        selectedExercise = ex;
        currentSets = exData.sets.map(set => ({ ...set }));
        selectExercise.value = ex.group_id;
        updateLoggerUI();
        selectVariation.value = ex.id;
        updateLoggerUI();
    }
}

function saveWorkout() {
    if (selectedExercise) {
        const listIndex = currentWorkoutExercises.findIndex(ex => ex.id === selectedExercise.id);
        if (listIndex > -1) {
            currentWorkoutExercises[listIndex].sets = currentSets.map(set => ({ ...set }));
        }
    }

    const rawExercises = [...currentWorkoutExercises];
    
    if (selectedExercise && !currentWorkoutExercises.some(ex => ex.id === selectedExercise.id)) {
        rawExercises.push({
            id: selectedExercise.id,
            exerciseName: selectedExercise.name,
            sets: currentSets.map(set => ({ ...set }))
        });
    }

    const cleanExercises = [];
    
    rawExercises.forEach(ex => {
        // Strip out completely empty sets to protect data integrity
        const validSets = ex.sets.filter(s => s.weight !== '' && s.reps !== '' && s.weight !== null && s.reps !== null);
        if (validSets.length > 0) {
            cleanExercises.push({
                id: ex.id,
                exerciseName: ex.exerciseName,
                sets: validSets
            });
        }
    });

    if (cleanExercises.length === 0) {
        showToast("Please add at least one valid set.", "error");
        return;
    }

    const name = document.getElementById('workout-name-input').value;
    const workout = {
        id: generateId(),
        name: name || "Untitled Workout",
        date: new Date().toLocaleString(),
        exercises: cleanExercises
    };

    let history = JSON.parse(localStorage.getItem('gym_history') || '[]');
    history.unshift(workout);
    
    // Cap history limit to prevent QuotaExceededError in localStorage
    if (history.length > 100) history = history.slice(0, 100);
    
    localStorage.setItem('gym_history', JSON.stringify(history));
    showToast("Workout saved!");
    
    // Reset state & UI cleanly
    document.getElementById('workout-name-input').value = "";
    currentWorkoutExercises = [];
    currentSets = [];
    selectedExercise = null;
    selectExercise.value = "";
    
    renderWorkoutList(); // Fixed Bug: clears minimized visual list
    updateLoggerUI();
    showView('history');
    loadHistory();
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
        card.className = 'card workout-history-card';
        card.style.cssText = "padding: 0; overflow: hidden;";
        
        // Header container includes top card padding + header row
        const headerContainer = document.createElement('div');
        headerContainer.className = 'workout-card-header-zone';
        headerContainer.style.cssText = "padding: 16px 16px 8px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;";
        
        headerContainer.innerHTML = `
            <div class="workout-title" style="display: flex; gap: 8px;">
                <span style="font-size: 0.8rem; color: var(--text-light);">${escapeHTML(item.name || "Untitled Workout")}</span>
                <span style="font-size: 0.8rem; color: var(--text-light);"> (${escapeHTML(item.date)})</span>
            </div>
        `;

        const details = document.createElement('div');
        details.className = 'workout-details hidden';
        details.style.padding = "0 16px 16px 16px";

        if (item.exercises && Array.isArray(item.exercises)) {
            const repeatBtn = document.createElement('button');
            repeatBtn.className = 'btn btn-secondary';
            repeatBtn.style.cssText = "padding: 4px 8px; width: auto; font-size: 0.7rem; cursor: pointer;";
            repeatBtn.textContent = 'Repeat';
            repeatBtn.onclick = (e) => {
                e.stopPropagation();
                repeatWorkout(item);
            };
            headerContainer.appendChild(repeatBtn);
        }

        // Expand card when clicking anywhere on header/card while hidden
        card.onclick = () => {
            if (details.classList.contains('hidden')) {
                details.classList.remove('hidden');
            }
        };

        // Minimize card when clicking top header zone while visible
        headerContainer.onclick = (e) => {
            if (!details.classList.contains('hidden')) {
                e.stopPropagation();
                details.classList.add('hidden');
            }
        };

        card.appendChild(headerContainer);
        
        const exercisesList = item.exercises || [item];
        
        exercisesList.forEach((ex, index) => {
            const exDiv = document.createElement('div');
            const isLast = index === exercisesList.length - 1;
            exDiv.style.cssText = `margin-bottom: ${isLast ? '0' : '12px'}; padding-bottom: ${isLast ? '0' : '8px'}; border-bottom: ${isLast ? 'none' : '1px solid var(--border)'};`;
            
            exDiv.innerHTML = `<div class="exercise-name">${escapeHTML(ex.exerciseName)}</div>`;
            
            const setsContainer = document.createElement('div');
            setsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px; font-size: 0.85rem;';
            
            (ex.sets || []).forEach((s, i) => {
                const setSpan = document.createElement('span');
                setSpan.style.whiteSpace = 'nowrap';
                setSpan.textContent = `Set ${i+1}: ${s.weight}${s.unit || 'kg'} x ${s.reps} reps`;
                setsContainer.appendChild(setSpan);
            });
            
            exDiv.appendChild(setsContainer);
            details.appendChild(exDiv);
        });
        
        card.appendChild(details);
        historyList.appendChild(card);
    });
}

function showView(viewId) {
    viewLibrary.classList.add('hidden');
    viewLogger.classList.add('hidden');
    viewHistory.classList.add('hidden');
    
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    
    const titleMap = {
        'library': 'Library',
        'logger': 'Log Workout',
        'history': 'History'
    };
    viewTitle.textContent = titleMap[viewId];

    document.body.classList.toggle('show-history-toggle', viewId === 'history');

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

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Run on load
init();
// pages/logger.js
import { store, getExerciseUnit, setExerciseUnit } from '../store.js';
import { escapeHTML, generateId, showToast } from '../utils.js';
import { showView } from '../navigation.js';
import { loadHistory } from './history.js';

export function populateExerciseDropdown() {
    const selectExercise = document.getElementById('select-exercise');
    if (!store.EXERCISES || store.EXERCISES.length === 0) return;
    
    selectExercise.innerHTML = '<option value="">-- Select Exercise --</option>';
    const groups = {};
    store.EXERCISES.forEach(ex => {
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

export function selectExerciseForLogging(id) {
    const ex = store.EXERCISES.find(e => e.id === id);
    if (ex) {
        document.getElementById('select-exercise').value = ex.group_id;
        const loggerExerciseSearch = document.getElementById('logger-exercise-search');
        if (loggerExerciseSearch) loggerExerciseSearch.value = '';
        updateLoggerUI();
        selectExerciseFromResults(ex);
    }
    showView('logger');
}

export function updateLoggerUI(searchQuery) {
    const selectExercise = document.getElementById('select-exercise');
    const loggerExerciseSearch = document.getElementById('logger-exercise-search');
    const loggerExerciseResults = document.getElementById('logger-exercise-results');
    const query = searchQuery !== undefined ? searchQuery : (loggerExerciseSearch ? loggerExerciseSearch.value : '');
    const groupId = selectExercise.value;

    if (loggerExerciseResults) {
        loggerExerciseResults.innerHTML = '';
        loggerExerciseResults.style.display = 'none';
    }

    let filteredExercises = store.EXERCISES;
    
    if (groupId) {
        filteredExercises = filteredExercises.filter(ex => ex.group_id == groupId);
    }

    if (query) {
        filteredExercises = filteredExercises.filter(ex => 
            ex.name.toLowerCase().includes(query.toLowerCase()) ||
            ex.description.toLowerCase().includes(query.toLowerCase())
        );
    }

    // FIX 1: Allow results to display when an exercise group is selected without search text
    if ((query || groupId) && filteredExercises.length > 0) {
        loggerExerciseResults.style.display = 'block';
        filteredExercises.forEach(ex => {
            const item = document.createElement('div');
            item.className = 'exercise-result-item';
            item.style.cssText = 'padding: 10px 12px; border-bottom: 1px solid var(--border); cursor: pointer;';
            item.innerHTML = `
                <div style="font-weight: bold;">${escapeHTML(ex.name)}</div>
                <div style="font-size: 0.8rem; color: var(--text-light);">${escapeHTML(ex.description.substring(0, 40))}...</div>
            `;
            item.onclick = () => {
                selectExerciseFromResults(ex);
                if (loggerExerciseSearch) loggerExerciseSearch.value = '';
                updateLoggerUI();
            };
            loggerExerciseResults.appendChild(item);
        });
    } else if (loggerExerciseResults) {
        loggerExerciseResults.style.display = 'none';
    }

    if (store.selectedExercise) {
        renderSets();
    }
}

export function selectExerciseFromResults(ex) {
    store.selectedExercise = ex;
    const selectExercise = document.getElementById('select-exercise');
    if (selectExercise) {
        selectExercise.value = ex.group_id;
    }
    
    const exerciseInfo = document.getElementById('exercise-info');
    if (exerciseInfo) {
        exerciseInfo.innerHTML = `
            <strong style="font-size: 1.2rem;">${escapeHTML(ex.name)}</strong><br>
            ${escapeHTML(ex.description)}<br>
            <small>Equipment: ${escapeHTML(ex.equipment)}</small>
        `;
    }

    // Check if exercise already exists in current workout array
    let existingInList = store.currentWorkoutExercises.find(item => item.id === ex.id);

    if (existingInList) {
        // Load existing sets into state
        store.currentSets = existingInList.sets.map(set => ({ ...set }));
    } else {
        // Initialize active set state with a single default set
        store.currentSets = [{
            weight: '',
            reps: '',
            unit: getExerciseUnit(ex.id),
            completed: false
        }];

        // Automatically push new exercise to currentWorkoutExercises array
        store.currentWorkoutExercises.push({
            id: ex.id,
            group_id: ex.group_id,
            variation_id: ex.variation_id,
            exerciseName: ex.name,
            sets: store.currentSets.map(set => ({ ...set }))
        });
    }

    // Refresh UI components immediately
    renderSets();
    renderWorkoutList();
}

export function renderSets() {
    const setsContainer = document.getElementById('sets-container');
    setsContainer.innerHTML = '';
    const currentUnit = store.selectedExercise ? getExerciseUnit(store.selectedExercise.id) : 'kg';

    store.currentSets.forEach((set, index) => {
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

    // FIX 3: Bind input field changes back to store.currentSets
    setsContainer.querySelectorAll('.weight-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = e.target.getAttribute('data-index');
            store.currentSets[index].weight = e.target.value;
        });
    });

    setsContainer.querySelectorAll('.reps-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = e.target.getAttribute('data-index');
            store.currentSets[index].reps = e.target.value;
        });
    });
}

export function toggleSetCompletion(index) {
    store.currentSets[index].completed = !store.currentSets[index].completed;
    renderSets(); 
    syncCurrentSetsToList();
}

export function addSet() {
    if (!store.selectedExercise) return;
    const lastSet = store.currentSets.length > 0 ? store.currentSets[store.currentSets.length - 1] : null;
    
    let newWeight = '';
    let newReps = '';
    
    if (lastSet) {
        newWeight = lastSet.weight === '' ? 0 : lastSet.weight;
        newReps = lastSet.reps;
    }
    
    store.currentSets.push({ 
        weight: newWeight, 
        reps: newReps, 
        unit: getExerciseUnit(store.selectedExercise.id),
        completed: false
    });
    renderSets();
    syncCurrentSetsToList();
}

export function toggleUnit(index) {
    if (!store.selectedExercise) return;
    const currentUnit = getExerciseUnit(store.selectedExercise.id);
    const newUnit = currentUnit === 'kg' ? 'lb' : 'kg';
    setExerciseUnit(store.selectedExercise.id, newUnit);
    
    store.currentSets.forEach(set => set.unit = newUnit);
    renderSets();
}

export function removeSet(index) {
    store.currentSets.splice(index, 1);
    renderSets();
    syncCurrentSetsToList();
}

function handleDragStart(e, index) {
    store.draggedIndex = index;
    e.dataTransfer.setData('text/plain', index);
    e.currentTarget.style.opacity = '0.5';
}

function handleDragOver(e) {
    e.preventDefault();
    return false;
}

function handleDrop(e, targetIndex) {
    e.preventDefault();
    if (store.draggedIndex === null || store.draggedIndex === targetIndex) return;

    const items = [...store.currentWorkoutExercises];
    const movedItem = items.splice(store.draggedIndex, 1)[0];
    items.splice(targetIndex, 0, movedItem);
    
    store.currentWorkoutExercises = items;
    renderWorkoutList();
    store.draggedIndex = null;
}

function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    store.draggedIndex = null;
}

export function renderWorkoutList() {
    const workoutExercisesList = document.getElementById('workout-exercises-list');
    if (!workoutExercisesList) return;
    workoutExercisesList.innerHTML = '';
    
    store.currentWorkoutExercises.forEach((ex, index) => {
        const div = document.createElement('div');
        div.className = 'card workout-ex-card';
        div.dataset.index = index;
        div.style.cssText = 'padding: 8px 12px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;';
        
        const boxes = (ex.sets || []).map(set => 
            `<span style="width: 6px; height: 6px; border-radius: 2px; background-color: ${set.completed ? '#22c55e' : '#94a3b8'}; display: inline-block; margin-left: 2px;"></span>`
        ).join('');

        div.innerHTML = `
            <span style="font-size: 0.9rem;">${escapeHTML(ex.exerciseName)} <span style="display: flex; gap: 2px; margin-left: 8px;">${boxes}</span></span>
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

export function removeExerciseFromWorkout(index) {
    // FIX 2: Clear active exercise selection if removing the exercise currently being edited
    const removedEx = store.currentWorkoutExercises[index];
    if (store.selectedExercise && removedEx.id === store.selectedExercise.id) {
        store.selectedExercise = null;
        store.currentSets = [];
        const exerciseInfo = document.getElementById('exercise-info');
        if (exerciseInfo) exerciseInfo.innerHTML = '';
        const selectExercise = document.getElementById('select-exercise');
        if (selectExercise) selectExercise.value = "";
        updateLoggerUI();
    }

    store.currentWorkoutExercises.splice(index, 1);
    renderWorkoutList();
}

export function addExerciseToWorkout() {
    if (!store.selectedExercise || store.currentSets.length === 0) {
        showToast("Please add at least one set for the exercise.", "error");
        return;
    }

    const existingIndex = store.currentWorkoutExercises.findIndex(ex => ex.id === store.selectedExercise.id);
    const exerciseData = {
        id: store.selectedExercise.id,
        group_id: store.selectedExercise.group_id,
        variation_id: store.selectedExercise.variation_id, // FIX 4: Corrected to store.selectedExercise.variation_id
        exerciseName: store.selectedExercise.name,
        sets: store.currentSets.map(set => ({ ...set }))
    };
    
    if (existingIndex > -1) {
        store.currentWorkoutExercises[existingIndex] = exerciseData;
    } else {
        store.currentWorkoutExercises.push(exerciseData);
    }

    renderWorkoutList();
    store.currentSets = [];
    store.selectedExercise = null;
    document.getElementById('select-exercise').value = "";
    updateLoggerUI();
}

export function syncCurrentSetsToList() {
    if (store.selectedExercise) {
        const listIndex = store.currentWorkoutExercises.findIndex(ex => ex.id === store.selectedExercise.id);
        if (listIndex > -1) {
            store.currentWorkoutExercises[listIndex].sets = store.currentSets.map(set => ({ ...set }));
            renderWorkoutList();
        } else if (store.currentSets.length > 0) {
            // Exercise not in list, add it automatically
            store.currentWorkoutExercises.push({
                id: store.selectedExercise.id,
                group_id: store.selectedExercise.group_id,
                variation_id: store.selectedExercise.variation_id,
                exerciseName: store.selectedExercise.name,
                sets: store.currentSets.map(set => ({ ...set }))
            });
            renderWorkoutList();
        }
    }
}

export function selectExerciseFromList(index) {
    syncCurrentSetsToList();
    const exData = store.currentWorkoutExercises[index];
    const ex = store.EXERCISES.find(e => e.id === exData.id);
    
    if (ex) {
        store.selectedExercise = ex;
        store.currentSets = exData.sets.map(set => ({ ...set }));
        document.getElementById('select-exercise').value = ex.group_id;
        updateLoggerUI();
        selectExerciseFromResults(ex);
    }
}

export function saveWorkout() {
    if (store.selectedExercise) {
        const listIndex = store.currentWorkoutExercises.findIndex(ex => ex.id === store.selectedExercise.id);
        if (listIndex > -1) {
            store.currentWorkoutExercises[listIndex].sets = store.currentSets.map(set => ({ ...set }));
        }
    }

    const rawExercises = [...store.currentWorkoutExercises];
    if (store.selectedExercise && !store.currentWorkoutExercises.some(ex => ex.id === store.selectedExercise.id)) {
        rawExercises.push({
            id: store.selectedExercise.id,
            exerciseName: store.selectedExercise.name,
            sets: store.currentSets.map(set => ({ ...set }))
        });
    }

    const cleanExercises = [];
    rawExercises.forEach(ex => {
        const validSets = ex.sets.filter(s => s.weight !== '' && s.reps !== '' && s.weight !== null && s.reps !== null);
        if (validSets.length > 0) {
            cleanExercises.push({ id: ex.id, exerciseName: ex.exerciseName, sets: validSets });
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
    if (history.length > 100) history = history.slice(0, 100);
    
    localStorage.setItem('gym_history', JSON.stringify(history));
    showToast("Workout saved!");
    
    document.getElementById('workout-name-input').value = "";
    store.currentWorkoutExercises = [];
    store.currentSets = [];
    store.selectedExercise = null;
    document.getElementById('select-exercise').value = "";
    
    renderWorkoutList(); 
    updateLoggerUI();
    showView('history');
    loadHistory();
}

export function repeatWorkout(workout) {
    if (!workout || !workout.exercises || !Array.isArray(workout.exercises)) {
        showToast("This workout record is incompatible with the repeat feature.", "error");
        return;
    }

    store.currentWorkoutExercises = [];
    store.currentSets = [];
    
    workout.exercises.forEach(ex => {
        const originalEx = store.EXERCISES.find(e => e.id === ex.id);
        if (originalEx) {
            store.currentWorkoutExercises.push({
                id: ex.id,
                group_id: originalEx.group_id,
                variation_id: originalEx.variation_id,
                exerciseName: originalEx.name,
                sets: ex.sets.map(set => ({ ...set, completed: false }))
            });
        }
    });

    if (store.currentWorkoutExercises.length > 0) {
        const firstEx = store.currentWorkoutExercises[0];
        const originalEx = store.EXERCISES.find(e => e.id === firstEx.id);
        store.selectedExercise = originalEx;
        store.currentSets = firstEx.sets.map(set => ({ ...set }));
        
        document.getElementById('workout-name-input').value = workout.name || "Repeated Workout";
        document.getElementById('select-exercise').value = firstEx.group_id;
        updateLoggerUI();
        renderWorkoutList();
        showView('logger');
    }
}
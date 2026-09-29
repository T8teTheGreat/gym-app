// pages/logger.js
import { store, getExerciseUnit, setExerciseUnit } from '../store.js';
import { escapeHTML, generateId, showToast } from '../utils.js';
import { showView } from '../navigation.js';
import { loadHistory } from './history.js';

// --- INITIALIZATION & UI UPDATES ---

export function populateExerciseDropdown() {
    const select = document.getElementById('select-exercise');
    if (!store.EXERCISES?.length) return;
    
    const groups = [...new Set(store.EXERCISES.map(ex => ex.group_id))];
    select.innerHTML = '<option value="">-- Select Exercise --</option>' + 
        groups.map(id => {
            const groupName = store.EXERCISES.find(ex => ex.group_id === id).group_name;
            return `<option value="${id}">${groupName}</option>`;
        }).join('');
}

export function updateLoggerUI(searchQuery = document.getElementById('logger-exercise-search')?.value || '') {
    const groupId = document.getElementById('select-exercise')?.value;
    const resultsContainer = document.getElementById('logger-exercise-results');
    if (!resultsContainer) return;

    let filtered = store.EXERCISES || [];
    if (groupId) filtered = filtered.filter(ex => ex.group_id == groupId);
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(ex => 
            ex.name.toLowerCase().includes(query) || 
            ex.description?.toLowerCase().includes(query)
        );
    }

    if ((searchQuery || groupId) && filtered.length > 0) {
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = filtered.map(ex => `
            <div class="exercise-result-item" data-id="${ex.id}" style="padding: 10px 12px; border-bottom: 1px solid var(--border); cursor: pointer;">
                <div style="font-weight: bold;">${escapeHTML(ex.name)}</div>
                <div style="font-size: 0.8rem; color: var(--text-light);">${escapeHTML(ex.description?.substring(0, 40) || '')}...</div>
            </div>
        `).join('');
    } else {
        resultsContainer.style.display = 'none';
    }

    if (store.selectedExercise) renderSets();
}

// Global delegated listener for exercise selection
document.getElementById('logger-exercise-results')?.addEventListener('click', (e) => {
    const item = e.target.closest('.exercise-result-item');
    if (!item) return;
    
    const ex = store.EXERCISES.find(e => e.id == item.dataset.id);
    document.getElementById('logger-exercise-search').value = '';
    document.getElementById('logger-exercise-results').style.display = 'none';
    selectExerciseFromResults(ex);
});

// --- EXERCISE & SET MANAGEMENT ---

export function selectExerciseForLogging(id) {
    const ex = store.EXERCISES.find(e => e.id === id);
    if (ex) {
        document.getElementById('select-exercise').value = ex.group_id;
        document.getElementById('logger-exercise-search').value = '';
        selectExerciseFromResults(ex);
    }
    showView('logger');
}

export function selectExerciseFromResults(ex) {
    store.selectedExercise = ex;
    document.getElementById('select-exercise').value = ex.group_id;
    
    const info = document.getElementById('exercise-info');
    if (info) {
        info.innerHTML = `
            <strong style="font-size: 1.2rem;">${escapeHTML(ex.name)}</strong><br>
            ${escapeHTML(ex.description || '')}<br>
            <small>Equipment: ${escapeHTML(ex.equipment || '')}</small>
        `;
    }

    let activeEx = store.currentWorkoutExercises.find(item => item.id === ex.id);
    if (!activeEx) {
        activeEx = {
            ...ex,
            exerciseName: ex.name,
            sets: [{ weight: '', reps: '', unit: getExerciseUnit(ex.id), completed: false }]
        };
        store.currentWorkoutExercises.push(activeEx);
    }

    // Direct reference - no manual syncing required later
    store.currentSets = activeEx.sets; 
    
    renderSets();
    renderWorkoutList();
}

export function renderSets() {
    const container = document.getElementById('sets-container');
    if (!container || !store.selectedExercise) return;
    
    const unit = getExerciseUnit(store.selectedExercise.id);
    container.innerHTML = store.currentSets.map((set, i) => `
        <div class="set-row ${set.completed ? 'completed' : ''}" style="display: flex; align-items: center; gap: 8px;">
            <span class="set-label ${set.completed ? 'completed' : ''}" style="width: 50px; flex-shrink: 0; user-select: none;">Set ${i + 1}</span>
            <input type="number" class="weight-input" data-index="${i}" placeholder="Weight" value="${set.weight}" style="flex: 1; min-width: 0;">
            <button class="btn toggle-unit-btn" data-index="${i}" style="padding: 8px 12px;">${unit === 'kg' ? 'lb' : 'kg'}</button>
            <input type="number" class="reps-input" data-index="${i}" placeholder="Reps" value="${set.reps}" style="flex: 1; min-width: 0;">
            <button class="btn remove-set-btn" data-index="${i}" style="padding: 8px 12px;">×</button>
        </div>
    `).join('');
}

// Delegated events for Sets Container (Replaces individual loops)
document.getElementById('sets-container')?.addEventListener('input', (e) => {
    const index = e.target.dataset.index;
    if (e.target.classList.contains('weight-input')) store.currentSets[index].weight = e.target.value;
    if (e.target.classList.contains('reps-input')) store.currentSets[index].reps = e.target.value;
    renderWorkoutList(); // Keep side-list dots updated
});

export function addSet() {
    if (!store.selectedExercise) return;
    const last = store.currentSets.at(-1) || { weight: '', reps: '' };
    store.currentSets.push({ 
        weight: last.weight || 0, 
        reps: last.reps, 
        unit: getExerciseUnit(store.selectedExercise.id),
        completed: false
    });
    renderSets();
    renderWorkoutList();
}

export function toggleSetCompletion(index) {
    store.currentSets[index].completed = !store.currentSets[index].completed;
    renderSets(); 
    renderWorkoutList();
}

export function toggleUnit() {
    if (!store.selectedExercise) return;
    const newUnit = getExerciseUnit(store.selectedExercise.id) === 'kg' ? 'lb' : 'kg';
    setExerciseUnit(store.selectedExercise.id, newUnit);
    store.currentSets.forEach(set => set.unit = newUnit);
    renderSets();
}

export function removeSet(index) {
    store.currentSets.splice(index, 1);
    renderSets();
    renderWorkoutList();
}

// --- WORKOUT LIST & DRAG/DROP ---

export function renderWorkoutList() {
    const list = document.getElementById('workout-exercises-list');
    if (!list) return;
    
    list.innerHTML = store.currentWorkoutExercises.map((ex, index) => {
        const dots = (ex.sets || []).map(set => 
            `<span style="width: 6px; height: 6px; border-radius: 2px; background-color: ${set.completed ? '#22c55e' : '#94a3b8'}; margin-left: 2px; display: inline-block;"></span>`
        ).join('');

        return `
            <div class="card workout-ex-card" draggable="true" data-index="${index}" style="padding: 8px 12px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <span style="font-size: 0.9rem;">${escapeHTML(ex.exerciseName)} <span style="display: flex; gap: 2px; margin-left: 8px;">${dots}</span></span>
                <button class="btn remove-ex-btn" data-index="${index}" style="padding: 4px 8px; background: #ef4444; color: white;">×</button>
            </div>
        `;
    }).join('');

    // Reattach drag events
    list.querySelectorAll('.workout-ex-card').forEach(card => {
        const idx = Number(card.dataset.index);
        card.ondragstart = (e) => { store.draggedIndex = idx; e.currentTarget.style.opacity = '0.5'; };
        card.ondragover = (e) => e.preventDefault();
        card.ondrop = (e) => {
            e.preventDefault();
            if (store.draggedIndex === null || store.draggedIndex === idx) return;
            const moved = store.currentWorkoutExercises.splice(store.draggedIndex, 1)[0];
            store.currentWorkoutExercises.splice(idx, 0, moved);
            renderWorkoutList();
        };
        card.ondragend = (e) => { e.currentTarget.style.opacity = '1'; store.draggedIndex = null; };
    });
}

export function removeExerciseFromWorkout(index) {
    const removedId = store.currentWorkoutExercises[index].id;
    store.currentWorkoutExercises.splice(index, 1);
    
    if (store.selectedExercise?.id === removedId) {
        store.selectedExercise = null;
        store.currentSets = [];
        document.getElementById('exercise-info').innerHTML = '';
        document.getElementById('select-exercise').value = "";
        updateLoggerUI();
    }
    renderWorkoutList();
}

export function selectExerciseFromList(index) {
    const exData = store.currentWorkoutExercises[index];
    const ex = store.EXERCISES.find(e => e.id === exData.id);
    if (ex) selectExerciseFromResults(ex);
}

// Deprecated due to direct state mapping, kept for backward compatibility if called externally
export const syncCurrentSetsToList = () => renderWorkoutList();
export const addExerciseToWorkout = () => renderWorkoutList(); 

// --- STORAGE ---

export function saveWorkout() {
    const cleanExercises = store.currentWorkoutExercises
        .map(ex => ({ ...ex, sets: ex.sets.filter(s => s.weight !== '' && s.reps !== '') }))
        .filter(ex => ex.sets.length > 0);

    if (!cleanExercises.length) return showToast("Please add at least one valid set.", "error");

    const newWorkout = {
        id: generateId(),
        name: document.getElementById('workout-name-input').value || "Untitled Workout",
        date: new Date().toLocaleString(),
        exercises: cleanExercises
    };

    let history = JSON.parse(localStorage.getItem('gym_history') || '[]');
    history = [newWorkout, ...history].slice(0, 100);
    localStorage.setItem('gym_history', JSON.stringify(history));
    
    // Reset state
    store.currentWorkoutExercises = [];
    store.currentSets = [];
    store.selectedExercise = null;
    document.getElementById('workout-name-input').value = "";
    document.getElementById('select-exercise').value = "";
    document.getElementById('exercise-info').innerHTML = '';
    
    showToast("Workout saved!");
    renderWorkoutList(); 
    updateLoggerUI();
    showView('history');
    loadHistory();
}

export function repeatWorkout(workout) {
    if (!workout?.exercises?.length) return showToast("Incompatible workout record.", "error");

    store.currentWorkoutExercises = workout.exercises.map(ex => {
        const originalEx = store.EXERCISES.find(e => e.id === ex.id);
        return {
            ...ex,
            ...originalEx, // Inherit base properties 
            sets: ex.sets.map(set => ({ ...set, completed: false }))
        };
    }).filter(ex => ex.name); // Ensure exercise still exists in database

    if (store.currentWorkoutExercises.length) {
        document.getElementById('workout-name-input').value = workout.name || "Repeated Workout";
        selectExerciseFromResults(store.currentWorkoutExercises[0]); // Selects the first one automatically
        showView('logger');
    }
}
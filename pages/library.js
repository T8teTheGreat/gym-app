// pages/library.js
import { store } from '../store.js';
import { escapeHTML } from '../utils.js';
import { selectExerciseForLogging } from './logger.js';

export function populateMuscleFilter() {
    const muscleFilter = document.getElementById('muscle-filter');
    const muscles = new Set();
    store.EXERCISES.forEach(ex => {
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

export function renderLibrary(exercises) {
    const libraryGrid = document.getElementById('library-grid');
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

export function filterLibrary() {
    const searchInput = document.getElementById('search-input');
    const muscleFilter = document.getElementById('muscle-filter');
    const query = searchInput.value.toLowerCase();
    const muscle = muscleFilter.value;

    const filtered = store.EXERCISES.filter(ex => {
        const matchesSearch = ex.name.toLowerCase().includes(query) || ex.description.toLowerCase().includes(query);
        const matchesMuscle = muscle === 'all' || ex.primary_muscles.includes(muscle) || ex.secondary_muscles.includes(muscle);
        return matchesSearch && matchesMuscle;
    });
    renderLibrary(filtered);
}

// app.js
import { store } from './store.js';
import { showView } from './navigation.js';
import { populateMuscleFilter, renderLibrary, filterLibrary } from './pages/library.js';
import { 
    populateExerciseDropdown, updateLoggerUI, toggleSetCompletion, 
    toggleUnit, removeSet, syncCurrentSetsToList, removeExerciseFromWorkout, 
    selectExerciseFromList, addExerciseToWorkout, addSet, saveWorkout 
} from './pages/logger.js';
import { loadHistory } from './pages/history.js';

function init() {
    try {
        if (typeof EXERCISES_DATA === 'undefined') {
            throw new Error('EXERCISES_DATA not found. Make sure data/exercises.js is loaded before app.js.');
        }

        store.EXERCISES = EXERCISES_DATA;
        
        const selectExercise = document.getElementById('select-exercise');
        const loggerExerciseSearch = document.getElementById('logger-exercise-search');
        const setsContainer = document.getElementById('sets-container');
        const workoutExercisesList = document.getElementById('workout-exercises-list');

        selectExercise.addEventListener('change', () => {
            if (loggerExerciseSearch) loggerExerciseSearch.value = '';
            store.currentSets = [];
            updateLoggerUI();
        });
        
        if (loggerExerciseSearch) {
            loggerExerciseSearch.addEventListener('input', () => updateLoggerUI());
        }

        setsContainer.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            if (isNaN(index)) return;
            
            if (e.target.classList.contains('weight-input')) {
                store.currentSets[index].weight = e.target.value === '' ? '' : Number(e.target.value);
                syncCurrentSetsToList();
            } else if (e.target.classList.contains('reps-input')) {
                store.currentSets[index].reps = e.target.value === '' ? '' : Number(e.target.value);
                syncCurrentSetsToList();
            }
        });

        setsContainer.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            if (isNaN(index)) return;

            if (e.target.classList.contains('set-label')) toggleSetCompletion(index);
            else if (e.target.classList.contains('toggle-unit-btn')) toggleUnit(index);
            else if (e.target.classList.contains('remove-set-btn')) removeSet(index);
        });

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

        // Attach global button events dynamically replacing inline HTML events
        document.getElementById('search-input').addEventListener('input', filterLibrary);
        document.getElementById('muscle-filter').addEventListener('change', filterLibrary);
        document.getElementById('add-set-btn')?.addEventListener('click', addSet);
        document.getElementById('add-exercise-btn')?.addEventListener('click', addExerciseToWorkout);
        document.getElementById('save-workout-btn')?.addEventListener('click', saveWorkout);

        populateMuscleFilter();
        renderLibrary(store.EXERCISES);
        populateExerciseDropdown();
        loadHistory();
        updateLoggerUI();
        showView('logger');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Bootstrap Application
init();

// Map UI view switching to the global window object to attach to navigation buttons
window.showView = showView;
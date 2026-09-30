import { EXERCISES_DATA } from './data/exercises.js';
import { store } from './store.js';
import { showView } from './navigation.js';
import { populateMuscleFilter, renderLibrary, filterLibrary } from './pages/library.js';
import { 
    updateLoggerUI, toggleSetCompletion, 
    toggleUnit, removeSet, syncCurrentSetsToList, removeExerciseFromWorkout, 
    selectExerciseFromList, addSet, saveWorkout 
} from './pages/logger.js';
import { loadHistory } from './pages/history.js';

function init() {
    try {
        store.EXERCISES = EXERCISES_DATA;
        
        const loggerExerciseSearch = document.getElementById('logger-exercise-search');
        const setsContainer = document.getElementById('sets-container');
        const workoutExercisesList = document.getElementById('workout-exercises-list');

        // Bind input event so typing triggers logger UI update instantly
        if (loggerExerciseSearch) {
            loggerExerciseSearch.addEventListener('input', (e) => {
                updateLoggerUI(e.target.value);
            });
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

        document.getElementById('search-input').addEventListener('input', filterLibrary);
        document.getElementById('muscle-filter').addEventListener('change', filterLibrary);
        document.getElementById('add-set-btn')?.addEventListener('click', addSet);
        document.getElementById('save-workout-btn')?.addEventListener('click', saveWorkout);

        populateMuscleFilter();
        renderLibrary(store.EXERCISES);
        loadHistory();
        updateLoggerUI();
        showView('logger');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

init();

window.showView = showView;
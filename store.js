export const store = {
    EXERCISES: [],
    currentSets: [],
    selectedExercise: null,
    currentWorkoutExercises: [],
    draggedIndex: null
};

export function getExerciseUnit(exerciseId) {
    const units = JSON.parse(localStorage.getItem('exercise_units') || '{}');
    return units[exerciseId] || 'kg';
}

export function setExerciseUnit(exerciseId, unit) {
    const units = JSON.parse(localStorage.getItem('exercise_units') || '{}');
    units[exerciseId] = unit;
    localStorage.setItem('exercise_units', JSON.stringify(units));
}
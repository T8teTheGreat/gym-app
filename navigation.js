// navigation.js
export function showView(viewId) {
    document.getElementById('view-library').classList.add('hidden');
    document.getElementById('view-logger').classList.add('hidden');
    document.getElementById('view-history').classList.add('hidden');
    
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    
    const titleMap = {
        'library': 'Library',
        'logger': 'Log Workout',
        'history': 'History'
    };
    document.getElementById('view-title').textContent = titleMap[viewId];

    document.body.classList.toggle('show-history-toggle', viewId === 'history');

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const navMap = {
        'library': 'nav-lib',
        'logger': 'nav-log',
        'history': 'nav-hist'
    };
    document.getElementById(navMap[viewId]).classList.add('active');
}

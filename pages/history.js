// pages/history.js
import { escapeHTML } from '../utils.js';
import { repeatWorkout } from './logger.js';

export function loadHistory() {
    const historyList = document.getElementById('history-list');
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

        card.onclick = () => {
            if (details.classList.contains('hidden')) {
                details.classList.remove('hidden');
            }
        };

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

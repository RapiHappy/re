document.addEventListener('DOMContentLoaded', () => {
    let draggedIndex = null;

    // Делегирование событий на document
    document.addEventListener('dragstart', (e) => {
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;
        
        const location = cell.getAttribute('data-location');
        // Перетаскивать можно только из инвентаря
        if (location !== 'inventory') {
            e.preventDefault();
            return;
        }
        
        draggedIndex = parseInt(cell.getAttribute('data-index'), 10);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedIndex); // Firefox fix
    });

    const slots = [document.getElementById('slot-1'), document.getElementById('slot-2')];
    
    slots.forEach((slot, targetIndex) => {
        if (!slot) return;
        
        slot.addEventListener('dragover', (e) => {
            e.preventDefault(); // ОБЯЗАТЕЛЬНО, иначе drop не сработает
            e.dataTransfer.dropEffect = 'move';
            slot.style.boxShadow = '0 0 15px rgba(0, 255, 204, 0.6)';
        });
        
        slot.addEventListener('dragleave', (e) => {
            slot.style.boxShadow = '';
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.style.boxShadow = '';
            
            if (draggedIndex !== null && typeof window.gameState !== 'undefined') {
                const monsterId = window.gameState.inventory[draggedIndex];
                if (!monsterId) return;

                const monsterTemplate = window.monstersDB[monsterId];
                if (!monsterTemplate) return;

                // Если слот уже занят, возвращаем монстра обратно в инвентарь
                const existingOccupant = window.gameState.incubator[targetIndex];
                if (existingOccupant) {
                    window.gameState.inventory[draggedIndex] = existingOccupant;
                } else {
                    window.gameState.inventory[draggedIndex] = null;
                }

                // Визуально копируем картинку монстра в слот
                slot.innerHTML = `<img src="${monsterTemplate.image_url}" alt="${monsterTemplate.name}" style="width: 75%; height: 75%; object-fit: contain; pointer-events: none;" draggable="false">`;
                
                // Записываем данные в логику Инкубатора
                window.gameState.incubator[targetIndex] = monsterId;
                
                // Перерисовываем сетку, чтобы обновить инвентарь
                if (typeof renderGrid === 'function') {
                    renderGrid();
                }
                
                // Активируем кнопку, если оба слота заняты
                const btnMerge = document.getElementById('btn-merge');
                if (btnMerge) {
                    if (window.gameState.incubator[0] && window.gameState.incubator[1]) {
                        btnMerge.disabled = false;
                    } else {
                        btnMerge.disabled = true;
                    }
                }
                
                draggedIndex = null;
            }
        });
    });
});

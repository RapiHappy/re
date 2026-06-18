export function initDragDrop({ onDrop }) {
    let draggedIndex = null;

    document.addEventListener('dragstart', (e) => {
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;
        
        const location = cell.getAttribute('data-location');
        // Скрещивание внутри инвентаря отключено, перетаскивать можно ТОЛЬКО из #grid
        if (location !== 'inventory') {
            e.preventDefault();
            return;
        }
        
        draggedIndex = parseInt(cell.getAttribute('data-index'), 10);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedIndex); // Firefox fix
    });

    const slots = [document.getElementById('slot-1'), document.getElementById('slot-2')];
    
    slots.forEach((slot, index) => {
        if (!slot) return;
        
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            slot.style.boxShadow = '0 0 15px rgba(0, 255, 204, 0.6)'; // visual feedback
        });
        
        slot.addEventListener('dragleave', (e) => {
            slot.style.boxShadow = '';
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.style.boxShadow = '';
            
            if (draggedIndex !== null) {
                onDrop(draggedIndex, index);
                draggedIndex = null;
            }
        });
    });
}

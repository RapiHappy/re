import { tryMerge } from './mergeLogic.js';
import { initDragDrop } from './dragDrop.js';

let state = {
    monstersDB: {},
    inventory: Array(20).fill(null),
    incubator: [null, null],
    dna: 0,
    gold: 0,
    income: 0
};

// DOM Elements
const gridEl = document.getElementById('grid');
const slot1El = document.getElementById('slot-1');
const slot2El = document.getElementById('slot-2');
const btnMerge = document.getElementById('btn-merge');
const incomeRateEl = document.getElementById('income-rate');

async function init() {
    try {
        const response = await fetch('monsters_db.json');
        const data = await response.json();
        
        data.forEach(m => {
            state.monstersDB[m.id] = m;
        });

        // Initialize with some starter monsters
        addMonsterToInventory('fire_1');
        addMonsterToInventory('water_1');

        renderUI();
        
        initDragDrop({
            onDrop: handleDrop
        });

    } catch (e) {
        console.error("Failed to load monsters_db.json", e);
    }
}

function addMonsterToInventory(id) {
    const template = state.monstersDB[id];
    if (!template) return false;

    const emptyIndex = state.inventory.indexOf(null);
    if (emptyIndex !== -1) {
        state.inventory[emptyIndex] = { ...template };
        return true;
    }
    return false;
}

function calculateIncome() {
    let total = 0;
    state.inventory.forEach(m => {
        if (m && m.income) total += m.income;
    });
    return total;
}

export function renderUI() {
    renderGrid();
    renderIncubator();
    
    // Update income
    const income = calculateIncome();
    if (incomeRateEl) {
        incomeRateEl.textContent = `+${income.toFixed(1)}/c`;
    }
    
    // Update merge button state
    if (btnMerge) {
        if (state.incubator[0] && state.incubator[1]) {
            btnMerge.disabled = false;
        } else {
            btnMerge.disabled = true;
        }
    }
}

function createMonsterElement(monster, index, location) {
    const el = document.createElement('div');
    el.className = `grid-cell rarity-${monster.rarity}`;
    el.setAttribute('data-index', index);
    el.setAttribute('data-location', location);
    
    const img = document.createElement('img');
    img.src = monster.image_url;
    img.alt = monster.name;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.pointerEvents = 'none'; // ensure drag starts on cell
    el.appendChild(img);
    
    const name = document.createElement('span');
    name.className = 'monster-name';
    name.textContent = `Ур.${monster.tier} ${monster.name}`;
    el.appendChild(name);
    
    el.draggable = true;
    return el;
}

function renderGrid() {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    
    for (let i = 0; i < 20; i++) {
        const monster = state.inventory[i];
        if (monster) {
            gridEl.appendChild(createMonsterElement(monster, i, 'inventory'));
        } else {
            const el = document.createElement('div');
            el.className = 'grid-cell';
            const placeholder = document.createElement('div');
            placeholder.className = 'monster-placeholder';
            el.appendChild(placeholder);
            gridEl.appendChild(el);
        }
    }
}

function renderIncubator() {
    const slots = [slot1El, slot2El];
    slots.forEach((slot, i) => {
        if (!slot) return;
        slot.innerHTML = '';
        const monster = state.incubator[i];
        
        if (monster) {
            const el = createMonsterElement(monster, i, 'incubator');
            el.draggable = false; // Only allow dragging from grid
            
            // Allow returning to inventory on click
            el.addEventListener('click', () => {
                const emptyIndex = state.inventory.indexOf(null);
                if (emptyIndex !== -1) {
                    state.inventory[emptyIndex] = state.incubator[i];
                    state.incubator[i] = null;
                    renderUI();
                }
            });
            
            slot.appendChild(el);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'slot-placeholder';
            placeholder.textContent = '+';
            slot.appendChild(placeholder);
        }
    });
}

function handleDrop(sourceIndex, targetIndex) {
    const monster = state.inventory[sourceIndex];
    if (!monster) return;
    
    // If the incubator slot is already occupied, swap them back to the inventory
    if (state.incubator[targetIndex]) {
        state.inventory[sourceIndex] = state.incubator[targetIndex];
    } else {
        state.inventory[sourceIndex] = null;
    }
    
    state.incubator[targetIndex] = monster;
    renderUI();
}

if (btnMerge) {
    btnMerge.addEventListener('click', () => {
        const m1 = state.incubator[0];
        const m2 = state.incubator[1];
        
        if (!m1 || !m2) return;
        
        const newId = tryMerge(m1, m2);
        
        if (newId) {
            // Flash animation on slots
            if (slot1El) {
                slot1El.style.transition = 'background-color 0.2s, filter 0.2s';
                slot1El.style.filter = 'brightness(2) contrast(1.5)';
            }
            if (slot2El) {
                slot2El.style.transition = 'background-color 0.2s, filter 0.2s';
                slot2El.style.filter = 'brightness(2) contrast(1.5)';
            }
            
            setTimeout(() => {
                if (slot1El) slot1El.style.filter = '';
                if (slot2El) slot2El.style.filter = '';
                
                // Clear slots, add to inventory
                state.incubator = [null, null];
                addMonsterToInventory(newId);
                renderUI();
            }, 300);
            
        } else {
            // Visual shake for failure
            btnMerge.style.transition = 'transform 0.1s';
            btnMerge.style.transform = 'translateX(-5px)';
            setTimeout(() => btnMerge.style.transform = 'translateX(5px)', 50);
            setTimeout(() => btnMerge.style.transform = 'translateX(0)', 100);
            
            // Optionally, return elements to inventory
            setTimeout(() => {
                const empty1 = state.inventory.indexOf(null);
                if (empty1 !== -1) { state.inventory[empty1] = state.incubator[0]; state.incubator[0] = null; }
                const empty2 = state.inventory.indexOf(null);
                if (empty2 !== -1) { state.inventory[empty2] = state.incubator[1]; state.incubator[1] = null; }
                renderUI();
            }, 500);
        }
    });
}

// Start execution
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

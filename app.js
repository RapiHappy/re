function renderGrid() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    grid.innerHTML = ''; // Полностью очищаем контейнер перед рендером

    // Жестко генерируем 20 ячеек (индексы от 0 до 19)
    for (let i = 0; i < 20; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;

        // Проверяем, есть ли монстр в инвентаре на этой позиции
        // (Предполагается, что gameState.inventory - это массив)
        const monsterId = (typeof gameState !== 'undefined' && gameState.inventory) ? gameState.inventory[i] : null;

        if (monsterId && typeof monstersDB !== 'undefined' && monstersDB[monsterId]) {
            // Если монстр есть — рендерим его карточку с картинкой
            const monster = monstersDB[monsterId];
            cell.classList.add(`rarity-${monster.rarity}`);
            cell.setAttribute('draggable', 'true');
            cell.dataset.id = monster.id;
            cell.dataset.location = 'inventory';

            cell.innerHTML = `
                <img src="${monster.image_url}" alt="${monster.name}" style="width: 75%; height: 75%; object-fit: contain; pointer-events: none;" draggable="false">
                <span class="monster-name">Ур.${monster.tier} ${monster.name}</span>
            `;
        } else {
            // Если пусто — рендерим красивую темную заглушку
            cell.innerHTML = `<div class="monster-placeholder"></div>`;
        }

        grid.appendChild(cell);
    }
}

// Глобальное состояние игры
window.gameState = {
    inventory: Array(20).fill(null),
    incubator: [null, null],
    dna: 0,
    gold: 0
};
window.monstersDB = {};

// Инициализация игры
async function initGame() {
    try {
        // Загрузка базы монстров
        const res = await fetch('monsters_db.json');
        const data = await res.json();
        data.forEach(m => window.monstersDB[m.id] = m);

        // Загрузка сохранений
        await loadProgress();

        // 1. Проверка на Стартовый набор (Starter Pack)
        const isEmpty = window.gameState.inventory.every(slot => slot === null);
        
        if (isEmpty) {
            window.gameState.inventory[0] = 'fire_1';
            window.gameState.inventory[1] = 'water_1';
            window.gameState.inventory[2] = 'nature_1';
            window.gameState.inventory[3] = 'mech_1';
            
            // 3. Сохранение прогресса после выдачи стартового набора
            await saveProgress();
        }

        // 2. Рендер сетки
        renderGrid();

    } catch (e) {
        console.error("Ошибка инициализации игры:", e);
    }
}

// Загрузка прогресса (Cloud + Local fallback)
async function loadProgress() {
    let loadedData = null;
    
    if (typeof window.ysdk !== 'undefined' && window.ysdk.getPlayer) {
        try {
            const player = await window.ysdk.getPlayer({ scopes: false });
            loadedData = await player.getData();
        } catch (e) {
            console.warn("Cloud load failed, fallback to local.");
        }
    }
    
    if (!loadedData || Object.keys(loadedData).length === 0) {
        const local = localStorage.getItem('monsterLabState');
        if (local) {
            loadedData = JSON.parse(local);
        }
    }

    if (loadedData && loadedData.inventory) {
        window.gameState = loadedData;
    }
}

// Сохранение прогресса (Cloud + Local fallback)
async function saveProgress() {
    if (typeof window.ysdk !== 'undefined' && window.ysdk.getPlayer) {
        try {
            const player = await window.ysdk.getPlayer({ scopes: false });
            await player.setData(window.gameState, true);
            return;
        } catch (e) {
            console.warn("Cloud save failed, fallback to local.");
        }
    }
    
    localStorage.setItem('monsterLabState', JSON.stringify(window.gameState));
}

// Запуск инициализации после загрузки страницы
window.addEventListener('DOMContentLoaded', () => {
    // Ждем инициализации Яндекс SDK, если он есть
    if (typeof initYandex === 'function') {
        initYandex().then(() => initGame());
    } else {
        initGame();
    }
});
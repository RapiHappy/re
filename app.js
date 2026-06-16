// Main Orchestrator for "Monster Lab: Evolution" (Yandex Games Version)
import { state, loadDatabases, loadGameState, saveGameState, createMonster } from './gameState.js';
import { attemptMerge } from './mergeLogic.js';
import { initDragDrop } from './dragDrop.js';
import { calculateOfflineProgress, startGameLoop, collectOfflineProfit } from './gameLoop.js';
import { initYandex, registerSuccessfulMerge } from './yandexApi.js';

// DOM Elements
const gridContainer = document.getElementById("grid-container");
const coinsDisplay = document.getElementById("coins-display");
const dnaDisplay = document.getElementById("dna-display");
const incomeDisplay = document.getElementById("income-display");
const offlineAlert = document.getElementById("offline-alert");
const offlineAmountDisplay = document.getElementById("offline-amount");
const collectBtn = document.getElementById("collect-btn");
const userNameDisplay = document.getElementById("user-name");
const userLevelDisplay = document.getElementById("user-level");
const xpBar = document.getElementById("xp-bar");
const collectionDisplay = document.getElementById("collection-display");

// Modal Elements
const albumModal = document.getElementById("album-modal");
const shopModal = document.getElementById("shop-modal");
const btnAlbum = document.getElementById("btn-album");
const btnShop = document.getElementById("btn-shop");
const closeAlbum = document.getElementById("close-album");
const closeShop = document.getElementById("close-shop");
const albumGrid = document.getElementById("album-grid");
const shopList = document.getElementById("shop-list");
const unlockedCountDisplay = document.getElementById("unlocked-count");

// Incubator elements
const mergeBtn = document.getElementById("merge-btn");

/**
 * Display premium sci-fi Toast messages.
 */
export function showToast(message, type = 'error') {
    const container = document.getElementById("toast-container");
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Trigger reflow
    toast.offsetHeight;
    
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2000);
}

function renderGrid() {
    gridContainer.innerHTML = "";
    
    state.monsters.forEach((monster, index) => {
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        cell.setAttribute("data-index", index);
        
        if (monster) {
            const card = document.createElement("div");
            card.className = `monster-card rarity-${monster.rarity || 'common'}`;
            
            const imgEl = document.createElement("img");
            imgEl.className = "monster-sprite";
            imgEl.style.opacity = "0"; // Smooth fade-in, prevents broken image icon flash
            imgEl.src = monster.imageUrl;
            imgEl.alt = monster.name;
            imgEl.onload = () => {
                imgEl.style.opacity = "1";
            };
            imgEl.onerror = () => {
                // Set minimalist dark-gray circle fallback SVG
                imgEl.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='35' fill='%23222430'/></svg>";
                imgEl.style.backgroundColor = "transparent";
                imgEl.style.boxShadow = "none";
                imgEl.style.opacity = "1";
            };
            card.appendChild(imgEl);
            
            const nameEl = document.createElement("span");
            nameEl.className = "monster-level-badge";
            nameEl.textContent = `Ур.${monster.level} ${monster.name}`;
            card.appendChild(nameEl);
            
            cell.appendChild(card);
        }
        
        gridContainer.appendChild(cell);
    });
}

function renderIncubator() {
    for (let index = 0; index < 2; index++) {
        const slotEl = document.getElementById(`incubator-${index + 1}`);
        if (!slotEl) continue;
        
        slotEl.innerHTML = "";
        const monster = state.incubator[index];
        
        if (monster) {
            const card = document.createElement("div");
            card.className = `monster-card rarity-${monster.rarity || 'common'}`;
            
            const imgEl = document.createElement("img");
            imgEl.className = "monster-sprite";
            imgEl.style.opacity = "0";
            imgEl.src = monster.imageUrl;
            imgEl.alt = monster.name;
            imgEl.onload = () => {
                imgEl.style.opacity = "1";
            };
            imgEl.onerror = () => {
                imgEl.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='35' fill='%23222430'/></svg>";
                imgEl.style.backgroundColor = "transparent";
                imgEl.style.boxShadow = "none";
                imgEl.style.opacity = "1";
            };
            card.appendChild(imgEl);
            
            const nameEl = document.createElement("span");
            nameEl.className = "monster-level-badge";
            nameEl.textContent = `Ур.${monster.level} ${monster.name}`;
            card.appendChild(nameEl);
            
            slotEl.appendChild(card);
        } else {
            // Re-render empty bubble animations if slots are empty
            const bubbles = document.createElement("div");
            bubbles.className = "bubble-container";
            bubbles.innerHTML = `
                <span style="--i:1;"></span>
                <span style="--i:2;"></span>
                <span style="--i:3;"></span>
            `;
            slotEl.appendChild(bubbles);
        }
    }
}

function updateMergeButton() {
    const isBothFull = state.incubator[0] !== null && state.incubator[1] !== null;
    mergeBtn.disabled = !isBothFull;
}

function updateUIValues() {
    coinsDisplay.textContent = Math.floor(state.coins).toLocaleString();
    dnaDisplay.textContent = Math.floor(state.dna).toLocaleString();
    
    if (userLevelDisplay) {
        userLevelDisplay.textContent = state.level;
    }
    
    if (xpBar) {
        const xpNeeded = state.level * 100;
        const xpPercent = Math.min(100, (state.xp / xpNeeded) * 100);
        xpBar.style.width = `${xpPercent}%`;
    }
    
    if (collectionDisplay) {
        const totalSpecies = Object.keys(state.monstersDB).length;
        const unlockedSpecies = state.unlocked.length;
        collectionDisplay.textContent = `${unlockedSpecies}/${totalSpecies} 🧬`;
    }
    
    // Mapped Stage 4 requirement: Recalculate and update Gold Income rate instantly on state change
    let currentIncomePerSecond = 0;
    state.monsters.forEach(monster => {
        if (monster) {
            currentIncomePerSecond += monster.baseIncome || 0;
        }
    });
    if (incomeDisplay) {
        incomeDisplay.textContent = `+${currentIncomePerSecond.toFixed(1)}/с 🪙`;
    }
}

function handleDrop(source, target) {
    // Limit to: source must be inventory and target must be incubator
    if (source.type !== "inventory" || target.type !== "incubator") return;
    
    const sourceCard = state.monsters[source.index];
    if (!sourceCard) return;
    
    const targetCard = state.incubator[target.index];
    
    // Save original index so we can return the monster if needed
    sourceCard.fromInventoryIndex = source.index;
    
    // If incubator slot was occupied, return the occupant to its original slot or another free cell
    if (targetCard) {
        let returnIndex = targetCard.fromInventoryIndex;
        if (returnIndex === undefined || state.monsters[returnIndex] !== null) {
            returnIndex = state.monsters.findIndex(m => m === null);
        }
        if (returnIndex !== -1) {
            state.monsters[returnIndex] = targetCard;
            delete targetCard.fromInventoryIndex;
        }
    }
    
    state.monsters[source.index] = null;
    state.incubator[target.index] = sourceCard;
    
    saveGameState();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
    renderGrid();
    renderIncubator();
    updateMergeButton();
    updateUIValues();
}

function handleMergeClick() {
    const elementA = state.incubator[0];
    const elementB = state.incubator[1];
    
    if (!elementA || !elementB) {
        showToast("Поместите два элемента в инкубатор для скрещивания.");
        return;
    }
    
    // Add programmatic pressed state (scale 0.95 visual click)
    mergeBtn.classList.add("pressed");
    
    const result = attemptMerge(elementA, elementB);
    
    if (!result.success) {
        // Play failure shake VFX on the button
        mergeBtn.classList.add("shake");
        showToast("Эксперимент не удался", "error");
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(100);
        
        // Return monsters to their original locations in the inventory
        for (let i = 0; i < 2; i++) {
            const monster = state.incubator[i];
            if (monster) {
                let targetIdx = monster.fromInventoryIndex;
                if (targetIdx === undefined || state.monsters[targetIdx] !== null) {
                    targetIdx = state.monsters.findIndex(m => m === null);
                }
                if (targetIdx !== -1) {
                    state.monsters[targetIdx] = monster;
                    delete monster.fromInventoryIndex;
                }
                state.incubator[i] = null;
            }
        }
        
        // Wait and cleanup classes
        setTimeout(() => {
            mergeBtn.classList.remove("pressed", "shake");
            saveGameState();
            renderGrid();
            renderIncubator();
            updateMergeButton();
            updateUIValues();
        }, 400);
        return;
    }
    
    // Check if we have space in inventory for the result
    const freeIndex = state.monsters.findIndex(m => m === null);
    if (freeIndex === -1) {
        mergeBtn.classList.remove("pressed");
        showToast("Лаборатория переполнена! Освободите место в инвентаре.");
        return;
    }
    
    // Success: trigger flash overlay animation in incubator
    const flashOverlay = document.getElementById("flash-overlay");
    if (flashOverlay) {
        flashOverlay.classList.remove("animate-flash");
        flashOverlay.offsetHeight; // force reflow
        flashOverlay.classList.add("animate-flash");
    }
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([40, 40, 80]);
    
    // Trigger Yandex interstitial ad callback counting
    registerSuccessfulMerge();
    
    // Wait for the flash animation to finish
    setTimeout(() => {
        mergeBtn.classList.remove("pressed");
        if (flashOverlay) {
            flashOverlay.classList.remove("animate-flash");
        }
        
        // Clear slots
        state.incubator[0] = null;
        state.incubator[1] = null;
        
        // Place merged result
        state.monsters[freeIndex] = result.monster;
        
        // Rewards
        const mergedLevel = elementA.level;
        let xpGained = mergedLevel * 20;
        let dnaGained = mergedLevel * 5;
        
        if (result.isMutation) {
            xpGained *= 2;
            dnaGained *= 3;
            showToast(`🔥 МУТАЦИЯ! Вы получили: ${result.monster.name}!`, "success");
        } else if (result.isNewDiscovery) {
            showToast(`🧬 ОТКРЫТИЕ! Получен: ${result.monster.name}!`, "success");
        } else {
            showToast(`✨ Успешное скрещивание: ${result.monster.name}!`, "success");
        }
        
        state.xp += xpGained;
        state.dna += dnaGained;
        
        // Handle level up
        const xpNeeded = state.level * 100;
        if (state.xp >= xpNeeded) {
            state.xp -= xpNeeded;
            state.level += 1;
            showToast(`🎉 Уровень повышен до ${state.level}!`, "success");
        }
        
        saveGameState();
        renderGrid();
        renderIncubator();
        updateMergeButton();
        updateUIValues();
        
        // Confetti burst
        if (typeof confetti === "function") {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 }
            });
        }
    }, 450);
}

function renderAlbum() {
    albumGrid.innerHTML = "";
    const totalSpecies = Object.keys(state.monstersDB).length;
    const unlockedSpecies = state.unlocked.length;
    
    unlockedCountDisplay.textContent = `${unlockedSpecies}/${totalSpecies}`;

    Object.keys(state.monstersDB).forEach(key => {
        const monster = state.monstersDB[key];
        const isUnlocked = state.unlocked.includes(key);
        
        const item = document.createElement("div");
        item.className = "album-item";
        
        if (isUnlocked) {
            const imgEl = document.createElement("img");
            imgEl.className = "monster-sprite album-sprite";
            imgEl.src = monster.image_url;
            imgEl.alt = monster.name;
            imgEl.onerror = () => {
                imgEl.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='35' fill='%23222430'/></svg>";
                imgEl.style.backgroundColor = "transparent";
                imgEl.style.boxShadow = "none";
            };
            item.appendChild(imgEl);
            
            const name = document.createElement("div");
            name.className = "album-name";
            name.textContent = monster.name;
            item.appendChild(name);
            
            const income = document.createElement("div");
            income.className = "album-income";
            income.textContent = `+${monster.base_income.toFixed(1)}/с 🪙`;
            item.appendChild(income);
        } else {
            item.classList.add("locked");
            
            const imgEl = document.createElement("img");
            imgEl.className = "monster-sprite album-sprite";
            imgEl.src = monster.image_url;
            imgEl.alt = "Неизвестно";
            imgEl.style.filter = "brightness(0) invert(0.2)";
            imgEl.onerror = () => {
                imgEl.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='35' fill='%23222430'/></svg>";
                imgEl.style.backgroundColor = "transparent";
                imgEl.style.boxShadow = "none";
            };
            item.appendChild(imgEl);
            
            const name = document.createElement("div");
            name.className = "album-name";
            name.textContent = "Неизвестно";
            item.appendChild(name);
            
            const income = document.createElement("div");
            income.className = "album-income";
            income.textContent = "???";
            item.appendChild(income);
        }
        
        albumGrid.appendChild(item);
    });
}

function renderShop() {
    shopList.innerHTML = "";
    
    const baseElements = [
        { id: "fire_1", cost: 20, currency: "gold" },
        { id: "water_1", cost: 30, currency: "gold" },
        { id: "nature_1", cost: 45, currency: "gold" },
        { id: "mech_1", cost: 70, currency: "gold" },
        { id: "dark_1", cost: 100, currency: "gold" }
    ];
    
    const dnaElements = [
        { id: "fire_2", cost: 15, currency: "dna" },
        { id: "water_2", cost: 15, currency: "dna" },
        { id: "nature_2", cost: 15, currency: "dna" },
        { id: "mech_2", cost: 15, currency: "dna" },
        { id: "dark_2", cost: 15, currency: "dna" }
    ];
    
    const drawItem = (itemConfig) => {
        const itemTemplate = state.monstersDB[itemConfig.id];
        if (!itemTemplate) return;
        
        const shopItem = document.createElement("div");
        shopItem.className = "shop-item";
        
        const info = document.createElement("div");
        info.className = "shop-item-info";
        
        const imgEl = document.createElement("img");
        imgEl.className = "monster-sprite shop-sprite";
        imgEl.src = itemTemplate.image_url;
        imgEl.alt = itemTemplate.name;
        imgEl.onerror = () => {
            imgEl.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='35' fill='%23222430'/></svg>";
            imgEl.style.backgroundColor = "transparent";
            imgEl.style.boxShadow = "none";
        };
        info.appendChild(imgEl);
        
        const details = document.createElement("div");
        details.className = "shop-item-details";
        
        const name = document.createElement("div");
        name.className = "shop-item-name";
        name.textContent = `${itemTemplate.name} (Ур.${itemTemplate.level})`;
        details.appendChild(name);
        
        const income = document.createElement("div");
        income.className = "shop-item-income";
        income.textContent = `Доход: +${itemTemplate.base_income}/с 🪙`;
        details.appendChild(income);
        
        info.appendChild(details);
        shopItem.appendChild(info);
        
        const buyBtn = document.createElement("button");
        buyBtn.className = "shop-buy-btn";
        
        const isDna = itemConfig.currency === "dna";
        const costStr = isDna ? `${itemConfig.cost} 🧬` : `${itemConfig.cost} 💰`;
        buyBtn.textContent = `Купить (${costStr})`;
        
        const canAfford = isDna ? (state.dna >= itemConfig.cost) : (state.coins >= itemConfig.cost);
        buyBtn.disabled = !canAfford;
        
        buyBtn.addEventListener("click", () => {
            buyShopElement(itemConfig.id, itemConfig.currency, itemConfig.cost);
        });
        
        shopItem.appendChild(buyBtn);
        shopList.appendChild(shopItem);
    };
    
    const addHeader = (text) => {
        const h3 = document.createElement("h3");
        h3.style.margin = "12px 0 6px 0";
        h3.style.color = "var(--color-cyan)";
        h3.style.fontSize = "0.9rem";
        h3.style.fontFamily = "var(--font-display)";
        h3.textContent = text;
        shopList.appendChild(h3);
    };
    
    addHeader("Базовые элементы (за 💰 Золото)");
    baseElements.forEach(drawItem);
    
    addHeader("Продвинутые элементы (за 🧬 ДНК)");
    dnaElements.forEach(drawItem);
}

function buyShopElement(elementId, currencyType, cost) {
    const isDna = currencyType === "dna";
    const currentAmount = isDna ? state.dna : state.coins;
    
    if (currentAmount < cost) {
        showToast("Недостаточно средств для покупки!");
        return;
    }
    
    const emptyIndex = state.monsters.findIndex(m => m === null);
    if (emptyIndex === -1) {
        showToast("Лаборатория переполнена! Освободите место в инвентаре.");
        return;
    }
    
    if (isDna) {
        state.dna -= cost;
    } else {
        state.coins -= cost;
    }
    
    const newMonster = createMonster(elementId);
    state.monsters[emptyIndex] = newMonster;
    
    saveGameState();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
    
    renderGrid();
    renderShop();
    updateUIValues();
}

function updateUI(incomePerSecond) {
    coinsDisplay.textContent = Math.floor(state.coins).toLocaleString();
    dnaDisplay.textContent = Math.floor(state.dna).toLocaleString();
    
    // Live update income display
    if (incomeDisplay) {
        incomeDisplay.textContent = `+${incomePerSecond.toFixed(1)}/с 🪙`;
    }
    
    if (!shopModal.classList.contains("hidden")) {
        const buyBtns = shopModal.querySelectorAll(".shop-buy-btn");
        const baseElements = [
            { cost: 20, currency: "gold" },
            { cost: 30, currency: "gold" },
            { cost: 45, currency: "gold" },
            { cost: 70, currency: "gold" },
            { cost: 100, currency: "gold" }
        ];
        const dnaElements = [
            { cost: 15, currency: "dna" },
            { cost: 15, currency: "dna" },
            { cost: 15, currency: "dna" },
            { cost: 15, currency: "dna" },
            { cost: 15, currency: "dna" }
        ];
        const allItems = [...baseElements, ...dnaElements];
        buyBtns.forEach((btn, idx) => {
            const config = allItems[idx];
            if (config) {
                const canAfford = config.currency === "dna" ? (state.dna >= config.cost) : (state.coins >= config.cost);
                btn.disabled = !canAfford;
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialize Yandex SDK v2
    await initYandex();
    
    // 2. Load game data
    await loadDatabases();
    const loaded = await loadGameState();
    
    userNameDisplay.textContent = state.user.first_name || "Ученый";
    
    if (loaded) {
        console.log("Laboratory state successfully restored.");
    } else {
        console.log("Started a new monster breeding session.");
    }

    const offlineEarnings = calculateOfflineProgress(state.lastLogin, state.monsters);
    if (offlineEarnings > 0) {
        state.offlineEarnings = offlineEarnings;
        offlineAmountDisplay.textContent = Math.floor(offlineEarnings);
        offlineAlert.classList.remove("hidden");
    }

    btnAlbum.addEventListener("click", () => {
        renderAlbum();
        albumModal.classList.remove("hidden");
    });
    
    btnShop.addEventListener("click", () => {
        renderShop();
        shopModal.classList.remove("hidden");
    });
    
    closeAlbum.addEventListener("click", () => {
        albumModal.classList.add("hidden");
    });
    
    closeShop.addEventListener("click", () => {
        shopModal.classList.add("hidden");
    });
    
    window.addEventListener("click", (e) => {
        if (e.target === albumModal) albumModal.classList.add("hidden");
        if (e.target === shopModal) shopModal.classList.add("hidden");
    });

    collectBtn.addEventListener("click", () => {
        collectOfflineProfit(updateUI);
        offlineAlert.classList.add("hidden");
    });
    
    mergeBtn.addEventListener("click", handleMergeClick);
    
    // Initialize slot click events to return elements back to inventory
    for (let index = 0; index < 2; index++) {
        const slotEl = document.getElementById(`incubator-${index + 1}`);
        if (slotEl) {
            slotEl.addEventListener("click", () => {
                const monster = state.incubator[index];
                if (!monster) return;
                
                // Return monster to original cell or first empty cell
                let targetIndex = monster.fromInventoryIndex;
                if (targetIndex === undefined || state.monsters[targetIndex] !== null) {
                    targetIndex = state.monsters.findIndex(m => m === null);
                }
                
                if (targetIndex !== -1) {
                    state.monsters[targetIndex] = monster;
                    delete monster.fromInventoryIndex;
                    state.incubator[index] = null;
                    
                    saveGameState();
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
                    renderGrid();
                    renderIncubator();
                    updateMergeButton();
                    updateUIValues();
                }
            });
        }
    }
    
    renderGrid();
    renderIncubator();
    updateMergeButton();
    updateUIValues();
    
    // Initialize restricted drag & drop container
    const layoutContainer = document.querySelector(".dual-layout");
    initDragDrop(layoutContainer, handleDrop);
    
    startGameLoop(updateUI);
});

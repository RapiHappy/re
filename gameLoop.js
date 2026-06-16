// Real-time Update Loop and Offline Income Calculation
import { state, saveGameState } from './gameState.js';

let lastFrameTime = performance.now();
let autoSaveAccumulator = 0;
const AUTO_SAVE_INTERVAL = 5000; // Save state every 5 seconds

/**
 * Calculates the coins generated since the player's last session.
 * 
 * @param {number} lastLoginTimestamp - The epoch time of last save/exit
 * @param {Array} currentMonsters - The current array of monsters in grid cells
 * @returns {number} The total income accumulated offline
 */
export function calculateOfflineProgress(lastLoginTimestamp, currentMonsters) {
    if (!lastLoginTimestamp) return 0;
    
    const now = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((now - lastLoginTimestamp) / 1000));
    
    // Sum income rates of all active monsters
    let incomePerSecond = 0;
    currentMonsters.forEach(monster => {
        if (monster) {
            incomePerSecond += monster.baseIncome || 0;
        }
    });

    const offlineEarnings = elapsedSeconds * incomePerSecond;
    return offlineEarnings;
}

/**
 * Starts the requestAnimationFrame game loop.
 * 
 * @param {Function} updateUICallback - Callback to trigger standard UI redraws
 */
export function startGameLoop(updateUICallback) {
    lastFrameTime = performance.now();
    
    function loop(now) {
        // Calculate time elapsed in seconds
        const dt = (now - lastFrameTime) / 1000;
        lastFrameTime = now;
        
        // Calculate active income rate
        let currentIncomePerSecond = 0;
        state.monsters.forEach(monster => {
            if (monster) {
                currentIncomePerSecond += monster.baseIncome || 0;
            }
        });

        // Add income dynamically for smooth counters (incremental tick)
        if (currentIncomePerSecond > 0) {
            state.coins += currentIncomePerSecond * dt;
        }

        // Periodically auto-save game state
        autoSaveAccumulator += dt * 1000;
        if (autoSaveAccumulator >= AUTO_SAVE_INTERVAL) {
            saveGameState();
            autoSaveAccumulator = 0;
        }

        // Call UI updates (displays current currency, income rate, etc.)
        if (updateUICallback) {
            updateUICallback(currentIncomePerSecond);
        }

        // Queue next frame
        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

/**
 * Handles offline earnings collection
 * @param {Function} updateUICallback - Callback to refresh visual state after collection
 */
export function collectOfflineProfit(updateUICallback) {
    if (state.offlineEarnings > 0) {
        state.coins += state.offlineEarnings;
        state.offlineEarnings = 0;
        saveGameState();
        
        if (updateUICallback) {
            updateUICallback(0);
        }
    }
}

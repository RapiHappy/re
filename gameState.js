// Game State for "Monster Lab: Evolution"
import { isYandexActive, getCloudData, saveCloudData, getPlayerName } from './yandexApi.js';

export const state = {
    coins: 100, // Gold
    dna: 0,     // DNA
    xp: 0,
    level: 1,
    lastLogin: Date.now(),
    user: {
        id: null,
        first_name: "Ученый"
    },
    // 4x5 grid = 20 cells. Stored as null or element object
    monsters: Array(20).fill(null),
    incubator: Array(2).fill(null),
    // Array of unlocked element IDs
    unlocked: ["fire_1", "water_1", "nature_1", "mech_1", "dark_1"],
    offlineEarnings: 0,
    
    // Loaded databases
    monstersDB: {},
    recipesDB: {} // Kept for compatibility if old functions are still hanging
};

export async function loadDatabases() {
    try {
        const resMonsters = await fetch('monsters_db.json');
        state.monstersDB = await resMonsters.json();
        
        console.log("Database loaded successfully:", Object.keys(state.monstersDB).length, "elements.");
    } catch (e) {
        console.error("Failed to load database:", e);
    }
}

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

export function createMonster(typeId) {
    const template = state.monstersDB[typeId];
    if (!template) return null;

    return {
        id: generateId(),
        typeId: typeId,
        name: template.name,
        level: template.tier === "mutant" ? 5 : (template.tier || template.level || 1),
        rarity: template.rarity,
        baseIncome: template.base_income,
        imageUrl: template.image_url,
    };
}

export async function loadGameState() {
    try {
        let parsed = null;
        
        // 1. Fetch player name from Yandex profile if SDK is active
        if (isYandexActive()) {
            state.user.first_name = getPlayerName();
            
            // Try loading from Yandex Cloud storage
            const cloudData = await getCloudData();
            if (cloudData && Object.keys(cloudData).length > 0) {
                parsed = cloudData;
                console.log("Loaded game state from Yandex Cloud.");
            }
        }
        
        // 2. Local fallback if cloud is inactive or has no data
        if (!parsed) {
            const saved = localStorage.getItem("monster_lab_state");
            if (saved) {
                parsed = JSON.parse(saved);
                console.log("Loaded game state from localStorage fallback.");
            }
        }
        
        if (parsed) {
            // Migration check: check if it's the old 16-cell grid
            let needsReset = false;
            if (parsed.monsters) {
                if (parsed.monsters.length !== 20) {
                    needsReset = true;
                }
            } else {
                needsReset = true;
            }
            
            if (needsReset) {
                console.warn("Detected old grid format. Resetting to 4x5 grid.");
                localStorage.removeItem("monster_lab_state");
                await resetState();
                return false;
            }

            state.coins = parsed.coins ?? 100;
            state.dna = parsed.dna ?? 0;
            state.xp = parsed.xp ?? 0;
            state.level = parsed.level ?? 1;
            state.lastLogin = parsed.lastLogin ?? Date.now();
            state.monsters = parsed.monsters ?? Array(20).fill(null);
            state.incubator = parsed.incubator ?? Array(2).fill(null);
            state.unlocked = parsed.unlocked ?? ["fire_1", "water_1", "nature_1", "mech_1", "dark_1"];
            
            return true;
        }
    } catch (e) {
        console.error("Failed to load state:", e);
    }
    
    await resetState();
    return false;
}

export async function saveGameState() {
    try {
        state.lastLogin = Date.now();
        const stateData = {
            coins: state.coins,
            dna: state.dna,
            xp: state.xp,
            level: state.level,
            lastLogin: state.lastLogin,
            monsters: state.monsters,
            incubator: state.incubator,
            unlocked: state.unlocked
        };
        
        // 1. Save to Yandex Cloud if active
        if (isYandexActive()) {
            await saveCloudData(stateData);
        }
        
        // 2. Always back up to LocalStorage
        localStorage.setItem("monster_lab_state", JSON.stringify(stateData));
    } catch (e) {
        console.error("Failed to save state:", e);
    }
}

async function resetState() {
    state.coins = 100;
    state.dna = 0;
    state.xp = 0;
    state.level = 1;
    state.monsters = Array(20).fill(null);
    state.incubator = Array(2).fill(null);
    state.unlocked = ["fire_1", "water_1", "nature_1", "mech_1", "dark_1"];
    initializeDefaultMonsters();
    await saveGameState();
}

function initializeDefaultMonsters() {
    state.monsters[0] = createMonster("fire_1");
    state.monsters[1] = createMonster("water_1");
    state.monsters[4] = createMonster("nature_1");
    state.monsters[5] = createMonster("mech_1");
    state.monsters[8] = createMonster("dark_1");
}

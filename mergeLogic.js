// Alchemy merging engine for "Monster Lab: Evolution"
import { state, createMonster } from './gameState.js';

/**
 * Checks if two monster IDs can evolve.
 * @param {string} id1 
 * @param {string} id2 
 * @returns {string|null} The next evolution ID, or null if cannot evolve
 */
export function checkEvolution(id1, id2) {
    if (!id1 || !id2 || id1 !== id2) return null;
    
    // Parse element and tier (e.g. "fire_1")
    const match = id1.match(/^([a-z]+)_(\d)$/);
    if (!match) return null;
    
    const element = match[1];
    const tier = parseInt(match[2], 10);
    
    if (tier >= 4) return null; // Tier 4 is maximum level
    
    return `${element}_${tier + 1}`;
}

const MUTATION_RECIPES = {
    "fire_water": "mutant_steam_dragon",
    "mech_nature": "mutant_biorobot",
    "dark_fire": "mutant_ash_demon",
    "dark_water": "mutant_abyssal_leviathan"
};

/**
 * Checks if two element types can mutate.
 * @param {string} element1 
 * @param {string} element2 
 * @returns {string|null} The mutated monster ID, or null if no recipe matches
 */
export function checkMutation(element1, element2) {
    if (!element1 || !element2) return null;
    
    // Sort elements alphabetically to handle any order
    const key = [element1, element2].sort().join("_");
    return MUTATION_RECIPES[key] || null;
}

/**
 * Attempts to merge two elements based on evolution and mutation rules.
 * 
 * @param {Object} elementA - First element card object
 * @param {Object} elementB - Second element card object
 * @returns {Object} Result of the merge attempt
 */
export function attemptMerge(elementA, elementB) {
    if (!elementA || !elementB) {
        return {
            success: false,
            error: "Не выбраны элементы для скрещивания.",
            monster: null
        };
    }

    // 1. Try Evolution (matching IDs)
    const evolutionTargetId = checkEvolution(elementA.typeId, elementB.typeId);
    if (evolutionTargetId) {
        const newMonster = createMonster(evolutionTargetId);
        if (!newMonster) {
            return {
                success: false,
                error: "Ошибка создания эволюции.",
                monster: null
            };
        }
        
        let isNewDiscovery = false;
        if (!state.unlocked.includes(evolutionTargetId)) {
            state.unlocked.push(evolutionTargetId);
            isNewDiscovery = true;
        }
        
        return {
            success: true,
            monster: newMonster,
            isNewDiscovery: isNewDiscovery,
            isMutation: false,
            error: null
        };
    }

    // 2. Try Mutation (different elements, specific recipes)
    const templateA = state.monstersDB[elementA.typeId];
    const templateB = state.monstersDB[elementB.typeId];
    
    if (templateA && templateB) {
        const mutationTargetId = checkMutation(templateA.element, templateB.element);
        if (mutationTargetId) {
            // 25% chance of successful mutation
            if (Math.random() <= 0.25) {
                const newMonster = createMonster(mutationTargetId);
                if (!newMonster) {
                    return {
                        success: false,
                        error: "Ошибка создания мутации.",
                        monster: null
                    };
                }
                
                let isNewDiscovery = false;
                if (!state.unlocked.includes(mutationTargetId)) {
                    state.unlocked.push(mutationTargetId);
                    isNewDiscovery = true;
                }
                
                return {
                    success: true,
                    monster: newMonster,
                    isNewDiscovery: isNewDiscovery,
                    isMutation: true,
                    error: null
                };
            } else {
                return {
                    success: false,
                    error: "Скрещивание не удалось. Попробуйте еще раз!",
                    monster: null
                };
            }
        }
    }

    // If neither matches
    return {
        success: false,
        error: "Скрещивание этих элементов невозможно.",
        monster: null
    };
}

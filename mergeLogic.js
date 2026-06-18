// mergeLogic.js

const MUTATION_RECIPES = {
    'fire_water': 'mutant_steam',
    'water_fire': 'mutant_steam',
    'nature_mech': 'mutant_bio',
    'mech_nature': 'mutant_bio',
    'dark_fire': 'mutant_ash',
    'fire_dark': 'mutant_ash',
    'water_dark': 'mutant_abyss',
    'dark_water': 'mutant_abyss'
};

/**
 * Validates and processes a merge attempt between two monsters.
 * 
 * @param {Object} monster1 - The first monster object.
 * @param {Object} monster2 - The second monster object.
 * @returns {String|null} - Resulting monster ID if successful, null if merge fails.
 */
function tryMerge(monster1, monster2) {
    if (!monster1 || !monster2) return null;

    // 1. Evolution (Same ID, tier < 4)
    if (monster1.id === monster2.id) {
        if (monster1.tier < 4) {
            return `${monster1.element}_${monster1.tier + 1}`;
        }
        return null; // Cannot evolve tier 4 natively, must mutate
    }

    // 2. Mutation (Different elements based on recipes)
    const recipeKey = `${monster1.element}_${monster2.element}`;
    if (MUTATION_RECIPES[recipeKey]) {
        return MUTATION_RECIPES[recipeKey];
    }

    return null; // Invalid merge
}

// Support both ES6 modules and global scope for traditional browser scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MUTATION_RECIPES, tryMerge };
} else if (typeof window !== 'undefined') {
    window.MUTATION_RECIPES = MUTATION_RECIPES;
    window.tryMerge = tryMerge;
}

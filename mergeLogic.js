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

function tryMerge(monster1, monster2) {
    if (!monster1 || !monster2) return null;

    if (monster1.id === monster2.id) {
        if (monster1.tier < 4) {
            return `${monster1.element}_${monster1.tier + 1}`;
        }
        return null;
    }

    const recipeKey = `${monster1.element}_${monster2.element}`;
    if (MUTATION_RECIPES[recipeKey]) {
        return MUTATION_RECIPES[recipeKey];
    }

    return null;
}

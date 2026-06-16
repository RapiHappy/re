#!/usr/bin/env python3
"""
Recipe Generator for "Monster Lab: Evolution" using OpenAI API.
Generates 50 logical alchemy recipes and saves them as JSON databases.
"""

import os
import json
import sys
from openai import OpenAI

# Check for API key
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    print("WARNING: Environment variable OPENAI_API_KEY is not set.")
    print("Please set the environment variable, or paste your API key here to continue.")
    user_key = input("Enter OpenAI API Key (or press Enter to exit): ").strip()
    if not user_key:
        print("API key required. Exiting.")
        sys.exit(1)
    api_key = user_key

# Initialize client
client = OpenAI(api_key=api_key)

SYSTEM_PROMPT = """You are a game designer and JSON structure generator. 
You will generate database structures for an alchemy merging game (similar to Doodle God or Little Alchemy).
You must output a single valid JSON object containing exactly two keys: "monsters" and "recipes".

Rules for "monsters":
- It must contain a mapping of element ID (string key) to an object with:
  - id: (string) same as the key
  - name: (string) Russian name of the element (e.g. "Грязь", "Пыль")
  - image_url: (string) path to image file in format "assets/images/<element_id>.png" (e.g. "assets/images/mud.png")
  - baseIncome: (float) amount of currency generated per second. MUST be balanced so the player doesn't earn money too quickly. 
    - Base elements (cat, dog, noob, banana, apple, smiley) must have baseIncome of 0.1.
    - Combined tier 1 elements should have 0.2 to 0.4.
    - Rare tier 2/3 elements can have 0.5 to 1.2.
    - Absolute end-game legendaries must not exceed 2.0.

Rules for "recipes":
- It must contain a mapping of combined elements to their result element ID.
- Key format: "parent1+parent2"
- IMPORTANT: The parent IDs in the key MUST be sorted alphabetically. E.g. "cat+dog" (NOT "dog+cat").
- The value must be the resulting element ID (which must exist in "monsters").
- Generate exactly 50 logical recipes.

Your output must be pure valid JSON and nothing else. No markdown blocks, no commentary.
"""

USER_PROMPT = """Generate 50 logical recipes and all corresponding elements.
The base elements that already exist and MUST be included are:
- cat (assets/images/cat.png, name: "Кот", baseIncome: 0.1)
- dog (assets/images/dog.png, name: "Собака", baseIncome: 0.1)
- noob (assets/images/noob.png, name: "Нубик", baseIncome: 0.1)
- banana (assets/images/banana.png, name: "Банан", baseIncome: 0.1)
- apple (assets/images/apple.png, name: "Яблоко", baseIncome: 0.1)
- smiley (assets/images/smiley.png, name: "Смайл", baseIncome: 0.1)

Include these and build 50 other logical items and recipes, starting with combinations and intermediate elements leading to classic internet memes, funny animals, and gaming characters.
"""

def main():
    print("Contacting OpenAI to generate 50 alchemy recipes...")
    try:
        response = client.chat.completions.create(
            model="gpt-4o",  # Using a smart model for logical alchemy recipes
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": USER_PROMPT}
            ],
            temperature=0.7
        )
        
        result_text = response.choices[0].message.content
        data = json.loads(result_text)
        
        # Validate keys in response
        if "monsters" not in data or "recipes" not in data:
            print("Error: The AI response did not contain 'monsters' or 'recipes' keys.")
            print("Response content:")
            print(result_text)
            sys.exit(1)
            
        monsters = data["monsters"]
        recipes = data["recipes"]
        
        print(f"Successfully generated {len(monsters)} elements and {len(recipes)} recipes.")
        
        # Save monsters database
        with open("monsters_db.json", "w", encoding="utf-8") as f:
            json.dump(monsters, f, indent=2, ensure_ascii=False)
        print("Saved monsters_db.json")
            
        # Save recipes database
        with open("recipes_db.json", "w", encoding="utf-8") as f:
            json.dump(recipes, f, indent=2, ensure_ascii=False)
        print("Saved recipes_db.json")
        
        print("\nVerification of recipe keys:")
        non_sorted_keys = []
        for key in recipes.keys():
            parents = key.split("+")
            if len(parents) != 2:
                print(f"Warning: invalid recipe key format '{key}'")
                continue
            if parents != sorted(parents):
                non_sorted_keys.append(key)
                
        if non_sorted_keys:
            print(f"Fixing {len(non_sorted_keys)} keys that were not sorted alphabetically...")
            fixed_recipes = {}
            for key, val in recipes.items():
                sorted_key = "+".join(sorted(key.split("+")))
                fixed_recipes[sorted_key] = val
            
            with open("recipes_db.json", "w", encoding="utf-8") as f:
                json.dump(fixed_recipes, f, indent=2, ensure_ascii=False)
            print("Updated and saved fixed recipes_db.json")
        else:
            print("All recipe keys were already sorted alphabetically. Excellent!")

    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

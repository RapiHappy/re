#!/usr/bin/env python3
import os
import json
import urllib.request
import time

ROBOHASH_MAPPING = {
    # Cats -> set4 (kittens)
    "cat": "set=set4",
    "apple_cat": "set=set4",
    "banana_cat": "set=set4",
    "happy_cat": "set=set4",
    "nyan_cat": "set=set4",
    "floppa": "set=set4",
    "catdog": "set=set4",
    
    # Dogs -> set2 (monsters)
    "dog": "set=set2",
    "doge": "set=set2",
    "minecraft_dog": "set=set2",
    "doge_space": "set=set2",
    
    # Noobs / Steve -> set1 (robots)
    "noob": "set=set1",
    "banana_noob": "set=set1",
    "steve": "set=set1",
    "astronaut_noob": "set=set1",
    
    # Others -> set3 (robot heads) or set2 (monsters)
    "banana": "set=set3",
    "apple": "set=set3",
    "smiley": "set=set3",
    "roblox_face": "set=set3",
    "dancing_banana": "set=set2",
    "annoying_orange": "set=set2",
    "space": "set=set2",
    "alien": "set=set2",
    "banana_space": "set=set1",
    "apple_space": "set=set1"
}

def main():
    # 1. Create target directory
    output_dir = os.path.join("assets", "images")
    os.makedirs(output_dir, exist_ok=True)
    print(f"Created/verified folder: {output_dir}")

    # 2. Open monsters database
    db_path = "monsters_db.json"
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        return

    with open(db_path, "r", encoding="utf-8") as f:
        monsters = json.load(f)

    print(f"Found {len(monsters)} elements in database. Starting download...")

    # 3. Download illustrations using Robohash sets
    for key, monster in monsters.items():
        monster_id = monster["id"]
        params = ROBOHASH_MAPPING.get(monster_id, "set=set2")
        
        # Build URL
        url = f"https://robohash.org/{monster_id}?{params}&size=256x256"
        file_path = os.path.join(output_dir, f"{monster_id}.jpg")

        if os.path.exists(file_path):
            print(f"  [SKIP] {file_path} already exists.")
            continue

        print(f"Downloading {monster['name']} -> {file_path}...")
        print(f"  URL: '{url}'")

        success = False
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=15) as response, open(file_path, 'wb') as out_file:
                    out_file.write(response.read())
                print(f"  [SUCCESS] Saved {file_path}")
                success = True
                break
            except Exception as e:
                print(f"  [ERROR] Attempt {attempt+1} failed: {e}")
                time.sleep(1.5)
        
        if not success:
            print(f"  [WARNING] Failed to download image for {monster['name']}.")

        # Short rate limit delay
        time.sleep(0.2)

    print("All image generation operations completed.")

if __name__ == "__main__":
    main()

from fastapi import FastAPI, HTTPException 
from firebase_admin import credentials, firestore, initialize_app
from typing import List, Dict, Any
import itertools
import numpy as np
from skimage.color import rgb2lab
import requests
import uvicorn
import os
from dotenv import load_dotenv

# ✅ .env 파일 로드
load_dotenv()

# ✅ 환경변수에서 키 경로 가져오기
key_path = os.getenv("FIREBASE_KEY_PATH")
if not key_path:
    raise RuntimeError("FIREBASE_KEY_PATH not set in .env")

# ✅ Firebase 초기화
cred = credentials.Certificate(key_path)
initialize_app(cred)
db = firestore.client()

app = FastAPI()


SEASON_THRESHOLDS = {
    "summer": 22,
    "spring_fall": (10, 22),
    "winter": 10
}

SEASONAL_SCORES = {
    "summer": {
        "coat": -2, "jacket": -1.5, "cardigan": -0.5,
        "sweater": -1.5, "sweatshirt": -1.0, "shorts": 1.0, "sleeveless top": 1.0
    },
    "spring_fall": {
        "coat": -1.0, "jacket": 1.0, "cardigan": 1.0, "sweater": 1.0, "sweatshirt": 1.0
    },
    "winter": {
        "coat": 2.0, "jacket": 1.0, "cardigan": 0.5, "sweater": 1.5, "sweatshirt": 1.0, "shorts": -2, "sleeveless top": -2
    }
}

STYLE_COMPATIBILITY = {
    "casual": ["daily", "minimal", "romantic"],
    "daily": ["casual", "sporty", "minimal"],
    "formal": ["minimal", "romantic"],
    "romantic": ["formal", "casual"],
    "sporty": ["casual", "daily"],
    "minimal": ["casual", "formal", "daily"]
}

ACCESSORY_SEMANTIC_CATEGORIES = {"accessory", "jewelry"}

def get_current_season() -> str:
    try:
        response = requests.get(
            "https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=dc80e401da0eb2cee4aa1b28ad1ce5a7&units=metric"
        )
        response.raise_for_status()
        temp = response.json()["main"]["temp"]
        print(f"현재 기온: {temp}도")
        if temp >= SEASON_THRESHOLDS["summer"]:
            return "summer"
        elif temp >= SEASON_THRESHOLDS["spring_fall"][0]:
            return "spring_fall"
        else:
            return "winter"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weather API error: {e}")

def perceptual_color_distance(c1: Dict[str, int], c2: Dict[str, int]) -> float:
    lab1 = rgb2lab(np.array([[list(c1.values())]]) / 255.0)[0][0]
    lab2 = rgb2lab(np.array([[list(c2.values())]]) / 255.0)[0][0]
    return np.linalg.norm(lab1 - lab2)

def get_style_penalty(main_styles: List[str], item_styles: Any) -> float:
    if isinstance(item_styles, str):
        item_styles = [item_styles]
    if not item_styles:
        return 1.0
    penalties = []
    for main in main_styles:
        for s in item_styles:
            if s == main:
                penalties.append(0.0)
            elif s in STYLE_COMPATIBILITY.get(main, []):
                penalties.append(0.5)
            else:
                penalties.append(1.0)
    return np.mean(penalties) if penalties else 1.0

def get_required_categories(sem: str) -> set:
    if sem == "all-body":
        return {"bags", "shoes"}
    elif sem == "tops":
        return {"bottoms", "shoes", "bags"}
    elif sem == "bottoms":
        return {"tops", "shoes", "bags"}
    elif sem == "shoes":
        return {"tops", "bottoms", "bags"}
    elif sem == "bags":
        return {"tops", "bottoms", "shoes"}
    else:
        return {"tops", "bottoms", "shoes", "bags"}

def extract_minimal_info(cloth: dict) -> dict:
    return {
        "clothId": cloth.get("clothId"),
        "category": cloth.get("category"),
        "semantic_category": cloth.get("semantic_category"),
        "cloth_name": cloth.get("cloth_name"),
        "image_url": cloth.get("image_url"),
        "location": cloth.get("location")
    }

@app.get("/recommend/{clothId}")
def recommend_outfits(clothId: str) -> List[Dict[str, Any]]:
    season = get_current_season()

    doc = db.collection("clothes").document(clothId).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="clothId not found")

    selected_item = doc.to_dict()
    selected_item["clothId"] = doc.id
    main_styles = selected_item.get("styleType")
    if isinstance(main_styles, str):
        main_styles = [main_styles]

    user_id = selected_item.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id not found")

    closet_docs = db.collection("clothes").where("user_id", "==", user_id).stream()
    user_closet = [d.to_dict() | {"clothId": d.id} for d in closet_docs if d.id != clothId]

    required_cats = get_required_categories(selected_item["semantic_category"])
    cat_pools = {
        cat: [item for item in user_closet if item["semantic_category"] == cat]
        for cat in required_cats
    }

    if any(len(pool) == 0 for pool in cat_pools.values()):
        raise HTTPException(status_code=400, detail="Not enough clothing items for recommendation")

    accessory_candidates = [
        item for item in user_closet if item.get("semantic_category") in ACCESSORY_SEMANTIC_CATEGORIES
    ]

    combos = itertools.product(*cat_pools.values())
    scored_outfits = []

    for combo in combos:
        color_dists = [
            perceptual_color_distance(selected_item["color_rgb"], item["color_rgb"])
            for item in combo
        ]
        avg_color_dist = np.mean(color_dists)

        style_penalties = [
            get_style_penalty(main_styles, item.get("styleType"))
            for item in combo if item.get("styleType")
        ]
        avg_style_penalty = np.mean(style_penalties) if style_penalties else 1.0

        season_bonus = sum([
            SEASONAL_SCORES.get(season, {}).get(item.get("category"), 0)
            for item in combo
        ])

        final_score = avg_style_penalty * 0.9 + avg_color_dist * 0.05 - season_bonus * 0.8

        outfit = {"main": selected_item}
        for item in combo:
            outfit[item["semantic_category"]] = item

        scored_outfits.append((final_score, outfit))

    scored_outfits.sort(key=lambda x: x[0])

    main_sem = selected_item.get("semantic_category")
    top_outfits = []
    used_ids = set()

    for _, outfit in scored_outfits:
        if len(top_outfits) >= 2:
            break
        key = None
        if main_sem == "tops" and "bottoms" in outfit:
            key = outfit["bottoms"].get("clothId")
        elif main_sem == "bottoms" and "tops" in outfit:
            key = outfit["tops"].get("clothId")

        if key is None or key not in used_ids:
            if key:
                used_ids.add(key)
            top_outfits.append(outfit)

    results = []
    for outfit in top_outfits:
        minimal_outfit = {k: extract_minimal_info(v) for k, v in outfit.items()}
        accessories = sorted(
            accessory_candidates,
            key=lambda item: perceptual_color_distance(selected_item["color_rgb"], item["color_rgb"])
        )[:2]
        minimal_outfit["accessories"] = [extract_minimal_info(a) for a in accessories]
        results.append(minimal_outfit)

    return results

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)

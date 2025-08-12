# Standard library
import os
import json
from typing import Optional, Dict, List

# Third-party
import numpy as np
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, initialize_app, firestore
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sklearn.metrics.pairwise import euclidean_distances
from loguru import logger
import requests


router = APIRouter()

# ✅ 스타일 호환성 정의
STYLE_COMPATIBILITY = {
    "casual": ["daily", "minimal", "romantic"],
    "daily": ["casual", "sporty", "minimal"],
    "formal": ["minimal", "romantic"],
    "romantic": ["formal", "casual"],
    "sporty": ["casual", "daily"],
    "minimal": ["casual", "formal", "daily"]
}

# ✅ 카테고리 유사성 매핑
category_similarity_map = {
    "sneakers": ["flats"],
    "flats": ["loafers"],
    "tshirt": ["sweatshirt", "shirt"],
    "shirt": ["tshirt", "blouse"],
    "blouse": ["shirt"],
    "sweatshirt": ["sweater"],
    "coat": ["jacket", "blazer"],
    "jacket": ["coat", "blazer"],
    "blazer": ["coat", "jacket"],
    "sweatpants": ["pants", "jeans"],
    "pants": ["jeans", "sweatpants"],
    "jeans": ["pants"]
}

# ✅ 계절 판단 임계값 및 점수 테이블
SEASON_THRESHOLDS = {
    "summer": 22,
    "spring_fall": (8, 22),
    "winter": 8
}

SEASONAL_SCORES = {
    "summer": {
        "coat": -5, "jacket": -3, "cardigan": -0.5,
        "sweater": -2, "sweatshirt": -1.5, "shorts": 1.0, "sleeveless top": 1.0, "dress": 1.0
    },
    "spring_fall": {
        "coat": -1.0, "jacket": 1.0, "cardigan": 1.0, "sweater": 1.0, "sweatshirt": 1.0, "dress": 1.0
    },
    "winter": {
        "coat": 4.0, "jacket": 2.0, "cardigan": 1, "sweater": 1.5, "sweatshirt": 1.0,
        "shorts": -2, "sleeveless top": -2, "dress": 0.5
    }
}

# ✅ 환경변수 로드 및 Firebase 초기화
load_dotenv()
key_path = os.getenv("FIREBASE_KEY_PATH")
if not key_path:
    logger.error("FIREBASE_KEY_PATH not set in .env")
    raise RuntimeError("FIREBASE_KEY_PATH not set in .env")

cred = credentials.Certificate(key_path)
if not firebase_admin._apps:
    initialize_app(cred)
db = firestore.client()

# ✅ 코디 샘플 JSON 로드
sample_path = os.path.join(
    os.path.dirname(__file__), "data", "parsed_sets_cleaned_with_setid_updated.json"
)
with open(sample_path, "r", encoding="utf-8") as f:
    outfit_samples = json.load(f)


# ======================
# 유틸
# ======================
def safe_lower(x):
    if x is None:
        return ""
    if isinstance(x, str):
        return x.strip().lower()
    if isinstance(x, (list, tuple)):
        return safe_lower(x[0]) if x else ""
    return str(x).strip().lower()


def ensure_list(x):
    if x is None:
        return []
    return x if isinstance(x, list) else [x]


def t(name, v):
    import json as _json
    logger.error(
        f"DBG {name:<14} type={type(v).__name__} value={_json.dumps(v) if isinstance(v, (dict, list)) else str(v)}"
    )


# ======================
# 외부/DB 함수
# ======================
def get_current_temperature() -> float:
    try:
        api_key = os.getenv("WEATHER_API_KEY")
        if not api_key:
            raise RuntimeError("WEATHER_API_KEY not set in .env")
        response = requests.get(
            f"https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid={api_key}&units=metric"
        )
        response.raise_for_status()
        temp = response.json()["main"]["temp"]
        logger.info(f"현재 기온: {temp:.1f}°C")
        return round(temp, 1)
    except Exception as e:
        logger.error(f"Weather API error: {e}")
        raise HTTPException(status_code=500, detail="Weather API 호출 실패")


def get_cloth_by_id(cloth_id: str) -> Optional[Dict]:
    try:
        doc_ref = db.collection("clothes").document(cloth_id)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            data["clothId"] = cloth_id
            return data
        return None
    except Exception as e:
        logger.error(f"get_cloth_by_id 실패: {e}")
        return None


def get_clothes_by_user(user_id: str) -> List[Dict]:
    try:
        clothes_ref = db.collection("clothes").where("user_id", "==", user_id)
        return [{**doc.to_dict(), "clothId": doc.id} for doc in clothes_ref.stream()]
    except Exception as e:
        logger.error(f"get_clothes_by_user 실패: {e}")
        return []


# ======================
# 로직 함수
# ======================
def is_similar_category(cat1, cat2) -> bool:
    c1 = safe_lower(cat1)
    c2 = safe_lower(cat2)
    return c1 == c2 or (c2 in category_similarity_map.get(c1, []))


def find_best_match(sample_item: Dict, user_clothes: List[Dict], main_cloth_id: str) -> Optional[Dict]:
    sample_cat = safe_lower(sample_item.get("fine_category"))
    filtered = [c for c in user_clothes if c.get("clothId") != main_cloth_id]

    similar_matches = [c for c in filtered if is_similar_category(c.get("category"), sample_cat)]
    if not similar_matches:
        return None

    sample_rgb = np.array(sample_item["color_rgb"]).reshape(1, -1)
    dists = [
        (c, euclidean_distances(sample_rgb, np.array(list(c["color_rgb"].values())).reshape(1, -1))[0][0])
        for c in similar_matches
    ]
    return min(dists, key=lambda x: x[1])[0]

"""
수정전
def recommend_outfits_from_main(main_item, user_clothes, outfit_samples, K=10):
    main_category = safe_lower(main_item.get("category"))
    main_rgb = np.array(list(main_item["color_rgb"].values())).reshape(1, -1)

    matching_outfits = [
        s for s in outfit_samples
        if main_category in [safe_lower(it["fine_category"]) for it in s["outfit"].values()]
    ]
    distances = []
    for s in matching_outfits:
        for it in s["outfit"].values():
            if safe_lower(it["fine_category"]) == main_category:
                sample_rgb = np.array(it["color_rgb"]).reshape(1, -1)
                dist = euclidean_distances(main_rgb, sample_rgb)[0][0]
                distances.append((dist, s))
                break
    distances.sort(key=lambda x: x[0])
    return [s for _, s in distances[:K]]
"""

def recommend_outfits_from_main(main_item, user_clothes, outfit_samples, K=10, main_semantic: str = ""):
    """
    Top-K 샘플 선택.
    1차 차단: 메인 semantic이 tops/bottoms면 'dress'를 포함하는 샘플을 사전에 제외.
    """
    main_category = safe_lower(main_item.get("category"))
    main_semantic = safe_lower(main_semantic or main_item.get("semantic_category"))

    # 샘플 유틸
    def sample_contains_main(sample) -> bool:
        return any(safe_lower(it.get("fine_category")) == main_category
                   for it in sample["outfit"].values())

    def sample_has_dress(sample) -> bool:
        return any(safe_lower(it.get("fine_category")) == "dress"
                   for it in sample["outfit"].values())

    # 1) 메인 카테고리를 포함하는 샘플만 1차 필터
    base = [s for s in outfit_samples if sample_contains_main(s)]

    # 2) 메인 semantic이 tops/bottoms면 'dress' 포함 샘플 제거 (1차 차단)
    if main_semantic in {"tops", "bottoms"}:
        before = len(base)
        base = [s for s in base if not sample_has_dress(s)]
        logger.debug(f"[1차 차단] dress 샘플 제거: main_semantic={main_semantic} | {before} -> {len(base)}")

    # 3) 메인-샘플 색상거리 기반 정렬
    main_rgb = np.array(list(main_item["color_rgb"].values())).reshape(1, -1)
    distances = []
    for s in base:
        for it in s["outfit"].values():
            if safe_lower(it.get("fine_category")) == main_category:
                sample_rgb = np.array(it["color_rgb"]).reshape(1, -1)
                dist = euclidean_distances(main_rgb, sample_rgb)[0][0]
                distances.append((dist, s))
                break

    distances.sort(key=lambda x: x[0])
    return [s for _, s in distances[:K]]


def calculate_style_score(main_styles: List[str], matched_items: List[Dict]) -> float:
    try:
        score = 0.0
        count = 0
        for item in matched_items:
            item_style = safe_lower(item.get("styleType"))
            for main_style in main_styles:
                if item_style == main_style:
                    score += 1.0
                elif item_style in STYLE_COMPATIBILITY.get(main_style, []):
                    score += 0.7
                count += 1
                break
        return score / count if count else 0.0
    except Exception as e:
        logger.error(f"calculate_style_score 오류: {e}")
        return 0.0


# ✅ 핵심: 최종 코디 생성
def build_final_outfits(
    main_item: Dict,
    top_k_sets: List[Dict],
    user_clothes: List[Dict],
    temperature: float,
    top_n: int = 2
) -> List[Dict]:
    main_category = safe_lower(main_item.get("category"))

    main_styles_raw = main_item.get("styleType")
    main_styles = [s for s in (safe_lower(v) for v in ensure_list(main_styles_raw)) if s]

    final_recommendations = []
    seen_combinations = set()

    if temperature >= SEASON_THRESHOLDS["summer"]:
        season = "summer"
    elif temperature >= SEASON_THRESHOLDS["spring_fall"][0]:
        season = "spring_fall"
    else:
        season = "winter"

    logger.info(f"Season determined: {season}")

    for outfit_sample in top_k_sets:
        matched_items = []
        used_cloth_ids = set()
        used_semantic_categories = set()

        main_semantic = safe_lower(main_item.get("semantic_category"))
        used_semantic_categories.add(main_semantic)

        filtered_outfit = {
            k: v for k, v in outfit_sample["outfit"].items()
            if safe_lower(v.get("fine_category")) != main_category
        }

        total_color_score = 0.0
        color_score_count = 0

        for item in filtered_outfit.values():
            match = find_best_match(item, user_clothes, main_item.get("clothId"))
            if not match:
                continue

            cloth_id = match.get("clothId")
            semantic_category = safe_lower(match.get("semantic_category"))

            if cloth_id in used_cloth_ids or semantic_category in used_semantic_categories:
                continue

            used_cloth_ids.add(cloth_id)
            used_semantic_categories.add(semantic_category)
            matched_items.append(match)

            sample_rgb = np.array(item["color_rgb"]).reshape(1, -1)
            match_rgb = np.array(list(match["color_rgb"].values())).reshape(1, -1)
            dist = euclidean_distances(sample_rgb, match_rgb)[0][0]
            color_score = max(0, 100 - dist * 1.5)
            total_color_score += color_score
            color_score_count += 1

        semantic_cats = {safe_lower(it.get("semantic_category")) for it in matched_items}
        if main_semantic:
            semantic_cats.add(main_semantic)

        has_tops = "tops" in semantic_cats
        has_bottoms = "bottoms" in semantic_cats
        if (has_tops and not has_bottoms) or (has_bottoms and not has_tops):
            continue

        if len(matched_items) != len(filtered_outfit):
            logger.debug("Skipping outfit due to incomplete matched items")
            continue

        avg_color_score = total_color_score / color_score_count if color_score_count > 0 else 0.0
        style_score = calculate_style_score(main_styles, matched_items)

        seasonal_score = 0.0
        score_map = SEASONAL_SCORES.get(season, {})
        for it in matched_items:
            fine_category = safe_lower(it.get("category"))
            seasonal_score += score_map.get(fine_category, 0.0)

        final_score = (avg_color_score / 10.0) + style_score * 10.0 + seasonal_score

        combo_signature = tuple(sorted([it["clothId"] for it in matched_items]))
        if combo_signature in seen_combinations:
            logger.debug("Skipping duplicate outfit combo")
            continue
        seen_combinations.add(combo_signature)

        final_recommendations.append({
            "main_item": main_item,
            "matched_items": matched_items,
            "avg_color_score": avg_color_score,
            "style_score": style_score,
            "seasonal_score": seasonal_score,
            "final_score": final_score
        })

    final_recommendations.sort(key=lambda x: x["final_score"], reverse=True)
    logger.info(f"Returning top {top_n} final outfits")
    return final_recommendations[:top_n]


@router.get("/{clothId}")
async def recommend(clothId: str):
    try:
        main_item = get_cloth_by_id(clothId)
        if not main_item:
            raise HTTPException(status_code=404, detail="Cloth not found")

        t("main.category", main_item.get("category"))
        t("main.styleType", main_item.get("styleType"))

        user_clothes = get_clothes_by_user(main_item.get("user_id"))
        if not user_clothes:
            raise HTTPException(status_code=404, detail="User clothes not found")

        # 🔧 정규화: 이후 모든 로직이 문자열 가정으로 동작
        for uc in user_clothes:
            uc["category"] = safe_lower(uc.get("category"))
            uc["styleType"] = safe_lower(uc.get("styleType"))
            uc["semantic_category"] = safe_lower(uc.get("semantic_category"))

        # 🔍 첫 번째 유저 옷 데이터 확인
        first_uc = user_clothes[0]
        t("user0.category", first_uc.get("category"))
        t("user0.styleType", first_uc.get("styleType"))

        temperature = get_current_temperature()

        #top_k_sets = recommend_outfits_from_main(main_item, user_clothes, outfit_samples, K=30)
        top_k_sets = recommend_outfits_from_main(
            main_item, user_clothes, outfit_samples, K=30,
            main_semantic=main_item.get("semantic_category")
        )

        final_recommendations = build_final_outfits(
            main_item, top_k_sets, user_clothes, temperature, top_n=2
        )

        result = []
        for outfit in final_recommendations:
            main_info = {
                "clothId": outfit["main_item"].get("clothId"),
                "category": outfit["main_item"].get("category"),
                "semantic_category": outfit["main_item"].get("semantic_category"),
                "cloth_name": outfit["main_item"].get("cloth_name"),
                "image_url": outfit["main_item"].get("image_url"),
                "location": outfit["main_item"].get("location")
            }
            matched_infos = [
                {
                    "clothId": item.get("clothId"),
                    "category": item.get("category"),
                    "semantic_category": item.get("semantic_category"),
                    "cloth_name": item.get("cloth_name"),
                    "image_url": item.get("image_url"),
                    "location": item.get("location")
                }
                for item in outfit["matched_items"]
            ]
            result.append({
                "main": main_info,
                "matched_items": matched_infos
            })

        return JSONResponse(content={
            "temperature": temperature,
            "recommendations": result
        })

    except Exception as e:
        logger.error(f"추천 오류: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


__all__ = ["router"]

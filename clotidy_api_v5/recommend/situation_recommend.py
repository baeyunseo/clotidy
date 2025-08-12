from dotenv import load_dotenv
import os
from pathlib import Path
from fastapi.responses import JSONResponse
import random
import numpy as np
from sklearn.metrics.pairwise import euclidean_distances
from firebase_admin import firestore
from .situation_config import SITUATION_RULES
#from .situation_config import SITUATION_RULES
from .core_recommend import (
    get_clothes_by_user,
    get_current_temperature,
    recommend_outfits_from_main,
    outfit_samples,
    find_best_match,
    calculate_style_score,
    SEASON_THRESHOLDS,
    SEASONAL_SCORES,
    STYLE_COMPATIBILITY
)
from fastapi import APIRouter, HTTPException
from loguru import logger

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

router = APIRouter()

# ✅ ADD: 안전 정규화 유틸
def safe_lower(x):
    if x is None:
        return ""
    if isinstance(x, str):
        return x.strip().lower()
    if isinstance(x, (list, tuple)):
        # 리스트면 요소별로 처리한 리스트 반환
        return [safe_lower(v) for v in x if v is not None]
    return str(x).strip().lower()

def to_lower_set(x):
    """str 또는 list/tuple을 받아 소문자 '집합'으로 변환"""
    if isinstance(x, (list, tuple)):
        return {safe_lower(v) for v in x if v is not None and safe_lower(v)}
    if x is None:
        return set()
    v = safe_lower(x)
    return {v} if v else set()


def normalize_styleType(style):

    if isinstance(style, list):
        return style[0].strip().lower() if style else ""
    elif isinstance(style, str):
        return style.strip().lower()

    return ""

def get_compatible_style_types(style_types):

    compatible = set()
    for style in style_types:
        compatible.add(style.lower())
        compatible.update(STYLE_COMPATIBILITY.get(style.lower(), []))

    return list(compatible)

def normalize_styleTypes(styles):
    if not styles:
        return ["daily"]
    if isinstance(styles, list):
        return [s.strip().lower() for s in styles if isinstance(s, str)]
    elif isinstance(styles, str):
        return [styles.strip().lower()]
    return ["daily"]


@router.get("/{situation_name}")
def recommend_for_situation(situation_name: str, user_id: str):
    logger.info(f"[요청] situation: {situation_name}, user_id: {user_id}")

    situation = SITUATION_RULES.get(situation_name)
    if not situation:
        logger.warning(f"[오류] 정의되지 않은 situation: {situation_name}")
        raise HTTPException(status_code=400, detail="Unknown situation")

    user_clothes = get_clothes_by_user(user_id)
    if not user_clothes:
        logger.warning(f"[오류] 유저 옷장 없음: user_id={user_id}")
        raise HTTPException(status_code=404, detail="No clothes found for user")

    temperature = get_current_temperature()
    logger.info(f"[날씨] 현재 온도: {temperature:.1f}°C")

    if temperature >= SEASON_THRESHOLDS["summer"]:
        season = "summer"
    elif temperature >= SEASON_THRESHOLDS["spring_fall"][0]:
        season = "spring_fall"
    else:
        season = "winter"
    logger.info(f"[계절 판단] {season}")

    situation_style_types = situation["styleType"]
    situation_style_types_lower = [s.lower() for s in situation_style_types]

    ALLOWED_MAIN_SEM = {"tops", "bottoms", "all-body"}

    # ✅ 1차 후보군 필터
    candidate_main_items = [
        cloth
        for cloth in user_clothes
        if safe_lower(cloth.get("category")) in situation["categories"]
        and (to_lower_set(cloth.get("semantic_category")) & ALLOWED_MAIN_SEM)
        and any(
            style in situation_style_types_lower
            for style in normalize_styleTypes(cloth.get("styleType", []))
        )
        and SEASONAL_SCORES.get(season, {}).get(
            safe_lower(cloth.get("category")), 0.0
        ) >= -0.2
    ]
    logger.info(f"[1차 후보군] {len(candidate_main_items)}개")

    # ✅ 1차 후보 없음 → 유사 스타일로 확장
    if not candidate_main_items:
        logger.info("[1차 후보 없음] 유사 스타일로 재시도")

        expanded_styles = get_compatible_style_types(situation_style_types)
        expanded_styles = [s.lower() for s in expanded_styles]

        candidate_main_items = [
            cloth
            for cloth in user_clothes
            if safe_lower(cloth.get("category")) in situation["categories"]
            and (to_lower_set(cloth.get("semantic_category")) & ALLOWED_MAIN_SEM)
            and any(
                style in expanded_styles
                for style in normalize_styleTypes(cloth.get("styleType", []))
            )
            and SEASONAL_SCORES.get(season, {}).get(
                safe_lower(cloth.get("category")), 0.0
            ) >= -0.2
        ]
        logger.info(f"[확장 후보군] {len(candidate_main_items)}개")

    if candidate_main_items:
        main_item = random.choice(candidate_main_items)
        logger.info(f"[선택된 메인 아이템] {main_item.get('cloth_name')} ({main_item.get('category')})")
    else:
        main_item = random.choice(user_clothes)
        logger.info(f"[랜덤 선택] 후보 없어서 전체 옷 중 선택됨")

    top_k_sets = recommend_outfits_from_main(
    main_item, user_clothes, outfit_samples, K=30,
    main_semantic=main_item.get("semantic_category")
    )
    logger.info(f"[추천 조합 수] {len(top_k_sets)}개")

    final_recommendations = build_final_outfits_with_situation(
        main_item, top_k_sets, user_clothes, temperature, situation, top_n=2
    )
    logger.info(f"[최종 추천 수] {len(final_recommendations)}개")
    
    # 10) 최종 결과 JSON 응답용 가공

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
        matched_items_filtered = []

        # 드레스(= all-body) 존재 여부 탐지
        has_dress = any(
            "all-body" in to_lower_set(item.get("semantic_category"))
            for item in outfit["matched_items"]
        )

        for item in outfit["matched_items"]:
            sem_set = to_lower_set(item.get("semantic_category"))
            if has_dress and ({"tops", "bottoms"} & sem_set):
                continue
            matched_items_filtered.append({
                "clothId": item.get("clothId"),
                "category": item.get("category"),
                "semantic_category": item.get("semantic_category"),
                "cloth_name": item.get("cloth_name"),
                "image_url": item.get("image_url"),
                "location": item.get("location")
            }) 
        result.append({
            "main": main_info,
            "matched_items": matched_items_filtered
        })

    return JSONResponse(content={
        "temperature": temperature,
        "situation": situation_name,
        "recommendations": result
    })


def build_final_outfits_with_situation(main_item, top_k_sets, user_clothes, temperature, situation_info, top_n=2):
    main_category = safe_lower(main_item.get("category"))  # ✅ CHANGED

    # styleType 정규화 그대로 유지
    main_styles = main_item.get("styleType", [])
    if isinstance(main_styles, str):
        main_styles = [main_styles]
    main_styles = [s.strip().lower() for s in main_styles if isinstance(s, str)]

    final_recommendations = []
    seen_combinations = set()

    if temperature >= SEASON_THRESHOLDS["summer"]:
        season = "summer"
    elif temperature >= SEASON_THRESHOLDS["spring_fall"][0]:
        season = "spring_fall"
    else:
        season = "winter"

    for outfit_sample in top_k_sets:
        matched_items = []
        used_cloth_ids = set()

        # ✅ CHANGED: main semantic이 list라도 안전하게 set으로
        used_semantic_categories = set(to_lower_set(main_item.get("semantic_category")))

        # 메인 카테고리 제외
        filtered_outfit = {
            k: v for k, v in outfit_sample["outfit"].items()
            if safe_lower(v.get("fine_category")) != main_category  # ✅ CHANGED
        }

        total_color_score = 0
        color_score_count = 0

        for item in filtered_outfit.values():
            match = find_best_match(item, user_clothes, main_item.get("clothId"))
            if not match:
                continue

            cloth_id = match.get("clothId")
            # ✅ CHANGED: 세맨틱 set 기준 중복 체크
            match_sem_set = to_lower_set(match.get("semantic_category"))
            if cloth_id in used_cloth_ids or (used_semantic_categories & match_sem_set):
                continue

            used_cloth_ids.add(cloth_id)
            used_semantic_categories |= match_sem_set
            matched_items.append(match)

            sample_rgb = np.array(item["color_rgb"]).reshape(1, -1)
            match_rgb = np.array(list(match["color_rgb"].values())).reshape(1, -1)
            dist = euclidean_distances(sample_rgb, match_rgb)[0][0]
            color_score = max(0, 100 - dist * 1.5)
            total_color_score += color_score
            color_score_count += 1

        # --- 최소 상의-하의 조건/드레스 충돌 체크 ---
        # ✅ CHANGED: 세맨틱을 모두 set으로 합치기
        semantic_cats = set()
        for it in matched_items:
            semantic_cats |= to_lower_set(it.get("semantic_category"))
        semantic_cats |= to_lower_set(main_item.get("semantic_category"))

        has_tops = "tops" in semantic_cats
        has_bottoms = "bottoms" in semantic_cats
        has_dress = "all-body" in semantic_cats

        if (has_tops and not has_bottoms) or (has_bottoms and not has_tops):
            continue  # 조건 미충족 시 스킵
        if has_dress and (has_tops or has_bottoms):
            continue

        if len(matched_items) != len(filtered_outfit):
            continue

        avg_color_score = total_color_score / color_score_count if color_score_count > 0 else 0
        style_score = calculate_style_score(main_styles, matched_items)

        seasonal_score = 0.0
        for item in matched_items:
            fine = safe_lower(item.get("category"))  # ✅ CHANGED
            seasonal_score += SEASONAL_SCORES.get(season, {}).get(fine, 0.0)

        situation_score = 0.0
        situation_style_lower = [s.lower() for s in situation_info["styleType"]]  # ✅ ADD
        for item in matched_items:
            if safe_lower(item.get("category")) in situation_info["categories"]:
                situation_score += 1.0
            if normalize_styleType(item.get("styleType", "")) in situation_style_lower:
                situation_score += 1.0

        final_score = (avg_color_score / 10) + style_score * 10 + seasonal_score * 1.5 + situation_score * 0.8

        combo_signature = (main_item.get("clothId"),) + tuple(sorted([item["clothId"] for item in matched_items]))
        if combo_signature in seen_combinations:
            continue
        seen_combinations.add(combo_signature)

        final_recommendations.append({
            "main_item": main_item,
            "matched_items": matched_items,
            "avg_color_score": avg_color_score,
            "style_score": style_score,
            "seasonal_score": seasonal_score,
            "situation_score": situation_score,
            "final_score": final_score
        })

    final_recommendations.sort(key=lambda x: x["final_score"], reverse=True)
    return final_recommendations[:top_n]


__all__ = ["router"]
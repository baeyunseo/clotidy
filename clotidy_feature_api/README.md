# Clotidy 의류 특징 추출 API 👗🎨

이 저장소는 FastAPI 기반의 REST API로, 사용자가 업로드한 의류 이미지에서 다음 정보를 추출합니다:
- **계절감** (봄/여름 vs 가을/겨울)
- **패턴** (solid, stripe, check, floral, print)
- **주요 색상** (dominant + sub color / RGB + HEX)

---

## 📁 구성

```
clotidy_api/
├── color_api.py                  # 색상 추출 API
├── season_pattern_api.py         # 계절 + 패턴 추출 API
├── requirements.txt              # 필요 패키지
├── models/                       # 학습된 Keras 모델 저장소
│   ├── season_classifier_model_68.keras
│   ├── pattern_classifier_model.keras
│   └── pattern_finetuned_floral_vs_print_v2.keras
└── README.md
```

---

## ✅ 설치 및 실행

### 1. 의존성 설치
```bash
pip install -r requirements.txt
```

### 2. 서버 실행

#### 색상 추출 API 실행:
```bash
uvicorn color_api:app --reload
```

#### 계절 + 패턴 추출 API 실행:
```bash
uvicorn season_pattern_api:app --reload
```

---

## 🎯 API 명세 요약

### [POST] `/extract-colors/`
- 📤 `form-data`로 이미지 파일 전송 (`file`)
- 🎯 RGB + HEX 형식으로 dominant/sub 색상 반환

```json
{
  "color_rgb": [210, 100, 150],
  "dominant_hex": "#d26496",
  "sub_color_rgb": [170, 120, 190]
}
```

---

### [POST] `/extract-features`
- 📤 `form-data`로 이미지 파일 전송 (`file`)
- 🎯 계절 + 패턴 분류 결과 반환

```json
{
  "season": "spring_summer",
  "season_confidence": 0.9123,
  "pattern": "floral",
  "pattern_confidence": 0.8421
}
```

---

## 🧠 모델 설명

- `season_classifier_model_68.keras`: 봄/여름 vs. 가을/겨울 분류
- `pattern_classifier_model.keras`: 기본 5종 패턴 분류
- `pattern_finetuned_floral_vs_print_v2.keras`: floral/print 구분 정교화 이진 분류기

---

## ✨ 참고 사항

- 모든 요청은 `multipart/form-data` 형식으로 이미지 파일을 포함해야 합니다.
- 로컬 테스트는 Swagger UI (`http://127.0.0.1:8000/docs`)를 활용하세요.

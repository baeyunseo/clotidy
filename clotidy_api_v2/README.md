# clotidy_api_v2

AI 기반 의류 분류 및 색상 추출 기능을 제공하는 FastAPI 서버입니다.  
두 개의 주요 API로 구성되어 있으며, 각 기능은 모델 추론 결과를 기반으로 작동합니다.

---

## 📁 프로젝트 구조

```
clotidy_api_v2/
├── app.py                      # FastAPI 실행 진입점
├── requirements.txt            # 의존성 목록
├── category_model/
│   ├── category_api.py         # 의류 분류 API (모델 기반)
│   └── model.tflite            # ※ GitHub에 포함되지 않음
├── color_model/
│   └── color_api.py            # 색상 추출 API (OpenCV 기반)
├── .gitignore
```

---

## 🚀 실행 방법

### 1. 의존성 설치

```bash
pip install -r requirements.txt
```

> ⚠️ Ubuntu 서버에서는 `libgl1` 설치 필요 (OpenCV 실행 오류 방지)
> ```bash
> sudo apt install libgl1
> ```

### 2. FastAPI 실행

```bash
uvicorn app:app --host 0.0.0.0 --port 5050
```

> 포트는 상황에 따라 조정 가능 (기본값: 5050)

---

## 📌 API 명세

### ✅ 의류 분류 API

- **Endpoint:** `/category/predict`
- **Method:** `POST`
- **Request:** `file (form-data)`
- **Response 예시:**
```json
{
  "category": "Tshirts",
  "semantic_category": "tops"
}
```

---

### ✅ 색상 추출 API

- **Endpoint:** `/color/extract-colors`
- **Method:** `POST`
- **Request:** `file (form-data)`
- **Response 예시:**
```json
{
  "dominant_rgb": [200, 50, 50],
  "dominant_hex": "#c83232",
  "color": "Brick Red",
  "sub_rgb": [245, 222, 179]
}
```

---

## 📎 참고

- 모델 파일(`model.tflite`)은 GitHub에는 포함되지 않으며, 서버 내부에 직접 업로드해 사용해야 합니다.
- Swagger UI 접속은 `http://<서버IP>:<포트>/docs` 에서 가능합니다.

---

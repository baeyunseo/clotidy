# 의류 색상 추출 API 🎨

KMeans 기반의 FastAPI 서버로, 사용자가 업로드한 이미지에서 의류의 주요 색상(dominant)과 보조 색상(sub)을 추출합니다. HEX 코드와 RGB 형태로 반환되어 시각화 및 추천 알고리즘에 활용 가능합니다.

---

## ✅ 엔드포인트

### `POST /extract-colors/`

이미지 파일을 업로드하면 dominant / sub 색상을 RGB + HEX 형식으로 반환합니다.

---

### 🔸 요청

- Method: `POST`
- Content-Type: `multipart/form-data`
- 파라미터:
  - `file`: 이미지 파일 (필수)

---

### 🔸 응답 예시

```json
{
  "dominant_rgb": [200, 50, 50],
  "dominant_hex": "#c83232",
  "sub_rgb": [245, 222, 179]
}
```

---

## 🚀 로컬 실행 방법

```bash
pip install -r requirements.txt
python -m uvicorn test_color_hex:app --reload
```

실행 후 브라우저에서 [http://localhost:8000/docs](http://localhost:8000/docs) 접속하여 Swagger UI에서 테스트할 수 있습니다.

---

## 📁 파일 구조

```
.
├── test_color_hex.py        # FastAPI 서버 코드 (색상 추출 로직 포함)
├── requirements.txt
└── README.md
```

# 계절감 추론 API (Clothing Season Detection API)

## 구성
- `app.py`: Flask 기반 계절감 추론 서버
- `best_season_model.pth`: 학습된 MobileNetV2 모델 (별도 제공)

## 실행 방법
1. 필요한 패키지 설치
```
pip install flask torch torchvision pillow
```

2. 서버 실행
```
python app.py
```

3. API 테스트 (curl 예시)
```
curl -X POST "http://localhost:5000/predict-season" -F "image=@C:/path/to/image.jpg"
```

## 응답 예시
```json
{
  "season": "FW",
  "confidence": 0.8412
}
```

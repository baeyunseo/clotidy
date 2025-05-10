[Clothing Classifier API 사용법]

✔️ 구성 파일:
- classifier.py : FastAPI 기반 카테고리 추론 서버 코드
- clothing_classifier_mobilenetv2.tflite : 학습된 의류 분류 모델

✔️ 실행 방법:
1. 필수 패키지 설치
   pip install fastapi uvicorn tensorflow pillow numpy

2. 서버 실행
   uvicorn classifier:app --reload

3. 접속 후 테스트
   브라우저에서 http://127.0.0.1:8000/docs 접속
   → 이미지 업로드하여 카테고리 분류 결과 확인

✔️ 엔드포인트 설명
- POST /category
  - form-data로 이미지 파일(file) 업로드
  - 응답 예시: {"category": "Tshirts"}

문의: 클로티디 개발팀

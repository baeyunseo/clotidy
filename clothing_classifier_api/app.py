
from fastapi import FastAPI, UploadFile, File
import uvicorn
from classifier import predict_from_file  # classifier.py에 함수가 있다고 가정

app = FastAPI()

@app.post("/predict-category")
async def predict_category(file: UploadFile = File(...)):
    contents = await file.read()
    image_path = "temp.jpg"
    with open(image_path, "wb") as f:
        f.write(contents)

    # 예측 함수 호출 (classifier.py 내부 구현 필요)
    predicted_category = predict_from_file(image_path)
    return {"category": predicted_category}

# 직접 실행 가능하도록
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)

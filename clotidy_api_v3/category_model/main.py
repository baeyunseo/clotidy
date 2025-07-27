from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
from io import BytesIO
import os
from tflite_runtime.interpreter import Interpreter

# TFLite 모델 경로
MODEL_PATH = os.path.join(os.path.dirname(__file__), "category_model.tflite")
interpreter = Interpreter(model_path=MODEL_PATH)
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# 클래스 인덱스 → fine_category 라벨
label_map = [
    'backpack', 'belt', 'blazer', 'blouse', 'boots', 'cardigan', 'coat', 'dress', 'earrings', 'flats',
    'handbag', 'hat', 'heels', 'jacket', 'jeans', 'loafers', 'necklace', 'pants', 'shorts', 'skirt',
    'sleeveless top', 'sneakers', 'socks', 'sunglasses', 'sweater', 'sweatpants', 'sweatshirt', 'tshirt'
]

# fine_category → semantic_category 매핑
fine_to_semantic = {
    "backpack": "bags",
    "belt": "accessories",
    "blazer": "outerwear",
    "blouse": "tops",
    "boots": "shoes",
    "cardigan": "outerwear",
    "coat": "outerwear",
    "dress": "all-body",
    "earrings": "jewellery",
    "flats": "shoes",
    "handbag": "bags",
    "hat": "hats",
    "heels": "shoes",
    "jacket": "outerwear",
    "jeans": "bottoms",
    "loafers": "shoes",
    "necklace": "jewellery",
    "pants": "bottoms",
    "shorts": "bottoms",
    "skirt": "bottoms",
    "sleeveless top": "tops",
    "sneakers": "shoes",
    "socks": "accessories",
    "sunglasses": "accessories",
    "sweater": "tops",
    "sweatpants": "bottoms",
    "sweatshirt": "tops",
    "tshirt": "tops"
}

# FastAPI 앱 초기화
app = FastAPI()

# 이미지 전처리
def preprocess_image(image: Image.Image):
    image = image.convert("RGB")
    image = image.resize((300, 300))  # input shape 맞춰서
    img_array = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(img_array, axis=0)

# 예측 엔드포인트
@app.post("/category")
async def predict(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(BytesIO(contents))
        input_data = preprocess_image(image)

        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()
        output_data = interpreter.get_tensor(output_details[0]['index'])

        fine_category = label_map[np.argmax(output_data)]
        semantic_category = fine_to_semantic.get(fine_category, "unknown")

        return {
            "category": fine_category,
            "semantic_category": semantic_category
        }

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

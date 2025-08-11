import os
import numpy as np
from PIL import Image
from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse
from tflite_runtime.interpreter import Interpreter
from io import BytesIO
from loguru import logger

router = APIRouter()

# TFLite 모델 경로
MODEL_PATH = os.path.join(os.path.dirname(__file__), "category_model.tflite")

logger.info("📦 모델 로딩 시작")

try:
    interpreter = Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    logger.success("✅ 모델 로딩 완료")
except Exception as e:
    logger.error(f"❌ 모델 로딩 실패: {e}")
    raise RuntimeError("TFLite 모델 로딩 중 오류 발생")

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


# 이미지 전처리
def preprocess_image(image: Image.Image) -> np.ndarray:
    """입력 이미지를 모델에 맞게 전처리"""
    logger.debug("🧼 이미지 전처리 시작")
    image = image.convert("RGB")
    image = image.resize((300, 300))  # 혹시 input_details에서 불러오고 싶다면: input_details[0]['shape'][1:3]
    image_np = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(image_np, axis=0)


# 예측 엔드포인트
@router.post("/")
async def predict(file: UploadFile = File(...)):
    try:
        logger.info(f"📷 업로드된 파일: {file.filename}")
        contents = await file.read()
        image = Image.open(BytesIO(contents))

        input_data = preprocess_image(image)
        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()
        output_data = interpreter.get_tensor(output_details[0]['index'])

        fine_category = label_map[np.argmax(output_data)]
        semantic_category = fine_to_semantic.get(fine_category, "unknown")

        logger.success(f"✅ 예측 완료: {fine_category} → {semantic_category}")
        return {
            "category": fine_category,
            "semantic_category": semantic_category
        }

    except Exception as e:
        logger.error(f"❌ 예측 실패: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)
    
__all__ = ["router"]
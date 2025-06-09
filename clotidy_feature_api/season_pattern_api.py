from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from PIL import Image
import numpy as np
import tensorflow as tf
from io import BytesIO

app = FastAPI()

# 모델 로드
season_model = tf.keras.models.load_model("season_classifier_model_68.keras")  # ✅ 수정된 계절감 모델
pattern_model = tf.keras.models.load_model("pattern_classifier_model.keras")
pattern_refine_model = tf.keras.models.load_model("pattern_finetuned_floral_vs_print_v2.keras")

# 응답 모델 (색상 관련 필드 제거됨)
class FeatureResult(BaseModel):
    season: str
    season_confidence: float
    pattern: str
    pattern_confidence: float

@app.post("/extract-features", response_model=FeatureResult)
async def extract_features(file: UploadFile = File(...)):
    image = Image.open(BytesIO(await file.read())).convert("RGB")
    image_np = np.array(image)

    # 계절 추론
    resized = tf.image.resize(image_np, [224, 224]) / 255.0
    input_tensor = tf.expand_dims(resized, axis=0)
    season_pred = season_model.predict(input_tensor)[0]
    season_label = "spring_summer" if np.argmax(season_pred) == 0 else "fall_winter"
    season_conf = float(np.max(season_pred))

    # 패턴 추론
    pattern_pred = pattern_model.predict(input_tensor)[0]
    index_to_label = {0: 'check', 1: 'floral', 2: 'print', 3: 'solid', 4: 'stripe'}
    pattern_index = np.argmax(pattern_pred)
    pattern_label = index_to_label[pattern_index]
    pattern_conf = float(pattern_pred[pattern_index])

    # floral vs. print refine
    if pattern_label in ["floral", "print"]:
        refine_pred = pattern_refine_model.predict(input_tensor)[0][0]
        pattern_label = "floral" if refine_pred < 0.5 else "print"
        pattern_conf = float(1 - refine_pred) if pattern_label == "floral" else float(refine_pred)

    return {
        "season": season_label,
        "season_confidence": round(season_conf, 4),
        "pattern": pattern_label,
        "pattern_confidence": round(pattern_conf, 4)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)

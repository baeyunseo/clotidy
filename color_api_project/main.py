
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
from color_utils import extract_colors_from_upload

app = FastAPI()

# CORS 설정 (원하는 origin으로 변경 가능)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ColorResult(BaseModel):
    color: str
    color_rgb: list
    sub_color_rgb: Optional[list] = None

@app.post("/extract-color", response_model=ColorResult)
async def extract_color(file: UploadFile = File(...)):
    color_name, dominant_rgb, sub_rgb = await extract_colors_from_upload(file)
    return {
        "color": color_name,
        "color_rgb": dominant_rgb,
        "sub_color_rgb": sub_rgb
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)

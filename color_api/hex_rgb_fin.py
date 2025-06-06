from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
import cv2
from io import BytesIO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def rgb_to_hex(rgb):
    return '#{:02x}{:02x}{:02x}'.format(*rgb)

def generate_mask_from_image(image_np):
    gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
    _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    return mask

def extract_dominant_and_sub_color(image_np, mask, n_colors=4, sub_threshold=0.1):
    pixels = image_np[mask == 255].reshape(-1, 3)

    if len(pixels) < n_colors:
        return None, None

    kmeans = KMeans(n_clusters=n_colors, random_state=42).fit(pixels)
    counts = np.bincount(kmeans.labels_)
    total = np.sum(counts)
    sorted_indices = np.argsort(counts)[::-1]

    dominant = tuple(map(int, kmeans.cluster_centers_[sorted_indices[0]]))

    sub_color = None
    for idx in sorted_indices[1:]:
        ratio = counts[idx] / total
        if ratio >= sub_threshold:
            sub_color = tuple(map(int, kmeans.cluster_centers_[idx]))
            break

    return dominant, sub_color

@app.post("/extract-colors/")
async def extract_colors(file: UploadFile = File(...)):
    image = Image.open(BytesIO(await file.read())).convert("RGB")
    image_np = np.array(image)
    mask = generate_mask_from_image(image_np)
    dominant_rgb, sub_rgb = extract_dominant_and_sub_color(image_np, mask)

    return {
        "dominant_rgb": dominant_rgb,
        "dominant_hex": rgb_to_hex(dominant_rgb) if dominant_rgb else None,
        "sub_rgb": sub_rgb
    }

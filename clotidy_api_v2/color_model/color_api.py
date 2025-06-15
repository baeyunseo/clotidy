from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
import cv2
from io import BytesIO
from scipy.spatial import distance

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

# 열 방향 매핑: RGB -> color name
RGB_TO_RECOMMENDED_COLOR = {
    (255, 0, 0): "red",
    (187, 26, 26): "red",
    ( 145, 38, 44): "red",
    (255, 165, 0): "orange",
    (255, 255, 0): "yellow",
    (225, 197, 124): "yellow",
    (239, 215, 175): "lightyellow",
    (0, 128, 0) : "green",
    (0, 0, 255): "blue",
    (128, 0, 128): "purple",
    (255, 192, 203): "pink",
    (165, 42, 42): "brown",
    (65, 47, 45): "brown",
    (100, 65, 50): "brown",
    (255, 255, 255): "white",
    (0, 0, 0): "black",
    (245, 245, 220): "beige",
    (209, 199, 181): "beige",
    (0, 0, 128): "navy",
    (34, 46, 62): "navy",
    (128, 128, 0): "olive",
    (195, 176, 145): "khaki",
    (86, 87, 71): "khaki",
    (152, 255, 152): "mint",
    (255, 255, 240): "ivory",
    (128, 0, 32): "burgundy",
    (255, 105, 180): "hotpink",
    (218, 188, 183): "pink",
    (21, 96, 189): "denim",
    (217, 231, 237): "skyblue",
    (154, 176, 194): "skyblue"
}

RECOMMENDED_RGBS = list(RGB_TO_RECOMMENDED_COLOR.keys())

# ✅ white/gray 계열 판단 함수 추가
def is_gray_like(rgb, tolerance=10, brightness_threshold=230):
    r, g, b = rgb
    return (
        max(abs(r - g), abs(g - b), abs(b - r)) <= tolerance and
        max(r, g, b) < brightness_threshold
    )

def is_white_like(rgb, tolerance=10, brightness_threshold=230):
    r, g, b = rgb
    return (
        min(r, g, b) >= brightness_threshold and
        max(abs(r - g), abs(g - b), abs(b - r)) <= tolerance
    )

def is_black_like(rgb, threshold=50, tolerance=10):
    r, g, b = rgb
    return (
        max(r, g, b) <= threshold and
        max(abs(r - g), abs(g - b), abs(b - r)) <= tolerance
    )


def closest_recommended_color(rgb):
    if is_white_like(rgb, tolerance=10):
        return "white"
    if is_black_like(rgb, threshold=50, tolerance=10):
        return "black"
    if is_gray_like(rgb, tolerance=10):
        return "gray"

    min_dist = float('inf')
    best_match = None
    for ref_rgb in RECOMMENDED_RGBS:
        d = distance.euclidean(rgb, ref_rgb)
        if d < min_dist:
            min_dist = d
            best_match = ref_rgb
    return RGB_TO_RECOMMENDED_COLOR.get(best_match)


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

    dominant_hex = rgb_to_hex(dominant_rgb) if dominant_rgb else None
    simple_color = closest_recommended_color(dominant_rgb) if dominant_rgb else None

    return {
        "dominant_rgb": dominant_rgb,
        "dominant_hex": dominant_hex,
        "color": simple_color,
        "sub_rgb": sub_rgb
    }

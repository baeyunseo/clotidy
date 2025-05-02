
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
import cv2
from io import BytesIO

# 단순화 색상군 대표 RGB
simplified_rgb_map = {
    'black': (30, 30, 30),
    'white': (240, 240, 240),
    'gray': (128, 128, 128),
    'blue': (50, 100, 200),
    'green': (60, 180, 75),
    'brown': (139, 69, 19),
    'red': (200, 50, 50),
    'pink': (255, 105, 180),
    'yellow': (255, 215, 0),
    'orange': (255, 140, 0),
    'purple': (147, 112, 219),
    'beige': (245, 222, 179),
    'multi': (127, 127, 127)
}

def map_rgb_to_simplified_color(rgb):
    min_distance = float('inf')
    best_match = None
    for color_name, ref_rgb in simplified_rgb_map.items():
        distance = np.linalg.norm(np.array(rgb) - np.array(ref_rgb))
        if distance < min_distance:
            min_distance = distance
            best_match = color_name
    return best_match

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

async def extract_colors_from_upload(file):
    image = Image.open(BytesIO(await file.read())).convert("RGB")
    image_np = np.array(image)
    mask = generate_mask_from_image(image_np)
    dominant_rgb, sub_rgb = extract_dominant_and_sub_color(image_np, mask)
    color_name = map_rgb_to_simplified_color(dominant_rgb) if dominant_rgb else "unknown"
    return color_name, dominant_rgb, sub_rgb

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
import tensorflow as tf
import io

app = FastAPI()

interpreter = tf.lite.Interpreter(model_path="clothing_classifier_mobilenetv2.tflite")
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

LABELS = [
    'Accessory Gift Set', 'Baby Dolls', 'Backpacks', 'Bangle', 'Basketballs', 'Bath Robe',
    'Beauty Accessory', 'Belts', 'Blazers', 'Body Lotion', 'Body Wash and Scrub', 'Booties',
    'Boxers', 'Bra', 'Bracelet', 'Briefs', 'Camisoles', 'Capris', 'Caps', 'Casual Shoes',
    'Churidar', 'Clothing Set', 'Clutches', 'Compact', 'Concealer', 'Cufflinks',
    'Cushion Covers', 'Deodorant', 'Dresses', 'Duffel Bag', 'Dupatta', 'Earrings',
    'Eye Cream', 'Eyeshadow', 'Face Moisturisers', 'Face Scrub and Exfoliator',
    'Face Serum and Gel', 'Face Wash and Cleanser', 'Flats', 'Flip Flops', 'Footballs',
    'Formal Shoes', 'Foundation and Primer', 'Fragrance Gift Set', 'Free Gifts', 'Gloves',
    'Hair Accessory', 'Hair Colour', 'Handbags', 'Hat', 'Headband', 'Heels',
    'Highlighter and Blush', 'Innerwear Vests', 'Ipad', 'Jackets', 'Jeans', 'Jeggings',
    'Jewellery Set', 'Jumpsuit', 'Kajal and Eyeliner', 'Key chain', 'Kurta Sets',
    'Kurtas', 'Kurtis', 'Laptop Bag', 'Leggings', 'Lehenga Choli', 'Lip Care', 'Lip Gloss',
    'Lip Liner', 'Lip Plumper', 'Lipstick', 'Lounge Pants', 'Lounge Shorts',
    'Lounge Tshirts', 'Makeup Remover', 'Mascara', 'Mask and Peel', 'Mens Grooming Kit',
    'Messenger Bag', 'Mobile Pouch', 'Mufflers', 'Nail Essentials', 'Nail Polish',
    'Necklace and Chains', 'Nehru Jackets', 'Night suits', 'Nightdress', 'Patiala',
    'Pendant', 'Perfume and Body Mist', 'Rain Jacket', 'Rain Trousers', 'Ring', 'Robe',
    'Rompers', 'Rucksacks', 'Salwar', 'Salwar and Dupatta', 'Sandals', 'Sarees', 'Scarves',
    'Shapewear', 'Shirts', 'Shoe Accessories', 'Shoe Laces', 'Shorts', 'Shrug', 'Skirts',
    'Socks', 'Sports Sandals', 'Sports Shoes', 'Stockings', 'Stoles', 'Suits', 'Sunglasses',
    'Sunscreen', 'Suspenders', 'Sweaters', 'Sweatshirts', 'Swimwear', 'Tablet Sleeve',
    'Ties', 'Ties and Cufflinks', 'Tights', 'Toner', 'Tops', 'Track Pants', 'Tracksuits',
    'Travel Accessory', 'Trolley Bag', 'Trousers', 'Trunk', 'Tshirts', 'Tunics',
    'Umbrellas', 'Waist Pouch', 'Waistcoat', 'Wallets', 'Watches', 'Water Bottle',
    'Wristbands'
]

CATEGORY_TO_SEMANTIC = {
    # Tops
    'Shirts': 'tops', 'Tshirts': 'tops', 'Tops': 'tops', 'Tunics': 'tops',
    'Camisoles': 'tops', 'Lounge Tshirts': 'tops',

    # Bottoms
    'Jeans': 'bottoms', 'Trousers': 'bottoms', 'Shorts': 'bottoms',
    'Track Pants': 'bottoms', 'Leggings': 'bottoms', 'Capris': 'bottoms',
    'Jeggings': 'bottoms', 'Skirts': 'bottoms', 'Patiala': 'bottoms',
    'Salwar': 'bottoms', 'Rain Trousers': 'bottoms', 'Lounge Pants': 'bottoms',
    'Lounge Shorts': 'bottoms',

    # All-body
    'Dresses': 'all-body', 'Jumpsuit': 'all-body', 'Clothing Set': 'all-body',
    'Lehenga Choli': 'all-body', 'Rompers': 'all-body', 'Night suits': 'all-body',
    'Nightdress': 'all-body', 'Sarees': 'all-body', 'Bath Robe': 'all-body',

    # Outerwear
    'Jackets': 'outerwear', 'Blazers': 'outerwear', 'Sweatshirts': 'outerwear',
    'Sweaters': 'outerwear', 'Shrug': 'outerwear', 'Rain Jacket': 'outerwear',
    'Nehru Jackets': 'outerwear', 'Waistcoat': 'outerwear',

    # Shoes
    'Casual Shoes': 'shoes', 'Formal Shoes': 'shoes', 'Flats': 'shoes',
    'Heels': 'shoes', 'Sandals': 'shoes', 'Flip Flops': 'shoes',
    'Sports Shoes': 'shoes', 'Booties': 'shoes', 'Sports Sandals': 'shoes',

    # Bags
    'Handbags': 'bags', 'Clutches': 'bags', 'Laptop Bag': 'bags',
    'Rucksacks': 'bags', 'Messenger Bag': 'bags', 'Duffel Bag': 'bags',
    'Mobile Pouch': 'bags', 'Trolley Bag': 'bags', 'Waist Pouch': 'bags',

    # Accessories
    'Socks': 'accessories', 'Belts': 'accessories', 'Caps': 'accessories', 'Hair Accessory': 'accessories',
    'Cufflinks': 'accessories', 'Wristbands': 'accessories', 'Shoe Accessories': 'accessories',
    'Suspenders': 'accessories', 'Gloves': 'accessories', 'Key chain': 'accessories',
    'Ties': 'accessories', 'Ties and Cufflinks': 'accessories', 'Umbrellas': 'accessories',
    'Wallets': 'accessories', 'Accessory Gift Set': 'accessories',

    # Hats
    'Hat': 'hats', 'Headband': 'hats',

    # Scarves
    'Mufflers': 'scarves', 'Scarves': 'scarves', 'Stoles': 'scarves',

    # Jewellery
    'Earrings': 'jewellery', 'Jewellery Set': 'jewellery', 'Necklace and Chains': 'jewellery',
    'Pendant': 'jewellery', 'Ring': 'jewellery', 'Bracelet': 'jewellery',
    'Bangle': 'jewellery',

    # Sunglasses
    'Sunglasses': 'sunglasses',
}

def preprocess_image(image_bytes, input_shape):
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    image = image.resize((input_shape[1], input_shape[2]))
    image = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(image, axis=0)

@app.post("/category")
async def predict_category(file: UploadFile = File(...)):
    contents = await file.read()
    input_data = preprocess_image(contents, input_details[0]['shape'])

    interpreter.set_tensor(input_details[0]['index'], input_data)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]['index'])
    predicted_idx = int(np.argmax(output))
    predicted_label = LABELS[predicted_idx]
    semantic = CATEGORY_TO_SEMANTIC.get(predicted_label, "unknown")

    return JSONResponse({
        "category": predicted_label,
        "semantic_category": semantic
    })

from flask import Flask, request, jsonify
import torch
from torchvision import models, transforms
from torchvision.models import MobileNet_V2_Weights
from PIL import Image
import io

app = Flask(__name__)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

model = models.mobilenet_v2(weights=MobileNet_V2_Weights.DEFAULT)
model.classifier[1] = torch.nn.Linear(model.last_channel, 1)
model.load_state_dict(torch.load("best_season_model.pth", map_location=device))
model = model.to(device)
model.eval()

@app.route("/predict-season", methods=["POST"])
def predict_season():
    if "image" not in request.files:
        return jsonify({"error": "이미지 파일이 필요합니다."}), 400

    file = request.files["image"]
    image = Image.open(io.BytesIO(file.read())).convert("RGB")
    image = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(image)
        prob = torch.sigmoid(output).item()
        label = "FW" if prob > 0.5 else "SS"

    return jsonify({
        "season": label,
        "confidence": round(prob, 4)
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

# Integrated Clothing Feature API

This FastAPI server extracts clothing-related features from a single image:
- Dominant and sub colors (RGB and simplified label)
- Seasonal classification (Spring/Summer or Fall/Winter)
- Clothing pattern classification (floral, stripe, solid, etc.)

## 🧠 Model Folder Structure

```
integrated_clothing_feature_api/
├── app.py                     # FastAPI entry point
├── model/
│   ├── season_classifier_model.keras
│   ├── pattern_classifier_model.keras
│   └── pattern_finetuned_floral_vs_print_v2.keras
├── requirements.txt
├── README.md
└── .gitignore
```

## 🛠 How to Run

```bash
pip install -r requirements.txt
python app.py
```

or

```bash
uvicorn app:app --reload
```

## 🔍 API Endpoint

- `POST /extract-features`  
  - form-data: `file = image.jpg`
  - returns JSON:

```json
{
  "color": "blue",
  "color_rgb": [54, 138, 225],
  "sub_color_rgb": [38, 102, 184],
  "season": "spring_summer",
  "season_confidence": 0.87,
  "pattern": "floral",
  "pattern_confidence": 0.93
}
```
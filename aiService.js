import axios from "axios";
import fs from "fs";
import FormData from "form-data";

export async function fetchColorFromAI(imagePath) {
  try {
    console.log("🎯 AI 분석 요청: 이미지 전송 중...");

    const formData = new FormData();
    formData.append("file", fs.createReadStream(imagePath));

    const response = await axios.post(
      "http://54.79.167.144:8000/extract-colors/",
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 10000,
      }
    );

    console.log("🎯 AI 응답 수신:", response.data);

    const {
      color = "unknown",
      dominant_rgb = [0, 0, 0],
      sub_rgb = [0, 0, 0],
      semantic_category = []
    } = response.data;

    return {
      color,
      color_rgb: dominant_rgb,
      sub_color_rgb: sub_rgb,
      semantic_category
    };
  } catch (error) {
    console.error("❌ AI 분석 실패:", error.message);
    throw error;
  }
}

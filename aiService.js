// aiService.js

import axios from "axios";
import FormData from "form-data";
import fs from "fs";

/**
 * FastAPI 서버에 옷 이미지 전송 → 색상 분석 결과 받기
 * @param {string} imagePath - 로컬 이미지 경로
 * @returns {Promise<object>} - color, color_rgb, sub_color_rgb 포함한 AI 분석 결과
 */
export async function fetchColorFromAI(imagePath) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(imagePath), {
    filename: "sample1.jpg",
    contentType: "image/jpeg" // MIME 타입 명시
  });

  try {
    console.log("🎯 AI 분석 요청: 이미지 전송 중...");
    const response = await axios.post("http://54.79.167.144:8000/extract-color/", formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    console.log("🎯 AI 응답 수신:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ AI 분석 실패:", error.message);
    throw error;
  }
}

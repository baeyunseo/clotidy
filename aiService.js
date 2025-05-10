// ai 연동 및 분석 

import axios from "axios";
import fs from "fs";
import FormData from "form-data";

/**
 * AI에게 이미지 분석 요청
 * @param {string} imagePath - 로컬 이미지 파일 경로
 * @returns {Promise<object>} - AI 응답 (color, color_rgb, sub_color_rgb)
 */

export async function fetchColorFromAI(imagePath) {
  try {
    const imageData = fs.readFileSync(imagePath);
    const response = await axios.post("http://localhost:8000/extract-color", imageData, {
      headers: {
        "Content-Type": "application/octet-stream"
      }
    });

    const { color, color_rgb, sub_color_rgb, season, pattern } = response.data;

    return {
      color,
      color_rgb,
      sub_color_rgb,
      season,
      pattern // ← 이게 추가되었는지 확인
    };

  } catch (error) {
    console.error("❌ AI 분석 실패:", error.message);
    throw error;
  }
}


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
    const form = new FormData();
    form.append("file", fs.createReadStream(imagePath));  // 이미지 파일 넣기

    const response = await axios.post("http://localhost:8000/extract-color", form, {
      headers: form.getHeaders(),
    });

    return response.data; // 예: { color: "blue", color_rgb: {...}, sub_color_rgb: {...} }
  } catch (error) {
    console.error("❌ AI 분석 실패:", error.message);
    return null;
  }
}

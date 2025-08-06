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
      semantic_category = [],
      category = "unknown",  
      styleType = []   
    } = response.data;

    return {
      color,
      color_rgb: dominant_rgb,
      sub_color_rgb: sub_rgb,
      semantic_category,
      category,
      styleType
    };
  } catch (error) {
    console.error("❌ AI 분석 실패:", error.message);
    throw error;
  }
}

export async function fetchSemanticCategoryFromAI(imagePath) {
  try {
    console.log("🎯 AI 의미 카테고리 분석 요청 중...");

    const formData = new FormData();
    formData.append("file", fs.createReadStream(imagePath));

    const response = await axios.post(
      "http://54.79.167.144:8000/extract-semantic-category/",  // 예시 URL (실제 AI 팀이 알려준 거로 바꿔야 함)
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 10000,
      }
    );

    console.log("🎯 의미 카테고리 응답:", response.data);
    return response.data.semantic_category || [];
  } catch (error) {
    console.error("❌ 의미 카테고리 분석 실패:", error.message);
    return [];
  }
}


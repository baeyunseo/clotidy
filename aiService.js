import axios from "axios";
import fs from "fs";
import FormData from "form-data";
// === [ADD] 생성형 AI 베이스 URL (8001 포트) ===
const AI_GEN_BASE_URL = process.env.AI_GEN_BASE_URL || "http://54.79.167.144:8001";


// 
export async function fetchColorFromAI(imagePath) {
  try {
    console.log("🎯 AI 분석 요청: 이미지 전송 중...");

    const formData = new FormData();
    formData.append("file", fs.createReadStream(imagePath));

    const response = await axios.post(
      "http://54.79.167.144:8000/extract-colors",
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

// --- 새로 추가 ---
// 카테고리 전용 호출
export async function fetchCategoryFromAI(imagePath) {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(imagePath));

    const response = await axios.post(
      "http://54.79.167.144:8000/category", // 프론트가 알려준 카테고리 엔드포인트
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 10000,
      }
    );

    const {
      category = "unknown",
      styleType = []
    } = response.data || {};

    return { category, styleType };
  } catch (error) {
    console.error("❌ 카테고리 분석 실패:", error.message);
    return { category: "unknown", styleType: [] };
  }
}


export async function fetchSemanticCategoryFromAI(imagePath) {
  try {
    console.log("🎯 AI 의미 카테고리 분석 요청 중...");

    const formData = new FormData();
    formData.append("file", fs.createReadStream(imagePath));

    const response = await axios.post(
      "http://54.79.167.144:8000/extract-semantic-category",  // 예시 URL (실제 AI 팀이 알려준 거로 바꿔야 함)
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

// === [ADD] 구매 유사도 추천 호출 ===
// 사용법:
//   const data = await fetchPurchaseRecommendation({
//     targetImagePath: 'uploads/xxx.jpg', // multer 저장 경로
//     userId: 'firebase-uid',
//     closetImageUrls: ['http://.../uploads/a.jpg', ...], // 절대 URL
//     topK: 5
//   });

export async function fetchPurchaseRecommendation({
  targetImagePath,
  userId,
  closetImageUrls = [],
  topK = 5,
}) {
  if (!targetImagePath) throw new Error("targetImagePath is required");
  if (!userId) throw new Error("userId is required");

  const form = new FormData();
  form.append("file", fs.createReadStream(targetImagePath));
  form.append("user_id", userId);
  form.append("closet_images", JSON.stringify(closetImageUrls));
  form.append("top_k", String(topK));

  const { data } = await axios.post(
    `${AI_GEN_BASE_URL}/similarity/recommend`,
    form,
    { headers: form.getHeaders(), timeout: 20000 }
  );

  // 기대 응답 예:
  // {
  //   decision: "buy" | "hold" | "no",
  //   top_matches: [{ image_url: "...", cloth_id: "...", score: 0.92 }, ...]
  // }
  return data;
}



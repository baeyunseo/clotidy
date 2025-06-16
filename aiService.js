import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export async function fetchColorFromAI(imagePath) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(imagePath), {
    filename: "sample.jpg",
    contentType: "image/jpeg",
  });

  try {
    console.log("🎯 AI 분석 요청: 이미지 전송 중...");
    const response = await axios.post("http://54.79.167.144:8000/extract-colors/", formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log("🎯 AI 응답 수신:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ AI 분석 실패:", error.message);
    throw error;
  }
}

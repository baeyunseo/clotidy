// test/testClothWithAI.js

import { registerClothWithAI } from "../clothService.js";

// ✅ 테스트용 정보
const userId = "test-user-001";
const clothName = "샘플 티셔츠";
const category = "상의";
const location = "1층 왼쪽칸";
const imagePath = "./test/sample_images/sample1.jpg"; 

async function test() {
  try {
    await registerClothWithAI(
      userId,
      clothName,
      category,
      location,
      imagePath
    );
    console.log("🎉 테스트 완료: 옷 등록 성공");
  } catch (error) {
    console.error("❌ 테스트 실패:", error.message);
  }
}

test();

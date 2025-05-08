// clothService.js

import { 
    collection, addDoc, query, where, getDocs, doc, updateDoc, increment, deleteDoc 
  } from "firebase/firestore";
  import { db } from "./firebaseConfig.js";
  
// 옷 등록 기능 (color_rgb, sub_color_rgb 필드 추가)
export async function registerCloth(
  userId,
  clothName,
  category,
  color,
  season,
  imageUrl,
  location,
  colorRgb,        // { r: number, g: number, b: number }
  subColorRgb      // { r: number, g: number, b: number } or null
) {
  try {
    const docRef = await addDoc(collection(db, "clothes"), {
      user_id: userId,
      cloth_name: clothName,
      category: category,
      color: color, // 단순 컬러 이름
      color_rgb: colorRgb || null,         // Firestore에 map으로 저장
      sub_color_rgb: subColorRgb || null,  // Firestore에 map으로 저장
      season: season,
      image_url: imageUrl,
      location: location,
      worn_count: 0,
      last_worn: null
    });
    console.log("✅ 옷 등록 성공:", docRef.id);
  } catch (error) {
    console.error("❌ 옷 등록 실패:", error);
  }
}

  
  // 옷 검색 기능 (userid기준으로 옷 리스트 가져오기)
  export async function getClothes(userId) {
    try {
      const q = query(collection(db, "clothes"), where("user_id", "==", userId));
      const querySnapshot = await getDocs(q);
  
      const clothesList = [];
      querySnapshot.forEach((doc) => {
        clothesList.push({ id: doc.id, ...doc.data() });
      });
  
      console.log("옷 리스트:", clothesList);
      return clothesList;
    } catch (error) {
      console.error("옷 조회 실패:", error);
    }
  }
  
  // worn count 횟수 늘리기 (리마인드 기능 전용)
  export async function increaseWornCount(clothId) {
    try {
      const clothRef = doc(db, "clothes", clothId);
      await updateDoc(clothRef, {
        worn_count: increment(1),
        last_worn: new Date()
      });
      console.log("착용 횟수 증가 성공");
    } catch (error) {
      console.error("착용 횟수 증가 실패:", error);
    }
  }
  
  // 옷 삭제 기능
  export async function deleteCloth(clothId) {
    try {
      await deleteDoc(doc(db, "clothes", clothId));
      console.log("옷 삭제 성공");
    } catch (error) {
      console.error("옷 삭제 실패:", error);
    }
  }
  
  // 사용자가 이미지를 등록 할 시, ai 자동 분석하여 db에 저장
import { fetchColorFromAI } from "./aiService.js"; // AI 요청 함수

export async function registerClothWithAI(userId, clothName, category, imagePath, location) {
  try {
    const aiResult = await fetchColorFromAI(imagePath);
    if (!aiResult) throw new Error("AI 분석 실패");

    const { color, color_rgb, sub_color_rgb, season } = aiResult;

    await registerCloth(
      userId,
      clothName,
      category,
      color,
      season,
      "firebasestorageurl", // 추후 이미지 URL로 바꿔야 함
      location,
      color_rgb,
      sub_color_rgb
    );
  } catch (err) {
    console.error("자동 등록 실패:", err.message);
  }
}

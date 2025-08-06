// clothService.js

import { 
  collection, addDoc, query, where, getDocs, doc, updateDoc, increment, deleteDoc 
} from "firebase/firestore";
import { db } from "./firebaseConfig.js";
import { fetchColorFromAI } from "./aiService.js"; // AI 요청 함수
import { fetchSemanticCategoryFromAI } from "./aiService.js";


// 옷 등록 기능
export async function registerCloth(
  userId,
  clothName,
  category,
  color,
  season,
  imageUrl,
  location,
  colorRgb,
  subColorRgb, 
  semanticCategory,
  styleType
  
) {
  try {
    const docRef = await addDoc(collection(db, "clothes"), {
      user_id: userId,
      cloth_name: clothName,
      category: category,
      color: color,
      color_rgb: colorRgb || null,
      sub_color_rgb: subColorRgb || null,
      season: season,
      image_url: imageUrl,
      location: location,
       semantic_category: semanticCategory || [],
       styleType: styleType || [],
      worn_count: 0,
      last_worn: null
    });
    console.log("✅ 옷 등록 성공:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ 옷 등록 실패:", error);
  }
}

// 옷 검색 기능
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

// 착용 횟수 증가
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

// ✅ AI 분석 → 옷 등록 (AI 실패 시 입력값만 저장)
export async function registerClothWithAI(userId, clothName, category, location, imagePath) {
  const season = "unknown";
  let color = "unknown";
  let colorRgb = null;
  let subColorRgb = null;
  let semanticCategory = [];
  let styleType = [];


module.exports = {
  mapSemanticCategory
};




  try {
    const aiData = await fetchColorFromAI(imagePath);

    color = aiData.color || "unknown";
    colorRgb = aiData.color_rgb
      ? { r: aiData.color_rgb[0], g: aiData.color_rgb[1], b: aiData.color_rgb[2] }
      : null;
    subColorRgb = aiData.sub_color_rgb
      ? { r: aiData.sub_color_rgb[0], g: aiData.sub_color_rgb[1], b: aiData.sub_color_rgb[2] }
      : null;

    category = aiData.category || "";
    semanticCategory = [mapSemanticCategory(category)];
    styleType = aiData.styleType || [];

  } catch (error) {
    console.error("❌ AI 분석 실패, 입력값만 저장:", error.message);
  }

  try {
    const clothId = await registerCloth(
      userId,
      clothName,
      category,
      color,
      season,
      imagePath,
      location,
      colorRgb,
      subColorRgb,
      semanticCategory,
      styleType
    );
    return clothId;  // ✅ clothId 명시적으로 리턴
  } catch (error) {
    console.error("❌ Firestore 저장 실패:", error.message);
    throw error;
  }
}


// 옷 단일 조회
export async function getClothById(clothId) {
  try {
    const clothRef = doc(db, "clothes", clothId);
    const clothSnap = await getDoc(clothRef);

    if (!clothSnap.exists()) {
      throw new Error("해당 옷을 찾을 수 없습니다.");
    }

    console.log("단일 옷 조회 성공:", clothSnap.id);
    return { id: clothSnap.id, ...clothSnap.data() };
  } catch (error) {
    console.error("단일 옷 조회 실패:", error);
    throw error;
  }
}

// 옷 정보 수정
export async function updateCloth(clothId, updates) {
  try {
    const clothRef = doc(db, "clothes", clothId);
    await updateDoc(clothRef, updates);
    console.log("옷 정보 수정 성공");
  } catch (error) {
    console.error("옷 정보 수정 실패:", error);
    throw error;
  }
}

// 키워드 검색 (이름/카테고리에 keyword가 포함된 옷만 추출)
export async function searchClothes(userId, keyword = "") {
  try {
    const q = query(collection(db, "clothes"), where("user_id", "==", userId));
    const snapshot = await getDocs(q);

    const lower = keyword.toLowerCase();

    const filtered = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((item) => {
        const name = (item.cloth_name || "").toLowerCase();
        const category = (item.category || "").toLowerCase();
        return name.includes(lower) || category.includes(lower);
      });

    return filtered;
  } catch (e) {
    console.error("검색 실패:", e);
    throw e;
  }
}
// ai 분석 등록 분리 함수
export async function analyzeClothImage(imagePath) {
  const aiData = await fetchColorFromAI(imagePath);
  const category = aiData.category || "";
  const styleType = aiData.styleType || [];
  const color = aiData.color || "unknown";
  const colorRgb = aiData.color_rgb
    ? { r: aiData.color_rgb[0], g: aiData.color_rgb[1], b: aiData.color_rgb[2] }
    : null;
  const subColorRgb = aiData.sub_color_rgb
    ? { r: aiData.sub_color_rgb[0], g: aiData.sub_color_rgb[1], b: aiData.sub_color_rgb[2] }
    : null;

  return { category, styleType, color, colorRgb, subColorRgb };
}

// 카테고리 매핑 자동 추가 함수
export function mapSemanticCategory(category) {
  const mapping = {
   "backpack": "bags",
    "belt": "accessories",
    "blazer": "outerwear",
    "blouse": "tops",
    "boots": "shoes",
    "cardigan": "outerwear",
    "coat": "outerwear",
    "dress": "all-body",
    "earrings": "jewellery",
    "flats": "shoes",
    "handbag": "bags",
    "hat": "hats",
    "heels": "shoes",
    "jacket": "outerwear",
    "jeans": "bottoms",
    "loafers": "shoes",
    "necklace": "jewellery",
    "pants": "bottoms",
    "shorts": "bottoms",
    "skirt": "bottoms",
    "sleeveless top": "tops",
    "sneakers": "shoes",
    "socks": "accessories",
    "sunglasses": "accessories",
    "sweater": "tops",
    "sweatpants": "bottoms",
    "sweatshirt": "tops",
    "tshirt": "tops"
    // 추가 가능
  };
  return mapping[category] || 'unknown';
}





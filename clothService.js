// clothService.js

import { 
    collection, addDoc, query, where, getDocs, doc, updateDoc, increment, deleteDoc 
  } from "firebase/firestore";
  import { db } from "./firebaseConfig.js";
  
  // 옷 등록 기능
  export async function registerCloth(userId, clothName, category, color, season, imageUrl, location) {
    try {
      const docRef = await addDoc(collection(db, "clothes"), {
        user_id: userId,
        cloth_name: clothName,
        category: category,
        color: color,
        season: season,
        image_url: imageUrl,
        location: location,
        worn_count: 0,
        last_worn: null
      });
      console.log("옷 등록 성공:", docRef.id);
    } catch (error) {
      console.error("옷 등록 실패:", error);
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
  
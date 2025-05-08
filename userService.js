// userService.js

import { db } from "./firebaseConfig.js";
import { collection, setDoc, doc, updateDoc } from "firebase/firestore";

//회원가입/로그인 시 유저 정보 저장
 // @param {string} userId - Firebase Authentication UID
 // @param {string} name - 회원 이름
 // @param {string} email - 회원 이메일
 
export async function saveUserInfo(userId, name, email) {
  try {
    await setDoc(doc(db, "users", userId), { // users 컬렉션에 uid를 문서 id로 사용함
      name: name,
      email: email,
      created_at: new Date() // 가입 시간 자동 기록
    });
    console.log("회원 정보 저장 성공");
  } catch (error) {
    console.error("회원 정보 저장 실패", error);
  }
}

// 사용자 옷장 레이아웃 저장 및 수정
// @param {string} userId - 사용자 UID
// @param {object} layoutData - 옷장 레이아웃 정보 (JSON)

export async function saveClosetLayout(userId, layoutData) {
  try {
    const userRef = doc(db, "users", userId); // users 컬렉션 안에 해당 UID 문서를 찾음

    await updateDoc(userRef, {
      closet_layout: layoutData
    });

    console.log("✅ 옷장 레이아웃 저장/수정 성공");
  } catch (error) {
    console.error("❌ 옷장 레이아웃 저장/수정 실패:", error);
  }
}
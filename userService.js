// userService.js

import { db } from "./firebaseConfig.js";
import { collection, setDoc, doc } from "firebase/firestore";

/**
 * 회원가입/로그인 시 유저 정보 저장
 * @param {string} userId - Firebase Authentication UID
 * @param {string} name - 회원 이름
 * @param {string} email - 회원 이메일
 */
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

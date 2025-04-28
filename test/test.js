import { db } from "../firebaseConfig.js";
import { collection, addDoc } from "firebase/firestore";

// Firestore 테스트 데이터
async function testAddData() {
  try {
    const docRef = await addDoc(collection(db, "testCollection"), {
      testField: "test data",
      timestamp: new Date()
    });
    console.log("save 문서 ID:", docRef.id);
  } catch (error) {
    console.error("dont save", error);
  }
}

testAddData();

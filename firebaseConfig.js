// firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

//  Firebase sdk 
const firebaseConfig = {
    apiKey: "AIzaSyAwCpjzmqFfEGR_BWZm4ro1XaSPViebJvM",
    authDomain: "clotidy-f25b5.firebaseapp.com",
    projectId: "clotidy-f25b5",
    storageBucket: "clotidy-f25b5.firebasestorage.app",
    messagingSenderId: "69511253866",
    appId: "1:69511253866:web:86af1a0549cf6d94839f13",
    measurementId: "G-N294YYSGSF"
  };

// 앱 초기화
const app = initializeApp(firebaseConfig);

// Firestore DB 가져오기
const db = getFirestore(app);

export { db };

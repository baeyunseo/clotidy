// firebaseConfig.ts

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAwCpjzmqFfEGR_BWZm4ro1XaSPViebJvM",
    authDomain: "clotidy-f25b5.firebaseapp.com",
    projectId: "clotidy-f25b5",
    storageBucket: "clotidy-f25b5.firebasestorage.app",
    messagingSenderId: "69511253866",
    appId: "1:69511253866:web:86af1a0549cf6d94839f13",
    measurementId: "G-N294YYSGSF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
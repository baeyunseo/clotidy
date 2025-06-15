// server.js
import express from 'express';
import cors from 'cors';
import { saveUserInfo, saveClosetLayout } from './userService.js';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebaseConfig.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 이미지 업로드용 폴더
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 저장 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // .jpg, .png 등
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(express.json());

// 1. 유저 정보 저장 API
app.post('/api/save-user', async (req, res) => {
  const { userId, name, email } = req.body;
  try {
    await saveUserInfo(userId, name, email);
    res.status(200).json({ message: 'User saved successfully' });
  } catch (error) {
    console.error('회원 저장 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. 옷장 레이아웃 저장 API
app.post('/api/save-closet-layout', async (req, res) => {
  const { userId, layoutData } = req.body;
  try {
    await saveClosetLayout(userId, layoutData);
    res.status(200).json({ message: 'Closet layout saved successfully' });
  } catch (error) {
    console.error('옷장 레이아웃 저장 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 옷 등록 API
import { registerClothWithAI } from './clothService.js';

app.post('/api/register-cloth', upload.single('file'), async (req, res) => {
  const { userId, clothName, category, location } = req.body;
  const imagePath = req.file?.path;

  if (!imagePath){
    return res.status(400).json({error: '이미지 파일이 누락되었어요 😅'})
  }

  try {
    await registerClothWithAI(userId, clothName, category, location, imagePath);
    res.status(200).json({ message: 'Cloth registered successfully' });
  } catch (error) {
    console.error('옷 등록 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 유저 옷장 목록 조회 API
import { getClothes } from './clothService.js';

app.get('/api/get-clothes/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const clothes = await getClothes(userId);
    res.status(200).json(clothes);
  } catch (error) {
    console.error('옷장 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

//옷 삭제
import { deleteCloth } from './clothService.js';
import { error } from 'console';

app.delete('/api/delete-cloth/:clothId', async (req, res) => {
  const { clothId } = req.params;
  try {
    await deleteCloth(clothId);
    res.status(200).json({ message: 'Cloth deleted successfully' });
  } catch (error) {
    console.error('옷 삭제 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 유저정보조회 get
app.get('/api/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(userSnap.data());
  } catch (error) {
    console.error('유저 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 옷장 레이아웃 조회 get
app.get('/api/closet-layout/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { closet_layout, layout_type } = userSnap.data();
    res.status(200).json({ closet_layout, layout_type });
  } catch (error) {
    console.error('옷장 레이아웃 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 옷 정보 수정
app.patch('/api/update-cloth/:clothId', async (req, res) => {
  const { clothId } = req.params;
  const updates = req.body;
  try {
    await updateCloth(clothId, updates);
    res.status(200).json({ message: 'Cloth updated successfully' });
  } catch (error) {
    console.error('옷 수정 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

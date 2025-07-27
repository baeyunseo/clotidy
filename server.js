// server.js
import express from 'express';
import cors from 'cors';
import { saveUserInfo, saveClosetLayout } from './userService.js';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebaseConfig.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { registerClothWithAI, getClothes, deleteCloth, updateCloth, searchClothes } from './clothService.js';
import { getClothById } from './clothService.js';

// 이미지 업로드용 폴더 생성
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer 저장 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

const app = express();
app.use(cors());
//  업로드 이미지 static으로 서빙
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ✅ 파일 업로드 라우트 먼저 선언 (multipart/form-data 문제 방지)
app.post('/api/register-cloth', upload.single('file'), async (req, res) => {
  console.log('🎯 req.file:', req.file);     // multer가 파싱한 업로드 파일 정보
  console.log('🎯 req.body:', req.body);     // 함께 전송된 텍스트 데이터
  const { userId, clothName, category, location } = req.body;
  const imagePath = req.file?.path;

  if (!imagePath) {
    return res.status(400).json({ error: '이미지 파일이 누락되었어요 😅' });
  }

  try {
    await registerClothWithAI(userId, clothName, category, location, imagePath);
    res.status(200).json({ message: 'Cloth registered successfully' });
  } catch (error) {
    console.error('옷 등록 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ 이제 json 파서 선언
app.use(express.json());

// 유저 정보 저장
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

// 옷장 레이아웃 저장
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

// 옷 정보 조회
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

// 키워드 검색 API (추가)
app.get('/api/search-clothes/:userId', async (req, res) => {
  const { userId } = req.params;
  const { keyword = "" } = req.query;

  try {
    const result = await searchClothes(userId, keyword);
    res.status(200).json(result);
  } catch (error) {
    console.error('옷 검색 실패:', error);
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/get-cloth/:clothId', async (req, res) => {
  const { clothId } = req.params;
  try {
    const cloth = await getClothById(clothId);
    res.status(200).json(cloth);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// 옷 삭제
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

// 유저 정보 조회
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

// 옷장 레이아웃 조회
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
});

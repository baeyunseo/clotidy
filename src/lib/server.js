// server.js
import express from 'express';
import cors from 'cors';
import { saveUserInfo, saveClosetLayout } from './userService.js';

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

app.post('/api/register-cloth', async (req, res) => {
  const { userId, clothName, category, location, imagePath } = req.body;
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



// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

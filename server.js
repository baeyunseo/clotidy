// server.js
import express from 'express';
import cors from 'cors';
import { saveUserInfo, saveClosetLayout } from './userService.js';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebaseConfig.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { registerCloth, registerClothWithAI, getClothes, deleteCloth, updateCloth, searchClothes, getLastWorn, setLastWorn } from './clothService.js';
import { analyzeClothImage, mapSemanticCategory } from './clothService.js';
import { fetchPurchaseRecommendation } from './aiService.js';
import { fetchRecommendByCloth, fetchRecommendBySituation } from './aiService.js';
import { getClothById } from './clothService.js';


function toAbsoluteUrl(req, maybeRelative) {
  if (!maybeRelative) return null;
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  const clean = String(maybeRelative).replace(/^\.?\/*/, '');
  return `${req.protocol}://${req.get('host')}/${clean}`;
}

// 이미지 업로드용 폴더 생성
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}


// Multer 저장 설정 (유저별 하위 폴더)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // form-data 안에 들어온 키 중 하나로 userId 우선 사용, 없으면 user_id, 그래도 없으면 'misc'
    const raw = (req.body?.userId || req.body?.user_id || 'misc') + '';
    // 안전한 폴더명으로 정규화 (영문/숫자/_/-만 허용)
    const safeUserId = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) || 'misc';
    const dir = path.join('uploads', safeUserId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80) || 'file';
    const stamp = Date.now().toString(36);
    cb(null, `${base}-${stamp}${ext}`);
  }
});

const upload = multer({ storage });

const app = express();
app.use(cors());

//  업로드 이미지 static으로 서빙
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));


app.post('/api/register-cloth', upload.single('file'), async (req, res) => {
  console.log('🧪 서버 코드 최신 버전 실행됨');
  console.log('🎯 req.file:', req.file);
  console.log('🎯 req.body:', req.body);

  const {
    userId,
    clothName,
    location,
    color,
    colorRgb,
    subColorRgb,
    styleType
  } = req.body;
  let category = req.body.category ?? "unknown";
  console.log("🔥 최종 category 값:", category);

  if (typeof category !== "string" || !category.trim()) {
  category = "unknown";
}
  const imagePath = req.file?.path;
  const absUrl = toAbsoluteUrl(req, imagePath); //url 경로 변환

  if (!imagePath) {
    return res.status(400).json({ error: '이미지 파일이 누락되었어요 😅' });
  }
  

  try {
    const semanticCategory =  [mapSemanticCategory(category || "unknown")];

    const clothId = await registerCloth(
      userId,
      clothName,
      category,
      color,
      "unknown",        // season
      location,
      absUrl,
      colorRgb ? JSON.parse(colorRgb) : null,
      subColorRgb ? JSON.parse(subColorRgb) : null,
      semanticCategory,
      JSON.parse(styleType || "[]")
    );

    res.status(200).json({
      message: 'Cloth registered successfully',
      clothId: clothId
    });
  } catch (error) {
    console.error('옷 등록 실패:', error);
    res.status(500).json({ error: error.message });
  }
});


// ✅ 이제 json 파서 선언

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

// ai 분석 api
app.post('/api/analyze-category', upload.single('file'), async (req, res) => {
  const imagePath = req.file?.path;
  if (!imagePath) {
    return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
  }

  try {
    const result = await analyzeClothImage(imagePath);
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ AI 분석 실패:", error.message);
    res.status(500).json({ error: "AI 분석 실패" });
  }
});

// [GET] 특정 옷의 마지막 착용일만 단건 조회
// 응답 예: { last_worn: "2025-08-12T10:22:00.000Z" }  또는 { last_worn: null }
app.get('/api/last-worn/:clothId', async (req, res) => {
  try {
    const { clothId } = req.params;
    const lastWorn = await getLastWorn(clothId);
    return res.status(200).json({ last_worn: lastWorn });
  } catch (err) {
    return res.status(404).json({ error: err.message });
  }
});

// [PATCH] 특정 옷의 마지막 착용일을 프론트에서 지정해서 저장
// Body 예: { "last_worn": "2025-08-10T00:00:00.000Z", "alsoIncrement": true }
app.patch('/api/last-worn/:clothId', async (req, res) => {
  try {
    const { clothId } = req.params;
    const { last_worn, alsoIncrement = false } = req.body || {};
    await setLastWorn(clothId, last_worn, { alsoIncrement });
    return res.status(200).json({ message: 'Last worn updated' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// [POST] 지금 방금 착용으로 처리(카운트 +1, 마지막 착용일=지금)
// 프론트가 버튼 한 번으로 기록할 때 사용
app.post('/api/increase-worn/:clothId', async (req, res) => {
  try {
    const { clothId } = req.params;
    // 기존 함수 재사용: worn_count+1, last_worn=now
    await updateCloth(clothId, { last_worn: new Date() });
    // worn_count 증가를 함께 원하면:
    // await increaseWornCount(clothId);
    return res.status(200).json({ message: 'Worn recorded' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// === [ADD] 구매 추천: 상위 3~5개 유사 이미지 + 결론 반환 ===
// 요청: multipart/form-data
//   - file: 구매하려는 옷 이미지 (필수)
//   - userId: Firebase UID (필수)
//   - topK: 3~5 (선택, 기본 5)
//
// 응답:
// {
//   decision: "buy" | "hold" | "no",
//   top_matches: [{ cloth_id, image_url, score }]
// }
app.post('/api/recommend/purchase', upload.single('file'), async (req, res) => {
  try {
    const targetImagePath = req.file?.path;
    const { userId } = req.body;
    const topK = Math.min(Math.max(parseInt(req.body?.topK ?? '5', 10), 3), 5);

    if (!targetImagePath) {
      return res.status(400).json({ error: '구매 대상 이미지(file)가 필요합니다.' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'userId가 필요합니다.' });
    }

    // 1) 유저 옷장 이미지 로드
    const clothes = await getClothes(userId); // [{ id, image_url, ... }]
    const closetList = (clothes || [])
      .filter(c => !!c.image_url)
      .map(c => {
        const abs = toAbsoluteUrl(req, c.image_url);
        return { cloth_id: c.id, image_url: abs };
      });

    const closetImageUrls = closetList.map(x => x.image_url);
    const urlToClothId = new Map(closetList.map(x => [x.image_url, x.cloth_id]));

    // 2) AI(8001) 호출
    const aiResp = await fetchPurchaseRecommendation({
      targetImagePath,
      userId,
      closetImageUrls,
      topK
    });

    // 3) 응답 정규화(여러 형태를 모두 흡수)
    function normalizeTopMatches(raw) {
      if (!raw) return [];
      return raw
        .map(item => {
          // 형태 A: "https://.../img.jpg"
          if (typeof item === 'string') {
            return {
              image_url: item,
              cloth_id: urlToClothId.get(item) || null,
              score: null
            };
          }
          // 형태 B: { image_url, cloth_id?, score? }
          if (item && typeof item === 'object') {
            const image_url = item.image_url || null;
            const cloth_id = item.cloth_id || (image_url ? urlToClothId.get(image_url) : null) || null;
            const score = typeof item.score === 'number' ? item.score : null;
            return image_url ? { image_url, cloth_id, score } : null;
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, topK);
    }

    const topMatches = normalizeTopMatches(aiResp?.top_matches);
    const decision = aiResp?.decision || 'hold';

    return res.status(200).json({
      decision,
      top_matches: topMatches
    });
  } catch (err) {
    console.error('구매 추천 실패:', err);
    return res.status(500).json({ error: '구매 추천 처리에 실패했습니다.' });
  }
});

// --- 특정 옷 기준 코디 추천 ---
// 예: GET /api/recommend/abc123?user_id=UID&weather=sunny
app.get('/api/recommend/:clothId', async (req, res) => {
  try {
    const { clothId } = req.params;
    const { user_id, weather, lat, lon } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id가 필요합니다.' });
    }

    // (권장) 소유권 검증: clothId가 해당 user_id의 것인지 확인
    try {
      const cloth = await getClothById(clothId);
      if (cloth.user_id !== user_id) {
        return res.status(403).json({ error: '권한이 없습니다.' });
      }
    } catch (e) {
      return res.status(404).json({ error: '해당 옷을 찾을 수 없습니다.' });
    }

    const data = await fetchRecommendByCloth({
      clothId,
      userId: user_id,
      weather,
      lat,
      lon
    });

    return res.status(200).json(data);
  } catch (err) {
    console.error('코디 추천 실패:', err?.message);
    return res.status(500).json({ error: '코디 추천 실패' });
  }
});

// --- 상황별 코디 추천 ---
// 예: GET /api/situation/출근?user_id=UID&weather=rainy
app.get('/api/situation/:situationName', async (req, res) => {
  try {
    const { situationName } = req.params;
    const { user_id, weather, lat, lon } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id가 필요합니다.' });
    }

    const data = await fetchRecommendBySituation({
      situationName,
      userId: user_id,
      weather,
      lat,
      lon
    });

    return res.status(200).json(data);
  } catch (err) {
    console.error('상황별 코디 추천 실패:', err?.message);
    return res.status(500).json({ error: '상황별 코디 추천 실패' });
  }
});

// server.js 최하단 listen 위에 추가
app.get('/__whoami', (req,res)=> res.json({ ok:true, tag:'recommend-route-build' }));
console.log('[BOOT] build tag: recommend-route-build');


// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
});

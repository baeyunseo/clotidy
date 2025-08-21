// RegisterClothScreen.tsx
// 옷 등록 화면 - 카테고리, 보관위치 모두 드롭다운(팝업+리스트) 방식 + 오른쪽 ▼ 화살표 + 사진 테두리
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  ScrollView, StyleSheet, Alert, Modal, FlatList, ActivityIndicator, Pressable
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';

const BASE_URL = 'http://54.79.167.144:5000';

const korToEngFineCategory: { [kor: string]: string } = {
  "백팩": "backpack", "핸드백": "handbag", "벨트": "belt", "양말": "socks", "선글라스": "sunglasses",
  "블레이저": "blazer", "가디건": "cardigan", "코트": "coat", "자켓": "jacket",
  "블라우스": "blouse", "나시": "sleeveless top", "스웨터": "sweater", "맨투맨": "sweatshirt", "티셔츠": "tshirt",
  "부츠": "boots", "플랫슈즈": "flats", "하이힐": "heels", "로퍼": "loafers", "운동화": "sneakers",
  "원피스": "dress", "귀걸이": "earrings", "목걸이": "necklace", "모자": "hat",
  "청바지": "jeans", "긴바지": "pants", "반바지": "shorts", "치마": "skirt", "추리닝 바지": "sweatpants"
};
const engToKorFineCategory: { [eng: string]: string } =
  Object.fromEntries(Object.entries(korToEngFineCategory).map(([k, v]) => [v, k]));

const styleMap: { [kor: string]: string } = {
  "캐주얼": "casual", "격식": "formal", "데일리": "daily", "운동복": "sporty", "데이트": "romantic", "미니멀": "minimal",
};

export default function RegisterClothScreen({ navigation }: any) {
  const [imageUri, setImageUri] = useState('');
  const [imageName, setImageName] = useState('photo.jpg');
  const [imageType, setImageType] = useState('image/jpeg');

  const [clothName, setClothName] = useState('');
  const [location, setLocation] = useState('');
  const [blockList, setBlockList] = useState<string[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // 📷 소스 선택 모달 (카메라/갤러리)
  const [showPickModal, setShowPickModal] = useState(false);

  // 분석 결과
  const [analyzedCategoryEng, setAnalyzedCategoryEng] = useState('');
  const [analyzedCategoryKor, setAnalyzedCategoryKor] = useState('');
  const [fineCategoryKor, setFineCategoryKor] = useState('');
  const [analyzedColor, setAnalyzedColor] = useState('');
  const [analyzedColorRgb, setAnalyzedColorRgb] = useState<null | { r: number, g: number, b: number }>(null);
  const [analyzedSubColorRgb, setAnalyzedSubColorRgb] = useState<null | { r: number, g: number, b: number }>(null);

  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // 최근 분석된 이미지 URI(중복 분석 방지)
  const [lastAnalyzedForUri, setLastAnalyzedForUri] = useState<string>('');

  const styleOptions = Object.keys(styleMap);
  const fullFineList = Object.keys(korToEngFineCategory);

  // ---- 유틸 ----
  const normalizeEng = (s: string) => s?.toString().trim().toLowerCase().replace(/_/g, ' ') || '';
  const toRgbObj = (rgb: any) =>
    Array.isArray(rgb) ? { r: rgb[0], g: rgb[1], b: rgb[2] } :
    (rgb && typeof rgb === 'object' ? rgb : null);

  const guessType = (name: string, fallback = 'image/jpeg') =>
    name?.toLowerCase().endsWith('.png') ? 'image/png' : fallback;

  const postMultipart = async (url: string, formData: FormData, timeoutMs = 30000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: 'POST', body: formData, signal: controller.signal });
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
      console.log(`🌐 POST ${url} ->`, res.status, json);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json;
    } finally {
      clearTimeout(id);
    }
  };

  // ---- 이미지 소스 선택 ----
  const resetAnalysisState = () => {
    setAnalyzedCategoryEng('');
    setAnalyzedCategoryKor('');
    setFineCategoryKor('');
    setAnalyzedColor('');
    setAnalyzedColorRgb(null);
    setAnalyzedSubColorRgb(null);
    setLastAnalyzedForUri('');
  };

  const pickFromGallery = async () => {
    setShowPickModal(false);
    const res = await launchImageLibrary({ mediaType: 'photo' });
    if (res.didCancel || !res.assets?.[0]?.uri) return;

    const a = res.assets[0];
    let name = a.fileName || 'photo.jpg';
    let type = a.type || guessType(name);
    if (!/\.(jpg|jpeg|png)$/i.test(name)) name += '.jpg';
    if (/\.heic$/i.test(name) || type === 'image/heic') {
      name = name.replace(/\.heic$/i, '.jpg');
      type = 'image/jpeg';
    }

    setImageUri(a.uri!);
    setImageName(name);
    setImageType(type);
    resetAnalysisState();
  };

  const pickFromCamera = async () => {
    setShowPickModal(false);
    const res = await launchCamera({ mediaType: 'photo', saveToPhotos: false });
    if (res.didCancel || !res.assets?.[0]?.uri) return;

    const a = res.assets[0];
    let name = a.fileName || 'photo.jpg';
    let type = a.type || guessType(name);
    if (!/\.(jpg|jpeg|png)$/i.test(name)) name += '.jpg';
    if (/\.heic$/i.test(name) || type === 'image/heic') {
      name = name.replace(/\.heic$/i, '.jpg');
      type = 'image/jpeg';
    }

    setImageUri(a.uri!);
    setImageName(name);
    setImageType(type);
    resetAnalysisState();
  };

  // ---- 블록 로드 ----
  useEffect(() => {
    (async () => {
      const uid = auth().currentUser?.uid;
      if (!uid) return;
      try {
        const r = await fetch(`${BASE_URL}/api/closet-layout/${uid}`);
        const data = await r.json();
        setBlockList(data?.closet_layout?.map((b: any) => b.name) || []);
      } catch (err: any) {
        console.log('❌ closet-layout error', err?.message);
        Alert.alert("블록 불러오기 실패", "옷장 구성을 먼저 완료하세요.");
      }
    })();
  }, []);

  // ---- 공용: 이미지 분석 (항상 이걸 통해 호출) ----
  const runAnalyze = async () => {
    if (!imageUri) throw new Error('이미지를 먼저 선택해 주세요.');
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append('file', { uri: imageUri, name: imageName, type: imageType || guessType(imageName) } as any);

      const res: any = await postMultipart(`${BASE_URL}/api/analyze-category`, fd, 30000);
      console.log('🧪 analyze response raw:', res);

      const catRaw =
        res?.category ??
        res?.fine_category ??
        res?.predicted ??
        res?.predicted_label ??
        res?.label ??
        res?.top1 ?? '';

      const engCandidate =
        typeof catRaw === 'string'
          ? catRaw
          : (catRaw?.name || catRaw?.label || '');

      const eng = normalizeEng(engCandidate);
      const kor = engToKorFineCategory[eng] ?? '';

      const color = res?.color ?? res?.dominant_color ?? res?.mainColor ?? '';
      const colorRgbRaw = res?.colorRgb ?? res?.color_rgb ?? res?.dominant_rgb ?? res?.dominantRgb ?? null;
      const subRgbRaw  = res?.subColorRgb ?? res?.sub_color_rgb ?? res?.accent_rgb ?? res?.secondary_rgb ?? null;

      const colorRgbObj = toRgbObj(colorRgbRaw);
      const subRgbObj   = toRgbObj(subRgbRaw);

      setAnalyzedCategoryEng(eng);
      setAnalyzedCategoryKor(kor || eng || '');
      setFineCategoryKor(kor);
      setAnalyzedColor(color || '');
      setAnalyzedColorRgb(colorRgbObj);
      setAnalyzedSubColorRgb(subRgbObj);
      setLastAnalyzedForUri(imageUri);

      return { eng, kor: kor || eng || '', color: color || '', colorRgb: colorRgbObj, subColorRgb: subRgbObj };
    } finally {
      setAnalyzing(false);
    }
  };

  // ---- (수동) AI 분석 버튼 ----
  const handleAnalyze = async () => {
    try {
      const out = await runAnalyze();
      Alert.alert("분석 완료", out.kor ? `${out.kor} (AI 예측)` : "분류 결과를 찾을 수 없습니다.");
    } catch (e: any) {
      console.log('❌ analyze fail:', e?.message);
      Alert.alert("AI 분석 실패", e?.message || "서버 연결/이미지 문제일 수 있습니다.");
    }
  };

  // ---- 등록 (항상 분석 먼저 실행 → 그 결과로 저장) ----
  const handleRegister = async () => {
    try {
      if (uploading) return;
      const uid = auth().currentUser?.uid;
      if (!uid || !imageUri || !clothName.trim() || !location.trim())
        throw new Error('이미지/이름/보관 위치는 필수입니다.');

      setUploading(true);

      if (lastAnalyzedForUri !== imageUri) {
        try {
          await runAnalyze();
        } catch (err: any) {
          throw new Error('AI 분석에 실패했습니다. 다시 시도해 주세요.');
        }
      }

      const categoryEng =
        korToEngFineCategory[fineCategoryKor] ||
        analyzedCategoryEng ||
        'unknown';

      const color = analyzedColor || '';
      const colorRgb = analyzedColorRgb ?? null;
      const subColorRgb = analyzedSubColorRgb ?? null;

      const fd = new FormData();
      fd.append('userId', uid);
      fd.append('clothName', clothName.trim());
      fd.append('category', categoryEng);
      fd.append('color', color);
      fd.append('colorRgb', colorRgb ? JSON.stringify(colorRgb) : '');
      fd.append('subColorRgb', subColorRgb ? JSON.stringify(subColorRgb) : '');
      fd.append('location', location.trim());
      fd.append('styleType', JSON.stringify(selectedStyles.map(k => styleMap[k])));
      fd.append('file', { uri: imageUri, name: imageName, type: imageType || guessType(imageName) } as any);

      console.log('📤 register form fields:', {
        userId: uid, clothName, categoryEng, color, colorRgb, subColorRgb, location,
        styleType: selectedStyles.map(k => styleMap[k]),
        file: { uri: imageUri, name: imageName, type: imageType },
      });

      const res = await postMultipart(`${BASE_URL}/api/register-cloth`, fd, 30000);
      console.log('✅ register ok:', res);
      Alert.alert("등록 완료");
      navigation.goBack();
    } catch (e: any) {
      console.log('❌ register fail:', e?.message);
      Alert.alert("등록 실패", e?.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  // ---- UI ----
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>옷 등록</Text>

      <TouchableOpacity style={styles.uploadBox} onPress={() => setShowPickModal(true)} disabled={uploading}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.img} /> : <Text style={{ color: '#aaa' }}>사진 선택 (탭)</Text>}
      </TouchableOpacity>

      {/* 📷 소스 선택 모달 */}
      <Modal visible={showPickModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowPickModal(false)}>
          <View style={styles.pickModalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickTitle}>사진 선택</Text>
            <TouchableOpacity style={styles.pickBtn} onPress={pickFromCamera}>
              <Text style={styles.pickBtnText}>📷 카메라로 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickBtn} onPress={pickFromGallery}>
              <Text style={styles.pickBtnText}>🖼 갤러리에서 선택</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickBtn, styles.pickCancel]} onPress={() => setShowPickModal(false)}>
              <Text style={[styles.pickBtnText, { color: '#555' }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* 분석 결과 미리보기 박스 */}
      {(analyzedCategoryKor || analyzedColor) && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>분석 결과</Text>
          <Text>카테고리: {analyzedCategoryKor || analyzedCategoryEng || '-'}</Text>
          <Text>메인 컬러: {analyzedColor || '-'}</Text>
          <Text>
            색상 RGB: {analyzedColorRgb ? `${analyzedColorRgb.r}, ${analyzedColorRgb.g}, ${analyzedColorRgb.b}` : '-'}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} disabled={!imageUri || analyzing || uploading}>
        <Text style={{ color: '#fff' }}>{analyzing ? '분석 중...' : 'AI 자동 분류'}</Text>
      </TouchableOpacity>

      <TextInput value={clothName} onChangeText={setClothName} style={styles.input} placeholder="옷 이름" editable={!uploading} />

      <Text style={styles.label}>보관 위치</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowLocationModal(true)} disabled={uploading}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: location ? '#222' : '#aaa' }}>{location || '보관 위치 선택'}</Text>
          <Text style={styles.downArrow}>▼</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={showLocationModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowLocationModal(false)} activeOpacity={1}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <TextInput
              value={locationSearch}
              onChangeText={setLocationSearch}
              placeholder="보관 위치 검색"
              style={styles.modalInput}
              autoFocus
            />
            <FlatList
              data={blockList.filter(k => k.toLowerCase().includes(locationSearch.trim().toLowerCase()))}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setLocation(item); setShowLocationModal(false); }} style={styles.modalItem}>
                  <Text style={{ fontSize: 16 }}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#aaa' }}>결과 없음</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Text style={styles.label}>카테고리</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowCatModal(true)} disabled={uploading}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: fineCategoryKor ? '#222' : '#aaa' }}>
            {fineCategoryKor || (analyzedCategoryKor ? analyzedCategoryKor + " (AI)" : '카테고리 선택 (AI 분석됨)')}
          </Text>
          <Text style={styles.downArrow}>▼</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={showCatModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCatModal(false)} activeOpacity={1}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <TextInput
              value={catSearch}
              onChangeText={setCatSearch}
              placeholder="카테고리 검색"
              style={styles.modalInput}
              autoFocus
            />
            <FlatList
              data={fullFineList.filter(k => k.toLowerCase().includes(catSearch.trim().toLowerCase()))}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setFineCategoryKor(item); setShowCatModal(false); }} style={styles.modalItem}>
                  <Text style={{ fontSize: 16 }}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#aaa' }}>결과 없음</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Text style={styles.label}>스타일</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {styleOptions.map(style => (
          <TouchableOpacity
            key={style}
            onPress={() => setSelectedStyles(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style])}
            style={[styles.tag, selectedStyles.includes(style) && styles.tagSelected]}
          >
            <Text style={selectedStyles.includes(style) ? styles.tagTextSelected : styles.tagText}>{style}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submit} onPress={handleRegister} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>+ 등록</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#286E46' },
  uploadBox: {
    height: 180, backgroundColor: '#f3f3f3', justifyContent: 'center', alignItems: 'center',
    borderRadius: 10, marginBottom: 12, borderWidth: 1.5, borderColor: '#6AC892',
  },
  img: { width: 160, height: 160, borderRadius: 8 },

  // 선택 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  pickModalBox: { backgroundColor: '#fff', width: 260, borderRadius: 12, padding: 16 },
  pickTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#222' },
  pickBtn: { paddingVertical: 12, alignItems: 'center' },
  pickBtnText: { fontSize: 15, color: '#222' },
  pickCancel: { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 6 },

  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 },
  downArrow: { fontSize: 18, color: '#bbb', marginLeft: 8 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 4, color: '#444' },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', marginRight: 8, marginBottom: 8 },
  tagSelected: { backgroundColor: '#6AC892', borderColor: '#6AC892' },
  tagText: { fontSize: 14, color: '#333' },
  tagTextSelected: { fontSize: 14, color: '#fff' },
  analyzeBtn: { backgroundColor: '#37955F', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  submit: { backgroundColor: '#37955F', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

  // 공통 선택 모달(검색 리스트)
  modalContent: { width: 280, maxHeight: '70%', backgroundColor: '#fff', borderRadius: 10, padding: 16 },
  modalInput: { padding: 10, borderRadius: 8, backgroundColor: '#F6F6F8', marginBottom: 10 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },

  resultBox: { padding: 10, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8, marginBottom: 12, backgroundColor: '#fafafa' },
  resultTitle: { fontWeight: 'bold', marginBottom: 6 },
});

// src/screens/BuyScreen.tsx
// 구매 결정 화면 (사진 → 서버 분석 → buy/hold/no + 유사 아이템 미리보기)

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Alert,
  ActivityIndicator, Modal, Pressable, FlatList, StatusBar, ScrollView
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  launchImageLibrary,
  launchCamera,
  ImageLibraryOptions,
  CameraOptions
} from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';

const BASE_URL = 'http://54.79.167.144:5000';
const AI_URL   = 'http://54.79.167.144:8001/purchase-ai/judge';

const toAbs = (u?: string) =>
  !u ? '' : /^https?:\/\//i.test(u) ? u : `${BASE_URL}/${String(u).replace(/^\/?/, '')}`;

type Match = { image_url: string; cloth_id?: string | null; score?: number | null; category?: string; color?: string };

// 🔧 iOS HEIC 대비: 파일명/타입 보정
function ensureJpeg(nameIn: string, typeIn?: string) {
  let name = nameIn || 'target.jpg';
  let type =
    typeIn ||
    (name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

  if (/\.heic$/i.test(name) || type === 'image/heic') {
    name = name.replace(/\.heic$/i, '.jpg');
    type = 'image/jpeg';
  }
  if (!/\.(jpg|jpeg|png)$/i.test(name)) name += '.jpg';
  return { name, type };
}

// ----- 응답 정규화 -----
function normalizePurchaseResponse(resp: any) {
  const body = resp?.data ?? resp ?? {};
  const decision = String(body.decision ?? body.result ?? body.verdict ?? '').toUpperCase();
  const threshold = Number(body.threshold ?? 0);
  const maxSim = Number(body.max_similarity ?? 0);
  const detCat = String(body.detected_category ?? '');
  const detSem = String(body.detected_semantic_category ?? '');
  const k = Number(body.k ?? 0);
  const rationale = String(body.rationale ?? body.reason ?? body.note ?? body.message ?? '');

  const rawTop =
    body.topk ??
    body.top_matches ??
    body.matches ??
    body.topMatches ??
    body.similar_items ??
    [];

  const top: Match[] = Array.isArray(rawTop)
    ? rawTop.map((m: any) => ({
        image_url: toAbs(m?.image_url ?? m?.imageUrl ?? ''),
        cloth_id:  m?.clothId ?? m?.cloth_id ?? null,
        score:     typeof m?.similarity === 'number' ? m.similarity :
                   typeof m?.score === 'number' ? m.score : null,
        category:  m?.category,
        color:     m?.color,
      }))
    : [];

  return {
    decision, threshold, max_similarity: maxSim,
    detected_category: detCat, detected_semantic_category: detSem,
    k, topk: top, rationale,
  };
}

export default function BuyScreen() {
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState<string>('');
  const [imageName, setImageName] = useState<string>('target.jpg');
  const [imageType, setImageType] = useState<string>('image/jpeg');

  const [picking, setPicking] = useState(false);
  const [running, setRunning] = useState(false);

  const [decision, setDecision] = useState<'buy' | 'hold' | 'no' | ''>('');
  const [matches, setMatches] = useState<Match[]>([]);

  // 🔑 表示用ユーザー名
  const [displayName, setDisplayName] = useState<string>('사용자');

  useEffect(() => {
    const u = auth().currentUser;
    if (!u) return;

    // 1) Firebase Auth の displayName
    if (u.displayName && u.displayName.trim().length > 0) {
      setDisplayName(u.displayName.trim());
      return;
    }

    // 2) Firestore の users/{uid}.name
    firestore()
      .collection('users')
      .doc(u.uid)
      .get()
      .then(snap => {
        const n = snap.exists ? (snap.data()?.name as string | undefined) : undefined;
        if (n && n.trim().length > 0) setDisplayName(n.trim());
      })
      .catch(() => {});
  }, []);

  const openPickerModal = () => setPicking(true);
  const closePickerModal = () => setPicking(false);

  const pickFromGallery = async () => {
    closePickerModal();
    const opts: ImageLibraryOptions = { mediaType: 'photo' };
    const res = await launchImageLibrary(opts);
    if (res.didCancel || !res.assets?.[0]) return;

    const a = res.assets[0];
    const fixed = ensureJpeg(a.fileName || 'target.jpg', a.type || undefined);
    const uri = a.uri || '';
    if (!uri) return;

    setImageUri(uri);
    setImageName(fixed.name);
    setImageType(fixed.type);
    runDecision(uri, fixed.name, fixed.type);
  };

  const pickFromCamera = async () => {
    closePickerModal();
    const opts: CameraOptions = { mediaType: 'photo', saveToPhotos: false };
    const res = await launchCamera(opts);
    if (res.didCancel || !res.assets?.[0]) return;

    const a = res.assets[0];
    const fixed = ensureJpeg(a.fileName || 'target.jpg', a.type || undefined);
    const uri = a.uri || '';
    if (!uri) return;

    setImageUri(uri);
    setImageName(fixed.name);
    setImageType(fixed.type);
    runDecision(uri, fixed.name, fixed.type);
  };

  const postMultipart = async (url: string, formData: FormData, timeoutMs = 30000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: 'POST', body: formData, signal: controller.signal });
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
      if (!res.ok) throw new Error(json?.error || json?.detail || `HTTP ${res.status}`);
      return json;
    } finally {
      clearTimeout(id);
    }
  };

  const runDecision = async (uri: string, name: string, type: string) => {
    try {
      const uid = auth().currentUser?.uid;
      if (!uid) return Alert.alert('안내', '로그인이 필요합니다.');

      setRunning(true);
      setDecision('');
      setMatches([]);

      const fdAI = new FormData();
      fdAI.append('file', { uri, name, type } as any);
      const resp = await postMultipart(`${AI_URL}?user_id=${encodeURIComponent(uid)}`, fdAI, 45000);

      console.log('[purchase] raw resp =', resp);
      const norm = normalizePurchaseResponse(resp);

      const decUpper = norm.decision;
      const dec: 'buy' | 'hold' | 'no' =
        ['BUY','YES','RECOMMEND','GO','TRUE','OK'].includes(decUpper) ? 'buy' :
        ['NO','REJECT','DENY','FALSE','STOP','DUPLICATE'].includes(decUpper) ? 'no' :
        'hold';

      setDecision(dec);
      setMatches(norm.topk ?? []);

      // ✅ rationaleをそのまま表示（UIDは登録名に置換）
      let message = norm.rationale && norm.rationale.trim().length > 0
        ? norm.rationale
        : (dec === 'buy'
            ? '구매 추천! 옷장과의 겹침이 적고 활용도가 높아 보여요 🙌'
            : dec === 'no'
            ? '구매 비추천… 유사 아이템이 많거나 활용도가 낮아 보여요 😢'
            : '보류! 조금 더 고민해 봐도 좋겠어요 🙂');

      if (message && uid) {
        const safeName = displayName || '사용자';
        message = message.split(uid).join(safeName);
      }

      Alert.alert('구매 결정', message);
    } catch (e: any) {
      console.log('purchase fail', e?.message);
      Alert.alert('오류', e?.message || '구매 결정 분석 실패');
    } finally {
      setRunning(false);
    }
  };

  const runAgain = () => {
    if (!imageUri) return Alert.alert('안내', '사진을 먼저 선택해 주세요.');
    runDecision(imageUri, imageName, imageType);
  };

  const DecisionBadge = () => {
    if (!decision) return null;
    const text = decision === 'buy' ? '구매 추천' : decision === 'no' ? '구매 비추천' : '보류';
    const bg = decision === 'buy' ? '#6AC892' : decision === 'no' ? '#D74B4B' : '#FFB84D';
    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={styles.badgeText}>{text}</Text>
      </View>
    );
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => {
        if (item.cloth_id) {
          // @ts-ignore
          navigation.navigate('Coordinate', { seedClothId: item.cloth_id });
        }
      }}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.image_url }} style={styles.matchImg} />
      <View style={{ paddingHorizontal: 6 }}>
        {!!item.category && <Text style={styles.matchMeta}>{item.category}{item.color ? ` • ${item.color}` : ''}</Text>}
        {typeof item.score === 'number' && (
          <Text style={styles.matchScore}>유사도 {(item.score*100).toFixed(1)}%</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>구매 결정</Text>

      <TouchableOpacity style={styles.uploadBox} onPress={openPickerModal} disabled={running}>
        {imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            {running && (
              <View style={styles.runningOverlay}>
                <ActivityIndicator />
                <Text style={styles.runningText}>분석 중…</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={{ color: '#aaa' }}>사진 선택 (탭)</Text>
        )}
      </TouchableOpacity>

      <DecisionBadge />

      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, styles.primary]} onPress={openPickerModal} disabled={running}>
          <Text style={styles.primaryText}>사진 선택</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.outline]} onPress={runAgain} disabled={running || !imageUri}>
          {running ? <ActivityIndicator /> : <Text style={styles.outlineText}>분석 다시</Text>}
        </TouchableOpacity>
      </View>

      {!!matches.length && (
        <>
          <Text style={styles.subTitle}>내 옷장과 유사한 아이템</Text>
          <FlatList
            data={matches}
            keyExtractor={(_, i) => `m-${i}`}
            renderItem={renderMatch}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        </>
      )}

      {/* 선택 모달 */}
      <Modal visible={picking} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={closePickerModal}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>사진 선택</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={pickFromCamera}>
              <Text style={styles.modalBtnText}>📷 카메라로 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtn} onPress={pickFromGallery}>
              <Text style={styles.modalBtnText}>🖼 갤러리에서 선택</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={closePickerModal}>
              <Text style={[styles.modalBtnText, { color: '#555' }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#286E46', marginBottom: 14 },

  uploadBox: {
    height: 220,
    borderWidth: 1.5,
    borderColor: '#6AC892',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6FFF8',
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%', borderRadius: 10, resizeMode: 'cover' },
  runningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runningText: { marginTop: 8, color: '#286E46', fontWeight: '600' },

  badge: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: '#fff', fontWeight: 'bold' },

  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  btn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#37955F', marginRight: 8 },
  primaryText: { color: '#fff', fontWeight: '700' },
  outline: { borderWidth: 1, borderColor: '#37955F', marginLeft: 8, backgroundColor: '#fff' },
  outlineText: { color: '#37955F', fontWeight: '700' },

  subTitle: { marginTop: 18, marginBottom: 6, fontSize: 15, fontWeight: '700', color: '#286E46' },
  matchCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
    paddingBottom: 6,
  },
  matchImg: { width: '100%', height: 110, backgroundColor: '#f3f3f3' },
  matchMeta: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 4 },
  matchScore: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 2 },

  // 모달
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', width: 260, borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#222' },
  modalBtn: { paddingVertical: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 15, color: '#222' },
  modalCancel: { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 6 },
});

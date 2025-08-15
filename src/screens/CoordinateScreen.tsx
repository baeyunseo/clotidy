// src/screens/CoordinateScreen.tsx
// 코디 추천 화면 (상황별 + 아이템 기반 추천을 한 화면에서 탭 전환)

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert
} from 'react-native';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { useRoute } from '@react-navigation/native';

const BASE_URL = 'http://54.79.167.144:5000';

// [수정] 모드(상황별/아이템) + 상황 프리셋
const MODES = ['situation', 'item'] as const;
type Mode = typeof MODES[number];
const SITUATIONS = ['데일리', '출근', '데이트', '여행', '운동', '파티'] as const;
type Situation = typeof SITUATIONS[number];

type Item = {
  id?: string;
  cloth_id?: string;
  cloth_name?: string;
  name?: string;
  category?: string;
  image_url?: string;
  lastWorn?: string;
};

type Outfit = {
  items: Item[];
  score?: number;
  reason?: string;
};

export default function CoordiRecommendationScreen() {
  // seedClothId(아이템 기반 추천용), situationName(상황 기본값)
  const route = useRoute<{ key: string; name: string; params?: { seedClothId?: string; situationName?: Situation } }>();
  const seedClothId = route.params?.seedClothId;
  const initialSituation = (route.params?.situationName as Situation) || '데일리';

  // seedClothId가 있으면 기본 모드를 'item', 없으면 'situation'
  const [mode, setMode] = useState<Mode>(seedClothId ? 'item' : 'situation');
  const [situation, setSituation] = useState<Situation>(initialSituation);

  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [anchor, setAnchor] = useState<Item | null>(null); // 기준 아이템
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 공통 fetch 래퍼
  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setErrorMsg(null);
    setWeather(null);
    setAnchor(null);
    setOutfits([]);
    try {
      await fn();
    } catch (e: any) {
      console.log('recommend error:', e?.message);
      setErrorMsg(e?.response?.data?.error || e?.message || '서버 응답이 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 상황별 호출
  const fetchBySituation = async () => {
    const uid = auth().currentUser?.uid;
    if (!uid) throw new Error('로그인이 필요합니다.');
    const url = `${BASE_URL}/situation/${encodeURIComponent(situation)}?user_id=${encodeURIComponent(uid)}`;
    const res = await axios.get(url, { timeout: 10000 });
    const data = res.data || {};
    setWeather(data.weather || data.meta?.weather || null);
    setAnchor(getAnchor(data)); // 백엔드가 anchor 줄 수도 있음
    setOutfits(normalizeRecommendations(data));
  };

  // 아이템 기반 호출
  const fetchByItem = async () => {
    if (!seedClothId) throw new Error('아이템 기반 추천은 옷 카드에서 진입해주세요.');
    const uid = auth().currentUser?.uid;
    const url = `${BASE_URL}/recommend/${encodeURIComponent(seedClothId)}${uid ? `?user_id=${encodeURIComponent(uid)}` : ''}`;
    const res = await axios.get(url, { timeout: 10000 });
    const data = res.data || {};
    setWeather(data.weather || data.meta?.weather || null);
    setAnchor(getAnchor(data));
    setOutfits(normalizeRecommendations(data));
  };

  // 모드/상황 변경 시 호출
  useEffect(() => {
    if (mode === 'situation') {
      run(fetchBySituation);
    } else {
      run(fetchByItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, situation]);

  const title = useMemo(() => `코디 추천`, []);

  // 탭 전환시 seedClothId 없으면 아이템 모드 막기
  const switchMode = (next: Mode) => {
    if (next === 'item' && !seedClothId) {
      Alert.alert('안내', '아이템 기반 추천은 옷 카드의 "코디 제안" 버튼에서 진입해 주세요.');
      return;
    }
    setMode(next);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>{title}</Text>

      {/* 모드 탭 */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'situation' && styles.modeTabActive]}
          onPress={() => switchMode('situation')}
        >
          <Text style={mode === 'situation' ? styles.modeTextActive : styles.modeText}>상황별</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'item' && styles.modeTabActive, !seedClothId && styles.modeTabDisabled]}
          onPress={() => switchMode('item')}
          disabled={!seedClothId}
        >
          <Text style={mode === 'item' ? styles.modeTextActive : styles.modeText}>아이템 기반</Text>
        </TouchableOpacity>
      </View>

      {/* 상황 칩(상황별 모드에서만) */}
      {mode === 'situation' && (
        <View style={styles.chipsRow}>
          {SITUATIONS.map((s) => {
            const active = s === situation;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSituation(s)}
              >
                <Text style={active ? styles.chipTextActive : styles.chipText}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 날씨 */}
      {weather && (
        <View style={styles.weatherBox}>
          <Text style={styles.weatherLine}>{renderWeather(weather)}</Text>
        </View>
      )}

      {/* 로딩/에러 */}
      {loading && (
        <View style={{ paddingTop: 24, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      )}
      {!loading && errorMsg && <Text style={styles.errorText}>오류: {errorMsg}</Text>}

      {/* [수정] 섹션 타이틀 + ItemCard 구현 */}
      {!loading && !errorMsg && anchor && (
        <>
          <Text style={styles.section}>기준 아이템</Text>
          <ItemCard item={anchor} />
        </>
      )}

      {!loading && !errorMsg && (
        <>
          <Text style={styles.section}>추천 코디</Text>
          {outfits.length === 0 ? (
            <Text style={styles.dim}>추천 결과가 없습니다.</Text>
          ) : (
            outfits.map((o, idx) => (
              <View key={idx} style={styles.outfitCard}>
                {!!o.reason && <Text style={styles.reason}>{o.reason}</Text>}
                <View style={styles.itemList}>
                  {o.items.map((item, i) => (
                    <View key={i} style={styles.itemBox}>
                      {toAbs(item.image_url) ? (
                        <Image source={{ uri: toAbs(item.image_url) }} style={styles.itemImage} />
                      ) : (
                        <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ color: '#aaa', fontSize: 12 }}>이미지 없음</Text>
                        </View>
                      )}
                      <View style={styles.itemTextBox}>
                        <Text style={styles.itemName}>{item.cloth_name || item.name || '아이템'}</Text>
                        {!!item.category && <Text style={styles.itemCategory}>{item.category}</Text>}
                        {!!item.lastWorn && (
                          <Text style={styles.lastWorn}>마지막 착용일 : {formatDate(item.lastWorn)}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
                {!!o.score && <Text style={styles.score}>score: {o.score.toFixed(2)}</Text>}
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

/* ===================== [수정] ItemCard 컴포넌트 ===================== */
function ItemCard({ item }: { item: Item }) {
  const uri = toAbs(item.image_url);
  return (
    <View style={styles.anchorCard}>
      {uri ? (
        <Image source={{ uri }} style={styles.anchorImage} />
      ) : (
        <View style={[styles.anchorImage, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#aaa' }}>이미지 없음</Text>
        </View>
      )}
      <View style={{ marginTop: 8 }}>
        <Text style={styles.itemName}>{item.cloth_name || item.name || '아이템'}</Text>
        {!!item.category && <Text style={styles.itemCategory}>{item.category}</Text>}
        {!!item.lastWorn && <Text style={styles.lastWorn}>마지막 착용일 : {formatDate(item.lastWorn)}</Text>}
      </View>
    </View>
  );
}

/* ===================== 유틸/노멀라이저 ===================== */

function toAbs(u?: string) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `${BASE_URL}/${String(u).replace(/^\.?\/*/, '')}`;
}

function getAnchor(json: any): Item | null {
  const raw = json?.anchor || json?.seed || null;
  if (!raw) return null;
  return normalizeItem(raw);
}

function normalizeRecommendations(json: any): Outfit[] {
  if (!json) return [];

  if (Array.isArray(json.recommendations)) {
    return json.recommendations
      .map((r: any) => ({
        items: normalizeItemsArray(r.items ?? r.list ?? r.parts),
        score: asNumber(r.score),
        reason: r.reason || r.expl || r.explain
      }))
      .filter((o: Outfit) => (o.items?.length ?? 0) > 0);
  }

  if (Array.isArray(json.outfits)) {
    return json.outfits
      .map((o: any) => ({
        items: normalizeItemsArray(o.items ?? o.list ?? flattenSlots(o)),
        score: asNumber(o.score),
        reason: o.reason || o.note
      }))
      .filter((o: Outfit) => (o.items?.length ?? 0) > 0);
  }

  const slotOutfit = flattenSlots(json);
  if (slotOutfit.length) return [{ items: slotOutfit }];

  if (Array.isArray(json.list)) return [{ items: normalizeItemsArray(json.list) }];

  return [];
}

function normalizeItemsArray(xs: any): Item[] {
  if (!Array.isArray(xs)) return [];
  return xs.map(normalizeItem).filter(Boolean) as Item[];
}

function normalizeItem(x: any): Item | null {
  if (!x) return null;
  if (typeof x === 'string') {
    return { image_url: x };
  }
  const id = x.id || x.cloth_id || x.clothId;
  let image_url = x.image_url || x.imageUrl || x.thumbnail;
  if (image_url && !/^https?:\/\//i.test(image_url)) {
    image_url = `${BASE_URL}/${String(image_url).replace(/^\.?\/*/, '')}`;
  }
  return {
    id,
    cloth_id: x.cloth_id,
    cloth_name: x.cloth_name || x.name,
    name: x.name || x.cloth_name,
    category: x.category,
    image_url,
    lastWorn: x.lastWorn || x.last_worn || undefined,
  };
}

function flattenSlots(obj: any): Item[] {
  if (!obj || typeof obj !== 'object') return [];
  const slots = ['tops', 'bottoms', 'outerwear', 'shoes', 'bags', 'accessories', 'hats', 'jewellery', 'top', 'bottom'];
  const picked: Item[] = [];
  for (const key of slots) {
    const v = obj[key];
    if (!v) continue;
    if (Array.isArray(v)) picked.push(...normalizeItemsArray(v));
    else picked.push(...normalizeItemsArray([v]));
  }
  return picked;
}

function asNumber(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function renderWeather(w: any) {
  const t = w.tempC ?? w.temp ?? w.temperature ?? w.t ?? null;
  const desc = w.desc ?? w.description ?? w.weather ?? '';
  const feels = w.feelsLike ?? w.feels_like ?? null;
  const pieces: string[] = [];
  if (t !== null) pieces.push(`${t}°C`);
  if (feels !== null) pieces.push(`체감 ${feels}°C`);
  if (desc) pieces.push(desc);
  return pieces.join(' · ');
}

function formatDate(v?: string) {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return v;
}

/* ===================== 스타일 ===================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFEFA', padding: 16 },
  title: {
    fontSize: 18, fontWeight: 'bold', marginTop: 40, marginBottom: 8, color: '#333',
    textAlign: 'center',
  },

  // 모드 탭
  modeTabs: { flexDirection: 'row', marginBottom: 10 },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#cfe9dd', backgroundColor: '#fff', alignItems: 'center', marginRight: 8 },
  modeTabActive: { backgroundColor: '#6AC892', borderColor: '#6AC892' },
  modeTabDisabled: { opacity: 0.5 },
  modeText: { color: '#286E46', fontWeight: '600' },
  modeTextActive: { color: '#fff', fontWeight: '700' },

  // 상황 칩
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#cfe9dd', backgroundColor: '#fff', marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#6AC892', borderColor: '#6AC892' },
  chipText: { color: '#286E46', fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  weatherBox: { backgroundColor: '#F5FFFA', borderWidth: 1, borderColor: '#E0F0E8', padding: 10, borderRadius: 10, marginTop: 6, marginBottom: 10 },
  weatherLine: { color: '#2b5', fontWeight: '600' },

  // [수정] 섹션 타이틀 추가
  section: { fontSize: 16, fontWeight: '700', color: '#286E46', marginTop: 12, marginBottom: 8 },

  // 앵커 카드
  anchorCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eee' },
  anchorImage: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#f3f3f3' },

  dim: { color: '#888', marginTop: 6 },

  outfitCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#eee' },
  reason: { color: '#444', marginBottom: 6 },

  itemList: { marginTop: 6 },
  itemBox: {
    flexDirection: 'row',
    backgroundColor: '#FDFDF8',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  itemImage: { width: 70, height: 70, borderRadius: 8, marginRight: 12, backgroundColor: '#f3f3f3' },
  itemTextBox: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  itemCategory: { fontSize: 14, color: '#555', marginVertical: 4 },
  lastWorn: { fontSize: 13, color: '#999' },
  score: { color: '#999', marginTop: 6, fontSize: 12, textAlign: 'right' },

  errorText: { color: '#D74B4B', marginTop: 8, fontSize: 14, textAlign: 'center' },
});

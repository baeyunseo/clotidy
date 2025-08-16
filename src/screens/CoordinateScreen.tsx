// src/screens/CoordinateScreen.tsx
// 코디 추천 화면 (상황별 + 아이템 기반)
// 서버 조건 준수: GET /api/recommend/:clothId?user_id=UID (user_id 필수, 소유권 검사)

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert
} from 'react-native';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { useRoute } from '@react-navigation/native';

const BASE_URL = 'http://54.79.167.144:5000';

const MODES = ['situation', 'item'] as const;
type Mode = typeof MODES[number];

// ✅ 상황 프리셋
const SITUATIONS = ['데이트', '학교', '격식', '여행', '소개팅', '출근'] as const;
type Situation = typeof SITUATIONS[number];

type Item = {
  id?: string;
  cloth_id?: string;
  cloth_name?: string;
  name?: string;
  category?: string;
  image_url?: string;
  lastWorn?: string; // 화면에선 항상 문자열
  semantic_category?: string;
};

type Outfit = { items: Item[]; score?: number; reason?: string };

export default function CoordiRecommendationScreen() {
  // seedClothId(아이템 기반), situationName(상황 기본값)
  const route = useRoute<{ key: string; name: string; params?: { seedClothId?: string; situationName?: string } }>();
  const seedClothId = route.params?.seedClothId;

  // 라우트 값이 프리셋에 없으면 첫 항목(데이트)로 폴백
  const pickedSituation = route.params?.situationName;
  const initialSituation = (
    pickedSituation && (SITUATIONS as readonly string[]).includes(pickedSituation)
      ? pickedSituation
      : SITUATIONS[0]
  ) as Situation;

  const [mode, setMode] = useState<Mode>(seedClothId ? 'item' : 'situation');
  const [situation, setSituation] = useState<Situation>(initialSituation);

  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [anchor, setAnchor] = useState<Item | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 디버그: 서버 원본 응답 확인용 토글 & 원문 저장
  const [showDebug, setShowDebug] = useState(false);
  const [rawPayload, setRawPayload] = useState<any>(null);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setErrorMsg(null);
    setWeather(null);
    // anchor는 유지(아이템 기반에서 기준 아이템 먼저 보여주기 위함)
    setOutfits([]);
    try {
      await fn();
    } catch (e: any) {
      console.log('[Coordinate] error:', e?.message, e?.response?.data);
      setErrorMsg(e?.response?.data?.error || e?.message || '서버 응답이 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  /* ========= 상황별 호출 ========= */
  const fetchBySituation = async () => {
    const uid = auth().currentUser?.uid;
    if (!uid) throw new Error('로그인이 필요합니다.');

    const url = `${BASE_URL}/api/situation/${encodeURIComponent(situation)}?user_id=${encodeURIComponent(uid)}`;
    console.log('[Coordinate] GET (situation)', url);
    const res = await axios.get(url, { timeout: 12000 });

    const root = (res.data?.data ?? res.data) || {};
    setRawPayload(root);
    console.log('[Coordinate] payload keys:', Object.keys(root || {}));

    setWeather(root.weather || root.meta?.weather || null);

    // 서버가 기준아이템을 내려주면 반영
    const maybeAnchor = getAnchor(root);
    if (maybeAnchor) setAnchor(maybeAnchor);

    const list = normalizeRecommendations(root);
    setOutfits(list);
    if (list.length === 0) setErrorMsg('추천 결과가 없습니다.');
  };

  /* ========= 아이템 기반 호출 =========
     1) /api/get-cloth/:id 존재 + (참고용) 소유권(user_id === uid) 확인
        - 실패해도 recommend는 시도 (최종 권한검사는 서버가 수행)
     2) /api/recommend/:id?user_id=uid 호출
  */
  const fetchByItem = async () => {
    if (!seedClothId) throw new Error('아이템 기반 추천은 옷 카드에서 진입해주세요.');
    const uid = auth().currentUser?.uid;
    if (!uid) throw new Error('로그인이 필요합니다.');

    // 1) 존재/소유권 조회 (실패해도 recommend는 시도)
    let clothForAnchor: any = null;
    try {
      const checkUrl = `${BASE_URL}/api/get-cloth/${encodeURIComponent(seedClothId)}`;
      console.log('[Coordinate] GET (check)', checkUrl);
      const check = await axios.get(checkUrl, { timeout: 8000 });
      const cloth = (check.data?.data ?? check.data) || {};
      clothForAnchor = cloth;

      // 기준 아이템 먼저 고정 노출 (anchor 세팅 오류가 전체 흐름 막지 않게 try)
      try {
        setAnchor(normalizeItem(cloth));
      } catch (e) {
        console.warn('[Coordinate] normalizeItem(anchor) failed:', (e as any)?.message);
      }

      // 소유권 불일치해도 서버에서 최종 검증하므로 여기서 막지 않음
      if (cloth.user_id && String(cloth.user_id) !== String(uid)) {
        console.warn('[Coordinate] ownership mismatch (client-side). Proceeding to server-validated recommend.');
      }
    } catch (e: any) {
      const st = e?.response?.status;
      console.warn('[Coordinate] check failed:', st, e?.message);
      // 404/403이어도 recommend를 시도해서 서버 메시지를 사용자에게 보여주자
    }

    // 2) 추천 호출 (항상 시도)
    const url = `${BASE_URL}/api/recommend/${encodeURIComponent(seedClothId)}?user_id=${encodeURIComponent(uid)}`;
    console.log('[Coordinate] GET (recommend) →', url);
    const res = await axios.get(url, { timeout: 15000 });

    const root = (res.data?.data ?? res.data) || {};
    setRawPayload(root);
    console.log('[Coordinate] payload keys:', Object.keys(root || {}));

    setWeather(root.weather || root.meta?.weather || null);

    // 서버가 anchor를 내려주면 갱신, 없으면 기존 anchor 유지 (없고 anchor도 없으면 check 결과로 보완)
    const maybeAnchor = getAnchor(root);
    if (maybeAnchor) {
      setAnchor(maybeAnchor);
    } else if (!anchor && clothForAnchor) {
      try {
        setAnchor(normalizeItem(clothForAnchor));
      } catch (e) {
        console.warn('[Coordinate] fallback anchor normalize failed:', (e as any)?.message);
      }
    }

    const list = normalizeRecommendations(root);
    setOutfits(list);
    if (list.length === 0) setErrorMsg('추천 결과가 없습니다.');
  };

  useEffect(() => {
    if (mode === 'situation') run(fetchBySituation);
    else run(fetchByItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, situation]);

  const title = useMemo(() => `코디 추천`, []);

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

      {/* 기준 아이템 */}
      {!loading && anchor && (
        <>
          <Text style={styles.section}>기준 아이템</Text>
          <ItemCard item={anchor} />
        </>
      )}

      {/* 추천 결과 */}
      {!loading && (
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
                {!!o.score && <Text style={styles.score}>score: {o.score?.toFixed(2)}</Text>}
              </View>
            ))
          )}
        </>
      )}

      {/* 디버그: 서버 원본 + 이미지 갤러리 */}
      {!loading && (
        <View style={{ marginTop: 10 }}>
          <TouchableOpacity onPress={() => setShowDebug(v => !v)}>
            <Text style={{ color: '#999', textAlign: 'center' }}>
              {showDebug ? '디버그 숨기기' : '디버그 보기'}
            </Text>
          </TouchableOpacity>
          {showDebug && rawPayload && (
            <View style={styles.debugBox}>
              {/* JSON 원문 */}
              <Text style={styles.debugText}>{safeStringify(rawPayload)}</Text>
              {/* 이미지 갤러리 */}
              <DebugImagesGallery items={collectAllItemsForPreview(rawPayload)} />
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

/* ===================== ItemCard ===================== */
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

/* ===================== 디버그 갤러리 ===================== */
function DebugImagesGallery({ items }: { items: Item[] }) {
  if (!items?.length) return null;
  return (
    <>
      <Text style={{ marginTop: 10, marginBottom: 6, color: '#666', fontWeight: '600' }}>디버그 이미지 미리보기</Text>
      <View style={styles.debugGrid}>
        {items.map((it, i) => {
          const uri = toAbs(it.image_url);
          return (
            <View key={`${it.id || it.cloth_id || i}-${i}`} style={styles.debugCell}>
              {uri ? (
                <Image source={{ uri }} style={styles.debugImg} />
              ) : (
                <View style={[styles.debugImg, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#aaa', fontSize: 10 }}>이미지 없음</Text>
                </View>
              )}
              <Text numberOfLines={1} style={styles.debugCaption}>{it.cloth_name || it.name || '아이템'}</Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

/* ===================== 유틸/노멀라이저 ===================== */

function toAbs(u?: string) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `${BASE_URL}/${String(u).replace(/^\.?\/*/, '')}`;
}

function getAnchor(json: any): Item | null {
  const raw = json?.anchor || json?.seed || json?.base || json?.selected || json?.main || null;
  if (!raw) return null;
  return normalizeItem(raw);
}

function normalizeRecommendations(json: any): Outfit[] {
  return extractOutfits(json);
}

/** 안전한 숫자 캐스팅 */
function asNumber(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** 문자열 이유 필드 정규화 */
function asReason(...vals: any[]): string | undefined {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return undefined;
}

/** 초관대한 추출기: 배열/객체/슬롯/중첩 + main/matched_items까지 커버 */
function extractOutfits(json: any): Outfit[] {
  if (!json) return [];

  const buildFromMain = (node: any): Outfit | null => {
    if (!node || typeof node !== 'object') return null;
    const main = node.main || node.anchor || node.seed || node.base || node.selected;
    const mates = node.matched_items || node.matches || node.candidates || node.recommendations_list;
    const reason = asReason(node.reason, node.note, node.explain, node.description);
    const score  = asNumber(node.score ?? node.rank ?? node.similarity);

    const items: Item[] = [
      ...normalizeItemsArray([main]),
      ...normalizeItemsArray(Array.isArray(mates) ? mates : [mates]),
    ];
    return items.length ? { items, reason, score } : null;
  };

  // 1) 후보 배열
  const candidateArrays: any[] | undefined =
    json.recommendations || json.outfits || json.combos || json.combinations ||
    json.sets || json.suggestions || json.coordis || json.coordinates ||
    json.looks || json.results || json.items_sets;

  if (Array.isArray(candidateArrays)) {
    const list = candidateArrays.map((entry: any): Outfit | null => {
      // 표준 items 계열
      const items = normalizeItemsArray(
        entry?.items ?? entry?.list ?? entry?.parts ?? entry?.elements ?? entry?.look ?? entry?.set
      );
      const reason = asReason(entry?.reason, entry?.note, entry?.expl, entry?.explain, entry?.description);
      const score  = asNumber(entry?.score ?? entry?.similarity ?? entry?.rank);
      if (items.length > 0) return { items, score, reason };

      // main + matched_items
      const asMain = buildFromMain(entry);
      if (asMain) return asMain;

      // 슬롯 평탄화
      const flat = flattenSlots(entry);
      if (flat.length > 0) return { items: flat, score, reason };

      return null;
    }).filter((x): x is Outfit => !!x);

    if (list.length) return list;
  }

  // 2) 루트가 main + matched_items
  const fromRootMain = buildFromMain(json);
  if (fromRootMain) return [fromRootMain];

  // 3) 객체 트리(깊이 2) 수집
  const candidatesObj =
    json.recommendations || json.result || json.results || json.data || json.payload || json.response;

  const collected: Item[] = [];
  collected.push(...flattenSlots(json));

  if (candidatesObj && typeof candidatesObj === 'object') {
    const directMain = buildFromMain(candidatesObj);
    if (directMain) return [directMain];

    collected.push(...flattenSlots(candidatesObj));
    const arr = normalizeItemsArray(
      (candidatesObj as any).items ?? (candidatesObj as any).list ??
      (candidatesObj as any).parts ?? (candidatesObj as any).elements ??
      (candidatesObj as any).look ?? (candidatesObj as any).set
    );
    if (arr.length) collected.push(...arr);

    // 깊이 2에서 main 패턴 우선 탐색 (여러 개면 여러 outfit)
    const outfits: Outfit[] = [];
    for (const k of Object.keys(candidatesObj)) {
      const v = (candidatesObj as any)[k];
      if (!v || typeof v !== 'object') continue;
      const maybe = buildFromMain(v);
      if (maybe) outfits.push(maybe);
    }
    if (outfits.length) return outfits;

    // 깊이 2에서 슬롯/표준 items 수집
    for (const k of Object.keys(candidatesObj)) {
      const v = (candidatesObj as any)[k];
      if (!v || typeof v !== 'object') continue;

      if (Array.isArray(v)) {
        const asItems = normalizeItemsArray(v);
        if (asItems.length) collected.push(...asItems);
      } else {
        collected.push(...flattenSlots(v));
        const nestedItems = normalizeItemsArray(
          v.items ?? v.list ?? v.parts ?? v.elements ?? v.look ?? v.set
        );
        if (nestedItems.length) collected.push(...nestedItems);
      }
    }
  }

  // 4) 루트 직속 items/list/elements
  if (Array.isArray(json.items) || Array.isArray(json.list) || Array.isArray(json.elements)) {
    collected.push(...normalizeItemsArray(json.items ?? json.list ?? json.elements));
  }

  if (collected.length) return [{ items: collected }];
  return [];
}

function normalizeItemsArray(xs: any): Item[] {
  if (!Array.isArray(xs)) return [];
  return xs.map(normalizeItem).filter((v): v is Item => !!v);
}

/** Firestore Timestamp/Date/number/string → Item(lastWorn은 문자열) */
function normalizeItem(x: any): Item | null {
  if (!x) return null;
  if (typeof x === 'string') return { image_url: x };

  const id = x.id || x.cloth_id || x.clothId;
  let image_url = x.image_url || x.imageUrl || x.thumbnail || x.thumb;
  if (image_url && !/^https?:\/\//i.test(image_url)) {
    image_url = `${BASE_URL}/${String(image_url).replace(/^\.?\/*/, '')}`;
  }

  const rawLast =
    x.lastWorn ?? x.last_worn ?? x.last_worn_date ?? x.lastWornDate ?? x.lastWear;
  const lastWornStr = formatDateAny(rawLast) || undefined;

  return {
    id,
    cloth_id: x.cloth_id || x.id || x.clothId,
    cloth_name: x.cloth_name || x.name || x.title,
    name: x.name || x.cloth_name || x.title,
    category: x.category || x.type,
    image_url,
    lastWorn: lastWornStr,
    semantic_category: x.semantic_category || x.semanticCategory,
  };
}

function flattenSlots(obj: any): Item[] {
  if (!obj || typeof obj !== 'object') return [];
  const slots = [
    'tops', 'bottoms', 'outerwear', 'shoes', 'bags', 'accessories', 'hats', 'jewellery',
    'top', 'bottom', 'dress', 'onepiece',
    // 디버그 구조 수집용
    'matched_items', 'matches', 'candidates'
  ];
  const picked: Item[] = [];
  for (const key of slots) {
    const v = obj[key];
    if (!v) continue;
    if (Array.isArray(v)) picked.push(...normalizeItemsArray(v));
    else picked.push(...normalizeItemsArray([v]));
  }
  return picked;
}

function collectAllItemsForPreview(json: any): Item[] {
  if (!json) return [];
  const fromMain = [
    ...(normalizeItemsArray([json.main || json.anchor || json.seed || json.base || json.selected])),
    ...(normalizeItemsArray(json.matched_items ?? json.matches ?? json.candidates ?? [])),
  ];
  const flatRoot = flattenSlots(json);
  const direct = normalizeItemsArray(json.items ?? json.list ?? json.elements ?? []);
  return [...fromMain, ...flatRoot, ...direct];
}

function renderWeather(w: any) {
  const t = w?.tempC ?? w?.temp ?? w?.temperature ?? w?.t ?? null;
  const desc = w?.desc ?? w?.description ?? w?.weather ?? '';
  const feels = w?.feelsLike ?? w?.feels_like ?? null;
  const pieces: string[] = [];
  if (t !== null) pieces.push(`${t}°C`);
  if (feels !== null) pieces.push(`체감 ${feels}°C`);
  if (desc) pieces.push(desc);
  return pieces.join(' · ');
}

/** Timestamp/Date/number/string → 'YYYY-MM-DD' */
function formatDateAny(v?: any): string {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object' && (('seconds' in v) || ('_seconds' in v))) {
    const s = (v.seconds ?? v._seconds) as number;
    if (typeof s === 'number') return new Date(s * 1000).toISOString().slice(0, 10);
  }
  if (typeof v === 'number') return new Date(v).toISOString().slice(0, 10);
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
    return v;
  }
  return '';
}

function formatDate(v?: string) {
  return formatDateAny(v);
}

function safeStringify(v: any) {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
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

  section: { fontSize: 16, fontWeight: '700', color: '#286E46', marginTop: 12, marginBottom: 8 },

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

  // 디버그 박스
  debugBox: { marginTop: 8, backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#eee' },
  debugText: { fontSize: 12, color: '#666' },

  // 디버그 갤러리
  debugGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  debugCell: { width: '25%', padding: 4 },
  debugImg: { width: '100%', aspectRatio: 1, borderRadius: 6, backgroundColor: '#f3f3f3' },
  debugCaption: { fontSize: 10, color: '#666', marginTop: 2 },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  Modal, TextInput, Pressable, ActivityIndicator, Alert
} from 'react-native';
import { Calendar, DateObject } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import auth from '@react-native-firebase/auth';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

/* ---------- Types ---------- */
type Cloth = {
  id: string;
  name: string;
  thumbnail: string;
  category: string;
  locationLabel: string;
  lastWorn?: string;   // YYYY-MM-DD
  wearCount?: number;
};
type WearRecord = {
  id: string;
  date: string;        // YYYY-MM-DD
  clothId: string;
  memo?: string;
};

/* ---------- API ---------- */
const BASE_URL = 'http://54.79.167.144:5000';
const ENDPOINTS = {
  getClothes: (uid: string) => `${BASE_URL}/api/get-clothes/${encodeURIComponent(uid)}`,
  setLastWorn: (clothId: string) => `${BASE_URL}/api/last-worn/${encodeURIComponent(clothId)}`, // PATCH
};
async function authHeaders() {
  const token = await auth().currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/* ---------- Theme ---------- */
const IVORY = '#FFFEFA';
const TEXT = '#1B1B1B';
const LINE = '#E9E6E1';
const MUTE = '#A7A7A7';
const ACCENT = '#36A58A';

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
/** 'YYYY-MM-DD' -> 'YYYY-MM-DDT00:00:00.000Z' */
const toStartOfDayZ = (ymd: string) => `${ymd}T00:00:00.000Z`;

export default function CalendarRecordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  /* ---------- Auth ---------- */
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => auth().onAuthStateChanged(u => setUid(u?.uid ?? null)), []);

  /* ---------- State ---------- */
  const [selected, setSelected] = useState<string>(toISODate(new Date()));
  const [loading, setLoading] = useState(true);

  const [clothes, setClothes] = useState<Record<string, Cloth>>({});
  // 表示用：日付 -> 着用アイテム（get-clothes の last_worn から合成）
  const [recordsByDate, setRecordsByDate] = useState<Record<string, WearRecord[]>>({});

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ clothId: string; memo: string }>({ clothId: '', memo: '' });

  const [selLocation, setSelLocation] = useState<string>(''); // ''=전체
  const [selCategory, setSelCategory] = useState<string>(''); // ''=전체

  /* ---------- Fetch: Clothes ---------- */
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const headers = await authHeaders();
        const res = await axios.get(ENDPOINTS.getClothes(uid), { headers });
        const map: Record<string, Cloth> = {};
        (res.data || []).forEach((d: any) => {
          const item: Cloth = {
            id: String(d.id),
            name: d.name ?? d.cloth_name ?? '아이템',
            thumbnail: d.thumbnail ?? d.image_url ?? '',
            category: String(d.category ?? '').trim(),
            locationLabel: String(d.location ?? d.locationLabel ?? '').trim(),
            lastWorn: typeof d.last_worn === 'string'
              ? d.last_worn.slice(0, 10)                     // ISO -> YYYY-MM-DD
              : (typeof d.lastWorn === 'string' ? d.lastWorn.slice(0, 10) : undefined),
            wearCount: Number(d.wear_count ?? d.wearCount ?? 0),
          };
          map[item.id] = item;
        });
        if (!cancelled) setClothes(map);
      } catch (e:any) {
        console.error('❌ getClothes error:', e?.response?.status, e?.message);
        if (!cancelled) setClothes({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  /* ---------- Build calendar marks from clothes.lastWorn ---------- */
  useEffect(() => {
    const byDate: Record<string, WearRecord[]> = {};
    Object.values(clothes).forEach(c => {
      if (c.lastWorn) {
        byDate[c.lastWorn] = [
          ...(byDate[c.lastWorn] ?? []),
          { id: `${c.id}-${c.lastWorn}`, date: c.lastWorn, clothId: c.id, memo: '' }
        ];
      }
    });
    setRecordsByDate(byDate);
  }, [clothes]);

  /* ---------- Calendar marks ---------- */
  const marked = useMemo(() => {
    const marks: any = {};
    Object.keys(recordsByDate).forEach(d => { marks[d] = { marked: true, dots: [{ color: ACCENT }] }; });
    marks[selected] = { ...(marks[selected] || {}), selected: true, selectedColor: ACCENT, selectedTextColor: '#fff' };
    return marks;
  }, [recordsByDate, selected]);
  const listForSelectedDay = recordsByDate[selected] ?? [];
  const onDayPress = (day: DateObject) => setSelected(day.dateString);

  /* ---------- Filters ---------- */
  const locations = useMemo(() => {
    const vals = Object.values(clothes).map(c => c.locationLabel).filter(v => !!v && v.trim());
    return ['전체', ...Array.from(new Set(vals))];
  }, [clothes]);
  const categories = useMemo(() => {
    const vals = Object.values(clothes).map(c => c.category).filter(v => !!v && v.trim());
    return ['전체', ...Array.from(new Set(vals))];
  }, [clothes]);
  const clothesForPick = useMemo(() => {
    return Object.values(clothes).filter(c => {
      const okLoc = !selLocation || selLocation === '전체' || c.locationLabel === selLocation;
      const okCat = !selCategory || selCategory === '전체' || c.category === selCategory;
      return okLoc && okCat;
    });
  }, [clothes, selLocation, selCategory]);
  const clothesLoaded = Object.keys(clothes).length > 0;

  /* ---------- Empty ---------- */
  const hasAnyRecords = useMemo(
    () => Object.values(recordsByDate).some(list => (list?.length ?? 0) > 0),
    [recordsByDate]
  );

  /* ---------- Register via PATCH /api/last-worn/:clothId ---------- */
  const onConfirmAdd = async () => {
    if (!uid) return Alert.alert('오류', '로그인이 필요합니다.');
    if (!form.clothId) return Alert.alert('안내', '아이템을 선택해 주세요.');

    try {
      const headersBase = await authHeaders();
      const headers = { 'Content-Type': 'application/json', ...(headersBase || {}) };

      const url = ENDPOINTS.setLastWorn(String(form.clothId));
      console.log('PATCH URL:', url, 'clothId:', form.clothId, 'date:', selected);

      await axios.patch(
        url,
        {
          last_worn: toStartOfDayZ(selected), // 例: 2025-08-10T00:00:00.000Z
          alsoIncrement: true,                // カウントも増やす
          memo: form.memo ?? ''
        },
        { headers }
      );

      // モーダル閉じ＋フォーム初期化
      setOpen(false);
      setForm({ clothId: '', memo: '' });

      // 楽観更新（clothes・recordsByDate 双方を更新）
      setClothes(prev => {
        const cur = prev[form.clothId];
        if (!cur) return prev;
        return {
          ...prev,
          [form.clothId]: {
            ...cur,
            lastWorn: selected,
            wearCount: (cur.wearCount ?? 0) + 1
          }
        };
      });
      setRecordsByDate(prev => {
        const next = { ...prev };
        next[selected] = [
          ...(next[selected] ?? []),
          { id: `${form.clothId}-${selected}`, date: selected, clothId: form.clothId, memo: form.memo ?? '' }
        ];
        return next;
      });
    } catch (e:any) {
      console.error('❌ setLastWorn error:', e?.response?.status, e?.message, e?.response?.data);
      Alert.alert('오류', '기록 추가에 실패했습니다.');
    }
  };

  /* ---------- UI ---------- */
  return (
    <View style={styles.container}>
      {/* ヘッダー：タイトル中央、戻る左上（Bパターン） */}
      <View style={styles.headerSpacer}>
        <TouchableOpacity style={styles.backButtonAbsolute} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>기록</Text>
      </View>

      <View style={styles.calendarWrap}>
        <Calendar
          current={selected}
          onDayPress={onDayPress}
          markedDates={marked}
          hideExtraDays
          theme={{
            backgroundColor: IVORY,
            calendarBackground: IVORY,
            dayTextColor: TEXT,
            monthTextColor: TEXT,
            textDisabledColor: MUTE,
            todayTextColor: TEXT,
            textSectionTitleColor: MUTE,
            arrowColor: '#2C7BE5',
          }}
        />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>{selected} 의 기록</Text>
        <TouchableOpacity onPress={() => setOpen(true)}>
          <Text style={styles.addText}>＋ 추가</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingTop: 20 }}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={listForSelectedDay}
          keyExtractor={(it) => it.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const cloth = clothes[item.clothId];
            return (
              <View style={styles.row}>
                <Image source={{ uri: cloth?.thumbnail || '' }} style={styles.thumb} />
                <View style={styles.meta}>
                  <Text style={styles.name}>{cloth?.name ?? '아이템'}</Text>
                  <Text style={styles.sub}>{cloth?.locationLabel ?? ''}</Text>
                  <Text style={styles.sub}>마지막 착용일 : {cloth?.lastWorn ?? '-'}</Text>
                  {!!item.memo && <Text style={styles.sub}>메모 : {item.memo}</Text>}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ color: MUTE }}>
                {hasAnyRecords ? '이 날짜에는 기록이 없어요' : '아직 등록이 없습니다'}
              </Text>
            </View>
          }
        />
      )}

      {/* 追加モーダル */}
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>사용자 옷 기록 추가</Text>

            {/* 보관 공간 */}
            <View style={styles.field}>
              <Text style={styles.label}>보관 공간</Text>
              <View style={styles.pickerBox}>
                <Picker
                  enabled={clothesLoaded}
                  selectedValue={selLocation}
                  onValueChange={(v) => { setSelLocation(String(v)); setForm(s => ({ ...s, clothId: '' })); }}
                >
                  {!clothesLoaded && <Picker.Item label="불러오는 중..." value="" />}
                  {clothesLoaded && ['전체', ...locations.slice(1)].map(loc => (
                    <Picker.Item key={loc} label={loc} value={loc === '전체' ? '' : loc} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* 카테고리 */}
            <View style={styles.field}>
              <Text style={styles.label}>카테고리</Text>
              <View style={styles.pickerBox}>
                <Picker
                  enabled={clothesLoaded}
                  selectedValue={selCategory}
                  onValueChange={(v) => { setSelCategory(String(v)); setForm(s => ({ ...s, clothId: '' })); }}
                >
                  {!clothesLoaded && <Picker.Item label="불러오는 중..." value="" />}
                  {clothesLoaded && ['전체', ...categories.slice(1)].map(cat => (
                    <Picker.Item key={cat} label={cat} value={cat === '전체' ? '' : cat} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* 아이템 */}
            <View style={styles.field}>
              <Text style={styles.label}>아이템</Text>
              <View style={styles.pickerBox}>
                <Picker
                  enabled={clothesLoaded}
                  selectedValue={form.clothId}
                  onValueChange={(v) => setForm(s => ({ ...s, clothId: String(v) }))}
                >
                  <Picker.Item label="선택하세요" value="" />
                  {clothesLoaded && clothesForPick.map(c => (
                    <Picker.Item
                      key={c.id}
                      label={`${c.name} (${c.locationLabel})${typeof c.wearCount === 'number' ? ` · ${c.wearCount}회` : ''}`}
                      value={String(c.id)}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* 메모 */}
            <View style={styles.field}>
              <Text style={styles.label}>메모</Text>
              <TextInput
                placeholder="메모"
                placeholderTextColor={MUTE}
                value={form.memo}
                onChangeText={(t) => setForm(s => ({ ...s, memo: t }))}
                multiline
                style={styles.memo}
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setOpen(false)}>
                <Text style={[styles.btnText, { color: '#E04848' }]}>취소</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onConfirmAdd}>
                <Text style={[styles.btnText, { color: '#fff' }]}>확인</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: IVORY },

  // タイトル中央 & 戻るボタンは左上に絶対配置（Bパターン）
  headerSpacer: {
    paddingTop: 60,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonAbsolute: {
    position: 'absolute',
    left: 16,
    top: 60,
    zIndex: 1,
  },
  backArrow: { fontSize: 24, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT },

  calendarWrap: { backgroundColor: IVORY, paddingHorizontal: 12, paddingBottom: 4 },

  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeaderText: { color: TEXT, fontWeight: '600' },
  addText: { color: '#2C7BE5', fontWeight: '700' },

  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
  thumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#F1EFEA' },
  meta: { marginLeft: 12, flex: 1 },
  name: { color: TEXT, fontWeight: '700', fontSize: 16 },
  sub: { color: MUTE, marginTop: 2 },
  separator: { height: 1, marginLeft: 16 + 54 + 12, backgroundColor: LINE },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    width: '86%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    borderWidth: 1, borderColor: '#E7E3DC',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: TEXT, textAlign: 'center', marginBottom: 12 },

  field: { marginBottom: 10 },
  label: { fontSize: 12, color: MUTE, marginBottom: 4, marginLeft: 6 },
  pickerBox: { borderWidth: 1, borderColor: '#E7E3DC', borderRadius: 9999, backgroundColor: '#FCFAF7', overflow: 'hidden' },
  memo: {
    minHeight: 72, borderWidth: 1, borderColor: '#E7E3DC',
    borderRadius: 10, backgroundColor: '#FCFAF7', paddingHorizontal: 12, paddingVertical: 8, color: TEXT,
  },

  modalButtons: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: LINE, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnGhost: {},
  btnPrimary: { backgroundColor: ACCENT, borderBottomRightRadius: 16 },
  btnText: { fontSize: 16, fontWeight: '700' },
});

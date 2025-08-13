// src/screens/CalendarRecordScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  Modal, TextInput, Pressable, ActivityIndicator, Alert
} from 'react-native';
import { Calendar, DateObject } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import auth from '@react-native-firebase/auth';
import axios from 'axios';

/** ---------- Types ---------- */
type Cloth = {
  id: string;
  name: string;
  thumbnail: string;
  category: string;
  locationLabel: string;
  lastWorn?: string;     // YYYY-MM-DD（サーバが更新）
  wearCount?: number;    // 任意（サーバが返すなら表示に利用）
};

type WearRecord = {
  id: string;
  date: string;          // YYYY-MM-DD
  clothId: string;
  memo?: string;
};

/** ---------- API設定 ---------- */
const BASE_URL = "http://54.79.167.144:5000";
const ENDPOINTS = {
  getClothes: (uid: string) => `${BASE_URL}/api/get-clothes/${uid}`, // 服一覧
  getWearRecords: (uid: string, start: string, end: string) =>
    `${BASE_URL}/api/wear-records/${uid}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, // 期間内の記録
  addWearRecord: () => `${BASE_URL}/api/wear-records`, // 記録追加（uid, date, clothId, memo）
};
async function authHeaders() {
  const token = await auth().currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/** ---------- Theme ---------- */
const IVORY = '#FFFEFA';
const TEXT = '#1B1B1B';
const LINE = '#E9E6E1';
const MUTE = '#A7A7A7';
const ACCENT = '#36A58A';

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const monthRange = (iso: string) => {
  const [y, m] = iso.split('-').map(n => parseInt(n, 10));
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { start: toISO(first), end: toISO(last) };
};

export default function CalendarRecordScreen() {
  /** UID は onAuthStateChanged で取得（初回 null を回避） */
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    const unsub = auth().onAuthStateChanged(u => setUid(u?.uid ?? null));
    return unsub;
  }, []);

  /** 画面状態 */
  const [selected, setSelected] = useState<string>(toISO(new Date()));
  const [loading, setLoading] = useState(true);

  /** データ */
  const [clothes, setClothes] = useState<Record<string, Cloth>>({});
  const [recordsByDate, setRecordsByDate] = useState<Record<string, WearRecord[]>>({});

  /** モーダル＆フォーム（頻度は無し） */
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ clothId: string; memo: string }>({ clothId: '', memo: '' });

  /** 絞り込み（場所/カテゴリ） */
  const [selLocation, setSelLocation] = useState<string>(''); // '' = 全体
  const [selCategory, setSelCategory] = useState<string>(''); // '' = 全体

  /** 服一覧（API） */
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await axios.get(ENDPOINTS.getClothes(uid), { headers });
        // 期待JSON例: [{ id, cloth_name, category, location, image_url, last_worn, wear_count }]
        const map: Record<string, Cloth> = {};
        (res.data || []).forEach((d: any) => {
          const item: Cloth = {
            id: String(d.id),
            name: d.name ?? d.cloth_name ?? '아이템',
            thumbnail: d.thumbnail ?? d.image_url ?? '',
            category: String(d.category ?? '').trim(),
            locationLabel: String(d.location ?? d.locationLabel ?? '').trim(),
            lastWorn: typeof d.last_worn === 'string' ? d.last_worn : d.lastWorn,
            wearCount: Number(d.wear_count ?? d.wearCount ?? 0),
          };
          map[item.id] = item;
        });
        if (!cancelled) setClothes(map);
      } catch (e:any) {
        console.error('❌ getClothes error:', e?.response?.status, e?.message);
        if (!cancelled) {
          setClothes({});
          Alert.alert('오류', '옷 목록을 불러오지 못했습니다.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  /** 当月の着用記録（API） */
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const { start, end } = monthRange(selected);

    setLoading(true);
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await axios.get(ENDPOINTS.getWearRecords(uid, start, end), { headers });
        // 期待JSON例: [{ id, date, cloth_id|clothId, memo }]
        const byDate: Record<string, WearRecord[]> = {};
        (res.data || []).forEach((d: any) => {
          const wr: WearRecord = {
            id: String(d.id),
            date: d.date,
            clothId: String(d.clothId ?? d.cloth_id),
            memo: d.memo ?? '',
          };
          byDate[wr.date] = [...(byDate[wr.date] ?? []), wr];
        });
        if (!cancelled) setRecordsByDate(byDate);
      } catch (e:any) {
        console.error('❌ getWearRecords error:', e?.response?.status, e?.message);
        if (!cancelled) {
          setRecordsByDate({});
          Alert.alert('오류', '착용 기록을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, selected]);

  /** カレンダーのマーク */
  const marked = useMemo(() => {
    const marks: any = {};
    Object.keys(recordsByDate).forEach(d => {
      marks[d] = { marked: true, dots: [{ color: ACCENT }] };
    });
    marks[selected] = { ...(marks[selected] || {}), selected: true, selectedColor: ACCENT, selectedTextColor: '#fff' };
    return marks;
  }, [recordsByDate, selected]);

  const listForSelectedDay = recordsByDate[selected] ?? [];
  const onDayPress = (day: DateObject) => setSelected(day.dateString);

  /** distinct（空除外） */
  const locations = useMemo(() => {
    const vals = Object.values(clothes).map(c => c.locationLabel).filter(v => !!v && v.trim().length > 0);
    return ['전체', ...Array.from(new Set(vals))];
  }, [clothes]);
  const categories = useMemo(() => {
    const vals = Object.values(clothes).map(c => c.category).filter(v => !!v && v.trim().length > 0);
    return ['전체', ...Array.from(new Set(vals))];
  }, [clothes]);

  /** 絞り込み後の服候補 */
  const clothesForPick = useMemo(() => {
    return Object.values(clothes).filter(c => {
      const okLoc = !selLocation || selLocation === '전체' || c.locationLabel === selLocation;
      const okCat = !selCategory || selCategory === '전체' || c.category === selCategory;
      return okLoc && okCat;
    });
  }, [clothes, selLocation, selCategory]);

  const clothesLoaded = Object.keys(clothes).length > 0;

  /** 記録追加（frequencyは送らない） */
  const onConfirmAdd = async () => {
    if (!uid) return Alert.alert('오류', '로그인이 필요합니다.');
    if (!form.clothId) return Alert.alert('안내', '아이템을 선택해 주세요.');

    try {
      const headers = await authHeaders();

      await axios.post(
        ENDPOINTS.addWearRecord(),
        { uid, date: selected, clothId: form.clothId, memo: form.memo },
        { headers }
      );

      // モーダル閉じ・フォーム初期化
      setOpen(false);
      setForm({ clothId: '', memo: '' });

      // 楽観更新：選んだ服の lastWorn / wearCount を即時加筆
      setClothes(prev => {
        const cur = prev[form.clothId];
        if (!cur) return prev;
        return {
          ...prev,
          [form.clothId]: {
            ...cur,
            lastWorn: selected,
            wearCount: (cur.wearCount ?? 0) + 1,
          },
        };
      });

      // 当月の記録を再取得して最新化
      const { start, end } = monthRange(selected);
      const res = await axios.get(ENDPOINTS.getWearRecords(uid, start, end), { headers });
      const byDate: Record<string, WearRecord[]> = {};
      (res.data || []).forEach((d: any) => {
        const wr: WearRecord = {
          id: String(d.id),
          date: d.date,
          clothId: String(d.clothId ?? d.cloth_id),
          memo: d.memo ?? '',
        };
        byDate[wr.date] = [...(byDate[wr.date] ?? []), wr];
      });
      setRecordsByDate(byDate);
    } catch (e:any) {
      console.error('❌ addWearRecord error:', e?.response?.status, e?.message);
      Alert.alert('오류', '기록 추가에 실패했습니다.');
    }
  };

  return (
    <View style={styles.container}>
      {/* --- カレンダーUIはそのまま --- */}
      <View style={styles.headerSpacer}>
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
        <View style={{ paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
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
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ color: MUTE }}>이 날짜에는 기록이 없어요</Text>
            </View>
          }
        />
      )}

      {/* 追加モーダル（頻度フィールドは削除済み） */}
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>사용자 옷 기록 추가</Text>

            {/* 1) 보관 공간 */}
            <View style={styles.field}>
              <Text style={styles.label}>보관 공간</Text>
              <View style={styles.pickerBox}>
                <Picker
                  enabled={clothesLoaded}
                  selectedValue={selLocation}
                  onValueChange={(v) => { setSelLocation(String(v)); setForm(s => ({ ...s, clothId: '' })); }}
                >
                  {!clothesLoaded && <Picker.Item label="불러오는 중..." value="" />}
                  {clothesLoaded && locations.map(loc => (
                    <Picker.Item key={loc} label={loc} value={loc === '전체' ? '' : loc} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* 2) 카테고리 */}
            <View style={styles.field}>
              <Text style={styles.label}>카테고리</Text>
              <View style={styles.pickerBox}>
                <Picker
                  enabled={clothesLoaded}
                  selectedValue={selCategory}
                  onValueChange={(v) => { setSelCategory(String(v)); setForm(s => ({ ...s, clothId: '' })); }}
                >
                  {!clothesLoaded && <Picker.Item label="불러오는 중..." value="" />}
                  {clothesLoaded && categories.map(cat => (
                    <Picker.Item key={cat} label={cat} value={cat === '전체' ? '' : cat} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* 3) 아이템（場所/カテゴリで絞り込み） */}
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
                      value={c.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* 4) 메모（任意） */}
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

/** ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: IVORY },
  headerSpacer: { paddingTop: 60, paddingBottom: 8, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  calendarWrap: { backgroundColor: IVORY, paddingHorizontal: 12, paddingBottom: 4 },

  listHeader: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: LINE,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  listHeaderText: { color: TEXT, fontWeight: '600' },
  addText: { color: '#2C7BE5', fontWeight: '700' },

  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
  thumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#F1EFEA' },
  meta: { marginLeft: 12, flex: 1 },
  name: { color: TEXT, fontWeight: '700', fontSize: 16 },
  sub: { color: MUTE, marginTop: 2 },
  separator: { height: 1, marginLeft: 16 + 54 + 12, backgroundColor: LINE },

  // modal
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


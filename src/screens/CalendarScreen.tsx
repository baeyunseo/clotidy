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

/* ---------- Types ---------- */
type Cloth = {
  id: string;
  name: string;
  thumbnail: string;
  category: string;
  locationLabel: string;
  lastWorn?: string;   // YYYY-MM-DD
  wearCount?: number;  // 任意
};
type WearRecord = {
  id: string;
  date: string;        // YYYY-MM-DD
  clothId: string;
  memo?: string;
};

/* ---------- API: サーバ部分だけ書き直し ---------- */
const BASE_URL = 'http://54.79.167.144:5000';
const ENDPOINTS = {
  // 服一覧取得
  getClothes: (uid: string) => `${BASE_URL}/api/get-clothes/${uid}`,
  // 月次の着用記録（あれば使う。404ならフォールバック）
  getWearRecords: (uid: string, start: string, end: string) =>
    `${BASE_URL}/api/wear-records/${uid}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  // 着用登録：回数+最終着用を更新
  increaseWornCount: (clothId: string) => `${BASE_URL}/api/increase-worn-count/${clothId}`,
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

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const monthRange = (iso: string) => {
  const [y, m] = iso.split('-').map(n => parseInt(n, 10));
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { start: toISO(first), end: toISO(last) };
};

export default function CalendarRecordScreen() {
  /* ---------- Auth ---------- */
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => auth().onAuthStateChanged(u => setUid(u?.uid ?? null)), []);

  /* ---------- State ---------- */
  const [selected, setSelected] = useState<string>(toISO(new Date()));
  const [loading, setLoading] = useState(true);

  const [clothes, setClothes] = useState<Record<string, Cloth>>({});
  const [recordsByDate, setRecordsByDate] = useState<Record<string, WearRecord[]>>({});

  const [open, setOpen] = useState(false);
  // ★頻度は削除：clothId + memo のみ
  const [form, setForm] = useState<{ clothId: string; memo: string }>({ clothId: '', memo: '' });

  const [selLocation, setSelLocation] = useState<string>(''); // ''=전체
  const [selCategory, setSelCategory] = useState<string>(''); // ''=전체

  /* ---------- Fetch: Clothes (GET /api/get-clothes/:uid) ---------- */
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
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
            lastWorn: typeof d.last_worn === 'string' ? d.last_worn : d.lastWorn,
            wearCount: Number(d.wear_count ?? d.wearCount ?? 0),
          };
          map[item.id] = item;
        });
        if (!cancelled) setClothes(map);
      } catch (e:any) {
        console.error('❌ getClothes error:', e?.response?.status, e?.message);
        if (!cancelled) setClothes({});
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  /* ---------- Fetch: Monthly records (GET /api/wear-records …) ---------- */
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const { start, end } = monthRange(selected);
    setLoading(true);
    (async () => {
      try {
        const headers = await authHeaders();
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
        if (!cancelled) setRecordsByDate(byDate);
      } catch (e:any) {
        // ★ 404ならフォールバック：clothes.lastWorn から構築
        if (e?.response?.status === 404) {
          const byDate: Record<string, WearRecord[]> = {};
          Object.values(clothes).forEach(c => {
            if (c.lastWorn) {
              byDate[c.lastWorn] = [
                ...(byDate[c.lastWorn] ?? []),
                { id: `${c.id}-${c.lastWorn}`, date: c.lastWorn, clothId: c.id, memo: '' }
              ];
            }
          });
          if (!cancelled) setRecordsByDate(byDate);
        } else {
          console.error('❌ getWearRecords error:', e?.response?.status, e?.message);
          if (!cancelled) setRecordsByDate({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, selected, clothes]);

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

  /* ---------- 空状態の文言制御 ---------- */
  const hasAnyRecords = useMemo(
    () => Object.values(recordsByDate).some(list => (list?.length ?? 0) > 0),
    [recordsByDate]
  );

  /* ---------- Register (POST /api/increase-worn-count/:clothId) ---------- */
  const onConfirmAdd = async () => {
    if (!uid) return Alert.alert('오류', '로그인이 필요합니다.');
    if (!form.clothId) return Alert.alert('안내', '아이템을 선택해 주세요.');
    try {
      const headers = await authHeaders();
      // date と memo は任意でBodyへ
      await axios.post(
        ENDPOINTS.increaseWornCount(form.clothId),
        { date: selected, memo: form.memo ?? '' },
        { headers }
      );

      // モーダル閉じ＋フォーム初期化
      setOpen(false);
      setForm({ clothId: '', memo: '' });

      // 楽観更新：服の最終着用日/着用回数 & 当日のリスト
      setClothes(prev => {
        const cur = prev[form.clothId];
        if (!cur) return prev;
        return { ...prev, [form.clothId]: { ...cur, lastWorn: selected, wearCount: (cur.wearCount ?? 0) + 1 } };
      });
      setRecordsByDate(prev => {
        const next = { ...prev };
        next[selected] = [
          ...(next[selected] ?? []),
          { id: `${form.clothId}-${selected}`, date: selected, clothId: form.clothId, memo: '' }
        ];
        return next;
      });
    } catch (e:any) {
      console.error('❌ increaseWornCount error:', e?.response?.status, e?.message, e?.response?.data);
      Alert.alert('오류', '기록 추가에 실패했습니다.');
    }
  };

  /* ---------- UI ---------- */
  return (
    <View style={styles.container}>
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

      {/* 追加モーダル（頻度欄は削除済み） */}
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
                      value={c.id}
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

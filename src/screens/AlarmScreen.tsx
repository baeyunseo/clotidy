import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import axios from 'axios';
import auth from '@react-native-firebase/auth';

type Cloth = {
  id: string;
  clothName: string;
  category?: string;
  imageUrl?: string;
  lastWorn?: string | number | Date;
  createdAt?: string | number | Date;
  updatedAt?: string | number | Date;
  [k: string]: any;
};

const BASE_URL = 'http://54.79.167.144:5000';
const PADDING_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8;

const getImageUrl = (u?: string | null) =>
  !u ? '' : /^https?:\/\//i.test(u) ? u : `${BASE_URL}/${String(u).replace(/^\//, '')}`;

// --- 日付ユーティリティ（変更なし + Firestore Timestamp対応） ---
const toDate = (v: any): Date | null => {
  if (v == null) return null;
  if (v?.seconds) return new Date(v.seconds * 1000); // Firestore Timestamp
  if (typeof v === 'number') return new Date(v);
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const formatYmd = (v: any) => {
  const d = toDate(v);
  if (!d) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}. ${m}. ${dd}`;
};

// --- ここから追記: 3か月（約90日）経過判定 ---
const DAY_MS = 24 * 60 * 60 * 1000;
const REMIND_INTERVAL_MS = 90 * DAY_MS;
const shouldShowAfter3Months = (doc: Cloth): boolean => {
  // lastWorn → updatedAt → createdAt の順で基準日を決める
  const base = toDate(doc.lastWorn ?? doc.updatedAt ?? doc.createdAt);
  if (!base) return false;
  return (Date.now() - base.getTime()) >= REMIND_INTERVAL_MS;
};

export default function AlarmScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<Cloth[]>([]);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions?.({ headerShown: false } as any);
  }, [navigation]);

  const fetchAll = useCallback(async () => {
    const uid = auth().currentUser?.uid;
    if (!uid) {
      Alert.alert('로그인 필요', '로그인 후 다시 시도해주세요.');
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/get-clothes/${uid}`);
      const arr = Array.isArray(res.data) ? res.data : [];

      const mapped: Cloth[] = arr.map((it: any) => ({
        id: String(it.id),
        clothName: it.cloth_name ?? it.clothName ?? it.name ?? '아이템',
        category: it.category ?? '',
        imageUrl: it.image_url ?? it.imageUrl ?? '',
        lastWorn: it.last_worn ?? it.lastWorn ?? it.lastWornAt ?? it.updatedAt ?? it.createdAt,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
        ...it,
      }));

      // ▼ ここで「3か月経過したものだけ」抽出
      const filtered = mapped.filter(shouldShowAfter3Months);

      // 表示は最近のものが上に来るように（基準日が新しい順）
      filtered.sort((a, b) => {
        const at = toDate(a.lastWorn ?? a.updatedAt ?? a.createdAt)?.getTime() ?? 0;
        const bt = toDate(b.lastWorn ?? b.updatedAt ?? b.createdAt)?.getTime() ?? 0;
        return bt - at;
      });

      setItems(filtered);
    } catch (e: any) {
      console.warn('[Alarm] fetch error', e?.message || e);
      Alert.alert('에러', e?.message || '옷 목록을 불러올 수 없습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // サーバーには触らず、画面からだけ即削除
  const handleDelete = useCallback((clothId: string) => {
    setItems(prev => prev.filter(it => it.id !== clothId));
  }, []);

  const renderItem = ({ item }: { item: Cloth }) => {
    const img = getImageUrl(item.imageUrl);
    return (
      <View style={styles.card}>
        {img ? <Image source={{ uri: img }} style={styles.thumb} /> : <View style={styles.thumb} />}
        <View style={{ flex: 1 }}>
          <View style={styles.itemTextBox}>
            <Text style={styles.itemName} numberOfLines={1}>{item.clothName}</Text>
            <Text style={styles.lastWorn}>마지막 착용일 : {formatYmd(item.lastWorn)}</Text>
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => navigation.navigate('Coordinate', { seedClothId: item.id })}
            >
              <Text style={styles.btnOutlineText}>코디 제안</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnOutline} onPress={() => handleDelete(item.id)}>
              <Text style={styles.btnOutlineText}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const EmptyOrLoading = () => (
    <View style={styles.emptyCenter}>
      {loading
        ? (<><ActivityIndicator /><Text style={{ marginTop: 8 }}>불러오는 중…</Text></>)
        : (<Text style={styles.emptyText}>등록된 옷이 없어요.</Text>)}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backHit} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>착용 리마인드</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} />}
        ListEmptyComponent={<EmptyOrLoading />}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : { paddingBottom: 20 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFEFA', paddingHorizontal: 16 },
  topBar: {
    paddingTop: PADDING_TOP, paddingBottom: 10, alignItems: 'center',
    justifyContent: 'center', position: 'relative',
  },
  backHit: { position: 'absolute', left: 0, top: PADDING_TOP, paddingVertical: 6, paddingRight: 16 },
  backIcon: { fontSize: 24, fontWeight: '500' },
  topTitle: { fontSize: 18, fontWeight: '700' },
  card: {
    flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#EFEFEF', elevation: 1, shadowColor: '#000',
    shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#EEE' },
  itemTextBox: { marginBottom: 10 },
  itemName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  lastWorn: { fontSize: 12, color: '#646464' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnOutline: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: '#BFBFBF', backgroundColor: '#fff',
  },
  btnOutlineText: { color: '#333', fontWeight: '600' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCenter: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#777' },
});

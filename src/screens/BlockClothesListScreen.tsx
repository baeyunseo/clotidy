// src/screens/BlockClothesListScreen.tsx
// 옷장 위치별 옷 목록 화면

import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  Alert, Image, TouchableOpacity
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import auth from '@react-native-firebase/auth';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Cloth = {
  id: string;
  clothName: string;
  category: string;
  location?: string;
  imageUrl?: string;
};

const BASE_URL = "http://54.79.167.144:5000";

function getImageUrl(imageUrl: string | undefined | null) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${BASE_URL}/${imageUrl.replace(/^\//, "")}`;
}

export default function BlockClothesListScreen() {
  const route = useRoute<{ key: string; name: string; params: { location: string } }>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const location = route.params?.location ?? "";
  const [clothes, setClothes] = useState<Cloth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClothes = async () => {
      setLoading(true);
      try {
        const uid = auth().currentUser?.uid;
        if (!uid) throw new Error("로그인 필요");
        const res = await axios.get(`http://54.79.167.144:5000/api/get-clothes/${uid}`);

        console.log("🔥 API 전체 응답:", JSON.stringify(res.data, null, 2));
        console.log("🔥 location param:", location);

        // 필터하면서 각 row의 location 비교 콘솔
        const filtered = (res.data || []).filter((item: any, idx: number) => {
          const locA = (item.location ?? '').trim();
          const locB = (location ?? '').trim();
          const match = locA === locB;
          console.log(`🔥 [${idx}] item.location: "${locA}" / target: "${locB}" / match:`, match);
          return match;
        }).map((item: any) => {
          const mapped = {
            id: item.id,
            clothName: item.cloth_name ?? "",
            category: item.category ?? "",
            location: item.location,
            imageUrl: item.image_url ?? "",
          };
          console.log("🔥 변환된 아이템:", mapped);
          return mapped;
        });

        console.log("🔥 최종 filtered:", filtered);
        setClothes(filtered);

      } catch (err: any) {
        setClothes([]);
        console.log('❌ 옷 목록 조회 실패:', err, err.response?.data);
        Alert.alert('에러', err.message || '옷 목록을 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchClothes();
  }, [location]);

  const renderItem = ({ item }: { item: Cloth }) => (
    <TouchableOpacity
      style={styles.itemCard}
      activeOpacity={0.85}
      // onPress={() => { ... }}
    >
      {item.imageUrl && item.imageUrl !== "" && item.imageUrl !== "null" ? (
        <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.img} />
      ) : (
        <View style={[styles.img, { backgroundColor: '#E6EAE8', justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#aaa', fontSize: 13 }}>No Image</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{item.clothName || "이름없음"}</Text>
      <Text style={styles.category}>{item.category}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{location || "옷장"} 옷 리스트</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#6AC892" style={{ marginTop: 40 }} />
      ) : clothes.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 30, color: "#888" }}>등록된 옷이 없습니다.</Text>
      ) : (
        <FlatList
          data={clothes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFEFA", paddingTop: 32 },
  header: { fontSize: 20, fontWeight: "bold", color: "#286E46", margin: 20, textAlign: "center" },
  itemCard: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    margin: 8,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    minWidth: 140,
    maxWidth: 180,
    elevation: 2,
  },
  img: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#eaeaea",
  },
  name: { fontWeight: "bold", fontSize: 16, marginBottom: 2, color: "#222", textAlign: "center", maxWidth: 90 },
  category: { color: "#377", fontSize: 13, marginBottom: 4, textAlign: "center" },
});
// src/screens/BlockClothesListScreen.tsx
// 옷장 위치별 옷 목록 화면

import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, Image, TouchableOpacity } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import auth from '@react-native-firebase/auth';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Cloth = {
  id: string;
  clothName: string;   // 명세 필드에 맞춤
  category: string;
  location?: string;
  imagePath?: string;  // 명세 필드
  // lastWorn?: string; // 필요 없으면 제거
};

export default function BlockClothesListScreen() {
  const route = useRoute<{ key: string; name: string; params: { location: string } }>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const location = route.params?.location;
  const [clothes, setClothes] = useState<Cloth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClothes = async () => {
      setLoading(true);
      try {
        const uid = auth().currentUser?.uid;
        if (!uid) throw new Error("로그인 필요");
        // 1. 전체 옷 불러오기
        const res = await axios.get(`http://13.211.132.164:5000/api/get-clothes/${uid}`);
        // 2. location으로 필터
        const filtered = (res.data || []).filter(
          (item: Cloth) => item.location === location
        );
        setClothes(filtered);
      } catch (err: any) {
        setClothes([]);
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
      onPress={() => {
        // 상세화면 연결 등 필요 시
      }}
    >
      {item.imagePath ? (
        <Image source={{ uri: item.imagePath }} style={styles.img} />
      ) : (
        <View style={[styles.img, { backgroundColor: '#E6EAE8', justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#aaa', fontSize: 13 }}>No Image</Text>
        </View>
      )}
      <Text style={styles.name}>{item.clothName}</Text>
      <Text style={styles.category}>{item.category}</Text>
      {/* lastWorn 등은 필요 없으면 뺄 것 */}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{location} 옷 리스트</Text>
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
  name: { fontWeight: "bold", fontSize: 16, marginBottom: 2, color: "#222", textAlign: "center" },
  category: { color: "#377", fontSize: 13, marginBottom: 4, textAlign: "center" },
});
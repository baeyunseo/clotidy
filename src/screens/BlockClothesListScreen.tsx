// src/screens/BlockClothesListScreen.tsx
// 옷장 위치별 옷 목록 화면

// src/screens/BlockClothesListScreen.tsx

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
        const res = await axios.get(`${BASE_URL}/api/get-clothes/${uid}`);

        const filtered = (res.data || []).filter((item: any) => {
          const locA = (item.location ?? '').trim();
          const locB = (location ?? '').trim();
          return locA === locB;
        }).map((item: any) => ({
          id: item.id,
          clothName: item.cloth_name ?? "",
          category: item.category ?? "",
          location: item.location,
          imageUrl: item.image_url ?? "",
        }));

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
    <View style={styles.card}>
      <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.image} />
      <View style={styles.infoBox}>
        <Text style={styles.name}>{item.clothName || "이름없음"}</Text>
        <Text style={styles.meta}>{item.category}</Text>
        <TouchableOpacity
          style={styles.coordiBtn}
          onPress={() => navigation.navigate("Coordinate")}
        >
          <Text style={styles.coordiText}>✔️  코디 제안</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{location || "옷장"} 옷 리스트</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#6AC892" style={{ marginTop: 40 }} />
      ) : clothes.length === 0 ? (
        <Text style={styles.emptyText}>등록된 옷이 없습니다.</Text>
      ) : (
        <FlatList
          data={clothes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFEFA",
    paddingTop: 32,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#286E46",
    margin: 20,
    textAlign: "center"
  },
  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#888",
  },
  card: {
    width: '48%',
    margin: '1%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#eee',
    elevation: 0.5,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F3F3',
  },
  infoBox: {
    padding: 10,
    justifyContent: "space-between",
    minHeight: 100,
  },
  name: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#222",
  },
  meta: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  coordiBtn: {
    marginTop: 10,
    backgroundColor: "#6AC892",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  coordiText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
});
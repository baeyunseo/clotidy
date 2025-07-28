// SearchResultScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  Alert, Image, TouchableOpacity
} from "react-native";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import auth from '@react-native-firebase/auth';

const BASE_URL = "http://54.79.167.144:5000";

type Cloth = {
  id: string;
  clothName: string;
  category: string;
  color?: string;
  location?: string;
  imageUrl?: string;
};

function getImageUrl(imageUrl: string | undefined | null) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${BASE_URL}/${imageUrl.replace(/^\//, "")}`;
}

export default function SearchResultScreen() {
  const route = useRoute<any>();
  const keyword: string = route.params?.keyword ?? "";
  const userId: string = route.params?.userId ?? "";

  const [clothes, setClothes] = useState<Cloth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchFromAPI = async () => {
    console.log("🔍 useEffect triggered with keyword:", keyword);
    setLoading(true);
    try {
      const uid = auth().currentUser?.uid;
      console.log("🔐 Firebase uid:", uid);

      if (!uid) throw new Error("로그인 필요");

      const requestUrl = `${BASE_URL}/api/search-clothes/${uid}?keyword=${encodeURIComponent(keyword)}`;
      console.log("🌐 API request URL:", requestUrl);

      const res = await axios.get(requestUrl);

      console.log("✅ API response:", res.data);

      const filtered = (res.data || []).map((item: any) => ({
        id: item.id,
        clothName: item.cloth_name ?? "",
        category: item.category ?? "",
        color: item.color ?? "",
        location: item.location,
        imageUrl: item.image_url ?? "",
      }));

      setClothes(filtered);
    } catch (e: any) {
      console.error("❌ API error:", e);
      Alert.alert("오류", "검색 결과를 불러오지 못했습니다.");
      setClothes([]);
    } finally {
      setLoading(false);
    }
  };

  if (userId && keyword) fetchFromAPI();
}, [keyword]);

  const renderItem = ({ item }: { item: Cloth }) => (
    <TouchableOpacity style={styles.item}>
      {item.imageUrl ? (
        <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <Text style={styles.meta}>No Image</Text>
        </View>
      )}
      <View>
        <Text style={styles.name}>{item.clothName}</Text>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.meta}>{item.location}</Text>
        {item.color && <Text style={styles.meta}>색상: {item.color}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>
        '{keyword}' 검색 결과
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6AC892" />
      ) : clothes.length === 0 ? (
        <Text style={styles.empty}>검색 결과 없음</Text>
      ) : (
        <FlatList
          data={clothes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEFA',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#286E46',
  },
  item: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: '#ccc',
    alignItems: 'center',
    gap: 10,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#eaeaea',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  category: {
    fontSize: 14,
    color: '#444',
  },
  meta: {
    fontSize: 13,
    color: '#666',
  },
  empty: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#aaa',
  },
});


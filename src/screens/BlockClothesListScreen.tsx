// src/screens/BlockClothesListScreen.tsx

import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useRoute } from "@react-navigation/native";
import axios from "axios"; // 실제 API 연동 시 사용

type Cloth = {
  id: string;
  cloth_name: string;
  category: string;
  last_worn?: string;
};

export default function BlockClothesListScreen() {
  const route = useRoute<any>();
  const { location } = route.params;
  const [clothes, setClothes] = useState<Cloth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 실제로는 location(블록이름) 필터링 쿼리로 데이터 가져오기
    // 지금은 더미 데이터로 테스트
    setTimeout(() => {
      if (location === "상의칸") {
        setClothes([
          { id: "1", cloth_name: "회색 패딩", category: "패딩", last_worn: "2024-12-01T10:00:00Z" },
          { id: "2", cloth_name: "검정 니트", category: "니트", last_worn: "2024-12-05T08:00:00Z" }
        ]);
      } else if (location === "하의칸") {
        setClothes([
          { id: "3", cloth_name: "청바지", category: "바지", last_worn: "2024-11-22T14:20:00Z" }
        ]);
      } else {
        setClothes([]);
      }
      setLoading(false);
    }, 500);
  }, [location]);

  const renderItem = ({ item }: { item: Cloth }) => (
    <View style={styles.itemCard}>
      <Text style={styles.name}>{item.cloth_name}</Text>
      <Text style={styles.category}>{item.category}</Text>
      <Text style={styles.lastWorn}>
        마지막 착용일: {item.last_worn ? item.last_worn.slice(0, 10) : "정보 없음"}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{location} 옷 리스트</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : clothes.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 30 }}>등록된 옷이 없습니다.</Text>
      ) : (
        <FlatList
          data={clothes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 32 },
  header: { fontSize: 20, fontWeight: "bold", color: "#286E46", margin: 20, textAlign: "center" },
  itemCard: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    margin: 8,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    minWidth: 130,
    maxWidth: 170,
  },
  name: { fontWeight: "bold", fontSize: 16, marginBottom: 4, color: "#222" },
  category: { color: "#377", fontSize: 14, marginBottom: 6 },
  lastWorn: { fontSize: 13, color: "#888" },
});

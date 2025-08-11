// src/screens/BlockClothesListScreen.tsx
// 옷장 위치별 옷 목록 화면

import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  Alert, Image, TouchableOpacity, Modal, Pressable
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import auth from '@react-native-firebase/auth';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

const BASE_URL = "http://54.79.167.144:5000";

// 아이콘 불러오기
const deleteIcon = require('../../assets/icons/delete.png');
const infoIcon = require('../../assets/icons/Info.png');

type Cloth = {
  id: string;
  clothName: string;
  category: string;
  location?: string;
  imageUrl?: string;
};

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

  // 상태
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [infoModalId, setInfoModalId] = useState<string | null>(null);

  // 옷 목록 불러오기
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

  useEffect(() => {
    fetchClothes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // 삭제 실행
  const handleDelete = async (clothId: string) => {
    try {
      await axios.delete(`${BASE_URL}/api/delete-cloth/${clothId}`);
      setDeleteModalId(null);
      fetchClothes(); // 목록 새로고침
    } catch (err: any) {
      Alert.alert("삭제 실패", err.message);
    }
  };

  // 각 옷 카드
  const renderItem = ({ item }: { item: Cloth }) => (
    <View style={styles.card}>
      {/* Info 아이콘 (우상단) */}
      <TouchableOpacity
        style={styles.infoIconBox}
        onPress={() => setInfoModalId(item.id)}
        hitSlop={{ top:10, bottom:10, left:10, right:10 }}
      >
        <Image source={infoIcon} style={styles.infoIcon} />
      </TouchableOpacity>
      <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.image} />
      <View style={styles.infoBox}>
        {/* 이름과 삭제 아이콘 우측 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.name}>{item.clothName || "이름없음"}</Text>
          <TouchableOpacity onPress={() => setDeleteModalId(item.id)}>
            <Image source={deleteIcon} style={styles.deleteIcon} />
          </TouchableOpacity>
        </View>
        <Text style={styles.meta}>{item.category}</Text>
        <TouchableOpacity
          style={styles.coordiBtn}
          onPress={() => navigation.navigate("Coordinate")}
        >
          <Text style={styles.coordiText}>✔️  코디 제안</Text>
        </TouchableOpacity>
      </View>
      {/* 삭제 재확인 모달 */}
      <Modal visible={deleteModalId === item.id} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setDeleteModalId(null)}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 16, marginBottom: 14 }}>정말 삭제하시겠습니까?</Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity onPress={() => setDeleteModalId(null)} style={styles.modalBtnGray}>
                <Text style={{ color: "#333", fontSize: 15 }}>아니오</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.modalBtnRed}>
                <Text style={{ color: "#fff", fontSize: 15 }}>예, 삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
      {/* 상세 정보/수정 모달 */}
      <Modal visible={infoModalId === item.id} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setInfoModalId(null)}>
          <View style={styles.infoModalBox}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>상세 정보</Text>
            <Text>이름: {item.clothName}</Text>
            <Text>카테고리: {item.category}</Text>
            <Text>보관 위치: {item.location}</Text>
            {/* 수정 버튼 */}
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                setInfoModalId(null);
                navigation.navigate("EditCloth", { clothId: item.id });
              }}>
              <Text style={{ color: "#37955F", fontSize: 15, fontWeight: "bold" }}>수정하기</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    backgroundColor: '#FFFEFA',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
    elevation: 0,
    marginBottom: 20,
    minHeight: 240,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#fff',
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
  // info 아이콘 (우상단)
  infoIconBox: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
  },
  infoIcon: {
    width: 22,
    height: 22,
    tintColor: "#222"
  },
  // 삭제 아이콘 (이름 옆)
  deleteIcon: {
    width: 20,
    height: 20,
    marginLeft: 8,
    tintColor: "#222"
  },
  // 모달 (삭제, 정보)
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 260,
    shadowColor: '#000',
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 7,
  },
  modalBtnGray: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: "#eee",
    borderRadius: 8,
    marginRight: 10,
  },
  modalBtnRed: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: "#D74B4B",
    borderRadius: 8,
  },
  infoModalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 28,
    width: 270,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 8,
  },
  editBtn: {
    marginTop: 16,
    backgroundColor: "#F5FFFA",
    borderRadius: 8,
    paddingHorizontal: 22,
    paddingVertical: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#37955F",
  },
});
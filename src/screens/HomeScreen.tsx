// src/screens/HomeScreen.tsx
// 홈 화면

import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar,
  Dimensions, FlatList, ActivityIndicator, Alert, Modal, Pressable
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import auth from "@react-native-firebase/auth";
import axios from "axios";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Coord = { x: number; y: number };
type BlockType = { name: string; coords: Coord[]; items?: number };

type ClothItem = {
  id: string;
  image_url: string;
  cloth_name: string;
  category?: string;
  location?: string;
  user_id?: string;
};

type Season = "summer" | "winter";

const BASE_URL = "http://54.79.167.144:5000";
const toAbs = (u?: string) => (!u ? "" : /^https?:\/\//i.test(u) ? u : `${BASE_URL}/${String(u).replace(/^\/?/, "")}`);

// 카드용 아이콘
const deleteIcon = require("../../assets/icons/delete.png");
const infoIcon = require("../../assets/icons/Info.png");

// 시즌 토글 아이콘
const sunIcon = require("../../assets/icons/sun.png");   // ☀️
const snowIcon = require("../../assets/icons/snow.png"); // ❄️

// ====== 오른쪽 상단 아이콘 크기(각자 따로 조절) ======
const SEARCH_BOX = 55;     // 검색 버튼 터치 박스
const SEARCH_GLYPH = 45;   // 검색 아이콘 실제 픽셀
const BUY_BOX = 50;        // 구매 버튼 터치 박스
const BUY_GLYPH = 30;      // 구매 아이콘 실제 픽셀
const RIGHT_ICON_GAP = 8;
// ====================================================

// 카테고리 → 시즌 간단 매핑
const categorySeasonMap: Record<string, Season | "all" | "mid"> = {
  // 여름
  "tshirt": "summer", "shorts": "summer", "sleeveless top": "summer",
  "sandal": "summer", "flip flops": "summer", "linen": "summer",
  // 겨울
  "coat": "winter", "jacket": "winter", "down": "winter",
  "cardigan": "winter", "sweater": "winter", "boots": "winter",
  // 간절기/상시
  "shirt": "mid", "jeans": "mid", "skirt": "mid", "dress": "mid",
  "loafers": "mid", "sneakers": "all", "handbag": "all", "belt": "all", "hat": "all"
};
const getItemSeason = (category?: string): Season | "all" | "mid" => {
  if (!category) return "all";
  const key = category.toLowerCase().trim();
  return categorySeasonMap[key] ?? "all";
};

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<"closet" | "list">("closet");
  const [userName, setUserName] = useState("사용자");
  const [closetBlocks, setClosetBlocks] = useState<BlockType[]>([]);
  const [clothes, setClothes] = useState<ClothItem[]>([]);
  const [clothingCount, setClothingCount] = useState(0);
  const [rowCount, setRowCount] = useState(4);
  const [colCount, setColCount] = useState(3);

  const [wearingId, setWearingId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [infoModalId, setInfoModalId] = useState<string | null>(null);

  // 시즌 토글 (기본 ☀️)
  const [season, setSeason] = useState<Season>("summer");

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const gridWidth = Dimensions.get("window").width - 40;
  const cellSize = gridWidth / colCount;

  const fetchUserData = useCallback(async () => {
    try {
      const uid = auth().currentUser?.uid;
      if (!uid) return;

      const [userRes, closetRes, clothesRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/user/${uid}`),
        axios.get(`${BASE_URL}/api/closet-layout/${uid}`),
        axios.get(`${BASE_URL}/api/get-clothes/${uid}`)
      ]);

      const userData = userRes.data;
      const closetData = closetRes.data;

      const mapped: ClothItem[] = (clothesRes.data || []).map((d: any) => ({
        id: String(d.id),
        cloth_name: d.cloth_name ?? d.name ?? "아이템",
        image_url: toAbs(d.image_url ?? d.thumbnail ?? ""),
        category: d.category ?? "",
        location: d.location ?? "",
        user_id: d.user_id,
      }));

      if (userData.name) setUserName(userData.name);

      const updatedBlocks = (closetData.closet_layout || []).map((block: BlockType) => {
        const itemCount = mapped.filter((item) =>
          (item.location ?? '').trim() === (block.name ?? '').trim()
        ).length;
        return { ...block, items: itemCount };
      });

      setClosetBlocks(updatedBlocks);
      setClothes(mapped);
      setClothingCount(mapped.length);

      if (closetData.layout_type) {
        const [cols, rows] = closetData.layout_type.split("x").map(Number);
        setColCount(cols || 3);
        setRowCount(rows || 4);
      }
    } catch (err) {
      console.error("오류 발생:", err);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchUserData();
  }, [fetchUserData]));

  const getBlockRect = (block: BlockType) => {
    if (!block.coords || block.coords.length === 0) return {
      top: 0, left: 0, width: cellSize, height: cellSize
    };
    const rows = block.coords.map((c) => c.x);
    const cols = block.coords.map((c) => c.y);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);
    return {
      top: (rowCount - maxRow - 1) * cellSize,
      left: minCol * cellSize,
      width: (maxCol - minCol + 1) * cellSize,
      height: (maxRow - minRow + 1) * cellSize,
    };
  };

  // 착용 기록
  const handleWear = async (cloth: ClothItem) => {
    try {
      const uid = auth().currentUser?.uid;
      if (!uid) return Alert.alert("안내", "로그인이 필요합니다.");
      if (cloth.user_id && cloth.user_id !== uid) {
        return Alert.alert("안내", "내 소유의 아이템만 기록할 수 있어요.");
      }
      setWearingId(cloth.id);
      await axios.patch(`${BASE_URL}/api/last-worn/${encodeURIComponent(cloth.id)}`, {
        last_worn: new Date().toISOString(),
        alsoIncrement: true,
      });
      Alert.alert('완료', '오늘 착용으로 기록했어요.');
    } catch (e: any) {
      console.error("착용 실패:", e?.response?.status, e?.message, e?.response?.data);
      Alert.alert("오류", "착용 기록에 실패했습니다.");
    } finally {
      setWearingId(null);
    }
  };

  // 삭제
  const handleDelete = async (clothId: string) => {
    try {
      await axios.delete(`${BASE_URL}/api/delete-cloth/${encodeURIComponent(clothId)}`);
      setDeleteModalId(null);
      setClothes(prev => prev.filter(c => c.id !== clothId));
      setClosetBlocks(prev => prev.map(b => ({
        ...b,
        items: (b.items ?? 0) - (clothes.some(c => c.id === clothId && (c.location ?? '').trim() === (b.name ?? '').trim()) ? 1 : 0)
      })));
      setClothingCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      Alert.alert("삭제 실패", err?.message || "삭제에 실패했습니다.");
    }
  };

  // 시즌 우선 정렬: 선택 시즌 > 상시/간절기 > 반대 시즌
  const sortedClothes = useMemo(() => {
    const score = (it: ClothItem) => {
      const s = getItemSeason(it.category);
      if (s === season) return 2;
      if (s === "all" || s === "mid") return 1;
      return 0;
    };
    return [...clothes].sort((a, b) => score(b) - score(a));
  }, [clothes, season]);

  // 공통 헤더 — 크기/여백 기존 그대로. 우측에 시즌 토글 아이콘만 덧댐(absolute)
  const renderUserBox = () => (
    <View style={styles.userBox}>
      <Text style={styles.sectionTitle}>{userName}의 옷장</Text>
      <Text style={styles.sectionDesc}>총 {clothingCount}개의 아이템이 있습니다.</Text>

      <TouchableOpacity
        onPress={() => setSeason(prev => (prev === "summer" ? "winter" : "summer"))}
        style={styles.seasonToggleBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="시즌 토글"
      >
        <Image
          source={season === "summer" ? sunIcon : snowIcon}
          style={styles.seasonToggleIcon}
        />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: ClothItem }) => (
    <View style={styles.card}>
      {/* Info 아이콘 (이미지 우상단) */}
      <TouchableOpacity
        style={styles.infoIconBox}
        onPress={() => setInfoModalId(item.id)}
        hitSlop={{ top:10, bottom:10, left:10, right:10 }}
      >
        <Image source={infoIcon} style={styles.infoIcon} />
      </TouchableOpacity>

      <Image source={{ uri: item.image_url }} style={styles.image} />

      <View style={styles.infoBox}>
        {/* 이름 + 삭제 아이콘 */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.name}>{item.cloth_name}</Text>
          <TouchableOpacity onPress={() => setDeleteModalId(item.id)}>
            <Image source={deleteIcon} style={styles.deleteIcon} />
          </TouchableOpacity>
        </View>

        <Text style={styles.category}>{item.category || "카테고리 없음"}</Text>

        {/* 버튼들 */}
        <View style={styles.actionsCol}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPrimary, styles.stackGap]}
            onPress={() => handleWear(item)}
            disabled={wearingId === item.id}
          >
            {wearingId === item.id
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.actionPrimaryText}>착용</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionOutline]}
            onPress={() => navigation.navigate('Coordinate', { seedClothId: item.id })}
          >
            <Text style={styles.actionOutlineText}>✔️  코디 제안</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 삭제 확인 모달 */}
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

      {/* 상세/수정 모달 */}
      <Modal visible={infoModalId === item.id} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setInfoModalId(null)}>
          <View style={styles.infoModalBox}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>상세 정보</Text>
            <Text>이름: {item.cloth_name}</Text>
            <Text>카테고리: {item.category || '-'}</Text>
            <Text>보관 위치: {item.location || '-'}</Text>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                setInfoModalId(null);
                navigation.navigate("EditCloth", { clothId: item.id });
              }}
            >
              <Text style={{ color: "#37955F", fontSize: 15, fontWeight: "bold" }}>수정하기</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 상단 바 */}
      <View style={styles.logoRow}>
        <TouchableOpacity onPress={() => navigation.navigate("Settings")} style={styles.iconBtn}>
          <Image source={require("../../assets/icons/settings.png")} style={styles.settingsIcon} />
        </TouchableOpacity>

        <Image source={require("../../assets/images/clotidy1.png")} style={styles.logo} />

        {/* 오른쪽: 검색 + 구매 (각자 사이즈 조절) */}
        <View style={styles.rightTray}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Search")}
            style={styles.searchBtnBox}
          >
            <Image
              source={require("../../assets/icons/search_resized.png")}
              style={styles.searchGlyph}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Buy")}
            style={styles.buyBtnBox}
          >
            <Image
              source={require("../../assets/icons/buy.png")}
              style={{ width: BUY_GLYPH, height: BUY_GLYPH, resizeMode: "contain" }}
            />
          </TouchableOpacity>

        </View>
      </View>

      {/* 탭 전환 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setActiveTab("closet")}>
          <Text style={[styles.tab, activeTab === "closet" && styles.activeTab]}>옷장</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab("list")}>
          <Text style={[styles.tab, activeTab === "list" && styles.activeTab]}>리스트</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "closet" ? (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
          {renderUserBox()}

          <View style={[styles.gridAbsoluteBox, { width: gridWidth, height: rowCount * cellSize }]}>
            {[...Array(colCount + 1)].map((_, colIdx) => (
              <View key={`vline-${colIdx}`} style={{
                position: "absolute", left: colIdx * cellSize, top: 0, width: 1, height: rowCount * cellSize,
                backgroundColor: "#6AC892", zIndex: 1,
              }} />
            ))}
            {[...Array(rowCount + 1)].map((_, rowIdx) => (
              <View key={`hline-${rowIdx}`} style={{
                position: "absolute", top: rowIdx * cellSize, left: 0, width: colCount * cellSize, height: 1,
                backgroundColor: "#BBB", zIndex: 1,
              }} />
            ))}

            {closetBlocks.map((block, i) => {
              if (!block.coords?.length) return null;
              const { top, left, width, height } = getBlockRect(block);
              return (
                <View
                  key={`block-${i}-${block.name}`}
                  style={{
                    position: 'absolute', top, left, width, height,
                    backgroundColor: "#52b788", borderColor: "#286E46", borderWidth: 2, borderRadius: 18, zIndex: 10
                  }}
                >
                  <TouchableOpacity
                    onPress={() => navigation.navigate('BlockClothesList', { location: block.name })}
                    style={{ position: "absolute", left: 12, top: 12 }}
                  >
                    <Text style={styles.gridText}>{block.name}</Text>
                    <Text style={styles.gridSubText}>총 {block.items || 0}개의 아이템</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={sortedClothes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          // 헤더에 "OO의 옷장" — 여백/패딩 변경 없이 동일
          ListHeaderComponent={renderUserBox}
        />
      )}

      {/* 하단 탭바 */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Image source={require("../../assets/icons/home.png")} style={[styles.tabIcon, styles.homeIcon]} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Alarm")}>
          <Image source={require("../../assets/icons/bell.png")} style={[styles.tabIcon, styles.homeIcon]} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate({ name: 'RegisterCloth', params: { imageUri: "" } })}>
          <Image source={require("../../assets/icons/camera.png")} style={[styles.tabIcon, styles.homeIcon]} />
        </TouchableOpacity>

        {/* 상황별 코디 추천 진입 */}
        <TouchableOpacity onPress={() => navigation.navigate("Coordinate", { situationName: "데일리" })}>
          <Image source={require("../../assets/icons/hanger.png")} style={styles.tabIcon} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Calendar")}>
          <Image source={require("../../assets/icons/daily.png")} style={styles.tabIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BG = "#FFFEFA";
const GREEN = "#6AC892";
const GREEN_DARK = "#37955F";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // 상단 바
  logoRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 45, marginBottom: 5, paddingHorizontal: 16,
  },
  iconBtn: { padding: 6 },
  settingsIcon: { width: 40, height: 40, resizeMode: "contain" },
  logo: { width: 126, height: 30, resizeMode: "contain", left: 30 },

  // 오른쪽 아이콘 트레이 + 각 버튼
  rightTray: { flexDirection: "row", alignItems: "center" },

  searchBtnBox: {
    width: SEARCH_BOX,
    height: SEARCH_BOX,
    alignItems: "center",
    justifyContent: "center",
  },
  searchGlyph: {
    width: SEARCH_GLYPH,
    height: SEARCH_GLYPH,
    resizeMode: "contain",
    transform: [{ scale: 1.25 }],
  },

  buyBtnBox: {
    width: BUY_BOX,
    height: BUY_BOX,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: RIGHT_ICON_GAP,
  },

  // 탭
  tabContainer: { flexDirection: "row", justifyContent: "center", marginBottom: 10 },
  tab: { marginHorizontal: 20, fontSize: 16, color: "#777" },
  activeTab: { color: GREEN, fontWeight: "bold", borderBottomWidth: 2, borderColor: GREEN },

  // 좌우 패딩 컨텍스트
  scrollContent: { paddingHorizontal: 20 },

  // "OO의 옷장" — 기존 크기 그대로
  userBox: {
    borderWidth: 1, borderColor: GREEN, borderRadius: 12,
    padding: 15, marginBottom: 20, backgroundColor: BG
  },
  sectionTitle: { fontSize: 16, color: "#37955F", fontWeight: "bold" },
  sectionDesc: { color: "#555", marginTop: 5 },

  // 시즌 토글 버튼(레이아웃 영향 없도록 absolute)
  seasonToggleBtn: {
    position: "absolute", right: 12, top: 12, padding: 4
  },
  seasonToggleIcon: {
    width: 22, height: 22, resizeMode: "contain"
  },

  gridAbsoluteBox: { position: 'relative', alignSelf: 'center', marginTop: 10 },
  gridText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  gridSubText: { color: "#fff", fontSize: 12, marginTop: 4 },

  tabBar: {
    flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, borderTopWidth: 1, borderColor: "#ddd",
    backgroundColor: BG, position: "absolute", bottom: 0, width: "100%"
  },
  tabIcon: { width: 35, height: 35 },
  homeIcon: { width: 40, height: 40 },

  // 카드/리스트
  card: {
    width: '48%', margin: '1%', backgroundColor: BG, borderRadius: 14, overflow: 'hidden',
    borderWidth: 0, borderColor: 'transparent', elevation: 0,
    marginBottom: 20,
  },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#F3F3F3', borderRadius: 12 },

  // 인포/삭제
  infoIconBox: { position: "absolute", top: 8, right: 8, zIndex: 2 },
  infoIcon: { width: 22, height: 22, tintColor: "#222" },
  deleteIcon: { width: 20, height: 20, marginLeft: 8, tintColor: "#222" },

  infoBox: { padding: 10, minHeight: 110, justifyContent: "space-between" },
  name: { fontWeight: "bold", fontSize: 14, color: "#222", marginBottom: 1 },
  category: { color: "#666", fontWeight: "bold", fontSize: 13 },

  // 버튼 스택
  actionsCol: { marginTop: 10 },
  actionBtn: { height: 35, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  stackGap: { marginBottom: 6 },
  actionPrimary: { backgroundColor: GREEN, borderColor: GREEN },
  actionPrimaryText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  actionOutline: { backgroundColor: BG, borderColor: GREEN },
  actionOutlineText: { color: GREEN_DARK, fontWeight: "bold", fontSize: 13 },

  // 모달
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 260, shadowColor: '#000', shadowOpacity: 0.11, shadowRadius: 16, elevation: 7 },
  modalBtnGray: { paddingVertical: 8, paddingHorizontal: 18, backgroundColor: "#eee", borderRadius: 8, marginRight: 10 },
  modalBtnRed: { paddingVertical: 8, paddingHorizontal: 18, backgroundColor: "#D74B4B", borderRadius: 8 },
  infoModalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 28, width: 270, alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.11, shadowRadius: 16, elevation: 8 },
  editBtn: { marginTop: 16, backgroundColor: "#F5FFFA", borderRadius: 8, paddingHorizontal: 22, paddingVertical: 8, alignSelf: 'stretch', alignItems: 'center', borderWidth: 1, borderColor: GREEN_DARK },
});

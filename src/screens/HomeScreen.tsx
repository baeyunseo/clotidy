// src/screens/HomeScreen.tsx

import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar, Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import auth from "@react-native-firebase/auth";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

// BlockType 정의
type BlockType = {
  name: string;
  coords: { x: number; y: number }[];
  items?: number;
};

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<"closet" | "list">("closet");
  const [userName, setUserName] = useState("사용자");
  const [closetBlocks, setClosetBlocks] = useState<BlockType[]>([]);
  const [clothingCount, setClothingCount] = useState(0);
  const [rowCount, setRowCount] = useState(4);
  const [colCount, setColCount] = useState(3);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const gridWidth = Dimensions.get("window").width - 40;
  const cellSize = gridWidth / colCount;

 useEffect(() => {
  const fetchUserData = async () => {
    try {
      const uid = auth().currentUser?.uid;
      if (!uid) return;

      // ✅ 1. 유저 이름 가져오기
      const userRes = await fetch(`http://13.211.132.164:5000/api/user/${uid}`);
      if (!userRes.ok) throw new Error('유저 정보 조회 실패');
      const userData = await userRes.json();
      if (userData.name) setUserName(userData.name);

      // ✅ 2. 옷장 레이아웃 가져오기
      const closetRes = await fetch(`http://13.211.132.164:5000/api/closet-layout/${uid}`);
      if (!closetRes.ok) throw new Error('옷장 정보 조회 실패');
      const closetData = await closetRes.json();

      // ✅ 3. 옷 데이터 가져오기
      const clothesRes = await fetch(`http://13.211.132.164:5000/api/get-clothes/${uid}`);
      const clothesData = await clothesRes.json();

      console.log("받아온 closetData:", closetData);
      console.log("받아온 옷 데이터:", clothesData);

      // ✅ 4. 옷장 블록에 아이템 수 반영
      if (
        closetData.closet_layout &&
        Array.isArray(closetData.closet_layout) &&
        closetData.closet_layout.length > 0
      ) {
        const updatedBlocks = closetData.closet_layout.map((block: BlockType) => {
          const itemsInBlock = clothesData.filter(
            (cloth: any) => cloth.location === block.name
          );
          return {
            ...block,
            items: itemsInBlock.length,
          };
        });

        setClosetBlocks(updatedBlocks);

        // ✅ 5. 전체 아이템 수 합산
        const total = updatedBlocks.reduce((sum, block) => sum + (block.items || 0), 0);
        setClothingCount(total);

        // ✅ 6. 레이아웃 크기 설정
        if (closetData.layout_type) {
          const [cols, rows] = closetData.layout_type.split("x").map(Number);
          setColCount(cols || 3);
          setRowCount(rows || 4);
        } else {
          let maxX = 0, maxY = 0;
          updatedBlocks.forEach((block: BlockType) => {
            block.coords.forEach(({ x, y }) => {
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            });
          });
          setRowCount(maxX + 1);
          setColCount(maxY + 1);
        }
      } else {
        setClosetBlocks([]);
        setClothingCount(0);
        setRowCount(4);
        setColCount(3);
        console.warn("closet_layout이 없습니다. closetData:", closetData);
      }
    } catch (err) {
      console.error("오류 발생:", err);
    }
  };

  fetchUserData();
}, []);

  // 블록 위치, 크기 계산
  const getBlockRect = (block: BlockType) => {
    if (!block.coords || block.coords.length === 0) return {
      top: 0, left: 0, width: cellSize, height: cellSize, minRow: 0, minCol: 0
    };

    const rows = block.coords.map(c => c.x);
    const cols = block.coords.map(c => c.y);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    return {
      // row(행)는 x, col(열)는 y
      top: (rowCount - maxRow - 1) * cellSize,
      left: minCol * cellSize,
      width: (maxCol - minCol + 1) * cellSize,
      height: (maxRow - minRow + 1) * cellSize,
      minRow,
      minCol,
    };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Image source={require("../../assets/images/clotidy1.png")} style={styles.logo} />

      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setActiveTab("closet")}>
          <Text style={[styles.tab, activeTab === "closet" && styles.activeTab]}>옷장</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab("list")}>
          <Text style={[styles.tab, activeTab === "list" && styles.activeTab]}>리스트</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
        <View style={styles.userBox}>
          <Text style={styles.sectionTitle}>{userName}의 옷장</Text>
          <Text style={styles.sectionDesc}>총 {clothingCount}개의 아이템이 있습니다.</Text>
        </View>

        {/* 블록형 옷장 */}
        <View style={[styles.gridAbsoluteBox, { width: gridWidth, height: rowCount * cellSize }]}>
          {/* 1. 기본 그리드 배경 */}
          {Array.from({ length: rowCount }).map((_, rowIdx) =>
            Array.from({ length: colCount }).map((_, colIdx) => (
              <View
                key={`cell-${rowIdx}-${colIdx}`}
                style={{
                  position: 'absolute',
                  top: rowIdx * cellSize,
                  left: colIdx * cellSize,
                  width: cellSize,
                  height: cellSize,
                  borderWidth: 1,
                  borderColor: "#bbb",
                  backgroundColor: "#FFFEFA",
                }}
              />
            ))
          )}

          {/* 2. 블록 렌더링 */}
          {closetBlocks.map((block, i) => {
            const { top, left, width, height } = getBlockRect(block);

            if (!block.coords || block.coords.length === 0) {
              // 블록 데이터에 coords가 비어있는 경우 스킵
              return null;
            }

            return (
              <View
                key={`block-${i}-${block.name}`}
                style={{
                  position: 'absolute',
                  top, left, width, height,
                  backgroundColor: "#52b788",
                  borderColor: "#286E46",
                  borderWidth: 2,
                  borderRadius: 18,
                  zIndex: 10,
                  overflow: 'hidden',
                }}
              >
                <TouchableOpacity
                  onPress={() => navigation.navigate('BlockClothesList', { location: block.name })}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <Text style={styles.gridText}>{block.name}</Text>
                  <Text style={styles.gridSubText}>총 {block.items || 0}개의 아이템</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* 탭바 */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Image source={require("../../assets/icons/home.png")} style={styles.tabIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Closet")}>
          <Image source={require("../../assets/icons/hanger.png")} style={styles.tabIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Alarm")}>
          <Image source={require("../../assets/icons/bell.png")} style={styles.tabIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Choice',  { imageUri: '' } )}>
          <Image source={require("../../assets/icons/camera.png")} style={styles.tabIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFEFA" },
  header: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginTop: 50, marginBottom: 10 },
  tabContainer: { flexDirection: "row", justifyContent: "center", marginBottom: 10 },
  tab: { marginHorizontal: 20, fontSize: 16, color: "#777" },
  activeTab: { color: "#6AC892", fontWeight: "bold", borderBottomWidth: 2, borderColor: "#6AC892" },
  scrollContent: { paddingHorizontal: 20 },
  userBox: { borderWidth: 1, borderColor: "#6AC892", borderRadius: 12, padding: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 16, color: "#37955F", fontWeight: "bold" },
  sectionDesc: { color: "#555", marginTop: 5 },
  gridAbsoluteBox: { position: 'relative', alignSelf: 'center', marginTop: 10 },
  gridText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  gridSubText: { color: "#fff", fontSize: 12, marginTop: 4 },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#FFFEFA",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  tabIcon: { width: 24, height: 24 },
  logo: {
    width: 126,
    height: 30,
    resizeMode: "contain",
    alignSelf: "center",
    marginTop: 50,
    marginBottom: 10,
  },
});
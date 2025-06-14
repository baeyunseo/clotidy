// src/screens/HomeScreen.tsx

import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar, Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import auth from "@react-native-firebase/auth";
import { db } from "../lib/firebaseConfig";
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

  // 셀 크기 계산 (화면에 맞게 자동 계산)
  const gridWidth = Dimensions.get("window").width - 40; // padding 감안
  const cellSize = gridWidth / colCount;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const uid = auth().currentUser?.uid;
        if (!uid) return;
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (userData?.name) setUserName(userData.name);

        if (userData?.closet_layout && Array.isArray(userData.closet_layout)) {
          setClosetBlocks(userData.closet_layout);

          const total = userData.closet_layout.reduce(
            (sum, block) => sum + (block.items || 0), 0
          ) ?? 0;
          setClothingCount(total);

          if (userData.layout_type) {
            const [cols, rows] = userData.layout_type.split("x").map(Number);
            setColCount(cols || 3);
            setRowCount(rows || 4);
          } else {
            let maxX = 0, maxY = 0;
            userData.closet_layout.forEach(block => {
              block.coords.forEach(({ x, y }: { x: number; y: number }) => {
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
              });
            });
            setRowCount(maxX + 1);
            setColCount(maxY + 1);
          }
        }
      } catch (err) {
        console.error("오류 발생:", err);
      }
    };

    fetchUserData();
  }, []);

  // 블록 위치, 크기 계산 (x: 행, y: 열 기준)
  const getBlockRect = (block: BlockType) => {
    const rows = block.coords.map(c => c.x);
    const cols = block.coords.map(c => c.y);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    return {
      top: (rowCount - maxRow - 1) * cellSize,
      left: minCol * cellSize,
      width: (maxCol - minCol + 1) * cellSize,
      height: (maxRow - minRow + 1) * cellSize,
      minRow,
      minCol,
    };
  };

  // 블록 좌상단 찾기 (x,y 모두 최소)
  const getBlockTopLeft = (block: BlockType) => {
    return block.coords.reduce((min, coord) =>
      coord.x < min.x || (coord.x === min.x && coord.y < min.y)
        ? coord : min, block.coords[0]
    );
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

        {/* 새로운 블록형 옷장 */}
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

          {/* 2. 블록을 겹쳐서 렌더링 */}
          {closetBlocks.map((block, i) => {
            const { top, left, width, height } = getBlockRect(block);
            const topLeft = getBlockTopLeft(block);

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
                {/* 이름/개수 좌상단에 */}
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
        <TouchableOpacity onPress={() => navigation.navigate("Home" as never)}>
          <Image source={require("../../assets/icons/home.png")} style={styles.tabIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Closet" as never)}>
          <Image source={require("../../assets/icons/hanger.png")} style={styles.tabIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Alarm" as never)}>
          <Image source={require("../../assets/icons/bell.png")} style={styles.tabIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("RegisterCloth" as never)}>
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
  logo:{
  width: 126,
  height: 30,
  resizeMode: "contain",
  alignSelf: "center",
  marginTop: 50,
  marginBottom: 10,
},

});
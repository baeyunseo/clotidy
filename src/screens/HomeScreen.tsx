import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar, Dimensions, FlatList,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import auth from "@react-native-firebase/auth";
import axios from "axios";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

const BASE_URL = "http://54.79.167.144:5000";

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<"closet" | "list">("closet");
  const [userName, setUserName] = useState("사용자");
  const [closetBlocks, setClosetBlocks] = useState<any[]>([]);
  const [clothes, setClothes] = useState<any[]>([]);
  const [clothingCount, setClothingCount] = useState(0);
  const [rowCount, setRowCount] = useState(4);
  const [colCount, setColCount] = useState(3);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const gridWidth = Dimensions.get("window").width - 40;
  const cellSize = gridWidth / colCount;

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
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
          const clothesData = clothesRes.data;

          if (userData.name) setUserName(userData.name);

          const updatedBlocks = closetData.closet_layout.map((block: any) => {
            const itemCount = clothesData.filter((item: any) =>
              (item.location ?? '').trim() === (block.name ?? '').trim()
            ).length;
            return { ...block, items: itemCount };
          });

          setClosetBlocks(updatedBlocks);
          setClothes(clothesData);
          setClothingCount(clothesData.length);

          if (closetData.layout_type) {
            const [cols, rows] = closetData.layout_type.split("x").map(Number);
            setColCount(cols || 3);
            setRowCount(rows || 4);
          }
        } catch (err) {
          console.error("오류 발생:", err);
        }
      };

      fetchUserData();
    }, [])
  );

  const getBlockRect = (block: any) => {
    if (!block.coords || block.coords.length === 0) return {
      top: 0, left: 0, width: cellSize, height: cellSize
    };

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
    };
  };

  const getImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${BASE_URL}/${url.replace(/^\//, '')}`;
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Image source={{ uri: getImageUrl(item.image_url) }} style={styles.image} />
      <View style={styles.infoBox}>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{item.cloth_name}</Text>
          <TouchableOpacity style={styles.coordiBtn}>
            <Text style={styles.coordiText}>코디 제안</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.meta}>마지막 착용일 : {item.last_worn_date || '0000.00.00'}</Text>
        <Text style={styles.meta}>등록일 : <Text style={styles.date}>{item.created_at || '0000.00.00'}</Text></Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.logoRow}>
        <Image source={require("../../assets/images/clotidy1.png")} style={styles.logo} />
        <TouchableOpacity onPress={() => navigation.navigate("Search")}> 
          <Image source={require("../../assets/icons/search_resized.png")} style={styles.searchIcon} />
        </TouchableOpacity>
      </View>

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
          <View style={styles.userBox}>
            <Text style={styles.sectionTitle}>{userName}의 옷장</Text>
            <Text style={styles.sectionDesc}>총 {clothingCount}개의 아이템이 있습니다.</Text>
          </View>
          <View style={[styles.gridAbsoluteBox, { width: gridWidth, height: rowCount * cellSize }]}>
            {closetBlocks.map((block, i) => {
              const { top, left, width, height } = getBlockRect(block);
              if (!block.coords?.length) return null;
              return (
                <View
                  key={`block-${i}-${block.name}`}
                  style={{ position: 'absolute', top, left, width, height, backgroundColor: "#52b788", borderColor: "#286E46", borderWidth: 2, borderRadius: 18, zIndex: 10 }}
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
          data={clothes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        />
      )}

      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}> 
          <Image source={require("../../assets/icons/home.png")} style={styles.tabIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Alarm")}> 
          <Image source={require("../../assets/icons/bell.png")} style={styles.tabIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate({ name: 'RegisterCloth', params: { imageUri: "" } })}>
          <Image source={require("../../assets/icons/camera.png")} style={styles.tabIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Settings")}> 
          <Image source={require("../../assets/icons/settings.png")} style={styles.tabIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFEFA" },
  logoRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 45, marginBottom: 5 },
  logo: { width: 126, height: 30, left: 30, resizeMode: "contain" },
  searchIcon: { width: 60, height: 60, left: 90 },
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
  tabBar: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, borderTopWidth: 1, borderColor: "#ddd", backgroundColor: "#FFFEFA", position: "absolute", bottom: 0, width: "100%" },
  tabIcon: { width: 24, height: 24 },
  card: { width: '48%', margin: '1%', backgroundColor: '#fff', borderRadius: 8 },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#EAEAEA', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  infoBox: { padding: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "bold", fontSize: 14, color: "#222" },
  coordiBtn: { borderWidth: 1, borderColor: "#aaa", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  coordiText: { fontSize: 10, color: "#444" },
  meta: { fontSize: 11, color: "#666", marginTop: 2 },
  date: { fontWeight: "bold", color: "#222" }
});

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

const BASE_URL = "http://54.79.167.144:5000";

function getImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${BASE_URL}/${imageUrl.replace(/^\//, "")}`;
}

export default function ListScreen() {
  const [activeTab, setActiveTab] = useState("closet");
  const navigation = useNavigation();
  const [clothes, setClothes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("사용자");
  const [clothingCount, setClothingCount] = useState(0);

  useEffect(() => {
    const fetchClothes = async () => {
      setLoading(true);
      try {
        const uid = auth().currentUser?.uid;
        if (!uid) throw new Error("로그인이 필요합니다.");

        const [userRes, clothesRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/user/${uid}`),
          axios.get(`${BASE_URL}/api/get-clothes/${uid}`)
        ]);

        const userData = userRes.data;
        if (userData.name) setUserName(userData.name);

        const filtered = (clothesRes.data || []).map((item) => ({
          id: item.id,
          clothName: item.cloth_name ?? "",
          category: item.category ?? "",
          location: item.location ?? "",
          imageUrl: item.image_url ?? "",
          lastWornDate: item.last_worn_date ?? "0000.00.00",
          createdAt: item.created_at ?? "0000.00.00",
        }));

        setClothes(filtered);
        setClothingCount(filtered.length);
      } catch (err) {
        console.log("\u274C \uc5d0\ub7ec:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClothes();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.image} />
      <View style={styles.infoBox}>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{item.clothName}</Text>
          <TouchableOpacity style={styles.coordiBtn}>
            <Text style={styles.coordiText}>\ucee4\ub514 \uc81c\uc548</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.meta}>\ub9c8\uc9c0\ub9c9 \cc28\uc6a9\uc77c : {item.lastWornDate}</Text>
        <Text style={styles.meta}>\ub4f1\ub85d\uc77c : <Text style={styles.date}>{item.createdAt}</Text></Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>\ub514\uc9c0\ud138 \uc637\uc7a5</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Image source={require('../../assets/icons/search_resized.png')} style={styles.searchIcon} />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryBox}>
        <Text style={styles.sectionTitle}>{userName}의 옷장</Text>
        <Text style={styles.sectionDesc}>총 {clothingCount}개의 아이템이 있습니다.</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6AC892" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={clothes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
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
  container: { flex: 1, backgroundColor: "#FFFEFA", paddingTop: 40 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 8,
  },
  backArrow: { fontSize: 26, color: "#333" },
  topTitle: { fontSize: 18, fontWeight: "bold", color: "#333", left: 20 },
  searchIcon: { width: 60, height: 60 },
  tabBar: {
    flexDirection: "row", justifyContent: "space-around", paddingVertical: 12,
    borderTopWidth: 1, borderColor: "#ddd", backgroundColor: "#FFFEFA",
    position: "absolute", bottom: 0, width: "100%", zIndex: 999, elevation: 10,
  },
  tabIcon: { width: 24, height: 24 },
  categoryBox: {
    borderWidth: 1, borderColor: "#6AC892", marginHorizontal: 20, borderRadius: 10,
    padding: 12, marginBottom: 20,
  },
  sectionTitle: { fontWeight: "bold", fontSize: 16, color: "#37955F", marginBottom: 4 },
  sectionDesc: { fontSize: 14, color: "#555" },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  card: { width: '48%', margin: '1%', backgroundColor: '#fff' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#EAEAEA', borderRadius: 8 },
  infoBox: { paddingTop: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "bold", fontSize: 14, color: "#222" },
  coordiBtn: {
    borderWidth: 1, borderColor: "#aaa", borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  coordiText: { fontSize: 10, color: "#444" },
  meta: { fontSize: 11, color: "#666", marginTop: 2 },
  date: { fontWeight: "bold", color: "#222" },
});

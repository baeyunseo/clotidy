// src/screens/HomeScreen.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Image,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../libfirebase";



export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<"closet" | "list">("closet");
  const [userName, setUserName] = useState("사용자");
  const [clothingCount, setClothingCount] = useState(0);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (userData?.name) {
          setUserName(userData.name);
        }
      } catch (err) {
        console.error("오류 발생:", err);
      }
    };

    fetchUserName();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.header}>디지털 옷장</Text>

      {/* タブ */}
      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setActiveTab("closet")}>
          <Text style={[styles.tab, activeTab === "closet" && styles.activeTab]}>옷장</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab("list")}>
          <Text style={[styles.tab, activeTab === "list" && styles.activeTab]}>리스트</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
        {/* ユーザーセクション */}
        <View style={styles.userBox}>
          <Text style={styles.sectionTitle}>{userName}의 옷장</Text>
          <Text style={styles.sectionDesc}>총 {clothingCount}개의 아이템이 있습니다.</Text>
        </View>

        {/* グリッド外枠（仮表示） */}
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <View style={styles.blockLarge}>
              <Text style={styles.gridText}>행거</Text>
              <Text style={styles.gridSubText}>총 5개의 아이템</Text>
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.blockSmall, { flex: 0.7 }]}>
              <Text style={styles.gridText}>서랍</Text>
              <Text style={styles.gridSubText}>총 1개의 아이템</Text>
            </View>
            <View style={[styles.blockSmall, { flex: 0.3 }]}>
              <Text style={styles.gridText}>양말칸</Text>
              <Text style={styles.gridSubText}>총 1개의 아이템</Text>
            </View>
          </View>
        </View>
      </ScrollView>


      

       {/* ナビゲーションバー */}
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
        <TouchableOpacity onPress={() => navigation.navigate("Camera" as never)}>
          <Image source={require("../../assets/icons/camera.png")} style={styles.tabIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fefef6" },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 50,
    marginBottom: 10,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  tab: {
    marginHorizontal: 20,
    fontSize: 16,
    color: "#777",
  },
  activeTab: {
    color: "#2a9d8f",
    fontWeight: "bold",
    borderBottomWidth: 2,
    borderColor: "#2a9d8f",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  userBox: {
    borderWidth: 1,
    borderColor: "#2a9d8f",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#2a9d8f",
    fontWeight: "bold",
  },
  sectionDesc: {
    color: "#555",
    marginTop: 5,
  },
  gridContainer: {
    borderWidth: 1,
    borderColor: "#2a9d8f",
    borderRadius: 16,
    backgroundColor: "#fefef6",
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  blockLarge: {
    flex: 1,
    height: 100,
    borderWidth: 1,
    borderColor: "#777",
    backgroundColor: "#52b788",
    borderRadius: 12,
    padding: 12,
    justifyContent: "center",
  },
  blockSmall: {
    flex: 8,
    height: 100,
    borderWidth: 1,
    borderColor: "#777",
    backgroundColor: "#52b788",
    borderRadius: 12,
    padding: 12,
    marginTop: 100,
    justifyContent: "center",
  },
  gridText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  gridSubText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fffde8",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelText: {
    color: "red",
    fontSize: 16,
  },
  confirmText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fefef6",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
});

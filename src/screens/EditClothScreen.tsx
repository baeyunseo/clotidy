// src/screens/EditClothScreen.tsx
// 옷 상세 정보 수정 화면

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import axios from "axios";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

const BASE_URL = "http://54.79.167.144:5000";

type Cloth = {
  id: string;
  cloth_name?: string; // 서버 응답 키
  name?: string;       // 혹시 name으로 올 수도 있으니 대비
  category: string;
  location: string;
  image_url?: string;
};

export default function EditClothScreen() {
  // 네비 / 라우트 타입 안전
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "EditCloth">>();
  const clothId = route.params.clothId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloth, setCloth] = useState<Cloth | null>(null);
  const [loadError, setLoadError] = useState(false); // 상세 로드 실패 여부

  // 폼 상태
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formLocation, setFormLocation] = useState("");

  const imageUrl = useMemo(() => {
    const raw = cloth?.image_url || "";
    if (!raw) return "";
    return raw.startsWith("http") ? raw : `${BASE_URL}/${raw.replace(/^\//, "")}`;
  }, [cloth?.image_url]);

  const fetchDetail = async () => {
    if (!clothId) {
      Alert.alert("오류", "잘못된 접근입니다.");
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      // 서버 느림 대비 타임아웃
      const res = await axios.get(`${BASE_URL}/api/get-cloth/${clothId}`, { timeout: 5000 });
      const data: Cloth = res.data;
      setCloth(data);

      const initialName = data.cloth_name || data.name || "";
      setFormName(initialName);
      setFormCategory(data.category || "");
      setFormLocation(data.location || "");
      setLoadError(false);
    } catch (e: any) {
      console.error("❌ get-cloth 실패:", e?.response?.status, e?.message);
      setLoadError(true); // 화면은 유지
      Alert.alert("안내", "상세 정보를 불러오지 못했습니다. 값 수정은 가능합니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clothId]);

  const handleSave = async () => {
    const name = formName.trim();
    const category = formCategory.trim();
    const location = formLocation.trim();

    if (!name || !category || !location) {
      Alert.alert("입력 확인", "이름, 카테고리, 보관 위치를 모두 입력하세요.");
      return;
    }

    try {
      setSaving(true);
      // 서버 라우트는 PATCH 이므로 PATCH 사용
      await axios.patch(`${BASE_URL}/api/update-cloth/${clothId}`, {
        cloth_name: name, // 서버가 기대하는 키
        category,
        location,
      });

      Alert.alert("완료", "수정되었습니다.");
      navigation.goBack(); // 목록으로 복귀 (목록에서 focus 시 재조회 권장)
    } catch (e: any) {
      console.error("❌ update-cloth 실패:", e?.response?.status, e?.message);
      Alert.alert("수정 실패", e?.response?.data?.message || "잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#6AC892" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.header}>상세 정보 수정</Text>

      {loadError && (
        <Text style={styles.warn}>
          서버에서 상세를 불러오지 못했어요. 아래 값 편집 후 저장을 시도해 보세요.
        </Text>
      )}

      {!!imageUrl && <Image source={{ uri: imageUrl }} style={styles.image} />}

      {/* 이름 */}
      <Text style={styles.label}>이름</Text>
      <View style={styles.inputBox}>
        <TextInput
          value={formName}
          onChangeText={setFormName}
          placeholder="예: 검정 가방"
          style={styles.input}
        />
      </View>

      {/* 카테고리 */}
      <Text style={styles.label}>카테고리</Text>
      <View style={styles.inputBox}>
        <TextInput
          value={formCategory}
          onChangeText={setFormCategory}
          placeholder="예: handbag / blouse"
          style={styles.input}
        />
      </View>

      {/* 보관 위치 */}
      <Text style={styles.label}>보관 위치</Text>
      <View style={styles.inputBox}>
        <TextInput
          value={formLocation}
          onChangeText={setFormLocation}
          placeholder="예: 상의 / 서랍1 / 행거"
          style={styles.input}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? "저장 중..." : "저장"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFEFA",
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#286E46",
    marginBottom: 16,
    textAlign: "center",
  },
  warn: {
    color: "#E04848",
    marginBottom: 8,
    textAlign: "center",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
    marginBottom: 6,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  input: { fontSize: 15, color: "#222" },
  saveBtn: {
    marginTop: 22,
    backgroundColor: "#37955F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
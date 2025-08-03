// RegisterClothScreen.tsx
// 옷 등록 화면 - 카테고리, 보관위치 모두 드롭다운(팝업+리스트) 방식 + 오른쪽 ▼ 화살표 + 사진 테두리

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  ScrollView, StyleSheet, Alert, Modal, FlatList
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import axios from 'axios';

const BASE_URL = 'http://54.79.167.144:5000';

const korToEngFineCategory: { [kor: string]: string } = {
  "백팩": "backpack", "핸드백": "handbag",
  "벨트": "belt", "양말": "socks", "선글라스": "sunglasses",
  "블레이저": "blazer", "가디건": "cardigan", "코트": "coat", "자켓": "jacket",
  "블라우스": "blouse", "나시": "sleeveless top", "스웨터": "sweater", "맨투맨": "sweatshirt", "티셔츠": "tshirt",
  "부츠": "boots", "플랫슈즈": "flats", "하이힐": "heels", "로퍼": "loafers", "운동화": "sneakers",
  "원피스": "dress",
  "귀걸이": "earrings", "목걸이": "necklace",
  "모자": "hat",
  "청바지": "jeans", "긴바지": "pants", "반바지": "shorts", "치마": "skirt", "추리닝 바지": "sweatpants"
};

const styleMap: { [kor: string]: string } = {
  "캐주얼": "casual",
  "격식": "formal",
  "데일리": "daily",
  "운동복": "sporty",
  "데이트": "romantic",
  "미니멀": "minimal",
};

export default function RegisterClothScreen({ navigation }: any) {
  const [imageUri, setImageUri] = useState('');
  const [clothName, setClothName] = useState('');
  const [location, setLocation] = useState('');
  const [blockList, setBlockList] = useState<string[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [fineCategoryKor, setFineCategoryKor] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const styleOptions = Object.keys(styleMap);
  const fullFineList = Object.keys(korToEngFineCategory);

  const pickImage = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo' });
    if (res.didCancel || !res.assets?.[0]?.uri) return;
    setImageUri(res.assets[0].uri);
  };

  useEffect(() => {
    const fetchBlocks = async () => {
      const uid = auth().currentUser?.uid;
      if (!uid) return;
      try {
        const res = await axios.get(`${BASE_URL}/api/closet-layout/${uid}`);
        setBlockList(res.data?.closet_layout?.map((b: any) => b.name) || []);
      } catch {
        Alert.alert("블록 불러오기 실패", "옷장 구성을 먼저 완료하세요.");
      }
    };
    fetchBlocks();
  }, []);

  const handleAnalyze = async () => {
    if (!imageUri) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg'
      } as any);

      const res = await axios.post(`${BASE_URL}/api/analyze-category`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const eng = res.data?.category;
      const kor = Object.keys(korToEngFineCategory).find(k => korToEngFineCategory[k] === eng);
      setFineCategoryKor(kor || '');
      Alert.alert("분석 완료", kor ? `${kor} (AI 예측)` : "알 수 없음");
    } catch {
      Alert.alert("AI 분석 실패", "서버 오류 또는 잘못된 이미지입니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRegister = async () => {
    try {
      const uid = auth().currentUser?.uid;
      if (!uid || !imageUri || !clothName || !location || !fineCategoryKor || selectedStyles.length === 0)
        throw new Error('모든 필드를 입력하세요.');

      const formData = new FormData();
      formData.append('userId', uid);
      formData.append('clothName', clothName);
      formData.append('category', korToEngFineCategory[fineCategoryKor]);
      formData.append('location', location);
      formData.append('styleType', JSON.stringify(selectedStyles.map(k => styleMap[k])));
      formData.append('file', {
        uri: imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg'
      } as any);

      await axios.post(`${BASE_URL}/api/register-cloth`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Alert.alert("등록 완료");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("등록 실패", e.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>옷 등록</Text>

      <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
        {imageUri
          ? <Image source={{ uri: imageUri }} style={styles.img} />
          : <Text style={{ color: '#aaa' }}>사진 선택</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} disabled={!imageUri || analyzing}>
        <Text style={{ color: '#fff' }}>{analyzing ? '분석 중...' : 'AI 자동 분류'}</Text>
      </TouchableOpacity>

      <TextInput value={clothName} onChangeText={setClothName} style={styles.input} placeholder="옷 이름" />

      <Text style={styles.label}>보관 위치</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowLocationModal(true)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: location ? '#222' : '#aaa' }}>{location || '보관 위치 선택'}</Text>
          <Text style={styles.downArrow}>▼</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={showLocationModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowLocationModal(false)} activeOpacity={1}>
          <View style={styles.modalContent}>
            <TextInput
              value={locationSearch}
              onChangeText={setLocationSearch}
              placeholder="보관 위치 검색"
              style={styles.modalInput}
              autoFocus
            />
            <FlatList
              data={blockList.filter(k => k.includes(locationSearch))}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setLocation(item); setShowLocationModal(false); }} style={styles.modalItem}>
                  <Text style={{ fontSize: 16 }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Text style={styles.label}>카테고리</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowCatModal(true)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: fineCategoryKor ? '#222' : '#aaa' }}>{fineCategoryKor || '카테고리 선택 (AI 분석됨)'}</Text>
          <Text style={styles.downArrow}>▼</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={showCatModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCatModal(false)} activeOpacity={1}>
          <View style={styles.modalContent}>
            <TextInput
              value={catSearch}
              onChangeText={setCatSearch}
              placeholder="카테고리 검색"
              style={styles.modalInput}
              autoFocus
            />
            <FlatList
              data={fullFineList.filter(k => k.includes(catSearch))}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setFineCategoryKor(item); setShowCatModal(false); }} style={styles.modalItem}>
                  <Text style={{ fontSize: 16 }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Text style={styles.label}>스타일</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {styleOptions.map(style => (
          <TouchableOpacity key={style} onPress={() => setSelectedStyles(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style])}
            style={[styles.tag, selectedStyles.includes(style) && styles.tagSelected]}>
            <Text style={selectedStyles.includes(style) ? styles.tagTextSelected : styles.tagText}>{style}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submit} onPress={handleRegister}>
        <Text style={styles.submitText}>+ 등록</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#286E46' },
  uploadBox: {
    height: 180,
    backgroundColor: '#f3f3f3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1.5,             // ★ 테두리 추가
    borderColor: '#6AC892',       // ★ 테두리 컬러
  },
  img: { width: 160, height: 160, borderRadius: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 },
  downArrow: { fontSize: 18, color: '#bbb', marginLeft: 8 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 4, color: '#444' },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', marginRight: 8, marginBottom: 8 },
  tagSelected: { backgroundColor: '#6AC892', borderColor: '#6AC892' },
  tagText: { fontSize: 14, color: '#333' },
  tagTextSelected: { fontSize: 14, color: '#fff' },
  analyzeBtn: { backgroundColor: '#37955F', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  submit: { backgroundColor: '#37955F', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 280, maxHeight: '70%', backgroundColor: '#fff', borderRadius: 10, padding: 16 },
  modalInput: { padding: 10, borderRadius: 8, backgroundColor: '#F6F6F8', marginBottom: 10 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
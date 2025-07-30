// src/screens/RegisterClothScreen.tsx
// 옷 등록 화면

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Image, StyleSheet, Alert, ScrollView,
  ActivityIndicator, TouchableOpacity, Modal, FlatList
} from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import RNFS from 'react-native-fs';

// --- 대분류 & 세부 분류 한글/영어 매핑 ---
const semanticCategories = [
  { kor: "가방", eng: "bags" },
  { kor: "액세서리", eng: "accessories" },
  { kor: "아우터", eng: "outerwear" },
  { kor: "상의", eng: "tops" },
  { kor: "신발", eng: "shoes" },
  { kor: "원피스", eng: "all-body" },
  { kor: "쥬얼리", eng: "jewellery" },
  { kor: "모자", eng: "hats" },
  { kor: "하의", eng: "bottoms" },
];

const fineCategoryList: { [semantic: string]: { kor: string, eng: string }[] } = {
  "bags": [
    { kor: "백팩", eng: "backpack" }, { kor: "핸드백", eng: "handbag" }
  ],
  "accessories": [
    { kor: "벨트", eng: "belt" }, { kor: "양말", eng: "socks" }, { kor: "선글라스", eng: "sunglasses" }
  ],
  "outerwear": [
    { kor: "블레이저", eng: "blazer" }, { kor: "가디건", eng: "cardigan" }, { kor: "코트", eng: "coat" }, { kor: "자켓", eng: "jacket" }
  ],
  "tops": [
    { kor: "블라우스", eng: "blouse" }, { kor: "나시", eng: "sleeveless top" }, { kor: "스웨터", eng: "sweater" }, { kor: "맨투맨", eng: "sweatshirt" }, { kor: "티셔츠", eng: "tshirt" }
  ],
  "shoes": [
    { kor: "부츠", eng: "boots" }, { kor: "플랫슈즈", eng: "flats" }, { kor: "하이힐", eng: "heels" }, { kor: "로퍼", eng: "loafers" }, { kor: "운동화", eng: "sneakers" }
  ],
  "all-body": [
    { kor: "원피스", eng: "dress" }
  ],
  "jewellery": [
    { kor: "귀걸이", eng: "earrings" }, { kor: "목걸이", eng: "necklace" }
  ],
  "hats": [
    { kor: "모자", eng: "hat" }
  ],
  "bottoms": [
    { kor: "청바지", eng: "jeans" }, { kor: "긴바지", eng: "pants" }, { kor: "반바지", eng: "shorts" }, { kor: "치마", eng: "skirt" }, { kor: "추리닝 바지", eng: "sweatpants" }
  ],
};

const korToEngFineCategory = Object.fromEntries(
  Object.values(fineCategoryList)
    .flat()
    .map(item => [item.kor, item.eng])
);

// --- DropDown(공용, 검색 지원) ---
const DropDown = ({
  value, list, placeholder, onSelect, searchable = false
}: { value: string, list: string[], placeholder: string, onSelect: (v: string) => void, searchable?: boolean }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [query, setQuery] = useState('');
  const filteredList = searchable
    ? list.filter(item => item.includes(query))
    : list;
  const buttonRef = useRef<View>(null);
  const [dropdownWidth, setDropdownWidth] = useState(220);

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        style={[styles.input, styles.dropdown, { flexDirection: 'row', alignItems: 'center' }]}
        onPress={() => {
          buttonRef.current?.measure((fx, fy, width, height, px, py) => {
            setDropdownWidth(width);
            setModalVisible(true);
          });
        }}
        activeOpacity={0.9}
      >
        <Text style={{ color: value ? '#222' : '#aaa', flex: 1 }}>{value || placeholder}</Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, { width: dropdownWidth, minWidth: 170, maxWidth: 350 }]}>
            {searchable &&
              <TextInput
                style={{ paddingHorizontal: 16, paddingVertical: 8, fontSize: 15, borderWidth: 0, marginBottom: 6, backgroundColor: '#F6F6F8', borderRadius: 8 }}
                placeholder="검색"
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
            }
            <FlatList
              data={filteredList}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                    setQuery('');
                  }}>
                  <Text style={{ fontSize: 16 }}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ padding: 14, color: '#aaa', textAlign: 'center' }}>검색 결과 없음</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default function RegisterClothScreen({ navigation }: any) {
  const [imageUri, setImageUri] = useState<string>('');
  const [clothName, setClothName] = useState('');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [blockList, setBlockList] = useState<string[]>([]);

  // 스타일
  const styleOptions = ["캐주얼", "격식", "데일리", "운동복", "데이트", "미니멀"];
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // 카테고리 상태
  const [semanticCategoryKor, setSemanticCategoryKor] = useState('');
  const [fineCategoryKor, setFineCategoryKor] = useState('');
  const [showFineModal, setShowFineModal] = useState(false);
  const [fineSearch, setFineSearch] = useState('');

  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchBlockList = async () => {
      const userId = auth().currentUser?.uid;
      if (!userId) return;
      try {
        const res = await fetch(`http://54.79.167.144:5000/api/closet-layout/${userId}`);
        if (!res.ok) throw new Error('블록 정보 조회 실패');
        const data = await res.json();
        setBlockList(data.closet_layout?.map((block: any) => block.name) || []);
      } catch (e) {
        setBlockList([]);
        Alert.alert("블록 정보 조회 실패", "옷장 구성을 먼저 완료하세요.");
      }
    };
    fetchBlockList();
  }, []);

  // ---- 사진, 스타일, 분석 등 기존과 동일 ----
  const handleSelectPhoto = () => {
    Alert.alert('사진 선택', '', [
      { text: '카메라', onPress: () => pickImage('camera') },
      { text: '갤러리', onPress: () => pickImage('gallery') },
      { text: '취소', onPress: () => {}, style: 'cancel' }
    ]);
  };

  const handleContentUri = async (uri: string): Promise<string> => {
    if (!uri.startsWith('content://')) return uri;
    const destPath = `${RNFS.TemporaryDirectoryPath}/photo_${Date.now()}.jpg`;
    try {
      await RNFS.copyFile(uri, destPath);
      const exists = await RNFS.exists(destPath);
      if (!exists) throw new Error('복사 실패');
      return 'file://' + destPath;
    } catch (e) {
      Alert.alert('이미지 복사 오류', '사진 파일을 읽을 수 없습니다.');
      throw e;
    }
  };

  const pickImage = async (type: 'camera' | 'gallery') => {
    const res: ImagePickerResponse = await (type === 'camera' ? launchCamera : launchImageLibrary)({ mediaType: 'photo' });
    if (res.didCancel) return;
    if (res.errorCode) {
      Alert.alert('이미지 선택 오류', res.errorMessage || '알 수 없는 오류');
      return;
    }
    if (res.assets && res.assets.length > 0) {
      let uri = res.assets[0].uri || '';
      if (uri.startsWith('content://')) {
        try {
          uri = await handleContentUri(uri);
        } catch (e) {
          return;
        }
      }
      setImageUri(uri);
    }
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style)
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  // ---- 카테고리 분석 시 자동 입력 지원 ----
  const handleAnalyze = async () => {
    try {
      if (!imageUri) throw new Error('사진을 먼저 선택해 주세요');
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: 'cloth.jpg',
        type: 'image/jpeg',
      } as any);

      const resp = await axios.post('http://54.79.167.144:5000/api/analyze-category', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      let fineKor = Object.keys(korToEngFineCategory).find(
        key => korToEngFineCategory[key] === resp.data.category
      ) || '';
      let semanticKor = '';
      for (const semantic of Object.keys(fineCategoryList)) {
        if (fineCategoryList[semantic].some(item => item.eng === resp.data.category)) {
          semanticKor = semanticCategories.find(s => s.eng === semantic)?.kor || '';
          break;
        }
      }
      setSemanticCategoryKor(semanticKor);
      setFineCategoryKor(fineKor);
      Alert.alert("AI 분석 완료", `카테고리: ${fineKor || resp.data.category || "분석 실패"}`);
    } catch (e: any) {
      Alert.alert('AI 분석 실패', e.response?.data?.error || e.message || '서버 오류');
    } finally {
      setAnalyzing(false);
    }
  };

  // ---- 등록 API ----
  const styleMap: { [kor: string]: string } = {
    "캐주얼": "casual",
    "격식": "formal",
    "데일리": "daily",
    "운동복": "sporty",
    "데이트": "romantic",
    "미니멀": "minimal",
  };

  const handleRegister = async () => {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) throw new Error('로그인 필요');
      if (!imageUri) throw new Error('사진 없음');
      if (!clothName || !location) throw new Error('필수 정보 누락');
      if (!fineCategoryKor) throw new Error('카테고리를 선택해 주세요');
      if (selectedStyles.length === 0) throw new Error('스타일을 한 개 이상 선택해 주세요');
      setUploading(true);

      const mappedStyles = selectedStyles.map(kor => styleMap[kor]).filter(Boolean);
      const categoryEng = korToEngFineCategory[fineCategoryKor];

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('clothName', clothName);
      formData.append('category', categoryEng); // 영어로 저장!
      formData.append('location', location);
      formData.append('styleType', mappedStyles.join(','));
      formData.append('file', {
        uri: imageUri,
        name: 'cloth.jpg',
        type: 'image/jpeg',
      } as any);

      const resp = await axios.post('http://54.79.167.144:5000/api/register-cloth', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert('등록 완료', resp.data?.message || '');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('등록 실패', e.response?.data?.error || e.message || '서버 오류');
    } finally {
      setUploading(false);
    }
  };

  // ---- 세부 분류 드롭다운 관련 ----
  const fineListForSelectedSemantic = semanticCategoryKor
    ? fineCategoryList[
        semanticCategories.find(s => s.kor === semanticCategoryKor)?.eng || ''
      ] || []
    : [];

  const filteredFineList = fineSearch
    ? fineListForSelectedSemantic.filter(item => item.kor.includes(fineSearch))
    : fineListForSelectedSemantic;

  // 팝업 열 때마다 검색어 초기화, 전체 리스트 뜨게
  const openFineModal = () => {
    setFineSearch('');
    setShowFineModal(true);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFEFA' }}>
      <View style={styles.container}>
        <Text style={styles.title}>옷 등록</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={handleSelectPhoto}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.img} />
          ) : (
            <Text style={{ color: '#aaa' }}>사진 올리기 (카메라/갤러리)</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.analyzeBtn}
          onPress={handleAnalyze}
          disabled={!imageUri || analyzing}
        >
          <Text style={{ color: '#fff', fontSize: 16 }}>{analyzing ? 'AI 자동 분류 중...' : 'AI 자동 분류'}</Text>
        </TouchableOpacity>

        <DropDown value={location} list={blockList} placeholder="보관 공간 선택" onSelect={setLocation} />
        <TextInput value={clothName} onChangeText={setClothName} style={styles.input} placeholder="옷 이름" />

        {/* 카테고리: 대분류 → 세부분류 */}
        <Text style={styles.label}>카테고리 선택</Text>
        <DropDown
          value={semanticCategoryKor}
          list={semanticCategories.map(item => item.kor)}
          placeholder="대분류 (예: 아우터, 신발)"
          onSelect={kor => {
            setSemanticCategoryKor(kor);
            setFineCategoryKor('');
            setFineSearch('');
          }}
        />

        {/* 세부 분류(검색 가능한 팝업, 대분류 선택 후만 활성) */}
        <TouchableOpacity
          style={[
            styles.input,
            styles.dropdown,
            { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
            !semanticCategoryKor && { backgroundColor: '#f1f1f1' }
          ]}
          onPress={semanticCategoryKor ? openFineModal : undefined}
          disabled={!semanticCategoryKor}
        >
          <Text style={{ color: fineCategoryKor ? '#222' : '#aaa', flex: 1 }}>
            {fineCategoryKor || (semanticCategoryKor ? '세부 분류 선택 (검색 가능)' : '먼저 대분류를 선택하세요')}
          </Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>
        <Modal visible={showFineModal} transparent animationType="fade" onRequestClose={() => setShowFineModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFineModal(false)}>
            <View style={[styles.modalContent, { minWidth: 170, maxWidth: 350, width: 260 }]}>
              <TextInput
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  fontSize: 15,
                  borderWidth: 0,
                  marginBottom: 6,
                  backgroundColor: '#F6F6F8',
                  borderRadius: 8,
                }}
                placeholder="세부 분류 검색"
                value={fineSearch}
                onChangeText={setFineSearch}
                autoFocus
              />
              <FlatList
                data={filteredFineList}
                keyExtractor={item => item.kor}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setFineCategoryKor(item.kor);
                      setShowFineModal(false);
                      setFineSearch('');
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{item.kor}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ padding: 14, color: '#aaa', textAlign: 'center' }}>검색 결과 없음</Text>
                }
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <Text style={styles.label}>스타일 선택</Text>
        <View style={styles.styleWrap}>
          {styleOptions.map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.styleBtn,
                selectedStyles.includes(option) && { backgroundColor: "#37955F" }
              ]}
              onPress={() => toggleStyle(option)}
            >
              <Text style={[
                styles.styleBtnText,
                selectedStyles.includes(option) && { color: "#fff", fontWeight: "bold" }
              ]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={uploading}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{uploading ? '등록 중...' : '+  등록'}</Text>
        </TouchableOpacity>
        {uploading && <ActivityIndicator size="large" color="#37955F" />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFFEFA' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#37955F', marginVertical: 14, textAlign: 'center' },
  uploadBox: {
    borderWidth: 1, borderColor: '#37955F', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    height: 170, marginBottom: 12, backgroundColor: "#FAFAFA"
  },
  img: { width: 170, height: 170, borderRadius: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 8, fontSize: 16 },
  dropdown: { paddingRight: 36, height: 44, justifyContent: 'center', marginVertical: 8 },
  dropdownIcon: { position: 'absolute', right: 14, color: '#888', fontSize: 18, top: '50%', marginTop: -8 },
  analyzeBtn: { backgroundColor: "#37955F", paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginVertical: 8, marginBottom: 10, elevation: 1 },
  button: { backgroundColor: '#37955F', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 14, marginBottom: 10, width: 120, alignSelf: 'flex-end' },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 14, color: "#222", marginBottom: 4 },
  styleWrap: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 6 },
  styleBtn: {
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 10,
    marginTop: 3,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#d5d5d5"
  },
  styleBtnText: { fontSize: 15, color: "#222" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.12)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 10, minWidth: 170, maxWidth: 350, paddingVertical: 4, alignSelf: 'center' },
  modalItem: { paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
});
// src/screens/RegisterClothScreen.tsx
// 옷 등록 화면

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Image, StyleSheet, Alert, ScrollView,
  ActivityIndicator, TouchableOpacity
} from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import RNFS from 'react-native-fs';

// DropDown (공통 선택형 팝업)
const DropDown = ({
  value, list, placeholder, onSelect
}: { value: string, list: string[], placeholder: string, onSelect: (v: string) => void }) => (
  <TouchableOpacity
    style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
    onPress={() => {
      Alert.alert(
        placeholder, '',
        [
          ...list.map(v => ({ text: v, onPress: () => onSelect(v) })),
          { text: '취소', onPress: () => {}, style: 'cancel' }
        ]
      );
    }}>
    <Text style={{ color: value ? '#222' : '#aaa' }}>{value || placeholder}</Text>
    <Text style={{ color: '#888' }}>▼</Text>
  </TouchableOpacity>
);

export default function RegisterClothScreen({ navigation }: any) {
  const [imageUri, setImageUri] = useState<string>('');
  const [clothName, setClothName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [blockList, setBlockList] = useState<string[]>([]);

  // ⭐ 스타일(중복 선택형)
  const styleOptions = ["캐주얼", "격식", "데일리", "운동복", "데이트", "기타"];
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // 1. 서버에서 블록(보관공간) 리스트 조회
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

  // 사진 선택 팝업
  const handleSelectPhoto = () => {
    Alert.alert('사진 선택', '', [
      { text: '카메라', onPress: () => pickImage('camera') },
      { text: '갤러리', onPress: () => pickImage('gallery') },
      { text: '취소', onPress: () => {}, style: 'cancel' }
    ]);
  };

  // content uri 처리 함수
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

  // 이미지 가져오기
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

  // ⭐ 스타일 중복 선택 함수
  const toggleStyle = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style)
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  // 등록 API (FormData로 전송)
  const handleRegister = async () => {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) throw new Error('로그인 필요');
      if (!imageUri) throw new Error('사진 없음');
      if (!clothName || !location) throw new Error('필수 정보 누락');
      if (selectedStyles.length === 0) throw new Error('스타일을 한 개 이상 선택해 주세요');
      setUploading(true);

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('clothName', clothName);
      formData.append('category', category);
      formData.append('location', location);
      // ⭐ 스타일 여러 개를 배열/문자열로 서버에 전달
      formData.append('styleType', selectedStyles.join(',')); // 서버가 배열도 받으면 그냥 selectedStyles 넘겨도 됨
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
        <DropDown value={location} list={blockList} placeholder="보관 공간 선택" onSelect={setLocation} />
        <TextInput value={clothName} onChangeText={setClothName} style={styles.input} placeholder="옷 이름" />
        <TextInput
          value={category}
          onChangeText={setCategory}
          style={styles.input}
          placeholder="카테고리 (예: 상의, 하의, 신발 등)"
        />

        {/* ⭐ 스타일(중복 선택) UI */}
        <Text style={styles.label}>스타일 선택</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 10 }}>
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
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{uploading ? '등록 중...' : '+ 등록'}</Text>
        </TouchableOpacity>
        {uploading && <ActivityIndicator size="large" color="#37955F" />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFFEFA' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#37955F', marginVertical: 16, textAlign: 'center' },
  uploadBox: { borderWidth: 1, borderColor: '#37955F', borderRadius: 10, justifyContent: 'center', alignItems: 'center', height: 180, marginBottom: 18 },
  img: { width: 180, height: 180, borderRadius: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 8, fontSize: 16 },
  button: { backgroundColor: '#37955F', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24, elevation: 2 },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 16, color: "#222" },
  styleBtn: {
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#d5d5d5"
  },
  styleBtnText: { fontSize: 15, color: "#222" },
});
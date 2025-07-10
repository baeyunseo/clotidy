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
        console.log('📦 closet_layout:', data.closet_layout);
      } catch (e) {
        setBlockList([]);
        Alert.alert("블록 정보 조회 실패", "옷장 구성을 먼저 완료하세요.");
        console.log('❌ closet_layout fetch error:', e);
      }
    };
    fetchBlockList();
  }, []);

  // 2. 사진 선택 팝업
  const handleSelectPhoto = () => {
    Alert.alert('사진 선택', '', [
      { text: '카메라', onPress: () => pickImage('camera') },
      { text: '갤러리', onPress: () => pickImage('gallery') },
      { text: '취소', onPress: () => {}, style: 'cancel' }
    ]);
  };

   // 👇👇👇 추가된 content uri 처리 함수
  const handleContentUri = async (uri: string): Promise<string> => {
  if (!uri.startsWith('content://')) return uri;
  const destPath = `${RNFS.TemporaryDirectoryPath}/photo_${Date.now()}.jpg`; // <-- 슬래시(/) 추가!
  try {
    await RNFS.copyFile(uri, destPath);
    const exists = await RNFS.exists(destPath);
    console.log('복사 성공?', exists, destPath);
    if (!exists) throw new Error('복사 실패');
    // 파일 크기도 확인
    const stat = await RNFS.stat(destPath);
    console.log('복사된 파일 크기:', stat.size);
    return 'file://' + destPath;
  } catch (e) {
    console.log('❌ 파일 복사 실패:', e);
    Alert.alert('이미지 복사 오류', '사진 파일을 읽을 수 없습니다.');
    throw e;
  }
};


// 3. 이미지 가져오기 (여기만 확실히 고침!!)
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
      console.log('📸 이미지 URI:', uri);
    }
  };

  // 4. 등록 API (FormData로 전송)
  const handleRegister = async () => {
    try {
      const userId = auth().currentUser?.uid;
      console.log('🔑 userId:', userId);
      console.log('📦 clothName:', clothName);
      console.log('📦 category:', category);
      console.log('📦 location:', location);
      console.log('📦 imageUri:', imageUri);

      if (!userId) throw new Error('로그인 필요');
      if (!imageUri) throw new Error('사진 없음');
      if (!clothName || !category || !location) throw new Error('필수 정보 누락');
      setUploading(true);

      // FormData로 전송, key는 반드시 'file'
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('clothName', clothName);
      formData.append('category', category);
      formData.append('location', location);
      formData.append('file', {
        uri: imageUri,
        name: 'cloth.jpg',
        type: 'image/jpeg',
      } as any);

      // FormData 내부 내용 로그 (확인용)
      // RN FormData에는 ._parts가 있음 (디버깅용, 배포 전 삭제 가능)
      if ((formData as any)._parts) {
        for (const pair of (formData as any)._parts) {
          console.log('📝 FormData:', pair[0], pair[1]);
        }
      }

      // POST 요청
      console.log('🚀 API 요청 전송 시작');
      const resp = await axios.post('http://54.79.167.144:5000/api/register-cloth', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('✅ 서버 응답:', resp.data);

      Alert.alert('등록 완료', resp.data?.message || '');
      navigation.goBack();
    } catch (e: any) {
      // 서버에서 오는 에러 메시지 콘솔 확인
      console.log('❌ 등록 실패:', e.response?.data || e);
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
  button: { backgroundColor: '#37955F', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24, elevation: 2 }
});
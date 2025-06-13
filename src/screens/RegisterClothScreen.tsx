// src/screens/RegisterClothScreen.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types'; // 본인 타입 경로로 맞춰주세요
import { useNavigation } from '@react-navigation/native';


export default function RegisterClothScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'RegisterCloth'>>();

  
  const [imageUri, setImageUri] = useState('');
  const [clothName, setClothName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);

  // 1. 사진 선택
  const handleSelectPhoto = () => {
    Alert.alert('사진 선택', '', [
      { text: '카메라', onPress: () => pickImage('camera') },
      { text: '갤러리', onPress: () => pickImage('gallery') },
      { text: '취소', style: 'cancel' }
    ]);
  };

  // 2. 이미지 가져오기
  const pickImage = async (type: 'camera' | 'gallery') => {
    const res = await (type === 'camera' ? launchCamera : launchImageLibrary)({ mediaType: 'photo' });
    if (res.assets && res.assets.length > 0) {
      setImageUri(res.assets[0].uri!);
      handleUpload(res.assets[0]);
    }
  };

  // 3. 업로드 & AI 분류 요청
  const handleUpload = async (asset: any) => {
    setUploading(true);
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) throw new Error('로그인 필요');

      // 파일 → formData (multipart)
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'cloth.jpg',
        type: asset.type || 'image/jpeg'
      });

      // AI 분류 & 임시 업로드 API 호출 (백엔드 라우터에 맞게 url 수정!)
      const { data } = await axios.post('http://192.168.35.179:5000/api/upload-and-predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 분류 결과 받아서 자동 입력 (원하면 state명 맞게 수정)
      setCategory(data.category || '');
      setClothName(data.clothName || '');
      setLocation(data.location || '');
    } catch (e: any) {
      Alert.alert('업로드/분류 실패', e.message);
    } finally {
      setUploading(false);
    }
  };

  // 4. 정보 수정 후 → 최종 등록
  const handleRegister = async () => {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) throw new Error('로그인 필요');
      if (!imageUri) throw new Error('사진 없음');

      // 백엔드에 옷 정보 등록 요청 (명세서에 맞게 url/body 수정!)
      await axios.post('http://192.168.35.179:5000/api/register-cloth', {
        userId,
        clothName,
        category,
        location,
        imagePath: imageUri // 실제로는 서버에 업로드된 경로여야 함
      });
      Alert.alert('등록 완료');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('등록 실패', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.uploadBox} onPress={handleSelectPhoto}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.img} />
        ) : (
          <Text style={{ color: '#aaa' }}>사진 올리기 (카메라/갤러리)</Text>
        )}
      </TouchableOpacity>
      {uploading && <ActivityIndicator size="large" color="#37955F" />}
      <TextInput value={clothName} onChangeText={setClothName} style={styles.input} placeholder="이름" />
      <TextInput value={category} onChangeText={setCategory} style={styles.input} placeholder="카테고리" />
      <TextInput value={location} onChangeText={setLocation} style={styles.input} placeholder="위치/블록" />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={{ color: '#fff' }}>등록</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  uploadBox: {
    borderWidth: 1, borderColor: '#37955F', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', height: 180, marginBottom: 24
  },
  img: { width: 180, height: 180, borderRadius: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 8 },
  button: { backgroundColor: '#37955F', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
});

// src/screens/ChoiceScreen.tsx
// AI 분류 여부 확인 화면

import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image,
  findNodeHandle, UIManager
} from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Choice'>;

export default function ChoiceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const scrollRef = useRef<ScrollView>(null);
  const photoRef = useRef<typeof TouchableOpacity>(null);
  const [imageUri, setImageUri] = useState<string>('');

  const handleConfirm = async () => {
    if (!imageUri) {
      Alert.alert('이미지를 먼저 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const categoryRes = await axios.post('http://13.211.132.164:5000/category', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const colorRes = await axios.post('http://13.211.132.164:8000/extract-colors/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const category = categoryRes.data?.category || '';
      const colorName = colorRes.data?.color_name || '';
      
      navigation.navigate('Confirm', {
        imageUri,
        category,
        colorName
      });

    } catch (error) {
      console.error('AI 추론 실패:', error);
      Alert.alert('AI 분석 실패', '서버 오류 또는 이미지 문제입니다.');
    }
  };

  const handleSelectPhoto = () => {
    Alert.alert('사진 선택', '', [
      { text: '카메라', onPress: () => pickImage('camera') },
      { text: '갤러리', onPress: () => pickImage('gallery') },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const pickImage = async (type: 'camera' | 'gallery') => {
    const res: ImagePickerResponse = await (type === 'camera' ? launchCamera : launchImageLibrary)({ mediaType: 'photo' });

    if (res.didCancel) return;
    if (res.errorCode) {
      Alert.alert('이미지 선택 오류', res.errorMessage || '알 수 없는 오류');
      return;
    }

    if (res.assets && res.assets.length > 0) {
      setImageUri(res.assets[0].uri || '');
    }
  };

  return (
    <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: '#fefef6' }}>
      <View style={styles.container}>
        <View style={styles.messageBox}>
          <Text style={styles.title}>AI 분류</Text>
          <Text style={styles.message}>
            AI 분류 시스템을 이용하시겠습니까?{"\n"}(취소 시 사용자 직접 등록)
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.navigate('RegisterCloth')}
            >
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 사진 등록 영역 */}
        <TouchableOpacity ref={photoRef} style={styles.uploadBox} onPress={handleSelectPhoto}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: 180, height: 180, borderRadius: 10 }} />
          ) : (
            <Text style={{ color: '#aaa' }}>사진 올리기 (카메라/갤러리)</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  messageBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    elevation: 3,
  },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 10 },
  message: { marginBottom: 20, fontSize: 14, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 12, alignItems: 'center' },
  confirmButton: {
    flex: 1, padding: 12, alignItems: 'center',
    borderLeftWidth: 1, borderColor: '#ddd'
  },
  cancelText: { color: 'red', fontWeight: 'bold' },
  confirmText: { fontWeight: 'bold' },
  uploadBox: {
    height: 180, borderWidth: 1, borderColor: '#ccc',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center'
  }
});
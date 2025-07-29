// src/screens/ChoiceScreen.tsx
// AI 분류 여부 확인 화면
// AI 분류 여부 확인 화면

import React, { useRef, useState, useEffect } from 'react';
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

  // ✅ 画面マウント時にアラート表示
  useEffect(() => {
    Alert.alert(
      'AI 분류 안내',
      'AI 분류 시스템을 이용하시겠습니까?\n(취소 시 사용자 직접 등록)',
      [
        {
          text: '취소',
          style: 'cancel',
          onPress: () => navigation.navigate('RegisterCloth'),
        },
        {
          text: '확인',
          onPress: () => {
            // 아무 동작 없음
          },
        },
      ],
      { cancelable: false }
    );
  }, []);

  // ✅ AI分析とConfirm画面への遷移
  const handleConfirm = async (uri: string) => {
    if (!uri) {
      Alert.alert('이미지를 먼저 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', {
      uri,
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
        imageUri: uri,
        category,
        colorName,
      });

    } catch (error) {
      console.error('AI 추론 실패:', error);
      Alert.alert('AI 분석 실패', '서버 오류 또는 이미지 문제입니다.');
    }
  };

  // ✅ 写真選択ハンドラー（選んだ瞬間に AI 呼び出し）
  const pickImage = async (type: 'camera' | 'gallery') => {
    const res: ImagePickerResponse = await (type === 'camera' ? launchCamera : launchImageLibrary)({
      mediaType: 'photo',
    });

    if (res.didCancel) return;
    if (res.errorCode) {
      Alert.alert('이미지 선택 오류', res.errorMessage || '알 수 없는 오류');
      return;
    }

    if (res.assets && res.assets.length > 0) {
      const uri = res.assets[0].uri || '';
      setImageUri(uri);
      handleConfirm(uri); // ✅ すぐAIへ送信してConfirmへ
    }
  };

  // ✅ カメラ/ギャラリー選択UI
  const handleSelectPhoto = () => {
    Alert.alert('사진 선택', '', [
      { text: '카메라', onPress: () => pickImage('camera') },
      { text: '갤러리', onPress: () => pickImage('gallery') },
      { text: '취소', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: '#fefef6' }}>
      <View style={styles.container}>
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
  uploadBox: {
    height: 180,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

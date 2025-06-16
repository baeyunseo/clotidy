import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Image, StyleSheet, Alert, ScrollView,
  ActivityIndicator, TouchableOpacity, Platform
} from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import RNFS from 'react-native-fs';

const BASE_URL = 'http://3.24.109.93:5000';

type DropDownProps = {
  value: string;
  list: string[];
  placeholder: string;
  onSelect: (v: string) => void;
};

const DropDown = ({ value, list, placeholder, onSelect }: DropDownProps) => (
  <TouchableOpacity
    style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
    onPress={() => {
      Alert.alert(
        placeholder, '',
        [
          ...list.map((v: string) => ({ text: v, onPress: () => onSelect(v) })),
          { text: '취소', onPress: () => {}, style: 'cancel' }
        ]
      );
    }}>
    <Text style={{ color: value ? '#222' : '#aaa' }}>{value || placeholder}</Text>
    <Text style={{ color: '#888' }}>▼</Text>
  </TouchableOpacity>
);

type NavigationProp = {
  goBack: () => void;
};

export default function RegisterClothScreen({ navigation }: { navigation: NavigationProp }) {
  const [imageUri, setImageUri] = useState<string>('');
  const [imageType, setImageType] = useState<string>('image/jpeg');
  const [imageName, setImageName] = useState<string>('cloth.jpg');
  const [clothName, setClothName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [blockList, setBlockList] = useState<string[]>([]);

  useEffect(() => {
    const fetchBlockList = async () => {
      const userId = auth().currentUser?.uid;
      if (!userId) return;
      try {
        const res = await fetch(`${BASE_URL}/api/closet-layout/${userId}`);
        if (!res.ok) throw new Error('블록 정보 조회 실패');
        const data = await res.json();
        setBlockList((data.closet_layout?.map((block: any) => block.name) as string[]) || []);
      } catch (e) {
        setBlockList([]);
        Alert.alert("블록 정보 조회 실패", "옷장 구성을 먼저 완료하세요.");
      }
    };
    fetchBlockList();
  }, []);

  const handleSelectPhoto = () => {
    Alert.alert('사진 선택', '', [
      { text: '카메라', onPress: () => pickImage('camera') },
      { text: '갤러리', onPress: () => pickImage('gallery') },
      { text: '취소', onPress: () => {}, style: 'cancel' }
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
      let { uri, type: mimeType, fileName } = res.assets[0];
      if (!uri) {
        Alert.alert('이미지 오류', '이미지 경로를 가져올 수 없습니다.');
        return;
      }
      if (Platform.OS === 'android' && uri.startsWith('content://')) {
        try {
          const destPath = `${RNFS.CachesDirectoryPath}/cloth_${Date.now()}.jpg`;
          await RNFS.copyFile(uri, destPath);
          uri = destPath;
          mimeType = 'image/jpeg';
          fileName = `cloth_${Date.now()}.jpg`;
        } catch (e) {
          Alert.alert('이미지 복사 실패', 'Android에서 이미지 파일 변환에 실패했습니다.');
          return;
        }
      }
      setImageUri(uri);
      setImageType(mimeType || 'image/jpeg');
      setImageName(fileName || `cloth_${Date.now()}.jpg`);
    }
  };

  const handleRegister = async () => {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) throw new Error('로그인 필요');
      if (!imageUri) throw new Error('사진 없음');
      if (!clothName || !location) throw new Error('필수 정보 누락');
      setUploading(true);

      // file:// prefix 제거
      const fileUri = imageUri.startsWith('file://') ? imageUri.replace('file://', '') : imageUri;

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('clothName', clothName);
      formData.append('location', location);
      formData.append('file', {
        uri: fileUri,
        type: imageType,
        name: imageName,
      });

      // 반드시 prefix 제거된 fileUri만 출력
      console.log('폼데이터 fileUri:', fileUri, 'type:', imageType, 'name:', imageName);

      const resp = await axios.post(`${BASE_URL}/api/register-cloth`, formData);

      Alert.alert('등록 완료', resp.data?.message || '등록 성공!');
      navigation.goBack();
    } catch (e: unknown) {
      if (e instanceof Error) {
        Alert.alert('등록 실패', (e as any).response?.data?.error || e.message || '서버 오류');
      } else {
        Alert.alert('등록 실패', '알 수 없는 오류');
      }
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

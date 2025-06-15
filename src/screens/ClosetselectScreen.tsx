// src/screens/ClosetSelectScreen.tsx - 옷장 선택 화면

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import auth from '@react-native-firebase/auth';

const closetOptions = [
  {
    id: 'basic',
    name: '기본',
    layout_type: '3x4',
    rows: 4,
    cols: 3,
    image: require('../../assets/images/3x4closet.png'),
  },
  {
    id: 'medium',
    name: '중형',
    layout_type: '3x5',
    rows: 5,
    cols: 3,
    image: require('../../assets/images/3x5closet.png'),
  },
  {
    id: 'large',
    name: '대형',
    layout_type: '4x5',
    rows: 5,
    cols: 4,
    image: require('../../assets/images/4x5closet.png'),
  },
];

export default function ClosetSelectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selected, setSelected] = useState('medium');
  const [saving, setSaving] = useState(false);

  // ...생략...

const handleSubmit = async () => {
  const selectedOption = closetOptions.find((c) => c.id === selected);
  if (!selectedOption) return;

  setSaving(true);

  try {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('로그인 정보 없음', '로그인 후 다시 시도하세요.');
      setSaving(false);
      return;
    }

    // ✅ 요청 구조에 맞게 key명과 중첩 구조 수정
    const res = await fetch('http://13.211.132.164:5000/api/save-closet-layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        layoutData: {
          layout_type: selectedOption.layout_type,
          closet_layout: [],
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '저장 실패');

    navigation.navigate('ClosetGrid', {
      rows: String(selectedOption.rows),
      cols: String(selectedOption.cols),
      layout_type: selectedOption.layout_type,
    });
  } catch (e) {
    Alert.alert('오류', '옷장 선택 저장에 실패했습니다.');
    console.error(e);
  } finally {
    setSaving(false);
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>당신의 옷장을 선택하세요!</Text>
      {closetOptions.map((option) => (
        <View key={option.id} style={styles.row}>
          <Image source={option.image} style={styles.image} resizeMode="contain" />
          <TouchableOpacity
            style={[styles.optionBox, selected === option.id && styles.selectedBox]}
            onPress={() => setSelected(option.id)}
            disabled={saving}
          >
            <View style={styles.checkboxWrapper}>
              <View style={[styles.checkbox, selected === option.id && styles.checked]} />
            </View>
            <Text style={styles.label}>{option.name}</Text>
            <Text style={styles.size}>{option.layout_type}</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? '저장 중...' : '선택 완료'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFFEFA' },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  image: { width: 100, height: 140, marginRight: 16 },
  optionBox: {
    flex: 1,
    backgroundColor: '#f3f8f4',
    padding: 12,
    borderRadius: 16,
    justifyContent: 'center',
  },
  selectedBox: {
    borderColor: '#5dc388',
    borderWidth: 2,
  },
  checkboxWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 8,
  },
  checked: {
    backgroundColor: '#37955F',
  },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  size: { fontSize: 14, color: '#888' },
  button: {
    backgroundColor: '#6AC892',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginBottom: 20,
    width: '40%',
    alignItems: 'center',
    alignSelf: 'flex-end'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
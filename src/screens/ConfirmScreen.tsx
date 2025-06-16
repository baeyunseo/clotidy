// src/screens/ConfirmScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';

type ConfirmScreenRouteProp = RouteProp<RootStackParamList, 'Confirm'>;

export default function ConfirmScreen() {
  const navigation = useNavigation();
  const route = useRoute<ConfirmScreenRouteProp>();
  const { imageUri, category, colorName } = route.params;

  const handleSave = () => {
    Alert.alert('저장 완료', 'AI 분류 결과가 저장되었습니다.');
    navigation.goBack(); // 必要に応じて RegisterCloth などへ変更
  };

  return (
    <View style={styles.container}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.imageBox} />
      ) : (
        <View style={styles.imageBox}>
          <Text>이미지 미리보기 없음</Text>
        </View>
      )}

      <View style={styles.resultBox}>
        <Text style={styles.title}>AI 분류 결과</Text>
        <Text style={styles.text}>🧥 카테고리: <Text style={styles.bold}>{category}</Text></Text>
        <Text style={styles.text}>🎨 색상 이름: <Text style={styles.bold}>{colorName}</Text></Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmButton} onPress={handleSave}>
          <Text style={styles.confirmText}>저장</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFFEFA' },
  imageBox: {
    height: 200, backgroundColor: '#eee',
    justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginBottom: 20
  },
  resultBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    marginBottom: 24,
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  text: { fontSize: 14, marginBottom: 8 },
  bold: { fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: {
    flex: 1, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginRight: 8
  },
  confirmButton: {
    flex: 1, padding: 16, alignItems: 'center',
    backgroundColor: '#37955F', borderRadius: 8
  },
  cancelText: { color: 'red', fontWeight: 'bold' },
  confirmText: { color: '#fff', fontWeight: 'bold' },
});
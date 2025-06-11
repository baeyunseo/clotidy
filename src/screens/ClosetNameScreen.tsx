// app/closet/closetname.tsx — 옷장 이름 등록 시 closets 배열에 추가
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/libfirebase';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types'; // 適宜変更

const TEST_UID = 'test-user-id';

const ClosetNameScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [closetName, setClosetName] = useState('');

  const handleSubmit = async () => {
    if (!closetName.trim()) {
      Alert.alert('옷장 이름을 입력해주세요');
      return;
    }

    try {
      const newCloset = {
        id: Date.now().toString(),
        name: closetName,
      };

      const userRef = doc(db, 'users', TEST_UID);
      const snapshot = await getDoc(userRef);
      const prev = snapshot.data()?.closets ?? [];

      await setDoc(userRef, {
        closets: [...prev, newCloset],
      }, { merge: true });

      navigation.replace("Gird"); // ← 修正点
    } catch (err) {
      console.error('저장 실패:', err);
      Alert.alert('저장 중 오류가 발생했습니다');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>디지털 옷장</Text>

      <TextInput
        placeholder="옷장명 (예: Closet 1)"
        value={closetName}
        onChangeText={setClosetName}
        style={styles.input}
      />

      <TouchableOpacity onPress={handleSubmit} style={styles.button}>
        <Text style={styles.buttonText}>확인</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: {
    backgroundColor: '#F6F6F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#5DC388',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ClosetNameScreen;
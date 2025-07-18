import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const EditProfileScreen = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const fetchUserInfo = async () => {
      const currentUser = auth().currentUser;
      if (currentUser) {
        setEmail(currentUser.email || '');
        try {
          const doc = await firestore().collection('users').doc(currentUser.uid).get();
          if (doc.exists) {
            setName(doc.data()?.name || '');
          }
        } catch (err) {
          console.log('🔥 Firestore에서 정보 가져오기 실패:', err);
        }
      }
    };

    fetchUserInfo();
  }, []);

  const handleSave = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      Alert.alert('오류', '로그인 정보가 없습니다.');
      return;
    }

    try {
      // 이름 Firestoreに保存
      await firestore().collection('users').doc(currentUser.uid).update({
        name: name,
      });
      console.log('✅ 이름 업데이트 완료');

      // パスワード更新（オプション）
      if (password.length >= 10) {
        await currentUser.updatePassword(password);
        console.log('✅ 비밀번호 업데이트 완료');
      }

      Alert.alert('성공', '정보가 저장되었습니다.');
    } catch (error: any) {
      console.error('❌ 저장 실패:', error);
      Alert.alert('오류', `정보 저장에 실패했습니다:\n${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 정보 수정</Text>

      <TextInput
        style={styles.input}
        placeholder="이름"
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="비밀번호(영문,숫자,특수문자 조합 10자 이상)"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor="#999"
        value={email}
        editable={false}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>저장</Text>
      </TouchableOpacity>
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEFA',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 50,
    color: '#222',
  },
  input: {
    width: '100%',
    backgroundColor: '#f1f1eb',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 14,
    color: '#555',
  },
  saveButton: {
    width: '100%' ,
    backgroundColor: '#6AC892',
    paddingVertical: 14,
    paddingHorizontal: 160,
    borderRadius: 24,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

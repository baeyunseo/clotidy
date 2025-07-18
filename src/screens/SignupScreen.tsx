// src/screens/SignupScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const navigation = useNavigation<NavigationProp>();

  const handleSignup = async () => {
    if (!email || !pw || !name) {
      Alert.alert("모든 값을 입력해주세요.");
      return;
    }

    try {
      // 1. Firebase Auth로 회원 생성
      const res = await auth().createUserWithEmailAndPassword(email, pw);
      const userId = res.user.uid;

      // 2. 서버에 회원 정보 저장 (userId로 맞춤!!)
      const payload = {
        userId,   // <-- userId (camelCase, 서버/백엔드와 반드시 합의 맞출 것!)
        name,
        email,
      };

      console.log("회원가입 API에 보낼 payload:", JSON.stringify(payload));

      const response = await fetch("http://54.79.167.144:5000/api/save-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("응답 status:", response.status);  
      console.log("응답 body:", data);

      if (!response.ok) {
        throw new Error(data.error || "회원 정보 저장 실패");
      }

      Alert.alert("회원가입 성공!");
      navigation.reset({
        index: 0,
        routes: [{ name: 'CheckCloset' as keyof RootStackParamList }],
      });

    } catch (err: any) {
      Alert.alert("회원가입 실패", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>
      <TextInput
        placeholder="이름"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="비밀번호(영문,숫자,특수문자 조합 10자 이상)"
        value={pw}
        onChangeText={setPw}
        secureTextEntry
        style={styles.input}
      />
      <TouchableOpacity onPress={handleSignup} style={styles.button}>
        <Text style={styles.buttonText}>회원가입</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEFA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 22,
    marginBottom: 40,
    fontWeight: 'bold',
    color: '#212121',
  },
  input: {
    width: '100%',
    backgroundColor: '#f1f1eb',
    borderRadius: 50,
    padding: 12,
    marginBottom: 15,
  },
  button: { 
    width: '100%' ,
    backgroundColor: '#6AC892',
    alignItems: 'center',
    borderRadius: 60,
    padding: 12,
    marginBottom: 85,
  },
  buttonText: { 
    color: '#fff',
    textAlign: 'center',
    fontSize: 16 },
});
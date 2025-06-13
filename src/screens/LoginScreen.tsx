// src/screens/LoginScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  const handleLogin = async () => {
  try {
    const res = await auth().signInWithEmailAndPassword(email, pw);
    // 로그인 성공 후 옷장 체크 분기 화면으로 이동
    navigation.replace('CheckCloset');
  } catch (e: any) {
    Alert.alert('로그인 오류', e.message);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>로그인</Text>
      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={pw}
        onChangeText={setPw}
        secureTextEntry
      />
      <Button title="로그인" onPress={handleLogin} />
      <Button title="회원가입" onPress={() => navigation.replace('Signup')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefef6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 24,
    marginBottom: 40,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    width: '100%',
    backgroundColor: '#f1f1eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#95d5b2',
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  signupButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 13,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#fff',
  },
  signupText: {
    color: '#333',
  },
});
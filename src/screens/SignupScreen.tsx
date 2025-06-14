// src/screens/SignupScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import auth from "@react-native-firebase/auth";
import { saveUserInfo } from '../lib/userService'; // 명세서 함수
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');  // 변수명 명세서에 맞춤
  const navigation = useNavigation<NavigationProp>();

  const handleSignup = async () => {
    if (!email || !pw || !name) {
      Alert.alert("모든 값을 입력해주세요.");
      return;
    }

    try {
      // 1. 인증(계정 생성)
      const res = await auth().createUserWithEmailAndPassword(email, pw);
      const uid = res.user.uid;

      // 2. 명세서 맞게 이름은 name!
      await saveUserInfo(uid, name, email);

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
        onChangeText={setName}   // 명세서 변수명 name
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

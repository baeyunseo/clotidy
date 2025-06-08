// src/screens/LoginScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  const handleLogin = async () => {
    try {
      // ✅ 로그인 시 Firestore 저장 X, 오직 인증만!
      const res = await auth().signInWithEmailAndPassword(email, pw);
      // Firestore 저장하지 말 것! (api 명세서, userService.js에 따라)
      navigation.replace('Home');
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
  container: { flex:1, justifyContent:'center', padding:24 },
  title: { fontSize:28, fontWeight:'bold', marginBottom:24 },
  input: { borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:12, marginBottom:12 }
});

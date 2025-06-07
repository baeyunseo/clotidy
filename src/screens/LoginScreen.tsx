import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase'; // ✅ Web SDK로 설정된 auth
import { saveUserInfo } from '../lib/userService';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pw);
      const user = userCredential.user;

      await saveUserInfo(user.uid, user.displayName ?? '', user.email ?? '');
      navigation.replace('Home');
    } catch (e: any) {
      Alert.alert('로그인 오류', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>로그인</Text>
      <TextInput style={styles.input} placeholder="이메일" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="비밀번호" value={pw} onChangeText={setPw} secureTextEntry />
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

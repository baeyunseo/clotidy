import { Pressable, View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const router = useRouter();

  const handleSignup = () => {
    if (!email || !pw || !confirmPw) {
      alert('모든 항목을 입력해주세요!');
    } else if (pw !== confirmPw) {
      alert('비밀번호가 일치하지 않아요!');
    } else {
      alert(`회원가입 완료: ${email}`);
      router.replace('/'); // 홈으로 이동 (또는 /login으로 바꿔도 됨)
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>
      <TextInput style={styles.input} placeholder="이메일" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="비밀번호" secureTextEntry value={pw} onChangeText={setPw} />
      <TextInput style={styles.input} placeholder="비밀번호 확인" secureTextEntry value={confirmPw} onChangeText={setConfirmPw} />
      <Pressable onPress={handleSignup}>
          <Text style={styles.signupButton}>회원가입</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
  },

  signupButton: {
    fontSize: 15,
    color: 'black',       // 텍스트 색 (파랑 없앰)
    padding: 12,
    textAlign: 'center',
  }
  
});

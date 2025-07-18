import { Pressable, View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [errorMsg, setErrorMsg] = useState(''); // 오류 메시지 상태
  const router = useRouter(); // 화면 이동을 위한 훅

  const handleLogin = () => {
    if (email === 'test@example.com' && pw === '1234') {
      setErrorMsg(''); // 에러 메시지 초기화
      router.replace('/home'); // 로그인 성공 시 홈으로 이동
    } else {
      setErrorMsg('다시 시도하세요.'); // 실패 메시지 설정
    }

    const handleLogin = () => {
      console.log(email, pw);
      // 나중에 백엔드 연결되면 fetch 코드 넣기
    };
    

  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clotidy 로그인</Text>
      <TextInput style={styles.input} placeholder="이메일" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="비밀번호" value={pw} secureTextEntry onChangeText={setPw} />
      <Pressable onPress={handleLogin}>
          <Text style={styles.loginButton}>로그인</Text>
      </Pressable>

      {/* 실패 메시지 표시 */}
      {errorMsg !== '' && <Text style={styles.error}>{errorMsg}</Text>}

      <Text
      style={styles.link}
      onPress={() => router.push('/signup')}
      >
        회원가입
        </Text>

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
  link: {
    marginTop: 16,
    color: 'black',
    textAlign: 'center',
    fontSize: 14,
  },
  error: {
    marginTop: 16,
    color: 'red',
    textAlign: 'center',
  },
  
  loginButton: {
    fontSize: 15,
    color: 'black',       // 텍스트 색 (파랑 없앰)
    padding: 12,
    textAlign: 'center',
  },

});



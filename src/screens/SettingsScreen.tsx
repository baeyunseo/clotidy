// src/screens/SettingsScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Switch, Alert, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

// (선택) axios를 쓴다면 불러와서 기본 헤더도 비워준다.
// import axios from 'axios';

// (선택) 전역 상태(예: Zustand/Recoil/Context)라면 가져와서 메모리의 user도 null로 만든다.
// import { useAuthStore } from '../stores/auth';

// (선택) react-query를 쓰면 캐시 클리어
// import { queryClient } from '../lib/queryClient';

const AUTH_ROUTE: keyof RootStackParamList = 'Login'; // ← 너의 "로그인/시작" 화면 이름으로 변경!

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [pushEnabled, setPushEnabled] = useState(false);
  const PUSH_KEY = 'settings.pushEnabled';

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(PUSH_KEY);
        if (saved !== null) setPushEnabled(saved === 'true');
      } catch {}
    })();
  }, []);

  const handleTogglePush = async (value: boolean) => {
    try {
      setPushEnabled(value);
      await AsyncStorage.setItem(PUSH_KEY, String(value));
      // TODO: 서버 반영/권한요청/토큰등록/해제 로직 연결
    } catch {
      Alert.alert('오류', '알림 설정 변경 중 문제가 발생했습니다.');
    }
  };

  const performLogout = async () => {
    // 1) 서버 세션 만료(선택)
    // try { await api.post('/auth/logout'); } catch {}

    // 2) 로컬 토큰/유저/설정 제거 (필요 키 전부)
    const keysToRemove = [
      'auth.accessToken',
      'auth.refreshToken',
      'user.profile',
      'settings.pushToken',
      'settings.pushEnabled',
      // 필요하면 더 추가
    ];
    await AsyncStorage.multiRemove(keysToRemove);

    // 3) 메모리 상태/헤더/캐시 초기화 (사용 중일 때만)
    // axios.defaults.headers.common.Authorization = undefined;
    // useAuthStore.getState().setUser(null); // 예시
    // await queryClient.clear(); // 예시

    // 4) 네비게이션 스택 완전 초기화 → 로그인(시작) 화면으로
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: AUTH_ROUTE as string }],
      })
    );
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            await performLogout();
          } catch {
            Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.title}>설정</Text>

        {/* 내 정보 수정 */}
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('EditMyPage')}
        >
          <Text style={styles.rowText}>내 정보 수정</Text>
        </TouchableOpacity>

        {/* 푸쉬 알림 설정 */}
        <View style={styles.row}>
          <Text style={styles.rowText}>푸쉬 알림 설정</Text>
          <Switch value={pushEnabled} onValueChange={handleTogglePush} />
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={[styles.row, styles.logoutRow]} onPress={handleLogout}>
          <Text style={[styles.rowText, styles.logoutText]}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFEFA' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 24, backgroundColor: '#FFFEFA' },
  title: { fontSize: 20, fontWeight: '800', color: '#222', marginBottom: 16, marginTop:30, left:170 },
  row: {
    height: 56,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: { fontSize: 16, color: '#222', fontWeight: '600' },
  logoutRow: { backgroundColor: '#FBE9E9', borderColor: '#F5CDCD' },
  logoutText: { color: '#B00020', fontWeight: '800' },
});

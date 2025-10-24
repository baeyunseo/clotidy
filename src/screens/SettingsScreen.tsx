// src/screens/SettingsScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

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
      // 필요하면 여기서 서버 반영/권한요청/토큰등록 로직 추가
    } catch {
      Alert.alert('오류', '알림 설정 변경 중 문제가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove(['auth.accessToken', 'auth.refreshToken', 'user.profile']);
            // 앱 첫 화면 혹은 Login으로 변경
            navigation.reset({ index: 0, routes: [{ name: 'Home' as any }] });
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
          onPress={() => {
            // 내 정보 수정 화면으로 이동
            // 존재하면 'EditProfile', 없으면 기존 'MyPage'로 연결
            navigation.navigate('EditMyPage'); // <-- 필요 시 'EditProfile'로 변경
          }}
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
  safe: {
    flex: 1,
    backgroundColor: '#FFFEFA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: '#FFFEFA',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#222',
    marginBottom: 16,
  },
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
  rowText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
  },
  logoutRow: {
    backgroundColor: '#FBE9E9',
    borderColor: '#F5CDCD',
  },
  logoutText: {
    color: '#B00020',
    fontWeight: '800',
  },
});

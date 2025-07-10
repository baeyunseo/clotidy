// src/screens/CheckClosetScreen.tsx

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

const BASE_URL = "http://54.79.167.144:5000"; // 최신 서버 IP + 포트

export default function CheckClosetScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const check = async () => {
      const user = auth().currentUser;
      if (!user) {
        navigation.replace('Login');
        return;
      }
      try {
        // 엔드포인트 주소 BASE_URL 적용
        const res = await fetch(`${BASE_URL}/api/closet-layout/${user.uid}`);
        if (!res.ok) throw new Error('옷장 정보 조회 실패');
        const data = await res.json();

        console.log('체크클로젯 closet_layout:', JSON.stringify(data, null, 2));

        if (data.closet_layout && Array.isArray(data.closet_layout) && data.closet_layout.length > 0) {
          navigation.replace('Home');
        } else {
          navigation.replace('ClosetIndex');
        }
      } catch (e) {
        navigation.replace('ClosetIndex');
      }
    };
    check();
  }, []);

  return (
    <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#FFFEFA'}}>
      <ActivityIndicator size="large" color="#6AC892" />
    </View>
  );
}
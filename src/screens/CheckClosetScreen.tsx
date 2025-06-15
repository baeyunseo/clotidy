// src/screens/CheckClosetScreen.tsx

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

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
        // 🔥 여기 엔드포인트 수정!
        const res = await fetch(`http://13.211.132.164:5000/api/closet-layout/${user.uid}`);
        if (!res.ok) throw new Error('옷장 정보 조회 실패');
        const data = await res.json();

        // 🔍 콘솔 확인 (디버깅용)
        console.log('체크클로젯 closet_layout:', JSON.stringify(data, null, 2));

        // closet_layout이 존재하고 1개 이상이면 Home, 아니면 ClosetIndex로 분기
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
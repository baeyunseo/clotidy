// App.tsx

/*
  앱의 진입점이자 네비게이터(스택 구조)를 생성/설정하는 메인 파일입니다.
  라우트 타입은 src/navigation/types.ts에서 import하여 네비게이터에 적용합니다.
*/


import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './src/navigation/types'; // ✅ 네비게이터 타입 import

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import SignupScreen from './src/screens/SignupScreen';

// ❌ 타입 중복 선언 제거!!
// export type RootStackParamList = { ... } <<<< 이거 완전히 삭제!

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

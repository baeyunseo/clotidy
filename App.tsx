// App.tsx

/*
  앱의 진입점이자 네비게이터(스택 구조)를 생성/설정하는 메인 파일입니다.
  라우트 타입은 src/navigation/types.ts에서 import하여 네비게이터에 적용합니다.
*/


import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './src/navigation/types';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ClosetIndexScreen from './src/screens/ClosetIndexScreen'; // 옷장 인트로(등록 시작)
import ClosetSelectScreen from './src/screens/ClosetSelectScreen';
import ClosetGridScreen from './src/screens/ClosetGridScreen';
import CheckClosetScreen from './src/screens/CheckClosetScreen';
import SplashScreen from './src/screens/SplashScreen';
import RegisterClothScreen from './src/screens/RegisterClothScreen';
import BlockClothesListScreen from './src/screens/BlockClothesListScreen';



const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="CheckCloset" component={CheckClosetScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ClosetIndex" component={ClosetIndexScreen} />
        <Stack.Screen name="ClosetSelect" component={ClosetSelectScreen} />
        <Stack.Screen name="ClosetGrid" component={ClosetGridScreen} />
          <Stack.Screen name="RegisterCloth" component={RegisterClothScreen} />
          <Stack.Screen name="BlockClothesList" component={BlockClothesListScreen} />


      </Stack.Navigator>

    </NavigationContainer>
  );
}

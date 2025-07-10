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
import ClosetIndexScreen from './src/screens/ClosetIndexScreen';
import ClosetSelectScreen from './src/screens/ClosetSelectScreen';
import ClosetGridScreen from './src/screens/ClosetGridScreen';
import CheckClosetScreen from './src/screens/CheckClosetScreen';
import SplashScreen from './src/screens/SplashScreen';
import ChoiceScreen from './src/screens/ChoiceScreen';
import ConfirmScreen from './src/screens/ConfirmScreen'; 
import RegisterClothScreen from './src/screens/RegisterClothScreen';
import BlockClothesListScreen from './src/screens/BlockClothesListScreen';
// import ClosetScreen from './src/screens/ClosetScreen';    // 옷장 화면 (만약 별도 필요)
// import AlarmScreen from './src/screens/AlarmScreen';      // 알람/리마인드 화면 (만약 별도 필요)

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
        <Stack.Screen name="Choice" component={ChoiceScreen} />
        <Stack.Screen name="Confirm" component={ConfirmScreen} />
        {/* <Stack.Screen name="Closet" component={ClosetScreen} />      {/* 추가 */}
        {/* <Stack.Screen name="Alarm" component={AlarmScreen} />        {/* 추가 */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
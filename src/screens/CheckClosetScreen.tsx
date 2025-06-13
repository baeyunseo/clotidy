// src/screens/CheckClosetScreen.tsx

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
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
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists() && snap.data().closet_layout?.length > 0) {
      navigation.replace('Home');
    } else {
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

// src/screens/SettingsScreen.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

export default function MyPageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
      <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

     
      <Text style={styles.title}>마이페이지</Text>

      <View style={styles.cardContainer}>
  <TouchableOpacity
    style={styles.card}
    onPress={() => navigation.navigate('MyPage')}
  >
          <Image source={require('../../assets/icons/user-purple.png')} style={styles.icon} />
          <Text style={styles.cardText}>내 정보</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}
        onPress={() => navigation.navigate('Calendar')}>
          <Image source={require('../../assets/icons/settings.png')} style={styles.icon} />
          <Text style={styles.cardText}>설정</Text>
        </TouchableOpacity>
      </View>

  
                <View style={styles.tabBar}>
                       <TouchableOpacity onPress={() => navigation.navigate("Home")}>
                 　　   <Image source={require("../../assets/icons/home.png")} 
                         style={[styles.tabIcon, styles.homeIcon]} />
                   　　　</TouchableOpacity>
                         <TouchableOpacity onPress={() => navigation.navigate("Alarm")}>
                         <Image source={require("../../assets/icons/bell.png")}
                          style={[styles.tabIcon, styles.homeIcon]} />
                         </TouchableOpacity>
                                 
                       　 <TouchableOpacity onPress={() => navigation.navigate({ name: 'RegisterCloth', params: { imageUri: "" } })}>
                         　<Image source={require("../../assets/icons/camera.png")} 
                         style={[styles.tabIcon, styles.homeIcon]} />
                           </TouchableOpacity>
                           <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
                           <Image source={require("../../assets/icons/hanger.png")} style={styles.tabIcon} />
                           </TouchableOpacity>
                           <TouchableOpacity onPress={() => navigation.navigate("Calendar")}>
                           <Image source={require("../../assets/icons/daily.png")} style={styles.tabIcon} />
                           </TouchableOpacity>
                           
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEFA',
    alignItems: 'center',
  },
  logo: {
    width: 126,
    height: 30,
    resizeMode: 'contain',
    marginTop: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 80,
    marginBottom: 50,
    color: '#222',
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
  },
  card: {
    width: 170,
    height: 220,
    backgroundColor: '#F2F8F3',
    borderRadius: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  icon: {
    width: 35,
    height: 35,
    marginBottom: 10,
    tintColor: '#333',
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#FFFEFA',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  tabIcon: {
    width: 35,
    height: 35,
  },
   homeIcon: {
    width: 40,
    height: 40,
  },
});
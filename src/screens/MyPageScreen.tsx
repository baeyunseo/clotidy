import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import auth from '@react-native-firebase/auth';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const BASE_URL = "http://54.79.167.144:5000";

const MyPageScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const navigation = useNavigation();

 useEffect(() => {
  const fetchUserInfo = async () => {
    const user = auth().currentUser;
    if (user) {
      setEmail(user.email || '');

      try {
        const res = await axios.get(`${BASE_URL}/api/user/${user.uid}`);
        setName(res.data.name || '이름 없음');
      } catch (err) {
        console.log('API에서 이름 가져오기 실패:', err);
        setName('이름 없음');
      }
    }
  };

  fetchUserInfo();
}, []);
  const handleEditPress = () => {
    navigation.navigate('EditMyPage'); // 修正画面に遷移
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 정보</Text>
      <Image
        source={require('../../assets/icons/user-purple.png')} 
        style={styles.avatar}
      />
      <Text style={styles.userInfo}>{name} / {email}</Text>
      <Pressable style={styles.editButton} onPress={handleEditPress}>
        <Text style={styles.editButtonText}>내 정보 수정</Text>
      </Pressable>
    </View>
  );
};

export default MyPageScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEFA',
    alignItems: 'center',    
    paddingVertical: 40,
  },
  title: {
   fontSize: 18,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 50,
    color: '#222',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  editButton: {
    backgroundColor: '#F2F8F3',
    paddingVertical: 12,
    paddingHorizontal: 120,
    borderRadius: 30,
  },
  editButtonText: {
    color: '#333',
    fontSize: 16,
  },
});

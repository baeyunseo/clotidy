// scr/screens/ClosetIndexScreen — 옷장 진입: 옷장 없음 → 선택 → 설정 진입

import React from 'react';
import { Image, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

const ClosetIndexScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  console.log("✅ ClosetIndexScreen loaded");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>나만의 옷장을 설정하세요!</Text>
      <Image
        source={require('../../assets/images/closet-icon.png')}
        style={{ width: 200, height: 150, marginTop: 20 }}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ClosetSelect')}
      >
        <Text style={styles.buttonText}>+    옷장 추가</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFEFA' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#212121', marginBottom: 20 },
  button: {
    backgroundColor: '#6AC892',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ClosetIndexScreen;
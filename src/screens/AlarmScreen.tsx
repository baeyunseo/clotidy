import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, FlatList, TouchableOpacity, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // ✅ 追加
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types'; // 型を使う場合

type Cloth = {
  id: string;
  name: string;
  imageUrl: string;
  lastWornDate: string;
};

export default function AlarmScreen() {
     const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 仮データ（Firestoreを使わずに確認用）
  const [clothes, setClothes] = useState<Cloth[]>([
    {
      id: '1',
      name: '재킷',
      imageUrl: 'https://i.imgur.com/https://example.com/bottom.jpg',
      lastWornDate: '2024.12.01',
    },
    {
      id: '2',
      name: '운동화',
      imageUrl: 'https://i.imgur.com/https://example.com/bottom.jpg',
      lastWornDate: '2024.10.28',
    },
  ]);

  const handleSuggestCoordi = (cloth: Cloth) => {

  };

  const handleDelete = (clothId: string) => {
    setClothes(prev => prev.filter(item => item.id !== clothId));
  };

  const renderItem = ({ item }: { item: Cloth }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.date}>마지막 착용일 : {item.lastWornDate}</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.suggestBtn} onPress={() => handleSuggestCoordi(item)}>
            <Text style={styles.btnText}>코디 제안</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
            <Text style={styles.btnText}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
        <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.backArrow}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>착용 리마인드</Text>
                <View style={{ width: 24 }} />
              </View>
      <FlatList
        data={clothes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEFA',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15,marginTop: 35,},
  backArrow: { fontSize: 24, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  mainItemTitle: {
    fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 8
  },
  
  card: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 16,
  },
  image: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  info: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  suggestBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderColor: '#aaa',
    borderWidth: 1,
    marginRight: 90,
    left:50,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderColor: '#aaa',
    borderWidth: 1,
  },
  btnText: {
    fontSize: 13,
  },
});

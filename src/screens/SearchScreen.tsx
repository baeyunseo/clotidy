// SearchScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput,StyleSheet,TouchableOpacity, Alert,} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import { RootStackParamList } from '../navigation/types';

type SearchScreenProp = NativeStackNavigationProp<RootStackParamList, 'SearchResult'>;

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenProp>();
  const [searchText, setSearchText] = useState('');

  const handleSearch = () => {
    const keyword = searchText.trim();
    if (!keyword) {
      Alert.alert('검색 오류', '검색어를 입력해주세요.');
      return;
    }

    const userId = auth().currentUser?.uid;
    if (!userId) {
          return;
    }

    navigation.navigate('SearchResult', {
      keyword,
      userId,
    });
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>검색</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 入力欄 */}
      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        style={styles.input}
        autoFocus
      />

      {/* 検索ボタン */}
      <TouchableOpacity style={styles.button} onPress={handleSearch}>
        <Text style={styles.buttonText}>검색</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFEFA', paddingTop: 50, paddingHorizontal: 20 },
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15,},
  backArrow: { fontSize: 24, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  input: {backgroundColor: '#f1f1eb',borderRadius: 20,paddingVertical: 10,paddingHorizontal: 15,fontSize: 16,color: '#666',
    marginBottom: 10,},
  button: {backgroundColor: '#F2F8F3',paddingVertical: 10,borderRadius: 10,alignItems: 'center',},
  buttonText: {color: '#000',fontSize: 16,fontWeight: 'bold',},
});

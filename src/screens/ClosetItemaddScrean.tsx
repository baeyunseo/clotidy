import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firestore'; // ← adjust path according to your structure

export default function ClosetAddScreen() {
  const [location, setLocation] = useState('');
  const [clothName, setClothName] = useState('');
  const [category, setCategory] = useState('');
  const [wornCount, setWornCount] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');

  const handleRegister = async () => {
    if (!clothName || !category || !location || !selectedSeason) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
      return;
    }

    try {
      await addDoc(collection(db, 'clothes'), {
        cloth_name: clothName,
        category: category,
        location: location,
        season: selectedSeason,
        worn_count: Number(wornCount) || 0,
        date_added: serverTimestamp(),
      });
      Alert.alert('저장 완료', '옷이 등록되었습니다.');
      setClothName('');
      setCategory('');
      setLocation('');
      setWornCount('');
      setSelectedSeason('');
    } catch (error) {
      Alert.alert('오류', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>디지털 옷장</Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TextInput
          style={styles.input}
          placeholder="보관 공간"
          placeholderTextColor="#aaa"
          value={location}
          onChangeText={setLocation}
        />
        <TextInput
          style={styles.input}
          placeholder="옷 이름"
          placeholderTextColor="#aaa"
          value={clothName}
          onChangeText={setClothName}
        />
        <TextInput
          style={styles.input}
          placeholder="카테고리"
          placeholderTextColor="#aaa"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="착용 횟수"
          placeholderTextColor="#aaa"
          keyboardType="numeric"
          value={wornCount}
          onChangeText={setWornCount}
        />

        <View style={styles.tags}>
          {['봄', '여름', '가을', '겨울', '기타'].map((season) => (
            <TouchableOpacity
              key={season}
              style={[
                styles.tag,
                selectedSeason === season && { backgroundColor: '#95d5b2' },
              ]}
              onPress={() => setSelectedSeason(season)}
            >
              <Text style={styles.tagText}>{season}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Icon name="add" size={18} color="#fff" />
        <Text style={styles.registerText}>등록</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#37955F',
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10,
  },
  tag: {
    backgroundColor: '#d8f3dc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    color: '#333',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6AC892',
    paddingVertical: 12,
    borderRadius: 20,
    margin: 20,
  },
  registerText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
});
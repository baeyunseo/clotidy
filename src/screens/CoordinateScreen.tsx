import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView
} from 'react-native';

// 仮データ（実際はAPIやFirestoreから取得）
const recommendation = {
  mainCloth: {
    name: '핑크색 블라우스',
    category: '상의',
    tags: ['상의', '여름'],
    imageUrl: 'https://example.com/top.jpg',
  },
  items: [
    {
      name: '반바지',
      category: '하의',
      lastWorn: '2024. 12. 01',
      imageUrl: 'https://example.com/bottom.jpg',
    },
    {
      name: '가방',
      category: '가방칸',
      lastWorn: '2024. 11. 01',
      imageUrl: 'https://example.com/bag.jpg',
    }
  ]
};

export default function CoordiRecommendationScreen() {
  const { mainCloth, items } = recommendation;
　const [searchText, setSearchText] = useState('');
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>코디 추천 리스트</Text>

      {/* 메인 아이템 */}
      <Text style={styles.mainItemTitle}>{mainCloth.name}</Text>
      <Image source={{ uri: mainCloth.imageUrl }} style={styles.mainImage} />
      <Text style={styles.tags}>
        {mainCloth.tags.map(tag => `#${tag} `).join('')}{"\n"}
        {mainCloth.category}
      </Text>

      {/* 추천 아이템 리스트 */}
      <View style={styles.itemList}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemBox}>
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
            <View style={styles.itemTextBox}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemCategory}>{item.category}</Text>
              <Text style={styles.lastWorn}>마지막 착용일 : {item.lastWorn}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFEFA', padding: 16 },
  title: {
    fontSize: 18, fontWeight: 'bold',marginTop: 40, marginBottom: 8, color: '#333',
    textAlign: 'center',
  },
  mainItemTitle: {
    fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 8
  },
  mainImage: {
    width: '100%', height: 200, resizeMode: 'contain', borderRadius: 12
  },
  tags: {
    fontSize: 14, color: '#444', marginTop: 8, marginBottom: 20
  },
  itemList: {
    marginTop: 10
  },
  itemBox: {
    flexDirection: 'row',
    backgroundColor: '#FDFDF8',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  itemImage: {
    width: 70, height: 70, borderRadius: 8, marginRight: 12
  },
  itemTextBox: {
    flex: 1
  },
  itemName: {
    fontSize: 16, fontWeight: 'bold'
  },
  itemCategory: {
    fontSize: 14, color: '#555', marginVertical: 4
  },
  lastWorn: {
    fontSize: 13, color: '#999'
  }
});

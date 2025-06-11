// app/closet/closetgrid.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/libfirebase';

const screenWidth = Dimensions.get('window').width;
const sidePadding = 40;

export default function ClosetGridScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { rows, cols, layout_type } = route.params;
  const rowCount = parseInt(rows, 10) || 4;
  const colCount = parseInt(cols, 10) || 3;

  const idealHeight = 400;
  const GAP = 1;
  const estimatedBlockSize = (screenWidth - sidePadding - (colCount - 1) * GAP) / colCount;
  const scale = Math.min(1, idealHeight / ((estimatedBlockSize + GAP) * rowCount));
  const BLOCK_SIZE = estimatedBlockSize * scale;

  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [namedBlocks, setNamedBlocks] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [tempCoords, setTempCoords] = useState([]);
  const [blockName, setBlockName] = useState('');

  const handlePress = (row, col) => {
    if (!selectedStart) {
      setSelectedStart([row, col]);
    } else {
      setSelectedEnd([row, col]);

      const [r1, c1] = selectedStart;
      const [r2, c2] = [row, col];
      const top = Math.min(r1, r2);
      const bottom = Math.max(r1, r2);
      const left = Math.min(c1, c2);
      const right = Math.max(c1, c2);

      const newCoords = [];
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const alreadyUsed = namedBlocks.some(b =>
            b.coords.some(([br, bc]) => br === r && bc === c)
          );
          if (alreadyUsed) return;
          newCoords.push([r, c]);
        }
      }

      setTempCoords(newCoords);
    }
  };

  const saveBlock = () => {
    if (blockName.trim()) {
      setNamedBlocks(prev => [...prev, { name: blockName, coords: tempCoords }]);
      setBlockName('');
      setSelectedStart(null);
      setSelectedEnd(null);
      setTempCoords([]);
      setModalVisible(false);
    }
  };

  const isSelected = (r, c) => {
    if (!selectedStart || !selectedEnd) return false;
    const [r1, c1] = selectedStart;
    const [r2, c2] = selectedEnd;
    return (
      r >= Math.min(r1, r2) &&
      r <= Math.max(r1, r2) &&
      c >= Math.min(c1, c2) &&
      c <= Math.max(c1, c2)
    );
  };

  const handleComplete = async () => {
    if (namedBlocks.length === 0) {
      Alert.alert('❗ 최소 한 개 이상의 블록을 설정해주세요.');
      return;
    }

    try {
      await setDoc(doc(db, 'users', 'test-user'), {
        layout_type,
        closet_layout: namedBlocks.map(block => ({
          name: block.name,
          coords: block.coords.map(([x, y]) => ({ x, y })),
        })),
        created_at: new Date(),
      });

      Alert.alert('저장 완료', '옷장 구성이 저장되었습니다.', [
        {
          text: '확인',
          onPress: () => navigation.navigate('Home'),
        },
      ]);
    } catch (error) {
      Alert.alert('저장 실패', '오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleBox}>
        <Text style={styles.title}>옷장 블록을 선택해주세요.</Text>
      </View>

      <View
        style={{
          width: colCount * (BLOCK_SIZE + GAP),
          height: rowCount * (BLOCK_SIZE + GAP),
          position: 'relative',
        }}>
        {Array.from({ length: rowCount }).map((_, row) => (
          <View key={row} style={{ flexDirection: 'row' }}>
            {Array.from({ length: colCount }).map((_, col) => {
              const namedBlock = namedBlocks.find(b =>
                b.coords.some(([r, c]) => r === row && c === col)
              );
              const isTopLeft = namedBlock?.coords?.[0]?.[0] === row &&
                namedBlock?.coords?.[0]?.[1] === col;

              return (
                <TouchableOpacity
                  key={`${row}-${col}`}
                  onPress={() => handlePress(row, col)}
                  style={[
                    styles.block,
                    {
                      width: BLOCK_SIZE,
                      height: BLOCK_SIZE,
                      marginRight: GAP,
                      marginBottom: GAP,
                      backgroundColor: isSelected(row, col)
                        ? '#C5EBD6'
                        : namedBlock ? '#B5EADB' : '#fff',
                    },
                  ]}
                  activeOpacity={0.8}>
                  {isTopLeft && (
                    <Text style={styles.blockLabel}>{namedBlock?.name}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {namedBlocks.map((block, idx) => {
          const rows = block.coords.map(c => c[0]);
          const cols = block.coords.map(c => c[1]);
          const top = Math.min(...rows);
          const left = Math.min(...cols);
          const width = (Math.max(...cols) - left + 1) * (BLOCK_SIZE + GAP) - GAP;
          const height = (Math.max(...rows) - top + 1) * (BLOCK_SIZE + GAP) - GAP;

          return (
            <View
              key={`outline-${idx}`}
              style={{
                position: 'absolute',
                top: top * (BLOCK_SIZE + GAP),
                left: left * (BLOCK_SIZE + GAP),
                width,
                height,
                borderColor: '#286E46',
                borderWidth: 2,
                borderRadius: 8,
              }}
            />
          );
        })}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ccc' }]}
          onPress={handleComplete}>
          <Text style={styles.buttonText}>완료</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (tempCoords.length === 0) {
              Alert.alert('❗ 먼저 블록을 선택해주세요');
              return;
            }
            setModalVisible(true);
          }}>
          <Text style={styles.buttonText}>+ 추가</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>이름 입력</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 상의칸"
              value={blockName}
              onChangeText={setBlockName}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.button, { backgroundColor: '#ccc' }]}> 
                <Text>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveBlock} style={styles.button}>
                <Text style={{ color: '#fff' }}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    alignItems: 'center',
    backgroundColor: '#FFFEFA',
  },
  titleBox: {
    borderColor: '#6AC892',
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#FFFEFA',
    width: '75%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#37955F',
    marginBottom: 20,
  },
  block: {
    borderWidth: 1,
    borderColor: '#6AC892',
    borderRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 4,
  },
  blockLabel: {
    color: '#286E46',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFEFA',
    padding: 20,
    borderRadius: 12,
    width: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#6AC892',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
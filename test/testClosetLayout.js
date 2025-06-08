// test/testClosetLayout.js
import axios from 'axios';

// 서버 주소
const BASE_URL = 'http://localhost:5000';

// 테스트할 데이터
const layoutData = {
  userId: 'testex',
  layoutData: {
    layout_type: '3x4',
    closet_layout: [
      {
        name: '상의칸',
        coords: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 0 },
          { x: 1, y: 1 }
        ]
      },
      {
        name: '하의칸',
        coords: [
          { x: 2, y: 0 },
          { x: 2, y: 1 }
        ]
      }
    ]
  }
};

async function testSaveClosetLayout() {
  try {
    const response = await axios.post(`${BASE_URL}/api/save-closet-layout`, layoutData);
    console.log('✅ 옷장 레이아웃 저장 성공:', response.data);
  } catch (error) {
    console.error('❌ 옷장 레이아웃 저장 실패:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error Message:', error.message);
    }
  }
}

testSaveClosetLayout();

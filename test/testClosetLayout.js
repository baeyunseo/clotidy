import { saveUserInfo, saveClosetLayout } from "../userService.js";

// 1. 유저 문서 생성
const testUserId = "test-user-001";
await saveUserInfo(testUserId, "테스트유저", "test@example.com");

// 2. 옷장 레이아웃 설정 (coords를 객체로 바꿔야 Firestore 저장 가능!)
const layoutData = [
  {
    name: "상의칸",
    coords: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 1, y: 1 }
    ]
  },
  {
    name: "하의칸",
    coords: [
      { x: 2, y: 0 },
      { x: 2, y: 1 }
    ]
  }
];

// 3. 저장 실행
await saveClosetLayout(testUserId, layoutData);

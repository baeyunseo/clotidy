// test/testSaveCloset.js

import { saveClosetLayout } from "../userService.js";

const userId = "testUID1234"; // 아까 저장한 테스트 유저 UID
const layoutData = {
  row1: ["상의", "하의", "잠옷"],
  row2: ["외투", "이너"],
  row3: ["양말", "속옷"]
};


saveClosetLayout(userId, layoutData);

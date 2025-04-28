// test/testSaveUser.js

import { saveUserInfo } from "../userService.js"; // ../로 상위폴더 이동!

// 테스트용 유저 정보
const userId = "testex";
const name = "devup";
const email = "devup@example.com";

// 함수 호출
saveUserInfo(userId, name, email);

import { registerCloth } from "../clothService.js"; 
// 테스트용 데이터
const testUserId = "testUser123";

// 테스트용 옷 정보
const testClothes = [
  {
    clothName: "흰색 반팔 티셔츠",
    category: "상의",
    color: "흰색",
    season: "여름",
    imageUrl: "https://example.com/white-tshirt.jpg",
    location: "옷장 A"
  },
  {
    clothName: "청바지",
    category: "하의",
    color: "청색",
    season: "봄, 가을",
    imageUrl: "https://example.com/jeans.jpg",
    location: "옷장 B"
  }
];

// 옷 등록 테스트 함수
async function runClothTest() {
  for (const cloth of testClothes) {
    await registerCloth(
      testUserId,
      cloth.clothName,
      cloth.category,
      cloth.color,
      cloth.season,
      cloth.imageUrl,
      cloth.location
    );
  }
}

// 테스트 실행
runClothTest();

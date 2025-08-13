// src/navigation/types.ts

// RootStackParamList 타입 정의 파일
// ---------------------------------
// 앱 전체에서 사용할 네비게이터(라우트) 목록과 각 라우트의 파라미터 타입을 명확하게 선언해둔 파일입니다.
// 여러 컴포넌트에서 import하여 공통으로 사용하며, 라우트가 추가/변경될 때 한 곳만 수정하면 됩니다.



export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  Settings: undefined;
  MyPage: undefined;
  EditMyPage: undefined;
  Search: undefined;
  SearchResult: {
  id: string;
  clothName: string;  
  category: string;
  color?: string;
  location?: string;
  imageUrl?: string; 
  };
  Coordinate : undefined;
  ClosetIndex: undefined;    // ✅ 이렇게
  ClosetSelect: undefined;
  ClosetGrid: {
    rows: string;
    cols: string;
    layout_type: string;
  };      // 필요시 파라미터 타입 지정
  ClosetName: {
    rows: string;
    cols: string;
    layout_type: string;
  };
  
  CheckCloset: undefined;
  RegisterCloth: { imageUri: string };  
  BlockClothesList: { location: string };
  Alarm: undefined;
  Closet: undefined;
<<<<<<< HEAD
  Calendar: undefined;
=======
   EditCloth: { clothId: string };
>>>>>>> 18c137e07e1d20ccd3a7864af05fc3588c47b27b
};

  
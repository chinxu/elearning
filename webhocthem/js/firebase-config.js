// ============================================================
// ĐIỀN THÔNG TIN FIREBASE CỦA BẠN VÀO ĐÂY
// Lấy trong Firebase Console > Project settings > General > Your apps
// Nhớ bật: Authentication (Email/Password) và Firestore Database
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDppomhy8wnV1RXkhDKSUr3e9Y5SgKwcms",
  authDomain: "web-quanly-hocthem.firebaseapp.com",
  projectId: "web-quanly-hocthem",
  storageBucket: "web-quanly-hocthem.firebasestorage.app",
  messagingSenderId: "585668548098",
  appId: "1:585668548098:web:a8c8930ce4cfc19bbd391b",
  measurementId: "G-KZNHGM0F2P"
};

// App chính (dùng cho phiên đăng nhập hiện tại: GV hoặc HS)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// App phụ — dùng riêng để GV tạo tài khoản cho học sinh mà KHÔNG bị
// đăng xuất khỏi tài khoản GV (vì createUserWithEmailAndPassword sẽ
// tự động đăng nhập vào tài khoản mới trên app instance đó).
const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = secondaryApp.auth();

// Học sinh không có email thật -> dùng mã HS để tạo email giả nội bộ
function emailFromMaHS(maHS) {
  return `${maHS.toLowerCase()}@hocthem.local`;
}

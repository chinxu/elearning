# Góc của Sơn

Trang chủ của thayson.link. Có 3 mục: **Dự án**, **Blog**, **Truyện**.
Ai cũng xem được. Chỉ tài khoản đã đăng nhập mới thêm, sửa hay xóa được.

## Các file

- `index.html` — trang chính
- `assets/goc.css` — giao diện (vàng–đen, lấy cảm hứng từ template Grungy)
- `assets/goc.js` — chức năng + kết nối Firebase (`webtonghop-38365`)
- `assets/son-chibi.jpg`, `assets/favicon.png` — ảnh chibi
- `viec-cua-son.html` — trang "Việc của Sơn" cũ (có Ghi chú công việc theo tuần), có link ở cuối trang

Muốn xem thử với dữ liệu mẫu thì mở `index.html?demo`.

## Dữ liệu trên Firestore

| Bảng (collection) | Dùng cho |
|---|---|
| `du_an_links` | link dự án (bảng cũ, nên các dự án đã ghim vẫn còn) |
| `blog_posts` | bài blog: title, content, tags, cover, published |
| `truyen` | truyện: title, desc, cover, status |
| `truyen_chuong` | các chương: storyId, title, content, order |

## BẮT BUỘC: cập nhật Firestore Rules

Vào Firebase Console → dự án **webtonghop-38365** → Firestore Database → **Rules**, dán đoạn sau rồi bấm **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /du_an_links/{id}      { allow read: if true; allow write: if request.auth != null; }
    match /ghi_chu_cong_viec/{id} { allow read: if true; allow write: if request.auth != null; }
    match /blog_posts/{id}       { allow read: if true; allow write: if request.auth != null; }
    match /truyen/{id}           { allow read: if true; allow write: if request.auth != null; }
    match /truyen_chuong/{id}    { allow read: if true; allow write: if request.auth != null; }
  }
}
```

## Viết nội dung

Ô nội dung của bài blog và chương truyện hỗ trợ định dạng nhanh:

- Dòng trống → sang đoạn mới
- `## Tiêu đề`
- `**đậm**`, `*nghiêng*`
- `- gạch đầu dòng`
- `> trích dẫn`
- `---` → dấu ngăn cảnh (✱ ✱ ✱)
- `![](https://link-anh.jpg)` → chèn ảnh

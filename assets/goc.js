// =========================================================
// GÓC CỦA SƠN — app một trang (hash router) + Firebase
// Ai cũng xem được; chỉ tài khoản đã đăng nhập mới thêm/sửa/xóa.
// Thêm ?demo vào cuối địa chỉ để xem thử với dữ liệu mẫu (không cần Firebase).
// =========================================================

const firebaseConfig = {
  apiKey: "AIzaSyDUxWBS7c4btMjm9fRQLjORl9bZT9RL5lM",
  authDomain: "webtonghop-38365.firebaseapp.com",
  projectId: "webtonghop-38365",
  storageBucket: "webtonghop-38365.firebasestorage.app",
  messagingSenderId: "804876251387",
  appId: "1:804876251387:web:f76245c813ce962dd8805e"
};

// Tên các bảng (collection) trong Firestore
const COL = {
  projects: "du_an_links",     // dùng lại bảng cũ -> các link dự án đã ghim vẫn còn
  posts: "blog_posts",
  stories: "truyen",
  chapters: "truyen_chuong"
};

const DEMO = new URLSearchParams(location.search).has("demo");
const FB = "https://www.gstatic.com/firebasejs/10.12.2/";

// ---------------------------------------------------------
// Lớp dữ liệu: Firebase thật, hoặc dữ liệu mẫu khi ?demo
// ---------------------------------------------------------
async function firebaseBackend(){
  const [{ initializeApp }, A, F] = await Promise.all([
    import(FB + "firebase-app.js"),
    import(FB + "firebase-auth.js"),
    import(FB + "firebase-firestore.js")
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  return {
    watch(col, cb, onErr){
      return F.onSnapshot(F.collection(db, col),
        s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        onErr);
    },
    add: (col, data) => F.addDoc(F.collection(db, col), { ...data, createdAt: F.serverTimestamp() }),
    update: (col, id, data) => F.updateDoc(F.doc(db, col, id), { ...data, updatedAt: F.serverTimestamp() }),
    remove: (col, id) => F.deleteDoc(F.doc(db, col, id)),
    async batchUpdate(col, items){
      const b = F.writeBatch(db);
      items.forEach(({ id, data }) => b.update(F.doc(db, col, id), data));
      await b.commit();
    },
    onAuth: cb => A.onAuthStateChanged(auth, u => cb(u ? { email: u.email } : null)),
    login: (e, p) => A.signInWithEmailAndPassword(auth, e, p),
    logout: () => A.signOut(auth)
  };
}

function demoBackend(){
  const day = 86400000, now = Date.now();
  const store = {
    [COL.projects]: [
      { id: "p1", name: "Sổ chủ nhiệm", url: "https://thayson.link/chunhiem/", desc: "Quản lý lý lịch, nhận xét học sinh lớp chủ nhiệm.", order: 0 },
      { id: "p2", name: "Web quản lý học thêm", url: "https://thayson.link/webhocthem/", desc: "Điểm danh, điểm số, phụ huynh tra cứu.", order: 1 },
      { id: "p3", name: "Bộ đề KHTN", url: "https://thayson.link/khtn-quiz.html", desc: "Trắc nghiệm KHTN 6 và 8.", order: 2 },
      { id: "p4", name: "Game thẻ bài Đại Việt", url: "https://thayson.link/game.html", order: 3 }
    ],
    [COL.posts]: [
      { id: "b1", title: "Làm robot AI trò chuyện với học sinh", tags: ["dự án", "ESP32"], published: true, createdAt: now - 2 * day,
        content: "Tuần này mình lắp xong phần loa và micro cho con robot.\n\n## Những gì đã làm\n- Hàn lại mạch nguồn\n- Thử giọng nói tiếng Việt\n\n> Học sinh hỏi câu đầu tiên là: \"Robot có biết làm bài tập không?\"\n\nCòn khá nhiều việc, nhưng **vui**." },
      { id: "b2", title: "Ghi chép sau buổi họp phụ huynh", tags: ["chủ nhiệm"], published: true, createdAt: now - 6 * day,
        content: "Buổi họp diễn ra nhẹ nhàng hơn mình nghĩ.\nPhụ huynh góp nhiều ý hay về việc học thêm buổi chiều." },
      { id: "b3", title: "Vì sao mình bắt đầu viết truyện", tags: ["cảm nhận"], published: true, createdAt: now - 12 * day,
        content: "Có những buổi chiều ngồi chấm bài xong, trong đầu cứ hiện ra mấy nhân vật nhỏ." },
      { id: "b4", title: "Bản nháp: kế hoạch tháng 12", tags: ["chủ nhiệm"], published: false, createdAt: now - day, content: "..." }
    ],
    [COL.stories]: [
      { id: "s1", title: "Cậu bé và chiếc đèn pin", desc: "Một cậu bé lớp 6 phát hiện chiếc đèn pin cũ của ông nội có thể soi thấy những điều người lớn đã quên.", status: "writing", createdAt: now - 30 * day },
      { id: "s2", title: "Lớp học cuối hành lang", desc: "Chuyện về một lớp học nhỏ và cô giáo mới.", status: "done", createdAt: now - 60 * day }
    ],
    [COL.chapters]: [
      { id: "c1", storyId: "s1", title: "Chiếc hộp gỗ trên gác", order: 1, createdAt: now - 29 * day,
        content: "Mùa hè năm ấy, Bin được gửi về quê ở với ông bà.\n\nTrên gác có một chiếc hộp gỗ phủ bụi. Bin mở ra, bên trong là chiếc đèn pin vỏ nhôm đã sờn màu.\n\n\"Đừng nghịch cái đó,\" bà nói vọng lên. Nhưng đã muộn." },
      { id: "c2", storyId: "s1", title: "Vệt sáng lạ", order: 2, createdAt: now - 20 * day, content: "Đêm đầu tiên, Bin bật đèn pin lên trần nhà...\n\n---\n\nSáng hôm sau, mọi thứ vẫn y như cũ. Hay là không?" },
      { id: "c3", storyId: "s2", title: "Ngày đầu tiên", order: 1, createdAt: now - 59 * day, content: "Cửa lớp cuối hành lang bao giờ cũng kẹt." }
    ]
  };
  const subs = {};
  let user = null, authCb = () => {};
  const emit = col => (subs[col] || []).forEach(cb => cb(store[col].map(x => ({ ...x }))));
  const uid = () => Math.random().toString(36).slice(2, 10);
  return {
    watch(col, cb){ (subs[col] ||= []).push(cb); setTimeout(() => cb(store[col].map(x => ({ ...x }))), 150); },
    async add(col, data){ store[col].push({ id: uid(), ...data, createdAt: Date.now() }); emit(col); },
    async update(col, id, data){ const it = store[col].find(x => x.id === id); Object.assign(it, data, { updatedAt: Date.now() }); emit(col); },
    async remove(col, id){ store[col] = store[col].filter(x => x.id !== id); emit(col); },
    async batchUpdate(col, items){ items.forEach(({ id, data }) => Object.assign(store[col].find(x => x.id === id), data)); emit(col); },
    onAuth(cb){ authCb = cb; cb(user); },
    async login(email){ user = { email: email || "demo@thayson.link" }; authCb(user); },
    async logout(){ user = null; authCb(null); }
  };
}

// ---------------------------------------------------------
// Trạng thái
// ---------------------------------------------------------
const S = {
  user: null,
  loaded: { projects: false, posts: false, stories: false, chapters: false },
  error: null,
  projects: [], posts: [], stories: [], chapters: []
};
let api;
const $ = (sel, root = document) => root.querySelector(sel);
const view = $("#view");

// ---------------------------------------------------------
// Tiện ích
// ---------------------------------------------------------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ms = t => !t ? 0 : typeof t === "number" ? t : typeof t.toMillis === "function" ? t.toMillis() : (t.seconds ? t.seconds * 1000 : 0);
const pad = n => String(n).padStart(2, "0");
function fmtDate(t){
  const v = ms(t) || Date.now();
  const d = new Date(v);
  return `${pad(d.getDate())} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}
function fmtShort(t){
  const d = new Date(ms(t) || Date.now());
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function readMin(text){
  const w = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(w / 200));
}
function normalizeUrl(raw){
  let u = (raw || "").trim();
  if(!u) return null;
  if(!/^https?:\/\//i.test(u)) u = "https://" + u;
  try{ return new URL(u).href; }catch{ return null; }
}
function domainOf(url){ try{ return new URL(url).hostname.replace(/^www\./, ""); }catch{ return url || ""; } }
function safeUrl(u){ return /^https?:\/\//i.test(u || "") ? u : ""; }
function hashCode(s){ let h = 0; for(const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function excerpt(text, n = 120){
  const plain = String(text || "").replace(/[#>*_`\-\[\]\(\)!]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > n ? plain.slice(0, n).replace(/\s\S*$/, "") + "…" : plain;
}
function toast(msg){
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
const isAdmin = () => !!S.user;

// Định dạng nội dung đơn giản (giống markdown rút gọn)
function inline(s){
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function renderText(text){
  const lines = esc(text || "").replace(/\r/g, "").split("\n");
  const out = [];
  let para = [], list = null;
  const flushPara = () => { if(para.length){ out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; } };
  const flushList = () => { if(list){ out.push(`<ul>${list.map(li => `<li>${inline(li)}</li>`).join("")}</ul>`); list = null; } };
  for(const raw of lines){
    const line = raw.trimEnd();
    let m;
    if(!line.trim()){ flushPara(); flushList(); continue; }
    if((m = line.match(/^###\s+(.*)/))){ flushPara(); flushList(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    if((m = line.match(/^##\s+(.*)/))){ flushPara(); flushList(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
    if(/^(---|\*\*\*)$/.test(line.trim())){ flushPara(); flushList(); out.push("<hr>"); continue; }
    if((m = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/))){ flushPara(); flushList(); out.push(`<img src="${m[2]}" alt="${m[1]}" loading="lazy">`); continue; }
    if((m = line.match(/^&gt;\s?(.*)/))){ flushPara(); flushList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    if((m = line.match(/^[-•]\s+(.*)/))){ flushPara(); (list ||= []).push(m[1]); continue; }
    flushList(); para.push(line);
  }
  flushPara(); flushList();
  return out.join("\n");
}

const ARROW = `<svg viewBox="0 0 20 20" fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12M11 5l5 5-5 5"/></svg>`;
const SQUIGGLE = `<svg class="title-squiggle" viewBox="0 0 70 28" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"><path d="M3 18c6-12 10-12 14 0s8 12 13 0 9-12 14 0 9 12 13 0 7-10 10-4"/></svg>`;
const SQUIG_SMALL = `<svg class="squig" viewBox="0 0 120 18" preserveAspectRatio="none"><path d="M2 9c8-8 12-8 16 0s8 8 16 0 8-8 16 0 8 8 16 0 8-8 16 0 8 8 16 0 8-8 16 0" fill="none" stroke="#111" stroke-width="7" stroke-linecap="round"/><path d="M2 9c8-8 12-8 16 0s8 8 16 0 8-8 16 0 8 8 16 0 8-8 16 0 8 8 16 0 8-8 16 0" fill="none" stroke="#ffde00" stroke-width="3" stroke-linecap="round"/></svg>`;

const STATUS = {
  writing: { label: "Đang viết", cls: "writing" },
  done: { label: "Hoàn thành", cls: "done" },
  pause: { label: "Tạm dừng", cls: "pause" }
};

// ---------------------------------------------------------
// Truy vấn dữ liệu đã sắp xếp
// ---------------------------------------------------------
const projectsSorted = () => [...S.projects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
const postsVisible = () => S.posts
  .filter(p => p.published !== false || isAdmin())
  .sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
const storiesSorted = () => [...S.stories].sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
const chaptersOf = sid => S.chapters.filter(c => c.storyId === sid)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || ms(a.createdAt) - ms(b.createdAt));
function allTags(){
  const m = new Map();
  postsVisible().forEach(p => (p.tags || []).forEach(t => m.set(t, (m.get(t) || 0) + 1)));
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi")).map(e => e[0]);
}

// ---------------------------------------------------------
// Khối giao diện dùng lại
// ---------------------------------------------------------
function coverHtml(item, cls = "cover"){
  const url = safeUrl(item.cover);
  if(url) return `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy">`;
  const v = hashCode(item.id || item.title) % 4;
  return `<div class="cover-fallback v${v}"><span>${esc((item.tags && item.tags[0]) || "Ghi chép")}</span></div>`;
}
function bookHtml(story){
  const url = safeUrl(story.cover);
  if(url) return `<img class="book" src="${esc(url)}" alt="Bìa truyện ${esc(story.title)}" loading="lazy">`;
  return `<div class="book-fallback"><div class="bf-title">${esc(story.title)}</div><div class="bf-author">Sơn viết</div></div>`;
}
function adminBtns(kind, id){
  if(!isAdmin()) return "";
  return `<div class="admin-actions">
    <button class="icon-btn" data-act="edit" data-kind="${kind}" data-id="${id}" title="Sửa" aria-label="Sửa">✎</button>
    <button class="icon-btn danger" data-act="del" data-kind="${kind}" data-id="${id}" title="Xóa" aria-label="Xóa">✕</button>
  </div>`;
}
function projectCard(p, i){
  return `<a class="project-card" href="${esc(p.url)}" target="_blank" rel="noopener" data-id="${p.id}" ${isAdmin() ? 'draggable="true"' : ""}>
    ${adminBtns("project", p.id)}
    <p class="project-num">${pad(i + 1)}</p>
    <h3 class="project-name">${esc(p.name)}</h3>
    ${p.desc ? `<p class="project-desc">${esc(p.desc)}</p>` : ""}
    <p class="project-domain">${esc(domainOf(p.url))}</p>
    <span class="arrow">${ARROW}</span>
  </a>`;
}
function postCard(p){
  const href = `#/blog/${p.id}`;
  return `<article class="blog-card">
    ${adminBtns("post", p.id)}
    ${p.published === false ? `<span class="draft-badge">Nháp</span>` : ""}
    <a class="cover-link" href="${href}">
      ${coverHtml(p)}
      ${p.tags && p.tags[0] ? `<span class="cover-tag">#${esc(p.tags[0])}</span>` : ""}
      ${SQUIG_SMALL}
    </a>
    <h2 class="blog-title"><a href="${href}">${esc(p.title)}</a></h2>
    <p class="blog-excerpt">${esc(excerpt(p.content))}</p>
    <div class="time-box"><span class="time-text">${fmtDate(p.createdAt)}</span><span class="time-text">${readMin(p.content)} phút đọc</span></div>
    <div class="read-box"><a class="read-more" href="${href}"><span class="read-more-text">Đọc bài</span><span class="arrow">${ARROW}</span></a></div>
  </article>`;
}
function storyCard(s){
  const n = chaptersOf(s.id).length;
  const st = STATUS[s.status] || STATUS.writing;
  const href = `#/truyen/${s.id}`;
  return `<article class="story-card">
    ${adminBtns("story", s.id)}
    <a class="story-cover-wrap" href="${href}">${bookHtml(s)}</a>
    <div class="story-body">
      <h3 class="story-title"><a href="${href}">${esc(s.title)}</a></h3>
      ${s.desc ? `<p class="story-desc">${esc(s.desc)}</p>` : ""}
      <div class="time-box"><span class="time-text">${n} chương</span><span class="status-chip ${st.cls}">${st.label}</span></div>
      <div class="read-box"><a class="read-more" href="${href}"><span class="read-more-text">Đọc truyện</span><span class="arrow">${ARROW}</span></a></div>
    </div>
  </article>`;
}
function title(text, moreHref, moreLabel){
  return `<div class="main-title"><h2 class="title-heading">${text}</h2>${SQUIGGLE}${moreHref ? `<a class="pill-btn title-more" href="${moreHref}">${moreLabel} →</a>` : ""}</div>`;
}
function emptyBox(msg, adminMsg){
  return `<div class="empty">${isAdmin() && adminMsg ? adminMsg : msg}</div>`;
}
const allLoaded = (...keys) => keys.every(k => S.loaded[k]);
function loadingOr(keys, fn){
  if(S.error) return `<div class="empty">${S.error}</div>`;
  return allLoaded(...keys) ? fn() : `<p class="loading">Đang tải…</p>`;
}

// ---------------------------------------------------------
// Các trang
// ---------------------------------------------------------
function pageHome(){
  const projects = projectsSorted();
  const posts = postsVisible();
  const stories = storiesSorted();
  return `
  <section class="hero">
    <div class="hero-grid">
      <div class="hero-main">
        <span class="hero-kicker">thayson.link</span>
        <h1 class="hero-title">Góc<br>của Sơn</h1>
        <p class="hero-text">Nơi mình ghim lại các dự án đang làm, ghi chép công việc, vài dòng cảm nhận, và những câu chuyện tự viết.</p>
        <div class="hero-stats">
          <a class="stat" href="#/du-an"><b>${projects.length}</b>dự án</a>
          <a class="stat" href="#/blog"><b>${posts.length}</b>bài viết</a>
          <a class="stat" href="#/truyen"><b>${stories.length}</b>truyện</a>
        </div>
      </div>
      <div class="hero-photo">
        <img src="assets/son-chibi.jpg" alt="Chân dung chibi của Sơn">
        <span class="sticker">Xin chào!</span>
      </div>
    </div>
  </section>

  <section class="section">
    ${title("Dự án", projects.length > 8 ? "#/du-an" : "", "Tất cả dự án")}
    ${loadingOr(["projects"], () => projects.length
      ? `<div class="project-grid">${projects.slice(0, 8).map(projectCard).join("")}</div>`
      : emptyBox("Chưa có dự án nào.", "Chưa có dự án nào — bấm “+ Thêm” để ghim dự án đầu tiên."))}
  </section>

  <section class="section">
    ${title("Blog", posts.length > 3 ? "#/blog" : "", "Tất cả bài viết")}
    ${loadingOr(["posts"], () => posts.length
      ? `<div class="blog-grid">${posts.slice(0, 3).map(postCard).join("")}</div>`
      : emptyBox("Chưa có bài viết nào.", "Chưa có bài viết — bấm “+ Thêm” để viết bài đầu tiên."))}
  </section>

  <section class="section">
    ${title("Truyện", stories.length > 4 ? "#/truyen" : "", "Tất cả truyện")}
    ${loadingOr(["stories", "chapters"], () => stories.length
      ? `<div class="story-grid">${stories.slice(0, 4).map(storyCard).join("")}</div>`
      : emptyBox("Chưa có truyện nào.", "Chưa có truyện — bấm “+ Thêm” để tạo truyện đầu tiên."))}
  </section>`;
}

function pageProjects(){
  const list = projectsSorted();
  return `<section class="section">
    ${title("Dự án")}
    <p class="lead">Các dự án mình đang làm — bấm vào thẻ để mở.${isAdmin() ? " <br><small>Mẹo: kéo một đường link từ trình duyệt thả vào trang này để ghim nhanh; kéo các thẻ để sắp xếp lại.</small>" : ""}</p>
    ${loadingOr(["projects"], () => list.length
      ? `<div class="project-grid" id="project-grid">${list.map(projectCard).join("")}</div>`
      : emptyBox("Chưa có dự án nào.", "Chưa có dự án nào — bấm “+ Thêm” hoặc kéo-thả một đường link vào đây."))}
  </section>`;
}

function pageBlog(tag){
  let list = postsVisible();
  if(tag) list = list.filter(p => (p.tags || []).includes(tag));
  const tags = allTags();
  return `<section class="section">
    ${title(tag ? "#" + esc(tag) : "Blog")}
    <p class="lead">Chi tiết công việc, cảm nhận, và nhật ký các dự án đang làm.</p>
    ${tags.length ? `<div class="tag-row">
      <a class="tag-pill ${!tag ? "active" : ""}" href="#/blog">Tất cả</a>
      ${tags.map(t => `<a class="tag-pill ${t === tag ? "active" : ""}" href="#/blog/tag/${encodeURIComponent(t)}">#${esc(t)}</a>`).join("")}
    </div>` : ""}
    ${loadingOr(["posts"], () => list.length
      ? `<div class="blog-grid">${list.map(postCard).join("")}</div>`
      : emptyBox("Chưa có bài viết nào.", "Chưa có bài viết — bấm “+ Thêm” để viết."))}
  </section>`;
}

function pagePost(id){
  if(!allLoaded("posts")) return `<p class="loading">Đang tải…</p>`;
  const p = S.posts.find(x => x.id === id);
  if(!p || (p.published === false && !isAdmin())) return notFound("Không tìm thấy bài viết này.", "#/blog", "Về Blog");
  const list = postsVisible();
  const i = list.findIndex(x => x.id === id);
  const newer = list[i - 1], older = list[i + 1];
  const hasCover = !!safeUrl(p.cover);
  document.title = `${p.title} — Góc của Sơn`;
  return `<article class="post-wrap" style="position:relative">
    ${adminBtns("post", p.id)}
    <div class="post-head ${hasCover ? "" : "no-cover"}">
      ${hasCover ? coverHtml(p) : ""}
      <div>
        <div class="time-box"><span class="time-text">${fmtDate(p.createdAt)}</span><span class="time-text">${readMin(p.content)} phút đọc</span></div>
        <h1 class="post-title">${esc(p.title)}</h1>
        ${p.published === false ? `<span class="status-chip pause">Bản nháp — chỉ mình bạn thấy</span>` : ""}
        ${(p.tags || []).length ? `<div class="post-tags">${p.tags.map(t => `<a href="#/blog/tag/${encodeURIComponent(t)}">#${esc(t)}</a>`).join("")}</div>` : ""}
      </div>
    </div>
    <div class="rich">${renderText(p.content)}</div>
  </article>
  <div class="back-row">
    ${newer ? `<a class="pill-btn" href="#/blog/${newer.id}">← ${esc(excerpt(newer.title, 40))}</a>` : `<a class="pill-btn" href="#/blog">← Về Blog</a>`}
    ${older ? `<a class="pill-btn" href="#/blog/${older.id}">${esc(excerpt(older.title, 40))} →</a>` : ""}
  </div>`;
}

function pageStories(){
  const list = storiesSorted();
  return `<section class="section">
    ${title("Truyện")}
    <p class="lead">Những câu chuyện mình tự viết. Chọn một truyện để xem danh sách chương.</p>
    ${loadingOr(["stories", "chapters"], () => list.length
      ? `<div class="story-grid">${list.map(storyCard).join("")}</div>`
      : emptyBox("Chưa có truyện nào.", "Chưa có truyện — bấm “+ Thêm” để tạo truyện mới."))}
  </section>`;
}

function pageStory(id){
  if(!allLoaded("stories", "chapters")) return `<p class="loading">Đang tải…</p>`;
  const s = S.stories.find(x => x.id === id);
  if(!s) return notFound("Không tìm thấy truyện này.", "#/truyen", "Về Truyện");
  const chs = chaptersOf(id);
  const st = STATUS[s.status] || STATUS.writing;
  const last = chs.length ? chs.reduce((a, b) => ms(b.createdAt) > ms(a.createdAt) ? b : a) : null;
  document.title = `${s.title} — Góc của Sơn`;
  return `<section class="story-hero">
      ${adminBtns("story", s.id)}
      <div>${bookHtml(s)}</div>
      <div class="story-info">
        <div class="story-meta"><span class="status-chip ${st.cls}">${st.label}</span><span class="meta">${chs.length} chương</span>${last ? `<span class="meta">· cập nhật ${fmtShort(last.createdAt)}</span>` : ""}</div>
        <h1>${esc(s.title)}</h1>
        ${s.desc ? `<p class="story-intro">${esc(s.desc)}</p>` : ""}
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${chs.length ? `<a class="read-more" href="#/truyen/${s.id}/${chs[0].id}"><span class="read-more-text">Đọc từ đầu</span><span class="arrow">${ARROW}</span></a>` : ""}
          ${chs.length > 1 ? `<a class="pill-btn" style="align-self:center" href="#/truyen/${s.id}/${chs[chs.length - 1].id}">Chương mới nhất</a>` : ""}
          ${isAdmin() ? `<button class="pill-btn yellow" style="align-self:center" data-act="add-chapter" data-id="${s.id}">+ Thêm chương</button>` : ""}
        </div>
      </div>
    </section>
    <section class="section" style="padding-top:40px">
      ${title("Mục lục")}
      ${chs.length ? `<div class="chapter-list">${chs.map((c, i) => `
        <a class="chapter-row" href="#/truyen/${s.id}/${c.id}">
          <span class="ch-num">${i + 1}</span>
          <span class="ch-title">${esc(c.title || "Chương " + (i + 1))}</span>
          <span class="ch-date">${fmtShort(c.createdAt)}</span>
          ${isAdmin() ? `<span class="ch-admin">
            <button class="icon-btn" data-act="move-up" data-id="${c.id}" title="Lên" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="icon-btn" data-act="move-down" data-id="${c.id}" title="Xuống" ${i === chs.length - 1 ? "disabled" : ""}>↓</button>
            <button class="icon-btn" data-act="edit" data-kind="chapter" data-id="${c.id}" title="Sửa">✎</button>
            <button class="icon-btn danger" data-act="del" data-kind="chapter" data-id="${c.id}" title="Xóa">✕</button>
          </span>` : ""}
        </a>`).join("")}</div>`
      : emptyBox("Truyện này chưa có chương nào.", "Chưa có chương — bấm “+ Thêm chương” để viết chương 1.")}
    </section>`;
}

function getReadSize(){ try{ return +localStorage.getItem("goc-read-size") || 19; }catch{ return 19; } }
function setReadSize(v){ try{ localStorage.setItem("goc-read-size", v); }catch{} }

function pageChapter(sid, cid){
  if(!allLoaded("stories", "chapters")) return `<p class="loading">Đang tải…</p>`;
  const s = S.stories.find(x => x.id === sid);
  const chs = chaptersOf(sid);
  const i = chs.findIndex(c => c.id === cid);
  if(!s || i < 0) return notFound("Không tìm thấy chương này.", `#/truyen/${sid}`, "Về truyện");
  const c = chs[i], prev = chs[i - 1], next = chs[i + 1];
  document.title = `${c.title || "Chương " + (i + 1)} · ${s.title} — Góc của Sơn`;
  const nav = `<div class="reader-nav">
      <a class="pill-btn" href="${prev ? `#/truyen/${sid}/${prev.id}` : "#"}" aria-disabled="${!prev}">← Chương trước</a>
      <a class="pill-btn dark" href="#/truyen/${sid}">Mục lục</a>
      <a class="pill-btn yellow" href="${next ? `#/truyen/${sid}/${next.id}` : "#"}" aria-disabled="${!next}">Chương sau →</a>
    </div>`;
  return `<div class="reader">
    <div class="reader-top">
      <a class="pill-btn" href="#/truyen/${sid}">← ${esc(s.title)}</a>
      <div class="font-ctrl">
        <button class="icon-btn" data-act="font-down" title="Chữ nhỏ hơn">A−</button>
        <button class="icon-btn" data-act="font-up" title="Chữ to hơn">A+</button>
        ${isAdmin() ? `<button class="pill-btn yellow" data-act="edit" data-kind="chapter" data-id="${c.id}">✎ Sửa chương</button>` : ""}
      </div>
    </div>
    <article class="paper">
      <a class="story-name" href="#/truyen/${sid}">${esc(s.title)}</a>
      <h1>Chương ${i + 1}${c.title ? ": " + esc(c.title) : ""}</h1>
      <div class="ch-meta">Đăng ngày ${fmtDate(c.createdAt)} · khoảng ${readMin(c.content)} phút đọc</div>
      <div class="reading" style="--read-size:${getReadSize()}px">${renderText(c.content)}</div>
    </article>
    ${nav}
  </div>`;
}

function notFound(msg, href, label){
  return `<section class="section"><div class="empty">${msg}<br><br><a class="pill-btn" href="${href}">${label}</a></div></section>`;
}

// ---------------------------------------------------------
// Router
// ---------------------------------------------------------
function parseRoute(){
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  return parts;
}
let lastRouteKey = "";
function render(){
  const r = parseRoute();
  const key = r.join("/");
  const routeChanged = key !== lastRouteKey;
  lastRouteKey = key;
  document.title = "Góc của Sơn";
  let html, nav = "home";
  if(!r.length) html = pageHome();
  else if(r[0] === "du-an"){ nav = "du-an"; html = pageProjects(); }
  else if(r[0] === "blog"){
    nav = "blog";
    if(r[1] === "tag") html = pageBlog(r[2]);
    else if(r[1]) html = pagePost(r[1]);
    else html = pageBlog();
  }
  else if(r[0] === "truyen"){
    nav = "truyen";
    if(r[2]) html = pageChapter(r[1], r[2]);
    else if(r[1]) html = pageStory(r[1]);
    else html = pageStories();
  }
  else html = notFound("Trang không tồn tại.", "#/", "Về trang chủ");

  const y = window.scrollY;
  view.innerHTML = html;
  if(routeChanged) window.scrollTo(0, 0); else window.scrollTo(0, y);

  document.querySelectorAll(".menu-item").forEach(a => a.classList.toggle("current", a.dataset.route === nav));
  $("#nav-menu").classList.remove("open");
  renderChrome();
  updateFab(r);
  if(r[0] === "du-an") wireProjectDnD();
}

function renderChrome(){
  // dải chữ chạy: bài viết + chương mới nhất
  const items = [
    ...postsVisible().filter(p => p.published !== false).slice(0, 6).map(p => ({ t: ms(p.createdAt), text: p.title, href: `#/blog/${p.id}` })),
    ...[...S.chapters].sort((a, b) => ms(b.createdAt) - ms(a.createdAt)).slice(0, 4).map(c => {
      const s = S.stories.find(x => x.id === c.storyId);
      return s ? { t: ms(c.createdAt), text: `${s.title} — ${c.title || "chương mới"}`, href: `#/truyen/${s.id}/${c.id}` } : null;
    }).filter(Boolean)
  ].sort((a, b) => b.t - a.t);
  const fallback = [{ text: "Chào mừng đến Góc của Sơn", href: "#/" }, { text: "Dự án · Blog · Truyện", href: "#/" }];
  const list = items.length ? items : fallback;
  const one = list.map(i => `<a class="ticker-item" href="${i.href}">${esc(i.text)}</a>`).join("");
  const reps = Math.max(2, Math.ceil(8 / list.length) * 2);
  const html = Array.from({ length: reps }, () => one).join("");
  const tk = $("#ticker");
  if(tk.dataset.sig !== html){ tk.innerHTML = html; tk.dataset.sig = html; }

  const tags = allTags();
  $("#footer-tags").innerHTML = tags.length
    ? tags.map(t => `<a class="tag-pill" href="#/blog/tag/${encodeURIComponent(t)}">#${esc(t)}</a>`).join("")
    : `<span>Chủ đề sẽ hiện ở đây khi có bài viết gắn thẻ.</span>`;
}

function updateFab(r){
  const fab = $("#fab");
  fab.hidden = !isAdmin() || (r[0] === "truyen" && r[2]) || (r[0] === "blog" && r[1] && r[1] !== "tag");
  const labels = { "du-an": "+ Dự án", blog: "+ Bài viết", truyen: r[1] ? "+ Chương" : "+ Truyện" };
  fab.textContent = labels[r[0]] || "+ Thêm";
}

// ---------------------------------------------------------
// Form / modal
// ---------------------------------------------------------
function openForm({ heading, fields, submit = "Lưu", wide = false, onSubmit }){
  const root = $("#modal-root");
  root.innerHTML = `<div class="modal-bg"><div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${esc(heading)}</h3><button class="icon-btn" data-close aria-label="Đóng">✕</button></div>
    <form novalidate>
      <div class="form-error" hidden></div>
      ${fields.map(f => {
        const id = "f-" + f.name;
        const v = f.value ?? "";
        let input;
        if(f.type === "textarea") input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 6}" placeholder="${esc(f.placeholder || "")}">${esc(v)}</textarea>`;
        else if(f.type === "select") input = `<select id="${id}" name="${f.name}">${f.options.map(o => `<option value="${o.value}" ${o.value === v ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select>`;
        else if(f.type === "checkbox") return `<div class="field check"><label><input type="checkbox" name="${f.name}" ${v ? "checked" : ""}> ${esc(f.label)}</label></div>`;
        else input = `<input id="${id}" type="${f.type || "text"}" name="${f.name}" value="${esc(v)}" placeholder="${esc(f.placeholder || "")}" ${f.type === "password" ? 'autocomplete="current-password"' : ""}>`;
        return `<div class="field"><label for="${id}">${esc(f.label)}</label>${input}${f.hint ? `<div class="hint">${f.hint}</div>` : ""}</div>`;
      }).join("")}
      <div class="form-actions">
        <button type="button" class="pill-btn" data-close>Hủy</button>
        <button type="submit" class="pill-btn dark">${esc(submit)}</button>
      </div>
    </form>
  </div></div>`;
  const bg = root.firstElementChild, form = $("form", bg), err = $(".form-error", bg);
  const close = () => { root.innerHTML = ""; document.removeEventListener("keydown", onKey); };
  const onKey = e => { if(e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  bg.addEventListener("mousedown", e => { if(e.target === bg) close(); });
  bg.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", close));
  setTimeout(() => form.querySelector("input,textarea")?.focus(), 30);
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const data = {};
    fields.forEach(f => {
      const el = form.elements[f.name];
      data[f.name] = f.type === "checkbox" ? el.checked : el.value.trim();
    });
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try{
      const msg = await onSubmit(data);
      if(typeof msg === "string"){ err.textContent = msg; err.hidden = false; btn.disabled = false; return; }
      close();
    }catch(ex){
      console.error(ex);
      err.textContent = ex?.code === "permission-denied"
        ? "Firestore từ chối ghi (permission-denied). Kiểm tra lại Rules — xem hướng dẫn trong README."
        : "Không lưu được, thử lại nhé. (" + (ex?.message || ex) + ")";
      err.hidden = false; btn.disabled = false;
    }
  });
}

const TEXT_HINT = "Định dạng nhanh: dòng trống = đoạn mới · <code>## Tiêu đề</code> · <code>**đậm**</code> · <code>*nghiêng*</code> · <code>- gạch đầu dòng</code> · <code>&gt; trích dẫn</code> · <code>---</code> ngăn cảnh · <code>![](link ảnh)</code>";

function formProject(p){
  openForm({
    heading: p?.id ? "Sửa dự án" : "Ghim dự án mới",
    submit: p?.id ? "Lưu" : "Ghim",
    fields: [
      { name: "name", label: "Tên dự án", value: p?.name, placeholder: "VD: Sổ chủ nhiệm" },
      { name: "url", label: "Đường link", type: "url", value: p?.url, placeholder: "https://…" },
      { name: "desc", label: "Mô tả ngắn (không bắt buộc)", value: p?.desc, placeholder: "Một dòng giới thiệu" }
    ],
    async onSubmit(d){
      const url = normalizeUrl(d.url);
      if(!d.name || !url) return "Cần nhập tên và đường link hợp lệ.";
      const data = { name: d.name, url, desc: d.desc };
      if(p?.id) await api.update(COL.projects, p.id, data);
      else{
        const max = S.projects.reduce((m, x) => Math.max(m, x.order ?? 0), -1);
        await api.add(COL.projects, { ...data, order: max + 1 });
      }
      toast("Đã lưu dự án");
    }
  });
}

function formPost(p){
  openForm({
    heading: p ? "Sửa bài viết" : "Viết bài mới",
    submit: p ? "Lưu" : "Đăng",
    wide: true,
    fields: [
      { name: "title", label: "Tiêu đề", value: p?.title },
      { name: "tags", label: "Chủ đề (cách nhau bằng dấu phẩy)", value: (p?.tags || []).join(", "), placeholder: "dự án, chủ nhiệm, cảm nhận", hint: allTags().length ? "Đã có: " + allTags().map(esc).join(", ") : "" },
      { name: "cover", label: "Link ảnh bìa (không bắt buộc)", type: "url", value: p?.cover, placeholder: "https://…/anh.jpg" },
      { name: "content", label: "Nội dung", type: "textarea", rows: 16, value: p?.content, hint: TEXT_HINT },
      { name: "draft", label: "Lưu nháp (chưa hiện cho người xem)", type: "checkbox", value: p ? p.published === false : false }
    ],
    async onSubmit(d){
      if(!d.title || !d.content) return "Cần có tiêu đề và nội dung.";
      const tags = [...new Set(d.tags.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean))];
      const data = { title: d.title, tags, cover: normalizeUrl(d.cover) || "", content: d.content, published: !d.draft };
      if(p) await api.update(COL.posts, p.id, data);
      else await api.add(COL.posts, data);
      toast(d.draft ? "Đã lưu nháp" : "Đã đăng bài");
    }
  });
}

function formStory(s){
  openForm({
    heading: s ? "Sửa thông tin truyện" : "Tạo truyện mới",
    submit: s ? "Lưu" : "Tạo truyện",
    fields: [
      { name: "title", label: "Tên truyện", value: s?.title },
      { name: "desc", label: "Giới thiệu", type: "textarea", rows: 4, value: s?.desc },
      { name: "cover", label: "Link ảnh bìa (không bắt buộc)", type: "url", value: s?.cover, hint: "Để trống thì web tự tạo bìa đen–vàng với tên truyện." },
      { name: "status", label: "Tình trạng", type: "select", value: s?.status || "writing",
        options: Object.entries(STATUS).map(([value, o]) => ({ value, label: o.label })) }
    ],
    async onSubmit(d){
      if(!d.title) return "Cần có tên truyện.";
      const data = { title: d.title, desc: d.desc, cover: normalizeUrl(d.cover) || "", status: d.status };
      if(s) await api.update(COL.stories, s.id, data);
      else await api.add(COL.stories, data);
      toast("Đã lưu truyện");
    }
  });
}

function formChapter(storyId, c){
  const chs = chaptersOf(storyId);
  openForm({
    heading: c ? "Sửa chương" : `Thêm chương ${chs.length + 1}`,
    submit: c ? "Lưu" : "Đăng chương",
    wide: true,
    fields: [
      { name: "title", label: "Tên chương", value: c?.title, placeholder: "VD: Chiếc hộp gỗ trên gác" },
      { name: "content", label: "Nội dung chương", type: "textarea", rows: 20, value: c?.content, hint: TEXT_HINT }
    ],
    async onSubmit(d){
      if(!d.content) return "Chương chưa có nội dung.";
      if(c) await api.update(COL.chapters, c.id, { title: d.title, content: d.content });
      else{
        const max = chs.reduce((m, x) => Math.max(m, x.order ?? 0), 0);
        await api.add(COL.chapters, { storyId, title: d.title, content: d.content, order: max + 1 });
      }
      toast("Đã lưu chương");
    }
  });
}

async function confirmDelete(kind, id){
  const names = { project: "dự án", post: "bài viết", story: "truyện", chapter: "chương" };
  let extra = "";
  if(kind === "story"){
    const n = chaptersOf(id).length;
    if(n) extra = `\n\nTruyện có ${n} chương — các chương cũng sẽ bị xóa.`;
  }
  if(!window.confirm(`Xóa ${names[kind]} này?${extra}`)) return;
  try{
    if(kind === "project") await api.remove(COL.projects, id);
    if(kind === "post"){ await api.remove(COL.posts, id); if(parseRoute()[1] === id) location.hash = "#/blog"; }
    if(kind === "chapter") await api.remove(COL.chapters, id);
    if(kind === "story"){
      for(const c of chaptersOf(id)) await api.remove(COL.chapters, c.id);
      await api.remove(COL.stories, id);
      if(parseRoute()[1] === id) location.hash = "#/truyen";
    }
    toast("Đã xóa");
  }catch(e){ console.error(e); toast("Không xóa được"); }
}

async function moveChapter(cid, dir){
  const c = S.chapters.find(x => x.id === cid);
  const chs = chaptersOf(c.storyId);
  const i = chs.findIndex(x => x.id === cid), j = i + dir;
  if(j < 0 || j >= chs.length) return;
  [chs[i], chs[j]] = [chs[j], chs[i]];
  await api.batchUpdate(COL.chapters, chs.map((x, k) => ({ id: x.id, data: { order: k + 1 } })));
}

function formLogin(){
  openForm({
    heading: "Đăng nhập",
    submit: "Đăng nhập",
    fields: [
      { name: "email", label: "Email", type: "email", placeholder: DEMO ? "chế độ demo: nhập gì cũng được" : "" },
      { name: "password", label: "Mật khẩu", type: "password" }
    ],
    async onSubmit(d){
      try{ await api.login(d.email, d.password); }
      catch{ return "Sai email hoặc mật khẩu."; }
    }
  });
}

// ---------------------------------------------------------
// Sự kiện
// ---------------------------------------------------------
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const { act, kind, id } = b.dataset;
  if(act === "edit"){
    if(kind === "project") formProject(S.projects.find(x => x.id === id));
    if(kind === "post") formPost(S.posts.find(x => x.id === id));
    if(kind === "story") formStory(S.stories.find(x => x.id === id));
    if(kind === "chapter"){ const c = S.chapters.find(x => x.id === id); formChapter(c.storyId, c); }
  }
  if(act === "del") confirmDelete(kind, id);
  if(act === "add-chapter") formChapter(id);
  if(act === "move-up") moveChapter(id, -1);
  if(act === "move-down") moveChapter(id, 1);
  if(act === "font-up" || act === "font-down"){
    const v = Math.min(26, Math.max(15, getReadSize() + (act === "font-up" ? 1 : -1)));
    setReadSize(v);
    const r = $(".reading"); if(r) r.style.setProperty("--read-size", v + "px");
  }
}, true);

$("#fab").addEventListener("click", () => {
  const r = parseRoute();
  if(r[0] === "du-an") return formProject();
  if(r[0] === "blog") return formPost();
  if(r[0] === "truyen" && r[1]) return formChapter(r[1]);
  if(r[0] === "truyen") return formStory();
  // trang chủ: chọn loại
  const root = $("#modal-root");
  root.innerHTML = `<div class="modal-bg"><div class="modal"><div class="modal-head"><h3>Thêm mới</h3><button class="icon-btn" data-x>✕</button></div>
    <form style="display:grid;gap:12px">
      <button type="button" class="pill-btn" data-pick="p" style="font-size:22px;padding:12px 18px">📌 Ghim dự án</button>
      <button type="button" class="pill-btn" data-pick="b" style="font-size:22px;padding:12px 18px">✍️ Viết bài blog</button>
      <button type="button" class="pill-btn" data-pick="s" style="font-size:22px;padding:12px 18px">📖 Tạo truyện mới</button>
    </form></div></div>`;
  root.querySelector("[data-x]").onclick = () => root.innerHTML = "";
  root.firstElementChild.addEventListener("mousedown", ev => { if(ev.target === root.firstElementChild) root.innerHTML = ""; });
  root.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => {
    root.innerHTML = "";
    ({ p: formProject, b: formPost, s: formStory })[b.dataset.pick]();
  });
});

$("#login-btn").addEventListener("click", formLogin);
$("#logout-btn").addEventListener("click", () => api.logout());
$("#menu-toggle").addEventListener("click", () => $("#nav-menu").classList.toggle("open"));
window.addEventListener("hashchange", render);
$("#year").textContent = new Date().getFullYear();

// Kéo-thả: thả link để ghim + kéo thẻ để sắp xếp (trang Dự án)
let dragId = null, hint = null;
function showHint(on){
  if(on && !hint){ hint = document.createElement("div"); hint.className = "drop-hint"; hint.textContent = "Thả để ghim dự án"; document.body.appendChild(hint); }
  if(!on && hint){ hint.remove(); hint = null; }
}
function wireProjectDnD(){
  const grid = $("#project-grid");
  if(!grid || !isAdmin()) return;
  grid.querySelectorAll(".project-card").forEach(card => {
    card.addEventListener("dragstart", e => { dragId = card.dataset.id; card.classList.add("dragging"); e.dataTransfer.setData("application/x-goc", dragId); e.dataTransfer.effectAllowed = "move"; });
    card.addEventListener("dragend", () => { dragId = null; card.classList.remove("dragging"); });
  });
}
document.addEventListener("dragover", e => {
  if(!isAdmin() || parseRoute()[0] !== "du-an") return;
  e.preventDefault();
  if(!dragId) showHint(true);
});
document.addEventListener("dragleave", e => { if(!e.relatedTarget) showHint(false); });
document.addEventListener("drop", async e => {
  if(!isAdmin() || parseRoute()[0] !== "du-an") return;
  e.preventDefault();
  showHint(false);
  if(dragId){
    const list = projectsSorted();
    const from = list.findIndex(x => x.id === dragId);
    const target = e.target.closest(".project-card");
    const [moved] = list.splice(from, 1);
    if(target && target.dataset.id !== moved.id) list.splice(list.findIndex(x => x.id === target.dataset.id), 0, moved);
    else list.push(moved);
    dragId = null;
    try{ await api.batchUpdate(COL.projects, list.map((x, i) => ({ id: x.id, data: { order: i } }))); }
    catch(err){ console.error(err); toast("Không sắp xếp được"); }
    return;
  }
  const url = normalizeUrl(e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain"));
  if(url) formProject({ name: domainOf(url), url });
});

// ---------------------------------------------------------
// Khởi động
// ---------------------------------------------------------
(async function start(){
  if(DEMO) api = demoBackend();
  else{
    try{ api = await firebaseBackend(); }
    catch(e){
      console.error(e);
      S.error = "Không kết nối được máy chủ dữ liệu. Kiểm tra mạng rồi tải lại trang.";
      render(); return;
    }
  }
  api.onAuth(u => {
    S.user = u;
    $("#login-btn").hidden = !!u;
    $("#logout-btn").hidden = !u;
    $("#auth-email").hidden = !u;
    $("#auth-email").textContent = u ? u.email : "";
    render();
  });
  const watch = (key, col) => api.watch(col, docs => {
    S[key] = docs; S.loaded[key] = true;
    render();
  }, err => {
    console.error(col, err);
    S.loaded[key] = true;
    S.error = err?.code === "permission-denied"
      ? `Chưa có quyền đọc bảng “${col}”. Cần cập nhật Firestore Rules (xem README).`
      : "Không tải được dữ liệu.";
    render();
  });
  watch("projects", COL.projects);
  watch("posts", COL.posts);
  watch("stories", COL.stories);
  watch("chapters", COL.chapters);
  render();
})();

// ============================================================
// STATE
// ============================================================
let currentNamHocId = null;
let currentLopId = null;
let namHocList = [];
let lopList = [];
let hsList = [];
let deList = [];

// ============================================================
// AUTH (GV)
// ============================================================
function loginGV() {
  const email = document.getElementById('gvEmail').value.trim();
  const pass = document.getElementById('gvPass').value;
  document.getElementById('loginError').textContent = '';
  auth.signInWithEmailAndPassword(email, pass)
    .catch(err => document.getElementById('loginError').textContent = dichLoi(err));
}

function registerGV() {
  const email = document.getElementById('gvEmail').value.trim();
  const pass = document.getElementById('gvPass').value;
  if (!email || pass.length < 6) {
    document.getElementById('loginError').textContent = 'Nhập email và mật khẩu (tối thiểu 6 ký tự).';
    return;
  }
  auth.createUserWithEmailAndPassword(email, pass)
    .catch(err => document.getElementById('loginError').textContent = dichLoi(err));
}

function logoutGV() { auth.signOut(); }

auth.onAuthStateChanged(user => {
  if (user && !user.email.endsWith('@hocthem.local')) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appShell').style.display = 'flex';
    document.getElementById('gvEmailLabel').textContent = user.email;
    initApp();
  } else if (!user) {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appShell').style.display = 'none';
  }
});

function dichLoi(err) {
  const map = {
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/user-not-found': 'Không tìm thấy tài khoản.',
    'auth/wrong-password': 'Sai mật khẩu.',
    'auth/email-already-in-use': 'Email đã được sử dụng.',
    'auth/weak-password': 'Mật khẩu quá yếu (tối thiểu 6 ký tự).'
  };
  return map[err.code] || err.message;
}

// ============================================================
// KHỞI TẠO
// ============================================================
async function initApp() {
  try {
    await loadNamHoc();
    await loadDe();
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu:', err);
    document.querySelector('.main').insertAdjacentHTML('afterbegin',
      `<div class="card" style="border-color:var(--red-pen); background:var(--red-pen-soft);">
         <b>Có lỗi khi tải dữ liệu:</b> ${escapeHtml(err.message || String(err))}
         <div class="muted" style="margin-top:4px;">Mở DevTools (F12) → tab Console để xem chi tiết đầy đủ, hoặc chụp lại dòng này gửi để kiểm tra tiếp.</div>
       </div>`);
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');
}

// ============================================================
// NĂM HỌC
// ============================================================
async function loadNamHoc() {
  const snap = await db.collection('namHoc').orderBy('ten', 'desc').get();
  namHocList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const sel = document.getElementById('namHocSelect');
  sel.innerHTML = namHocList.map(n => `<option value="${n.id}">${escapeHtml(n.ten)}</option>`).join('');
  if (namHocList.length === 0) {
    document.getElementById('lopChips').innerHTML = '<p class="muted">Hãy tạo năm học đầu tiên.</p>';
    return;
  }
  currentNamHocId = namHocList[0].id;
  sel.value = currentNamHocId;
  await loadLop();
}

function onNamHocChange() {
  currentNamHocId = document.getElementById('namHocSelect').value;
  currentLopId = null;
  loadLop();
}

function openNamHocModal() {
  showModal(`
    <h3>Tạo năm học mới</h3>
    <div class="field"><label>Tên năm học (vd: 2026-2027)</label><input type="text" id="mNamHocTen"></div>
    <div class="row" style="justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveNamHoc()">Lưu</button>
    </div>`);
}
async function saveNamHoc() {
  const ten = document.getElementById('mNamHocTen').value.trim();
  if (!ten) return;
  const ref = await db.collection('namHoc').add({ ten, createdAt: Date.now() });
  closeModal();
  await loadNamHoc();
  currentNamHocId = ref.id;
  document.getElementById('namHocSelect').value = ref.id;
  await loadLop();
}

// ============================================================
// LỚP
// ============================================================
async function loadLop() {
  if (!currentNamHocId) return;
  const snap = await db.collection('namHoc').doc(currentNamHocId).collection('lop').orderBy('ten').get();
  lopList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderLopChips();
  capNhatBdLopSelect();
  capNhatHtLopSelect();
  if (lopList.length && !currentLopId) currentLopId = lopList[0].id;
  await loadHocSinh();
}

function renderLopChips() {
  const el = document.getElementById('lopChips');
  if (!lopList.length) { el.innerHTML = '<p class="muted">Chưa có lớp nào trong năm học này.</p>'; return; }
  el.innerHTML = lopList.map(l => `
    <button class="btn ${l.id === currentLopId ? 'btn-primary' : 'btn-outline'}" onclick="selectLop('${l.id}')">
      ${escapeHtml(l.ten)}
    </button>`).join('') +
    `<button class="btn btn-outline" style="margin-left:8px;" onclick="moGopLopModal()">🔀 Gộp lớp hiện tại vào lớp khác</button>` +
    `<button class="btn btn-danger" style="margin-left:8px;" onclick="deleteLop()">Xóa lớp hiện tại</button>`;
}

// Gộp toàn bộ học sinh (tài khoản, lịch sử điểm hàng tháng) của lớp đang xem vào 1 lớp khác,
// rồi xóa lớp đang xem — dùng để dọn các lớp bị trùng/tạo nhầm.
function moGopLopModal() {
  if (!currentLopId) { alert('Hãy chọn lớp trước.'); return; }
  const lopHienTai = lopList.find(l => l.id === currentLopId);
  const dsLopKhac = lopList.filter(l => l.id !== currentLopId);
  if (!dsLopKhac.length) { alert('Chưa có lớp nào khác để gộp vào.'); return; }
  showModal(`
    <h3>Gộp lớp "${escapeHtml(lopHienTai.ten)}" vào lớp khác</h3>
    <p class="muted">Toàn bộ học sinh của lớp này (kèm tài khoản đăng nhập, lịch sử điểm hàng tháng) sẽ được chuyển sang lớp bạn chọn bên dưới. Sau khi gộp xong, lớp "${escapeHtml(lopHienTai.ten)}" sẽ bị xóa. Không thể hoàn tác.</p>
    <div class="field"><label>Gộp vào lớp</label>
      <select id="mGopLopDich">${dsLopKhac.map(l => `<option value="${l.id}">${escapeHtml(l.ten)}</option>`).join('')}</select>
    </div>
    <div class="row" style="justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-danger" onclick="gopLop()">Gộp ngay</button>
    </div>`);
}
async function gopLop() {
  const lopNguonId = currentLopId;
  const lopDichId = document.getElementById('mGopLopDich').value;
  if (!confirm('Gộp lớp này vào lớp đã chọn? Không thể hoàn tác.')) return;
  const colNguon = db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopNguonId).collection('hocSinh');
  const colDich = db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopDichId).collection('hocSinh');
  const hsSnap = await colNguon.get();
  const batch = db.batch();
  for (const d of hsSnap.docs) {
    const data = d.data();
    const refMoi = colDich.doc();
    batch.set(refMoi, data);
    const diemSnap = await colNguon.doc(d.id).collection('diemThang').get();
    diemSnap.docs.forEach(dd => batch.set(refMoi.collection('diemThang').doc(dd.id), dd.data()));
    batch.delete(d.ref);
    if (data.uid) batch.set(db.collection('taiKhoanHocSinh').doc(data.uid), { namHocId: currentNamHocId, lopId: lopDichId, hsId: refMoi.id });
  }
  batch.delete(db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopNguonId));
  await batch.commit();
  closeModal();
  currentLopId = lopDichId;
  await loadLop();
  alert(`Đã gộp xong ${hsSnap.docs.length} học sinh.`);
}
function selectLop(id) { currentLopId = id; renderLopChips(); loadHocSinh(); }

function openLopModal() {
  if (!currentNamHocId) { alert('Hãy tạo năm học trước.'); return; }
  showModal(`
    <h3>Tạo lớp mới</h3>
    <div class="field"><label>Tên lớp (vd: Toán 9 - Tối 3-5-7)</label><input type="text" id="mLopTen"></div>
    <div class="row" style="justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveLop()">Lưu</button>
    </div>`);
}
async function saveLop() {
  const ten = document.getElementById('mLopTen').value.trim();
  if (!ten) return;
  const ref = await db.collection('namHoc').doc(currentNamHocId).collection('lop').add({ ten });
  closeModal();
  currentLopId = ref.id;
  await loadLop();
}
async function deleteLop() {
  if (!currentLopId) return;
  if (!confirm('Xóa lớp này? Toàn bộ học sinh trong lớp cũng sẽ bị xóa khỏi danh sách (tài khoản đăng nhập không bị xóa).')) return;
  const hsSnap = await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(currentLopId).collection('hocSinh').get();
  const batch = db.batch();
  hsSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(currentLopId));
  await batch.commit();
  currentLopId = null;
  await loadLop();
}

// ============================================================
// HỌC SINH — hiển thị kiểu trang tính, dán được từ Excel
// ============================================================
let dangChinhSuaHs = false;
const HS_COLS = ['stt', 'lop', 'hoTen', 'sdtPhuHuynh', 'ngayBatDau'];

// Chuẩn hóa tên lớp để so khớp không phân biệt hoa/thường và khoảng trắng
// (vd "Lớp 1" và "lop 1" được coi là cùng 1 lớp). Dùng chung cho nhập Excel nhiều lớp
// và cho việc chuyển lớp ngay trong bảng học sinh.
function boChuan(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function loadHocSinh() {
  const empty = document.getElementById('hsEmpty');
  const lop = lopList.find(l => l.id === currentLopId);
  document.getElementById('hsCardTitle').textContent = lop ? `Học sinh — ${lop.ten}` : 'Học sinh';
  dangChinhSuaHs = false;
  capNhatGiaoDienKhoa();
  if (!currentLopId) { document.getElementById('hsTbody').innerHTML = ''; empty.style.display = 'block'; return; }
  const snap = await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(currentLopId)
    .collection('hocSinh').orderBy('hoTen').get();
  hsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderHsTableGrid();
}

function renderHsTableGrid() {
  const tbody = document.getElementById('hsTbody');
  document.getElementById('hsEmpty').style.display = (hsList.length === 0 && !dangChinhSuaHs) ? 'block' : 'none';
  tbody.innerHTML = hsList.map((hs) => `
    <tr data-id="${hs.id}">
      <td style="width:28px;">${dangChinhSuaHs ? '' : `<input type="checkbox" class="hs-select" value="${hs.id}" onchange="capNhatNutXoaDaChonHs()">`}</td>
      <td class="editable-cell" contenteditable="${dangChinhSuaHs}" data-field="stt" style="width:50px;">${escapeHtml(hs.stt || '')}</td>
      <td class="editable-cell" contenteditable="${dangChinhSuaHs}" data-field="lop" style="width:90px;">${escapeHtml(hs.lop || '')}</td>
      <td class="editable-cell" contenteditable="${dangChinhSuaHs}" data-field="hoTen">${escapeHtml(hs.hoTen || '')}</td>
      <td class="editable-cell" contenteditable="${dangChinhSuaHs}" data-field="sdtPhuHuynh">${escapeHtml(hs.sdtPhuHuynh || '')}</td>
      <td class="editable-cell" contenteditable="${dangChinhSuaHs}" data-field="ngayBatDau" style="width:110px;">${escapeHtml(hs.ngayBatDau || '')}</td>
      <td>${hs.maHS
        ? `<span class="badge badge-open">${escapeHtml(hs.maHS)}</span>`
        : (dangChinhSuaHs ? '<span class="muted">—</span>' : `<button class="btn btn-amber" onclick="openTaoTaiKhoan('${hs.id}')">+ Tạo tài khoản</button>`)}</td>
      <td>${dangChinhSuaHs
        ? `<button class="btn btn-outline" onclick="xoaDongGrid(this)">✕</button>`
        : `<button class="btn btn-outline" onclick="deleteHs('${hs.id}')">Xóa</button>`}</td>
    </tr>`).join('');
  capNhatNutXoaDaChonHs();
}

// ---- Chọn nhiều học sinh để xóa hàng loạt (chỉ áp dụng khi KHÔNG ở chế độ chỉnh sửa) ----
function dsHocSinhDangChon() {
  return [...document.querySelectorAll('.hs-select:checked')].map(cb => cb.value);
}

function capNhatNutXoaDaChonHs() {
  const btn = document.getElementById('btnXoaDaChonHs');
  if (!btn) return;
  const ds = dsHocSinhDangChon();
  btn.textContent = `🗑 Xóa đã chọn (${ds.length})`;
  btn.disabled = ds.length === 0;
  const tatCa = document.querySelectorAll('.hs-select');
  const chonTatCa = document.getElementById('hsChonTatCa');
  if (chonTatCa) chonTatCa.checked = tatCa.length > 0 && ds.length === tatCa.length;
}

function toggleChonTatCaHs(checkbox) {
  document.querySelectorAll('.hs-select').forEach(cb => { cb.checked = checkbox.checked; });
  capNhatNutXoaDaChonHs();
}

// Xóa hẳn một học sinh: bản ghi trong lớp, lịch sử điểm hàng tháng, và bản đồ tài khoản
// (nếu có) — tránh để lại dữ liệu mồ côi trong Firestore.
async function xoaHsVaDuLieuLienQuan(batch, hs) {
  const colRef = db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(currentLopId).collection('hocSinh');
  const diemSnap = await colRef.doc(hs.id).collection('diemThang').get();
  diemSnap.docs.forEach(d => batch.delete(d.ref));
  if (hs.uid) batch.delete(db.collection('taiKhoanHocSinh').doc(hs.uid));
  batch.delete(colRef.doc(hs.id));
}

async function xoaDaChonHs() {
  const ids = dsHocSinhDangChon();
  if (!ids.length) return;
  const dsChon = ids.map(id => hsList.find(h => h.id === id)).filter(Boolean);
  const dsTen = dsChon.map(hs => hs.hoTen || '(?)').join(', ');
  if (!confirm(`Xóa ${dsChon.length} học sinh đã chọn khỏi lớp?\n${dsTen}`)) return;
  const batch = db.batch();
  for (const hs of dsChon) {
    await xoaHsVaDuLieuLienQuan(batch, hs);
  }
  await batch.commit();
  await loadHocSinh();
  alert(`Đã xóa ${dsChon.length} học sinh.`);
}

function capNhatGiaoDienKhoa() {
  document.getElementById('btnMoKhoaHs').style.display = dangChinhSuaHs ? 'none' : 'inline-block';
  document.getElementById('btnKhoaHs').style.display = dangChinhSuaHs ? 'inline-block' : 'none';
  document.getElementById('hsEditActions').style.display = dangChinhSuaHs ? 'block' : 'none';
  const btnXoaDaChon = document.getElementById('btnXoaDaChonHs');
  if (btnXoaDaChon) btnXoaDaChon.style.display = dangChinhSuaHs ? 'none' : 'inline-block';
  const chonTatCaTh = document.getElementById('hsChonTatCaTh');
  if (chonTatCaTh) chonTatCaTh.style.visibility = dangChinhSuaHs ? 'hidden' : 'visible';
  document.getElementById('hsHint').textContent = dangChinhSuaHs
    ? 'Đang ở chế độ chỉnh sửa — dán (Ctrl+V) dữ liệu copy từ Excel, hoặc gõ trực tiếp vào ô. Bấm "Khóa & Lưu" khi xong.'
    : 'Bấm "Nhập" để mở khóa chỉnh sửa — khi đó bạn có thể copy dữ liệu từ Excel rồi dán (Ctrl+V) trực tiếp vào bảng.';
}

function moKhoaChinhSua() {
  if (!currentLopId) { alert('Hãy chọn hoặc tạo lớp trước.'); return; }
  dangChinhSuaHs = true;
  capNhatGiaoDienKhoa();
  renderHsTableGrid();
}

function themDongMoi() {
  const tbody = document.getElementById('hsTbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="width:28px;"></td>
    <td class="editable-cell" contenteditable="true" data-field="stt" style="width:50px;"></td>
    <td class="editable-cell" contenteditable="true" data-field="lop" style="width:90px;"></td>
    <td class="editable-cell" contenteditable="true" data-field="hoTen"></td>
    <td class="editable-cell" contenteditable="true" data-field="sdtPhuHuynh"></td>
    <td class="editable-cell" contenteditable="true" data-field="ngayBatDau" style="width:110px;"></td>
    <td><span class="muted">—</span></td>
    <td><button class="btn btn-outline" onclick="xoaDongGrid(this)">✕</button></td>`;
  tbody.appendChild(tr);
  tr.querySelector('[data-field="stt"]').focus();
}

function xoaDongGrid(btn) {
  btn.closest('tr').remove();
}

// Dán dữ liệu copy từ Excel (tab-separated) vào bảng, bắt đầu từ ô đang bấm dán
document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('hsTbody');
  if (!tbody) return;
  tbody.addEventListener('paste', function (e) {
    const target = e.target.closest('td.editable-cell');
    if (!target || !dangChinhSuaHs) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    if (!text) return;
    const rows = text.replace(/\r/g, '').split('\n').filter((r, idx, arr) => !(idx === arr.length - 1 && r === ''));
    const startTr = target.closest('tr');
    let trArr = [...document.querySelectorAll('#hsTbody tr')];
    const startRowIdx = trArr.indexOf(startTr);
    const startColIdx = HS_COLS.indexOf(target.dataset.field);

    rows.forEach((rowText, ri) => {
      const cells = rowText.split('\t');
      const rowIdx = startRowIdx + ri;
      let tr = trArr[rowIdx];
      if (!tr) { themDongMoi(); trArr = [...document.querySelectorAll('#hsTbody tr')]; tr = trArr[rowIdx]; }
      cells.forEach((val, ci) => {
        const colIdx = startColIdx + ci;
        if (colIdx > HS_COLS.length - 1) return; // bỏ qua nếu dán dư cột
        const td = tr.querySelector(`td[data-field="${HS_COLS[colIdx]}"]`);
        if (td) td.textContent = val.trim();
      });
    });
  });
});

// Lưu bảng học sinh. Cột "Lớp" chỉ là 1 ghi chú tự do của riêng học sinh đó (vd để quản lý
// buổi học/nhóm) — KHÔNG dùng để chuyển học sinh sang lớp (tab) khác, không tạo lớp mới.
// Muốn chuyển hẳn một lớp sang lớp khác, dùng nút "Gộp lớp" ở trên.
async function khoaVaLuu() {
  if (!confirm('Lưu các thay đổi và khóa bảng lại?')) return;
  const trs = [...document.querySelectorAll('#hsTbody tr')];
  const colRef = db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(currentLopId).collection('hocSinh');
  const batch = db.batch();
  trs.forEach(tr => {
    const id = tr.dataset.id || null;
    const stt = tr.querySelector('[data-field="stt"]').textContent.trim();
    const lop = tr.querySelector('[data-field="lop"]').textContent.trim();
    const hoTen = tr.querySelector('[data-field="hoTen"]').textContent.trim();
    const sdtPhuHuynh = tr.querySelector('[data-field="sdtPhuHuynh"]').textContent.trim();
    const ngayBatDau = tr.querySelector('[data-field="ngayBatDau"]').textContent.trim();
    const rong = !stt && !hoTen && !sdtPhuHuynh && !ngayBatDau;
    if (id) {
      if (rong) batch.delete(colRef.doc(id));
      else batch.update(colRef.doc(id), { stt, lop, hoTen, sdtPhuHuynh, ngayBatDau });
    } else if (!rong) {
      batch.set(colRef.doc(), { stt, lop, hoTen, sdtPhuHuynh, ngayBatDau });
    }
  });
  await batch.commit();
  dangChinhSuaHs = false;
  capNhatGiaoDienKhoa();
  await loadHocSinh();
}

async function deleteHs(id) {
  if (!confirm('Xóa học sinh này khỏi lớp?')) return;
  const hs = hsList.find(h => h.id === id) || { id };
  const batch = db.batch();
  await xoaHsVaDuLieuLienQuan(batch, hs);
  await batch.commit();
  await loadHocSinh();
}

// Cập nhật danh sách bằng file Excel/CSV (trong LỚP ĐANG CHỌN) — khớp học sinh theo Họ tên,
// học sinh trùng tên sẽ được cập nhật STT/SĐT/ngày bắt đầu; tên mới sẽ được thêm.
function capNhatHsTuExcel(event) {
  if (!currentLopId) { alert('Hãy chọn lớp trước.'); event.target.value = ''; return; }
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const colRef = db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(currentLopId).collection('hocSinh');
      const batch = db.batch();
      let capNhat = 0, themMoi = 0;
      rows.forEach(r => {
        const hoTen = String(r.HoTen || r.hoten || r['Họ tên'] || r['Họ và tên'] || '').trim();
        if (!hoTen) return;
        const stt = String(r.STT || r.Stt || r.stt || '').trim();
        const sdtPhuHuynh = String(r.SdtPhuHuynh || r.SDT || r['SĐT phụ huynh'] || r['Số điện thoại phụ huynh'] || '').trim();
        const ngayBatDau = String(r.NgayBatDau || r['Học bắt đầu'] || r['Ngày bắt đầu'] || '').trim();
        const match = hsList.find(hs => (hs.hoTen || '').trim().toLowerCase() === hoTen.toLowerCase());
        if (match) { batch.update(colRef.doc(match.id), { stt, sdtPhuHuynh, ngayBatDau }); capNhat++; }
        else { batch.set(colRef.doc(), { stt, hoTen, sdtPhuHuynh, ngayBatDau }); themMoi++; }
      });
      await batch.commit();
      alert(`Đã cập nhật ${capNhat} học sinh, thêm mới ${themMoi} học sinh.`);
      event.target.value = '';
      await loadHocSinh();
    } catch (err) {
      alert('Lỗi khi đọc file: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function openTaoTaiKhoan(hsId) {
  const hs = hsList.find(h => h.id === hsId);
  const goiY = 'hs' + Math.random().toString(36).slice(2, 8);
  showModal(`
    <h3>Tạo tài khoản cho ${escapeHtml(hs.hoTen)}</h3>
    <div class="field"><label>Mã học sinh (dùng để đăng nhập)</label><input type="text" id="mMaHS" value="${goiY}"></div>
    <div class="field"><label>Mật khẩu</label><input type="text" id="mMatKhau" value="hocthem${Math.floor(1000+Math.random()*9000)}"></div>
    <p class="muted">Gửi mã học sinh + mật khẩu này cho học sinh/phụ huynh để đăng nhập ở trang riêng cho học sinh.</p>
    <div class="row" style="justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="taoTaiKhoanHs('${hsId}')">Tạo tài khoản</button>
    </div>`);
}
// Ghi "bản đồ" uid -> (năm học, lớp, id học sinh) để trang học sinh tra cứu khi đăng nhập,
// không cần collectionGroup query (thứ đòi hỏi phải tạo index riêng trong Firebase Console).
async function ghiBanDoTaiKhoan(uid, namHocId, lopId, hsId) {
  await db.collection('taiKhoanHocSinh').doc(uid).set({ namHocId, lopId, hsId });
}

async function taoTaiKhoanHs(hsId) {
  const maHS = document.getElementById('mMaHS').value.trim();
  const matKhau = document.getElementById('mMatKhau').value;
  if (!maHS || matKhau.length < 6) { alert('Mã HS không được trống, mật khẩu tối thiểu 6 ký tự.'); return; }
  try {
    const cred = await secondaryAuth.createUserWithEmailAndPassword(emailFromMaHS(maHS), matKhau);
    await secondaryAuth.signOut();
    await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(currentLopId)
      .collection('hocSinh').doc(hsId).update({ maHS, uid: cred.user.uid });
    await ghiBanDoTaiKhoan(cred.user.uid, currentNamHocId, currentLopId, hsId);
    closeModal();
    await loadHocSinh();
  } catch (err) {
    alert(dichLoi(err));
  }
}

// Tạo tài khoản hàng loạt cho cả lớp: mã đăng nhập = SĐT phụ huynh, mật khẩu mặc định 123456.
// Chỉ áp dụng cho học sinh CHƯA có tài khoản và CÓ SĐT phụ huynh.
function moTaoHangLoatModal() {
  if (!currentLopId) { alert('Hãy chọn lớp trước.'); return; }
  const ungVien = hsList.filter(hs => !hs.maHS && (hs.sdtPhuHuynh || '').trim());
  const soDaCo = hsList.filter(hs => hs.maHS).length;
  const soThieuSdt = hsList.filter(hs => !hs.maHS && !(hs.sdtPhuHuynh || '').trim()).length;
  showModal(`
    <h3>Tạo tài khoản hàng loạt</h3>
    <p>Sẽ tạo tài khoản cho <b>${ungVien.length}</b> học sinh trong lớp này chưa có tài khoản (và có SĐT phụ huynh).</p>
    <p class="muted">Mã đăng nhập = SĐT phụ huynh (đã lược bỏ ký tự không phải số). Mật khẩu mặc định cho tất cả: <b>123456</b>.</p>
    ${soDaCo ? `<p class="muted">${soDaCo} học sinh đã có tài khoản từ trước sẽ được giữ nguyên.</p>` : ''}
    ${soThieuSdt ? `<p class="muted">${soThieuSdt} học sinh chưa có SĐT phụ huynh nên sẽ bị bỏ qua — điền SĐT trước rồi tạo lại.</p>` : ''}
    <p class="muted">Nếu 2 học sinh trùng SĐT phụ huynh (anh chị em), mã đăng nhập của em sau sẽ tự thêm số thứ tự để không trùng.</p>
    <div class="row" style="justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="taoTaiKhoanHangLoat()" ${ungVien.length ? '' : 'disabled'}>Tạo ngay</button>
    </div>`);
}
async function taoTaiKhoanHangLoat() {
  const ungVien = hsList.filter(hs => !hs.maHS && (hs.sdtPhuHuynh || '').trim());
  closeModal();
  if (!ungVien.length) return;
  const daDungMa = new Set(hsList.filter(hs => hs.maHS).map(hs => hs.maHS));
  let thanhCong = 0;
  const loi = [];
  for (const hs of ungVien) {
    const goc = String(hs.sdtPhuHuynh).replace(/[^0-9]/g, '');
    if (!goc) { loi.push(`${hs.hoTen}: SĐT không hợp lệ`); continue; }
    let ma = goc, i = 2;
    while (daDungMa.has(ma)) { ma = `${goc}-${i}`; i++; }
    try {
      const cred = await secondaryAuth.createUserWithEmailAndPassword(emailFromMaHS(ma), '123456');
      await secondaryAuth.signOut();
      await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(currentLopId)
        .collection('hocSinh').doc(hs.id).update({ maHS: ma, uid: cred.user.uid });
      await ghiBanDoTaiKhoan(cred.user.uid, currentNamHocId, currentLopId, hs.id);
      daDungMa.add(ma);
      thanhCong++;
    } catch (err) {
      loi.push(`${hs.hoTen}: ${dichLoi(err)}`);
    }
  }
  await loadHocSinh();
  alert(`Đã tạo ${thanhCong}/${ungVien.length} tài khoản.` + (loi.length ? `\n\nLỗi:\n${loi.join('\n')}` : ''));
}

// Công cụ sửa lỗi 1 lần: quét lại TẤT CẢ học sinh đã có tài khoản (uid + maHS) trong mọi
// năm học/lớp, ghi lại "bản đồ" uid -> vị trí học sinh. Dùng cho các tài khoản được tạo
// trước khi có bản vá này, hoặc nếu học sinh báo không đăng nhập được.
async function dongBoTaiKhoanHocSinh() {
  if (!confirm('Quét lại toàn bộ tài khoản học sinh đã tạo (mọi năm học, mọi lớp) để sửa lỗi đăng nhập? Chỉ cần chạy 1 lần.')) return;
  let soLuong = 0;
  const namHocSnap = await db.collection('namHoc').get();
  for (const nhDoc of namHocSnap.docs) {
    const lopSnap = await db.collection('namHoc').doc(nhDoc.id).collection('lop').get();
    for (const lopDoc of lopSnap.docs) {
      const hsSnap = await db.collection('namHoc').doc(nhDoc.id).collection('lop').doc(lopDoc.id).collection('hocSinh').get();
      for (const hsDoc of hsSnap.docs) {
        const d = hsDoc.data();
        if (d.uid && d.maHS) {
          await ghiBanDoTaiKhoan(d.uid, nhDoc.id, lopDoc.id, hsDoc.id);
          soLuong++;
        }
      }
    }
  }
  alert(`Đã đồng bộ xong ${soLuong} tài khoản học sinh. Giờ học sinh có thể đăng nhập lại được.`);
}

// ============================================================
// XUẤT EXCEL DANH SÁCH HỌC SINH (gửi trung tâm điểm danh)
// ============================================================
function taoHangDuLieu(list) {
  const header = ['STT', 'Họ và tên', 'SĐT phụ huynh', 'Học bắt đầu', 'Điểm danh'];
  const rows = list.map((hs, i) => [hs.stt || (i + 1), hs.hoTen, hs.sdtPhuHuynh || '', hs.ngayBatDau || '', '']);
  return [header, ...rows];
}
function sanitizeSheetName(ten, daDung) {
  let base = String(ten).replace(/[:\\\/\?\*\[\]]/g, '-').slice(0, 28) || 'Lop';
  let final = base, i = 2;
  while (daDung.has(final)) { final = `${base}_${i}`; i++; }
  daDung.add(final);
  return final;
}

function xuatExcelLopHienTai() {
  if (!currentLopId) { alert('Hãy chọn một lớp trước.'); return; }
  const lop = lopList.find(l => l.id === currentLopId);
  if (!hsList.length) { alert('Lớp này chưa có học sinh.'); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(taoHangDuLieu(hsList));
  ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(lop.ten, new Set()));
  const namHoc = namHocList.find(n => n.id === currentNamHocId);
  XLSX.writeFile(wb, `DanhSach_${lop.ten}_${namHoc ? namHoc.ten : ''}.xlsx`.replace(/\s+/g, '_'));
}

async function xuatExcelToanBo() {
  if (!lopList.length) { alert('Năm học này chưa có lớp nào.'); return; }
  const daDungTen = new Set();
  const tatCa = [];
  const dsTheoLop = [];
  for (const lop of lopList) {
    const snap = await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lop.id)
      .collection('hocSinh').orderBy('hoTen').get();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    dsTheoLop.push({ lop, list });
    list.forEach(hs => tatCa.push({ ...hs, tenLop: lop.ten }));
  }
  if (!tatCa.length) { alert('Năm học này chưa có học sinh nào.'); return; }

  const wb = XLSX.utils.book_new();

  // Sheet tổng hợp tất cả lớp, đặt đầu tiên — đúng cấu trúc STT | Lớp | Họ và tên | SĐT | Học bắt đầu
  const headerTong = ['STT', 'Lớp', 'Họ và tên', 'SĐT phụ huynh', 'Học bắt đầu', 'Điểm danh'];
  const rowsTong = tatCa.map((hs, i) => [hs.stt || (i + 1), hs.tenLop, hs.hoTen, hs.sdtPhuHuynh || '', hs.ngayBatDau || '', '']);
  const wsTong = XLSX.utils.aoa_to_sheet([headerTong, ...rowsTong]);
  wsTong['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsTong, sanitizeSheetName('Tất cả', daDungTen));

  // Mỗi lớp một sheet riêng
  dsTheoLop.forEach(({ lop, list }) => {
    const ws = XLSX.utils.aoa_to_sheet(taoHangDuLieu(list));
    ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(lop.ten, daDungTen));
  });

  const namHoc = namHocList.find(n => n.id === currentNamHocId);
  XLSX.writeFile(wb, `DanhSachHocSinh_${namHoc ? namHoc.ten : ''}.xlsx`.replace(/\s+/g, '_'));
}

// Nhập DANH SÁCH TỔNG từ 1 file Excel chứa NHIỀU LỚP cùng lúc — đúng cấu trúc:
// STT | Lớp | Họ và tên | SĐT phụ huynh | Học bắt đầu.
// Cột "Lớp" quyết định học sinh đó thuộc lớp nào — lớp chưa có sẽ tự tạo (so khớp
// không phân biệt hoa/thường và khoảng trắng, vd "Lớp 1" và "lop 1" là cùng 1 lớp).
// Khớp học sinh đã có theo STT trước (nếu trùng), rồi tới Họ tên; không đụng tài khoản đã tạo.
function importDanhSachNhieuLop(event) {
  if (!currentNamHocId) { alert('Hãy chọn/tạo năm học trước.'); event.target.value = ''; return; }
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      // Gom theo tên lớp đã chuẩn hóa (dùng chung hàm boChuan() ở đầu file)
      const nhomTheoLop = new Map(); // key: tên chuẩn hóa -> { tenGoc, hocSinh: [...] }
      rows.forEach(r => {
        const tenLopGoc = String(r.Lop || r.lop || r['Lớp'] || '').trim();
        const hoTen = String(r.HoTen || r.hoten || r['Họ tên'] || r['Họ và tên'] || '').trim();
        if (!tenLopGoc || !hoTen) return;
        const stt = String(r.STT || r.Stt || r.stt || '').trim();
        const sdtPhuHuynh = String(r.SdtPhuHuynh || r.SDT || r['SĐT phụ huynh'] || r['Số điện thoại phụ huynh'] || '').trim();
        const ngayBatDau = String(r.NgayBatDau || r['Học bắt đầu'] || r['Ngày bắt đầu'] || '').trim();
        const key = boChuan(tenLopGoc);
        if (!nhomTheoLop.has(key)) nhomTheoLop.set(key, { tenGoc: tenLopGoc, hocSinh: [] });
        nhomTheoLop.get(key).hocSinh.push({ stt, hoTen, sdtPhuHuynh, ngayBatDau });
      });
      if (!nhomTheoLop.size) { alert('Không đọc được dòng nào hợp lệ (cần có cột Lớp và Họ tên).'); event.target.value = ''; return; }

      const daCoTheoKey = new Map(lopList.map(l => [boChuan(l.ten), l]));
      const batch = db.batch();
      let soLopMoi = 0, soHsThem = 0, soHsCapNhat = 0;

      for (const [key, nhom] of nhomTheoLop) {
        let lop = daCoTheoKey.get(key);
        let lopRef;
        if (lop) {
          lopRef = db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lop.id);
        } else {
          lopRef = db.collection('namHoc').doc(currentNamHocId).collection('lop').doc();
          batch.set(lopRef, { ten: nhom.tenGoc });
          daCoTheoKey.set(key, { id: lopRef.id, ten: nhom.tenGoc });
          soLopMoi++;
        }
        const hsColRef = lopRef.collection('hocSinh');
        // học sinh hiện có trong lớp này (để khớp STT/Họ tên) — lớp mới tạo thì rỗng
        const hsHienCo = lop
          ? (await hsColRef.get()).docs.map(d => ({ id: d.id, ...d.data() }))
          : [];

        nhom.hocSinh.forEach(row => {
          let match = null;
          if (row.stt) match = hsHienCo.find(hs => String(hs.stt || '').trim() === row.stt);
          if (!match) match = hsHienCo.find(hs => (hs.hoTen || '').trim().toLowerCase() === row.hoTen.toLowerCase());
          if (match) {
            batch.update(hsColRef.doc(match.id), { stt: row.stt, sdtPhuHuynh: row.sdtPhuHuynh, ngayBatDau: row.ngayBatDau });
            soHsCapNhat++;
          } else {
            batch.set(hsColRef.doc(), { stt: row.stt, hoTen: row.hoTen, sdtPhuHuynh: row.sdtPhuHuynh, ngayBatDau: row.ngayBatDau });
            soHsThem++;
          }
        });
      }

      await batch.commit();
      event.target.value = '';
      alert(`Xong! Tạo mới ${soLopMoi} lớp, thêm ${soHsThem} học sinh, cập nhật ${soHsCapNhat} học sinh.`);
      await loadLop();
    } catch (err) {
      alert('Lỗi khi đọc file: ' + err.message);
      event.target.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

// ============================================================
// ĐỀ KIỂM TRA (Chức năng 2)
// ============================================================
async function loadDe() {
  const snap = await db.collection('deKiemTra').orderBy('createdAt', 'desc').get();
  deList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const tbody = document.getElementById('deTbody');
  document.getElementById('deEmpty').style.display = deList.length ? 'none' : 'block';
  tbody.innerHTML = deList.map(de => {
    const trangThai = tinhTrangThaiDe(de);
    const tenLop = (de.lopTenList || []).join(', ');
    return `<tr>
      <td>${escapeHtml(de.tieuDe)}</td>
      <td>${escapeHtml(tenLop)}</td>
      <td>${de.thoiLuongPhut} phút</td>
      <td>${renderBadgeTrangThai(trangThai)}</td>
      <td class="row">
        ${trangThai === 'chua_mo' ? `<button class="btn btn-primary" onclick="moDe('${de.id}')">Mở bài</button>` : ''}
        ${trangThai === 'dang_mo' ? `<button class="btn btn-danger" onclick="dongDe('${de.id}')">Đóng bài</button>` : ''}
        <button class="btn btn-outline" onclick="xemKetQua('${de.id}')">Kết quả</button>
      </td>
    </tr>`;
  }).join('');
}
function tinhTrangThaiDe(de) {
  if (de.trangThai === 'da_dong') return 'da_dong';
  if (de.trangThai === 'dang_mo') {
    if (Date.now() > de.thoiGianDong) return 'da_dong';
    return 'dang_mo';
  }
  return 'chua_mo';
}
function renderBadgeTrangThai(t) {
  if (t === 'dang_mo') return '<span class="badge badge-open">Đang mở</span>';
  if (t === 'da_dong') return '<span class="badge badge-closed">Đã đóng</span>';
  return '<span class="badge badge-pending">Chưa mở</span>';
}

// Không còn ngân hàng câu hỏi — câu hỏi được nhập trực tiếp cho từng đề (nhập tay
// hoặc dán từ Excel/CSV) ngay trong khung tạo đề, không phân loại theo bài học nữa.
let deDraftCauHoi = [];       // câu hỏi đang soạn cho đề sắp tạo: [{noiDung, dapAn:[A,B,C,D], dapAnDung}]
let importPreviewDataDe = []; // câu hỏi đọc được từ file Excel/CSV, chờ chọn để thêm vào đề

function openDeModal() {
  deDraftCauHoi = [];
  const lopOptions = lopList.map(l => `<label><input type="checkbox" class="mLopCheck" value="${l.id}" data-ten="${escapeHtml(l.ten)}"> ${escapeHtml(l.ten)}</label>`).join('');
  showModal(`
    <h3>Tạo đề kiểm tra</h3>
    <div class="field"><label>Tên đề</label><input type="text" id="mDeTen"></div>
    <div class="field"><label>Thời gian làm bài (phút)</label><input type="number" id="mDeThoiLuong" value="15" min="1"></div>
    <div class="field"><label>Áp dụng cho lớp</label><div class="checkbox-list">${lopOptions || '<p class="muted">Chưa có lớp nào.</p>'}</div></div>

    <div class="field">
      <label>Nhập câu hỏi từ Excel/CSV (tùy chọn)</label>
      <p class="muted" style="font-size:.8rem; margin-bottom:6px;">Cột: <b>NoiDung, A, B, C, D, DapAnDung</b> (DapAnDung ghi A/B/C/D).</p>
      <input type="file" id="mDeImportFile" accept=".xlsx,.xls,.csv" onchange="importCauHoiVaoDe(event)">
      <div id="mDeImportPreviewArea" style="margin-top:8px;"></div>
    </div>

    <div class="field">
      <label>Thêm câu hỏi thủ công</label>
      <textarea id="mDeCauNoiDung" placeholder="Nội dung câu hỏi" rows="2" style="width:100%; margin-bottom:6px;"></textarea>
      <div class="row" style="flex-wrap:wrap;">
        <input type="text" id="mDeDapA" placeholder="Đáp án A" style="flex:1; min-width:100px;">
        <input type="text" id="mDeDapB" placeholder="Đáp án B" style="flex:1; min-width:100px;">
        <input type="text" id="mDeDapC" placeholder="Đáp án C" style="flex:1; min-width:100px;">
        <input type="text" id="mDeDapD" placeholder="Đáp án D" style="flex:1; min-width:100px;">
      </div>
      <div class="row" style="margin-top:6px;">
        <label class="muted" style="margin:0;">Đáp án đúng</label>
        <select id="mDeDapDung" style="width:70px;"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select>
        <button class="btn btn-outline" onclick="themCauHoiVaoDe()">+ Thêm vào đề</button>
      </div>
    </div>

    <div class="field">
      <label>Câu hỏi trong đề (<span id="mDeSoCau">0</span> câu)</label>
      <div class="checkbox-list" id="mDeCauHoiListEl"></div>
    </div>

    <div class="row" style="justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveDe()">Tạo đề</button>
    </div>`);
  renderDeDraftCauHoiList();
}

function renderDeDraftCauHoiList() {
  document.getElementById('mDeSoCau').textContent = deDraftCauHoi.length;
  document.getElementById('mDeCauHoiListEl').innerHTML = deDraftCauHoi.length
    ? deDraftCauHoi.map((c, i) => `
      <div class="row between" style="padding:4px 0;">
        <div>${i + 1}. ${formatCT(c.noiDung)} <span class="muted">(Đáp án đúng: ${['A','B','C','D'][c.dapAnDung]})</span></div>
        <button class="btn btn-outline" onclick="xoaCauHoiKhoiDe(${i})">✕</button>
      </div>`).join('')
    : '<p class="muted">Chưa có câu hỏi nào.</p>';
}
function xoaCauHoiKhoiDe(idx) {
  deDraftCauHoi.splice(idx, 1);
  renderDeDraftCauHoiList();
}
function themCauHoiVaoDe() {
  const noiDung = document.getElementById('mDeCauNoiDung').value.trim();
  const dapAn = ['mDeDapA', 'mDeDapB', 'mDeDapC', 'mDeDapD'].map(id => document.getElementById(id).value.trim());
  const dapAnDung = parseInt(document.getElementById('mDeDapDung').value);
  if (!noiDung || dapAn.some(d => !d)) { alert('Điền đầy đủ nội dung và 4 đáp án.'); return; }
  deDraftCauHoi.push({ noiDung, dapAn, dapAnDung });
  ['mDeCauNoiDung', 'mDeDapA', 'mDeDapB', 'mDeDapC', 'mDeDapD'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('mDeDapDung').value = '0';
  renderDeDraftCauHoiList();
}

// Đọc file CSV/Excel — chấp nhận cả có/không dòng tiêu đề — rồi hiện danh sách cho GV
// chọn câu muốn thêm vào đề (chọn tay từng câu, hoặc "Chọn ngẫu nhiên" N câu bất kỳ).
function importCauHoiVaoDe(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      let rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
      const dongDau = boDauVN(rows[0] && rows[0][0]).toLowerCase().replace(/\s+/g, '');
      if (dongDau.includes('noidung') || dongDau.includes('cauhoi') || dongDau.includes('question')) rows = rows.slice(1);
      const map = { A: 0, B: 1, C: 2, D: 3 };
      const parsed = [];
      let boQua = 0;
      rows.forEach(r => {
        const noiDung = String(r[0] || '').trim();
        const A = String(r[1] || '').trim(), B = String(r[2] || '').trim();
        const C = String(r[3] || '').trim(), D = String(r[4] || '').trim();
        const dungRaw = String(r[5] || '').trim().toUpperCase();
        if (!noiDung || !A || !B || !C || !D || !(dungRaw in map)) { boQua++; return; }
        parsed.push({ noiDung, dapAn: [A, B, C, D], dapAnDung: map[dungRaw] });
      });
      event.target.value = '';
      if (!parsed.length) { alert(`Không đọc được câu hỏi hợp lệ nào (${boQua} dòng bị bỏ qua do thiếu dữ liệu).`); return; }
      moPreviewImportDe(parsed, boQua);
    } catch (err) {
      alert('Lỗi khi đọc file: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}
function moPreviewImportDe(parsed, boQua) {
  importPreviewDataDe = parsed;
  const items = parsed.map((c, idx) =>
    `<label><input type="checkbox" class="mImportDeCheck" value="${idx}" checked> ${formatCT(c.noiDung)}</label>`
  ).join('');
  document.getElementById('mDeImportPreviewArea').innerHTML = `
    <p class="muted">Đọc được ${parsed.length} câu${boQua ? ` (${boQua} dòng bị bỏ qua)` : ''} — chọn câu muốn thêm vào đề:</p>
    <div class="row" style="margin-bottom:8px;">
      <button class="btn btn-outline" onclick="chonTatCaImportDe(true)">Chọn tất cả</button>
      <button class="btn btn-outline" onclick="chonTatCaImportDe(false)">Bỏ chọn tất cả</button>
      <input type="number" id="mSoCauRandomDe" min="1" max="${parsed.length}" value="${Math.min(10, parsed.length)}" style="width:80px;">
      <button class="btn btn-outline" onclick="chonNgauNhienImportDe()">🎲 Chọn ngẫu nhiên</button>
    </div>
    <div class="checkbox-list">${items}</div>
    <div class="row" style="justify-content:flex-end; margin-top:8px;">
      <button class="btn btn-primary" onclick="themCauHoiDaChonTuFileVaoDe()">Thêm câu đã chọn vào đề</button>
    </div>`;
}
function chonTatCaImportDe(checked) {
  document.querySelectorAll('.mImportDeCheck').forEach(cb => { cb.checked = checked; });
}
function chonNgauNhienImportDe() {
  const n = Math.max(1, Math.min(importPreviewDataDe.length, parseInt(document.getElementById('mSoCauRandomDe').value) || 1));
  const idxAll = importPreviewDataDe.map((_, i) => i);
  for (let i = idxAll.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idxAll[i], idxAll[j]] = [idxAll[j], idxAll[i]];
  }
  const chon = new Set(idxAll.slice(0, n));
  document.querySelectorAll('.mImportDeCheck').forEach(cb => { cb.checked = chon.has(parseInt(cb.value)); });
}
function themCauHoiDaChonTuFileVaoDe() {
  const checks = [...document.querySelectorAll('.mImportDeCheck:checked')].map(cb => parseInt(cb.value));
  if (!checks.length) { alert('Chưa chọn câu nào.'); return; }
  checks.forEach(idx => deDraftCauHoi.push(importPreviewDataDe[idx]));
  document.getElementById('mDeImportPreviewArea').innerHTML = '';
  renderDeDraftCauHoiList();
}

// Đọc CSV/Excel bỏ dấu tiếng Việt để nhận diện dòng tiêu đề dù có/không dấu.
function boDauVN(str) {
  return String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

async function saveDe() {
  const tieuDe = document.getElementById('mDeTen').value.trim();
  const thoiLuongPhut = parseInt(document.getElementById('mDeThoiLuong').value) || 15;
  const lopChecks = [...document.querySelectorAll('.mLopCheck:checked')];
  if (!tieuDe || !lopChecks.length || !deDraftCauHoi.length) { alert('Điền tên đề, chọn ít nhất 1 lớp và ít nhất 1 câu hỏi.'); return; }
  await db.collection('deKiemTra').add({
    tieuDe, thoiLuongPhut,
    lopIds: lopChecks.map(c => c.value),
    lopTenList: lopChecks.map(c => c.dataset.ten),
    namHocId: currentNamHocId,
    cauHoi: deDraftCauHoi,
    trangThai: 'chua_mo',
    createdAt: Date.now()
  });
  closeModal();
  await loadDe();
}
async function moDe(deId) {
  const de = deList.find(d => d.id === deId);
  if (!confirm(`Mở "${de.tieuDe}" ngay bây giờ? Học sinh sẽ có ${de.thoiLuongPhut} phút kể từ lúc này.`)) return;
  const thoiGianMo = Date.now();
  const thoiGianDong = thoiGianMo + de.thoiLuongPhut * 60000;
  await db.collection('deKiemTra').doc(deId).update({ trangThai: 'dang_mo', thoiGianMo, thoiGianDong });
  await loadDe();
}
async function dongDe(deId) {
  if (!confirm('Đóng bài kiểm tra này ngay? Học sinh chưa nộp sẽ không nộp được nữa.')) return;
  await db.collection('deKiemTra').doc(deId).update({ trangThai: 'da_dong' });
  await loadDe();
}
// Số câu của 1 đề — đề mới lưu câu hỏi trực tiếp ở "cauHoi", đề cũ (tạo từ ngân hàng
// câu hỏi trước đây) lưu id ở "cauHoiIds" — đọc cả 2 kiểu để không mất dữ liệu cũ.
function soCauCuaDe(de) {
  return (de.cauHoi || de.cauHoiIds || []).length;
}

async function xemKetQua(deId) {
  const de = deList.find(d => d.id === deId);
  const snap = await db.collection('deKiemTra').doc(deId).collection('baiLam').get();
  const bais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const tongCau = soCauCuaDe(de);
  const rows = bais.length
    ? bais.map(b => `<tr><td>${escapeHtml(b.hoTenHS || b.id)}</td><td>${b.diem ?? '—'}/${tongCau}</td><td>${b.daNop ? 'Đã nộp' : 'Đang làm'}</td></tr>`).join('')
    : `<tr><td colspan="3" class="muted">Chưa có học sinh nào làm bài.</td></tr>`;
  showModal(`
    <h3>Kết quả — ${escapeHtml(de.tieuDe)}</h3>
    <table><thead><tr><th>Học sinh</th><th>Điểm</th><th>Trạng thái</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="row" style="justify-content:flex-end; margin-top:14px;"><button class="btn btn-outline" onclick="closeModal()">Đóng</button></div>`);
}

// ============================================================
// BẢNG ĐIỂM HÀNG THÁNG & BÁO CÁO CHO PHỤ HUYNH — mỗi tháng của mỗi lớp có thể có
// NHIỀU bài kiểm tra riêng (vd "lần 1", "lần 2"), mỗi bài có điểm + nhận xét riêng
// cho từng học sinh (nhập tay hoặc từ Excel). Chọn Lớp + Tháng → hiện danh sách các
// bài kiểm tra tháng đó → bấm vào 1 bài để nhập/xem điểm của riêng bài đó.
// ============================================================
let dsBaiKiemTraThang = [];    // các bài KT của (lớp, tháng) đang xem
let baiKiemTraDangXem = null;  // bài KT đang mở bảng điểm: { id, ten, thang, diem: {hsId: {...}} }
let dsHsBangDiem = [];         // học sinh của lớp đang xem (để render bảng điểm)
let bdDangChinhSua = false;

function capNhatBdLopSelect() {
  const sel = document.getElementById('bdLopSelect');
  if (!sel) return;
  const giaTriCu = sel.value;
  sel.innerHTML = lopList.map(l => `<option value="${l.id}">${escapeHtml(l.ten)}</option>`).join('');
  if (lopList.some(l => l.id === giaTriCu)) sel.value = giaTriCu;
}

document.addEventListener('DOMContentLoaded', () => {
  const thangInput = document.getElementById('bdThangSelect');
  if (thangInput) thangInput.value = new Date().toISOString().slice(0, 7);
});

async function xemDsBaiKiemTraThang() {
  const lopId = document.getElementById('bdLopSelect').value;
  const thang = document.getElementById('bdThangSelect').value; // "YYYY-MM"
  dongBangDiemThang();
  const el = document.getElementById('bdDsBaiKiemTra');
  if (!lopId || !thang) { el.innerHTML = '<p class="muted">Chọn lớp và tháng.</p>'; dsBaiKiemTraThang = []; return; }
  const snap = await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopId)
    .collection('baiKiemTraThang').where('thang', '==', thang).get();
  dsBaiKiemTraThang = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  renderDsBaiKiemTraThang();
}
function renderDsBaiKiemTraThang() {
  const el = document.getElementById('bdDsBaiKiemTra');
  if (!dsBaiKiemTraThang.length) { el.innerHTML = '<p class="muted">Tháng này chưa có bài kiểm tra nào — bấm "+ Thêm bài kiểm tra".</p>'; return; }
  el.innerHTML = dsBaiKiemTraThang.map(b => `
    <div class="row between" style="padding:8px 0; border-bottom:1px solid var(--rule);">
      <div>${escapeHtml(b.ten)}</div>
      <div class="row">
        <button class="btn btn-outline" onclick="moBangDiemThang('${b.id}')">Xem điểm</button>
        <button class="btn btn-danger" onclick="xoaBaiKiemTraThang('${b.id}')">Xóa</button>
      </div>
    </div>`).join('');
}

function moTaoBaiKiemTraThangModal() {
  const lopId = document.getElementById('bdLopSelect').value;
  const thang = document.getElementById('bdThangSelect').value;
  if (!lopId || !thang) { alert('Chọn lớp và tháng trước.'); return; }
  showModal(`
    <h3>Thêm bài kiểm tra tháng ${thang}</h3>
    <div class="field"><label>Tên bài kiểm tra (vd: Kiểm tra tháng ${thang.split('-')[1]} - lần 1)</label><input type="text" id="mBaiKtTen"></div>
    <div class="row" style="justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="taoBaiKiemTraThang()">Tạo</button>
    </div>`);
}
async function taoBaiKiemTraThang() {
  const lopId = document.getElementById('bdLopSelect').value;
  const thang = document.getElementById('bdThangSelect').value;
  const ten = document.getElementById('mBaiKtTen').value.trim();
  if (!ten) return;
  const ref = await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopId)
    .collection('baiKiemTraThang').add({ ten, thang, diem: {}, createdAt: Date.now() });
  closeModal();
  await xemDsBaiKiemTraThang();
  await moBangDiemThang(ref.id);
}
async function xoaBaiKiemTraThang(baiId) {
  if (!confirm('Xóa bài kiểm tra này? Toàn bộ điểm/nhận xét đã nhập cho bài này sẽ mất.')) return;
  const lopId = document.getElementById('bdLopSelect').value;
  await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopId)
    .collection('baiKiemTraThang').doc(baiId).delete();
  if (baiKiemTraDangXem && baiKiemTraDangXem.id === baiId) dongBangDiemThang();
  await xemDsBaiKiemTraThang();
}

async function moBangDiemThang(baiId) {
  const lopId = document.getElementById('bdLopSelect').value;
  const bai = dsBaiKiemTraThang.find(b => b.id === baiId);
  if (!bai) return;
  const snapHs = await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopId)
    .collection('hocSinh').orderBy('hoTen').get();
  dsHsBangDiem = snapHs.docs.map(d => ({ id: d.id, ...d.data() }));
  baiKiemTraDangXem = bai;
  bdDangChinhSua = false;
  document.getElementById('bdBangDiemWrap').style.display = 'block';
  document.getElementById('bdBaiTenHienTai').textContent = bai.ten;
  capNhatGiaoDienKhoaBd();
  renderBangDiem();
}
function dongBangDiemThang() {
  baiKiemTraDangXem = null;
  bdDangChinhSua = false;
  const wrap = document.getElementById('bdBangDiemWrap');
  if (wrap) wrap.style.display = 'none';
}

function capNhatGiaoDienKhoaBd() {
  document.getElementById('btnMoKhoaBd').style.display = bdDangChinhSua ? 'none' : 'inline-block';
  document.getElementById('btnKhoaBd').style.display = bdDangChinhSua ? 'inline-block' : 'none';
}
function moKhoaBd() { bdDangChinhSua = true; capNhatGiaoDienKhoaBd(); renderBangDiem(); }
async function khoaVaLuuBd() {
  const rowsEl = [...document.querySelectorAll('#bdTable tbody tr')];
  const diemMoi = {};
  rowsEl.forEach(tr => {
    const hsId = tr.dataset.hsid;
    const diemThuCong = tr.querySelector('.bd-diem').value.trim();
    const nhanXet = tr.querySelector('.bd-nhanxet').value.trim();
    if (diemThuCong || nhanXet) diemMoi[hsId] = { diemThuCong, nhanXet };
  });
  const lopId = document.getElementById('bdLopSelect').value;
  await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopId)
    .collection('baiKiemTraThang').doc(baiKiemTraDangXem.id).update({ diem: diemMoi });
  baiKiemTraDangXem.diem = diemMoi;
  const idx = dsBaiKiemTraThang.findIndex(b => b.id === baiKiemTraDangXem.id);
  if (idx >= 0) dsBaiKiemTraThang[idx].diem = diemMoi;
  bdDangChinhSua = false;
  capNhatGiaoDienKhoaBd();
  renderBangDiem();
}

// Nhập điểm/nhận xét từ file Excel do hệ thống chấm điểm ngoài (vd AI chấm) xuất ra,
// áp dụng cho bài kiểm tra đang mở bảng điểm. Khớp theo Họ tên trước, không khớp được
// thì dò theo SBD = STT của học sinh trong hệ thống.
function importDiemTuExcel(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!baiKiemTraDangXem) {
    alert('Hãy bấm "Xem điểm" cho 1 bài kiểm tra trước khi import.');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const diemMoi = { ...(baiKiemTraDangXem.diem || {}) };
      let capNhat = 0;
      const khongKhop = [];
      rows.forEach(r => {
        const hoTen = String(r.HoTen || r.hoten || r['Họ tên'] || r['Họ và tên'] || '').trim();
        const sbd = String(r.SBD || r.sbd || r['SBD'] || r.STT || r.Stt || r['STT'] || '').trim();
        if (!hoTen && !sbd) return;
        const diem = String(r.Diem || r.diem || r['Điểm'] || r['Điểm KT'] || '').trim();
        const nhanXet = String(r.NhanXet || r.nhanxet || r['Nhận xét'] || '').trim();
        let match = hoTen ? dsHsBangDiem.find(hs => (hs.hoTen || '').trim().toLowerCase() === hoTen.toLowerCase()) : null;
        if (!match && sbd) match = dsHsBangDiem.find(hs => String(hs.stt || '').trim() === sbd);
        if (!match) { khongKhop.push(hoTen || `SBD ${sbd}`); return; }
        if (!diem && !nhanXet) return;
        const cu = diemMoi[match.id] || {};
        diemMoi[match.id] = { diemThuCong: diem || cu.diemThuCong || '', nhanXet: nhanXet || cu.nhanXet || '' };
        capNhat++;
      });
      const lopId = document.getElementById('bdLopSelect').value;
      await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopId)
        .collection('baiKiemTraThang').doc(baiKiemTraDangXem.id).update({ diem: diemMoi });
      baiKiemTraDangXem.diem = diemMoi;
      const idx = dsBaiKiemTraThang.findIndex(b => b.id === baiKiemTraDangXem.id);
      if (idx >= 0) dsBaiKiemTraThang[idx].diem = diemMoi;
      renderBangDiem();
      event.target.value = '';
      alert(`Đã cập nhật điểm/nhận xét cho ${capNhat} học sinh.` +
        (khongKhop.length ? `\n\nKhông khớp được tên nào trong lớp (${khongKhop.length}): ${khongKhop.join(', ')}` : ''));
    } catch (err) {
      alert('Lỗi khi đọc file: ' + err.message);
      event.target.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderBangDiem() {
  const tbody = document.querySelector('#bdTable tbody');
  if (!baiKiemTraDangXem) { tbody.innerHTML = ''; return; }
  const diemMap = baiKiemTraDangXem.diem || {};
  tbody.innerHTML = dsHsBangDiem.length ? dsHsBangDiem.map(hs => {
    const d = diemMap[hs.id] || {};
    return `<tr data-hsid="${hs.id}">
      <td>${escapeHtml(hs.hoTen)}</td>
      <td><input type="text" class="bd-input bd-diem" value="${escapeHtml(d.diemThuCong || '')}" placeholder="vd: 8.5" ${bdDangChinhSua ? '' : 'disabled'}></td>
      <td><input type="text" class="bd-input bd-nhanxet" value="${escapeHtml(d.nhanXet || '')}" placeholder="Nhận xét..." ${bdDangChinhSua ? '' : 'disabled'}></td>
    </tr>`;
  }).join('') : `<tr><td colspan="3" class="muted">Lớp này chưa có học sinh nào.</td></tr>`;
}

function xuatBaoCaoDiem() {
  if (!baiKiemTraDangXem) { alert('Hãy bấm "Xem điểm" cho 1 bài kiểm tra trước.'); return; }
  const diemMap = baiKiemTraDangXem.diem || {};
  const header = ['Họ tên', 'SĐT phụ huynh', 'Điểm', 'Nhận xét'];
  const data = dsHsBangDiem.map(hs => {
    const d = diemMap[hs.id] || {};
    return [hs.hoTen, hs.sdtPhuHuynh || '', d.diemThuCong || '', d.nhanXet || ''];
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 10 }, { wch: 40 }];
  const lop = lopList.find(l => l.id === document.getElementById('bdLopSelect').value) || { ten: '' };
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(baiKiemTraDangXem.ten, new Set()));
  XLSX.writeFile(wb, `${baiKiemTraDangXem.ten}_${lop.ten}.xlsx`.replace(/\s+/g, '_'));
}

// ============================================================
// HỌC TẬP TỪNG EM — điểm/nhận xét theo tháng + lịch sử đề kiểm tra
// ============================================================
function capNhatHtLopSelect() {
  const sel = document.getElementById('htLopSelect');
  if (!sel) return;
  const giaTriCu = sel.value;
  sel.innerHTML = lopList.map(l => `<option value="${l.id}">${escapeHtml(l.ten)}</option>`).join('');
  if (lopList.some(l => l.id === giaTriCu)) sel.value = giaTriCu;
  capNhatHtHsSelect();
}
async function capNhatHtHsSelect() {
  const lopId = document.getElementById('htLopSelect').value;
  const sel = document.getElementById('htHsSelect');
  if (!sel || !lopId || !currentNamHocId) { if (sel) sel.innerHTML = ''; return; }
  const snap = await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopId)
    .collection('hocSinh').orderBy('hoTen').get();
  const hsOptions = snap.docs.map(d => `<option value="${d.id}">${escapeHtml(d.data().hoTen)}</option>`).join('');
  sel.innerHTML = `<option value="">— Tất cả học sinh (xem chung cả lớp) —</option>` + hsOptions;
}

async function xemHocTapHocSinh() {
  const lopId = document.getElementById('htLopSelect').value;
  const hsId = document.getElementById('htHsSelect').value;
  if (!lopId) { alert('Chọn lớp.'); return; }
  document.getElementById('htChuaChonEmpty').style.display = 'none';

  if (!hsId) {
    document.getElementById('htDiemThangCard').style.display = 'none';
    document.getElementById('htLichSuDeCard').style.display = 'none';
    await xemHocTapCaLop(lopId);
    return;
  }
  document.getElementById('htCaLopCard').style.display = 'none';

  const hsDoc = await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopId)
    .collection('hocSinh').doc(hsId).get();
  if (!hsDoc.exists) return;
  const hs = { id: hsDoc.id, ...hsDoc.data() };

  // Điểm & nhận xét của từng bài kiểm tra hàng tháng (có thể nhiều bài trong 1 tháng)
  const snapBaiKt = await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopId)
    .collection('baiKiemTraThang').get();
  const dsBaiKt = snapBaiKt.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(b => b.diem && b.diem[hsId])
    .map(b => ({ thang: b.thang, ten: b.ten, createdAt: b.createdAt || 0, ...b.diem[hsId] }))
    .sort((a, b) => b.thang.localeCompare(a.thang) || b.createdAt - a.createdAt);

  // Lịch sử bài kiểm tra online (chỉ tính đề đã từng mở)
  const snapDe = await db.collection('deKiemTra').where('lopIds', 'array-contains', lopId).get();
  const deList = snapDe.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(de => de.thoiGianMo)
    .sort((a, b) => b.thoiGianMo - a.thoiGianMo);
  const lichSuDe = [];
  for (const de of deList) {
    const bai = hs.uid ? (await db.collection('deKiemTra').doc(de.id).collection('baiLam').doc(hs.uid).get()) : null;
    lichSuDe.push({ de, bai: bai && bai.exists ? bai.data() : null });
  }

  renderHtDiemThang(dsBaiKt);
  renderHtLichSuDe(lichSuDe);
}

// Xem tổng quan học tập của CẢ LỚP cùng lúc — điểm TB các bài KT online (mọi thời gian,
// dùng để "ôn tập" nên chỉ mang tính tham khảo) và nhận xét của bài kiểm tra gần nhất,
// cho từng học sinh.
async function xemHocTapCaLop(lopId) {
  const snapHs = await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopId)
    .collection('hocSinh').orderBy('hoTen').get();
  const dsHs = snapHs.docs.map(d => ({ id: d.id, ...d.data() }));

  const snapDe = await db.collection('deKiemTra').where('lopIds', 'array-contains', lopId).get();
  const deList = snapDe.docs.map(d => ({ id: d.id, ...d.data() })).filter(de => de.thoiGianMo);

  const diemTheoDe = {};
  for (const de of deList) {
    const snapBai = await db.collection('deKiemTra').doc(de.id).collection('baiLam').get();
    diemTheoDe[de.id] = {};
    snapBai.docs.forEach(b => { diemTheoDe[de.id][b.id] = b.data(); });
  }

  // Tất cả bài kiểm tra hàng tháng của lớp này — đọc 1 lần, dùng chung cho mọi học sinh.
  const snapBaiKt = await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(lopId)
    .collection('baiKiemTraThang').get();
  const dsBaiKtLop = snapBaiKt.docs.map(d => ({ id: d.id, ...d.data() }));

  const rows = [];
  for (const hs of dsHs) {
    let tongPhanTram = 0, soBaiDaLam = 0;
    deList.forEach(de => {
      const bai = hs.uid ? diemTheoDe[de.id][hs.uid] : null;
      const tongCau = soCauCuaDe(de);
      if (bai && bai.daNop && tongCau) { tongPhanTram += bai.diem / tongCau; soBaiDaLam++; }
    });
    const diemTbDe = soBaiDaLam ? (tongPhanTram / soBaiDaLam * 100) : null;

    const baiKtCuaEm = dsBaiKtLop
      .filter(b => b.diem && b.diem[hs.id])
      .map(b => ({ thang: b.thang, ten: b.ten, createdAt: b.createdAt || 0, ...b.diem[hs.id] }))
      .sort((a, b) => b.thang.localeCompare(a.thang) || b.createdAt - a.createdAt);
    const ganNhat = baiKtCuaEm[0];

    rows.push({ hs, soBaiDaLam, tongDe: deList.length, diemTbDe, ganNhat });
  }

  renderHocTapCaLop(rows);
}
function renderHocTapCaLop(rows) {
  document.getElementById('htCaLopCard').style.display = 'block';
  const tbody = document.getElementById('htCaLopTbody');
  document.getElementById('htCaLopEmpty').style.display = rows.length ? 'none' : 'block';
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.hs.hoTen)}</td>
      <td>${r.soBaiDaLam}/${r.tongDe}</td>
      <td>${r.diemTbDe != null ? r.diemTbDe.toFixed(0) + '%' : '—'}</td>
      <td>${r.ganNhat
        ? `<b>${escapeHtml(r.ganNhat.ten)}:</b> ${escapeHtml(r.ganNhat.nhanXet || '(không có nhận xét)')}${r.ganNhat.diemThuCong ? ` — điểm ${escapeHtml(r.ganNhat.diemThuCong)}` : ''}`
        : '—'}</td>
    </tr>`).join('');
}

function renderHtDiemThang(dsBaiKt) {
  document.getElementById('htDiemThangCard').style.display = 'block';
  const tbody = document.getElementById('htDiemThangTbody');
  document.getElementById('htDiemThangEmpty').style.display = dsBaiKt.length ? 'none' : 'block';
  tbody.innerHTML = dsBaiKt.map(b => {
    const [nam, thangSo] = b.thang.split('-');
    return `<tr>
      <td>Tháng ${thangSo}/${nam}</td>
      <td>${escapeHtml(b.ten)}</td>
      <td>${escapeHtml(b.diemThuCong || '—')}</td>
      <td>${escapeHtml(b.nhanXet || '—')}</td>
    </tr>`;
  }).join('');
}

function renderHtLichSuDe(lichSuDe) {
  document.getElementById('htLichSuDeCard').style.display = 'block';
  const tbody = document.getElementById('htLichSuDeTbody');
  document.getElementById('htLichSuDeEmpty').style.display = lichSuDe.length ? 'none' : 'block';
  tbody.innerHTML = lichSuDe.map(({ de, bai }) => {
    const ngayMo = de.thoiGianMo ? new Date(de.thoiGianMo).toLocaleDateString('vi-VN') : '—';
    const diem = bai && bai.daNop ? `${bai.diem}/${soCauCuaDe(de)}` : '—';
    const trangThai = bai && bai.daNop ? '<span class="badge badge-open">Đã nộp</span>' : '<span class="badge badge-closed">Chưa làm</span>';
    return `<tr>
      <td>${escapeHtml(de.tieuDe)}</td>
      <td>${ngayMo}</td>
      <td>${diem}</td>
      <td>${trangThai}</td>
    </tr>`;
  }).join('');
}

// ============================================================
// TIỆN ÍCH
// ============================================================
function showModal(html) {
  document.getElementById('modalRoot').innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`;
}
function closeModal() { document.getElementById('modalRoot').innerHTML = ''; }
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
// Hiển thị công thức hóa học với chỉ số nhỏ, vd CO2 -> CO₂, H2O -> H₂O, CH4 -> CH₄.
// Chỉ số hạ xuống áp dụng cho số đứng ngay sau một chữ cái (không có khoảng trắng),
// nên số liệu bình thường như "1,5 mol" hay "25 oC" không bị ảnh hưởng.
function formatCT(s) {
  return escapeHtml(s).replace(/([A-Za-zĐđ])(\d+)/g, '$1<sub>$2</sub>');
}

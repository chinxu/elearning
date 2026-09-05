// ============================================================
// STATE
// ============================================================
let currentNamHocId = null;
let currentLopId = null;
let namHocList = [];
let lopList = [];
let hsList = [];
let cauHoiList = [];
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
  await loadNamHoc();
  await loadCauHoi();
  await loadDe();
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
    `<button class="btn btn-danger" style="margin-left:8px;" onclick="deleteLop()">Xóa lớp hiện tại</button>`;
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
const HS_COLS = ['hoTen', 'sdtPhuHuynh', 'lopTruong'];

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
  tbody.innerHTML = hsList.map((hs, i) => `
    <tr data-id="${hs.id}">
      <td>${i + 1}</td>
      <td class="editable-cell" contenteditable="${dangChinhSuaHs}" data-field="hoTen">${escapeHtml(hs.hoTen || '')}</td>
      <td class="editable-cell" contenteditable="${dangChinhSuaHs}" data-field="sdtPhuHuynh">${escapeHtml(hs.sdtPhuHuynh || '')}</td>
      <td class="editable-cell" contenteditable="${dangChinhSuaHs}" data-field="lopTruong">${escapeHtml(hs.lopTruong || '')}</td>
      <td>${hs.maHS
        ? `<span class="badge badge-open">${escapeHtml(hs.maHS)}</span>`
        : (dangChinhSuaHs ? '<span class="muted">—</span>' : `<button class="btn btn-amber" onclick="openTaoTaiKhoan('${hs.id}')">+ Tạo tài khoản</button>`)}</td>
      <td>${dangChinhSuaHs
        ? `<button class="btn btn-outline" onclick="xoaDongGrid(this)">✕</button>`
        : `<button class="btn btn-outline" onclick="deleteHs('${hs.id}')">Xóa</button>`}</td>
    </tr>`).join('');
}

function capNhatGiaoDienKhoa() {
  document.getElementById('btnMoKhoaHs').style.display = dangChinhSuaHs ? 'none' : 'inline-block';
  document.getElementById('btnKhoaHs').style.display = dangChinhSuaHs ? 'inline-block' : 'none';
  document.getElementById('hsEditActions').style.display = dangChinhSuaHs ? 'block' : 'none';
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
    <td>${tbody.children.length + 1}</td>
    <td class="editable-cell" contenteditable="true" data-field="hoTen"></td>
    <td class="editable-cell" contenteditable="true" data-field="sdtPhuHuynh"></td>
    <td class="editable-cell" contenteditable="true" data-field="lopTruong"></td>
    <td><span class="muted">—</span></td>
    <td><button class="btn btn-outline" onclick="xoaDongGrid(this)">✕</button></td>`;
  tbody.appendChild(tr);
  tr.querySelector('[data-field="hoTen"]').focus();
}

function xoaDongGrid(btn) {
  btn.closest('tr').remove();
  [...document.querySelectorAll('#hsTbody tr')].forEach((tr, i) => tr.children[0].textContent = i + 1);
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
        if (colIdx > 2) return; // bỏ qua nếu dán dư cột
        const td = tr.querySelector(`td[data-field="${HS_COLS[colIdx]}"]`);
        if (td) td.textContent = val.trim();
      });
    });
  });
});

async function khoaVaLuu() {
  if (!confirm('Lưu các thay đổi và khóa bảng lại?')) return;
  const trs = [...document.querySelectorAll('#hsTbody tr')];
  const colRef = db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(currentLopId).collection('hocSinh');
  const batch = db.batch();
  trs.forEach(tr => {
    const id = tr.dataset.id || null;
    const hoTen = tr.querySelector('[data-field="hoTen"]').textContent.trim();
    const sdtPhuHuynh = tr.querySelector('[data-field="sdtPhuHuynh"]').textContent.trim();
    const lopTruong = tr.querySelector('[data-field="lopTruong"]').textContent.trim();
    const rong = !hoTen && !sdtPhuHuynh && !lopTruong;
    if (id) {
      if (rong) batch.delete(colRef.doc(id));
      else batch.update(colRef.doc(id), { hoTen, sdtPhuHuynh, lopTruong });
    } else if (!rong) {
      batch.set(colRef.doc(), { hoTen, sdtPhuHuynh, lopTruong });
    }
  });
  await batch.commit();
  dangChinhSuaHs = false;
  capNhatGiaoDienKhoa();
  await loadHocSinh();
}

async function deleteHs(id) {
  if (!confirm('Xóa học sinh này khỏi lớp?')) return;
  await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(currentLopId)
    .collection('hocSinh').doc(id).delete();
  await loadHocSinh();
}

// Cập nhật danh sách bằng file Excel/CSV — khớp học sinh theo Họ tên,
// học sinh trùng tên sẽ được cập nhật SĐT/lớp trường; tên mới sẽ được thêm.
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
        const sdtPhuHuynh = String(r.SdtPhuHuynh || r.SDT || r['SĐT phụ huynh'] || '').trim();
        const lopTruong = String(r.LopTruong || r['Lớp học trên trường'] || '').trim();
        const match = hsList.find(hs => (hs.hoTen || '').trim().toLowerCase() === hoTen.toLowerCase());
        if (match) { batch.update(colRef.doc(match.id), { sdtPhuHuynh, lopTruong }); capNhat++; }
        else { batch.set(colRef.doc(), { hoTen, sdtPhuHuynh, lopTruong }); themMoi++; }
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
async function taoTaiKhoanHs(hsId) {
  const maHS = document.getElementById('mMaHS').value.trim();
  const matKhau = document.getElementById('mMatKhau').value;
  if (!maHS || matKhau.length < 6) { alert('Mã HS không được trống, mật khẩu tối thiểu 6 ký tự.'); return; }
  try {
    const cred = await secondaryAuth.createUserWithEmailAndPassword(emailFromMaHS(maHS), matKhau);
    await secondaryAuth.signOut();
    await db.collection('namHoc').doc(currentNamHocId).collection('lop').doc(currentLopId)
      .collection('hocSinh').doc(hsId).update({ maHS, uid: cred.user.uid });
    closeModal();
    await loadHocSinh();
  } catch (err) {
    alert(dichLoi(err));
  }
}

// ============================================================
// XUẤT EXCEL DANH SÁCH HỌC SINH (gửi trung tâm điểm danh)
// ============================================================
function taoHangDuLieu(list) {
  const header = ['STT', 'Họ và tên', 'SĐT phụ huynh', 'Lớp học trên trường', 'Điểm danh'];
  const rows = list.map((hs, i) => [i + 1, hs.hoTen, hs.sdtPhuHuynh || '', hs.lopTruong || '', '']);
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
  ws['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 12 }];
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

  // Sheet tổng hợp tất cả lớp, đặt đầu tiên
  const headerTong = ['STT', 'Họ và tên', 'Lớp học thêm', 'SĐT phụ huynh', 'Lớp học trên trường', 'Điểm danh'];
  const rowsTong = tatCa.map((hs, i) => [i + 1, hs.hoTen, hs.tenLop, hs.sdtPhuHuynh || '', hs.lopTruong || '', '']);
  const wsTong = XLSX.utils.aoa_to_sheet([headerTong, ...rowsTong]);
  wsTong['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsTong, sanitizeSheetName('Tất cả', daDungTen));

  // Mỗi lớp một sheet riêng
  dsTheoLop.forEach(({ lop, list }) => {
    const ws = XLSX.utils.aoa_to_sheet(taoHangDuLieu(list));
    ws['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(lop.ten, daDungTen));
  });

  const namHoc = namHocList.find(n => n.id === currentNamHocId);
  XLSX.writeFile(wb, `DanhSachHocSinh_${namHoc ? namHoc.ten : ''}.xlsx`.replace(/\s+/g, '_'));
}

// ============================================================
// NGÂN HÀNG CÂU HỎI (Chức năng 3 + phần nhập tay của Chức năng 2)
// ============================================================
async function loadCauHoi() {
  const snap = await db.collection('cauHoi').orderBy('createdAt', 'desc').get();
  cauHoiList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const tbody = document.getElementById('cauHoiTbody');
  document.getElementById('cauHoiEmpty').style.display = cauHoiList.length ? 'none' : 'block';
  tbody.innerHTML = cauHoiList.map(c => `
    <tr>
      <td>${formatCT(c.noiDung)}</td>
      <td>${['A','B','C','D'][c.dapAnDung]}</td>
      <td>${c.nguon === 'import' ? 'Import' : 'Nhập tay'}</td>
      <td><button class="btn btn-outline" onclick="deleteCauHoi('${c.id}')">Xóa</button></td>
    </tr>`).join('');
}

function openCauHoiModal() {
  showModal(`
    <h3>Thêm câu hỏi</h3>
    <div class="field"><label>Nội dung câu hỏi</label><textarea id="mCauNoiDung" rows="2"></textarea></div>
    <div class="field"><label>Đáp án A</label><input type="text" id="mDapA"></div>
    <div class="field"><label>Đáp án B</label><input type="text" id="mDapB"></div>
    <div class="field"><label>Đáp án C</label><input type="text" id="mDapC"></div>
    <div class="field"><label>Đáp án D</label><input type="text" id="mDapD"></div>
    <div class="field"><label>Đáp án đúng</label>
      <select id="mDapDung"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select>
    </div>
    <div class="row" style="justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveCauHoi()">Lưu</button>
    </div>`);
}
async function saveCauHoi() {
  const noiDung = document.getElementById('mCauNoiDung').value.trim();
  const dapAn = ['mDapA','mDapB','mDapC','mDapD'].map(id => document.getElementById(id).value.trim());
  const dapAnDung = parseInt(document.getElementById('mDapDung').value);
  if (!noiDung || dapAn.some(d => !d)) { alert('Điền đầy đủ nội dung và 4 đáp án.'); return; }
  await db.collection('cauHoi').add({ noiDung, dapAn, dapAnDung, nguon: 'nhap', createdAt: Date.now() });
  closeModal();
  await loadCauHoi();
}
async function deleteCauHoi(id) {
  if (!confirm('Xóa câu hỏi này khỏi ngân hàng?')) return;
  await db.collection('cauHoi').doc(id).delete();
  await loadCauHoi();
}

// Nhập câu hỏi từ Excel/CSV.
// Chấp nhận CẢ 2 kiểu file:
//  (1) Có dòng tiêu đề: NoiDung, A, B, C, D, DapAnDung
//  (2) KHÔNG có dòng tiêu đề: mỗi dòng là 1 câu hỏi, đúng thứ tự
//      cột: câu hỏi, đáp án A, B, C, D, chữ cái đáp án đúng.
function boDauVN(str) {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
function importCauHoi(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // Đọc thô theo mảng dòng/cột, không dựa vào tên cột
      let rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });

      // Nếu dòng đầu là dòng tiêu đề (chứa chữ "NoiDung"/"Câu hỏi"...) thì bỏ qua dòng đó
      const dongDau = boDauVN(rows[0] && rows[0][0]).toLowerCase().replace(/\s+/g, '');
      if (dongDau.includes('noidung') || dongDau.includes('cauhoi') || dongDau.includes('question')) {
        rows = rows.slice(1);
      }

      const map = { A: 0, B: 1, C: 2, D: 3 };
      let count = 0;
      const batch = db.batch();
      rows.forEach(r => {
        const noiDung = String(r[0] || '').trim();
        const A = String(r[1] || '').trim(), B = String(r[2] || '').trim();
        const C = String(r[3] || '').trim(), D = String(r[4] || '').trim();
        const dungRaw = String(r[5] || '').trim().toUpperCase();
        if (!noiDung || !A || !B || !C || !D || !(dungRaw in map)) return;
        const ref = db.collection('cauHoi').doc();
        batch.set(ref, {
          noiDung, dapAn: [A, B, C, D], dapAnDung: map[dungRaw],
          nguon: 'import', createdAt: Date.now()
        });
        count++;
      });
      await batch.commit();
      document.getElementById('importResult').textContent = `Đã nhập ${count} câu hỏi thành công (${rows.length - count} dòng bị bỏ qua do thiếu dữ liệu).`;
      event.target.value = '';
      await loadCauHoi();
    } catch (err) {
      document.getElementById('importResult').textContent = 'Lỗi khi đọc file: ' + err.message;
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

function openDeModal() {
  if (!cauHoiList.length) { alert('Hãy thêm câu hỏi vào ngân hàng trước (tab Ngân hàng câu hỏi).'); return; }
  const lopOptions = lopList.map(l => `<label><input type="checkbox" class="mLopCheck" value="${l.id}" data-ten="${escapeHtml(l.ten)}"> ${escapeHtml(l.ten)}</label>`).join('');
  const cauHoiOptions = cauHoiList.map(c => `<label><input type="checkbox" class="mCauCheck" value="${c.id}"> ${formatCT(c.noiDung)}</label>`).join('');
  showModal(`
    <h3>Tạo đề kiểm tra</h3>
    <div class="field"><label>Tên đề</label><input type="text" id="mDeTen"></div>
    <div class="field"><label>Thời gian làm bài (phút)</label><input type="number" id="mDeThoiLuong" value="15" min="1"></div>
    <div class="field"><label>Áp dụng cho lớp</label><div class="checkbox-list">${lopOptions || '<p class="muted">Chưa có lớp nào.</p>'}</div></div>
    <div class="field"><label>Chọn câu hỏi (${cauHoiList.length} câu trong ngân hàng)</label><div class="checkbox-list">${cauHoiOptions}</div></div>
    <div class="row" style="justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveDe()">Tạo đề</button>
    </div>`);
}
async function saveDe() {
  const tieuDe = document.getElementById('mDeTen').value.trim();
  const thoiLuongPhut = parseInt(document.getElementById('mDeThoiLuong').value) || 15;
  const lopChecks = [...document.querySelectorAll('.mLopCheck:checked')];
  const cauChecks = [...document.querySelectorAll('.mCauCheck:checked')];
  if (!tieuDe || !lopChecks.length || !cauChecks.length) { alert('Điền tên đề, chọn ít nhất 1 lớp và 1 câu hỏi.'); return; }
  await db.collection('deKiemTra').add({
    tieuDe, thoiLuongPhut,
    lopIds: lopChecks.map(c => c.value),
    lopTenList: lopChecks.map(c => c.dataset.ten),
    namHocId: currentNamHocId,
    cauHoiIds: cauChecks.map(c => c.value),
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
async function xemKetQua(deId) {
  const de = deList.find(d => d.id === deId);
  const snap = await db.collection('deKiemTra').doc(deId).collection('baiLam').get();
  const bais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const rows = bais.length
    ? bais.map(b => `<tr><td>${escapeHtml(b.hoTenHS || b.id)}</td><td>${b.diem ?? '—'}/${de.cauHoiIds.length}</td><td>${b.daNop ? 'Đã nộp' : 'Đang làm'}</td></tr>`).join('')
    : `<tr><td colspan="3" class="muted">Chưa có học sinh nào làm bài.</td></tr>`;
  showModal(`
    <h3>Kết quả — ${escapeHtml(de.tieuDe)}</h3>
    <table><thead><tr><th>Học sinh</th><th>Điểm</th><th>Trạng thái</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="row" style="justify-content:flex-end; margin-top:14px;"><button class="btn btn-outline" onclick="closeModal()">Đóng</button></div>`);
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

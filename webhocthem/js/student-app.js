let hsDoc = null;      // {id, hoTen, ...} — id của học sinh
let lopId = null, namHocId = null, lopTen = '';
let currentDe = null;   // đề đang làm {id, ...}
let currentCauHoi = [];
let dapAnDaChon = {};   // {cauHoiId: index}
let timerInterval = null;

// ============================================================
// AUTH
// ============================================================
function loginHS() {
  const ma = document.getElementById('hsMa').value.trim();
  const pass = document.getElementById('hsPass').value;
  document.getElementById('loginError').textContent = '';
  if (!ma || !pass) return;
  auth.signInWithEmailAndPassword(emailFromMaHS(ma), pass)
    .catch(err => document.getElementById('loginError').textContent = 'Sai mã học sinh hoặc mật khẩu.');
}
function logoutHS() { auth.signOut(); location.reload(); }

auth.onAuthStateChanged(async user => {
  if (user && user.email.endsWith('@hocthem.local')) {
    await timHocSinhTheoUid(user.uid);
    if (!hsDoc) {
      document.getElementById('loginError').textContent = 'Không tìm thấy hồ sơ học sinh gắn với tài khoản này.';
      auth.signOut();
      return;
    }
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('listScreen').style.display = 'flex';
    document.getElementById('hsTenLabel').textContent = hsDoc.hoTen;
    document.getElementById('hsLopLabel').textContent = lopTen;
    await loadDanhSachDe();
  } else if (!user) {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('listScreen').style.display = 'none';
    document.getElementById('examScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
  }
});

async function timHocSinhTheoUid(uid) {
  const snap = await db.collectionGroup('hocSinh').where('uid', '==', uid).limit(1).get();
  if (snap.empty) { hsDoc = null; return; }
  const doc = snap.docs[0];
  hsDoc = { id: doc.id, ...doc.data() };
  lopId = doc.ref.parent.parent.id;
  namHocId = doc.ref.parent.parent.parent.parent.id;
  const lopSnap = await doc.ref.parent.parent.get();
  lopTen = lopSnap.data().ten;
}

// ============================================================
// DANH SÁCH ĐỀ ĐANG MỞ
// ============================================================
async function loadDanhSachDe() {
  const snap = await db.collection('deKiemTra')
    .where('lopIds', 'array-contains', lopId)
    .orderBy('createdAt', 'desc').get();
  const now = Date.now();
  const el = document.getElementById('deList');
  const items = [];
  for (const doc of snap.docs) {
    const de = { id: doc.id, ...doc.data() };
    const baiLamDoc = await db.collection('deKiemTra').doc(de.id).collection('baiLam').doc(auth.currentUser.uid).get();
    const daLam = baiLamDoc.exists ? baiLamDoc.data() : null;
    const dangMo = de.trangThai === 'dang_mo' && now < de.thoiGianDong;
    if (!dangMo && !daLam) continue; // ẩn đề chưa mở / đã đóng mà HS chưa từng làm
    items.push({ de, daLam, dangMo });
  }
  if (!items.length) {
    el.innerHTML = '<div class="card empty">Hiện chưa có bài kiểm tra nào để làm.</div>';
    return;
  }
  el.innerHTML = items.map(({ de, daLam, dangMo }) => `
    <div class="card row between">
      <div>
        <h3 style="margin-bottom:2px;">${escapeHtml(de.tieuDe)}</h3>
        <p class="muted">${de.thoiLuongPhut} phút · ${de.cauHoiIds.length} câu</p>
      </div>
      ${daLam && daLam.daNop
        ? `<span class="badge badge-closed">Đã nộp — ${daLam.diem}/${de.cauHoiIds.length} điểm</span>`
        : dangMo
          ? `<button class="btn btn-primary" onclick="batDauLam('${de.id}')">Vào làm bài</button>`
          : `<span class="badge badge-closed">Đã đóng</span>`}
    </div>`).join('');
}
function veDanhSach() {
  document.getElementById('resultScreen').style.display = 'none';
  document.getElementById('listScreen').style.display = 'flex';
  loadDanhSachDe();
}

// ============================================================
// LÀM BÀI
// ============================================================
async function batDauLam(deId) {
  const doc = await db.collection('deKiemTra').doc(deId).get();
  currentDe = { id: doc.id, ...doc.data() };

  const baiLamRef = db.collection('deKiemTra').doc(deId).collection('baiLam').doc(auth.currentUser.uid);
  const baiLamSnap = await baiLamRef.get();
  if (!baiLamSnap.exists) {
    await baiLamRef.set({ hoTenHS: hsDoc.hoTen, batDau: Date.now(), daNop: false, dapAn: {} });
    dapAnDaChon = {};
  } else {
    if (baiLamSnap.data().daNop) { alert('Bạn đã nộp bài này rồi.'); return; }
    dapAnDaChon = baiLamSnap.data().dapAn || {};
  }

  const cauSnap = await db.getAll(...currentDe.cauHoiIds.map(id => db.collection('cauHoi').doc(id)));
  currentCauHoi = cauSnap.map(d => ({ id: d.id, ...d.data() }));

  document.getElementById('listScreen').style.display = 'none';
  document.getElementById('examScreen').style.display = 'block';
  document.getElementById('examTitle').textContent = currentDe.tieuDe;
  renderCauHoi();
  batDauDemGio();
}

function renderCauHoi() {
  const el = document.getElementById('examQuestions');
  el.innerHTML = currentCauHoi.map((c, i) => `
    <div class="card question-card">
      <div class="qn">Câu ${i + 1}/${currentCauHoi.length}</div>
      <div>${escapeHtml(c.noiDung)}</div>
      <div class="options">
        ${c.dapAn.map((a, idx) => `
          <div class="opt ${dapAnDaChon[c.id] === idx ? 'selected' : ''}" onclick="chonDapAn('${c.id}', ${idx})">
            <span class="letter">${['A','B','C','D'][idx]}</span><span>${escapeHtml(a)}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');
}
function chonDapAn(cauHoiId, idx) {
  dapAnDaChon[cauHoiId] = idx;
  renderCauHoi();
  db.collection('deKiemTra').doc(currentDe.id).collection('baiLam').doc(auth.currentUser.uid)
    .update({ dapAn: dapAnDaChon }).catch(() => {});
}

function batDauDemGio() {
  clearInterval(timerInterval);
  const capNhat = () => {
    const conLai = currentDe.thoiGianDong - Date.now();
    const timerEl = document.getElementById('examTimer');
    if (conLai <= 0) {
      timerEl.textContent = '00:00';
      clearInterval(timerInterval);
      nopBai(true);
      return;
    }
    const phut = Math.floor(conLai / 60000);
    const giay = Math.floor((conLai % 60000) / 1000);
    timerEl.textContent = `${String(phut).padStart(2,'0')}:${String(giay).padStart(2,'0')}`;
    timerEl.classList.toggle('low', conLai < 60000);
  };
  capNhat();
  timerInterval = setInterval(capNhat, 1000);
}

async function nopBai(tuDong) {
  if (!tuDong && !confirm('Nộp bài ngay bây giờ?')) return;
  clearInterval(timerInterval);
  let dung = 0;
  currentCauHoi.forEach(c => { if (dapAnDaChon[c.id] === c.dapAnDung) dung++; });
  await db.collection('deKiemTra').doc(currentDe.id).collection('baiLam').doc(auth.currentUser.uid).update({
    dapAn: dapAnDaChon, daNop: true, diem: dung, nopLuc: Date.now(), tuDongNop: !!tuDong
  });
  document.getElementById('examScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'flex';
  document.getElementById('resultDiem').textContent = `${dung}/${currentCauHoi.length} điểm`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

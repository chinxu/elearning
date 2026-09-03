// ============================================================
// Sổ chủ nhiệm — app.js
// ============================================================
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp, writeBatch, updateDoc,
  arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDS8i3-drJQ36vg3RBeb23j-rvW9sSwC3A",
  authDomain: "sochunhiem-1491a.firebaseapp.com",
  projectId: "sochunhiem-1491a",
  storageBucket: "sochunhiem-1491a.firebasestorage.app",
  messagingSenderId: "222899544669",
  appId: "1:222899544669:web:751c2f7eb70620eee0a3b4",
  measurementId: "G-LDFC5DC3DW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------
const MONTHS = [
  { key: "09", label: "Tháng 9" },
  { key: "10", label: "Tháng 10" },
  { key: "11", label: "Tháng 11" },
  { key: "12", label: "Tháng 12" },
  { key: "01", label: "Tháng 1" },
  { key: "02", label: "Tháng 2" },
  { key: "03", label: "Tháng 3" },
  { key: "04", label: "Tháng 4" },
  { key: "05", label: "Tháng 5" },
];

const FIELD_LABELS = {
  name: "Họ và tên",
  phone: "SĐT phụ huynh",
  dob: "Ngày sinh",
  gender: "Giới tính",
  ethnicity: "Dân tộc",
  religion: "Tôn giáo",
  nationality: "Quốc tịch",
  birthplace: "Nơi sinh",
  address: "Địa chỉ thường trú",
  idNumber: "Số CMND/CCCD",
  policyStatus: "Diện chính sách",
  disability: "Khuyết tật",
  residenceType: "Nội trú/Bán trú",
  fatherName: "Họ tên cha",
  fatherPhone: "SĐT cha",
  fatherJob: "Nghề nghiệp cha",
  fatherBirthYear: "Năm sinh cha",
  motherName: "Họ tên mẹ",
  motherPhone: "SĐT mẹ",
  motherJob: "Nghề nghiệp mẹ",
  motherBirthYear: "Năm sinh mẹ",
  className: "Lớp",
  rawImportLabel: "Nhãn gốc khi nhập",
};

// header synonyms, matched against de-accented lowercase header text
const HEADER_SYNONYMS = {
  "name": "name", "ho va ten": "name", "ho ten": "name", "ten": "name",
  "ho va ten hoc sinh": "name", "hoc sinh": "name",
  "phone": "phone", "so dien thoai": "phone", "dien thoai": "phone",
  "sdt": "phone", "so dien thoai phu huynh": "phone", "sdt phu huynh": "phone",
  "ngay sinh": "dob", "ngay thang nam sinh": "dob", "ngay/thang/nam sinh": "dob",
  "gioi tinh": "gender",
  "dan toc": "ethnicity",
  "ton giao": "religion",
  "quoc tich": "nationality",
  "noi sinh": "birthplace",
  "dia chi": "address", "ho khau thuong tru": "address",
  "dia chi thuong tru": "address", "noi o hien nay": "address",
  "so cmnd": "idNumber", "cmnd": "idNumber", "cccd": "idNumber",
  "so cccd": "idNumber", "so dinh danh ca nhan": "idNumber", "cmnd/cccd": "idNumber",
  "dien chinh sach": "policyStatus",
  "khuyet tat": "disability", "dang khuyet tat": "disability",
  "noi tru, ban tru": "residenceType", "noi tru ban tru": "residenceType",
  "ho ten cha": "fatherName", "ten cha": "fatherName",
  "sdt cha": "fatherPhone", "dien thoai cha": "fatherPhone", "dien thoai bo": "fatherPhone",
  "nghe nghiep cha": "fatherJob",
  "nam sinh cha": "fatherBirthYear",
  "ho ten me": "motherName", "ten me": "motherName",
  "sdt me": "motherPhone", "dien thoai me": "motherPhone",
  "nghe nghiep me": "motherJob",
  "nam sinh me": "motherBirthYear",
  "lop": "className",
  "dien thoai sll": "phone", "so lien lac": "phone", "dien thoai lien lac": "phone",
  "stt": "skip",
};

const CORE_ORDER = ["name", "className", "phone", "dob", "gender", "ethnicity",
  "religion", "nationality", "birthplace", "address", "idNumber",
  "policyStatus", "disability", "residenceType",
  "fatherName", "fatherPhone", "fatherJob", "fatherBirthYear",
  "motherName", "motherPhone", "motherJob", "motherBirthYear"];

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
const state = {
  user: null,
  role: null, // 'teacher' | 'officer'
  officerInfo: null,
  officerStudents: [],
  officerSelectedMonth: MONTHS[0].key,
  officers: [],
  yearId: null,
  years: [],
  students: [],
  classes: [],
  defaultClassId: null,
  selectedStudentId: null,
  tab: "lylich",
  selectedMonth: MONTHS[0].key,
  editingLyLich: false,
  comments: {},
  violations: {},
  unsubStudents: null,
  unsubComments: null,
  unsubClasses: null,
  unsubViolationsTeacher: null,
  unsubViolationsOfficer: null,
  unsubOfficers: null,
  parsedRows: null,
  workbook: null,
};

// ---------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------
const $ = (id) => document.getElementById(id);
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove("show"), 2600);
}
function stripDiacritics(str) {
  return String(str || "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase();
}
function slugify(str) {
  return stripDiacritics(str).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------
// Auth
// ---------------------------------------------------------------
$("loginBtn").addEventListener("click", doLogin);
$("loginPass").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });

async function doLogin() {
  const email = $("loginEmail").value.trim();
  const pass = $("loginPass").value;
  $("loginError").textContent = "";
  if (!email || !pass) {
    $("loginError").textContent = "Nhập email và mật khẩu.";
    return;
  }
  $("loginBtn").disabled = true;
  $("loginBtn").textContent = "Đang đăng nhập…";
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    $("loginError").textContent = describeAuthError(err);
  } finally {
    $("loginBtn").disabled = false;
    $("loginBtn").textContent = "Đăng nhập";
  }
}

function describeAuthError(err) {
  const code = err && err.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (code.includes("too-many-requests")) return "Thử lại sau ít phút — quá nhiều lần đăng nhập sai.";
  return "Không đăng nhập được. Kiểm tra kết nối mạng và thử lại.";
}

$("logoutBtn").addEventListener("click", () => signOut(auth));
$("officerLogoutBtn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  if (user) {
    let officerSnap;
    try {
      officerSnap = await getDoc(doc(db, "officerAccounts", user.uid));
    } catch (err) {
      console.error(err);
      officerSnap = null;
    }
    if (officerSnap && officerSnap.exists()) {
      const info = officerSnap.data();
      if (info.status === "revoked") {
        toast("Tài khoản này đã bị khoá. Liên hệ giáo viên chủ nhiệm.");
        await signOut(auth);
        return;
      }
      state.role = "officer";
      state.officerInfo = { id: user.uid, ...info };
      $("loginScreen").style.display = "none";
      $("app").classList.remove("active");
      $("officerApp").style.display = "block";
      bootstrapOfficerView();
    } else {
      state.role = "teacher";
      $("loginScreen").style.display = "none";
      $("officerApp").style.display = "none";
      $("app").classList.add("active");
      $("userEmailLabel").textContent = user.email || "";
      bootstrapYears();
    }
  } else {
    state.role = null;
    state.officerInfo = null;
    $("app").classList.remove("active");
    $("officerApp").style.display = "none";
    $("loginScreen").style.display = "flex";
    if (state.unsubStudents) state.unsubStudents();
    if (state.unsubComments) state.unsubComments();
    if (state.unsubClasses) state.unsubClasses();
    if (state.unsubViolationsTeacher) state.unsubViolationsTeacher();
    if (state.unsubViolationsOfficer) state.unsubViolationsOfficer();
    if (state.unsubOfficers) state.unsubOfficers();
  }
});

// ---------------------------------------------------------------
// Years
// ---------------------------------------------------------------
async function bootstrapYears() {
  const snap = await getDocs(query(collection(db, "schoolYears"), orderBy("label", "desc")));
  state.years = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderYearOptions();
  if (state.years.length) {
    selectYear(state.years[0].id);
  } else {
    renderEmptyStudentUI();
  }
}

function renderYearOptions() {
  const opts = state.years.map(y => `<option value="${y.id}">${escapeHtml(y.label)}</option>`).join("");
  $("yearSelect").innerHTML = opts || `<option value="">Chưa có năm học</option>`;
  $("importYearSelect").innerHTML = opts || `<option value="">Chưa có năm học</option>`;
  if (state.yearId) {
    $("yearSelect").value = state.yearId;
    $("importYearSelect").value = state.yearId;
  }
  $("deleteYearBtn").disabled = !state.years.length;
  $("deleteYearBtn").style.opacity = state.years.length ? "1" : ".4";
}

$("yearSelect").addEventListener("change", (e) => selectYear(e.target.value));

function selectYear(yearId) {
  state.yearId = yearId;
  $("yearSelect").value = yearId;
  $("importYearSelect").value = yearId;
  deselectStudent();
  subscribeStudents();
  subscribeClasses();
}

$("addYearBtn").addEventListener("click", () => openYearModal());

function openYearModal() {
  $("newYearInput").value = "";
  $("newYearClassInput").value = "";
  $("yearModal").classList.add("active");
  setTimeout(() => $("newYearInput").focus(), 30);
}
$("closeYearBtn").addEventListener("click", () => $("yearModal").classList.remove("active"));
$("cancelYearBtn").addEventListener("click", () => $("yearModal").classList.remove("active"));
$("confirmYearBtn").addEventListener("click", async () => {
  const label = $("newYearInput").value.trim();
  const className = $("newYearClassInput").value.trim();
  if (!label) return;
  $("confirmYearBtn").disabled = true;
  try {
    const ref = doc(collection(db, "schoolYears"));
    await setDoc(ref, { label, createdAt: serverTimestamp() });
    state.years.unshift({ id: ref.id, label });
    renderYearOptions();
    selectYear(ref.id);
    if (className) {
      const classRef = doc(collection(db, "schoolYears", ref.id, "classes"));
      await setDoc(classRef, { name: className, createdAt: serverTimestamp() });
      await updateDoc(doc(db, "schoolYears", ref.id), { defaultClassId: classRef.id });
    }
    $("yearModal").classList.remove("active");
    toast("Đã thêm năm học " + label);
  } catch (err) {
    console.error(err);
    toast("Không thêm được năm học. Thử lại.");
  } finally {
    $("confirmYearBtn").disabled = false;
  }
});

$("deleteYearBtn").addEventListener("click", () => openDeleteYearModal(state.yearId));

function openDeleteYearModal(yearId) {
  const year = state.years.find(y => y.id === yearId);
  if (!year) { toast("Chưa có năm học nào để xoá."); return; }
  $("deleteYearWarning").textContent =
    `Toàn bộ danh sách học sinh, lý lịch, nhận xét và các lớp trong năm học "${year.label}" sẽ bị xoá vĩnh viễn, không thể khôi phục.`;
  $("deleteYearConfirmInput").value = "";
  $("deleteYearConfirmInput").placeholder = year.label;
  $("confirmDeleteYearBtn").disabled = true;
  $("deleteYearModal").dataset.yearId = yearId;
  $("deleteYearModal").classList.add("active");
  setTimeout(() => $("deleteYearConfirmInput").focus(), 30);
}
$("closeDeleteYearBtn").addEventListener("click", () => $("deleteYearModal").classList.remove("active"));
$("cancelDeleteYearBtn").addEventListener("click", () => $("deleteYearModal").classList.remove("active"));
$("deleteYearConfirmInput").addEventListener("input", () => {
  const yearId = $("deleteYearModal").dataset.yearId;
  const year = state.years.find(y => y.id === yearId);
  $("confirmDeleteYearBtn").disabled = !year || $("deleteYearConfirmInput").value.trim() !== year.label;
});
$("confirmDeleteYearBtn").addEventListener("click", async () => {
  const yearId = $("deleteYearModal").dataset.yearId;
  await performDeleteYear(yearId);
  $("deleteYearModal").classList.remove("active");
});

async function performDeleteYear(yearId) {
  const year = state.years.find(y => y.id === yearId);
  if (!year) return;
  $("confirmDeleteYearBtn").disabled = true;
  $("confirmDeleteYearBtn").textContent = "Đang xoá…";
  try {
    const studentsSnap = await getDocs(collection(db, "schoolYears", yearId, "students"));
    const refsToDelete = [];
    studentsSnap.docs.forEach(sDoc => {
      MONTHS.forEach(m => {
        refsToDelete.push(doc(db, "schoolYears", yearId, "students", sDoc.id, "comments", m.key));
        refsToDelete.push(doc(db, "schoolYears", yearId, "students", sDoc.id, "violations", m.key));
      });
      refsToDelete.push(doc(db, "schoolYears", yearId, "students", sDoc.id));
    });
    const classesSnap = await getDocs(collection(db, "schoolYears", yearId, "classes"));
    classesSnap.docs.forEach(cDoc => refsToDelete.push(doc(db, "schoolYears", yearId, "classes", cDoc.id)));
    refsToDelete.push(doc(db, "schoolYears", yearId));

    // Tài khoản cán bộ lớp: KHOÁ (không xoá hẳn) — nếu xoá bản ghi này,
    // tài khoản đó sẽ bị hiểu nhầm thành tài khoản giáo viên ở lần đăng nhập sau.
    const officersSnap = await getDocs(query(collection(db, "officerAccounts"), where("yearId", "==", yearId)));

    for (let i = 0; i < refsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      refsToDelete.slice(i, i + 400).forEach(ref => batch.delete(ref));
      await batch.commit();
    }
    for (let i = 0; i < officersSnap.docs.length; i += 400) {
      const batch = writeBatch(db);
      officersSnap.docs.slice(i, i + 400).forEach(oDoc => batch.update(doc(db, "officerAccounts", oDoc.id), { status: "revoked" }));
      await batch.commit();
    }

    state.years = state.years.filter(y => y.id !== yearId);
    if (state.yearId === yearId) {
      if (state.unsubStudents) state.unsubStudents();
      if (state.unsubComments) state.unsubComments();
      if (state.unsubClasses) state.unsubClasses();
      state.yearId = null;
      state.students = [];
      state.classes = [];
      state.defaultClassId = null;
      deselectStudent();
      renderStudentList();
      renderClassList();
      $("statCount").textContent = "0";
    }
    renderYearOptions();
    if (!state.yearId && state.years.length) selectYear(state.years[0].id);
    toast(`Đã xoá năm học "${year.label}".`);
  } catch (err) {
    console.error(err);
    toast("Không xoá được năm học: " + (err && err.message ? err.message : "lỗi không xác định."));
  } finally {
    $("confirmDeleteYearBtn").disabled = false;
    $("confirmDeleteYearBtn").textContent = "Xoá vĩnh viễn";
  }
}

// ---------------------------------------------------------------
// Lớp trong năm học
// ---------------------------------------------------------------
function subscribeClasses() {
  if (state.unsubClasses) state.unsubClasses();
  state.classes = [];
  state.defaultClassId = null;
  if (!state.yearId) { renderClassList(); return; }
  getDoc(doc(db, "schoolYears", state.yearId)).then(snap => {
    state.defaultClassId = snap.exists() ? (snap.data().defaultClassId || null) : null;
    renderClassList();
  });
  const col = collection(db, "schoolYears", state.yearId, "classes");
  state.unsubClasses = onSnapshot(col, (snap) => {
    state.classes = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
    renderClassList();
  });
}

function renderClassList() {
  if (!state.classes.length) {
    $("classList").innerHTML = `<span class="empty-note">Chưa có lớp nào.</span>`;
    return;
  }
  $("classList").innerHTML = state.classes.map(c => `
    <span class="class-chip ${c.id === state.defaultClassId ? "default" : ""}" data-class-id="${c.id}">
      <button type="button" class="set-default" data-set-default="${c.id}" title="Đặt làm lớp mặc định khi xuất phiếu">${escapeHtml(c.name)}</button>
      <button type="button" class="rm-class" data-rm-class="${c.id}" title="Xoá lớp">&times;</button>
    </span>`).join("");
  $("classList").querySelectorAll("[data-set-default]").forEach(btn => {
    btn.addEventListener("click", () => setDefaultClass(btn.dataset.setDefault));
  });
  $("classList").querySelectorAll("[data-rm-class]").forEach(btn => {
    btn.addEventListener("click", () => deleteClass(btn.dataset.rmClass));
  });
}

async function setDefaultClass(classId) {
  if (!state.yearId) return;
  try {
    await updateDoc(doc(db, "schoolYears", state.yearId), { defaultClassId: classId });
    state.defaultClassId = classId;
    renderClassList();
  } catch (err) {
    console.error(err);
    toast("Không đặt được lớp mặc định.");
  }
}

$("addClassBtn").addEventListener("click", addClass);
$("newClassInput").addEventListener("keydown", (e) => { if (e.key === "Enter") addClass(); });

async function addClass() {
  const name = $("newClassInput").value.trim();
  if (!name) return;
  if (!state.yearId) { toast("Chọn hoặc thêm một năm học trước."); return; }
  $("addClassBtn").disabled = true;
  try {
    const ref = doc(collection(db, "schoolYears", state.yearId, "classes"));
    await setDoc(ref, { name, createdAt: serverTimestamp() });
    if (!state.defaultClassId) {
      await updateDoc(doc(db, "schoolYears", state.yearId), { defaultClassId: ref.id });
      state.defaultClassId = ref.id;
    }
    $("newClassInput").value = "";
    toast("Đã thêm lớp " + name);
  } catch (err) {
    console.error(err);
    toast("Không thêm được lớp. Thử lại.");
  } finally {
    $("addClassBtn").disabled = false;
  }
}

async function deleteClass(classId) {
  const c = state.classes.find(x => x.id === classId);
  if (!c) return;
  if (!confirm(`Xoá lớp "${c.name}"? (Không ảnh hưởng đến lý lịch học sinh đã lưu.)`)) return;
  try {
    await deleteDoc(doc(db, "schoolYears", state.yearId, "classes", classId));
    if (state.defaultClassId === classId) {
      const next = state.classes.find(x => x.id !== classId);
      await updateDoc(doc(db, "schoolYears", state.yearId), { defaultClassId: next ? next.id : null });
      state.defaultClassId = next ? next.id : null;
    }
    toast("Đã xoá lớp.");
  } catch (err) {
    console.error(err);
    toast("Không xoá được lớp. Thử lại.");
  }
}

function resolveClassName(student) {
  if (student?.fields?.className) return student.fields.className;
  const def = state.classes.find(c => c.id === state.defaultClassId);
  if (def) return def.name;
  if (state.classes.length === 1) return state.classes[0].name;
  return "";
}

// ---------------------------------------------------------------
// Students list (realtime)
// ---------------------------------------------------------------
function subscribeStudents() {
  if (state.unsubStudents) state.unsubStudents();
  if (!state.yearId) { state.students = []; renderStudentList(); renderEmptyStudentUI(); return; }
  const col = collection(db, "schoolYears", state.yearId, "students");
  state.unsubStudents = onSnapshot(col, (snap) => {
    state.students = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.fields?.name || "").localeCompare(b.fields?.name || "", "vi"));
    renderStudentList();
    $("statCount").textContent = state.students.length;
    if (state.selectedStudentId && !state.students.find(s => s.id === state.selectedStudentId)) {
      deselectStudent();
    }
  }, (err) => {
    console.error(err);
    toast("Không tải được danh sách học sinh.");
  });
}

function renderStudentList() {
  const term = stripDiacritics($("studentSearch").value);
  const filtered = state.students.filter(s => stripDiacritics(s.fields?.name || "").includes(term));
  if (!filtered.length) {
    $("studentList").innerHTML = `<li class="empty-note">${state.students.length ? "Không tìm thấy học sinh." : "Chưa có học sinh nào trong năm học này."}</li>`;
    return;
  }
  $("studentList").innerHTML = filtered.map((s, i) => `
    <li>
      <button class="${s.id === state.selectedStudentId ? "selected" : ""}" data-id="${s.id}">
        <span>${escapeHtml(s.fields?.name || "(chưa có tên)")}</span>
        <span class="num">${i + 1}</span>
      </button>
    </li>`).join("");
  $("studentList").querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => selectStudent(btn.dataset.id));
  });
}
$("studentSearch").addEventListener("input", renderStudentList);

// ---------------------------------------------------------------
// Student detail
// ---------------------------------------------------------------
function deselectStudent() {
  state.selectedStudentId = null;
  state.editingLyLich = false;
  if (state.unsubComments) state.unsubComments();
  if (state.unsubViolationsTeacher) state.unsubViolationsTeacher();
  renderEmptyStudentUI();
  renderStudentList();
}

function renderEmptyStudentUI() {
  $("emptyState").style.display = "block";
  $("studentDetail").style.display = "none";
}

function selectStudent(id) {
  state.selectedStudentId = id;
  state.editingLyLich = false;
  state.tab = "lylich";
  state.exportMonths = new Set();
  renderStudentList();
  $("emptyState").style.display = "none";
  $("studentDetail").style.display = "block";
  renderStudentDetail();
  showTab("lylich");
  subscribeComments();
  subscribeViolationsTeacher();
}

function currentStudent() {
  return state.students.find(s => s.id === state.selectedStudentId);
}

function renderStudentDetail() {
  const s = currentStudent();
  if (!s) return;
  $("detailName").textContent = s.fields?.name || "(chưa có tên)";
  const bits = [];
  const cls = resolveClassName(s);
  if (cls) bits.push("Lớp " + cls);
  if (s.fields?.dob) bits.push(s.fields.dob);
  $("detailSub").textContent = bits.join(" · ");
  renderFieldList();
}

function renderFieldList() {
  const s = currentStudent();
  if (!s) return;
  const fields = s.fields || {};
  const keys = Object.keys(fields).filter(k => k !== "name");
  keys.sort((a, b) => {
    const ia = CORE_ORDER.indexOf(a), ib = CORE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const editing = state.editingLyLich;
  let rows = `
    <div class="field-row ${editing ? "editing" : ""}">
      <div class="flabel">Họ và tên</div>
      <div class="fval">${editing ? `<input data-field="name" value="${escapeAttr(fields.name || "")}" />` : escapeHtml(fields.name || "—")}</div>
      <div></div>
    </div>`;
  rows += keys.map(k => `
    <div class="field-row ${editing ? "editing" : ""}" data-key="${escapeAttr(k)}">
      <div class="flabel">${escapeHtml(FIELD_LABELS[k] || k)}</div>
      <div class="fval">${editing ? `<input data-field="${escapeAttr(k)}" value="${escapeAttr(fields[k] || "")}" />` : escapeHtml(fields[k] || "—")}</div>
      <div>${editing ? `<button class="rm-field" data-rm="${escapeAttr(k)}" title="Xoá trường">&times;</button>` : ""}</div>
    </div>`).join("");
  $("fieldList").innerHTML = rows;

  if (editing) {
    $("fieldList").querySelectorAll("[data-rm]").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.closest(".field-row").remove();
      });
    });
  }
  $("addFieldBtn").style.display = editing ? "inline-block" : "none";
  $("editLyLichBtn").style.display = editing ? "none" : "inline-block";
  $("saveLyLichBtn").style.display = editing ? "inline-block" : "none";
  $("cancelLyLichBtn").style.display = editing ? "inline-block" : "none";
}

$("editLyLichBtn").addEventListener("click", () => {
  state.editingLyLich = true;
  renderFieldList();
});
$("cancelLyLichBtn").addEventListener("click", () => {
  state.editingLyLich = false;
  renderFieldList();
});
$("addFieldBtn").addEventListener("click", () => {
  const label = prompt("Tên trường thông tin mới (ví dụ: Ghi chú sức khoẻ):");
  if (!label) return;
  const key = "custom_" + slugify(label) + "_" + Math.random().toString(36).slice(2, 6);
  FIELD_LABELS[key] = label;
  const row = document.createElement("div");
  row.className = "field-row editing";
  row.dataset.key = key;
  row.innerHTML = `
    <div class="flabel">${escapeHtml(label)}</div>
    <div class="fval"><input data-field="${escapeAttr(key)}" value="" /></div>
    <div><button class="rm-field" data-rm="${escapeAttr(key)}" title="Xoá trường">&times;</button></div>`;
  row.querySelector("[data-rm]").addEventListener("click", () => row.remove());
  $("fieldList").appendChild(row);
  row.querySelector("input").focus();
});

$("saveLyLichBtn").addEventListener("click", async () => {
  const s = currentStudent();
  if (!s) return;
  const fields = {};
  $("fieldList").querySelectorAll("input[data-field]").forEach(inp => {
    const val = inp.value.trim();
    if (val) fields[inp.dataset.field] = val;
  });
  $("saveLyLichBtn").disabled = true;
  try {
    await updateDoc(doc(db, "schoolYears", state.yearId, "students", s.id), {
      fields, updatedAt: serverTimestamp(),
    });
    state.editingLyLich = false;
    toast("Đã lưu lý lịch.");
  } catch (err) {
    console.error(err);
    toast("Không lưu được. Thử lại.");
  } finally {
    $("saveLyLichBtn").disabled = false;
  }
});

$("deleteStudentBtn").addEventListener("click", async () => {
  const s = currentStudent();
  if (!s) return;
  if (!confirm(`Xoá học sinh "${s.fields?.name || ""}" khỏi năm học này? Nhận xét và vi phạm của học sinh cũng sẽ bị xoá.`)) return;
  try {
    for (const m of MONTHS) {
      await deleteDoc(doc(db, "schoolYears", state.yearId, "students", s.id, "comments", m.key)).catch(() => {});
      await deleteDoc(doc(db, "schoolYears", state.yearId, "students", s.id, "violations", m.key)).catch(() => {});
    }
    await deleteDoc(doc(db, "schoolYears", state.yearId, "students", s.id));
    toast("Đã xoá học sinh.");
    deselectStudent();
  } catch (err) {
    console.error(err);
    toast("Không xoá được. Thử lại.");
  }
});

// ---------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------
$("tabLyLichBtn").addEventListener("click", () => showTab("lylich"));
$("tabNhanXetBtn").addEventListener("click", () => showTab("nhanxet"));
function showTab(tab) {
  state.tab = tab;
  $("tabLyLichBtn").classList.toggle("active", tab === "lylich");
  $("tabNhanXetBtn").classList.toggle("active", tab === "nhanxet");
  $("panelLyLich").style.display = tab === "lylich" ? "block" : "none";
  $("panelNhanXet").style.display = tab === "nhanxet" ? "block" : "none";
  if (tab === "nhanxet") renderMonthRow();
}

// ---------------------------------------------------------------
// Comments (nhận xét theo tháng)
// ---------------------------------------------------------------
function subscribeComments() {
  if (state.unsubComments) state.unsubComments();
  state.comments = {};
  const s = currentStudent();
  if (!s) return;
  const col = collection(db, "schoolYears", state.yearId, "students", s.id, "comments");
  state.unsubComments = onSnapshot(col, (snap) => {
    state.comments = {};
    snap.docs.forEach(d => { state.comments[d.id] = d.data(); });
    if (state.tab === "nhanxet") renderMonthRow();
  });
}

function renderMonthRow() {
  $("monthRow").innerHTML = MONTHS.map(m => `
    <button class="month-chip ${m.key === state.selectedMonth ? "active" : ""} ${state.comments[m.key]?.text ? "has-note" : ""} ${(state.violations[m.key]?.entries || []).length ? "has-violation" : ""}" data-month="${m.key}">${m.label}</button>
  `).join("");
  $("monthRow").querySelectorAll("[data-month]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.selectedMonth = btn.dataset.month;
      renderMonthRow();
      renderCommentBox();
    });
  });
  renderCommentBox();
  renderExportMonths();
  renderViolationsBox();
}

function renderCommentBox() {
  const c = state.comments[state.selectedMonth];
  $("commentText").value = c?.text || "";
  if (c?.updatedAt?.toDate) {
    $("commentUpdatedAt").textContent = "Cập nhật lúc " + c.updatedAt.toDate().toLocaleString("vi-VN");
  } else {
    $("commentUpdatedAt").textContent = "";
  }
}

// ---------------------------------------------------------------
// Vi phạm do cán bộ lớp báo cáo (xem & chuyển vào nhận xét)
// ---------------------------------------------------------------
function subscribeViolationsTeacher() {
  if (state.unsubViolationsTeacher) state.unsubViolationsTeacher();
  state.violations = {};
  const s = currentStudent();
  if (!s) return;
  const col = collection(db, "schoolYears", state.yearId, "students", s.id, "violations");
  state.unsubViolationsTeacher = onSnapshot(col, (snap) => {
    state.violations = {};
    snap.docs.forEach(d => { state.violations[d.id] = d.data(); });
    if (state.tab === "nhanxet") {
      renderMonthRow();
    }
  });
}

function renderViolationsBox() {
  const entries = (state.violations[state.selectedMonth]?.entries) || [];
  if (!entries.length) {
    $("violationsBox").style.display = "none";
    return;
  }
  $("violationsBox").style.display = "block";
  $("violationEntries").innerHTML = entries.map((e, idx) => `
    <div class="violation-entry">
      <div>${escapeHtml(e.text)}</div>
      <div class="violation-meta" style="display:flex;justify-content:space-between;align-items:center;">
        <span>${escapeHtml(e.createdByName || e.createdByEmail || "")}${e.createdAt ? " · " + new Date(e.createdAt).toLocaleString("vi-VN") : ""}</span>
        <button type="button" class="violation-rm" data-rm-teacher-violation="${idx}" title="Xoá vi phạm này">Xoá</button>
      </div>
    </div>`).join("");
  $("violationEntries").querySelectorAll("[data-rm-teacher-violation]").forEach(btn => {
    btn.addEventListener("click", () => deleteViolationEntry(Number(btn.dataset.rmTeacherViolation)));
  });
}

async function deleteViolationEntry(idx) {
  const s = currentStudent();
  if (!s) return;
  const entries = (state.violations[state.selectedMonth]?.entries) || [];
  const entry = entries[idx];
  if (!entry) return;
  try {
    await updateDoc(
      doc(db, "schoolYears", state.yearId, "students", s.id, "violations", state.selectedMonth),
      { entries: arrayRemove(entry) }
    );
    toast("Đã xoá vi phạm.");
  } catch (err) {
    console.error(err);
    toast("Không xoá được. Thử lại.");
  }
}

$("mergeViolationsBtn").addEventListener("click", () => {
  const entries = (state.violations[state.selectedMonth]?.entries) || [];
  if (!entries.length) return;
  const text = entries.map(e => e.text).join(", ");
  const existing = $("commentText").value.trim();
  $("commentText").value = existing ? existing + ", " + text : text;
  toast("Đã chuyển vi phạm vào ô nhận xét — nhớ bấm Lưu nhận xét.");
});

$("saveCommentBtn").addEventListener("click", async () => {
  const s = currentStudent();
  if (!s) return;
  const text = $("commentText").value;
  $("saveCommentBtn").disabled = true;
  try {
    await setDoc(doc(db, "schoolYears", state.yearId, "students", s.id, "comments", state.selectedMonth), {
      text, updatedAt: serverTimestamp(),
    }, { merge: true });
    toast("Đã lưu nhận xét.");
  } catch (err) {
    console.error(err);
    toast("Không lưu được nhận xét. Thử lại.");
  } finally {
    $("saveCommentBtn").disabled = false;
  }
});

// ---------------------------------------------------------------
// Quản lý tài khoản cán bộ lớp (dành cho giáo viên)
// ---------------------------------------------------------------
$("manageOfficersBtn").addEventListener("click", () => openOfficersModal());
$("closeOfficersBtn").addEventListener("click", () => $("officersModal").classList.remove("active"));

function openOfficersModal() {
  if (!state.yearId) { toast("Chọn một năm học trước."); return; }
  const year = state.years.find(y => y.id === state.yearId);
  $("officersModalYearLabel").textContent = year ? year.label : "";
  $("newOfficerClass").innerHTML = state.classes.length
    ? state.classes.map(c => `<option value="${escapeAttr(c.name)}">${escapeHtml(c.name)}</option>`).join("")
    : `<option value="">(chưa có lớp)</option>`;
  $("newOfficerName").value = "";
  $("newOfficerEmail").value = "";
  $("newOfficerPassword").value = "";
  subscribeOfficersForYear();
  $("officersModal").classList.add("active");
}

function subscribeOfficersForYear() {
  if (state.unsubOfficers) state.unsubOfficers();
  if (!state.yearId) return;
  const q = query(collection(db, "officerAccounts"), where("yearId", "==", state.yearId));
  state.unsubOfficers = onSnapshot(q, (snap) => {
    state.officers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.officers.sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || "", "vi"));
    renderOfficersList();
  }, (err) => {
    console.error(err);
    toast("Không tải được danh sách cán bộ lớp.");
  });
}

function renderOfficersList() {
  if (!state.officers.length) {
    $("officersList").innerHTML = `<div class="export-hint">Chưa có tài khoản cán bộ lớp nào trong năm học này.</div>`;
    return;
  }
  $("officersList").innerHTML = state.officers.map(o => `
    <div class="officer-row">
      <div>
        <div>${escapeHtml(o.name || o.email)} <span class="muted-inline">(${escapeHtml(o.email)})</span></div>
        <div class="officer-sub">Lớp ${escapeHtml(o.className || "—")} · ${o.status === "revoked" ? "Đã khoá" : "Đang hoạt động"}</div>
      </div>
      <button class="btn btn-ghost btn-sm" data-toggle-officer="${o.id}">${o.status === "revoked" ? "Mở khoá" : "Khoá"}</button>
    </div>`).join("");
  $("officersList").querySelectorAll("[data-toggle-officer]").forEach(btn => {
    btn.addEventListener("click", () => toggleOfficerStatus(btn.dataset.toggleOfficer));
  });
}

async function toggleOfficerStatus(uid) {
  const o = state.officers.find(x => x.id === uid);
  if (!o) return;
  const newStatus = o.status === "revoked" ? "active" : "revoked";
  try {
    await updateDoc(doc(db, "officerAccounts", uid), { status: newStatus });
    toast(newStatus === "revoked" ? "Đã khoá tài khoản." : "Đã mở khoá tài khoản.");
  } catch (err) {
    console.error(err);
    toast("Không cập nhật được trạng thái tài khoản.");
  }
}

$("createOfficerBtn").addEventListener("click", async () => {
  const name = $("newOfficerName").value.trim();
  const className = $("newOfficerClass").value;
  const email = $("newOfficerEmail").value.trim();
  const password = $("newOfficerPassword").value;
  if (!email || !password) { toast("Nhập email và mật khẩu."); return; }
  if (password.length < 6) { toast("Mật khẩu cần ít nhất 6 ký tự."); return; }
  $("createOfficerBtn").disabled = true;
  $("createOfficerBtn").textContent = "Đang tạo…";
  try {
    await createOfficerAccount(email, password, state.yearId, className, name);
    toast("Đã tạo tài khoản cán bộ lớp.");
    $("newOfficerName").value = "";
    $("newOfficerEmail").value = "";
    $("newOfficerPassword").value = "";
  } catch (err) {
    console.error(err);
    toast("Không tạo được tài khoản: " + describeAuthError(err));
  } finally {
    $("createOfficerBtn").disabled = false;
    $("createOfficerBtn").textContent = "Cấp tài khoản";
  }
});

async function createOfficerAccount(email, password, yearId, className, displayName) {
  // Dùng một Firebase app phụ để tạo tài khoản mới mà KHÔNG làm mất phiên
  // đăng nhập hiện tại của giáo viên (client SDK tự đăng nhập vào tài khoản
  // vừa tạo trên app đó, nên phải tạo trên một app riêng rồi huỷ đi).
  const secondaryApp = initializeApp(firebaseConfig, "officer-creator-" + Date.now());
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;
    await setDoc(doc(db, "officerAccounts", uid), {
      email, name: displayName || "", yearId, className: className || "",
      status: "active", createdAt: serverTimestamp(), createdBy: state.user?.email || "",
    });
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    return uid;
  } catch (err) {
    try { await deleteApp(secondaryApp); } catch (e) { /* ignore */ }
    throw err;
  }
}

// ---------------------------------------------------------------
// Học sinh vi phạm theo tháng (tổng quan cho giáo viên)
// ---------------------------------------------------------------
state.violationsOverviewMonth = null;

$("openViolationsOverviewBtn").addEventListener("click", () => {
  if (!state.yearId) { toast("Chọn một năm học trước."); return; }
  state.violationsOverviewMonth = state.violationsOverviewMonth || MONTHS[0].key;
  renderViolationsOverviewMonthRow();
  loadViolationsOverview(state.violationsOverviewMonth);
  $("violationsOverviewModal").classList.add("active");
});
$("closeViolationsOverviewBtn").addEventListener("click", () => $("violationsOverviewModal").classList.remove("active"));

function renderViolationsOverviewMonthRow() {
  $("violationsOverviewMonthRow").innerHTML = MONTHS.map(m => `
    <button class="month-chip ${m.key === state.violationsOverviewMonth ? "active" : ""}" data-ovmonth="${m.key}">${m.label}</button>
  `).join("");
  $("violationsOverviewMonthRow").querySelectorAll("[data-ovmonth]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.violationsOverviewMonth = btn.dataset.ovmonth;
      renderViolationsOverviewMonthRow();
      loadViolationsOverview(state.violationsOverviewMonth);
    });
  });
}

async function loadViolationsOverview(monthKey) {
  $("violationsOverviewList").innerHTML = `<div class="export-hint">Đang tải…</div>`;
  try {
    const results = await Promise.all(state.students.map(async (s) => {
      try {
        const snap = await getDoc(doc(db, "schoolYears", state.yearId, "students", s.id, "violations", monthKey));
        const entries = snap.exists() ? (snap.data().entries || []) : [];
        return { student: s, entries };
      } catch (err) {
        console.error(err);
        return { student: s, entries: [] };
      }
    }));
    const withViolations = results.filter(r => r.entries.length > 0);
    withViolations.sort((a, b) => (a.student.fields?.name || "").localeCompare(b.student.fields?.name || "", "vi"));
    renderViolationsOverview(withViolations, monthKey);
  } catch (err) {
    console.error(err);
    $("violationsOverviewList").innerHTML = `<div class="export-hint">Không tải được dữ liệu vi phạm.</div>`;
  }
}

function renderViolationsOverview(results, monthKey) {
  if (!results.length) {
    $("violationsOverviewList").innerHTML = `<div class="export-hint">Không có học sinh nào bị ghi nhận vi phạm trong tháng này.</div>`;
    return;
  }
  $("violationsOverviewList").innerHTML = results.map(r => `
    <div class="overview-student-block">
      <div class="overview-student-header">
        <span>${escapeHtml(r.student.fields?.name || "(chưa có tên)")} <span class="muted-inline">(${r.entries.length} vi phạm)</span></span>
        <button class="btn btn-ghost btn-sm" data-jump-student="${r.student.id}">Xem trong Nhận xét</button>
      </div>
      ${r.entries.map(e => `
        <div class="violation-entry">
          <div>${escapeHtml(e.text)}</div>
          <div class="violation-meta">${escapeHtml(e.createdByName || e.createdByEmail || "")}${e.createdAt ? " · " + new Date(e.createdAt).toLocaleString("vi-VN") : ""}</div>
        </div>`).join("")}
    </div>`).join("");
  $("violationsOverviewList").querySelectorAll("[data-jump-student]").forEach(btn => {
    btn.addEventListener("click", () => jumpToStudentViolations(btn.dataset.jumpStudent, monthKey));
  });
}

function jumpToStudentViolations(studentId, monthKey) {
  $("violationsOverviewModal").classList.remove("active");
  selectStudent(studentId);
  state.selectedMonth = monthKey;
  showTab("nhanxet");
}

// ---------------------------------------------------------------
// Giao diện Cán bộ lớp (tài khoản nhỏ nhập vi phạm)
// ---------------------------------------------------------------
async function bootstrapOfficerView() {
  const info = state.officerInfo;
  let yearLabel = "";
  let yearDefaultClassName = "";
  try {
    const yearSnap = await getDoc(doc(db, "schoolYears", info.yearId));
    if (yearSnap.exists()) {
      const yearData = yearSnap.data();
      yearLabel = yearData.label || "";
      if (yearData.defaultClassId) {
        const classSnap = await getDoc(doc(db, "schoolYears", info.yearId, "classes", yearData.defaultClassId));
        if (classSnap.exists()) yearDefaultClassName = classSnap.data().name || "";
      }
    }
  } catch (err) { console.error(err); }
  $("officerMeta").textContent =
    `${info.name ? info.name + " · " : ""}${info.email} · Lớp ${info.className || "—"} · Năm học ${yearLabel}`;

  let students = [];
  try {
    const studentsSnap = await getDocs(collection(db, "schoolYears", info.yearId, "students"));
    students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (info.className) {
      // Học sinh có thể chưa có trường "Lớp" riêng trong lý lịch (ví dụ Excel
      // gốc không có cột Lớp) — khi đó dùng lớp mặc định của năm học để so
      // khớp, giống hệt cách web hiển thị "Lớp" ở các nơi khác.
      students = students.filter(s => {
        const effectiveClassName = s.fields?.className || yearDefaultClassName || "";
        return effectiveClassName === info.className;
      });
    }
    students.sort((a, b) => (a.fields?.name || "").localeCompare(b.fields?.name || "", "vi"));
  } catch (err) {
    console.error(err);
    toast("Không tải được danh sách học sinh.");
  }
  state.officerStudents = students;
  $("officerStudentSelect").innerHTML = students.length
    ? students.map(s => `<option value="${s.id}">${escapeHtml(s.fields?.name || "(chưa có tên)")}</option>`).join("")
    : `<option value="">Không có học sinh trong lớp này</option>`;

  state.officerSelectedMonth = MONTHS[0].key;
  renderOfficerMonthRow();
  subscribeOfficerViolations();
}

$("officerStudentSelect").addEventListener("change", subscribeOfficerViolations);

function renderOfficerMonthRow() {
  $("officerMonthRow").innerHTML = MONTHS.map(m => `
    <button class="month-chip ${m.key === state.officerSelectedMonth ? "active" : ""}" data-omonth="${m.key}">${m.label}</button>
  `).join("");
  $("officerMonthRow").querySelectorAll("[data-omonth]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.officerSelectedMonth = btn.dataset.omonth;
      renderOfficerMonthRow();
      subscribeOfficerViolations();
    });
  });
}

function subscribeOfficerViolations() {
  if (state.unsubViolationsOfficer) state.unsubViolationsOfficer();
  const studentId = $("officerStudentSelect").value;
  if (!studentId) { $("officerViolationList").innerHTML = ""; return; }
  const ref = doc(db, "schoolYears", state.officerInfo.yearId, "students", studentId, "violations", state.officerSelectedMonth);
  state.unsubViolationsOfficer = onSnapshot(ref, (snap) => {
    const entries = snap.exists() ? (snap.data().entries || []) : [];
    renderOfficerViolationList(entries, studentId);
  }, (err) => {
    console.error(err);
    $("officerViolationList").innerHTML = `<div class="export-hint">Không tải được vi phạm.</div>`;
  });
}

function renderOfficerViolationList(entries, studentId) {
  if (!entries.length) {
    $("officerViolationList").innerHTML = `<div class="export-hint">Chưa có vi phạm nào được gửi cho học sinh này trong tháng.</div>`;
    return;
  }
  $("officerViolationList").innerHTML = entries.map((e, idx) => `
    <div class="violation-entry">
      <div>${escapeHtml(e.text)}</div>
      <div class="violation-meta" style="display:flex;justify-content:space-between;">
        <span>${escapeHtml(e.createdByName || e.createdByEmail || "")}${e.createdAt ? " · " + new Date(e.createdAt).toLocaleString("vi-VN") : ""}</span>
        ${e.createdByUid === state.user.uid ? `<button data-rm-violation="${idx}" class="violation-rm">Xoá</button>` : ""}
      </div>
    </div>`).join("");
  $("officerViolationList").querySelectorAll("[data-rm-violation]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.rmViolation);
      const entry = entries[idx];
      const ref = doc(db, "schoolYears", state.officerInfo.yearId, "students", studentId, "violations", state.officerSelectedMonth);
      try {
        await updateDoc(ref, { entries: arrayRemove(entry) });
      } catch (err) {
        console.error(err);
        toast("Không xoá được.");
      }
    });
  });
}

$("officerSubmitBtn").addEventListener("click", async () => {
  const studentId = $("officerStudentSelect").value;
  const text = $("officerViolationText").value.trim();
  if (!studentId) { toast("Không có học sinh để chọn."); return; }
  if (!text) { toast("Nhập nội dung vi phạm."); return; }
  $("officerSubmitBtn").disabled = true;
  try {
    const ref = doc(db, "schoolYears", state.officerInfo.yearId, "students", studentId, "violations", state.officerSelectedMonth);
    const entry = {
      text,
      createdAt: Date.now(),
      createdByUid: state.user.uid,
      createdByEmail: state.user.email || "",
      createdByName: state.officerInfo.name || "",
    };
    await setDoc(ref, { entries: arrayUnion(entry), updatedAt: serverTimestamp() }, { merge: true });
    $("officerViolationText").value = "";
    toast("Đã gửi vi phạm.");
  } catch (err) {
    console.error(err);
    toast("Không gửi được. Thử lại.");
  } finally {
    $("officerSubmitBtn").disabled = false;
  }
});

// ---------------------------------------------------------------
// Xuất phiếu nhận xét ra Word (.docx)
// ---------------------------------------------------------------
state.exportMonths = new Set();

function renderExportMonths() {
  $("exportMonths").innerHTML = MONTHS.map(m => {
    const checked = state.exportMonths.has(m.key);
    const hasNote = !!state.comments[m.key]?.text;
    return `
      <button type="button" class="export-chip ${checked ? "checked" : ""}" data-emonth="${m.key}">
        <span class="box">${checked ? "✓" : ""}</span>
        <span>${m.label}</span>
        ${hasNote ? '<span class="dot" title="Đã có nhận xét"></span>' : ""}
      </button>`;
  }).join("");
  $("exportMonths").querySelectorAll("[data-emonth]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.emonth;
      if (state.exportMonths.has(key)) state.exportMonths.delete(key);
      else state.exportMonths.add(key);
      renderExportMonths();
    });
  });
}

$("exportSelectAllBtn").addEventListener("click", () => {
  state.exportMonths = new Set(MONTHS.filter(m => state.comments[m.key]?.text).map(m => m.key));
  renderExportMonths();
});

$("exportWordBtn").addEventListener("click", exportWordReport);

function buildWordDoc(s, selected, yearLabel) {
  const { Document, Paragraph, TextRun, AlignmentType, PageBreak,
    Table, TableRow, TableCell, WidthType, BorderStyle } = window.docx;
  const FONT = "Times New Roman";
  const SIZE = 26; // 13pt = 26 half-points
  const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER };
  const LINE_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const BOX_BORDERS = { top: LINE_BORDER, bottom: LINE_BORDER, left: LINE_BORDER, right: LINE_BORDER, insideHorizontal: LINE_BORDER, insideVertical: LINE_BORDER };
  const CELL_MARGIN = { top: 100, bottom: 100, left: 120, right: 120 };
  const run = (text, opts = {}) => new TextRun({ text, font: FONT, size: SIZE, ...opts });

  const studentName = s.fields?.name || "";
  const className = resolveClassName(s);

  function headerBlock() {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: [
              new Paragraph({ children: [run("TRƯỜNG ...................................", { bold: true })] }),
              new Paragraph({ children: [run("Lớp: ", { bold: true }), run(className || "...................")] }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true })] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
                children: [run("Độc lập - Tự do - Hạnh phúc", { bold: true })],
              }),
            ],
          }),
        ],
      })],
    });
  }

  function infoTable() {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BOX_BORDERS,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              margins: CELL_MARGIN,
              children: [new Paragraph({ children: [run("Họ và tên học sinh: ", { bold: true }), run(studentName)] })],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              margins: CELL_MARGIN,
              children: [new Paragraph({ children: [run("Lớp: ", { bold: true }), run(className)] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              margins: CELL_MARGIN,
              children: [new Paragraph({ children: [run("Năm học: ", { bold: true }), run(yearLabel || "")] })],
            }),
          ],
        }),
      ],
    });
  }

  function commentBox(text) {
    const content = (text || "").trim();
    const lines = content ? content.split("\n") : ["(Chưa có nhận xét)"];
    const paras = [
      new Paragraph({ spacing: { after: 120 }, children: [run("NHẬN XÉT CỦA GIÁO VIÊN CHỦ NHIỆM:", { bold: true })] }),
      ...lines.map(line => new Paragraph({ spacing: { after: 100, line: 360 }, children: [run(line || " ")] })),
    ];
    for (let i = 0; i < 5; i++) paras.push(new Paragraph({ children: [run(" ")] }));
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BOX_BORDERS,
      rows: [new TableRow({ children: [new TableCell({ margins: CELL_MARGIN, children: paras })] })],
    });
  }

  function signatureBlock() {
    return [
      new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 200, after: 40 }, children: [run("Đà Nẵng, ngày ...... tháng ...... năm ......", { italics: true })] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [run("GIÁO VIÊN CHỦ NHIỆM", { bold: true })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [run("(Ký, ghi rõ họ tên)", { italics: true })] }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [run("PHỤ HUYNH HỌC SINH", { bold: true })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [run("(Ký, ghi rõ họ tên)", { italics: true })] }),
              ],
            }),
          ],
        })],
      }),
    ];
  }

  const children = [];
  selected.forEach((m, idx) => {
    if (idx > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(headerBlock());
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 60 },
      children: [run("PHIẾU THÔNG TIN RÈN LUYỆN", { bold: true })],
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [run(`${m.label} - Năm học ${yearLabel || ""}`, { italics: true })],
    }));
    children.push(infoTable());
    children.push(new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }));
    children.push(commentBox(state.comments[m.key]?.text));
    children.push(...signatureBlock());
  });

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [{ children }],
  });
}

async function exportWordReport() {
  const s = currentStudent();
  if (!s) return;
  const selected = MONTHS.filter(m => state.exportMonths.has(m.key));
  if (!selected.length) { toast("Chọn ít nhất 1 tháng để xuất."); return; }
  if (!window.docx) {
    toast("Chưa tải được thư viện xuất Word — kiểm tra kết nối mạng rồi thử lại.");
    return;
  }
  const { Packer } = window.docx;
  const studentName = s.fields?.name || "";
  const yearLabel = (state.years.find(y => y.id === state.yearId) || {}).label || "";

  $("exportWordBtn").disabled = true;
  $("exportWordBtn").textContent = "Đang tạo file…";
  try {
    const docObj = buildWordDoc(s, selected, yearLabel);
    const blob = await Packer.toBlob(docObj);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const monthPart = selected.length === 1
      ? slugify(selected[0].label)
      : `${selected.length}thang`;
    a.href = url;
    a.download = `PhieuNhanXet_${slugify(studentName || "hocsinh")}_${monthPart}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Đã tạo file Word.");
  } catch (err) {
    console.error(err);
    toast("Không tạo được file Word. Thử lại.");
  } finally {
    $("exportWordBtn").disabled = false;
    $("exportWordBtn").textContent = "Xuất file Word";
  }
}

// ---------------------------------------------------------------
// Import Excel
// ---------------------------------------------------------------
$("openImportBtn").addEventListener("click", () => {
  resetImportModal();
  $("importModal").classList.add("active");
});
$("closeImportBtn").addEventListener("click", closeImportModal);
$("cancelImportBtn").addEventListener("click", closeImportModal);
function closeImportModal() { $("importModal").classList.remove("active"); }

function resetImportModal() {
  $("fileInput").value = "";
  $("fileNameLabel").textContent = "";
  $("importConfigWrap").style.display = "none";
  $("confirmImportBtn").style.display = "none";
  state.parsedRows = null;
  state.workbook = null;
  renderYearOptions();
}

$("chooseFileLink").addEventListener("click", () => $("fileInput").click());
$("dropArea").addEventListener("dragover", (e) => { e.preventDefault(); });
$("dropArea").addEventListener("drop", (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});
$("fileInput").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) handleFile(f);
});

function handleFile(file) {
  $("fileNameLabel").textContent = file.name;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      state.workbook = wb;
      const sheetNames = wb.SheetNames;
      const preferredIdx = sheetNames.findIndex(n => !/danh muc|huong dan/.test(stripDiacritics(n)));
      $("importSheetSelect").innerHTML = sheetNames.map((n, i) =>
        `<option value="${i}">${escapeHtml(n)}</option>`).join("");
      $("importSheetSelect").value = String(preferredIdx > -1 ? preferredIdx : 0);
      $("headerRowInput").value = 1;
      $("importConfigWrap").style.display = "block";
      $("confirmImportBtn").style.display = "inline-block";
      runPreview();
    } catch (err) {
      console.error(err);
      toast("Không đọc được file này. Kiểm tra định dạng Excel.");
    }
  };
  reader.readAsArrayBuffer(file);
}

$("importSheetSelect").addEventListener("change", runPreview);
$("headerRowInput").addEventListener("change", runPreview);

function runPreview() {
  if (!state.workbook) return;
  const sheetIdx = Number($("importSheetSelect").value);
  const sheetName = state.workbook.SheetNames[sheetIdx];
  const ws = state.workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
  const headerRowIdx = Math.max(1, Number($("headerRowInput").value || 1)) - 1;
  const headerRow = (raw[headerRowIdx] || []).map(h => String(h || "").trim());
  const dataRows = raw.slice(headerRowIdx + 1).filter(r => r.some(c => String(c || "").trim() !== ""));

  const mappedKeys = headerRow.map(h => HEADER_SYNONYMS[stripDiacritics(h)] || null);
  const students = dataRows.map(row => {
    const fields = {};
    row.forEach((cellVal, i) => {
      const val = String(cellVal ?? "").trim();
      if (!val) return;
      const key = mappedKeys[i];
      if (key === "skip" || !key) {
        // Cột không thuộc danh sách các trường lý lịch đã biết -> bỏ qua, không nhập.
        return;
      }
      fields[key] = val;
    });
    // clean names like "ph_8/16_2627 Nguyễn Đức Anh" -> keep clean name + raw label
    if (fields.name) {
      const m = fields.name.match(/^ph_\S+\s+(.+)$/i);
      if (m) {
        fields.rawImportLabel = fields.name;
        fields.name = m[1].trim();
      }
    }
    return fields;
  }).filter(f => f.name);

  state.parsedRows = students;

  const recognizedCount = headerRow.filter((h, i) => h && mappedKeys[i] && mappedKeys[i] !== "skip").length;
  const ignored = headerRow.filter((h, i) => h && !mappedKeys[i]);
  let note = `Tìm thấy ${students.length} dòng học sinh hợp lệ, đã nhận diện ${recognizedCount} cột thông tin.`;
  if (ignored.length) {
    note += ` Các cột không thuộc danh sách trường lý lịch đã biết sẽ bị bỏ qua, không nhập: ${ignored.join(", ")}.`;
  }
  const hadPrefix = students.some(s => s.rawImportLabel);
  if (hadPrefix) {
    note += ` Đã tự động bỏ tiền tố dạng "ph_..." khỏi tên học sinh (giữ lại nhãn gốc trong lý lịch).`;
  }
  $("importNote").textContent = note;

  const previewCols = ["name", ...Object.keys(students[0] || {}).filter(k => k !== "name")].slice(0, 8);
  const thead = "<tr>" + previewCols.map(c => `<th>${escapeHtml(FIELD_LABELS[c] || c)}</th>`).join("") + "</tr>";
  const tbody = students.slice(0, 25).map(s =>
    "<tr>" + previewCols.map(c => `<td>${escapeHtml(s[c] || "")}</td>`).join("") + "</tr>"
  ).join("");
  $("previewTable").innerHTML = thead + tbody;
}

$("confirmImportBtn").addEventListener("click", async () => {
  const yearId = $("importYearSelect").value;
  if (!yearId) { toast("Chọn hoặc thêm một năm học trước."); return; }
  if (!state.parsedRows || !state.parsedRows.length) { toast("Không có dữ liệu để nhập."); return; }
  $("confirmImportBtn").disabled = true;
  $("confirmImportBtn").textContent = "Đang nhập…";
  try {
    const col = collection(db, "schoolYears", yearId, "students");
    const chunks = [];
    for (let i = 0; i < state.parsedRows.length; i += 400) chunks.push(state.parsedRows.slice(i, i + 400));
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(fields => {
        const ref = doc(col);
        batch.set(ref, { fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });
      await batch.commit();
    }
    toast(`Đã nhập ${state.parsedRows.length} học sinh.`);
    closeImportModal();
    if (yearId === state.yearId) subscribeStudents();
    else selectYear(yearId);
  } catch (err) {
    console.error(err);
    toast("Nhập danh sách thất bại. Thử lại.");
  } finally {
    $("confirmImportBtn").disabled = false;
    $("confirmImportBtn").textContent = "Nhập danh sách";
  }
});

// ---------------------------------------------------------------
// Utils
// ---------------------------------------------------------------
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

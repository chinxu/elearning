// ============================================================
// Sổ chủ nhiệm — app.js
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch, updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7h62vrcLkQ8jOBI6hSRNip8ZisEPtGYw",
  authDomain: "webthongtin-5bc35.firebaseapp.com",
  projectId: "webthongtin-5bc35",
  storageBucket: "webthongtin-5bc35.firebasestorage.app",
  messagingSenderId: "800829738212",
  appId: "1:800829738212:web:9a89244c87c3abf7a170f1",
  measurementId: "G-2QT70CLDZY"
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
  unsubStudents: null,
  unsubComments: null,
  unsubClasses: null,
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

onAuthStateChanged(auth, (user) => {
  state.user = user;
  if (user) {
    $("loginScreen").style.display = "none";
    $("app").classList.add("active");
    $("userEmailLabel").textContent = user.email || "";
    bootstrapYears();
  } else {
    $("app").classList.remove("active");
    $("loginScreen").style.display = "flex";
    if (state.unsubStudents) state.unsubStudents();
    if (state.unsubComments) state.unsubComments();
    if (state.unsubClasses) state.unsubClasses();
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
      });
      refsToDelete.push(doc(db, "schoolYears", yearId, "students", sDoc.id));
    });
    const classesSnap = await getDocs(collection(db, "schoolYears", yearId, "classes"));
    classesSnap.docs.forEach(cDoc => refsToDelete.push(doc(db, "schoolYears", yearId, "classes", cDoc.id)));
    refsToDelete.push(doc(db, "schoolYears", yearId));

    for (let i = 0; i < refsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      refsToDelete.slice(i, i + 400).forEach(ref => batch.delete(ref));
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
  if (!confirm(`Xoá học sinh "${s.fields?.name || ""}" khỏi năm học này? Nhận xét của học sinh cũng sẽ bị xoá.`)) return;
  try {
    for (const m of MONTHS) {
      await deleteDoc(doc(db, "schoolYears", state.yearId, "students", s.id, "comments", m.key)).catch(() => {});
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
    <button class="month-chip ${m.key === state.selectedMonth ? "active" : ""} ${state.comments[m.key]?.text ? "has-note" : ""}" data-month="${m.key}">${m.label}</button>
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

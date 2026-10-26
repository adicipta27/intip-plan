import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { calculateYtEditDuration, renderSyutingList, renderHistoryList, formatDurationText, extractUsernameFromUrl, extractTikTokPostDate, escapeHtml } from "./components.js";

// Firebase Config (intip-plan)
const firebaseConfig = {
  apiKey: "AIzaSyCs2p-0wzkNnJJy5SD4XEj8luiyuNhJorA",
  authDomain: "intip-plan.firebaseapp.com",
  projectId: "intip-plan",
  storageBucket: "intip-plan.firebasestorage.app",
  messagingSenderId: "143538980751",
  appId: "1:143538980751:web:9ac4261be5db4f1d636dfa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const videosRef = collection(db, "videos");
const historyRef = collection(db, "history");

let activeChannel = "gosip"; 
let activeBatch = 1;
let sessionSlots = { 1: 10, 2: 10, 3: 10 };

let allRawVideos = [];
let allRawHistory = [];
let activeEditId = null;
let currentThumbnail = "";
let currentAuthor = ""; 
let currentSyutingItems = [];
let currentBatchItems = [];
let currentBankItems = [];
let selectedCategory = "Semua";
let hasCopiedSyuting = false;

// DOM Elements
const bodyBg = document.getElementById("bodyBg");
const headerAvatar = document.getElementById("headerAvatar");
const headerEmoji = document.getElementById("headerEmoji");
const headerTitleText = document.getElementById("headerTitleText");
const tabGosip = document.getElementById("tabGosip");
const tabPolitik = document.getElementById("tabPolitik");
const activeChannelBadge = document.getElementById("activeChannelBadge");
const historySubTitle = document.getElementById("historySubTitle");
const tiktokUrlInput = document.getElementById("tiktokUrl");
const btnPaste = document.getElementById("btnPaste");
const tiktokDurationInput = document.getElementById("tiktokDuration");
const tiktokCaptionInput = document.getElementById("tiktokCaption");
const tiktokCategoryInput = document.getElementById("tiktokCategory");
const btnFetch = document.getElementById("btnFetch");
const btnSave = document.getElementById("btnSave");
const listSyuting = document.getElementById("listSyuting");
const listBank = document.getElementById("listBank");
const countSyuting = document.getElementById("countSyuting");
const countBank = document.getElementById("countBank");
const btnCopySyuting = document.getElementById("btnCopySyuting");
const btnCopyLinksAll = document.getElementById("btnCopyLinksAll");
const btnSelesaiSyuting = document.getElementById("btnSelesaiSyuting");
const categoryTabs = document.getElementById("categoryTabs");
const totalYtDuration = document.getElementById("totalYtDuration");
const badgeTikTokSum = document.getElementById("badgeTikTokSum");

// Modal Elements
const editModal = document.getElementById("editModal");
const modalCaptionInput = document.getElementById("modalCaptionInput");
const modalCategoryInput = document.getElementById("modalCategoryInput");
const modalDurationInput = document.getElementById("modalDurationInput");
const btnCancelEdit = document.getElementById("btnCancelEdit");
const btnCloseModalX = document.getElementById("btnCloseModalX");
const btnSaveEdit = document.getElementById("btnSaveEdit");
const customAlertModal = document.getElementById("customAlertModal");
const customAlertTitle = document.getElementById("customAlertTitle");
const customAlertMessage = document.getElementById("customAlertMessage");
const btnCloseCustomAlert = document.getElementById("btnCloseCustomAlert");
const confirmModal = document.getElementById("confirmModal");
const btnCancelConfirm = document.getElementById("btnCancelConfirm");
const btnActionConfirm = document.getElementById("btnActionConfirm");
const historyModal = document.getElementById("historyModal");
const btnOpenHistory = document.getElementById("btnOpenHistory");
const btnCloseHistoryModal = document.getElementById("btnCloseHistoryModal");
const historyList = document.getElementById("historyList");

function showCustomAlert(title, message) {
  if (customAlertTitle) customAlertTitle.innerText = title || "Peringatan!";
  if (customAlertMessage) customAlertMessage.innerText = message || "";
  if (customAlertModal) customAlertModal.classList.remove("hidden");
}

if (btnCloseCustomAlert) {
  btnCloseCustomAlert.addEventListener("click", () => customAlertModal.classList.add("hidden"));
}

window.copySingleLink = async (url) => {
  try {
    await navigator.clipboard.writeText(url);
    showCustomAlert("Berhasil Disalin! 📋", "Link TikTok berhasil disalin ke clipboard.");
  } catch (e) {
    showCustomAlert("Gagal", "Tidak dapat menyalin link.");
  }
};

window.switchChannel = (channel) => {
  activeChannel = channel;
  hasCopiedSyuting = false;
  selectedCategory = "Semua";

  if (activeChannel === "gosip") {
    bodyBg.className = "bg-logo-gosip min-h-screen w-full max-w-full overflow-x-hidden p-3 sm:p-6 lg:p-8 antialiased text-neutral-800 transition-all duration-500";
    headerAvatar.className = "w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-rose-500/20";
    headerEmoji.innerText = "💖";
    headerTitleText.innerText = "INTIP GOSIP PLANNER";
    tabGosip.className = "flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs bg-rose-500 text-white";
    tabPolitik.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer";
    activeChannelBadge.innerText = "TARGET: INTIP GOSIP";
    activeChannelBadge.className = "text-[11px] font-black px-3 py-1 rounded-full bg-rose-500 text-white uppercase tracking-wider shadow-2xs";
    btnSave.className = "w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-3 rounded-2xl text-xs transition-all shadow-md uppercase tracking-wider cursor-pointer";
    if (historySubTitle) historySubTitle.innerText = "Menampilkan riwayat YT Intip Gosip";
  } else {
    bodyBg.className = "bg-logo-politik min-h-screen w-full max-w-full overflow-x-hidden p-3 sm:p-6 lg:p-8 antialiased text-neutral-800 transition-all duration-500";
    headerAvatar.className = "w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-blue-600/20";
    headerEmoji.innerText = "🏛️";
    headerTitleText.innerText = "INTIP POLITIK PLANNER";
    tabPolitik.className = "flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs bg-blue-600 text-white";
    tabGosip.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer";
    activeChannelBadge.innerText = "TARGET: INTIP POLITIK";
    activeChannelBadge.className = "text-[11px] font-black px-3 py-1 rounded-full bg-blue-600 text-white uppercase tracking-wider shadow-2xs";
    btnSave.className = "w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl text-xs transition-all shadow-md uppercase tracking-wider cursor-pointer";
    if (historySubTitle) historySubTitle.innerText = "Menampilkan riwayat YT Intip Politik";
  }
  renderApp(allRawVideos);
  renderHistoryList(allRawHistory, activeChannel, historyList);
};

if (tabGosip) tabGosip.addEventListener("click", () => switchChannel("gosip"));
if (tabPolitik) tabPolitik.addEventListener("click", () => switchChannel("politik"));

window.switchBatch = (bNum) => {
  activeBatch = bNum;
  hasCopiedSyuting = false;
  renderApp(allRawVideos);
};

window.tambahSlot = (num = 1) => {
  sessionSlots[activeBatch] = (sessionSlots[activeBatch] || 10) + num;
  renderApp(allRawVideos);
};

async function fetchTikTokMetadata(url) {
  const encodedUrl = encodeURIComponent(url);
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodedUrl}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.code === 0 && json.data) {
        return {
          title: json.data.title || "",
          thumbnail: json.data.cover || json.data.origin_cover || "",
          author: json.data.author?.unique_id ? `@${json.data.author.unique_id}` : extractUsernameFromUrl(url)
        };
      }
    }
  } catch (e) {}
  throw new Error("Gagal mengambil metadata.");
}

if (btnFetch) {
  btnFetch.addEventListener("click", async () => {
    const url = tiktokUrlInput.value.trim();
    if (!url) return showCustomAlert("Input Kosong!", "Masukkan link TikTok terlebih dahulu!");
    btnFetch.innerText = "Fetching...";
    btnFetch.disabled = true;
    try {
      const data = await fetchTikTokMetadata(url);
      tiktokCaptionInput.value = data.title || "Tanpa caption";
      currentThumbnail = data.thumbnail || "";
      currentAuthor = data.author || extractUsernameFromUrl(url);
    } catch (error) {
      currentAuthor = extractUsernameFromUrl(url);
      showCustomAlert("Gagal Ambil Data", "Gagal mengambil data otomatis. Silakan ketik caption manual.");
    } finally {
      btnFetch.innerText = "🔍 Fetch Data";
      btnFetch.disabled = false;
    }
  });
}

if (btnPaste) {
  btnPaste.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) tiktokUrlInput.value = text.trim();
    } catch (e) {
      showCustomAlert("Izin Ditolak", "Gagal mengakses clipboard.");
    }
  });
}

function parseDurationToSeconds(val) {
  if (!val) return 0;
  const str = String(val).trim().replace(',', '.');
  if (str.includes('.') || str.includes(':')) {
    const parts = str.split(/[\.:]/);
    const mins = parseInt(parts[0], 10) || 0;
    let secStr = parts[1] || "0";
    if (secStr.length === 1) secStr += "0";
    return (mins * 60) + (parseInt(secStr, 10) || 0);
  }
  return parseInt(str, 10) || 0;
}

async function saveVideoData() {
  const url = tiktokUrlInput.value.trim();
  const rawDuration = tiktokDurationInput.value.trim();
  const parsedSeconds = parseDurationToSeconds(rawDuration);
  const caption = tiktokCaptionInput.value.trim();
  const manualCategory = tiktokCategoryInput.value.trim() || "Lainnya";

  if (!url) return showCustomAlert("Input Kosong!", "Link TikTok tidak boleh kosong!");
  if (!rawDuration || parsedSeconds <= 0) return showCustomAlert("Durasi Wajib!", "Masukkan durasi yang valid!");

  let thumbnailToSave = currentThumbnail;
  let authorToSave = currentAuthor || extractUsernameFromUrl(url);
  const postDateToSave = extractTikTokPostDate(url);

  try {
    await addDoc(videosRef, {
      channel: activeChannel,
      url: url,
      duration: parsedSeconds,
      caption: caption || "Tanpa caption",
      thumbnail: thumbnailToSave,
      author: authorToSave,
      postedAt: postDateToSave,
      category: manualCategory,
      status: "bank",
      batch: 1,
      order: 0,
      createdAt: serverTimestamp() // Menyimpan waktu server agar urutan presisi di paling atas
    });
    tiktokUrlInput.value = "";
    tiktokDurationInput.value = "";
    tiktokCaptionInput.value = "";
    tiktokCategoryInput.value = "";
    currentThumbnail = "";
    currentAuthor = "";
    tiktokUrlInput.focus();
  } catch (e) {
    showCustomAlert("Gagal Menyimpan", "Terjadi kesalahan pada database.");
  }
}

[tiktokUrlInput, tiktokDurationInput, tiktokCategoryInput, tiktokCaptionInput].forEach(input => {
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        saveVideoData();
      }
    });
  }
});

if (btnSave) {
  btnSave.addEventListener("click", (e) => {
    e.preventDefault();
    saveVideoData();
  });
}

function renderBankList() {
  if (!categoryTabs || !listBank) return;
  const categoriesInBank = ["Semua", ...Array.from(new Set(currentBankItems.map(i => i.category || "Lainnya")))];
  if (!categoriesInBank.includes(selectedCategory)) selectedCategory = "Semua";

  categoryTabs.innerHTML = categoriesInBank.map(cat => {
    const isSel = cat === selectedCategory;
    const count = cat === "Semua" ? currentBankItems.length : currentBankItems.filter(i => (i.category || "Lainnya") === cat).length;
    const activeClass = isSel ? (activeChannel === "gosip" ? "bg-rose-500 text-white font-bold" : "bg-blue-600 text-white font-bold") : "bg-slate-100 text-slate-600";
    return `<button onclick="window.filterCategory('${escapeHtml(cat)}')" class="px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${activeClass}">${escapeHtml(cat)} (${count})</button>`;
  }).join("");

  const filtered = currentBankItems.filter(i => selectedCategory === "Semua" || (i.category || "Lainnya") === selectedCategory);
  if (filtered.length === 0) {
    listBank.innerHTML = `<p class="text-slate-400 text-xs text-center py-8">Tidak ada video di kategori ini.</p>`;
    return;
  }

  const addBtnClass = activeChannel === "gosip" ? "bg-rose-500 hover:bg-rose-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white";

  listBank.innerHTML = filtered.map(item => `
    <div class="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex gap-3 items-start w-full">
      ${item.thumbnail ? `<img src="${item.thumbnail}" referrerpolicy="no-referrer" class="w-24 h-32 object-cover rounded-xl flex-shrink-0 bg-slate-100 border border-slate-200"/>` : `<div class="w-24 h-32 bg-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-400">No Image</div>`}
      <div class="flex-1 space-y-1.5 flex flex-col justify-between self-stretch min-w-0">
        <div>
          <div class="flex items-center gap-1 flex-wrap mb-1">
            <span class="bg-white text-slate-700 text-[10px] px-2 py-0.5 rounded-md font-bold border border-slate-200">👤 ${escapeHtml(item.author)}</span>
            <span class="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">⏱️ ${formatDurationText(item.duration)}</span>
          </div>
          <p class="text-xs font-bold text-slate-800 line-clamp-2">${escapeHtml(item.caption)}</p>
        </div>
        <div class="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/60">
          <div class="flex items-center gap-2">
            <a href="${item.url}" target="_blank" class="text-slate-900 font-bold hover:underline text-[11px]">Buka TikTok ↗</a>
            <button onclick="window.copySingleLink('${escapeHtml(item.url)}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer">📋 Copy Link</button>
          </div>
          <div class="space-x-1.5">
            <button onclick="window.toggleStatus('${item.id}', 'syuting')" class="${addBtnClass} px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer">+ Sesi #${activeBatch}</button>
            <button onclick="window.openEditModal('${item.id}')" class="text-slate-500 hover:text-slate-900 text-xs font-semibold cursor-pointer">Edit</button>
            <button onclick="window.deleteItem('${item.id}')" class="text-red-600 text-xs font-semibold cursor-pointer">Hapus</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

window.filterCategory = (cat) => {
  selectedCategory = cat;
  renderBankList();
};

function renderApp(items) {
  const filtered = items.filter(i => i.channel === activeChannel || (!i.channel && activeChannel === "gosip"));
  
  currentSyutingItems = filtered.filter(i => i.status === "syuting").sort((a, b) => (a.order || 0) - (b.order || 0));
  currentBatchItems = currentSyutingItems.filter(i => (i.batch || 1) === activeBatch);
  
  // Memastikan Bank Video diurutkan strictly dari input terbaru (berdasarkan waktu server/lokal yang paling baru di atas)
  currentBankItems = filtered.filter(i => i.status === "bank").sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now());
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.now());
    return timeB - timeA; // Descending: yang baru di atas
  });

  const maxSlot = sessionSlots[activeBatch] || 10;
  if (countSyuting) countSyuting.innerText = `${currentBatchItems.length} / ${maxSlot}`;
  if (countBank) countBank.innerText = currentBankItems.length;

  const ytCalc = calculateYtEditDuration(currentBatchItems);
  if (totalYtDuration) totalYtDuration.innerText = ytCalc.formatted;
  if (badgeTikTokSum) badgeTikTokSum.innerText = `TOTAL BAHAN: ${ytCalc.tiktokSumFormatted.toUpperCase()}`;

  const batchTabsContainer = document.getElementById("batchTabsContainer");
  if (batchTabsContainer) {
    const b1Count = currentSyutingItems.filter(i => (i.batch || 1) === 1).length;
    const b2Count = currentSyutingItems.filter(i => (i.batch || 1) === 2).length;
    const b3Count = currentSyutingItems.filter(i => (i.batch || 1) === 3).length;
    const activeColor = activeChannel === "gosip" ? "bg-rose-500 text-white" : "bg-blue-600 text-white";

    batchTabsContainer.innerHTML = `
      <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mb-3 border border-slate-200">
        <button onclick="window.switchBatch(1)" class="flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all ${activeBatch === 1 ? activeColor : 'text-slate-600 hover:bg-slate-200'}">Sesi #1 (${b1Count})</button>
        <button onclick="window.switchBatch(2)" class="flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all ${activeBatch === 2 ? activeColor : 'text-slate-600 hover:bg-slate-200'}">Sesi #2 (${b2Count})</button>
        <button onclick="window.switchBatch(3)" class="flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all ${activeBatch === 3 ? activeColor : 'text-slate-600 hover:bg-slate-200'}">Sesi #3 (${b3Count})</button>
        <button onclick="window.tambahSlot(1)" class="py-1.5 px-2.5 rounded-lg text-xs font-black bg-emerald-500 text-white cursor-pointer">+ Slot</button>
      </div>
    `;
  }

  renderSyutingList(currentBatchItems, activeChannel, listSyuting);
  renderBankList();
  updateSyutingButtonsState();
}

function updateSyutingButtonsState() {
  if (btnCopySyuting) {
    if (currentBatchItems.length > 0) {
      btnCopySyuting.disabled = false;
      btnCopySyuting.className = "bg-slate-900 hover:bg-black text-white text-xs px-3 py-2 rounded-xl font-bold cursor-pointer transition-all";
    } else {
      btnCopySyuting.disabled = true;
      btnCopySyuting.className = "bg-slate-100 text-slate-400 border border-slate-200 text-xs px-3 py-2 rounded-xl font-bold opacity-60 cursor-not-allowed";
    }
  }

  if (btnCopyLinksAll) {
    if (currentBatchItems.length > 0) {
      btnCopyLinksAll.disabled = false;
      btnCopyLinksAll.className = "bg-slate-900 hover:bg-black text-white text-xs px-3 py-2 rounded-xl font-bold cursor-pointer transition-all";
    } else {
      btnCopyLinksAll.disabled = true;
      btnCopyLinksAll.className = "bg-slate-100 text-slate-400 border border-slate-200 text-xs px-3 py-2 rounded-xl font-bold opacity-60 cursor-not-allowed";
    }
  }

  if (btnSelesaiSyuting) {
    if (currentBatchItems.length > 0 && hasCopiedSyuting) {
      btnSelesaiSyuting.disabled = false;
      btnSelesaiSyuting.className = "bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-xl font-bold cursor-pointer transition-all";
    } else {
      btnSelesaiSyuting.disabled = true;
      btnSelesaiSyuting.className = "bg-slate-100 text-slate-400 border border-slate-200 text-xs px-3 py-2 rounded-xl font-semibold opacity-60 cursor-not-allowed";
    }
  }
}

window.moveItemOrder = async (id, direction) => {
  const index = currentBatchItems.findIndex(i => i.id === id);
  if (index === -1) return;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= currentBatchItems.length) return;

  const temp = currentBatchItems[index];
  currentBatchItems[index] = currentBatchItems[targetIndex];
  currentBatchItems[targetIndex] = temp;

  try {
    const updatePromises = currentBatchItems.map((item, idx) => {
      const ref = doc(db, "videos", item.id);
      return updateDoc(ref, { order: idx });
    });
    await Promise.all(updatePromises);
  } catch (e) {
    showCustomAlert("Gagal", "Gagal mengubah urutan video.");
  }
};

if (btnCopySyuting) {
  btnCopySyuting.addEventListener("click", async () => {
    if (currentBatchItems.length === 0) return;
    let txt = `🎯 *DAFTAR VIDEO SYUTING Sesi #${activeBatch}*\n\n`;
    txt += currentBatchItems.map((item, idx) => `${idx + 1}. [${item.author}] [${formatDurationText(item.duration)}] ${item.caption}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(txt);
      hasCopiedSyuting = true;
      updateSyutingButtonsState();
      showCustomAlert("Berhasil Disalin! 📋", "Poin-poin video siap digunakan.");
    } catch (e) {
      showCustomAlert("Gagal", "Tidak dapat menyalin ke clipboard.");
    }
  });
}

if (btnCopyLinksAll) {
  btnCopyLinksAll.addEventListener("click", async () => {
    if (currentBatchItems.length === 0) return;
    let linksText = currentBatchItems.map(item => item.url).join("\n");
    try {
      await navigator.clipboard.writeText(linksText);
      showCustomAlert("Berhasil Disalin! 🔗", `Semua link Sesi #${activeBatch} (${currentBatchItems.length} link) berhasil disalin.`);
    } catch (e) {
      showCustomAlert("Gagal", "Tidak dapat menyalin link ke clipboard.");
    }
  });
}

if (btnSelesaiSyuting) {
  btnSelesaiSyuting.addEventListener("click", () => {
    if (!hasCopiedSyuting) return;
    confirmModal.classList.remove("hidden");
  });
}

if (btnCancelConfirm) btnCancelConfirm.addEventListener("click", () => confirmModal.classList.add("hidden"));
if (btnActionConfirm) {
  btnActionConfirm.addEventListener("click", async () => {
    confirmModal.classList.add("hidden");
    try {
      const ytCalc = calculateYtEditDuration(currentBatchItems);
      await addDoc(historyRef, {
        channel: activeChannel,
        batchName: `Sesi #${activeBatch}`,
        completedAt: serverTimestamp(),
        count: currentBatchItems.length,
        estimatedYtDuration: ytCalc.formatted,
        videos: currentBatchItems.map(i => ({ url: i.url, duration: i.duration, caption: i.caption, author: i.author }))
      });
      await Promise.all(currentBatchItems.map(i => deleteDoc(doc(db, "videos", i.id))));
      hasCopiedSyuting = false;
      showCustomAlert("Selesai! 🎉", "Sesi dipindahkan ke Riwayat.");
    } catch (e) {
      showCustomAlert("Error", "Gagal memproses riwayat.");
    }
  });
}

window.toggleStatus = async (id, status) => {
  const ref = doc(db, "videos", id);
  if (status === "syuting") {
    if (currentBatchItems.length >= (sessionSlots[activeBatch] || 10)) {
      return showCustomAlert("Slot Penuh!", "Tambahkan kuota slot sesi ini.");
    }
    await updateDoc(ref, { status: "syuting", batch: activeBatch, order: currentBatchItems.length });
  } else {
    await updateDoc(ref, { status: status, order: 0 });
  }
};

window.deleteItem = async (id) => {
  if (confirm("Hapus link ini?")) await deleteDoc(doc(db, "videos", id));
};

window.openEditModal = (id) => {
  const item = allRawVideos.find(v => v.id === id);
  if (!item) return;
  activeEditId = id;
  modalCaptionInput.value = item.caption || "";
  modalCategoryInput.value = item.category || "Lainnya";
  modalDurationInput.value = item.duration || "";
  editModal.classList.remove("hidden");
};

const closeModal = () => editModal.classList.add("hidden");
if (btnCancelEdit) btnCancelEdit.addEventListener("click", closeModal);
if (btnCloseModalX) btnCloseModalX.addEventListener("click", closeModal);

if (btnSaveEdit) {
  btnSaveEdit.addEventListener("click", async () => {
    if (!activeEditId) return;
    try {
      await updateDoc(doc(db, "videos", activeEditId), {
        caption: modalCaptionInput.value.trim(),
        category: modalCategoryInput.value.trim() || "Lainnya",
        duration: parseDurationToSeconds(modalDurationInput.value.trim())
      });
      closeModal();
    } catch (e) {
      showCustomAlert("Gagal", "Gagal menyimpan perubahan.");
    }
  });
}

if (btnOpenHistory) btnOpenHistory.addEventListener("click", () => historyModal.classList.remove("hidden"));
if (btnCloseHistoryModal) btnCloseHistoryModal.addEventListener("click", () => historyModal.classList.add("hidden"));

window.deleteHistorySession = async (id) => {
  if (confirm("Hapus riwayat ini?")) await deleteDoc(doc(db, "history", id));
};

onSnapshot(videosRef, (snapshot) => {
  allRawVideos = [];
  snapshot.forEach(doc => allRawVideos.push({ id: doc.id, ...doc.data() }));
  renderApp(allRawVideos);
});

onSnapshot(historyRef, (snapshot) => {
  allRawHistory = [];
  snapshot.forEach(doc => allRawHistory.push({ id: doc.id, ...doc.data() }));
  renderHistoryList(allRawHistory, activeChannel, historyList);
});

switchChannel("politik");

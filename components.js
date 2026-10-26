export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatDurationText(totalSec) {
  if (!totalSec || totalSec <= 0) return "0s";
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function extractUsernameFromUrl(url) {
  if (!url) return "Akun TikTok";
  const match = url.match(/@([a-zA-Z0-9_\.]+)/);
  return match ? `@${match[1]}` : "Akun TikTok";
}

export function extractTikTokPostDate(url) {
  if (!url) return "Tgl Post N/A";
  try {
    const match = url.match(/\/video\/(\d+)/);
    if (!match) return "Tgl Post N/A";
    const videoId = match[1];
    const timestamp = Number(BigInt(videoId) >> 32n);
    if (isNaN(timestamp) || timestamp <= 0) return "Tgl Post N/A";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return "Tgl Post N/A";
  }
}

export function calculateYtEditDuration(items) {
  if (!items || items.length === 0) {
    return { formatted: "0 Menit 0 Detik", tiktokSumFormatted: "0s" };
  }
  const fixedElementsSec = 45 + 6 + 45 + 75 + 20;
  let tiktokSumSec = 0;
  items.forEach(item => {
    tiktokSumSec += parseInt(item.duration) || 0;
  });
  const totalVideoReactionSec = tiktokSumSec + (items.length * 60);
  const grandTotalSec = fixedElementsSec + totalVideoReactionSec;
  const minutes = Math.floor(grandTotalSec / 60);
  const seconds = grandTotalSec % 60;
  return {
    formatted: `${minutes} Menit ${seconds} Detik`,
    tiktokSumFormatted: formatDurationText(tiktokSumSec)
  };
}

export function renderSyutingList(currentBatchItems, activeChannel, listSyutingElement) {
  if (!listSyutingElement) return;
  if (currentBatchItems.length === 0) {
    listSyutingElement.innerHTML = `<p class="text-slate-400 text-xs text-center py-10 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">Belum ada video di sesi ini. Pilih dari Bank Video!</p>`;
    return;
  }

  const badgeClass = activeChannel === "gosip" ? "bg-rose-500 text-white" : "bg-blue-600 text-white";

  listSyutingElement.innerHTML = currentBatchItems.map((item, index) => {
    const imgHtml = item.thumbnail 
      ? `<img src="${item.thumbnail}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://placehold.co/160x200/f5f5f5/a3a3a3?text=Expired';" class="w-28 sm:w-32 h-36 sm:h-40 object-cover rounded-2xl flex-shrink-0 bg-slate-100 border border-slate-200" />`
      : `<div class="w-28 sm:w-32 h-36 sm:h-40 bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400 flex-shrink-0 border border-slate-200">No Image</div>`;

    const authorTag = item.author || extractUsernameFromUrl(item.url);

    // Tombol panah atur posisi (Naik / Turun)
    const moveUpBtn = index > 0 
      ? `<button onclick="window.moveItemOrder('${item.id}', 'up')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 rounded-lg text-[10px] font-bold cursor-pointer" title="Geser ke Atas">⬆️</button>` 
      : `<span class="text-slate-200 p-1 text-[10px]">⬆️</span>`;

    const moveDownBtn = index < currentBatchItems.length - 1 
      ? `<button onclick="window.moveItemOrder('${item.id}', 'down')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 rounded-lg text-[10px] font-bold cursor-pointer" title="Geser ke Bawah">⬇️</button>` 
      : `<span class="text-slate-200 p-1 text-[10px]">⬇️</span>`;

    return `
      <div data-id="${item.id}" class="bg-white border border-slate-200/80 hover:border-slate-300 transition-all p-3.5 sm:p-4 rounded-2xl flex flex-row gap-3.5 items-start shadow-2xs w-full min-w-0">
        ${imgHtml}
        <div class="flex-1 space-y-2 min-w-0 flex flex-col justify-between self-stretch">
          <div class="space-y-1.5 w-full min-w-0">
            <div class="flex flex-wrap items-center justify-between gap-1 w-full min-w-0">
              <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                <span class="${badgeClass} text-[10px] font-black px-2 py-0.5 rounded-md">#${index + 1}</span>
                <div class="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                  ${moveUpBtn}
                  ${moveDownBtn}
                </div>
                <span class="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-md font-semibold">⏱️ ${formatDurationText(item.duration)}</span>
              </div>
              <button onclick="window.toggleStatus('${item.id}', 'bank')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-2 py-1 rounded-lg font-bold transition-all cursor-pointer">Kembalikan</button>
            </div>
            <p class="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2">${escapeHtml(item.caption)}</p>
          </div>
          <div class="flex justify-between items-center text-xs pt-2 border-t border-slate-100 w-full">
            <div class="flex items-center gap-2">
              <a href="${item.url}" target="_blank" class="text-slate-900 font-bold hover:underline">Buka TikTok ↗</a>
              <button onclick="window.copySingleLink('${escapeHtml(item.url)}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1">📋 Copy Link</button>
            </div>
            <button onclick="window.openEditModal('${item.id}')" class="text-slate-500 hover:text-slate-900 font-semibold cursor-pointer">Edit</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

export function renderHistoryList(historyDocs, activeChannel, historyListElement) {
  if (!historyListElement) return;
  const filtered = historyDocs.filter(h => h.channel === activeChannel || (!h.channel && activeChannel === "gosip"));

  if (filtered.length === 0) {
    historyListElement.innerHTML = `<p class="text-slate-400 text-center py-16 font-medium text-xs">Belum ada riwayat syuting.</p>`;
    return;
  }

  historyListElement.innerHTML = filtered.map(session => {
    let dateStr = "Waktu N/A";
    if (session.completedAt?.toDate) {
      dateStr = session.completedAt.toDate().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    const vHtml = (session.videos || []).map((v, i) => `
      <div class="bg-white border border-slate-200 p-2.5 rounded-xl flex gap-2 items-center">
        <div class="flex-1 min-w-0 space-y-0.5">
          <p class="text-xs font-bold text-slate-900">#${i + 1} - ${escapeHtml(v.author)} (${formatDurationText(v.duration)})</p>
          <p class="text-[11px] text-slate-600 line-clamp-1">${escapeHtml(v.caption)}</p>
        </div>
      </div>
    `).join("");

    return `
      <div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2.5">
        <div class="flex justify-between items-center border-b border-slate-200 pb-2 flex-wrap gap-2">
          <span class="bg-slate-200 text-slate-800 text-xs font-bold px-2.5 py-0.5 rounded-md">${escapeHtml(session.batchName)}</span>
          <span class="text-[11px] font-bold text-slate-500">${dateStr}</span>
          <button onclick="window.deleteHistorySession('${session.id}')" class="text-xs text-red-600 font-bold ml-auto cursor-pointer">Hapus</button>
        </div>
        <div class="space-y-1.5">${vHtml}</div>
      </div>
    `;
  }).join("");
}

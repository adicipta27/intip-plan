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
  if (totalSec < 60) return `${totalSec}s`;
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
    listSyutingElement.innerHTML = `<p class="text-neutral-400 text-sm text-center py-10 font-medium bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">Belum ada video di sesi ini. Pilih dari Bank Video!</p>`;
    return;
  }

  const badgeClass = activeChannel === "gosip" ? "bg-rose-500 text-white" : "bg-blue-600 text-white";

  listSyutingElement.innerHTML = currentBatchItems.map((item, index) => {
    const imgHtml = item.thumbnail 
      ? `<img src="${item.thumbnail}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://placehold.co/160x200/f5f5f5/a3a3a3?text=Expired';" class="w-32 sm:w-36 h-40 sm:h-44 object-cover rounded-2xl flex-shrink-0 bg-neutral-100 border border-neutral-200" />`
      : `<div class="w-32 sm:w-36 h-40 sm:h-44 bg-neutral-100 rounded-2xl flex items-center justify-center text-xs text-neutral-400 flex-shrink-0 border border-neutral-200">No Image</div>`;

    const authorTag = item.author || extractUsernameFromUrl(item.url);
    const postedDateTag = item.postedAt || extractTikTokPostDate(item.url);
    const categoryTag = item.category || "Lainnya";

    return `
      <div data-id="${item.id}" class="bg-white border border-neutral-200/80 hover:border-neutral-300 transition-all p-4 rounded-3xl flex flex-row gap-4 items-start shadow-2xs w-full min-w-0">
        ${imgHtml}
        <div class="flex-1 space-y-2.5 min-w-0 flex flex-col justify-between self-stretch">
          <div class="space-y-2 w-full min-w-0">
            <div class="flex flex-wrap items-center justify-between gap-1.5 w-full min-w-0">
              <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                <div class="drag-handle cursor-grab text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-200 bg-white text-xs font-bold flex items-center gap-1">⋮⋮</div>
                <span class="${badgeClass} text-xs font-black px-2.5 py-0.5 rounded-full">#${index + 1}</span>
                <span class="bg-neutral-100 text-neutral-700 text-xs px-2.5 py-0.5 rounded-xl font-bold truncate max-w-[120px]">👤 ${escapeHtml(authorTag)}</span>
                <span class="bg-neutral-100 text-neutral-700 text-xs px-2.5 py-0.5 rounded-xl font-semibold">⏱️ ${formatDurationText(item.duration)}</span>
              </div>
              <button onclick="window.toggleStatus('${item.id}', 'bank')" class="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs px-2.5 py-1 rounded-xl font-bold transition-all ml-auto cursor-pointer">Kembalikan</button>
            </div>
            <p class="text-xs sm:text-sm font-bold text-neutral-800 line-clamp-3">${escapeHtml(item.caption)}</p>
          </div>
          <div class="flex justify-between items-center text-xs pt-2 border-t border-neutral-100 w-full">
            <a href="${item.url}" target="_blank" class="text-neutral-900 font-bold hover:underline">Buka TikTok ↗</a>
            <button onclick="window.openEditModal('${item.id}')" class="text-neutral-500 hover:text-neutral-900 font-semibold cursor-pointer">Edit</button>
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
    historyListElement.innerHTML = `<p class="text-neutral-400 text-center py-16 font-medium">Belum ada riwayat syuting.</p>`;
    return;
  }

  historyListElement.innerHTML = filtered.map(session => {
    let dateStr = "Waktu N/A";
    if (session.completedAt?.toDate) {
      dateStr = session.completedAt.toDate().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    const vHtml = (session.videos || []).map((v, i) => `
      <div class="bg-white border border-neutral-200 p-3 rounded-2xl flex gap-3 items-center">
        <div class="flex-1 min-w-0 space-y-1">
          <p class="text-xs font-bold text-neutral-900">#${i + 1} - ${escapeHtml(v.author)} (${formatDurationText(v.duration)})</p>
          <p class="text-xs text-neutral-700 line-clamp-1">${escapeHtml(v.caption)}</p>
        </div>
      </div>
    `).join("");

    return `
      <div class="bg-neutral-50 border border-neutral-200 p-4 sm:p-5 rounded-3xl space-y-3">
        <div class="flex justify-between items-center border-b border-neutral-200 pb-3 flex-wrap gap-2">
          <span class="bg-neutral-200 text-neutral-800 text-xs font-bold px-3 py-1 rounded-full">${escapeHtml(session.batchName)}</span>
          <span class="text-xs font-bold text-neutral-600">${dateStr}</span>
          <button onclick="window.deleteHistorySession('${session.id}')" class="text-xs text-red-600 font-bold ml-auto cursor-pointer">Hapus</button>
        </div>
        <div class="space-y-2">${vHtml}</div>
      </div>
    `;
  }).join("");
}

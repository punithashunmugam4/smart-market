// ─── Navigation ─────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(`page-${item.dataset.page}`).classList.add('active');
  });
});

// ─── App Info ────────────────────────────────────────────────────────────────
async function loadAppInfo() {
  const info = await window.electronAPI.getAppInfo();
  document.getElementById('app-version').textContent = `v${info.version}`;
  document.getElementById('info-version').textContent = `v${info.version}`;
  document.getElementById('info-name').textContent = info.name;
  document.getElementById('info-platform').textContent = {
    win32: 'Windows', darwin: 'macOS', linux: 'Linux'
  }[info.platform] ?? info.platform;
  document.getElementById('info-mode').textContent = info.isDev ? '🔧 Development' : '🚀 Production';
}

// ─── Update UI ───────────────────────────────────────────────────────────────
const statusMessages = {
  checking:    { title: 'Checking for updates…',       detail: 'Contacting GitHub Releases…',    dot: 'checking' },
  available:   { title: 'Update available!',            detail: 'A new version is ready to download.', dot: 'available' },
  'up-to-date':{ title: 'You\'re up to date ✓',        detail: 'You have the latest version.',   dot: 'up-to-date' },
  downloading: { title: 'Downloading update…',          detail: 'Please wait…',                  dot: 'downloading' },
  downloaded:  { title: 'Update ready to install ✓',   detail: 'Restart to apply the update.',  dot: 'downloaded' },
  error:       { title: 'Update check failed',          detail: 'See log file for details.',     dot: 'error' }
};

function setUpdateStatus(status, extra = {}) {
  const cfg = statusMessages[status] ?? statusMessages.error;

  const dot   = document.getElementById('status-dot');
  const title = document.getElementById('status-title');
  const detail = document.getElementById('status-detail');
  const installBtn = document.getElementById('btn-install');
  const progressWrap = document.getElementById('progress-wrap');

  dot.className = `status-dot ${cfg.dot}`;
  title.textContent = extra.version
    ? `${cfg.title} (v${extra.version})`
    : cfg.title;

  if (status === 'error' && extra.message) {
    detail.textContent = extra.message;
  } else if (status === 'downloading' && extra.percent !== undefined) {
    const speed = extra.bytesPerSecond
      ? ` · ${(extra.bytesPerSecond / 1024).toFixed(1)} KB/s`
      : '';
    detail.textContent = `${extra.percent}% downloaded${speed}`;
  } else {
    detail.textContent = cfg.detail;
  }

  // Progress bar
  if (status === 'downloading') {
    progressWrap.classList.add('visible');
    document.getElementById('progress-fill').style.width = `${extra.percent ?? 0}%`;
    document.getElementById('progress-label').textContent = `${extra.percent ?? 0}%`;
  } else {
    progressWrap.classList.remove('visible');
  }

  // Install button
  installBtn.style.display = (status === 'downloaded') ? 'inline-block' : 'none';
}

// ─── Listen for Update Events from Main ──────────────────────────────────────
window.electronAPI.onUpdateStatus((data) => {
  setUpdateStatus(data.status, data);
});

// ─── Buttons ─────────────────────────────────────────────────────────────────
document.getElementById('btn-check').addEventListener('click', async () => {
  setUpdateStatus('checking');
  await window.electronAPI.checkForUpdates();
});

document.getElementById('btn-install').addEventListener('click', async () => {
  await window.electronAPI.installUpdate();
});

document.getElementById('btn-log').addEventListener('click', async () => {
  await window.electronAPI.openLogFile();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
loadAppInfo();

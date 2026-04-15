(() => {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    fontSize: 20,
    fontColor: '#ffffff',
    bgColor: '#000000',
    bgOpacity: 0.75,
    position: 60
  };

  let settings = { ...DEFAULT_SETTINGS };
  let subtitleContainer = null;
  let subtitleText = null;
  let settingsPanel = null;
  let observer = null;
  let pollTimer = null;
  let lastUrl = location.href;

  // --- Load/Save settings ---
  function loadSettings() {
    chrome.storage.sync.get('llsSettings', (data) => {
      if (data.llsSettings) Object.assign(settings, data.llsSettings);
      applySettings();
    });
  }

  function saveSettings() {
    chrome.storage.sync.set({ llsSettings: settings });
  }

  // --- Subtitle detection (multiple strategies) ---
  function getCurrentSubtitle() {
    // Strategy 1: Transcript panel active line
    const s1 = document.querySelector('.transcript-line.active .transcript-line__text');
    if (s1?.textContent?.trim()) return s1.textContent.trim();

    // Strategy 2: Generic transcript active
    const s2 = document.querySelector('[class*="transcript"] [class*="active"]');
    if (s2?.textContent?.trim()) return s2.textContent.trim();

    // Strategy 3: Video.js text track display
    const s3 = document.querySelector('.vjs-text-track-display .vjs-text-track-cue div');
    if (s3?.textContent?.trim()) return s3.textContent.trim();

    // Strategy 4: Any visible text track cue element
    const s4 = document.querySelector('.vjs-text-track-cue, [class*="captions-display"], [class*="caption-window"]');
    if (s4?.textContent?.trim()) return s4.textContent.trim();

    // Strategy 5: HTML5 TextTrack API (most reliable fallback)
    const video = document.querySelector('video');
    if (video?.textTracks) {
      for (const track of video.textTracks) {
        if (track.mode === 'showing' || track.mode === 'hidden') {
          const cue = track.activeCues?.[0];
          if (cue?.text) return cue.text.replace(/<[^>]*>/g, '').trim();
        }
      }
    }

    return '';
  }

  // --- UI Creation ---
  function createSubtitleUI() {
    // Clean up old UI if exists (SPA navigation)
    document.getElementById('lls-subtitle-container')?.remove();
    document.getElementById('lls-settings-panel')?.remove();

    const videoWrapper = document.querySelector('.video-js, .vjs-tech, video')?.closest('.video-js')
      || document.querySelector('[class*="video-player"]')
      || document.querySelector('video')?.parentElement;

    if (!videoWrapper) return false;
    videoWrapper.style.position = 'relative';

    subtitleContainer = document.createElement('div');
    subtitleContainer.id = 'lls-subtitle-container';

    subtitleText = document.createElement('span');
    subtitleText.id = 'lls-subtitle-text';
    subtitleContainer.appendChild(subtitleText);

    settingsPanel = document.createElement('div');
    settingsPanel.id = 'lls-settings-panel';
    settingsPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:bold">⚙️ Settings</span>
        <span id="lls-close-settings" style="cursor:pointer;font-size:18px;line-height:1">✕</span>
      </div>
      <label>Font size: <input type="range" id="lls-font-size" min="12" max="80" value="${settings.fontSize}">
        <span id="lls-font-size-val">${settings.fontSize}px</span></label>
      <label>Font color: <input type="color" id="lls-font-color" value="${settings.fontColor}"></label>
      <label>BG color: <input type="color" id="lls-bg-color" value="${settings.bgColor}"></label>
      <label>BG opacity: <input type="range" id="lls-bg-opacity" min="0" max="100" value="${Math.round(settings.bgOpacity * 100)}">
        <span id="lls-bg-opacity-val">${Math.round(settings.bgOpacity * 100)}%</span></label>
      <label>Position: <input type="range" id="lls-position" min="10" max="200" value="${settings.position}">
        <span id="lls-position-val">${settings.position}px</span></label>
    `;

    videoWrapper.appendChild(subtitleContainer);
    videoWrapper.appendChild(settingsPanel);

    bindSettingsEvents();
    setupTextTrackListener();
    applySettings();
    return true;
  }

  // --- Listen to TextTrack cuechange events ---
  function setupTextTrackListener() {
    const video = document.querySelector('video');
    if (!video?.textTracks) return;

    for (const track of video.textTracks) {
      track.addEventListener('cuechange', () => updateSubtitle());
    }

    // Also listen for new tracks being added
    video.textTracks.addEventListener('addtrack', (e) => {
      e.track.addEventListener('cuechange', () => updateSubtitle());
    });
  }

  function bindSettingsEvents() {
    document.getElementById('lls-close-settings')?.addEventListener('click', () => {
      settingsPanel.classList.remove('lls-visible');
    });

    const on = (id, prop, transform, valId, valFmt) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        settings[prop] = transform(el.value);
        if (valId) document.getElementById(valId).textContent = valFmt(settings[prop]);
        applySettings();
        saveSettings();
      });
    };

    on('lls-font-size', 'fontSize', Number, 'lls-font-size-val', v => v + 'px');
    on('lls-font-color', 'fontColor', String, null, null);
    on('lls-bg-color', 'bgColor', String, null, null);
    on('lls-bg-opacity', 'bgOpacity', v => v / 100, 'lls-bg-opacity-val', v => Math.round(v * 100) + '%');
    on('lls-position', 'position', Number, 'lls-position-val', v => v + 'px');
  }

  function applySettings() {
    if (!subtitleText || !subtitleContainer) return;
    subtitleText.style.fontSize = settings.fontSize + 'px';
    subtitleText.style.color = settings.fontColor;

    const r = parseInt(settings.bgColor.slice(1, 3), 16);
    const g = parseInt(settings.bgColor.slice(3, 5), 16);
    const b = parseInt(settings.bgColor.slice(5, 7), 16);
    subtitleText.style.background = `rgba(${r},${g},${b},${settings.bgOpacity})`;

    subtitleContainer.style.bottom = settings.position + 'px';
    subtitleContainer.classList.toggle('lls-hidden', !settings.enabled);
  }

  function updateSubtitle() {
    if (!settings.enabled || !subtitleText) return;
    const text = getCurrentSubtitle();
    if (subtitleText.textContent !== text) {
      subtitleText.textContent = text;
    }
  }

  // --- Observer + Polling ---
  function startObserver() {
    if (observer) observer.disconnect();
    if (pollTimer) clearInterval(pollTimer);

    observer = new MutationObserver(() => updateSubtitle());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    pollTimer = setInterval(updateSubtitle, 300);
  }

  // --- SPA navigation detection ---
  function detectNavigation() {
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Re-init on navigation
        setTimeout(init, 1500);
      }
    }, 500);
  }

  // --- Wait for video player ---
  function init() {
    let attempts = 0;
    const check = () => {
      const video = document.querySelector('video');
      if (video) {
        if (createSubtitleUI()) {
          startObserver();
        }
      } else if (attempts < 20) {
        attempts++;
        setTimeout(check, 1000);
      }
    };
    check();
  }

  // --- Listen for messages from popup ---
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'lls-toggle') {
      settings.enabled = msg.enabled;
      applySettings();
      saveSettings();
    }
    if (msg.type === 'lls-toggle-settings') {
      settingsPanel?.classList.toggle('lls-visible');
    }
  });

  // Start
  loadSettings();
  init();
  detectNavigation();
})();

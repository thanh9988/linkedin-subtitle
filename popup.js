const toggle = document.getElementById('toggle-enabled');
const btnSettings = document.getElementById('btn-settings');

chrome.storage.sync.get('llsSettings', (data) => {
  if (data.llsSettings) toggle.checked = data.llsSettings.enabled !== false;
});

toggle.addEventListener('change', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'lls-toggle', enabled: toggle.checked });
  });
});

btnSettings.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'lls-toggle-settings' });
  });
  window.close();
});

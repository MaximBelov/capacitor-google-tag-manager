import { GoogleTagManager } from 'capacitor-google-tag-manager';

// Every answer is written into #log and kept in window.googleTagManagerLog, so a person can read it and a script can poll it.
window.googleTagManagerLog = [];
const log = (line) => {
  window.googleTagManagerLog.push(line);
  document.getElementById('log').textContent = window.googleTagManagerLog.join('\n');
};

const check = async () => {
  try {
    log(`isAvailable: ${JSON.stringify(await GoogleTagManager.isAvailable())}`);
  } catch (error) {
    log(`isAvailable: FAIL ${error.code ?? ''} ${error.message}`);
  }
};

document.getElementById('available').addEventListener('click', check);
check();

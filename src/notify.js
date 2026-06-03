// Notifications de nouvelle commande : son + notification système.

let audioCtx = null;

function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}

/** Débloque l'audio (à appeler sur un geste utilisateur — politique navigateur). */
export function unlockAudio() {
  try {
    const c = ctx();
    if (c && c.state === 'suspended') c.resume();
  } catch { /* ignore */ }
}

/** Joue un petit carillon « ding-dong » agréable. */
export function playOrderSound() {
  try {
    const c = ctx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const now = c.currentTime;
    // Deux notes (La aigu puis Mi) qui sonnent comme une notification
    [{ f: 880, t: 0 }, { f: 1318.5, t: 0.15 }].forEach(({ f, t }) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.35, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.4);
      osc.connect(gain).connect(c.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.45);
    });
  } catch { /* ignore */ }
}

/** Demande la permission d'afficher des notifications système. */
export async function requestNotifPermission() {
  try {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const p = await Notification.requestPermission();
    return p === 'granted';
  } catch { return false; }
}

/** Affiche une notification système (même si l'onglet est en arrière-plan). */
export function showOrderNotification(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'jappandal-order',
        renotify: true,
      });
      setTimeout(() => { try { n.close(); } catch { /* */ } }, 9000);
    }
  } catch { /* ignore */ }
}

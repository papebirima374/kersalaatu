// Génère le QR code de la carte de visite Jappandal Tech (couleur marque, même origine).
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'public', 'tech-assets');
fs.mkdirSync(OUT_DIR, { recursive: true });

const URL = process.argv[2] || 'https://www.jappandal.com/jappandal-tech.html';
const OUT = path.join(OUT_DIR, 'qr.png');

QRCode.toFile(OUT, URL, {
  width: 640,
  margin: 1,
  errorCorrectionLevel: 'H',
  color: { dark: '#2563EBFF', light: '#FFFFFFFF' },
}).then(() => {
  console.log('QR généré →', OUT, '\n  cible:', URL);
}).catch((e) => { console.error(e); process.exit(1); });

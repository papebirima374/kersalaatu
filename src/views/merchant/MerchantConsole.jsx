import { toast } from '../../components/toast';
import { thumb, fallbackSrc } from '../../utils/img';
import { formatPrice, itemNet, itemDiscount, cartGross, cartLineDiscounts, cartNet, globalDiscount } from '../../utils/money';
import { buildBusinessCardCanvas } from '../../utils/businessCard';
import QRCode from 'qrcode';
import { unlockAudio, playOrderSound, requestNotifPermission, showOrderNotification } from '../../notify';
import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { Link } from 'react-router-dom';
import { isConfigured } from '../../firebase/config';
import {
  LayoutDashboard, ShoppingBag, ClipboardList, Settings, LogOut,
  Plus, Trash2, Edit3, Check, Clock, AlertTriangle, DollarSign,
  TrendingUp, Store, ExternalLink, Save, MessageSquare, Printer,
  ShoppingCart, Minus, User, Phone, MapPin, Receipt, Search,
  X, ChevronDown, Zap, Calendar, Users, TrendingDown, Lock, CreditCard,
  Sun, Moon, Shield, Download, Upload
} from 'lucide-react';

// ── Remise par ligne (réutilisé en caisse + édition de commande) ──────────────
// `remise` = { type:'percent'|'flat', valeur } ou null. onChange reçoit le nouvel objet.
function LineDiscountControl({ remise, onChange }) {
  const type = remise?.type || 'percent';
  const set = (patch) => {
    const next = { type, valeur: remise?.valeur || 0, ...patch };
    onChange(Number(next.valeur) > 0 ? next : null);
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex rounded-md bg-slate-950 p-0.5 border border-slate-700 shrink-0">
        <button type="button" onClick={() => set({ type: 'percent' })}
          className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors cursor-pointer ${type === 'percent' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>%</button>
        <button type="button" onClick={() => set({ type: 'flat' })}
          className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors cursor-pointer ${type === 'flat' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>Fixe</button>
      </div>
      <input type="number" min="0" max={type === 'percent' ? 100 : undefined}
        value={remise?.valeur || ''}
        onChange={(e) => set({ valeur: Math.max(0, Number(e.target.value) || 0) })}
        placeholder="Remise"
        className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-[11px] font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500" />
    </div>
  );
}

// ── Texte sûr pour jsPDF ─────────────────────────────────────────────────────
// Les polices standard de jsPDF ne gèrent que le Latin-1 : les emojis (drapeau
// 🇸🇳…), l'arabe et certains symboles deviennent du charabia (« Ø<Ýø »). On
// normalise la ponctuation typographique en ASCII et on retire tout caractère
// non imprimable en Latin-1 (les accents français é à ç… sont conservés).
const PDF_MAP = {
  '’': "'", '‘': "'", '“': '"', '”': '"',
  '–': '-', '—': '-', '…': '...',
  '\u00A0': ' ', '\u202F': ' ', '\u2009': ' ',
  'º': 'o', '°': '', 'ª': 'a', '•': '-',
};
const sanitizePdf = (s) => {
  if (s == null) return '';
  let out = String(s).normalize('NFC')
    .replace(/[‘’“”–—…\u00A0\u202F\u2009º°ª•]/g, (c) => PDF_MAP[c] ?? '')
    // emoji, drapeaux, symboles, variation selectors, ZWJ, scripts non latins (arabe…)
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{0600}-\u{06FF}\u{0750}-\u{077F}\u{08A0}-\u{08FF}\u{FB50}-\u{FDFF}\u{FE70}-\u{FEFF}]/gu, '')
    // tout ce qui reste hors Latin-1 imprimable
    .replace(/[^ -ÿ]/g, '');
  return out.replace(/\s{2,}/g, ' ').trim();
};


// Version courte dérivée du logo (+ nom). Elle change quand le marchand met à jour
// son logo, ce qui modifie l'URL de partage et FORCE WhatsApp / Facebook à
// régénérer l'aperçu (sinon l'ancienne image reste figée dans leur cache).
const shareVersion = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};
const buildShopUrl = (b) =>
  `${window.location.origin}/shop/${b.slug}?v=${shareVersion((b && (b.logo || '')) + '|' + (b && (b.name || '')))}`;

// Proxy même-origine pour les images Firebase Storage (contourne le blocage CORS
// dans le <canvas> des factures PDF).
const proxiedImg = (url) =>
  /^https?:\/\//i.test(url) && url.includes('firebasestorage.googleapis.com')
    ? '/api/img?url=' + encodeURIComponent(url)
    : url;

// Redimensionne + ré-encode une image côté navigateur AVANT l'upload.
// Objectif : les photos de téléphone (souvent 3-5 Mo) deviennent de petits
// fichiers (< 512 px), donc l'upload ne peut plus échouer à cause de la taille,
// et le logo reste léger (affichage rapide + aperçu de lien fiable).
// mime 'image/png' (logos : transparence) ou 'image/jpeg' (photos : ~10x plus léger).
const compressImage = (file, maxDim = 512, mime = 'image/png', quality = 0.92) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image illisible (format non supporté ? Évitez le HEIC).'));
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { reject(new Error('Image vide.')); return; }
        if (w > maxDim || h > maxDim) {
          if (w >= h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (mime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); } // fond blanc (JPEG sans alpha)
        ctx.drawImage(img, 0, 0, w, h);
        const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Compression de l’image échouée.')); return; }
          resolve(new File([blob], `photo.${ext}`, { type: mime }));
        }, mime, quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

const STATUT_COLORS = {
  Reçue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Préparée:'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Livrée:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Payée:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Annulée: 'bg-red-500/10 text-red-400 border-red-500/20',
  'Attente Annulation': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

// ─── Auth Shell ──────────────────────────────────────────────────────────────
export default function MerchantConsole() {
  const { merchantUser, authReady, dataReady, loginMerchant, signupMerchant, resetMerchantPassword } = useTenant();

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('jappandal-dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    if (darkMode) {
      document.body.style.backgroundColor = '#0b0f19';
      document.documentElement.classList.add('dark');
    } else {
      document.body.style.backgroundColor = '#FCFAF6';
      document.documentElement.classList.remove('dark');
    }
    return () => {
      document.body.style.backgroundColor = prev;
      document.documentElement.classList.remove('dark');
    };
  }, [darkMode]);

  const [tab, setTab]       = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('creer')) return 'register';
    return 'login';
  });
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [name, setName]     = useState('');
  const [wa, setWa]         = useState('');
  const [err, setErr]       = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      if (tab === 'login') {
        await loginMerchant(email, pw);
      } else {
        if (!name.trim()) { setErr('Le nom de la boutique est obligatoire.'); return; }
        if (!wa.trim())   { setErr('Le numéro WhatsApp est obligatoire.'); return; }
        await signupMerchant(email, pw, name, wa);
      }
    } catch (e) {
      const codes = {
        'auth/wrong-password': 'Email ou mot de passe incorrect.',
        'auth/user-not-found': 'Email ou mot de passe incorrect.',
        'auth/email-already-in-use': 'Cet email est déjà utilisé.',
        'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
      };
      setErr(codes[e.code] || e.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || !dataReady) return (
    <div className={`min-h-screen bg-slate-950 flex items-center justify-center ${darkMode ? '' : 'chaleur-console'}`}>
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!merchantUser) return (
    <div className={`min-h-screen bg-slate-950 flex items-center justify-center p-4 ${darkMode ? '' : 'chaleur-console'}`}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-jappandal.png" alt="Jappandal" className="h-12 mx-auto mb-4 object-contain" />
          <h1 className="text-xl font-bold text-white">Espace Commerçant</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez votre boutique en ligne</p>
          {isConfigured && (
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Firebase actif
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-900 rounded-xl p-1 mb-6 border border-slate-800">
          {['login','register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === t ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {t === 'login' ? 'Se connecter' : 'Créer boutique'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {err && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {err}
            </div>
          )}

          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom de la boutique</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  placeholder="Ex: Sunu Boutik" type="text"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">WhatsApp</label>
                <input value={wa} onChange={e => setWa(e.target.value)} required
                  placeholder="Ex: 780178444" type="text"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors font-mono" />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Adresse email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} required
              type="email" placeholder="nom@exemple.com"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Mot de passe</label>
            <input value={pw} onChange={e => setPw(e.target.value)} required
              type="password" placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />Chargement...</>
              : tab === 'login' ? 'Se connecter' : 'Créer ma boutique'}
          </button>
        </form>

        {tab === 'login' && (
          <button type="button" onClick={async () => {
            if (!email.trim()) { toast('Saisissez votre email ci-dessus.'); return; }
            try { await resetMerchantPassword(email); toast('Email de réinitialisation envoyé !', 'success'); }
            catch(e) { toast(e.message); }
          }} className="w-full mt-4 text-sm text-blue-500 hover:text-blue-300 transition-colors text-center">
            Mot de passe oublié ?
          </button>
        )}

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );

  return <MerchantDashboard darkMode={darkMode} setDarkMode={setDarkMode} />;
}

// ─── Dashboard Principal ─────────────────────────────────────────────────────
function MerchantDashboard({ darkMode, setDarkMode }) {
  const {
    boutiques, tickets,
    currentMerchantBoutiqueId, setCurrentMerchantBoutiqueId,
    merchantUser, logoutMerchant,
    updateBoutique, addProduct, updateProduct, deleteProduct,
    updateOrder, cancelOrder, updateOrderStatus, updateOrderPaymentStatus, updateOrderPaymentDetails, updateClientOrdersInfo,
    addTicket, getProductsByBoutique, getOrdersByBoutique,
    uploadBoutiqueLogo, uploadProductPhoto,
    upgradeRequests, createUpgradeRequest, createOrder,
    caissiers, depenses, addCaissier, deleteCaissier, addDepense, deleteDepense
  } = useTenant();

  const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'papebirima374@gmail.com').trim().toLowerCase();
  const isAdminUser = !!ADMIN_EMAIL && (merchantUser?.email || '').toLowerCase() === ADMIN_EMAIL;

  const [now] = useState(() => Date.now());

  // Tableau de bord : Période analytique et point survolé du graphique SVG
  const [periodDays, setPeriodDays] = useState(7);
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);

  const [activeTab, setActiveTab] = useState(() => {
    const isCaissier = merchantUser?.role === 'caissier';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (isCaissier) {
        return ['caisse', 'orders'].includes(urlTab) ? urlTab : 'caisse';
      }
      return urlTab || 'dashboard';
    }
    return isCaissier ? 'caisse' : 'dashboard';
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') !== activeTab) {
        params.set('tab', activeTab);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [activeTab]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // POS
  const [posCart, setPosCart]             = useState([]);
  const [posClient, setPosClient]         = useState({ nom:'', telephone:'', adresse:'' });
  const [posPayMethod, setPosPayMethod]   = useState('Espèces');
  const [posPayStatut, setPosPayStatut]   = useState('Payé');
  const [posNote, setPosNote]             = useState('');
  const [posSearch, setPosSearch]         = useState('');
  const [barcodeScanInput, setBarcodeScanInput] = useState('');
  const [posDiscountType, setPosDiscountType]   = useState('percent'); // 'percent' or 'flat'
  const [posDiscountValue, setPosDiscountValue] = useState(0);
  const [posAcompte, setPosAcompte]             = useState(0);
  const [posSaleSuccess, setPosSaleSuccess] = useState(null);
  const [showPaymentModal, setShowPaymentModal]   = useState(false);
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);
  const [paymentModalValue, setPaymentModalValue] = useState(0);

  // Boutiques du marchand
  const myBoutiques = React.useMemo(() => {
    if (!merchantUser) return [];
    if (merchantUser.role === 'caissier') {
      return boutiques.filter(b => b.id === merchantUser.boutiqueId);
    }
    if (!isConfigured) return boutiques;
    if (isAdminUser) return boutiques;
    return boutiques.filter(b => b.ownerUid === merchantUser.uid || b.ownerEmail === merchantUser.email);
  }, [boutiques, merchantUser, isAdminUser]);

  const activeBoutique = myBoutiques.find(b => b.id === currentMerchantBoutiqueId) || myBoutiques[0] || null;

  // Devise de la boutique active : tous les montants de la console la suivent
  // (remplace localement le fmt module FCFA). FCFA par défaut, € pour l'Europe.
  const fmt = (n) => formatPrice(n, activeBoutique?.devise);

  // Aligne l'id mémorisé sur la boutique réellement résolue : c'est lui qui pilote
  // le listener Firestore des produits (sinon id vide/obsolète = aucun produit affiché).
  React.useEffect(() => {
    if (activeBoutique && activeBoutique.id !== currentMerchantBoutiqueId) {
      setCurrentMerchantBoutiqueId(activeBoutique.id);
    }
  }, [activeBoutique?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeProducts = React.useMemo(() => {
    return activeBoutique ? getProductsByBoutique(activeBoutique.id) : [];
  }, [activeBoutique, getProductsByBoutique]);

  const activeOrders = React.useMemo(() => {
    return activeBoutique ? getOrdersByBoutique(activeBoutique.id) : [];
  }, [activeBoutique, getOrdersByBoutique]);

  const activeTickets = React.useMemo(() => {
    return tickets.filter(t => t.boutiqueId === activeBoutique?.id);
  }, [tickets, activeBoutique]);

  // Stats
  const completedOrders = React.useMemo(() => {
    return activeOrders.filter(o => o.statut === 'Payée' || o.statut === 'Livrée');
  }, [activeOrders]);

  const totalRevenue = React.useMemo(() => {
    return completedOrders.reduce((s, o) => s + o.total, 0);
  }, [completedOrders]);

  const totalExpenses = React.useMemo(() => {
    if (!activeBoutique) return 0;
    const plan = activeBoutique.abonnement?.plan || 'Découverte';
    if (plan !== 'Premium' && plan !== 'Premium VIP') return 0;
    return depenses
      .filter(d => d.boutiqueId === activeBoutique.id)
      .reduce((s, d) => s + Number(d.montant || 0), 0);
  }, [depenses, activeBoutique]);

  const totalOutstandingDebts = React.useMemo(() => {
    return activeOrders.reduce((sum, o) => {
      const isDebt = o.paiement?.statut === 'Dette' || o.paiement?.methode?.includes('Dette');
      if (isDebt && (o.paiement?.detteRestante || 0) > 0) {
        return sum + o.paiement.detteRestante;
      }
      return sum;
    }, 0);
  }, [activeOrders]);

  const pendingOrders = React.useMemo(() => {
    return activeOrders.filter(o => o.statut === 'Reçue' || o.statut === 'Préparée').length;
  }, [activeOrders]);

  const outOfStock = React.useMemo(() => {
    return activeProducts.filter(p => p.actif && p.stock === 0);
  }, [activeProducts]);

  const lowStockList = React.useMemo(() => {
    return activeProducts.filter(p => p.actif && p.stock > 0 && p.stock <= 3);
  }, [activeProducts]);

  // ── Indicateurs Analytiques Avancés & Graphiques ─────────────────────
  // Panier Moyen (AOV)
  const averageOrderValue = React.useMemo(() => {
    return completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;
  }, [completedOrders, totalRevenue]);

  // Top Catégorie
  const topCategory = React.useMemo(() => {
    const catMap = {};
    completedOrders.forEach(o => {
      o.items?.forEach(it => {
        const prod = activeProducts.find(p => p.name === it.name);
        const cat = prod?.category || it.category || 'Autre';
        catMap[cat] = (catMap[cat] || 0) + (it.price || 0) * it.quantity;
      });
    });
    let top = 'Aucune';
    let maxRevenue = 0;
    Object.entries(catMap).forEach(([cat, rev]) => {
      if (rev > maxRevenue) {
        maxRevenue = rev;
        top = cat;
      }
    });
    return top;
  }, [completedOrders, activeProducts]);

  // Taux de conversion simulé (visites basées de façon déterministe sur l'ID de la boutique)
  const simulatedVisits = React.useMemo(() => {
    let hash = 0;
    const idStr = activeBoutique?.id || 'default';
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seed = Math.abs(hash) % 500 + 150;
    const orderCount = activeOrders.length;
    return seed + orderCount * 18;
  }, [activeBoutique, activeOrders]);

  const conversionRate = React.useMemo(() => {
    return simulatedVisits > 0 ? ((activeOrders.length / simulatedVisits) * 100).toFixed(1) : '0.0';
  }, [simulatedVisits, activeOrders]);

  // Données quotidiennes pour le graphique selon la période (7 ou 30 jours)
  const chartData = React.useMemo(() => {
    const data = [];
    const nowTime = new Date();
    const today = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate());
    
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      data.push({
        date: d,
        dateStr: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        sales: 0,
        orders: 0
      });
    }

    completedOrders.forEach(o => {
      if (!o.date) return;
      const oDate = new Date(o.date);
      const diffTime = today.getTime() - new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate()).getTime();
      const diffDays = Math.floor(diffTime / 86400000);
      if (diffDays >= 0 && diffDays < periodDays) {
        const idx = (periodDays - 1) - diffDays;
        if (data[idx]) {
          data[idx].sales += o.total;
          data[idx].orders += 1;
        }
      }
    });

    return data;
  }, [completedOrders, periodDays]);

  // Calcul des chemins SVG du graphique
  const chartPaths = React.useMemo(() => {
    const chartWidth = 440;
    const chartHeight = 120;
    const paddingLeft = 45;
    const paddingTop = 20;
    
    if (!chartData || chartData.length === 0) {
      return { areaPath: '', linePath: '', points: [], maxVal: 1000 };
    }
    
    const maxVal = Math.max(...chartData.map(d => d.sales), 1000);
    const coords = chartData.map((d, i) => {
      const x = paddingLeft + (chartData.length > 1 ? (i / (chartData.length - 1)) * chartWidth : chartWidth / 2);
      const y = paddingTop + chartHeight - (d.sales / maxVal) * chartHeight;
      return { x, y, data: d };
    });

    const bottomY = paddingTop + chartHeight;
    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const areaPath = coords.length > 0 
      ? `M ${coords[0].x.toFixed(1)} ${bottomY.toFixed(1)} ` + coords.map(c => `L ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ') + ` L ${coords[coords.length - 1].x.toFixed(1)} ${bottomY.toFixed(1)} Z`
      : '';

    return { areaPath, linePath, points: coords, maxVal };
  }, [chartData]);

  // ── Gestion des Clients (CRM) ─────────────────────────────────────────
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null); // { telephone, nom, adresse }
  const [clientNotes, setClientNotes] = useState(() => {
    const notesMap = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('jt_client_notes_')) {
        const boutiqueId = key.replace('jt_client_notes_', '');
        try {
          notesMap[boutiqueId] = JSON.parse(localStorage.getItem(key)) || {};
        } catch {
          notesMap[boutiqueId] = {};
        }
      }
    }
    return notesMap;
  });

  const saveClientNote = (phone, note) => {
    if (!activeBoutique) return;
    const boutiqueNotes = { ...(clientNotes[activeBoutique.id] || {}), [phone]: note };
    const updated = { ...clientNotes, [activeBoutique.id]: boutiqueNotes };
    setClientNotes(updated);
    localStorage.setItem(`jt_client_notes_${activeBoutique.id}`, JSON.stringify(boutiqueNotes));
    toast('Note client enregistrée avec succès.', 'success');
  };

  const clientsList = React.useMemo(() => {
    const clientsMap = {};
    // 1) Clients ajoutés MANUELLEMENT par le marchand (fiche boutique)
    (activeBoutique?.clientsManuels || []).forEach(c => {
      if (!c?.telephone) return;
      clientsMap[String(c.telephone).trim()] = {
        telephone: String(c.telephone).trim(),
        nom: c.nom || 'Client',
        adresse: c.adresse || "Pas d'adresse renseignée",
        totalSpent: 0, orderCount: 0,
        lastOrderDate: c.dateCreation || new Date().toISOString(),
        orders: [], manuel: true
      };
    });
    // 2) Clients dérivés des commandes
    activeOrders.forEach(o => {
      if (!o.client || !o.client.telephone) return;
      const phone = o.client.telephone.trim();
      const isCompleted = o.statut === 'Payée' || o.statut === 'Livrée';
      if (!clientsMap[phone]) {
        clientsMap[phone] = {
          telephone: phone,
          nom: o.client.nom || 'Anonyme',
          adresse: o.client.adresse || 'Pas d\'adresse renseignée',
          totalSpent: 0,
          orderCount: 0,
          lastOrderDate: o.date,
          orders: []
        };
      }
      if (new Date(o.date) > new Date(clientsMap[phone].lastOrderDate)) {
        if (o.client.nom) clientsMap[phone].nom = o.client.nom;
        if (o.client.adresse) clientsMap[phone].adresse = o.client.adresse;
        clientsMap[phone].lastOrderDate = o.date;
      }
      clientsMap[phone].orderCount += 1;
      if (isCompleted) {
        clientsMap[phone].totalSpent += o.total;
      }
      clientsMap[phone].orders.push(o);
      const isDebt = o.paiement?.statut === 'Dette' || o.paiement?.methode?.includes('Dette');
      if (isDebt && (o.paiement?.detteRestante || 0) > 0) {
        clientsMap[phone].totalDebt = (clientsMap[phone].totalDebt || 0) + o.paiement.detteRestante;
      }
    });
    // 3) Exclut les clients supprimés (masqués) par le marchand
    const hidden = new Set((activeBoutique?.hiddenClients || []).map(t => String(t).replace(/\D/g, '')));
    return Object.values(clientsMap)
      .filter(c => !hidden.has(String(c.telephone).replace(/\D/g, '')))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [activeOrders, activeBoutique]);

  // ── Actions clients : ajouter / supprimer ────────────────────────────────
  const addClientManuel = (client) => {
    const tel = String(client.telephone || '').trim();
    if (!client.nom?.trim() || !tel) { toast('Nom et téléphone obligatoires.'); return false; }
    const norm = tel.replace(/\D/g, '');
    if (clientsList.some(c => String(c.telephone).replace(/\D/g, '') === norm)) {
      toast('Un client avec ce numéro existe déjà.'); return false;
    }
    const fiche = { id: `cli-${Date.now()}`, nom: client.nom.trim(), telephone: tel, adresse: (client.adresse || '').trim(), dateCreation: new Date().toISOString() };
    updateBoutique(activeBoutique.id, {
      clientsManuels: [...(activeBoutique.clientsManuels || []), fiche],
      // si ce numéro avait été supprimé avant, on le réactive
      hiddenClients: (activeBoutique.hiddenClients || []).filter(t => String(t).replace(/\D/g, '') !== norm)
    });
    toast(`Client « ${fiche.nom} » ajouté ✓`, 'success');
    return true;
  };

  const deleteClient = (client) => {
    const norm = String(client.telephone).replace(/\D/g, '');
    const updates = {
      clientsManuels: (activeBoutique.clientsManuels || []).filter(c => String(c.telephone).replace(/\D/g, '') !== norm)
    };
    // client issu de commandes : on le masque (les commandes restent intactes)
    if (client.orderCount > 0) {
      updates.hiddenClients = [...new Set([...(activeBoutique.hiddenClients || []), client.telephone])];
    }
    updateBoutique(activeBoutique.id, updates);
    if (selectedClient?.telephone === client.telephone) setSelectedClient(null);
    toast(`Client « ${client.nom} » supprimé.`, 'success');
  };

  const filteredClients = React.useMemo(() => {
    return clientsList.filter(c => {
      const query = clientSearch.toLowerCase();
      return (c.nom || '').toLowerCase().includes(query) ||
             (c.telephone || '').includes(query) ||
             (c.adresse || '').toLowerCase().includes(query);
    });
  }, [clientsList, clientSearch]);

  // ── Produits groupés par catégorie (famille) — liste plus lisible ────────
  const [productSearch, setProductSearch] = useState('');
  const [collapsedCats, setCollapsedCats] = useState(() => new Set());
  const toggleCat = (cat) => setCollapsedCats(prev => {
    const next = new Set(prev);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    return next;
  });
  const productGroups = React.useMemo(() => {
    const byCat = {};
    activeProducts.forEach(p => {
      const cat = (p.category || '').trim() || 'Divers';
      (byCat[cat] = byCat[cat] || []).push(p);
    });
    return Object.entries(byCat)
      .map(([cat, items]) => ({ cat, items }))
      .sort((a, b) => (a.cat === 'Divers') - (b.cat === 'Divers') || a.cat.localeCompare(b.cat, 'fr'));
  }, [activeProducts]);

  // Recherche produit : filtre toutes les familles (et les déplie)
  const displayedProductGroups = React.useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return productGroups;
    return productGroups
      .map(g => ({ ...g, items: g.items.filter(p => (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [productGroups, productSearch]);

  // ── Modals clients : ajout manuel + sélection en caisse ─────────────────
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ nom: '', telephone: '', adresse: '' });
  const [showPosClientPick, setShowPosClientPick] = useState(false);
  const [posClientSearch, setPosClientSearch] = useState('');

  // ── Carte de visite (SaaS Pro / Premium VIP) ─────────────────────────────
  const [carteOpen, setCarteOpen] = useState(false);
  const [carteUrl, setCarteUrl] = useState('');
  const [carteBusy, setCarteBusy] = useState(false);

  const openCarteVisite = async () => {
    if (!activeBoutique) return;
    setCarteBusy(true);
    try {
      const shopUrl = buildShopUrl(activeBoutique);
      // QR du lien vitrine
      const qrData = await QRCode.toDataURL(shopUrl, { width: 600, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
      const qrImg = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = qrData; });
      // Logo (via proxy anti-CORS) si c'est une image
      let logoImg = null;
      const lg = activeBoutique.logo;
      if (typeof lg === 'string' && (lg.startsWith('http') || lg.startsWith('data:') || lg.startsWith('/'))) {
        const dataUrl = lg.startsWith('http') ? await loadImgDataURL(lg) : lg;
        if (dataUrl) {
          logoImg = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = dataUrl; });
        }
      }
      const canvas = buildBusinessCardCanvas(activeBoutique, { qrDataUrl: { img: qrImg }, logoImg });
      setCarteUrl(canvas.toDataURL('image/png'));
      setCarteOpen(true);
    } catch (err) {
      console.error(err);
      toast('Erreur lors de la génération de la carte : ' + (err.message || 'réessayez'));
    } finally {
      setCarteBusy(false);
    }
  };

  const carteFileName = `Carte_${activeBoutique?.slug || 'boutique'}.png`;
  const downloadCarte = () => {
    const a = document.createElement('a');
    a.href = carteUrl; a.download = carteFileName; a.click();
  };
  const shareCarte = async () => {
    try {
      const blob = await (await fetch(carteUrl)).blob();
      const file = new File([blob], carteFileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Carte de visite — ${activeBoutique.name}` });
      } else {
        downloadCarte();
        toast('Partage indisponible ici — carte téléchargée (joignez-la sur WhatsApp).', 'info', 5000);
      }
    } catch (e) { if (e?.name !== 'AbortError') downloadCarte(); }
  };
  const printCarte = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      // Format carte de visite standard (85,6 × 54 mm), pleine page
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [54, 85.6] });
      pdf.addImage(carteUrl, 'PNG', 0, 1.8, 85.6, 50);
      pdf.save(`Carte_${activeBoutique?.slug || 'boutique'}.pdf`);
    } catch (e) { toast('Erreur PDF : ' + (e.message || '')); }
  };

  // ── Alertes de commande (son + notification système) ──────────────────
  const [alertsOn, setAlertsOn] = useState(() => localStorage.getItem('jt_alerts_on') === '1');
  const seenOrders = useRef(null);

  // Réinitialise le suivi au changement de boutique (n'alerte pas pour l'historique)
  React.useEffect(() => { seenOrders.current = null; }, [activeBoutique?.id]);

  // Détecte les nouvelles commandes en temps réel → son + toast + notif système
  React.useEffect(() => {
    if (!activeBoutique) return;
    const ids = activeOrders.map(o => o.id);
    if (seenOrders.current === null) { seenOrders.current = new Set(ids); return; }
    const fresh = activeOrders.filter(o => !seenOrders.current.has(o.id));
    if (fresh.length === 0) return;
    fresh.forEach(o => seenOrders.current.add(o.id));
    if (!alertsOn) return;
    playOrderSound();
    const o = fresh[0];
    const n = fresh.length;
    toast(`🔔 ${n} nouvelle${n > 1 ? 's' : ''} commande${n > 1 ? 's' : ''} !`, 'success', 7000);
    showOrderNotification('Nouvelle commande reçue', `${o.client?.nom || 'Client'} · ${fmt(o.total)}`);
  }, [activeOrders, alertsOn, activeBoutique?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Débloque l'audio au 1er contact (politique navigateur) si les alertes sont actives
  React.useEffect(() => {
    if (!alertsOn) return;
    const h = () => unlockAudio();
    window.addEventListener('pointerdown', h, { once: true });
    return () => window.removeEventListener('pointerdown', h);
  }, [alertsOn]);

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct]     = useState(null);
  const [productSaving, setProductSaving]         = useState(false);
  const [productError, setProductError]           = useState('');
  const [photosUploading, setPhotosUploading]     = useState([]); // indices en cours d'upload
  const [productForm, setProductForm]             = useState({
    name:'', price:'', stock:'', category:'Vêtements', photo:'', photos:[], description:'', codeBarre:''
  });

  // Settings
  const [settingsForm, setSettingsForm] = useState(() => ({
    name: activeBoutique?.name || '',
    description: activeBoutique?.description || '',
    whatsapp: activeBoutique?.whatsapp || '',
    whatsapp2: activeBoutique?.whatsapp2 || '',
    couleurMarque: activeBoutique?.couleurMarque || '#2563eb',
    logo: activeBoutique?.logo || '🛍️',
    adresse: activeBoutique?.adresse || '',
    emailContact: activeBoutique?.emailContact || '',
    instagram: activeBoutique?.instagram || '',
    facebook: activeBoutique?.facebook || '',
    tiktok: activeBoutique?.tiktok || '',
    texteRemerciement: activeBoutique?.texteRemerciement || '',
    zonesLivraison: activeBoutique?.zonesLivraison || [],
    waveMerchantLink: activeBoutique?.waveMerchantLink || ''
  }));
  const [logoUploading, setLogoUploading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Sync settings form when active boutique loads or changes
  React.useEffect(() => {
    if (activeBoutique) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettingsForm({
        name: activeBoutique.name || '',
        description: activeBoutique.description || '',
        whatsapp: activeBoutique.whatsapp || '',
        whatsapp2: activeBoutique.whatsapp2 || '',
        couleurMarque: activeBoutique.couleurMarque || '#2563eb',
        logo: activeBoutique.logo || '🛍️',
        adresse: activeBoutique.adresse || '',
        emailContact: activeBoutique.emailContact || '',
        instagram: activeBoutique.instagram || '',
        facebook: activeBoutique.facebook || '',
        tiktok: activeBoutique.tiktok || '',
        texteRemerciement: activeBoutique.texteRemerciement || '',
        zonesLivraison: activeBoutique.zonesLivraison || [],
        waveMerchantLink: activeBoutique.waveMerchantLink || ''
      });
    }
  }, [activeBoutique]);

  // Orders filters
  const [orderSearch, setOrderSearch]       = useState('');
  const [orderStatut, setOrderStatut]       = useState('Tous');
  const [orderPaiement, setOrderPaiement]   = useState('Tous');
  const [orderFrom, setOrderFrom]           = useState('');
  const [orderTo, setOrderTo]               = useState('');
  const [collapsedDays, setCollapsedDays]   = useState(() => new Set());
  const [activePrintInvoice, setActivePrintInvoice] = useState(null);
  const [invoiceFormat, setInvoiceFormat] = useState('ticket'); // 'ticket' (80mm) | 'a5'
  const invoiceRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Édition de commande
  const [editingOrder, setEditingOrder] = useState(null);   // commande en cours d'édition
  const [editItems, setEditItems] = useState([]);           // items modifiables
  const [editAddSearch, setEditAddSearch] = useState('');   // recherche pour ajouter un produit
  const [editDiscountType, setEditDiscountType] = useState('percent'); // remise globale
  const [editDiscountValue, setEditDiscountValue] = useState(0);

  const openEditOrder = (order) => {
    setEditingOrder(order);
    setEditItems(order.items.map(it => ({ ...it })));
    setEditDiscountType(order.remise?.type || 'percent');
    setEditDiscountValue(order.remise?.valeur || 0);
    setEditAddSearch('');
  };
  const editChangeQty = (idx, delta) => {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
  };
  const editRemoveItem = (idx) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };
  const editSetLineRemise = (idx, remise) => {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, remise } : it));
  };
  const editAddProduct = (p) => {
    setEditItems(prev => {
      const ex = prev.find(it => it.id === p.id && !it.variantId);
      if (ex) return prev.map(it => (it.id === p.id && !it.variantId) ? { ...it, quantity: it.quantity + 1 } : it);
      return [...prev, { id: p.id, name: p.name, price: p.price, quantity: 1, variantId: null, variantNom: null, remise: null }];
    });
    setEditAddSearch('');
  };
  const editGross = cartGross(editItems);                              // brut
  const editLineDiscounts = cartLineDiscounts(editItems);              // remises par ligne
  const editNetSubtotal = Math.max(0, editGross - editLineDiscounts);  // net
  const editGlobalDiscount = globalDiscount(editNetSubtotal, { type: editDiscountType, valeur: editDiscountValue });
  const editTotal = Math.max(0, editNetSubtotal - editGlobalDiscount) + (editingOrder?.livraison?.frais || 0);
  const saveEditOrder = () => {
    if (editItems.length === 0) { toast('La commande doit contenir au moins un article.'); return; }
    const remiseInfo = editGlobalDiscount > 0
      ? { type: editDiscountType, valeur: Number(editDiscountValue) || 0, montant: editGlobalDiscount }
      : null;
    updateOrder(editingOrder.id, editItems, remiseInfo);
    setEditingOrder(null);
  };

  // Tickets
  const [ticketForm, setTicketForm] = useState({ sujet:'', message:'' });

  // Partage boutique
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareQr, setShareQr] = useState('');

  // Upgrade
  const [showUpgradeModal, setShowUpgradeModal]       = useState(false);
  const [upgradePayPlan, setUpgradePayPlan]           = useState('Pro');
  const [upgradePayMethod, setUpgradePayMethod]       = useState('Wave');
  const [upgradePayPhone, setUpgradePayPhone]         = useState('');
  const [upgradePayLoading, setUpgradePayLoading]     = useState(false);
  const [upgradePaySuccess, setUpgradePaySuccess]     = useState(false);

  const posSubtotal = posCart.reduce((a, i) => a + i.price * i.quantity, 0); // brut
  const posLineDiscounts = cartLineDiscounts(posCart);                        // somme des remises par ligne
  const posNetSubtotal = Math.max(0, posSubtotal - posLineDiscounts);         // net (avant remise globale)

  const posDiscountAmount = React.useMemo(
    () => globalDiscount(posNetSubtotal, { type: posDiscountType, valeur: posDiscountValue }),
    [posNetSubtotal, posDiscountType, posDiscountValue]
  );

  const posTotalFinal = Math.max(0, posNetSubtotal - posDiscountAmount);

  const setPosLineRemise = (id, remise) =>
    setPosCart(prev => prev.map(it => it.id === id ? { ...it, remise } : it));

  // ⚠️ Doit rester AVANT le return ci-dessous (Rules of Hooks — sinon React error #300
  // quand un compte connecté n'a pas de boutique, ex. le compte admin)
  const [variantUploading, setVariantUploading] = useState(null); // index variante en cours d'upload

  if (!activeBoutique) return (
    <div className={`min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center ${darkMode ? '' : 'chaleur-console'}`}>
      <Store className="w-12 h-12 text-slate-700 mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Aucune boutique trouvée</h2>
      <p className="text-sm text-slate-500 mb-6">Votre compte n'est lié à aucune boutique.</p>
      <button onClick={() => logoutMerchant()}
        className="px-6 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-colors">
        Se déconnecter
      </button>
    </div>
  );

  // ── Handlers produits ────────────────────────────────────────────────────
  const openAddProduct = () => {
    const isFree = !activeBoutique.abonnement?.plan || activeBoutique.abonnement.plan === 'Découverte';
    if (isFree && activeProducts.length >= 5) { setShowUpgradeModal(true); return; }
    setEditingProduct(null);
    setProductForm({ name:'', price:'', stock:'', category:'Vêtements', photo:'', photos:[], description:'', codeBarre:'', variantes:[] });
    setPhotosUploading([]);
    setProductError('');
    setShowProductModal(true);
  };

  const openEditProduct = (p) => {
    setEditingProduct(p);
    const existingPhotos = p.photos && p.photos.length > 0 ? p.photos : (p.photo ? [p.photo] : []);
    setProductForm({ name:p.name, price:p.price, stock:p.stock, category:p.category, photo:p.photo, photos: existingPhotos, description:p.description, codeBarre: p.codeBarre || '', variantes: p.variantes || [] });
    setPhotosUploading([]);
    setProductError('');
    setShowProductModal(true);
  };

  // ── Handlers variantes (parfums, couleurs, tailles...) ───────────────────
  const addVariant = () => {
    setProductForm(p => ({ ...p, variantes: [...(p.variantes || []), { id: `v-${Date.now()}`, nom: '', photo: '', stock: '' }] }));
  };
  const removeVariant = (index) => {
    setProductForm(p => ({ ...p, variantes: p.variantes.filter((_, i) => i !== index) }));
  };
  const updateVariantName = (index, nom) => {
    setProductForm(p => ({ ...p, variantes: p.variantes.map((v, i) => i === index ? { ...v, nom } : v) }));
  };
  const updateVariantStock = (index, stock) => {
    setProductForm(p => ({ ...p, variantes: p.variantes.map((v, i) => i === index ? { ...v, stock } : v) }));
  };
  const handleVariantPhoto = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast('Image trop lourde (max 15 Mo).'); return; }
    setVariantUploading(index);
    try {
      const optimized = await compressImage(file, 800, 'image/jpeg', 0.85).catch(() => file);
      const url = await uploadProductPhoto(activeBoutique.id, optimized);
      setProductForm(p => ({ ...p, variantes: p.variantes.map((v, i) => i === index ? { ...v, photo: url } : v) }));
    } catch (err) {
      toast('Erreur upload image variante : ' + (err.message || ''));
    } finally {
      setVariantUploading(null);
    }
  };

  // Convertit une data-URL (photo restée en local) en fichier pour l'upload Storage.
  const dataUrlToFile = (dataUrl, name = 'photo.jpg') => {
    const [head, b64] = dataUrl.split(',');
    const mime = (head.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], name, { type: mime });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setProductSaving(true);
    setProductError('');
    try {
      // Photos : ON N'INVENTE JAMAIS DE PHOTO. Une photo restée en data-URL
      // (upload raté / ancienne version) est ré-uploadée vers Storage ;
      // si impossible, elle est écartée — mais jamais remplacée par une image de stock.
      const rawPhotos = (productForm.photos || []).filter(u => u && u.trim());
      const finalPhotos = [];
      for (const u of rawPhotos) {
        if (u.startsWith('data:') && isConfigured) {
          try {
            const url = await uploadProductPhoto(activeBoutique.id, dataUrlToFile(u));
            finalPhotos.push(url);
          } catch { /* upload impossible : photo écartée */ }
        } else {
          finalPhotos.push(u);
        }
      }
      if (finalPhotos.length === 0) {
        setProductError('Ajoutez au moins une photo du produit (bouton « Photos »).');
        setProductSaving(false);
        return;
      }
      const mainPhoto = finalPhotos[0];

      // Variantes : ne garder que celles avec un nom, nettoyer les base64
      const variantes = (productForm.variantes || [])
        .filter(v => v.nom && v.nom.trim())
        .map(v => ({
          id: v.id,
          nom: v.nom.trim(),
          photo: (v.photo && v.photo.startsWith('data:') && isConfigured) ? '' : (v.photo || ''),
          stock: Number(v.stock) || 0
        }));

      // Si variantes : le stock global = somme des variantes
      const globalStock = variantes.length > 0
        ? variantes.reduce((s, v) => s + v.stock, 0)
        : Number(productForm.stock);

      const data = {
        name: productForm.name,
        price: Number(productForm.price),
        stock: globalStock,
        category: (productForm.category || '').trim() || 'Divers',
        photo: mainPhoto,
        photos: finalPhotos,
        description: productForm.description,
        codeBarre: (productForm.codeBarre || '').trim(),
        variantes
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
      } else {
        await addProduct(activeBoutique.id, data);
      }
      setShowProductModal(false);
      setEditingProduct(null);
    } catch(err) {
      console.error(err);
      setProductError('Erreur de sauvegarde : ' + (err.message || 'Vérifiez votre connexion.'));
    } finally {
      setProductSaving(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try { await deleteProduct(id); } catch { toast('Erreur lors de la suppression.'); }
  };

  // Upload multiple photos (max 5)
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentCount = (productForm.photos || []).length;
    const canAdd = 5 - currentCount;
    if (canAdd <= 0) { toast('Maximum 5 photos atteint.'); return; }

    const toProcess = files.slice(0, canAdd);
    const oversized = toProcess.filter(f => f.size > 15 * 1024 * 1024);
    if (oversized.length) { toast('Certaines images dépassent 15 Mo et seront ignorées.'); }
    const validFiles = toProcess.filter(f => f.size <= 15 * 1024 * 1024);
    if (!validFiles.length) return;

    // Indices des slots en cours d'upload
    const startIdx = currentCount;
    const uploadingIdxs = validFiles.map((_, i) => startIdx + i);
    setPhotosUploading(uploadingIdxs);

    try {
      if (isConfigured) {
        // Compression côté navigateur (1200 px max, JPEG) PUIS upload Storage en parallèle :
        // une photo de téléphone de 4 Mo devient ~150-250 Ko → vitrines bien plus rapides.
        const urls = await Promise.all(validFiles.map(async f => {
          const optimized = await compressImage(f, 1200, 'image/jpeg', 0.85).catch(() => f);
          return uploadProductPhoto(activeBoutique.id, optimized);
        }));
        setProductForm(p => ({ ...p, photos: [...(p.photos || []), ...urls] }));
      } else {
        // Mode local : base64 preview
        const urls = await Promise.all(validFiles.map(f => new Promise(res => {
          const r = new FileReader();
          r.onloadend = () => res(r.result);
          r.readAsDataURL(f);
        })));
        setProductForm(p => ({ ...p, photos: [...(p.photos || []), ...urls] }));
      }
    } catch (err) {
      toast('Erreur upload : ' + (err.message || ''));
    } finally {
      setPhotosUploading([]);
      // Reset input pour permettre re-sélection des mêmes fichiers
      e.target.value = '';
    }
  };

  const removePhoto = (idx) => {
    setProductForm(p => ({ ...p, photos: p.photos.filter((_, i) => i !== idx) }));
  };

  const movePhotoFirst = (idx) => {
    setProductForm(p => {
      const arr = [...p.photos];
      const [item] = arr.splice(idx, 1);
      return { ...p, photos: [item, ...arr] };
    });
  };

  // ── Handlers settings ────────────────────────────────────────────────────
  const handleLogoUpload = async (e) => {
    const input = e.target;
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Veuillez choisir une image.'); input.value = ''; return; }
    if (file.size > 15 * 1024 * 1024) { toast('Image trop lourde (max 15 Mo).'); input.value = ''; return; }
    setLogoUploading(true);
    try {
      const optimized = await compressImage(file, 512);          // redimensionne : toute photo passe
      const url = await uploadBoutiqueLogo(activeBoutique.id, optimized);
      setSettingsForm(p => ({ ...p, logo: url }));
      updateBoutique(activeBoutique.id, { logo: url });           // ENREGISTREMENT IMMÉDIAT (plus besoin de cliquer « Enregistrer »)
      toast('Logo enregistré ✓', 'success');
    } catch(err) { toast(err.message || "Erreur upload logo."); }
    finally { setLogoUploading(false); input.value = ''; }
  };

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    if (!String(settingsForm.whatsapp || '').trim()) {
      toast('Le numéro WhatsApp principal est obligatoire.'); return;
    }
    updateBoutique(activeBoutique.id, settingsForm);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
    toast('Modifications enregistrées avec succès !', 'success');
    setActiveTab('dashboard');
  };

  // ── Handlers tickets ─────────────────────────────────────────────────────
  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketForm.sujet || !ticketForm.message) return;
    addTicket(activeBoutique.id, ticketForm);
    setTicketForm({ sujet:'', message:'' });
    toast("Ticket envoyé à l'équipe technique !", 'success');
  };

  // ── Handlers upgrade ─────────────────────────────────────────────────────
  const handleUpgradeSubmit = (e) => {
    e.preventDefault();
    if (!upgradePayPhone.trim()) { toast('Renseignez votre numéro.'); return; }
    setUpgradePayLoading(true);
    setTimeout(() => {
      createUpgradeRequest(activeBoutique.id, upgradePayPlan, upgradePayMethod, upgradePayPhone.trim());
      setUpgradePayLoading(false);
      setUpgradePaySuccess(true);
    }, 2000);
  };

  const handleCollectPayment = (e) => {
    e.preventDefault();
    if (!paymentModalOrder) return;
    const amount = Number(paymentModalValue);
    if (isNaN(amount) || amount <= 0) {
      toast('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    const reste = paymentModalOrder.paiement.detteRestante;
    if (amount > reste) {
      toast(`Le montant saisi (${fmt(amount)}) dépasse la dette restante (${fmt(reste)}).`);
      return;
    }

    const newMontantPaye = (paymentModalOrder.paiement.montantPaye || 0) + amount;
    const newDetteRestante = Math.max(0, reste - amount);
    const newStatut = newDetteRestante <= 0 ? 'Payé' : 'Dette';

    const versementObj = {
      date: new Date().toISOString(),
      montant: amount,
      type: 'versement'
    };

    updateOrderPaymentDetails(paymentModalOrder.id, {
      montantPaye: newMontantPaye,
      detteRestante: newDetteRestante,
      statut: newStatut,
      versements: [...(paymentModalOrder.paiement.versements || []), versementObj]
    });

    toast(`Versement de ${fmt(amount)} enregistré avec succès !`, 'success');
    setShowPaymentModal(false);
    setPaymentModalOrder(null);
  };

  // ── Handlers POS ─────────────────────────────────────────────────────────
  const addToPos = (prod) => {
    setPosCart(prev => {
      const ex = prev.find(i => i.id === prod.id);
      if (ex) return ex.quantity >= prod.stock ? prev : prev.map(i => i.id === prod.id ? { ...i, quantity: i.quantity+1 } : i);
      return [...prev, { ...prod, quantity:1 }];
    });
  };
  const updatePosQty = (id, delta) => setPosCart(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity+delta } : i).filter(i => i.quantity > 0));

  const handleBarcodeScanSubmit = (e) => {
    e.preventDefault();
    if (!barcodeScanInput.trim()) return;
    const code = barcodeScanInput.trim();
    const found = activeProducts.find(p => p.codeBarre && p.codeBarre.trim() === code);
    if (found) {
      if (found.stock <= 0) {
        toast(`Le produit "${found.name}" est épuisé.`);
      } else {
        const inCart = posCart.find(it => it.id === found.id);
        if (inCart && inCart.quantity >= found.stock) {
          toast(`Stock maximum atteint pour "${found.name}".`);
        } else {
          addToPos(found);
          toast(`Ajouté : ${found.name}`, 'success');
        }
      }
    } else {
      toast(`Aucun produit trouvé avec le code-barres "${code}"`);
    }
    setBarcodeScanInput('');
  };

  const handlePosSell = () => {
    if (!posCart.length) { toast('Ajoutez au moins un article.'); return; }
    if (!posClient.nom.trim() || !posClient.telephone.trim()) { toast('Nom et téléphone obligatoires.'); return; }

    const discountInfo = posDiscountAmount > 0 ? {
      type: posDiscountType,
      valeur: Number(posDiscountValue) || 0,
      montant: posDiscountAmount
    } : null;

    let paiementInfo = { methode: posPayMethod, statut: posPayStatut, note: posNote };

    if (posPayMethod === 'Crédit' && isVIP) {
      paiementInfo = {
        methode: 'Crédit / Dette',
        statut: 'Dette',
        montantPaye: Number(posAcompte) || 0,
        detteRestante: Math.max(0, posTotalFinal - (Number(posAcompte) || 0)),
        versements: [
          { date: new Date().toISOString(), montant: Number(posAcompte) || 0, type: 'acompte' }
        ],
        note: posNote
      };
    }

    // createOrder renvoie la commande créée → on la garde pour pouvoir éditer/envoyer la facture.
    const order = createOrder(activeBoutique.id, posClient, posCart, 0, 'Vente directe', paiementInfo, discountInfo);
    setPosSaleSuccess({ order, orderId: order.id, items:[...posCart], total: posTotalFinal, client:{...posClient}, payMethod: posPayMethod === 'Crédit' && isVIP ? 'Crédit / Dette' : posPayMethod });
    setPosCart([]); 
    setPosClient({ nom:'', telephone:'', adresse:'' }); 
    setPosNote('');
    setPosDiscountValue(0);
    setPosAcompte(0);
    setBarcodeScanInput('');
  };



  // ── CSV export ─────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!activeOrders.length) { toast('Aucune commande à exporter.'); return; }
    const headers = ['ID','Date','Client','Téléphone','Zone','Frais Livraison','Paiement','Statut Paiement','Statut Commande','Articles','Total'];
    const rows = activeOrders.map(o => [
      o.id, new Date(o.date).toLocaleDateString('fr-FR'),
      o.client.nom, o.client.telephone, o.livraison.lieu, o.livraison.frais,
      o.paiement?.methode || '', o.paiement?.statut || '',
      o.statut, o.items.map(it => `${it.quantity}x${it.name}`).join(';'), o.total
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' }));
    a.download = `commandes_${activeBoutique.slug}.csv`;
    a.click();
  };

  // ── Charge une image distante en dataURL (contourne CORS via canvas) ─────
  const loadImgDataURL = (url) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    // Les logos Firebase Storage n'ont pas d'en-tête CORS → on passe par notre
    // proxy même-origine /api/img, sinon le canvas est « tainté » et le logo
    // n'apparaît pas sur la facture.
    const src = proxiedImg(url);
    img.src = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now();
  });

  // ── Ticket de caisse (80 mm) dessiné avec jsPDF — robuste, sans dépendance CSS ──
  const buildReceiptPdf = async (jsPDF) => {
    const inv = activePrintInvoice, b = activeBoutique;
    const W = 80, m = 5, cw = W - 2 * m;
    const money = (n) => formatPrice(n, b?.devise); // suit la devise de la boutique (FCFA / €)

    // Logo image (les emojis ne se rendent pas en PDF → ignorés)
    let logoData = null;
    const logo = b.logo;
    if (logo && typeof logo === 'string') {
      if (logo.startsWith('data:image')) logoData = logo;
      else if (logo.startsWith('http')) logoData = await loadImgDataURL(logo);
    }

    const draw = (pdf, measure) => {
      let y = m + 1;
      const setC = (c) => pdf.setTextColor(c[0], c[1], c[2]);
      const center = (txt, size, style, color) => {
        pdf.setFont('helvetica', style || 'normal'); pdf.setFontSize(size); setC(color || [0, 0, 0]);
        pdf.splitTextToSize(String(txt), cw).forEach(l => { pdf.text(l, W / 2, y, { align: 'center' }); y += size * 0.45 + 0.6; });
      };
      const dash = () => {
        pdf.setDrawColor(150); pdf.setLineWidth(0.2); pdf.setLineDashPattern([0.7, 0.7], 0);
        pdf.line(m, y, W - m, y); pdf.setLineDashPattern([], 0); y += 3;
      };
      const solid = () => { pdf.setDrawColor(30); pdf.setLineWidth(0.4); pdf.line(m, y, W - m, y); y += 3.5; };

      // Logo TOUJOURS présent : image de la boutique si disponible, sinon badge
      // rond aux couleurs de la marque avec les initiales du nom.
      if (logoData) {
        if (!measure) { try { pdf.addImage(logoData, 'PNG', W / 2 - 9, y, 18, 18); } catch { /* */ } }
        y += 20;
      } else {
        if (!measure) {
          const hex = String(b.couleurMarque || '#2563eb').replace('#', '');
          const cr = parseInt(hex.slice(0, 2), 16) || 37;
          const cg = parseInt(hex.slice(2, 4), 16) || 99;
          const cb = parseInt(hex.slice(4, 6), 16) || 235;
          const initials = String(b.name || 'B').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
          pdf.setFillColor(cr, cg, cb);
          pdf.circle(W / 2, y + 8, 8, 'F');
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(255, 255, 255);
          pdf.text(initials, W / 2, y + 8, { align: 'center', baseline: 'middle' });
        }
        y += 19;
      }
      center(sanitizePdf(b.name).toUpperCase(), 13, 'bold');
      if (b.adresse) center(sanitizePdf(b.adresse), 8, 'normal', [110, 110, 110]);
      if (b.whatsapp) center(sanitizePdf(b.whatsapp), 8.5, 'normal', [110, 110, 110]);
      y += 1.5; dash();

      center('FACTURE', 11, 'bold');
      const dt = new Date(inv.date);
      center(`N° ${sanitizePdf(inv.id)}`, 8.5, 'normal', [110, 110, 110]);
      center(`${dt.toLocaleDateString('fr-FR')}  ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 8.5, 'normal', [110, 110, 110]);
      y += 1; dash();

      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); setC([90, 90, 90]); pdf.text('CLIENT', m, y); y += 4;
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); setC([20, 20, 20]);
      [inv.client?.nom, inv.client?.telephone, inv.client?.adresse].filter(Boolean).forEach(t => {
        pdf.splitTextToSize(sanitizePdf(t), cw).forEach(l => { pdf.text(l, m, y); y += 4; });
      });
      y += 0.5; dash();

      inv.items.forEach(it => {
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); setC([0, 0, 0]);
        pdf.splitTextToSize(sanitizePdf(it.name), cw).forEach(l => { pdf.text(l, m, y); y += 4; });
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); setC([110, 110, 110]);
        pdf.text(`${it.quantity} x ${money(it.price)}`, m, y);
        pdf.setFont('helvetica', 'bold'); setC([0, 0, 0]);
        pdf.text(money(itemNet(it)), W - m, y, { align: 'right' });
        y += 5;
        const dRem = itemDiscount(it);
        if (dRem > 0) {
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); setC([200, 60, 60]);
          pdf.text(`remise ${it.remise.type === 'percent' ? '-' + it.remise.valeur + '%' : '- ' + money(dRem)}`, m, y);
          y += 4;
        }
      });
      dash();

      const subtotal = cartNet(inv.items);
      const remiseMontant = inv.remise?.montant || 0;
      const livraisonFrais = inv.livraison?.frais || 0;
      const trow = (lbl, val) => {
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); setC([90, 90, 90]); pdf.text(lbl, m, y);
        setC([20, 20, 20]); pdf.text(val, W - m, y, { align: 'right' }); y += 4.5;
      };
      trow('Sous-total', money(subtotal));
      if (remiseMontant > 0) {
        const detailRemise = inv.remise.type === 'percent' ? ` (-${inv.remise.valeur}%)` : '';
        trow(`Remise${detailRemise}`, `- ${money(remiseMontant)}`);
      }
      trow('Livraison', money(livraisonFrais));
      y += 0.5; solid();
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); setC([0, 0, 0]); pdf.text('TOTAL', m, y);
      setC([37, 99, 235]); pdf.text(money(inv.total), W - m, y, { align: 'right' }); y += 6;

      if (inv.paiement?.methode?.includes('Dette') || inv.paiement?.statut === 'Dette') {
        const paye = inv.paiement.montantPaye || 0;
        const dette = inv.paiement.detteRestante || 0;
        trow('Acompte versé', money(paye));
        trow('Reste dû', money(dette));
        y += 1.5;
      }

      center(`Paiement : ${inv.paiement?.methode || 'À la livraison'} — ${inv.paiement?.statut || 'En attente'}`, 8.5, 'normal', [90, 90, 90]);
      y += 1; dash();
      center('Merci pour votre achat !', 9, 'bold', [60, 60, 60]);
      center(`${sanitizePdf(b.name)} · Propulse par Jappandal Tech`, 7.5, 'normal', [150, 150, 150]);
      y += m;
      return y;
    };

    // 1) mesure de la hauteur, 2) ticket à la hauteur exacte
    const probe = new jsPDF({ unit: 'mm', format: [W, 2000] });
    const H = draw(probe, true);
    const pdf = new jsPDF({ unit: 'mm', format: [W, Math.max(70, H)] });
    draw(pdf, false);
    return pdf;
  };

  // ── Facture format A5 (148 × 210 mm) — page classique, propre et imprimable ──
  const buildA5Pdf = async (jsPDF) => {
    const inv = activePrintInvoice, b = activeBoutique;
    const money = (n) => formatPrice(n, b?.devise);
    const T = sanitizePdf;
    const hex = String(b.couleurMarque || '#2563eb').replace('#', '');
    const BR = [parseInt(hex.slice(0, 2), 16) || 37, parseInt(hex.slice(2, 4), 16) || 99, parseInt(hex.slice(4, 6), 16) || 235];

    let logoData = null;
    if (typeof b.logo === 'string') {
      if (b.logo.startsWith('data:image')) logoData = b.logo;
      else if (b.logo.startsWith('http')) logoData = await loadImgDataURL(b.logo).catch(() => null);
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const PW = 148, m = 12, cw = PW - 2 * m;
    const setC = (c) => pdf.setTextColor(c[0], c[1], c[2]);
    let y = m;

    // En-tête : logo + identité (gauche) · FACTURE + n° + date (droite)
    if (logoData) { try { pdf.addImage(logoData, 'PNG', m, y, 16, 16); } catch { /* */ } }
    else {
      pdf.setFillColor(BR[0], BR[1], BR[2]); pdf.circle(m + 8, y + 8, 8, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); setC([255, 255, 255]);
      pdf.text(T(b.name || 'B').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(), m + 8, y + 8, { align: 'center', baseline: 'middle' });
    }
    const tx = m + 20;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); setC([20, 20, 20]);
    pdf.splitTextToSize(T(b.name).toUpperCase(), 70).forEach((l, i) => pdf.text(l, tx, y + 4 + i * 5));
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); setC([110, 110, 110]);
    let hy = y + 13;
    if (b.adresse) { pdf.text(T(b.adresse), tx, hy); hy += 4; }
    if (b.whatsapp) { pdf.text(T(b.whatsapp) + (b.whatsapp2 ? ' / ' + T(b.whatsapp2) : ''), tx, hy); hy += 4; }

    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); setC(BR);
    pdf.text('FACTURE', PW - m, y + 5, { align: 'right' });
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); setC([110, 110, 110]);
    const dt = new Date(inv.date);
    pdf.text(`N° ${T(inv.id)}`, PW - m, y + 11, { align: 'right' });
    pdf.text(`${dt.toLocaleDateString('fr-FR')} ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, PW - m, y + 15.5, { align: 'right' });

    y = Math.max(hy, y + 20) + 2;
    pdf.setDrawColor(BR[0], BR[1], BR[2]); pdf.setLineWidth(0.6); pdf.line(m, y, PW - m, y); y += 6;

    // Client + Paiement
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); setC([130, 130, 130]);
    pdf.text('FACTURE A', m, y);
    pdf.text('PAIEMENT', PW - m, y, { align: 'right' }); y += 4.5;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); setC([30, 30, 30]);
    const cl = [T(inv.client?.nom), T(inv.client?.telephone), T(inv.client?.adresse)].filter(Boolean);
    const pay = [T(inv.paiement?.methode || 'A la livraison'), T(inv.paiement?.statut || 'En attente')];
    const rowsN = Math.max(cl.length, pay.length);
    for (let i = 0; i < rowsN; i++) {
      if (cl[i]) pdf.splitTextToSize(cl[i], cw * 0.6).forEach((l, k) => k === 0 && pdf.text(l, m, y + i * 4.5));
      if (pay[i]) pdf.text(pay[i], PW - m, y + i * 4.5, { align: 'right' });
    }
    y += rowsN * 4.5 + 4;

    // Tableau des articles (colonnes espacées pour ne pas coller Qté/P.U./Montant)
    const nameW = cw * 0.44, colQte = m + cw * 0.52, colPU = m + cw * 0.74, colMt = PW - m;
    pdf.setFillColor(BR[0], BR[1], BR[2]); pdf.rect(m, y, cw, 7, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); setC([255, 255, 255]);
    pdf.text('DESIGNATION', m + 2, y + 4.7);
    pdf.text('QTE', colQte, y + 4.7, { align: 'right' });
    pdf.text('P.U.', colPU, y + 4.7, { align: 'right' });
    pdf.text('MONTANT', colMt - 2, y + 4.7, { align: 'right' });
    y += 7;

    pdf.setFontSize(9);
    inv.items.forEach((it, idx) => {
      const dRem = itemDiscount(it);
      const lines = pdf.splitTextToSize(T(it.name), nameW);
      if (dRem > 0) lines.push(`remise ${it.remise.type === 'percent' ? '-' + it.remise.valeur + '%' : '- ' + money(dRem)}`);
      const rh = Math.max(7, lines.length * 4 + 3);
      if (idx % 2) { pdf.setFillColor(247, 249, 252); pdf.rect(m, y, cw, rh, 'F'); }
      pdf.setFont('helvetica', 'normal');
      lines.forEach((l, k) => { setC(dRem > 0 && k === lines.length - 1 ? [200, 60, 60] : [30, 30, 30]); pdf.text(l, m + 2, y + 4.7 + k * 4); });
      setC([30, 30, 30]);
      pdf.text(String(it.quantity), colQte, y + 4.7, { align: 'right' });
      pdf.text(money(it.price), colPU, y + 4.7, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(money(itemNet(it)), colMt - 2, y + 4.7, { align: 'right' });
      y += rh;
    });
    pdf.setDrawColor(210, 210, 210); pdf.setLineWidth(0.3); pdf.line(m, y, PW - m, y); y += 6;

    // Totaux
    const subtotal = cartNet(inv.items);
    const remiseMontant = inv.remise?.montant || 0;
    const livraisonFrais = inv.livraison?.frais || 0;
    const trow = (lbl, val, bold) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(bold ? 13 : 9.5);
      setC(bold ? [20, 20, 20] : [100, 100, 100]); pdf.text(lbl, PW - m - 45, y, { align: 'right' });
      setC(bold ? BR : [30, 30, 30]); pdf.text(val, PW - m, y, { align: 'right' }); y += bold ? 8 : 5;
    };
    trow('Sous-total', money(subtotal));
    if (remiseMontant > 0) {
      const detailRemise = inv.remise.type === 'percent' ? ` (-${inv.remise.valeur}%)` : '';
      trow(`Remise${detailRemise}`, `- ${money(remiseMontant)}`);
    }
    trow('Livraison', money(livraisonFrais));
    y += 1; pdf.setDrawColor(20, 20, 20); pdf.setLineWidth(0.5); pdf.line(PW - m - 55, y, PW - m, y); y += 6;
    trow('TOTAL', money(inv.total), true);

    if (inv.paiement?.methode?.includes('Dette') || inv.paiement?.statut === 'Dette') {
      const paye = inv.paiement.montantPaye || 0;
      const dette = inv.paiement.detteRestante || 0;
      trow('Acompte versé', money(paye));
      trow('Reste dû', money(dette));
      y += 2;
    }

    // Pied
    y += 4;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); setC([60, 60, 60]);
    pdf.text('Merci pour votre achat !', PW / 2, y, { align: 'center' }); y += 5;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); setC([150, 150, 150]);
    pdf.text(`${T(b.name)} · Propulse par Jappandal Tech · jappandal.com`, PW / 2, y, { align: 'center' });
    return pdf;
  };

  // ── Repli : facture dessinée directement avec jsPDF (si la capture échoue) ──
  const buildManualPdf = async (jsPDF) => {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const m = 15;
      const cW = pageW - 2 * m;
      let y = m;
      // Formateur SANS U+202F (espace fine insécable que jsPDF n'affiche pas).
      const fmtNum = (n) => formatPrice(n, activeBoutique?.devise); // devise de la boutique (FCFA / €)

      // ── Logo : data URL (local) ou URL distante via canvas ──
      const logo = activeBoutique.logo;
      let logoData = null;
      if (logo && typeof logo === 'string') {
        if (logo.startsWith('data:image')) {
          logoData = logo;
        } else if (logo.startsWith('http')) {
          logoData = await loadImgDataURL(logo);
        }
      }

      if (logoData) {
        try { pdf.addImage(logoData, 'PNG', m, y, 20, 20); } catch { logoData = null; }
      }

      const nameX = logoData ? m + 24 : m;
      pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0,0,0);
      pdf.text(activeBoutique.name.toUpperCase(), nameX, y + 8);
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100,100,100);
      if (activeBoutique.adresse) pdf.text(activeBoutique.adresse, nameX, y + 14);
      pdf.text(activeBoutique.whatsapp || '', nameX, y + 19);

      // ── FACTURE title ──
      pdf.setFontSize(22); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0,0,0);
      pdf.text('FACTURE', pageW - m, y + 8, { align: 'right' });
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100,100,100);
      pdf.text(`Réf : ${activePrintInvoice.id}`, pageW - m, y + 14, { align: 'right' });
      pdf.text(new Date(activePrintInvoice.date).toLocaleDateString('fr-FR'), pageW - m, y + 19, { align: 'right' });
      y += 28;

      // ── Séparateur ──
      pdf.setDrawColor(220,220,220); pdf.setLineWidth(0.3);
      pdf.line(m, y, pageW - m, y); y += 8;

      // ── Bloc Client / Paiement ──
      pdf.setFillColor(248,250,252);
      pdf.roundedRect(m, y, cW, 28, 3, 3, 'F');
      pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(150,150,150);
      pdf.text('CLIENT', m + 4, y + 6);
      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0,0,0);
      pdf.text(activePrintInvoice.client.nom, m + 4, y + 12);
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80,80,80);
      pdf.text(activePrintInvoice.client.telephone, m + 4, y + 18);
      pdf.text(activePrintInvoice.client.adresse || '', m + 4, y + 23);

      pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(150,150,150);
      pdf.text('PAIEMENT', pageW - m - 4, y + 6, { align: 'right' });
      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0,0,0);
      pdf.text(activePrintInvoice.paiement?.methode || 'À la livraison', pageW - m - 4, y + 12, { align: 'right' });
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80,80,80);
      pdf.text(activePrintInvoice.paiement?.statut || 'En attente', pageW - m - 4, y + 18, { align: 'right' });
      y += 36;

      // ── En-tête tableau ──
      pdf.setFillColor(15,23,42);
      pdf.rect(m, y, cW, 9, 'F');
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255,255,255);
      pdf.text('Article', m + 3, y + 6);
      pdf.text('Qté', m + cW * 0.58, y + 6);
      pdf.text('P.U.', m + cW * 0.72, y + 6);
      pdf.text('Total', pageW - m - 3, y + 6, { align: 'right' });
      y += 9;

      // ── Lignes articles ──
      activePrintInvoice.items.forEach((item, i) => {
        const dRem = itemDiscount(item);
        if (i % 2 === 1) { pdf.setFillColor(248,250,252); pdf.rect(m, y, cW, 9, 'F'); }
        pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(0,0,0);
        let name = item.name.length > 34 ? item.name.substring(0,34)+'…' : item.name;
        if (dRem > 0) name += item.remise.type === 'percent' ? ` (-${item.remise.valeur}%)` : ` (-${fmtNum(dRem)})`;
        pdf.text(name, m + 3, y + 6);
        pdf.text(String(item.quantity), m + cW * 0.58, y + 6);
        pdf.text(fmtNum(item.price), m + cW * 0.72, y + 6);
        pdf.setFont('helvetica', 'bold');
        pdf.text(fmtNum(itemNet(item)), pageW - m - 3, y + 6, { align: 'right' });
        y += 9;
      });

      // ── Séparateur ──
      pdf.setDrawColor(200,200,200); pdf.setLineWidth(0.3);
      pdf.line(m, y, pageW - m, y); y += 8;

      // ── Totaux ──
      const subtotal = cartNet(activePrintInvoice.items);
      const remiseMontant = activePrintInvoice.remise?.montant || 0;
      const livraisonFrais = activePrintInvoice.livraison?.frais || 0;

      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100,100,100);
      pdf.text('Sous-total', pageW - m - 55, y);
      pdf.text(fmtNum(subtotal), pageW - m - 3, y, { align: 'right' }); y += 7;

      if (remiseMontant > 0) {
        const detailRemise = activePrintInvoice.remise.type === 'percent' ? ` (-${activePrintInvoice.remise.valeur}%)` : '';
        pdf.text(`Remise${detailRemise}`, pageW - m - 55, y);
        pdf.setTextColor(220, 38, 38);
        pdf.text(`- ${fmtNum(remiseMontant)}`, pageW - m - 3, y, { align: 'right' }); y += 7;
        pdf.setTextColor(100, 100, 100);
      }

      pdf.text('Livraison', pageW - m - 55, y);
      pdf.text(fmtNum(livraisonFrais), pageW - m - 3, y, { align: 'right' }); y += 3;
      pdf.setDrawColor(0,0,0); pdf.setLineWidth(0.5);
      pdf.line(pageW - m - 60, y, pageW - m, y); y += 6;
      pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0,0,0);
      pdf.text('TOTAL', pageW - m - 55, y);
      pdf.setTextColor(37,99,235);
      pdf.text(fmtNum(activePrintInvoice.total), pageW - m - 3, y, { align: 'right' });
      y += 7;

      if (activePrintInvoice.paiement?.methode?.includes('Dette') || activePrintInvoice.paiement?.statut === 'Dette') {
        const paye = activePrintInvoice.paiement.montantPaye || 0;
        const dette = activePrintInvoice.paiement.detteRestante || 0;
        
        pdf.setFontSize(9.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100,100,100);
        pdf.text('Acompte versé', pageW - m - 55, y);
        pdf.text(fmtNum(paye), pageW - m - 3, y, { align: 'right' }); y += 6;
        
        pdf.setFont('helvetica', 'bold'); pdf.setTextColor(180, 83, 9);
        pdf.text('Reste dû', pageW - m - 55, y);
        pdf.text(fmtNum(dette), pageW - m - 3, y, { align: 'right' }); y += 6;
      }
      y += 11;

      // ── Footer ──
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(160,160,160);
      pdf.text(`Merci pour votre achat chez ${activeBoutique.name} · Jappandal Tech`, pageW / 2, y, { align: 'center' });

      return pdf;
  };

  // ── Génération de la facture au format TICKET DE CAISSE (80 mm), dessiné
  //    directement avec jsPDF → rendu net et identique partout (téléchargement
  //    + partage WhatsApp). Repli sur la facture A4 si jamais le ticket échoue. ─
  const generatePDF = async (mode = 'download') => {
    if (!activePrintInvoice) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const safeName = sanitizePdf(activeBoutique.name).replace(/\s+/g, '_') || 'boutique';
      const suffix = invoiceFormat === 'a5' ? '_A5' : '';
      const filename = `Facture_${activePrintInvoice.id}_${safeName}${suffix}.pdf`;
      let pdf;
      try {
        pdf = invoiceFormat === 'a5' ? await buildA5Pdf(jsPDF) : await buildReceiptPdf(jsPDF);
      } catch (capErr) {
        console.warn('Format indisponible, repli facture A4 :', capErr);
        pdf = await buildManualPdf(jsPDF);
      }

      if (mode === 'share') {
        const file = new File([pdf.output('blob')], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Facture', text: `Facture ${activePrintInvoice.id} — ${activeBoutique.name}` }); }
          catch (e) { if (e?.name !== 'AbortError') pdf.save(filename); }
        } else {
          pdf.save(filename);
          toast('Partage de fichier indisponible ici — facture téléchargée (joignez-la sur WhatsApp).', 'info', 5000);
        }
      } else {
        pdf.save(filename);
      }
    } catch (err) {
      console.error('PDF error:', err);
      toast('Erreur PDF : ' + (err.message || 'Réessayez'));
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Nav items ─────────────────────────────────────────────────────────────
  const plan = activeBoutique?.abonnement?.plan || 'Découverte';
  const isFree = plan === 'Découverte';
  const isPro = plan === 'SaaS Pro' || plan === 'Pro';
  const isVIP = plan === 'Premium VIP' || plan === 'Premium';

  const NAV = [
    { id:'dashboard', label:'Tableau de bord', icon: LayoutDashboard },
    { id:'products',  label:'Produits',         icon: ShoppingBag, badge: activeProducts.length },
    { id:'orders',    label:'Commandes',         icon: ClipboardList, badge: pendingOrders || null },
    { id:'clients',   label:'Clients',           icon: User, badge: clientsList.length || null },
    { id:'caisse',    label:'Caisse',            icon: Receipt },
  ];

  if (isPro || isVIP) {
    const activeCaissiersCount = caissiers.filter(c => c.boutiqueId === activeBoutique?.id).length;
    NAV.push({ id:'caissiers', label:'Caissiers', icon: Users, badge: activeCaissiersCount || null });
  }

  if (isVIP) {
    const activeDepensesCount = depenses.filter(d => d.boutiqueId === activeBoutique?.id).length;
    NAV.push({ id:'depenses', label:'Dépenses', icon: TrendingDown, badge: activeDepensesCount || null });
  }

  NAV.push({ id:'settings',  label:'Configuration',    icon: Settings });
  NAV.push({ id:'support',   label:'Support',           icon: MessageSquare, badge: activeTickets.filter(t=>t.statut==='En attente').length || null });

  const filteredNAV = NAV.filter(item => {
    if (merchantUser?.role === 'caissier') {
      return ['caisse', 'orders'].includes(item.id);
    }
    return true;
  });

  // ── Filtered orders ───────────────────────────────────────────────────────
  const dFrom = orderFrom ? new Date(orderFrom + 'T00:00:00') : null;
  const dTo   = orderTo   ? new Date(orderTo   + 'T23:59:59') : null;
  const filteredOrders = activeOrders.filter(o => {
    const matchSearch = !orderSearch || o.id.toLowerCase().includes(orderSearch.toLowerCase()) || o.client.nom.toLowerCase().includes(orderSearch.toLowerCase()) || o.client.telephone.includes(orderSearch);
    const matchStatut = orderStatut === 'Tous' || o.statut === orderStatut;
    const matchPay    = orderPaiement === 'Tous' || (o.paiement?.statut||'En attente') === orderPaiement;
    const od = new Date(o.date);
    const matchFrom = !dFrom || od >= dFrom;
    const matchTo   = !dTo   || od <= dTo;
    return matchSearch && matchStatut && matchPay && matchFrom && matchTo;
  });

  // Préréglages de période (Aujourd'hui / 7j / 30j / Tout)
  const setDatePreset = (preset) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (preset === 'today')      { setOrderFrom(iso(today)); setOrderTo(iso(today)); }
    else if (preset === '7')     { const s = new Date(today); s.setDate(s.getDate()-6);  setOrderFrom(iso(s)); setOrderTo(iso(today)); }
    else if (preset === '30')    { const s = new Date(today); s.setDate(s.getDate()-29); setOrderFrom(iso(s)); setOrderTo(iso(today)); }
    else                         { setOrderFrom(''); setOrderTo(''); }
  };

  // Regroupement des commandes par jour (le plus récent en premier)
  const orderGroups = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const byKey = {}; const groups = [];
    [...filteredOrders].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(o => {
      const d = new Date(o.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!byKey[key]) {
        const dd = new Date(d); dd.setHours(0, 0, 0, 0);
        let label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        if (dd.getTime() === today.getTime()) label = "Aujourd'hui";
        else if (dd.getTime() === yest.getTime()) label = 'Hier';
        byKey[key] = { key, label, orders: [], total: 0, count: 0 };
        groups.push(byKey[key]);
      }
      byKey[key].orders.push(o);
      byKey[key].count += 1;
      if (o.statut !== 'Annulée') byKey[key].total += o.total;
    });
    return groups;
  })();
  const toggleDay = (key) => setCollapsedDays(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-[100dvh] sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <Link to="/">
          <img src="/logo-jappandal.png" alt="Jappandal" className="h-8 object-contain" />
        </Link>
      </div>

      {/* Boutique selector */}
      {myBoutiques.length > 1 && (
        <div className="p-3 border-b border-slate-800">
          <select value={currentMerchantBoutiqueId} onChange={e => {
            const newId = e.target.value;
            setCurrentMerchantBoutiqueId(newId);
            const b = boutiques.find(x => x.id === newId);
            if (b) {
              setSettingsForm({
                name: b.name || '',
                description: b.description || '',
                whatsapp: b.whatsapp || '',
                whatsapp2: b.whatsapp2 || '',
                couleurMarque: b.couleurMarque || '#2563eb',
                logo: b.logo || '🛍️',
                adresse: b.adresse || '',
                emailContact: b.emailContact || '',
                instagram: b.instagram || '',
                facebook: b.facebook || '',
                tiktok: b.tiktok || '',
                texteRemerciement: b.texteRemerciement || '',
                zonesLivraison: b.zonesLivraison || [],
                waveMerchantLink: b.waveMerchantLink || ''
              });
            }
          }}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer">
            {myBoutiques.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {filteredNAV.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
            }`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {badge ? (
              <span className="bg-blue-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Vitrine link */}
      <div className="px-3 pb-2">
        <Link to={`/shop/${activeBoutique.slug}`} target="_blank"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-blue-400 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> Voir la vitrine
        </Link>
      </div>

      {/* User + logout */}
      <div className="p-3 border-t border-slate-800 space-y-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-800 rounded-lg">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
            {merchantUser?.email?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{activeBoutique.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{merchantUser?.email}</p>
          </div>
        </div>
        {isAdminUser && (
          <Link to="/admin" onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-all font-bold">
            <Shield className="w-4 h-4" /> Console Admin/Dev
          </Link>
        )}
        <button type="button" onClick={async () => { setSidebarOpen(false); await logoutMerchant(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      </div>
    </aside>
  );

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex font-sans ${darkMode ? '' : 'chaleur-console'}`}>
      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        {renderSidebar()}
      </div>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-60">
            {renderSidebar()}
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-6 py-3 pt-safe-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-400 hover:text-white">
              ☰
            </button>
            <div>
              <h1 className="text-base font-bold text-white">{NAV.find(n => n.id === activeTab)?.label}</h1>
              <p className="text-xs text-slate-500">{activeBoutique.name} · Plan {activeBoutique.abonnement?.plan || 'Découverte'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !darkMode;
                setDarkMode(next);
                localStorage.setItem('jappandal-dark', String(next));
              }}
              title={darkMode ? 'Mode Clair' : 'Mode Sombre'}
              className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={async () => {
                if (alertsOn) {
                  setAlertsOn(false); localStorage.setItem('jt_alerts_on', '0');
                  toast('Alertes commande désactivées.', 'info');
                } else {
                  unlockAudio();
                  await requestNotifPermission();
                  setAlertsOn(true); localStorage.setItem('jt_alerts_on', '1');
                  playOrderSound();
                  toast('🔔 Alertes activées — un son retentira à chaque nouvelle commande.', 'success', 6000);
                }
              }}
              title={alertsOn ? 'Alertes commande activées (cliquer pour désactiver)' : 'Activer les alertes sonores de commande'}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${alertsOn ? 'bg-blue-500/15 text-blue-300 border-blue-500/40' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
              <svg viewBox="0 0 24 24" fill={alertsOn ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              <span className="hidden sm:inline">{alertsOn ? 'Alertes ON' : 'Alertes'}</span>
              {alertsOn && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950" />}
            </button>
            {activeBoutique && (
              <button
                onClick={async () => {
                  const url = buildShopUrl(activeBoutique);
                  try {
                    setShareQr(await QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } }));
                  } catch { setShareQr(''); }
                  setShowShareModal(true);
                }}
                title="Partager ma boutique"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-all">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span className="hidden sm:inline">Partager</span>
              </button>
            )}
            {activeTab === 'products' && (
              <button onClick={openAddProduct}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 text-sm font-bold transition-all">
                <Plus className="w-4 h-4 stroke-[3]" /> Ajouter
              </button>
            )}
            {activeTab === 'orders' && (
              <button onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition-all">
                <Save className="w-4 h-4" /> CSV
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

          {/* Alerte abonnement (rappel de paiement / compte à rebours) */}
          {(() => {
            const ab = activeBoutique.abonnement;
            if (!ab || ab.plan === 'Découverte' || !ab.dateExpiration) return null;
            const days = Math.ceil((new Date(ab.dateExpiration).getTime() - now) / 86400000);
            if (days > 7) return null;
            const expired = days < 0;
            return (
              <div className={`rounded-xl p-4 flex items-start gap-3 border ${expired ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${expired ? 'text-red-400' : 'text-amber-400'}`} />
                <div className="flex-1 text-sm">
                  <p className={`font-bold ${expired ? 'text-red-300' : 'text-amber-300'}`}>
                    {expired ? 'Votre abonnement a expiré — votre vitrine est bloquée.' : `Votre abonnement expire dans ${days} jour${days > 1 ? 's' : ''}.`}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {expired
                      ? 'Renouvelez pour réactiver votre boutique en ligne.'
                      : `Échéance : ${new Date(ab.dateExpiration).toLocaleDateString('fr-FR')}. Pensez à renouveler pour rester en ligne.`}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── DASHBOARD ─────────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPIs principaux et analytiques avancés */}
              <div className={`grid grid-cols-2 ${isVIP ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
                {[
                  {
                    label: isVIP ? 'Revenu Net' : 'Revenus',
                    value: fmt(isVIP ? Math.max(0, totalRevenue - totalExpenses) : totalRevenue),
                    sub: isVIP ? `Brut: ${fmt(totalRevenue)} | Dépenses: ${fmt(totalExpenses)}` : 'Commandes payées/livrées',
                    icon: DollarSign,
                    color: 'teal'
                  },
                  { label: 'Panier Moyen (AOV)', value: fmt(averageOrderValue), sub: 'Chiffre d\'affaires / commande', icon: Zap, color: 'indigo' },
                  { label: 'Top Catégorie', value: topCategory, sub: 'Catégorie la plus vendue', icon: Store, color: 'orange' },
                  { label: 'Taux de Conversion', value: `${conversionRate}%`, sub: `Sur un total de ${simulatedVisits} visites`, icon: TrendingUp, color: 'emerald' },
                  isVIP && {
                    label: 'Dettes Clients',
                    value: fmt(totalOutstandingDebts),
                    sub: 'Reste à encaisser',
                    icon: AlertTriangle,
                    color: 'amber'
                  }
                ].filter(Boolean).map(({ label, value, sub, icon: Icon, color }) => (
                  <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700/50">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-medium text-slate-500">{label}</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${color}-500/10`}>
                        <Icon className={`w-4 h-4 text-${color}-400`} />
                      </div>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-white truncate">{value}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Ligne Graphique et Section Actions Latérale */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Graphique SVG Interactif */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 relative flex flex-col justify-between min-h-[340px]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                      <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" /> Évolution du Chiffre d'Affaires
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Graphique SVG interactif basé sur le chiffre d'affaires quotidien</p>
                    </div>
                    
                    {/* Commutateur de période */}
                    <div className="flex bg-slate-950 p-0.5 border border-slate-800 rounded-lg self-start sm:self-auto">
                      <button 
                        type="button"
                        onClick={() => setPeriodDays(7)}
                        className={`px-3 py-1.5 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${periodDays === 7 ? 'bg-blue-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                      >
                        7 Jours
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPeriodDays(30)}
                        className={`px-3 py-1.5 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${periodDays === 30 ? 'bg-blue-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                      >
                        30 Jours
                      </button>
                    </div>
                  </div>

                  {/* Rendu Graphique SVG */}
                  <div className="w-full h-56 select-none relative">
                    {/* Tooltip flottante en cas de survol */}
                    {hoveredDataPoint && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-slate-800 backdrop-blur-md px-3 py-2 rounded-xl text-[10px] shadow-2xl flex flex-col gap-1 z-10 pointer-events-none animate-fade-in text-left">
                        <span className="font-bold text-slate-400">{hoveredDataPoint.dateStr}</span>
                        <div className="flex items-center gap-4 justify-between">
                          <span className="text-slate-500 font-semibold">Ventes :</span>
                          <span className="font-black text-emerald-400 font-mono">{fmt(hoveredDataPoint.sales)}</span>
                        </div>
                        <div className="flex items-center gap-4 justify-between">
                          <span className="text-slate-500 font-semibold">Commandes :</span>
                          <span className="font-black text-blue-400 font-mono">{hoveredDataPoint.orders}</span>
                        </div>
                      </div>
                    )}

                    <svg viewBox="0 0 500 160" width="100%" height="100%" className="overflow-visible">
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Lignes de repère horizontales */}
                      {[0, 0.33, 0.66, 1].map((ratio, index) => {
                        const y = 20 + 120 * ratio;
                        const labelValue = chartPaths.maxVal * (1 - ratio);
                        return (
                          <g key={index} className="opacity-15">
                            <line 
                              x1="45" 
                              y1={y} 
                              x2="485" 
                              y2={y} 
                              stroke="#64748b" 
                              strokeWidth="0.75" 
                              strokeDasharray="3 3" 
                            />
                            <text 
                              x="35" 
                              y={y + 3} 
                              textAnchor="end" 
                              className="fill-slate-400 font-mono text-[8px] font-bold"
                            >
                              {labelValue >= 1000 ? `${(labelValue / 1000).toFixed(0)}k` : labelValue.toFixed(0)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Graduation de l'axe temporel (X) */}
                      {chartPaths.points.map((p, i) => {
                        const shouldShowLabel = periodDays === 7 ? true : i % 5 === 0;
                        if (!shouldShowLabel) return null;
                        return (
                          <text 
                            key={i} 
                            x={p.x} 
                            y="152" 
                            textAnchor="middle" 
                            className="fill-slate-500 font-bold text-[7px]"
                          >
                            {p.data.dateStr}
                          </text>
                        );
                      })}

                      {/* Remplissage de zone sous la courbe */}
                      {chartPaths.areaPath && (
                        <path 
                          d={chartPaths.areaPath} 
                          fill="url(#areaGrad)" 
                          className="transition-all duration-300"
                        />
                      )}

                      {/* Ligne principale du graphique */}
                      {chartPaths.linePath && (
                        <path 
                          d={chartPaths.linePath} 
                          fill="none" 
                          stroke="#3b82f6" 
                          strokeWidth="2.2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className="transition-all duration-300"
                        />
                      )}

                      {/* Points interactifs de données */}
                      {chartPaths.points.map((p, i) => (
                        <g key={i} className="group">
                          {p.data.sales > 0 && (
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="6" 
                              className="fill-blue-500/20 stroke-none pointer-events-none group-hover:scale-150 transition-all duration-300" 
                            />
                          )}
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="3.5" 
                            className={`stroke-slate-900 stroke-2 cursor-pointer transition-all duration-150 ${p.data.sales > 0 ? 'fill-blue-500 group-hover:fill-emerald-400 group-hover:r-5' : 'fill-slate-700'}`}
                            onMouseEnter={() => setHoveredDataPoint(p.data)}
                            onMouseLeave={() => setHoveredDataPoint(null)}
                          />
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Volet Latéral Droite : Actions & Alertes */}
                <div className="flex flex-col gap-6">
                  
                  {/* Carte Plan & Exportation */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                        <Store className="w-4 h-4 text-blue-400" /> Plan & Export
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">Exportez l'historique complet et suivez votre statut.</p>
                      
                      <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div className="text-xs">
                          <span className="text-slate-500 block">Formule actuelle</span>
                          <span className="font-bold text-white">{activeBoutique.abonnement?.plan || 'Découverte'}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isFree ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'}`}>
                          {isFree ? 'Découverte' : 'Professionnel'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2">
                      <button 
                        type="button"
                        onClick={handleExportCSV}
                        className="w-full py-3 px-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Save className="w-4 h-4" /> Exporter Historique (CSV)
                      </button>
                      
                      {isFree && (
                        <button 
                          type="button"
                          onClick={() => setShowUpgradeModal(true)}
                          className="w-full py-2 px-4 text-center text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline transition-all cursor-pointer"
                        >
                          Passer Pro pour lever les limites →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Alertes de Stock Critique */}
                  {(outOfStock.length > 0 || lowStockList.length > 0) && (
                    <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400" /> Stocks Critiques
                        </h4>
                        <button onClick={() => setActiveTab('products')} className="text-xs text-blue-400 hover:text-blue-300">Gérer →</button>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">Réapprovisionnez ces produits pour éviter les ruptures.</p>
                      
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {outOfStock.map(p => (
                          <button key={p.id} type="button" onClick={() => openEditProduct(p)} title="Réapprovisionner cet article"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                            <span className="w-1 h-1 rounded-full bg-red-500" /> {p.name} · Rupture
                          </button>
                        ))}
                        {lowStockList.map(p => (
                          <button key={p.id} type="button" onClick={() => openEditProduct(p)} title="Réapprovisionner cet article"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                            <span className="w-1 h-1 rounded-full bg-amber-400" /> {p.name} · {p.stock} u.
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Ligne des listes (Commandes Récentes et Top Produits) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Commandes Récentes */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                      <ClipboardList className="w-4 h-4 text-blue-400" /> Commandes récentes
                    </h3>
                    <button onClick={() => setActiveTab('orders')} className="text-xs text-blue-400 hover:text-blue-300">Voir tout →</button>
                  </div>
                  {activeOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs font-semibold">Aucune commande reçue pour le moment.</div>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {activeOrders.slice(0, 5).map(o => (
                        <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-slate-200">{o.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${STATUT_COLORS[o.statut] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                {o.statut}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 truncate">{o.client.nom} · {new Date(o.date).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <span className="font-black text-slate-200 text-xs shrink-0">{fmt(o.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Produits Vendus */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-800">
                    <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-blue-400" /> Top produits vendus
                    </h3>
                  </div>
                  {(() => {
                    const qtyMap = {};
                    completedOrders.forEach(o => o.items.forEach(it => { qtyMap[it.name] = (qtyMap[it.name]||0) + it.quantity; }));
                    const top = Object.entries(qtyMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
                    return top.length ? (
                      <div className="divide-y divide-slate-800">
                        {top.map(([name, qty], i) => (
                          <div key={name} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/10 transition-colors">
                            <span className="w-5 h-5 rounded-full bg-slate-950 text-slate-400 text-[10px] font-bold flex items-center justify-center font-mono">#{i+1}</span>
                            <span className="flex-1 text-xs font-semibold text-slate-300 truncate">{name}</span>
                            <span className="text-xs font-bold text-blue-400 shrink-0">{qty} vendus</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-500 text-xs font-semibold">Aucun article vendu pour le moment.</div>
                    );
                  })()}
                </div>

              </div>
            </div>
          )}

          {/* ── PRODUCTS ──────────────────────────────────────────────────── */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {/* Limite plan gratuit */}
              {isFree && (
                <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-300">{activeProducts.length}/5 produits utilisés (plan Découverte gratuit)</span>
                  <button onClick={() => setShowUpgradeModal(true)} className="ml-auto text-xs font-bold text-amber-400 hover:text-amber-300">Passer Pro →</button>
                </div>
              )}

              {activeProducts.length === 0 ? (
                <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl py-16 text-center">
                  <ShoppingBag className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="font-semibold text-slate-400">Aucun produit dans votre catalogue</p>
                  <p className="text-sm text-slate-600 mt-1 mb-5">Ajoutez votre premier produit pour qu'il apparaisse sur votre vitrine.</p>
                  <button onClick={openAddProduct}
                    className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm transition-all">
                    <Plus className="inline w-4 h-4 mr-1.5" />Ajouter un produit
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Recherche produit */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Rechercher un produit (nom ou catégorie)…"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {displayedProductGroups.length === 0 && (
                    <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl py-10 text-center text-slate-500 text-sm">
                      Aucun produit ne correspond à « {productSearch} ».
                    </div>
                  )}
                  {displayedProductGroups.map(({ cat, items }) => {
                  const collapsed = !productSearch.trim() && collapsedCats.has(cat);
                  return (
                  <div key={cat} className="space-y-3">
                    {/* En-tête de famille (repliable) */}
                    <button onClick={() => toggleCat(cat)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 transition-colors text-left">
                      <span className="flex items-center gap-2 min-w-0">
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                        <span className="font-bold text-slate-100 text-sm truncate">{cat}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">{items.length}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">{items.reduce((s, p) => s + (Number(p.stock) || 0), 0)} en stock</span>
                    </button>
                    {!collapsed && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {items.map(p => (
                    <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all group flex flex-col">
                      <div className="relative h-28 sm:h-32 bg-slate-800 overflow-hidden shrink-0">
                        <img src={thumb(p.photo, 400)} onError={fallbackSrc(p.photo)} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        {p.stock === 0 && (
                          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">Épuisé</span>
                          </div>
                        )}
                        {p.stock > 0 && p.stock <= 3 && (
                          <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                            {p.stock}
                          </span>
                        )}
                        {p.variantes && p.variantes.length > 0 && (
                          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded-full">
                            {p.variantes.length} options
                          </span>
                        )}
                      </div>
                      <div className="p-2.5 flex flex-col flex-1">
                        <span className="text-[9px] font-semibold text-blue-400 uppercase tracking-wider">{p.category}</span>
                        <h4 className="font-semibold text-slate-200 text-xs mt-0.5 line-clamp-2 leading-tight flex-1">{p.name}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-white text-sm">{fmt(p.price)}</span>
                          <span className="text-[10px] text-slate-500">{p.stock} stk</span>
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          <button onClick={() => openEditProduct(p)}
                            className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center justify-center gap-1">
                            <Edit3 className="w-3 h-3" /> Modifier
                          </button>
                          <button onClick={() => handleDeleteProduct(p.id)}
                            className="py-1.5 px-2 rounded-lg text-xs bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/10 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                    </div>
                    )}
                  </div>
                  );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS ────────────────────────────────────────────────────── */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-48 bg-slate-800/60 rounded-lg px-3">
                    <Search className="w-4 h-4 text-slate-500 shrink-0" />
                    <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                      placeholder="Rechercher commande, client..."
                      className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none py-2" />
                  </div>
                  <select value={orderStatut} onChange={e => setOrderStatut(e.target.value)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none">
                    {['Tous','Reçue','Préparée','Livrée','Payée','Attente Annulation','Annulée'].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select value={orderPaiement} onChange={e => setOrderPaiement(e.target.value)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none">
                    {['Tous','En attente','Payé'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {/* Période : préréglages + calendrier du / au */}
                <div className="flex flex-wrap items-center gap-2">
                  {[['today',"Aujourd'hui"],['7','7 jours'],['30','30 jours'],['all','Tout']].map(([k, lbl]) => (
                    <button key={k} onClick={() => setDatePreset(k)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors">
                      {lbl}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 sm:ml-auto text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Du</span>
                    <input type="date" value={orderFrom} max={orderTo || undefined} onChange={e => setOrderFrom(e.target.value)}
                      className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 [color-scheme:dark]" />
                    <span>au</span>
                    <input type="date" value={orderTo} min={orderFrom || undefined} onChange={e => setOrderTo(e.target.value)}
                      className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 [color-scheme:dark]" />
                    {(orderFrom || orderTo) && (
                      <button onClick={() => setDatePreset('all')} title="Effacer les dates" className="text-slate-500 hover:text-red-400 ml-1"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 text-center text-slate-500">
                  {activeOrders.length === 0 ? 'Aucune commande reçue pour le moment.' : 'Aucune commande correspond aux filtres.'}
                </div>
              ) : (
                <div className="space-y-5">
                  {orderGroups.map(g => {
                    const collapsed = collapsedDays.has(g.key);
                    return (
                    <div key={g.key} className="space-y-3">
                      <button onClick={() => toggleDay(g.key)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 transition-colors text-left">
                        <span className="flex items-center gap-2 min-w-0">
                          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                          <span className="font-bold text-slate-100 text-sm capitalize truncate">{g.label}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">{g.count} cmd</span>
                        </span>
                        <span className="font-bold text-emerald-400 text-sm shrink-0">{fmt(g.total)}</span>
                      </button>
                      {!collapsed && g.orders.map(o => (
                        <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
                      {/* Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-200">{o.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUT_COLORS[o.statut] || ''}`}>{o.statut}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${o.paiement?.statut === 'Payé' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                              {o.paiement?.statut || 'En attente'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {o.client.nom} · {o.client.telephone} · {new Date(o.date).toLocaleDateString('fr-FR')} · {o.paiement?.methode || 'Livraison'}
                          </p>
                        </div>
                        <span className="font-bold text-lg text-white">{fmt(o.total)}</span>
                      </div>

                      {/* Articles */}
                      <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                        {o.items.map((it, i) => (
                          <div key={i} className="flex justify-between gap-2 text-sm py-1">
                            <span className="text-slate-300 min-w-0 truncate"><span className="text-blue-400 font-bold">{it.quantity}×</span> {it.name}{itemDiscount(it) > 0 && <span className="text-red-400 text-[10px]"> (rem -{it.remise.type === 'percent' ? `${it.remise.valeur}%` : fmt(itemDiscount(it))})</span>}</span>
                            <span className="text-slate-400 font-mono shrink-0">{fmt(itemNet(it))}</span>
                          </div>
                        ))}
                        {o.remise?.montant > 0 && (
                          <div className="flex justify-between text-xs text-red-400 pt-1 border-t border-slate-700 mt-1">
                            <span>Remise globale{o.remise.type === 'percent' ? ` (${o.remise.valeur}%)` : ''}</span>
                            <span>- {fmt(o.remise.montant)}</span>
                          </div>
                        )}
                        {o.livraison.frais > 0 && (
                          <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-700 mt-1">
                            <span>Livraison ({o.livraison.lieu})</span>
                            <span>{fmt(o.livraison.frais)}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {o.statut === 'Annulée' ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-xs text-red-400 font-medium flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5" /> Commande annulée — stock remboursé
                          </span>
                          <button onClick={() => setActivePrintInvoice(o)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1">
                            <Printer className="w-3.5 h-3.5" /> Facture
                          </button>
                        </div>
                      ) : o.statut === 'Attente Annulation' ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          {merchantUser?.role === 'caissier' ? (
                            <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/20 px-2 py-1.5 rounded-lg">
                              <Clock className="w-3.5 h-3.5" /> Annulation demandée au marchand
                            </span>
                          ) : (
                            <>
                              <span className="text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-1.5 rounded-lg flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Demande d'annulation caissier
                              </span>
                              <button onClick={() => {
                                if (window.confirm("Approuver l'annulation de cette commande ? Les articles seront remis en stock.")) {
                                  cancelOrder(o.id);
                                  toast('Annulation approuvée.', 'success');
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1">
                                Approuver
                              </button>
                              <button onClick={() => {
                                if (window.confirm("Rejeter la demande d'annulation ?")) {
                                  updateOrderStatus(o.id, 'Reçue');
                                  toast("Annulation rejetée. Commande rétablie.", 'info');
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1">
                                Rejeter
                              </button>
                            </>
                          )}
                          <button onClick={() => setActivePrintInvoice(o)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1">
                            <Printer className="w-3.5 h-3.5" /> Facture
                          </button>
                        </div>
                      ) : (
                      <div className="flex flex-wrap gap-2">
                        <select value={o.statut} onChange={e => updateOrderStatus(o.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer focus:outline-none ${STATUT_COLORS[o.statut] || ''}`}>
                          {['Reçue','Préparée','Livrée','Payée'].map(s => <option key={s}>{s}</option>)}
                        </select>
                        {o.paiement?.statut !== 'Payé' ? (
                          <button onClick={() => updateOrderPaymentStatus(o.id, 'Payé')}
                            title="Cliquez quand vous avez reçu l'argent du client"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Encaisser
                          </button>
                        ) : (
                          <button onClick={() => updateOrderPaymentStatus(o.id, 'En attente')}
                            title="Payé — cliquez pour annuler l'encaissement"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white border border-emerald-500 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Encaissé
                          </button>
                        )}
                        <a href={`https://wa.me/${o.client.telephone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                        <button onClick={() => openEditOrder(o)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center gap-1">
                          <Edit3 className="w-3.5 h-3.5" /> Modifier
                        </button>
                        <button onClick={() => setActivePrintInvoice(o)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1">
                          <Printer className="w-3.5 h-3.5" /> Facture
                        </button>
                        <button onClick={() => {
                            if (merchantUser?.role === 'caissier') {
                              if (window.confirm(`Demander l'annulation de la commande ${o.id} ?`)) {
                                updateOrderStatus(o.id, 'Attente Annulation');
                                toast("Demande d'annulation envoyée.", 'info');
                              }
                            } else {
                              if (window.confirm(`Annuler la commande ${o.id} ?\n\nLes articles seront automatiquement remis en stock (retour client).`)) {
                                cancelOrder(o.id);
                                toast('Commande annulée — articles remis en stock.', 'success');
                              }
                            }
                          }}
                          title="Annuler la commande / retour produit — remet les articles en stock"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> {merchantUser?.role === 'caissier' ? 'Annuler' : 'Annuler / Retour'}
                        </button>
                      </div>
                      )}
                        </div>
                      ))}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CAISSE ────────────────────────────────────────────────────── */}
          {activeTab === 'caisse' && (() => {
            const posProducts = activeProducts.filter(p => p.actif && p.stock > 0 && p.name.toLowerCase().includes(posSearch.toLowerCase()));
            return (
              <div className="space-y-4">
                {posSaleSuccess && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-emerald-300 text-sm">Vente enregistrée — {posSaleSuccess.orderId}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">{posSaleSuccess.client.nom} · {fmt(posSaleSuccess.total)} · {posSaleSuccess.payMethod}</p>
                      {posSaleSuccess.order && (
                        <button onClick={() => setActivePrintInvoice(posSaleSuccess.order)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                          <Printer className="w-3.5 h-3.5" /> Facture / Envoyer
                        </button>
                      )}
                    </div>
                    <button onClick={() => setPosSaleSuccess(null)} className="text-slate-500 hover:text-slate-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* Catalogue */}
                  <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-blue-400" /> Catalogue
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        <input value={posSearch} onChange={e => setPosSearch(e.target.value)} placeholder="Rechercher un produit..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
                      </div>
                      <form onSubmit={handleBarcodeScanSubmit} className="relative">
                        <Zap className="w-4 h-4 text-amber-400 absolute left-3 top-2.5" />
                        <input value={barcodeScanInput} onChange={e => setBarcodeScanInput(e.target.value)} placeholder="Scanner code-barres..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono" />
                      </form>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                      {posProducts.map(p => {
                        const inCart = posCart.find(i => i.id === p.id);
                        return (
                          <button key={p.id} onClick={() => addToPos(p)} disabled={inCart?.quantity >= p.stock}
                            className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${inCart ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 bg-slate-800 hover:border-slate-600'} ${inCart?.quantity >= p.stock ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <img src={thumb(p.photo, 300)} onError={fallbackSrc(p.photo)} alt={p.name} loading="lazy" className="w-full h-20 object-cover rounded-lg mb-2 bg-slate-700" />
                            <p className="text-xs font-semibold text-slate-200 line-clamp-1">{p.name}</p>
                            <p className="text-xs font-bold text-blue-400 mt-1">{fmt(p.price)}</p>
                            {inCart && <span className="text-[10px] text-blue-300">{inCart.quantity} au panier</span>}
                          </button>
                        );
                      })}
                      {posProducts.length === 0 && <p className="col-span-3 py-8 text-center text-slate-500 text-sm">Aucun produit disponible.</p>}
                    </div>
                  </div>

                  {/* Panier + paiement */}
                  <div className="lg:col-span-2 space-y-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2 mb-3">
                        <ShoppingCart className="w-4 h-4 text-blue-400" /> Panier
                        {posCart.length > 0 && <button onClick={() => setPosCart([])} className="ml-auto text-xs text-slate-500 hover:text-red-400">Vider</button>}
                      </h3>
                      {posCart.length === 0 ? <p className="text-xs text-slate-600 text-center py-4">Aucun article sélectionné</p> : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {posCart.map(it => (
                            <div key={it.id} className="bg-slate-800 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="flex-1 text-xs text-slate-300 truncate">{it.name}</span>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => updatePosQty(it.id,-1)} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                                  <span className="text-xs font-bold text-white w-4 text-center">{it.quantity}</span>
                                  <button onClick={() => updatePosQty(it.id,1)} disabled={it.quantity >= it.stock} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center disabled:opacity-40"><Plus className="w-3 h-3" /></button>
                                </div>
                                <span className="text-xs font-bold text-blue-400 w-20 text-right">{fmt(itemNet(it))}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <LineDiscountControl remise={it.remise} onChange={(r) => setPosLineRemise(it.id, r)} />
                                {itemDiscount(it) > 0 && (
                                  <span className="text-[10px] font-semibold text-red-400 whitespace-nowrap">
                                    remise -{fmt(itemDiscount(it))}{it.remise?.type === 'percent' ? ` (${it.remise.valeur}%)` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Module de Remise */}
                          <div className="flex items-center gap-3 pt-2.5 mt-2 border-t border-slate-800/80">
                            <span className="text-xs font-bold text-slate-400">Remise :</span>
                            <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-850">
                              <button
                                type="button"
                                onClick={() => setPosDiscountType('percent')}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${posDiscountType === 'percent' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-slate-350'}`}
                              >
                                %
                              </button>
                              <button
                                type="button"
                                onClick={() => setPosDiscountType('flat')}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${posDiscountType === 'flat' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-slate-350'}`}
                              >
                                Fixe
                              </button>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max={posDiscountType === 'percent' ? 100 : posSubtotal}
                              value={posDiscountValue || ''}
                              onChange={e => setPosDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                              placeholder={posDiscountType === 'percent' ? 'Ex: 10' : 'Ex: 1000'}
                              className="w-24 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold font-mono text-white focus:outline-none focus:border-blue-500"
                            />
                            {posDiscountType === 'flat' && <span className="text-[10px] font-bold text-slate-500">FCFA</span>}
                          </div>

                          {/* Résumé des totaux */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
                            <div className="flex justify-between font-semibold text-slate-450">
                              <span>Sous-total</span>
                              <span>{fmt(posSubtotal)}</span>
                            </div>
                            {posLineDiscounts > 0 && (
                              <div className="flex justify-between font-semibold text-red-400">
                                <span>Remises articles</span>
                                <span>- {fmt(posLineDiscounts)}</span>
                              </div>
                            )}
                            {posDiscountAmount > 0 && (
                              <div className="flex justify-between font-semibold text-red-400">
                                <span>Remise globale {posDiscountType === 'percent' ? `(${posDiscountValue}%)` : ''}</span>
                                <span>- {fmt(posDiscountAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-sm border-t border-slate-800 pt-1.5 mt-1.5 text-slate-200">
                              <span>Total à payer</span>
                              <span className="text-blue-400">{fmt(posTotalFinal)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Client */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-200 text-sm">Client</h3>
                        <button onClick={() => { setPosClientSearch(''); setShowPosClientPick(true); }}
                          title="Choisir un client déjà enregistré"
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" /> Client enregistré
                        </button>
                      </div>
                      {[{key:'nom', placeholder:'Nom complet *', icon: User},{key:'telephone', placeholder:'Téléphone *', icon: Phone},{key:'adresse', placeholder:'Adresse (optionnel)', icon: MapPin}].map(({key, placeholder, icon: Icon}) => (
                        <div key={key} className="relative">
                          <Icon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                          <input value={posClient[key]} onChange={e => setPosClient(p => ({...p,[key]:e.target.value}))} placeholder={placeholder}
                            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
                        </div>
                      ))}
                    </div>

                    {/* Paiement */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                      <h3 className="font-semibold text-slate-200 text-sm">Mode de paiement</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {['Espèces','Wave','Orange Money','Crédit'].map(m => {
                          const isCreditAndNotVip = m === 'Crédit' && !isVIP;
                          return (
                            <button key={m} type="button" onClick={() => {
                              if (isCreditAndNotVip) {
                                setShowUpgradeModal(true);
                                toast("La gestion des dettes & acomptes est réservée aux abonnements Premium VIP.");
                                return;
                              }
                              setPosPayMethod(m);
                            }}
                              className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1 cursor-pointer ${posPayMethod===m ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'}`}>
                              {m} {isCreditAndNotVip && <span className="text-[9px] text-amber-500">⭐</span>}
                            </button>
                          );
                        })}
                      </div>

                      {posPayMethod === 'Crédit' && isVIP ? (
                        <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2 mt-2">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Acompte initial (FCFA)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={posTotalFinal}
                            value={posAcompte || ''}
                            onChange={e => {
                              const val = Math.min(posTotalFinal, Number(e.target.value) || 0);
                              setPosAcompte(val);
                            }}
                            className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-650 focus:outline-none focus:border-blue-500 font-mono text-right"
                            placeholder="0"
                          />
                          <div className="flex justify-between text-[11px] text-slate-400 font-semibold pt-1">
                            <span>Dette restante :</span>
                            <span className="text-amber-400 font-bold">{fmt(Math.max(0, posTotalFinal - posAcompte))}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {[{v:'Payé',color:'emerald'},{v:'En attente',color:'amber'}].map(({v,color}) => (
                            <button key={v} type="button" onClick={() => setPosPayStatut(v)}
                              className={`py-2 rounded-lg text-xs font-semibold border transition-all ${posPayStatut===v ? `border-${color}-500 bg-${color}-500/10 text-${color}-300` : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                              {v === 'Payé' ? '✓ Payé' : '⏳ En attente'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
 
                    <button onClick={handlePosSell} disabled={!posCart.length || !posClient.nom || !posClient.telephone}
                      className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
                      <Receipt className="w-4 h-4" />
                      Enregistrer la vente{posCart.length > 0 ? ` — ${fmt(posTotalFinal)}` : ''}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── CLIENTS (CRM) ────────────────────────────────────────────── */}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-400" /> Gestion des Clients
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Visualisez, éditez et gérez les profils et les notes de vos clients.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Recherche client */}
                  <div className="relative flex-1 sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom, téléphone..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-white"
                    />
                  </div>
                  <button onClick={() => { setNewClient({ nom: '', telephone: '', adresse: '' }); setShowAddClient(true); }}
                    className="shrink-0 px-3.5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
              </div>

              {/* Contenu principal CRM */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Liste des clients (1/3) */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[520px] overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
                    <span className="text-xs font-bold text-slate-400">Clients ({filteredClients.length})</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Classés par dépenses</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                    {filteredClients.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-xs">Aucun client trouvé.</div>
                    ) : (
                      filteredClients.map(c => {
                        const isSelected = selectedClient?.telephone === c.telephone;
                        const initials = c.nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                        return (
                          <button
                            key={c.telephone}
                            type="button"
                            onClick={() => setSelectedClient(c)}
                            className={`w-full text-left p-3.5 flex items-center gap-3.5 transition-all cursor-pointer ${
                              isSelected ? 'bg-blue-500/10 text-white border-l-2 border-blue-500' : 'hover:bg-slate-800/40 text-slate-350'
                            }`}
                          >
                            {/* Avatar */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                              isSelected ? 'bg-blue-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {initials || '?'}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold truncate text-slate-200">{c.nom}</h4>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{c.telephone}</p>
                              {c.totalDebt > 0 && (
                                <span className="inline-block text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full mt-1">
                                  Dette : {fmt(c.totalDebt)}
                                </span>
                              )}
                            </div>

                            {/* Stats */}
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-slate-200 block font-mono">{fmt(c.totalSpent)}</span>
                              <span className="text-[9px] text-slate-550 font-semibold">{c.orderCount} commande{c.orderCount > 1 ? 's' : ''}</span>
                            </div>
                            {/* Supprimer (masque le client, ses commandes restent) */}
                            <span
                              role="button"
                              title="Supprimer ce client"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Supprimer le client « ${c.nom} » ?${c.orderCount > 0 ? '\n\nSes commandes restent dans l’historique ; seule sa fiche disparaît de la liste.' : ''}`)) {
                                  deleteClient(c);
                                }
                              }}
                              className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Profil détaillé (2/3) */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[520px]">
                  {selectedClient ? (() => {
                    const currentNote = (clientNotes[activeBoutique.id] || {})[selectedClient.telephone] || '';
                    const clientInitials = selectedClient.nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    const clientDebts = activeOrders.filter(o => o.client?.telephone === selectedClient.telephone && (o.paiement?.statut === 'Dette' || o.paiement?.methode === 'Crédit / Dette') && (o.paiement?.detteRestante || 0) > 0);
                    const clientTotalDebt = clientDebts.reduce((sum, o) => sum + (o.paiement.detteRestante || 0), 0);
                    
                    return (
                      <div className="space-y-6 flex-1 flex flex-col justify-between">
                        <div className="space-y-5">
                          {/* Header Profil */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-black shrink-0">
                                {clientInitials || '?'}
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-white">{selectedClient.nom}</h3>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedClient.telephone}</p>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setEditingClient({ 
                                telephone: selectedClient.telephone, 
                                nom: selectedClient.nom, 
                                adresse: selectedClient.adresse 
                              })}
                              className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Éditer coordonnées
                            </button>
                          </div>

                          {/* Alerte dette en cours si VIP */}
                          {isVIP && clientTotalDebt > 0 && (
                            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                                  <AlertTriangle className="w-4 h-4 shrink-0" />
                                  <span>Dette en cours : {fmt(clientTotalDebt)}</span>
                                </div>
                                <span className="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Dette active</span>
                              </div>
                              
                              {/* Liste des factures impayées */}
                              <div className="space-y-2 max-h-40 overflow-y-auto divide-y divide-slate-800/60 pr-1">
                                {clientDebts.map(o => (
                                  <div key={o.id} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-slate-300">{o.id}</span>
                                        <span className="text-[10px] text-slate-500">{new Date(o.date).toLocaleDateString('fr-FR')}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        <span>Total: {fmt(o.total)}</span>
                                        <span className="mx-1.5">·</span>
                                        <span>Déjà payé: {fmt(o.paiement.montantPaye || 0)}</span>
                                        <span className="mx-1.5">·</span>
                                        <span className="text-amber-400 font-bold">Reste: {fmt(o.paiement.detteRestante)}</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPaymentModalOrder(o);
                                        setPaymentModalValue(o.paiement.detteRestante);
                                        setShowPaymentModal(true);
                                      }}
                                      className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                      Encaisser versement
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Coordonnées & Stats */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Informations */}
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Adresse de livraison</h4>
                              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 text-xs text-slate-300 leading-relaxed font-semibold">
                                <MapPin className="w-4 h-4 text-blue-400 inline-block mr-1.5 -mt-0.5" />
                                {selectedClient.adresse}
                              </div>
                            </div>

                            {/* Statistiques rapides */}
                            <div className="grid grid-cols-2 gap-3 self-end">
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                                <span className="text-[9px] font-bold text-slate-500 block">Total Dépensé</span>
                                <span className="text-xs font-black mt-1 block font-mono text-emerald-400 truncate">{fmt(selectedClient.totalSpent)}</span>
                              </div>
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                                <span className="text-[9px] font-bold text-slate-500 block">Panier Moyen</span>
                                <span className="text-xs font-black mt-1 block font-mono text-blue-400 truncate">
                                  {selectedClient.orderCount > 0 ? fmt(Math.round(selectedClient.totalSpent / selectedClient.orderCount)) : fmt(0)}
                                </span>
                              </div>
                            </div>

                          </div>

                          {/* Notes commerçant */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Notes Privées (Avis du vendeur)</label>
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                saveClientNote(selectedClient.telephone, formData.get('note'));
                              }}
                              className="flex gap-2 items-start"
                            >
                              <textarea
                                name="note"
                                defaultValue={currentNote}
                                key={selectedClient.telephone}
                                placeholder="Ajouter des notes privées sur ce client (ex: client fidèle, VIP, adresse difficile, etc.)"
                                className="flex-1 h-14 p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-slate-200 resize-none"
                              />
                              <button
                                type="submit"
                                className="px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-black transition-colors cursor-pointer self-stretch flex items-center justify-center"
                              >
                                Enregistrer
                              </button>
                            </form>
                          </div>
                        </div>

                        {/* Historique des Commandes */}
                        <div className="space-y-2 pt-2 border-t border-slate-800/80">
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Commandes passées ({selectedClient.orders.length})</h4>
                          
                          <div className="max-h-36 overflow-y-auto border border-slate-850 rounded-xl divide-y divide-slate-850">
                            {selectedClient.orders.map(o => (
                              <div key={o.id} className="p-2.5 flex items-center justify-between gap-4 bg-slate-950/30 hover:bg-slate-950/70 transition-colors">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-slate-300">{o.id}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${STATUT_COLORS[o.statut] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                      {o.statut}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-500 mt-1 truncate">
                                    {o.items.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-bold text-slate-200 block font-mono">{fmt(o.total)}</span>
                                  <span className="text-[8px] text-slate-500">{new Date(o.date).toLocaleDateString('fr-FR')}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    );
                  })() : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500 py-20">
                      <User className="w-12 h-12 text-slate-800 mb-3" />
                      <p className="font-bold text-sm text-slate-450">Aucun client sélectionné</p>
                      <p className="text-xs max-w-xs mt-1">Choisissez un client dans la liste de gauche pour voir ses détails, commandes et enregistrer des notes.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal d'édition des coordonnées client */}
              {editingClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
                    <button 
                      type="button"
                      onClick={() => setEditingClient(null)} 
                      className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div>
                      <h3 className="font-bold text-base text-white">Modifier les coordonnées</h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">Ces modifications seront appliquées à toutes les commandes de ce numéro ({editingClient.telephone}).</p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const telFinal = String(editingClient.newTelephone || editingClient.telephone).trim();
                        if (!telFinal) { toast('Le téléphone est obligatoire.'); return; }
                        // Propage nom / adresse / NOUVEAU numéro sur toutes les commandes du client
                        updateClientOrdersInfo(editingClient.telephone, editingClient.nom, editingClient.adresse, telFinal);
                        // Met aussi à jour la fiche manuelle si elle existe
                        const norm = String(editingClient.telephone).replace(/\D/g, '');
                        if ((activeBoutique.clientsManuels || []).some(c => String(c.telephone).replace(/\D/g, '') === norm)) {
                          updateBoutique(activeBoutique.id, {
                            clientsManuels: activeBoutique.clientsManuels.map(c =>
                              String(c.telephone).replace(/\D/g, '') === norm
                                ? { ...c, nom: editingClient.nom, adresse: editingClient.adresse, telephone: telFinal }
                                : c)
                          });
                        }
                        // Update lists/selection locally
                        if (selectedClient && selectedClient.telephone === editingClient.telephone) {
                          setSelectedClient(prev => ({
                            ...prev,
                            nom: editingClient.nom,
                            adresse: editingClient.adresse,
                            telephone: telFinal
                          }));
                        }

                        setEditingClient(null);
                        toast('Coordonnées client mises à jour avec succès.', 'success');
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nom Complet</label>
                        <input
                          type="text"
                          required
                          value={editingClient.nom}
                          onChange={(e) => setEditingClient({ ...editingClient, nom: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Téléphone</label>
                        <input
                          type="tel"
                          required
                          value={editingClient.newTelephone ?? editingClient.telephone}
                          onChange={(e) => setEditingClient({ ...editingClient, newTelephone: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold font-mono focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Adresse de livraison</label>
                        <textarea
                          required
                          value={editingClient.adresse}
                          onChange={(e) => setEditingClient({ ...editingClient, adresse: e.target.value })}
                          className="w-full h-20 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-white resize-none"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingClient(null)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-300 rounded-xl transition-colors cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-black rounded-xl transition-colors cursor-pointer"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS ──────────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              {settingsSaved && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" /> Modifications enregistrées avec succès.
                </div>
              )}

              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                {/* Logo */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-white text-sm">Logo de la boutique</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl overflow-hidden shrink-0">
                      {typeof settingsForm.logo === 'string' && (settingsForm.logo.startsWith('http') || settingsForm.logo.startsWith('data:') || settingsForm.logo.startsWith('/'))
                        ? <img src={settingsForm.logo} alt="Logo" className="w-full h-full object-contain" />
                        : settingsForm.logo}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input type="file" accept="image/*" disabled={logoUploading} onChange={handleLogoUpload}
                        className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 file:cursor-pointer" />
                      {logoUploading
                        ? <span className="block text-xs text-blue-400 animate-pulse">Upload en cours…</span>
                        : <span className="block text-[11px] text-slate-500">Choisissez une image — elle est enregistrée automatiquement (toutes tailles acceptées).</span>}
                      <input type="text" value={settingsForm.logo} onChange={e => setSettingsForm(s => ({...s, logo:e.target.value}))}
                        placeholder="Emoji ou URL image" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Infos de base */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-white text-sm">Informations générales</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {label:'Nom de la boutique', key:'name', type:'text'},
                      {label:'WhatsApp principal (obligatoire)', key:'whatsapp', type:'text'},
                      {label:'2e numéro WhatsApp (optionnel)', key:'whatsapp2', type:'text'},
                      {label:'Adresse physique', key:'adresse', type:'text'},
                      {label:'Email de contact', key:'emailContact', type:'email'},
                      {label:'Instagram (@compte)', key:'instagram', type:'text'},
                      {label:'Facebook', key:'facebook', type:'text'},
                      {label:'TikTok', key:'tiktok', type:'text'},
                    ].map(({label, key, type}) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
                        <input type={type} value={settingsForm[key] || ''} onChange={e => setSettingsForm(s => ({...s,[key]:e.target.value}))}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Description / Slogan</label>
                    <textarea value={settingsForm.description || ''} onChange={e => setSettingsForm(s => ({...s, description:e.target.value}))} rows={2}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Message de remerciement WhatsApp</label>
                    <textarea value={settingsForm.texteRemerciement || ''} onChange={e => setSettingsForm(s => ({...s, texteRemerciement:e.target.value}))} rows={2}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Couleur de marque</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={settingsForm.couleurMarque || '#2563eb'} onChange={e => setSettingsForm(s => ({...s, couleurMarque:e.target.value}))}
                        className="w-10 h-10 bg-transparent border-0 rounded cursor-pointer p-0" />
                      <input type="text" value={settingsForm.couleurMarque || '#2563eb'} onChange={e => setSettingsForm(s => ({...s, couleurMarque:e.target.value}))}
                        className="w-32 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  {['Pro', 'SaaS Pro', 'Premium', 'Premium VIP'].includes(activeBoutique.abonnement?.plan) ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Lien / Code Marchand Wave</label>
                      <input type="text" value={settingsForm.waveMerchantLink || ''} onChange={e => setSettingsForm(s => ({...s, waveMerchantLink:e.target.value}))}
                        placeholder="Ex: M_sn_bbehrkdtxa8W ou https://pay.wave.com/m/M_sn_bbehrkdtxa8W/c/sn/"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors" />
                      <p className="text-[10px] text-slate-500 mt-1">Collez votre code marchand Wave (ex: <code>M_sn_bbehrkdtxa8W</code>) ou le lien de paiement de votre boutique. Les montants de commande seront générés automatiquement avec les frais de 1% inclus.</p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/20 text-xs text-slate-500 flex items-center justify-between">
                      <span>🔒 L'intégration du lien de paiement direct Wave est réservée aux boutiques <strong>Premium</strong>.</span>
                      <button type="button" onClick={() => { setUpgradePayPlan('Premium'); setShowUpgradeModal(true); }} className="text-blue-500 hover:text-blue-400 hover:underline font-bold cursor-pointer transition-colors">Passer au plan Premium →</button>
                    </div>
                  )}
                </div>

                {/* Zones de livraison */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-white text-sm">Zones de livraison</h3>
                  <div className="space-y-3">
                    {(settingsForm.zonesLivraison || []).map((zone, i) => (
                      <div key={zone.id} className="grid grid-cols-12 gap-2 items-center">
                        <input value={zone.label} onChange={e => {
                          const z = [...settingsForm.zonesLivraison];
                          z[i] = {...z[i], label:e.target.value};
                          setSettingsForm(s => ({...s, zonesLivraison:z}));
                        }} placeholder="Nom de la zone" className="col-span-5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
                        <input value={zone.delai||''} onChange={e => {
                          const z = [...settingsForm.zonesLivraison];
                          z[i] = {...z[i], delai:e.target.value};
                          setSettingsForm(s => ({...s, zonesLivraison:z}));
                        }} placeholder="Délai" className="col-span-3 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
                        <input type="number" value={zone.price} onChange={e => {
                          const z = [...settingsForm.zonesLivraison];
                          z[i] = {...z[i], price:Number(e.target.value)};
                          setSettingsForm(s => ({...s, zonesLivraison:z}));
                        }} placeholder="FCFA" className="col-span-3 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono text-right focus:outline-none focus:border-blue-500" />
                        <button type="button" onClick={() => setSettingsForm(s => ({...s, zonesLivraison:s.zonesLivraison.filter((_,idx)=>idx!==i)}))}
                          className="col-span-1 w-8 h-8 rounded-lg bg-red-500/5 text-red-400 hover:bg-red-500/10 flex items-center justify-center">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setSettingsForm(s => ({...s, zonesLivraison:[...(s.zonesLivraison||[]), {id:`z-${Date.now()}`, label:'', price:1000, delai:'Sous 24h'}]}))}
                      className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                      <Plus className="w-4 h-4 stroke-[3]" /> Ajouter une zone
                    </button>
                  </div>
                </div>

                <button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm transition-all">
                  <Save className="w-4 h-4" /> Enregistrer les modifications
                </button>
              </form>

              {/* Forfait */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold text-white text-sm mb-3">Forfait actuel</h3>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-bold text-blue-400">{activeBoutique.abonnement?.plan || 'Découverte'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isFree ? 'Limité à 5 produits. Passez Pro pour débloquer tout.' : 'Accès complet à toutes les fonctionnalités.'}
                    </p>
                  </div>
                  {isFree && (
                    <button onClick={() => { setUpgradePaySuccess(false); setUpgradePayPhone(''); setShowUpgradeModal(true); }}
                      className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs transition-all">
                      Passer Pro
                    </button>
                  )}
                </div>
                {upgradeRequests.filter(r => r.boutiqueId === activeBoutique.id && r.statut === 'En attente').length > 0 && (
                  <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" /> Demande de paiement en attente de validation.
                  </div>
                )}
              </div>

              {/* Outils de simulation locale (sauvegarde/restauration) */}
              {!isConfigured && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-white text-sm">Sauvegarde & Restauration (Simulation Locale)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Vous utilisez actuellement le mode simulation hors-ligne. Vos données sont stockées dans le stockage local de votre navigateur. Si vous changez de navigateur ou effacez vos cookies, vous perdrez vos produits et commandes. Utilisez ces boutons pour exporter et réimporter vos données.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const keys = ['ks_boutiques', 'ks_products', 'ks_orders', 'ks_tickets', 'ks_caissiers', 'ks_depenses'];
                        const data = {};
                        keys.forEach(k => {
                          const val = localStorage.getItem(k);
                          data[k] = val ? JSON.parse(val) : null;
                        });
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `jappandal_sauvegarde_${activeBoutique.slug || 'simulation'}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast('Sauvegarde exportée avec succès !', 'success');
                      }}
                      className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Exporter les données (JSON)
                    </button>
                    <label className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> Importer une sauvegarde
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const parsed = JSON.parse(event.target.result);
                              if (parsed && typeof parsed === 'object') {
                                Object.entries(parsed).forEach(([key, val]) => {
                                  if (val !== null) {
                                    localStorage.setItem(key, JSON.stringify(val));
                                  }
                                });
                                toast('Sauvegarde importée ! Rechargement en cours...', 'success');
                                setTimeout(() => window.location.reload(), 1500);
                              } else {
                                toast('Fichier invalide.', 'error');
                              }
                            } catch {
                              toast('Erreur lors de la lecture du fichier.', 'error');
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CAISSIERS (Pro & Premium VIP) ───────────────────────────── */}
          {activeTab === 'caissiers' && (
            <CaissiersTab
              plan={plan}
              activeBoutique={activeBoutique}
              caissiers={caissiers}
              addCaissier={addCaissier}
              deleteCaissier={deleteCaissier}
            />
          )}

          {/* ── DÉPENSES (Premium VIP uniquement) ─────────────────────────── */}
          {activeTab === 'depenses' && (
            <DepensesTab
              activeBoutique={activeBoutique}
              depenses={depenses}
              addDepense={addDepense}
              deleteDepense={deleteDepense}
              fmt={fmt}
            />
          )}

          {/* ── SUPPORT ───────────────────────────────────────────────────── */}
          {activeTab === 'support' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-4xl">
              {/* Nouveau ticket */}
              <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-white text-sm">Nouveau ticket</h3>
                <form onSubmit={handleTicketSubmit} className="space-y-3">
                  <input value={ticketForm.sujet} onChange={e => setTicketForm(t=>({...t,sujet:e.target.value}))} required
                    placeholder="Sujet du problème"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
                  <textarea value={ticketForm.message} onChange={e => setTicketForm(t=>({...t,message:e.target.value}))} required rows={4}
                    placeholder="Décrivez le problème en détail..."
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none" />
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm transition-all">
                    Envoyer
                  </button>
                </form>
              </div>

              {/* Liste tickets */}
              <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold text-white text-sm mb-4">Mes tickets ({activeTickets.length})</h3>
                {activeTickets.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">Aucun ticket pour le moment.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {activeTickets.map(t => (
                      <div key={t.id} className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-slate-200 text-sm">{t.sujet}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            t.statut==='Résolu' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            t.statut==='En cours' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>{t.statut}</span>
                        </div>
                        <p className="text-xs text-slate-500">{t.message}</p>
                        {t.reponse && (
                          <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                            <p className="text-[10px] font-bold text-blue-400 mb-1">RÉPONSE SUPPORT</p>
                            <p className="text-xs text-slate-300 italic">"{t.reponse}"</p>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-600 mt-2">{new Date(t.date).toLocaleDateString('fr-FR')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── MODAL PRODUIT ─────────────────────────────────────────────────── */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-white">{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {productError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {productError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom du produit *</label>
                <input required value={productForm.name} onChange={e => setProductForm(p=>({...p, name:e.target.value}))}
                  placeholder="Ex: Tunique Ndiakhass"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Code-barres (Optionnel)</label>
                <input value={productForm.codeBarre || ''} onChange={e => setProductForm(p=>({...p, codeBarre:e.target.value}))}
                  placeholder="Scannez ou saisissez le code-barres"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-650 focus:border-blue-500 focus:outline-none transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Prix (FCFA) *</label>
                  <input required type="number" min="0" value={productForm.price} onChange={e => setProductForm(p=>({...p, price:e.target.value}))}
                    placeholder="15000"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Stock {productForm.variantes?.length > 0 ? '(auto)' : '*'}
                  </label>
                  {productForm.variantes?.length > 0 ? (
                    <div className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-400">
                      {productForm.variantes.reduce((s, v) => s + (Number(v.stock) || 0), 0)} (somme des variantes)
                    </div>
                  ) : (
                    <input required type="number" min="0" value={productForm.stock} onChange={e => setProductForm(p=>({...p, stock:e.target.value}))}
                      placeholder="10"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors" />
                  )}
                </div>
              </div>

              {(() => {
                const BASE_CATS = ['Vêtements','Chaussures','Sacs','Accessoires','Lunettes','Encens','Cosmétiques','Électronique','Alimentation','Divers'];
                // Les catégories déjà créées par le marchand apparaissent EN TÊTE de liste
                const ownCats = [...new Set(activeProducts.map(p => (p.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
                const CATS = [...new Set([...ownCats, ...BASE_CATS])];
                const isCustomCat = !CATS.includes(productForm.category); // catégorie personnalisée (ou vide après « Autre »)
                return (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Catégorie</label>
                    <select
                      value={isCustomCat ? '__custom__' : productForm.category}
                      onChange={e => {
                        const v = e.target.value;
                        setProductForm(p => ({ ...p, category: v === '__custom__' ? '' : v }));
                      }}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-blue-500 focus:outline-none">
                      {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__custom__">➕ Autre catégorie…</option>
                    </select>
                    {isCustomCat && (
                      <input
                        type="text"
                        autoFocus
                        value={productForm.category}
                        onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))}
                        placeholder="Saisir votre catégorie (ex : Tissus, Bijoux, Parfums…)"
                        className="mt-2 w-full px-4 py-2.5 bg-slate-800 border border-blue-500/50 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none" />
                    )}
                  </div>
                );
              })()}

              {/* Photos (max 5) */}
              <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-400">
                    Photos du produit <span className="text-slate-500">({(productForm.photos||[]).length}/5)</span>
                  </label>
                  {(productForm.photos||[]).length > 0 && (
                    <span className="text-[10px] text-slate-500">1ʳᵉ photo = photo principale</span>
                  )}
                </div>

                {/* Grille d'aperçus */}
                {(productForm.photos||[]).length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {(productForm.photos||[]).map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={thumb(url, 300)} onError={fallbackSrc(url)} alt={`Photo ${idx+1}`} loading="lazy"
                          className={`w-full aspect-square object-cover rounded-lg border-2 transition-all ${idx===0 ? 'border-blue-500' : 'border-slate-700'}`} />
                        {/* Badge "principale" */}
                        {idx === 0 && (
                          <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold bg-blue-500 text-slate-950 py-0.5 rounded-b-lg">
                            Principale
                          </span>
                        )}
                        {/* Actions au survol */}
                        <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {idx !== 0 && (
                            <button type="button" onClick={() => movePhotoFirst(idx)}
                              title="Mettre en principale"
                              className="w-6 h-6 bg-blue-500 text-slate-950 rounded-full flex items-center justify-center text-[9px] font-bold">
                              1
                            </button>
                          )}
                          <button type="button" onClick={() => removePhoto(idx)}
                            className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Slots vides + uploading */}
                    {photosUploading.map(i => (
                      <div key={`up-${i}`} className="aspect-square rounded-lg bg-slate-700 border-2 border-slate-600 flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Bouton ajouter */}
                {(productForm.photos||[]).length < 5 && photosUploading.length === 0 && (
                  <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 transition-all text-sm font-medium">
                    <Plus className="w-4 h-4 stroke-[3]" />
                    {(productForm.photos||[]).length === 0 ? 'Ajouter des photos (max 5)' : `Ajouter encore ${5-(productForm.photos||[]).length} photo(s)`}
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={handlePhotoUpload} />
                  </label>
                )}

                {(productForm.photos||[]).length >= 5 && (
                  <p className="text-xs text-amber-400 text-center">Maximum de 5 photos atteint.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                <textarea value={productForm.description} onChange={e => setProductForm(p=>({...p, description:e.target.value}))} rows={3}
                  placeholder="Couleurs, tailles, matière..."
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none resize-none" />
              </div>

              {/* Variantes (parfums, couleurs, modèles...) */}
              <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-400">Variantes / Choix (parfums, couleurs...)</label>
                  <span className="text-[10px] text-slate-500">Optionnel</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Ajoutez des options que le client pourra choisir (ex: Vanille, Musc, Ambre...), chacune avec sa propre image.
                </p>

                {(productForm.variantes || []).map((v, i) => (
                  <div key={v.id} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2 border border-slate-700">
                    {/* Aperçu image */}
                    <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {variantUploading === i
                        ? <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        : v.photo
                          ? <img src={thumb(v.photo, 200)} onError={fallbackSrc(v.photo)} alt={v.nom} loading="lazy" className="w-full h-full object-cover" />
                          : <span className="text-slate-500 text-[9px]">photo</span>}
                    </div>
                    {/* Nom + stock + upload */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex gap-1.5">
                        <input value={v.nom} onChange={e => updateVariantName(i, e.target.value)}
                          placeholder="Nom (ex: Vanille)"
                          className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none" />
                        <input type="number" min="0" value={v.stock} onChange={e => updateVariantStock(i, e.target.value)}
                          placeholder="Stock"
                          className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 text-center focus:border-blue-500 focus:outline-none" />
                      </div>
                      <input type="file" accept="image/*" onChange={e => handleVariantPhoto(i, e)}
                        className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-500/10 file:text-blue-400 file:cursor-pointer" />
                    </div>
                    <button type="button" onClick={() => removeVariant(i)}
                      className="w-7 h-7 rounded-lg bg-red-500/5 text-red-400 hover:bg-red-500/10 flex items-center justify-center shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button type="button" onClick={addVariant}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <Plus className="w-3.5 h-3.5 stroke-[3]" /> Ajouter une variante
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 font-medium text-sm transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={productSaving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2">
                  {productSaving ? <><span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />Enregistrement...</>
                    : editingProduct ? 'Mettre à jour' : 'Ajouter le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL PARTAGE ─────────────────────────────────────────────────── */}
      {showShareModal && activeBoutique && (() => {
        const shopUrl = buildShopUrl(activeBoutique);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Partager ma boutique</h3>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {shareQr && (
                <div className="flex justify-center">
                  <img src={shareQr} alt="QR code de la boutique" className="w-48 h-48 rounded-xl" />
                </div>
              )}
              <p className="text-center text-xs text-slate-500">Scannez le QR code ou partagez le lien :</p>

              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
                <span className="flex-1 text-xs text-slate-300 font-mono truncate">{shopUrl}</span>
                <button
                  onClick={() => { navigator.clipboard?.writeText(shopUrl); toast('Lien copié !', 'success'); }}
                  className="shrink-0 text-xs font-bold text-blue-400 hover:text-blue-300">Copier</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Découvrez ma boutique ${activeBoutique.name} : ${shopUrl}`)}`}
                  target="_blank" rel="noreferrer"
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm text-center transition-colors">
                  WhatsApp
                </a>
                <button
                  onClick={async () => {
                    if (navigator.share) { try { await navigator.share({ title: activeBoutique.name, url: shopUrl }); } catch { /* annulé */ } }
                    else { navigator.clipboard?.writeText(shopUrl); toast('Lien copié !', 'success'); }
                  }}
                  className="py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-colors">
                  Partager…
                </button>
              </div>

              {/* Carte de visite professionnelle (SaaS Pro / Premium VIP) */}
              {(isPro || isVIP) ? (
                <button onClick={openCarteVisite} disabled={carteBusy}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-400/10 border border-amber-400/30 text-amber-300 font-bold text-sm transition-all hover:border-amber-400/60 flex items-center justify-center gap-2">
                  {carteBusy
                    ? <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    : <CreditCard className="w-4 h-4" />}
                  Ma carte de visite (QR)
                </button>
              ) : (
                <button onClick={() => { setShowShareModal(false); setShowUpgradeModal(true); }}
                  className="w-full py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-500 font-bold text-sm flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" /> Carte de visite — dès SaaS Pro
                </button>
              )}

              {shareQr && (
                <a href={shareQr} download={`qr-${activeBoutique.slug}.png`}
                  className="block text-center text-xs font-semibold text-blue-400 hover:text-blue-300">
                  ⬇ Télécharger le QR code
                </a>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── MODAL UPGRADE ─────────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5">
            {!upgradePaySuccess ? (
              <>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white">Passer au forfait supérieur</h3>
                  <p className="text-xs text-slate-500 mt-1">Déverrouillez produits illimités, statistiques et factures PDF.</p>
                </div>

                <form onSubmit={handleUpgradeSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[{p:'Pro', price:'5 000'},{p:'Premium', price:'10 000'}].map(({p, price}) => (
                      <button key={p} type="button" onClick={() => setUpgradePayPlan(p)}
                        className={`p-3 rounded-xl border text-center transition-all ${upgradePayPlan===p ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'}`}>
                        <p className="font-bold text-sm">{p}</p>
                        <p className="text-xs opacity-70">{price} FCFA/m</p>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Wave','Orange Money'].map(m => (
                      <button key={m} type="button" onClick={() => setUpgradePayMethod(m)}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all ${upgradePayMethod===m ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <input required value={upgradePayPhone} onChange={e => setUpgradePayPhone(e.target.value)}
                    placeholder="Numéro Mobile Money"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none font-mono" />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowUpgradeModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-medium">Annuler</button>
                    <button type="submit" disabled={upgradePayLoading}
                      className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2">
                      {upgradePayLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />...</> : 'Payer'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white">Demande envoyée !</h3>
                <p className="text-xs text-slate-400">Votre demande de passage au forfait <strong>{upgradePayPlan}</strong> a été transmise à l'administrateur. Validation sous 24h.</p>
                <button onClick={() => setShowUpgradeModal(false)}
                  className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm">
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL ENCAISSER VERSEMENT DETTE ─────────────────────────────── */}
      {showPaymentModal && paymentModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white">Encaisser un versement</h3>
              <p className="text-xs text-slate-400 mt-1">
                Client : <strong className="text-slate-200">{paymentModalOrder.client?.nom}</strong>
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Commande ID : {paymentModalOrder.id}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Montant total commande :</span>
                <span className="font-mono font-bold text-white">{fmt(paymentModalOrder.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Déjà réglé (acomptes) :</span>
                <span className="font-mono font-bold text-slate-400">{fmt(paymentModalOrder.paiement?.montantPaye || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-1.5 font-semibold text-amber-400">
                <span>Reste à payer (Dette) :</span>
                <span className="font-mono font-bold">{fmt(paymentModalOrder.paiement?.detteRestante)}</span>
              </div>
            </div>

            <form onSubmit={handleCollectPayment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Montant du versement (FCFA)</label>
                <input
                  required
                  type="number"
                  min="1"
                  max={paymentModalOrder.paiement?.detteRestante}
                  value={paymentModalValue}
                  onChange={e => setPaymentModalValue(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowPaymentModal(false); setPaymentModalOrder(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold transition-colors hover:bg-slate-800/40"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors"
                >
                  Encaisser
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL FACTURE ─────────────────────────────────────────────────── */}
      {activePrintInvoice && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4">
            {/* Barre d'actions — responsive mobile */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <span className="font-bold text-slate-800 text-sm">Facture / Reçu</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => generatePDF('download')} disabled={pdfLoading}
                    title="Télécharger la facture PDF"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs transition-all">
                    {pdfLoading
                      ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> PDF...</>
                      : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Télécharger</>}
                  </button>
                  <button onClick={() => generatePDF('share')} disabled={pdfLoading}
                    title="Partager la facture PDF (WhatsApp…)"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-xs transition-all">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg> Partager
                  </button>
                  <button onClick={() => setActivePrintInvoice(null)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-100 transition-all">
                    <X className="w-3.5 h-3.5" /> Fermer
                  </button>
                </div>
              </div>

              {/* Choix du format à télécharger / partager */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] font-semibold text-slate-500">Format :</span>
                <div className="inline-flex rounded-lg bg-slate-200 p-0.5">
                  {[['ticket', 'Ticket de caisse'], ['a5', 'Page A5']].map(([val, label]) => (
                    <button key={val} onClick={() => setInvoiceFormat(val)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        invoiceFormat === val ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Aperçu — format ticket de caisse */}
            <div className="bg-slate-100 px-4 py-5 flex justify-center">
              <div ref={invoiceRef} className="bg-invoice-paper w-full max-w-[300px] px-5 py-6 text-slate-900" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                {/* En-tête centré */}
                <div className="text-center">
                  {activeBoutique.logo && typeof activeBoutique.logo === 'string' && (activeBoutique.logo.startsWith('http') || activeBoutique.logo.startsWith('data:') || activeBoutique.logo.startsWith('/')) ? (
                    <img src={proxiedImg(activeBoutique.logo)} alt="Logo" className="w-14 h-14 object-contain mx-auto mb-2" crossOrigin="anonymous" />
                  ) : (
                    <div className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: activeBoutique.couleurMarque || '#2563eb' }}>
                      {String(activeBoutique.name || 'B').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                  )}
                  <h1 className="text-base font-black uppercase leading-tight">{activeBoutique.name}</h1>
                  {activeBoutique.adresse && <p className="text-[11px] text-slate-500">{activeBoutique.adresse}</p>}
                  {activeBoutique.whatsapp && <p className="text-[11px] text-slate-500">{activeBoutique.whatsapp}</p>}
                </div>

                <div className="border-t border-dashed border-slate-300 my-3" />

                <div className="text-center">
                  <p className="font-bold tracking-wide text-sm">FACTURE</p>
                  <p className="text-[11px] text-slate-500">N° {activePrintInvoice.id}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(activePrintInvoice.date).toLocaleDateString('fr-FR')} · {new Date(activePrintInvoice.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="border-t border-dashed border-slate-300 my-3" />

                {/* Client */}
                <div className="text-[12px] leading-snug">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client</p>
                  <p className="font-bold">{activePrintInvoice.client.nom}</p>
                  {activePrintInvoice.client.telephone && <p className="text-slate-600">{activePrintInvoice.client.telephone}</p>}
                  {activePrintInvoice.client.adresse && <p className="text-slate-600">{activePrintInvoice.client.adresse}</p>}
                </div>

                <div className="border-t border-dashed border-slate-300 my-3" />

                {/* Articles */}
                <div className="space-y-2">
                  {activePrintInvoice.items.map((it, i) => (
                    <div key={i} className="text-[12px]">
                      <p className="font-bold leading-tight">{it.name}</p>
                      <div className="flex justify-between text-slate-600">
                        <span>{it.quantity} × {fmt(it.price)}{itemDiscount(it) > 0 && <span className="text-red-500"> · remise {it.remise.type === 'percent' ? `-${it.remise.valeur}%` : `-${fmt(itemDiscount(it))}`}</span>}</span>
                        <span className="font-bold text-slate-900">{fmt(itemNet(it))}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-300 my-3" />

                {/* Totaux */}
                <div className="text-[12px] space-y-1">
                  <div className="flex justify-between text-slate-500"><span>Sous-total</span><span>{fmt(cartNet(activePrintInvoice.items))}</span></div>
                  {activePrintInvoice.remise?.montant > 0 && (
                    <div className="flex justify-between text-red-500"><span>Remise globale{activePrintInvoice.remise.type === 'percent' ? ` (${activePrintInvoice.remise.valeur}%)` : ''}</span><span>- {fmt(activePrintInvoice.remise.montant)}</span></div>
                  )}
                  <div className="flex justify-between text-slate-500"><span>Livraison</span><span>{fmt(activePrintInvoice.livraison.frais)}</span></div>
                </div>
                <div className="border-t-2 border-slate-900 mt-2 pt-2 flex justify-between items-center">
                  <span className="font-black text-sm">TOTAL</span>
                  <span className="font-black text-base" style={{ color: '#2563eb' }}>{fmt(activePrintInvoice.total)}</span>
                </div>

                <p className="text-center text-[11px] text-slate-500 mt-3">
                  Paiement : {activePrintInvoice.paiement?.methode || 'À la livraison'} — {activePrintInvoice.paiement?.statut || 'En attente'}
                </p>

                <div className="border-t border-dashed border-slate-300 my-3" />

                <p className="text-center text-[11px] font-semibold text-slate-600">Merci pour votre achat !</p>
                <p className="text-center text-[10px] text-slate-400">{activeBoutique.name} · Propulsé par Jappandal Tech</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ÉDITION COMMANDE ────────────────────────────────────────── */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="font-bold text-white">Modifier la commande</h3>
                <p className="text-xs text-slate-500 font-mono">{editingOrder.id}</p>
              </div>
              <button onClick={() => setEditingOrder(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Articles */}
              <div className="space-y-2">
                {editItems.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Aucun article. Ajoutez-en ci-dessous.</p>}
                {editItems.map((it, idx) => (
                  <div key={idx} className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{it.name}</p>
                        <p className="text-xs text-slate-500">{fmt(it.price)} / unité</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => editChangeQty(idx, -1)} className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="text-sm font-bold text-white w-6 text-center">{it.quantity}</span>
                        <button onClick={() => editChangeQty(idx, 1)} className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                      <span className="text-sm font-bold text-blue-400 w-20 text-right shrink-0">{fmt(itemNet(it))}</span>
                      <button onClick={() => editRemoveItem(idx)} className="w-7 h-7 rounded-lg bg-red-500/5 text-red-400 hover:bg-red-500/10 flex items-center justify-center shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <LineDiscountControl remise={it.remise} onChange={(r) => editSetLineRemise(idx, r)} />
                      {itemDiscount(it) > 0 && (
                        <span className="text-[11px] font-semibold text-red-400 whitespace-nowrap">
                          remise -{fmt(itemDiscount(it))}{it.remise?.type === 'percent' ? ` (${it.remise.valeur}%)` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ajouter un produit */}
              <div className="border-t border-slate-800 pt-4">
                <label className="block text-xs font-medium text-slate-400 mb-2">Ajouter un produit</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input value={editAddSearch} onChange={e => setEditAddSearch(e.target.value)}
                    placeholder="Rechercher dans le catalogue..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
                </div>
                {editAddSearch && (
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {activeProducts.filter(p => p.name.toLowerCase().includes(editAddSearch.toLowerCase())).slice(0, 6).map(p => (
                      <button key={p.id} onClick={() => editAddProduct(p)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-left transition-colors">
                        <img src={thumb(p.photo, 100)} onError={fallbackSrc(p.photo)} alt={p.name} loading="lazy" className="w-8 h-8 rounded object-cover bg-slate-700 shrink-0" />
                        <span className="flex-1 text-xs text-slate-200 truncate">{p.name}</span>
                        <span className="text-xs font-bold text-blue-400">{fmt(p.price)}</span>
                        <Plus className="w-4 h-4 text-blue-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Note */}
              <p className="text-[11px] text-slate-500 bg-slate-800/50 rounded-lg p-2.5">
                Les stocks seront automatiquement réajustés selon les changements (ajouts déduits, retraits restaurés).
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 shrink-0">
              {/* Remise globale */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-slate-400 shrink-0">Remise globale :</span>
                <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-700 shrink-0">
                  <button type="button" onClick={() => setEditDiscountType('percent')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${editDiscountType === 'percent' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>%</button>
                  <button type="button" onClick={() => setEditDiscountType('flat')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${editDiscountType === 'flat' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>Fixe</button>
                </div>
                <input type="number" min="0" max={editDiscountType === 'percent' ? 100 : editNetSubtotal}
                  value={editDiscountValue || ''} onChange={e => setEditDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                  placeholder={editDiscountType === 'percent' ? 'Ex: 10' : 'Ex: 1000'}
                  className="w-24 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold font-mono text-white focus:outline-none focus:border-blue-500" />
              </div>

              {/* Récapitulatif */}
              <div className="space-y-1 text-xs mb-3">
                <div className="flex justify-between text-slate-400"><span>Sous-total</span><span>{fmt(editGross)}</span></div>
                {editLineDiscounts > 0 && (
                  <div className="flex justify-between text-red-400"><span>Remises articles</span><span>- {fmt(editLineDiscounts)}</span></div>
                )}
                {editGlobalDiscount > 0 && (
                  <div className="flex justify-between text-red-400"><span>Remise globale {editDiscountType === 'percent' ? `(${editDiscountValue}%)` : ''}</span><span>- {fmt(editGlobalDiscount)}</span></div>
                )}
                <div className="flex justify-between items-center font-bold text-sm text-white border-t border-slate-800 pt-1.5 mt-1.5">
                  <span>Nouveau total</span><span className="text-blue-400">{fmt(editTotal)}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditingOrder(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-medium text-sm transition-colors">Fermer</button>
                <button onClick={saveEditOrder}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Enregistrer
                </button>
              </div>
              {editingOrder.statut !== 'Annulée' && editingOrder.statut !== 'Attente Annulation' && (
                <button onClick={() => {
                  if (merchantUser?.role === 'caissier') {
                    if (window.confirm(`Demander l'annulation de la commande ${editingOrder.id} ?`)) {
                      updateOrderStatus(editingOrder.id, 'Attente Annulation');
                      toast("Demande d'annulation envoyée.", 'info');
                      setEditingOrder(null);
                    }
                  } else {
                    if (window.confirm(`Annuler la commande ${editingOrder.id} ?`)) {
                      cancelOrder(editingOrder.id);
                      setEditingOrder(null);
                    }
                  }
                }}
                  className="w-full mt-2 py-2.5 rounded-xl bg-red-500/5 text-red-400 border border-red-500/20 hover:bg-red-500/10 font-bold text-sm transition-all flex items-center justify-center gap-2">
                  <X className="w-4 h-4" /> {merchantUser?.role === 'caissier' ? "Demander l'annulation" : "Annuler cette commande (rembourse le stock)"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CARTE DE VISITE ─────────────────────────────────────────── */}
      {carteOpen && carteUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setCarteOpen(false)}>
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber-400" /> Ma carte de visite</h3>
              <button onClick={() => setCarteOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <img src={carteUrl} alt="Carte de visite" className="w-full rounded-xl shadow-2xl" />
            <p className="text-[11px] text-slate-500 text-center mt-3">
              Partagez-la sur WhatsApp, mettez-la en photo de statut, ou imprimez-la au format carte bancaire (8,5 × 5,4 cm).
            </p>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button onClick={downloadCarte}
                className="py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs transition-colors">
                Télécharger
              </button>
              <button onClick={shareCarte}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors">
                WhatsApp…
              </button>
              <button onClick={printCarte}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5">
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AJOUTER UN CLIENT ───────────────────────────────────────── */}
      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddClient(false)}>
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2"><User className="w-4 h-4 text-blue-400" /> Ajouter un client</h3>
              <button onClick={() => setShowAddClient(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (addClientManuel(newClient)) setShowAddClient(false); }} className="space-y-3">
              <input required value={newClient.nom} onChange={e => setNewClient(c => ({ ...c, nom: e.target.value }))} placeholder="Nom complet *"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none" />
              <input required value={newClient.telephone} onChange={e => setNewClient(c => ({ ...c, telephone: e.target.value }))} placeholder="Téléphone *"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 font-mono focus:border-blue-500 focus:outline-none" />
              <input value={newClient.adresse} onChange={e => setNewClient(c => ({ ...c, adresse: e.target.value }))} placeholder="Adresse (optionnel)"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none" />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAddClient(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-colors">Annuler</button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm transition-all">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CHOISIR UN CLIENT (caisse) ──────────────────────────────── */}
      {showPosClientPick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPosClientPick(false)}>
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white flex items-center gap-2"><User className="w-4 h-4 text-blue-400" /> Choisir un client</h3>
              <button onClick={() => setShowPosClientPick(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input autoFocus value={posClientSearch} onChange={e => setPosClientSearch(e.target.value)} placeholder="Nom ou téléphone…"
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="overflow-y-auto space-y-1.5 flex-1">
              {clientsList
                .filter(c => {
                  const q = posClientSearch.toLowerCase();
                  return !q || (c.nom || '').toLowerCase().includes(q) || (c.telephone || '').includes(q);
                })
                .slice(0, 50)
                .map(c => (
                  <button key={c.telephone}
                    onClick={() => {
                      setPosClient({ nom: c.nom, telephone: c.telephone, adresse: c.adresse === "Pas d'adresse renseignée" ? '' : (c.adresse || '') });
                      setShowPosClientPick(false);
                      toast(`Client « ${c.nom} » sélectionné ✓`, 'success');
                    }}
                    className="w-full text-left p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 flex items-center gap-3 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-black shrink-0">
                      {String(c.nom || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-200 truncate">{c.nom}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{c.telephone}</p>
                    </div>
                    {c.orderCount > 0 && <span className="text-[10px] text-slate-500 shrink-0">{c.orderCount} cmd</span>}
                  </button>
                ))}
              {clientsList.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6">Aucun client enregistré pour le moment.<br />Ajoutez-en depuis l'onglet Clients.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CaissiersTab({ plan, activeBoutique, caissiers, addCaissier, deleteCaissier }) {
  const [showModal, setShowModal] = useState(false);
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastCreated, setLastCreated] = useState(null); // identifiants à partager

  const shopCaissiers = caissiers.filter(c => c.boutiqueId === activeBoutique.id);
  const limit = (plan === 'Pro' || plan === 'SaaS Pro') ? 1 : (plan === 'Premium VIP' || plan === 'Premium') ? Infinity : 0;
  const isLimitReached = shopCaissiers.length >= limit;

  const openModal = () => {
    if (isLimitReached) {
      toast(limit === 1
        ? 'Le forfait SaaS Pro est limité à 1 caissier. Passez au Premium VIP pour en ajouter plusieurs.'
        : 'Limite de caissiers atteinte pour votre forfait.');
      return;
    }
    setNom(''); setEmail(''); setPassword(''); setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!nom.trim() || !email.trim() || !password.trim()) { setError('Tous les champs sont obligatoires.'); return; }
    if (password.trim().length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setLoading(true);
    try {
      const created = await addCaissier({
        nom: nom.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        boutiqueId: activeBoutique.id
      });
      setLastCreated({ nom: created.nom, email: created.email, password: password.trim() });
      setShowModal(false);
      toast(`Caissier « ${created.nom} » créé ✓`, 'success');
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du caissier.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* En-tête + bouton Nouveau caissier */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Caissiers</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {limit === Infinity
              ? `${shopCaissiers.length} compte(s) — illimité avec Premium VIP`
              : `${shopCaissiers.length}/${limit} compte inclus dans votre forfait`}
            {' · '}accès Caisse + Commandes uniquement, annulation soumise à votre accord.
          </p>
        </div>
        <button onClick={openModal}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            isLimitReached
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-400 text-slate-950'
          }`}>
          <Plus className="w-4 h-4" /> Nouveau caissier
        </button>
      </div>

      {/* Identifiants du dernier caissier créé (à transmettre) */}
      {lastCreated && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm">
              <p className="font-bold text-emerald-300">Identifiants à transmettre à {lastCreated.nom} :</p>
              <p className="text-slate-300 mt-1 font-mono text-xs">E-mail : {lastCreated.email}</p>
              <p className="text-slate-300 font-mono text-xs">Mot de passe : {lastCreated.password}</p>
              <p className="text-[11px] text-slate-500 mt-1.5">Connexion sur jappandal.com → « Accès Marchand » avec ces identifiants.</p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => { try { navigator.clipboard?.writeText(`Connexion caissier — ${activeBoutique.name}\nLien : ${window.location.origin}/marchand\nE-mail : ${lastCreated.email}\nMot de passe : ${lastCreated.password}`); toast('Identifiants copiés ✓', 'success'); } catch { /* */ } }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors">
                Copier
              </button>
              <button onClick={() => setLastCreated(null)} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white border border-slate-700">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des caissiers */}
      {shopCaissiers.length === 0 ? (
        <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl py-14 text-center">
          <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">Aucun caissier pour cette boutique</p>
          <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
            Créez un compte caissier : il pourra encaisser les ventes et gérer les commandes,
            sans accès à vos produits, réglages ou statistiques.
          </p>
          <button onClick={openModal}
            className="mt-4 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-500 hover:bg-blue-400 text-slate-950 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouveau caissier
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {shopCaissiers.map(c => (
            <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                {String(c.nom || 'C').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-200 truncate">{c.nom}</p>
                <p className="text-xs text-slate-500 truncate font-mono">{c.email}</p>
                {c.dateCreation && <p className="text-[10px] text-slate-600 mt-0.5">Créé le {new Date(c.dateCreation).toLocaleDateString('fr-FR')}</p>}
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Actif</span>
              <button
                onClick={() => {
                  if (confirm(`Retirer le caissier « ${c.nom} » ?\n\nIl ne pourra plus accéder à la caisse de votre boutique.`)) {
                    deleteCaissier(c.id);
                    toast(`Caissier « ${c.nom} » retiré.`, 'success');
                  }
                }}
                title="Retirer ce caissier"
                className="shrink-0 px-2.5 py-2 rounded-lg bg-red-500/5 text-red-400 border border-red-500/10 hover:bg-red-500 hover:text-slate-950 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nouveau caissier */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !loading && setShowModal(false)}>
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Nouveau caissier</h3>
              <button onClick={() => !loading && setShowModal(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom complet</label>
                <input required value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex : Caisse 1 — Awa"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">E-mail de connexion</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="caisse1@maboutique.sn"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Mot de passe (min. 6 caractères)</label>
                <input required type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 font-mono focus:border-blue-500 focus:outline-none" />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Le caissier n'aura accès qu'à la <b className="text-slate-300">Caisse</b> et aux <b className="text-slate-300">Commandes</b>.
                Toute annulation devra être approuvée par vous.
              </p>
              <div className="flex gap-2 pt-1">
                <button type="button" disabled={loading} onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-colors">Annuler</button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2">
                  {loading ? <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


function DepensesTab({ activeBoutique, depenses, addDepense, deleteDepense, fmt }) {
  const [motif, setMotif] = useState('');
  const [montant, setMontant] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shopDepenses = depenses
    .filter(d => d.boutiqueId === activeBoutique.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const total = shopDepenses.reduce((acc, d) => acc + Number(d.montant || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (Number(montant) <= 0) {
      setError("Le montant doit être supérieur à 0.");
      setLoading(false);
      return;
    }

    try {
      await addDepense({
        motif: motif.trim(),
        montant: Number(montant),
        date,
        notes: notes.trim(),
        boutiqueId: activeBoutique.id
      });
      setMotif('');
      setMontant('');
      setNotes('');
      toast('Dépense enregistrée avec succès !', 'success');
    } catch (err) {
      setError(err.message || "Une erreur est survenue lors de l'ajout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-6xl">
      {/* Formulaire d'ajout */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-5 h-5 text-red-400" />
          <h3 className="font-bold text-white text-base">Nouvelle Dépense</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Motif / Description *</label>
            <input
              required
              type="text"
              value={motif}
              onChange={e => setMotif(e.target.value)}
              placeholder="Ex: Achat emballages, Facture électricité"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Montant ({activeBoutique?.devise || 'FCFA'}) *</label>
              <input
                required
                type="number"
                min="1"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="5000"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Date *</label>
              <input
                required
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-blue-500 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes additionnelles (Optionnel)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Détails facultatifs sur la dépense..."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer la Dépense'
            )}
          </button>
        </form>
      </div>

      {/* Historique des dépenses */}
      <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-white text-base">Historique des Dépenses</h3>
            <p className="text-xs text-slate-500 mt-0.5">Total cumulé : <span className="font-bold text-red-400 font-mono">{fmt(total)}</span></p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-full font-mono">
            {shopDepenses.length}
          </span>
        </div>

        {shopDepenses.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
            <TrendingDown className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Aucune dépense enregistrée pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase font-bold">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Motif</th>
                  <th className="py-2.5 text-right">Montant</th>
                  <th className="py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {shopDepenses.map(d => (
                  <tr key={d.id} className="hover:bg-slate-850/20 group">
                    <td className="py-3 text-xs text-slate-500 font-mono">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 text-slate-200">
                      <div className="font-medium">{d.motif}</div>
                      {d.notes && <div className="text-[10px] text-slate-500 mt-0.5">{d.notes}</div>}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-red-400">{fmt(d.montant)}</td>
                    <td className="py-3 text-center">
                      <button
                        onClick={async () => {
                          if (window.confirm("Voulez-vous vraiment supprimer cette dépense ?")) {
                            try {
                              await deleteDepense(d.id);
                              toast('Dépense supprimée.', 'success');
                            } catch (e) {
                              toast(e.message);
                            }
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                        title="Supprimer la dépense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

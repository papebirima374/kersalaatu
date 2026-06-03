import { toast } from '../../components/toast';
import QRCode from 'qrcode';
import { unlockAudio, playOrderSound, requestNotifPermission, showOrderNotification } from '../../notify';
import React, { useState, useRef } from 'react';
import { useTenant } from '../../context/TenantContext';
import { Link } from 'react-router-dom';
import { isConfigured } from '../../firebase/config';
import {
  LayoutDashboard, ShoppingBag, ClipboardList, Settings, LogOut,
  Plus, Trash2, Edit3, Check, Clock, AlertTriangle, DollarSign,
  TrendingUp, Store, ExternalLink, Save, MessageSquare, Printer,
  Lock, ShoppingCart, Minus, User, Phone, MapPin, Receipt, Search,
  X, ChevronDown, Package, Zap
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

const STATUT_COLORS = {
  Reçue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Préparée:'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Livrée:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Payée:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Annulée: 'bg-red-500/10 text-red-400 border-red-500/20',
};

// ─── Auth Shell ──────────────────────────────────────────────────────────────
export default function MerchantConsole() {
  const { merchantUser, authReady, dataReady, loginMerchant, signupMerchant, resetMerchantPassword } = useTenant();

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!merchantUser) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
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

  return <MerchantDashboard />;
}

// ─── Dashboard Principal ─────────────────────────────────────────────────────
function MerchantDashboard() {
  const {
    boutiques, products, orders, tickets,
    currentMerchantBoutiqueId, setCurrentMerchantBoutiqueId,
    merchantUser, logoutMerchant,
    updateBoutique, addProduct, updateProduct, deleteProduct,
    updateOrder, cancelOrder, updateOrderStatus, updateOrderPaymentStatus,
    addTicket, getProductsByBoutique, getOrdersByBoutique,
    uploadBoutiqueLogo, uploadProductPhoto,
    upgradeRequests, createUpgradeRequest, createOrder
  } = useTenant();

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'dashboard';
    }
    return 'dashboard';
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
  const [posSaleSuccess, setPosSaleSuccess] = useState(null);

  // Boutiques du marchand
  const myBoutiques = React.useMemo(() => {
    if (!merchantUser) return [];
    if (!isConfigured) return boutiques;
    return boutiques.filter(b => b.ownerUid === merchantUser.uid || b.ownerEmail === merchantUser.email);
  }, [boutiques, merchantUser]);

  const activeBoutique = myBoutiques.find(b => b.id === currentMerchantBoutiqueId) || myBoutiques[0] || null;

  const activeProducts = activeBoutique ? getProductsByBoutique(activeBoutique.id) : [];
  const activeOrders   = activeBoutique ? getOrdersByBoutique(activeBoutique.id) : [];
  const activeTickets  = tickets.filter(t => t.boutiqueId === activeBoutique?.id);

  // Stats
  const completedOrders = activeOrders.filter(o => o.statut === 'Payée' || o.statut === 'Livrée');
  const totalRevenue    = completedOrders.reduce((s, o) => s + o.total, 0);
  const pendingOrders   = activeOrders.filter(o => o.statut === 'Reçue' || o.statut === 'Préparée').length;
  const lowStock        = activeProducts.filter(p => p.stock <= 3).length;
  const outOfStock      = activeProducts.filter(p => p.actif && p.stock === 0);
  const lowStockList    = activeProducts.filter(p => p.actif && p.stock > 0 && p.stock <= 3);

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
  const [productPhotoFile, setProductPhotoFile]   = useState(null);
  const [photosUploading, setPhotosUploading]     = useState([]); // indices en cours d'upload
  const [productForm, setProductForm]             = useState({
    name:'', price:'', stock:'', category:'Vêtements', photo:'', photos:[], description:''
  });

  // Settings
  const [settingsForm, setSettingsForm] = useState({
    name: activeBoutique?.name || '',
    description: activeBoutique?.description || '',
    whatsapp: activeBoutique?.whatsapp || '',
    couleurMarque: activeBoutique?.couleurMarque || '#2563eb',
    logo: activeBoutique?.logo || '🛍️',
    adresse: activeBoutique?.adresse || '',
    emailContact: activeBoutique?.emailContact || '',
    instagram: activeBoutique?.instagram || '',
    facebook: activeBoutique?.facebook || '',
    texteRemerciement: activeBoutique?.texteRemerciement || '',
    zonesLivraison: activeBoutique?.zonesLivraison || []
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Orders filters
  const [orderSearch, setOrderSearch]       = useState('');
  const [orderStatut, setOrderStatut]       = useState('Tous');
  const [orderPaiement, setOrderPaiement]   = useState('Tous');
  const [activePrintInvoice, setActivePrintInvoice] = useState(null);
  const invoiceRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Édition de commande
  const [editingOrder, setEditingOrder] = useState(null);   // commande en cours d'édition
  const [editItems, setEditItems] = useState([]);           // items modifiables
  const [editAddSearch, setEditAddSearch] = useState('');   // recherche pour ajouter un produit

  const openEditOrder = (order) => {
    setEditingOrder(order);
    setEditItems(order.items.map(it => ({ ...it })));
    setEditAddSearch('');
  };
  const editChangeQty = (idx, delta) => {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
  };
  const editRemoveItem = (idx) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };
  const editAddProduct = (p) => {
    setEditItems(prev => {
      const ex = prev.find(it => it.id === p.id && !it.variantId);
      if (ex) return prev.map(it => (it.id === p.id && !it.variantId) ? { ...it, quantity: it.quantity + 1 } : it);
      return [...prev, { id: p.id, name: p.name, price: p.price, quantity: 1, variantId: null, variantNom: null }];
    });
    setEditAddSearch('');
  };
  const editSubtotal = editItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const saveEditOrder = () => {
    if (editItems.length === 0) { toast('La commande doit contenir au moins un article.'); return; }
    updateOrder(editingOrder.id, editItems);
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

  // Sync settings quand boutique change
  React.useEffect(() => {
    if (activeBoutique) {
      setSettingsForm({
        name: activeBoutique.name || '',
        description: activeBoutique.description || '',
        whatsapp: activeBoutique.whatsapp || '',
        couleurMarque: activeBoutique.couleurMarque || '#2563eb',
        logo: activeBoutique.logo || '🛍️',
        adresse: activeBoutique.adresse || '',
        emailContact: activeBoutique.emailContact || '',
        instagram: activeBoutique.instagram || '',
        facebook: activeBoutique.facebook || '',
        texteRemerciement: activeBoutique.texteRemerciement || '',
        zonesLivraison: activeBoutique.zonesLivraison || []
      });
    }
  }, [currentMerchantBoutiqueId, activeBoutique?.id]);

  // ⚠️ Doit rester AVANT le return ci-dessous (Rules of Hooks — sinon React error #300
  // quand un compte connecté n'a pas de boutique, ex. le compte admin)
  const [variantUploading, setVariantUploading] = useState(null); // index variante en cours d'upload

  if (!activeBoutique) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
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
    setProductForm({ name:'', price:'', stock:'', category:'Vêtements', photo:'', photos:[], description:'', variantes:[] });
    setProductPhotoFile(null);
    setPhotosUploading([]);
    setProductError('');
    setShowProductModal(true);
  };

  const openEditProduct = (p) => {
    setEditingProduct(p);
    const existingPhotos = p.photos && p.photos.length > 0 ? p.photos : (p.photo ? [p.photo] : []);
    setProductForm({ name:p.name, price:p.price, stock:p.stock, category:p.category, photo:p.photo, photos: existingPhotos, description:p.description, variantes: p.variantes || [] });
    setProductPhotoFile(null);
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
    if (file.size > 5 * 1024 * 1024) { toast('Image trop lourde (max 5 Mo).'); return; }
    setVariantUploading(index);
    try {
      const url = await uploadProductPhoto(activeBoutique.id, file);
      setProductForm(p => ({ ...p, variantes: p.variantes.map((v, i) => i === index ? { ...v, photo: url } : v) }));
    } catch (err) {
      toast('Erreur upload image variante : ' + (err.message || ''));
    } finally {
      setVariantUploading(null);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setProductSaving(true);
    setProductError('');
    try {
      const DEFAULT_IMG = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&auto=format&fit=crop&q=80';

      // Photos : nettoyer les base64 restants (si Storage pas dispo)
      const cleanedPhotos = (productForm.photos || []).filter(u => u && u.trim()).map(u =>
        (u.startsWith('data:') && isConfigured) ? DEFAULT_IMG : u
      );
      const finalPhotos = cleanedPhotos.length > 0 ? cleanedPhotos : [DEFAULT_IMG];
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
        category: productForm.category,
        photo: mainPhoto,
        photos: finalPhotos,
        description: productForm.description,
        variantes
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
      } else {
        await addProduct(activeBoutique.id, data);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      setProductPhotoFile(null);
    } catch(err) {
      console.error(err);
      setProductError('Erreur de sauvegarde : ' + (err.message || 'Vérifiez votre connexion.'));
    } finally {
      setProductSaving(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try { await deleteProduct(id); } catch(e) { toast('Erreur lors de la suppression.'); }
  };

  // Upload multiple photos (max 5)
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentCount = (productForm.photos || []).length;
    const canAdd = 5 - currentCount;
    if (canAdd <= 0) { toast('Maximum 5 photos atteint.'); return; }

    const toProcess = files.slice(0, canAdd);
    const oversized = toProcess.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length) { toast('Certaines images dépassent 5 Mo et seront ignorées.'); }
    const validFiles = toProcess.filter(f => f.size <= 5 * 1024 * 1024);
    if (!validFiles.length) return;

    // Indices des slots en cours d'upload
    const startIdx = currentCount;
    const uploadingIdxs = validFiles.map((_, i) => startIdx + i);
    setPhotosUploading(uploadingIdxs);

    try {
      if (isConfigured) {
        // Upload Firebase Storage en parallèle
        const urls = await Promise.all(validFiles.map(f => uploadProductPhoto(activeBoutique.id, f)));
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
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Image trop lourde (max 2 Mo).'); return; }
    setLogoUploading(true);
    try {
      const url = await uploadBoutiqueLogo(activeBoutique.id, file);
      setSettingsForm(p => ({ ...p, logo: url }));
    } catch(e) { toast(e.message || "Erreur upload logo."); }
    finally { setLogoUploading(false); }
  };

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
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

  // ── Handlers POS ─────────────────────────────────────────────────────────
  const addToPos = (prod) => {
    setPosCart(prev => {
      const ex = prev.find(i => i.id === prod.id);
      if (ex) return ex.quantity >= prod.stock ? prev : prev.map(i => i.id === prod.id ? { ...i, quantity: i.quantity+1 } : i);
      return [...prev, { ...prod, quantity:1 }];
    });
  };
  const updatePosQty = (id, delta) => setPosCart(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity+delta } : i).filter(i => i.quantity > 0));
  const posSubtotal = posCart.reduce((a, i) => a + i.price * i.quantity, 0);

  const handlePosSell = () => {
    if (!posCart.length) { toast('Ajoutez au moins un article.'); return; }
    if (!posClient.nom.trim() || !posClient.telephone.trim()) { toast('Nom et téléphone obligatoires.'); return; }
    const orderId = `VD-${Math.floor(1000 + Math.random() * 9000)}`;
    createOrder(activeBoutique.id, posClient, posCart, 0, 'Vente directe', { methode: posPayMethod, statut: posPayStatut, note: posNote });
    setPosSaleSuccess({ orderId, items:[...posCart], total: posSubtotal, client:{...posClient}, payMethod: posPayMethod });
    setPosCart([]); setPosClient({ nom:'', telephone:'', adresse:'' }); setPosNote('');
  };

  // ── WhatsApp helpers ──────────────────────────────────────────────────────
  const sendInvoiceWA = (inv) => {
    if (!inv) return;
    let msg = `*📄 FACTURE — ${activeBoutique.name.toUpperCase()}*\n_Réf: ${inv.id}_ | _Date: ${new Date(inv.date).toLocaleDateString('fr-FR')}_\n\n`;
    msg += `*Client:* ${inv.client.nom} — ${inv.client.telephone}\n\n*Articles:*\n`;
    inv.items.forEach(it => { msg += `• ${it.quantity}× ${it.name} → ${fmt(it.price * it.quantity)}\n`; });
    msg += `\n*Total: ${fmt(inv.total)}* | ${inv.paiement?.methode || 'Livraison'}\n🙏 Merci chez ${activeBoutique.name} !`;
    const phone = inv.client.telephone.replace(/\D/g,'');
    window.open(`https://wa.me/${phone.startsWith('221') ? phone : '221'+phone}?text=${encodeURIComponent(msg)}`, '_blank');
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
    img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
  });

  // ── Génération PDF (dessin direct jsPDF) ─────────────────────────────────
  const generatePDF = async () => {
    if (!activePrintInvoice) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const m = 15;
      const cW = pageW - 2 * m;
      let y = m;
      const fmtNum = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

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
        try { pdf.addImage(logoData, 'PNG', m, y, 20, 20); } catch(_) { logoData = null; }
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
        if (i % 2 === 1) { pdf.setFillColor(248,250,252); pdf.rect(m, y, cW, 9, 'F'); }
        pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(0,0,0);
        const name = item.name.length > 38 ? item.name.substring(0,38)+'…' : item.name;
        pdf.text(name, m + 3, y + 6);
        pdf.text(String(item.quantity), m + cW * 0.58, y + 6);
        pdf.text(fmtNum(item.price), m + cW * 0.72, y + 6);
        pdf.setFont('helvetica', 'bold');
        pdf.text(fmtNum(item.price * item.quantity), pageW - m - 3, y + 6, { align: 'right' });
        y += 9;
      });

      // ── Séparateur ──
      pdf.setDrawColor(200,200,200); pdf.setLineWidth(0.3);
      pdf.line(m, y, pageW - m, y); y += 8;

      // ── Totaux ──
      const sousTotal = activePrintInvoice.total - activePrintInvoice.livraison.frais;
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100,100,100);
      pdf.text('Sous-total', pageW - m - 55, y);
      pdf.text(fmtNum(sousTotal), pageW - m - 3, y, { align: 'right' }); y += 7;
      pdf.text('Livraison', pageW - m - 55, y);
      pdf.text(fmtNum(activePrintInvoice.livraison.frais), pageW - m - 3, y, { align: 'right' }); y += 3;
      pdf.setDrawColor(0,0,0); pdf.setLineWidth(0.5);
      pdf.line(pageW - m - 60, y, pageW - m, y); y += 6;
      pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0,0,0);
      pdf.text('TOTAL', pageW - m - 55, y);
      pdf.setTextColor(37,99,235);
      pdf.text(fmtNum(activePrintInvoice.total), pageW - m - 3, y, { align: 'right' });
      y += 18;

      // ── Footer ──
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(160,160,160);
      pdf.text(`Merci pour votre achat chez ${activeBoutique.name} · Jappandal Tech`, pageW / 2, y, { align: 'center' });

      const filename = `Facture_${activePrintInvoice.id}_${activeBoutique.name.replace(/\s+/g,'_')}.pdf`;
      pdf.save(filename);

    } catch (err) {
      console.error('PDF error:', err);
      toast('Erreur PDF : ' + (err.message || 'Réessayez'));
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Nav items ─────────────────────────────────────────────────────────────
  const NAV = [
    { id:'dashboard', label:'Tableau de bord', icon: LayoutDashboard },
    { id:'products',  label:'Produits',         icon: ShoppingBag, badge: activeProducts.length },
    { id:'orders',    label:'Commandes',         icon: ClipboardList, badge: pendingOrders || null },
    { id:'caisse',    label:'Caisse',            icon: Receipt },
    { id:'settings',  label:'Configuration',    icon: Settings },
    { id:'support',   label:'Support',           icon: MessageSquare, badge: activeTickets.filter(t=>t.statut==='En attente').length || null },
  ];

  const isFree = !activeBoutique.abonnement?.plan || activeBoutique.abonnement.plan === 'Découverte';

  // ── Filtered orders ───────────────────────────────────────────────────────
  const filteredOrders = activeOrders.filter(o => {
    const matchSearch = !orderSearch || o.id.toLowerCase().includes(orderSearch.toLowerCase()) || o.client.nom.toLowerCase().includes(orderSearch.toLowerCase()) || o.client.telephone.includes(orderSearch);
    const matchStatut = orderStatut === 'Tous' || o.statut === orderStatut;
    const matchPay    = orderPaiement === 'Tous' || (o.paiement?.statut||'En attente') === orderPaiement;
    return matchSearch && matchStatut && matchPay;
  });

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const Sidebar = () => (
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
          <select value={currentMerchantBoutiqueId} onChange={e => setCurrentMerchantBoutiqueId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer">
            {myBoutiques.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon, badge }) => (
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
        <button type="button" onClick={async () => { setSidebarOpen(false); await logoutMerchant(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-60">
            <Sidebar />
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
                  const url = `${window.location.origin}/shop/${activeBoutique.slug}`;
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

          {/* ── DASHBOARD ─────────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:'Revenus', value: fmt(totalRevenue), sub:'Commandes payées/livrées', icon: DollarSign, color:'teal' },
                  { label:'En attente', value: pendingOrders, sub:'Commandes à traiter', icon: Clock, color:'blue' },
                  { label:'Stock bas', value: lowStock, sub:'Produits ≤ 3 unités', icon: AlertTriangle, color: lowStock > 0 ? 'amber' : 'slate' },
                  { label:'Produits', value: activeProducts.length, sub:`/ ${isFree ? '5 max (gratuit)' : 'illimités'}`, icon: Package, color:'orange' },
                ].map(({ label, value, sub, icon: Icon, color }) => (
                  <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-medium text-slate-500">{label}</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${color}-500/10`}>
                        <Icon className={`w-4 h-4 text-${color}-400`} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-xs text-slate-500 mt-1">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Alerte stock — produits à réapprovisionner */}
              {(outOfStock.length > 0 || lowStockList.length > 0) && (
                <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Stock à réapprovisionner
                    </h3>
                    <button onClick={() => setActiveTab('products')} className="text-xs text-blue-400 hover:text-blue-300">Gérer les produits →</button>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Touchez un article pour modifier son stock.</p>
                  <div className="flex flex-wrap gap-2">
                    {outOfStock.map(p => (
                      <button key={p.id} onClick={() => openEditProduct(p)} title="Réapprovisionner cet article"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {p.name} · Rupture
                      </button>
                    ))}
                    {lowStockList.map(p => (
                      <button key={p.id} onClick={() => openEditProduct(p)} title="Réapprovisionner cet article"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {p.name} · {p.stock} restant{p.stock > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Commandes récentes */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-blue-400" /> Commandes récentes
                  </h3>
                  <button onClick={() => setActiveTab('orders')} className="text-xs text-blue-400 hover:text-blue-300">Voir tout →</button>
                </div>
                {activeOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">Aucune commande reçue pour le moment.</div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {activeOrders.slice(0,5).map(o => (
                      <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-800/50 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-slate-200">{o.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUT_COLORS[o.statut] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                              {o.statut}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{o.client.nom} · {new Date(o.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <span className="font-semibold text-slate-200 text-sm shrink-0">{fmt(o.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top produits */}
              {completedOrders.length > 0 && (() => {
                const qtyMap = {};
                completedOrders.forEach(o => o.items.forEach(it => { qtyMap[it.name] = (qtyMap[it.name]||0) + it.quantity; }));
                const top = Object.entries(qtyMap).sort((a,b) => b[1]-a[1]).slice(0,3);
                return top.length ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-800">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" /> Top produits vendus
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-800">
                      {top.map(([name, qty], i) => (
                        <div key={name} className="px-5 py-3 flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center">#{i+1}</span>
                          <span className="flex-1 text-sm text-slate-200">{name}</span>
                          <span className="text-sm font-semibold text-blue-400">{qty} vendus</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {activeProducts.map(p => (
                    <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all group flex flex-col">
                      <div className="relative h-28 sm:h-32 bg-slate-800 overflow-hidden shrink-0">
                        <img src={p.photo} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
          )}

          {/* ── ORDERS ────────────────────────────────────────────────────── */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-48">
                  <Search className="w-4 h-4 text-slate-500 shrink-0" />
                  <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                    placeholder="Rechercher commande, client..."
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none" />
                </div>
                <select value={orderStatut} onChange={e => setOrderStatut(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none">
                  {['Tous','Reçue','Préparée','Livrée','Payée','Annulée'].map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={orderPaiement} onChange={e => setOrderPaiement(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none">
                  {['Tous','En attente','Payé'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 text-center text-slate-500">
                  {activeOrders.length === 0 ? 'Aucune commande reçue pour le moment.' : 'Aucune commande correspond aux filtres.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map(o => (
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
                            <span className="text-slate-300 min-w-0 truncate"><span className="text-blue-400 font-bold">{it.quantity}×</span> {it.name}</span>
                            <span className="text-slate-400 font-mono shrink-0">{fmt(it.price * it.quantity)}</span>
                          </div>
                        ))}
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
                      </div>
                      )}
                    </div>
                  ))}
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
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input value={posSearch} onChange={e => setPosSearch(e.target.value)} placeholder="Rechercher un produit..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                      {posProducts.map(p => {
                        const inCart = posCart.find(i => i.id === p.id);
                        return (
                          <button key={p.id} onClick={() => addToPos(p)} disabled={inCart?.quantity >= p.stock}
                            className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${inCart ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 bg-slate-800 hover:border-slate-600'} ${inCart?.quantity >= p.stock ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <img src={p.photo} alt={p.name} className="w-full h-20 object-cover rounded-lg mb-2 bg-slate-700" />
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
                            <div key={it.id} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                              <span className="flex-1 text-xs text-slate-300 truncate">{it.name}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updatePosQty(it.id,-1)} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                                <span className="text-xs font-bold text-white w-4 text-center">{it.quantity}</span>
                                <button onClick={() => updatePosQty(it.id,1)} disabled={it.quantity >= it.stock} className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center disabled:opacity-40"><Plus className="w-3 h-3" /></button>
                              </div>
                              <span className="text-xs font-bold text-blue-400 w-20 text-right">{fmt(it.price * it.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {posCart.length > 0 && (
                        <div className="flex justify-between border-t border-slate-800 pt-3 mt-3 font-bold">
                          <span className="text-slate-400 text-sm">Total</span>
                          <span className="text-blue-400">{fmt(posSubtotal)}</span>
                        </div>
                      )}
                    </div>

                    {/* Client */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                      <h3 className="font-semibold text-slate-200 text-sm">Client</h3>
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
                        {['Espèces','Wave','Orange Money','Crédit'].map(m => (
                          <button key={m} onClick={() => setPosPayMethod(m)}
                            className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${posPayMethod===m ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[{v:'Payé',color:'emerald'},{v:'En attente',color:'amber'}].map(({v,color}) => (
                          <button key={v} onClick={() => setPosPayStatut(v)}
                            className={`py-2 rounded-lg text-xs font-semibold border transition-all ${posPayStatut===v ? `border-${color}-500 bg-${color}-500/10 text-${color}-300` : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                            {v === 'Payé' ? '✓ Payé' : '⏳ En attente'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button onClick={handlePosSell} disabled={!posCart.length || !posClient.nom || !posClient.telephone}
                      className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2">
                      <Receipt className="w-4 h-4" />
                      Enregistrer la vente{posCart.length > 0 ? ` — ${fmt(posSubtotal)}` : ''}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

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
                      {logoUploading && <span className="text-xs text-blue-400 animate-pulse">Upload en cours…</span>}
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
                      {label:'WhatsApp', key:'whatsapp', type:'text'},
                      {label:'Adresse physique', key:'adresse', type:'text'},
                      {label:'Email de contact', key:'emailContact', type:'email'},
                      {label:'Instagram (@compte)', key:'instagram', type:'text'},
                      {label:'Facebook', key:'facebook', type:'text'},
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
            </div>
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

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Catégorie</label>
                <select value={productForm.category} onChange={e => setProductForm(p=>({...p, category:e.target.value}))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:border-blue-500 focus:outline-none">
                  {['Vêtements','Chaussures','Sacs','Accessoires','Lunettes','Encens','Cosmétiques','Électronique','Alimentation','Divers'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

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
                        <img src={url} alt={`Photo ${idx+1}`}
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
                          ? <img src={v.photo} alt={v.nom} className="w-full h-full object-cover" />
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
        const shopUrl = `${window.location.origin}/shop/${activeBoutique.slug}`;
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
                    {[{p:'Pro', price:'5 000'},{p:'Premium', price:'15 000'}].map(({p, price}) => (
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

      {/* ── MODAL FACTURE ─────────────────────────────────────────────────── */}
      {activePrintInvoice && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4">
            {/* Barre d'actions — responsive mobile */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <span className="font-bold text-slate-800 text-sm">Facture / Reçu</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => sendInvoiceWA(activePrintInvoice)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all">
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button onClick={generatePDF} disabled={pdfLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs transition-all">
                    {pdfLoading
                      ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> PDF...</>
                      : <><Printer className="w-3.5 h-3.5" /> Télécharger PDF</>}
                  </button>
                  <button onClick={() => setActivePrintInvoice(null)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-100 transition-all">
                    <X className="w-3.5 h-3.5" /> Fermer
                  </button>
                </div>
              </div>
            </div>

            {/* Corps de la facture — capturé par html2canvas */}
            <div ref={invoiceRef} className="p-6 bg-white">
              {/* En-tête */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  {activeBoutique.logo && (
                    <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {typeof activeBoutique.logo === 'string' && (activeBoutique.logo.startsWith('http') || activeBoutique.logo.startsWith('data:') || activeBoutique.logo.startsWith('/'))
                        ? <img src={activeBoutique.logo} alt="Logo" className="w-full h-full object-contain p-1" crossOrigin="anonymous" />
                        : <span className="text-2xl">{activeBoutique.logo}</span>}
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-black text-slate-900 uppercase leading-tight">{activeBoutique.name}</h1>
                    {activeBoutique.adresse && <p className="text-xs text-slate-500">{activeBoutique.adresse}</p>}
                    <p className="text-xs text-slate-500">{activeBoutique.whatsapp}</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-black text-slate-900">FACTURE</h2>
                  <p className="text-xs font-mono text-slate-500 mt-1">Réf : {activePrintInvoice.id}</p>
                  <p className="text-xs text-slate-500">{new Date(activePrintInvoice.date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              {/* Client + paiement */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client</p>
                  <p className="font-bold text-slate-900 text-sm">{activePrintInvoice.client.nom}</p>
                  <p className="text-xs text-slate-600">{activePrintInvoice.client.telephone}</p>
                  <p className="text-xs text-slate-600">{activePrintInvoice.client.adresse}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Paiement</p>
                  <p className="font-semibold text-slate-800 text-sm">{activePrintInvoice.paiement?.methode || 'À la livraison'}</p>
                  <p className="text-xs text-slate-600">{activePrintInvoice.paiement?.statut || 'En attente'}</p>
                </div>
              </div>

              {/* Articles */}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="py-2 text-left font-bold text-slate-800">Article</th>
                    <th className="py-2 text-center font-bold text-slate-800">Qté</th>
                    <th className="py-2 text-right font-bold text-slate-800">P.U.</th>
                    <th className="py-2 text-right font-bold text-slate-800">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activePrintInvoice.items.map((it, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2.5 text-slate-800">{it.name}</td>
                      <td className="py-2.5 text-center text-slate-600">{it.quantity}</td>
                      <td className="py-2.5 text-right font-mono text-slate-600">{fmt(it.price)}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">{fmt(it.price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totaux */}
              <div className="mt-4 flex justify-end">
                <div className="w-52 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Sous-total</span>
                    <span className="font-mono">{fmt(activePrintInvoice.total - activePrintInvoice.livraison.frais)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Livraison</span>
                    <span className="font-mono">{fmt(activePrintInvoice.livraison.frais)}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 border-t-2 border-slate-900 pt-2 text-base">
                    <span>TOTAL</span>
                    <span style={{ color: '#2563eb' }}>{fmt(activePrintInvoice.total)}</span>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-slate-400 mt-6 pt-4 border-t border-slate-100">
                Merci pour votre achat chez {activeBoutique.name} · Propulsé par Jappandal Tech
              </p>
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
                  <div key={idx} className="flex items-center gap-3 bg-slate-800 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{it.name}</p>
                      <p className="text-xs text-slate-500">{fmt(it.price)} / unité</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => editChangeQty(idx, -1)} className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="text-sm font-bold text-white w-6 text-center">{it.quantity}</span>
                      <button onClick={() => editChangeQty(idx, 1)} className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <span className="text-sm font-bold text-blue-400 w-20 text-right shrink-0">{fmt(it.price * it.quantity)}</span>
                    <button onClick={() => editRemoveItem(idx)} className="w-7 h-7 rounded-lg bg-red-500/5 text-red-400 hover:bg-red-500/10 flex items-center justify-center shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
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
                        <img src={p.photo} alt={p.name} className="w-8 h-8 rounded object-cover bg-slate-700 shrink-0" />
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
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-slate-400">Nouveau sous-total</span>
                <span className="text-lg font-bold text-white">{fmt(editSubtotal)}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditingOrder(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-medium text-sm transition-colors">Fermer</button>
                <button onClick={saveEditOrder}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Enregistrer
                </button>
              </div>
              {editingOrder.statut !== 'Annulée' && (
                <button onClick={() => { cancelOrder(editingOrder.id); setEditingOrder(null); }}
                  className="w-full mt-2 py-2.5 rounded-xl bg-red-500/5 text-red-400 border border-red-500/20 hover:bg-red-500/10 font-bold text-sm transition-all flex items-center justify-center gap-2">
                  <X className="w-4 h-4" /> Annuler cette commande (rembourse le stock)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

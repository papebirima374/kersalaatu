import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { Link } from 'react-router-dom';
import { isConfigured } from '../../firebase/config';

import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  Check,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Store,
  ExternalLink,
  Save,
  MessageSquare,
  Printer,
  Lock,
  ShoppingCart,
  Minus,
  User,
  Phone,
  MapPin,
  Receipt,
  Search,
  X
} from 'lucide-react';

// A beautiful premium interactive Sales Chart using simple responsive SVG elements
function SalesChart({ activeOrders, isLocked }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Get last 7 days dates and sales
  const chartData = React.useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      
      const dayOrders = activeOrders.filter(o => {
        const orderDate = new Date(o.date);
        return orderDate >= startOfDay && orderDate <= endOfDay;
      });
      
      const salesAmount = dayOrders.reduce((sum, o) => sum + o.total, 0);
      data.push({
        dateLabel: dateString,
        amount: salesAmount,
        orderCount: dayOrders.length
      });
    }
    return data;
  }, [activeOrders]);

  const maxAmount = Math.max(...chartData.map(d => d.amount), 10000); // at least 10,000 for scale
  
  // Chart dimensions
  const width = 600;
  const height = 200;
  const paddingX = 50;
  const paddingY = 30;

  const points = chartData.map((d, index) => {
    const x = paddingX + (index * (width - 2 * paddingX)) / 6;
    // Invert Y because SVG coordinates start from top
    const y = height - paddingY - (d.amount / maxAmount) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  // Build path string
  const linePath = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  // Build area path string (to fill gradient under line)
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850 shadow-xl space-y-4 relative overflow-hidden">
      {isLocked && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center border border-slate-850 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-400 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4 animate-pulse">
            <Lock className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <h4 className="font-extrabold text-base text-slate-100">Statistiques Avancées Verrouillées</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed font-sans">
            L'évolution des ventes et l'analyse hebdomadaire sont disponibles uniquement dans les forfaits Pro et Premium.
          </p>
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            Forfait Actuel : Découverte (Gratuit)
          </div>
        </div>
      )}

      <div className={`space-y-4 ${isLocked ? 'filter blur-[3px] select-none pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" /> Évolution des Ventes (7j)
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Activité de vente quotidienne sur la semaine écoulée.</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block uppercase tracking-widest text-[9px] font-bold">Total 7 Jours</span>
            <span className="text-base font-black text-teal-400 font-mono">
              {formatMoney(chartData.reduce((sum, d) => sum + d.amount, 0))}
            </span>
          </div>
        </div>

        <div className="relative w-full h-[200px] mt-4">
          {/* Responsive SVG Container */}
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
              {/* Area Gradient */}
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
              </linearGradient>
              
              {/* Grid Line Pattern */}
              <linearGradient id="gridGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#1e293b" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Grid lines (horizontal) */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = paddingY + ratio * (height - 2 * paddingY);
              const val = maxAmount * (1 - ratio);
              return (
                <g key={index}>
                  <line 
                    x1={paddingX} 
                    y1={y} 
                    x2={width - paddingX} 
                    y2={y} 
                    stroke="url(#gridGrad)" 
                    strokeWidth="1" 
                    strokeDasharray="4"
                  />
                  <text 
                    x={paddingX - 10} 
                    y={y + 3} 
                    fill="#475569" 
                    fontSize="9" 
                    fontWeight="bold"
                    textAnchor="end"
                    className="font-mono"
                  >
                    {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                  </text>
                </g>
              );
            })}

            {/* Area under the line */}
            {areaPath && (
              <path d={areaPath} fill="url(#chartGradient)" />
            )}

            {/* The sales line */}
            <path 
              d={linePath} 
              fill="none" 
              stroke="#0d9488" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Data Points (Dots) */}
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.idx === idx ? "7" : "4.5"}
                fill="#0d9488"
                stroke="#0f172a"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredPoint({ ...p, idx })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}

            {/* X Axis Labels */}
            {points.map((p, idx) => (
              <text
                key={idx}
                x={p.x}
                y={height - 6}
                fill="#64748b"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
              >
                {p.dateLabel}
              </text>
            ))}
          </svg>

          {/* Hover Tooltip (HTML overlay) */}
          {hoveredPoint && (
            <div 
              className="absolute z-30 bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-[11px] shadow-2xl pointer-events-none transition-all duration-75 flex flex-col gap-0.5 min-w-[120px] text-center"
              style={{ 
                left: `${(hoveredPoint.x / width) * 100}%`, 
                top: `${(hoveredPoint.y / height) * 100 - 32}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <span className="font-bold text-slate-400 text-[9px] uppercase tracking-wider">{hoveredPoint.dateLabel}</span>
              <span className="font-black text-teal-400 font-mono">{formatMoney(hoveredPoint.amount)}</span>
              <span className="text-[9px] text-slate-500">{hoveredPoint.orderCount} commande(s)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MerchantConsole() {
  const {
    boutiques,
    products,
    orders,
    tickets,
    currentMerchantBoutiqueId,
    setCurrentMerchantBoutiqueId,
    merchantUser,
    loginMerchant,
    signupMerchant,
    logoutMerchant,
    updateBoutique,
    addProduct,
    updateProduct,
    deleteProduct,
    updateOrderStatus,
    updateOrderPaymentStatus,
    addTicket,
    getProductsByBoutique,
    getOrdersByBoutique,
    getBoutiqueById,
    uploadBoutiqueLogo,
    upgradeRequests,
    createUpgradeRequest,
    createOrder
  } = useTenant();

  // Authentication states
  const [authTab, setAuthTab] = useState('login'); // login, register
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBoutiqueName, setAuthBoutiqueName] = useState('');
  const [authWhatsapp, setAuthWhatsapp] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authTab === 'login') {
        await loginMerchant(authEmail, authPassword);
      } else {
        if (!authBoutiqueName.trim()) {
          setAuthError('Le nom de la boutique est obligatoire.');
          setAuthLoading(false);
          return;
        }
        if (!authWhatsapp.trim()) {
          setAuthError('Le numéro WhatsApp est obligatoire.');
          setAuthLoading(false);
          return;
        }
        await signupMerchant(authEmail, authPassword, authBoutiqueName, authWhatsapp);
      }
    } catch (err) {
      console.error(err);
      let errMsg = 'Une erreur est survenue lors de l\'authentification.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errMsg = 'Identifiants incorrects. Veuillez réessayer.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Cet email est déjà associé à un compte commerçant.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Le mot de passe doit contenir au moins 6 caractères.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  if (!merchantUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative font-sans text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/25 via-slate-950 to-slate-950 pointer-events-none" />
        
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl relative backdrop-blur-sm space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
            <Store className="w-7 h-7 text-slate-950 stroke-[2.5]" />
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-tight text-white">Espace Commerçant</h2>
            <p className="text-xs text-slate-500 mt-1">Gérez votre boutique en ligne Kër Salaatu Tech.</p>
          </div>

          {/* Mode indicators */}
          <div className="flex justify-center">
            {isConfigured ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Mode Cloud (Firebase)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Mode Simulation Locale
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-850">
            <button
              onClick={() => {
                setAuthTab('login');
                setAuthError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${authTab === 'login' ? 'bg-slate-900 text-teal-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Se Connecter
            </button>
            <button
              onClick={() => {
                setAuthTab('register');
                setAuthError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${authTab === 'register' ? 'bg-slate-900 text-teal-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Créer Boutique
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authError && (
              <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold leading-relaxed font-sans">
                {authError}
              </div>
            )}

            {authTab === 'register' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Nom de votre boutique</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sunu Boutik, Dakar Modes..."
                    value={authBoutiqueName}
                    onChange={(e) => setAuthBoutiqueName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-sm text-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">WhatsApp (Ex: 780178444)</label>
                  <input
                    type="text"
                    required
                    placeholder="Numéro pour recevoir les commandes"
                    value={authWhatsapp}
                    onChange={(e) => setAuthWhatsapp(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-sm text-slate-200 font-mono"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Adresse email</label>
              <input
                type="email"
                required
                placeholder="nom@exemple.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-sm text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Mot de passe</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-sm text-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold hover:shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50 font-sans"
            >
              {authLoading ? (
                <span>Chargement...</span>
              ) : authTab === 'login' ? (
                <span>Se connecter</span>
              ) : (
                <span>Créer et lancer ma boutique</span>
              )}
            </button>
          </form>

          <div className="text-center">
            <Link to="/" className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors inline-block font-sans">
              Retour à la page d'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, products, orders, caisse, settings

  // ── Caisse (POS) state ───────────────────────────────────────────────────
  const [posCart, setPosCart] = useState([]);
  const [posClientForm, setPosClientForm] = useState({ nom: '', telephone: '', adresse: '' });
  const [posPayMethod, setPosPayMethod] = useState('Espèces');
  const [posPayStatut, setPosPayStatut] = useState('Payé');
  const [posNote, setPosNote] = useState('');
  const [posSearch, setPosSearch] = useState('');
  const [posSaleSuccess, setPosSaleSuccess] = useState(null); // holds last order ref on success

  // ── Isolation marchand : seules ses propres boutiques sont accessibles ──
  // En mode simulation locale (pas de Firebase), on affiche toutes les boutiques
  // car il n'y a pas de vrai système d'auth pour distinguer les propriétaires.
  const myBoutiques = React.useMemo(() => {
    if (!merchantUser) return [];
    if (!isConfigured) return boutiques; // mode local : pas de filtrage
    return boutiques.filter(
      b => b.ownerUid === merchantUser.uid || b.ownerEmail === merchantUser.email
    );
  }, [boutiques, merchantUser]);

  const activeBoutique = myBoutiques.find(b => b.id === currentMerchantBoutiqueId) || myBoutiques[0] || null;

  // ── Alerte expiration abonnement ────────────────────────────────────────
  const subscriptionExpired = React.useMemo(() => {
    if (!activeBoutique?.abonnement?.dateExpiration) return false;
    return new Date(activeBoutique.abonnement.dateExpiration) < new Date();
  }, [activeBoutique]);

  const subscriptionExpiresSoon = React.useMemo(() => {
    if (!activeBoutique?.abonnement?.dateExpiration) return false;
    const exp = new Date(activeBoutique.abonnement.dateExpiration);
    const diff = exp - new Date();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // moins de 7 jours
  }, [activeBoutique]);

  // Fetch data specific to the active store
  const activeProducts = activeBoutique ? getProductsByBoutique(activeBoutique.id) : [];
  const activeOrders = activeBoutique ? getOrdersByBoutique(activeBoutique.id) : [];

  // Stats calculation
  const completedOrders = React.useMemo(() => {
    return activeOrders.filter(o => o.statut === 'Payée' || o.statut === 'Livrée');
  }, [activeOrders]);

  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  
  const pendingOrders = activeOrders.filter(o => o.statut === 'Reçue' || o.statut === 'Préparée').length;
  const lowStockProducts = activeProducts.filter(p => p.stock <= 3).length;

  // New KPIs calculations
  const panierMoyen = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;
  const totalItemsSold = completedOrders.reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  
  const simulatedVisits = completedOrders.length * 28 + 147;
  const conversionRate = simulatedVisits > 0 ? ((completedOrders.length / simulatedVisits) * 100).toFixed(1) : '0.0';

  // Top Selling Products Calculation
  const topProducts = React.useMemo(() => {
    const soldQtyMap = {};
    const salesAmountMap = {};
    
    completedOrders.forEach(o => {
      o.items.forEach(item => {
        soldQtyMap[item.name] = (soldQtyMap[item.name] || 0) + item.quantity;
        salesAmountMap[item.name] = (salesAmountMap[item.name] || 0) + (item.price * item.quantity);
      });
    });
    
    return Object.keys(soldQtyMap).map(name => {
      const catalogProd = activeProducts.find(p => p.name === name);
      return {
        name,
        quantitySold: soldQtyMap[name],
        totalSales: salesAmountMap[name],
        photo: catalogProd?.photo || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&auto=format&fit=crop&q=80'
      };
    }).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 3);
  }, [completedOrders, activeProducts]);

  // Payment Method Breakdown Calculation
  const paymentBreakdown = React.useMemo(() => {
    let waveTotal = 0;
    let omTotal = 0;
    let cashTotal = 0;
    
    completedOrders.forEach(o => {
      const methode = (o.paiement?.methode || 'À la livraison').toLowerCase();
      if (methode.includes('wave')) {
        waveTotal += o.total;
      } else if (methode.includes('orange') || methode.includes('om')) {
        omTotal += o.total;
      } else {
        cashTotal += o.total;
      }
    });
    
    const overall = waveTotal + omTotal + cashTotal || 1;
    return {
      wave: { amount: waveTotal, percent: Math.round((waveTotal / overall) * 100) },
      om: { amount: omTotal, percent: Math.round((omTotal / overall) * 100) },
      cash: { amount: cashTotal, percent: Math.round((cashTotal / overall) * 100) }
    };
  }, [completedOrders]);

  // Add/Edit Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null for add, product object for edit
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    stock: '',
    category: 'Vêtements',
    photo: '',
    description: ''
  });

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    name: activeBoutique?.name || '',
    description: activeBoutique?.description || '',
    whatsapp: activeBoutique?.whatsapp || '',
    couleurMarque: activeBoutique?.couleurMarque || '#0d9488',
    logo: activeBoutique?.logo || '🛍️',
    adresse: activeBoutique?.adresse || '',
    emailContact: activeBoutique?.emailContact || '',
    instagram: activeBoutique?.instagram || '',
    facebook: activeBoutique?.facebook || '',
    texteRemerciement: activeBoutique?.texteRemerciement || 'Merci pour votre commande chez nous ! Nous vous contacterons rapidement sur WhatsApp pour confirmer la livraison.',
    zonesLivraison: activeBoutique?.zonesLivraison || []
  });

  const [activePrintInvoice, setActivePrintInvoice] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({ sujet: '', message: '' });

  // Upgrade simulated payment states
  const [showProductLimitModal, setShowProductLimitModal] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState('Pro'); // Pro or Premium
  const [paymentMethod, setPaymentMethod] = useState('Wave'); // Wave or Orange Money
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Search & Filter state for Orders tab
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('Tous');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('Tous');

  // Sync settings form when active boutique changes
  React.useEffect(() => {
    if (activeBoutique) {
      setSettingsForm({
        name: activeBoutique.name,
        description: activeBoutique.description,
        whatsapp: activeBoutique.whatsapp,
        couleurMarque: activeBoutique.couleurMarque,
        logo: activeBoutique.logo,
        adresse: activeBoutique.adresse || '',
        emailContact: activeBoutique.emailContact || '',
        instagram: activeBoutique.instagram || '',
        facebook: activeBoutique.facebook || '',
        texteRemerciement: activeBoutique.texteRemerciement || 'Merci pour votre commande chez nous ! Nous vous contacterons rapidement sur WhatsApp pour confirmer la livraison.',
        zonesLivraison: activeBoutique.zonesLivraison || []
      });
    }
  }, [currentMerchantBoutiqueId, activeBoutique]);

  if (!activeBoutique) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans text-slate-100 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 mb-6 relative z-10">
          <Store className="w-7 h-7 text-slate-950 stroke-[2.5]" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 relative z-10">Aucune boutique disponible</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed relative z-10">
          Pour commencer à utiliser la console marchand, veuillez d'abord créer votre boutique sur la page d'accueil ou via la console d'administration.
        </p>
        <div className="flex gap-4 relative z-10">
          <Link
            to="/"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold text-xs transition-all hover:scale-105"
          >
            Créer ma Boutique
          </Link>
          <button
            onClick={() => logoutMerchant()}
            className="px-6 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-400 text-xs font-semibold transition-all"
          >
            Se Déconnecter
          </button>
        </div>
      </div>
    );
  }

  const handleProductSubmit = (e) => {
    e.preventDefault();
    const data = {
      name: productForm.name,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      category: productForm.category,
      photo: productForm.photo || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&auto=format&fit=crop&q=80',
      description: productForm.description
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, data);
    } else {
      addProduct(activeBoutique.id, data);
    }

    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm({ name: '', price: '', stock: '', category: 'Vêtements', photo: '', description: '' });
  };

  const openAddProduct = () => {
    const isFree = activeBoutique.abonnement?.plan === 'Découverte' || !activeBoutique.abonnement?.plan;
    if (isFree && activeProducts.length >= 5) {
      setPaymentSuccess(false);
      setPaymentPhone('');
      setShowProductLimitModal(true);
      return;
    }
    setEditingProduct(null);
    setProductForm({ name: '', price: '', stock: '', category: 'Vêtements', photo: '', description: '' });
    setShowProductModal(true);
  };

  const handleUpgradePaymentSubmit = (e) => {
    e.preventDefault();
    if (!paymentPhone.trim()) {
      alert('Veuillez renseigner votre numéro de téléphone.');
      return;
    }
    setPaymentLoading(true);
    
    // Simulate transaction delay
    setTimeout(() => {
      createUpgradeRequest(activeBoutique.id, paymentPlan, paymentMethod, paymentPhone.trim());
      setPaymentLoading(false);
      setPaymentSuccess(true);
    }, 2000);
  };

  const handleSendInvoiceWhatsApp = () => {
    if (!activePrintInvoice) return;
    
    let message = `*📄 FACTURE - ${activeBoutique.name.toUpperCase()}* 🛍️\n`;
    message += `_Référence Facture: ${activePrintInvoice.id}_\n`;
    message += `_Date: ${new Date(activePrintInvoice.date).toLocaleDateString('fr-FR')}_\n\n`;
    
    message += `*👤 CLIENT :*\n`;
    message += `• *Nom :* ${activePrintInvoice.client.nom}\n`;
    message += `• *Téléphone :* ${activePrintInvoice.client.telephone}\n`;
    message += `• *Adresse :* ${activePrintInvoice.client.adresse}\n\n`;
    
    message += `*🛍️ ARTICLES COMMANDÉS :*\n`;
    activePrintInvoice.items.forEach(item => {
      message += `• ${item.quantity}x ${item.name} (${formatMoney(item.price * item.quantity)})\n`;
    });
    message += `\n`;
    
    message += `*💵 TOTAL À PAYER :* *${formatMoney(activePrintInvoice.total)}*\n`;
    message += `• _Frais de livraison : ${formatMoney(activePrintInvoice.livraison.frais)} (Zone: ${activePrintInvoice.livraison.lieu})_\n`;
    message += `• _Mode de paiement : ${activePrintInvoice.paiement?.methode || 'À la livraison'}_\n\n`;
    
    message += `🙏 Merci pour vos achats chez ${activeBoutique.name} !`;
    
    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = activePrintInvoice.client.telephone.trim().replace(/\s+/g, '');
    let finalPhone = cleanPhone;
    
    // Add default country code prefix for Senegal if it's 9 digits without code
    if (!finalPhone.startsWith('+') && !finalPhone.startsWith('00')) {
      if (finalPhone.startsWith('221')) {
        finalPhone = '+' + finalPhone;
      } else {
        finalPhone = '+221' + finalPhone;
      }
    }
    
    const whatsappUrl = `https://wa.me/${finalPhone.replace(/\+/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const openEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      price: prod.price,
      stock: prod.stock,
      category: prod.category,
      photo: prod.photo,
      description: prod.description
    });
    setShowProductModal(true);
  };

  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("L'image est trop lourde. Veuillez choisir une image de moins de 2 Mo.");
      return;
    }
    setLogoUploading(true);
    try {
      const url = await uploadBoutiqueLogo(activeBoutique.id, file);
      setSettingsForm(prev => ({ ...prev, logo: url }));
    } catch (err) {
      alert(err.message || "Erreur lors de l'upload du logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleProductPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("L'image est trop lourde. Veuillez choisir une image de moins de 2 Mo.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProductForm(prev => ({ ...prev, photo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleExportCSV = () => {
    if (activeOrders.length === 0) {
      alert("Aucune commande à exporter.");
      return;
    }

    const headers = [
      "ID Commande",
      "Date",
      "Nom Client",
      "Telephone",
      "Adresse",
      "Zone Livraison",
      "Frais Livraison (FCFA)",
      "Mode Paiement",
      "Statut Paiement",
      "Reference Paiement",
      "Statut Commande",
      "Articles",
      "Total (FCFA)"
    ];

    const rows = activeOrders.map(o => {
      const itemsList = o.items.map(item => `${item.quantity}x ${item.name} (${item.price} FCFA)`).join(" ; ");
      return [
        o.id,
        new Date(o.date).toLocaleDateString('fr-FR') + " " + new Date(o.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
        o.client.nom,
        o.client.telephone,
        o.client.adresse,
        o.livraison.lieu,
        o.livraison.frais,
        o.paiement?.methode || 'À la livraison',
        o.paiement?.statut || 'En attente',
        o.paiement?.reference || '',
        o.statut,
        itemsList,
        o.total
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const text = String(val).replace(/"/g, '""');
        return text.includes(",") || text.includes("\n") || text.includes('"') ? `"${text}"` : text;
      }).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `commandes_${activeBoutique.slug}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Caisse handlers ──────────────────────────────────────────────────────
  const addToPos = (prod) => {
    setPosCart(prev => {
      const ex = prev.find(i => i.id === prod.id);
      if (ex) {
        if (ex.quantity >= prod.stock) return prev;
        return prev.map(i => i.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...prod, quantity: 1 }];
    });
  };

  const updatePosQty = (id, delta) => {
    setPosCart(prev =>
      prev.map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
          .filter(i => i.quantity > 0)
    );
  };

  const handlePosSell = () => {
    if (posCart.length === 0) { alert('Ajoutez au moins un article.'); return; }
    if (!posClientForm.nom.trim() || !posClientForm.telephone.trim()) {
      alert('Nom et téléphone du client sont obligatoires.');
      return;
    }
    const orderId = `VD-${Math.floor(1000 + Math.random() * 9000)}`;
    const posSubtotal = posCart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    createOrder(
      activeBoutique.id,
      posClientForm,
      posCart,
      0,
      'Vente directe',
      { methode: posPayMethod, statut: posPayStatut, note: posNote }
    );
    setPosSaleSuccess({ orderId, items: posCart, total: posSubtotal, client: { ...posClientForm }, payMethod: posPayMethod });
    setPosCart([]);
    setPosClientForm({ nom: '', telephone: '', adresse: '' });
    setPosNote('');
  };

  const handlePosPrintInvoice = (sale) => {
    if (!sale) return;
    setActivePrintInvoice({
      id: sale.orderId,
      date: new Date().toISOString(),
      client: sale.client,
      items: sale.items,
      total: sale.total,
      livraison: { frais: 0, lieu: 'Vente directe' },
      paiement: { methode: sale.payMethod, statut: sale.payStatut || 'Payé' }
    });
  };

  const handlePosSendWhatsApp = (sale) => {
    if (!sale) return;
    let msg = `*🧾 REÇU DE VENTE — ${activeBoutique.name.toUpperCase()}*\n`;
    msg += `_Réf: ${sale.orderId}_\n`;
    msg += `_Date: ${new Date().toLocaleDateString('fr-FR')}_\n\n`;
    msg += `*👤 CLIENT:* ${sale.client.nom} — ${sale.client.telephone}\n\n`;
    msg += `*🛍️ ARTICLES:*\n`;
    sale.items.forEach(i => { msg += `• ${i.quantity}× ${i.name} → ${formatMoney(i.price * i.quantity)}\n`; });
    msg += `\n*💵 TOTAL: ${formatMoney(sale.total)}*\n`;
    msg += `• Paiement: ${sale.payMethod}\n\n`;
    msg += `🙏 Merci pour votre achat chez ${activeBoutique.name} !`;
    const phone = sale.client.telephone.replace(/\D/g, '');
    const finalPhone = phone.startsWith('221') ? phone : '221' + phone;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    updateBoutique(activeBoutique.id, settingsForm);
    alert('Boutique mise à jour avec succès !');
  };

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketForm.sujet || !ticketForm.message) return;
    addTicket(activeBoutique.id, ticketForm);
    setTicketForm({ sujet: '', message: '' });
    alert("Votre ticket a été envoyé à l'équipe technique !");
  };

  const activeTickets = tickets.filter(t => t.boutiqueId === activeBoutique.id);

  // Format currencies
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-slate-950">
                KS
              </div>
              <span className="font-bold tracking-tight text-teal-400">Merchant Console</span>
            </Link>
          </div>

          {/* Store Switcher */}
          <div className="p-4 border-b border-slate-850">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Boutique Active</label>
            <div className="relative">
              <select
                value={currentMerchantBoutiqueId}
                onChange={(e) => setCurrentMerchantBoutiqueId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {myBoutiques.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.logo && (b.logo.startsWith('/') || b.logo.startsWith('http') || b.logo.startsWith('data:image')) ? '🛍️' : b.logo || '🛍️'} {b.name}
                  </option>
                ))}
              </select>
            </div>
            <Link 
              to={`/shop/${activeBoutique.slug}`} 
              target="_blank"
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold mt-2 flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Voir la vitrine publique
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'}`}
            >
              <LayoutDashboard className="w-4 h-4" /> Tableau de bord
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'products' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'}`}
            >
              <ShoppingBag className="w-4 h-4" /> Produits
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'orders' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'}`}
            >
              <ClipboardList className="w-4 h-4" /> Commandes
              {pendingOrders > 0 && (
                <span className="ml-auto bg-teal-500 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  {pendingOrders}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('caisse')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'caisse' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'}`}
            >
              <Receipt className="w-4 h-4" /> Caisse / Vente directe
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'settings' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'}`}
            >
              <Settings className="w-4 h-4" /> Configuration
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'support' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'}`}
            >
              <MessageSquare className="w-4 h-4" /> Support Technique
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {merchantUser && (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-900/50 rounded-xl border border-slate-850">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-bold text-slate-950 text-xs shrink-0">
                {merchantUser.email[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-slate-200 truncate">{merchantUser.displayName || 'Boutique'}</span>
                <span className="block text-[9px] text-slate-500 truncate font-mono">{merchantUser.email}</span>
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              if (confirm('Voulez-vous vous déconnecter de votre session ?')) {
                logoutMerchant();
              }
            }}
            className="w-full px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-950/20 hover:text-red-400 transition-all flex items-center gap-3 cursor-pointer border border-transparent hover:border-red-500/10"
          >
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl">
        {/* Banner with shop info */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-3xl shadow-inner overflow-hidden">
              {activeBoutique.logo && (activeBoutique.logo.startsWith('/') || activeBoutique.logo.startsWith('http') || activeBoutique.logo.startsWith('data:image')) ? (
                <img src={activeBoutique.logo} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                activeBoutique.logo || '🛍️'
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100">{activeBoutique.name}</h2>
              <p className="text-sm text-slate-400 mt-1 max-w-lg leading-relaxed">{activeBoutique.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-850 text-xs font-semibold text-slate-400">
              Plan: <span className="text-teal-400 font-bold">{activeBoutique.abonnement?.plan || 'Découverte'}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-850 text-xs font-semibold text-slate-400">
              Devise: <span className="text-teal-400">{activeBoutique.devise}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-850 text-xs font-semibold text-slate-400">
              WhatsApp: <span className="text-teal-400">{activeBoutique.whatsapp}</span>
            </div>
          </div>
        </div>

        {/* Alerte expiration abonnement */}
        {subscriptionExpired && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-red-950/30 border border-red-500/30 text-red-300">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-bold text-sm text-red-300">Abonnement expiré</p>
              <p className="text-xs text-red-400/80 mt-0.5">
                Votre abonnement <strong>{activeBoutique.abonnement?.plan}</strong> a expiré. Votre vitrine est suspendue et inaccessible aux clients. Renouvelez votre forfait dans <strong>Configuration → Forfait</strong> ou contactez l'administrateur.
              </p>
            </div>
          </div>
        )}
        {!subscriptionExpired && subscriptionExpiresSoon && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-300">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-bold text-sm text-amber-300">Abonnement bientôt expiré</p>
              <p className="text-xs text-amber-400/80 mt-0.5">
                Votre abonnement <strong>{activeBoutique.abonnement?.plan}</strong> expire le <strong>{new Date(activeBoutique.abonnement.dateExpiration).toLocaleDateString('fr-FR')}</strong>. Renouvelez-le rapidement pour éviter la suspension de votre vitrine.
              </p>
            </div>
          </div>
        )}

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-between relative overflow-hidden group hover:border-slate-750 transition-all">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Revenus Payés/Livrés</span>
                  <h3 className="text-2xl md:text-3xl font-black text-white">{formatMoney(totalRevenue)}</h3>
                  <p className="text-[10px] text-teal-400 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Simulation locale</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-between relative overflow-hidden group hover:border-slate-750 transition-all">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Commandes en attente</span>
                  <h3 className="text-2xl md:text-3xl font-black text-white">{pendingOrders}</h3>
                  <p className="text-[10px] text-slate-400">À préparer & livrer</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-between relative overflow-hidden group hover:border-slate-750 transition-all">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alertes de Stock Bas</span>
                  <h3 className="text-2xl md:text-3xl font-black text-white">{lowStockProducts}</h3>
                  <p className="text-[10px] text-amber-500 flex items-center gap-1">Stock &le; 3 unités</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lowStockProducts > 0 ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 'bg-slate-900 text-slate-600'}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-between relative overflow-hidden group hover:border-slate-750 transition-all">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Panier Moyen</span>
                  <h3 className="text-2xl font-black text-white">{formatMoney(panierMoyen)}</h3>
                  <p className="text-[10px] text-slate-400">Par commande encaissée</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-between relative overflow-hidden group hover:border-slate-750 transition-all">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Articles Vendus</span>
                  <h3 className="text-2xl font-black text-white">{totalItemsSold} pcs</h3>
                  <p className="text-[10px] text-slate-400">Toutes ventes payées</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-between relative overflow-hidden group hover:border-slate-750 transition-all">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Taux de Conversion</span>
                  <h3 className="text-2xl font-black text-white">{conversionRate} %</h3>
                  <p className="text-[10px] text-slate-400">Visites vs Commandes</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>
            
            {/* Sales Chart Section */}
            <SalesChart activeOrders={activeOrders} isLocked={activeBoutique.abonnement?.plan === 'Découverte'} />

            {/* Quick Actions & Recent Orders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Quick Actions */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850 space-y-4">
                <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
                  <Store className="w-5 h-5 text-teal-400" /> Actions Rapides
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={openAddProduct}
                    className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> Ajouter un produit
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 font-semibold transition-all border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-4 h-4" /> Personnaliser le thème
                  </button>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="md:col-span-2 p-6 rounded-2xl bg-slate-950 border border-slate-850 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-teal-400" /> Commandes Récentes
                  </h3>
                  <button 
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold transition-colors"
                  >
                    Voir tout
                  </button>
                </div>

                <div className="space-y-3">
                  {activeOrders.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">
                      Aucune commande reçue pour l'instant.
                    </div>
                  ) : (
                    activeOrders.slice(0, 3).map((order) => (
                      <div key={order.id} className="p-4 rounded-xl bg-slate-900 border border-slate-850 hover:border-slate-800 transition-all flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-slate-200">{order.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              order.statut === 'Reçue' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              order.statut === 'Préparée' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              order.statut === 'Livrée' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            }`}>
                              {order.statut}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {order.client.nom} ({order.client.telephone}) &bull; {new Date(order.date).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-200">{formatMoney(order.total)}</span>
                          <span className="block text-[9px] text-slate-500 mt-0.5">{order.items.length} article(s)</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Performance & Répartition Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Payment Methods Breakdown */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-teal-400" /> Répartition des Encaissements
                  </h3>
                  <p className="text-xs text-slate-550">Modes de paiement préférés de vos clients.</p>
                </div>
                
                <div className="space-y-4 my-auto">
                  {/* Wave */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-350">Wave Mobile Money</span>
                      <span className="font-bold text-sky-400">{paymentBreakdown.wave.percent}% ({formatMoney(paymentBreakdown.wave.amount)})</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full" style={{ width: `${paymentBreakdown.wave.percent}%` }} />
                    </div>
                  </div>

                  {/* OM */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-355">Orange Money</span>
                      <span className="font-bold text-orange-400">{paymentBreakdown.om.percent}% ({formatMoney(paymentBreakdown.om.amount)})</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full" style={{ width: `${paymentBreakdown.om.percent}%` }} />
                    </div>
                  </div>

                  {/* Cash */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-355">À la livraison (Espèces)</span>
                      <span className="font-bold text-teal-400">{paymentBreakdown.cash.percent}% ({formatMoney(paymentBreakdown.cash.amount)})</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full" style={{ width: `${paymentBreakdown.cash.percent}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Selling Products */}
              <div className="md:col-span-2 p-6 rounded-2xl bg-slate-950 border border-slate-850 space-y-4 text-left">
                <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" /> Vos Meilleurs Produits (Top Ventes)
                </h3>
                <p className="text-xs text-slate-550 mt-0.5">Les 3 articles les plus vendus de votre catalogue.</p>

                <div className="space-y-3">
                  {topProducts.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      Aucune commande payée/livrée pour calculer les best-sellers.
                    </div>
                  ) : (
                    topProducts.map((p, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-850 hover:border-slate-800 transition-all flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img src={p.photo} alt={p.name} className="w-11 h-11 rounded-lg object-cover bg-slate-900 border border-slate-800" />
                          <div>
                            <span className="font-bold text-xs text-slate-200 block">{p.name}</span>
                            <span className="text-[10px] text-slate-500">Rang: #{idx + 1} Best-Seller</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-200 text-sm block">{p.quantitySold} pcs vendus</span>
                          <span className="text-[10px] text-teal-400 font-mono">CA: {formatMoney(p.totalSales)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-xl text-slate-100">Catalogue Produits ({activeProducts.length})</h3>
                <p className="text-slate-400 text-xs mt-0.5">Gérez vos articles, prix, photos et stocks.</p>
              </div>
              <button
                onClick={openAddProduct}
                className="py-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Nouveau Produit
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProducts.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-850 flex flex-col justify-between hover:border-slate-800 transition-all group relative">
                  <div>
                    {/* Image */}
                    <div className="w-full h-44 rounded-xl bg-slate-900 border border-slate-850 overflow-hidden relative mb-4">
                      <img 
                        src={p.photo} 
                        alt={p.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                      />
                      {p.stock <= 3 && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Stock Bas: {p.stock}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-teal-400 font-bold tracking-wider uppercase">{p.category}</span>
                      <h4 className="font-bold text-slate-200 text-base line-clamp-1">{p.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 min-h-[2rem] leading-relaxed">{p.description}</p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-850/80 flex items-center justify-between">
                    <div>
                      <span className="block text-[9px] uppercase tracking-widest text-slate-500 font-semibold">Prix de vente</span>
                      <span className="text-lg font-black text-slate-100">{formatMoney(p.price)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-widest text-slate-500 font-semibold text-right">Stock restant</span>
                      <span className={`text-sm font-bold block text-right ${p.stock === 0 ? 'text-red-400' : p.stock <= 3 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {p.stock === 0 ? 'Épuisé' : `${p.stock} pcs`}
                      </span>
                    </div>
                  </div>

                  {/* Actions overlay / bottom */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-850/40">
                    <button
                      onClick={() => openEditProduct(p)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Modifier
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Voulez-vous supprimer ce produit ?')) deleteProduct(p.id);
                      }}
                      className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-950/20 text-red-400 hover:bg-red-950/40 transition-colors border border-red-500/10 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {activeProducts.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-700 mb-3" />
                  <p className="font-bold">Aucun produit disponible</p>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">Ajoutez votre premier article pour qu'il apparaisse instantanément sur votre vitrine publique.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-extrabold text-xl text-slate-100">Gestion des Commandes ({activeOrders.length})</h3>
              <p className="text-slate-400 text-xs mt-0.5">Suivez le statut de préparation, livraison et encaissement.</p>
            </div>

            {/* Search and Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-850 shadow-md">
              <div className="md:col-span-1">
                <input
                  type="text"
                  placeholder="Rechercher un client, tél ou n°..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-teal-500 text-slate-200 placeholder-slate-500 transition-colors"
                />
              </div>
              <div className="flex gap-4 md:col-span-2 justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Statut:</span>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="Tous">Tous les statuts</option>
                    <option value="Reçue">Reçue</option>
                    <option value="Préparée">Préparée</option>
                    <option value="Livrée">Livrée</option>
                    <option value="Payée">Payée / Terminée</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Paiement:</span>
                  <select
                    value={orderPaymentFilter}
                    onChange={(e) => setOrderPaymentFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="Tous">Tous les paiements</option>
                    <option value="En attente">En attente</option>
                    <option value="Payé">Payé</option>
                  </select>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all shrink-0 font-sans"
                  title="Exporter toutes les commandes de la boutique au format CSV"
                >
                  <Save className="w-3.5 h-3.5" /> Exporter CSV
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {(() => {
                const filteredOrders = activeOrders.filter(order => {
                  const matchesSearch = 
                    order.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                    order.client.nom.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                    order.client.telephone.includes(orderSearchQuery);
                    
                  const matchesStatus = orderStatusFilter === 'Tous' || order.statut === orderStatusFilter;
                  const matchesPayment = orderPaymentFilter === 'Tous' || (order.paiement?.statut || 'En attente') === orderPaymentFilter;
                  
                  return matchesSearch && matchesStatus && matchesPayment;
                });

                return (
                  <>
                    {filteredOrders.map((order) => (
                <div key={order.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-850 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-200 text-base">{order.id}</span>
                        <span className="text-xs text-slate-500">&bull; {new Date(order.date).toLocaleDateString('fr-FR')} à {new Date(order.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
                        Client: <strong className="text-slate-200">{order.client.nom}</strong> &bull;
                        Tél: <span className="text-teal-400">{order.client.telephone}</span> &bull;
                        Lieu: <span className="text-slate-300">{order.client.adresse} ({order.livraison.lieu})</span> &bull;
                        Paiement: <strong className="text-slate-300">{order.paiement?.methode || 'À la livraison'}</strong>
                        <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          order.paiement?.statut === 'Payé'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {order.paiement?.statut || 'En attente'}
                        </span>
                        {order.paiement?.reference && (
                          <span className="text-[10px] text-slate-550 font-mono">({order.paiement.reference})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">Statut de la commande :</span>
                      <select
                        value={order.statut}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none cursor-pointer border ${
                          order.statut === 'Reçue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          order.statut === 'Préparée' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          order.statut === 'Livrée' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          'bg-teal-500/10 text-teal-400 border-teal-500/20'
                        }`}
                      >
                        <option value="Reçue">Reçue (En attente)</option>
                        <option value="Préparée">Préparée (À livrer)</option>
                        <option value="Livrée">Livrée (Chez le client)</option>
                        <option value="Payée">Payée (Terminée)</option>
                      </select>

                      <a 
                        href={`https://wa.me/${order.client.telephone.replace(/\s+/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors flex items-center gap-1 text-xs font-bold"
                        title="Contacter le client sur WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" /> Client
                      </a>

                      <button 
                        onClick={() => {
                          if (activeBoutique.abonnement?.plan === 'Découverte') {
                            setShowUpgradeModal(true);
                          } else {
                            setActivePrintInvoice(order);
                          }
                        }}
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer animate-fade-in"
                        title="Imprimer la Facture / Reçu"
                      >
                        {activeBoutique.abonnement?.plan === 'Découverte' ? (
                          <><Lock className="w-3.5 h-3.5 text-amber-500" /> <span className="text-slate-400 font-medium">Facture</span></>
                        ) : (
                          <><Printer className="w-4 h-4 text-teal-400" /> <span className="text-slate-300 font-medium">Facture</span></>
                        )}
                      </button>

                      {order.paiement?.statut !== 'Payé' && (
                        <button
                          onClick={() => {
                            if (confirm('Confirmer le règlement de cette commande ?')) {
                              updateOrderPaymentStatus(order.id, 'Payé');
                            }
                          }}
                          className="p-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer animate-pulse"
                          title="Marquer comme Payé"
                        >
                          <Check className="w-4 h-4 stroke-[3]" /> Encaissé
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Articles Commandés</h4>
                      <div className="divide-y divide-slate-900 bg-slate-900/40 rounded-xl border border-slate-850/50 p-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                            <div className="text-slate-300">
                              <span className="font-bold text-teal-400">{item.quantity}x</span> {item.name}
                            </div>
                            <span className="font-mono text-slate-400">{formatMoney(item.price)} / u</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Détails Financiers</h4>
                      <div className="bg-slate-900/40 rounded-xl border border-slate-850/50 p-4 space-y-2 text-sm">
                        <div className="flex justify-between text-slate-400">
                          <span>Sous-total :</span>
                          <span className="font-mono">{formatMoney(order.total - order.livraison.frais)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Frais livraison :</span>
                          <span className="font-mono">{formatMoney(order.livraison.frais)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-200 border-t border-slate-900 pt-2 text-base">
                          <span>Total :</span>
                          <span className="text-teal-400 font-black">{formatMoney(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

                    {filteredOrders.length === 0 && (
                      <div className="py-16 text-center text-slate-550 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                        <ClipboardList className="w-12 h-12 mx-auto text-slate-700 mb-3" />
                        <p className="font-bold">Aucune commande trouvée</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {activeOrders.length === 0 
                            ? "Les commandes passées par vos clients sur la vitrine apparaîtront ici."
                            : "Aucune commande ne correspond à vos filtres de recherche."}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* 4. CAISSE / POS TAB */}
        {activeTab === 'caisse' && (() => {
          const posProducts = activeProducts.filter(p => p.actif && p.stock > 0 && p.name.toLowerCase().includes(posSearch.toLowerCase()));
          const posSubtotal = posCart.reduce((acc, item) => acc + item.price * item.quantity, 0);
          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-teal-400" /> Caisse — Vente Directe
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Clients en boutique, par téléphone, ou toute vente hors site.</p>
                </div>
              </div>

              {/* Success banner */}
              {posSaleSuccess && (
                <div className="p-5 rounded-2xl bg-emerald-950/60 border border-emerald-700/40 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-extrabold text-emerald-300 text-sm">Vente enregistrée — Réf. {posSaleSuccess.orderId}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {posSaleSuccess.client.nom} · {posSaleSuccess.items.length} article(s) · {formatMoney(posSaleSuccess.total)} · {posSaleSuccess.payMethod}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => handlePosPrintInvoice(posSaleSuccess)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Imprimer facture
                    </button>
                    <button
                      onClick={() => handlePosSendWhatsApp(posSaleSuccess)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Reçu WhatsApp
                    </button>
                    <button
                      onClick={() => setPosSaleSuccess(null)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* LEFT — Product picker */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-850 shadow-xl space-y-4">
                    <h3 className="font-extrabold text-slate-200 text-sm flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-teal-400" /> Catalogue
                    </h3>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        value={posSearch}
                        onChange={e => setPosSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                      {posProducts.map(prod => {
                        const inCart = posCart.find(i => i.id === prod.id);
                        return (
                          <button
                            key={prod.id}
                            onClick={() => addToPos(prod)}
                            disabled={inCart?.quantity >= prod.stock}
                            className={`text-left rounded-xl border p-3 transition-all cursor-pointer group ${
                              inCart ? 'border-teal-500/50 bg-teal-500/5' : 'border-slate-800 bg-slate-900 hover:border-slate-600 hover:bg-slate-850'
                            } ${inCart?.quantity >= prod.stock ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <img src={prod.photo} alt={prod.name} className="w-full h-24 object-cover rounded-lg mb-2 bg-slate-800" />
                            <p className="text-xs font-bold text-slate-200 line-clamp-1">{prod.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Stock: {prod.stock}</p>
                            <p className="text-xs font-black text-teal-400 mt-1">{formatMoney(prod.price)}</p>
                            {inCart && (
                              <span className="mt-1.5 inline-block text-[9px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full">
                                {inCart.quantity} dans panier
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {posProducts.length === 0 && (
                        <div className="col-span-3 py-12 text-center text-slate-500 text-sm">
                          Aucun produit disponible en stock.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT — Cart + client + payment */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Cart */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-850 shadow-xl space-y-3">
                    <h3 className="font-extrabold text-slate-200 text-sm flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-teal-400" /> Panier
                      {posCart.length > 0 && (
                        <span className="ml-auto text-[10px] font-bold text-slate-500 cursor-pointer hover:text-red-400 transition-colors" onClick={() => setPosCart([])}>
                          Vider
                        </span>
                      )}
                    </h3>
                    {posCart.length === 0 ? (
                      <p className="text-xs text-slate-600 text-center py-6">Cliquez sur un produit pour l'ajouter.</p>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {posCart.map(item => (
                          <div key={item.id} className="flex items-center gap-3 bg-slate-900 rounded-xl px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-200 truncate">{item.name}</p>
                              <p className="text-[10px] text-slate-500">{formatMoney(item.price)} / u</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => updatePosQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black text-slate-100 w-5 text-center">{item.quantity}</span>
                              <button onClick={() => updatePosQty(item.id, 1)} disabled={item.quantity >= item.stock} className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer disabled:opacity-40">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-xs font-black text-teal-400 w-20 text-right shrink-0">{formatMoney(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {posCart.length > 0 && (
                      <div className="flex justify-between border-t border-slate-800 pt-3 text-sm font-black">
                        <span className="text-slate-400">Total</span>
                        <span className="text-teal-300">{formatMoney(posSubtotal)}</span>
                      </div>
                    )}
                  </div>

                  {/* Client info */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-850 shadow-xl space-y-3">
                    <h3 className="font-extrabold text-slate-200 text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-teal-400" /> Informations Client
                    </h3>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="Nom complet *"
                        value={posClientForm.nom}
                        onChange={e => setPosClientForm(p => ({ ...p, nom: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="Téléphone *"
                        value={posClientForm.telephone}
                        onChange={e => setPosClientForm(p => ({ ...p, telephone: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Adresse (optionnel)"
                        value={posClientForm.adresse}
                        onChange={e => setPosClientForm(p => ({ ...p, adresse: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Payment method */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-850 shadow-xl space-y-3">
                    <h3 className="font-extrabold text-slate-200 text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-teal-400" /> Paiement
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {['Espèces', 'Wave', 'Orange Money', 'Crédit'].map(m => (
                        <button
                          key={m}
                          onClick={() => setPosPayMethod(m)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            posPayMethod === m
                              ? 'border-teal-500 bg-teal-500/10 text-teal-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['Payé', 'En attente'].map(s => (
                        <button
                          key={s}
                          onClick={() => setPosPayStatut(s)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            posPayStatut === s
                              ? s === 'Payé'
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                : 'border-amber-500 bg-amber-500/10 text-amber-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {s === 'Payé' ? '✓ Payé' : '⏳ En attente'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Note interne (optionnel)"
                      value={posNote}
                      onChange={e => setPosNote(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 placeholder-slate-600 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Confirm button */}
                  <button
                    onClick={handlePosSell}
                    disabled={posCart.length === 0 || !posClientForm.nom || !posClientForm.telephone}
                    className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-teal-500/20 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-4 h-4" />
                    Enregistrer la vente
                    {posCart.length > 0 && ` — ${formatMoney(posSubtotal)}`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 4. SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850 shadow-xl space-y-6">
            <div>
              <h3 className="font-extrabold text-xl text-slate-100">Configuration de votre Boutique</h3>
              <p className="text-slate-400 text-xs mt-0.5">Personnalisez l'identité visuelle et les coordonnées de commande.</p>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-6 max-w-2xl">
              {/* Logo customizer section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-slate-900/40 p-5 rounded-2xl border border-slate-850">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Aperçu du Logo</span>
                  <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-4xl shadow-inner overflow-hidden">
                    {settingsForm.logo.startsWith('data:image') || settingsForm.logo.startsWith('/') || settingsForm.logo.startsWith('http') ? (
                      <img src={settingsForm.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      settingsForm.logo
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4 font-sans">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Importer une image logo{logoUploading && <span className="ml-2 text-teal-400 animate-pulse">Upload en cours…</span>}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={logoUploading}
                      onChange={handleLogoUpload}
                      className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500/10 file:text-teal-400 hover:file:bg-teal-500/20 file:cursor-pointer disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Ou saisir un Émoji / URL Image</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.logo}
                      onChange={(e) => setSettingsForm({ ...settingsForm, logo: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 text-sm font-sans"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-sans">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nom de la boutique</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">WhatsApp (Recevoir les commandes)</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.whatsapp}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-sans">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email de Contact</label>
                  <input
                    type="email"
                    placeholder="contact@maboutique.sn"
                    value={settingsForm.emailContact}
                    onChange={(e) => setSettingsForm({ ...settingsForm, emailContact: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Instagram (@compte)</label>
                  <input
                    type="text"
                    placeholder="ex: mon_style"
                    value={settingsForm.instagram}
                    onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Facebook (Nom page)</label>
                  <input
                    type="text"
                    placeholder="ex: PageOfficielle"
                    value={settingsForm.facebook}
                    onChange={(e) => setSettingsForm({ ...settingsForm, facebook: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="font-sans">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description / Slogan</label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 transition-colors text-sm"
                />
              </div>

              <div className="font-sans">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Message de remerciement client (WhatsApp)</label>
                <textarea
                  value={settingsForm.texteRemerciement}
                  onChange={(e) => setSettingsForm({ ...settingsForm, texteRemerciement: e.target.value })}
                  rows={2}
                  placeholder="Ce texte s'ajoutera à la fin du panier WhatsApp envoyé par le client..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 transition-colors text-sm"
                />
                <span className="text-[10px] text-slate-500 block mt-1">S'affiche sur le message de fin et récapitulatif WhatsApp.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-sans">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Adresse / Boutique Physique</label>
                  <input
                    type="text"
                    value={settingsForm.adresse}
                    onChange={(e) => setSettingsForm({ ...settingsForm, adresse: e.target.value })}
                    placeholder="Ex: HLM 5, Dakar"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Couleur de la marque (Thème)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settingsForm.couleurMarque}
                      onChange={(e) => setSettingsForm({ ...settingsForm, couleurMarque: e.target.value })}
                      className="w-12 h-12 bg-transparent border-0 rounded cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={settingsForm.couleurMarque}
                      onChange={(e) => setSettingsForm({ ...settingsForm, couleurMarque: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 transition-colors font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Zones customizer */}
              <div className="border-t border-slate-900 pt-6 space-y-4">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-200">Zones & Frais de livraison</h4>
                  <p className="text-slate-500 text-xs mt-0.5">Définissez vos tarifs de livraison personnalisés par secteur géographique.</p>
                </div>
                
                <div className="space-y-3">
                  {settingsForm.zonesLivraison?.map((zone, index) => (
                    <div key={zone.id} className="flex flex-col sm:flex-row gap-3 items-center bg-slate-900/60 p-3.5 rounded-xl border border-slate-850">
                      <div className="flex-1 w-full">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Secteur / Nom de la zone</label>
                        <input
                          type="text"
                          required
                          value={zone.label}
                          placeholder="Nom de la zone (ex: Dakar Plateau...)"
                          onChange={(e) => {
                            const updated = settingsForm.zonesLivraison.map((z, idx) => 
                              idx === index ? { ...z, label: e.target.value } : z
                            );
                            setSettingsForm({ ...settingsForm, zonesLivraison: updated });
                          }}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 text-xs"
                        />
                      </div>
                      <div className="w-full sm:w-36">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Délai estimé</label>
                        <input
                          type="text"
                          required
                          value={zone.delai || ''}
                          placeholder="Ex: Sous 24h, 2 jours..."
                          onChange={(e) => {
                            const updated = settingsForm.zonesLivraison.map((z, idx) => 
                              idx === index ? { ...z, delai: e.target.value } : z
                            );
                            setSettingsForm({ ...settingsForm, zonesLivraison: updated });
                          }}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 text-xs"
                        />
                      </div>
                      <div className="w-full sm:w-28">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tarif (FCFA)</label>
                        <input
                          type="number"
                          required
                          value={zone.price}
                          placeholder="Frais"
                          onChange={(e) => {
                            const updated = settingsForm.zonesLivraison.map((z, idx) => 
                              idx === index ? { ...z, price: Number(e.target.value) } : z
                            );
                            setSettingsForm({ ...settingsForm, zonesLivraison: updated });
                          }}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 text-xs font-mono text-right"
                        />
                      </div>
                      <div className="self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = settingsForm.zonesLivraison.filter((_, idx) => idx !== index);
                            setSettingsForm({ ...settingsForm, zonesLivraison: updated });
                          }}
                          className="p-2 mt-4 sm:mt-0 rounded-xl bg-red-950/20 text-red-400 hover:bg-red-950/40 transition-colors border border-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const newZone = { id: `zone-${Date.now()}`, label: '', price: 1000, delai: 'Sous 24h' };
                      setSettingsForm({ 
                        ...settingsForm, 
                        zonesLivraison: [...(settingsForm.zonesLivraison || []), newZone] 
                      });
                    }}
                    className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer mt-2"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Ajouter une zone
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900">
                <button
                  type="submit"
                  className="py-3 px-6 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Enregistrer les modifications
                </button>
              </div>
            </form>

            {/* Upgrade Plan Billing Section in Settings */}
            <div className="mt-8 p-6 rounded-2xl bg-slate-950 border border-slate-850 space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-200">Forfait & Facturation de la Boutique</h4>
                <p className="text-slate-550 text-xs mt-0.5">Consultez votre plan d'abonnement actuel et débloquez de nouvelles fonctionnalités.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl bg-slate-900 border border-slate-850 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Forfait Actuel</span>
                  <span className="text-sm font-black text-teal-400 block mt-0.5">{activeBoutique.abonnement?.plan || 'Découverte'}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {activeBoutique.abonnement?.plan === 'Découverte' || !activeBoutique.abonnement?.plan 
                      ? 'Limité à 5 produits, factures PDF verrouillées et analyses masquées.'
                      : 'Accès illimité aux fonctionnalités, rapports de ventes et factures PDF.'}
                  </span>
                </div>
                
                {(activeBoutique.abonnement?.plan === 'Découverte' || !activeBoutique.abonnement?.plan) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentSuccess(false);
                      setPaymentPhone('');
                      setShowProductLimitModal(true);
                    }}
                    className="py-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer transition-all shadow"
                  >
                    Activer un forfait Premium / Pro
                  </button>
                )}
              </div>

              {/* Display pending upgrade requests */}
              {upgradeRequests.filter(req => req.boutiqueId === activeBoutique.id && req.statut === 'En attente').length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex items-center gap-2 animate-pulse">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Vous avez une demande de paiement en attente de validation par l'administrateur.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4.5. SUPPORT TAB */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* New Ticket Form */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-850 shadow-xl space-y-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-100">Signaler un Problème / Bug</h3>
                <p className="text-slate-500 text-xs mt-0.5">Notre équipe technique résoudra votre demande dans les plus brefs délais.</p>
              </div>

              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sujet du problème</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bug affichage prix, lenteur..."
                    value={ticketForm.sujet}
                    onChange={(e) => setTicketForm({ ...ticketForm, sujet: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description détaillée</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Expliquez ce qui s'est passé, l'appareil utilisé..."
                    value={ticketForm.message}
                    onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 transition-colors text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Envoyer le ticket
                </button>
              </form>
            </div>

            {/* Existing Tickets List */}
            <div className="md:col-span-2 p-6 rounded-2xl bg-slate-950 border border-slate-850 shadow-xl space-y-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-100">Historique des demandes ({activeTickets.length})</h3>
                <p className="text-slate-500 text-xs mt-0.5">Suivez l'avancement des corrections techniques demandées.</p>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {activeTickets.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    Vous n'avez soumis aucun ticket pour l'instant. Tout fonctionne parfaitement !
                  </div>
                ) : (
                  activeTickets.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-slate-900 border border-slate-850 space-y-2 hover:border-slate-800 transition-all">
                      <div className="flex justify-between items-start gap-3">
                        <h4 className="font-bold text-slate-200 text-sm leading-snug">{t.sujet}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                          t.statut === 'En attente' 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : t.statut === 'En cours'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {t.statut}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{t.message}</p>
                      
                      {t.reponse && (
                        <div className="mt-3 p-3 rounded-xl bg-teal-950/25 border border-teal-500/15 text-xs space-y-1 animate-fade-in">
                          <span className="font-extrabold text-teal-400 uppercase tracking-wider text-[8px] block">Réponse du Support Technique :</span>
                          <p className="text-slate-350 italic">"{t.reponse}"</p>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                        <span>Réf: {t.id}</span>
                        <span>Envoyé le {new Date(t.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 5. ADD/EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative">
            <h3 className="text-xl font-bold mb-1">{editingProduct ? 'Modifier le produit' : 'Nouveau Produit'}</h3>
            <p className="text-slate-400 text-xs mb-5">Décrivez votre produit pour la vitrine.</p>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nom du produit</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tunique Ndiakhass"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 placeholder-slate-650"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Prix de vente (FCFA)</label>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 15000"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 placeholder-slate-650"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Stock initial</label>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 10"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 placeholder-slate-650"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Catégorie</label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-200"
                >
                  <option value="Vêtements">Vêtements / Prêt-à-porter</option>
                  <option value="Chaussures">Chaussures & Sandales</option>
                  <option value="Sacs">Sacs & Maroquinerie (Ngaye...)</option>
                  <option value="Accessoires">Bijoux & Accessoires</option>
                  <option value="Lunettes">Lunettes & Optique</option>
                  <option value="Encens">Encens & Thiouraye</option>
                  <option value="Cosmétiques">Cosmétiques & Beauté</option>
                  <option value="Électronique">Électronique & Téléphones</option>
                  <option value="Alimentation">Alimentation & Produits Locaux</option>
                  <option value="Divers">Divers</option>
                </select>
              </div>

              <div className="space-y-3 p-4 rounded-2xl bg-slate-950/40 border border-slate-850">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Photo du produit</label>
                  {productForm.photo && (
                    <span className="text-[10px] text-teal-400 font-bold">Image configurée ✓</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Importer une photo réelle</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProductPhotoUpload}
                    className="w-full text-xs text-slate-450 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-teal-500/10 file:text-teal-400 hover:file:bg-teal-500/20 file:cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Ou coller un lien URL d'image</label>
                  <input
                    type="text"
                    placeholder="Laisser vide pour image par défaut"
                    value={productForm.photo}
                    onChange={(e) => setProductForm({ ...productForm, photo: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 text-slate-200 text-xs placeholder-slate-650"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description détaillée</label>
                <textarea
                  placeholder="Décrivez les couleurs, les tailles disponibles, les conseils d'utilisation..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 placeholder-slate-650"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-white transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-colors cursor-pointer"
                >
                  {editingProduct ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. PRINT INVOICE MODAL */}
      {activePrintInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white text-slate-800 p-8 rounded-2xl shadow-2xl relative space-y-6 my-8">
            {/* Action buttons (hidden on print) */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 no-print">
              <h3 className="font-extrabold text-lg text-slate-900">Impression de la Facture</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSendInvoiceWhatsApp}
                  className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all flex items-center gap-2 cursor-pointer no-print text-xs"
                >
                  <MessageSquare className="w-4.5 h-4.5" /> Envoyer par WhatsApp
                </button>
                <button
                  onClick={() => window.print()}
                  className="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-750 text-white font-bold transition-all flex items-center gap-2 cursor-pointer text-xs"
                >
                  <Printer className="w-4 h-4" /> Imprimer / Sauvegarder PDF
                </button>
                <button
                  onClick={() => setActivePrintInvoice(null)}
                  className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold transition-all cursor-pointer text-xs"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* Printable Invoice Page */}
            <div id="print-area" className="bg-white p-2 text-slate-800">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-150 pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                      {activeBoutique.logo && (activeBoutique.logo.startsWith('/') || activeBoutique.logo.startsWith('http') || activeBoutique.logo.startsWith('data:image')) ? (
                        <img src={activeBoutique.logo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        activeBoutique.logo || '🛍️'
                      )}
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">{activeBoutique.name}</h1>
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm">{activeBoutique.description}</p>
                  {activeBoutique.adresse && <p className="text-xs text-slate-500">{activeBoutique.adresse}</p>}
                  <p className="text-xs text-slate-500">Contact: {activeBoutique.whatsapp}</p>
                </div>
                
                <div className="text-right space-y-1">
                  <h2 className="text-xl font-black text-slate-950 uppercase">FACTURE</h2>
                  <p className="text-xs font-mono font-bold text-slate-600">Réf: {activePrintInvoice.id}</p>
                  <p className="text-xs text-slate-500">Date: {new Date(activePrintInvoice.date).toLocaleDateString('fr-FR')}</p>
                  <p className="text-xs text-slate-500">Heure: {new Date(activePrintInvoice.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>

              {/* Client Info */}
              <div className="my-6 bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold">FACTURÉ À</span>
                  <span className="text-sm font-bold text-slate-900 block mt-1">{activePrintInvoice.client.nom}</span>
                  <span className="text-xs text-slate-600 block">{activePrintInvoice.client.adresse}</span>
                  <span className="text-xs text-slate-600 block">{activePrintInvoice.livraison.lieu}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold">PAIEMENT</span>
                  <span className="text-xs font-bold text-slate-800 block mt-1">
                    {activePrintInvoice.paiement?.methode || 'À la livraison'} &mdash; {activePrintInvoice.paiement?.statut || 'En attente'}
                  </span>
                  {activePrintInvoice.paiement?.reference && (
                    <span className="text-[10px] font-mono text-slate-500 block">Tx: {activePrintInvoice.paiement.reference}</span>
                  )}
                  <span className="text-xs text-slate-600 block mt-1">Téléphone client : {activePrintInvoice.client.telephone}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-100/50">
                    <th className="py-2.5 px-3 font-bold text-slate-700">Désignation</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 text-center">Quantité</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 text-right">Prix Unitaire</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activePrintInvoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3 px-3 text-center text-slate-700">{item.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">{formatMoney(item.price)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">{formatMoney(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Summary */}
              <div className="mt-6 pt-4 border-t-2 border-slate-200 flex justify-end">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Sous-total articles :</span>
                    <span className="font-mono font-semibold">{formatMoney(activePrintInvoice.total - activePrintInvoice.livraison.frais)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Frais de livraison :</span>
                    <span className="font-mono font-semibold">{formatMoney(activePrintInvoice.livraison.frais)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-950 border-t border-slate-200 pt-2">
                    <span>TOTAL À PAYER :</span>
                    <span className="text-teal-700 font-mono">{formatMoney(activePrintInvoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Footer */}
              <div className="text-center text-xs text-slate-400 mt-12 border-t border-slate-100 pt-4">
                <p>Merci pour votre achat sur {activeBoutique.name} !</p>
                <p className="text-[10px] text-slate-350 mt-1">Facture émise par la plateforme Kër Salaatu Tech.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5.5. UPGRADE PLAN MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative backdrop-blur-md space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <Lock className="w-7 h-7 text-slate-950 stroke-[2.5]" />
            </div>
            
            <div>
              <h3 className="text-xl font-black text-slate-100">Fonctionnalité Premium</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
                L'impression de factures PDF et l'accès aux rapports de vente sont réservés aux forfaits <strong>Pro</strong> et <strong>Premium</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-left space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Pourquoi passer au forfait Pro/Premium ?</span>
              <ul className="text-xs text-slate-350 space-y-2 font-sans">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" /> Factures PDF professionnelles illimitées
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" /> Graphique d'analyse des ventes hebdomadaires
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" /> Support technique prioritaire sous 24h
                </li>
              </ul>
            </div>

            <div className="text-xs text-slate-400 font-sans">
              Pour changer de forfait, rendez-vous dans la <strong>Console Développeur</strong> ou contactez l'administrateur.
            </div>

            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold hover:shadow-lg hover:shadow-teal-500/20 transition-all cursor-pointer text-sm font-sans"
            >
              Compris
            </button>
          </div>
        </div>
      )}

      {/* 5.8. PRODUCT LIMIT & UPGRADE MODAL */}
      {showProductLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative backdrop-blur-md space-y-6">
            
            {!paymentSuccess ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                  <AlertTriangle className="w-7 h-7 text-slate-950 stroke-[2.5]" />
                </div>
                
                <div className="text-center">
                  <h3 className="text-xl font-black text-slate-100">Limite de Produits Atteinte</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Votre boutique est actuellement sur le plan gratuit <strong>Découverte</strong>, limité à un maximum de <strong>5 produits</strong>. Pour débloquer votre catalogue et continuer à ajouter des produits, veuillez passer à un forfait Premium.
                  </p>
                </div>

                <form onSubmit={handleUpgradePaymentSubmit} className="space-y-4 text-left">
                  {/* Select Plan */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choisissez votre forfait</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentPlan('Pro')}
                        className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${paymentPlan === 'Pro' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'}`}
                      >
                        <span>Forfait Pro</span>
                        <span className="text-[10px] font-medium opacity-80 font-mono">5 000 FCFA / m</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentPlan('Premium')}
                        className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${paymentPlan === 'Premium' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'}`}
                      >
                        <span>Forfait Premium</span>
                        <span className="text-[10px] font-medium opacity-80 font-mono">15 000 FCFA / m</span>
                      </button>
                    </div>
                  </div>

                  {/* Select Payment Method */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mode de règlement</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Wave')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${paymentMethod === 'Wave' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-sky-400" /> Wave
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Orange Money')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${paymentMethod === 'Orange Money' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-orange-400" /> Orange Money
                      </button>
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Numéro Mobile Money (Ex: 771234567)</label>
                    <input
                      type="text"
                      required
                      placeholder="Saisissez votre numéro pour le paiement"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl focus:border-teal-500 focus:outline-none text-sm text-slate-200 font-mono"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowProductLimitModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-white transition-colors cursor-pointer text-xs font-bold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={paymentLoading}
                      className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-colors cursor-pointer text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {paymentLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <span>Payer & Débloquer</span>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <Check className="w-7 h-7" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-white">Demande Transmise !</h3>
                  <p className="text-xs text-slate-305 leading-relaxed">
                    Votre transaction de <strong>{paymentPlan === 'Pro' ? '5 000 FCFA' : '15 000 FCFA'}</strong> a été initiée sur le numéro <strong>{paymentPhone}</strong> via <strong>{paymentMethod}</strong>.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    La demande d'activation a été envoyée à l'administrateur. Dès réception et validation, votre boutique passera automatiquement au forfait <strong>{paymentPlan}</strong> et votre limite de produits sera levée.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowProductLimitModal(false)}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all text-xs cursor-pointer"
                >
                  Fermer
                </button>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

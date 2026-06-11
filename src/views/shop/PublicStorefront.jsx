import { toast } from '../../components/toast';
import { thumb, fallbackSrc } from '../../utils/img';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { db, isConfigured } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Search, 
  X, 
  Plus, 
  Minus, 
  MapPin, 
  Phone, 
  User, 
  ChevronRight, 
  MessageSquare,
  ChevronLeft,
  Info,
  Truck,
  Sun,
  Moon,
  Menu
} from 'lucide-react';

const generateRandomOrderId = () => `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
const generateRandomTxRef = () => `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

// Generates a stable rating (between 4.5 and 5.0) per product based on its ID
const getProductRating = (id) => {
  if (!id) return "4.8";
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rating = 4.5 + Math.abs(hash % 6) * 0.1;
  return rating.toFixed(1);
};

export default function PublicStorefront() {
  const { shopSlug } = useParams();
  const { 
    getBoutiqueBySlug, 
    getProductsByBoutique, 
    createOrder,
    dataReady,
    setActiveStorefrontBoutiqueId
  } = useTenant();

  const activeShop = getBoutiqueBySlug(shopSlug);
  const isFreePlan = activeShop && (!activeShop.abonnement?.plan || activeShop.abonnement.plan === 'Découverte');


  // Produits directement depuis le contexte (réactif aux onSnapshot Firestore)
  const products = activeShop ? getProductsByBoutique(activeShop.id) : [];

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // cart, delivery, success
  const [selectedProduct, setSelectedProduct] = useState(null); // Product detail modal
  const [selectedVariant, setSelectedVariant] = useState(null); // Variante choisie dans le modal
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [modalQty, setModalQty] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false); // photo plein écran
  const lightboxTouchX = useRef(null);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const goToDelivery = () => {
    setCheckoutStep('delivery');
    setIsCartOpen(true);
    if (!deliveryZone && activeShop?.zonesLivraison?.length > 0) {
      setDeliveryZone(activeShop.zonesLivraison[0].id);
    }
  };

  // Delivery form state
  const [clientForm, setClientForm] = useState({
    nom: '',
    telephone: '',
    adresse: ''
  });
  const [deliveryZone, setDeliveryZone] = useState('');

  // Order confirmation states
  const [lastOrderId, setLastOrderId] = useState('');
  const [lastOrderSummary, setLastOrderSummary] = useState(null);

  // Payment states
  const [payMethod, setPayMethod] = useState('livraison'); // livraison, wave, om
  const [payStep, setPayStep] = useState('select'); // select, processing, done
  const [payPhone, setPayPhone] = useState('');
  const [payStatusText, setPayStatusText] = useState('');
  const [waveOpened, setWaveOpened] = useState(false);

  // Reset Wave payment status flag when closing/opening cart or changing payments
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWaveOpened(false);
  }, [payMethod, isCartOpen, checkoutStep]);

  // Forcer 'livraison' si c'est un plan gratuit (Découverte)
  useEffect(() => {
    if (isFreePlan && payMethod !== 'livraison') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPayMethod('livraison');
    }
  }, [isFreePlan, payMethod]);



  // Sync body theme class and styling to prevent white/dark flashing and mobile bounce backgrounds
  useEffect(() => {
    if (darkMode) {
      document.body.style.backgroundColor = '#0b0f19'; // bg-slate-950
      document.documentElement.classList.add('dark');
    } else {
      document.body.style.backgroundColor = '#f8fafc'; // bg-slate-50
      document.documentElement.classList.remove('dark');
    }
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.classList.remove('dark');
    };
  }, [darkMode]);

  // SEO & Open Graph dynamic metadata updates (Titre, description et images pour le partage)
  useEffect(() => {
    if (!activeShop) return;

    // 1. Titre
    // eslint-disable-next-line react-hooks/immutability
    document.title = `${activeShop.name} — Boutique en ligne`;

    // Helper pour créer/mettre à jour les balises meta
    const updateMetaTag = (property, value, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', value);
    };

    // 2. Description standard
    const desc = activeShop.description || `Bienvenue sur la boutique en ligne de ${activeShop.name}. Achetez nos articles en ligne et finalisez sur WhatsApp.`;
    updateMetaTag('description', desc);

    // 3. Balises Open Graph
    updateMetaTag('og:title', `${activeShop.name} — Boutique en ligne`, true);
    updateMetaTag('og:description', desc, true);
    updateMetaTag('og:url', window.location.href, true);
    
    if (activeShop.logo && typeof activeShop.logo === 'string' && (activeShop.logo.startsWith('http') || activeShop.logo.startsWith('data:image'))) {
      updateMetaTag('og:image', activeShop.logo, true);
    }

    return () => { 
      document.title = 'Jappandal Tech - Plateforme E-Commerce Multi-boutiques'; 
    };
  }, [activeShop]);

  // Canonicalise l'URL : on y inscrit une « version » dérivée du logo. Ainsi tout
  // lien copié depuis la barre d'adresse (par le marchand, un client ou toi) est
  // déjà « neuf » pour WhatsApp/Facebook, et il le redevient automatiquement dès
  // que le logo change → l'aperçu de lien n'est jamais figé sur une vieille image.
  // N'écrit que le chemin + ?v= → fonctionne tel quel sur le futur domaine.
  useEffect(() => {
    if (!activeShop) return;
    const sv = (s = '') => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); };
    const v = sv((activeShop.logo || '') + '|' + (activeShop.name || ''));
    const params = new URLSearchParams(window.location.search);
    if (params.get('v') !== v) {
      params.set('v', v);
      window.history.replaceState(null, '', `/shop/${shopSlug}?${params.toString()}${window.location.hash || ''}`);
    }
  }, [activeShop, activeShop?.logo, activeShop?.name, shopSlug]);

  // Bloque le défilement du fond quand le modal produit, le panier OU le menu est ouvert.
  // (overflow:hidden — sûr et réversible ; le modal/panier/menu ont leur propre défilement interne)
  useEffect(() => {
    const open = !!selectedProduct || isCartOpen || isMenuOpen;
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [selectedProduct, isCartOpen, isMenuOpen]);

  // Définir l'ID de la boutique active pour restreindre le chargement des produits
  useEffect(() => {
    if (activeShop?.id && setActiveStorefrontBoutiqueId) {
      setActiveStorefrontBoutiqueId(activeShop.id);
    }
    return () => {
      if (setActiveStorefrontBoutiqueId) {
        setActiveStorefrontBoutiqueId(null);
      }
    };
  }, [activeShop?.id, setActiveStorefrontBoutiqueId]);

  const currentZone = activeShop?.zonesLivraison?.find(z => z.id === deliveryZone) || activeShop?.zonesLivraison?.[0] || { label: 'Livraison', price: 0 };

  if (!dataReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans text-slate-100">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeShop) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 text-3xl mb-4">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Boutique Introuvable</h2>
        <p className="text-slate-400 max-w-sm mb-6">Nous n'avons pas trouvé de boutique correspondant à l'adresse "/shop/{shopSlug}".</p>
        <Link to="/" className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold transition-all">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const isExpired = activeShop.abonnement?.dateExpiration
    ? new Date(activeShop.abonnement.dateExpiration) < new Date()
    : false;

  if (activeShop.abonnement?.statut === 'Suspendu' || isExpired) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans text-slate-100 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 text-3xl mb-4 shadow-lg shadow-amber-500/5">
          🔒
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Boutique Suspendue</h2>
        <p className="text-slate-400 max-w-sm mb-6">
          {isExpired
            ? `La boutique "${activeShop.name}" est temporairement indisponible (abonnement expiré). Le marchand sera de retour très prochainement.`
            : `La boutique "${activeShop.name}" a suspendu temporairement ses ventes en ligne.`}
        </p>
        <Link to="/" className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold transition-all hover:bg-slate-850 hover:text-white">
          Retourner sur Jappandal Tech
        </Link>
      </div>
    );
  }

  // Categories list based on shop products
  const categories = ['Tous', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Tous' || p.category === selectedCategory;
    return matchesSearch && matchesCategory && p.actif;
  });

  // Cart operations — gère les variantes (parfums, couleurs...) avec stock propre
  const addToCart = (product, variant = null, customQty = 1) => {
    // Stock disponible : celui de la variante si fournie, sinon global
    const availStock = variant ? (Number(variant.stock) || 0) : product.stock;
    if (availStock <= 0) return;

    const cartKey = variant ? `${product.id}__${variant.id}` : product.id;
    const displayName = variant ? `${product.name} — ${variant.nom}` : product.name;
    const displayPhoto = variant?.photo || product.photo;

    setCart(prevCart => {
      const existing = prevCart.find(item => item.cartKey === cartKey);
      if (existing) {
        const nextQty = existing.quantity + customQty;
        if (nextQty > availStock) {
          toast(`Désolé, il n'y a que ${availStock} unité(s) en stock (vous en avez déjà ${existing.quantity} dans votre panier).`);
          return prevCart;
        }
        return prevCart.map(item => item.cartKey === cartKey ? { ...item, quantity: nextQty } : item);
      }
      return [...prevCart, {
        ...product,
        cartKey,
        name: displayName,
        photo: displayPhoto,
        stock: availStock,
        variantId: variant?.id || null,
        variantNom: variant?.nom || null,
        quantity: customQty
      }];
    });
  };

  const updateCartQty = (cartKey, change) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.cartKey === cartKey) {
          const newQty = item.quantity + change;
          if (newQty <= 0) return null;
          if (newQty > item.stock) {
            toast(`Désolé, il n'y a que ${item.stock} unités de ce produit en stock.`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (cartKey) => {
    setCart(prevCart => prevCart.filter(item => item.cartKey !== cartKey));
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryCost = cart.length > 0 ? currentZone.price : 0;
  const cartTotal = cartSubtotal + deliveryCost;

  // Format currency
  const formatMoney = (amount) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('fr-FR').format(num) + ' FCFA';
  };

  // Live stock validation in direct with Firestore or Local State
  const validateCartStock = async () => {
    if (isConfigured) {
      try {
        for (const item of cart) {
          const productRef = doc(db, 'products', item.id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentDbStock = Number(productSnap.data().stock);
            if (currentDbStock < item.quantity) {
              toast(`Stock insuffisant pour "${item.name}". Il ne reste que ${currentDbStock} pièces en stock. Votre panier a été mis à jour.`);
              setCart(prev => prev.map(c => c.id === item.id ? { ...c, stock: currentDbStock, quantity: Math.min(c.quantity, currentDbStock) } : c).filter(c => c.quantity > 0));
              return false;
            }
          }
        }
      } catch (err) {
        console.error("Erreur lors de la validation du stock en temps réel:", err);
      }
    } else {
      for (const item of cart) {
        const product = products.find(p => p.id === item.id);
        if (product && product.stock < item.quantity) {
          toast(`Stock insuffisant pour "${item.name}". Il ne reste que ${product.stock} pièces en stock. Votre panier a été mis à jour.`);
          setCart(prev => prev.map(c => c.id === item.id ? { ...c, quantity: Math.min(c.quantity, product.stock) } : c).filter(c => c.quantity > 0));
          return false;
        }
      }
    }
    return true;
  };

  // Payment simulator function
  const handleLaunchPayment = async () => {
    if (!payPhone) {
      toast("Veuillez saisir votre numéro Mobile Money.");
      return;
    }

    const isStockValid = await validateCartStock();
    if (!isStockValid) return;
    
    setPayStep('processing');
    setPayStatusText('Initiation de la transaction Mobile Money...');
    
    setTimeout(() => {
      setPayStatusText('En attente de confirmation sur votre téléphone (tapez votre code secret)...');
    }, 1500);

    setTimeout(() => {
      setPayStatusText('Paiement validé ! Génération du reçu...');
    }, 3500);

    setTimeout(() => {
      const refTx = generateRandomTxRef();
      handleCheckoutSubmit({
        methode: payMethod === 'wave' ? 'Wave' : 'Orange Money',
        statut: 'Payé',
        reference: refTx
      });
    }, 5000);
  };

  // WhatsApp Order Submission
  const handleCheckoutSubmit = async (paiementData = null) => {
    if (!clientForm.nom || !clientForm.telephone || !clientForm.adresse) {
      toast('Veuillez remplir toutes les informations de livraison.');
      return;
    }

    if (!paiementData) {
      const isStockValid = await validateCartStock();
      if (!isStockValid) return;
    }

    const payInfo = paiementData || { methode: 'À la livraison', statut: 'En attente' };

    // 1. Save order in LocalDB context so the merchant console gets it
    createOrder(
      activeShop.id,
      clientForm,
      cart,
      deliveryCost,
      currentZone.label,
      payInfo
    );

    // 2. Build WhatsApp formatted text message
    const orderId = generateRandomOrderId();
    let message = `*✨ NOUVELLE COMMANDE - ${activeShop.name.toUpperCase()} ✨*\n`;
    message += `_Référence: ${orderId}_\n\n`;
    
    message += `*👤 CLIENT :*\n`;
    message += `• *Nom :* ${clientForm.nom}\n`;
    message += `• *Téléphone :* ${clientForm.telephone}\n`;
    message += `• *Adresse :* ${clientForm.adresse}\n`;
    message += `• *Zone :* ${currentZone.label}\n\n`;

    message += `*🛍️ ARTICLES :*\n`;
    cart.forEach(item => {
      message += `• ${item.quantity}x ${item.name} (${formatMoney(item.price * item.quantity)})\n`;
    });
    message += `\n`;

    message += `*💳 PAIEMENT :*\n`;
    message += `• *Méthode :* ${payInfo.methode}\n`;
    message += `• *Statut :* ${payInfo.statut === 'Payé' ? '🟢 PAYÉ' : '🟡 À PAYER À LA LIVRAISON'}\n`;
    if (payInfo.reference) {
      message += `• *Réf Transaction :* ${payInfo.reference}\n`;
    }
    message += `\n`;

    message += `*💵 RÉCAPITULATIF FINANCIER :*\n`;
    message += `• *Sous-total :* ${formatMoney(cartSubtotal)}\n`;
    message += `• *Frais livraison :* ${formatMoney(deliveryCost)}\n`;
    message += `• *TOTAL À PAYER :* *${formatMoney(cartTotal)}*\n\n`;
    
    message += `🙏 Merci pour votre confiance ! Veuillez confirmer la commande.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${String(activeShop.whatsapp || '').replace(/\D/g, '')}?text=${encodedMessage}`;

    // 3. Save summary for success screen then clear cart
    setLastOrderId(orderId);
    setLastOrderSummary({ items: cart, total: cartTotal });
    setCart([]);
    setCheckoutStep('success');
    
    // Open whatsapp in a new tab
    window.open(whatsappUrl, '_blank');
  };

  // Compute theme variables dynamically
  const themeStyles = {
    '--tenant-color': activeShop.couleurMarque,
    '--tenant-color-hover': activeShop.couleurMarqueHover || (activeShop.couleurMarque + 'e0'),
    '--tenant-color-light': activeShop.couleurMarque + '15'
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`} style={themeStyles}>
      
      {/* Top Banner (Header) - Minimalist & Premium layout (matches reference image) */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md px-6 py-3.5 pt-safe flex items-center justify-between transition-colors ${
        darkMode ? 'bg-slate-950/90 border-slate-900 text-white' : 'bg-white/90 border-slate-100 text-slate-900'
      }`}>
        {/* Hamburger Menu Icon (Left) */}
        <button 
          onClick={() => setIsMenuOpen(true)}
          className={`p-2 -ml-2 rounded-full transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-900'
          }`}
          aria-label="Menu"
        >
          <Menu className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Center Shop Name (Uppercase, bold, matches reference image) */}
        <h1 className={`font-display font-black text-sm md:text-base tracking-widest text-center uppercase ${
          darkMode ? 'text-white' : 'text-slate-950'
        }`}>
          {activeShop.name}
        </h1>

        {/* Cart Icon (Right) */}
        <button 
          onClick={() => {
            setCheckoutStep('cart');
            setIsCartOpen(true);
          }}
          className={`p-2 -mr-2 rounded-full relative transition-all cursor-pointer ${
            darkMode ? 'hover:bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-950'
          }`}
          aria-label="Panier"
        >
          <ShoppingBag className="w-5 h-5 stroke-[2]" />
          {cartCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-[var(--tenant-color)] text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white dark:border-slate-950">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      {/* Left Menu Drawer (Sidebar) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex bg-slate-950/60 backdrop-blur-xs animate-fade-in" onClick={() => setIsMenuOpen(false)}>
          <div 
            className={`w-full max-w-[280px] h-full shadow-2xl flex flex-col justify-between p-6 animate-slide-in-left relative transition-colors duration-300 ${
              darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Header inside drawer */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-[var(--tenant-color)] font-extrabold text-lg flex items-center justify-center border border-white/5 shadow-sm overflow-hidden">
                    {activeShop.logo && typeof activeShop.logo === 'string' && (activeShop.logo.startsWith('/') || activeShop.logo.startsWith('http') || activeShop.logo.startsWith('data:image')) ? (
                      <img src={activeShop.logo} alt="Logo" className="w-6 h-6 object-contain" />
                    ) : (
                      activeShop.logo || '🛍️'
                    )}
                  </div>
                  <h3 className={`font-display font-black text-xs uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {activeShop.name}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                    darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Shop Metadata / About info */}
              <div className="space-y-6 text-left">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shadow-sm">
                    ✓ Boutique Vérifiée
                  </span>
                  {activeShop.abonnement?.plan && activeShop.abonnement.plan !== 'Découverte' && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-widest text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full ml-1.5">
                      ⭐ {activeShop.abonnement.plan}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>À Propos</h4>
                  <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {activeShop.description || "Aucune description fournie par le marchand."}
                  </p>
                </div>

                {activeShop.adresse && (
                  <div className="space-y-1">
                    <h4 className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Adresse</h4>
                    <p className={`text-xs flex items-center gap-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      <MapPin className="w-3.5 h-3.5 text-[var(--tenant-color)] shrink-0" />
                      <span>{activeShop.adresse}</span>
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Contact & Support</h4>
                  <a
                    href={`https://wa.me/${String(activeShop.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${activeShop.name}, j'ai une question sur votre boutique.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-all hover:scale-105 text-xs cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" /> Contacter par WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom: Dark Mode Toggle and Plateforme Link */}
            <div className="space-y-5 border-t pt-5 text-left">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {darkMode ? 'Mode Sombre' : 'Mode Clair'}
                </span>
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-xl transition-all cursor-pointer border ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-750' 
                      : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-center">
                <Link 
                  to="/" 
                  className={`text-[10px] font-semibold transition-colors ${
                    darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Plateforme Jappandal Tech
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main product catalogue view */}
      <main className="max-w-5xl w-full mx-auto px-6 py-6 flex-grow">
        
        {/* Explore Title & Tagline (Matches reference image) */}
        <div className="mb-6 text-left">
          <h2 className={`font-display font-black text-3xl tracking-tight leading-none uppercase ${darkMode ? 'text-white' : 'text-slate-950'}`}>
            Découvrir
          </h2>
          <p className={`text-xs mt-1.5 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {activeShop.description || "Découvrez notre sélection exclusive d'articles premium."}
          </p>
        </div>

        {/* Search Bar (Matches reference image) */}
        <div className="relative w-full mb-6">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-450">
            <Search className="w-4 h-4 stroke-[2.25]" />
          </span>
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-11 pr-4 py-3 rounded-2xl border transition-all text-xs font-semibold focus:outline-none focus:border-[var(--tenant-color)] ${
              darkMode 
                ? 'bg-slate-900/40 border-slate-800/80 text-slate-100 focus:bg-slate-900' 
                : 'bg-slate-100/60 border-slate-200/60 text-slate-800 focus:bg-white'
            }`}
          />
        </div>

        {/* Categories tags list (Sleek and polished text pills) */}
        <div className="flex gap-2.5 overflow-x-auto pb-3 mb-6 scrollbar-none snap-x snap-mandatory">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold tracking-tight transition-all duration-300 cursor-pointer snap-start outline-none ${
                  isSelected 
                    ? 'bg-[var(--tenant-color)] text-white shadow-md shadow-[var(--tenant-color)]/20 scale-105' 
                    : (darkMode 
                      ? 'bg-slate-900/40 border border-slate-850 text-slate-450 hover:bg-slate-900/80 hover:text-white' 
                      : 'bg-slate-100/60 border border-slate-200/45 text-slate-500 hover:bg-slate-100 hover:text-slate-900')
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Section Title (Matches reference image) */}
        <div className="flex justify-between items-center mb-5 mt-2">
          <h3 className={`text-xs font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Sélection du Moment
          </h3>
        </div>

        {/* Product Catalog — 2 columns on mobile, clean card layouts (Matches reference image) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {filteredProducts.map((prod, idx) => {
            const isNew = idx < 3;
            const isBestseller = idx === 0 && prod.stock > 0;
            const hasVar = prod.variantes && prod.variantes.length > 0;
            const gallery = (prod.photos && prod.photos.length > 0)
              ? prod.photos
              : (prod.photo ? [prod.photo] : []);
            const secondPhoto = gallery[1];
            const out = prod.stock === 0;
            return (
              <div
                key={prod.id}
                className="flex flex-col group transition-all duration-300"
              >
                {/* Image Wrapper - Rounded Container with Soft Background (Matches reference image) */}
                <div
                  className={`w-full aspect-[4/5] overflow-hidden relative cursor-pointer rounded-3xl transition-all duration-300 border ${
                    darkMode 
                      ? 'bg-slate-900/60 border-slate-850 hover:border-slate-750 shadow-slate-950/20' 
                      : 'bg-slate-100/65 border-slate-200/40 hover:border-slate-300 shadow-sm'
                  }`}
                  onClick={() => { setSelectedProduct(prod); setModalQty(1); setActivePhotoIdx(0); }}
                >
                  {gallery[0] ? (
                    <>
                      <img
                        src={thumb(gallery[0], 600)}
                        onError={fallbackSrc(gallery[0])}
                        alt={prod.name}
                        loading="lazy"
                        decoding="async"
                        className={`absolute inset-0 w-full h-full object-contain p-4 rounded-3xl transition-all duration-750 ${secondPhoto ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'}`}
                      />
                      {secondPhoto && (
                        <img
                          src={thumb(secondPhoto, 600)}
                          onError={fallbackSrc(secondPhoto)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-contain p-4 rounded-3xl opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-750"
                        />
                      )}
                    </>
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center text-xs ${darkMode ? 'bg-slate-950 text-slate-600' : 'bg-slate-50 text-slate-350'}`}>
                      <ShoppingBag className="w-8 h-8 stroke-[1.25] mb-1" />
                      <span>Pas d'image</span>
                    </div>
                  )}

                  {/* Badges top left */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                    {isBestseller && (
                      <span className="bg-amber-400 text-slate-950 font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                        ★ Populaire
                      </span>
                    )}
                    {isNew && !isBestseller && (
                      <span className="bg-[var(--tenant-color)] text-white font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                        Nouveau
                      </span>
                    )}
                    {prod.stock > 0 && prod.stock <= 3 && (
                      <span className="bg-orange-500 text-white font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                        Plus que {prod.stock} !
                      </span>
                    )}
                  </div>

                  {/* Out of Stock Overlay */}
                  {out && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <span className="px-3 py-1 rounded-full bg-white text-slate-950 font-black text-[10px] shadow-md">
                        En Rupture
                      </span>
                    </div>
                  )}
                </div>

                {/* Metadata - Under the image container (Matches reference image) */}
                <div className="pt-3 flex flex-col flex-1 px-1">
                  <h4 className={`font-display font-extrabold text-xs uppercase tracking-tight text-left line-clamp-1 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {prod.name.toUpperCase()}
                  </h4>
                  <span className={`text-[10px] font-medium text-left mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {prod.category}
                  </span>
                  
                  {/* Price & Rating Inline (Matches reference image) */}
                  <div className="flex justify-between items-center mt-1.5">
                    <span className={`text-xs font-black font-mono ${darkMode ? 'text-slate-100' : 'text-slate-950'}`}>
                      {formatMoney(prod.price)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-500">
                      ★ {getProductRating(prod.id)}
                    </span>
                  </div>

                  {/* Add to Bag CTA Button (Matches reference image) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (out) return;
                      if (hasVar) { setSelectedProduct(prod); setSelectedVariant(null); setModalQty(1); setActivePhotoIdx(0); return; }
                      addToCart(prod);
                    }}
                    disabled={out}
                    className={`w-full mt-3 py-2.5 rounded-xl text-[10px] font-extrabold tracking-wider uppercase transition-all duration-300 cursor-pointer text-center ${
                      out
                        ? (darkMode ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
                        : (darkMode 
                          ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/10 hover:shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98]' 
                          : 'bg-slate-900 hover:bg-slate-950 text-white shadow-sm hover:scale-[1.02] active:scale-[0.98]')
                    }`}
                  >
                    {out ? 'Épuisé' : (hasVar ? 'Choisir' : 'Ajouter')}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className={`col-span-full py-20 text-center rounded-3xl border transition-all duration-350 shadow-inner ${
              darkMode ? 'bg-slate-900 border-slate-850 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
            }`}>
              <ShoppingBag className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-slate-800' : 'text-slate-300'}`} />
              <h3 className={`font-bold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Aucun produit trouvé</h3>
              <p className="text-[10px] text-slate-450 mt-1 max-w-xs mx-auto font-medium">Essayez d'ajuster vos critères de recherche ou de changer de catégorie.</p>
            </div>
          )}
        </div>
      </main>

      {/* Cart Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
          
          {/* Drawer Wrapper */}
          <div className={`w-full max-w-md h-full shadow-2xl flex flex-col justify-between animate-slide-in relative transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}`}>
            {/* Header */}
            <div className={`p-5 border-b bg-transparent ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-extrabold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  <ShoppingCart className="w-5 h-5 text-[var(--tenant-color)]" />
                  {checkoutStep === 'cart' && `Panier (${cartCount})`}
                  {checkoutStep === 'delivery' && 'Livraison'}
                  {checkoutStep === 'payment' && 'Paiement'}
                  {checkoutStep === 'success' && 'Confirmation'}
                </h3>
                <button onClick={() => setIsCartOpen(false)} className={`p-1.5 rounded-full transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Barre de progression */}
              {checkoutStep !== 'success' && (
                <div className="flex items-center gap-1">
                  {['cart', 'delivery', 'payment'].map((step, i) => {
                    const steps = ['cart', 'delivery', 'payment'];
                    const current = steps.indexOf(checkoutStep);
                    const done = i < current;
                    const active = i === current;
                    const labels = ['Panier', 'Livraison', 'Paiement'];
                    return (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                            done ? 'bg-[var(--tenant-color)] text-white' :
                            active ? 'bg-[var(--tenant-color)] text-white ring-4 ring-[var(--tenant-color)]/20' :
                            (darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-400')
                          }`}>
                            {done ? '✓' : i + 1}
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-[var(--tenant-color)]' : done ? 'text-slate-500' : (darkMode ? 'text-slate-500' : 'text-slate-300')}`}>
                            {labels[i]}
                          </span>
                        </div>
                        {i < 2 && <div className={`flex-1 h-0.5 mb-3 rounded-full transition-all ${done ? 'bg-[var(--tenant-color)]' : (darkMode ? 'bg-slate-800' : 'bg-slate-200')}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Content Switcher */}
            {checkoutStep === 'cart' && (
              <>
                {/* 1. Items List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                      <ShoppingCart className={`w-16 h-16 mb-3 ${darkMode ? 'text-slate-850' : 'text-slate-200'}`} />
                      <p className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Votre panier est vide</p>
                      <p className="text-xs max-w-[200px] mt-1">Ajoutez des articles du catalogue pour commander.</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.cartKey} className={`flex gap-4 p-3 rounded-xl border relative transition-colors ${darkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-150'}`}>
                        <img
                          src={thumb(item.photo, 200)}
                          onError={fallbackSrc(item.photo)}
                          alt={item.name}
                          loading="lazy"
                          className={`w-16 h-16 rounded-lg object-cover border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-100'}`}
                        />
                        <div className="flex-1 flex flex-col justify-between py-0.5">
                          <div>
                            <h4 className={`font-bold text-sm line-clamp-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.name}</h4>
                            <span className={`text-xs font-black mt-1 block ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{formatMoney(item.price)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            {/* Quantity buttons */}
                            <div className={`flex items-center border rounded-lg p-0.5 ${darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                              <button
                                onClick={() => updateCartQty(item.cartKey, -1)}
                                className={`p-1 rounded text-slate-500 cursor-pointer ${darkMode ? 'hover:bg-slate-850 text-slate-400' : 'hover:bg-slate-100'}`}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className={`px-2 text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.quantity}</span>
                              <button
                                onClick={() => updateCartQty(item.cartKey, 1)}
                                className={`p-1 rounded text-slate-500 cursor-pointer ${darkMode ? 'hover:bg-slate-850 text-slate-400' : 'hover:bg-slate-100'}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.cartKey)}
                              className="text-xs font-semibold text-red-500 hover:text-red-650 cursor-pointer"
                            >
                              Retirer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotal & Action */}
                {cart.length > 0 && (
                  <div className={`p-5 border-t space-y-4 transition-colors ${darkMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-150 bg-slate-50'}`}>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-500">Sous-total :</span>
                      <span className={`font-black text-lg ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{formatMoney(cartSubtotal)}</span>
                    </div>
                    <button
                      onClick={goToDelivery}
                      className="w-full py-3.5 rounded-xl bg-[var(--tenant-color)] hover:bg-[var(--tenant-color-hover)] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Procéder à la livraison <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                )}
              </>
            )}

            {checkoutStep === 'delivery' && (
              <>
                {/* 2. Delivery form & Final recap */}
                <div className="flex-grow overflow-y-auto p-5 space-y-6">
                  {/* Back to cart */}
                  <button 
                    onClick={() => setCheckoutStep('cart')}
                    className="text-xs font-bold text-[var(--tenant-color)] hover:underline flex items-center gap-1 cursor-pointer mb-2"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2.5]" /> Retour au panier
                  </button>

                  <h3 className={`font-extrabold text-base border-b pb-2 ${darkMode ? 'text-slate-200 border-slate-800' : 'text-slate-800 border-slate-100'}`}>Informations de livraison</h3>
                  
                  <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Votre Nom Complet</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="Prénom et Nom"
                          value={clientForm.nom}
                          onChange={(e) => setClientForm({ ...clientForm, nom: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm transition-all focus:outline-none focus:border-[var(--tenant-color)] ${darkMode ? 'bg-slate-950/50 border-slate-800 text-slate-200 focus:bg-slate-950' : 'bg-white border-slate-200 text-slate-800'}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Numéro Téléphone</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: 77 123 45 67"
                          value={clientForm.telephone}
                          onChange={(e) => setClientForm({ ...clientForm, telephone: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm transition-all focus:outline-none focus:border-[var(--tenant-color)] ${darkMode ? 'bg-slate-950/50 border-slate-800 text-slate-200 focus:bg-slate-950' : 'bg-white border-slate-200 text-slate-800'}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Adresse de livraison</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="Quartier, Rue, N° de porte"
                          value={clientForm.adresse}
                          onChange={(e) => setClientForm({ ...clientForm, adresse: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm transition-all focus:outline-none focus:border-[var(--tenant-color)] ${darkMode ? 'bg-slate-950/50 border-slate-800 text-slate-200 focus:bg-slate-950' : 'bg-white border-slate-200 text-slate-800'}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Zone de livraison</label>
                      <div className="space-y-2">
                        {activeShop.zonesLivraison?.map((zone) => (
                          <label 
                            key={zone.id} 
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                              deliveryZone === zone.id 
                              ? `border-[var(--tenant-color)] bg-[var(--tenant-color-light)] ${darkMode ? 'text-slate-200' : 'text-slate-800'}` 
                              : `${darkMode ? 'border-slate-850 text-slate-400 hover:bg-slate-950/50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="deliveryZone"
                                checked={deliveryZone === zone.id}
                                onChange={() => setDeliveryZone(zone.id)}
                                className="accent-[var(--tenant-color)] cursor-pointer"
                              />
                              <div className="flex flex-col text-left">
                                <span className={`text-xs font-semibold leading-tight ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{zone.label || zone.nom}</span>
                                {zone.delai && (
                                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-1">
                                    <Truck className="w-3.5 h-3.5 text-[var(--tenant-color)] stroke-[2.5]" />
                                    <span>Délai : {zone.delai}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`text-xs font-black shrink-0 font-mono ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{formatMoney(zone.price || zone.frais)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </form>
                </div>

                {/* Final Checkout recap */}
                <div className={`p-5 border-t space-y-4 transition-colors ${darkMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-150 bg-slate-50'}`}>
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Sous-total articles :</span>
                      <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatMoney(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frais de livraison :</span>
                      <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatMoney(deliveryCost)}</span>
                    </div>
                    <div className={`flex justify-between text-base font-black border-t pt-2 ${darkMode ? 'text-slate-100 border-slate-850' : 'text-slate-900 border-slate-200'}`}>
                      <span>Total à payer :</span>
                      <span className="text-[var(--tenant-color)]">{formatMoney(cartTotal)}</span>
                    </div>
                  </div>

                  <div className={`flex items-start gap-2 p-3 rounded-xl text-xs border ${darkMode ? 'bg-blue-950/20 text-blue-300 border-blue-900/30' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Vos coordonnées de livraison seront enregistrées localement et pré-remplies pour votre prochaine visite.</p>
                  </div>

                  <button
                    onClick={() => {
                      setPayStep('select');
                      setCheckoutStep('payment');
                      setPayPhone(clientForm.telephone);
                    }}
                    disabled={!clientForm.nom || !clientForm.telephone || !clientForm.adresse}
                    className={`w-full py-3.5 rounded-xl text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      (!clientForm.nom || !clientForm.telephone || !clientForm.adresse)
                      ? (darkMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-850' : 'bg-slate-300 text-slate-450 cursor-not-allowed')
                      : 'bg-[var(--tenant-color)] hover:bg-[var(--tenant-color-hover)] shadow-[var(--tenant-color)]/10'
                    }`}
                  >
                    Choisir le mode de paiement <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {checkoutStep === 'payment' && (
              <>
                {/* 3. Payment selection and simulator */}
                <div className="flex-grow overflow-y-auto p-5 space-y-6">
                  {/* Back to delivery */}
                  {payStep === 'select' && (
                    <button 
                      onClick={() => setCheckoutStep('delivery')}
                      className="text-xs font-bold text-[var(--tenant-color)] hover:underline flex items-center gap-1 cursor-pointer mb-2"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2.5]" /> Retour aux coordonnées
                    </button>
                  )}

                  {payStep === 'select' ? (
                    <div className="space-y-5">
                      <h3 className={`font-extrabold text-base border-b pb-2 ${darkMode ? 'text-slate-200 border-slate-800' : 'text-slate-800 border-slate-100'}`}>Mode de paiement</h3>
                      
                      <div className="space-y-3">
                        {/* 1. Cash on delivery */}
                        <label 
                          onClick={() => setPayMethod('livraison')}
                          className={`p-4 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all ${
                            payMethod === 'livraison' 
                            ? (darkMode ? 'border-slate-600 bg-slate-800 shadow-sm' : 'border-slate-800 bg-slate-50 shadow-sm')
                            : (darkMode ? 'border-slate-800 hover:bg-slate-850/50' : 'border-slate-200 hover:bg-slate-50/50')
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="paymentMethod" 
                            checked={payMethod === 'livraison'}
                            onChange={() => setPayMethod('livraison')}
                            className="accent-slate-800"
                          />
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                            <Truck className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <span className={`font-extrabold text-sm block ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Paiement à la livraison</span>
                            <span className={`text-[10px] block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Payez en espèces lorsque vous recevez vos articles.</span>
                          </div>
                        </label>

                        {/* 2. Wave */}
                        {!isFreePlan && (
                          <label 
                            onClick={() => setPayMethod('wave')}
                            className={`p-4 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all ${
                              payMethod === 'wave' 
                              ? (darkMode ? 'border-sky-500 bg-sky-950/20 shadow-sm' : 'border-sky-500 bg-sky-50 shadow-sm')
                              : (darkMode ? 'border-slate-800 hover:bg-slate-850/50' : 'border-slate-200 hover:bg-slate-50/50')
                            }`}
                          >
                            <input 
                              type="radio" 
                              name="paymentMethod" 
                              checked={payMethod === 'wave'}
                              onChange={() => setPayMethod('wave')}
                              className="accent-sky-500"
                            />
                            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black text-lg shrink-0">
                              W
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <span className={`font-extrabold text-sm block ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Wave Mobile Money</span>
                              <span className={`text-[10px] block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {activeShop.abonnement?.plan === 'Premium' && activeShop.waveMerchantLink 
                                  ? 'Paiement direct Wave (frais de 1% inclus).' 
                                  : 'Règlement instantané sécurisé par l\'application Wave.'}
                              </span>
                            </div>
                          </label>
                        )}

                        {/* 3. Orange Money */}
                        {!isFreePlan && (
                          <label 
                            onClick={() => setPayMethod('om')}
                            className={`p-4 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all ${
                              payMethod === 'om' 
                              ? (darkMode ? 'border-orange-500 bg-orange-950/20 shadow-sm' : 'border-orange-500 bg-orange-50 shadow-sm')
                              : (darkMode ? 'border-slate-800 hover:bg-slate-850/50' : 'border-slate-200 hover:bg-slate-50/50')
                            }`}
                          >
                            <input 
                              type="radio" 
                              name="paymentMethod" 
                              checked={payMethod === 'om'}
                              onChange={() => setPayMethod('om')}
                              className="accent-orange-500"
                            />
                            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                              OM
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <span className={`font-extrabold text-sm block ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Orange Money</span>
                              <span className={`text-[10px] block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Règlement instantané sécurisé via code d'autorisation Orange.</span>
                            </div>
                          </label>
                        )}
                      </div>

                      {/* Phone Input & Visual QR helper for mobile money */}
                      {payMethod !== 'livraison' && (
                        <div className={`p-5 rounded-2xl border space-y-4 animate-fade-in text-left transition-colors ${darkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-200'}`}>
                          <div className={`flex justify-between items-center pb-2 border-b ${darkMode ? 'border-slate-850' : 'border-slate-200'}`}>
                            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Instructions de Règlement</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase text-white ${payMethod === 'wave' ? 'bg-sky-500' : 'bg-orange-500'}`}>
                              {payMethod === 'wave' ? 'Wave' : 'Orange Money'}
                            </span>
                          </div>

                          {/* Step-by-Step Instructions */}
                          <div className={`space-y-2.5 text-xs leading-relaxed font-sans ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {payMethod === 'wave' && activeShop.abonnement?.plan === 'Premium' && activeShop.waveMerchantLink ? (
                              <div className="space-y-3.5">
                                <p className="flex gap-2.5 items-start">
                                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                                  <span>Cliquez sur le bouton <strong>"Ouvrir Wave & Payer"</strong> ci-dessous. Le montant de <strong>{formatMoney(Math.round(cartTotal * 1.01))}</strong> (frais de 1% inclus) sera pré-rempli.</span>
                                </p>
                                <p className="flex gap-2.5 items-start">
                                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                                  <span>Validez le paiement en toute sécurité directement dans l'application Wave.</span>
                                </p>
                                <p className="flex gap-2.5 items-start">
                                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                                  <span>Revenez sur cette page pour envoyer votre commande sur WhatsApp et finaliser la vente.</span>
                                </p>
                              </div>
                            ) : payMethod === 'wave' ? (
                              <>
                                <p className="flex gap-2 items-start">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${darkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-50/80 text-sky-655'}`}>1</span>
                                  <span>Ouvrez l'application <strong className={darkMode ? 'text-slate-100' : 'text-slate-900'}>Wave</strong> sur votre téléphone.</span>
                                </p>
                                <p className="flex gap-2 items-start">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${darkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-50/80 text-sky-655'}`}>2</span>
                                  <span>Scannez le code QR ci-dessous pour payer automatiquement.</span>
                                </p>
                                <p className="flex gap-2 items-start">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${darkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-50/80 text-sky-655'}`}>3</span>
                                  <span>Ou envoyez le montant exact <strong className={darkMode ? 'text-slate-100' : 'text-slate-900'}>{formatMoney(cartTotal)}</strong> au numéro marchand : <strong className={`font-mono ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{activeShop.whatsapp}</strong></span>
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="flex gap-2 items-start">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50/80 text-orange-600'}`}>1</span>
                                  <span>Composez le code USSD <strong className={darkMode ? 'text-slate-100' : 'text-slate-900'}>#144#39#</strong> sur votre mobile.</span>
                                </p>
                                <p className="flex gap-2 items-start">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50/80 text-orange-600'}`}>2</span>
                                  <span>Saisissez votre code secret pour générer un code d'autorisation.</span>
                                </p>
                                <p className="flex gap-2 items-start">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50/80 text-orange-600'}`}>3</span>
                                  <span>Effectuez le transfert de <strong className={darkMode ? 'text-slate-100' : 'text-slate-900'}>{formatMoney(cartTotal)}</strong> au numéro marchand : <strong className={`font-mono ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{activeShop.whatsapp}</strong></span>
                                </p>
                              </>
                            )}
                          </div>

                          {/* Beautiful simulated QR Code OR Wave Link info box */}
                          {payMethod === 'wave' && activeShop.abonnement?.plan === 'Premium' && activeShop.waveMerchantLink ? (
                            <div className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center relative overflow-hidden group ${darkMode ? 'bg-slate-950/20 border-slate-805' : 'bg-sky-50/50 border-sky-100'}`}>
                              <span className="text-3xl animate-bounce">🌊</span>
                              <h4 className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Lien Wave Généré</h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs leading-normal">
                                Montant de la commande : {formatMoney(cartTotal)} <br />
                                Frais de transfert (1%) : {formatMoney(Math.round(cartTotal * 0.01))} <br />
                                <strong>Total à payer : {formatMoney(Math.round(cartTotal * 1.01))}</strong>
                              </p>
                            </div>
                          ) : (
                            <div className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 bg-white relative overflow-hidden group ${darkMode ? 'border-slate-800' : 'border-sky-200/60'}`}>
                              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none ${payMethod === 'wave' ? 'bg-sky-500' : 'bg-orange-500'}`} />
                              
                              <svg viewBox="0 0 100 100" className={`w-36 h-36 mx-auto p-1.5 rounded-lg border ${payMethod === 'wave' ? 'text-sky-600 border-sky-100' : 'text-orange-600 border-orange-100'}`}>
                                <rect x="8" y="8" width="22" height="22" fill="currentColor" rx="2" />
                                <rect x="12" y="12" width="14" height="14" fill="white" rx="1" />
                                <rect x="15" y="15" width="8" height="8" fill="currentColor" rx="0.5" />
                                
                                <rect x="70" y="8" width="22" height="22" fill="currentColor" rx="2" />
                                <rect x="74" y="12" width="14" height="14" fill="white" rx="1" />
                                <rect x="77" y="15" width="8" height="8" fill="currentColor" rx="0.5" />
                                
                                <rect x="8" y="70" width="22" height="22" fill="currentColor" rx="2" />
                                <rect x="12" y="74" width="14" height="14" fill="white" rx="1" />
                                <rect x="15" y="77" width="8" height="8" fill="currentColor" rx="0.5" />
                                
                                <rect x="35" y="8" width="6" height="12" fill="currentColor" rx="1" />
                                <rect x="45" y="14" width="12" height="6" fill="currentColor" rx="1" />
                                <rect x="62" y="8" width="6" height="6" fill="currentColor" rx="1" />
                                
                                <rect x="35" y="24" width="12" height="6" fill="currentColor" rx="1" />
                                <rect x="52" y="24" width="6" height="12" fill="currentColor" rx="1" />
                                <rect x="62" y="20" width="6" height="12" fill="currentColor" rx="1" />
                                
                                <rect x="8" y="36" width="6" height="12" fill="currentColor" rx="1" />
                                <rect x="20" y="46" width="12" height="6" fill="currentColor" rx="1" />
                                <rect x="32" y="40" width="6" height="18" fill="currentColor" rx="1" />
                                
                                <rect x="42" y="42" width="22" height="22" fill="currentColor" rx="2" opacity="0.1" />
                                
                                <rect x="70" y="36" width="6" height="12" fill="currentColor" rx="1" />
                                <rect x="82" y="42" width="10" height="6" fill="currentColor" rx="1" />
                                <rect x="76" y="52" width="18" height="6" fill="currentColor" rx="1" />
                                
                                <rect x="8" y="58" width="12" height="6" fill="currentColor" rx="1" />
                                <rect x="26" y="58" width="6" height="12" fill="currentColor" rx="1" />
                                
                                <rect x="38" y="68" width="18" height="6" fill="currentColor" rx="1" />
                                <rect x="44" y="78" width="6" height="16" fill="currentColor" rx="1" />
                                <rect x="54" y="74" width="12" height="6" fill="currentColor" rx="1" />
                                <rect x="64" y="68" width="6" height="12" fill="currentColor" rx="1" />
                                
                                <rect x="70" y="74" width="6" height="12" fill="currentColor" rx="1" />
                                <rect x="82" y="68" width="10" height="6" fill="currentColor" rx="1" />
                                <rect x="88" y="78" width="6" height="12" fill="currentColor" rx="1" />
                                <rect x="76" y="88" width="18" height="6" fill="currentColor" rx="1" />
                                
                                <rect x="41" y="41" width="18" height="18" fill="white" rx="3" />
                                <text x="50" y="53" font-size="10" font-family="sans-serif" font-weight="900" text-anchor="middle" fill="currentColor">
                                  {payMethod === 'wave' ? 'W' : 'OM'}
                                </text>
                              </svg>
                              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Scannez pour régler</span>
                            </div>
                          )}

                          {/* Account details and user verification */}
                          {!(payMethod === 'wave' && activeShop.abonnement?.plan === 'Premium' && activeShop.waveMerchantLink) && (
                            <div className="space-y-3 border-t border-slate-200 pt-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Votre numéro de téléphone payeur</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Ex: 77 123 45 67"
                                  value={payPhone}
                                  onChange={(e) => setPayPhone(e.target.value)}
                                  className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono transition-all focus:outline-none focus:border-[var(--tenant-color)] ${darkMode ? 'bg-slate-950/50 border-slate-800 text-slate-150 focus:bg-slate-950' : 'bg-white border-slate-200 text-slate-800 shadow-inner'}`}
                                />
                                <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                                  Saisissez le numéro utilisé pour effectuer le transfert. Le commerçant vérifiera la réception de la somme de <strong>{formatMoney(cartTotal)}</strong>.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Processing Screen */
                    <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-6 animate-fade-in">
                      <div className="relative">
                        {/* Spinner */}
                        <div className={`w-20 h-20 rounded-full border-4 border-t-transparent animate-spin ${
                          payMethod === 'wave' ? 'border-sky-500' : 'border-orange-500'
                        }`} />
                        {/* Icon inside */}
                        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                          {payMethod === 'wave' ? '🌊' : '🍊'}
                        </div>
                      </div>
                      
                      <div className="space-y-2 max-w-xs mx-auto">
                        <h4 className={`font-black text-base ${darkMode ? 'text-slate-250' : 'text-slate-900'}`}>{payMethod === 'wave' ? 'Paiement Wave' : 'Paiement Orange Money'}</h4>
                        <p className={`text-sm font-semibold animate-pulse leading-snug ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{payStatusText}</p>
                        <p className="text-[10px] text-slate-400 pt-3 font-medium">Simulateur de transaction locale Jappandal Tech. Ne fermez pas cette fenêtre.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Total / Confirm bar */}
                {payStep === 'select' && (
                  <div className={`p-5 border-t space-y-4 transition-colors ${darkMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-150 bg-slate-50'}`}>
                    <div className="space-y-1.5 text-xs text-slate-500">
                      <div className="flex justify-between">
                        <span>Sous-total articles :</span>
                        <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatMoney(cartSubtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frais de livraison :</span>
                        <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatMoney(deliveryCost)}</span>
                      </div>
                      <div className={`flex justify-between text-base font-black border-t pt-2 ${darkMode ? 'text-slate-100 border-slate-850' : 'text-slate-900 border-slate-200'}`}>
                        <span>Total à payer :</span>
                        <span className="text-[var(--tenant-color)]">{formatMoney(cartTotal)}</span>
                      </div>
                    </div>

                    {payMethod === 'livraison' ? (
                      <button
                        onClick={() => handleCheckoutSubmit({ methode: 'À la livraison', statut: 'En attente' })}
                        className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-emerald-650/10"
                      >
                        <MessageSquare className="w-4 h-4" /> Confirmer & Commander sur WhatsApp
                      </button>
                    ) : payMethod === 'wave' && activeShop.abonnement?.plan === 'Premium' && activeShop.waveMerchantLink ? (
                      waveOpened ? (
                        <button
                          onClick={() => {
                            const refTx = `WAVE-LINK-${Math.floor(100000 + Math.random() * 900000)}`;
                            handleCheckoutSubmit({
                              methode: 'Wave Pay',
                              statut: 'Payé (Lien Direct)',
                              reference: refTx
                            });
                          }}
                          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-emerald-650/15"
                        >
                          <MessageSquare className="w-4 h-4" /> Confirmer ma commande sur WhatsApp
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            let cleanBaseUrl = activeShop.waveMerchantLink || '';
                            if (!cleanBaseUrl.startsWith('http')) {
                              cleanBaseUrl = `https://pay.wave.com/m/${cleanBaseUrl}/c/sn/`;
                            } else {
                              cleanBaseUrl = cleanBaseUrl.split('?')[0];
                            }
                            const totalWithFees = Math.round(cartTotal * 1.01);
                            window.open(`${cleanBaseUrl}?amount=${totalWithFees}`, '_blank');
                            setWaveOpened(true);
                          }}
                          className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sky-500/10 animate-pulse"
                        >
                          <span>📲 Ouvrir Wave & Payer {formatMoney(Math.round(cartTotal * 1.01))}</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={handleLaunchPayment}
                        disabled={!payPhone}
                        className={`w-full py-3.5 rounded-xl text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          payMethod === 'wave' 
                          ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/10' 
                          : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/10'
                        }`}
                      >
                        Payer {formatMoney(cartTotal)}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {checkoutStep === 'success' && (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-5 overflow-y-auto">
                {/* Animation succès */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center shadow-lg">
                    <svg className="w-12 h-12 text-emerald-500" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14 27l8 8 16-16" />
                    </svg>
                  </div>
                </div>

                <div>
                  <h3 className={`font-black text-xl ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Commande Confirmée !</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">Réf. {lastOrderId}</p>
                </div>

                {/* Résumé commande */}
                {lastOrderSummary && (
                  <div className={`w-full border rounded-2xl p-4 text-left space-y-2 transition-colors ${darkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Votre commande</p>
                    {lastOrderSummary.items?.map((item, i) => (
                      <div key={i} className={`flex justify-between text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="font-semibold">{item.quantity}× {item.name}</span>
                        <span className="font-bold font-mono">{formatMoney(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className={`border-t pt-2 flex justify-between text-sm font-black ${darkMode ? 'border-slate-850 text-slate-100' : 'border-slate-200 text-slate-900'}`}>
                      <span>Total payé</span>
                      <span className="text-[var(--tenant-color)]">{formatMoney(lastOrderSummary.total)}</span>
                    </div>
                  </div>
                )}

                <p className={`text-xs leading-relaxed max-w-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Votre commande a été envoyée sur WhatsApp. Le marchand vous contactera rapidement pour confirmer la livraison.
                </p>

                <div className="flex flex-col gap-2 w-full">
                  <a
                    href={`https://wa.me/${String(activeShop.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour, j'ai passé la commande réf. ${lastOrderId}. Pouvez-vous me confirmer la livraison ?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" /> Suivre sur WhatsApp
                  </a>
                  <button
                    onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }}
                    className={`w-full py-2.5 border font-semibold rounded-xl text-sm transition-colors cursor-pointer ${darkMode ? 'border-slate-800 text-slate-450 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Continuer mes achats
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (() => {
        const hasVariants = selectedProduct.variantes && selectedProduct.variantes.length > 0;
        // Photos du produit (tableau ou photo unique)
        const productPhotos = (selectedProduct.photos && selectedProduct.photos.length > 0)
          ? selectedProduct.photos
          : selectedProduct.photo ? [selectedProduct.photo] : [];
        // Si variante sélectionnée avec photo, on l'affiche en priorité
        const displayPhoto = selectedVariant?.photo || productPhotos[activePhotoIdx] || selectedProduct.photo;
        const needsChoice = hasVariants && !selectedVariant;
        const closeModal = () => { setSelectedProduct(null); setSelectedVariant(null); setActivePhotoIdx(0); setLightboxOpen(false); };
        return (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70" onClick={closeModal}>
          <div className={`w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}`} onClick={(e) => e.stopPropagation()}>

            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 p-6 md:p-8">
              {/* Left Column: Image Gallery */}
              <div className="space-y-4">
                {/* Main Photo Container */}
                <div className={`w-full h-72 sm:h-96 md:h-[400px] border rounded-2xl relative flex items-center justify-center overflow-hidden group shadow-sm transition-colors ${darkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                  {displayPhoto ? (
                    <img
                      src={thumb(displayPhoto, 1000)}
                      onError={fallbackSrc(displayPhoto)}
                      alt={selectedProduct.name}
                      onClick={() => setLightboxOpen(true)}
                      className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                    />
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center text-sm ${darkMode ? 'bg-slate-950 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                      <ShoppingBag className="w-12 h-12 stroke-[1.5] mb-2" />
                      <span>Aucune image disponible</span>
                    </div>
                  )}
                  {/* Flèches navigation (seulement si pas de variante affichée et plusieurs photos) */}
                  {!selectedVariant?.photo && productPhotos.length > 1 && (
                    <>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(i => (i - 1 + productPhotos.length) % productPhotos.length); }}
                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 shadow-md rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${darkMode ? 'bg-slate-800/95 hover:bg-slate-800 text-slate-200 hover:text-white' : 'bg-white/95 hover:bg-white text-slate-800 hover:text-slate-900'}`}
                      >
                        <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(i => (i + 1) % productPhotos.length); }}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 shadow-md rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${darkMode ? 'bg-slate-800/95 hover:bg-slate-800 text-slate-200 hover:text-white' : 'bg-white/95 hover:bg-white text-slate-800 hover:text-slate-900'}`}
                      >
                        <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                      </button>
                      {/* Indicateurs points */}
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                        {productPhotos.map((_, i) => (
                          <button 
                            key={i} 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(i); }}
                            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === activePhotoIdx ? 'bg-[var(--tenant-color)] scale-125' : (darkMode ? 'bg-slate-700' : 'bg-slate-300')}`} 
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnails list */}
                {!selectedVariant?.photo && productPhotos.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto py-2 px-0.5 scrollbar-thin scrollbar-thumb-slate-200">
                    {productPhotos.map((url, i) => (
                      <button 
                        key={i} 
                        type="button" 
                        onClick={() => setActivePhotoIdx(i)}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer shadow-sm ${i === activePhotoIdx ? 'border-[var(--tenant-color)] ring-2 ring-[var(--tenant-color)]/20' : (darkMode ? 'border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100' : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100')}`}
                      >
                        <img src={thumb(url, 200)} onError={fallbackSrc(url)} alt={`${i+1}`} loading="lazy" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Product Details & Purchase Controls */}
              <div className="flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  {/* Category & Title */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold tracking-wider text-[var(--tenant-color)] uppercase bg-[var(--tenant-color-light)] px-3 py-1 rounded-md inline-block">
                      {selectedProduct.category}
                    </span>
                    <h3 className={`font-extrabold text-2xl md:text-3xl tracking-tight leading-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {selectedProduct.name}
                      {selectedVariant && <span className="text-[var(--tenant-color)]"> — {selectedVariant.nom}</span>}
                    </h3>
                    <div className="text-2xl md:text-3xl font-black text-[var(--tenant-color)] mt-2">
                      {formatMoney(selectedProduct.price)}
                    </div>
                  </div>

                  {/* Description */}
                  {selectedProduct.description && (
                    <div className={`text-sm leading-relaxed border-t pt-4 ${darkMode ? 'border-slate-850 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                      <p className={`font-semibold mb-1 text-xs uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Description</p>
                      <p className="whitespace-pre-line">{selectedProduct.description}</p>
                    </div>
                  )}

                  {/* Variants selector */}
                  {hasVariants && (
                    <div className={`border-t pt-4 ${darkMode ? 'border-slate-850' : 'border-slate-100'}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Option : <span className="text-[var(--tenant-color)] font-extrabold">{selectedVariant ? selectedVariant.nom : 'Choisissez une option'}</span> <span className="text-red-500">*</span>
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {selectedProduct.variantes.map(v => {
                          const active = selectedVariant?.id === v.id;
                          const vStock = Number(v.stock) || 0;
                          const vOut = vStock <= 0;
                          return (
                            <button
                              key={v.id}
                              onClick={() => { 
                                if (!vOut) {
                                  setSelectedVariant(selectedVariant?.id === v.id ? null : v);
                                  setModalQty(1);
                                }
                              }}
                              disabled={vOut}
                              className={`rounded-xl border-2 overflow-hidden transition-all relative cursor-pointer ${
                                vOut ? (darkMode ? 'border-slate-850 bg-slate-900/40 opacity-40 cursor-not-allowed' : 'border-slate-100 bg-slate-50/50 opacity-40 cursor-not-allowed')
                                : active ? 'border-[var(--tenant-color)] ring-2 ring-[var(--tenant-color)]/20 shadow-md scale-[1.02]' : (darkMode ? 'border-slate-800 hover:border-slate-750 hover:scale-[1.01]' : 'border-slate-200 hover:border-slate-300 hover:scale-[1.01]')
                              }`}
                            >
                              <div className={`w-full h-16 relative ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
                                {v.photo
                                  ? <img src={thumb(v.photo, 200)} onError={fallbackSrc(v.photo)} alt={v.nom} loading="lazy" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">—</div>}
                                {vOut && (
                                  <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                                    <X className="w-6 h-6 text-red-500 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                              <p className={`text-[10px] font-bold py-1 px-1 truncate ${active ? 'text-[var(--tenant-color)]' : (darkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                                {v.nom}
                              </p>
                              <p className={`text-[8px] pb-1 ${vOut ? 'text-red-500 font-semibold' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                                {vOut ? 'Épuisé' : `${vStock} dispo`}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stock, Quantity Selector, and Add to Cart Widget */}
                {(() => {
                  const dispoStock = selectedVariant ? (Number(selectedVariant.stock) || 0) : selectedProduct.stock;
                  return (
                    <div className={`border-t pt-5 mt-4 space-y-4 p-4 rounded-2xl border transition-colors ${darkMode ? 'border-slate-850 bg-slate-950/40' : 'border-slate-100 bg-slate-50/70'}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[9px]">Disponibilité</span>
                          <span className={`font-bold flex items-center gap-1.5 text-sm ${dispoStock <= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            <span className={`w-2 h-2 rounded-full ${dispoStock <= 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span>
                            {dispoStock <= 0 ? 'En rupture de stock' : `${dispoStock} article(s) disponible(s)`}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      {dispoStock > 0 && !needsChoice && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantité :</span>
                          <div className={`flex items-center border rounded-xl overflow-hidden shadow-sm ${darkMode ? 'border-slate-850 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                            <button
                              type="button"
                              onClick={() => setModalQty(q => Math.max(1, q - 1))}
                              className={`px-3 py-1.5 font-bold transition-colors cursor-pointer disabled:opacity-40 ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                              disabled={modalQty <= 1}
                            >
                              -
                            </button>
                            <span className={`px-4 text-sm font-bold w-8 text-center ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{modalQty}</span>
                            <button
                              type="button"
                              onClick={() => setModalQty(q => Math.min(dispoStock, q + 1))}
                              className={`px-3 py-1.5 font-bold transition-colors cursor-pointer disabled:opacity-40 ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                              disabled={modalQty >= dispoStock}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        {/* Commander directement */}
                        <button
                          onClick={() => {
                            if (needsChoice || dispoStock <= 0) return;
                            addToCart(selectedProduct, selectedVariant, modalQty);
                            closeModal();
                            goToDelivery();
                          }}
                          disabled={dispoStock <= 0 || needsChoice}
                          className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                            dispoStock <= 0 || needsChoice
                            ? (darkMode ? 'bg-slate-850 text-slate-500 border border-slate-800 cursor-not-allowed shadow-none' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed')
                            : 'bg-[var(--tenant-color)] hover:bg-[var(--tenant-color-hover)] text-white hover:shadow-lg active:scale-95 transform'
                          }`}
                        >
                          {needsChoice
                            ? 'Choisissez une option'
                            : dispoStock <= 0
                            ? 'Rupture de stock'
                            : 'Commander maintenant'}
                        </button>

                        {/* Ajouter au panier (continuer les achats) */}
                        <button
                          onClick={() => {
                            if (needsChoice || dispoStock <= 0) return;
                            addToCart(selectedProduct, selectedVariant, modalQty);
                            closeModal();
                          }}
                          disabled={dispoStock <= 0 || needsChoice}
                          className={`w-full py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            dispoStock <= 0 || needsChoice
                            ? (darkMode ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed' : 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed')
                            : 'bg-[var(--tenant-color-light)] text-[var(--tenant-color)] border border-[var(--tenant-color)]/30 hover:opacity-80 cursor-pointer active:scale-95'
                          }`}
                        >
                          <Plus className="w-4 h-4 stroke-[3]" /> Ajouter au panier
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Lightbox plein écran (zoom + défilement des photos) */}
        {lightboxOpen && displayPhoto && (
          <div
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center select-none"
            onClick={() => setLightboxOpen(false)}
            onTouchStart={(e) => { lightboxTouchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (lightboxTouchX.current == null) return;
              const dx = e.changedTouches[0].clientX - lightboxTouchX.current;
              lightboxTouchX.current = null;
              if (Math.abs(dx) > 40 && productPhotos.length > 1 && !selectedVariant?.photo) {
                setActivePhotoIdx(i => dx < 0 ? (i + 1) % productPhotos.length : (i - 1 + productPhotos.length) % productPhotos.length);
              }
            }}
          >
            <button onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
              className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              style={{ marginTop: 'env(safe-area-inset-top)' }}>
              <X className="w-5 h-5" />
            </button>
            <img src={displayPhoto} alt={selectedProduct.name}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[92vw] max-h-[82vh] object-contain" />
            {!selectedVariant?.photo && productPhotos.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(i => (i - 1 + productPhotos.length) % productPhotos.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(i => (i + 1) % productPhotos.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
                  <div className="flex gap-1.5">
                    {productPhotos.map((_, i) => (
                      <button key={i} onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(i); }}
                        className={`w-2 h-2 rounded-full transition-all ${i === activePhotoIdx ? 'bg-white scale-125' : 'bg-white/40'}`} />
                    ))}
                  </div>
                  <span className="text-white/70 text-xs font-medium">{activePhotoIdx + 1} / {productPhotos.length}</span>
                </div>
              </>
            )}
          </div>
        )}
        </>
        );
      })()}

      {/* Floating WhatsApp button */}
      {!isCartOpen && activeShop.whatsapp && (
        <a
          href={`https://wa.me/${String(activeShop.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${activeShop.name}, j'ai une question.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center transition-all hover:scale-110"
          title="Contacter sur WhatsApp"
        >
          <MessageSquare className="w-6 h-6" />
        </a>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 mt-16 relative">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Boutique info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {activeShop.logo && typeof activeShop.logo === 'string' && (activeShop.logo.startsWith('/') || activeShop.logo.startsWith('http') || activeShop.logo.startsWith('data:image')) ? (
                  <img src={activeShop.logo} alt="Logo" className="w-8 h-8 object-contain" />
                ) : (
                  <span className="text-2xl">{activeShop.logo || '🛍️'}</span>
                )}
              </div>
              <div>
                <p className="font-black text-white text-sm leading-tight">{activeShop.name}</p>
                <p className="text-[10px] text-slate-500">Boutique vérifiée</p>
              </div>
            </div>
            {activeShop.description && (
              <p className="text-xs leading-relaxed text-slate-500 line-clamp-3">{activeShop.description}</p>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contact</p>
            {activeShop.adresse && (
              <div className="flex items-start gap-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-[var(--tenant-color)] shrink-0 mt-0.5" />
                <span>{activeShop.adresse}</span>
              </div>
            )}
            {activeShop.whatsapp && (
              <a
                href={`https://wa.me/${String(activeShop.whatsapp || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> {activeShop.whatsapp}
              </a>
            )}
            {(activeShop.instagram || activeShop.facebook) && (
              <div className="flex gap-3 pt-1">
                {activeShop.instagram && (
                  <a href={`https://instagram.com/${activeShop.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-semibold text-slate-400 hover:text-white transition-colors">
                    Instagram
                  </a>
                )}
                {activeShop.facebook && (
                  <a href={activeShop.facebook} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-semibold text-slate-400 hover:text-white transition-colors">
                    Facebook
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Plateforme</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cette boutique est propulsée par <strong className="text-slate-300">Jappandal Tech</strong>, solution e-commerce multi-tenant pour l'Afrique de l'Ouest.
            </p>
            <Link to="/" className="inline-block text-[10px] font-semibold text-[var(--tenant-color)] hover:underline">
              Ouvrir votre boutique →
            </Link>
          </div>
        </div>

        <div className="border-t border-white/5 py-4 px-6 text-center text-[10px] text-slate-600">
          © {new Date().getFullYear()} {activeShop.name} · Commandes passées directement via WhatsApp.
        </div>
      </footer>
    </div>
  );
}

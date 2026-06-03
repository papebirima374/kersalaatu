import { toast } from '../../components/toast';
import React, { useState, useEffect } from 'react';
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
  CreditCard,
  Truck
} from 'lucide-react';

export default function PublicStorefront() {
  const { shopSlug } = useParams();
  const { 
    getBoutiqueBySlug, 
    getProductsByBoutique, 
    createOrder,
    dataReady
  } = useTenant();

  const activeShop = getBoutiqueBySlug(shopSlug);

  // Produits directement depuis le contexte (réactif aux onSnapshot Firestore)
  const products = activeShop ? getProductsByBoutique(activeShop.id) : [];

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // cart, delivery, success
  const [selectedProduct, setSelectedProduct] = useState(null); // Product detail modal
  const [selectedVariant, setSelectedVariant] = useState(null); // Variante choisie dans le modal
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [modalQty, setModalQty] = useState(1);

  // Réinitialiser les index de photo et quantité au changement de produit/variante
  useEffect(() => {
    setModalQty(1);
    setActivePhotoIdx(0);
  }, [selectedProduct?.id, selectedVariant?.id]);

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

  // Initialiser la zone de livraison par défaut
  useEffect(() => {
    if (activeShop?.zonesLivraison?.length > 0) {
      setDeliveryZone(activeShop.zonesLivraison[0].id);
    }
  }, [activeShop?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync payment phone with delivery phone
  // ⚠️ Doit rester AVANT tout return anticipé (Rules of Hooks — sinon React error #310)
  useEffect(() => {
    if (checkoutStep === 'payment') {
      setPayPhone(clientForm.telephone);
    }
  }, [checkoutStep, clientForm.telephone]);

  // Titre de l'onglet = nom de la boutique (onglet navigateur, écran d'accueil PWA, SEO léger)
  useEffect(() => {
    if (activeShop?.name) {
      document.title = `${activeShop.name} — Boutique en ligne`;
    }
    return () => { document.title = 'Jappandal Tech - Plateforme E-Commerce Multi-boutiques'; };
  }, [activeShop?.name]);

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
      const refTx = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
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
    const orderId = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" style={themeStyles}>
      
      {/* Top Banner (Header) */}
      <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-100 px-6 py-4 pt-safe flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--tenant-color-light)] text-[var(--tenant-color)] font-extrabold text-2xl flex items-center justify-center border border-[var(--tenant-color)]/10 shadow-sm overflow-hidden">
            {activeShop.logo && typeof activeShop.logo === 'string' && (activeShop.logo.startsWith('/') || activeShop.logo.startsWith('http') || activeShop.logo.startsWith('data:image')) ? (
              <img src={activeShop.logo} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              activeShop.logo || '🛍️'
            )}
          </div>
          <div>
            <h1 className="font-black text-lg md:text-xl tracking-tight text-slate-900 leading-none">{activeShop.name}</h1>
            <span className="text-[10px] text-slate-400 mt-1 block">Boutique Vérifiée</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Back to landing */}
          <Link to="/" className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors hidden sm:block">
            Plateforme Jappandal
          </Link>
          {/* Cart Icon */}
          <button 
            onClick={() => {
              setCheckoutStep('cart');
              setIsCartOpen(true);
            }}
            className="p-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white relative transition-all shadow-md cursor-pointer hover:scale-105"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--tenant-color)] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden border-b border-slate-100">
        {/* Fond dégradé couleur marque */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 60% 40%, ${activeShop.couleurMarque} 0%, transparent 70%)` }}
        />
        <div className="relative max-w-5xl mx-auto px-6 py-12 md:py-16 flex flex-col md:flex-row items-center gap-8">
          {/* Logo grand format */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white shadow-xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
            {activeShop.logo && typeof activeShop.logo === 'string' && (activeShop.logo.startsWith('/') || activeShop.logo.startsWith('http') || activeShop.logo.startsWith('data:image')) ? (
              <img src={activeShop.logo} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <span className="text-5xl">{activeShop.logo || '🛍️'}</span>
            )}
          </div>

          {/* Infos boutique */}
          <div className="text-center md:text-left flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white bg-[var(--tenant-color)] px-3 py-1 rounded-full shadow-sm">
                ✓ Boutique Vérifiée
              </span>
              {activeShop.abonnement?.plan && activeShop.abonnement.plan !== 'Découverte' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                  ⭐ {activeShop.abonnement.plan}
                </span>
              )}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">{activeShop.name}</h2>
            <p className="text-slate-500 text-sm md:text-base leading-relaxed max-w-xl">{activeShop.description}</p>

            {/* Stats rapides */}
            <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-1">
              <div className="text-center">
                <p className="text-xl font-black text-slate-900">{products.filter(p => p.actif).length}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Produits</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="text-center">
                <p className="text-xl font-black text-slate-900">{activeShop.zonesLivraison?.length || 0}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Zones livrées</p>
              </div>
              {activeShop.adresse && (
                <>
                  <div className="w-px bg-slate-200" />
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-[var(--tenant-color)]" /> {activeShop.adresse}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bouton contact WhatsApp */}
          <a
            href={`https://wa.me/${String(activeShop.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${activeShop.name}, j'ai une question sur votre boutique.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 text-sm"
          >
            <MessageSquare className="w-4 h-4" /> Contacter
          </a>
        </div>
      </section>

      {/* Main product catalogue view */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-grow">
        
        {/* Search & Categories */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-8 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Rechercher un article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[var(--tenant-color)] focus:bg-white transition-all text-sm"
            />
          </div>

          {/* Categories tags list */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCategory === cat ? 'bg-[var(--tenant-color)] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Catalog — Grille uniforme */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden group hover:shadow-xl hover:-translate-y-1 hover:border-[var(--tenant-color)]/40 transition-all duration-300 flex flex-col"
            >
              {/* Image carrée — survol révèle la 2e photo */}
              <div
                className="w-full aspect-square bg-slate-50 overflow-hidden relative cursor-pointer shrink-0"
                onClick={() => setSelectedProduct(prod)}
              >
                {gallery[0] ? (
                  <>
                    <img
                      src={gallery[0]}
                      alt={prod.name}
                      loading="lazy"
                      className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${secondPhoto ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
                    />
                    {secondPhoto && (
                      <img
                        src={secondPhoto}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-300 text-xs">
                    <ShoppingBag className="w-9 h-9 stroke-[1.5] mb-1" />
                    <span>Pas d'image</span>
                  </div>
                )}

                {/* Badges haut-gauche */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                  {isBestseller && (
                    <span className="bg-amber-400 text-slate-900 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                      ⭐ Bestseller
                    </span>
                  )}
                  {isNew && !isBestseller && (
                    <span className="bg-[var(--tenant-color)] text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                      Nouveau
                    </span>
                  )}
                  {prod.stock > 0 && prod.stock <= 3 && (
                    <span className="bg-orange-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                      Plus que {prod.stock} !
                    </span>
                  )}
                </div>

                {/* Pastille nombre de photos */}
                {gallery.length > 1 && (
                  <span className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M21 7v12a2 2 0 0 1-2 2H7"/></svg>
                    {gallery.length}
                  </span>
                )}

                {/* Options (variantes) bas-gauche */}
                {hasVar && (
                  <span className="absolute bottom-2 left-2 z-10 bg-white/90 text-slate-700 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
                    {prod.variantes.length} options
                  </span>
                )}

                {/* Rupture */}
                {out && (
                  <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <span className="px-3 py-1 rounded-full bg-white text-slate-900 font-extrabold text-xs shadow-md">
                      Rupture de Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Infos + actions */}
              <div className="p-3 flex flex-col flex-1">
                <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase mb-1 truncate">
                  {prod.category}
                </span>
                <h3
                  className="font-semibold text-slate-800 text-sm line-clamp-2 cursor-pointer hover:text-[var(--tenant-color)] transition-colors leading-snug min-h-[2.5rem]"
                  onClick={() => setSelectedProduct(prod)}
                >
                  {prod.name}
                </h3>
                <p className="text-lg font-black text-[var(--tenant-color)] mt-1.5 leading-none">{formatMoney(prod.price)}</p>

                {/* Ligne d'action — toujours en bas */}
                <div className="flex gap-2 mt-3">
                  <button
                    aria-label="Ajouter au panier"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (out) return;
                      if (hasVar) { setSelectedProduct(prod); setSelectedVariant(null); }
                      else addToCart(prod);
                    }}
                    disabled={out}
                    className={`w-10 shrink-0 rounded-xl flex items-center justify-center transition-all border ${
                      out
                      ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                      : 'bg-white hover:bg-[var(--tenant-color-light)] text-[var(--tenant-color)] border-slate-200 hover:border-[var(--tenant-color)]/40'
                    }`}
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (out) return;
                      if (hasVar) { setSelectedProduct(prod); setSelectedVariant(null); return; }
                      addToCart(prod);
                      setCheckoutStep('delivery');
                      setIsCartOpen(true);
                    }}
                    disabled={out}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                      out
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-[var(--tenant-color)] hover:opacity-90 text-white shadow-sm active:scale-95'
                    }`}
                  >
                    {hasVar ? 'Choisir' : 'Commander'}
                  </button>
                </div>
              </div>
            </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-inner">
              <ShoppingBag className="w-16 h-16 mx-auto text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-lg">Aucun produit trouvé</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Essayez d'ajuster vos critères de recherche ou de changer de catégorie.</p>
            </div>
          )}
        </div>
      </main>

      {/* Cart Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
          
          {/* Drawer Wrapper */}
          <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between animate-slide-in relative">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[var(--tenant-color)]" />
                  {checkoutStep === 'cart' && `Panier (${cartCount})`}
                  {checkoutStep === 'delivery' && 'Livraison'}
                  {checkoutStep === 'payment' && 'Paiement'}
                  {checkoutStep === 'success' && 'Confirmation'}
                </h3>
                <button onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer">
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
                            'bg-slate-200 text-slate-400'
                          }`}>
                            {done ? '✓' : i + 1}
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-[var(--tenant-color)]' : done ? 'text-slate-500' : 'text-slate-300'}`}>
                            {labels[i]}
                          </span>
                        </div>
                        {i < 2 && <div className={`flex-1 h-0.5 mb-3 rounded-full transition-all ${done ? 'bg-[var(--tenant-color)]' : 'bg-slate-200'}`} />}
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
                      <ShoppingCart className="w-16 h-16 text-slate-200 mb-3" />
                      <p className="font-bold text-slate-500">Votre panier est vide</p>
                      <p className="text-xs max-w-[200px] mt-1">Ajoutez des articles du catalogue pour commander.</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.cartKey} className="flex gap-4 p-3 rounded-xl bg-slate-50 border border-slate-150 relative">
                        <img
                          src={item.photo}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover bg-slate-200 border border-slate-100"
                        />
                        <div className="flex-1 flex flex-col justify-between py-0.5">
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{item.name}</h4>
                            <span className="text-xs font-black text-slate-800 mt-1 block">{formatMoney(item.price)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            {/* Quantity buttons */}
                            <div className="flex items-center border border-slate-200 bg-white rounded-lg p-0.5">
                              <button
                                onClick={() => updateCartQty(item.cartKey, -1)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2 text-xs font-bold text-slate-700">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQty(item.cartKey, 1)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
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
                  <div className="p-5 border-t border-slate-150 bg-slate-50 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-500">Sous-total :</span>
                      <span className="font-black text-slate-800 text-lg">{formatMoney(cartSubtotal)}</span>
                    </div>
                    <button
                      onClick={() => setCheckoutStep('delivery')}
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

                  <h3 className="font-extrabold text-base text-slate-800 border-b border-slate-100 pb-2">Informations de livraison</h3>
                  
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
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 focus:outline-none focus:border-[var(--tenant-color)] rounded-xl text-sm"
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
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 focus:outline-none focus:border-[var(--tenant-color)] rounded-xl text-sm"
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
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 focus:outline-none focus:border-[var(--tenant-color)] rounded-xl text-sm"
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
                              ? 'border-[var(--tenant-color)] bg-[var(--tenant-color-light)] text-slate-800' 
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
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
                                <span className="text-xs font-semibold leading-tight text-slate-800">{zone.label || zone.nom}</span>
                                {zone.delai && (
                                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-1">
                                    <Truck className="w-3.5 h-3.5 text-[var(--tenant-color)] stroke-[2.5]" />
                                    <span>Délai : {zone.delai}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-black shrink-0 font-mono text-slate-900">{formatMoney(zone.price || zone.frais)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </form>
                </div>

                {/* Final Checkout recap */}
                <div className="p-5 border-t border-slate-150 bg-slate-50 space-y-4">
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Sous-total articles :</span>
                      <span className="font-semibold text-slate-700">{formatMoney(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frais de livraison :</span>
                      <span className="font-semibold text-slate-700">{formatMoney(deliveryCost)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2">
                      <span>Total à payer :</span>
                      <span className="text-[var(--tenant-color)]">{formatMoney(cartTotal)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-blue-50 text-blue-700 p-3 rounded-xl text-xs border border-blue-100">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Vos coordonnées de livraison seront enregistrées localement et pré-remplies pour votre prochaine visite.</p>
                  </div>

                  <button
                    onClick={() => {
                      setPayStep('select');
                      setCheckoutStep('payment');
                    }}
                    disabled={!clientForm.nom || !clientForm.telephone || !clientForm.adresse}
                    className={`w-full py-3.5 rounded-xl text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      (!clientForm.nom || !clientForm.telephone || !clientForm.adresse)
                      ? 'bg-slate-300 text-slate-450 cursor-not-allowed'
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
                      <h3 className="font-extrabold text-base text-slate-800 border-b border-slate-100 pb-2">Mode de paiement</h3>
                      
                      <div className="space-y-3">
                        {/* 1. Cash on delivery */}
                        <label 
                          onClick={() => setPayMethod('livraison')}
                          className={`p-4 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all ${
                            payMethod === 'livraison' 
                            ? 'border-slate-800 bg-slate-50 shadow-sm' 
                            : 'border-slate-200 hover:bg-slate-50/50'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="paymentMethod" 
                            checked={payMethod === 'livraison'}
                            onChange={() => setPayMethod('livraison')}
                            className="accent-slate-800"
                          />
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-extrabold text-sm text-slate-800 block">Paiement à la livraison</span>
                            <span className="text-[10px] text-slate-400 block">Payez en espèces lorsque vous recevez vos articles.</span>
                          </div>
                        </label>

                        {/* 2. Wave */}
                        <label 
                          onClick={() => setPayMethod('wave')}
                          className={`p-4 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all ${
                            payMethod === 'wave' 
                            ? 'border-sky-500 bg-sky-50 shadow-sm' 
                            : 'border-slate-200 hover:bg-slate-50/50'
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
                          <div className="flex-1 min-w-0">
                            <span className="font-extrabold text-sm text-slate-800 block">Wave Mobile Money</span>
                            <span className="text-[10px] text-slate-400 block">Règlement instantané sécurisé par l'application Wave.</span>
                          </div>
                        </label>

                        {/* 3. Orange Money */}
                        <label 
                          onClick={() => setPayMethod('om')}
                          className={`p-4 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all ${
                            payMethod === 'om' 
                            ? 'border-orange-500 bg-orange-50 shadow-sm' 
                            : 'border-slate-200 hover:bg-slate-50/50'
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
                          <div className="flex-1 min-w-0">
                            <span className="font-extrabold text-sm text-slate-800 block">Orange Money</span>
                            <span className="text-[10px] text-slate-400 block">Règlement instantané sécurisé via code d'autorisation Orange.</span>
                          </div>
                        </label>
                      </div>

                      {/* Phone Input & Visual QR helper for mobile money */}
                      {payMethod !== 'livraison' && (
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in text-left">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instructions de Règlement</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase text-white ${payMethod === 'wave' ? 'bg-sky-500' : 'bg-orange-500'}`}>
                              {payMethod === 'wave' ? 'Wave' : 'Orange Money'}
                            </span>
                          </div>

                          {/* Step-by-Step Instructions */}
                          <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed font-sans">
                            {payMethod === 'wave' ? (
                              <>
                                <p className="flex gap-2 items-start">
                                  <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                                  <span>Ouvrez l'application <strong>Wave</strong> sur votre téléphone.</span>
                                </p>
                                <p className="flex gap-2 items-start">
                                  <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                                  <span>Scannez le code QR ci-dessous pour payer automatiquement.</span>
                                </p>
                                <p className="flex gap-2 items-start">
                                  <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                                  <span>Ou envoyez le montant exact <strong>{formatMoney(cartTotal)}</strong> au numéro marchand : <strong className="font-mono text-slate-900">{activeShop.whatsapp}</strong></span>
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="flex gap-2 items-start">
                                  <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                                  <span>Composez le code USSD <strong>#144#39#</strong> sur votre mobile.</span>
                                </p>
                                <p className="flex gap-2 items-start">
                                  <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                                  <span>Saisissez votre code secret pour générer un code d'autorisation.</span>
                                </p>
                                <p className="flex gap-2 items-start">
                                  <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                                  <span>Effectuez le transfert de <strong>{formatMoney(cartTotal)}</strong> au numéro marchand : <strong className="font-mono text-slate-900">{activeShop.whatsapp}</strong></span>
                                </p>
                              </>
                            )}
                          </div>

                          {/* Beautiful simulated QR Code */}
                          <div className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 bg-white relative overflow-hidden group ${payMethod === 'wave' ? 'border-sky-200/60' : 'border-orange-200/60'}`}>
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

                          {/* Account details and user verification */}
                          <div className="space-y-3 border-t border-slate-200 pt-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Votre numéro de téléphone payeur</label>
                              <input
                                type="text"
                                required
                                placeholder="Ex: 77 123 45 67"
                                value={payPhone}
                                onChange={(e) => setPayPhone(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:border-[var(--tenant-color)] rounded-xl text-sm font-mono bg-white text-slate-800 shadow-inner"
                              />
                              <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                                Saisissez le numéro utilisé pour effectuer le transfert. Le commerçant vérifiera la réception de la somme de <strong>{formatMoney(cartTotal)}</strong>.
                              </p>
                            </div>
                          </div>
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
                        <h4 className="font-black text-slate-900 text-base">{payMethod === 'wave' ? 'Paiement Wave' : 'Paiement Orange Money'}</h4>
                        <p className="text-sm font-semibold text-slate-700 animate-pulse leading-snug">{payStatusText}</p>
                        <p className="text-[10px] text-slate-400 pt-3">Simulateur de transaction locale Jappandal Tech. Ne fermez pas cette fenêtre.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Total / Confirm bar */}
                {payStep === 'select' && (
                  <div className="p-5 border-t border-slate-150 bg-slate-50 space-y-4">
                    <div className="space-y-1.5 text-xs text-slate-500">
                      <div className="flex justify-between">
                        <span>Sous-total articles :</span>
                        <span className="font-semibold text-slate-700">{formatMoney(cartSubtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frais de livraison :</span>
                        <span className="font-semibold text-slate-700">{formatMoney(deliveryCost)}</span>
                      </div>
                      <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2">
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
                  <h3 className="font-black text-xl text-slate-900">Commande Confirmée !</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">Réf. {lastOrderId}</p>
                </div>

                {/* Résumé commande */}
                {lastOrderSummary && (
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Votre commande</p>
                    {lastOrderSummary.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-slate-700">
                        <span className="font-semibold">{item.quantity}× {item.name}</span>
                        <span className="font-bold font-mono">{formatMoney(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
                      <span>Total payé</span>
                      <span className="text-[var(--tenant-color)]">{formatMoney(lastOrderSummary.total)}</span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
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
                    className="w-full py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors cursor-pointer"
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
        const closeModal = () => { setSelectedProduct(null); setSelectedVariant(null); setActivePhotoIdx(0); };
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70" onClick={closeModal}>
          <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

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
                <div className="w-full h-72 sm:h-96 md:h-[400px] bg-slate-50 border border-slate-100 rounded-2xl relative flex items-center justify-center overflow-hidden group shadow-sm">
                  {displayPhoto ? (
                    <img
                      src={displayPhoto}
                      alt={selectedProduct.name}
                      className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 text-sm">
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
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 hover:bg-white text-slate-800 hover:text-slate-900 shadow-md rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(i => (i + 1) % productPhotos.length); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 hover:bg-white text-slate-800 hover:text-slate-900 shadow-md rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
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
                            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === activePhotoIdx ? 'bg-[var(--tenant-color)] scale-125' : 'bg-slate-300'}`} 
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
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer shadow-sm ${i === activePhotoIdx ? 'border-[var(--tenant-color)] ring-2 ring-[var(--tenant-color)]/20' : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'}`}
                      >
                        <img src={url} alt={`${i+1}`} className="w-full h-full object-cover" />
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
                    <h3 className="font-extrabold text-slate-900 text-2xl md:text-3xl tracking-tight leading-tight">
                      {selectedProduct.name}
                      {selectedVariant && <span className="text-[var(--tenant-color)]"> — {selectedVariant.nom}</span>}
                    </h3>
                    <div className="text-2xl md:text-3xl font-black text-[var(--tenant-color)] mt-2">
                      {formatMoney(selectedProduct.price)}
                    </div>
                  </div>

                  {/* Description */}
                  {selectedProduct.description && (
                    <div className="text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
                      <p className="font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Description</p>
                      <p className="whitespace-pre-line">{selectedProduct.description}</p>
                    </div>
                  )}

                  {/* Variants selector */}
                  {hasVariants && (
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
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
                                }
                              }}
                              disabled={vOut}
                              className={`rounded-xl border-2 overflow-hidden transition-all relative cursor-pointer ${
                                vOut ? 'border-slate-100 bg-slate-50/50 opacity-40 cursor-not-allowed'
                                : active ? 'border-[var(--tenant-color)] ring-2 ring-[var(--tenant-color)]/20 shadow-md scale-[1.02]' : 'border-slate-200 hover:border-slate-300 hover:scale-[1.01]'
                              }`}
                            >
                              <div className="w-full h-16 bg-slate-100 relative">
                                {v.photo
                                  ? <img src={v.photo} alt={v.nom} className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">—</div>}
                                {vOut && (
                                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                    <X className="w-6 h-6 text-red-500 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                              <p className={`text-[10px] font-bold py-1 px-1 truncate ${active ? 'text-[var(--tenant-color)]' : 'text-slate-700'}`}>
                                {v.nom}
                              </p>
                              <p className={`text-[8px] pb-1 ${vOut ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
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
                    <div className="border-t border-slate-100 pt-5 mt-4 space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Disponibilité</span>
                          <span className={`font-bold flex items-center gap-1.5 text-sm ${dispoStock <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            <span className={`w-2 h-2 rounded-full ${dispoStock <= 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span>
                            {dispoStock <= 0 ? 'En rupture de stock' : `${dispoStock} article(s) disponible(s)`}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      {dispoStock > 0 && !needsChoice && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantité :</span>
                          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <button
                              type="button"
                              onClick={() => setModalQty(q => Math.max(1, q - 1))}
                              className="px-3 py-1.5 hover:bg-slate-100 text-slate-600 font-bold transition-colors cursor-pointer disabled:opacity-40"
                              disabled={modalQty <= 1}
                            >
                              -
                            </button>
                            <span className="px-4 text-sm font-bold text-slate-800 w-8 text-center">{modalQty}</span>
                            <button
                              type="button"
                              onClick={() => setModalQty(q => Math.min(dispoStock, q + 1))}
                              className="px-3 py-1.5 hover:bg-slate-100 text-slate-600 font-bold transition-colors cursor-pointer disabled:opacity-40"
                              disabled={modalQty >= dispoStock}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          if (needsChoice || dispoStock <= 0) return;
                          addToCart(selectedProduct, selectedVariant, modalQty);
                          closeModal();
                        }}
                        disabled={dispoStock <= 0 || needsChoice}
                        className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                          dispoStock <= 0 || needsChoice
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'bg-[var(--tenant-color)] hover:bg-[var(--tenant-color-hover)] text-white hover:shadow-lg active:scale-95 transform'
                        }`}
                      >
                        {needsChoice ? (
                          'Choisissez une option'
                        ) : dispoStock <= 0 ? (
                          'Rupture de stock'
                        ) : (
                          <>
                            <span>Ajouter au panier</span>
                            <span className="text-xs opacity-80 px-2 py-0.5 bg-black/10 rounded">
                              {formatMoney(selectedProduct.price * modalQty)}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
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

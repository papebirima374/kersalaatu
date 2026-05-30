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
    createOrder 
  } = useTenant();

  const activeShop = getBoutiqueBySlug(shopSlug);

  // States
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // cart, delivery, success
  const [selectedProduct, setSelectedProduct] = useState(null); // Product detail modal

  // Delivery form state
  const [clientForm, setClientForm] = useState({
    nom: '',
    telephone: '',
    adresse: ''
  });
  const [deliveryZone, setDeliveryZone] = useState('');

  // Payment states
  const [payMethod, setPayMethod] = useState('livraison'); // livraison, wave, om
  const [payStep, setPayStep] = useState('select'); // select, processing, done
  const [payPhone, setPayPhone] = useState('');
  const [payStatusText, setPayStatusText] = useState('');

  const activeShopId = activeShop?.id;
  useEffect(() => {
    if (activeShopId) {
      setProducts(getProductsByBoutique(activeShopId));
      if (activeShop?.zonesLivraison?.length > 0) {
        setDeliveryZone(activeShop.zonesLivraison[0].id);
      }
    }
  // getProductsByBoutique est mémoïsé dans TenantContext (useCallback), safe en dépendance
  }, [activeShopId, getProductsByBoutique]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentZone = activeShop?.zonesLivraison?.find(z => z.id === deliveryZone) || activeShop?.zonesLivraison?.[0] || { label: 'Livraison', price: 0 };

  if (!activeShop) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 text-3xl mb-4">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Boutique Introuvable</h2>
        <p className="text-slate-400 max-w-sm mb-6">Nous n'avons pas trouvé de boutique correspondant à l'adresse "/shop/{shopSlug}".</p>
        <Link to="/" className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all">
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
          Retourner sur Kër Salaatu Tech
        </Link>
      </div>
    );
  }

  // Categories list based on shop products
  const categories = ['Tous', ...new Set(products.map(p => p.category))];

  // Filters
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Tous' || p.category === selectedCategory;
    return matchesSearch && matchesCategory && p.actif;
  });

  // Cart operations
  const addToCart = (product) => {
    if (product.stock <= 0) return;
    
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        // Check stock
        if (existing.quantity >= product.stock) {
          alert(`Désolé, il n'y a que ${product.stock} unités de ce produit en stock.`);
          return prevCart;
        }
        return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId, change) => {
    const product = products.find(p => p.id === productId);
    
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + change;
          if (newQty <= 0) return null;
          if (product && newQty > product.stock) {
            alert(`Désolé, il n'y a que ${product.stock} unités de ce produit en stock.`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryCost = cart.length > 0 ? currentZone.price : 0;
  const cartTotal = cartSubtotal + deliveryCost;

  // Format currency
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  // Sync payment phone with delivery phone
  useEffect(() => {
    if (checkoutStep === 'payment') {
      setPayPhone(clientForm.telephone);
    }
  }, [checkoutStep, clientForm.telephone]);

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
              alert(`Stock insuffisant pour "${item.name}". Il ne reste que ${currentDbStock} pièces en stock. Votre panier a été mis à jour.`);
              setProducts(prev => prev.map(p => p.id === item.id ? { ...p, stock: currentDbStock } : p));
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
          alert(`Stock insuffisant pour "${item.name}". Il ne reste que ${product.stock} pièces en stock. Votre panier a été mis à jour.`);
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
      alert("Veuillez saisir votre numéro Mobile Money.");
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
      alert('Veuillez remplir toutes les informations de livraison.');
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
    const whatsappUrl = `https://wa.me/${activeShop.whatsapp.replace(/\+/g, '')}?text=${encodedMessage}`;

    // 3. Clear cart and redirect
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
      <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--tenant-color-light)] text-[var(--tenant-color)] font-extrabold text-2xl flex items-center justify-center border border-[var(--tenant-color)]/10 shadow-sm overflow-hidden">
            {activeShop.logo && (activeShop.logo.startsWith('/') || activeShop.logo.startsWith('http') || activeShop.logo.startsWith('data:image')) ? (
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
            Plateforme Kër Salaatu
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
      <section className="bg-white px-6 py-10 md:py-16 text-center border-b border-slate-150 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-[var(--tenant-color)]/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-[var(--tenant-color-light)] text-[var(--tenant-color)] text-5xl mx-auto flex items-center justify-center shadow-lg border border-[var(--tenant-color)]/5 overflow-hidden">
            {activeShop.logo && (activeShop.logo.startsWith('/') || activeShop.logo.startsWith('http') || activeShop.logo.startsWith('data:image')) ? (
              <img src={activeShop.logo} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              activeShop.logo || '🛍️'
            )}
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900">{activeShop.name}</h2>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed">{activeShop.description}</p>
          
          {activeShop.adresse && (
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              <MapPin className="w-3.5 h-3.5" /> {activeShop.adresse}
            </div>
          )}
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

        {/* Product Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => (
            <div 
              key={prod.id} 
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between overflow-hidden group hover:shadow-md hover:border-slate-300 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedProduct(prod)}
            >
              <div>
                {/* Product Image */}
                <div className="w-full h-52 bg-slate-100 overflow-hidden relative">
                  <img 
                    src={prod.photo} 
                    alt={prod.name} 
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-350"
                  />
                  {prod.stock === 0 ? (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="px-3 py-1.5 rounded-full bg-red-650 text-white font-extrabold text-xs shadow-md">
                        Rupture de Stock
                      </span>
                    </div>
                  ) : prod.stock <= 3 ? (
                    <div className="absolute top-2.5 left-2.5 bg-amber-500 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                      Stock Limité: {prod.stock} restant(s)
                    </div>
                  ) : null}
                </div>

                {/* Details */}
                <div className="p-4 space-y-1">
                  <span className="text-[9px] font-bold tracking-wider text-[var(--tenant-color)] uppercase bg-[var(--tenant-color-light)] px-2 py-0.5 rounded-md inline-block">
                    {prod.category}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base line-clamp-1 group-hover:text-[var(--tenant-color)] transition-colors">{prod.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{prod.description}</p>
                </div>
              </div>

              {/* Price & Buy bar */}
              <div className="p-4 pt-0">
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-semibold">Prix</span>
                    <span className="text-base font-black text-slate-900">{formatMoney(prod.price)}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(prod);
                    }}
                    disabled={prod.stock === 0}
                    className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      prod.stock === 0 
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-[var(--tenant-color)] hover:bg-[var(--tenant-color-hover)] text-white shadow-sm shadow-[var(--tenant-color)]/10 hover:scale-105'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Panier
                  </button>
                </div>
              </div>
            </div>
          ))}

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
            <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-slate-700" />
                <h3 className="font-extrabold text-lg text-slate-800">Votre Panier ({cartCount})</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
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
                      <div key={item.id} className="flex gap-4 p-3 rounded-xl bg-slate-50 border border-slate-150 relative">
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
                                onClick={() => updateCartQty(item.id, -1)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2 text-xs font-bold text-slate-700">{item.quantity}</span>
                              <button 
                                onClick={() => updateCartQty(item.id, 1)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button 
                              onClick={() => removeFromCart(item.id)}
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
                            ? 'border-slate-800 bg-slate-50 shadow-sm scale-[1.02]' 
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
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-extrabold text-sm text-slate-800 block">Paiement à la livraison</span>
                            <span className="text-[10px] text-slate-400">Payez en espèces lorsque vous recevez vos articles.</span>
                          </div>
                        </label>

                        {/* 2. Wave */}
                        <label 
                          onClick={() => setPayMethod('wave')}
                          className={`p-4 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all ${
                            payMethod === 'wave' 
                            ? 'border-sky-500 bg-sky-50 shadow-sm scale-[1.02]' 
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
                          <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black text-lg">
                            W
                          </div>
                          <div>
                            <span className="font-extrabold text-sm text-slate-800 block">Wave Mobile Money</span>
                            <span className="text-[10px] text-slate-400">Règlement instantané sécurisé par l'application Wave.</span>
                          </div>
                        </label>

                        {/* 3. Orange Money */}
                        <label 
                          onClick={() => setPayMethod('om')}
                          className={`p-4 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all ${
                            payMethod === 'om' 
                            ? 'border-orange-500 bg-orange-50 shadow-sm scale-[1.02]' 
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
                          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-xs">
                            OM
                          </div>
                          <div>
                            <span className="font-extrabold text-sm text-slate-800 block">Orange Money</span>
                            <span className="text-[10px] text-slate-400">Règlement instantané sécurisé via code d'autorisation Orange.</span>
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
                        <p className="text-[10px] text-slate-400 pt-3">Simulateur de transaction locale Kër Salaatu Tech. Ne fermez pas cette fenêtre.</p>
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
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-5">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl animate-bounce shadow">
                  🎉
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-950">Commande Envoyée !</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Votre panier a été transféré sur WhatsApp. Si la fenêtre ne s'est pas ouverte automatiquement, veuillez vérifier vos bloqueurs de pop-up.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutStep('cart');
                  }}
                  className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Continuer la visite
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" onClick={() => setSelectedProduct(null)}>
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Photo */}
            <div className="w-full h-64 sm:h-80 bg-slate-100 relative">
              <img 
                src={selectedProduct.photo} 
                alt={selectedProduct.name} 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Core Info */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-[var(--tenant-color)] uppercase bg-[var(--tenant-color-light)] px-2.5 py-1 rounded-md inline-block">
                  {selectedProduct.category}
                </span>
                <h3 className="font-black text-slate-900 text-2xl">{selectedProduct.name}</h3>
                <span className="text-xl font-black text-slate-800 block">{formatMoney(selectedProduct.price)}</span>
              </div>

              <div className="text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                {selectedProduct.description}
              </div>

              {/* Stock and Buy */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                <div className="text-xs">
                  <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Disponibilité</span>
                  <span className={`font-bold ${selectedProduct.stock === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                    {selectedProduct.stock === 0 ? 'Épuisé' : `${selectedProduct.stock} articles restants`}
                  </span>
                </div>

                <button
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={selectedProduct.stock === 0}
                  className={`py-3 px-6 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                    selectedProduct.stock === 0
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-[var(--tenant-color)] hover:bg-[var(--tenant-color-hover)] text-white shadow hover:scale-105'
                  }`}
                >
                  Ajouter au panier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white py-12 px-6 border-t border-slate-150 mt-16 text-center text-xs text-slate-400 space-y-2 relative">
        <p>Propulsé par <strong>Kër Salaatu Tech</strong> &mdash; Solutions E-Commerce Multi-tenant pour l'Afrique de l'Ouest.</p>
        <p className="text-[10px] text-slate-350">Chaque marchand est indépendant. Les commandes sont contractées directement via WhatsApp.</p>
      </footer>
    </div>
  );
}

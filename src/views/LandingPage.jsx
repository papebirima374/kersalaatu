import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import {
  ArrowRight,
  LogIn,
  Search,
  MessageSquare, 
  Sparkles, 
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  Printer,
  PieChart,
  Palette,
  Globe,
  HelpCircle,
  Star,
  Menu,
  X
} from 'lucide-react';

export default function LandingPage() {
  const { boutiques, addBoutique, setCurrentMerchantBoutiqueId } = useTenant();
  const navigate = useNavigate();

  // Shop creation state
  const [shopName, setShopName] = useState('');
  const [whatsapp, setWhatsapp] = useState('780178444');
  const description = '';
  const [color, setColor] = useState('#2563eb');

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState(null);

  // Mobile menu toggle state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Recherche boutiques (nom + téléphone)
  const [shopSearch, setShopSearch] = useState('');
  const shopQuery = shopSearch.trim().toLowerCase();
  const shopQueryDigits = shopQuery.replace(/\D/g, '');
  const filteredShops = boutiques.filter(b => {
    if (!shopQuery) return true;
    const name = (b.name || '').toLowerCase();
    const phone = (b.whatsapp || '').toLowerCase();
    return name.includes(shopQuery) || phone.includes(shopQuery) ||
      (shopQueryDigits && phone.replace(/\D/g, '').includes(shopQueryDigits));
  }).sort((a, b) => {
    // ⭐ Boutiques épinglées (favori) affichées en premier
    if (!!a.favori !== !!b.favori) return a.favori ? -1 : 1;
    return 0;
  });
  
  // Liste compacte : on n'affiche que 6 boutiques par défaut (sauf recherche / « voir tout »)
  const [showAllShops, setShowAllShops] = useState(false);
  const SHOPS_PREVIEW = 6;
  const visibleShops = (shopQuery || showAllShops) ? filteredShops : filteredShops.slice(0, SHOPS_PREVIEW);

  const faqData = [
    {
      q: "Comment fonctionne la réception des commandes via WhatsApp ?",
      a: "Lorsqu'un client visite votre vitrine en ligne, il ajoute des articles à son panier, remplit ses informations de livraison, puis clique sur 'Confirmer la commande'. Le système génère automatiquement un récapitulatif détaillé et redirige le client vers une discussion WhatsApp pré-remplie avec vous. Vous recevez toutes les informations directement dans vos messages."
    },
    {
      q: "Est-ce vraiment gratuit au début ?",
      a: "Oui ! Le forfait Découverte est 100% gratuit et vous permet de créer votre boutique, de lister jusqu'à 5 produits et de recevoir des commandes WhatsApp illimitées. C'est idéal pour démarrer sans risque."
    },
    {
      q: "Comment mes clients paient-ils pour leurs commandes ?",
      a: "Par défaut, Jappandal propose le paiement à la livraison (en espèces). Si vous souscrivez au forfait Premium, vous pouvez également simuler et accepter les paiements par Wave et Orange Money avec génération automatique de QR Codes et validation visuelle des transactions."
    },
    {
      q: "Puis-je lier mon propre nom de domaine ?",
      a: "Chaque boutique a une adresse sous la forme jappandal.com/shop/votre-slug. L'intégration de noms de domaine personnalisés (ex: maboutique.com) est prévue dans notre feuille de route pour le forfait Premium VIP très prochainement !"
    }
  ];

  const handleCreateShop = (e) => {
    e.preventDefault();
    if (!shopName.trim()) return;

    // Clean whatsapp number
    let cleanWhatsapp = whatsapp.trim();
    if (!cleanWhatsapp.startsWith('+')) {
      if (cleanWhatsapp.startsWith('221')) {
        cleanWhatsapp = '+' + cleanWhatsapp;
      } else {
        cleanWhatsapp = '+221' + cleanWhatsapp;
      }
    }

    const newShop = addBoutique({
      name: shopName,
      description: description || 'Une nouvelle boutique propulsée par Jappandal Tech.',
      whatsapp: cleanWhatsapp,
      couleurMarque: color,
      logo: '🛍️'
    });

    // Set as current merchant shop and navigate to merchant console
    setCurrentMerchantBoutiqueId(newShop.id);
    navigate('/marchand');
  };

  const formattedSlug = shopName.trim()
    ? shopName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : 'ma-boutique';

  return (
    <div className="bg-slate-950 text-slate-100 flex flex-col bg-grid-pattern min-h-screen relative" style={{ overflowX: 'hidden' }}>
      
      {/* Glow effects de fond */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -z-15" />
      <div className="absolute top-[20%] right-10 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none -z-15" />
      <div className="absolute bottom-[30%] left-10 w-[450px] h-[450px] bg-cyan-600/5 rounded-full blur-[130px] pointer-events-none -z-15" />

      {/* Header collant et translucide (Glassmorphism) */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.location.reload()} title="Rafraîchir" className="shrink-0 transition-transform duration-300 active:rotate-180">
              <img src="/logo-jappandal.png" alt="Jappandal" className="h-10 w-auto object-contain" />
            </button>
            <span className="text-xl font-display font-black text-white tracking-tight hidden sm:inline-block">Jappandal</span>
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400 font-medium">
            <a href="#demo" className="hover:text-white transition-colors">Simulateur</a>
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#shops" className="hover:text-white transition-colors">Boutiques</a>
            <a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/marchand')}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-xs px-3 py-2 sm:px-4 sm:py-2.5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Accès Marchand</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white md:hidden transition-colors rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer/Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden sticky top-[56px] left-0 right-0 z-30 border-b border-white/5 bg-slate-950/95 backdrop-blur-md animate-fade-in">
          <nav className="flex flex-col p-4 space-y-3 text-sm text-slate-400 font-semibold text-left">
            <a 
              href="#demo" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-blue-400" /> Simulateur
            </a>
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-indigo-400" /> Fonctionnalités
            </a>
            <a 
              href="#shops" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
            >
              <Globe className="w-4 h-4 text-cyan-400" /> Boutiques
            </a>
            <a 
              href="#tarifs" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
            >
              <Star className="w-4 h-4 text-amber-400" /> Tarifs
            </a>
            <a 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" /> FAQ
            </a>
          </nav>
        </div>
      )}

      {/* Hero Section */}
      <main id="demo" className="relative max-w-7xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 space-y-6 text-left relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold animate-fade-up">
            <Sparkles className="w-3.5 h-3.5 animate-floaty" /> Vendez sur WhatsApp facilement
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight leading-tight animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Propulsez votre <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              vitrine e-commerce
            </span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-xl animate-fade-up font-medium" style={{ animationDelay: '0.2s' }}>
            Créez votre boutique en ligne personnalisée en 2 minutes. Vos clients font leur panier en un clic, vous recevez tout sur WhatsApp. Le tout géré à 100% sur mobile.
          </p>

          {/* Live Shop Customizer form */}
          <div className="bg-slate-900/60 border border-white/5 backdrop-blur p-5 rounded-3xl space-y-4 max-w-lg shadow-xl shadow-slate-950/40 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <h3 className="font-display font-bold text-sm text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Configurez et lancez votre boutique en direct
            </h3>
            
            <form onSubmit={handleCreateShop} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Nom de la boutique</label>
                  <input
                    value={shopName}
                    required
                    onChange={e => setShopName(e.target.value)}
                    placeholder="Ex: Sunu Boutique"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Numéro WhatsApp</label>
                  <input
                    value={whatsapp}
                    required
                    onChange={e => setWhatsapp(e.target.value)}
                    placeholder="Ex: 780178444"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Couleur principale du thème</label>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex gap-2">
                    {[
                      { hex: '#2563eb', name: 'blue' },
                      { hex: '#10b981', name: 'emerald' },
                      { hex: '#f59e0b', name: 'amber' },
                      { hex: '#db2777', name: 'pink' },
                      { hex: '#6366f1', name: 'indigo' }
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer hover:scale-110 ${color === c.hex ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer p-0"
                      title="Custom color"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow shadow-blue-500/10"
                  >
                    Lancer ma vitrine <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Interactive smartphone mockup (Right side of Hero) */}
        <div className="flex-1 w-full flex justify-center animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="w-full max-w-[320px] h-[550px] bg-slate-950 border-4 border-slate-800 rounded-[36px] shadow-2xl relative p-2 overflow-hidden flex flex-col select-none ring-1 ring-white/5">
            {/* Top camera notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-between px-4">
              <span className="w-2.5 h-2.5 bg-slate-900 rounded-full" />
              <span className="w-5 h-1 bg-slate-900 rounded-full" />
            </div>

            {/* Simulated app bar */}
            <div className="pt-6 pb-2.5 px-3 flex items-center justify-between border-b border-white/5 bg-slate-900/50 relative z-10">
              <span className="text-[10px] font-mono text-slate-400 font-bold">12:00</span>
              <span className="text-[10px] font-bold text-slate-300 truncate max-w-[120px]" style={{ color }}>
                {shopName.trim() || 'Ma Vitrine'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">5G 🔋</span>
            </div>

            {/* Mock website view */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-3 bg-slate-950 font-sans relative">
              {/* Shop Header card inside mockup */}
              <div className="rounded-xl p-3 border border-white/5 text-center space-y-1 bg-slate-900/40">
                <span className="text-xl">🛍️</span>
                <h4 className="font-bold text-xs text-white truncate">{shopName.trim() || 'Sunu Boutique'}</h4>
                <p className="text-[9px] text-slate-500 truncate">jappandal.com/shop/{formattedSlug}</p>
              </div>

              {/* Product preview list */}
              <div className="space-y-2">
                <div className="bg-slate-900/80 border border-white/5 rounded-xl p-2 flex gap-2">
                  <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">👟</div>
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <p className="text-[10px] font-bold text-slate-200 truncate">Baskets de Luxe</p>
                    <p className="text-[9px] font-bold text-slate-400">25 000 FCFA</p>
                  </div>
                  <button type="button" className="self-end px-2 py-1 rounded text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                    + Ajouter
                  </button>
                </div>

                <div className="bg-slate-900/80 border border-white/5 rounded-xl p-2 flex gap-2">
                  <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">👜</div>
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <p className="text-[10px] font-bold text-slate-200 truncate">Sac Chic</p>
                    <p className="text-[9px] font-bold text-slate-400">18 000 FCFA</p>
                  </div>
                  <button type="button" className="self-end px-2 py-1 rounded text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                    + Ajouter
                  </button>
                </div>
              </div>

              {/* Whatsapp Order Preview bubble */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-[9px] space-y-1">
                <p className="font-extrabold text-emerald-400 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Commande WhatsApp simulée :
                </p>
                <div className="font-mono text-slate-300 leading-tight bg-slate-950 p-1.5 rounded border border-emerald-500/5">
                  <span className="text-slate-400">Boutique:</span> {shopName.trim() || 'Sunu Boutique'}<br/>
                  <span className="text-slate-400">Articles:</span> 1x Basket de Luxe (25 000 F)<br/>
                  <span className="text-slate-400">Client:</span> Fatou Gueye<br/>
                  <span className="text-slate-400">Lieu:</span> Dakar
                </div>
              </div>
            </div>
            
            {/* Phone bottom indicator */}
            <div className="w-24 h-1.5 bg-slate-800 rounded-full mx-auto my-1.5 shrink-0" />
          </div>
        </div>
      </main>

      {/* Bento Grid: Fonctionnalités */}
      <section id="features" className="relative max-w-7xl w-full mx-auto px-6 py-16 md:py-24 border-t border-white/5 text-center">
        <div className="space-y-3 mb-16">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">SaaS Premium</span>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight mt-3">Tout pour gérer votre activité</h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Bénéficiez d'outils ultra-modernes pour piloter vos ventes, vos clients et vos stocks sur mobile.
          </p>
        </div>

        {/* Bento Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          
          {/* Card 1: Dashboard (Double size on desktop) */}
          <div className="md:col-span-2 p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-blue-500/20 hover:bg-slate-900/60 transition-all flex flex-col md:flex-row gap-6 relative overflow-hidden group">
            <div className="space-y-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Cockpit Analytique & CRM Client</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Suivez votre chiffre d'affaires, panier moyen et évolution des ventes via des graphiques SVG interactifs. Gérez la relation client (historique d'achats, fiches de contact éditables, notes de suivi privées) sur mobile.
              </p>
            </div>
            <div className="w-full md:w-60 bg-slate-950/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-between gap-3 shrink-0">
              <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-500">
                <span>Chiffre du jour</span>
                <span className="text-emerald-400">124.5k F</span>
              </div>
              <div className="h-12 flex items-end gap-1.5 border-b border-white/5 pb-2">
                {[20, 40, 30, 60, 50, 90, 75].map((h, i) => (
                  <span key={i} className="flex-1 bg-blue-500/40 rounded-t-xs group-hover:bg-blue-500 transition-colors" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="space-y-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500">Top Clients (CRM)</span>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Moussa D.</span>
                  <span className="font-bold text-slate-200">54 000 F</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Fatou S. (VIP)</span>
                  <span className="font-bold text-slate-200">32 500 F</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: WhatsApp Integration */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-emerald-500/20 hover:bg-slate-900/60 transition-all flex flex-col justify-between gap-4 group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Tunnel WhatsApp</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Fini les commandes désordonnées dans le chat. Le panier du client se convertit instantanément en un message structuré envoyé sur votre WhatsApp.
              </p>
            </div>
            <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-3 text-[10px] font-mono text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" /> Panier validé vers WhatsApp
            </div>
          </div>

          {/* Card 3: Mobile Money Simulator */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-cyan-500/20 hover:bg-slate-900/60 transition-all flex flex-col justify-between gap-4 group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Wave & Orange Money</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Proposez des simulations d'encaissement Mobile Money. Des QR Codes de paiement sont générés et présentés aux acheteurs lors du checkout.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">Wave</span>
              <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-400 text-[10px] font-bold">Orange Money</span>
            </div>
          </div>

          {/* Card 4: Invoicing (Double size on desktop) */}
          <div className="md:col-span-2 p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-purple-500/20 hover:bg-slate-900/60 transition-all flex flex-col md:flex-row gap-6 relative overflow-hidden group">
            <div className="space-y-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Facturation PDF Pro</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Imprimez ou partagez des reçus et factures d'achat PDF soignés pour vos clients en un clin d'œil. Vos documents administratifs sont générés automatiquement avec votre logo de marque et vos coordonnées.
              </p>
            </div>
            <div className="w-full md:w-56 bg-slate-950/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-between gap-2 shrink-0">
              <div className="flex items-center justify-between text-[8px] text-slate-500 font-bold uppercase">
                <span>Reçu Client</span>
                <span>N° 8329</span>
              </div>
              <div className="border-t border-dashed border-white/10 my-1" />
              <div className="space-y-1 text-[10px] font-mono text-slate-350">
                <div className="flex justify-between"><span>👟 Baskets</span><span>25k F</span></div>
                <div className="flex justify-between"><span>👜 Sac Chic</span><span>18k F</span></div>
                <div className="flex justify-between font-bold text-white"><span>TOTAL</span><span>43k F</span></div>
              </div>
            </div>
          </div>

          {/* Card 5: Custom Branding & Dark Mode */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-pink-500/20 hover:bg-slate-900/60 transition-all flex flex-col justify-between gap-4 group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Marque & Mode Sombre</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Ajustez vos couleurs de vitrine, description, logo, et profitez d'un Mode Sombre client complet (panier, détails produits) pour une lisibilité parfaite de jour comme de nuit.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-500 border border-white/10" />
              <span className="w-4 h-4 rounded-full bg-emerald-500 border border-white/10" />
              <span className="w-4 h-4 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[8px]" title="Mode Sombre">🌙</span>
              <span className="w-4 h-4 rounded-full bg-amber-400 border border-white/10 flex items-center justify-center text-[8px]" title="Mode Clair">☀️</span>
            </div>
          </div>

          {/* Card 6: Domains */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-blue-500/20 hover:bg-slate-900/60 transition-all flex flex-col justify-between gap-4 group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Nom de domaine</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Lie ton propre nom de domaine personnalisé à ta boutique e-commerce pour asseoir le sérieux de ton entreprise et rassurer tes clients.
              </p>
            </div>
            <div className="text-[10px] font-mono text-slate-400 bg-slate-950 p-2 rounded-xl border border-white/5">
              https://maboutique.sn
            </div>
          </div>

        </div>
      </section>

      {/* Workflow steps */}
      <section className="relative max-w-7xl w-full mx-auto px-6 py-16 md:py-24 border-t border-white/5 text-center">
        <div className="space-y-3 mb-16">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">Parcours Entrepreneur</span>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight mt-3">Prise en main immédiate</h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Trois étapes simples suffisent pour digitaliser votre commerce et encaisser vos ventes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-1/2 left-20 right-20 h-0.5 bg-white/5 -translate-y-12 z-0" />

          {/* Step 1 */}
          <div className="bg-slate-900/20 border border-white/5 p-8 rounded-3xl flex flex-col items-center space-y-4 relative z-10 hover:border-blue-500/20 transition-all hover:translate-y-[-2px] duration-300">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-display font-extrabold">
              1
            </div>
            <h3 className="text-base font-bold text-white">Créez votre vitrine</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Donnez un nom et configurez le WhatsApp de réception des commandes. Votre vitrine est prête.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/20 border border-white/5 p-8 rounded-3xl flex flex-col items-center space-y-4 relative z-10 hover:border-emerald-500/20 transition-all hover:translate-y-[-2px] duration-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-display font-extrabold">
              2
            </div>
            <h3 className="text-base font-bold text-white">Listez vos produits</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Téléversez des images de produits, spécifiez vos tarifs et vos zones de livraisons préférées.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/20 border border-white/5 p-8 rounded-3xl flex flex-col items-center space-y-4 relative z-10 hover:border-cyan-500/20 transition-all hover:translate-y-[-2px] duration-300">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-display font-extrabold">
              3
            </div>
            <h3 className="text-base font-bold text-white">Vendez sur WhatsApp</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Partagez le lien avec votre communauté. Recevez instantanément des paniers de commande prêts à expédier.
            </p>
          </div>
        </div>
      </section>

      {/* Directory of Active Shops */}
      <section id="shops" className="relative max-w-7xl w-full mx-auto px-6 py-16 md:py-24 border-t border-white/5 text-center">
        <div className="space-y-3 mb-12">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">Communauté</span>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight mt-3">Boutiques hébergées</h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Découvrez les vitrines e-commerce créées par nos marchands sur la plateforme Jappandal Tech.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-8 relative">
          <Search className="w-4.5 h-4.5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={shopSearch}
            onChange={e => setShopSearch(e.target.value)}
            placeholder="Rechercher une boutique par nom, secteur ou contact…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900 border border-white/5 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Directory Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {boutiques.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 text-sm border border-dashed border-white/5 rounded-3xl bg-slate-900/10 p-6">
              Aucune boutique hébergée pour le moment. Soyez le premier à lancer votre boutique en ligne !
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 text-sm border border-dashed border-white/5 rounded-3xl bg-slate-900/10 p-6">
              Aucune boutique ne correspond à votre recherche « {shopSearch} ».
            </div>
          ) : (
            visibleShops.map((b) => (
              <div key={b.id} className={`p-4 rounded-3xl bg-slate-900/30 border transition-all flex flex-col justify-between gap-4 group ${b.favori ? 'border-amber-400/30 shadow-lg shadow-amber-400/[0.02]' : 'border-white/5 hover:border-slate-800'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-slate-900 border border-white/5 overflow-hidden shrink-0">
                    {b.logo.startsWith('/') || b.logo.startsWith('http') ? (
                      <img src={b.logo} alt="Logo" className="w-10 h-10 object-contain" />
                    ) : (
                      b.logo
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {b.favori && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" />}
                      <h4 className="font-bold text-slate-250 group-hover:text-blue-400 transition-colors truncate text-sm">{b.name}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-mono">/shop/{b.slug}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    b.abonnement?.plan === 'Premium' ? 'bg-purple-500/15 text-purple-400 border-purple-500/10' :
                    b.abonnement?.plan === 'Pro' ? 'bg-blue-500/15 text-blue-400 border-blue-500/10' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {b.abonnement?.plan || 'Découverte'}
                  </span>

                  <Link
                    to={`/shop/${b.slug}`}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-slate-950 transition-all shadow"
                  >
                    Visiter la boutique
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {!shopSearch && filteredShops.length > SHOPS_PREVIEW && (
          <button
            onClick={() => setShowAllShops(v => !v)}
            className="mt-8 px-6 py-3 rounded-2xl border border-white/5 text-sm font-semibold text-blue-400 hover:text-blue-300 hover:border-slate-800 transition-all cursor-pointer"
          >
            {showAllShops ? 'Masquer' : `Afficher les ${filteredShops.length} boutiques`}
          </button>
        )}
      </section>

      {/* Pricing cards */}
      <section id="tarifs" className="relative max-w-7xl w-full mx-auto px-6 py-16 md:py-24 border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">Abonnement</span>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight mt-3">Tarifs simples et transparents</h2>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Trouvez le plan idéal pour lancer et développer votre commerce en ligne sans commission sur les ventes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Plan Découverte */}
          <div className="p-8 rounded-3xl bg-slate-900/30 border border-white/5 hover:border-slate-800 transition-all flex flex-col justify-between relative group hover:scale-[1.02] duration-300">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Idéal pour débuter</span>
                <h3 className="text-xl font-bold text-white mt-1">Découverte</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-sans">Lancez-vous sans risque sans frais mensuels.</p>
              </div>

              <div className="py-4 border-y border-white/5 flex items-baseline">
                <span className="text-3xl font-extrabold text-white">0 FCFA</span>
                <span className="text-xs text-slate-500 ml-1">/ mois</span>
              </div>

              <ul className="space-y-3.5 text-xs text-slate-400">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>1 boutique en ligne active</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Jusqu'à 5 produits</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Commandes WhatsApp illimitées</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-650 line-through">
                  <span>Personnalisation complète du thème</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-650 line-through">
                  <span>Factures & Reçus PDF</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/marchand?creer=1')}
              className="w-full mt-8 py-3 rounded-xl bg-slate-950 border border-white/5 hover:border-slate-800 text-slate-200 font-semibold text-xs transition-all cursor-pointer"
            >
              Lancer gratuitement
            </button>
          </div>

          {/* Plan Pro */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-blue-500/20 hover:border-blue-500/40 transition-all flex flex-col justify-between relative group hover:scale-[1.02] duration-300 shadow-xl shadow-blue-500/[0.02]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-blue-500 text-slate-950 font-bold text-[10px] uppercase tracking-widest shadow shadow-blue-500/20">
              Le plus populaire
            </div>
            
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest font-mono">Croissance</span>
                <h3 className="text-xl font-bold text-white mt-1">SaaS Pro</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans font-medium">Boutique personnalisée pour commerçant actif.</p>
              </div>

              <div className="py-4 border-y border-white/5 flex items-baseline">
                <span className="text-3xl font-extrabold text-white">5 000 FCFA</span>
                <span className="text-xs text-slate-500 ml-1">/ mois</span>
              </div>

              <ul className="space-y-3.5 text-xs text-slate-350">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Produits & stocks illimités</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Personnalisation complète du thème</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Frais de livraison par zone</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Statistiques & rapports graphiques</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-600 line-through">
                  <span>Simulateurs Wave / Orange Money</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/marchand?creer=1')}
              className="w-full mt-8 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-lg shadow-blue-500/10"
            >
              Commencer le forfait Pro
            </button>
          </div>

          {/* Plan Premium */}
          <div className="p-8 rounded-3xl bg-slate-900/30 border border-white/5 hover:border-slate-800 transition-all flex flex-col justify-between relative group hover:scale-[1.02] duration-300">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Fonctionnalités complètes</span>
                <h3 className="text-xl font-bold text-white mt-1">Premium VIP</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-sans">Simulateur Mobile Money et facturation soignée.</p>
              </div>

              <div className="py-4 border-y border-white/5 flex items-baseline">
                <span className="text-3xl font-extrabold text-white">15 000 FCFA</span>
                <span className="text-xs text-slate-500 ml-1">/ mois</span>
              </div>

              <ul className="space-y-3.5 text-xs text-slate-400">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Toutes les fonctionnalités Pro</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Intégration simulations Wave & OM</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Factures & Reçus PDF téléchargeables</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Support prioritaire 24h/7 par ticket</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Nom de domaine propre (bientôt)</span>
                </li>
              </ul>
            </div>

            <button
              disabled
              className="w-full mt-8 py-3 rounded-xl bg-slate-950/40 border border-white/5 text-slate-500 font-semibold text-xs transition-all cursor-not-allowed"
            >
              Bientôt disponible
            </button>
          </div>

        </div>
      </section>

      {/* FAQ accordion */}
      <section id="faq" className="relative max-w-4xl w-full mx-auto px-6 py-16 md:py-24 border-t border-white/5 text-left">
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight mt-3">Des réponses à vos questions</h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Retrouvez les réponses aux questions les plus récurrentes posées par nos marchands.
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index}
                className="rounded-2xl border border-white/5 bg-slate-900/10 overflow-hidden transition-all duration-300 hover:border-slate-800/60"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full px-6 py-4.5 flex items-center justify-between font-bold text-slate-200 hover:text-white hover:bg-slate-900/30 transition-colors text-left text-sm md:text-base cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-blue-400 shrink-0" />
                    {item.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-blue-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1.5 text-slate-400 text-xs md:text-sm leading-relaxed border-t border-white/5 font-sans">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-white/5 text-center relative z-10">
        <img src="/logo-jappandal.png" alt="Jappandal" className="h-10 w-auto object-contain mx-auto mb-4 opacity-80" />
        <p className="text-xs text-slate-650">© 2026 Jappandal Tech. Conçu pour les entrepreneurs d'Afrique de l'Ouest.</p>
      </footer>
      
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { 
  ShoppingBag, 
  ArrowRight, 
  Smartphone, 
  MessageSquare, 
  Shield, 
  Sparkles, 
  Plus, 
  Settings, 
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  Printer,
  PieChart,
  Palette,
  Globe,
  HelpCircle
} from 'lucide-react';

export default function LandingPage() {
  const { boutiques, addBoutique, setCurrentMerchantBoutiqueId } = useTenant();
  const navigate = useNavigate();

  // Shop creation state
  const [showModal, setShowModal] = useState(false);
  const [shopName, setShopName] = useState('');
  const [whatsapp, setWhatsapp] = useState('780178444');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0d9488');

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState(null);

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
      a: "Par défaut, Kër Salaatu propose le paiement à la livraison (en espèces). Si vous souscrivez au forfait Premium, vous pouvez également simuler et accepter les paiements par Wave et Orange Money avec génération automatique de QR Codes et validation visuelle des transactions."
    },
    {
      q: "Puis-je lier mon propre nom de domaine ?",
      a: "Actuellement, toutes les boutiques ont un sous-domaine sous la forme kersalaatu.vercel.app/shop/votre-slug. L'intégration de noms de domaine personnalisés (ex: maboutique.com) est prévue dans notre feuille de route pour le forfait Premium VIP très prochainement !"
    }
  ];

  const handleCreateShop = (e) => {
    e.preventDefault();
    if (!shopName) return;

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
      description: description || 'Une nouvelle boutique propulsée par Kër Salaatu Tech.',
      whatsapp: cleanWhatsapp,
      couleurMarque: color,
      logo: '🛍️'
    });

    // Set as current merchant shop and navigate to merchant console
    setCurrentMerchantBoutiqueId(newShop.id);
    navigate('/merchant');
  };

  return (
    <div className="bg-slate-950 text-slate-100 flex flex-col font-sans" style={{ overflowX: 'hidden' }}>
      {/* Background patterns — fixed pour éviter les sauts sur mobile */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950 to-orange-950/10 pointer-events-none -z-10" />

      {/* Header */}
      <header className="relative max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <img src="/logo-kersalaatu.png" alt="Kër Salaatu" className="h-12 w-auto object-contain" />
        </div>

        <div className="flex items-center gap-4">
          <Link to="/merchant" className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1">
            <Settings className="w-4 h-4" /> Console Marchand
          </Link>
          <button
            onClick={() => navigate('/merchant?creer=1')}
            className="relative inline-flex items-center justify-center overflow-hidden text-sm font-medium rounded-xl bg-gradient-to-br from-orange-500 to-orange-400 text-white cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25"
          >
            <span className="relative px-5 py-2.5 font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 stroke-[3]" /> Créer ma Boutique
            </span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative flex-grow max-w-7xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Propulsé par Kër Salaatu Tech
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Vendez en ligne <br />
            <span className="bg-gradient-to-r from-teal-400 via-teal-300 to-orange-400 bg-clip-text text-transparent">
              en 2 minutes chrono
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-xl">
            Créez votre vitrine e-commerce personnalisée. Vos clients commandent en un clic, et vous recevez tout sur WhatsApp. Le tout géré de A à Z sur votre téléphone.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <button
              onClick={() => navigate('/merchant?creer=1')}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all flex items-center gap-2 hover:translate-x-0.5 cursor-pointer"
            >
              Lancer ma boutique maintenant <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Core values */}
          <div className="grid grid-cols-3 gap-6 pt-10 border-t border-slate-900">
            <div className="space-y-1">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 mb-2">
                <Smartphone className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">Mobile First</h3>
              <p className="text-xs text-slate-500">Gérez tout depuis votre smartphone Android ou iPhone.</p>
            </div>
            <div className="space-y-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">WhatsApp</h3>
              <p className="text-xs text-slate-500">Flux d'achat fluide converti en message WhatsApp.</p>
            </div>
            <div className="space-y-1">
              <div className="w-8 h-8 rounded-lg bg-lime-500/10 flex items-center justify-center text-lime-400 mb-2">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">Multi-tenant</h3>
              <p className="text-xs text-slate-500">Un code unique, des centaines de boutiques isolées.</p>
            </div>
          </div>
        </div>

        {/* Interactive Demo list */}
        <div className="flex-1 w-full max-w-md">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-teal-400" />
              {boutiques.length === 0 ? "Prêt à commencer ?" : "Boutiques de Démo Actives"}
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              {boutiques.length === 0 
                ? "Créez votre boutique en quelques clics pour commencer à vendre en ligne :" 
                : "Visitez les vitrines de démonstration ou gérez-les depuis l'espace commerçant :"}
            </p>

            <div className="space-y-4">
              {boutiques.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl bg-slate-950/40 p-4">
                  Aucune boutique créée pour le moment. Soyez le premier à lancer votre boutique en ligne !
                </div>
              ) : (
                boutiques.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/50 hover:border-slate-700 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-slate-900 border border-slate-800 overflow-hidden">
                        {b.logo.startsWith('/') || b.logo.startsWith('http') ? (
                          <img src={b.logo} alt="Logo" className="w-8 h-8 object-contain" />
                        ) : (
                          b.logo
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-200 group-hover:text-teal-400 transition-colors">{b.name}</h4>
                          {b.abonnement?.plan && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              b.abonnement.plan === 'Premium' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              b.abonnement.plan === 'Pro' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                              'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                              {b.abonnement.plan}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">Slug: <code className="text-teal-500">{b.slug}</code></p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        to={`/shop/${b.slug}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800"
                      >
                        Voir Vitrine
                      </Link>
                      <button
                        onClick={() => {
                          setCurrentMerchantBoutiqueId(b.id);
                          navigate('/merchant');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 transition-colors border border-teal-500/20 flex items-center gap-1 cursor-pointer"
                      >
                        Gérer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/60 text-center">
              <button
                onClick={() => navigate('/merchant?creer=1')}
                className="text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1.5 mx-auto cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Créer une nouvelle boutique
              </button>
            </div>
          </div>
        </div>
      </main>


      {/* Workflow: Comment ça marche */}
      <section className="relative max-w-7xl w-full mx-auto px-6 py-16 md:py-24 border-t border-slate-900/80 text-center">
        <div className="space-y-3 mb-16">
          <span className="text-xs font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20">Processus Simple</span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mt-3">Comment ça marche ?</h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Trois étapes simples suffisent pour digitaliser votre commerce et commencer à vendre à vos clients.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line for large screens */}
          <div className="hidden md:block absolute top-1/2 left-16 right-16 h-0.5 bg-gradient-to-r from-teal-500/20 via-orange-500/20 to-orange-500/20 -translate-y-14 z-0" />

          {/* Step 1 */}
          <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-2xl flex flex-col items-center space-y-4 relative z-10 hover:border-teal-500/30 transition-all hover:scale-[1.02] duration-300">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow shadow-teal-500/10">
              <span className="text-2xl font-black font-sans">1</span>
            </div>
            <h3 className="text-lg font-bold text-white">Créez votre boutique</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Entrez le nom de votre boutique et votre WhatsApp. Aucun document requis, la création se fait instantanément.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-2xl flex flex-col items-center space-y-4 relative z-10 hover:border-emerald-500/30 transition-all hover:scale-[1.02] duration-300">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow shadow-emerald-500/10">
              <span className="text-2xl font-black font-sans">2</span>
            </div>
            <h3 className="text-lg font-bold text-white">Ajoutez vos produits</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Téléchargez des photos, fixez vos prix et configurez vos frais de livraison. Votre catalogue en ligne est prêt.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-2xl flex flex-col items-center space-y-4 relative z-10 hover:border-orange-500/30 transition-all hover:scale-[1.02] duration-300">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow shadow-orange-500/10">
              <span className="text-2xl font-black font-sans">3</span>
            </div>
            <h3 className="text-lg font-bold text-white">Vendez sur WhatsApp</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Partagez votre lien. Vos clients commandent en ligne et vous recevez les détails complets directement sur votre WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features Grid */}
      <section className="relative max-w-7xl w-full mx-auto px-6 py-16 md:py-24 border-t border-slate-900/80 text-center">
        <div className="space-y-3 mb-16">
          <span className="text-xs font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20">SaaS Complet</span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mt-3">Tout pour gérer votre activité</h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Bénéficiez d'outils professionnels pour suivre vos ventes, éditer des factures et offrir la meilleure expérience client.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {/* Card 1: Mobile First */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-850 hover:border-slate-850 hover:bg-slate-900/50 hover:shadow-lg hover:shadow-teal-500/5 transition-all flex flex-col space-y-4 hover:scale-[1.02] duration-300 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Gestion 100% Mobile</h3>
            <p className="text-xs text-slate-450 leading-relaxed font-sans">
              Pas besoin d'ordinateur. L'espace marchand est optimisé pour être piloté depuis votre smartphone en déplacement ou depuis votre boutique physique.
            </p>
          </div>

          {/* Card 2: Payments */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-850 hover:border-slate-850 hover:bg-slate-900/50 hover:shadow-lg hover:shadow-sky-500/5 transition-all flex flex-col space-y-4 hover:scale-[1.02] duration-300 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Paiement Mobile Money</h3>
            <p className="text-xs text-slate-450 leading-relaxed font-sans">
              Simulez des encaissements professionnels par Wave ou Orange Money. Vos clients accèdent à des QR Codes uniques pour régler rapidement en ligne.
            </p>
          </div>

          {/* Card 3: Stats */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-850 hover:border-slate-850 hover:bg-slate-900/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all flex flex-col space-y-4 hover:scale-[1.02] duration-300 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <PieChart className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Statistiques de Vente</h3>
            <p className="text-xs text-slate-450 leading-relaxed font-sans">
              Suivez le chiffre d'affaires, le panier moyen, le taux de conversion et identifiez vos best-sellers grâce à des graphiques dynamiques hebdomadaires.
            </p>
          </div>

          {/* Card 4: Invoicing */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-850 hover:border-slate-850 hover:bg-slate-900/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all flex flex-col space-y-4 hover:scale-[1.02] duration-300 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Facturation PDF Pro</h3>
            <p className="text-xs text-slate-450 leading-relaxed font-sans">
              Générez instantanément des reçus et factures détaillées au format PDF d'un simple clic pour rassurer vos clients et archiver votre comptabilité.
            </p>
          </div>

          {/* Card 5: Customization */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-850 hover:border-slate-850 hover:bg-slate-900/50 hover:shadow-lg hover:shadow-amber-500/5 transition-all flex flex-col space-y-4 hover:scale-[1.02] duration-300 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Thèmes Personnalisables</h3>
            <p className="text-xs text-slate-450 leading-relaxed font-sans">
              Modifiez la couleur de votre vitrine, votre description, votre adresse et votre logo en temps réel pour l'aligner parfaitement avec votre marque.
            </p>
          </div>

          {/* Card 6: Domains */}
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-850 hover:border-slate-850 hover:bg-slate-900/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all flex flex-col space-y-4 hover:scale-[1.02] duration-300 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Nom de domaine</h3>
            <p className="text-xs text-slate-450 leading-relaxed font-sans">
              Liez votre propre domaine personnalisé (ex: maboutique.sn) à votre vitrine e-commerce Kër Salaatu Tech pour plus de professionnalisme.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative max-w-7xl w-full mx-auto px-6 py-16 md:py-24 border-t border-slate-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Des Tarifs Clairs et Adaptés</h2>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Choisissez le plan idéal pour lancer ou faire grandir votre activité de vente en ligne. Sans frais cachés, résiliable à tout moment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Plan Découverte */}
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-850 hover:border-slate-800 transition-all flex flex-col justify-between relative group hover:scale-[1.02] duration-300">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Idéal pour débuter</span>
                <h3 className="text-2xl font-black text-white mt-1">Découverte</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Testez et lancez votre boutique sans aucun frais mensuel.</p>
              </div>

              <div className="py-4 border-y border-slate-850/60">
                <span className="text-3xl font-black text-white">0 FCFA</span>
                <span className="text-xs text-slate-500 ml-1">/ mois</span>
              </div>

              <ul className="space-y-3.5 text-xs text-slate-400">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>1 boutique en ligne active</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>Jusqu'à 5 produits</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>Commandes WhatsApp illimitées</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-650 line-through">
                  <span>Thèmes personnalisés</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-650 line-through">
                  <span>Factures PDF imprimables</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/merchant?creer=1')}
              className="w-full mt-8 py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs transition-all cursor-pointer"
            >
              Lancer gratuitement
            </button>
          </div>

          {/* Plan Pro */}
          <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-orange-500/30 hover:border-orange-500/50 transition-all flex flex-col justify-between relative group hover:scale-[1.02] duration-300 shadow-xl shadow-orange-500/5">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-orange-500 text-white font-extrabold text-[10px] uppercase tracking-widest shadow shadow-orange-500/20">
              Recommandé
            </div>
            
            <div className="space-y-6">
              <div>
                <span className="text-xs font-extrabold text-orange-400 uppercase tracking-widest">Le choix des vendeurs</span>
                <h3 className="text-2xl font-black text-white mt-1">SaaS Pro</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Une boutique sur mesure avec toutes les fonctionnalités essentielles.</p>
              </div>

              <div className="py-4 border-y border-slate-850/60 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">5 000 FCFA</span>
                <span className="text-xs text-slate-500">/ mois</span>
              </div>

              <ul className="space-y-3.5 text-xs text-slate-350">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>Produits & stocks illimités</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>Personnalisation complète du thème</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>Frais de livraison personnalisés par zone</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>Graphiques de ventes & statistiques</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-600">
                  <span>Simulateurs Wave / OM inclus</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/merchant?creer=1')}
              className="w-full mt-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-extrabold text-xs transition-all cursor-pointer shadow-lg shadow-orange-500/10"
            >
              Commencer le forfait Pro
            </button>
          </div>

          {/* Plan Premium */}
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-850 hover:border-slate-800 transition-all flex flex-col justify-between relative group hover:scale-[1.02] duration-300">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Expérience intégrale</span>
                <h3 className="text-2xl font-black text-white mt-1">Premium VIP</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Paiement mobile money en ligne simulé et facturation PDF pro.</p>
              </div>

              <div className="py-4 border-y border-slate-850/60">
                <span className="text-3xl font-black text-white">15 000 FCFA</span>
                <span className="text-xs text-slate-500 ml-1">/ mois</span>
              </div>

              <ul className="space-y-3.5 text-xs text-slate-400">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>Toutes les fonctionnalités Pro</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>Intégration de Wave & OM (simulation)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>Factures & Reçus PDF imprimables</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>Support prioritaire 24h/7 par ticket</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>Nom de domaine propre (prochainement)</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/merchant?creer=1')}
              className="w-full mt-8 py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs transition-all cursor-pointer"
            >
              Lancer la version Premium
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative max-w-4xl w-full mx-auto px-6 py-16 md:py-24 border-t border-slate-900/80 text-left">
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20">Des Réponses à vos questions</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3">Questions Fréquentes</h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Vous avez des questions sur Kër Salaatu Tech ? Voici les réponses aux interrogations les plus fréquentes des commerçants.
          </p>
        </div>

        <div className="space-y-4 relative z-10">
          {faqData.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index}
                className="rounded-2xl border border-slate-850 bg-slate-900/20 overflow-hidden transition-all duration-300 hover:border-slate-800"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between font-bold text-slate-100 hover:text-white hover:bg-slate-900/30 transition-colors text-left text-sm md:text-base cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-teal-400 shrink-0" />
                    {item.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-teal-400 shrink-0 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500 shrink-0 transition-transform duration-200" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-slate-400 text-xs md:text-sm leading-relaxed border-t border-slate-900/50 font-sans">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative">
            <h3 className="text-xl font-bold mb-1">Créer votre Boutique</h3>
            <p className="text-slate-400 text-sm mb-6">Configurez votre boutique en quelques secondes.</p>

            <form onSubmit={handleCreateShop} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nom de la boutique</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sunu Boutique, Dakar Couture"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 placeholder-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Numéro WhatsApp (pour recevoir les commandes)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 780178444"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 placeholder-slate-600 transition-colors"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Sera pré-fixé automatiquement avec l'indicatif Sénégal (+221).</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description rapide (optionnel)</label>
                <textarea
                  placeholder="Ex: Vente de sacs de luxe, boubous..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-100 placeholder-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Couleur principale du thème</label>
                <div className="flex gap-3 mt-1.5">
                  {[
                    { hex: '#0d9488', label: 'Teal' },
                    { hex: '#3b82f6', label: 'Bleu' },
                    { hex: '#b45309', label: 'Orange' },
                    { hex: '#db2777', label: 'Rose' },
                    { hex: '#6366f1', label: 'Indigo' }
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer hover:scale-110 ${color === c.hex ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 bg-transparent border-0 rounded cursor-pointer p-0"
                    title="Choisir une couleur"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-orange-400 text-white font-bold hover:shadow-lg hover:shadow-teal-500/20 transition-all cursor-pointer"
                >
                  Créer & Ouvrir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-10 bg-slate-950 border-t border-slate-900 text-center relative">
        <img src="/logo-kersalaatu.png" alt="Kër Salaatu" className="h-10 w-auto object-contain mx-auto mb-3 opacity-80" />
        <p className="text-xs text-slate-600">© 2026 Kër Salaatu Tech. Conçu pour les entrepreneurs d'Afrique de l'Ouest.</p>
      </footer>
    </div>
  );
}

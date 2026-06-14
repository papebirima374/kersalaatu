import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from '../components/toast';
import { useTenant } from '../context/TenantContext';
import { ShopLogo } from './BoutiquesDirectory';
import {
  ArrowRight, ArrowUpRight, LogIn, MessageSquare, Check, ChevronDown,
  Receipt, Users, Wallet, QrCode, BarChart3, Globe, Store,
  Menu, X, Smartphone, CreditCard, Sun, Moon,
} from 'lucide-react';

// ── Palette « Chaleur Artisanale » ───────────────────────────────────────────
const C = {
  bg: '#FCFAF6',       // Fond ivoire / crème chaud
  soft: '#F5F0E5',     // Sable doux
  softer: '#EAE1D2',   // Sable moyen pour bordures/lignes
  ink: '#121F38',      // Encre marine profond
  ink2: '#576780',     // Encre marine estompé
  line: '#EBE2D4',     // Ligne sable fine
  blue: '#2563EB',     // Accent bleu électrique
  blueDark: '#1D4ED8', // Accent bleu foncé
  blueSoft: '#EFF5FF', // Bleu très doux
  mint: '#E6F4EA',     // Vert menthe doux
  mintDeep: '#137333', // Vert sapin
  peach: '#FDF2E9',    // Pêche doux
  peachDeep: '#B06000',// Terracotta / orange chaud
};

const GROTESK = "'Outfit', 'Space Grotesk', system-ui, sans-serif";
const EDITORIAL = "'Fraunces', 'Outfit', Georgia, serif";

// Révélation progressive au défilement (IntersectionObserver)
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -45px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>
      {children}
    </div>
  );
}

const Eyebrow = ({ children, darkMode }) => (
  <span
    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.14em] border"
    style={{
      background: darkMode ? '#121f38' : '#FFF',
      borderColor: darkMode ? '#1d2e4d' : C.line,
      color: darkMode ? '#8ca3c7' : C.ink2
    }}
  >
    {children}
  </span>
);

const H = ({ children, className = '', style, darkMode }) => (
  <h2
    className={`tracking-tight ${className}`}
    style={{
      fontFamily: EDITORIAL,
      fontWeight: 500,
      color: darkMode ? '#f1f5f9' : C.ink,
      letterSpacing: '-0.02em',
      ...style
    }}
  >
    {children}
  </h2>
);

export default function LandingPage() {
  const { boutiques, addBoutique, setCurrentMerchantBoutiqueId } = useTenant();
  const navigate = useNavigate();

  const [shopName, setShopName] = useState('');
  const [whatsapp] = useState('780178444');
  const [color, setColor] = useState('#2563EB');
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('jappandal-dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    if (darkMode) {
      document.body.style.backgroundColor = '#0c1524';
      document.documentElement.classList.add('dark');
    } else {
      document.body.style.backgroundColor = C.bg;
      document.documentElement.classList.remove('dark');
    }
    return () => {
      document.body.style.backgroundColor = prev;
      document.documentElement.classList.remove('dark');
    };
  }, [darkMode]);

  const partnerShops = [...boutiques].sort((a, b) => (!!b.favori) - (!!a.favori)).slice(0, 20);

  const faqData = [
    {
      q: 'Comment je reçois les commandes de mes clients ?',
      a: "Le panier de votre client est converti en un message WhatsApp structuré envoyé directement sur votre numéro : liste des articles, prix, quantité, adresse et frais de livraison. Vous gérez tout dans votre discussion WhatsApp habituelle."
    },
    {
      q: 'Est-ce vraiment gratuit pour commencer ?',
      a: "Oui. Le forfait Découverte est 100 % gratuit et sans engagement de carte bancaire : idéal pour créer votre boutique, lister jusqu'à 5 produits et recevoir vos premières commandes WhatsApp sans frais."
    },
    {
      q: 'Comment mes clients paient-ils ?',
      a: "Par défaut, à la livraison. Les forfaits SaaS Pro et Premium VIP vous permettent d'activer le lien de paiement direct Wave. Vos clients payent en un clic avec l'application Wave (avec calcul automatique des 1% de frais)."
    },
    {
      q: 'Puis-je connecter mon propre nom de domaine ?',
      a: "Par défaut, votre adresse est jappandal.com/shop/votre-boutique. La liaison de nom de domaine personnalisé (ex. maboutique.sn) est une fonctionnalité en cours d'intégration réservée au plan Premium VIP."
    },
  ];

  const handleCreateShop = (e) => {
    e.preventDefault();
    if (!shopName.trim()) return;
    let cleanWhatsapp = whatsapp.trim();
    if (!cleanWhatsapp.startsWith('+')) {
      cleanWhatsapp = cleanWhatsapp.startsWith('221') ? '+' + cleanWhatsapp : '+221' + cleanWhatsapp;
    }
    let newShop;
    try {
      newShop = addBoutique({
        name: shopName,
        description: 'Une nouvelle boutique propulsée par Jappandal Tech.',
        whatsapp: cleanWhatsapp,
        couleurMarque: color,
        logo: '🛍️'
      });
    } catch (err) {
      toast(err.message || 'Impossible de créer la boutique.', 'error', 7000);
      return;
    }
    setCurrentMerchantBoutiqueId(newShop.id);
    navigate('/marchand');
  };

  const formattedSlug = shopName.trim()
    ? shopName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : 'ma-boutique';
  const navLinks = [['#features', 'Fonctionnalités'], ['#shops', 'Boutiques'], ['#tarifs', 'Tarifs'], ['#faq', 'FAQ']];

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300" style={{ backgroundColor: darkMode ? '#0c1524' : C.bg, color: darkMode ? '#f1f5f9' : C.ink, overflowX: 'hidden' }}>
      
      {/* ── Header Translucide ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b transition-colors" style={{ borderColor: darkMode ? '#1d2e4d' : C.line, paddingTop: 'env(safe-area-inset-top, 0px)', background: darkMode ? 'rgba(12,21,36,0.85)' : 'rgba(252,250,246,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src="/logo-jappandal.png" alt="Jappandal" className="h-8 w-auto object-contain" />
            <span className="text-base font-bold tracking-tight uppercase" style={{ fontFamily: GROTESK, color: darkMode ? '#f1f5f9' : C.ink, letterSpacing: '0.05em' }}>Jappandal</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>
            {navLinks.map(([href, label]) => (
              <a key={href} href={href} className="hover:text-[#2563EB] transition-colors">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !darkMode;
                setDarkMode(next);
                localStorage.setItem('jappandal-dark', String(next));
              }}
              title={darkMode ? 'Mode Clair' : 'Mode Sombre'}
              className="p-2.5 rounded-xl border transition-all cursor-pointer hover:bg-sand-medium/20"
              style={{ borderColor: darkMode ? '#1d2e4d' : C.line, color: darkMode ? '#f1f5f9' : C.ink }}
            >
              {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            <button
              onClick={() => navigate('/marchand')}
              className="inline-flex items-center gap-2 rounded-xl font-bold text-xs px-4 py-2.5 text-white transition-all hover:opacity-90 active:scale-98 cursor-pointer"
              style={{ background: C.ink }}
            >
              <LogIn className="w-3.5 h-3.5" /> <span>Espace Commerçant</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
              className="p-2 md:hidden rounded-xl border cursor-pointer"
              style={{ borderColor: darkMode ? '#1d2e4d' : C.line, color: darkMode ? '#f1f5f9' : C.ink }}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t animate-fade-in" style={{ borderColor: darkMode ? '#1d2e4d' : C.line, background: darkMode ? '#121f38' : C.soft }}>
            <nav className="flex flex-col p-4 gap-2 text-sm font-semibold" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>
              {navLinks.map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-white/50 transition-colors">{label}</a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ── Hero Asymétrique Éditorial ───────────────────────────────────────── */}
      <main className="relative max-w-6xl w-full mx-auto px-5 sm:px-6 pt-12 md:pt-20 pb-12">
        <div className="pointer-events-none absolute top-10 right-20 w-80 h-80 rounded-full blur-3xl -z-10" style={{ background: 'rgba(37,99,235,0.06)' }} />
        <div className="pointer-events-none absolute bottom-10 left-10 w-96 h-96 rounded-full blur-3xl -z-10" style={{ background: 'rgba(176,96,0,0.04)' }} />

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          
          {/* Section gauche : Texte et Formulaire */}
          <div className="animate-fade-up text-left space-y-6">
            <Eyebrow darkMode={darkMode}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.peachDeep }} />
              Plateforme E-commerce & POS Mobile
            </Eyebrow>
            <h1 className="text-4xl sm:text-[3.6rem] leading-[1.08] font-normal" style={{ fontFamily: EDITORIAL, color: darkMode ? '#f1f5f9' : C.ink }}>
              Votre boutique en ligne,<br />
              <span className="italic" style={{ color: C.blue }}>créée en 2 minutes.</span>
            </h1>
            <p className="text-base md:text-[17px] leading-relaxed max-w-lg" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>
              Une vitrine e-commerce épurée, vos commandes reçues directement sur WhatsApp, une caisse physique intégrée et des reçus PDF. Le tout géré à 100% depuis votre téléphone, sans aucune commission.
            </p>

            <form onSubmit={handleCreateShop} className="max-w-md pt-2">
              <div className="flex items-center gap-2 p-1.5 rounded-2xl border bg-white dark:bg-slate-900 transition-colors" style={{ borderColor: darkMode ? '#1d2e4d' : C.line, boxShadow: '0 12px 30px -15px rgba(18,31,56,0.15)' }}>
                <input
                  id="shopname-input"
                  value={shopName}
                  required
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Saisir le nom de votre boutique..."
                  className="flex-1 min-w-0 px-4 py-3 text-sm focus:outline-none bg-transparent"
                  style={{ color: darkMode ? '#f1f5f9' : C.ink }}
                />
                <button
                  type="submit"
                  className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-97 cursor-pointer"
                  style={{ background: C.blue }}
                >
                  Lancer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mt-3 flex items-center gap-3 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>Couleur de marque</span>
                <div className="flex gap-2">
                  {['#2563EB', '#0F8A5F', '#C2410C', '#9333EA', '#E11D48'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setColor(hex)}
                      title={hex}
                      className="w-4.5 h-4.5 rounded-full transition-transform hover:scale-110 cursor-pointer"
                      style={{
                        background: hex,
                        border: color === hex ? `2px solid ${darkMode ? '#f1f5f9' : C.ink}` : '1px solid rgba(0,0,0,0.1)',
                        outline: color === hex ? `1px solid ${darkMode ? '#0c1524' : C.bg}` : 'none'
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-semibold ml-auto" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>Gratuit · Sans engagement</span>
              </div>
            </form>

            {partnerShops.length > 0 && (
              <div className="mt-8 flex items-center gap-3.5 border-t pt-6" style={{ borderColor: C.line }}>
                <div className="flex -space-x-3">
                  {partnerShops.slice(0, 4).map((b) => (
                    <div key={b.id} className="w-9 h-9 rounded-full ring-2 ring-white overflow-hidden bg-white shadow-sm">
                      <ShopLogo b={b} size="w-9 h-9" text="text-xs" />
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>
                  Rejoignez plus de <span className="font-bold" style={{ color: darkMode ? '#f1f5f9' : C.ink }}>{boutiques.length} entrepreneurs</span> qui nous font confiance.
                </p>
              </div>
            )}
          </div>

          {/* Section droite : Bento / Mockup Smartphone */}
          <div className="grid grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '150ms' }}>
            
            {/* Phone Mockup */}
            <div className="row-span-2 rounded-3xl p-3 border flex flex-col justify-between" style={{ background: darkMode ? '#1a2a47' : C.soft, borderColor: darkMode ? '#1d2e4d' : C.line }}>
              <div className="rounded-2xl overflow-hidden border bg-white flex-1 flex flex-col" style={{ borderColor: darkMode ? '#1d2e4d' : C.line, minHeight: '320px' }}>
                <div className="px-3 py-2 flex items-center justify-between text-white" style={{ background: color }}>
                  <span className="text-[9px] font-mono font-bold">12:00</span>
                  <span className="text-[9px] font-bold truncate max-w-[80px] uppercase tracking-wider">{shopName.trim() || 'Ma Vitrine'}</span>
                  <Smartphone className="w-3 h-3 opacity-90" />
                </div>
                <div className="p-3 space-y-2 flex-1" style={{ background: darkMode ? '#0c1524' : C.bg }}>
                  <div className="rounded-xl p-3 text-center bg-white border" style={{ borderColor: darkMode ? '#1d2e4d' : C.line, boxShadow: '0 4px 12px -5px rgba(0,0,0,0.05)' }}>
                    <div className="w-7 h-7 rounded-lg mx-auto flex items-center justify-center text-white text-xs mb-1.5" style={{ background: color }}>🛍️</div>
                    <p className="font-bold text-[10px]" style={{ color: darkMode ? '#f1f5f9' : C.ink }}>{shopName.trim() || 'Sunu Boutique'}</p>
                    <p className="text-[8px] font-mono text-slate-400">/shop/{formattedSlug}</p>
                  </div>
                  {[['👟', 'Baskets Sport', '25 000 F'], ['👜', 'Sac Cuir', '18 000 F']].map(([emoji, n, price]) => (
                    <div key={n} className="bg-white border rounded-xl p-2 flex items-center gap-2" style={{ borderColor: darkMode ? '#1d2e4d' : C.line }}>
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>{emoji}</div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[8px] font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{n}</p>
                        <p className={`text-[7px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{price}</p>
                      </div>
                      <span className="w-4.5 h-4.5 rounded flex items-center justify-center text-[9px] font-bold text-white cursor-pointer shrink-0" style={{ background: color }}>+</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stat Widget */}
            <div className="rounded-3xl p-5 border flex flex-col justify-between" style={{ background: darkMode ? '#121f38' : '#FFF', borderColor: darkMode ? '#1d2e4d' : C.line, boxShadow: '0 8px 25px -12px rgba(18,31,56,0.1)' }}>
              <div className="flex items-center justify-between">
                <BarChart3 className="w-5 h-5" style={{ color: C.mintDeep }} />
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: C.mint, color: C.mintDeep }}>Live</span>
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>Revenu Net</p>
                <p className="font-semibold text-xl tracking-tight mt-0.5" style={{ fontFamily: GROTESK, color: darkMode ? '#f1f5f9' : C.ink }}>124 500 F</p>
              </div>
              <div className="mt-3 h-8 flex items-end gap-1 border-t pt-2" style={{ borderColor: darkMode ? '#1d2e4d' : C.line }}>
                {[30, 50, 40, 75, 60, 90].map((h, i) => (
                  <span key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 5 ? C.blue : (darkMode ? '#1d2e4d' : C.softer) }} />
                ))}
              </div>
            </div>

            {/* WhatsApp Order Widget */}
            <div className="rounded-3xl p-5 border flex flex-col justify-between" style={{ background: darkMode ? '#121f38' : '#FFF', borderColor: darkMode ? '#1d2e4d' : C.line, boxShadow: '0 8px 25px -12px rgba(18,31,56,0.1)' }}>
              <div className="flex items-center justify-between">
                <MessageSquare className="w-5 h-5" style={{ color: C.peachDeep }} />
                <span className="w-2 h-2 rounded-full" style={{ background: C.peachDeep }} />
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>Commande reçue</p>
                <p className={`text-xs font-semibold leading-snug mt-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{1}× Basket Sport · Fatou G.</p>
              </div>
              <div className={`mt-2 text-[8px] font-mono p-1.5 rounded border ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-650'}`} style={{ borderColor: darkMode ? '#1d2e4d' : C.line }}>
                Statut: <span className="text-emerald-600 font-bold">À la livraison</span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Carrousel Marquee des Partenaires ─────────────────────────────────── */}
      <section id="shops" className="relative w-full py-14 border-y" style={{ borderColor: darkMode ? '#1d2e4d' : C.line, background: darkMode ? '#121f38' : '#FFF' }}>
        <Reveal className="text-center px-5 mb-10">
          <Eyebrow darkMode={darkMode}>Boutiques vérifiées</Eyebrow>
          <H darkMode={darkMode} className="mt-3 text-2xl md:text-3xl">Ils vendent déjà avec Jappandal</H>
          <p className="mt-2 text-xs font-medium" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>Découvrez et visitez les vitrines de nos entrepreneurs.</p>
        </Reveal>
        
        {partnerShops.length > 0 && (
          <div className="jp-marquee relative py-2">
            <div className="jp-marquee-track flex items-stretch gap-4 w-max px-6">
              {[...partnerShops, ...partnerShops].map((b, i) => (
                <Link
                  key={`${b.id}-${i}`}
                  to={`/shop/${b.slug}`}
                  className={`w-36 shrink-0 p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${darkMode ? 'bg-[#0c1524]' : 'bg-[#FCFAF6]'}`}
                  style={{
                    borderColor: b.favori ? 'rgba(37,99,235,0.35)' : (darkMode ? '#1d2e4d' : C.line),
                  }}
                >
                  <ShopLogo b={b} size="w-12 h-12" text="text-xl" />
                  <span className="text-[11px] font-bold text-center line-clamp-1 w-full" style={{ color: darkMode ? '#f1f5f9' : C.ink }}>{b.name}</span>
                </Link>
              ))}
            </div>
            <div className={`pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r ${darkMode ? 'from-[#121f38]' : 'from-white'} to-transparent`} />
            <div className={`pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l ${darkMode ? 'from-[#121f38]' : 'from-white'} to-transparent`} />
            <style>{`
              .jp-marquee-track { animation: jp-scroll ${Math.max(25, partnerShops.length * 4.5)}s linear infinite; }
              .jp-marquee:hover .jp-marquee-track { animation-play-state: paused; }
              @keyframes jp-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
              @media (prefers-reduced-motion: reduce) { .jp-marquee-track { animation: none; } }
            `}</style>
          </div>
        )}

        <div className="text-center mt-8">
          <Link to="/boutiques" className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs border transition-all hover:-translate-y-0.5 ${darkMode ? 'bg-[#0c1524] hover:bg-[#121f38]' : 'bg-[#FCFAF6] hover:bg-white'}`} style={{ borderColor: darkMode ? '#1d2e4d' : C.line, color: darkMode ? '#f1f5f9' : C.ink }}>
            Explorer les {boutiques.length} boutiques active <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Fonctionnalités (Bento Asymétrique) ──────────────────────────────── */}
      <section id="features" className="max-w-6xl w-full mx-auto px-5 sm:px-6 py-16 md:py-24">
        <Reveal className="text-center mb-14">
          <Eyebrow darkMode={darkMode}>Fonctionnalités clé</Eyebrow>
          <H darkMode={darkMode} className="mt-3 text-3xl md:text-[2.5rem]">Tout votre commerce dans une application</H>
          <p className="mt-2 text-sm max-w-xl mx-auto" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>Des outils professionnels pensés pour le terrain et gérables en un clin d'œil.</p>
        </Reveal>

        <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bento 1 : Le Tunnel WhatsApp (Large) */}
          <div
            className="md:col-span-2 rounded-3xl border p-7 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start transition-all hover:-translate-y-0.5"
            style={{ background: darkMode ? '#121f38' : '#FFF', borderColor: darkMode ? '#1d2e4d' : C.line, boxShadow: '0 8px 30px -15px rgba(18,31,56,0.06)' }}
          >
            <div className="space-y-3 flex-1">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><MessageSquare className="w-5 h-5" /></div>
              <h3 className="font-semibold text-lg" style={{ fontFamily: GROTESK, color: darkMode ? '#f1f5f9' : C.ink }}>Le tunnel de vente WhatsApp</h3>
              <p className="text-sm leading-relaxed" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>
                Vos clients composent leur panier de manière fluide sur votre vitrine. Lors de la validation, le panier se transforme en un message structuré envoyé directement sur votre WhatsApp. Fini le désordre dans les discussions.
              </p>
            </div>
            <div className="w-full md:w-56 rounded-2xl p-4 font-mono text-[10px] space-y-1.5 self-stretch flex flex-col justify-center" style={{ background: darkMode ? '#0c1524' : C.ink, color: '#EBF1FE' }}>
              <p className="text-slate-400 uppercase tracking-widest font-bold text-[8px]">WhatsApp Message ↓</p>
              <p className="font-bold">🛒 Commande - Sunu Boutique</p>
              <p className="opacity-90">1x Basket Sport (25 000 F)<br />Client : Fatou Gueye<br />Livraison : Dakar Centre (1500 F)</p>
              <p className="font-bold text-blue-400">Total : 26 500 F CFA</p>
            </div>
          </div>

          {/* Bento 2 : Caisse & Facturation */}
          <div
            className="rounded-3xl border p-7 flex flex-col justify-between transition-all hover:-translate-y-0.5"
            style={{ background: darkMode ? 'rgba(37,99,235,0.15)' : C.blueSoft, borderColor: darkMode ? 'rgba(37,99,235,0.3)' : 'transparent' }}
          >
            <div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-950/50 text-blue-400' : 'bg-white text-blue-600'}`}><Receipt className="w-5 h-5" /></div>
              <h3 className="font-semibold text-lg mt-4" style={{ fontFamily: GROTESK, color: darkMode ? '#f1f5f9' : C.ink }}>Caisse Physique & Factures</h3>
              <p className="text-sm leading-relaxed mt-2" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>
                Une interface caisse (POS) ultra-rapide pour saisir vos ventes directes et imprimer des factures PDF professionnelles avec votre logo.
              </p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest mt-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Caisse POS incluse</span>
          </div>

          {/* Bento 3 : Tableau de bord & CRM */}
          <div
            className="rounded-3xl border p-7 flex flex-col justify-between transition-all hover:-translate-y-0.5"
            style={{ background: darkMode ? '#121f38' : '#FFF', borderColor: darkMode ? '#1d2e4d' : C.line, boxShadow: '0 8px 30px -15px rgba(18,31,56,0.06)' }}
          >
            <div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-950/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><BarChart3 className="w-5 h-5" /></div>
              <h3 className="font-semibold text-lg mt-4" style={{ fontFamily: GROTESK, color: darkMode ? '#f1f5f9' : C.ink }}>CRM & Analyse des Ventes</h3>
              <p className="text-sm leading-relaxed mt-2" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>
                Consultez vos statistiques de vente, suivez le comportement de vos clients fidèles et notez vos observations sur chaque fiche client.
              </p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest mt-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Gestion Relation Client</span>
          </div>

          {/* Bento 4 : Carte de visite & QR Code */}
          <div
            className="rounded-3xl border p-7 flex flex-col md:flex-row gap-6 items-center transition-all hover:-translate-y-0.5"
            style={{ background: darkMode ? '#121f38' : '#FFF', borderColor: darkMode ? '#1d2e4d' : C.line, boxShadow: '0 8px 30px -15px rgba(18,31,56,0.06)' }}
          >
            <div className="flex-1 space-y-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-amber-950/40 text-amber-500' : 'bg-amber-50 text-amber-600'}`}><QrCode className="w-5 h-5" /></div>
              <h3 className="font-semibold text-lg" style={{ fontFamily: GROTESK, color: darkMode ? '#f1f5f9' : C.ink }}>Carte de visite avec QR Code</h3>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-650'}`}>
                Générez instantanément un QR code unique pour votre boutique. Imprimez-le sur vos packagings pour que vos clients puissent re-commander en un scan.
              </p>
            </div>
            <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`} style={{ borderColor: darkMode ? '#1d2e4d' : C.line }}>
              <QrCode className={`w-10 h-10 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`} />
            </div>
          </div>

          {/* Bento 5 : Wave direct */}
          <div
            className="rounded-3xl border p-7 flex flex-col justify-between transition-all hover:-translate-y-0.5"
            style={{ background: darkMode ? 'rgba(19,115,51,0.15)' : C.mint, borderColor: darkMode ? 'rgba(19,115,51,0.3)' : 'transparent' }}
          >
            <div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-emerald-950/50 text-emerald-400' : 'bg-white text-emerald-700'}`}><CreditCard className="w-5 h-5" /></div>
              <h3 className="font-semibold text-lg mt-4" style={{ fontFamily: GROTESK, color: darkMode ? '#f1f5f9' : C.ink }}>Wave & Orange Money</h3>
              <p className="text-sm leading-relaxed mt-2" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>
                Bénéficiez de l'intégration Wave Direct Link au checkout. Vos clients payent directement sur leur application Wave sans aucune saisie fastidieuse.
              </p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest mt-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>Wave Direct Link</span>
          </div>

        </Reveal>

        {/* Fonctionnalités secondaires */}
        <Reveal className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4" delay={60}>
          {[
            [Users, 'Comptes caissiers', 'Créez un compte dédié pour vos caissiers avec accès sécurisé aux ventes.'],
            [Wallet, 'Dépenses & Revenu Net', 'Enregistrez vos coûts d\'exploitation pour calculer votre bénéfice réel.'],
            [Store, 'Multi-boutiques', 'Supervisez plusieurs points de vente depuis un seul et unique espace marchand.'],
            [Globe, 'Domaine Personnalisé', 'Redirigez vos clients vers votre propre nom de domaine. (Bientôt)'],
          ].map(([Icon, title, text]) => (
            <div key={title} className="rounded-2xl border p-5 bg-white transition-all hover:-translate-y-0.5" style={{ borderColor: darkMode ? '#1d2e4d' : C.line }}>
              <Icon className="w-5 h-5" style={{ color: C.blue }} />
              <h4 className="mt-3 font-bold text-sm" style={{ color: darkMode ? '#f1f5f9' : C.ink }}>{title}</h4>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>{text}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ── Comment ça marche (Étapes élégantes) ─────────────────────────────── */}
      <section className="border-t" style={{ borderColor: darkMode ? '#1d2e4d' : C.line, background: darkMode ? '#121f38' : '#FFF' }}>
        <div className="max-w-6xl w-full mx-auto px-5 sm:px-6 py-16 md:py-24">
          <Reveal className="text-center mb-14">
            <Eyebrow darkMode={darkMode}>Simple & Rapide</Eyebrow>
            <H darkMode={darkMode} className="mt-3 text-3xl md:text-[2.5rem]">De zéro à votre première vente</H>
          </Reveal>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ['01', 'Configurez votre espace', 'Indiquez le nom de votre boutique et reliez votre numéro WhatsApp de réception.'],
              ['02', 'Listez vos articles', 'Ajoutez vos photos, spécifiez vos tarifs et configurez vos zones de livraison.'],
              ['03', 'Partagez et encaissez', 'Distribuez votre lien de boutique, recevez les paniers WhatsApp et suivez vos ventes.']
            ].map(([num, title, desc], i) => (
              <Reveal key={num} delay={i * 80}>
                <div className={`rounded-2xl p-6 border h-full ${darkMode ? 'bg-[#0c1524]' : 'bg-[#FCFAF6]'}`} style={{ borderColor: darkMode ? '#1d2e4d' : C.line }}>
                  <span className={`font-semibold text-3xl font-mono block mb-2 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`}>{num}</span>
                  <h3 className={`font-bold text-base ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{title}</h3>
                  <p className={`mt-2 text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tarifs clairs & alignés ─────────────────────────────────────────── */}
      <section id="tarifs" className="max-w-6xl w-full mx-auto px-5 sm:px-6 py-16 md:py-24">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <Eyebrow darkMode={darkMode}>Abonnements</Eyebrow>
          <H darkMode={darkMode} className="mt-3 text-3xl md:text-[2.5rem]">Des tarifs clairs, sans commission</H>
          <p className="mt-2 text-sm" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>Conservez 100% de vos bénéfices. Aucun engagement, annulation en un clic.</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          
          {/* Forfait Découverte */}
          <Reveal>
            <div className="rounded-3xl border p-8 flex flex-col h-full bg-white" style={{ borderColor: darkMode ? '#1d2e4d' : C.line }}>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pour débuter</span>
              <h3 className={`font-bold text-xl mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: GROTESK }}>Découverte</h3>
              <div className="my-6 flex items-baseline gap-1">
                <span className={`font-bold text-3.5xl font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>0 FCFA</span>
                <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>/ mois</span>
              </div>
              <ul className={`space-y-3 text-xs flex-grow ${darkMode ? 'text-slate-350' : 'text-slate-600'}`}>
                {['1 boutique en ligne', "Jusqu'à 5 produits", 'Commandes WhatsApp illimitées', 'Paiement à la livraison (CoD)'].map((f) => (
                  <li key={f} className="flex gap-2.5 items-center"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>{f}</span></li>
                ))}
              </ul>
              <button onClick={() => navigate('/marchand?creer=1')} className={`mt-8 w-full py-3 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`} style={{ borderColor: darkMode ? '#1d2e4d' : C.line, color: darkMode ? '#f1f5f9' : C.ink }}>
                Démarrer gratuitement
              </button>
            </div>
          </Reveal>

          {/* Forfait SaaS Pro */}
          <Reveal delay={80}>
            <div
              className="rounded-3xl p-8 flex flex-col h-full relative border bg-white"
              style={{
                borderColor: C.blue,
                boxShadow: darkMode ? '0 15px 35px -15px rgba(37,99,235,0.4)' : '0 15px 35px -15px rgba(37,99,235,0.2)'
              }}
            >
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4.5 py-1 rounded-full text-white font-black text-[8px] uppercase tracking-wider" style={{ background: C.blue }}>Le plus populaire</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? 'text-blue-400' : 'text-blue-650'}`}>Croissance</span>
              <h3 className={`font-bold text-xl mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: GROTESK }}>SaaS Pro</h3>
              <div className="my-6 flex items-baseline gap-1">
                <span className={`font-bold text-3.5xl font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>5 000 FCFA</span>
                <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>/ mois</span>
              </div>
              <ul className={`space-y-3 text-xs flex-grow ${darkMode ? 'text-slate-350' : 'text-slate-655'}`}>
                {['Produits & stocks illimités', 'Lien de paiement Wave direct', '1 compte caissier inclus', 'Factures & reçus PDF de caisse', 'Carte de visite pro avec QR Code', 'Statistiques de vente de la boutique'].map((f) => (
                  <li key={f} className="flex gap-2.5 items-center"><Check className="w-4 h-4 text-blue-600 shrink-0" /><span>{f}</span></li>
                ))}
              </ul>
              <button onClick={() => navigate('/marchand?creer=1')} className="mt-8 w-full py-3 rounded-xl text-white font-bold text-xs transition-opacity hover:opacity-90 cursor-pointer" style={{ background: C.blue }}>
                Choisir SaaS Pro
              </button>
            </div>
          </Reveal>

          {/* Forfait Premium VIP */}
          <Reveal delay={160}>
            <div className="rounded-3xl p-8 flex flex-col h-full text-white" style={{ background: '#101A2C' }}>
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Entreprise</span>
              <h3 className="font-bold text-xl mt-1 text-white" style={{ fontFamily: GROTESK }}>Premium VIP</h3>
              <div className="my-6 flex items-baseline gap-1">
                <span className="font-bold text-3.5xl font-mono text-white">10 000 FCFA</span>
                <span className="text-xs text-slate-400">/ mois</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 flex-grow">
                {['Tout le forfait SaaS Pro', 'Multi-boutiques (lier plusieurs comptes)', 'Comptes caissiers illimités', 'Gestion des dépenses & bénéfices', 'Support client prioritaire 7j/7'].map((f) => (
                  <li key={f} className="flex gap-2.5 items-center"><Check className="w-4 h-4 text-blue-400 shrink-0" /><span>{f}</span></li>
                ))}
                <li className="flex gap-2.5 items-center opacity-80">
                  <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Domaine perso <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 ml-1">Bientôt</span></span>
                </li>
              </ul>
              <button onClick={() => navigate('/marchand?creer=1')} className="mt-8 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer">
                Choisir Premium VIP
              </button>
            </div>
          </Reveal>

        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="max-w-3xl w-full mx-auto px-5 sm:px-6 py-16 md:py-24 border-t" style={{ borderColor: darkMode ? '#1d2e4d' : C.line }}>
        <Reveal className="text-center mb-12">
          <Eyebrow darkMode={darkMode}>FAQ</Eyebrow>
          <H darkMode={darkMode} className="mt-3 text-3xl md:text-[2.5rem]">Des questions ?</H>
        </Reveal>
        <div className="space-y-3">
          {faqData.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <Reveal key={index} delay={index * 40}>
                <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: darkMode ? '#1d2e4d' : C.line }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full px-5 py-4.5 flex items-center justify-between gap-3 text-left font-bold text-[14px] cursor-pointer"
                    style={{ color: darkMode ? '#f1f5f9' : C.ink }}
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} style={{ color: darkMode ? '#8ca3c7' : C.ink2 }} />
                  </button>
                  {isOpen && (
                    <div className={`px-5 pb-5 text-[13.5px] leading-relaxed border-t ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} style={{ borderColor: darkMode ? '#1d2e4d' : C.line }}>
                      <p className="pt-4">{item.a}</p>
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── CTA Final Épuré ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl w-full mx-auto px-5 sm:px-6 pb-20">
        <Reveal>
          <div className="rounded-[2.5rem] px-8 py-16 text-center relative overflow-hidden" style={{ background: '#121F38', color: '#FFF' }}>
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ background: C.blue }} />
            <div className="absolute -bottom-20 -left-10 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: C.peachDeep }} />
            
            <H className="relative text-3xl md:text-5xl text-white font-normal" style={{ fontFamily: EDITORIAL }}>
              Démarrez votre activité en ligne
            </H>
            <p className="relative mt-4 text-sm md:text-base max-w-lg mx-auto opacity-80 font-medium">
              Créez votre vitrine e-commerce gratuitement, sans insérer de carte de crédit. Recevez vos commandes sous 2 minutes.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => navigate('/marchand?creer=1')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-xs bg-white text-slate-900 shadow-sm transition-all hover:scale-102 active:scale-98 cursor-pointer"
              >
                Créer ma boutique gratuitement <ArrowRight className="w-4 h-4 text-blue-600" />
              </button>
              <Link
                to="/boutiques"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-xs text-white border border-white/20 hover:bg-white/5 transition-all"
              >
                Voir les boutiques partenaires <ArrowUpRight className="w-4 h-4 opacity-75" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t py-12 text-center" style={{ borderColor: darkMode ? '#1d2e4d' : C.line, background: darkMode ? '#121f38' : '#FFF' }}>
        <img src="/logo-jappandal.png" alt="Jappandal" className="h-8 w-auto object-contain mx-auto mb-4" />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: GROTESK, color: darkMode ? '#f1f5f9' : C.ink }}>Jappandal Tech</p>
        <p className="mt-1.5 text-[11px]" style={{ color: darkMode ? '#8ca3c7' : C.ink2 }}>
          © 2026 — La plateforme e-commerce et caisse mobile des entrepreneurs d'Afrique de l'Ouest.
        </p>
      </footer>
      
    </div>
  );
}

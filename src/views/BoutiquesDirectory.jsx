import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { thumb, fallbackSrc } from '../utils/img';
import { Search, Star, ArrowLeft, Store, Sun, Moon } from 'lucide-react';

// Pastille logo : image (miniature CDN) ou cercle de marque avec emoji/initiales
export function ShopLogo({ b, size = 'w-12 h-12', text = 'text-xl' }) {
  const isImg = typeof b.logo === 'string' && (b.logo.startsWith('http') || b.logo.startsWith('/') || b.logo.startsWith('data:'));
  if (isImg) {
    return (
      <div className={`${size} rounded-2xl bg-white overflow-hidden border border-sand-line shrink-0 flex items-center justify-center`}>
        <img src={thumb(b.logo, 128)} onError={fallbackSrc(b.logo)} alt={b.name} loading="lazy" className="w-full h-full object-contain p-1" />
      </div>
    );
  }
  return (
    <div className={`${size} rounded-2xl shrink-0 flex items-center justify-center ${text} font-black text-white border border-white/10`}
      style={{ backgroundColor: b.couleurMarque || '#2563eb' }}>
      {b.logo && !/^[a-z0-9]/i.test(b.logo)
        ? b.logo
        : String(b.name || 'B').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
    </div>
  );
}

export default function BoutiquesDirectory() {
  const { boutiques } = useTenant();
  const [search, setSearch] = useState('');

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
      document.body.style.backgroundColor = '#FCFAF6';
      document.documentElement.classList.remove('dark');
    }
    return () => {
      document.body.style.backgroundColor = prev;
      document.documentElement.classList.remove('dark');
    };
  }, [darkMode]);

  const q = search.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  const shops = boutiques
    .filter(b => {
      if (!q) return true;
      const name = (b.name || '').toLowerCase();
      const phone = (b.whatsapp || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || (qDigits && phone.replace(/\D/g, '').includes(qDigits));
    })
    .sort((a, b) => {
      if (!!a.favori !== !!b.favori) return a.favori ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '', 'fr');
    });

  return (
    <div className="min-h-screen bg-cream text-navy-ink">
      {/* En-tête */}
      <header className="sticky top-0 z-40 border-b border-sand-line bg-cream/80 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 text-navy-muted hover:text-navy-ink transition-colors text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> Accueil
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const next = !darkMode;
                setDarkMode(next);
                localStorage.setItem('jappandal-dark', String(next));
              }}
              title={darkMode ? 'Mode Clair' : 'Mode Sombre'}
              className="p-1.5 rounded-xl border transition-all cursor-pointer hover:bg-sand-medium/20 border-sand-line text-navy-ink"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2.5">
              <img src="/logo-jappandal.png" alt="Jappandal" className="h-8 w-auto object-contain" />
              <span className="font-display font-black text-navy-ink">Jappandal</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <span className="text-[10px] font-bold text-brand uppercase tracking-widest bg-brand-light px-3 py-1.5 rounded-full border border-brand/20">Nos partenaires</span>
          <h1 className="text-3xl md:text-4xl font-serif-display font-normal tracking-tight mt-4">Toutes les boutiques</h1>
          <p className="text-navy-muted text-sm mt-2">{boutiques.length} boutique{boutiques.length > 1 ? 's' : ''} propulsée{boutiques.length > 1 ? 's' : ''} par Jappandal Tech.</p>
        </div>

        {/* Recherche */}
        <div className="relative max-w-xl mx-auto mb-8">
          <Search className="w-4 h-4 text-navy-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une boutique (nom ou téléphone)…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-sand-line text-sm text-navy-ink placeholder-navy-muted/50 focus:outline-none focus:border-brand"
          />
        </div>

        {/* Grille des boutiques */}
        {shops.length === 0 ? (
          <div className="py-16 text-center text-navy-muted text-sm border border-dashed border-sand-line rounded-2xl bg-sand-soft/30">
            <Store className="w-10 h-10 text-navy-muted/60 mx-auto mb-3" />
            Aucune boutique ne correspond à « {search} ».
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shops.map(b => (
              <Link
                key={b.id}
                to={`/shop/${b.slug}`}
                className={`p-4 rounded-2xl bg-white border transition-all flex items-center gap-3.5 group hover:-translate-y-0.5 hover:shadow-sm ${
                  b.favori ? 'border-amber-400/60 ring-1 ring-amber-400/30' : 'border-sand-line hover:border-navy-ink'
                }`}
              >
                <ShopLogo b={b} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {b.favori && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" />}
                    <h3 className="font-bold text-navy-ink group-hover:text-brand transition-colors truncate text-sm">{b.name}</h3>
                  </div>
                  <p className="text-[11px] text-navy-muted truncate mt-0.5">{b.description || 'Boutique en ligne'}</p>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-brand opacity-0 group-hover:opacity-100 transition-opacity">Visiter →</span>
              </Link>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-navy-muted mt-10">
          Vous aussi, lancez votre boutique en 2 minutes — <Link to="/" className="text-brand hover:underline">jappandal.com</Link>
        </p>
      </main>
    </div>
  );
}

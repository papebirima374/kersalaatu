import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { thumb, fallbackSrc } from '../utils/img';
import { Search, Star, ArrowLeft, Store } from 'lucide-react';

// Pastille logo : image (miniature CDN) ou cercle de marque avec emoji/initiales
export function ShopLogo({ b, size = 'w-12 h-12', text = 'text-xl' }) {
  const isImg = typeof b.logo === 'string' && (b.logo.startsWith('http') || b.logo.startsWith('/') || b.logo.startsWith('data:'));
  if (isImg) {
    return (
      <div className={`${size} rounded-2xl bg-white overflow-hidden border border-slate-700/60 shrink-0 flex items-center justify-center`}>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-grid-pattern">
      {/* En-tête */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> Accueil
          </Link>
          <div className="flex items-center gap-2.5">
            <img src="/logo-jappandal.png" alt="Jappandal" className="h-8 w-auto object-contain" />
            <span className="font-display font-black text-white">Jappandal</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">Nos partenaires</span>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight mt-4">Toutes les boutiques</h1>
          <p className="text-slate-400 text-sm mt-2">{boutiques.length} boutique{boutiques.length > 1 ? 's' : ''} propulsée{boutiques.length > 1 ? 's' : ''} par Jappandal Tech.</p>
        </div>

        {/* Recherche */}
        <div className="relative max-w-xl mx-auto mb-8">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une boutique (nom ou téléphone)…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Grille des boutiques */}
        {shops.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            <Store className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            Aucune boutique ne correspond à « {search} ».
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shops.map(b => (
              <Link
                key={b.id}
                to={`/shop/${b.slug}`}
                className={`p-4 rounded-2xl bg-slate-900 border transition-all flex items-center gap-3.5 group hover:-translate-y-0.5 ${
                  b.favori ? 'border-amber-400/40 ring-1 ring-amber-400/20' : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                <ShopLogo b={b} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {b.favori && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" />}
                    <h3 className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors truncate text-sm">{b.name}</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{b.description || 'Boutique en ligne'}</p>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">Visiter →</span>
              </Link>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-10">
          Vous aussi, lancez votre boutique en 2 minutes — <Link to="/" className="text-blue-400 hover:underline">jappandal.com</Link>
        </p>
      </main>
    </div>
  );
}

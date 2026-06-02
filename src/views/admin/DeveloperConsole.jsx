import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { Link } from 'react-router-dom';
import RefreshButton from '../../components/RefreshButton';
import {
  Shield, Store, ClipboardList, Settings, LogOut, Check, AlertTriangle,
  DollarSign, TrendingUp, Users, Lock, Unlock, MessageSquare, Trash2,
  Plus, X, ExternalLink, Clock
} from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

const logoOf = (entity) => {
  const l = entity?.logo;
  if (l && typeof l === 'string' && (l.startsWith('/') || l.startsWith('http') || l.startsWith('data:image'))) {
    return <img src={l} alt="" className="w-full h-full object-contain" />;
  }
  return <span className="text-lg">{l || '🛍️'}</span>;
};

export default function DeveloperConsole() {
  const {
    boutiques, tickets, updateBoutique, deleteBoutique,
    resolveTicket, replyToTicket, addBoutiqueWithAuth,
    upgradeRequests, approveUpgradeRequest, rejectUpgradeRequest,
    dataReady
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
  const [replyTextMap, setReplyTextMap] = useState({});

  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Password change
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  // Create boutique modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoutiqueForm, setNewBoutiqueForm] = useState({
    name: '', whatsapp: '', description: '', ownerEmail: '', password: '', plan: 'Pro', couleurMarque: '#2563eb'
  });

  const getStoredAdminPassword = () => {
    const envSecret = import.meta.env.VITE_ADMIN_SECRET;
    return localStorage.getItem('ks_admin_password') || envSecret || 'ks-admin-2025';
  };

  const handleCreateBoutiqueSubmit = async (e) => {
    e.preventDefault();
    if (!newBoutiqueForm.name.trim() || !newBoutiqueForm.whatsapp.trim()) {
      alert('Veuillez remplir le nom et le numéro WhatsApp.'); return;
    }
    let cleanWhatsapp = newBoutiqueForm.whatsapp.trim();
    if (!cleanWhatsapp.startsWith('+')) {
      cleanWhatsapp = cleanWhatsapp.startsWith('221') ? '+' + cleanWhatsapp : '+221' + cleanWhatsapp;
    }
    const ownerEmail = newBoutiqueForm.ownerEmail.trim() || 'vendeur@jappandal.sn';
    const tempPassword = newBoutiqueForm.password || '123456';
    try {
      await addBoutiqueWithAuth({
        name: newBoutiqueForm.name,
        description: newBoutiqueForm.description || `Boutique en ligne ${newBoutiqueForm.name} propulsée par Jappandal Tech.`,
        whatsapp: cleanWhatsapp,
        ownerEmail,
        couleurMarque: newBoutiqueForm.couleurMarque,
        abonnement: {
          plan: newBoutiqueForm.plan, statut: 'Actif',
          dateDebut: new Date().toISOString(),
          dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }, tempPassword);
      setShowCreateModal(false);
      setNewBoutiqueForm({ name:'', whatsapp:'', description:'', ownerEmail:'', password:'', plan:'Pro', couleurMarque:'#2563eb' });
      alert(`Boutique créée !\n\nIdentifiants du marchand :\nEmail : ${ownerEmail}\nMot de passe : ${tempPassword}`);
    } catch (error) {
      alert(`Erreur : ${error.message || error}`);
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPassError(''); setPassSuccess('');
    if (currentPass !== getStoredAdminPassword()) { setPassError('Mot de passe actuel incorrect.'); return; }
    if (newPass.length < 4) { setPassError('Le nouveau mot de passe doit faire au moins 4 caractères.'); return; }
    if (newPass !== confirmPass) { setPassError('Les mots de passe ne correspondent pas.'); return; }
    localStorage.setItem('ks_admin_password', newPass);
    setPassSuccess('Mot de passe modifié avec succès !');
    setCurrentPass(''); setNewPass(''); setConfirmPass('');
  };

  const handleToggleSuspension = (b) => {
    const newStatus = (b.abonnement?.statut || 'Actif') === 'Actif' ? 'Suspendu' : 'Actif';
    updateBoutique(b.id, { abonnement: { ...b.abonnement, statut: newStatus } });
  };

  const handlePlanChange = (id, plan) => {
    const b = boutiques.find(x => x.id === id);
    if (b) updateBoutique(id, { abonnement: { ...b.abonnement, plan } });
  };

  // ── Auth screen ────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <Shield className="w-7 h-7 text-slate-950 stroke-[2.5]" />
            </div>
            <h1 className="text-xl font-bold text-white">Console Développeur</h1>
            <p className="text-sm text-slate-500 mt-1">Administration centrale Jappandal Tech</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (adminPassword === getStoredAdminPassword()) setIsAuthenticated(true);
            else setAuthError('Code d\'accès incorrect.');
          }} className="space-y-4">
            <input type="password" required placeholder="Code d'accès secret"
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); setAuthError(''); }}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-center text-sm font-mono tracking-widest text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none" />
            {authError && <p className="text-red-400 text-xs text-center font-medium">{authError}</p>}
            <button type="submit"
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm transition-all">
              Déverrouiller
            </button>
          </form>

          <div className="text-center mt-6">
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">← Retour à l'accueil</Link>
          </div>
        </div>
      </div>
    );
  }
  if (!dataReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Stats ──────────────────────────────────────────────────────────────
  const totalShops = boutiques.length;
  const activeShops = boutiques.filter(b => b.abonnement?.statut === 'Actif').length;
  const pendingTickets = tickets.filter(t => t.statut === 'En attente').length;
  const pendingUpgrades = upgradeRequests.filter(r => r.statut === 'En attente').length;
  const platformMRR = boutiques.reduce((sum, b) => {
    if (b.abonnement?.statut !== 'Actif') return sum;
    if (b.abonnement?.plan === 'Pro') return sum + 5000;
    if (b.abonnement?.plan === 'Premium') return sum + 15000;
    return sum;
  }, 0);

  const NAV = [
    { id:'dashboard',   label:"Vue d'ensemble", icon: Settings },
    { id:'boutiques',   label:`Boutiques (${totalShops})`, icon: Store },
    { id:'tickets',     label:'Support & Bugs', icon: ClipboardList, badge: pendingTickets || null },
    { id:'activations', label:'Activations', icon: DollarSign, badge: pendingUpgrades || null },
    { id:'config',      label:'Accès & Sécurité', icon: Lock },
  ];

  const Sidebar = () => (
    <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-[100dvh] sticky top-0">
      <div className="p-5 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">Jappandal Tech</p>
            <p className="text-[9px] uppercase tracking-widest text-blue-400 font-semibold">Console Admin</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
            }`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {badge ? (
              <span className="bg-emerald-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{badge}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <Link to="/" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
          <LogOut className="w-4 h-4" /> Retour au site
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      <div className="hidden md:flex"><Sidebar /></div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-60"><Sidebar /></div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Topbar */}
        <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-6 py-3 pt-safe-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-400">☰</button>
            <div>
              <h1 className="text-base font-bold text-white">{NAV.find(n => n.id === activeTab)?.label}</h1>
              <p className="text-xs text-slate-500">Administration centrale · v1.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton variant="dark" />
            {activeTab === 'boutiques' && (
              <button onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 text-sm font-bold transition-all">
                <Plus className="w-4 h-4 stroke-[3]" /> Boutique
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

          {/* ── DASHBOARD ─────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {pendingUpgrades > 0 && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-emerald-300">
                    <DollarSign className="w-4 h-4 shrink-0" />
                    <span><strong>{pendingUpgrades}</strong> demande(s) de paiement en attente de vérification.</span>
                  </div>
                  <button onClick={() => setActiveTab('activations')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-xs transition-all shrink-0">
                    Voir
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label:'Revenus MRR', value: fmt(platformMRR), icon: DollarSign, color:'teal' },
                  { label:'Boutiques', value: totalShops, icon: Store, color:'indigo' },
                  { label:'Actives', value: activeShops, icon: Users, color:'emerald' },
                  { label:'Bugs ouverts', value: pendingTickets, icon: AlertTriangle, color: pendingTickets ? 'amber':'slate' },
                  { label:'Activations', value: pendingUpgrades, icon: TrendingUp, color: pendingUpgrades ? 'emerald':'slate' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-medium text-slate-500">{label}</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${color}-500/10`}>
                        <Icon className={`w-4 h-4 text-${color}-400`} />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Boutiques récentes */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2"><Store className="w-4 h-4 text-blue-400" /> Boutiques récentes</h3>
                    <button onClick={() => setActiveTab('boutiques')} className="text-xs text-blue-400 hover:text-blue-300">Gérer →</button>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {boutiques.slice(0, 5).map(b => (
                      <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">{logoOf(b)}</div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-200 truncate">{b.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono truncate">/{b.slug}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${b.abonnement?.statut === 'Actif' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {b.abonnement?.statut || 'Actif'}
                        </span>
                      </div>
                    ))}
                    {boutiques.length === 0 && <p className="py-8 text-center text-slate-500 text-sm">Aucune boutique.</p>}
                  </div>
                </div>

                {/* Tickets en attente */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-400" /> Tickets en attente</h3>
                    <button onClick={() => setActiveTab('tickets')} className="text-xs text-blue-400 hover:text-blue-300">Résoudre →</button>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {tickets.filter(t => t.statut === 'En attente').slice(0, 4).map(t => {
                      const shop = boutiques.find(b => b.id === t.boutiqueId) || { name: 'Inconnue' };
                      return (
                        <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-200 truncate">{t.sujet}</p>
                            <p className="text-[10px] text-slate-500 truncate">{shop.name}</p>
                          </div>
                          <button onClick={() => { resolveTicket(t.id); }}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold hover:bg-blue-500/20 transition-all shrink-0">
                            Résolu
                          </button>
                        </div>
                      );
                    })}
                    {pendingTickets === 0 && <p className="py-8 text-center text-slate-500 text-sm">Aucun ticket en attente. 🎉</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── BOUTIQUES ─────────────────────────────────────────────── */}
          {activeTab === 'boutiques' && (
            <div className="space-y-3">
              {boutiques.map(b => (
                <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Logo + nom */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">{logoOf(b)}</div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 truncate">{b.name}</p>
                        <Link to={`/shop/${b.slug}`} target="_blank" className="text-xs text-blue-400 hover:underline font-mono flex items-center gap-1">
                          /{b.slug} <ExternalLink className="w-3 h-3" />
                        </Link>
                        <p className="text-[10px] text-slate-500 mt-0.5">{b.whatsapp}</p>
                      </div>
                    </div>

                    {/* Plan */}
                    <select value={b.abonnement?.plan || 'Découverte'} onChange={e => handlePlanChange(b.id, e.target.value)}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer">
                      <option value="Découverte">Découverte</option>
                      <option value="Pro">Pro · 5 000</option>
                      <option value="Premium">Premium · 15 000</option>
                    </select>

                    {/* Statut */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${b.abonnement?.statut === 'Actif' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {b.abonnement?.statut || 'Actif'}
                    </span>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleSuspension(b)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border ${
                          b.abonnement?.statut === 'Actif'
                          ? 'bg-red-500/5 text-red-400 border-red-500/10 hover:bg-red-500/10'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}>
                        {b.abonnement?.statut === 'Actif' ? <><Lock className="w-3.5 h-3.5" />Suspendre</> : <><Unlock className="w-3.5 h-3.5" />Réactiver</>}
                      </button>
                      <button onClick={() => {
                        if (confirm(`Supprimer définitivement "${b.name}" et toutes ses données ?`)) { deleteBoutique(b.id); }
                      }} className="px-2.5 py-1.5 rounded-lg bg-red-500/5 text-red-400 border border-red-500/10 hover:bg-red-500 hover:text-slate-950 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {boutiques.length === 0 && (
                <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl py-16 text-center">
                  <Store className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-semibold">Aucune boutique hébergée</p>
                </div>
              )}
            </div>
          )}

          {/* ── TICKETS ───────────────────────────────────────────────── */}
          {activeTab === 'tickets' && (
            <div className="space-y-3">
              {tickets.map(t => {
                const shop = boutiques.find(b => b.id === t.boutiqueId) || { name: 'Inconnue', logo: '🛍️' };
                return (
                  <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-200">{t.sujet}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.statut === 'En attente' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            t.statut === 'En cours' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>{t.statut}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{shop.name} · {new Date(t.date).toLocaleDateString('fr-FR')}</p>
                      </div>
                      {t.statut !== 'Résolu' && (
                        <button onClick={() => resolveTicket(t.id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-500 text-slate-950 hover:bg-blue-400 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Résoudre
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-slate-400 bg-slate-800/50 rounded-lg p-3">{t.message}</p>

                    {t.reponse && (
                      <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-blue-400 mb-1">RÉPONSE TECHNIQUE</p>
                        <p className="text-xs text-slate-300 italic">"{t.reponse}"</p>
                      </div>
                    )}

                    {t.statut !== 'Résolu' && (
                      <div className="flex gap-2">
                        <textarea value={replyTextMap[t.id] || ''}
                          onChange={e => setReplyTextMap({ ...replyTextMap, [t.id]: e.target.value })}
                          placeholder="Répondre au marchand..."
                          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-y min-h-[40px]" />
                        <button onClick={() => {
                          if (!replyTextMap[t.id]?.trim()) return;
                          replyToTicket(t.id, replyTextMap[t.id]);
                          setReplyTextMap({ ...replyTextMap, [t.id]: '' });
                        }} className="px-4 rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs transition-all shrink-0">
                          Envoyer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {tickets.length === 0 && (
                <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl py-16 text-center">
                  <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-semibold">Aucun ticket de support</p>
                </div>
              )}
            </div>
          )}

          {/* ── ACTIVATIONS ───────────────────────────────────────────── */}
          {activeTab === 'activations' && (
            <div className="space-y-3">
              {upgradeRequests.map(req => {
                const shop = boutiques.find(b => b.id === req.boutiqueId) || { name: 'Inconnue', logo: '🛍️' };
                return (
                  <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">{logoOf(shop)}</div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-200 truncate">{shop.name}</p>
                          <p className="text-xs text-slate-500">{req.paymentMethod} · <span className="font-mono">{req.phoneNumber}</span></p>
                          <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(req.date).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${req.planName === 'Premium' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {req.planName}
                      </span>

                      {req.statut === 'En attente' ? (
                        <div className="flex gap-2">
                          <button onClick={() => { if (confirm(`Confirmer le paiement et débloquer "${shop.name}" ?`)) approveUpgradeRequest(req.id); }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-all">
                            <Check className="w-3.5 h-3.5" /> Valider
                          </button>
                          <button onClick={() => { if (confirm('Rejeter cette demande ?')) rejectUpgradeRequest(req.id); }}
                            className="px-3 py-1.5 rounded-lg bg-red-500/5 text-red-400 border border-red-500/10 hover:bg-red-500/10 text-xs font-bold transition-all">
                            Refuser
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${req.statut === 'Validé' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {req.statut}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {upgradeRequests.length === 0 && (
                <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl py-16 text-center">
                  <DollarSign className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-semibold">Aucune demande d'activation</p>
                </div>
              )}
            </div>
          )}

          {/* ── CONFIG ────────────────────────────────────────────────── */}
          {activeTab === 'config' && (
            <div className="max-w-md">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2"><Lock className="w-4 h-4 text-blue-400" /> Sécurité d'accès</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Modifiez le code d'accès à cette console.</p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{passError}</div>}
                  {passSuccess && <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm">{passSuccess}</div>}

                  {[
                    { label:'Mot de passe actuel', val: currentPass, set: setCurrentPass, ph:'••••••••' },
                    { label:'Nouveau mot de passe', val: newPass, set: setNewPass, ph:'Minimum 4 caractères' },
                    { label:'Confirmer', val: confirmPass, set: setConfirmPass, ph:'Re-saisir' },
                  ].map(({ label, val, set, ph }) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                      <input type="password" required value={val} onChange={e => set(e.target.value)} placeholder={ph}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 font-mono focus:border-blue-500 focus:outline-none" />
                    </div>
                  ))}

                  <button type="submit" className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm transition-all">
                    Mettre à jour
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── MODAL CRÉER BOUTIQUE ──────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-white">Nouvelle boutique</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateBoutiqueSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom de la boutique *</label>
                <input required value={newBoutiqueForm.name} onChange={e => setNewBoutiqueForm({...newBoutiqueForm, name:e.target.value})}
                  placeholder="Ex: Sunu Boutik"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">WhatsApp *</label>
                <input required value={newBoutiqueForm.whatsapp} onChange={e => setNewBoutiqueForm({...newBoutiqueForm, whatsapp:e.target.value})}
                  placeholder="780178444"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 font-mono focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email propriétaire</label>
                  <input type="email" value={newBoutiqueForm.ownerEmail} onChange={e => setNewBoutiqueForm({...newBoutiqueForm, ownerEmail:e.target.value})}
                    placeholder="vendeur@..."
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Mot de passe</label>
                  <input type="password" value={newBoutiqueForm.password} onChange={e => setNewBoutiqueForm({...newBoutiqueForm, password:e.target.value})}
                    placeholder="Déf: 123456"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                <textarea value={newBoutiqueForm.description} onChange={e => setNewBoutiqueForm({...newBoutiqueForm, description:e.target.value})} rows={2}
                  placeholder="Slogan de la boutique..."
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Plan initial</label>
                  <select value={newBoutiqueForm.plan} onChange={e => setNewBoutiqueForm({...newBoutiqueForm, plan:e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 font-semibold focus:border-blue-500 focus:outline-none cursor-pointer">
                    <option value="Découverte">Découverte</option>
                    <option value="Pro">Pro · 5 000</option>
                    <option value="Premium">Premium · 15 000</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Couleur thème</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={newBoutiqueForm.couleurMarque} onChange={e => setNewBoutiqueForm({...newBoutiqueForm, couleurMarque:e.target.value})}
                      className="w-10 h-10 bg-transparent border-0 rounded cursor-pointer p-0" />
                    <input type="text" value={newBoutiqueForm.couleurMarque} onChange={e => setNewBoutiqueForm({...newBoutiqueForm, couleurMarque:e.target.value})}
                      className="flex-1 px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-medium text-sm transition-colors">Annuler</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm transition-all">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

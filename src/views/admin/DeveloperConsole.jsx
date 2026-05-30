import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Store, 
  ClipboardList, 
  Settings, 
  LogOut, 
  Check, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  Users,
  Lock,
  Unlock,
  MessageSquare,
  Trash2
} from 'lucide-react';

export default function DeveloperConsole() {
  const {
    boutiques,
    tickets,
    updateBoutique,
    deleteBoutique,
    resolveTicket,
    replyToTicket,
    addBoutiqueWithAuth,
    upgradeRequests,
    approveUpgradeRequest,
    rejectUpgradeRequest
  } = useTenant();

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, boutiques, tickets, config
  const [replyTextMap, setReplyTextMap] = useState({});
  
  // Authentication states for Developer Console
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Password change states
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  // Create Boutique modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoutiqueForm, setNewBoutiqueForm] = useState({
    name: '',
    whatsapp: '',
    description: '',
    ownerEmail: '',
    password: '',
    plan: 'Pro',
    couleurMarque: '#0d9488'
  });

  // Mot de passe admin : priorité à la variable d'env VITE_ADMIN_SECRET,
  // sinon au mot de passe changé via l'interface (localStorage), sinon défaut env.
  const getStoredAdminPassword = () => {
    const envSecret = import.meta.env.VITE_ADMIN_SECRET;
    return localStorage.getItem('ks_admin_password') || envSecret || 'ks-admin-2025';
  };

  const handleCreateBoutiqueSubmit = async (e) => {
    e.preventDefault();
    if (!newBoutiqueForm.name.trim() || !newBoutiqueForm.whatsapp.trim()) {
      alert('Veuillez remplir le nom et le numéro WhatsApp.');
      return;
    }
    
    // Clean whatsapp format
    let cleanWhatsapp = newBoutiqueForm.whatsapp.trim();
    if (!cleanWhatsapp.startsWith('+')) {
      if (cleanWhatsapp.startsWith('221')) {
        cleanWhatsapp = '+' + cleanWhatsapp;
      } else {
        cleanWhatsapp = '+221' + cleanWhatsapp;
      }
    }
    
    const ownerEmail = newBoutiqueForm.ownerEmail.trim() || 'vendeur@kersalaatu.sn';
    const tempPassword = newBoutiqueForm.password || '123456';
    
    try {
      await addBoutiqueWithAuth({
        name: newBoutiqueForm.name,
        description: newBoutiqueForm.description || `Boutique en ligne ${newBoutiqueForm.name} propulsée par Kër Salaatu Tech.`,
        whatsapp: cleanWhatsapp,
        ownerEmail: ownerEmail,
        couleurMarque: newBoutiqueForm.couleurMarque,
        abonnement: {
          plan: newBoutiqueForm.plan,
          statut: 'Actif',
          dateDebut: new Date().toISOString(),
          dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }, tempPassword);
      
      setShowCreateModal(false);
      setNewBoutiqueForm({
        name: '',
        whatsapp: '',
        description: '',
        ownerEmail: '',
        password: '',
        plan: 'Pro',
        couleurMarque: '#0d9488'
      });
      alert(`Nouvelle boutique créée avec succès !\n\nIdentifiants de connexion du marchand :\nEmail : ${ownerEmail}\nMot de passe temporaire : ${tempPassword}`);
    } catch (error) {
      console.error(error);
      alert(`Erreur lors de la création de la boutique : ${error.message || error}`);
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    
    const stored = getStoredAdminPassword();
    if (currentPass !== stored) {
      setPassError('Le mot de passe actuel est incorrect.');
      return;
    }
    if (newPass.length < 4) {
      setPassError('Le nouveau mot de passe doit faire au moins 4 caractères.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    
    localStorage.setItem('ks_admin_password', newPass);
    setPassSuccess('Le mot de passe administrateur a été modifié avec succès !');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative font-sans text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/25 via-slate-950 to-slate-950 pointer-events-none" />
        
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl relative backdrop-blur-sm space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
            <Shield className="w-7 h-7 text-slate-950 stroke-[2.5]" />
          </div>
          
          <div>
            <h2 className="text-2xl font-black tracking-tight">Accès Sécurisé Développeur</h2>
            <p className="text-xs text-slate-500 mt-1">Veuillez saisir votre code d'accès administrateur Kër Salaatu Tech.</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (adminPassword === getStoredAdminPassword()) {
              setIsAuthenticated(true);
            } else {
              setAuthError('Code d\'accès incorrect. Veuillez réessayer.');
            }
          }} className="space-y-4">
            <div>
              <input
                type="password"
                required
                placeholder="Code d'accès secret"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setAuthError('');
                }}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-center text-sm font-mono tracking-widest text-slate-200 placeholder-slate-700"
              />
              {authError && (
                <span className="text-red-400 text-[10px] block mt-1.5 font-semibold">{authError}</span>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold hover:shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              Déverrouiller la console
            </button>
          </form>

          <Link to="/" className="text-xs font-semibold text-slate-500 hover:text-slate-355 transition-colors block">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  // Stats calculation
  const totalShops = boutiques.length;
  const activeShops = boutiques.filter(b => b.abonnement?.statut === 'Actif').length;
  const pendingTickets = tickets.filter(t => t.statut === 'En attente').length;
  const pendingUpgrades = upgradeRequests.filter(req => req.statut === 'En attente').length;
  
  // Estimate MRR (Monthly Recurring Revenue)
  // Pro: 5,000 FCFA, Premium: 15,000 FCFA
  const platformMRR = boutiques.reduce((sum, b) => {
    if (b.abonnement?.statut !== 'Actif') return sum;
    if (b.abonnement?.plan === 'Pro') return sum + 5000;
    if (b.abonnement?.plan === 'Premium') return sum + 15000;
    return sum; // Free / Découverte
  }, 0);

  // Toggle Shop suspension
  const handleToggleSuspension = (boutique) => {
    const currentStatus = boutique.abonnement?.statut || 'Actif';
    const newStatus = currentStatus === 'Actif' ? 'Suspendu' : 'Actif';
    
    updateBoutique(boutique.id, {
      abonnement: {
        ...boutique.abonnement,
        statut: newStatus
      }
    });
  };

  // Change Shop plan
  const handlePlanChange = (boutiqueId, newPlan) => {
    const boutique = boutiques.find(b => b.id === boutiqueId);
    if (!boutique) return;
    
    updateBoutique(boutiqueId, {
      abonnement: {
        ...boutique.abonnement,
        plan: newPlan
      }
    });
  };

  // Format currency
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Shield className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white block">Kër Salaatu Tech</span>
              <span className="block text-[8px] uppercase tracking-widest text-teal-400 font-semibold">Console Développeur</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-transparent'}`}
            >
              <Settings className="w-4 h-4" /> Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('boutiques')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'boutiques' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-transparent'}`}
            >
              <Store className="w-4 h-4" /> Gérer Boutiques ({totalShops})
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'tickets' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-transparent'}`}
            >
              <ClipboardList className="w-4 h-4" /> Support & Bugs
              {pendingTickets > 0 && (
                <span className="ml-auto bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  {pendingTickets}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('activations')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'activations' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-transparent'}`}
            >
              <DollarSign className="w-4 h-4" /> Activations
              {pendingUpgrades > 0 && (
                <span className="ml-auto bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                  {pendingUpgrades}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'config' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-transparent'}`}
            >
              <Lock className="w-4 h-4" /> Accès & Sécurité
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800">
          <Link to="/" className="w-full px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-850 hover:text-white transition-all flex items-center gap-3">
            <LogOut className="w-4 h-4" /> Retour au site
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl">
        
        {/* Page title banner */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-100">Portail Administration Centrale</h2>
            <p className="text-xs text-slate-500 mt-0.5">Supervisez les abonnements, suspendez les impayés et résolvez les tickets d'assistance.</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400">
            Version : <span className="text-teal-400">v1.0 SaaS Multi-tenant</span>
          </div>
        </div>

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Live notification alerts */}
            {pendingUpgrades > 0 && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-slate-205 text-xs animate-pulse">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>
                    Vous avez <strong>{pendingUpgrades}</strong> demande(s) de déblocage par paiement Mobile Money en attente de vérification.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('activations')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-450 font-bold transition-all text-[11px] cursor-pointer"
                >
                  Voir les demandes
                </button>
              </div>
            )}

            {/* KPI Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between relative overflow-hidden">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Revenus (MRR)</span>
                  <h3 className="text-xl font-black text-white">{formatMoney(platformMRR)}</h3>
                  <p className="text-[9px] text-teal-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Abonnements</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between relative overflow-hidden">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Boutiques</span>
                  <h3 className="text-xl font-black text-white">{totalShops}</h3>
                  <p className="text-[9px] text-slate-400">Inscriptions</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Store className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between relative overflow-hidden">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actives</span>
                  <h3 className="text-xl font-black text-white">{activeShops}</h3>
                  <p className="text-[9px] text-teal-400">En service</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between relative overflow-hidden">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bugs Actifs</span>
                  <h3 className="text-xl font-black text-white">{pendingTickets}</h3>
                  <p className="text-[9px] text-amber-500">Tickets ouverts</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pendingTickets > 0 ? 'bg-amber-500/10 text-amber-400 animate-pulse' : 'bg-slate-805 text-slate-700'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between relative overflow-hidden">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Activations</span>
                  <h3 className="text-xl font-black text-white">{pendingUpgrades}</h3>
                  <p className="text-[9px] text-emerald-455 font-semibold">Paiements en attente</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pendingUpgrades > 0 ? 'bg-emerald-500/10 text-emerald-400 animate-pulse' : 'bg-slate-805 text-slate-700'}`}>
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Quick overview of latest shops & active tickets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Shops list short */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                    <Store className="w-4 h-4 text-teal-400" /> Boutiques Récentes
                  </h3>
                  <button onClick={() => setActiveTab('boutiques')} className="text-xs text-teal-400 hover:underline">
                    Gérer
                  </button>
                </div>
                
                <div className="divide-y divide-slate-850">
                  {boutiques.slice(0, 3).map((b) => (
                    <div key={b.id} className="py-3 flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center text-lg overflow-hidden shrink-0">
                          {b.logo && (b.logo.startsWith('/') || b.logo.startsWith('http') || b.logo.startsWith('data:image')) ? (
                            <img src={b.logo} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            b.logo || '🛍️'
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-sm block text-slate-200">{b.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">/{b.slug}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${b.abonnement?.statut === 'Actif' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {b.abonnement?.statut || 'Actif'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tickets list short */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-400" /> Tickets en attente
                  </h3>
                  <button onClick={() => setActiveTab('tickets')} className="text-xs text-teal-400 hover:underline">
                    Résoudre
                  </button>
                </div>

                <div className="space-y-3">
                  {tickets.filter(t => t.statut === 'En attente').slice(0, 2).map((t) => {
                    const shop = boutiques.find(b => b.id === t.boutiqueId) || { name: 'Inconnue' };
                    return (
                      <div key={t.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-start">
                        <div>
                          <span className="font-bold text-xs text-slate-200 leading-snug">{t.sujet}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Boutique: <strong className="text-slate-400">{shop.name}</strong></p>
                        </div>
                        <button
                          onClick={() => {
                            resolveTicket(t.id);
                            alert('Ticket résolu !');
                          }}
                          className="px-2 py-1 rounded bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Marquer résolu
                        </button>
                      </div>
                    );
                  })}
                  {tickets.filter(t => t.statut === 'En attente').length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      Aucun ticket technique en attente. Bon travail !
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. BOUTIQUES TAB */}
        {activeTab === 'boutiques' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-xl text-slate-100">Supervision des Boutiques Hébergées</h3>
                <p className="text-slate-500 text-xs mt-0.5">Gérez, activez, suspendez ou créez manuellement les boutiques de la plateforme.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="py-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all"
              >
                Créer une Boutique
              </button>
            </div>
            
            <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-850 text-slate-400">
                    <th className="py-3 px-4 font-bold text-xs">Boutique / Slug</th>
                    <th className="py-3 px-4 font-bold text-xs">Coordonnées</th>
                    <th className="py-3 px-4 font-bold text-xs">Plan d'Abonnement</th>
                    <th className="py-3 px-4 font-bold text-xs">Statut</th>
                    <th className="py-3 px-4 font-bold text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {boutiques.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-850/30">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center text-xl overflow-hidden shrink-0">
                            {b.logo && (b.logo.startsWith('/') || b.logo.startsWith('http') || b.logo.startsWith('data:image')) ? (
                              <img src={b.logo} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                              b.logo || '🛍️'
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-200 block leading-snug">{b.name}</span>
                            <Link to={`/shop/${b.slug}`} target="_blank" className="text-xs text-teal-400 hover:underline font-mono">/{b.slug}</Link>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs space-y-0.5 text-slate-400">
                        <p>Tél : <strong className="text-slate-300">{b.whatsapp}</strong></p>
                        {b.adresse && <p>Lieu : {b.adresse}</p>}
                      </td>

                      <td className="py-4 px-4">
                        <select
                          value={b.abonnement?.plan || 'Découverte'}
                          onChange={(e) => handlePlanChange(b.id, e.target.value)}
                          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 font-semibold focus:outline-none focus:border-teal-500 cursor-pointer"
                        >
                          <option value="Découverte">Découverte (Gratuit)</option>
                          <option value="Pro">Pro (5 000 FCFA/m)</option>
                          <option value="Premium">Premium (15 000 FCFA/m)</option>
                        </select>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.abonnement?.statut === 'Actif'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {b.abonnement?.statut || 'Actif'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right flex justify-end gap-2 items-center">
                        <button
                          onClick={() => handleToggleSuspension(b)}
                          className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            b.abonnement?.statut === 'Actif'
                            ? 'bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-500/10'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                          }`}
                        >
                          {b.abonnement?.statut === 'Actif' ? (
                            <><Lock className="w-3.5 h-3.5" /> Suspendre</>
                          ) : (
                            <><Unlock className="w-3.5 h-3.5" /> Réactiver</>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement la boutique "${b.name}" ainsi que tous ses produits, commandes et tickets ? Cette action est irréversible.`)) {
                              deleteBoutique(b.id);
                              alert('Boutique supprimée avec succès !');
                            }
                          }}
                          className="py-1.5 px-2.5 rounded-lg bg-red-950/30 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-slate-950 transition-all flex items-center justify-center cursor-pointer"
                          title="Supprimer la boutique"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. TICKETS TAB */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <h3 className="font-extrabold text-xl text-slate-100">Tickets de Support Marchands ({tickets.length})</h3>
            
            <div className="space-y-4">
              {tickets.map((t) => {
                const shop = boutiques.find(b => b.id === t.boutiqueId) || { name: 'Inconnue', logo: '🛍️' };
                return (
                  <div key={t.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative overflow-hidden shadow-xl">
                    <div className="flex justify-between items-start border-b border-slate-850 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{shop.logo.startsWith('/') ? '🛍️' : shop.logo}</span>
                          <span className="font-bold text-sm text-slate-200">{shop.name}</span>
                          <span className="text-xs text-slate-500">&bull; Réf Ticket: <code className="text-teal-400">{t.id}</code></span>
                        </div>
                        <h4 className="font-extrabold text-base text-slate-100 mt-2">{t.sujet}</h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          t.statut === 'En attente'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : t.statut === 'En cours'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {t.statut}
                        </span>

                        {t.statut !== 'Résolu' && (
                          <button
                            onClick={() => {
                              resolveTicket(t.id);
                              alert('Ticket marqué comme résolu !');
                            }}
                            className="p-1.5 rounded-xl bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                          >
                            <Check className="w-4 h-4 stroke-[3]" /> Résoudre
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-400 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-850">{t.message}</p>
                    
                    {t.reponse && (
                      <div className="bg-teal-950/20 border border-teal-500/20 p-4 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide">Réponse technique apportée :</span>
                        <p className="text-xs text-slate-300 italic">"{t.reponse}"</p>
                      </div>
                    )}

                    {t.statut !== 'Résolu' && (
                      <div className="pt-2 border-t border-slate-850 mt-3 space-y-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500">Répondre au marchand :</label>
                        <div className="flex gap-2">
                          <textarea
                            value={replyTextMap[t.id] || ''}
                            onChange={(e) => setReplyTextMap({ ...replyTextMap, [t.id]: e.target.value })}
                            placeholder="Entrez des instructions de résolution, questions ou message technique..."
                            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500 min-h-[40px] resize-y"
                          />
                          <button
                            onClick={() => {
                              if (!replyTextMap[t.id]?.trim()) return;
                              replyToTicket(t.id, replyTextMap[t.id]);
                              setReplyTextMap({ ...replyTextMap, [t.id]: '' });
                              alert('Réponse technique envoyée ! Le statut passe à "En cours".');
                            }}
                            className="px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
                          >
                            Envoyer la réponse
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                      <span>Signalé le {new Date(t.date).toLocaleDateString('fr-FR')} à {new Date(t.date).toLocaleTimeString('fr-FR')}</span>
                    </div>
                  </div>
                );
              })}

              {tickets.length === 0 && (
                <div className="py-20 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/40">
                  <MessageSquare className="w-16 h-16 mx-auto text-slate-700 mb-3" />
                  <p className="font-bold text-slate-400">Aucun ticket disponible</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3.5. ACTIVATIONS TAB */}
        {activeTab === 'activations' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-extrabold text-xl text-slate-100">Demandes de Paiement & Activations ({upgradeRequests.length})</h3>
              <p className="text-slate-500 text-xs mt-0.5">Vérifiez les transactions Mobile Money soumises par les marchands et activez leurs forfaits.</p>
            </div>
            
            <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-850 text-slate-400">
                    <th className="py-3 px-4 font-bold text-xs">Boutique</th>
                    <th className="py-3 px-4 font-bold text-xs">Plan Demandé</th>
                    <th className="py-3 px-4 font-bold text-xs">Mode de Paiement</th>
                    <th className="py-3 px-4 font-bold text-xs">Numéro de Téléphone</th>
                    <th className="py-3 px-4 font-bold text-xs">Date</th>
                    <th className="py-3 px-4 font-bold text-xs">Statut</th>
                    <th className="py-3 px-4 font-bold text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {upgradeRequests.map((req) => {
                    const shop = boutiques.find(b => b.id === req.boutiqueId) || { name: 'Boutique Inconnue', logo: '🛍️' };
                    return (
                      <tr key={req.id} className="hover:bg-slate-850/30">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center text-xl overflow-hidden shrink-0">
                              {shop.logo && (shop.logo.startsWith('/') || shop.logo.startsWith('http') || shop.logo.startsWith('data:image')) ? (
                                <img src={shop.logo} alt="Logo" className="w-full h-full object-contain" />
                              ) : (
                                shop.logo || '🛍️'
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-slate-200 block leading-snug">{shop.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">ID: {req.boutiqueId}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            req.planName === 'Premium' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                          }`}>
                            {req.planName}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-xs font-semibold">
                          {req.paymentMethod}
                        </td>

                        <td className="py-4 px-4 text-xs font-mono text-slate-300">
                          {req.phoneNumber}
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-400">
                          {new Date(req.date).toLocaleDateString('fr-FR')} {new Date(req.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                        </td>

                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            req.statut === 'En attente'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : req.statut === 'Validé'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {req.statut}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right flex justify-end gap-2 items-center">
                          {req.statut === 'En attente' ? (
                            <>
                              <button
                                onClick={() => {
                                  if (confirm(`Confirmez-vous la réception du paiement Mobile Money et le déblocage de "${shop.name}" ?`)) {
                                    approveUpgradeRequest(req.id);
                                    alert('Boutique débloquée avec succès !');
                                  }
                                }}
                                className="py-1.5 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Valider & Activer
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Voulez-vous rejeter cette demande d'activation ?`)) {
                                    rejectUpgradeRequest(req.id);
                                    alert('Demande rejetée.');
                                  }
                                }}
                                className="py-1.5 px-3 rounded-lg bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-500/10 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
                              >
                                Refuser
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500 font-medium">Aucune action requise</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {upgradeRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        Aucune demande d'activation soumise pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. CONFIG TAB (Accès & Sécurité) */}
        {activeTab === 'config' && (
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-xl space-y-6 max-w-xl">
            <div>
              <h3 className="font-extrabold text-xl text-slate-100 flex items-center gap-2">
                <Lock className="w-5 h-5 text-teal-400" /> Sécurité d'Accès Admin
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Modifiez le mot de passe requis pour accéder à cette console d'administration centrale.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 font-sans">
              {passError && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
                  {passError}
                </div>
              )}
              {passSuccess && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold">
                  {passSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mot de passe actuel</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-200 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 4 caractères"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-200 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  placeholder="Re-saisir le nouveau mot de passe"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-200 text-sm font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold hover:shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                Mettre à jour le mot de passe
              </button>
            </form>
          </div>
        )}
      </main>

      {/* CREATE BOUTIQUE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">Créer une Nouvelle Boutique</h3>
            <p className="text-slate-400 text-xs mb-5">Configurez et lancez une boutique manuellement.</p>

            <form onSubmit={handleCreateBoutiqueSubmit} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nom de la boutique</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sunu Boutik, Dakar Couture"
                  value={newBoutiqueForm.name}
                  onChange={(e) => setNewBoutiqueForm({ ...newBoutiqueForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">WhatsApp (Ex: 780178444)</label>
                <input
                  type="text"
                  required
                  placeholder="Numéro du vendeur"
                  value={newBoutiqueForm.whatsapp}
                  onChange={(e) => setNewBoutiqueForm({ ...newBoutiqueForm, whatsapp: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-200 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email du Propriétaire</label>
                  <input
                    type="email"
                    placeholder="vendeur@exemple.com"
                    value={newBoutiqueForm.ownerEmail}
                    onChange={(e) => setNewBoutiqueForm({ ...newBoutiqueForm, ownerEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Mot de passe temporaire</label>
                  <input
                    type="password"
                    placeholder="Par défaut: 123456"
                    value={newBoutiqueForm.password}
                    onChange={(e) => setNewBoutiqueForm({ ...newBoutiqueForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Slogan / Description</label>
                <textarea
                  placeholder="Ex: Prêt-à-porter sénégalais haut de gamme..."
                  value={newBoutiqueForm.description}
                  onChange={(e) => setNewBoutiqueForm({ ...newBoutiqueForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Plan initial</label>
                  <select
                    value={newBoutiqueForm.plan}
                    onChange={(e) => setNewBoutiqueForm({ ...newBoutiqueForm, plan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-teal-500 focus:outline-none text-slate-200 text-xs cursor-pointer font-semibold"
                  >
                    <option value="Découverte">Découverte (Gratuit)</option>
                    <option value="Pro">Pro (5 000 FCFA/m)</option>
                    <option value="Premium">Premium (15 000 FCFA/m)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Couleur du thème</label>
                  <div className="flex gap-2 items-center mt-1">
                    <input
                      type="color"
                      value={newBoutiqueForm.couleurMarque}
                      onChange={(e) => setNewBoutiqueForm({ ...newBoutiqueForm, couleurMarque: e.target.value })}
                      className="w-9 h-9 bg-transparent border-0 rounded cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={newBoutiqueForm.couleurMarque}
                      onChange={(e) => setNewBoutiqueForm({ ...newBoutiqueForm, couleurMarque: e.target.value })}
                      className="w-24 px-2 py-1.5 bg-slate-950 border border-slate-850 rounded text-[10px] font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white transition-colors cursor-pointer text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-colors cursor-pointer text-xs"
                >
                  Créer la boutique
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

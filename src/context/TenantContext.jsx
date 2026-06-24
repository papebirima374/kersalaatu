/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, auth, storage, isConfigured, app } from '../firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { toast } from '../components/toast';
import { cartNet } from '../utils/money';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  getAuth
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const TenantContext = createContext();

// Données de démonstration SUPPRIMÉES : le site est en production avec de vrais
// clients. Sans configuration Firebase (dev local), l'app démarre simplement vide.

// En production, purge une fois pour toutes les caches métier hérités du mode
// démo (ils contenaient produits/boutiques de démonstration et données obsolètes).
if (isConfigured && typeof window !== 'undefined') {
  try {
    ['ks_boutiques', 'ks_products', 'ks_orders', 'ks_tickets', 'ks_upgrade_requests'].forEach(k => localStorage.removeItem(k));
  } catch { /* stockage indisponible : sans gravité */ }
}

export const TenantProvider = ({ children }) => {
  // En PRODUCTION (Firebase configuré), la seule source de vérité est Firestore :
  // ni données de démonstration, ni cache localStorage (ils faisaient « réapparaître »
  // des produits/photos démo chez les marchands). En dev local : localStorage.
  const [boutiques, setBoutiques] = useState(() => {
    if (isConfigured) return [];
    const local = localStorage.getItem('ks_boutiques');
    return local ? JSON.parse(local) : [];
  });

  const [products, setProducts] = useState(() => {
    if (isConfigured) return [];
    const local = localStorage.getItem('ks_products');
    return local ? JSON.parse(local) : [];
  });

  const [orders, setOrders] = useState(() => {
    if (isConfigured) return [];
    const local = localStorage.getItem('ks_orders');
    return local ? JSON.parse(local) : [];
  });

  const [tickets, setTickets] = useState(() => {
    if (isConfigured) return [];
    const local = localStorage.getItem('ks_tickets');
    return local ? JSON.parse(local) : [];
  });

  const [upgradeRequests, setUpgradeRequests] = useState(() => {
    if (isConfigured) return [];
    const local = localStorage.getItem('ks_upgrade_requests');
    return local ? JSON.parse(local) : [];
  });

  const [currentMerchantBoutiqueId, setCurrentMerchantBoutiqueId] = useState(() => {
    return localStorage.getItem('ks_current_merchant_id') || '';
  });

  const [merchantUser, setMerchantUser] = useState(() => {
    const local = localStorage.getItem('ks_merchant_user');
    return local ? JSON.parse(local) : null;
  });

  const [activeStorefrontBoutiqueId, setActiveStorefrontBoutiqueId] = useState(null);

  const [caissiers, setCaissiers] = useState(() => {
    if (isConfigured) return [];
    const local = localStorage.getItem('ks_caissiers');
    return local ? JSON.parse(local) : [];
  });

  const [depenses, setDepenses] = useState(() => {
    if (isConfigured) return [];
    const local = localStorage.getItem('ks_depenses');
    return local ? JSON.parse(local) : [];
  });

  // true tant que Firebase n'a pas résolu l'état d'auth (évite la page blanche)
  const [authReady, setAuthReady] = useState(!isConfigured);
  // true quand Firestore a répondu au moins une fois (évite "Boutique Introuvable" au refresh)
  const [dataReady, setDataReady] = useState(!isConfigured);

  // Sync localStorage — UNIQUEMENT en mode démo local. En production, persister
  // ces données dans le navigateur réinjectait d'anciens produits supprimés.
  useEffect(() => {
    if (!isConfigured) localStorage.setItem('ks_boutiques', JSON.stringify(boutiques));
  }, [boutiques]);

  useEffect(() => {
    if (!isConfigured) localStorage.setItem('ks_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (!isConfigured) localStorage.setItem('ks_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (!isConfigured) localStorage.setItem('ks_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    if (!isConfigured) localStorage.setItem('ks_upgrade_requests', JSON.stringify(upgradeRequests));
  }, [upgradeRequests]);

  useEffect(() => {
    if (!isConfigured) localStorage.setItem('ks_caissiers', JSON.stringify(caissiers));
  }, [caissiers]);

  useEffect(() => {
    if (!isConfigured) localStorage.setItem('ks_depenses', JSON.stringify(depenses));
  }, [depenses]);

  useEffect(() => {
    localStorage.setItem('ks_current_merchant_id', currentMerchantBoutiqueId);
  }, [currentMerchantBoutiqueId]);

  useEffect(() => {
    if (merchantUser) {
      localStorage.setItem('ks_merchant_user', JSON.stringify(merchantUser));
    } else {
      localStorage.removeItem('ks_merchant_user');
    }
  }, [merchantUser]);

  // Firebase auth state listener
  useEffect(() => {
    if (!isConfigured) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Le compte est-il un CAISSIER ? (requête authentifiée — règles signedIn OK)
        let cashier = null;
        try {
          const snap = await getDocs(query(collection(db, 'caissiers'), where('email', '==', (user.email || '').toLowerCase())));
          if (snap.docs.length > 0) cashier = snap.docs[0].data();
        } catch { /* pas caissier / lecture impossible : marchand normal */ }
        setMerchantUser({
          uid: user.uid,
          email: user.email,
          displayName: cashier?.nom || user.displayName || user.email.split('@')[0],
          ...(cashier ? { role: 'caissier', boutiqueId: cashier.boutiqueId } : {})
        });
        if (cashier?.boutiqueId) setCurrentMerchantBoutiqueId(cashier.boutiqueId);
      } else {
        setMerchantUser(null);
        setOrders([]);
        setTickets([]);
        setUpgradeRequests([]);
      }
      // Firebase a résolu l'état d'auth — on peut maintenant afficher l'UI
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Listeners PUBLICS (boutiques + produits) — toujours actifs (vitrines publiques)
  useEffect(() => {
    if (!isConfigured) return;
    const unsubs = [];

    unsubs.push(onSnapshot(collection(db, 'boutiques'), snap => {
      const data = snap.docs.map(d => {
        const b = { id: d.id, ...d.data() };
        if (b.slug === 'sunuboutique') {
          b.abonnement = {
            plan: 'Premium',
            statut: 'Actif',
            dateDebut: b.abonnement?.dateDebut || new Date().toISOString(),
            dateExpiration: b.abonnement?.dateExpiration || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          };
          if (!b.waveMerchantLink) {
            b.waveMerchantLink = 'https://pay.wave.com/m/M_sn_bbehrkdtxa8W/c/sn/';
          }
        }
        // Canonise les noms de forfaits : en base, les valeurs sont « Pro » et
        // « Premium » (les libellés SaaS Pro / Premium VIP ne sont qu'affichage).
        if (b.abonnement?.plan === 'SaaS Pro') b.abonnement.plan = 'Pro';
        if (b.abonnement?.plan === 'Premium VIP') b.abonnement.plan = 'Premium';
        return b;
      });
      // Source de vérité = Firestore, même si la collection est vide.
      // (on n'écrit JAMAIS les boutiques de démonstration en production)
      setBoutiques(data);
      setDataReady(true);
    }, err => {
      console.error('boutiques listener:', err);
      setDataReady(true);
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  // Listen to products of active storefront boutique dynamically
  useEffect(() => {
    if (!isConfigured || !activeStorefrontBoutiqueId) return;
    const q = query(collection(db, 'products'), where('boutiqueId', '==', activeStorefrontBoutiqueId));
    const unsubscribe = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(prev => {
        const filtered = prev.filter(p => p.boutiqueId !== activeStorefrontBoutiqueId);
        return [...filtered, ...data];
      });
    }, err => console.error('storefront products listener:', err));
    return () => unsubscribe();
  }, [activeStorefrontBoutiqueId]);

  // Listen to products of current merchant boutique dynamically
  useEffect(() => {
    if (!isConfigured || !currentMerchantBoutiqueId) return;
    if (currentMerchantBoutiqueId === activeStorefrontBoutiqueId) return;
    const q = query(collection(db, 'products'), where('boutiqueId', '==', currentMerchantBoutiqueId));
    const unsubscribe = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(prev => {
        const filtered = prev.filter(p => p.boutiqueId !== currentMerchantBoutiqueId);
        return [...filtered, ...data];
      });
    }, err => console.error('merchant products listener:', err));
    return () => unsubscribe();
  }, [currentMerchantBoutiqueId, activeStorefrontBoutiqueId]);

  // Listeners PRIVÉS (commandes, tickets, upgrades) — seulement pour un compte connecté.
  // → un visiteur anonyme de vitrine ne télécharge plus toute la base : vitrine plus rapide + données privées non chargées.
  useEffect(() => {
    if (!isConfigured) return;
    if (!merchantUser) return;
    const unsubs = [];

    // Tickets & demandes d'upgrade : l'admin a besoin de la vue globale.
    unsubs.push(onSnapshot(collection(db, 'tickets'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTickets(data);
    }, err => console.error('tickets listener:', err)));

    unsubs.push(onSnapshot(collection(db, 'upgradeRequests'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setUpgradeRequests(data);
    }, err => console.error('upgradeRequests listener:', err)));

    return () => unsubs.forEach(u => u());
  }, [merchantUser?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Commandes / caissiers / dépenses : SCOPÉS à la boutique active du marchand.
  // Un marchand ne télécharge JAMAIS les commandes (clients) d'une autre boutique.
  // Re-souscription au changement de boutique (même schéma que les produits).
  useEffect(() => {
    if (!isConfigured || !merchantUser || !currentMerchantBoutiqueId) return;
    if (currentMerchantBoutiqueId === activeStorefrontBoutiqueId) return;
    const bid = currentMerchantBoutiqueId;
    const unsubs = [];

    unsubs.push(onSnapshot(query(collection(db, 'orders'), where('boutiqueId', '==', bid)), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setOrders(data);
    }, err => console.error('orders listener:', err)));

    unsubs.push(onSnapshot(query(collection(db, 'caissiers'), where('boutiqueId', '==', bid)), snap => {
      setCaissiers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('caissiers listener:', err)));

    unsubs.push(onSnapshot(query(collection(db, 'depenses'), where('boutiqueId', '==', bid)), snap => {
      setDepenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('depenses listener:', err)));

    return () => unsubs.forEach(u => u());
  }, [merchantUser?.uid, currentMerchantBoutiqueId, activeStorefrontBoutiqueId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Actions
  const updateBoutique = (boutiqueId, updatedFields) => {
    setBoutiques(prev => prev.map(b => b.id === boutiqueId ? { ...b, ...updatedFields } : b));
    if (isConfigured) {
      updateDoc(doc(db, 'boutiques', boutiqueId), updatedFields)
        .catch(err => {
          console.error("Error updating boutique in Firestore:", err);
          // Visible : sinon l'échec est silencieux et la modification « revient en arrière »
          toast(err.code === 'permission-denied'
            ? 'Modification refusée par la base (permissions Firestore).'
            : "Échec de l'enregistrement — vérifiez votre connexion.", 'error', 6000);
        });
    }
  };

  // ─── Anti-doublons : un e-mail / un numéro WhatsApp = UNE seule boutique ───
  const normPhone = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('221') ? d.slice(3) : d; };
  const normEmail = (e) => String(e || '').trim().toLowerCase();
  const assertNoDuplicateBoutique = ({ email, whatsapp, excludeId = null }) => {
    const e = normEmail(email);
    const p = normPhone(whatsapp);
    const PLACEHOLDER = 'vendeur@jappandal.sn'; // email générique posé par l'admin : pas un doublon
    const dup = boutiques.find(b => {
      if (excludeId && b.id === excludeId) return false;
      if (e && e !== PLACEHOLDER && normEmail(b.ownerEmail) === e) return true;
      if (p && (normPhone(b.whatsapp) === p || (b.whatsapp2 && normPhone(b.whatsapp2) === p))) return true;
      return false;
    });
    if (dup) {
      const byEmail = e && normEmail(dup.ownerEmail) === e;
      throw new Error(byEmail
        ? `Un compte existe déjà avec cet e-mail (boutique « ${dup.name} »). Connectez-vous plutôt que de créer un nouveau compte.`
        : `Une boutique (« ${dup.name} ») utilise déjà ce numéro WhatsApp. Connectez-vous à votre compte existant.`);
    }
  };

  const addBoutique = (newBoutique) => {
    assertNoDuplicateBoutique({ email: newBoutique.ownerEmail, whatsapp: newBoutique.whatsapp });
    const boutique = {
      id: `boutique-${Date.now()}`,
      slug: newBoutique.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      devise: 'FCFA',
      couleurMarque: '#2563eb',
      couleurMarqueHover: '#1d4ed8',
      zonesLivraison: [
        { id: 'z1', label: 'Dakar Centre', price: 1500, delai: 'Sous 24h' },
        { id: 'z2', label: 'Banlieue Dakar', price: 2500, delai: 'Sous 48h' },
        { id: 'z3', label: 'Régions du Sénégal', price: 5000, delai: '3 à 5 jours' }
      ],
      abonnement: {
        plan: 'Découverte',
        statut: 'Actif',
        dateDebut: new Date().toISOString(),
        dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      ...newBoutique
    };
    setBoutiques(prev => [...prev, boutique]);
    
    if (isConfigured) {
      setDoc(doc(db, 'boutiques', boutique.id), boutique)
        .catch(err => console.error("Error writing boutique to Firestore:", err));
    }
    return boutique;
  };

  // options.linkExistingAccount : crée une 2e boutique POUR UN COMPTE EXISTANT
  // (ex. un marchand avec un représentant au Sénégal et un autre en Europe :
  //  même e-mail de connexion, boutiques/stocks/devises séparés).
  const addBoutiqueWithAuth = async (newBoutique, password, options = {}) => {
    // Doublons bloqués — sauf l'e-mail quand on lie volontairement au même compte
    assertNoDuplicateBoutique({
      email: options.linkExistingAccount ? '' : newBoutique.ownerEmail,
      whatsapp: newBoutique.whatsapp
    });

    let ownerUid = `admin-created-${Date.now()}`;

    if (options.linkExistingAccount && newBoutique.ownerEmail) {
      // Réutilise le compte du marchand : même uid que sa boutique existante
      const sibling = boutiques.find(b => normEmail(b.ownerEmail) === normEmail(newBoutique.ownerEmail));
      if (sibling) {
        const siblingPlan = sibling.abonnement?.plan || 'Découverte';
        if (siblingPlan !== 'Premium' && siblingPlan !== 'Premium VIP') {
          throw new Error(`La liaison de plusieurs boutiques au même compte est réservée aux abonnements Premium VIP. La boutique existante « ${sibling.name} » est actuellement sous le forfait ${siblingPlan === 'Premium' ? 'Premium VIP' : (siblingPlan === 'Pro' ? 'SaaS Pro' : siblingPlan)}.`);
        }
      }
      ownerUid = sibling?.ownerUid || `existing-${newBoutique.ownerEmail.replace(/[^a-z0-9]/g, '')}`;
    } else if (isConfigured && newBoutique.ownerEmail && password) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, newBoutique.ownerEmail, password);
        ownerUid = userCredential.user.uid;
      } catch (err) {
        console.error("Error creating auth user during admin shop creation:", err);
        if (err.code === 'auth/email-already-in-use') {
          ownerUid = `existing-${newBoutique.ownerEmail.replace(/[^a-z0-9]/g, '')}`;
        }
      }
    } else if (newBoutique.ownerEmail) {
      ownerUid = `simulated-${newBoutique.ownerEmail.replace(/[^a-z0-9]/g, '')}`;
    }

    const boutique = {
      id: `boutique-${Date.now()}`,
      slug: newBoutique.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      devise: 'FCFA',
      couleurMarque: '#2563eb',
      couleurMarqueHover: '#1d4ed8',
      zonesLivraison: [
        { id: 'z1', label: 'Dakar Centre', price: 1500, delai: 'Sous 24h' },
        { id: 'z2', label: 'Banlieue Dakar', price: 2500, delai: 'Sous 48h' },
        { id: 'z3', label: 'Régions du Sénégal', price: 5000, delai: '3 à 5 jours' }
      ],
      abonnement: {
        plan: 'Découverte',
        statut: 'Actif',
        dateDebut: new Date().toISOString(),
        dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      ...newBoutique,
      ownerUid
    };

    setBoutiques(prev => [...prev, boutique]);

    if (isConfigured) {
      await setDoc(doc(db, 'boutiques', boutique.id), boutique);
    }
    return boutique;
  };

  // Copie le catalogue d'une boutique vers une autre (boutiques sœurs d'un même
  // marchand : mêmes produits, stocks et prix gérés ensuite séparément).
  const copyProductsToBoutique = async (fromBoutiqueId, toBoutiqueId) => {
    if (!isConfigured) {
      const src = products.filter(p => p.boutiqueId === fromBoutiqueId);
      const copies = src.map((p, i) => ({ ...p, id: `prod-${Date.now() + i}`, boutiqueId: toBoutiqueId }));
      setProducts(prev => [...copies, ...prev]);
      return copies.length;
    }
    const snap = await getDocs(query(collection(db, 'products'), where('boutiqueId', '==', fromBoutiqueId)));
    let i = 0;
    for (const d of snap.docs) {
      const data = d.data();
      const id = `prod-${Date.now() + i++}`;
      await setDoc(doc(db, 'products', id), { ...data, id, boutiqueId: toBoutiqueId });
    }
    return snap.docs.length;
  };

  const addProduct = async (boutiqueId, productData) => {
    const newProduct = {
      id: `prod-${Date.now()}`,
      boutiqueId,
      actif: true,
      ...productData,
      price: Number(productData.price) || 0,
      stock: Number(productData.stock) || 0
    };
    // Mise à jour optimiste immédiate
    setProducts(prev => [newProduct, ...prev]);

    if (isConfigured) {
      try {
        await setDoc(doc(db, 'products', newProduct.id), newProduct);
      } catch (err) {
        // Annuler la mise à jour optimiste si l'écriture échoue
        setProducts(prev => prev.filter(p => p.id !== newProduct.id));
        console.error("Erreur ajout produit Firestore:", err);
        throw err;
      }
    }
    return newProduct;
  };

  const updateProduct = async (productId, updatedFields) => {
    const changes = {
      ...updatedFields,
      price: updatedFields.price !== undefined ? Number(updatedFields.price) : undefined,
      stock: updatedFields.stock !== undefined ? Number(updatedFields.stock) : undefined
    };
    Object.keys(changes).forEach(key => changes[key] === undefined && delete changes[key]);

    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...changes } : p));

    if (isConfigured) {
      try {
        await updateDoc(doc(db, 'products', productId), changes);
      } catch (err) {
        console.error("Erreur mise à jour produit Firestore:", err);
        throw err;
      }
    }
  };

  const deleteProduct = async (productId) => {
    setProducts(prev => prev.filter(p => p.id !== productId));

    if (isConfigured) {
      try {
        await deleteDoc(doc(db, 'products', productId));
      } catch (err) {
        console.error("Erreur suppression produit Firestore:", err);
        throw err;
      }
    }
  };

  const deleteBoutique = async (boutiqueId) => {
    setBoutiques(prev => prev.filter(b => b.id !== boutiqueId));
    setProducts(prev => prev.filter(p => p.boutiqueId !== boutiqueId));
    setOrders(prev => prev.filter(o => o.boutiqueId !== boutiqueId));
    setTickets(prev => prev.filter(t => t.boutiqueId !== boutiqueId));

    if (isConfigured) {
      try {
        await deleteDoc(doc(db, 'boutiques', boutiqueId));
        // Cascade : purge aussi les produits, commandes et tickets de la boutique
        // (sinon ils restent orphelins dans Firestore pour toujours).
        for (const colName of ['products', 'orders', 'tickets']) {
          const snap = await getDocs(query(collection(db, colName), where('boutiqueId', '==', boutiqueId)));
          await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        }
      } catch (err) {
        console.error('Error deleting boutique from Firestore:', err);
      }
    }
  };

  // Maintenance (admin) : supprime de Firestore les produits / commandes / tickets /
  // demandes dont la boutique n'existe plus (orphelins laissés par d'anciennes
  // suppressions sans cascade). Renvoie un bilan { scanned, deleted }.
  const purgeOrphanData = async () => {
    if (!isConfigured) return { scanned: 0, deleted: 0 };
    const shopsSnap = await getDocs(collection(db, 'boutiques'));
    const validIds = new Set(shopsSnap.docs.map(d => d.id));
    let scanned = 0, deleted = 0;
    for (const colName of ['products', 'orders', 'tickets', 'upgradeRequests']) {
      const snap = await getDocs(collection(db, colName));
      scanned += snap.docs.length;
      const orphans = snap.docs.filter(d => {
        const bid = (d.data() || {}).boutiqueId;
        return bid && !validIds.has(bid);
      });
      await Promise.all(orphans.map(d => deleteDoc(d.ref)));
      deleted += orphans.length;
    }
    // Rafraîchit l'état local (retire les éventuels orphelins encore en mémoire)
    setProducts(prev => prev.filter(p => !p.boutiqueId || validIds.has(p.boutiqueId)));
    setOrders(prev => prev.filter(o => !o.boutiqueId || validIds.has(o.boutiqueId)));
    setTickets(prev => prev.filter(t => !t.boutiqueId || validIds.has(t.boutiqueId)));
    return { scanned, deleted };
  };

  // Applique un delta de stock à un produit (variante ou global). delta négatif = déduction.
  // qtyByVariant : map variantId -> delta. globalDelta : pour produits sans variante.
  const applyStockDelta = (product, qtyByVariant, globalDelta) => {
    const hasVar = product.variantes && product.variantes.length > 0;
    if (hasVar) {
      const newVariantes = product.variantes.map(v => {
        const d = qtyByVariant[v.id] || 0;
        if (d === 0) return v;
        return { ...v, stock: Math.max(0, (Number(v.stock) || 0) + d) };
      });
      const newStock = newVariantes.reduce((s, v) => s + (Number(v.stock) || 0), 0);
      if (isConfigured) {
        updateDoc(doc(db, 'products', product.id), { variantes: newVariantes, stock: newStock })
          .catch(err => console.error("stock variante:", err));
      }
      return { ...product, variantes: newVariantes, stock: newStock };
    } else {
      const newStock = Math.max(0, (Number(product.stock) || 0) + globalDelta);
      if (isConfigured) {
        updateDoc(doc(db, 'products', product.id), { stock: newStock })
          .catch(err => console.error("stock produit:", err));
      }
      return { ...product, stock: newStock };
    }
  };

  // Écrit/maj une commande dans Firestore en SURFAÇANT les vrais échecs.
  // Hors-ligne, Firestore met la requête en file et la synchronise tout seul au
  // retour du réseau (la promesse ne rejette pas) → aucun toast inutile. Un rejet
  // = échec permanent (ex. permission). On retente 1 fois, puis on alerte
  // l'utilisateur : fini la commande « perdue en silence ».
  const persistOrderWrite = (writeFn, label) => {
    const attempt = (retriesLeft) => {
      writeFn().catch((err) => {
        console.error(label, err);
        if (retriesLeft > 0) { setTimeout(() => attempt(retriesLeft - 1), 1500); return; }
        toast("⚠️ La commande n'a pas pu être enregistrée en ligne. Vérifiez votre connexion, puis réessayez.", 'error', 8000);
      });
    };
    attempt(1);
  };

  const createOrder = (boutiqueId, clientInfo, cartItems, shippingCost, shippingLieu, paiementInfo = null, remiseInfo = null) => {
    // sous-total NET = après remises par ligne ; puis on retire la remise globale.
    const subtotal = cartNet(cartItems);
    const remiseMontant = remiseInfo?.montant || 0;
    const total = Math.max(0, subtotal - remiseMontant) + shippingCost;

    const newOrder = {
      // Id unique : horodatage (base36) + suffixe aléatoire → pas de collision
      // entre boutiques ni en cas de commandes simultanées (l'ancien cmd-XXXX
      // n'avait que 9000 valeurs et pouvait écraser une commande existante).
      id: `cmd-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      boutiqueId,
      date: new Date().toISOString(),
      client: clientInfo,
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        variantId: item.variantId || null,
        variantNom: item.variantNom || null,
        remise: item.remise || null
      })),
      total,
      remise: remiseInfo || null,
      statut: 'Reçue',
      livraison: { frais: shippingCost, lieu: shippingLieu },
      paiement: paiementInfo || { methode: 'À la livraison', statut: 'En attente' }
    };

    // Déduction du stock (variante ou global), en agrégeant toutes les lignes par produit
    setProducts(prevProducts => prevProducts.map(p => {
      const lines = cartItems.filter(it => it.id === p.id);
      if (lines.length === 0) return p;
      const qtyByVariant = {};
      let globalDelta = 0;
      lines.forEach(it => {
        if (it.variantId) qtyByVariant[it.variantId] = (qtyByVariant[it.variantId] || 0) - it.quantity;
        else globalDelta -= it.quantity;
      });
      return applyStockDelta(p, qtyByVariant, globalDelta);
    }));

    setOrders(prev => [newOrder, ...prev]);
    if (isConfigured) {
      persistOrderWrite(() => setDoc(doc(db, 'orders', newOrder.id), newOrder), 'Enregistrement commande');
    }
    return newOrder;
  };

  // Modifier une commande existante : ajuste le stock selon les écarts de quantité.
  // remiseInfo : remise globale ({type,valeur,montant}) ou null ; undefined = inchangée.
  const updateOrder = (orderId, newItems, remiseInfo) => {
    setOrders(prevOrders => {
      const oldOrder = prevOrders.find(o => o.id === orderId);
      if (!oldOrder) return prevOrders;

      // Calcul des deltas par (produit, variante)
      const keyOf = (it) => it.id + (it.variantId ? '__' + it.variantId : '');
      const deltas = {}; // key -> { productId, variantId, delta }
      const ensure = (it) => {
        const k = keyOf(it);
        if (!deltas[k]) deltas[k] = { productId: it.id, variantId: it.variantId || null, delta: 0 };
        return deltas[k];
      };
      oldOrder.items.forEach(it => { ensure(it).delta += it.quantity; });   // on rend l'ancien
      newItems.forEach(it => { ensure(it).delta -= it.quantity; });         // on déduit le nouveau

      // Appliquer aux produits
      setProducts(prevProducts => prevProducts.map(p => {
        const rel = Object.values(deltas).filter(d => d.productId === p.id && d.delta !== 0);
        if (rel.length === 0) return p;
        const qtyByVariant = {};
        let globalDelta = 0;
        rel.forEach(d => {
          if (d.variantId) qtyByVariant[d.variantId] = (qtyByVariant[d.variantId] || 0) + d.delta;
          else globalDelta += d.delta;
        });
        return applyStockDelta(p, qtyByVariant, globalDelta);
      }));

      const subtotal = cartNet(newItems); // net des remises par ligne
      const newRemise = remiseInfo !== undefined ? (remiseInfo || null) : (oldOrder.remise || null);
      const remiseMontant = newRemise?.montant || 0;
      const total = Math.max(0, subtotal - remiseMontant) + (oldOrder.livraison?.frais || 0);
      const updatedOrder = { ...oldOrder, items: newItems, total, remise: newRemise };

      if (isConfigured) {
        persistOrderWrite(() => updateDoc(doc(db, 'orders', orderId), { items: newItems, total, remise: newRemise }), 'Mise à jour commande');
      }
      return prevOrders.map(o => o.id === orderId ? updatedOrder : o);
    });
  };

  // Annuler une commande : restaure le stock des articles et marque "Annulée"
  const cancelOrder = (orderId) => {
    setOrders(prevOrders => {
      const order = prevOrders.find(o => o.id === orderId);
      if (!order || order.statut === 'Annulée') return prevOrders;

      // Restaurer le stock (delta positif par produit/variante)
      setProducts(prevProducts => prevProducts.map(p => {
        const lines = order.items.filter(it => it.id === p.id);
        if (lines.length === 0) return p;
        const qtyByVariant = {};
        let globalDelta = 0;
        lines.forEach(it => {
          if (it.variantId) qtyByVariant[it.variantId] = (qtyByVariant[it.variantId] || 0) + it.quantity;
          else globalDelta += it.quantity;
        });
        return applyStockDelta(p, qtyByVariant, globalDelta);
      }));

      if (isConfigured) {
        persistOrderWrite(() => updateDoc(doc(db, 'orders', orderId), { statut: 'Annulée' }), 'Annulation commande');
      }
      return prevOrders.map(o => o.id === orderId ? { ...o, statut: 'Annulée' } : o);
    });
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const paymentStatut = newStatus === 'Payée' ? 'Payé' : (o.paiement?.statut || 'En attente');
        const updated = { 
          ...o, 
          statut: newStatus,
          paiement: { ...(o.paiement || { methode: 'À la livraison' }), statut: paymentStatut }
        };
        
        if (isConfigured) {
          persistOrderWrite(() => updateDoc(doc(db, 'orders', orderId), {
            statut: newStatus,
            'paiement.statut': paymentStatut
          }), 'Changement de statut');
        }
        return updated;
      }
      return o;
    }));
  };

  const updateOrderPaymentStatus = (orderId, paymentStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = { 
          ...o, 
          paiement: { ...(o.paiement || { methode: 'À la livraison' }), statut: paymentStatus }
        };
        
        if (isConfigured) {
          persistOrderWrite(() => updateDoc(doc(db, 'orders', orderId), {
            'paiement.statut': paymentStatus
          }), 'Encaissement');
        }
        return updated;
      }
      return o;
    }));
  };

  const updateOrderPaymentDetails = (orderId, paymentFields) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = { 
          ...o, 
          paiement: { ...(o.paiement || {}), ...paymentFields }
        };
        
        if (isConfigured) {
          updateDoc(doc(db, 'orders', orderId), { 
            paiement: updated.paiement 
          }).catch(err => console.error("Error updating payment details in Firestore:", err));
        }
        return updated;
      }
      return o;
    }));
  };

  // newTelephone (optionnel) : change aussi le numéro du client sur toutes ses commandes
  const updateClientOrdersInfo = (telephone, nom, adresse, newTelephone = null) => {
    const telFinal = (newTelephone || telephone).trim();
    setOrders(prev => prev.map(o => {
      if (o.client?.telephone === telephone) {
        const updated = {
          ...o,
          client: { ...o.client, nom, adresse, telephone: telFinal }
        };

        if (isConfigured) {
          updateDoc(doc(db, 'orders', o.id), {
            'client.nom': nom,
            'client.adresse': adresse,
            'client.telephone': telFinal
          }).catch(err => console.error("Error updating client info in Firestore order:", err));
        }
        return updated;
      }
      return o;
    }));
  };

  const getBoutiqueBySlug = (slug) => {
    if (!slug) return null;
    const q = String(slug).toLowerCase().trim();
    // 1) Correspondance exacte (cas normal)
    const exact = boutiques.find(b => b.slug && b.slug.toLowerCase() === q);
    if (exact) return exact;
    // 2) Lien obsolète (boutique renommée → slug rallongé/raccourci) :
    //    on accepte si le slug demandé est le préfixe d'UN SEUL slug existant,
    //    ou inversement. Unicité exigée pour éviter toute confusion.
    const fuzzy = boutiques.filter(b => {
      const s = (b.slug || '').toLowerCase();
      return s && s.length >= 4 && q.length >= 4 && (s.startsWith(q) || q.startsWith(s));
    });
    return fuzzy.length === 1 ? fuzzy[0] : null;
  };

  const getBoutiqueById = (id) => {
    return boutiques.find(b => b.id === id) || null;
  };

  const getProductsByBoutique = useCallback((boutiqueId) => {
    return products.filter(p => p.boutiqueId === boutiqueId);
  }, [products]);

  const getOrdersByBoutique = useCallback((boutiqueId) => {
    return orders.filter(o => o.boutiqueId === boutiqueId);
  }, [orders]);

  /** Upload un logo de boutique vers Firebase Storage et retourne l'URL publique.
   *  Fallback automatique en base64 si Storage n'est pas configuré. */
  const uploadProductPhoto = async (boutiqueId, file) => {
    if (storage && isConfigured) {
      const storageRef = ref(storage, `products/${boutiqueId}/${Date.now()}_${file.name}`);
      const snap = await uploadBytes(storageRef, file);
      return getDownloadURL(snap.ref);
    }
    // Mode local : base64 (limité à 500 Ko)
    return new Promise((resolve, reject) => {
      if (file.size > 500 * 1024) {
        reject(new Error("En mode local, la photo doit faire moins de 500 Ko."));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadBoutiqueLogo = async (boutiqueId, file) => {
    if (storage && isConfigured) {
      const storageRef = ref(storage, `logos/${boutiqueId}/${Date.now()}_${file.name}`);
      const snap = await uploadBytes(storageRef, file);
      return getDownloadURL(snap.ref);
    }
    // Mode local : base64
    return new Promise((resolve, reject) => {
      if (file.size > 500 * 1024) {
        reject(new Error("En mode local, le logo doit faire moins de 500 Ko."));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addTicket = (boutiqueId, ticketData) => {
    const newTicket = {
      id: `ticket-${Date.now()}`,
      boutiqueId,
      statut: 'En attente',
      date: new Date().toISOString(),
      ...ticketData
    };
    setTickets(prev => [newTicket, ...prev]);
    
    if (isConfigured) {
      setDoc(doc(db, 'tickets', newTicket.id), newTicket)
        .catch(err => console.error("Error adding ticket to Firestore:", err));
    }
    return newTicket;
  };

  const resolveTicket = (ticketId) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        if (isConfigured) {
          updateDoc(doc(db, 'tickets', ticketId), { statut: 'Résolu' })
            .catch(err => console.error("Error resolving ticket in Firestore:", err));
        }
        return { ...t, statut: 'Résolu' };
      }
      return t;
    }));
  };

  const replyToTicket = (ticketId, reponseText) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        if (isConfigured) {
          updateDoc(doc(db, 'tickets', ticketId), { reponse: reponseText, statut: 'En cours' })
            .catch(err => console.error("Error replying to ticket in Firestore:", err));
        }
        return { ...t, reponse: reponseText, statut: 'En cours' };
      }
      return t;
    }));
  };

  const createUpgradeRequest = (boutiqueId, planName, paymentMethod, phoneNumber) => {
    const newRequest = {
      id: `req-${Date.now()}`,
      boutiqueId,
      planName,
      paymentMethod,
      phoneNumber,
      statut: 'En attente',
      date: new Date().toISOString()
    };
    setUpgradeRequests(prev => [newRequest, ...prev]);
    
    if (isConfigured) {
      setDoc(doc(db, 'upgradeRequests', newRequest.id), newRequest)
        .catch(err => console.error("Error writing upgrade request to Firestore:", err));
    }
    return newRequest;
  };

  const approveUpgradeRequest = (requestId) => {
    let targetBoutiqueId = null;
    let targetPlan = 'Pro';
    
    setUpgradeRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        targetBoutiqueId = req.boutiqueId;
        targetPlan = req.planName;
        
        if (isConfigured) {
          updateDoc(doc(db, 'upgradeRequests', requestId), { statut: 'Validé' })
            .catch(err => console.error("Error validating upgrade request in Firestore:", err));
        }
        return { ...req, statut: 'Validé' };
      }
      return req;
    }));
    
    if (targetBoutiqueId) {
      updateBoutique(targetBoutiqueId, {
        abonnement: {
          plan: targetPlan,
          statut: 'Actif',
          dateDebut: new Date().toISOString(),
          dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    }
  };

  const rejectUpgradeRequest = (requestId) => {
    setUpgradeRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        if (isConfigured) {
          updateDoc(doc(db, 'upgradeRequests', requestId), { statut: 'Rejeté' })
            .catch(err => console.error("Error rejecting upgrade request in Firestore:", err));
        }
        return { ...req, statut: 'Rejeté' };
      }
      return req;
    }));
  };

  const resetMerchantPassword = async (email) => {
    if (!isConfigured) {
      throw new Error("La réinitialisation par email n'est disponible qu'en mode cloud Firebase.");
    }
    await sendPasswordResetEmail(auth, email);
  };

  const loginMerchant = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    if (isConfigured) {
      // Marchands ET caissiers sont de VRAIS comptes Firebase Auth :
      // connexion d'abord, puis détection du rôle (requête authentifiée).
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;
      let cashier = null;
      try {
        const snap = await getDocs(query(collection(db, 'caissiers'), where('email', '==', cleanEmail)));
        if (snap.docs.length > 0) cashier = snap.docs[0].data();
      } catch { /* marchand normal */ }
      const loggedUser = {
        uid: user.uid,
        email: user.email,
        displayName: cashier?.nom || user.displayName || user.email.split('@')[0],
        ...(cashier ? { role: 'caissier', boutiqueId: cashier.boutiqueId } : {})
      };
      setMerchantUser(loggedUser);
      if (cashier?.boutiqueId) setCurrentMerchantBoutiqueId(cashier.boutiqueId);
      return loggedUser;
    }

    // Mode démo local : caissier simulé (localStorage), sinon marchand simulé
    const cashierDoc = caissiers.find(c => c.email.trim().toLowerCase() === cleanEmail);
    if (cashierDoc) {
      if (cashierDoc.password !== password) throw new Error('Mot de passe caissier incorrect.');
      const loggedUser = {
        uid: cashierDoc.id, email: cashierDoc.email, displayName: cashierDoc.nom,
        role: 'caissier', boutiqueId: cashierDoc.boutiqueId
      };
      setMerchantUser(loggedUser);
      setCurrentMerchantBoutiqueId(cashierDoc.boutiqueId);
      return loggedUser;
    }
    const loggedUser = {
      uid: `simulated-${email.replace(/[^a-z0-9]/g, '')}`,
      email: email,
      displayName: email.split('@')[0]
    };
    setMerchantUser(loggedUser);
    return loggedUser;
  };

  const signupMerchant = async (email, password, boutiqueName, whatsapp) => {
    let cleanWhatsapp = whatsapp.trim();
    if (!cleanWhatsapp.startsWith('+')) {
      if (cleanWhatsapp.startsWith('221')) {
        cleanWhatsapp = '+' + cleanWhatsapp;
      } else {
        cleanWhatsapp = '+221' + cleanWhatsapp;
      }
    }

    // Bloque les comptes en double (même e-mail ou même numéro WhatsApp)
    assertNoDuplicateBoutique({ email, whatsapp: cleanWhatsapp });

    let newUser;
    if (isConfigured) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      newUser = {
        uid: user.uid,
        email: user.email,
        displayName: boutiqueName
      };
    } else {
      newUser = {
        uid: `simulated-${email.replace(/[^a-z0-9]/g, '')}`,
        email: email,
        displayName: boutiqueName
      };
    }

    // Create boutique and link to this user
    const newBoutique = {
      id: `boutique-${Date.now()}`,
      slug: boutiqueName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name: boutiqueName,
      whatsapp: cleanWhatsapp,
      ownerEmail: email,
      ownerUid: newUser.uid,
      logo: '🛍️',
      description: `Boutique en ligne ${boutiqueName} propulsée par Jappandal Tech.`,
      couleurMarque: '#2563eb',
      couleurMarqueHover: '#1d4ed8',
      devise: 'FCFA',
      zonesLivraison: [
        { id: 'z1', label: 'Dakar Centre', price: 1500 },
        { id: 'z2', label: 'Banlieue Dakar', price: 2500 },
        { id: 'z3', label: 'Régions du Sénégal', price: 5000 }
      ],
      abonnement: {
        plan: 'Découverte',
        statut: 'Actif',
        dateDebut: new Date().toISOString(),
        dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    };

    setBoutiques(prev => [...prev, newBoutique]);
    setCurrentMerchantBoutiqueId(newBoutique.id);
    setMerchantUser(newUser);

    if (isConfigured) {
      await setDoc(doc(db, 'boutiques', newBoutique.id), newBoutique);
    }

    return { user: newUser, boutique: newBoutique };
  };

  const logoutMerchant = async () => {
    if (isConfigured) {
      await signOut(auth);
    }
    setMerchantUser(null);
    setOrders([]);
    setTickets([]);
    setUpgradeRequests([]);
    setCaissiers([]);
    setDepenses([]);
    localStorage.removeItem('ks_merchant_user');
  };

  return (
    <TenantContext.Provider value={{
      boutiques,
      products,
      orders,
      tickets,
      currentMerchantBoutiqueId,
      setCurrentMerchantBoutiqueId,
      merchantUser,
      authReady,
      dataReady,
      activeStorefrontBoutiqueId,
      setActiveStorefrontBoutiqueId,
      loginMerchant,
      signupMerchant,
      resetMerchantPassword,
      logoutMerchant,
      addBoutique,
      addBoutiqueWithAuth,
      copyProductsToBoutique,
      updateBoutique,
      deleteBoutique,
      purgeOrphanData,
      addProduct,
      updateProduct,
      deleteProduct,
      createOrder,
      updateOrder,
      cancelOrder,
      updateOrderStatus,
      updateOrderPaymentStatus,
      updateOrderPaymentDetails,
      updateClientOrdersInfo,
      addTicket,
      resolveTicket,
      replyToTicket,
      getBoutiqueBySlug,
      getBoutiqueById,
      getProductsByBoutique,
      getOrdersByBoutique,
      uploadProductPhoto,
      uploadBoutiqueLogo,
      upgradeRequests,
      createUpgradeRequest,
      approveUpgradeRequest,
      rejectUpgradeRequest,
      caissiers,
      depenses,
      addCaissier: async (caissier) => {
        const b = boutiques.find(x => x.id === caissier.boutiqueId);
        const plan = b?.abonnement?.plan || 'Découverte';
        const activeCount = caissiers.filter(c => c.boutiqueId === caissier.boutiqueId).length;
        if (plan === 'Découverte') {
          throw new Error("Le forfait Découverte ne permet pas d'ajouter des caissiers.");
        }
        if ((plan === 'Pro' || plan === 'SaaS Pro') && activeCount >= 1) {
          throw new Error("Le forfait SaaS Pro est limité à un seul caissier. Veuillez passer au forfait Premium VIP pour ajouter plusieurs caissiers.");
        }
        const cleanEmail = caissier.email.trim().toLowerCase();
        const emailDup = caissiers.find(c => c.email.trim().toLowerCase() === cleanEmail);
        if (emailDup) {
          throw new Error("Cette adresse e-mail est déjà attribuée à un caissier.");
        }
        if ((caissier.password || '').length < 6) {
          throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
        }

        // VRAI compte Firebase Auth, créé via une app secondaire pour ne pas
        // déconnecter le marchand. Le mot de passe n'est JAMAIS stocké en base.
        let uid = `caissier-${Date.now()}`;
        if (isConfigured) {
          const secApp = initializeApp(app.options, `caissier-${Date.now()}`);
          try {
            const secAuth = getAuth(secApp);
            try {
              const cred = await createUserWithEmailAndPassword(secAuth, cleanEmail, caissier.password);
              uid = cred.user.uid;
            } catch (err) {
              if (err.code === 'auth/email-already-in-use') {
                // Compte déjà créé (ex. tentative précédente interrompue) : si le
                // mot de passe fourni est le bon, on RÉCUPÈRE le compte et on le lie.
                try {
                  const cred = await signInWithEmailAndPassword(secAuth, cleanEmail, caissier.password);
                  uid = cred.user.uid;
                } catch {
                  throw new Error('Cet e-mail est déjà utilisé par un autre compte. (Si c’est un caissier créé précédemment, ressaisis exactement le même mot de passe pour le récupérer.)');
                }
              } else if (err.code === 'auth/weak-password') {
                throw new Error('Mot de passe trop faible (6 caractères minimum).', { cause: err });
              } else if (err.code === 'auth/invalid-email') {
                throw new Error('Adresse e-mail invalide.', { cause: err });
              } else {
                throw err;
              }
            }
            await signOut(secAuth);
          } finally {
            deleteApp(secApp).catch(() => {});
          }
        }

        const newCaissier = {
          id: uid,
          nom: caissier.nom,
          email: cleanEmail,
          boutiqueId: caissier.boutiqueId,
          dateCreation: new Date().toISOString(),
          // mode démo local uniquement : mot de passe simulé (jamais en production)
          ...(isConfigured ? {} : { password: caissier.password })
        };
        if (isConfigured) {
          try {
            await setDoc(doc(db, 'caissiers', newCaissier.id), newCaissier);
          } catch (err) {
            if (err.code === 'permission-denied') {
              throw new Error('Enregistrement refusé par la base : les règles Firestore doivent être republiées (fichier firestore.rules → Console Firebase → Règles → Publier).', { cause: err });
            }
            throw err;
          }
        }
        setCaissiers(prev => [newCaissier, ...prev]);
        return newCaissier;
      },
      deleteCaissier: async (caissierId) => {
        setCaissiers(prev => prev.filter(c => c.id !== caissierId));
        if (isConfigured) {
          await deleteDoc(doc(db, 'caissiers', caissierId));
        }
      },
      addDepense: async (depense) => {
        const b = boutiques.find(x => x.id === depense.boutiqueId);
        const plan = b?.abonnement?.plan || 'Découverte';
        if (plan !== 'Premium' && plan !== 'Premium VIP') {
          throw new Error("La gestion des dépenses est réservée aux boutiques Premium VIP.");
        }
        const newDepense = {
          id: `depense-${Date.now()}`,
          ...depense,
          dateCreation: new Date().toISOString()
        };
        setDepenses(prev => [newDepense, ...prev]);
        if (isConfigured) {
          await setDoc(doc(db, 'depenses', newDepense.id), newDepense);
        }
        return newDepense;
      },
      deleteDepense: async (depenseId) => {
        setDepenses(prev => prev.filter(d => d.id !== depenseId));
        if (isConfigured) {
          await deleteDoc(doc(db, 'depenses', depenseId));
        }
      }
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

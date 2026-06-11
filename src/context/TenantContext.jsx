/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, auth, storage, isConfigured } from '../firebase/config';
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
  onAuthStateChanged
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMerchantUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0]
        });
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

    unsubs.push(onSnapshot(collection(db, 'orders'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setOrders(data);
    }, err => console.error('orders listener:', err)));

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

  // Actions
  const updateBoutique = (boutiqueId, updatedFields) => {
    setBoutiques(prev => prev.map(b => b.id === boutiqueId ? { ...b, ...updatedFields } : b));
    if (isConfigured) {
      updateDoc(doc(db, 'boutiques', boutiqueId), updatedFields)
        .catch(err => console.error("Error updating boutique in Firestore:", err));
    }
  };

  const addBoutique = (newBoutique) => {
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

  const addBoutiqueWithAuth = async (newBoutique, password) => {
    let ownerUid = `admin-created-${Date.now()}`;
    
    if (isConfigured && newBoutique.ownerEmail && password) {
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

  const createOrder = (boutiqueId, clientInfo, cartItems, shippingCost, shippingLieu, paiementInfo = null) => {
    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = subtotal + shippingCost;

    const newOrder = {
      id: `cmd-${Math.floor(1000 + Math.random() * 9000)}`,
      boutiqueId,
      date: new Date().toISOString(),
      client: clientInfo,
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        variantId: item.variantId || null,
        variantNom: item.variantNom || null
      })),
      total,
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
      setDoc(doc(db, 'orders', newOrder.id), newOrder)
        .catch(err => console.error("Error writing order to Firestore:", err));
    }
    return newOrder;
  };

  // Modifier une commande existante : ajuste le stock selon les écarts de quantité
  const updateOrder = (orderId, newItems) => {
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

      const subtotal = newItems.reduce((s, it) => s + it.price * it.quantity, 0);
      const total = subtotal + (oldOrder.livraison?.frais || 0);
      const updatedOrder = { ...oldOrder, items: newItems, total };

      if (isConfigured) {
        updateDoc(doc(db, 'orders', orderId), { items: newItems, total })
          .catch(err => console.error("update order:", err));
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
        updateDoc(doc(db, 'orders', orderId), { statut: 'Annulée' })
          .catch(err => console.error("cancel order:", err));
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
          updateDoc(doc(db, 'orders', orderId), { 
            statut: newStatus,
            'paiement.statut': paymentStatut 
          }).catch(err => console.error("Error updating order status in Firestore:", err));
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
          updateDoc(doc(db, 'orders', orderId), { 
            'paiement.statut': paymentStatus 
          }).catch(err => console.error("Error updating payment status in Firestore:", err));
        }
        return updated;
      }
      return o;
    }));
  };

  const updateClientOrdersInfo = (telephone, nom, adresse) => {
    setOrders(prev => prev.map(o => {
      if (o.client?.telephone === telephone) {
        const updated = { 
          ...o, 
          client: { ...o.client, nom, adresse }
        };
        
        if (isConfigured) {
          updateDoc(doc(db, 'orders', o.id), { 
            'client.nom': nom,
            'client.adresse': adresse
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
    if (isConfigured) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const loggedUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0]
      };
      setMerchantUser(loggedUser);
      return loggedUser;
    } else {
      // Simulation mode
      const loggedUser = {
        uid: `simulated-${email.replace(/[^a-z0-9]/g, '')}`,
        email: email,
        displayName: email.split('@')[0]
      };
      setMerchantUser(loggedUser);
      return loggedUser;
    }
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
      rejectUpgradeRequest
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

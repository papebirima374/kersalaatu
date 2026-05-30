import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, auth, storage, isConfigured } from '../firebase/config';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query
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

// Seed data to make the app gorgeous and usable instantly
const DEFAULT_BOUTIQUES = [
  {
    id: 'darou-khoudoss-optique',
    slug: 'daroukhoudoss',
    name: 'Darou Khaudoss Optique',
    description: 'Darou Khaudoss Optique est une boutique spécialisée dans la vente de lunettes et accessoires de qualité. Nous mettons à votre disposition des modèles modernes, élégants et adaptés à tous les styles.',
    logo: '/logo-darou.jpg',
    whatsapp: '+221765167094',
    couleurMarque: '#b45309',
    couleurMarqueHover: '#92400e',
    devise: 'FCFA',
    adresse: 'Touba Marché Ocasse',
    zonesLivraison: [
      { id: 'z1', label: 'Touba (Livraison locale)', price: 1000, delai: 'Sous 24h' },
      { id: 'z2', label: 'Dakar (Livraison rapide)', price: 2000, delai: 'Sous 24h' },
      { id: 'z3', label: 'Autres Régions du Sénégal', price: 4000, delai: '2 à 3 jours' }
    ],
    abonnement: {
      plan: 'Premium',
      statut: 'Actif',
      dateDebut: new Date().toISOString(),
      dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
];

const DEFAULT_PRODUCTS = [
  {
    id: 'dko-p1',
    boutiqueId: 'darou-khoudoss-optique',
    name: 'Lunettes Médicales Anti-Lumière Bleue',
    price: 15000,
    stock: 10,
    category: 'Lunettes',
    photo: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600&auto=format&fit=crop&q=80',
    description: 'Monture moderne et légère avec verres traitants anti-lumière bleue pour protéger vos yeux des écrans.',
    actif: true
  },
  {
    id: 'dko-p2',
    boutiqueId: 'darou-khoudoss-optique',
    name: 'Lunettes de Soleil Vintage Gold',
    price: 25000,
    stock: 5,
    category: 'Lunettes',
    photo: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80',
    description: 'Lunettes de soleil élégantes avec monture dorée et protection UV400 pour un style affirmé.',
    actif: true
  },
  {
    id: 'dko-p3',
    boutiqueId: 'darou-khoudoss-optique',
    name: 'Montre Élégante Classique',
    price: 35000,
    stock: 8,
    category: 'Accessoires',
    photo: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&auto=format&fit=crop&q=80',
    description: 'Montre de luxe élégante avec bracelet en cuir et cadran épuré pour hommes et femmes.',
    actif: true
  }
];

const DEFAULT_ORDERS = [];
const DEFAULT_TICKETS = [];

export const TenantProvider = ({ children }) => {
  const [boutiques, setBoutiques] = useState(() => {
    const local = localStorage.getItem('ks_boutiques');
    return local ? JSON.parse(local) : DEFAULT_BOUTIQUES;
  });

  const [products, setProducts] = useState(() => {
    const local = localStorage.getItem('ks_products');
    return local ? JSON.parse(local) : DEFAULT_PRODUCTS;
  });

  const [orders, setOrders] = useState(() => {
    const local = localStorage.getItem('ks_orders');
    return local ? JSON.parse(local) : DEFAULT_ORDERS;
  });

  const [tickets, setTickets] = useState(() => {
    const local = localStorage.getItem('ks_tickets');
    return local ? JSON.parse(local) : DEFAULT_TICKETS;
  });

  const [upgradeRequests, setUpgradeRequests] = useState(() => {
    const local = localStorage.getItem('ks_upgrade_requests');
    return local ? JSON.parse(local) : [];
  });

  const [currentMerchantBoutiqueId, setCurrentMerchantBoutiqueId] = useState(() => {
    return localStorage.getItem('ks_current_merchant_id') || 'darou-khoudoss-optique';
  });

  const [merchantUser, setMerchantUser] = useState(() => {
    const local = localStorage.getItem('ks_merchant_user');
    return local ? JSON.parse(local) : null;
  });

  // true tant que Firebase n'a pas résolu l'état d'auth (évite la page blanche)
  const [authReady, setAuthReady] = useState(!isConfigured);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('ks_boutiques', JSON.stringify(boutiques));
  }, [boutiques]);

  useEffect(() => {
    localStorage.setItem('ks_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('ks_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('ks_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('ks_upgrade_requests', JSON.stringify(upgradeRequests));
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
      }
      // Firebase a résolu l'état d'auth — on peut maintenant afficher l'UI
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Listeners Firestore temps réel (onSnapshot) — remplace getDocs one-shot
  useEffect(() => {
    if (!isConfigured) return;

    const unsubs = [];

    // Boutiques
    unsubs.push(onSnapshot(collection(db, 'boutiques'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (data.length > 0) {
        setBoutiques(data);
      } else {
        DEFAULT_BOUTIQUES.forEach(b => setDoc(doc(db, 'boutiques', b.id), b).catch(() => {}));
        setBoutiques(DEFAULT_BOUTIQUES);
      }
    }, err => console.error('boutiques listener:', err)));

    // Products
    unsubs.push(onSnapshot(collection(db, 'products'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (data.length > 0) {
        setProducts(data);
      } else {
        DEFAULT_PRODUCTS.forEach(p => setDoc(doc(db, 'products', p.id), p).catch(() => {}));
        setProducts(DEFAULT_PRODUCTS);
      }
    }, err => console.error('products listener:', err)));

    // Orders
    unsubs.push(onSnapshot(collection(db, 'orders'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setOrders(data);
    }, err => console.error('orders listener:', err)));

    // Tickets
    unsubs.push(onSnapshot(collection(db, 'tickets'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTickets(data);
    }, err => console.error('tickets listener:', err)));

    // Upgrade requests
    unsubs.push(onSnapshot(collection(db, 'upgradeRequests'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setUpgradeRequests(data);
    }, err => console.error('upgradeRequests listener:', err)));

    console.log("🔥 Firestore listeners actifs (temps réel)");
    return () => unsubs.forEach(u => u());
  }, []);

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
      couleurMarque: '#0d9488',
      couleurMarqueHover: '#0f766e',
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
      couleurMarque: '#0d9488',
      couleurMarqueHover: '#0f766e',
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

  const addProduct = (boutiqueId, productData) => {
    const newProduct = {
      id: `prod-${Date.now()}`,
      boutiqueId,
      actif: true,
      ...productData,
      price: Number(productData.price) || 0,
      stock: Number(productData.stock) || 0
    };
    setProducts(prev => [newProduct, ...prev]);
    
    if (isConfigured) {
      setDoc(doc(db, 'products', newProduct.id), newProduct)
        .catch(err => console.error("Error adding product to Firestore:", err));
    }
    return newProduct;
  };

  const updateProduct = (productId, updatedFields) => {
    const changes = {
      ...updatedFields,
      price: updatedFields.price !== undefined ? Number(updatedFields.price) : undefined,
      stock: updatedFields.stock !== undefined ? Number(updatedFields.stock) : undefined
    };
    Object.keys(changes).forEach(key => changes[key] === undefined && delete changes[key]);

    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...changes } : p));
    
    if (isConfigured) {
      updateDoc(doc(db, 'products', productId), changes)
        .catch(err => console.error("Error updating product in Firestore:", err));
    }
  };

  const deleteProduct = (productId) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    
    if (isConfigured) {
      deleteDoc(doc(db, 'products', productId))
        .catch(err => console.error("Error deleting product from Firestore:", err));
    }
  };

  const deleteBoutique = (boutiqueId) => {
    setBoutiques(prev => prev.filter(b => b.id !== boutiqueId));
    setProducts(prev => prev.filter(p => p.boutiqueId !== boutiqueId));
    setOrders(prev => prev.filter(o => o.boutiqueId !== boutiqueId));
    setTickets(prev => prev.filter(t => t.boutiqueId !== boutiqueId));
    
    if (isConfigured) {
      deleteDoc(doc(db, 'boutiques', boutiqueId))
        .catch(err => console.error("Error deleting boutique from Firestore:", err));
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
        quantity: item.quantity
      })),
      total,
      statut: 'Reçue',
      livraison: {
        frais: shippingCost,
        lieu: shippingLieu
      },
      paiement: paiementInfo || { methode: 'À la livraison', statut: 'En attente' }
    };

    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const cartItem = cartItems.find(item => item.id === p.id);
        if (cartItem) {
          const newStock = Math.max(0, p.stock - cartItem.quantity);
          if (isConfigured) {
            updateDoc(doc(db, 'products', p.id), { stock: newStock })
              .catch(err => console.error("Error updating product stock in Firestore:", err));
          }
          return { ...p, stock: newStock };
        }
        return p;
      });
    });

    setOrders(prev => [newOrder, ...prev]);
    
    if (isConfigured) {
      setDoc(doc(db, 'orders', newOrder.id), newOrder)
        .catch(err => console.error("Error writing order to Firestore:", err));
    }
    return newOrder;
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

  const getBoutiqueBySlug = (slug) => {
    return boutiques.find(b => b.slug.toLowerCase() === slug.toLowerCase()) || null;
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
      description: `Boutique en ligne ${boutiqueName} propulsée par Kër Salaatu Tech.`,
      couleurMarque: '#0d9488',
      couleurMarqueHover: '#0f766e',
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
      loginMerchant,
      signupMerchant,
      resetMerchantPassword,
      logoutMerchant,
      addBoutique,
      addBoutiqueWithAuth,
      updateBoutique,
      deleteBoutique,
      addProduct,
      updateProduct,
      deleteProduct,
      createOrder,
      updateOrderStatus,
      updateOrderPaymentStatus,
      addTicket,
      resolveTicket,
      replyToTicket,
      getBoutiqueBySlug,
      getBoutiqueById,
      getProductsByBoutique,
      getOrdersByBoutique,
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

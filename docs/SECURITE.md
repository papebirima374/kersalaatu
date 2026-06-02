# 🔐 Sécurité — Jappandal Tech

> État au 2026-06-02. Ce document décrit les risques de sécurité actuels et le plan
> pour les corriger **sans casser l'application**. Rien ici n'est encore appliqué en prod.

## 1. Constat

L'app fonctionne aujourd'hui en « accès large » :

1. **Mot de passe admin côté client.** `/admin` est protégé par un mot de passe vérifié
   **dans le navigateur** (`DeveloperConsole.jsx`), avec une valeur par défaut
   `ks-admin-2025` **lisible dans le code livré**. → N'importe qui peut entrer dans l'admin.
2. **Écritures Firestore non authentifiées.** Plusieurs flux écrivent en base **sans compte** :
   - création de boutique depuis la landing (`addBoutique`),
   - actions admin (suspendre, valider un paiement, changer un plan),
   - création de commandes par les clients (normal, eux n'ont pas de compte).
3. **Règles Firestore probablement en « mode test »** (lecture/écriture ouvertes).

Tant que ces points ne sont pas traités, **n'importe qui peut lire/modifier la base**.
Pour des **tests avec quelques clients de confiance**, c'est acceptable. Avant une
**ouverture publique large**, il faut corriger.

## 2. Action immédiate, sans risque (à faire maintenant)

**Changer le secret admin via une variable d'environnement Vercel** (le code la lit déjà —
`VITE_ADMIN_SECRET`, cf. `getStoredAdminPassword()`), ce qui remplace le défaut public :

1. Vercel → projet `jappandal-tech` → **Settings → Environment Variables**
2. Ajouter `VITE_ADMIN_SECRET` = `<un secret fort à toi>` (Production)
3. Redéployer.

→ Le mot de passe `ks-admin-2025` n'ouvre alors plus l'admin.

## 3. Correctif complet (avant lancement public)

Le blocage : l'admin et la création de boutique écrivent **sans être authentifiés**.
Il faut donc d'abord **authentifier ces écritures**, puis verrouiller les règles.

### Étapes
1. **Admin = vrai compte Firebase Auth** avec un *custom claim* `admin: true`
   (créé via le SDK Admin / une Cloud Function), au lieu du mot de passe en dur.
2. **Création de boutique** : la faire passer par un utilisateur authentifié
   (le marchand crée son compte d'abord, puis sa boutique).
3. **Déployer les règles ci-dessous** (Firebase Console → Firestore → Règles, ou
   `firebase deploy --only firestore:rules`).

### Règles cibles (à déployer APRÈS les étapes 1–2 — sinon l'admin et la création cassent)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth()  { return request.auth != null; }
    function isAdmin() { return isAuth() && request.auth.token.admin == true; }

    // Vitrines publiques : lecture libre, écriture marchand connecté ou admin
    match /boutiques/{id} {
      allow read: if true;
      allow write: if isAuth();
    }
    match /products/{id} {
      allow read: if true;
      allow write: if isAuth();
    }

    // Les clients passent commande sans compte ; le marchand gère ensuite
    match /orders/{id} {
      allow create: if true;
      allow read, update, delete: if isAuth();
    }

    // Support & demandes de passage Pro/Premium
    match /tickets/{id} {
      allow create: if true;
      allow read, update, delete: if isAuth();
    }
    match /upgradeRequests/{id} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }

    // Tout le reste : refusé par défaut
    match /{document=**} { allow read, write: if false; }
  }
}
```

## 4. Bonnes pratiques complémentaires
- **Firebase Storage** : limiter l'upload (taille/type) et l'écriture aux comptes connectés.
- **App Check** (reCAPTCHA) pour bloquer les accès hors de ton app.
- Ne jamais committer de clés privées (les `VITE_*` côté client sont publiques par nature —
  ne JAMAIS y mettre de secret serveur).

---
*Quand tu veux attaquer la refonte auth admin (étape 1), je peux la coder avec toi.*

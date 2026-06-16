// ─── Prix multi-devises ─────────────────────────────────────────────────────
// Chaque boutique porte sa devise (`boutique.devise`) : 'FCFA' (défaut) ou 'EUR'.
// Espace simple comme séparateur de milliers (l'espace fine U+202F casse jsPDF).

export const formatPrice = (n, devise = 'FCFA') => {
  const num = Number(n) || 0;
  const sep = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (devise === 'EUR') {
    // Entier → « 20 € » ; sinon 2 décimales à la française → « 19,99 € »
    const isInt = Number.isInteger(num);
    const [ent, dec] = num.toFixed(2).split('.');
    return isInt ? `${sep(String(num))} €` : `${sep(ent)},${dec} €`;
  }
  return `${sep(String(Math.round(num)))} FCFA`;
};

export const CURRENCIES = [
  { code: 'FCFA', label: 'FCFA (Franc CFA)' },
  { code: 'EUR', label: '€ (Euro)' },
];

// ─── Remises (ligne + globale) ───────────────────────────────────────────────
// Remise par ligne : it.remise = { type, valeur }, où type vaut :
//   'percent'    → pourcentage sur le total de la ligne ;
//   'flat'       → montant fixe retiré du total de la ligne ;
//   'flat_unit'  → montant fixe retiré du prix de CHAQUE pièce (× quantité).
// Remise globale : { type:'percent'|'flat', valeur }, appliquée au sous-total NET.
const clampPct = (v) => Math.min(100, Math.max(0, Number(v) || 0));

export const itemGross = (it) => (Number(it?.price) || 0) * (Number(it?.quantity) || 0);

export const itemDiscount = (it) => {
  const r = it && it.remise;
  if (!r || !(Number(r.valeur) > 0)) return 0;
  const g = itemGross(it);
  const v = Math.max(0, Number(r.valeur) || 0);
  if (r.type === 'percent') return Math.round((g * clampPct(r.valeur)) / 100);
  if (r.type === 'flat_unit') return Math.min(g, Math.round(v * (Number(it.quantity) || 0)));
  return Math.min(g, v); // 'flat' (sur le total)
};

export const itemNet = (it) => Math.max(0, itemGross(it) - itemDiscount(it));

export const cartGross = (items = []) => items.reduce((s, it) => s + itemGross(it), 0);
export const cartLineDiscounts = (items = []) => items.reduce((s, it) => s + itemDiscount(it), 0);
export const cartNet = (items = []) => items.reduce((s, it) => s + itemNet(it), 0);

// Montant d'une remise globale sur un sous-total net déjà calculé.
export const globalDiscount = (net, remise) => {
  if (!remise || !(Number(remise.valeur) > 0)) return 0;
  return remise.type === 'percent'
    ? Math.round((net * clampPct(remise.valeur)) / 100)
    : Math.min(net, Math.max(0, Number(remise.valeur) || 0));
};

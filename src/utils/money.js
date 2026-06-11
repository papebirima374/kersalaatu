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

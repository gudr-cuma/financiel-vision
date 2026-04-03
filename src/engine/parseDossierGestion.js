import * as XLSX from 'xlsx';

/**
 * Parse le fichier Excel dossier_gestion.xlsx (feuille Publipostage).
 * Retourne un objet dossierData prêt à stocker dans Zustand.
 */
export async function parseDossierGestion(file) {
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array' });

  const ws = wb.Sheets['Publipostage'];
  if (!ws) throw new Error('Feuille "Publipostage" introuvable dans le fichier Excel.');

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (rows.length < 2) throw new Error('Le fichier ne contient aucune donnée CUMA.');

  const headers = rows[0];
  const dataRows = rows.slice(1).filter(r => r.some(c => c !== ''));

  if (dataRows.length === 0) throw new Error('Aucune ligne de données CUMA trouvée.');

  // Construire la liste des CUMAs — nombres arrondis à 2 décimales
  const cumaList = dataRows.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (!h) return;
      const val = row[i] ?? '';
      if (typeof val === 'number') {
        obj[h] = Math.round(val * 100) / 100;
      } else {
        obj[h] = val;
      }
    });
    return obj;
  });

  return {
    cumaList,
    selectedCumaIndex: 0,
    variables: cumaList[0],
    overrides: {},
    comments: {
      resultats: '',
      charges: '',
      financement: '',
      fonds_roulement: '',
      capital_social: '',
      synthese: '',
    },
  };
}

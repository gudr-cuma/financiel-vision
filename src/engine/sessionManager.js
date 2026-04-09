/**
 * sessionManager.js — Sauvegarde / restauration de session (.clario)
 *
 * Le fichier .clario est un JSON léger contenant uniquement les données
 * non reconstituables (commentaires, overrides, rapport IA).
 * Les données FEC et Excel ne sont jamais incluses.
 */

const STORAGE_KEY = 'clario_recent';
const MAX_RECENT  = 10;

// ---------------------------------------------------------------------------
// Export — génère et télécharge le fichier .clario
// ---------------------------------------------------------------------------

export function exportSession(storeState) {
  const {
    parsedFec, dossierData, analyseIAText,
    bilanCRData, activeSection, activeTab,
  } = storeState;

  const selectedIdx = dossierData?.selectedCumaIndex ?? 0;
  // Tenter d'extraire le nom CUMA depuis différents champs possibles
  const cumaList = dossierData?.cumaList ?? [];
  const cumaRow  = cumaList[selectedIdx] ?? {};
  const cumaName = cumaRow.raisonSociale ?? cumaRow.nom ?? cumaRow.NomCuma ?? '';

  // SIREN depuis le nom de fichier FEC (pattern: {SIREN}DONNEESCOMPTABLES...)
  const rawFileName = parsedFec?.fileName ?? '';
  const sirenMatch  = rawFileName.match(/^(\d{9})DONNEESCOMPTABLES/i);
  const siren       = parsedFec?.siren ?? sirenMatch?.[1] ?? '';

  // Exercice
  const exerciceYear = parsedFec?.exerciceEnd
    ? new Date(parsedFec.exerciceEnd).getFullYear()
    : new Date().getFullYear();
  const exercice = parsedFec?.exerciceEnd ? `Exercice ${exerciceYear}` : '';

  const clario = {
    version: 1,
    savedAt: new Date().toISOString(),
    metadata: {
      siren,
      cumaName,
      exercice,
      fecFileName:        parsedFec?.fileName  ?? '',
      dossierFileName:    dossierData?.fileName ?? '',
      bilanCRFileName:    bilanCRData?.fileName  ?? '',
      analytiqueFileName: '',
    },
    session: {
      dossierOverrides:    dossierData?.overrides ?? {},
      dossierComments:     dossierData?.comments  ?? {},
      selectedCumaIndex:   dossierData?.selectedCumaIndex ?? 0,
      analyseIAText:       analyseIAText ?? '',
      activeSection:       activeSection ?? 'analyseur',
      activeTab:           activeTab     ?? 'sig',
      diaporama: {
        cover: {
          cumaName:      storeState.diaporamaCover?.cumaName      ?? '',
          exerciceLabel: storeState.diaporamaCover?.exerciceLabel ?? '',
          // logoDataUrl excluded (too large for file)
        },
        slides: storeState.diaporamaSlides ?? [],
      },
    },
  };

  const json  = JSON.stringify(clario, null, 2);
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `${siren || 'clario'}_${exerciceYear}.clario`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Import — lit et valide un fichier .clario
// ---------------------------------------------------------------------------

export function parseSessionFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !data.session) {
          reject(new Error('Fichier .clario invalide ou corrompu.'));
          return;
        }
        if (data.version > 1) {
          reject(new Error(`Version de fichier non supportée (v${data.version}). Mettez à jour l'application.`));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error('Impossible de lire ce fichier. Vérifiez qu\'il s\'agit d\'un fichier .clario valide.'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
    reader.readAsText(file);
  });
}

// ---------------------------------------------------------------------------
// localStorage — liste des sessions récentes (métadonnées uniquement)
// ---------------------------------------------------------------------------

export function getRecentSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSession(metadata) {
  try {
    const sessions = getRecentSessions();
    // Supprime l'entrée existante pour ce même dossier
    const filtered = sessions.filter(
      s => !(s.siren === metadata.siren && s.exercice === metadata.exercice)
    );
    const updated = [
      { ...metadata, lastOpenedAt: new Date().toISOString() },
      ...filtered,
    ].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage indisponible — pas bloquant
  }
}

export function removeRecentSession(siren, exercice) {
  try {
    const sessions = getRecentSessions();
    const updated  = sessions.filter(
      s => !(s.siren === siren && s.exercice === exercice)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

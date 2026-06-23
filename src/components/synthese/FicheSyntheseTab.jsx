import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { UploadPrompt } from '../shared/UploadPrompt';
import { formatAmountFull, formatDate } from '../../engine/formatUtils';

const BOX_STYLE = {
  border: '1px solid #E2E8F0',
  borderRadius: '10px',
  padding: '16px 18px',
  backgroundColor: '#FFFFFF',
};

const BOX_TITLE_STYLE = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#718096',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '12px',
};

function formatRawValue(value, type) {
  if (value === null || value === undefined || value === '') return '';
  // Selon l'export, une date peut arriver en Date (cellule Excel typée date)
  // ou en texte déjà formaté (cellule Excel typée texte) — afficher tel quel
  // dans ce second cas plutôt que de la faire disparaître.
  if (type === 'date') return value instanceof Date ? formatDate(value) : String(value);
  if (type === 'amount') return formatAmountFull(value);
  return String(value);
}

/**
 * EditableField — champ libellé/valeur éditable. La valeur affichée est
 * l'override utilisateur si présent, sinon la valeur source formatée
 * (laquelle peut être absente — champs purement déclaratifs comme l'adresse).
 */
function EditableField({ label, fieldKey, sourceValue, type, overrides, onEdit }) {
  const override = overrides[fieldKey];
  const displayValue = override !== undefined ? override : formatRawValue(sourceValue, type);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '4px 0', fontSize: '13px', borderBottom: '1px solid #F7FAFC' }}>
      <span style={{ color: '#718096', flexShrink: 0 }}>{label}</span>
      <input
        type="text"
        value={displayValue}
        onChange={(e) => onEdit(fieldKey, e.target.value)}
        placeholder="—"
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          borderBottom: '1px solid transparent',
          background: 'transparent',
          textAlign: 'right',
          fontSize: '13px',
          fontWeight: 600,
          color: '#1A202C',
          outline: 'none',
          padding: '2px 4px',
        }}
        onFocus={(e) => { e.target.style.borderBottomColor = '#FF8200'; }}
        onBlur={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
      />
    </div>
  );
}

export function FicheSyntheseTab() {
  const exploitationData = useStore((s) => s.exploitationData);
  const loadExportMulti = useStore((s) => s.loadExportMulti);
  const loadDemoExportMulti = useStore((s) => s.loadDemoExportMulti);
  const isLoadingExploitation = useStore((s) => s.isLoadingExploitation);
  const errorExploitation = useStore((s) => s.errorExploitation);
  const canUploadFile = useAuthStore((s) => s.canUploadFile());
  const overrides = useStore((s) => s.syntheseOverrides);
  const updateSyntheseOverride = useStore((s) => s.updateSyntheseOverride);

  if (!exploitationData) {
    return (
      <UploadPrompt
        title="Fiche de synthèse"
        description="Chargez le fichier Excel Export_Multi (onglet Synthese) pour afficher la fiche de synthèse du dossier."
        accept=".xlsx,.xls"
        onFile={loadExportMulti}
        onDemo={loadDemoExportMulti}
        canUpload={canUploadFile}
        error={errorExploitation}
      />
    );
  }

  const s = exploitationData.synthese ?? {};
  const field = (label, fieldKey, type) => (
    <EditableField key={fieldKey} label={label} fieldKey={fieldKey} sourceValue={s[fieldKey]} type={type} overrides={overrides} onEdit={updateSyntheseOverride} />
  );
  // Champs purement déclaratifs, sans colonne source dans l'onglet Synthese —
  // pilotés uniquement par l'override utilisateur.
  const declaredField = (label, fieldKey, type) => (
    <EditableField key={fieldKey} label={label} fieldKey={fieldKey} sourceValue={undefined} type={type} overrides={overrides} onEdit={updateSyntheseOverride} />
  );

  return (
    <div style={{ paddingTop: '8px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>Fiche de synthèse</div>
        {isLoadingExploitation && <div style={{ fontSize: '13px', color: '#718096' }}>Import en cours…</div>}
      </div>

      {/* Identité */}
      <div style={{ ...BOX_STYLE, marginBottom: '14px' }}>
        <div style={BOX_TITLE_STYLE}>{formatRawValue(s.raisonSociale) === '' ? 'Identité' : s.raisonSociale}</div>
        {field('Dossier', 'dossier')}
        {field('Raison sociale', 'raisonSociale')}
        {declaredField('Adresse', 'adresse')}
        {declaredField('Code postal / Ville', 'codePostalVille')}
        {declaredField('Téléphone', 'telephone')}
        {declaredField('SIRET', 'siret')}
        {declaredField('N° agrément', 'numAgrement')}
        {declaredField('N° exploitation', 'numExploitation')}
      </div>

      {/* Dirigeants */}
      <div style={{ ...BOX_STYLE, marginBottom: '14px' }}>
        <div style={BOX_TITLE_STYLE}>Dirigeants</div>
        {field('Président', 'president')}
        {field('Vice-président', 'vp')}
        {field('Trésorier', 'tresorier')}
        {field('Secrétaire', 'secretaire')}
      </div>

      {/* Situation de la CUMA */}
      <div style={{ ...BOX_STYLE, marginBottom: '14px' }}>
        <div style={BOX_TITLE_STYLE}>Situation de la CUMA</div>
        {field("Nombre d'adhérents", 'nbAdherentsTotal')}
        {field('Dont individuels', 'nbAdherentsIndividuels')}
        {field('Autres (groupes)', 'nbAdherentsGroupes')}
        {field('Nombre de matériels', 'nbMaterielsActifs')}
        {field("Nombre d'articles", 'nbArticles')}
        {field('Dont activités', 'nbActivites')}
        {field('Nombre de salariés', 'nbSalaries')}
      </div>

      {/* Exercice */}
      <div style={{ ...BOX_STYLE, marginBottom: '14px' }}>
        <div style={BOX_TITLE_STYLE}>Année en cours</div>
        {field('Exercice comptable — début', 'dateDebutExercice', 'date')}
        {field('Exercice comptable — fin', 'dateFinExercice', 'date')}
        {declaredField('Nombre de BL facturés', 'nbBlFactures')}
        {field('Nombre de lignes comptables', 'nbLignesCompta')}
        <div style={{ fontSize: '11px', color: '#A0AEC0', fontStyle: 'italic', marginTop: '2px' }}>
          Compte toutes les écritures, hormis celles en journal ODY et ANC.
        </div>
        {field('Nombre de pièces comptables', 'nbPiecesCompta')}
      </div>

      {/* État du dossier */}
      <div style={BOX_TITLE_STYLE}>État du dossier</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        <div style={BOX_STYLE}>
          <div style={BOX_TITLE_STYLE}>Capital Social</div>
          {field('Solde 10121', 'solde10121', 'amount')}
          {field('Solde 10122', 'solde10122', 'amount')}
          {field('Solde 10131', 'solde10131', 'amount')}
          {field('Solde 10132', 'solde10132', 'amount')}
          {declaredField('CS appelé / versé', 'csAppeleVerse')}
          {declaredField('CS appelé / non versé', 'csAppeleNonVerse')}
        </div>
        <div style={BOX_STYLE}>
          <div style={BOX_TITLE_STYLE}>Facturation adhérent</div>
          {field('BL non générés', 'blCliNonGeneres')}
          {field('BL non facturés', 'blCliNonFactures')}
          {field('Factures non intégrées', 'factCliNonIntegrees')}
        </div>
        <div style={BOX_STYLE}>
          <div style={BOX_TITLE_STYLE}>Facturation fournisseur</div>
          {field('BL non facturés', 'blFouNonFactures')}
          {field('Factures non intégrées', 'factFouNonIntegrees')}
        </div>
      </div>
    </div>
  );
}

export default FicheSyntheseTab;

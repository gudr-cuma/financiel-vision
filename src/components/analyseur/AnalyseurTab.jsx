import useStore from '../../store/useStore';
import { Dropzone } from '../upload/Dropzone';
import { ProgressBar } from '../upload/ProgressBar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtMoney(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d);
}
function fmtNum(n) {
  return new Intl.NumberFormat('fr-FR').format(n);
}

function ScoreBadge({ score }) {
  const color = score >= 90 ? '#268E00' : score >= 75 ? '#FF8200' : score >= 50 ? '#E8A000' : '#E53935';
  const bg    = score >= 90 ? '#E8F5E0' : score >= 75 ? '#FFF3E0' : score >= 50 ? '#FFFDE7' : '#FFF5F5';
  const label = score >= 90 ? 'EXCELLENT' : score >= 75 ? 'BON' : score >= 50 ? 'MOYEN' : 'INSUFFISANT';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '20px', background: bg, color, fontWeight: 700, fontSize: '13px' }}>
      ✓ {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section Score principal
// ---------------------------------------------------------------------------
function ScoreCard({ data }) {
  const s = data.scoreTotal;
  const color = s >= 90 ? '#268E00' : s >= 75 ? '#FF8200' : s >= 50 ? '#E8A000' : '#E53935';
  const bg    = s >= 90 ? 'linear-gradient(135deg, #E8F5E0, #F0FFF0)' : s >= 75 ? 'linear-gradient(135deg, #FFF3E0, #FFFDE7)' : 'linear-gradient(135deg, #FFF5F5, #FFF9F9)';

  return (
    <div style={{ background: bg, border: `1px solid ${color}33`, borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px' }}>🎯</span>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1A202C' }}>Score de Qualité</h2>
        </div>
        <div style={{ fontSize: '13px', color: '#718096', marginBottom: '2px' }}>
          📁 Fichier : {data.fileName}
        </div>
        <div style={{ fontSize: '13px', color: '#718096' }}>
          🗓️ {fmtDate(data.generatedAt)}
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#718096', fontStyle: 'italic' }}>
          Conforme à l'article A47 A-1 du Livre des Procédures Fiscales
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '56px', fontWeight: 800, color, lineHeight: 1 }}>
          {s}<span style={{ fontSize: '28px', color: '#A0AEC0' }}>/100</span>
        </div>
        <div style={{ marginTop: '8px' }}>
          <ScoreBadge score={s} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Détail des scores
// ---------------------------------------------------------------------------
function ScoreDetails({ scores }) {
  const items = [
    { key: 'conformite', emoji: '1️⃣' },
    { key: 'equilibre',  emoji: '2️⃣' },
    { key: 'libelles',   emoji: '3️⃣' },
    { key: 'tracabilite',emoji: '4️⃣' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
      {items.map(({ key, emoji }) => {
        const s = scores[key];
        const pct = (s.score / s.max) * 100;
        const color = pct === 100 ? '#268E00' : pct >= 75 ? '#FF8200' : '#E53935';
        return (
          <div key={key} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
              {emoji} {s.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color }}>{s.score}</span>
              <span style={{ fontSize: '14px', color: '#A0AEC0' }}>/ {s.max} pts</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: '#E2E8F0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Statistiques principales
// ---------------------------------------------------------------------------
function StatsGrid({ stats }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '18px' }}>📊</span>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1A202C' }}>Statistiques Principales</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <StatCard label="Écritures" value={fmtNum(stats.nbEntries)} emoji="📝" />
        <StatCard label="Comptes" value={fmtNum(stats.nbComptes)} emoji="🗂️" />
        <StatCard
          label="Équilibre"
          value={stats.isBalanced ? 'OUI' : 'NON'}
          emoji="⚖️"
          valueStyle={{ color: stats.isBalanced ? '#268E00' : '#E53935', display: 'flex', alignItems: 'center', gap: '4px' }}
          prefix={stats.isBalanced ? '☑️ ' : '❌ '}
        />
        <StatCard label="Conformité" value={stats.conformite} emoji="✔️" />
      </div>
    </div>
  );
}

function StatCard({ label, value, emoji, valueStyle, prefix }) {
  return (
    <div style={{ background: '#F8FAFB', borderRadius: '8px', padding: '12px 14px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#718096', textTransform: 'uppercase', marginBottom: '6px' }}>
        {emoji} {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: '#1A202C', ...valueStyle }}>
        {prefix}{value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------
function AnomaliesSection({ critiques, majeures, mineures }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '18px' }}>🚨</span>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1A202C' }}>Anomalies Détectées</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <AnomalieCounter label="Critiques" count={critiques.length} color="#E53935" bg="#FFF5F5" border="#FED7D7" sub="Risque de rejet fiscal" dot="🔴" />
        <AnomalieCounter label="Majeures"  count={majeures.length}  color="#DD6B20" bg="#FFFAF0" border="#FEEBC8" sub="Non-conformité" dot="🟠" />
        <AnomalieCounter label="Mineures"  count={mineures.length}  color="#D69E2E" bg="#FFFFF0" border="#FAF089" sub="Traçabilité réduite" dot="🟡" />
      </div>

      {critiques.length > 0 && <AnomalieTable title="Anomalies critiques" items={critiques} color="#E53935" dot="🔴" />}
      {majeures.length > 0  && <AnomalieTable title="Anomalies majeures"  items={majeures}  color="#DD6B20" dot="🟠" />}
      {mineures.length > 0  && <AnomalieTable title="Anomalies mineures"  items={mineures}  color="#D69E2E" dot="🟡" maxVisible={10} />}

      {critiques.length === 0 && majeures.length === 0 && mineures.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#268E00', fontSize: '14px', fontWeight: 600 }}>
          ✅ Aucune anomalie détectée — FEC de qualité optimale
        </div>
      )}
    </div>
  );
}

function AnomalieCounter({ label, count, color, bg, border, sub, dot }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '14px 16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color, marginBottom: '4px' }}>{dot} {label}</div>
      <div style={{ fontSize: '32px', fontWeight: 800, color, lineHeight: 1.1 }}>{count}</div>
      <div style={{ fontSize: '11px', color, marginTop: '4px', opacity: 0.8 }}>{sub}</div>
    </div>
  );
}

function AnomalieTable({ title, items, color, dot, maxVisible }) {
  const visible = maxVisible ? items.slice(0, maxVisible) : items;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color, marginBottom: '8px' }}>{dot} {title} ({items.length})</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#F7FAFC' }}>
              {['Ligne', 'Type', 'Journal', 'Écriture', 'Compte', 'Pièce', 'Impact'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#718096', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F7FAFC' }}>
                <td style={{ padding: '7px 10px', color: '#718096' }}>{item.ligne}</td>
                <td style={{ padding: '7px 10px', color: '#2D3748' }}>{item.type}</td>
                <td style={{ padding: '7px 10px', color: '#2D3748', fontWeight: 600 }}>{item.journal}</td>
                <td style={{ padding: '7px 10px', color: '#2D3748' }}>{item.ecriture}</td>
                <td style={{ padding: '7px 10px', color: '#2D3748', fontFamily: 'monospace' }}>{item.compte}</td>
                <td style={{ padding: '7px 10px', color: '#2D3748' }}>{item.piece || '—'}</td>
                <td style={{ padding: '7px 10px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '10px', background: `${color}18`, color, fontSize: '11px', fontWeight: 600 }}>
                    {item.impact}
                  </span>
                </td>
              </tr>
            ))}
            {maxVisible && items.length > maxVisible && (
              <tr>
                <td colSpan={7} style={{ padding: '8px 10px', color: '#A0AEC0', fontSize: '12px', fontStyle: 'italic' }}>
                  … et {items.length - maxVisible} autres anomalies
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Balance par journal
// ---------------------------------------------------------------------------
function BalanceJournaux({ data }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '18px' }}>📒</span>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1A202C' }}>Balance par Journal</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#F7FAFC', borderBottom: '2px solid #E2E8F0' }}>
              {['Code', 'Libellé', 'Débit', 'Crédit', 'Solde', 'État'].map((h, i) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: i >= 2 ? 'right' : 'left', fontWeight: 600, fontSize: '11px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((j, i) => {
              const soldeAbs = Math.abs(j.solde);
              const soldeStr = soldeAbs < 0.01 ? '0,00 €' : fmtMoney(j.solde);
              return (
                <tr key={j.code} style={{ borderBottom: '1px solid #F7FAFC', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td style={{ padding: '9px 12px', fontWeight: 700, color: '#2D3748', fontFamily: 'monospace' }}>{j.code}</td>
                  <td style={{ padding: '9px 12px', color: '#4A5568' }}>{j.label}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#268E00' }}>{fmtMoney(j.debit)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#E53935' }}>{fmtMoney(j.credit)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: j.equilibre ? '#718096' : '#E53935', fontWeight: j.equilibre ? 400 : 600 }}>
                    {soldeStr}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    {j.equilibre
                      ? <span style={{ color: '#268E00', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>☑️ OUI</span>
                      : <span style={{ color: '#E53935', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>❌ NON</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #E2E8F0', background: '#F7FAFC' }}>
              <td colSpan={2} style={{ padding: '10px 12px', fontWeight: 700, fontSize: '13px' }}>TOTAL GÉNÉRAL</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#268E00' }}>
                {fmtMoney(data.reduce((s, j) => s + j.debit, 0))}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#E53935' }}>
                {fmtMoney(data.reduce((s, j) => s + j.credit, 0))}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#268E00' }}>0,00 €</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                <span style={{ color: '#268E00', fontWeight: 600, fontSize: '12px' }}>☑️ OUI</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documentation
// ---------------------------------------------------------------------------
function Documentation() {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '18px' }}>📖</span>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1A202C' }}>Documentation de l'Analyseur FEC</h3>
      </div>

      <div style={{ background: '#EBF8FF', border: '1px solid #BEE3F8', borderLeft: '4px solid #3182CE', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#2C5282' }}>
          <strong>Objectif :</strong> Analyser la conformité et la qualité d'un fichier FEC (Fichier des Écritures Comptables) conformément à l'article A47 A-1 du Livre des Procédures Fiscales.
        </span>
      </div>

      <DocSection emoji="1️⃣" title="Conformité Réglementaire : 30 points" color="#3182CE">
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#4A5568' }}>
          Vérifie la présence des 18 champs obligatoires selon l'article A47 A-1 :
        </p>
        <ul style={{ margin: '0 0 8px', padding: '0 0 0 20px', fontSize: '13px', color: '#4A5568', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
          {[
            ['JournalCode', 'JournalLib', '— Code et libellé du journal'],
            ['EcritureNum', 'EcritureDate', '— Numéro et date de l\'écriture'],
            ['CompteNum', 'CompteLib', '— Compte général'],
            ['CompAuxNum', 'CompAuxLib', '— Compte auxiliaire'],
            ['PieceRef', 'PieceDate', '— Référence et date de la pièce justificative'],
            ['EcritureLib', '', '— Libellé de l\'écriture'],
            ['Debit', 'Credit', '— Montants débit et crédit'],
            ['EcritureLet', 'DateLet', '— Lettrage'],
            ['ValidDate', '', '— Date de validation'],
            ['Montantdevise', 'Idevise', '— Devise'],
          ].map(([a, b, label], i) => (
            <li key={i} style={{ listStyle: 'disc', marginBottom: '2px' }}>
              <code style={{ fontSize: '12px', color: '#2B6CB0' }}>{a}</code>
              {b && <>, <code style={{ fontSize: '12px', color: '#2B6CB0' }}>{b}</code></>}
              {label && <span style={{ color: '#718096' }}>{label}</span>}
            </li>
          ))}
        </ul>
        <FormulaBox formula="Score = (Nombre de champs présents dans l'en-tête / 18) × 30" example="Si 17 champs sur 18 sont présents → (17/18) × 30 = 28,33 points" />
      </DocSection>

      <DocSection emoji="2️⃣" title="Équilibre Comptable : 25 points" color="#38A169">
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#4A5568' }}>
          Vérifie que la somme globale des débits est égale à la somme globale des crédits sur l'ensemble du fichier.
        </p>
        <FormulaBox formula="Score = 25 si |Σ Débit − Σ Crédit| < 0,05 €, sinon 0" example="Un FEC équilibré obtient 25 points. Un écart révèle une anomalie comptable sérieuse." />
      </DocSection>

      <DocSection emoji="3️⃣" title="Qualité des Libellés : 25 points" color="#805AD5">
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#4A5568' }}>
          Mesure la proportion d'écritures avec un libellé exploitable (plus d'un caractère).
        </p>
        <FormulaBox formula="Score = (Écritures avec libellé > 1 car. / Total écritures) × 25" example="Si 98% des libellés sont exploitables → 0,98 × 25 = 24,5 points" />
      </DocSection>

      <DocSection emoji="4️⃣" title="Traçabilité Pièces : 20 points" color="#DD6B20">
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#4A5568' }}>
          Vérifie le taux de renseignement de la référence pièce. Les journaux OD, ODY, ODA, ND2, NDF sont exemptés (opérations internes sans pièce physique).
        </p>
        <FormulaBox formula="Score = (Écritures avec PieceRef / Écritures hors journaux exemptés) × 20" example="Si 90% ont une référence → 0,90 × 20 = 18 points" />
      </DocSection>

      <div style={{ marginTop: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#2D3748', marginBottom: '10px' }}>🚨 Types d'Anomalies Détectées</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
          <AnomalieDocCard color="#E53935" bg="#FFF5F5" border="#FED7D7" title="Anomalies Critiques" items={[
            ['Doublons de ligne complète', 'Combinaison unique (N° écriture + Compte + N° pièce + Débit + Crédit + Date lettrage + Libellé) en doublon → Risque de rejet fiscal'],
            ['Exclusions', 'Journaux OD, ODY, ODA, ND2, NDF et lignes sans numéro de pièce ne sont pas contrôlés'],
          ]} />
          <AnomalieDocCard color="#DD6B20" bg="#FFFAF0" border="#FEEBC8" title="Anomalies Majeures" items={[
            ['Comptes non conformes au PCG', 'Numéros de compte < 6 ou > 8 chiffres'],
            ['Montants anormalement élevés', 'Débits ou crédits > 1 000 000 €'],
          ]} />
          <AnomalieDocCard color="#D69E2E" bg="#FFFFF0" border="#FAF089" title="Anomalies Mineures" items={[
            ['Libellés trop courts', 'Libellés d\'1 seul caractère'],
            ['Références de pièces manquantes', 'Documentation incomplète'],
          ]} />
        </div>
      </div>
    </div>
  );
}

function DocSection({ emoji, title, color, children }) {
  return (
    <div style={{ marginBottom: '16px', borderLeft: `3px solid ${color}`, paddingLeft: '14px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color, marginBottom: '8px' }}>{emoji} {title}</div>
      {children}
    </div>
  );
}

function FormulaBox({ formula, example }) {
  return (
    <div style={{ background: '#F7FAFC', borderRadius: '6px', padding: '10px 14px', marginTop: '8px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>▶ Formule de calcul :</div>
      <code style={{ fontSize: '12px', color: '#2D3748', display: 'block', marginBottom: '4px' }}>{formula}</code>
      <div style={{ fontSize: '11px', color: '#A0AEC0', fontStyle: 'italic' }}>Exemple : {example}</div>
    </div>
  );
}

function AnomalieDocCard({ color, bg, border, title, items }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '12px 16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color, marginBottom: '8px' }}>{title}</div>
      <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
        {items.map(([label, desc], i) => (
          <li key={i} style={{ fontSize: '12px', color: '#4A5568', marginBottom: '4px' }}>
            <strong>{label}</strong> : {desc}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AnalyseurTab
// ---------------------------------------------------------------------------
export function AnalyseurTab() {
  const analyseurData = useStore(s => s.analyseurData);
  const loadFec       = useStore(s => s.loadFec);
  const loadDemo         = useStore(s => s.loadDemo);
  const loadDemoComplete = useStore(s => s.loadDemoComplete);
  const isLoading     = useStore(s => s.isLoading);
  const loadProgress  = useStore(s => s.loadProgress);

  if (!analyseurData) {
    return (
      <div style={{ paddingTop: '32px', maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 700, color: '#1A202C' }}>
            Analyse financière FEC
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#718096', lineHeight: 1.6 }}>
            Déposez votre fichier FEC pour obtenir vos SIG, analyses mensuelles
            et drill-down jusqu'aux écritures.
          </p>
        </div>

        <Dropzone onFile={file => loadFec(file)} disabled={isLoading} />

        {isLoading && (
          <div style={{ marginTop: '16px' }}>
            <ProgressBar percent={loadProgress} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
          <span style={{ fontSize: '13px', color: '#A0AEC0', fontWeight: 500 }}>ou</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => loadDemoComplete()}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: isLoading ? '#FFC06A' : '#FF8200',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          onMouseEnter={e => { if (!isLoading) e.currentTarget.style.backgroundColor = '#E57300'; }}
          onMouseLeave={e => { if (!isLoading) e.currentTarget.style.backgroundColor = '#FF8200'; }}
        >
          🚀 Charger la démo complète
        </button>
        <button
          onClick={() => loadDemo()}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '9px 24px',
            backgroundColor: 'transparent',
            color: isLoading ? '#CBD5E0' : '#FF8200',
            border: '1px solid ' + (isLoading ? '#CBD5E0' : '#FF8200'),
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          onMouseEnter={e => { if (!isLoading) e.currentTarget.style.backgroundColor = '#FFF3E0'; }}
          onMouseLeave={e => { if (!isLoading) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          ⚡ FEC seul (démonstration)
        </button>
        </div>

        <p style={{ margin: '16px 0 0', fontSize: '12px', color: '#A0AEC0', textAlign: 'center', lineHeight: 1.5 }}>
          🔒 Vos données restent dans votre navigateur et ne sont jamais envoyées sur nos serveurs.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <ScoreCard data={analyseurData} />
      <ScoreDetails scores={analyseurData.scores} />
      <StatsGrid stats={analyseurData.stats} />
      <AnomaliesSection
        critiques={analyseurData.anomaliesCritiques}
        majeures={analyseurData.anomaliesMajeures}
        mineures={analyseurData.anomaliesMineures}
      />
      <BalanceJournaux data={analyseurData.balanceJournaux} />
      <Documentation />
    </div>
  );
}

export default AnalyseurTab;

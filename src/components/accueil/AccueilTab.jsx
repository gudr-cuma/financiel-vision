import { useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';

const MODULES = [
  {
    id: 'analyseur',
    icon: '🔎',
    label: 'Analyseur FEC',
    color: '#31B700',
    bg: '#E8F5E0',
    description: 'Chargez votre fichier FEC (.csv) — les calculs sont instantanés et 100% locaux.',
  },
  {
    id: 'dashboard',
    icon: '📊',
    label: 'Tableaux de bord',
    color: '#0077A8',
    bg: '#E3F2F5',
    description: 'SIG, trésorerie, charges, bilan, comparaison N-1/N-2 et analytique matériel.',
  },
  {
    id: 'dossier',
    icon: '📋',
    label: 'Dossier de gestion',
    color: '#FF8200',
    bg: '#FFF3E0',
    description: 'Pré-remplissez votre dossier annuel depuis l\'export Publipostage Divalto.',
  },
  {
    id: 'bilanCR',
    icon: '📈',
    label: 'Bilan & CR',
    color: '#00965E',
    bg: '#E0F4EC',
    description: 'Bilan complet Brut / Amort. / Net et compte de résultat N/N-1 (Divalto).',
  },
  {
    id: 'bilanParam',
    icon: '⚖️',
    label: 'Bilan paramétré',
    color: '#6B46C1',
    bg: '#F3EEFF',
    description: 'Vue bilan sur-mesure avec postes et plages de comptes configurables par l\'administrateur.',
  },
  {
    id: 'editions',
    icon: '📒',
    label: 'Éditions',
    color: '#2B6CB0',
    bg: '#EBF4FF',
    description: 'Grand Livre et Balance : consultez toutes les écritures de l\'exercice par compte.',
  },
  {
    id: 'export',
    icon: '⬇️',
    label: 'Export PDF',
    color: '#718096',
    bg: '#F7FAFC',
    description: 'Générez des PDF imprimables à partir des tableaux de bord et du SIG.',
  },
  {
    id: 'analyse',
    icon: '🤖',
    label: 'Rapport IA',
    color: '#B7791F',
    bg: '#FFFFF0',
    description: 'Analyse financière en langage naturel générée automatiquement depuis vos indicateurs.',
  },
];

const FAQ = [
  {
    q: 'Mes données sont-elles confidentielles ?',
    a: 'Oui — tout le traitement est 100% local dans votre navigateur. Aucune donnée n\'est envoyée sur Internet.',
  },
  {
    q: 'Quels fichiers puis-je charger ?',
    a: 'FEC .csv (export DGFiP), dossier_gestion.xlsx (feuille Publipostage), BilanCR.xlsx et Balance Analytique .xlsx (exports Divalto).',
  },
  {
    q: 'Que faire si mon bilan est déséquilibré ?',
    a: 'Un bandeau d\'alerte s\'affiche si actif ≠ passif. Vérifiez que votre export FEC contient toutes les classes de comptes (1 à 8).',
  },
  {
    q: 'Mon exercice est décalé (pas janvier–décembre), est-ce supporté ?',
    a: 'Oui — la période est détectée automatiquement à partir du FEC. Les mois s\'affichent dans le bon ordre d\'exercice.',
  },
];

function ModuleCard({ module, onClick, disabled }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered ? module.color : '#E2E8F0'}`,
        borderRadius: '12px',
        padding: '20px 20px 18px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.42 : 1,
        boxShadow: hovered && !disabled
          ? `0 4px 16px rgba(0,0,0,0.10)`
          : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'border-color 150ms, box-shadow 150ms, transform 100ms',
        transform: hovered && !disabled ? 'translateY(-2px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '38px', height: '38px',
          background: module.bg,
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: 0,
        }}>
          {module.icon}
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C' }}>
          {module.label}
        </div>
      </div>
      <div style={{ fontSize: '13px', color: '#718096', lineHeight: '1.5' }}>
        {module.description}
      </div>
      {!disabled && (
        <div style={{ fontSize: '12px', fontWeight: 600, color: module.color, marginTop: '2px' }}>
          Accéder →
        </div>
      )}
    </div>
  );
}

export function AccueilTab() {
  const setActiveSection = useStore(s => s.setActiveSection);
  const hasPermission    = useAuthStore(s => s.hasPermission);
  const currentUser      = useAuthStore(s => s.currentUser);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div style={{ paddingTop: '32px', paddingBottom: '60px' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #E8F5E0 0%, #E3F2F5 100%)',
        borderRadius: '16px',
        padding: '48px 40px',
        textAlign: 'center',
        marginBottom: '40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Décoration légère */}
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: '180px', height: '180px',
          background: 'rgba(49,183,0,0.07)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-40px', left: '-20px',
          width: '140px', height: '140px',
          background: 'rgba(177,220,226,0.25)',
          borderRadius: '50%',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🌿</div>
          <h1 style={{
            fontSize: '28px', fontWeight: 800, color: '#1A202C',
            margin: '0 0 8px',
          }}>
            Clario Vision
          </h1>
          <p style={{
            fontSize: '16px', color: '#4A5568',
            margin: '0 0 20px', fontWeight: 500,
          }}>
            Analyse financière des CUMA — simple, rapide, confidentielle.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(49,183,0,0.3)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '13px', color: '#268E00', fontWeight: 600,
          }}>
            🔒 Vos données restent dans votre navigateur
          </div>
        </div>
      </div>

      {/* ── Modules ───────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{
          fontSize: '16px', fontWeight: 700, color: '#1A202C',
          marginBottom: '16px', letterSpacing: '0.01em',
        }}>
          Les modules disponibles
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '14px',
        }}>
          {MODULES.map(mod => (
            <ModuleCard
              key={mod.id}
              module={mod}
              disabled={!isAdmin && !hasPermission(mod.id)}
              onClick={() => setActiveSection(mod.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Comment démarrer ──────────────────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '28px 32px',
        marginBottom: '28px',
      }}>
        <h2 style={{
          fontSize: '16px', fontWeight: 700, color: '#1A202C',
          marginBottom: '20px',
        }}>
          Comment démarrer
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { num: 1, text: 'Connectez-vous avec votre compte utilisateur.' },
            { num: 2, text: 'Dans l\'Analyseur FEC, chargez votre fichier FEC (.csv) ou lancez la démo complète pour explorer avec des données fictives.' },
            { num: 3, text: 'Naviguez dans les modules selon vos besoins — chaque onglet correspond à une vue d\'analyse ou un document.' },
          ].map(({ num, text }) => (
            <div key={num} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '28px', height: '28px', flexShrink: 0,
                background: '#FF8200',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 800, color: '#FFFFFF',
              }}>
                {num}
              </div>
              <p style={{
                fontSize: '14px', color: '#4A5568',
                margin: '4px 0 0', lineHeight: '1.6',
              }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '28px 32px',
      }}>
        <h2 style={{
          fontSize: '16px', fontWeight: 700, color: '#1A202C',
          marginBottom: '20px',
        }}>
          Questions fréquentes
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {FAQ.map(({ q, a }, i) => (
            <div key={i} style={{
              padding: '14px 0',
              borderBottom: i < FAQ.length - 1 ? '1px solid #F0F4F8' : 'none',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A202C', marginBottom: '4px' }}>
                {q}
              </div>
              <div style={{ fontSize: '13px', color: '#718096', lineHeight: '1.6' }}>
                {a}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default AccueilTab;

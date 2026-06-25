import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { computeControles } from '../../engine/computeControles';
import { ControleCard } from './ControleCard';

export function ControlesTab() {
  const parsedFec = useStore((s) => s.parsedFec);
  const exploitationData = useStore((s) => s.exploitationData);
  const setActiveSection = useStore((s) => s.setActiveSection);

  const controles = useMemo(
    () => computeControles(parsedFec, exploitationData),
    [parsedFec, exploitationData]
  );

  if (!parsedFec) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '380px' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🚦</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '6px' }}>
            Aucun FEC chargé
          </div>
          <div style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
            Chargez un fichier FEC dans l'Analyseur pour activer les contrôles de cohérence.
          </div>
          <button
            onClick={() => setActiveSection('analyseur')}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: 600,
              color: '#FFFFFF', background: '#FF8200',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
            }}
          >
            Aller à l'Analyseur FEC
          </button>
        </div>
      </div>
    );
  }

  // Regroupement par catégorie, en conservant l'ordre de première apparition
  // dans CONTROLES_DEFINITIONS (cf. computeControles.js).
  const categories = [];
  for (const controle of controles) {
    let cat = categories.find((c) => c.id === controle.categoryId);
    if (!cat) {
      cat = { id: controle.categoryId, label: controle.categoryLabel, icon: controle.categoryIcon, controles: [] };
      categories.push(cat);
    }
    cat.controles.push(controle);
  }

  return (
    <div style={{ paddingTop: '16px', paddingBottom: '40px' }}>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C', marginBottom: '4px' }}>
        🚦 Contrôles
      </div>
      <div style={{ fontSize: '13px', color: '#718096', marginBottom: '20px' }}>
        Vérifications de cohérence entre modules et comptes comptables.
      </div>

      {categories.map((cat) => (
        <div key={cat.id} style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: '#718096',
            textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px',
          }}>
            {cat.icon} {cat.label}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '14px',
          }}>
            {cat.controles.map((controle) => (
              <ControleCard
                key={controle.id}
                label={controle.label}
                valueALabel={controle.valueALabel}
                valueA={controle.valueA}
                valueBLabel={controle.valueBLabel}
                valueB={controle.valueB}
                ecart={controle.ecart}
                status={controle.status}
                neutralMessage={controle.neutralMessage}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ControlesTab;

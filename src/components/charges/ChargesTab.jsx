import { useState } from 'react';
import useStore from '../../store/useStore';
import ChargesDonut from './ChargesDonut';
import ChargesDetailList from './ChargesDetailList';
import ChargesMonthlyChart from './ChargesMonthlyChart';

export default function ChargesTab() {
  const chargesData = useStore((s) => s.chargesData);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  if (!chargesData) return null;

  const { categories, totalCharges, monthly } = chargesData;

  function handleSelectCategory(id) {
    setSelectedCategoryId((prev) => (prev === id ? null : id));
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Top row: donut + detail list */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        {/* Donut chart card */}
        <ChargesDonut
          categories={categories}
          totalCharges={totalCharges}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
        />

        {/* Detail list — takes remaining space */}
        <div
          style={{
            flex: 1,
            minWidth: '280px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <p
            style={{
              color: '#718096',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Détail par catégorie
          </p>
          <ChargesDetailList
            categories={categories}
            totalCharges={totalCharges}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleSelectCategory}
          />
        </div>
      </div>

      {/* Bottom: monthly chart — stacked or single-series depending on selection */}
      <ChargesMonthlyChart
        categories={categories}
        monthly={monthly}
        selectedCategoryId={selectedCategoryId}
      />
    </div>
  );
}

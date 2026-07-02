import { useEffect, useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import { computeCharges, getChargeAccountsByCategory } from '../../engine/computeCharges';
import ChargesAccountSelector from './ChargesAccountSelector';
import ChargesDonut from './ChargesDonut';
import ChargesDetailList from './ChargesDetailList';
import ChargesMonthlyChart from './ChargesMonthlyChart';

export default function ChargesTab() {
  const parsedFec = useStore((s) => s.parsedFec);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const chargeGroups = useMemo(
    () => (parsedFec ? getChargeAccountsByCategory(parsedFec) : []),
    [parsedFec]
  );
  const allCompteNums = useMemo(
    () => chargeGroups.flatMap((g) => g.accounts.map((a) => a.compteNum)),
    [chargeGroups]
  );

  const [selectedAccounts, setSelectedAccounts] = useState(allCompteNums);

  // Réinitialise la sélection à "tous les comptes" quand un nouveau FEC est chargé.
  useEffect(() => {
    setSelectedAccounts(allCompteNums);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedFec]);

  const chargesData = useMemo(() => {
    if (!parsedFec || selectedAccounts.length === 0) return null;
    const filteredEntries = parsedFec.entries.filter((e) => selectedAccounts.includes(e.compteNum));
    return computeCharges({ ...parsedFec, entries: filteredEntries });
  }, [parsedFec, selectedAccounts]);

  if (!parsedFec) return null;

  function handleSelectCategory(id) {
    setSelectedCategoryId((prev) => (prev === id ? null : id));
  }

  return (
    <div style={{ padding: '16px' }}>
      <ChargesAccountSelector
        groups={chargeGroups}
        selectedAccounts={selectedAccounts}
        onChange={setSelectedAccounts}
      />

      {!chargesData ? (
        <div
          style={{
            background: '#FFF3E0',
            border: '1px solid #FFE0B2',
            borderRadius: 8,
            padding: 16,
            color: '#1A202C',
            fontSize: 13,
          }}
        >
          Sélectionnez au moins un compte pour afficher les charges.
        </div>
      ) : (
        <>
          {/* Top row: donut + detail list */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            <ChargesDonut
              categories={chargesData.categories}
              totalCharges={chargesData.totalCharges}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleSelectCategory}
            />

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
                categories={chargesData.categories}
                totalCharges={chargesData.totalCharges}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleSelectCategory}
              />
            </div>
          </div>

          {/* Bottom: monthly chart */}
          <ChargesMonthlyChart
            categories={chargesData.categories}
            monthly={chargesData.monthly}
            selectedCategoryId={selectedCategoryId}
          />
        </>
      )}
    </div>
  );
}

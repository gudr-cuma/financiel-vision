import { useEffect, useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import { getAccountsForBilan } from '../../engine/drillDown';
import { computeTreasury, getTreasuryEntries } from '../../engine/computeTreasury';
import TreasuryKpis from './TreasuryKpis';
import TreasuryCurve from './TreasuryCurve';
import TreasuryBarChart from './TreasuryBarChart';
import TreasuryChartSwitch from './TreasuryChartSwitch';
import TopMovements from './TopMovements';
import TreasuryAccountSelector from './TreasuryAccountSelector';
import TreasuryEntriesTable from './TreasuryEntriesTable';

export default function TreasuryTab() {
  const parsedFec = useStore((s) => s.parsedFec);
  const [groupByAccount, setGroupByAccount] = useState(false);
  const [chartView, setChartView] = useState('courbe');

  const treasuryAccounts = useMemo(
    () => (parsedFec ? getAccountsForBilan(['51', '53'], parsedFec.entries) : []),
    [parsedFec]
  );
  const allCompteNums = useMemo(
    () => treasuryAccounts.map((a) => a.compteNum),
    [treasuryAccounts]
  );

  const [selectedAccounts, setSelectedAccounts] = useState(allCompteNums);

  // Réinitialise la sélection à "tous les comptes" quand un nouveau FEC est chargé.
  useEffect(() => {
    setSelectedAccounts(allCompteNums);
  }, [parsedFec]);

  const treasuryData = useMemo(() => {
    if (!parsedFec || selectedAccounts.length === 0) return null;
    const filteredEntries = parsedFec.entries.filter((e) => selectedAccounts.includes(e.compteNum));
    return computeTreasury({ ...parsedFec, entries: filteredEntries });
  }, [parsedFec, selectedAccounts]);

  const treasuryEntries = useMemo(() => {
    if (!parsedFec) return [];
    return getTreasuryEntries(parsedFec, selectedAccounts);
  }, [parsedFec, selectedAccounts]);

  if (!parsedFec) return null;

  return (
    <div>
      <TreasuryAccountSelector
        accounts={treasuryAccounts}
        selectedAccounts={selectedAccounts}
        onChange={setSelectedAccounts}
      />

      {!treasuryData ? (
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
          Sélectionnez au moins un compte pour afficher la trésorerie.
        </div>
      ) : (
        <>
          <TreasuryKpis data={treasuryData} />
          <div style={{ marginTop: 16, marginBottom: 12 }}>
            <TreasuryChartSwitch value={chartView} onChange={setChartView} />
          </div>
          <div>
            {chartView === 'courbe' ? (
              <TreasuryCurve data={treasuryData} />
            ) : (
              <TreasuryBarChart data={treasuryData} />
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <TopMovements
              top10Entrees={treasuryData.top10Entrees}
              top10Sorties={treasuryData.top10Sorties}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <TreasuryEntriesTable
              entries={treasuryEntries}
              groupByAccount={groupByAccount}
              onToggleGroup={setGroupByAccount}
            />
          </div>
        </>
      )}
    </div>
  );
}

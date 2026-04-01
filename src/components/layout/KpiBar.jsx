import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { formatPercent } from '../../engine/formatUtils';
import { KpiCard } from './KpiCard';

/**
 * Extrait le solde de trésorerie au dernier jour de chaque mois
 * depuis la courbe journalière.
 *
 * @param {Array<{ date: Date, solde: number }>} dailyCurve
 * @param {Array<{ month: number, year: number }>} exerciceMonths
 * @returns {number[]}
 */
function extractMonthlyTreasury(dailyCurve, exerciceMonths) {
  if (!dailyCurve || !dailyCurve.length || !exerciceMonths || !exerciceMonths.length) {
    return [];
  }

  return exerciceMonths.map(({ month, year }) => {
    // Filtrer les entrées du mois courant
    const monthEntries = dailyCurve.filter((d) => {
      if (!d.date) return false;
      const date = d.date instanceof Date ? d.date : new Date(d.date);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    });

    if (monthEntries.length === 0) return 0;

    // Prendre la dernière entrée du mois (triée par date)
    const sorted = [...monthEntries].sort((a, b) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return da - db;
    });

    return sorted[sorted.length - 1].solde ?? 0;
  });
}

export function KpiBar() {
  const sigResult = useStore((s) => s.sigResult);
  const treasuryData = useStore((s) => s.treasuryData);
  const parsedFec = useStore((s) => s.parsedFec);

  const kpis = useMemo(() => {
    if (!sigResult) return null;

    const { lines, monthly, caTotal } = sigResult;

    // CA
    const caSparkline = monthly?.map((m) => m.ca) ?? [];

    // EBE
    const ebeLine = lines?.find((l) => l.id === 'ebe');
    const ebeAmount = ebeLine?.amount ?? 0;
    const ebeSparkline = monthly?.map((m) => m.ebe) ?? [];
    const ebeSubInfo =
      caTotal && caTotal !== 0
        ? formatPercent((ebeAmount / caTotal) * 100) + ' du CA'
        : null;

    // Résultat net
    const resultatLine = lines?.find((l) => l.id === 'resultat_net');
    const resultatAmount = resultatLine?.amount ?? 0;
    const resultatSparkline = monthly?.map((m) => m.resultatNet) ?? [];
    const resultatColor = resultatAmount >= 0 ? '#31B700' : '#E53935';

    // Trésorerie
    const soldeActuel = treasuryData?.soldeActuel ?? 0;
    const dailyCurve = treasuryData?.dailyCurve ?? [];
    const exerciceMonths = parsedFec?.exerciceMonths ?? [];
    const tresoSparkline = extractMonthlyTreasury(dailyCurve, exerciceMonths);

    return [
      {
        id: 'ca',
        label: "Chiffre d'affaires",
        value: caTotal ?? 0,
        subInfo: null,
        sparklineData: caSparkline,
        color: '#31B700',
      },
      {
        id: 'ebe',
        label: 'EBE',
        value: ebeAmount,
        subInfo: ebeSubInfo,
        sparklineData: ebeSparkline,
        color: '#FF8200',
      },
      {
        id: 'resultat',
        label: 'Résultat Net',
        value: resultatAmount,
        subInfo: null,
        sparklineData: resultatSparkline,
        color: resultatColor,
      },
      {
        id: 'tresorerie',
        label: 'Trésorerie',
        value: soldeActuel,
        subInfo: null,
        sparklineData: tresoSparkline,
        color: '#B1DCE2',
      },
    ];
  }, [sigResult, treasuryData, parsedFec]);

  if (!kpis) return null;

  return (
    <div
      style={{
        display: 'grid',
        gap: '16px',
        marginTop: '16px',
        marginBottom: '16px',
        gridTemplateColumns: 'repeat(4, 1fr)',
      }}
      className="kpi-bar-grid"
    >
      {kpis.map((kpi) => (
        <KpiCard
          key={kpi.id}
          label={kpi.label}
          value={kpi.value}
          subInfo={kpi.subInfo}
          sparklineData={kpi.sparklineData}
          color={kpi.color}
        />
      ))}

      <style>{`
        @media (max-width: 1023px) {
          .kpi-bar-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 639px) {
          .kpi-bar-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default KpiBar;

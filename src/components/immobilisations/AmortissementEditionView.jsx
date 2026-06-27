import { useMemo } from 'react';
import { computeAmortissementEdition } from '../../engine/computeAmortissementEdition';
import { formatAmountFull, formatDate } from '../../engine/formatUtils';

const COLS = [
  { key: 'designation', label: 'Désignation', align: 'left' },
  { key: 'nBien',       label: 'N°',          align: 'right' },
  { key: 'axe',         label: 'Axe',         align: 'left' },
  { key: 'dateAcq',     label: 'Acq.',        align: 'right', type: 'date' },
  { key: 'dateMes',     label: 'Mise service', align: 'right', type: 'date' },
  { key: 'cout',        label: 'Coût',        align: 'right', type: 'amount' },
  { key: 'duree',       label: 'Durée',       align: 'right' },
  { key: 'mode',        label: 'Mode',        align: 'left' },
  { key: 'anterieur',   label: 'Antérieur',   align: 'right', type: 'amount' },
  { key: 'base',        label: 'Base',        align: 'right', type: 'amount' },
  { key: 'dotation',    label: 'Dotation',    align: 'right', type: 'amount' },
  { key: 'total',       label: 'Total',       align: 'right', type: 'amount' },
  { key: 'vnc',         label: 'VNC',         align: 'right', type: 'amount' },
];

function fmt(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'amount') return formatAmountFull(value);
  if (type === 'date') return formatDate(value);
  return String(value);
}

const th = { padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: '#4A5568',
  borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' };
const td = (align) => ({ padding: '5px 8px', fontSize: '12px', textAlign: align,
  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' });

function AmortRow({ bien }) {
  return (
    <tr>
      {COLS.map(c => (
        <td key={c.key} style={td(c.align)}>{fmt(bien[c.key], c.type)}</td>
      ))}
    </tr>
  );
}

function CompteSection({ compte }) {
  const t = compte.totaux;
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ background: '#F0F9FF', padding: '8px 10px', fontWeight: 700,
        color: '#1A202C', borderRadius: '6px 6px 0 0' }}>
        {compte.compte} — {compte.libelle}
        <span style={{ marginLeft: '8px', fontWeight: 500, color: '#718096' }}>
          ({compte.racineImmo} - {compte.racineAmort})
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{COLS.map(c => (
          <th key={c.key} style={{ ...th, textAlign: c.align }}>{c.label}</th>
        ))}</tr></thead>
        <tbody>
          {compte.biens.map(b => <AmortRow key={b.nBien} bien={b} />)}
          <tr style={{ background: '#FAFAFA', fontWeight: 700 }}>
            <td style={td('left')} colSpan={5}>Total {compte.compte}</td>
            <td style={td('right')}>{formatAmountFull(t.cout)}</td>
            <td colSpan={2} />
            <td style={td('right')}>{formatAmountFull(t.anterieur)}</td>
            <td style={td('right')}>{formatAmountFull(t.base)}</td>
            <td style={td('right')}>{formatAmountFull(t.dotation)}</td>
            <td style={td('right')}>{formatAmountFull(t.total)}</td>
            <td style={td('right')}>{formatAmountFull(t.vnc)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: '11px', color: '#718096', padding: '6px 10px' }}>
        Acquisitions de l&apos;exercice : {formatAmountFull(t.acquisitionsExercice)} ·
        Acquisitions antérieures : {formatAmountFull(t.acquisitionsAnterieures)} ·
        Solde {compte.racineImmo} : {formatAmountFull(t.soldeImmo)} ·
        VNC au 31/12 : {formatAmountFull(t.soldeNet)}
      </div>
    </div>
  );
}

const CESS_COLS = [
  { key: 'designation', label: 'Désignation', align: 'left' },
  { key: 'nBien',       label: 'N°',          align: 'right' },
  { key: 'dateAcq',     label: 'Acq.',        align: 'right', type: 'date' },
  { key: 'cout',        label: 'Coût',        align: 'right', type: 'amount' },
  { key: 'total',       label: 'Amort. total', align: 'right', type: 'amount' },
  { key: 'vnc',         label: 'VNC',         align: 'right', type: 'amount' },
  { key: 'dateCession', label: 'Cession',     align: 'right', type: 'date' },
  { key: 'prixCession', label: 'Prix cession', align: 'right', type: 'amount' },
  { key: 'plusMoinsValue', label: '+/- value', align: 'right', type: 'amount' },
  { key: 'derogatoire', label: 'Dérogatoire', align: 'right', type: 'amount' },
];

function CessionsSection({ cessions }) {
  if (!cessions.length) return null;
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '8px' }}>
        Tableau des cessions
      </div>
      {cessions.map(c => (
        <div key={c.compte} style={{ marginBottom: '20px' }}>
          <div style={{ background: '#FFF7ED', padding: '6px 10px', fontWeight: 700 }}>
            {c.compte} — {c.libelle}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{CESS_COLS.map(col => (
              <th key={col.key} style={{ ...th, textAlign: col.align }}>{col.label}</th>
            ))}</tr></thead>
            <tbody>
              {c.biens.map(b => (
                <tr key={b.nBien}>
                  {CESS_COLS.map(col => (
                    <td key={col.key} style={td(col.align)}>{fmt(b[col.key], col.type)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export function AmortissementEditionView({ exploitationData }) {
  const ed = useMemo(() => computeAmortissementEdition(exploitationData), [exploitationData]);

  if (!ed.comptes.length && !ed.cessions.length) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>
      Aucune immobilisation amortissable.
    </div>;
  }

  return (
    <div style={{ paddingTop: '8px', overflowX: 'auto' }}>
      <div style={{ fontSize: '13px', color: '#718096', marginBottom: '12px' }}>
        Exercice {formatDate(ed.exercice.debut)} → {formatDate(ed.exercice.fin)}
      </div>
      {ed.comptes.map(c => <CompteSection key={c.compte} compte={c} />)}
      <div style={{ background: '#1A202C', color: '#fff', padding: '8px 10px',
        fontWeight: 700, borderRadius: '6px', marginBottom: '24px' }}>
        Total général — Coût {formatAmountFull(ed.totalGeneral.cout)} ·
        Amort. {formatAmountFull(ed.totalGeneral.total)} ·
        VNC {formatAmountFull(ed.totalGeneral.vnc)}
      </div>
      <CessionsSection cessions={ed.cessions} />
    </div>
  );
}

export default AmortissementEditionView;

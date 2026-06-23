import { useMemo, useState } from 'react';
import { createColumnHelper, useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import useBudgetStore from '../../store/useBudgetStore';
import { buildExerciceMonths } from '../../engine/exerciceUtils';
import { repartirMontantAnnuel, resolveMontantPrevu, sortPostesByCode } from '../../domain/budget/calculs';
import { formatAmountFull } from '../../engine/formatUtils';
import AnnualEntryToggle from './AnnualEntryToggle';

const NATURE_LABELS = { charge: 'Charge', produit: 'Produit', invest: 'Investissement' };
const columnHelper = createColumnHelper();
const COLUMN_WIDTHS = { code: '90px', libelle: '360px', total: '130px', actions: '100px' };
const MONTH_COLUMN_WIDTH = '92px';

function periodeKey(month, year) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function BudgetGrid({ budget, activeScenarioId }) {
  const setLigneBudget = useBudgetStore(s => s.setLigneBudget);
  const addPoste = useBudgetStore(s => s.addPoste);
  const removePoste = useBudgetStore(s => s.removePoste);
  const updatePoste = useBudgetStore(s => s.updatePoste);

  const [newPoste, setNewPoste] = useState({ code: '', libelle: '', nature: 'charge', comptesMappes: '' });
  const [editingPosteId, setEditingPosteId] = useState(null);
  const [editValues, setEditValues] = useState({ code: '', libelle: '', comptesMappes: '' });

  const months = useMemo(
    () => buildExerciceMonths(new Date(budget.dateDebut), new Date(budget.dateFin)),
    [budget.dateDebut, budget.dateFin]
  );
  const scenarioId = activeScenarioId;

  const data = useMemo(() => sortPostesByCode(budget.postes).map(poste => {
    const valuesByPeriode = {};
    for (const { month, year } of months) {
      const key = periodeKey(month, year);
      const isExplicit = (poste.lignes ?? []).some(l => l.scenarioId === scenarioId && l.periode === key);
      valuesByPeriode[key] = {
        montant: resolveMontantPrevu(poste, budget.scenarios, scenarioId, key),
        isAuto: !isExplicit,
      };
    }
    const total = Object.values(valuesByPeriode).reduce((a, b) => a + b.montant, 0);
    return { poste, valuesByPeriode, total };
  }), [budget.postes, budget.scenarios, months, scenarioId]);

  const handleChange = (posteId, key, rawValue) => {
    const montant = parseFloat(rawValue);
    setLigneBudget(budget.id, posteId, scenarioId, key, Number.isFinite(montant) ? montant : 0);
  };

  const handleRepartir = (posteId) => (montantAnnuel) => {
    const repartis = repartirMontantAnnuel(montantAnnuel, months.length);
    months.forEach(({ month, year }, i) => {
      setLigneBudget(budget.id, posteId, scenarioId, periodeKey(month, year), repartis[i]);
    });
  };

  const startEdit = (poste) => {
    setEditingPosteId(poste.id);
    setEditValues({ code: poste.code ?? '', libelle: poste.libelle, comptesMappes: (poste.comptesMappes ?? []).join(', ') });
  };

  const cancelEdit = () => setEditingPosteId(null);

  const saveEdit = (posteId) => {
    updatePoste(budget.id, posteId, {
      code: editValues.code.trim(),
      libelle: editValues.libelle.trim(),
      comptesMappes: editValues.comptesMappes.split(/[,\s]+/).map(s => s.trim()).filter(Boolean),
    });
    setEditingPosteId(null);
  };

  const columns = useMemo(() => [
    columnHelper.accessor(row => row.poste.code, {
      id: 'code',
      header: 'Code',
      cell: ({ row }) => {
        const poste = row.original.poste;
        if (editingPosteId === poste.id) {
          return (
            <input
              value={editValues.code}
              onChange={e => setEditValues({ ...editValues, code: e.target.value })}
              placeholder="Code"
              style={{ width: '80px', padding: '5px 8px', fontSize: '12px', border: '1px solid #B1DCE2', borderRadius: '4px' }}
            />
          );
        }
        return poste.code
          ? <span style={{ fontSize: '12px', fontWeight: 700, color: '#1A202C', background: '#F8FAFB', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '2px 6px' }}>{poste.code}</span>
          : <span style={{ fontSize: '12px', color: '#A0AEC0' }}>—</span>;
      },
    }),
    columnHelper.accessor(row => row.poste.libelle, {
      id: 'libelle',
      header: 'Poste',
      cell: ({ row }) => {
        const poste = row.original.poste;
        if (editingPosteId === poste.id) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <input
                value={editValues.libelle}
                onChange={e => setEditValues({ ...editValues, libelle: e.target.value })}
                placeholder="Libellé du poste"
                style={{ padding: '5px 8px', fontSize: '13px', border: '1px solid #B1DCE2', borderRadius: '4px' }}
              />
              <input
                value={editValues.comptesMappes}
                onChange={e => setEditValues({ ...editValues, comptesMappes: e.target.value })}
                placeholder="Comptes mappés (ex. 641, 6064)"
                style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #B1DCE2', borderRadius: '4px' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => saveEdit(poste.id)} title="Valider" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#31B700', fontWeight: 700 }}>✓</button>
                <button onClick={cancelEdit} title="Annuler" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#718096' }}>✕</button>
              </div>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#1A202C' }}>{poste.libelle}</div>
              <div style={{ fontSize: '11px', color: '#718096' }}>
                {NATURE_LABELS[poste.nature]}
                {poste.comptesMappes?.length > 0 && ` · ${poste.comptesMappes.join(', ')}`}
              </div>
            </div>
            <button
              onClick={() => startEdit(poste)}
              title="Modifier le poste"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#718096', fontSize: '12px', flexShrink: 0 }}
            >✏️</button>
          </div>
        );
      },
    }),
    ...months.map(({ month, year, shortLabel }) => {
      const key = periodeKey(month, year);
      return columnHelper.accessor(row => row.valuesByPeriode[key].montant, {
        id: key,
        header: `${shortLabel} ${year}`,
        cell: ({ row }) => {
          const cellValue = row.original.valuesByPeriode[key];
          return (
            <input
              key={cellValue.montant}
              type="number"
              step="0.01"
              defaultValue={cellValue.montant}
              title={cellValue.isAuto ? 'Calculé automatiquement (médian × coefficient) — modifiez pour surcharger' : 'Valeur saisie'}
              onBlur={e => handleChange(row.original.poste.id, key, e.target.value)}
              style={{
                width: '76px', padding: '4px 6px', fontSize: '12px', borderRadius: '4px', textAlign: 'right',
                border: `1px solid ${cellValue.isAuto ? '#E2E8F0' : '#B1DCE2'}`,
                background: cellValue.isAuto ? '#F8FAFB' : '#FFFFFF',
                fontStyle: cellValue.isAuto ? 'italic' : 'normal',
                color: cellValue.isAuto ? '#718096' : '#1A202C',
              }}
            />
          );
        },
      });
    }),
    columnHelper.accessor('total', {
      header: 'Total',
      cell: ({ row }) => <strong style={{ fontSize: '13px' }}>{formatAmountFull(row.original.total)}</strong>,
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AnnualEntryToggle onApply={handleRepartir(row.original.poste.id)} />
          <button
            onClick={() => removePoste(budget.id, row.original.poste.id)}
            title="Supprimer le poste"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#718096' }}
          >🗑</button>
        </div>
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [months, budget.id, scenarioId, editingPosteId, editValues]);

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  const handleAddPoste = () => {
    if (!newPoste.libelle.trim()) return;
    addPoste(budget.id, {
      code: newPoste.code.trim(),
      libelle: newPoste.libelle.trim(),
      nature: newPoste.nature,
      comptesMappes: newPoste.comptesMappes.split(/[,\s]+/).map(s => s.trim()).filter(Boolean),
    });
    setNewPoste({ code: '', libelle: '', nature: 'charge', comptesMappes: '' });
  };

  return (
    <div style={{ paddingTop: '16px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="Code (ex. ACH001)"
          value={newPoste.code}
          onChange={e => setNewPoste({ ...newPoste, code: e.target.value })}
          style={{ padding: '7px 10px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px', width: '110px' }}
        />
        <input
          placeholder="Libellé du poste"
          value={newPoste.libelle}
          onChange={e => setNewPoste({ ...newPoste, libelle: e.target.value })}
          style={{ padding: '7px 10px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px', width: '220px' }}
        />
        <select
          value={newPoste.nature}
          onChange={e => setNewPoste({ ...newPoste, nature: e.target.value })}
          style={{ padding: '7px 10px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px' }}
        >
          <option value="charge">Charge</option>
          <option value="produit">Produit</option>
          <option value="invest">Investissement</option>
        </select>
        <input
          placeholder="Comptes mappés (ex. 641, 6064)"
          value={newPoste.comptesMappes}
          onChange={e => setNewPoste({ ...newPoste, comptesMappes: e.target.value })}
          style={{ padding: '7px 10px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px', width: '320px' }}
        />
        <button
          onClick={handleAddPoste}
          style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 700, color: '#FFFFFF', background: '#31B700', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          + Ajouter poste
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
        <colgroup>
          {table.getHeaderGroups()[0]?.headers.map(h => (
            <col key={h.id} style={{ width: COLUMN_WIDTHS[h.column.id] ?? MONTH_COLUMN_WIDTH }} />
          ))}
        </colgroup>
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th key={h.id} style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #E2E8F0', color: '#718096', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} style={{ padding: '8px', borderBottom: '1px solid #F1F5F9', overflow: 'hidden' }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={months.length + 4} style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>
              Aucun poste. Ajoutez-en un ci-dessus.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default BudgetGrid;

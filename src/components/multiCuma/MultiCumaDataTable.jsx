// src/components/multiCuma/MultiCumaDataTable.jsx
import { Fragment } from 'react';
import { DATA_COLUMNS, formatCell } from '../../domain/multiCuma/columns';

const th = {
  position: 'sticky', top: 0, background: '#F1F5F9', zIndex: 1,
  padding: '8px 10px', fontSize: '12px', fontWeight: 700, color: '#4A5568',
  textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '2px solid #E2E8F0',
};
const td = { padding: '6px 10px', fontSize: '12px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #EDF2F7' };
const leftAlign = { textAlign: 'left' };
const frozen = { position: 'sticky', left: 0, background: '#fff', zIndex: 1 };

function DataRow({ row }) {
  return (
    <tr>
      {DATA_COLUMNS.map((c) => (
        <td key={c.key} style={{ ...td, ...(c.format === 'text' ? leftAlign : {}), ...(c.frozen ? frozen : {}) }}>
          {formatCell(row[c.key], c.format)}
        </td>
      ))}
    </tr>
  );
}

/**
 * Rendu récursif d'un nœud de groupe (avec repli).
 */
function GroupNode({ node, path, depth, collapsed, onToggle }) {
  const id = path;
  const isCollapsed = collapsed.has(id);
  return (
    <Fragment>
      <tr onClick={() => onToggle(id)} style={{ cursor: 'pointer', background: depth === 0 ? '#E8F0FE' : '#F5F8FF' }}>
        <td colSpan={DATA_COLUMNS.length} style={{ ...td, ...leftAlign, fontWeight: 600, paddingLeft: `${10 + depth * 18}px` }}>
          <span style={{ display: 'inline-block', width: '14px' }}>{isCollapsed ? '▸' : '▾'}</span>
          {node.label} : {node.key} <span style={{ color: '#718096', fontWeight: 400 }}>({node.count})</span>
        </td>
      </tr>
      {!isCollapsed && node.children && node.children.map((child) => (
        <GroupNode
          key={`${id}/${child.key}`}
          node={child}
          path={`${id}/${child.key}`}
          depth={depth + 1}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      ))}
      {!isCollapsed && node.rows && node.rows.map((r, i) => <DataRow key={i} row={r} />)}
    </Fragment>
  );
}

/**
 * @param {{ groups: object[]|null, flatRows: object[], collapsed: Set<string>, onToggle: (id: string) => void }} props
 * groups = arbre issu de groupMultiLevel (null si aucun regroupement).
 */
export function MultiCumaDataTable({ groups, flatRows, collapsed, onToggle }) {
  return (
    <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
        <thead>
          <tr>
            {DATA_COLUMNS.map((c) => (
              <th key={c.key} style={{ ...th, ...(c.format === 'text' ? leftAlign : {}), ...(c.frozen ? { ...frozen, background: '#F1F5F9', zIndex: 2 } : {}) }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups
            ? groups.map((n) => (
                <GroupNode key={n.key} node={n} path={n.key} depth={0} collapsed={collapsed} onToggle={onToggle} />
              ))
            : flatRows.map((r, i) => <DataRow key={i} row={r} />)}
        </tbody>
      </table>
    </div>
  );
}

export default MultiCumaDataTable;

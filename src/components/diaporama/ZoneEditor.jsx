import { GRAPH_OPTIONS } from '../../engine/diaporamaConfig';
import { RichTextEditor } from './RichTextEditor';

/**
 * ZoneEditor — éditeur d'une zone de slide (texte ou graphique).
 *
 * Props:
 *   zoneIndex {number}   — index de la zone dans le slide
 *   zoneDef   {object}   — définition de zone du template (label, defaultType, x, y, w, h)
 *   zone      {object}   — données de zone du store (type, content, graphId)
 *   onChange  {function} — (zoneIndex, changes) => void
 *   storeData {object}   — snapshot du store pour savoir si données disponibles
 *   label     {string}   — label affiché (du template)
 */
export function ZoneEditor({ zoneIndex, zoneDef, zone, onChange, storeData, label }) {
  if (!zone || !zoneDef) return null;

  const hasN1 = storeData?.sigResultN1 != null;
  const hasAnalytique = storeData?.analytiqueData != null;

  // Valeur du dropdown : '__text__' ou graphId
  const dropdownValue = zone.type === 'text' ? '__text__' : (zone.graphId ?? '__text__');

  const handleDropdownChange = (e) => {
    const val = e.target.value;
    if (val === '__text__') {
      onChange(zoneIndex, { type: 'text', graphId: null });
    } else {
      onChange(zoneIndex, { type: 'graph', graphId: val });
    }
  };

  const comparisonOptions = GRAPH_OPTIONS.filter(g => g.group === 'comparison');
  const fecOptions        = GRAPH_OPTIONS.filter(g => g.group === 'fec');
  const analytiqueOptions = GRAPH_OPTIONS.filter(g => g.group === 'analytique');

  // Trouver le label du graphique sélectionné
  const selectedGraphOption = zone.type === 'graph' && zone.graphId
    ? GRAPH_OPTIONS.find(g => g.id === zone.graphId)
    : null;

  const isGraphUnavailable = selectedGraphOption && (
    (selectedGraphOption.requiresN1         && !hasN1) ||
    (selectedGraphOption.requiresAnalytique && !hasAnalytique)
  );

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Label de la zone */}
      <div style={{
        fontSize: '12px', fontWeight: 700, color: '#4A5568',
        textTransform: 'uppercase', letterSpacing: '0.04em',
        marginBottom: '8px',
      }}>
        {label ?? `Zone ${zoneIndex + 1}`}
      </div>

      {/* Dropdown type + graphique */}
      <select
        value={dropdownValue}
        onChange={handleDropdownChange}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#1A202C',
          background: '#FFFFFF',
          cursor: 'pointer',
          marginBottom: '10px',
          outline: 'none',
        }}
      >
        <option value="__text__">Texte libre</option>

        <optgroup label="Comparaison N/N-1">
          {comparisonOptions.map(g => {
            const disabled = g.requiresN1 && !hasN1;
            return (
              <option key={g.id} value={g.id} disabled={disabled}>
                {g.label}{disabled ? ' (données manquantes)' : ''}
              </option>
            );
          })}
        </optgroup>

        <optgroup label="Exercice N">
          {fecOptions.map(g => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </optgroup>

        <optgroup label="Balance analytique">
          {analytiqueOptions.map(g => {
            const disabled = g.requiresAnalytique && !hasAnalytique;
            return (
              <option key={g.id} value={g.id} disabled={disabled}>
                {g.label}{disabled ? ' (données manquantes)' : ''}
              </option>
            );
          })}
        </optgroup>
      </select>

      {/* Contenu selon type */}
      {zone.type === 'text' ? (
        <RichTextEditor
          value={zone.content ?? ''}
          onChange={html => onChange(zoneIndex, { content: html })}
          minHeight={100}
        />
      ) : zone.type === 'graph' && zone.graphId ? (
        <div style={{
          background: isGraphUnavailable ? '#FFF3E0' : '#F0FBF0',
          border: `1px solid ${isGraphUnavailable ? '#FECB89' : '#C6EBC6'}`,
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
          fontSize: '13px',
          color: isGraphUnavailable ? '#E57300' : '#268E00',
        }}>
          {isGraphUnavailable
            ? `Graphique non disponible — ${selectedGraphOption?.label}`
            : selectedGraphOption?.label ?? zone.graphId
          }
        </div>
      ) : null}
    </div>
  );
}

export default ZoneEditor;

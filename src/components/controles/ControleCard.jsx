import { formatAmountFull } from '../../engine/formatUtils';

const STATUS_COLORS = {
  ok: '#31B700',
  ko: '#E53935',
  neutral: '#CBD5E0',
};

function Toggle({ status }) {
  return (
    <div style={{
      width: '32px', height: '17px',
      background: STATUS_COLORS[status],
      borderRadius: '10px',
      position: 'relative',
      flexShrink: 0,
    }}>
      {status !== 'neutral' && (
        <div style={{
          width: '13px', height: '13px',
          background: '#fff',
          borderRadius: '50%',
          position: 'absolute',
          top: '2px',
          [status === 'ok' ? 'right' : 'left']: '2px',
        }} />
      )}
    </div>
  );
}

/**
 * ControleCard — carte de contrôle de cohérence (capital social, emprunts, comptable…).
 * Props :
 *   label          (string) — intitulé du contrôle
 *   valueALabel / valueA — premier terme comparé
 *   valueBLabel / valueB — second terme comparé
 *   ecart          (number) — |valueA - valueB|, affiché uniquement si status === 'ko'
 *   status         ('ok' | 'ko' | 'neutral')
 *   neutralMessage (string) — message d'invite affiché si status === 'neutral'
 */
export function ControleCard({ label, valueALabel, valueA, valueBLabel, valueB, ecart, status, neutralMessage }) {
  const isNeutral = status === 'neutral';

  return (
    <div style={{
      background: isNeutral ? '#F8FAFB' : '#FFFFFF',
      border: isNeutral ? '1px dashed #CBD5E0' : '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '14px 16px',
      boxShadow: isNeutral ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: isNeutral ? '#A0AEC0' : '#1A202C' }}>
          {label}
        </div>
        <Toggle status={status} />
      </div>

      {isNeutral ? (
        <div style={{ fontSize: '12px', color: '#A0AEC0' }}>
          ⏳ {neutralMessage}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', color: '#718096' }}>{valueALabel}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C' }}>{formatAmountFull(valueA)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', color: '#718096' }}>{valueBLabel}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C' }}>{formatAmountFull(valueB)}</div>
            </div>
          </div>
          {status === 'ko' && (
            <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 600, color: '#E53935' }}>
              Écart : {formatAmountFull(ecart)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ControleCard;

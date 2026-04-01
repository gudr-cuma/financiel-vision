import { useState, useRef, useEffect } from 'react';

export function Tooltip({ children, content }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState('top'); // 'top' | 'bottom'
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (visible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current.offsetHeight || 80;
      const spaceAbove = triggerRect.top;
      const spaceBelow = window.innerHeight - triggerRect.bottom;

      if (spaceAbove >= tooltipHeight + 8) {
        setPosition('top');
      } else if (spaceBelow >= tooltipHeight + 8) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [visible]);

  const tooltipStyle = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    ...(position === 'top'
      ? { bottom: 'calc(100% + 8px)' }
      : { top: 'calc(100% + 8px)' }),
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    borderRadius: '8px',
    padding: '12px',
    zIndex: 50,
    minWidth: '160px',
    maxWidth: '280px',
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#1A202C',
    pointerEvents: 'none',
    border: '1px solid #E2E8F0',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  };

  const arrowStyle = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    ...(position === 'top'
      ? {
          bottom: '-6px',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #E2E8F0',
        }
      : {
          top: '-6px',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid #E2E8F0',
        }),
  };

  const arrowInnerStyle = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    ...(position === 'top'
      ? {
          bottom: '-5px',
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid #FFFFFF',
        }
      : {
          top: '-5px',
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: '5px solid #FFFFFF',
        }),
  };

  return (
    <span
      ref={triggerRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <span ref={tooltipRef} style={tooltipStyle} role="tooltip">
          <span style={arrowStyle} />
          <span style={arrowInnerStyle} />
          {content}
        </span>
      )}
    </span>
  );
}

export default Tooltip;

import { useState, useRef, useCallback, useEffect } from 'react';
import useStore from '../../store/useStore';
import { buildAnalyseContext } from '../../engine/buildAnalyseContext';

// ---------------------------------------------------------------------------
// Simple markdown → JSX renderer
// ---------------------------------------------------------------------------
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;

  function inlineFormat(str) {
    // Bold + italic
    const parts = str.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  }

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '16px 0' }} />);
      i++;
      continue;
    }

    // H1
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      elements.push(<h1 key={key++} style={{ fontSize: '20px', fontWeight: 700, color: '#1A202C', margin: '24px 0 8px' }}>{inlineFormat(line.slice(2))}</h1>);
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      elements.push(<h2 key={key++} style={{ fontSize: '17px', fontWeight: 700, color: '#1A202C', margin: '20px 0 6px', paddingBottom: '4px', borderBottom: '2px solid #B1DCE2' }}>{inlineFormat(line.slice(3))}</h2>);
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} style={{ fontSize: '15px', fontWeight: 600, color: '#2D3748', margin: '14px 0 4px' }}>{inlineFormat(line.slice(4))}</h3>);
      i++;
      continue;
    }

    // H4
    if (line.startsWith('#### ')) {
      elements.push(<h4 key={key++} style={{ fontSize: '14px', fontWeight: 600, color: '#4A5568', margin: '10px 0 2px' }}>{inlineFormat(line.slice(5))}</h4>);
      i++;
      continue;
    }

    // Table — collect consecutive table lines
    if (line.trim().startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const headerRow = tableLines[0];
      const isHeaderSep = (l) => /^\s*\|[\s\-:|]+\|\s*$/.test(l);
      const headerCells = headerRow.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const bodyRows = tableLines.slice(1).filter(l => !isHeaderSep(l));
      elements.push(
        <div key={key++} style={{ overflowX: 'auto', margin: '10px 0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F7FAFC' }}>
                {headerCells.map((cell, ci) => (
                  <th key={ci} style={{ border: '1px solid #E2E8F0', padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap' }}>
                    {inlineFormat(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => {
                const cells = row.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
                return (
                  <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? '#FFFFFF' : '#F7FAFC' }}>
                    {cells.map((cell, ci) => (
                      <td key={ci} style={{ border: '1px solid #E2E8F0', padding: '6px 10px', color: '#2D3748', whiteSpace: 'nowrap' }}>
                        {inlineFormat(cell.trim())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered list — collect consecutive list items
    if (/^[\s]*[-*] /.test(line)) {
      const items = [];
      const indent = line.match(/^(\s*)/)[1].length;
      while (i < lines.length && /^[\s]*[-*] /.test(lines[i])) {
        const curIndent = lines[i].match(/^(\s*)/)[1].length;
        items.push({ text: lines[i].replace(/^[\s]*[-*] /, ''), indent: curIndent });
        i++;
      }
      elements.push(
        <ul key={key++} style={{ margin: '4px 0', paddingLeft: '0', listStyle: 'none' }}>
          {items.map((item, ii) => (
            <li key={ii} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', margin: '2px 0', paddingLeft: `${item.indent + 16}px`, fontSize: '14px', color: '#2D3748', lineHeight: 1.6 }}>
              <span style={{ color: '#B1DCE2', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>•</span>
              <span>{inlineFormat(item.text)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={key++} style={{ height: '8px' }} />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} style={{ margin: '3px 0', fontSize: '14px', color: '#2D3748', lineHeight: 1.7 }}>
        {inlineFormat(line)}
      </p>
    );
    i++;
  }

  return elements;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function AnalyseTab() {
  const parsedFec = useStore(s => s.parsedFec);
  const sigResult = useStore(s => s.sigResult);
  const bilanData = useStore(s => s.bilanData);
  const treasuryData = useStore(s => s.treasuryData);
  const chargesData = useStore(s => s.chargesData);

  const LS_KEY = 'fv_anthropic_key';
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_KEY) ?? '');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(!!localStorage.getItem(LS_KEY));

  // Persist key to localStorage on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (apiKey.trim().startsWith('sk-')) {
        localStorage.setItem(LS_KEY, apiKey.trim());
        setKeySaved(true);
      } else if (!apiKey) {
        localStorage.removeItem(LS_KEY);
        setKeySaved(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [apiKey]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const canGenerate = apiKey.trim().startsWith('sk-') && !isGenerating;

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setText('');
    setError(null);

    try {
      const { systemPrompt, userMessage } = buildAnalyseContext(
        parsedFec, sigResult, bilanData, treasuryData, chargesData
      );

      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 8192,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message ?? `Erreur API ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop(); // keep incomplete last chunk

        for (const event of events) {
          const lines = event.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;
            try {
              const data = JSON.parse(raw);
              if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                setText(prev => prev + data.delta.text);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [apiKey, canGenerate, parsedFec, sigResult, bilanData, treasuryData, chargesData]);

  const stop = () => {
    abortRef.current?.abort();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      {/* API Key card */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Clé API Anthropic
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            style={{
              flex: 1,
              padding: '9px 12px',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'monospace',
              color: '#1A202C',
              background: '#FAFAFA',
              outline: 'none',
            }}
          />
          <button
            onClick={() => setShowKey(v => !v)}
            style={{ padding: '9px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#718096' }}
            title={showKey ? 'Masquer' : 'Afficher'}
          >
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#A0AEC0' }}>
            🔒 Stockée dans le navigateur (localStorage) — jamais transmise ailleurs qu'à l'API Anthropic.
          </p>
          {keySaved && (
            <span style={{ fontSize: '12px', color: '#268E00', fontWeight: 500, flexShrink: 0, marginLeft: '12px' }}>
              ✓ Clé sauvegardée
            </span>
          )}
          {apiKey && !keySaved && (
            <span style={{ fontSize: '12px', color: '#A0AEC0', flexShrink: 0, marginLeft: '12px' }}>
              Format invalide
            </span>
          )}
        </div>
      </div>

      {/* Generate button */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={isGenerating ? stop : generate}
          disabled={!isGenerating && !canGenerate}
          style={{
            padding: '11px 28px',
            borderRadius: '8px',
            border: 'none',
            cursor: isGenerating ? 'pointer' : (!canGenerate ? 'not-allowed' : 'pointer'),
            fontSize: '14px',
            fontWeight: 600,
            background: isGenerating ? '#E53935' : (!canGenerate ? '#E2E8F0' : '#FF8200'),
            color: isGenerating ? '#fff' : (!canGenerate ? '#A0AEC0' : '#fff'),
            transition: 'background 0.2s',
          }}
        >
          {isGenerating ? '⏹ Arrêter la génération' : '✨ Générer l\'analyse IA'}
        </button>

        {text && !isGenerating && (
          <button
            onClick={copyToClipboard}
            style={{ padding: '11px 20px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#718096' }}
          >
            📋 Copier
          </button>
        )}

        {isGenerating && (
          <span style={{ fontSize: '13px', color: '#718096', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #B1DCE2', borderTopColor: '#FF8200', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Analyse en cours...
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#C53030', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Result */}
      {text && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '28px 32px' }}>
          {renderMarkdown(text)}
          {isGenerating && (
            <span style={{ display: 'inline-block', width: '2px', height: '16px', background: '#FF8200', animation: 'blink 1s step-end infinite', verticalAlign: 'middle', marginLeft: '2px' }} />
          )}
        </div>
      )}

      {/* Empty state */}
      {!text && !isGenerating && !error && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: '#A0AEC0' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🤖</div>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#718096', margin: '0 0 8px' }}>Analyse financière par IA</p>
          <p style={{ fontSize: '13px', margin: 0 }}>
            Renseignez votre clé API Anthropic puis cliquez sur « Générer l'analyse IA ».<br />
            Le modèle Claude analysera toutes les données de l'exercice et produira un rapport complet.
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

export default AnalyseTab;

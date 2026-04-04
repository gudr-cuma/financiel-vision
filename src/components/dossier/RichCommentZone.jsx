import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';

const EXTENSIONS = [StarterKit, Underline, TextStyle, FontSize];

const FONT_SIZES = [
  { label: 'Petit',      value: '10px' },
  { label: 'Normal',     value: null   },
  { label: 'Grand',      value: '15px' },
  { label: 'Très grand', value: '20px' },
];

// ── Bouton toolbar ────────────────────────────────────────────────────────────
function ToolBtn({ active, onClick, title, children }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        padding: '3px 8px',
        fontSize: '13px',
        fontWeight: 700,
        border: '1px solid',
        borderColor: active ? '#FF8200' : '#E2E8F0',
        borderRadius: '4px',
        background: active ? '#FFF3E0' : '#FFFFFF',
        color: active ? '#E57300' : '#1A202C',
        cursor: 'pointer',
        lineHeight: 1.4,
        userSelect: 'none',
      }}
    >
      {children}
    </button>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export function RichCommentZone({ tab, comments, onCommentChange }) {
  const content = comments[tab] || '';

  const editor = useEditor({
    extensions: EXTENSIONS,
    content,
    onUpdate: ({ editor }) => onCommentChange(tab, editor.getHTML()),
  });

  // Sync quand la source externe change (ex: changement de CUMA)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content || '<p></p>', false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  const activeFontSize = editor.getAttributes('textStyle').fontSize ?? null;

  return (
    <div style={{ marginTop: '16px', marginBottom: '8px' }}>
      <div style={{
        fontSize: '12px', fontWeight: 700, color: '#718096',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
      }}>
        Commentaires
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap',
        padding: '5px 8px',
        background: '#F8FAFB',
        border: '1px solid #E2E8F0',
        borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
      }}>
        <ToolBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Gras (Ctrl+B)"
        ><strong>G</strong></ToolBtn>

        <ToolBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italique (Ctrl+I)"
        ><em>I</em></ToolBtn>

        <ToolBtn
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Souligné (Ctrl+U)"
        ><u>S</u></ToolBtn>

        <div style={{ width: '1px', height: '20px', background: '#E2E8F0', margin: '0 2px' }} />

        {/* Taille de police */}
        <select
          value={activeFontSize ?? ''}
          onChange={e => {
            const val = e.target.value;
            if (!val) {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(val).run();
            }
          }}
          style={{
            fontSize: '12px', color: '#1A202C',
            border: '1px solid #E2E8F0', borderRadius: '4px',
            padding: '2px 6px', background: '#FFFFFF', cursor: 'pointer',
            outline: 'none',
          }}
          title="Taille de police"
        >
          {FONT_SIZES.map(({ label, value }) => (
            <option key={label} value={value ?? ''}>{label}</option>
          ))}
        </select>
      </div>

      {/* Zone de texte */}
      <div style={{
        border: '1px solid #E2E8F0',
        borderRadius: '0 0 8px 8px',
        background: '#FFFFFF',
        minHeight: '80px',
        cursor: 'text',
      }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} className="rich-comment-editor" />
      </div>
    </div>
  );
}

export default RichCommentZone;

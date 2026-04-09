import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';

const EXTENSIONS = [StarterKit, Underline, TextStyle, FontSize];

const FONT_SIZES = [
  { label: 'Petit',       value: '10px' },
  { label: 'Normal',      value: null   },
  { label: 'Grand',       value: '15px' },
  { label: 'Très grand',  value: '20px' },
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

/**
 * RichTextEditor — éditeur de texte riche Tiptap autonome.
 *
 * Props:
 *   value     {string}   — contenu HTML
 *   onChange  {function} — callback(html: string)
 *   minHeight {number}   — hauteur min de la zone d'édition (px, défaut 100)
 */
export function RichTextEditor({ value = '', onChange, minHeight = 100 }) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  // Sync depuis l'extérieur (changement de slide sélectionné, etc.)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '<p></p>', false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const activeFontSize = editor.getAttributes('textStyle').fontSize ?? null;

  return (
    <div>
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
          title="Gras"
        >
          <strong>G</strong>
        </ToolBtn>

        <ToolBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italique"
        >
          <em>I</em>
        </ToolBtn>

        <ToolBtn
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Souligné"
        >
          <u>S</u>
        </ToolBtn>

        <ToolBtn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Liste à puces"
        >
          •
        </ToolBtn>

        <div style={{ width: '1px', height: '20px', background: '#E2E8F0', margin: '0 2px' }} />

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
          {FONT_SIZES.map(({ label, value: v }) => (
            <option key={label} value={v ?? ''}>{label}</option>
          ))}
        </select>
      </div>

      {/* Zone d'édition */}
      <div
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: '0 0 8px 8px',
          background: '#FFFFFF',
          minHeight: `${minHeight}px`,
          cursor: 'text',
        }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} className="rich-comment-editor" />
      </div>
    </div>
  );
}

export default RichTextEditor;

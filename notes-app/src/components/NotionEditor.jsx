import React, { useRef, useCallback, useState, useEffect } from 'react';

// Notion-style contentEditable block editor
export default function NotionEditor({ value, onChange, placeholder, disabled }) {
  const editorRef = useRef(null);
  const [showSlash, setShowSlash] = useState(false);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedCmd, setSelectedCmd] = useState(0);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });

  const commands = [
    { id: 'h1', label: 'หัวข้อใหญ่', icon: 'H1', desc: 'Heading 1', tag: 'h2' },
    { id: 'h2', label: 'หัวข้อรอง', icon: 'H2', desc: 'Heading 2', tag: 'h3' },
    { id: 'h3', label: 'หัวข้อเล็ก', icon: 'H3', desc: 'Heading 3', tag: 'h4' },
    { id: 'bullet', label: 'รายการ', icon: '•', desc: 'Bullet list' },
    { id: 'number', label: 'ลำดับเลข', icon: '1.', desc: 'Numbered list' },
    { id: 'todo', label: 'เช็คลิสต์', icon: '☐', desc: 'To-do list' },
    { id: 'quote', label: 'อ้างอิง', icon: '"', desc: 'Quote block' },
    { id: 'divider', label: 'เส้นคั่น', icon: '—', desc: 'Divider' },
    { id: 'code', label: 'โค้ด', icon: '</>', desc: 'Code block' },
    { id: 'callout', label: 'Callout', icon: '💡', desc: 'Callout box' },
  ];

  const filteredCmds = commands.filter(c =>
    c.label.includes(slashFilter) || c.id.includes(slashFilter.toLowerCase()) || c.desc.toLowerCase().includes(slashFilter.toLowerCase())
  );

  // Sync value -> editor
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const exec = (cmd, val) => { document.execCommand(cmd, false, val); editorRef.current?.focus(); emitChange(); };

  const getCaretCoords = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return { top: 0, left: 0 };
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rect = range.getClientRects()[0];
    if (!rect) {
      const span = document.createElement('span');
      range.insertNode(span);
      const r = span.getBoundingClientRect();
      span.parentNode.removeChild(span);
      return { top: r.top, left: r.left };
    }
    return { top: rect.top, left: rect.left };
  };

  const handleSlashCommand = (cmd) => {
    // Remove the slash text
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === 3) {
        const text = node.textContent;
        const slashIdx = text.lastIndexOf('/');
        if (slashIdx >= 0) {
          node.textContent = text.substring(0, slashIdx);
        }
      }
    }

    switch (cmd.id) {
      case 'h1': exec('formatBlock', '<h2>'); break;
      case 'h2': exec('formatBlock', '<h3>'); break;
      case 'h3': exec('formatBlock', '<h4>'); break;
      case 'bullet': exec('insertUnorderedList'); break;
      case 'number': exec('insertOrderedList'); break;
      case 'quote': exec('formatBlock', '<blockquote>'); break;
      case 'code':
        exec('formatBlock', '<pre>');
        break;
      case 'divider':
        exec('insertHTML', '<hr><p><br></p>');
        break;
      case 'todo':
        exec('insertHTML', '<div class="notion-todo"><input type="checkbox" onclick="this.parentElement.classList.toggle(\'done\')"> <span>สิ่งที่ต้องทำ</span></div><p><br></p>');
        break;
      case 'callout':
        exec('insertHTML', '<div class="notion-callout">💡 เขียนข้อความที่นี่...</div><p><br></p>');
        break;
      default: break;
    }
    setShowSlash(false);
    setSlashFilter('');
  };

  const handleKeyDown = (e) => {
    if (showSlash) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCmd(p => Math.min(p + 1, filteredCmds.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedCmd(p => Math.max(p - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (filteredCmds[selectedCmd]) handleSlashCommand(filteredCmds[selectedCmd]); }
      else if (e.key === 'Escape') { setShowSlash(false); setSlashFilter(''); }
      return;
    }

    // Tab for indent
    if (e.key === 'Tab') {
      e.preventDefault();
      exec(e.shiftKey ? 'outdent' : 'indent');
    }
  };

  const handleInput = () => {
    emitChange();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const node = sel.anchorNode;
    if (node?.nodeType === 3) {
      const text = node.textContent.substring(0, sel.anchorOffset);
      const slashIdx = text.lastIndexOf('/');
      if (slashIdx >= 0 && (slashIdx === 0 || text[slashIdx - 1] === ' ' || text[slashIdx - 1] === '\n')) {
        const filter = text.substring(slashIdx + 1);
        setSlashFilter(filter);
        setSelectedCmd(0);
        const coords = getCaretCoords();
        const editorRect = editorRef.current.getBoundingClientRect();
        setSlashPos({ top: coords.top - editorRect.top + 24, left: coords.left - editorRect.left });
        setShowSlash(true);
        return;
      }
    }
    setShowSlash(false);
  };

  // Floating toolbar on text selection
  const handleMouseUp = () => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (sel.isCollapsed || !sel.rangeCount) { setShowToolbar(false); return; }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      setToolbarPos({ top: rect.top - editorRect.top - 44, left: rect.left - editorRect.left + rect.width / 2 - 120 });
      setShowToolbar(true);
    }, 10);
  };

  const handleBlur = () => { setTimeout(() => setShowToolbar(false), 200); };

  return (
    <div style={editorStyles.wrap}>
      {/* Floating Toolbar */}
      {showToolbar && !disabled && (
        <div style={{ ...editorStyles.floatingToolbar, top: toolbarPos.top, left: toolbarPos.left }}>
          <button style={editorStyles.tbBtn} onMouseDown={e => { e.preventDefault(); exec('bold'); }} title="Bold"><b>B</b></button>
          <button style={editorStyles.tbBtn} onMouseDown={e => { e.preventDefault(); exec('italic'); }} title="Italic"><i>I</i></button>
          <button style={editorStyles.tbBtn} onMouseDown={e => { e.preventDefault(); exec('underline'); }} title="Underline"><u>U</u></button>
          <button style={editorStyles.tbBtn} onMouseDown={e => { e.preventDefault(); exec('strikeThrough'); }} title="Strikethrough"><s>S</s></button>
          <div style={editorStyles.tbDivider}/>
          <button style={editorStyles.tbBtn} onMouseDown={e => { e.preventDefault(); exec('formatBlock', '<h2>'); }} title="H1">H1</button>
          <button style={editorStyles.tbBtn} onMouseDown={e => { e.preventDefault(); exec('formatBlock', '<h3>'); }} title="H2">H2</button>
          <div style={editorStyles.tbDivider}/>
          <button style={editorStyles.tbBtn} onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }} title="List">•</button>
          <button style={editorStyles.tbBtn} onMouseDown={e => { e.preventDefault(); exec('createLink', prompt('URL:')); }} title="Link">🔗</button>
        </div>
      )}

      {/* Slash Command Menu */}
      {showSlash && !disabled && (
        <div style={{ ...editorStyles.slashMenu, top: slashPos.top, left: Math.max(0, slashPos.left) }}>
          <div style={editorStyles.slashHeader}>บล็อกพื้นฐาน</div>
          {filteredCmds.map((cmd, i) => (
            <div
              key={cmd.id}
              style={{ ...editorStyles.slashItem, ...(i === selectedCmd ? editorStyles.slashItemActive : {}) }}
              onMouseDown={(e) => { e.preventDefault(); handleSlashCommand(cmd); }}
              onMouseEnter={() => setSelectedCmd(i)}
            >
              <span style={editorStyles.slashIcon}>{cmd.icon}</span>
              <div>
                <div style={editorStyles.slashLabel}>{cmd.label}</div>
                <div style={editorStyles.slashDesc}>{cmd.desc}</div>
              </div>
            </div>
          ))}
          {filteredCmds.length === 0 && <div style={editorStyles.slashEmpty}>ไม่พบคำสั่ง</div>}
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        className="notion-editor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={handleMouseUp}
        onBlur={handleBlur}
        data-placeholder={placeholder || 'พิมพ์ / เพื่อเปิดเมนูคำสั่ง...'}
        style={editorStyles.editor}
      />
    </div>
  );
}

const editorStyles = {
  wrap: { position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' },
  editor: {
    flex: 1, outline: 'none', fontSize: '16px', lineHeight: '1.8', color: 'var(--text)',
    minHeight: '400px', fontFamily: 'var(--font-body)', caretColor: 'var(--accent)',
  },
  floatingToolbar: {
    position: 'absolute', zIndex: 50, display: 'flex', alignItems: 'center',
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px',
    padding: '4px 6px', gap: '2px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
    animation: 'dashFadeIn 0.15s ease',
  },
  tbBtn: {
    background: 'none', border: 'none', color: 'var(--text)', padding: '6px 8px',
    borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
    transition: 'background 0.15s', minWidth: '28px', textAlign: 'center',
  },
  tbDivider: { width: '1px', height: '20px', background: 'var(--border)', margin: '0 2px' },
  slashMenu: {
    position: 'absolute', zIndex: 60, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '6px', width: '240px', maxHeight: '320px', overflowY: 'auto',
    boxShadow: '0 12px 40px rgba(0,0,0,0.4)', animation: 'dashFadeIn 0.15s ease',
  },
  slashHeader: { fontSize: '11px', color: 'var(--text-muted)', padding: '6px 10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  slashItem: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
    borderRadius: '8px', cursor: 'pointer', transition: 'background 0.1s',
  },
  slashItemActive: { background: 'var(--accent-dim)' },
  slashIcon: {
    width: '36px', height: '36px', borderRadius: '8px', background: 'var(--surface2)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: 'var(--text)', flexShrink: 0,
  },
  slashLabel: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' },
  slashDesc: { fontSize: '11px', color: 'var(--text-muted)' },
  slashEmpty: { padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' },
};

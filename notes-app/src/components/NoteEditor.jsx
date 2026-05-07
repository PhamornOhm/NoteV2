import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import DrawingCanvas from './DrawingCanvas'
import { summarizeText } from '../lib/groq'

export default function NoteEditor({ note, onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [drawingData, setDrawingData] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiMenu, setShowAiMenu] = useState(false)

  useEffect(() => {
    setTitle(note?.title || '')
    const isDrawing = note?.content?.startsWith('[DRAWING]')
    setIsDrawingMode(isDrawing)
    if (isDrawing) {
      setDrawingData(note.content.replace('[DRAWING]', ''))
      setContent('')
    } else {
      setContent(note?.content || '')
      setDrawingData('')
    }
    setTags(note?.tags || [])
    setIsPinned(note?.is_pinned || false)
    setShowHistory(false)
  }, [note])

  const handleSave = async () => {
    if (!title.trim() && !content.trim() && !drawingData) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    const finalContent = isDrawingMode ? `[DRAWING]${drawingData}` : content

    if (note?.id) {
      // บันทึก version ก่อน
      await supabase.from('note_versions').insert({
        note_id: note.id,
        title: note.title,
        content: note.content,
        saved_at: now,
      })
      // จำกัดไว้ 20 versions
      const { data: vList } = await supabase
        .from('note_versions').select('id, saved_at')
        .eq('note_id', note.id).order('saved_at', { ascending: true })
      if (vList && vList.length > 20) {
        const toDelete = vList.slice(0, vList.length - 20).map(v => v.id)
        await supabase.from('note_versions').delete().in('id', toDelete)
      }
      // Update note
      await supabase.from('notes').update({
        title: title.trim() || 'ไม่มีหัวข้อ',
        content: finalContent, tags, is_pinned: isPinned, updated_at: now,
      }).eq('id', note.id)
    } else {
      await supabase.from('notes').insert({
        title: title.trim() || 'ไม่มีหัวข้อ',
        content: finalContent, tags, is_pinned: isPinned, user_id: user.id,
      })
    }
    setSaving(false)
    onSave()
  }

  const loadVersions = async () => {
    if (!note?.id) return
    setLoadingVersions(true)
    const { data } = await supabase
      .from('note_versions')
      .select('*')
      .eq('note_id', note.id)
      .order('saved_at', { ascending: false })
    setVersions(data || [])
    setLoadingVersions(false)
  }

  const handleShowHistory = () => {
    setShowHistory(!showHistory)
    if (!showHistory) loadVersions()
  }

  const handleRestoreVersion = (version) => {
    setTitle(version.title)
    setContent(version.content)
    setShowHistory(false)
  }

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '').toLowerCase()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  const removeTag = (tag) => setTags(tags.filter(t => t !== tag))

  const handleAiSummarize = async () => {
    if (!content.trim()) return
    setAiLoading(true)
    setShowAiMenu(false)
    try {
      const summary = await summarizeText(content)
      setContent(content + '\n\n---\n✨ **สรุปโดย AI:**\n' + summary)
    } catch (err) {
      alert(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const formatDate = (d) => new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const isReadOnly = note?.is_deleted

  return (
    <div style={styles.wrap}>
      <div style={styles.editor}>
        {/* Toolbar */}
        <div style={styles.toolbar} className="responsive-toolbar">
          <button style={styles.btnCancel} onClick={onCancel}>← กลับ</button>
          <div style={styles.toolbarRight}>
            <span style={styles.wordCount}>{wordCount} คำ</span>
            {note?.id && (
              <button
                style={{ ...styles.btnSecondary, ...(showHistory ? styles.btnSecondaryActive : {}) }}
                onClick={handleShowHistory}
                title="ประวัติ"
              >🕐 <span className="desktop-only">ประวัติ</span></button>
            )}
            {!isReadOnly && (
              <button
                style={{ ...styles.btnPin, ...(isPinned ? styles.btnPinActive : {}) }}
                onClick={() => setIsPinned(!isPinned)}
                title="ปักหมุด"
              >{isPinned ? '📌' : '☆'} <span className="desktop-only">{isPinned ? 'ปักหมุดอยู่' : 'ปักหมุด'}</span></button>
            )}
            {!isReadOnly && (
              <button
                style={{ ...styles.btnSecondary, ...(isDrawingMode ? styles.btnSecondaryActive : {}) }}
                onClick={() => setIsDrawingMode(!isDrawingMode)}
                title="โหมดวาดรูป"
              >{isDrawingMode ? '📝' : '🎨'} <span className="desktop-only">{isDrawingMode ? 'โหมดข้อความ' : 'โหมดวาดรูป'}</span></button>
            )}
            {!isReadOnly && (
              <div style={{ position: 'relative' }}>
                <button
                  style={{ ...styles.btnAi, ...(aiLoading ? styles.btnAiLoading : {}) }}
                  onClick={() => setShowAiMenu(!showAiMenu)}
                  disabled={aiLoading}
                  title="AI Assistant"
                >
                  {aiLoading ? '⌛' : '✨'} <span className="desktop-only">{aiLoading ? 'กำลังสรุป...' : 'AI Assistant'}</span>
                </button>
                {showAiMenu && (
                  <div style={styles.aiMenu}>
                    <button style={styles.aiMenuItem} onClick={handleAiSummarize}>📝 สรุปเนื้อหาโน้ต</button>
                  </div>
                )}
              </div>
            )}
            {!isReadOnly && (
              <button style={styles.btnSave} onClick={handleSave} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : '✓ บันทึก'}
              </button>
            )}
          </div>
        </div>

        {isReadOnly && (
          <div style={styles.deletedBanner}>🗑️ โน้ตนี้อยู่ในถังขยะ — กู้คืนก่อนถึงจะแก้ไขได้</div>
        )}

        {/* Content */}
        <div style={styles.content} className="responsive-content">
          <input
            style={styles.titleInput}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="หัวข้อโน้ต..."
            disabled={isReadOnly}
          />

          {/* Tags */}
          <div style={styles.tagsRow}>
            {tags.map(tag => (
              <span key={tag} style={styles.tag}>
                #{tag}
                {!isReadOnly && (
                  <button style={styles.tagRemove} onClick={() => removeTag(tag)}>×</button>
                )}
              </span>
            ))}
            {!isReadOnly && (
              <input
                style={styles.tagInput}
                placeholder="+ เพิ่ม tag"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ',') && addTag()}
              />
            )}
          </div>

          {isDrawingMode ? (
            <div style={styles.drawingArea} className="responsive-drawing-area">
              <DrawingCanvas 
                initialData={drawingData} 
                onChange={setDrawingData} 
                isReadOnly={isReadOnly}
              />
            </div>
          ) : (
            <textarea
              style={styles.textarea}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="เริ่มเขียนที่นี่..."
              disabled={isReadOnly}
            />
          )}
        </div>
      </div>

      {/* Version History Panel */}
      {showHistory && (
        <div style={styles.historyPanel}>
          <div style={styles.historyHeader}>
            <span style={styles.historyTitle}>🕐 ประวัติการแก้ไข</span>
            <button style={styles.closeBtn} onClick={() => setShowHistory(false)}>×</button>
          </div>
          <div style={styles.historyList}>
            {loadingVersions ? (
              <p style={styles.historyEmpty}>กำลังโหลด...</p>
            ) : versions.length === 0 ? (
              <p style={styles.historyEmpty}>ยังไม่มีประวัติ\n(จะบันทึกหลังกด บันทึก ครั้งแรก)</p>
            ) : versions.map(v => (
              <div key={v.id} style={styles.versionItem}>
                <div style={styles.versionDate}>{formatDate(v.saved_at)}</div>
                <div style={styles.versionTitle}>{v.title}</div>
                <div style={styles.versionPreview}>
                  {v.content.replace(/[#*`]/g, '').slice(0, 60)}
                </div>
                <button
                  style={styles.restoreBtn}
                  onClick={() => handleRestoreVersion(v)}
                >↩ กู้คืนเวอร์ชันนี้</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: { flex: 1, display: 'flex', height: '100%', overflow: 'hidden' },
  editor: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface)', gap: '8px', flexWrap: 'wrap',
  },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  wordCount: { color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' },
  btnCancel: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px' },
  btnSecondary: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
    borderRadius: '6px', padding: '5px 12px', fontSize: '12px',
  },
  btnSecondaryActive: { borderColor: 'var(--accent)', color: 'var(--accent)' },
  btnPin: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
    borderRadius: '6px', padding: '5px 12px', fontSize: '12px',
  },
  btnPinActive: { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent)' },
  btnSave: {
    background: 'var(--accent)', color: '#0f0f0f', border: 'none',
    borderRadius: '6px', padding: '6px 18px', fontSize: '13px', fontWeight: '600',
  },
  btnAi: {
    background: 'linear-gradient(135deg, #c9a96e 0%, #e8d5b5 100%)',
    color: '#0f0f0f', border: 'none', borderRadius: '6px',
    padding: '6px 14px', fontSize: '12px', fontWeight: '600',
    display: 'flex', alignItems: 'center', gap: '6px',
    boxShadow: '0 2px 8px rgba(201, 169, 110, 0.3)',
  },
  btnAiLoading: { opacity: 0.7, cursor: 'wait' },
  aiMenu: {
    position: 'absolute', top: '100%', right: 0, marginTop: '8px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '6px', minWidth: '160px', zIndex: 100,
    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
  },
  aiMenuItem: {
    width: '100%', background: 'none', border: 'none', color: 'var(--text)',
    padding: '8px 12px', textAlign: 'left', fontSize: '12px', borderRadius: '4px',
    cursor: 'pointer', transition: 'background 0.2s',
  },
  deletedBanner: {
    background: '#c0392b22', borderBottom: '1px solid #c0392b44',
    color: '#e74c3c', padding: '10px 24px', fontSize: '13px',
  },
  content: {
    flex: 1, display: 'flex', flexDirection: 'column',
    padding: '28px 48px', 
    overflow: 'auto', gap: '12px',
  },
  titleInput: {
    background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '24px', fontFamily: 'var(--font-display)',
    padding: '0 0 12px', outline: 'none', width: '100%',
  },
  tagsRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', minHeight: '28px' },
  tag: {
    background: 'var(--accent-dim)', color: 'var(--accent)',
    borderRadius: '20px', padding: '2px 10px', fontSize: '12px',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  tagRemove: { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '14px', lineHeight: 1 },
  tagInput: {
    background: 'none', border: '1px dashed var(--border)', borderRadius: '20px',
    color: 'var(--text-muted)', padding: '2px 10px', fontSize: '12px',
    outline: 'none', width: '100px',
  },
  textarea: {
    flex: 1, background: 'none', border: 'none', color: 'var(--text)',
    fontSize: '15px', lineHeight: '1.8', outline: 'none', resize: 'none',
    width: '100%', minHeight: '50vh', fontFamily: 'var(--font-mono)',
  },
  drawingArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '500px',
  },
  historyPanel: {
    width: '260px', minWidth: '260px', background: 'var(--surface)',
    borderLeft: '1px solid var(--border)', display: 'flex',
    flexDirection: 'column', overflow: 'hidden',
  },
  historyHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', borderBottom: '1px solid var(--border)',
  },
  historyTitle: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' },
  historyList: { flex: 1, overflowY: 'auto', padding: '8px' },
  historyEmpty: { color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '24px', whiteSpace: 'pre-line' },
  versionItem: {
    padding: '10px', borderRadius: '6px', marginBottom: '6px',
    border: '1px solid var(--border)', background: 'var(--bg)',
  },
  versionDate: { fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' },
  versionTitle: { fontSize: '12px', fontWeight: '600', color: 'var(--text)', marginBottom: '2px' },
  versionPreview: { fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.5 },
  restoreBtn: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
    borderRadius: '4px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', width: '100%',
  },
}
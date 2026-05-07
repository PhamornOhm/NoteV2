import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function NoteList({
  notes, allTags, activeTag, setActiveTag,
  selected, onSelect, onNew, onDelete,
  search, setSearch, activeTab, setActiveTab, onReload
}) {
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleSoftDelete = async (note, e) => {
    e.stopPropagation()
    if (note.is_deleted) {
      // ถังขยะ: ลบถาวร
      if (confirmDelete === note.id) {
        await supabase.from('notes').delete().eq('id', note.id)
        onDelete()
        setConfirmDelete(null)
      } else {
        setConfirmDelete(note.id)
        setTimeout(() => setConfirmDelete(null), 2500)
      }
    } else {
      // ย้ายไปถังขยะ
      await supabase.from('notes').update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      }).eq('id', note.id)
      onDelete()
    }
  }

  const handleRestore = async (note, e) => {
    e.stopPropagation()
    await supabase.from('notes').update({ is_deleted: false, deleted_at: null }).eq('id', note.id)
    onReload()
  }

  const handlePin = async (note, e) => {
    e.stopPropagation()
    await supabase.from('notes').update({ is_pinned: !note.is_pinned }).eq('id', note.id)
    onReload()
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  const preview = (c) => {
    if (c?.startsWith('[DRAWING]')) return '🎨 รูปวาด'
    return c.replace(/[#*`]/g, '').slice(0, 55) || 'ไม่มีเนื้อหา'
  }

  const tabs = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'pinned', label: '📌 ปักหมุด' },
    { id: 'trash', label: '🗑️ ถังขยะ' },
  ]

  return (
    <div style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.logo}>Notes</h2>
        {activeTab !== 'trash' && (
          <button style={styles.btnNew} onClick={onNew}>＋</button>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(t => (
          <button
            key={t.id}
            style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
            onClick={() => { setActiveTab(t.id); setActiveTag(null) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tags */}
      {allTags.length > 0 && activeTab !== 'trash' && (
        <div style={styles.tagsWrap}>
          <button
            style={{ ...styles.tagChip, ...(activeTag === null ? styles.tagActive : {}) }}
            onClick={() => setActiveTag(null)}
          >ทั้งหมด</button>
          {allTags.map(tag => (
            <button
              key={tag}
              style={{ ...styles.tagChip, ...(activeTag === tag ? styles.tagActive : {}) }}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >#{tag}</button>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={styles.searchWrap}>
        <span style={styles.searchIcon}>⌕</span>
        <input
          style={styles.searchInput}
          placeholder="ค้นหา..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <p style={styles.count}>{notes.length} โน้ต</p>

      {/* List */}
      <div style={styles.list}>
        {notes.length === 0 ? (
          <div style={styles.empty}>
            {activeTab === 'trash' ? 'ถังขยะว่างเปล่า' :
              activeTab === 'pinned' ? 'ยังไม่มีโน้ตที่ปักหมุด' :
                'ยังไม่มีโน้ต\nกด + เพื่อเริ่มต้น'}
          </div>
        ) : notes.map(note => (
          <div
            key={note.id}
            style={{ ...styles.item, ...(selected?.id === note.id ? styles.itemActive : {}) }}
            onClick={() => onSelect(note)}
          >
            <div style={styles.itemTop}>
              <span style={styles.itemTitle}>
                {note.is_pinned && <span style={{ color: 'var(--accent)', marginRight: 4 }}>📌</span>}
                {note.title}
              </span>
              <span style={styles.itemDate}>{formatDate(note.updated_at || note.created_at)}</span>
            </div>

            <span style={styles.itemPreview}>{preview(note.content)}</span>

            {/* Tags */}
            {(note.tags || []).length > 0 && (
              <div style={styles.noteTags}>
                {note.tags.map(tag => (
                  <span key={tag} style={styles.noteTag}>#{tag}</span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
              {!note.is_deleted && (
                <button style={styles.actionBtn} onClick={(e) => handlePin(note, e)} title={note.is_pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}>
                  {note.is_pinned ? '📌' : '☆'}
                </button>
              )}
              {note.is_deleted ? (
                <>
                  <button style={{ ...styles.actionBtn, color: '#6bcb77' }} onClick={(e) => handleRestore(note, e)}>↩ กู้คืน</button>
                  <button
                    style={{ ...styles.actionBtn, color: confirmDelete === note.id ? '#e74c3c' : 'var(--text-muted)' }}
                    onClick={(e) => handleSoftDelete(note, e)}
                  >{confirmDelete === note.id ? 'ยืนยันลบ?' : '🗑 ลบถาวร'}</button>
                </>
              ) : (
                <button style={styles.actionBtn} onClick={(e) => handleSoftDelete(note, e)} title="ลบ">🗑</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  sidebar: {
    width: '290px', minWidth: '290px', background: 'var(--surface)',
    borderRight: '1px solid var(--border)', display: 'flex',
    flexDirection: 'column', height: '100vh', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '18px 16px 10px',
  },
  logo: { fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--accent)' },
  btnNew: {
    background: 'var(--accent-dim)', color: 'var(--accent)',
    border: '1px solid var(--accent)', borderRadius: '6px',
    width: '30px', height: '30px', fontSize: '18px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tabs: { display: 'flex', gap: '4px', padding: '0 12px 10px' },
  tab: {
    flex: 1, background: 'none', border: '1px solid var(--border)',
    borderRadius: '6px', padding: '5px 4px', fontSize: '11px',
    color: 'var(--text-muted)', cursor: 'pointer',
  },
  tabActive: {
    background: 'var(--accent-dim)', border: '1px solid var(--accent)',
    color: 'var(--accent)',
  },
  tagsWrap: {
    display: 'flex', flexWrap: 'wrap', gap: '4px',
    padding: '0 12px 8px',
  },
  tagChip: {
    background: 'none', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '2px 10px', fontSize: '11px',
    color: 'var(--text-muted)', cursor: 'pointer',
  },
  tagActive: { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent)' },
  searchWrap: {
    display: 'flex', alignItems: 'center', margin: '0 12px 6px',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '7px 12px', gap: '8px',
  },
  searchIcon: { color: 'var(--text-muted)', fontSize: '16px' },
  searchInput: { background: 'none', border: 'none', color: 'var(--text)', fontSize: '13px', outline: 'none', flex: 1 },
  count: { color: 'var(--text-muted)', fontSize: '11px', padding: '0 16px 6px', fontFamily: 'var(--font-mono)' },
  list: { flex: 1, overflowY: 'auto', padding: '4px 8px' },
  empty: {
    textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px',
    padding: '40px 16px', lineHeight: 1.8, whiteSpace: 'pre-line',
  },
  item: {
    padding: '10px 12px', borderRadius: 'var(--radius)', cursor: 'pointer',
    marginBottom: '3px', border: '1px solid transparent',
    transition: 'background 0.15s',
  },
  itemActive: { background: 'var(--accent-dim)', border: '1px solid #c9a96e44' },
  itemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '3px' },
  itemTitle: {
    fontSize: '13px', fontWeight: '600', color: 'var(--text)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
  },
  itemDate: { fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' },
  itemPreview: {
    display: 'block', fontSize: '12px', color: 'var(--text-muted)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    marginBottom: '4px',
  },
  noteTags: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' },
  noteTag: {
    fontSize: '10px', color: 'var(--accent)', background: 'var(--accent-dim)',
    borderRadius: '10px', padding: '1px 7px',
  },
  actions: { display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' },
  actionBtn: {
    background: 'none', border: 'none', fontSize: '12px',
    color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px',
  },
}
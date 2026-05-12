import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import DrawingCanvas from './DrawingCanvas'
import { summarizeText } from '../lib/groq'
import { uploadFile, deleteFile as removeFileStorage } from '../lib/storage'
import { 
  Paperclip, X, File, FileArchive, Image as ImageIcon, 
  Loader2, Download, Trash2, Plus, Sparkles, History, 
  Pin, Edit3, Type, Save, ChevronLeft, Info
} from 'lucide-react'

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
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  
  const fileInputRef = useRef(null)

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
    setAttachments(note?.attachments || [])
    setShowHistory(false)
  }, [note])

  const handleSave = async () => {
    if (!title.trim() && !content.trim() && !drawingData && attachments.length === 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    const finalContent = isDrawingMode ? `[DRAWING]${drawingData}` : content

    const payload = {
      title: title.trim() || 'ไม่มีหัวข้อ',
      content: finalContent,
      tags,
      is_pinned: isPinned,
      updated_at: now,
      attachments // บันทึก metadata ของไฟล์
    }

    try {
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
        const { error } = await supabase.from('notes').update(payload).eq('id', note.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('notes').insert({
          ...payload,
          user_id: user.id
        })
        if (error) throw error
      }
      onSave()
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message + '\n\nคำแนะนำ: ตรวจสอบว่าคุณได้เพิ่มคอลัมน์ attachments (jsonb) ในตาราง notes หรือยัง?')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const newAttachments = []
      
      for (const file of files) {
        const uploaded = await uploadFile(file, user.id)
        newAttachments.push(uploaded)
      }
      
      setAttachments([...attachments, ...newAttachments])
    } catch (err) {
      alert('อัพโหลดไม่สำเร็จ: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAttachment = async (index) => {
    const file = attachments[index]
    if (window.confirm(`ลบไฟล์ ${file.name} ใช่หรือไม่?`)) {
      try {
        await removeFileStorage(file.path)
        setAttachments(attachments.filter((_, i) => i !== index))
      } catch (err) {
        alert('ลบไฟล์ไม่สำเร็จ: ' + err.message)
      }
    }
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

  const getFileIcon = (type, name) => {
    if (type?.includes('image')) return <ImageIcon size={18} />
    if (name?.endsWith('.zip') || name?.endsWith('.rar')) return <FileArchive size={18} />
    return <File size={18} />
  }

  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const formatDate = (d) => new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const isReadOnly = note?.is_deleted

  return (
    <div style={styles.wrap}>
      <div style={styles.editor}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <button style={styles.btnCancel} onClick={onCancel}>
            <ChevronLeft size={18} /> กลับ
          </button>
          <div style={styles.toolbarRight}>
            <span style={styles.wordCount}>{wordCount} คำ</span>
            {note?.id && (
              <button
                style={{ ...styles.btnSecondary, ...(showHistory ? styles.btnSecondaryActive : {}) }}
                onClick={handleShowHistory}
              >
                <History size={16} /> <span className="desktop-only">ประวัติ</span>
              </button>
            )}
            {!isReadOnly && (
              <>
                <button
                  style={{ ...styles.btnPin, ...(isPinned ? styles.btnPinActive : {}) }}
                  onClick={() => setIsPinned(!isPinned)}
                >
                  <Pin size={16} fill={isPinned ? 'currentColor' : 'none'} /> 
                  <span className="desktop-only">{isPinned ? 'ปักหมุดอยู่' : 'ปักหมุด'}</span>
                </button>
                <button
                  style={{ ...styles.btnSecondary, ...(isDrawingMode ? styles.btnSecondaryActive : {}) }}
                  onClick={() => setIsDrawingMode(!isDrawingMode)}
                >
                  {isDrawingMode ? <Type size={16} /> : <Edit3 size={16} />} 
                  <span className="desktop-only">{isDrawingMode ? 'โหมดข้อความ' : 'โหมดวาดรูป'}</span>
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    style={{ ...styles.btnAi, ...(aiLoading ? styles.btnAiLoading : {}) }}
                    onClick={() => setShowAiMenu(!showAiMenu)}
                    disabled={aiLoading}
                  >
                    {aiLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />} 
                    <span className="desktop-only">{aiLoading ? 'กำลังสรุป...' : 'AI Assistant'}</span>
                  </button>
                  {showAiMenu && (
                    <div style={styles.aiMenu}>
                      <button style={styles.aiMenuItem} onClick={handleAiSummarize}>📝 สรุปเนื้อหาโน้ต</button>
                    </div>
                  )}
                </div>
                <button style={styles.btnSave} onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} 
                  <span className="desktop-only">บันทึก</span>
                </button>
              </>
            )}
          </div>
        </div>

        {isReadOnly && (
          <div style={styles.deletedBanner}>
            <Info size={16} /> โน้ตนี้อยู่ในถังขยะ — กู้คืนก่อนถึงจะแก้ไขได้
          </div>
        )}

        {/* Content */}
        <div style={styles.content}>
          <input
            style={styles.titleInput}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="หัวข้อโน้ต..."
            disabled={isReadOnly}
          />

          <div style={styles.metaRow}>
            {/* Tags */}
            <div style={styles.tagsRow}>
              {tags.map(tag => (
                <span key={tag} style={styles.tag}>
                  #{tag}
                  {!isReadOnly && (
                    <button style={styles.tagRemove} onClick={() => removeTag(tag)}><X size={12} /></button>
                  )}
                </span>
              ))}
              {!isReadOnly && (
                <div style={styles.tagInputWrap}>
                  <Plus size={12} style={{ color: 'var(--text-muted)' }} />
                  <input
                    style={styles.tagInput}
                    placeholder="เพิ่ม tag"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ',') && addTag()}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Attachments Section */}
          {(attachments.length > 0 || (!isReadOnly && !uploading)) && (
            <div style={styles.attachmentSection}>
              <div style={styles.attachmentHeader}>
                <Paperclip size={14} />
                <span>ไฟล์แนบ ({attachments.length})</span>
                {!isReadOnly && (
                  <button 
                    style={styles.btnAddFile} 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 size={12} className="spin" /> : <Plus size={12} />}
                    เพิ่มไฟล์
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload} 
                  multiple
                />
              </div>
              
              <div style={styles.attachmentGrid}>
                {attachments.map((file, i) => (
                  <div key={i} style={styles.fileCard}>
                    <div style={styles.fileIcon}>
                      {getFileIcon(file.type, file.name)}
                    </div>
                    <div style={styles.fileInfo}>
                      <div style={styles.fileName} title={file.name}>{file.name}</div>
                      <div style={styles.fileMeta}>{formatSize(file.size)}</div>
                    </div>
                    <div style={styles.fileActions}>
                      <a href={file.url} target="_blank" rel="noreferrer" style={styles.fileActionBtn} title="ดาวน์โหลด">
                        <Download size={14} />
                      </a>
                      {!isReadOnly && (
                        <button style={{...styles.fileActionBtn, color: '#ff4d4d'}} onClick={() => removeAttachment(i)} title="ลบ">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {uploading && (
                  <div style={{...styles.fileCard, opacity: 0.6, borderStyle: 'dashed'}}>
                    <div style={styles.fileIcon}><Loader2 size={18} className="spin" /></div>
                    <div style={styles.fileInfo}>
                      <div style={styles.fileName}>กำลังอัพโหลด...</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isDrawingMode ? (
            <div style={styles.drawingArea}>
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
            <span style={styles.historyTitle}><History size={14} /> ประวัติการแก้ไข</span>
            <button style={styles.closeBtn} onClick={() => setShowHistory(false)}><X size={18} /></button>
          </div>
          <div style={styles.historyList}>
            {loadingVersions ? (
              <div style={styles.historyEmpty}><Loader2 size={24} className="spin" style={{margin: '0 auto 8px'}} /> กำลังโหลด...</div>
            ) : versions.length === 0 ? (
              <p style={styles.historyEmpty}>ยังไม่มีประวัติ<br/>(จะบันทึกหลังกด บันทึก ครั้งแรก)</p>
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
                >กู้คืนเวอร์ชันนี้</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: { flex: 1, display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg)' },
  editor: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface)', gap: '12px', flexWrap: 'wrap',
  },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  wordCount: { color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)', opacity: 0.7 },
  btnCancel: { 
    background: 'none', border: 'none', color: 'var(--text-muted)', 
    fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' 
  },
  btnSecondary: {
    background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)',
    borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
  },
  btnSecondaryActive: { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-dim)' },
  btnPin: {
    background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)',
    borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
  },
  btnPinActive: { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent)' },
  btnSave: {
    background: 'var(--accent)', color: '#1a1a1a', border: 'none',
    borderRadius: '8px', padding: '6px 16px', fontSize: '13px', fontWeight: '700',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
    boxShadow: '0 4px 12px rgba(201, 169, 110, 0.2)', transition: 'transform 0.1s',
  },
  btnAi: {
    background: 'linear-gradient(135deg, #c9a96e 0%, #e8d5b5 100%)',
    color: '#1a1a1a', border: 'none', borderRadius: '8px',
    padding: '6px 14px', fontSize: '12px', fontWeight: '700',
    display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(201, 169, 110, 0.3)',
  },
  btnAiLoading: { opacity: 0.7, cursor: 'wait' },
  aiMenu: {
    position: 'absolute', top: '100%', right: 0, marginTop: '8px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '8px', minWidth: '180px', zIndex: 100,
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
  },
  aiMenuItem: {
    width: '100%', background: 'none', border: 'none', color: 'var(--text)',
    padding: '10px 14px', textAlign: 'left', fontSize: '13px', borderRadius: '8px',
    cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
  },
  deletedBanner: {
    background: 'rgba(231, 76, 60, 0.1)', borderBottom: '1px solid rgba(231, 76, 60, 0.2)',
    color: '#e74c3c', padding: '10px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
  },
  content: {
    flex: 1, display: 'flex', flexDirection: 'column',
    padding: '32px 64px', overflowY: 'auto', gap: '20px',
  },
  titleInput: {
    background: 'none', border: 'none',
    color: 'var(--text)', fontSize: '32px', fontWeight: '800', fontFamily: 'var(--font-display)',
    padding: '0', outline: 'none', width: '100%', letterSpacing: '-0.02em',
  },
  metaRow: { display: 'flex', alignItems: 'center', gap: '16px' },
  tagsRow: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  tag: {
    background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: '500',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  tagRemove: { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, display: 'flex' },
  tagInputWrap: {
    display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg)',
    border: '1px dashed var(--border)', borderRadius: '8px', padding: '4px 12px',
  },
  tagInput: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', outline: 'none', width: '80px' },
  
  attachmentSection: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '16px', marginTop: '8px',
  },
  attachmentHeader: {
    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
    fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px',
  },
  btnAddFile: {
    marginLeft: 'auto', background: 'var(--accent-dim)', color: 'var(--accent)',
    border: '1px solid var(--accent)', borderRadius: '6px', padding: '2px 10px',
    fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
  },
  attachmentGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px',
  },
  fileCard: {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px',
    padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s',
  },
  fileIcon: {
    width: '36px', height: '36px', borderRadius: '8px', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
  },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontSize: '12px', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  fileMeta: { fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' },
  fileActions: { display: 'flex', gap: '4px' },
  fileActionBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)', padding: '6px',
    cursor: 'pointer', borderRadius: '6px', display: 'flex', transition: 'background 0.2s',
  },

  textarea: {
    flex: 1, background: 'none', border: 'none', color: 'var(--text)',
    fontSize: '16px', lineHeight: '1.8', outline: 'none', resize: 'none',
    width: '100%', minHeight: '400px', fontFamily: 'inherit',
  },
  drawingArea: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: '600px', background: 'var(--surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' },
  
  historyPanel: {
    width: '300px', minWidth: '300px', background: 'var(--surface)',
    borderLeft: '1px solid var(--border)', display: 'flex',
    flexDirection: 'column', overflow: 'hidden', animation: 'slideIn 0.3s ease-out',
  },
  historyHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px', borderBottom: '1px solid var(--border)',
  },
  historyTitle: { fontSize: '14px', fontWeight: '700', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' },
  historyList: { flex: 1, overflowY: 'auto', padding: '12px' },
  historyEmpty: { color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px', lineHeight: 1.6 },
  versionItem: {
    padding: '16px', borderRadius: '12px', marginBottom: '12px',
    border: '1px solid var(--border)', background: 'var(--bg)', transition: 'border-color 0.2s',
  },
  versionDate: { fontSize: '11px', color: 'var(--accent)', fontWeight: '600', marginBottom: '6px' },
  versionTitle: { fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' },
  versionPreview: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  restoreBtn: {
    background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)',
    borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', width: '100%', fontWeight: '600',
  },
}
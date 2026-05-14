import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import NoteList from './components/NoteList'
import NoteEditor from './components/NoteEditor'
import WelcomeModal from './components/WelcomeModal'
import Dashboard from './components/Dashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all') // all | pinned | trash
  const [activeTag, setActiveTag] = useState(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [showThemePicker, setShowThemePicker] = useState(false)

  const themes = [
    { id: 'dark', label: 'Dark', icon: '🌑', color: '#c9a96e' },
    { id: 'light', label: 'Light', icon: '☀️', color: '#b08945' },
    { id: 'ocean', label: 'Ocean', icon: '🌊', color: '#4fc3f7' },
    { id: 'forest', label: 'Forest', icon: '🌲', color: '#66bb6a' },
    { id: 'sakura', label: 'Sakura', icon: '🌸', color: '#f48fb1' },
    { id: 'sunset', label: 'Sunset', icon: '🌅', color: '#ff8a65' },
    { id: 'lavender', label: 'Lavender', icon: '💜', color: '#b39ddb' },
  ]

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setIsSidebarOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    // Clear all theme classes
    root.classList.remove('light-mode', 'theme-ocean', 'theme-forest', 'theme-sakura', 'theme-sunset', 'theme-lavender')
    if (theme === 'light') root.classList.add('light-mode')
    else if (theme !== 'dark') root.classList.add(`theme-${theme}`)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user && !localStorage.getItem('welcome_shown')) {
      setShowWelcome(true)
    }
  }, [user])

  useEffect(() => {
    if (user) loadNotes()
  }, [user])

  const loadNotes = async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    setNotes(data || [])
  }

  const handleNewNote = () => {
    setSelectedNote(null)
    setIsEditing(true)
  }

  const handleSelectNote = (note) => {
    setSelectedNote(note)
    setIsEditing(true)
  }

  const handleSave = async () => {
    await loadNotes()
    setIsEditing(false)
    setSelectedNote(null)
  }

  const handleDelete = async () => {
    await loadNotes()
    setSelectedNote(null)
    setIsEditing(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setNotes([])
    setSelectedNote(null)
    setIsEditing(false)
  }

  // Filter notes based on tab, tag, search
  const filteredNotes = notes.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
    const matchTag = activeTag ? (n.tags || []).includes(activeTag) : true
    if (activeTab === 'trash') return n.is_deleted && matchSearch
    if (activeTab === 'pinned') return !n.is_deleted && n.is_pinned && matchSearch && matchTag
    return !n.is_deleted && matchSearch && matchTag
  })

  // All unique tags
  const allTags = [...new Set(notes.filter(n => !n.is_deleted).flatMap(n => n.tags || []))]

  if (loading) return (
    <div style={styles.loader}>
      <span style={styles.loaderText}>Notes</span>
    </div>
  )

  if (!user) return <Login />

  return (
    <div style={styles.app}>
      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && window.innerWidth <= 768 && (
        <div 
          style={styles.sidebarOverlay} 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      <div 
        className={window.innerWidth <= 768 ? "sidebar-mobile" : ""}
        style={{
          ...styles.sidebarContainer,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          position: window.innerWidth <= 768 ? 'fixed' : 'relative',
          zIndex: 1001,
        }}
      >
        <NoteList
          notes={filteredNotes}
          allTags={allTags}
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          selected={selectedNote}
          onSelect={(n) => { handleSelectNote(n); if (window.innerWidth <= 768) setIsSidebarOpen(false) }}
          onNew={() => { handleNewNote(); if (window.innerWidth <= 768) setIsSidebarOpen(false) }}
          onDelete={handleDelete}
          search={search}
          setSearch={setSearch}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onReload={loadNotes}
        />
      </div>
      <div style={styles.main}>
        <div style={styles.userBar}>
          <button 
            style={styles.menuBtn} 
            className="mobile-only"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >☰</button>
          <div style={{ position: 'relative' }}>
            <button style={styles.helpBtn} onClick={() => setShowThemePicker(!showThemePicker)}>
              {themes.find(t => t.id === theme)?.icon || '🎨'} <span className="desktop-only">ธีม</span>
            </button>
            {showThemePicker && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowThemePicker(false)} />
                <div style={styles.themePicker}>
                  {themes.map(t => (
                    <button
                      key={t.id}
                      style={{
                        ...styles.themeOption,
                        ...(theme === t.id ? { background: 'var(--accent-dim)', borderColor: 'var(--accent)' } : {}),
                      }}
                      onClick={() => { setTheme(t.id); setShowThemePicker(false); }}
                    >
                      <span style={{ fontSize: '16px' }}>{t.icon}</span>
                      <span>{t.label}</span>
                      <span style={{ ...styles.themeColorDot, background: t.color }} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button style={styles.helpBtn} onClick={() => setShowWelcome(true)}>💡 <span className="desktop-only">วิธีใช้งาน</span></button>
          <span style={{...styles.userEmail, flex: 1}} className="truncate">{user.email}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>ออกจากระบบ</button>
        </div>
        {isEditing ? (
          <NoteEditor
            note={selectedNote}
            onSave={handleSave}
            onCancel={() => { setIsEditing(false); setSelectedNote(null) }}
          />
        ) : (
          <Dashboard 
            user={user} 
            notes={notes} 
            onNewNote={handleNewNote} 
            onSelectNote={handleSelectNote} 
          />
        )}
      </div>
    </div>
  )
}

const styles = {
  app: { display: 'flex', height: '100vh', overflow: 'hidden' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  userBar: {
    display: 'flex', alignItems: 'center',
    gap: '12px', padding: '12px 16px',
    borderBottom: '1px solid var(--border)', background: 'var(--surface)',
  },
  userEmail: { 
    fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
    textAlign: 'center',
  },
  logoutBtn: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
    borderRadius: '6px', padding: '4px 12px', fontSize: '12px',
  },
  menuBtn: {
    background: 'none', border: 'none', color: 'var(--accent)',
    fontSize: '24px', cursor: 'pointer', padding: '0 8px',
  },
  sidebarContainer: {
    transition: 'transform 0.3s ease',
    height: '100vh',
    display: 'flex',
  },
  sidebarOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
  },
  welcome: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0.5,
  },
  welcomeTitle: { fontFamily: 'var(--font-display)', fontSize: '48px', color: 'var(--accent)' },
  welcomeSub: { fontSize: '14px', color: 'var(--text-muted)' },
  kbd: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '4px', padding: '1px 6px', fontFamily: 'var(--font-mono)', fontSize: '13px',
  },
  noteCount: { fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loaderText: { fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--accent)', opacity: 0.6 },
  helpBtn: {
    background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)',
    borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  themePicker: {
    position: 'absolute', top: '100%', left: 0, marginTop: '8px', zIndex: 100,
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
    padding: '8px', minWidth: '160px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  themeOption: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
    background: 'none', border: '1px solid transparent', borderRadius: '8px',
    color: 'var(--text)', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
    textAlign: 'left', width: '100%',
  },
  themeColorDot: {
    width: '10px', height: '10px', borderRadius: '50%', marginLeft: 'auto', flexShrink: 0,
  },
}
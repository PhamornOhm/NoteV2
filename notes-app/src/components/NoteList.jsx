import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Plus, Search, Pin, Trash2, Tag, LayoutGrid, List, 
  RotateCcw, MoreVertical, Calendar, Hash, GripVertical,
  X, Check, AlertCircle, Trash
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'

// --- Sortable Item Component ---
function SortableNote({ 
  note, selected, onSelect, onPin, onDelete, onRestore, 
  isDeletedMode, viewMode, activeConfirmDelete, setConfirmDelete 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: note.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  
  const preview = (c) => {
    if (!c) return 'ไม่มีเนื้อหา'
    if (c.startsWith('[DRAWING]')) return '🎨 รูปวาด'
    return c.replace(/[#*`]/g, '').slice(0, 60)
  }

  const isSelected = selected?.id === note.id

  if (viewMode === 'grid') {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className={`note-card-grid ${isSelected ? 'active' : ''}`}
        onClick={() => onSelect(note)}
      >
        <div className="note-card-drag-handle" {...attributes} {...listeners}>
          <GripVertical size={14} />
        </div>
        
        <div className="note-card-content">
          <div className="note-card-header">
            <span className="note-card-title">
              {note.is_pinned && <Pin size={12} fill="currentColor" className="pinned-icon" />}
              {note.title}
            </span>
          </div>
          
          <p className="note-card-preview">{preview(note.content)}</p>
          
          <div className="note-card-footer">
            <span className="note-card-date">{formatDate(note.updated_at || note.created_at)}</span>
            <div className="note-card-tags">
              {(note.tags || []).slice(0, 2).map(tag => (
                <span key={tag} className="note-tag-mini">#{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="note-card-actions">
           {!isDeletedMode ? (
              <>
                <button onClick={(e) => { e.stopPropagation(); onPin(note, e); }} className="action-btn">
                  <Pin size={14} fill={note.is_pinned ? 'currentColor' : 'none'} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(note, e); }} className="action-btn hover-danger">
                  <Trash2 size={14} />
                </button>
              </>
           ) : (
             <>
                <button onClick={(e) => { e.stopPropagation(); onRestore(note, e); }} className="action-btn hover-success">
                  <RotateCcw size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(note, e); }} 
                  className={`action-btn ${activeConfirmDelete === note.id ? 'confirm' : 'hover-danger'}`}
                >
                  {activeConfirmDelete === note.id ? <Check size={14} /> : <Trash size={14} />}
                </button>
             </>
           )}
        </div>
      </div>
    )
  }

  // List View
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`note-card-list ${isSelected ? 'active' : ''}`}
      onClick={() => onSelect(note)}
    >
      <div className="note-card-drag-handle" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>
      
      <div className="note-list-info">
        <div className="note-list-main">
           <span className="note-list-title">
             {note.is_pinned && <Pin size={12} fill="currentColor" className="pinned-icon" />}
             {note.title}
           </span>
           <span className="note-list-preview">{preview(note.content)}</span>
        </div>
        <span className="note-list-date">{formatDate(note.updated_at || note.created_at)}</span>
      </div>

      <div className="note-list-actions">
        {!isDeletedMode ? (
          <button onClick={(e) => { e.stopPropagation(); onDelete(note, e); }} className="action-btn hover-danger">
            <Trash2 size={14} />
          </button>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); onRestore(note, e); }} className="action-btn hover-success">
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// --- Main NoteList Component ---
export default function NoteList({
  notes, allTags, activeTag, setActiveTag,
  selected, onSelect, onNew, onDelete,
  search, setSearch, activeTab, setActiveTab, onReload
}) {
  const [viewMode, setViewMode] = useState('grid') // grid | list
  const [confirmDelete, setConfirmDelete] = useState(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      // Local reorder only for now. Permanent storage would need a 'position' column.
    }
  }

  const handleSoftDelete = async (note, e) => {
    e.stopPropagation()
    if (note.is_deleted) {
      if (confirmDelete === note.id) {
        await supabase.from('notes').delete().eq('id', note.id)
        onDelete()
        setConfirmDelete(null)
      } else {
        setConfirmDelete(note.id)
        setTimeout(() => setConfirmDelete(null), 2500)
      }
    } else {
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

  const tabs = [
    { id: 'all', label: 'ทั้งหมด', icon: <Hash size={14} /> },
    { id: 'pinned', label: 'ปักหมุด', icon: <Pin size={14} /> },
    { id: 'trash', label: 'ถังขยะ', icon: <Trash2 size={14} /> },
  ]

  return (
    <div className="sidebar-container">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="logo-section">
          <h2 className="logo-text">NoteV2</h2>
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} 
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={16} />
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} 
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
        
        {activeTab !== 'trash' && (
          <button className="btn-new-note" onClick={onNew}>
            <Plus size={18} />
            <span>โน้ตใหม่</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nav-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(t.id); setActiveTag(null) }}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tag Filter */}
      {allTags.length > 0 && activeTab !== 'trash' && (
        <div className="tags-section">
          <div className="tags-scroll">
            <button
              className={`tag-chip ${activeTag === null ? 'active' : ''}`}
              onClick={() => setActiveTag(null)}
            >ทั้งหมด</button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-chip ${activeTag === tag ? 'active' : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >#{tag}</button>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            className="search-input"
            placeholder="ค้นหาความจำของคุณ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <X size={14} className="clear-search" onClick={() => setSearch('')} />}
        </div>
      </div>

      {/* Note List / Grid */}
      <div className={`notes-list-wrapper ${viewMode}`}>
        {notes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'trash' ? <Trash2 size={40} /> : <AlertCircle size={40} />}
            </div>
            <p>
              {activeTab === 'trash' ? 'ถังขยะว่างเปล่า' :
                activeTab === 'pinned' ? 'ยังไม่มีโน้ตที่ปักหมุด' :
                  'ไม่พบโน้ตที่ต้องการ'}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToWindowEdges]}
          >
            <SortableContext
              items={notes.map(n => n.id)}
              strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
            >
              <div className={`notes-${viewMode}-container`}>
                <AnimatePresence>
                  {notes.map(note => (
                    <SortableNote 
                      key={note.id}
                      note={note}
                      selected={selected}
                      onSelect={onSelect}
                      onPin={handlePin}
                      onDelete={handleSoftDelete}
                      onRestore={handleRestore}
                      isDeletedMode={activeTab === 'trash'}
                      viewMode={viewMode}
                      activeConfirmDelete={confirmDelete}
                      setConfirmDelete={setConfirmDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="sidebar-footer">
        <span>{notes.length} รายการ</span>
      </div>
    </div>
  )
}
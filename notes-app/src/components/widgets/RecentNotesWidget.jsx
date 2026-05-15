import React from 'react';

export default function RecentNotesWidget({ notes, onNewNote, onSelectNote }) {
  const active = notes.filter(n => !n.is_deleted);
  const recent = active.slice(0, 5);

  return (
    <div className="recent-widget">
      <div className="recent-header-row">
        <span className="recent-count">{active.length} โน้ต</span>
        <button className="recent-new-btn new-note-btn" onClick={onNewNote}>+ สร้างใหม่</button>
      </div>
      {recent.length > 0 ? (
        <div className="recent-list">
          {recent.map((note, i) => (
            <div key={note.id} className="recent-note-item dash-note-card" onClick={() => onSelectNote(note)} style={{ animationDelay: `${0.1 * i}s` }}>
              <div className="recent-note-left">
                {note.is_pinned && <span className="recent-pin">📌</span>}
                <div className="recent-note-info">
                  <div className="recent-note-title">{note.title || 'ไม่มีชื่อ'}</div>
                  <div className="recent-note-preview">{(note.content || '').replace(/<[^>]*>/g, '').substring(0, 80)}</div>
                </div>
              </div>
              <div className="recent-note-meta">
                <span className="recent-note-date">{new Date(note.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                <div className="recent-note-tags">
                  {(note.tags || []).slice(0, 2).map(t => <span key={t} className="recent-tag">#{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="widget-empty" onClick={onNewNote}>ยังไม่มีโน้ต เริ่มจดเลย!</div>
      )}
    </div>
  );
}

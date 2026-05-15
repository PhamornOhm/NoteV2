import React from 'react';

export default function StatsWidget({ notes }) {
  const active = notes.filter(n => !n.is_deleted);
  const pinned = active.filter(n => n.is_pinned);
  const deleted = notes.filter(n => n.is_deleted);
  const totalTags = [...new Set(active.flatMap(n => n.tags || []))];
  const totalChars = active.reduce((s, n) => s + (n.content || '').replace(/<[^>]*>/g, '').length, 0);

  const today = new Date().toDateString();
  const todayNotes = active.filter(n => new Date(n.created_at).toDateString() === today);

  return (
    <div className="stats-widget">
      <div className="stats-grid-4">
        <div className="stat-card stat-accent">
          <div className="stat-number stat-value-pop">{active.length}</div>
          <div className="stat-name">โน้ตทั้งหมด</div>
          <div className="stat-progress"><div className="stat-fill" style={{ width: '100%' }} /></div>
        </div>
        <div className="stat-card stat-pink">
          <div className="stat-number stat-value-pop">{pinned.length}</div>
          <div className="stat-name">ปักหมุด</div>
          <div className="stat-progress"><div className="stat-fill pink" style={{ width: active.length ? `${(pinned.length / active.length) * 100}%` : '0%' }} /></div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-number stat-value-pop">{totalTags.length}</div>
          <div className="stat-name">แท็ก</div>
          <div className="stat-progress"><div className="stat-fill blue" style={{ width: totalTags.length > 0 ? '60%' : '0%' }} /></div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-number stat-value-pop">{todayNotes.length}</div>
          <div className="stat-name">วันนี้</div>
          <div className="stat-progress"><div className="stat-fill green" style={{ width: todayNotes.length > 0 ? '80%' : '0%' }} /></div>
        </div>
      </div>
      <div className="stats-extra-row">
        <div className="stats-extra-chip">📝 {totalChars.toLocaleString()} ตัวอักษร</div>
        <div className="stats-extra-chip">🗑️ {deleted.length} ในถังขยะ</div>
      </div>
    </div>
  );
}

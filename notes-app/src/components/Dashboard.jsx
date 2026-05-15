import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import DraggableWidget from './DraggableWidget';
import WeatherWidget from './widgets/WeatherWidget';
import GithubWidget from './widgets/GithubWidget';
import StatsWidget from './widgets/StatsWidget';
import PomodoroWidget from './widgets/PomodoroWidget';
import QuoteWidget from './widgets/QuoteWidget';
import RecentNotesWidget from './widgets/RecentNotesWidget';
import PetWidget from './widgets/PetWidget';

const DEFAULT_ORDER = ['weather', 'pet', 'github', 'stats', 'pomodoro', 'quote', 'recent'];

const WIDGET_META = {
  weather: { title: 'สภาพอากาศ', icon: '🌤️' },
  github: { title: 'GitHub', icon: '🐙' },
  stats: { title: 'ภาพรวม', icon: '📊' },
  pomodoro: { title: 'Pomodoro', icon: '🍅' },
  quote: { title: 'แรงบันดาลใจ', icon: '💭' },
  pet: { title: 'สัตว์เลี้ยงของฉัน', icon: '🐾' },
  recent: { title: 'โน้ตล่าสุด', icon: '📝', colSpan: 2 },
};

export default function Dashboard({ user, notes, onNewNote, onSelectNote }) {
  const [time, setTime] = useState(new Date());
  const [widgetOrder, setWidgetOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('widget_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Add any new widgets that aren't in saved order
        const merged = [...parsed, ...DEFAULT_ORDER.filter(w => !parsed.includes(w))];
        return merged;
      }
    } catch {}
    return DEFAULT_ORDER;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setWidgetOrder(prev => {
        const oldIdx = prev.indexOf(active.id);
        const newIdx = prev.indexOf(over.id);
        const newOrder = arrayMove(prev, oldIdx, newIdx);
        localStorage.setItem('widget_order', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const getGreeting = () => {
    const h = time.getHours();
    return h < 12 ? 'สวัสดีตอนเช้า 🌅' : h < 18 ? 'สวัสดีตอนบ่าย ☀️' : 'สวัสดีตอนเย็น 🌙';
  };

  const timeStr = time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const renderWidget = (id) => {
    switch (id) {
      case 'weather': return <WeatherWidget />;
      case 'github': return <GithubWidget user={user} />;
      case 'stats': return <StatsWidget notes={notes} />;
      case 'pomodoro': return <PomodoroWidget />;
      case 'quote': return <QuoteWidget />;
      case 'pet': return <PetWidget />;
      case 'recent': return <RecentNotesWidget notes={notes} onNewNote={onNewNote} onSelectNote={onSelectNote} />;
      default: return null;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dash-header">
        <h1 className="dash-greeting">{getGreeting()}</h1>
        <div className="dash-date-row">
          <span className="live-dot" />
          <span className="dash-date-text">{time.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="dash-clock-box">
          <span className="dash-clock-time">{timeStr}</span>
        </div>
        <div className="dash-drag-hint">💡 ลาก Widget เพื่อจัดเรียงตามใจชอบ</div>
      </div>

      {/* Draggable Widget Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToWindowEdges]}>
        <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
          <div className="widget-grid">
            {widgetOrder.map(id => (
              <DraggableWidget
                key={id}
                id={id}
                title={WIDGET_META[id]?.title}
                icon={WIDGET_META[id]?.icon}
                colSpan={WIDGET_META[id]?.colSpan}
              >
                {renderWidget(id)}
              </DraggableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

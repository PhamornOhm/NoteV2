import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export default function DraggableWidget({ id, children, title, icon, colSpan }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 100 : 1,
    gridColumn: colSpan ? `span ${colSpan}` : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`widget-shell ${isDragging ? 'widget-dragging' : ''}`}>
      <div className="widget-drag-bar" {...attributes} {...listeners}>
        <GripVertical size={14} />
        <span className="widget-drag-label">{icon} {title}</span>
        <div className="widget-drag-dots">
          <span /><span /><span />
        </div>
      </div>
      <div className="widget-body">
        {children}
      </div>
    </div>
  );
}

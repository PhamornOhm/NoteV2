import { useRef, useEffect, useState } from 'react'

export default function DrawingCanvas({ initialData, onChange, isReadOnly }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#c9a96e') // Default accent color
  const [brushSize, setBrushSize] = useState(3)
  const [tool, setTool] = useState('pen') // pen, eraser

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Set canvas size based on parent container
    const resizeCanvas = () => {
      const parent = canvas.parentElement
      const currentData = canvas.toDataURL()
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight || 500
      
      // Restore data after resize
      if (initialData) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0)
        img.src = initialData
      } else if (currentData && currentData !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8/5+hEgAHggGf7/9tqQAAAABJRU5ErkJggg==') {
          const img = new Image()
          img.onload = () => ctx.drawImage(img, 0, 0)
          img.src = currentData
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    if (initialData) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = initialData
    }

    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  const startDrawing = (e) => {
    if (isReadOnly) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing || isReadOnly) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top

    ctx.lineTo(x, y)
    ctx.strokeStyle = tool === 'eraser' ? '#1a1a1a' : color // Eraser uses surface color
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (onChange) {
      onChange(canvasRef.current.toDataURL())
    }
  }

  const clearCanvas = () => {
    if (isReadOnly) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (onChange) onChange('')
  }

  return (
    <div style={styles.container}>
      {!isReadOnly && (
        <div style={styles.toolbar}>
          <div style={styles.toolGroup}>
            <button 
              style={{...styles.toolBtn, ...(tool === 'pen' ? styles.activeTool : {})}} 
              onClick={() => setTool('pen')}
              title="ปากกา"
            >✏️</button>
            <button 
              style={{...styles.toolBtn, ...(tool === 'eraser' ? styles.activeTool : {})}} 
              onClick={() => setTool('eraser')}
              title="ยางลบ"
            >🧽</button>
            <button style={styles.toolBtn} onClick={clearCanvas} title="ล้างทั้งหมด">🗑️</button>
          </div>
          
          <div style={styles.divider} />
          
          <div style={styles.toolGroup}>
            {['#c9a96e', '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#e8e6e0'].map(c => (
              <button
                key={c}
                style={{
                  ...styles.colorBtn, 
                  backgroundColor: c,
                  border: color === c ? '2px solid white' : '1px solid var(--border)'
                }}
                onClick={() => { setColor(c); setTool('pen'); }}
              />
            ))}
          </div>

          <div style={styles.divider} />

          <div style={styles.toolGroup}>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              style={styles.range}
            />
            <span style={styles.sizeLabel}>{brushSize}px</span>
          </div>
        </div>
      )}

      <div style={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            ...styles.canvas,
            cursor: isReadOnly ? 'default' : (tool === 'pen' ? 'crosshair' : 'cell'),
            touchAction: 'none'
          }}
        />
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    gap: '12px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px',
    background: 'var(--surface2)',
    borderRadius: '8px',
    flexWrap: 'wrap',
  },
  toolGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  toolBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  activeTool: {
    background: 'var(--accent-dim)',
    borderColor: 'var(--accent)',
  },
  colorBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    padding: 0,
    cursor: 'pointer',
  },
  divider: {
    width: '1px',
    height: '24px',
    background: 'var(--border)',
  },
  range: {
    accentColor: 'var(--accent)',
    width: '80px',
  },
  sizeLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    minWidth: '30px',
  },
  canvasWrap: {
    flex: 1,
    background: '#1a1a1a',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    position: 'relative',
    minHeight: '400px',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
  }
}

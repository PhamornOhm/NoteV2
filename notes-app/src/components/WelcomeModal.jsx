export default function WelcomeModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const closePortal = () => {
    localStorage.setItem('welcome_shown', 'true')
    onClose()
  }

  if (!isOpen) return null

  const features = [
    { icon: '✨', title: 'AI Assistant (ใหม่!)', desc: 'ใช้ AI จาก Groq ช่วยสรุปเนื้อหาโน้ตยาวๆ ให้เข้าใจง่ายในพริบตา' },
    { icon: '🎨', title: 'โหมดวาดรูป', desc: 'วาดไอเดียของคุณลงบนผืนผ้าใบดิจิทัลพร้อมเครื่องมือครบครัน' },
    { icon: '🕐', title: 'ประวัติเวอร์ชัน', desc: 'กู้คืนข้อมูลจากการแก้ไขย้อนหลังได้สูงสุดถึง 20 เวอร์ชัน' },
    { icon: '📌', title: 'ปักหมุดโน้ตสำคัญ', desc: 'เก็บโน้ตที่คุณใช้บ่อยไว้ด้านบนสุดเพื่อให้เข้าถึงได้ทันที' },
    { icon: '🏷️', title: 'จัดระเบียบด้วยแท็ก', desc: 'ใส่ #tags เพื่อแยกหมวดหมู่และค้นหาโน้ตได้อย่างแม่นยำ' },
    { icon: '🗑️', title: 'ถังขยะอัจฉริยะ', desc: 'ไม่ต้องกลัวข้อมูลหาย กู้คืนโน้ตที่ลบไปแล้วได้ทุกเมื่อ' },
  ]

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} className="responsive-modal">
        <div style={styles.header}>
          <h1 style={styles.title} className="responsive-modal-title">ยินดีต้อนรับสู่ <span style={styles.accent}>Notes v2</span></h1>
          <p style={styles.subtitle}>แอปจดบันทึกที่ออกแบบมาเพื่อความคิดสร้างสรรค์ของคุณ</p>
        </div>

        <div style={styles.featuresGrid}>
          {features.map((f, i) => (
            <div key={i} style={styles.featureItem}>
              <div style={styles.featureIcon}>{f.icon}</div>
              <div style={styles.featureContent}>
                <div style={styles.featureTitle}>{f.title}</div>
                <div style={styles.featureDesc}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button style={styles.cta} onClick={closePortal}>
          เริ่มต้นใช้งานเลย ✨
        </button>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '700px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    animation: 'fadeInUp 0.5s ease-out',
  },
  header: {
    textAlign: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '36px',
    color: 'var(--text)',
    marginBottom: '8px',
  },
  accent: {
    color: 'var(--accent)',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '16px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
  },
  featureItem: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    borderRadius: '12px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    transition: 'transform 0.2s',
  },
  featureIcon: {
    fontSize: '24px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--accent)',
    marginBottom: '4px',
  },
  featureDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
  },
  cta: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '8px',
    boxShadow: '0 4px 15px var(--accent-dim)',
  },
}

// Keyframes style should be in index.css
// @keyframes fadeInUp {
//   from { opacity: 0; transform: translateY(20px); }
//   to { opacity: 1; transform: translateY(0); }
// }

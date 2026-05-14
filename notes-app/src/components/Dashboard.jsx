import React, { useState, useEffect } from 'react';

export default function Dashboard({ user, notes, onNewNote, onSelectNote }) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [locationName, setLocationName] = useState('กำลังค้นหาตำแหน่ง...');
  const [weatherLoading, setWeatherLoading] = useState(true);

  const githubProviderName = user?.app_metadata?.provider === 'github' ? user?.user_metadata?.user_name : null;
  const defaultGithubUser = githubProviderName || localStorage.getItem('customGithubUser') || '';
  const [githubUser, setGithubUser] = useState(defaultGithubUser);
  const [githubData, setGithubData] = useState(null);
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubLoading, setGithubLoading] = useState(!!defaultGithubUser);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather effect
  useEffect(() => {
    const customLocStr = localStorage.getItem('customWeatherLocation');
    if (customLocStr) {
      try {
        const customLoc = JSON.parse(customLocStr);
        setLocationName(customLoc.name);
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${customLoc.latitude}&longitude=${customLoc.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`)
          .then(r => r.json()).then(d => { setWeather(d.current); setWeatherLoading(false); })
          .catch(() => setWeatherLoading(false));
        return;
      } catch (e) { localStorage.removeItem('customWeatherLocation'); }
    }
    const defLat = 13.7563, defLon = 100.5018;
    let watchId;
    const fetchWL = async (lat, lon) => {
      try {
        const wr = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`);
        setWeather((await wr.json()).current);
        const lr = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
        const ld = await lr.json();
        let n = ld.locality || ld.city || '';
        if (ld.principalSubdivision && !n.includes(ld.principalSubdivision)) n += n ? `, ${ld.principalSubdivision}` : ld.principalSubdivision;
        setLocationName(n || 'ไม่ทราบตำแหน่ง');
      } catch (e) {} finally { setWeatherLoading(false); }
    };
    const fallback = async () => {
      try { const r = await fetch('https://get.geojs.io/v1/ip/geo.json'); const d = await r.json(); if (d.latitude) { fetchWL(+d.latitude, +d.longitude); return; } } catch {}
      fetchWL(defLat, defLon);
    };
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(p => fetchWL(p.coords.latitude, p.coords.longitude), () => fallback(), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    } else fallback();
    return () => { if (watchId !== undefined) navigator.geolocation.clearWatch(watchId); };
  }, []);

  // GitHub effect
  useEffect(() => {
    if (!githubUser) { setGithubData(null); setGithubRepos([]); setGithubLoading(false); return; }
    setGithubLoading(true);
    Promise.all([
      fetch(`https://api.github.com/users/${githubUser}`).then(r => r.json()),
      fetch(`https://api.github.com/users/${githubUser}/repos?sort=updated&per_page=3`).then(r => r.json()),
    ]).then(([ud, repos]) => {
      setGithubData(ud.message === "Not Found" ? null : ud);
      setGithubRepos(Array.isArray(repos) ? repos : []);
      setGithubLoading(false);
    }).catch(() => setGithubLoading(false));
  }, [githubUser]);

  const handleLocationClick = async () => {
    const c = prompt('📍 เปลี่ยนตำแหน่งสภาพอากาศ\nพิมพ์ชื่อจังหวัด (เช่น จันทบุรี)\n\n*เว้นว่าง = ตำแหน่งอัตโนมัติ');
    if (c === null) return;
    setWeatherLoading(true);
    if (!c.trim()) { localStorage.removeItem('customWeatherLocation'); window.location.reload(); return; }
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(c)}&count=1&language=th&format=json`);
      const d = await r.json();
      if (d.results?.length) {
        const { latitude: la, longitude: lo, name: n, admin1 } = d.results[0];
        const dn = admin1 && admin1 !== n ? `${n}, ${admin1}` : n;
        localStorage.setItem('customWeatherLocation', JSON.stringify({ latitude: la, longitude: lo, name: dn }));
        setLocationName(dn);
        const wr = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`);
        setWeather((await wr.json()).current);
      } else alert(`❌ ไม่พบ: ${c}`);
    } catch { alert('❌ เกิดข้อผิดพลาด'); } finally { setWeatherLoading(false); }
  };

  const handleSetGithub = () => {
    const n = prompt('กรอก GitHub Username:\n*เว้นว่าง = ซ่อน Widget', githubUser);
    if (n !== null) { const t = n.trim(); setGithubUser(t); t ? localStorage.setItem('customGithubUser', t) : localStorage.removeItem('customGithubUser'); }
  };

  const getGreeting = () => { const h = time.getHours(); return h < 12 ? 'สวัสดีตอนเช้า 🌅' : h < 18 ? 'สวัสดีตอนบ่าย ☀️' : 'สวัสดีตอนเย็น 🌙'; };
  const getWeatherIcon = (c) => { if (c===0) return '☀️'; if (c<=3) return '⛅'; if (c===45||c===48) return '🌫️'; if (c>=51&&c<=67) return '🌧️'; if (c>=71&&c<=77) return '❄️'; if (c>=80&&c<=82) return '🌦️'; if (c>=95) return '⛈️'; return '🌤️'; };
  const getWeatherDesc = (c) => { if (c===0) return 'ท้องฟ้าแจ่มใส'; if (c<=3) return 'มีเมฆบางส่วน'; if (c===45||c===48) return 'หมอกลง'; if (c>=51&&c<=67) return 'ฝนตก'; if (c>=80&&c<=82) return 'ฝนตกเป็นพักๆ'; if (c>=95) return 'พายุฝนฟ้าคะนอง'; return 'อากาศดี'; };

  const active = notes.filter(n => !n.is_deleted);
  const pinned = active.filter(n => n.is_pinned);
  const recent = active.slice(0, 4);
  const secs = time.getSeconds();
  const timeStr = time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div style={S.container}>
      {/* Header */}
      <div className="dash-header" style={S.header}>
        <h1 style={S.greeting}>{getGreeting()}</h1>
        <div style={S.dateRow}>
          <span className="live-dot" />
          <span style={S.dateText}>{time.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        {/* Live Clock */}
        <div style={S.clockBox}>
          <span style={S.clockTime}>{timeStr}</span>
        </div>
      </div>

      {/* Widget Grid */}
      <div style={S.grid}>
        {/* Weather */}
        <div className="dash-card" style={{...S.card, ...S.weatherCard}}>
          <div style={S.cardHeader}>
            <h2 style={S.cardTitle}>🌤️ สภาพอากาศ</h2>
            <div className="location-badge" style={S.badge} onClick={handleLocationClick} title="คลิกเพื่อเปลี่ยน">📍 {locationName} ✎</div>
          </div>
          {weatherLoading ? <div style={S.shimmerBox}><div style={S.shimmerBar}/></div> : weather ? (
            <div style={S.weatherBody}>
              <div className="weather-icon-float" style={S.wIcon}>{getWeatherIcon(weather.weather_code)}</div>
              <div>
                <div style={S.temp}>{Math.round(weather.temperature_2m)}<span style={S.tempUnit}>°C</span></div>
                <div style={S.wDesc}>{getWeatherDesc(weather.weather_code)}</div>
                <div style={S.wDetails}>
                  <span style={S.wTag}>💨 {weather.wind_speed_10m} km/h</span>
                  <span style={S.wTag}>💧 {weather.relative_humidity_2m}%</span>
                </div>
              </div>
            </div>
          ) : <p style={S.muted}>ไม่สามารถโหลดข้อมูลได้</p>}
        </div>

        {/* GitHub */}
        <div className="dash-card" style={{...S.card, ...S.ghCard}}>
          <div style={S.cardHeader}>
            <h2 style={{...S.cardTitle, display:'flex', alignItems:'center', gap:'8px'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </h2>
            <div className="location-badge" style={S.badge} onClick={handleSetGithub}>{githubUser ? `@${githubUser} ✎` : 'ตั้งค่า ✎'}</div>
          </div>
          {!githubUser ? (
            <div style={S.emptyMini} onClick={handleSetGithub}>คลิกเพื่อเชื่อมต่อ GitHub</div>
          ) : githubLoading ? <div style={S.shimmerBox}><div style={S.shimmerBar}/></div> : githubData ? (
            <div>
              <div style={S.ghRow}>
                <a href={githubData.html_url} target="_blank" rel="noreferrer"><img className="github-avatar-hover" src={githubData.avatar_url} alt="" style={S.ghAvatar}/></a>
                <div style={{flex:1,minWidth:0}}>
                  <div style={S.ghName}>{githubData.name || githubData.login}</div>
                  <div style={S.ghStats}>
                    <span style={S.ghStatChip}>📦 {githubData.public_repos}</span>
                    <span style={S.ghStatChip}>👥 {githubData.followers}</span>
                    <span style={S.ghStatChip}>⭐ {githubData.following}</span>
                  </div>
                </div>
              </div>
              {githubRepos.length > 0 && (
                <div style={S.ghRepos}>
                  <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'6px'}}>อัปเดตล่าสุด</div>
                  {githubRepos.map(r => (
                    <a key={r.id} href={r.html_url} target="_blank" rel="noreferrer" style={S.ghRepoItem}>
                      <span style={S.ghRepoDot}/>
                      <span style={S.ghRepoName}>{r.name}</span>
                      {r.language && <span style={S.ghRepoLang}>{r.language}</span>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : <div style={S.emptyMini} onClick={handleSetGithub}>❌ ไม่พบ "{githubUser}"</div>}
        </div>

        {/* Quick Stats */}
        <div className="dash-card" style={S.card}>
          <h2 style={{...S.cardTitle, marginBottom:'16px'}}>📊 ภาพรวม</h2>
          <div style={S.statsGrid}>
            <div style={S.statBox}>
              <div className="stat-value-pop" style={S.statVal}>{active.length}</div>
              <div style={S.statLabel}>โน้ตทั้งหมด</div>
              <div style={{...S.statBar, width: '100%'}}><div style={{...S.statBarFill, width: active.length > 0 ? '100%' : '0%'}}/></div>
            </div>
            <div style={S.statBox}>
              <div className="stat-value-pop" style={S.statVal}>{pinned.length}</div>
              <div style={S.statLabel}>ปักหมุดแล้ว</div>
              <div style={S.statBar}><div style={{...S.statBarFill, width: active.length ? `${(pinned.length/active.length)*100}%` : '0%', background:'linear-gradient(90deg, #ff9a9e, var(--accent))'}}/></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Notes */}
      <div className="dash-recent" style={S.recentSection}>
        <div style={S.recentHeader}>
          <h2 style={{fontSize:'18px',fontWeight:'500',color:'var(--text)'}}>📝 โน้ตล่าสุด</h2>
          <button className="new-note-btn" style={S.newBtn} onClick={onNewNote}>+ สร้างโน้ตใหม่</button>
        </div>
        {recent.length > 0 ? (
          <div style={S.recentGrid}>
            {recent.map(note => (
              <div key={note.id} className="dash-note-card" style={S.noteCard} onClick={() => onSelectNote(note)}>
                <div style={S.notePin}>{note.is_pinned ? '📌' : ''}</div>
                <h3 style={S.noteTitle}>{note.title || 'ไม่มีชื่อ'}</h3>
                <p style={S.noteExcerpt}>{note.content.replace(/<[^>]*>?/gm,'').substring(0,60)}...</p>
                <div style={S.noteFooter}>
                  <span>{new Date(note.updated_at).toLocaleDateString('th-TH')}</span>
                  {(note.tags||[]).slice(0,2).map(t => <span key={t} style={S.noteTag}>#{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        ) : <div style={S.emptyState}>ยังไม่มีโน้ต เริ่มต้นจดบันทึกได้เลย!</div>}
      </div>
    </div>
  );
}

const S = {
  container: { flex:1, padding:'var(--space-lg)', overflowY:'auto', backgroundColor:'var(--bg)', fontFamily:'var(--font-body)' },
  header: { marginBottom:'var(--space-lg)' },
  greeting: { fontSize:'var(--font-h1)', fontFamily:'var(--font-display)', marginBottom:'var(--space-sm)', background:'linear-gradient(135deg, var(--accent), #ff9a9e, #fad0c4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  dateRow: { display:'flex', alignItems:'center', marginBottom:'var(--space-md)' },
  dateText: { fontSize:'14px', color:'var(--text-muted)' },
  clockBox: { display:'inline-flex', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'12px', padding:'8px 16px', gap:'4px', marginTop:'var(--space-sm)' },
  clockTime: { fontSize:'clamp(20px, 4vw, 28px)', fontFamily:'var(--font-mono)', fontWeight:'bold', color:'var(--accent)', letterSpacing:'1px' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap:'var(--space-md)', marginBottom:'var(--space-lg)' },
  card: { backgroundColor:'var(--surface)', borderRadius:'16px', padding:'var(--space-md)', border:'1px solid var(--border)', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', transition:'all 0.3s ease', cursor:'default', position:'relative', overflow:'hidden' },
  weatherCard: { background:'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)' },
  ghCard: { background:'linear-gradient(135deg, var(--surface) 0%, rgba(30,30,30,0.9) 100%)' },
  cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'var(--space-md)', flexWrap:'wrap', gap:'8px' },
  cardTitle: { fontSize:'var(--font-h3)', fontWeight:'600', color:'var(--text)', margin:0 },
  badge: { fontSize:'11px', backgroundColor:'var(--bg)', padding:'4px 10px', borderRadius:'20px', color:'var(--text-muted)', border:'1px solid var(--border)', cursor:'pointer', transition:'all 0.2s', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'150px' },
  weatherBody: { display:'flex', alignItems:'center', gap:'clamp(12px, 3vw, 20px)' },
  wIcon: { fontSize:'clamp(40px, 8vw, 56px)', lineHeight:1 },
  temp: { fontSize:'clamp(32px, 6vw, 40px)', fontWeight:'bold', color:'var(--text)' },
  tempUnit: { fontSize:'18px', opacity:0.6 },
  wDesc: { fontSize:'13px', color:'var(--text-muted)', marginBottom:'var(--space-sm)' },
  wDetails: { display:'flex', gap:'8px', flexWrap:'wrap' },
  wTag: { fontSize:'11px', background:'var(--surface2)', padding:'3px 8px', borderRadius:'8px', color:'var(--text-muted)', border:'1px solid var(--border)' },
  shimmerBox: { padding:'16px 0' },
  shimmerBar: { height:'20px', borderRadius:'8px', background:'linear-gradient(90deg, var(--surface2) 25%, var(--border) 50%, var(--surface2) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' },
  muted: { color:'var(--text-muted)', fontSize:'13px' },
  ghRow: { display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' },
  ghAvatar: { width:'48px', height:'48px', borderRadius:'50%', border:'2px solid var(--border)', objectFit:'cover' },
  ghName: { fontSize:'14px', fontWeight:'bold', color:'var(--text)', marginBottom:'4px' },
  ghStats: { display:'flex', gap:'4px', flexWrap:'wrap' },
  ghStatChip: { fontSize:'10px', background:'var(--surface2)', padding:'2px 6px', borderRadius:'6px', color:'var(--text-muted)', border:'1px solid var(--border)' },
  ghRepos: { borderTop:'1px solid var(--border)', paddingTop:'10px', marginTop:'4px' },
  ghRepoItem: { display:'flex', alignItems:'center', gap:'8px', padding:'4px 0', textDecoration:'none', color:'var(--text)', fontSize:'12px' },
  ghRepoDot: { width:'6px', height:'6px', borderRadius:'50%', background:'var(--accent)', flexShrink:0 },
  ghRepoName: { flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  ghRepoLang: { fontSize:'10px', color:'var(--text-muted)', background:'var(--surface2)', padding:'1px 4px', borderRadius:'4px' },
  statsGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'clamp(8px, 2vw, 16px)' },
  statBox: { backgroundColor:'var(--surface2)', padding:'var(--space-md)', borderRadius:'12px', textAlign:'center' },
  statVal: { fontSize:'clamp(24px, 5vw, 32px)', fontWeight:'bold', color:'var(--accent)', marginBottom:'4px' },
  statLabel: { fontSize:'11px', color:'var(--text-muted)', marginBottom:'8px' },
  statBar: { height:'4px', borderRadius:'4px', background:'var(--border)', overflow:'hidden' },
  statBarFill: { height:'100%', borderRadius:'4px', background:'linear-gradient(90deg, var(--accent), #c9a96e)', transition:'width 1s ease' },
  emptyMini: { padding:'16px', textAlign:'center', border:'1px dashed var(--border)', borderRadius:'12px', color:'var(--text-muted)', cursor:'pointer', fontSize:'12px' },
  recentSection: { marginTop:'var(--space-lg)' },
  recentHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--space-md)', flexWrap:'wrap', gap:'12px' },
  newBtn: { backgroundColor:'var(--accent)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:'10px', fontSize:'13px', cursor:'pointer', fontWeight:'600', boxShadow:'0 4px 12px rgba(201,169,110,0.2)' },
  recentGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap:'var(--space-md)' },
  noteCard: { backgroundColor:'var(--surface)', border:'1px solid var(--border)', borderRadius:'12px', padding:'var(--space-md)', cursor:'pointer', transition:'all 0.3s ease', display:'flex', flexDirection:'column', gap:'8px', position:'relative' },
  notePin: { fontSize:'12px', position:'absolute', top:'10px', right:'10px' },
  noteTitle: { fontSize:'14px', fontWeight:'600', color:'var(--text)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', paddingRight:'20px' },
  noteExcerpt: { fontSize:'12px', color:'var(--text-muted)', margin:0, flex:1, lineHeight:1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  noteFooter: { fontSize:'10px', color:'var(--text-muted)', borderTop:'1px solid var(--border)', paddingTop:'8px', display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' },
  noteTag: { fontSize:'9px', color:'var(--accent)', background:'var(--accent-dim)', padding:'1px 5px', borderRadius:'4px' },
  emptyState: { textAlign:'center', padding:'var(--space-xl)', color:'var(--text-muted)', backgroundColor:'var(--surface)', borderRadius:'12px', border:'1px dashed var(--border)', width:'100%' },
};

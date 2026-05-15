import React, { useState, useEffect } from 'react';

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [locationName, setLocationName] = useState('กำลังค้นหา...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const customLocStr = localStorage.getItem('customWeatherLocation');
    if (customLocStr) {
      try {
        const cl = JSON.parse(customLocStr);
        setLocationName(cl.name);
        fetchWeather(cl.latitude, cl.longitude);
        return;
      } catch { localStorage.removeItem('customWeatherLocation'); }
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => fetchWeather(p.coords.latitude, p.coords.longitude, true),
        () => fetchWeather(13.7563, 100.5018, true),
        { timeout: 8000 }
      );
    } else fetchWeather(13.7563, 100.5018, true);
  }, []);

  const fetchWeather = async (lat, lon, reverseGeo = false) => {
    try {
      const [wr, fr] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,uv_index`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`)
      ]);
      const wd = await wr.json();
      const fd = await fr.json();
      setWeather(wd.current);
      if (fd.daily) {
        const days = fd.daily.time.slice(1, 5).map((t, i) => ({
          day: new Date(t).toLocaleDateString('th-TH', { weekday: 'short' }),
          code: fd.daily.weather_code[i + 1],
          max: Math.round(fd.daily.temperature_2m_max[i + 1]),
          min: Math.round(fd.daily.temperature_2m_min[i + 1]),
        }));
        setForecast(days);
      }
      if (reverseGeo) {
        try {
          const lr = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
          const ld = await lr.json();
          let n = ld.locality || ld.city || '';
          if (ld.principalSubdivision && !n.includes(ld.principalSubdivision)) n += n ? `, ${ld.principalSubdivision}` : ld.principalSubdivision;
          setLocationName(n || 'ไม่ทราบตำแหน่ง');
        } catch {}
      }
    } catch {} finally { setLoading(false); }
  };

  const handleLocationClick = async () => {
    const c = prompt('📍 เปลี่ยนตำแหน่ง\nพิมพ์ชื่อจังหวัด (เว้นว่าง = อัตโนมัติ)');
    if (c === null) return;
    setLoading(true);
    if (!c.trim()) { localStorage.removeItem('customWeatherLocation'); window.location.reload(); return; }
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(c)}&count=1&language=th&format=json`);
      const d = await r.json();
      if (d.results?.length) {
        const { latitude: la, longitude: lo, name: n, admin1 } = d.results[0];
        const dn = admin1 && admin1 !== n ? `${n}, ${admin1}` : n;
        localStorage.setItem('customWeatherLocation', JSON.stringify({ latitude: la, longitude: lo, name: dn }));
        setLocationName(dn);
        fetchWeather(la, lo);
      } else { alert(`❌ ไม่พบ: ${c}`); setLoading(false); }
    } catch { alert('❌ เกิดข้อผิดพลาด'); setLoading(false); }
  };

  const getIcon = (c) => { if(c===0) return '☀️'; if(c<=3) return '⛅'; if(c===45||c===48) return '🌫️'; if(c>=51&&c<=67) return '🌧️'; if(c>=71&&c<=77) return '❄️'; if(c>=80&&c<=82) return '🌦️'; if(c>=95) return '⛈️'; return '🌤️'; };
  const getDesc = (c) => { if(c===0) return 'ท้องฟ้าแจ่มใส'; if(c<=3) return 'มีเมฆบางส่วน'; if(c===45||c===48) return 'หมอกลง'; if(c>=51&&c<=67) return 'ฝนตก'; if(c>=80&&c<=82) return 'ฝนตกเป็นพักๆ'; if(c>=95) return 'พายุฝนฟ้าคะนอง'; return 'อากาศดี'; };

  if (loading) return <div className="widget-shimmer"><div className="shimmer-bar" /></div>;

  return (
    <div className="weather-widget">
      <div className="weather-top">
        <div className="weather-main-icon weather-icon-float">{weather ? getIcon(weather.weather_code) : '🌤️'}</div>
        <div className="weather-main-info">
          <div className="weather-temp">{weather ? Math.round(weather.temperature_2m) : '--'}<span className="weather-unit">°C</span></div>
          <div className="weather-desc">{weather ? getDesc(weather.weather_code) : ''}</div>
          <div className="weather-feels">รู้สึกเหมือน {weather ? Math.round(weather.apparent_temperature) : '--'}°C</div>
        </div>
      </div>
      <div className="weather-detail-row">
        <div className="weather-detail-chip">💨 {weather?.wind_speed_10m || 0} km/h</div>
        <div className="weather-detail-chip">💧 {weather?.relative_humidity_2m || 0}%</div>
        <div className="weather-detail-chip">☀️ UV {weather?.uv_index ?? '--'}</div>
      </div>
      <div className="weather-location-row" onClick={handleLocationClick}>
        <span className="weather-loc-badge">📍 {locationName} ✎</span>
      </div>
      {forecast.length > 0 && (
        <div className="weather-forecast">
          {forecast.map((f, i) => (
            <div key={i} className="forecast-day">
              <span className="forecast-label">{f.day}</span>
              <span className="forecast-icon">{getIcon(f.code)}</span>
              <span className="forecast-temps">{f.max}° / {f.min}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';

export default function PomodoroWidget() {
  const [mode, setMode] = useState('work'); // work | break | longbreak
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);

  const modes = { work: 25 * 60, break: 5 * 60, longbreak: 15 * 60 };
  const modeLabels = { work: '🎯 โฟกัส', break: '☕ พัก', longbreak: '🌿 พักยาว' };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setRunning(false);
            if (mode === 'work') setSessions(s => s + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const switchMode = (m) => { setMode(m); setTimeLeft(modes[m]); setRunning(false); };
  const toggle = () => { if (timeLeft === 0) { setTimeLeft(modes[mode]); } setRunning(!running); };
  const reset = () => { setTimeLeft(modes[mode]); setRunning(false); };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = ((modes[mode] - timeLeft) / modes[mode]) * 100;

  return (
    <div className="pomodoro-widget">
      <div className="pomo-modes">
        {Object.keys(modes).map(m => (
          <button key={m} className={`pomo-mode-btn ${mode === m ? 'active' : ''}`} onClick={() => switchMode(m)}>
            {modeLabels[m]}
          </button>
        ))}
      </div>
      <div className="pomo-timer-ring">
        <svg viewBox="0 0 100 100" className="pomo-svg">
          <circle cx="50" cy="50" r="44" className="pomo-track" />
          <circle cx="50" cy="50" r="44" className={`pomo-progress ${mode}`}
            strokeDasharray={`${progress * 2.764} 276.4`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        </svg>
        <div className="pomo-time">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</div>
      </div>
      <div className="pomo-controls">
        <button className="pomo-btn secondary" onClick={reset}>↺</button>
        <button className={`pomo-btn primary ${running ? 'running' : ''}`} onClick={toggle}>
          {running ? '⏸' : timeLeft === 0 ? '↻' : '▶'}
        </button>
        <div className="pomo-sessions">🍅 ×{sessions}</div>
      </div>
    </div>
  );
}

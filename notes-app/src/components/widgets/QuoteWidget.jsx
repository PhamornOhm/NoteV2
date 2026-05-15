import React, { useState, useEffect } from 'react';

const quotes = [
  { text: 'ความสำเร็จไม่ใช่จุดหมาย แต่เป็นการเดินทาง', author: 'Zig Ziglar' },
  { text: 'จงเป็นการเปลี่ยนแปลงที่คุณต้องการเห็นในโลก', author: 'Mahatma Gandhi' },
  { text: 'ทุกวันเป็นโอกาสใหม่ที่จะเริ่มต้นสิ่งดีๆ', author: 'Unknown' },
  { text: 'การเรียนรู้ไม่มีวันสิ้นสุด', author: 'Leonardo da Vinci' },
  { text: 'ความพยายามอยู่ที่ไหน ความสำเร็จอยู่ที่นั่น', author: 'สุภาษิตไทย' },
  { text: 'อย่าหยุดเพียงเพราะเหนื่อย จงหยุดเมื่อเสร็จแล้ว', author: 'Unknown' },
  { text: 'ชีวิตที่ดีที่สุดคือชีวิตที่เรียบง่ายแต่มีความหมาย', author: 'Confucius' },
  { text: 'จินตนาการสำคัญกว่าความรู้', author: 'Albert Einstein' },
  { text: 'วันนี้คือของขวัญ จึงเรียกว่า ปัจจุบัน', author: 'Bill Keane' },
  { text: 'ทำในสิ่งที่รัก รักในสิ่งที่ทำ', author: 'Steve Jobs' },
];

export default function QuoteWidget() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * quotes.length));
  }, []);

  const next = () => {
    setFade(false);
    setTimeout(() => {
      setIndex(prev => (prev + 1) % quotes.length);
      setFade(true);
    }, 300);
  };

  const q = quotes[index];

  return (
    <div className="quote-widget" onClick={next}>
      <div className="quote-mark">❝</div>
      <div className={`quote-text ${fade ? 'visible' : ''}`}>{q.text}</div>
      <div className={`quote-author ${fade ? 'visible' : ''}`}>— {q.author}</div>
      <div className="quote-hint">คลิกเพื่อเปลี่ยน</div>
    </div>
  );
}

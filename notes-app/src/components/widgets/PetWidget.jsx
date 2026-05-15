import React, { useState, useEffect } from 'react';

export default function PetWidget() {
  const [petImage, setPetImage] = useState(() => {
    return localStorage.getItem('pet_widget_image') || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80';
  });

  const handleImageChange = () => {
    const url = prompt('🐶 ใส่ URL รูปภาพสัตว์เลี้ยงของคุณ (หรือเว้นว่างเพื่อใช้รูปเริ่มต้น):', petImage);
    if (url !== null) {
      const finalUrl = url.trim() || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80';
      setPetImage(finalUrl);
      localStorage.setItem('pet_widget_image', finalUrl);
    }
  };

  return (
    <div className="pet-widget" onClick={handleImageChange} title="คลิกเพื่อเปลี่ยนรูปภาพ">
      <div className="pet-frame">
        <img src={petImage} alt="My Pet" className="pet-img" />
        <div className="pet-tape"></div>
        <div className="pet-tape-2"></div>
      </div>
      <div className="pet-caption">น้องพักผ่อนอยู่ 🐾</div>
    </div>
  );
}

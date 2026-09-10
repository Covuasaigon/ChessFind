'use client';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';

import { getImageUrl } from '@/lib/api-client';

export interface BannerItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  button_text: string;
  button_link: string;
  is_active: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'default-1',
    title: 'Cờ Vua Sài Gòn — Đào tạo & Thi đấu',
    description: 'Tra cứu thành tích và hành trình phát triển trí tuệ của các kỳ thủ trẻ.',
    image_url: '/hero-chess-king.png',
    button_text: 'Xem kết quả',
    button_link: '/?view=tournaments',
    is_active: 1,
    sort_order: 1
  },
  {
    id: 'default-2',
    title: 'Học Thể Thao Trí Tuệ Cờ Vua',
    description: 'Ươm mầm tài năng và rèn luyện tư duy logic cho học sinh.',
    image_url: '/hero-chess-king.png',
    button_text: 'Tìm hiểu thêm',
    button_link: '/?view=search',
    is_active: 1,
    sort_order: 2
  }
];

export interface DynamicBannerProps {
  banners?: BannerItem[];
  onNavigate?: (link: string) => void;
}

export default function DynamicBanner({ banners, onNavigate }: DynamicBannerProps) {
  const list = banners && banners.length > 0 ? banners : DEFAULT_BANNERS;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % list.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [list.length]);

  const handleAction = (url: string) => {
    if (onNavigate && url.startsWith('/')) {
      if (url.includes('tournaments')) onNavigate('tournaments');
      else if (url.includes('search')) onNavigate('search');
      else if (url.includes('saved')) onNavigate('saved');
      else onNavigate('home');
    } else {
      window.location.href = url;
    }
  };

  return (
    <div className="promo-banner-container">
      {list.map((item, idx) => {
        const isActive = idx === index;
        return (
          <div
            key={item.id}
            className={`promo-banner-slide ${isActive ? 'active' : ''}`}
            style={{
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? 'auto' : 'none',
              transform: isActive ? 'scale(1)' : 'scale(0.98)',
              transition: 'opacity 500ms ease, transform 500ms ease'
            }}
          >
            <div className="promo-banner-content-wrapper">
              {/* LEFT 45%: Text Content */}
              <div className="promo-banner-left">
                <div className="banner-badge">
                  <Sparkles size={14} className="gold-sparkle" />
                  <span>THÔNG BÁO NỔI BẬT</span>
                </div>
                <h2 className="banner-title">{item.title}</h2>
                {item.description && <p className="banner-description">{item.description}</p>}

                {item.button_text && (
                  <button
                    className="banner-cta-btn"
                    onClick={() => handleAction(item.button_link || '/')}
                  >
                    <span>{item.button_text}</span>
                    <ArrowRight size={17} />
                  </button>
                )}
              </div>

              {/* RIGHT 55%: Dedicated Image Container with object-fit: contain (100% visible, no crop) */}
              <div className="promo-banner-right">
                <div className="promo-banner-img-frame">
                  <img
                    src={getImageUrl(item.image_url) || '/hero-chess-king.png'}
                    alt={item.title}
                    className="promo-banner-img"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {list.length > 1 && (
        <>
          <button
            className="banner-nav-btn prev"
            onClick={() => setIndex(prev => (prev - 1 + list.length) % list.length)}
            aria-label="Banner trước"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="banner-nav-btn next"
            onClick={() => setIndex(prev => (prev + 1) % list.length)}
            aria-label="Banner tiếp theo"
          >
            <ChevronRight size={20} />
          </button>

          <div className="banner-dots">
            {list.map((_, i) => (
              <button
                key={i}
                className={`banner-dot ${i === index ? 'active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Chuyển đến banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

'use client';
import React, { FormEvent } from 'react';
import { Search, ChevronRight, Sparkles } from 'lucide-react';

export interface HeroConfig {
  badge?: string;
  titleLine1?: string;
  titleHighlight?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  heroImage?: string;
  buttonText?: string;
}

interface HeroSectionProps {
  q: string;
  setQ: (val: string) => void;
  onSearch: (e: FormEvent) => void;
  config?: HeroConfig;
}

export default function HeroSection({ q, setQ, onSearch, config }: HeroSectionProps) {
  const badge = config?.badge || 'TRA CỨU KẾT QUẢ GIẢI ĐẤU';
  const titleLine1 = config?.titleLine1 || 'Mỗi ván cờ,';
  const titleHighlight = config?.titleHighlight || 'một bước trưởng thành.';
  const subtitle = config?.subtitle || 'Tra cứu thành tích thi đấu nhanh chóng, chính xác.';
  const placeholder = config?.searchPlaceholder || 'Nhập tên kỳ thủ';
  const heroImage = config?.heroImage || '/hero-chess-king.png';
  const buttonText = config?.buttonText || 'Tìm kiếm';

  return (
    <section className="hero-card-container">
      {/* Ambient lighting & subtle pattern overlay */}
      <div className="hero-bg-pattern" aria-hidden="true" />
      <div className="hero-ambient-light" aria-hidden="true" />
      <div className="hero-ambient-gold-glow" aria-hidden="true" />

      <div className="hero-content-wrapper">
        {/* LEFT COLUMN (Text Content & Mobile Search) */}
        <div className="hero-left-col">
          {/* 1. Badge */}
          <div className="hero-badge animate-fade-up">
            <span className="hero-badge-icon">♟</span>
            <span className="hero-badge-text">{badge.replace('♟', '').trim()}</span>
          </div>

          {/* 2. Heading */}
          <h1 className="hero-heading animate-fade-up delay-100">
            {titleLine1}
            <br />
            <span className="hero-heading-gold">{titleHighlight}</span>
          </h1>

          {/* 3. Short Description */}
          <p className="hero-subtitle animate-fade-up delay-200">
            {subtitle}
          </p>

          {/* 4. Search Box Container */}
          <form className="hero-search-box animate-slide-up delay-300" onSubmit={onSearch}>
            <div className="hero-search-input-group">
              <Search size={20} className="hero-search-icon pointer-events-none" />
              <input
                type="text"
                aria-label={placeholder}
                placeholder={placeholder}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="hero-search-input"
              />
            </div>
            <button type="submit" className="hero-search-btn">
              <Search size={16} className="mobile-search-btn-icon pointer-events-none" />
              <span>{buttonText}</span>
              <ChevronRight size={16} className="desktop-search-btn-icon pointer-events-none" />
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN (5. Mobile-Optimized Illustration Image: 160-200px height on mobile, 24px radius, contain fit) */}
        <div className="hero-right-col animate-fade-in delay-200">
          <div className="hero-image-frame">
            <img
              src={heroImage}
              alt="Cờ Vua Sài Gòn - Thể thao trí tuệ"
              className="hero-king-image"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

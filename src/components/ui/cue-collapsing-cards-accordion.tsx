import React, { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  formatCardCounter,
  resolveActiveCollapsingId,
  type CollapsingCardItem,
} from '../../utils/collapsingCards';

export type { CollapsingCardItem };

export interface CollapsingCardsProps {
  cards?: CollapsingCardItem[];
  activeId?: string;
  defaultActiveId?: string;
  onSelect?: (card: CollapsingCardItem) => void;
  onAction?: (card: CollapsingCardItem) => void;
  heightClassName?: string;
  ariaLabel?: string;
  className?: string;
}

const DEFAULT_CARDS: CollapsingCardItem[] = [
  {
    id: 'Tokyo',
    wordmark: 'Tokyo',
    japaneseMark: '東京',
    badge: 'Kanto · Metropolis',
    title: 'Tokyo — Neon Crossings & Quiet Shrines',
    subtitle: 'High-speed Yamanote corridors meeting moss-draped Meiji cedar groves.',
    img: '/images/city_tokyo_shibuya_1794670214672.jpg',
    ctaLabel: 'Explore',
  },
  {
    id: 'Kyoto',
    wordmark: 'Kyoto',
    japaneseMark: '京都',
    badge: 'Kansai · Heritage',
    title: 'Kyoto — Vermilion Gates & Bamboo Mist',
    subtitle: 'Dawn walks along Fushimi Inari, Arashiyama groves, and Gion machiya lanes.',
    img: '/images/city_kyoto_arashiyama_1794670217427.jpg',
    ctaLabel: 'Explore',
  },
  {
    id: 'Osaka',
    wordmark: 'Osaka',
    japaneseMark: '大阪',
    badge: 'Kansai · Culinary',
    title: 'Osaka — Dotonbori Canal & Street Kitchens',
    subtitle: 'Lantern-lit kuidaore alleys, takoyaki stalls, and riverside promenades.',
    img: '/images/city_osaka_dotonbori_1794670216998.jpg',
    ctaLabel: 'Explore',
  },
  {
    id: 'Sapporo',
    wordmark: 'Sapporo',
    japaneseMark: '札幌',
    badge: 'Hokkaido · Alpine',
    title: 'Sapporo — Powder Peaks & Onsen Valleys',
    subtitle: 'Steaming mineral baths, miso ramen yokocho, and crisp northern horizons.',
    img: '/images/city_hokkaido_winter_1794670217421.jpg',
    ctaLabel: 'Explore',
  },
  {
    id: 'Kanazawa',
    wordmark: 'Kanazawa',
    japaneseMark: '金沢',
    badge: 'Hokuriku · Artisan',
    title: 'Kanazawa — Gold Leaf Tea Houses & Gardens',
    subtitle: 'Kenroku-en reflection ponds and Edo-era Higashi Chaya wooden lattices.',
    img: '/images/city_kanazawa_garden_1794762230854.jpg',
    ctaLabel: 'Explore',
  },
];

const SCOPED_ACCORDION_CSS = `
.cc-cards {
  display: flex;
  gap: 10px;
  width: 100%;
  font-family: var(--font-sans, system-ui, sans-serif);
}

.cc-card {
  position: relative;
  flex: 0.72;
  min-width: 72px;
  border-radius: 16px;
  overflow: hidden;
  background: #12141c;
  border: 1px solid rgba(255, 255, 255, 0.14);
  transition:
    flex 0.75s cubic-bezier(0.2, 1, 0.3, 1),
    border-color 0.35s ease,
    box-shadow 0.35s ease;
  will-change: flex;
}

.cc-card.cc-expanded {
  flex: 3.1;
}

.cc-card.cc-selected {
  border-color: var(--accent, #f6c945);
  box-shadow:
    0 0 0 1px var(--accent, #f6c945),
    0 18px 36px -18px rgba(0, 0, 0, 0.55);
}

.cc-hit-area {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

.cc-hit-area:focus-visible {
  outline: 2px solid var(--accent, #f6c945);
  outline-offset: -3px;
  border-radius: 15px;
}

.cc-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.06);
  filter: grayscale(28%) brightness(0.72);
  transition:
    transform 0.9s cubic-bezier(0.2, 1, 0.3, 1),
    filter 0.75s cubic-bezier(0.2, 1, 0.3, 1);
  pointer-events: none;
}

.cc-card.cc-expanded .cc-img {
  transform: scale(1);
  filter: grayscale(0%) brightness(0.95);
}

.cc-card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    to top,
    rgba(6, 8, 14, 0.88) 0%,
    rgba(6, 8, 14, 0.44) 38%,
    rgba(6, 8, 14, 0.14) 64%,
    rgba(6, 8, 14, 0.52) 100%
  );
  pointer-events: none;
}

.cc-content {
  position: relative;
  z-index: 3;
  height: 100%;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  pointer-events: none;
}

.cc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cc-idx {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.82);
  font-weight: 500;
  white-space: nowrap;
}

.cc-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(9, 11, 16, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity 0.3s ease 0.1s,
    transform 0.4s cubic-bezier(0.2, 1, 0.3, 1) 0.1s;
  white-space: nowrap;
}

.cc-card.cc-expanded .cc-badge {
  opacity: 1;
  transform: translateY(0);
}

.cc-card.cc-selected .cc-badge {
  border-color: var(--accent, #f6c945);
  color: #fde68a;
}

.cc-meta {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
}

.cc-text-group {
  min-width: 0;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.35s ease 0.14s,
    transform 0.5s cubic-bezier(0.2, 1, 0.3, 1) 0.14s;
}

.cc-card.cc-expanded .cc-text-group {
  opacity: 1;
  transform: translateY(0);
}

.cc-jp {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  letter-spacing: 0.16em;
  color: #fde68a;
  margin-bottom: 4px;
}

.cc-title {
  font-family: var(--font-display, system-ui, sans-serif);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.2;
  color: #ffffff;
}

.cc-subtitle {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.8);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cc-v-title {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%) rotate(180deg);
  writing-mode: vertical-rl;
  font-family: var(--font-display, system-ui, sans-serif);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.9);
  transition: opacity 0.28s ease;
  z-index: 3;
  pointer-events: none;
  white-space: nowrap;
}

.cc-card.cc-expanded .cc-v-title {
  opacity: 0;
}

.cc-cta {
  pointer-events: auto;
  position: relative;
  z-index: 4;
  flex-shrink: 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(9, 11, 16, 0.65);
  color: #ffffff;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.35s ease 0.18s,
    transform 0.5s cubic-bezier(0.2, 1, 0.3, 1) 0.18s,
    background-color 0.2s ease,
    border-color 0.2s ease;
  white-space: nowrap;
}

.cc-cta:hover {
  background: var(--accent, #f6c945);
  border-color: var(--accent, #f6c945);
  color: var(--accent-ink, #090b10);
}

.cc-card.cc-expanded .cc-cta {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 900px) {
  .cc-title {
    font-size: 17px;
  }
  .cc-content {
    padding: 16px;
  }
}

@media (max-width: 640px) {
  .cc-cards {
    flex-direction: column;
    gap: 8px;
    height: auto !important;
  }
  .cc-card {
    flex: 0 0 76px;
    min-width: 0;
    min-height: 76px;
    transition: flex-basis 0.6s cubic-bezier(0.2, 1, 0.3, 1);
  }
  .cc-card.cc-expanded {
    flex: 0 0 228px;
    min-height: 228px;
  }
  .cc-v-title {
    writing-mode: horizontal-tb;
    transform: none;
    left: 16px;
    bottom: 14px;
  }
  .cc-content {
    padding: 12px 16px;
  }
  .cc-subtitle {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cc-card,
  .cc-img,
  .cc-text-group,
  .cc-cta,
  .cc-v-title,
  .cc-badge {
    transition-duration: 0.15s !important;
  }
}
`;

export function CollapsingCards({
  cards = DEFAULT_CARDS,
  activeId,
  defaultActiveId,
  onSelect,
  onAction,
  heightClassName = 'h-[310px] sm:h-[340px]',
  ariaLabel = 'Collapsing destination accordion',
  className = '',
}: CollapsingCardsProps) {
  const [internalId, setInternalId] = useState<string>(
    () => defaultActiveId || cards[0]?.id || ''
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!document.getElementById('cue-collapsing-cards-css')) {
      const style = document.createElement('style');
      style.id = 'cue-collapsing-cards-css';
      style.textContent = SCOPED_ACCORDION_CSS;
      document.head.appendChild(style);
    }
  }, []);

  const selectedId = resolveActiveCollapsingId(cards, activeId, internalId);
  const expandedId =
    hoveredId && cards.some((c) => c.id === hoveredId) ? hoveredId : selectedId;

  return (
    <div
      className={`cc-cards ${heightClassName} ${className}`.trim()}
      role="region"
      aria-label={ariaLabel}
      onMouseLeave={() => setHoveredId(null)}
    >
      {cards.map((card, idx) => {
        const isExpanded = expandedId === card.id;
        const isSelected = selectedId === card.id;

        return (
          <div
            key={card.id}
            className={`cc-card ${isExpanded ? 'cc-expanded' : ''} ${
              isSelected ? 'cc-selected' : ''
            }`.trim()}
            onMouseEnter={() => setHoveredId(card.id)}
          >
            <img
              src={card.img}
              alt={card.title}
              loading="lazy"
              className="cc-img"
            />

            <button
              type="button"
              className="cc-hit-area"
              aria-pressed={isSelected}
              aria-label={card.title}
              onFocus={() => setHoveredId(card.id)}
              onBlur={() => setHoveredId((prev) => (prev === card.id ? null : prev))}
              onClick={() => {
                setInternalId(card.id);
                onSelect?.(card);
              }}
            />

            <div className="cc-v-title" aria-hidden="true">
              {card.wordmark}
            </div>

            <div className="cc-content">
              <div className="cc-top">
                <span className="cc-idx">{formatCardCounter(idx, cards.length)}</span>
                {card.badge && <span className="cc-badge">{card.badge}</span>}
              </div>

              <div className="cc-meta">
                <div className="cc-text-group">
                  {card.japaneseMark && <div className="cc-jp">{card.japaneseMark}</div>}
                  <div className="cc-title">{card.title}</div>
                  {card.subtitle && <p className="cc-subtitle">{card.subtitle}</p>}
                </div>

                <button
                  type="button"
                  className="cc-cta"
                  aria-label={`${card.ctaLabel || 'View'} ${card.wordmark}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setInternalId(card.id);
                    onSelect?.(card);
                    onAction?.(card);
                  }}
                >
                  <span>{card.ctaLabel || 'View'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CollapsingCards;

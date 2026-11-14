import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, X } from 'lucide-react';
import type { CityGuide } from '../data/japanData';

interface EtiquetteOverlayProps {
  city: CityGuide | null;
  visible: boolean;
  onDismiss: () => void;
}

export const EtiquetteOverlay: React.FC<EtiquetteOverlayProps> = ({
  city,
  visible,
  onDismiss,
}) => {
  return (
    <AnimatePresence>
      {visible && city && (
        <motion.aside
          role="region"
          aria-label="Location etiquette tip"
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[410px] z-40 liquid-glass-elevated rounded-2xl p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-accent-soft-token text-accent-token shrink-0 mt-0.5">
                <Compass className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono text-accent-token">
                  {city.id} · {city.district} Etiquette
                </p>
                <h3 className="font-display text-sm font-semibold text-primary-token">
                  {city.etiquetteOverlayTitle}
                </h3>
                <p className="text-xs text-secondary-token leading-relaxed">
                  {city.etiquetteOverlayTip}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss etiquette tip"
              className="p-1.5 rounded-lg text-muted-token hover:text-primary-token shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';

export interface TourStep {
  /** value of [data-tour] attribute on the target element */
  target: string;
  title: string;
  desc: string;
}

interface Props {
  steps: TourStep[];
  /** localStorage key — tour won't show again once set */
  storageKey: string;
  /** delay in ms before showing (gives page time to paint) */
  delay?: number;
}

const PAD    = 12;   // padding around the spotlight hole
const CWIDTH = 330;  // tour card width in px
const COFFSET = 18;  // gap between spotlight and tour card

function getRect(target: string): DOMRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  return el ? el.getBoundingClientRect() : null;
}

export default function TourOverlay({ steps, storageKey, delay = 900 }: Props) {
  const [visible, setVisible]   = useState(false);
  const [show, setShow]         = useState(false);   // drives opacity transition
  const [step, setStep]         = useState(0);
  const [rect, setRect]         = useState<DOMRect | null>(null);
  const [cardAnim, setCardAnim] = useState(false);
  const rafRef = useRef<number | null>(null);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(storageKey)) return;

    const timer = setTimeout(() => {
      const r = getRect(steps[0].target);
      if (!r) return;
      const el = document.querySelector(`[data-tour="${steps[0].target}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        setRect(getRect(steps[0].target));
        setVisible(true);
        requestAnimationFrame(() => {
          setShow(true);
          setTimeout(() => setCardAnim(true), 120);
        });
      }, 350);
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep rect in sync with scroll / resize ────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const sync = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() =>
        setRect(getRect(steps[step].target))
      );
    };
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, step, steps]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
      if (e.key === 'ArrowRight' && step < steps.length - 1) goTo(step + 1);
      if (e.key === 'ArrowLeft'  && step > 0)               goTo(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = useCallback((next: number) => {
    setCardAnim(false);
    setTimeout(() => {
      setStep(next);
      const el = document.querySelector(`[data-tour="${steps[next].target}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        setRect(getRect(steps[next].target));
        setCardAnim(true);
      }, 380);
    }, 150);
  }, [steps]);

  const dismiss = useCallback(() => {
    setShow(false);
    setCardAnim(false);
    setTimeout(() => {
      localStorage.setItem(storageKey, '1');
      setVisible(false);
    }, 300);
  }, [storageKey]);

  if (!visible || !rect) return null;

  const win = { w: window.innerWidth, h: window.innerHeight };

  // Spotlight geometry
  const spot = {
    top:    rect.top    - PAD,
    left:   rect.left   - PAD,
    right:  rect.right  + PAD,
    bottom: rect.bottom + PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  };

  // Card vertical: prefer below, fall back to above
  const spaceBelow = win.h - spot.bottom;
  const spaceAbove = spot.top;
  const cardBelow  = spaceBelow >= 180 || spaceBelow >= spaceAbove;
  const cardTop    = cardBelow
    ? spot.bottom + COFFSET
    : spot.top - COFFSET - 175; // approx card height

  // Card horizontal: center on spotlight, clamp
  const cardLeft = Math.max(
    12,
    Math.min(win.w - CWIDTH - 12, spot.left + spot.width / 2 - CWIDTH / 2)
  );

  // Arrow horizontal offset within card
  const arrowLeft = Math.max(
    14,
    Math.min(CWIDTH - 26, spot.left + spot.width / 2 - cardLeft - 8)
  );

  const cur = steps[step];
  const isLast = step === steps.length - 1;

  // Overlay piece opacity
  const ov = show ? 'bg-black/55' : 'bg-black/0';
  const tr = 'transition-[background-color] duration-300';

  return (
    <div className={`fixed inset-0 z-[200] transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}>

      {/* ── 4-quadrant overlay (creates the spotlight hole) ── */}
      {/* Top */}
      <div className={`absolute inset-x-0 top-0 ${ov} ${tr} cursor-pointer`}
        style={{ height: Math.max(0, spot.top) }} onClick={dismiss} />
      {/* Bottom */}
      <div className={`absolute inset-x-0 bottom-0 ${ov} ${tr} cursor-pointer`}
        style={{ top: spot.bottom }} onClick={dismiss} />
      {/* Left */}
      <div className={`absolute ${ov} ${tr} cursor-pointer`}
        style={{ top: spot.top, left: 0, width: Math.max(0, spot.left), height: spot.height }}
        onClick={dismiss} />
      {/* Right */}
      <div className={`absolute ${ov} ${tr} cursor-pointer`}
        style={{ top: spot.top, left: spot.right, right: 0, height: spot.height }}
        onClick={dismiss} />

      {/* ── Spotlight ring + glow ── */}
      <div
        className="absolute rounded-2xl pointer-events-none transition-all duration-350"
        style={{
          top:    spot.top,
          left:   spot.left,
          width:  spot.width,
          height: spot.height,
          boxShadow: show
            ? '0 0 0 3px #3b82f6, 0 0 0 6px rgba(59,130,246,0.25), 0 0 40px rgba(59,130,246,0.35)'
            : '0 0 0 0px transparent',
          transition: 'box-shadow 0.35s ease',
        }}
      />

      {/* ── Tour card ── */}
      <div
        className={`absolute bg-white rounded-2xl shadow-2xl overflow-visible
          transition-all duration-300
          ${cardAnim ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ top: cardTop, left: cardLeft, width: CWIDTH, zIndex: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Arrow pointing toward spotlight */}
        <div
          className={`absolute w-3.5 h-3.5 bg-white rotate-45 shadow-sm pointer-events-none
            ${cardBelow ? '-top-1.5' : '-bottom-1.5'}`}
          style={{ left: arrowLeft }}
        />

        {/* Card body */}
        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
              {step + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">{cur.title}</h3>
            </div>
            <button
              onClick={dismiss}
              className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-350 transition shrink-0"
            >
              <X size={12} />
            </button>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed mb-4 ml-10">{cur.desc}</p>

          {/* Footer: progress + nav */}
          <div className="flex items-center justify-between">
            {/* Progress pills */}
            <div className="flex gap-1 ml-10">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-5 h-1.5 bg-blue-600'
                      : i < step
                      ? 'w-1.5 h-1.5 bg-blue-300'
                      : 'w-1.5 h-1.5 bg-gray-200 hover:bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => goTo(step - 1)}
                  className="w-7 h-7 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-400 transition"
                >
                  <ChevronLeft size={13} />
                </button>
              )}
              {isLast ? (
                <button
                  onClick={dismiss}
                  className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-medium transition"
                >
                  Selesai ✓
                </button>
              ) : (
                <button
                  onClick={() => goTo(step + 1)}
                  className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-medium transition"
                >
                  Lanjut <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Skip link */}
        <div className="border-t border-gray-50 px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Lightbulb size={11} />
            <span>Tekan ← → untuk navigasi, Esc untuk tutup</span>
          </div>
          <button onClick={dismiss} className="text-xs text-gray-350 hover:text-gray-500 transition">
            Lewati
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as jalaali from 'jalaali-js';
import { CalendarIcon } from './icons';

const MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const WEEKDAYS = ['ش','ی','د','س','چ','پ','ج'];
type Mode = 'day' | 'month' | 'year';

function p2(n: number) { return String(n).padStart(2, '0'); }
function toFa(n: number, minLen = 0) {
  return String(n).padStart(minLen, '0').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

function isoToJalali(iso: string): { jy: number; jm: number; jd: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [gy, gm, gd] = iso.split('-').map(Number);
  try { return jalaali.toJalaali(gy, gm, gd); } catch { return null; }
}

function jalaliToISO(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return `${gy}-${p2(gm)}-${p2(gd)}`;
}

function daysInMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalaali.isLeapJalaaliYear(jy) ? 30 : 29;
}

function firstWeekday(jy: number, jm: number): number {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, 1);
  return (new Date(gy, gm - 1, gd).getDay() + 1) % 7;
}

const C = {
  primary: '#22C55E',
  border: 'rgba(255,255,255,0.09)',
  text: 'rgba(240,246,255,0.92)',
  muted: 'rgba(200,215,235,0.60)',
};

/* ─── shared button styles ─────────────────────────────────────── */
const navBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 9, width: 30, height: 30,
  cursor: 'pointer', color: C.muted,
  fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};

const headerBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 10, padding: '5px 12px',
  cursor: 'pointer', color: C.text,
  fontSize: 13, fontWeight: 800,
  fontFamily: 'Vazirmatn, sans-serif',
  transition: 'background 0.12s',
};

/* ─── Component ────────────────────────────────────────────────── */
export default function PersianDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const today = new Date();
  const todayJ = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const selJ = isoToJalali(value);

  const [open, setOpen]       = useState(false);
  const [mode, setMode]       = useState<Mode>('day');
  const [viewY, setViewY]     = useState(selJ?.jy ?? todayJ.jy);
  const [viewM, setViewM]     = useState(selJ?.jm ?? todayJ.jm);
  const [yearPage, setYearPage] = useState(Math.floor((selJ?.jy ?? todayJ.jy) / 12) * 12);
  const [popupPos, setPopupPos] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const el = document.getElementById('__pdp__');
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (selJ) { setViewY(selJ.jy); setViewM(selJ.jm); }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function openPicker() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const popH = 320;
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const top = spaceBelow >= popH ? r.bottom + 6 : r.top - popH - 6;
      setPopupPos({
        position: 'fixed',
        top: Math.max(8, top),
        left: r.left,
        width: Math.max(r.width, 272),
        maxWidth: 310,
      });
    }
    const j = selJ ?? todayJ;
    setViewY(j.jy); setViewM(j.jm);
    setYearPage(Math.floor(j.jy / 12) * 12);
    setMode('day');
    setOpen(true);
  }

  /* ── navigation ── */
  function prevMonth() {
    if (viewM === 1) { setViewY((y: number) => y - 1); setViewM(12); }
    else setViewM((m: number) => m - 1);
  }
  function nextMonth() {
    if (viewM === 12) { setViewY((y: number) => y + 1); setViewM(1); }
    else setViewM((m: number) => m + 1);
  }

  function pickDay(day: number) {
    onChange(jalaliToISO(viewY, viewM, day));
    setOpen(false);
  }
  function pickMonth(m: number) {
    setViewM(m);
    setMode('day');
  }
  function pickYear(y: number) {
    setViewY(y);
    setYearPage(Math.floor(y / 12) * 12);
    setMode('month');
  }

  /* ── display value ── */
  const displayVal = selJ
    ? `${toFa(selJ.jy)}/${toFa(selJ.jm, 2)}/${toFa(selJ.jd, 2)}`
    : '';

  /* ── day grid cells ── */
  const total = daysInMonth(viewY, viewM);
  const start = firstWeekday(viewY, viewM);
  const dayCells: (number | null)[] = [
    ...Array<null>(start).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  /* ── year grid (12 per page) ── */
  const yearCells = Array.from({ length: 12 }, (_, i) => yearPage + i);

  /* ── popup content ── */
  const popup = (
    <div
      id="__pdp__"
      style={{
        ...popupPos,
        zIndex: 99999,
        background: '#0D1F38',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 18,
        padding: '12px 12px 14px',
        boxShadow: '0 24px 72px rgba(0,0,0,0.70), 0 4px 16px rgba(0,0,0,0.40)',
        userSelect: 'none',
        direction: 'rtl',
      }}
    >
      {/* ── DAY VIEW ── */}
      {mode === 'day' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 6 }}>
            <button type="button" onClick={nextMonth} style={navBtn}>›</button>
            <div style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setMode('month')}
                style={headerBtn}
              >
                {MONTHS[viewM - 1]}
              </button>
              <button
                type="button"
                onClick={() => { setYearPage(Math.floor(viewY / 12) * 12); setMode('year'); }}
                style={headerBtn}
              >
                {toFa(viewY)}
              </button>
            </div>
            <button type="button" onClick={prevMonth} style={navBtn}>‹</button>
          </div>

          {/* weekday header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, color: C.muted, fontWeight: 700, fontFamily: 'Vazirmatn, sans-serif', padding: '2px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {dayCells.map((day, i) => {
              if (!day) return <div key={`_${i}`} />;
              const isSel   = selJ && selJ.jy === viewY && selJ.jm === viewM && selJ.jd === day;
              const isToday = todayJ.jy === viewY && todayJ.jm === viewM && todayJ.jd === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pickDay(day)}
                  style={{
                    padding: '7px 2px', borderRadius: 9,
                    border: isToday && !isSel ? '1.5px solid rgba(0,206,180,0.60)' : '1.5px solid transparent',
                    background: isSel ? C.primary : 'transparent',
                    color: isSel ? 'white' : isToday ? C.primary : C.text,
                    fontSize: 12.5, fontWeight: isSel || isToday ? 800 : 400,
                    cursor: 'pointer', fontFamily: 'Vazirmatn, sans-serif',
                    textAlign: 'center', transition: 'background 0.10s',
                  }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,206,180,0.15)'; }}
                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {toFa(day)}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── MONTH VIEW ── */}
      {mode === 'month' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 6 }}>
            <button type="button" onClick={() => setViewY((y: number) => y + 1)} style={navBtn}>›</button>
            <button
              type="button"
              onClick={() => { setYearPage(Math.floor(viewY / 12) * 12); setMode('year'); }}
              style={{ ...headerBtn, flex: 1, textAlign: 'center' as const }}
            >
              {toFa(viewY)}
            </button>
            <button type="button" onClick={() => setViewY((y: number) => y - 1)} style={navBtn}>‹</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {MONTHS.map((name, i) => {
              const m = i + 1;
              const isSel   = selJ && selJ.jy === viewY && selJ.jm === m;
              const isToday = todayJ.jy === viewY && todayJ.jm === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMonth(m)}
                  style={{
                    padding: '10px 4px', borderRadius: 11,
                    border: isToday && !isSel ? '1.5px solid rgba(0,206,180,0.55)' : '1.5px solid transparent',
                    background: isSel ? C.primary : 'rgba(255,255,255,0.05)',
                    color: isSel ? 'white' : isToday ? C.primary : C.text,
                    fontSize: 12, fontWeight: isSel || isToday ? 800 : 500,
                    cursor: 'pointer', fontFamily: 'Vazirmatn, sans-serif',
                    textAlign: 'center', transition: 'background 0.10s',
                  }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,206,180,0.15)'; }}
                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── YEAR VIEW ── */}
      {mode === 'year' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 6 }}>
            <button type="button" onClick={() => setYearPage((p: number) => p + 12)} style={navBtn}>›</button>
            <span style={{ color: C.text, fontWeight: 800, fontSize: 13, fontFamily: 'Vazirmatn, sans-serif', flex: 1, textAlign: 'center' }}>
              {toFa(yearPage)} – {toFa(yearPage + 11)}
            </span>
            <button type="button" onClick={() => setYearPage((p: number) => p - 12)} style={navBtn}>‹</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {yearCells.map(y => {
              const isSel   = selJ && selJ.jy === y;
              const isToday = todayJ.jy === y;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => pickYear(y)}
                  style={{
                    padding: '10px 4px', borderRadius: 11,
                    border: isToday && !isSel ? '1.5px solid rgba(0,206,180,0.55)' : '1.5px solid transparent',
                    background: isSel ? C.primary : 'rgba(255,255,255,0.05)',
                    color: isSel ? 'white' : isToday ? C.primary : C.text,
                    fontSize: 12, fontWeight: isSel || isToday ? 800 : 500,
                    cursor: 'pointer', fontFamily: 'Vazirmatn, sans-serif',
                    textAlign: 'center', transition: 'background 0.10s',
                  }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,206,180,0.15)'; }}
                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  {toFa(y)}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? C.primary : C.border}`,
          borderRadius: 14, padding: '11px 14px',
          fontSize: 13, fontWeight: value ? 600 : 400,
          color: value ? C.text : C.muted,
          fontFamily: 'Vazirmatn, sans-serif',
          cursor: 'pointer', textAlign: 'right',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
          direction: 'rtl',
        }}
      >
        <span>{displayVal || 'انتخاب تاریخ'}</span>
        <span style={{ opacity: 0.65, display: 'flex' }}><CalendarIcon size={15} /></span>
      </button>

      {open && mounted && createPortal(popup, document.body)}
    </>
  );
}

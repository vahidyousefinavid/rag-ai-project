'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IranFlag } from './icons';

/* ── Persian letters used in Iranian plates ─────────────────────── */
const LETTERS = [
  'الف','ب','پ','ت','ث','ج',
  'د','ذ','ر','ز','ژ','س',
  'ش','ص','ط','ع','ف','ق',
  'ک','گ','ل','م','ن','و',
  'ه','ی',
];

/* ── Province code lookup ───────────────────────────────────────── */
const PROV: Record<string, string> = {
  '11':'تهران','14':'قم','22':'البرز','23':'سمنان',
  '31':'آذ.غربی','32':'اردبیل','33':'اصفهان','34':'کرمانشاه',
  '35':'کردستان','36':'کرمان','41':'سیستان','42':'لرستان',
  '43':'همدان','44':'خوزستان','46':'هرمزگان','47':'ایلام',
  '48':'چهارمحال','49':'بوشهر','51':'گلستان','53':'قزوین',
  '54':'یزد','55':'فارس','56':'زنجان','66':'خراسان رضوی',
  '77':'آذ.شرقی','88':'گیلان','99':'مازندران',
};

/* ── Parse stored plate string into parts ───────────────────────── */
function parse(val: string) {
  if (!val) return { n1: '', letter: '', n2: '', prov: '' };
  const s = val.trim();
  const dashIdx = s.lastIndexOf('-');
  const prov = dashIdx >= 0 ? s.slice(dashIdx + 1).trim().replace(/\D/g, '').slice(0, 2) : '';
  const main  = dashIdx >= 0 ? s.slice(0, dashIdx).trim() : s;
  let n1 = '', letter = '', n2 = '';
  for (const part of main.split(/\s+/)) {
    if (!part) continue;
    if (/^\d+$/.test(part)) { if (!n1) n1 = part.slice(0, 2); else if (!n2) n2 = part.slice(0, 3); }
    else letter = part;
  }
  return { n1, letter, n2, prov };
}

function build(n1: string, letter: string, n2: string, prov: string) {
  const main = [n1, letter, n2].filter(Boolean).join(' ');
  return prov ? `${main}-${prov}` : main;
}

/* ── Shared input style (transparent, plate look) ──────────────── */
function numStyle(w: number): React.CSSProperties {
  return {
    width: w, background: 'transparent', border: 'none', outline: 'none',
    textAlign: 'center', fontSize: 22, fontWeight: 900, color: '#1a1a1a',
    fontFamily: "'Courier New', monospace", letterSpacing: 3,
    direction: 'ltr', padding: 0,
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function PlateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const init = parse(value);
  const [n1,     setN1]     = useState(init.n1);
  const [letter, setLetter] = useState(init.letter);
  const [n2,     setN2]     = useState(init.n2);
  const [prov,   setProv]   = useState(init.prov);

  const [letterOpen, setLetterOpen] = useState(false);
  const [letterPos,  setLetterPos]  = useState<React.CSSProperties>({});
  const [mounted,    setMounted]    = useState(false);

  const letterBtnRef = useRef<HTMLButtonElement>(null);
  const n1Ref        = useRef<HTMLInputElement>(null);
  const n2Ref        = useRef<HTMLInputElement>(null);
  const provRef      = useRef<HTMLInputElement>(null);
  const selfEmit     = useRef(false);   // prevents circular update from own onChange

  useEffect(() => setMounted(true), []);

  /* sync from parent only when the parent (not us) changed value */
  useEffect(() => {
    if (selfEmit.current) { selfEmit.current = false; return; }
    const p = parse(value);
    setN1(p.n1); setLetter(p.letter); setN2(p.n2); setProv(p.prov);
  }, [value]);

  /* close letter popup on outside click */
  useEffect(() => {
    if (!letterOpen) return;
    const h = (e: MouseEvent) => {
      const el = document.getElementById('__pl_letters__');
      if (el && !el.contains(e.target as Node)) setLetterOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [letterOpen]);

  function emit(a: string, b: string, c: string, d: string) {
    selfEmit.current = true;
    onChange(build(a, b, c, d));
  }

  function openLetters() {
    if (letterBtnRef.current) {
      const r = letterBtnRef.current.getBoundingClientRect();
      setLetterPos({
        position: 'fixed',
        top: r.bottom + 8,
        left: Math.max(8, r.left + r.width / 2 - 148),
        width: 296,
        zIndex: 99999,
      });
    }
    setLetterOpen(true);
  }

  function pickLetter(l: string) {
    setLetter(l);
    emit(n1, l, n2, prov);
    setLetterOpen(false);
    n2Ref.current?.focus();
  }

  const provName = PROV[prov] ?? '';

  /* ── render ── */
  return (
    <div style={{ direction: 'ltr' }}>

      {/* ── Plate visual ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 6px 28px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.10)',
        height: 68, border: '2px solid rgba(0,0,0,0.28)',
        userSelect: 'none',
      }}>

        {/* LEFT blue strip */}
        <div style={{
          width: 52, flexShrink: 0,
          background: 'linear-gradient(160deg,#0d3c7a 0%,#1a5296 50%,#0d3c7a 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
          borderRight: '2px solid rgba(0,0,0,0.20)',
        }}>
          <IranFlag width={22} height={15} />
          <span style={{
            color: 'rgba(255,255,255,0.90)', fontSize: 10, fontWeight: 900,
            letterSpacing: 1.5, fontFamily: 'monospace',
          }}>IRAN</span>
        </div>

        {/* MAIN white plate area */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(180deg,#f8f8f4 0%,#efefea 100%)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 4, padding: '0 8px',
          borderRight: '2px solid rgba(0,0,0,0.15)',
          position: 'relative',
        }}>
          {/* thin green/red/green stripe at top (real plate detail) */}
          <div style={{
            position:'absolute', top: 0, left: 0, right: 0,
            height: 5, display: 'flex',
          }}>
            <div style={{ flex: 1, background: '#1b8e3d' }} />
            <div style={{ flex: 1, background: '#d0021b' }} />
            <div style={{ flex: 1, background: '#1b8e3d' }} />
          </div>

          {/* Part 1 – 2 digits */}
          <input
            ref={n1Ref}
            value={n1}
            onChange={e => {
              const v = e.target.value.replace(/\D/g,'').slice(0,2);
              setN1(v); emit(v, letter, n2, prov);
              if (v.length === 2) letterBtnRef.current?.focus();
            }}
            maxLength={2}
            placeholder="12"
            style={numStyle(42)}
          />

          {/* Divider */}
          <span style={{ color: '#bbb', fontSize: 20, fontWeight: 300, lineHeight: 1 }}>|</span>

          {/* Part 2 – Persian letter */}
          <button
            ref={letterBtnRef}
            type="button"
            onClick={openLetters}
            style={{
              background: letter ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,80,0.06)',
              border: `1.5px solid ${letter ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,200,0.20)'}`,
              borderRadius: 8, padding: '3px 8px',
              cursor: 'pointer', minWidth: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              fontSize: 18, fontWeight: 900, color: '#1a1a1a',
              fontFamily: 'Vazirmatn, sans-serif',
              direction: 'rtl',
            }}>
              {letter || <span style={{ color: '#aaa', fontSize: 13 }}>حرف</span>}
            </span>
            <span style={{ fontSize: 9, color: '#999', marginTop: 2 }}>▾</span>
          </button>

          {/* Divider */}
          <span style={{ color: '#bbb', fontSize: 20, fontWeight: 300, lineHeight: 1 }}>|</span>

          {/* Part 3 – 3 digits */}
          <input
            ref={n2Ref}
            value={n2}
            onChange={e => {
              const v = e.target.value.replace(/\D/g,'').slice(0,3);
              setN2(v); emit(n1, letter, v, prov);
              if (v.length === 3) provRef.current?.focus();
            }}
            maxLength={3}
            placeholder="345"
            style={numStyle(58)}
          />
        </div>

        {/* RIGHT province strip */}
        <div style={{
          width: 58, flexShrink: 0,
          background: 'linear-gradient(160deg,#0d3c7a 0%,#1a5296 50%,#0d3c7a 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
          padding: '0 4px',
        }}>
          <input
            ref={provRef}
            value={prov}
            onChange={e => {
              const v = e.target.value.replace(/\D/g,'').slice(0,2);
              setProv(v); emit(n1, letter, n2, v);
            }}
            maxLength={2}
            placeholder="11"
            style={{
              width: 42, background: 'transparent', border: 'none', outline: 'none',
              textAlign: 'center', fontSize: 22, fontWeight: 900, color: 'white',
              fontFamily: "'Courier New', monospace", letterSpacing: 3, padding: 0,
              direction: 'ltr',
            }}
          />
          <span style={{
            color: provName ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.35)',
            fontSize: provName ? 8 : 8, fontWeight: 700,
            fontFamily: 'Vazirmatn, sans-serif',
            textAlign: 'center', lineHeight: 1.2,
            maxWidth: 52, overflow: 'hidden',
          }}>
            {provName || 'کد'}
          </span>
        </div>
      </div>

      {/* ── Helper labels below ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, direction: 'ltr', gap: 0 }}>
        <span style={{ width: 52, textAlign: 'center', fontSize: 10, color: 'rgba(200,215,235,0.38)', fontFamily: 'Vazirmatn, sans-serif' }}>ایران</span>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
          <span style={{ fontSize: 10, color: 'rgba(200,215,235,0.38)', fontFamily: 'Vazirmatn, sans-serif' }}>۲ رقم</span>
          <span style={{ fontSize: 10, color: 'rgba(200,215,235,0.38)', fontFamily: 'Vazirmatn, sans-serif' }}>حرف</span>
          <span style={{ fontSize: 10, color: 'rgba(200,215,235,0.38)', fontFamily: 'Vazirmatn, sans-serif' }}>۳ رقم</span>
        </div>
        <span style={{ width: 58, textAlign: 'center', fontSize: 10, color: 'rgba(200,215,235,0.38)', fontFamily: 'Vazirmatn, sans-serif' }}>استان</span>
      </div>

      {/* ── Letter picker popup (via portal) ─────────────────────── */}
      {letterOpen && mounted && createPortal(
        <div
          id="__pl_letters__"
          style={{
            ...letterPos,
            background: '#0D1F38',
            border: '1px solid rgba(255,255,255,0.13)',
            borderRadius: 18, padding: '12px 12px 14px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.65)',
            direction: 'rtl',
          }}
        >
          <p style={{
            color: 'rgba(200,215,235,0.55)', fontSize: 11, fontWeight: 700,
            margin: '0 0 10px', fontFamily: 'Vazirmatn, sans-serif', textAlign: 'center',
          }}>
            انتخاب حرف پلاک
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6 }}>
            {LETTERS.map(l => {
              const active = letter === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => pickLetter(l)}
                  style={{
                    padding: '9px 4px', borderRadius: 10,
                    border: `1.5px solid ${active ? '#22C55E' : 'rgba(255,255,255,0.09)'}`,
                    background: active ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.05)',
                    color: active ? '#22C55E' : 'rgba(240,246,255,0.88)',
                    fontSize: 13, fontWeight: active ? 800 : 500,
                    cursor: 'pointer', fontFamily: 'Vazirmatn, sans-serif',
                    textAlign: 'center', transition: 'all 0.10s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.12)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

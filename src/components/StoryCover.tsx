import React from 'react';
import { BookOpen } from 'lucide-react';

interface Props {
  title: string;
  cover?: string;
  className?: string;
}

const PALETTES = [
  'from-slate-800 to-slate-950',
  'from-blue-800 to-indigo-950',
  'from-emerald-800 to-teal-950',
  'from-amber-800 to-stone-950',
  'from-indigo-800 to-slate-950',
];

function pickPalette(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

export const StoryCover: React.FC<Props> = ({ title, cover, className = '' }) => {
  const initial = Array.from(title.normalize('NFC').trim())[0]?.toUpperCase() || 'T';
  const palette = pickPalette(title);

  if (cover) {
    return (
      <div
        className={`relative overflow-hidden bg-slate-200 dark:bg-slate-800 ${className}`}
      >
        <img
          src={cover}
          alt={title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover block"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${palette} flex flex-col items-center justify-center p-3 text-center select-none ${className}`}
    >
      <BookOpen className="w-5 h-5 text-white/40 mb-1.5" />
      <span className="font-serif text-3xl font-semibold text-white/95 leading-none">
        {initial}
      </span>
      <span className="mt-2 text-[11px] font-medium text-white/70 line-clamp-2 leading-tight px-1">
        {title}
      </span>
    </div>
  );
};

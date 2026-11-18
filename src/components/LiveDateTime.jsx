import React, { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { formatLocalDate, formatLocalTime } from '../lib/localDateTime';

export default function LiveDateTime({ className = '' }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const date = formatLocalDate(now);
  const time = formatLocalTime(now);

  return (
    <div
      className={`inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap text-[10px] font-medium leading-tight text-white/90 sm:gap-2 sm:text-[11px] ${className}`}
      aria-label={`Current local date and time: ${date}, ${time}`}
    >
      <Clock3 size={14} className="shrink-0 text-[#D5C292]" aria-hidden="true" />
      <time dateTime={now.toISOString()}>{date}</time>
      <span className="text-white/40" aria-hidden="true">·</span>
      <time dateTime={now.toISOString()}>{time}</time>
    </div>
  );
}

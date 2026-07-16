"use client";

export default function CharCounter({ current, max }: { current: number; max: number }) {
  const nearLimit = current >= max * 0.9;
  const atLimit = current >= max;
  return (
    <p className={`text-xs text-right ${atLimit ? "text-red-400" : nearLimit ? "text-amber-400" : "text-gray-600"}`}>
      {current}/{max}
    </p>
  );
}

export function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function timeAgo(dateStr: string, now = Date.now()): string {
  const diffMs = now - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m atrás`;
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? "dia" : "dias"} atrás`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? "mês" : "meses"} atrás`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} ${diffYears === 1 ? "ano" : "anos"} atrás`;
}

export function outlierColor(score: number): string {
  if (score >= 5) return "text-red-400";
  if (score >= 3) return "text-orange-400";
  if (score >= 2) return "text-yellow-400";
  if (score >= 1) return "text-green-400";
  return "text-gray-500";
}

export function outlierBg(score: number): string {
  if (score >= 5) return "bg-red-500/20 border-red-500/40";
  if (score >= 3) return "bg-orange-500/20 border-orange-500/40";
  if (score >= 2) return "bg-yellow-500/20 border-yellow-500/40";
  if (score >= 1) return "bg-green-500/20 border-green-500/40";
  return "bg-gray-700/20 border-gray-600/40";
}

export function expiresIn(dateStr: string): string {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  if (diffMs <= 0) return "expirado";
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays >= 1) return `${diffDays} dia${diffDays !== 1 ? "s" : ""}`;
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours >= 1) return `${diffHours}h`;
  return "menos de 1h";
}

export function commentTypeLabel(type: string): { label: string; color: string } {
  switch (type) {
    case "FEEDBACK":
      return { label: "Feedback", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
    case "DIRECIONAMENTO":
      return { label: "Direcionamento", color: "text-violet-400 bg-violet-500/10 border-violet-500/30" };
    case "OBSERVACAO":
      return { label: "Observação", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    case "RESPOSTA":
      return { label: "Resposta", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    default:
      return { label: type, color: "text-gray-400 bg-gray-500/10 border-gray-500/30" };
  }
}

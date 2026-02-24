export default function LiveIndicator({ label = 'LIVE' }: { label?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-green-600 pulse-dot" />
      <span className="font-sans font-medium text-[9px] uppercase tracking-[0.15em] text-green-600">{label}</span>
    </div>
  );
}

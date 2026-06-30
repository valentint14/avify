export default function KpiCard({ label, value, unit }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold tracking-tight">
        {value}
        {unit && (
          <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>
        )}
      </p>
    </div>
  );
}

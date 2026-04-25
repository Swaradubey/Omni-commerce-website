export function DashboardPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh] bg-white dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
      <h2 className="text-2xl font-bold mb-2 tracking-tight">{title}</h2>
      <p className="text-muted-foreground">
        This module is currently being provisioned. Data will appear here once connected.
      </p>
    </div>
  );
}

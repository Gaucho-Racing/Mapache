import { DataCluster, Session } from "@/models/lapache";

export interface LoadTarget {
  startTime: string;
  endTime: string;
  label: string;
  session: Session | null;
}

interface SessionSidebarProps {
  sessions: Session[];
  clusters: DataCluster[];
  selectedLabel: string | null;
  loading: boolean;
  onSelect: (target: LoadTarget) => void;
}

function fmtRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleTimeString()} — ${e.toLocaleTimeString()}`;
}

function dateKey(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export default function SessionSidebar({
  sessions,
  clusters,
  selectedLabel,
  loading,
  onSelect,
}: SessionSidebarProps) {
  // Group clusters by date for the raw-data browser.
  const byDate: Record<string, DataCluster[]> = {};
  for (const c of clusters) {
    const k = dateKey(c.start_time);
    (byDate[k] ??= []).push(c);
  }

  const rowClass = (label: string) =>
    `cursor-pointer rounded px-2 py-1.5 text-sm transition-colors ${
      selectedLabel === label
        ? "bg-gradient-to-br from-gr-pink to-gr-purple text-white"
        : "hover:bg-neutral-800"
    }`;

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto">
      <div>
        <div className="mb-1 text-xs font-semibold uppercase text-neutral-500">
          Sessions
        </div>
        {sessions.length === 0 && (
          <div className="px-2 py-1 text-xs text-neutral-600">None</div>
        )}
        {sessions.map((s) => {
          const label = `ssn:${s.id}`;
          return (
            <div
              key={s.id}
              className={rowClass(label)}
              onClick={() =>
                onSelect({
                  startTime: s.start_time,
                  endTime: s.end_time,
                  label,
                  session: s,
                })
              }
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{s.name || s.id}</span>
                {s.analysis && <span className="text-xs">✓</span>}
              </div>
              <div className="text-xs opacity-70">
                {fmtRange(s.start_time, s.end_time)}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase text-neutral-500">
          <span>Raw Data</span>
          {loading && <span className="text-neutral-600">loading…</span>}
        </div>
        {clusters.length === 0 && !loading && (
          <div className="px-2 py-1 text-xs text-neutral-600">
            No data clusters
          </div>
        )}
        {Object.entries(byDate).map(([date, list]) => (
          <div key={date} className="mb-2">
            <div className="px-2 py-1 text-xs text-neutral-400">{date}</div>
            {list.map((c, i) => {
              const label = `cluster:${c.start_time}`;
              return (
                <div
                  key={i}
                  className={rowClass(label)}
                  onClick={() =>
                    onSelect({
                      startTime: c.start_time,
                      endTime: c.end_time,
                      label,
                      session: null,
                    })
                  }
                >
                  {fmtRange(c.start_time, c.end_time)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SignalOption {
  id: string;
  name?: string;
}

interface SignalTreeProps {
  signals: SignalOption[];
  /** Returns true if the signal id is currently selected. */
  isSelected: (id: string) => boolean;
  /** Called when a signal row is clicked. */
  onSelect: (id: string) => void;
}

/** Split an id like "ecu_acc_pedal" into its node ("ecu") and remainder ("acc_pedal"). */
function splitNode(id: string): { node: string; rest: string } {
  const idx = id.indexOf("_");
  if (idx === -1) return { node: "other", rest: id };
  return { node: id.slice(0, idx), rest: id.slice(idx + 1) };
}

/** Human-friendly label, e.g. "acc_pedal" -> "acc pedal". */
function formatLabel(signal: SignalOption): string {
  if (signal.name && signal.name.trim() !== "") return signal.name;
  return splitNode(signal.id).rest.replace(/_/g, " ");
}

/**
 * A searchable, node-grouped list of signals. Signals are grouped by their
 * leading node prefix (ecu_, bcu_, …); each group collapses/expands on click.
 */
export function SignalTree({ signals, isSelected, onSelect }: SignalTreeProps) {
  const [search, setSearch] = useState("");
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({});

  const query = search.trim().toLowerCase();

  const groups = useMemo(() => {
    const filtered = query
      ? signals.filter(
          (s) =>
            s.id.toLowerCase().includes(query) ||
            (s.name ?? "").toLowerCase().includes(query),
        )
      : signals;

    const byNode = new Map<string, SignalOption[]>();
    for (const signal of filtered) {
      const { node } = splitNode(signal.id);
      const list = byNode.get(node) ?? [];
      list.push(signal);
      byNode.set(node, list);
    }

    return Array.from(byNode.entries())
      .map(([node, items]) => ({
        node,
        items: items.sort((a, b) => a.id.localeCompare(b.id)),
      }))
      .sort((a, b) => a.node.localeCompare(b.node));
  }, [signals, query]);

  const toggleNode = (node: string) =>
    setOpenNodes((prev) => ({ ...prev, [node]: !prev[node] }));

  return (
    <div className="flex flex-col gap-1">
      <div className="sticky top-0 z-10 bg-background p-2">
        <Input
          className="bg-transparent"
          placeholder="Search signals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {groups.length === 0 ? (
        <div className="p-2 pb-4 text-center text-sm text-muted-foreground">
          No signals found
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map(({ node, items }) => {
            // Auto-expand while searching so matches are visible.
            const open = query !== "" || openNodes[node];
            return (
              <div key={node} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleNode(node)}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-card"
                >
                  <span className="text-sm font-semibold uppercase tracking-wide">
                    {node}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {items.length}
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        open && "rotate-90",
                      )}
                    />
                  </span>
                </button>

                {open && (
                  <div className="flex flex-col">
                    {items.map((signal) => {
                      const selected = isSelected(signal.id);
                      return (
                        <button
                          type="button"
                          key={signal.id}
                          onClick={() => onSelect(signal.id)}
                          className="flex items-center gap-3 rounded px-4 py-1 pl-6 text-left hover:bg-card"
                        >
                          {selected ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 fill-gr-pink text-white" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-white" />
                          )}
                          <div className="min-w-0">
                            <div className="truncate capitalize">
                              {formatLabel(signal)}
                            </div>
                            <div className="truncate text-sm text-muted-foreground">
                              {signal.id}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

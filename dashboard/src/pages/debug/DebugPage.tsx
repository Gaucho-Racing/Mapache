import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import MessageTraceDialog from "@/components/debug/MessageTraceDialog";
import { BACKEND_WS_URL } from "@/consts/config";
import { useVehicle, useVehicleList } from "@/lib/store";
import { Signal } from "@/models/signal";
import { formatTimeWithMillis } from "@/lib/utils";
import {
  MutableRefObject,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface SignalState {
  name: string;
  value: number;
  rawValue: number;
  producedAtFormatted: string;
  lastSeen: number;
  count: number;
  // Set when gr26 includes can_message_id in the WS payload. Lets the
  // row click open the trace dialog for the source CAN frame.
  canMessageId?: string;
}

type SortKey = "name" | "value" | "rawValue" | "lastSeen" | "count";
type SortDir = "asc" | "desc";

// Cap the table re-render rate. Ingest still runs at WS rate into refs;
// the table only paints this often.
const FLUSH_INTERVAL_MS = 200;

function rawToHex(n: number): string {
  if (!Number.isFinite(n) || !Number.isInteger(n)) return String(n);
  if (n >= 0) return "0x" + n.toString(16).toUpperCase();
  if (n >= -0x80)
    return "0x" + (n & 0xff).toString(16).toUpperCase().padStart(2, "0");
  if (n >= -0x8000)
    return "0x" + (n & 0xffff).toString(16).toUpperCase().padStart(4, "0");
  if (n >= -0x80000000)
    return "0x" + (n >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return n.toString();
}

// Isolated WS bridge. Lives in its own component so that lastMessage state
// updates only re-render this null-rendering child — the parent (and Layout
// tree above it) never re-render at WS rate.
const WsBridge = memo(function WsBridge({
  socketUrl,
  signalsRef,
  totalRef,
  onReadyChange,
}: {
  socketUrl: string | null;
  signalsRef: MutableRefObject<Map<string, SignalState>>;
  totalRef: MutableRefObject<number>;
  onReadyChange: (state: ReadyState) => void;
}) {
  const { lastMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
  });

  useEffect(() => {
    onReadyChange(readyState);
  }, [readyState, onReadyChange]);

  useEffect(() => {
    if (!lastMessage) return;
    let parsed: Signal;
    try {
      parsed = JSON.parse(lastMessage.data) as Signal;
    } catch {
      return;
    }
    if (!parsed.name) return;
    totalRef.current += 1;
    const existing = signalsRef.current.get(parsed.name);
    signalsRef.current.set(parsed.name, {
      name: parsed.name,
      value: parsed.value,
      rawValue: parsed.raw_value,
      producedAtFormatted: formatTimeWithMillis(new Date(parsed.produced_at)),
      lastSeen: Date.now(),
      count: (existing?.count ?? 0) + 1,
      canMessageId: parsed.can_message_id,
    });
  }, [lastMessage, signalsRef, totalRef]);

  return null;
});

const SignalRowView = memo(
  function SignalRowView({
    s,
    now,
    onSelect,
  }: {
    s: SignalState;
    now: number;
    onSelect: (s: SignalState) => void;
  }) {
    const ageMs = Math.max(0, now - s.lastSeen);
    const ageColor =
      ageMs < 500
        ? "text-green-500"
        : ageMs < 5000
          ? "text-yellow-500"
          : "text-red-500";
    const clickable = s.canMessageId != null;
    return (
      <TableRow
        className={clickable ? "cursor-pointer" : ""}
        onClick={clickable ? () => onSelect(s) : undefined}
      >
        <TableCell className="font-mono text-xs">{s.name}</TableCell>
        <TableCell className="font-mono">{s.value}</TableCell>
        <TableCell className="font-mono text-muted-foreground">
          {s.rawValue}
        </TableCell>
        <TableCell className="font-mono text-muted-foreground">
          {rawToHex(s.rawValue)}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {s.producedAtFormatted}
        </TableCell>
        <TableCell className={`font-mono text-xs ${ageColor}`}>
          {ageMs < 1000 ? `${ageMs}ms` : `${(ageMs / 1000).toFixed(1)}s`}
        </TableCell>
        <TableCell>
          <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
            {s.count}
          </span>
        </TableCell>
      </TableRow>
    );
  },
  // Skip the row when neither the signal nor the wall clock changed enough
  // to nudge the age column. 100ms is below human perception.
  (prev, next) =>
    prev.s === next.s &&
    Math.abs(prev.now - next.now) < 100 &&
    prev.onSelect === next.onSelect,
);

interface DebugTableProps {
  rows: SignalState[];
  now: number;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onSelect: (s: SignalState) => void;
  emptyMessage: string;
}

const DebugTable = memo(function DebugTable({
  rows,
  now,
  sortKey,
  sortDir,
  onSort,
  onSelect,
  emptyMessage,
}: DebugTableProps) {
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  const headerCell = (label: string, key: SortKey) => (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(key)}
    >
      {label}
      <SortIcon k={key} />
    </TableHead>
  );

  return (
    <Card className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            {headerCell("Signal", "name")}
            {headerCell("Value", "value")}
            {headerCell("Raw", "rawValue")}
            {headerCell("Raw (hex)", "rawValue")}
            {headerCell("Produced At", "lastSeen")}
            {headerCell("Age", "lastSeen")}
            {headerCell("Count", "count")}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((s) => (
              <SignalRowView
                key={s.name}
                s={s}
                now={now}
                onSelect={onSelect}
              />
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
});

export default function DebugPage() {
  const vehicle = useVehicle();
  const vehicleList = useVehicleList();

  const vehicleType = useMemo(() => {
    const v = vehicleList.find((x) => x.id === vehicle.id);
    return v?.type ?? vehicle.type;
  }, [vehicle.id, vehicleList, vehicle.type]);

  const socketUrl = useMemo(() => {
    if (!vehicle.id || !vehicleType) return null;
    const params = new URLSearchParams({
      vehicle_id: vehicle.id,
      signals: "*",
      rate: "5",
    });
    return `${BACKEND_WS_URL}/${vehicleType}/live?${params.toString()}`;
  }, [vehicle.id, vehicleType]);

  const signalsRef = useRef<Map<string, SignalState>>(new Map());
  const totalRef = useRef(0);

  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [readyState, setReadyState] = useState<ReadyState>(
    ReadyState.UNINSTANTIATED,
  );
  const [selected, setSelected] = useState<{
    canMessageId: string;
    signalName: string;
  } | null>(null);

  const onSelect = useCallback((s: SignalState) => {
    if (!s.canMessageId) return;
    setSelected({ canMessageId: s.canMessageId, signalName: s.name });
  }, []);

  useEffect(() => {
    signalsRef.current = new Map();
    totalRef.current = 0;
    setTick((t) => t + 1);
  }, [socketUrl]);

  // Pause the flush when the tab is hidden. No point repainting an unseen
  // tab; messages still ingest into the ref.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id != null) return;
      id = setInterval(() => setTick((t) => t + 1), FLUSH_INTERVAL_MS);
    };
    const stop = () => {
      if (id == null) return;
      clearInterval(id);
      id = null;
    };
    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, []);

  const onReadyChange = useCallback((state: ReadyState) => {
    setReadyState(state);
  }, []);

  const onSort = useCallback(
    (key: SortKey) => {
      setSortKey((prevKey) => {
        if (prevKey === key) {
          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          return prevKey;
        }
        setSortDir(key === "name" ? "asc" : "desc");
        return key;
      });
    },
    [],
  );

  const rows = useMemo(() => {
    const list = Array.from(signalsRef.current.values());
    const q = deferredSearch.trim().toLowerCase();
    const filtered = q
      ? list.filter((s) => s.name.toLowerCase().includes(q))
      : list;
    const dir = sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return filtered;
    // tick gates re-renders; signalsRef mutates between ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, deferredSearch, sortKey, sortDir]);

  const distinctCount = signalsRef.current.size;
  const totalCount = totalRef.current;
  const renderNow = Date.now();

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Connected",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Disconnected",
    [ReadyState.UNINSTANTIATED]: "Idle",
  }[readyState];

  const statusColor = {
    [ReadyState.OPEN]: "bg-green-600",
    [ReadyState.CONNECTING]: "bg-yellow-600",
    [ReadyState.CLOSING]: "bg-yellow-600",
    [ReadyState.CLOSED]: "bg-red-600",
    [ReadyState.UNINSTANTIATED]: "bg-neutral-600",
  }[readyState];

  const emptyMessage =
    readyState === ReadyState.OPEN
      ? "Connected — waiting for signals..."
      : `Socket ${connectionStatus.toLowerCase()}`;

  return (
    <Layout activeTab="debug" headerTitle="Debug">
      <WsBridge
        socketUrl={socketUrl}
        signalsRef={signalsRef}
        totalRef={totalRef}
        onReadyChange={onReadyChange}
      />
      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor}`}
              />
              <span className="text-sm font-medium">{connectionStatus}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Vehicle:{" "}
              <span className="font-medium text-foreground">{vehicle.id}</span>{" "}
              <span className="text-xs">({vehicleType})</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Distinct signals:{" "}
              <span className="font-medium text-foreground">
                {distinctCount}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Messages received:{" "}
              <span className="font-medium text-foreground">{totalCount}</span>
            </div>
            <div className="ml-auto w-full max-w-xs">
              <Input
                placeholder="Filter by signal name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <DebugTable
          rows={rows}
          now={renderNow}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          onSelect={onSelect}
          emptyMessage={emptyMessage}
        />
      </div>
      <MessageTraceDialog
        canMessageId={selected?.canMessageId ?? null}
        highlightSignal={selected?.signalName}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </Layout>
  );
}

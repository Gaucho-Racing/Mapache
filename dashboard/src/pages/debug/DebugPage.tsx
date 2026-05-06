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
import { BACKEND_WS_URL } from "@/consts/config";
import { useVehicle, useVehicleList } from "@/lib/store";
import { useNow, TimeProvider } from "@/context/time-context";
import { Signal } from "@/models/signal";
import { formatTimeWithMillis } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface SignalState {
  name: string;
  value: number;
  rawValue: number;
  producedAt: string;
  lastSeen: number;
  count: number;
}

type SortKey = "name" | "value" | "rawValue" | "lastSeen" | "count";
type SortDir = "asc" | "desc";

function DebugContent() {
  const vehicle = useVehicle();
  const vehicleList = useVehicleList();
  const now = useNow();

  const vehicleType = useMemo(() => {
    const v = vehicleList.find((x) => x.id === vehicle.id);
    return v?.type ?? vehicle.type;
  }, [vehicle.id, vehicleList, vehicle.type]);

  const socketUrl = useMemo(() => {
    if (!vehicle.id || !vehicleType) return null;
    const params = new URLSearchParams({
      vehicle_id: vehicle.id,
      signals: "*",
    });
    return `${BACKEND_WS_URL}/${vehicleType}/live?${params.toString()}`;
  }, [vehicle.id, vehicleType]);

  const { lastMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
  });

  const [signals, setSignals] = useState<Map<string, SignalState>>(new Map());
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const totalCountRef = useRef(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setSignals(new Map());
    totalCountRef.current = 0;
    setTotalCount(0);
  }, [socketUrl]);

  useEffect(() => {
    if (!lastMessage) return;
    let parsed: Signal;
    try {
      parsed = JSON.parse(lastMessage.data) as Signal;
    } catch {
      return;
    }
    if (!parsed.name) return;
    totalCountRef.current += 1;
    setTotalCount(totalCountRef.current);
    setSignals((prev) => {
      const next = new Map(prev);
      const existing = next.get(parsed.name);
      next.set(parsed.name, {
        name: parsed.name,
        value: parsed.value,
        rawValue: parsed.raw_value,
        producedAt: parsed.produced_at,
        lastSeen: Date.now(),
        count: (existing?.count ?? 0) + 1,
      });
      return next;
    });
  }, [lastMessage]);

  const rows = useMemo(() => {
    const list = Array.from(signals.values());
    const filtered = search
      ? list.filter((s) =>
          s.name.toLowerCase().includes(search.toLowerCase()),
        )
      : list;
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [signals, search, sortKey, sortDir]);

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

  const onHeaderClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  const headerCell = (
    label: string,
    key: SortKey,
    className?: string,
  ) => (
    <TableHead
      className={`cursor-pointer select-none whitespace-nowrap ${className ?? ""}`}
      onClick={() => onHeaderClick(key)}
    >
      {label}
      <SortIcon k={key} />
    </TableHead>
  );

  return (
    <Layout activeTab="debug" headerTitle="Debug">
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
                {signals.size}
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

        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {headerCell("Signal", "name")}
                {headerCell("Value", "value")}
                {headerCell("Raw", "rawValue")}
                {headerCell("Produced At", "lastSeen")}
                {headerCell("Age", "lastSeen")}
                {headerCell("Count", "count")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {readyState === ReadyState.OPEN
                      ? "Connected — waiting for signals..."
                      : `Socket ${connectionStatus.toLowerCase()}`}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((s) => {
                  const ageMs = Math.max(0, now - s.lastSeen);
                  const stale = ageMs > 2000;
                  return (
                    <TableRow key={s.name}>
                      <TableCell className="font-mono text-xs">
                        {s.name}
                      </TableCell>
                      <TableCell className="font-mono">{s.value}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {s.rawValue}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatTimeWithMillis(new Date(s.producedAt))}
                      </TableCell>
                      <TableCell
                        className={`font-mono text-xs ${stale ? "text-yellow-500" : "text-muted-foreground"}`}
                      >
                        {ageMs < 1000
                          ? `${ageMs}ms`
                          : `${(ageMs / 1000).toFixed(1)}s`}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                          {s.count}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}

export default function DebugPage() {
  return (
    <TimeProvider interval={250}>
      <DebugContent />
    </TimeProvider>
  );
}

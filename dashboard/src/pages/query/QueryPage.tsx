import Layout from "@/components/Layout";
import { BACKEND_URL } from "@/consts/config";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { notify } from "@/lib/notify";
import { useVehicle } from "@/lib/store";
import { SignalDefinition } from "@/models/signal";
import { initTrip, Trip } from "@/models/trip";
import axios from "axios";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronDown,
  ChevronsUpDown,
  LineChart,
  Table,
  Code,
  X,
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SignalCard } from "@/components/query/SignalCard";
import Fuse from "fuse.js";
import { TripCard } from "@/components/query/TripCard";
import { JsonView, allExpanded } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Custom dark theme for JSON viewer
const customDarkStyle = {
  container: "font-mono text-sm",
  // basicChildStyle: "text-slate-300",
  label: "text-white",
  nullValue: "text-purple-400",
  undefinedValue: "text-purple-400",
  stringValue: "text-green-400",
  booleanValue: "text-orange-400",
  numberValue: "text-blue-400",
  otherValue: "text-slate-300",
  punctuation: "text-slate-500",
  expandIcon: "text-slate-400",
  collapseIcon: "text-slate-400",
  collapsedContent: "text-slate-500",
};

// Colors for chart lines
const CHART_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEEAD", // Yellow
  "#D4A5A5", // Pink
  "#9B59B6", // Purple
  "#3498DB", // Light Blue
] as const;

// Process data for chart
const processChartData = (data: Record<string, any>[]) => {
  if (!data || data.length === 0) return { columns: [], chartData: [] };

  const columns = Object.keys(data[0]).filter((key) => key !== "produced_at");

  const chartData = data.map((row) => ({
    time: new Date(row.produced_at).toLocaleString(),
    timestamp: new Date(row.produced_at).getTime(),
    ...columns.reduce((acc: Record<string, any>, col) => {
      acc[col] = row[col];
      return acc;
    }, {}),
  }));

  return { columns, chartData };
};

// Chart configuration
const chartConfig = {
  time: {
    label: "Time",
  },
  ...Object.fromEntries(
    CHART_COLORS.map((color, index) => [
      `signal_${index}`,
      {
        color,
        label: "Signal",
      },
    ]),
  ),
};

function QueryPage() {
  const vehicle = useVehicle();
  const [availableSignals, setAvailableSignals] = useState<SignalDefinition[]>(
    [],
  );
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [data, setData] = useState<any>([]);
  const [metadata, setMetadata] = useState<any>({});

  // Query parameters state
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip>(initTrip);
  const [mergeStrategy, setMergeStrategy] = useState<"smallest" | "largest">(
    "smallest",
  );
  const [fillStrategy, setFillStrategy] = useState<
    "none" | "forward" | "backward" | "linear" | "time"
  >("none");
  const [tolerance, setTolerance] = useState<number>(50);
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "parquet">(
    "json",
  );
  const [openSignalPopover, setOpenSignalPopover] = useState(false);
  const [signalSearchQuery, setSignalSearchQuery] = useState<string>("");
  const [filteredSignals, setFilteredSignals] = useState<SignalDefinition[]>(
    [],
  );

  const [openTripPopover, setOpenTripPopover] = useState(false);
  const [tripSearchQuery, setTripSearchQuery] = useState<string>("");
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);

  const [queryStatus, setQueryStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [selectedView, setSelectedView] = useState<"graph" | "table" | "json">(
    "graph",
  );

  const fuseSignals = useMemo(() => {
    return new Fuse(availableSignals, {
      keys: ["name", "id"],
      threshold: 0.3,
      includeScore: true,
      shouldSort: true,
    });
  }, [availableSignals]);

  const fuseTrips = useMemo(() => {
    return new Fuse(availableTrips, {
      keys: ["name", "id"],
      threshold: 0.3,
      includeScore: true,
      shouldSort: true,
    });
  }, [availableTrips]);

  useEffect(() => {
    getAvailableSignals();
    getAvailableTrips();
  }, [vehicle]);

  useEffect(() => {
    if (signalSearchQuery.trim() === "") {
      setFilteredSignals(availableSignals);
      return;
    }

    const results = fuseSignals.search(signalSearchQuery);
    setFilteredSignals(results.map((result) => result.item));
  }, [signalSearchQuery, fuseSignals, availableSignals]);

  useEffect(() => {
    if (tripSearchQuery.trim() === "") {
      setFilteredTrips(availableTrips);
      return;
    }

    const results = fuseTrips.search(tripSearchQuery);
    setFilteredTrips(results.map((result) => result.item));
  }, [tripSearchQuery, fuseTrips, availableTrips]);

  const getAvailableSignals = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/query/definitions?vehicle_type=${vehicle.type}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      if (response.status === 200) {
        setAvailableSignals(
          response.data.data.sort((a: SignalDefinition, b: SignalDefinition) =>
            a.id.localeCompare(b.id),
          ),
        );
      } else {
        notify.error(response.data.message);
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const getAvailableTrips = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/trips?vehicle_type=${vehicle.type}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      if (response.status === 200) {
        const trips = response.data.data.filter(
          (trip: Trip) => trip.vehicle_id === vehicle.id,
        );
        trips.sort(
          (a: Trip, b: Trip) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        );
        setAvailableTrips(trips);
      } else {
        notify.error(response.data.message);
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const queryData = async () => {
    const params = new URLSearchParams();

    if (selectedSignals.length > 0) {
      params.append("signals", selectedSignals.join(","));
    }
    if (selectedTrip) {
      params.append("trip_id", selectedTrip.id.toString());
    }
    params.append("vehicle_id", vehicle.id);
    params.append("merge", mergeStrategy);
    params.append("fill", fillStrategy);
    params.append("tolerance", tolerance.toString());
    params.append("export", exportFormat);

    try {
      setQueryStatus("loading");
      console.log(`${BACKEND_URL}/query/signals?${params.toString()}`);
      const response = await axios.get(
        `${BACKEND_URL}/query/signals?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      if (response.status === 200) {
        setQueryStatus("success");
        setData(response.data.data.data);
        setMetadata(response.data.data.metadata);
        notify.success(
          `Queried ${response.data.data.metadata.num_rows} rows in ${formatTime(
            response.data.data.metadata.query_latency,
          )}`,
        );
      } else {
        setQueryStatus("error");
        notify.error(response.data.data.message);
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
      setQueryStatus("error");
    }
  };

  // Memoize the processed chart data
  const { columns, chartData } = useMemo(() => processChartData(data), [data]);

  const RenderGraph = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex h-[calc(100vh-20rem)] min-h-[400px] items-center justify-center rounded-lg p-4">
          <p className="text-muted-foreground">No data available</p>
        </div>
      );
    }

    // Create a mapping of column names to their colors
    const columnColors = Object.fromEntries(
      columns.map((column, index) => [
        column,
        {
          color: CHART_COLORS[index % CHART_COLORS.length],
          label: column,
        },
      ]),
    );

    return (
      <div className="h-[calc(100vh-20rem)] min-h-[400px] rounded-lg p-4">
        <ChartContainer config={{ time: { label: "Time" }, ...columnColors }}>
          <RechartsLineChart
            data={chartData}
            margin={{
              top: 0,
              right: 0,
              left: -20,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleTimeString();
              }}
            />
            <YAxis />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {columns.map((column) => (
              <Line
                key={column}
                type="monotone"
                dataKey={column}
                name={column}
                dot={false}
                strokeWidth={2}
                stroke={columnColors[column].color}
                // isAnimationActive={false}
                animateNewValues={false}
              />
            ))}
          </RechartsLineChart>
        </ChartContainer>
      </div>
    );
  };

  const RenderTable = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex h-[calc(100vh-20rem)] min-h-[400px] items-center justify-center rounded-lg p-4">
          <p className="text-muted-foreground">No data available</p>
        </div>
      );
    }

    // Get all unique keys from the data (excluding produced_at)
    const columns = Object.keys(data[0]).filter((key) => key !== "produced_at");

    return (
      <div className="h-[calc(100vh-20rem)] min-h-[400px] overflow-auto rounded-lg bg-slate-900 p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] text-white">Time</TableHead>
              {columns.map((column) => (
                <TableHead key={column} className="text-white">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: Record<string, any>, index: number) => (
              <TableRow key={index} className="border-slate-700">
                <TableCell className="font-mono text-white">
                  {new Date(row.produced_at).toLocaleString()}
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column} className="font-mono text-white">
                    {row[column]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const RenderJson = () => {
    return (
      <div className="h-[calc(100vh-20rem)] min-h-[400px] overflow-auto rounded-lg bg-slate-900 p-4">
        <JsonView
          data={data}
          shouldExpandNode={allExpanded}
          style={customDarkStyle}
        />
      </div>
    );
  };

  return (
    <Layout activeTab="query" headerTitle="Query">
      <div className="container mx-auto space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Query Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Signal Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Signals</label>
                <Popover
                  open={openSignalPopover}
                  onOpenChange={setOpenSignalPopover}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openSignalPopover}
                      className="w-full justify-between"
                    >
                      {selectedSignals.length > 0
                        ? `${selectedSignals.length} signals selected`
                        : "Select signals"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="min-w-[300px] p-0">
                    <div className="flex flex-col gap-1">
                      <div className="sticky top-0 bg-background p-2">
                        <Input
                          className="bg-transparent"
                          placeholder="Search signals..."
                          value={signalSearchQuery}
                          onChange={(e) => setSignalSearchQuery(e.target.value)}
                        />
                      </div>
                      {filteredSignals.length === 0 ? (
                        <div className="p-2 pb-4 text-center text-sm text-muted-foreground">
                          No signals found
                        </div>
                      ) : (
                        <div className="max-h-[400px] overflow-y-auto p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {filteredSignals.map((signal) => (
                            <div
                              key={signal.id}
                              onClick={() => {
                                setSelectedSignals((prev) =>
                                  prev.includes(signal.id)
                                    ? prev.filter((id) => id !== signal.id)
                                    : [...prev, signal.id],
                                );
                              }}
                            >
                              <SignalCard
                                key={signal.id}
                                signal={signal}
                                selected={selectedSignals.includes(signal.id)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSignals.map((signalId) => {
                    const signal = availableSignals.find(
                      (s) => s.id === signalId,
                    );
                    return (
                      <Badge
                        key={signalId}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() =>
                          setSelectedSignals((prev) =>
                            prev.filter((id) => id !== signalId),
                          )
                        }
                      >
                        {signal?.name === "" ? signal?.id : signal?.name}
                        <X className="ml-2 h-4 w-4 text-muted-foreground" />
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Trip Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Trip</label>
                <Popover
                  open={openTripPopover}
                  onOpenChange={setOpenTripPopover}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openTripPopover}
                      className="w-full justify-between"
                    >
                      {selectedTrip.id == ""
                        ? "Select a trip"
                        : `${selectedTrip.name}`}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="min-w-[400px] p-0">
                    <div className="flex flex-col gap-1">
                      <div className="sticky top-0 bg-background p-2">
                        <Input
                          className="bg-transparent"
                          placeholder="Search trips..."
                          value={tripSearchQuery}
                          onChange={(e) => setTripSearchQuery(e.target.value)}
                        />
                      </div>
                      {filteredTrips.length === 0 ? (
                        <div className="p-2 pb-4 text-center text-sm text-muted-foreground">
                          No trips found
                        </div>
                      ) : (
                        <div className="max-h-[400px] overflow-y-auto p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {filteredTrips.map((trip) => (
                            <div
                              key={trip.id.toString()}
                              onClick={() => {
                                setSelectedTrip(trip);
                                setOpenTripPopover(false);
                              }}
                            >
                              <TripCard
                                trip={trip}
                                selected={selectedTrip?.id === trip.id}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Merge Strategy */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Merge Strategy</label>
                <Select
                  value={mergeStrategy}
                  onValueChange={(value: "smallest" | "largest") =>
                    setMergeStrategy(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smallest">Smallest</SelectItem>
                    <SelectItem value="largest">Largest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fill Strategy */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Fill Strategy</label>
                <Select
                  value={fillStrategy}
                  onValueChange={(
                    value: "none" | "forward" | "backward" | "linear" | "time",
                  ) => setFillStrategy(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="forward">Forward</SelectItem>
                    <SelectItem value="backward">Backward</SelectItem>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tolerance */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tolerance (ms)</label>
                <Input
                  type="number"
                  value={tolerance}
                  onChange={(e) => setTolerance(parseInt(e.target.value))}
                />
              </div>

              {/* Export Format */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Export Format</label>
                <Select
                  value={exportFormat}
                  onValueChange={(value: "csv" | "json" | "parquet") =>
                    setExportFormat(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="parquet">Parquet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={queryData}
                className="w-full"
                disabled={queryStatus === "loading"}
              >
                {queryStatus === "loading" ? "Querying..." : "Query Data"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="relative">
          <CardHeader>
            <CardTitle>Query Results</CardTitle>
            <div className="absolute right-4 top-2 mb-4 flex w-full justify-end gap-2">
              <Card className="flex gap-1 p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    selectedView === "graph" &&
                      "bg-gradient-to-br from-gr-pink to-gr-purple text-white",
                  )}
                  onClick={() => setSelectedView("graph")}
                >
                  <LineChart className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    selectedView === "table" &&
                      "bg-gradient-to-br from-gr-pink to-gr-purple text-white",
                  )}
                  onClick={() => setSelectedView("table")}
                >
                  <Table className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    selectedView === "json" &&
                      "bg-gradient-to-br from-gr-pink to-gr-purple text-white",
                  )}
                  onClick={() => setSelectedView("json")}
                >
                  <Code className="h-4 w-4" />
                </Button>
              </Card>
            </div>
          </CardHeader>
          <CardContent>
            {selectedView === "graph" && <RenderGraph />}
            {selectedView === "table" && <RenderTable />}
            {selectedView === "json" && <RenderJson />}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default QueryPage;

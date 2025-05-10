import Layout from "@/components/Layout";
import { BACKEND_URL } from "@/consts/config";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { notify } from "@/lib/notify";
import { useVehicle } from "@/lib/store";
import { Signal } from "@/models/signal";
import { SignalDefinition } from "@/models/signal";
import { Trip } from "@/models/trip";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SignalCard } from "@/components/query/SignalCard";
import Fuse from "fuse.js";

function QueryPage() {
  const vehicle = useVehicle();
  const [availableSignals, setAvailableSignals] = useState<SignalDefinition[]>(
    [],
  );
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [data, setData] = useState<Signal[]>([]);
  const [metadata, setMetadata] = useState<any>({});

  // Query parameters state
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<string | undefined>(
    undefined,
  );
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

  const fuse = useMemo(() => {
    return new Fuse(availableSignals, {
      keys: ["name", "id"],
      threshold: 0.3,
      includeScore: true,
      shouldSort: true,
    });
  }, [availableSignals]);

  useEffect(() => {
    getAvailableSignals();
    getAvailableTrips();
  }, [vehicle]);

  useEffect(() => {
    if (signalSearchQuery.trim() === "") {
      setFilteredSignals(availableSignals);
      return;
    }

    const results = fuse.search(signalSearchQuery);
    setFilteredSignals(results.map((result) => result.item));
  }, [signalSearchQuery, fuse, availableSignals]);

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
        setAvailableTrips(
          response.data.data.filter(
            (trip: Trip) => trip.vehicle_id === vehicle.id,
          ),
        );
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
      params.append("trip_id", selectedTrip);
    }
    params.append("vehicle_id", vehicle.id);
    params.append("merge", mergeStrategy);
    params.append("fill", fillStrategy);
    params.append("tolerance", tolerance.toString());
    params.append("export", exportFormat);

    // try {
    console.log(`${BACKEND_URL}/query/signals?${params.toString()}`);
    //   const response = await axios.get(
    //     `${BACKEND_URL}/query/signals?${params.toString()}`,
    //     {
    //       headers: {
    //         Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
    //       },
    //     },
    //   );
    //   if (response.status === 200) {
    //     setData(response.data.data);
    //     setMetadata(response.data.metadata);
    //   } else {
    //     notify.error(response.data.message);
    //   }
    // } catch (error) {
    //   notify.error(getAxiosErrorMessage(error));
    // }
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
                        : "Select signals..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <div className="flex flex-col gap-1">
                      <div className="sticky top-0 bg-background p-2">
                        <Input
                          className="bg-transparent"
                          placeholder="Search signals..."
                          value={signalSearchQuery}
                          onChange={(e) => setSignalSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="max-h-[400px] overflow-y-auto p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {filteredSignals.map((signal) => (
                          <div
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
                        <span className="ml-1">×</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Trip Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Trip</label>
                <Select
                  value={selectedTrip}
                  onValueChange={(value: string) => setSelectedTrip(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trip" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTrips.map((trip) => (
                      <SelectItem key={String(trip.id)} value={String(trip.id)}>
                        {trip.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Button onClick={queryData} className="w-full">
                Query Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Query Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg p-4 font-mono">
              {JSON.stringify(data)}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default QueryPage;

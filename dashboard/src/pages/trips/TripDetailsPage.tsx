import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BACKEND_URL } from "@/consts/config";
import { notify } from "@/lib/notify";
import { setVehicle, useVehicle } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";
import { useEffect, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, ChevronRight } from "lucide-react";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { useParams, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { formatTime } from "@/lib/utils";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  MenubarCheckboxItem,
} from "@/components/ui/menubar";
import { MenubarMenu } from "@/components/ui/menubar";
import { TripDetailsDialog } from "@/components/trips/TripDetailsDialog";
import { initTrip, Trip } from "@/models/trip";
import { LoadingComponent } from "@/components/Loading";
import { WidgetEntry } from "@/components/widgets/registry";
import { WidgetSelectionDialog } from "@/components/trips/WidgetSelectionDialog";

function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const vehicle = useVehicle();
  const [trip, setTrip] = useState<Trip>(initTrip);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [tripDetailsOpen, setTripDetailsOpen] = useState(false);
  const [selectedWidgets, setSelectedWidgets] = useState<WidgetEntry[]>([]);
  const [widgetSettingsOpen, setWidgetSettingsOpen] = useState(false);
  const [showTopBar, setShowTopBar] = useState(true);
  const [showBottomBar, setShowBottomBar] = useState(true);

  useEffect(() => {
    if (id) {
      getTrip(id);
    } else {
      navigate("/trips");
    }
  }, [id]);

  // Reset playback state when trip changes
  useEffect(() => {
    if (trip) {
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [trip]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && trip) {
      const startTime = new Date(trip.start_time).getTime();
      const endTime = new Date(trip.end_time).getTime();

      if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
        notify.error("Invalid trip timestamps");
        setIsPlaying(false);
        return;
      }

      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const newTime = prev + 50 * playbackSpeed;
          const tripDuration = endTime - startTime;
          if (newTime >= tripDuration) {
            setIsPlaying(false);
            return tripDuration;
          }
          return newTime;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, trip, playbackSpeed]);

  // keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Space bar for play/pause
      if (e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
      }
      // K key for play/pause
      else if (e.code === "KeyK") {
        e.preventDefault();
        handlePlayPause();
      }
      // Left arrow for skip back small (500ms)
      else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleSkipBackSmall();
      }
      // Right arrow for skip forward small (500ms)
      else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleSkipForwardSmall();
      }
      // J key for skip back medium (1000ms)
      else if (e.code === "KeyJ") {
        e.preventDefault();
        handleSkipBackMedium();
      }
      // L key for skip forward medium (1000ms)
      else if (e.code === "KeyL") {
        e.preventDefault();
        handleSkipForwardMedium();
      }
      // Comma for skip back tiny (50ms)
      else if (e.code === "Comma" && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSkipBackTiny();
      }
      // Period for skip forward tiny (50ms)
      else if (e.code === "Period") {
        e.preventDefault();
        handleSkipForwardTiny();
      }
      // Number keys for playback speed
      else if (e.code === "Digit1") {
        e.preventDefault();
        setPlaybackSpeed(0.5);
      } else if (e.code === "Digit2") {
        e.preventDefault();
        setPlaybackSpeed(1);
      } else if (e.code === "Digit3") {
        e.preventDefault();
        setPlaybackSpeed(2);
      } else if (e.code === "Digit4") {
        e.preventDefault();
        setPlaybackSpeed(4);
      }
      // Comma for trip details
      else if (e.code === "Comma" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setTripDetailsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, trip, playbackSpeed]);

  const getTrip = async (id: string) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/trips/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      if (response.status == 200) {
        setTrip(response.data.data);
        getVehicle(response.data.data.vehicle_id);
        notify.success("Loaded trip details successfully");
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
      navigate("/trips");
    }
  };

  const getVehicle = async (id: string) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/vehicles/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      if (response.status == 200) {
        setVehicle(response.data.data);
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
      navigate("/trips");
    }
  };

  const handlePlayPause = () => {
    if (!trip) return;

    const startTime = new Date(trip.start_time).getTime();
    const endTime = new Date(trip.end_time).getTime();

    if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
      notify.error("Invalid trip timestamps");
      return;
    }

    setIsPlaying(!isPlaying);
  };

  const handleSkipBackSmall = () => {
    if (!trip) return;
    setCurrentTime((prev) => Math.max(0, prev - 500));
  };

  const handleSkipForwardSmall = () => {
    if (!trip) return;
    const startTime = new Date(trip.start_time).getTime();
    const endTime = new Date(trip.end_time).getTime();
    const tripDuration = endTime - startTime;
    setCurrentTime((prev) => Math.min(tripDuration, prev + 500));
  };

  const handleSkipBackMedium = () => {
    if (!trip) return;
    setCurrentTime((prev) => Math.max(0, prev - 1000));
  };

  const handleSkipForwardMedium = () => {
    if (!trip) return;
    const startTime = new Date(trip.start_time).getTime();
    const endTime = new Date(trip.end_time).getTime();
    const tripDuration = endTime - startTime;
    setCurrentTime((prev) => Math.min(tripDuration, prev + 1000));
  };

  const handleSkipBackTiny = () => {
    if (!trip) return;
    setCurrentTime((prev) => Math.max(0, prev - 50));
  };

  const handleSkipForwardTiny = () => {
    if (!trip) return;
    const startTime = new Date(trip.start_time).getTime();
    const endTime = new Date(trip.end_time).getTime();
    const tripDuration = endTime - startTime;
    setCurrentTime((prev) => Math.min(tripDuration, prev + 50));
  };

  const handleTimelineChange = (value: number) => {
    if (!trip) return;
    const startTime = new Date(trip.start_time).getTime();
    const endTime = new Date(trip.end_time).getTime();

    if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
      notify.error("Invalid trip timestamps");
      return;
    }

    setCurrentTime(value);
  };

  const getProgressPercentage = () => {
    if (!trip) return 0;
    const startTime = new Date(trip.start_time).getTime();
    const endTime = new Date(trip.end_time).getTime();

    if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
      return 0;
    }

    const tripDuration = endTime - startTime;
    return (currentTime / tripDuration) * 100;
  };

  const formatTripDuration = () => {
    if (!trip) return "00:00";
    const startTime = new Date(trip.start_time).getTime();
    const endTime = new Date(trip.end_time).getTime();

    if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
      return "00:00";
    }

    return formatTime(endTime - startTime);
  };

  const formatCurrentTime = () => {
    if (!trip) return "--:--:--";
    const startTime = new Date(trip.start_time).getTime();
    const currentDate = new Date(startTime + currentTime);
    return currentDate.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const TopToolbar = () => {
    return (
      <Card>
        <div className="flex flex-row items-center justify-between p-4">
          <div className="flex flex-row items-center gap-4">
            <img
              src={`/icons/cars/${vehicle?.type}-pixel.png`}
              alt="Vehicle"
              className="h-14 w-14 object-contain"
            />
            <div className="flex flex-col">
              <h2 className="text-lg font-bold">{trip?.name}</h2>
              <p className="text-sm text-muted-foreground">
                {new Date(trip!.start_time).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex flex-row items-center gap-4">
            <Menubar>
              <MenubarMenu>
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={() => setTripDetailsOpen(true)}>
                    Show Trip Details{" "}
                    <MenubarShortcut>
                      {/Mac|iPhone|iPod|iPad/.test(navigator.userAgent)
                        ? "⌘+,"
                        : "Ctrl+,"}
                    </MenubarShortcut>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger>Edit</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={() => setWidgetSettingsOpen(true)}>
                    Add Widget
                  </MenubarItem>
                  <MenubarItem onClick={() => setWidgetSettingsOpen(true)}>
                    Remove Widget
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger>View</MenubarTrigger>
                <MenubarContent>
                  <MenubarCheckboxItem
                    checked={showTopBar}
                    onCheckedChange={setShowTopBar}
                  >
                    Show Menu Bar
                  </MenubarCheckboxItem>
                  <MenubarCheckboxItem
                    checked={showBottomBar}
                    onCheckedChange={setShowBottomBar}
                  >
                    Show Playback Bar
                  </MenubarCheckboxItem>
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger>Playback</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>
                    Play/Pause <MenubarShortcut>Space/K</MenubarShortcut>
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem>
                    Skip Back (1s) <MenubarShortcut>J</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem>
                    Skip Forward (1s) <MenubarShortcut>L</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem>
                    Skip Back (500ms) <MenubarShortcut>←</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem>
                    Skip Forward (500ms) <MenubarShortcut>→</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem>
                    Skip Back (50ms) <MenubarShortcut>,</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem>
                    Skip Forward (50ms) <MenubarShortcut>.</MenubarShortcut>
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem>
                    Speed 0.5x <MenubarShortcut>1</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem>
                    Speed 1x <MenubarShortcut>2</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem>
                    Speed 2x <MenubarShortcut>3</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem>
                    Speed 4x <MenubarShortcut>4</MenubarShortcut>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
            <Separator orientation="vertical" className="h-8" />
            <div className="font-mono text-2xl">{formatCurrentTime()}</div>
          </div>
        </div>
      </Card>
    );
  };

  const BottomToolbar = () => {
    return (
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkipBackMedium}
                disabled={!trip}
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                disabled={!trip}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkipForwardMedium}
                disabled={!trip}
              >
                <SkipForward className="h-5 w-5" />
              </Button>
              <Select
                value={playbackSpeed.toString()}
                onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="4">4x</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatTime(currentTime)} / {formatTripDuration()}
            </div>
          </div>
          <Progress
            value={getProgressPercentage()}
            className="h-2 cursor-pointer"
            onClick={(e) => {
              if (trip) {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                const startTime = new Date(trip.start_time).getTime();
                const endTime = new Date(trip.end_time).getTime();
                const tripDuration = endTime - startTime;
                handleTimelineChange(percentage * tripDuration);
              }
            }}
          />
        </div>
      </Card>
    );
  };

  const TopBarCollapsed = () => {
    return (
      <Card
        className="group flex w-[50px] cursor-pointer items-center justify-center p-2 transition-all duration-150 hover:w-[200px] hover:bg-card"
        onClick={() => setShowTopBar(true)}
      >
        <span className="mx-2 hidden overflow-hidden whitespace-nowrap group-hover:block">
          Show Menu Bar
        </span>
        <ChevronRight className="my-2 h-5 w-5" />
      </Card>
    );
  };

  const BottomBarCollapsed = () => {
    return (
      <Card
        className="group flex w-[50px] cursor-pointer items-center justify-center p-2 transition-all duration-150 hover:w-[200px] hover:bg-card"
        onClick={() => setShowBottomBar(true)}
      >
        <span className="mx-2 hidden overflow-hidden whitespace-nowrap group-hover:block">
          Show Playback Bar
        </span>
        <ChevronRight className="my-2 h-5 w-5" />
      </Card>
    );
  };

  return (
    <>
      <Layout activeTab="trips" headerTitle="Trip Details">
        {trip.id !== "" ? (
          <div className="flex h-full flex-col">
            {showTopBar ? (
              <div className="sticky top-[86px] z-10">
                <TopToolbar />
              </div>
            ) : (
              <div className="sticky top-[86px] z-10">
                <TopBarCollapsed />
              </div>
            )}

            <TripDetailsDialog
              trip={trip}
              tripDetailsOpen={tripDetailsOpen}
              setTripDetailsOpen={setTripDetailsOpen}
            />
            <WidgetSelectionDialog
              open={widgetSettingsOpen}
              onOpenChange={setWidgetSettingsOpen}
              selectedWidgets={selectedWidgets}
              setSelectedWidgets={setSelectedWidgets}
            />
            <div className="min-h-[100vh] py-4">
              <div className="flex flex-row flex-wrap gap-4">
                {selectedWidgets.map((widget) => {
                  const props = {
                    vehicle_id: vehicle?.id || "",
                    start_time: trip?.start_time || "",
                    end_time: trip?.end_time || "",
                    current_millis: currentTime,
                  };

                  return <widget.component {...props} />;
                })}
              </div>
            </div>

            {showBottomBar ? (
              <div className="sticky bottom-[20px] z-10">
                <BottomToolbar />
              </div>
            ) : (
              <div className="sticky bottom-[20px] z-10">
                <BottomBarCollapsed />
              </div>
            )}
          </div>
        ) : (
          <LoadingComponent />
        )}
      </Layout>
    </>
  );
}
export default TripDetailsPage;

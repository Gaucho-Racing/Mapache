import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trip, initTrip } from "@/models/trip";
import { formatTime } from "@/lib/utils";
import { Clock, MapPin, Hash, Edit2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { notify } from "@/lib/notify";
import { BACKEND_URL } from "@/consts/config";
import axios from "axios";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, ChangeEvent } from "react";
import { OutlineButton } from "@/components/ui/outline-button";
import { useVehicle } from "@/lib/store";

interface TripDetailsDialogProps {
  trip: Trip;
  tripDetailsOpen: boolean;
  setTripDetailsOpen: (open: boolean) => void;
}

export function TripDetailsDialog({
  trip,
  tripDetailsOpen,
  setTripDetailsOpen,
}: TripDetailsDialogProps) {
  const vehicle = useVehicle();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTrip, setEditedTrip] = useState<Trip>(initTrip);

  // Calculate duration in milliseconds
  const duration = () => {
    const start = new Date(trip.start_time).getTime();
    const end = new Date(trip.end_time).getTime();
    return end - start;
  };

  const updateTrip = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/trips/${trip.id}`,
        editedTrip,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      if (response.status == 200) {
        notify.success("Updated trip successfully");
        setIsEditing(false);
        window.location.reload();
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const handleEdit = () => {
    setEditedTrip(trip);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editedTrip.name.toString().trim()) {
      notify.error("Trip name cannot be empty");
      return;
    }
    updateTrip();
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditedTrip({ ...editedTrip, name: e.target.value });
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setEditedTrip({ ...editedTrip, description: e.target.value });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && isEditing) {
      setIsEditing(false);
      setEditedTrip(initTrip);
    }
    setTripDetailsOpen(open);
  };

  return (
    <Dialog open={tripDetailsOpen} onOpenChange={handleOpenChange}>
      <DialogTitle className="sr-only">Trip Details Dialog</DialogTitle>
      <DialogContent className="max-w-[800px]">
        <Card className="border-none">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            {isEditing ? (
              <Input
                value={editedTrip.name.toString()}
                onChange={handleNameChange}
                className="text-xl font-bold"
                placeholder="Enter trip name"
              />
            ) : (
              <CardTitle className="text-xl font-bold">{trip.name}</CardTitle>
            )}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <OutlineButton onClick={handleSave}>Save</OutlineButton>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="pb-4">
              <h3 className="mb-3 text-sm font-semibold">Trip Vehicle</h3>
              <Card className="h-full w-full p-2">
                <div className="relative">
                  <div className="absolute right-1 top-1">
                    <Card className="rounded-md bg-gradient-to-br from-gr-pink to-gr-purple px-2 py-1 text-xs font-medium text-white">
                      {vehicle?.type}
                    </Card>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-2">
                      <img
                        src={`/icons/cars/${vehicle?.type}-pixel.png`}
                        className="h-14 w-14 object-contain"
                      />
                    </div>
                    <div className="w-full">
                      <h4>{vehicle?.name}</h4>
                      <p className="text-gray-400">{vehicle?.id}</p>
                      <Separator className="my-2" />
                      <p className="text-sm text-white/80">
                        {vehicle?.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <div className="grid gap-4">
              <div>
                <h3 className="mb-3 text-sm font-semibold">Trip Information</h3>
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Trip ID:
                    </span>
                    <span className="font-mono text-sm">{trip.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Duration:
                    </span>
                    <span className="text-sm font-medium">
                      {formatTime(duration())} ({duration()} ms)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Start Time:
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(trip.start_time).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      End Time:
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(trip.end_time).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Description:
                    </p>
                    {isEditing ? (
                      <Textarea
                        value={editedTrip.description.toString()}
                        onChange={handleDescriptionChange}
                        className="mt-1"
                        placeholder="Enter trip description"
                      />
                    ) : (
                      <p className="mt-1 text-sm">
                        {trip.description || "No description"}
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Laps:</p>
                    <p className="mt-1 text-sm">
                      {trip.laps.length} laps recorded
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

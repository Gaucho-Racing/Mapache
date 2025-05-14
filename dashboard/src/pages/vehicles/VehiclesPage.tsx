import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BACKEND_URL } from "@/consts/config";
import { notify } from "@/lib/notify";
import { setVehicleList, useVehicleList } from "@/lib/store";
import { Vehicle } from "@/models/vehicle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { useEffect, useState } from "react";
import { OutlineButton } from "@/components/ui/outline-button";
import { Trash2 } from "lucide-react";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";

function VehiclesPage() {
  const vehicleList = useVehicleList();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    getVehicles();
  }, []);

  const getVehicles = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/vehicles`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      if (response.status == 200) {
        setVehicleList(
          response.data.data.sort(
            (a: Vehicle, b: Vehicle) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          ),
        );
        return 0;
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const createVehicle = async (vehicle: Vehicle) => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/vehicles/${vehicle.id}`,
        vehicle,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "sentinel_access_token",
            )}`,
          },
        },
      );
      if (response.status == 200) {
        notify.success("Vehicle created successfully");
        getVehicles();
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    try {
      const response = await axios.delete(
        `${BACKEND_URL}/vehicles/${vehicleId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "sentinel_access_token",
            )}`,
          },
        },
      );
      if (response.status == 200) {
        notify.success("Vehicle deleted successfully");
        getVehicles();
        setIsEditDialogOpen(false);
        setSelectedVehicle(null);
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const CreateVehicleDialog = () => {
    const [newVehicle, setNewVehicle] = useState<Vehicle>({
      id: "",
      name: "",
      description: "",
      type: "",
      upload_key: 0,
      updated_at: new Date(),
      created_at: new Date(),
    });

    return (
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <OutlineButton>Create Vehicle</OutlineButton>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Vehicle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="id">ID</Label>
              <Input
                id="id"
                value={newVehicle.id}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, id: e.target.value })
                }
                placeholder="Enter vehicle ID"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newVehicle.name}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, name: e.target.value })
                }
                placeholder="Enter vehicle name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newVehicle.description}
                onChange={(e) =>
                  setNewVehicle({
                    ...newVehicle,
                    description: e.target.value,
                  })
                }
                placeholder="Enter vehicle description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={newVehicle.type}
                onValueChange={(value) =>
                  setNewVehicle({ ...newVehicle, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gr25">GR25</SelectItem>
                  <SelectItem value="gr24">GR24</SelectItem>
                  <SelectItem value="gr23">GR23</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="upload_key">Upload Key</Label>
              <Input
                id="upload_key"
                value={newVehicle.upload_key}
                onChange={(e) => {
                  const uploadKeyInt =
                    e.target.value === "" ? 0 : parseInt(e.target.value);
                  if (isNaN(uploadKeyInt)) {
                    notify.error("Upload key must be a valid integer");
                    return;
                  }
                  setNewVehicle({
                    ...newVehicle,
                    upload_key: uploadKeyInt,
                  });
                }}
                placeholder="Enter vehicle upload key"
              />
            </div>
            <OutlineButton
              className="mt-4 w-full"
              onClick={() => {
                if (
                  !newVehicle.id ||
                  !newVehicle.name ||
                  !newVehicle.description ||
                  !newVehicle.type ||
                  !newVehicle.upload_key
                ) {
                  notify.error("Please fill in all fields");
                  return;
                }

                const existingVehicle = vehicleList.find(
                  (v) => v.id === newVehicle.id,
                );
                if (existingVehicle) {
                  notify.error("A vehicle with this ID already exists");
                  return;
                }

                createVehicle(newVehicle);
              }}
            >
              Create Vehicle
            </OutlineButton>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const EditVehicleDialog = () => {
    const [editedVehicle, setEditedVehicle] = useState<Vehicle | null>(null);

    useEffect(() => {
      if (selectedVehicle) {
        setEditedVehicle({ ...selectedVehicle });
      }
    }, [selectedVehicle]);

    if (!editedVehicle) return null;

    return (
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Edit Vehicle</DialogTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="mr-4">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete Vehicle</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Vehicle</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this vehicle? Note that
                      this will not delete any other data associated with this
                      vehicle.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteVehicle(editedVehicle.id)}
                    >
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-id">ID</Label>
              <Input
                id="edit-id"
                disabled
                value={editedVehicle.id}
                placeholder="Enter vehicle ID"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editedVehicle.name}
                onChange={(e) =>
                  setEditedVehicle({ ...editedVehicle, name: e.target.value })
                }
                placeholder="Enter vehicle name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editedVehicle.description}
                onChange={(e) =>
                  setEditedVehicle({
                    ...editedVehicle,
                    description: e.target.value,
                  })
                }
                placeholder="Enter vehicle description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={editedVehicle.type}
                onValueChange={(value) =>
                  setEditedVehicle({ ...editedVehicle, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gr25">GR25</SelectItem>
                  <SelectItem value="gr24">GR24</SelectItem>
                  <SelectItem value="gr23">GR23</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-upload_key">Upload Key</Label>
              <Input
                id="edit-upload_key"
                value={editedVehicle.upload_key}
                onChange={(e) => {
                  const uploadKeyInt =
                    e.target.value === "" ? 0 : parseInt(e.target.value);
                  if (isNaN(uploadKeyInt)) {
                    notify.error("Upload key must be a valid integer");
                    return;
                  }
                  setEditedVehicle({
                    ...editedVehicle,
                    upload_key: uploadKeyInt,
                  });
                }}
                placeholder="Enter vehicle upload key"
              />
            </div>
            <OutlineButton
              className="mt-4 w-full"
              onClick={() => {
                if (
                  !editedVehicle.id ||
                  !editedVehicle.name ||
                  !editedVehicle.description ||
                  !editedVehicle.type ||
                  !editedVehicle.upload_key
                ) {
                  notify.error("Please fill in all fields");
                  return;
                }

                createVehicle(editedVehicle);
              }}
            >
              Update Vehicle
            </OutlineButton>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <Layout activeTab="vehicles" headerTitle="Vehicles">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex justify-end">
            <CreateVehicleDialog />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicleList.map((vehicle) => (
              <div key={vehicle.id}>
                <Card
                  className="h-full w-full p-2 transition-all duration-150 hover:scale-[1.02] hover:cursor-pointer hover:bg-card"
                  onClick={() => {
                    setSelectedVehicle(vehicle);
                    setIsEditDialogOpen(true);
                  }}
                >
                  <div className="relative">
                    <div className="absolute right-1 top-1">
                      <Card className="rounded-md bg-gradient-to-br from-gr-pink to-gr-purple px-2 py-1 text-xs font-medium text-white">
                        {vehicle.type}
                      </Card>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-2">
                        <img
                          src={`/icons/cars/${vehicle.type}-pixel.png`}
                          className="h-14 w-14 object-contain"
                        />
                      </div>
                      <div className="w-full">
                        <h4>{vehicle.name}</h4>
                        <p className="text-gray-400">{vehicle.id}</p>
                        <Separator className="my-2" />
                        <p className="text-sm text-white/80">
                          {vehicle.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </Layout>
      <EditVehicleDialog />
    </>
  );
}

export default VehiclesPage;

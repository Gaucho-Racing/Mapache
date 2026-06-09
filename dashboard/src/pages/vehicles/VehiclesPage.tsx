import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BACKEND_URL } from "@/consts/config";
import { notify } from "@/lib/notify";
import { setVehicleList, useVehicleList } from "@/lib/store";
import { Vehicle } from "@/models/vehicle";
import { VehicleTypeInfo } from "@/models/config";
import {
  Dialog,
  DialogContent,
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
import { useNavigate } from "react-router-dom";
import { OutlineButton } from "@/components/ui/outline-button";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";

function authHeader() {
  return {
    Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
  };
}

function VehiclesPage() {
  const vehicleList = useVehicleList();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeInfo[]>([]);

  useEffect(() => {
    getVehicles();
    getVehicleTypes();
  }, []);

  const getVehicles = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/vehicles`, {
        headers: authHeader(),
      });
      if (response.status == 200) {
        setVehicleList(
          response.data.data.sort(
            (a: Vehicle, b: Vehicle) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          ),
        );
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const getVehicleTypes = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/vehicle-types`, {
        headers: authHeader(),
      });
      if (response.status == 200) {
        setVehicleTypes(response.data.data ?? []);
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
        { headers: authHeader() },
      );
      if (response.status == 200) {
        notify.success("Vehicle created successfully");
        getVehicles();
        setIsCreateDialogOpen(false);
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
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
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
                  setNewVehicle({ ...newVehicle, description: e.target.value })
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
                  {vehicleTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
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
                  setNewVehicle({ ...newVehicle, upload_key: uploadKeyInt });
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
                if (vehicleList.find((v) => v.id === newVehicle.id)) {
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

  return (
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
                onClick={() => navigate(`/vehicles/${vehicle.id}`)}
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
  );
}

export default VehiclesPage;

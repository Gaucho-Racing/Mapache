import Layout from "@/components/Layout";
import { LoadingComponent } from "@/components/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OutlineButton } from "@/components/ui/outline-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BACKEND_URL } from "@/consts/config";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { notify } from "@/lib/notify";
import {
  ConfigFlag,
  ConfigSnapshot,
  ConfigStatus,
  ConfigValueType,
  VehicleConfigOverride,
  VehicleTypeInfo,
} from "@/models/config";
import { Vehicle } from "@/models/vehicle";
import axios from "axios";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function authHeader() {
  return {
    Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
  };
}

const VALUE_TYPES: ConfigValueType[] = ["bool", "int", "float", "string"];

// encodeValue turns user input into the JSON-encoded scalar the API stores.
// Returns null if the input isn't valid for the type.
function encodeValue(t: ConfigValueType, input: string): string | null {
  const v = input.trim();
  switch (t) {
    case "bool":
      return v === "true" || v === "false" ? v : null;
    case "int":
      return /^-?\d+$/.test(v) ? v : null;
    case "float":
      return v !== "" && !isNaN(Number(v)) ? v : null;
    case "string":
      return JSON.stringify(input);
  }
}

// decodeForInput renders a stored encoded value back into an editable string.
function decodeForInput(t: ConfigValueType, encoded: string): string {
  if (t === "string") {
    try {
      return JSON.parse(encoded) as string;
    } catch {
      return encoded;
    }
  }
  return encoded;
}

function fmtFlagValue(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}

function fmtTime(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime()) || d.getTime() === 0) return "—";
  return d.toLocaleString();
}

function VehicleDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [snapshot, setSnapshot] = useState<ConfigSnapshot | null>(null);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [flags, setFlags] = useState<ConfigFlag[]>([]);
  const [overrides, setOverrides] = useState<VehicleConfigOverride[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeInfo[]>([]);

  useEffect(() => {
    if (id) getVehicle(id);
    getVehicleTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const getVehicle = async (vehicleID: string) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/vehicles/${vehicleID}`, {
        headers: authHeader(),
      });
      if (res.status === 200) {
        setVehicle(res.data.data);
        refreshConfig(vehicleID, res.data.data.type);
      }
    } catch (error) {
      setNotFound(true);
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const getVehicleTypes = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/vehicle-types`, {
        headers: authHeader(),
      });
      if (res.status === 200) setVehicleTypes(res.data.data ?? []);
    } catch {
      /* non-fatal */
    }
  };

  // refreshConfig reloads the snapshot, drift status, flag defs, and overrides.
  const refreshConfig = async (vehicleID: string, vehicleType: string) => {
    try {
      const [snap, st, fl, ov] = await Promise.all([
        axios.get(`${BACKEND_URL}/vehicles/${vehicleID}/config`, {
          headers: authHeader(),
        }),
        axios.get(`${BACKEND_URL}/vehicles/${vehicleID}/config/status`, {
          headers: authHeader(),
        }),
        axios.get(`${BACKEND_URL}/config/flags?vehicle_type=${vehicleType}`, {
          headers: authHeader(),
        }),
        axios.get(`${BACKEND_URL}/vehicles/${vehicleID}/config/overrides`, {
          headers: authHeader(),
        }),
      ]);
      setSnapshot(snap.data.data);
      setStatus(st.data.data);
      setFlags(fl.data.data ?? []);
      setOverrides(ov.data.data ?? []);
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const reload = () => {
    if (vehicle) refreshConfig(vehicle.id, vehicle.type);
  };

  const setOverride = async (key: string, encoded: string) => {
    if (!vehicle) return;
    try {
      const res = await axios.put(
        `${BACKEND_URL}/vehicles/${vehicle.id}/config/overrides/${key}`,
        { value: encoded },
        { headers: authHeader() },
      );
      if (res.status === 200) {
        notify.success(`Override set for ${key}`);
        reload();
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const clearOverride = async (key: string) => {
    if (!vehicle) return;
    try {
      const res = await axios.delete(
        `${BACKEND_URL}/vehicles/${vehicle.id}/config/overrides/${key}`,
        { headers: authHeader() },
      );
      if (res.status === 200) {
        notify.success(`Override cleared for ${key}`);
        reload();
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const deleteVehicle = async () => {
    if (!vehicle) return;
    try {
      const res = await axios.delete(`${BACKEND_URL}/vehicles/${vehicle.id}`, {
        headers: authHeader(),
      });
      if (res.status === 200) {
        notify.success("Vehicle deleted");
        navigate("/vehicles");
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  if (notFound) {
    return (
      <Layout activeTab="vehicles" headerTitle="Vehicle">
        <Card className="border border-red-700 p-4">
          <div className="text-sm text-red-200">Vehicle not found.</div>
        </Card>
      </Layout>
    );
  }
  if (!vehicle) {
    return (
      <Layout activeTab="vehicles" headerTitle="Vehicle">
        <LoadingComponent />
      </Layout>
    );
  }

  const overrideMap = new Map(overrides.map((o) => [o.key, o.value]));

  return (
    <Layout activeTab="vehicles" headerTitle="Vehicle Details">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/vehicles")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Vehicles
          </Button>
          <div className="flex gap-2">
            <EditVehicleDialog
              vehicle={vehicle}
              vehicleTypes={vehicleTypes}
              onSaved={(v) => setVehicle(v)}
            />
            <DeleteVehicleDialog onConfirm={deleteVehicle} />
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <img
              src={`/icons/cars/${vehicle.type}-pixel.png`}
              className="h-16 w-16 object-contain"
            />
            <div className="w-full">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">{vehicle.name}</h2>
                <Badge>{vehicle.type}</Badge>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {vehicle.id}
              </p>
              <Separator className="my-2" />
              <p className="text-sm text-white/80">{vehicle.description}</p>
            </div>
          </div>
        </Card>

        <ConfigStatusCard status={status} />

        <ConfigSection
          vehicle={vehicle}
          flags={flags}
          snapshot={snapshot}
          overrideMap={overrideMap}
          onSet={setOverride}
          onClear={clearOverride}
          onFlagsChanged={reload}
        />
      </div>
    </Layout>
  );
}

function ConfigStatusCard({ status }: { status: ConfigStatus | null }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4>Config Status</h4>
        {status &&
          (status.in_sync ? (
            <Badge className="bg-green-600 hover:bg-green-600">In sync</Badge>
          ) : (
            <Badge className="bg-yellow-600 hover:bg-yellow-600">
              Pending sync
            </Badge>
          ))}
      </div>
      <Separator className="mb-3" />
      <dl className="grid grid-cols-[180px_1fr] gap-y-1.5 text-sm">
        {[
          ["Config last updated", fmtTime(status?.config_updated_at)],
          ["Last synced by vehicle", fmtTime(status?.last_synced_at)],
        ].map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="break-all font-mono text-xs">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ConfigSection({
  vehicle,
  flags,
  snapshot,
  overrideMap,
  onSet,
  onClear,
  onFlagsChanged,
}: {
  vehicle: Vehicle;
  flags: ConfigFlag[];
  snapshot: ConfigSnapshot | null;
  overrideMap: Map<string, string>;
  onSet: (key: string, encoded: string) => void;
  onClear: (key: string) => void;
  onFlagsChanged: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4>Config Flags ({vehicle.type})</h4>
        <CreateFlagDialog vehicleType={vehicle.type} onCreated={onFlagsChanged} />
      </div>
      <Separator className="mb-3" />
      {flags.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No flags defined for {vehicle.type} yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {flags.map((flag) => (
            <FlagRow
              key={flag.key}
              flag={flag}
              effective={snapshot?.flags?.[flag.key]}
              override={overrideMap.get(flag.key)}
              onSet={onSet}
              onClear={onClear}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function FlagRow({
  flag,
  effective,
  override,
  onSet,
  onClear,
}: {
  flag: ConfigFlag;
  effective: unknown;
  override: string | undefined;
  onSet: (key: string, encoded: string) => void;
  onClear: (key: string) => void;
}) {
  const overridden = override !== undefined;
  const [draft, setDraft] = useState(
    overridden ? decodeForInput(flag.value_type, override) : "",
  );

  const commit = () => {
    const encoded = encodeValue(flag.value_type, draft);
    if (encoded === null) {
      notify.error(`Invalid ${flag.value_type} value for ${flag.key}`);
      return;
    }
    onSet(flag.key, encoded);
  };

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{flag.key}</span>
          <Badge variant="outline">{flag.value_type}</Badge>
          {overridden ? (
            <Badge className="bg-gr-purple hover:bg-gr-purple">override</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              default
            </Badge>
          )}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">effective: </span>
          <span className="font-mono">{fmtFlagValue(effective)}</span>
        </div>
      </div>

      {flag.description && (
        <p className="mt-1 text-xs text-muted-foreground">{flag.description}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        type default:{" "}
        <span className="font-mono">
          {decodeForInput(flag.value_type, flag.default_value)}
        </span>
      </p>

      <div className="mt-2 flex items-center gap-2">
        {flag.value_type === "bool" ? (
          <Select
            value={overridden ? override : "inherit"}
            onValueChange={(v) =>
              v === "inherit" ? onClear(flag.key) : onSet(flag.key, v)
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">Inherit default</SelectItem>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <>
            <Input
              className="w-48"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Override (${flag.value_type})`}
            />
            <Button variant="outline" size="sm" onClick={commit}>
              Set
            </Button>
            {overridden && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onClear(flag.key)}
              >
                Clear
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CreateFlagDialog({
  vehicleType,
  onCreated,
}: {
  vehicleType: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [valueType, setValueType] = useState<ConfigValueType>("bool");
  const [defaultValue, setDefaultValue] = useState("false");
  const [description, setDescription] = useState("");

  const create = async () => {
    if (!key) {
      notify.error("Flag key is required");
      return;
    }
    const encoded = encodeValue(valueType, defaultValue);
    if (encoded === null) {
      notify.error(`Invalid ${valueType} default value`);
      return;
    }
    try {
      const res = await axios.post(
        `${BACKEND_URL}/config/flags`,
        {
          vehicle_type: vehicleType,
          key,
          value_type: valueType,
          default_value: encoded,
          description,
        },
        { headers: authHeader() },
      );
      if (res.status === 200) {
        notify.success(`Flag ${key} created`);
        setOpen(false);
        setKey("");
        setDescription("");
        setDefaultValue("false");
        setValueType("bool");
        onCreated();
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <OutlineButton>Create Flag</OutlineButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Config Flag ({vehicleType})</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="flag-key">Key</Label>
            <Input
              id="flag-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. mqtt_publish_enabled"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flag-type">Value type</Label>
            <Select
              value={valueType}
              onValueChange={(v) => {
                const t = v as ConfigValueType;
                setValueType(t);
                setDefaultValue(t === "bool" ? "false" : "");
              }}
            >
              <SelectTrigger id="flag-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flag-default">Default value</Label>
            {valueType === "bool" ? (
              <Select value={defaultValue} onValueChange={setDefaultValue}>
                <SelectTrigger id="flag-default">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="flag-default"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder={`Default (${valueType})`}
              />
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flag-desc">Description</Label>
            <Input
              id="flag-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this flag control?"
            />
          </div>
          <OutlineButton className="mt-2 w-full" onClick={create}>
            Create Flag
          </OutlineButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditVehicleDialog({
  vehicle,
  vehicleTypes,
  onSaved,
}: {
  vehicle: Vehicle;
  vehicleTypes: VehicleTypeInfo[];
  onSaved: (v: Vehicle) => void;
}) {
  const [open, setOpen] = useState(false);
  const [edited, setEdited] = useState<Vehicle>(vehicle);

  useEffect(() => {
    if (open) setEdited(vehicle);
  }, [open, vehicle]);

  const save = async () => {
    if (!edited.name || !edited.description || !edited.type) {
      notify.error("Please fill in all fields");
      return;
    }
    try {
      const res = await axios.post(
        `${BACKEND_URL}/vehicles/${edited.id}`,
        edited,
        { headers: authHeader() },
      );
      if (res.status === 200) {
        notify.success("Vehicle updated");
        onSaved(res.data.data);
        setOpen(false);
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={edited.name}
              onChange={(e) => setEdited({ ...edited, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              value={edited.description}
              onChange={(e) =>
                setEdited({ ...edited, description: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-type">Type</Label>
            <Select
              value={edited.type}
              onValueChange={(v) => setEdited({ ...edited, type: v })}
            >
              <SelectTrigger id="edit-type">
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
            <Label htmlFor="edit-upload_key">Upload Key</Label>
            <Input
              id="edit-upload_key"
              value={edited.upload_key}
              onChange={(e) => {
                const n = e.target.value === "" ? 0 : parseInt(e.target.value);
                if (isNaN(n)) {
                  notify.error("Upload key must be a valid integer");
                  return;
                }
                setEdited({ ...edited, upload_key: n });
              }}
            />
          </div>
          <OutlineButton className="mt-2 w-full" onClick={save}>
            Update Vehicle
          </OutlineButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteVehicleDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete Vehicle</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Vehicle</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this vehicle? This does not delete
            other data associated with it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VehicleDetailsPage;

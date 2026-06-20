import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OutlineButton } from "@/components/ui/outline-button";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import {
  createDashboard,
  deleteDashboard,
  fetchDashboards,
} from "@/lib/dashboards";
import { notify } from "@/lib/notify";
import type { Dashboard } from "@/models/dashboard";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function DashboardsPage() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    reload();
  }, []);

  const reload = async () => {
    try {
      setDashboards(await fetchDashboards());
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    }
  };

  const handleDelete = async (d: Dashboard) => {
    // Plain confirm() is enough here — destructive but trivial to
    // recreate, and we don't have a confirm-dialog pattern elsewhere
    // on this page yet.
    if (!confirm(`Delete "${d.name || "Untitled"}"? This can't be undone.`)) return;
    try {
      await deleteDashboard(d.id);
      notify.success("Dashboard deleted");
      reload();
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    }
  };

  return (
    <Layout activeTab="dashboards" headerTitle="Dashboards">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Custom widget grids over signal data. Drag, resize, save.
          </p>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <OutlineButton>
                <Plus className="mr-2 h-4 w-4" />
                New dashboard
              </OutlineButton>
            </DialogTrigger>
            <CreateDashboardDialog
              onCreated={(d) => {
                setCreateOpen(false);
                navigate(`/dashboards/${d.id}`);
              }}
            />
          </Dialog>
        </div>

        {dashboards.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center text-muted-foreground">
            <p>No dashboards yet.</p>
            <p className="text-xs">
              Create one to start adding charts, gauges, and other widgets.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((d) => (
              <DashboardCard
                key={d.id}
                dashboard={d}
                onOpen={() => navigate(`/dashboards/${d.id}`)}
                onDelete={() => handleDelete(d)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function DashboardCard({
  dashboard,
  onOpen,
  onDelete,
}: {
  dashboard: Dashboard;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className="group flex cursor-pointer flex-col gap-2 p-4 transition-colors hover:border-primary/40"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">
          {dashboard.name || "Untitled dashboard"}
        </h3>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete dashboard"
          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {dashboard.description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {dashboard.description}
        </p>
      ) : null}
      <p className="mt-auto text-[10px] uppercase tracking-wider text-muted-foreground/70">
        Updated {new Date(dashboard.updated_at).toLocaleString()}
      </p>
    </Card>
  );
}

function CreateDashboardDialog({
  onCreated,
}: {
  onCreated: (d: Dashboard) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const d = await createDashboard({ name, description });
      onCreated(d);
    } catch (err) {
      notify.error(getAxiosErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>New dashboard</DialogTitle>
      </DialogHeader>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <div className="flex flex-col gap-1">
          <Label htmlFor="dashboard-name">Name</Label>
          <Input
            id="dashboard-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="GR26 race telemetry"
            required
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="dashboard-desc">Description (optional)</Label>
          <Input
            id="dashboard-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this dashboard is for"
          />
        </div>
        <OutlineButton type="submit" disabled={submitting || !name.trim()}>
          {submitting ? "Creating…" : "Create"}
        </OutlineButton>
      </form>
    </DialogContent>
  );
}

export default DashboardsPage;

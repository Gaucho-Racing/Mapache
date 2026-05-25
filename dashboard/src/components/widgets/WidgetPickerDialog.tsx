import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getWidgetRegistry, WidgetEntry } from "@/components/widgets/registry";
import { useVehicle } from "@/lib/store";
import { useEffect, useState } from "react";
import {
  TooltipContent,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown } from "lucide-react";

export const WidgetPickerDialog = ({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (widget: WidgetEntry) => void;
}) => {
  const vehicle = useVehicle();

  const [availableWidgets, setAvailableWidgets] = useState<
    Record<string, WidgetEntry[]>
  >({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (vehicle) {
      const registry = getWidgetRegistry(vehicle.type);
      setAvailableWidgets(registry);
      const initialOpen: Record<string, boolean> = {};
      Object.keys(registry).forEach((key) => {
        initialOpen[key] = false;
      });
      setOpenSections(initialOpen);
    }
  }, [vehicle]);

  const WidgetPreviewCard = ({ widget }: { widget: WidgetEntry }) => {
    return (
      <div className="flex w-[400px] flex-col gap-2 p-2">
        <div className="h-[150px] w-full overflow-hidden rounded-md bg-card">
          <img src={widget.preview} className="object-cover" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <widget.icon className="h-5 w-5" />
          <h3 className="font-bold">{widget.name}</h3>
        </div>
        <p className="text-muted-foreground">{widget.description}</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Pick a Widget</DialogTitle>
      <DialogContent className="max-w-[500px]">
        <h2 className="mb-4 text-xl font-bold">Pick a Widget</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Select a widget to place on the dashboard.
        </p>
        <div className="max-h-[60vh] space-y-3 overflow-y-scroll px-2">
          {Object.entries(availableWidgets).map(([category, widgets]) => (
            <div key={category}>
              <button
                className="mb-1 flex w-full items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                onClick={() =>
                  setOpenSections((prev) => ({
                    ...prev,
                    [category]: !prev[category],
                  }))
                }
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    openSections[category] ? "" : "-rotate-90"
                  }`}
                />
                {category}
              </button>
              {openSections[category] && (
                <div className="mb-2 flex flex-col gap-1">
                  {widgets.map((widget) => (
                    <TooltipProvider key={widget.id}>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <div
                            className="flex cursor-pointer items-center rounded-lg border border-border bg-background p-2 transition-all duration-150 hover:scale-[1.02] hover:border-gr-pink"
                            onClick={() => {
                              onPick(widget);
                              onOpenChange(false);
                            }}
                          >
                            <widget.icon className="mr-3 h-5 w-5 flex-shrink-0 text-white" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-white">
                                {widget.name}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {widget.description}
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          align="start"
                          className="max-w-[420px]"
                        >
                          <WidgetPreviewCard widget={widget} />
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

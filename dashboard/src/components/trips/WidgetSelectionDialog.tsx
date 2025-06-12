import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getWidgetRegistry, WidgetEntry } from "@/components/widgets/registry";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
} from "@hello-pangea/dnd";
import { GripVertical, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useVehicle } from "@/lib/store";
import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";
import {
  TooltipContent,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export const WidgetSelectionDialog = ({
  open,
  onOpenChange,
  selectedWidgets,
  setSelectedWidgets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWidgets: WidgetEntry[];
  setSelectedWidgets: (widgets: WidgetEntry[]) => void;
}) => {
  const vehicle = useVehicle();

  const [availableWidgets, setAvailableWidgets] = useState<
    Record<string, WidgetEntry[]>
  >({});

  useEffect(() => {
    if (vehicle) {
      setAvailableWidgets(getWidgetRegistry(vehicle.type));
    }
  }, [vehicle]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(selectedWidgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedWidgets(items);
  };

  const addWidget = (widget: WidgetEntry) => {
    if (selectedWidgets.find((w) => w.id === widget.id)) {
      notify.warning("Widget already selected");
      return;
    }
    setSelectedWidgets([...selectedWidgets, widget]);
  };

  const removeWidget = (widget: WidgetEntry) => {
    setSelectedWidgets(selectedWidgets.filter((w) => w.id !== widget.id));
  };

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
      <DialogTitle className="sr-only">Widget Selection Dialog</DialogTitle>
      <DialogContent className="max-w-[800px]">
        <Card className="border-none">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-xl font-bold">
              Widget Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <h3 className="font-semibold">Selected Widgets</h3>
                <div className="max-h-[600px] overflow-y-auto p-2">
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="selected-widgets">
                      {(provided: DroppableProvided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2"
                        >
                          {selectedWidgets.map((widget, index) => (
                            <Draggable
                              key={widget.id}
                              draggableId={widget.id}
                              index={index}
                            >
                              {(provided: DraggableProvided) => (
                                <Card
                                  className="my-2 cursor-grab transition-all duration-150 hover:scale-[1.02] hover:bg-card active:cursor-grabbing active:bg-card"
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <div className="flex flex-row items-center justify-between p-2">
                                    <div className="flex items-center">
                                      <GripVertical className="mr-2 h-4 w-4 opacity-50" />
                                      <widget.icon className="mr-3 h-5 w-5 text-white" />
                                      <span>{widget.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeWidget(widget)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </div>
              <div className="flex flex-col">
                <h3 className="font-semibold">Available Widgets</h3>
                <div className="max-h-[600px] overflow-y-auto p-2">
                  {Object.entries(availableWidgets).map(
                    ([category, widgets]) => (
                      <div key={category}>
                        <h4 className="py-2 text-sm text-muted-foreground">
                          {category}
                        </h4>
                        <div className="flex flex-col gap-2">
                          {widgets.map((widget) => {
                            const isSelected = selectedWidgets.some(
                              (w) => w.id === widget.id,
                            );
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`flex items-center overflow-hidden ${
                                        isSelected
                                          ? "bg-gradient-to-br from-gr-pink to-gr-purple p-[2px]"
                                          : "bg-border p-[1.5px]"
                                      } cursor-pointer rounded-lg bg-[length:100%_100%] transition-all duration-150 hover:scale-[1.02]`}
                                      onClick={() => addWidget(widget)}
                                    >
                                      <div
                                        className={`flex w-full items-center rounded-md ${
                                          isSelected
                                            ? "bg-background"
                                            : "bg-background hover:bg-card"
                                        } p-2`}
                                      >
                                        <div className="flex items-center justify-center">
                                          <widget.icon className="ml-2 mr-3 h-5 w-5 text-white" />
                                        </div>
                                        <div className="break-words text-white">
                                          {widget.name}
                                        </div>
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right">
                                    <WidgetPreviewCard widget={widget} />
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

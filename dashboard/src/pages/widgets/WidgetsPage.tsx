import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { gr24_registry } from "@/components/widgets/registry";
import { useVehicle } from "@/lib/store";
import { WidgetEntry } from "@/components/widgets/registry";

function WidgetsPage() {
  const vehicle = useVehicle();

  const getRegistry = () => {
    if (vehicle.type === "gr24") {
      return gr24_registry;
    }
    return {};
  };

  return (
    <>
      <Layout activeTab="widgets" headerTitle="Widgets">
        <div className="flex flex-col justify-start">
          <p className="text-muted-foreground">
            Here are the available widgets for {vehicle.type} vehicles. To
            create a new widget, simply create a new component wrapping{" "}
            <span className="rounded-md border bg-card p-1 font-mono text-white hover:underline">
              <a
                href={`https://github.com/Gaucho-Racing/Mapache/tree/main/dashboard/src/components/widgets/SignalWidget.tsx`}
                target="_blank"
                rel="noopener noreferrer"
              >
                SignalWidget
              </a>
            </span>{" "}
            and add it{" "}
            <span className="text-gr-pink hover:underline">
              <a
                href={`https://github.com/Gaucho-Racing/Mapache/tree/main/dashboard/src/components/widgets/${vehicle.type}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                here
              </a>
            </span>{" "}
            .
          </p>
          {Object.entries(getRegistry()).map(([key, value]) => (
            <div key={key} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="font-bold">{key}</h2>
                <p className="text-muted-foreground">
                  Here are the available widgets for the {key} node.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                {(value as WidgetEntry[]).map((widget) => (
                  <Card
                    key={widget.id}
                    className="w-[400px] cursor-pointer p-4 transition-all duration-150 hover:scale-[1.02] hover:bg-card"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="h-[150px] w-full overflow-hidden rounded-md bg-card">
                        <img src={widget.preview} className="object-cover" />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <widget.icon className="h-5 w-5" />
                        <h3 className="font-bold">{widget.name}</h3>
                      </div>
                      <p className="text-muted-foreground">
                        {widget.description}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Layout>
    </>
  );
}

export default WidgetsPage;

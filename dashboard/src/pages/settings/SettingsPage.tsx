import Layout from "@/components/Layout";
import { useRoseMode, toggleRoseMode } from "@/lib/store";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

function SettingsPage() {
  const roseMode = useRoseMode();
  const { theme, setTheme } = useTheme();
  // next-themes' theme is undefined on first server-style render. We
  // mount-gate the toggle so the initial checked state matches what
  // the user actually has, not a flicker of the default.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isLight = mounted && theme === "light";

  return (
    <Layout activeTab="settings" headerTitle="Settings">
      <div className="flex max-w-md flex-col gap-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h3 className="font-semibold">Light mode</h3>
            <p className="text-xs text-muted-foreground">
              Easier on the eyes outside; gradient accents stay the same.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isLight}
              onChange={(e) => setTheme(e.target.checked ? "light" : "dark")}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-background after:transition-all after:content-[''] peer-checked:bg-gradient-to-r peer-checked:from-gr-pink peer-checked:to-gr-purple peer-checked:after:translate-x-full" />
          </label>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h3 className="font-semibold">Wilted Rose Mode</h3>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={roseMode}
              onChange={toggleRoseMode}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-background after:transition-all after:content-[''] peer-checked:bg-gradient-to-r peer-checked:from-gr-pink peer-checked:to-gr-purple peer-checked:after:translate-x-full" />
          </label>
        </div>
      </div>
    </Layout>
  );
}

export default SettingsPage;

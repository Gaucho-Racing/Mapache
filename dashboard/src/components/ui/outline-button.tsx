import * as React from "react";

import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const OutlineButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div>
        <button
          ref={ref}
          className={cn(
            className,
            "group relative mb-2 me-2 mt-8 inline-flex items-center justify-center overflow-hidden  rounded-md bg-gradient-to-br  from-gr-pink to-gr-purple p-0.5 text-sm font-medium text-white",
          )}
        >
          <span className="relative h-10 rounded-sm bg-black px-4 py-2.5 transition-all duration-75 ease-in group-hover:bg-opacity-0">
            {props.children}
          </span>
        </button>
      </div>
    );
  },
);
OutlineButton.displayName = "Button";

export { OutlineButton };

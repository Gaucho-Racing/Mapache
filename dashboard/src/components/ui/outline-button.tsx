import * as React from "react";

import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const OutlineButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div>
        <button
          onClick={props.onClick}
          disabled={props.disabled}
          ref={ref}
          className={cn(
            className,
            "group relative inline-flex items-center justify-center overflow-hidden  rounded-md bg-gradient-to-br  from-gr-pink to-gr-purple p-0.5 text-sm font-medium text-white disabled:opacity-70",
          )}
        >
          <span className="relative inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-sm bg-black px-4 py-2.5 text-sm font-medium ring-offset-background transition-all duration-75 ease-in focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 group-hover:bg-opacity-0">
            {props.children}
          </span>
        </button>
      </div>
    );
  },
);
OutlineButton.displayName = "Button";

export { OutlineButton };

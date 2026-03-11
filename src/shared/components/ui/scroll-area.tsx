"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";

import { cn } from "@shared/lib/utils";

type HorizontalScrollbarMode = "bottom" | "top" | "both";
type ScrollAreaViewportProps = React.ComponentProps<typeof ScrollAreaPrimitive.Viewport> &
  React.HTMLAttributes<HTMLDivElement>;
type ScrollAreaScrollbarProps = React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> &
  React.HTMLAttributes<HTMLDivElement>;
type ScrollAreaProps = React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  viewportClassName?: string;
  viewportProps?: ScrollAreaViewportProps;
  horizontalScrollbar?: HorizontalScrollbarMode;
  showVerticalScrollbar?: boolean;
  topScrollbarProps?: ScrollAreaScrollbarProps;
  bottomScrollbarProps?: ScrollAreaScrollbarProps;
  verticalScrollbarProps?: ScrollAreaScrollbarProps;
};
type ScrollBarProps = ScrollAreaScrollbarProps & {
  position?: "top" | "bottom";
};

function ScrollArea({
  className,
  viewportClassName,
  viewportProps,
  horizontalScrollbar = "bottom",
  showVerticalScrollbar = true,
  topScrollbarProps,
  bottomScrollbarProps,
  verticalScrollbarProps,
  children,
  ...props
}: ScrollAreaProps) {
  const showTopHorizontalScrollbar =
    horizontalScrollbar === "top" || horizontalScrollbar === "both";
  const showBottomHorizontalScrollbar =
    horizontalScrollbar === "bottom" || horizontalScrollbar === "both";

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative flex min-h-0 min-w-0 flex-col overflow-hidden", className)}
      {...props}
    >
      {showTopHorizontalScrollbar ? (
        <ScrollBar orientation="horizontal" position="top" {...topScrollbarProps} />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1">
        <ScrollAreaPrimitive.Viewport
          data-slot="scroll-area-viewport"
          className={cn(
            "min-h-0 min-w-0 flex-1 rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
            viewportClassName,
          )}
          {...viewportProps}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>

        {showVerticalScrollbar ? (
          <ScrollBar orientation="vertical" {...verticalScrollbarProps} />
        ) : null}
      </div>

      {showBottomHorizontalScrollbar ? (
        <ScrollBar orientation="horizontal" position="bottom" {...bottomScrollbarProps} />
      ) : null}
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  position,
  style,
  ...props
}: ScrollBarProps) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      data-position={position}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        "data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:bg-muted/35",
        "data-[orientation=horizontal]:shrink-0",
        "data-[orientation=vertical]:w-2.5 data-[orientation=vertical]:shrink-0 data-[orientation=vertical]:border-l data-[orientation=vertical]:border-border/60 data-[orientation=vertical]:bg-muted/35",
        "data-[position=top]:border-b data-[position=top]:border-border/60",
        "data-[position=bottom]:border-t data-[position=bottom]:border-border/60",
        className,
      )}
      style={{ position: "static", ...style }}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };

"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/utils/cn";

export type DotWaterfallStep = {
  label: string;
  width: number;
  height: number;
  startX: number;
  color: string;
};

type DotDefinition = {
  gridX: number;
  gridY: number;
  stepIndex: number;
};

type DotRenderData = {
  centerX: number;
  centerY: number;
  radius: number;
  stepIndex: number;
};

type TooltipState = {
  x: number;
  y: number;
  label: string;
} | null;

export type DotWaterfallProps = {
  steps: DotWaterfallStep[];
  animationDelayMs?: number;
  dotGapPx?: number;
  className?: string;
};

const DEFAULT_ANIMATION_DELAY = 15;

const lightenHexColor = (hex: string, amount = 0.2) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const num = parseInt(normalized, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + 255 * amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + 255 * amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + 255 * amount));
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 1)`;
};

export const DotWaterfall: React.FC<DotWaterfallProps> = ({
  steps,
  animationDelayMs = DEFAULT_ANIMATION_DELAY,
  dotGapPx = 2,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dotRenderDataRef = useRef<DotRenderData[]>([]);
  const activationTimesRef = useRef<number[]>([]);
  const lastActivatedIndexRef = useRef(-1);

  const cumulativeHeights = useMemo(() => {
    const acc: number[] = [];
    let running = 0;
    steps.forEach((step) => {
      acc.push(running);
      running += step.height;
    });
    return acc;
  }, [steps]);

  const orderedDots: DotDefinition[] = useMemo(() => {
    const defs: DotDefinition[] = [];
    steps.forEach((step, stepIndex) => {
      const startY = cumulativeHeights[stepIndex] ?? 0;
      for (let row = 0; row < step.height; row += 1) {
        for (let col = 0; col < step.width; col += 1) {
          defs.push({
            gridX: step.startX + col,
            gridY: startY + row,
            stepIndex,
          });
        }
      }
    });

    const sorted: DotDefinition[] = [];
    steps.forEach((_, stepIndex) => {
      const perStep = defs
        .filter((dot) => dot.stepIndex === stepIndex)
        .sort((a, b) => {
          if (a.gridY === b.gridY) return a.gridX - b.gridX;
          return a.gridY - b.gridY;
        });
      sorted.push(...perStep);
    });

    return sorted;
  }, [steps, cumulativeHeights]);

  const gridWidth = useMemo(() => {
    if (!steps.length) return 0;
    return steps.reduce(
      (max, step) => Math.max(max, step.startX + step.width),
      0
    );
  }, [steps]);

  const gridHeight = useMemo(
    () => steps.reduce((sum, step) => sum + step.height, 0),
    [steps]
  );

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.round(width),
          height: Math.round(height),
        });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    activationTimesRef.current = Array(orderedDots.length).fill(-1);
    lastActivatedIndexRef.current = -1;
    if (!orderedDots.length) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      if (lastActivatedIndexRef.current >= orderedDots.length - 1) {
        window.clearInterval(interval);
        return;
      }
      lastActivatedIndexRef.current += 1;
      activationTimesRef.current[lastActivatedIndexRef.current] =
        performance.now();
    }, animationDelayMs);
    return () => window.clearInterval(interval);
  }, [orderedDots, animationDelayMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(dimensions.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(dimensions.height * pixelRatio));
      canvas.style.width = `${dimensions.width}px`;
      canvas.style.height = `${dimensions.height}px`;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    resizeCanvas();
  }, [dimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!gridWidth || !gridHeight || !dimensions.width || !dimensions.height) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const now = performance.now();
      const cellSize =
        Math.min(
          dimensions.width / (gridWidth + 0.5),
          dimensions.height / (gridHeight + 0.5)
        ) || 0;
      const baseRadius = Math.max(2, cellSize * 0.4 - dotGapPx);
      const horizPad = (dimensions.width - gridWidth * cellSize) / 2;
      const vertPad = (dimensions.height - gridHeight * cellSize) / 2;

      dotRenderDataRef.current = orderedDots.map((dot, index) => {
        const centerX = horizPad + (dot.gridX + 0.5) * cellSize;
        const centerY =
          dimensions.height - vertPad - (dot.gridY + 0.5) * cellSize;
        return {
          centerX,
          centerY,
          radius: baseRadius,
          stepIndex: dot.stepIndex,
        };
      });

      dotRenderDataRef.current.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.centerX, dot.centerY, dot.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(148, 163, 184, 0.15)";
        ctx.fill();
      });

      dotRenderDataRef.current.forEach((dot, index) => {
        const activationTime = activationTimesRef.current[index];
        if (activationTime < 0) return;

        const elapsed = now - activationTime;
        const scale = Math.min(1, elapsed / 140);
        if (scale <= 0) return;

        const stepColor = steps[dot.stepIndex]?.color ?? "#2563eb";
        const isHovered = hoveredStep === dot.stepIndex;
        const fillColor = isHovered
          ? lightenHexColor(stepColor, 0.35)
          : stepColor;

        ctx.beginPath();
        ctx.arc(dot.centerX, dot.centerY, dot.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.globalAlpha = isHovered ? 0.95 : 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    orderedDots,
    dotGapPx,
    gridHeight,
    gridWidth,
    hoveredStep,
    steps,
    dimensions,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = dotRenderDataRef.current.find((dot) => {
        const dx = dot.centerX - x;
        const dy = dot.centerY - y;
        return Math.sqrt(dx * dx + dy * dy) <= dot.radius;
      });

      if (hit) {
        setHoveredStep(hit.stepIndex);
        const label = steps[hit.stepIndex]?.label ?? "";
        setTooltip({ x, y, label });
      } else {
        setHoveredStep(null);
        setTooltip(null);
      }
    };

    const handlePointerLeave = () => {
      setHoveredStep(null);
      setTooltip(null);
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [steps]);

  const handleWrapperPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setHoveredStep(null);
      setTooltip(null);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative h-full w-full rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-sm overflow-hidden",
        className
      )}
      onPointerLeave={handleWrapperPointerLeave}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Capital distribution waterfall animation"
        className="h-full w-full"
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-900 shadow-lg"
          style={{
            left: Math.min(
              Math.max(tooltip.x + 12, 8),
              Math.max(8, dimensions.width - 80)
            ),
            top: Math.min(
              Math.max(tooltip.y - 32, 8),
              Math.max(8, dimensions.height - 32)
            ),
          }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
};



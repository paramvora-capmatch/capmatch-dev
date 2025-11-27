"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

type StepLabelMeta = {
  label: string;
  left: number;
  width: number;
  top: number;
};

export type DotWaterfallProps = {
  steps: DotWaterfallStep[];
  animationDelayMs?: number;
  dotGapPx?: number;
  className?: string;
};

const DEFAULT_ANIMATION_DELAY = 20;
const DOTS_PER_ROW_MULTIPLIER = 1.5;
const DOTS_PER_TICK = 15;
const MAX_VERTICAL_PADDING = 36;
const LABEL_OFFSET_PX = 28;
const LOOP_RESET_DELAY_MS = 1200;

export const DotWaterfall: React.FC<DotWaterfallProps> = ({
  steps,
  animationDelayMs = DEFAULT_ANIMATION_DELAY,
  dotGapPx = 2,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const dotRenderDataRef = useRef<DotRenderData[]>([]);
  const activationTimesRef = useRef<number[]>([]);
  const lastActivatedIndexRef = useRef(-1);
  const [stepLabels, setStepLabels] = useState<StepLabelMeta[]>([]);
  const [loopIteration, setLoopIteration] = useState(0);

  const orderedDots: DotDefinition[] = useMemo(() => {
    const defs: DotDefinition[] = [];
    steps.forEach((step, stepIndex) => {
      for (let row = 0; row < step.height; row += 1) {
        for (
          let col = 0;
          col < step.width * DOTS_PER_ROW_MULTIPLIER;
          col += 1
        ) {
          defs.push({
            gridX: step.startX * DOTS_PER_ROW_MULTIPLIER + col,
            gridY: row,
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
  }, [steps]);

  const gridWidth = useMemo(() => {
    if (!steps.length) return 0;
    return steps.reduce(
      (max, step) =>
        Math.max(
          max,
          (step.startX + step.width) * DOTS_PER_ROW_MULTIPLIER
        ),
      0
    );
  }, [steps]);

  const gridHeight = useMemo(() => {
    if (!steps.length) return 0;
    return steps.reduce((max, step) => Math.max(max, step.height), 0);
  }, [steps]);

  const layoutInfo = useMemo(() => {
    if (
      !gridWidth ||
      !gridHeight ||
      !dimensions.width ||
      !dimensions.height
    ) {
      return null;
    }

    const cellSize =
      Math.min(
        dimensions.width / (gridWidth + 0.5),
        dimensions.height / (gridHeight + 0.05)
      ) || 0;

    if (!cellSize) return null;

    const horizPad = Math.max(
      8,
      (dimensions.width - gridWidth * cellSize) / 2
    );
    const overflow = Math.max(0, dimensions.height - gridHeight * cellSize);
    const vertPad = Math.min(MAX_VERTICAL_PADDING, overflow / 2);

    return { cellSize, horizPad, vertPad };
  }, [gridWidth, gridHeight, dimensions]);

  useEffect(() => {
    if (!layoutInfo) {
      setStepLabels([]);
      return;
    }

    setStepLabels(
      steps.map((step) => {
        const usableWidth = step.width * DOTS_PER_ROW_MULTIPLIER;
        const startX = step.startX * DOTS_PER_ROW_MULTIPLIER;
        const left = layoutInfo.horizPad + startX * layoutInfo.cellSize;
        const width = usableWidth * layoutInfo.cellSize;
        const top =
          dimensions.height -
          layoutInfo.vertPad -
          step.height * layoutInfo.cellSize -
          LABEL_OFFSET_PX;

        return {
          label: step.label,
          left,
          width,
          top: Math.max(8, top),
        };
      })
    );
  }, [layoutInfo, steps, dimensions.height]);

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

    let completionTimeout: number | null = null;

    const interval = window.setInterval(() => {
      if (lastActivatedIndexRef.current >= orderedDots.length - 1) {
        window.clearInterval(interval);
        completionTimeout = window.setTimeout(() => {
          setLoopIteration((prev) => prev + 1);
        }, LOOP_RESET_DELAY_MS);
        return;
      }

      for (let i = 0; i < DOTS_PER_TICK; i += 1) {
        if (lastActivatedIndexRef.current >= orderedDots.length - 1) break;
        lastActivatedIndexRef.current += 1;
        activationTimesRef.current[lastActivatedIndexRef.current] =
          performance.now();
      }
    }, animationDelayMs);

    return () => {
      window.clearInterval(interval);
      if (completionTimeout) {
        window.clearTimeout(completionTimeout);
      }
    };
  }, [orderedDots, animationDelayMs, loopIteration]);

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
      if (
        !gridWidth ||
        !gridHeight ||
        !dimensions.width ||
        !dimensions.height ||
        !layoutInfo
      ) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const now = performance.now();
      const { cellSize, horizPad, vertPad } = layoutInfo;
      const baseRadius = Math.max(2, cellSize * 0.4 - dotGapPx);

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

        ctx.beginPath();
        ctx.arc(dot.centerX, dot.centerY, dot.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = stepColor;
        ctx.globalAlpha = 0.9;
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
    steps,
    dimensions,
    layoutInfo,
  ]);

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative h-full w-full rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-sm overflow-hidden",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Capital distribution waterfall animation"
        className="h-full w-full"
      />
      {stepLabels.map((label) => (
        <div
          key={label.label}
          className="pointer-events-none absolute text-[13px] font-semibold uppercase tracking-[0.25em] text-slate-900"
          style={{
            left: `${label.left}px`,
            width: `${label.width}px`,
            top: `${label.top}px`,
          }}
        >
          <div className="text-center">{label.label}</div>
        </div>
      ))}
    </div>
  );
};



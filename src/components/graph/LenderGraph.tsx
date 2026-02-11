// src/components/graph/LenderGraph.tsx
'use client';

import { LenderFilters } from "@/stores/useLenderStore";
import type React from "react";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import type { LenderProfile } from "../../types/lender";
import LenderDetailCard from "../lender-detail-card";

const filterKeys = ['asset_types', 'deal_types', 'capital_types', 'debt_ranges', 'locations'];

// This function calculates a score for a lender based *only* on the graph's current formData.
// It helps decide if a node appears "matched" by the graph's current UI filters.
function computeLenderScoreForGraphDisplay(lender: LenderProfile, formData: Partial<LenderFilters> | undefined): number {
  const activeUIFilterCategories = filterKeys.filter(
    (key) =>
      formData &&
      formData[key as keyof LenderFilters] &&
      ((Array.isArray(formData[key as keyof LenderFilters]) ? (formData[key as keyof LenderFilters] as any[]).length : 0) > 0)
  );

  if (activeUIFilterCategories.length === 0) return 0; // No UI filters active in graph, so no match score from graph's perspective

  let matchCount = 0;
  for (const key of activeUIFilterCategories) {
    const filterValue = formData?.[key as keyof LenderFilters];
    if (!filterValue || !Array.isArray(filterValue)) continue;

    if (key === "locations") {
      if (
        lender.locations.includes("nationwide") ||
        lender.locations.some(loc => filterValue.includes(loc))
      ) {
        matchCount++;
      }
    } else if (key === "debt_ranges") {
      // Ensure lender.debt_ranges exists and is an array before trying to use .some()
      if (
        lender.debt_ranges && Array.isArray(lender.debt_ranges) &&
        lender.debt_ranges.some(dr => filterValue.includes(dr))
      ) {
        matchCount++;
      }
    } else {
      const lenderVals = lender[key as keyof LenderProfile] as string[] | undefined;
      if (
        lenderVals && Array.isArray(lenderVals) && // Ensure lenderVals is an array
        lenderVals.some((item: string) => filterValue.includes(item))
      ) {
        matchCount++;
      }
    }
  }
  return matchCount === activeUIFilterCategories.length ? 1 : 0;
}


function getLenderColor(
  lenderFromContext: LenderProfile,
  formDataForGraphDisplay: Partial<LenderFilters> | undefined,
  graphConsidersNodeActive: boolean, // If graph's UI filters make this node "active"
  filtersAreAppliedOnPage: boolean // If ANY filter is applied on the page (from props)
): string {

  // If no filters are applied on the page at all, all nodes are uniform gray
  if (!filtersAreAppliedOnPage) {
    return "#6b7280"; // Darker grey
  }

  // If page has filters, but this specific node isn't considered active by graph's UI filters
  if (!graphConsidersNodeActive) {
    return "#6b7280"; // Darker grey
  }

  // Color based on the authoritative match_score from the context.
  const scoreFromContext = lenderFromContext.match_score || 0;

  if (scoreFromContext >= 0.8) return "hsl(199, 89%, 48%)"; // Teal (replaces green)
  if (scoreFromContext >= 0.5) return "hsl(217, 91%, 60%)"; // Clean blue

  return "#94a3b8"; // Light slate grey for inactive
}

interface LenderGraphProps {
  lenders: LenderProfile[];
  formData?: Partial<LenderFilters>;
  filtersApplied: boolean; // True if ANY filter category is selected by the user on the page
  allFiltersSelected?: boolean;
  onLenderClick?: (lender: LenderProfile | null) => void;
}

export default function LenderGraph({
  lenders,
  formData = {},
  filtersApplied, // This prop tells the graph if any filter is active in the UI (from page.tsx)
  allFiltersSelected = false,
  onLenderClick,
}: LenderGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedLender, setSelectedLender] = useState<LenderProfile | null>(null);
  const [hoveredLenderId, setHoveredLenderId] = useState<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [centerPoint, setCenterPoint] = useState({ x: 0, y: 0 });
  const [showIncompleteFiltersCard, setShowIncompleteFiltersCard] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const animationRef = useRef<number>(0);
  const lenderPositionsRef = useRef<Map<number, {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    radius: number;
    color: string;
    // NEW: Differentiate between graph's view of active and overall page filter state
    isVisuallyActiveInGraph: boolean; // Node's visual active state based on formData
    scoreFromContext: number;
  }>>(new Map());
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    color: string;
    speed: number;
    life: number;
    maxLife: number;
  }>>([]);

  // Card positioning - fixed relative to node position, not mouse position
  const cardPositionRef = useRef({ relativeX: 0, relativeY: 0 });
  const lastHoveredLenderIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingUpdateRef = useRef<(() => void) | null>(null);

  // Set mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let rafId: number;
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        if (width > 0 && height > 0) {
          if (canvasSize.width !== width || canvasSize.height !== height) {
            setCanvasSize({ width, height });
            setCenterPoint({ x: width / 2, y: height / 2 });
          }
        } else {
          rafId = requestAnimationFrame(updateSize);
        }
      } else {
        rafId = requestAnimationFrame(updateSize);
      }
    };
    rafId = requestAnimationFrame(updateSize);
    window.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      cancelAnimationFrame(rafId);
    };
  }, [canvasSize.width, canvasSize.height]);


  useEffect(() => {
    if (!canvasSize.width || !canvasSize.height) return;
    const newPositions = new Map();
    const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    const maxDistance = Math.min(canvasSize.width, canvasSize.height) * 0.45;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    lenders.forEach((lender, index) => {
      const scoreFromContext = lender.match_score || 0;

      // Determine if this node should appear "active" based on the graph's current UI filters (formData)
      const graphInternalScore = computeLenderScoreForGraphDisplay(lender, formData);
      const isVisuallyActiveInGraph = filtersApplied && graphInternalScore > 0;

      const baseRadius = (filtersApplied && isVisuallyActiveInGraph)
        ? 10 + scoreFromContext * 4  // Active nodes are larger
        : 8;                         // Inactive are still visible

      const color = getLenderColor(lender, formData, isVisuallyActiveInGraph, filtersApplied);

      let distanceFactor;
      if (filtersApplied && isVisuallyActiveInGraph) {
        // Position active nodes in a core ring
        distanceFactor = 0.2 + (1 - scoreFromContext) * 0.3;
      } else {
        // Surround the core with a cloud of other lenders
        distanceFactor = 0.55 + (index % 5) * 0.08 + (Math.sin(index) * 0.05);
      }
      const angle = index * goldenAngle;
      const distance = maxDistance * distanceFactor;
      const targetX = center.x + Math.cos(angle) * distance;
      const targetY = center.y + Math.sin(angle) * distance;

      const currentPosData = lenderPositionsRef.current.get(lender.lender_id);
      newPositions.set(lender.lender_id, {
        x: currentPosData?.x ?? targetX,
        y: currentPosData?.y ?? targetY,
        targetX, targetY, radius: baseRadius, color, isVisuallyActiveInGraph, scoreFromContext,
      });
    });
    lenderPositionsRef.current = newPositions;
  }, [lenders, canvasSize, filtersApplied, formData]); // formData is crucial here


  function addParticles(x: number, y: number, color: string, count = 3, sizeMultiplier = 0.8) {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y, size: (Math.random() * 1.8 + 0.8) * sizeMultiplier,
        color, speed: Math.random() * 1.2 + 0.25, life: 0, maxLife: Math.random() * 30 + 22,
      });
    }
  }

  useEffect(() => {
    if (!canvasRef.current || !canvasSize.width || !canvasSize.height) {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasSize.width || 0, canvasSize.height || 0);
      return;
    }
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      const activePositions: Array<{ x: number, y: number, color: string, score: number }> = [];
      const allPositions: Array<{ x: number, y: number }> = [];
      const maxRadius = Math.min(canvasSize.width, canvasSize.height) * 0.55;

      // 1. (Removed Diamond Grid Background)

      // 2. Background cloud of connections (drawing connections between all nodes)
      lenderPositionsRef.current.forEach(pos => {
        allPositions.push({ x: pos.x, y: pos.y });
        if (pos.isVisuallyActiveInGraph) {
          activePositions.push({ x: pos.x, y: pos.y, color: pos.color, score: pos.scoreFromContext });
        }
      });

      ctx.save();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)"; // Darker background lines (was 0.25)
      ctx.lineWidth = 0.3;
      // Draw a subset of connections to avoid overkill but maintain density
      for (let i = 0; i < allPositions.length; i++) {
        const step = allPositions.length > 50 ? 3 : 1; // Density control
        for (let j = i + 1; j < allPositions.length; j += step) {
          ctx.beginPath();
          ctx.moveTo(allPositions[i].x, allPositions[i].y);
          ctx.lineTo(allPositions[j].x, allPositions[j].y);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 3. Highlight connections between active matches
      ctx.save();
      for (let i = 0; i < activePositions.length; i++) {
        for (let j = i + 1; j < activePositions.length; j++) {
          const pos1 = activePositions[i];
          const pos2 = activePositions[j];
          const avgScore = (pos1.score + pos2.score) / 2;

          ctx.beginPath();
          ctx.moveTo(pos1.x, pos1.y);
          ctx.lineTo(pos2.x, pos2.y);

          // Highlight connections between matches
          ctx.strokeStyle = "rgba(100, 116, 139, 0.65)"; // Darker matches connections
          ctx.lineWidth = 0.8 + avgScore * 0.5;
          ctx.stroke();
        }
      }
      ctx.restore();

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);

      // Lender Nodes
      lenderPositionsRef.current.forEach((pos, lender_id) => {
        if (!pos) return;
        // isVisuallyActiveInGraph determines if lines/active pulses are shown
        const { isVisuallyActiveInGraph, scoreFromContext } = pos;

        // Check if this node is hovered (used for performance optimizations)
        const isHovered = hoveredLenderId === lender_id;

        // Draw connecting lines only if page filters are applied AND node is visually active in graph
        if (filtersApplied && isVisuallyActiveInGraph) {
          // Lines from center to nodes - colored by node score
          ctx.beginPath();
          ctx.moveTo(centerPoint.x, centerPoint.y);
          ctx.lineTo(pos.x, pos.y);

          // Use node color for the radial line with appropriate alpha
          const radialColor = scoreFromContext >= 0.8
            ? "rgba(6, 182, 212, 0.45)" // Teal line
            : "rgba(59, 130, 246, 0.4)"; // Blue line

          ctx.strokeStyle = radialColor;
          ctx.lineWidth = 1 + scoreFromContext * 1.5;
          ctx.stroke();

          // Particles along lines for high-scoring nodes
          if (scoreFromContext > 0.65 && Math.random() < 0.015) {
            const t = Math.random();
            addParticles(centerPoint.x + (pos.x - centerPoint.x) * t, centerPoint.y + (pos.y - centerPoint.y) * t, pos.color, 1, 0.7);
          }
        }

        // Smoother ease-out lerp so transitions between filter states feel less jarring
        const moveSpeed = 0.032;
        pos.x += (pos.targetX - pos.x) * moveSpeed;
        pos.y += (pos.targetY - pos.y) * moveSpeed;

        // Particles at node position for active, mid-to-high scoring nodes - only for hovered node
        if (filtersApplied && isVisuallyActiveInGraph && scoreFromContext > 0.55 && isHovered && Math.random() < 0.012 * scoreFromContext) {
          addParticles(pos.x, pos.y, pos.color, 1, 0.6);
        }

        // Pulsing effect - OPTIMIZATION: 
        // - When NOT hovering: all active nodes pulse
        // - When hovering: only the hovered node pulses, others are static (reduces calculations)
        let pulse = 0;
        if (pos.isVisuallyActiveInGraph) {
          if (hoveredLenderId === null) {
            // No hover - all active nodes pulse
            pulse = Math.sin(time / 300 + lender_id) * 1.5;
          } else if (isHovered) {
            // Hovering - only hovered node pulses
            pulse = Math.sin(time / 300 + lender_id) * 1.5;
          }
          // When hovering on a different node, this node is static (pulse = 0)
        }
        const finalRadius = pos.radius + pulse;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, finalRadius, 0, 2 * Math.PI);
        ctx.fillStyle = pos.color;
        ctx.fill();

        if (hoveredLenderId === lender_id) {
          ctx.strokeStyle = "rgba(59, 130, 246, 0.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
          addParticles(pos.x, pos.y, pos.color, 1, 1.2);
        }

        // Highlight selected/hovered - light mode only
        if (selectedLender?.lender_id === lender_id) {
          ctx.strokeStyle = "rgba(59, 130, 246, 0.95)";
          ctx.lineWidth = 1.9; ctx.stroke();
        } else if (hoveredLenderId === lender_id) {
          ctx.strokeStyle = "rgba(59, 130, 246, 0.7)";
          ctx.lineWidth = 1.3; ctx.stroke();
        }

        // Node initial (text) - centered perfectly
        // Show initials for ANY scored node
        if (filtersApplied && isVisuallyActiveInGraph && scoreFromContext > 0.2) {
          const lenderDetails = lenders.find(l => l.lender_id === lender_id);
          const initial = lenderDetails?.name.charAt(0).toUpperCase() || "L";
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.floor(finalRadius * 0.9)}px Arial, sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(initial, pos.x, pos.y + 1);
        }
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(animationRef.current); };
  }, [lenders, canvasSize, selectedLender, hoveredLenderId, centerPoint, filtersApplied, formData]);

  // Memoized screen position - only recalculates when container moves (scroll/resize)
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selectedLender || !containerRef.current) {
      setContainerRect(null);
      return;
    }

    const updateRect = () => {
      const rect = containerRef.current?.getBoundingClientRect() || null;
      setContainerRect(rect);
    };

    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [selectedLender]);

  // Compute screen position from relative position + container rect
  // CRITICAL: Only recalculates when containerRect changes (scroll/resize), NOT on mouse move
  // The relative position (cardPositionRef) is set once when lender changes and stays fixed
  const cardScreenPosition = useMemo(() => {
    if (!containerRect) return { x: 0, y: 0 };
    // Use the FIXED card position from ref (set once when lender changes, never updated on mouse move)
    const relativePos = cardPositionRef.current;
    return {
      x: containerRect.left + relativePos.relativeX,
      y: containerRect.top + relativePos.relativeY,
    };
  }, [containerRect]); // Only recalculate when container moves (scroll/resize), NOT on mouse move

  // Calculate card position relative to node position (fixed, not following mouse)
  const calculateCardPositionFromNode = useCallback((nodeX: number, nodeY: number, containerRect: DOMRect) => {
    const cardWidth = 320;
    const cardHeight = 380;

    // Position card to the right and slightly above the node by default
    let cardX = nodeX + 30;
    let cardY = nodeY - cardHeight / 2;

    // Adjust if card would overflow canvas bounds
    if (cardX + cardWidth > canvasSize.width - 10) {
      // Position to the left instead
      cardX = nodeX - cardWidth - 30;
    }
    if (cardY + cardHeight > canvasSize.height - 10) {
      cardY = canvasSize.height - cardHeight - 10;
    }
    if (cardY < 10) {
      cardY = 10;
    }

    // Clamp to canvas bounds
    cardX = Math.max(5, Math.min(cardX, canvasSize.width - cardWidth - 5));
    cardY = Math.max(5, Math.min(cardY, canvasSize.height - cardHeight - 5));

    return { x: cardX, y: cardY };
  }, [canvasSize.width, canvasSize.height]);

  // Update card position ONLY when lender changes (not on every mouse move)
  const updateCardPositionForLender = useCallback((lenderId: number | null) => {
    if (lenderId === null) {
      lastHoveredLenderIdRef.current = null;
      return;
    }

    // CRITICAL FIX: Only update if this is a DIFFERENT lender
    // This prevents card from moving when mouse moves on same node
    if (lastHoveredLenderIdRef.current === lenderId) {
      // Same lender - ABSOLUTELY DO NOT UPDATE POSITION
      // Card stays fixed relative to node
      return;
    }

    // New lender detected - calculate and set position ONCE
    lastHoveredLenderIdRef.current = lenderId;
    const pos = lenderPositionsRef.current.get(lenderId);
    if (!pos || !containerRef.current) {
      lastHoveredLenderIdRef.current = null; // Reset if position not found
      return;
    }

    // Calculate fixed position relative to node (not mouse)
    const containerRect = containerRef.current.getBoundingClientRect();
    const cardPos = calculateCardPositionFromNode(pos.x, pos.y, containerRect);

    // Set position in ref (doesn't trigger re-render)
    cardPositionRef.current = { relativeX: cardPos.x, relativeY: cardPos.y };

    // Update container rect to trigger screen position calculation (only once per lender)
    // This is the ONLY place where containerRect should be set for card positioning
    setContainerRect(containerRect);
  }, [calculateCardPositionFromNode]);

  // When all filters are selected (e.g. animation phase 4), auto-show the first matching lender's card so it's visible
  useEffect(() => {
    if (!allFiltersSelected || selectedLender || !lenders.length) return;
    const firstMatch = lenders.find(
      (l) => (l.match_score ?? 0) > 0 && computeLenderScoreForGraphDisplay(l, formData) > 0
    );
    if (!firstMatch) return;
    setSelectedLender(firstMatch);
  }, [allFiltersSelected, lenders, formData, selectedLender]);

  // When selectedLender is set (e.g. from auto-select), ensure card position is set so the card is visible
  useEffect(() => {
    if (!selectedLender || !containerRef.current) return;
    const pos = lenderPositionsRef.current.get(selectedLender.lender_id);
    if (!pos) return;
    lastHoveredLenderIdRef.current = null;
    const rect = containerRef.current.getBoundingClientRect();
    const cardPos = calculateCardPositionFromNode(pos.x, pos.y, rect);
    cardPositionRef.current = { relativeX: cardPos.x, relativeY: cardPos.y };
    setContainerRect(rect);
  }, [selectedLender?.lender_id, calculateCardPositionFromNode]);

  // Find lender at mouse position
  const findLenderAtPosition = useCallback((x: number, y: number): LenderProfile | null => {
    const sortedLenders = [...lenders].sort((a, b) =>
      (lenderPositionsRef.current.get(a.lender_id)?.radius || 0) -
      (lenderPositionsRef.current.get(b.lender_id)?.radius || 0)
    );

    for (const lender of sortedLenders) {
      const pos = lenderPositionsRef.current.get(lender.lender_id);
      if (!pos) continue;
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (distance <= pos.radius + 3) {
        return lender;
      }
    }
    return null;
  }, [lenders]);

  // Handle lender selection logic
  const handleLenderSelection = useCallback((lender: LenderProfile | null) => {
    if (!lender) {
      setShowIncompleteFiltersCard(false);
      setSelectedLender(null);
      return;
    }

    if (allFiltersSelected && lender.match_score > 0) {
      setSelectedLender(lender);
      if (onLenderClick) onLenderClick(lender);
      setShowIncompleteFiltersCard(false);
    } else if (lender.match_score > 0) {
      setShowIncompleteFiltersCard(true);
      setSelectedLender(null);
    } else {
      setShowIncompleteFiltersCard(false);
      setSelectedLender(null);
    }
  }, [allFiltersSelected, onLenderClick]);

  // Optimized mouse move handler - only updates when lender changes, not on every pixel move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasSize.width || !canvasSize.height) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const foundLender = findLenderAtPosition(x, y);
    const foundLenderId = foundLender ? foundLender.lender_id : null;

    // Update cursor immediately (no throttling needed for cursor)
    canvas.style.cursor = foundLender ? "pointer" : "default";

    // CRITICAL: Only update state if lender CHANGED (not on every mouse pixel movement)
    // Use ref to compare to avoid unnecessary re-renders
    const currentHoveredId = hoveredLenderId;

    if (foundLenderId !== currentHoveredId) {
      // Lender changed - update everything
      setHoveredLenderId(foundLenderId);

      if (foundLender) {
        // Update card position ONLY when lender changes (fixed position relative to node)
        updateCardPositionForLender(foundLenderId);
        handleLenderSelection(foundLender);
      } else {
        // Clear when leaving lender
        lastHoveredLenderIdRef.current = null;
        handleLenderSelection(null);
      }
    }
    // If same lender - DO NOTHING (card stays in fixed position)
  }, [canvasSize, findLenderAtPosition, hoveredLenderId, updateCardPositionForLender, handleLenderSelection]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cardElement = document.querySelector(`[id^="lender-card-"]`);
    // Only keep card if mouse is moving to the card itself
    if (cardElement && e.relatedTarget && e.relatedTarget instanceof Node && cardElement.contains(e.relatedTarget)) {
      return;
    }
    // Clear pending updates
    pendingUpdateRef.current = null;
    lastHoveredLenderIdRef.current = null;
    // Clear everything when leaving canvas
    requestAnimationFrame(() => {
      setHoveredLenderId(null);
      setShowIncompleteFiltersCard(false);
      setSelectedLender(null);
      if (onLenderClick) onLenderClick(null);
      if (canvasRef.current) canvasRef.current.style.cursor = "default";
    });
  }, [onLenderClick]);

  const handleMouseDown = useCallback(() => { setIsMouseDown(true); }, []);
  const handleMouseUp = useCallback(() => { setIsMouseDown(false); }, []);

  const handleLenderClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedLender = findLenderAtPosition(x, y);

    if (clickedLender) {
      if (allFiltersSelected && clickedLender.match_score > 0) {
        setSelectedLender(prev => {
          const newSelection = prev?.lender_id === clickedLender?.lender_id ? null : clickedLender;
          if (onLenderClick) onLenderClick(newSelection);
          setShowIncompleteFiltersCard(false);
          return newSelection;
        });
      } else {
        handleLenderSelection(clickedLender);
      }
    } else {
      setSelectedLender(null);
      setShowIncompleteFiltersCard(false);
      if (onLenderClick) onLenderClick(null);
    }
  }, [findLenderAtPosition, allFiltersSelected, onLenderClick, handleLenderSelection]);

  // Calculate centered position for incomplete filters tooltip
  const tooltipCenterPosition = useMemo(() => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const containerRect = containerRef.current.getBoundingClientRect();
    // Center the tooltip on the canvas
    return {
      x: containerRect.left + canvasSize.width / 2,
      y: containerRect.top + canvasSize.height / 2,
    };
  }, [canvasSize.width, canvasSize.height]);

  // Memoize the incomplete filters tooltip to prevent unnecessary re-renders
  const incompleteFiltersTooltip = useMemo(() => {
    if (!mounted) return null;
    return createPortal(
      <div
        className="fixed z-[99999] p-3 bg-gray-800 text-gray-200 text-xs rounded-md shadow-xl pointer-events-none ring-1 ring-gray-600"
        style={{
          top: tooltipCenterPosition.y,
          left: tooltipCenterPosition.x,
          maxWidth: '230px',
          transform: 'translate(-50%, -50%)', // Center the tooltip
        }}
      >
        Please select criteria in all filter categories to view lender details and connect.
      </div>,
      document.body
    );
  }, [tooltipCenterPosition.x, tooltipCenterPosition.y, mounted]);

  // Memoize the lender color to prevent recalculation on every render
  const selectedLenderColor = useMemo(() => {
    if (!selectedLender) return '';
    return getLenderColor(selectedLender, formData, true, filtersApplied);
  }, [selectedLender, formData, filtersApplied]);

  // Memoize the close handler to prevent unnecessary re-renders
  const handleCloseCard = useCallback(() => {
    setSelectedLender(null);
    if (onLenderClick) onLenderClick(null);
  }, [onLenderClick]);

  return (
    <div className="h-full w-full flex relative z-0" ref={containerRef}>
      <div className="relative w-full h-full">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleLenderClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          style={{ display: 'block' }}
        />

        {selectedLender && allFiltersSelected && selectedLender.match_score > 0 && mounted &&
          createPortal(
            <div
              id={`lender-card-${selectedLender.lender_id}`}
              className="fixed z-[99999]"
              style={{
                top: cardScreenPosition.y,
                left: cardScreenPosition.x,
                pointerEvents: 'auto',
              }}
              onMouseLeave={(e) => {
                // If mouse leaves card and doesn't go to canvas, hide the card
                // Fix: Check if relatedTarget exists and is a Node before calling contains
                if (canvasRef.current && e.relatedTarget !== canvasRef.current &&
                  e.relatedTarget && e.relatedTarget instanceof Node &&
                  !canvasRef.current.contains(e.relatedTarget)) {
                  requestAnimationFrame(() => {
                    setSelectedLender(null);
                    if (onLenderClick) onLenderClick(null);
                  });
                }
              }}
            >
              <LenderDetailCard
                lender={selectedLender}
                formData={formData}
                onClose={handleCloseCard}
                color={selectedLenderColor}
              />
            </div>,
            document.body
          )
        }

        {showIncompleteFiltersCard && !allFiltersSelected && hoveredLenderId !== null &&
          (lenders.find(l => l.lender_id === hoveredLenderId)?.match_score ?? 0) > 0 &&
          incompleteFiltersTooltip}
      </div>
    </div>
  );
}
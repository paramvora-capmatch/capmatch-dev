// src/components/graph/LenderGraph.tsx
'use client';

import { LenderFilters } from "@/contexts/LenderContext";
import type React from "react";
import { useRef, useEffect, useState } from "react";
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
  return matchCount / activeUIFilterCategories.length;
}


function getLenderColor(
    lenderFromContext: LenderProfile,
    formDataForGraphDisplay: Partial<LenderFilters> | undefined,
    graphConsidersNodeActive: boolean, // If graph's UI filters make this node "active"
    filtersAreAppliedOnPage: boolean // If ANY filter is applied on the page (from props)
  ): string {
  
  // If no filters are applied on the page at all, all nodes are uniform gray.
  if (!filtersAreAppliedOnPage) {
    return "hsl(220, 10%, 70%)"; // Uniform gray
  }

  // If page has filters, but this specific node isn't considered active by graph's UI filters
  if (!graphConsidersNodeActive) {
    return "hsl(220, 10%, 70%)"; // Default gray for nodes not matching current graph UI selection
  }
  
  // Otherwise (filters are applied on page AND graph considers this node active),
  // color is based on the authoritative match_score from the context.
  const scoreFromContext = lenderFromContext.match_score || 0;
  if (scoreFromContext === 1) return "hsl(0, 100%, 50%)"; 
  if (scoreFromContext > 0.8) return "hsl(0, 90%, 60%)";  
  if (scoreFromContext > 0.6) return "hsl(20, 80%, 65%)"; 
  if (scoreFromContext > 0.4) return "hsl(30, 70%, 70%)"; 
  if (scoreFromContext > 0.2) return "hsl(40, 60%, 70%)"; 
  
  return "hsl(220, 10%, 70%)"; // Default gray for very low context scores even if "active"
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
  const cardPositionRef = useRef({ x: 0, y: 0 });

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
                          ? 8 + scoreFromContext * 8  // Active nodes scale with context score
                          : 6;                        // Inactive or default nodes are smaller
      
      const color = getLenderColor(lender, formData, isVisuallyActiveInGraph, filtersApplied);
      
      let distanceFactor;
      if (filtersApplied && isVisuallyActiveInGraph) {
        // Position active nodes by their context_score (closer to center for higher scores)
        distanceFactor = 0.3 + (1 - scoreFromContext) * 0.6;
      } else {
        // Default state (no filters applied on page OR node not visually active in graph):
        // Push to periphery. Slightly vary by context_score to avoid perfect circle for already scored lenders.
        distanceFactor = 0.85 + (1 - scoreFromContext * 0.2) * 0.10;
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
        if (ctx) ctx.clearRect(0,0, canvasSize.width || 0, canvasSize.height || 0);
        return;
    }
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      const activePositions: Array<{ x: number, y: number, color: string, score: number }> = [];
      const maxRadius = Math.min(canvasSize.width, canvasSize.height) * 0.45;

      // Concentric circles (background)
      ctx.strokeStyle = "rgba(200, 200, 230, 0.1)";
      ctx.lineWidth = 0.4;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(centerPoint.x, centerPoint.y, (maxRadius / 5) * (i + 1) + (Math.sin(time / 2000 + i) * 3), 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Draw lines between active nodes first (so they are in the background)
      lenderPositionsRef.current.forEach(pos => {
        if (pos.isVisuallyActiveInGraph) {
            activePositions.push({ x: pos.x, y: pos.y, color: pos.color, score: pos.scoreFromContext });
        }
      });

      ctx.save();
      for(let i = 0; i < activePositions.length; i++) {
        for (let j = i + 1; j < activePositions.length; j++) {
            const pos1 = activePositions[i];
            const pos2 = activePositions[j];
            const avgScore = (pos1.score + pos2.score) / 2;
            
            ctx.beginPath();
            ctx.moveTo(pos1.x, pos1.y);
            ctx.lineTo(pos2.x, pos2.y);
            
            // Make brighter, more solid lines for higher average scores
            const opacity = 0.1 + (avgScore * 0.4);
            const lightness = 60 + (avgScore * 20);
            
            ctx.strokeStyle = `hsla(220, 80%, ${lightness}%, ${opacity})`;
            ctx.lineWidth = 0.5 + avgScore;
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

        // Draw connecting lines only if page filters are applied AND node is visually active in graph
        if (filtersApplied && isVisuallyActiveInGraph) {
          let gradient;
          // Color lines based on context score
          if (scoreFromContext === 1) { gradient = ctx.createLinearGradient(centerPoint.x, centerPoint.y, pos.x, pos.y); gradient.addColorStop(0, "rgba(255, 0, 0, 0.45)"); gradient.addColorStop(1, "rgba(255, 0, 0, 0.2)");
          } else if (scoreFromContext > 0.8) { gradient = ctx.createLinearGradient(centerPoint.x, centerPoint.y, pos.x, pos.y); gradient.addColorStop(0, "rgba(255, 60, 60, 0.35)"); gradient.addColorStop(1, "rgba(255, 60, 60, 0.12)");
          } else if (scoreFromContext > 0.6) { gradient = ctx.createLinearGradient(centerPoint.x, centerPoint.y, pos.x, pos.y); gradient.addColorStop(0, "rgba(255, 120, 60, 0.25)"); gradient.addColorStop(1, "rgba(255, 120, 60, 0.08)");
          } else { gradient = ctx.createLinearGradient(centerPoint.x, centerPoint.y, pos.x, pos.y); gradient.addColorStop(0, "rgba(180, 190, 210, 0.12)"); gradient.addColorStop(1, "rgba(180, 190, 210, 0.04)");
          }
          ctx.beginPath();
          ctx.moveTo(centerPoint.x, centerPoint.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 0.4 + scoreFromContext * 1.3; 
          ctx.stroke();

          // Particles along lines for active, high-scoring nodes
          if (scoreFromContext > 0.65 && Math.random() < 0.018 * scoreFromContext) {
            const t = Math.random();
            addParticles(centerPoint.x + (pos.x - centerPoint.x) * t, centerPoint.y + (pos.y - centerPoint.y) * t, pos.color, 1, 0.7);
          }
        }
        
        const moveSpeed = 0.075; 
        pos.x += (pos.targetX - pos.x) * moveSpeed;
        pos.y += (pos.targetY - pos.y) * moveSpeed;
        
        // Particles at node position for active, mid-to-high scoring nodes
        if (filtersApplied && isVisuallyActiveInGraph && scoreFromContext > 0.55 && Math.random() < 0.012 * scoreFromContext) {
          addParticles(pos.x, pos.y, pos.color, 1, 0.6);
        }

        // Pulsing effect for active nodes
        const pulse = pos.isVisuallyActiveInGraph ? Math.sin(time / 300 + lender_id) * 1.5 : 0;
        const finalRadius = pos.radius + pulse;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, finalRadius, 0, 2 * Math.PI);
        ctx.fillStyle = pos.color;
        ctx.fill();

        if (hoveredLenderId === lender_id) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();
          addParticles(pos.x, pos.y, pos.color, 1, 1.2);
        }

        // Highlight selected/hovered
        if (selectedLender?.lender_id === lender_id) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.82)"; 
          ctx.lineWidth = 1.9; ctx.stroke();
        } else if (hoveredLenderId === lender_id) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.52)";
          ctx.lineWidth = 1.3; ctx.stroke();
        }

        // Node initial (text)
        // Show initials only if filters are applied AND node is visually active AND has a decent score
        if (filtersApplied && isVisuallyActiveInGraph && finalRadius > 9 && scoreFromContext > 0.22) { 
          const lenderDetails = lenders.find(l => l.lender_id === lender_id);
          const initial = lenderDetails?.name.charAt(0).toUpperCase() || "L";
          ctx.fillStyle = "rgba(255, 255, 255, 0.78)"; 
          ctx.font = `bold ${Math.floor(finalRadius * 0.78)}px Arial, sans-serif`; 
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(initial, pos.x, pos.y + 0.5); 
        }
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(animationRef.current); };
  }, [lenders, canvasSize, selectedLender, hoveredLenderId, centerPoint, filtersApplied, formData]);

  // Mouse event handlers (handleMouseMove, handleMouseLeave, handleMouseDown, handleMouseUp, handleLenderClick)
  // remain largely the same as your provided "working older version",
  // as their core logic for interaction is sound.
  // The key is that the drawing loop now correctly uses `filtersApplied` for the initial state.

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !canvasSize.width || !canvasSize.height) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let foundLender: LenderProfile | null = null;

    const sortedLenders = [...lenders].sort((a,b) => (lenderPositionsRef.current.get(a.lender_id)?.radius || 0) - (lenderPositionsRef.current.get(b.lender_id)?.radius || 0));

    for (const lender of sortedLenders) {
        const pos = lenderPositionsRef.current.get(lender.lender_id);
        if (!pos) continue;
        const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
        if (distance <= pos.radius + 3) { 
            foundLender = lender;
            break; 
        }
    }
    
    canvas.style.cursor = foundLender ? "pointer" : "default";
    setHoveredLenderId(foundLender ? foundLender.lender_id : null);

    if (foundLender) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const relativeX = e.clientX - containerRect.left;
        const relativeY = e.clientY - containerRect.top;
        const cardWidth = 320; const cardHeight = 380; 
        let cardX = relativeX + 20; let cardY = relativeY - 20;

        if (cardX + cardWidth > canvasSize.width -10) cardX = relativeX - cardWidth - 20;
        if (cardY + cardHeight > canvasSize.height -10) cardY = canvasSize.height - cardHeight -10;
        if (cardY < 10) cardY = 10; 
        
        cardX = Math.max(5, Math.min(cardX, canvasSize.width - cardWidth - 5));
        cardY = Math.max(5, Math.min(cardY, canvasSize.height - cardHeight - 5));
        cardPositionRef.current = { x: cardX, y: cardY };
        
        if (allFiltersSelected && foundLender.match_score > 0) { 
          setSelectedLender(foundLender);
          if (onLenderClick) onLenderClick(foundLender);
        } else if (foundLender.match_score > 0) { 
          setShowIncompleteFiltersCard(true);
          setSelectedLender(null); 
        } else { 
          setShowIncompleteFiltersCard(false);
          setSelectedLender(null);
        }
      }
    } else {
      setShowIncompleteFiltersCard(false);
      if (!isMouseDown) {
        const card = document.getElementById(`lender-card-${selectedLender?.lender_id}`);
        if (card && e.target !== card && !card.contains(e.target as Node)) {
            //setSelectedLender(null); // Potentially too aggressive
        } else if (!card) {
             //setSelectedLender(null); // If no card was shown
        }
      }
    }
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLCanvasElement>) {
    if (selectedLender && containerRef.current) {
        const cardElement = document.querySelector(`[id^="lender-card-"]`); 
        if (cardElement && cardElement.contains(e.relatedTarget as Node)) {
            return;
        }
    }
    setHoveredLenderId(null);
    setShowIncompleteFiltersCard(false);
    if (!isMouseDown) {
      // if (onLenderClick) onLenderClick(null); // Don't clear on mouse leave from canvas
    }
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }

  function handleMouseDown() { setIsMouseDown(true); }
  function handleMouseUp() { setIsMouseDown(false); }

  function handleLenderClick(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let clickedLender: LenderProfile | null = null;

    const sortedLenders = [...lenders].sort((a,b) => (lenderPositionsRef.current.get(a.lender_id)?.radius || 0) - (lenderPositionsRef.current.get(b.lender_id)?.radius || 0));
    for (const lender of sortedLenders) {
        const pos = lenderPositionsRef.current.get(lender.lender_id);
        if (!pos) continue;
        const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
        if (distance <= pos.radius + 3) { clickedLender = lender; break; }
    }
    
    if (clickedLender) {
        if (allFiltersSelected && clickedLender.match_score > 0) {
            setSelectedLender(prev => {
                const newSelection = prev?.lender_id === clickedLender?.lender_id ? null : clickedLender;
                if (onLenderClick) onLenderClick(newSelection);
                setShowIncompleteFiltersCard(false);
                return newSelection;
            });
        } else if (clickedLender.match_score > 0) {
            setShowIncompleteFiltersCard(true);
            setSelectedLender(null); 
        } else { 
            setSelectedLender(null); 
            setShowIncompleteFiltersCard(false);
            if (onLenderClick) onLenderClick(null);
        }
    } else { 
        setSelectedLender(null);
        setShowIncompleteFiltersCard(false);
        if (onLenderClick) onLenderClick(null);
    }
  }

  const incompleteFiltersTooltip = (
    <div
      className="absolute z-20 p-3 bg-gray-700 text-white text-xs rounded-md shadow-xl pointer-events-none ring-1 ring-gray-600"
      style={{
        top: cardPositionRef.current.y - 10, 
        left: cardPositionRef.current.x + 10,
        maxWidth: '230px',
        transform: 'translateY(-100%)', 
      }}
    >
      Please select criteria in all filter categories to view lender details and connect.
    </div>
  );

  return (
    <div className="h-full w-full flex" ref={containerRef}>
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

        {selectedLender && allFiltersSelected && selectedLender.match_score > 0 && (
          <div
            id={`lender-card-${selectedLender.lender_id}`}
            className="absolute z-10"
            style={{
              top: cardPositionRef.current.y,
              left: cardPositionRef.current.x,
            }}
            onMouseLeave={(e) => {
                 if (canvasRef.current && e.relatedTarget !== canvasRef.current && !canvasRef.current.contains(e.relatedTarget as Node)) {
                    // setSelectedLender(null); // Do not clear on mouse leave from card
                    // if (onLenderClick) onLenderClick(null);
                 }
            }}
          >
            <LenderDetailCard
              lender={selectedLender}
              formData={formData}
              onClose={() => {setSelectedLender(null); if (onLenderClick) onLenderClick(null);}}
              color={getLenderColor(selectedLender, formData, true, filtersApplied)}
            />
          </div>
        )}

        {showIncompleteFiltersCard && !allFiltersSelected && hoveredLenderId !== null && 
         (lenders.find(l => l.lender_id === hoveredLenderId)?.match_score ?? 0) > 0 &&
         incompleteFiltersTooltip}
      </div>
    </div>
  );
}
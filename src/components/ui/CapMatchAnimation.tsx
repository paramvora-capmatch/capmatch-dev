'use client';

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Banknote, 
  TrendingUp, 
  Calculator, 
  PieChart,
  BarChart3,
  Wallet,
  Building2,
  Home,
  Building,
  Factory,
  Store,
  Warehouse,
  MapPin,
  TreePine,
  type LucideIcon,
} from 'lucide-react';

// Finance / lender deal cards (left side)
const financeCards = [
  { icon: DollarSign, label1: 'Bridge Loan', label2: '$12M' },
  { icon: CreditCard, label1: 'CMBS', label2: '$25M' },
  { icon: Banknote, label1: 'Perm Debt', label2: '$8M' },
  { icon: TrendingUp, label1: 'Mezz Debt', label2: '$4.5M' },
  { icon: Calculator, label1: 'Construction', label2: '$18M' },
  { icon: PieChart, label1: 'Equity', label2: '$6M' },
  { icon: BarChart3, label1: 'HUD/FHA', label2: '$15M' },
  { icon: Wallet, label1: 'SBA 504', label2: '$3M' },
];

// Real estate / asset cards (right side)
const realEstateCards = [
  { icon: Building2, label1: 'Multifamily', label2: '240 Units' },
  { icon: Home, label1: 'Single Family', label2: '12 Homes' },
  { icon: Building, label1: 'Office', label2: '85K SF' },
  { icon: Factory, label1: 'Industrial', label2: '120K SF' },
  { icon: Store, label1: 'Retail', label2: '45K SF' },
  { icon: Warehouse, label1: 'Self-Storage', label2: '350 Units' },
  { icon: MapPin, label1: 'Mixed-Use', label2: '60K SF' },
  { icon: TreePine, label1: 'Land', label2: '15 Acres' },
];

interface AnimationState {
  leftIconIndex: number;
  rightIconIndex: number;
  leftIconPosition: { x: number; y: number };
  rightIconPosition: { x: number; y: number };
  leftStartY: number;
  rightStartY: number;
  showConnection: boolean;
  connectionComplete: boolean;
  phase: 'idle' | 'moving-to-center' | 'moving-horizontal' | 'connecting' | 'connected' | 'resetting';
}

interface CapMatchAnimationProps {
  /** Scale the animation size (0–1). e.g. 0.4 = 40% size. Default 1. */
  sizeRatio?: number;
}

// ── Mini Deal Card component ──
function DealCard({
  Icon,
  label1,
  label2,
  color,
  iconSize,
  compact,
  className = '',
}: {
  Icon: LucideIcon;
  label1: string;
  label2: string;
  color: 'green' | 'blue';
  iconSize: number;
  compact?: boolean;
  className?: string;
}) {
  const iconColor = color === 'green' ? 'text-green-500' : 'text-blue-500';
  const iconBg = color === 'green' ? 'bg-green-50' : 'bg-blue-50';

  return (
    <div
      className={`flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-sm px-2.5 py-1.5 ${className}`}
    >
      <div className={`shrink-0 flex items-center justify-center rounded-md ${iconBg} ${iconColor}`}
        style={{ width: `${iconSize + 8}px`, height: `${iconSize + 8}px` }}
      >
        <Icon size={iconSize} strokeWidth={1.8} />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="text-[10px] leading-tight font-medium text-gray-800 truncate">{label1}</div>
          <div className="text-[9px] leading-tight text-gray-500 truncate">{label2}</div>
        </div>
      )}
    </div>
  );
}

// Column x-positions (percentage)
const LEFT_COL = 14;
const RIGHT_COL = 86;
// Where animated cards meet in the middle
const MEET_LEFT = 33;
const MEET_RIGHT = 67;

export function CapMatchAnimation({ sizeRatio = 1 }: CapMatchAnimationProps) {
  const [animationState, setAnimationState] = useState<AnimationState>({
    leftIconIndex: 0,
    rightIconIndex: 0,
    leftIconPosition: { x: LEFT_COL, y: 20 },
    rightIconPosition: { x: RIGHT_COL, y: 80 },
    leftStartY: 20,
    rightStartY: 80,
    showConnection: false,
    connectionComplete: false,
    phase: 'idle',
  });

  const [lineDrawn, setLineDrawn] = useState(false);

  useEffect(() => {
    const runAnimation = () => {
      const leftIndex = Math.floor(Math.random() * financeCards.length);
      const rightIndex = Math.floor(Math.random() * realEstateCards.length);
      const leftStartY = 15 + Math.random() * 70;
      const rightStartY = 15 + Math.random() * 70;

      setAnimationState(prev => ({
        ...prev,
        leftIconIndex: leftIndex,
        rightIconIndex: rightIndex,
        leftStartY,
        rightStartY,
        leftIconPosition: { x: LEFT_COL, y: leftStartY },
        rightIconPosition: { x: RIGHT_COL, y: rightStartY },
        phase: 'moving-to-center',
        showConnection: false,
        connectionComplete: false,
      }));

      // Move to center Y
      setTimeout(() => {
        setAnimationState(prev => ({
          ...prev,
          leftIconPosition: { x: LEFT_COL, y: 50 },
          rightIconPosition: { x: RIGHT_COL, y: 50 },
        }));
      }, 100);

      // Move horizontally toward each other
      setTimeout(() => {
        setAnimationState(prev => ({
          ...prev,
          phase: 'moving-horizontal',
          leftIconPosition: { x: MEET_LEFT, y: 50 },
          rightIconPosition: { x: MEET_RIGHT, y: 50 },
        }));
      }, 1200);

      // Show connection line
      setTimeout(() => {
        setAnimationState(prev => ({
          ...prev,
          phase: 'connecting',
          showConnection: true,
        }));
      }, 2200);

      // Complete connection (turn green)
      setTimeout(() => {
        setAnimationState(prev => ({
          ...prev,
          phase: 'connected',
          connectionComplete: true,
        }));
      }, 3200);

      // Reset
      setTimeout(() => {
        setAnimationState(prev => ({
          ...prev,
          phase: 'resetting',
          leftIconPosition: { x: LEFT_COL, y: prev.leftStartY },
          rightIconPosition: { x: RIGHT_COL, y: prev.rightStartY },
          showConnection: false,
          connectionComplete: false,
        }));
      }, 4200);

      // Idle
      setTimeout(() => {
        setAnimationState(prev => ({ ...prev, phase: 'idle' }));
      }, 4700);
    };

    const interval = setInterval(runAnimation, 5000);
    runAnimation();
    return () => clearInterval(interval);
  }, []);

  // Progressive line drawing
  useEffect(() => {
    if (animationState.phase === 'connecting') {
      setLineDrawn(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setLineDrawn(true));
      });
    } else if (animationState.phase === 'resetting' || animationState.phase === 'idle') {
      setLineDrawn(false);
    }
  }, [animationState.phase]);

  const leftCard = financeCards[animationState.leftIconIndex];
  const rightCard = realEstateCards[animationState.rightIconIndex];

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  // Container height
  const containerHeight = sizeRatio < 0.6 ? 340 : Math.round(560 * sizeRatio);

  useLayoutEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.getBoundingClientRect().width);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Sizing
  const h = containerHeight;
  const verticalPad = 12;
  const usableHeight = h - verticalPad * 2;
  const staticIconSize = Math.max(14, Math.min(Math.round(usableHeight / 12), 18));
  const staticCardGap = Math.max(4, Math.round((usableHeight - 32 * 8) / 7));

  // Animated card dimensions
  const animatedCardWidth = Math.max(120, Math.min(Math.round(containerWidth * 0.18), 180));
  const animatedCardHeight = Math.max(40, Math.round(animatedCardWidth * 0.4));
  const animatedIconSize = Math.round(animatedCardHeight * 0.45);

  // Line offset: half the animated card width
  const halfCardWidth = animatedCardWidth / 2;

  return (
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden"
      style={{ height: `${containerHeight}px` }}
    >
      {/* Static left column — deal cards */}
      <div
        className="absolute flex flex-col items-end"
        style={{
          left: `${LEFT_COL}%`,
          transform: 'translateX(-50%)',
          gap: `${staticCardGap}px`,
          top: `${verticalPad}px`,
          bottom: `${verticalPad}px`,
          justifyContent: 'center',
        }}
      >
        {financeCards.map((card, index) => (
          <div
            key={`static-left-${index}`}
            className={`transition-opacity duration-300 ${
              index === animationState.leftIconIndex && animationState.phase !== 'idle' ? 'opacity-0' : 'opacity-50'
            }`}
          >
            <DealCard
              Icon={card.icon}
              label1={card.label1}
              label2={card.label2}
              color="green"
              iconSize={staticIconSize}
            />
          </div>
        ))}
      </div>

      {/* Static right column — deal cards */}
      <div
        className="absolute flex flex-col items-start"
        style={{
          left: `${RIGHT_COL}%`,
          transform: 'translateX(-50%)',
          gap: `${staticCardGap}px`,
          top: `${verticalPad}px`,
          bottom: `${verticalPad}px`,
          justifyContent: 'center',
        }}
      >
        {realEstateCards.map((card, index) => (
          <div
            key={`static-right-${index}`}
            className={`transition-opacity duration-300 ${
              index === animationState.rightIconIndex && animationState.phase !== 'idle' ? 'opacity-0' : 'opacity-50'
            }`}
          >
            <DealCard
              Icon={card.icon}
              label1={card.label1}
              label2={card.label2}
              color="blue"
              iconSize={staticIconSize}
            />
          </div>
        ))}
      </div>

      {/* Connection Line */}
      {animationState.showConnection && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: `${MEET_LEFT}%`,
            right: `${100 - MEET_RIGHT}%`,
            transform: 'translateY(-50%)',
            paddingLeft: `${halfCardWidth}px`,
            paddingRight: `${halfCardWidth}px`,
          }}
        >
          <div
            className="h-[2.5px] rounded-full"
            style={{
              backgroundColor: animationState.connectionComplete ? '#10b981' : '#3b82f6',
              transform: `scaleX(${lineDrawn ? 1 : 0})`,
              transformOrigin: 'left center',
              transition: 'transform 0.8s ease-in-out, background-color 0.5s',
            }}
          />
        </div>
      )}

      {/* Animated left deal card */}
      <div
        className={`absolute transition-all duration-1000 ease-in-out -translate-x-1/2 -translate-y-1/2 ${
          animationState.phase === 'connected' ? 'scale-105' : ''
        }`}
        style={{
          left: `${animationState.leftIconPosition.x}%`,
          top: `${animationState.leftIconPosition.y}%`,
          opacity: animationState.phase === 'idle' ? 0 : 1,
        }}
      >
        <div
          className={`flex items-center gap-2.5 bg-white border-2 rounded-xl shadow-md px-3 py-2 transition-all duration-500 ${
            animationState.connectionComplete
              ? 'border-green-400 shadow-green-100'
              : animationState.showConnection
                ? 'border-green-300 shadow-green-50'
                : 'border-gray-200'
          }`}
          style={{ width: `${animatedCardWidth}px`, height: `${animatedCardHeight}px` }}
        >
          <div className={`shrink-0 flex items-center justify-center rounded-lg transition-colors duration-500 ${
            animationState.connectionComplete ? 'bg-green-100' : 'bg-green-50'
          }`}
            style={{ width: `${animatedIconSize + 10}px`, height: `${animatedIconSize + 10}px` }}
          >
            <leftCard.icon size={animatedIconSize} strokeWidth={1.8} className="text-green-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-gray-800 truncate">{leftCard.label1}</div>
            <div className="text-[10px] text-gray-500 truncate">{leftCard.label2}</div>
          </div>
        </div>
      </div>

      {/* Animated right deal card */}
      <div
        className={`absolute transition-all duration-1000 ease-in-out -translate-x-1/2 -translate-y-1/2 ${
          animationState.connectionComplete ? 'scale-105' : ''
        }`}
        style={{
          left: `${animationState.rightIconPosition.x}%`,
          top: `${animationState.rightIconPosition.y}%`,
          opacity: animationState.phase === 'idle' ? 0 : 1,
        }}
      >
        <div
          className={`flex items-center gap-2.5 bg-white border-2 rounded-xl shadow-md px-3 py-2 transition-all duration-500 ${
            animationState.connectionComplete
              ? 'border-green-400 shadow-green-100'
              : animationState.showConnection
                ? 'border-blue-300 shadow-blue-50'
                : 'border-gray-200'
          }`}
          style={{ width: `${animatedCardWidth}px`, height: `${animatedCardHeight}px` }}
        >
          <div className={`shrink-0 flex items-center justify-center rounded-lg transition-colors duration-500 ${
            animationState.connectionComplete ? 'bg-green-100' : 'bg-blue-50'
          }`}
            style={{ width: `${animatedIconSize + 10}px`, height: `${animatedIconSize + 10}px` }}
          >
            <rightCard.icon
              size={animatedIconSize}
              strokeWidth={1.8}
              className={`transition-colors duration-500 ${
                animationState.connectionComplete ? 'text-green-500' : 'text-blue-500'
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-gray-800 truncate">{rightCard.label1}</div>
            <div className="text-[10px] text-gray-500 truncate">{rightCard.label2}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

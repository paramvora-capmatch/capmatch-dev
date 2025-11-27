// src/components/ui/ProcessGraphics.tsx
'use client';

import React, { useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Users, FileText, BarChart3, Zap, Search, Eye, Link2, CheckSquare, FileJson, FileSpreadsheet, Database, BrainCircuit, Shuffle } from 'lucide-react';
import { cn } from '@/utils/cn';

// Enhanced color palette with proper opacity values
const COLORS = {
  PRIMARY_BLUE: "#3b82f6",
  LIGHT_BLUE: "#60a5fa",
  VERY_LIGHT_BLUE: "rgba(191, 219, 254, 0.8)",
  FADED_BLUE: "rgba(59, 130, 246, 0.2)",
  PRIMARY_GREEN: "#10b981",
  LIGHT_GREEN: "#34d399",
  VERY_LIGHT_GREEN: "rgba(167, 243, 208, 0.8)",
  FADED_GREEN: "rgba(16, 185, 129, 0.15)",
  DARK_GREY: "#4b5563",
  MEDIUM_GREY: "#9ca3af",
  LIGHT_GREY: "rgba(209, 213, 219, 0.6)",
  WHITE: "#ffffff",
  SOFT_WHITE: "rgba(255, 255, 255, 0.9)",
  BLUE_GLOW: "rgba(59, 130, 246, 0.3)",
  GREEN_GLOW: "rgba(16, 185, 129, 0.25)",
  GRID_LINE: "rgba(209, 213, 219, 0.07)",
  BG_GRADIENT_START: "rgba(15, 23, 42, 0.7)",
  BG_GRADIENT_END: "rgba(15, 23, 42, 0.95)",
};

// Variants for different animation components
const centerIconVariants = {
  hidden: { 
    scale: 0.5, 
    opacity: 0 
  },
  visible: (delay: number) => ({ 
    scale: 1, 
    opacity: 1, 
    transition: { 
      type: 'spring', 
      stiffness: 100, 
      damping: 15, 
      delay 
    } 
  })
};

const nodeIconVariants = {
  hidden: { 
    scale: 0.5, 
    opacity: 0, 
    y: 10 
  },
  visible: (delay: number) => ({ 
    scale: 1, 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: 'spring', 
      stiffness: 120, 
      damping: 15, 
      delay 
    } 
  }),
  hover: { 
    scale: 1.1, 
    transition: { duration: 0.2 } 
  }
};

const lineDrawVariants = {
  hidden: { 
    pathLength: 0, 
    opacity: 0 
  },
  visible: (delay: number) => ({ 
    pathLength: 1, 
    opacity: 1, 
    transition: { 
      pathLength: { 
        delay, 
        type: 'spring', 
        duration: 1.5, 
        bounce: 0 
      }, 
      opacity: { 
        delay, 
        duration: 0.3 
      } 
    } 
  })
};

const labelVariants = {
  hidden: { 
    opacity: 0, 
    y: 10 
  },
  visible: (delay: number) => ({ 
    opacity: 1, 
    y: 0, 
    transition: { 
      delay, 
      duration: 0.5 
    } 
  })
};

const pulseVariants = {
  hidden: { 
    opacity: 0, 
    scale: 1 
  },
  visible: (delay: number) => ({ 
    opacity: [0.2, 0.4, 0.2], 
    scale: [1, 1.15, 1], 
    transition: { 
      delay, 
      duration: 3, 
      repeat: Infinity, 
      ease: "easeInOut" 
    } 
  })
};

// Central icon component with enhanced styling
const CentralIcon: React.FC<{
  x: number,
  y: number,
  size: number,
  Icon: React.ElementType,
  color: string,
  glowColor: string,
  label?: string,
  delay?: number
}> = ({ x, y, size, Icon, color, glowColor, label, delay = 0 }) => {
  return (
    <>
      {/* Glow effect */}
      <motion.circle 
        cx={x} 
        cy={y} 
        r={size * 1.2} 
        fill={glowColor}
        variants={centerIconVariants}
        custom={delay}
        initial="hidden"
        animate="visible"
      />
      
      {/* Main circle background */}
      <motion.circle 
        cx={x} 
        cy={y} 
        r={size} 
        fill={color}
        variants={centerIconVariants}
        custom={delay + 0.1}
        initial="hidden"
        animate="visible"
      />
      
      {/* Icon */}
      <motion.g 
        variants={centerIconVariants}
        custom={delay + 0.3}
        initial="hidden"
        animate="visible"
      >
        <foreignObject
          x={x - size/2}
          y={y - size/2}
          width={size}
          height={size}
          className="process-graphic-icon"
        >
          <div className="w-full h-full flex items-center justify-center">
            <Icon size={size * 0.6} />
          </div>
        </foreignObject>
      </motion.g>
      
      {/* Label - will be styled via CSS class */}
      {label && (
        <motion.text
          x={x}
          y={y + size + 20}
          textAnchor="middle"
          fontSize="14"
          className="process-graphic-label"
          fontWeight="600"
          variants={labelVariants}
          custom={delay + 0.5}
          initial="hidden"
          animate="visible"
        >
          {label}
        </motion.text>
      )}
      
      {/* Pulse effect */}
      <motion.circle
        cx={x}
        cy={y}
        r={size}
        fill="transparent"
        stroke={color}
        strokeWidth="2"
        variants={pulseVariants}
        custom={delay + 0.6}
        initial="hidden"
        animate="visible"
      />
    </>
  );
};

// Satellite node component
const NodeIcon: React.FC<{
  x: number,
  y: number,
  size: number,
  Icon: React.ElementType,
  color: string,
  glowColor: string,
  label?: string,
  delay?: number
}> = ({ x, y, size, Icon, color, glowColor, label, delay = 0 }) => {
  return (
    <>
      {/* Glow */}
      <motion.circle 
        cx={x} 
        cy={y} 
        r={size * 1.2} 
        fill={glowColor}
        variants={nodeIconVariants}
        custom={delay}
        initial="hidden"
        animate="visible"
        whileHover="hover"
      />
      
      {/* Main circle */}
      <motion.circle 
        cx={x} 
        cy={y} 
        r={size} 
        fill={color}
        variants={nodeIconVariants}
        custom={delay + 0.1}
        initial="hidden"
        animate="visible"
        whileHover="hover"
      />
      
      {/* Icon */}
      <motion.g 
        variants={nodeIconVariants}
        custom={delay + 0.2}
        initial="hidden"
        animate="visible"
      >
        <foreignObject
          x={x - size/2}
          y={y - size/2}
          width={size}
          height={size}
          className="process-graphic-icon"
        >
          <div className="w-full h-full flex items-center justify-center">
            <Icon size={size * 0.6} />
          </div>
        </foreignObject>
      </motion.g>
      
      {/* Label - will be styled via CSS class */}
      {label && (
        <motion.text
          x={x}
          y={y + size + 15}
          textAnchor="middle"
          fontSize="12"
          className="process-graphic-label"
          fontWeight="500"
          variants={labelVariants}
          custom={delay + 0.4}
          initial="hidden"
          animate="visible"
        >
          {label}
        </motion.text>
      )}
      
      {/* Subtle pulse effect */}
      <motion.circle
        cx={x}
        cy={y}
        r={size}
        fill="transparent"
        stroke={color}
        strokeWidth="1.5"
        variants={pulseVariants}
        custom={delay + 0.5}
        initial="hidden"
        animate="visible"
      />
    </>
  );
};

// Component for animated flowing particles along a line
const FlowingParticle: React.FC<{
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  size?: number,
  delay?: number,
  duration?: number,
  reverse?: boolean
}> = ({ startX, startY, endX, endY, color, size = 2, delay = 0, duration = 2, reverse = false }) => {
  const pathRef = useRef<SVGPathElement>(null);
  const controls = useAnimation();
  const [isReady, setIsReady] = React.useState(false);
  
  // Initialize animation state
  React.useEffect(() => {
    const initAnimation = async () => {
      try {
        // Set initial state
        await controls.set({
          offsetDistance: reverse ? "100%" : "0%",
          opacity: 0
        });
        
        // Wait for the delay
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
        
        // Mark as ready for animation
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing animation:', error);
      }
    };

    initAnimation();
  }, [controls, delay, reverse]);

  // Handle animation after initialization
  React.useEffect(() => {
    if (!isReady) return;

    const startAnimation = async () => {
      try {
        await controls.start({
          offsetDistance: reverse ? "0%" : "100%",
          opacity: 1,
          transition: {
            offsetDistance: {
              duration,
              repeat: Infinity,
              ease: "linear"
            },
            opacity: {
              duration: 0.3
            }
          }
        });
      } catch (error) {
        console.error('Error starting animation:', error);
      }
    };

    startAnimation();
  }, [controls, duration, reverse, isReady]);

  return (
    <>
      {/* Hidden path for the particle to follow */}
      <path
        ref={pathRef}
        d={`M ${startX} ${startY} L ${endX} ${endY}`}
        stroke="transparent"
        fill="none"
        id={`particle-path-${startX}-${startY}-${endX}-${endY}`}
      />
      
      {/* The particle that follows the path */}
      <motion.circle
        cx={0}
        cy={0}
        r={size}
        fill={color}
        style={{ 
          offsetPath: `path('M ${startX} ${startY} L ${endX} ${endY}')`
        }}
        animate={controls}
      />
    </>
  );
};

// Enhanced animated connection line with flow effect
const AnimatedConnectionLine: React.FC<{
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  particleColor?: string,
  delay?: number,
  numParticles?: number,
  startRadius?: number,
  endRadius?: number,
}> = ({ 
  startX, 
  startY, 
  endX, 
  endY, 
  color, 
  particleColor, 
  delay = 0,
  numParticles = 3,
  startRadius = 0,
  endRadius = 0,
}) => {
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.max(Math.hypot(dx, dy), 0.0001);
  const ux = dx / length;
  const uy = dy / length;
  const adjustedStartX = startX + ux * startRadius;
  const adjustedStartY = startY + uy * startRadius;
  const adjustedEndX = endX - ux * endRadius;
  const adjustedEndY = endY - uy * endRadius;

  // Create an array of particles with staggered delays
  const particles = Array.from({ length: numParticles }, (_, i) => ({
    id: `p-${startX}-${startY}-${endX}-${endY}-${i}`,
    delay: delay + 0.5 + (i * 0.8),
    duration: 3 + Math.random(),
    reverse: i % 2 === 0
  }));

  return (
    <>
      {/* The main connection line */}
      <motion.line
        x1={adjustedStartX}
        y1={adjustedStartY}
        x2={adjustedEndX}
        y2={adjustedEndY}
        stroke={color}
        strokeWidth="1.5"
        strokeOpacity="0.7"
        variants={lineDrawVariants}
        custom={delay}
        initial="hidden"
        animate="visible"
      />
      
      {/* Flowing particles along the line */}
      {particles.map((particle) => (
        <FlowingParticle
          key={particle.id}
          startX={adjustedStartX}
          startY={adjustedStartY}
          endX={adjustedEndX}
          endY={adjustedEndY}
          color={particleColor || color}
          size={2}
          delay={particle.delay}
          duration={particle.duration}
          reverse={particle.reverse}
        />
      ))}
    </>
  );
};

// Enhanced container with better sizing and backdrop
const GraphicContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <svg 
        viewBox="0 0 500 400" 
        className="w-full h-full max-w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Glow filter for better visual effects */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Grid lines for visual interest */}
        <g opacity="0.05">
          {Array.from({ length: 20 }).map((_, i) => (
            <line 
              key={`grid-h-${i}`} 
              x1="0" 
              y1={i * 20} 
              x2="500" 
              y2={i * 20} 
              stroke="rgba(156, 163, 175, 0.15)" 
              strokeWidth="1" 
            />
          ))}
          {Array.from({ length: 25 }).map((_, i) => (
            <line 
              key={`grid-v-${i}`} 
              x1={i * 20} 
              y1="0" 
              x2={i * 20} 
              y2="400" 
              stroke="rgba(156, 163, 175, 0.15)" 
              strokeWidth="1" 
            />
          ))}
        </g>
        
        {children}
      </svg>
    </div>
  );
};

// LenderMatchingGraphic with improved node placement and animations
const LenderMatchingGraphic: React.FC = () => {
  // Center coordinates
  const centerX = 250;
  const centerY = 200;
  
  // Node definitions with proper positioning
  const nodes = [
    { 
      x: 120, y: 100, Icon: Users, 
      color: COLORS.PRIMARY_GREEN, glowColor: COLORS.FADED_GREEN, 
      label: "Borrowers", delay: 0.1 
    },
    { 
      x: 380, y: 100, Icon: Database, 
      color: COLORS.LIGHT_BLUE, glowColor: COLORS.FADED_BLUE, 
      label: "Lender Data", delay: 0.2 
    },
    { 
      x: 120, y: 300, Icon: FileText, 
      color: COLORS.LIGHT_GREEN, glowColor: COLORS.FADED_GREEN, 
      label: "Projects", delay: 0.3 
    },
    { 
      x: 380, y: 300, Icon: Shuffle, 
      color: COLORS.DARK_GREY, glowColor: COLORS.LIGHT_GREY, 
      label: "Matching Algo", delay: 0.4 
    },
    { 
      x: 250, y: 70, Icon: Zap, 
      color: COLORS.MEDIUM_GREY, glowColor: COLORS.LIGHT_GREY, 
      label: "Real-time", delay: 0.5 
    },
  ];

  return (
    <GraphicContainer>
      {/* Center Node */}
      <CentralIcon 
        x={centerX} 
        y={centerY} 
        size={50} 
        Icon={BrainCircuit} 
        color={COLORS.PRIMARY_BLUE} 
        glowColor={COLORS.FADED_BLUE}
        label="AI Analysis" 
      />
      
      {/* Satellite nodes with connecting lines */}
      {nodes.map((node, index) => (
        <React.Fragment key={`lender-node-${index}`}>
          <NodeIcon 
            x={node.x} 
            y={node.y} 
            size={30} 
            Icon={node.Icon} 
            color={node.color} 
            glowColor={node.glowColor}
            label={node.label} 
            delay={node.delay} 
          />
          
          <AnimatedConnectionLine 
            startX={node.x} 
            startY={node.y} 
            endX={centerX} 
            endY={centerY} 
            color={node.color === COLORS.MEDIUM_GREY || node.color === COLORS.DARK_GREY ? 
                   COLORS.LIGHT_GREY : 
                   node.color === COLORS.PRIMARY_GREEN || node.color === COLORS.LIGHT_GREEN ? 
                   COLORS.VERY_LIGHT_GREEN : 
                   COLORS.VERY_LIGHT_BLUE}
            particleColor={node.color}
            delay={node.delay + 0.2}
            startRadius={30}
            endRadius={50}
            numParticles={Math.floor(Math.random() * 2) + 2}
          />
        </React.Fragment>
      ))}
    </GraphicContainer>
  );
};

// ProjectResumeGraphic with improved layout
const ProjectResumeGraphic: React.FC = () => {
  // Center coordinates
  const centerX = 250;
  const centerY = 200;
  
  // Node definitions with proper positioning
  const nodes = [
    { 
      x: 100, y: 100, Icon: FileText, 
      color: COLORS.MEDIUM_GREY, glowColor: COLORS.LIGHT_GREY, 
      label: "Raw Data", delay: 0.1 
    },
    { 
      x: 400, y: 100, Icon: CheckSquare, 
      color: COLORS.PRIMARY_BLUE, glowColor: COLORS.FADED_BLUE, 
      label: "Validation", delay: 0.2 
    },
    { 
      x: 100, y: 300, Icon: FileJson, 
      color: COLORS.MEDIUM_GREY, glowColor: COLORS.LIGHT_GREY, 
      label: "Parsed Docs", delay: 0.3 
    },
    { 
      x: 400, y: 300, Icon: BarChart3, 
      color: COLORS.LIGHT_BLUE, glowColor: COLORS.FADED_BLUE, 
      label: "Completeness", delay: 0.4 
    },
  ];

  return (
    <GraphicContainer>
      {/* Center Node */}
      <CentralIcon 
        x={centerX} 
        y={centerY} 
        size={50} 
        Icon={Search} 
        color={COLORS.PRIMARY_GREEN} 
        glowColor={COLORS.FADED_GREEN}
        label="Validation Engine" 
      />
      
      {/* Satellite nodes with connecting lines */}
      {nodes.map((node, index) => (
        <React.Fragment key={`resume-node-${index}`}>
          <NodeIcon 
            x={node.x} 
            y={node.y} 
            size={30} 
            Icon={node.Icon} 
            color={node.color} 
            glowColor={node.glowColor}
            label={node.label} 
            delay={node.delay} 
          />
          
          <AnimatedConnectionLine 
            startX={node.x} 
            startY={node.y} 
            endX={centerX} 
            endY={centerY} 
            color={node.color === COLORS.MEDIUM_GREY || node.color === COLORS.DARK_GREY ? 
                   COLORS.LIGHT_GREY : 
                   node.color === COLORS.PRIMARY_GREEN || node.color === COLORS.LIGHT_GREEN ? 
                   COLORS.VERY_LIGHT_GREEN : 
                   COLORS.VERY_LIGHT_BLUE}
            particleColor={node.color}
            delay={node.delay + 0.2}
            startRadius={30}
            endRadius={50}
            numParticles={Math.floor(Math.random() * 2) + 2}
          />
        </React.Fragment>
      ))}
    </GraphicContainer>
  );
};

// OfferingMemorandumGraphic with improved node placement
const OfferingMemorandumGraphic: React.FC = () => {
  // Center coordinates
  const centerX = 250;
  const centerY = 200;
  
  // Node definitions with proper positioning
  const nodes = [
    { 
      x: 100, y: 100, Icon: FileText, 
      color: COLORS.DARK_GREY, glowColor: COLORS.LIGHT_GREY, 
      label: "Project Data", delay: 0.1 
    },
    { 
      x: 400, y: 100, Icon: Users, 
      color: COLORS.MEDIUM_GREY, glowColor: COLORS.LIGHT_GREY, 
      label: "Sponsor Info", delay: 0.2 
    },
    { 
      x: 100, y: 300, Icon: BarChart3, 
      color: COLORS.PRIMARY_BLUE, glowColor: COLORS.FADED_BLUE, 
      label: "Financials", delay: 0.3 
    },
    { 
      x: 400, y: 300, Icon: Eye, 
      color: COLORS.PRIMARY_GREEN, glowColor: COLORS.FADED_GREEN, 
      label: "Market Data", delay: 0.4 
    },
    { 
      x: 250, y: 70, Icon: Link2, 
      color: COLORS.LIGHT_GREEN, glowColor: COLORS.FADED_GREEN, 
      label: "Live OM Link", delay: 0.5 
    },
  ];

  return (
    <GraphicContainer>
      {/* Center Node */}
      <CentralIcon 
        x={centerX} 
        y={centerY} 
        size={50} 
        Icon={FileSpreadsheet} 
        color={COLORS.LIGHT_BLUE} 
        glowColor={COLORS.FADED_BLUE}
        label="OM Generator" 
      />
      
      {/* Satellite nodes with connecting lines */}
      {nodes.map((node, index) => (
        <React.Fragment key={`om-node-${index}`}>
          <NodeIcon 
            x={node.x} 
            y={node.y} 
            size={30} 
            Icon={node.Icon} 
            color={node.color} 
            glowColor={node.glowColor}
            label={node.label} 
            delay={node.delay} 
          />
          
          <AnimatedConnectionLine 
            startX={node.x} 
            startY={node.y} 
            endX={centerX} 
            endY={centerY} 
            color={node.color === COLORS.MEDIUM_GREY || node.color === COLORS.DARK_GREY ? 
                   COLORS.LIGHT_GREY : 
                   node.color === COLORS.PRIMARY_GREEN || node.color === COLORS.LIGHT_GREEN ? 
                   COLORS.VERY_LIGHT_GREEN : 
                   COLORS.VERY_LIGHT_BLUE}
            particleColor={node.color}
            delay={node.delay + 0.2}
            startRadius={30}
            endRadius={50}
            numParticles={Math.floor(Math.random() * 2) + 2}
          />
        </React.Fragment>
      ))}
    </GraphicContainer>
  );
};

// Main component with improved transition animations
export const ProcessGraphics: React.FC<{activeIndex: number}> = ({ activeIndex }) => {
  const graphics = [
    <LenderMatchingGraphic key="graphic-lender-matching" />,
    <ProjectResumeGraphic key="graphic-project-resume" />,
    <OfferingMemorandumGraphic key="graphic-om" />,
  ];

  return (
    <div className="w-full h-full rounded-xl overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex} 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full h-full"
        >
          {graphics[activeIndex] || null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
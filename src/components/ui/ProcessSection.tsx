// src/components/ui/ProcessSection.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Search, BrainCircuit, FileSpreadsheet } from "lucide-react";
import { cn } from "@/utils/cn";
import { ProcessGraphics } from "./ProcessGraphics";
import { useTheme } from "@/contexts/ThemeContext";

interface ProcessStepData {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  graphicIndex: number;
  layout: "textLeft" | "textRight";
}

const processStepsContent: ProcessStepData[] = [
  {
    id: "lender-matching",
    title: "Intelligent Lender Matching",
    description:
      "Our AI-powered LenderLine™ instantly connects you with compatible lenders. Utilize our interactive interface to refine criteria and visualize your ideal capital partners in real-time.",
    icon: (
      <Search
        size={32}
        className="text-blue-300 group-hover:text-blue-400 transition-colors"
      />
    ),
    graphicIndex: 0,
    layout: "textLeft",
  },
  {
    id: "project-resume",
    title: "AI-Assisted Project Resume",
    description:
      "Effortlessly build a comprehensive project and borrower resume. Our AI tools assist with information validation, document parsing, and offer real-time advice to ensure your submission is lender-ready.",
    icon: (
      <BrainCircuit
        size={32}
        className="text-blue-300 group-hover:text-blue-400 transition-colors"
      />
    ),
    graphicIndex: 1,
    layout: "textRight",
  },
  {
    id: "offering-memorandum",
    title: "Live Offering Memorandum",
    description:
      "Generate a dynamic, professional Offering Memorandum with a single click. This live dashboard, hosted for each project, provides lenders with all necessary information in an accessible format.",
    icon: (
      <FileSpreadsheet
        size={32}
        className="text-blue-300 group-hover:text-blue-400 transition-colors"
      />
    ),
    graphicIndex: 2,
    layout: "textLeft",
  },
];

const StepComponent: React.FC<{ step: ProcessStepData; index: number }> = ({
  step,
  index,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    amount: 0.3,
    margin: "-10% 0px -10% 0px",
  });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  // Improved easing functions for smoother transitions
  const commonTransition = { duration: 0.8, ease: "easeOut" };

  const textVariants = {
    hidden: {
      opacity: 0,
      x: step.layout === "textLeft" ? -60 : 60,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { ...commonTransition, delay: 0.2 },
    },
  };

  const graphicVariants = {
    hidden: {
      opacity: 0,
      scale: 0.85,
      x: step.layout === "textLeft" ? 60 : -60,
    },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: { ...commonTransition, delay: 0.4 },
    },
  };

  const TextContent = () => (
    <motion.div
      className={cn(
        "w-full lg:w-2/5 flex justify-center py-8 lg:py-0 group",
        step.layout === "textLeft"
          ? "lg:pr-10 xl:pr-16 pl-6 lg:pl-8 xl:pl-12"
          : "lg:pl-10 xl:pl-16 pr-6 lg:pr-8 xl:pr-12"
      )}
      variants={textVariants}
    >
      <div
        className={cn(
          "w-full rounded-[2rem] border shadow-2xl p-6 md:p-8 lg:p-10 transition-colors",
          isDark
            ? "bg-gray-900/80 border-white/10"
            : "bg-white border-gray-100"
        )}
      >
        <div
          className={cn(
            "mb-5 inline-flex items-center justify-center p-3 rounded-full border-2 w-20 h-20 shadow-lg",
            isDark
              ? "bg-blue-600/25 border-blue-500"
              : "bg-blue-50 border-blue-200"
          )}
        >
          {step.icon}
        </div>
        <h3
          className={cn(
            "text-3xl md:text-4xl font-bold mb-5 leading-tight",
            isDark ? "text-white" : "text-gray-900"
          )}
        >
          {step.title}
        </h3>
        <p
          className={cn(
            "text-lg md:text-xl leading-relaxed",
            isDark ? "text-gray-300" : "text-gray-700"
          )}
        >
          {step.description}
        </p>
      </div>
    </motion.div>
  );

  const GraphicContent = () => (
    <motion.div
      className="w-full lg:w-3/5 h-[28rem] sm:h-[30rem] md:h-[34rem] lg:h-[34rem] xl:h-[38rem] flex items-center justify-center px-6 lg:px-8"
      variants={graphicVariants}
    >
      <div
        className={cn(
          "w-full h-full rounded-[2.5rem] border shadow-2xl flex items-center justify-center p-4 sm:p-6 md:p-8",
          isDark
            ? "bg-gray-900/85 border-white/10"
            : "bg-white border-gray-100"
        )}
      >
        <ProcessGraphics activeIndex={step.graphicIndex} />
      </div>
    </motion.div>
  );

  return (
    <motion.section
      ref={ref}
      className={cn(
        "flex items-center mx-auto px-4 md:px-8 xl:px-12 py-6 sm:py-8 lg:py-10",
        index === 0
          ? "pt-0 pb-6 sm:pb-8 lg:pb-10"
          : undefined,
        "max-w-7xl" // Control max width
      )}
      initial="hidden"
      animate={hasAnimated ? "visible" : "hidden"}
    >
      <div
        className={cn(
          "flex flex-col lg:gap-6 xl:gap-10 w-full items-center",
          step.layout === "textRight" ? "lg:flex-row-reverse" : "lg:flex-row"
        )}
      >
        <TextContent />
        <GraphicContent />
      </div>
    </motion.section>
  );
};

export const ProcessSection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      id="process-section"
      className={cn(
        "min-h-screen overflow-hidden relative flex flex-col justify-center transition-colors duration-300 pattern-background hero-font",
        isDark
          ? "bg-gray-900 text-gray-100 pattern-background-dark"
          : "bg-white text-gray-900 pattern-background-light"
      )}
    >
      {/* Enhanced title section with better spacing */}
      <motion.div
        className="text-center pt-20 pb-0 md:pt-28 md:pb-0 px-6"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{
          opacity: 1,
          y: 0,
          transition: { delay: 0.1, duration: 0.6, ease: "easeOut" },
        }}
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2 className={cn("text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-center", isDark ? "text-white" : "text-gray-900")}>
          <span className="text-blue-500">AI</span>-Powered, <span className="text-green-500">Borrower</span>-Controlled
        </h2>
        <p className={cn("text-lg md:text-xl max-w-3xl mx-auto", isDark ? "text-gray-300" : "text-black")}>
          CapMatch delivers superior lender matching through our top-down project acquisition approach, featuring AI-based processing and industry-leading lender matching capabilities that outperform everything else in the market.
        </p>
      </motion.div>

      {/* Process Steps with adjustments for better flow and spacing */}
      <div className="max-w-screen-2xl mx-auto">
        {processStepsContent.map((step, index) => (
          <StepComponent key={step.id} step={step} index={index} />
        ))}
      </div>
    </div>
  );
};

// src/components/ui/ProcessSection.tsx
"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Search, BrainCircuit, FileSpreadsheet } from "lucide-react";
import { cn } from "@/utils/cn";
import { ProcessGraphics } from "./ProcessGraphics";

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
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: false,
    amount: 0.3,
    margin: "-10% 0px -10% 0px",
  });

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
        "w-full lg:w-2/5 flex flex-col justify-center py-8 lg:py-0",
        step.layout === "textLeft"
          ? "lg:pr-10 xl:pr-16 pl-6 lg:pl-8 xl:pl-12"
          : "lg:pl-10 xl:pl-16 pr-6 lg:pr-8 xl:pr-12"
      )}
      variants={textVariants}
    >
      <div className="mb-5 inline-flex items-center justify-center p-3 bg-blue-600/25 rounded-full border-2 border-blue-500 w-20 h-20 shadow-lg">
        {step.icon}
      </div>
      <h3 className="text-3xl md:text-4xl font-bold text-white mb-5 leading-tight">
        {step.title}
      </h3>
      <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
        {step.description}
      </p>
    </motion.div>
  );

  const GraphicContent = () => (
    <motion.div
      className="w-full lg:w-3/5 h-[28rem] sm:h-[30rem] md:h-[34rem] lg:h-[34rem] xl:h-[38rem]"
      variants={graphicVariants}
    >
      <ProcessGraphics activeIndex={step.graphicIndex} />
    </motion.div>
  );

  return (
    <motion.section
      ref={ref}
      className={cn(
        "min-h-[70vh] md:min-h-[80vh] py-16 md:py-20 flex items-center mx-auto px-4 md:px-8 xl:px-12",
        "max-w-7xl" // Control max width
      )}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      <div
        className={cn(
          "flex flex-col lg:gap-12 xl:gap-20 w-full items-center",
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
  const sectionRef = useRef(null);
  const titleInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <div
      ref={sectionRef}
      id="process-section"
      className="bg-gray-900 text-gray-100 overflow-hidden"
    >
      {/* Enhanced title section with better spacing */}
      <motion.div
        className="text-center pt-20 pb-12 md:pt-28 md:pb-16 px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={
          titleInView
            ? {
                opacity: 1,
                y: 0,
                transition: { delay: 0.1, duration: 0.6, ease: "easeOut" },
              }
            : {}
        }
      >
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Funding, from <span className="text-blue-400">Months</span> to{" "}
          <span className="text-green-400">Minutes</span>.{" "}
          {/* eslint-disable-line react/no-unescaped-entities */}
        </h2>
        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
          CapMatch's intelligent platform automates and accelerates every step
          of your commercial real estate financing.
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

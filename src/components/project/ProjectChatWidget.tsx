// src/components/project/ProjectChatWidget.tsx

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';
import { ConsolidatedSidebar } from './ConsolidatedSidebar';
import { ProjectProfile } from '@/types/enhanced-types';

interface ProjectChatWidgetProps {
    projectId: string;
    formData: ProjectProfile;
    droppedFieldId?: string | null;
    onFieldProcessed?: () => void;
}

export const ProjectChatWidget: React.FC<ProjectChatWidgetProps> = ({ projectId, formData, droppedFieldId, onFieldProcessed }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const fabVariants = {
        hidden: { scale: 0, opacity: 0, y: 50 },
        visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20, delay: 0.5 } },
    };

    const windowVariants = {
        hidden: { opacity: 0, y: 50, scale: 0.9 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    };

    return (
        <div className="fixed bottom-6 right-6 z-40">
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        variants={fabVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        onClick={() => setIsOpen(true)}
                        className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                        aria-label="Open Project Assistant"
                    >
                        <MessageSquare size={28} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={windowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="w-[26rem] h-[calc(100vh-5rem)] max-h-[700px] bg-white rounded-xl shadow-2xl flex flex-col"
                    >
                        <div className="p-2 border-b flex justify-end">
                             <button onClick={() => setIsOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close Project Assistant"> <X size={20} /> </button>
                        </div>
                        <div className="flex-1 overflow-hidden p-2">
                             <ConsolidatedSidebar projectId={projectId} formData={formData} droppedFieldId={droppedFieldId} onFieldProcessed={onFieldProcessed} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
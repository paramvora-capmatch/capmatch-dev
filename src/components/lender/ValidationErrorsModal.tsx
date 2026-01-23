import React from 'react';
import { X, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ValidationErrorsModalProps {
    isOpen: boolean;
    onClose: () => void;
    errors: string | any;
    docName: string;
    onFixInChat: () => void;
}

export const ValidationErrorsModal: React.FC<ValidationErrorsModalProps> = ({
    isOpen,
    onClose,
    errors,
    docName,
    onFixInChat,
}) => {
    if (!isOpen) return null;

    let formattedErrors = errors;
    if (typeof errors === 'string') {
        try {
            // Try to parse if it looks like JSON
            const parsed = JSON.parse(errors);
            formattedErrors = parsed;
        } catch (e) {
            // Leave as string
        }
    }

    const renderErrors = () => {
        if (typeof formattedErrors === 'string') {
            return <p className="text-sm text-gray-700 whitespace-pre-wrap">{formattedErrors}</p>;
        }

        if (typeof formattedErrors === 'object' && formattedErrors !== null) {
            // Handle "reasoning", "missing_fields" specific structure if apparent
            if (formattedErrors.reasoning || formattedErrors.missing_fields) {
                return (
                    <div className="space-y-4">
                        {formattedErrors.reasoning && (
                            <div>
                                <h4 className="font-semibold text-gray-900 text-sm mb-1">Reasoning</h4>
                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{formattedErrors.reasoning}</p>
                            </div>
                        )}
                        {formattedErrors.missing_fields && Array.isArray(formattedErrors.missing_fields) && (
                            <div>
                                <h4 className="font-semibold text-gray-900 text-sm mb-1">Missing Fields</h4>
                                <div className="flex flex-wrap gap-2">
                                    {formattedErrors.missing_fields.map((field: string, i: number) => (
                                        <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                                            {field}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Fallback for other keys */}
                        {Object.keys(formattedErrors).filter(k => k !== 'reasoning' && k !== 'missing_fields' && k !== 'timestamp').length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-gray-900 text-sm mb-1">Other Details</h4>
                                <pre className="text-xs bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto text-gray-600">
                                    {JSON.stringify(Object.fromEntries(Object.entries(formattedErrors).filter(([k]) => k !== 'reasoning' && k !== 'missing_fields' && k !== 'timestamp')), null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                );
            }

            // Generic object rendering
            return (
                <pre className="text-xs bg-gray-50 p-3 rounded-lg border border-gray-100 overflow-x-auto text-gray-600 whitespace-pre-wrap font-mono">
                    {JSON.stringify(formattedErrors, null, 2)}
                </pre>
            );
        }

        return <p className="text-sm text-gray-500 italic">No detailed error information available.</p>;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Validation Errors</h3>
                            <p className="text-xs text-gray-500 font-medium">{docName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {renderErrors()}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} className="hover:bg-white">
                        Dismiss
                    </Button>
                    <Button onClick={onFixInChat} leftIcon={<MessageSquare size={16} />} className="shadow-sm">
                        Fix in Chat
                    </Button>
                </div>
            </div>
        </div>
    );
};

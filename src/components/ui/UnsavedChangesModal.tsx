import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveAndExit: () => void;
    onExitWithoutSaving: () => void;
    isSaving?: boolean;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
    isOpen,
    onClose,
    onSaveAndExit,
    onExitWithoutSaving,
    isSaving = false,
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Unsaved Changes">
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-900">
                            You have unsaved changes
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            If you leave now, your changes will be lost. Would
                            you like to save before exiting?
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onExitWithoutSaving}
                        disabled={isSaving}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                        Exit without saving
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onSaveAndExit}
                        isLoading={isSaving}
                    >
                        Save & Exit
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

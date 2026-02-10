"use client";

import React, { useState } from "react";
import { Modal, ModalFooter } from "./Modal";
import { ExcelRegionSelector, ExcelSelection } from "./ExcelRegionSelector";
import { Button } from "./Button";
import { Table, CheckCircle2 } from "lucide-react";

interface ExcelRegionSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: File | ArrayBuffer | null;
    onConfirm: (selection: ExcelSelection) => void;
}

export function ExcelRegionSelectorModal({
    isOpen,
    onClose,
    file,
    onConfirm,
}: ExcelRegionSelectorModalProps) {
    const [selection, setSelection] = useState<ExcelSelection | null>(null);

    const handleConfirm = () => {
        if (selection) {
            onConfirm(selection);
            onClose();
        }
    };

    if (!file) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Select Data Region"
            size="full"
            headerRight={
                <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                    <Table className="h-4 w-4" />
                    <span>Select the cells you want to extract</span>
                </div>
            }
        >
            <div className="flex flex-col h-full">
                <div className="flex-1 overflow-hidden min-h-[400px] border border-gray-200 rounded-lg">
                    <ExcelRegionSelector
                        file={file}
                        onSelectionChange={setSelection}
                    />
                </div>

                <ModalFooter className="flex-shrink-0 pt-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selection}
                        className="flex items-center gap-2"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Selection
                    </Button>
                </ModalFooter>
            </div>
        </Modal>
    );
}

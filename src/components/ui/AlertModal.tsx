"use client";
import React from "react";
import { Modal, ModalBody, ModalFooter } from "./Modal";
import { Button } from "./Button";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

export type AlertModalVariant = "info" | "warning" | "error";

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: AlertModalVariant;
}

const variantConfig: Record<
  AlertModalVariant,
  { Icon: typeof AlertCircle; bgClass: string; iconClass: string }
> = {
  info: {
    Icon: Info,
    bgClass: "bg-blue-100",
    iconClass: "text-blue-600",
  },
  warning: {
    Icon: AlertTriangle,
    bgClass: "bg-amber-100",
    iconClass: "text-amber-600",
  },
  error: {
    Icon: AlertCircle,
    bgClass: "bg-red-100",
    iconClass: "text-red-600",
  },
};

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  variant = "error",
}) => {
  const { Icon, bgClass, iconClass } = variantConfig[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title={title}>
      <ModalBody>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${bgClass}`}>
              <Icon className={`w-6 h-6 ${iconClass}`} />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{message}</p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          OK
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// src/types/onlyoffice.ts

export interface OnlyOfficeConfig {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions?: {
      edit?: boolean;
      download?: boolean;
      print?: boolean;
      review?: boolean;
      comment?: boolean;
      fillForms?: boolean;
    };
  };
  documentType: "text" | "spreadsheet" | "presentation";
  editorConfig: {
    mode?: "view" | "edit";
    lang?: string;
    callbackUrl?: string;
    user?: {
      id: string;
      name: string;
    };
    customization?: {
      autosave?: boolean;
      forcesave?: boolean;
      comments?: boolean;
      chat?: boolean;
      compactHeader?: boolean;
      feedback?: boolean;
      help?: boolean;
    };
  };
  height?: string;
  width?: string;
  type?: "desktop" | "mobile" | "embedded";
}

export interface OnlyOfficeCallbackData {
  key: string;
  status: OnlyOfficeStatus;
  url?: string;
  changesurl?: string;
  history?: OnlyOfficeHistory;
  users?: string[];
  actions?: OnlyOfficeAction[];
  lastsave?: string;
  notmodified?: boolean;
}

export enum OnlyOfficeStatus {
  NotFound = 0,
  Editing = 1,
  ReadyForSaving = 2,
  SaveError = 3,
  ClosedWithoutChanges = 4,
  ForceSaving = 6,
  ForceSaveError = 7,
}

export type OnlyOfficeHistory = any; // Complex type, define as needed
export type OnlyOfficeAction = any; // Complex type, define as needed
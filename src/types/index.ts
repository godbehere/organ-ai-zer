export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  modified: Date;
  type: 'file' | 'directory';
}

export interface OrganizationSuggestion {
  file: FileInfo;
  suggestedPath: string;
  reason: string;
  confidence: number;
}

export interface OrganizeOptions {
  dryRun?: boolean;
  recursive?: boolean;
  config?: string;
}

export interface PreviewOptions {
  recursive?: boolean;
  config?: string;
}

export * from './config';
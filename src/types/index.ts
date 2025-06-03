import path from 'path';
import { z, ZodSchema } from 'zod';

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
  category?: string;
  metadata?: any;
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

/**
 * Generic conversation message types
 */
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ConversationMessage {
  role: MessageRole;
  content: string;
}

/**
 * Configuration for conversation behavior
 */
export interface ConversationConfig {
  /** Maximum number of turns before timeout */
  maxTurns: number;
  /** System prompt template */
  systemPrompt?: string;
  /** Custom prompt parameters */
  promptParams?: Record<string, any>;
  /** Whether to maintain full message history */
  keepFullHistory: boolean;
  /** Maximum context window size */
  maxContextSize?: number;
  /** Temperature for AI responses */
  temperature?: number;
  /** Custom AI provider settings */
  aiSettings?: Record<string, any>;
}

/**
 * Result from an AI conversation turn
 */
export interface ConversationResult<T = any> {
  /** AI response content */
  response: string;
  /** Parsed structured data (if applicable) */
  data?: T;
  /** Whether the conversation needs user input */
  needsInput: boolean;
  /** Specific questions or prompts for user */
  questions?: string[];
  /** Confidence level of the response */
  confidence?: number;
  /** Metadata about the response */
  metadata?: Record<string, any>;
}





/**
 * Clarification phases where AI can ask questions
 */
export enum ClarificationPhase {
  INITIAL_ANALYSIS = 'analysis',
  SUGGESTIONS = 'suggestions', 
  REFINEMENT = 'refinement'
}

/**
 * Structured clarification data
 */
export interface Clarification {
  id: string;
  phase: ClarificationPhase;
  question: string;
  answer: string;
  context: string;
  timestamp: Date;
}

/**
 * Result from file organization conversation
 */
export interface OrganizationConversationResult extends ConversationResult<OrganizationSuggestion[]> {
  /** Organization suggestions */
  suggestions: OrganizationSuggestion[];
  /** AI-discovered categories */
  discoveredCategories?: Record<string, string[]>;
  /** Whether clarification is needed */
  needsClarification?: {
    questions: string[];
    reason: string;
  };
}

/**
 * User feedback on organization suggestions
 */
export interface OrganizationFeedback {
  approved: boolean;
  feedback?: string;
  specificIssues?: string[];
  selectedSuggestions?: OrganizationSuggestion[];
}

export interface AIAnalysisRequest {
  prompt: string;
  schema?: ZodSchema;
}

export interface AIAnalysisResponse {
  suggestions: Array<{
    file: FileInfo | null;
    suggestedPath: string;
    reason: string;
    confidence: number;
    category?: string;
    metadata?: any;
  }>;
  discoveredCategories?: Record<string, FileInfo[]>;
  reasoning: string;
  clarificationNeeded?: {
    questions: string[];
    reason: string;
  };
  detectedProjects?: DetectedProject[];
}

export interface CategoryConversationResponse {
  question: string;
  inputType: 'choice' | 'freeform';
  choices?: string[];
  reasoning: string;
}

export interface DetectedProject {
  name: string;
  files: FileInfo[];
  type: string;
  rootPath: string;
  indicators: string[];
}


/**
 * Schemas
 */

const FileInfoSchema = z.object({
  path: z.string(),
  name: z.string(),
  extension: z.string(),
  size: z.number(),
  modified: z.string(),
  type: z.enum(['file', 'directory'])
});

export const AIAnalysisResponseSchema = z.object({
  discoveredCategories: z.record(z.string(), z.array(FileInfoSchema)).nullable(),
  reasoning: z.string(),
  clarificationNeeded: z.object({
    questions: z.array(z.string()),
    reason: z.string()
  }).nullable()
});

export const AISuggestionsResponseSchema = z.object({
  suggestions: z.array(z.object({
    file: z.string().nullable(),
    suggestedPath: z.string(),
    reason: z.string(),
    confidence: z.number().min(0).max(1),
    category: z.string().nullable(),
    metadata: z.object({}).nullable()
  })),
  discoveredCategories: z.record(z.string(), z.array(FileInfoSchema)).nullable(),
  reasoning: z.string(),
  clarificationNeeded: z.object({
    questions: z.array(z.string()),
    reason: z.string()
  }).nullable()
});

export const FinalSuggestionsSchema =   z.object({
    suggestions: z.array(z.object({
      file: z.string().nullable(),
      suggestedPath: z.string(),
      reason: z.string(),
      confidence: z.number().min(0).max(1),
      category: z.string().nullable(),
      metadata: z.object({}).nullable()
    })),
    reasoning: z.string(),
  });

export const CategoryConversationSchema = z.object({
  question: z.string(),
  inputType: z.enum(['choice', 'freeform']),
  choices: z.array(z.string()).nullable(),
  reasoning: z.string()
});


export * from './config';
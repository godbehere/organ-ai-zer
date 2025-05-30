import path from 'path';
import { z } from 'zod';

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
 * Generic conversation context for any AI interaction
 */
export interface ConversationContext {
  /** Unique conversation ID */
  id: string;
  /** Subject/topic of the conversation */
  subject: string;
  /** Current conversation state */
  state: 'active' | 'paused' | 'complete' | 'failed';
  /** Conversation messages history */
  messages: ConversationMessage[];
  /** Custom context data specific to the conversation type */
  customContext: Record<string, any>;
  /** Configuration for this conversation */
  config: ConversationConfig;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Number of turns/exchanges */
  turnCount: number;
}

/**
 * File organization specific conversation context data
 */
export interface FileOrganizationContext {
  /** Files to be organized */
  files: FileInfo[];
  /** Base directory for organization */
  baseDirectory: string;
  /** User's original intent for organization */
  intent: string;
  /** Organization suggestions that were rejected */
  rejectedSuggestions: OrganizationSuggestion[];
  /** Organization patterns that were approved */
  approvedPatterns: string[];
  /** AI-discovered categories and their files */
  discoveredCategories: Record<string, FileInfo[]>;
  /** Collected clarifications from user */
  clarifications: Clarification[];
  /** Current processing batch */
  currentBatch?: {
    name: string;
    files: FileInfo[];
  };
  /** Organization phase */
  phase: 'analysis' | 'conversation' | 'organization' | 'complete';
  /** Optional pattern matching hints (if supplemental service is used) */
  patternHints?: string[];
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

const FileInfoSchema = z.object({
  path: z.string(),
  name: z.string(),
  extension: z.string(),
  size: z.number(),
  modified: z.string(),
  type: z.enum(['file', 'directory'])
});

export const AIAnalysisResponseSchema = z.object({
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


export * from './config';
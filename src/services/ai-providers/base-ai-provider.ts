import { ZodSchema } from 'zod';
import { AIAnalysisRequest, AIAnalysisResponse } from '../../types';
import { ConversationContext } from '../conversation-context';
import { OrganizationContext } from '../organization-context';

export abstract class BaseAIProvider {
  protected apiKey: string;
  protected model: string;
  protected maxTokens: number;
  protected temperature: number;
  protected timeout: number;

  constructor(config: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
  }) {
    this.apiKey = config.apiKey;
    this.model = config.model || this.getDefaultModel();
    this.maxTokens = config.maxTokens || 1000;
    this.temperature = config.temperature || 0.3;
    this.timeout = config.timeout || 30000;
  }

  abstract getDefaultModel(): string;
  abstract generateResponse(context: ConversationContext, schema: ZodSchema): Promise<AIAnalysisResponse>;
  // abstract analyzeFiles(request: AIAnalysisRequest, context: ConversationContext): Promise<AIAnalysisResponse>;
  // abstract analyzeFilesOld(request: AIAnalysisRequest, context: OrganizationContext): Promise<AIAnalysisResponse>;

}
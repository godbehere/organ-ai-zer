import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './base-ai-provider';
import { ConversationContext } from '../conversation-context';
import { AIAnalysisRequest, AIAnalysisResponse } from '../../types';
// import { ConversationContext } from '../../types';

export class AnthropicProvider extends BaseAIProvider {
  private client: Anthropic;

  constructor(config: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
  }) {
    super(config);
    this.client = new Anthropic({
      apiKey: this.apiKey,
      timeout: this.timeout
    });
  }

  getDefaultModel(): string {
    return 'claude-3-sonnet-20240229';
  }

  generateResponse(context: ConversationContext): Promise<AIAnalysisResponse> {
    throw new Error('Method not implemented.');
  }

  async analyzeFilesOld(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    throw new Error('Method not implemented.');
  }

  // async analyzeFiles(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  //   try {
  //     const prompt = this.buildPrompt(request);
      
  //     // Use dynamic token limits from userPreferences if provided
  //     const maxTokens = request.userPreferences?.maxTokens || this.maxTokens;
  //     const temperature = request.userPreferences?.temperature || this.temperature;
      
  //     console.log(`🔗 Making Anthropic API call with ${request.files.length} files...`);
  //     console.log(`📋 Model: ${this.model}, Max Tokens: ${maxTokens}, Temperature: ${temperature}`);
      
  //     const message = await this.client.messages.create({
  //       model: this.model,
  //       max_tokens: maxTokens,
  //       temperature: temperature,
  //       messages: [
  //         {
  //           role: 'user',
  //           content: prompt
  //         }
  //       ]
  //     });

  //     console.log(`📥 Received response from Anthropic API`);

  //     const content = message.content[0];
  //     if (content.type !== 'text') {
  //       throw new Error('Unexpected response type from Anthropic');
  //     }

  //     // For custom prompts, return the raw response without parsing
  //     if (request.userPreferences?.customPrompt) {
  //       return {
  //         suggestions: [],
  //         reasoning: content.text,
  //         clarificationNeeded: undefined
  //       };
  //     }

  //     console.log(`📝 Parsing AI response...`);
  //     const parsedResponse = this.parseAIResponse(content.text);
      
  //     // Map the file objects back to the suggestions
  //     parsedResponse.suggestions = parsedResponse.suggestions.map((suggestion, index) => {
  //       const originalFile = request.files.find(f => f.name === suggestion.suggestedPath.split('/').pop());
  //       return {
  //         ...suggestion,
  //         file: originalFile || request.files[index] || request.files[0]
  //       };
  //     });

  //     console.log(`✅ Successfully parsed ${parsedResponse.suggestions.length} suggestions`);
  //     return parsedResponse;
  //   } catch (error) {
  //     console.error(`🚨 Anthropic Provider Error Details:`, {
  //       message: error instanceof Error ? error.message : String(error),
  //       model: this.model,
  //       maxTokens: this.maxTokens,
  //       filesCount: request.files.length
  //     });
      
  //     if (error instanceof Error) {
  //       throw new Error(`Anthropic API error: ${error.message}`);
  //     }
  //     throw new Error(`Anthropic API error: ${error}`);
  //   }
  // }
}
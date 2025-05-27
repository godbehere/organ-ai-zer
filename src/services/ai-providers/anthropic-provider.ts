import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider, AIAnalysisRequest, AIAnalysisResponse } from './base-ai-provider';

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

  async analyzeFiles(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const prompt = this.buildPrompt(request);
      
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Anthropic');
      }

      const parsedResponse = this.parseAIResponse(content.text);
      
      // Map the file objects back to the suggestions
      parsedResponse.suggestions = parsedResponse.suggestions.map((suggestion, index) => {
        const originalFile = request.files.find(f => f.name === suggestion.suggestedPath.split('/').pop());
        return {
          ...suggestion,
          file: originalFile || request.files[index] || request.files[0]
        };
      });

      return parsedResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }
      throw new Error(`Anthropic API error: ${error}`);
    }
  }
}
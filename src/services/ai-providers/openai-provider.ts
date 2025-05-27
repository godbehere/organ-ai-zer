import OpenAI from 'openai';
import { BaseAIProvider, AIAnalysisRequest, AIAnalysisResponse } from './base-ai-provider';

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;

  constructor(config: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
  }) {
    super(config);
    this.client = new OpenAI({
      apiKey: this.apiKey,
      timeout: this.timeout
    });
  }

  getDefaultModel(): string {
    return 'gpt-4';
  }

  async analyzeFiles(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const prompt = this.buildPrompt(request);
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert file organization assistant. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const parsedResponse = this.parseAIResponse(content);
      
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
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error(`OpenAI API error: ${error}`);
    }
  }
}
import OpenAI from 'openai';
import { BaseAIProvider } from './base-ai-provider';
import { zodTextFormat } from "openai/helpers/zod";
import { ZodSchema } from 'zod';
import { ConversationContext } from '../conversation-context';
import { AIAnalysisRequest, AIAnalysisResponse } from '../../types';
import { AIAnalysisRequest as BaseProviderRequest } from './base-ai-provider';
import { OrganizationContext } from '../organization-context';

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
    return 'gpt-4o';
  }

  async generateResponse(context: ConversationContext, schema: ZodSchema): Promise<AIAnalysisResponse> {
    try {

      const response = await this.client.responses.parse({
        model: this.model,
        input: context.getMessages(),
        text: {
          format: zodTextFormat(schema, 'result')
        }
      });
 
      // const response = testResponse;

      const result = response.output_parsed;
      if (!result) {
        throw new Error('No response content from OpenAI');
      }

      const parsedResponse = result as AIAnalysisResponse;
      
      // Map the file objects back to the suggestions
      // parsedResponse.suggestions = parsedResponse.suggestions.map((suggestion, index) => {
      //   const originalFile = request.files.find(f => f.name === suggestion.suggestedPath.split('/').pop());
      //   return {
      //     ...suggestion,
      //     file: originalFile || request.files[index] || request.files[0]
      //   };
      // });

      return parsedResponse;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error(`OpenAI API error: ${error}`);
    }
  }

  async analyzeFiles(request: BaseProviderRequest): Promise<AIAnalysisResponse> {
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
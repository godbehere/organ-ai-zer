import { FileInfo } from '../../types';

export interface AIAnalysisRequest {
  files: FileInfo[];
  baseDirectory: string;
  existingStructure?: string[];
  userPreferences?: any;
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
  reasoning: string;
}

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
  abstract analyzeFiles(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;

  protected buildPrompt(request: AIAnalysisRequest): string {
    const { files, baseDirectory, existingStructure, userPreferences } = request;
    
    return `You are an intelligent file organizer. Analyze the following files and suggest an optimal organization structure.

**Base Directory:** ${baseDirectory}

**Files to organize:**
${files.map(file => `- ${file.name} (${file.extension}, ${this.formatFileSize(file.size)}, modified: ${file.modified.toISOString().split('T')[0]})`).join('\n')}

**Existing Directory Structure:**
${existingStructure?.length ? existingStructure.join('\n') : 'No existing structure provided'}

**User Preferences:**
${userPreferences ? JSON.stringify(userPreferences, null, 2) : 'No specific preferences provided'}

**Instructions:**
1. Analyze each file's name, extension, size, and modification date
2. Consider the existing directory structure to maintain consistency
3. Suggest logical organization paths that group related files
4. Provide clear reasoning for each suggestion
5. Assign confidence scores (0.0 to 1.0) based on how certain you are about each suggestion
6. Consider common file organization patterns (by date, type, project, category)

**Response Format:**
Return a JSON object with the following structure:
{
  "suggestions": [
    {
      "fileName": "example.jpg",
      "suggestedPath": "photos/2024/03/vacation/example.jpg",
      "reason": "Image file from March 2024, appears to be vacation-related based on naming",
      "confidence": 0.85,
      "category": "photos"
    }
  ],
  "reasoning": "Overall explanation of the organization strategy used"
}

Important: Only return valid JSON. Do not include any explanatory text outside the JSON.`;
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  protected parseAIResponse(response: string): AIAnalysisResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let jsonStr = jsonMatch ? jsonMatch[0] : response;
      
      // Handle truncated JSON by attempting to fix common issues
      if (!jsonStr.endsWith('}')) {
        console.log('⚠️  Detected truncated JSON response, attempting to fix...');
        
        // Find the last complete suggestion object
        const suggestionPattern = /\{\s*"fileName":[^}]+\}/g;
        const suggestions = [];
        let match;
        
        while ((match = suggestionPattern.exec(response)) !== null) {
          try {
            const suggestion = JSON.parse(match[0]);
            suggestions.push(suggestion);
          } catch (e) {
            // Skip malformed suggestions
            console.log('⚠️  Skipping malformed suggestion');
          }
        }
        
        if (suggestions.length > 0) {
          console.log(`✅ Recovered ${suggestions.length} suggestions from truncated response`);
          return {
            suggestions: suggestions.map((s: any) => ({
              file: null, // Will be filled in by the caller
              suggestedPath: s.suggestedPath,
              reason: s.reason,
              confidence: Math.min(Math.max(s.confidence || 0.5, 0), 1),
              category: s.category,
              metadata: s.metadata
            })),
            reasoning: 'Recovered from truncated response'
          };
        }
      }
      
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid response format: missing suggestions array');
      }

      return {
        suggestions: parsed.suggestions.map((s: any) => ({
          file: null, // Will be filled in by the caller
          suggestedPath: s.suggestedPath,
          reason: s.reason,
          confidence: Math.min(Math.max(s.confidence || 0.5, 0), 1),
          category: s.category,
          metadata: s.metadata
        })),
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}. Response: ${response.substring(0, 500)}...`);
    }
  }
}
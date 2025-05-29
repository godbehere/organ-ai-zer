import { FileInfo, OrganizationSuggestion } from '../types';
import { BaseAIProvider } from './ai-providers/base-ai-provider';
import { AIConversationContext, ConversationResult, ConversationConfig } from './ai-conversation-context';

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

/**
 * File Organization Conversation Manager
 * Purely AI-driven file organization through conversational interface
 */
export class FileOrganizationConversation {
  private conversationContext: AIConversationContext;
  private organizationContext: FileOrganizationContext;

  constructor(
    aiProvider: BaseAIProvider,
    files: FileInfo[],
    baseDirectory: string,
    intent: string,
    config: Partial<ConversationConfig> = {}
  ) {
    // Setup organization-specific system prompt
    const systemPrompt = this.buildOrganizationSystemPrompt();
    
    const conversationConfig: Partial<ConversationConfig> = {
      systemPrompt,
      maxTurns: 10,
      temperature: 0.4, // Slightly higher for creativity in categorization
      maxContextSize: 15000, // Larger context for file analysis
      ...config
    };

    this.conversationContext = new AIConversationContext(
      aiProvider,
      `File Organization: ${intent}`,
      conversationConfig
    );

    this.organizationContext = {
      files,
      baseDirectory,
      intent,
      rejectedSuggestions: [],
      approvedPatterns: [],
      discoveredCategories: {},
      clarifications: [],
      phase: 'analysis'
    };

    // Store organization context in conversation custom context
    this.conversationContext.setCustomContext('organization', this.organizationContext);
  }

  /**
   * Get the organization context
   */
  getOrganizationContext(): FileOrganizationContext {
    return { ...this.organizationContext };
  }

  /**
   * Get the underlying conversation context
   */
  getConversationContext(): AIConversationContext {
    return this.conversationContext;
  }

  /**
   * Set organization phase
   */
  setPhase(phase: FileOrganizationContext['phase']): void {
    this.organizationContext.phase = phase;
    this.conversationContext.setCustomContext('organization', this.organizationContext);
  }

  /**
   * Add pattern matching hints (from optional supplemental service)
   */
  addPatternHints(hints: string[]): void {
    this.organizationContext.patternHints = hints;
    this.conversationContext.setCustomContext('organization', this.organizationContext);
  }

  /**
   * Start initial AI analysis - let AI discover categories and patterns
   */
  async startAnalysis(): Promise<OrganizationConversationResult> {
    this.setPhase('analysis');
    
    const analysisPrompt = this.buildInitialAnalysisPrompt();
    
    try {
      const result = await this.conversationContext.continueWithPrompt(analysisPrompt);
      
      // Parse AI's category discoveries and initial suggestions
      const parsed = this.parseAnalysisResponse(result.response);
      
      // Store discovered categories - convert string arrays to FileInfo arrays
      if (parsed.categories) {
        const discoveredCategories: Record<string, FileInfo[]> = {};
        Object.entries(parsed.categories).forEach(([category, fileNames]) => {
          discoveredCategories[category] = (fileNames as string[]).map(fileName =>
            this.organizationContext.files.find(f => f.name === fileName)
          ).filter(Boolean) as FileInfo[];
        });
        this.organizationContext.discoveredCategories = discoveredCategories;
        this.conversationContext.setCustomContext('organization', this.organizationContext);
      }

      // Handle clarification questions if needed - with immediate re-analysis
      if (result.questions && result.questions.length > 0) {
        const reason = 'I need some clarification to provide better organization suggestions';
        const context = 'Initial file analysis and categorization';
        
        const clarificationsHandled = await this.handleClarifications(
          result.questions,
          reason,
          ClarificationPhase.INITIAL_ANALYSIS,
          context
        );

        if (clarificationsHandled) {
          // Immediately re-run analysis with new clarifications
          console.log('🔄 Re-analyzing with your clarifications...\n');
          return this.startAnalysis(); // Recursive call with new context
        }
      }

      return {
        ...result,
        suggestions: parsed.suggestions || [],
        discoveredCategories: parsed.categories,
        needsClarification: undefined // No clarification needed since we handled it
      };
    } catch (error) {
      throw new Error(`Failed to start AI analysis: ${error}`);
    }
  }

  /**
   * Continue conversation with user input
   */
  async continueConversation(userMessage: string): Promise<OrganizationConversationResult> {
    this.setPhase('conversation');
    
    try {
      const result = await this.conversationContext.sendMessage(userMessage);
      
      // Parse any new suggestions or category updates
      const parsed = this.parseConversationResponse(result.response);
      
      // Update context with any new discoveries
      if (parsed.categories) {
        const newCategories: Record<string, FileInfo[]> = {};
        Object.entries(parsed.categories).forEach(([category, fileNames]) => {
          newCategories[category] = (fileNames as string[]).map(fileName =>
            this.organizationContext.files.find(f => f.name === fileName)
          ).filter(Boolean) as FileInfo[];
        });
        
        this.organizationContext.discoveredCategories = {
          ...this.organizationContext.discoveredCategories,
          ...newCategories
        };
        this.conversationContext.setCustomContext('organization', this.organizationContext);
      }

      return {
        ...result,
        suggestions: parsed.suggestions || [],
        discoveredCategories: parsed.categories,
        needsClarification: result.questions ? {
          questions: result.questions,
          reason: 'AI needs more information to provide better organization'
        } : undefined
      };
    } catch (error) {
      throw new Error(`Conversation failed: ${error}`);
    }
  }

  /**
   * Generate final organization suggestions
   */
  async generateFinalSuggestions(): Promise<OrganizationConversationResult> {
    this.setPhase('organization');
    
    try {
      // Use the standard AI provider interface for final suggestions (not custom prompt)
      // This ensures we get proper JSON response with suggestions array
      const contextSummary = this.buildContextSummary();
      
      // Get AI provider from conversation context
      const aiProvider = (this.conversationContext as any).aiProvider;
      
      const response = await aiProvider.analyzeFiles({
        files: this.organizationContext.files,
        baseDirectory: this.organizationContext.baseDirectory,
        existingStructure: [],
        userPreferences: {
          intent: this.organizationContext.intent,
          rejectedPatterns: this.organizationContext.rejectedSuggestions.map(s => s.suggestedPath),
          approvedPatterns: this.organizationContext.approvedPatterns,
          contextSummary: contextSummary,
          clarifications: this.getClarificationsContext(),
          // Increase token limit for final suggestions to handle all files
          maxTokens: Math.max(4000, this.organizationContext.files.length * 150), // ~150 tokens per file suggestion
          temperature: 0.3 // Lower temperature for final suggestions
        }
      });
      
      // Handle clarification questions if needed during suggestions
      if (response.clarificationNeeded && response.clarificationNeeded.questions) {
        const clarificationsHandled = await this.handleClarifications(
          response.clarificationNeeded.questions,
          response.clarificationNeeded.reason || 'I need clarification to provide better organization suggestions',
          ClarificationPhase.SUGGESTIONS,
          'Final organization suggestions generation'
        );

        if (clarificationsHandled) {
          // Immediately re-run suggestions generation with new clarifications
          console.log('🔄 Regenerating suggestions with your clarifications...\n');
          return this.generateFinalSuggestions(); // Recursive call with new context
        }
      }

      const suggestions = response.suggestions.map((suggestion: any) => ({
        file: this.organizationContext.files.find(f => f.name === suggestion.suggestedPath.split('/').pop()) || 
              this.organizationContext.files.find(f => f.name === suggestion.fileName) ||
              suggestion.file!,
        suggestedPath: suggestion.suggestedPath,
        reason: suggestion.reason,
        confidence: suggestion.confidence,
        category: suggestion.category,
        metadata: suggestion.metadata
      }));
      
      return {
        response: response.reasoning,
        suggestions,
        needsInput: false,
        needsClarification: undefined // No clarification needed since we handled it
      };
    } catch (error) {
      throw new Error(`Failed to generate final suggestions: ${error}`);
    }
  }

  /**
   * Process user feedback on suggestions
   */
  async processFeedback(feedback: OrganizationFeedback): Promise<OrganizationConversationResult> {
    let feedbackMessage = '';

    if (feedback.approved) {
      feedbackMessage = 'Perfect! I approve these organization suggestions. Please proceed with the organization.';
      this.setPhase('organization');
      return this.generateFinalSuggestions();
    }

    // Build conversational feedback message
    if (feedback.feedback) {
      feedbackMessage = feedback.feedback;
    } else {
      feedbackMessage = 'I have some concerns about these suggestions. ';
      
      if (feedback.specificIssues && feedback.specificIssues.length > 0) {
        feedbackMessage += `Specifically: ${feedback.specificIssues.join(', ')}. `;
      }
      
      if (feedback.selectedSuggestions && feedback.selectedSuggestions.length > 0) {
        this.organizationContext.rejectedSuggestions.push(...feedback.selectedSuggestions);
        feedbackMessage += `I don't like how these files are organized: ${feedback.selectedSuggestions.map(s => s.suggestedPath).slice(0, 3).join(', ')}.`;
      }
    }

    return this.continueConversation(feedbackMessage);
  }

  /**
   * Handle clarification questions from AI at any phase
   */
  async handleClarifications(
    questions: string[], 
    reason: string, 
    phase: ClarificationPhase,
    context: string = ''
  ): Promise<boolean> {
    if (!questions || questions.length === 0) {
      return false;
    }

    console.log(`\n🤔 ${reason}\n`);

    const clarifications: Clarification[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`❓ Question ${i + 1}/${questions.length}:`);
      
      const { answer } = await (await import('inquirer')).default.prompt([
        {
          type: 'input',
          name: 'answer',
          message: question,
          validate: (input: string) => input.trim().length > 0 || 'Please provide an answer'
        }
      ]);

      const clarification: Clarification = {
        id: `${phase}_${Date.now()}_${i}`,
        phase,
        question,
        answer: answer.trim(),
        context: context || `Clarification during ${phase} phase`,
        timestamp: new Date()
      };

      clarifications.push(clarification);
      console.log(`✅ Answer recorded: ${answer}\n`);
    }

    // Store clarifications
    this.organizationContext.clarifications.push(...clarifications);
    this.conversationContext.setCustomContext('organization', this.organizationContext);

    console.log(`📝 Recorded ${clarifications.length} clarification(s). Let me reconsider with this new information...\n`);
    
    return true;
  }

  /**
   * Get clarifications for a specific phase
   */
  getClarificationsForPhase(phase: ClarificationPhase): Clarification[] {
    return this.organizationContext.clarifications.filter(c => c.phase === phase);
  }

  /**
   * Get all clarifications as formatted context for AI
   */
  getClarificationsContext(): string {
    if (this.organizationContext.clarifications.length === 0) {
      return 'No clarifications provided yet.';
    }

    return this.organizationContext.clarifications
      .map((c, index) => `${index + 1}. [${c.phase}] Q: ${c.question} A: ${c.answer}`)
      .join('\n');
  }

  /**
   * Complete the organization conversation
   */
  complete(): void {
    this.setPhase('complete');
    this.conversationContext.complete();
  }

  /**
   * Build organization-specific system prompt - purely AI-driven
   */
  private buildOrganizationSystemPrompt(): string {
    return `You are an intelligent file organization AI assistant. Your role is to analyze files and discover logical organization patterns through conversation with the user.

**CORE CAPABILITIES:**
- Analyze file names, extensions, sizes, and dates to discover content patterns
- Identify custom categories based on actual file content and naming patterns  
- Suggest logical organization structures that make sense for the specific files
- Maintain consistency across similar content types
- Adapt and learn from user feedback throughout the conversation
- Ask clarifying questions when genuinely needed to understand user preferences

**AI-DRIVEN ANALYSIS APPROACH:**
- Do NOT rely on hardcoded file type assumptions
- Analyze actual file names and patterns to discover what types of content exist
- Look for naming patterns, series indicators, version numbers, dates, etc.
- Identify potential projects, collections, series, or related groups
- Suggest custom categories that make sense for the specific files being organized
- Recognize when files belong together (e.g., project files, photo albums, document series)

**DISCOVERY PROCESS:**
1. **Pattern Recognition**: Analyze file names for patterns, sequences, versions, dates
2. **Content Inference**: Infer content type from naming conventions and context
3. **Grouping Logic**: Identify which files should be grouped together
4. **Category Creation**: Suggest meaningful category names based on discovered content
5. **Structure Design**: Propose folder hierarchies that make logical sense

**CONVERSATIONAL PRINCIPLES:**
- Keep the interaction natural and conversational
- Don't bombard with questions - ask only what's needed
- Explain your reasoning clearly
- Build on previous conversation context
- Acknowledge and incorporate user feedback
- Focus on practical, actionable organization strategies

**FLEXIBILITY REQUIREMENTS:**
- Work with any type of files (not just media)
- Discover custom categories specific to the user's content
- Adapt organization patterns based on what the files actually are
- Support any domain: research papers, photos, projects, documents, media, etc.

**MEDIA FILES:**
- Critical to ensure naming conventions are consistent
- Once a naming pattern is established for a category, apply it consistently

**CODING PROJECTS:**
- Identify related files that belong to the same project
- If a project is identified, structure must be maintained

**RESPONSE STYLE:**
- Be conversational and helpful
- Explain your analysis and reasoning
- Provide structured data when making suggestions
- Ask specific questions only when needed for better organization
- Focus on the user's intent and preferences`;
  }

  /**
   * Build initial analysis prompt
   */
  private buildInitialAnalysisPrompt(): string {
    const patternHints = this.organizationContext.patternHints ? 
      `\n\n**PATTERN ANALYSIS HINTS:**\n${this.organizationContext.patternHints.join('\n')}` : '';

    return `**INITIAL FILE ANALYSIS REQUEST**

**User's Intent:** ${this.organizationContext.intent}

**Base Directory:** ${this.organizationContext.baseDirectory}

**Files to Analyze (${this.organizationContext.files.length} total):**
${this.organizationContext.files.map((file, index) => 
  `${index + 1}. ${file.name} (${file.extension}, ${this.formatFileSize(file.size)}, modified: ${file.modified.toISOString().split('T')[0]})`
).join('\n')}${patternHints}

**ANALYSIS TASK:**
Please analyze these files and help me understand what we're working with. I'd like you to:

1. **Discover Content Types**: What types of content do you see? Look at file names, patterns, and extensions to infer what these files actually are.

2. **Identify Patterns**: Are there naming patterns, series, versions, dates, or other indicators that suggest how these files are related?

3. **Suggest Categories**: Based on your analysis, what custom categories would make sense for organizing these specific files?

4. **Initial Organization Ideas**: Do you have any initial thoughts on how these could be logically organized?

Please be conversational in your response and explain your analysis. If you need clarification about my preferences or see multiple valid organization approaches, feel free to ask.

**RESPONSE FORMAT:**
Please respond conversationally, but include a JSON block with your discoveries:

\`\`\`json
{
  "discoveredCategories": {
    "Category Name": ["file1.ext", "file2.ext"],
    "Another Category": ["file3.ext"]
  },
  "patterns": ["Pattern 1 description", "Pattern 2 description"],
  "suggestions": [
    {
      "fileName": "example.ext",
      "suggestedPath": "Category/example.ext", 
      "reason": "Why this organization makes sense",
      "confidence": 0.8
    }
  ],
  "clarificationNeeded": ["Question 1?", "Question 2?"]
}
\`\`\``;
  }

  /**
   * Build final suggestions prompt
   */
  private buildFinalSuggestionsPrompt(): string {
    const contextSummary = this.buildContextSummary();
    
    return `**FINAL ORGANIZATION SUGGESTIONS REQUEST**

${contextSummary}

**FILES TO ORGANIZE:**
${this.organizationContext.files.map((file, index) => 
  `${index + 1}. ${file.name}`
).join('\n')}

Based on our conversation, please provide final organization suggestions for ALL ${this.organizationContext.files.length} files. Make sure every file has a specific organization suggestion.

**REQUIREMENTS:**
- Provide exactly ${this.organizationContext.files.length} suggestions (one for each file)
- Use the categories and patterns we've discussed
- Maintain consistency within each category
- Consider all feedback provided

**RESPONSE FORMAT:**
\`\`\`json
{
  "suggestions": [
    {
      "fileName": "exact_filename.ext",
      "suggestedPath": "Category/Subcategory/filename.ext",
      "reason": "Clear explanation",
      "confidence": 0.9,
      "category": "category_name"
    }
  ],
  "reasoning": "Overall organization strategy explanation"
}
\`\`\`

Please ensure every file is included in your suggestions.`;
  }

  /**
   * Build context summary for prompts
   */
  private buildContextSummary(): string {
    const sections: string[] = [];

    sections.push(`**Conversation Context:**`);
    sections.push(`- User Intent: ${this.organizationContext.intent}`);
    sections.push(`- Phase: ${this.organizationContext.phase}`);
    sections.push(`- Base Directory: ${this.organizationContext.baseDirectory}`);

    if (Object.keys(this.organizationContext.discoveredCategories).length > 0) {
      sections.push(`- Discovered Categories: ${Object.keys(this.organizationContext.discoveredCategories).join(', ')}`);
    }

    if (this.organizationContext.rejectedSuggestions.length > 0) {
      const rejectedPaths = this.organizationContext.rejectedSuggestions.slice(0, 5).map(s => s.suggestedPath);
      sections.push(`- Rejected Approaches: ${rejectedPaths.join(', ')}${this.organizationContext.rejectedSuggestions.length > 5 ? '...' : ''}`);
    }

    if (this.organizationContext.approvedPatterns.length > 0) {
      sections.push(`- Approved Patterns: ${this.organizationContext.approvedPatterns.join(', ')}`);
    }

    if (this.organizationContext.clarifications.length > 0) {
      sections.push(`- User Clarifications: ${this.organizationContext.clarifications.length} provided`);
    }

    return sections.join('\n');
  }

  /**
   * Parse AI analysis response
   */
  private parseAnalysisResponse(response: string): {
    categories?: Record<string, string[]>;
    suggestions?: OrganizationSuggestion[];
    patterns?: string[];
  } {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) return {};

      const parsed = JSON.parse(jsonMatch[1]);
      
      const result: any = {};
      
      // Handle different category field names the AI might use
      if (parsed.discoveredCategories) {
        result.categories = parsed.discoveredCategories;
      } else if (parsed.discoveredContentTypes) {
        result.categories = parsed.discoveredContentTypes;
      } else if (parsed.categories) {
        result.categories = parsed.categories;
      } else if (parsed.contentTypes) {
        result.categories = parsed.contentTypes;
      }
      
      if (parsed.suggestions) {
        result.suggestions = parsed.suggestions.map((s: any) => ({
          file: this.organizationContext.files.find(f => f.name === s.fileName)!,
          suggestedPath: s.suggestedPath,
          reason: s.reason,
          confidence: s.confidence || 0.7,
          category: s.category
        }));
      }
      
      if (parsed.patterns) {
        result.patterns = parsed.patterns;
      }

      return result;
    } catch (error) {
      console.warn('Failed to parse AI analysis response:', error);
      return {};
    }
  }

  /**
   * Parse conversation response
   */
  private parseConversationResponse(response: string): {
    categories?: Record<string, string[]>;
    suggestions?: OrganizationSuggestion[];
  } {
    // Similar to parseAnalysisResponse but more lenient
    return this.parseAnalysisResponse(response);
  }

  /**
   * Parse final suggestions
   */
  private parseFinalSuggestions(response: string): OrganizationSuggestion[] {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error('No JSON suggestions found');
      }

      const parsed = JSON.parse(jsonMatch[1]);
      
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid suggestions format');
      }

      return parsed.suggestions.map((s: any) => {
        const file = this.organizationContext.files.find(f => f.name === s.fileName);
        if (!file) {
          throw new Error(`File not found: ${s.fileName}`);
        }
        
        return {
          file,
          suggestedPath: s.suggestedPath,
          reason: s.reason,
          confidence: s.confidence || 0.8,
          category: s.category,
          metadata: s.metadata
        };
      });
    } catch (error) {
      // Fallback: create basic suggestions
      console.warn('Failed to parse final suggestions, using fallback:', error);
      return this.organizationContext.files.map((file) => ({
        file,
        suggestedPath: `Organized/${file.name}`,
        reason: 'Fallback organization due to parsing error',
        confidence: 0.5
      }));
    }
  }

  /**
   * Format file size
   */
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
}
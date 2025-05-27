import inquirer from 'inquirer';
import { FileInfo, OrganizationSuggestion, UserConfig } from '../types';
import { ConfigService } from './config-service';
import { OpenAIProvider, AnthropicProvider, BaseAIProvider } from './ai-providers';
import { FileScanner } from './file-scanner';
import * as path from 'path';

interface ConversationContext {
  intent: string;
  clarifications: string[];
  rejectedSuggestions: OrganizationSuggestion[];
  approvedPatterns: string[];
  fileCategories: Record<string, FileInfo[]>;
}

export class InteractiveAIOrganizer {
  private configService: ConfigService;
  private aiProvider: BaseAIProvider | null = null;
  private fileScanner = new FileScanner();

  constructor(configService?: ConfigService) {
    this.configService = configService || ConfigService.getInstance();
  }

  async organizeWithConversation(
    files: FileInfo[],
    baseDirectory: string,
    initialIntent: string
  ): Promise<OrganizationSuggestion[]> {
    const config = await this.configService.loadConfig();
    await this.initializeAIProvider(config);

    // Initialize conversation context
    const context: ConversationContext = {
      intent: initialIntent,
      clarifications: [],
      rejectedSuggestions: [],
      approvedPatterns: [],
      fileCategories: this.categorizeFiles(files)
    };

    console.log('🤖 Starting AI analysis and conversation...\n');

    // Main conversation loop
    let attempt = 0;
    const maxAttempts = 5;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`🔄 Analysis attempt ${attempt}/${maxAttempts}...\n`);

      try {
        // Generate suggestions based on current context
        const suggestions = await this.generateContextualSuggestions(files, baseDirectory, context);
        
        if (suggestions.length === 0) {
          console.log('❌ No suggestions generated. Let\'s try refining your requirements...\n');
          await this.gatherMoreContext(context);
          continue;
        }

        // Present suggestions and gather feedback
        const feedback = await this.presentSuggestionsAndGetFeedback(suggestions, context);
        
        if (feedback.approved) {
          console.log('✅ Organization plan approved!\n');
          return suggestions;
        }

        // Process feedback and continue conversation
        await this.processFeedbackAndRefine(feedback, context);
        
      } catch (error) {
        console.error('❌ Error during AI analysis:', error);
        
        const { shouldContinue } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldContinue',
            message: 'Would you like to try again with different parameters?',
            default: true
          }
        ]);

        if (!shouldContinue) {
          throw error;
        }

        await this.gatherMoreContext(context);
      }
    }

    throw new Error('Maximum conversation attempts reached. Please try with a simpler organization request.');
  }

  private async generateContextualSuggestions(
    files: FileInfo[],
    baseDirectory: string,
    context: ConversationContext
  ): Promise<OrganizationSuggestion[]> {
    const prompt = this.buildConversationalPrompt(files, baseDirectory, context);
    
    const response = await this.aiProvider!.analyzeFiles({
      files,
      baseDirectory,
      existingStructure: [],
      userPreferences: {
        intent: context.intent,
        clarifications: context.clarifications,
        rejectedPatterns: context.rejectedSuggestions.map(s => s.suggestedPath),
        approvedPatterns: context.approvedPatterns
      }
    });

    return response.suggestions.map(suggestion => ({
      ...suggestion,
      file: files.find(f => f.name === suggestion.suggestedPath.split('/').pop()) || files[0]
    })).filter(s => s.file);
  }

  private buildConversationalPrompt(
    files: FileInfo[],
    baseDirectory: string,
    context: ConversationContext
  ): string {
    let prompt = `You are an intelligent file organizer having a conversation with a user about organizing their files.

**User's Intent:** ${context.intent}

**Additional Context from Conversation:**
${context.clarifications.length > 0 ? context.clarifications.join('\n') : 'No additional clarifications yet.'}

**Previously Rejected Organization Patterns:**
${context.rejectedSuggestions.length > 0 ? 
  context.rejectedSuggestions.map(s => `- ${s.suggestedPath} (Reason: ${s.reason})`).join('\n') : 
  'No rejected patterns yet.'}

**Approved Organization Patterns:**
${context.approvedPatterns.length > 0 ? context.approvedPatterns.join('\n') : 'No approved patterns yet.'}

**Files to Organize:**
${files.slice(0, 20).map(f => `- ${f.name} (${f.extension}, ${this.formatFileSize(f.size)}, modified: ${f.modified.toISOString().split('T')[0]})`).join('\n')}
${files.length > 20 ? `... and ${files.length - 20} more files` : ''}

**Base Directory:** ${baseDirectory}

**Instructions:**
1. Analyze the user's intent and any conversation context
2. Create an organization structure that matches their specific requirements
3. Pay special attention to rejected patterns and avoid similar approaches
4. Incorporate any approved patterns into your suggestions
5. For media files, consider series/seasons, genres, years, quality, etc. as mentioned by the user
6. Be consistent with naming conventions and folder structures
7. Group related files together logically

**Response Format:**
Return a JSON object with the following structure:
{
  "suggestions": [
    {
      "fileName": "example.mkv",
      "suggestedPath": "Movies/Action/2023/The_Movie_Title_2023_1080p.mkv",
      "reason": "Action movie from 2023, organized by genre and year with quality indicator",
      "confidence": 0.9,
      "category": "movies"
    }
  ],
  "reasoning": "Overall explanation of the organization strategy based on user intent"
}

Important: Only return valid JSON. Consider the user's specific requirements and conversation history.`;

    return prompt;
  }

  private async presentSuggestionsAndGetFeedback(
    suggestions: OrganizationSuggestion[],
    context: ConversationContext
  ): Promise<{
    approved: boolean;
    feedback?: string;
    specificIssues?: string[];
    selectedSuggestions?: OrganizationSuggestion[];
  }> {
    // Show a sample of suggestions
    const sampleSize = Math.min(10, suggestions.length);
    const sampleSuggestions = suggestions.slice(0, sampleSize);
    
    console.log(`📋 Proposed Organization (showing ${sampleSize} of ${suggestions.length} files):\n`);
    
    sampleSuggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion.file.name}`);
      console.log(`   → ${suggestion.suggestedPath}`);
      console.log(`   Reason: ${suggestion.reason}\n`);
    });

    if (suggestions.length > sampleSize) {
      console.log(`... and ${suggestions.length - sampleSize} more files organized similarly.\n`);
    }

    // Get user feedback
    const { initialFeedback } = await inquirer.prompt([
      {
        type: 'list',
        name: 'initialFeedback',
        message: 'How do these organization suggestions look?',
        choices: [
          { name: '✅ Perfect! Apply this organization', value: 'approve' },
          { name: '🔧 Good direction, but needs some adjustments', value: 'adjust' },
          { name: '❌ Not what I want, let me explain differently', value: 'reject' },
          { name: '❓ I need to see more examples first', value: 'more_examples' }
        ]
      }
    ]);

    switch (initialFeedback) {
      case 'approve':
        return { approved: true };

      case 'more_examples':
        // Show more examples
        const remainingSuggestions = suggestions.slice(sampleSize, sampleSize + 10);
        if (remainingSuggestions.length > 0) {
          console.log('\n📋 Additional Examples:\n');
          remainingSuggestions.forEach((suggestion, index) => {
            console.log(`${sampleSize + index + 1}. ${suggestion.file.name}`);
            console.log(`   → ${suggestion.suggestedPath}`);
            console.log(`   Reason: ${suggestion.reason}\n`);
          });
        }
        return this.presentSuggestionsAndGetFeedback(suggestions, context);

      case 'adjust':
        const { adjustmentFeedback } = await inquirer.prompt([
          {
            type: 'input',
            name: 'adjustmentFeedback',
            message: 'What adjustments would you like? (be specific about folder structure, naming, etc.):',
            validate: (input) => input.trim().length > 5 || 'Please provide more specific feedback'
          }
        ]);
        return { approved: false, feedback: adjustmentFeedback };

      case 'reject':
        const { rejectionFeedback } = await inquirer.prompt([
          {
            type: 'input',
            name: 'rejectionFeedback',
            message: 'Please explain how you would prefer the files to be organized:',
            validate: (input) => input.trim().length > 10 || 'Please provide a more detailed explanation'
          }
        ]);
        return { approved: false, feedback: rejectionFeedback, selectedSuggestions: suggestions };

      default:
        return { approved: false };
    }
  }

  private async processFeedbackAndRefine(
    feedback: { approved: boolean; feedback?: string; selectedSuggestions?: OrganizationSuggestion[] },
    context: ConversationContext
  ): Promise<void> {
    if (feedback.feedback) {
      context.clarifications.push(feedback.feedback);
      console.log('📝 Added your feedback to the conversation context.\n');
    }

    if (feedback.selectedSuggestions) {
      context.rejectedSuggestions.push(...feedback.selectedSuggestions);
    }

    // Ask for specific clarifications based on the feedback
    await this.askSpecificQuestions(context);
  }

  private async askSpecificQuestions(context: ConversationContext): Promise<void> {
    const { needsMoreInfo } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'needsMoreInfo',
        message: 'Would you like to answer a few specific questions to help me understand better?',
        default: true
      }
    ]);

    if (!needsMoreInfo) return;

    // Ask relevant questions based on file types
    const questions = this.generateContextualQuestions(context);
    
    if (questions.length > 0) {
      console.log('\n❓ Let me ask a few questions to better understand your preferences:\n');
      const answers = await inquirer.prompt(questions);
      
      // Convert answers to clarifications
      Object.entries(answers).forEach(([key, value]) => {
        if (value && value !== '') {
          context.clarifications.push(`${key}: ${value}`);
        }
      });
    }
  }

  private generateContextualQuestions(context: ConversationContext): any[] {
    const questions = [];
    const categories = Object.keys(context.fileCategories);

    if (categories.includes('Videos')) {
      questions.push({
        type: 'input',
        name: 'video_organization',
        message: 'For video files, how would you like to distinguish between movies and TV shows?',
        default: ''
      });

      questions.push({
        type: 'input',
        name: 'video_structure',
        message: 'What folder structure do you prefer? (e.g., "Movies/Genre/Year" or "Media/Movies/Title")',
        default: ''
      });
    }

    if (categories.includes('Images')) {
      questions.push({
        type: 'input',
        name: 'image_organization',
        message: 'How would you like images organized? (e.g., by date, event, type)',
        default: ''
      });
    }

    if (categories.includes('Audio')) {
      questions.push({
        type: 'input',
        name: 'music_organization',
        message: 'For music files, do you prefer Artist/Album structure or Genre/Artist?',
        default: ''
      });
    }

    questions.push({
      type: 'input',
      name: 'naming_convention',
      message: 'Any specific naming conventions you prefer? (e.g., spaces vs underscores, year formats)',
      default: ''
    });

    return questions.slice(0, 3); // Limit to 3 questions to avoid overwhelming
  }

  private async gatherMoreContext(context: ConversationContext): Promise<void> {
    const { additionalContext } = await inquirer.prompt([
      {
        type: 'input',
        name: 'additionalContext',
        message: 'Please provide more details about how you want your files organized:',
        validate: (input) => input.trim().length > 5 || 'Please provide more details'
      }
    ]);

    context.clarifications.push(additionalContext);
  }

  private categorizeFiles(files: FileInfo[]): Record<string, FileInfo[]> {
    const categories: Record<string, FileInfo[]> = {};
    
    files.forEach(file => {
      const category = this.fileScanner.getFileCategory(file);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(file);
    });

    return categories;
  }

  private async initializeAIProvider(config: UserConfig): Promise<void> {
    const aiConfig = {
      apiKey: config.ai.apiKey,
      model: config.ai.model,
      maxTokens: Math.max(config.ai.maxTokens || 1000, 2000), // Higher token limit for conversations
      temperature: Math.max(config.ai.temperature || 0.3, 0.5), // Slightly higher temperature for creativity
      timeout: config.ai.timeout
    };

    switch (config.ai.provider) {
      case 'openai':
        this.aiProvider = new OpenAIProvider(aiConfig);
        break;
      case 'anthropic':
        this.aiProvider = new AnthropicProvider(aiConfig);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${config.ai.provider}`);
    }
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
}
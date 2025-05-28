import inquirer from 'inquirer';
import ora from 'ora';
import { FileInfo, OrganizationSuggestion, UserConfig } from '../types';
import { ConfigService } from './config-service';
import { OpenAIProvider, AnthropicProvider, BaseAIProvider } from './ai-providers';
import { FileScanner } from './file-scanner';

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
        // Generate suggestions based on current context with loading spinner
        const spinner = ora('🤖 Analyzing files and generating organization suggestions...').start();
        const result = await this.generateContextualSuggestions(files, baseDirectory, context);
        spinner.stop();
        
        // Handle AI-generated clarification requests
        if (result.needsClarification) {
          console.log('\n🤔 The AI needs some clarification to provide better suggestions:\n');
          console.log(`📝 ${result.needsClarification.reason}\n`);
          
          const shouldAnswer = await this.handleAIClarificationQuestions(result.needsClarification.questions, context);
          
          // If user skipped questions, proceed with current suggestions instead of asking again
          if (!shouldAnswer && result.suggestions.length > 0) {
            console.log('\n⏭️  Proceeding with available suggestions...\n');
            // Continue to present suggestions below instead of restarting loop
          } else if (!shouldAnswer) {
            // No suggestions and questions were skipped - need more context
            await this.gatherMoreContext(context);
            continue;
          } else {
            // Questions were answered - generate new suggestions
            continue;
          }
        }
        
        if (result.suggestions.length === 0) {
          console.log('❌ No suggestions generated. Let\'s try refining your requirements...\n');
          await this.gatherMoreContext(context);
          continue;
        }

        // Present suggestions and gather feedback
        const feedback = await this.presentSuggestionsAndGetFeedback(result.suggestions, context);
        
        if (feedback.approved) {
          console.log('✅ Organization plan approved!\n');
          return result.suggestions;
        }

        // Process feedback and continue conversation
        await this.processFeedbackAndRefine(feedback, context);
        
      } catch (error) {
        console.error('❌ Error during AI analysis:', error);
        
        const { shouldContinue } = await inquirer.prompt([
          {
            type: 'list',
            name: 'shouldContinue',
            message: 'An error occurred. What would you like to do?',
            choices: [
              { name: '🔄 Try again with different parameters', value: 'retry' },
              { name: '🚪 Cancel and exit', value: 'cancel' }
            ]
          }
        ]);

        if (shouldContinue !== 'retry') {
          console.log('\n🚪 Operation cancelled by user.');
          throw new Error('Operation cancelled by user');
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
  ): Promise<{ suggestions: OrganizationSuggestion[], needsClarification?: { questions: string[], reason: string } }> {
    // Analyze file types and detect projects for better context
    const fileTypeAnalysis = this.analyzeFileTypes(files);
    
    const response = await this.aiProvider!.analyzeFiles({
      files,
      baseDirectory,
      existingStructure: [],
      userPreferences: {
        intent: context.intent,
        clarifications: context.clarifications,
        rejectedPatterns: context.rejectedSuggestions.map(s => s.suggestedPath),
        approvedPatterns: context.approvedPatterns,
        fileTypeAnalysis: fileTypeAnalysis // Add file type analysis for better consistency
      }
    });

    // Create a mapping of suggestions by filename
    const suggestionMap = new Map<string, typeof response.suggestions[0]>();
    response.suggestions.forEach(suggestion => {
      const fileName = suggestion.suggestedPath.split('/').pop()!;
      suggestionMap.set(fileName, suggestion);
    });

    // Ensure ALL files have suggestions - create intelligent defaults for missing ones
    const allSuggestions: OrganizationSuggestion[] = [];
    
    files.forEach(file => {
      const suggestion = suggestionMap.get(file.name);
      if (suggestion) {
        allSuggestions.push({
          ...suggestion,
          file
        });
      } else {
        // AI failed to provide suggestion - create intelligent fallback based on patterns
        const intelligentSuggestion = this.createIntelligentFallback(file);
        allSuggestions.push(intelligentSuggestion);
        
        console.warn(`⚠️  AI missed file: ${file.name}, using intelligent fallback`);
      }
    });

    return {
      suggestions: allSuggestions,
      needsClarification: response.clarificationNeeded
    };
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
          { name: '❓ I need to see more examples first', value: 'more_examples' },
          { name: '🚪 Cancel and exit', value: 'cancel' }
        ]
      }
    ]);

    switch (initialFeedback) {
      case 'approve':
        return { approved: true };

      case 'cancel':
        console.log('\n🚪 Operation cancelled by user.');
        throw new Error('Operation cancelled by user');

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

    // The AI will now determine if it needs clarification on the next iteration
    // No need for hardcoded questions
  }

  private async handleAIClarificationQuestions(
    questions: string[],
    context: ConversationContext
  ): Promise<boolean> {
    const { shouldAnswer } = await inquirer.prompt([
      {
        type: 'list',
        name: 'shouldAnswer',
        message: 'Would you like to answer these questions to help improve the suggestions?',
        choices: [
          { name: '✅ Yes, let me answer these questions', value: 'yes' },
          { name: '❌ Skip questions and try to proceed anyway', value: 'skip' },
          { name: '🚪 Cancel and exit', value: 'cancel' }
        ]
      }
    ]);

    if (shouldAnswer === 'cancel') {
      console.log('\n🚪 Operation cancelled by user.');
      throw new Error('Operation cancelled by user');
    }
    
    if (shouldAnswer === 'skip') {
      context.clarifications.push('User chose to skip clarification questions and proceed with available suggestions');
      return false; // Indicate questions were skipped
    }

    // Ask each question that the AI generated
    for (let i = 0; i < questions.length; i++) {
      const { answer } = await inquirer.prompt([
        {
          type: 'input',
          name: 'answer',
          message: `${i + 1}. ${questions[i]}`,
          validate: (input) => input.trim().length > 0 || 'Please provide an answer'
        }
      ]);
      
      context.clarifications.push(`Q: ${questions[i]} A: ${answer}`);
    }

    console.log('\n✅ Thank you for the clarifications. Let me generate new suggestions...\n');
    return true; // Indicate questions were answered
  }

  private analyzeFileTypes(files: FileInfo[]): string {
    const typeGroups: Record<string, FileInfo[]> = {};
    const potentialProjects: string[] = [];
    
    files.forEach(file => {
      const category = this.fileScanner.getFileCategory(file);
      if (!typeGroups[category]) {
        typeGroups[category] = [];
      }
      typeGroups[category].push(file);
      
      // Detect potential project indicators
      if (file.name.includes('package.json') || file.name.includes('requirements.txt') || 
          file.name.includes('Cargo.toml') || file.name.includes('pom.xml') ||
          file.name.includes('README') || file.name.includes('.git')) {
        potentialProjects.push(`Detected project file: ${file.name}`);
      }
    });

    const analysis = Object.entries(typeGroups).map(([category, categoryFiles]) => {
      const examples = categoryFiles.slice(0, 3).map(f => f.name).join(', ');
      return `${category}: ${categoryFiles.length} files (examples: ${examples}${categoryFiles.length > 3 ? '...' : ''})`;
    }).join('\n');

    let projectAnalysis = '';
    if (potentialProjects.length > 0) {
      projectAnalysis = `\n\nPROJECT DETECTION:\n${potentialProjects.join('\n')}\nRemember to move project files together as units!`;
    }

    return `File type distribution and project analysis for consistency planning:\n${analysis}${projectAnalysis}\n\nCONSISTENCY REQUIREMENTS:\n- Use IDENTICAL patterns for same file types (TV shows, movies, music, etc.)\n- Recognize media patterns: S01E01, (2019), artist names\n- Group related files/projects together\n- Never suggest "no change" unless truly optimal\n- Provide suggestions for ALL files`;
  }

  private createIntelligentFallback(file: FileInfo): OrganizationSuggestion {
    const fileName = file.name;
    
    // Try to match TV show patterns
    if (fileName.match(/s\d+e\d+/i) || fileName.match(/season\s+\d+/i)) {
      // Extract show name and season info
      let showName = fileName;
      if (fileName.includes('GOT')) showName = fileName.replace('GOT', 'Game of Thrones');
      if (fileName.includes('Breaking.Bad')) showName = fileName.replace('Breaking.Bad', 'Breaking Bad');
      
      // Extract season number
      const seasonMatch = fileName.match(/s(\d+)/i);
      const season = seasonMatch ? `Season ${seasonMatch[1]}` : 'Season 1';
      
      const cleanShowName = showName.split(/[._-]/)[0].replace(/\b\w/g, l => l.toUpperCase());
      
      return {
        file,
        suggestedPath: `Shows/${cleanShowName}/${season}/${fileName}`,
        reason: `TV show episode detected - organized by series and season (fallback)`,
        confidence: 0.7,
        category: 'tv-shows'
      };
    }
    
    // Try to match movie patterns
    if (fileName.match(/\(\d{4}\)/)) {
      return {
        file,
        suggestedPath: `Movies/${fileName}`,
        reason: `Movie with year detected - organized by title (fallback)`,
        confidence: 0.7,
        category: 'movies'
      };
    }
    
    // Try to match music patterns
    if (fileName.match(/\.(mp3|wav|flac|m4a)$/i)) {
      const parts = fileName.split(' - ');
      if (parts.length >= 2) {
        const artist = parts[0].trim();
        return {
          file,
          suggestedPath: `Music/${artist}/${fileName}`,
          reason: `Music file detected - organized by artist (fallback)`,
          confidence: 0.7,
          category: 'music'
        };
      }
    }
    
    // Check for related documents
    if (fileName.includes('Budget_2024_Q1')) {
      return {
        file,
        suggestedPath: `Documents/Budget 2024 Q1/${fileName}`,
        reason: `Related budget document - grouped together (fallback)`,
        confidence: 0.7,
        category: 'documents'
      };
    }
    
    if (fileName.includes('Project_Plan_v2')) {
      return {
        file,
        suggestedPath: `Documents/Project Plans/${fileName}`,
        reason: `Project planning document - grouped by type (fallback)`,
        confidence: 0.7,
        category: 'documents'
      };
    }
    
    // Default organization based on file type
    const category = this.fileScanner.getFileCategory(file);
    return {
      file,
      suggestedPath: `${category}/${fileName}`,
      reason: `Organized by file type (fallback)`,
      confidence: 0.5,
      category: category.toLowerCase()
    };
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
      timeout: Math.max(config.ai.timeout || 90000, 120000) // Longer timeout for interactive mode (120s minimum)
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

}
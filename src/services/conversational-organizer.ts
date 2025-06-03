import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { FileInfo, OrganizationSuggestion, UserConfig } from '../types';
import { ConfigService } from './config-service';
import { OpenAIProvider, AnthropicProvider, BaseAIProvider } from './ai-providers';
import { FileScanner } from './file-scanner';
import { PatternMatchingService } from './pattern-matching-service';
import { OrganizationConversation } from './organization-conversation';
import { FileOrganizer } from './file-organizer';

/**
 * Conversational File Organizer
 * Uses AI conversation context for natural, flexible file organization
 */
export class ConversationalOrganizer {
  private configService: ConfigService;
  private aiProvider: BaseAIProvider | null = null;
  private fileScanner = new FileScanner();
  private patternService = new PatternMatchingService();

  constructor(configService?: ConfigService) {
    this.configService = configService || ConfigService.getInstance();
  }

  /**
   * Start interactive organization conversation
   */
  async organize(
    directory: string,
    dryRun: boolean = false
  ): Promise<OrganizationSuggestion[]> {
    console.log(chalk.blue('🤖 Welcome to AI-powered file organization!\n'));

    try {
      // Initialize
      await this.initialize();
      
      // Scan files
      const files = await this.scanFiles(directory);
      if (files.length === 0) {
        console.log(chalk.yellow('No files found to organize.'));
        return [];
      }

      // Get user intent conversationally
      const intent = await this.getOrganizationIntent(files.length, directory);
      
      // Start AI conversation
      const conversation = new OrganizationConversation(
        this.aiProvider!,
        files,
        directory,
        intent,
        'ConversationalOrganizer',
      );

      // Optional: Add pattern matching hints
      const patternHints = await this.getPatternHints(files);
      if (patternHints.length > 0) {
        conversation.addPatternHints(patternHints);
      }

      // Run conversational organization
      const suggestions = await this.runConversation(conversation);
      
      if (suggestions.length === 0) {
        console.log(chalk.yellow('\nNo organization suggestions were finalized.'));
        return [];
      }

      // Execute organization (if not dry run)
      if (!dryRun) {
        await this.executeOrganization(suggestions, directory);
      } else {
        this.showDryRunSummary(suggestions);
      }

      return suggestions;

    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        console.log(chalk.yellow('\n👋 Organization cancelled. No changes were made.'));
        return [];
      }
      throw error;
    }
  }

  /**
   * Initialize AI provider
   */
  private async initialize(): Promise<void> {
    const config = await this.configService.loadConfig();
    
    const aiConfig = {
      apiKey: config.ai.apiKey,
      model: config.ai.model,
      maxTokens: Math.max(config.ai.maxTokens || 1000, 2000),
      temperature: config.ai.temperature || 0.4,
      timeout: Math.max(config.ai.timeout || 90000, 120000)
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

  /**
   * Scan files in directory
   */
  private async scanFiles(directory: string): Promise<FileInfo[]> {
    const spinner = ora('Scanning files...').start();
    
    try {
      const files = await this.fileScanner.scanDirectory(directory, true);
      spinner.succeed(`Found ${files.length} files to analyze`);
      return files;
    } catch (error) {
      spinner.fail('Failed to scan files');
      throw error;
    }
  }

  /**
   * Get user's organization intent conversationally
   */
  private async getOrganizationIntent(fileCount: number, directory: string): Promise<string> {
    console.log(chalk.cyan(`\nI found ${fileCount} files in ${directory}.\n`));
    
    const { intent } = await inquirer.prompt([
      {
        type: 'input',
        name: 'intent',
        message: 'How would you like to organize these files? (Describe what you have in mind)',
        validate: (input: string) => {
          if (input.trim().length < 5) {
            return 'Please provide a bit more detail about your organization goals';
          }
          return true;
        }
      }
    ]);

    console.log(chalk.green('\n✨ Got it! Let me analyze your files and understand what we\'re working with...\n'));
    
    return intent.trim();
  }

  /**
   * Get pattern matching hints to help AI
   */
  private async getPatternHints(files: FileInfo[]): Promise<string[]> {
    const spinner = ora('Analyzing file patterns...').start();
    
    try {
      const hints = this.patternService.getPatternHints(files);
      
      if (hints.length > 0) {
        spinner.succeed('Found helpful patterns to guide organization');
        return hints;
      } else {
        spinner.succeed('Pattern analysis complete');
        return [];
      }
    } catch (error) {
      spinner.warn('Pattern analysis had issues, proceeding with AI-only analysis');
      return [];
    }
  }

  /**
   * Run the main conversation flow
   */
  private async runConversation(conversation: OrganizationConversation): Promise<OrganizationSuggestion[]> {
    // Phase 1: Initial AI Analysis
    const analysisResult = await this.runAnalysisPhase(conversation);
    
    // Phase 2: Conversation & Refinement
    const finalSuggestions = await this.runConversationPhase(conversation, analysisResult);
    
    return finalSuggestions;
  }

  /**
   * Phase 1: AI Analysis
   */
  private async runAnalysisPhase(conversation: OrganizationConversation): Promise<any> {
    const spinner = ora('AI is analyzing your files and discovering patterns...').start();
    
    try {
      const result = await conversation.startAnalysis();
      spinner.succeed('AI analysis complete!');
      
      // Show what AI discovered
      if (result.discoveredCategories && Object.keys(result.discoveredCategories).length > 0) {
        console.log(chalk.blue('\n🔍 Here\'s what I discovered:\n'));
        Object.entries(result.discoveredCategories).forEach(([category, files]) => {
          console.log(chalk.white(`  📁 ${category}: ${(files as FileInfo[]).length} files`));
        });
        console.log();
      }

      // Handle clarification if needed
      if (result.clarificationNeeded) {
        console.log(chalk.yellow('🤔 I have a few questions to better understand your preferences:\n'));
        
        let questionPrompt: string = '';

          for (const question of result.clarificationNeeded.questions) {
            const { answer } = await inquirer.prompt([
              {
                type: 'input',
                name: 'answer',
                message: question,
                validate: (input: string) => input.trim().length > 0 || 'Please provide an answer'
              }
            ]);

            questionPrompt += `Q: ${question}\nA: ${answer}\n`;
          }
          
        const clarificationSpinner = ora('Processing clarifications...').start();
        try {
          await conversation.continueConversation(questionPrompt);
          clarificationSpinner.succeed('Clarifications processed successfully!');
        } catch (error) {
          clarificationSpinner.fail('Failed to process clarifications');
          throw error;
        }

        console.log(chalk.green('\n✅ Thanks for the clarification!\n'));
      }

      return result;
      
    } catch (error) {
      spinner.fail('AI analysis failed');
      throw error;
    }
  }

  /**
   * Phase 2: Conversation & Refinement
   */
  private async runConversationPhase(conversation: OrganizationConversation, analysisResult: any): Promise<OrganizationSuggestion[]> {
    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
      attempts++;
      
      // Generate suggestions
      const spinner = ora('Generating organization suggestions...').start();
      
      try {
        const results = await conversation.generateFinalSuggestions();
        spinner.succeed(`Generated ${results.suggestions.length} organization suggestions`);
        
        // Show suggestions to user
        const feedback = await this.presentSuggestions(results.suggestions as OrganizationSuggestion[]);
        
        if (feedback.approved) {
          console.log(chalk.green('\n🎉 Great! Your organization plan is ready.\n'));
          return results.suggestions as OrganizationSuggestion[];
        }

        // Process feedback and continue conversation
        await conversation.processFeedback(feedback);
        
        if (feedback.feedback) {
          console.log(chalk.blue('\n💭 Let me adjust the organization based on your feedback...\n'));
        }
        
      } catch (error) {
        spinner.fail(`Attempt ${attempts} failed: ${error}`);
        
        if (attempts < maxAttempts) {
          const { shouldRetry } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldRetry',
              message: 'Would you like me to try a different approach?',
              default: true
            }
          ]);
          
          if (!shouldRetry) {
            throw new Error('Organization cancelled by user');
          }
          
          // Get additional context
          const { additionalContext } = await inquirer.prompt([
            {
              type: 'input',
              name: 'additionalContext',
              message: 'Any additional details about how you\'d like the files organized?',
              validate: (input: string) => input.trim().length > 0 || 'Please provide some guidance'
            }
          ]);
          
          await conversation.continueConversation(additionalContext);
        }
      }
    }

    throw new Error('Unable to generate satisfactory organization suggestions after multiple attempts');
  }

  /**
   * Present suggestions to user and get feedback
   */
  private async presentSuggestions(suggestions: OrganizationSuggestion[]): Promise<any> {
    // Show a sample of suggestions
    const sampleSize = Math.min(8, suggestions.length);
    const sample = suggestions.slice(0, sampleSize);
    
    console.log(chalk.blue(`\n📋 Here's how I'd organize your files (showing ${sampleSize} of ${suggestions.length}):\n`));
    
    sample.forEach((suggestion, index) => {
      console.log(chalk.white(`  ${index + 1}. ${suggestion.file.name}`));
      console.log(chalk.gray(`     → ${suggestion.suggestedPath}`));
      console.log(chalk.dim(`     ${suggestion.reason}\n`));
    });

    if (suggestions.length > sampleSize) {
      console.log(chalk.gray(`  ... and ${suggestions.length - sampleSize} more files organized similarly.\n`));
    }

    // Get user feedback conversationally
    const { response } = await inquirer.prompt([
      {
        type: 'list',
        name: 'response',
        message: 'What do you think of this organization approach?',
        choices: [
          { name: '✅ Perfect! Apply this organization', value: 'approve' },
          { name: '🔧 Good direction, but I\'d like some adjustments', value: 'adjust' },
          { name: '❌ This isn\'t what I had in mind', value: 'reject' },
          { name: '👀 Let me see a few more examples first', value: 'more_examples' },
          { name: '🚪 Cancel organization', value: 'cancel' }
        ]
      }
    ]);

    switch (response) {
      case 'approve':
        return { approved: true };

      case 'cancel':
        throw new Error('Organization cancelled by user');

      case 'more_examples':
        // Show more examples
        if (suggestions.length > sampleSize) {
          const additionalSample = suggestions.slice(sampleSize, sampleSize + 5);
          console.log(chalk.blue('\n📋 Here are a few more examples:\n'));
          
          additionalSample.forEach((suggestion, index) => {
            console.log(chalk.white(`  ${sampleSize + index + 1}. ${suggestion.file.name}`));
            console.log(chalk.gray(`     → ${suggestion.suggestedPath}`));
            console.log(chalk.dim(`     ${suggestion.reason}\n`));
          });
        }
        return this.presentSuggestions(suggestions); // Ask again

      case 'adjust':
        const { adjustmentFeedback } = await inquirer.prompt([
          {
            type: 'input',
            name: 'adjustmentFeedback',
            message: 'What adjustments would you like me to make?',
            validate: (input: string) => input.trim().length > 5 || 'Please be specific about what you\'d like changed'
          }
        ]);
        
        return { approved: false, feedback: adjustmentFeedback };

      case 'reject':
        const { rejectionFeedback } = await inquirer.prompt([
          {
            type: 'input',
            name: 'rejectionFeedback',
            message: 'How would you prefer the files to be organized instead?',
            validate: (input: string) => input.trim().length > 10 || 'Please provide more detail about your preferred approach'
          }
        ]);
        
        return { approved: false, feedback: rejectionFeedback };

      default:
        return { approved: false };
    }
  }

  /**
   * Execute the organization
   */
  private async executeOrganization(suggestions: OrganizationSuggestion[], baseDirectory: string): Promise<void> {
    const { confirmExecute } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmExecute',
        message: `Ready to organize ${suggestions.length} files. Proceed?`,
        default: true
      }
    ]);

    if (!confirmExecute) {
      throw new Error('Organization cancelled by user');
    }

    const config = await this.configService.loadConfig();
    
    // Create backup if enabled
    if (config.organization.createBackups) {
      const spinner = ora('Creating backup...').start();
      try {
        const fileOrganizer = new FileOrganizer();
        const backupPath = await fileOrganizer.createBackup(suggestions[0].file.path.split('/').slice(0, -1).join('/'));
        spinner.succeed(`Backup created: ${backupPath}`);
      } catch (error) {
        spinner.warn('Backup creation failed, continuing without backup');
      }
    }

    const spinner = ora('Organizing files...').start();
    
    try {
      const FileOrganizer = (await import('./file-organizer')).FileOrganizer;
      const fileOrganizer = new FileOrganizer();
      await fileOrganizer.applySuggestions(suggestions, baseDirectory);
      
      spinner.succeed(`Successfully organized ${suggestions.length} files!`);
      console.log(chalk.green('\n🎉 File organization complete!\n'));
      
    } catch (error) {
      spinner.fail('Failed to organize files');
      throw error;
    }
  }

  /**
   * Show dry run summary
   */
  private showDryRunSummary(suggestions: OrganizationSuggestion[]): void {
    console.log(chalk.yellow('\n📋 DRY RUN SUMMARY\n'));
    console.log(chalk.white(`Would organize ${suggestions.length} files:\n`));
    
    // Group by destination directory
    const groups = new Map<string, OrganizationSuggestion[]>();
    suggestions.forEach(suggestion => {
      const dir = suggestion.suggestedPath.split('/').slice(0, -1).join('/');
      if (!groups.has(dir)) {
        groups.set(dir, []);
      }
      groups.get(dir)!.push(suggestion);
    });

    groups.forEach((groupSuggestions, dir) => {
      console.log(chalk.blue(`📁 ${dir}/ (${groupSuggestions.length} files)`));
      groupSuggestions.slice(0, 3).forEach(suggestion => {
        console.log(chalk.gray(`   ${suggestion.file.name}`));
      });
      if (groupSuggestions.length > 3) {
        console.log(chalk.dim(`   ... and ${groupSuggestions.length - 3} more`));
      }
      console.log();
    });

    console.log(chalk.yellow('Run without --dry-run to apply these changes.\n'));
  }
}
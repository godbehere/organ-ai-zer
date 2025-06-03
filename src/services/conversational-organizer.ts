import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { FileInfo, OrganizationSuggestion, UserConfig, DetectedProject } from '../types';
import { ConfigService } from './config-service';
import { OpenAIProvider, AnthropicProvider, BaseAIProvider } from './ai-providers';
import { FileScanner } from './file-scanner';
import { PatternMatchingService } from './pattern-matching-service';
import { OrganizationConversation } from './organization-conversation';
import { FileOrganizer } from './file-organizer';
import { ProjectDetectionCache } from './project-detection-cache';

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
      
      // Start AI conversation with higher turn limit since categories use separate conversations
      const conversation = new OrganizationConversation(
        this.aiProvider!,
        files,
        directory,
        intent,
        'ConversationalOrganizer',
        { 
          maxTurns: 15, // Higher limit for main conversation
          temperature: 0.4,
          maxContextSize: 15000
        }
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
   * Phase 1: AI Analysis with Project Detection
   */
  private async runAnalysisPhase(conversation: OrganizationConversation): Promise<any> {
    console.log(chalk.blue('\n📁 Phase 1: Analyzing directory structure and content...'));
    
    // Step 1: Detect projects first
    const projectSpinner = ora('🔍 Detecting projects and analyzing file patterns...').start();
    const detectedProjects = await this.detectProjects(conversation.getContext().getFiles(), conversation.getContext().getBaseDirectory());
    
    if (detectedProjects.length > 0) {
      projectSpinner.succeed('Project detection complete!');
      this.showDetectedProjects(detectedProjects);
    } else {
      projectSpinner.succeed('Pattern analysis complete');
    }
    
    // Step 2: AI Content Analysis
    const aiSpinner = ora('🧠 Using AI to analyze file contents...').start();
    aiSpinner.text = `🧠 Analyzing ${conversation.getContext().getFiles().length} files...`;
    
    try {
      const result = await conversation.startAnalysis();
      aiSpinner.succeed('📊 Content Analysis Complete!');
      
      // Show what AI discovered
      if (result.discoveredCategories && Object.keys(result.discoveredCategories).length > 0) {
        console.log(chalk.blue('\n🔍 Content Categories Discovered:\n'));
        Object.entries(result.discoveredCategories).forEach(([category, files]) => {
          const categoryIcon = this.getCategoryIcon(category);
          console.log(chalk.white(`   ${categoryIcon} ${category}: ${(files as FileInfo[]).length} files`));
        });
        console.log();
      }

      // Add detected projects to the result
      if (detectedProjects.length > 0) {
        result.detectedProjects = detectedProjects;
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
      aiSpinner.fail('AI analysis failed');
      throw error;
    }
  }

  /**
   * Detect coding projects and related file structures with caching
   */
  private async detectProjects(files: FileInfo[], baseDirectory: string): Promise<DetectedProject[]> {
    if (files.length === 0) return [];
    const projectCache = ProjectDetectionCache.getInstance();

    // Try to get cached results first
    const cachedProjects = await projectCache.getCachedProjects(baseDirectory, files);
    if (cachedProjects) {
      return cachedProjects;
    }

    // No cache hit, perform expensive detection
    const projects: DetectedProject[] = [];
    
    // Group files by directory
    const filesByDirectory = new Map<string, FileInfo[]>();
    files.forEach(file => {
      const dir = file.path.split('/').slice(0, -1).join('/');
      if (!filesByDirectory.has(dir)) {
        filesByDirectory.set(dir, []);
      }
      filesByDirectory.get(dir)!.push(file);
    });

    // Check each directory for project indicators
    for (const [directory, dirFiles] of filesByDirectory) {
      const indicators: string[] = [];
      const projectFiles: FileInfo[] = [];
      
      // Check for common project files
      const projectFilePatterns = [
        'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        'Cargo.toml', 'Cargo.lock',
        'go.mod', 'go.sum',
        'requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile',
        'pom.xml', 'build.gradle', 'gradlew',
        'Makefile', 'CMakeLists.txt',
        '.gitignore', 'README.md', 'LICENSE',
        'tsconfig.json', 'webpack.config.js', 'vite.config.js',
        'Dockerfile', 'docker-compose.yml',
        '.env', '.env.example'
      ];

      const codeExtensions = [
        '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
        '.py', '.pyi', '.ipynb',
        '.java', '.kt', '.scala',
        '.c', '.cpp', '.h', '.hpp',
        '.rs', '.go', '.rb', '.php',
        '.cs', '.vb', '.fs',
        '.swift', '.m', '.mm',
        '.sh', '.bash', '.zsh', '.fish',
        '.sql', '.graphql', '.proto'
      ];

      // Check for project configuration files
      dirFiles.forEach(file => {
        if (projectFilePatterns.includes(file.name.toLowerCase())) {
          indicators.push(`Config file: ${file.name}`);
          projectFiles.push(file);
        } else if (codeExtensions.includes(file.extension.toLowerCase())) {
          projectFiles.push(file);
        }
      });

      // If we found project indicators and code files, consider it a project
      if (indicators.length > 0 && projectFiles.length > 2) {
        const projectName = directory.split('/').pop() || 'Unknown Project';
        const projectType = this.inferProjectType(indicators, projectFiles);
        
        projects.push({
          name: projectName,
          files: projectFiles,
          type: projectType,
          rootPath: directory,
          indicators
        });
      }
    }

    // Cache the results for future use
    await projectCache.cacheProjects(baseDirectory, files, projects);

    return projects;
  }

  /**
   * Infer project type from indicators and files
   */
  private inferProjectType(indicators: string[], files: FileInfo[]): string {
    const indicatorText = indicators.join(' ').toLowerCase();
    const extensions = files.map(f => f.extension.toLowerCase());
    
    if (indicatorText.includes('package.json') || extensions.includes('.js') || extensions.includes('.jsx')) {
      if (extensions.includes('.tsx') || extensions.includes('.ts')) {
        return 'TypeScript/React project';
      }
      return 'JavaScript/Node.js project';
    }
    
    if (indicatorText.includes('cargo.toml') || extensions.includes('.rs')) {
      return 'Rust project';
    }
    
    if (indicatorText.includes('go.mod') || extensions.includes('.go')) {
      return 'Go project';
    }
    
    if (indicatorText.includes('requirements.txt') || indicatorText.includes('setup.py') || extensions.includes('.py')) {
      return 'Python project';
    }
    
    if (indicatorText.includes('pom.xml') || indicatorText.includes('build.gradle') || extensions.includes('.java')) {
      return 'Java project';
    }
    
    if (extensions.includes('.c') || extensions.includes('.cpp') || indicatorText.includes('makefile')) {
      return 'C/C++ project';
    }
    
    return 'Code project';
  }

  /**
   * Show detected projects to user
   */
  private showDetectedProjects(projects: DetectedProject[]): void {
    console.log(chalk.blue('\n🏗️ Detected Projects:\n'));
    
    projects.forEach(project => {
      console.log(chalk.white(`   • ${project.name} (${project.files.length} files) - ${project.type}`));
    });
    
    console.log(chalk.green('\n✅ Project structures will be preserved during organization\n'));
  }

  /**
   * Phase 2: Targeted Content-Type Conversations (AI-Driven)
   */
  private async runConversationPhase(conversation: OrganizationConversation, analysisResult: any): Promise<OrganizationSuggestion[]> {
    console.log(chalk.blue('\n💬 Phase 2: Understanding your organization preferences...\n'));
    
    // Get discovered categories from analysis
    const discoveredCategories = conversation.getContext().getDiscoveredCategories();
    const detectedProjects = analysisResult.detectedProjects || [];
    
    // Handle detected projects first (these have standard handling)
    if (detectedProjects.length > 0) {
      await this.handleProjectConversations(detectedProjects, conversation);
    }
    
    // Conduct AI-driven content-type specific conversations
    if (Object.keys(discoveredCategories).length > 0) {
      await this.handleAIDrivenContentConversations(discoveredCategories, conversation);
    }
    
    // Generate final suggestions after all conversations
    return this.generateFinalSuggestionsWithRetry(conversation);
  }

  /**
   * Handle conversations about detected projects (standard handling)
   */
  private async handleProjectConversations(
    detectedProjects: DetectedProject[], 
    conversation: OrganizationConversation
  ): Promise<void> {
    console.log(chalk.blue('🏗️ I detected coding projects. These will preserve their internal structure:\n'));
    
    detectedProjects.forEach(project => {
      console.log(chalk.green(`   ✅ ${project.name} → Projects/${project.name}/ (structure preserved)`));
    });
    
    console.log();
    
    // Send project info to AI for integration
    const projectInfo = detectedProjects.map(p => `${p.name} (${p.type}, ${p.files.length} files)`).join(', ');
    await conversation.continueConversation(
      `I have ${detectedProjects.length} coding projects that will preserve their internal structure: ${projectInfo}. Please organize them appropriately while maintaining their project integrity.`
    );
  }

  /**
   * Handle AI-driven content-type conversations
   */
  private async handleAIDrivenContentConversations(
    discoveredCategories: Record<string, FileInfo[]>, 
    conversation: OrganizationConversation
  ): Promise<void> {
    
    for (const [category, files] of Object.entries(discoveredCategories)) {
      if (files.length === 0) continue;
      
      const categoryIcon = this.getCategoryIcon(category);
      console.log(chalk.blue(`${categoryIcon} Let's discuss your ${category} files (${files.length} files detected):`));
      
      // Get AI-generated category-specific conversation
      const categoryConversation = await this.getCategoryConversationFromAI(category, files, conversation);
      
      if (categoryConversation) {
        await this.conductCategoryConversation(categoryConversation, category, conversation);
      }
      
      console.log();
    }
  }

  /**
   * Get AI-generated conversation questions for a specific category using isolated conversation
   */
  private async getCategoryConversationFromAI(
    category: string, 
    files: FileInfo[], 
    mainConversation: OrganizationConversation
  ): Promise<any> {
    const spinner = ora(`Analyzing ${category} files to understand organization options...`).start();
    
    try {
      // Create a separate conversation context for this category to avoid turn limit issues
      const categoryConversation = new OrganizationConversation(
        this.aiProvider!,
        files,
        mainConversation.getContext().getBaseDirectory(),
        `Analyze organization options for ${category} files`,
        `CategoryAnalysis_${category}`,
        { 
          maxTurns: 3, // Short limit for category discussions
          temperature: 0.4,
          maxContextSize: 8000
        }
      );

      // Use the isolated conversation for category analysis
      const result = await categoryConversation.getCategoryConversation(category, files);
      
      // Complete the category conversation since we're done with it
      categoryConversation.complete();
      
      spinner.succeed(`Generated organization options for ${category}`);
      return result;
      
    } catch (error) {
      spinner.fail(`Failed to analyze ${category} files`);
      console.log(chalk.yellow(`I'll ask you directly about your ${category} preferences.`));
      return {
        question: `How would you like your ${category} files organized?`,
        inputType: "freeform" as const,
        reasoning: "Fallback to direct question due to analysis error"
      };
    }
  }

  /**
   * Conduct the actual conversation with the user for a category
   */
  private async conductCategoryConversation(
    categoryConversation: any, 
    category: string, 
    conversation: OrganizationConversation
  ): Promise<void> {
    
    let userResponse = '';
    
    if (categoryConversation.inputType === 'choice' && categoryConversation.choices?.length > 0) {
      // Present AI-generated choices
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: categoryConversation.question,
          choices: [
            ...categoryConversation.choices.map((choice: string) => ({
              name: choice,
              value: choice
            })),
            { name: 'Let me specify something different', value: 'custom' }
          ]
        }
      ]);

      if (choice === 'custom') {
        const { customInput } = await inquirer.prompt([
          {
            type: 'input',
            name: 'customInput',
            message: `Describe how you'd like your ${category} files organized:`,
            validate: (input: string) => input.trim().length > 5 || 'Please provide more detail'
          }
        ]);
        userResponse = customInput;
      } else {
        userResponse = choice;
      }
      
    } else {
      // Use free-form input as determined by AI
      const { freeformInput } = await inquirer.prompt([
        {
          type: 'input',
          name: 'freeformInput',
          message: categoryConversation.question || `How would you like your ${category} files organized?`,
          validate: (input: string) => input.trim().length > 5 || 'Please provide more detail about your preferences'
        }
      ]);
      userResponse = freeformInput;
    }

    // Send the user's response back to the AI with context
    await conversation.continueConversation(
      `For ${category} files: ${userResponse}. Please apply this organization preference consistently to all ${category} files.`
    );
  }

  /**
   * Generate final suggestions with retry logic
   */
  private async generateFinalSuggestionsWithRetry(conversation: OrganizationConversation): Promise<OrganizationSuggestion[]> {
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
   * Present suggestions to user and get feedback with category-grouped preview
   */
  private async presentSuggestions(suggestions: OrganizationSuggestion[]): Promise<any> {
    // Group suggestions by category
    const categoryGroups = this.groupSuggestionsByCategory(suggestions);
    
    // Show category-grouped preview
    await this.showCategoryGroupedPreview(categoryGroups, suggestions.length);
    
    // Get initial user choice
    const { response } = await inquirer.prompt([
      {
        type: 'list',
        name: 'response',
        message: 'What would you like to do?',
        choices: [
          { name: '✅ Continue with organization', value: 'approve' },
          { name: '📂 View details for a specific category', value: 'view_category' },
          { name: '📋 View all changes', value: 'view_all' },
          { name: '🔧 Good direction, but needs adjustments', value: 'adjust' },
          { name: '❌ Not what I want, let me explain differently', value: 'reject' },
          { name: '🚪 Cancel organization', value: 'cancel' }
        ]
      }
    ]);

    return this.handlePreviewResponse(response, categoryGroups, suggestions);
  }

  /**
   * Group suggestions by category for enhanced preview
   */
  private groupSuggestionsByCategory(suggestions: OrganizationSuggestion[]): Map<string, OrganizationSuggestion[]> {
    const categoryGroups = new Map<string, OrganizationSuggestion[]>();
    
    suggestions.forEach(suggestion => {
      const category = suggestion.category || this.inferCategoryFromPath(suggestion.suggestedPath);
      
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(suggestion);
    });
    
    return categoryGroups;
  }

  /**
   * Infer category from suggested path if not explicitly set
   */
  private inferCategoryFromPath(path: string): string {
    const topLevelDir = path.split('/')[0];
    return topLevelDir || 'Other';
  }

  /**
   * Show category-grouped preview with samples
   */
  private async showCategoryGroupedPreview(categoryGroups: Map<string, OrganizationSuggestion[]>, totalFiles: number): Promise<void> {
    console.log(chalk.blue(`\n📋 Phase 3: Organization Plan Summary (${totalFiles} files total):`));
    console.log(chalk.blue('═══════════════════════════════════════════════════════════\n'));

    for (const [category, categorySuggestions] of categoryGroups) {
      const categoryIcon = this.getCategoryIcon(category);
      console.log(chalk.white(`${categoryIcon} ${category} (${categorySuggestions.length} files):`));
      
      // Show sample files for this category
      const sampleSize = Math.min(3, categorySuggestions.length);
      const samples = categorySuggestions.slice(0, sampleSize);
      
      samples.forEach(suggestion => {
        console.log(chalk.gray(`   ${suggestion.file.name} → ${suggestion.suggestedPath}`));
      });
      
      if (categorySuggestions.length > sampleSize) {
        console.log(chalk.dim(`   ... and ${categorySuggestions.length - sampleSize} more files\n`));
      } else {
        console.log();
      }
    }
  }

  /**
   * Get appropriate icon for category
   */
  private getCategoryIcon(category: string): string {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('movie')) return '📂';
    if (categoryLower.includes('tv') || categoryLower.includes('show')) return '📺';
    if (categoryLower.includes('music') || categoryLower.includes('audio')) return '🎵';
    if (categoryLower.includes('photo') || categoryLower.includes('image')) return '📸';
    if (categoryLower.includes('project') || categoryLower.includes('code')) return '🏗️';
    if (categoryLower.includes('document')) return '📄';
    if (categoryLower.includes('video')) return '🎬';
    
    return '📁';
  }

  /**
   * Handle user response to preview
   */
  private async handlePreviewResponse(
    response: string, 
    categoryGroups: Map<string, OrganizationSuggestion[]>, 
    allSuggestions: OrganizationSuggestion[]
  ): Promise<any> {
    switch (response) {
      case 'approve':
        return { approved: true };

      case 'cancel':
        throw new Error('Organization cancelled by user');

      case 'view_category':
        return this.handleCategoryDetailView(categoryGroups, allSuggestions);

      case 'view_all':
        return this.handleViewAllChanges(allSuggestions);

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
   * Handle detailed view of a specific category
   */
  private async handleCategoryDetailView(
    categoryGroups: Map<string, OrganizationSuggestion[]>, 
    allSuggestions: OrganizationSuggestion[]
  ): Promise<any> {
    const categories = Array.from(categoryGroups.keys());
    
    const { selectedCategory } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedCategory',
        message: 'Which category would you like to explore in detail?',
        choices: categories.map(cat => ({
          name: `${this.getCategoryIcon(cat)} ${cat} (${categoryGroups.get(cat)!.length} files)`,
          value: cat
        }))
      }
    ]);

    // Show detailed view of selected category
    const categorySuggestions = categoryGroups.get(selectedCategory)!;
    console.log(chalk.blue(`\n📂 Detailed view: ${selectedCategory}\n`));
    
    categorySuggestions.forEach((suggestion, index) => {
      console.log(chalk.white(`  ${index + 1}. ${suggestion.file.name}`));
      console.log(chalk.gray(`     → ${suggestion.suggestedPath}`));
      console.log(chalk.dim(`     ${suggestion.reason}\n`));
    });

    // Ask what to do next
    const { nextAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'nextAction',
        message: 'What would you like to do now?',
        choices: [
          { name: '⬅️ Back to category overview', value: 'back' },
          { name: '✅ Continue with organization', value: 'approve' },
          { name: '🔧 I want to adjust this category', value: 'adjust_category' },
          { name: '🚪 Cancel organization', value: 'cancel' }
        ]
      }
    ]);

    if (nextAction === 'back') {
      return this.presentSuggestions(allSuggestions);
    } else if (nextAction === 'adjust_category') {
      const { categoryFeedback } = await inquirer.prompt([
        {
          type: 'input',
          name: 'categoryFeedback',
          message: `How would you like to change the ${selectedCategory} category organization?`,
          validate: (input: string) => input.trim().length > 5 || 'Please be specific about the changes'
        }
      ]);
      
      return { approved: false, feedback: `For ${selectedCategory} category: ${categoryFeedback}` };
    } else {
      return this.handlePreviewResponse(nextAction, categoryGroups, allSuggestions);
    }
  }

  /**
   * Handle viewing all changes
   */
  private async handleViewAllChanges(suggestions: OrganizationSuggestion[]): Promise<any> {
    console.log(chalk.blue(`\n📋 Complete Organization Plan (${suggestions.length} files):\n`));
    
    suggestions.forEach((suggestion, index) => {
      console.log(chalk.white(`  ${index + 1}. ${suggestion.file.name}`));
      console.log(chalk.gray(`     → ${suggestion.suggestedPath}`));
      console.log(chalk.dim(`     ${suggestion.reason}\n`));
    });

    // Ask what to do next
    const { nextAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'nextAction',
        message: 'What would you like to do now?',
        choices: [
          { name: '⬅️ Back to category overview', value: 'back' },
          { name: '✅ Continue with organization', value: 'approve' },
          { name: '🔧 I want to make adjustments', value: 'adjust' },
          { name: '🚪 Cancel organization', value: 'cancel' }
        ]
      }
    ]);

    if (nextAction === 'back') {
      return this.presentSuggestions(suggestions);
    } else {
      return this.handlePreviewResponse(nextAction, new Map(), suggestions);
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
        const backupPath = await fileOrganizer.createBackup(baseDirectory);
        spinner.succeed(`Backup created: ${backupPath}`);
      } catch (error) {
        spinner.warn('Backup creation failed, continuing without backup');
        console.log(chalk.yellow(`Backup error: ${error}`));
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
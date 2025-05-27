import { FileInfo, OrganizationSuggestion, UserConfig } from '../types';
import { ConfigService } from './config-service';
import { OpenAIProvider, AnthropicProvider, BaseAIProvider } from './ai-providers';
import { FileScanner } from './file-scanner';
import * as path from 'path';

export class AIOrganizer {
  private configService: ConfigService;
  private aiProvider: BaseAIProvider | null = null;
  private fileScanner = new FileScanner();

  constructor(configService?: ConfigService) {
    this.configService = configService || ConfigService.getInstance();
  }

  async generateSuggestions(files: FileInfo[]): Promise<OrganizationSuggestion[]> {
    const config = await this.configService.loadConfig();
    
    // Validate API key
    if (!config.ai.apiKey) {
      throw new Error('No API key configured. Please run "organ-ai-zer init" and add your API key to the config file.');
    }

    // Initialize AI provider
    await this.initializeAIProvider(config);

    // Filter files based on config
    const filteredFiles = this.filterFiles(files, config);
    
    if (filteredFiles.length === 0) {
      console.log('📁 No files to organize after applying filters');
      return [];
    }

    // Get existing directory structure for context
    const baseDirectory = path.dirname(filteredFiles[0].path);
    const existingStructure = await this.getExistingStructure(baseDirectory);

    // Prepare user preferences for AI
    const userPreferences = this.extractUserPreferences(config);

    try {
      // Call AI service
      const aiResponse = await this.aiProvider!.analyzeFiles({
        files: filteredFiles,
        baseDirectory,
        existingStructure,
        userPreferences
      });

      // Convert AI response to OrganizationSuggestion format
      const suggestions = this.convertToOrganizationSuggestions(aiResponse.suggestions);

      // Apply post-processing filters
      return this.postProcessSuggestions(suggestions, config);
    } catch (error) {
      console.error('❌ AI analysis failed, falling back to rule-based organization');
      return this.fallbackToRuleBasedOrganization(filteredFiles);
    }
  }

  private async initializeAIProvider(config: UserConfig): Promise<void> {
    const aiConfig = {
      apiKey: config.ai.apiKey,
      model: config.ai.model,
      maxTokens: config.ai.maxTokens,
      temperature: config.ai.temperature,
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

  private filterFiles(files: FileInfo[], config: UserConfig): FileInfo[] {
    return files.filter(file => {
      // Check include patterns
      const includePatterns = config.organization.includePatterns;
      const excludePatterns = config.organization.excludePatterns;
      
      // Check if file matches any exclude pattern
      const isExcluded = excludePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(file.name);
      });
      
      if (isExcluded) return false;
      
      // Check if file matches any include pattern
      const isIncluded = includePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(file.name);
      });
      
      if (!isIncluded) return false;

      // Check if file type is enabled
      const category = this.fileScanner.getFileCategory(file);
      const fileTypeConfig = config.fileTypes[category as keyof typeof config.fileTypes];
      
      return fileTypeConfig?.enabled !== false;
    });
  }

  private async getExistingStructure(baseDirectory: string): Promise<string[]> {
    try {
      const scanner = new FileScanner();
      const allItems = await scanner.scanDirectory(baseDirectory, true);
      
      // Get unique directory paths
      const directories = new Set<string>();
      allItems.forEach(item => {
        const dir = path.dirname(item.path);
        const relativePath = path.relative(baseDirectory, dir);
        if (relativePath && relativePath !== '.') {
          directories.add(relativePath);
        }
      });
      
      return Array.from(directories).sort();
    } catch (error) {
      console.warn('Could not analyze existing directory structure:', error);
      return [];
    }
  }

  private extractUserPreferences(config: UserConfig): any {
    return {
      confidenceThreshold: config.organization.confidenceThreshold,
      preserveOriginalNames: config.organization.preserveOriginalNames,
      maxDepth: config.organization.maxDepth,
      fileTypePreferences: Object.entries(config.fileTypes).reduce((acc, [type, typeConfig]) => {
        acc[type] = {
          enabled: typeConfig.enabled,
          organizationRules: typeConfig.organizationRules,
          preferredNamingPattern: Object.keys(typeConfig.namingPatterns)[0]
        };
        return acc;
      }, {} as any),
      customCategories: config.customCategories
    };
  }

  private convertToOrganizationSuggestions(
    aiSuggestions: any[]
  ): OrganizationSuggestion[] {
    return aiSuggestions.map(suggestion => ({
      file: suggestion.file,
      suggestedPath: suggestion.suggestedPath,
      reason: suggestion.reason,
      confidence: suggestion.confidence
    }));
  }

  private postProcessSuggestions(
    suggestions: OrganizationSuggestion[],
    config: UserConfig
  ): OrganizationSuggestion[] {
    return suggestions
      .filter(suggestion => suggestion.confidence >= config.organization.confidenceThreshold)
      .map(suggestion => {
        // Apply naming pattern preferences if configured
        if (config.organization.preserveOriginalNames) {
          const originalName = suggestion.file.name;
          const dir = path.dirname(suggestion.suggestedPath);
          suggestion.suggestedPath = path.join(dir, originalName);
        }
        
        return suggestion;
      });
  }

  private async fallbackToRuleBasedOrganization(
    files: FileInfo[]
  ): Promise<OrganizationSuggestion[]> {
    console.log('🔄 Using rule-based fallback organization');
    
    const suggestions: OrganizationSuggestion[] = [];
    
    for (const file of files) {
      const category = this.fileScanner.getFileCategory(file);
      const baseDir = path.dirname(file.path);
      
      let suggestedPath: string;
      let reason: string;
      
      // Simple category-based organization
      suggestedPath = path.join(baseDir, category, file.name);
      reason = `Fallback: organized by file type (${category})`;
      
      // Only suggest if the file would actually move
      if (suggestedPath !== file.path) {
        suggestions.push({
          file,
          suggestedPath,
          reason,
          confidence: 0.6
        });
      }
    }
    
    return suggestions;
  }
}
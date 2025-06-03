import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import Joi from 'joi';
import { UserConfig, DEFAULT_CONFIG, AIProvider } from '../types/config';

export class ConfigService {
  private static instance: ConfigService;
  private config: UserConfig | null = null;
  private configPath: string;

  constructor(customConfigPath?: string) {
    this.configPath = customConfigPath || this.getDefaultConfigPath();
  }

  static getInstance(customConfigPath?: string): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService(customConfigPath);
    }
    return ConfigService.instance;
  }

  private getDefaultConfigPath(): string {
    const configDir = path.join(os.homedir(), '.organ-ai-zer');
    return path.join(configDir, 'config.json');
  }

  async loadConfig(): Promise<UserConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      if (await fs.pathExists(this.configPath)) {
        const configData = await fs.readJson(this.configPath);
        this.config = this.validateAndMergeConfig(configData);
      } else {
        console.log('⚠️  No config file found. Use "organ-ai-zer init" to create one.');
        this.config = DEFAULT_CONFIG;
      }
    } catch (error) {
      console.error(`❌ Error loading config: ${error}`);
      throw new Error(`Failed to load configuration: ${error}`);
    }

    return this.config;
  }

  async saveConfig(config: UserConfig): Promise<void> {
    try {
      const validatedConfig = this.validateConfig(config);
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, validatedConfig, { spaces: 2 });
      this.config = validatedConfig;
      console.log(`✅ Config saved to: ${this.configPath}`);
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  async initializeConfig(force: boolean = false): Promise<void> {
    const configExists = await fs.pathExists(this.configPath);
    
    if (configExists && !force) {
      console.log(`⚠️  Config file already exists at: ${this.configPath}`);
      console.log('Use --force to overwrite or specify a different path.');
      return;
    }

    try {
      // Use a more lenient validation for initialization
      const validatedConfig = this.validateInitConfig(DEFAULT_CONFIG);
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, validatedConfig, { spaces: 2 });
      this.config = validatedConfig;
      console.log(`✅ Config saved to: ${this.configPath}`);
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
    
    console.log('🎉 Default configuration created!');
    console.log('📝 Edit the config file to customize your preferences:');
    console.log(`   ${this.configPath}`);
    console.log('');
    console.log('🔑 Don\'t forget to add your AI API key in the config file!');
  }

  private validateInitConfig(config: any): UserConfig {
    // More lenient validation for initialization - allows empty API key
    const schema = Joi.object({
      ai: Joi.object({
        provider: Joi.string().valid('openai', 'anthropic').required(),
        apiKey: Joi.string().allow('').required(),
        model: Joi.string().optional(),
        maxTokens: Joi.number().min(100).max(4000).optional(),
        temperature: Joi.number().min(0).max(2).optional(),
        timeout: Joi.number().min(1000).max(180000).optional()
      }).required(),
      organization: Joi.object({
        confidenceThreshold: Joi.number().min(0).max(1).required(),
        createBackups: Joi.boolean().required(),
        preserveOriginalNames: Joi.boolean().required(),
        maxDepth: Joi.number().min(1).max(10).required(),
        excludePatterns: Joi.array().items(Joi.string()).required(),
        includePatterns: Joi.array().items(Joi.string()).required()
      }).required(),
      fileTypes: Joi.object().pattern(
        Joi.string(),
        Joi.object({
          enabled: Joi.boolean().required(),
          namingPatterns: Joi.object().pattern(
            Joi.string(),
            Joi.object({
              pattern: Joi.string().required(),
              description: Joi.string().required(),
              example: Joi.string().required()
            })
          ).required(),
          organizationRules: Joi.object({
            byDate: Joi.boolean().optional(),
            byType: Joi.boolean().optional(),
            byProject: Joi.boolean().optional(),
            customPath: Joi.string().optional()
          }).required()
        })
      ).required(),
      customCategories: Joi.object().pattern(
        Joi.string(),
        Joi.object({
          extensions: Joi.array().items(Joi.string()).required(),
          config: Joi.object({
            enabled: Joi.boolean().required(),
            namingPatterns: Joi.object().required(),
            organizationRules: Joi.object().required()
          }).required()
        })
      ).optional()
    });

    const { error, value } = schema.validate(config, { allowUnknown: false });
    
    if (error) {
      throw new Error(`Invalid configuration: ${error.details[0].message}`);
    }

    return value;
  }

  private validateConfig(config: any): UserConfig {
    const schema = Joi.object({
      ai: Joi.object({
        provider: Joi.string().valid('openai', 'anthropic').required(),
        apiKey: Joi.string().required(),
        model: Joi.string().optional(),
        maxTokens: Joi.number().min(100).max(4000).optional(),
        temperature: Joi.number().min(0).max(2).optional(),
        timeout: Joi.number().min(1000).max(180000).optional()
      }).required(),
      organization: Joi.object({
        confidenceThreshold: Joi.number().min(0).max(1).required(),
        createBackups: Joi.boolean().required(),
        preserveOriginalNames: Joi.boolean().required(),
        maxDepth: Joi.number().min(1).max(10).required(),
        excludePatterns: Joi.array().items(Joi.string()).required(),
        includePatterns: Joi.array().items(Joi.string()).required()
      }).required(),
      fileTypes: Joi.object().pattern(
        Joi.string(),
        Joi.object({
          enabled: Joi.boolean().required(),
          namingPatterns: Joi.object().pattern(
            Joi.string(),
            Joi.object({
              pattern: Joi.string().required(),
              description: Joi.string().required(),
              example: Joi.string().required()
            })
          ).required(),
          organizationRules: Joi.object({
            byDate: Joi.boolean().optional(),
            byType: Joi.boolean().optional(),
            byProject: Joi.boolean().optional(),
            customPath: Joi.string().optional()
          }).required()
        })
      ).required(),
      customCategories: Joi.object().pattern(
        Joi.string(),
        Joi.object({
          extensions: Joi.array().items(Joi.string()).required(),
          config: Joi.object({
            enabled: Joi.boolean().required(),
            namingPatterns: Joi.object().required(),
            organizationRules: Joi.object().required()
          }).required()
        })
      ).optional()
    });

    const { error, value } = schema.validate(config, { allowUnknown: false });
    
    if (error) {
      throw new Error(`Invalid configuration: ${error.details[0].message}`);
    }

    return value;
  }

  private validateAndMergeConfig(userConfig: any): UserConfig {
    // Deep merge user config with default config
    const mergedConfig = this.deepMerge(DEFAULT_CONFIG, userConfig);
    return this.validateConfig(mergedConfig);
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  getConfigPath(): string {
    return this.configPath;
  }

  async configExists(): Promise<boolean> {
    return await fs.pathExists(this.configPath);
  }

  async saveInteractiveConfig(config: UserConfig): Promise<void> {
    try {
      const validatedConfig = this.validateInitConfig(config);
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, validatedConfig, { spaces: 2 });
      this.config = validatedConfig;
      console.log(`✅ Config saved to: ${this.configPath}`);
    } catch (error) {
      throw new Error(`Failed to save interactive configuration: ${error}`);
    }
  }

  isConfigured(): boolean {
    return this.config?.ai?.apiKey !== '';
  }

  async validateApiKey(): Promise<boolean> {
    const config = await this.loadConfig();
    
    if (!config.ai.apiKey) {
      console.error('❌ No API key configured. Please add your API key to the config file.');
      return false;
    }

    // Basic validation - actual API validation would require making a test call
    if (config.ai.apiKey.length < 10) {
      console.error('❌ API key appears to be invalid (too short).');
      return false;
    }

    return true;
  }

  getConfigHash(): string {
    if (!this.config) {
      throw new Error('Config not loaded');
    }

    // Create hash of configuration that affects AI suggestions
    const relevantConfig = {
      ai: {
        provider: this.config.ai.provider,
        model: this.config.ai.model,
        temperature: this.config.ai.temperature
      },
      organization: {
        confidenceThreshold: this.config.organization.confidenceThreshold,
        preserveOriginalNames: this.config.organization.preserveOriginalNames,
        excludePatterns: this.config.organization.excludePatterns,
        includePatterns: this.config.organization.includePatterns
      },
      fileTypes: this.config.fileTypes
    };

    return crypto.createHash('md5').update(JSON.stringify(relevantConfig)).digest('hex');
  }
}
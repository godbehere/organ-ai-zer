import inquirer from 'inquirer';
import { ConfigService } from '../services/config-service';
import { UserConfig, DEFAULT_CONFIG, AIProvider } from '../types/config';

export async function init(options: { force?: boolean; config?: string; interactive?: boolean }): Promise<void> {
  try {
    const configService = ConfigService.getInstance(options.config);
    
    // Check if config exists
    const configExists = await configService.configExists();
    if (configExists && !options.force) {
      console.log(`⚠️  Config file already exists at: ${configService.getConfigPath()}`);
      
      const { shouldOverwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldOverwrite',
          message: 'Do you want to overwrite the existing configuration?',
          default: false
        }
      ]);
      
      if (!shouldOverwrite) {
        console.log('Configuration initialization cancelled.');
        return;
      }
    }

    // Interactive configuration
    if (options.interactive !== false) {
      console.log('🚀 Welcome to Organ-AI-zer configuration setup!');
      console.log('Press Enter to use default values, or enter your preferred settings.\n');
      
      const config = await collectInteractiveConfig();
      await configService.saveInteractiveConfig(config);
    } else {
      // Non-interactive mode (legacy behavior)
      if (options.force || configExists) {
        console.log('🔄 Creating default configuration...');
      }
      await configService.initializeConfig(true);
    }
    
    console.log('\n✅ Configuration setup complete!');
    console.log(`📁 Config location: ${configService.getConfigPath()}`);
    console.log('\n🚀 Ready to organize! Try:');
    console.log('   organ-ai-zer preview ~/Downloads');
    console.log('   organ-ai-zer organize ~/Downloads --dry-run');
    
  } catch (error) {
    console.error('❌ Failed to initialize config:', error);
    process.exit(1);
  }
}

async function collectInteractiveConfig(): Promise<UserConfig> {
  console.log('🤖 AI Configuration');
  const aiConfig = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Which AI provider would you like to use?',
      choices: [
        { name: 'OpenAI (GPT-4, GPT-3.5-turbo)', value: 'openai' },
        { name: 'Anthropic (Claude 3)', value: 'anthropic' }
      ],
      default: 'openai'
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter your API key (or leave empty to add later):',
      mask: '*',
      when: true
    },
    {
      type: 'input',
      name: 'model',
      message: (answers) => `Enter model name for ${answers.provider}:`,
      default: (answers) => answers.provider === 'openai' ? 'gpt-4' : 'claude-3-sonnet-20240229',
      when: (answers) => answers.apiKey !== ''
    },
    {
      type: 'number',
      name: 'maxTokens',
      message: 'Maximum tokens for AI responses:',
      default: 1000,
      validate: (input) => (input !== undefined && input >= 100 && input <= 4000) || 'Must be between 100 and 4000'
    },
    {
      type: 'number',
      step: 0.1,
      name: 'temperature',
      message: 'AI temperature (0 = deterministic, 1 = creative):',
      default: 0.3,
      validate: (input) => (input !== undefined && input >= 0 && input <= 1) || 'Must be between 0 and 1'
    }
  ]);

  console.log('\n📁 Organization Settings');
  const orgConfig = await inquirer.prompt([
    {
      type: 'number',
      step: 0.1,
      name: 'confidenceThreshold',
      message: 'Minimum confidence threshold for AI suggestions (0-1):',
      default: 0.7,
      validate: (input) => (input !== undefined && input >= 0 && input <= 1) || 'Must be between 0 and 1'
    },
    {
      type: 'confirm',
      name: 'createBackups',
      message: 'Create backups before organizing?',
      default: true
    },
    {
      type: 'confirm',
      name: 'preserveOriginalNames',
      message: 'Preserve original filenames (only move, don\'t rename)?',
      default: false
    },
    {
      type: 'number',
      name: 'maxDepth',
      message: 'Maximum directory depth to scan:',
      default: 5,
      validate: (input) => (input !== undefined && input >= 1 && input <= 10) || 'Must be between 1 and 10'
    }
  ]);

  console.log('\n🗂️ File Type Configuration');
  const fileTypeChoices = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'enabledFileTypes',
      message: 'Which file types should be organized?',
      choices: [
        { name: 'Images (jpg, png, gif, etc.)', value: 'images', checked: true },
        { name: 'Videos (mp4, avi, mov, etc.)', value: 'videos', checked: true },
        { name: 'Audio (mp3, wav, flac, etc.)', value: 'audio', checked: true },
        { name: 'Documents (pdf, doc, txt, etc.)', value: 'documents', checked: true },
        { name: 'Spreadsheets (xlsx, csv, etc.)', value: 'spreadsheets', checked: true },
        { name: 'Presentations (pptx, ppt, etc.)', value: 'presentations', checked: true },
        { name: 'Code files (js, py, java, etc.)', value: 'code', checked: true },
        { name: 'Archives (zip, rar, tar, etc.)', value: 'archives', checked: true },
        { name: 'Miscellaneous files', value: 'misc', checked: true }
      ]
    }
  ]);

  // Build the final configuration
  const config: UserConfig = {
    ai: {
      provider: aiConfig.provider as AIProvider,
      apiKey: aiConfig.apiKey || '',
      model: aiConfig.model || (aiConfig.provider === 'openai' ? 'gpt-4' : 'claude-3-sonnet-20240229'),
      maxTokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
      timeout: 30000
    },
    organization: {
      confidenceThreshold: orgConfig.confidenceThreshold,
      createBackups: orgConfig.createBackups,
      preserveOriginalNames: orgConfig.preserveOriginalNames,
      maxDepth: orgConfig.maxDepth,
      excludePatterns: ['.DS_Store', 'Thumbs.db', '*.tmp', '*.cache'],
      includePatterns: ['*']
    },
    fileTypes: {
      ...DEFAULT_CONFIG.fileTypes
    }
  };

  // Enable/disable file types based on user selection
  Object.keys(config.fileTypes).forEach(fileType => {
    config.fileTypes[fileType as keyof typeof config.fileTypes].enabled = 
      fileTypeChoices.enabledFileTypes.includes(fileType);
  });

  return config;
}
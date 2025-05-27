import { ConfigService } from '../services/config-service';

export async function init(options: { force?: boolean; config?: string }): Promise<void> {
  try {
    const configService = ConfigService.getInstance(options.config);
    
    if (options.force) {
      console.log('🔄 Forcing config initialization...');
      await configService.saveConfig(require('../types/config').DEFAULT_CONFIG);
      console.log('✅ Configuration forcefully recreated!');
    } else {
      await configService.initializeConfig();
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Edit your config file to add your AI API key');
    console.log(`   Config location: ${configService.getConfigPath()}`);
    console.log('2. Choose your AI provider (openai or anthropic)');
    console.log('3. Customize file organization preferences');
    console.log('4. Run "organ-ai-zer preview <directory>" to test');
    
  } catch (error) {
    console.error('❌ Failed to initialize config:', error);
    process.exit(1);
  }
}
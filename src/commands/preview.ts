import { PreviewOptions } from '../types';
import { FileScanner } from '../services/file-scanner';
import { AIOrganizer } from '../services/ai-organizer';
import { ConfigService } from '../services/config-service';

export async function preview(directory: string, options: PreviewOptions): Promise<void> {
  try {
    console.log(`Previewing organization for: ${directory}`);

    // Initialize config service
    const configService = ConfigService.getInstance(options.config);
    
    // Validate API key
    const hasValidKey = await configService.validateApiKey();
    if (!hasValidKey) {
      console.log('💡 Run "organ-ai-zer init" to set up your configuration');
      process.exit(1);
    }

    const scanner = new FileScanner();
    const files = await scanner.scanDirectory(directory, options.recursive || false);
    
    console.log(`📁 Found ${files.length} files to analyze`);

    const aiOrganizer = new AIOrganizer(configService);
    const suggestions = await aiOrganizer.generateSuggestions(files);
    
    console.log(`\n🤖 Organization Preview (${suggestions.length} suggestions):`);
    console.log('═'.repeat(60));

    suggestions.forEach((suggestion, index) => {
      console.log(`\n${index + 1}. ${suggestion.file.name}`);
      console.log(`   From: ${suggestion.file.path}`);
      console.log(`   To:   ${suggestion.suggestedPath}`);
      console.log(`   Reason: ${suggestion.reason}`);
      console.log(`   Confidence: ${Math.round(suggestion.confidence * 100)}%`);
    });

    console.log('\n💡 Use the "organize" command to apply these changes');
  } catch (error) {
    console.error('❌ Error during preview:', error);
    process.exit(1);
  }
}
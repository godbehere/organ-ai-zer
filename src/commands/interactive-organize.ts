import { ConfigService } from '../services/config-service';
import { ConversationalOrganizer } from '../services/conversational-organizer';
import { FileOrganizer } from '../services/file-organizer';

/**
 * Interactive Organization Command
 * Uses the conversational AI approach with flexible, AI-driven categorization
 */
export async function interactiveOrganize(
  directory: string, 
  options: { config?: string; dryRun?: boolean }
): Promise<void> {
  try {
    // Initialize services
    const configService = ConfigService.getInstance(options.config);
    
    // Validate API key
    const hasValidKey = await configService.validateApiKey();
    if (!hasValidKey) {
      console.log('💡 Run "organ-ai-zer init" to set up your configuration');
      process.exit(1);
    }

    // Initialize conversational organizer
    const conversationalOrganizer = new ConversationalOrganizer(configService);
    
    // Run conversational organization
    const suggestions = await conversationalOrganizer.organize(directory, options.dryRun || false);
    
    // If not dry run and we have suggestions, handle actual file operations
    // if (!options.dryRun && suggestions.length > 0) {
    //   const config = await configService.loadConfig();
      
    //   // Create backup if enabled
    //   if (config.organization.createBackups) {
    //     const fileOrganizer = new FileOrganizer();
    //     const backupPath = await fileOrganizer.createBackup(directory);
    //     console.log(`📦 Backup created: ${backupPath}`);
    //   }

    //   // Apply organization suggestions
    //   const fileOrganizer = new FileOrganizer();
    //   await fileOrganizer.applySuggestions(suggestions);
      
    //   console.log('✨ Organization complete! Your files are now organized.');
    // }

  } catch (error) {
    if (error instanceof Error && error.message.includes('cancelled')) {
      // User cancelled - this is normal, don't show as error
      process.exit(0);
    }
    
    console.error('❌ Interactive organization failed:', error);
    process.exit(1);
  }
}
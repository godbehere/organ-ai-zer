import inquirer from 'inquirer';
import { OrganizationSuggestion } from '../types';
import { ConfigService } from '../services/config-service';
import { ConversationalAIOrganizer } from '../services/conversational-ai-organizer';
import { FileOrganizer } from '../services/file-organizer';

export async function interactiveOrganize(
  directory: string, 
  options: { recursive?: boolean; config?: string; dryRun?: boolean }
): Promise<void> {
  try {
    console.log(`🤖 Starting conversational AI organization for: ${directory}\n`);
    
    // Initialize services
    const configService = ConfigService.getInstance(options.config);
    const config = await configService.loadConfig();
    
    // Validate API key
    const hasValidKey = await configService.validateApiKey();
    if (!hasValidKey) {
      console.log('💡 Run "organ-ai-zer init" to set up your configuration');
      process.exit(1);
    }

    // Initialize conversational AI organizer
    const conversationalOrganizer = new ConversationalAIOrganizer(configService);
    
    // Start the 3-phase conversational organization process
    // Phase 1: Analysis, Phase 2: Conversation, Phase 3: Execution
    const suggestions = await conversationalOrganizer.organizeWithConversation(directory);

    if (suggestions.length === 0) {
      console.log('🤷 No organization suggestions were generated.');
      return;
    }

    // Show final suggestions
    console.log(`\n📋 Final Organization Plan (${suggestions.length} files):`);
    console.log('═'.repeat(60));
    
    suggestions.forEach((suggestion, index) => {
      console.log(`\n${index + 1}. ${suggestion.file.name}`);
      console.log(`   From: ${suggestion.file.path}`);
      console.log(`   To:   ${suggestion.suggestedPath}`);
      console.log(`   Reason: ${suggestion.reason}`);
    });

    // Confirm execution
    const { shouldExecute } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldExecute',
        message: `\nDo you want to ${options.dryRun ? 'simulate' : 'execute'} this organization plan?`,
        default: false
      }
    ]);

    if (!shouldExecute) {
      console.log('Organization cancelled.');
      return;
    }

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - No files would actually be moved');
      suggestions.forEach(suggestion => {
        console.log(`Would move: ${suggestion.file.name} → ${suggestion.suggestedPath}`);
      });
    } else {
      // Create backup if enabled
      if (config.organization.createBackups) {
        const fileOrganizer = new FileOrganizer();
        const backupPath = await fileOrganizer.createBackup(directory);
        console.log(`\n📦 Backup created: ${backupPath}`);
      }

      // Execute the organization
      console.log('\n🚀 Executing organization...');
      const fileOrganizer = new FileOrganizer();
      await fileOrganizer.applySuggestions(suggestions);
      
      console.log('\n✅ Interactive organization complete!');
    }

  } catch (error) {
    console.error('❌ Interactive organization failed:', error);
    process.exit(1);
  }
}


import inquirer from 'inquirer';
import { FileInfo, OrganizationSuggestion } from '../types';
import { ConfigService } from '../services/config-service';
import { FileScanner } from '../services/file-scanner';
import { InteractiveAIOrganizer } from '../services/interactive-ai-organizer';
import { FileOrganizer } from '../services/file-organizer';

export async function interactiveOrganize(
  directory: string, 
  options: { recursive?: boolean; config?: string; dryRun?: boolean }
): Promise<void> {
  try {
    console.log(`🤖 Starting interactive AI organization for: ${directory}\n`);
    
    // Initialize services
    const configService = ConfigService.getInstance(options.config);
    const config = await configService.loadConfig();
    
    // Validate API key
    const hasValidKey = await configService.validateApiKey();
    if (!hasValidKey) {
      console.log('💡 Run "organ-ai-zer init" to set up your configuration');
      process.exit(1);
    }

    // Get user's organization intent
    console.log('📝 Let\'s understand how you want to organize your files...\n');
    
    const { organizationIntent } = await inquirer.prompt([
      {
        type: 'input',
        name: 'organizationIntent',
        message: 'Describe how you would like this directory organized:',
        validate: (input) => input.trim().length > 10 || 'Please provide a more detailed description (at least 10 characters)'
      }
    ]);

    // Scan files
    console.log('\n📁 Scanning directory...');
    const scanner = new FileScanner();
    const files = await scanner.scanDirectory(directory, options.recursive || false);
    
    console.log(`📊 Found ${files.length} files to analyze\n`);

    if (files.length === 0) {
      console.log('No files found to organize.');
      return;
    }

    // Show file overview
    const filesByType = groupFilesByType(files);
    console.log('📋 File Overview:');
    Object.entries(filesByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} files`);
    });
    console.log('');

    // Initialize interactive AI organizer
    const interactiveOrganizer = new InteractiveAIOrganizer(configService);
    
    // Start the interactive organization process
    const suggestions = await interactiveOrganizer.organizeWithConversation(
      files,
      directory,
      organizationIntent
    );

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

function groupFilesByType(files: FileInfo[]): Record<string, number> {
  const groups: Record<string, number> = {};
  
  files.forEach(file => {
    const ext = file.extension.toLowerCase();
    
    let category = 'Other';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
      category = 'Images';
    } else if (['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'].includes(ext)) {
      category = 'Videos';
    } else if (['.mp3', '.wav', '.flac', '.aac', '.ogg'].includes(ext)) {
      category = 'Audio';
    } else if (['.pdf', '.doc', '.docx', '.txt', '.rtf'].includes(ext)) {
      category = 'Documents';
    } else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
      category = 'Archives';
    }
    
    groups[category] = (groups[category] || 0) + 1;
  });
  
  return groups;
}
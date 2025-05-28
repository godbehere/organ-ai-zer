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
    
    // Main organization loop - allows starting over
    let suggestions: OrganizationSuggestion[];
    while (true) {
      // Start the 3-phase conversational organization process
      // Phase 1: Analysis, Phase 2: Conversation, Phase 3: Execution
      suggestions = await conversationalOrganizer.organizeWithConversation(directory);

      if (suggestions.length === 0) {
        console.log('🤷 No organization suggestions were generated.');
        return;
      }

      // Show enhanced preview with options
      const previewAction = await showEnhancedPreview(suggestions, options);
      
      if (previewAction === 'start_over') {
        console.log('\n🔄 Starting over with new preferences...\n');
        continue; // Restart the organization process
      }

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
      
      // Break out of loop to proceed with execution
      break;
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

async function showEnhancedPreview(
  suggestions: OrganizationSuggestion[], 
  _options: { dryRun?: boolean }
): Promise<'continue' | 'start_over'> {
  // Group suggestions by category/reason
  const categorizedSuggestions = groupSuggestionsByCategory(suggestions);
  
  console.log(`\n📋 Organization Plan Summary (${suggestions.length} files total):`);
  console.log('═'.repeat(60));
  
  // Show category overview with sample files
  Object.entries(categorizedSuggestions).forEach(([category, categoryFiles]) => {
    console.log(`\n📂 ${category} (${categoryFiles.length} files):`);
    
    // Show up to 3 examples
    const examples = categoryFiles.slice(0, 3);
    examples.forEach(suggestion => {
      console.log(`   ${suggestion.file.name} → ${getRelativePath(suggestion.suggestedPath)}`);
    });
    
    if (categoryFiles.length > 3) {
      console.log(`   ... and ${categoryFiles.length - 3} more files`);
    }
  });

  // Interactive preview options
  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '\nWhat would you like to do?',
        choices: [
          'Continue with organization',
          'View details for a specific category',
          'View all changes',
          'Start over with new preferences',
          'Cancel organization'
        ]
      }
    ]);

    if (action === 'Continue with organization') {
      return 'continue';
    } else if (action === 'View details for a specific category') {
      const categoryAction = await showCategoryDetails(categorizedSuggestions);
      if (categoryAction === 'start_over') {
        return 'start_over';
      }
    } else if (action === 'View all changes') {
      await showAllChanges(suggestions);
    } else if (action === 'Start over with new preferences') {
      return 'start_over';
    } else if (action === 'Cancel organization') {
      console.log('Organization cancelled.');
      process.exit(0);
    }
  }
}

function groupSuggestionsByCategory(suggestions: OrganizationSuggestion[]): Record<string, OrganizationSuggestion[]> {
  const groups: Record<string, OrganizationSuggestion[]> = {};
  
  suggestions.forEach(suggestion => {
    // Extract category from the reason or target path
    let category = 'Other';
    
    if (suggestion.reason.includes('TV Shows') || suggestion.suggestedPath.includes('/TV Shows/')) {
      category = 'TV Shows';
    } else if (suggestion.reason.includes('Movies') || suggestion.suggestedPath.includes('/Movies/')) {
      category = 'Movies';
    } else if (suggestion.reason.includes('Music') || suggestion.suggestedPath.includes('/Music/')) {
      category = 'Music';
    } else if (suggestion.reason.includes('Documents') || suggestion.suggestedPath.includes('/Documents/')) {
      category = 'Documents';
    } else if (suggestion.reason.includes('project') || suggestion.suggestedPath.includes('/Projects/')) {
      category = 'Code Projects';
    } else if (suggestion.reason.includes('Images') || suggestion.suggestedPath.includes('/Images/')) {
      category = 'Images';
    } else if (suggestion.reason.includes('Spreadsheets') || suggestion.suggestedPath.includes('/Spreadsheets/')) {
      category = 'Spreadsheets';
    }
    
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(suggestion);
  });
  
  return groups;
}

function getRelativePath(fullPath: string): string {
  const parts = fullPath.split('/');
  return parts.slice(-2).join('/'); // Show last 2 path segments
}

async function showCategoryDetails(categorizedSuggestions: Record<string, OrganizationSuggestion[]>): Promise<'continue' | 'start_over' | null> {
  const categories = Object.keys(categorizedSuggestions);
  
  const { selectedCategory } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedCategory',
      message: 'Which category would you like to explore?',
      choices: categories.map(cat => `${cat} (${categorizedSuggestions[cat].length} files)`)
    }
  ]);
  
  const categoryName = selectedCategory.split(' (')[0];
  const categoryFiles = categorizedSuggestions[categoryName];
  
  console.log(`\n📂 ${categoryName} - Detailed Changes:`);
  console.log('─'.repeat(50));
  
  categoryFiles.forEach((suggestion, index) => {
    console.log(`\n${index + 1}. ${suggestion.file.name}`);
    console.log(`   From: ${suggestion.file.path}`);
    console.log(`   To:   ${suggestion.suggestedPath}`);
    console.log(`   Reason: ${suggestion.reason}`);
  });
  
  console.log(`\n📊 Total files in ${categoryName}: ${categoryFiles.length}`);
  
  // Add options for this category
  const { categoryAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'categoryAction',
      message: `\nWhat would you like to do with the ${categoryName} category?`,
      choices: [
        'Go back to main preview',
        'Modify organization rules for this category',
        'Start over with new preferences'
      ]
    }
  ]);

  if (categoryAction === 'Go back to main preview') {
    return null; // Continue with category viewing
  } else if (categoryAction === 'Modify organization rules for this category') {
    return await modifyCategoryRules(categoryName, categoryFiles);
  } else if (categoryAction === 'Start over with new preferences') {
    return 'start_over';
  }
  
  return null;
}

async function modifyCategoryRules(categoryName: string, categoryFiles: OrganizationSuggestion[]): Promise<'continue' | 'start_over'> {
  console.log(`\n🔧 Modifying rules for ${categoryName} category:`);
  console.log('─'.repeat(50));
  
  // Show current pattern example
  if (categoryFiles.length > 0) {
    const example = categoryFiles[0];
    console.log(`📁 Current organization pattern:`);
    console.log(`   ${example.file.name} → ${example.suggestedPath}`);
    console.log(`   Reason: ${example.reason}\n`);
  }
  
  const { modificationType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'modificationType',
      message: 'How would you like to modify this category?',
      choices: [
        'Change the folder structure/naming pattern',
        'Provide specific instructions for this file type',
        'Keep current rules but ask AI to reconsider',
        'Go back without changes'
      ]
    }
  ]);

  if (modificationType === 'Go back without changes') {
    return 'continue';
  } else if (modificationType === 'Change the folder structure/naming pattern') {
    const { newPattern } = await inquirer.prompt([
      {
        type: 'input',
        name: 'newPattern',
        message: `How would you like ${categoryName} files organized instead?`,
        default: `Describe your preferred folder structure for ${categoryName.toLowerCase()} files`
      }
    ]);
    
    console.log(`\n✅ Your new preference for ${categoryName}: ${newPattern}`);
    console.log('💡 This will be applied when you start over with new preferences.\n');
    
    return 'start_over';
  } else if (modificationType === 'Provide specific instructions for this file type') {
    const { specificInstructions } = await inquirer.prompt([
      {
        type: 'input',
        name: 'specificInstructions',
        message: `What specific instructions do you have for ${categoryName} files?`,
        default: `e.g., "Include quality in filename", "Organize by decade", "Group by artist"`
      }
    ]);
    
    console.log(`\n✅ Your specific instructions for ${categoryName}: ${specificInstructions}`);
    console.log('💡 This will be applied when you start over with new preferences.\n');
    
    return 'start_over';
  } else if (modificationType === 'Keep current rules but ask AI to reconsider') {
    console.log(`\n🤖 The AI will reconsider the ${categoryName} organization with fresh analysis.`);
    console.log('💡 This will happen when you start over with new preferences.\n');
    
    return 'start_over';
  }
  
  return 'continue';
}

async function showAllChanges(suggestions: OrganizationSuggestion[]): Promise<void> {
  console.log(`\n📋 Complete Organization Plan (${suggestions.length} files):`);
  console.log('═'.repeat(60));
  
  suggestions.forEach((suggestion, index) => {
    console.log(`\n${index + 1}. ${suggestion.file.name}`);
    console.log(`   From: ${suggestion.file.path}`);
    console.log(`   To:   ${suggestion.suggestedPath}`);
    console.log(`   Reason: ${suggestion.reason}`);
  });
}


// import { OrganizeOptions } from '../types';
// import { FileScanner } from '../services/file-scanner';
// // import { AIOrganizer } from '../services/ai-organizer';
// import { FileOrganizer } from '../services/file-organizer';
// import { ConfigService } from '../services/config-service';

// export async function organize(directory: string, options: OrganizeOptions): Promise<void> {
//   try {
//     console.log(`Starting organization of: ${directory}`);
    
//     if (options.dryRun) {
//       console.log('🔍 Running in dry-run mode - no files will be moved');
//     }

//     // Initialize config service
//     const configService = ConfigService.getInstance(options.config);
//     const config = await configService.loadConfig();

//     // Validate API key
//     const hasValidKey = await configService.validateApiKey();
//     if (!hasValidKey) {
//       console.log('💡 Run "organ-ai-zer init" to set up your configuration');
//       process.exit(1);
//     }

//     const scanner = new FileScanner();
//     const files = await scanner.scanDirectory(directory, options.recursive || false);
    
//     console.log(`📁 Found ${files.length} files to process`);

//     // const aiOrganizer = new AIOrganizer(configService);
//     const suggestions = await aiOrganizer.generateSuggestions(files);
    
//     console.log(`🤖 Generated ${suggestions.length} organization suggestions`);

//     if (options.dryRun) {
//       suggestions.forEach(suggestion => {
//         console.log(`📄 ${suggestion.file.name} → ${suggestion.suggestedPath}`);
//         console.log(`   Reason: ${suggestion.reason} (${Math.round(suggestion.confidence * 100)}% confident)`);
//       });
//       return;
//     }

//     // Create backup if enabled
//     if (config.organization.createBackups) {
//       const fileOrganizer = new FileOrganizer();
//       const backupPath = await fileOrganizer.createBackup(directory);
//       console.log(`📦 Backup created: ${backupPath}`);
//     }

//     const fileOrganizer = new FileOrganizer();
//     await fileOrganizer.applySuggestions(suggestions);
    
//     console.log('✅ Organization complete!');
//   } catch (error) {
//     console.error('❌ Error during organization:', error);
//     process.exit(1);
//   }
// }
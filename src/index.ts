#!/usr/bin/env node

import { Command } from 'commander';
import { organize } from './commands/organize';
import { preview } from './commands/preview';
import { init } from './commands/init';
import { cache } from './commands/cache';
import { interactiveOrganize } from './commands/interactive-organize';

const program = new Command();

program
  .name('organ-ai-zer')
  .description('AI-powered file organizer CLI tool')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize configuration file')
  .option('--force', 'Overwrite existing config file')
  .option('--no-interactive', 'Skip interactive setup and use defaults')
  .option('-c, --config <path>', 'Custom config file path')
  .action(init);

program
  .command('organize')
  .description('Organize files in the specified directory')
  .argument('<directory>', 'Directory to organize')
  .option('-d, --dry-run', 'Preview changes without applying them')
  .option('-r, --recursive', 'Include subdirectories')
  .option('-c, --config <path>', 'Custom config file path')
  .option('--no-cache', 'Bypass cache and force fresh AI analysis')
  .action(organize);

program
  .command('preview')
  .description('Preview how files would be organized')
  .argument('<directory>', 'Directory to preview')
  .option('-r, --recursive', 'Include subdirectories')
  .option('-c, --config <path>', 'Custom config file path')
  .option('--no-cache', 'Bypass cache and force fresh AI analysis')
  .action(preview);

program
  .command('interactive')
  .description('Conversational AI organizer that analyzes, asks questions, then organizes autonomously')
  .argument('<directory>', 'Directory to organize with AI conversation')
  .option('-c, --config <path>', 'Custom config file path')
  .option('-d, --dry-run', 'Simulate organization without moving files')
  .option('--no-cache', 'Bypass cache and force fresh AI analysis')
  .action(interactiveOrganize);

program
  .command('cache')
  .description('Manage suggestion cache')
  .argument('<action>', 'Cache action: clear, clean, stats')
  .option('-d, --directory <path>', 'Specific directory for cache operations')
  .action(cache);

program.parse();
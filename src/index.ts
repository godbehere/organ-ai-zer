#!/usr/bin/env node

import { Command } from 'commander';
import { organize } from './commands/organize';
import { preview } from './commands/preview';
import { init } from './commands/init';

const program = new Command();

program
  .name('organ-ai-zer')
  .description('AI-powered file organizer CLI tool')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize configuration file')
  .option('--force', 'Overwrite existing config file')
  .option('-c, --config <path>', 'Custom config file path')
  .action(init);

program
  .command('organize')
  .description('Organize files in the specified directory')
  .argument('<directory>', 'Directory to organize')
  .option('-d, --dry-run', 'Preview changes without applying them')
  .option('-r, --recursive', 'Include subdirectories')
  .option('-c, --config <path>', 'Custom config file path')
  .action(organize);

program
  .command('preview')
  .description('Preview how files would be organized')
  .argument('<directory>', 'Directory to preview')
  .option('-r, --recursive', 'Include subdirectories')
  .option('-c, --config <path>', 'Custom config file path')
  .action(preview);

program.parse();
import { FileInfo } from '../types';

/**
 * Pattern matching result for a file
 */
export interface PatternMatch {
  /** Type of pattern matched */
  type: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Extracted metadata from the pattern */
  metadata: Record<string, any>;
  /** Description of what was matched */
  description: string;
}

/**
 * Grouped pattern analysis result
 */
export interface PatternGroup {
  /** Group identifier */
  groupId: string;
  /** Group type/category */
  type: string;
  /** Files in this group */
  files: FileInfo[];
  /** Common pattern description */
  pattern: string;
  /** Confidence this is a valid group */
  confidence: number;
  /** Extracted group metadata */
  metadata: Record<string, any>;
}

/**
 * Pattern analysis summary
 */
export interface PatternAnalysis {
  /** Individual file pattern matches */
  fileMatches: Map<string, PatternMatch[]>;
  /** Detected pattern groups */
  groups: PatternGroup[];
  /** Overall analysis hints for AI */
  hints: string[];
  /** Directory structure suggestions */
  structureSuggestions: string[];
}

/**
 * Pattern Matching Service
 * Optional utility to supplement AI analysis with pattern recognition
 * Focuses on common patterns that can help guide AI understanding
 */
export class PatternMatchingService {
  private patterns: PatternMatcher[];

  constructor() {
    this.patterns = [
      new SeriesPatternMatcher(),
      new VersionPatternMatcher(),
      new DatePatternMatcher(),
      new ProjectPatternMatcher(),
      new MediaPatternMatcher(),
      new DocumentSeriesPatternMatcher(),
      new ArchivePatternMatcher(),
      new TimestampPatternMatcher()
    ];
  }

  /**
   * Analyze files for patterns and return insights for AI
   */
  analyzePatterns(files: FileInfo[]): PatternAnalysis {
    const fileMatches = new Map<string, PatternMatch[]>();
    const allMatches: PatternMatch[] = [];

    // Run pattern matching on all files
    files.forEach(file => {
      const matches: PatternMatch[] = [];
      
      this.patterns.forEach(pattern => {
        const match = pattern.match(file);
        if (match) {
          matches.push(match);
          allMatches.push(match);
        }
      });
      
      if (matches.length > 0) {
        fileMatches.set(file.name, matches);
      }
    });

    // Group related files based on patterns
    const groups = this.findPatternGroups(files, fileMatches);
    
    // Generate insights for AI
    const hints = this.generateHints(fileMatches, groups);
    const structureSuggestions = this.generateStructureSuggestions(groups);

    return {
      fileMatches,
      groups,
      hints,
      structureSuggestions
    };
  }

  /**
   * Get pattern hints that can be provided to AI for better analysis
   */
  getPatternHints(files: FileInfo[]): string[] {
    const analysis = this.analyzePatterns(files);
    return analysis.hints;
  }

  /**
   * Check if files appear to be part of a series or collection
   */
  findSeries(files: FileInfo[]): PatternGroup[] {
    const analysis = this.analyzePatterns(files);
    return analysis.groups.filter(group => 
      group.type === 'series' || 
      group.type === 'episode_series' || 
      group.type === 'version_series'
    );
  }

  /**
   * Check if files appear to be project-related
   */
  findProjects(files: FileInfo[]): PatternGroup[] {
    const analysis = this.analyzePatterns(files);
    return analysis.groups.filter(group => group.type === 'project');
  }

  /**
   * Find pattern groups from individual matches
   */
  private findPatternGroups(files: FileInfo[], fileMatches: Map<string, PatternMatch[]>): PatternGroup[] {
    const groups: PatternGroup[] = [];
    const processedFiles = new Set<string>();

    // Group by series patterns
    groups.push(...this.groupBySeries(files, fileMatches, processedFiles));
    
    // Group by project patterns
    groups.push(...this.groupByProject(files, fileMatches, processedFiles));
    
    // Group by date patterns
    groups.push(...this.groupByDate(files, fileMatches, processedFiles));
    
    // Group by common prefixes/suffixes
    groups.push(...this.groupByNameSimilarity(files, processedFiles));

    return groups;
  }

  /**
   * Group files by series patterns
   */
  private groupBySeries(files: FileInfo[], fileMatches: Map<string, PatternMatch[]>, processedFiles: Set<string>): PatternGroup[] {
    const groups: PatternGroup[] = [];
    const seriesMap = new Map<string, FileInfo[]>();

    files.forEach(file => {
      if (processedFiles.has(file.name)) return;
      
      const matches = fileMatches.get(file.name) || [];
      const seriesMatch = matches.find(m => m.type === 'episode_series' || m.type === 'season_series');
      
      if (seriesMatch && seriesMatch.metadata.seriesName) {
        const seriesName = seriesMatch.metadata.seriesName;
        if (!seriesMap.has(seriesName)) {
          seriesMap.set(seriesName, []);
        }
        seriesMap.get(seriesName)!.push(file);
        processedFiles.add(file.name);
      }
    });

    seriesMap.forEach((seriesFiles, seriesName) => {
      if (seriesFiles.length > 1) {
        groups.push({
          groupId: `series_${seriesName.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'series',
          files: seriesFiles,
          pattern: `TV/Movie series: ${seriesName}`,
          confidence: 0.9,
          metadata: { seriesName, fileCount: seriesFiles.length }
        });
      }
    });

    return groups;
  }

  /**
   * Group files by project patterns
   */
  private groupByProject(files: FileInfo[], fileMatches: Map<string, PatternMatch[]>, processedFiles: Set<string>): PatternGroup[] {
    const groups: PatternGroup[] = [];
    const projectMap = new Map<string, FileInfo[]>();

    files.forEach(file => {
      if (processedFiles.has(file.name)) return;
      
      const matches = fileMatches.get(file.name) || [];
      const projectMatch = matches.find(m => m.type === 'project');
      
      if (projectMatch && projectMatch.metadata.projectName) {
        const projectName = projectMatch.metadata.projectName;
        if (!projectMap.has(projectName)) {
          projectMap.set(projectName, []);
        }
        projectMap.get(projectName)!.push(file);
        processedFiles.add(file.name);
      }
    });

    projectMap.forEach((projectFiles, projectName) => {
      if (projectFiles.length > 1) {
        groups.push({
          groupId: `project_${projectName.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'project',
          files: projectFiles,
          pattern: `Code/Document project: ${projectName}`,
          confidence: 0.8,
          metadata: { projectName, fileCount: projectFiles.length }
        });
      }
    });

    return groups;
  }

  /**
   * Group files by date patterns
   */
  private groupByDate(files: FileInfo[], fileMatches: Map<string, PatternMatch[]>, processedFiles: Set<string>): PatternGroup[] {
    const groups: PatternGroup[] = [];
    const dateMap = new Map<string, FileInfo[]>();

    files.forEach(file => {
      if (processedFiles.has(file.name)) return;
      
      const matches = fileMatches.get(file.name) || [];
      const dateMatch = matches.find(m => m.type === 'date');
      
      if (dateMatch && dateMatch.metadata.dateGroup) {
        const dateGroup = dateMatch.metadata.dateGroup;
        if (!dateMap.has(dateGroup)) {
          dateMap.set(dateGroup, []);
        }
        dateMap.get(dateGroup)!.push(file);
      }
    });

    dateMap.forEach((dateFiles, dateGroup) => {
      if (dateFiles.length > 2) {
        groups.push({
          groupId: `date_${dateGroup}`,
          type: 'date_group',
          files: dateFiles,
          pattern: `Files from ${dateGroup}`,
          confidence: 0.7,
          metadata: { dateGroup, fileCount: dateFiles.length }
        });
      }
    });

    return groups;
  }

  /**
   * Group files by name similarity
   */
  private groupByNameSimilarity(files: FileInfo[], processedFiles: Set<string>): PatternGroup[] {
    const groups: PatternGroup[] = [];
    const remainingFiles = files.filter(f => !processedFiles.has(f.name));
    
    // Simple prefix grouping
    const prefixMap = new Map<string, FileInfo[]>();
    
    remainingFiles.forEach(file => {
      const prefix = this.extractCommonPrefix(file.name);
      if (prefix.length > 3) {
        if (!prefixMap.has(prefix)) {
          prefixMap.set(prefix, []);
        }
        prefixMap.get(prefix)!.push(file);
      }
    });

    prefixMap.forEach((prefixFiles, prefix) => {
      if (prefixFiles.length > 2) {
        groups.push({
          groupId: `prefix_${prefix.toLowerCase().replace(/\W+/g, '_')}`,
          type: 'name_similarity',
          files: prefixFiles,
          pattern: `Files with common prefix: ${prefix}`,
          confidence: 0.6,
          metadata: { prefix, fileCount: prefixFiles.length }
        });
      }
    });

    return groups;
  }

  /**
   * Extract common prefix from filename
   */
  private extractCommonPrefix(filename: string): string {
    // Remove extension and extract potential prefix
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
    
    // Look for common separators
    const separators = [' - ', '_', ' ', '.'];
    
    for (const sep of separators) {
      const parts = nameWithoutExt.split(sep);
      if (parts.length > 1 && parts[0].length > 3) {
        return parts[0];
      }
    }
    
    return nameWithoutExt.substring(0, Math.min(10, nameWithoutExt.length));
  }

  /**
   * Generate hints for AI based on pattern analysis
   */
  private generateHints(fileMatches: Map<string, PatternMatch[]>, groups: PatternGroup[]): string[] {
    const hints: string[] = [];

    // Series hints
    const seriesGroups = groups.filter(g => g.type === 'series');
    if (seriesGroups.length > 0) {
      hints.push(`Detected ${seriesGroups.length} TV/movie series with episode patterns`);
      seriesGroups.forEach(group => {
        hints.push(`Series "${group.metadata.seriesName}" has ${group.metadata.fileCount} files`);
      });
    }

    // Project hints
    const projectGroups = groups.filter(g => g.type === 'project');
    if (projectGroups.length > 0) {
      hints.push(`Detected ${projectGroups.length} potential code/document projects`);
      projectGroups.forEach(group => {
        hints.push(`Project "${group.metadata.projectName}" has ${group.metadata.fileCount} files`);
      });
    }

    // Date grouping hints
    const dateGroups = groups.filter(g => g.type === 'date_group');
    if (dateGroups.length > 0) {
      hints.push(`Found files that could be organized by date/time periods`);
    }

    // Pattern variety hints
    const patternTypes = new Set<string>();
    fileMatches.forEach(matches => {
      matches.forEach(match => patternTypes.add(match.type));
    });

    if (patternTypes.has('version')) {
      hints.push('Some files appear to be different versions of the same content');
    }

    if (patternTypes.has('archive')) {
      hints.push('Archive files detected - consider if they should be extracted or organized separately');
    }

    return hints;
  }

  /**
   * Generate structure suggestions based on groups
   */
  private generateStructureSuggestions(groups: PatternGroup[]): string[] {
    const suggestions: string[] = [];

    groups.forEach(group => {
      switch (group.type) {
        case 'series':
          suggestions.push(`Consider organizing "${group.metadata.seriesName}" files in TV Shows/${group.metadata.seriesName}/`);
          break;
        case 'project':
          suggestions.push(`Keep project "${group.metadata.projectName}" files together in Projects/${group.metadata.projectName}/`);
          break;
        case 'date_group':
          suggestions.push(`Files from ${group.metadata.dateGroup} could be organized by date`);
          break;
      }
    });

    return suggestions;
  }
}

/**
 * Base pattern matcher interface
 */
abstract class PatternMatcher {
  abstract match(file: FileInfo): PatternMatch | null;
}

/**
 * Series pattern matcher (TV shows, movies, etc.)
 */
class SeriesPatternMatcher extends PatternMatcher {
  match(file: FileInfo): PatternMatch | null {
    const name = file.name.toLowerCase();
    
    // TV series patterns
    const episodePatterns = [
      /(.+?)[-.\s]+s(\d+)e(\d+)/i,
      /(.+?)[-.\s]+season[-.\s]*(\d+)[-.\s]*episode[-.\s]*(\d+)/i,
      /(.+?)[-.\s]+(\d+)x(\d+)/i
    ];

    for (const pattern of episodePatterns) {
      const match = name.match(pattern);
      if (match) {
        return {
          type: 'episode_series',
          confidence: 0.9,
          metadata: {
            seriesName: this.cleanSeriesName(match[1]),
            season: parseInt(match[2]),
            episode: parseInt(match[3])
          },
          description: `TV series episode: ${match[1]} S${match[2]}E${match[3]}`
        };
      }
    }

    return null;
  }

  private cleanSeriesName(name: string): string {
    return name.replace(/[-._]/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Version pattern matcher
 */
class VersionPatternMatcher extends PatternMatcher {
  match(file: FileInfo): PatternMatch | null {
    const name = file.name.toLowerCase();
    
    const versionPatterns = [
      /(.+?)[-.\s]*v(\d+)\.(\d+)/i,
      /(.+?)[-.\s]*version[-.\s]*(\d+)/i,
      /(.+?)[-.\s]*\((\d+)\)/i
    ];

    for (const pattern of versionPatterns) {
      const match = name.match(pattern);
      if (match) {
        return {
          type: 'version',
          confidence: 0.8,
          metadata: {
            baseName: match[1].trim(),
            version: match[2]
          },
          description: `Versioned file: ${match[1]} v${match[2]}`
        };
      }
    }

    return null;
  }
}

/**
 * Date pattern matcher
 */
class DatePatternMatcher extends PatternMatcher {
  match(file: FileInfo): PatternMatch | null {
    const name = file.name;
    
    const datePatterns = [
      /(\d{4})[-._](\d{2})[-._](\d{2})/,
      /(\d{2})[-._](\d{2})[-._](\d{4})/,
      /(\d{4})(\d{2})(\d{2})/
    ];

    for (const pattern of datePatterns) {
      const match = name.match(pattern);
      if (match) {
        const year = match[1].length === 4 ? match[1] : match[3];
        const month = match[1].length === 4 ? match[2] : match[1];
        const day = match[1].length === 4 ? match[3] : match[2];
        
        return {
          type: 'date',
          confidence: 0.7,
          metadata: {
            year,
            month,
            day,
            dateGroup: `${year}-${month}`
          },
          description: `Date-stamped file: ${year}-${month}-${day}`
        };
      }
    }

    return null;
  }
}

/**
 * Project pattern matcher
 */
class ProjectPatternMatcher extends PatternMatcher {
  match(file: FileInfo): PatternMatch | null {
    const name = file.name.toLowerCase();
    
    // Project indicator files
    const projectFiles = [
      'package.json',
      'requirements.txt',
      'cargo.toml',
      'pom.xml',
      'makefile',
      'dockerfile',
      'readme.md',
      'readme.txt',
      '.gitignore'
    ];

    if (projectFiles.some(pf => name.includes(pf))) {
      return {
        type: 'project',
        confidence: 0.9,
        metadata: {
          projectName: this.extractProjectName(file.name),
          isProjectFile: true
        },
        description: 'Project configuration/documentation file'
      };
    }

    return null;
  }

  private extractProjectName(filename: string): string {
    // Try to extract project name from directory or filename
    const parts = filename.split(/[/\\]/);
    return parts[parts.length - 2] || 'Unknown Project';
  }
}

/**
 * Media pattern matcher
 */
class MediaPatternMatcher extends PatternMatcher {
  match(file: FileInfo): PatternMatch | null {
    const ext = file.extension.toLowerCase();
    const name = file.name.toLowerCase();
    
    // Video files
    if (ext.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/)) {
      const yearMatch = name.match(/\((\d{4})\)|(\d{4})/);
      const qualityMatch = name.match(/(1080p|720p|4k|hdr|bluray|dvd)/i);
      
      return {
        type: 'video',
        confidence: 0.8,
        metadata: {
          year: yearMatch ? yearMatch[1] || yearMatch[2] : null,
          quality: qualityMatch ? qualityMatch[1] : null,
          isVideo: true
        },
        description: `Video file${yearMatch ? ` from ${yearMatch[1] || yearMatch[2]}` : ''}`
      };
    }

    // Audio files
    if (ext.match(/\.(mp3|wav|flac|m4a|aac|ogg)$/)) {
      return {
        type: 'audio',
        confidence: 0.8,
        metadata: {
          isAudio: true
        },
        description: 'Audio file'
      };
    }

    return null;
  }
}

/**
 * Document series pattern matcher
 */
class DocumentSeriesPatternMatcher extends PatternMatcher {
  match(file: FileInfo): PatternMatch | null {
    const name = file.name.toLowerCase();
    const ext = file.extension.toLowerCase();
    
    if (!ext.match(/\.(pdf|doc|docx|txt|md)$/)) return null;
    
    const seriesPatterns = [
      /(.+?)[-.\s]*part[-.\s]*(\d+)/i,
      /(.+?)[-.\s]*chapter[-.\s]*(\d+)/i,
      /(.+?)[-.\s]*vol[-.\s]*(\d+)/i,
      /(.+?)[-.\s]*(\d+)[-.\s]*of[-.\s]*(\d+)/i
    ];

    for (const pattern of seriesPatterns) {
      const match = name.match(pattern);
      if (match) {
        return {
          type: 'document_series',
          confidence: 0.7,
          metadata: {
            seriesName: match[1].trim(),
            part: match[2]
          },
          description: `Document series: ${match[1]} part ${match[2]}`
        };
      }
    }

    return null;
  }
}

/**
 * Archive pattern matcher
 */
class ArchivePatternMatcher extends PatternMatcher {
  match(file: FileInfo): PatternMatch | null {
    const ext = file.extension.toLowerCase();
    
    if (ext.match(/\.(zip|rar|7z|tar|gz|bz2)$/)) {
      return {
        type: 'archive',
        confidence: 0.9,
        metadata: {
          isArchive: true,
          archiveType: ext
        },
        description: `Archive file (.${ext})`
      };
    }

    return null;
  }
}

/**
 * Timestamp pattern matcher
 */
class TimestampPatternMatcher extends PatternMatcher {
  match(file: FileInfo): PatternMatch | null {
    const name = file.name;
    
    // Unix timestamp pattern
    const timestampMatch = name.match(/(\d{10,13})/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1]);
      const date = new Date(timestamp.toString().length === 10 ? timestamp * 1000 : timestamp);
      
      if (date.getFullYear() > 1990 && date.getFullYear() < 2030) {
        return {
          type: 'timestamp',
          confidence: 0.6,
          metadata: {
            timestamp,
            date: date.toISOString(),
            dateGroup: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          },
          description: `Timestamp-named file from ${date.toLocaleDateString()}`
        };
      }
    }

    return null;
  }
}
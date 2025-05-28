import inquirer from 'inquirer';
import ora from 'ora';
import { FileInfo, OrganizationSuggestion, UserConfig } from '../types';
import { ConfigService } from './config-service';
import { OpenAIProvider, AnthropicProvider, BaseAIProvider } from './ai-providers';
import { FileScanner } from './file-scanner';

interface DirectoryAnalysis {
  totalFiles: number;
  fileTypes: Record<string, number>;
  directoryStructure: string[];
  sampleFiles: Record<string, string[]>;
  detectedProjects: ProjectInfo[];
  mediaPatterns: {
    tvShows: string[];
    movies: string[];
    musicArtists: string[];
  };
}

interface ProjectInfo {
  path: string;
  name: string;
  type: string; // 'web', 'python', 'node', 'rust', 'java', 'generic', etc.
  confidence: number;
  indicators: string[]; // What made us think this is a project
  files: string[]; // All files belonging to this project
}

interface FileTypeRule {
  type: string;
  pattern: string;
  folder: string;
  naming: string;
  examples: string[];
}

interface OrganizationStrategy {
  approach: string;
  fileTypeRules: Record<string, FileTypeRule>;
  uncertaintyThreshold: number;
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ConversationContext {
  mediaType: string;
  sampleFiles: string[];
  userGoal: string;
  currentSuggestion?: { folder: string; naming: string; reasoning: string };
  attemptCount: number;
  conversationHistory: ConversationMessage[];
}

export class ConversationalAIOrganizer {
  private configService: ConfigService;
  private aiProvider: BaseAIProvider | null = null;
  private fileScanner = new FileScanner();
  private conversationContext: ConversationContext | null = null;

  constructor(configService?: ConfigService) {
    this.configService = configService || ConfigService.getInstance();
  }

  async organizeWithConversation(
    targetDirectory: string
  ): Promise<OrganizationSuggestion[]> {
    console.log('🤖 Starting intelligent conversation-driven organization...\n');

    // Phase 1: Discovery - Analyze the directory structure
    console.log('🔍 Phase 1: Analyzing your files and directories...');
    const analysis = await this.analyzeDirectory(targetDirectory);
    
    // Phase 2: Conversation - Build understanding through AI conversation
    console.log('\n💬 Phase 2: Understanding your organization preferences...');
    const strategy = await this.buildOrganizationStrategy(analysis);
    
    // Phase 3: Execution - Organize with minimal interruption
    console.log('\n⚙️ Phase 3: Organizing your files...');
    const suggestions = await this.executeOrganization(targetDirectory, analysis, strategy);
    
    return suggestions;
  }

  private async analyzeDirectory(targetDirectory: string): Promise<DirectoryAnalysis> {
    const spinner = ora('Scanning directory structure...').start();
    
    try {
      // Get all files recursively (interactive mode always scans recursively)
      const files = await this.fileScanner.scanDirectory(targetDirectory, true);
      
      // Analyze file types and patterns
      const fileTypes: Record<string, number> = {};
      const sampleFiles: Record<string, string[]> = {};
      const mediaPatterns = {
        tvShows: [] as string[],
        movies: [] as string[],
        musicArtists: [] as string[]
      };

      files.forEach(file => {
        const category = this.fileScanner.getFileCategory(file);
        fileTypes[category] = (fileTypes[category] || 0) + 1;
        
        if (!sampleFiles[category]) sampleFiles[category] = [];
        if (sampleFiles[category].length < 3) {
          sampleFiles[category].push(file.name);
        }

        // Detect media patterns
        this.detectMediaPatterns(file, mediaPatterns);
      });

      // Get directory structure
      const directoryStructure = this.extractDirectoryStructure(files);

      // Detect projects using hybrid AI + pattern approach
      const detectedProjects = await this.detectProjects(files, directoryStructure);

      spinner.succeed(`Found ${files.length} files in ${directoryStructure.length} directories`);

      return {
        totalFiles: files.length,
        fileTypes,
        directoryStructure,
        sampleFiles,
        detectedProjects,
        mediaPatterns
      };
    } catch (error) {
      spinner.fail(`Failed to analyze directory: ${error}`);
      throw error;
    }
  }

  private detectMediaPatterns(
    file: FileInfo, 
    mediaPatterns: DirectoryAnalysis['mediaPatterns']
  ): void {
    const fileName = file.name.toLowerCase();

    // TV show detection
    if (fileName.match(/s\d+e\d+/) || fileName.match(/season\s+\d+/)) {
      const showName = this.extractShowName(fileName);
      if (showName && !mediaPatterns.tvShows.includes(showName)) {
        mediaPatterns.tvShows.push(showName);
      }
    }

    // Movie detection
    if (fileName.match(/\d{4}/) && file.extension.match(/\.(mkv|mp4|avi)$/)) {
      const movieName = this.extractMovieName(fileName);
      if (movieName && !mediaPatterns.movies.includes(movieName)) {
        mediaPatterns.movies.push(movieName);
      }
    }

    // Music artist detection
    if (file.extension.match(/\.(mp3|wav|flac)$/)) {
      const artist = this.extractArtistName(fileName);
      if (artist && !mediaPatterns.musicArtists.includes(artist)) {
        mediaPatterns.musicArtists.push(artist);
      }
    }
  }

  private async detectProjects(files: FileInfo[], directories: string[]): Promise<ProjectInfo[]> {
    if (!this.aiProvider) {
      // Fallback to pattern-based detection only
      return this.detectProjectsByPatterns(files, directories);
    }

    try {
      // Use AI to analyze directory structures for projects
      const aiDetectedProjects = await this.detectProjectsWithAI(files, directories);
      
      // Supplement with pattern-based detection
      const patternDetectedProjects = this.detectProjectsByPatterns(files, directories);
      
      // Merge and deduplicate results
      return this.mergeProjectDetections(aiDetectedProjects, patternDetectedProjects);
      
    } catch (error) {
      console.warn('AI project detection failed, using pattern-based detection');
      return this.detectProjectsByPatterns(files, directories);
    }
  }

  private async detectProjectsWithAI(files: FileInfo[], directories: string[]): Promise<ProjectInfo[]> {
    if (!this.aiProvider) {
      return [];
    }

    // Group files by directory for AI analysis
    const directoriesWithFiles: Record<string, string[]> = {};
    files.forEach(file => {
      const dir = file.path.replace('/' + file.name, '') || '.';
      if (!directoriesWithFiles[dir]) {
        directoriesWithFiles[dir] = [];
      }
      directoriesWithFiles[dir].push(file.name);
    });

    const prompt = `You are an intelligent project detector. Analyze these directory structures and identify which directories contain software/development projects that should be kept intact.

DIRECTORIES TO ANALYZE:
${Object.entries(directoriesWithFiles).map(([dir, fileList]) => 
  `${dir}/\n  Files: ${fileList.slice(0, 10).join(', ')}${fileList.length > 10 ? ` (and ${fileList.length - 10} more)` : ''}`
).join('\n\n')}

For each directory, determine:
1. Is this a software/development project that should be kept as a unit?
2. What type of project is it? (web, mobile, python, node, rust, java, documentation, etc.)
3. How confident are you? (0.0 to 1.0)
4. What specific indicators made you think this is a project?

Look for indicators like:
- Configuration files (package.json, requirements.txt, Cargo.toml, pom.xml, etc.)
- Source code organization (src/, lib/, tests/, docs/)
- Build files (Makefile, Dockerfile, build scripts)
- Documentation (README files, docs/)
- Version control indicators (.gitignore, etc.)
- Dependency management files
- Project structure patterns

Return a JSON object:
{
  "detectedProjects": [
    {
      "path": "my-web-app",
      "name": "my-web-app",
      "type": "web",
      "confidence": 0.95,
      "indicators": ["package.json", "src/ directory", "README.md", "organized file structure"],
      "reasoning": "Contains package.json, has src/ directory structure, includes README documentation"
    }
  ]
}

Only identify directories that are clearly organized development projects. Don't flag random collections of files.`;

    try {
      const request = {
        files: files.slice(0, 50), // Limit for AI processing
        baseDirectory: directories[0] || '.',
        userPreferences: { 
          intent: 'detect_projects',
          directoryAnalysis: { directories: Object.keys(directoriesWithFiles) }
        }
      };

      const response = await this.aiProvider.analyzeFiles(request);
      return this.parseAIProjectResponse(response, directoriesWithFiles);

    } catch (error) {
      console.warn('AI project detection request failed:', error);
      return [];
    }
  }

  private parseAIProjectResponse(response: any, directoriesWithFiles: Record<string, string[]>): ProjectInfo[] {
    try {
      const responseText = response.reasoning || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.detectedProjects) {
          return parsed.detectedProjects.map((project: any) => ({
            path: project.path,
            name: project.name || project.path.split('/').pop() || 'Unknown Project',
            type: project.type || 'generic',
            confidence: Math.min(Math.max(project.confidence || 0.5, 0), 1),
            indicators: project.indicators || [],
            files: directoriesWithFiles[project.path] || []
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to parse AI project response');
    }
    
    return [];
  }

  private detectProjectsByPatterns(files: FileInfo[], directories: string[]): ProjectInfo[] {
    const projects: ProjectInfo[] = [];
    const projectIndicators = new Map<string, { type: string; indicators: string[]; confidence: number }>();

    // Known project file patterns
    const patterns = [
      { files: ['package.json'], type: 'node', confidence: 0.9 },
      { files: ['requirements.txt', 'setup.py', 'pyproject.toml'], type: 'python', confidence: 0.9 },
      { files: ['Cargo.toml'], type: 'rust', confidence: 0.9 },
      { files: ['pom.xml'], type: 'java', confidence: 0.9 },
      { files: ['composer.json'], type: 'php', confidence: 0.9 },
      { files: ['Gemfile'], type: 'ruby', confidence: 0.9 },
      { files: ['go.mod'], type: 'go', confidence: 0.9 },
      { files: ['Makefile'], type: 'c/cpp', confidence: 0.7 },
      { files: ['Dockerfile'], type: 'containerized', confidence: 0.8 },
      { files: ['.gitignore', 'README.md'], type: 'generic', confidence: 0.6 }
    ];

    files.forEach(file => {
      const dir = file.path.replace('/' + file.name, '') || '.';
      const fileName = file.name.toLowerCase();
      
      patterns.forEach(pattern => {
        if (pattern.files.some(patternFile => fileName.includes(patternFile.toLowerCase()))) {
          if (!projectIndicators.has(dir)) {
            projectIndicators.set(dir, { type: pattern.type, indicators: [], confidence: 0 });
          }
          
          const project = projectIndicators.get(dir)!;
          project.indicators.push(file.name);
          project.confidence = Math.max(project.confidence, pattern.confidence);
          
          // Higher confidence for multiple indicators
          if (project.indicators.length > 1) {
            project.confidence = Math.min(project.confidence + 0.1, 1.0);
          }
        }
      });
    });

    // Convert to ProjectInfo array
    projectIndicators.forEach((info, path) => {
      if (info.confidence >= 0.6) { // Only include confident detections
        const projectFiles = files
          .filter(file => file.path.startsWith(path))
          .map(file => file.name);
          
        projects.push({
          path,
          name: path.split('/').pop() || 'Unknown Project',
          type: info.type,
          confidence: info.confidence,
          indicators: info.indicators,
          files: projectFiles
        });
      }
    });

    return projects;
  }

  private mergeProjectDetections(aiProjects: ProjectInfo[], patternProjects: ProjectInfo[]): ProjectInfo[] {
    const merged = new Map<string, ProjectInfo>();
    
    // Add AI-detected projects first (higher priority)
    aiProjects.forEach(project => {
      merged.set(project.path, project);
    });
    
    // Add pattern-detected projects if not already detected by AI
    patternProjects.forEach(project => {
      if (!merged.has(project.path)) {
        merged.set(project.path, project);
      } else {
        // Merge indicators from pattern detection
        const existing = merged.get(project.path)!;
        existing.indicators = [...new Set([...existing.indicators, ...project.indicators])];
        existing.confidence = Math.max(existing.confidence, project.confidence);
      }
    });
    
    return Array.from(merged.values());
  }

  private extractShowName(fileName: string): string | null {
    // Extract show name from various patterns
    if (fileName.includes('breaking.bad')) return 'Breaking Bad';
    if (fileName.includes('got') || fileName.includes('game of thrones')) return 'Game of Thrones';
    if (fileName.includes('stranger things')) return 'Stranger Things';
    if (fileName.includes('office')) return 'The Office';
    
    // Generic extraction
    const parts = fileName.split(/[._-]/);
    return parts[0]?.replace(/\b\w/g, l => l.toUpperCase()) || null;
  }

  private extractMovieName(fileName: string): string | null {
    // Extract movie name, removing quality indicators and years
    const cleaned = fileName
      .replace(/\.(mkv|mp4|avi)$/i, '')
      .replace(/\d{4}/g, '')
      .replace(/(1080p|720p|4k|hdr)/gi, '')
      .replace(/[._-]/g, ' ')
      .trim();
    
    return cleaned || null;
  }

  private extractArtistName(fileName: string): string | null {
    // Look for "Artist - Song" pattern
    const parts = fileName.split(' - ');
    return parts.length > 1 ? parts[0].trim() : null;
  }

  private extractDirectoryStructure(files: FileInfo[]): string[] {
    const directories = new Set<string>();
    files.forEach(file => {
      const dir = file.path.replace(file.name, '').replace(/\/$/, '');
      if (dir) directories.add(dir);
    });
    return Array.from(directories).sort();
  }

  private async buildOrganizationStrategy(analysis: DirectoryAnalysis): Promise<OrganizationStrategy> {
    const config = await this.configService.loadConfig();
    await this.initializeAIProvider(config);

    // Present analysis to user and AI
    this.presentAnalysis(analysis);

    // Start AI-driven conversation
    const strategy = await this.conductOrganizationConversation(analysis);
    
    return strategy;
  }

  private presentAnalysis(analysis: DirectoryAnalysis): void {
    console.log('\n📊 Here\'s what I found in your directory:\n');
    
    console.log(`📁 Total files: ${analysis.totalFiles}`);
    console.log('📋 File types:');
    Object.entries(analysis.fileTypes).forEach(([type, count]) => {
      const samples = analysis.sampleFiles[type]?.slice(0, 2).join(', ') || '';
      console.log(`   ${type}: ${count} files ${samples ? `(e.g., ${samples})` : ''}`);
    });

    if (analysis.mediaPatterns.tvShows.length > 0) {
      console.log(`📺 TV Shows detected: ${analysis.mediaPatterns.tvShows.slice(0, 3).join(', ')}`);
    }
    
    if (analysis.mediaPatterns.movies.length > 0) {
      console.log(`🎬 Movies detected: ${analysis.mediaPatterns.movies.slice(0, 3).join(', ')}`);
    }

    if (analysis.mediaPatterns.musicArtists.length > 0) {
      console.log(`🎵 Music artists detected: ${analysis.mediaPatterns.musicArtists.slice(0, 3).join(', ')}`);
    }

    if (analysis.detectedProjects.length > 0) {
      console.log(`💻 Code projects detected:`);
      analysis.detectedProjects.forEach(project => {
        console.log(`   ${project.name} (${project.type}) - confidence: ${(project.confidence * 100).toFixed(0)}%`);
        console.log(`     Indicators: ${project.indicators.join(', ')}`);
      });
    }
  }

  private async conductOrganizationConversation(analysis: DirectoryAnalysis): Promise<OrganizationStrategy> {
    if (!this.aiProvider) {
      throw new Error('AI provider not initialized');
    }

    console.log('\n🤖 Let me analyze your files and work through each content type to understand your organization preferences...\n');

    // First, use AI to intelligently categorize files by actual content type
    const contentAnalysis = await this.analyzeFileContents(analysis);
    
    const fileTypeRules: Record<string, FileTypeRule> = {};
    
    // Work through each detected content type
    for (const [contentType, files] of Object.entries(contentAnalysis.contentTypes)) {
      if (files.length === 0) continue;
      
      console.log(`\n📂 Working on ${contentType} (${files.length} files detected):`);
      console.log(`   Examples: ${files.slice(0, 3).join(', ')}`);
      
      // Get rule for this content type through conversation
      const rule = await this.getContentTypeRule(contentType, files, contentAnalysis);
      if (rule) {
        fileTypeRules[contentType] = rule;
        
        // Show proposed rule and examples
        console.log(`\n✅ Proposed ${contentType} organization:`);
        console.log(`   Folder structure: ${rule.folder}`);
        console.log(`   Naming convention: ${rule.naming}`);
        console.log(`   Examples:`);
        rule.examples.forEach(example => console.log(`     ${example}`));
        
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: 'Does this organization look good?',
            default: true
          }
        ]);
        
        if (!confirmed) {
          const customRule = await this.customizeFileTypeRule(contentType, rule);
          fileTypeRules[contentType] = customRule;
        }
      }
    }
    
    return {
      approach: 'AI-analyzed content-based organization with custom rules',
      fileTypeRules,
      uncertaintyThreshold: 0.7
    };
  }

  private async analyzeFileContents(analysis: DirectoryAnalysis): Promise<{
    contentTypes: Record<string, string[]>;
    detectedPatterns: Record<string, any>;
  }> {
    if (!this.aiProvider) {
      throw new Error('AI provider not initialized');
    }

    const spinner = ora('Using AI to analyze file contents and intelligently propose categories...').start();
    
    // Get all sample files for comprehensive analysis
    const allFiles = Object.entries(analysis.sampleFiles).flatMap(([category, files]) =>
      files.map(fileName => ({ fileName, originalCategory: category }))
    );

    const prompt = `You are an intelligent file organization assistant. Analyze these files and propose logical content categories based on what they actually are, not just file extensions.

FILES TO ANALYZE:
${allFiles.map((f, i) => `${i + 1}. ${f.fileName}`).join('\n')}

DIRECTORY CONTEXT:
- Total files: ${analysis.totalFiles}
- Directory structure: ${analysis.directoryStructure.join(', ')}
- Detected projects: ${analysis.detectedProjects.length}

Your task:
1. Analyze each filename for content patterns, not just extensions
2. Look for series names, artist names, project structures, document types
3. Propose intelligent content categories that make sense for this collection
4. Group files that belong together logically

Be creative and intelligent - don't just use generic categories like "videos" or "documents". Instead, identify:
- Specific TV series (e.g., "Breaking Bad Episodes", "Game of Thrones")
- Movie collections vs standalone films
- Music by specific artists or genres
- Work documents vs personal documents
- Code projects that belong together
- Photo collections vs graphic design assets
- Any other logical groupings you can identify

Return a JSON object with your proposed organization:
{
  "proposedCategories": {
    "Breaking Bad Episodes": {
      "files": ["Breaking.Bad.S01E01.mkv", "Breaking.Bad.S01E02.mkv"],
      "description": "TV series episodes from Breaking Bad",
      "suggestedOrganization": "TV Shows/Breaking Bad/Season XX/",
      "reasoning": "These are clearly episodes from the TV series Breaking Bad based on the S01E01 naming pattern"
    },
    "Led Zeppelin Music": {
      "files": ["Led Zeppelin - Stairway to Heaven.mp3"],
      "description": "Music by Led Zeppelin",
      "suggestedOrganization": "Music/Led Zeppelin/",
      "reasoning": "Artist name clearly indicated in filename"
    },
    "Work Documents": {
      "files": ["Budget_2024_Q1.xlsx", "Project_Plan_v2.docx"],
      "description": "Business/work related documents",
      "suggestedOrganization": "Documents/Work/",
      "reasoning": "Budget and project planning files suggest work-related content"
    }
  },
  "overallStrategy": "Organize by content type with specific subcategories for series, artists, and document types"
}

Be thorough and intelligent in your analysis. The user wants to see categories that actually make sense for their specific collection of files.`;

    try {
      const request = {
        files: allFiles.map(f => ({ name: f.fileName, path: f.fileName, extension: '', size: 0, modified: new Date(), type: 'file' as const })),
        baseDirectory: analysis.directoryStructure[0] || '',
        userPreferences: { 
          intent: 'intelligent_categorization',
          fileAnalysis: analysis 
        }
      };

      const response = await this.aiProvider.analyzeFiles(request);
      
      // Parse AI response to extract categories
      const result = this.parseAICategorizationResponse(response, allFiles);
      spinner.succeed('AI content analysis complete');
      return result;
      
    } catch (error) {
      spinner.fail('AI content analysis failed, using intelligent fallback analysis');
      return this.performIntelligentContentAnalysis(analysis);
    }
  }

  private parseAICategorizationResponse(response: any, allFiles: any[]): {
    contentTypes: Record<string, string[]>;
    detectedPatterns: Record<string, any>;
  } {
    try {
      // Try to parse AI response for proposed categories
      const responseText = response.reasoning || '';
      
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        if (parsedResponse.proposedCategories) {
          const contentTypes: Record<string, string[]> = {};
          const detectedPatterns: Record<string, any> = {};
          
          Object.entries(parsedResponse.proposedCategories).forEach(([categoryName, categoryData]: [string, any]) => {
            contentTypes[categoryName] = categoryData.files || [];
            detectedPatterns[categoryName] = {
              description: categoryData.description,
              suggestedOrganization: categoryData.suggestedOrganization,
              reasoning: categoryData.reasoning
            };
          });
          
          return { contentTypes, detectedPatterns };
        }
      }
    } catch (error) {
      console.warn('Failed to parse AI categorization response, using fallback');
    }
    
    // Fallback if AI response parsing fails
    return this.performIntelligentContentAnalysis({ 
      sampleFiles: { files: allFiles.map(f => f.fileName) },
      mediaPatterns: { tvShows: [], movies: [], musicArtists: [] },
      fileTypes: {},
      totalFiles: 0,
      directoryStructure: [],
      detectedProjects: []
    });
  }

  private performIntelligentContentAnalysis(analysis: DirectoryAnalysis): {
    contentTypes: Record<string, string[]>;
    detectedPatterns: Record<string, any>;
  } {
    const contentTypes: Record<string, string[]> = {};
    const detectedPatterns: Record<string, any> = {};

    // Analyze all sample files across categories
    Object.entries(analysis.sampleFiles).forEach(([category, files]) => {
      files.forEach(fileName => {
        const contentType = this.intelligentlyClassifyFile(fileName, analysis);
        if (!contentTypes[contentType]) {
          contentTypes[contentType] = [];
        }
        contentTypes[contentType].push(fileName);
      });
    });

    // Detect patterns for each content type
    Object.keys(contentTypes).forEach(contentType => {
      detectedPatterns[contentType] = this.detectContentPatterns(contentType, contentTypes[contentType]);
    });

    return { contentTypes, detectedPatterns };
  }

  private intelligentlyClassifyFile(fileName: string, analysis: DirectoryAnalysis): string {
    const lowerName = fileName.toLowerCase();

    // TV Show detection (more sophisticated)
    const tvPatterns = [
      /s\d+e\d+/i,           // S01E01
      /season\s*\d+/i,       // Season 1
      /episode\s*\d+/i,      // Episode 1
      /\d+x\d+/,             // 1x01
    ];
    
    if (tvPatterns.some(pattern => pattern.test(lowerName))) {
      return 'TV Shows';
    }

    // Check against detected shows
    const detectedInShows = analysis.mediaPatterns.tvShows.some(show => 
      lowerName.includes(show.toLowerCase())
    );
    if (detectedInShows) {
      return 'TV Shows';
    }

    // Movie detection (more sophisticated)
    const movieIndicators = [
      /\b(19|20)\d{2}\b/,    // Year
      /(1080p|720p|4k|hdr|bluray|dvdrip)/i,  // Quality
      /(director.?s?\s*cut|extended|criterion)/i,  // Special editions
    ];
    
    const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov'];
    const isVideo = videoExtensions.some(ext => lowerName.endsWith(ext));
    
    if (isVideo && (movieIndicators.some(pattern => pattern.test(lowerName)) || 
        !tvPatterns.some(pattern => pattern.test(lowerName)))) {
      return 'Movies';
    }

    // Music detection
    const musicExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg'];
    if (musicExtensions.some(ext => lowerName.endsWith(ext))) {
      return 'Music';
    }

    // Document detection
    const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    if (documentExtensions.some(ext => lowerName.endsWith(ext))) {
      return 'Documents';
    }

    // Spreadsheet detection
    const spreadsheetExtensions = ['.xlsx', '.xls', '.csv'];
    if (spreadsheetExtensions.some(ext => lowerName.endsWith(ext))) {
      return 'Spreadsheets';
    }

    // Code detection
    const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css', '.json'];
    if (codeExtensions.some(ext => lowerName.endsWith(ext))) {
      return 'Code Projects';
    }

    // Image detection
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    if (imageExtensions.some(ext => lowerName.endsWith(ext))) {
      return 'Images';
    }

    return 'Other Files';
  }

  private detectContentPatterns(contentType: string, files: string[]): any {
    switch (contentType) {
      case 'TV Shows':
        return {
          shows: this.extractUniqueShows(files),
          hasSeasonInfo: files.some(f => /s\d+/i.test(f)),
          hasQualityInfo: files.some(f => /(1080p|720p|4k)/i.test(f))
        };
      case 'Movies':
        return {
          hasYears: files.some(f => /\b(19|20)\d{2}\b/.test(f)),
          hasQualityInfo: files.some(f => /(1080p|720p|4k)/i.test(f))
        };
      case 'Music':
        return {
          artists: this.extractUniqueArtists(files),
          hasAlbumInfo: files.some(f => f.includes(' - ')),
          hasTrackNumbers: files.some(f => /\d+\s*-/.test(f))
        };
      default:
        return {};
    }
  }

  private extractUniqueShows(files: string[]): string[] {
    const shows = new Set<string>();
    files.forEach(file => {
      const show = this.extractShowName(file);
      if (show) shows.add(show);
    });
    return Array.from(shows);
  }

  private extractUniqueArtists(files: string[]): string[] {
    const artists = new Set<string>();
    files.forEach(file => {
      const artist = this.extractArtistName(file);
      if (artist) artists.add(artist);
    });
    return Array.from(artists);
  }

  private async getContentTypeRule(
    contentType: string, 
    files: string[], 
    contentAnalysis: any
  ): Promise<FileTypeRule | null> {
    const patterns = contentAnalysis.detectedPatterns[contentType] || {};
    
    switch (contentType) {
      case 'TV Shows':
        return await this.getTVShowRule(files, patterns);
      case 'Movies':
        return await this.getMovieRule(files, patterns);
      case 'Music':
        return await this.getMusicRule(files, patterns);
      case 'Documents':
        return await this.getDocumentRule(files);
      case 'Spreadsheets':
        return await this.getSpreadsheetRule(files);
      case 'Code Projects':
        return await this.getCodeProjectRule(files);
      case 'Images':
        return await this.getImageRule(files);
      default:
        return await this.getGenericRule(contentType, files);
    }
  }

  private async getTVShowRule(files: string[], patterns: any): Promise<FileTypeRule> {
    console.log(`\n📺 I detected TV shows from these series: ${patterns.shows?.join(', ') || 'Unknown'}`);
    console.log(`   Quality info detected: ${patterns.hasQualityInfo ? 'Yes' : 'No'}`);
    console.log(`   Season info detected: ${patterns.hasSeasonInfo ? 'Yes' : 'No'}`);
    
    const { preference } = await inquirer.prompt([
      {
        type: 'list',
        name: 'preference',
        message: 'How would you like to organize your TV shows?',
        choices: [
          'TV Shows/[Show Name]/Season [##]/ (recommended)',
          'TV Shows/[Show Name]/ (flat by show)',
          'TV Shows/ (all episodes together)',
          'Custom structure'
        ]
      }
    ]);
    
    if (preference.includes('Season')) {
      return {
        type: 'TV Shows',
        pattern: 'show_season',
        folder: 'TV Shows/[Show]/Season [##]/',
        naming: 'Clean show names with proper episode formatting',
        examples: [
          'TV Shows/Breaking Bad/Season 01/Breaking Bad S01E01.mkv',
          'TV Shows/Game of Thrones/Season 01/Game of Thrones S01E01.mkv'
        ]
      };
    } else if (preference.includes('flat')) {
      return {
        type: 'TV Shows',
        pattern: 'show_flat',
        folder: 'TV Shows/[Show]/',
        naming: 'Clean show names with season and episode info',
        examples: [
          'TV Shows/Breaking Bad/Breaking Bad S01E01.mkv',
          'TV Shows/Game of Thrones/Game of Thrones S01E01.mkv'
        ]
      };
    } else if (preference.includes('Custom')) {
      return await this.getCustomTVShowRule(files);
    } else {
      return {
        type: 'TV Shows',
        pattern: 'all_together',
        folder: 'TV Shows/',
        naming: 'Include show name in filename',
        examples: files.slice(0, 2).map(name => `TV Shows/${name}`)
      };
    }
  }

  private async getMovieRule(files: string[], patterns: any): Promise<FileTypeRule> {
    console.log(`\n🎬 I detected movies with:`);
    console.log(`   Years detected: ${patterns.hasYears ? 'Yes' : 'No'}`);
    console.log(`   Quality info detected: ${patterns.hasQualityInfo ? 'Yes' : 'No'}`);
    
    const { preference } = await inquirer.prompt([
      {
        type: 'list',
        name: 'preference',
        message: 'How would you like to organize your movies?',
        choices: [
          'Movies/[Movie Name (Year)]/ (one folder per movie)',
          'Movies/ (all movies in one folder)',
          'Movies/[Year]/ (organized by year)',
          'Custom structure'
        ]
      }
    ]);
    
    if (preference.includes('one folder per')) {
      return {
        type: 'Movies',
        pattern: 'movie_folders',
        folder: 'Movies/[Movie (Year)]/',
        naming: 'Clean movie names with year, preserve quality info',
        examples: [
          'Movies/The Matrix (1999)/The Matrix (1999) [1080p].mkv',
          'Movies/Avengers Endgame (2019)/Avengers Endgame (2019) [1080p].mkv'
        ]
      };
    } else if (preference.includes('year')) {
      return {
        type: 'Movies',
        pattern: 'by_year',
        folder: 'Movies/[Year]/',
        naming: 'Group by release year',
        examples: [
          'Movies/1999/The Matrix (1999) [1080p].mkv',
          'Movies/2019/Avengers Endgame (2019) [1080p].mkv'
        ]
      };
    } else if (preference.includes('Custom')) {
      return await this.getCustomMovieRule(files);
    } else {
      return {
        type: 'Movies',
        pattern: 'flat',
        folder: 'Movies/',
        naming: 'Clean movie names with year and quality',
        examples: files.slice(0, 2).map(name => `Movies/${name}`)
      };
    }
  }

  private async getMusicRule(files: string[], patterns: any): Promise<FileTypeRule> {
    console.log(`\n🎵 I detected music from artists: ${patterns.artists?.join(', ') || 'Various'}`);
    console.log(`   Album info detected: ${patterns.hasAlbumInfo ? 'Yes' : 'No'}`);
    console.log(`   Track numbers detected: ${patterns.hasTrackNumbers ? 'Yes' : 'No'}`);
    
    const { preference } = await inquirer.prompt([
      {
        type: 'list',
        name: 'preference',
        message: 'How would you like to organize your music?',
        choices: [
          'Music/[Artist]/[Album]/ (recommended for organized collections)',
          'Music/[Artist]/ (flat by artist)',
          'Music/ (all music together)',
          'Custom structure'
        ]
      }
    ]);
    
    if (preference.includes('Artist]/[Album')) {
      return {
        type: 'Music',
        pattern: 'artist_album',
        folder: 'Music/[Artist]/[Album]/',
        naming: 'Clean artist and album names, preserve track info',
        examples: [
          'Music/Led Zeppelin/Led Zeppelin IV/01 - Black Dog.mp3',
          'Music/Pink Floyd/Dark Side of the Moon/01 - Time.mp3'
        ]
      };
    } else if (preference.includes('flat by artist')) {
      return {
        type: 'Music',
        pattern: 'artist_flat',
        folder: 'Music/[Artist]/',
        naming: 'Include album info in filename',
        examples: [
          'Music/Led Zeppelin/Led Zeppelin IV - 01 - Black Dog.mp3',
          'Music/Pink Floyd/Dark Side of the Moon - 01 - Time.mp3'
        ]
      };
    } else {
      return {
        type: 'Music',
        pattern: 'flat',
        folder: 'Music/',
        naming: 'Include artist and album in filename',
        examples: files.slice(0, 2).map(name => `Music/${name}`)
      };
    }
  }

  private async getVideoRule(examples: string[], analysis: DirectoryAnalysis): Promise<FileTypeRule> {
    // Check if we have TV shows and movies
    const hasShows = analysis.mediaPatterns.tvShows.length > 0;
    const hasMovies = analysis.mediaPatterns.movies.length > 0;
    
    if (hasShows && hasMovies) {
      console.log('\n📺 I detected both TV shows and movies in your video files.');
      console.log(`   TV Shows: ${analysis.mediaPatterns.tvShows.slice(0, 3).join(', ')}`);
      console.log(`   Movies detected: ${analysis.mediaPatterns.movies.length}`);
      
      const { preference } = await inquirer.prompt([
        {
          type: 'list',
          name: 'preference',
          message: 'How would you like to organize your video files?',
          choices: [
            'Separate TV Shows and Movies into different folders',
            'Keep all videos together in one Videos folder',
            'Custom approach'
          ]
        }
      ]);
      
      if (preference.includes('Separate')) {
        return {
          type: 'videos',
          pattern: 'tv_and_movies',
          folder: 'TV Shows/[Show]/Season [##]/ and Movies/',
          naming: 'Clean names with proper formatting',
          examples: [
            'TV Shows/Breaking Bad/Season 01/Breaking Bad S01E01.mkv',
            'Movies/The Matrix (1999).mkv'
          ]
        };
      }
    }
    
    return {
      type: 'videos',
      pattern: 'single_folder',
      folder: 'Videos/',
      naming: 'Keep original names',
      examples: examples.slice(0, 2).map(name => `Videos/${name}`)
    };
  }

  private async getAudioRule(examples: string[], analysis: DirectoryAnalysis): Promise<FileTypeRule> {
    if (analysis.mediaPatterns.musicArtists.length > 0) {
      console.log(`\n🎵 I detected music from artists: ${analysis.mediaPatterns.musicArtists.slice(0, 3).join(', ')}`);
      
      const { structure } = await inquirer.prompt([
        {
          type: 'list',
          name: 'structure',
          message: 'How would you like to organize your music?',
          choices: [
            'Music/Artist/Album/ structure',
            'Music/Artist/ (no album folders)',
            'Music/ (flat structure)',
            'Custom'
          ]
        }
      ]);
      
      if (structure.includes('Artist/Album')) {
        return {
          type: 'audio',
          pattern: 'artist_album',
          folder: 'Music/[Artist]/[Album]/',
          naming: 'Track number - Song name',
          examples: [
            'Music/Led Zeppelin/Led Zeppelin IV/01 - Black Dog.mp3',
            'Music/Pink Floyd/Dark Side of the Moon/01 - Time.mp3'
          ]
        };
      }
    }
    
    return {
      type: 'audio',
      pattern: 'simple',
      folder: 'Music/',
      naming: 'Keep original names',
      examples: examples.slice(0, 2).map(name => `Music/${name}`)
    };
  }

  private async getDocumentRule(examples: string[]): Promise<FileTypeRule> {
    const { approach } = await inquirer.prompt([
      {
        type: 'list',
        name: 'approach',
        message: 'How would you like to organize your documents?',
        choices: [
          'Documents/ (single folder)',
          'Documents by type (PDFs/, Word Docs/, etc.)',
          'Documents by project/topic',
          'Custom'
        ]
      }
    ]);
    
    return {
      type: 'documents',
      pattern: approach.includes('single') ? 'flat' : 'categorized',
      folder: 'Documents/',
      naming: 'Clean up names and keep descriptive',
      examples: examples.slice(0, 2).map(name => `Documents/${name}`)
    };
  }

  private async getImageRule(examples: string[]): Promise<FileTypeRule> {
    return {
      type: 'images',
      pattern: 'simple',
      folder: 'Images/',
      naming: 'Keep original names',
      examples: examples.slice(0, 2).map(name => `Images/${name}`)
    };
  }

  private async getCodeProjectRule(files: string[]): Promise<FileTypeRule> {
    const { approach } = await inquirer.prompt([
      {
        type: 'list',
        name: 'approach',
        message: 'How would you like to organize your code files?',
        choices: [
          'Projects/[ProjectName]/ (keep project structure intact)',
          'Code/ (all code files together)',
          'Custom'
        ]
      }
    ]);
    
    return {
      type: 'Code Projects',
      pattern: approach.includes('Projects') ? 'projects' : 'flat',
      folder: approach.includes('Projects') ? 'Projects/[ProjectName]/' : 'Code/',
      naming: 'Preserve project structure and file names',
      examples: approach.includes('Projects') 
        ? ['Projects/MyWebApp/index.js', 'Projects/MyWebApp/style.css']
        : files.slice(0, 2).map(name => `Code/${name}`)
    };
  }

  private async getSpreadsheetRule(files: string[]): Promise<FileTypeRule> {
    const { approach } = await inquirer.prompt([
      {
        type: 'list',
        name: 'approach',
        message: 'How would you like to organize your spreadsheets?',
        choices: [
          'Documents/ (with other documents)',
          'Spreadsheets/ (separate folder)',
          'Custom'
        ]
      }
    ]);
    
    return {
      type: 'Spreadsheets',
      pattern: approach.includes('Documents') ? 'documents' : 'separate',
      folder: approach.includes('Documents') ? 'Documents/' : 'Spreadsheets/',
      naming: 'Keep descriptive names',
      examples: files.slice(0, 2).map(name => 
        approach.includes('Documents') ? `Documents/${name}` : `Spreadsheets/${name}`
      )
    };
  }

  private async getGenericRule(fileType: string, examples: string[]): Promise<FileTypeRule> {
    return {
      type: fileType,
      pattern: 'simple',
      folder: `${fileType.charAt(0).toUpperCase() + fileType.slice(1)}/`,
      naming: 'Keep original names',
      examples: examples.slice(0, 2).map(name => `${fileType.charAt(0).toUpperCase() + fileType.slice(1)}/${name}`)
    };
  }

  private async customizeFileTypeRule(fileType: string, rule: FileTypeRule): Promise<FileTypeRule> {
    console.log(`\n🔧 Let's customize the ${fileType} organization rule:`);
    
    const responses = await inquirer.prompt([
      {
        type: 'input',
        name: 'folder',
        message: 'Folder structure (use [placeholders] for dynamic parts):',
        default: rule.folder
      },
      {
        type: 'input',
        name: 'naming',
        message: 'Naming convention:',
        default: rule.naming
      }
    ]);
    
    return {
      ...rule,
      folder: responses.folder,
      naming: responses.naming,
      examples: [`${responses.folder}example-file.ext`]
    };
  }

  private async getCustomTVShowRule(files: string[]): Promise<FileTypeRule> {
    console.log(`\n🔧 Let's create a custom TV show organization structure...`);
    
    const { customType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'customType',
        message: 'How would you like to specify your custom structure?',
        choices: [
          'I have a specific pattern in mind (technical)',
          'Let me describe what I want in plain language',
          'Suggest something for a specific use case (e.g., Plex, Jellyfin)'
        ]
      }
    ]);

    if (customType.includes('specific pattern')) {
      return await this.getSpecificPattern('TV Shows', files);
    } else if (customType.includes('plain language')) {
      return await this.getNaturalLanguagePattern('TV Shows', files);
    } else {
      return await this.getUseCasePattern('TV Shows', files);
    }
  }

  private async getCustomMovieRule(files: string[]): Promise<FileTypeRule> {
    console.log(`\n🔧 Let's create a custom movie organization structure...`);
    
    const { customType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'customType',
        message: 'How would you like to specify your custom structure?',
        choices: [
          'I have a specific pattern in mind (technical)',
          'Let me describe what I want in plain language',
          'Suggest something for a specific use case (e.g., Plex, Jellyfin)'
        ]
      }
    ]);

    if (customType.includes('specific pattern')) {
      return await this.getSpecificPattern('Movies', files);
    } else if (customType.includes('plain language')) {
      return await this.getNaturalLanguagePattern('Movies', files);
    } else {
      return await this.getUseCasePattern('Movies', files);
    }
  }

  private async getSpecificPattern(mediaType: string, files: string[]): Promise<FileTypeRule> {
    console.log(`\n📋 Technical Pattern for ${mediaType}:`);
    console.log('Use placeholders like [Show], [Season], [Episode], [Year], [Quality]');
    
    const responses = await inquirer.prompt([
      {
        type: 'input',
        name: 'folder',
        message: 'Folder structure (use [placeholders]):',
        default: mediaType === 'Movies' ? 'Movies/[Movie (Year)]/' : 'TV Shows/[Show]/Season [##]/',
        validate: input => input.trim().length > 0 || 'Please enter a folder structure'
      },
      {
        type: 'input',
        name: 'naming',
        message: 'File naming convention:',
        default: 'Clean names with key information',
        validate: input => input.trim().length > 0 || 'Please enter a naming convention'
      }
    ]);

    const examples = this.generateExamplesFromPattern(responses.folder, responses.naming, mediaType, files);

    return {
      type: mediaType,
      pattern: 'custom_specific',
      folder: responses.folder,
      naming: responses.naming,
      examples
    };
  }

  private async getNaturalLanguagePattern(mediaType: string, files: string[]): Promise<FileTypeRule> {
    console.log(`\n💬 Natural Language Request for ${mediaType}:`);
    console.log('Describe what you want in your own words...');
    
    const { description } = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: `How would you like your ${mediaType.toLowerCase()} organized?`,
        default: `Example: "I want files organized like Plex recommends" or "Add more details to filenames"`,
        validate: input => input.trim().length > 10 || 'Please provide a more detailed description'
      }
    ]);

    // Use AI to interpret the natural language request
    const interpretedPattern = await this.interpretNaturalLanguageRequest(description, mediaType, files);
    
    return interpretedPattern;
  }

  private async getUseCasePattern(mediaType: string, files: string[]): Promise<FileTypeRule> {
    console.log(`\n🎯 Use Case Pattern for ${mediaType}:`);
    
    const { useCase } = await inquirer.prompt([
      {
        type: 'list',
        name: 'useCase',
        message: `Which media server or use case are you optimizing for?`,
        choices: [
          'Plex Media Server (recommended structure)',
          'Jellyfin Media Server',
          'Kodi/XBMC',
          'General media collection (highly organized)',
          'Simple structure (easy browsing)'
        ]
      }
    ]);

    return this.generateUseCasePattern(useCase, mediaType, files);
  }

  private async interpretNaturalLanguageRequest(description: string, mediaType: string, files: string[]): Promise<FileTypeRule> {
    return await this.conductAIConversation(description, mediaType, files);
  }

  private async conductAIConversation(description: string, mediaType: string, files: string[], attempt: number = 1): Promise<FileTypeRule> {
    // Initialize conversation context if this is the first attempt
    if (attempt === 1) {
      this.initializeConversationContext(description, mediaType, files);
    }

    const spinner = ora('🤖 Understanding your request...').start();
    
    try {
      // Add user message to conversation history
      this.addToConversationHistory('user', description);

      // Use AI conversation loop to get suggestion
      const aiSuggestion = await this.getAISuggestionWithContext();
      
      // Add AI response to conversation history
      this.addToConversationHistory('assistant', 
        `I suggest: Folder: "${aiSuggestion.folder}", Naming: "${aiSuggestion.naming}", Reasoning: ${aiSuggestion.reasoning}`
      );

      // Update current suggestion in context
      if (this.conversationContext) {
        this.conversationContext.currentSuggestion = aiSuggestion;
        this.conversationContext.attemptCount = attempt;
      }
      
      spinner.succeed('✅ AI generated a suggestion based on our conversation');
      
      console.log(`\n💡 AI Interpretation: ${aiSuggestion.reasoning}`);
      console.log(`📁 Suggested structure: ${aiSuggestion.folder}`);
      console.log(`🏷️  Naming: ${aiSuggestion.naming}`);
      
      const { userAction } = await inquirer.prompt([
        {
          type: 'list',
          name: 'userAction',
          message: 'What would you like to do with this suggestion?',
          choices: [
            'Perfect! Use this structure',
            'Good direction, but let me refine it',
            'Not quite right, let me explain differently',
            'I\'ll specify the pattern manually instead'
          ]
        }
      ]);

      if (userAction.includes('Perfect')) {
        this.addToConversationHistory('user', 'Perfect! I\'ll use this structure.');
        const examples = this.generateExamplesFromPattern(aiSuggestion.folder, aiSuggestion.naming, mediaType, files);
        
        // Clear conversation context when done
        this.clearConversationContext();
        
        return {
          type: mediaType,
          pattern: 'custom_ai_conversation',
          folder: aiSuggestion.folder,
          naming: aiSuggestion.naming,
          examples
        };
      } else if (userAction.includes('refine')) {
        return await this.refineAISuggestion(aiSuggestion, mediaType, files, attempt);
      } else if (userAction.includes('explain differently')) {
        this.addToConversationHistory('user', 'Let me explain what I want differently.');
        return await this.getNewDescription(mediaType, files, attempt + 1);
      } else {
        this.addToConversationHistory('user', 'I\'ll specify the pattern manually instead.');
        this.clearConversationContext();
        console.log('Switching to manual pattern specification...');
        return await this.getSpecificPattern(mediaType, files);
      }

    } catch (error) {
      spinner.fail('AI conversation failed, falling back to manual input');
      this.clearConversationContext();
      return await this.getSpecificPattern(mediaType, files);
    }
  }

  private initializeConversationContext(description: string, mediaType: string, files: string[]): void {
    this.conversationContext = {
      mediaType,
      sampleFiles: files.slice(0, 5),
      userGoal: description,
      attemptCount: 1,
      conversationHistory: [
        {
          role: 'system',
          content: `You are an expert file organization assistant helping a user create a custom organization structure for their ${mediaType} files. 

The user has these sample files: ${files.slice(0, 5).join(', ')}

CRITICAL: You MUST respond ONLY with valid JSON. Do not include any explanatory text, greetings, or additional content outside the JSON.

Required JSON format:
{
  "folder": "folder structure with placeholders like [Movie], [Year], [Genre]",
  "naming": "description of naming convention",
  "reasoning": "explanation of why this structure fits the user's request"
}

Throughout this conversation:
1. Remember all previous suggestions and user feedback
2. Build upon previous discussions rather than starting fresh
3. Be specific about folder structures using placeholders like [Show], [Season], [Movie], [Year], [Quality], [Genre]
4. Consider popular media server requirements if mentioned (Plex, Jellyfin, Kodi)
5. Adapt suggestions based on user refinements and preferences
6. ALWAYS respond with valid JSON only - no other text

Goal: Help the user create the perfect organization structure through iterative conversation.`,
          timestamp: new Date()
        }
      ]
    };
  }

  private addToConversationHistory(role: 'user' | 'assistant', content: string): void {
    if (this.conversationContext) {
      this.conversationContext.conversationHistory.push({
        role,
        content,
        timestamp: new Date()
      });
    }
  }

  private clearConversationContext(): void {
    this.conversationContext = null;
  }

  private async getAISuggestionWithContext(): Promise<{ folder: string; naming: string; reasoning: string }> {
    if (!this.conversationContext || !this.aiProvider) {
      throw new Error('Conversation context or AI provider not initialized');
    }

    try {
      // Use the full conversation history for context-aware AI responses
      const response = await this.callAIWithConversationHistory();
      
      // Try to extract JSON from the response
      const parsed = this.parseAIResponseToJSON(response);
      
      if (!parsed.folder || !parsed.naming || !parsed.reasoning) {
        throw new Error('Invalid AI response format - missing required fields');
      }
      
      return {
        folder: parsed.folder,
        naming: parsed.naming,
        reasoning: parsed.reasoning
      };
      
    } catch (error) {
      console.warn('AI conversation failed, using fallback:', error);
      // Fallback to keyword interpretation if AI fails
      const lastUserMessage = this.conversationContext.conversationHistory
        .filter(msg => msg.role === 'user')
        .pop()?.content || this.conversationContext.userGoal;
      
      return this.interpretDescriptionWithContext(
        lastUserMessage, 
        this.conversationContext.mediaType, 
        this.conversationContext.attemptCount
      );
    }
  }

  private parseAIResponseToJSON(response: string): any {
    try {
      // First try direct JSON parsing
      return JSON.parse(response);
    } catch (error) {
      // If that fails, try to extract JSON from the response text
      try {
        // Look for JSON object in the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        
        // If no JSON found, try to extract key information and construct JSON
        const folderMatch = response.match(/folder["\s:]*([^,\n]+)/i);
        const namingMatch = response.match(/naming["\s:]*([^,\n]+)/i);
        const reasoningMatch = response.match(/reasoning["\s:]*([^,\n]+)/i);
        
        if (folderMatch || namingMatch || reasoningMatch) {
          return {
            folder: folderMatch?.[1]?.replace(/['"]/g, '').trim() || 'Movies/[Movie (Year)]/',
            naming: namingMatch?.[1]?.replace(/['"]/g, '').trim() || 'Clean movie names with year',
            reasoning: reasoningMatch?.[1]?.replace(/['"]/g, '').trim() || 'AI-generated organization structure'
          };
        }
        
        throw new Error('No JSON or structured data found in response');
      } catch (extractError) {
        console.warn('Failed to extract structured data from AI response:', response.substring(0, 200));
        throw new Error('Could not parse AI response as JSON or extract structured data');
      }
    }
  }

  private async callAIWithConversationHistory(): Promise<string> {
    if (!this.aiProvider || !this.conversationContext) {
      throw new Error('AI provider or conversation context not initialized');
    }

    const messages = this.conversationContext.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add a final system reminder about JSON format if the last message is from user
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      messages.push({
        role: 'user',
        content: 'Please respond with ONLY valid JSON in this exact format: {"folder": "structure here", "naming": "description here", "reasoning": "explanation here"}. Do not include any other text outside the JSON.'
      });
    }

    // Different providers have different interfaces
    try {
      // For OpenAI provider
      if ((this.aiProvider as any).client) {
        const openaiProvider = this.aiProvider as any;
        const completion = await openaiProvider.client.chat.completions.create({
          model: openaiProvider.model,
          messages: messages,
          max_tokens: 800,
          temperature: 0.3
        });

        return completion.choices[0]?.message?.content || '';
      }
      
      // For Anthropic provider  
      if ((this.aiProvider as any).anthropic) {
        const anthropicProvider = this.aiProvider as any;
        // Convert to Anthropic format (system message separate)
        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        const conversationMessages = messages.filter(m => m.role !== 'system');
        
        const response = await anthropicProvider.anthropic.messages.create({
          model: anthropicProvider.model,
          max_tokens: 800,
          temperature: 0.3,
          system: systemMessage,
          messages: conversationMessages
        });

        return response.content[0]?.text || '';
      }
      
      throw new Error('Unsupported AI provider for conversation');
      
    } catch (error) {
      console.error('AI conversation call failed:', error);
      throw error;
    }
  }

  private async getAIPatternSuggestion(description: string, mediaType: string, files: string[], attempt: number): Promise<{ folder: string; naming: string; reasoning: string }> {
    if (!this.aiProvider) {
      throw new Error('AI provider not initialized');
    }

    const sampleFileNames = files.slice(0, 5).join(', ');
    
    const contextualPrompt = attempt > 1 ? 
      `Building on our previous conversation about organizing ${mediaType} files, the user provided this additional guidance: "${description}"

Please refine the organization approach based on this new input.` :
      `The user wants to organize their ${mediaType} files and described their preference as: "${description}"`;

    const prompt = `You are an expert file organization assistant helping a user create a custom organization structure for their ${mediaType} files.

${contextualPrompt}

Sample files: ${sampleFileNames}

Based on the user's description, suggest:
1. A folder structure using placeholders like [Show], [Season], [Movie], [Year], [Quality], [Genre], [Artist], [Album]
2. A naming convention description
3. Clear reasoning for why this structure fits their request

Consider popular media server requirements (Plex, Jellyfin, Kodi) if mentioned, but prioritize the user's specific preferences.

IMPORTANT: Respond in valid JSON format only:
{
  "folder": "suggested folder structure with placeholders",
  "naming": "naming convention description",
  "reasoning": "detailed explanation of why this structure matches the user's request"
}

Examples of good folder structures:
- Movies: "Movies/[Movie (Year)]/" or "Movies/[Genre]/[Year]/" or "Movies/[Year]/[Movie]/"
- TV Shows: "TV Shows/[Show]/Season [##]/" or "TV Shows/[Show]/" or "Shows/[Show]/S[##]/"
- Music: "Music/[Artist]/[Album]/" or "Music/[Genre]/[Artist]/" or "Music/[Artist]/"

Keep placeholders clear and meaningful.`;

    try {
      console.log(`🤖 Consulting AI for organization pattern...`);
      
      // Create a temporary request for AI analysis
      const tempRequest = {
        files: files.slice(0, 5).map(name => ({
          name,
          path: `/temp/${name}`,
          extension: name.split('.').pop() || '',
          size: 0,
          modified: new Date()
        })),
        baseDirectory: '/temp',
        userPreferences: {
          intent: description,
          mediaType: mediaType,
          attempt: attempt
        }
      };

      // Use a simplified AI call for pattern generation
      const response = await this.callAIForPatternGeneration(prompt);
      
      try {
        const parsed = JSON.parse(response);
        
        if (!parsed.folder || !parsed.naming || !parsed.reasoning) {
          throw new Error('Invalid AI response format');
        }
        
        return {
          folder: parsed.folder,
          naming: parsed.naming,
          reasoning: parsed.reasoning
        };
      } catch (parseError) {
        console.warn('AI returned invalid JSON, using fallback interpretation');
        return this.interpretDescriptionWithContext(description, mediaType, attempt);
      }
      
    } catch (error) {
      console.warn('AI API call failed, using fallback interpretation:', error);
      return this.interpretDescriptionWithContext(description, mediaType, attempt);
    }
  }

  private async callAIForPatternGeneration(prompt: string): Promise<string> {
    if (!this.aiProvider) {
      throw new Error('AI provider not initialized');
    }

    // Different providers have different interfaces, so we need to handle them appropriately
    try {
      // For OpenAI provider
      if ((this.aiProvider as any).client) {
        const openaiProvider = this.aiProvider as any;
        const completion = await openaiProvider.client.chat.completions.create({
          model: openaiProvider.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert file organization assistant. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.3
        });

        return completion.choices[0]?.message?.content || '';
      }
      
      // For Anthropic provider  
      if ((this.aiProvider as any).anthropic) {
        const anthropicProvider = this.aiProvider as any;
        const response = await anthropicProvider.anthropic.messages.create({
          model: anthropicProvider.model,
          max_tokens: 800,
          temperature: 0.3,
          messages: [
            {
              role: 'user',
              content: `You are an expert file organization assistant. Always respond with valid JSON only.\n\n${prompt}`
            }
          ]
        });

        return response.content[0]?.text || '';
      }
      
      throw new Error('Unsupported AI provider for pattern generation');
      
    } catch (error) {
      console.error('AI provider call failed:', error);
      throw error;
    }
  }

  private async refineAISuggestion(currentSuggestion: { folder: string; naming: string; reasoning: string }, mediaType: string, files: string[], attempt: number): Promise<FileTypeRule> {
    console.log(`\n🔧 Let's refine the suggestion...`);
    console.log(`📁 Current structure: ${currentSuggestion.folder}`);
    console.log(`🏷️  Current naming: ${currentSuggestion.naming}`);
    
    const { refinement } = await inquirer.prompt([
      {
        type: 'input',
        name: 'refinement',
        message: 'What would you like to change or improve?',
        default: 'Example: "Add genre folders", "Include quality in filename", "Simpler structure"',
        validate: input => input.trim().length > 3 || 'Please provide more specific feedback'
      }
    ]);

    // Continue the conversation with refinement feedback
    return await this.conductAIConversation(refinement, mediaType, files, attempt + 1);
  }

  private async getNewDescription(mediaType: string, files: string[], attempt: number): Promise<FileTypeRule> {
    console.log(`\n💬 Let's try a different approach...`);
    
    const { newDescription } = await inquirer.prompt([
      {
        type: 'input',
        name: 'newDescription',
        message: `How would you like your ${mediaType.toLowerCase()} organized? (try explaining it differently)`,
        validate: input => input.trim().length > 5 || 'Please provide a more detailed description'
      }
    ]);

    return await this.conductAIConversation(newDescription, mediaType, files, attempt);
  }

  private interpretDescriptionWithContext(description: string, mediaType: string, attempt: number): { folder: string; naming: string; reasoning: string } {
    const lower = description.toLowerCase();
    
    // Enhanced interpretation that considers conversation context
    if (attempt > 1) {
      // In follow-up attempts, be more creative and try different approaches
      if (lower.includes('simpler') || lower.includes('less complex')) {
        return {
          folder: `${mediaType}/`,
          naming: 'Clean, simple filenames',
          reasoning: 'Simplified based on your feedback - flat structure for easy browsing'
        };
      }
      if (lower.includes('genre') || lower.includes('category')) {
        if (mediaType === 'Movies') {
          return {
            folder: 'Movies/[Genre]/[Year]/',
            naming: 'Genre-first organization with year subfolders',
            reasoning: 'Added genre organization as requested in refinement'
          };
        }
      }
    }
    
    // First attempt - use the original interpretation logic
    return this.interpretDescriptionKeywords(description, mediaType);
  }

  private interpretDescriptionKeywords(description: string, mediaType: string): { folder: string; naming: string; reasoning: string } {
    const lower = description.toLowerCase();
    
    // Check for specific media server mentions
    if (lower.includes('plex')) {
      if (mediaType === 'Movies') {
        return {
          folder: 'Movies/[Movie (Year)]/',
          naming: 'Plex-optimized movie names with year',
          reasoning: 'Plex Media Server prefers each movie in its own folder with year'
        };
      } else {
        return {
          folder: 'TV Shows/[Show]/Season [##]/',
          naming: 'Plex-optimized show names with SxxExx format',
          reasoning: 'Plex Media Server prefers shows organized by season folders'
        };
      }
    }
    
    if (lower.includes('jellyfin') || lower.includes('emby')) {
      const pattern = this.generateUseCasePattern('Jellyfin Media Server', mediaType, []);
      return { folder: pattern.folder, naming: pattern.naming, reasoning: 'Jellyfin/Emby optimized structure' };
    }
    
    if (lower.includes('kodi') || lower.includes('xbmc')) {
      const pattern = this.generateUseCasePattern('Kodi/XBMC', mediaType, []);
      return { folder: pattern.folder, naming: pattern.naming, reasoning: 'Kodi/XBMC optimized structure' };
    }
    
    // Check for detail preferences
    if (lower.includes('more details') || lower.includes('detailed') || lower.includes('information')) {
      if (mediaType === 'Movies') {
        return {
          folder: 'Movies/[Year]/[Genre]/',
          naming: 'Detailed movie names with year, genre, and quality',
          reasoning: 'Added year and genre folders for more detailed organization'
        };
      } else {
        return {
          folder: 'TV Shows/[Show]/Season [##]/',
          naming: 'Detailed show names with season, episode, and quality info',
          reasoning: 'Enhanced naming with more detailed episode information'
        };
      }
    }
    
    // Check for simple preferences
    if (lower.includes('simple') || lower.includes('basic') || lower.includes('minimal')) {
      return {
        folder: `${mediaType}/`,
        naming: 'Simple, clean filenames',
        reasoning: 'Simplified structure with minimal folder nesting'
      };
    }
    
    // Check for year-based organization
    if (lower.includes('year') || lower.includes('decade')) {
      if (mediaType === 'Movies') {
        return {
          folder: 'Movies/[Year]/',
          naming: 'Movies organized by release year',
          reasoning: 'Year-based organization as requested'
        };
      }
    }
    
    // Check for genre organization
    if (lower.includes('genre') || lower.includes('category')) {
      if (mediaType === 'Movies') {
        return {
          folder: 'Movies/[Genre]/',
          naming: 'Movies organized by genre',
          reasoning: 'Genre-based organization as requested'
        };
      }
    }
    
    // Default fallback based on media type
    const fallback = this.generateFallbackPattern(description, mediaType);
    return { folder: fallback.folder, naming: fallback.naming, reasoning: 'General organization structure' };
  }

  private generateUseCasePattern(useCase: string, mediaType: string, files: string[]): FileTypeRule {
    if (useCase.includes('Plex')) {
      if (mediaType === 'Movies') {
        return {
          type: 'Movies',
          pattern: 'plex_movies',
          folder: 'Movies/[Movie (Year)]/',
          naming: 'Plex-optimized: Movie Title (Year) [Quality]',
          examples: [
            'Movies/The Matrix (1999)/The Matrix (1999) [1080p].mkv',
            'Movies/Avengers Endgame (2019)/Avengers Endgame (2019) [4K].mkv'
          ]
        };
      } else {
        return {
          type: 'TV Shows',
          pattern: 'plex_tv',
          folder: 'TV Shows/[Show]/Season [##]/',
          naming: 'Plex-optimized: Show SxxExx format',
          examples: [
            'TV Shows/Breaking Bad/Season 01/Breaking Bad S01E01.mkv',
            'TV Shows/Game of Thrones/Season 01/Game of Thrones S01E01.mkv'
          ]
        };
      }
    } else if (useCase.includes('Simple')) {
      return {
        type: mediaType,
        pattern: 'simple',
        folder: `${mediaType}/`,
        naming: 'Simple, clean filenames',
        examples: files.slice(0, 2).map(name => `${mediaType}/${name}`)
      };
    }
    // Add more use cases as needed
    return this.generateFallbackPattern('general organized collection', mediaType);
  }

  private generateFallbackPattern(description: string, mediaType: string): FileTypeRule {
    // Simple fallback based on media type
    if (mediaType === 'Movies') {
      return {
        type: 'Movies',
        pattern: 'fallback',
        folder: 'Movies/[Movie (Year)]/',
        naming: 'Clean movie names with year',
        examples: ['Movies/Example Movie (2023)/Example Movie (2023).mkv']
      };
    } else {
      return {
        type: 'TV Shows',
        pattern: 'fallback',
        folder: 'TV Shows/[Show]/Season [##]/',
        naming: 'Clean show names with season/episode',
        examples: ['TV Shows/Example Show/Season 01/Example Show S01E01.mkv']
      };
    }
  }

  private generateExamplesFromPattern(folder: string, naming: string, mediaType: string, files: string[]): string[] {
    // Simple example generation - could be enhanced
    const sampleFiles = files.slice(0, 2);
    if (mediaType === 'Movies') {
      return [
        folder.replace('[Movie (Year)]', 'The Matrix (1999)') + 'The Matrix (1999) [1080p].mkv',
        folder.replace('[Movie (Year)]', 'Inception (2010)') + 'Inception (2010) [1080p].mkv'
      ];
    } else {
      return [
        folder.replace('[Show]', 'Breaking Bad').replace('[##]', '01') + 'Breaking Bad S01E01.mkv',
        folder.replace('[Show]', 'Game of Thrones').replace('[##]', '01') + 'Game of Thrones S01E01.mkv'
      ];
    }
  }

  private async generateIntelligentQuestions(analysis: DirectoryAnalysis): Promise<string[]> {
    // For now, we'll use rule-based question generation
    // This could be enhanced later to use AI for question generation
    
    try {
      const questions = [
        this.generateQuestionBasedOnContent(analysis),
        this.generateStructuralQuestion(analysis),
        this.generateAccessibilityQuestion(analysis)
      ].filter(q => q !== null) as string[];
      
      return questions;
    } catch (error) {
      console.warn('Question generation failed, using fallback questions');
      return this.getFallbackQuestions(analysis);
    }
  }

  private generateQuestionBasedOnContent(analysis: DirectoryAnalysis): string | null {
    const mediaTypes = [];
    if (analysis.mediaPatterns.tvShows.length > 0) mediaTypes.push(`TV shows (${analysis.mediaPatterns.tvShows.length} detected)`);
    if (analysis.mediaPatterns.movies.length > 0) mediaTypes.push(`movies (${analysis.mediaPatterns.movies.length} detected)`);
    if (analysis.mediaPatterns.musicArtists.length > 0) mediaTypes.push(`music (${analysis.mediaPatterns.musicArtists.length} artists)`);
    
    if (mediaTypes.length > 0) {
      return `I see you have ${mediaTypes.join(', ')}. How do you typically like to browse and access your media? Do you prefer everything separated by type, or do you have specific shows/artists you access frequently that should be easily findable?`;
    }
    
    const fileTypes = Object.entries(analysis.fileTypes).sort((a, b) => b[1] - a[1]);
    if (fileTypes.length > 0) {
      return `You have a lot of ${fileTypes[0][0]} files (${fileTypes[0][1]} total). What's the main purpose of these files and how do you typically work with them?`;
    }
    
    return null;
  }

  private generateStructuralQuestion(analysis: DirectoryAnalysis): string | null {
    if (analysis.detectedProjects.length > 0) {
      return `I detected ${analysis.detectedProjects.length} code projects in your files. Do you want to keep these projects intact and organized separately, or integrate them into a broader organization structure?`;
    }
    
    if (analysis.directoryStructure.length > 10) {
      return `You have files spread across ${analysis.directoryStructure.length} different directories. Would you prefer to consolidate into fewer main categories, or maintain some of the existing structure while cleaning it up?`;
    }
    
    return 'What\'s your main goal for organizing these files? Are you looking to create a long-term archive, improve daily workflow, or prepare for a specific project?';
  }

  private generateAccessibilityQuestion(analysis: DirectoryAnalysis): string | null {
    if (analysis.mediaPatterns.tvShows.length > 3) {
      return `For your TV shows, do you prefer browsing by show name first (like "Breaking Bad/Season 1/"), or by season structure (like "TV Shows/Season Collections/")? And do you want episode numbers in the filenames?`;
    }
    
    if (analysis.fileTypes.documents > 20) {
      return `You have many document files. Do you work with these by project, by date, or by document type? How do you typically need to find specific documents?`;
    }
    
    return 'Do you have any specific naming conventions or folder structures you\'ve used before that worked well for you?';
  }

  private getFallbackQuestions(analysis: DirectoryAnalysis): string[] {
    const questions = [
      'What\'s your main goal for organizing these files?'
    ];
    
    if (analysis.mediaPatterns.tvShows.length > 0 || analysis.mediaPatterns.movies.length > 0) {
      questions.push('How do you prefer to organize your media files - by type, alphabetically, by date, or another way?');
    }
    
    if (Object.keys(analysis.fileTypes).length > 3) {
      questions.push('Do you want to group similar file types together, or organize by project/purpose regardless of file type?');
    }
    
    return questions;
  }

  private async checkIfReadyToProceed(
    analysis: DirectoryAnalysis, 
    conversationHistory: string[]
  ): Promise<{ ready: boolean; strategy?: OrganizationStrategy }> {
    // Simple heuristic: if we have at least 2 rounds of conversation, try to build strategy
    if (conversationHistory.length >= 4) {
      const strategy = await this.buildStrategyFromConversation(analysis, conversationHistory);
      return { ready: true, strategy };
    }
    
    return { ready: false };
  }

  private async buildStrategyFromConversation(
    _analysis: DirectoryAnalysis,
    conversationHistory: string[]
  ): Promise<OrganizationStrategy> {
    // Extract key information from conversation
    const conversation = conversationHistory.join('\n');
    
    // Determine approach from conversation
    let approach = 'By type (default)';
    if (conversation.toLowerCase().includes('project') || conversation.toLowerCase().includes('work')) {
      approach = 'By project/purpose';
    } else if (conversation.toLowerCase().includes('date') || conversation.toLowerCase().includes('time')) {
      approach = 'By date/timeline';
    } else if (conversation.toLowerCase().includes('type') || conversation.toLowerCase().includes('media')) {
      approach = 'By type (Movies, TV Shows, Music in separate folders)';
    }
    
    // Extract user's primary goal
    const goalAnswers = conversationHistory.filter((_, index) => index % 2 === 1); // Get answers only
    const primaryGoal = goalAnswers[0] || 'Organize files efficiently';
    
    return {
      approach,
      fileTypeRules: {},
      uncertaintyThreshold: 0.7
    };
  }

  private async executeOrganization(
    targetDirectory: string,
    analysis: DirectoryAnalysis, 
    strategy: OrganizationStrategy
  ): Promise<OrganizationSuggestion[]> {
    console.log('🚀 Applying organization rules to all files...\n');
    
    const spinner = ora('Generating organization suggestions...').start();
    const suggestions: OrganizationSuggestion[] = [];

    try {
      // Get all files to organize
      const files = await this.fileScanner.scanDirectory(targetDirectory, true);
      spinner.text = `Processing ${files.length} files with your rules...`;

      // Apply rules to each file
      for (const file of files) {
        const suggestion = await this.applyRulesToFile(file, targetDirectory, strategy, analysis.detectedProjects);
        
        // Only ask for clarification if we're genuinely uncertain
        if (suggestion.confidence < strategy.uncertaintyThreshold) {
          spinner.stop();
          const clarification = await this.requestUserClarification(suggestion);
          if (clarification) {
            suggestion.suggestedPath = clarification.suggestedPath;
            suggestion.confidence = 1.0;
          }
          spinner.start(`Processing ${files.length} files with your rules...`);
        }
        
        suggestions.push(suggestion);
      }

      spinner.succeed(`Generated ${suggestions.length} organization suggestions using your rules`);
      return suggestions;

    } catch (error) {
      spinner.fail(`Failed to generate suggestions: ${error}`);
      throw error;
    }
  }

  private async applyRulesToFile(
    file: FileInfo,
    targetDirectory: string,
    strategy: OrganizationStrategy,
    detectedProjects: ProjectInfo[] = []
  ): Promise<OrganizationSuggestion> {
    // Check if this file belongs to a detected project
    const belongsToProject = detectedProjects.find(project => 
      file.path.startsWith(project.path + '/') || file.path === project.path + '/' + file.name
    );
    
    if (belongsToProject) {
      // Preserve project structure - move entire project as a unit
      const relativePath = file.path.replace(belongsToProject.path + '/', '');
      const projectRule = strategy.fileTypeRules['Code Projects'];
      
      if (projectRule) {
        const suggestedPath = `${targetDirectory}/Projects/${belongsToProject.name}/${relativePath}`;
        return {
          file,
          suggestedPath,
          reason: `Part of ${belongsToProject.name} project - preserving structure`,
          confidence: 1.0
        };
      }
    }

    // Use intelligent content classification for non-project files
    const contentType = this.intelligentlyClassifyFile(file.name, { 
      mediaPatterns: { tvShows: [], movies: [], musicArtists: [] },
      fileTypes: {},
      sampleFiles: {},
      totalFiles: 0,
      directoryStructure: [],
      detectedProjects: []
    });
    
    const rule = strategy.fileTypeRules[contentType];
    
    if (!rule) {
      // Unknown content type - ask user for classification
      return {
        file,
        suggestedPath: `${targetDirectory}/Other/${file.name}`,
        reason: `Unknown content type (${contentType}) - needs classification`,
        confidence: 0.3
      };
    }

    // Apply the rule based on content type
    const suggestedPath = await this.generatePathFromRule(file, targetDirectory, rule);
    
    return {
      file,
      suggestedPath,
      reason: `Applied ${rule.type} rule: ${rule.naming}`,
      confidence: 0.9
    };
  }

  private async generatePathFromRule(
    file: FileInfo,
    targetDirectory: string,
    rule: FileTypeRule
  ): Promise<string> {
    // Handle different content type patterns
    switch (rule.pattern) {
      case 'show_season':
        return this.generateTVShowSeasonPath(file, targetDirectory);
      case 'show_flat':
        return this.generateTVShowFlatPath(file, targetDirectory);
      case 'movie_folders':
        return this.generateMovieFolderPath(file, targetDirectory);
      case 'by_year':
        return this.generateMovieByYearPath(file, targetDirectory);
      case 'artist_album':
        return this.generateMusicArtistAlbumPath(file, targetDirectory);
      case 'artist_flat':
        return this.generateMusicArtistFlatPath(file, targetDirectory);
      case 'projects':
        return this.generateProjectPath(file, targetDirectory, rule);
      default:
        // Simple folder placement
        return `${targetDirectory}/${rule.folder}${file.name}`;
    }
  }

  private generateTVShowSeasonPath(file: FileInfo, targetDirectory: string): string {
    const showName = this.extractCleanShowName(file.name);
    const season = this.extractSeasonNumber(file.name);
    const cleanFileName = this.cleanTVFileName(file.name, showName);
    return `${targetDirectory}/TV Shows/${showName}/Season ${season.toString().padStart(2, '0')}/${cleanFileName}`;
  }

  private generateTVShowFlatPath(file: FileInfo, targetDirectory: string): string {
    const showName = this.extractCleanShowName(file.name);
    const cleanFileName = this.cleanTVFileName(file.name, showName);
    return `${targetDirectory}/TV Shows/${showName}/${cleanFileName}`;
  }

  private generateMovieFolderPath(file: FileInfo, targetDirectory: string): string {
    const movieName = this.extractCleanMovieName(file.name);
    const movieFolder = movieName.replace(/\.[^.]+$/, ''); // Remove extension for folder name
    return `${targetDirectory}/Movies/${movieFolder}/${movieName}`;
  }

  private generateMovieByYearPath(file: FileInfo, targetDirectory: string): string {
    const movieName = this.extractCleanMovieName(file.name);
    const year = this.extractYearFromFileName(file.name) || 'Unknown Year';
    return `${targetDirectory}/Movies/${year}/${movieName}`;
  }

  private generateMusicArtistAlbumPath(file: FileInfo, targetDirectory: string): string {
    const artist = this.extractArtistFromPath(file) || this.extractArtistFromFilename(file.name) || 'Unknown Artist';
    const album = this.extractAlbumFromPath(file) || this.extractAlbumFromFilename(file.name) || 'Unknown Album';
    const cleanFileName = this.cleanMusicFileName(file.name);
    return `${targetDirectory}/Music/${artist}/${album}/${cleanFileName}`;
  }

  private generateMusicArtistFlatPath(file: FileInfo, targetDirectory: string): string {
    const artist = this.extractArtistFromPath(file) || this.extractArtistFromFilename(file.name) || 'Unknown Artist';
    const cleanFileName = this.cleanMusicFileName(file.name);
    return `${targetDirectory}/Music/${artist}/${cleanFileName}`;
  }

  private cleanTVFileName(fileName: string, showName: string): string {
    // Create a clean TV filename: "Show Name S01E01.ext"
    const season = this.extractSeasonNumber(fileName);
    const episode = this.extractEpisodeNumber(fileName);
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    
    return `${showName} S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}${extension}`;
  }

  private extractEpisodeNumber(fileName: string): number {
    const episodeMatch = fileName.match(/e(\d+)/i) || fileName.match(/episode\s*(\d+)/i);
    return episodeMatch ? parseInt(episodeMatch[1]) : 1;
  }

  private extractYearFromFileName(fileName: string): string | null {
    const yearMatch = fileName.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : null;
  }

  private generateVideoPath(file: FileInfo, targetDirectory: string, rule: FileTypeRule): string {
    const fileName = file.name;
    
    // Check if it's a TV show (contains season/episode patterns)
    const tvPatterns = [/s\d+e\d+/i, /season\s*\d+/i, /episode\s*\d+/i];
    const isTV = tvPatterns.some(pattern => pattern.test(fileName));
    
    if (isTV) {
      // Extract show name and season
      const showName = this.extractCleanShowName(fileName);
      const season = this.extractSeasonNumber(fileName);
      return `${targetDirectory}/TV Shows/${showName}/Season ${season.toString().padStart(2, '0')}/${this.cleanFileName(fileName)}`;
    } else {
      // It's a movie
      const movieName = this.extractCleanMovieName(fileName);
      return `${targetDirectory}/Movies/${movieName}`;
    }
  }

  private generateMusicPath(file: FileInfo, targetDirectory: string, rule: FileTypeRule): string {
    const fileName = file.name;
    
    // Try to extract artist and album from file path or name
    const artist = this.extractArtistFromPath(file) || this.extractArtistFromFilename(fileName) || 'Unknown Artist';
    const album = this.extractAlbumFromPath(file) || this.extractAlbumFromFilename(fileName) || 'Unknown Album';
    
    const cleanFileName = this.cleanMusicFileName(fileName);
    return `${targetDirectory}/Music/${artist}/${album}/${cleanFileName}`;
  }

  private generateProjectPath(file: FileInfo, targetDirectory: string, rule: FileTypeRule): string {
    // Try to identify project from file path
    const pathParts = file.path.split('/');
    const projectName = this.identifyProjectName(pathParts) || 'Misc Code';
    
    return `${targetDirectory}/Projects/${projectName}/${file.name}`;
  }

  // Helper methods for name extraction and cleaning
  private extractCleanShowName(fileName: string): string {
    // Remove common patterns and clean up
    let name = fileName.replace(/s\d+e\d+/gi, '').replace(/season\s*\d+/gi, '').replace(/episode\s*\d+/gi, '');
    name = name.replace(/[._-]/g, ' ').replace(/\d{4}/g, '').replace(/(1080p|720p|4k)/gi, '');
    name = name.replace(/\.(mkv|mp4|avi)$/i, '').trim();
    
    // Handle common abbreviations
    if (name.toLowerCase().includes('got')) name = name.replace(/got/gi, 'Game of Thrones');
    if (name.toLowerCase().includes('bb')) name = name.replace(/bb/gi, 'Breaking Bad');
    
    return this.capitalizeWords(name) || 'Unknown Show';
  }

  private extractCleanMovieName(fileName: string): string {
    let name = fileName.replace(/\.(mkv|mp4|avi)$/i, '');
    name = name.replace(/(1080p|720p|4k|hdr)/gi, '');
    name = name.replace(/[._-]/g, ' ').trim();
    
    // Try to preserve year
    const yearMatch = name.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? ` (${yearMatch[0]})` : '';
    name = name.replace(/\b(19|20)\d{2}\b/g, '').trim();
    
    // Get extension from original filename
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    return this.capitalizeWords(name) + year + extension;
  }

  private extractArtistFromPath(file: FileInfo): string | null {
    const pathParts = file.path.split('/');
    // Look for artist folder (usually parent or grandparent of file)
    if (pathParts.length >= 2) {
      return pathParts[pathParts.length - 2];
    }
    return null;
  }

  private extractArtistFromFilename(fileName: string): string | null {
    // Look for "Artist - Song" pattern
    const dashPattern = fileName.match(/^([^-]+)\s*-\s*/);
    if (dashPattern) {
      return dashPattern[1].trim();
    }
    return null;
  }

  private extractAlbumFromPath(file: FileInfo): string | null {
    const pathParts = file.path.split('/');
    // Look for album folder (usually parent of file, after artist)
    if (pathParts.length >= 3) {
      return pathParts[pathParts.length - 2];
    }
    return null;
  }

  private extractAlbumFromFilename(fileName: string): string | null {
    // Try to extract album from various patterns
    const albumPatterns = [
      /^(.+?)\s*-\s*\d+\s*-/,  // "Album - 01 - Song"
      /^(.+?)\s+\d+\s+/,       // "Album 01 Song"
    ];
    
    for (const pattern of albumPatterns) {
      const match = fileName.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  private cleanMusicFileName(fileName: string): string {
    // Clean up music file names while preserving track info
    return fileName.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private extractSeasonNumber(fileName: string): number {
    const seasonMatch = fileName.match(/s(\d+)/i) || fileName.match(/season\s*(\d+)/i);
    return seasonMatch ? parseInt(seasonMatch[1]) : 1;
  }

  private identifyProjectName(pathParts: string[]): string | null {
    // Look for project indicators
    for (const part of pathParts) {
      if (part.includes('package.json') || part.includes('src') || part.includes('app')) {
        return pathParts[pathParts.indexOf(part) - 1] || 'Unknown Project';
      }
    }
    return pathParts[pathParts.length - 2] || null;
  }

  private capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  }

  private cleanFileName(fileName: string): string {
    // Basic cleaning while preserving important info
    return fileName.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
  }


  private async requestUserClarification(
    suggestion: OrganizationSuggestion
  ): Promise<{ suggestedPath: string } | null> {
    console.log(`\n❓ I'm uncertain about organizing: ${suggestion.file.name}`);
    console.log(`   Current suggestion: ${suggestion.suggestedPath}`);
    console.log(`   Reason: ${suggestion.reason}`);
    console.log(`   Confidence: ${(suggestion.confidence || 0) * 100}%`);
    
    const response = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          'Accept the suggestion',
          'Specify a different location',
          'Skip this file for now'
        ]
      }
    ]);

    if (response.action === 'Accept the suggestion') {
      return { suggestedPath: suggestion.suggestedPath };
    } else if (response.action === 'Specify a different location') {
      const customResponse = await inquirer.prompt([
        {
          type: 'input',
          name: 'customPath',
          message: 'Enter the desired path:',
          validate: input => input.trim().length > 0 || 'Please enter a valid path'
        }
      ]);
      return { suggestedPath: customResponse.customPath };
    }
    
    return null; // Skip
  }

  private async initializeAIProvider(config: UserConfig): Promise<void> {
    const aiConfig = {
      apiKey: config.ai.apiKey,
      model: config.ai.model,
      maxTokens: Math.max(config.ai.maxTokens || 1000, 2000),
      temperature: config.ai.temperature || 0.3,
      timeout: Math.max(config.ai.timeout || 90000, 120000)
    };

    switch (config.ai.provider) {
      case 'openai':
        this.aiProvider = new OpenAIProvider(aiConfig);
        break;
      case 'anthropic':
        this.aiProvider = new AnthropicProvider(aiConfig);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${config.ai.provider}`);
    }
  }
}
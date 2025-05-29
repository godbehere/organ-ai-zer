import { FileInfo } from '../../types';

export interface AIAnalysisRequest {
  files: FileInfo[];
  baseDirectory: string;
  existingStructure?: string[];
  userPreferences?: any;
}

export interface AIAnalysisResponse {
  suggestions: Array<{
    file: FileInfo | null;
    suggestedPath: string;
    reason: string;
    confidence: number;
    category?: string;
    metadata?: any;
  }>;
  reasoning: string;
  clarificationNeeded?: {
    questions: string[];
    reason: string;
  };
}

export abstract class BaseAIProvider {
  protected apiKey: string;
  protected model: string;
  protected maxTokens: number;
  protected temperature: number;
  protected timeout: number;

  constructor(config: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
  }) {
    this.apiKey = config.apiKey;
    this.model = config.model || this.getDefaultModel();
    this.maxTokens = config.maxTokens || 1000;
    this.temperature = config.temperature || 0.3;
    this.timeout = config.timeout || 30000;
  }

  abstract getDefaultModel(): string;
  abstract analyzeFiles(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;

  protected buildPrompt(request: AIAnalysisRequest): string {
    const { files, baseDirectory, existingStructure, userPreferences } = request;
    
    // Check if this is a custom prompt request
    if (userPreferences?.customPrompt) {
      return userPreferences.customPrompt;
    }
    
    // Check if this is an interactive/conversational request
    if (userPreferences?.intent) {
      return this.buildConversationalPrompt(request);
    }
    
    return `You are an intelligent file organizer. Analyze the following files and suggest an optimal organization structure.

**Base Directory:** ${baseDirectory}

**Files to organize (TOTAL COUNT: ${files.length}):**
${files.map((file, index) => `${index + 1}. ${file.name} (${file.extension}, ${this.formatFileSize(file.size)}, modified: ${file.modified.toISOString().split('T')[0]})`).join('\n')}

**Existing Directory Structure:**
${existingStructure?.length ? existingStructure.join('\n') : 'No existing structure provided'}

**User Preferences:**
${userPreferences ? JSON.stringify(userPreferences, null, 2) : 'No specific preferences provided'}

**Instructions:**
1. Analyze each file's name, extension, size, and modification date
2. Consider the existing directory structure to maintain consistency
3. Suggest logical organization paths that group related files
4. Provide clear reasoning for each suggestion
5. Assign confidence scores (0.0 to 1.0) based on how certain you are about each suggestion
6. Apply the same recognition patterns and consistency rules as described above
7. **ABSOLUTELY CRITICAL: Your response MUST include a suggestion for EVERY single file listed above**
8. **COUNT CHECK: Input has ${files.length} files, your suggestions array must have exactly ${files.length} items**
9. **Go through each numbered file 1-${files.length} and provide a suggestion for each one**
10. **CONSISTENCY CHECK: Review your suggestions to ensure identical patterns within each file type**
11. **NAMING CHECK: Ensure file names are properly formatted and official names are used**
12. **Example consistency: If first TV show uses Shows/SeriesName/Season 01/, ALL TV shows must use this exact format**

**Response Format:**
Return a JSON object with the following structure:
{
  "suggestions": [
    {
      "fileName": "example.jpg",
      "suggestedPath": "photos/2024/03/vacation/example.jpg",
      "reason": "Image file from March 2024, appears to be vacation-related based on naming",
      "confidence": 0.85,
      "category": "photos"
    }
  ],
  "reasoning": "Overall explanation of the organization strategy used",
  "clarificationNeeded": {
    "questions": ["How would you prefer to organize photos by date?"],
    "reason": "Need clarification for consistent organization"
  }
}

**CLARIFICATION GUIDELINES:**
- Only include "clarificationNeeded" if you genuinely cannot provide good suggestions without more information
- If file patterns are clear (S01E01 = TV show, (2019) = movie year), proceed with suggestions
- Ask clarification ONLY for truly ambiguous organizational choices

Important: Only return valid JSON. Maintain consistency across similar file types.`;
  }

  protected buildConversationalPrompt(request: AIAnalysisRequest): string {
    const { files, baseDirectory, userPreferences } = request;
    
    return `You are an intelligent file organizer having a conversation with a user about organizing their files.

**User's Intent:** ${userPreferences.intent}

**Additional Context from Conversation:**
${userPreferences.clarifications || 'No additional clarifications yet.'}

**Previously Rejected Organization Patterns:**
${userPreferences.rejectedPatterns?.length > 0 ? 
  userPreferences.rejectedPatterns.map((pattern: string) => `- ${pattern}`).join('\n') : 
  'No rejected patterns yet.'}

**Approved Organization Patterns:**
${userPreferences.approvedPatterns?.length > 0 ? userPreferences.approvedPatterns.join('\n') : 'No approved patterns yet.'}

**Files to Organize (TOTAL COUNT: ${files.length}):**
${files.map((file, index) => `${index + 1}. ${file.name} (${file.extension}, ${this.formatFileSize(file.size)}, modified: ${file.modified.toISOString().split('T')[0]})`).join('\n')}

**Base Directory:** ${baseDirectory}

**Instructions:**
1. Analyze the user's intent and any conversation context
2. Create an organization structure that matches their specific requirements
3. Pay special attention to rejected patterns and avoid similar approaches
4. Incorporate any approved patterns into your suggestions
5. **CONSISTENCY IS CRITICAL**: Use the SAME naming pattern and folder structure for files of the same type/category
6. **ACCURATE NAMING**: Expand abbreviations to proper names (GOT → Game of Thrones) but preserve official acronyms (S.H.I.E.L.D.)
7. **CLEAN FORMATTING**: Fix underscores, capitalization, and formatting for readable file names

**FILE TYPE RECOGNITION PATTERNS:**

**Media Files:**
- TV Shows: Look for patterns like "S01E01", "Season 1 Episode 1", "s4e1", "S04E02", etc.
- Common show abbreviations: "GOT" = Game of Thrones, "BB" = Breaking Bad, etc.
- Movies: Look for years in parentheses like "(2019)", "1994", quality indicators like "1080p", "4k", "HDR"
- Music: Artist names, album names, track numbers, audio formats like ".mp3", ".wav", ".flac"

**Code Projects:**
- Look for: package.json, requirements.txt, Cargo.toml, pom.xml, .git folders, src/ directories
- Common patterns: project-name/src/, project-name/tests/, README files
- Languages: .js/.ts (Node.js), .py (Python), .rs (Rust), .java, .cpp, .go, etc.

**Documents:**
- Office docs: .docx, .xlsx, .pptx - group by project/topic
- PDFs: Look for series, manuals, reports - group related documents
- Text files: README, notes, documentation - keep with related projects

**Archives & Packages:**
- .zip, .tar.gz, .rar files and their extracted contents
- Application bundles (.app, .exe installers)
- Game installations and mods

**PROJECT GROUPING RULES:**
- **CRITICAL**: Identify files that belong to the same project/collection and move them together
- Look for common prefixes, timestamps, or directory structures that indicate related files
- Maintain existing folder structures for code projects (don't break src/, tests/, docs/ hierarchies)
- Group related documents (presentation + supporting files, photo albums, etc.)
- When moving projects, preserve internal structure but place in appropriate top-level category

**CRITICAL SUCCESS CRITERIA:**
- **YOUR RESPONSE MUST CONTAIN EXACTLY ${files.length} SUGGESTIONS**
- **COUNT YOUR SUGGESTIONS BEFORE RESPONDING - MUST EQUAL ${files.length}**
- **NEVER skip a file - every file in the numbered list above needs a suggestion**

**CONSISTENCY REQUIREMENTS:**

**PATTERN CONSISTENCY:**
- Choose ONE organization pattern for each file type and apply it to ALL files of that type
- If you organize one TV show as Shows/SeriesName/Season X/, then ALL TV shows must follow this exact structure
- If you organize one movie with a specific naming format, ALL movies must use that same format
- Use the same season numbering format (either "Season 1" or "Season 01") for ALL shows

**ACCURATE FILE NAMING:**
- Expand non-official abbreviations to proper names: "GOT" → "Game of Thrones", "BB" → "Breaking Bad"
- Preserve official acronyms that are part of the proper name: "Agents of S.H.I.E.L.D." keeps "S.H.I.E.L.D."
- Clean up formatting: replace underscores with spaces, fix capitalization, proper year formatting
- Examples: "The_Matrix_1999_1080p.mkv" → organize with proper "The Matrix (1999)" naming
- Use consistent punctuation and spacing within each category

**GROUPING REQUIREMENTS:**
- Group related documents together (same project/topic files go in same folder)
- Maintain the exact same folder structure and naming pattern for all files of the same type

**If you need clarification to provide better suggestions, include a "clarificationNeeded" field in your response with specific questions.**

**Response Format:**
Return a JSON object with the following structure:
{
  "suggestions": [
    {
      "fileName": "example.mkv",
      "suggestedPath": "Movies/Action/2023/The_Movie_Title_2023_1080p.mkv",
      "reason": "Action movie from 2023, organized by genre and year with quality indicator",
      "confidence": 0.9,
      "category": "movies"
    }
  ],
  "reasoning": "Overall explanation of the organization strategy based on user intent",
  "clarificationNeeded": {
    "questions": [
      "Should TV episodes include episode numbers in the filename?",
      "Do you prefer movie titles with underscores or spaces?"
    ],
    "reason": "Need clarification to ensure consistent organization across all files"
  }
}

**CLARIFICATION GUIDELINES:**
- Only include "clarificationNeeded" if you genuinely cannot provide good suggestions without more information
- If file patterns are clear (S01E01 = TV show, (2019) = movie year), proceed with suggestions
- Ask clarification ONLY for truly ambiguous organizational choices

Important: Only return valid JSON. Maintain consistency across similar file types.`;
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  protected parseAIResponse(response: string): AIAnalysisResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let jsonStr = jsonMatch ? jsonMatch[0] : response;
      
      // Handle truncated JSON by attempting to fix common issues
      if (!jsonStr.endsWith('}')) {
        console.log('⚠️  Detected truncated JSON response, attempting to fix...');
        
        // Find the last complete suggestion object
        const suggestionPattern = /\{\s*"fileName":[^}]+\}/g;
        const suggestions = [];
        let match;
        
        while ((match = suggestionPattern.exec(response)) !== null) {
          try {
            const suggestion = JSON.parse(match[0]);
            suggestions.push(suggestion);
          } catch (e) {
            // Skip malformed suggestions
            console.log('⚠️  Skipping malformed suggestion');
          }
        }
        
        if (suggestions.length > 0) {
          console.log(`✅ Recovered ${suggestions.length} suggestions from truncated response`);
          return {
            suggestions: suggestions.map((s: any) => ({
              file: null, // Will be filled in by the caller
              suggestedPath: s.suggestedPath,
              reason: s.reason,
              confidence: Math.min(Math.max(s.confidence || 0.5, 0), 1),
              category: s.category,
              metadata: s.metadata
            })),
            reasoning: 'Recovered from truncated response'
          };
        }
      }
      
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid response format: missing suggestions array');
      }

      return {
        suggestions: parsed.suggestions.map((s: any) => ({
          file: null, // Will be filled in by the caller
          suggestedPath: s.suggestedPath,
          reason: s.reason,
          confidence: Math.min(Math.max(s.confidence || 0.5, 0), 1),
          category: s.category,
          metadata: s.metadata
        })),
        reasoning: parsed.reasoning || 'No reasoning provided',
        clarificationNeeded: parsed.clarificationNeeded
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}. Response: ${response.substring(0, 500)}...`);
    }
  }
}
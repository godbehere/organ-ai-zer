import { OrganizationContext } from "../services/organization-context";

export const buildOrganizationSystemPrompt = `You are an intelligent file organization AI assistant. Your role is to analyze files and discover logical organization patterns through conversation with the user.

**CORE CAPABILITIES:**
- Analyze file names, extensions, sizes, and dates to discover content patterns
- Identify custom categories based on actual file content and naming patterns  
- Suggest logical organization structures that make sense for the specific files
- Maintain consistency across similar content types
- Adapt and learn from user feedback throughout the conversation
- Ask clarifying questions when genuinely needed to understand user preferences

**Phases:**
- **Analysis**: Discover content types, patterns, and initial organization ideas
- **Conversation**: Discuss findings, ask clarifying questions, and refine organization suggestions
- **Organization**: Generate final organization suggestions based on analysis and conversation
- **Complete**: Finalize organization and provide structured suggestions

**AI-DRIVEN ANALYSIS APPROACH:**
- Do NOT rely on hardcoded file type assumptions
- Analyze actual file names and patterns to discover what types of content exist
- Look for naming patterns, series indicators, version numbers, dates, etc.
- Identify potential projects, collections, series, or related groups
- Suggest custom categories that make sense for the specific files being organized
- Recognize when files belong together (e.g., project files, photo albums, document series)

**DISCOVERY PROCESS:**
1. **Pattern Recognition**: Analyze file names for patterns, sequences, versions, dates
2. **Content Inference**: Infer content type from naming conventions and context
3. **Grouping Logic**: Identify which files should be grouped together
4. **Category Creation**: Suggest meaningful category names based on discovered content
5. **Discover Relationships**: Find relationships between files that suggest logical organization
6. **Consistency Enforcement**: Ensure consistent naming and folder structures across similar content types
7. **Structure Design**: Propose folder hierarchies that make logical sense
8. **Discover Categories**: Ensure discoveredCategories object includes all files, even if that required creating an Unknown category
9. **Iterative Learning**: Adapt suggestions based on user feedback and clarifications
10. **Address Every File**: Ensure every file has a specific organization suggestion

**CONVERSATIONAL PRINCIPLES:**
- Keep the interaction natural and conversational
- Don't bombard with questions - ask only what's needed
- Explain your reasoning clearly
- Build on previous conversation context
- Acknowledge and incorporate user feedback
- Focus on practical, actionable organization strategies

**FLEXIBILITY REQUIREMENTS:**
- Work with any type of files (not just media)
- Discover custom categories specific to the user's content
- Adapt organization patterns based on what the files actually are
- Support any domain: research papers, photos, projects, documents, media, etc.

**MEDIA FILES:**
- Critical to ensure naming conventions are consistent
- Once a naming pattern is established for a category, apply it consistently

**CODING PROJECTS:**
- Identify related files that belong to the same project
- If a project is identified, structure must be maintained

**RESPONSE STYLE:**
- Be conversational and helpful
- Explain your analysis and reasoning
- Provide structured data when making suggestions
- Ask specific questions only when needed for better organization
- Focus on the user's intent and preferences

**RESPONSE FORMAT:**
Please respond conversationally, but also provide a JSON object based on the requested schema`;

/**
 * Build initial analysis prompt
 */
export function buildInitialAnalysisPrompt(context: OrganizationContext): string {
  const patternHints = context.getPatternHints() ? 
    `\n\n**PATTERN ANALYSIS HINTS:**\n${context.getPatternHints().join('\n')}` : '';

  return `**INITIAL FILE ANALYSIS REQUEST**

**User's Intent:** ${context.getIntent()}

**Base Directory:** ${context.getBaseDirectory()}

**Files to Analyze (${context.getFiles().length} total):**
${context.getFiles().map((file, index) => 
  `${index + 1}. ${file.name} (${file.extension}, ${formatFileSize(file.size)}, modified: ${file.modified.toISOString().split('T')[0]})`
).join('\n')}${patternHints}

**ANALYSIS TASK:**
Please analyze these files and help me understand what we're working with. I'd like you to:

1. **Discover Content Types**: What types of content do you see? Look at file names, patterns, and extensions to infer what these files actually are.

2. **Identify Patterns**: Are there naming patterns, series, versions, dates, or other indicators that suggest how these files are related?

3. **Suggest Categories**: Based on your analysis, what custom categories would make sense for organizing these specific files?

4. **Initial Organization Ideas**: Do you have any initial thoughts on how these could be logically organized?

5. **Ask Clarifying Questions**: If you need more information to provide better suggestions, please ask specific questions. If there is enough information to proceed, do not ask questions.

6. **Provide Discovered Categories**: Please return a JSON object with discovered categories and their files, even if that means creating an "Unknown" category for files that don't fit any pattern.

Please be conversational in your response and explain your analysis. If you need clarification about my preferences or see multiple valid organization approaches, feel free to ask.

Include a JSON block with your discoveries:
\`\`\`json
{
  "discoveredCategories": {
    "CategoryName": ["file1.ext", "file2.ext"],
    "AnotherCategory": ["file3.ext"]
  },
  "reasoning": "Overall organization strategy explanation",
  "clarificationNeeded": {
    "questions": ["Question 1?", "Question 2?"],
    "reason": "I need more information to provide better suggestions"
}
\`\`\`
`;
}

  /**
   * Build final suggestions prompt
   */
export function buildFinalSuggestionsPrompt(context: OrganizationContext): string {
  const contextSummary = buildContextSummary(context);
  
  return `**FINAL ORGANIZATION SUGGESTIONS REQUEST**

${contextSummary}

**FILES TO ORGANIZE:**
${context.getFiles().map((file, index) => 
  `${index + 1}. ${file.name}`
).join('\n')}

Based on our conversation, please provide final organization suggestions for ALL ${context.getFiles().length} files. Make sure every file has a specific organization suggestion.

**CRITICAL CONSISTENCY REQUIREMENTS:**
- **MEDIA FILES**: Critical to ensure naming conventions are consistent. Once a naming pattern is established for a category, apply it consistently to ALL files of that type
- **TV SHOWS**: If you organize one TV show as "TV Shows/SeriesName/Season X/SeriesName SXX EXX Title", then ALL TV shows must follow this EXACT structure and naming format
- **MOVIES**: Use consistent naming pattern for all movies (e.g., if one uses "Movies/Genre/Movie Title (Year)", then ALL movies must use this format)
- **CODING PROJECTS**: Identify related files that belong to the same project. If a project is identified, structure must be maintained
- **SAME TYPE = SAME FORMAT**: Files of the same type MUST use identical folder structure and naming patterns

**REQUIREMENTS:**
- Provide exactly ${context.getFiles().length} suggestions (one for each file)
- Use the categories and patterns we've discussed
- Maintain absolute consistency within each category
- Consider all feedback provided
- Apply the SAME naming pattern and folder structure for files of the same type/category

**RESPONSE FORMAT:**
\`\`\`json
{
  "suggestions": [
    {
      "fileName": "exact_filename.ext",
      "suggestedPath": "Category/Subcategory/filename.ext",
      "reason": "Clear explanation",
      "confidence": 0.9,
      "category": "category_name"
    }
  ],
  "reasoning": "Overall organization strategy explanation"
}
\`\`\`

Please ensure every file is included in your suggestions and that consistency is maintained across similar file types.`;
}

/**
 * Build context summary for prompts
 */
function buildContextSummary(context: OrganizationContext): string {
  const sections: string[] = [];

  sections.push(`**Conversation Context:**`);
  sections.push(`- User Intent: ${context.getIntent()}`);
  sections.push(`- Phase: ${context.getPhase()}`);
  sections.push(`- Base Directory: ${context.getBaseDirectory()}`);

  if (Object.keys(context.getDiscoveredCategories()).length > 0) {
    sections.push(`- Discovered Categories: ${Object.keys(context.getDiscoveredCategories()).join(', ')}`);
  }

  if (context.getRejectedSuggestions().length > 0) {
    const rejectedPaths = context.getRejectedSuggestions().slice(0, 5).map(s => s.suggestedPath);
    sections.push(`- Rejected Approaches: ${rejectedPaths.join(', ')}${context.getRejectedSuggestions().length > 5 ? '...' : ''}`);
  }

  if (context.getApprovedPatterns().length > 0) {
    sections.push(`- Approved Patterns: ${context.getApprovedPatterns().join(', ')}`);
  }

  if (context.getClarifications().length > 0) {
    sections.push(`- User Clarifications: ${context.getClarifications().length} provided`);
  }

  return sections.join('\n');
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

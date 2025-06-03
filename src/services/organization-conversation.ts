import { AIAnalysisRequest, AIAnalysisResponse, AIAnalysisResponseSchema, AISuggestionsResponseSchema, CategoryConversationResponse, CategoryConversationSchema, Clarification, ClarificationPhase, ConversationConfig, FileInfo, FinalSuggestionsSchema, OrganizationFeedback, OrganizationSuggestion } from "../types";
import { BaseAIProvider } from "./ai-providers";
import { Conversation } from "./conversation";
import { OrganizationContext } from "./organization-context";
import { buildFinalSuggestionsPrompt, buildInitialAnalysisPrompt, buildOrganizationSystemPrompt } from "../util/organization-utility";
import inquirer from "inquirer";

export class OrganizationConversation extends Conversation {
    protected context: OrganizationContext;

    constructor(
        aiProvider: BaseAIProvider,
        files: FileInfo[],
        baseDirectory: string,
        intent: string,
        subject: string,
        config: Partial<ConversationConfig> = {}
    ) {
        // Setup organization-specific system prompt
        const systemPrompt = buildOrganizationSystemPrompt;

        const conversationConfig: Partial<ConversationConfig> = {
            systemPrompt,
            maxTurns: 10,
            temperature: 0.4,
            maxContextSize: 15000,
            ...config
        };

        const context = new OrganizationContext(
            subject,
            files,
            baseDirectory,
            intent,
            conversationConfig
        );

        super(aiProvider, subject, config);
        this.context = context;
    }

    async startAnalysis(): Promise<AIAnalysisResponse> {
        this.context.setPhase('analysis');

        const analysisPrompt = buildInitialAnalysisPrompt(this.context);

        try {
            const analysisRequest: AIAnalysisRequest = {
                prompt: analysisPrompt,
                schema: AIAnalysisResponseSchema
            };

            const result: AIAnalysisResponse = await this.continueWithPrompt(analysisRequest);

            if (result.suggestions) {
                result.suggestions = result.suggestions.map((s: any) => ({
                    file: this.context.getFiles().find(f => f.name === s.file)!,
                    suggestedPath: s.suggestedPath,
                    reason: s.reason,
                    confidence: s.confidence || 0.7,
                    category: s.category
                  }));  
            }

            if (result.discoveredCategories) {
                const discoveredCategories: Record<string, FileInfo[]> = {};
                Object.entries(result.discoveredCategories).forEach(([category, fileNames]) => {
                  discoveredCategories[category] = (fileNames).map(fileName =>
                    this.context.getFiles().find(f => f.name === fileName.name)
                  ).filter(Boolean) as FileInfo[];
                });
                this.context.setDiscoveredCategories(discoveredCategories);
            }

            return result;

        } catch (error) {
            throw new Error(`Failed to start AI analysis: ${error}`);
        } 
    }

    async continueConversation(userMessage: string): Promise<AIAnalysisResponse> {
        this.context.setPhase('conversation');

        try {
            const analysisRequest: AIAnalysisRequest = {
                prompt: userMessage,
                schema: AISuggestionsResponseSchema
            }

            const result: AIAnalysisResponse = await this.continueWithPrompt(analysisRequest);

            if (result.discoveredCategories) {
                Object.entries(result.discoveredCategories).forEach(([category, files]) => {
                  this.context.addDiscoveredCategory(category, files);
                });
            }

            return result;

        } catch (error) {
            throw new Error(`Conversation failed: ${error}`);
        }
    }

    async generateFinalSuggestions(): Promise<AIAnalysisResponse> {
        this.context.setPhase('organization');

        try {
            const finalSuggestionsPrompt = buildFinalSuggestionsPrompt(this.context);

            const analysisRequest: AIAnalysisRequest = {
                prompt: finalSuggestionsPrompt,
                schema: FinalSuggestionsSchema
            }

            const response: AIAnalysisResponse = await this.continueWithPrompt(analysisRequest);

            response.suggestions = this.parseFinalSuggestions(response);

            return response;

        } catch (error) {
            throw new Error(`Failed to generate final suggestions: ${error}`);
        }
        
    }

    private parseFinalSuggestions(response: AIAnalysisResponse): OrganizationSuggestion[] {
        try {

            return response.suggestions.map((s: any) => {
              const file = this.context.getFiles().find(f => f.name === s.file);
              if (!file) {
                throw new Error(`File not found: ${s.file}`);
              }
              
              return {
                file,
                suggestedPath: s.suggestedPath,
                reason: s.reason,
                confidence: s.confidence || 0.8,
                category: s.category,
                metadata: s.metadata
              };
            });
          } catch (error) {
            // Fallback: create basic suggestions
            console.warn('Failed to parse final suggestions, using fallback:', error);
            return this.context.getFiles().map((file) => ({
              file,
              suggestedPath: `Organized/${file.name}`,
              reason: 'Fallback organization due to parsing error',
              confidence: 0.5
            }));
          }
    }

    async processFeedback(feedback: OrganizationFeedback): Promise<AIAnalysisResponse> {
        let feedbackMessage = '';

        if (feedback.approved) {
            feedbackMessage = 'Perfect! I approve these organization suggestions. Please proceed with the organization.';
            this.context.setPhase('organization');
            return this.generateFinalSuggestions();
        }

        if (feedback.feedback) {
            feedbackMessage = feedback.feedback;
        } else {
            feedbackMessage = 'I have some issues with the organization suggestions.';

            if (feedback.specificIssues && feedback.specificIssues.length > 0) {
                feedbackMessage += ` Specifically: ${feedback.specificIssues.join(', ')}. `;
            }

            if (feedback.selectedSuggestions && feedback.selectedSuggestions.length > 0) {
                this.context.getRejectedSuggestions().push(...feedback.selectedSuggestions);
                feedbackMessage += `I don't like how these files are organized: ${feedback.selectedSuggestions.map(s => s.suggestedPath).slice(0, 3).join(', ')}.`;
            }
        }

        return this.continueConversation(feedbackMessage);

    }

    async handleClarification(
        questions: string[],
        reason: string,
        phase: ClarificationPhase,
        context: string = ''
    ): Promise<Boolean> {
        if (!questions || questions.length === 0) {
            return false;
        }

        console.log(`\n🤔 ${reason}\n`);

        const clarifications: Clarification[] = [];

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            console.log(`❓ Question ${i + 1}/${questions.length}:`);

            const { answer } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'answer',
                    message: question,
                    validate: (input: string) => input.trim().length > 0 || 'Please provide an answer'
                }
            ]);

            const clarification: Clarification = {
                id: `${phase}_${Date.now()}_${i}`,
                phase,
                question,
                answer: answer.trim(),
                context: context || `Clarification during ${phase} phase`,
                timestamp: new Date()
            };

            clarifications.push(clarification);
            console.log(`✅ Answer recorded: ${answer}\n`);
        }

        this.context.setClarifications(clarifications);

        console.log(`📝 Recorded ${clarifications.length} clarification(s). Let me reconsider with this new information...\n`);

        return true;
    }

    addPatternHints(hints: string[]): void {
        hints.forEach(hint => {
            this.context.addPatternHint(hint);
        });
    }

    getContext(): OrganizationContext {
        return this.context;
    }

    async getCategoryConversation(category: string, files: FileInfo[]): Promise<CategoryConversationResponse> {
        try {
            const categoryPrompt = this.buildCategoryConversationPrompt(category, files);

            // Use direct AI provider call to get properly typed response
            if (this.context.getState() !== 'active') {
                throw new Error(`Cannot send message in ${this.context.getState()} state`);
            }

            if (this.context.getTurnCount() >= this.context.getConfig().maxTurns) {
                this.context.setState('failed');
                throw new Error('Maximum conversation turns exceeded');
            }

            this.context.addUserMessage(categoryPrompt);
            this.context.incrementTurnCount();

            const response = await this.aiProvider.generateResponse(this.context, CategoryConversationSchema);
            
            const aiResponse = response.reasoning || 'Category conversation generated';
            this.context.addAssistantMessage(aiResponse);

            return response as unknown as CategoryConversationResponse;

        } catch (error) {
            throw new Error(`Failed to get category conversation for ${category}: ${error}`);
        }
    }

    private buildCategoryConversationPrompt(category: string, files: FileInfo[]): string {
        const formatFileSize = (bytes: number): string => {
            const units = ['B', 'KB', 'MB', 'GB'];
            let size = bytes;
            let unitIndex = 0;
            
            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }
            
            return `${size.toFixed(1)} ${units[unitIndex]}`;
        };

        return `I need to understand how the user wants to organize their ${category} files. I have ${files.length} files in this category.

Sample files:
${files.slice(0, 5).map(f => `- ${f.name} (${f.extension}, ${formatFileSize(f.size)})`).join('\n')}
${files.length > 5 ? `... and ${files.length - 5} more files` : ''}

Based on these ${category} files, please:
1. Analyze the file types, naming patterns, and potential organization strategies
2. Determine what organization approach would work best for this specific content
3. Generate 3-5 specific, practical organization options that make sense for this content type
4. Decide whether the user should choose from your suggested options OR provide free-form input
5. Create an appropriate, clear question to ask the user

Guidelines:
- If there are clear, common patterns (like movies, TV shows, music), provide structured choices
- If the content is unique or mixed, use free-form input
- Make your question specific and actionable
- Ensure your options are genuinely different approaches, not just variations

Please respond with a JSON object containing:
- "question": "A clear, specific question to ask the user"
- "inputType": "choice" or "freeform"
- "choices": ["option1", "option2", "option3"] (only include if inputType is "choice")
- "reasoning": "Brief explanation of why this approach makes sense for this content type"`;
    }

}
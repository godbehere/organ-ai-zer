import { AIAnalysisRequest, AIAnalysisResponse, AIAnalysisResponseSchema, AISuggestionsResponseSchema, Clarification, ClarificationPhase, ConversationConfig, FileInfo, FinalSuggestionsSchema, OrganizationFeedback, OrganizationSuggestion } from "../types";
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

}
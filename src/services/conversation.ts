import { AIAnalysisRequest, AIAnalysisResponse, ConversationConfig } from "../types";
import { BaseAIProvider } from "./ai-providers";
import { ConversationContext } from "./conversation-context";

/**
 * Generic AI Conversation
 */
export class Conversation {
    protected context: ConversationContext;
    protected aiProvider: BaseAIProvider;

    constructor(
        aiProvider: BaseAIProvider,
        subject: string,
        config: Partial<ConversationConfig> = {},
    ) {
        this.aiProvider = aiProvider;
        this.context = new ConversationContext(subject, config);
    }

    async continueWithPrompt(analysisRequest: AIAnalysisRequest): Promise<AIAnalysisResponse> {

        if (this.context.getState() !== 'active') {
            throw new Error(`Cannot send message in ${this.context.getState()} state`);
        }

        if (this.context.getTurnCount() >= this.context.getConfig().maxTurns) {
            this.context.setState('failed');
            throw new Error('Maximum conversation turns exceeded');
        }

        this.context.addUserMessage(analysisRequest.prompt);
        this.context.incrementTurnCount();

        try {
            
            if (!analysisRequest.schema) {
                throw new Error('Analysis request must include a schema');
            }

            const response = await this.aiProvider.generateResponse(this.context, analysisRequest.schema);

            const aiResponse = response.reasoning || 'No response generated';

            this.context.addAssistantMessage(aiResponse);

            return response;

        } catch (error) {
            this.context.setState('failed');
            throw new Error(`Conversation failed: ${error}`);
        }
    } 

    reset(keepSystemPrompt: boolean = true): void {
        const systemMessages = keepSystemPrompt ? 
            this.context.getMessages().filter(msg => msg.role === 'system') : [];
        
        this.context.setMessages(systemMessages);
        this.context.resetTurnCount();
        this.context.setState('active');
    }
    
    complete(): void {
        this.context.setState('complete');
    }

    pause(): void {
        this.context.setState('paused');
    }

    resume(): void {
        if (this.context.getState() !== 'paused') {
            throw new Error('Cannot resume conversation that is not paused');
        }
        this.context.setState('active');
    }

}
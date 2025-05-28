import { BaseAIProvider } from './ai-providers/base-ai-provider';

/**
 * Generic conversation message types
 */
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Generic conversation context for any AI interaction
 */
export interface ConversationContext {
  /** Unique conversation ID */
  id: string;
  /** Subject/topic of the conversation */
  subject: string;
  /** Current conversation state */
  state: 'active' | 'paused' | 'complete' | 'failed';
  /** Conversation messages history */
  messages: ConversationMessage[];
  /** Custom context data specific to the conversation type */
  customContext: Record<string, any>;
  /** Configuration for this conversation */
  config: ConversationConfig;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Number of turns/exchanges */
  turnCount: number;
}

/**
 * Configuration for conversation behavior
 */
export interface ConversationConfig {
  /** Maximum number of turns before timeout */
  maxTurns: number;
  /** System prompt template */
  systemPrompt?: string;
  /** Custom prompt parameters */
  promptParams?: Record<string, any>;
  /** Whether to maintain full message history */
  keepFullHistory: boolean;
  /** Maximum context window size */
  maxContextSize?: number;
  /** Temperature for AI responses */
  temperature?: number;
  /** Custom AI provider settings */
  aiSettings?: Record<string, any>;
}

/**
 * Result from an AI conversation turn
 */
export interface ConversationResult<T = any> {
  /** AI response content */
  response: string;
  /** Parsed structured data (if applicable) */
  data?: T;
  /** Whether the conversation needs user input */
  needsInput: boolean;
  /** Specific questions or prompts for user */
  questions?: string[];
  /** Confidence level of the response */
  confidence?: number;
  /** Metadata about the response */
  metadata?: Record<string, any>;
}

/**
 * Generic AI Conversation Context Manager
 * Handles conversations with AI providers for any subject matter
 */
export class AIConversationContext {
  private context: ConversationContext;
  private aiProvider: BaseAIProvider;

  constructor(
    aiProvider: BaseAIProvider,
    subject: string,
    config: Partial<ConversationConfig> = {}
  ) {
    this.aiProvider = aiProvider;
    this.context = {
      id: this.generateId(),
      subject,
      state: 'active',
      messages: [],
      customContext: {},
      config: {
        maxTurns: 10,
        keepFullHistory: true,
        maxContextSize: 8000,
        temperature: 0.7,
        ...config
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      turnCount: 0
    };

    // Add system prompt if provided
    if (config.systemPrompt) {
      this.addMessage('system', config.systemPrompt);
    }
  }

  /**
   * Get current conversation context
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Get conversation ID
   */
  getId(): string {
    return this.context.id;
  }

  /**
   * Get conversation state
   */
  getState(): ConversationContext['state'] {
    return this.context.state;
  }

  /**
   * Set conversation state
   */
  setState(state: ConversationContext['state']): void {
    this.context.state = state;
    this.context.updatedAt = new Date();
  }

  /**
   * Add a message to the conversation
   */
  addMessage(role: MessageRole, content: string, metadata?: Record<string, any>): void {
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
      metadata
    };

    this.context.messages.push(message);
    this.context.updatedAt = new Date();

    // Trim context if it gets too large
    if (this.context.config.maxContextSize) {
      this.trimContext();
    }
  }

  /**
   * Add user message
   */
  addUserMessage(content: string, metadata?: Record<string, any>): void {
    this.addMessage('user', content, metadata);
  }

  /**
   * Add assistant message
   */
  addAssistantMessage(content: string, metadata?: Record<string, any>): void {
    this.addMessage('assistant', content, metadata);
  }

  /**
   * Get all messages
   */
  getMessages(): ConversationMessage[] {
    return [...this.context.messages];
  }

  /**
   * Get messages by role
   */
  getMessagesByRole(role: MessageRole): ConversationMessage[] {
    return this.context.messages.filter(msg => msg.role === role);
  }

  /**
   * Get the last N messages
   */
  getRecentMessages(count: number): ConversationMessage[] {
    return this.context.messages.slice(-count);
  }

  /**
   * Set custom context data
   */
  setCustomContext(key: string, value: any): void {
    this.context.customContext[key] = value;
    this.context.updatedAt = new Date();
  }

  /**
   * Get custom context data
   */
  getCustomContext<T = any>(key: string): T | undefined {
    return this.context.customContext[key];
  }

  /**
   * Get all custom context
   */
  getAllCustomContext(): Record<string, any> {
    return { ...this.context.customContext };
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(userMessage: string, metadata?: Record<string, any>): Promise<ConversationResult> {
    if (this.context.state !== 'active') {
      throw new Error(`Cannot send message in ${this.context.state} state`);
    }

    if (this.context.turnCount >= this.context.config.maxTurns) {
      this.setState('failed');
      throw new Error('Maximum conversation turns exceeded');
    }

    // Add user message
    this.addUserMessage(userMessage, metadata);
    this.context.turnCount++;

    try {
      // Build prompt from conversation history
      const prompt = this.buildPrompt();
      
      // Get AI response using the existing AI provider interface
      const response = await this.aiProvider.analyzeFiles({
        files: [],
        baseDirectory: '',
        existingStructure: [],
        userPreferences: {
          customPrompt: prompt,
          temperature: this.context.config.temperature,
          ...this.context.config.aiSettings
        }
      });

      const aiResponse = response.reasoning || 'No response generated';
      
      // Add assistant response
      this.addAssistantMessage(aiResponse, {
        confidence: 0.8,
        suggestions: response.suggestions?.length || 0
      });

      // Parse the response for structured data
      const result: ConversationResult = {
        response: aiResponse,
        needsInput: response.clarificationNeeded ? true : false,
        questions: response.clarificationNeeded?.questions,
        confidence: 0.8,
        metadata: {
          turnCount: this.context.turnCount,
          timestamp: new Date()
        }
      };

      // Try to parse JSON data if present
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result.data = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // No structured data, that's fine
      }

      return result;

    } catch (error) {
      this.setState('failed');
      throw new Error(`Conversation failed: ${error}`);
    }
  }

  /**
   * Continue conversation with custom prompt
   */
  async continueWithPrompt(customPrompt: string): Promise<ConversationResult> {
    try {
      const response = await this.aiProvider.analyzeFiles({
        files: [],
        baseDirectory: '',
        existingStructure: [],
        userPreferences: {
          customPrompt,
          temperature: this.context.config.temperature,
          ...this.context.config.aiSettings
        }
      });

      const aiResponse = response.reasoning || 'No response generated';
      
      this.addAssistantMessage(aiResponse, {
        customPrompt: true,
        confidence: 0.8
      });

      return {
        response: aiResponse,
        needsInput: response.clarificationNeeded ? true : false,
        questions: response.clarificationNeeded?.questions,
        confidence: 0.8,
        metadata: {
          turnCount: this.context.turnCount,
          timestamp: new Date()
        }
      };

    } catch (error) {
      throw new Error(`Custom prompt failed: ${error}`);
    }
  }

  /**
   * Reset conversation to start fresh
   */
  reset(keepSystemPrompt: boolean = true): void {
    const systemMessages = keepSystemPrompt ? 
      this.context.messages.filter(msg => msg.role === 'system') : [];
    
    this.context.messages = systemMessages;
    this.context.customContext = {};
    this.context.turnCount = 0;
    this.context.state = 'active';
    this.context.updatedAt = new Date();
  }

  /**
   * Complete the conversation
   */
  complete(): void {
    this.setState('complete');
  }

  /**
   * Pause the conversation
   */
  pause(): void {
    this.setState('paused');
  }

  /**
   * Resume the conversation
   */
  resume(): void {
    if (this.context.state === 'paused') {
      this.setState('active');
    }
  }

  /**
   * Export conversation data
   */
  export(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Import conversation data
   */
  static import(data: ConversationContext, aiProvider: BaseAIProvider): AIConversationContext {
    const instance = new AIConversationContext(aiProvider, data.subject, data.config);
    instance.context = { ...data };
    return instance;
  }

  /**
   * Build prompt from conversation history
   */
  private buildPrompt(): string {
    if (this.context.config.systemPrompt) {
      // Use custom system prompt
      const messages = this.context.messages
        .filter(msg => msg.role !== 'system')
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');
      
      return `${this.context.config.systemPrompt}\n\nCONVERSATION:\n${messages}\n\nPlease respond as the assistant.`;
    }

    // Default conversation format
    return this.context.messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n') + '\n\nASSISTANT:';
  }

  /**
   * Trim conversation context if it gets too large
   */
  private trimContext(): void {
    const maxSize = this.context.config.maxContextSize!;
    const currentSize = this.context.messages.reduce((size, msg) => size + msg.content.length, 0);
    
    if (currentSize > maxSize) {
      // Keep system messages and recent messages
      const systemMessages = this.context.messages.filter(msg => msg.role === 'system');
      const otherMessages = this.context.messages.filter(msg => msg.role !== 'system');
      
      // Keep the most recent messages that fit within the limit
      let size = systemMessages.reduce((s, msg) => s + msg.content.length, 0);
      const recentMessages: ConversationMessage[] = [];
      
      for (let i = otherMessages.length - 1; i >= 0; i--) {
        const msg = otherMessages[i];
        if (size + msg.content.length <= maxSize) {
          recentMessages.unshift(msg);
          size += msg.content.length;
        } else {
          break;
        }
      }
      
      this.context.messages = [...systemMessages, ...recentMessages];
    }
  }

  /**
   * Generate unique conversation ID
   */
  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
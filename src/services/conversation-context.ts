/**
 * Represents the context of a conversation, including its state, messages, configuration, and metadata.
 * 
 * This class provides methods to manage and interact with a conversation, such as adding messages,
 * updating the subject, changing the state, and retrieving metadata like creation and update timestamps.
 * 
 * The conversation context is initialized with a unique ID, subject, and optional configuration settings.
 * It tracks the state of the conversation, the messages exchanged, and the number of turns taken.
 * 
 * @remarks
 * - The `ConversationContext` class is designed to handle conversational data and metadata.
 * - It supports configurable settings such as maximum turns, context size, and temperature.
 * - The class ensures that updates to the conversation (e.g., adding messages or changing state) 
 *   automatically refresh the `updatedAt` timestamp.
 * 
 * @example
 * ```typescript
 * const context = new ConversationContext("Customer Support", { maxTurns: 20 });
 * context.addMessage("user", "Hello, I need help with my account.");
 * context.addMessage("assistant", "Sure, I can assist you. What seems to be the issue?");
 * console.log(context.getMessages());
 * ```
 */
import { randomUUID } from "node:crypto";
import { ConversationConfig, ConversationMessage } from "../types";


export class ConversationContext {
    protected id: string;
    protected subject: string;
    protected state: 'active' | 'paused' | 'complete' | 'failed';
    protected messages: ConversationMessage[];
    protected config: ConversationConfig;
    protected createdAt: Date;
    protected updatedAt: Date;
    protected turnCount: number;

    constructor(
        subject: string,
        config: Partial<ConversationConfig> = {}
    ) {
        this.id = randomUUID();
        this.subject = subject;
        this.state = 'active';
        this.messages = [];
        this.config = {
        maxTurns: 10,
        keepFullHistory: true,
        maxContextSize: 8000,
        temperature: 0.7,
        ...config
        };
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.turnCount = 0;
    }

    /**
     * Retrieves the unique identifier associated with the current instance.
     *
     * @returns {string} The unique identifier as a string.
     */
    getId(): string {
        return this.id;
    }

    /**
     * Retrieves the subject associated with the current conversation context.
     *
     * @returns {string} The subject of the conversation.
     */
    getSubject(): string {
        return this.subject;
    }

    /**
     * Updates the subject of the conversation context and sets the updated timestamp.
     *
     * @param subject - The new subject to set for the conversation context.
     */
    setSubject(subject: string): void {
        this.subject = subject;
        this.updatedAt = new Date();
    }

    /**
     * Retrieves the current state of the conversation context.
     * 
     * @returns {'active' | 'paused' | 'complete' | 'failed'} The current state, which can be one of the following:
     * - `'active'`: Indicates the conversation is ongoing.
     * - `'paused'`: Indicates the conversation is temporarily halted.
     * - `'complete'`: Indicates the conversation has successfully concluded.
     * - `'failed'`: Indicates the conversation encountered an error or was unsuccessful.
     */
    getState(): 'active' | 'paused' | 'complete' | 'failed' {
        return this.state;
    }

    /**
     * Updates the state of the conversation context and sets the updated timestamp.
     *
     * @param state - The new state to set for the conversation context. 
     *                Must be one of the following values: 'active', 'paused', 'complete', or 'failed'.
     */
    setState(state: 'active' | 'paused' | 'complete' | 'failed'): void {
        this.state = state;
        this.updatedAt = new Date();
    }

    /**
     * Retrieves the list of conversation messages.
     *
     * @returns {ConversationMessage[]} An array of conversation messages.
     */
    getMessages(): ConversationMessage[] {
        return this.messages;
    }

    setMessages(messages: ConversationMessage[] | []): void {
        this.messages = messages;
        this.updatedAt = new Date();
    }

    /**
     * Retrieves the conversation configuration.
     *
     * @returns {ConversationConfig} The current conversation configuration.
     */
    getConfig(): ConversationConfig {
        return this.config;
    }

    /**
     * Updates the conversation configuration with the provided settings.
     *
     * @param config - A partial configuration object to update the conversation settings.
     *                This can include properties like maxTurns, keepFullHistory, maxContextSize, and temperature.
     */
    setConfig(config: Partial<ConversationConfig>): void {
        this.config = {
            ...this.config,
            ...config
        };
        this.updatedAt = new Date();
    }


    /**
     * Retrieves the creation date of the current context.
     *
     * @returns {Date} The date and time when the context was created.
     */
    getCreatedAt(): Date {
        return this.createdAt;
    }

    /**
     * Retrieves the last updated date of the current context.
     *
     * @returns {Date} The date and time when the context was last updated.
     */
    getUpdatedAt(): Date {
        return this.updatedAt;
    }

    /**
     * Retrieves the current turn count for the conversation.
     *
     * @returns {number} The number of turns that have occurred in the conversation.
     */
    getTurnCount(): number {
        return this.turnCount;
    }

    /**
     * Increments the turn count by one.
     * This method is used to track the number of turns in a conversation context.
     */
    incrementTurnCount(): void {
        this.turnCount++;
    }

    /**
     * Resets the turn count to zero and updates the timestamp indicating
     * the last modification. This method is typically used to restart
     * the conversation context or initialize the turn count for a new session.
     */
    resetTurnCount(): void {
        this.turnCount = 0;
        this.updatedAt = new Date();
    }

    /**
     * Add a message to the conversation
     * @param role - The role of the message sender ('user', 'assistant', 'system')
     * @param content - The content of the message
     */
    addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
        const message: ConversationMessage = {
            role,
            content
        };

        this.messages.push(message);
        this.updatedAt = new Date();
    }

    /**
     * Adds a user message to the conversation context.
     *
     * @param content - The content of the message to be added.
     */
    addUserMessage(content: string): void {
        this.addMessage('user', content);
    }

    /**
     * Adds a message from the assistant to the conversation context.
     *
     * @param content - The content of the assistant's message to be added.
     */
    addAssistantMessage(content: string): void {
        this.addMessage('assistant', content);
    }

    /**
     * Adds a system message to the conversation context.
     *
     * @param content - The content of the system message to be added.
     */
    addSystemMessage(content: string): void {
        this.addMessage('system', content);
    }

}
/**
 * The `OrganizationContext` class extends the `ConversationContext` class and provides
 * functionality for managing and organizing file information, patterns, suggestions, and
 * categories within a specific organizational context. It is designed to facilitate the
 * analysis, conversation, and organization phases of a workflow, with the ability to track
 * clarifications, rejected suggestions, approved patterns, discovered categories, and more.
 *
 * This class encapsulates the state and behavior required to process files and organize them
 * based on the provided intent and configuration. It includes methods for adding, retrieving,
 * and updating various aspects of the organizational context, such as files, suggestions,
 * patterns, and categories.
 *
 * Key features:
 * - Tracks files and their associated metadata.
 * - Manages rejected suggestions and approved patterns.
 * - Organizes files into discovered categories.
 * - Handles clarifications and pattern hints.
 * - Supports multiple workflow phases: analysis, conversation, organization, and completion.
 *
 * @extends ConversationContext
 */
import { Clarification, ConversationConfig, FileInfo, OrganizationSuggestion } from "../types";
import { ConversationContext } from "./conversation-context";


export class OrganizationContext extends ConversationContext {
    private files: FileInfo[];
    private baseDirectory: string;
    private intent: string;
    private rejectedSuggestions: OrganizationSuggestion[];
    private approvedPatterns: string[];
    private discoveredCategories: Record<string, FileInfo[]>;
    private clarifications: Clarification[];
    private currentBatch?: {
        name: string;
        files: FileInfo[];
    };
    private phase: 'analysis' | 'conversation' | 'organization' | 'complete';
    private patternHints: string[];

    /**
     * Constructs an instance of the OrganizationContext service.
     *
     * @param subject - The subject or topic of the organization context.
     * @param files - An array of file information objects to be processed.
     * @param baseDirectory - The base directory path where files are located.
     * @param intent - The intent or purpose of the organization context.
     * @param config - Optional partial configuration for the conversation context.
     */
    constructor(
        subject: string,
        files: FileInfo[],
        baseDirectory: string,
        intent: string,
        config: Partial<ConversationConfig> = {}
    ) {
        super(subject, config);
        this.files = files;
        this.baseDirectory = baseDirectory;
        this.intent = intent;
        this.rejectedSuggestions = [];
        this.approvedPatterns = [];
        this.discoveredCategories = {};
        this.clarifications = [];
        this.phase = 'analysis';
        this.patternHints = [];
    }

    /**
     * Retrieves the list of files associated with the organization context.
     *
     * @returns {FileInfo[]} An array of `FileInfo` objects representing the files.
     */
    public getFiles(): FileInfo[] {
        return this.files;
    }

    /**
     * Sets the list of files for the organization context.
     *
     * @param files - An array of `FileInfo` objects representing the files to be set.
     */
    public setFiles(files: FileInfo[]): void {
        this.files = files;
    }

    /**
     * Retrieves the base directory associated with the organization context.
     *
     * @returns {string} The base directory path as a string.
     */
    public getBaseDirectory(): string {
        return this.baseDirectory;
    }

    /**
     * Sets the base directory for the organization context.
     * 
     * @param baseDirectory - The path to the base directory to be set.
     */
    public setBaseDirectory(baseDirectory: string): void {
        this.baseDirectory = baseDirectory;
    }

    /**
     * Retrieves the current intent associated with the organization context.
     *
     * @returns {string} The intent as a string.
     */
    public getIntent(): string {
        return this.intent;
    }

    /**
     * Sets the intent for the organization context.
     *
     * @param intent - A string representing the intent to be set.
     */
    public setIntent(intent: string): void {
        this.intent = intent;
    }

    /**
     * Retrieves the list of rejected organization suggestions.
     *
     * @returns {OrganizationSuggestion[]} An array of rejected suggestions.
     */
    public getRejectedSuggestions(): OrganizationSuggestion[] {
        return this.rejectedSuggestions;
    }

    /**
     * Updates the list of rejected organization suggestions.
     * 
     * @param rejectedSuggestions - An array of `OrganizationSuggestion` objects 
     * representing the suggestions that have been rejected.
     */
    public setRejectedSuggestions(rejectedSuggestions: OrganizationSuggestion[]): void {
        this.rejectedSuggestions = rejectedSuggestions;
    }

    /**
     * Retrieves the list of approved patterns.
     *
     * @returns {string[]} An array of strings representing the approved patterns.
     */
    public getApprovedPatterns(): string[] {
        return this.approvedPatterns;
    }

    /**
     * Sets the approved patterns for the organization context.
     * 
     * @param approvedPatterns - An array of strings representing the approved patterns.
     */
    public setApprovedPatterns(approvedPatterns: string[]): void {
        this.approvedPatterns = approvedPatterns;
    }

    /**
     * Retrieves the discovered categories and their associated file information.
     *
     * @returns A record where the keys are category names (strings) and the values are arrays of `FileInfo` objects.
     */
    public getDiscoveredCategories(): Record<string, FileInfo[]> {
        return this.discoveredCategories;
    }

    /**
     * Updates the discovered categories with the provided data.
     *
     * @param discoveredCategories - An object where the keys represent category names
     * and the values are arrays of `FileInfo` objects associated with each category.
     */
    public setDiscoveredCategories(discoveredCategories: Record<string, FileInfo[]>): void {
        this.discoveredCategories = discoveredCategories;
    }

    /**
     * Retrieves the list of clarifications associated with the organization context.
     *
     * @returns {Clarification[]} An array of clarifications.
     */
    public getClarifications(): Clarification[] {
        return this.clarifications;
    }

    /**
     * Updates the clarifications for the organization context.
     *
     * @param clarifications - An array of `Clarification` objects to set as the current clarifications.
     */
    public setClarifications(clarifications: Clarification[]): void {
        this.clarifications = clarifications;
    }

    /**
     * Retrieves the current batch information, including its name and associated files.
     *
     * @returns An object containing the name of the current batch and an array of file information,
     *          or `undefined` if no batch is currently set.
     */
    public getCurrentBatch(): { name: string; files: FileInfo[] } | undefined {
        return this.currentBatch;
    }

    /**
     * Sets the current batch for the organization context.
     * 
     * @param currentBatch - The batch to set as the current batch. 
     * It can either be an object containing a `name` and an array of `FileInfo` objects, 
     * or `undefined` to clear the current batch.
     */
    public setCurrentBatch(currentBatch: { name: string; files: FileInfo[] } | undefined): void {
        this.currentBatch = currentBatch;
    }

    /**
     * Retrieves the current phase of the organization context.
     * 
     * @returns {'analysis' | 'conversation' | 'organization' | 'complete'} 
     * The current phase, which can be one of the following:
     * - `'analysis'`: Represents the analysis phase.
     * - `'conversation'`: Represents the conversation phase.
     * - `'organization'`: Represents the organization phase.
     * - `'complete'`: Represents the completion phase.
     */
    public getPhase(): 'analysis' | 'conversation' | 'organization' | 'complete' {
        return this.phase;
    }

    /**
     * Sets the current phase of the organization context.
     * 
     * @param phase - The phase to set, which must be one of the following:
     *                - `'analysis'`: Represents the analysis phase.
     *                - `'conversation'`: Represents the conversation phase.
     *                - `'organization'`: Represents the organization phase.
     *                - `'complete'`: Represents the completion phase.
     */
    public setPhase(phase: 'analysis' | 'conversation' | 'organization' | 'complete'): void {
        this.phase = phase;
    }

    /**
     * Retrieves the list of pattern hints associated with the organization context.
     *
     * @returns {string[]} An array of strings representing the pattern hints.
     */
    public getPatternHints(): string[] {
        return this.patternHints;
    }

    /**
     * Sets the pattern hints for the organization context.
     * 
     * @param patternHints - An array of strings representing the pattern hints to be set.
     */
    public setPatternHints(patternHints: string[]): void {
        this.patternHints = patternHints;
    }

    /**
     * Adds new files to the existing list of files in the organization context.
     *
     * @param newFiles - An array of `FileInfo` objects representing the new files to be added.
     *                   These files will be appended to the current list of files.
     */
    public addFiles(newFiles: FileInfo[]): void {
        this.files = [...this.files, ...newFiles];
    }

    /**
     * Adds a suggestion to the list of rejected suggestions.
     *
     * @param suggestion - The organization suggestion to be marked as rejected.
     */
    public addRejectedSuggestion(suggestion: OrganizationSuggestion): void {
        this.rejectedSuggestions.push(suggestion);
    }

    /**
     * Adds a new pattern to the list of approved patterns.
     *
     * @param pattern - The pattern to be added to the approved patterns list.
     */
    public addApprovedPattern(pattern: string): void {
        this.approvedPatterns.push(pattern);
    }

    /**
     * Adds a discovered category along with its associated files to the organization context.
     * If the category does not already exist, it initializes an empty array for it.
     * Then, it appends the provided files to the category's file list.
     *
     * @param category - The name of the category to add or update.
     * @param files - An array of file information objects to associate with the category.
     */
    public addDiscoveredCategory(category: string, files: FileInfo[]): void {
        if (!this.discoveredCategories[category]) {
            this.discoveredCategories[category] = [];
        }
        this.discoveredCategories[category].push(...files);
    }

    /**
     * Adds a clarification to the list of clarifications.
     *
     * @param clarification - The clarification object to be added.
     */
    public addClarification(clarification: Clarification): void {
        this.clarifications.push(clarification);
    }

    /**
     * Adds a pattern hint to the list of pattern hints.
     *
     * @param hint - The pattern hint to be added.
     */
    public addPatternHint(hint: string): void {
        this.patternHints.push(hint);
    }

}
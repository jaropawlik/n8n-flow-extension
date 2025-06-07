import type { ConversationEntry, WorkflowContext } from "./storage"
import { getConversationHistory, saveConversationHistory } from "./storage"

export class MemoryBuffer {
  private static instance: MemoryBuffer
  private conversationHistory: ConversationEntry[] = []
  private maxEntries = 10

  private constructor() {}

  public static getInstance(): MemoryBuffer {
    if (!MemoryBuffer.instance) {
      MemoryBuffer.instance = new MemoryBuffer()
    }
    return MemoryBuffer.instance
  }

  // Initialize memory buffer by loading from storage
  public async initialize(): Promise<void> {
    try {
      this.conversationHistory = await getConversationHistory()
    } catch (error) {
      console.error("Failed to initialize memory buffer:", error)
      this.conversationHistory = []
    }
  }

  // Add new conversation entry
  public async addEntry(
    query: string, 
    response: string, 
    context?: WorkflowContext
  ): Promise<void> {
    const entry: ConversationEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      query,
      response,
      context
    }

    this.conversationHistory.push(entry)
    
    // Keep only last N entries
    if (this.conversationHistory.length > this.maxEntries) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxEntries)
    }

    // Save to storage
    await saveConversationHistory(this.conversationHistory)
  }

  // Get conversation history for context
  public getHistory(): ConversationEntry[] {
    return [...this.conversationHistory] // Return copy to prevent mutation
  }

  // Get formatted history for AI context
  public getFormattedHistory(): string {
    if (this.conversationHistory.length === 0) {
      return "No previous conversation history."
    }

    return this.conversationHistory
      .slice(-5) // Last 5 conversations for context
      .map(entry => `
Human: ${entry.query}
Assistant: ${entry.response}
      `.trim())
      .join("\n\n")
  }

  // Get relevant context from recent entries
  public getRecentContext(): WorkflowContext | null {
    const recentEntries = this.conversationHistory
      .filter(entry => entry.context)
      .slice(-3) // Last 3 entries with context

    if (recentEntries.length === 0) return null

    // Merge contexts from recent entries
    const mergedContext: WorkflowContext = {
      nodes: [],
      errors: [],
      currentUrl: recentEntries[recentEntries.length - 1]?.context?.currentUrl || ""
    }

    recentEntries.forEach(entry => {
      if (entry.context) {
        mergedContext.nodes.push(...entry.context.nodes)
        mergedContext.errors.push(...entry.context.errors)
      }
    })

    return mergedContext
  }

  // Clear all conversation history
  public async clearHistory(): Promise<void> {
    this.conversationHistory = []
    await saveConversationHistory([])
  }

  // Generate unique ID for conversation entries
  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get conversation statistics
  public getStats(): { totalEntries: number; oldestEntry?: Date; newestEntry?: Date } {
    const total = this.conversationHistory.length
    
    if (total === 0) {
      return { totalEntries: 0 }
    }

    const timestamps = this.conversationHistory.map(entry => entry.timestamp)
    return {
      totalEntries: total,
      oldestEntry: new Date(Math.min(...timestamps)),
      newestEntry: new Date(Math.max(...timestamps))
    }
  }
} 
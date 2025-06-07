import { Storage } from "@plasmohq/storage"

const storage = new Storage()

export interface StorageKeys {
  OPENAI_API_KEY: string
  CONVERSATION_HISTORY: ConversationEntry[]
}

export interface ConversationEntry {
  id: string
  timestamp: number
  query: string
  response: string
  context?: WorkflowContext
}

export interface WorkflowContext {
  nodes: any[]
  errors: any[]
  currentUrl: string
}

// OpenAI API Key management
export const saveApiKey = async (apiKey: string): Promise<void> => {
  await storage.set("OPENAI_API_KEY", apiKey)
}

export const getApiKey = async (): Promise<string | null> => {
  return await storage.get("OPENAI_API_KEY")
}

export const removeApiKey = async (): Promise<void> => {
  await storage.remove("OPENAI_API_KEY")
}

// Conversation history management
export const saveConversationHistory = async (history: ConversationEntry[]): Promise<void> => {
  // Keep only last 10 entries to prevent storage bloat
  const limitedHistory = history.slice(-10)
  await storage.set("CONVERSATION_HISTORY", limitedHistory)
}

export const getConversationHistory = async (): Promise<ConversationEntry[]> => {
  const history = await storage.get("CONVERSATION_HISTORY")
  return history || []
}

export const clearConversationHistory = async (): Promise<void> => {
  await storage.remove("CONVERSATION_HISTORY")
}

// Utility function to check if API key exists
export const hasValidApiKey = async (): Promise<boolean> => {
  const apiKey = await getApiKey()
  return apiKey !== null && apiKey.length > 0
} 
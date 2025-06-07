import { getApiKey } from "./storage"
import { MemoryBuffer } from "./memoryBuffer"
import { DOMParser } from "./domParser"

export interface OpenAIResponse {
  success: boolean
  response?: string
  error?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ChatRequest {
  query: string
  includeWorkflowContext?: boolean
  includeHistory?: boolean
  nodeContext?: any
}

export class OpenAIClient {
  private static readonly API_URL = "https://api.openai.com/v1/chat/completions"
  private static readonly MODEL = "gpt-4o"
  private static readonly MAX_TOKENS = 2000
  
  // Debounce mechanism for API calls
  private static debounceTimers: Map<string, any> = new Map()
  private static readonly DEBOUNCE_DELAY = 500 // 500ms

  // Main chat method with debouncing
  public static async chat(request: ChatRequest): Promise<OpenAIResponse> {
    return new Promise((resolve) => {
      const debounceKey = `chat_${request.query.slice(0, 50)}`
      
      // Clear existing timer
      const existingTimer = this.debounceTimers.get(debounceKey)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // Set new timer
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(debounceKey)
        const result = await this._performChat(request)
        resolve(result)
      }, this.DEBOUNCE_DELAY)

      this.debounceTimers.set(debounceKey, timer)
    })
  }

  // Internal chat method (actual API call)
  private static async _performChat(request: ChatRequest): Promise<OpenAIResponse> {
    try {
      const apiKey = await getApiKey()
      if (!apiKey) {
        return {
          success: false,
          error: "OpenAI API key not configured. Please set it in the extension popup."
        }
      }

      const messages = await this.buildMessages(request)
      
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages,
          max_tokens: this.MAX_TOKENS,
          temperature: 0.7,
          stream: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: `OpenAI API Error: ${response.status} - ${errorData.error?.message || response.statusText}`
        }
      }

      const data = await response.json()
      const assistantMessage = data.choices[0]?.message?.content

      if (!assistantMessage) {
        return {
          success: false,
          error: "No response received from OpenAI"
        }
      }

      // Store in memory buffer
      const memoryBuffer = MemoryBuffer.getInstance()
      await memoryBuffer.addEntry(
        request.query,
        assistantMessage,
        request.includeWorkflowContext ? {
          nodes: DOMParser.parseWorkflow().nodes,
          errors: DOMParser.parseWorkflow().errors,
          currentUrl: window.location.href
        } : undefined
      )

      return {
        success: true,
        response: assistantMessage,
        usage: data.usage
      }

    } catch (error) {
      console.error("OpenAI API Error:", error)
      return {
        success: false,
        error: `Network error: ${error.message || "Unknown error"}`
      }
    }
  }

  // Build messages array for OpenAI API
  private static async buildMessages(request: ChatRequest): Promise<any[]> {
    const messages: any[] = []

    // System message with n8n-specific context
    messages.push({
      role: "system",
      content: this.getSystemPrompt()
    })

    // Add conversation history if requested
    if (request.includeHistory) {
      const memoryBuffer = MemoryBuffer.getInstance()
      const history = memoryBuffer.getFormattedHistory()
      if (history && history !== "No previous conversation history.") {
        messages.push({
          role: "system",
          content: `Previous conversation context:\n${history}`
        })
      }
    }

    // Add workflow context if requested
    if (request.includeWorkflowContext) {
      const workflowSummary = DOMParser.getWorkflowSummary()
      if (workflowSummary) {
        messages.push({
          role: "system",
          content: `Current n8n workflow context:\n${workflowSummary}`
        })
      }
    }

    // Add specific node context if provided
    if (request.nodeContext) {
      messages.push({
        role: "system",
        content: `Specific node context:\n${JSON.stringify(request.nodeContext, null, 2)}`
      })
    }

    // Add user query
    messages.push({
      role: "user",
      content: request.query
    })

    return messages
  }

  // System prompt for n8n-specific assistance
  private static getSystemPrompt(): string {
    return `
You are an AI assistant specialized in helping users with n8n workflows. You have access to the current workflow context including nodes, their types, positions, and any errors.

Your capabilities include:
- Analyzing n8n workflows and identifying issues
- Suggesting improvements and optimizations
- Generating example JSON data for nodes
- Creating JavaScript code for Function nodes
- Helping with node configurations
- Debugging workflow errors
- Optimizing prompts for AI nodes

Guidelines:
- Always provide practical, actionable advice
- When generating code, ensure it's compatible with n8n's environment
- For Function nodes, use n8n's specific syntax and available methods
- When suggesting JSON, make it realistic and relevant to the context
- If there are errors in the workflow, prioritize addressing them
- Be concise but thorough in explanations
- Use examples when helpful

Current context: You're assisting with an n8n workflow editor session.
    `.trim()
  }

  // Generate JSON example for a specific node type
  public static async generateNodeJSON(nodeType: string, nodeContext?: any): Promise<OpenAIResponse> {
    const request: ChatRequest = {
      query: `Generate a realistic JSON example for an n8n ${nodeType} node. Include common parameters and sample data that would be typical for this node type.`,
      includeWorkflowContext: false,
      includeHistory: false,
      nodeContext
    }

    return this.chat(request)
  }

  // Generate JavaScript code for Function node
  public static async generateFunctionCode(description: string, nodeContext?: any): Promise<OpenAIResponse> {
    const request: ChatRequest = {
      query: `Generate JavaScript code for an n8n Function node that ${description}. Use n8n's specific syntax and available methods like $input, $node, etc.`,
      includeWorkflowContext: true,
      includeHistory: false,
      nodeContext
    }

    return this.chat(request)
  }

  // Optimize prompt for AI nodes
  public static async optimizePrompt(originalPrompt: string): Promise<OpenAIResponse> {
    const request: ChatRequest = {
      query: `Optimize this prompt for better AI performance: "${originalPrompt}". Make it more specific, clear, and effective while maintaining the original intent.`,
      includeWorkflowContext: false,
      includeHistory: false
    }

    return this.chat(request)
  }

  // Analyze workflow and suggest improvements
  public static async analyzeWorkflow(): Promise<OpenAIResponse> {
    const request: ChatRequest = {
      query: "Analyze the current n8n workflow and provide suggestions for improvements, optimizations, or potential issues I should address.",
      includeWorkflowContext: true,
      includeHistory: true
    }

    return this.chat(request)
  }

  // Test API key validity
  public static async testApiKey(): Promise<OpenAIResponse> {
    try {
      const apiKey = await getApiKey()
      if (!apiKey) {
        return {
          success: false,
          error: "No API key configured"
        }
      }

      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      })

      if (response.ok) {
        return {
          success: true,
          response: "API key is valid"
        }
      } else {
        return {
          success: false,
          error: `Invalid API key: ${response.status}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Connection error: ${error.message}`
      }
    }
  }

  // Clear all debounce timers (cleanup)
  public static clearDebounceTimers(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
  }
} 
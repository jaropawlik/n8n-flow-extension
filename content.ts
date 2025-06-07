import type { PlasmoCSConfig } from "plasmo"
import { N8nApiClient } from "./n8nApiClient"
import { EnhancedWorkflowContext } from './n8nApiClient'

export const config: PlasmoCSConfig = {
  matches: [
    "http://localhost:5678/*", 
    "https://app.n8n.cloud/*",
    "https://automation.zufto.pl/*"
  ],
  run_at: "document_end"
}

// Initialize n8n API client with real API key
const n8nApi = new N8nApiClient(window.location.origin)

// Simple workflow parser as fallback
function parseSimpleWorkflow() {
  try {
    // Try multiple selectors for n8n nodes
    const nodeSelectors = [
      '[data-name="NodeView"]',
      '[data-test-id*="node"]', 
      '.node-box',
      '.node',
      '[class*="node"]'
    ]
    
    let nodes: Element[] = []
    for (const selector of nodeSelectors) {
      nodes = Array.from(document.querySelectorAll(selector))
      if (nodes.length > 0) break
    }
    
    // Try multiple selectors for errors
    const errorSelectors = [
      '.error',
      '.has-error',
      '[data-test-id*="error"]',
      '[class*="error"]'
    ]
    
    let errors: Element[] = []
    for (const selector of errorSelectors) {
      errors = Array.from(document.querySelectorAll(selector))
      if (errors.length > 0) break
    }
    
    return {
      nodes: nodes.map((node, index) => ({
        id: `node_${index}`,
        name: node.textContent?.trim().substring(0, 50) || `Node ${index + 1}`,
        type: node.className.split(' ')[0] || 'Unknown',
        hasError: errors.some(error => node.contains(error) || error.contains(node))
      })),
      totalNodes: nodes.length,
      errorCount: errors.length
    }
  } catch (error) {
    console.error("Simple parser error:", error)
    return { nodes: [], totalNodes: 0, errorCount: 0 }
  }
}

// Chat widget for n8n Flow extension
let chatWidget: HTMLElement | null = null
let isWidgetOpen = false

// Initialize widget when DOM is ready
function initializeWidget() {
  if (chatWidget) return // Already initialized

  console.log("n8n Flow: Initializing chat widget")

  createChatWidget()
  setupEventListeners()
}

// Create floating chat button and widget
function createChatWidget() {
  // Create container
  const container = document.createElement("div")
  container.id = "n8n-flow-chat-widget"
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  // Create floating button
  const button = document.createElement("button")
  button.id = "n8n-flow-chat-button"
  button.innerHTML = "💬"
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    font-size: 24px;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.2s ease;
  `

  // Create chat panel (initially hidden)
  const chatPanel = document.createElement("div")
  chatPanel.id = "n8n-flow-chat-panel"
  chatPanel.style.cssText = `
    position: absolute;
    bottom: 70px;
    right: 0;
    width: 350px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    border: 1px solid #e1e5e9;
    display: none;
    flex-direction: column;
    overflow: hidden;
  `

  // Chat header
  const header = document.createElement("div")
  header.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px;
    font-weight: 600;
    font-size: 16px;
  `
  header.textContent = "n8n Flow Assistant"

  // Chat messages area
  const messagesArea = document.createElement("div")
  messagesArea.id = "n8n-flow-messages"
  messagesArea.style.cssText = `
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    background: #f8f9fa;
  `

  // Initial welcome message
  const welcomeMessage = document.createElement("div")
  welcomeMessage.style.cssText = `
    background: white;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 12px;
    border-left: 4px solid #667eea;
    font-size: 14px;
    line-height: 1.4;
  `
  welcomeMessage.innerHTML = `
    <strong>Hi! I'm your n8n workflow assistant.</strong><br/>
    Ask me about your workflow, generate code, or get help with nodes!
  `
  messagesArea.appendChild(welcomeMessage)

  // Input area
  const inputArea = document.createElement("div")
  inputArea.style.cssText = `
    padding: 16px;
    border-top: 1px solid #e1e5e9;
    background: white;
  `

  const inputGroup = document.createElement("div")
  inputGroup.style.cssText = `
    display: flex;
    gap: 8px;
  `

  const input = document.createElement("input")
  input.id = "n8n-flow-chat-input"
  input.type = "text"
  input.placeholder = "Ask about your workflow..."
  input.style.cssText = `
    flex: 1;
    padding: 10px 12px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s ease;
  `

  const sendButton = document.createElement("button")
  sendButton.id = "n8n-flow-send-button"
  sendButton.textContent = "Send"
  sendButton.style.cssText = `
    padding: 10px 16px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s ease;
  `

  // Assemble the widget
  inputGroup.appendChild(input)
  inputGroup.appendChild(sendButton)
  inputArea.appendChild(inputGroup)

  chatPanel.appendChild(header)
  chatPanel.appendChild(messagesArea)
  chatPanel.appendChild(inputArea)

  container.appendChild(button)
  container.appendChild(chatPanel)

  document.body.appendChild(container)
  chatWidget = container
}

// Setup event listeners
function setupEventListeners() {
  if (!chatWidget) return

  const button = chatWidget.querySelector("#n8n-flow-chat-button") as HTMLElement
  const panel = chatWidget.querySelector("#n8n-flow-chat-panel") as HTMLElement
  const input = chatWidget.querySelector("#n8n-flow-chat-input") as HTMLInputElement
  const sendButton = chatWidget.querySelector("#n8n-flow-send-button") as HTMLElement

  // Toggle chat panel
  button.addEventListener("click", () => {
    isWidgetOpen = !isWidgetOpen
    panel.style.display = isWidgetOpen ? "flex" : "none"
    button.style.transform = isWidgetOpen ? "rotate(45deg)" : "rotate(0deg)"
    
    if (isWidgetOpen) {
      input.focus()
    }
  })

  // Send message on button click
  sendButton.addEventListener("click", handleSendMessage)

  // Send message on Enter key
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSendMessage()
    }
  })

  // Input focus styling
  input.addEventListener("focus", () => {
    input.style.borderColor = "#667eea"
  })
  
  input.addEventListener("blur", () => {
    input.style.borderColor = "#e1e5e9"
  })

  // Send button hover effect
  sendButton.addEventListener("mouseenter", () => {
    sendButton.style.background = "#5a67d8"
  })
  
  sendButton.addEventListener("mouseleave", () => {
    sendButton.style.background = "#667eea"
  })

  // Listen for messages from background script
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
      switch (message.type) {
        case "CONTEXT_MENU_ACTION":
          handleContextMenuAction(message.action, message.data)
          break
        default:
          break
      }
      return true
    })
  }
}

// Handle sending chat messages
async function handleSendMessage() {
  const input = chatWidget?.querySelector("#n8n-flow-chat-input") as HTMLInputElement
  const messagesArea = chatWidget?.querySelector("#n8n-flow-messages") as HTMLElement
  
  if (!input || !messagesArea) return
  
  const message = input.value.trim()
  if (!message) return
  
  // Clear input
  input.value = ""
  
  // Add user message
  addMessage(message, "user")
  
  // Add loading message
  const loadingId = addMessage("Thinking...", "loading")
  
  try {
    // Get workflow context
    const workflowContext = await getEnhancedWorkflowContext()
    
    // Send to background script for OpenAI processing
    console.log("📤 Content: Sending to background script...")
    
    chrome.runtime.sendMessage({
      type: "SEND_TO_OPENAI",
      userMessage: message,
      context: workflowContext
    }, (response) => {
      console.log("📥 Content: Received response:", response)
      
      if (chrome.runtime.lastError) {
        console.error("❌ Content: Runtime error:", chrome.runtime.lastError)
        addMessage("Sorry, there was a connection error. Please try again.", "assistant")
        return
      }
      
      if (response?.error) {
        console.error("❌ Content: API error:", response.message)
        addMessage(`Error: ${response.message}`, "assistant")
      } else {
        addMessage(response?.message || "Sorry, I didn't receive a response.", "assistant")
      }
    })
  } catch (error) {
    console.error("💥 Content: Error sending message:", error)
    addMessage("Sorry, I encountered an error. Please try again.", "assistant")
  }
}

// Add message to chat
function addMessage(content: string, type: "user" | "assistant" | "error" | "loading"): string {
  const messagesArea = chatWidget?.querySelector("#n8n-flow-messages") as HTMLElement
  if (!messagesArea) return ""
  
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const messageDiv = document.createElement("div")
  messageDiv.id = messageId
  messageDiv.style.cssText = `
    margin-bottom: 12px;
    animation: fadeIn 0.3s ease;
  `
  
  let messageStyle = ""
  switch (type) {
    case "user":
      messageStyle = `
        background: #667eea;
        color: white;
        padding: 10px 12px;
        border-radius: 12px 12px 4px 12px;
        margin-left: 50px;
        font-size: 14px;
        line-height: 1.4;
      `
      break
    case "assistant":
      messageStyle = `
        background: white;
        color: #333;
        padding: 12px;
        border-radius: 12px 12px 12px 4px;
        margin-right: 50px;
        font-size: 14px;
        line-height: 1.4;
        border: 1px solid #e1e5e9;
      `
      break
    case "error":
      messageStyle = `
        background: #fee;
        color: #c53030;
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid #fecaca;
        font-size: 14px;
        line-height: 1.4;
      `
      break
    case "loading":
      messageStyle = `
        background: #f7fafc;
        color: #4a5568;
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        font-size: 14px;
        font-style: italic;
      `
      break
  }
  
  messageDiv.style.cssText += messageStyle
  messageDiv.textContent = content
  
  messagesArea.appendChild(messageDiv)
  messagesArea.scrollTop = messagesArea.scrollHeight
  
  return messageId
}

// Remove message from chat
function removeMessage(messageId: string) {
  const message = document.getElementById(messageId)
  if (message) {
    message.remove()
  }
}

// Open chat widget (called from context menu)
function openChatWidget() {
  if (!chatWidget) {
    initializeWidget()
  }
  
  const button = chatWidget?.querySelector("#n8n-flow-chat-button") as HTMLElement
  const panel = chatWidget?.querySelector("#n8n-flow-chat-panel") as HTMLElement
  
  if (button && panel && !isWidgetOpen) {
    isWidgetOpen = true
    panel.style.display = "flex"
    button.style.transform = "rotate(45deg)"
    
    const input = chatWidget?.querySelector("#n8n-flow-chat-input") as HTMLInputElement
    if (input) {
      setTimeout(() => input.focus(), 100)
    }
  }
}

// Handle context menu actions
function handleContextMenuAction(action: string, data: any) {
  openChatWidget()
  
  let message = ""
  switch (action) {
    case "generate_json":
      message = "Generate JSON configuration for the selected workflow elements"
      break
    case "generate_code":
      message = "Generate code snippet for the selected workflow"
      break
    case "optimize_prompt":
      message = "Help optimize this workflow for better performance"
      break
    default:
      message = `Help me with: ${action}`
  }
  
  const input = chatWidget?.querySelector("#n8n-flow-chat-input") as HTMLInputElement
  if (input) {
    input.value = message
    setTimeout(() => input.focus(), 200)
  }
}

// Enhanced workflow context using API
async function getEnhancedWorkflowContext() {
  try {
    console.log("🔍 Content: Getting comprehensive workflow ecosystem via API...")
    
    if (n8nApi && await n8nApi.testConnection()) {
      console.log("📡 Content: API available? true")
      
      try {
        // First get current workflow to get the ID
        const currentWorkflow = await n8nApi.getCurrentWorkflow()
        if (!currentWorkflow) {
          console.log("⚠️ Content: No current workflow available")
          return getFallbackWorkflowContext()
        }
        
        // Get complete ecosystem using workflow ID
        const ecosystem = await n8nApi.getWorkflowEcosystem(currentWorkflow.id)
        
        if (ecosystem) {
          console.log("✅ Content: Complete workflow ecosystem loaded:")
          console.log(`   - Workflow ID: ${ecosystem.workflow.id}`)
          console.log(`   - Total nodes: ${ecosystem.workflow.nodes.length}`)
          console.log(`   - Recent executions: ${ecosystem.executions.length}`)
          console.log(`   - Webhooks: ${ecosystem.webhooks.length}`)
          console.log(`   - Credentials: ${ecosystem.credentials.length}`)
          console.log(`   - Tags: ${ecosystem.tags.length}`)
          console.log(`   - Security issues: ${ecosystem.analysis.securityIssues.length}`)
          console.log(`   - Recommendations: ${ecosystem.analysis.recommendations.length}`)
          console.log(`   - Health status: ${ecosystem.healthStatus?.status || 'unknown'}`)
          
          // Create enhanced context for chat
          const enhancedContext: EnhancedWorkflowContext = {
            workflowId: ecosystem.workflow.id,
            workflowName: ecosystem.workflow.name,
            isActive: ecosystem.workflow.active,
            nodes: ecosystem.workflow.nodes.map(node => ({
              id: node.id,
              name: node.name,
              type: node.type,
              position: node.position,
              parameters: node.parameters,
              credentials: node.credentials,
              notes: node.notes
            })),
            connections: ecosystem.workflow.connections,
            recentExecutions: ecosystem.executions.map(exec => ({
              id: exec.id,
              status: exec.status,
              startedAt: exec.startedAt,
              stoppedAt: exec.stoppedAt,
              mode: exec.mode,
              finished: exec.finished
            })),
            totalNodes: ecosystem.workflow.nodes.length,
            activeNodes: ecosystem.analysis.activeNodes,
            errorCount: ecosystem.analysis.errorNodes,
            nodeTypeBreakdown: ecosystem.analysis.nodeTypes,
            credentialIssues: ecosystem.analysis.credentialIssues,
            currentUrl: window.location.href,
            timestamp: new Date().toISOString()
          }
          
          // Store enhanced context globally
          ;(window as any).n8nWorkflowContext = enhancedContext
          console.log("💾 Content: Enhanced workflow context stored globally")
          
          // Store extended ecosystem data for advanced analysis
          ;(window as any).n8nWorkflowEcosystem = ecosystem
          console.log("🌍 Content: Complete workflow ecosystem stored globally")
          
          return enhancedContext
        } else {
          console.log("⚠️ Content: No ecosystem data available")
          return getFallbackWorkflowContext()
        }
      } catch (error) {
        console.error("❌ Content: Error loading workflow ecosystem:", error)
        return getFallbackWorkflowContext()
      }
    } else {
      console.log("⚠️ Content: n8n API not available, falling back to DOM parsing")
      return getFallbackWorkflowContext()
    }
  } catch (error) {
    console.error("❌ Content: Error getting enhanced context:", error)
    console.log("🔄 Content: Falling back to DOM parsing due to error")
    return getFallbackWorkflowContext()
  }
}

// Fallback to DOM parsing if API fails
function getFallbackWorkflowContext() {
  console.log("🔄 Content: Using fallback DOM parsing...")
  const workflow = parseSimpleWorkflow()
  
  return {
    workflowId: null,
    workflowName: document.title || "Unknown Workflow",
    isActive: false,
    
    nodes: workflow.nodes,
    connections: {},
    recentExecutions: [],
    
    totalNodes: workflow.totalNodes,
    activeNodes: workflow.totalNodes,
    errorCount: workflow.errorCount,
    
    currentUrl: window.location.pathname,
    timestamp: new Date().toISOString()
  }
}

// Get node at specific position (for context menu)
function getNodeAtPosition(x: number, y: number) {
  const element = document.elementFromPoint(x, y)
  return element?.closest('[data-name="NodeView"]')
}

// Add CSS animations
const style = document.createElement("style")
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`
document.head.appendChild(style)

// Initialize when DOM is ready
const main = () => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWidget)
  } else {
    initializeWidget()
  }
}

main() 
// Background service worker for n8n Flow extension

console.log("🚀 Background script starting...")

// Auto-load API key from config.local.json on startup
async function loadConfigOnStartup() {
  try {
    console.log("🔧 Background: Loading config on startup...")
    
    // Check if API key is already in storage
    const result = await chrome.storage.local.get(['apiKey'])
    if (result.apiKey) {
      console.log("🔑 Background: API key already loaded in storage")
      return
    }
    
    // Try to load from config.local.json
    const configUrl = chrome.runtime.getURL('config.local.json')
    const response = await fetch(configUrl)
    
    if (response.ok) {
      const config = await response.json()
      if (config.OPENAI_API_KEY) {
        // Save to Chrome storage
        await chrome.storage.local.set({ apiKey: config.OPENAI_API_KEY })
        console.log("✅ Background: API key loaded from config.local.json and saved to storage")
      }
    } else {
      console.log("ℹ️ Background: No config.local.json found, API key will need to be set via popup")
    }
  } catch (error) {
    console.error("❌ Background: Error loading config:", error)
  }
}

// Load config on startup
loadConfigOnStartup()

// OpenAI API integration
async function callOpenAI(message: string, context: any) {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get("OPENAI_API_KEY")
    const apiKey = result.OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error("OpenAI API key not found. Please configure it in the extension popup.")
    }

    console.log("Calling OpenAI API...")

    const requestBody = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an n8n workflow assistant. Current workflow: ${context.workflow?.totalNodes || 0} nodes, ${context.workflow?.errorCount || 0} errors. Nodes: ${context.workflow?.nodes?.map(n => `${n.name}(${n.type})`).join(', ') || 'none'}. ${context.workflow?.errors?.length ? `Errors in: ${context.workflow.errors.map(e => e.name).join(', ')}` : ''} Respond in user's language.`
        },
        {
          role: "user", 
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || "Sorry, I couldn't generate a response."
    
  } catch (error) {
    console.error("OpenAI API error:", error)
    throw error
  }
}

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  console.log("n8n Flow: Setting up context menus")
  
  chrome.contextMenus.create({
    id: "n8n-generate-json",
    title: "Generate JSON Example", 
    contexts: ["all"],
    documentUrlPatterns: [
      "http://localhost:5678/*",
      "https://app.n8n.cloud/*"
    ]
  })

  chrome.contextMenus.create({
    id: "n8n-generate-code",
    title: "Generate JavaScript Code",
    contexts: ["all"],
    documentUrlPatterns: [
      "http://localhost:5678/*", 
      "https://app.n8n.cloud/*"
    ]
  })

  chrome.contextMenus.create({
    id: "n8n-optimize-prompt",
    title: "Optimize Prompt",
    contexts: ["all"],
    documentUrlPatterns: [
      "http://localhost:5678/*",
      "https://app.n8n.cloud/*"
    ]
  })
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info: any, tab: any) => {
  if (!tab?.id) return

  console.log("Context menu clicked:", info.menuItemId)
  
  // Send message to content script to handle the action
  chrome.tabs.sendMessage(tab.id, {
    type: "CONTEXT_MENU_ACTION",
    action: info.menuItemId,
    data: {
      pageX: info.pageX,
      pageY: info.pageY,
      selectionText: info.selectionText
    }
  })
})

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("🔧 Background: Received message:", message.type, message)
  
  if (message.type === "SEND_TO_OPENAI") {
    handleOpenAIMessage(message, sendResponse)
    return true // Keep message channel open for async response
  }
  
  if (message.type === "KEEPALIVE") {
    console.log("💓 Background: Keepalive received")
    sendResponse({ status: "alive" })
    return true
  }
})

async function handleOpenAIMessage(message: any, sendResponse: (response: any) => void) {
  try {
    console.log("🤖 Background: Starting OpenAI request...")
    console.log("🤖 Background: Message:", message.userMessage)
    console.log("🤖 Background: Context:", JSON.stringify(message.context, null, 2))
    
    // Get API key from storage
    const result = await chrome.storage.local.get(['apiKey'])
    console.log("🔑 Background: API key loaded:", result.apiKey ? "✅ Found" : "❌ Missing")
    
    if (!result.apiKey) {
      console.error("❌ Background: No API key found")
      sendResponse({ 
        error: true, 
        message: "API key not configured. Please set it in the extension popup." 
      })
      return
    }

    // Create formatted context for AI
    const formatContext = (ctx: any) => {
      if (!ctx) return "No workflow context available."
      
      let contextText = `Workflow Analysis:
📊 Workflow: "${ctx.workflowName}" (ID: ${ctx.workflowId})
📈 Status: ${ctx.isActive ? 'Active' : 'Inactive'}  
🔢 Total Nodes: ${ctx.totalNodes}
⚡ Active Nodes: ${ctx.activeNodes}
❌ Errors: ${ctx.errorCount}

🔗 Node Details:`;

      if (ctx.nodes && ctx.nodes.length > 0) {
        ctx.nodes.slice(0, 10).forEach((node: any, i: number) => {
          contextText += `\n${i + 1}. "${node.name}" (${node.type})`
          if (node.hasError) contextText += ` ⚠️ HAS ERROR`
          if (node.isSelected) contextText += ` 👆 SELECTED`
          if (node.notes) contextText += ` 📝 ${node.notes}`
          if (node.continueOnFail) contextText += ` 🔄 CONTINUE-ON-FAIL`
        })
        if (ctx.nodes.length > 10) {
          contextText += `\n... and ${ctx.nodes.length - 10} more nodes`
        }
      }

      // Add node type breakdown
      if (ctx.nodeTypeBreakdown && Object.keys(ctx.nodeTypeBreakdown).length > 0) {
        contextText += `\n\n🏗️ Node Types:`
        Object.entries(ctx.nodeTypeBreakdown).forEach(([type, count]: [string, any]) => {
          const shortType = type.replace('n8n-nodes-base.', '')
          contextText += `\n- ${shortType}: ${count}`
        })
      }

      // Add credential issues
      if (ctx.credentialIssues && ctx.credentialIssues.length > 0) {
        contextText += `\n\n🔐 Credential Issues:`
        ctx.credentialIssues.slice(0, 5).forEach((issue: string, i: number) => {
          contextText += `\n${i + 1}. ${issue}`
        })
        if (ctx.credentialIssues.length > 5) {
          contextText += `\n... and ${ctx.credentialIssues.length - 5} more credential issues`
        }
      }

      if (ctx.recentExecutions && ctx.recentExecutions.length > 0) {
        contextText += `\n\n📈 Recent Executions:`
        ctx.recentExecutions.slice(0, 5).forEach((exec: any, i: number) => {
          const status = exec.status ? exec.status.toUpperCase() : 'UNKNOWN'
          contextText += `\n${i + 1}. ${status} - ${exec.startedAt || 'Unknown date'}`
          if (exec.duration) contextText += ` (${Math.round(exec.duration / 1000)}s)`
          if (exec.mode) contextText += ` [${exec.mode}]`
        })
      }

      // Add failed execution details
      if (ctx.failedExecutions && ctx.failedExecutions.length > 0) {
        contextText += `\n\n💥 Failed Execution Details:`
        ctx.failedExecutions.slice(0, 3).forEach((exec: any, i: number) => {
          contextText += `\n${i + 1}. Execution ${exec.id}:`
          if (exec.data?.resultData?.error) {
            const error = exec.data.resultData.error
            contextText += `\n   Error: ${error.message}`
            if (error.node) contextText += `\n   Node: ${error.node.name} (${error.node.type})`
            if (error.description) contextText += `\n   Details: ${error.description}`
          }
          if (exec.data?.resultData?.lastNodeExecuted) {
            contextText += `\n   Last executed: ${exec.data.resultData.lastNodeExecuted}`
          }
        })
      }

      if (ctx.connections && Object.keys(ctx.connections).length > 0) {
        const connectionCount = Object.keys(ctx.connections).length
        contextText += `\n\n🔗 Connections: ${connectionCount} nodes have outputs connected`
      }

      return contextText
    }

    // Create OpenAI client and send request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${result.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert n8n workflow assistant. Help with workflow creation, debugging, and optimization.

${formatContext(message.context)}

Respond in Polish. Be specific about node names, types, and provide actionable advice.`
          },
          {
            role: 'user',
            content: message.userMessage
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    })

    console.log("📡 Background: OpenAI response status:", response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Background: OpenAI API error:", response.status, errorText)
      
      // Try fallback to GPT-3.5 if GPT-4 fails
      if (response.status === 400 && errorText.includes('model')) {
        console.log("🔄 Background: Trying GPT-3.5 fallback...")
        return handleOpenAIFallback(message, sendResponse, result.apiKey)
      }
      
      sendResponse({ 
        error: true, 
        message: `OpenAI API error: ${response.status} - ${errorText}` 
      })
      return
    }

    const data = await response.json()
    console.log("✅ Background: OpenAI response received:", data)
    
    const aiResponse = data.choices[0]?.message?.content || "No response received"
    
    sendResponse({ 
      error: false, 
      message: aiResponse 
    })
    
  } catch (error) {
    console.error("💥 Background: Error in handleOpenAIMessage:", error)
    sendResponse({ 
      error: true, 
      message: `Internal error: ${error.message}` 
    })
  }
}

async function handleOpenAIFallback(message: any, sendResponse: (response: any) => void, apiKey: string) {
  try {
    console.log("🔄 Background: Trying GPT-3.5 fallback...")
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert n8n workflow assistant. Help with workflow creation, debugging, and optimization.
            
Context: ${JSON.stringify(message.context)}`
          },
          {
            role: 'user',
            content: message.userMessage
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    })

    console.log("📡 Background: GPT-3.5 response status:", response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Background: GPT-3.5 API error:", response.status, errorText)
      sendResponse({ 
        error: true, 
        message: `API error: ${response.status} - ${errorText}` 
      })
      return
    }

    const data = await response.json()
    console.log("✅ Background: GPT-3.5 response received:", data)
    
    const aiResponse = data.choices[0]?.message?.content || "No response received"
    
    sendResponse({ 
      error: false, 
      message: aiResponse 
    })
    
  } catch (error) {
    console.error("💥 Background: Error in GPT-3.5 fallback:", error)
    sendResponse({ 
      error: true, 
      message: `Fallback error: ${error.message}` 
    })
  }
}

 
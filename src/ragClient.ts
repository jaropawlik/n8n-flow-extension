/*
 * RAG (Retrieval-Augmented Generation) Client Stub
 * 
 * This is a placeholder implementation for future RAG integration.
 * RAG will enhance the AI responses by retrieving relevant documentation
 * and knowledge from a vector database.
 * 
 * Integration options:
 * 1. Qdrant - Open source vector database
 * 2. Supabase Vector - PostgreSQL with vector extension
 * 3. Pinecone - Managed vector database
 * 4. Weaviate - Open source vector search engine
 * 
 * Implementation steps for RAG integration:
 * 1. Set up vector database (e.g., Qdrant local instance or cloud)
 * 2. Create embeddings for n8n documentation using OpenAI embeddings API
 * 3. Index documentation chunks in vector database
 * 4. Implement semantic search functionality
 * 5. Integrate retrieved docs into OpenAI context
 */

export interface RAGDocument {
  id: string
  title: string
  content: string
  url?: string
  category: string
  relevanceScore: number
  metadata?: {
    nodeType?: string
    tags?: string[]
    lastUpdated?: string
  }
}

export interface RAGSearchOptions {
  maxResults?: number
  minRelevanceScore?: number
  categories?: string[]
  nodeTypes?: string[]
}

export class RAGClient {
  private static instance: RAGClient
  private vectorDbUrl: string = ""
  private apiKey: string = ""
  private isInitialized: boolean = false

  private constructor() {
    // Initialize with Qdrant Cloud defaults
    this.vectorDbUrl = "https://your-cluster-url.qdrant.tech"
    this.apiKey = "" // Will be set via config
  }

  public static getInstance(): RAGClient {
    if (!RAGClient.instance) {
      RAGClient.instance = new RAGClient()
    }
    return RAGClient.instance
  }

  // Initialize RAG client with Qdrant Cloud
  public async initialize(config?: {
    vectorDbUrl?: string
    apiKey?: string
  }): Promise<boolean> {
    try {
      if (config) {
        this.vectorDbUrl = config.vectorDbUrl || this.vectorDbUrl
        this.apiKey = config.apiKey || this.apiKey
      }

      // Test connection to Qdrant Cloud
      const testResponse = await this.testConnection()
      this.isInitialized = testResponse

      console.log(`RAG Client: ${this.isInitialized ? '✅' : '❌'} Qdrant Cloud connection`, this.vectorDbUrl)
      return this.isInitialized

    } catch (error) {
      console.error("RAG Client initialization failed:", error)
      this.isInitialized = false
      return false
    }
  }

  // Test connection to Qdrant Cloud
  private async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.vectorDbUrl}/collections`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'api-key': this.apiKey })
        }
      })
      
      return response.ok
    } catch (error) {
      console.error("Qdrant connection test failed:", error)
      return false
    }
  }

  // Main method to get relevant documents for a query  
  public async getRelevantDocs(query: string, options: RAGSearchOptions = {}): Promise<RAGDocument[]> {
    try {
      console.log("🔍 RAG Client: Searching for:", query)
    
      // Create embedding for the query
      const queryEmbedding = await this.createEmbedding(query)
      
      if (queryEmbedding.length === 0) {
        console.warn("Failed to create embedding, using mock data")
        return this.getMockRelevantDocs(query, options)
      }
      
      // Search vector database
      const results = await this.searchVectorDB(queryEmbedding, options)
      
      console.log(`📚 RAG Client: Found ${results.length} relevant documents`)
      return results
      
    } catch (error) {
      console.error("RAG search failed:", error)
      // Fallback to mock data
      return this.getMockRelevantDocs(query, options)
    }
  }

  // Create embedding for text using OpenAI API
  private async createEmbedding(text: string): Promise<number[]> {
    try {
      // Get OpenAI API key from storage
      const storage = await chrome.storage.local.get(['apiKey'])
      const openaiApiKey = storage.apiKey
      
      if (!openaiApiKey) {
        throw new Error("OpenAI API key not found")
      }
      
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          dimensions: 1536
        })
      })
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }
      
      const data = await response.json()
      return data.data[0].embedding
      
    } catch (error) {
      console.error("Embedding creation failed:", error)
      return []
    }
  }

  // Search vector database for relevant documents
  public async searchVectorDB(queryEmbedding: number[], options: RAGSearchOptions = {}): Promise<RAGDocument[]> {
    try {
      if (!this.isInitialized) {
        console.warn("RAG Client not initialized, using mock data")
        return this.getMockRelevantDocs("", options)
      }

      const searchPayload = {
        vector: queryEmbedding,
        limit: options.maxResults || 5,
        score_threshold: options.minRelevanceScore || 0.3,
        with_payload: true,
        with_vector: false
      }

      // Add filters if specified
      if (options.categories || options.nodeTypes) {
        searchPayload["filter"] = {
          must: []
        }
        
        if (options.categories) {
          searchPayload["filter"].must.push({
            key: "category",
            match: { any: options.categories }
          })
        }
        
        if (options.nodeTypes) {
          searchPayload["filter"].must.push({
            key: "nodeType", 
            match: { any: options.nodeTypes }
          })
        }
      }

      console.log("🔍 RAG: Searching cogiflow with payload:", searchPayload)

      const response = await fetch(`${this.vectorDbUrl}/collections/cogiflow/points/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.apiKey && {"api-key": this.apiKey}
        },
        body: JSON.stringify(searchPayload)
      })

      if (!response.ok) {
        console.error(`❌ Vector DB search failed: ${response.status}`)
        throw new Error(`Vector DB search failed: ${response.status}`)
      }

      const data = await response.json()
      console.log("📊 RAG: Qdrant response:", data)
      
      if (!data.result || data.result.length === 0) {
        console.warn("⚠️ No results from Qdrant, using mock data")
        return this.getMockRelevantDocs("", options)
      }
      
      return data.result.map((result: any) => ({
        id: result.id,
        title: result.payload.title,
        content: result.payload.content,
        url: result.payload.url,
        category: result.payload.category,
        relevanceScore: result.score,
        metadata: result.payload.metadata
      }))

    } catch (error) {
      console.error("Vector database search failed:", error)
      // Fallback to mock data
      console.log("🔄 Using mock data as fallback")
      return this.getMockRelevantDocs("", options)
    }
  }

  // Mock implementation for testing and development
  private getMockRelevantDocs(query: string, options: RAGSearchOptions = {}): RAGDocument[] {
    const mockDocs: RAGDocument[] = [
      {
        id: "doc_1",
        title: "n8n Function Node Documentation",
        content: "The Function node allows you to write custom JavaScript code to process data...",
        url: "https://docs.n8n.io/nodes/n8n-nodes-base.function/",
        category: "nodes",
        relevanceScore: 0.95,
        metadata: {
          nodeType: "function",
          tags: ["javascript", "custom-code"],
          lastUpdated: "2024-01-15"
        }
      },
      {
        id: "doc_2", 
        title: "HTTP Request Node Setup",
        content: "The HTTP Request node allows you to make HTTP requests to external APIs...",
        url: "https://docs.n8n.io/nodes/n8n-nodes-base.httpRequest/",
        category: "nodes",
        relevanceScore: 0.87,
        metadata: {
          nodeType: "http",
          tags: ["api", "requests"],
          lastUpdated: "2024-01-10"
        }
      },
      {
        id: "doc_3",
        title: "Error Handling in n8n",
        content: "Learn how to handle errors in your n8n workflows effectively...",
        url: "https://docs.n8n.io/workflows/error-handling/", 
        category: "workflow",
        relevanceScore: 0.82,
        metadata: {
          tags: ["error-handling", "debugging"],
          lastUpdated: "2024-01-08"
        }
      }
    ]

    // Filter by options
    let filteredDocs = mockDocs

    if (options.categories && options.categories.length > 0) {
      filteredDocs = filteredDocs.filter(doc => 
        options.categories!.includes(doc.category)
      )
    }

    if (options.nodeTypes && options.nodeTypes.length > 0) {
      filteredDocs = filteredDocs.filter(doc => 
        doc.metadata?.nodeType && options.nodeTypes!.includes(doc.metadata.nodeType)
      )
    }

    if (options.minRelevanceScore) {
      filteredDocs = filteredDocs.filter(doc => 
        doc.relevanceScore >= options.minRelevanceScore!
      )
    }

    const maxResults = options.maxResults || 3
    return filteredDocs.slice(0, maxResults)
  }

  // Get configuration status
  public getStatus(): {
    isInitialized: boolean
    vectorDbUrl: string
    hasApiKey: boolean
  } {
    return {
      isInitialized: this.isInitialized,
      vectorDbUrl: this.vectorDbUrl,
      hasApiKey: this.apiKey.length > 0
    }
  }

  // Update configuration
  public updateConfig(config: {
    vectorDbUrl?: string
    apiKey?: string
  }): void {
    if (config.vectorDbUrl) this.vectorDbUrl = config.vectorDbUrl
    if (config.apiKey) this.apiKey = config.apiKey
    
    // Reset initialization status when config changes
    this.isInitialized = false
  }
}

/*
 * Future RAG Integration Roadmap:
 * 
 * Phase 1: Documentation Indexing
 * - Scrape n8n official documentation
 * - Create embeddings for each documentation section
 * - Store in vector database with metadata
 * 
 * Phase 2: Smart Retrieval
 * - Implement semantic search based on user queries
 * - Add context-aware filtering (current workflow, node types)
 * - Implement result ranking and relevance scoring
 * 
 * Phase 3: Context Integration
 * - Integrate retrieved docs into OpenAI context
 * - Balance between RAG content and conversation history
 * - Implement smart context window management
 * 
 * Phase 4: Advanced Features
 * - User feedback loop for improving retrieval quality
 * - Custom knowledge base for organization-specific docs
 * - Multi-modal support (code examples, images)
 * 
 * Example vector database setup (Qdrant):
 * 1. docker run -p 6333:6333 qdrant/qdrant
 * 2. Create collection with proper vector dimensions
 * 3. Index documentation with embeddings
 * 4. Configure search parameters and filters
 */ 
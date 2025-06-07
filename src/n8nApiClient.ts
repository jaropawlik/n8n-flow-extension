// n8n API Client for fetching complete workflow data
export class N8nApiClient {
  private baseUrl: string
  private auth?: { username: string; password: string }
  private apiKey?: string

  constructor(baseUrl: string, auth?: { username: string; password: string }, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.auth = auth
    this.apiKey = apiKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyYWM5ZGFmOS02ZjAzLTQyMDQtODhkMy1jNmI2YTA0MzBkNjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5MjUxMTg3LCJleHAiOjE3NTE3NzQ0MDB9.epVRvJ15KMWx6G350bWkIQskvdJFKXgNAugBx4PaMu4' // Real API key from n8n UI
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`
    console.log(`🌐 API Client: Making request to: ${url}`)
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add API key header (n8n requires this)
    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey
      console.log(`🔑 API Client: Using API key: ${this.apiKey.substring(0, 20)}...`)
    }

    // Add basic auth if provided (fallback)
    if (this.auth) {
      const credentials = btoa(`${this.auth.username}:${this.auth.password}`)
      headers['Authorization'] = `Basic ${credentials}`
      console.log(`🔐 API Client: Using basic auth: ${this.auth.username}`)
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      })

      console.log(`📡 API Client: HTTP response status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API Client: HTTP error response:`, errorText)
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const jsonResponse = await response.json()
      console.log(`📦 API Client: JSON response received:`, jsonResponse)
      return jsonResponse
    } catch (error) {
      console.error(`💥 API Client: Request error for ${endpoint}:`, error)
      throw error
    }
  }

  // Get all workflows
  async getWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await this.request<{ data: N8nWorkflow[] }>('/workflows')
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
      return []
    }
  }

  // Get specific workflow with full details
  async getWorkflow(id: string): Promise<N8nWorkflow | null> {
    try {
      console.log(`📋 API Client: Fetching workflow with ID: ${id}`)
      const response = await this.request<N8nWorkflow>(`/workflows/${id}`)
      console.log(`📋 API Client: Workflow API response:`, response)
      
      if (response && response.id) {
        console.log(`✅ API Client: Workflow found: ${response.name} (${response.nodes?.length || 0} nodes)`)
        return response
      } else {
        console.log(`⚠️ API Client: Workflow response invalid:`, response)
        return null
      }
    } catch (error) {
      console.error(`❌ API Client: Failed to fetch workflow ${id}:`, error)
      return null
    }
  }

  // Get active workflows
  async getActiveWorkflows(): Promise<N8nActiveWorkflow[]> {
    try {
      const response = await this.request<N8nActiveWorkflow[]>('/workflows/active')
      return response || []
    } catch (error) {
      console.error('Failed to fetch active workflows:', error)
      return []
    }
  }

  // Get workflow executions
  async getExecutions(workflowId?: string, limit: number = 20): Promise<N8nExecution[]> {
    try {
      let endpoint = `/executions?limit=${limit}`
      if (workflowId) {
        endpoint += `&workflowId=${workflowId}`
      }
      
      const response = await this.request<{ data: N8nExecution[] }>(endpoint)
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch executions:', error)
      return []
    }
  }

  // Get detailed execution data with full logs and errors
  async getExecutionDetails(executionId: string): Promise<N8nExecutionDetails | null> {
    try {
      console.log(`🔍 API Client: Fetching execution details for: ${executionId}`)
      const response = await this.request<N8nExecutionDetails>(`/executions/${executionId}`)
      
      if (response) {
        console.log(`✅ API Client: Execution details loaded: ${response.id}`)
        return response
      }
      return null
    } catch (error) {
      console.error(`❌ API Client: Failed to fetch execution ${executionId}:`, error)
      return null
    }
  }

  // Get workflow with enhanced execution context
  async getEnhancedWorkflowContext(): Promise<EnhancedWorkflowContext | null> {
    try {
      const workflow = await this.getCurrentWorkflow()
      if (!workflow) return null

      // Get recent executions
      const executions = await this.getExecutions(workflow.id, 5)
      
      // Get detailed execution data for failed executions
      const executionDetails: N8nExecutionDetails[] = []
      for (const exec of executions.slice(0, 3)) {
        if (exec.status === 'error' || exec.status === 'crashed') {
          const details = await this.getExecutionDetails(exec.id)
          if (details) executionDetails.push(details)
        }
      }

      // Analyze nodes for issues
      const nodeAnalysis = this.analyzeNodes(workflow.nodes)
      
      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        isActive: workflow.active,
        
        nodes: workflow.nodes.map(node => ({
          id: node.id,
          name: node.name,
          type: node.type,
          position: node.position,
          parameters: node.parameters,
          hasError: false, // Will be enhanced with execution data
          isSelected: false,
          credentials: node.credentials,
          notes: node.notes,
          continueOnFail: node.continueOnFail,
          retryOnFail: node.retryOnFail,
          maxTries: node.maxTries
        })),
        
        connections: workflow.connections,
        
        recentExecutions: executions.map(exec => ({
          id: exec.id,
          status: exec.status,
          startedAt: exec.startedAt,
          stoppedAt: exec.stoppedAt,
          duration: exec.stoppedAt && exec.startedAt ? 
            new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime() : undefined,
          mode: exec.mode,
          finished: exec.finished
        })),

        // Enhanced execution details
        failedExecutions: executionDetails,
        
        totalNodes: workflow.nodes.length,
        activeNodes: nodeAnalysis.activeNodes,
        errorCount: nodeAnalysis.errorNodes,
        nodeTypeBreakdown: nodeAnalysis.nodeTypes,
        credentialIssues: nodeAnalysis.credentialIssues,
        
        currentUrl: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ API Client: Failed to get enhanced context:', error)
      return null
    }
  }

  // Analyze workflow nodes for potential issues
  private analyzeNodes(nodes: N8nNode[]) {
    const analysis = {
      activeNodes: 0,
      errorNodes: 0,
      nodeTypes: {} as Record<string, number>,
      credentialIssues: [] as string[]
    }

    nodes.forEach(node => {
      // Count node types
      analysis.nodeTypes[node.type] = (analysis.nodeTypes[node.type] || 0) + 1
      
      // Check for credential issues
      if (node.type.includes('Http') || node.type.includes('API') || node.type.includes('Database')) {
        if (!node.credentials || Object.keys(node.credentials).length === 0) {
          analysis.credentialIssues.push(`${node.name} (${node.type}) - Missing credentials`)
        }
      }
      
      // Check for common configuration issues
      if (node.type === 'n8n-nodes-base.httpRequest') {
        if (!node.parameters.url) {
          analysis.errorNodes++
        }
      }
      
      if (node.type === 'n8n-nodes-base.webhook') {
        analysis.activeNodes++
      }
    })

    return analysis
  }

  // Get current workflow from URL
  async getCurrentWorkflow(): Promise<N8nWorkflow | null> {
    try {
      // Try multiple URL patterns for workflow ID
      const urlPatterns = [
        /\/workflow\/([^\/\?#]+)/,    // /workflow/123
        /\/workflows\/([^\/\?#]+)/,   // /workflows/123  
        /\/editor\/([^\/\?#]+)/,      // /editor/123
        /#\/workflow\/([^\/\?#]+)/,   // #/workflow/123
        /workflowId[=:]([^&\?#]+)/    // ?workflowId=123
      ]
      
      let workflowId: string | null = null
      const currentUrl = window.location.href
      
      console.log('🔍 API Client: Checking URL for workflow ID:', currentUrl)
      
      for (const pattern of urlPatterns) {
        const match = currentUrl.match(pattern)
        if (match) {
          workflowId = match[1]
          console.log('✅ API Client: Found workflow ID:', workflowId, 'using pattern:', pattern)
          break
        }
      }
      
      if (!workflowId) {
        console.log('⚠️ API Client: No workflow ID found in URL')
        return null
      }

      return await this.getWorkflow(workflowId)
    } catch (error) {
      console.error('❌ API Client: Failed to get current workflow:', error)
      return null
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/workflows?limit=1')
      return true
    } catch (error) {
      console.error('API connection test failed:', error)
      return false
    }
  }

  // ==================== USER MANAGEMENT ====================

  // Get all users
  async getUsers(): Promise<N8nUser[]> {
    try {
      const response = await this.request<{ data: N8nUser[] }>('/users')
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch users:', error)
      return []
    }
  }

  // Get current user info
  async getCurrentUser(): Promise<N8nUser | null> {
    try {
      return await this.request<N8nUser>('/users/me')
    } catch (error) {
      console.error('Failed to fetch current user:', error)
      return null
    }
  }

  // ==================== CREDENTIALS MANAGEMENT ====================

  // Get all credentials
  async getCredentials(): Promise<N8nCredential[]> {
    try {
      const response = await this.request<{ data: N8nCredential[] }>('/credentials')
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch credentials:', error)
      return []
    }
  }

  // Get credential schema for a type
  async getCredentialSchema(credentialType: string): Promise<any> {
    try {
      return await this.request(`/credentials/schema/${credentialType}`)
    } catch (error) {
      console.error(`Failed to fetch credential schema for ${credentialType}:`, error)
      return null
    }
  }

  // Create new credential
  async createCredential(data: { name: string, type: string, data: any }): Promise<N8nCredential | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.apiKey || ''
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to create credential:', error)
      return null
    }
  }

  // ==================== AUDIT & SECURITY ====================

  // Generate security audit
  async generateAudit(options?: {
    categories?: string[]
    daysAbandonedWorkflow?: number
  }): Promise<N8nAuditResult | null> {
    try {
      const params = new URLSearchParams()
      if (options?.categories) {
        options.categories.forEach(cat => params.append('categories', cat))
      }
      if (options?.daysAbandonedWorkflow) {
        params.append('daysAbandonedWorkflow', options.daysAbandonedWorkflow.toString())
      }

      const endpoint = `/audit${params.toString() ? '?' + params.toString() : ''}`
      
      const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.apiKey || ''
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to generate audit:', error)
      return null
    }
  }

  // ==================== WEBHOOKS & BINARY DATA ====================

  // Get webhook details for workflow
  async getWebhooks(workflowId?: string): Promise<N8nWebhook[]> {
    try {
      const endpoint = workflowId ? `/webhooks?workflowId=${workflowId}` : '/webhooks'
      const response = await this.request<{ data: N8nWebhook[] }>(endpoint)
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
      return []
    }
  }

  // ==================== MONITORING & METRICS ====================

  // Get system health status
  async getHealthStatus(): Promise<N8nHealthStatus | null> {
    try {
      return await this.request<N8nHealthStatus>('/health')
    } catch (error) {
      console.error('Failed to fetch health status:', error)
      return null
    }
  }

  // Get execution metrics
  async getExecutionMetrics(period: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<N8nMetrics | null> {
    try {
      return await this.request<N8nMetrics>(`/metrics/executions?period=${period}`)
    } catch (error) {
      console.error('Failed to fetch execution metrics:', error)
      return null
    }
  }

  // ==================== ADVANCED WORKFLOW OPERATIONS ====================

  // Get workflow tags
  async getWorkflowTags(): Promise<N8nTag[]> {
    try {
      const response = await this.request<{ data: N8nTag[] }>('/tags')
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch workflow tags:', error)
      return []
    }
  }

  // Get workflow history/versions
  async getWorkflowHistory(workflowId: string): Promise<N8nWorkflowVersion[]> {
    try {
      const response = await this.request<{ data: N8nWorkflowVersion[] }>(`/workflows/${workflowId}/history`)
      return response.data || []
    } catch (error) {
      console.error(`Failed to fetch workflow history for ${workflowId}:`, error)
      return []
    }
  }

  // Activate/Deactivate workflow
  async toggleWorkflowActivation(workflowId: string, activate: boolean): Promise<boolean> {
    try {
      const endpoint = activate ? `/workflows/${workflowId}/activate` : `/workflows/${workflowId}/deactivate`
      
      const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.apiKey || ''
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      return true
    } catch (error) {
      console.error(`Failed to ${activate ? 'activate' : 'deactivate'} workflow ${workflowId}:`, error)
      return false
    }
  }

  // ==================== COMPREHENSIVE WORKFLOW ANALYSIS ====================

  // Get complete workflow ecosystem data
  async getWorkflowEcosystem(workflowId: string): Promise<N8nWorkflowEcosystem | null> {
    try {
      console.log(`🔍 API Client: Getting complete ecosystem for workflow ${workflowId}`)
      
      // Parallel fetch all related data
      const [
        workflow,
        executions,
        webhooks,
        credentials,
        tags,
        history,
        healthStatus
      ] = await Promise.all([
        this.getWorkflow(workflowId),
        this.getExecutions(workflowId, 10),
        this.getWebhooks(workflowId),
        this.getCredentials(),
        this.getWorkflowTags(),
        this.getWorkflowHistory(workflowId),
        this.getHealthStatus()
      ])

      if (!workflow) return null

      // Enhanced analysis
      const nodeAnalysis = this.analyzeNodes(workflow.nodes)
      const usedCredentials = this.findUsedCredentials(workflow.nodes, credentials)
      const performanceMetrics = this.analyzePerformance(executions)

      return {
        workflow,
        executions,
        webhooks: webhooks || [],
        credentials: usedCredentials,
        tags: tags || [],
        history: history || [],
        healthStatus,
        analysis: {
          ...nodeAnalysis,
          performanceMetrics,
          securityIssues: this.analyzeSecurityIssues(workflow, usedCredentials),
          recommendations: this.generateRecommendations(workflow, executions, nodeAnalysis)
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error(`❌ API Client: Failed to get workflow ecosystem for ${workflowId}:`, error)
      return null
    }
  }

  // Find credentials used by workflow
  private findUsedCredentials(nodes: N8nNode[], allCredentials: N8nCredential[]): N8nCredential[] {
    const usedCredentialIds = new Set<string>()
    nodes.forEach(node => {
      if (node.credentials) {
        Object.values(node.credentials).forEach(credId => {
          if (typeof credId === 'string') usedCredentialIds.add(credId)
        })
      }
    })
    
    return allCredentials.filter(cred => usedCredentialIds.has(cred.id))
  }

  // Analyze workflow performance
  private analyzePerformance(executions: N8nExecution[]): N8nPerformanceMetrics {
    const successfulExecutions = executions.filter(exec => exec.status === 'success')
    const failedExecutions = executions.filter(exec => exec.status === 'error')
    
    const durations = successfulExecutions
      .filter(exec => exec.stoppedAt && exec.startedAt)
      .map(exec => new Date(exec.stoppedAt!).getTime() - new Date(exec.startedAt).getTime())

    return {
      successRate: executions.length > 0 ? (successfulExecutions.length / executions.length) * 100 : 0,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      totalExecutions: executions.length,
      recentFailures: failedExecutions.length,
      lastExecution: executions[0]?.startedAt || null
    }
  }

  // Analyze security issues
  private analyzeSecurityIssues(workflow: N8nWorkflow, credentials: N8nCredential[]): string[] {
    const issues: string[] = []
    
    // Check for missing credentials
    workflow.nodes.forEach(node => {
      if (node.type.includes('Http') && (!node.credentials || Object.keys(node.credentials).length === 0)) {
        issues.push(`Node "${node.name}" may expose sensitive data without proper authentication`)
      }
    })

    // Check for hardcoded secrets in parameters
    workflow.nodes.forEach(node => {
      const paramStr = JSON.stringify(node.parameters || {})
      if (paramStr.includes('password') || paramStr.includes('token') || paramStr.includes('key')) {
        issues.push(`Node "${node.name}" may contain hardcoded secrets in parameters`)
      }
    })

    return issues
  }

  // Generate recommendations
  private generateRecommendations(workflow: N8nWorkflow, executions: N8nExecution[], analysis: any): string[] {
    const recommendations: string[] = []

    // Performance recommendations
    if (analysis.errorNodes > 0) {
      recommendations.push(`Fix ${analysis.errorNodes} nodes with configuration errors`)
    }

    if (executions.length > 0) {
      const errorRate = executions.filter(e => e.status === 'error').length / executions.length
      if (errorRate > 0.2) {
        recommendations.push('High error rate detected - review node configurations and add error handling')
      }
    }

    // Efficiency recommendations
    if (workflow.nodes.length > 20) {
      recommendations.push('Consider breaking this large workflow into smaller sub-workflows')
    }

    if (analysis.credentialIssues.length > 0) {
      recommendations.push('Set up proper credentials for enhanced security and reliability')
    }

    return recommendations
  }
}

// Type definitions for n8n API responses
export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  nodes: N8nNode[]
  connections: N8nConnections
  settings?: Record<string, any>
  staticData?: Record<string, any>
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface N8nNode {
  id: string
  name: string
  type: string
  typeVersion: number
  position: [number, number]
  parameters: Record<string, any>
  credentials?: Record<string, string>
  webhookId?: string
  continueOnFail?: boolean
  alwaysOutputData?: boolean
  executeOnce?: boolean
  retryOnFail?: boolean
  maxTries?: number
  waitBetweenTries?: number
  notes?: string
  color?: string
}

export interface N8nConnections {
  [sourceNodeName: string]: {
    [sourceOutputIndex: string]: Array<{
      node: string
      type: string
      index: number
    }>
  }
}

export interface N8nActiveWorkflow {
  id: string
  active: boolean
}

export interface N8nExecution {
  id: string
  workflowId: string
  mode: string
  startedAt: string
  stoppedAt?: string
  finished: boolean
  retryOf?: string
  retrySuccessId?: string
  status: 'new' | 'running' | 'success' | 'error' | 'canceled' | 'crashed' | 'waiting'
  data?: {
    executionData?: any
    resultData?: any
  }
}

// Detailed execution with full logs and error data
export interface N8nExecutionDetails extends N8nExecution {
  data: {
    executionData: {
      contextData: Record<string, any>
      nodeExecutionStack: Array<{
        node: {
          name: string
          type: string
        }
        data: {
          main: Array<Array<{
            json: Record<string, any>
            binary?: Record<string, any>
          }>>
        }
      }>
      metadata: Record<string, any>
      waitingExecution: Record<string, any>
    }
    resultData: {
      runData: Record<string, {
        startTime: number
        executionTime: number
        source: Array<{
          previousNode: string
        }>
        data: {
          main: Array<Array<{
            json: Record<string, any>
            error?: {
              name: string
              message: string
              stack?: string
              description?: string
            }
          }>>
        }
      }>
      error?: {
        name: string
        message: string
        stack?: string
        node?: {
          name: string
          type: string
        }
      }
      lastNodeExecuted?: string
    }
  }
}

// Enhanced workflow context with API data
export interface EnhancedWorkflowContext {
  // Basic info
  workflowId: string | null
  workflowName: string
  isActive: boolean
  
  // Complete structure
  nodes: Array<{
    id: string
    name: string
    type: string
    position: [number, number]
    parameters: Record<string, any>
    hasError?: boolean
    isSelected?: boolean
    credentials?: Record<string, string>
    notes?: string
    continueOnFail?: boolean
    retryOnFail?: boolean
    maxTries?: number
  }>
  
  connections: N8nConnections
  
  // Recent executions
  recentExecutions: Array<{
    id: string
    status: string
    startedAt: string
    stoppedAt?: string
    duration?: number
    mode?: string
    finished?: boolean
  }>
  
  // Enhanced execution details
  failedExecutions?: N8nExecutionDetails[]
  
  // Statistics
  totalNodes: number
  activeNodes: number
  errorCount: number
  nodeTypeBreakdown?: Record<string, number>
  credentialIssues?: string[]
  
  // Page context
  currentUrl: string
  timestamp: string
}

// ==================== EXTENDED n8n API TYPES ====================

// User management types
export interface N8nUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  isDefaultUser?: boolean
  isPending?: boolean
  createdAt: string
  updatedAt: string
}

// Credentials management types
export interface N8nCredential {
  id: string
  name: string
  type: string
  nodesAccess: Array<{ nodeType: string }>
  sharedWith?: Array<{
    id: string
    email: string
    role: string
  }>
  createdAt: string
  updatedAt: string
}

// Audit and security types
export interface N8nAuditResult {
  risk: 'low' | 'medium' | 'high'
  issues: Array<{
    category: 'credentials' | 'database' | 'filesystem' | 'instance' | 'nodes'
    severity: 'low' | 'medium' | 'high'
    title: string
    description: string
    recommendation: string
  }>
  summary: {
    total: number
    high: number
    medium: number
    low: number
  }
  generatedAt: string
}

// Webhook types
export interface N8nWebhook {
  id: string
  workflowId: string
  node: string
  method: string
  path: string
  isFullPath: boolean
  responseMode: string
  lastCalledAt?: string
  callCount: number
}

// System health and monitoring types
export interface N8nHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  database: {
    status: 'healthy' | 'unhealthy'
    latency?: number
  }
  redis?: {
    status: 'healthy' | 'unhealthy'
    latency?: number
  }
  diskSpace: {
    status: 'healthy' | 'warning' | 'critical'
    available: number
    total: number
  }
  uptime: number
  version: string
}

// Metrics types
export interface N8nMetrics {
  period: string
  executions: {
    total: number
    success: number
    error: number
    waiting: number
    running: number
  }
  workflows: {
    active: number
    total: number
  }
  avgExecutionTime: number
  peakExecutionTime: number
}

// Tags and workflow organization
export interface N8nTag {
  id: string
  name: string
  color?: string
  createdAt: string
  updatedAt: string
}

// Workflow versioning and history
export interface N8nWorkflowVersion {
  id: string
  workflowId: string
  versionId: string
  restoreUrl: string
  createdAt: string
  authors: string[]
}

// Performance metrics
export interface N8nPerformanceMetrics {
  successRate: number
  averageDuration: number
  totalExecutions: number
  recentFailures: number
  lastExecution: string | null
}

// Complete workflow ecosystem
export interface N8nWorkflowEcosystem {
  workflow: N8nWorkflow
  executions: N8nExecution[]
  webhooks: N8nWebhook[]
  credentials: N8nCredential[]
  tags: N8nTag[]
  history: N8nWorkflowVersion[]
  healthStatus: N8nHealthStatus | null
  analysis: {
    activeNodes: number
    errorNodes: number
    nodeTypes: Record<string, number>
    credentialIssues: string[]
    performanceMetrics: N8nPerformanceMetrics
    securityIssues: string[]
    recommendations: string[]
  }
  timestamp: string
} 
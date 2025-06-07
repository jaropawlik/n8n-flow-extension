export interface N8nNode {
  id: string
  name: string
  type: string
  position: { x: number; y: number }
  hasError: boolean
  isSelected: boolean
  element: Element
  parameters?: any
}

export interface N8nWorkflow {
  nodes: N8nNode[]
  errors: N8nNode[]
  connections: any[]
  metadata: {
    totalNodes: number
    errorCount: number
    url: string
    timestamp: number
  }
}

export class DOMParser {
  private static readonly NODE_SELECTORS = {
    // n8n node selectors - adjust based on actual n8n DOM structure
    node: '[data-test-id*="node"], .node-box, [data-name]',
    nodeError: '.error, .has-error, [data-test-id*="error"]',
    nodeSelected: '.selected, .is-selected',
    nodeName: '[data-test-id="node-title"], .node-name, .node-title',
    nodeType: '[data-test-id="node-type"], .node-type'
  }

  // Main function to parse current n8n workflow
  public static parseWorkflow(): N8nWorkflow {
    const nodes = this.parseNodes()
    const errors = nodes.filter(node => node.hasError)
    
    return {
      nodes,
      errors,
      connections: this.parseConnections(),
      metadata: {
        totalNodes: nodes.length,
        errorCount: errors.length,
        url: window.location.href,
        timestamp: Date.now()
      }
    }
  }

  // Parse all nodes in the workflow
  private static parseNodes(): N8nNode[] {
    const nodeElements = document.querySelectorAll(this.NODE_SELECTORS.node)
    const nodes: N8nNode[] = []

    nodeElements.forEach((element, index) => {
      try {
        const node = this.parseNode(element, index)
        if (node) {
          nodes.push(node)
        }
      } catch (error) {
        console.warn(`Failed to parse node at index ${index}:`, error)
      }
    })

    return nodes
  }

  // Parse individual node
  private static parseNode(element: Element, fallbackId: number): N8nNode | null {
    try {
      const id = this.getNodeId(element, fallbackId)
      const name = this.getNodeName(element)
      const type = this.getNodeType(element)
      const position = this.getNodePosition(element)
      const hasError = this.hasNodeError(element)
      const isSelected = this.isNodeSelected(element)

      return {
        id,
        name,
        type,
        position,
        hasError,
        isSelected,
        element,
        parameters: this.getNodeParameters(element)
      }
    } catch (error) {
      console.warn('Failed to parse node:', error)
      return null
    }
  }

  // Get node ID from various possible attributes
  private static getNodeId(element: Element, fallbackId: number): string {
    // Try various attributes that might contain the ID
    const possibleIds = [
      element.getAttribute('data-id'),
      element.getAttribute('data-node-id'),
      element.getAttribute('id'),
      element.getAttribute('data-name')
    ]

    for (const id of possibleIds) {
      if (id && id.trim()) {
        return id.trim()
      }
    }

    return `node_${fallbackId}`
  }

  // Extract node name/title
  private static getNodeName(element: Element): string {
    const nameElement = element.querySelector(this.NODE_SELECTORS.nodeName)
    if (nameElement?.textContent) {
      return nameElement.textContent.trim()
    }

    // Fallback to various attributes
    return element.getAttribute('data-name') || 
           element.getAttribute('title') || 
           'Unknown Node'
  }

  // Extract node type
  private static getNodeType(element: Element): string {
    const typeElement = element.querySelector(this.NODE_SELECTORS.nodeType)
    if (typeElement?.textContent) {
      return typeElement.textContent.trim()
    }

    return element.getAttribute('data-type') || 
           element.classList.toString() || 
           'Unknown Type'
  }

  // Get node position on canvas
  private static getNodePosition(element: Element): { x: number; y: number } {
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)
    
    // Try to get transform values first
    const transform = style.transform
    if (transform && transform !== 'none') {
      const matrix = transform.match(/matrix\((.+)\)/)
      if (matrix) {
        const values = matrix[1].split(', ')
        return {
          x: parseFloat(values[4]) || rect.left,
          y: parseFloat(values[5]) || rect.top
        }
      }
    }

    return {
      x: rect.left,
      y: rect.top
    }
  }

  // Check if node has error
  private static hasNodeError(element: Element): boolean {
    return element.querySelector(this.NODE_SELECTORS.nodeError) !== null ||
           element.classList.contains('error') ||
           element.classList.contains('has-error')
  }

  // Check if node is selected
  private static isNodeSelected(element: Element): boolean {
    return element.querySelector(this.NODE_SELECTORS.nodeSelected) !== null ||
           element.classList.contains('selected') ||
           element.classList.contains('is-selected')
  }

  // Extract node parameters/configuration (basic attempt)
  private static getNodeParameters(element: Element): any {
    try {
      // This is a best-effort attempt to extract parameters
      // Actual implementation depends on n8n's internal structure
      const configElement = element.querySelector('[data-test-id*="parameter"], .node-parameters')
      if (configElement) {
        return {
          hasParameters: true,
          element: configElement.outerHTML.slice(0, 200) // Truncated for safety
        }
      }
      return { hasParameters: false }
    } catch (error) {
      return { hasParameters: false, error: error.message }
    }
  }

  // Parse connections between nodes (basic implementation)
  private static parseConnections(): any[] {
    try {
      // Look for connection elements in n8n
      const connections = document.querySelectorAll('.connection, [data-test-id*="connection"], .edge')
      return Array.from(connections).map((conn, index) => ({
        id: `connection_${index}`,
        element: conn.tagName,
        classes: conn.classList.toString()
      }))
    } catch (error) {
      console.warn('Failed to parse connections:', error)
      return []
    }
  }

  // Get currently selected node
  public static getSelectedNode(): N8nNode | null {
    const selectedElement = document.querySelector(this.NODE_SELECTORS.nodeSelected)
    if (!selectedElement) return null

    return this.parseNode(selectedElement, 0)
  }

  // Get node by position (for context menu)
  public static getNodeAtPosition(x: number, y: number): N8nNode | null {
    const element = document.elementFromPoint(x, y)
    if (!element) return null

    // Find the closest node element
    const nodeElement = element.closest(this.NODE_SELECTORS.node)
    if (!nodeElement) return null

    return this.parseNode(nodeElement, 0)
  }

  // Get workflow summary for AI context
  public static getWorkflowSummary(): string {
    const workflow = this.parseWorkflow()
    
    const summary = `
N8N Workflow Analysis:
- Total Nodes: ${workflow.metadata.totalNodes}
- Nodes with Errors: ${workflow.metadata.errorCount}
- URL: ${workflow.metadata.url}

Nodes:
${workflow.nodes.map(node => 
  `- ${node.name} (${node.type})${node.hasError ? ' [ERROR]' : ''}${node.isSelected ? ' [SELECTED]' : ''}`
).join('\n')}

${workflow.errors.length > 0 ? `
Errors Found:
${workflow.errors.map(node => `- ${node.name}: Error detected`).join('\n')}
` : ''}
    `.trim()

    return summary
  }
} 
# n8n Flow - AI-Powered Workflow Assistant

Chrome extension for n8n workflows with OpenAI integration.

## Features
- Chat widget with AI assistant
- Context menu actions for nodes
- OpenAI GPT-4o integration
- Conversation memory
- Workflow analysis

## Installation
1. `npm install`
2. `npm run dev`
3. Load extension in Chrome

## Usage
1. Open n8n editor
2. Click chat button (💬)
3. Ask questions about workflow
4. Right-click nodes for AI actions

## Structure
- `popup.tsx` - Settings popup
- `content.tsx` - Chat widget
- `background.ts` - Service worker
- `storage.ts` - Storage utilities
- `openaiClient.ts` - OpenAI integration
- `domParser.ts` - Workflow parsing
- `ragClient.ts` - RAG stub (future)

## Development
```bash
npm run dev      # Development
npm run build    # Production build
npm run package  # Create package
```

## Configuration

### Supported URLs
- `http://localhost:5678/*` (local n8n instance)
- `https://app.n8n.cloud/*` (n8n cloud)

### Storage Keys
- `OPENAI_API_KEY` - Your OpenAI API key
- `CONVERSATION_HISTORY` - Last 10 chat interactions

## Development

### Build Commands
```bash
npm run dev      # Development build with hot reload
npm run build    # Production build
npm run package  # Create extension package
```

### Architecture
- **Plasmo Framework** - Modern Chrome extension development
- **React.js** - UI components and state management
- **TypeScript** - Type safety and better development experience
- **Chrome APIs** - Storage, tabs, context menus, runtime messaging

### Key Components

#### OpenAI Client (`openaiClient.ts`)
- Handles all OpenAI API communication
- Implements request debouncing
- Manages context building and response processing
- Specialized methods for different use cases

#### DOM Parser (`domParser.ts`)
- Extracts n8n workflow information
- Detects nodes, errors, and connections
- Provides workflow summaries for AI context

#### Memory Buffer (`memoryBuffer.ts`)
- Manages conversation history
- Implements LRU-style memory management
- Formats history for AI context inclusion

## RAG Integration Roadmap

### Phase 1: Documentation Indexing
- [ ] Scrape n8n official documentation
- [ ] Create embeddings using OpenAI embeddings API
- [ ] Set up vector database (Qdrant recommended)
- [ ] Index documentation with metadata

### Phase 2: Smart Retrieval
- [ ] Implement semantic search functionality
- [ ] Add context-aware filtering
- [ ] Implement relevance scoring

### Phase 3: Integration
- [ ] Integrate retrieved docs into OpenAI context
- [ ] Balance RAG content with conversation history
- [ ] Implement context window management

### Phase 4: Advanced Features
- [ ] User feedback loop for quality improvement
- [ ] Custom knowledge base support
- [ ] Multi-modal content support

## RAG Setup Guide (Future)

### Qdrant Setup
```bash
# Run Qdrant locally
docker run -p 6333:6333 qdrant/qdrant

# Create collection for n8n docs
curl -X PUT 'http://localhost:6333/collections/n8n-docs' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    }
  }'
```

### Embedding Creation
```javascript
// Example embedding creation for documentation
const response = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'text-embedding-ada-002',
    input: documentText
  })
})
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Add comments for complex logic
- Test on both localhost and n8n cloud
- Ensure responsive UI design
- Handle errors gracefully

## Troubleshooting

### Common Issues

**Extension not loading:**
- Check if running on supported URLs
- Verify manifest.json is valid
- Check Chrome DevTools console for errors

**API calls failing:**
- Verify OpenAI API key is correct
- Check network connectivity
- Review background script console logs

**Chat widget not appearing:**
- Ensure content script is injected
- Check for CSS conflicts
- Verify DOM is fully loaded

### Debug Mode
Enable debug logging by opening Chrome DevTools and checking:
- Extension popup console
- Content script console  
- Background script console

## License

MIT License - see LICENSE file for details

## Roadmap

### Short Term (v1.0)
- [x] Basic chat widget
- [x] OpenAI integration
- [x] Context menu actions
- [x] Conversation memory
- [ ] Enhanced UI/UX
- [ ] Better error handling

### Medium Term (v1.5)
- [ ] RAG integration
- [ ] Custom prompts
- [ ] Workflow templates
- [ ] Export conversations

### Long Term (v2.0)
- [ ] Multi-language support
- [ ] Voice interactions
- [ ] Advanced workflow analysis
- [ ] Team collaboration features

---

**Built with ❤️ for the n8n community** 
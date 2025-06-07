# n8n Flow Extension - Mac Development Setup

## 🚀 Quick Start

### Prerequisites
1. **Node.js** (LTS version recommended)
   ```bash
   # Check if installed
   node --version
   
   # Install via Homebrew (recommended)
   brew install node
   
   # Or download from: https://nodejs.org/
   ```

2. **Yarn** (package manager)
   ```bash
   npm install -g yarn
   ```

### Setup Steps

1. **Clone/Copy the project** to your Mac

2. **Run the setup script**:
   ```bash
   chmod +x setup-mac.sh
   ./setup-mac.sh
   ```

   Or manually:
   ```bash
   yarn install
   yarn build
   ```

3. **Load extension in Chrome**:
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-prod` folder

4. **Test on your n8n server**:
   - Go to https://automation.zufto.pl/
   - Look for purple chat button in bottom-right corner

## 🔧 Development Commands

```bash
# Development mode with hot reload
yarn dev

# Build for production
yarn build

# Package extension
yarn package
```

## 🌐 Supported URLs

The extension works on:
- `http://localhost:5678/*` (local n8n)
- `https://app.n8n.cloud/*` (n8n cloud)
- `https://automation.zufto.pl/*` (your server)

## 🐛 Troubleshooting

### Extension doesn't appear on your domain
1. Check Chrome DevTools Console for errors
2. Verify the domain in `content.ts` matches exactly
3. Reload the extension after changes

### API errors
1. Check that `config.local.json` contains your OpenAI API key
2. Look at background script logs in Chrome DevTools

### Build errors on Mac
```bash
# Clear cache and reinstall
rm -rf node_modules yarn.lock
yarn install
yarn build
```

## 📝 Making Changes

1. **Edit source files** (content.ts, background.ts, etc.)
2. **Rebuild**: `yarn build`
3. **Reload extension** in Chrome extensions page
4. **Test** on https://automation.zufto.pl/

## 🔑 API Key Setup

The extension auto-loads the API key from `config.local.json`:
```json
{
  "OPENAI_API_KEY": "your-key-here"
}
```

This file is automatically excluded from Git for security. 
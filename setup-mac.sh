#!/bin/bash

echo "🚀 Setting up n8n Flow extension development on Mac..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js from: https://nodejs.org/"
    echo "Or use Homebrew: brew install node"
    exit 1
fi

# Check if Yarn is installed
if ! command -v yarn &> /dev/null; then
    echo "📦 Installing Yarn..."
    npm install -g yarn
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ Yarn version: $(yarn --version)"

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Build extension
echo "🔨 Building extension..."
yarn build

# Check if build was successful
if [ -d "build/chrome-mv3-prod" ]; then
    echo "✅ Extension built successfully!"
    echo ""
    echo "🎉 Setup complete! Next steps:"
    echo "1. Open Chrome and go to chrome://extensions/"
    echo "2. Enable 'Developer mode'"
    echo "3. Click 'Load unpacked' and select: $(pwd)/build/chrome-mv3-prod"
    echo "4. Go to https://automation.zufto.pl/ and look for the purple chat button!"
    echo ""
    echo "🔧 Development commands:"
    echo "  yarn dev    - Start development mode with hot reload"
    echo "  yarn build  - Build for production"
else
    echo "❌ Build failed. Check the errors above."
    exit 1
fi 
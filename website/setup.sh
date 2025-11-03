#!/bin/bash

echo "🚀 Setting up Day Flow Website..."
echo ""

# Check if parent package is built
if [ ! -d "../dist" ]; then
  echo "📦 Building parent package first..."
  cd ..
  npm install
  npm run build
  cd website
  echo "✅ Parent package built successfully"
  echo ""
fi

# Install website dependencies
echo "📥 Installing website dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "The website will be available at http://localhost:3000"

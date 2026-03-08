#!/bin/bash

# Dhisum Tseyig Build Script
# This script builds the Electron application for Windows

echo "=========================================="
echo "Building Dhisum Tseyig"
echo "=========================================="

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist dist-electron release

# Install dependencies if needed
echo "Installing dependencies..."
npm install

# Build React app
echo "Building React application..."
npm run build

# Compile Electron files
echo "Compiling Electron files..."
npx tsc electron/main.ts electron/preload.ts --outDir dist-electron --module commonjs --esModuleInterop --target es2020 --resolveJsonModule

# Build for Windows
echo "Building Windows installer..."
npx electron-builder --win

echo "=========================================="
echo "Build complete!"
echo "Installer location: release/Dhisum Tseyig Setup.exe"
echo "Portable location: release/DhisumTseyig-Portable.exe"
echo "=========================================="

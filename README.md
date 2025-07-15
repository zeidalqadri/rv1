# rv1 - Vector Optimization Studio

Advanced raster-to-vector conversion engine with hole detection and LAB color accuracy.

[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-orange?style=for-the-badge&logo=cloudflare)](https://rv1.pages.dev)

## Overview

rv1 is a sophisticated vector optimization studio that provides:

- **Advanced Raster-to-Vector Conversion**: High-quality conversion with hole detection
- **LAB Color Space Accuracy**: 100% accurate color representation
- **Multiple Optimization Presets**: Color Perfect, Default, High Quality, and Fast modes
- **Interactive Interface**: Real-time parameter adjustment and preview
- **Export Capabilities**: SVG generation with customizable settings

## Features

### 🎯 Color Perfect Mode (Recommended)
- Logo-optimized with hole detection
- 16 colors at 2x scale
- Ideal for brand assets and logos

### ⚖️ Balanced Processing
- Default quality/performance balance
- 16 colors at 1x scale
- General-purpose vectorization

### 🔍 High Quality Mode
- Maximum detail with cubic Bézier curves
- 32 colors at 2x scale
- Perfect for detailed illustrations

### ⚡ Fast Mode
- Quick processing for previews
- 8 colors at 1x scale
- Rapid prototyping and testing

## Technology Stack

- **Framework**: Next.js 14.2.16 with App Router
- **UI Components**: Radix UI + Tailwind CSS
- **Deployment**: Cloudflare Pages
- **Backend**: Cloudflare Workers API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/zeidalqadri/rv1.git
cd rv1

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
# Build static export
npm run build

# The build output will be in the 'out' directory
```

## Deployment

This project is configured for deployment on Cloudflare Pages with automatic builds from the main branch.

### Environment Variables

- `RASTERVECTOR_API_URL`: Backend API endpoint (defaults to production worker)

## API Integration

The frontend integrates with the RasterVector API for processing:

```bash
python3 imagetracer.py input.png output.svg --preset color_perfect
```

## Project Structure

```
rv1/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ui/             # Shadcn/ui components
│   └── color-picker.tsx # Custom components
├── hooks/              # React hooks
├── lib/                # Utility functions
├── public/             # Static assets
├── styles/             # Global styles
└── next.config.mjs     # Next.js configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Copyright © 2025 Zeid Al-Qadri. All rights reserved.

---

**Live Demo**: [https://rv1.pages.dev](https://rv1.pages.dev)
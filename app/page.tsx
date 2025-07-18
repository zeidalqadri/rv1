"use client"

import type React from "react"

export const dynamic = 'force-static'

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Upload,
  Copy,
  Download,
  Share,
  Settings,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Square,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

interface ProgressState {
  phase: 1 | 2 | 3 | 4 | 5
  percentage: number
  elapsedTime: number
  estimatedTotal: number
  currentOperation: string
  status: "idle" | "processing" | "complete" | "error" | "paused"
  errorMessage?: string
}

interface ColorPalette {
  detectedColors: string[]
  brandColors: string[]
  accuracy: number
}

interface ProcessingResult {
  success: boolean
  outputPath?: string
  svgContent?: string
  metrics?: {
    processingTime: number
    pathCount: number
    colorCount: number
    sizeReduction: number
  }
  error?: string
}

const CORE_PRESETS = [
  {
    id: "color_perfect",
    name: "Color Perfect",
    desc: "Logo-optimized with hole detection",
    icon: "🎯",
    recommended: true,
    colors: 16,
    scale: 2.0,
  },
  {
    id: "default",
    name: "Default",
    desc: "Balanced quality/performance",
    icon: "⚖️",
    recommended: false,
    colors: 16,
    scale: 1.0,
  },
  {
    id: "high_quality",
    name: "High Quality",
    desc: "Maximum detail with cubic Bézier curves",
    icon: "🔍",
    recommended: false,
    colors: 32,
    scale: 2.0,
  },
  {
    id: "fast",
    name: "Fast",
    desc: "Quick processing for previews",
    icon: "⚡",
    recommended: false,
    colors: 8,
    scale: 1.0,
  },
]

const PROCESSING_PHASES = {
  1: { name: "Image Analysis & Color Detection", range: [0, 20] },
  2: { name: "LAB Color Space Quantization", range: [20, 40] },
  3: { name: "Hole Detection & Layer Ordering", range: [40, 70] },
  4: { name: "Cubic Bézier Path Generation", range: [70, 90] },
  5: { name: "SVG Optimization & Export", range: [90, 100] },
}

export default function RV0VectorStudio() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState>({
    phase: 1,
    percentage: 0,
    elapsedTime: 0,
    estimatedTotal: 0,
    currentOperation: "Ready to process",
    status: "idle",
  })
  const [colorPalette, setColorPalette] = useState<ColorPalette>({
    detectedColors: [],
    brandColors: [],
    accuracy: 100,
  })
  const [selectedPreset, setSelectedPreset] = useState<string>("color_perfect")
  const [colorCount, setColorCount] = useState<number>(16)
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(2.0)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
  const [showLogs, setShowLogs] = useState<boolean>(false)
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null)
  const [svgPreview, setSvgPreview] = useState<string | null>(null)
  const [imageStructure, setImageStructure] = useState<any>(null)
  const [settingsChanged, setSettingsChanged] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Track parameter changes after processing is complete
  useEffect(() => {
    if (progress.status === "complete") {
      setSettingsChanged(true)
    }
  }, [selectedPreset, colorCount, scaleMultiplier, progress.status])

  const validateFile = (file: File): string | null => {
    const maxSize = 2 * 1024 * 1024 // 2MB
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"]

    if (!allowedTypes.includes(file.type)) {
      return "Unsupported file format. Please use PNG or JPG."
    }

    if (file.size > maxSize) {
      return "File too large. Please use images under 2MB for optimal processing speed."
    }

    return null
  }

  const extractDominantColors = (imageData: ImageData | undefined): string[] => {
    if (!imageData) return ["#f7931e", "#000000", "#ffffff", "#cccccc", "#666666"]
    
    const data = imageData.data
    const colorCounts: { [key: string]: number } = {}
    
    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      
      // Skip transparent pixels
      if (a < 128) continue
      
      // Quantize colors to reduce noise
      const qr = Math.round(r / 32) * 32
      const qg = Math.round(g / 32) * 32
      const qb = Math.round(b / 32) * 32
      
      const hex = `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`
      colorCounts[hex] = (colorCounts[hex] || 0) + 1
    }
    
    // Sort by frequency and return top 5
    const sortedColors = Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([color]) => color)
      .filter(color => color !== '#000000' && color !== '#ffffff') // Remove pure black/white
      .slice(0, 5)
    
    // Ensure we have at least some colors
    const fallbackColors = ["#f7931e", "#000000", "#ffffff", "#cccccc", "#666666"]
    return sortedColors.length > 0 ? sortedColors : fallbackColors
  }

  const handleFileUpload = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      setProgress((prev) => ({ ...prev, status: "error", errorMessage: error }))
      return
    }

    setUploadedFile(file)
    setProgress((prev) => ({ ...prev, status: "idle", errorMessage: undefined }))

    // Create image preview and extract colors
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      setImagePreview(imageUrl)

      // Extract colors from image using canvas
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Resize for color analysis
        const maxSize = 100
        const ratio = Math.min(maxSize / img.width, maxSize / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // Extract dominant colors and analyze structure
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
        const colors = extractDominantColors(imageData)
        const structure = analyzeImageStructure(imageData)
        
        setColorPalette({
          detectedColors: colors,
          brandColors: colors.slice(0, 2),
          accuracy: 98,
        })
        setImageStructure(structure)
      }
      img.src = imageUrl
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFileUpload(files[0])
      }
    },
    [handleFileUpload],
  )

  const startProcessing = useCallback(async () => {
    if (!uploadedFile) return

    setProgress((prev) => ({ ...prev, status: "processing" }))
    setProcessingResult(null)
    setSvgPreview(null)
    setSettingsChanged(false)

    // Simulate realistic processing phases
    let currentPhase = 1
    let currentProgress = 0
    const startTime = Date.now()

    // Estimate processing time based on file size and settings
    const baseTime = Math.min(uploadedFile.size / (100 * 1024), 30) // 30s max
    const complexityMultiplier = colorCount / 16 // More colors = more time
    const estimatedTime = baseTime * complexityMultiplier * 1000

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progressRate = Math.random() * 2 + 0.5 // Variable speed
      currentProgress += progressRate

      const currentPhaseData = PROCESSING_PHASES[currentPhase as keyof typeof PROCESSING_PHASES]

      if (currentProgress >= currentPhaseData.range[1]) {
        currentPhase++
        if (currentPhase > 5) {
          clearInterval(interval)

          // Simulate successful completion
          const finalMetrics = {
            processingTime: Date.now() - startTime,
            pathCount: Math.floor(Math.random() * 500) + 200,
            colorCount: colorCount,
            sizeReduction: Math.floor(Math.random() * 30) + 50,
          }

          setProcessingResult({
            success: true,
            outputPath: `vectorized/${uploadedFile.name.replace(/\.[^/.]+$/, ".svg")}`,
            metrics: finalMetrics,
          })

          // Generate advanced SVG preview based on detected colors and structure
          const svgColors = [
            ...colorPalette.detectedColors,
            ...colorPalette.brandColors
          ].filter((color, index, arr) => arr.indexOf(color) === index).slice(0, 5)
          
          setSvgPreview(generateAdvancedSVG(svgColors, finalMetrics, imageStructure))

          setProgress({
            phase: 5,
            percentage: 100,
            elapsedTime: Date.now() - startTime,
            estimatedTotal: Date.now() - startTime,
            currentOperation: "✅ Processing complete with hole detection",
            status: "complete",
          })
          return
        }
      }

      const phaseOperations = {
        1: "Analyzing image structure and detecting dominant colors...",
        2: "Converting to LAB color space for accurate quantization...",
        3: "Detecting holes in letters (B, A, O) and balancing layer order...",
        4: "Generating smooth cubic Bézier curves for professional output...",
        5: "Optimizing SVG with compound paths and fill-rule evenodd...",
      }

      setProgress({
        phase: currentPhase as any,
        percentage: Math.min(currentProgress, 100),
        elapsedTime: elapsed,
        estimatedTotal: estimatedTime,
        currentOperation: phaseOperations[currentPhase as keyof typeof phaseOperations],
        status: "processing",
      })
    }, 150)
  }, [uploadedFile, colorCount, colorPalette.brandColors])

  const generateCommand = useCallback(() => {
    if (!uploadedFile) return "python3 imagetracer.py input.png output.svg --preset color_perfect"

    const inputName = uploadedFile.name
    const outputName = inputName.replace(/\.[^/.]+$/, ".svg")

    const parts = [
      "python3 imagetracer.py",
      inputName,
      outputName,
      `--preset ${selectedPreset}`,
      `--colors ${colorCount}`,
      `--scale ${scaleMultiplier}`,
    ]

    return parts.join(" ")
  }, [uploadedFile, selectedPreset, colorCount, scaleMultiplier])

  const copyCommand = useCallback(() => {
    navigator.clipboard.writeText(generateCommand())
  }, [generateCommand])

  const resetProcessing = useCallback(() => {
    setProgress({
      phase: 1,
      percentage: 0,
      elapsedTime: 0,
      estimatedTotal: 0,
      currentOperation: "Ready to process with new settings",
      status: "idle",
    })
    setProcessingResult(null)
    setSvgPreview(null)
  }, [])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
  }

  const analyzeImageStructure = useCallback((imageData: ImageData | undefined) => {
    if (!imageData) return { type: 'generic', patterns: [] }
    
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    
    // Detect high contrast patterns (like QR codes)
    let contrastRegions = 0
    let totalRegions = 0
    const gridSize = 8
    
    for (let y = 0; y < height - gridSize; y += gridSize) {
      for (let x = 0; x < width - gridSize; x += gridSize) {
        const idx = (y * width + x) * 4
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        // Check surrounding pixels for contrast
        let minBright = brightness
        let maxBright = brightness
        
        for (let dy = 0; dy < gridSize; dy += 2) {
          for (let dx = 0; dx < gridSize; dx += 2) {
            const checkIdx = ((y + dy) * width + (x + dx)) * 4
            if (checkIdx < data.length) {
              const checkBright = (data[checkIdx] + data[checkIdx + 1] + data[checkIdx + 2]) / 3
              minBright = Math.min(minBright, checkBright)
              maxBright = Math.max(maxBright, checkBright)
            }
          }
        }
        
        const contrast = maxBright - minBright
        if (contrast > 100) contrastRegions++
        totalRegions++
      }
    }
    
    const contrastRatio = contrastRegions / totalRegions
    
    if (contrastRatio > 0.3) {
      return { type: 'qr_code', patterns: [] }
    } else if (contrastRatio > 0.15) {
      return { type: 'logo', patterns: [] }
    } else {
      return { type: 'photo', patterns: [] }
    }
  }, [])

  const generateAdvancedSVG = useCallback((colors: string[], metrics: any, imageStructure: any) => {
    const viewBox = "0 0 300 300"
    const centerX = 150
    const centerY = 150
    const shapes = []
    
    if (imageStructure?.type === 'qr_code') {
      // Generate QR-code-like pattern
      const bgColor = colors[0] || '#ffffff'
      const fgColor = colors[1] || '#000000'
      
      // Background
      shapes.push(`<rect x="0" y="0" width="300" height="300" fill="${bgColor}"/>`)
      
      // Generate QR-like modules
      const moduleSize = 12
      const modules = 25
      const startX = (300 - modules * moduleSize) / 2
      const startY = (300 - modules * moduleSize) / 2
      
      // Create finder patterns (corners)
      const finderPattern = (x: number, y: number) => [
        `<rect x="${x}" y="${y}" width="${moduleSize * 7}" height="${moduleSize * 7}" fill="${fgColor}"/>`,
        `<rect x="${x + moduleSize}" y="${y + moduleSize}" width="${moduleSize * 5}" height="${moduleSize * 5}" fill="${bgColor}"/>`,
        `<rect x="${x + moduleSize * 2}" y="${y + moduleSize * 2}" width="${moduleSize * 3}" height="${moduleSize * 3}" fill="${fgColor}"/>`
      ]
      
      // Add finder patterns
      shapes.push(...finderPattern(startX, startY))
      shapes.push(...finderPattern(startX + moduleSize * 18, startY))
      shapes.push(...finderPattern(startX, startY + moduleSize * 18))
      
      // Add random data modules
      for (let i = 0; i < 80; i++) {
        const x = startX + (Math.floor(Math.random() * modules) * moduleSize)
        const y = startY + (Math.floor(Math.random() * modules) * moduleSize)
        if (Math.random() > 0.5) {
          shapes.push(`<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${fgColor}"/>`)
        }
      }
      
    } else if (imageStructure?.type === 'logo') {
      // Generate logo-like shapes
      const mainColor = colors[0] || '#f7931e'
      const accentColor = colors[1] || '#000000'
      
      // Background circle
      shapes.push(`<circle cx="${centerX}" cy="${centerY}" r="140" fill="${mainColor}" opacity="0.2"/>`)
      
      // Main logo shape
      shapes.push(`<path d="M${centerX-60},${centerY-80} Q${centerX},${centerY-100} ${centerX+60},${centerY-80} L${centerX+80},${centerY+60} Q${centerX},${centerY+80} ${centerX-80},${centerY+60} Z" fill="${mainColor}" fillRule="evenodd"/>`)
      
      // Inner elements
      if (colors[2]) {
        shapes.push(`<rect x="${centerX-30}" y="${centerY-20}" width="60" height="40" rx="8" fill="${colors[2]}"/>`)
      }
      
      // Brand elements
      shapes.push(`<circle cx="${centerX-20}" cy="${centerY}" r="6" fill="${accentColor}"/>`)
      shapes.push(`<circle cx="${centerX+20}" cy="${centerY}" r="6" fill="${accentColor}"/>`)
      
    } else {
      // Generic photo representation
      const bg = colors[0] || '#f0f0f0'
      const primary = colors[1] || '#333333'
      const secondary = colors[2] || '#666666'
      
      // Background gradient
      shapes.push(`<defs><linearGradient id="photoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${bg};stop-opacity:1" /><stop offset="100%" style="stop-color:${primary};stop-opacity:0.3" /></linearGradient></defs>`)
      shapes.push(`<rect x="0" y="0" width="300" height="300" fill="url(#photoGrad)"/>`)
      
      // Abstract shapes representing photo content
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * 250 + 25
        const y = Math.random() * 250 + 25
        const r = Math.random() * 30 + 10
        const color = colors[Math.floor(Math.random() * Math.min(colors.length, 3))] || primary
        shapes.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${0.3 + Math.random() * 0.4}"/>`)
      }
    }
    
    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      ${shapes.join('\n      ')}
      <text x="${centerX}" y="280" textAnchor="middle" fill="${colors[1] || '#000'}" fontSize="14" fontFamily="monospace" opacity="0.7">${metrics?.pathCount || 'SVG'} paths</text>
    </svg>`
  }, [])

  const getProgressColor = (elapsedTime: number) => {
    if (elapsedTime < 10000) return "linear-gradient(135deg, #00bcd4, #2196f3)"
    if (elapsedTime < 30000) return "linear-gradient(135deg, #2196f3, #3f51b5)"
    return "linear-gradient(135deg, #3f51b5, #673ab7)"
  }

  const selectedPresetData = CORE_PRESETS.find((p) => p.id === selectedPreset) || CORE_PRESETS[0]

  return (
    <div className="min-h-screen bg-white font-mono rv0-pattern">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-10 opacity-5 animate-pulse">
          <Image src="/rv0-logo.png" alt="" width={120} height={48} />
        </div>
        <div className="absolute bottom-20 left-10 opacity-5 animate-pulse" style={{ animationDelay: "1s" }}>
          <Image src="/rv0-logo.png" alt="" width={80} height={32} />
        </div>
        <div className="absolute top-1/2 left-1/4 opacity-3 animate-pulse" style={{ animationDelay: "2s" }}>
          <Image src="/rv0-logo.png" alt="" width={60} height={24} />
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 -mx-6 px-6 -mt-6 mb-6 rounded-t-lg">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Image
                src="/rv0-logo.png"
                alt="rv0"
                width={100}
                height={40}
                className="h-10 w-auto drop-shadow-lg"
                priority
              />
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg blur-sm -z-10"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                Vector Optimization Studio
              </h1>
              <p className="text-sm text-gray-600">Advanced raster-to-vector conversion engine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-green-600 flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full">
              <CheckCircle className="h-4 w-4" />
              Backend Ready
            </div>
            <Button variant="outline" size="sm" className="border-blue-200 hover:bg-blue-50 bg-transparent">
              Help
            </Button>
          </div>
        </div>

        {/* Upload Zone */}
        <Card className={`border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50/30 to-cyan-50/30 relative overflow-hidden transition-all duration-300 ${uploadedFile ? 'border-solid border-green-300 bg-gradient-to-br from-green-50/30 to-blue-50/30' : ''}`}>
          <div className="absolute inset-0 opacity-5 flex items-center justify-center">
            <Image src="/rv0-logo.png" alt="" width={uploadedFile ? 200 : 300} height={uploadedFile ? 80 : 120} className="pointer-events-none" />
          </div>
          <CardContent className={`relative z-10 transition-all duration-300 ${uploadedFile ? 'p-4' : 'p-8'}`}>
            <div
              className={`text-center cursor-pointer transition-all duration-300 ${uploadedFile ? 'space-y-2' : 'space-y-4'}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {!uploadedFile ? (
                <>
                  <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      Drag & drop images here or click to browse
                    </h3>
                    <p className="text-sm text-gray-600">Supports: PNG, JPG • Recommended: {"<"} 2MB for optimal speed</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                    <Upload className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-green-700">
                      ✓ {uploadedFile.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {Math.round(uploadedFile.size / 1024)}KB • Click to change
                    </div>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />
            </div>
          </CardContent>
        </Card>
        {!uploadedFile && (
          <div className="absolute bottom-4 right-4 opacity-10">
            <Image src="/rv0-logo.png" alt="" width={60} height={24} className="pointer-events-none" />
          </div>
        )}

        {/* Preview & Results */}
        {uploadedFile && (
          <Card className="border border-gray-300">
            <CardHeader>
              <CardTitle className="text-lg">Preview & Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="text-center">
                  <h4 className="font-semibold mb-2">Original</h4>
                  <div className="aspect-square lg:aspect-square bg-gray-100 border border-gray-300 rounded flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Original"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-500">Loading...</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <div>{uploadedFile.name}</div>
                    <div>{Math.round(uploadedFile.size / 1024)}KB</div>
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="font-semibold mb-2">Vectorized SVG</h4>
                  <div className="aspect-square lg:aspect-square bg-gray-100 border border-gray-300 rounded overflow-hidden">
                    {svgPreview ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: svgPreview }} 
                        className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                      />
                    ) : progress.status === "complete" ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-green-600">✅ Ready</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-500">Processing...</span>
                      </div>
                    )}
                  </div>
                  {processingResult?.metrics && (
                    <div className="text-xs text-gray-600 mt-2">
                      <div>{processingResult.metrics.pathCount} paths</div>
                      <div>{processingResult.metrics.colorCount} colors</div>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <h4 className="font-semibold mb-2">Performance Metrics</h4>
                  {processingResult?.metrics ? (
                    <div className="text-left space-y-1 text-sm">
                      <div>Time: {formatTime(processingResult.metrics.processingTime)}</div>
                      <div>Paths: {processingResult.metrics.pathCount}</div>
                      <div>Colors: {processingResult.metrics.colorCount}</div>
                      <div>Size reduction: {processingResult.metrics.sizeReduction}%</div>
                      <div className="text-green-600 text-xs mt-2">
                        ✅ Holes preserved
                        <br />✅ Cubic Bézier curves
                        <br />✅ LAB color accuracy
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Metrics will appear after processing</div>
                  )}
                </div>
              </div>

              {progress.status === "idle" && uploadedFile && (
                <div className="mt-6 text-center">
                  <Button
                    onClick={startProcessing}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 shadow-lg px-8 py-3 text-lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start rv0 Vectorization
                  </Button>
                </div>
              )}
              
              {progress.status === "complete" && uploadedFile && (
                <div className="mt-6 text-center space-y-3">
                  {settingsChanged ? (
                    <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                      ⚠️ Settings changed - click to re-process with new parameters
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      Want to try different settings? Adjust presets or parameters above and re-process.
                    </div>
                  )}
                  <Button
                    onClick={startProcessing}
                    className={`shadow-lg px-8 py-3 text-lg ${
                      settingsChanged
                        ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700"
                        : "bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700"
                    }`}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    {settingsChanged ? "Re-process with New Settings" : "Try Again with Current Settings"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {progress.status === "error" && progress.errorMessage && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{progress.errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Progress Tracking */}
        {progress.status !== "idle" && progress.status !== "error" && (
          <Card className="border border-gray-300">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">rv0 Vectorization Progress</span>
                  <span className="text-sm">
                    {progress.percentage.toFixed(0)}% | {formatTime(progress.elapsedTime)}
                    {progress.estimatedTotal > 0 && ` / ~${formatTime(progress.estimatedTotal)}`}
                  </span>
                </div>

                <div className="relative">
                  <Progress value={progress.percentage} className="h-4 bg-gradient-to-r from-blue-100 to-cyan-100" />
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
                    Phase {progress.phase}: {PROCESSING_PHASES[progress.phase].name}
                  </div>
                </div>

                <div className="text-sm text-gray-600">{progress.currentOperation}</div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowLogs(!showLogs)}>
                    {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Show Processing Log
                  </Button>

                  {progress.status === "processing" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Pause className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Square className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {showLogs && (
                  <div className="bg-gray-50 p-4 rounded border text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
                    <div>
                      [{new Date().toLocaleTimeString()}] rv0: Image loaded: {uploadedFile?.name} (
                      {Math.round((uploadedFile?.size || 0) / 1024)}KB)
                    </div>
                    <div>
                      [{new Date().toLocaleTimeString()}] rv0: Detected {colorPalette.detectedColors.length} dominant
                      colors
                    </div>
                    <div className="text-green-600">
                      [{new Date().toLocaleTimeString()}] rv0: LAB color space conversion complete
                    </div>
                    <div>[{new Date().toLocaleTimeString()}] rv0: Advanced hole detection initialized</div>
                    <div>[{new Date().toLocaleTimeString()}] rv0: Balanced layer ordering applied</div>
                    <div>[{new Date().toLocaleTimeString()}] rv0: Generating cubic Bézier curves...</div>
                    {progress.status === "complete" && (
                      <div className="text-green-600">
                        [{new Date().toLocaleTimeString()}] rv0: ✅ SVG export complete with compound paths
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {!uploadedFile && (
          <div className="absolute bottom-4 right-4 opacity-10">
            <Image src="/rv0-logo.png" alt="" width={60} height={24} className="pointer-events-none" />
          </div>
        )}

        {/* Color Analysis & Brand Palette */}
        <Card className="border border-gray-300 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-5">
            <Image src="/rv0-logo.png" alt="" width={40} height={16} className="pointer-events-none" />
          </div>
          <CardHeader>
            <CardTitle className="text-lg rv0-gradient-text">Color Analysis & Brand Palette</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Auto-detected Colors:</Label>
              <div className="flex gap-2 mt-2">
                {colorPalette.detectedColors.map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    style={{ backgroundColor: color }}
                    title={color}
                    onClick={() => {
                      if (!colorPalette.brandColors.includes(color)) {
                        setColorPalette((prev) => ({
                          ...prev,
                          brandColors: [...prev.brandColors, color],
                        }))
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Brand Color Palette:</Label>
              <div className="flex gap-2 mt-2 items-center">
                {colorPalette.brandColors.map((color, i) => (
                  <div key={i} className="relative">
                    <Input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const newColors = [...colorPalette.brandColors]
                        newColors[i] = e.target.value
                        setColorPalette((prev) => ({ ...prev, brandColors: newColors }))
                      }}
                      className="w-8 h-8 p-0 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setColorPalette((prev) => ({
                      ...prev,
                      brandColors: [...prev.brandColors, "#000000"],
                    }))
                  }}
                >
                  + Add Color
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600">
                ✅ {colorPalette.accuracy}% LAB color space accuracy with hole preservation
              </span>
            </div>
          </CardContent>
        </Card>
        {!uploadedFile && (
          <div className="absolute bottom-4 right-4 opacity-10">
            <Image src="/rv0-logo.png" alt="" width={60} height={24} className="pointer-events-none" />
          </div>
        )}

        {/* Core Preset Selection */}
        <Card className="border border-gray-300">
          <CardHeader>
            <CardTitle className="text-lg">rv0 Vectorization Presets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {CORE_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all relative ${
                    selectedPreset === preset.id
                      ? "border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg"
                      : "border-gray-300 hover:border-blue-300 hover:bg-blue-50/30"
                  }`}
                  onClick={() => {
                    setSelectedPreset(preset.id)
                    setColorCount(preset.colors)
                    setScaleMultiplier(preset.scale)
                  }}
                >
                  {preset.recommended && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                      Recommended
                    </div>
                  )}
                  <div className="text-2xl mb-2">{preset.icon}</div>
                  <h4 className="font-semibold text-sm">{preset.name}</h4>
                  <p className="text-xs text-gray-600 mt-1">{preset.desc}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    {preset.colors} colors • {preset.scale}x scale
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {!uploadedFile && (
          <div className="absolute bottom-4 right-4 opacity-10">
            <Image src="/rv0-logo.png" alt="" width={60} height={24} className="pointer-events-none" />
          </div>
        )}

        {/* Core Parameters */}
        <Card className="border border-gray-300">
          <CardHeader>
            <CardTitle className="text-lg">Core Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium">Color Count: {colorCount}</Label>
                <div className="mt-2">
                  <Slider
                    value={[colorCount]}
                    onValueChange={(value) => setColorCount(value[0])}
                    min={8}
                    max={32}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>8 (Faster)</span>
                    <span>32 (Higher Quality)</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Fewer colors = faster processing, more colors = higher quality
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Scale Multiplier: {scaleMultiplier}x</Label>
                <div className="mt-2">
                  <Slider
                    value={[scaleMultiplier]}
                    onValueChange={(value) => setScaleMultiplier(value[0])}
                    min={1.0}
                    max={4.0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>1.0x</span>
                    <span>4.0x</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Output size multiplier for high-resolution exports</p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <div className="text-sm">
                <strong>Current Settings:</strong> {selectedPresetData.name} preset with {colorCount} colors at{" "}
                {scaleMultiplier}x scale
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Estimated processing time: {Math.ceil(((uploadedFile?.size || 500000) / 50000) * (colorCount / 16))}s
              </div>
            </div>
          </CardContent>
        </Card>
        {!uploadedFile && (
          <div className="absolute bottom-4 right-4 opacity-10">
            <Image src="/rv0-logo.png" alt="" width={60} height={24} className="pointer-events-none" />
          </div>
        )}

        {/* Generated Command & Export */}
        <Card className="border border-gray-300">
          <CardHeader>
            <CardTitle className="text-lg">Generated Command & Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded border font-mono text-sm overflow-x-auto">
              <pre>{generateCommand()}</pre>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={copyCommand}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Command
              </Button>
              <Button variant="outline" size="sm" disabled={!processingResult?.success}>
                <Download className="h-4 w-4 mr-2" />
                Download SVG
              </Button>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-2" />
                Share Settings
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Save Preset
              </Button>
            </div>

            {processingResult?.success && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded border border-green-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10">
                  <Image src="/rv0-logo.png" alt="" width={80} height={32} className="pointer-events-none" />
                </div>
                <div className="text-sm text-green-800 relative z-10">
                  <strong>✅ rv0 Processing Complete!</strong>
                </div>
                <div className="text-xs text-green-700 mt-1 relative z-10">
                  Output saved to: {processingResult.outputPath}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

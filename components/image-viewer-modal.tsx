'use client'

import { useEffect, useState } from 'react'
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageViewerModalProps {
    imageUrl: string | null
    onClose: () => void
    title?: string
}

export function ImageViewerModal({ imageUrl, onClose, title }: ImageViewerModalProps) {
    const [zoom, setZoom] = useState(1)
    const [isDragging, setIsDragging] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

    useEffect(() => {
        // Prevent body scroll when modal is open
        if (imageUrl) {
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [imageUrl])

    useEffect(() => {
        // Reset zoom and position when image changes
        setZoom(1)
        setPosition({ x: 0, y: 0 })
    }, [imageUrl])

    if (!imageUrl) return null

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.5, 3))
    }

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.5, 0.5))
    }

    const handleDownload = async () => {
        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = title || 'image.png'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Failed to download image:', error)
        }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom > 1) {
            setIsDragging(true)
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoom > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            })
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        if (zoom > 1 && e.touches.length === 1) {
            setIsDragging(true)
            setDragStart({
                x: e.touches[0].clientX - position.x,
                y: e.touches[0].clientY - position.y
            })
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDragging && zoom > 1 && e.touches.length === 1) {
            setPosition({
                x: e.touches[0].clientX - dragStart.x,
                y: e.touches[0].clientY - dragStart.y
            })
        }
    }

    const handleTouchEnd = () => {
        setIsDragging(false)
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            onClick={onClose}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-white font-medium truncate">{title || 'Image'}</h3>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/10"
                        onClick={handleZoomOut}
                        disabled={zoom <= 0.5}
                    >
                        <ZoomOut size={20} />
                    </Button>
                    <span className="text-white text-sm min-w-[60px] text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/10"
                        onClick={handleZoomIn}
                        disabled={zoom >= 3}
                    >
                        <ZoomIn size={20} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/10"
                        onClick={handleDownload}
                    >
                        <Download size={20} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/10"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </Button>
                </div>
            </div>

            {/* Image Container */}
            <div
                className="flex-1 flex items-center justify-center overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
                <img
                    src={imageUrl}
                    alt={title || 'Image'}
                    className="max-w-full max-h-full object-contain select-none"
                    style={{
                        transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                    }}
                    draggable={false}
                />
            </div>

            {/* Instructions */}
            <div className="p-4 bg-black/50 text-center" onClick={(e) => e.stopPropagation()}>
                <p className="text-white/70 text-sm">
                    {zoom > 1 ? 'Drag to pan • ' : ''}Pinch or use buttons to zoom • Tap outside to close
                </p>
            </div>
        </div>
    )
}

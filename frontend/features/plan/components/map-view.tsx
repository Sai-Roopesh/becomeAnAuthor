'use client';

/**
 * Map View
 * 
 * Interactive map viewer for worldbuilding.
 * Allows uploading map images and placing markers linked to Location codex entries.
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import { useLiveQuery } from '@/hooks/use-live-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Map,
    Upload,
    MapPin,
    Trash2,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMaps } from '../hooks/use-maps';
import { useAppServices } from '@/infrastructure/di/AppContext';
import type { ProjectMap, MapMarker } from '@/domain/entities/types';
import { convertFileSrc } from '@tauri-apps/api/core';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('MapView');

interface MapViewProps {
    projectId: string;
    seriesId: string;
}

const MARKER_COLORS = [
    { value: '#ef4444', label: 'Red' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#22c55e', label: 'Green' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#6b7280', label: 'Gray' },
];

const createEmptyMap = (projectId: string): ProjectMap => ({
    id: crypto.randomUUID(),
    projectId,
    name: 'New Map',
    imagePath: '',
    markers: [],
    zoomLevel: 1,
    panX: 0,
    panY: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
});

export function MapView({ projectId, seriesId }: MapViewProps) {
    const { codexRepository, nodeRepository } = useAppServices();
    const projectPath = nodeRepository.getProjectPath();

    const {
        maps,
        // loading removed - unused
        saveMap,
        deleteMap,
        uploadImage
    } = useMaps({ projectId });

    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const [isAddingMarker, setIsAddingMarker] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [editingMarker, setEditingMarker] = useState<MapMarker | null>(null);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [newMapName, setNewMapName] = useState('');
    const [zoom, setZoom] = useState(1);
    const [deleteMapConfirm, setDeleteMapConfirm] = useState<{ id: string; name: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Fetch locations for linking
    const locations = useLiveQuery(
        async () => {
            const entries = await codexRepository.getBySeries(seriesId);
            return entries.filter(e => e.category === 'location');
        },
        [seriesId, codexRepository]
    );

    const selectedMap = useMemo(() => {
        if (!maps || !selectedMapId) return null;
        return maps.find(m => m.id === selectedMapId) ?? null;
    }, [maps, selectedMapId]);

    // Auto-select first map
    useEffect(() => {
        if (maps && maps.length > 0 && !selectedMapId && maps[0]) {
            setSelectedMapId(maps[0].id);
        }
    }, [maps, selectedMapId]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Create new map placeholder to get an ID
        const tempId = crypto.randomUUID();
        const imagePath = await uploadImage(tempId, file);

        const newMap = createEmptyMap(projectId);
        newMap.id = tempId;
        newMap.name = newMapName || file.name.replace(/\.[^/.]+$/, '');
        newMap.imagePath = imagePath;

        await saveMap(newMap);
        setSelectedMapId(newMap.id);
        setIsUploadDialogOpen(false);
        setNewMapName('');
    };

    const handleMapClick = async (event: React.MouseEvent<HTMLDivElement>) => {
        if (!isAddingMarker || !selectedMap || !mapContainerRef.current) return;

        const rect = mapContainerRef.current.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / (rect.width * zoom)) * 100;
        const y = ((event.clientY - rect.top) / (rect.height * zoom)) * 100;

        const newMarker: MapMarker = {
            id: crypto.randomUUID(),
            x,
            y,
            label: 'New Location',
            color: '#3b82f6',
        };

        const updatedMap = {
            ...selectedMap,
            markers: [...selectedMap.markers, newMarker],
        };

        await saveMap(updatedMap);
        setIsAddingMarker(false);
        setEditingMarker(newMarker);
    };

    const handleUpdateMarker = async (marker: MapMarker) => {
        if (!selectedMap) return;

        const updatedMarkers = selectedMap.markers.map(m =>
            m.id === marker.id ? marker : m
        );

        await saveMap({ ...selectedMap, markers: updatedMarkers });
        setEditingMarker(null);
    };

    const handleDeleteMarker = async (markerId: string) => {
        if (!selectedMap) return;

        const updatedMarkers = selectedMap.markers.filter(m => m.id !== markerId);
        await saveMap({ ...selectedMap, markers: updatedMarkers });
    };

    const handleDeleteMapClick = (mapId: string, mapName: string) => {
        setDeleteMapConfirm({ id: mapId, name: mapName });
    };

    const handleDeleteMapConfirm = async () => {
        if (!deleteMapConfirm) return;
        await deleteMap(deleteMapConfirm.id);
        if (selectedMapId === deleteMapConfirm.id) {
            setSelectedMapId(null);
        }
        setDeleteMapConfirm(null);
    };

    if (!maps) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading maps...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b bg-background/80 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Map className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">World Maps</h2>
                        <Badge variant="outline">{maps.length} maps</Badge>
                    </div>
                    <Button onClick={() => setIsUploadDialogOpen(true)} size="sm" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Map
                    </Button>
                </div>

                {/* Map Selector */}
                {maps.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                        {maps.map(map => (
                            <Badge
                                key={map.id}
                                variant={selectedMapId === map.id ? 'default' : 'outline'}
                                className="cursor-pointer whitespace-nowrap group"
                                onClick={() => setSelectedMapId(map.id)}
                            >
                                {map.name}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMapClick(map.id, map.name);
                                    }}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Map Content */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
                {maps.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-6">
                        <EmptyState
                            icon={<Map className="h-12 w-12" />}
                            title="No Maps Yet"
                            description="Upload a map image to start placing location markers. Supports PNG, JPG, and WebP formats."
                            action={{
                                label: 'Upload First Map',
                                onClick: () => setIsUploadDialogOpen(true),
                            }}
                        />
                    </div>
                ) : selectedMap ? (
                    <>
                        {/* Map Controls */}
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            <Button
                                variant={isAddingMarker ? 'default' : 'outline'}
                                size="sm"
                                className="gap-2"
                                onClick={() => setIsAddingMarker(!isAddingMarker)}
                            >
                                <MapPin className="h-4 w-4" />
                                {isAddingMarker ? 'Cancel' : 'Add Marker'}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Map Image with Markers */}
                        <div
                            ref={mapContainerRef}
                            className={cn(
                                'h-full w-full overflow-auto',
                                isAddingMarker && 'cursor-crosshair'
                            )}
                            onClick={handleMapClick}
                        >
                            <div
                                className="relative min-h-full min-w-full"
                                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                            >
                                {selectedMap.imagePath ? (() => {
                                    // Handle both absolute and relative paths
                                    const fullPath = selectedMap.imagePath.startsWith('/')
                                        ? selectedMap.imagePath
                                        : `${projectPath}/${selectedMap.imagePath}`;
                                    return (
                                        <img
                                            src={convertFileSrc(fullPath)}
                                            alt={selectedMap.name}
                                            className="max-w-none"
                                            draggable={false}
                                            onError={(e) => {
                                                log.error('Failed to load map image:', fullPath);
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    );
                                })() : (
                                    <div className="h-96 w-full bg-muted flex items-center justify-center">
                                        <span className="text-muted-foreground">No image</span>
                                    </div>
                                )}

                                {/* Markers */}
                                {selectedMap.markers.map(marker => (
                                    <Popover key={marker.id}>
                                        <PopoverTrigger asChild>
                                            <button
                                                className="absolute -translate-x-1/2 -translate-y-full"
                                                style={{
                                                    left: `${marker.x}%`,
                                                    top: `${marker.y}%`,
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MapPin
                                                    className="h-8 w-8 drop-shadow-lg hover:scale-110 transition-transform"
                                                    style={{ color: marker.color || '#3b82f6' }}
                                                    fill={marker.color || '#3b82f6'}
                                                />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64" onClick={(e) => e.stopPropagation()}>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-medium text-muted-foreground">Label</label>
                                                    <Input
                                                        value={marker.label}
                                                        onChange={(e) => {
                                                            const updated = { ...marker, label: e.target.value };
                                                            handleUpdateMarker(updated);
                                                        }}
                                                        className="h-8 mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-muted-foreground">Color</label>
                                                    <div className="flex gap-1 mt-1">
                                                        {MARKER_COLORS.map(c => (
                                                            <button
                                                                key={c.value}
                                                                className={cn(
                                                                    'h-6 w-6 rounded-full border-2',
                                                                    marker.color === c.value ? 'border-foreground' : 'border-transparent'
                                                                )}
                                                                style={{ backgroundColor: c.value }}
                                                                onClick={() => handleUpdateMarker({ ...marker, color: c.value })}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-muted-foreground">Link to Location</label>
                                                    <Select
                                                        value={marker.codexId || 'none'}
                                                        onValueChange={(v) => {
                                                            if (v && v !== 'none') {
                                                                handleUpdateMarker({ ...marker, codexId: v });
                                                            } else {
                                                                // Delete the optional property instead of setting to undefined
                                                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                                                const { codexId: _codexId, ...rest } = marker;
                                                                handleUpdateMarker(rest as MapMarker);
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 mt-1">
                                                            <SelectValue placeholder="Select location..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">None</SelectItem>
                                                            {locations?.map(loc => (
                                                                <SelectItem key={loc.id} value={loc.id}>
                                                                    {loc.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={() => handleDeleteMarker(marker.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete Marker
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                ))}
                            </div>
                        </div>
                    </>
                ) : null}
            </div>

            {/* Upload Dialog */}
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload New Map</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Map Name</label>
                            <Input
                                value={newMapName}
                                onChange={(e) => setNewMapName(e.target.value)}
                                placeholder="World Map, Kingdom of..."
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Image File</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleFileUpload}
                                className="block w-full text-sm text-muted-foreground
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-md file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-primary file:text-primary-foreground
                                    hover:file:bg-primary/90"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Supports PNG, JPG, and WebP. Max 10MB recommended.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Map Confirmation */}
            <AlertDialog open={!!deleteMapConfirm} onOpenChange={(open) => !open && setDeleteMapConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Map</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deleteMapConfirm?.name}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMapConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

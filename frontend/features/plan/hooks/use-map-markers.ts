"use client";

import { useState, useCallback, RefObject } from "react";
import type { ProjectMap, MapMarker } from "@/domain/entities/types";
import { DEFAULT_MARKER_COLOR } from "@/shared/constants/colors";

interface UseMapMarkersOptions {
  selectedMap: ProjectMap | null;
  mapContainerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  saveMap: (map: ProjectMap) => Promise<void>;
}

/**
 * Hook for managing map markers - adding, updating, and deleting.
 */
export function useMapMarkers({
  selectedMap,
  mapContainerRef,
  zoom,
  saveMap,
}: UseMapMarkersOptions) {
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [editingMarker, setEditingMarker] = useState<MapMarker | null>(null);

  const handleMapClick = useCallback(
    async (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isAddingMarker || !selectedMap || !mapContainerRef.current) return;

      const rect = mapContainerRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / (rect.width * zoom)) * 100;
      const y = ((event.clientY - rect.top) / (rect.height * zoom)) * 100;

      const newMarker: MapMarker = {
        id: crypto.randomUUID(),
        x,
        y,
        label: "New Location",
        color: DEFAULT_MARKER_COLOR,
      };

      const updatedMap = {
        ...selectedMap,
        markers: [...selectedMap.markers, newMarker],
      };

      await saveMap(updatedMap);
      setIsAddingMarker(false);
      setEditingMarker(newMarker);
    },
    [isAddingMarker, selectedMap, mapContainerRef, zoom, saveMap],
  );

  const handleUpdateMarker = useCallback(
    async (marker: MapMarker) => {
      if (!selectedMap) return;

      const updatedMarkers = selectedMap.markers.map((m) =>
        m.id === marker.id ? marker : m,
      );

      await saveMap({ ...selectedMap, markers: updatedMarkers });
      setEditingMarker(null);
    },
    [selectedMap, saveMap],
  );

  const handleDeleteMarker = useCallback(
    async (markerId: string) => {
      if (!selectedMap) return;

      const updatedMarkers = selectedMap.markers.filter(
        (m) => m.id !== markerId,
      );
      await saveMap({ ...selectedMap, markers: updatedMarkers });
    },
    [selectedMap, saveMap],
  );

  return {
    isAddingMarker,
    setIsAddingMarker,
    editingMarker,
    setEditingMarker,
    handleMapClick,
    handleUpdateMarker,
    handleDeleteMarker,
  };
}

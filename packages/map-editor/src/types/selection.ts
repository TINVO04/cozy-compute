export interface SelectionState {
  /** Currently selected object IDs */
  selectedObjectIds: string[];
  /** Hovered object ID */
  hoveredObjectId?: string;
  /** Active target layer ID for editing */
  activeLayerId: string;
  /** Current active tool */
  activeTool: 'select' | 'move' | 'place' | 'delete' | 'paint' | 'erase';
}

import { create } from "zustand";
import { nanoid } from "nanoid";

export type ViewMode = "home" | "imageEditor" | "ign3d" | "lidar";

export type ObjectType =
  | "box"
  | "cylinder"
  | "slab"
  | "umbrella"
  | "building"
  | "pier";

export interface SceneObject {
  id: string;
  type: ObjectType;
  color: string;
  position: { x: number; y: number; z: number };
  scale: { w: number; d: number; h: number };
}

export interface ImageData {
  url: string;
  width: number;
  height: number;
}

export interface SceneEffects {
  fog: boolean;
  displacement: boolean;
  displacementScale: number;
  ambientOcclusion: boolean;
  enhancedLighting: boolean;
  gridHelper: boolean;
}

interface AppState {
  viewMode: ViewMode;
  image: ImageData | null;
  objects: SceneObject[];
  activeTool: ObjectType | null;
  effects: SceneEffects;
  setViewMode: (mode: ViewMode) => void;
  setImage: (img: ImageData) => void;
  setActiveTool: (tool: ObjectType | null) => void;
  addObjectAt: (type: ObjectType, pos: { x: number; y: number }) => void;
  addObject: (type: ObjectType) => void;
  removeObject: (id: string) => void;
  updateObjectPosition: (
    id: string,
    pos: { x: number; y: number; z: number },
  ) => void;
  clearScene: () => void;
  setEffect: <K extends keyof SceneEffects>(
    key: K,
    value: SceneEffects[K],
  ) => void;
}

const COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
];

const DEFAULTS: Record<
  ObjectType,
  { w: number; d: number; h: number; z: number; color?: string }
> = {
  box: { w: 1, d: 1, h: 1, z: 0.5 },
  cylinder: { w: 0.5, d: 0.5, h: 2, z: 1 },
  slab: { w: 4, d: 2, h: 0.15, z: 0.075, color: "#94a3b8" },
  umbrella: { w: 0.8, d: 0.8, h: 0.6, z: 0.3, color: "#fbbf24" },
  building: { w: 2, d: 2, h: 3, z: 1.5, color: "#78716c" },
  pier: { w: 6, d: 1, h: 0.2, z: 0.1, color: "#64748b" },
};

export const useStore = create<AppState>((set) => ({
  viewMode: "home",
  image: null,
  objects: [],
  activeTool: null,
  effects: {
    fog: true,
    displacement: true,
    displacementScale: 60,
    ambientOcclusion: false,
    enhancedLighting: true,
    gridHelper: false,
  },

  setViewMode: (mode) => set({ viewMode: mode, activeTool: null }),
  setImage: (img) =>
    set({ image: img, objects: [], activeTool: null, viewMode: "imageEditor" }),

  setActiveTool: (tool) =>
    set((state) => ({
      activeTool: state.activeTool === tool ? null : tool,
    })),

  addObjectAt: (type, pos) =>
    set((state) => {
      const def = DEFAULTS[type];
      const scale =
        Math.min(state.image?.width ?? 500, state.image?.height ?? 500) * 0.02;
      return {
        objects: [
          ...state.objects,
          {
            id: nanoid(8),
            type,
            color: def.color ?? COLORS[state.objects.length % COLORS.length],
            position: { x: pos.x, y: pos.y, z: def.z * scale },
            scale: { w: def.w * scale, d: def.d * scale, h: def.h * scale },
          },
        ],
      };
    }),

  addObject: (type) =>
    set((state) => {
      const def = DEFAULTS[type];
      const scale =
        Math.min(state.image?.width ?? 500, state.image?.height ?? 500) * 0.02;
      return {
        objects: [
          ...state.objects,
          {
            id: nanoid(8),
            type,
            color: def.color ?? COLORS[state.objects.length % COLORS.length],
            position: { x: 0, y: 0, z: def.z * scale },
            scale: { w: def.w * scale, d: def.d * scale, h: def.h * scale },
          },
        ],
      };
    }),

  removeObject: (id) =>
    set((state) => ({ objects: state.objects.filter((o) => o.id !== id) })),

  updateObjectPosition: (id, pos) =>
    set((state) => ({
      objects: state.objects.map((o) =>
        o.id === id ? { ...o, position: pos } : o,
      ),
    })),

  clearScene: () => set({ objects: [], activeTool: null }),

  setEffect: (key, value) =>
    set((state) => ({ effects: { ...state.effects, [key]: value } })),
}));

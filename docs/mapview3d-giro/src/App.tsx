import { useStore } from "./store/useStore";
import ViewSelector from "./components/ViewSelector";
import GiroCanvas from "./components/GiroCanvas";
import IGNCanvas from "./components/IGNCanvas";
import LidarCanvas from "./components/LidarCanvas";
import Toolbar from "./components/Toolbar";
import EffectsPanel from "./components/EffectsPanel";

export default function App() {
  const viewMode = useStore((s) => s.viewMode);
  const image = useStore((s) => s.image);

  if (viewMode === "home") {
    return (
      <div className="h-screen w-screen bg-neutral-900">
        <ViewSelector />
      </div>
    );
  }

  if (viewMode === "ign3d") {
    return (
      <div className="h-screen w-screen bg-neutral-900">
        <IGNCanvas />
      </div>
    );
  }

  if (viewMode === "lidar") {
    return (
      <div className="h-screen w-screen bg-neutral-900">
        <LidarCanvas />
      </div>
    );
  }

  // imageEditor mode
  if (!image) {
    return (
      <div className="h-screen w-screen bg-neutral-900">
        <ViewSelector />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-neutral-900">
      <GiroCanvas
        imageUrl={image.url}
        imageWidth={image.width}
        imageHeight={image.height}
      />
      <Toolbar />
      <EffectsPanel />
      <button
        onClick={() => useStore.getState().setViewMode("home")}
        className="absolute top-4 right-4 z-10 bg-neutral-800/90 backdrop-blur text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors"
      >
        ← Ana Menü
      </button>
      <div className="absolute bottom-4 left-4 z-10 text-neutral-500 text-xs bg-neutral-800/80 backdrop-blur px-3 py-1.5 rounded-lg">
        {image.width}×{image.height}px · Araç seç → sahneye tıkla
      </div>
    </div>
  );
}

import { useStore, type ViewMode } from "../store/useStore";
import ImageUploader from "./ImageUploader";

const MODES: { id: ViewMode; label: string; desc: string; icon: string }[] = [
  {
    id: "ign3d",
    label: "3D Uydu Haritası",
    desc: "Uydu görüntüsü + fog + 3D kontroller (35.35, 33.21)",
    icon: "🏙️",
  },
  {
    id: "lidar",
    label: "3D Harita Görünümü",
    desc: "Uydu haritası + EDL rendering (35.35, 33.21)",
    icon: "🌐",
  },
];

export default function ViewSelector() {
  const setViewMode = useStore((s) => s.setViewMode);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-neutral-300 px-4">
      <h1 className="text-2xl font-light tracking-wide text-white">
        MapView 3D — Giro3D
      </h1>
      <p className="text-neutral-500 text-sm -mt-4">
        Görsel yükle veya hazır 3D sahne seç
      </p>

      <div className="w-full max-w-lg">
        <ImageUploader />
      </div>

      <div className="flex gap-4 flex-wrap justify-center">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setViewMode(m.id)}
            className="group flex flex-col items-center gap-2 bg-neutral-800/80 hover:bg-neutral-700/90 border border-neutral-700 hover:border-blue-500 rounded-xl px-6 py-5 transition-all w-56"
          >
            <span className="text-3xl">{m.icon}</span>
            <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
              {m.label}
            </span>
            <span className="text-xs text-neutral-500 text-center leading-relaxed">
              {m.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

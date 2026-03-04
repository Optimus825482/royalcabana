import { useStore, type ObjectType } from "../store/useStore";

const TOOLS: {
  type: ObjectType;
  label: string;
  icon: string;
  color: string;
}[] = [
  { type: "slab", label: "İskele Plakası", icon: "▬", color: "bg-slate-500" },
  { type: "pier", label: "Uzun İskele", icon: "═", color: "bg-slate-600" },
  { type: "building", label: "Bina", icon: "⌂", color: "bg-stone-500" },
  { type: "umbrella", label: "Şemsiye", icon: "☂", color: "bg-amber-500" },
  { type: "box", label: "Küp", icon: "▣", color: "bg-blue-600" },
  { type: "cylinder", label: "Silindir", icon: "◎", color: "bg-emerald-600" },
];

export default function Toolbar() {
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const objects = useStore((s) => s.objects);
  const removeObject = useStore((s) => s.removeObject);
  const clearScene = useStore((s) => s.clearScene);

  const typeLabel = (t: ObjectType) =>
    TOOLS.find((x) => x.type === t)?.label ?? t;

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 select-none">
      {/* Araç çubuğu */}
      <div className="bg-neutral-800/90 backdrop-blur rounded-xl p-2 flex flex-col gap-1.5">
        <p className="text-[10px] text-neutral-500 uppercase tracking-wider px-1">
          Tıkla → Sahneye Yerleştir
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {TOOLS.map((tool) => (
            <button
              key={tool.type}
              onClick={() => setActiveTool(tool.type)}
              className={`px-3 py-2 text-white text-xs rounded-lg transition-all flex items-center gap-1.5
                ${
                  activeTool === tool.type
                    ? "ring-2 ring-white/60 scale-105 " + tool.color
                    : tool.color + "/70 hover:" + tool.color
                }`}
            >
              <span className="text-base leading-none">{tool.icon}</span>
              {tool.label}
            </button>
          ))}
        </div>
        {objects.length > 0 && (
          <button
            onClick={clearScene}
            className="px-3 py-1.5 bg-red-600/70 text-white text-xs rounded-lg hover:bg-red-500 transition-colors mt-1"
          >
            Tümünü Temizle ({objects.length})
          </button>
        )}
      </div>

      {/* Aktif araç göstergesi */}
      {activeTool && (
        <div className="bg-blue-600/90 backdrop-blur text-white text-xs rounded-lg px-3 py-2 text-center animate-pulse">
          🎯 Sahneye tıkla → {typeLabel(activeTool)} yerleştir
        </div>
      )}

      {/* Obje listesi */}
      {objects.length > 0 && (
        <div className="bg-neutral-800/90 backdrop-blur rounded-xl p-2 flex flex-col gap-1 max-h-48 overflow-y-auto">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider px-1">
            Sahnedeki Objeler
          </p>
          {objects.map((obj) => (
            <div
              key={obj.id}
              className="flex items-center gap-2 text-xs text-neutral-300 px-1"
            >
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ backgroundColor: obj.color }}
              />
              <span className="flex-1 truncate">
                {typeLabel(obj.type)} #{obj.id.slice(0, 4)}
              </span>
              <button
                onClick={() => removeObject(obj.id)}
                className="text-neutral-500 hover:text-red-400 transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

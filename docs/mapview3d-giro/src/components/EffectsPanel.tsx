import { useStore } from "../store/useStore";

export default function EffectsPanel() {
  const effects = useStore((s) => s.effects);
  const setEffect = useStore((s) => s.setEffect);

  const toggle = (key: keyof typeof effects) => {
    if (key === "displacementScale") return;
    setEffect(key, !effects[key] as never);
  };

  return (
    <div className="absolute bottom-4 right-4 z-10 bg-neutral-800/90 backdrop-blur rounded-xl p-3 flex flex-col gap-2 select-none min-w-[200px]">
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
        3D Efektler
      </p>

      <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
        <input
          type="checkbox"
          checked={effects.fog}
          onChange={() => toggle("fog")}
          className="accent-blue-500"
        />
        🌫️ Sis (Fog)
      </label>

      <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
        <input
          type="checkbox"
          checked={effects.displacement}
          onChange={() => toggle("displacement")}
          className="accent-blue-500"
        />
        ⛰️ Yükseklik (Displacement)
      </label>

      {effects.displacement && (
        <div className="flex items-center gap-2 pl-5">
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={effects.displacementScale}
            onChange={(e) =>
              setEffect("displacementScale", Number(e.target.value))
            }
            className="w-full accent-blue-500 h-1"
          />
          <span className="text-[10px] text-neutral-500 w-8 text-right">
            {effects.displacementScale}
          </span>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
        <input
          type="checkbox"
          checked={effects.enhancedLighting}
          onChange={() => toggle("enhancedLighting")}
          className="accent-blue-500"
        />
        ☀️ Gelişmiş Işık
      </label>

      <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
        <input
          type="checkbox"
          checked={effects.gridHelper}
          onChange={() => toggle("gridHelper")}
          className="accent-blue-500"
        />
        📐 Grid Çizgileri
      </label>
    </div>
  );
}

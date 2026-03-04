import { useCallback } from "react";
import { useStore } from "../store/useStore";

export default function ImageUploader() {
  const setImage = useStore((s) => s.setImage);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        // WebGL max texture genelde 4096-16384 arası
        // Küçük görselleri 2x upscale ederek kaliteyi artır
        const MAX_SIDE = 8192;
        const needsUpscale = w < 2048 && h < 2048;
        if (needsUpscale) {
          const scale = Math.min(2, MAX_SIDE / Math.max(w, h));
          const nw = Math.round(w * scale);
          const nh = Math.round(h * scale);
          const canvas = document.createElement("canvas");
          canvas.width = nw;
          canvas.height = nh;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, nw, nh);
            canvas.toBlob((blob) => {
              if (blob) {
                const upUrl = URL.createObjectURL(blob);
                URL.revokeObjectURL(url);
                setImage({ url: upUrl, width: nw, height: nh });
              } else {
                setImage({ url, width: w, height: h });
              }
            }, "image/png");
            return;
          }
        }
        setImage({ url, width: w, height: h });
      };
      img.src = url;
    },
    [setImage],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="flex flex-col items-center justify-center h-full gap-6 text-neutral-400"
    >
      <div className="border-2 border-dashed border-neutral-600 rounded-2xl p-12 flex flex-col items-center gap-4 hover:border-blue-500 transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-lg">Harita görselini sürükle veya seç</p>
        <p className="text-sm text-neutral-500">PNG, JPG desteklenir</p>
        <label className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-500 transition-colors">
          Dosya Seç
          <input
            type="file"
            accept="image/*"
            onChange={onInput}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

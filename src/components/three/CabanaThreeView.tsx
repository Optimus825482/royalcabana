import dynamic from "next/dynamic";
import { ThreeViewProps } from "./CabanaThreeViewInner";

// SSR devre dışı — Three.js/WebGL yalnızca client-side çalışır
const CabanaThreeViewInner = dynamic(() => import("./CabanaThreeViewInner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-neutral-950 text-neutral-500 text-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        <span>3D görünüm yükleniyor...</span>
      </div>
    </div>
  ),
});

export type { ThreeViewProps };

export default function CabanaThreeView(props: ThreeViewProps) {
  return <CabanaThreeViewInner {...props} />;
}

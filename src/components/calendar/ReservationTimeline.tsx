"use client";

import dynamic from "next/dynamic";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const ReservationTimelineInner = dynamic(
    () => import("./ReservationTimelineInner"),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center p-16">
                <LoadingSpinner message="Rezervasyon zaman çizelgesi yükleniyor..." />
            </div>
        ),
    },
);

export default ReservationTimelineInner;

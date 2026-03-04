"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ServicePointDefinitionsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/system-admin/service-points");
  }, [router]);
  return null;
}

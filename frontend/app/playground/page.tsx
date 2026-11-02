"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PlaygroundRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    router.replace(params ? `/query?${params}` : "/query");
  }, [router, searchParams]);

  return null;
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={null}>
      <PlaygroundRedirect />
    </Suspense>
  );
}

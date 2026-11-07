"use client";
import { useRef } from "react";

// A failed request may already have committed. Retrying its exact input reuses the key.
export function useMutationKey() {
  const current = useRef<{signature: string; key: string} | null>(null);
  return (input: unknown) => {
    const signature = JSON.stringify(input);
    if (current.current?.signature !== signature) current.current = {signature, key: crypto.randomUUID()};
    return current.current.key;
  };
}

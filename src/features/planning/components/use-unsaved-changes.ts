"use client";
import { useEffect } from "react";
// Covers reload/close and links in the shared shell without intercepting form actions.
export function useUnsavedChanges(dirty: boolean) {
    useEffect(() => {
        if (!dirty)
            return;
        const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
        const navigate = (event: MouseEvent) => {
            if (!(event.target instanceof Element) || !event.target.closest("a[href]"))
                return;
            if (!window.confirm("Bạn có nội dung chưa lưu. Rời trang và bỏ nội dung này?")) {
                event.preventDefault();
                event.stopPropagation();
            }
        };
        window.addEventListener("beforeunload", unload);
        document.addEventListener("click", navigate, true);
        return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
    }, [dirty]);
}

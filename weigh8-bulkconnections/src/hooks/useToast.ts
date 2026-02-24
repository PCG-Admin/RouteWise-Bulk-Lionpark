import { useState, useCallback } from "react";
import { ToastType } from "@/components/Toast";

interface ToastData {
  id: number;
  type: ToastType;
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string) => showToast("success", message), [showToast]);
  const error = useCallback((message: string) => showToast("error", message), [showToast]);
  const warning = useCallback((message: string) => showToast("warning", message), [showToast]);
  const info = useCallback((message: string) => showToast("info", message), [showToast]);

  return {
    toasts,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}

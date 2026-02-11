"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "error" | "success";
  onClose: () => void;
}

const STYLES = {
  error: "bg-red-600 text-white",
  success: "bg-green-600 text-white",
};

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className={`${STYLES[type]} px-4 py-3 rounded-lg shadow-lg max-w-sm flex items-start gap-3`}>
        <p className="text-sm flex-1">{message}</p>
        <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">
          &times;
        </button>
      </div>
    </div>
  );
}

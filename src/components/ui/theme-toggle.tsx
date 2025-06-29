"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      aria-label="Toggle theme"
      className="rounded-full p-2 hover:bg-muted transition-colors"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {mounted ? (
        theme === "dark" ? (
          <Sun className="h-5 w-5 text-green-400" />
        ) : (
          <Moon className="h-5 w-5 text-green-700" />
        )
      ) : (
        <span className="h-5 w-5" />
      )}
    </button>
  );
} 
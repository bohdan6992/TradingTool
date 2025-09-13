"use client";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Navbar(){
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<"uk"|"en">("uk");
  useEffect(()=>setMounted(true),[]);
  return (
    <div className="sticky top-0 z-40 backdrop-blur bg-white/70 dark:bg-black/30 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link href="/" className="font-extrabold text-2xl">TradingTool</Link>
        <div className="ml-auto flex items-center gap-2">
          {mounted && (
            <button className="btn" onClick={()=>setTheme(theme === "dark" ? "light" : "dark")}>
              {theme==="dark"?"☀️ Світла":"🌙 Темна"}
            </button>
          )}
          <button className="btn" onClick={()=>setLang(lang==="uk"?"en":"uk")}>{lang==="uk"?"EN":"UK"}</button>
        </div>
      </div>
    </div>
  )
}

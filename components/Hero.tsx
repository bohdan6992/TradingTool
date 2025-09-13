"use client";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export default function Hero(){
  const {theme} = useTheme();
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 p-10 md:p-16 bg-gradient-to-br from-brand/10 to-brand-violet/10">
      <motion.h1 initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.6}}
        className="hero-title">TradingTool</motion.h1>
      <p className="hero-sub mt-2 max-w-2xl">Особистий інструмент для трейдингу: стратегії, статистика, сигнали.</p>
      <div className="absolute -right-6 -bottom-6 w-64 h-64 rounded-full blur-3xl bg-brand/30"></div>
    </div>
  )
}

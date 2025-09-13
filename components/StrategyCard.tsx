"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function StrategyCard({s}:{s:any}){
  return (
    <motion.div whileHover={{y:-4}} className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-brand-violet" />
        <div>
          <div className="font-bold text-lg">{s.name}</div>
          <div className="small">{s.id}</div>
        </div>
      </div>
      <p className="mt-3 text-sm opacity-80 line-clamp-3">{s.description}</p>
      <Link href={`/strategy/${s.id}`} className="btn mt-4 inline-block">Відкрити</Link>
    </motion.div>
  )
}

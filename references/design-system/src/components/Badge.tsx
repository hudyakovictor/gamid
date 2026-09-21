import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  count?: number;
  dot?: boolean;
  children?: ReactNode;
}

export function Badge({ count, dot, children }: Props) {
  if (dot) {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
      </span>
    );
  }

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="el-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-pink px-1 py-0.5 text-[10px] font-bold text-white"
    >
      {children ?? count}
    </motion.span>
  );
}

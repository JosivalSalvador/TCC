"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils/utils";

type SpotlightProps = {
  className?: string;
  fill?: string;
};

export function Spotlight({ className, fill }: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLElement | null>(null);

  const [active, setActive] = useState(false);

  const mouseX = useSpring(0, {
    stiffness: 400,
    damping: 80,
  });

  const mouseY = useSpring(0, {
    stiffness: 400,
    damping: 80,
  });

  const gradient = useTransform(
    [mouseX, mouseY],
    ([x, y]) =>
      `radial-gradient(450px circle at ${x}px ${y}px, ${
        fill ?? "rgba(255,255,255,0.08)"
      }, transparent 50%)`,
  );

  const handleMove = useCallback(
    (e: MouseEvent) => {
      const parent = parentRef.current;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();

      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY],
  );

  useEffect(() => {
    const parent = ref.current?.parentElement;

    if (!parent) return;

    parentRef.current = parent;

    parent.style.position = "relative";
    parent.style.overflow = "hidden";

    const enter = () => setActive(true);
    const leave = () => setActive(false);

    parent.addEventListener("mousemove", handleMove);
    parent.addEventListener("mouseenter", enter);
    parent.addEventListener("mouseleave", leave);

    return () => {
      parent.removeEventListener("mousemove", handleMove);
      parent.removeEventListener("mouseenter", enter);
      parent.removeEventListener("mouseleave", leave);
    };
  }, [handleMove]);

  return (
    <motion.div
      ref={ref}
      className={cn(
        "pointer-events-none absolute inset-0 z-30 rounded-xl opacity-0 transition-opacity duration-300",
        active && "opacity-100",
        className,
      )}
      style={{
        background: gradient,
      }}
    />
  );
}

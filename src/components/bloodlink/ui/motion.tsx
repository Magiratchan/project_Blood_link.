"use client";

import { useEffect, useRef, useState } from "react";
import { motion, type Variants, type Transition } from "framer-motion";

// =============================================================================
// BloodLink — shared Framer Motion variants & helpers.
// Keep animations subtle, professional, and consistent across the app.
// =============================================================================

/** Standard spring used for interactive elements (cards, buttons). */
export const springSoft: Transition = { type: "spring", stiffness: 300, damping: 26, mass: 0.8 };

/** Snappy spring for small UI elements (badges, toggles). */
export const springSnappy: Transition = { type: "spring", stiffness: 500, damping: 30 };

/** Smooth ease for view / panel transitions. */
export const easeSmooth: Transition = { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

/** Container that staggers its children. */
export const staggerContainer = (stagger = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Fade + slide up item (used inside staggered containers). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: easeSmooth },
};

/** Fade + scale in (for cards / badges). */
export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: springSoft },
};

/** Slide in from the left (for timeline / chain steps). */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: easeSmooth },
};

/** Page/view transition wrapper. */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: easeSmooth },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

/** Staggered list container. */
export function StaggerGroup({
  children,
  className,
  stagger = 0.06,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer(stagger, delay)}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

/** Animated list item (use inside <StaggerGroup>). */
export function StaggerItem({
  children,
  className,
  variants = fadeUp,
}: {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
}) {
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

/** Animated progress / score bar — animates width from 0 to `value`%. */
export function AnimatedBar({
  value,
  max = 100,
  className,
  barClassName,
  duration = 0.9,
  delay = 0,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  duration?: number;
  delay?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={className ?? "h-1.5 overflow-hidden rounded-full bg-slate-100"}>
      <motion.div
        className={barClassName ?? "h-full rounded-full"}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/** Animated number that counts up to `value`. */
export function CountUp({
  value,
  suffix = "",
  duration = 1.1,
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const targetRef = useRef(value);
  useEffect(() => {
    targetRef.current = value;
    const start = performance.now();
    const startVal = 0;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(startVal + (targetRef.current - startVal) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(targetRef.current);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <motion.span className={className} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {display.toFixed(decimals)}
      {suffix}
    </motion.span>
  );
}

/** Hover-lift card wrapper for interactive cards. */
export function HoverCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={springSoft}
    >
      {children}
    </motion.div>
  );
}

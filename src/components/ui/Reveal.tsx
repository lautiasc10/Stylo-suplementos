"use client";

import {
  motion,
  useAnimationControls,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ComponentType,
  type ReactNode,
  type Ref,
} from "react";
import { useMotionPreference } from "./use-motion-preference";

const elements = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  header: motion.header,
  footer: motion.footer,
  main: motion.main,
  ul: motion.ul,
  ol: motion.ol,
  li: motion.li,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
};
type Direction = "up" | "left" | "right" | "none";
type Props = Omit<
  HTMLMotionProps<"div">,
  | "children"
  | "initial"
  | "animate"
  | "whileInView"
  | "variants"
  | "transition"
  | "viewport"
  | "onViewportEnter"
> & {
  children: ReactNode;
  as?: keyof typeof elements;
  delay?: number;
  direction?: Direction;
  enterOnMount?: boolean;
};
const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = {
  once: true,
  amount: 0.2,
  margin: "0px 0px -80px 0px",
} as const;

function variants(direction: Direction, delay = 0): Variants {
  const compact =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 800px)").matches;
  return {
    intro: {
      opacity: direction === "none" ? 0.9 : 1,
      x: 0,
      y: direction === "up" ? 12 : 0,
    },
    hidden: {
      opacity: 0,
      x: direction === "left" ? -24 : direction === "right" ? 24 : 0,
      y: direction === "up" ? 24 : 0,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: compact ? 0.4 : 0.6, delay, ease: EASE },
    },
  };
}

// Initial HTML and the first client render are fully visible. Only content
// below the viewport is armed before paint, so hydration cannot flash content
// or hide the first screen. No scroll handlers or per-frame React updates.
function useProgressiveReveal(revision?: string, enterOnMount = false) {
  const ref = useRef<HTMLElement>(null);
  const controls = useAnimationControls();
  const reduced = useMotionPreference();
  const entered = useRef(false);
  const previousRevision = useRef(revision);
  const viewport = useRef({ ...VIEWPORT, amount: 0.2 as number });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const changed = previousRevision.current !== revision;
    previousRevision.current = revision;
    const bounds = node.getBoundingClientRect();
    const disabled = reduced || !window.IntersectionObserver;
    if (disabled || entered.current || changed || bounds.top < innerHeight) {
      const intro = enterOnMount && !entered.current && !disabled && !changed;
      entered.current = true;
      node.dataset.reveal = "visible";
      controls.set(intro ? "intro" : "visible");
      if (intro) void controls.start("visible");
      else if (changed && !disabled) {
        // Filtering never replays the entrance or moves the grid.
        void controls.start({
          opacity: [0.78, 1],
          transition: { duration: 0.2 },
        });
      }
    } else {
      // An unpaginated grid may be taller than five screens. Keep its trigger
      // reachable without observing every card or waiting for an impossible 20%.
      viewport.current.amount = Math.min(
        0.2,
        ((innerHeight - 80) * 0.2) / Math.max(1, bounds.height),
      );
      node.dataset.reveal = "pending";
      controls.set("hidden");
    }
  }, [controls, reduced, revision, enterOnMount]);
  const show = () => {
    entered.current = true;
    if (ref.current) ref.current.dataset.reveal = "visible";
  };
  const focus = () => {
    show();
    controls.set("visible");
  };
  return { ref, controls, reduced, viewport, show, focus };
}

function element(as: keyof typeof elements) {
  return elements[as] as ComponentType<
    Omit<HTMLMotionProps<"div">, "ref"> & { ref?: Ref<HTMLElement> }
  >;
}

export function Reveal({
  as = "div",
  delay = 0,
  direction = "up",
  className = "",
  enterOnMount = false,
  ...props
}: Props) {
  const state = useProgressiveReveal(undefined, enterOnMount);
  const Element = element(as);
  return (
    <Element
      {...props}
      ref={state.ref}
      className={`ui-reveal ${className}`}
      initial={false}
      animate={state.controls}
      whileInView={state.reduced ? undefined : "visible"}
      viewport={state.viewport.current}
      variants={variants(direction, delay)}
      onViewportEnter={state.show}
      onFocusCapture={state.focus}
    />
  );
}

const GroupContext = createContext(false);
export function RevealGroup({
  as = "div",
  delay = 0,
  className = "",
  revision,
  enterOnMount = false,
  ...props
}: Props & { revision?: string }) {
  const state = useProgressiveReveal(revision, enterOnMount);
  const Element = element(as);
  return (
    <GroupContext.Provider value={Boolean(state.reduced)}>
      <Element
        {...props}
        ref={state.ref}
        className={`ui-reveal-group ${className}`}
        initial={false}
        animate={state.controls}
        whileInView={state.reduced ? undefined : "visible"}
        // A grid can be many screens tall, and mobile filters collapse after
        // hydration. Observe its leading edge rather than a fraction of its
        // total area so the first visible row can never remain transparent.
        viewport={{ ...VIEWPORT, amount: "some" }}
        variants={{
          hidden: {},
          intro: {},
          visible: {
            transition: {
              delayChildren: (index: number) =>
                delay +
                Math.min(index, 5) *
                  (typeof window !== "undefined" &&
                  matchMedia("(max-width: 800px)").matches
                    ? 0.06
                    : 0.08),
            },
          },
        }}
        onViewportEnter={state.show}
        onFocusCapture={state.focus}
      />
    </GroupContext.Provider>
  );
}

export function RevealItem({
  as = "div",
  direction = "up",
  delay = 0,
  className = "",
  ...props
}: Props) {
  const reduced = useContext(GroupContext);
  const Element = element(as);
  return (
    <Element
      {...props}
      className={`ui-reveal-item ${className}`}
      initial={false}
      variants={
        reduced
          ? {
              hidden: { opacity: 1, x: 0, y: 0 },
              visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0 } },
            }
          : variants(direction, delay)
      }
    />
  );
}

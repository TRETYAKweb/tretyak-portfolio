import type Lenis from "lenis";

/** Shared Lenis instance (null with reduced motion or before mount). */
let instance: Lenis | null = null;

export const setLenis = (lenis: Lenis | null) => {
  instance = lenis;
};

export const getLenis = () => instance;

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion } from 'motion/react';
import { HERO_IMAGE } from '../data/heroImage';

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------
/** The intro never finishes sooner than this, so it doesn't flash by. */
const MIN_HOLD_MS = 1500;
/** Hard ceiling: on a slow/failed network the site opens anyway. */
const MAX_WAIT_MS = 5000;
/** Show the wordmark even if the display font hasn't arrived by then. */
const FONT_FALLBACK_MS = 1200;
/** Wordmark lifts away and the hairline widens into the full-width slit. */
const SLIT_MS = 450;
/** The two black halves travelling off-screen. */
const OPEN_MS = 1150;
/** The page's own entrance starts this long after the halves begin to move. */
const REVEAL_LEAD_MS = 200;
/** Reduced motion: shorter hold and a plain cross-fade. */
const REDUCED_HOLD_MS = 600;
const REDUCED_FADE_MS = 400;

const PANEL_EASE = [0.76, 0, 0.24, 1] as const;
/** Progress weights (sum to 1); the remainder is the timed hold. */
const W_FONTS = 0.3;
const W_IMAGE = 0.5;
const W_HOLD = 0.2;

type Phase = 'loading' | 'slit' | 'open';

interface PreloaderProps {
  /** The hero may start its own entrance now (fires just after the halves start moving). */
  onReveal: () => void;
  /** Everything is finished; the preloader can be unmounted. */
  onComplete: () => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Resolves when the hero image is decoded (or after `timeoutMs`, or if it fails). */
function preloadHero(timeoutMs: number): Promise<void> {
  const image = new Image();
  image.sizes = HERO_IMAGE.sizes;
  image.srcset = HERO_IMAGE.srcSet;
  image.src = HERO_IMAGE.src;
  return Promise.race([image.decode().catch(() => {}), sleep(timeoutMs)]);
}

/**
 * Minimal intro: a black screen with the wordmark on a centre line whose
 * hairline fills with real load progress. When ready it widens into a
 * full-width slit, then the black splits along it and the halves slide away,
 * revealing the hero.
 */
export function Preloader({ onReveal, onComplete }: PreloaderProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<Phase>('loading');
  const [fontReady, setFontReady] = useState(false);
  const progress = useMotionValue(0);
  // Pixel widths (not CSS functions) so the hairline can animate into the full-width slit.
  const [widths] = useState(() => ({
    resting: Math.min(window.innerWidth * 0.6, 352),
    slit: window.innerWidth,
  }));

  // Keep the latest callbacks without restarting the sequence.
  const callbacks = useRef({ onReveal, onComplete });
  callbacks.current = { onReveal, onComplete };

  useEffect(() => {
    let cancelled = false;
    const started = performance.now();

    // The hero is revealed from the top, and nothing scrolls under the overlay.
    // The lock is done by swallowing scroll input, NOT by toggling `overflow`
    // on <html>/<body>: flipping that on a very tall page forces a full
    // layout/style pass, which froze the screen right as the hero settled.
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const scrollKeys = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);
    const stopDefault = (event: Event) => event.preventDefault();
    const stopKeys = (event: KeyboardEvent) => {
      if (!scrollKeys.has(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation(); // the page's own PageUp/Down nav must not run either
    };
    const stopTouch = (event: Event) => event.stopPropagation(); // and neither must its swipe nav
    window.addEventListener('wheel', stopDefault, { passive: false });
    window.addEventListener('touchmove', stopDefault, { passive: false });
    window.addEventListener('keydown', stopKeys, { capture: true });
    window.addEventListener('touchstart', stopTouch, { capture: true });
    window.addEventListener('touchend', stopTouch, { capture: true });

    const holdMs = reducedMotion ? REDUCED_HOLD_MS : MIN_HOLD_MS;
    let fontsDone = false;
    let imageDone = false;

    // Wordmark waits for the display font so it never flashes in the wrong face.
    void Promise.race([document.fonts.load('500 24px Outfit'), sleep(FONT_FALLBACK_MS)]).then(() => {
      if (!cancelled) setFontReady(true);
    });
    void Promise.race([document.fonts.ready, sleep(MAX_WAIT_MS)]).then(() => {
      fontsDone = true;
    });
    void preloadHero(MAX_WAIT_MS).then(() => {
      imageDone = true;
    });

    // Smoothly chase the real progress so the hairline never jumps or stalls.
    let shown = 0;
    let raf = 0;
    const finished = new Promise<void>((resolve) => {
      const tick = () => {
        if (cancelled) return;
        const elapsed = performance.now() - started;
        const timedOut = elapsed >= MAX_WAIT_MS;
        const target = timedOut
          ? 1
          : (fontsDone ? W_FONTS : 0) +
            (imageDone ? W_IMAGE : 0) +
            W_HOLD * Math.min(1, elapsed / holdMs);
        shown += (target - shown) * 0.1;
        if (target >= 1 && shown > 0.995) shown = 1;
        progress.set(shown);
        if (shown >= 1) resolve();
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });

    const run = async () => {
      await finished;
      if (cancelled) return;
      setPhase('slit');
      await sleep(reducedMotion ? 0 : SLIT_MS);
      if (cancelled) return;
      setPhase('open');
      await sleep(reducedMotion ? 0 : REVEAL_LEAD_MS);
      if (cancelled) return;
      callbacks.current.onReveal();
      await sleep(reducedMotion ? REDUCED_FADE_MS : OPEN_MS - REVEAL_LEAD_MS);
      if (cancelled) return;
      callbacks.current.onComplete();
    };
    void run();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', stopDefault);
      window.removeEventListener('touchmove', stopDefault);
      window.removeEventListener('keydown', stopKeys, { capture: true });
      window.removeEventListener('touchstart', stopTouch, { capture: true });
      window.removeEventListener('touchend', stopTouch, { capture: true });
      history.scrollRestoration = previousRestoration;
    };
  }, [progress, reducedMotion]);

  const opening = phase === 'open';

  const wordmark = (
    <div className="absolute inset-x-0 flex justify-center" style={{ bottom: 'calc(50% + 20px)' }}>
      <motion.span
        initial={{ opacity: 0, filter: 'blur(12px)', letterSpacing: '0.56em', paddingLeft: '0.56em', y: 0 }}
        animate={
          phase === 'loading'
            ? fontReady
              ? { opacity: 1, filter: 'blur(0px)', letterSpacing: '0.42em', paddingLeft: '0.42em', y: 0 }
              : {}
            : { opacity: 0, filter: 'blur(10px)', y: -8 }
        }
        transition={{ duration: phase === 'loading' ? 1.1 : SLIT_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
        className="font-display font-medium text-xl sm:text-2xl uppercase text-white select-none"
      >
        TΛLOS
      </motion.span>
    </div>
  );

  if (reducedMotion) {
    return (
      <motion.div
        aria-hidden="true"
        className="fixed inset-0 z-[100] bg-black"
        animate={{ opacity: opening ? 0 : 1 }}
        transition={{ duration: REDUCED_FADE_MS / 1000 }}
        style={{ pointerEvents: opening ? 'none' : 'auto' }}
      >
        {wordmark}
      </motion.div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100]"
      style={{ pointerEvents: opening ? 'none' : 'auto' }}
    >
      {/* The two black halves. Each carries a faint highlight on its seam edge. */}
      <motion.div
        className="absolute inset-x-0 top-0 h-1/2 bg-black"
        animate={{ y: opening ? '-100%' : '0%' }}
        transition={{ duration: OPEN_MS / 1000, ease: PANEL_EASE }}
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/[0.07]" />
      </motion.div>
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-black"
        animate={{ y: opening ? '100%' : '0%' }}
        transition={{ duration: OPEN_MS / 1000, ease: PANEL_EASE }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.07]" />
      </motion.div>

      {wordmark}

      {/* Hairline on the centre line: fills with load progress, then widens into the slit. */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-px -translate-x-1/2 -translate-y-1/2"
        initial={{ width: widths.resting, opacity: 1 }}
        animate={{
          width: phase === 'loading' ? widths.resting : widths.slit,
          opacity: opening ? 0 : 1,
          boxShadow:
            phase === 'loading'
              ? '0 0 0px 0px rgba(255,255,255,0)'
              : '0 0 22px 2px rgba(255,255,255,0.55)',
        }}
        transition={{
          width: { duration: SLIT_MS / 1000, ease: [0.16, 1, 0.3, 1] },
          boxShadow: { duration: SLIT_MS / 1000 },
          opacity: { duration: 0.35, ease: 'easeOut' },
        }}
      >
        <div className="absolute inset-0 bg-white/15" />
        <motion.div className="absolute inset-0 origin-left bg-white/90" style={{ scaleX: progress }} />
      </motion.div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  usePresence,
  useTransform,
} from 'motion/react';
import { X } from 'lucide-react';
import { FeatureCopy } from './FeatureCopy';
import { TALOS_FEATURES } from './featuresData';
import { PhoneMockup } from './PhoneMockup';
import { PhoneVideo } from './PhoneVideo';
import { StageBackdrop } from './StageBackdrop';
import {
  COMPACT_PHONE_BAND,
  FEATURES_COMPACT_PHONE,
  FEATURES_ENTER,
  FEATURES_EXIT,
  FEATURES_STAGES,
  FEATURES_VH,
  SCROLL_SPRING,
  STAGE_BACKGROUND,
} from './productStory.config';
import { useIsDesktop } from './useIsDesktop';

/** Which feature stage owns overlay progress `value` (0–1). */
function stageIndexFor(value: number): number {
  const index = FEATURES_STAGES.findIndex(
    (stage) => value >= stage.range[0] && value < stage.range[1]
  );
  return index === -1 ? FEATURES_STAGES.length - 1 : index;
}

interface FeaturesOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "View the features": a full-screen overlay with its OWN native scroller.
 * Scrolling inside it drives feature stages (the phone video and the left
 * copy switch together). Because the scroll is confined to this overlay
 * (`overscroll-contain`, page scroll pinned), users can never scroll on into
 * the Insights carousel — they leave via the X button or Escape.
 */
export function FeaturesOverlay({ open, onClose }: FeaturesOverlayProps) {
  return createPortal(
    <AnimatePresence>{open && <OverlayContent onClose={onClose} />}</AnimatePresence>,
    document.body
  );
}

function OverlayContent({ onClose }: { onClose: () => void }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const unusedPhoneVideoRef = useRef<HTMLVideoElement | null>(null);

  const reducedMotion = useReducedMotion() ?? false;
  const isDesktop = useIsDesktop();

  const { scrollYProgress } = useScroll({
    container: scrollerRef,
    target: innerRef,
    offset: ['start start', 'end end'],
  });
  const progress = useSpring(scrollYProgress, SCROLL_SPRING);

  // Desktop: the scroll position picks the feature. Compact (phones/tablets):
  // there is no scrolling here at all, the capsules are tapped instead.
  const [scrollIndex, setScrollIndex] = useState(0);
  const [tappedIndex, setTappedIndex] = useState(0);
  useMotionValueEvent(progress, 'change', (value) => setScrollIndex(stageIndexFor(value)));
  const activeIndex = isDesktop ? scrollIndex : tappedIndex;

  // Time-based entrance: the phone glides right and the first feature's copy
  // comes in as soon as the overlay opens.
  const enter = useMotionValue(reducedMotion ? 1 : 0);
  const [isPresent, safeToRemove] = usePresence();
  useEffect(() => {
    if (reducedMotion) {
      if (!isPresent) safeToRemove?.();
      return;
    }
    // Entering: glide out to the features layout. Leaving: the copy fades
    // first (it keys off `enter`), the phone glides back to center, and only
    // then is the overlay allowed to unmount (its own fade runs alongside).
    const controls = animate(enter, isPresent ? 1 : 0, {
      duration: isPresent ? FEATURES_ENTER.durationS : FEATURES_EXIT.glideBackS,
      ease: [0.16, 1, 0.3, 1],
    });
    if (!isPresent) controls.then(() => safeToRemove?.());
    return () => controls.stop();
  }, [enter, isPresent, reducedMotion, safeToRemove]);

  const phoneOpacity = useMotionValue(1);
  // Compact: the phone starts in the story's own band (no jump on open), then
  // shrinks and moves so it fills the space above the copy block.
  const compactTarget = () => {
    const H = window.innerHeight;
    const cfg = FEATURES_COMPACT_PHONE;
    const pad = Math.min(cfg.copyBottom.maxPx, Math.max(cfg.copyBottom.minPx, H * cfg.copyBottom.vh));
    const bottom = H - pad - cfg.copyHeightPx - cfg.gapPx;
    const height = Math.max(120, bottom - cfg.topPx);
    const bandHeight = H * (1 - (COMPACT_PHONE_BAND.topPct + COMPACT_PHONE_BAND.bottomPct) / 100);
    const bandCenter = H * ((COMPACT_PHONE_BAND.topPct + (100 - COMPACT_PHONE_BAND.bottomPct)) / 200);
    return {
      scale: Math.min(1, height / bandHeight),
      dy: cfg.topPx + height / 2 - bandCenter,
    };
  };
  const phoneScale = useTransform(enter, (v) =>
    isDesktop ? 1 : 1 - v * (1 - compactTarget().scale)
  );
  const phoneY = useTransform(enter, (v) => (isDesktop ? 0 : v * compactTarget().dy));
  const phoneX = useTransform(enter, (v) =>
    isDesktop ? `${v * FEATURES_ENTER.phoneShiftVw}vw` : '0vw'
  );
  const copyOpacity = useTransform(enter, [0.25, 1], [0, 1]);
  const hintOpacity = useTransform(
    [progress, enter],
    ([p, e]) => (1 - Math.min(1, (p as number) / 0.04)) * (e as number)
  );

  // Focus the scroller so arrow keys / PageUp-Down / Space scroll it, not the page.
  useEffect(() => {
    scrollerRef.current?.focus({ preventScroll: true });
  }, []);

  // Escape leaves.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Belt and braces: if a browser lacks `overscroll-behavior: contain` and
  // chains scroll to the page, pin the page where it was.
  useEffect(() => {
    const pinnedY = window.scrollY;
    const onScroll = () => {
      if (window.scrollY !== pinnedY) window.scrollTo(0, pinnedY);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Product features"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={
        reducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              scale: 1.015,
              filter: 'blur(6px)',
              transition: {
                duration: FEATURES_EXIT.fadeS,
                delay: FEATURES_EXIT.fadeDelayS,
                ease: [0.4, 0, 0.2, 1],
              },
            }
      }
      transition={{ duration: FEATURES_ENTER.fadeS, ease: 'easeOut' }}
      // React events bubble through portals: keep the page's swipe-nav
      // handlers (on ParallaxExperience) from seeing touches made here.
      onTouchStart={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
      className="fixed inset-0 z-[45] text-white"
      style={{ backgroundColor: STAGE_BACKGROUND.base }}
    >
      <div
        ref={scrollerRef}
        tabIndex={-1}
        className={`absolute inset-0 overscroll-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          isDesktop ? 'overflow-y-auto' : 'overflow-hidden'
        }`}
      >
        <div
          ref={innerRef}
          style={{ height: isDesktop ? `${FEATURES_VH}vh` : '100svh' }}
          className="relative"
        >
          <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
            <StageBackdrop carryOver={false} />

            {/* Phone: same size/position as the story's, then glides right (desktop)
                / up into the top half (compact) */}
            <div
              className="absolute inset-x-0 z-20 flex items-center justify-center"
              style={
                isDesktop
                  ? { top: 0, bottom: 0 }
                  : { top: `${COMPACT_PHONE_BAND.topPct}%`, bottom: `${COMPACT_PHONE_BAND.bottomPct}%` }
              }
            >
              <motion.div style={{ x: phoneX }} className={isDesktop ? undefined : 'h-full'}>
                <PhoneMockup
                  opacity={phoneOpacity}
                  scale={phoneScale}
                  y={phoneY}
                  sizeClassName={isDesktop ? undefined : 'h-full'}
                >
                  <PhoneVideo
                    videoRef={unusedPhoneVideoRef}
                    stages={FEATURES_STAGES}
                    activeStageIndex={activeIndex}
                    load
                    opacity={phoneOpacity}
                    playWhenActive={!reducedMotion}
                  />
                </PhoneMockup>
              </motion.div>
            </div>

            {/* Left copy (desktop) / bottom copy over a scrim (mobile) */}
            <motion.div
              style={{ opacity: copyOpacity }}
              className="absolute inset-0 z-30 pointer-events-none"
            >
              <div
                className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 to-transparent lg:hidden"
                aria-hidden="true"
              />
              <div className="relative mx-auto h-full max-w-7xl px-6 sm:px-12 lg:px-16 grid lg:grid-cols-12 items-end lg:items-center pb-[clamp(2.75rem,9svh,6rem)] lg:pb-0">
                <div className="lg:col-start-1 lg:col-span-5 flex justify-center lg:justify-start">
                  <FeatureCopy activeIndex={activeIndex} showProgress={isDesktop} />
                </div>
              </div>
            </motion.div>

            {/* Scroll hint: text only, fades once you start scrolling. */}
            <motion.div
              style={{ opacity: hintOpacity, display: isDesktop ? undefined : 'none' }}
              className="absolute bottom-5 left-0 right-0 z-30 flex justify-center pointer-events-none select-none"
              aria-hidden="true"
            >
              <span className="block text-center pl-[0.2em] text-[9px] uppercase tracking-[0.2em] font-medium text-white/50">
                SCROLL
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Compact: pick a feature with 1 / 2 / 3, inline with the close button */}
      {!isDesktop && (
        <motion.div
          style={{ opacity: copyOpacity }}
          className="absolute top-6 left-6 sm:top-8 sm:left-8 z-50 flex h-14 items-center gap-2"
          role="tablist"
          aria-label="Features"
        >
          {TALOS_FEATURES.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Feature ${index + 1}: ${item.title}`}
                onClick={() => setTappedIndex(index)}
                className={`glass flex h-11 w-11 items-center justify-center rounded-full font-display text-sm font-medium transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                  isActive
                    ? 'text-white !border-emerald-400/50 !bg-emerald-500/20 shadow-[0_0_18px_rgba(34,197,94,0.25)]'
                    : 'text-white/55 hover:text-white hover:bg-white/10'
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </motion.div>
      )}

      <button
        id="close-features-overlay-btn"
        type="button"
        onClick={onClose}
        className="glass group absolute top-6 right-6 sm:top-8 sm:right-8 z-50 flex items-center justify-center w-14 h-14 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Close features"
      >
        <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
      </button>
    </motion.div>
  );
}

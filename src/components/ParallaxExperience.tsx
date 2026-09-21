import { lazy, Suspense, useState, useRef, useEffect, useCallback, TouchEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useScroll, AnimatePresence } from 'motion/react';
import { Check, X } from 'lucide-react';
import { PioneerLogo } from './PioneerLogo';
import { ParticleField } from './ParticleField';
import { ConstellationCanvas } from './ConstellationCanvas';
import { HorizontalTextScrollSection } from './HorizontalTextScrollSection';
import { PlaceholderSection2 } from './PlaceholderSection2';
import { LiquidPullText } from './LiquidPullText';
import { HeroTextAtmosphere } from './HeroTextAtmosphere';
import { ExploreLibraryButton } from './ExploreLibraryButton';
import { GeneticTraitSidePanel } from './GeneticTraitTooltip';
import { CornSeedTrait } from '../data/cornTraits';
import { getTraitAtmosphere } from '../utils/traitAtmosphere';
import { HERO_IMAGE } from '../data/heroImage';
import {
  heroHeadlineVariants,
  heroLineVariants,
  heroSubtitleVariants,
  sectionContentVariants,
  headlineLineVariants,
  paragraphVariants,
  featureListContainerVariants,
  featureItemVariants,
  exploreButtonVariants,
} from './entranceVariants';
import { ProductStoryStage } from './product-story/ProductStoryStage';
import { StageBackdrop } from './product-story/StageBackdrop';
import { useIsDesktop } from './product-story/useIsDesktop';
import {
  DOWNLOAD_CARRYOVER,
  INSIGHTS_BACKGROUND,
  STORY_HANDOFF_VH,
  getStoryLayout,
} from './product-story/productStory.config';

// Only needed once the story is on screen, so it stays out of the entry chunk.
const FeaturesOverlay = lazy(() =>
  import('./product-story/FeaturesOverlay').then((m) => ({ default: m.FeaturesOverlay }))
);

interface SlideData {
  headline: string[];
  description: string;
  features: string[];
}

const SLIDES: SlideData[] = [
  {
    headline: ['Learn The Moves', 'You Want'],
    description:
      "Whatever skill you want to learn, Talos has a structured path to get you there. With every phase mapped out so you always know exactly what to train next.",
    features: [
    ],
  },
  {
    headline: ['PREDICTIVE', 'GENOMICS IN', 'ACTION.'],
    description:
      'By analyzing billions of genetic combinations before a single seedling is planted, our machine-learning models isolate high-yield vigor, drought tolerance, and disease resistance with unprecedented precision.',
    features: [
      'Billions of genetic marker permutations evaluated',
      'Pinpoint isolation of drought vigor & disease resistance',
      'Precision hybrid selection prior to in-ground planting',
    ],
  },
  {
    headline: ['ACCELERATING', 'FIELD-READY', 'VELOCITY.'],
    description:
      'What used to take an entire decade of physical crop trials now happens in virtual cycles in a matter of months. Farmers receive optimized, battle-tested hybrid varieties years ahead of traditional breeding cycles.',
    features: [
      'Decade-long physical trial cycles compressed into virtual months',
      'Simulated across diverse climate & soil micro-profiles',
      'High-performing commercial seed delivered seasons ahead',
    ],
  },
];


// 4-Section Scroll Track (Hero -> Computers & Simulations -> Qrome Products
// [+ Agronomic Insights handoff within it] -> Placeholder 2).
//
// Hero, Contenders, and Qrome Products' own reveal (Cut 1, Cut 2, K1, K2)
// have been stable throughout this build and are untouched below. Everything
// AFTER Qrome is fully revealed is instead built from plain, named VH
// lengths — not derived fractions of each other — specifically because that
// area needed several rounds of "a bit more/less space here" corrections.
// Adjusting the pacing going forward should only ever mean changing one of
// these numbers, with no other formula to recompute by hand.
const HERO_VH = 240;
const CONTENDERS_VH = 240; // Contenders revealed & Cut 2 transition into the Product Story
// Product Story (video shrinks into a pinned phone, then headline + button).
// STORY_VH / STORY_HANDOFF_VH live in product-story/productStory.config.ts.
const CAROUSEL_VH = 340; // horizontal carousel scroll-through, 5 slides
const GAP_2_VH = 45; // breathing room after the carousel ends
const CUT3_VH = 240; // diagonal wipe into Section 4 — same width as Cut 1 / Cut 2

// Everything below is derived from the story's length, which differs between
// desktop (video-shrinks-into-phone intro) and compact screens (phone only).
function getTrackLayout(storyVh: number) {
  const TRACK_VH =
    HERO_VH +
    CONTENDERS_VH +
    storyVh +
    CAROUSEL_VH +
    GAP_2_VH +
    CUT3_VH;

  const K1 = HERO_VH / TRACK_VH;
  const K2 = (HERO_VH + CONTENDERS_VH) / TRACK_VH;
  // Where Cut 2 has finished revealing the story wrapper (its entry settles here).
  const SETTLE = K1 + 0.58 * (K2 - K1);
  // The story owns [STORY_START, STORY_END]; its last STORY_HANDOFF_VH is the
  // continuous slide-up into Agronomic Insights.
  const STORY_START = K2;
  const STORY_END = (HERO_VH + CONTENDERS_VH + storyVh) / TRACK_VH;
  const HANDOFF_START = STORY_END - STORY_HANDOFF_VH / TRACK_VH;
  const HANDOFF_END = STORY_END;
  const CAROUSEL_START = STORY_END;
  const CAROUSEL_END = (HERO_VH + CONTENDERS_VH + storyVh + CAROUSEL_VH) / TRACK_VH;
  const CUT3_START =
    (HERO_VH + CONTENDERS_VH + storyVh + CAROUSEL_VH + GAP_2_VH) /
    TRACK_VH;
  const K3 = 1.0;
  return {
    TRACK_VH, K1, K2, SETTLE, STORY_START, STORY_END, HANDOFF_START, HANDOFF_END,
    CAROUSEL_START, CAROUSEL_END, CUT3_START, K3,
  };
}

/**
 * The scroll track's length depends on the breakpoint, so cross it and the
 * whole experience remounts with the right layout (rare: only on resize).
 */
export function ParallaxExperience({ siteReady = true }: { siteReady?: boolean }) {
  const compact = !useIsDesktop();
  return (
    <ParallaxTrack key={compact ? 'compact' : 'desktop'} compact={compact} siteReady={siteReady} />
  );
}

interface ParallaxTrackProps {
  compact: boolean;
  /** False while the preloader covers the page; the hero's entrance waits for it. */
  siteReady: boolean;
  key?: string;
}

function ParallaxTrack({ compact, siteReady }: ParallaxTrackProps) {
  const storyLayout = getStoryLayout(compact);
  const {
    TRACK_VH, K1, K2, SETTLE, STORY_START, STORY_END, HANDOFF_START, HANDOFF_END,
    CAROUSEL_START, CAROUSEL_END, CUT3_START, K3,
  } = getTrackLayout(storyLayout.storyVh);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isExploreActive, setIsExploreActive] = useState(false);
  const [isFeaturesExploreActive, setIsFeaturesExploreActive] = useState(false);
  const [selectedGeneticTrait, setSelectedGeneticTrait] = useState<CornSeedTrait | null>(null);
  const activeTraitAtmosphere = getTraitAtmosphere(selectedGeneticTrait);
  const currentSlide = 0;
  const [isHeroRevealed, setIsHeroRevealed] = useState(true);
  const [isSectionRevealed, setIsSectionRevealed] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Lock vertical scrolling completely while explore mode is active
  // without modifying body overflow so the page scroll position is never reset
  useEffect(() => {
    if (!isExploreActive) {
      setSelectedGeneticTrait(null);
      return;
    }

    const preventScrollWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    const preventScrollTouch = (e: globalThis.TouchEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedGeneticTrait) {
          setSelectedGeneticTrait(null);
        } else {
          setIsExploreActive(false);
        }
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', preventScrollWheel, { passive: false });
    window.addEventListener('touchmove', preventScrollTouch, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', preventScrollWheel);
      window.removeEventListener('touchmove', preventScrollTouch);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExploreActive, selectedGeneticTrait]);

  // Scroll tracking across the scroll track
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // =========================================================================
  // SPRING-BASED INERTIA PHYSICS FOR RESPONSIVE, WEIGHTED PARALLAX
  // =========================================================================
  const diagonalCutSpring = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 30,
    mass: 0.5,
    restDelta: 0.0001,
  });

  // Smooth cinematic inertia physics for background parallax and ambient transforms
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 30,
    mass: 0.5,
    restDelta: 0.0001,
  });

  // Track active section index based on scroll progress. Switches as soon as
  // each transition's diagonal cut is actually visible, not at the full
  // K1/HANDOFF_START boundary — matching the same 0.35 fraction already used
  // elsewhere (isNavHidden below) for "this
  // section has visibly started appearing."
  useEffect(() => {
    const section2Start = K1 + 0.35 * (K2 - K1);
    const unsubscribe = smoothProgress.on('change', (p) => {
      if (p < 0.35 * K1) {
        setActiveSectionIndex(0);
      } else if (p < section2Start) {
        setActiveSectionIndex(1);
      } else if (p < CUT3_START) {
        setActiveSectionIndex(2);
      } else {
        setActiveSectionIndex(3);
      }
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  // Story video loads only once the story is close, and stops after it hands
  // off to the Insights carousel.
  const isDesktop = !compact;
  // The header's glass pill re-blurs the (still animating) hero behind it on
  // every frame of its fade-in, which stutters; skip the blur until it lands.
  const [isHeaderSettled, setIsHeaderSettled] = useState(false);
  const [isStoryNear, setIsStoryNear] = useState(false);
  // Latches on the first approach so the overlay chunk loads before the button
  // is reachable, then stays mounted (its exit animation needs it).
  const [featuresLoaded, setFeaturesLoaded] = useState(false);
  useEffect(() => {
    if (isStoryNear) setFeaturesLoaded(true);
  }, [isStoryNear]);
  useEffect(() => {
    const unsubscribe = smoothProgress.on('change', (p) => {
      setIsStoryNear(p > 0.6 * K1 && p < CAROUSEL_START + 0.02);
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  // Canvas animations only run while their section can be seen. Thresholds
  // sit slightly outside each section's visible span so nothing freezes
  // on-screen during a cut.
  const [isHeroActive, setIsHeroActive] = useState(true);
  const [isConstellationActive, setIsConstellationActive] = useState(false);
  const [isDownloadActive, setIsDownloadActive] = useState(false);
  useEffect(() => {
    const unsubscribe = smoothProgress.on('change', (p) => {
      setIsHeroActive(p < 0.62 * K1);
      setIsConstellationActive(p > 0.05 * K1 && p < K2 + 0.02);
      setIsDownloadActive(p >= CUT3_START - 0.02);
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  // Floating nav dots visibility: earlier/finer thresholds than
  // activeSectionIndex's full section boundaries — Contenders is already
  // visible well before K1 (Cut 1 finishes revealing it partway through
  // [0, K1]), and Section 4 similarly starts appearing partway through Cut 3,
  // so gating on the full K1/CUT3_START boundaries made the nav pop in late.
  const [isNavHidden, setIsNavHidden] = useState(true);
  useEffect(() => {
    const unsubscribe = smoothProgress.on('change', (p) => {
      const show = p >= 0.35 * K1 && p < CUT3_START + 0.2 * (K3 - CUT3_START);
      setIsNavHidden(!show);
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  // Trigger entrance animations for Hero, Section 2 (Contenders), and Section 3 (Qrome Products)
  // Both when scrolling down into each section AND when scrolling back up into each section
  useEffect(() => {
    const checkRevealed = (val: number) => {
      // 1. Hero (Section 1)
      if (val < 0.38 * K1) {
        setIsHeroRevealed(true);
      } else if (val >= 0.46 * K1) {
        setIsHeroRevealed(false);
      }

      // 2. Contenders (Section 2)
      if (val >= 0.52 * K1 && val < K1 + 0.46 * (K2 - K1)) {
        setIsSectionRevealed(true);
      } else if (val < 0.44 * K1 || val >= K1 + 0.52 * (K2 - K1)) {
        setIsSectionRevealed(false);
      }
    };
    checkRevealed(diagonalCutSpring.get());
    const unsubscribe = diagonalCutSpring.on('change', checkRevealed);
    return () => unsubscribe();
  }, [diagonalCutSpring]);

  // Mouse tilt tracking for the Hero section
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 28, stiffness: 105, mass: 0.7 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // 3D Tilt angles for Hero stage background assets
  const heroRotateX = useTransform(smoothMouseY, [-1, 1], [3.5, -3.5]);
  const heroRotateY = useTransform(smoothMouseX, [-1, 1], [-4.5, 4.5]);

  // 3D Tilt angles & mouse-follow displacements for Hero headline container (editorial depth-aware feel)
  const headlineRotateX = useTransform(smoothMouseY, [-1, 1], [3.2, -3.2]);
  const headlineRotateY = useTransform(smoothMouseX, [-1, 1], [-4.2, 4.2]);
  const headlineTranslateX = useTransform(smoothMouseX, [-1, 1], [-10, 10]);
  const headlineTranslateY = useTransform(smoothMouseY, [-1, 1], [-6, 6]);

  // Deep Background Layer Parallax (Hero mouse displacement)
  const heroMouseBgX = useTransform(smoothMouseX, [-1, 1], [20, -20]);
  const heroMouseBgY = useTransform(smoothMouseY, [-1, 1], [14, -14]);

  // Midground Particle Field Parallax (Intermediate floating drift)
  const heroMouseParticlesX = useTransform(smoothMouseX, [-1, 1], [-12, 12]);
  const heroMouseParticlesY = useTransform(smoothMouseY, [-1, 1], [-8, 8]);

  // Dynamic light reflection hotspot for Hero
  const lightX = useTransform(smoothMouseX, [-1, 1], ['28%', '72%']);
  const lightY = useTransform(smoothMouseY, [-1, 1], ['28%', '72%']);
  // Same hotspot for the hero, moved with a transform (GPU) rather than by
  // rewriting a full-screen gradient string every frame (repaint).
  const lightShiftX = useTransform(smoothMouseX, [-1, 1], ['-15%', '15%']);
  const lightShiftY = useTransform(smoothMouseY, [-1, 1], ['-15%', '15%']);

  // =========================================================================
  // WEIGHTED DIAGONAL CUT-IN TRANSITION GEOMETRY (TRANSITION 1: HERO -> CONTENDERS)
  // =========================================================================
  const cut1Left = useTransform(
    diagonalCutSpring,
    [0, 0.08 * K1, 0.38 * K1, 0.58 * K1, K1],
    [135, 125, 50, -12, -22]
  );
  const cut1Right = useTransform(
    diagonalCutSpring,
    [0, 0.08 * K1, 0.38 * K1, 0.58 * K1, K1],
    [110, 100, 25, -38, -48]
  );

  const clipPathString1 = useTransform(
    [cut1Left, cut1Right],
    ([left, right]) => `polygon(0% ${left}%, 100% ${right}%, 100% 100%, 0% 100%)`
  );

  // =========================================================================
  // WEIGHTED DIAGONAL CUT-IN TRANSITION GEOMETRY (TRANSITION 2: CONTENDERS -> QROME PRODUCTS)
  // =========================================================================
  const cut2Left = useTransform(
    diagonalCutSpring,
    [K1, K1 + 0.08 * (K2 - K1), K1 + 0.38 * (K2 - K1), K1 + 0.58 * (K2 - K1), K2],
    [135, 125, 50, -12, -22]
  );
  const cut2Right = useTransform(
    diagonalCutSpring,
    [K1, K1 + 0.08 * (K2 - K1), K1 + 0.38 * (K2 - K1), K1 + 0.58 * (K2 - K1), K2],
    [110, 100, 25, -38, -48]
  );

  const clipPathString2 = useTransform(
    [cut2Left, cut2Right],
    ([left, right]) => `polygon(0% ${left}%, 100% ${right}%, 100% 100%, 0% 100%)`
  );

  // =========================================================================
  // WEIGHTED DIAGONAL CUT-IN TRANSITION GEOMETRY (TRANSITION 3: QROME/INSIGHTS -> PLACEHOLDER 2)
  // Exactly the same shape/width as Transitions 1 & 2 (CUT3_VH), starting
  // only at CUT3_START — well after the Insights carousel has finished
  // (CAROUSEL_END) plus its own GAP_2_VH breathing room.
  // =========================================================================
  const cut3Left = useTransform(
    diagonalCutSpring,
    [CUT3_START, CUT3_START + 0.08 * (K3 - CUT3_START), CUT3_START + 0.38 * (K3 - CUT3_START), CUT3_START + 0.58 * (K3 - CUT3_START), K3],
    [135, 125, 50, -12, -22]
  );
  const cut3Right = useTransform(
    diagonalCutSpring,
    [CUT3_START, CUT3_START + 0.08 * (K3 - CUT3_START), CUT3_START + 0.38 * (K3 - CUT3_START), CUT3_START + 0.58 * (K3 - CUT3_START), K3],
    [110, 100, 25, -38, -48]
  );

  const clipPathString3 = useTransform(
    [cut3Left, cut3Right],
    ([left, right]) => `polygon(0% ${left}%, 100% ${right}%, 100% 100%, 0% 100%)`
  );

  // =========================================================================
  // SECTION 1 (HERO) PARALLAX DISPLACEMENTS UNDER THE CUT
  // =========================================================================
  const heroScrollBgY = useTransform(smoothProgress, [0, 0.55 * K1], ['0%', '20%']);
  const heroBgScale = useTransform(smoothProgress, [0, 0.55 * K1], [1.06, 1.22]);
  const heroBgOpacity = useTransform(smoothProgress, [0.42 * K1, 0.58 * K1], [1, 0]);

  const heroScrollTextY = useTransform(smoothProgress, [0, 0.55 * K1], ['0%', '-35%']);
  const heroTextScale = useTransform(smoothProgress, [0, 0.55 * K1], [1.0, 0.90]);
  const heroTextOpacity = useTransform(smoothProgress, [0.36 * K1, 0.52 * K1], [1, 0]);

  // Hero Particles: glide upward
  const heroParticlesY = useTransform(smoothProgress, [0, 0.55 * K1], ['0%', '-90%']);

  // Combined vertical offsets for Hero background and particle elements
  const combinedHeroBgY = useTransform(
    [heroMouseBgY, heroScrollBgY],
    ([my, sy]) => `calc(${my}px + ${sy})`
  );

  const combinedHeroParticlesY = useTransform(
    [heroMouseParticlesY, heroParticlesY],
    ([my, sy]) => `calc(${my}px + ${sy})`
  );

  // =========================================================================
  // SECTION 2 (CONTENDERS) PARALLAX DISPLACEMENTS INSIDE CUT 1 / UNDER CUT 2
  // =========================================================================
  const contendersBgY = useTransform(smoothProgress, [0.10 * K1, 0.84 * K1], ['20%', '0%']);
  const contendersBgScale = useTransform(smoothProgress, [0.10 * K1, 0.84 * K1], [1.14, 1.0]);

  // As Cut 2 sweeps in, Section 2 sinks slightly
  const contendersSinkY = useTransform(smoothProgress, [K1, K2], ['0%', '16%']);
  const contendersSinkScale = useTransform(smoothProgress, [K1, K2], [1.0, 1.08]);

  // Constellation Canvas traverses vertically
  const contendersCanvasY = useTransform(smoothProgress, [0.10 * K1, 0.90 * K1], ['22%', '-22%']);

  // Typography rises gracefully into view
  const contendersTextY = useTransform(smoothProgress, [0.46 * K1, 0.58 * K1], ['20%', '0%']);
  const contendersTextOpacity = useTransform(
    smoothProgress,
    [0.46 * K1, 0.58 * K1, K1 + 0.35 * (K2 - K1), K1 + 0.48 * (K2 - K1)],
    [0, 1, 1, 0]
  );

  // Section 2 Mouse displacement parallax
  const contendersMouseBgX = useTransform(smoothMouseX, [-1, 1], [14, -14]);
  const contendersMouseBgY = useTransform(smoothMouseY, [-1, 1], [10, -10]);
  const combinedContendersBgY = useTransform(
    [contendersMouseBgY, contendersBgY, contendersSinkY],
    ([my, sy, ey]) => `calc(${my}px + ${sy} + ${ey})`
  );
  const combinedContendersBgScale = useTransform(
    [contendersBgScale, contendersSinkScale],
    ([a, b]) => (a as number) * (b as number)
  );

  const contendersMouseTextX = useTransform(smoothMouseX, [-1, 1], [-8, 8]);
  const contendersMouseTextY = useTransform(smoothMouseY, [-1, 1], [-6, 6]);
  const combinedContendersTextY = useTransform(
    [contendersMouseTextY, contendersTextY],
    ([my, sy]) => `calc(${my}px + ${sy})`
  );

  // =========================================================================
  // SECTION 3 (PRODUCT STORY): LOCAL 0 -> 1 PROGRESS
  // =========================================================================
  // The story runs on its own slice of the track (STORY_START..STORY_END) and
  // receives a local, already-smoothed progress value — the video intro, the
  // pinned phone and the end-of-scroll text all key off this one number.
  const storyProgress = useTransform(smoothProgress, [STORY_START, STORY_END], [0, 1], {
    clamp: true,
  });
  // The opening video frame's entrance plays out over the tail of the Cut 2
  // wipe (before the story's own progress begins at STORY_START).
  const storyEntrance = useTransform(
    smoothProgress,
    [K1 + 0.4 * (K2 - K1), STORY_START],
    [0, 1],
    { clamp: true }
  );

  // =========================================================================
  // GLOBAL BACKGROUND GRADIENT & COLOR GRADING TRANSFORMS
  // =========================================================================
  // Neutral near-black color grading (matching the Talos app's flat #050505
  // background) instead of the previous emerald-to-blue hue shift.
  const globalGradTop = useTransform(
    smoothProgress,
    [0, 0.35 * K1, 0.70 * K1],
    ['#0a0a0a', '#080808', '#0c0c0c']
  );
  const globalGradMid = useTransform(
    smoothProgress,
    [0, 0.35 * K1, 0.70 * K1],
    ['#050505', '#040404', '#060606']
  );
  const globalGradBase = useTransform(
    smoothProgress,
    [0, 0.35 * K1, 0.70 * K1],
    ['#020202', '#010101', '#020202']
  );
  const globalGlowColor = useTransform(
    smoothProgress,
    [0, 0.35 * K1, 0.70 * K1],
    [
      'rgba(255, 255, 255, 0.08)',
      'rgba(255, 255, 255, 0.05)',
      'rgba(255, 255, 255, 0.04)',
    ]
  );

  const globalBgGradient = useTransform(
    [globalGradTop, globalGradMid, globalGradBase],
    ([top, mid, base]) =>
      `radial-gradient(135% 125% at 50% 18%, ${top} 0%, ${mid} 54%, ${base} 100%)`
  );

  // Active interaction triggers
  const heroPointerEvents = useTransform(smoothProgress, (p) => (p < 0.46 * K1 ? 'auto' : 'none'));
  const contendersPointerEvents = useTransform(smoothProgress, (p) =>
    p >= 0.52 * K1 && p < K1 + 0.50 * (K2 - K1) ? 'auto' : 'none'
  );
  // Section 3 (Qrome Products + Insights) clipped container remains interactive until Section 4 wipe
  const sectionThreePointerEvents = useTransform(smoothProgress, (p) =>
    p >= K1 + 0.35 * (K2 - K1) && p < CUT3_START ? 'auto' : 'none'
  );

  // Section 3 (Product Story) wrapper:
  // - Enters by rising into view from 24% as Cut 2 sweeps across (settles at SETTLE)
  // - Stays pinned while the story plays out
  // - In the last STORY_HANDOFF_VH scrolls continuously upward into Insights (0% -> -100%)
  const placeholderContentY = useTransform(
    smoothProgress,
    [K1 + 0.35 * (K2 - K1), SETTLE, HANDOFF_START, HANDOFF_END],
    ['24%', '0%', '0%', '-100%']
  );
  const placeholderContentOpacity = useTransform(
    smoothProgress,
    [
      K1 + 0.35 * (K2 - K1),
      K1 + 0.48 * (K2 - K1),
      HANDOFF_START + 0.12 * (HANDOFF_END - HANDOFF_START),
      HANDOFF_END,
    ],
    [0, 1, 1, 0]
  );
  const placeholderContentPointerEvents = useTransform(smoothProgress, (p) =>
    p >= K1 + 0.35 * (K2 - K1) && p < HANDOFF_START + 0.45 * (HANDOFF_END - HANDOFF_START) ? 'auto' : 'none'
  );

  // Agronomic Insights scrolls directly into place from below simultaneously (100% -> 0%)
  const insightsEntryProgress = useTransform(
    smoothProgress,
    [HANDOFF_START, HANDOFF_END],
    [0, 1]
  );
  const insightsExitProgress = useTransform(
    smoothProgress,
    [CAROUSEL_END, CUT3_START],
    [0, 1]
  );

  const insightsBackdropOpacity = useTransform(smoothProgress, [HANDOFF_START, HANDOFF_END], [0, 1], {
    clamp: true,
  });
  // Warm wash + glow + faint download image at the bottom edge: eases in over the last stretch of
  // the carousel and the gap before Cut 3, so the next scene is foreshadowed.
  const downloadCarryOverOpacity = useTransform(
    smoothProgress,
    [CAROUSEL_END - DOWNLOAD_CARRYOVER.leadProgress, CUT3_START],
    [0, 1],
    { clamp: true }
  );
  const insightsContentY = useTransform(
    smoothProgress,
    [HANDOFF_START, HANDOFF_END, CAROUSEL_END, CUT3_START],
    ['100%', '0%', '0%', '-36px']
  );
  const insightsContentOpacity = useTransform(
    smoothProgress,
    [HANDOFF_START, HANDOFF_START + 0.45 * (HANDOFF_END - HANDOFF_START), CAROUSEL_END, CUT3_START],
    [0, 1, 1, 0]
  );
  const insightsContentScale = useTransform(
    smoothProgress,
    [HANDOFF_START, HANDOFF_END, CAROUSEL_END, CUT3_START],
    [0.94, 1.0, 1.0, 0.96]
  );
  const insightsContentPointerEvents = useTransform(smoothProgress, (p) =>
    p >= HANDOFF_START + 0.45 * (HANDOFF_END - HANDOFF_START) && p < CUT3_START ? 'auto' : 'none'
  );

  // =========================================================================
  // SECTION 4 (PLACEHOLDER 2) PARALLAX DISPLACEMENTS INSIDE CUT 3
  // Mirrors the same reveal timing Sections 2 & 3 used relative to their
  // cuts, applied to Cut 3's own [CUT3_START, K3] span.
  // =========================================================================
  const section4TextY = useTransform(
    smoothProgress,
    [CUT3_START + 0.46 * (K3 - CUT3_START), CUT3_START + 0.58 * (K3 - CUT3_START)],
    ['20%', '0%']
  );
  const section4TextOpacity = useTransform(
    smoothProgress,
    [CUT3_START + 0.46 * (K3 - CUT3_START), CUT3_START + 0.56 * (K3 - CUT3_START)],
    [0, 1]
  );
  const sectionFourPointerEvents = useTransform(smoothProgress, (p) =>
    p >= CUT3_START + 0.46 * (K3 - CUT3_START) ? 'auto' : 'none'
  );

  // Track cursor movement and touch gestures across viewport for Hero 3D tilt & parallax depth
  useEffect(() => {
    // Only Hero and Contenders read the pointer; past them, skip the work so
    // every mouse move doesn't drive springs/transforms on hidden layers.
    const pointerMatters = () => smoothProgress.get() < K2 + 0.02;
    const handleMouseMove = (e: MouseEvent) => {
      if (!pointerMatters()) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const normalizedX = (e.clientX / width) * 2 - 1;
      const normalizedY = (e.clientY / height) * 2 - 1;
      mouseX.set(normalizedX);
      mouseY.set(normalizedY);
    };

    const handleMouseLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const width = window.innerWidth;
        const height = window.innerHeight;
        const normalizedX = (touch.clientX / width) * 2 - 1;
        const normalizedY = (touch.clientY / height) * 2 - 1;
        mouseX.set(normalizedX);
        mouseY.set(normalizedY);
      }
    };

    const handleTouchEnd = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mouseX, mouseY, smoothProgress, K2]);

  // Touch swipe support
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    touchStartY.current = null;

    if (diff > 50 && scrollYProgress.get() < 0.45 * K1) {
      // Swiped UP: advance smoothly to Section 2 full-screen
      scrollToContenders();
    } else if (diff < -50 && scrollYProgress.get() > 0.45 * K1) {
      // Swiped DOWN: return to Hero section
      scrollToHero();
    }
  };

  // Keyboard navigation between sections
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // The features overlay owns the keyboard (PageUp/Down scroll IT, not the page).
      if (isFeaturesExploreActive) return;
      if (e.key === 'PageDown') {
        if (activeSectionIndex === 0) scrollToContenders();
        else if (activeSectionIndex === 1) scrollToPlaceholder();
        else if (activeSectionIndex === 2) scrollToSection4();
      } else if (e.key === 'PageUp') {
        if (activeSectionIndex === 3) scrollToPlaceholder();
        else if (activeSectionIndex === 2) scrollToContenders();
        else if (activeSectionIndex === 1) scrollToHero();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSectionIndex, isFeaturesExploreActive]);

  // Story sections metadata for global floating navigation
  const STORY_SECTIONS = [
    { id: 'Home', label: 'Home', number: '01' },
    { id: 'Library', label: 'Library', number: '02' },
    { id: 'Features', label: 'Features', number: '03' },
    { id: 'Get Access', label: 'Get Access', number: '04' },
  ];

  const scrollAnimRef = useRef<number | null>(null);

  // Clean up any ongoing scroll animation on unmount
  useEffect(() => {
    return () => {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
    };
  }, []);

  /**
   * Continuous smooth scroll animator.
   * Uses a quadratic ease-in-out curve with a brisk, continuous ~1.4s to 2.1s duration
   * to ensure continuous, uninterrupted motion across sections without lingering or pausing.
   */
  const smoothScrollTo = (targetY: number, customDuration?: number) => {
    const startY = window.scrollY || window.pageYOffset;
    const distance = Math.abs(targetY - startY);
    if (distance <= 4) {
      window.scrollTo({ top: targetY });
      return;
    }

    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }

    const isHero = targetY === 0;
    const viewportH = typeof window !== 'undefined' ? (window.innerHeight || 800) : 800;
    const screenCount = Math.max(1, distance / viewportH);

    // Continuous, unhurried glide back to top:
    // Distance-adaptive duration ensuring that when low on the screen (deep sections 3 & 4, ~10-13 screens down),
    // the scroll doesn't rush past at excessive speeds, while keeping intermediate sections fluid
    // without stalling or lingering:
    // - 1-2 screens: ~1.4s - 1.6s
    // - 4-5 screens: ~2.1s - 2.4s
    // - 8-9 screens: ~3.1s - 3.4s
    // - 11-13 screens (very low): ~3.8s - 4.2s
    const duration =
      customDuration ??
      (isHero
        ? Math.min(4200, Math.max(1350, 1100 + screenCount * 250))
        : Math.min(2000, Math.max(1000, 900 + screenCount * 120)));

    const startTime = performance.now();

    // Continuous quadratic ease-in-out curve:
    // Maintains steady, uninterrupted momentum through intermediate sections,
    // avoiding dead zones or plateaus that feel like stopping for a second.
    const easeInOutQuad = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const abort = () => {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
    };

    const onWheel = (e: WheelEvent) => {
      // Guard against residual trackpad momentum during the first 300ms
      const elapsed = performance.now() - startTime;
      if (elapsed < 300 && Math.abs(e.deltaY) < 16) {
        return;
      }
      abort();
    };

    const onTouchStart = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed > 200) {
        abort();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeInOutQuad(progress);
      const currentPos = startY + (targetY - startY) * eased;

      window.scrollTo(0, currentPos);

      if (progress < 1) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        window.scrollTo(0, targetY);
        scrollAnimRef.current = null;
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('touchstart', onTouchStart);
      }
    };

    scrollAnimRef.current = requestAnimationFrame(step);
  };

  // Smooth scroll helper: return to Hero (Section 1) with slow, cinematic easing
  const scrollToHero = () => {
    smoothScrollTo(0);
  };

  // Smooth scroll helper: advance to Section 2 (Computers & Simulations)
  const scrollToContenders = () => {
    if (!containerRef.current) return;
    const maxScroll = containerRef.current.offsetHeight - window.innerHeight;
    const target = containerRef.current.offsetTop + maxScroll * (0.58 * K1);
    smoothScrollTo(target, 1400);
  };

  // Smooth scroll helper: advance to Section 3 (Product Story), parking at the
  // FEATURES_ANCHOR frame where the phone is pinned and the headline + button
  // are fully in.
  const scrollToPlaceholder = () => {
    if (!containerRef.current) return;
    const maxScroll = containerRef.current.offsetHeight - window.innerHeight;
    const anchor = STORY_START + storyLayout.featuresAnchor * (STORY_END - STORY_START);
    const target = containerRef.current.offsetTop + maxScroll * anchor;
    smoothScrollTo(target, 1500);
  };

  // Same fix as "View The Features": opening Explore The Library always
  // snaps to Contenders' own settled anchor point first, so the constellation
  // and its featured nodes always appear in the same spot regardless of
  // where the user was scrolled to when they clicked it.
  const handleExploreActiveChange = (active: boolean) => {
    if (active) {
      // A dedicated, slightly-lower anchor than scrollToContenders (which
      // other nav — keyboard, swipe, nav dots — still uses unchanged).
      if (containerRef.current) {
        const maxScroll = containerRef.current.offsetHeight - window.innerHeight;
        const target = containerRef.current.offsetTop + maxScroll * (0.66 * K1);
        smoothScrollTo(target, 1400);
      }
    }
    setIsExploreActive(active);
  };

  // Smooth scroll helper: jump to a specific slide in Section 3's horizontal scroll
  const scrollToInsightsSlide = (slideIndex: number) => {
    if (!containerRef.current) return;
    const maxScroll = containerRef.current.offsetHeight - window.innerHeight;
    const totalSlides = 5;
    const slideFrac = totalSlides > 1 ? slideIndex / (totalSlides - 1) : 0;
    const targetProgress = CAROUSEL_START + slideFrac * (CAROUSEL_END - CAROUSEL_START);
    const target = containerRef.current.offsetTop + maxScroll * targetProgress;
    smoothScrollTo(target, 900);
  };

  // Smooth scroll helper: advance to Section 4 (Placeholder 2)
  const scrollToSection4 = () => {
    if (!containerRef.current) return;
    const maxScroll = containerRef.current.offsetHeight - window.innerHeight;
    const target = containerRef.current.offsetTop + maxScroll * (CUT3_START + 0.58 * (K3 - CUT3_START));
    smoothScrollTo(target, 1600);
  };

  const handleSectionClick = (index: number) => {
    if (index === 0) scrollToHero();
    else if (index === 1) scrollToContenders();
    else if (index === 2) scrollToPlaceholder();
    else if (index === 3) scrollToSection4();
  };

  // "View The Features" opens a full-screen overlay with its own scroller
  // (feature stages); closing returns to the exact page position.
  const closeFeatures = useCallback(() => setIsFeaturesExploreActive(false), []);

  const slide = SLIDES[currentSlide];

  return (
    <motion.div
      ref={containerRef}
      id="parallax-experience-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        background: globalBgGradient,
        height: `${TRACK_VH}vh`,
      }}
      className="relative w-full transition-colors duration-300"
    >
      {/* Sticky Fullscreen Viewport Stage */}
      <div className="sticky top-0 w-full h-screen min-h-[640px] overflow-hidden select-none">
        {/* =========================================================================
            GLOBAL ADAPTIVE BACKGROUND GRADIENT (Deep Emerald -> Dark Obsidian)
            ========================================================================= */}
        <motion.div
          id="global-stage-gradient-base"
          style={{ background: globalBgGradient }}
          className="absolute inset-0 pointer-events-none z-0"
          aria-hidden="true"
        />

        {/* Global Color Grading Vignette (Emerald Luster -> Obsidian Mineral Sheen) */}
        <motion.div
          id="global-color-grading-vignette"
          style={{
            background: useTransform(
              [globalGlowColor, globalGradBase],
              ([glow, base]) =>
                `radial-gradient(circle at 50% 25%, ${glow} 0%, transparent 60%), radial-gradient(circle at 50% 70%, transparent 35%, ${base} 100%)`
            ),
          }}
          className="absolute inset-0 pointer-events-none z-0 opacity-80 lg:mix-blend-screen"
          aria-hidden="true"
        />

        {/* =========================================================================
            SECTION 1: HERO (UNDERNEATH THE CUT)
            ========================================================================= */}
        <div
          id="hero-section-base"
          className="absolute inset-0 w-full h-full overflow-hidden lg:[perspective:1400px] z-0"
        >
          {/* 3D Tilted World Stage */}
          <motion.div
            id="hero-3d-stage"
            style={{
              rotateX: heroRotateX,
              rotateY: heroRotateY,
              // The mouse tilt is desktop-only; flat compositing is much
              // cheaper on phones/tablets.
              transformStyle: isDesktop ? 'preserve-3d' : 'flat',
            }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {/* Deep Background Layer with Calisthenics Anatomical Sculpture */}
            <motion.div
              id="hero-bg-layer"
              style={{
                x: heroMouseBgX,
                y: combinedHeroBgY,
                scale: heroBgScale,
                opacity: heroBgOpacity,
              }}
              className="absolute -inset-[6%] z-0 pointer-events-none"
            >
              {/* Preloader hand-off: the whole backdrop settles from a slight zoom while
                  a dark veil lifts. Separate from the scroll-driven scale/opacity above. */}
              <motion.div
                initial={{ scale: 1.12 }}
                animate={{ scale: siteReady ? 1 : 1.12 }}
                transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 will-change-transform"
              >
              <img
                src={HERO_IMAGE.src}
                srcSet={HERO_IMAGE.srcSet}
                sizes={HERO_IMAGE.sizes}
                alt="Talos Calisthenics Anatomical Sculpture"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />

              {/* Dynamic Studio Rim Lighting (Clean, neutral high-end studio sheen) */}
              <motion.div
                style={{ x: lightShiftX, y: lightShiftY }}
                className="absolute -inset-[25%] pointer-events-none bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.10)_0%,_rgba(255,255,255,0.03)_37%,_transparent_75%)]"
                aria-hidden="true"
              />

              {/* Luminous Volumetric Cosmic Nebula Haze on the right (Soft, subtle ambient haze) */}
              <div
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_88%_44%,_rgba(16,185,129,0.07)_0%,_rgba(6,78,59,0.03)_36%,_transparent_70%)] pointer-events-none lg:mix-blend-screen"
                aria-hidden="true"
              />

              {/* Studio Floor Specular Reflection Sheen at bottom */}
              <div
                className="absolute bottom-0 inset-x-0 h-48 bg-[radial-gradient(ellipse_at_76%_90%,_rgba(52,211,153,0.06)_0%,_rgba(6,78,59,0.02)_45%,_transparent_75%)] pointer-events-none lg:mix-blend-screen"
                aria-hidden="true"
              />

              {/* Pure Obsidian Header Shading Mask to keep the header bar clean, dark, and clear of green tint */}
              <div
                className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#030303]/90 via-[#030303]/45 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              {/* Vignette & Cinematic Studio Framing */}
              <div
                className="absolute inset-0 bg-radial-[circle_at_50%_45%] from-transparent via-[#050505]/20 to-[#020202]/85 pointer-events-none"
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/70 pointer-events-none"
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 bg-gradient-to-r from-[#050505]/60 via-transparent to-[#050505]/30 pointer-events-none"
                aria-hidden="true"
              />
                <motion.div
                  initial={{ opacity: 0.55 }}
                  animate={{ opacity: siteReady ? 0 : 0.55 }}
                  transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 bg-black pointer-events-none"
                  aria-hidden="true"
                />
              </motion.div>
            </motion.div>

            {/* Hero Particles: Midground layer with reactive mouse drift */}
            <motion.div
              id="hero-particles-layer"
              style={{
                x: heroMouseParticlesX,
                y: combinedHeroParticlesY,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: siteReady ? 1 : 0 }}
              transition={{ duration: 1.8, delay: siteReady ? 0.7 : 0 }}
              className="absolute inset-0 z-10 pointer-events-none"
            >
              <ParticleField active={isHeroActive} />
            </motion.div>
          </motion.div>

          {/* Hero Foreground Headline & Copy (Completely stable, free of 3D clipping or disappearing hover effects) */}
          {/* Hero Foreground Content Layer anchored to bottom like reference layout */}
          <motion.div
            id="hero-content-layer"
            style={{
              opacity: heroTextOpacity,
              y: heroScrollTextY,
              scale: heroTextScale,
              pointerEvents: heroPointerEvents,
              perspective: 1200,
            }}
            className="absolute inset-0 z-20 flex flex-col justify-end pointer-events-none pb-24 sm:pb-28 md:pb-32 lg:pb-16 px-4 sm:px-8 md:px-12"
          >
            {/* Atmospheric ambient backlight behind the bottom headline */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[380px] pointer-events-none -z-10"
              style={{
                background:
                  'radial-gradient(ellipse 90% 70% at 50% 95%, rgba(16, 185, 129, 0.08) 0%, rgba(0, 0, 0, 0.55) 55%, transparent 100%)',
              }}
              aria-hidden="true"
            />

            {/* Headline spanning the entire bottom of the screen by itself with satin titanium finish & 3D mouse tilt */}
            <motion.div
              id="hero-headline-tilt-container"
              style={{
                rotateX: headlineRotateX,
                rotateY: headlineRotateY,
                x: headlineTranslateX,
                y: headlineTranslateY,
                transformStyle: 'preserve-3d',
              }}
              className="w-full max-w-[1600px] mx-auto pointer-events-auto text-center relative will-change-transform"
            >
              {/* Subtle floating atmospheric particles layer situated directly behind the hero text */}
              <HeroTextAtmosphere
                active={isHeroActive}
                className="-inset-x-8 sm:-inset-x-16 -inset-y-10 sm:-inset-y-20 -z-10"
              />

              <motion.h1
                id="hero-title"
                variants={heroHeadlineVariants}
                initial="hidden"
                animate={isHeroRevealed && siteReady ? 'visible' : 'hidden'}
                className="w-full font-display font-medium text-[clamp(1.5rem,3.8vw,4.85rem)] tracking-[0.24em] sm:tracking-[0.34em] md:tracking-[0.42em] lg:tracking-[0.48em] pl-[0.24em] sm:pl-[0.34em] md:pl-[0.42em] lg:pl-[0.48em] uppercase leading-[0.92] sm:leading-[0.96] md:leading-[1.0] select-none will-change-[filter,opacity,transform]"
                style={{
                  transform: 'translateZ(18px)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <motion.span
                  variants={heroLineVariants}
                  className="relative inline-block will-change-[filter,opacity,transform]"
                >
                  {/* Static glow copy: the multi-blur drop-shadow lives here, on a
                      layer that never changes, instead of on the headline whose
                      letters animate with the mouse (that re-rasterised five
                      blur passes every frame). */}
                  <span
                    className="headline-editorial-glow absolute inset-0 pointer-events-none"
                    aria-hidden="true"
                  >
                    <LiquidPullText
                      text="CALISTHENICS REVOLUTIONIZED"
                      interactive={false}
                      letterClassName="text-white"
                    />
                  </span>
                  <LiquidPullText
                    text="CALISTHENICS REVOLUTIONIZED"
                    maxPull={1.1}
                    maxBlur={5}
                    radius={140}
                    lerpFactor={0.2}
                    letterClassName="text-metallic-headline"
                    idleShine={siteReady}
                  />
                </motion.span>
              </motion.h1>
            </motion.div>
          </motion.div>
        </div>

        {/* =========================================================================
            SECTION 2: CONTENDERS (CLIPPED BY DYNAMIC DIAGONAL CUT-IN 1 / UNDER CUT 2)
            ========================================================================= */}
        <motion.div
          id="contenders-diagonal-clipped-container"
          style={{
            clipPath: clipPathString1,
            WebkitClipPath: clipPathString1,
            background: globalBgGradient,
          }}
          className="absolute inset-0 w-full h-full overflow-hidden [perspective:1400px] z-20"
        >
          {/* 3D Tilted World Stage for Section 2 */}
          <motion.div
            id="contenders-3d-stage"
            style={{
              rotateX: heroRotateX,
              rotateY: heroRotateY,
              transformStyle: 'preserve-3d',
            }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {/* Deep Data Constellation Nebula with Parallax Rise */}
            <motion.div
              id="contenders-bg-layer"
              style={{
                x: contendersMouseBgX,
                y: combinedContendersBgY,
                scale: combinedContendersBgScale,
              }}
              className="absolute -inset-[5%] pointer-events-none z-0"
            >
              <img
                src="/contenders-bg.webp"
                alt="Ancient ruins in fog"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center opacity-90"
              />

              {/* Dynamic Lighting Sheen */}
              <motion.div
                style={{
                  background: useTransform(
                    [lightX, lightY, globalGlowColor],
                    ([lx, ly, glow]) =>
                      `radial-gradient(circle at ${lx} ${ly}, ${glow} 0%, rgba(255, 255, 255, 0.02) 40%, transparent 75%)`
                  ),
                }}
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
              />

              {/* Base Atmospheric Emerald Fog */}
              <motion.div
                style={{
                  opacity: useTransform(smoothProgress, [0.10 * K1, 0.65 * K1], [0.5, 0.25]),
                }}
                className="absolute inset-0 bg-radial-[circle_at_60%_45%] from-transparent via-[#050505]/30 to-[#050505]/70 pointer-events-none"
                aria-hidden="true"
              />

              {/* Dark Obsidian Shift Atmosphere Fog */}
              <motion.div
                style={{
                  opacity: useTransform(smoothProgress, [0.35 * K1, 0.85 * K1], [0, 0.5]),
                  background:
                    'radial-gradient(ellipse at 60% 45%, rgba(0, 0, 0, 0) 0%, rgba(3, 5, 4, 0.4) 50%, rgba(2, 4, 3, 0.85) 100%)',
                }}
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
              />

              {/* Edge vignetting layers smoothly tied to the global obsidian base color */}
              <motion.div
                style={{
                  background: useTransform(
                    globalGradBase,
                    (base) =>
                      `linear-gradient(to right, ${base} 0%, rgba(3, 4, 6, 0.55) 40%, transparent 100%)`
                  ),
                }}
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
              />
              <motion.div
                style={{
                  background: useTransform(
                    globalGradBase,
                    (base) =>
                      `linear-gradient(to top, ${base} 0%, transparent 38%, transparent 62%, ${base} 100%)`
                  ),
                }}
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
              />

              {/* Dynamic Reactive Node Atmosphere: Alters the background lighting depending on the active node/tooltip */}
              <AnimatePresence>
                {isExploreActive && selectedGeneticTrait && (
                  <motion.div
                    key={`node-bg-atmosphere-${selectedGeneticTrait.category}-${selectedGeneticTrait.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 pointer-events-none z-[4]"
                  >
                    {/* Primary Atmospheric Wash: Radial bloom biased towards the active node & trait panel */}
                    <div
                      className="absolute inset-0 pointer-events-none mix-blend-screen transition-all duration-700"
                      style={{
                        background: `radial-gradient(ellipse 95% 80% at 65% 48%, ${activeTraitAtmosphere.radialGlow} 0%, ${activeTraitAtmosphere.ambientWash} 42%, transparent 75%)`,
                      }}
                      aria-hidden="true"
                    />

                    {/* Secondary Deep Chromatic Underglow across the stage */}
                    <div
                      className="absolute inset-0 pointer-events-none transition-all duration-700"
                      style={{
                        background: `radial-gradient(circle at 40% 55%, ${activeTraitAtmosphere.ambientBase} 0%, transparent 68%)`,
                      }}
                      aria-hidden="true"
                    />

                    {/* Subtle Chromatic Vignette Tint at edges for atmospheric immersion */}
                    <div
                      className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-60 transition-all duration-700"
                      style={{
                        background: `radial-gradient(ellipse at 50% 50%, transparent 40%, ${activeTraitAtmosphere.vignetteTint} 100%)`,
                      }}
                      aria-hidden="true"
                    />

                    {/* Horizon Rim Sheen */}
                    <div
                      className="absolute inset-0 pointer-events-none mix-blend-color-dodge opacity-50 transition-all duration-700"
                      style={{
                        background: `linear-gradient(135deg, ${activeTraitAtmosphere.rimAccent} 0%, transparent 40%, ${activeTraitAtmosphere.rimAccent} 100%)`,
                      }}
                      aria-hidden="true"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Interactive Constellation Canvas: 3D Helical Spiral with scroll-driven rotation */}
            <motion.div
              style={{
                y: contendersCanvasY,
              }}
              className="absolute -top-[40%] left-0 right-0 h-[180%] pointer-events-auto z-10 [transform:translateZ(10px)]"
            >
              <ConstellationCanvas
                active={isConstellationActive}
                activeSlide={currentSlide}
                scrollProgress={smoothProgress}
                isShiftedLeft={isExploreActive}
                selectedTrait={selectedGeneticTrait}
                onSelectTrait={setSelectedGeneticTrait}
              />
            </motion.div>
          </motion.div>

          {/* Slow, autonomously-drifting glow blob — shifts its color dynamically when a node/tooltip is active */}
          <motion.div
            animate={{
              x: [0, 60, -20, 0],
              y: [0, -40, 30, 0],
            }}
            transition={{
              duration: 26,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-[15%] right-[10%] w-[36vw] h-[36vw] max-w-[520px] max-h-[520px] rounded-full pointer-events-none z-[15] opacity-70 transition-all duration-700"
            style={{
              background:
                isExploreActive && selectedGeneticTrait
                  ? activeTraitAtmosphere.blobGradient
                  : 'radial-gradient(circle, rgba(245, 158, 11, 0.10) 0%, rgba(245, 158, 11, 0.04) 45%, transparent 75%)',
            }}
            aria-hidden="true"
          />

          {/* Inset depth vignette (top inner highlight + bottom shadow),
              matching the Talos app's own flat-gradient depth technique. */}
          <div
            className="absolute inset-0 pointer-events-none z-[16]"
            style={{
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 60px 100px -40px rgba(0,0,0,0.6)',
            }}
            aria-hidden="true"
          />

          {/* Contenders Foreground Content (Headline, Narrative & Feature List + Floating Explore Library Button) */}
          <motion.div
            id="contenders-content-layer"
            style={{
              x: contendersMouseTextX,
              y: combinedContendersTextY,
              opacity: contendersTextOpacity,
              pointerEvents: contendersPointerEvents,
            }}
            className="absolute inset-0 z-20 flex flex-col lg:flex-row items-start lg:items-center justify-center lg:justify-between gap-5 sm:gap-7 lg:gap-0 pt-32 pb-4 sm:pb-6 lg:py-0 px-6 sm:px-12 lg:px-16 max-w-7xl w-full mx-auto pointer-events-none"
          >
            <motion.div
              animate={{
                opacity: isExploreActive ? 0 : 1,
                x: isExploreActive ? -140 : 0,
                filter: isExploreActive ? 'blur(16px)' : 'blur(0px)',
                scale: isExploreActive ? 0.92 : 1,
                pointerEvents: isExploreActive ? 'none' : 'auto',
              }}
              transition={{
                duration: 0.65,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="max-w-2xl text-left pointer-events-auto [transform:translateZ(24px)]"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  variants={sectionContentVariants}
                  initial="hidden"
                  animate={isSectionRevealed ? 'visible' : 'hidden'}
                  exit="exit"
                >
                  {/* Bold Condensed Section 2 Heading with staggered line reveals & organic liquid hover */}
                  <h2
                    id="contenders-title"
                    className="font-display font-medium text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-wide uppercase text-white leading-[1.1] drop-shadow-[0_10px_30px_rgba(0,0,0,0.85)] select-none"
                  >
                    {slide.headline.map((line, idx) => (
                      <motion.span
                        key={idx}
                        variants={headlineLineVariants}
                        className="block will-change-[filter,opacity,transform]"
                      >
                        <LiquidPullText
                          text={line}
                          maxPull={1}
                          maxBlur={5}
                          radius={120}
                          lerpFactor={0.12}
                        />
                      </motion.span>
                    ))}
                  </h2>

                  {/* Section 2 Narrative Description with smooth entrance */}
                  <motion.p
                    id="contenders-description"
                    variants={paragraphVariants}
                    className="mt-5 sm:mt-7 text-sm sm:text-base font-light text-white/75 tracking-[0.02em] leading-relaxed max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] select-none will-change-[filter,opacity,transform]"
                  >
                    {slide.description}
                  </motion.p>

                  {/* Staggered Feature Capabilities List */}
                  <motion.ul
                    id="contenders-feature-list"
                    variants={featureListContainerVariants}
                    className="mt-5 sm:mt-7 space-y-2.5 sm:space-y-3"
                    aria-label="Capabilities and Innovations"
                  >
                    {slide.features.map((feature, idx) => (
                      <motion.li
                        key={idx}
                        variants={featureItemVariants}
                        className="flex items-start sm:items-center gap-3 text-xs sm:text-sm md:text-[15px] text-white/90 will-change-[filter,opacity,transform]"
                      >
                        <span className="flex-shrink-0 mt-0.5 sm:mt-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.25)]">
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" strokeWidth={2.5} />
                        </span>
                        <span className="font-normal tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] select-none">
                          {feature}
                        </span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Floating Glassmorphic Circle Button in the Constellation / Particles
                Field — phases in after the text (EXPLORE_BUTTON_ENTRANCE_DELAY),
                then toggles quickly (no extra delay) with explore mode. */}
            <motion.div
              variants={exploreButtonVariants}
              initial="hidden"
              animate={isExploreActive ? 'exploreHidden' : isSectionRevealed ? 'visible' : 'hidden'}
              style={{ pointerEvents: isExploreActive ? 'none' : 'auto' }}
              className="pointer-events-auto [transform:translateZ(32px)] flex items-center justify-center self-end mr-6 sm:mr-16 lg:mr-8 xl:mr-14 lg:self-auto"
            >
              <ExploreLibraryButton onClick={() => handleExploreActiveChange(true)} />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* =========================================================================
            SECTION 3: PRODUCT STORY (CLIPPED BY DYNAMIC DIAGONAL CUT-IN 2)
            Continuing to scroll within this same revealed section slides from
            the static placeholder content into the Agronomic Insights
            horizontal-scroll content — no second diagonal cut. The container
            itself carries the shared background color so any sub-pixel gap
            between the two sliding panels blends in instead of exposing the
            differently-colored global background layer underneath.
            ========================================================================= */}
        <motion.div
          id="placeholder-diagonal-clipped-container"
          style={{
            clipPath: clipPathString2,
            WebkitClipPath: clipPathString2,
            pointerEvents: sectionThreePointerEvents,
          }}
          className="absolute inset-0 w-full h-full z-30 overflow-hidden bg-[#050505] [perspective:1400px]"
        >
          {/* Persistent warm story background — rendered once, never slides.
              The Product Story sits on it as a foreground layer. */}
          <StageBackdrop />
          {/* Insights keeps the original neutral backdrop: it fades in over the
              warm story backdrop across the same handoff range. */}
          <motion.div
            style={{ opacity: insightsBackdropOpacity }}
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          >
            <StageBackdrop palette={INSIGHTS_BACKGROUND} carryOver={false} />
          </motion.div>
          <motion.div
            style={{ opacity: downloadCarryOverOpacity, height: `${DOWNLOAD_CARRYOVER.heightPct}%` }}
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            aria-hidden="true"
          >
            <img
              src={DOWNLOAD_CARRYOVER.src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[50%_85%]"
              style={{
                opacity: DOWNLOAD_CARRYOVER.imageOpacity,
                maskImage: 'linear-gradient(to top, #000 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, #000 0%, transparent 100%)',
              }}
            />
            <div className="absolute inset-0" style={{ background: DOWNLOAD_CARRYOVER.glow }} />
            <div className="absolute inset-0" style={{ background: DOWNLOAD_CARRYOVER.wash }} />
          </motion.div>

          <motion.div
            style={{
              y: placeholderContentY,
              opacity: placeholderContentOpacity,
              pointerEvents: placeholderContentPointerEvents,
            }}
            className="absolute inset-0"
          >
            <ProductStoryStage
              progress={storyProgress}
              entrance={storyEntrance}
              isNear={isStoryNear}
              compact={compact}
              onViewFeatures={() => setIsFeaturesExploreActive(true)}
            />
          </motion.div>

          <motion.div
            style={{
              y: insightsContentY,
              opacity: insightsContentOpacity,
              scale: insightsContentScale,
              pointerEvents: insightsContentPointerEvents,
            }}
            className="absolute inset-0"
          >
            <HorizontalTextScrollSection
              scrollProgress={smoothProgress}
              sectionProgressStart={CAROUSEL_START}
              sectionProgressEnd={CAROUSEL_END}
              entryProgress={insightsEntryProgress}
              exitProgress={insightsExitProgress}
              mouseX={smoothMouseX}
              mouseY={smoothMouseY}
              onSlideSelect={scrollToInsightsSlide}
            />
          </motion.div>
        </motion.div>

        {/* =========================================================================
            SECTION 4: PLACEHOLDER 2 (CLIPPED BY DYNAMIC DIAGONAL CUT-IN 3)
            ========================================================================= */}
        <motion.div
          id="placeholder2-diagonal-clipped-container"
          style={{
            clipPath: clipPathString3,
            WebkitClipPath: clipPathString3,
            pointerEvents: sectionFourPointerEvents,
          }}
          className="absolute inset-0 w-full h-full z-[35] overflow-hidden [perspective:1400px]"
        >
          <PlaceholderSection2 active={isDownloadActive} contentY={section4TextY} contentOpacity={section4TextOpacity} />
        </motion.div>

        {/* =========================================================================
            CHROME NAVIGATION & CONTROLS (SHARED PERSISTENT INTERFACE)
            ========================================================================= */}
        {/* Top Header Bar with Logo & Hamburger Menu (Slow, gentle fade in closely following text entrance) */}
        <motion.header
          id="main-header"
          initial={{ opacity: 0, y: -10 }}
          animate={{
            opacity: isExploreActive || isFeaturesExploreActive || !siteReady ? 0 : 1,
            y: isExploreActive || isFeaturesExploreActive ? -20 : siteReady ? 0 : -10,
            pointerEvents: isExploreActive || isFeaturesExploreActive || !siteReady ? 'none' : 'auto',
          }}
          transition={{
            duration: isExploreActive || isFeaturesExploreActive ? 0.35 : 2.2,
            // Measured from the preloader hand-off (siteReady).
            delay: isExploreActive || isFeaturesExploreActive ? 0 : 1.3,
            ease: [0.16, 1, 0.3, 1],
          }}
          onAnimationComplete={() => {
            if (siteReady) setIsHeaderSettled(true);
          }}
          className="absolute top-0 left-0 right-0 z-40 w-full py-6 md:py-8 will-change-[opacity,transform]"
        >
          <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 lg:px-16 flex items-center justify-between">
            {/* Pioneer Brand Logo (Clicking smoothly returns to Hero) */}
            <button
              id="header-pioneer-logo-btn"
              onClick={scrollToHero}
              className="focus:outline-none cursor-pointer active:scale-95 transition-transform"
              aria-label="Return to top"
            >
              <PioneerLogo />
            </button>

            {/* "Get Early Access" — glassmorphic, jumps straight to the
                Download App section instead of opening the nav drawer.
                Hover reveals an ambient emerald glow bloom + a diagonal
                sheen sweep, rather than a flat background highlight. */}
            <button
              id="get-early-access-btn"
              onClick={scrollToSection4}
              className="relative group inline-flex items-center justify-center px-4 py-3 sm:px-[18px] sm:py-3.5 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/30"
              aria-label="Get early access"
            >
              {/* Refined subtle ambient starlight glow bloom behind the button */}
              <span
                className="absolute -inset-2.5 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(52,211,153,0.08) 40%, transparent 70%)' }}
                aria-hidden="true"
              />

              {/* Glass surface */}
              <span
                className="glass absolute inset-0 rounded-full"
                style={isHeaderSettled ? undefined : { backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
                aria-hidden="true"
              />

              <span className="relative font-display font-medium text-[10px] sm:text-[11px] tracking-[0.16em] text-white/85 group-hover:text-white uppercase whitespace-nowrap transition-colors duration-200">
                <span className="sm:hidden">Get Access</span>
                <span className="hidden sm:inline">Get Early Access</span>
              </span>
            </button>
          </div>
        </motion.header>

        {/* Floating Right-Edge Navigation Dot Indicator for Main Story Sections
            (Hidden in Hero & the Section 4 Download App screen, or while an
            explore hotspot is active — see isNavHidden above for the
            earlier/finer scroll thresholds this uses.) */}
        <motion.nav
          id="floating-story-navigation"
          animate={{
            opacity: isExploreActive || isFeaturesExploreActive || isNavHidden ? 0 : 1,
            x: isExploreActive || isFeaturesExploreActive || isNavHidden ? 40 : 0,
            pointerEvents: isExploreActive || isFeaturesExploreActive || isNavHidden ? 'none' : 'auto',
          }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          aria-label="Story sections navigation"
          className="absolute right-5 sm:right-8 lg:right-10 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-5 z-40 select-none"
        >
          {/* Subtle Vertical Connector Track */}
          <div
            className="absolute left-1/2 top-2.5 bottom-2.5 w-[1px] -translate-x-1/2 bg-gradient-to-b from-white/10 via-white/20 to-white/10 pointer-events-none"
            aria-hidden="true"
          />

          {STORY_SECTIONS.map((section, index) => {
            const isActive = index === activeSectionIndex;
            return (
              <button
                key={section.id}
                id={`nav-story-dot-${index}`}
                onClick={() => handleSectionClick(index)}
                className="relative group flex items-center justify-center p-2 focus:outline-none cursor-pointer"
                aria-label={`Jump to ${section.label}`}
                aria-current={isActive ? 'true' : 'false'}
              >
                {/* Sleek Minimal Hover Text without box container */}
                <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2.5 text-right whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 ease-out transform translate-x-2 group-hover:translate-x-0 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                  <span className="font-mono text-[9px] tracking-[0.25em] text-white/40 font-medium">
                    {section.number}
                  </span>
                  <span className="w-2.5 h-px bg-white/20" aria-hidden="true" />
                  <span className="font-display font-light text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-white/90 group-hover:text-white transition-colors duration-200">
                    {section.label}
                  </span>
                </div>

                {/* Active Animated Orbital Ring vs Inactive Clean Dot —
                    both always mounted and crossfaded via animate, so
                    switching the active section eases smoothly instead of
                    snapping between the two states. */}
                <div className="relative flex items-center justify-center w-7 h-7">
                  <motion.div
                    animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.6 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    {/* Continuous Rotating Segmented Aura */}
                    <motion.svg
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 w-full h-full text-emerald-400"
                      viewBox="0 0 28 28"
                    >
                      <circle
                        cx="14"
                        cy="14"
                        r="11"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeDasharray="45 15"
                        className="opacity-95 drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                      />
                    </motion.svg>
                    {/* Glowing Core Center */}
                    <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9),0_0_20px_rgba(255,255,255,0.5)]" />
                  </motion.div>

                  <motion.div
                    animate={{ opacity: isActive ? 0 : 1, scale: isActive ? 0.5 : 1 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white/90 group-hover:scale-150 transition-all duration-200 group-hover:shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  </motion.div>
                </div>
              </button>
            );
          })}
        </motion.nav>

        {/* Minimal Floating Close Button to Restore Text from Genetic Node Explorer View */}
        <AnimatePresence>
          {isExploreActive && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-6 right-6 sm:top-8 sm:right-8 z-50 flex items-center pointer-events-auto"
            >
              {/* Gentle continuous float, echoing the Explore The Library button */}
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <button
                  id="close-library-explore-mode-btn"
                  type="button"
                  onClick={() => setIsExploreActive(false)}
                  className="glass group flex items-center justify-center w-14 h-14 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label="Close explore view and restore text"
                >
                  <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>



        {/* "View The Features": full-screen overlay with its own scroller.
            Portalled to <body> by the component itself. */}
        {featuresLoaded && (
          <Suspense fallback={null}>
            <FeaturesOverlay open={isFeaturesExploreActive} onClose={closeFeatures} />
          </Suspense>
        )}

        {/* Explore Mode HUD Guidance — rendered here (alongside the Close
            button) rather than inside ConstellationCanvas, because that
            component sits inside the rotateX/rotateY-transformed 3D stage:
            any transformed ancestor becomes the containing block for
            position:fixed descendants, so it was rendering somewhere off the
            actual viewport instead of pinned to the top of the screen. */}
        <AnimatePresence>
          {isExploreActive && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ delay: 0.35, duration: 0.45 }}
              className="fixed top-6 sm:top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-1.5 text-center select-none"
            >
              <span className="font-display font-black text-[10px] sm:text-[11px] tracking-[0.4em] text-white uppercase">
                Explore Mode
              </span>
              <span className="text-[11px] sm:text-xs font-light text-white/40 tracking-wide">
                Click a Node to View Available Moves
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Genetic Trait Inspection Side Panel (Positioned on the Right of the Node Tree in Explore Mode) */}
        <AnimatePresence mode="wait">
          {isExploreActive && selectedGeneticTrait && (
            <motion.div
              id="genetic-trait-side-panel-container"
              key="genetic-trait-side-panel-container"
              className="fixed z-40 right-10 sm:right-16 lg:right-24 xl:right-32 top-1/2 -translate-y-1/2 w-full max-w-[260px] sm:max-w-xs pointer-events-auto"
            >
              {/* Backing Ambient Aura behind the trait tooltip */}
              <div
                className="absolute -inset-10 rounded-3xl blur-3xl pointer-events-none opacity-45 -z-10 transition-all duration-700"
                style={{
                  background: `radial-gradient(circle, ${activeTraitAtmosphere.radialGlow} 0%, transparent 75%)`,
                }}
                aria-hidden="true"
              />
              <GeneticTraitSidePanel
                trait={selectedGeneticTrait}
                onClose={() => setSelectedGeneticTrait(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}


// Single source of truth for the Product Story section. Every value that
// affects feel (timing, scale, dimming, spring) lives here so the whole
// sequence can be tuned without touching component code.

import { TALOS_FEATURES } from './featuresData';

/** Progress is a 0–1 fraction of the section's scroll distance. */
export type ScrollRange = readonly [start: number, end: number];

/**
 * Scroll length of the story (roughly 400–500vh). Single source: the main
 * page track (ParallaxExperience) adds exactly this much to TRACK_VH, and the
 * standalone preview section uses it as its own height.
 */
export const STORY_VH = 380;
/** Last slice of the story where it slides up into the Insights carousel. */
export const STORY_HANDOFF_VH = 50;
export const SECTION_HEIGHT_VH = STORY_VH;

/**
 * Compact screens (< lg) skip the video-shrinks-into-phone intro: the phone
 * is simply there from the start and the story only needs enough scroll to
 * reveal the copy, hold, and hand off. So it is much shorter.
 */
export const STORY_VH_COMPACT = 180;
/** Local progress at which the copy appears on compact screens (~50vh in). */
export const TEXT_REVEAL_COMPACT: ScrollRange = [0.28, 0.4];
export const FEATURES_ANCHOR_COMPACT = 0.5;

/** Every length-dependent value of the story for the given layout. */
export function getStoryLayout(compact: boolean) {
  const storyVh = compact ? STORY_VH_COMPACT : STORY_VH;
  return {
    storyVh,
    /** Local progress at which the slide-up into Insights begins. */
    handoffAt: 1 - STORY_HANDOFF_VH / storyVh,
    textRevealStart: (compact ? TEXT_REVEAL_COMPACT : TEXT_REVEAL)[0],
    featuresAnchor: compact ? FEATURES_ANCHOR_COMPACT : FEATURES_ANCHOR,
  };
}

// ---------------------------------------------------------------------------
// Headline / description / "View the features" (appear near the END)
// ---------------------------------------------------------------------------
/**
 * Local story progress at which the headline, description and button trigger
 * their entrance (start of the range; same time-based animation as the
 * Contenders text). The end value is unused now.
 */
export const TEXT_REVEAL: ScrollRange = [0.46, 0.58];
/** Where "View the features" parks the page so users always see the same frame. */
export const FEATURES_ANCHOR = 0.62;

export const STORY_COPY = {
  headline: 'Unlock Your Potential',
  /** Same line-by-line staggered reveal as the Contenders headline. */
  headlineLines: ['Unlock Your Potential'],
  description:
    'Be one of the first to experience a new standard in calisthenics training',
} as const;

// ---------------------------------------------------------------------------
// Video source
// ---------------------------------------------------------------------------
// Portrait product clip (720px wide, 30fps, no audio, faststart). Portrait or
// centre-weighted compositions crop best (the phone screen is portrait, the background is full-bleed landscape,
// and both share the same object-position).
export const PRODUCT_VIDEO = {
  src: '/AI_Chat.mp4',
  poster: '/AI_Chat-poster.webp',
  /** Shared by both video elements so their crops match. */
  objectPosition: '50% 40%',
} as const;

// ---------------------------------------------------------------------------
// Stage background
// ---------------------------------------------------------------------------
// Ported from the Talos app's AI Feedback screen
// (Talos/src/components/exercise/FeedbackChatScreen.tsx + ui/RadialGlow.tsx)
// so the showcase sits on the same backdrop instead of flat black.
export interface StagePalette {
  base: string;
  gradient: string;
  boxShadow: string;
  /** Flat darkening layer over the gradient. */
  overlay: string;
  radialGlow: { gradient: string; width: string; height: string; left: string; top: string };
  /** Optional faint image strip at the top edge (fades out downward). */
  carryOver?: { src: string; heightPct: number; opacity: number };
}

export const STAGE_BACKGROUND: StagePalette = {
  base: '#050505',
  gradient:
    'linear-gradient(to bottom, #171412 0%, #121110 40%, #0d0c0b 65%, #090909 82%, #050505 93%, #000000 100%)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 60px 100px -40px rgba(0,0,0,0.6)',
  /** Flat darkening layer over the gradient. */
  overlay: 'rgba(0,0,0,0.2)',
  /** Soft warm (bronze) glow at the top of the screen, echoing the hero's light. */
  radialGlow: {
    gradient:
      'radial-gradient(ellipse 70% 60% at 50% 20%, rgba(214, 160, 90, 0.14) 0%, rgba(150, 105, 60, 0.06) 40%, transparent 70%)',
    width: '160%',
    height: '80%',
    left: '-30%',
    top: '0%',
  },
  /**
   * Faint, blurred strip of the Contenders ruins at the top edge, fading out
   * downward, so the scene visibly carries across the diagonal cut.
   */
  carryOver: { src: '/contenders-bg.webp', heightPct: 38, opacity: 0.24 },
};

/**
 * The Insights (horizontal scroll) section keeps the original Talos
 * AI-feedback backdrop: neutral grey gradient, neutral top glow, no ruins
 * strip. It crossfades in over the warm story backdrop during the handoff.
 */
export const INSIGHTS_BACKGROUND: StagePalette = {
  base: '#050505',
  gradient:
    'linear-gradient(to bottom, #1e1e1e 0%, #161616 40%, #101010 65%, #0a0a0a 82%, #050505 93%, #000000 100%)',
  boxShadow: STAGE_BACKGROUND.boxShadow,
  overlay: 'rgba(0,0,0,0.2)',
  radialGlow: {
    gradient:
      'radial-gradient(ellipse 70% 60% at 50% 20%, rgba(140, 140, 140, 0.25) 0%, rgba(90, 90, 90, 0.12) 40%, transparent 70%)',
    width: '160%',
    height: '80%',
    left: '-30%',
    top: '0%',
  },
};

// ---------------------------------------------------------------------------
// Intro transition ranges (fractions of section scroll progress)
// ---------------------------------------------------------------------------
export const INTRO = {
  /** Phone shell fades in and scales up (original, unhurried pace). */
  phoneFadeIn: [0.1, 0.2] as ScrollRange,
  /** Phone continues to settle (scale/translate) until the intro completes. */
  phoneSettle: [0.1, 0.3] as ScrollRange,
  /** Background video shrinks toward the phone across the whole intro. */
  backgroundScale: [0.1, 0.3] as ScrollRange,
  /** Background dims while it shrinks. */
  backgroundDim: [0.1, 0.3] as ScrollRange,
  /**
   * Snappy crossfade: the outgoing background drops out quickly and EARLY
   * (short range, done at 0.19)...
   */
  backgroundFadeOut: [0.13, 0.17] as ScrollRange,
  /** ...while the phone-screen video eases in a little longer (done at 0.22). */
  phoneVideoFadeIn: [0.12, 0.19] as ScrollRange,
  /** Dark scrim behind the phone so the device becomes the focal point. */
  stageScrim: [0.1, 0.3] as ScrollRange,
} as const;

/** Intro is considered complete (bg video can be paused) past this progress. */
export const INTRO_END = 0.3;
/** Small hysteresis so the bg video doesn't thrash play/pause at the boundary. */
export const INTRO_END_HYSTERESIS = 0.02;

// ---------------------------------------------------------------------------
// Transition values
// ---------------------------------------------------------------------------
/**
 * The background video is a centered portrait frame, not full-bleed.
 * Height is in svh so it fits any screen; width follows the aspect ratio
 * (matched to the phone screen / your portrait clip).
 * Note the phone is ~78svh tall: a frame smaller than that reads as the video
 * "growing" into the device; raise heightSvh toward ~90 for a stronger
 * "shrinking into the phone" feel.
 */
export const BACKGROUND_FRAME = {
  heightSvh: 100,
  /** Cap so tall monitors match the phone's own 700px cap (700 / 0.78 * 1.0). */
  maxHeightPx: 900,
  aspectRatio: 9 / 19.5,
  maxWidthVw: 80,
  borderRadiusPx: 28,
} as const;

/**
 * Entrance of the opening video frame as the page reveals it (driven by the
 * caller's `entrance` 0→1 value — in the main page, the tail of the Cut 2
 * wipe): it grows in from `scaleFrom`, rises from `yFromPx`, and fades in
 * over the first `opacityEnd` of the entrance.
 */
export const BACKGROUND_ENTRANCE = { scaleFrom: 0.96, yFromPx: 18, opacityEnd: 0.4 } as const;

export const BACKGROUND_SCALE = { from: 1, to: 0.8 } as const;
export const BACKGROUND_DIM_MAX = 0.55;
export const STAGE_SCRIM_MAX = 0.6;

export const PHONE_SCALE = { from: 0.9, to: 1 } as const;
export const PHONE_TRANSLATE_Y_PX = { from: 24, to: 0 } as const;

// ---------------------------------------------------------------------------
// Smoothing
// ---------------------------------------------------------------------------
// Softer than the main page's 220/30/0.5 — a slower, more cinematic settle.
export const SCROLL_SPRING = {
  stiffness: 120,
  damping: 30,
  mass: 0.4,
  restDelta: 0.0001,
} as const;

// ---------------------------------------------------------------------------
// Video loading / sync
// ---------------------------------------------------------------------------
/** Start loading/playing when the section is within this margin of the viewport. */
export const LAZY_ROOT_MARGIN = '100% 0px';
/** Max allowed drift (seconds) between the two videos before re-syncing. */
export const SYNC_TOLERANCE_S = 0.1;

// ---------------------------------------------------------------------------
// Future feature stages (after the intro)
// ---------------------------------------------------------------------------
// One entry today (the intro clip). Add entries with their own `range` to
// swap clips inside the phone as the user keeps scrolling.
export interface FeatureStage {
  id: string;
  src: string;
  poster?: string;
  /** Progress range in which this stage's clip is active. */
  range: ScrollRange;
}

export const FEATURE_STAGES: readonly FeatureStage[] = [
  {
    id: 'overview',
    src: PRODUCT_VIDEO.src,
    poster: PRODUCT_VIDEO.poster,
    range: [INTRO_END, 1],
  },
];

// ---------------------------------------------------------------------------
// "View the features" mode — full-screen overlay with its own scroller
// ---------------------------------------------------------------------------
/** Scroll length of the features overlay (its own scroller, not the page). */
export const FEATURES_VH = 300;

/** Leaving the features overlay: copy fades, phone glides back, then it dissolves. */
export const FEATURES_EXIT = {
  /** Time for the phone to glide back to center (the copy fades with it). */
  glideBackS: 1.3,
  /** The overlay's own fade starts after this delay, so the glide-back is visible. */
  fadeDelayS: 0.7,
  fadeS: 1,
} as const;

export const FEATURES_ENTER = {
  /** Time-based glide of the phone to the right + first feature text in. */
  durationS: 1.9,
  /**
   * The overlay's own fade when it opens. Kept short on purpose: the overlay's
   * phone sits exactly on top of the page's pinned phone, so the overlay must
   * become opaque quickly or the page's centered phone shows through as a
   * "ghost" while the overlay's phone glides away.
   */
  fadeS: 0.3,
  /** How far right (vw, from center) the phone glides on desktop. */
  phoneShiftVw: 18,
} as const;

/**
 * Per-feature phone clips for "View the features". Drop each .mp4 in public/
 * and put its path here (keys are the feature ids in featuresData.ts).
 * Leave a value '' to fall back to the placeholder intro clip.
 */
const FEATURE_CLIPS: Record<string, string> = {
  'training-modes': '/AI_Chat.mp4', // e.g. '/feature-training-modes.mp4'
  'form-ai': '/Progression.mp4', // e.g. '/feature-form-ai.mp4'
  'progress-telemetry': '/Leveling.mp4', // e.g. '/feature-progress.mp4'
};

/**
 * One stage per feature, each active for an equal slice of the overlay's
 * scroll (range is local 0–1 overlay progress). All three reuse the same
 * placeholder clip for now — swap `src` per feature when real clips exist.
 */
export const FEATURES_STAGES: readonly FeatureStage[] = TALOS_FEATURES.map((feature, index) => ({
  id: feature.id,
  src: FEATURE_CLIPS[feature.id] || PRODUCT_VIDEO.src,
  poster: (FEATURE_CLIPS[feature.id] || PRODUCT_VIDEO.src).replace('.mp4', '-poster.webp'),
  range: [index / TALOS_FEATURES.length, (index + 1) / TALOS_FEATURES.length] as ScrollRange,
}));

/**
 * Mirror of the story's top treatment, at the BOTTOM edge of the Insights
 * section: a warm dark wash, a bronze glow and only a faint hint of the
 * Download image (fading out upward). Eases in near the end of the horizontal
 * scroll so the download scene is foreshadowed without the picture reading.
 */
export const DOWNLOAD_CARRYOVER = {
  src: '/download-carryover.webp',
  heightPct: 45,
  /** Strength of the picture itself under the wash (kept very low). */
  imageOpacity: 0.22,
  /** Warm dark wash rising from the bottom edge (same tone as the story's gradient). */
  wash: 'linear-gradient(to top, rgba(23,20,18,0.92) 0%, rgba(18,17,16,0.6) 45%, transparent 100%)',
  /** Bronze glow, the story's top glow flipped to the bottom. */
  glow: 'radial-gradient(ellipse 70% 80% at 50% 100%, rgba(214, 160, 90, 0.14) 0%, rgba(150, 105, 60, 0.06) 40%, transparent 70%)',
  /** Scroll distance (fraction of the whole track) the fade-in starts before the carousel ends. */
  leadProgress: 0.05,
} as const;

// ---------------------------------------------------------------------------
// Compact (< lg) phone layout
// ---------------------------------------------------------------------------
/**
 * The story's phone lives in this vertical band on compact screens (% of the
 * screen height, measured from the top / bottom edge). The features overlay
 * starts its phone in exactly the same band so opening it doesn't jump.
 */
export const COMPACT_PHONE_BAND = { topPct: 29, bottomPct: 12 } as const;

/**
 * Where the phone ends up once the features overlay has opened on compact
 * screens. It is sized to fill the space between the top controls and the copy
 * block, so it is as large as it can be on any screen height without touching
 * the text.
 */
export const FEATURES_COMPACT_PHONE = {
  /** Top of the phone, clear of the 1/2/3 buttons and the close button (px). */
  topPx: 96,
  /** Estimated height of the tallest copy block (category + title + paragraph) (px). */
  copyHeightPx: 175,
  /** Minimum gap between the phone's bottom edge and the copy (px). */
  gapPx: 28,
  /** Copy block's bottom padding: clamp(minPx, vh * screenHeight, maxPx). Mirrors FeaturesOverlay. */
  copyBottom: { minPx: 44, vh: 0.09, maxPx: 96 },
} as const;

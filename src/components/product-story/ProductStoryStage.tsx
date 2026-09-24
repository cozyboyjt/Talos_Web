import { useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from 'motion/react';
import { BackgroundVideo } from './BackgroundVideo';
import { PhoneMockup } from './PhoneMockup';
import { PhoneVideo } from './PhoneVideo';
import { StoryOverlay } from './StoryOverlay';
import { StoryScrollIndicator } from './StoryScrollIndicator';
import {
  FEATURE_STAGES,
  INTRO_END,
  INTRO_END_HYSTERESIS,
  PRODUCT_VIDEO,
  COMPACT_PHONE_BAND,
  getStoryLayout,
} from './productStory.config';
import { useCoordinatedPlayback } from './useLazyVideo';
import { useIntroTransition } from './useIntroTransition';
import { useVideoSync } from './useVideoSync';

/** Index of the feature stage whose range contains `progress` (0 during the intro). */
function getActiveStageIndex(progress: number): number {
  if (progress < INTRO_END) return 0;
  const index = FEATURE_STAGES.findIndex(
    (stage) => progress >= stage.range[0] && progress < stage.range[1]
  );
  return index === -1 ? FEATURE_STAGES.length - 1 : index;
}

interface ProductStoryStageProps {
  /** Local story progress, 0–1 (already smoothed by the caller). */
  progress: MotionValue<number>;
  /** True while the story is close enough to the viewport to load/play video. */
  isNear: boolean;
  /** 0→1 entrance of the opening video frame; omitted = already fully in. */
  entrance?: MotionValue<number>;
  /**
   * Compact screens skip the background-video intro entirely: the phone is
   * present from the first frame and the copy arrives after a short scroll.
   */
  compact?: boolean;
  onViewFeatures: () => void;
}

/**
 * The story's contents (background video frame, scrim, phone, end-of-scroll
 * overlay), driven purely by `progress`. It fills its parent (`absolute
 * inset-0`), so it works both inside the standalone preview's sticky stage and
 * embedded in the main page's parallax track.
 */
export function ProductStoryStage({
  progress,
  isNear,
  entrance,
  compact = false,
  onViewFeatures,
}: ProductStoryStageProps) {
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const phoneVideoRef = useRef<HTMLVideoElement | null>(null);

  const reducedMotion = useReducedMotion() ?? false;
  const fullyIn = useMotionValue(1);
  // Compact: drive the intro from a value that is already past it, so every
  // intro-derived value (phone opacity/scale, video crossfade) sits at its end state.
  const pastIntro = useMotionValue(1);
  const transition = useIntroTransition(
    compact ? pastIntro : progress,
    reducedMotion,
    entrance ?? fullyIn
  );
  const { handoffAt, textRevealStart } = getStoryLayout(compact);

  const [introDone, setIntroDone] = useState(() => compact || progress.get() > INTRO_END);
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  useMotionValueEvent(progress, 'change', (value) => {
    setIntroDone((previous) => {
      if (value > INTRO_END) return true;
      if (value < INTRO_END - INTRO_END_HYSTERESIS) return false;
      return previous;
    });
    setActiveStageIndex(getActiveStageIndex(value));
  });

  const showBackground = !reducedMotion && !compact;

  useCoordinatedPlayback({
    backgroundRef: backgroundVideoRef,
    phoneRef: phoneVideoRef,
    isNear,
    introDone: introDone || reducedMotion || compact,
    reducedMotion,
  });
  useVideoSync({
    primaryRef: backgroundVideoRef,
    secondaryRef: phoneVideoRef,
    enabled: isNear && !introDone && !reducedMotion && !compact,
  });

  return (
    <div className="absolute inset-0">
      {showBackground && (
        <BackgroundVideo
          videoRef={backgroundVideoRef}
          src={PRODUCT_VIDEO.src}
          poster={PRODUCT_VIDEO.poster}
          load={isNear}
          scale={transition.backgroundScale}
          y={transition.backgroundY}
          opacity={transition.backgroundOpacity}
          dim={transition.backgroundDim}
        />
      )}

      {/* Dark radial scrim behind the phone so the device becomes the focus */}
      <motion.div
        style={{ opacity: transition.stageScrimOpacity }}
        className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.75)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      {/* Compact: the phone gets its own band under the headline and above
          the button, so it is smaller than on desktop. */}
      <div
        className={
          compact
            ? 'absolute inset-x-0 z-20 flex items-center justify-center'
            : 'absolute inset-0 z-20 flex items-center justify-center'
        }
        style={
          compact
            ? { top: `${COMPACT_PHONE_BAND.topPct}%`, bottom: `${COMPACT_PHONE_BAND.bottomPct}%` }
            : undefined
        }
      >
        <PhoneMockup
          opacity={transition.phoneOpacity}
          scale={transition.phoneScale}
          y={transition.phoneY}
          sizeClassName={compact ? 'h-full' : undefined}
        >
          <PhoneVideo
            videoRef={phoneVideoRef}
            stages={FEATURE_STAGES}
            activeStageIndex={activeStageIndex}
            load={isNear}
            opacity={transition.phoneVideoOpacity}
          />
        </PhoneMockup>
      </div>

      <StoryScrollIndicator progress={progress} handoffAt={handoffAt} />
      <StoryOverlay
        progress={progress}
        revealStart={textRevealStart}
        handoffAt={handoffAt}
        onViewFeatures={onViewFeatures}
      />
    </div>
  );
}

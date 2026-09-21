import { motion, MotionValue } from 'motion/react';
import { ParticleField } from './ParticleField';
import { EarlyAccessSignup } from './EarlyAccessSignup';

interface PlaceholderSection2Props {
  active?: boolean;
  contentY?: MotionValue<string>;
  contentOpacity?: MotionValue<number>;
}

export function PlaceholderSection2({ active = true, contentY, contentOpacity }: PlaceholderSection2Props) {
  return (
    <div
      id="placeholder-section-2-container"
      className="relative w-full h-full min-h-screen overflow-hidden select-none flex flex-col items-center justify-center text-center px-6"
    >
      {/* Background Image + lighter scrim, matching the same photo +
          gradient scrim atmosphere technique used elsewhere on the site */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <img
          src="/download-bg.webp"
          srcSet="/download-bg-mobile.webp 1400w, /download-bg.webp 2688w"
          sizes="100vw"
          alt=""
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-[#050505]/90" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 75% at 50% 45%, transparent 0%, rgba(5,5,5,0.25) 55%, rgba(5,5,5,0.85) 100%)',
          }}
        />
      </div>

      {/* Same interactive particle field used in the Hero section */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <ParticleField active={active} compactMax={10} />
      </div>

      <motion.div
        style={{
          y: contentY || 0,
          opacity: contentOpacity || 1,
        }}
        className="relative z-10 max-w-4xl w-full mx-auto flex flex-col items-center"
      >
        {/* Main Headline matching picture */}
        <h2
          id="download-app-headline"
          className="font-display font-medium text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-wide uppercase text-white leading-[1.1] drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)] select-none text-center"
        >
          Join the waitlist
          <br />
          for early access.
        </h2>

        {/* Get Early Access — Cinematic, high-tech biotechnology interactive CTA
            featuring cursor-tracking caustic light, conic laser perimeter beam,
            anamorphic lens flare, and multi-stage volumetric bloom. */}
        <div className="mt-10 sm:mt-12">
          <EarlyAccessSignup />
        </div>
      </motion.div>
    </div>
  );
}

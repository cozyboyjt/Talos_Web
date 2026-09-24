import { AnimatePresence, motion } from 'motion/react';
import { TALOS_FEATURES } from './featuresData';

interface FeatureCopyProps {
  activeIndex: number;
  /** False hides the counter + capsules (compact screens show numbered buttons up top instead). */
  showProgress?: boolean;
}

const copyVariants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.07 },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(8px)',
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

/**
 * Left-hand copy for the features overlay. Swaps (blur + rise) each time the
 * active feature stage changes; a row of capsules shows which of the features
 * you're on.
 */
export function FeatureCopy({ activeIndex, showProgress = true }: FeatureCopyProps) {
  const feature = TALOS_FEATURES[activeIndex] ?? TALOS_FEATURES[0];
  const total = TALOS_FEATURES.length;

  return (
    <div className="w-full max-w-md lg:max-w-lg text-center lg:text-left">
      <AnimatePresence mode="wait">
        <motion.div
          key={feature.id}
          variants={copyVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {showProgress && (
            <motion.div variants={itemVariants} className="flex items-center justify-center lg:justify-start gap-3">
              <span className="font-mono text-[10px] tracking-[0.25em] text-white/50">
                {String(activeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {TALOS_FEATURES.map((item, index) => (
                  <span
                    key={item.id}
                    className="h-[3px] rounded-full transition-all duration-500"
                    style={{
                      width: index === activeIndex ? 28 : 12,
                      backgroundColor:
                        index === activeIndex ? feature.accentColor : 'rgba(255,255,255,0.2)',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <motion.p
            variants={itemVariants}
            className={`${showProgress ? 'mt-5' : 'mt-0'} font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-white/50`}
          >
            {feature.category}
          </motion.p>

          <motion.h2
            variants={itemVariants}
            className="mt-3 font-display font-medium text-2xl sm:text-3xl lg:text-4xl tracking-wide uppercase text-white leading-[1.1] drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)]"
          >
            {feature.title}
          </motion.h2>

          <motion.span
            variants={itemVariants}
            className="mt-4 block h-px w-14 mx-auto lg:mx-0"
            style={{ backgroundColor: feature.accentColor }}
            aria-hidden="true"
          />

          <motion.p
            variants={itemVariants}
            className="mt-5 text-sm sm:text-base font-light text-white/75 tracking-[0.02em] leading-relaxed drop-shadow-[0_3px_10px_rgba(0,0,0,0.85)]"
          >
            {feature.paragraph1}
          </motion.p>
          <motion.p
            variants={itemVariants}
            className="mt-3 hidden sm:block text-sm font-light text-white/55 tracking-[0.02em] leading-relaxed"
          >
            {feature.paragraph2}
          </motion.p>

          <motion.ul
            variants={itemVariants}
            className="mt-5 hidden sm:flex flex-wrap gap-2 justify-center lg:justify-start"
          >
            {feature.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full px-3 py-1 text-[10px] tracking-[0.12em] uppercase bg-emerald-500/10 border border-emerald-500/20 text-white backdrop-blur-md"
              >
                {tag}
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

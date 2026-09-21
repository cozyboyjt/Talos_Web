import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { CinematicDownloadButton } from './CinematicDownloadButton';
import { EMAIL_PATTERN, SignupError, submitEmail } from '../utils/emailSignup';

type Mode = 'idle' | 'form' | 'done';

const swap = {
  initial: { opacity: 0, y: 10, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.96 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
};

/**
 * "Get Early Access": the cinematic button morphs into an email field. On
 * success it becomes a persistent "You're on the list" confirmation.
 */
export function EarlyAccessSignup() {
  const [mode, setMode] = useState<Mode>('idle');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mode === 'form') inputRef.current?.focus();
  }, [mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) return;

    // Honeypot: real people never see or fill this field.
    const honeypot = (event.currentTarget.elements.namedItem('company') as HTMLInputElement | null)
      ?.value;
    if (honeypot) {
      setMode('done');
      return;
    }

    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError('Please enter a valid email address.');
      inputRef.current?.focus();
      return;
    }

    setError(null);
    setIsSending(true);
    try {
      await submitEmail(value);
      setMode('done');
    } catch (err) {
      setError(err instanceof SignupError ? err.message : 'Something went wrong — please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <AnimatePresence mode="wait" initial={false}>
        {mode === 'idle' && (
          <motion.div key="idle" {...swap}>
            <CinematicDownloadButton id="btn-get-early-access" onClick={() => setMode('form')} />
          </motion.div>
        )}

        {mode === 'form' && (
          <motion.form
            key="form"
            {...swap}
            onSubmit={handleSubmit}
            noValidate
            style={{
              background:
                'rgba(8,9,8,0.78)',
              backdropFilter: 'blur(20px) saturate(140%)',
              WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !isSending) {
                setError(null);
                setMode('idle');
              }
            }}
            className={`relative flex items-center gap-2 rounded-full pl-6 pr-2 py-2 w-[min(92vw,26rem)] border border-white/10 transition-shadow duration-300 ${
              error
                ? 'shadow-[0_20px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15),0_0_0_1px_rgba(248,113,113,0.55),0_0_24px_rgba(248,113,113,0.15)]'
                : 'shadow-[0_20px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] focus-within:shadow-[0_20px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.2),0_0_0_1px_rgba(52,211,153,0.5),0_0_30px_rgba(52,211,153,0.2)]'
            }`}
          >
            <label htmlFor="early-access-email" className="sr-only">
              Email address
            </label>
            <input
              ref={inputRef}
              id="early-access-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(null);
              }}
              disabled={isSending}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'early-access-error' : undefined}
              className="select-text caret-emerald-400 min-w-0 flex-1 bg-transparent text-sm sm:text-base font-light tracking-wide text-white placeholder:text-white/40 focus:outline-none disabled:opacity-60"
            />
            {/* Honeypot (hidden from people and assistive tech) */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <button
              type="submit"
              disabled={isSending}
              aria-label="Join the early access list"
              className={`group flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 hover:bg-emerald-500/20 hover:border-emerald-400/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 disabled:cursor-wait cursor-pointer ${
                email.trim() ? 'bg-emerald-500/25 border-emerald-400/40 text-white' : 'bg-black/40 border-white/10 text-white/70'
              }`}
            >
              {isSending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              )}
            </button>
          </motion.form>
        )}

        {mode === 'done' && (
          <motion.div
            key="done"
            {...swap}
            role="status"
            className="inline-flex items-center gap-2.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-6 py-3.5 text-sm font-light tracking-wide text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md"
          >
            <Check className="h-4 w-4 text-emerald-400" />
            <span>You're on the list — we'll be in touch soon.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 min-h-5 text-center" aria-live="polite">
        {mode === 'form' && error && (
          <p id="early-access-error" className="text-xs font-light tracking-wide text-red-300/90">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

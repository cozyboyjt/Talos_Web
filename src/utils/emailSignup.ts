/**
 * Early-access email capture. The site has no backend, so signups are POSTed
 * to a form service (Formspree, Web3Forms, ...) configured through env vars:
 *
 *   VITE_SIGNUP_ENDPOINT    e.g. https://formspree.io/f/xxxxxxxx
 *                           or   https://api.web3forms.com/submit
 *   VITE_SIGNUP_ACCESS_KEY  optional; Web3Forms needs it, Formspree does not
 *
 * Put them in `.env.local` (see `.env.example`), then restart `npm run dev`.
 */
const ENDPOINT = import.meta.env.VITE_SIGNUP_ENDPOINT as string | undefined;
const ACCESS_KEY = import.meta.env.VITE_SIGNUP_ACCESS_KEY as string | undefined;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class SignupError extends Error {}

/** Resolves when the email was accepted; throws SignupError with a user-facing message otherwise. */
export async function submitEmail(email: string): Promise<void> {
  if (!ENDPOINT) {
    if (import.meta.env.DEV) {
      // Lets you try the whole UI before a service is connected.
      console.warn('[signup] VITE_SIGNUP_ENDPOINT is not set — simulating success in dev.');
      await new Promise((resolve) => setTimeout(resolve, 700));
      return;
    }
    throw new SignupError("Signups aren't open just yet — please check back soon.");
  }

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email,
        source: 'talos-landing-early-access',
        ...(ACCESS_KEY ? { access_key: ACCESS_KEY, subject: 'New Talos early-access signup' } : {}),
      }),
    });
  } catch {
    throw new SignupError('Network problem — please try again.');
  }

  if (!response.ok) {
    throw new SignupError('Something went wrong — please try again.');
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useState } from 'react';
import { ParallaxExperience } from './components/ParallaxExperience';
import { Preloader } from './components/Preloader';

const ProductStorySection = lazy(() =>
  import('./components/product-story/ProductStorySection').then((m) => ({
    default: m.ProductStorySection,
  }))
);

// Opt-in preview for the (not yet mounted) product showcase: /?preview=product-story
// Remove this flag once the section has a home in the page flow.
const isProductStoryPreview =
  new URLSearchParams(window.location.search).get('preview') === 'product-story';

export default function App() {
  // The preloader gates the hero's own entrance (siteReady) and is unmounted
  // once its halves have left. The preview page has no hero, so it skips it.
  const [siteReady, setSiteReady] = useState(isProductStoryPreview);
  const [preloaderDone, setPreloaderDone] = useState(isProductStoryPreview);

  return (
    <main className="w-full min-h-screen bg-[#050505] text-white selection:bg-white/20 selection:text-white">
      {isProductStoryPreview ? (
        <Suspense fallback={null}>
          <ProductStorySection />
        </Suspense>
      ) : (
        <ParallaxExperience siteReady={siteReady} />
      )}
      {!preloaderDone && (
        <Preloader onReveal={() => setSiteReady(true)} onComplete={() => setPreloaderDone(true)} />
      )}
    </main>
  );
}

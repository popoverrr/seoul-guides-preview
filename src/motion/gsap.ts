// Lazy GSAP setup (docs/03 § 1): plugins, eases "tea" and "turn", one context per page for cleanup.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';

export type Ctx = gsap.Context;
export { gsap, ScrollTrigger, SplitText };

let registered = false;

export async function setup(): Promise<Ctx> {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
    CustomEase.create('tea', '.22,.61,.12,1');
    CustomEase.create('turn', '.65,0,.35,1');
    gsap.defaults({ ease: 'tea' });
    registered = true;
  }
  await document.fonts.ready; // line splitting needs final metrics
  return gsap.context(() => {});
}

/** Give the main thread back between setup steps (scheduler.yield where available). */
export function yieldToMain(): Promise<void> {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return s?.yield ? s.yield() : new Promise((r) => setTimeout(r, 0));
}

/** Animate only what is still below the fold: no flash for content the reader already sees. */
export function below(el: Element): boolean {
  return el.getBoundingClientRect().top > innerHeight * 0.92;
}

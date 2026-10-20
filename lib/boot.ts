/**
 * Boot gate: the page intro and scrolling wait until the preloader / reveal
 * has uncovered enough of the screen. `Boot` calls `markBooted` once.
 */
let booted = false;
const waiting = new Set<() => void>();

export const isBooted = () => booted;

/** Runs `cb` once the page is uncovered (right away if it already is). Returns an unsubscribe. */
export const whenBooted = (cb: () => void) => {
  if (booted) {
    cb();
    return () => {};
  }
  waiting.add(cb);
  return () => {
    waiting.delete(cb);
  };
};

export const markBooted = () => {
  if (booted) return;
  booted = true;
  waiting.forEach((cb) => cb());
  waiting.clear();
};

/**
 * Runs before the first paint (inline in <body>). First visit of the session gets the
 * preloader (`data-preload`); every visit is covered by `.boot-cover` until `Boot` takes over.
 * The 4s timeout uncovers the page if the JS never arrives.
 */
export const BOOT_SCRIPT = `try{var k='tretyak:preloaded';if(sessionStorage.getItem(k)!=='1'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.setAttribute('data-preload','');sessionStorage.setItem(k,'1');}}catch(e){}setTimeout(function(){document.documentElement.setAttribute('data-booted','');},4000);`;

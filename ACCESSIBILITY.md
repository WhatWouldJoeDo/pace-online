# Accessibility review

Reviewed on 18 September 2026. Scope: `index.html`, `privacy.html`,
`terms.html`, `delete-account.html`, `impressum.html` and their shared styles.

## Assessment of the supplied audit

- Confirmed: low-contrast secondary text, missing persistent ticker pause,
  mobile overlay focus escaping into the page, missing legal-page navigation
  landmarks/skip links, and lost focus after signing in to delete an account.
- The lime focus ring already contrasts against dark surroundings because of
  its offset. The actual weak case is focus on a lime surface. A two-tone ring
  now works on both backgrounds and on photos.
- Outline text is not automatically a contrast failure: the visible stroke
  matters. Its stroke is now thicker and uses the higher-contrast muted color;
  Windows forced-colors mode receives solid system-colored text.
- English content marked `lang="en"` is not a page-language failure. The English
  legal copy is retained as requested. English phrases on the German landing
  page have language annotations where applicable.
- The browser scan additionally found links distinguishable only by color and
  an undersized password-recovery target. Both were corrected.

## Implemented behavior

- Secondary text uses `#a1a1aa`: 7.76:1 against `#09090b`. Profile text has a
  darker gradient backing for readability across the three photos.
- The ticker has a small pause/play icon on the lime background, with a 36 × 36 px
  hit area and an accessible action label. There is no show-all button. Reduced
  motion and JavaScript-disabled modes expose the complete static list with
  vertical scrolling. The decorative pulse ends after 4.2 seconds.
- The mobile menu makes background content inert, contains Tab/Shift+Tab,
  restores focus on Escape and desktop resize, and moves focus to the heading
  when following a section link. The menu scrolls on short screens.
- All pages have a keyboard skip link, main and footer landmarks. Legal-page
  text links are underlined and inputs have stronger boundaries.
- Account-deletion sign-in moves focus to confirmation. Completion moves focus
  to its message and leaves the completed controls disabled. Live-message
  containers remain in the accessibility tree.
- Carousel arrows retain focus at the first/last photo via `aria-disabled`.

## Validation

- Chromium + axe-core: no detected violations using WCAG 2 A/AA, WCAG 2.1 AA,
  WCAG 2.2 AA and best-practice tags on all five pages at 320 and 1440 CSS px.
- Extra scans cover the open mobile menu and simulated account-deletion states.
- Reflow checked at 320, 640 and 1440 CSS px, including text bounds rather than
  just document width. The 640 px viewport represents the available CSS width
  of a 1280 px viewport at 200% zoom; this was viewport emulation, not an OS zoom test.
- Keyboard checks cover skip links, forward/reverse menu traversal, Escape,
  section navigation, menu resizing, persistent ticker pause, list access and
  carousel boundaries. A 640 × 256 viewport checks short-screen menu scrolling.
- Reduced motion, no-JavaScript sport-list access and forced-colors text fallback
  checked. Login/deletion responses were mocked; no real accounts were modified.
- Automated contrast checks cannot resolve every gradient/photo/overlap. These
  remain manual-review items in axe. Targeted screenshots and color calculations
  were inspected; a full screen-reader and cross-browser audit is still required
  before making a comprehensive WCAG conformance statement.

## References

- [Pause, Stop, Hide (2.2.2)](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- [Contrast Minimum (1.4.3)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Focus Visible (2.4.7)](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
- [Bypass Blocks (2.4.1)](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)
- [Language of Page (3.1.1)](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)
- [Reflow (1.4.10)](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [Target Size Minimum (2.5.8)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

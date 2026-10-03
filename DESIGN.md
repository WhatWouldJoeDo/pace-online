# Pace interaction design

Reference inspected on 3 October 2026: [Armor](https://www.armor-bd.com/).
Inspection covered rendered desktop/mobile layouts, successive scroll positions,
and the behavior implemented by the public homepage scripts.

## Reference mechanisms and Pace adaptations

| Armor behavior | Pace implementation |
| --- | --- |
| A photograph stays pinned for a viewport of scrolling and scales up; mobile uses an unpinned zoom. | The cycling photograph stays sticky on larger screens and scales from 1 to 1.32. Mobile uses a smaller 1–1.12 zoom in ordinary document flow. |
| A canvas dot grid changes color near the cursor, moves with inertia, springs back, and reacts to clicks. | Lime proximity highlights, spring-based pointer repulsion and radial click impulses. The canvas draws only when visible and changing, with device-pixel ratio capped at 2. |
| The feature introduction pauses before a button-shaped opening expands into a complete feature surface. Longer content then moves upward inside the pinned scene. | A rounded aperture expands from “Pace entdecken” into the existing profile/location/chat cards. The timeline measures the content's actual height to expose its bottom on shorter desktop screens. |
| Feature cards show a cursor-following visual accent. | A subtle lime spotlight follows the pointer within each card. |

The implementation is original vanilla JavaScript and CSS; it does not bundle
the reference site's code, animation frameworks, WebGL effects or assets.
Scrolling remains native. No event handler intercepts wheel, touchmove or page
scrolling keys. Scroll updates share a requestAnimationFrame callback.

## Responsive and accessible behavior

- Pinning requires a viewport wider than 900 CSS px and at least 700 CSS px high.
  Smaller layouts keep every card in normal flow with a modest entrance zoom.
- Reduced motion disables zoom, clipping, pinning and spring physics, including
  when the preference changes while the page is open.
- Static content and CSS dots remain available without JavaScript. A missing
  canvas context falls back to the CSS dot pattern.
- The discovery link bypasses the animation and focuses the feature grid.
  Direct `#feature-details` links and history navigation reveal the same content.
- See `ACCESSIBILITY.md` for the browser checks and their scope.

## Assets and maintenance

`assets/pace-logo.png` is an unchanged copy of the Pace app's
`resources/icon.png`. CSS crops its surrounding padding for the navigation;
the actual artwork and colors are unchanged. Existing photos, WebP versions,
fonts and product copy are reused.

`assets/motion.css` owns the scene layouts and static fallbacks.
`assets/motion.js` owns measurement, scroll timelines, feature-link handling,
the dot springs and card lighting. It is loaded with `defer`. No build step
or runtime dependency is required.

## Hero and profile polish

The desktop navigation is capped at 1040 px wide and 54 px high. The hero photo
starts lower, uses a top-aligned crop and fades into the backdrop at its upper
edge, keeping faces below the navigation. A small, repeating SVG noise tile
adds static monochrome grain behind the content without an animation loop.
The match confirmation now occupies its own row below the profile with a 16 px
gap, including on mobile.

# Changelog

## Unreleased

- Point all seven former Lovable website links to the official Pace Linktree.

- Introduce Pace Sessions and Pace Groups with public-session and private-club
  previews, matching scroll reveals and pointer lighting, responsive layouts,
  and navigation links. Explain requests/invitations and group privacy; broaden
  the closing call to action beyond matching.

- Add an independent group-invitation page at `/group-invite` that opens the
  existing Pace app deep link. Validate token format, retain explicit acceptance
  inside the app, and exclude the page from indexing and referrer sharing.

- Give the original Pace logo more room inside its crop so the entire mark remains visible in the header and footer.

- Keep the privacy radar circular at every viewport size, place its labels inside the circle, and show three inset lime contact markers.
- Lift the hero photo by 24 px and soften its upper fade while preserving headroom below the navigation.

- Move the match confirmation into a separate note below the profile, with a consistent 16 px gap on desktop and mobile.
- Slim the desktop navigation to 1040 × 54 px and reframe the hero photo below it so the athletes' faces remain unobstructed.
- Add a subtle static monochrome grain tile to the hero backdrop; text, controls and original photos remain unchanged.

- Restore the original lime P logo from the app's `resources/icon.png` in the header and footer, with the artwork unchanged.
- Add scroll-linked photo zoom, a pinned feature reveal that expands from the discovery button, and a scrollable tour of the full feature panel. Add spring-based hover repulsion, click ripples and local hover lighting.
- Keep motion dependency-free: one scheduled scroll frame, capped canvas resolution, sleeping dot physics, and no wheel/touch interception. Mobile/short viewports use unpinned photo/card zoom; reduced-motion and no-JavaScript modes retain a static, readable layout.

- Redesign the landing page with an Armor-inspired photographic hero, floating pill navigation, rounded sections, and spacious typography, keeping Pace’s black/lime palette and existing product content.
- Preserve native scrolling, adjust anchor offsets for the floating header, retain mobile-menu focus management, and reveal tall sections correctly on short screens. Remove pointer-driven card tilt and keep reduced-motion/no-JavaScript fallbacks.
- Move page styles into a cacheable stylesheet and preload the main Inter font. Deliver cycling/hiking previews as WebP (214 KB combined instead of 3.95 MB of PNGs).

- Align the Paul, 29 profile preview with the app's current discovery overlay: shared Pass/Match bar inside the photo, matching typography, spacing and sport tags. Keep all existing photos and carousel controls.
- Move the carousel arrows down towards the middle of the photo while keeping them clear of the profile text overlay on small screens.

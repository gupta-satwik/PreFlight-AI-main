Role Context: You are an elite frontend UI/UX engineer specializing in high-performance, 60fps micro-interactions using Next.js, React, and raw CSS.

Mission: We are elevating the preflight-web frontend to a 10/10 tier by implementing a suite of cursor-tracking, context-aware interactive elements. Performance is the absolute highest priority. Do not use React useState to track (x, y) coordinates for rendering, as this will cause frame drops. You must use refs and CSS variables (--x, --y).

Please implement the following four features globally across the application.

1. Global Interactive Grid Glow (components/GridGlow.tsx & app/layout.tsx)
Create a new component GridGlow.tsx that renders a background grid masked by a radial gradient tracking the mouse.

Attach a mousemove listener to the window to update --x and --y CSS properties on the container ref.

The grid should use our existing var(--border) CSS variable.

Action: Add this component to app/layout.tsx inside the #root or app-shell div so it persists globally across the landing page and dashboard. Ensure it has pointer-events: none and z-index: 0 (or underneath the main content).

2. Context-Aware Glow Colors
The global grid glow should change color dynamically based on what the user is hovering over.

Default: Subtle cyan or cool gray (var(--border) or a faint rgba).

Hovering a "PASS" element: Shift the glow to var(--accent-pass).

Hovering a "BLOCK" element / "attack" text: Shift the glow to var(--accent-block).

Implementation Strategy: Use a data-glow-target="pass|block" attribute on specific DOM elements. In the GridGlow's mousemove event, use e.target.closest('[data-glow-target]') to detect if the cursor is over a specific context. Update a --glow-color CSS variable dynamically. Add a CSS transition: --glow-color 0.3s ease to make the color shift smooth.

3. Spotlight Cards (components/ScanCard.tsx)
Upgrade the ScanCard component to feature a glassmorphism "spotlight border" effect.

When the mouse moves near or inside a ScanCard, a subtle highlight should glide along its border.

Implementation Strategy: Apply the same CSS variable trick directly within the ScanCard component or via a generic wrapper. Use an ::before pseudo-element with a background of radial-gradient(250px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.1), transparent) masked to just the 1px border area.

Ensure you pass data-glow-target={scan.verdict.toLowerCase()} to the root of the ScanCard so the global GridGlow syncs with the card's verdict!

4. Magnetic Elements (components/MagneticButton.tsx)
Create a wrapper component (e.g., Magnetic.tsx) that can wrap our primary CTA buttons (like ▶ Run live demo in app/page.tsx and app/dashboard/page.tsx).

Behavior: When the cursor enters a designated bounding box around the button (e.g., a 50px threshold), the button should gently translate towards the cursor (transform: translate(x, y)).

Use gsap (if installed) or raw CSS transform with requestAnimationFrame/lerp for a buttery smooth magnetic pull and release. The pull should be subtle (max 15-20px displacement) so it feels tactile but not difficult to click.

Execution Rules:

Zero Layout Shift: These changes must be purely visual layers (pointer-events-none, absolute/fixed positioning, pseudo-elements).

No useState for Mouse tracking: Only use .style.setProperty('--var', ...) in useEffect listeners.

Graceful Degradation: Ensure standard CSS fallbacks exist if JavaScript is slow to initialize.

Review the Existing Code: Read app/layout.tsx, components/ScanCard.tsx, and app/globals.css before writing to ensure your CSS aligns with our existing stark/glassmorphic Neobrutalist theme.

Please output the specific file changes and code required to implement these 4 steps.
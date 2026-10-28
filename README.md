# sabinmaharjan1.com.np

Plain HTML, CSS and JavaScript. No build step and no Node needed.

- `index.html` holds all the page text. Edit it directly.
- `styles.css` holds the design. Light theme colours are at the top under `:root`,
  dark theme colours under `:root[data-theme="dark"]` (and repeated in the
  `prefers-color-scheme` block below it).
- `network.js` runs the network effects and the light and dark toggle:
  the hero and footer topology, the cursor network, tap and scroll pings.
- The decorative cables are the `<div class="cables">` block at the top of `<main>`.
- `404.html` is self contained and shown for unknown links. `CNAME` keeps the custom domain.

To preview, open the folder in VS Code and use Live Server, or double click `index.html`.
To publish, commit and push to the branch GitHub Pages serves from.

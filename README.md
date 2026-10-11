# VoltX

A structured static front-end prototype for the VoltX citizen and government scheme experience, with the supplied Rashtriya Jan Kalyan Yojana logo used consistently throughout the UI.

## Project structure

```text
voltx-refactored/
├── index.html       # Complete page markup
├── css/
│   └── styles.css   # Design tokens, components, layout, and responsive rules
├── js/
│   └── app.js       # Client-side navigation and demonstration interactions
├── assets/
│   ├── logo.png     # Supplied logo, also used as favicon
│   └── india-map.jpg # Local artwork for the map view
└── README.md
```

## Run locally

Open `index.html` in a modern browser, or run a static server from this folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Notes

- Logo images use `assets/logo.png` directly in HTML rather than depending on JavaScript to populate image sources.
- Legacy image class names were replaced with semantic `brand-logo` / `logo-frame` classes.
- The embedded map artwork is stored separately in `assets/india-map.jpg` instead of being encoded in JavaScript.
- The page remains a browser-side prototype. Authentication, OTP, scheme matching, chat, and dashboard flows are simulated unless a backend is connected.
- Google Fonts are loaded remotely; system font fallbacks are defined in CSS.
- No build step or package installation is required.

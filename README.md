# Soft Sky

A quiet, illustrated weather display designed for Safari on iOS 9.3.5. Plain HTML, CSS and ES5 JavaScript. No build step or runtime dependencies.

## Use

Open the HTTPS site, choose a city, then use Settings to customize the display. All time uses a 24-hour clock in the selected city's time zone. All measurements use US units. Saved cities and settings are browser-local.

Five pages: Now, Next 24 hours (four groups of six), Seven days, Conditions, and Sun & sky. Rotation completes all enabled pages, then optionally moves to the next saved city. Opening search or settings suspends rotation. Touch the pause button to stay on a page.

## iPad setup

1. Open the HTTPS URL in Safari. Confirm it loads without a certificate warning.
2. Choose a city. Optionally use Share → Add to Home Screen.
3. For an always-on home display, connect power and adjust the iPad's Auto-Lock setting yourself. The page cannot prevent iOS 9 from sleeping.
4. Test both orientations, city search, live updates, page rotation, and settings on the physical iPad.

This implementation uses ES5 syntax, XMLHttpRequest, basic SVG, traditional layouts and CSS media queries. It avoids fetch, promises, modules, CSS Grid, CSS variables, external scripts/fonts, service workers, and modern internationalization APIs. A modern browser with an iPad-sized viewport is not proof of iOS 9 compatibility. The actual device's TLS and certificate trust must also work with GitHub Pages and both Open-Meteo endpoints. Never bypass certificate warnings or downgrade to HTTP. iOS 9 is an obsolete operating system; this website cannot patch its security vulnerabilities.

## Privacy and security

No accounts, GPS, analytics, advertising, API keys or backend. City queries and city-center coordinates are sent over HTTPS to Open-Meteo, which can see your IP address. The hosting provider also receives ordinary website requests. Saved preferences are not embedded in source, URLs, or shared across visitors. The last successful weather response is cached only in this browser. Reset preferences clears the app's two storage keys.

Search and API strings are rendered using textContent. A restrictive meta Content Security Policy permits only same-origin assets and the two required HTTPS API hosts. GitHub Pages does not support custom response headers; meta CSP cannot supply frame-ancestors or every header-level protection. No claim of absolute interception resistance is made.

Missing values display as an em dash. Failed requests retain the most recent successful response and expose a retry action. Old data is marked STALE after the selected refresh interval plus one minute. Weather is model-derived, not guaranteed station observations. Use an official warning source for severe weather.

## Data and attribution

Weather and city search: [Open-Meteo](https://open-meteo.com/), data under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Geocoding data originates from [GeoNames](https://www.geonames.org/). The free Open-Meteo endpoint is intended for noncommercial use and has no uptime guarantee. Original illustrations are included in assets.

## Development

Serve the directory using a static server, for example `python3 -m http.server 8765 --bind 127.0.0.1`. Local HTTP is for loopback development only; deploy using HTTPS.

Run `node tests/test.js` for logic, error, storage, navigation and late-response checks. Tests use synthetic locations and synthetic weather, not user preferences. The test runner needs Node; the website does not.

Publish the root of the main branch using GitHub Pages and enable Enforce HTTPS. No secrets or deployment credentials belong in the repository.

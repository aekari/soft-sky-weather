# Soft Sky

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A quiet, illustrated weather display designed for Safari on iOS 9.3.5. Plain HTML, CSS and ES5 JavaScript. No build step, framework, or external script service. Astronomy calculations are bundled locally.

## Use

Open the HTTPS site, choose a city, then use Settings to customize the display. Times use the selected city’s time zone. All clocks and event times use 12-hour AM/PM. All measurements default to US units: °F, mph, inches, miles, and inHg. Saved cities and settings are browser-local.

Five default pages: Now, Conditions, Sun & sky, Seven days, and Next 24 hours. Moon is an optional sixth page, disabled until enabled in Settings → Pages. Look ahead opens at hours 1–6; the four buttons beneath it select later six-hour groups. Rotation completes all enabled pages, then optionally moves to the next saved city. Opening search or settings suspends rotation. Touch the pause button to stay on a page.

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

## Motion and daylight

Page changes dissolve simultaneously over 800 ms while the background remains mounted. Turn this off with **Fade between pages**. Foreground clouds drift automatically using transform-only motion; distant wisps stay still. There is no cloud-motion toggle. Browsers that support reduced-motion preferences suppress the decorative drift.

**Scenery** replaces accent palettes: Mountain forest, Tropical coast, City skyline, and Christmas. Christmas is listed in Settings and active only during December in the selected city's local time; it falls back to Mountain forest otherwise. All four scenes have day, sunset and night plates, blended every ten seconds using calculated solar elevation. Automatic appearance handles polar day/night without requiring sunrise and sunset values. Always light/dark overrides remain available.

The sun follows a decorative daylight-progress arc. The moon shows the current calculated illuminated fraction and waxing/waning phase; its sky placement is decorative, not a moonrise or azimuth prediction. Its orientation is mirrored between hemispheres, rather than modeling the exact local tilt. Sun & sky includes the phase name and illuminated percentage. These astronomical estimates run offline through bundled [SunCalc 1.9.0](https://github.com/mourner/suncalc/tree/v1.9.0), with its BSD license in `assets/vendor/SunCalc-LICENSE.txt`. They do not add an API connection.

Stars, sun haze, moon haze, clouds and scenery are separate local PNG assets. Only the selected scenery's three background plates load; switching themes downloads the other scene as needed. First loading the illustrated art can take longer on an older connection. Transparent asset masters are supplied separately for reuse.

## iOS 9 connection troubleshooting

WPA Wi-Fi encryption and the browser's HTTPS certificate trust are separate. A visible page with failed API requests does not prove Wi-Fi is broken. Both Open-Meteo endpoints presented Let's Encrypt certificates when checked. [Let's Encrypt lists iOS 10+ for ISRG Root X1 trust](https://letsencrypt.org/docs/certificate-compatibility/), so stock iOS 9 may reject these services. This cannot be repaired by ES5 JavaScript or an animation change.

Settings → Connection help includes two HTTPS tests with neutral example coordinates. Confirm the device's date/time, and report the exact Safari error without bypassing it. If certificate trust is the cause, options are a carefully verified official root-certificate update on the device or an HTTPS relay with a chain it already trusts. Neither has been configured by this site. No HTTP fallback, public third-party proxy, or certificate-validation bypass is used.

## Clock and request resilience

City-local time no longer depends on a successful forecast. City search supplies an IANA timezone; older saved cities recover it through the geocoding ID lookup. A bundled 25 KB offset table supports 597 public timezone identifiers for 2025–2035, including daylight-saving transitions, without Intl or a third-party time service. Rebuild periodically with `python3 tools/build-timezones.py` when governments change timezone rules. Outside that range, a successful forecast's offset is used; unknown offsets are not presented as accurate city time.

Requests now allow 45 seconds and retry network/timeout/server failures once. Both load and readystatechange completion paths are supported with a once-only callback. Errors distinguish HTTP errors, timeouts, unreadable responses and generic network/browser-security failures; the app cannot diagnose a certificate error from XMLHttpRequest alone.

Default page order: Now → Conditions → Sun & sky → Seven days → Next 24 hours. The optional Moon entry is placed after Sun & sky and starts disabled. Existing untouched defaults migrate to this order; custom arrangements remain saved. Reorder controls move existing settings rows in place and preserve scroll position. The sun and moon are mutually exclusive at the sunrise/sunset threshold, including twilight. Forced light/dark appearance uses the corresponding celestial body.

## Moon page

The Moon page shows phase, illuminated percentage, approximate tropical zodiac sign, city-local moonrise/set, and estimated next full/new moon times. Existing page lists gain a disabled Moon entry after Sun & sky; enabled/disabled settings and custom order remain supported. Moon information refreshes once a minute while that page is visible.

The tropical sign divides approximate geocentric ecliptic longitude into twelve equal 30-degree sectors; it is not an astronomical constellation or a sidereal zodiac. Longitude uses the same compact lunar model as bundled SunCalc. Within two degrees of a boundary, the UI notes a nearby sign change. Event times and signs are estimates, not precision ephemerides. Moonrise/set are collected across adjacent UTC days and filtered to the selected city's calendar date. Missing rise/set events display “No rise today” or “No set today.” Upcoming phases are bracketed over the next 35 days and refined numerically as extrema of SunCalc's illuminated fraction.

Bottom arrows and automatic rotation always advance to the next enabled page. They never step through hourly subgroups, and every entry to Look ahead starts at 1–6 hours.

## License

Soft Sky is released under the [MIT License](LICENSE). Bundled SunCalc retains its [BSD license](assets/vendor/SunCalc-LICENSE.txt); weather and geocoding data retain the licenses listed above.

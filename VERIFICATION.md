# Verification

## Completed

- 17 synthetic regression checks pass: fresh state, unavailable/corrupt storage, missing values, US-unit HTTPS requests, fractional-hour city offsets, condition icons, four hourly groups, reverse navigation, five-page rendering, late responses, failures, incomplete data, city rotation, enabled-page fallback, safe text rendering and CSP restrictions.
- Application parsed successfully with Acorn 8.15.0 configured for ECMAScript 5.
- Live city search and weather retrieval verified in the local browser.
- Portrait 768 × 1024 and landscape 1024 × 768 layouts checked visually.
- Large-text dark Conditions and Sun & sky layouts checked. Page controls, settings and appearance changes exercised.
- Network timeout observed: last successful weather retained, error and Retry displayed.
- No external scripts/fonts, analytics, keys, GPS requests, or personal source data. Neutral Git commit attribution.

## Physical-device acceptance still required

This environment does not contain an iOS 9.3.5 Safari device. Viewport testing and ES5 parsing do not emulate that browser or its certificate trust store.

On the actual iPad, confirm the HTTPS page and both API services load without certificate warnings; search and select a city; inspect all five pages in both orientations; change/save settings and reload; leave rotation running; interrupt Wi-Fi and restore it. Confirm 24-hour time, US units, and automatic refresh. Test Safari and Add to Home Screen mode separately.

If an endpoint fails certificate validation, do not use HTTP or disable validation. Reassess hosting/API delivery before calling the device supported.

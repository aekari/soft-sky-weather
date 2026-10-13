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

## Motion / connection-help update

- 23 regression checks pass, including sunrise/noon/sunset positions, missing/polar data, clamping outside daylight, fades on/off and HTTPS diagnostic links.
- ES5 syntax revalidated.
- Browser inspection confirmed a real opacity transition during page navigation.
- Added actionable connection guidance; the physical iPad's failure is not marked resolved without its diagnostic result.

## Independent clock and request recovery

- 29 regression checks pass, including clock rendering without weather, US daylight-saving changes, fractional-hour offsets, unknown/expired timezone rules, transient retry, timeout exhaustion and duplicate legacy XHR completion events.
- Both application and bundled timezone scripts parse as ES5.
- Verified the geocoding ID lookup returns an IANA timezone for saved-city migration.
- Both APIs returned Access-Control-Allow-Origin: * during inspection. The user's direct city-search test loaded JSON, so a certificate failure on that host is not established. Forecast-host testing on the physical iPad remains pending.

- The user also confirmed the minimal forecast URL opens directly on the iPad. A separate in-page diagnostic now tests same-origin, city search, small forecast and full forecast requests; a successful direct navigation does not prove cross-origin XHR works. Root cause is still pending device-side diagnostic output.

## Safari request compatibility investigation

- Physical-device report: same-origin and city-search XHR pass; both small and full forecast XHR fail with status 0, although direct forecast navigation displays JSON. The cause is not established.
- Forecast retries now use a fresh URL and the CORS-safelisted `Accept: application/json` header. This is a candidate workaround, not a verified device fix. HTTPS, host restrictions, and certificate validation are unchanged.
- Diagnostic version 5 compares ordinary, uncached, explicit JSON, plain-text decoding, and full-forecast requests. It validates JSON and summarizes passing checks. No personal settings are accessed.
- 30 regression checks pass; application and diagnostics parse as ES5. The server accepts the fresh-request parameter with HTTP 200 and the intended CORS headers.
- No relay or additional hosting has been deployed. Physical-device verification remains required.

## Display refinement

- Replaced competing fade animation/transition with one opacity transition; content replacement remains hidden until layout settles.
- Large mode uses a 3-by-2 hourly layout, two-column portrait details and metrics, and larger city/clock/forecast typography. Verified portrait Now/Conditions and landscape hourly/week/sun layouts in 768x1024 and 1024x768 browser viewports.
- Settings dialog is height-bounded with native touch scrolling. Browser verification reached the reset control at the bottom.
- Automatic sky colors interpolate through dawn, daytime, afternoon, sunset and night using city sunrise/sunset, updated every 10 seconds. Forced light/dark settings remain supported.
- Navigation is hidden before city selection. 32 regression checks pass, including navigation visibility and solar color interpolation; application parses as ES5.
- Physical iOS 9 Safari confirmation is still needed for compositor flicker and touch scrolling.

## Illustrated scenery release

- 36 logic checks pass, including December-only scenery, continuous normalized twilight weights, known new/full moon dates, and finite phase-mask outlines.
- Application and bundled SunCalc parse as ES5. HTTPS API allowlist and CSP remain unchanged; no additional service or key is required.
- Browser checks at 1024x768 and 768x1024 verified large Now/hourly/Sun & sky layouts, selected-scene image loading, settings scrolling, and the October fallback from Christmas to Mountain.
- Background layers remain mounted across page changes. Day/night cloud layers use separate opacity weights to avoid an opaque night layer showing behind daytime clouds.
- Physical Safari iOS 9 testing is still required for device memory limits, SVG image clipping and animation smoothness. Modern viewport checks are not an iOS emulator.

## Motion and settings corrections

- 40 regression checks cover default-order migration/custom-order retention, December-only choices and exclusive celestial selection. ES5 parsing remains required.
- Browser checks confirmed nighttime sun hidden/moon visible, automatic cloud transforms changing over time, and no Christmas or drifting toggle in October settings.
- Direct coordinate click on an in-view reorder arrow preserved the dialog scroll offset at 461 px; focus remained on the moved control.
- During crossfade, browser inspection measured incoming opacity 0.152 and outgoing opacity 0.848 simultaneously. Outgoing content had no duplicate IDs and is removed after the dissolve.
- Physical iOS 9 animation smoothness remains a device-side verification step.

## Moon page and direct page navigation

- 45 checks pass, including hourly entry reset and subgroup buttons, six-page rendering, preserved custom ordering, Moon disabled by default and opt-in persistence, known tropical signs at 2024 new/full moons, upcoming phase dates within six hours of known events, and city-day filtering for moonrise/set.
- Moon facts use bundled local astronomy calculations with no new network origins. Zodiac sign is labeled tropical and approximate, with a boundary note.
- Portrait and landscape browser review checks large-text Moon content and navigation fit; physical iOS 9 remains the final device check.

- Upcoming event estimates remain stable across minute-to-minute refreshes; the search uses illumination extrema rather than assuming signed lunar phase is monotonic.

- Look ahead uses 12-hour AM/PM labels, including noon, midnight and fractional city offsets; the main clock remains 24-hour. All 46 regression checks pass.

## 12-hour time and licensing update

- All 47 synthetic checks pass, including noon/midnight, fractional city offsets, the corner clock, and US-unit requests.
- Application still parses as ECMAScript 5.
- All displayed clock/event times use AM/PM; forecast duration labels still describe hours ahead.
- Apache 2.0 license and README badge added; bundled SunCalc BSD attribution retained.

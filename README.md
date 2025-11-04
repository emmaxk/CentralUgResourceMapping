# CentralUgandaGIS

A client-side GIS web app for Central Uganda featuring an interactive Leaflet map, district boundaries, analytics, exports, printing, and a responsive UI.

## Features
- Interactive map with clustering, heatmap, routing, measuring, print
- District boundary loading from `centralUgandaDistricts.geojson`
- Facility filters and district dropdown, details panel
- Analytics dashboard (Chart.js) driven from `js/data.js`
- Data export buttons (CSV/GeoJSON/KML placeholders)
- Persistent likes per facility (localStorage)

## Data
- Source data lives in `js/data.js` as `facilitiesData`.
- The app only reports these facility types in analytics and homepage stats:
  - Hospitals, Health Centers, Clinics, Schools, Police Stations, Universities

## Development
- Open `map.html` for the map, `analytics.html` for charts, `index.html` for landing.
- No build step required; everything runs in the browser.

## Common Issues
- District filter shows 0 facilities: ensure the facility `district` names match the district dropdown and GeoJSON. The code trims and lowercases for comparison.
- Measurement tool requires the Leaflet Measure plugin (already loaded in `map.html`).
- Printing relies on tile loading; wait a few seconds if the page is blank.

## Customization
- Colors, typography: `css/main.css`, landing: `css/landing.css`
- Map config (tiles, styles): `js/config.js`
- Marker icons and sizes: `CONFIG.markerIcons` in `js/config.js`

## License
MIT




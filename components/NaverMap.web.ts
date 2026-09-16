// Web screens render their existing fallback. Do not import the native SDK here:
// its codegen runs during web SSR even if the map element is never mounted.
export const NaverMapView = () => null;
export const NaverMapMarkerOverlay = () => null;
export const NaverMapPathOverlay = () => null;

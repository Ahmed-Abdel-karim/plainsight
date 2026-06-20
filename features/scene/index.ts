/**
 * Public API of the scene feature — the market explorer for one city. `app/`
 * composes the persistent shell (`SceneProvider`, `MapView`, `SceneNotifications`)
 * in the `(scene)` layout and renders `SceneView` per city. Everything else under
 * `scene/` is internal; consume the feature only through this barrel.
 */
export { SceneView } from "./scene-view";
export { SceneNotifications } from "./scene-notifications";
export { MapView } from "./map";
export { SceneProvider } from "./state";

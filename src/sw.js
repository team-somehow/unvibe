import { clientsClaim } from 'workbox-core'
import { PrecacheController, PrecacheRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { RangeRequestsPlugin } from 'workbox-range-requests'

// Only build-time assets are cached. In particular, no companion origin, API
// response, Authorization header, transcript or pairing link enters CacheStorage.
const precache = new PrecacheController({ plugins: [new RangeRequestsPlugin()] })
precache.precache(self.__WB_MANIFEST)
registerRoute(
  ({ request, url }) => request.headers.has('authorization') || url.origin !== self.location.origin || /^\/api(?:\/|$)/.test(url.pathname),
  ({ request }) => fetch(request),
)
registerRoute(new PrecacheRoute(precache, { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] }))
registerRoute(
  new NavigationRoute(precache.createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api(?:\/|$)/, /^\/audio\//, /\.[^/]+$/],
  }),
)
cleanupOutdatedCaches()
clientsClaim()

// Activate an update only after the visitor chooses "Update" in the app.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

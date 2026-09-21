/**
 * Moves to another step of the page the person is already on -- the next
 * booking step, an onboarding step -- by changing only the URL.
 *
 * `router.push` would have the server render the page again, which on every
 * step meant a session lookup against the database and a wait with nothing
 * new to fetch. Next.js keeps `useSearchParams` in step with the History API,
 * so the step still lives in the URL and the browser's Back button still walks
 * back through the steps -- the server is just no longer asked.
 *
 * Only for URLs on the current page. Going to a different page still needs
 * the router, which knows how to load it.
 */
export function pushSamePage(url: string): void {
  window.history.pushState(null, '', url);
}

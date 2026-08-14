import { AppShell } from '@/components/AppShell';

/**
 * The entire product is one cohesive live-demo surface.
 *
 * Note what is NOT here: no document data, no corpus, no props carrying
 * enterprise content. This page renders a shell; every piece of enterprise
 * information the browser ever sees arrives from an authorized API response.
 */
export default function Page() {
  return <AppShell />;
}

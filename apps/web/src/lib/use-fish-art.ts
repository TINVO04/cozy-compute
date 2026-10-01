import { useSyncExternalStore } from 'react';
import { fishArtRevision, subscribeFishArt } from '../art/fish-assets';

/** Refresh canvas previews when shared illustration assets finish loading. */
export function useFishArt(): number {
  // Canvas/icon callers request their own species; a held preview need not load the full collection.
  return useSyncExternalStore(subscribeFishArt, fishArtRevision, () => 0);
}

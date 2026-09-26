const BLOCKED = ['nigger', 'faggot', 'retard', 'kys'];

/** Light profanity masking for chat bubbles. Reports and mutes remain the main moderation tools. */
export function cleanChat(input: string): string {
  let text = Array.from(input)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
  for (const word of BLOCKED) {
    text = text.replace(new RegExp(word, 'gi'), (m) => '*'.repeat(m.length));
  }
  return text;
}

export const EMOTES = ['wave', 'laugh', 'heart', 'shock', 'dance', 'sleep', 'angry', 'thumbs'] as const;
export type Emote = (typeof EMOTES)[number];


/**
 * Parses a base64 data URI string into its MIME type and data components.
 * @param dataUri The base64 data URI (e.g., 'data:image/jpeg;base64,...').
 * @returns An object containing the MIME type and the base64 data string.
 */
export const base64ToMimeAndData = (dataUri: string): { mimeType: string | null; data: string | null } => {
  const match = dataUri.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    return { mimeType: null, data: null };
  }
  return {
    mimeType: match[1],
    data: match[2],
  };
};

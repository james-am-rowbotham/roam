// Stable slug for a coarse region name → the discovery Region id + Section suffix.
// Shared by readKnowledge (pack) and content-db (DB content scopes) so a content
// scope id always matches the id the pack uses. Do not fork.
export const slugify = (s: string): string => {
  const ascii = s
    .toLowerCase()
    .normalize('NFD')
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: NFD combining diacritics, stripped on purpose
    .replace(/[̀-ͯ]/g, '');
  return ascii.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

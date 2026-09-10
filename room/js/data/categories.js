/**
 * Category registry.
 *
 * Furniture in the 3D room is bound to a category only by `id`, so adding a new
 * category is a two-step job: append an entry here, then give the new furniture
 * mesh `userData.categoryId = "<id>"` in the scene builder. Nothing else in the
 * app knows which mesh belongs to which category.
 */
export const CATEGORIES = [
  {
    id: 'tv',
    label: 'Small Talk',
    hint: 'casual',
    glyph: '📺',
    accent: '#7fd6ff',
    /** how the aquarium-style detail view behaves: "list" | "swim" */
    mode: 'list'
  },
  {
    id: 'bookshelf',
    label: 'Formal',
    hint: 'meetings',
    glyph: '📚',
    accent: '#ffc27f',
    mode: 'list'
  },
  {
    id: 'aquarium',
    label: 'Favorites',
    hint: 'one fish, one phrase',
    glyph: '🐟',
    accent: '#8affd1',
    mode: 'swim'
  }
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id) {
  return BY_ID.get(id) ?? CATEGORIES[0];
}

export function isCategory(id) {
  return BY_ID.has(id);
}

/** A party list being written: names in order, each once. */
export type ListDraft = readonly string[];

/** Adds a name at the end, unless it is already on the list. */
export function addToList(list: ListDraft, name: string): ListDraft {
  return list.includes(name) ? list : [...list, name];
}

export function removeFromList(list: ListDraft, name: string): ListDraft {
  return list.filter((item) => item !== name);
}

/** Moves a name one place up; the first stays first. */
export function moveUp(list: ListDraft, name: string): ListDraft {
  const index = list.indexOf(name);
  if (index <= 0) return list;
  const next = [...list];
  [next[index - 1], next[index]] = [name, list[index - 1] ?? name];
  return next;
}

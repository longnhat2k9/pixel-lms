// A tiny deterministic PRNG (mulberry32) + string hash, so we can shuffle an
// ordering question's items the same way every time for a given seed (e.g.
// "attemptId-questionId"). This keeps the scrambled order stable across
// page reloads instead of re-randomizing on every fetch.

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds the `data` payload to send to the client for an ordering question.
// reveal=true (graders, or finished attempts with answers shown) sends the
// items in their TRUE (correct) order, tagged with their own index as `id`.
// reveal=false sends them deterministically shuffled by seedKey, so a
// student can't just read off the answer, but the order stays stable across
// reloads of the same attempt/practice session.
export function buildOrderingData(items, seedKey, reveal) {
  const order = reveal ? items.map((_, i) => i) : seededShuffle(items.map((_, i) => i), seedKey);
  return { items: order.map((i) => ({ id: i, text: items[i] })) };
}

// Builds the `data` payload for a grouping question. `items` here is the
// full teacher-entered list of { text, columnIndex }. reveal=true (graders,
// or finished attempts with answers shown) includes columnIndex on every
// item — the correct grouping. reveal=false shuffles the POOL display order
// (so items from the same column don't sit suspiciously next to each other)
// and strips columnIndex entirely, so a student can't peek at the answer.
export function buildGroupingData(columns, items, seedKey, reveal) {
  const order = reveal ? items.map((_, i) => i) : seededShuffle(items.map((_, i) => i), seedKey);
  return {
    columns,
    items: order.map((i) => ({
      id: i,
      text: items[i].text,
      ...(reveal ? { columnIndex: items[i].columnIndex } : {}),
    })),
  };
}
// Guaranteed not to return the identity order for arrays of length >= 2
// (so the "correct" sequence is never accidentally shown pre-solved).
export function seededShuffle(arr, seedString) {
  const rand = mulberry32(hashStr(seedString));
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (result.length >= 2 && result.every((v, i) => v === arr[i])) {
    // extremely unlikely but possible for small arrays — force a swap
    [result[0], result[1]] = [result[1], result[0]];
  }
  return result;
}

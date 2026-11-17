// Logica jocului "Colonia de Furnicuțe"
// Fiecare mușuroi (nest) este un array de culori; ultimul element = furnica de deasupra.

export const CAPACITY = 4;

export const COLORS = [
  '#e74c3c', // roșu
  '#3498db', // albastru
  '#2ecc71', // verde
  '#f1c40f', // galben
  '#9b59b6', // mov
  '#e67e22', // portocaliu
  '#1abc9c', // turcoaz
  '#ff6fb5', // roz
  '#f5f5f5', // alb
  '#222222', // negru
  '#1e3799', // bleumarin
  '#95a5a6', // gri
];

const top = (nest) => nest[nest.length - 1];

// Câte furnici de aceeași culoare sunt grupate deasupra
export function topGroupSize(nest) {
  if (nest.length === 0) return 0;
  const c = top(nest);
  let n = 0;
  for (let i = nest.length - 1; i >= 0 && nest[i] === c; i--) n++;
  return n;
}

export function canMove(nests, from, to) {
  if (from === to) return false;
  const a = nests[from];
  const b = nests[to];
  if (a.length === 0 || b.length >= CAPACITY) return false;
  if (b.length === 0) return true;
  return top(a) === top(b);
}

// Mută grupul de deasupra (cât încape). Returnează noile mușuroaie și câte furnici s-au mutat.
export function applyMove(nests, from, to) {
  const next = nests.map((n) => n.slice());
  const count = Math.min(topGroupSize(next[from]), CAPACITY - next[to].length);
  for (let i = 0; i < count; i++) next[to].push(next[from].pop());
  return { nests: next, count };
}

export function isSolved(nests) {
  return nests.every(
    (n) => n.length === 0 || (n.length === CAPACITY && n.every((c) => c === n[0]))
  );
}

export function isNestComplete(nest) {
  return nest.length === CAPACITY && nest.every((c) => c === nest[0]);
}

const key = (nests) =>
  nests
    .map((n) => n.join(','))
    .sort()
    .join('|');

// Verifică dacă nivelul poate fi rezolvat (căutare în adâncime cu memorie)
export function isSolvable(start, maxNodes = 60000) {
  const seen = new Set();
  const stack = [start];
  let explored = 0;
  while (stack.length) {
    const cur = stack.pop();
    if (isSolved(cur)) return true;
    const k = key(cur);
    if (seen.has(k)) continue;
    seen.add(k);
    if (++explored > maxNodes) return false;
    for (let i = 0; i < cur.length; i++) {
      if (isNestComplete(cur[i])) continue;
      for (let j = 0; j < cur.length; j++) {
        if (!canMove(cur, i, j)) continue;
        // mutare inutilă: un mușuroi de o singură culoare într-unul gol
        if (cur[j].length === 0 && topGroupSize(cur[i]) === cur[i].length) continue;
        stack.push(applyMove(cur, i, j).nests);
      }
    }
  }
  return false;
}

// Dificultatea: o culoare nouă la fiecare 2 niveluri (până la 12 culori, la nivelul 19).
// De la nivelul 21, furnicile sunt complet amestecate: nicio pereche de aceeași culoare lipită.
export const SCRAMBLED_FROM = 21;

export function levelConfig(level) {
  const colors = Math.min(3 + Math.floor((level - 1) / 2), COLORS.length);
  return { colors, empty: 2, scrambled: level >= SCRAMBLED_FROM };
}

// Nicio furnică nu stă pe una de aceeași culoare
const fullyScrambled = (nests) =>
  nests.every((n) => n.every((c, i) => i === 0 || n[i - 1] !== c));

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateLevel(level) {
  const { colors, empty, scrambled } = levelConfig(level);
  const ants = [];
  for (let c = 0; c < colors; c++) for (let k = 0; k < CAPACITY; k++) ants.push(COLORS[c]);
  // întâi încearcă varianta grea; dacă nu reușește, acceptă orice amestec rezolvabil
  for (let attempt = 0; attempt < 400; attempt++) {
    const strict = scrambled && attempt < 300;
    shuffle(ants);
    const nests = [];
    for (let i = 0; i < colors; i++) nests.push(ants.slice(i * CAPACITY, (i + 1) * CAPACITY));
    if (strict && !fullyScrambled(nests)) continue;
    for (let i = 0; i < empty; i++) nests.push([]);
    if (!isSolved(nests) && isSolvable(nests)) return nests;
  }
  // rezervă: un nivel simplu garantat rezolvabil
  const nests = [];
  for (let c = 0; c < colors; c++) nests.push(Array(CAPACITY).fill(COLORS[c]));
  const a = nests[0].pop();
  nests[0].push(nests[1].pop());
  nests[1].push(a);
  for (let i = 0; i < empty; i++) nests.push([]);
  return nests;
}

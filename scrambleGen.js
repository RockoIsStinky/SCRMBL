// pseudo rng
export function mulberry32(seed) {
  let t = seed + 0x6d2b79f5; // some fancy bit opperations i do not understand
  return function () {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// randomly generates the seed and the length of the scramble
export function genScramb(seed, faces, modifiers) {
  const random = mulberry32(seed);
  const length = Math.floor(random() * 25);
  const scramble = [];
  let previousFace = -1;
  for (let i = 0; i < length; i++) {
    // generates the scramble duh
    let currentFace = Math.floor(random() * faces.length);
    while (currentFace === previousFace)
      currentFace = Math.floor(random() * faces.length);
    const modifier = modifiers[Math.floor(random() * modifiers.length)];
    scramble.push(faces[currentFace] + modifier);
    previousFace = currentFace;
  }
  return scramble;
}

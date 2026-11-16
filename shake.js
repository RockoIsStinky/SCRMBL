// SO, i found a cubing animation video while doomscrolling on instagram
// i think it was like felix's wr or smth
// and i thought it looked super intersting, i forgot the orignal creator
export function shakeHelp({ cube, noise }) {
  let scrollTime = 0;

  function getNoise(x) {
    return noise.noise(x, 0);
  }

  // haha get it? like lerp to larp hahaha
  function larp(start, end, alpha) {
    return start + (end - start) * alpha;
  }

  function shake(intensity, offset) {
    // each axis will have an offset so the rotation won't be unatural
    scrollTime += 0.065; // shake speed
    cube.rotation.x = getNoise(scrollTime) * intensity;
    cube.rotation.y = getNoise(scrollTime + offset) * intensity;
    cube.rotation.z = getNoise(scrollTime + offset * 2) * intensity;
  }

  return { larp, shake };
}

import * as THREE from "three";

// ah yes the part that took me the most amoung of time
// i hate working on this and i'm pretty sure the shape detection has some bugs
// because it can't detect certain cases of free pairs

export function patternRecog({
  pieces,
  opposites,
  totalCards,
  Card,
  adjacentFaces,
}) {
  function rotateGrid(grid, turns = 1) {
    // rotate the 3x3 grid
    const normalizedTurns = ((turns % 4) + 4) % 4;
    let currentGrid = grid;
    for (let t = 0; t < normalizedTurns; t++) {
      currentGrid = currentGrid[0].map((_, i) =>
        currentGrid.map((row) => row[i]).reverse(),
      );
    }
    return currentGrid;
  }
  // mirror a 3x3 grid
  function mirrorGrid(grid, axis) {
    if (axis === "y") return [...grid].reverse();
    return grid.map((row) => [...row].reverse());
  }
  // check for opposites edges, so if a blue edge is touching a green center
  // it will be an opposite amtch
  function oppositesMatch(faceGrid, face) {
    if (
      faceGrid[1][0] == opposites[face] ||
      faceGrid[0][1] == opposites[face] ||
      faceGrid[2][1] == opposites[face] ||
      faceGrid[1][2] == opposites[face]
    ) {
      totalCards.push(new Card("Opposite Edge", face, 150, "Common"));
    }
  }
  // match the grids together, there are 3 different types
  // here comes the comment
  function gridMatch(patternGrid, faceGrid, type, face) {
    // COLOR
    // so we just match the color of the target grid to the current face grid
    // and yeah that's it
    if (type === "color") {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          if (patternGrid[y][x] !== faceGrid[y][x]) return false;
        }
      }
      return true;
    }
    // SHAPE
    // terrible time complexity BUT it works and i don't really care about alat
    // so this one has more rules, the cells are divided into 2 types: + and x (orignally x and o but o overlaps with the color orange but it doens't matter cuz we have detection type so yuh)
    // rule 1: all +'s must share the same color
    // rule 2: the x's that are next to a + have to not have the same color as the + aka targetcolor
    if (type === "shape") {
      let targetCol;
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          if (patternGrid[y][x] === "+") {
            // once we find a + and we havent have a target color yet
            // this will be the target color because all +'s have to share the same col
            if (targetCol === undefined) targetCol = faceGrid[y][x];
            else if (targetCol !== faceGrid[y][x]) return false;
          }
        }
      }
      // this one checks the 2nd rule
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          if (patternGrid[y][x] === "+" || faceGrid[y][x] !== targetCol)
            continue;
          if (
            patternGrid[y - 1]?.[x] === "+" ||
            patternGrid[y + 1]?.[x] === "+" ||
            patternGrid[y]?.[x - 1] === "+" ||
            patternGrid[y]?.[x + 1] === "+"
          )
            return false;
        }
      }
      return true;
    }
    // hahaha i hate this
    // this is just shape detection but if a + touch the edge of a face
    // we gotta check the bordering faces, i only use this for free pairs and 2x2 and another pattern i forgor
    // not my proudest work but it works (kinda)
    if (type === "3d") {
      let targetCol;
      const adjacentChecks = [];
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const targetCell = patternGrid[y][x];
          const currentCell = faceGrid[y][x];
          if (targetCell === "+") {
            if (targetCol === undefined) targetCol = currentCell;
            else if (targetCol !== currentCell) return false;
            const adjacent = adjacentFaces.get(face);
            if (x === 2)
              adjacentChecks.push({
                grid: getFaceGrid(adjacent.right),
                pattern: mirrorGrid(patternGrid, "x"),
              });
            if (x === 0)
              adjacentChecks.push({
                grid: getFaceGrid(adjacent.left),
                pattern: mirrorGrid(patternGrid, "x"),
              });
            if (y === 0)
              adjacentChecks.push({
                grid: getFaceGrid(adjacent.top),
                pattern: mirrorGrid(patternGrid, "y"),
              });
            if (y === 2)
              adjacentChecks.push({
                grid: getFaceGrid(adjacent.bottom),
                pattern: mirrorGrid(patternGrid, "y"),
              });
          } else if (
            currentCell === targetCol &&
            (patternGrid[y - 1]?.[x] === "+" ||
              patternGrid[y + 1]?.[x] === "+" ||
              patternGrid[y]?.[x - 1] === "+" ||
              patternGrid[y]?.[x + 1] === "+")
          ) {
            return false;
          }
        }
      }
      for (const check of adjacentChecks) {
        let adjacentCol;
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 3; x++) {
            const currentCell = check.grid[y][x];
            const targetCell = check.pattern[y][x];
            if (targetCell === "+") {
              if (adjacentCol === undefined) adjacentCol = currentCell;
              else if (adjacentCol !== currentCell) return false;
            } else if (
              currentCell === adjacentCol &&
              (check.pattern[y - 1]?.[x] === "+" ||
                check.pattern[y + 1]?.[x] === "+" ||
                check.pattern[y]?.[x - 1] === "+" ||
                check.pattern[y]?.[x + 1] === "+")
            ) {
              return false;
            }
          }
        }
      }
      return true;
    }
    return false;
  }
  // the match pattern function, we loop through all the faces
  // and also rotate the faces, there are 2 rotation modes: 90 180
  // so 90 would require 4 checks and 180 would require 2
  function matchPattern(pattern, faceGrid, face) {
    let grid = pattern.grid;
    let totalRot = 1;
    let rotStep = 1;
    if (pattern.rotatable === "true") totalRot = 4;
    else if (pattern.rotatable === "90") totalRot = 2;
    else if (pattern.rotatable === "180") {
      totalRot = 2;
      rotStep = 2;
    }
    // loop thru all the rotations
    for (let i = 0; i < totalRot; i++) {
      if (gridMatch(grid, faceGrid, pattern.type, face)) return true;
      grid = rotateGrid(grid, rotStep);
    }
    return false;
  }
  // helper functions >:(
  function getCurrFace(dir, quat) {
    const transformed = dir.clone().applyQuaternion(quat);
    if (transformed.y > 0.9) return "U";
    if (transformed.y < -0.9) return "D";
    if (transformed.x > 0.9) return "R";
    if (transformed.x < -0.9) return "L";
    if (transformed.z > 0.9) return "F";
    if (transformed.z < -0.9) return "B";
    return null;
  }

  function getFaceDir(face) {
    if (face === "U") return new THREE.Vector3(0, 1, 0);
    if (face === "D") return new THREE.Vector3(0, -1, 0);
    if (face === "R") return new THREE.Vector3(1, 0, 0);
    if (face === "L") return new THREE.Vector3(-1, 0, 0);
    if (face === "F") return new THREE.Vector3(0, 0, 1);
    if (face === "B") return new THREE.Vector3(0, 0, -1);
    return null;
  }

  // return a 3x3 array of the face color's like
  // R O W
  // G Y R
  // W B G
  // W = white R = red blablabla
  function getFaceGrid(face) {
    const grid = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    for (const piece of pieces) {
      const { x, y, z } = piece.userData;
      if (face === "F" && z !== 1) continue;
      if (face === "B" && z !== -1) continue;
      if (face === "U" && y !== 1) continue;
      if (face === "D" && y !== -1) continue;
      if (face === "R" && x !== 1) continue;
      if (face === "L" && x !== -1) continue;
      let col;
      let row;
      switch (face) {
        case "F":
          col = x + 1;
          row = 1 - y;
          break;
        case "B":
          col = 1 - x;
          row = 1 - y;
          break;
        case "U":
          col = x + 1;
          row = z + 1;
          break;
        case "D":
          col = x + 1;
          row = 1 - z;
          break;
        case "R":
          col = 1 - z;
          row = 1 - y;
          break;
        case "L":
          col = z + 1;
          row = 1 - y;
          break;
        default:
          continue;
      }
      let color = null;
      for (const colFace in piece.userData.colors) {
        const direction = getFaceDir(colFace);
        const currQuaternion = new THREE.Quaternion();
        piece.getWorldQuaternion(currQuaternion);
        const deltaQuaternion = currQuaternion
          .clone()
          .multiply(piece.userData.initialQuaternion.clone().invert());
        if (getCurrFace(direction, deltaQuaternion) === face) {
          color = piece.userData.colors[colFace];
          break;
        }
      }
      grid[row][col] = color;
    }
    return grid;
  }

  return {
    rotateGrid,
    mirrorGrid,
    oppositesMatch,
    gridMatch,
    matchPattern,
    getCurrFace,
    getFaceDir,
    getFaceGrid,
  };
}

import * as THREE from "three";

// this will just rotate the cube layers
// so it will move all the pieces in the same layer into a group
// rotate that group and then ungroup them, it's pretty late so my comments will be terrible

// get the pieces global position even after rotation
export function layerRotHelp({ cube, pieces }) {
  function updatePiecePosition(piece, axis, direction) {
    const x = piece.userData.x;
    const y = piece.userData.y;
    const z = piece.userData.z;

    if (axis === "x") {
      piece.userData.y = direction === 1 ? -z : z;
      piece.userData.z = direction === 1 ? y : -y;
    }

    if (axis === "y") {
      piece.userData.x = direction === 1 ? z : -z;
      piece.userData.z = direction === 1 ? -x : x;
    }

    if (axis === "z") {
      piece.userData.x = direction === 1 ? -y : y;
      piece.userData.y = direction === 1 ? x : -x;
    }
  }

  function getLayer(move) {
    // get all the pieces of a layer
    const face = move[0];

    switch (face) {
      case "R":
        return pieces.filter((piece) => piece.userData.x === 1);
      case "L":
        return pieces.filter((piece) => piece.userData.x === -1);
      case "U":
        return pieces.filter((piece) => piece.userData.y === 1);
      case "D":
        return pieces.filter((piece) => piece.userData.y === -1);
      case "F":
        return pieces.filter((piece) => piece.userData.z === 1);
      case "B":
        return pieces.filter((piece) => piece.userData.z === -1);
      default:
        return [];
    }
  }

  // make the group so we can group the pieces together and rotate them
  function createRotGroup(move) {
    const group = new THREE.Group();
    cube.add(group);

    for (const piece of getLayer(move)) group.attach(piece);

    return group;
  }

  // i took this neat function from geekforgeeks
  function easeOutBack(t) {
    const c1 = 2;
    const c3 = c1 + 1.5;

    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // this is the main function we call
  // group the pieces rotate the group, and then ungroup
  function moveToRot(move) {
    return new Promise((resolve) => {
      const face = move[0];
      const modifier = move[1] || "";

      const moves = {
        R: ["x", -1],
        L: ["x", 1],
        U: ["y", -1],
        D: ["y", 1],
        F: ["z", -1],
        B: ["z", 1],
      };

      const moveConfig = moves[face];
      if (!moveConfig) {
        resolve();
        return;
      }

      let [axis, direction] = moveConfig;
      let turns = modifier === "'" ? -1 : modifier === "2" ? 2 : 1;
      turns *= direction;

      const angle = (turns * Math.PI) / 2;
      const moveGroup = createRotGroup(face);
      const start = performance.now();
      const duration = 250;

      function animate(now) {
        const t = Math.min((now - start) / duration, 1);

        moveGroup.rotation[axis] = angle * easeOutBack(t);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          for (const piece of [...moveGroup.children]) {
            for (let i = 0; i < Math.abs(turns); i++)
              updatePiecePosition(piece, axis, Math.sign(turns));

            cube.attach(piece);
          }

          cube.remove(moveGroup);
          resolve();
        }
      }

      requestAnimationFrame(animate);
    });
  }

  function updateGroupPos(group, axis, quaterTurns) {
    const direction = Math.sign(quaterTurns);
    for (const piece of group.children) {
      for (let i = 0; i < Math.abs(quaterTurns); i++) {
        updatePiecePosition(piece, axis, direction);
      }
    }
  }

  return { moveToRot, updateGroupPos, getLayer };
}

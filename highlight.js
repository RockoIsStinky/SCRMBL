import * as THREE from "three";
// im very proud of this
// because this took me 2 hours to just trial and error
// for LITERALLY NO REASON and then the day after i just scrapped the entire 2 hour cuz it still isn't working
// and made a super inefficient solution in 47 minutes (yes i timed it) :D

/* here is how the highlighting works:
    you get the face you are highlighting via the cube pieces userdata that is assigned to them at cube.js
    each piece faces will have their own seperate instances / clone of the 6 red, orange, green, blue, white, yellow colors
    the reason why we instance this is because highlighting seperate faces will only highlght that instance rather than the entire material
    
    after that we can get all the pieces taht is on that face by using a modified function of the getFaceGrid() function
      which will return an array of 9 cube faces that is on the face key

    and then we just highlight the cube faces, which is a child of the mesh itself
*/

export function highlightHelp({
  cube,
  pieces,
  highlightFacesSize,
  getFaceDir,
  getCurrFace,
}) {
  const hitboxGroup = new THREE.Group();
  cube.add(hitboxGroup);
  const faceToPos = [
    ["U", 0, 1, 0],
    ["D", 0, -1, 0],
    ["F", 0, 0, 1],
    ["B", 0, 0, -1],
    ["R", 1, 0, 0],
    ["L", -1, 0, 0],
  ];

  // pretty much the same as the getfacegrid function u could find somewhere in the helepr files
  // but isntead of returning a 3x3 array of face colors
  // we return the faces that has those face colors
  function getFacePiece(face) {
    const facePieces = [];
    for (const piece of pieces) {
      const { x, y, z } = piece.userData;
      if (face === "F" && z !== 1) continue;
      if (face === "B" && z !== -1) continue;
      if (face === "U" && y !== 1) continue;
      if (face === "D" && y !== -1) continue;
      if (face === "R" && x !== 1) continue;
      if (face === "L" && x !== -1) continue;
      for (const colFace in piece.userData.colors) {
        // it went thru all the colors of all the faces
        const direction = getFaceDir(colFace); // get original face dir U = 0 1 0
        const currQuaternion = new THREE.Quaternion();
        piece.getWorldQuaternion(currQuaternion);
        const deltaQuaternion = currQuaternion
          .clone()
          .multiply(piece.userData.initialQuaternion.clone().invert());
        // it passes the original direction and rotation difference into get currface
        // and if the face match
        if (getCurrFace(direction, deltaQuaternion) === face) {
          // this is the target face material
          const color = piece.userData.colors[colFace];
          piece.traverse((child) => {
            // so we just check if the face material is the same as the target face material
            if (child.material?.name === color) facePieces.push(child); // add it to the faces array for highlighting
          });
          break;
        }
      }
    }
    return facePieces;
  }

  // orignally i js use the regular cube pieces instead of hit boxes
  // but the curves and the spaces between cube pieces just pmo because it returned false directions
  // so yeah theese hitboxes fixed it
  function initHitboxes() {
    for (const [name, x, y, z] of faceToPos) {
      const geometry = new THREE.PlaneGeometry(1.1, 1.1);
      const material = new THREE.MeshBasicMaterial({
        transparent: true, // not sure if transparent will make the website laggy might fix it
        opacity: 0,
        side: THREE.DoubleSide,
      });
      // self explanatory
      const plane = new THREE.Mesh(geometry, material);
      plane.name = name;
      plane.position.set(
        x * highlightFacesSize,
        y * highlightFacesSize,
        z * highlightFacesSize,
      );
      plane.lookAt(x, y, z);
      hitboxGroup.add(plane);
    }
  }

  // now we highlight it
  function highlight(face) {
    // the pieces array is just an array of all the piece meshes
    // this is when we are not hovering on the currentface so we just reset the color
    for (const piece of pieces) {
      piece.traverse((child) => {
        if (!child.material?.targetCol) return;
        child.material.targetCol.set(child.material.oldCol);
      });
    }
    // make it slightly brighter, if i do the multiply scalar to 6 or something
    // it looks like impact frames which is pretty cool
    if (face === null) return;
    for (const facePiece of getFacePiece(face)) {
      if (!facePiece.material?.targetCol) continue;
      facePiece.material.targetCol
        .set(facePiece.material.oldCol)
        .multiplyScalar(2.25);
    }
  }

  return { hitboxGroup, getFacePiece, initHitboxes, highlight };
}

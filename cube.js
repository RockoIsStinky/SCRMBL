import * as THREE from "three";

/* 
  this helper js will create the cube, give each cube pieces it's own material and userdata for later uses like highighting and pattern recognition
*/

export function cubeHelp({
  pieces,
  cube,
  loader,
  spacing,
  pieceScale,
  faceMaterials,
  faceColors,
  innerMaterial,
}) {
  // clone the face mat so that the face highlight function wont highlight the material
  // but it will highlight the face, stopping every cube pieces to share the same material since we have to modify the scalar
  function cloneFaceMaterial(face) {
    // nothing to comment here :D
    const material = faceMaterials[face].clone();
    material.oldCol = material.color.clone();
    material.targetCol = material.color.clone();
    return material;
  }

  // helper function for modifying the cube pieces or identifying
  function faceFromDir(direction) {
    if (direction.y > 0.9) return "U";
    if (direction.y < -0.9) return "D";
    if (direction.x > 0.9) return "R";
    if (direction.x < -0.9) return "L";
    if (direction.z > 0.9) return "F";
    if (direction.z < -0.9) return "B";
    return "";
  }

  // slap on the material to all the faces
  // very wonky because the naming i did in blender was wierd but its ok
  function applyMat(obj, id) {
    obj.userData.colors = {};
    obj.traverse((child) => {
      // if it isnt a mesh then we return, in my actual obj file i'm pretty sure there is no nonmesh nodes, so this is just for safety
      if (!child.isMesh) return;
      const name = child.name; // it will just get the name i did in blender
      // i would like to have custom magnet colors like the tornado v3 later
      // but ts will stay this way for quite a while
      if (name.includes("Internal") || name.includes("Magnet")) {
        child.material = innerMaterial;
        return;
      }
      // we gave it a userdata because the naming is really wierd again.
      if (obj.userData.type === "corner") {
        const colFaces = ["U", "D", "F", "B", "R", "L"].filter((face) =>
          id.includes(face),
        );
        let face = "";
        // check if the coordiantes have a negative product
        // and if so we will need to account for that
        const swap = obj.userData.x * obj.userData.y * obj.userData.z < 0;
        // find the face and slap a material on it
        if (name.includes("UpCorner")) face = colFaces[0];
        else if (name.includes("RightCorner")) face = colFaces[swap ? 2 : 1];
        else if (name.includes("LeftCorner")) face = colFaces[swap ? 1 : 2];
        child.material = cloneFaceMaterial(face); // make sure to clone the mat or highlighting wont work :O
        obj.userData.colors[face] = faceColors[face];
        return;
      }
      // same thing as the corner but it has 2 possible colors and 12 possible positions
      if (obj.userData.type === "edge") {
        let localFace = "";
        // identify the naming and gave it a face
        if (name.includes("FrontEdge")) localFace = "F";
        else if (name.includes("TopEdge")) localFace = "U";
        const direction = new THREE.Vector3();
        if (localFace === "F") direction.set(0, 0, 1);
        else if (localFace === "U") direction.set(0, 1, 0);
        direction.applyQuaternion(obj.quaternion);
        const actualFace = faceFromDir(direction);
        // because there are internals and magnets and we can't color those
        if (id.includes(actualFace)) {
          child.material = cloneFaceMaterial(actualFace);
          obj.userData.colors[actualFace] = faceColors[actualFace];
        } else {
          child.material = innerMaterial;
        }
        return;
      }
      // center is really simple
      if (obj.userData.type === "center") {
        if (name.includes("Cap")) {
          // you get the direction it is facing (z)
          const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(
            obj.quaternion,
          );
          // and then just give it a material based on the face
          const face = faceFromDir(direction);
          child.material = faceMaterials[face]; // we don't need to clone this because it's the center
          obj.userData.colors[face] = faceColors[face];
        } else {
          child.material = innerMaterial;
        }
      }
    });
  }

  // give a piece id based on it's position for giving the faces a material
  // very self explanatory
  function addID(x, y, z) {
    let id = "";
    if (y === 1) id += "U";
    if (y === -1) id += "D";
    if (z === 1) id += "F";
    if (z === -1) id += "B";
    if (x === 1) id += "R";
    if (x === -1) id += "L";
    return id;
  }

  // orientate the position fro the corners
  function rotateCorner(obj, x, y, z) {
    const up = new THREE.Vector3(0, 1, 0);
    const targetUp = new THREE.Vector3(0, y, 0); // define the target up direction only 1 and -1 is possible
    obj.quaternion.setFromUnitVectors(up, targetUp); // quaternion opperations i got from stack overflow
    const angleY = y * Math.atan2(-z, x) + (y * Math.PI) / 2 - Math.PI / 4; // so atan2 finds the angle based on the corner's x and z position, multiplying it by y reverses the angle to account for differernt positions and then (y * Math.PI) / 2 is jsut an offset and so is -Math.PI
    obj.rotateY(angleY);
  }

  function rotateEdge(obj, x, y, z) {
    const halfPi = Math.PI / 2; // 90 deg in radians
    if (y !== 0) {
      // middle layer
      const rotX = y === -1 && z === 1 ? halfPi : y === -1 ? Math.PI : 0;
      const rotY = y === -1 && z === -1 ? 0 : Math.atan2(x, z);
      obj.rotation.set(rotX, rotY, 0);
    } else {
      // top or botom layer
      const rotY = z === -1 ? x * halfPi : 0;
      const rotZ = -x * halfPi;
      obj.rotation.set(0, rotY, rotZ);
    }
  }

  // kind of follows the same rules as the rotate corner
  function rotateCenter(obj, x, y, z) {
    const targetDir = new THREE.Vector3(x, y, z).normalize(); // the local forward dir
    const defaultUp = new THREE.Vector3(0, 0, 1); // the global forward dir
    obj.quaternion.setFromUnitVectors(defaultUp, targetDir);
  }
  // make the cube
  function initCube() {
    // using 3 nested loops we can do a 3x3x3 cube
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          const count = Math.abs(x) + Math.abs(y) + Math.abs(z);
          // took me 2 days to model the geometry of the center piece
          // because blender's bevel sucks but i ended up doing some wierd displace modifier magic
          const modelPath =
            count === 3
              ? `${import.meta.env.BASE_URL}models/Corner.obj`
              : count === 2
                ? `${import.meta.env.BASE_URL}models/Edge.obj`
                : `${import.meta.env.BASE_URL}models/CenterPiece.obj`;
          loader.load(modelPath, (object) => {
            // set the transforms of the pieces
            object.scale.setScalar(pieceScale);
            object.position.set(x * spacing, y * spacing, z * spacing);
            const pieceID = addID(x, y, z);

            // each piece will have a unique userdata for later uses
            object.userData.id = pieceID;
            object.userData.type =
              count === 3 ? "corner" : count === 2 ? "edge" : "center";
            object.userData.x = x;
            object.userData.y = y;
            object.userData.z = z;

            if (count === 3) rotateCorner(object, x, y, z);
            else if (count === 2) rotateEdge(object, x, y, z);
            else rotateCenter(object, x, y, z);
            object.userData.initialQuaternion = object.quaternion.clone();
            applyMat(object, pieceID);
            pieces.push(object); // add it to the piece array
            cube.add(object); // cube is just a pivot
          });
        }
      }
    }
  }

  return { initCube };
}

// hey guys, so if you decide to look at my source code and see all the yap
// it's one of two reasons:
// number 1: i livestream with my friends while we talk so ometimes i cnat turn on my mic since its late
// so i use comments :D
// number 2: PHANTOPM and CITADEL YAYY
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { OBJLoader } from "three/examples/jsm/Addons.js";

// lovely post processing yum yum :D
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// for the shaking of the cube
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";

// theese are all the helper fucntions
import { patterns } from "./patterns.js";
import { cubeHelp } from "./cube.js";
import { highlightHelp } from "./highlight.js";
import { layerRotHelp } from "./layerRot.js";
import { patternRecog } from "./patternRecog.js";
import { genScramb } from "./scrambleGen.js";
import { shakeHelp } from "./shake.js";
import { titleRepel } from "./repel.js";

// this is for the random scramble generation
// so yeah i can add middle layers like r u b <- lowercase (maybe i'll add it later)
const faces = ["R", "L", "U", "D", "F", "B"];
const modifiers = ["", "'", "2"];

// this is the pieces array to sotre lal the pieces in the cube
const pieces = [];
const cube = new THREE.Group();
const { moveToRot, updateGroupPos, getLayer } = layerRotHelp({ cube, pieces });

const scrambleVec = []; // the scramble and the seed
let finalSeed = "";

const spacing = 0.33; // spacing between the cube pieces
const size = 1.75; // size of the cube (more of the camera but)
const pieceScale = 0.17; // piece scale

let scrambling = false;
let shakeIntensity = 0;
const shakeNoise = new SimplexNoise();
const { shake, larp } = shakeHelp({ cube, noise: shakeNoise });

const loader = new OBJLoader();

let roughness = 0.01;
let clearcoat = 1;
let clearcoatRoughness = 0.1;

let finishedCards = false;
let faceSelected = false;
let faceShot = false;
let finished = false;

let activeRotGroup = null;
let activeAxis = "x";
const rotationTimer = new THREE.Timer();
const rotSpeedClamp = 700; // the max rotation speed we can go (also the rotation is inverted rn, ima fix that)

// this is the face to color map
const faceAxis = {
  R: "x",
  L: "x",
  U: "y",
  D: "y",
  F: "z",
  B: "z",
};

// for the final face spin
const layerMultiplier = {
  F: -1,
  B: 1,
  R: -1,
  L: 1,
  U: -1,
  D: 1,
};
let currSelectedFace;

const windowPx = 265; // the pixel count for the cube display

let currentHighlightedFace = null;
let buttonShareSpawn = false;

// all the materials for later cloning
const innerMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  roughness: 1,
});

const faceMaterials = {
  U: new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: roughness,
    clearcoat: clearcoat,
    clearcoatRoughness: clearcoatRoughness,
    name: "W",
  }),
  D: new THREE.MeshPhysicalMaterial({
    color: 0xffff00,
    roughness: roughness,
    clearcoat: clearcoat,
    clearcoatRoughness: clearcoatRoughness,
    name: "Y",
  }),
  R: new THREE.MeshPhysicalMaterial({
    color: 0xed1c3d,
    roughness: roughness,
    clearcoat: clearcoat,
    clearcoatRoughness: clearcoatRoughness,
    name: "R",
  }),
  L: new THREE.MeshPhysicalMaterial({
    color: 0xff8000,
    roughness: roughness,
    clearcoat: clearcoat,
    clearcoatRoughness: clearcoatRoughness,
    name: "O",
  }),
  F: new THREE.MeshPhysicalMaterial({
    color: 0x15d10a,
    roughness: roughness,
    clearcoat: clearcoat,
    clearcoatRoughness: clearcoatRoughness,
    name: "G",
  }),
  B: new THREE.MeshPhysicalMaterial({
    color: 0x0000ff,
    roughness: roughness,
    clearcoat: clearcoat,
    clearcoatRoughness: clearcoatRoughness,
    name: "B",
  }),
};

for (const material of Object.values(faceMaterials)) {
  material.oldCol = material.color.clone();
  material.targetCol = material.color.clone();
}

let lastMoveTime = 0;
let isDragging = false;
let isMouseDown = false;
let targetRotY = null;
let targetRotX = null;
let rotY = 0.0;
let rotX = 0.0;
let currVelY = 0.0;
let currVelX = 0.0;
let deltaX = 0.0;
let deltaY = 0.0;
let lastX = 0;
let lastY = 0;

let currMouseX = 0.0;
let currMouseY = 0.0;
let prevMouseX = 0.0;
let prevMouseY = 0.0;

let dragPivX = 0.0;
let dragPivY = 0.0;

const quarterTurn = Math.PI / 2;
let targetLayerAngle = 0;
let spinVel = 0;
let spinDecel = 4;

let lerpAlpha = 0.3;

const camPiv = new THREE.Group();
const camPivX = new THREE.Group();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const camera = new THREE.OrthographicCamera(-size, size, size, -size, 0.1, 100);
camera.lookAt(0, 0, 0);

let highlightFacesSize = 0.506;
window.addEventListener("pointermove", (event) => {
  // only pointermove works with both mobile and desktop
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
});

// for sorting, the rarest will be at the bottom of the card container
// hopefully there will be more patterns later on with more tiers!
const rarityIndex = {
  common: 1,
  uncommon: 2,
  rare: 3,
  anomally: 4,
  epic: 5,
  mythic: 6,
};

const faceColors = {
  U: "W",
  D: "Y",
  F: "G",
  B: "B",
  R: "R",
  L: "O",
};

// MUAHAHAHAH
const cubeTools = cubeHelp({
  pieces,
  cube,
  loader,
  spacing,
  pieceScale,
  faceMaterials,
  faceColors,
  innerMaterial,
});

const faceIndex = {
  0: "F",
  1: "B",
  2: "U",
  3: "D",
  4: "R",
  5: "L",
};

const opposites = {
  R: "O",
  O: "R",
  B: "G",
  G: "B",
  W: "Y",
  Y: "W",
};

// for the 3d shape recog pluh
const adjacentFaces = new Map([
  ["F", { left: "L", right: "R", top: "U", bottom: "D" }],
  ["R", { left: "F", right: "B", top: "U", bottom: "D" }],
  ["L", { left: "B", right: "F", top: "U", bottom: "D" }],
  ["B", { left: "R", right: "L", top: "U", bottom: "D" }],
  ["U", { left: "L", right: "R", top: "B", bottom: "F" }],
  ["D", { left: "L", right: "R", top: "F", bottom: "B" }],
]);

class Card {
  constructor(name, face, exp, rarity) {
    this.name = name;
    this.face = face;
    this.exp = exp;
    this.rarity = rarity;
  }
}

const totalCards = [];
const totalCardsMap = new Map();
const patternTools = patternRecog({
  pieces,
  opposites,
  totalCards,
  Card,
  adjacentFaces,
});
const { getCurrFace, getFaceDir, getFaceGrid, matchPattern, oppositesMatch } =
  patternTools;
const highlightTools = highlightHelp({
  cube,
  pieces,
  highlightFacesSize,
  getFaceDir,
  getCurrFace,
});
const { hitboxGroup, highlight } = highlightTools;

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: false,
});

camera.position.set(0, 0, 7);
camera.lookAt(0, 0, 0);
scene.add(camPiv);
camPiv.add(camPivX);
camPivX.add(camera);

camPiv.rotation.y = Math.PI / 4;
camPivX.rotation.x = -Math.PI / 7;

// so the camera can rotate the the faces
const faceAngle = {
  F: { y: 0, x: 0 },
  B: { y: Math.PI, x: 0 },
  U: { y: 0, x: -Math.PI / 2 },
  D: { y: 0, x: Math.PI / 2 },
  R: { y: Math.PI / 2, x: 0 },
  L: { y: -Math.PI / 2, x: 0 },
};

renderer.setSize(windowPx, windowPx, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.75;

renderer.setClearColor(0x000000, 0);
const container = document.getElementById("canvasContainer");
container.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
renderPass.clearAlpha = 0;
composer.addPass(renderPass);

const gtaoPass = new GTAOPass(scene, camera, windowPx, windowPx);
gtaoPass.output = GTAOPass.OUTPUT.Default;
gtaoPass.gtaoSampleRatio = 0.5;
gtaoPass.blendIntensity = 0.9;
gtaoPass.clearColor = new THREE.Color(0x000000);
gtaoPass.clearAlpha = 0;

gtaoPass.updateGtaoMaterial({
  radius: 0.1,
  distanceExponent: 1,
  thickness: 0.4,
});

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.06,
  0.04,
  0.1,
);

// the lighting is one of my favorite parts :D
scene.fog = new THREE.FogExp2(0x0c0a09, 0.15);

RectAreaLightUniformsLib.init();

// all the fancy lighting, the reason why i use rect light is because the reflection is super neat and nice
const warmAmbient = new THREE.AmbientLight(0x2d1810, 10);
scene.add(warmAmbient);

const backLight = new THREE.RectAreaLight(0xedbb5c, 10, 1.2, 2);
backLight.position.set(1, 0, -1.4);
backLight.lookAt(0, -1.2, 0);
scene.add(backLight);

const frontLight = new THREE.RectAreaLight(0xffb300, 20, 1.2, 2);
frontLight.position.set(-2, 1, 1.4);
frontLight.lookAt(0, -1.2, 0);
scene.add(frontLight);

const bottomLight = new THREE.RectAreaLight(0xfad29d, 5, 0.7, 10);
bottomLight.position.set(0, -2, 0);
bottomLight.lookAt(0, 0, 0);
scene.add(bottomLight);

const goldenSun = new THREE.DirectionalLight(0xffe0ad, 10.0); // me in japan
goldenSun.position.set(-5, 10, 4);
scene.add(goldenSun);

composer.addPass(bloomPass);
composer.addPass(gtaoPass);
composer.addPass(new OutputPass());

scene.add(cube);

cubeTools.initCube();
highlightTools.initHitboxes();

// the loop
function animate() {
  requestAnimationFrame(animate);
  if (scrambling) {
    shakeIntensity = 0.042;
  } else {
    shakeIntensity = larp(shakeIntensity, 0, 0.1); // haha larp larp larp sahur
  }
  shake(shakeIntensity, 3);

  if (isMouseDown) {
    currVelY += (rotY - currVelY) * lerpAlpha;
    currVelX += (rotX - currVelX) * lerpAlpha;
  } else {
    currVelY *= 0.95;
    currVelX *= 0.95;
  }

  if (targetRotY === null) targetRotY = camPiv.rotation.y;
  if (targetRotX === null) targetRotX = camPivX.rotation.x;

  if (!faceSelected) {
    targetRotY += currVelY;
    targetRotX += currVelX;
  }
  if (targetRotY !== null) {
    const diffY = Math.atan2(
      Math.sin(targetRotY - camPiv.rotation.y),
      Math.cos(targetRotY - camPiv.rotation.y),
    );
    camPiv.rotation.y += diffY * 0.3;
  }

  if (targetRotX !== null) {
    const diffX = Math.atan2(
      Math.sin(targetRotX - camPivX.rotation.x),
      Math.cos(targetRotX - camPivX.rotation.x),
    );
    camPivX.rotation.x += diffX * 0.3;
  }

  if (faceSelected) {
    faceShot = true;
    camera.zoom = larp(camera.zoom, 1.4, 0.08); // the zoom into the face
    camera.updateProjectionMatrix();
    facePopup.textContent = "drag the corners or edges to spin the face";
  } else {
    if (faceShot) {
      if (finished) {
        facePopup.textContent = "share with your friends!";
      } else {
        facePopup.textContent = "double-click to select a face";
      }
      targetRotY = Math.PI / 4;
      targetRotX = -Math.PI / 7;
      faceShot = false;
    }
    camera.zoom = larp(camera.zoom, 1, 0.08);
    camera.updateProjectionMatrix();
  }
  for (const piece of pieces) {
    piece.traverse((child) => {
      if (!child.material || !child.material.targetCol) return;

      child.material.color.lerp(child.material.targetCol, 0.1);
    });
  }
  rotationTimer.update();
  const frameDt = Math.min(rotationTimer.getDelta(), 0.05);

  if (activeRotGroup && faceSelected) {
    if (!isMouseDown) {
      if (Math.abs(spinVel) >= 0.002) {
        targetLayerAngle += spinVel * frameDt;
      } else {
        spinVel = 0;
        targetLayerAngle = larp(
          targetLayerAngle,
          Math.round(targetLayerAngle / quarterTurn) * quarterTurn,
          0.2,
        );
        if (
          Math.abs(
            targetLayerAngle -
              Math.round(targetLayerAngle / quarterTurn) * quarterTurn,
          ) <= 1e-5 // so close to the perfect dt
        ) {
          console.log("snapped");
          const snappedTurns = Math.round(targetLayerAngle / quarterTurn);
          const snappedAngle = snappedTurns * quarterTurn;

          activeRotGroup.rotation[activeAxis] = snappedAngle;
          updateGroupPos(activeRotGroup, activeAxis, snappedTurns);

          faceSelected = false;
          finished = true;
          genBtn.remove();
          facePopup.classList.add("hidden");
          handleCards();
          addShare();
        }
      }
      if (spinVel > 0) {
        spinVel = Math.max(0, spinVel - spinDecel * frameDt);
      } else {
        spinVel = Math.min(0, spinVel + spinDecel * frameDt);
      }
    }
    activeRotGroup.rotation[activeAxis] = larp(
      activeRotGroup.rotation[activeAxis],
      targetLayerAngle,
      0.8,
    );
  }

  composer.render();
}

animate();

// once i click the gen btn it generates the scramble
function handleGeneration() {
  finalSeed = "";
  let completedCount = 0;
  scrambleVec.length = 0;

  for (let i = 0; i < 8; i++) {
    finalSeed += String(Math.floor(Math.random() * 10));
  }
  scrambleVec.push(...genScramb(parseInt(finalSeed, 10), faces, modifiers));

  scramText.classList.remove("hidden");
  scramText.textContent = scrambleVec.join(" ");
  genNum.textContent = "Seed: " + finalSeed;
  genBtn.classList.add("down");

  const rawText = scrambleVec.join(" ");
  const rawScramble = scrambleVec.join("");
  scramText.innerHTML = "";

  rawText.split("").forEach((finalChar, index) => {
    const span = document.createElement("span");
    span.className = "slot-char";
    if (finalChar == " ") {
      span.innerHTML = "&nbsp;";
      scramText.appendChild(span);
      return;
    }
    scramText.append(span);
    const spinDuration = 400 + index * 80;
    const speed = 50;

    span.classList.add("spinning");

    const interval = setInterval(() => {
      span.textContent = faces[Math.floor(Math.random() * faces.length)];
    }, speed);
    setTimeout(() => {
      clearInterval(interval);
      span.textContent = finalChar;
      span.classList.remove("spinning");
      completedCount++;
      if (completedCount === rawScramble.length) {
        onAnimationComplete();
      }
      span.classList.add("locked");
    }, spinDuration);
  });
}

function onAnimationComplete() {
  genNum.classList.remove("hidden");
  playScramble();
}
// html part / camera rotation

let totalEXP = 0;
let currEXP = 0;

const genBtn = document.getElementById("generate");
const genNum = document.getElementById("genNum");
const scramText = document.getElementById("scramble");
const cardContainer = document.getElementById("cardContainer");
const expCount = document.querySelector(".expCount");
const buttonContainer = document.querySelector(".btnContainer");

const facePopup = document.querySelector(".facepopup");
const cubeRender = document.querySelector("canvas");

const shareHTML = `
  <button type="button" class="share">
    <img class="shareicon" src="assets/share.svg" alt="share" />
  </button>
`;

genBtn.addEventListener("click", (event) => {
  if (scrambleVec.length === 0) handleGeneration();
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function playScramble() {
  for (const move of scrambleVec) {
    scrambling = true;
    await moveToRot(move);
    await delay(50);
  }
  scrambling = false;
  await handleCards();
}

async function handleCards() {
  expCount.classList.remove("hidden");
  totalCards.length = 0;
  totalCardsMap.clear();
  totalEXP = 0;
  currEXP = 0;
  cardContainer.innerHTML = "";

  const cardElementsMap = new Map();

  for (let i = 0; i < 6; i++) {
    const face = faceIndex[i];
    const faceGrid = getFaceGrid(face);

    for (let j = 0; j < patterns.length; j++) {
      if (matchPattern(patterns[j], faceGrid, face)) {
        console.log(patterns[j].name + ": true on " + face);
        totalCards.push(
          new Card(patterns[j].name, face, patterns[j].exp, patterns[j].tier),
        );
      }
    }
    oppositesMatch(faceGrid, face);
  }
  totalCards.sort((a, b) => {
    const rankA = rarityIndex[a.rarity.toLowerCase()] || 99;
    const rankB = rarityIndex[b.rarity.toLowerCase()] || 99;
    return rankA - rankB;
  });

  let expAnimationActive = false;

  async function animateEXP() {
    if (expAnimationActive) return;
    expAnimationActive = true;
    while (totalEXP - currEXP > 0.1) {
      currEXP += (totalEXP - currEXP) * 0.25;
      expCount.textContent = "EXP: " + Math.floor(currEXP);
      await delay(30);
    }
    currEXP = totalEXP;
    expCount.textContent = "EXP: " + totalEXP;
    expAnimationActive = false;
  }

  for (const cardItem of totalCards) {
    // YESS I FIXED IT :D
    const cardKey = `${cardItem.name}`;

    const count = (totalCardsMap.get(cardKey) || 0) + 1;
    totalCardsMap.set(cardKey, count);

    totalEXP += cardItem.exp;
    animateEXP();

    if (cardElementsMap.has(cardKey)) {
      const existingCardCount = cardElementsMap.get(cardKey);
      existingCardCount.count.textContent = `x${count}`;
      existingCardCount.faces.push(cardItem.face);
      existingCardCount.faceElement.textContent =
        "Face: " + existingCardCount.faces.join(", ");
      await delay(850);
      continue;
    }

    const newCard = document.createElement("button");
    const newTitleContainer = document.createElement("div");
    const newTitle = document.createElement("h3");
    const newLine = document.createElement("div");
    const newEXP = document.createElement("p");
    const newRarity = document.createElement("p");
    const newFace = document.createElement("p");
    const newInform = document.createElement("div");
    const newBottom = document.createElement("div");
    const cardCount = document.createElement("p");

    newTitleContainer.className = "titleContainer";
    newLine.className = "line";
    newEXP.textContent = "EXP: " + cardItem.exp;
    newRarity.textContent = cardItem.rarity.toUpperCase();
    newTitle.textContent = cardItem.name.toUpperCase();
    newFace.textContent = "Face: " + cardItem.face;
    newCard.className = "card";
    newInform.className = "cardInformation";
    newBottom.className = "cardBottom";
    cardCount.className = "cardCount";
    cardCount.textContent = "x1";

    newTitleContainer.appendChild(newTitle);
    newTitleContainer.appendChild(newRarity);
    newInform.appendChild(newEXP);
    newInform.appendChild(newFace);
    newBottom.appendChild(newInform);
    newBottom.appendChild(cardCount);
    newCard.appendChild(newTitleContainer);
    newCard.appendChild(newLine);
    newCard.appendChild(newBottom);
    Object.assign(newCard.dataset, cardItem);
    cardContainer.prepend(newCard);

    cardElementsMap.set(cardKey, {
      count: cardCount,
      faces: [cardItem.face],
      faceElement: newFace,
    });
    await delay(1200);
  }
  facePopup.classList.remove("hidden");
  finishedCards = true;
}

function addShare() {
  // this just adds the sharing button :D
  if (buttonContainer && !buttonShareSpawn) {
    buttonContainer.insertAdjacentHTML("beforeend", shareHTML);
    buttonShareSpawn = true;
  } else {
    console.warn("cannot find btncontainer");
  }
}

// i thought theese fonts are sick so
document.addEventListener("click", async (event) => {
  const shareBtn = event.target.closest(".share");
  if (!shareBtn) return;
  try {
    event.stopPropagation();

    // another google pull
    const toMonospace = (text) => {
      return text
        .split("")
        .map((char) => {
          const code = char.charCodeAt(0);
          if (code >= 65 && code <= 90) {
            return String.fromCodePoint(0x1d670 + (code - 65));
          } else if (code >= 97 && code <= 122) {
            return String.fromCodePoint(0x1d68a + (code - 97));
          } else if (code >= 48 && code <= 57) {
            return String.fromCodePoint(0x1d7f6 + (code - 48));
          }
          return char;
        })
        .join("");
    };

    const toBoldSans = (text) => {
      return text
        .split("")
        .map((char) => {
          const code = char.charCodeAt(0);
          if (code >= 65 && code <= 90) {
            return String.fromCodePoint(0x1d5d4 + (code - 65));
          } else if (code >= 97 && code <= 122) {
            return String.fromCodePoint(0x1d5ee + (code - 97));
          }
          return char;
        })
        .join("");
    };

    // fixed sharing
    const title = `🧩 ${toBoldSans("My Daily SCRMBL")}`;
    const scrambleLable = toBoldSans("Scramble: ");
    const seedText = toMonospace(`Seed: ${finalSeed}`);
    const scramble = toMonospace(scrambleVec.toString().replaceAll(",", " "));
    const expText = toBoldSans("EXP: ") + totalEXP;
    const cardText = toBoldSans("Cards: ");
    const topThree = totalCards
      .slice(-3)
      .reverse()
      .map((card) => card.name)
      .join(", ");
    const remaining = totalCards.length - 3;
    const cardsText =
      remaining > 0 ? `${topThree} and ${remaining} more` : topThree;

    const shareText = `${title}\n\n\n${expText}\n\n${scrambleLable}\n${seedText}\n${scramble}\n${cardText}\n${cardsText}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        console.log("coppied :D");
      } catch (cliperr) {
        console.error("clipboard failed: ", cliperr);
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Daily SCRMBL",
          text: shareText,
        });
      } catch (err) {
        console.log("kaboom: ", err);
      }
    }
  } catch (err) {
    console.error("buzz buzz, copy error: ", err);
  }
});

function getCoordinates(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function updateMouseVector(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

document.addEventListener("click", function handleCardRotation(event) {
  const clickedCard = event.target.closest(".card");
  if (!clickedCard) return;

  const face = clickedCard.dataset.face;
  if (faceAngle[face] === undefined) return;

  currVelY = 0;
  currVelX = 0;

  targetRotY = faceAngle[face].y;
  targetRotX = faceAngle[face].x;
});
let hit;

window.addEventListener("pointermove", (e) => {
  // this highlights the face, explanation is in the highlights helper function
  // but basically you get the intersecting object, get the name and then highlight that face
  const coords = getCoordinates(e);
  updateMouseVector(coords.x, coords.y);

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hitboxGroup.children, false);
  if (intersects.length > 0) {
    hit = intersects[0];
    const faceKey = hit.object.name;

    if (currentHighlightedFace !== faceKey) {
      currentHighlightedFace = faceKey;
      highlight(faceKey);
    }
  } else {
    if (currentHighlightedFace !== null) {
      currentHighlightedFace = null;
      highlight(null);
    }
  }
});

window.addEventListener("dblclick", () => {
  // this is the double click selection for the faces once you finish the scramble
  if (!finishedCards || isDragging || faceSelected || finished) return; // some boundaries
  const intersects = raycaster.intersectObjects(hitboxGroup.children, false);

  let faceKey = null;

  // if we are intersecting a face with our raycast, each piece will have a unique userdata (name)
  if (intersects.length > 0) {
    hit = intersects[0];
    faceKey = hit.object.name;
  }

  // rotate the camera to that face :D
  if (faceKey && faceAngle[faceKey]) {
    currVelY = 0;
    currVelX = 0;

    targetRotY = faceAngle[faceKey].y;
    targetRotX = faceAngle[faceKey].x;
    faceSelected = true;
  }
});

cubeRender.addEventListener("pointerdown", (e) => {
  if (e.cancelable) e.preventDefault();
  cubeRender.style.cursor = "grabbing";
  isMouseDown = true;

  const coords = getCoordinates(e);
  lastX = coords.x;
  lastY = coords.y;

  lastMoveTime = performance.now();
  spinVel = 0;
  if (faceSelected) {
    updateMouseVector(coords.x, coords.y);
    const rect = renderer.domElement.getBoundingClientRect();

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(hitboxGroup.children, false);
    hit = intersects[0];

    if (hit) {
      // this will get the position of where our mouse landed on the cube face, via a raycast
      const faceKey = hit.object.name;
      const center = cube.getWorldPosition(new THREE.Vector3()).project(camera);

      dragPivX = rect.left + ((center.x + 1) * rect.width) / 2;
      dragPivY = rect.top + ((1 - center.y) * rect.height) / 2;

      createFaceRot(faceKey); // make the rotaiton layer
    }
  }
  if (targetRotY === null) targetRotY = camPiv.rotation.y;
  if (targetRotX === null) targetRotX = camPivX.rotation.x;
});

cubeRender.addEventListener("pointermove", (e) => {
  if (!isMouseDown) return;

  // get the position of the movement
  const coords = getCoordinates(e);
  currMouseX = coords.x;
  currMouseY = coords.y;

  updateMouseVector(currMouseX, currMouseY);

  // for camera rotation
  deltaX = currMouseX - lastX;
  deltaY = currMouseY - lastY;

  const now = performance.now();
  const moveDt = Math.max((now - lastMoveTime) / 1000, 1 / 240); //delta
  lastMoveTime = now;

  // camera rotation work, huss huss huss
  if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
    if (!isDragging) {
      isDragging = true;
    }
    rotY = -deltaX * 0.01;
    rotX = -deltaY * 0.01;
  } else {
    // the rotation will damp out if the pointer isnt moving, creates this spinny thing so that the rotation wont just stop abruptly or spin forever
    rotY *= 0.5;
    rotX *= 0.5;
  }
  if (activeRotGroup) {
    // this is for when we have selected a face. The code bellow will just get the pivot, the drag position, and then rotate the layer while updating the piece positioning later
    const currAngle = Math.atan2(currMouseY - dragPivY, currMouseX - dragPivX);
    const prevAngle = Math.atan2(lastY - dragPivY, lastX - dragPivX);

    let delta = currAngle - prevAngle; // this will be our drag value
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));

    const targetDelta = delta * layerMultiplier[currSelectedFace];

    targetLayerAngle += targetDelta;

    const sampleVelocity = targetDelta / moveDt;
    spinVel = THREE.MathUtils.clamp(
      spinVel * 0.8 + sampleVelocity * 0.2,
      -rotSpeedClamp,
      rotSpeedClamp,
    ); // clamping it so it wont go too fast (taking forever for the psin to finish or just glitching the layer sometimes)
  }
  // make sure to update the variables for future deltas
  prevMouseX = currMouseX;
  prevMouseY = currMouseY;
  lastX = prevMouseX;
  lastY = prevMouseY;
});

// a few events to stop the camera rotation
cubeRender.addEventListener("pointerout", (e) => {
  isMouseDown = false;
  isDragging = false;
  cubeRender.style.cursor = "grab";
  // we will need reset the rotation or else the cube will keep spinning
  rotY = 0;
  rotX = 0;
});

window.addEventListener("pointerup", () => {
  isMouseDown = false;
  isDragging = false;
  cubeRender.style.cursor = "grab";
});

window.addEventListener("pointercancel", () => {
  isMouseDown = false;
  isDragging = false;
  cubeRender.style.cursor = "grab";
});

function createRotGroup(move) {
  // js makes a group and put all the cube pieces of a certain face to this group for rotation
  // taken from the layerRot function, the final spin will be it's own helper function soon at spinnyBoi.js
  const group = new THREE.Group();
  cube.add(group);
  for (const piece of getLayer(move)) group.attach(piece);
  return group;
}

function createFaceRot(faceKey) {
  //this makes the rotation layer :P
  currSelectedFace = faceKey;
  activeAxis = faceAxis[faceKey] ?? "x";
  activeRotGroup = createRotGroup(faceKey);
  targetLayerAngle = 0;
  spinVel = 0;
}

titleRepel();

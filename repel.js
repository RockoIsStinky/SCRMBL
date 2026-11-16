export function titleRepel() {
  const titles = document.querySelectorAll(".title");

  const repelAlpha = 0.1;

  let letters = [];

  // split titles into smoll letters
  titles.forEach((title) => {
    const isP = title.tagName === "P";

    // cuz the effect is kinda wierd even after accounting for dynamic sizes, so i just slapped this on
    const currentRad = isP ? 4 : 1;
    const currentStrength = isP ? 0.3 : 0.1;
    const text = title.textContent;

    title.innerHTML = [...text]
      .map((char, i) =>
        char === " "
          ? "&nbsp;"
          : `<span style="animation-delay:${i * 0.12}s">${char}</span>`,
      ) // seperate them into spans
      .join("");

    const titleLetters = title.querySelectorAll("span"); // after seperating them into spans, WE GET THOSE SPANS

    titleLetters.forEach((letter) => {
      // this will just give each individual span variables
      const rect = letter.getBoundingClientRect();

      letter.currentY = 0;
      letter.targetY = 0;
      letter.baseRad = rect.height * currentRad;
      letter.baseMaxMove = rect.height * currentStrength;
    });

    letters.push(...titleLetters);
  });
  // resizing the window has some wierd effects on how much the text will translate, so this fixes it
  window.addEventListener("resize", () => {
    titles.forEach((title) => {
      const rect = title.getBoundingClientRect();

      title.querySelectorAll("span").forEach((letter) => {
        letter.baseRad = rect.height * repelRad;
        letter.baseMaxMove = rect.height * repelStrength;
      });
    });
  });

  function animateLetters() {
    // this will actually repel the text
    letters.forEach((letter) => {
      letter.currentY += (letter.targetY - letter.currentY) * repelAlpha;
      letter.style.transform = `translateY(${letter.currentY}px)`;
    });

    requestAnimationFrame(animateLetters);
  }

  window.addEventListener("pointermove", (e) => {
    // detect moevment so we can move the text accordingly
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    letters.forEach((letter) => {
      const rect = letter.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2 - letter.currentY;

      const dx = centerX - mouseX;
      const dy = centerY - mouseY;
      const dist = Math.hypot(dx, dy);

      const currentRadius = letter.baseRad;
      const currentMaxMove = letter.baseMaxMove;

      if (dist < currentRadius) {
        const force = (currentRadius - dist) / currentRadius;
        letter.targetY = Math.sign(dy || 1) * force * currentMaxMove;
      } else {
        letter.targetY = 0;
      }
    });
  });

  window.addEventListener("pointerleave", () => {
    letters.forEach((letter) => {
      letter.targetY = 0;
    });
  });

  animateLetters();
}

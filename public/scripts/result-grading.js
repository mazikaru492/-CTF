function markLoop(radius) {
  return Array.from({ length: 241 }, (_, index) => {
    const phase = (index / 240) * 2 * Math.PI;
    const angle = phase - Math.PI / 2;
    return {
      x: 132 + radius * Math.cos(angle),
      y: 58 + radius * Math.sin(angle),
    };
  });
}

function brushLoop(radiusX, radiusY, thickness, startAngle, sweep) {
  const tilt = 0.22;
  function pointAt(angle, offset) {
    const x = (radiusX + offset) * Math.cos(angle);
    const y = (radiusY + offset) * Math.sin(angle);
    return {
      x: 132 + x * Math.cos(tilt) - y * Math.sin(tilt),
      y: 58 + x * Math.sin(tilt) + y * Math.cos(tilt),
    };
  }

  return Array.from({ length: 241 }, (_, step) => {
    const progress = step / 240;
    const angle = startAngle + sweep * progress;
    const halfWidth = (thickness / 2) * Math.sin(Math.PI * progress) ** 0.8;
    return {
      ...pointAt(angle, 0),
      inner: pointAt(angle, -halfWidth),
      outer: pointAt(angle, halfWidth),
    };
  });
}

function drawBrushStroke(ink, stroke, lastPoint) {
  ink.beginPath();
  ink.moveTo(stroke[0].outer.x, stroke[0].outer.y);
  for (let step = 1; step <= lastPoint; step++) {
    const { x, y } = stroke[step].outer;
    ink.lineTo(x, y);
  }
  for (let step = lastPoint; step >= 0; step--) {
    const { x, y } = stroke[step].inner;
    ink.lineTo(x, y);
  }
  ink.closePath();
  ink.fill();
}

function flowerStrokes() {
  const petalCount = 8;
  const petalAngle = (2 * Math.PI) / petalCount;
  const baseRadius = 26;
  const arcAngle = 2.05;
  const petalRadius = (baseRadius * Math.sin(petalAngle / 2)) / Math.sin(arcAngle);
  const petalCenter = baseRadius * Math.cos(petalAngle / 2) - petalRadius * Math.cos(arcAngle);
  const stepsPerPetal = 30;
  const outline = Array.from({ length: petalCount }, (_, petal) => {
    const direction = petal * petalAngle - Math.PI / 2;
    return Array.from({ length: stepsPerPetal }, (_, step) => {
      const angle = arcAngle * (2 * (step / stepsPerPetal) - 1);
      const radial = petalCenter + petalRadius * Math.cos(angle);
      const tangent = petalRadius * Math.sin(angle);
      return {
        x: 132 + radial * Math.cos(direction) - tangent * Math.sin(direction),
        y: 58 + radial * Math.sin(direction) + tangent * Math.cos(direction),
      };
    });
  }).flat();
  outline.push(outline[0]);

  const spiral = Array.from({ length: 241 }, (_, step) => {
    const progress = step / 240;
    const angle = Math.PI / 2 + progress * 3.7 * Math.PI;
    const radius = 24 - 22 * progress ** 2;
    return { x: 132 + radius * Math.cos(angle), y: 58 + radius * Math.sin(angle) };
  });
  return [outline, spiral];
}

export function animateScoreMark(stage) {
  const canvas = stage.querySelector('canvas');
  const ink = canvas.getContext('2d');
  if (!ink) return;
  const grader = stage.querySelector('.result-grader');
  const width = 176;
  const height = 124;
  const strokes = {
    flower: flowerStrokes(),
    double: [brushLoop(36, 33, 6.6, 2.15, 5.98), brushLoop(20, 18, 6, 2.05, 6.12)],
    single: [markLoop(37)],
  }[stage.dataset.mark];
  const walkDuration = 940;
  const strokeDuration = 640;
  const liftDuration = 130;
  const strokeInterval = strokeDuration + liftDuration;
  const drawingDuration = strokes ? strokes.length * strokeInterval - liftDuration : 0;
  const settleDuration = 300;
  const restingX = 37;
  const restingY = 8;
  // The pen tip is offset from the top-left of the character art.
  const tipX = 57;
  const tipY = 36;
  const mix = (from, to, progress) => from + (to - from) * progress;

  ink.scale(canvas.width / width, canvas.height / height);
  ink.lineWidth = 3;
  ink.lineCap = 'round';
  ink.lineJoin = 'round';
  ink.strokeStyle = '#bc2936';
  ink.fillStyle = ink.strokeStyle;
  const firstPoint = strokes ? strokes[0][0] : { x: restingX + tipX, y: restingY + tipY };

  function placeGrader(x, y, tilt = 0) {
    grader.style.left = `${(x / width) * 100}%`;
    grader.style.top = `${(y / height) * 100}%`;
    grader.style.transform = `rotate(${tilt}deg)`;
  }

  function drawInk(elapsed) {
    ink.clearRect(0, 0, width, height);
    if (!strokes) return firstPoint;
    for (const [index, stroke] of strokes.entries()) {
      const timeInStroke = elapsed - index * strokeInterval;
      const fraction = Math.min(1, timeInStroke / strokeDuration);
      const lastPoint = Math.floor(fraction * (stroke.length - 1));
      const point = stroke[lastPoint];
      if (lastPoint > 0 && point.outer) {
        drawBrushStroke(ink, stroke, lastPoint);
      } else if (lastPoint > 0) {
        ink.beginPath();
        ink.moveTo(stroke[0].x, stroke[0].y);
        for (let step = 1; step <= lastPoint; step++) ink.lineTo(stroke[step].x, stroke[step].y);
        ink.stroke();
      }
      const next = strokes[index + 1]?.[0];
      if (fraction < 1 || !next) return point;
      if (timeInStroke < strokeInterval) {
        const lift = (timeInStroke - strokeDuration) / liftDuration;
        return { x: mix(point.x, next.x, lift), y: mix(point.y, next.y, lift) };
      }
    }
  }

  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const start = performance.now();
  function frame(now) {
    if (!stage.isConnected) return;
    const elapsed = now - start;
    if (motionPreference.matches || elapsed >= walkDuration + drawingDuration + settleDuration) {
      grader.classList.remove('is-walking');
      placeGrader(restingX, restingY);
      drawInk(drawingDuration);
      stage.classList.remove('is-grading');
      return;
    }
    if (elapsed < walkDuration) {
      const walk = Math.max(0, elapsed / walkDuration);
      const steps = Math.sin(walk * Math.PI * 8);
      const reach = Math.max(0, (walk - 0.75) / 0.25);
      placeGrader(
        mix(-8, firstPoint.x - tipX, walk),
        mix(restingY, firstPoint.y - tipY, reach) - Math.abs(steps) * 4,
        steps * 4,
      );
    } else {
      grader.classList.remove('is-walking');
      const drawingTime = elapsed - walkDuration;
      const tip = drawInk(Math.min(drawingTime, drawingDuration));
      const settle = Math.max(0, (drawingTime - drawingDuration) / settleDuration);
      const easedSettle = 1 - (1 - settle) ** 2;
      placeGrader(
        mix(tip.x - tipX, restingX, easedSettle),
        mix(tip.y - tipY, restingY, easedSettle),
      );
    }
    requestAnimationFrame(frame);
  }

  stage.classList.add('is-grading');
  grader.classList.add('is-walking');
  frame(start);
}

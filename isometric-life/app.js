(function () {
  'use strict';

  const TILE_TYPES = {
    grass: {
      base: '#3d5a3b',
      highlight: '#4a6b47',
      shadow: '#2d4229',
    },
    water: {
      base: '#2d5a7b',
      highlight: '#3d6e94',
      shadow: '#1e3d52',
    },
    sand: {
      base: '#c4a574',
      highlight: '#d4b88a',
      shadow: '#a68b5c',
    },
    stone: {
      base: '#5c5c5c',
      highlight: '#707070',
      shadow: '#404040',
    },
    forest: {
      base: '#2d4a2d',
      highlight: '#3a5c3a',
      shadow: '#1e331e',
    },
  };

  const TILE_WIDTH = 64;
  const TILE_HEIGHT = 32;
  const MAP_ROWS = 10;
  const MAP_COLS = 10;

  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');

  const MAP_SEED = Date.now();
  let rngState = Math.floor(MAP_SEED % 2147483647) || 1;

  function nextRandom() {
    rngState = (rngState * 16807) % 2147483647;
    return rngState / 2147483647;
  }

  const TILE_WEIGHTS = [
    { type: 'water', max: 0.05 },
    { type: 'sand', max: 0.10 },
    { type: 'stone', max: 0.4 },
    { type: 'forest', max: 0.7 },
    { type: 'grass', max: 1.0 },
  ];

  const COASTAL_WEIGHTS = [
    { type: 'water', max: 0.45 },
    { type: 'sand', max: 0.95 },
    { type: 'grass', max: 1.0 },
  ];

  function pickTileType(weights) {
    const w = weights || TILE_WEIGHTS;
    const r = nextRandom();
    for (let i = 0; i < w.length; i++) {
      if (r < w[i].max) return w[i].type;
    }
    return 'grass';
  }

  function hasWaterNeighbor(map, row, col) {
    const neighbors = [
      [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
    ];
    for (let i = 0; i < neighbors.length; i++) {
      const r = neighbors[i][0], c = neighbors[i][1];
      if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS && map[r][c] === 'water') {
        return true;
      }
    }
    return false;
  }

  function buildMap() {
    const map = [];
    for (let r = 0; r < MAP_ROWS; r++) {
      map[r] = [];
      for (let c = 0; c < MAP_COLS; c++) {
        map[r][c] = pickTileType();
      }
    }
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (hasWaterNeighbor(map, r, c)) {
          map[r][c] = pickTileType(COASTAL_WEIGHTS);
        }
      }
    }
    return map;
  }

  function isoToScreen(row, col) {
    const x = (col - row) * (TILE_WIDTH / 2);
    const y = (col + row) * (TILE_HEIGHT / 2);
    return { x, y };
  }

  function drawTile(cx, cy, typeKey) {
    const t = TILE_TYPES[typeKey] || TILE_TYPES.grass;
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    // Top face (visible in iso) - diamond
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);       // top
    ctx.lineTo(cx + hw, cy);       // right
    ctx.lineTo(cx, cy + hh);       // bottom
    ctx.lineTo(cx - hw, cy);       // left
    ctx.closePath();

    ctx.fillStyle = t.base;
    ctx.fill();

    ctx.strokeStyle = t.shadow;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top edge highlight (left-top edge)
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.lineTo(cx, cy - hh);
    ctx.strokeStyle = t.highlight;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function getMapOrigin() {
    const centerRow = (MAP_ROWS - 1) / 2;
    const centerCol = (MAP_COLS - 1) / 2;
    const centerIso = isoToScreen(centerRow, centerCol);
    return {
      x: canvas.width / 2 - centerIso.x,
      y: canvas.height / 2 - centerIso.y,
    };
  }

  function isWalkable(map, row, col) {
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
    return map[row][col] !== 'water';
  }

  function getValidMoves(map, row, col) {
    const neighbors = [
      [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
    ];
    return neighbors.filter(function (n) {
      return isWalkable(map, n[0], n[1]);
    });
  }

  function findSpawnTile(map, excludeRow, excludeCol) {
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (map[r][c] === 'water') continue;
        if (excludeRow !== undefined && r === excludeRow && c === excludeCol) continue;
        return { row: r, col: c };
      }
    }
    return { row: 0, col: 0 };
  }

  const animal = {
    row: 0,
    col: 0,
    eatingTicksLeft: 0,
    frame: 0,
    bodyColor: '#8b6914',
    headColor: '#a07818',
    strokeColor: '#6b5010',
  };

  const animal2 = {
    row: 0,
    col: 0,
    frame: 0,
    bodyColor: '#6b4423',
    headColor: '#8b5a2b',
    strokeColor: '#4a3520',
  };

  function drawAnimal(screenX, screenY, anim) {
    ctx.save();
    ctx.translate(screenX, screenY);

    const bounce = Math.sin(anim.frame * 0.2) * 2;
    ctx.translate(0, bounce);

    ctx.beginPath();
    ctx.ellipse(0, 4, 10, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = anim.bodyColor;
    ctx.fill();
    ctx.strokeStyle = anim.strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, -6, 10, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = anim.headColor;
    ctx.fill();
    ctx.strokeStyle = anim.strokeColor;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-3.5, -8, 2.5, 0, Math.PI * 2);
    ctx.arc(3.5, -8, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    if (anim.eatingTicksLeft > 0) {
      const smilePhase = Math.sin(anim.frame * 0.35) * 0.15 + 0.85;
      ctx.beginPath();
      ctx.arc(0, -5, 7 * smilePhase, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = anim.strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  function tick() {
    animal.frame += 1;

    if (animal.eatingTicksLeft > 0) {
      animal.eatingTicksLeft -= 1;
    } else {
      const tile = map[animal.row][animal.col];
      const validMoves = getValidMoves(map, animal.row, animal.col);
      if (tile === 'grass' && validMoves.length > 0 && Math.random() < 0.45) {
        animal.eatingTicksLeft = 3 + Math.floor(Math.random() * 4);
      } else if (validMoves.length > 0) {
        const next = validMoves[Math.floor(Math.random() * validMoves.length)];
        animal.row = next[0];
        animal.col = next[1];
      }
    }

    animal2.frame += 1;
    if (map[animal2.row][animal2.col] === 'forest') {
      map[animal2.row][animal2.col] = 'grass';
    }
    const moves2 = getValidMoves(map, animal2.row, animal2.col);
    if (moves2.length > 0) {
      const next = moves2[Math.floor(Math.random() * moves2.length)];
      animal2.row = next[0];
      animal2.col = next[1];
    }

    render(map);
  }

  function render(map) {
    const origin = getMapOrigin();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let d = 0; d <= MAP_ROWS + MAP_COLS - 2; d++) {
      for (let r = 0; r < MAP_ROWS; r++) {
        const c = d - r;
        if (c >= 0 && c < MAP_COLS) {
          const { x, y } = isoToScreen(r, c);
          const screenX = origin.x + x;
          const screenY = origin.y + y;
          drawTile(screenX, screenY, map[r][c]);
        }
      }
    }

    const drawOrder = [animal, animal2].sort(function (a, b) {
      return (a.row + a.col) - (b.row + b.col);
    });
    drawOrder.forEach(function (anim) {
      const { x, y } = isoToScreen(anim.row, anim.col);
      drawAnimal(origin.x + x, origin.y + y, anim);
    });
  }

  const map = buildMap();
  const spawn1 = findSpawnTile(map);
  animal.row = spawn1.row;
  animal.col = spawn1.col;
  const spawn2 = findSpawnTile(map, animal.row, animal.col);
  animal2.row = spawn2.row;
  animal2.col = spawn2.col;

  render(map);
  setInterval(tick, 420);
})();

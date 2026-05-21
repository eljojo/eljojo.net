/* ============================================================================
   CANOPY — dappled-light background for eljojo.net
   ============================================================================

   A <canvas id="canopy"> in the page becomes a living background: spring
   trees overhead, the sun pouring through, dappled shadows blinking in the
   wind. Runs entirely passively. The seed is fresh on every page load, so
   the pattern is different every time you visit.

   "today i was at a park and i was sitting down under the trees, it's
    spring so the trees are still growing their leaves, and the sun was
    shining strong. the shadows of the leaves created an almost blinking
    pattern, it was beautiful, as the trees moved slowly with the wind,
    the pattern would blink as the shadow comes and goes thru the leaves,
    but as the wind would blow stronger, the entire set of shadows would
    shift right. it was a pinhole effect, it almost had caustics. "

   "i was sitting under the shadow of the tree and the leaves. in this
    shadow, the tiny gaps between the leaves would let rays of light
    through that would be cast onto the ground, these rays of light would
    flicker in and out as the different leaves move by the wind in the
    tree"

   "it's almost as if leaves would appear and disappear as the leaves
    move, due to the pinhole-like effect of the light rays coming through the gaps between"

   "it's almost as if i had two paper grids that i stick next to each
    other and move opposite directions"

   "because it's spring, leaves haven't developed just yet,
    smaller trees seem denser than bigger trees, since
    their branches have more space between"

   ┌──────────────────────────────────────────────────────────────────────┐
   │  THE MENTAL MODEL                                                    │
   └──────────────────────────────────────────────────────────────────────┘

   3D trees grown from data (a tiny L-system). Leaves are 3D points
   clustered at branch tips, with wide per-leaf POSITION JITTER so the
   leaves of a single tree spread into a fuzzy cloud rather than sitting
   tightly on the branch tip — neighboring trees' clouds then merge into
   one continuous canopy instead of isolated tree-shadow blobs.

   The sun (with a fixed direction vector) projects every leaf and branch
   onto the viewport. The viewport IS the ground we look at. There is no
   camera — projection is a simple shear by z.

   The crucial mechanism for the moiré-like flicker is the 3D LAYER
   system. Every leaf is assigned at scene-build time to one of N discrete
   height-layers. At render time each layer translates as a coherent slab
   — every leaf in layer k gets the SAME offset at time t. Different
   layers have different drift functions (two-octave sinusoids,
   randomized per layer). The interference between projected layers
   sliding past each other on the ground plane IS the moiré. Random
   per-leaf jitter would give noise; coherent layers give real
   interference. ("it's almost as if i had two paper grids ...
   move opposite directions.")

   Bulk wind, separately, shifts EVERY leaf and branch coherently — that
   produces the "the whole field shifts right together when a gust comes
   through" feeling. Gusts ramp and decay on long-ish time scales.

   On top of all that, the LIGHT RAYS layer paints fixed-position bright
   sun-image spots on the ground BEFORE leaves are drawn. As layer drift
   sweeps leaves across those positions, each ray flickers off (occluded)
   and on (uncovered). That is the literal physical mechanism for "tiny
   gaps between leaves let rays of light through that flicker in and out."

   ┌──────────────────────────────────────────────────────────────────────┐
   │  ART DIRECTION                                                       │
   └──────────────────────────────────────────────────────────────────────┘

   Color: grounded in CIELAB, not vibes. From josé:

     "The palette is grounded in CIELAB color science.
      Slight cool (negative b*) combined with a whisper of rose (a*
      +0.5). This is the color of twilight — technically cool but
      perceptually soft."

   Interaction: "Fully passive — runs on its own, like real weather."

   ┌──────────────────────────────────────────────────────────────────────┐
   │  OPEN ITERATION NOTE FOR FUTURE AIs                                  │
   └──────────────────────────────────────────────────────────────────────┘

   José's latest unresolved feedback, AT THE TIME OF WRITING:

     "in the answer above you articulated what i said correctly, but the
      rendered still doesn't quite reflect the effect of lights of ray
      coming through, it looks like dots moving to the side. can you
      revisit the file and fix it? please focus carefully on my lived
      experience"

  ideas:

     - Directional ray streaks biased along the sun vector. Real
       sun-images through a wind-blown canopy have a smeared,
       directional character — not isotropic dots.

     - Compute, per frame, an actual canopy-density field by sampling
       projected leaf positions; modulate each ray's alpha by the
       INVERSE of the local density, so rays really do read out of the
       gaps. (More expensive but physically faithful.)

   ┌──────────────────────────────────────────────────────────────────────┐
   │  THE DEFAULT PARAMETER SET                                           │
   └──────────────────────────────────────────────────────────────────────┘

   The PARAMS below were hand-tuned by josé over multiple sessions.
   They favor the smoky/dappled aesthetic (translucent leaves, low ray
   brightness, large soft halos) rather than the binary-flicker aesthetic.
   Do not reset them without conversation.

   ============================================================================ */

(() => {
  'use strict';

  /* ──────────────────────── PARAMS — hand-tuned by josé ─────────────────── */
  const PARAMS = {
    // structure
    targetLeaves:     5000,
    leafDensity:      0.70,
    twigProb:         0.10,
    posJitter:        52,      // wide lateral scatter → trees merge into a continuous canopy
    treeSizeMin:      0.75,
    treeSizeMax:      1.60,
    treeCountMult:    1.00,

    // appearance
    leafSizeMult:     1.50,
    leafAlphaMult:    0.30,    // translucent leaves → soft, smoky dapple
    branchAlphaMult:  0.20,    // branches faint; canopy is mostly leaves

    // 3d layers — independent z-slabs (THE moiré mechanism)
    layerCount:       50,
    layerAmpMult:     1.80,
    layerSpeedMult:   1.45,

    // wind — coherent across all leaves; gusts surge the whole canopy
    bulkWindMult:     1.75,
    gustStrengthMult: 2.20,
    gustFreqMult:     1.00,

    // light rays — bright spots that flicker as leaves drift over them
    rayDensity:       2.35,
    rayBrightnessMult: 0.10,   // low core brightness; relies on size+halo for the glow
    raySizeMult:      2.70,
    rayHaloMult:      1.90,
  };

  /* ──────────────────────── COLOR (CIELAB → sRGB) ────────────────────────
     Twilight-discipline palette. a* +0.5 (whisper of rose), b* −2 (slight
     cool). NEVER drift this toward positive b* (warm cream/sepia) — that's
     the AI design cliché josé called out as physically repulsive when
     overused. The warmth we want comes from low L* contrast and the rose
     a* axis, not from a yellow shift. */
  const PALETTE_LAB = {
    deepShadow:   [14, 0.5, -2],
    midShadow:    [28, 0.5, -2],
    sunlitPool:   [78, 0.5, -2],
    causticPeak:  [88, 0.5, -2],
    // sunImage: the color of an actual pinhole sun-image on the ground —
    // much brighter than any unobstructed ground patch. This is what makes
    // a ray FEEL like a ray and not "less shadow." L* near max, same a*/b*.
    sunImage:     [97, 0.5, -2],
  };

  function labToRgb(L, a, b) {
    const fy = (L + 16) / 116, fx = a / 500 + fy, fz = fy - b / 200;
    const eps = 216 / 24389, kap = 24389 / 27;
    const fx3 = fx**3, fy3 = fy**3, fz3 = fz**3;
    const X = 0.95047 * (fx3 > eps ? fx3 : (116 * fx - 16) / kap);
    const Y = 1.00000 * (L  > kap * eps ? fy3 : L / kap);
    const Z = 1.08883 * (fz3 > eps ? fz3 : (116 * fz - 16) / kap);
    const rl =  3.2406 * X + -1.5372 * Y + -0.4986 * Z;
    const gl = -0.9689 * X +  1.8758 * Y +  0.0415 * Z;
    const bl =  0.0557 * X + -0.2040 * Y +  1.0570 * Z;
    const enc = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055;
    return [
      Math.max(0, Math.min(255, Math.round(enc(rl) * 255))),
      Math.max(0, Math.min(255, Math.round(enc(gl) * 255))),
      Math.max(0, Math.min(255, Math.round(enc(bl) * 255))),
    ];
  }
  const RGB = {};
  for (const k in PALETTE_LAB) RGB[k] = labToRgb(...PALETTE_LAB[k]);
  const rgbStr  = ([r,g,b], a=1) => `rgba(${r},${g},${b},${a})`;
  const rgbStr3 = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

  /* ──────────────────────── SEEDED RNG ──────────────────────────────────── */
  function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ──────────────────────── PHYSICAL MODEL ───────────────────────────────
     SUN.{x,y,z} is the direction TO the sun from the ground. The projection
     of a point at height z onto the ground is just (x + z·SUN_PROJ_X,
     y + z·SUN_PROJ_Y) — a shear, no perspective. Slightly off-zenith so
     shadows skew gently down-right. */
  const SUN = { x: 0.10, y: 0.06, z: -1.0 };
  const SUN_PROJ_X = SUN.x / -SUN.z;
  const SUN_PROJ_Y = SUN.y / -SUN.z;

  const TREE_INITIAL_LENGTH = 95;
  const TREE_INITIAL_WIDTH  = 11;
  const TREE_MAX_DEPTH      = 7;
  const TREE_BRANCH_FACTOR  = [2, 3];
  const TREE_LENGTH_DECAY   = [0.62, 0.85];
  const TREE_WIDTH_DECAY    = 0.62;
  const TREE_AZIMUTH_JITTER = 1.0;
  const TREE_PITCH_RANGE    = [-0.05, 0.55];
  const LEAF_MIN_DEPTH      = 4;
  const LEAF_POS_JITTER_Z   = 10;

  /* ──────────────────────── 3D LAYER SYSTEM ─────────────────────────────
     This is THE mechanism that produces moiré. Each leaf is bound at
     scene-build time to one of N height-layers. At render time the layer
     translates as a coherent slab — every leaf in layer k shares the same
     (x,y) offset. Different layers have different drift functions, so
     their projected shadow patterns slide INDEPENDENTLY on the ground.
     That is interference; that is what blinks. Random per-leaf motion
     gives noise, not interference. (José: "it's almost as if i had two
     paper grids that i stick next to each other and move opposite
     directions.")  */
  let LAYERS = [];

  function buildLayers(maxZ, rng) {
    LAYERS = [];
    const N = Math.max(1, Math.floor(PARAMS.layerCount));
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N;
      const zCenter = 30 + t * (maxZ - 30);
      LAYERS.push({
        zCenter,
        // Two-octave sinusoid per axis, frequencies and amplitudes
        // randomized so no two layers drift in lockstep.
        fX1: 0.00032 + rng() * 0.00060,
        fX2: 0.00075 + rng() * 0.00095,
        fY1: 0.00026 + rng() * 0.00055,
        fY2: 0.00060 + rng() * 0.00088,
        aX1: 7   + rng() * 6,
        aX2: 2.5 + rng() * 3,
        aY1: 5   + rng() * 5,
        aY2: 1.5 + rng() * 2.5,
        pX1: rng() * Math.PI * 2,
        pX2: rng() * Math.PI * 2,
        pY1: rng() * Math.PI * 2,
        pY2: rng() * Math.PI * 2,
      });
    }
  }

  function layerOffset(layerIdx, t) {
    const L = LAYERS[layerIdx];
    const ts = t * PARAMS.layerSpeedMult;
    const x = Math.sin(ts * L.fX1 + L.pX1) * L.aX1
            + Math.sin(ts * L.fX2 + L.pX2) * L.aX2;
    const y = Math.cos(ts * L.fY1 + L.pY1) * L.aY1
            + Math.cos(ts * L.fY2 + L.pY2) * L.aY2;
    return [x * PARAMS.layerAmpMult, y * PARAMS.layerAmpMult];
  }

  function assignLayer(z) {
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < LAYERS.length; i++) {
      const d = Math.abs(z - LAYERS[i].zCenter);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  /* ──────────────────────── TREES (L-system) ─────────────────────────── */
  function rotateDir(dir, azimuth, pitch) {
    const ux = dir[0], uy = dir[1], uz = dir[2];
    let px, py, pz;
    if (Math.abs(uz) < 0.99) { px = -uy; py = ux; pz = 0; }
    else { px = 1; py = 0; pz = 0; }
    const plen = Math.hypot(px, py, pz);
    px /= plen; py /= plen; pz /= plen;
    const cosp = Math.cos(pitch), sinp = Math.sin(pitch);
    let tx = ux * cosp + px * sinp;
    let ty = uy * cosp + py * sinp;
    let tz = uz * cosp + pz * sinp;
    const cosa = Math.cos(azimuth), sina = Math.sin(azimuth);
    const dot = tx * ux + ty * uy + tz * uz;
    const cx = uy * tz - uz * ty;
    const cy = uz * tx - ux * tz;
    const cz = ux * ty - uy * tx;
    return [
      tx * cosa + cx * sina + ux * dot * (1 - cosa),
      ty * cosa + cy * sina + uy * dot * (1 - cosa),
      tz * cosa + cz * sina + uz * dot * (1 - cosa),
    ];
  }

  /* Leaves get wide lateral position jitter so each tree's leaves spread
     into a fuzzy cloud rather than clustering tightly at branch tips. This
     sacrifices some physical realism (real leaves cluster at tips) for the
     visual goal: neighboring tree-clouds merging into one continuous
     canopy field, not isolated tree-shadow blobs in a sea of light. */
  function makeLeaf(x, y, z, rng) {
    const jx = (rng() - 0.5) * 2 * PARAMS.posJitter;
    const jy = (rng() - 0.5) * 2 * PARAMS.posJitter;
    const jz = (rng() - 0.5) * 2 * LEAF_POS_JITTER_Z;
    return {
      pos: [x + jx, y + jy, Math.max(20, z + jz)],
      layer: 0,  // assigned later, after layers are built
    };
  }

  function growTree(origin, rng, sizeFactor) {
    const branches = [];
    const leaves = [];
    function grow(start, dir, length, width, depth) {
      const end = [
        start[0] + dir[0] * length,
        start[1] + dir[1] * length,
        start[2] + dir[2] * length,
      ];
      branches.push({
        start: [start[0], start[1], start[2]],
        end:   [end[0],   end[1],   end[2]],
        width,
      });
      if (depth >= TREE_MAX_DEPTH || width < 1.0) {
        if (depth >= LEAF_MIN_DEPTH && rng() < PARAMS.leafDensity) {
          leaves.push(makeLeaf(end[0], end[1], end[2], rng));
        }
        return;
      }
      const splits = TREE_BRANCH_FACTOR[0] +
        Math.floor(rng() * (TREE_BRANCH_FACTOR[1] - TREE_BRANCH_FACTOR[0] + 1));
      for (let i = 0; i < splits; i++) {
        const az = (rng() * 2 - 1) * TREE_AZIMUTH_JITTER;
        const pi = TREE_PITCH_RANGE[0] + rng() * (TREE_PITCH_RANGE[1] - TREE_PITCH_RANGE[0]);
        const nd = rotateDir(dir, az, pi);
        const nl = length * (TREE_LENGTH_DECAY[0] + rng() * (TREE_LENGTH_DECAY[1] - TREE_LENGTH_DECAY[0]));
        const nw = width * TREE_WIDTH_DECAY;
        grow(end, nd, nl, nw, depth + 1);
        if (depth >= LEAF_MIN_DEPTH - 1 && rng() < PARAMS.twigProb) {
          const t = 0.5 + rng() * 0.4;
          leaves.push(makeLeaf(
            start[0] + dir[0] * length * t,
            start[1] + dir[1] * length * t,
            start[2] + dir[2] * length * t,
            rng
          ));
        }
      }
    }
    grow(origin, [0, 0, 1],
      TREE_INITIAL_LENGTH * sizeFactor,
      TREE_INITIAL_WIDTH  * sizeFactor,
      0);
    return { branches, leaves };
  }

  /* ──────────────────────── BRUSHES ───────────────────────────────────── */
  function makeShadowBrush(radius, rgb, profile, alphaMult = 1) {
    const size = Math.max(2, Math.round(radius * 2));
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const cx = c.getContext('2d');
    const g = cx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    for (const [pos, alpha] of profile) {
      g.addColorStop(pos, rgbStr(rgb, Math.min(1, alpha * alphaMult)));
    }
    cx.fillStyle = g;
    cx.fillRect(0, 0, size, size);
    return c;
  }

  /* Leaf profile: high center alpha, soft outer rim. The high center is
     the physically correct shape — a real leaf fully blocks the sun in
     its umbra; the soft edge is the sun's angular size (penumbra), not
     leaf translucency. Multiplied by PARAMS.leafAlphaMult — set low (0.30)
     in this dial-set to give a smoky/dappled look. Push toward 0.85+ if
     you want the binary-flicker aesthetic instead, but expect the canopy
     to also need fewer leaves and the ray system to be retuned. */
  const LEAF_PROFILE = [
    [0.00, 0.95],
    [0.40, 0.88],
    [0.70, 0.55],
    [0.90, 0.15],
    [1.00, 0.00],
  ];
  const BRANCH_PROFILE = [
    [0.00, 0.55],
    [0.20, 0.42],
    [0.45, 0.22],
    [0.75, 0.06],
    [1.00, 0.00],
  ];

  /* Ray profile: bright core + slightly extended soft halo. The halo
     mimics the glow real sunbeams pick up from air dust/moisture and
     helps the ray read as a shaft of light rather than a paint dot.
     When occluded by overlapping leaves both core and halo dim together,
     so the on/off transition reads as one coherent beam being
     interrupted. */
  const RAY_PROFILE = [
    [0.00, 0.92],
    [0.18, 0.82],
    [0.42, 0.45],
    [0.72, 0.14],
    [0.92, 0.03],
    [1.00, 0.00],
  ];

  function makeDustedBase(w, h, baseRgb, contrastAmp) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    cx.fillStyle = rgbStr3(baseRgb);
    cx.fillRect(0, 0, w, h);
    const img = cx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * contrastAmp;
      d[i]     = Math.max(0, Math.min(255, d[i]     + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    cx.putImageData(img, 0, 0);
    return c;
  }

  /* ──────────────────────── WIND (gusts + bulk) ─────────────────────────
     Two regimes superimposed. The "base" is a slow continuous breeze that
     gently nudges everything; the "gust" is a long-period ramp+decay
     event that briefly displaces the canopy by tens of pixels. Gusts are
     coherent across ALL leaves at every height — that is the "whole field
     surges to the right when a gust comes through" experience.

     José confirmed wind in particular: "the feeling of the wind movement
     and gusts, you got it perfectly." Be careful when changing these. */
  const WIND = {
    base: 0, baseY: 0, gust: 0,
    gustTarget: 0, gustPhase: 'idle',
    gustStartedAt: 0, gustDuration: 0,
    nextGustAt: 0,
  };
  const WIND_BASE_FREQ_X = 0.00045;
  const WIND_BASE_FREQ_Y = 0.00031;
  const WIND_BASE_AMP    = 4.5;
  const GUST_MIN_INTERVAL_BASE = 9000;
  const GUST_MAX_INTERVAL_BASE = 18000;
  const GUST_MIN_PEAK_BASE     = 22;
  const GUST_MAX_PEAK_BASE     = 55;
  const GUST_RAMP_MS  = 1800;
  const GUST_DECAY_MS = 3200;

  const easeInOut = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

  function scheduleNextGust(t) {
    const minI = GUST_MIN_INTERVAL_BASE / PARAMS.gustFreqMult;
    const maxI = GUST_MAX_INTERVAL_BASE / PARAMS.gustFreqMult;
    WIND.nextGustAt = t + minI + Math.random() * (maxI - minI);
  }

  function updateWind(t) {
    WIND.base  = Math.sin(t * WIND_BASE_FREQ_X) * WIND_BASE_AMP * PARAMS.bulkWindMult;
    WIND.baseY = Math.sin(t * WIND_BASE_FREQ_Y + 1.7) * WIND_BASE_AMP * 0.5 * PARAMS.bulkWindMult;
    if (WIND.gustPhase === 'idle' && t >= WIND.nextGustAt) {
      WIND.gustPhase = 'ramp';
      WIND.gustStartedAt = t;
      WIND.gustTarget = (GUST_MIN_PEAK_BASE + Math.random() * (GUST_MAX_PEAK_BASE - GUST_MIN_PEAK_BASE)) * PARAMS.gustStrengthMult;
      WIND.gustDuration = GUST_RAMP_MS * (0.85 + Math.random() * 0.3);
    }
    if (WIND.gustPhase === 'ramp') {
      const tt = Math.min(1, (t - WIND.gustStartedAt) / WIND.gustDuration);
      WIND.gust = easeInOut(tt) * WIND.gustTarget;
      if (tt >= 1) {
        WIND.gustPhase = 'decay';
        WIND.gustStartedAt = t;
        WIND.gustDuration = GUST_DECAY_MS * (0.85 + Math.random() * 0.3);
      }
    } else if (WIND.gustPhase === 'decay') {
      const tt = Math.min(1, (t - WIND.gustStartedAt) / WIND.gustDuration);
      const env = 1 - easeInOut(tt);
      const wobble = Math.sin(tt * Math.PI * 2) * 0.08 * (1 - tt);
      WIND.gust = WIND.gustTarget * (env + wobble);
      if (tt >= 1) {
        WIND.gust = 0;
        WIND.gustPhase = 'idle';
        scheduleNextGust(t);
      }
    }
  }

  /* ──────────────────────── SCENE ───────────────────────────────────────
     Fresh seed on every page load, so the pattern is different each visit.
     (José: "i need the pattern to be random each time the site starts.") */
  let seed = (Math.random() * 0x7FFFFFFF) >>> 0;
  const VIEWPORT_OVERSIZE = 1.5;

  let scene = null;

  function buildScene(W, H) {
    const rng = makeRng(seed);
    const worldW = W * VIEWPORT_OVERSIZE;
    const worldH = H * VIEWPORT_OVERSIZE;

    const leavesPerTree = 110;
    const treeCount = Math.max(2, Math.round(
      PARAMS.targetLeaves / leavesPerTree * PARAMS.treeCountMult
    ));

    const allBranches = [];
    const allLeaves = [];
    for (let i = 0; i < treeCount; i++) {
      const ox = (rng() - 0.5) * worldW;
      const oy = (rng() - 0.5) * worldH;
      const sizeFactor = PARAMS.treeSizeMin + rng() * (PARAMS.treeSizeMax - PARAMS.treeSizeMin);
      const tree = growTree([ox, oy, 0], rng, sizeFactor);
      for (const b of tree.branches) allBranches.push(b);
      for (const l of tree.leaves)   allLeaves.push(l);
    }

    let maxZ = 1;
    for (const l of allLeaves) if (l.pos[2] > maxZ) maxZ = l.pos[2];
    for (const b of allBranches) if (b.end[2] > maxZ) maxZ = b.end[2];

    buildLayers(maxZ, rng);
    for (const l of allLeaves) l.layer = assignLayer(l.pos[2]);

    // Sort by z so upper-layer shadows draw on top.
    allLeaves.sort((a, b) => a.pos[2] - b.pos[2]);

    /* Light rays: fixed positions in the oversized world (they don't
       move; only the canopy moves). Density scales with viewport area
       so the visual feels consistent at any screen size. */
    const lightRays = [];
    const baseRayCount = Math.round((W * H) / 1100);
    const rayCount = Math.max(10, Math.round(baseRayCount * PARAMS.rayDensity));
    for (let i = 0; i < rayCount; i++) {
      lightRays.push({
        x: (rng() - 0.5) * worldW,
        y: (rng() - 0.5) * worldH,
        sizeJitter:   0.6  + rng() * 0.6,
        brightJitter: 0.65 + rng() * 0.45,
      });
    }

    scene = {
      allBranches, allLeaves, lightRays,
      originX: W / 2, originY: H / 2,
      maxZ,
    };
  }

  /* ──────────────────────── RENDER ──────────────────────────────────── */
  const canvas = document.getElementById('canopy');
  if (!canvas) return;  // page doesn't have a canopy canvas; do nothing
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  let dustedBase = null;
  let leafBrush = null, branchBrush = null, rayBrush = null;

  function regenerateBrushes() {
    const leafRadius   = Math.max(14, Math.min(W, H) * 0.022) * PARAMS.leafSizeMult;
    const branchRadius = Math.max(22, Math.min(W, H) * 0.04);
    // Rays are smaller bright spots, not big pools. raySizeMult scales the
    // overall ray, rayHaloMult extends the soft outer halo for that beam-glow.
    const rayRadius = Math.max(7, Math.min(W, H) * 0.011) * PARAMS.raySizeMult * PARAMS.rayHaloMult;
    leafBrush   = makeShadowBrush(leafRadius,   RGB.deepShadow, LEAF_PROFILE,   PARAMS.leafAlphaMult);
    branchBrush = makeShadowBrush(branchRadius, RGB.deepShadow, BRANCH_PROFILE, PARAMS.branchAlphaMult);
    rayBrush    = makeShadowBrush(rayRadius,    RGB.sunImage,   RAY_PROFILE,    PARAMS.rayBrightnessMult);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildScene(W, H);
    dustedBase = makeDustedBase(W, H, RGB.sunlitPool, 5.0);
    regenerateBrushes();
  }

  function project(x, y, z, originX, originY) {
    return [
      x + z * SUN_PROJ_X + originX,
      y + z * SUN_PROJ_Y + originY,
    ];
  }

  /* Light rays drawn BEFORE leaves. Static on the ground; leaves drift
     over them. Where a leaf currently covers a ray, that ray is dim;
     when the canopy parts, the ray re-appears. Additive blending so
     bright spots actually rise ABOVE the surrounding sunlit ground
     brightness, matching the perceptual brightness of a real pinhole
     sun image vs. ambient ground in shade.

     KNOWN LIMITATION (see top-of-file iteration note): with the
     current dial-set this reads more as "soft glows that translate"
     than "rays winking in and out." The mechanism is correct but the
     visual still needs work. */
  function drawLightRays(lightRays, originX, originY) {
    const prevOp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    const r0 = rayBrush.width * 0.5;
    for (let i = 0; i < lightRays.length; i++) {
      const ray = lightRays[i];
      const x = ray.x + originX;
      const y = ray.y + originY;
      const r = r0 * ray.sizeJitter;
      ctx.globalAlpha = ray.brightJitter;
      ctx.drawImage(rayBrush, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = prevOp;
  }

  function drawLeafShadow(leaf, originX, originY, maxZ, t) {
    const z = leaf.pos[2];
    const heightFactor = z / maxZ;
    // Bulk wind: height-scaled, coherent across ALL leaves.
    const bulkX = (WIND.base + WIND.gust) * heightFactor;
    const bulkY = WIND.baseY * heightFactor;
    // Layer drift: coherent within layer, independent between layers.
    const [layX, layY] = layerOffset(leaf.layer, t);
    const wx = leaf.pos[0] + bulkX + layX;
    const wy = leaf.pos[1] + bulkY + layY;
    const [sx, sy] = project(wx, wy, z, originX, originY);
    const sizeScale = 0.85 + heightFactor * 0.35;
    const r = leafBrush.width * 0.5 * sizeScale;
    ctx.drawImage(leafBrush, sx - r, sy - r, r * 2, r * 2);
  }

  function drawBranchShadow(branch, originX, originY, maxZ) {
    const sz = branch.start[2], ez = branch.end[2];
    if (sz <= 0.5 && ez <= 0.5) return;
    const hsf = sz / maxZ, hef = ez / maxZ;
    const sx = branch.start[0] + (WIND.base + WIND.gust) * hsf;
    const sy = branch.start[1] + WIND.baseY * hsf;
    const ex = branch.end[0]   + (WIND.base + WIND.gust) * hef;
    const ey = branch.end[1]   + WIND.baseY * hef;
    const [psx, psy] = project(sx, sy, sz, originX, originY);
    const [pex, pey] = project(ex, ey, ez, originX, originY);
    const avgHF = (hsf + hef) * 0.5;
    const widthScale  = 0.6 + branch.width * 0.18;
    const heightScale = 0.85 + avgHF * 0.35;
    const r = branchBrush.width * 0.5 * widthScale * heightScale;
    const dx = pex - psx, dy = pey - psy;
    const len = Math.hypot(dx, dy);
    const step = Math.max(r * 0.25, 4);
    const n = Math.max(1, Math.floor(len / step));
    for (let i = 0; i <= n; i++) {
      const tt = i / n;
      const x = psx + dx * tt;
      const y = psy + dy * tt;
      ctx.drawImage(branchBrush, x - r, y - r, r * 2, r * 2);
    }
  }

  function renderFrame(t) {
    updateWind(t);
    ctx.drawImage(dustedBase, 0, 0);
    const { originX, originY, allBranches, allLeaves, lightRays, maxZ } = scene;

    // 1. Rays — bright spots on the sunlit base, before any canopy occludes.
    if (PARAMS.rayBrightnessMult > 0 && lightRays && lightRays.length) {
      drawLightRays(lightRays, originX, originY);
    }
    // 2. Branches — under leaves, faint structural shadow.
    if (PARAMS.branchAlphaMult > 0) {
      for (let i = 0; i < allBranches.length; i++) {
        drawBranchShadow(allBranches[i], originX, originY, maxZ);
      }
    }
    // 3. Leaves — the canopy. They occlude rays where they currently cover.
    for (let i = 0; i < allLeaves.length; i++) {
      drawLeafShadow(allLeaves[i], originX, originY, maxZ, t);
    }
  }

  /* ──────────────────────── LOOP & LIFECYCLE ────────────────────────── */
  let rafId = null;
  let running = false;
  let startT = null;
  function loop(t) {
    if (startT === null) startT = t;
    renderFrame(t - startT);
    rafId = requestAnimationFrame(loop);
  }
  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stop();
    else start();
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      scheduleNextGust(performance.now() - (startT || 0));
    }, 150);
  });

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  reduceMotion.addEventListener('change', () => {
    stop();
    if (reduceMotion.matches) renderFrame(performance.now() - (startT || 0));
    else { startT = null; start(); }
  });

  /* ──────────────────────── INIT ────────────────────────────────────── */
  resize();
  scheduleNextGust(0);
  if (reduceMotion.matches) renderFrame(0);
  else start();
})();

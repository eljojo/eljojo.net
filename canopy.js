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

   Motion has TWO timescales, and the visible flicker is their sum:

     SLOW (sub-Hz): the 3D LAYER system. Every leaf is assigned at
     scene-build time to one of N discrete height-layers. At render
     time each layer translates as a coherent slab — every leaf in
     layer k gets the SAME offset at time t. Different layers have
     different drift functions (two-octave sinusoids, randomized per
     layer). The interference between projected layers sliding past
     each other on the ground plane IS the moiré. Random per-leaf
     position jitter would give noise; coherent layers give real
     interference. ("it's almost as if i had two paper grids ... move
     opposite directions.") Bulk wind on top shifts EVERY leaf and
     branch coherently — gusts surge the whole canopy.

     FAST (~3–8 Hz): per-leaf SCINTILLATION, GATED BY WIND. Each leaf
     has its own phase + frequency. At each render step the leaf's
     shadow alpha AND its contribution to the density field are dimmed
     by the same factor — the leaf is mostly "broad-face on" (full
     shadow), and briefly goes "edge-on" (much less shadow). The DEPTH
     of the dip is scaled by WIND.activity (derived from base + gust
     magnitude), so:
       zero wind        → activity 0 → static canopy, no flicker
       subtle breeze    → low activity → shallow flicker
       gust             → activity 1 → full-depth flicker + bulk shift
     Without this gating the canopy flickered constantly; with it the
     flicker breathes with the wind, which is what real canopy light
     does. PARAMS.scintWindPower shapes the response curve.

   Light comes through the canopy via TWO complementary mechanisms:

     GAP-SHAPED REVEAL (the dominant "shaped light"): an additive
     warm-light pass over the canvas masked by the INVERSE of the
     density field, upscaled with smoothing. Bright patches naturally
     inherit the SHAPE of the gap between leaves — irregular, soft,
     sometimes large, sometimes small — rather than being round dots.
     This matches a real spring canopy where gaps are bigger than a
     true pinhole and what you see on the ground is the shape of the
     gap, not the shape of the sun.

     PINHOLE RAYS (the brightest "specular" highlights): fixed-
     position bright spots drawn LAST, each STRETCHED along the
     projected sun vector with per-ray aspect, rotation jitter, and
     slow angle wobble — so they read as beams of light, not dots.
     Each ray's alpha is modulated by (1 − density)^p sampled from
     the density field at its position, so a ray only lights up when
     a real gap is overhead. As layer drift + scintillation make the
     gap pattern shift, rays wink in and out IN PLACE.

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
   │  HISTORY: WHAT JOSÉ ASKED FOR AND WHAT GOT BUILT                     │
   └──────────────────────────────────────────────────────────────────────┘

   Earlier feedback that drove this version of the file:

     "in the answer above you articulated what i said correctly, but
      the rendered still doesn't quite reflect the effect of lights of
      ray coming through, it looks like dots moving to the side."

     "i'm wondering how to recreate that pinhole like effect ... the
      ground was lit by the light that was pinning thru the leaves in
      the tree above me, imagine the flickering that would happen if
      you put many sheets of paper with holes in them next to a light,
      that's what it felt like in real life, a flickering"

   What got built in response:

     1. DENSITY FIELD: per-frame canopy coverage map computed by
        stamping every leaf's current projected position into a small
        offscreen buffer with identical wind + layer + scintillation
        math. Used by BOTH the gap-shaped reveal and the pinhole rays.

     2. GAP-SHAPED REVEAL: drawGapReveal paints (1 − density)^p as
        additive warm light at the density buffer's resolution, then
        drawImage-upscales it with smoothing. Bright patches naturally
        inherit the SHAPE of the gap — the photo's "soft irregular
        bright patches", not round dots. Tunable: PARAMS.gapRevealMult
        (peak brightness), PARAMS.gapRevealPower (sharpness).

     3. DIRECTIONAL PINHOLE RAYS: each ray is rendered with ctx.rotate
        to the projected sun vector + per-ray angleJitter + slow
        wobble, and drawn with anisotropic scale (aspect 1.0–
        PARAMS.rayAspectMax). Streaks, not dots.

     4. PER-LEAF SCINTILLATION: each leaf has its own phase + freq
        (3–8 Hz by default). Each render step, both the leaf shadow
        and its density stamp are dimmed by 1 − scintAmp·max(0,sin)^2,
        so individual leaves briefly "go edge-on" and open micro-gaps.
        This is the FAST flicker timescale; the slow layer drift is
        the SLOW one. Together they give the two-timescale "blinking"
        feel of real canopy light.

   Knobs to reach for if it doesn't feel right at first paint:

     - Reveal feels too uniform / not "shaped" enough:
       raise PARAMS.gapRevealPower (sharper threshold) or drop
       PARAMS.leafDensity (more real gaps to reveal).

     - Flicker feels too slow / too still:
       raise PARAMS.scintAmp and/or PARAMS.scintFreqMax.

     - Rays look like dots, not beams:
       raise PARAMS.rayAspectMax.

     - Lower-level density-system tunables: DENSITY_DOWNSCALE
       (resolution of the gap detection), RAY_REVEAL_POWER (binary-ness
       of pinhole ray on/off), DENSITY_DOT_PROFILE (per-leaf
       sensitivity in the coverage field).

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

    // per-leaf fast scintillation — each leaf has a phase+freq and dims
    // briefly as if pivoting edge-on to the sun in the breeze. This is
    // the FAST flicker timescale (Hz), distinct from the slow layer
    // drift (sub-Hz). scintAmp is the MAX depth of the dip (0 = no
    // flicker, 1 = leaf fully vanishes briefly). The actual dip each
    // frame is scaled by WIND_ACTIVITY (a per-frame value in [0, 1]
    // derived from base wind + gust magnitude): zero wind ⇒ no flicker
    // (static canopy), subtle breeze ⇒ shallow flicker, gust ⇒ full
    // depth. scintWindPower shapes that curve — higher = more contrast
    // between "calm breeze" and "gust" flicker. Scintillation is
    // applied to BOTH the visible shadow AND the density-field stamp
    // so gaps actually open at fast timescales.
    scintAmp:         0.55,
    scintFreqMin:     2.5,     // Hz — slowest leaves
    scintFreqMax:     8.0,     // Hz — fastest leaves
    scintWindPower:   1.5,     // >1 = subtle wind stays calm, gust really pops

    // gap-shaped reveal — additive warm light layer driven by the
    // inverse of the per-frame density field, upscaled with smoothing.
    // Bright patches naturally inherit the SHAPE of the gap (irregular,
    // soft) rather than being round dots. This is the dominant "shaped
    // light" mechanism that matches a real canopy where the gaps are
    // bigger than a true pinhole — what you see on the ground is the
    // shape of the gap, not the shape of the sun.
    gapRevealMult:    0.65,    // peak additive brightness of the reveal
    gapRevealPower:   1.6,     // sharpness of the reveal curve

    // light rays — bright pinhole-disk highlights, drawn LAST on top of
    // the gap reveal. Stretched along the sun vector so they read as
    // beams of light, not dots. raySizeMult * rayHaloMult gives overall
    // size; rayAspectMax is the max stretch along the sun vector
    // (1.0 = round; 2.0 = up to 2x stretched).
    rayDensity:       2.35,
    rayBrightnessMult: 0.05,   // low core brightness; relies on size+halo for the glow
    raySizeMult:      2.70,
    rayHaloMult:      1.90,
    rayAspectMax:     2.0,     // 1.0 = round; >1 stretches along sun vector
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
      // Per-leaf fast scintillation: phase + frequency. At render time
      // both the visible shadow alpha and the density-field contribution
      // are multiplied by 1 - scintAmp * max(0, sin(...))^2 — the
      // squared-positive-lobe sharpens the dip so each leaf spends most
      // of its cycle "broad-face on" (full shadow) and only briefly
      // goes "edge-on" (much less shadow). The dips of thousands of
      // leaves at different phases sum to the fast canopy-wide twinkle.
      scintPhase: rng() * Math.PI * 2,
      scintFreq:  PARAMS.scintFreqMin + rng() * (PARAMS.scintFreqMax - PARAMS.scintFreqMin),
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
 */
  const WIND = {
    base: 0, baseY: 0, gust: 0,
    gustTarget: 0, gustPhase: 'idle',
    gustStartedAt: 0, gustDuration: 0,
    nextGustAt: 0,
    activity: 0,  // [0, 1], per-frame "how breezy is it right now"; scales scintillation depth
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

    /* WIND.activity — drives leaf scintillation depth. Normalize the
       current base and gust magnitudes to [0, 1] against their max
       amplitudes, combine, and shape with scintWindPower. At true zero
       wind (base ~ 0 and no gust) activity is 0 and leaves are
       perfectly still; at gust peak it's 1.0 and scintillation runs at
       full PARAMS.scintAmp depth. */
    const baseAmpMax  = WIND_BASE_AMP   * PARAMS.bulkWindMult;
    const gustPeakMax = GUST_MAX_PEAK_BASE * PARAMS.gustStrengthMult;
    const baseSpeed = Math.abs(WIND.base) / Math.max(1e-6, baseAmpMax);
    const gustSpeed = Math.abs(WIND.gust) / Math.max(1e-6, gustPeakMax);
    const raw = Math.min(1, Math.hypot(baseSpeed, gustSpeed));
    WIND.activity = Math.pow(raw, PARAMS.scintWindPower);
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
        // Directional character: each ray is stretched along the sun
        // vector by a per-ray aspect ratio, then rotated by a small
        // per-ray jitter so the field of rays isn't perfectly aligned.
        // wobblePhase drives a slow per-ray angle wobble at render time
        // so the streaks aren't perfectly static between gusts.
        aspect:       1.0 + rng() * (PARAMS.rayAspectMax - 1.0),
        angleJitter:  (rng() - 0.5) * Math.PI * 0.18,  // ±16°
        wobblePhase:  rng() * Math.PI * 2,
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
  let leafBrush = null, branchBrush = null, rayBrush = null, densityBrush = null;

  /* ──────────────────────── DENSITY FIELD ────────────────────────────
     Per-frame canopy coverage map at downscaled resolution. Each frame
     we stamp every leaf's CURRENT projected position into a small
     offscreen buffer (with the same wind + layer math as the main
     leaf draw), then read back the pixel data. The drawLightRays
     function samples this buffer at each ray's position and multiplies
     the ray's alpha by (1 - density)^RAY_REVEAL_POWER — so a ray
     brightens in a real gap and vanishes where canopy is dense. As
     layers drift, the gap pattern at each spot changes, and rays
     wink in place. That is the mechanism that turns rays from "static
     spots translating under drifting leaves" (the old approach) into
     "rays of light flickering in and out as the leaves move" (the
     experience José described).

     DENSITY_DOWNSCALE = 4 means the density buffer is W/4 × H/4. On
     a 1920×1080 viewport that's 480×270 ≈ 130K pixels (~520 KB read
     back per frame via getImageData). Lower the number for crisper
     gap detection, raise it for cheaper builds.

     RAY_REVEAL_POWER controls the shape of the (1 - density)^p curve:
     1.0 = linear (soft fade); 2.0+ = sharper, so only real gaps light
     up and partial coverage stays dim. Higher = more "flicker." */
  const DENSITY_DOWNSCALE = 4;
  const RAY_REVEAL_POWER = 2.2;
  /* Density dot: soft small white falloff stamped at each leaf's
     projected position. Peak alpha is low so 4–5 overlapping leaves
     saturate to "fully covered" — i.e. takes a small clump to fully
     occlude a ray, not just one. Tune the peak if rays feel too
     stubborn (raise it) or too eager (lower it). */
  const DENSITY_DOT_PROFILE = [
    [0.00, 0.25],
    [0.40, 0.20],
    [0.80, 0.07],
    [1.00, 0.00],
  ];
  const DENSITY_WHITE = [255, 255, 255];
  let densityCanvas = null;
  let densityCtx = null;
  let densityData = null;
  let densityW = 0, densityH = 0;

  /* Gap-shaped reveal: a same-resolution-as-density offscreen buffer
     that we paint each frame from (1 - density)^p, in the sunImage
     color, then drawImage upscaled with smoothing onto the main canvas
     using 'lighter'. Because we paint at downscaled resolution and let
     the browser bilinearly upscale, the bright "patches" are naturally
     soft and gap-shaped — not round dots. This is the dominant "shaped
     light" mechanism that matches a real canopy where gaps are larger
     than a true pinhole, so what you see on the ground is the shape of
     the gap, not the shape of the sun. */
  let revealCanvas = null;
  let revealCtx = null;
  let revealImageData = null;

  function setupDensity() {
    densityW = Math.max(2, Math.ceil(W / DENSITY_DOWNSCALE));
    densityH = Math.max(2, Math.ceil(H / DENSITY_DOWNSCALE));
    if (!densityCanvas) {
      densityCanvas = document.createElement('canvas');
      densityCtx = densityCanvas.getContext('2d', { willReadFrequently: true });
    }
    densityCanvas.width = densityW;
    densityCanvas.height = densityH;
    densityData = null;

    if (!revealCanvas) {
      revealCanvas = document.createElement('canvas');
      revealCtx = revealCanvas.getContext('2d');
    }
    revealCanvas.width = densityW;
    revealCanvas.height = densityH;
    revealImageData = revealCtx.createImageData(densityW, densityH);
  }

  function regenerateBrushes() {
    const leafRadius   = Math.max(14, Math.min(W, H) * 0.022) * PARAMS.leafSizeMult;
    const branchRadius = Math.max(22, Math.min(W, H) * 0.04);
    // Rays are smaller bright spots, not big pools. raySizeMult scales the
    // overall ray, rayHaloMult extends the soft outer halo for that beam-glow.
    const rayRadius = Math.max(7, Math.min(W, H) * 0.011) * PARAMS.raySizeMult * PARAMS.rayHaloMult;
    leafBrush   = makeShadowBrush(leafRadius,   RGB.deepShadow, LEAF_PROFILE,   PARAMS.leafAlphaMult);
    branchBrush = makeShadowBrush(branchRadius, RGB.deepShadow, BRANCH_PROFILE, PARAMS.branchAlphaMult);
    rayBrush    = makeShadowBrush(rayRadius,    RGB.sunImage,   RAY_PROFILE,    PARAMS.rayBrightnessMult);
    // Density brush — sized so each leaf stamps a soft dot in the
    // density buffer at roughly the same effective radius the leaf
    // shadow covers in the main render. 0.75 of leafRadius captures
    // the umbra-ish core; the rim of the leaf's shadow is too faint
    // to "count" as occluding a sun-ray.
    const densityRadius = Math.max(2, (leafRadius / DENSITY_DOWNSCALE) * 0.75);
    densityBrush = makeShadowBrush(densityRadius, DENSITY_WHITE, DENSITY_DOT_PROFILE, 1);
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
    setupDensity();
    regenerateBrushes();
  }

  function project(x, y, z, originX, originY) {
    return [
      x + z * SUN_PROJ_X + originX,
      y + z * SUN_PROJ_Y + originY,
    ];
  }

  /* Per-leaf scintillation factor in [1 - scintAmp, 1]. Sin gives
     [-1, 1]; we keep only the positive lobe and square it, so each
     leaf is "broad-face on" (factor near 1, full shadow) most of the
     time and briefly "edge-on" (factor down, much less shadow). t is
     ms; scintFreq is Hz. The dip is scaled by WIND.activity so a
     dead-calm moment is truly static, a subtle breeze gives shallow
     flicker, and a gust runs flicker at full PARAMS.scintAmp depth. */
  function leafScint(leaf, t) {
    const activity = WIND.activity;
    if (activity <= 0) return 1;
    const s = Math.sin(t * 0.001 * leaf.scintFreq * 2 * Math.PI + leaf.scintPhase);
    const dim = s > 0 ? s * s : 0;
    return 1 - PARAMS.scintAmp * activity * dim;
  }

  /* Stamp every leaf's CURRENT projected position into the density
     buffer. Uses identical wind + layer + projection math to
     drawLeafShadow so the density field is in lockstep with what the
     main canvas leaves will paint at this same t. After all leaves
     are stamped we read the pixel data back as a Uint8ClampedArray;
     drawLightRays then samples it per ray. */
  function buildDensityField(allLeaves, originX, originY, maxZ, t) {
    const dctx = densityCtx;
    dctx.globalCompositeOperation = 'source-over';
    dctx.fillStyle = 'black';
    dctx.fillRect(0, 0, densityW, densityH);
    dctx.globalCompositeOperation = 'lighter';

    const ds = 1 / DENSITY_DOWNSCALE;
    const halfSize = densityBrush.width * 0.5;
    const dW = densityW, dH = densityH;

    for (let i = 0; i < allLeaves.length; i++) {
      const leaf = allLeaves[i];
      const z = leaf.pos[2];
      const heightFactor = z / maxZ;
      const bulkX = (WIND.base + WIND.gust) * heightFactor;
      const bulkY = WIND.baseY * heightFactor;
      const [layX, layY] = layerOffset(leaf.layer, t);
      const wx = leaf.pos[0] + bulkX + layX;
      const wy = leaf.pos[1] + bulkY + layY;
      const [sx, sy] = project(wx, wy, z, originX, originY);
      const dx = sx * ds;
      const dy = sy * ds;
      if (dx < -halfSize || dx > dW + halfSize ||
          dy < -halfSize || dy > dH + halfSize) continue;
      // Scintillation must apply HERE too (in lockstep with the visible
      // leaf draw) so the density field actually opens up at fast
      // timescales. Without this the field is static between drifts and
      // neither the gap reveal nor the rays will blink.
      dctx.globalAlpha = leafScint(leaf, t);
      dctx.drawImage(densityBrush, dx - halfSize, dy - halfSize);
    }
    dctx.globalAlpha = 1;

    densityData = dctx.getImageData(0, 0, dW, dH).data;
  }

  /* Paint the gap-shaped reveal: walk the density buffer, write
     (1 - density)^gapRevealPower as alpha in the sunImage color into
     revealImageData, putImageData, then draw it upscaled with smoothing
     using 'lighter'. The browser's bilinear upscale gives soft edges
     for free, so the bright "patches" inherit the shape of the gap
     between leaves rather than being round dots. */
  function drawGapReveal() {
    if (!densityData || !revealImageData) return;
    const src = densityData;
    const out = revealImageData.data;
    const r = RGB.sunImage[0];
    const g = RGB.sunImage[1];
    const b = RGB.sunImage[2];
    const power = PARAMS.gapRevealPower;
    const maxA = PARAMS.gapRevealMult * 255;
    const N = out.length;
    for (let i = 0; i < N; i += 4) {
      const d = src[i] * (1 / 255);
      const gap = 1 - d;
      const reveal = gap <= 0 ? 0 : Math.pow(gap, power);
      out[i]     = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = (reveal * maxA) | 0;
    }
    revealCtx.putImageData(revealImageData, 0, 0);
    const prevOp = ctx.globalCompositeOperation;
    const prevSmoothing = ctx.imageSmoothingEnabled;
    const prevQuality = ctx.imageSmoothingQuality;
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(revealCanvas, 0, 0, W, H);
    ctx.globalCompositeOperation = prevOp;
    ctx.imageSmoothingEnabled = prevSmoothing;
    ctx.imageSmoothingQuality = prevQuality;
  }

  /* Light rays drawn LAST, on top of the canopy. Each ray's alpha is
     modulated by (1 - density)^RAY_REVEAL_POWER sampled from the
     density field at its position: bright where the canopy is sparse
     (a real gap is overhead), invisible where it's dense. As layer
     drift makes gaps open and close at each spot, every ray winks
     on and off IN PLACE — the literal "rays of light flicker in and
     out as the leaves move." Additive ('lighter') blending so the
     bright spots actually rise above the sunlit base, matching the
     perceptual brightness of a real pinhole sun-image vs. ambient
     ground in shade. */
  function drawLightRays(lightRays, originX, originY, t) {
    if (!densityData) return;
    const prevOp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    const r0 = rayBrush.width * 0.5;
    const ds = 1 / DENSITY_DOWNSCALE;
    const dW = densityW, dH = densityH;
    const inv255 = 1 / 255;
    // Base angle = the projected sun vector on the ground plane. Rays
    // stretch along this axis so they read as beams of light, not dots.
    const sunAngle = Math.atan2(SUN_PROJ_Y, SUN_PROJ_X);
    const ts = t * 0.0008;  // slow per-ray wobble timescale

    for (let i = 0; i < lightRays.length; i++) {
      const ray = lightRays[i];
      const x = ray.x + originX;
      const y = ray.y + originY;

      // Nearest-neighbor density sample — the soft density brush
      // already gives smooth falloff between samples, so we don't
      // need bilinear here.
      const dx = Math.floor(x * ds);
      const dy = Math.floor(y * ds);
      if (dx < 0 || dx >= dW || dy < 0 || dy >= dH) continue;
      const density = densityData[(dy * dW + dx) * 4] * inv255;

      const gapness = 1 - density;
      if (gapness <= 0) continue;
      const reveal = Math.pow(gapness, RAY_REVEAL_POWER);
      if (reveal < 0.01) continue;

      const r = r0 * ray.sizeJitter;
      const wobble = Math.sin(ts + ray.wobblePhase) * 0.12;
      const angle = sunAngle + ray.angleJitter + wobble;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = ray.brightJitter * reveal;
      // Stretch the round brush anisotropically along the rotated x
      // axis (= sun-vector direction): width = 2r * aspect, height = 2r.
      const w = r * ray.aspect;
      ctx.drawImage(rayBrush, -w, -r, w * 2, r * 2);
      ctx.restore();
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
    // Scintillation dims the leaf briefly as it goes edge-on. Caller
    // resets globalAlpha after the loop.
    ctx.globalAlpha = leafScint(leaf, t);
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

    const drawRays = PARAMS.rayBrightnessMult > 0 && lightRays && lightRays.length;
    const drawReveal = PARAMS.gapRevealMult > 0;
    const needDensity = drawRays || drawReveal;

    // 1. Build the density field (offscreen). Same wind + layer +
    //    scintillation math as the leaf draw below, so the field is in
    //    lockstep with the positions and visibilities where leaves are
    //    about to paint at this t.
    if (needDensity) {
      buildDensityField(allLeaves, originX, originY, maxZ, t);
    }

    // 2. Branches — faint structural shadow, under leaves.
    if (PARAMS.branchAlphaMult > 0) {
      for (let i = 0; i < allBranches.length; i++) {
        drawBranchShadow(allBranches[i], originX, originY, maxZ);
      }
    }

    // 3. Leaves — the canopy. Casts the dappled shadow over the base.
    //    drawLeafShadow sets globalAlpha per leaf for scintillation; we
    //    reset it once at the end of the loop.
    for (let i = 0; i < allLeaves.length; i++) {
      drawLeafShadow(allLeaves[i], originX, originY, maxZ, t);
    }
    ctx.globalAlpha = 1;

    // 4. Gap-shaped reveal — the dominant "shaped light" pass. Bright
    //    additive warm light layer wherever the density field reads
    //    "gap", upscaled with smoothing so the patches have natural
    //    soft, irregular edges (matching the photo's gap-shaped light
    //    rather than round-dot light).
    if (drawReveal) {
      drawGapReveal();
    }

    // 5. Pinhole rays — drawn LAST, on top of everything. Modulated by
    //    the density field AND stretched along the sun vector so they
    //    read as beams of light, not dots. As layers drift and leaves
    //    scintillate, the gap pattern at each spot changes, and rays
    //    wink in and out IN PLACE.
    if (drawRays) {
      drawLightRays(lightRays, originX, originY, t);
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

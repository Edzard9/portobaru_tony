/**
 * astronaut3d.js — WebGL hero: 3D astronaut + volumetric starfield
 *
 * Stack: Three.js (vendored, r186) · GSAP + ScrollTrigger (scroll choreography)
 *
 * Layering (see index.html / style.css):
 *   <canvas id="hero3d">   fixed, z-index 0   — the whole WebGL scene
 *   <section id="hero">    sticky,  z-index 0   — text content, paints above canvas
 *   <main id="content">    relative, z-index 1   — opaque, glides over the hero
 *
 * Scene graph:
 *   scene
 *     └─ pivot      (layout base: position/scale per viewport)
 *         └─ choreo (GSAP scroll-driven offsets)
 *             └─ model   (ambient float, sway, pointer parallax)
 *     └─ stars      (Points, slow drift)
 *
 * The model is the "Animated Floating Astronaut" (assets/3D/astronaut-hero.glb),
 * built from a Blender export by scripts/build-astronaut-glb.mjs.
 */

import * as THREE from '../../vendor/three/three.module.js';
import { GLTFLoader } from '../../vendor/three/GLTFLoader.js';
import { RoomEnvironment } from '../../vendor/three/RoomEnvironment.js';

(function initAstronaut3D() {
  const canvas = document.getElementById('hero3d');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth < 992;

  /* ──────────── Loader curtain ──────────── */
  const curtain = document.getElementById('webglLoader');
  const progress = document.getElementById('webglProgress');
  let curtainGone = false;

  const hideCurtain = () => {
    if (curtainGone || !curtain) return;
    curtainGone = true;
    curtain.classList.add('is-loaded');
    setTimeout(() => { curtain.style.display = 'none'; }, 700);
  };
  // Never block the page on a model forever.
  setTimeout(hideCurtain, 12000);

  /* ──────────── WebGL availability ──────────── */
  let gl;
  try {
    gl = canvas.getContext('webgl2', { antialias: !isMobile(), alpha: true, powerPreference: 'high-performance' })
      || canvas.getContext('webgl', { antialias: !isMobile(), alpha: true });
  } catch (e) { gl = null; }

  if (!gl) {
    document.body.classList.add('no-webgl');
    hideCurtain();
    return;
  }

  /* ──────────── Renderer / scene / camera ──────────── */
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: !isMobile(), alpha: true, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 220);
  camera.position.set(0, 0, 6.2);

  /* ──────────── Image-based lighting for the PBR suit ──────────── */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // Direct lights give the suit its readable shape against the dark backdrop.
  scene.add(new THREE.AmbientLight(0x3a4670, 0.7));
  const key = new THREE.DirectionalLight(0xdce6ff, 1.5);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x38e1ff, 1.3);   // brand cyan rim
  rim.position.set(-4, -1, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xb8a6ff, 0.5);  // violet bounce
  fill.position.set(-2, -3, 4);
  scene.add(fill);

  /* ──────────── Starfield (replaces the old 2D canvas) ──────────── */
  const STAR_COUNT = isMobile() ? 900 : 1900;
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const palette = [
    new THREE.Color(0xffffff), new THREE.Color(0xcfe0ff),
    new THREE.Color(0x9fd8ff), new THREE.Color(0xd9cfff),
  ];

  for (let i = 0; i < STAR_COUNT; i++) {
    // Spherical shell: stars sit at depth, so the camera dolly feels real.
    const r = 26 + Math.random() * 46;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const c = palette[Math.floor(Math.random() * palette.length)];
    const dim = 0.45 + Math.random() * 0.55;
    colors[i * 3]     = c.r * dim;
    colors[i * 3 + 1] = c.g * dim;
    colors[i * 3 + 2] = c.b * dim;
  }

  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3))
                              .setAttribute('color', new THREE.BufferAttribute(colors, 3)),
    new THREE.PointsMaterial({
      size: 0.42, sizeAttenuation: true, vertexColors: true,
      transparent: true, opacity: 0.9, depthWrite: false,
    }),
  );
  scene.add(stars);

  /* ──────────── Scene-graph groups ──────────── */
  const pivot = new THREE.Group();      // layout base
  const choreo = new THREE.Group();     // scroll choreography
  const model = new THREE.Group();      // ambient motion + pointer parallax
  pivot.add(choreo);
  choreo.add(model);
  scene.add(pivot);

  /* ──────────── Model load ──────────── */
  const loader = new GLTFLoader();
  let mixer = null;
  let floatAction = null;

  const onProgress = (e) => {
    if (e.lengthComputable && progress) {
      progress.style.width = Math.round((e.loaded / e.total) * 100) + '%';
    }
  };

  const placeModel = () => {
    // Desktop: astronaut hangs to the right of the hero copy.
    // Mobile: it drops below the centered text, smaller, so nothing collides.
    if (isMobile()) {
      pivot.position.set(0, -1.45, 0);
      pivot.scale.setScalar(0.5);
    } else {
      pivot.position.set(2.05, -0.6, 0);
      pivot.scale.setScalar(0.78);
    }
  };

  loader.load(
    'assets/3D/astronaut-hero.glb',
    (gltf) => {
      const root = gltf.scene;

      // Normalise: centre the bounding box, then fit into a target size.
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const FIT = 3.5;

      root.position.sub(center);
      root.scale.setScalar(FIT / maxDim);
      model.add(root);

      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(root);
        floatAction = mixer.clipAction(gltf.animations[0]);
        if (!reduceMotion) floatAction.play();
      }

      placeModel();
      renderer.render(scene, camera);
      hideCurtain();

      // Entrance: a slow rise into frame.
      if (!reduceMotion && window.gsap) {
        gsap.from(choreo.position, { y: -0.9, duration: 1.6, ease: 'power3.out' });
        gsap.from(choreo.rotation, { y: 0.5, duration: 1.8, ease: 'power3.out' });
      }
    },
    onProgress,
    (err) => {
      console.warn('astronaut3d: model failed to load', err);
      hideCurtain();   // hero text still works; we just lose the model
    },
  );

  /* ──────────── Ambient motion + pointer parallax ──────────── */
  const pointer = { x: 0, y: 0 };
  const parallax = { x: 0, y: 0 };

  if (!reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  const clock = new THREE.Clock();
  let inHero = true;   // skip rendering once the opaque content layer covers the hero

  const tick = () => {
    rafId = requestAnimationFrame(tick);
    if (!inHero) return;

    const t = performance.now();
    const dt = clock.getDelta();

    if (mixer) mixer.update(dt);

    if (!reduceMotion) {
      // Ambient float — the astronaut never stops hovering.
      model.position.y = Math.sin(t * 0.0011) * 0.07;
      model.rotation.z = Math.sin(t * 0.0007) * 0.05;

      // Pointer parallax, lerped so it never twitches.
      parallax.x += (pointer.x * 0.28 - parallax.x) * 0.05;
      parallax.y += (pointer.y * 0.16 - parallax.y) * 0.05;
      model.rotation.y = parallax.x;
      model.rotation.x = parallax.y;

      // The starfield rotates on a different axis than the camera dolly,
      // so the parallax between them sells the depth.
      stars.rotation.y = t * 0.000018;
      stars.rotation.x = Math.sin(t * 0.000011) * 0.12;
    }

    renderer.render(scene, camera);
  };

  /* ──────────── Scroll choreography (GSAP + ScrollTrigger) ──────────── */
  if (!reduceMotion && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // The hero is sticky, so its own rect never moves — drive the timeline
    // off one viewport of scroll distance instead.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '+=100%',
        scrub: 1.2,
      },
    });

    tl.to(choreo.position, { x: -1.15, y: 0.35, z: 0.7 }, 0)
      .to(choreo.rotation, { y: -0.7, z: 0.12 }, 0)
      .to(camera.position, { z: 7.4 }, 0)
      .to(stars.rotation, { y: 0.6 }, 0);
  }

  /* ──────────── Viewport changes ──────────── */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      placeModel();
    }, 150);
  });

  /* ──────────── Skip frames while the hero is covered ──────────── */
  const onScroll = () => {
    inHero = window.scrollY < window.innerHeight * 0.92;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ──────────── Pause when the tab is hidden ──────────── */
  let rafId = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (rafId === null) {
      clock.getDelta();   // dump the accrued delta so the float doesn't snap
      rafId = requestAnimationFrame(tick);
    }
  });

  if (reduceMotion) {
    // One clean still frame, no loop.
    renderer.render(scene, camera);
    setTimeout(hideCurtain, 400);
  } else {
    rafId = requestAnimationFrame(tick);
  }
})();

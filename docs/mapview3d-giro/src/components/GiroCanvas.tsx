import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import { useStore, type SceneObject } from "../store/useStore";

interface Props {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
}

function createGeometry(o: SceneObject): THREE.BufferGeometry {
  const { w, d, h } = o.scale;
  if (o.type === "umbrella") return new THREE.ConeGeometry(w, h, 8);
  if (o.type === "cylinder") return new THREE.CylinderGeometry(w, w, h, 24);
  return new THREE.BoxGeometry(w, d, h);
}

function createMaterial(o: SceneObject): THREE.MeshStandardMaterial {
  const b = { color: o.color, roughness: 0.5, metalness: 0.1 };
  if (o.type === "slab" || o.type === "pier")
    return new THREE.MeshStandardMaterial({
      ...b,
      roughness: 0.7,
      metalness: 0.05,
    });
  if (o.type === "building")
    return new THREE.MeshStandardMaterial({
      ...b,
      roughness: 0.8,
      metalness: 0,
    });
  if (o.type === "umbrella")
    return new THREE.MeshStandardMaterial({
      ...b,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
  return new THREE.MeshStandardMaterial(b);
}

function makeDisplacementCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const gray =
      d.data[i] * 0.299 + d.data[i + 1] * 0.587 + d.data[i + 2] * 0.114;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = gray;
  }
  ctx.putImageData(d, 0, 0);
  return c;
}

function createSkyDome(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(50000, 32, 16);
  const vertSrc = [
    "varying vec3 vWorldPos;",
    "void main(){",
    "  vec4 wp = modelMatrix * vec4(position,1.0);",
    "  vWorldPos = wp.xyz;",
    "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);",
    "}",
  ].join("\n");
  const fragSrc = [
    "uniform vec3 topColor;",
    "uniform vec3 bottomColor;",
    "uniform float offset;",
    "uniform float exponent;",
    "varying vec3 vWorldPos;",
    "void main(){",
    "  float h = normalize(vWorldPos + offset).z;",
    "  gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent),0.0)),1.0);",
    "}",
  ].join("\n");
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x0a1628) },
      bottomColor: { value: new THREE.Color(0x2d4a6f) },
      offset: { value: 200 },
      exponent: { value: 0.4 },
    },
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
  });
  return new THREE.Mesh(geo, mat);
}

export default function GiroCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<MapControls | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const planeRef = useRef<THREE.Mesh | null>(null);
  const fogRef = useRef<THREE.FogExp2 | null>(null);
  const lightsRef = useRef<{
    sun: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
    amb: THREE.AmbientLight;
    hemi: THREE.HemisphereLight;
  } | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const rafRef = useRef<number>(0);

  const objects = useStore((s) => s.objects);
  const addObjectAt = useStore((s) => s.addObjectAt);
  const effects = useStore((s) => s.effects);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const hw = imageWidth / 2;
    const hh = imageHeight / 2;
    const sceneSize = Math.max(imageWidth, imageHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.add(createSkyDome());

    const fog = new THREE.FogExp2(0x1a2a3a, 0.00015);
    scene.fog = fog;
    fogRef.current = fog;

    const aspect = el.clientWidth / el.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, aspect, 1, sceneSize * 20);
    camera.position.set(0, -hh * 0.9, Math.max(hw, hh) * 1.0);
    camera.up.set(0, 0, 1);
    cameraRef.current = camera;

    const controls = new MapControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 20;
    controls.maxDistance = sceneSize * 3;
    controls.saveState();
    controlsRef.current = controls;

    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362d1b, 0.5);
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sun.position.set(hw * 0.6, -hh * 0.4, hw * 1.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -hw * 1.2;
    sun.shadow.camera.right = hw * 1.2;
    sun.shadow.camera.top = hh * 1.2;
    sun.shadow.camera.bottom = -hh * 1.2;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = hw * 5;
    sun.shadow.bias = -0.0005;
    const fill = new THREE.DirectionalLight(0x8ecae6, 0.4);
    fill.position.set(-hw, hh, hw * 0.5);
    scene.add(amb, hemi, sun, fill);
    lightsRef.current = { sun, fill, amb, hemi };

    const grid = new THREE.GridHelper(sceneSize * 2, 40, 0x444444, 0x333333);
    grid.rotation.x = Math.PI / 2;
    grid.visible = false;
    scene.add(grid);
    gridRef.current = grid;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const colorTex = new THREE.Texture(img);
      colorTex.colorSpace = THREE.SRGBColorSpace;
      colorTex.minFilter = THREE.LinearFilter;
      colorTex.magFilter = THREE.LinearFilter;
      colorTex.wrapS = THREE.ClampToEdgeWrapping;
      colorTex.wrapT = THREE.ClampToEdgeWrapping;
      colorTex.needsUpdate = true;

      const dispCanvas = makeDisplacementCanvas(img);
      const dispTex = new THREE.CanvasTexture(dispCanvas);
      dispTex.minFilter = THREE.LinearFilter;
      dispTex.magFilter = THREE.LinearFilter;
      dispTex.wrapS = THREE.ClampToEdgeWrapping;
      dispTex.wrapT = THREE.ClampToEdgeWrapping;

      const segsX = Math.min(512, Math.round(imageWidth / 4));
      const segsY = Math.min(512, Math.round(imageHeight / 4));
      const planeGeo = new THREE.PlaneGeometry(
        imageWidth,
        imageHeight,
        segsX,
        segsY,
      );
      const planeMat = new THREE.MeshStandardMaterial({
        map: colorTex,
        displacementMap: dispTex,
        displacementScale: 60,
        side: THREE.DoubleSide,
        roughness: 0.85,
        metalness: 0.05,
      });
      const planeMesh = new THREE.Mesh(planeGeo, planeMat);
      planeMesh.receiveShadow = true;
      planeMesh.castShadow = true;
      scene.add(planeMesh);
      planeRef.current = planeMesh;
    };
    img.src = imageUrl;

    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      meshesRef.current = [];
      planeRef.current = null;
    };
  }, [imageUrl, imageWidth, imageHeight]);

  useEffect(() => {
    const plane = planeRef.current;
    const fog = fogRef.current;
    const scene = sceneRef.current;
    const grid = gridRef.current;
    const lights = lightsRef.current;
    if (scene) scene.fog = effects.fog ? (fog ?? null) : null;
    if (plane) {
      const mat = plane.material as THREE.MeshStandardMaterial;
      mat.displacementScale = effects.displacement
        ? effects.displacementScale
        : 0;
      mat.needsUpdate = true;
    }
    if (lights) {
      lights.hemi.intensity = effects.enhancedLighting ? 0.5 : 0;
      lights.sun.intensity = effects.enhancedLighting ? 1.2 : 0.7;
      lights.fill.intensity = effects.enhancedLighting ? 0.4 : 0.15;
    }
    if (grid) grid.visible = effects.gridHelper;
  }, [effects]);

  const sync = useCallback((list: SceneObject[]) => {
    const scene = sceneRef.current;
    if (!scene) return;
    meshesRef.current.forEach((m) => {
      scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    meshesRef.current = [];
    list.forEach((o) => {
      const mesh = new THREE.Mesh(createGeometry(o), createMaterial(o));
      mesh.position.set(o.position.x, o.position.y, o.position.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { id: o.id, isUserObject: true };
      if (o.type === "cylinder" || o.type === "umbrella")
        mesh.rotation.x = Math.PI / 2;
      scene.add(mesh);
      meshesRef.current.push(mesh);
    });
  }, []);

  useEffect(() => {
    sync(objects);
  }, [objects, sync]);

  useEffect(() => {
    const el = mountRef.current;
    const camera = cameraRef.current;
    if (!el || !camera) return;
    const rc = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const pt = new THREE.Vector3();
    const onClick = (e: MouseEvent) => {
      const tool = useStore.getState().activeTool;
      if (!tool) return;
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      rc.setFromCamera(mouse, camera);
      rc.ray.intersectPlane(plane, pt);
      if (pt) addObjectAt(tool, { x: pt.x, y: pt.y });
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [addObjectAt]);

  return <div ref={mountRef} className="w-full h-full" />;
}

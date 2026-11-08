'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CrackerType } from '@/lib/greeting-state';
import { playCrackerSound, playFuseSizzle, playMatchStrike } from '@/lib/diwali-audio';

interface DiwaliSceneProps {
  cracker?: CrackerType;
  burstTrigger?: number;
  matchstickActive?: boolean;
  onIgnited?: () => void;
  onExploded?: () => void;
  onScreenShake?: () => void;
  onBlastTrigger?: () => void;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

export default function DiwaliScene({
  cracker = 'anar',
  burstTrigger = 0,
  matchstickActive = false,
  onIgnited,
  onExploded,
  onScreenShake,
  onBlastTrigger,
}: DiwaliSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const crackerRef = useRef<CrackerType>(cracker);
  const burstTriggerRef = useRef(burstTrigger);
  const matchstickActiveRef = useRef(matchstickActive);
  const onIgnitedRef = useRef(onIgnited);
  const onExplodedRef = useRef(onExploded);
  const onScreenShakeRef = useRef(onScreenShake);
  const onBlastTriggerRef = useRef(onBlastTrigger);

  const igniteActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    crackerRef.current = cracker;
  }, [cracker]);

  useEffect(() => {
    matchstickActiveRef.current = matchstickActive;
  }, [matchstickActive]);

  useEffect(() => {
    onIgnitedRef.current = onIgnited;
    onExplodedRef.current = onExploded;
    onScreenShakeRef.current = onScreenShake;
    onBlastTriggerRef.current = onBlastTrigger;
  }, [onIgnited, onExploded, onScreenShake, onBlastTrigger]);

  // When external trigger changes, ignite the current cracker
  useEffect(() => {
    if (burstTrigger > 0 && igniteActionRef.current) {
      igniteActionRef.current();
    }
    burstTriggerRef.current = burstTrigger;
  }, [burstTrigger]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060312);
    scene.fog = new THREE.FogExp2(0x060312, 0.035);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / height;

    const camera = new THREE.PerspectiveCamera(aspect < 1 ? 52 : 44, aspect, 0.1, 100);
    if (aspect < 1) {
      camera.position.set(0, 2.3, 9.0);
    } else {
      camera.position.set(0, 2.0, 7.5);
    }
    camera.lookAt(0, -0.3, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, -0.3, 0);
    controls.minDistance = 3.5;
    controls.maxDistance = 16.0;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minPolarAngle = 0.2;

    // 4. Studio Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xffb042, 2.2);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x4466cc, 1.4);
    rimLight.position.set(-4, 5, -4);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0x281944, 0x884411, 0.9);
    scene.add(hemiLight);

    // Dynamic firecracker burst light
    const burstLight = new THREE.PointLight(0xff9900, 0, 18);
    burstLight.position.set(0, 0.5, 0);
    scene.add(burstLight);

    // 6. Floor Base & Seamless Rangoli Decal
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x060312,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.15;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    // Procedural Rangoli Canvas Texture
    const rangoliCanvas = document.createElement('canvas');
    rangoliCanvas.width = 512;
    rangoliCanvas.height = 512;
    const rCtx = rangoliCanvas.getContext('2d');
    if (rCtx) {
      rCtx.clearRect(0, 0, 512, 512);
      const cx = 256;
      const cy = 256;
      rCtx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
      rCtx.lineWidth = 3;

      for (let r = 30; r < 240; r += 32) {
        rCtx.beginPath();
        rCtx.arc(cx, cy, r, 0, Math.PI * 2);
        rCtx.stroke();
      }

      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI * 2) / 16;
        const x1 = cx + Math.cos(angle) * 70;
        const y1 = cy + Math.sin(angle) * 70;
        const x2 = cx + Math.cos(angle) * 220;
        const y2 = cy + Math.sin(angle) * 220;
        rCtx.beginPath();
        rCtx.moveTo(cx, cy);
        rCtx.quadraticCurveTo(x1 + 30 * Math.sin(angle), y1 - 30 * Math.cos(angle), x2, y2);
        rCtx.stroke();
      }
    }
    const rangoliTexture = new THREE.CanvasTexture(rangoliCanvas);
    rangoliTexture.colorSpace = THREE.SRGBColorSpace;
    rangoliTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const rangoliGeo = new THREE.PlaneGeometry(8.5, 8.5);
    const rangoliMat = new THREE.MeshStandardMaterial({
      map: rangoliTexture,
      transparent: true,
      opacity: 0.85,
      roughness: 0.4,
      metalness: 0.7,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const rangoliMesh = new THREE.Mesh(rangoliGeo, rangoliMat);
    rangoliMesh.rotation.x = -Math.PI / 2;
    rangoliMesh.position.y = -1.14;
    scene.add(rangoliMesh);

    // Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(5.2, 5.2);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 5, 64, 64, 60);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -1.145;
    scene.add(contactShadow);

    // 7. Materials
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xe6b840, metalness: 0.92, roughness: 0.22 });
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xd4732b, metalness: 0.45, roughness: 0.45 });
    const wickMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.7 });
    const sulfurMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 });

    // 8. Cracker Root Container
    const crackerRoot = new THREE.Group();
    crackerRoot.position.set(0, -1.14, 0);
    scene.add(crackerRoot);

    // Shared Brass Thali with Marigold Petals
    const thaliBase = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.0, 0.08, 48), brassMat);
    thaliBase.position.y = 0.04;
    thaliBase.castShadow = !isSoftwareGl;
    thaliBase.receiveShadow = !isSoftwareGl;
    crackerRoot.add(thaliBase);

    const thaliRim = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.08, 16, 48), brassMat);
    thaliRim.rotation.x = Math.PI / 2;
    thaliRim.position.y = 0.09;
    crackerRoot.add(thaliRim);

    // Marigold Petals on Rim
    const petalCount = 36;
    const petalGeo = new THREE.SphereGeometry(0.12, 8, 8);
    petalGeo.scale(1.4, 0.5, 0.8);
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xffa500, roughness: 0.65, metalness: 0.05 });
    const petalInstanced = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
    const dummy = new THREE.Object3D();
    const orangeColor = new THREE.Color(0xff8800);
    const yellowColor = new THREE.Color(0xffd700);

    for (let i = 0; i < petalCount; i++) {
      const radius = 1.6 + Math.random() * 0.35;
      const angle = (i / petalCount) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * radius, 0.11, Math.sin(angle) * radius);
      dummy.rotation.set(Math.random() * 0.4, Math.random() * Math.PI * 2, Math.random() * 0.4);
      const s = 0.8 + Math.random() * 0.4;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      petalInstanced.setMatrixAt(i, dummy.matrix);
      petalInstanced.setColorAt(i, i % 2 === 0 ? orangeColor : yellowColor);
    }
    petalInstanced.computeBoundingSphere();
    crackerRoot.add(petalInstanced);

    // Active Model Slot
    const activeModelGroup = new THREE.Group();
    crackerRoot.add(activeModelGroup);

    // Wick fuse spark light
    const wickLight = new THREE.PointLight(0xffaa22, 0, 5);
    scene.add(wickLight);

    let wickTargetPos = new THREE.Vector3(0, -0.4, 0);

    // Model Builder
    const buildModel = (type: CrackerType) => {
      while (activeModelGroup.children.length > 0) {
        const obj = activeModelGroup.children[0];
        activeModelGroup.remove(obj);
      }

      if (type === 'diya') {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.15, 32), terracottaMat);
        ped.position.y = 0.16;
        activeModelGroup.add(ped);

        const bowlPoints: THREE.Vector2[] = [];
        bowlPoints.push(new THREE.Vector2(0.65, 0.0));
        bowlPoints.push(new THREE.Vector2(1.25, 0.25));
        bowlPoints.push(new THREE.Vector2(1.35, 0.55));
        bowlPoints.push(new THREE.Vector2(1.15, 0.72));
        bowlPoints.push(new THREE.Vector2(0.85, 0.5));
        bowlPoints.push(new THREE.Vector2(0.3, 0.35));
        const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPoints, 32), terracottaMat);
        bowl.position.y = 0.2;
        activeModelGroup.add(bowl);

        const spout = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.65, 16), terracottaMat);
        spout.rotation.x = -Math.PI / 3;
        spout.position.set(0, 0.72, 1.15);
        activeModelGroup.add(spout);

        const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.35, 12), wickMat);
        wick.rotation.x = -Math.PI / 4;
        wick.position.set(0, 0.88, 1.25);
        activeModelGroup.add(wick);

        const flameOuter = new THREE.Mesh(
          new THREE.ConeGeometry(0.18, 0.75, 20),
          new THREE.MeshStandardMaterial({
            color: 0xff7700,
            emissive: 0xff5500,
            emissiveIntensity: 3.5,
            roughness: 0.1,
            transparent: true,
            opacity: 0.92,
          })
        );
        flameOuter.name = 'flameOuter';
        flameOuter.position.set(0, 1.28, 1.35);
        activeModelGroup.add(flameOuter);

        const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        flameCore.name = 'flameCore';
        flameCore.position.set(0, 1.16, 1.35);
        activeModelGroup.add(flameCore);

        wickTargetPos.set(0, -1.14 + 1.28, 1.35);
      } else if (type === 'anar') {
        const anarMat = new THREE.MeshStandardMaterial({
          color: 0xd82b2b,
          metalness: 0.75,
          roughness: 0.25,
        });
        const anarBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.85, 1.4, 32), anarMat);
        anarBody.position.y = 0.78;
        anarBody.castShadow = !isSoftwareGl;
        activeModelGroup.add(anarBody);

        const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.04, 8, 32), brassMat);
        band1.rotation.x = Math.PI / 2;
        band1.position.y = 0.35;
        activeModelGroup.add(band1);

        const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 8, 32), brassMat);
        band2.rotation.x = Math.PI / 2;
        band2.position.y = 0.95;
        activeModelGroup.add(band2);

        const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10), wickMat);
        fuse.name = 'fuseWick';
        fuse.position.set(0, 1.62, 0);
        fuse.rotation.z = 0.15;
        activeModelGroup.add(fuse);

        wickTargetPos.set(0, -1.14 + 1.7, 0);
      } else if (type === 'chakri') {
        const chakriMat = new THREE.MeshStandardMaterial({
          color: 0x118844,
          metalness: 0.65,
          roughness: 0.3,
        });
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.18, 36), chakriMat);
        disc.position.y = 0.18;
        activeModelGroup.add(disc);

        const spiralRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 8, 32), brassMat);
        spiralRing.rotation.x = Math.PI / 2;
        spiralRing.position.y = 0.28;
        activeModelGroup.add(spiralRing);

        const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 32), brassMat);
        innerRing.rotation.x = Math.PI / 2;
        innerRing.position.y = 0.28;
        activeModelGroup.add(innerRing);

        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12), brassMat);
        pin.position.y = 0.35;
        activeModelGroup.add(pin);

        const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8), wickMat);
        fuse.name = 'fuseWick';
        fuse.position.set(0.95, 0.26, 0);
        fuse.rotation.z = Math.PI / 3;
        activeModelGroup.add(fuse);

        wickTargetPos.set(0.95, -1.14 + 0.32, 0);
      } else if (type === 'rocket') {
        const rocketMat = new THREE.MeshStandardMaterial({
          color: 0x2266ee,
          metalness: 0.8,
          roughness: 0.2,
        });
        const rocketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 24), rocketMat);
        rocketBody.position.set(0, 1.2, 0);
        rocketBody.name = 'rocketBody';
        activeModelGroup.add(rocketBody);

        const noseMat = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.3, metalness: 0.5 });
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 20), noseMat);
        nose.position.set(0, 1.95, 0);
        nose.name = 'rocketNose';
        activeModelGroup.add(nose);

        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), woodMat);
        stick.position.set(0.12, 0.6, 0);
        stick.name = 'rocketStick';
        activeModelGroup.add(stick);

        const bottleMat = new THREE.MeshStandardMaterial({ color: 0x112233, metalness: 0.4, roughness: 0.4 });
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.9, 16), bottleMat);
        bottle.position.set(0, 0.5, 0);
        activeModelGroup.add(bottle);

        const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), wickMat);
        fuse.name = 'fuseWick';
        fuse.position.set(-0.06, 0.52, 0);
        fuse.rotation.z = -0.4;
        activeModelGroup.add(fuse);

        wickTargetPos.set(-0.06, -1.14 + 0.52, 0);
      } else if (type === 'bomb') {
        const bombMat = new THREE.MeshStandardMaterial({
          color: 0x2e6f40,
          roughness: 0.9,
          metalness: 0.1,
        });
        const bombBody = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.75, 24), bombMat);
        bombBody.position.y = 0.45;
        bombBody.name = 'bombBody';
        activeModelGroup.add(bombBody);

        const cord1 = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.03, 8, 24), woodMat);
        cord1.rotation.x = Math.PI / 2;
        cord1.position.y = 0.35;
        activeModelGroup.add(cord1);

        const cord2 = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.03, 8, 24), woodMat);
        cord2.rotation.x = Math.PI / 2;
        cord2.position.y = 0.55;
        activeModelGroup.add(cord2);

        const fuseMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 });
        const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10), fuseMat);
        fuse.name = 'fuseWick';
        fuse.position.set(0, 0.95, 0);
        fuse.rotation.z = 0.2;
        activeModelGroup.add(fuse);

        wickTargetPos.set(0, -1.14 + 1.05, 0);
      } else if (type === 'phuljhadi') {
        const wireMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.2 });
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.8, 8), wireMat);
        wire.position.y = 0.95;
        wire.name = 'phuljhadiWire';
        activeModelGroup.add(wire);

        const chemMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
        const chem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 12), chemMat);
        chem.position.y = 1.3;
        chem.name = 'phuljhadiChem';
        activeModelGroup.add(chem);

        wickTargetPos.set(0, -1.14 + 1.85, 0);
      }
    };

    buildModel(cracker);

    // 9. Interactive 3D Matchstick
    const matchGroup = new THREE.Group();
    matchGroup.visible = false;
    scene.add(matchGroup);

    const matchStick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 12), woodMat);
    matchStick.position.y = 0.45;
    matchGroup.add(matchStick);

    const matchHead = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), sulfurMat);
    matchHead.scale.set(1, 1.4, 1);
    matchHead.position.y = 0.92;
    matchGroup.add(matchHead);

    const matchFlameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const matchFlame = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.25, 12), matchFlameMat);
    matchFlame.position.y = 1.08;
    matchGroup.add(matchFlame);

    const matchLight = new THREE.PointLight(0xff8811, 2.0, 3.5);
    matchLight.position.y = 1.1;
    matchGroup.add(matchLight);

    // 10. Massive Firecracker Particle Buffer (up to 1500 particles for grand 10s shows)
    const maxParticles = 1400;
    const particles: Particle[] = [];

    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(maxParticles * 3);
    const pColors = new Float32Array(maxParticles * 3);
    const pSizes = new Float32Array(maxParticles);

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    pGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      const grad = pCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(255, 215, 0, 0.95)');
      grad.addColorStop(0.7, 'rgba(255, 90, 0, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 64, 64);
    }
    const pTexture = new THREE.CanvasTexture(pCanvas);

    const pMat = new THREE.PointsMaterial({
      size: 0.35,
      map: pTexture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particleSystem = new THREE.Points(pGeo, pMat);
    scene.add(particleSystem);

    // 11. State Machine: 'idle' | 'igniting' | 'bursting'
    // AUTO-START ON OPEN: starts bursting right away with 10s spectacle!
    let state: 'idle' | 'igniting' | 'bursting' = 'bursting';
    let stateTimer = 0;
    let chakriRotationSpeed = 38.0;
    let rocketY = 0;
    let rocketVy = 0;

    const igniteCurrentCracker = () => {
      state = 'igniting';
      stateTimer = 0;

      matchGroup.visible = true;
      matchGroup.position.copy(wickTargetPos).add(new THREE.Vector3(0.35, 0.4, 0.2));
      matchGroup.rotation.set(0.4, 0, -0.6);

      playMatchStrike();
      playFuseSizzle();
      if (onIgnitedRef.current) onIgnitedRef.current();
    };

    igniteActionRef.current = igniteCurrentCracker;

    // Trigger Cracker Burst & notify Screen Shake
    const triggerExplosion = () => {
      state = 'bursting';
      stateTimer = 0;
      matchGroup.visible = false;
      playCrackerSound(crackerRef.current);
      if (onExplodedRef.current) onExplodedRef.current();

      const type = crackerRef.current;

      // Notify parent to trigger realistic screen shake and character drop!
      if (type === 'bomb') {
        if (onScreenShakeRef.current) onScreenShakeRef.current();
        if (onBlastTriggerRef.current) onBlastTriggerRef.current();

        // Intense flash
        keyLight.intensity = 8.0;
        burstLight.intensity = 15.0;
        burstLight.color.setHex(0xff3300);
        setTimeout(() => {
          keyLight.intensity = 2.2;
          burstLight.intensity = 0.5;
        }, 180);

        // Massive 300+ particle violent blast wave
        for (let i = 0; i < 340; i++) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);
          const spd = 6.0 + Math.random() * 12.0;
          particles.push({
            x: wickTargetPos.x,
            y: wickTargetPos.y,
            z: wickTargetPos.z,
            vx: Math.sin(phi) * Math.cos(theta) * spd,
            vy: Math.cos(phi) * spd * 0.8 + 2.0,
            vz: Math.sin(phi) * Math.sin(theta) * spd,
            life: 0,
            maxLife: 1.8 + Math.random() * 1.4,
            color: new THREE.Color(Math.random() > 0.4 ? 0xff3300 : 0xffdd22),
            size: 0.55,
          });
        }
      } else if (type === 'chakri') {
        chakriRotationSpeed = 42.0;
        burstLight.intensity = 3.0;
        burstLight.color.setHex(0x00ff88);
      } else if (type === 'rocket') {
        rocketY = 0;
        rocketVy = 5.0;
      } else if (type === 'anar') {
        burstLight.intensity = 4.0;
        burstLight.color.setHex(0xffaa00);
      } else {
        keyLight.intensity = 3.5;
        setTimeout(() => (keyLight.intensity = 2.2), 400);
      }
    };

    // 12. Floating Akash Kandils
    const lanternCount = 7;
    const lanternGroup = new THREE.Group();
    interface LanternData {
      group: THREE.Group;
      baseX: number;
      baseY: number;
      baseZ: number;
      speed: number;
      phase: number;
    }
    const lanterns: LanternData[] = [];

    for (let i = 0; i < lanternCount; i++) {
      const singleLantern = new THREE.Group();
      const lMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xff4422 : 0xffaa00,
        emissive: i % 2 === 0 ? 0xff2200 : 0xff8800,
        emissiveIntensity: 1.2,
        roughness: 0.3,
      });

      const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), lMat);
      body.scale.set(1, 1.6, 1);
      singleLantern.add(body);

      const bx = (Math.random() - 0.5) * 14;
      const by = 2.8 + Math.random() * 4.5;
      const bz = -3.5 - Math.random() * 7;
      singleLantern.position.set(bx, by, bz);

      lanternGroup.add(singleLantern);
      lanterns.push({
        group: singleLantern,
        baseX: bx,
        baseY: by,
        baseZ: bz,
        speed: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
    scene.add(lanternGroup);

    // 13. Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const asp = w / h;
      camera.aspect = asp;
      camera.fov = asp < 1 ? 54 : 45;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let currentRenderedCracker = cracker;

    // 14. Animation Loop: 10-SECOND CELEBRATORY LIFECYCLES
    let frameId = 0;
    let lastTime = performance.now();
    let totalElapsedTime = 0;

    // Remove afterDraw to eliminate fenceSync stalls

    function tick() {
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      totalElapsedTime += delta;
      const time = totalElapsedTime;

      // Handle dynamic cracker change
      if (crackerRef.current !== currentRenderedCracker) {
        currentRenderedCracker = crackerRef.current;
        buildModel(currentRenderedCracker);
        state = 'idle';
        stateTimer = 0;
        matchGroup.visible = false;
        // Auto ignite upon cracker selection
        window.setTimeout(() => {
          igniteCurrentCracker();
        }, 80);
      }

      controls.update();

      // Floating lanterns
      lanterns.forEach((l) => {
        l.group.position.y = l.baseY + Math.sin(time * l.speed + l.phase) * 0.45;
        l.group.position.x = l.baseX + Math.cos(time * (l.speed * 0.7) + l.phase) * 0.25;
        l.group.rotation.y = time * 0.2 + l.phase;
      });

      // Matchstick flicker
      if (matchGroup.visible) {
        const mfScale = 1.0 + Math.sin(time * 30.0) * 0.25;
        matchFlame.scale.set(mfScale, mfScale, mfScale);
      }

      // STATE MACHINE
      if (state === 'igniting') {
        stateTimer += delta;

        const approachProgress = Math.min(stateTimer / 0.45, 1.0);
        matchGroup.position.lerpVectors(
          new THREE.Vector3(wickTargetPos.x + 0.35, wickTargetPos.y + 0.35, wickTargetPos.z + 0.25),
          new THREE.Vector3(wickTargetPos.x + 0.08, wickTargetPos.y + 0.05, wickTargetPos.z + 0.05),
          approachProgress
        );

        wickLight.position.copy(wickTargetPos);
        wickLight.intensity = 2.0 + Math.random() * 2.5;

        for (let i = 0; i < 4; i++) {
          particles.push({
            x: wickTargetPos.x + (Math.random() - 0.5) * 0.08,
            y: wickTargetPos.y + (Math.random() - 0.5) * 0.08,
            z: wickTargetPos.z + (Math.random() - 0.5) * 0.08,
            vx: (Math.random() - 0.5) * 1.8,
            vy: Math.random() * 2.2 + 0.5,
            vz: (Math.random() - 0.5) * 1.8,
            life: 0,
            maxLife: 0.35,
            color: new THREE.Color(0xffcc22),
            size: 0.2,
          });
        }

        if (stateTimer > 0.75) {
          triggerExplosion();
        }
      } else if (state === 'bursting') {
        stateTimer += delta;
        wickLight.intensity = 0;

        // 5-SECOND DURATION FOR ALL CRACKERS (Fast, snappy, grand celebration)
        const TOTAL_DURATION = 5.0;

        if (currentRenderedCracker === 'anar') {
          // Volcanic fountain erupting high into the sky for 5 seconds
          if (stateTimer < TOTAL_DURATION) {
            const heightMultiplier = stateTimer < 1.2
              ? 0.5 + (stateTimer / 1.2) * 0.5
              : stateTimer > 4.0
              ? Math.max(0.2, (TOTAL_DURATION - stateTimer) / 1.0)
              : 1.0;

            const spawnCount = isSoftwareGl ? 8 : 18;
            burstLight.intensity = 3.5 * heightMultiplier;

            for (let i = 0; i < spawnCount; i++) {
              const angle = Math.random() * Math.PI * 2;
              const spread = Math.random() * 0.45;
              const speedY = (5.5 + Math.random() * 5.0) * heightMultiplier;
              const colorRoll = Math.random();
              const pColor =
                colorRoll > 0.6 ? 0xffcc00 : colorRoll > 0.3 ? 0xff4400 : 0x00ffcc;

              particles.push({
                x: wickTargetPos.x + (Math.random() - 0.5) * 0.1,
                y: wickTargetPos.y + 0.1,
                z: wickTargetPos.z + (Math.random() - 0.5) * 0.1,
                vx: Math.cos(angle) * spread * 2.5,
                vy: speedY,
                vz: Math.sin(angle) * spread * 2.5,
                life: 0,
                maxLife: 1.3 + Math.random() * 0.8,
                color: new THREE.Color(pColor),
                size: 0.38,
              });
            }
          } else {
            burstLight.intensity = 0;
            state = 'idle';
          }
        } else if (currentRenderedCracker === 'chakri') {
          // Spins on the floor for 10 seconds!
          if (stateTimer < TOTAL_DURATION) {
            const spinFade = Math.max(0.15, (TOTAL_DURATION - stateTimer) / TOTAL_DURATION);
            activeModelGroup.rotation.y += chakriRotationSpeed * spinFade * delta;

            const spawnCount = isSoftwareGl ? 5 : 12;
            for (let i = 0; i < spawnCount; i++) {
              const a = activeModelGroup.rotation.y + (i / spawnCount) * Math.PI * 2;
              const spd = (4.5 + Math.random() * 2.5) * spinFade;
              particles.push({
                x: Math.cos(a) * 0.9,
                y: -1.14 + 0.22,
                z: Math.sin(a) * 0.9,
                vx: -Math.sin(a) * spd,
                vy: Math.random() * 0.7 + 0.1,
                vz: Math.cos(a) * spd,
                life: 0,
                maxLife: 0.7,
                color: new THREE.Color(i % 2 === 0 ? 0x00ff88 : 0xff9900),
                size: 0.28,
              });
            }
          } else {
            state = 'idle';
          }
        } else if (currentRenderedCracker === 'rocket') {
          // Rocket ascends -> explodes -> 10s sparkling star shower!
          const rocketBody = activeModelGroup.getObjectByName('rocketBody');
          const rocketNose = activeModelGroup.getObjectByName('rocketNose');
          const rocketStick = activeModelGroup.getObjectByName('rocketStick');

          if (stateTimer < 1.0) {
            rocketVy += delta * 16.0;
            rocketY += rocketVy * delta;
            if (rocketBody) rocketBody.position.y = 1.2 + rocketY;
            if (rocketNose) rocketNose.position.y = 1.95 + rocketY;
            if (rocketStick) rocketStick.position.y = 0.6 + rocketY;

            // Exhaust plume
            for (let i = 0; i < 6; i++) {
              particles.push({
                x: (Math.random() - 0.5) * 0.08,
                y: -1.14 + 1.2 + rocketY - 0.6,
                z: (Math.random() - 0.5) * 0.08,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -Math.random() * 3.5,
                vz: (Math.random() - 0.5) * 0.4,
                life: 0,
                maxLife: 0.4,
                color: new THREE.Color(0xff5500),
                size: 0.3,
              });
            }
          } else if (stateTimer >= 1.0 && stateTimer < 1.15) {
            if (rocketBody) rocketBody.visible = false;
            if (rocketNose) rocketNose.visible = false;
            if (rocketStick) rocketStick.visible = false;

            const burstY = -1.14 + 1.2 + rocketY;
            for (let i = 0; i < 240; i++) {
              const theta = Math.random() * Math.PI * 2;
              const phi = Math.acos(Math.random() * 2 - 1);
              const spd = 3.5 + Math.random() * 7.5;
              particles.push({
                x: 0,
                y: burstY,
                z: 0,
                vx: Math.sin(phi) * Math.cos(theta) * spd,
                vy: Math.cos(phi) * spd + 0.5,
                vz: Math.sin(phi) * Math.sin(theta) * spd,
                life: 0,
                maxLife: 3.5 + Math.random() * 2.0, // long star trails
                color: new THREE.Color(Math.random() > 0.5 ? 0xff2266 : 0x00e5ff),
                size: 0.42,
              });
            }
          } else if (stateTimer < TOTAL_DURATION) {
            // Secondary twinkling starry embers raining down
            if (Math.random() > 0.4) {
              const burstY = -1.14 + 1.2 + rocketY;
              particles.push({
                x: (Math.random() - 0.5) * 3.5,
                y: burstY - Math.random() * 1.5,
                z: (Math.random() - 0.5) * 3.5,
                vx: (Math.random() - 0.5) * 0.6,
                vy: -Math.random() * 0.8,
                vz: (Math.random() - 0.5) * 0.6,
                life: 0,
                maxLife: 1.5,
                color: new THREE.Color(0xffd700),
                size: 0.25,
              });
            }
          } else {
            if (rocketBody) {
              rocketBody.visible = true;
              rocketBody.position.y = 1.2;
            }
            if (rocketNose) {
              rocketNose.visible = true;
              rocketNose.position.y = 1.95;
            }
            if (rocketStick) {
              rocketStick.visible = true;
              rocketStick.position.y = 0.6;
            }
            state = 'idle';
          }
        } else if (currentRenderedCracker === 'bomb') {
          // Bomb: Blast occurs at triggerExplosion -> continuous festive ember celebration for 10 seconds
          if (stateTimer < TOTAL_DURATION) {
            // Emitting sparkling smoke and embers after the initial huge blast
            if (Math.random() > 0.3) {
              particles.push({
                x: wickTargetPos.x + (Math.random() - 0.5) * 1.8,
                y: wickTargetPos.y + Math.random() * 2.5,
                z: wickTargetPos.z + (Math.random() - 0.5) * 1.8,
                vx: (Math.random() - 0.5) * 0.8,
                vy: Math.random() * 0.8,
                vz: (Math.random() - 0.5) * 0.8,
                life: 0,
                maxLife: 1.2,
                color: new THREE.Color(Math.random() > 0.5 ? 0xffaa00 : 0xff4422),
                size: 0.28,
              });
            }
          } else {
            state = 'idle';
          }
        } else if (currentRenderedCracker === 'phuljhadi') {
          // Continuous handheld sparkler for 10 seconds!
          if (stateTimer < TOTAL_DURATION) {
            for (let i = 0; i < 12; i++) {
              const theta = Math.random() * Math.PI * 2;
              const spd = 1.4 + Math.random() * 2.4;
              particles.push({
                x: wickTargetPos.x,
                y: wickTargetPos.y + (Math.random() - 0.5) * 0.3,
                z: wickTargetPos.z,
                vx: Math.cos(theta) * spd,
                vy: (Math.random() - 0.5) * spd,
                vz: Math.sin(theta) * spd,
                life: 0,
                maxLife: 0.5,
                color: new THREE.Color(Math.random() > 0.3 ? 0xffffff : 0xffd700),
                size: 0.3,
              });
            }
          } else {
            state = 'idle';
          }
        } else {
          // Diya
          if (stateTimer > TOTAL_DURATION) state = 'idle';
        }
      } else {
        wickLight.intensity = 0;
      }

      // Update Particle Buffer & Physics
      let activeIndex = 0;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += delta;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;
        p.vy -= 4.2 * delta; // natural gravity
        p.vx *= 0.985;
        p.vz *= 0.985;

        if (activeIndex < maxParticles) {
          const idx3 = activeIndex * 3;
          pPositions[idx3] = p.x;
          pPositions[idx3 + 1] = p.y;
          pPositions[idx3 + 2] = p.z;

          const fade = 1 - p.life / p.maxLife;
          pColors[idx3] = p.color.r * fade;
          pColors[idx3 + 1] = p.color.g * fade;
          pColors[idx3 + 2] = p.color.b * fade;

          pSizes[activeIndex] = p.size * fade;
          activeIndex++;
        }
      }

      for (let i = activeIndex; i < maxParticles; i++) {
        pSizes[i] = 0;
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.color.needsUpdate = true;
      pGeo.attributes.size.needsUpdate = true;

      // Render Scene
      renderer.render(scene, camera);

      frameId = requestAnimationFrame(tick);
    }

    // Immediately render initial frame and trigger auto-ignition on open
    renderer.render(scene, camera);
    igniteCurrentCracker();
    frameId = requestAnimationFrame(tick);

    let clickStartX = 0;
    let clickStartY = 0;
    const handlePointerDown = (e: PointerEvent) => {
      clickStartX = e.clientX;
      clickStartY = e.clientY;
    };
    const handlePointerUp = (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - clickStartX);
      const dy = Math.abs(e.clientY - clickStartY);
      if (dx < 10 && dy < 10) {
        igniteCurrentCracker();
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      if (frameId) {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
      }
      controls.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      pGeo.dispose();
      pMat.dispose();
      pTexture.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      rangoliGeo.dispose();
      rangoliMat.dispose();
      rangoliTexture.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTexture.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />;
}

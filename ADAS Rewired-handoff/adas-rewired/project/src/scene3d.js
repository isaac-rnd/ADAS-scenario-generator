// Three.js scene for the live viewport.
// Renders ground, road network, lane markings, statics, dynamic actors, ego vehicle,
// camera frustum overlay, and trajectory trails. Orbit + chase cam toggle.

const THREE = window.THREE;
const { OrbitControls } = THREE;

export class Scene3D {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x121922, 1);
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = null;

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 800);
    this.camera.position.set(45, 45, 70);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 180;

    // Lighting
    const hemi = new THREE.HemisphereLight(0xb8cadb, 0x1a2230, 1.4);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(40, 80, 30);
    this.scene.add(dir);
    const amb = new THREE.AmbientLight(0x3a4a5c, 0.6);
    this.scene.add(amb);

    // Ground
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2330, roughness: 1, metalness: 0,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = false;
    this.scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(400, 80, 0x3a4a5c, 0x2a3446);
    grid.position.y = 0.01;
    this.scene.add(grid);

    // Groups
    this.gRoad = new THREE.Group(); this.scene.add(this.gRoad);
    this.gStatics = new THREE.Group(); this.scene.add(this.gStatics);
    this.gActors = new THREE.Group(); this.scene.add(this.gActors);
    this.gEgo = new THREE.Group(); this.scene.add(this.gEgo);
    this.gOverlay = new THREE.Group(); this.scene.add(this.gOverlay);

    this.actorMeshes = new Map();
    this.chaseCam = false;
    this.topCam = false;

    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(container);

    this._animate = this._animate.bind(this);
    this._animate();
  }

  _resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, true);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setScenario(scenario, mapDef) {
    this._clear(this.gRoad);
    this._clear(this.gStatics);
    this._clear(this.gActors);
    this._clear(this.gEgo);
    this._clear(this.gOverlay);
    this.actorMeshes.clear();

    // Roads
    (mapDef?.segments || []).forEach((seg) => {
      this._addRoad(seg);
    });
    (mapDef?.crosswalks || []).forEach((cw) => this._addCrosswalk(cw));
    (mapDef?.lights || []).forEach((l) => this._addTrafficLight(l));

    // Ego trajectory trail
    const wps = scenario.ego.waypoints.map((w) => new THREE.Vector3(w.at[0], 0.05, w.at[1]));
    const trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(wps),
      new THREE.LineDashedMaterial({ color: 0x2fd1c1, dashSize: 1.2, gapSize: 0.8, transparent: true, opacity: 0.55 })
    );
    trail.computeLineDistances();
    this.gOverlay.add(trail);

    // Ego mesh
    this.ego = this._makeVehicle(0xdfe6ef, true);
    this.ego.position.set(scenario.ego.start[0], 0, scenario.ego.start[1]);
    this.gEgo.add(this.ego);

    // Camera frustum overlay on ego
    const frust = this._makeFrustum();
    this.ego.add(frust);

    // Actors
    (scenario.actors || []).forEach((a) => {
      const mesh = this._makeActor(a);
      this.gActors.add(mesh);
      this.actorMeshes.set(a.id, mesh);
    });

    // Statics
    (scenario.statics || []).forEach((s) => this._addStatic(s));

    // Fit camera
    this.resetView();
  }

  _addRoad(seg) {
    const [ax, az] = seg.a, [bx, bz] = seg.b;
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    const w = seg.width || 8;

    const mat = new THREE.MeshStandardMaterial({ color: 0x0a0e13, roughness: 1 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = -ang;
    road.position.set((ax + bx) / 2, 0.02, (az + bz) / 2);
    this.gRoad.add(road);

    // Dashed centerline
    const dashMat = new THREE.LineDashedMaterial({ color: 0x6e7b8a, dashSize: 1.8, gapSize: 1.4 });
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ax, 0.03, az),
        new THREE.Vector3(bx, 0.03, bz),
      ]),
      dashMat
    );
    line.computeLineDistances();
    this.gRoad.add(line);

    // Edge lines
    const perpX = -Math.cos(-ang), perpZ = Math.sin(-ang);
    const ox = (w / 2) * Math.cos(ang);
    const oz = -(w / 2) * Math.sin(ang);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x394454 });
    [+1, -1].forEach((s) => {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ax + ox * s, 0.03, az + oz * s),
        new THREE.Vector3(bx + ox * s, 0.03, bz + oz * s),
      ]);
      this.gRoad.add(new THREE.Line(g, edgeMat));
    });
  }

  _addCrosswalk(cw) {
    const g = new THREE.Group();
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xdbe3ec });
    const n = 6;
    for (let i = 0; i < n; i++) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(cw.axis === "z" ? cw.w : cw.l / n * 0.55, cw.axis === "z" ? cw.l / n * 0.55 : cw.w),
        stripeMat
      );
      stripe.rotation.x = -Math.PI / 2;
      if (cw.axis === "z") {
        stripe.position.set(cw.x, 0.04, cw.z - cw.l / 2 + (i + 0.5) * cw.l / n);
      } else {
        stripe.position.set(cw.x - cw.l / 2 + (i + 0.5) * cw.l / n, 0.04, cw.z);
      }
      g.add(stripe);
    }
    this.gRoad.add(g);
  }

  _addTrafficLight(l) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a3446 })
    );
    pole.position.set(l.x, 2.1, l.z);
    this.gStatics.add(pole);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.2, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x1a2230 })
    );
    head.position.set(l.x, 3.9, l.z);
    this.gStatics.add(head);

    ["#ff5b5b", "#ffd24d", "#64e39c"].forEach((c, i) => {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i === 2 ? 1.3 : 0.2 })
      );
      bulb.position.set(l.x, 4.3 - i * 0.36, l.z + 0.18);
      this.gStatics.add(bulb);
    });
  }

  _addStatic(s) {
    let mesh;
    if (s.kind === "building") {
      const [w, h, d] = s.size || [10, 8, 10];
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: 0x1a222d, roughness: 0.9 })
      );
      mesh.position.set(s.at[0], h / 2, s.at[1]);
      // Window stripe emissive lines
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: 0x2b3647 })
      );
      mesh.add(edges);
    } else if (s.kind === "cone") {
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.8, 10),
        new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0xff8a3d, emissiveIntensity: 0.15 })
      );
      mesh.position.set(s.at[0], 0.4, s.at[1]);
    } else if (s.kind === "barrier") {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.9, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xffd24d, emissive: 0xffd24d, emissiveIntensity: 0.1 })
      );
      mesh.position.set(s.at[0], 0.45, s.at[1]);
    } else if (s.kind === "sign") {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b7686 })
      );
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.6, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xff5b5b, emissive: 0xff5b5b, emissiveIntensity: 0.25 })
      );
      plate.position.y = 1.4;
      const g = new THREE.Group();
      g.add(pole); g.add(plate);
      g.position.set(s.at[0], 1.25, s.at[1]);
      this.gStatics.add(g);
      return;
    } else {
      return;
    }
    this.gStatics.add(mesh);
  }

  _makeVehicle(color = 0xdfe6ef, isEgo = false) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color, metalness: 0.4, roughness: 0.4,
      emissive: isEgo ? 0x2fd1c1 : 0x000000,
      emissiveIntensity: isEgo ? 0.08 : 0,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 4.3), bodyMat);
    body.position.y = 0.7;
    g.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.7, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0a0e12, metalness: 0.6, roughness: 0.2 })
    );
    cabin.position.set(0, 1.3, -0.2);
    g.add(cabin);
    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0c0f });
    const w = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
    [[-0.9, 0.38, 1.4], [0.9, 0.38, 1.4], [-0.9, 0.38, -1.4], [0.9, 0.38, -1.4]].forEach((p) => {
      const m = new THREE.Mesh(w, wheelMat);
      m.rotation.z = Math.PI / 2;
      m.position.set(...p);
      g.add(m);
    });
    // Headlights
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff1c0, emissive: 0xfff1c0, emissiveIntensity: 0.7 });
    [[-0.7, 0.75, 2.15], [0.7, 0.75, 2.15]].forEach((p) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), lightMat);
      m.position.set(...p);
      g.add(m);
    });
    // Brake lights
    const brake = new THREE.MeshStandardMaterial({ color: 0x661111, emissive: 0xff2a2a, emissiveIntensity: 0.3 });
    [[-0.7, 0.75, -2.15], [0.7, 0.75, -2.15]].forEach((p) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), brake);
      m.position.set(...p);
      g.add(m);
      g.userData.brakeLights = g.userData.brakeLights || [];
      g.userData.brakeLights.push(m);
    });

    if (isEgo) {
      // Halo ring on ground
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 2.8, 48),
        new THREE.MeshBasicMaterial({ color: 0x2fd1c1, transparent: true, opacity: 0.45 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      g.add(ring);
    }
    return g;
  }

  _makeActor(a) {
    if (a.kind === "vehicle") {
      return this._makeVehicle(new THREE.Color(a.color || "#a7b2c0"));
    }
    if (a.kind === "pedestrian") {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.22, 0.9, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xf2d17a })
      );
      body.position.y = 0.9;
      g.add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xd7b98c })
      );
      head.position.y = 1.65;
      g.add(head);
      return g;
    }
    if (a.kind === "cyclist") {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.5, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x7adfc9 })
      );
      frame.position.y = 0.7;
      g.add(frame);
      const rider = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.7, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x7adfc9 })
      );
      rider.position.y = 1.4;
      g.add(rider);
      return g;
    }
    if (a.kind === "animal") {
      const g = new THREE.Group();
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 1.0),
        new THREE.MeshStandardMaterial({ color: 0xc58a6a })
      );
      b.position.y = 0.35;
      g.add(b);
      return g;
    }
    return new THREE.Object3D();
  }

  _makeFrustum() {
    const geo = new THREE.BufferGeometry();
    const len = 30, half = 8.5;
    const pts = [
      new THREE.Vector3(0, 1.1, 2),
      new THREE.Vector3(half, 1.1, 2 + len),
      new THREE.Vector3(0, 1.1, 2),
      new THREE.Vector3(-half, 1.1, 2 + len),
      new THREE.Vector3(half, 1.1, 2 + len),
      new THREE.Vector3(-half, 1.1, 2 + len),
    ];
    geo.setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0x2fd1c1, transparent: true, opacity: 0.35 });
    return new THREE.LineSegments(geo, mat);
  }

  update(state) {
    if (!this.ego || !state) return;
    // Ego
    this.ego.position.set(state.ego.x, 0, state.ego.z);
    this.ego.rotation.y = state.ego.heading;
    const braking = state.ego.braking || state.ego.v < 0.3;
    (this.ego.userData.brakeLights || []).forEach((m) => {
      m.material.emissiveIntensity = braking ? 1.1 : 0.1;
    });

    // Actors
    state.actors.forEach((a) => {
      const m = this.actorMeshes.get(a.id);
      if (!m) return;
      m.position.set(a.x, 0, a.z);
      m.rotation.y = a.heading;
    });

    // Chase/top cam
    if (this.chaseCam) {
      const c = this.camera;
      const tx = state.ego.x - Math.sin(state.ego.heading) * 10;
      const tz = state.ego.z - Math.cos(state.ego.heading) * 10;
      c.position.lerp(new THREE.Vector3(tx, 6.5, tz), 0.08);
      this.controls.target.lerp(new THREE.Vector3(state.ego.x, 1.2, state.ego.z), 0.18);
    } else if (this.topCam) {
      this.controls.target.lerp(new THREE.Vector3(state.ego.x, 0, state.ego.z), 0.08);
    }
  }

  setChase(on) {
    this.chaseCam = on;
    this.topCam = false;
    this.controls.enabled = !on;
  }

  setTop(on) {
    this.topCam = on;
    this.chaseCam = false;
    if (on) {
      this.camera.position.set(0, 110, 0.01);
      this.controls.target.set(0, 0, 0);
    }
    this.controls.enabled = !on;
  }

  resetView() {
    this.chaseCam = false; this.topCam = false;
    // Angle viewpoint down the ego start so the car is visible on initial frame
    const egoStart = this.ego ? this.ego.position : new THREE.Vector3(0, 0, 0);
    this.camera.position.set(egoStart.x + 30, 28, egoStart.z - 20);
    this.controls.target.set(egoStart.x, 0, egoStart.z + 10);
    this.controls.enabled = true;
  }

  _clear(g) { while (g.children.length) g.remove(g.children[0]); }

  _animate() {
    this._raf = requestAnimationFrame(this._animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this._ro.disconnect();
    this.renderer.dispose();
    this.container.innerHTML = "";
  }
}

import * as THREE from 'three';
import type { ScrapbookState, ScrapbookPage } from './scrapbookTypes';
import {
  PW,
  PH,
  drawPageToCanvas,
  drawCoverToCanvas,
  drawEndpaperToCanvas,
} from './scrapbookRenderer';

export const BOOK = {
  W: 3.6,
  H: 4.8,
  CE: 0.16,
  SEG: 20, // 20 segments is optimal for 60fps smooth bending on mobile/desktop
};

interface Leaf {
  i: number;
  type: 'cover' | 'page';
  theta: number;
  bend: number;
  root: THREE.Group;
  frontMat: THREE.MeshLambertMaterial;
  backMat: THREE.MeshLambertMaterial;
  mats: THREE.Material[];
  boxMat?: THREE.MeshLambertMaterial;
  pos?: THREE.BufferAttribute;
  gf?: THREE.BufferGeometry;
  gb?: THREE.BufferGeometry;
  front?: THREE.Mesh;
  back?: THREE.Mesh;
}

export interface EngineCallbacks {
  onTurn?: (turned: number) => void;
  onFrame?: () => void;
  insets?: () => { top: number; right: number; bottom: number };
}

export class ScrapbookEngine {
  private container: HTMLElement;
  private state: ScrapbookState;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private group!: THREE.Group;
  private table!: THREE.Mesh;
  private dirLight!: THREE.DirectionalLight;
  private spine!: THREE.Mesh;
  private blockR!: THREE.Mesh;
  private blockL!: THREE.Mesh;
  private blankTex!: THREE.CanvasTexture;
  private raycaster = new THREE.Raycaster();

  private leaves: Leaf[] = [];
  private N = 0;
  private L = 0;
  private pageT = 0.02;
  private coverT = 0.045;
  private zRight: number[] = [];
  private zLeft: number[] = [];
  private turned = 0;
  private flipping: {
    lf: Leaf;
    dir: number;
    from: number;
    to: number;
    t0: number;
    dur: number;
    resolve: (val: boolean) => void;
  } | null = null;
  private chain = false;
  private texScale = 1.5;
  private last = 0;
  private running = true;
  private animId = 0;

  private texCache = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture }>();
  private dirty = new Set<string>();

  private mode3d = true;
  private editing = false;
  private editSide: 'left' | 'right' = 'right';
  private settled = false;

  private cam = { phi: 0.62, psi: 0, dist: 16, tx: 0, ty: 0, tz: 0.1, sx: 0, sy: 0 };
  private orbit = { phi: 0, psi: 0 };
  private ptr = { x: 0, y: 0 };

  private cb: EngineCallbacks = {};
  private coverCanvases: Record<string, HTMLCanvasElement> = {};
  private coverTextures: Record<string, THREE.CanvasTexture> = {};

  private readonly FOV = 32;
  private readonly tanHalf = Math.tan((32 * Math.PI) / 360);

  constructor(container: HTMLElement, state: ScrapbookState, cb: EngineCallbacks = {}) {
    this.container = container;
    this.state = state;
    this.cb = cb;
    this.initWebGL();
    this.rebuild();
    this.animate = this.animate.bind(this);
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.animId = requestAnimationFrame(this.animate);
  }

  public updateState(newState: ScrapbookState) {
    this.state = newState;
    this.setScene(newState.meta.sceneColor);
    this.rebuild();
  }

  public setState(newState: ScrapbookState) {
    this.state = newState;
  }

  /** Redraw cover textures tanpa rebuild penuh (untuk edit meta/cover) */
  public invalidateCover() {
    this.refreshCovers();
  }

  private makeTex(canvas: HTMLCanvasElement): THREE.CanvasTexture {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    return t;
  }

  private initWebGL() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.texScale = Math.min(2, Math.max(1.2, (window.devicePixelRatio || 1) * 1.1));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.FOV, w / h, 1, 120);
    this.camera.up.set(0, 1, 0);

    this.scene.add(new THREE.AmbientLight(0xfff4e6, 0.78));
    this.dirLight = new THREE.DirectionalLight(0xfff0dd, 0.42);
    this.dirLight.position.set(-5, 6, 15);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    Object.assign(this.dirLight.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
    this.dirLight.shadow.bias = -0.0006;
    this.scene.add(this.dirLight);

    // Meja / background surface
    this.table = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshLambertMaterial({ color: 0xe6d6bf }));
    this.table.receiveShadow = true;
    this.scene.add(this.table);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    const bc = document.createElement('canvas');
    bc.width = bc.height = 8;
    const bx = bc.getContext('2d')!;
    bx.fillStyle = '#fbf3e4';
    bx.fillRect(0, 0, 8, 8);
    this.blankTex = this.makeTex(bc);

    const blockMat = new THREE.MeshLambertMaterial({ color: 0xf3ead7 });
    this.blockR = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), blockMat);
    this.blockL = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), blockMat);
    this.blockR.castShadow = this.blockL.castShadow = true;
    this.group.add(this.blockR, this.blockL);

    this.spine = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xc9677a }));
    this.spine.castShadow = true;
    this.group.add(this.spine);

    this.setScene(this.state.meta.sceneColor || '#e6d6bf');
  }

  public setScene(color: string) {
    if (!this.table) return;
    (this.table.material as THREE.MeshLambertMaterial).color.set(color);
    this.scene.background = new THREE.Color(color);
  }

  private onResize() {
    if (!this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private refreshCovers() {
    const CW = BOOK.W + BOOK.CE;
    const CH = BOOK.H + BOOK.CE * 2;
    const cw = Math.round((CW / BOOK.W) * 400);
    const ch = Math.round((CH / BOOK.W) * 400);

    for (const k of ['front', 'back'] as const) {
      let c = this.coverCanvases[k];
      if (!c) {
        c = document.createElement('canvas');
        c.width = Math.round(cw * 1.5);
        c.height = Math.round(ch * 1.5);
        this.coverCanvases[k] = c;
      }
      const ctx = c.getContext('2d')!;
      ctx.setTransform(1.5, 0, 0, 1.5, 0, 0);
      drawCoverToCanvas(ctx, cw, ch, this.state.meta, k === 'front', this.state.blobs);

      if (!this.coverTextures[k]) {
        this.coverTextures[k] = this.makeTex(c);
      } else {
        this.coverTextures[k].needsUpdate = true;
      }
    }

    for (const side of ['L', 'R'] as const) {
      const key = 'end' + side;
      let c = this.coverCanvases[key];
      if (!c) {
        c = document.createElement('canvas');
        c.width = PW;
        c.height = PH;
        this.coverCanvases[key] = c;
      }
      const ctx = c.getContext('2d')!;
      drawEndpaperToCanvas(ctx, side === 'R' ? 'right' : 'left');

      if (!this.coverTextures[key]) {
        this.coverTextures[key] = this.makeTex(c);
      } else {
        this.coverTextures[key].needsUpdate = true;
      }
    }

    (this.spine.material as THREE.MeshLambertMaterial).color.set(new THREE.Color(this.state.meta.coverColor).multiplyScalar(0.82));

    for (const lf of this.leaves) {
      if (lf.type !== 'page') {
        const first = lf.i === 0;
        lf.frontMat.map = first ? this.coverTextures.front : this.coverTextures.endR;
        lf.backMat.map = first ? this.coverTextures.endL : this.coverTextures.back;
        lf.frontMat.needsUpdate = lf.backMat.needsUpdate = true;
      }
    }
  }

  private makeLeafGeos() {
    const SEG = BOOK.SEG;
    const H = BOOK.H;
    const n = (SEG + 1) * 2;
    const pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    pos.setUsage(THREE.DynamicDrawUsage);
    const uvF = new Float32Array(n * 2);
    const uvB = new Float32Array(n * 2);

    for (let r = 0; r < 2; r++) {
      for (let k = 0; k <= SEG; k++) {
        const i = r * (SEG + 1) + k;
        pos.setY(i, r === 0 ? H / 2 : -H / 2);
        uvF[i * 2] = k / SEG;
        uvF[i * 2 + 1] = r === 0 ? 1 : 0;
        uvB[i * 2] = 1 - k / SEG;
        uvB[i * 2 + 1] = r === 0 ? 1 : 0;
      }
    }

    const idx: number[] = [];
    for (let k = 0; k < SEG; k++) {
      const a = k,
        b = k + SEG + 1,
        c = k + 1,
        d = k + SEG + 2;
      idx.push(a, b, c, b, d, c);
    }

    const gf = new THREE.BufferGeometry();
    gf.setAttribute('position', pos);
    gf.setAttribute('uv', new THREE.BufferAttribute(uvF, 2));
    gf.setIndex(idx);
    gf.computeVertexNormals();

    const gb = new THREE.BufferGeometry();
    gb.setAttribute('position', pos);
    gb.setAttribute('normal', gf.attributes.normal);
    gb.setAttribute('uv', new THREE.BufferAttribute(uvB, 2));
    gb.setIndex(idx);

    return { gf, gb, pos };
  }

  private disposeBook() {
    for (const lf of this.leaves) {
      this.group.remove(lf.root);
      lf.root.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose();
      });
      lf.mats.forEach((m) => m.dispose());
    }
    this.leaves = [];
    for (const [, en] of this.texCache) en.tex.dispose();
    this.texCache.clear();
  }

  public rebuild() {
    this.disposeBook();
    const CW = BOOK.W + BOOK.CE;
    const CH = BOOK.H + BOOK.CE * 2;
    this.L = Math.max(1, Math.floor(this.state.pages.length / 2));
    this.N = this.L + 2;
    this.pageT = Math.max(0.008, Math.min(0.03, 0.5 / this.L));

    const thick = (i: number) => (i === 0 || i === this.N - 1 ? this.coverT : this.pageT);
    const BASE = 0.012;
    this.zRight = [];
    this.zLeft = [];

    for (let i = 0; i < this.N; i++) {
      let sr = 0,
        sl = 0;
      for (let j = i + 1; j < this.N; j++) sr += thick(j);
      for (let j = 0; j < i; j++) sl += thick(j);
      this.zRight[i] = BASE + sr + thick(i) / 2;
      this.zLeft[i] = BASE + sl + thick(i) / 2;
    }

    this.turned = Math.max(0, Math.min(this.turned, this.N));

    for (let i = 0; i < this.N; i++) {
      const isCover = i === 0 || i === this.N - 1;
      const root = new THREE.Group();
      const lf: Leaf = {
        i,
        type: isCover ? 'cover' : 'page',
        theta: i < this.turned ? Math.PI : 0,
        bend: 0,
        root,
        frontMat: new THREE.MeshLambertMaterial({ map: this.blankTex }),
        backMat: new THREE.MeshLambertMaterial({ map: this.blankTex }),
        mats: [],
      };

      if (isCover) {
        const t = this.coverT;
        const matBox = new THREE.MeshLambertMaterial({
          color: new THREE.Color(this.state.meta.coverColor).multiplyScalar(0.85),
        });
        const box = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, t - 0.004), matBox);
        box.position.set(CW / 2, 0, 0);
        box.castShadow = true;

        const gF = new THREE.PlaneGeometry(CW, CH);
        gF.translate(CW / 2, 0, t / 2 - 0.0015);
        const gB = new THREE.PlaneGeometry(CW, CH);
        gB.rotateY(Math.PI);
        gB.translate(CW / 2, 0, -(t / 2 - 0.0015));

        root.add(box, new THREE.Mesh(gF, lf.frontMat), new THREE.Mesh(gB, lf.backMat));
        lf.mats = [lf.frontMat, lf.backMat, matBox];
        lf.boxMat = matBox;
      } else {
        const { gf, gb, pos } = this.makeLeafGeos();
        lf.frontMat.side = THREE.FrontSide;
        lf.backMat.side = THREE.BackSide;
        lf.frontMat.shadowSide = THREE.DoubleSide;

        const mf = new THREE.Mesh(gf, lf.frontMat);
        const mb = new THREE.Mesh(gb, lf.backMat);
        mf.frustumCulled = mb.frustumCulled = false;
        mf.castShadow = true;

        root.add(mf, mb);
        Object.assign(lf, { gf, gb, pos, front: mf, back: mb, mats: [lf.frontMat, lf.backMat] });
      }

      this.group.add(root);
      this.leaves.push(lf);
      this.updateLeaf(lf);
    }

    this.refreshCovers();
    this.assignTextures();
    this.setScene(this.state.meta.sceneColor);
  }

  private leafZ(lf: Leaf) {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    return (
      lerp(this.zRight[lf.i], this.zLeft[lf.i], lf.theta / Math.PI) +
      Math.sin(lf.theta) * (lf.type === 'page' ? 0.5 : 0.7)
    );
  }

  private updateLeaf(lf: Leaf) {
    const th = lf.theta;
    const z = this.leafZ(lf);
    if (lf.type === 'cover') {
      lf.root.position.z = z;
      lf.root.rotation.y = -th;
      return;
    }
    const pos = lf.pos!;
    const SEG = BOOK.SEG;
    const seg = BOOK.W / SEG;
    let x = 0,
      zz = 0;
    for (let k = 0; k <= SEG; k++) {
      if (k > 0) {
        const tm = (k - 0.5) / SEG;
        const phi = th - lf.bend * Math.sin(th) * Math.pow(tm, 1.25);
        x += Math.cos(phi) * seg;
        zz += Math.sin(phi) * seg;
      }
      pos.setX(k, x);
      pos.setZ(k, zz + z);
      pos.setX(k + SEG + 1, x);
      pos.setZ(k + SEG + 1, zz + z);
    }
    pos.needsUpdate = true;
    lf.gf!.computeVertexNormals();
  }

  private pageTex(idx: number): THREE.CanvasTexture {
    const page = this.state.pages[idx];
    if (!page) return this.blankTex;
    let en = this.texCache.get(page.id);
    if (!en) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(PW * this.texScale);
      canvas.height = Math.round(PH * this.texScale);
      const ctx = canvas.getContext('2d')!;
      const tex = this.makeTex(canvas);
      en = { canvas, ctx, tex };
      this.texCache.set(page.id, en);
      this.renderEntry(en, page);
    }
    return en.tex;
  }

  private renderEntry(
    en: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture },
    page: ScrapbookPage
  ) {
    en.ctx.setTransform(1, 0, 0, 1, 0, 0);
    en.ctx.clearRect(0, 0, en.canvas.width, en.canvas.height);
    en.ctx.setTransform(this.texScale, 0, 0, this.texScale, 0, 0);
    const pageIdx = this.state.pages.findIndex((p) => p.id === page.id);
    const side: 'left' | 'right' = pageIdx % 2 === 0 ? 'right' : 'left';
    drawPageToCanvas(en.ctx, page, side, this.state.assets, this.state.blobs);
    en.tex.needsUpdate = true;
  }

  private assignTextures() {
    const t = this.turned;
    const need = new Set<number>();
    for (let off = -2; off <= 3; off++) {
      const idx = 2 * (t - 1) + off;
      if (idx >= 0 && idx < this.state.pages.length) need.add(idx);
    }
    for (const lf of this.leaves) {
      if (lf.type !== 'page') continue;
      const fi = 2 * (lf.i - 1),
        bi = fi + 1;
      lf.frontMat.map = need.has(fi) ? this.pageTex(fi) : this.blankTex;
      lf.backMat.map = need.has(bi) ? this.pageTex(bi) : this.blankTex;
      lf.frontMat.needsUpdate = lf.backMat.needsUpdate = true;
    }
  }

  public invalidatePage(id: string) {
    this.dirty.add(id);
    this.flushDirty();
  }

  public invalidateAll() {
    for (const id of this.texCache.keys()) this.dirty.add(id);
    this.flushDirty();
  }

  public invalidateElement(elId: string) {
    for (const p of this.state.pages) {
      if (p.elements.some((e) => e.id === elId)) {
        this.dirty.add(p.id);
        return;
      }
    }
  }

  private flushDirty() {
    if (!this.dirty.size) return;
    for (const id of this.dirty) {
      const en = this.texCache.get(id);
      if (!en) continue;
      const page = this.state.pages.find((p) => p.id === id);
      if (page) this.renderEntry(en, page);
    }
    this.dirty.clear();
  }

  /* --- Flipping Animations --- */
  private flipOnce(dir: number, dur: number): Promise<boolean> {
    return new Promise((resolve) => {
      const idx = dir > 0 ? this.turned : this.turned - 1;
      if (idx < 0 || idx >= this.N) {
        resolve(false);
        return;
      }
      const lf = this.leaves[idx];
      this.assignTextures();
      lf.bend = lf.type === 'page' ? dir * 0.95 : 0;
      this.flipping = {
        lf,
        dir,
        from: dir > 0 ? 0 : Math.PI,
        to: dir > 0 ? Math.PI : 0,
        t0: performance.now(),
        dur,
        resolve,
      };
    });
  }

  private stepFlip(now: number) {
    if (!this.flipping) return;
    const f = this.flipping;
    const p = Math.max(0, Math.min(1, (now - f.t0) / f.dur));
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    f.lf.theta = f.from + (f.to - f.from) * e;

    if (p >= 1) {
      f.lf.theta = f.to;
      f.lf.bend = 0;
      this.turned += f.dir;
      this.flipping = null;
      this.assignTextures();
      this.updateLeaf(f.lf);
      this.cb.onTurn && this.cb.onTurn(this.turned);
      f.resolve(true);
    } else {
      this.updateLeaf(f.lf);
    }
  }

  public isBusy() {
    return !!this.flipping || this.chain;
  }

  public async next(): Promise<boolean> {
    if (this.isBusy()) return false;
    const t = this.turned + 1;
    if (t > this.N) return false;
    return this.flipOnce(1, 800);
  }

  public async prev(): Promise<boolean> {
    if (this.isBusy()) return false;
    const t = this.turned - 1;
    if (t < 0) return false;
    return this.flipOnce(-1, 800);
  }

  public async jumpTo(t: number) {
    t = Math.max(0, Math.min(t, this.N));
    if (this.isBusy() || t === this.turned) return;
    this.chain = true;
    const dur = Math.abs(t - this.turned) > 1 ? 340 : 750;
    try {
      while (this.turned !== t) {
        await this.flipOnce(t > this.turned ? 1 : -1, dur);
      }
    } finally {
      this.chain = false;
    }
  }

  public setTurned(t: number) {
    this.turned = Math.max(0, Math.min(t, this.N));
    this.flipping = null;
    this.leaves.forEach((lf) => {
      lf.theta = lf.i < this.turned ? Math.PI : 0;
      lf.bend = 0;
      this.updateLeaf(lf);
    });
    this.assignTextures();
    this.cb.onTurn && this.cb.onTurn(this.turned);
  }

  public getTurned() {
    return this.turned;
  }

  public getCount() {
    return { N: this.N, L: this.L };
  }

  public setMode3d(v: boolean) {
    this.mode3d = v;
    this.orbit.phi = this.orbit.psi = 0;
  }

  public setEditing(v: boolean, side?: 'left' | 'right') {
    this.editing = v;
    if (side) this.editSide = side;
  }

  public setPointer(x: number, y: number) {
    this.ptr.x = x;
    this.ptr.y = y;
  }

  public orbitBy(dx: number, dy: number) {
    this.orbit.psi = Math.max(-0.6, Math.min(0.6, this.orbit.psi + dx * 0.005));
    this.orbit.phi = Math.max(-0.4, Math.min(0.45, this.orbit.phi - dy * 0.004));
  }

  /* --- Camera & Targets --- */
  private targets() {
    const ins = this.cb.insets ? this.cb.insets() : { top: 60, right: 0, bottom: 80 };
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const availW = Math.max(220, w - ins.right);
    const availH = Math.max(220, h - ins.top - ins.bottom);

    const CW = BOOK.W + BOOK.CE;
    const CH = BOOK.H + BOOK.CE * 2;
    const th = this.leaves[0] ? this.leaves[0].theta : 0;
    const tb = this.leaves[this.N - 1] ? this.leaves[this.N - 1].theta : 0;
    const closed = Math.max(1 - th / Math.PI, tb / Math.PI);
    const c = CW / 2;
    const shiftX = -c * (1 - th / Math.PI) + c * (tb / Math.PI);
    this.group.position.x = shiftX;

    let needW: number,
      needH: number,
      tx = 0;
    if (this.editing) {
      needW = BOOK.W * 1.16;
      needH = BOOK.H * 1.1;
      tx = this.editSide === 'right' ? BOOK.W / 2 : -BOOK.W / 2;
    } else {
      needW = (2 * BOOK.W + 0.5) * (1 - closed) + (CW + 0.4) * closed;
      needH = CH + 0.3;
    }

    let dist = Math.max((needH * h) / (2 * this.tanHalf * availH), (needW * h) / (2 * this.tanHalf * availW));
    if (this.mode3d && !this.editing) dist *= 1.1;
    const flat = !this.mode3d || this.editing;

    return {
      phi: flat ? 0 : Math.max(0.12, Math.min(1.1, 0.62 + this.orbit.phi + this.ptr.y * 0.05)),
      psi: flat ? 0 : Math.max(-0.7, Math.min(0.7, this.orbit.psi + this.ptr.x * 0.1)),
      dist,
      tx,
      ty: 0,
      sx: ins.right / 2,
      sy: -(ins.top - ins.bottom) / 2,
    };
  }

  private updateCamera(dt: number, snap = false) {
    const T = this.targets();
    const k = snap ? 1 : 1 - Math.exp(-dt * 6);
    this.cam.phi += (T.phi - this.cam.phi) * k;
    this.cam.psi += (T.psi - this.cam.psi) * k;
    this.cam.dist += (T.dist - this.cam.dist) * k;
    this.cam.tx += (T.tx - this.cam.tx) * k;
    this.cam.sx += (T.sx - this.cam.sx) * k;
    this.cam.sy += (T.sy - this.cam.sy) * k;

    this.settled =
      !this.flipping &&
      !this.chain &&
      Math.abs(this.cam.phi - T.phi) < 0.002 &&
      Math.abs(this.cam.psi - T.psi) < 0.002 &&
      Math.abs(this.cam.dist - T.dist) < 0.01;

    const sp = Math.sin(this.cam.phi),
      cp = Math.cos(this.cam.phi);
    const ss = Math.sin(this.cam.psi),
      cs = Math.cos(this.cam.psi);

    this.camera.position.set(
      this.cam.tx + this.cam.dist * sp * ss,
      this.cam.ty - this.cam.dist * sp * cs,
      this.cam.tz + this.cam.dist * cp
    );
    this.camera.up.set(-ss, cs, 0);
    this.camera.lookAt(this.cam.tx, this.cam.ty, this.cam.tz);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.setViewOffset(w, h, this.cam.sx, this.cam.sy, w, h);
    this.camera.updateProjectionMatrix();
  }

  private updateBlocksAndSpine() {
    if (!this.leaves.length) return;
    let topR = -1,
      topL = -1;
    for (let i = 1; i < this.N - 1; i++) {
      if (this.leaves[i].theta < Math.PI / 2) {
        if (topR < 0) topR = i;
      } else {
        topL = i;
      }
    }
    const bw = BOOK.W - 0.03,
      bh = BOOK.H - 0.03;
    const back = this.leaves[this.N - 1],
      front = this.leaves[0];

    const setBlock = (m: THREE.Mesh, vis: boolean, cx: number, z0: number, z1: number) => {
      m.visible = vis && z1 - z0 > 0.004;
      if (!m.visible) return;
      m.scale.set(bw, bh, z1 - z0);
      m.position.set(cx, 0, (z0 + z1) / 2);
    };

    setBlock(this.blockR, topR >= 0 && back.theta < Math.PI / 2, BOOK.W / 2, this.zRight[this.N - 1] + this.coverT / 2, topR >= 0 ? this.zRight[topR] - 0.003 : 0);
    setBlock(this.blockL, topL >= 0 && front.theta >= Math.PI / 2, -BOOK.W / 2, this.zLeft[0] + this.coverT / 2, topL >= 0 ? this.zLeft[topL] - 0.003 : 0);

    const zf = this.leafZ(front),
      zb = this.leafZ(back);
    const top = Math.max(zf, zb) + this.coverT / 2,
      bot = Math.min(zf, zb) - this.coverT / 2;
    this.spine.scale.set(0.07, BOOK.H + BOOK.CE * 2, Math.max(this.coverT, top - bot));
    this.spine.position.set(-0.025, 0, (top + bot) / 2);
  }

  private animate(now: number) {
    if (!this.running) return;
    this.animId = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;

    this.stepFlip(now);
    this.flushDirty();
    this.updateCamera(dt);
    this.updateBlocksAndSpine();
    this.renderer.render(this.scene, this.camera);
    this.cb.onFrame && this.cb.onFrame();
  }

  /* --- Raycasting / Hit Testing --- */
  public pageIndexAt(side: 'left' | 'right'): number {
    const t = this.turned;
    const L = Math.floor(this.state.pages.length / 2);
    if (side === 'right') {
      const i = 2 * t - 2;
      return t >= 1 && t <= L ? i : -1;
    }
    const i = 2 * t - 3;
    return t >= 2 && t - 1 <= L ? i : -1;
  }

  public raycastPage(cx: number, cy: number) {
    if (this.isBusy() || !this.leaves.length) return null;
    const r = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1)),
      this.camera
    );

    const rl = this.leaves[this.turned],
      ll = this.leaves[this.turned - 1];
    const objs: THREE.Object3D[] = [];
    if (rl) objs.push(rl.type === 'page' ? rl.front! : rl.root);
    if (ll) objs.push(ll.type === 'page' ? ll.back! : ll.root);

    const hits = this.raycaster.intersectObjects(objs, true);
    if (!hits.length) return null;

    const p = this.group.worldToLocal(hits[0].point.clone());
    const side: 'left' | 'right' = p.x >= 0 ? 'right' : 'left';
    const x = side === 'right' ? (p.x / BOOK.W) * PW : ((p.x + BOOK.W) / BOOK.W) * PW;
    const y = ((BOOK.H / 2 - p.y) / BOOK.H) * PH;

    return {
      side,
      x,
      y,
      pageIndex: this.pageIndexAt(side),
      cover: this.turned === 0 && side === 'right' ? 'front' : this.turned === this.N && side === 'left' ? 'back' : null,
    };
  }

  public getPageRect(side: 'left' | 'right') {
    const idx = side === 'right' ? this.turned : this.turned - 1;
    const lf = this.leaves[idx];
    if (!lf || lf.type !== 'page') return null;

    const z = side === 'right' ? this.zRight[idx] : this.zLeft[idx];
    const x0 = side === 'right' ? 0 : -BOOK.W;
    const x1 = side === 'right' ? BOOK.W : 0;
    const a = new THREE.Vector3(x0, BOOK.H / 2, z);
    const b = new THREE.Vector3(x1, -BOOK.H / 2, z);

    this.group.localToWorld(a);
    this.group.localToWorld(b);
    a.project(this.camera);
    b.project(this.camera);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const l = (a.x * 0.5 + 0.5) * w;
    const t = (-a.y * 0.5 + 0.5) * h;
    const r = (b.x * 0.5 + 0.5) * w;
    const bt = (-b.y * 0.5 + 0.5) * h;

    return {
      left: Math.min(l, r),
      top: Math.min(t, bt),
      width: Math.abs(r - l),
      height: Math.abs(bt - t),
    };
  }

  public isSettled() {
    return this.settled;
  }

  public destroy() {
    this.running = false;
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
    this.disposeBook();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

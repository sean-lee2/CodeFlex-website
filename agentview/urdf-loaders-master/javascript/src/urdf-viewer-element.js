import * as THREE from 'three';
import { MeshPhongMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import URDFLoader from './URDFLoader.js';

const tempVec2 = new THREE.Vector2();
const emptyRaycast = () => {};

// urdf-viewer element
// Loads and displays a 3D view of a URDF-formatted robot

// Events
// urdf-change: Fires when the URDF has finished loading and getting processed
// urdf-processed: Fires when the URDF has finished loading and getting processed
// geometry-loaded: Fires when all the geometry has been fully loaded
// ignore-limits-change: Fires when the 'ignore-limits' attribute changes
// angle-change: Fires when an angle changes
export default
class URDFViewer extends HTMLElement {

    static get observedAttributes() {

        return ['package', 'urdf', 'up', 'display-shadow', 'ambient-color', 'ignore-limits', 'show-collision'];

    }

    get package() { return this.getAttribute('package') || ''; }
    set package(val) { this.setAttribute('package', val); }

    get urdf() { return this.getAttribute('urdf') || ''; }
    set urdf(val) { this.setAttribute('urdf', val); }

    get ignoreLimits() { return this.hasAttribute('ignore-limits') || false; }
    set ignoreLimits(val) { val ? this.setAttribute('ignore-limits', val) : this.removeAttribute('ignore-limits'); }

    get up() { return this.getAttribute('up') || '+Z'; }
    set up(val) { this.setAttribute('up', val); }

    get displayShadow() { return this.hasAttribute('display-shadow') || false; }
    set displayShadow(val) { val ? this.setAttribute('display-shadow', '') : this.removeAttribute('display-shadow'); }

    get ambientColor() { return this.getAttribute('ambient-color') || '#8ea0a8'; }
    set ambientColor(val) { val ? this.setAttribute('ambient-color', val) : this.removeAttribute('ambient-color'); }

    get autoRedraw() { return this.hasAttribute('auto-redraw') || false; }
    set autoRedraw(val) { val ? this.setAttribute('auto-redraw', true) : this.removeAttribute('auto-redraw'); }

    get noAutoRecenter() { return this.hasAttribute('no-auto-recenter') || false; }
    set noAutoRecenter(val) { val ? this.setAttribute('no-auto-recenter', true) : this.removeAttribute('no-auto-recenter'); }

    get showCollision() { return this.hasAttribute('show-collision') || false; }
    set showCollision(val) { val ? this.setAttribute('show-collision', true) : this.removeAttribute('show-collision'); }

    get jointValues() {

        const values = {};
        if (this.robot) {

            for (const name in this.robot.joints) {

                const joint = this.robot.joints[name];
                values[name] = joint.jointValue.length === 1 ? joint.angle : [...joint.jointValue];

            }

        }

        return values;

    }
    set jointValues(val) { this.setJointValues(val); }

    get angles() {

        return this.jointValues;

    }
    set angles(v) {

        this.jointValues = v;

    }

    /* Lifecycle Functions */
    constructor() {

        super();

        this._requestId = 0;
        this._dirty = false;
        this._loadScheduled = false;
        this.robot = null;
        this.loadMeshFunc = null;
        this.urlModifierFunc = null;

        // Scene setup
        const scene = new THREE.Scene();

        // 🏭 공장 테마 그라데이션 배경 추가
        const gradientGeometry = new THREE.PlaneGeometry(100, 100);
        const gradientMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x2d2d2d) },
                bottomColor: { value: new THREE.Color(0x0a0a0a) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const gradientMesh = new THREE.Mesh(gradientGeometry, gradientMaterial);
        gradientMesh.position.z = -50;
        gradientMesh.scale.setScalar(2);
        scene.add(gradientMesh);

        // 🌟 공장 파티클 시스템 추가
        this.createFactoryParticles(scene);

        // 🏭 개선된 산업용 조명 시스템 구축
        // 1. 부드러운 환경 조명 (색온도 고려)
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3); // 약간 어둡게 조정
        scene.add(ambientLight);

        // 2. 메인 작업 조명 (더 자연스러운 색온도)
        const mainLight = new THREE.DirectionalLight(0xfff8e1, 1.2); // 따뜻한 백색
        mainLight.position.set(5, 12, 8); // 더 자연스러운 각도
        mainLight.target.position.set(0, 0, 0);
        
        // 고품질 그림자 설정
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.1;
        mainLight.shadow.camera.far = 30;
        mainLight.shadow.camera.left = -8;
        mainLight.shadow.camera.right = 8;
        mainLight.shadow.camera.top = 8;
        mainLight.shadow.camera.bottom = -8;
        mainLight.shadow.normalBias = 0.002;
        mainLight.shadow.bias = -0.0001;
        mainLight.castShadow = true;
        scene.add(mainLight);
        scene.add(mainLight.target);

        // 3. 균형잡힌 측면 조명 (색온도 다양화)
        const fillLight1 = new THREE.DirectionalLight(0xe6f3ff, 0.4); // 차가운 블루 톤
        fillLight1.position.set(-10, 6, 5);
        scene.add(fillLight1);

        const fillLight2 = new THREE.DirectionalLight(0xfff0e6, 0.3); // 따뜻한 오렌지 톤
        fillLight2.position.set(10, 4, -5);
        scene.add(fillLight2);

        // 4. 개선된 작업 영역 조명
        const workLight = new THREE.PointLight(0xffffff, 0.6, 15); // 범위 확장
        workLight.position.set(0, 4, 2);
        workLight.castShadow = true;
        workLight.shadow.mapSize.width = 1024;
        workLight.shadow.mapSize.height = 1024;
        workLight.shadow.camera.near = 0.1;
        workLight.shadow.camera.far = 15;
        scene.add(workLight);

        // 5. 림 라이트 (윤곽 강조)
        const rimLight = new THREE.DirectionalLight(0xb3d9ff, 0.5);
        rimLight.position.set(-8, 2, -8);
        scene.add(rimLight);

        // Renderer setup - 🎨 개선된 렌더링 설정
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance", // GPU 성능 우선
            precision: "highp",
            logarithmicDepthBuffer: true
        });
        // 🏭 공장 테마 그라데이션 배경 설정
        renderer.setClearColor(0x1a1a1a); // 어두운 공장 배경
        renderer.setClearAlpha(0);
        // 🌑 고품질 그림자 시스템
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 부드러운 그림자
        renderer.shadowMap.autoUpdate = true;
        
        // 추가 렌더링 품질 설정
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.physicallyCorrectLights = true;
        
        // 🔧 고급 렌더링 설정
        renderer.shadowMap.autoUpdate = true;
        renderer.gammaFactor = 2.2;
        renderer.maxMorphTargets = 8;
        renderer.maxMorphNormals = 4;
        
        // 🏭 공장 환경 맵 생성 (HDR 스타일)
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const envMapTexture = pmremGenerator.fromScene(this.createFactoryEnvironment()).texture;
        scene.environment = envMapTexture;
        scene.backgroundIntensity = 0.1; // 배경 강도 낮춤
        
        // 📐 정밀도 향상
        renderer.sortObjects = true;
        renderer.preserveDrawingBuffer = true;

        // Camera setup
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = -10;

        // World setup
        const world = new THREE.Object3D();
        scene.add(world);

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.ShadowMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.25 }),
        );
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.5;
        plane.receiveShadow = true;
        plane.scale.set(10, 10, 10);
        scene.add(plane);

        // Controls setup
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.rotateSpeed = 2.0;
        controls.zoomSpeed = 5;
        controls.panSpeed = 2;
        controls.enableZoom = true;
        controls.enableDamping = false;
        controls.maxDistance = 50;
        controls.minDistance = 0.25;
        controls.addEventListener('change', () => this.recenter());

        this.scene = scene;
        this.world = world;
        this.renderer = renderer;
        this.camera = camera;
        this.controls = controls;
        this.plane = plane;
        this.directionalLight = mainLight;
        this.ambientLight = ambientLight;

        this._setUp(this.up);

        this._collisionMaterial = new MeshPhongMaterial({
            transparent: true,
            opacity: 0.35,
            shininess: 2.5,
            premultipliedAlpha: true,
            color: 0xffbe38,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
        });

        const _renderLoop = () => {

            if (this.parentNode) {

                this.updateSize();

                if (this._dirty || this.autoRedraw) {

                    if (!this.noAutoRecenter) {

                        this._updateEnvironment();
                    }

                    // 🌟 파티클 애니메이션 업데이트
                    if (this.animateParticles) {
                        this.animateParticles();
                    }

                    this.renderer.render(scene, camera);
                    this._dirty = false;

                }

                // update controls after the environment in
                // case the controls are retargeted
                this.controls.update();

            }
            this._renderLoopId = requestAnimationFrame(_renderLoop);

        };
        _renderLoop();

    }

    connectedCallback() {

        // Add our initialize styles for the element if they haven't
        // been added yet
        if (!this.constructor._styletag) {

            const styletag = document.createElement('style');
            styletag.innerHTML =
            `
                ${ this.tagName } { display: block; }
                ${ this.tagName } canvas {
                    width: 100%;
                    height: 100%;
                }
            `;
            document.head.appendChild(styletag);
            this.constructor._styletag = styletag;

        }

        // add the renderer
        if (this.childElementCount === 0) {

            this.appendChild(this.renderer.domElement);

        }

        this.updateSize();
        requestAnimationFrame(() => this.updateSize());

    }

    disconnectedCallback() {

        cancelAnimationFrame(this._renderLoopId);

    }

    attributeChangedCallback(attr, oldval, newval) {

        this._updateCollisionVisibility();
        if (!this.noAutoRecenter) {
            this.recenter();
        }

        switch (attr) {

            case 'package':
            case 'urdf': {

                this._scheduleLoad();
                break;

            }

            case 'up': {

                this._setUp(this.up);
                break;

            }

            case 'ambient-color': {

                this.ambientLight.color.set(this.ambientColor);
                this.ambientLight.groundColor.set('#000').lerp(this.ambientLight.color, 0.5);
                break;

            }

            case 'ignore-limits': {

                this._setIgnoreLimits(this.ignoreLimits, true);
                break;

            }

        }

    }

    /* Public API */
    updateSize() {

        const r = this.renderer;
        const w = this.clientWidth;
        const h = this.clientHeight;
        const currSize = r.getSize(tempVec2);

        if (currSize.width !== w || currSize.height !== h) {

            this.recenter();

        }

        r.setPixelRatio(window.devicePixelRatio);
        r.setSize(w, h, false);

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

    }

    redraw() {

        this._dirty = true;
    }

    recenter() {

        this._updateEnvironment();
        this.redraw();

    }

    // Set the joint with jointName to
    // angle in degrees
    setJointValue(jointName, ...values) {

        if (!this.robot) return;
        if (!this.robot.joints[jointName]) return;

        if (this.robot.joints[jointName].setJointValue(...values)) {

            this.redraw();
            this.dispatchEvent(new CustomEvent('angle-change', { bubbles: true, cancelable: true, detail: jointName }));

        }

    }

    setJointValues(values) {

        for (const name in values) this.setJointValue(name, values[name]);

    }

    /* Private Functions */
    // Updates the position of the plane to be at the
    // lowest point below the robot and focuses the
    // camera on the center of the scene
    _updateEnvironment() {

        const robot = this.robot;
        if (!robot) return;

        this.world.updateMatrixWorld();

        const bbox = new THREE.Box3();
        bbox.makeEmpty();
        robot.traverse(c => {
            if (c.isURDFVisual) {
                bbox.expandByObject(c);
            }
        });

        const center = bbox.getCenter(new THREE.Vector3());
        this.controls.target.y = center.y;
        this.plane.position.y = bbox.min.y - 1e-3;

        const dirLight = this.directionalLight;
        dirLight.castShadow = this.displayShadow;

        if (this.displayShadow) {

            // Update the shadow camera rendering bounds to encapsulate the
            // model. We use the bounding sphere of the bounding box for
            // simplicity -- this could be a tighter fit.
            const sphere = bbox.getBoundingSphere(new THREE.Sphere());
            const minmax = sphere.radius;
            const cam = dirLight.shadow.camera;
            cam.left = cam.bottom = -minmax;
            cam.right = cam.top = minmax;

            // Update the camera to focus on the center of the model so the
            // shadow can encapsulate it
            const offset = dirLight.position.clone().sub(dirLight.target.position);
            dirLight.target.position.copy(center);
            dirLight.position.copy(center).add(offset);

            cam.updateProjectionMatrix();

        }

    }

    _scheduleLoad() {

        // if our current model is already what's being requested
        // or has been loaded then early out
        if (this._prevload === `${ this.package }|${ this.urdf }`) return;
        this._prevload = `${ this.package }|${ this.urdf }`;

        // if we're already waiting on a load then early out
        if (this._loadScheduled) return;
        this._loadScheduled = true;

        if (this.robot) {

            this.robot.traverse(c => c.dispose && c.dispose());
            this.robot.parent.remove(this.robot);
            this.robot = null;

        }

        requestAnimationFrame(() => {

            this._loadUrdf(this.package, this.urdf);
            this._loadScheduled = false;

        });

    }

    // Watch the package and urdf field and load the robot model.
    // This should _only_ be called from _scheduleLoad because that
    // ensures the that current robot has been removed
    _loadUrdf(pkg, urdf) {

        this.dispatchEvent(new CustomEvent('urdf-change', { bubbles: true, cancelable: true, composed: true }));

        if (urdf) {

            // Keep track of this request and make
            // sure it doesn't get overwritten by
            // a subsequent one
            this._requestId++;
            const requestId = this._requestId;

            const updateMaterials = mesh => {

                mesh.traverse(c => {

                    if (c.isMesh) {

                        c.castShadow = true;
                        c.receiveShadow = true;

                        if (c.material) {

                            const mats =
                                (Array.isArray(c.material) ? c.material : [c.material])
                                    .map(m => {

                                        if (m instanceof THREE.MeshBasicMaterial) {

                                            m = new THREE.MeshPhongMaterial();

                                        }

                                        if (m.map) {

                                            m.map.colorSpace = THREE.SRGBColorSpace;

                                        }

                                        return m;

                                    });
                            c.material = mats.length === 1 ? mats[0] : mats;

                        }

                    }

                });

            };

            if (pkg.includes(':') && (pkg.split(':')[1].substring(0, 2)) !== '//') {
                // E.g. pkg = "pkg_name: path/to/pkg_name, pk2: path2/to/pk2"}

                // Convert pkg(s) into a map. E.g.
                // { "pkg_name": "path/to/pkg_name",
                //   "pk2":      "path2/to/pk2"      }

                pkg = pkg.split(',').reduce((map, value) => {

                    const split = value.split(/:/).filter(x => !!x);
                    const pkgName = split.shift().trim();
                    const pkgPath = split.join(':').trim();
                    map[pkgName] = pkgPath;

                    return map;

                }, {});
            }

            let robot = null;
            const manager = new THREE.LoadingManager();
            manager.onLoad = () => {

                // If another request has come in to load a new
                // robot, then ignore this one
                if (this._requestId !== requestId) {

                    robot.traverse(c => c.dispose && c.dispose());
                    return;

                }

                this.robot = robot;
                this.world.add(robot);
                updateMaterials(robot);

                this._setIgnoreLimits(this.ignoreLimits);
                this._updateCollisionVisibility();

                this.dispatchEvent(new CustomEvent('urdf-processed', { bubbles: true, cancelable: true, composed: true }));
                this.dispatchEvent(new CustomEvent('geometry-loaded', { bubbles: true, cancelable: true, composed: true }));

                this.recenter();

            };

            if (this.urlModifierFunc) {

                manager.setURLModifier(this.urlModifierFunc);

            }

            const loader = new URDFLoader(manager);
            loader.packages = pkg;
            loader.loadMeshCb = this.loadMeshFunc;
            loader.fetchOptions = { mode: 'cors', credentials: 'same-origin' };
            loader.parseCollision = true;
            loader.load(urdf, model => robot = model);

        }

    }

    _updateCollisionVisibility() {

        const showCollision = this.showCollision;
        const collisionMaterial = this._collisionMaterial;
        const robot = this.robot;

        if (robot === null) return;

        const colliders = [];
        robot.traverse(c => {

            if (c.isURDFCollider) {

                c.visible = showCollision;
                colliders.push(c);

            }

        });

        colliders.forEach(coll => {

            coll.traverse(c => {

                if (c.isMesh) {

                    c.raycast = emptyRaycast;
                    c.material = collisionMaterial;
                    c.castShadow = false;

                }

            });

        });

    }

    // Watch the coordinate frame and update the
    // rotation of the scene to match
    _setUp(up) {

        if (!up) up = '+Z';
        up = up.toUpperCase();
        const sign = up.replace(/[^-+]/g, '')[0] || '+';
        const axis = up.replace(/[^XYZ]/gi, '')[0] || 'Z';

        const PI = Math.PI;
        const HALFPI = PI / 2;
        if (axis === 'X') this.world.rotation.set(0, 0, sign === '+' ? HALFPI : -HALFPI);
        if (axis === 'Z') this.world.rotation.set(sign === '+' ? -HALFPI : HALFPI, 0, 0);
        if (axis === 'Y') this.world.rotation.set(sign === '+' ? 0 : PI, 0, 0);

    }

    // Updates the current robot's angles to ignore
    // joint limits or not
    _setIgnoreLimits(ignore, dispatch = false) {

        if (this.robot) {

            Object
                .values(this.robot.joints)
                .forEach(joint => {

                    joint.ignoreLimits = ignore;
                    joint.setJointValue(...joint.jointValue);

                });

        }

        if (dispatch) {

            this.dispatchEvent(new CustomEvent('ignore-limits-change', { bubbles: true, cancelable: true, composed: true }));

        }

    }

    // 🏭 공장 환경 맵 생성 함수
    createFactoryEnvironment() {
        const envScene = new THREE.Scene();
        
        // 공장 천장 조명 시뮬레이션
        const ceilingGeometry = new THREE.PlaneGeometry(200, 200);
        const ceilingMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x404040,
            side: THREE.DoubleSide 
        });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.position.y = 50;
        ceiling.rotation.x = Math.PI / 2;
        envScene.add(ceiling);
        
        // 공장 벽면
        const wallGeometry = new THREE.PlaneGeometry(200, 100);
        const wallMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x2a2a2a,
            side: THREE.DoubleSide 
        });
        
        // 4개 벽면 추가
        for (let i = 0; i < 4; i++) {
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(
                Math.cos(i * Math.PI / 2) * 100,
                25,
                Math.sin(i * Math.PI / 2) * 100
            );
            wall.rotation.y = i * Math.PI / 2;
            envScene.add(wall);
        }
        
        // 공장 바닥
        const floorGeometry = new THREE.PlaneGeometry(200, 200);
        const floorMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x1a1a1a,
            side: THREE.DoubleSide 
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        envScene.add(floor);
        
        return envScene;
    }

    // ✨ 개선된 공장 파티클 시스템 생성
    createFactoryParticles(scene) {
        const particleCount = 150; // 파티클 수 증가
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // 더 자연스러운 위치 분포
            positions[i3] = (Math.random() - 0.5) * 25;
            positions[i3 + 1] = Math.random() * 12 + 1; // 바닥에서 약간 위
            positions[i3 + 2] = (Math.random() - 0.5) * 25;
            
            // 다양한 속도 (위로 떠오르는 효과)
            velocities[i3] = (Math.random() - 0.5) * 0.008;
            velocities[i3 + 1] = Math.random() * 0.01 + 0.002; // 위로 상승
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.008;
            
            // 다양한 크기
            sizes[i] = Math.random() * 0.03 + 0.01;
            
            // 다양한 색상 (먼지, 증기 등)
            const colorType = Math.random();
            if (colorType < 0.6) {
                // 먼지 (회색 계열)
                colors[i3] = 0.4 + Math.random() * 0.3;
                colors[i3 + 1] = 0.4 + Math.random() * 0.3;
                colors[i3 + 2] = 0.4 + Math.random() * 0.3;
            } else if (colorType < 0.8) {
                // 증기 (흰색 계열)
                colors[i3] = 0.8 + Math.random() * 0.2;
                colors[i3 + 1] = 0.8 + Math.random() * 0.2;
                colors[i3 + 2] = 0.8 + Math.random() * 0.2;
            } else {
                // 미세한 스파크 (노란색 계열)
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.8 + Math.random() * 0.2;
                colors[i3 + 2] = 0.3 + Math.random() * 0.3;
            }
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.02,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            vertexColors: true, // 개별 색상 사용
            sizeAttenuation: true // 거리에 따른 크기 조절
        });
        
        const particleSystem = new THREE.Points(particles, particleMaterial);
        scene.add(particleSystem);
        
        // ✨ 개선된 파티클 애니메이션
        this.animateParticles = () => {
            const positions = particleSystem.geometry.attributes.position.array;
            const velocities = particleSystem.geometry.attributes.velocity.array;
            const colors = particleSystem.geometry.attributes.color.array;
            const time = Date.now() * 0.001;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                
                // 위치 업데이트
                positions[i3] += velocities[i3];
                positions[i3 + 1] += velocities[i3 + 1];
                positions[i3 + 2] += velocities[i3 + 2];
                
                // 미세한 흔들림 효과 (공기 흐름)
                positions[i3] += Math.sin(time + i * 0.1) * 0.002;
                positions[i3 + 2] += Math.cos(time + i * 0.1) * 0.002;
                
                // 색상 변화 (스파크 효과)
                if (colors[i3] > 0.9) { // 스파크 파티클
                    colors[i3 + 1] = 0.8 + Math.sin(time * 10 + i) * 0.2;
                }
                
                // 경계 체크 및 리셋 (더 자연스럽게)
                if (positions[i3 + 1] > 15 || 
                    Math.abs(positions[i3]) > 15 || 
                    Math.abs(positions[i3 + 2]) > 15) {
                    
                    positions[i3] = (Math.random() - 0.5) * 25;
                    positions[i3 + 1] = Math.random() * 2 + 1;
                    positions[i3 + 2] = (Math.random() - 0.5) * 25;
                    
                    // 새로운 속도 할당
                    velocities[i3] = (Math.random() - 0.5) * 0.008;
                    velocities[i3 + 1] = Math.random() * 0.01 + 0.002;
                    velocities[i3 + 2] = (Math.random() - 0.5) * 0.008;
                }
            }
            
            particleSystem.geometry.attributes.position.needsUpdate = true;
            particleSystem.geometry.attributes.color.needsUpdate = true;
        };
    }

};

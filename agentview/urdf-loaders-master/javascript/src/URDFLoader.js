import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { URDFRobot, URDFJoint, URDFLink, URDFCollider, URDFVisual, URDFMimicJoint } from './URDFClasses.js';

/*
Reference coordinate frames for THREE.js and ROS.
Both coordinate systems are right handed so the URDF is instantiated without
frame transforms. The resulting model can be rotated to rectify the proper up,
right, and forward directions

THREE.js
   Y
   |
   |
   .-----X
 ／
Z

ROS URDf
       Z
       |   X
       | ／
 Y-----.

*/

const tempQuaternion = new THREE.Quaternion();
const tempEuler = new THREE.Euler();

// take a vector "x y z" and process it into
// an array [x, y, z]
function processTuple(val) {

    if (!val) return [0, 0, 0];
    return val.trim().split(/\s+/g).map(num => parseFloat(num));

}

// applies a rotation a threejs object in URDF order
function applyRotation(obj, rpy, additive = false) {

    // if additive is true the rotation is applied in
    // addition to the existing rotation
    if (!additive) obj.rotation.set(0, 0, 0);

    tempEuler.set(rpy[0], rpy[1], rpy[2], 'ZYX');
    tempQuaternion.setFromEuler(tempEuler);
    tempQuaternion.multiply(obj.quaternion);
    obj.quaternion.copy(tempQuaternion);

}

/* URDFLoader Class */
// Loads and reads a URDF file into a THREEjs Object3D format
export default
class URDFLoader {

    constructor(manager) {

        this.manager = manager || THREE.DefaultLoadingManager;
        this.loadMeshCb = this.defaultMeshLoader.bind(this);
        this.parseVisual = true;
        this.parseCollision = false;
        this.packages = '';
        this.workingPath = '';
        this.fetchOptions = {};

    }

    /* Public API */
    loadAsync(urdf) {

        return new Promise((resolve, reject) => {

            this.load(urdf, resolve, null, reject);

        });

    }

    // urdf:    The path to the URDF within the package OR absolute
    // onComplete:      Callback that is passed the model once loaded
    load(urdf, onComplete, onProgress, onError) {

        // Check if a full URI is specified before
        // prepending the package info
        const manager = this.manager;
        const workingPath = THREE.LoaderUtils.extractUrlBase(urdf);
        const urdfPath = this.manager.resolveURL(urdf);

        manager.itemStart(urdfPath);

        fetch(urdfPath, this.fetchOptions)
            .then(res => {

                if (res.ok) {

                    if (onProgress) {

                        onProgress(null);

                    }
                    return res.text();

                } else {

                    throw new Error(`URDFLoader: Failed to load url '${ urdfPath }' with error code ${ res.status } : ${ res.statusText }.`);

                }

            })
            .then(data => {

                const model = this.parse(data, this.workingPath || workingPath);
                onComplete(model);
                manager.itemEnd(urdfPath);

            })
            .catch(e => {

                if (onError) {

                    onError(e);

                } else {

                    console.error('URDFLoader: Error loading file.', e);

                }
                manager.itemError(urdfPath);
                manager.itemEnd(urdfPath);

            });

    }

    parse(content, workingPath = this.workingPath) {

        const packages = this.packages;
        const loadMeshCb = this.loadMeshCb;
        const parseVisual = this.parseVisual;
        const parseCollision = this.parseCollision;
        const manager = this.manager;
        const linkMap = {};
        const jointMap = {};
        const materialMap = {};

        // Resolves the path of mesh files
        function resolvePath(path) {

            if (!/^package:\/\//.test(path)) {

                return workingPath ? workingPath + path : path;

            }

            // Remove "package://" keyword and split meshPath at the first slash
            const [targetPkg, relPath] = path.replace(/^package:\/\//, '').split(/\/(.+)/);

            if (typeof packages === 'string') {

                // "pkg" is one single package
                if (packages.endsWith(targetPkg)) {

                    // "pkg" is the target package
                    return packages + '/' + relPath;

                } else {

                    // Assume "pkg" is the target package's parent directory
                    return packages + '/' + targetPkg + '/' + relPath;

                }

            } else if (packages instanceof Function) {

                return packages(targetPkg) + '/' + relPath;

            } else if (typeof packages === 'object') {

                // "pkg" is a map of packages
                if (targetPkg in packages) {

                    return packages[targetPkg] + '/' + relPath;

                } else {

                    console.error(`URDFLoader : ${ targetPkg } not found in provided package list.`);
                    return null;

                }

            }

        }

        // Process the URDF text format
        function processUrdf(data) {

            let children;
            if (data instanceof Document) {

                children = [ ...data.children ];

            } else if (data instanceof Element) {

                children = [ data ];

            } else {

                const parser = new DOMParser();
                const urdf = parser.parseFromString(data, 'text/xml');
                children = [ ...urdf.children ];

            }

            const robotNode = children.filter(c => c.nodeName === 'robot').pop();
            return processRobot(robotNode);

        }

        // Process the <robot> node
        function processRobot(robot) {

            const robotNodes = [ ...robot.children ];
            const links = robotNodes.filter(c => c.nodeName.toLowerCase() === 'link');
            const joints = robotNodes.filter(c => c.nodeName.toLowerCase() === 'joint');
            const materials = robotNodes.filter(c => c.nodeName.toLowerCase() === 'material');
            const obj = new URDFRobot();

            obj.robotName = robot.getAttribute('name');
            obj.urdfRobotNode = robot;

            // Create the <material> map
            materials.forEach(m => {

                const name = m.getAttribute('name');
                materialMap[name] = processMaterial(m);

            });

            // Create the <link> map
            const visualMap = {};
            const colliderMap = {};
            links.forEach(l => {

                const name = l.getAttribute('name');
                const isRoot = robot.querySelector(`child[link="${ name }"]`) === null;
                linkMap[name] = processLink(l, visualMap, colliderMap, isRoot ? obj : null);

            });

            // Create the <joint> map
            joints.forEach(j => {

                const name = j.getAttribute('name');
                jointMap[name] = processJoint(j);

            });

            obj.joints = jointMap;
            obj.links = linkMap;
            obj.colliders = colliderMap;
            obj.visual = visualMap;

            // Link up mimic joints
            const jointList = Object.values(jointMap);
            jointList.forEach(j => {

                if (j instanceof URDFMimicJoint) {

                    jointMap[j.mimicJoint].mimicJoints.push(j);

                }

            });

            // Detect infinite loops of mimic joints
            jointList.forEach(j => {

                const uniqueJoints = new Set();
                const iterFunction = joint => {

                    if (uniqueJoints.has(joint)) {

                        throw new Error('URDFLoader: Detected an infinite loop of mimic joints.');

                    }

                    uniqueJoints.add(joint);
                    joint.mimicJoints.forEach(j => {

                        iterFunction(j);

                    });

                };

                iterFunction(j);
            });

            obj.frames = {
                ...colliderMap,
                ...visualMap,
                ...linkMap,
                ...jointMap,
            };

            return obj;

        }

        // Process joint nodes and parent them
        function processJoint(joint) {

            const children = [ ...joint.children ];
            const jointType = joint.getAttribute('type');

            let obj;

            const mimicTag = children.find(n => n.nodeName.toLowerCase() === 'mimic');
            if (mimicTag) {

                obj = new URDFMimicJoint();
                obj.mimicJoint = mimicTag.getAttribute('joint');
                obj.multiplier = parseFloat(mimicTag.getAttribute('multiplier') || 1.0);
                obj.offset = parseFloat(mimicTag.getAttribute('offset') || 0.0);

            } else {

                obj = new URDFJoint();

            }

            obj.urdfNode = joint;
            obj.name = joint.getAttribute('name');
            obj.urdfName = obj.name;
            obj.jointType = jointType;

            let parent = null;
            let child = null;
            let xyz = [0, 0, 0];
            let rpy = [0, 0, 0];

            // Extract the attributes
            children.forEach(n => {

                const type = n.nodeName.toLowerCase();
                if (type === 'origin') {

                    xyz = processTuple(n.getAttribute('xyz'));
                    rpy = processTuple(n.getAttribute('rpy'));

                } else if (type === 'child') {

                    child = linkMap[n.getAttribute('link')];

                } else if (type === 'parent') {

                    parent = linkMap[n.getAttribute('link')];

                } else if (type === 'limit') {

                    obj.limit.lower = parseFloat(n.getAttribute('lower') || obj.limit.lower);
                    obj.limit.upper = parseFloat(n.getAttribute('upper') || obj.limit.upper);

                }
            });

            // Join the links
            parent.add(obj);
            obj.add(child);
            applyRotation(obj, rpy);
            obj.position.set(xyz[0], xyz[1], xyz[2]);

            // Set up the rotate function
            const axisNode = children.filter(n => n.nodeName.toLowerCase() === 'axis')[0];

            if (axisNode) {

                const axisXYZ = axisNode.getAttribute('xyz').split(/\s+/g).map(num => parseFloat(num));
                obj.axis = new THREE.Vector3(axisXYZ[0], axisXYZ[1], axisXYZ[2]);
                obj.axis.normalize();

            }

            return obj;

        }

        // Process the <link> nodes
        function processLink(link, visualMap, colliderMap, target = null) {

            if (target === null) {

                target = new URDFLink();

            }

            const children = [ ...link.children ];
            target.name = link.getAttribute('name');
            target.urdfName = target.name;
            target.urdfNode = link;

            if (parseVisual) {

                const visualNodes = children.filter(n => n.nodeName.toLowerCase() === 'visual');
                visualNodes.forEach(vn => {

                    const v = processLinkElement(vn, materialMap);
                    target.add(v);

                    if (vn.hasAttribute('name')) {

                        const name = vn.getAttribute('name');
                        v.name = name;
                        v.urdfName = name;
                        visualMap[name] = v;

                    }

                });

            }

            if (parseCollision) {

                const collisionNodes = children.filter(n => n.nodeName.toLowerCase() === 'collision');
                collisionNodes.forEach(cn => {

                    const c = processLinkElement(cn);
                    target.add(c);

                    if (cn.hasAttribute('name')) {

                        const name = cn.getAttribute('name');
                        c.name = name;
                        c.urdfName = name;
                        colliderMap[name] = c;

                    }

                });

            }

            return target;

        }

        function processMaterial(node) {

            const matNodes = [ ...node.children ];
            const materialName = node.getAttribute('name') || '';
            
            // 🎨 재질별 표면 처리 차별화
            let material;
            
            if (materialName.includes('Anodized') || materialName.includes('StainlessSteel')) {
                // 🔧 아노다이징/스테인리스 스틸 - 고급 메탈릭 표면
                material = new THREE.MeshStandardMaterial();
                material.metalness = 0.85; // 높은 금속성 (메탈릭)
                material.roughness = 0.15; // 낮은 거칠기 (유광)
                material.clearcoat = 0.4;  // 높은 클리어코트 (광택)
                material.clearcoatRoughness = 0.05;
            } else if (materialName.includes('CastIron') || materialName.includes('HardAnodized')) {
                // 🏗️ 주철/하드아노다이징 - 밝은 세미 메탈릭 (SCARA 베이스 포함)
                material = new THREE.MeshStandardMaterial();
                material.metalness = 0.6;  // 적당한 금속성
                material.roughness = 0.4;  // 세미 유광
                material.clearcoat = 0.15; // 적당한 광택
                // SCARA 베이스를 위한 밝기 보정
                if (materialName.includes('CastIron')) {
                    material.emissive.setHex(0x0a0a0a); // 약간의 발광으로 밝기 증가
                    material.emissiveIntensity = 0.15;
                }
            } else if (materialName.includes('Titanium') || materialName.includes('Precision')) {
                // ⚙️ 티타늄/정밀 부품 - 밝은 프리미엄 메탈릭 (SCARA 지지대 포함)
                material = new THREE.MeshStandardMaterial();
                material.metalness = 0.8;  // 높은 금속성
                material.roughness = 0.2;  // 낮은 거칠기 (유광)
                material.clearcoat = 0.3;  // 적당한 클리어코트
                // SCARA 지지대를 위한 밝기 보정
                if (materialName.includes('Precision')) {
                    material.emissive.setHex(0x111111); // 약간의 발광으로 밝기 증가
                    material.emissiveIntensity = 0.1;
                }
            } else if (materialName.includes('Carbon')) {
                // 🖤 카본파이버 - 복합재료
                material = new THREE.MeshStandardMaterial();
                material.metalness = 0.1;  // 비금속 유지
                material.roughness = 0.4;  // 높인 거칠기
                material.clearcoat = 0.2;  // 줄인 광택
                material.clearcoatRoughness = 0.2;
           } else if (materialName.includes('Proximity') || materialName.includes('Pneumatic')) {
               // 🤖 센서/공압 - 플라스틱 재질
               material = new THREE.MeshStandardMaterial();
               material.metalness = 0.0;  // 비금속
               material.roughness = 0.6;  // 높은 거칠기 (무광)
               material.clearcoat = 0.0;  // 광택 없음
           } else if (materialName.includes('Robot') || materialName.includes('Arm') || 
                      materialName.includes('RobotArmBlue') || materialName.includes('CastIronBlack') || 
                      materialName.includes('CautionYellow_ISO')) {
               // 🏭 SCARA 로봇 - 원래 설계대로 금속 재질 복원
               material = new THREE.MeshStandardMaterial();
               material.metalness = 0.6;  // 중간 금속성 (알루미늄/강철)
               material.roughness = 0.4;  // 적당한 거칠기 (세미 유광)
               material.clearcoat = 0.2;  // 약간의 클리어코트
            } else if (materialName.includes('Engineering')) {
                // 🔬 엔지니어링 플라스틱 - 무광 플라스틱
                material = new THREE.MeshStandardMaterial();
                material.metalness = 0.0;  // 비금속
                material.roughness = 0.6;  // 높인 거칠기
                material.clearcoat = 0.05; // 최소 광택
            } else if (materialName.includes('Gripper') || materialName.includes('Emergency') || materialName.includes('ISO')) {
                // ⚠️ 그리퍼/안전 부품 - 무광 안전 재질
                material = new THREE.MeshStandardMaterial();
                material.metalness = 0.0;  // 비금속
                material.roughness = 0.7;  // 높은 거칠기
                material.clearcoat = 0.0;  // 광택 없음
            } else if (materialName.includes('Conveyor')) {
                // 🔗 컨베이어 벨트 - 산업용 고무
                material = new THREE.MeshStandardMaterial();
                material.metalness = 0.0;  // 비금속
                material.roughness = 0.9;  // 매우 높은 거칠기
                material.clearcoat = 0.0;  // 광택 없음
            } else if (materialName.includes('IndustrialSteel')) {
                // 🏭 산업용 강철 - 베이스 구조용
                material = new THREE.MeshStandardMaterial();
                material.metalness = 0.7;  // 높은 금속성
                material.roughness = 0.3;  // 적당한 거칠기
                material.clearcoat = 0.2;  // 약간의 광택
                material.clearcoatRoughness = 0.1;
                material.emissive.setHex(0x0a0a0a); // 약간의 발광
                material.emissiveIntensity = 0.1;
            } else {
                // 기본 재질 - 차분한 StandardMaterial
                material = new THREE.MeshStandardMaterial();
                material.metalness = 0.0;
                material.roughness = 0.6;  // 높인 거칠기
                material.clearcoat = 0.05; // 최소 광택
            }

            material.name = materialName;
            
            matNodes.forEach(n => {

                const type = n.nodeName.toLowerCase();
                if (type === 'color') {

                    const rgba =
                        n
                            .getAttribute('rgba')
                            .split(/\s/g)
                            .map(v => parseFloat(v));

                    material.color.setRGB(rgba[0], rgba[1], rgba[2]);
                    material.opacity = rgba[3];
                    material.transparent = rgba[3] < 1;
                    material.depthWrite = !material.transparent;

                } else if (type === 'texture') {

                    // The URDF spec does not require that the <texture/> tag include
                    // a filename attribute so skip loading the texture if not provided.
                    const filename = n.getAttribute('filename');
                    if (filename) {

                        const loader = new THREE.TextureLoader(manager);
                        const filePath = resolvePath(filename);
                        material.map = loader.load(filePath);
                        material.map.colorSpace = THREE.SRGBColorSpace;

                    }

                }
            });

            // 🔧 메탈릭 재질 속성 설정 (모든 재질에 적용)
            if (material.isMeshStandardMaterial) {
                // 환경 반사 강화 (메탈릭 효과를 위해)
                material.envMapIntensity = material.metalness > 0.6 ? 1.0 : 0.4;
                
                // 그림자 품질 향상
                material.shadowSide = THREE.DoubleSide;
                
                // 밝기 톤 통일을 위한 추가 설정
                material.emissive.setHex(0x000000); // 발광 없음으로 통일
                material.emissiveIntensity = 0.0;   // 발광 강도 0으로 통일
                
               // SCARA 로봇 특별 처리 (원래 금속 재질로 복원)
               if (materialName.includes('Robot') || materialName.includes('Arm') || 
                   materialName.includes('RobotArmBlue') || materialName.includes('CastIronBlack') || 
                   materialName.includes('CautionYellow_ISO')) {
                   material.envMapIntensity = 0.6;  // 적당한 환경 반사 (금속)
                   // 이미 위에서 설정된 금속 속성 유지
                   // metalness: 0.6, roughness: 0.4, clearcoat: 0.2
               }
            }
            
            // 🎨 개선된 Phong 재질 설정
            if (material.isMeshPhongMaterial) {
                material.emissive.setHex(0x000000);
                material.shininess = 50; // 더 높은 광택도
                material.specular.setHex(0x222222); // 적절한 반사광
                
                // 재질별 특화 설정
                if (materialName.includes('Metal') || materialName.includes('Steel')) {
                    material.shininess = 80;
                    material.specular.setHex(0x444444);
                } else if (materialName.includes('Plastic')) {
                    material.shininess = 20;
                    material.specular.setHex(0x111111);
                }
            }
            
            // 🌟 Lambert 재질을 Phong으로 업그레이드
            if (material.isMeshLambertMaterial) {
                const phongMaterial = new THREE.MeshPhongMaterial({
                    color: material.color,
                    map: material.map,
                    shininess: 30,
                    specular: 0x222222,
                    transparent: material.transparent,
                    opacity: material.opacity
                });
                return phongMaterial;
            }

            return material;

        }

        // Process the visual and collision nodes into meshes
        function processLinkElement(vn, materialMap = {}) {

            const isCollisionNode = vn.nodeName.toLowerCase() === 'collision';
            const children = [ ...vn.children ];
            let material = null;

            // get the material first
            const materialNode = children.filter(n => n.nodeName.toLowerCase() === 'material')[0];
            if (materialNode) {

                const name = materialNode.getAttribute('name');
                if (name && name in materialMap) {

                    material = materialMap[name];

                } else {

                    material = processMaterial(materialNode);

                }

            } else {

                material = new THREE.MeshPhongMaterial();

            }

            const group = isCollisionNode ? new URDFCollider() : new URDFVisual();
            group.urdfNode = vn;

            children.forEach(n => {

                const type = n.nodeName.toLowerCase();
                if (type === 'geometry') {

                    const geoType = n.children[0].nodeName.toLowerCase();
                    if (geoType === 'mesh') {

                        const filename = n.children[0].getAttribute('filename');
                        const filePath = resolvePath(filename);

                        // file path is null if a package directory is not provided.
                        if (filePath !== null) {

                            const scaleAttr = n.children[0].getAttribute('scale');
                            if (scaleAttr) {

                                const scale = processTuple(scaleAttr);
                                group.scale.set(scale[0], scale[1], scale[2]);

                            }

                            loadMeshCb(filePath, manager, (obj, err) => {

                                if (err) {

                                    console.error('URDFLoader: Error loading mesh.', err);

                                } else if (obj) {

                                    if (obj instanceof THREE.Mesh) {

                                        obj.material = material;

                                    }

                                    // We don't expect non identity rotations or positions. In the case of
                                    // COLLADA files the model might come in with a custom scale for unit
                                    // conversion.
                                    obj.position.set(0, 0, 0);
                                    obj.quaternion.identity();
                                    group.add(obj);

                                }

                            });

                        }

                    } else if (geoType === 'box') {

                        const primitiveModel = new THREE.Mesh();
                        primitiveModel.geometry = new THREE.BoxGeometry(1, 1, 1);
                        primitiveModel.material = material;

                        const size = processTuple(n.children[0].getAttribute('size'));
                        primitiveModel.scale.set(size[0], size[1], size[2]);

                        group.add(primitiveModel);

                    } else if (geoType === 'sphere') {

                        const primitiveModel = new THREE.Mesh();
                        primitiveModel.geometry = new THREE.SphereGeometry(1, 30, 30);
                        primitiveModel.material = material;

                        const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                        primitiveModel.scale.set(radius, radius, radius);

                        group.add(primitiveModel);

                    } else if (geoType === 'cylinder') {

                        const primitiveModel = new THREE.Mesh();
                        primitiveModel.geometry = new THREE.CylinderGeometry(1, 1, 1, 30);
                        primitiveModel.material = material;

                        const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                        const length = parseFloat(n.children[0].getAttribute('length')) || 0;
                        primitiveModel.scale.set(radius, length, radius);
                        primitiveModel.rotation.set(Math.PI / 2, 0, 0);

                        group.add(primitiveModel);

                    }

                } else if (type === 'origin') {

                    const xyz = processTuple(n.getAttribute('xyz'));
                    const rpy = processTuple(n.getAttribute('rpy'));

                    group.position.set(xyz[0], xyz[1], xyz[2]);
                    group.rotation.set(0, 0, 0);
                    applyRotation(group, rpy);

                }

            });

            return group;

        }

        return processUrdf(content);

    }

    // Default mesh loading function
    defaultMeshLoader(path, manager, done) {

        if (/\.stl$/i.test(path)) {

            const loader = new STLLoader(manager);
            loader.load(path, geom => {
                const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial());
                done(mesh);
            });

        } else if (/\.dae$/i.test(path)) {

            const loader = new ColladaLoader(manager);
            loader.load(path, dae => done(dae.scene));

        } else {

            console.warn(`URDFLoader: Could not load model at ${ path }.\nNo loader available`);

        }

    }

};

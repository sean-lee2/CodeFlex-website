/* globals */
import * as THREE from 'three';
import { registerDragEvents } from './dragAndDrop.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import URDFManipulator from '../../src/urdf-manipulator-element.js';
import URDFLoader from '../../src/URDFLoader.js';

// Physics engine import (dynamic import for optional loading)
let CANNON = null;

customElements.define('urdf-viewer', URDFManipulator);

// 전역 변수 선언 (URDF 뷰어 초기화용)
// 모듈 시스템 도입 시 제거 예정
const viewer = document.querySelector('urdf-viewer');

// WebSocket connection
let robotWebSocket = null;

// 🏭 공장 로딩 화면 제어 함수
function showFactoryLoading() {
    const loadingScreen = document.getElementById('factory-loading');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
        console.log('🏭 Factory loading screen shown');
    }
}

function hideFactoryLoading() {
    const loadingScreen = document.getElementById('factory-loading');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            console.log('🏭 Factory loading screen hidden');
        }, 200); // 0.2초 후 빠르게 숨김
    }
}

function updateLoadingText(text) {
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = text;
        console.log(`📝 Loading text updated: ${text}`);
    }
}

// Tab functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('🤖 WADF Robot Control System initialized');
    
    // 성능 모니터링 자동 시작
    setTimeout(() => {
        wadfStartPerformanceMonitoring();
        console.log('📊 Performance monitoring auto-started');
    }, 1000); // 1초 후 자동 시작
    
    // 테마 토글 기능
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            themeToggle.textContent = newTheme === 'dark' ? '🌙' : '☀️';
            localStorage.setItem('theme', newTheme);
            console.log(`🎨 Theme switched to: ${newTheme}`);
        });
        
        // 저장된 테마 로드
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    }
    
    // 프로그래스 바 초기화 (DOM 로드 후)
    setTimeout(() => {
        initializeProgressBar();
        generateGripperTest2Buttons(); // GRIPPER_TEST2 버튼 동적 생성
        console.log('📊 Progress bar initialization completed');
    }, 2000); // 2초 후 초기화
    
    // 🏭 로딩 화면 표시 및 최소 시간 추적
    const loadingStartTime = Date.now();
    showFactoryLoading();
    
    // URDF 뷰어 초기화 대기 (빠른 초기화)
    setTimeout(() => {
        const viewer = document.querySelector('urdf-viewer');
        if (viewer) {
            console.log('URDF Viewer found and initialized');
            
            // 뷰어 이벤트 리스너 설정 - 실제 모델 로딩 완료 감지
            let urdfProcessed = false;
            let geometryLoaded = false;
            
            viewer.addEventListener('urdf-processed', () => {
                console.log('📋 URDF file processed');
                urdfProcessed = true;
                updateLoadingText('🔧 CodeFlex - Loading 3D Models...');
                checkLoadingComplete();
            });
            
            viewer.addEventListener('geometry-loaded', () => {
                console.log('🎯 3D Geometry loaded successfully');
                geometryLoaded = true;
                updateLoadingText('🏭 CodeFlex Factory System Ready!');
                
                // 🔧 공압 장치 초기 위치 설정
                setTimeout(() => {
                    initializePneumaticDevices();
                }, 500); // 0.5초 후 초기화 (뷰어 완전 준비 대기)
                
                checkLoadingComplete();
            });
            
            function checkLoadingComplete() {
                if (urdfProcessed && geometryLoaded) {
                    console.log('✅ All systems ready - checking minimum loading time');
                    updateLoadingText('🚀 CodeFlex System Ready!');
                    
                    // 최소 1.5초 로딩 시간 보장
                    const elapsedTime = Date.now() - loadingStartTime;
                    const minLoadingTime = 1500; // 1.5초
                    const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
                    
                    console.log(`⏱️ Elapsed: ${elapsedTime}ms, Remaining: ${remainingTime}ms`);
                    
                    setTimeout(() => {
                        hideFactoryLoading();
                    }, remainingTime + 300); // 남은 시간 + 0.3초 여유
                }
            }
        } else {
            console.error('URDF Viewer not found');
            // 에러 시에도 최소 1.5초 보장
            const elapsedTime = Date.now() - loadingStartTime;
            const minLoadingTime = 1500;
            const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
            
            setTimeout(() => {
                hideFactoryLoading();
            }, remainingTime);
        }
    }, 100); // 0.1초로 단축
    
    // 최대 3초 후 강제로 로딩 화면 숨김 (안전장치)
    setTimeout(() => {
        console.log('⚠️ Loading timeout - forcing hide');
        updateLoadingText('🏭 CodeFlex System Ready');
        
        // 타임아웃 시에도 최소 1.5초 보장
        const elapsedTime = Date.now() - loadingStartTime;
        const minLoadingTime = 1500;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        setTimeout(() => {
            hideFactoryLoading();
        }, remainingTime);
    }, 3000);
    // 탭 전환 기능
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 모든 탭과 컨텐츠에서 active 제거
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // 클릭된 탭과 해당 컨텐츠를 active로 설정
            tab.classList.add('active');
            const targetTab = tab.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // WADF 디바이스 제어 버튼 기능 (Tab 1)
    const controlButtons = document.querySelectorAll('.control-btn');
    
    controlButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            
            // WebSocket 연결 버튼은 토글 처리
            if (button.id === 'websocket-connect') {
                toggleWebSocketConnection();
                return;
            }
            
                   // data-action이 있는 경우만 처리
                   if (action) {
                       // 비상 정지 및 시스템 제어 명령 처리
                       if (action === 'emergency-stop' || action === 'reset-all') {
                           executeSystemCommand(action, button);
                       } else {
                           executeRobotCommand(action, button);
                       }
                   } else {
                       console.warn('Button missing data-action attribute:', button);
                   }
        });
    });
    
    // 센서 시뮬레이션 시작
    simulateSensorReadings();
    
    // WebSocket 연결 버튼은 위에서 처리됨

    // Joint sliders를 올바른 위치로 이동
    const originalSliderContainer = document.querySelector('#controls ul');
    const newSliderContainer = document.querySelector('#joint-sliders');
    if (originalSliderContainer && newSliderContainer) {
        // 기존 슬라이더들을 새 위치로 이동 (나중에 생성될 예정)
    }
});

// WADF 디바이스 상태 저장 (실제 WADF DeviceDriverDefinition.py 기반)
const wadfDevices = {
    // WADF 모드 관리 (VirtualMode, ActualMode, DigitalTwinMode)
    mode: {
        current: 'VirtualMode',  // 기본값: VirtualMode
        available: ['VirtualMode', 'ActualMode', 'DigitalTwinMode'],
        description: {
            'VirtualMode': '가상 시뮬레이션 모드',
            'ActualMode': '실제 장비 제어 모드', 
            'DigitalTwinMode': '하이브리드 모드 (가상+실제)'
        }
    },
    // WADF 성능 모니터링 (WPF 기반)
    performance: {
        cycleTime: {
            startTime: null,
            endTime: null,
            current: 0,
            average: 0,
            history: []
        },
        idleTime: {
            total: 0,
            current: 0,
            history: []
        },
        productivity: {
            totalProduction: 100,  // 목표 생산량
            currentProduction: 0,   // 현재 생산량
            percentage: 0
        },
        monitoring: {
            enabled: true,
            updateInterval: 500,   // 500ms마다 업데이트
            lastUpdate: null
        }
    },
    // SCARARobot - jointId=[6,7,9,8,10,12]
    scara: {
        connected: false,
        powered: false,
        currentProgram: 0,
        position: { theta1: 0, theta2: 0, theta3: 0, d1: 0, d2: 0, d3: 0 },
        // WADF->URDF 조인트 매핑
        jointMapping: {
            6: 'Rotation_31',    // theta1 - Base rotation
            7: 'Rotation_36',    // theta2 - Shoulder rotation
            9: 'Rotation_151',   // theta3 - Wrist rotation  
            8: 'Slider_44',      // d1 - Z axis (prismatic)
            10: 'Slider_41',     // d2 - Gripper Left
            12: 'Slider_42'      // d3 - Gripper Right
        }
    },
    // DigitalOutputDevices - DO_PINS=[5,6,4,3]
    pneumatics: {
        assemblyBlock: { 
            state: false, 
            pin: 5, 
            joints: ['Slider_17', 'Slider_20'],  // PalletBlock_11, PalletBlock_21
            activePosition: 0.5
        },
        partPusher1: { 
            state: false, 
            pin: 6, 
            joints: ['Slider_25'],  // Pusher2_11
            activePosition: 0.3
        },
        partPusher2: { 
            state: false, 
            pin: 4, 
            joints: ['Slider_26'],  // Pusher2_21
            activePosition: 0.3
        },
        engraving: { 
            state: false, 
            pin: 3, 
            joints: ['Slider_41', 'Slider_42'],  // 그리퍼로 시뮬레이션
            activePosition: 0.2
        }
    },
    // DigitalInputDevices - DI_PINS=[2,3,4] 
    sensors: {
        palletIn: { 
            value: false, 
            pin: 2,
            name: 'PalletInSensor'
        },
        palletOut: { 
            value: false, 
            pin: 3,
            name: 'PalletOutSensor'
        },
        assembly: { 
            value: false, 
            pin: 4,
            name: 'AssemblySensor'
        }
    },
    // Conveyor
    conveyor: { 
        running: false, 
        direction: 'forward',
        speed: 50 
    }
};

// 🚨 시스템 제어 명령 실행 함수 (비상 정지, 리셋)
function executeSystemCommand(action, button) {
    console.log(`🚨 System command: ${action}`);
    
    // 버튼 상태 업데이트
    if (button) {
        button.disabled = true;
        const originalText = button.textContent;
        
        if (action === 'emergency-stop') {
            button.textContent = 'STOPPING...';
            button.style.backgroundColor = '#ff4444';
        } else if (action === 'reset-all') {
            button.textContent = 'RESETTING...';
            button.style.backgroundColor = '#ff8800';
        }
        
        // 3초 후 버튼 복구
        setTimeout(() => {
            button.disabled = false;
            button.textContent = originalText;
            button.style.backgroundColor = '';
        }, 3000);
    }
    
    // WebSocket으로 시스템 명령 전송
    if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
        const message = {
            type: 'system_command',
            action: action,
            timestamp: new Date().toISOString()
        };
        
        robotWebSocket.send(JSON.stringify(message));
        console.log(`📤 WebSocket system command sent: ${action}`);
        
        // 즉시 UI 상태 업데이트
        if (action === 'emergency-stop') {
            updateUIStatus('🚨 EMERGENCY STOP ACTIVATED - Stopping all sequences');
            
            // 모든 WebSocket 애니메이션 즉시 중단
            Object.keys(webSocketAnimations).forEach(joint => {
                if (webSocketAnimations[joint]) {
                    cancelAnimationFrame(webSocketAnimations[joint]);
                    delete webSocketAnimations[joint];
                }
            });
            
            console.log('🚨 All WebSocket animations cancelled immediately');
            
        } else if (action === 'reset-all') {
            updateUIStatus('🔄 System reset in progress...');
        }
        
    } else {
        console.warn('⚠️ WebSocket not connected - System command failed');
        updateUIStatus(`❌ System command failed: WebSocket not connected`);
        
        // 로컬 폴백 (기본 동작)
        if (action === 'emergency-stop') {
            // 로컬 비상 정지 시뮬레이션
            updateUIStatus('🚨 LOCAL Emergency Stop (WebSocket offline)');
            
            // 모든 애니메이션 중단
            Object.keys(webSocketAnimations).forEach(joint => {
                if (webSocketAnimations[joint]) {
                    cancelAnimationFrame(webSocketAnimations[joint]);
                    delete webSocketAnimations[joint];
                }
            });
            
            // 홈 포지션으로 이동
            if (viewer.setJointValue) {
                const homeJoints = ['Rotation_31', 'Rotation_36', 'Rotation_151', 'Slider_44', 'Slider_41', 'Slider_42'];
                homeJoints.forEach(joint => {
                    viewer.setJointValue(joint, 0);
                });
            }
            
        } else if (action === 'reset-all') {
            // 로컬 리셋 시뮬레이션
            updateUIStatus('🔄 LOCAL System Reset (WebSocket offline)');
            
            // 공압 장치 초기화 호출
            if (typeof initializePneumaticDevices === 'function') {
                initializePneumaticDevices();
            }
        }
    }
}

// WADF 디바이스 제어 함수 (실제 WADF 정의 기반)
function executeRobotCommand(action, button) {
    if (!viewer.setJointValue) {
        console.log('URDF Robot not loaded yet');
        return;
    }

    console.log(`Executing WADF command: ${action}`);

    switch(action) {
        // SCARARobot Control
        case 'scara-connect':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                // WebSocket으로 명령 전송
                robotWebSocket.send(JSON.stringify({
                    type: 'robot_command',
                    action: 'scara-connect'
                }));
            } else {
                // 기존 방식으로 실행
                wadfScaraConnect();
            }
            break;
        case 'scara-power-on':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'robot_command',
                    action: 'scara-power-on'
                }));
            } else {
                wadfScaraPower(true);
            }
            break;
        case 'scara-power-off':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'robot_command',
                    action: 'scara-power-off'
                }));
            } else {
                wadfScaraPower(false);
            }
            break;
        case 'scara-home':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'robot_command',
                    action: 'scara-home'
                }));
            } else {
                wadfScaraHome();
            }
            break;
        case 'scara-program-1':
        case 'scara-program-2':
        case 'scara-program-3':
        case 'scara-program-4':
        case 'scara-program-5':
        case 'scara-program-6':
        case 'scara-program-7':
        case 'scara-program-8':
            const programNum = parseInt(action.split('-')[2]);
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'robot_command',
                    action: action,
                    program: programNum
                }));
            } else {
                wadfScaraRunProgram(programNum);
            }
            break;
        case 'scara-test':
            wadfScaraRunProgram('TEST');  // 테스트 시퀀스 실행
            break;
        
        // DigitalOutputDevices - Pneumatic Actuators (WADF 기반)
        case 'assembly-block':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'pneumatic_command',
                    action: 'toggle',
                    device: 'assemblyBlock'
                }));
            } else {
                wadfTogglePneumatic('assemblyBlock'); // 폴백
            }
            break;
        case 'engraving-actuator':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'pneumatic_command',
                    action: 'toggle',
                    device: 'engraving'
                }));
            } else {
                wadfTogglePneumatic('engraving'); // 폴백
            }
            break;
        case 'part-pusher-1':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'pneumatic_command',
                    action: 'toggle',
                    device: 'partPusher1'
                }));
            } else {
                wadfTogglePneumatic('partPusher1'); // 폴백
            }
            break;
        case 'part-pusher-2':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'pneumatic_command',
                    action: 'toggle',
                    device: 'partPusher2'
                }));
            } else {
                wadfTogglePneumatic('partPusher2'); // 폴백
            }
            break;
            
        // Conveyor Control (WebSocket 기반)
        case 'conveyor-power':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'conveyor_command',
                    action: 'toggle_power'
                }));
            } else {
                wadfToggleConveyor(); // 폴백
            }
            break;
        case 'conveyor-direction':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'conveyor_command',
                    action: 'toggle_direction'
                }));
            } else {
                wadfReverseConveyor(); // 폴백
            }
            break;
            
        // DigitalInputDevices - Sensor Monitoring (WebSocket 기반)
        case 'pallet-in-sensor':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'sensor_command',
                    action: 'check',
                    sensor: 'palletIn'
                }));
            } else {
                wadfCheckSensor('palletIn'); // 폴백
            }
            break;
        case 'pallet-out-sensor':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'sensor_command',
                    action: 'check',
                    sensor: 'palletOut'
                }));
            } else {
                wadfCheckSensor('palletOut'); // 폴백
            }
            break;
            
        // SCARA Advanced Programs (GRIPPER_TEST2 시리즈)
        case 'scara-gripper-test2-01':
        case 'scara-gripper-test2-02':
        case 'scara-gripper-test2-03':
        case 'scara-gripper-test2-04':
        case 'scara-gripper-test2-05':
        case 'scara-gripper-test2-06':
        case 'scara-gripper-test2-07':
        case 'scara-gripper-test2-08':
        case 'scara-gripper-test2-09':
        case 'scara-gripper-test2-10':
        case 'scara-gripper-test2-11':
        case 'scara-gripper-test2-12':
        case 'scara-gripper-test2-13':
        case 'scara-gripper-test2-14':
        case 'scara-gripper-test2-15':
        case 'scara-gripper-test2-16':
        case 'scara-gripper-test2-17':
        case 'scara-gripper-test2-18':
        case 'scara-gripper-test2-19':
        case 'scara-gripper-test2-20':
        case 'scara-gripper-test2-21':
            const gNum = parseInt(action.split('-')[3]);
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'gripper_command',
                    action: action,
                    test_number: gNum
                }));
            } else {
                wadfScaraRunGripperTest2(gNum);
            }
            break;
        case 'scara-full-sequence':
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'full_sequence_command',
                    action: 'scara-full-sequence'
                }));
            } else {
                wadfRunFullAssemblySequence();
            }
            break;
        
        // Workpart Management (새로 설계 예정)
        case 'create-pallet':
            console.log('🔄 Workpart system is being redesigned...');
            break;
        case 'create-lego':
            console.log('🔄 Workpart system is being redesigned...');
            break;
        case 'remove-pallet':
            console.log('🔄 Workpart system is being redesigned...');
            break;
        case 'remove-lego':
            console.log('🔄 Workpart system is being redesigned...');
            break;
        case 'remove-all-workparts':
            console.log('🔄 Workpart system is being redesigned...');
            break;
            
        // WADF Mode Control
        case 'switch-mode':
            const mode = event.target.dataset.mode;
            wadfSwitchMode(mode);
            // UI 업데이트
            document.getElementById('current-mode').textContent = `Current Mode: ${mode}`;
            // 모드 버튼 활성화 상태 업데이트
            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.mode === mode) {
                    btn.classList.add('active');
                }
            });
            break;
            
        // Performance Monitoring
        case 'start-performance':
            wadfStartPerformanceMonitoring();
            break;
        case 'stop-performance':
            wadfStopPerformanceMonitoring();
            break;
            
        // System Control
        case 'emergency-stop':
            wadfEmergencyStopAll();
            break;
        case 'reset-all':
            wadfResetAllDevices();
            break;
            
        default:
            console.log(`Unknown WADF command: ${action}`);
    }
}

// WADF 기반 함수들 (DeviceDriverDefinition.py 대응)
function wadfScaraConnect() {
    wadfDevices.scara.connected = true;
    console.log('WADF SCARA Robot connected (Virtual Mode)');
    updateUIStatus('WADF SCARA: Connected');
    
    // 버튼 활성화 상태 설정
    setButtonActiveByAction('scara-connect', true);
    
    // URDF에서 SCARA 로봇 관련 조인트 활성화 표시
    if (viewer.robot) {
        console.log('WADF SCARA visual feedback activated');
    }
}

function wadfScaraPower(powerOn) {
    if (!wadfDevices.scara.connected) {
        console.log('WADF SCARA not connected. Connect first.');
        return;
    }
    
    wadfDevices.scara.powered = powerOn;
    console.log(`WADF SCARA Power: ${powerOn ? 'ON' : 'OFF'} (Virtual Mode)`);
    updateUIStatus(`WADF SCARA: Power ${powerOn ? 'ON' : 'OFF'}`);
    
    // 버튼 활성화 상태 설정
    setButtonActiveByAction('scara-power-on', powerOn);
    setButtonActiveByAction('scara-power-off', !powerOn);
    
    if (powerOn) {
        console.log('WADF SCARA power ON - enabling joint controls');
    } else {
        console.log('WADF SCARA power OFF - disabling joint controls');
        resetAllJoints();
    }
}

function wadfScaraHome() {
    if (!wadfDevices.scara.powered) {
        console.log('WADF SCARA not powered. Turn on power first.');
        return;
    }
    
    console.log('WADF SCARA moving to home position (Virtual Mode)');
    updateUIStatus('WADF SCARA: Moving to Home');
    
    // WADF SCARARobot jointId=[6,7,9,8,10,12] 매핑 사용
    if (viewer.setJointValue) {
        viewer.setJointValue('Rotation_31', 0);  // jointId 6
        viewer.setJointValue('Rotation_36', 0);  // jointId 7  
        viewer.setJointValue('Rotation_151', 0); // jointId 9
        viewer.setJointValue('Slider_44', 0);    // jointId 8
        viewer.setJointValue('Slider_41', 0);    // jointId 10
        viewer.setJointValue('Slider_42', 0);    // jointId 12
    }
}

function wadfScaraRunProgram(programNumber) {
    if (!wadfDevices.scara.powered) {
        console.log('WADF SCARA not powered. Turn on power first.');
        return;
    }
    
    wadfDevices.scara.currentProgram = programNumber;
    console.log(`WADF SCARA executing program ${programNumber} (Virtual Mode)`);
    updateUIStatus(`WADF SCARA: Running Program ${programNumber}`);
    
    // WADF 프로그램별 시퀀스 실행 (SCARARobot.py 대응)
    wadfExecuteScaraSequence(programNumber);
}

function wadfScaraRunGripperTest2(gNum) {
    if (!wadfDevices.scara.powered) {
        console.log('WADF SCARA not powered. Turn on power first.');
        return;
    }
    
    console.log(`🤖 WADF SCARA executing GRIPPER_TEST2_${gNum.toString().padStart(2, '0')} (Virtual Mode)`);
    updateUIStatus(`WADF SCARA: GRIPPER_TEST2_${gNum.toString().padStart(2, '0')}`);
    
    // GRIPPER_TEST2 시리즈 실행
    wadfExecuteGripperTest2(gNum);
}

// WADF 모드 전환 함수
function wadfSwitchMode(newMode) {
    if (!wadfDevices.mode.available.includes(newMode)) {
        console.log(`WADF Mode ${newMode} not supported`);
        return;
    }
    
    const oldMode = wadfDevices.mode.current;
    wadfDevices.mode.current = newMode;
    
    console.log(`WADF Mode switched: ${oldMode} -> ${newMode}`);
    console.log(`Description: ${wadfDevices.mode.description[newMode]}`);
    updateUIStatus(`WADF Mode: ${newMode} - ${wadfDevices.mode.description[newMode]}`);
    
    // 모드별 초기화
    if (newMode === 'DigitalTwinMode') {
        console.log('🔗 DigitalTwin Mode: Virtual + Actual device control enabled');
        // WebSocket 연결 확인
        if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
            console.log('✅ WebSocket connection available for actual device control');
        } else {
            console.log('⚠️ WebSocket not connected - DigitalTwin mode limited to virtual only');
        }
    }
}

// WADF 성능 모니터링 함수들
let performanceInterval = null; // 전역 변수로 인터벌 관리

function wadfStartPerformanceMonitoring() {
    wadfDevices.performance.monitoring.enabled = true;
    console.log('📊 WADF Performance monitoring started');
    updateUIStatus('WADF Performance: Monitoring Started');
    
    // 버튼 활성화 상태 설정
    setButtonActiveByAction('start-performance', true);
    setButtonActiveByAction('stop-performance', false);
    
    // 기존 인터벌이 있다면 정리
    if (performanceInterval) {
        clearInterval(performanceInterval);
    }
    
    // 주기적 성능 업데이트
    performanceInterval = setInterval(() => {
        if (wadfDevices.performance.monitoring.enabled) {
            wadfUpdatePerformanceMetrics();
        }
    }, wadfDevices.performance.monitoring.updateInterval);
}

function wadfStopPerformanceMonitoring() {
    wadfDevices.performance.monitoring.enabled = false;
    console.log('📊 WADF Performance monitoring stopped');
    updateUIStatus('WADF Performance: Monitoring Stopped');
    
    // 버튼 활성화 상태 리셋
    setButtonActiveByAction('start-performance', false);
    setButtonActiveByAction('stop-performance', true);
    
    // 인터벌 정리
    if (performanceInterval) {
        clearInterval(performanceInterval);
        performanceInterval = null;
    }
}

function wadfUpdatePerformanceMetrics() {
    const now = Date.now();
    const perf = wadfDevices.performance;
    
    // 사이클 타임 업데이트
    if (perf.cycleTime.startTime && !perf.cycleTime.endTime) {
        perf.cycleTime.current = (now - perf.cycleTime.startTime) / 1000; // 초 단위
    }
    
    // 생산성 계산
    perf.productivity.percentage = (perf.productivity.currentProduction / perf.productivity.totalProduction) * 100;
    
    // 평균 사이클 타임 계산
    if (perf.cycleTime.history.length > 0) {
        const sum = perf.cycleTime.history.reduce((a, b) => a + b, 0);
        perf.cycleTime.average = sum / perf.cycleTime.history.length;
    }
    
    // UI 업데이트
    updatePerformanceDisplay();
    
    // 콘솔 로그 (디버깅용)
    console.log(`📊 Performance Update - Cycle: ${perf.cycleTime.current.toFixed(2)}s, Production: ${perf.productivity.currentProduction}/${perf.productivity.totalProduction} (${perf.productivity.percentage.toFixed(1)}%)`);
    
    perf.monitoring.lastUpdate = now;
}

function wadfStartCycle() {
    wadfDevices.performance.cycleTime.startTime = Date.now();
    wadfDevices.performance.cycleTime.endTime = null;
    console.log('📊 WADF Cycle started - Performance monitoring active');
}

function wadfEndCycle() {
    const now = Date.now();
    wadfDevices.performance.cycleTime.endTime = now;
    
    if (wadfDevices.performance.cycleTime.startTime) {
        const cycleTime = (now - wadfDevices.performance.cycleTime.startTime) / 1000;
        wadfDevices.performance.cycleTime.history.push(cycleTime);
        wadfDevices.performance.cycleTime.current = cycleTime;
        
        // 생산량 증가
        wadfDevices.performance.productivity.currentProduction++;
        
        console.log(`📊 WADF Cycle completed - Time: ${cycleTime.toFixed(2)}s, Production: ${wadfDevices.performance.productivity.currentProduction}`);
        updateUIStatus(`WADF Cycle: ${cycleTime.toFixed(2)}s, Production: ${wadfDevices.performance.productivity.currentProduction}`);
    }
}

function updatePerformanceDisplay() {
    const perf = wadfDevices.performance;
    
    // 성능 지표를 UI에 표시
    const performanceElements = {
        'cycle-time-current': perf.cycleTime.current.toFixed(2) + 's',
        'cycle-time-average': perf.cycleTime.average.toFixed(2) + 's',
        'productivity-current': perf.productivity.currentProduction,
        'productivity-total': perf.productivity.totalProduction,
        'productivity-percentage': perf.productivity.percentage.toFixed(1) + '%'
    };
    
    Object.entries(performanceElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`📊 UI Updated: ${id} = ${value}`);
        } else {
            console.warn(`⚠️ Performance element not found: ${id}`);
        }
    });
    
    // 추가 디버깅 정보
    console.log(`📊 Performance Display - Current: ${perf.cycleTime.current.toFixed(2)}s, Average: ${perf.cycleTime.average.toFixed(2)}s, Production: ${perf.productivity.currentProduction}/${perf.productivity.totalProduction}`);
}

// 프로그래스 바 제어 함수들
function initializeProgressBar() {
    const stepIndicators = document.getElementById('step-indicators');
    if (!stepIndicators) {
        console.error('❌ step-indicators element not found!');
        return;
    }
    
    console.log('📊 Initializing progress bar...');
    
    // 기존 표시기 제거
    stepIndicators.innerHTML = '';
    
    // 21개 단계 표시기 생성 (GRIPPER_TEST2_01~21)
    for (let i = 1; i <= 21; i++) {
        const indicator = document.createElement('div');
        indicator.className = 'step-indicator';
        indicator.textContent = i;
        indicator.id = `step-${i}`;
        stepIndicators.appendChild(indicator);
    }
    
    console.log('📊 Progress bar initialized with 21 steps');
    
    // 초기 상태 설정
    updateExecutionStatus('offline', 'Ready');
    updateProgressBar(0, 21, '');
}

function updateExecutionStatus(status, program = 'Ready') {
    const statusElement = document.getElementById('current-program');
    const indicatorElement = document.getElementById('execution-status-indicator');
    
    console.log(`📊 Updating execution status: ${status} - ${program}`);
    
    if (statusElement) {
        statusElement.textContent = program;
        console.log(`📊 Status text updated: ${program}`);
    } else {
        console.error('❌ current-program element not found!');
    }
    
    if (indicatorElement) {
        indicatorElement.className = 'status-indicator';
        switch(status) {
            case 'running':
                indicatorElement.classList.add('online');
                break;
            case 'warning':
                indicatorElement.classList.add('warning');
                break;
            case 'error':
                indicatorElement.classList.add('error');
                break;
            default:
                indicatorElement.classList.add('offline');
        }
        console.log(`📊 Status indicator updated: ${status}`);
    } else {
        console.error('❌ execution-status-indicator element not found!');
    }
}

function updateProgressBar(step, total, description = '') {
    const progressFill = document.getElementById('execution-progress');
    const progressText = document.getElementById('progress-text');
    const progressPercentage = document.getElementById('progress-percentage');
    
    const percentage = Math.round((step / total) * 100);
    
    console.log(`📊 Updating progress bar: ${step}/${total} (${percentage}%) - ${description}`);
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
        console.log(`📊 Progress fill updated: ${percentage}%`);
    } else {
        console.error('❌ execution-progress element not found!');
    }
    
    if (progressText) {
        progressText.textContent = `Step ${step}/${total} ${description}`;
        console.log(`📊 Progress text updated: Step ${step}/${total} ${description}`);
    } else {
        console.error('❌ progress-text element not found!');
    }
    
    if (progressPercentage) {
        progressPercentage.textContent = `${percentage}%`;
        console.log(`📊 Progress percentage updated: ${percentage}%`);
    } else {
        console.error('❌ progress-percentage element not found!');
    }
    
    // 단계별 표시기 업데이트
    updateStepIndicators(step, total);
    
    console.log(`📊 Progress: ${step}/${total} (${percentage}%) - ${description}`);
}

function updateStepIndicators(currentStep, totalSteps) {
    for (let i = 1; i <= totalSteps; i++) {
        const indicator = document.getElementById(`step-${i}`);
        if (indicator) {
            indicator.className = 'step-indicator';
            
            if (i < currentStep) {
                indicator.classList.add('completed');
            } else if (i === currentStep) {
                indicator.classList.add('active');
            }
        }
    }
}

function resetProgressBar() {
    console.log('📊 Resetting progress bar...');
    updateProgressBar(0, 21, '');
    updateExecutionStatus('offline', 'Ready');
    
    // 모든 단계 표시기 리셋
    for (let i = 1; i <= 21; i++) {
        const indicator = document.getElementById(`step-${i}`);
        if (indicator) {
            indicator.className = 'step-indicator';
        }
    }
    
    console.log('📊 Progress bar reset completed');
}

// WebSocket 메시지에서 프로그래스 바 업데이트
function updateWebSocketProgress(message) {
    // "WADF Step X:" 패턴에서 단계 번호 추출
    const stepMatch = message.match(/WADF Step (\d+):/);
    if (stepMatch) {
        const stepNumber = parseInt(stepMatch[1]);
        const totalSteps = 21; // GRIPPER_TEST2_01~21 총 21단계
        
        // 단계 설명 추출
        const description = message.replace(/WADF Step \d+:\s*/, '');
        
        console.log(`📊 WebSocket Progress: Step ${stepNumber}/${totalSteps} - ${description}`);
        updateProgressBar(stepNumber, totalSteps, description);
    }
}

// 버튼 활성화 상태 관리 함수들
function setButtonActive(buttonSelector, isActive = true) {
    const button = document.querySelector(buttonSelector);
    if (button) {
        if (isActive) {
            button.classList.add('active');
            console.log(`🔘 Button activated: ${buttonSelector}`);
        } else {
            button.classList.remove('active');
            console.log(`⚪ Button deactivated: ${buttonSelector}`);
        }
    }
}

function setButtonActiveByAction(action, isActive = true) {
    const button = document.querySelector(`[data-action="${action}"]`);
    if (button) {
        if (isActive) {
            button.classList.add('active');
            console.log(`🔘 Button activated: ${action}`);
        } else {
            button.classList.remove('active');
            console.log(`⚪ Button deactivated: ${action}`);
        }
    }
}

function clearAllButtonStates() {
    // 상태 유지 버튼들은 제외하고 리셋
    const statefulButtons = [
        'scara-connect', 'scara-power-on', 'scara-power-off',
        'start-performance', 'stop-performance'
    ];
    
    document.querySelectorAll('.control-btn.active').forEach(btn => {
        const action = btn.getAttribute('data-action');
        if (!statefulButtons.includes(action)) {
            btn.classList.remove('active');
            console.log(`⚪ Cleared non-stateful button: ${action}`);
        }
    });
    console.log('🔄 Non-stateful button states cleared');
}

function clearButtonStatesByCategory(category) {
    const selectors = {
        'scara': ['[data-action="scara-connect"]', '[data-action="scara-power-on"]', '[data-action="scara-power-off"]', '[data-action="scara-home"]'],
        'programs': ['[data-action^="scara-program-"]', '[data-action^="scara-gripper-test2-"]'],
        'pneumatic': ['[data-action="assembly-block"]', '[data-action="engraving-actuator"]', '[data-action="part-pusher-1"]', '[data-action="part-pusher-2"]'],
        'conveyor': ['[data-action="conveyor-power"]', '[data-action="conveyor-direction"]'],
        'sensors': ['[data-action="pallet-in-sensor"]', '[data-action="pallet-out-sensor"]'],
        'performance': ['[data-action="start-performance"]', '[data-action="stop-performance"]'],
        'system': ['[data-action="emergency-stop"]', '[data-action="reset-all"]']
    };
    
    if (selectors[category]) {
        selectors[category].forEach(selector => {
            const button = document.querySelector(selector);
            if (button) {
                button.classList.remove('active');
            }
        });
        console.log(`🔄 Cleared button states for category: ${category}`);
    }
}

// 상태 유지 버튼들을 명시적으로 해제하는 함수
function clearStatefulButtons() {
    const statefulButtons = [
        'scara-connect', 'scara-power-on', 'scara-power-off',
        'start-performance', 'stop-performance'
    ];
    
    statefulButtons.forEach(action => {
        setButtonActiveByAction(action, false);
    });
    
    // Connect to Server 버튼도 해제
    setButtonActive('#websocket-connect', false);
    
    console.log('🔄 All stateful button states cleared');
}

function wadfTogglePneumatic(deviceName) {
    const device = wadfDevices.pneumatics[deviceName];
    if (!device) {
        console.log(`WADF Pneumatic device ${deviceName} not found`);
        return;
    }
    
    const currentMode = wadfDevices.mode.current;
    
    // DigitalTwinMode에서는 가상과 실제를 동시에 제어
    if (currentMode === 'DigitalTwinMode') {
        device.state = !device.state;
        console.log(`WADF ${deviceName}: ${device.state ? 'ON' : 'OFF'} (DigitalTwin Mode - Virtual + Actual)`);
        updateUIStatus(`WADF ${deviceName}: ${device.state ? 'ON' : 'OFF'} (DigitalTwin)`);
        
        // 가상 제어
        if (viewer.setJointValue) {
            device.joints.forEach(joint => {
                const value = device.state ? device.activePosition : 0;
                viewer.setJointValue(joint, value);
            });
        }
        
        // 실제 제어 (WebSocket)
        if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
            robotWebSocket.send(JSON.stringify({
                type: 'pneumatic_command',
                action: 'toggle',
                device: deviceName,
                mode: 'DigitalTwin'
            }));
        }
    } else {
        // VirtualMode 또는 ActualMode
        device.state = !device.state;
        console.log(`WADF ${deviceName}: ${device.state ? 'ON' : 'OFF'} (${currentMode})`);
        updateUIStatus(`WADF ${deviceName}: ${device.state ? 'ON' : 'OFF'} (${currentMode})`);
        
        if (currentMode === 'VirtualMode') {
            // 가상 제어만
            if (viewer.setJointValue) {
                device.joints.forEach(joint => {
                    const value = device.state ? device.activePosition : 0;
                    viewer.setJointValue(joint, value);
                });
            }
        } else if (currentMode === 'ActualMode') {
            // 실제 장비 제어 (WebSocket)
            if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
                robotWebSocket.send(JSON.stringify({
                    type: 'pneumatic_command',
                    action: 'toggle',
                    device: deviceName,
                    mode: 'Actual'
                }));
            }
        }
    }
}

function wadfToggleConveyor() {
    wadfDevices.conveyor.running = !wadfDevices.conveyor.running;
    console.log(`WADF Conveyor: ${wadfDevices.conveyor.running ? 'RUNNING' : 'STOPPED'} (Virtual Mode)`);
    updateUIStatus(`WADF Conveyor: ${wadfDevices.conveyor.running ? 'RUNNING' : 'STOPPED'}`);
}

function wadfReverseConveyor() {
    if (wadfDevices.conveyor.running) {
        wadfDevices.conveyor.direction = wadfDevices.conveyor.direction === 'forward' ? 'reverse' : 'forward';
        console.log(`WADF Conveyor direction: ${wadfDevices.conveyor.direction} (Virtual Mode)`);
        updateUIStatus(`WADF Conveyor: ${wadfDevices.conveyor.direction}`);
    } else {
        console.log('WADF Conveyor not running. Start conveyor first.');
    }
}

function wadfCheckSensor(sensorName) {
    console.log('Checking sensor:', sensorName);
    console.log('Available sensors:', Object.keys(wadfDevices.sensors));
    
    const sensor = wadfDevices.sensors[sensorName];
    if (!sensor) {
        console.log(`WADF Sensor ${sensorName} not found`);
        console.log('Sensor object:', sensor);
        return false;
    }
    
    console.log('Found sensor:', sensor);
    
    // WADF DI_PINS=[2,3,4] 시뮬레이션
    const sensorValue = Math.random() > 0.5; // 랜덤 센서 값
    
    // 안전한 값 할당
    if (typeof sensor === 'object' && sensor !== null) {
        sensor.value = sensorValue;
    } else {
        console.log('Sensor is not a valid object:', typeof sensor, sensor);
        return false;
    }
    
    console.log(`WADF ${sensorName} sensor: ${sensorValue ? 'DETECTED' : 'CLEAR'} (Pin ${sensor.pin})`);
    updateUIStatus(`WADF ${sensorName}: ${sensorValue ? 'DETECTED' : 'CLEAR'}`);
    
    return sensorValue;
}

function wadfEmergencyStopAll() {
    console.log('WADF EMERGENCY STOP ACTIVATED');
    updateUIStatus('WADF: EMERGENCY STOP');
    
    // 프로그래스 바 리셋
    resetProgressBar();
    updateExecutionStatus('error', 'Emergency Stop');
    
    // 모든 WADF 디바이스 정지
    wadfDevices.scara.powered = false;
    wadfDevices.conveyor.running = false;
    
    // 모든 pneumatic 디바이스 OFF
    Object.keys(wadfDevices.pneumatics).forEach(deviceName => {
        wadfDevices.pneumatics[deviceName].state = false;
    });
    
    // URDF 모든 조인트 리셋
    resetAllJoints();
}

function wadfResetAllDevices() {
    console.log('WADF Resetting all devices to initial state');
    updateUIStatus('WADF: Resetting All Devices');
    
    // SCARA 리셋
    wadfDevices.scara.connected = false;
    wadfDevices.scara.powered = false;
    wadfDevices.scara.currentProgram = null;
    
    // 컨베이어 리셋
    wadfDevices.conveyor.running = false;
    wadfDevices.conveyor.direction = 'forward';
    
    // 공압 디바이스 리셋
    Object.keys(wadfDevices.pneumatics).forEach(deviceName => {
        wadfDevices.pneumatics[deviceName].state = false;
    });
    
    // 센서 리셋
    Object.keys(wadfDevices.sensors).forEach(sensorName => {
        wadfDevices.sensors[sensorName].value = false;
    });
    
    // URDF 조인트 리셋
    resetAllJoints();
}

// WADF 보조 함수들
function wadfExecuteScaraSequence(programNumber) {
    const sequences = {
        1: [ // 픽업 시퀀스
            { joint: 'Rotation_31', value: 0.5, delay: 1000 },
            { joint: 'Rotation_36', value: -0.3, delay: 1000 },
            { joint: 'Slider_44', value: -0.1, delay: 500 },
            { joint: 'Slider_41', value: 0.05, delay: 300 },  // 그리퍼 닫기
            { joint: 'Slider_42', value: -0.05, delay: 300 },
            { joint: 'Slider_44', value: 0, delay: 1000 },
            { joint: 'Rotation_31', value: 0, delay: 1000 }
        ],
        2: [ // 배치 시퀀스
            { joint: 'Rotation_31', value: -0.5, delay: 1000 },
            { joint: 'Rotation_36', value: 0.3, delay: 1000 },
            { joint: 'Slider_44', value: -0.1, delay: 500 },
            { joint: 'Slider_41', value: 0, delay: 300 },  // 그리퍼 열기
            { joint: 'Slider_42', value: 0, delay: 300 },
            { joint: 'Slider_44', value: 0, delay: 1000 },
            { joint: 'Rotation_31', value: 0, delay: 1000 }
        ],
        'TEST': [ // 테스트 시퀀스
            { joint: 'Rotation_31', value: 0.2, delay: 500 },
            { joint: 'Rotation_36', value: 0.2, delay: 500 },
            { joint: 'Rotation_151', value: 0.2, delay: 500 },
            { joint: 'Slider_44', value: -0.05, delay: 500 },
            { joint: 'Rotation_31', value: 0, delay: 500 },
            { joint: 'Rotation_36', value: 0, delay: 500 },
            { joint: 'Rotation_151', value: 0, delay: 500 },
            { joint: 'Slider_44', value: 0, delay: 500 }
        ]
    };
    
    const sequence = sequences[programNumber] || sequences['TEST'];
    executeScaraSequence(sequence);
}

function wadfExecuteGripperTest2(gNum) {
    // 실제 WADF SCARARobot.py GRIPPER_TEST2 시리즈 매핑
    const sequences = {
        1: [ // GRIPPER_TEST2_01: Position(-22.3°, 1.4°, 69.3°, 0.0)
            { joint: 'Rotation_31', value: Math.PI * (-22.3) / 180, delay: 1000 },
            { joint: 'Rotation_36', value: Math.PI * 1.4 / 180, delay: 1000 },
            { joint: 'Rotation_151', value: Math.PI * 69.3 / 180, delay: 1000 },
            { joint: 'Slider_44', value: 0.0, delay: 1000 }
        ],
        2: [ // GRIPPER_TEST2_02: Z-axis down (-0.045)
            { joint: 'Slider_44', value: -0.045, delay: 7000 }
        ],
        3: [ // GRIPPER_TEST2_03: Close gripper (0.0135, 0.0135)
            { joint: 'Slider_41', value: 0.0135, delay: 500 },
            { joint: 'Slider_42', value: 0.0135, delay: 500 }
        ],
        4: [ // GRIPPER_TEST2_04: Close gripper (same as 03)
            { joint: 'Slider_41', value: 0.0135, delay: 500 },
            { joint: 'Slider_42', value: 0.0135, delay: 500 }
        ],
        5: [ // GRIPPER_TEST2_05: Wait only
            { delay: 500 }
        ],
        6: [ // GRIPPER_TEST2_06: Wait only
            { delay: 500 }
        ],
        7: [ // GRIPPER_TEST2_07: Z-axis up (0.0)
            { joint: 'Slider_44', value: 0.0, delay: 7000 }
        ],
        8: [ // GRIPPER_TEST2_08: Position(85°, -65°, 200°)
            { joint: 'Rotation_31', value: Math.PI * 85 / 180, delay: 3000 },
            { joint: 'Rotation_36', value: Math.PI * (-65) / 180, delay: 3000 },
            { joint: 'Rotation_151', value: Math.PI * 200 / 180, delay: 3000 }
        ],
        9: [ // GRIPPER_TEST2_09: Z-axis down (-0.02)
            { joint: 'Slider_44', value: -0.02, delay: 2000 }
        ],
        10: [ // GRIPPER_TEST2_10: Z-axis down (-0.04)
            { joint: 'Slider_44', value: -0.04, delay: 2500 }
        ],
        11: [ // GRIPPER_TEST2_11: Wait only
            { delay: 1000 }
        ],
        12: [ // GRIPPER_TEST2_12: Wait only
            { delay: 1000 }
        ],
        13: [ // GRIPPER_TEST2_13: Wait only
            { delay: 1000 }
        ],
        14: [ // GRIPPER_TEST2_14: Wait only
            { delay: 1000 }
        ],
        15: [ // GRIPPER_TEST2_15: Wait only
            { delay: 1000 }
        ],
        16: [ // GRIPPER_TEST2_16: Open gripper (0.0, 0.0) + Release parts
            { joint: 'Slider_41', value: 0.0, delay: 500, action: 'release_parts' },
            { joint: 'Slider_42', value: 0.0, delay: 500 }
        ],
        17: [ // GRIPPER_TEST2_17: Wait only
            { delay: 500 }
        ],
        18: [ // GRIPPER_TEST2_18: Wait only
            { delay: 500 }
        ],
        19: [ // GRIPPER_TEST2_19: Wait only
            { delay: 500 }
        ],
        20: [ // GRIPPER_TEST2_20: Z-axis up (0.0)
            { joint: 'Slider_44', value: 0.0, delay: 3000 }
        ],
        21: [ // GRIPPER_TEST2_21: Home position (0°, 0°, 90°, 0.0)
            { joint: 'Rotation_31', value: 0.0, delay: 3000 },
            { joint: 'Rotation_36', value: 0.0, delay: 3000 },
            { joint: 'Rotation_151', value: Math.PI * 90 / 180, delay: 3000 },
            { joint: 'Slider_44', value: 0.0, delay: 3000 }
        ]
    };
    
    const sequence = sequences[gNum];
    if (sequence) {
        executeScaraSequence(sequence);
    } else {
        console.warn(`GRIPPER_TEST2_${gNum.toString().padStart(2, '0')} not defined - using default sequence`);
    }
}

// WADF 전체 조립 시퀀스 (실제 생산라인 시뮬레이션)
function wadfRunFullAssemblySequence() {
    if (!wadfDevices.scara.powered) {
        console.log('WADF SCARA not powered. Turn on power first.');
        return;
    }

    // Run Full Assembly Sequence 버튼 활성화
    setButtonActiveByAction('scara-full-sequence', true);
    console.log('🚀 Full Assembly Sequence started - button highlighted');
    
    console.log('WADF Starting Full Assembly Sequence (Virtual Production Line)');
    updateUIStatus('WADF: Full Assembly Sequence Started');
    
    // 프로그래스 바 초기화
    console.log('📊 Resetting progress bar...');
    resetProgressBar();
    console.log('📊 Updating execution status to running...');
    updateExecutionStatus('running', 'Full Assembly Sequence');
    
    // 성능 모니터링 자동 시작
    if (!wadfDevices.performance.monitoring.enabled) {
        wadfStartPerformanceMonitoring();
    }
    
    // 사이클 시작
    wadfStartCycle();
    
    let step = 0;
    const sequenceSteps = [
        // Phase 1: Part Detection and Pickup
        { action: 'sensor-check', device: 'palletIn', description: 'Check pallet arrival', delay: 300 },
        { action: 'gripper', program: 1, description: 'GRIPPER_TEST2_01 - Move to pickup position', delay: 1500 },
        { action: 'gripper', program: 2, description: 'GRIPPER_TEST2_02 - Lower to part', delay: 2500 },
        { action: 'gripper', program: 3, description: 'GRIPPER_TEST2_03 - Close gripper', delay: 800 },
        { action: 'gripper', program: 4, description: 'GRIPPER_TEST2_04 - Secure grip', delay: 500 },
        { action: 'gripper', program: 5, description: 'GRIPPER_TEST2_05 - Wait for stabilization', delay: 500 },
        { action: 'gripper', program: 6, description: 'GRIPPER_TEST2_06 - Final grip check', delay: 500 },
        
        // Phase 2: Assembly Preparation
        { action: 'pneumatic', device: 'assemblyBlock', description: 'Activate assembly block', delay: 600 },
        { action: 'gripper', program: 7, description: 'GRIPPER_TEST2_07 - Lift part', delay: 2000 },
        { action: 'gripper', program: 8, description: 'GRIPPER_TEST2_08 - Move to assembly position', delay: 2500 },
        { action: 'gripper', program: 9, description: 'GRIPPER_TEST2_09 - Lower to assembly', delay: 1500 },
        { action: 'gripper', program: 10, description: 'GRIPPER_TEST2_10 - Precise positioning', delay: 1800 },
        
        // Phase 3: Assembly Process
        { action: 'gripper', program: 11, description: 'GRIPPER_TEST2_11 - Assembly wait 1', delay: 1000 },
        { action: 'gripper', program: 12, description: 'GRIPPER_TEST2_12 - Assembly wait 2', delay: 1000 },
        { action: 'gripper', program: 13, description: 'GRIPPER_TEST2_13 - Assembly wait 3', delay: 1000 },
        { action: 'gripper', program: 14, description: 'GRIPPER_TEST2_14 - Assembly wait 4', delay: 1000 },
        { action: 'gripper', program: 15, description: 'GRIPPER_TEST2_15 - Assembly wait 5', delay: 1000 },
        
        // Phase 4: Processing
        { action: 'pneumatic', device: 'engraving', description: 'Activate engraving', delay: 800 },
        { action: 'delay', time: 2000, description: 'Engraving process', delay: 2000 },
        
        // Phase 5: Release and Transport
        { action: 'gripper', program: 16, description: 'GRIPPER_TEST2_16 - Open gripper', delay: 800 },
        { action: 'gripper', program: 17, description: 'GRIPPER_TEST2_17 - Release wait 1', delay: 500 },
        { action: 'gripper', program: 18, description: 'GRIPPER_TEST2_18 - Release wait 2', delay: 500 },
        { action: 'gripper', program: 19, description: 'GRIPPER_TEST2_19 - Release wait 3', delay: 500 },
        { action: 'gripper', program: 20, description: 'GRIPPER_TEST2_20 - Retract Z-axis', delay: 2000 },
        
        // Phase 6: Part Ejection
        { action: 'pneumatic', device: 'partPusher1', description: 'Push completed part (Pusher1)', delay: 1000 },
        { action: 'pneumatic', device: 'partPusher2', description: 'Push completed part (Pusher2)', delay: 1000 },
        
        // Phase 7: Return and Verification
        { action: 'gripper', program: 21, description: 'GRIPPER_TEST2_21 - Return home', delay: 2500 },
        { action: 'sensor-check', device: 'assembly', description: 'Check assembly completion', delay: 300 },
        { action: 'sensor-check', device: 'palletOut', description: 'Confirm part output', delay: 300 },
        { action: 'conveyor', description: 'Move conveyor for next cycle', delay: 3000 }
    ];
    
    function executeNextStep() {
        if (step >= sequenceSteps.length) {
            console.log('WADF Full Assembly Sequence Completed');
            updateUIStatus('WADF: Assembly Sequence Completed');
            
            // 프로그래스 바 완료
            updateProgressBar(sequenceSteps.length, sequenceSteps.length, 'Completed');
            updateExecutionStatus('online', 'Sequence Completed');
            
            // Run Full Assembly Sequence 버튼 비활성화
            setButtonActiveByAction('scara-full-sequence', false);
            console.log('✅ Full Assembly Sequence completed - button highlight removed');
            
            // 성능 모니터링 종료
            wadfEndCycle();
            
            // 모든 디바이스 리셋
            setTimeout(() => {
                if (wadfDevices.pneumatics.assemblyBlock.state) wadfTogglePneumatic('assemblyBlock');
                if (wadfDevices.pneumatics.engraving.state) wadfTogglePneumatic('engraving');  
                if (wadfDevices.pneumatics.partPusher1.state) wadfTogglePneumatic('partPusher1');
                if (wadfDevices.pneumatics.partPusher2.state) wadfTogglePneumatic('partPusher2');
                updateUIStatus('WADF: Ready for next cycle');
            }, 1000);
            return;
        }
        
        const currentStep = sequenceSteps[step];
        console.log(`WADF Sequence Step ${step + 1}: ${currentStep.description}`);
        updateUIStatus(`WADF Step ${step + 1}: ${currentStep.description}`);
        
        // 프로그래스 바 업데이트
        updateProgressBar(step + 1, sequenceSteps.length, currentStep.description);
        
        let delay = currentStep.delay || 1500; // 단계별 맞춤 딜레이 또는 기본값
        
        switch (currentStep.action) {
            case 'sensor-check':
                wadfCheckSensor(currentStep.device);
                break;
                
            case 'gripper':
                wadfScaraRunGripperTest2(currentStep.program);
                break;
                
            case 'pneumatic':
                wadfTogglePneumatic(currentStep.device);
                break;
                
            case 'conveyor':
                if (!wadfDevices.conveyor.running) {
                    wadfToggleConveyor();
                }
                setTimeout(() => wadfToggleConveyor(), Math.min(3000, delay * 0.8)); // 딜레이의 80% 후 정지
                break;
                
            case 'delay':
                // 순수 대기 단계 (engraving process 등)
                break;
        }
        
        step++;
        setTimeout(executeNextStep, Math.max(200, delay / animationSpeedMultiplier)); // 속도 배수 적용
    }
    
    executeNextStep();
}

// SCARA Robot 제어 함수들 (기존 함수들 - WADF 함수들과 분리)
function scaraConnect() {
    wadfDevices.scara.connected = true;
    console.log('SCARA Robot connected (Virtual Mode)');
    updateUIStatus('SCARA: Connected');
    
    // URDF에서 SCARA 로봇 관련 조인트 활성화 표시 (예시)
    if (viewer.robot) {
        // 연결 상태를 시각적으로 표현 (예: 색상 변경 등)
        console.log('SCARA visual feedback activated');
    }
}

function scaraPower(powerOn) {
    if (!wadfDevices.scara.connected) {
        console.log('SCARA not connected. Connect first.');
        return;
    }
    
    wadfDevices.scara.powered = powerOn;
    console.log(`SCARA Power: ${powerOn ? 'ON' : 'OFF'} (Virtual Mode)`);
    updateUIStatus(`SCARA: Power ${powerOn ? 'ON' : 'OFF'}`);
    
    // 전원 상태에 따른 URDF 시각화
    if (powerOn) {
        // 전원 ON 상태 표시
        console.log('SCARA power ON - enabling joint controls');
    } else {
        // 전원 OFF 상태 표시
        console.log('SCARA power OFF - disabling joint controls');
        // 모든 조인트를 홈 포지션으로
        resetAllJoints();
    }
}

function scaraHomePosition() {
    if (!wadfDevices.scara.powered) {
        console.log('SCARA not powered. Turn on power first.');
        return;
    }
    
    console.log('SCARA moving to home position (Virtual Mode)');
    updateUIStatus('SCARA: Moving to Home');
    
    // 실제 SCARA 홈 포지션 설정 (INP3 URDF 실제 조인트명 사용)
    if (viewer.setJointValue) {
        // SCARA 관련 조인트들을 홈 포지션으로 설정
        viewer.setJointValue('Rotation_31', 0);  // Base rotation
        viewer.setJointValue('Rotation_36', 0);  // Shoulder rotation  
        viewer.setJointValue('Slider_44', 0);    // Z-axis (prismatic)
        viewer.setJointValue('Rotation_151', 0); // Wrist rotation
        viewer.setJointValue('Slider_41', 0);    // Gripper finger L
        viewer.setJointValue('Slider_42', 0);    // Gripper finger R
    }
}

function scaraRunProgram(programNumber) {
    if (!wadfDevices.scara.powered) {
        console.log('SCARA not powered. Turn on power first.');
        return;
    }
    
    wadfDevices.scara.currentProgram = programNumber;
    console.log(`SCARA executing program ${programNumber} (Virtual Mode)`);
    updateUIStatus(`SCARA: Running Program ${programNumber}`);
    
    // 프로그램별 시퀀스 실행
    if (programNumber === 1) {
        // 프로그램 1: 픽업 시퀀스
        executeScaraSequence([
            { joint: 'joint_1', value: 0.5, delay: 1000 },
            { joint: 'joint_2', value: -0.3, delay: 1000 },
            { joint: 'joint_5', value: -0.1, delay: 500 },  // Z down
            { joint: 'joint_5', value: 0, delay: 1000 },    // Z up
            { joint: 'joint_1', value: 0, delay: 1000 }     // Return
        ]);
    } else if (programNumber === 2) {
        // 프로그램 2: 배치 시퀀스
        executeScaraSequence([
            { joint: 'joint_1', value: -0.5, delay: 1000 },
            { joint: 'joint_2', value: 0.3, delay: 1000 },
            { joint: 'joint_5', value: -0.1, delay: 500 },
            { joint: 'joint_5', value: 0, delay: 1000 },
            { joint: 'joint_1', value: 0, delay: 1000 }
        ]);
    }
}

function executeScaraSequence(sequence) {
    let index = 0;
    let currentJointValues = {};
    let targetJointValues = {};
    let animationStartTime = 0;
    let animationDuration = 0;
    let isAnimating = false;
    
    function executeNext() {
        if (index < sequence.length) {
            const step = sequence[index];
            
            // URDF 실제 조인트명으로 매핑
            let urdfJoint = step.joint;
            if (step.joint === 'joint_1') urdfJoint = 'Rotation_31';
            if (step.joint === 'joint_2') urdfJoint = 'Rotation_36';
            if (step.joint === 'joint_3') urdfJoint = 'Slider_44';
            if (step.joint === 'joint_4') urdfJoint = 'Rotation_151';
            if (step.joint === 'gripper_l') urdfJoint = 'Slider_41';
            if (step.joint === 'gripper_r') urdfJoint = 'Slider_42';
            
            if (viewer.setJointValue && urdfJoint) {
                // 현재 조인트 값 저장
                currentJointValues[urdfJoint] = viewer.robot?.joints[urdfJoint]?.angle || 0;
                targetJointValues[urdfJoint] = step.value;
                
                // 부드러운 애니메이션 시작 (속도 배수 적용)
                animationStartTime = performance.now();
                animationDuration = (step.delay || 1000) / animationSpeedMultiplier; // 속도 배수 적용
                isAnimating = true;
                activeAnimationCount++;
                
                animateToTarget(urdfJoint);
                
                // 특별한 액션 처리
                if (step.action === 'release_parts') {
                    setTimeout(() => {
                        releasePartFromGripper();
                    }, (step.delay || 1000) * 0.8); // 그리퍼 열린 후 파츠 해제
                }
            }
            
            index++;
            setTimeout(executeNext, Math.max(100, (step.delay || 1000) / animationSpeedMultiplier)); // 최소 100ms
        } else {
            console.log('SCARA sequence completed');
            updateUIStatus('SCARA: Program Completed');
        }
    }
    
    function animateToTarget(jointName) {
        function animate() {
            if (!isAnimating) return;
            
            const currentTime = performance.now();
            const elapsedTime = currentTime - animationStartTime;
            const progress = Math.min(elapsedTime / animationDuration, 1.0);
            
            // Enhanced smooth easing function (cubic ease-in-out)
            const easedProgress = progress < 0.5 
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            if (viewer.setJointValue && currentJointValues[jointName] !== undefined) {
                const currentValue = currentJointValues[jointName];
                const targetValue = targetJointValues[jointName];
                let newValue;
                
                if (useSmoothAnimation) {
                    // 60fps 부드러운 애니메이션
                    newValue = currentValue + (targetValue - currentValue) * easedProgress;
                } else {
                    // 10fps 기존 방식 (즉시 이동)
                    newValue = progress >= 0.9 ? targetValue : currentValue;
                }
                
                viewer.setJointValue(jointName, newValue);
            }
            
            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                // 애니메이션 완료 시 정확한 목표값으로 설정
                if (viewer.setJointValue) {
                    viewer.setJointValue(jointName, targetJointValues[jointName]);
                }
                activeAnimationCount = Math.max(0, activeAnimationCount - 1);
            }
        }
        
        animate();
    }
    
    executeNext();
}

// Pneumatic Actuator 제어 함수들 (WADF Linker 클래스들 대응)
function setPneumaticActuator(device, state) {
    wadfDevices[device].state = state;
    console.log(`${device} set to ${state} (Virtual Mode)`);
    updateUIStatus(`${device}: ${state ? 'ON' : 'OFF'}`);
    
    // 디바이스별 URDF 조인트 제어
    switch(device) {
        case 'assemblyBlock':
            // AssemblyBlockActuator에 대응하는 URDF 조인트
            if (viewer.setJointValue) {
                // Assembly Block Actuator - Pallet Block 조인트들
                viewer.setJointValue('Slider_17', state ? 0.1 : 0);  // PalletBlock_11
                viewer.setJointValue('Slider_20', state ? 0.1 : 0);  // PalletBlock_21
            }
            break;
        case 'engraving':
            // EngravingActuator에 대응하는 URDF 조인트
            if (viewer.setJointValue) {
                // Engraving Actuator - 실제 URDF에는 해당 조인트가 없으므로 그리퍼로 시뮬레이션
                viewer.setJointValue('Slider_41', state ? 0.01 : 0);
                viewer.setJointValue('Slider_42', state ? 0.01 : 0);
            }
            break;
        case 'partPusher1':
            // PartPusher1에 대응하는 URDF 조인트
            if (viewer.setJointValue) {
                // Part Pusher 1 - Pusher2_11 조인트
                viewer.setJointValue('Slider_25', state ? 0.08 : 0);
            }
            break;
        case 'partPusher2':
            // PartPusher2에 대응하는 URDF 조인트
            if (viewer.setJointValue) {
                // Part Pusher 2 - Pusher2_21 조인트
                viewer.setJointValue('Slider_26', state ? 0.08 : 0);
            }
            break;
    }
}

// Conveyor 제어 함수 (WADF Conveyor.py 대응)
function setConveyorPower(powered) {
    wadfDevices.conveyor.powered = powered;
    console.log(`Conveyor Power ${powered ? 'ON' : 'OFF'} (Virtual Mode)`);
    updateUIStatus(`Conveyor: Power ${powered ? 'ON' : 'OFF'}`);
    
    // 컨베이어 벨트 애니메이션
    if (powered && viewer.setJointValue) {
        // 컨베이어 회전 애니메이션 시작
        startConveyorAnimation();
    } else {
        // 컨베이어 정지
        stopConveyorAnimation();
    }
}

let conveyorAnimationId = null;

function startConveyorAnimation() {
    if (conveyorAnimationId) return; // 이미 실행중이면 중단
    
    let rotation = 0;
    function animate() {
        if (!wadfDevices.conveyor.powered) return; // 전원이 OFF면 중단
        
        rotation += 0.05;
        if (viewer.setJointValue) {
            // Conveyor는 실제 URDF에서 fixed joint이므로 시각적 효과만
            // 다른 움직이는 부품으로 컨베이어 동작을 시뮬레이션할 수 있음
            console.log('Conveyor belt rotating...', rotation);
        }
        
        conveyorAnimationId = requestAnimationFrame(animate);
    }
    animate();
}

function stopConveyorAnimation() {
    if (conveyorAnimationId) {
        cancelAnimationFrame(conveyorAnimationId);
        conveyorAnimationId = null;
    }
}

// 추가 Pneumatic Actuator 제어 함수들
function setAdditionalPneumatic(device, state) {
    wadfDevices.additionalPneumatics[device].state = state;
    console.log(`${device} set to ${state} (Virtual Mode)`);
    updateUIStatus(`${device}: ${state ? 'ON' : 'OFF'}`);
    
    // 디바이스별 URDF 조인트 제어
    switch(device) {
        case 'palletBlock':
            if (viewer.setJointValue) {
                viewer.setJointValue('pallet_block_joint', state ? 0.1 : 0);
            }
            break;
        case 'palletGripper':
            if (viewer.setJointValue) {
                // Pallet Block 조인트들로 시뮬레이션
                viewer.setJointValue('Slider_17', state ? 0.05 : 0);
                viewer.setJointValue('Slider_20', state ? 0.05 : 0);
            }
            break;
        case 'partGripperL':
            if (viewer.setJointValue) {
                // SCARA 그리퍼 Left 조인트
                viewer.setJointValue('Slider_41', state ? 0.01 : 0);
            }
            break;
        case 'partGripperR':
            if (viewer.setJointValue) {
                // SCARA 그리퍼 Right 조인트
                viewer.setJointValue('Slider_42', state ? 0.01 : 0);
            }
            break;
    }
}

// SCARA 고급 프로그램 실행 함수 (실제 WADF SCARARobot.py의 프로그램들)
function scaraRunAdvancedProgram(programName) {
    if (!wadfDevices.scara.powered) {
        console.log('SCARA not powered. Turn on power first.');
        return;
    }
    
    console.log(`SCARA executing advanced program: ${programName} (Virtual Mode)`);
    updateUIStatus(`SCARA: Running ${programName}`);
    
    // 실제 WADF 프로그램에 맞는 시퀀스 실행
    switch(programName) {
        case 'GRIPPER_TEST2_01':
            // Pick & Place 동작
            executeScaraSequence([
                { joint: 'joint_1', value: -0.389, delay: 1000 },  // -22.3도
                { joint: 'joint_2', value: 0.024, delay: 1000 },   // 1.4도  
                { joint: 'joint_3', value: 1.209, delay: 1000 },   // 69.3도
                { joint: 'joint_5', value: 0, delay: 1000 }        // Z축 홈
            ]);
            break;
            
        case 'GRIPPER_TEST2_02':
            // Z축 하강
            executeScaraSequence([
                { joint: 'joint_5', value: -0.045, delay: 7000 }
            ]);
            break;
            
        case 'GRIPPER_TEST2_03':
            // 그리퍼 닫기
            executeScaraSequence([
                { joint: 'gripper_l', value: 0.0135, delay: 500 },
                { joint: 'gripper_r', value: 0.0135, delay: 500 }
            ]);
            break;
            
        case 'GRIPPER_TEST2_21':
            // 홈 위치로 복귀
            executeScaraSequence([
                { joint: 'joint_1', value: 0, delay: 3000 },
                { joint: 'joint_2', value: 0, delay: 3000 },
                { joint: 'joint_3', value: 1.571, delay: 3000 },   // 90도
                { joint: 'joint_5', value: 0, delay: 3000 }
            ]);
            break;
    }
}

// 전체 조립 시퀀스 실행 함수
function scaraRunFullSequence() {
    if (!wadfDevices.scara.powered) {
        console.log('SCARA not powered. Turn on power first.');
        return;
    }
    
    console.log('SCARA executing full assembly sequence (Virtual Mode)');
    updateUIStatus('SCARA: Full Assembly Sequence');
    
    // 전체 픽앤플레이스 시퀀스
    const fullSequence = [
        // 1. 픽업 위치로 이동
        { joint: 'joint_1', value: -0.389, delay: 2000 },
        { joint: 'joint_2', value: 0.024, delay: 2000 },
        { joint: 'joint_3', value: 1.209, delay: 2000 },
        
        // 2. Z축 하강 및 그리퍼 작동
        { joint: 'joint_5', value: -0.045, delay: 3000 },
        { joint: 'gripper_l', value: 0.0135, delay: 1000 },
        { joint: 'gripper_r', value: 0.0135, delay: 500 },
        
        // 3. Z축 상승
        { joint: 'joint_5', value: 0, delay: 3000 },
        
        // 4. 배치 위치로 이동
        { joint: 'joint_1', value: 1.484, delay: 3000 },   // 85도
        { joint: 'joint_2', value: -1.134, delay: 3000 },  // -65도
        { joint: 'joint_3', value: 3.491, delay: 3000 },   // 200도
        
        // 5. 배치 및 그리퍼 열기
        { joint: 'joint_5', value: -0.02, delay: 2000 },
        { joint: 'gripper_l', value: 0, delay: 500 },
        { joint: 'gripper_r', value: 0, delay: 500 },
        
        // 6. 홈 위치로 복귀
        { joint: 'joint_5', value: 0, delay: 3000 },
        { joint: 'joint_1', value: 0, delay: 3000 },
        { joint: 'joint_2', value: 0, delay: 3000 },
        { joint: 'joint_3', value: 1.571, delay: 3000 }
    ];
    
    executeScaraSequence(fullSequence);
}

// 센서 시뮬레이션 함수들 (WADF Sensor 클래스들 대응)
function simulateSensorReadings() {
    // 실제 환경에서는 센서 값을 읽어오지만, 여기서는 시뮬레이션
    // 시간이나 다른 조건에 따라 센서 값 변경
    
    setInterval(() => {
        // 랜덤하게 센서 상태 변경 (실제로는 물리적 조건에 따라 결정)
        if (Math.random() > 0.7) {
            wadfDevices.sensors.palletIn.value = !wadfDevices.sensors.palletIn.value;
            updateSensorDisplay('pallet-in-status', wadfDevices.sensors.palletIn.value);
        }
        
        if (Math.random() > 0.8) {
            wadfDevices.sensors.palletOut.value = !wadfDevices.sensors.palletOut.value;
            updateSensorDisplay('pallet-out-status', wadfDevices.sensors.palletOut.value);
        }
        
        if (Math.random() > 0.9) {
            wadfDevices.sensors.assembly.value = !wadfDevices.sensors.assembly.value;
            updateSensorDisplay('assembly-sensor-status', wadfDevices.sensors.assembly.value);
        }
    }, 2000);
}

function updateSensorDisplay(elementId, state) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = state ? 'ON' : 'OFF';
        element.className = state ? 'active' : 'inactive';
    }
}

// 비상 정지 및 리셋 함수들
function emergencyStopAll() {
    console.log('EMERGENCY STOP - All devices stopped');
    updateUIStatus('EMERGENCY STOP');
    
    // 모든 디바이스 정지
    wadfDevices.scara.powered = false;
    wadfDevices.assemblyBlock.state = false;
    wadfDevices.engraving.state = false;
    wadfDevices.partPusher1.state = false;
    wadfDevices.partPusher2.state = false;
    wadfDevices.conveyor.powered = false;
    
    // 추가 Pneumatic 디바이스들도 정지
    Object.keys(wadfDevices.additionalPneumatics).forEach(device => {
        wadfDevices.additionalPneumatics[device].state = false;
    });
    
    // URDF 모든 조인트를 안전 위치로
    resetAllJoints();
    stopConveyorAnimation();
}

function resetAllDevices() {
    console.log('Resetting all devices to initial state');
    updateUIStatus('System Reset');
    
    // 기본 디바이스들 초기화
    wadfDevices.scara.connected = false;
    wadfDevices.scara.powered = false;
    wadfDevices.scara.currentProgram = 0;
    wadfDevices.assemblyBlock.state = false;
    wadfDevices.engraving.state = false;
    wadfDevices.partPusher1.state = false;
    wadfDevices.partPusher2.state = false;
    wadfDevices.conveyor.powered = false;
    
    // 추가 Pneumatic 디바이스들 초기화
    Object.keys(wadfDevices.additionalPneumatics).forEach(device => {
        wadfDevices.additionalPneumatics[device].state = false;
    });
    
    // 센서 상태 초기화
    Object.keys(wadfDevices.sensors).forEach(sensor => {
        wadfDevices.sensors[sensor].value = false;
        updateSensorDisplay(`${sensor.replace('In', '-in').replace('Out', '-out').toLowerCase()}-status`, false);
    });
    
    resetAllJoints();
    stopConveyorAnimation();
}

function resetAllJoints() {
    // 모든 조인트를 0으로 리셋
    if (viewer.setJointValues) {
        const resetValues = {};
        for (const jointName in viewer.joints) {
            resetValues[jointName] = 0;
        }
        viewer.setJointValues(resetValues);
    }
}

// UI 상태 업데이트 함수
function updateUIStatus(message) {
    console.log(`Status: ${message}`);
    // 필요시 상단에 상태 표시 영역 추가 가능
}

const limitsToggle = document.getElementById('ignore-joint-limits');
const collisionToggle = document.getElementById('collision-toggle');
const radiansToggle = document.getElementById('radians-toggle');
const autocenterToggle = document.getElementById('autocenter-toggle');
const upSelect = document.getElementById('up-select');
const sliderList = document.querySelector('#joint-sliders'); // 새로운 위치로 변경
const animToggle = document.getElementById('do-animate');
const hideFixedToggle = document.getElementById('hide-fixed');
const animSpeedSlider = document.getElementById('animation-speed');
const speedValue = document.getElementById('speed-value');
const smoothAnimToggle = document.getElementById('smooth-animation');
const physicsToggle = document.getElementById('physics-enable');
const physicsDebugToggle = document.getElementById('physics-debug');
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 1 / DEG2RAD;
let sliders = {};

// Animation control variables
let animationSpeedMultiplier = 1.0;
let useSmoothAnimation = true;
let usePhysics = false;
let physicsDebugMode = false;

// Performance monitoring
let frameCount = 0;
let lastFpsUpdate = 0;
let activeAnimationCount = 0;
let totalCollisionCount = 0;

// Global Functions
const setColor = color => {

    document.body.style.backgroundColor = color;
    viewer.highlightColor = '#' + (new THREE.Color(0xffffff)).lerp(new THREE.Color(color), 0.35).getHexString();

};

// Events
// toggle checkbox
limitsToggle.addEventListener('click', () => {
    limitsToggle.classList.toggle('checked');
    viewer.ignoreLimits = limitsToggle.classList.contains('checked');
});

radiansToggle.addEventListener('click', () => {
    radiansToggle.classList.toggle('checked');
    Object
        .values(sliders)
        .forEach(sl => sl.update());
});

collisionToggle.addEventListener('click', () => {
    collisionToggle.classList.toggle('checked');
    viewer.showCollision = collisionToggle.classList.contains('checked');
});

autocenterToggle.addEventListener('click', () => {
    autocenterToggle.classList.toggle('checked');
    viewer.noAutoRecenter = !autocenterToggle.classList.contains('checked');
});

hideFixedToggle.addEventListener('click', () => {
    hideFixedToggle.classList.toggle('checked');

    const hideFixed = hideFixedToggle.classList.contains('checked');
    const jointControls = document.querySelector('.joint-controls');
    if (hideFixed) {
        jointControls.classList.add('hide-fixed');
    } else {
        jointControls.classList.remove('hide-fixed');
    }
});

// Animation control event listeners
animSpeedSlider.addEventListener('input', () => {
    animationSpeedMultiplier = parseFloat(animSpeedSlider.value);
    speedValue.textContent = `${animationSpeedMultiplier.toFixed(1)}x`;
});

smoothAnimToggle.addEventListener('click', () => {
    smoothAnimToggle.classList.toggle('checked');
    useSmoothAnimation = smoothAnimToggle.classList.contains('checked');
    console.log(`Smooth animation: ${useSmoothAnimation ? 'Enabled (60fps)' : 'Disabled (10fps)'}`);
});

physicsToggle.addEventListener('click', () => {
    physicsToggle.classList.toggle('checked');
    usePhysics = physicsToggle.classList.contains('checked');
    
    if (usePhysics) {
        initializePhysics();
        console.log('Physics engine enabled');
        updateUIStatus('Physics: Loading...');
    } else {
        disablePhysics();
        console.log('Physics engine disabled');
        updateUIStatus('Physics: Disabled');
    }
});

physicsDebugToggle.addEventListener('click', () => {
    physicsDebugToggle.classList.toggle('checked');
    physicsDebugMode = physicsDebugToggle.classList.contains('checked');
    
    if (physicsDebugMode) {
        console.log('🔍 Physics debug mode enabled - detailed collision logging');
    } else {
        console.log('🔍 Physics debug mode disabled');
    }
});

upSelect.addEventListener('change', () => viewer.up = upSelect.value);

// 기존 controls toggle 제거 (더 이상 필요 없음)

// watch for urdf changes
viewer.addEventListener('urdf-change', () => {

    Object
        .values(sliders)
        .forEach(sl => sl.remove());
    sliders = {};
    
    // Recreate physics bodies if physics is enabled
    if (usePhysics && physicsWorld) {
        setTimeout(() => {
            console.log('URDF changed - recreating physics bodies');
            createPhysicsBodies();
            console.log(`Created ${physicsBodies.size} physics bodies`);
        }, 500); // Wait for URDF to fully load
    }

    // 카메라를 2.3배 확대하고 대각 위에서 보도록 설정 (반시계 방향 80도 회전, 살짝 위로)
    setTimeout(() => {
        if (viewer.controls && viewer.controls.object) {
            const camera = viewer.controls.object;
            const target = viewer.controls.target;
            
            // 현재 카메라와 타겟 사이의 거리 계산
            const direction = camera.position.clone().sub(target);
            const distance = direction.length();
            
            // 80도 회전을 위한 계산 (80도 = 80 * π / 180 ≈ 1.396 라디안)
            const angle80 = 80 * Math.PI / 180;
            const cos80 = Math.cos(angle80);
            const sin80 = Math.sin(angle80);
            
            // 거리를 1/2.3로 줄여서 2.3배 확대하고 80도 회전, Y축 살짝 위로
            const newDistance = distance / 2.3;
            camera.position.set(
                target.x + newDistance * 0.7 * cos80 - newDistance * 0.7 * sin80,  // 80도 회전된 X 위치
                target.y + newDistance * 0.5,  // 위쪽 Y 위치 (0.6 → 0.5로 수정)
                target.z + newDistance * 0.7 * sin80 + newDistance * 0.7 * cos80   // 80도 회전된 Z 위치
            );
            
            viewer.controls.update();
            viewer.redraw();
        }
    }, 200);

});

viewer.addEventListener('ignore-limits-change', () => {

    Object
        .values(sliders)
        .forEach(sl => sl.update());

});

viewer.addEventListener('angle-change', e => {

    if (sliders[e.detail]) sliders[e.detail].update();

});

// 지오메트리 로드 완료 후 카메라 확대
viewer.addEventListener('geometry-loaded', () => {
    setTimeout(() => {
        if (viewer.controls && viewer.controls.object) {
            const camera = viewer.controls.object;
            const target = viewer.controls.target;
            
            // 현재 카메라와 타겟 사이의 거리 계산
            const direction = camera.position.clone().sub(target);
            const distance = direction.length();
            
            // 80도 회전을 위한 계산 (80도 = 80 * π / 180 ≈ 1.396 라디안)
            const angle80 = 80 * Math.PI / 180;
            const cos80 = Math.cos(angle80);
            const sin80 = Math.sin(angle80);
            
            // 거리를 1/2.3로 줄여서 2.3배 확대하고 80도 회전, Y축 살짝 위로
            const newDistance = distance / 2.3;
            camera.position.set(
                target.x + newDistance * 0.7 * cos80 - newDistance * 0.7 * sin80,  // 80도 회전된 X 위치
                target.y + newDistance * 0.5,  // 위쪽 Y 위치 (0.6 → 0.5로 수정)
                target.z + newDistance * 0.7 * sin80 + newDistance * 0.7 * cos80   // 80도 회전된 Z 위치
            );
            
            viewer.controls.update();
            viewer.redraw();
        }
    }, 300);
});

viewer.addEventListener('joint-mouseover', e => {

    const j = document.querySelector(`li[joint-name="${ e.detail }"]`);
    if (j) j.setAttribute('robot-hovered', true);

});

viewer.addEventListener('joint-mouseout', e => {

    const j = document.querySelector(`li[joint-name="${ e.detail }"]`);
    if (j) j.removeAttribute('robot-hovered');

});

let originalNoAutoRecenter;
viewer.addEventListener('manipulate-start', e => {

    const j = document.querySelector(`li[joint-name="${ e.detail }"]`);
    if (j) {
        j.scrollIntoView({ block: 'nearest' });
        window.scrollTo(0, 0);
    }

    originalNoAutoRecenter = viewer.noAutoRecenter;
    viewer.noAutoRecenter = true;

});

viewer.addEventListener('manipulate-end', e => {

    viewer.noAutoRecenter = originalNoAutoRecenter;

});

// create the sliders
viewer.addEventListener('urdf-processed', () => {

    const r = viewer.robot;
    Object
        .keys(r.joints)
        .sort((a, b) => {

            const da = a.split(/[^\d]+/g).filter(v => !!v).pop();
            const db = b.split(/[^\d]+/g).filter(v => !!v).pop();

            if (da !== undefined && db !== undefined) {
                const delta = parseFloat(da) - parseFloat(db);
                if (delta !== 0) return delta;
            }

            if (a > b) return 1;
            if (b > a) return -1;
            return 0;

        })
        .map(key => r.joints[key])
        .forEach(joint => {

            const li = document.createElement('li');
            li.innerHTML =
            `
            <span title="${ joint.name }">${ joint.name }</span>
            <input type="range" value="0" step="0.0001"/>
            <input type="number" step="0.0001" />
            `;
            li.setAttribute('joint-type', joint.jointType);
            li.setAttribute('joint-name', joint.name);

            sliderList.appendChild(li);

            // update the joint display
            const slider = li.querySelector('input[type="range"]');
            const input = li.querySelector('input[type="number"]');
            li.update = () => {
                const degMultiplier = radiansToggle.classList.contains('checked') ? 1.0 : RAD2DEG;
                let angle = joint.angle;

                if (joint.jointType === 'revolute' || joint.jointType === 'continuous') {
                    angle *= degMultiplier;
                }

                if (Math.abs(angle) > 1) {
                    angle = angle.toFixed(1);
                } else {
                    angle = angle.toPrecision(2);
                }

                input.value = parseFloat(angle);

                // directly input the value
                slider.value = joint.angle;

                if (viewer.ignoreLimits || joint.jointType === 'continuous') {
                    slider.min = -6.28;
                    slider.max = 6.28;

                    input.min = -6.28 * degMultiplier;
                    input.max = 6.28 * degMultiplier;
                } else {
                    slider.min = joint.limit.lower;
                    slider.max = joint.limit.upper;

                    input.min = joint.limit.lower * degMultiplier;
                    input.max = joint.limit.upper * degMultiplier;
                }
            };

            switch (joint.jointType) {

                case 'continuous':
                case 'prismatic':
                case 'revolute':
                    break;
                default:
                    li.update = () => {};
                    input.remove();
                    slider.remove();

            }

            slider.addEventListener('input', () => {
                viewer.setJointValue(joint.name, slider.value);
                li.update();
            });

            input.addEventListener('change', () => {
                const degMultiplier = radiansToggle.classList.contains('checked') ? 1.0 : DEG2RAD;
                viewer.setJointValue(joint.name, input.value * degMultiplier);
                li.update();
            });

            li.update();

            sliders[joint.name] = li;

        });

});

document.addEventListener('WebComponentsReady', () => {

    viewer.loadMeshFunc = (path, manager, done) => {

        const ext = path.split(/\./g).pop().toLowerCase();
        switch (ext) {

            case 'gltf':
            case 'glb':
                new GLTFLoader(manager).load(
                    path,
                    result => done(result.scene),
                    null,
                    err => done(null, err),
                );
                break;
            case 'obj':
                new OBJLoader(manager).load(
                    path,
                    result => done(result),
                    null,
                    err => done(null, err),
                );
                break;
            case 'dae':
                new ColladaLoader(manager).load(
                    path,
                    result => done(result.scene),
                    null,
                    err => done(null, err),
                );
                break;
            case 'stl':
                new STLLoader(manager).load(
                    path,
                    result => {
                        const material = new THREE.MeshPhongMaterial();
                        const mesh = new THREE.Mesh(result, material);
                        done(mesh);
                    },
                    null,
                    err => done(null, err),
                );
                break;

        }

    };

    document.querySelector('li[urdf]').dispatchEvent(new Event('click'));

    // 번들 환경 감지 (개발/프로덕션 구분)
    if (/javascript\/example\/bundle/i.test(window.location)) {
        viewer.package = '../../../urdf';
    }

    registerDragEvents(viewer, () => {
        setColor('#263238');
        animToggle.classList.remove('checked');
        updateList();
    });

});

// init 2D UI and animation
const updateAngles = () => {

    if (!viewer.setJointValue) return;

    // reset everything to 0 first
    const resetJointValues = viewer.angles;
    for (const name in resetJointValues) resetJointValues[name] = 0;
    viewer.setJointValues(resetJointValues);

    // animate the legs
    const time = Date.now() / 3e2;
    for (let i = 1; i <= 6; i++) {

        const offset = i * Math.PI / 3;
        const ratio = Math.max(0, Math.sin(time + offset));

        viewer.setJointValue(`HP${ i }`, THREE.MathUtils.lerp(30, 0, ratio) * DEG2RAD);
        viewer.setJointValue(`KP${ i }`, THREE.MathUtils.lerp(90, 150, ratio) * DEG2RAD);
        viewer.setJointValue(`AP${ i }`, THREE.MathUtils.lerp(-30, -60, ratio) * DEG2RAD);

        viewer.setJointValue(`TC${ i }A`, THREE.MathUtils.lerp(0, 0.065, ratio));
        viewer.setJointValue(`TC${ i }B`, THREE.MathUtils.lerp(0, 0.065, ratio));

        viewer.setJointValue(`W${ i }`, window.performance.now() * 0.001);

    }

};

let lastTime = 0;
const updateLoop = (currentTime) => {
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    // FPS monitoring
    frameCount++;
    if (currentTime - lastFpsUpdate >= 1000) { // Update every second
        const fps = Math.round(frameCount * 1000 / (currentTime - lastFpsUpdate));
        document.getElementById('fps-counter').textContent = `${fps} fps`;
        frameCount = 0;
        lastFpsUpdate = currentTime;
        
        // Update animation status
        document.getElementById('active-animations').textContent = activeAnimationCount;
        const physicsStatusText = usePhysics ? 
            `HYBRID MODE (${physicsBodies.size} bodies)` : 'Disabled';
        document.getElementById('physics-status').textContent = physicsStatusText;
        document.getElementById('collision-count').textContent = totalCollisionCount;
    }

    if (animToggle.classList.contains('checked')) {
        updateAngles();
    }
    
    // Update physics simulation
    if (usePhysics && physicsWorld) {
        updatePhysics(Math.min(deltaTime, 1/60 * animationSpeedMultiplier)); // Cap at 60fps equivalent
    }

    requestAnimationFrame(updateLoop);

};

const updateList = () => {

    document.querySelectorAll('#urdf-options li[urdf]').forEach(el => {

        el.addEventListener('click', e => {

            const urdf = e.target.getAttribute('urdf');
            const color = e.target.getAttribute('color');

            viewer.up = '+Z';
            document.getElementById('up-select').value = viewer.up;
            viewer.urdf = urdf;
            animToggle.classList.remove('checked'); // 애니메이션 비활성화로 변경
            setColor(color);

        });

    });

};

updateList();

document.addEventListener('WebComponentsReady', () => {

    animToggle.addEventListener('click', () => animToggle.classList.toggle('checked'));

    // stop the animation if user tried to manipulate the model
    viewer.addEventListener('manipulate-start', e => animToggle.classList.remove('checked'));
    viewer.addEventListener('urdf-processed', e => updateAngles());
    updateLoop();

});

// Physics engine functions
let physicsWorld = null;
let physicsBodies = new Map();
let physicsConstraints = [];

async function initializePhysics() {
    try {
        // Dynamic import of Cannon.js physics engine
        CANNON = await import('cannon-es');
        
        // Create physics world (하이브리드 모드: 로봇=키네마틱, 파츠=동적)
        physicsWorld = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0), // 실제 중력 활성화 (파츠용)
            broadphase: new CANNON.NaiveBroadphase(),
            solver: new CANNON.GSSolver(),
        });
        
        // 물리 월드 설정 최적화 (하이브리드 모드용)
        physicsWorld.solver.iterations = 10; // 안정성을 위해 증가
        physicsWorld.solver.tolerance = 1e-4;
        physicsWorld.defaultContactMaterial.friction = 0.1;
        physicsWorld.defaultContactMaterial.restitution = 0.1;
        physicsWorld.allowSleep = true; // 성능 최적화
        physicsWorld.sleepSpeedLimit = 0.1;
        
        // 키네마틱 로봇용 머티리얼
        const robotMaterial = new CANNON.Material('robot');
        robotMaterial.friction = 0.0;
        robotMaterial.restitution = 0.0;
        
        // 충돌 감지 이벤트 리스너 추가
        physicsWorld.addEventListener('beginContact', (event) => {
            try {
                // Cannon.js에서는 event.bodyA, event.bodyB 사용
                if (event && event.bodyA && event.bodyB) {
                    handleCollision(event.bodyA, event.bodyB);
                }
            } catch (error) {
                console.warn('⚠️ Collision event error:', error.message);
            }
        });
        
        // 바닥면 추가 (충돌 감지용)
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ 
            mass: 0, 
            type: CANNON.Body.STATIC,
            material: robotMaterial
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        groundBody.position.set(0, -2, 0); // 로봇 아래쪽에 배치
        physicsWorld.addBody(groundBody);
        
        console.log('🌍 Physics world initialized in HYBRID mode');
        console.log('  ⚙️ Robot System: Kinematic control (arms, grippers, actuators)');  
        console.log('  📦 Workpieces: Dynamic physics (when added)');
        console.log('  🏗️ Structure: Static (base, frame, towers)');
        
        // Create physics bodies for URDF robot if loaded
        if (viewer.robot) {
            createPhysicsBodies();
        }
        
        console.log('Physics engine initialized with Cannon.js (HYBRID Mode)');
        updateUIStatus('Physics: Kinematic Mode Enabled');
        
    } catch (error) {
        console.error('Failed to load physics engine:', error);
        usePhysics = false;
        physicsToggle.classList.remove('checked');
        updateUIStatus('Physics: Failed to load');
    }
}

function createPhysicsBodies() {
    if (!physicsWorld || !viewer.robot) return;
    
    console.log('Creating physics bodies for URDF robot...');
    
    // Clear existing physics bodies
    physicsBodies.clear();
    physicsConstraints.forEach(constraint => physicsWorld.removeConstraint(constraint));
    physicsConstraints = [];
    
    // First pass: Create physics bodies for each link
    const linkBodies = new Map();
    
    viewer.robot.traverse((child) => {
        if (child.isURDFLink) {
            const linkName = child.name;
            console.log(`Processing link: ${linkName}`);
            
            // 더 정확한 바운딩 박스 계산
            child.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(child);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            // 최소 크기 보장 (너무 작으면 물리 시뮬레이션 불안정)
            const minSize = 0.01;
            size.x = Math.max(size.x, minSize);
            size.y = Math.max(size.y, minSize);
            size.z = Math.max(size.z, minSize);
            
            // 링크 유형에 따른 물리 속성 설정
            let mass = 0;
            let bodyType = 'kinematic';
            
            // 1. 베이스 및 고정 구조물 (정적)
            if (linkName.toLowerCase().includes('base') || 
                linkName.includes('Mount') || 
                linkName.includes('Conveyor') ||
                linkName.includes('Tower') ||
                linkName.includes('case_bottom')) {
                mass = 0;
                bodyType = 'static';
                console.log(`  -> Static structure: ${linkName}`);
            }
            // 2. 로봇 팔 및 그리퍼 구조 (키네마틱 - 정밀 제어)
            else if (linkName.includes('SR-3IA') || 
                     linkName.includes('ARM_UNIT') || 
                     linkName.includes('SHAFT_UNIT') ||
                     linkName.includes('Gripper_Body') ||
                     linkName.includes('Gripper_Finger') ||
                     linkName.includes('InP_Gripper')) {
                mass = 0;
                bodyType = 'kinematic';
                console.log(`  -> Robot arm/gripper (kinematic): ${linkName}`);
            }
            // 3. 로봇 액추에이터 구조 (키네마틱 - 로봇 제어)
            else if (linkName.includes('PalletBlock') || 
                     linkName.includes('Pusher2_') ||
                     linkName.includes('Pusher_')) {
                mass = 0;
                bodyType = 'kinematic';
                console.log(`  -> Robot actuator (kinematic): ${linkName}`);
            }
            // 4. 실제 조립 워크피스 (동적 - 물리 법칙 적용) - 현재는 없음, 필요시 추가
            else if (linkName.includes('WorkPiece') || 
                     linkName.includes('Part_')) {
                mass = 0.1; // 실제 질량 부여
                bodyType = 'dynamic';
                console.log(`  -> Workpiece (dynamic): ${linkName}, mass: ${mass}kg`);
            }
            // 5. 센서 및 가이드 (키네마틱)
            else if (linkName.includes('Sensor') || 
                     linkName.includes('Guide')) {
                mass = 0;
                bodyType = 'kinematic';
                console.log(`  -> Sensor/Guide (kinematic): ${linkName}`);
            }
            // 6. 기타 구조물 (키네마틱)
            else {
                mass = 0;
                bodyType = 'kinematic';
                console.log(`  -> Other component (kinematic): ${linkName}`);
            }
            
            // 물리 바디 생성
            const shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
            let cannonBodyType;
            
            switch(bodyType) {
                case 'static':
                    cannonBodyType = CANNON.Body.STATIC;
                    break;
                case 'kinematic':
                    cannonBodyType = CANNON.Body.KINEMATIC;
                    break;
                case 'dynamic':
                    cannonBodyType = CANNON.Body.DYNAMIC;
                    break;
            }
            
            const body = new CANNON.Body({ 
                mass: mass,
                type: cannonBodyType
            });
            body.addShape(shape);
            
            // 키네마틱과 정적 바디는 중력 영향 제거
            if (bodyType === 'kinematic' || bodyType === 'static') {
                body.material = new CANNON.Material({ friction: 0, restitution: 0 });
                body.linearDamping = 1.0;  // 완전히 고정
                body.angularDamping = 1.0; // 완전히 고정
            }
            
            // 초기 위치와 회전 설정 (Three.js와 동기화)
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            child.getWorldPosition(worldPos);
            child.getWorldQuaternion(worldQuat);
            
            body.position.set(worldPos.x, worldPos.y, worldPos.z);
            body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);
            
            // 베이스 링크는 완전히 고정
            if (linkName === 'base_link') {
                body.type = CANNON.Body.STATIC;
                body.mass = 0;
                body.position.set(worldPos.x, worldPos.y, worldPos.z);
                body.fixedRotation = true;
                console.log(`  🔒 Base link anchored at: ${worldPos.x}, ${worldPos.y}, ${worldPos.z}`);
            }
            
            // 바디 타입별 물리 속성 설정
            if (bodyType === 'kinematic' || bodyType === 'static') {
                body.material = new CANNON.Material({ 
                    friction: 0.1, 
                    restitution: 0.0 
                });
            } else if (bodyType === 'dynamic') {
                // 동적 바디: 실제 물리 속성
                body.material = new CANNON.Material({ 
                    friction: 0.8,     // 높은 마찰력 (미끄러지지 않음)
                    restitution: 0.2   // 낮은 반발력 (통통 튀지 않음)
                });
                body.linearDamping = 0.1;    // 선형 감쇠 (서서히 멈춤)
                body.angularDamping = 0.1;   // 회전 감쇠
            }
            
            physicsWorld.addBody(body);
            physicsBodies.set(linkName, {
                body: body,
                mesh: child,
                type: bodyType
            });
            
            linkBodies.set(linkName, body);
        }
    });
    
    // Second pass: Create physics constraints for joints (현재는 비활성화)
    // 키네마틱 바디들은 제약조건 없이 직접 제어됨
    console.log(`✅ Physics bodies created successfully: ${physicsBodies.size} bodies`);
    
    // 베이스 고정 상태 확인
    const baseLinkData = physicsBodies.get('base_link');
    if (baseLinkData) {
        console.log(`🔒 Base link fixed: ${baseLinkData.body.type === CANNON.Body.STATIC ? 'YES' : 'NO'}`);
        console.log(`📍 Base position: (${baseLinkData.body.position.x.toFixed(2)}, ${baseLinkData.body.position.y.toFixed(2)}, ${baseLinkData.body.position.z.toFixed(2)})`);
    }
    
    // 바디 타입별 통계
    let staticCount = 0, kinematicCount = 0, dynamicCount = 0;
    physicsBodies.forEach((data) => {
        if (data.type === 'static') staticCount++;
        else if (data.type === 'kinematic') kinematicCount++;
        else if (data.type === 'dynamic') dynamicCount++;
    });
    
    console.log(`📊 Body types: Static(${staticCount}) + Kinematic(${kinematicCount}) + Dynamic(${dynamicCount}) = ${physicsBodies.size}`);
    console.log('🎮 Robot system: Kinematic control (no gravity, precise motion)');
    console.log('⚙️ Ready for workpiece simulation (use addWorkpiece() function)');
    
    // 로봇이 키네마틱 모드에서는 조인트 제약조건 대신 직접 제어 사용
    /*
    Object.keys(viewer.robot.joints).forEach(jointName => {
        const joint = viewer.robot.joints[jointName];
        const parentLink = joint.parent;
        const childLink = joint.child;
        
        if (parentLink && childLink) {
            const parentBody = linkBodies.get(parentLink.name);
            const childBody = linkBodies.get(childLink.name);
            
            if (parentBody && childBody) {
                console.log(`Creating constraint for joint: ${jointName} (${joint.jointType})`);
                
                let constraint;
                const jointPos = new THREE.Vector3();
                joint.getWorldPosition(jointPos);
                
                // 부모와 자식의 로컬 위치 계산
                const parentPos = new THREE.Vector3();
                const childPos = new THREE.Vector3();
                parentLink.getWorldPosition(parentPos);
                childLink.getWorldPosition(childPos);
                
                const pivotA = new CANNON.Vec3(
                    jointPos.x - parentPos.x,
                    jointPos.y - parentPos.y,
                    jointPos.z - parentPos.z
                );
                const pivotB = new CANNON.Vec3(
                    jointPos.x - childPos.x,
                    jointPos.y - childPos.y,
                    jointPos.z - childPos.z
                );
                
                switch (joint.jointType) {
                    case 'revolute':
                        constraint = new CANNON.HingeConstraint(
                            parentBody,
                            childBody,
                            {
                                pivotA: pivotA,
                                pivotB: pivotB,
                                axisA: new CANNON.Vec3(joint.axis.x, joint.axis.y, joint.axis.z),
                                axisB: new CANNON.Vec3(joint.axis.x, joint.axis.y, joint.axis.z),
                            }
                        );
                        break;
                        
                    case 'prismatic':
                        // 프리즈매틱 조인트용 제약조건
                        constraint = new CANNON.PointToPointConstraint(
                            parentBody,
                            pivotA,
                            childBody,
                            pivotB
                        );
                        break;
                        
                    case 'fixed':
                        constraint = new CANNON.LockConstraint(parentBody, childBody);
                        break;
                }
                
                if (constraint) {
                    physicsWorld.addConstraint(constraint);
                    physicsConstraints.push(constraint);
                    console.log(`  -> Constraint created for ${jointName}`);
                }
            }
        }
    });
    */
}

function updatePhysics(deltaTime) {
    if (!physicsWorld || !usePhysics || !physicsBodies) return;
    
    try {
        // 하이브리드 모드: 바디 타입별 처리
        physicsBodies.forEach((data, linkName) => {
            if (!data || !data.body || !data.mesh) return;
            const { body, mesh, type } = data;
        
        if (type === 'kinematic') {
            // 키네마틱 바디: Three.js → Physics (로봇 팔 제어)
            mesh.updateMatrixWorld(true);
            
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            mesh.getWorldPosition(worldPos);
            mesh.getWorldQuaternion(worldQuat);
            
            // 위치와 회전을 Three.js와 동기화
            body.position.set(worldPos.x, worldPos.y, worldPos.z);
            body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);
            
            // 키네마틱 바디는 모든 속도를 0으로 강제 설정 (중력 무시)
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
            body.force.set(0, 0, 0);
            body.torque.set(0, 0, 0);
        }
        else if (type === 'static') {
            // 정적 바디도 완전히 고정
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
            body.force.set(0, 0, 0);
            body.torque.set(0, 0, 0);
        }
        // static 바디는 업데이트 불필요 (고정)
    });
    
    // 물리 시뮬레이션 스텝 (중요: 동적 바디들의 물리 계산)
    physicsWorld.step(deltaTime);
    
    // 동적 바디: Physics → Three.js (조립 파츠 물리 적용)
    physicsBodies.forEach((data, linkName) => {
        const { body, mesh, type } = data;
        
        if (type === 'dynamic') {
            // 물리 시뮬레이션 결과를 메시에 적용
            mesh.position.set(body.position.x, body.position.y, body.position.z);
            mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
        }
    });
    
    // 그리퍼 상태 체크 및 파츠 부착
    checkGripperState();
    
    // WADF Workpart 자동 제거 및 조립 조건 체크
    checkWADFWorkpartRemoval();
    checkWADFWorkpartAssembly();
    
    } catch (error) {
        console.warn('⚠️ Physics update error:', error.message);
        // 오류 발생 시 물리 엔진 비활성화하지 않고 계속 진행
    }
}

function disablePhysics() {
    if (physicsWorld) {
        // Clear all physics bodies and constraints
        physicsBodies.forEach((data) => {
            physicsWorld.removeBody(data.body);
        });
        physicsConstraints.forEach(constraint => {
            physicsWorld.removeConstraint(constraint);
        });
        
        physicsBodies.clear();
        physicsConstraints = [];
        physicsWorld = null;
    }
    
    usePhysics = false;
    console.log('Physics engine disabled');
    updateUIStatus('Physics: Disabled');
}

// 충돌 감지 및 처리
function handleCollision(bodyA, bodyB) {
    // 안전성 검사
    if (!bodyA || !bodyB || !physicsBodies) {
        return;
    }
    
    // 바디 이름 찾기
    let linkNameA = null;
    let linkNameB = null;
    
    physicsBodies.forEach((data, linkName) => {
        if (data.body === bodyA) linkNameA = linkName;
        if (data.body === bodyB) linkNameB = linkName;
    });
    
    if (linkNameA && linkNameB) {
        totalCollisionCount++;
        
        if (physicsDebugMode) {
            console.log(`🔴 Collision #${totalCollisionCount}: ${linkNameA} ↔ ${linkNameB}`);
        }
        
        // 그리퍼와 워크피스 간 충돌 (픽업 시뮬레이션)
        if (isGripperCollision(linkNameA, linkNameB)) {
            handleGripperCollision(linkNameA, linkNameB);
        }
        
        // 안전 영역 침범 감지
        if (isSafetyViolation(linkNameA, linkNameB)) {
            handleSafetyViolation(linkNameA, linkNameB);
        }
    }
}

function isGripperCollision(linkA, linkB) {
    const gripperLinks = ['Gripper_Finger_L_v21', 'Gripper_Finger_R_v21', 'InP_Gripper_L1', 'InP_Gripper_R1'];
    const workpieces = ['PalletBlock_11', 'PalletBlock_21', 'Pusher2_11', 'Pusher2_21'];
    
    return (gripperLinks.includes(linkA) && workpieces.includes(linkB)) ||
           (gripperLinks.includes(linkB) && workpieces.includes(linkA));
}

function handleGripperCollision(linkA, linkB) {
    console.log(`🤖 Gripper contact: ${linkA} ↔ ${linkB}`);
    updateUIStatus(`Assembly: Gripper engaging part`);
    
    // 그리퍼가 닫힌 상태에서 파츠와 접촉하면 픽업
    const gripperClosed = checkGripperState();
    if (gripperClosed) {
        attachPartToGripper(linkA, linkB);
    }
}

function checkGripperState() {
    // 그리퍼 조인트 상태 확인 (닫힌 상태인지)
    if (viewer.robot && viewer.robot.joints) {
        const gripperL = viewer.robot.joints['Slider_41'];
        const gripperR = viewer.robot.joints['Slider_42'];
        
        if (gripperL && gripperR) {
            // 그리퍼가 0.01 이상 닫혀있으면 파츠 잡기 가능
            return Math.abs(gripperL.angle) > 0.005 || Math.abs(gripperR.angle) > 0.005;
        }
    }
    return false;
}

function attachPartToGripper(linkA, linkB) {
    // 어떤 링크가 파츠인지 확인
    const workpieces = ['PalletBlock_11', 'PalletBlock_21', 'Pusher2_11', 'Pusher2_21'];
    let partLink = workpieces.includes(linkA) ? linkA : (workpieces.includes(linkB) ? linkB : null);
    
    if (partLink) {
        const partData = physicsBodies.get(partLink);
        if (partData && partData.type === 'dynamic') {
            console.log(`📦 Part ${partLink} picked up by gripper`);
            
            // 파츠를 키네마틱으로 변경 (그리퍼에 고정)
            partData.body.type = CANNON.Body.KINEMATIC;
            partData.body.mass = 0;
            partData.attachedToGripper = true;
            
            updateUIStatus(`Assembly: Part ${partLink} attached to gripper`);
        }
    }
}

function releasePartFromGripper() {
    // 그리퍼에 붙어있는 모든 파츠를 해제
    physicsBodies.forEach((data, linkName) => {
        if (data.attachedToGripper) {
            console.log(`📤 Releasing part: ${linkName}`);
            
            // 다시 동적 바디로 변경
            data.body.type = CANNON.Body.DYNAMIC;
            data.body.mass = 0.1;
            data.attachedToGripper = false;
            
            updateUIStatus(`Assembly: Part ${linkName} released`);
        }
    });
}

function isSafetyViolation(linkA, linkB) {
    // 고속 이동 부품과 센서 간 충돌 감지
    const fastMovingParts = ['J1_ARM_UNIT_v11', '3D_SR-3IA_Final_J2_ARM_UNIT_SV_v11'];
    const sensors = ['InP_Sensor_11', 'InP_Sensor_21', 'InP_Sensor_31'];
    
    return (fastMovingParts.includes(linkA) && sensors.includes(linkB)) ||
           (fastMovingParts.includes(linkB) && sensors.includes(linkA));
}

function handleSafetyViolation(linkA, linkB) {
    console.warn(`⚠️ SAFETY WARNING: ${linkA} ↔ ${linkB}`);
    updateUIStatus(`WARNING: Safety collision detected!`);
    
    // 안전 위반 시 응급 정지 (옵션)
    // wadfEmergencyStopAll();
}

// WebSocket 토글 함수
function toggleWebSocketConnection() {
    if (robotWebSocket && robotWebSocket.readyState === WebSocket.OPEN) {
        // 연결된 상태에서 클릭 시 연결 해제
        console.log('🔌 Disconnecting WebSocket...');
        robotWebSocket.close();
        setButtonActive('#websocket-connect', false);
        document.getElementById('websocket-status').textContent = 'Disconnected';
        document.getElementById('websocket-status').className = 'inactive';
        document.getElementById('websocket-connect').textContent = 'Connect to Server';
        updateUIStatus('WebSocket: Disconnected from Robot Server');
    } else {
        // 연결되지 않은 상태에서 클릭 시 연결 시도
        console.log('🔌 Connecting WebSocket...');
        initWebSocket();
    }
}

// WebSocket 초기화 함수
function initWebSocket() {
    try {
        robotWebSocket = new WebSocket('ws://localhost:8080');
        
        robotWebSocket.onopen = () => {
            console.log('✅ WADF WebSocket Server connected');
            document.getElementById('websocket-status').textContent = 'Connected';
            document.getElementById('websocket-status').className = 'active';
            document.getElementById('websocket-connect').textContent = 'Disconnect from Server';
            updateUIStatus('WebSocket: Connected to Robot Server');
            // WebSocket 연결 시 Connect to Server 버튼 활성화
            setButtonActive('#websocket-connect', true);
        };
        
        robotWebSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };
        
        robotWebSocket.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            document.getElementById('websocket-status').textContent = 'Error';
            document.getElementById('websocket-status').className = 'inactive';
        };
        
        robotWebSocket.onclose = () => {
            console.log('WebSocket connection closed');
            document.getElementById('websocket-status').textContent = 'Disconnected';
            document.getElementById('websocket-status').className = 'inactive';
            document.getElementById('websocket-connect').textContent = 'Connect to Server';
            // WebSocket 연결 해제 시 Connect to Server 버튼 비활성화
            setButtonActive('#websocket-connect', false);
        };
        
    } catch (error) {
        console.error('WebSocket initialization failed:', error);
    }
}

// 웹소켓 메시지 처리
function handleWebSocketMessage(data) {
    console.log('📨 WebSocket message:', data);
    
    if (data.type === 'joint_update') {
        // 🚨 비상 정지 상태에서는 조인트 업데이트 무시
        if (data.message && data.message.includes('EMERGENCY STOP')) {
            console.log('🚨 Ignoring joint update during emergency stop');
            return;
        }
        
        // 기존 INP Control의 부드러운 애니메이션 시스템 사용
        animateWebSocketJoint(data.joint, data.value);
    } else if (data.type === 'status_update') {
        if (data.message.includes('SCARA Robot Connected')) {
            wadfDevices.scara.connected = true;
            updateUIStatus('WADF SCARA: Connected via WebSocket');
            // SCARA Connect 시 버튼 상태 업데이트
            setButtonActiveByAction('scara-connect', true);
        } else if (data.message.includes('SCARA Power ON')) {
            wadfDevices.scara.powered = true;
            updateUIStatus('WADF SCARA: Power ON via WebSocket');
            // Power ON 시 버튼 상태 업데이트
            setButtonActiveByAction('scara-power-on', true);
            setButtonActiveByAction('scara-power-off', false);
        } else if (data.message.includes('SCARA Power OFF')) {
            wadfDevices.scara.powered = false;
            updateUIStatus('WADF SCARA: Power OFF via WebSocket');
            // Power OFF 시 버튼 상태 업데이트
            setButtonActiveByAction('scara-power-on', false);
            setButtonActiveByAction('scara-power-off', true);
        } else if (data.message.includes('Home Position')) {
            updateUIStatus('WADF SCARA: Home Position via WebSocket');
        } else if (data.message.includes('Running Program')) {
            updateUIStatus(data.message);
        } else if (data.message.includes('GRIPPER_TEST2')) {
            updateUIStatus(data.message);
        } else         if (data.message.includes('Full Assembly Sequence Starting')) {
            updateUIStatus(data.message);
            // 프로그래스 바 초기화 및 시작
            console.log('📊 WebSocket: Starting progress bar for full sequence');
            resetProgressBar();
            updateExecutionStatus('running', 'Full Assembly Sequence');
            
            // Run Full Assembly Sequence 버튼 활성화
            setButtonActiveByAction('scara-full-sequence', true);
            console.log('🚀 WebSocket: Full Assembly Sequence started - button highlighted');
        } else if (data.message.includes('Assembly Sequence Completed')) {
            updateUIStatus(data.message);
            // 프로그래스 바 완료
            console.log('📊 WebSocket: Completing progress bar');
            updateProgressBar(21, 21, 'Completed');
            updateExecutionStatus('online', 'Sequence Completed');
            
            // Run Full Assembly Sequence 버튼 비활성화
            setButtonActiveByAction('scara-full-sequence', false);
            console.log('✅ WebSocket: Full Assembly Sequence completed - button highlight removed');
            
            // 시퀀스 완료 시 모든 버튼 상태 리셋
            setTimeout(() => {
                clearAllButtonStates();
                console.log('🔄 All button states reset after sequence completion');
            }, 2000); // 2초 후 리셋
        } else if (data.message.includes('WADF Step')) {
            updateUIStatus(data.message);
            // 단계별 프로그래스 바 업데이트
            updateWebSocketProgress(data.message);
        } else if (data.message.includes('EMERGENCY STOP ACTIVATED')) {
            updateUIStatus(data.message);
            // 프로그래스 바 리셋
            resetProgressBar();
            updateExecutionStatus('error', 'Emergency Stop');
            
            // Run Full Assembly Sequence 버튼 비활성화
            setButtonActiveByAction('scara-full-sequence', false);
            console.log('🚨 WebSocket: Emergency stop - Full Assembly Sequence button highlight removed');
            
            // 비상정지 시 모든 버튼 상태 리셋 (상태 유지 버튼 포함)
            clearAllButtonStates();
            clearStatefulButtons();
            console.log('🚨 All button states reset due to emergency stop');
            
            // 🚨 비상 정지 시 모든 애니메이션 즉시 중단
            Object.keys(webSocketAnimations).forEach(joint => {
                if (webSocketAnimations[joint]) {
                    cancelAnimationFrame(webSocketAnimations[joint]);
                    delete webSocketAnimations[joint];
                }
            });
            console.log('🚨 Emergency stop received - All animations stopped');
        } else if (data.message.includes('STOPPED by emergency stop')) {
            updateUIStatus(data.message);
            console.log('🚨 Sequence stopped by emergency stop');
        }
    } else if (data.type === 'pneumatic_update') {
        // 공압 장치 상태 업데이트
        const device = data.device;
        const state = data.state;
        
        if (wadfDevices.pneumatics[device]) {
            wadfDevices.pneumatics[device].state = state;
            console.log(`🔧 WebSocket Pneumatic Update: ${device} = ${state ? 'ON' : 'OFF'}`);
            updateUIStatus(`WADF ${device}: ${state ? 'ON' : 'OFF'} via WebSocket`);
            
            // URDF 시각적 업데이트
            updatePneumaticVisual(device, state);
        }
    } else if (data.type === 'conveyor_update') {
        // 컨베이어 상태 업데이트
        if (data.action === 'power') {
            wadfDevices.conveyor.running = data.state;
            console.log(`🚛 WebSocket Conveyor Power: ${data.state ? 'ON' : 'OFF'}`);
            updateUIStatus(`WADF Conveyor: ${data.state ? 'RUNNING' : 'STOPPED'} via WebSocket`);
            
            if (data.state) {
                startConveyorAnimation();
            } else {
                stopConveyorAnimation();
            }
        } else if (data.action === 'direction') {
            wadfDevices.conveyor.direction = data.direction;
            console.log(`🔄 WebSocket Conveyor Direction: ${data.direction}`);
            updateUIStatus(`WADF Conveyor: ${data.direction} via WebSocket`);
        }
    } else if (data.type === 'sensor_update') {
        // 센서 상태 업데이트
        const sensor = data.sensor;
        const value = data.value;
        
        if (wadfDevices.sensors[sensor]) {
            wadfDevices.sensors[sensor].value = value;
            console.log(`📡 WebSocket Sensor Update: ${sensor} = ${value ? 'DETECTED' : 'CLEAR'}`);
            updateUIStatus(`WADF ${sensor}: ${value ? 'DETECTED' : 'CLEAR'} via WebSocket`);
            
            // UI 센서 표시 업데이트
            const statusId = sensor.replace('In', '-in').replace('Out', '-out').toLowerCase() + '-status';
            updateSensorDisplay(statusId, value);
        }
    }
}

// 🔧 WADF 정의에 따른 공압 장치 조인트 값 매핑 (URDF 한계값 기준)
const PNEUMATIC_JOINT_VALUES = {
    assemblyBlock: {
        joints: ['Slider_17', 'Slider_20'],  // PalletBlock_11, PalletBlock_21 (양쪽 블록)
        onValue: 0.16,         // URDF limit upper="0.16" (최대 확장)
        offValue: 0.0          // URDF limit lower="0.0" (최소 수축)
    },
    engraving: {
        joints: ['Slider_41', 'Slider_42'],  // 그리퍼로 시뮬레이션
        onValue: 0.0135,       // URDF limit upper="0.0135" (그리퍼 열림)
        offValue: 0.0          // URDF limit lower="0.0" (그리퍼 닫힘)
    },
    partPusher1: {
        joint: 'Slider_25',    // Pusher2_11 (Y=-0.265) - 위치 조정 중
        onValue: 0.16,         // URDF limit upper="0.16" (최대 밀어내기)
        offValue: -0.08,       // URDF limit lower="-0.08" (최대 수축) - 원래값 유지
        neutralValue: -0.02    // 더 앞으로 이동하여 Slider_26과 맞춤
    },
    partPusher2: {
        joint: 'Slider_26',    // Pusher2_21 (Y=-0.422) - 기준 위치
        onValue: 0.16,         // URDF limit upper="0.16" (최대 밀어내기)
        offValue: -0.08,       // URDF limit lower="-0.08" (최대 수축) - 원래값 유지
        neutralValue: 0.0      // 기준 중립 위치 유지
    }
};

// 🔧 공압 장치 초기 위치 설정 함수
function initializePneumaticDevices() {
    if (!viewer.setJointValue) {
        console.warn('⚠️ Viewer not ready for pneumatic initialization');
        return;
    }
    
    console.log('🔧 Initializing pneumatic devices to neutral positions...');
    
    // 현재 조인트 값 확인 (디버깅용)
    if (viewer.getJointValue) {
        console.log('📊 Current joint values before initialization:');
        console.log(`  Slider_25 (PartPusher1): ${viewer.getJointValue('Slider_25')}`);
        console.log(`  Slider_26 (PartPusher2): ${viewer.getJointValue('Slider_26')}`);
    }
    
    Object.entries(PNEUMATIC_JOINT_VALUES).forEach(([device, config]) => {
        const neutralValue = config.neutralValue !== undefined ? config.neutralValue : config.offValue;
        
        if (config.joints) {
            // 다중 조인트
            config.joints.forEach(joint => {
                viewer.setJointValue(joint, neutralValue);
                console.log(`🔧 Init ${device}: ${joint} = ${neutralValue} (neutral)`);
            });
        } else {
            // 단일 조인트
            viewer.setJointValue(config.joint, neutralValue);
            console.log(`🔧 Init ${device}: ${config.joint} = ${neutralValue} (neutral)`);
        }
    });
    
    // 설정 후 값 확인 (디버깅용)
    if (viewer.getJointValue) {
        setTimeout(() => {
            console.log('📊 Joint values after initialization:');
            console.log(`  Slider_25 (PartPusher1): ${viewer.getJointValue('Slider_25')}`);
            console.log(`  Slider_26 (PartPusher2): ${viewer.getJointValue('Slider_26')}`);
        }, 100);
    }
    
    console.log('✅ Pneumatic devices initialized to neutral positions');
}

// GRIPPER_TEST2 버튼 동적 생성 함수
function generateGripperTest2Buttons() {
    const container = document.getElementById('gripper-test2-buttons');
    if (!container) return;
    
    // 기존 버튼들 제거
    container.innerHTML = '';
    
    // GRIPPER_TEST2_01~21 버튼 동적 생성
    for (let i = 1; i <= 21; i++) {
        const button = document.createElement('button');
        button.className = 'control-btn';
        button.setAttribute('data-action', `scara-gripper-test2-${i.toString().padStart(2, '0')}`);
        button.textContent = `GRIPPER_TEST2_${i.toString().padStart(2, '0')}`;
        container.appendChild(button);
    }
    
    console.log('🔧 GRIPPER_TEST2 buttons generated dynamically');
}

// WebSocket 공압 장치 시각적 업데이트 함수 (WADF 정의 기준)
function updatePneumaticVisual(device, state) {
    if (!viewer.setJointValue) return;
    
    const config = PNEUMATIC_JOINT_VALUES[device];
    if (!config) {
        console.warn(`⚠️ Unknown pneumatic device: ${device}`);
        return;
    }
    
    const targetValue = state ? config.onValue : config.offValue;
    
    if (config.joints) {
        // 다중 조인트 (예: engraving - 그리퍼 양쪽)
        config.joints.forEach(joint => {
            viewer.setJointValue(joint, targetValue);
            console.log(`🔧 WADF ${device}: ${joint} = ${targetValue} (${state ? 'ON' : 'OFF'})`);
        });
    } else {
        // 단일 조인트
        viewer.setJointValue(config.joint, targetValue);
        console.log(`🔧 WADF ${device}: ${config.joint} = ${targetValue} (${state ? 'ON' : 'OFF'})`);
    }
}

// WebSocket 조인트 애니메이션 함수 (INP Control 시스템 활용)
let webSocketAnimations = {}; // 진행 중인 WebSocket 애니메이션 추적

function animateWebSocketJoint(jointName, targetValue) {
    if (!viewer.setJointValue || !viewer.robot?.joints[jointName]) {
        console.warn(`Joint ${jointName} not found`);
        return;
    }
    
    // 기존 애니메이션이 있으면 중단
    if (webSocketAnimations[jointName]) {
        webSocketAnimations[jointName].cancelled = true;
    }
    
    const currentValue = viewer.robot.joints[jointName].angle || 0;
    const animationStartTime = performance.now();
    const animationDuration = useSmoothAnimation ? 500 : 100; // 부드러운 애니메이션: 500ms, 빠른 애니메이션: 100ms
    
    const animationData = {
        cancelled: false,
        startTime: animationStartTime,
        duration: animationDuration,
        startValue: currentValue,
        targetValue: targetValue
    };
    
    webSocketAnimations[jointName] = animationData;
    
    function animate() {
        if (animationData.cancelled) {
            delete webSocketAnimations[jointName];
            return;
        }
        
        const currentTime = performance.now();
        const elapsedTime = currentTime - animationData.startTime;
        const progress = Math.min(elapsedTime / animationData.duration, 1.0);
        
        let newValue;
        if (useSmoothAnimation) {
            // Enhanced smooth easing function (cubic ease-in-out) - INP Control과 동일
            const easedProgress = progress < 0.5 
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            newValue = animationData.startValue + (animationData.targetValue - animationData.startValue) * easedProgress;
        } else {
            // 빠른 애니메이션 (10fps 스타일)
            newValue = progress >= 0.9 ? animationData.targetValue : animationData.startValue;
        }
        
        viewer.setJointValue(jointName, newValue);
        
        if (progress < 1.0) {
            requestAnimationFrame(animate);
        } else {
            // 애니메이션 완료 시 정확한 목표값으로 설정
            viewer.setJointValue(jointName, animationData.targetValue);
            delete webSocketAnimations[jointName];
        }
    }
    
    animate();
}

// Workpart 시스템 (새로 설계 예정)

// 기존 워크파트 함수들 제거됨 - 새로운 시스템으로 대체 예정

// 기존 워크파트 함수들 모두 제거됨 - 새로운 시스템으로 대체 예정

// 워크피스 추가 함수 (동적 바디로 생성) - 기존 함수 유지
function addWorkpiece(name, position = {x: 0, y: 0.5, z: 0}, size = {x: 0.05, y: 0.05, z: 0.05}) {
    if (!physicsWorld || !usePhysics) {
        console.warn('⚠️ Physics not enabled - cannot add workpiece');
        return;
    }

    // Three.js 메시 생성
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xff4444, 
        transparent: true, 
        opacity: 0.8 
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    viewer.scene.add(mesh);

    // Cannon.js 물리 바디 생성
    const shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
    const body = new CANNON.Body({ 
        mass: 0.1, // 가벼운 워크피스
        type: CANNON.Body.DYNAMIC
    });
    body.addShape(shape);
    body.position.set(position.x, position.y, position.z);
    body.material = new CANNON.Material({ 
        friction: 0.8,     // 높은 마찰력
        restitution: 0.2   // 낮은 반발력
    });
    body.linearDamping = 0.1;
    body.angularDamping = 0.1;

    physicsWorld.addBody(body);
    physicsBodies.set(name, { body, mesh, type: 'dynamic' });

    console.log(`📦 Workpiece added: ${name} at (${position.x}, ${position.y}, ${position.z})`);
    return { mesh, body };
}

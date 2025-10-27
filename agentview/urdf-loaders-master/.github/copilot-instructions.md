# URDF-WADF Integration - AI Agent Instructions# URDF-WADF Integration - AI Agent Instructions



## Project Overview## Project Overview



This is a **hybrid industrial automation system** combining:This is a **hybrid industrial automation system** combining:

- **URDF (Unified Robot Description Format)** visualization via Three.js- **URDF (Unified Robot Description Format)** visualization via Three.js

- **WADF (Workflow Automation Decision Framework)** for industrial device control and monitoring- **WADF (Workflow Automation Decision Framework)** for industrial device control and monitoring



The system provides real-time 3D visualization of robotic workcells with integrated device control, performance monitoring, and OPC-UA/MQTT communication.The system provides real-time 3D visualization of robotic workcells with integrated device control, performance monitoring, and OPC-UA/MQTT communication.



## Core Architecture## Core Architecture



### URDF Visualization Layer (`javascript/`)### URDF Visualization Layer (`javascript/`)

- **`URDFLoader.js`**: Converts URDF XML to Three.js scene graphs with ROS→Three.js coordinate transforms- **`URDFLoader.js`**: Converts URDF XML to Three.js scene graphs with ROS→Three.js coordinate transforms

- **`URDFClasses.js`**: Custom Three.js classes (`URDFRobot`, `URDFJoint`, `URDFLink`, `URDFVisual`, `URDFCollider`)- **`URDFClasses.js`**: Custom Three.js classes (`URDFRobot`, `URDFJoint`, `URDFLink`, `URDFVisual`, `URDFCollider`)

- **`urdf-manipulator-element.js`**: Web component with interactive joint manipulation via mouse/touch- **`urdf-manipulator-element.js`**: Web component with interactive joint manipulation via mouse/touch

- **`URDFDragControls.js`**: Raycasting-based joint manipulation system- **`URDFDragControls.js`**: Raycasting-based joint manipulation system



### WADF Industrial Control Layer (`WADF/`)### WADF Industrial Control Layer (`WADF/`)

- **`Linker/`**: Python device drivers (sensors, actuators, robots) with Virtual/Actual/DigitalTwin modes- **`Linker/`**: Python device drivers (sensors, actuators, robots) with Virtual/Actual/DigitalTwin modes

- **`WDF/`**: Workcell Description Files - XML schemas defining device hierarchies and variables- **`WDF/`**: Workcell Description Files - XML schemas defining device hierarchies and variables

- **`WPF/`**: Workcell Performance Files - KPI calculation formulas and data references- **`WPF/`**: Workcell Performance Files - KPI calculation formulas and data references

- **`DSF/`**: Data Service Files - service interfaces for device communication- **`DSF/`**: Data Service Files - service interfaces for device communication

- **`WUIF/`**: UI definition files linking Qt forms to data models- **`WUIF/`**: UI definition files linking Qt forms to data models



### File Organization### File Organization

- `javascript/src/`: Core library modules- `javascript/src/`: Core library modules

- `javascript/example/`: Demo application with tabbed control interface featuring Agent View + User Control panels- `javascript/example/`: Demo application with tabbed control interface featuring Agent View + User Control panels

- `urdf/`: Sample robot models (T12, TriATHLETE variants, INP3)- `urdf/`: Sample robot models (T12, TriATHLETE variants, INP3)



## Key Patterns & Conventions## Key Patterns & Conventions



### URDF Processing Pipeline### URDF Processing Pipeline

1. **Parse XML** → DOM elements via `DOMParser`1. **Parse XML** → DOM elements via `DOMParser`

2. **Process Robot** → Extract links, joints, materials from `<robot>` node2. **Process Robot** → Extract links, joints, materials from `<robot>` node

3. **Build Hierarchy** → Parent/child relationships via joint definitions3. **Build Hierarchy** → Parent/child relationships via joint definitions

4. **Load Meshes** → STL/Collada/OBJ files using Three.js loaders4. **Load Meshes** → STL/Collada/OBJ files using Three.js loaders

5. **Apply Transforms** → URDF coordinates (ROS Z-up) to Three.js coordinates (Y-up)5. **Apply Transforms** → URDF coordinates (ROS Z-up) to Three.js coordinates (Y-up)



### WADF Device Control Architecture## Key Integration Patterns

```python

# All device drivers follow this pattern:

class DeviceName():

    def __init__(self, wdf_path):### WADF Device Control Architecture### Coordinate System Conversion

        self.actual_driver = ACTUAL_DRIVER    # Hardware interface

        self.virtual_driver = VIRTUAL_DRIVER  # Simulation interface  ```python```javascript

        self.mode = "VirtualMode"             # "ActualMode" | "DigitalTwinMode"

        # All device drivers follow this pattern:// URDF uses ROS coordinates (Z-up, X-forward)

        # Auto-generated from WDF files

        wdf = WDFParser(self.wdf_path)class DeviceName():// Three.js uses Y-up, Z-forward

        self.data = wdf.value[wdf.workcell_name][self.linker_name]

        def __init__(self, wdf_path):// No automatic conversion - handle via scene rotation

    @data_store_decorator  # Auto-updates WDF data with timestamps

    def set_state(self, arg):  # Control operations        self.actual_driver = ACTUAL_DRIVER    # Hardware interface```

    def get_state(self):       # Monitoring operations

```        self.virtual_driver = VIRTUAL_DRIVER  # Simulation interface  



### Coordinate System Conversion        self.mode = "VirtualMode"             # "ActualMode" | "DigitalTwinMode"### Joint Types & Manipulation

```javascript

// URDF uses ROS coordinates (Z-up, X-forward)        - **Revolute**: Rotational joints with limits

// Three.js uses Y-up, Z-forward

// Camera positioning in index.js for 2.3x zoom + 80° diagonal view:        # Auto-generated from WDF files- **Prismatic**: Linear joints with limits  

const angle80 = 80 * Math.PI / 180;

const newDistance = distance / 2.3;        wdf = WDFParser(self.wdf_path)- **Fixed**: Static connections (not manipulatable)

camera.position.set(

    target.x + newDistance * 0.7 * cos80 - newDistance * 0.7 * sin80,        self.data = wdf.value[wdf.workcell_name][self.linker_name]- **Mimic**: Joints that follow other joints (infinite loop detection included)

    target.y + newDistance * 0.5,  // Elevated view

    target.z + newDistance * 0.7 * sin80 + newDistance * 0.7 * cos80    

);

```    @data_store_decorator  # Auto-updates WDF data with timestamps### Web Component Pattern



### Joint Types & Manipulation    def set_state(self, arg):  # Control operations```javascript

- **Revolute**: Rotational joints with limits (e.g., `Rotation_31`, `Rotation_36`, `Rotation_151`)

- **Prismatic**: Linear joints with limits (e.g., `Slider_44`, `Slider_41`, `Slider_42`)    def get_state(self):       # Monitoring operations// Custom elements extending HTMLElement

- **Fixed**: Static connections (not manipulatable)

- **Mimic**: Joints that follow other joints (infinite loop detection included)```customElements.define('urdf-viewer', URDFViewer);



### Web Component Pattern// Attribute-based configuration: up="-Z", display-shadow, etc.

```javascript

// Custom elements extending HTMLElement### URDF-WADF Data Flow```

customElements.define('urdf-viewer', URDFManipulator);

// Attribute-based configuration: up="+Z", display-shadow, etc.1. **WADF Configuration** → `INP.wadf` defines workcell layout, devices, communication

// Event system: urdf-change, joint-mouseover, manipulate-start/end

```2. **URDF Models** → Referenced in `<URDFPath>` tags for 3D visualization## Development Workflows



## Development Workflows3. **Device Drivers** → Python classes bridge virtual/physical hardware



### Running Examples4. **Performance Monitoring** → WPF files calculate KPIs from device data streams### Running Examples

```bash

# Serve from project root (no build system - pure ES modules)5. **Web Interface** → Three.js displays URDF models with real-time joint updates```bash

# Access javascript/example/index.html via web server

# Drag-and-drop URDF files/folders (Chrome only)# Serve from project root (no build system - pure ES modules)

```

### Coordinate System Handling# Access javascript/example/index.html via web server

### WADF-URDF Joint Mapping (INP3 System)

```javascript```javascript# Drag-and-drop URDF files/folders (Chrome only)

// SCARA Robot - WADF jointId=[6,7,9,8,10,12] → URDF joints:

const jointMapping = {// URDF uses ROS coordinates (Z-up, X-forward)```

    6: 'Rotation_31',    // theta1 - Base rotation

    7: 'Rotation_36',    // theta2 - Shoulder rotation// Three.js uses Y-up, Z-forward  

    9: 'Rotation_151',   // theta3 - Wrist rotation  

    8: 'Slider_44',      // d1 - Z axis (prismatic)// Camera positioning in index.js:### Testing Robot Models

    10: 'Slider_41',     // d2 - Gripper Left

    12: 'Slider_42'      // d3 - Gripper Rightconst angle80 = 80 * Math.PI / 180;  // 80° diagonal view- Use sample URDFs in `urdf/` directory

};

camera.position.set(- **Flipped versions**: Coordinate system variations for testing

// Pneumatic Actuators → URDF joints:

pneumatics: {    target.x + newDistance * 0.7 * cos80 - newDistance * 0.7 * sin80,- **Original versions**: Direct CAD exports (may have wrong axes)

    assemblyBlock: { joints: ['Slider_17', 'Slider_20'] },  // PalletBlock

    partPusher1: { joints: ['Slider_25'] },                 // Pusher2_11    target.y + newDistance * 0.5,  // Elevated view

    partPusher2: { joints: ['Slider_26'] },                 // Pusher2_21

}    target.z + newDistance * 0.7 * sin80 + newDistance * 0.7 * cos80### Mesh Loading Strategy

```

);```javascript

### Device Control Integration

```javascript```// Default mesh loader in URDFLoader handles:

// Tab-based UI with Agent View (left) + Control Panel (right)

// Tab 1: WADF device control (SCARA, pneumatics, sensors, conveyor)// .stl → STLLoader

// Tab 2: URDF joint manipulation (sliders, limits, coordinate frames)

### Device Operation Modes// .dae → ColladaLoader  

function executeRobotCommand(action) {

    switch(action) {- **VirtualMode**: Pure simulation using virtual drivers (default)// .obj → OBJLoader

        case 'scara-home':

            // Reset SCARA to home position- **ActualMode**: Hardware-only operation via actual drivers  // Override via loadMeshCb for custom formats

            viewer.setJointValue('Rotation_31', 0);

            viewer.setJointValue('Rotation_36', 0);- **DigitalTwinMode**: Parallel virtual + actual execution using `QThreadPool````

            break;

        case 'scara-gripper-test2-01':

            // Execute specific GRIPPER_TEST2 sequence

            wadfScaraRunGripperTest2(1);## Development Workflows## Critical Implementation Details

            break;

    }

}

```### Running the System### Path Resolution



## Critical Implementation Details```bash```javascript



### Mesh Loading Strategy# Serve from project root (ES modules, no build required)// URDF uses package:// URIs → resolve via packages property

```javascript

// Default mesh loader in URDFLoader handles:# Navigate to javascript/example/index.html// Relative mesh paths: "../meshes/part.STL" → relative to URDF file

// .stl → STLLoader, .dae → ColladaLoader, .obj → OBJLoader

// Override via loadMeshCb for custom formats# URDF files: drag-and-drop or use menu (Chrome recommended)```

viewer.loadMeshFunc = (path, manager, done) => {

    const ext = path.split(/\./g).pop().toLowerCase();

    // Custom loading logic per extension

};# Python backend (if using WADF)### Joint Limits & Animation

```

python wadf_websocket_server.py  # Starts OPC-UA server on localhost:4841- `ignoreLimits`: Toggle joint constraint enforcement

### Device Operation Modes

- **VirtualMode**: Pure simulation using virtual drivers (default)```- `setJointValue()`: Programmatic joint control

- **ActualMode**: Hardware-only operation via actual drivers  

- **DigitalTwinMode**: Parallel virtual + actual execution using `QThreadPool`- Animation system respects joint limits by default



### Path Resolution### WADF Configuration Files

```javascript

// URDF uses package:// URIs → resolve via packages property- **`INP.wadf`**: Master configuration linking all subsystems### Drag Controls Architecture

// Relative mesh paths: "../meshes/part.STL" → relative to URDF file

```- **`WDF/InP.wdf`**: Device definitions, variables, data types```javascript



### Joint Limits & Animation- **`Linker/DeviceDriverDefinition.py`**: Hardware driver instantiation// PointerURDFDragControls extends URDFDragControls

- `ignoreLimits`: Toggle joint constraint enforcement

- `setJointValue()`: Programmatic joint control- **`OPCUANodeset/INP.xml`**: OPC-UA server node definitions// Raycasting → find joints → calculate rotation deltas

- Animation system respects joint limits by default

// onDragStart/onDragEnd callbacks for UI state management

### Performance Considerations

- Visual vs collision geometry: `parseVisual`/`parseCollision` flags### Custom Robot Control```

- Mesh caching via Three.js LoadingManager

- Large robot models: consider level-of-detail strategies```javascript



## Extension Points// In index.js - robot command execution pattern:### Performance Considerations



### Custom Mesh Loadersfunction executeRobotCommand(action) {- Visual vs collision geometry: `parseVisual`/`parseCollision` flags

```javascript

loader.loadMeshCb = (path, manager, done) => {    switch(action) {- Mesh caching via Three.js LoadingManager

    // Custom loading logic for proprietary formats

};        case 'move-forward':- Large robot models: consider level-of-detail strategies

```

            animateWalking('forward');  // Custom animation sequences

### Material Customization

```javascript            break;## Extension Points

// Override material processing in processLinkElement()

// URDF <material> tags → Three.js materials        case 'reset-pose':

```

            resetAllJoints();          // Set all joints to 0### Custom Mesh Loaders

### Joint Behavior

```javascript            break;```javascript

// Extend URDFJoint class for custom joint types

// Override joint update logic in drag controls    }loader.loadMeshCb = (path, manager, done) => {

```

}    // Custom loading logic for proprietary formats

## Common Gotchas

- **Coordinate systems**: URDF Z-up vs Three.js Y-up requires manual scene rotation};

- **Mesh paths**: Use relative paths in URDF for portability

- **Joint limits**: Some URDF files have incorrect/missing limits// Joint manipulation:```

- **Memory leaks**: Dispose geometries/materials when switching models

- **File loading**: Use proper web server (not file:// protocol) for CORS complianceviewer.setJointValue(joint.name, value);     // Single joint

- **WADF timing**: Device sequences require proper delays between commands

- **Gripper Test sequences**: GRIPPER_TEST2_01-21 follow specific industrial robot programming patternsviewer.setJointValues(resetValues);         // Batch update### Material Customization

``````javascript

// Override material processing in processLinkElement()

## Critical Implementation Details// URDF <material> tags → Three.js materials

```

### WADF Data Decorator Pattern

```python### Joint Behavior

@data_store_decorator```javascript

def set_state(self, arg):// Extend URDFJoint class for custom joint types

    # Automatically handles:// Override joint update logic in drag controls

    # - WDF data structure updates```

    # - Timestamp logging  

    # - Variable name resolution (ClassName_operation_method_arg)## Common Gotchas

    # - Control vs Monitoring section routing- **Coordinate systems**: URDF Z-up vs Three.js Y-up requires manual scene rotation

```- **Mesh paths**: Use relative paths in URDF for portability

- **Joint limits**: Some URDF files have incorrect/missing limits

### Performance Monitoring (WPF)- **Memory leaks**: Dispose geometries/materials when switching models

```xml- **File loading**: Use proper web server (not file:// protocol) for CORS compliance
<Performance PerformanceName="CycleTime">
    <Measure MeasureName="ProcessStartTime">
        <DataReference Edge="Falling">ProximitySensorIn/Monitoring/state_arg</DataReference>
    </Measure>
    <Formula>(t1 - t0).total_seconds() if (t1 - t0).total_seconds() > 0 else None</Formula>
</Performance>
```

### Three.js Web Component Integration
- Custom elements: `<urdf-viewer>`, `<urdf-manipulator>`
- Attribute-based configuration: `up="+Z"`, `display-shadow`, `ignore-joint-limits`
- Event system: `urdf-change`, `joint-mouseover`, `manipulate-start/end`

### Communication Architecture
- **OPC-UA Server**: `opc.tcp://localhost:4841/` for industrial protocols
- **MQTT Broker**: `141.223.65.211:1883` for IoT communication  
- **WebSocket**: Bridge between web frontend and Python backend (implied)

## Extension Points
- **Custom Mesh Loaders**: Override `loadMeshCb` in URDFLoader
- **Device Drivers**: Extend base classes in `Linker/` directory
- **Performance Metrics**: Add formulas to WPF files
- **UI Components**: Create new WUIF XML definitions

## Common Patterns
- **Multi-mode Operation**: Every device supports Virtual/Actual/DigitalTwin
- **Timestamped Data**: All control/monitoring operations logged with timestamps
- **Threaded Execution**: QThreadPool for non-blocking device operations
- **Configuration-Driven**: XML files define system behavior, Python provides runtime
````
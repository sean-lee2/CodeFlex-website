# CodeFlex - Digital Twin Platform for Smart Factories

## Project Overview

CodeFlex is a comprehensive **no-code digital twin platform** for smart factory automation, combining:

- **Website Frontend**: Marketing and demonstration platform built with HTML, Tailwind CSS, and JavaScript
- **URDF Visualization**: 3D robot model visualization using Three.js and custom URDF loaders
- **WADF Backend**: Workflow Automation Decision Framework with Python device drivers for industrial control
- **Multi-Protocol Integration**: OPC-UA, MQTT, and WebSocket communication for IoT connectivity

The platform enables users to create, simulate, and deploy industrial automation workflows without traditional programming, featuring virtual commissioning and real-time monitoring capabilities.

## Core Architecture

### Website Frontend (`/`)
- **`index.html/index_en.html`**: Main marketing pages with Korean/English localization
- **`js/script.js`**: Frontend application logic with simulation, animations, and form handling
- **`css/style.css`**: Custom styling and responsive design
- **`agentview/agentview.html`**: Interactive 3D robot visualization with automated assembly sequences

### URDF Visualization Layer (`agentview/urdf-loaders-master/javascript/`)
- **`URDFLoader.js`**: Converts URDF XML to Three.js scene graphs with ROS→Three.js coordinate transforms
- **`URDFClasses.js`**: Custom Three.js classes (`URDFRobot`, `URDFJoint`, `URDFLink`, `URDFVisual`, `URDFCollider`)
- **`urdf-manipulator-element.js`**: Web component with interactive joint manipulation via mouse/touch
- **`URDFDragControls.js`**: Raycasting-based joint manipulation system

### WADF Industrial Control Layer (`agentview/urdf-loaders-master/WADF/`)
- **`Linker/`**: Python device drivers (sensors, actuators, robots) with Virtual/Actual/DigitalTwin modes
- **`WDF/`**: Workcell Description Files - XML schemas defining device hierarchies and variables
- **`WPF/`**: Workcell Performance Files - KPI calculation formulas and data references
- **`DSF/`**: Data Service Files - service interfaces for device communication
- **`WUIF/`**: UI definition files linking Qt forms to data models

## Key Developer Workflows

### Running the Website Locally
```bash
# No build system required - pure static files
# Serve from project root using any HTTP server
python -m http.server 8000  # Python 3
# or
npx serve .                 # Node.js
# or use VS Code Live Server extension

# Access at http://localhost:8000
```

### URDF Model Visualization
```bash
# Navigate to agentview/agentview.html
# Models load automatically from urdf/ directory
# Supports INP3, T12, TriATHLETE variants
# Interactive joint manipulation with mouse/touch
```

### WADF Backend Development
```bash
# Requires Python environment with PySide2/Qt
cd agentview/urdf-loaders-master/WADF/

# Device drivers support three modes:
# - VirtualMode: Pure simulation
# - ActualMode: Hardware control
# - DigitalTwinMode: Parallel virtual + actual execution

python -c "from WADF.Linker.SCARARobot import SCARARobot; robot = SCARARobot('path/to/wdf')"
```

## Project-Specific Conventions

### File Organization
- **Website assets**: Flat structure in root (`css/`, `js/`, `images/`)
- **URDF models**: `agentview/urdf/` with subdirectories per robot type
- **WADF components**: Hierarchical XML configuration in `WADF/` subdirectories
- **Python drivers**: `WADF/Linker/` with one class per industrial device

### Naming Patterns
- **URDF joints**: `Rotation_[number]` for revolute, `Slider_[number]` for prismatic
- **WADF devices**: PascalCase class names (e.g., `SCARARobot`, `AssemblySensor`)
- **Configuration files**: `.wadf`, `.wdf`, `.wpf`, `.dsf` extensions
- **HTML IDs**: Kebab-case for sections (`platform-overview`, `core-features`)

### Coordinate System Handling
```javascript
// URDF uses ROS coordinates (Z-up, X-forward)
// Three.js uses Y-up, Z-forward
// Manual scene rotation required for proper visualization

// Camera positioning example (from agentview.html):
camera.position.set(
    target.x + distance * 0.7 * cos80 - distance * 0.7 * sin80,
    target.y + distance * 0.5,  // Elevated view
    target.z + distance * 0.7 * sin80 + distance * 0.7 * cos80
);
```

### Multi-Mode Operation Pattern
```python
# All WADF device drivers follow this pattern:
class DeviceName():
    def __init__(self, wdf_path):
        self.actual_driver = ACTUAL_DRIVER    # Hardware interface
        self.virtual_driver = VIRTUAL_DRIVER  # Simulation interface
        self.mode = "VirtualMode"             # "ActualMode" | "DigitalTwinMode"

    @data_store_decorator  # Auto-updates WDF data with timestamps
    def set_state(self, arg):  # Control operations
        if self.mode == "ActualMode":
            self.actual_driver.operation(arg)
        elif self.mode == "VirtualMode":
            self.virtual_driver.operation(arg)
        elif self.mode == "DigitalTwinMode":
            # Parallel execution using QThreadPool
            pass
```

## Integration Points & Communication

### Web Frontend ↔ URDF Visualization
- **Direct embedding**: `agentview/agentview.html` integrated into website
- **Shared assets**: URDF models and meshes in `urdf/` directory
- **Event system**: URDF viewer events trigger website animations

### URDF Visualization ↔ WADF Backend
- **Joint mapping**: URDF joint names mapped to WADF device parameters
- **Real-time sync**: Joint positions update WADF data structures
- **Automated sequences**: Pre-programmed assembly operations (GRIPPER_TEST2_01-21)

### WADF Backend ↔ Industrial Protocols
- **OPC-UA Server**: `opc.tcp://localhost:4841/` for industrial device communication
- **MQTT Broker**: `141.223.65.211:1883` for IoT data streaming
- **WebSocket**: Real-time data bridge between Python backend and web frontend

### Configuration-Driven Architecture
```xml
<!-- INP.wadf - Master configuration linking all subsystems -->
<WADescription>
    <WAConfig>
        <WorkcellConfig>
            <URDFPath>3DModels/INP3/INP3.urdf</URDFPath>
            <UpdateTimeMS>20.0</UpdateTimeMS>
        </WorkcellConfig>
    </WAConfig>
    <WALinker>
        <LinkerComponent name="SCARARobot">
            <FilePath>WADF/Linker/SCARARobot.py</FilePath>
        </LinkerComponent>
    </WALinker>
</WADescription>
```

## Critical Implementation Details

### URDF Processing Pipeline
1. **Parse XML** → DOM elements via `DOMParser`
2. **Process Robot** → Extract links, joints, materials from `<robot>` node
3. **Build Hierarchy** → Parent/child relationships via joint definitions
4. **Load Meshes** → STL/Collada/OBJ files using Three.js loaders
5. **Apply Transforms** → URDF coordinates (ROS Z-up) to Three.js coordinates (Y-up)

### Joint Types & Manipulation
- **Revolute**: Rotational joints with limits (e.g., `Rotation_31`, `Rotation_36`, `Rotation_151`)
- **Prismatic**: Linear joints with limits (e.g., `Slider_44`, `Slider_41`, `Slider_42`)
- **Fixed**: Static connections (not manipulatable)
- **Mimic**: Joints that follow other joints (infinite loop detection included)

### Web Component Pattern
```javascript
// Custom elements extending HTMLElement
customElements.define('urdf-viewer', URDFViewer);
customElements.define('urdf-manipulator', URDFManipulator);

// Attribute-based configuration:
<urdf-viewer up="+Z" display-shadow ignore-joint-limits></urdf-viewer>

// Event system:
viewer.addEventListener('urdf-change', handleModelChange);
viewer.addEventListener('joint-mouseover', highlightJoint);
```

### Data Flow Architecture
1. **WADF Configuration** → `INP.wadf` defines workcell layout, devices, communication
2. **URDF Models** → Referenced in `<URDFPath>` tags for 3D visualization
3. **Device Drivers** → Python classes bridge virtual/physical hardware
4. **Performance Monitoring** → WPF files calculate KPIs from device data streams
5. **Web Interface** → Three.js displays URDF models with real-time joint updates

## Development Best Practices

### Website Development
- **CDN Dependencies**: Use jsDelivr for Tailwind, DaisyUI, FontAwesome, EmailJS
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

### URDF Integration
- **Mesh Loading**: Support .stl, .dae, .obj formats with Three.js loaders
- **Coordinate Conversion**: Always handle ROS→Three.js coordinate transformation
- **Performance**: Use mesh caching and level-of-detail for complex models
- **Error Handling**: Graceful fallbacks when models fail to load

### WADF Development
- **Thread Safety**: Use QThreadPool for non-blocking device operations
- **Data Persistence**: All operations timestamped and logged via decorators
- **Mode Switching**: Seamless transitions between Virtual/Actual/DigitalTwin modes
- **Testing**: Validate against physical hardware before deployment

## Common Gotchas

- **CORS Issues**: Web server required for local development (not file:// protocol)
- **Coordinate Systems**: URDF Z-up vs Three.js Y-up requires manual scene rotation
- **Mesh Paths**: Use relative paths in URDF files for portability
- **Joint Limits**: Some URDF files have incorrect/missing limits - validate before use
- **Memory Leaks**: Dispose Three.js geometries/materials when switching models
- **Timing Dependencies**: WADF sequences require proper delays between operations
- **Protocol Compatibility**: Ensure OPC-UA/MQTT servers match configuration

## Extension Points

### Adding New Robot Models
1. Place URDF and meshes in `agentview/urdf/[RobotName]/`
2. Update `INP.wadf` with new `<WorkpartConfig>` entries
3. Add joint mappings in visualization code if needed

### Creating Device Drivers
1. Extend base classes in `WADF/Linker/`
2. Implement Virtual/Actual/DigitalTwin mode support
3. Add `@data_store_decorator` to state-changing methods
4. Register in `INP.wadf` Linker configuration

### Adding Website Features
1. Update `js/script.js` with new functionality
2. Add responsive components using Tailwind/DaisyUI
3. Ensure mobile compatibility and accessibility
4. Test across different browsers and devices

## Performance Considerations

- **Web Assets**: Minimize bundle size, use CDN for libraries
- **3D Rendering**: Limit polygon count, use LOD strategies
- **Real-time Updates**: Throttle data updates to prevent UI blocking
- **Memory Management**: Clean up Three.js resources on model changes
- **Network**: Optimize for slow connections, cache static assets

## Testing Strategy

- **Website**: Cross-browser testing, responsive design validation
- **URDF**: Model loading verification, coordinate system accuracy
- **WADF**: Unit tests for device drivers, integration tests for protocols
- **End-to-End**: Full workflow testing from web UI to hardware control

This platform represents a sophisticated integration of web technologies, 3D visualization, and industrial automation, requiring careful attention to both frontend user experience and backend industrial control reliability.
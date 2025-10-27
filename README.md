# TwinWorks - Digital Twin Platform Website

## 🌐 Overview

TwinWorks is a comprehensive **no-code digital twin platform** for smart factory automation. This repository contains the marketing website with Korean/English localization and interactive 3D robot visualization demos.

## 🚀 Live Demo

- **Korean**: [index.html](./index.html)
- **English**: [index_en.html](./index_en.html)
- **3D Visualization**: [AgentView Demo](./agentview/agentview.html)

## 🎯 Key Features

- ✨ **No-Code Programming** - Visual workflow builder for industrial automation
- 🎨 **3D Model Visualization** - Interactive URDF robot models with Three.js
- 🔄 **Virtual Commissioning** - Test automation before physical deployment  
- 📊 **Real-time Integration** - OPC-UA, MQTT, WebSocket connectivity
- 🌍 **Multi-language Support** - Korean/English localization

## 🛠️ Technology Stack

### Frontend
- **HTML5/CSS3** with Tailwind CSS & DaisyUI
- **JavaScript ES6+** with Three.js for 3D rendering
- **Responsive Design** - Mobile-first approach

### 3D Visualization
- **Three.js** - WebGL-based 3D rendering
- **URDF Loader** - Robot model parsing and visualization
- **Custom Web Components** - urdf-viewer, urdf-manipulator elements

### Industrial Integration
- **WADF (Workflow Automation Decision Framework)** - Python backend
- **Multi-Protocol Support** - OPC-UA, MQTT, WebSocket
- **Digital Twin Architecture** - Virtual/Actual/DigitalTwin modes

## 📁 Project Structure

```
CodeFlex-website/
├── index.html                 # Korean main page
├── index_en.html             # English main page  
├── css/
│   └── style.css            # Custom styles
├── js/
│   └── script.js            # Frontend logic
├── images/                  # Image assets
├── agentview/              # 3D visualization components
│   ├── agentview.html
│   ├── urdf/              # 3D robot models
│   └── urdf-loaders-master/ # Three.js URDF loaders
└── upload/                 # Downloadable resources
```

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/sean-lee2/CodeFlex-website.git
cd CodeFlex-website

# Serve locally (choose one method)
python -m http.server 8000        # Python 3
npx serve .                       # Node.js
# or use VS Code Live Server extension

# Access at http://localhost:8000
```

### Language Switching
- Use the language dropdown in the header
- Korean: `index.html`
- English: `index_en.html`

## 🎮 Interactive Features

### 3D Robot Visualization
- **Real-time Joint Manipulation** - Click and drag robot joints
- **Assembly Sequences** - Automated industrial workflows (GRIPPER_TEST2)
- **Multiple View Modes** - Full view, section view, wireframe
- **Coordinate System Handling** - ROS (Z-up) ↔ Three.js (Y-up) conversion

### Industrial Protocols
- **OPC-UA Server**: `opc.tcp://localhost:4841/`
- **MQTT Integration** - IoT data streaming
- **WebSocket Real-time** - Live data visualization

## 📧 Contact & Demo

- **Website**: https://codeflex.co.kr
- **Email**: shlee@codeflex.co.kr
- **Demo Request**: Use the contact form on the website

## 🏭 Industrial Applications

- **Smart Factory Automation**
- **Robot Programming & Simulation**  
- **Virtual Commissioning**
- **Industrial IoT Integration**
- **Digital Twin Development**

## 📜 License

Copyright © 2025 CodeFlex. All rights reserved.

## 🤝 Contributing

This is a commercial project. For collaboration inquiries, please contact us through the website.

---

*Built with ❤️ for the future of smart manufacturing*
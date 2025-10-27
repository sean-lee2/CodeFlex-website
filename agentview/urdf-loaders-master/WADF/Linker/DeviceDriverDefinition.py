'''
Virtual Device & Driver Library
'''
from Device.Virtual_ProximitySensor     import Virtual_ProximitySensor
from Device.Virtual_PneumaticActuator   import Virtual_PneumaticActuator
from Device.Virtual_Conveyor            import Virtual_Conveyor
from Device.Virtual_SCARARobot          import Virtual_SCARARobot
'''
'''
from Driver.VirtualDriver.Virtual_DIODriver         import Virtual_DIODriver
from Driver.VirtualDriver.Virtual_SCARARobotDriver  import Virtual_SCARARobotDriver
'''
Real Device & Driver Library (주석 처리됨 - 실제 장비 연결 시 활성화)
실제 장비 사용 시 아래 주석을 해제하고 해당 드라이버를 설치하세요
'''
# from Driver.ActualDriver.SR3iA.SR3iA import *
# from Driver.ActualDriver.NMC2DIODriver import *
# from Driver.ActualDriver.MXPEtherCATDIODriver import *
# from Driver.ActualDriver.MXPServoMotorDriver import *
# from Driver.ActualDriver.TF031DLiDARUSBDriver import *
# from Driver.ActualDriver.OSESRFIDDriver import *
# from Driver.ActualDriver.RPQRReaderDriver import *
# from Driver.ActualDriver.RSSeries import *

'''
Virtual Proximity Sensor Administration
'''
DI_DEVICES = []
DO_DEVICES = []

DI_PINS = []
DO_PINS = []

DI_PINS.append(2)
DI_DEVICES.append(Virtual_ProximitySensor(robotId=1, linkId=14, direction='y', rayMaxLen=0.1)) # 근접 In

DI_PINS.append(3) 
DI_DEVICES.append(Virtual_ProximitySensor(robotId=1, linkId=16, direction='y', rayMaxLen=0.1)) # 근접 Out

DI_PINS.append(4) 
DI_DEVICES.append(Virtual_ProximitySensor(robotId=1, linkId=15, direction='y', rayMaxLen=0.1)) # 근접 Out

# 실제 장비 연결 시: ADIO_DRIVER = NMC2DIODriver(ip="192.168.0.12", port=2000)
ADIO_DRIVER = None  # 가상 모드용
VDIO_DRIVER = Virtual_DIODriver(DI_devices=DI_DEVICES, DI_pins=DI_PINS, DO_devices=DO_DEVICES, DO_pins=DO_PINS, period_ms=500)

'''
Virutal Pneumatic Actuator Administration
'''

DI_DEVICES = []
DO_DEVICES = []

DI_PINS = []
DO_PINS = []

DO_PINS.append(5)
DO_DEVICES.append(Virtual_PneumaticActuator(robotId=1, jointId=20, oriPos=0.0, tarPos=0.16, tarVel=0.8, tarForce=5000, lateralFriction=5.0)) # 공압 In

DO_PINS.append(6)
DO_DEVICES.append(Virtual_PneumaticActuator(robotId=1, jointId=22, oriPos=0.0, tarPos=0.16, tarVel=0.8, tarForce=5000, mass=0.1, lateralFriction=0.8)) # 공압 Out

DO_PINS.append(4)
DO_DEVICES.append(Virtual_PneumaticActuator(robotId=1, jointId=25, oriPos=0.0, tarPos=-0.08, tarVel=10.0, tarForce=5000)) # 파트 그리퍼 L

DO_PINS.append(3)
DO_DEVICES.append(Virtual_PneumaticActuator(robotId=1, jointId=27, oriPos=0.0, tarPos=-0.08, tarVel=10.0, tarForce=5000)) # 파트 그리퍼 R

'''
Virtual DIO Driver Administration
'''
# 실제 장비 연결 시: ADIO_DRIVER2 = NMC2DIODriver(ip="192.168.0.11", port=1000)
ADIO_DRIVER2 = None  # 가상 모드용
VDIO_DRIVER2 = Virtual_DIODriver(DI_devices=DI_DEVICES, DI_pins=DI_PINS, DO_devices=DO_DEVICES, DO_pins=DO_PINS, period_ms=500)

'''
'''
ACVY_DEVICE = None
VCVY_DEVICE = Virtual_Conveyor(robotId=1, linkId=0, linVel=1.0, direction='x')

'''
'''
VSCR_DEVICE = Virtual_SCARARobot(robotId=1, jointId=[6, 7, 9, 8, 10, 12])

# 실제 장비 연결 시: ASCR_DRIVER = SR3iA(host="192.168.0.123", password="ADMIN")
ASCR_DRIVER = None  # 가상 모드용
VSCR_DRIVER = Virtual_SCARARobotDriver(scaraRobot=VSCR_DEVICE)
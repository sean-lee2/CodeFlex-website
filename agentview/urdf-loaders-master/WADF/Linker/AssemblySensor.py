from WADF.Linker.DeviceDriverDefinition import ADIO_DRIVER, VDIO_DRIVER
from WADF.Linker.CommonDecorators import data_store_decorator
from Parser.WDFParser import *
from PySide2.QtCore import QRunnable, QThread, QThreadPool, Signal, QObject, QTimer

class AssemblySensor():
    def __init__(self, wdf_path):
        self.actual_driver = ADIO_DRIVER
        self.virtual_driver = VDIO_DRIVER
        # self.mode = "ActualMode"
        self.mode = "VirtualMode"
        # self.mode = "DigitalTwinMode"
        self.pin = [3]

        '''
        Modified Part
        '''
        self.wdf_path = wdf_path
        wdf = WDFParser(self.wdf_path)
        self.wdf = wdf.value
        
        self.linker_name = self.__class__.__name__
        self.data = self.wdf[wdf.workcell_name][self.linker_name]

        self.timer = QTimer()  # QTimer 생성
        self.timer.timeout.connect(self.get_state)  # QTimer와 get_state 연결
        self.timer.start(200)

    def switch_mode(self, mode):
        self.mode = mode
        
    '''
    '''
    @data_store_decorator
    def get_state(self):
        if self.mode == "VirtualMode":
            return self.virtual_driver.Read(pins=self.pin)[0]
        
        elif self.mode == "ActualMode":
            return self.actual_driver.digital_read(pin_number=self.pin[0])
        
        elif self.mode == "DigitalTwinMode":
            virtual_result = self.virtual_driver.Read(pins=self.pin)[0]
            actual_result = self.actual_driver.digital_read(pin_number=self.pin[0])
            return actual_result
                
        else:
            print(f"{self.mode} is not defined..!")

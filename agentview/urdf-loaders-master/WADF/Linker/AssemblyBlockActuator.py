from WADF.Linker.DeviceDriverDefinition import ADIO_DRIVER2, VDIO_DRIVER2
from WADF.Linker.CommonDecorators import data_store_decorator
from Parser.WDFParser import *
from PySide2.QtCore import QRunnable, QThread, QThreadPool, Signal, QObject

'''
Linker Instance File로 부터 생성된 Python File
'''

class AssemblyBlockActuator():
    def __init__(self, wdf_path):
        self.actual_driver = ADIO_DRIVER2
        self.virtual_driver = VDIO_DRIVER2
        self.mode = "VirtualMode"   
        # self.mode = "DigitalTwinMode"
        self.pin = [5]
        
        '''
        Modified Part
        '''
        self.wdf_path = wdf_path
        wdf = WDFParser(self.wdf_path)
        self.wdf = wdf.value
        
        self.linker_name = self.__class__.__name__
        self.data = self.wdf[wdf.workcell_name][self.linker_name]
        '''
        '''
        self.is_running = False
        self.thread_pool = QThreadPool()
        self.task_done = TaskSignal()
        self.task_done.result_signal.connect(self.update_linker_state)

    def switch_mode(self, mode):
        self.mode = mode
        
    def update_linker_state(self, result):
        print(f"result: {result}")
        self.is_running = False # Decorator에서 장비 상태 업데이트 수행

    @data_store_decorator
    def set_state(self, arg):
        '''
            Input Argument Name: arg
        '''
        '''
            User-Define Code
        '''
        if self.mode == "VirtualMode":
            return self.virtual_driver.Write(pins=self.pin, states=[arg])
        
        elif self.mode == "ActualMode":
            return self.actual_driver.digital_write(pins=self.pin[0], states=arg)
        
        elif self.mode == "DigitalTwinMode":
            control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'Write', self.pin, [arg])
            control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'digital_write', self.pin[0], arg)

            self.thread_pool.start(control_task_1)
            self.thread_pool.start(control_task_2)

        else:
            print(f"{self.mode} is not defined..!")
        print(f"updated linker data: {self.data}")
    
    @data_store_decorator
    def get_state(self):
        '''
            Output Argument Name: arg
        '''
        arg = None
        '''
            User-Define Code
        '''
        if self.mode == "VirtualMode":
            arg = self.virtual_driver.Read(pins=self.pin)
        elif self.mode == "ActualMode":
            arg = self.actual_driver.Read(pins=self.pin)
        elif self.mode == "DigitalTwinMode":
            arg1 = self.virtual_driver.Read(pins=self.pin)
            arg = self.actual_driver.Read(pins=self.pin)
        else:
            print(f"{self.mode} is not defined..!")
        
        return arg
        
class TaskSignal(QObject):
    task_done = Signal(object)
    result_signal = Signal(str)

class ControlTask(QRunnable):
    def __init__(self, task_done, delay_ms, driver, method_name, *args):
        super().__init__()
        self.task_done = task_done
        self.delay_ms = delay_ms

        self.driver = driver
        self.method_name = method_name
        self.args = args


    def run(self):
        if hasattr(self.driver, self.method_name):
            method = getattr(self.driver, self.method_name)
            method(*self.args)
            
        else:
            print(f"Error: {self.method_name} not found in {self.driver}")

class MonitoringTask(QRunnable):
    def __init__(self, driver, method_name, *args):
        super().__init__()
        self.driver = driver
        self.method_name = method_name
        self.args = args

    def run(self):
        if hasattr(self.driver, self.method_name):
            method = getattr(self.driver, self.method_name)
            result = method(*self.args)
        else:
            print(f"Error: {self.method_name} not found in {self.driver}")
from WADF.Linker.DeviceDriverDefinition import ACVY_DEVICE, VCVY_DEVICE
from Parser.WDFParser import *
from PySide2.QtCore import QRunnable, QEventLoop, QThreadPool, Signal, QObject, QTimer

class Conveyor():
    def __init__(self, wdf_path):
        self.actual_driver = ACVY_DEVICE
        self.virtual_driver = VCVY_DEVICE
        self.mode = "VirtualMode"   
        # self.mode = "DigitalTwinMode"
        # self.mode = "ActualMode"
        
        self.pin = []
        '''
        '''
        self.is_running = False
        self.thread_pool = QThreadPool()
        self.task_done = TaskSignal()
        self.task_done.result_signal.connect(self.update_linker_state)
        '''
        '''
        
    def msleep(self, delay_ms):
        loop = QEventLoop()
        QTimer.singleShot(int(delay_ms), loop.quit)
        loop.exec_()
            
    def update_linker_state(self, result):
        print(f"result: {result}")
        self.is_running = False # Decorator에서 장비 상태 업데이트 수행
            
    def power_on(self):
        if self.mode == "ActualMode":
            pass
        elif self.mode == "VirtualMode":
            self.virtual_driver.power_on()
        elif self.mode == "DigitalTwinMode":
            pass
            
    def power_off(self):
        if self.mode == "ActualMode":
            pass
        elif self.mode == "VirtualMode":
            self.virtual_driver.power_off()
        elif self.mode == "DigitalTwinMode":
            pass


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
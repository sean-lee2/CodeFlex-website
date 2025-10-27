from WADF.Linker.DeviceDriverDefinition import ASCR_DRIVER, VSCR_DRIVER
from WADF.Linker.CommonDecorators import data_store_decorator
from Parser.WDFParser import *
from PySide2.QtCore import QRunnable, QEventLoop, QThreadPool, Signal, QObject, QTimer
import numpy as np
'''
Linker Instance File로 부터 생성된 Python File
'''

class SCARARobot():
    def __init__(self, wdf_path):
        self.actual_driver = ASCR_DRIVER
        self.virtual_driver = VSCR_DRIVER
        self.mode = "VirtualMode"
        # self.mode = "ActualMode"
        # self.mode = "DigitalTwinMode"
        
        '''
        Modified Part
        '''
        # self.wdf_path = wdf_path
        # wdf = WDFParser(self.wdf_path)
        # self.wdf = wdf.value
        
        # self.linker_name = self.__class__.__name__
        # self.data = self.wdf[wdf.workcell_name][self.linker_name]
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

    def msleep(self, delay_ms):
        loop = QEventLoop()
        QTimer.singleShot(int(delay_ms), loop.quit)
        loop.exec_()

    def connect(self):
        if self.mode == "ActualMode":
            self.actual_driver.connect()
        elif self.mode == "VirtualMode":
            self.virtual_driver.set_power(1)
        elif self.mode == "DigitalTwinMode":
            self.actual_driver.connect()
            self.virtual_driver.set_power(1)

    def set_power(self, power):

        if self.mode == "ActualMode":
            pass
        elif self.mode == "VirtualMode":
            self.virtual_driver.set_power(power)
        elif self.mode == "DigitalTwinMode":
            pass

    # @data_store_decorator
    def set_absPosition(self, theta1=None, theta2=None, theta3=None, d1=None, d2=None, d3=None):
        if self.mode == "ActualMode":
            pass
        elif self.mode == "VirtualMode":
            self.virtual_driver.MoveAbsolute(theta1=theta1, theta2=theta2, theta3=theta3, d1=d1, d2=d2, d3=d3)
        elif self.mode == "DigitalTwinMode":
            pass

    def set_program(self, program):
        if self.mode == "ActualMode":
            print(f"program:{program}")
            self.actual_driver.set_program(program)
        elif self.mode == "VirtualMode":
            if program == "GRIPPER_TEST2_01":
                self.virtual_driver.MoveAbsolute(np.deg2rad(-22.3), np.deg2rad(1.4), np.deg2rad(69.3), 0.0, None, None)
                self.msleep(1000)

            elif program == "GRIPPER_TEST2_02":
                self.virtual_driver.MoveAbsolute(None, None, None, -0.045, None, None)
                self.msleep(7000)

            elif program == "GRIPPER_TEST2_03":
                self.virtual_driver.MoveAbsolute(None, None, None, None, 0.0135, 0.0135)
                self.msleep(500)

            elif program == "GRIPPER_TEST2_04":
                self.virtual_driver.MoveAbsolute(None, None, None, None, 0.0135, 0.0135)
                self.msleep(500)

            elif program == "GRIPPER_TEST2_05":
                self.msleep(500)

            elif program == "GRIPPER_TEST2_06":
                self.msleep(500)

            elif program == "GRIPPER_TEST2_07":
                self.virtual_driver.MoveAbsolute(None, None, None, 0.0, None, None)
                self.msleep(7000)

            elif program == "GRIPPER_TEST2_08":
                self.virtual_driver.MoveAbsolute(np.deg2rad(85), np.deg2rad(-65), np.deg2rad(200), None, None, None)
                self.msleep(3000)

            elif program == "GRIPPER_TEST2_09":
                self.virtual_driver.MoveAbsolute(None, None, None, -0.02, None, None)
                self.msleep(2000)

            elif program == "GRIPPER_TEST2_10":
                self.virtual_driver.MoveAbsolute(None, None, None, -0.04, None, None)
                self.msleep(2500)

            elif program in ["GRIPPER_TEST2_11", "GRIPPER_TEST2_12", "GRIPPER_TEST2_13", "GRIPPER_TEST2_14", "GRIPPER_TEST2_15"]:
                self.msleep(1000)

            elif program == "GRIPPER_TEST2_16":
                self.virtual_driver.MoveAbsolute(None, None, None, None, 0.0, 0.0)
                self.msleep(500)

            elif program in ["GRIPPER_TEST2_17", "GRIPPER_TEST2_18", "GRIPPER_TEST2_19"]:
                self.msleep(500)

            elif program == "GRIPPER_TEST2_20":
                self.virtual_driver.MoveAbsolute(None, None, None, 0.0, None, None)
                self.msleep(3000)

            elif program == "GRIPPER_TEST2_21":
                self.virtual_driver.MoveAbsolute(np.deg2rad(0.0), np.deg2rad(0.0), np.deg2rad(90.0), 0.0, None, None)
                self.msleep(3000)
                
        elif self.mode == "DigitalTwinMode":
            if program == "GRIPPER_TEST2_01":
                control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'MoveAbsolute', np.deg2rad(-22.3), np.deg2rad(1.4), np.deg2rad(69.3), 0.0, None, None)
                control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'set_program', program)

                self.thread_pool.start(control_task_1)
                self.thread_pool.start(control_task_2)

                self.msleep(1000)

            elif program == "GRIPPER_TEST2_02":
                control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'MoveAbsolute', None, None, None, -0.045, None, None)
                control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'set_program', program)

                self.thread_pool.start(control_task_1)
                self.thread_pool.start(control_task_2)
                self.msleep(7000)

            elif program == "GRIPPER_TEST2_03":
                control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'MoveAbsolute', None, None, None, None, 0.0135, 0.0135)
                control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'set_program', program)

                self.thread_pool.start(control_task_1)
                self.thread_pool.start(control_task_2)
                self.msleep(500)

            elif program == "GRIPPER_TEST2_04":
                control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'MoveAbsolute', None, None, None, None, 0.0135, 0.0135)
                control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'set_program', program)

                self.thread_pool.start(control_task_1)
                self.thread_pool.start(control_task_2)
                self.msleep(500)

            elif program == "GRIPPER_TEST2_05":
                self.actual_driver.set_program(program)
                self.msleep(500)

            elif program == "GRIPPER_TEST2_06":
                self.actual_driver.set_program(program)
                self.msleep(500)

            elif program == "GRIPPER_TEST2_07":
                control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'MoveAbsolute', None, None, None, 0.0, None, None)
                control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'set_program', program)

                self.thread_pool.start(control_task_1)
                self.thread_pool.start(control_task_2)
                self.msleep(7000)

            elif program == "GRIPPER_TEST2_08":
                control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'MoveAbsolute', np.deg2rad(85), np.deg2rad(-65), np.deg2rad(200), None, None, None)
                control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'set_program', program)

                self.thread_pool.start(control_task_1)
                self.thread_pool.start(control_task_2)
                self.msleep(3000)

            elif program == "GRIPPER_TEST2_09":
                control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'MoveAbsolute', None, None, None, -0.02, None, None)
                control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'set_program', program)

                self.thread_pool.start(control_task_1)
                self.thread_pool.start(control_task_2)
                self.msleep(2000)

            elif program == "GRIPPER_TEST2_10":
                control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'MoveAbsolute', None, None, None, -0.04, None, None)
                control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'set_program', program)

                self.thread_pool.start(control_task_1)
                self.thread_pool.start(control_task_2)
                self.msleep(2500)

            elif program in ["GRIPPER_TEST2_11", "GRIPPER_TEST2_12", "GRIPPER_TEST2_13", "GRIPPER_TEST2_14", "GRIPPER_TEST2_15"]:
                self.actual_driver.set_program(program)
                self.msleep(1000)

            elif program == "GRIPPER_TEST2_16":
                control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'MoveAbsolute', None, None, None, None, 0.0, 0.0)
                control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'set_program', program)

                self.thread_pool.start(control_task_1)
                self.thread_pool.start(control_task_2)
                self.msleep(500)

            elif program in ["GRIPPER_TEST2_17", "GRIPPER_TEST2_18", "GRIPPER_TEST2_19"]:
                self.actual_driver.set_program(program)
                self.msleep(500)

            elif program == "GRIPPER_TEST2_20":
                control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'MoveAbsolute', None, None, None, 0.0, None, None)
                control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'set_program', program)

                self.thread_pool.start(control_task_1)
                self.thread_pool.start(control_task_2)
                self.msleep(3000)

            elif program == "GRIPPER_TEST2_21":
                control_task_1 = ControlTask(self.task_done, 1500, self.virtual_driver, 'MoveAbsolute', np.deg2rad(0.0), np.deg2rad(0.0), np.deg2rad(90.0), 0.0, None, None)
                control_task_2 = ControlTask(self.task_done, 1500, self.actual_driver, 'set_program', program)

                self.thread_pool.start(control_task_1)
                self.thread_pool.start(control_task_2)

                self.msleep(3000)

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
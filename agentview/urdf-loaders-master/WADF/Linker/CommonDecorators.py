"""
WADF 공통 데코레이터 모듈
모든 디바이스 드라이버에서 공통으로 사용하는 데코레이터들을 정의
"""
from functools import wraps
from datetime import datetime

def data_store_decorator(func):
    """
    WADF 표준 데이터 저장 데코레이터
    모든 디바이스 드라이버에서 공통으로 사용
    """
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        method_name = func.__name__
        if method_name.startswith("set"):
            operation_type = "control"
            key_name = f"{self.__class__.__name__}_{operation_type}_{method_name[4:]}_arg"
        elif method_name.startswith("get"):
            operation_type = "monitoring"
            key_name = f"{self.__class__.__name__}_{operation_type}_{method_name[4:]}_arg"
        else:
            key_name = f"{self.__class__.__name__}_Unknown"

        # Determine the section
        section = "Control" if method_name.startswith("set") else "Monitoring"

        time_stamp = datetime.now()
        
        # Validate key existence
        if key_name in self.data.get(section, {}):
            if method_name.startswith("set"):
                self.data[section][key_name]["Value"] = args[0]
                self.data[section][key_name]["Timestamp"] = time_stamp
            elif method_name.startswith("get"):
                result = func(self, *args, **kwargs)
                self.data[section][key_name]["Value"] = result
                self.data[section][key_name]["Timestamp"] = time_stamp
                return result
        else:
            print(f"Key {key_name} not found in {section}. Skipping update.")

        return func(self, *args, **kwargs)

    return wrapper

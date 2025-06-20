import sys

dummy_esp = type("esp", (), {})()
dummy_esp.flash_size = lambda: 4096 # type: ignore
dummy_esp.__name__ = "esp" # type: ignore

dummy_machine = type("machine", (), {})()
dummy_machine.reset = lambda: print("Simulated machine.reset()") # type: ignore
dummy_machine.soft_reset = lambda: print("Simulated machine.soft_reset()") # type: ignore
dummy_machine.__name__ = "machine" # type: ignore

sys.modules["esp"] = dummy_esp # type: ignore
sys.modules["machine"] = dummy_machine # type: ignore

sys.path.insert(0, 'src')

import os

class TestRunner:
    def __init__(self):
        pass

    def _isDirectory(self, path):
        try:
            return (os.stat(path)[0] & 0x4000) != 0
        except:
            return False

    def _findTests(self, path):
        tests = []

        for item in os.listdir(path):
            fullPath = f'{path}/{item}'

            if self._isDirectory(fullPath):
                tests = tests + self._findTests(fullPath)
                continue

            if item.startswith("test_") and item.endswith(".py"):
                tests.append(fullPath)

        return tests

    def run(self, path="tests"):
        tests = self._findTests(path)
        failures = 0
        result = {"total": len(tests), "failures": failures}

        for test in tests:
            print("Running:", test)

            try:
                namespace = {}
                testFile = open(test)
                code = testFile.read()
                exec(code, namespace)
                testFile.close()
                
                print('✅', test, 'passed')
            except Exception as e:
                failures += 1

                print('❌', test, 'failed:', e)

        result['failures'] = failures

        return result

if __name__ == "__main__":
    testRunner = TestRunner()
    result = testRunner.run()

    if result['failures'] > 0:
        sys.exit(1)
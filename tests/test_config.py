import unittest

import os
from config import Config
from json import dumps

CONFIG_JSON = b'{"hostname":"wtls","wifi":{"interface":"C","ssid":"SSID","key":"asdf1234"}}'

class ConfigTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.configFileName = 'conf.tmp.json'
        configFile = open(cls.configFileName, 'w')
        configFile.write(CONFIG_JSON)
        configFile.close()

        cls.config = Config(cls.configFileName)
    
    def testGet(self):
        self.assertEqual('C', self.config.get('wifi.interface'))
    
    @classmethod
    def tearDownClass(cls):
        os.remove(cls.configFileName)

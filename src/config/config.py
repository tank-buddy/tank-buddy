from json import load, dumps
from schema import DictSchema, DictSchemaException
import re

class Config:
    def __init__(self, pathToConfigFile):
        self.pathToConfigFile = pathToConfigFile
        self.dictSchema = None
        self.load()
        
    def load(self):
        configFile = open(self.pathToConfigFile)

        self.data = load(configFile)
        
        configFile.close()

    def get(self, key):
        valuePart = None

        for keyPart in key.split('.'):
            try:
                if valuePart is None:
                    valuePart = self.data[keyPart]
                    continue
                
                valuePart = valuePart[keyPart]
            except KeyError:
                valuePart = None
                break
        
        return valuePart
    
    def apply(self, dataToApply):
        try:
            self._getDictSchema().validate(dataToApply)
            
            configFile = open(self.pathToConfigFile, "w")
            configFile.write(dumps(dataToApply))
            configFile.close()
        except DictSchemaException:
            raise Exception("Data to apply is not valid.")
        except Exception as e:
            raise e

    def _getDictSchema(self):
        if self.dictSchema is not None:
            return self.dictSchema

        self.dictSchema = DictSchema(
            {
                'hostname': lambda value, keyValueMap : re.search("^[a-z]+(-[a-z]+)*$", value),
                'wifi.interface': lambda value, keyValueMap : re.search("^(C|AP)$", value),
                'wifi.ssid': lambda value, keyValueMap : isinstance(value, str),
            },
            {
                'wifi.key': lambda value, keyValueMap : isinstance(value, str)
            }
        )

        return self.dictSchema

    def toJson(self):
        return dumps(self.data)
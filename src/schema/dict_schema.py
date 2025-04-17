from schema.key_value_map_mapper import KeyValueMapMapper
from schema.exceptions import DictSchemaException

class DictSchema:
    def __init__(self, required, optional):
        self.required = required
        self.optional = optional
        self.keyValueMapMapper = KeyValueMapMapper()

    def validate(self, dict):
        keyValueMap = self.keyValueMapMapper.fromDict(dict)

        for key in keyValueMap.keys():
            if key in self.required and self.required[key](keyValueMap[key], keyValueMap):
                continue
            
            if key in self.optional and self.required[key](keyValueMap[key], keyValueMap):
                continue
            
            raise DictSchemaException(f'Value for key path {key} is not valid')
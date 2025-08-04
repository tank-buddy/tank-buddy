from schema.key_value_map_mapper import KeyValueMapMapper
from schema.exceptions import DictSchemaException


class DictSchema:
    def __init__(self, required, optional):
        self.required = required
        self.optional = optional
        self.key_value_map_mapper = KeyValueMapMapper()

    def validate(self, dict):
        key_value_map = self.key_value_map_mapper.fromDict(dict)

        for key in key_value_map.keys():
            if key in self.required and self.required[key](
                key_value_map[key], key_value_map
            ):
                continue

            if key in self.optional and self.optional[key](
                key_value_map[key], key_value_map
            ):
                continue

            raise DictSchemaException(f"Value for key path {key} is not valid")

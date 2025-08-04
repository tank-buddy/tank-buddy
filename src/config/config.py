from json import load, dumps
from schema import DictSchema, DictSchemaException
import re


class Config:
    def __init__(self, path_to_config_file):
        self.path_to_config_file = path_to_config_file
        self.dict_schema = None
        self.load()

    def load(self):
        configFile = open(self.path_to_config_file)

        self.data = load(configFile)

        configFile.close()

    def get(self, key):
        valuePart = None

        for keyPart in key.split("."):
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
            self._get_dict_schema().validate(dataToApply)

            configFile = open(self.path_to_config_file, "w")
            configFile.write(dumps(dataToApply))
            configFile.close()
        except DictSchemaException:
            raise Exception("Data to apply is not valid.")
        except Exception as e:
            raise e

    def _get_dict_schema(self):
        if self.dict_schema is not None:
            return self.dict_schema

        self.dict_schema = DictSchema(
            {
                "wifi.interface": lambda value, keyValueMap: re.search(
                    "^(C|AP)$", value
                ),
                "wifi.ssid": lambda value, keyValueMap: isinstance(value, str),
                "waterTank.height": lambda value, keyValueMap: isinstance(value, int)
                and value > 0,
                "waterTank.minDistance": lambda value, keyValueMap: isinstance(
                    value, int
                )
                and value >= 0,
            },
            {"wifi.key": lambda value, keyValueMap: isinstance(value, str)},
        )

        return self.dict_schema

    def to_json(self):
        return dumps(self.data)

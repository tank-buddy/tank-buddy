class KeyValueMapMapper:
    def __init__(self):
        pass

    def fromDict(self, dict):
        return self._mapDictToKeyValueMap(None, dict, {})

    def _mapDictToKeyValueMap(self, key, dict, keyValueMap):
        for dictKey in dict.keys():
            newKey = dictKey

            if key is not None:
                newKey = f"{key}.{newKey}"

            if isinstance(dict[dictKey], (bool, str, int, float, type(None))):
                keyValueMap[newKey] = dict[dictKey]
                continue

            keyValueMap = self._mapDictToKeyValueMap(newKey, dict[dictKey], keyValueMap)

        return keyValueMap

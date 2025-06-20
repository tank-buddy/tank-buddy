import unittest
from schema import KeyValueMapMapper, DictSchema, DictSchemaException

class KeyValueMapMapperTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mapper = KeyValueMapMapper()

    def test_empty_dict(self):
        result = self.mapper.fromDict({})
        self.assertEqual(result, {})

    def test_flat_dict(self):
        input_dict = {
            "a": 1,
            "b": True,
            "c": "text"
        }
        expected = {
            "a": 1,
            "b": True,
            "c": "text"
        }
        result = self.mapper.fromDict(input_dict)
        self.assertEqual(result, expected)

    def test_nested_dict(self):
        input_dict = {
            "a": {
                "b": {
                    "c": 42
                }
            }
        }
        expected = {
            "a.b.c": 42
        }
        result = self.mapper.fromDict(input_dict)
        self.assertEqual(result, expected)

    def test_multiple_nested_keys(self):
        input_dict = {
            "x": {
                "y": 1,
                "z": {
                    "w": "test"
                }
            },
            "foo": False
        }
        expected = {
            "x.y": 1,
            "x.z.w": "test",
            "foo": False
        }
        result = self.mapper.fromDict(input_dict)
        self.assertEqual(result, expected)

    def test_none_value(self):
        input_dict = {
            "a": None,
            "b": {
                "c": None
            }
        }
        expected = {
            "a": None,
            "b.c": None
        }
        result = self.mapper.fromDict(input_dict)
        self.assertEqual(result, expected)

def always_valid(value, context):
    return True

def is_positive(value, context):
    return isinstance(value, int) and value > 0

def is_non_empty_string(value, context):
    return isinstance(value, str) and len(value) > 0

class DictSchemaTest(unittest.TestCase):
    def test_valid_required_fields(self):
        required = {
            "a": is_positive,
            "b.c": is_non_empty_string
        }
        optional = {}

        schema = DictSchema(required, optional)
        data = {
            "a": 5,
            "b": {
                "c": "hello"
            }
        }

        try:
            schema.validate(data)  # should not raise
        except DictSchemaException:
            self.fail("DictSchemaException was raised unexpectedly")

    def test_invalid_required_field_raises(self):
        required = {
            "x": is_positive
        }
        optional = {}

        schema = DictSchema(required, optional)
        data = {
            "x": -3
        }

        try:
            schema.validate(data)
            self.fail("Expected DictSchemaException to be raised")
        except DictSchemaException:
            pass

    def test_optional_field_validates(self):
        required = {
            "a": always_valid
        }
        optional = {
            "b": is_non_empty_string
        }

        schema = DictSchema(required, optional)
        data = {
            "a": 1,
            "b": "optional-value"
        }

        try:
            schema.validate(data)
        except DictSchemaException:
            self.fail("DictSchemaException was raised unexpectedly")

    def test_optional_field_invalid_raises(self):
        required = {
            "a": always_valid
        }
        optional = {
            "b": is_non_empty_string
        }

        schema = DictSchema(required, optional)
        data = {
            "a": 1,
            "b": ""  # invalid optional field
        }

        try:
            schema.validate(data)
            self.fail("Expected DictSchemaException to be raised")
        except DictSchemaException:
            pass

    def test_ignores_unlisted_keys(self):
        required = {
            "a": always_valid
        }
        optional = {}

        schema = DictSchema(required, optional)
        data = {
            "a": 1,
            "extra": "ignored"
        }

        try:
            schema.validate(data)
            self.fail("Expected DictSchemaException to be raised")
        except DictSchemaException:
            pass
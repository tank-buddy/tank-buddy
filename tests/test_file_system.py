import unittest

from file_system import FileSystem

class TestFileSystem(unittest.TestCase):
    def test_file_exists_true(self):
        def fake_stat(path):
            return (0,)  # beliebiger Rückgabewert genügt
        fs = FileSystem(stat_fn=fake_stat)
        self.assertTrue(fs.file_exists('/fake/path.txt'))

    def test_file_exists_false(self):
        def fake_stat(path):
            raise OSError("file not found")
        fs = FileSystem(stat_fn=fake_stat)
        self.assertFalse(fs.file_exists('/does/not/exist.txt'))

    def test_get_extension_with_extension(self):
        fs = FileSystem()
        self.assertEqual(fs.get_extension('file.txt'), '.txt')
        self.assertEqual(fs.get_extension('/path/to/file.md'), '.md')

    def test_get_extension_without_extension(self):
        fs = FileSystem()
        self.assertEqual(fs.get_extension('file'), '')
        self.assertEqual(fs.get_extension('/path/file'), '')

    def test_get_extension_with_multiple_dots(self):
        fs = FileSystem()
        self.assertEqual(fs.get_extension('archive.tar.gz'), '.gz')
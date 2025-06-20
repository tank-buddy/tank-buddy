from os import stat

class FileSystem:
    def __init__(self, stat_fn=stat):
        self._stat = stat_fn
        pass

    def file_exists(self, path):
        try:
            self._stat(path)
            return True
        except OSError:
            return False
    
    def get_extension(self, path):
        dot = path.rfind('.')
        
        if dot == -1:
            return ''
        
        return path[dot:]

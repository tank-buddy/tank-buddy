class BytesMapper:
    def __init__(self):
        pass

    def from_ip(self, ip):
        return bytes(map(int, ip.split(".")))

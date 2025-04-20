class BytesMapper:
    def __init__(self):
        pass

    def fromIp(self, ip):
        return bytes(map(int, ip.split(".")))

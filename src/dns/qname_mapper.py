class QNameMapper:
    def __init__(self):
        pass

    def fromRequest(self, request):
        labels = []
        i = 12
        length = request[i]

        while length != 0:
            i += 1
            labels.append(request[i : i + length].decode())
            i += length
            length = request[i]

        return ".".join(labels).lower()

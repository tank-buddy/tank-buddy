import unittest
from dns import DumpDns, Mdns, QNameMapper, BytesMapper

class DummyDnsRecord:
    def __init__(self, domain, ip):
        self.domain = domain
        self.ip = ip


class DummyQNameMapper:
    def __init__(self, fixed_qname):
        self.fixed_qname = fixed_qname

    def fromRequest(self, request):
        return self.fixed_qname


class DummyBytesMapper:
    def fromIp(self, ip):
        # 127.0.0.1 -> b'\x7f\x00\x00\x01'
        return bytes(map(int, ip.split('.')))


class DummyUDP:
    def __init__(self, request, address):
        self._request = request
        self._address = address
        self.sent = []

    def recvfrom(self, size):
        return self._request, self._address

    def sendto(self, response, address):
        self.sent.append((response, address))

    def bind(self, addr):
        pass

    def setblocking(self, value):
        pass

    def close(self):
        pass


class DumpDnsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dns_record = DummyDnsRecord("example.com", "127.0.0.1")
        cls.server = DumpDns(cls.dns_record)
        cls.server.qNameMapper = DummyQNameMapper("example.com")  # type: ignore
        cls.server.bytesMapper = DummyBytesMapper()  # type: ignore

    def test_create_error_response_length_and_flags(self):
        request = bytearray(12)
        response = self.server._createErrorResponseByRequest(request)

        self.assertEqual(len(response), len(request))
        self.assertEqual(response[2:4], b"\x81\x83")

    def test_create_success_response_length_and_answer(self):
        request = bytearray(12)
        response = self.server._createResponseByRequest(request)

        self.assertGreater(len(response), len(request))
        self.assertEqual(response[2:4], b"\x85\x80")
        self.assertEqual(response[6:8], b"\x00\x01")

        ip_bytes = response[-4:]
        self.assertEqual(ip_bytes, b"\x7f\x00\x00\x01")

    def test_handle_request_matching_domain_sends_correct_response(self):
        request = bytearray(12)
        udp = DummyUDP(request, ("192.168.0.1", 12345))
        self.server.udp = udp  # type: ignore

        import uasyncio as asyncio
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.server._handleRequest())

        self.assertEqual(len(udp.sent), 1)
        sent_response, address = udp.sent[0]
        self.assertEqual(address, ("192.168.0.1", 12345))
        self.assertEqual(sent_response[2:4], b"\x85\x80")

    def test_handle_request_wrong_domain_sends_nxdomain(self):
        self.server.qNameMapper = DummyQNameMapper("wrong.com")  # type: ignore
        request = bytearray(12)
        udp = DummyUDP(request, ("10.0.0.1", 5353))
        self.server.udp = udp  # type: ignore

        import uasyncio as asyncio
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.server._handleRequest())

        self.assertEqual(len(udp.sent), 1)
        sent_response, _ = udp.sent[0]
        self.assertEqual(sent_response[2:4], b"\x81\x83")

class MdnsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dns_record = DummyDnsRecord("device.local", "192.168.1.123")
        cls.server = Mdns(cls.dns_record)
        cls.server.qNameMapper = DummyQNameMapper("device.local")  # type: ignore
        cls.server.bytesMapper = DummyBytesMapper()  # type: ignore

    def test_create_response_length_and_flags(self):
        request = bytearray(12)
        response = self.server._createResponseByRequest(request)

        self.assertGreater(len(response), len(request))
        self.assertEqual(response[2:4], b"\x84\x00")
        self.assertEqual(response[6:8], b"\x00\x01")

        ip_bytes = response[-4:]
        expected_ip = bytes(map(int, self.dns_record.ip.split('.')))
        self.assertEqual(ip_bytes, expected_ip)

    def test_handle_request_matching_domain_sends_response(self):
        request = bytearray(12)
        udp = DummyUDP(request, ("224.0.0.251", 5353))
        self.server.udp = udp  # type: ignore

        import uasyncio as asyncio
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.server._handleRequest())

        self.assertEqual(len(udp.sent), 1)
        sent_response, address = udp.sent[0]
        self.assertEqual(address, (self.server.ADDRESS, self.server.PORT))
        self.assertEqual(sent_response[2:4], b"\x84\x00")

    def test_handle_request_wrong_domain_no_response(self):
        self.server.qNameMapper = DummyQNameMapper("wrong.domain")  # type: ignore
        request = bytearray(12)
        udp = DummyUDP(request, ("224.0.0.251", 5353))
        self.server.udp = udp  # type: ignore

        import uasyncio as asyncio
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.server._handleRequest())

        self.assertEqual(len(udp.sent), 0)

class QNameMapperTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mapper = QNameMapper()

    def build_request_with_qname(self, qname: str) -> bytearray:
        parts = qname.split(".")
        qname_bytes = bytearray()
        for part in parts:
            qname_bytes.append(len(part))
            qname_bytes.extend(part.encode())
        qname_bytes.append(0)

        return bytearray(12) + qname_bytes

    def test_fromRequest_simple_domain(self):
        qname = "example.com"
        request = self.build_request_with_qname(qname)
        result = self.mapper.fromRequest(request)
        self.assertEqual(result, qname)

    def test_fromRequest_uppercase_domain(self):
        qname = "Example.COM"
        request = self.build_request_with_qname(qname)
        result = self.mapper.fromRequest(request)
        self.assertEqual(result, qname.lower())

    def test_fromRequest_single_label(self):
        qname = "localhost"
        request = self.build_request_with_qname(qname)
        result = self.mapper.fromRequest(request)
        self.assertEqual(result, qname)

    def test_fromRequest_empty_labels(self):
        qname = ""
        request = self.build_request_with_qname(qname)
        result = self.mapper.fromRequest(request)
        self.assertEqual(result, "")

    def test_fromRequest_multiple_labels(self):
        qname = "sub.domain.example.com"
        request = self.build_request_with_qname(qname)
        result = self.mapper.fromRequest(request)
        self.assertEqual(result, qname)

class BytesMapperTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mapper = BytesMapper()

    def test_from_ip_standard_ipv4(self):
        ip = "192.168.1.100"
        expected = bytes([192, 168, 1, 100])
        result = self.mapper.from_ip(ip)
        assert result == expected, f"Expected {expected}, got {result}"

    def test_from_ip_loopback(self):
        ip = "127.0.0.1"
        expected = bytes([127, 0, 0, 1])
        result = self.mapper.from_ip(ip)
        assert result == expected, f"Expected {expected}, got {result}"

    def test_from_ip_all_zeros(self):
        ip = "0.0.0.0"
        expected = bytes([0, 0, 0, 0])
        result = self.mapper.from_ip(ip)
        assert result == expected, f"Expected {expected}, got {result}"

    def test_from_ip_all_255(self):
        ip = "255.255.255.255"
        expected = bytes([255, 255, 255, 255])
        result = self.mapper.from_ip(ip)
        assert result == expected, f"Expected {expected}, got {result}"

    def test_from_ip_invalid_input(self):
        invalid_ips = [
            "256.100.50.25",
            "abc.def.ghi.jkl",
            "192.168.1",
            "",
            "192.168.1.1.1",
        ]
        for ip in invalid_ips:
            try:
                self.mapper.from_ip(ip)
            except Exception:
                pass  # erwartet
            else:
                assert False, f"Expected exception for invalid IP: {ip}"
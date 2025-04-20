from socket import socket, AF_INET, SOCK_DGRAM, SOL_SOCKET, SO_REUSEADDR, IPPROTO_UDP, IPPROTO_IP, IP_ADD_MEMBERSHIP
from dns.qname_mapper import QNameMapper
from dns.bytes_mapper import BytesMapper
from asyncio import sleep, create_task
from sys import print_exception

class Mdns:
    PORT = 5353
    ADDRESS = '224.0.0.251'

    BIND_ADDRESS = '0.0.0.0'
    BIND_PORT = 5353

    REQUEST_LENGHT = 512

    def __init__(self, dnsRecord):
        self.dnsRecord = dnsRecord
        self.isRunning = True
        self.udp = None
        self.qNameMapper = QNameMapper()
        self.bytesMapper = BytesMapper()
    
    def _createResponseByRequest(self, request):
        suffixParts = [
            b'\xc0\x0c', # Pointer to domain name (QNAME)
            b'\x00\x01', # TYPE A (IPv4)
            b'\x00\x01', # CLASS IN (Internet)
            b'\x00\x00\x00\x3c', # TTL = 60 seconds
            b'\x00\x04', # RDLENGTH = 4 bytes (IPv4)
            self.bytesMapper.fromIp(self.dnsRecord.ip)  # RDATA (IPv4 address)
        ]

        suffix = b''.join(suffixParts)

        response = bytearray(len(request) + len(suffix))

        response[:len(request)] = request
        response[2:4] = b'\x84\x00'  # Flags and codes
        response[6:8] = b'\x00\x01'  # Answer record count
        response[len(request):] = suffix

        return response

    async def _handleRequest(self):
        if self.udp is None:
            raise Exception('Member variable udp is None.')

        try:
            request = self.udp.recvfrom(self.REQUEST_LENGHT)
        except OSError:
            await sleep(1)
            return

        qname = self.qNameMapper.fromRequest(request)

        if qname != self.dnsRecord.domain:
            return

        response = self._createResponseByRequest(request)
        self.udp.sendto(response, (self.ADDRESS, self.PORT))

    async def _run(self):
        idAddMembershipValue = self.bytesMapper.fromIp(self.ADDRESS) + self.bytesMapper.fromIp(self.BIND_ADDRESS)

        self.udp = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)
        
        self.udp.setsockopt(SOL_SOCKET, SO_REUSEADDR, 1)
        self.udp.setsockopt(IPPROTO_IP, IP_ADD_MEMBERSHIP, idAddMembershipValue)
        self.udp.setblocking(False)
        self.udp.bind((self.BIND_ADDRESS, self.BIND_PORT))


        while self.isRunning:
            try:
                await self._handleRequest()
            except Exception as e:
                print_exception(e)
                await sleep(1)
            
            await sleep(0)
        
        self.udp.close()
        self.udp = None

    def start(self):
        create_task(self._run())
    
    def stop(self):
        self.isRunning = False

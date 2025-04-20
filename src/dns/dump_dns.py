from socket import socket, AF_INET, SOCK_DGRAM, IPPROTO_UDP
from sys import print_exception
from asyncio import sleep, create_task
from dns.qname_mapper import QNameMapper
from dns.bytes_mapper import BytesMapper

class DumpDns:
    def __init__(self, dnsRecord):
        self.dnsRecord = dnsRecord
        self.udp = None
        self.qNameMapper = QNameMapper()
        self.bytesMapper = BytesMapper()
        self.isRunning = True

    def _createErrorResponseByRequest(self, request):
        response = bytearray(request)

        response[2:4] = b'\x81\x83' # Flags: Response + NXDOMAIN (RCODE 3)

        return response
    
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
        response[2:4] = b'\x85\x80'  # Flags and codes
        response[6:8] = b'\x00\x01'  # Answer record count
        response[len(request):] = suffix

        return response
    
    async def _handleRequest(self):
        if self.udp is None:
            raise Exception('Member variable udp is None.')

        try:
            request, address = self.udp.recvfrom(512)
        except OSError:
            await sleep(1)
            return

        qname = self.qNameMapper.fromRequest(request)

        if qname != self.dnsRecord.domain:
            response = self._createErrorResponseByRequest(request)
            self.udp.sendto(response, address)
            return

        response = self._createResponseByRequest(request)
        self.udp.sendto(response, address)

    async def _run(self):
        print(f'Starting async server on 0.0.0.0:53...')
        self.udp = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)
        self.udp.bind(('0.0.0.0', 53))
        self.udp.setblocking(False)

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

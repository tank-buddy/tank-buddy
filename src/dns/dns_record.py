class DnsRecord:
    def __init__(self, domain, ip):
        self.domain = domain.strip('.').lower()
        self.ip = ip

    def __repr__(self):
        return f"<DNSRecord domain='{self.domain}' ip='{self.ip}'>"
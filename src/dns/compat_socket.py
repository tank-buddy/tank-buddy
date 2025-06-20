import socket

# Fallback-Konstanten
IPPROTO_UDP = getattr(socket, 'IPPROTO_UDP', 3)
IP_ADD_MEMBERSHIP = getattr(socket, 'IP_ADD_MEMBERSHIP', 13)
IPPROTO_TCP = getattr(socket, 'IPPROTO_TCP', 6)
IPPROTO_IP = getattr(socket, 'IPPROTO_IP', 0)
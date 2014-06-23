#!/usr/bin/python
# Copyright 2014 Nicholas Bray

import os.path
import SimpleHTTPServer
import SocketServer
import socket

def Run():
    # Serve out of the source directory.
    root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")
    os.chdir(root)
    # The externally visible IP.
    addr = socket.gethostbyname(socket.gethostname())
    port = 8765
    Handler = SimpleHTTPServer.SimpleHTTPRequestHandler
    httpd = SocketServer.TCPServer((addr, port), Handler)
    print "serving from %s" % root
    print "serving at http://%s:%d" % httpd.server_address
    httpd.serve_forever()
    
if __name__ == "__main__":
    Run()

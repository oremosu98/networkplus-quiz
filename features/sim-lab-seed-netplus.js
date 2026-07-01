/* Hand-reviewed Net+ PBQ seed scenarios. Answers verified correct. */
window.SIM_LAB_SEED_NETPLUS = [
  {
    id: 'np-seed-subnet-1', cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Size the branch subnet', estMinutes: 6,
    scenario: 'A branch office needs a subnet for up to 60 hosts on 192.168.10.0. Answer the two fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What CIDR prefix gives at least 60 usable hosts (smallest that fits)?',
        explanation: '/26 = 64 addresses, 62 usable — the smallest block that fits 60 hosts.',
        payload: { fields: [{ id: 'cidr', label: 'CIDR prefix', inputmode: 'text' }] },
        answer: { cidr: ['/26', '26'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'How many usable hosts does that subnet provide?',
        explanation: '2^6 - 2 = 62 usable (minus network and broadcast).',
        payload: { fields: [{ id: 'hosts', label: 'Usable hosts', inputmode: 'numeric' }] },
        answer: { hosts: ['62'] } }
    ]
  },

  {
    id: 'np-seed-trouble-order-1', cert: 'netplus', objective: '5.1', topic: 'Troubleshooting',
    title: 'Order the troubleshooting methodology', estMinutes: 4,
    scenario: 'A user reports they cannot reach a shared drive. Put the CompTIA network troubleshooting methodology in the correct order, first step at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Drag the seven steps into the order CompTIA defines.',
        explanation: 'CompTIA order: 1) Identify the problem, 2) Establish a theory of probable cause, 3) Test the theory, 4) Establish a plan of action and identify potential effects, 5) Implement the solution or escalate, 6) Verify full system functionality and implement preventive measures, 7) Document findings, actions, and outcomes.',
        payload: { items: [
          { id: 'i3', label: 'Test the theory to determine the cause' },
          { id: 'i1', label: 'Identify the problem' },
          { id: 'i5', label: 'Implement the solution or escalate' },
          { id: 'i7', label: 'Document findings, actions, and outcomes' },
          { id: 'i2', label: 'Establish a theory of probable cause' },
          { id: 'i6', label: 'Verify full system functionality and implement preventive measures' },
          { id: 'i4', label: 'Establish a plan of action and identify potential effects' }
        ] },
        answer: { correctOrder: ['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7'] } }
    ]
  },

  {
    id: 'np-seed-private-public-1', cert: 'netplus', objective: '1.4', topic: 'IPv4 addressing',
    title: 'Private or public address', estMinutes: 3,
    scenario: 'Sort each IPv4 address into private (RFC 1918) or public. Watch the 172 range carefully.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each address under Private or Public.',
        explanation: 'RFC 1918 private ranges: 10.0.0.0/8, 172.16.0.0–172.31.255.255 (172.16/12), and 192.168.0.0/16. 172.32.5.5 is outside the 172.16–172.31 block, so it is public. 8.8.8.8 and 1.1.1.1 are public DNS resolvers.',
        payload: {
          items: [
            { id: 'a1', label: '10.55.4.9' },
            { id: 'a2', label: '172.16.200.1' },
            { id: 'a3', label: '192.168.50.20' },
            { id: 'a4', label: '172.32.5.5' },
            { id: 'a5', label: '8.8.8.8' },
            { id: 'a6', label: '1.1.1.1' }
          ],
          buckets: [
            { id: 'priv', label: 'Private (RFC 1918)' },
            { id: 'pub', label: 'Public' }
          ]
        },
        answer: { map: { a1: 'priv', a2: 'priv', a3: 'priv', a4: 'pub', a5: 'pub', a6: 'pub' } } }
    ]
  },

  {
    id: 'np-seed-ports-match-1', cert: 'netplus', objective: '1.5', topic: 'Ports and protocols',
    title: 'Match the well-known ports', estMinutes: 3,
    scenario: 'Match each port number to the service that uses it by default.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each port with its default service.',
        explanation: '22 = SSH, 53 = DNS, 80 = HTTP, 443 = HTTPS, 3389 = RDP. These are the default well-known ports CompTIA expects you to recall.',
        payload: {
          left: [
            { id: 'p22', label: '22' },
            { id: 'p53', label: '53' },
            { id: 'p80', label: '80' },
            { id: 'p443', label: '443' },
            { id: 'p3389', label: '3389' }
          ],
          right: [
            { id: 'sssh', label: 'SSH' },
            { id: 'sdns', label: 'DNS' },
            { id: 'shttp', label: 'HTTP' },
            { id: 'shttps', label: 'HTTPS' },
            { id: 'srdp', label: 'RDP' }
          ]
        },
        answer: { pairs: { p22: 'sssh', p53: 'sdns', p80: 'shttp', p443: 'shttps', p3389: 'srdp' } } }
    ]
  },

  {
    id: 'np-seed-dns-records-1', cert: 'netplus', objective: '1.6', topic: 'DNS records',
    title: 'Match the DNS record types', estMinutes: 3,
    scenario: 'Match each DNS record type to what it does.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each record type with its purpose.',
        explanation: 'A maps a hostname to an IPv4 address, AAAA to an IPv6 address, MX names the mail server for a domain, CNAME is an alias to another hostname, and PTR maps an IP back to a hostname (reverse lookup).',
        payload: {
          left: [
            { id: 'ra', label: 'A' },
            { id: 'raaaa', label: 'AAAA' },
            { id: 'rmx', label: 'MX' },
            { id: 'rcname', label: 'CNAME' },
            { id: 'rptr', label: 'PTR' }
          ],
          right: [
            { id: 'p4', label: 'Maps a hostname to an IPv4 address' },
            { id: 'p6', label: 'Maps a hostname to an IPv6 address' },
            { id: 'pmx', label: 'Specifies the mail server for a domain' },
            { id: 'palias', label: 'Creates an alias to another hostname' },
            { id: 'prev', label: 'Maps an IP address back to a hostname' }
          ]
        },
        answer: { pairs: { ra: 'p4', raaaa: 'p6', rmx: 'pmx', rcname: 'palias', rptr: 'prev' } } }
    ]
  },

  {
    id: 'np-seed-apipa-analyze-1', cert: 'netplus', objective: '5.5', topic: 'DHCP / APIPA',
    title: 'Spot the DHCP failure', estMinutes: 2,
    scenario: 'A Windows host has no network access. Its ipconfig output is below. Click the single line that shows it failed to lease an address from DHCP.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the line that proves DHCP did not assign an address.',
        explanation: 'A 169.254.x.x address is APIPA (link-local, 169.254.0.0/16). Windows self-assigns it only when no DHCP server answers. The blank default gateway is a consequence, but the 169.254 address is the direct evidence of DHCP failure.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'IPv4 Address . . . . . . . . . . : 169.254.18.44' },
            { id: 'l2', text: 'Subnet Mask . . . . . . . . . . . : 255.255.0.0' },
            { id: 'l3', text: 'Default Gateway . . . . . . . . . :' },
            { id: 'l4', text: 'DHCP Enabled. . . . . . . . . . . : Yes' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'np-seed-net-bcast-1', cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Find the network and broadcast', estMinutes: 3,
    scenario: 'A host is configured as 192.168.20.130 with a /26 mask (255.255.255.192). Give the network address and the broadcast address of its subnet.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'Network (subnet) address?',
        explanation: '/26 makes blocks of 64: .0, .64, .128, .192. The host .130 falls in the .128 block, so the network address is 192.168.20.128.',
        payload: { fields: [{ id: 'net', label: 'Network address', inputmode: 'text' }] },
        answer: { net: ['192.168.20.128'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'Broadcast address of that subnet?',
        explanation: 'The .128 block spans .128 to .191, so the broadcast address is 192.168.20.191.',
        payload: { fields: [{ id: 'bcast', label: 'Broadcast address', inputmode: 'text' }] },
        answer: { bcast: ['192.168.20.191'] } }
    ]
  },

  {
    id: 'np-seed-osi-order-1', cert: 'netplus', objective: '1.1', topic: 'OSI model',
    title: 'Order the OSI layers', estMinutes: 3,
    scenario: 'Put the seven OSI layers in order from Layer 7 at the top down to Layer 1 at the bottom.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the layers from Layer 7 (top) to Layer 1 (bottom).',
        explanation: 'Top to bottom: 7 Application, 6 Presentation, 5 Session, 4 Transport, 3 Network, 2 Data Link, 1 Physical. ("All People Seem To Need Data Processing" reads 7 down to 1.)',
        payload: { items: [
          { id: 'l3', label: 'Network' },
          { id: 'l7', label: 'Application' },
          { id: 'l1', label: 'Physical' },
          { id: 'l5', label: 'Session' },
          { id: 'l2', label: 'Data Link' },
          { id: 'l6', label: 'Presentation' },
          { id: 'l4', label: 'Transport' }
        ] },
        answer: { correctOrder: ['l7', 'l6', 'l5', 'l4', 'l3', 'l2', 'l1'] } }
    ]
  },

  {
    id: 'np-seed-osi-devices-1', cert: 'netplus', objective: '1.1', topic: 'OSI model',
    title: 'Devices by OSI layer', estMinutes: 3,
    scenario: 'Sort each device into the OSI layer it primarily operates at.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each device under its primary OSI layer.',
        explanation: 'Hubs and repeaters just regenerate signal at Layer 1 (Physical). Switches and bridges forward by MAC address at Layer 2 (Data Link). Routers forward by IP address at Layer 3 (Network).',
        payload: {
          items: [
            { id: 'd1', label: 'Hub' },
            { id: 'd2', label: 'Repeater' },
            { id: 'd3', label: 'Switch' },
            { id: 'd4', label: 'Bridge' },
            { id: 'd5', label: 'Router' }
          ],
          buckets: [
            { id: 'l1', label: 'Layer 1 (Physical)' },
            { id: 'l2', label: 'Layer 2 (Data Link)' },
            { id: 'l3', label: 'Layer 3 (Network)' }
          ]
        },
        answer: { map: { d1: 'l1', d2: 'l1', d3: 'l2', d4: 'l2', d5: 'l3' } } }
    ]
  },

  {
    id: 'np-seed-ethernet-speed-1', cert: 'netplus', objective: '1.5', topic: 'Ethernet standards',
    title: 'Match Ethernet standards to speed', estMinutes: 3,
    scenario: 'Match each copper Ethernet standard to its maximum speed.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each standard with its top speed.',
        explanation: '10BASE-T = 10 Mbps, 100BASE-TX = 100 Mbps, 1000BASE-T = 1 Gbps, 10GBASE-T = 10 Gbps. The number in the name is the speed.',
        payload: {
          left: [
            { id: 'e10', label: '10BASE-T' },
            { id: 'e100', label: '100BASE-TX' },
            { id: 'e1000', label: '1000BASE-T' },
            { id: 'e10g', label: '10GBASE-T' }
          ],
          right: [
            { id: 's10m', label: '10 Mbps' },
            { id: 's100m', label: '100 Mbps' },
            { id: 's1g', label: '1 Gbps' },
            { id: 's10g', label: '10 Gbps' }
          ]
        },
        answer: { pairs: { e10: 's10m', e100: 's100m', e1000: 's1g', e10g: 's10g' } } }
    ]
  },

  {
    id: 'np-seed-ipv6-fillin-1', cert: 'netplus', objective: '1.8', topic: 'IPv6 addressing',
    title: 'IPv6 special addresses', estMinutes: 3,
    scenario: 'Answer two IPv6 fundamentals in their standard shorthand.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What is the IPv6 loopback address (compressed form)?',
        explanation: 'The IPv6 loopback is ::1, the equivalent of 127.0.0.1 in IPv4.',
        payload: { fields: [{ id: 'loop', label: 'IPv6 loopback', inputmode: 'text' }] },
        answer: { loop: ['::1'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'What prefix identifies an IPv6 link-local address?',
        explanation: 'Link-local addresses come from fe80::/10. Every IPv6 interface auto-configures one.',
        payload: { fields: [{ id: 'll', label: 'Link-local prefix', inputmode: 'text' }] },
        answer: { ll: ['fe80::/10'] } }
    ]
  },

  {
    id: 'np-seed-ping-unreachable-1', cert: 'netplus', objective: '5.3', topic: 'Connectivity tools',
    title: 'Read the ping result', estMinutes: 2,
    scenario: 'A host pings a remote server at 172.20.5.10. The output is below. Click the single line that shows the gateway has no route to the destination.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the line that identifies a routing problem at the gateway.',
        explanation: '"Reply from 10.0.0.1: Destination host unreachable" means your default gateway got the packet but has no route to 172.20.5.10. That is a routing problem, not a plain timeout (which only tells you no reply came back).',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Pinging 172.20.5.10 with 32 bytes of data:' },
            { id: 'l2', text: 'Reply from 10.0.0.1: Destination host unreachable.' },
            { id: 'l3', text: 'Request timed out.' },
            { id: 'l4', text: 'Ping statistics for 172.20.5.10: Sent = 4, Received = 1, Lost = 3 (75% loss)' }
          ]
        },
        answer: { selected: ['l2'] } }
    ]
  },

  {
    id: 'np-seed-dora-order-1', cert: 'netplus', objective: '1.6', topic: 'DHCP',
    title: 'Order the DHCP lease (DORA)', estMinutes: 3,
    scenario: 'A client boots and requests an address. Put the four DHCP lease messages in order, first message at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the DHCP DORA exchange in order.',
        explanation: 'DORA: Discover (client broadcasts to find a server), Offer (server offers an address), Request (client requests that offer), Acknowledge (server confirms the lease).',
        payload: { items: [
          { id: 'r', label: 'Request — client requests the offered address' },
          { id: 'd', label: 'Discover — client broadcasts to find a DHCP server' },
          { id: 'a', label: 'Acknowledge — server confirms the lease' },
          { id: 'o', label: 'Offer — server offers an address' }
        ] },
        answer: { correctOrder: ['d', 'o', 'r', 'a'] } }
    ]
  },

  {
    id: 'np-seed-tools-match-1', cert: 'netplus', objective: '5.2', topic: 'Troubleshooting tools',
    title: 'Match the tool to its job', estMinutes: 3,
    scenario: 'Match each command-line tool to what it is used for.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each tool with its primary purpose.',
        explanation: 'ping tests reachability and round-trip time. tracert shows the hops along the path. nslookup queries DNS. ipconfig shows the local interface configuration. netstat lists active connections and listening ports.',
        payload: {
          left: [
            { id: 'tping', label: 'ping' },
            { id: 'ttracert', label: 'tracert' },
            { id: 'tnslookup', label: 'nslookup' },
            { id: 'tipconfig', label: 'ipconfig' },
            { id: 'tnetstat', label: 'netstat' }
          ],
          right: [
            { id: 'ureach', label: 'Test reachability and round-trip time to a host' },
            { id: 'uhops', label: 'Show the hops along the path to a destination' },
            { id: 'udns', label: 'Query DNS to resolve a name to an IP' },
            { id: 'uifcfg', label: 'Display the local interface IP configuration' },
            { id: 'uconns', label: 'List active connections and listening ports' }
          ]
        },
        answer: { pairs: { tping: 'ureach', ttracert: 'uhops', tnslookup: 'udns', tipconfig: 'uifcfg', tnetstat: 'uconns' } } }
    ]
  },

  {
    id: 'np-seed-tcp-handshake-1', cert: 'netplus', objective: '1.5', topic: 'TCP',
    title: 'Order the TCP handshake', estMinutes: 2,
    scenario: 'Two hosts open a TCP connection. Put the three-way handshake in order, first message at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the TCP three-way handshake.',
        explanation: 'TCP opens with SYN (client requests), SYN-ACK (server acknowledges and requests back), then ACK (client acknowledges). The connection is established after the ACK.',
        payload: { items: [
          { id: 'ack', label: 'ACK — client acknowledges' },
          { id: 'syn', label: 'SYN — client requests a connection' },
          { id: 'synack', label: 'SYN-ACK — server acknowledges and responds' }
        ] },
        answer: { correctOrder: ['syn', 'synack', 'ack'] } }
    ]
  },

  {
    id: 'np-seed-tcp-udp-cat-1', cert: 'netplus', objective: '1.5', topic: 'TCP vs UDP',
    title: 'TCP or UDP', estMinutes: 3,
    scenario: 'Sort each service by the transport protocol it uses by default.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each service under TCP or UDP.',
        explanation: 'HTTP, SSH, and FTP are connection-oriented and use TCP. DHCP, TFTP, and SNMP are connectionless and use UDP.',
        payload: {
          items: [
            { id: 'http', label: 'HTTP' },
            { id: 'ssh', label: 'SSH' },
            { id: 'ftp', label: 'FTP' },
            { id: 'dhcp', label: 'DHCP' },
            { id: 'tftp', label: 'TFTP' },
            { id: 'snmp', label: 'SNMP' }
          ],
          buckets: [
            { id: 'tcp', label: 'TCP' },
            { id: 'udp', label: 'UDP' }
          ]
        },
        answer: { map: { http: 'tcp', ssh: 'tcp', ftp: 'tcp', dhcp: 'udp', tftp: 'udp', snmp: 'udp' } } }
    ]
  },

  {
    id: 'np-seed-ports-match-2', cert: 'netplus', objective: '1.5', topic: 'Ports and protocols',
    title: 'Match more well-known ports', estMinutes: 3,
    scenario: 'Match each port number to its default service.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each port with its default service.',
        explanation: '23 = Telnet, 25 = SMTP, 110 = POP3, 143 = IMAP, 161 = SNMP.',
        payload: {
          left: [
            { id: 'p23', label: '23' },
            { id: 'p25', label: '25' },
            { id: 'p110', label: '110' },
            { id: 'p143', label: '143' },
            { id: 'p161', label: '161' }
          ],
          right: [
            { id: 'stelnet', label: 'Telnet' },
            { id: 'ssmtp', label: 'SMTP' },
            { id: 'spop3', label: 'POP3' },
            { id: 'simap', label: 'IMAP' },
            { id: 'ssnmp', label: 'SNMP' }
          ]
        },
        answer: { pairs: { p23: 'stelnet', p25: 'ssmtp', p110: 'spop3', p143: 'simap', p161: 'ssnmp' } } }
    ]
  },

  {
    id: 'np-seed-p2p-mask-1', cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Size a point-to-point link', estMinutes: 3,
    scenario: 'Two routers connect over a point-to-point link. You want the smallest subnet that wastes no addresses. Answer both fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'How many usable host addresses does a /30 provide?',
        explanation: 'A /30 has 4 addresses, 2 usable — exactly enough for the two router interfaces on a point-to-point link.',
        payload: { fields: [{ id: 'hosts', label: 'Usable hosts', inputmode: 'numeric' }] },
        answer: { hosts: ['2'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'What is a /30 mask in dotted-decimal?',
        explanation: '/30 = 255.255.255.252 (the last octet 11111100).',
        payload: { fields: [{ id: 'mask', label: 'Subnet mask', inputmode: 'text' }] },
        answer: { mask: ['255.255.255.252'] } }
    ]
  },

  {
    id: 'np-seed-cable-length-1', cert: 'netplus', objective: '1.5', topic: 'Cabling',
    title: 'Spot the over-length run', estMinutes: 2,
    scenario: 'Three Cat6 copper runs are planned. Click the single run that exceeds the maximum length for copper Ethernet.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the run that breaks the copper distance limit.',
        explanation: 'Copper twisted-pair Ethernet is limited to 100 metres (channel). Run B at 120 m exceeds it and will drop or fail; the others are within spec.',
        payload: {
          multi: false,
          lines: [
            { id: 'rA', text: 'Run A: 80 m, Cat6' },
            { id: 'rB', text: 'Run B: 120 m, Cat6' },
            { id: 'rC', text: 'Run C: 55 m, Cat6' }
          ]
        },
        answer: { selected: ['rB'] } }
    ]
  },

  {
    id: 'np-seed-connectors-match-1', cert: 'netplus', objective: '1.5', topic: 'Connectors and media',
    title: 'Match connector to media', estMinutes: 3,
    scenario: 'Match each connector to the cable or media it terminates.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each connector with its media.',
        explanation: 'RJ45 terminates twisted-pair Ethernet, LC terminates fiber, BNC terminates coax, and RJ11 terminates telephone wiring.',
        payload: {
          left: [
            { id: 'rj45', label: 'RJ45' },
            { id: 'lc', label: 'LC' },
            { id: 'bnc', label: 'BNC' },
            { id: 'rj11', label: 'RJ11' }
          ],
          right: [
            { id: 'mtp', label: 'Twisted-pair Ethernet' },
            { id: 'mfiber', label: 'Fiber-optic' },
            { id: 'mcoax', label: 'Coaxial' },
            { id: 'mphone', label: 'Telephone' }
          ]
        },
        answer: { pairs: { rj45: 'mtp', lc: 'mfiber', bnc: 'mcoax', rj11: 'mphone' } } }
    ]
  },

  {
    id: 'np-seed-dns-resolution-order-1', cert: 'netplus', objective: '1.6', topic: 'DNS resolution',
    title: 'Order DNS resolution', estMinutes: 3,
    scenario: 'A client looks up a name that is not cached anywhere. Put the recursive DNS resolution steps in order, first step at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the recursive DNS resolution sequence.',
        explanation: 'The client checks its local cache, then queries its recursive resolver, which walks the hierarchy: root server, then the TLD server, then the authoritative server that holds the record.',
        payload: { items: [
          { id: 'tld', label: 'TLD name server is queried' },
          { id: 'cache', label: 'Client checks its local cache' },
          { id: 'auth', label: 'Authoritative name server returns the record' },
          { id: 'resolver', label: 'Recursive resolver is queried' },
          { id: 'root', label: 'Root name server is queried' }
        ] },
        answer: { correctOrder: ['cache', 'resolver', 'root', 'tld', 'auth'] } }
    ]
  },

  {
    id: 'np-seed-cast-cat-1', cert: 'netplus', objective: '1.4', topic: 'IPv4 addressing',
    title: 'Unicast, multicast, or broadcast', estMinutes: 3,
    scenario: 'Sort each IPv4 destination by its cast type.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each address under its cast type.',
        explanation: 'Multicast uses 224.0.0.0/4 (224–239), so 224.0.0.5 and 239.1.1.1 are multicast. 255.255.255.255 is the limited broadcast. Ordinary host addresses like 192.168.1.5 and 10.0.0.1 are unicast.',
        payload: {
          items: [
            { id: 'c1', label: '192.168.1.5' },
            { id: 'c2', label: '224.0.0.5' },
            { id: 'c3', label: '255.255.255.255' },
            { id: 'c4', label: '10.0.0.1' },
            { id: 'c5', label: '239.1.1.1' }
          ],
          buckets: [
            { id: 'uni', label: 'Unicast' },
            { id: 'multi', label: 'Multicast' },
            { id: 'broad', label: 'Broadcast' }
          ]
        },
        answer: { map: { c1: 'uni', c2: 'multi', c3: 'broad', c4: 'uni', c5: 'multi' } } }
    ]
  },

  {
    id: 'np-seed-wifi-gen-match-1', cert: 'netplus', objective: '2.4', topic: 'Wireless standards',
    title: 'Match Wi-Fi generation names', estMinutes: 2,
    scenario: 'Match each 802.11 standard to its Wi-Fi Alliance generation name.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each standard with its marketing name.',
        explanation: '802.11n is Wi-Fi 4, 802.11ac is Wi-Fi 5, and 802.11ax is Wi-Fi 6.',
        payload: {
          left: [
            { id: 'n', label: '802.11n' },
            { id: 'ac', label: '802.11ac' },
            { id: 'ax', label: '802.11ax' }
          ],
          right: [
            { id: 'w4', label: 'Wi-Fi 4' },
            { id: 'w5', label: 'Wi-Fi 5' },
            { id: 'w6', label: 'Wi-Fi 6' }
          ]
        },
        answer: { pairs: { n: 'w4', ac: 'w5', ax: 'w6' } } }
    ]
  },

  {
    id: 'np-seed-vlsm-fillin-1', cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Borrow bits for subnets', estMinutes: 3,
    scenario: 'You borrow bits to split a /24 into /27 subnets. Answer both fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'How many /27 subnets does a single /24 yield?',
        explanation: 'Going from /24 to /27 borrows 3 host bits: 2^3 = 8 subnets.',
        payload: { fields: [{ id: 'subnets', label: 'Number of subnets', inputmode: 'numeric' }] },
        answer: { subnets: ['8'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'How many usable hosts does each /27 provide?',
        explanation: 'A /27 has 32 addresses, 30 usable (2^5 - 2).',
        payload: { fields: [{ id: 'hosts', label: 'Usable hosts per subnet', inputmode: 'numeric' }] },
        answer: { hosts: ['30'] } }
    ]
  },

  {
    id: 'np-seed-protocols-match-1', cert: 'netplus', objective: '1.4', topic: 'Core services',
    title: 'Match the service to its job', estMinutes: 3,
    scenario: 'Match each network service to what it does.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each service with its purpose.',
        explanation: 'DHCP assigns IP addresses, DNS resolves names to IPs, NTP synchronizes clocks, SNMP monitors network devices, and SMTP sends email.',
        payload: {
          left: [
            { id: 'sdhcp', label: 'DHCP' },
            { id: 'sdns', label: 'DNS' },
            { id: 'sntp', label: 'NTP' },
            { id: 'ssnmp', label: 'SNMP' },
            { id: 'ssmtp', label: 'SMTP' }
          ],
          right: [
            { id: 'uassign', label: 'Assigns IP addresses to hosts' },
            { id: 'uresolve', label: 'Resolves names to IP addresses' },
            { id: 'utime', label: 'Synchronizes device clocks' },
            { id: 'umonitor', label: 'Monitors network devices' },
            { id: 'umail', label: 'Sends email between servers' }
          ]
        },
        answer: { pairs: { sdhcp: 'uassign', sdns: 'uresolve', sntp: 'utime', ssnmp: 'umonitor', ssmtp: 'umail' } } }
    ]
  },

  {
    id: 'np-seed-pdu-order-1', cert: 'netplus', objective: '1.1', topic: 'Encapsulation',
    title: 'Order the PDUs by layer', estMinutes: 3,
    scenario: 'Data is encapsulated as it moves down the stack. Put the protocol data units in order from the top of the stack down to the wire.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the PDUs from the upper layers down to the physical medium.',
        explanation: 'Encapsulation order down the stack: Data (upper layers) becomes a Segment at Transport, a Packet at Network, a Frame at Data Link, and Bits on the physical medium.',
        payload: { items: [
          { id: 'frame', label: 'Frame (Data Link)' },
          { id: 'data', label: 'Data (upper layers)' },
          { id: 'bits', label: 'Bits (Physical)' },
          { id: 'segment', label: 'Segment (Transport)' },
          { id: 'packet', label: 'Packet (Network)' }
        ] },
        answer: { correctOrder: ['data', 'segment', 'packet', 'frame', 'bits'] } }
    ]
  },

  {
    id: 'np-seed-cia-cat-1', cert: 'netplus', objective: '4.1', topic: 'CIA triad',
    title: 'Sort by the CIA triad', estMinutes: 3,
    scenario: 'Sort each control by which part of the CIA triad it primarily protects.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each control under Confidentiality, Integrity, or Availability.',
        explanation: 'Encryption and VPN tunnels keep data secret (Confidentiality). Hashes and checksums detect tampering (Integrity). RAID and redundant links keep services reachable (Availability).',
        payload: {
          items: [
            { id: 'enc', label: 'Encrypting a file at rest' },
            { id: 'vpn', label: 'VPN tunnel encryption' },
            { id: 'hash', label: 'Hashing a download to verify it' },
            { id: 'cksum', label: 'Checksum to detect file changes' },
            { id: 'raid', label: 'RAID array' },
            { id: 'redun', label: 'Redundant internet links' }
          ],
          buckets: [
            { id: 'conf', label: 'Confidentiality' },
            { id: 'integ', label: 'Integrity' },
            { id: 'avail', label: 'Availability' }
          ]
        },
        answer: { map: { enc: 'conf', vpn: 'conf', hash: 'integ', cksum: 'integ', raid: 'avail', redun: 'avail' } } }
    ]
  },

  {
    id: 'np-seed-attacks-match-1', cert: 'netplus', objective: '4.2', topic: 'Attacks',
    title: 'Match the attack', estMinutes: 3,
    scenario: 'Match each attack to what it does.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each attack with its description.',
        explanation: 'Phishing tricks users with fake messages. DDoS floods a service from many sources. On-path (MITM) intercepts traffic between two parties. ARP spoofing sends forged ARP replies to redirect LAN traffic. DNS poisoning corrupts DNS records to send users to the wrong host.',
        payload: {
          left: [
            { id: 'phish', label: 'Phishing' },
            { id: 'ddos', label: 'DDoS' },
            { id: 'mitm', label: 'On-path (MITM)' },
            { id: 'arp', label: 'ARP spoofing' },
            { id: 'dnsp', label: 'DNS poisoning' }
          ],
          right: [
            { id: 'dphish', label: 'Tricks users into revealing info via fake messages' },
            { id: 'dddos', label: 'Floods a service with traffic from many sources' },
            { id: 'dmitm', label: 'Intercepts traffic between two parties' },
            { id: 'darp', label: 'Sends forged ARP replies to redirect LAN traffic' },
            { id: 'ddnsp', label: 'Corrupts DNS records to redirect users' }
          ]
        },
        answer: { pairs: { phish: 'dphish', ddos: 'dddos', mitm: 'dmitm', arp: 'darp', dnsp: 'ddnsp' } } }
    ]
  },

  {
    id: 'np-seed-topology-match-1', cert: 'netplus', objective: '1.6', topic: 'Topologies',
    title: 'Match the topology', estMinutes: 3,
    scenario: 'Match each physical topology to its description.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each topology with its layout.',
        explanation: 'Star: all nodes connect to a central switch. Mesh: every node connects to every other. Bus: all nodes share one backbone cable. Ring: each node connects to two neighbors forming a loop.',
        payload: {
          left: [
            { id: 'star', label: 'Star' },
            { id: 'mesh', label: 'Mesh' },
            { id: 'bus', label: 'Bus' },
            { id: 'ring', label: 'Ring' }
          ],
          right: [
            { id: 'dstar', label: 'All nodes connect to a central switch' },
            { id: 'dmesh', label: 'Every node connects to every other node' },
            { id: 'dbus', label: 'All nodes share a single backbone cable' },
            { id: 'dring', label: 'Each node connects to two neighbors in a loop' }
          ]
        },
        answer: { pairs: { star: 'dstar', mesh: 'dmesh', bus: 'dbus', ring: 'dring' } } }
    ]
  },

  {
    id: 'np-seed-nat-fillin-1', cert: 'netplus', objective: '2.2', topic: 'NAT',
    title: 'Share one public IP', estMinutes: 3,
    scenario: 'A home router lets 20 internal devices reach the internet through a single public IP. Answer both fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What technology maps many internal hosts to one public IP using port numbers?',
        explanation: 'PAT (Port Address Translation), also called NAT overload, multiplexes many hosts onto one public IP by tracking source ports.',
        payload: { fields: [{ id: 'tech', label: 'Technology', inputmode: 'text' }] },
        answer: { tech: ['PAT', 'port address translation', 'NAT overload'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'What class of address do the 20 internal devices use?',
        explanation: 'Internal hosts use private (RFC 1918) addresses, which PAT translates to the public IP.',
        payload: { fields: [{ id: 'addr', label: 'Address class', inputmode: 'text' }] },
        answer: { addr: ['private', 'RFC 1918', 'rfc1918'] } }
    ]
  },

  {
    id: 'np-seed-duplex-analyze-1', cert: 'netplus', objective: '5.5', topic: 'Interface errors',
    title: 'Diagnose the interface', estMinutes: 2,
    scenario: 'A link is slow and dropping packets. The switchport counters are below. Click the single line that confirms a duplex mismatch.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the counter that points to a duplex mismatch.',
        explanation: 'Late collisions are the classic signature of a duplex mismatch: one side is half-duplex and detects collisions after the slot time. A high late-collision count is the giveaway.',
        payload: {
          multi: false,
          lines: [
            { id: 'sp', text: 'Speed: 100 Mbps' },
            { id: 'dx', text: 'Duplex: Half' },
            { id: 'lc', text: 'Late collisions: 1473' },
            { id: 'ie', text: 'Input errors: 0' }
          ]
        },
        answer: { selected: ['lc'] } }
    ]
  },

  {
    id: 'np-seed-cloud-match-1', cert: 'netplus', objective: '1.7', topic: 'Cloud models',
    title: 'Match the cloud service model', estMinutes: 3,
    scenario: 'Match each cloud service model to who manages what.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each model with its description.',
        explanation: 'IaaS: the provider runs the hardware, you manage the OS and apps. PaaS: the provider runs the OS and runtime, you manage your apps. SaaS: the provider runs everything and you just use the app.',
        payload: {
          left: [
            { id: 'iaas', label: 'IaaS' },
            { id: 'paas', label: 'PaaS' },
            { id: 'saas', label: 'SaaS' }
          ],
          right: [
            { id: 'diaas', label: 'You manage the OS and apps; provider runs the hardware' },
            { id: 'dpaas', label: 'You manage apps; provider runs the OS and runtime' },
            { id: 'dsaas', label: 'Provider manages everything; you just use the app' }
          ]
        },
        answer: { pairs: { iaas: 'diaas', paas: 'dpaas', saas: 'dsaas' } } }
    ]
  },

  {
    id: 'np-seed-media-cat-1', cert: 'netplus', objective: '1.5', topic: 'Cabling media',
    title: 'Copper or fiber', estMinutes: 2,
    scenario: 'Sort each cable type into copper or fiber.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each cable under Copper or Fiber.',
        explanation: 'Cat5e, Cat6, and coaxial are copper. Single-mode and multimode are fiber-optic.',
        payload: {
          items: [
            { id: 'cat6', label: 'Cat6' },
            { id: 'cat5e', label: 'Cat5e' },
            { id: 'coax', label: 'Coaxial' },
            { id: 'smf', label: 'Single-mode' },
            { id: 'mmf', label: 'Multimode' }
          ],
          buckets: [
            { id: 'copper', label: 'Copper' },
            { id: 'fiber', label: 'Fiber' }
          ]
        },
        answer: { map: { cat6: 'copper', cat5e: 'copper', coax: 'copper', smf: 'fiber', mmf: 'fiber' } } }
    ]
  },

  {
    id: 'np-seed-secproto-match-1', cert: 'netplus', objective: '4.3', topic: 'Security protocols',
    title: 'Match the security protocol', estMinutes: 3,
    scenario: 'Match each security technology to its role.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each technology with its purpose.',
        explanation: 'WPA2 encrypts wireless traffic. 802.1X provides port-based network access control. RADIUS is a centralized authentication server. TLS encrypts data in transit, as in HTTPS.',
        payload: {
          left: [
            { id: 'wpa2', label: 'WPA2' },
            { id: 'dot1x', label: '802.1X' },
            { id: 'radius', label: 'RADIUS' },
            { id: 'tls', label: 'TLS' }
          ],
          right: [
            { id: 'dwifi', label: 'Encrypts wireless traffic' },
            { id: 'dnac', label: 'Port-based network access control' },
            { id: 'dauth', label: 'Centralized authentication server' },
            { id: 'dtransit', label: 'Encrypts data in transit (HTTPS)' }
          ]
        },
        answer: { pairs: { wpa2: 'dwifi', dot1x: 'dnac', radius: 'dauth', tls: 'dtransit' } } }
    ]
  },

  {
    id: 'np-seed-vlan-fillin-1', cert: 'netplus', objective: '2.3', topic: 'VLANs',
    title: 'Tag the trunk', estMinutes: 3,
    scenario: 'A switch carries several VLANs to another switch and one VLAN to a PC. Answer both fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What standard tags frames so a trunk can carry multiple VLANs?',
        explanation: '802.1Q inserts a VLAN tag into the Ethernet frame so a single trunk link can carry many VLANs.',
        payload: { fields: [{ id: 'tag', label: 'Tagging standard', inputmode: 'text' }] },
        answer: { tag: ['802.1Q', 'dot1q', '802.1q'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'What is the port type that carries a single VLAN to an end device called?',
        explanation: 'An access port carries exactly one untagged VLAN to an end device such as a PC.',
        payload: { fields: [{ id: 'port', label: 'Port type', inputmode: 'text' }] },
        answer: { port: ['access', 'access port'] } }
    ]
  },

  {
    id: 'np-seed-nxdomain-analyze-1', cert: 'netplus', objective: '5.5', topic: 'DNS troubleshooting',
    title: 'Read the nslookup', estMinutes: 2,
    scenario: 'A user cannot reach a site by name. You run nslookup; the output is below. Click the single line that shows the name failed to resolve.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the line that shows DNS could not resolve the name.',
        explanation: 'NXDOMAIN means the name does not exist in DNS, so resolution failed. The server lines just show which resolver answered.',
        payload: {
          multi: false,
          lines: [
            { id: 'srv', text: 'Server:  8.8.8.8' },
            { id: 'adr', text: 'Address:  8.8.8.8#53' },
            { id: 'nx', text: "** server can't find www.example-corp.com: NXDOMAIN" }
          ]
        },
        answer: { selected: ['nx'] } }
    ]
  },

  {
    id: 'np-seed-stp-order-1', cert: 'netplus', objective: '2.3', topic: 'Spanning Tree',
    title: 'Order the STP port states', estMinutes: 3,
    scenario: 'A switch port comes up and runs Spanning Tree Protocol. Put the port states in the order STP moves through, first state at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the STP port states in transition order.',
        explanation: 'Classic STP moves a forwarding port through Blocking, then Listening, then Learning, then Forwarding.',
        payload: { items: [
          { id: 'learn', label: 'Learning' },
          { id: 'block', label: 'Blocking' },
          { id: 'fwd', label: 'Forwarding' },
          { id: 'listen', label: 'Listening' }
        ] },
        answer: { correctOrder: ['block', 'listen', 'learn', 'fwd'] } }
    ]
  },

  {
    id: 'np-seed-availability-match-1', cert: 'netplus', objective: '3.3', topic: 'Availability',
    title: 'Match the availability technology', estMinutes: 3,
    scenario: 'Match each technology to what it provides.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each technology with its purpose.',
        explanation: 'QoS prioritizes certain traffic. A load balancer spreads traffic across multiple servers. FHRP (VRRP/HSRP) provides a redundant default gateway. NIC teaming combines NICs for redundancy and throughput.',
        payload: {
          left: [
            { id: 'qos', label: 'QoS' },
            { id: 'lb', label: 'Load balancer' },
            { id: 'fhrp', label: 'VRRP / HSRP' },
            { id: 'team', label: 'NIC teaming' }
          ],
          right: [
            { id: 'dprio', label: 'Prioritizes certain traffic types' },
            { id: 'dspread', label: 'Distributes traffic across multiple servers' },
            { id: 'dgw', label: 'Provides a redundant default gateway' },
            { id: 'dnic', label: 'Combines NICs for redundancy and throughput' }
          ]
        },
        answer: { pairs: { qos: 'dprio', lb: 'dspread', fhrp: 'dgw', team: 'dnic' } } }
    ]
  },

  {
    id: 'np-seed-mask-order-1', cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Order masks by host count', estMinutes: 2,
    scenario: 'Put these subnet sizes in order from the most usable hosts at the top to the fewest at the bottom.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the prefixes from most usable hosts to fewest.',
        explanation: 'Each added prefix bit halves the hosts: /24 = 254 usable, /25 = 126, /26 = 62, /27 = 30. A smaller prefix number means more hosts.',
        payload: { items: [
          { id: 'm27', label: '/27' },
          { id: 'm24', label: '/24' },
          { id: 'm26', label: '/26' },
          { id: 'm25', label: '/25' }
        ] },
        answer: { correctOrder: ['m24', 'm25', 'm26', 'm27'] } }
    ]
  },

  {
    id: 'np-seed-ipv6-types-cat-1', cert: 'netplus', objective: '1.8', topic: 'IPv6 addressing',
    title: 'Classify the IPv6 address', estMinutes: 3,
    scenario: 'Sort each IPv6 address by its type.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each address under its type.',
        explanation: '2001:db8::1 is global unicast (2000::/3). fe80::1 is link-local (fe80::/10). ::1 is the loopback. ff02::1 is multicast (ff00::/8).',
        payload: {
          items: [
            { id: 'g', label: '2001:db8::1' },
            { id: 'll', label: 'fe80::1' },
            { id: 'lo', label: '::1' },
            { id: 'mc', label: 'ff02::1' }
          ],
          buckets: [
            { id: 'gu', label: 'Global unicast' },
            { id: 'link', label: 'Link-local' },
            { id: 'loop', label: 'Loopback' },
            { id: 'multi', label: 'Multicast' }
          ]
        },
        answer: { map: { g: 'gu', ll: 'link', lo: 'loop', mc: 'multi' } } }
    ]
  },

  {
    id: 'np-seed-wifi-signal-analyze-1', cert: 'netplus', objective: '5.4', topic: 'Wireless troubleshooting',
    title: 'Read the wireless survey', estMinutes: 2,
    scenario: 'A laptop keeps dropping Wi-Fi. The survey for its connection is below. Click the single line that explains the drops.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the line that shows the signal is too weak.',
        explanation: 'Wi-Fi RSSI around -30 to -67 dBm is strong; -82 dBm is very weak and causes drops and retries. Channel and security here are fine.',
        payload: {
          multi: false,
          lines: [
            { id: 'ssid', text: 'SSID: CorpWiFi' },
            { id: 'sig', text: 'Signal: -82 dBm' },
            { id: 'ch', text: 'Channel: 6' },
            { id: 'sec', text: 'Security: WPA2' }
          ]
        },
        answer: { selected: ['sig'] } }
    ]
  },

  {
    id: 'np-seed-ipv4-class-match-1', cert: 'netplus', objective: '1.4', topic: 'IPv4 classes',
    title: 'Match the IPv4 class', estMinutes: 2,
    scenario: 'Match each classful IPv4 class to its first-octet range.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each class with its first-octet range.',
        explanation: 'Class A = 1-126, Class B = 128-191, Class C = 192-223. (127 is reserved for loopback.)',
        payload: {
          left: [
            { id: 'ca', label: 'Class A' },
            { id: 'cb', label: 'Class B' },
            { id: 'cc', label: 'Class C' }
          ],
          right: [
            { id: 'ra', label: '1 - 126' },
            { id: 'rb', label: '128 - 191' },
            { id: 'rc', label: '192 - 223' }
          ]
        },
        answer: { pairs: { ca: 'ra', cb: 'rb', cc: 'rc' } } }
    ]
  },

  {
    id: 'np-seed-poe-fillin-1', cert: 'netplus', objective: '1.5', topic: 'Cabling and power',
    title: 'Power and distance', estMinutes: 3,
    scenario: 'You are running cable to a ceiling access point with no nearby outlet. Answer both fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What technology delivers power to the device over the data cable?',
        explanation: 'Power over Ethernet (PoE) sends DC power over the same twisted-pair cable that carries data, so the AP needs no separate outlet.',
        payload: { fields: [{ id: 'tech', label: 'Technology', inputmode: 'text' }] },
        answer: { tech: ['PoE', 'power over ethernet'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'What is the maximum copper Ethernet run, in meters?',
        explanation: 'Twisted-pair copper Ethernet is limited to 100 meters per channel.',
        payload: { fields: [{ id: 'len', label: 'Max length (m)', inputmode: 'numeric' }] },
        answer: { len: ['100'] } }
    ]
  },

  {
    id: 'np-seed-secure-cat-1', cert: 'netplus', objective: '4.3', topic: 'Secure protocols',
    title: 'Encrypted or cleartext', estMinutes: 3,
    scenario: 'Sort each protocol by whether it encrypts traffic or sends it in cleartext.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each protocol under Encrypted or Cleartext.',
        explanation: 'HTTPS, SSH, and SFTP encrypt their traffic. Telnet, FTP, and HTTP send data in cleartext, including credentials.',
        payload: {
          items: [
            { id: 'https', label: 'HTTPS' },
            { id: 'ssh', label: 'SSH' },
            { id: 'sftp', label: 'SFTP' },
            { id: 'telnet', label: 'Telnet' },
            { id: 'ftp', label: 'FTP' },
            { id: 'http', label: 'HTTP' }
          ],
          buckets: [
            { id: 'enc', label: 'Encrypted' },
            { id: 'clear', label: 'Cleartext' }
          ]
        },
        answer: { map: { https: 'enc', ssh: 'enc', sftp: 'enc', telnet: 'clear', ftp: 'clear', http: 'clear' } } }
    ]
  },

  {
    id: 'np-seed-routing-match-1', cert: 'netplus', objective: '2.2', topic: 'Routing protocols',
    title: 'Match the routing protocol', estMinutes: 3,
    scenario: 'Match each routing protocol to its category.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each protocol with its type.',
        explanation: 'OSPF is a link-state protocol, RIP is distance-vector, and BGP is a path-vector protocol used between autonomous systems.',
        payload: {
          left: [
            { id: 'ospf', label: 'OSPF' },
            { id: 'rip', label: 'RIP' },
            { id: 'bgp', label: 'BGP' }
          ],
          right: [
            { id: 'ls', label: 'Link-state' },
            { id: 'dv', label: 'Distance-vector' },
            { id: 'pv', label: 'Path-vector (between autonomous systems)' }
          ]
        },
        answer: { pairs: { ospf: 'ls', rip: 'dv', bgp: 'pv' } } }
    ]
  },

  {
    id: 'np-seed-traceroute-analyze-1', cert: 'netplus', objective: '5.3', topic: 'Connectivity tools',
    title: 'Read the traceroute', estMinutes: 2,
    scenario: 'A traceroute to a remote server stops partway. The output is below. Click the last hop that replied before the trace broke.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the last hop that responded.',
        explanation: 'The last hop that returned a time is where the path was still working. Hops after it time out, so the problem is at or beyond that last good hop (10.5.0.1).',
        payload: {
          multi: false,
          lines: [
            { id: 'h1', text: '1   1 ms   gateway [10.0.0.1]' },
            { id: 'h2', text: '2   8 ms   10.5.0.1' },
            { id: 'h3', text: '3   *   *   Request timed out' },
            { id: 'h4', text: '4   *   *   Request timed out' }
          ]
        },
        answer: { selected: ['h2'] } }
    ]
  },

  {
    id: 'np-seed-dhcp-terms-fillin-1', cert: 'netplus', objective: '1.6', topic: 'DHCP',
    title: 'DHCP vocabulary', estMinutes: 3,
    scenario: 'A server hands out addresses, and one printer must always get the same one. Answer both fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What is the range of addresses a DHCP server hands out called?',
        explanation: 'The scope is the pool of addresses a DHCP server is configured to lease on a subnet.',
        payload: { fields: [{ id: 'pool', label: 'Address range', inputmode: 'text' }] },
        answer: { pool: ['scope'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'What is a fixed lease tied to a device MAC address called?',
        explanation: 'A reservation binds a specific address to a MAC, so that device always gets the same IP from DHCP.',
        payload: { fields: [{ id: 'fixed', label: 'Fixed lease', inputmode: 'text' }] },
        answer: { fixed: ['reservation'] } }
    ]
  },

  {
    id: 'np-seed-mask-mismatch-analyze-1', cert: 'netplus', objective: '5.5', topic: 'IP misconfiguration',
    title: 'Find the wrong mask', estMinutes: 2,
    scenario: 'Two hosts on the same LAN cannot talk to each other. Their settings are below. Click the single line with the misconfigured subnet mask.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the line whose subnet mask does not match the others.',
        explanation: 'Host A and the gateway use /24 (255.255.255.0). Host B is set to 255.255.255.192 (/26), so it calculates a different network and cannot reach the others locally.',
        payload: {
          multi: false,
          lines: [
            { id: 'ha', text: 'Host A: 192.168.1.10   mask 255.255.255.0' },
            { id: 'hb', text: 'Host B: 192.168.1.20   mask 255.255.255.192' },
            { id: 'gw', text: 'Gateway: 192.168.1.1   mask 255.255.255.0' }
          ]
        },
        answer: { selected: ['hb'] } }
    ]
  },

  {
    id: 'np-seed-docs-match-1', cert: 'netplus', objective: '3.2', topic: 'Documentation',
    title: 'Match the documentation artifact', estMinutes: 3,
    scenario: 'Match each operations artifact to what it provides.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each artifact with its purpose.',
        explanation: 'A network diagram shows the layout of devices and links. A baseline records normal performance for later comparison. An asset inventory lists hardware and software. Syslog centralizes log collection.',
        payload: {
          left: [
            { id: 'diag', label: 'Network diagram' },
            { id: 'base', label: 'Baseline' },
            { id: 'inv', label: 'Asset inventory' },
            { id: 'sys', label: 'Syslog' }
          ],
          right: [
            { id: 'dlayout', label: 'Layout of devices and links' },
            { id: 'dnormal', label: 'Normal performance for comparison' },
            { id: 'dlist', label: 'List of hardware and software' },
            { id: 'dlogs', label: 'Centralized log collection' }
          ]
        },
        answer: { pairs: { diag: 'dlayout', base: 'dnormal', inv: 'dlist', sys: 'dlogs' } } }
    ]
  },

  {
    id: 'np-seed-subnet-capstone-1', cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Size for 500 hosts', estMinutes: 4,
    scenario: 'A flat subnet must hold up to 500 hosts. Answer both fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What is the smallest CIDR prefix that fits 500 hosts?',
        explanation: '/23 = 512 addresses, 510 usable, the smallest block that holds 500 hosts. A /24 (254 usable) is too small.',
        payload: { fields: [{ id: 'cidr', label: 'CIDR prefix', inputmode: 'text' }] },
        answer: { cidr: ['/23', '23'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'How many usable hosts does that prefix provide?',
        explanation: '2^9 - 2 = 510 usable host addresses.',
        payload: { fields: [{ id: 'hosts', label: 'Usable hosts', inputmode: 'numeric' }] },
        answer: { hosts: ['510'] } }
    ]
  },

  // 1 — wrong-subnet host IP, 192.168.x, VLAN framing
  {
    id: 'np-diag-branch-vlan10-hostip',
    cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Fix the stranded Staff PC',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'The Mercer & Hale branch office runs two VLANs: Staff (VLAN 10, 192.168.10.0/24) and Guest (VLAN 20, 192.168.20.0/24). A Staff user cannot reach the internal file server or the internet, while everyone else is fine. Inspect the diagram and fix the misconfigured host.',
    assets: { reference: { kind: 'network',
      given: { networkId: '192.168.10.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'core', ip: '192.168.10.1', mask: '255.255.255.0', x: 3, y: 0 },
        { id: 'swa', label: 'SW-A', type: 'switch', zone: 'staff', ip: '192.168.10.2', mask: '255.255.255.0', x: 1, y: 1 },
        { id: 'fs1', label: 'FS-1', type: 'server', zone: 'staff', ip: '192.168.10.20', mask: '255.255.255.0', gateway: '192.168.10.1', x: 0, y: 2 },
        { id: 'pc2', label: 'PC-2', type: 'pc', zone: 'staff', ip: '192.168.20.45', mask: '255.255.255.0', gateway: '192.168.20.1', x: 1, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'swa' }, { from: 'swa', to: 'fs1' }, { from: 'swa', to: 'pc2' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'pc2',
        prompt: 'Fix PC-2’s IP configuration so it can reach FS-1 and the internet.',
        explanation: 'PC-2 sits in VLAN 10 but was assigned a Guest-subnet address. It needs a 192.168.10.x address and the VLAN 10 gateway to rejoin its own subnet.',
        payload: { slots: [
          { id: 'ip', label: 'PC-2 IP address', options: [
            { id: 'a', text: '192.168.10.45' }, { id: 'b', text: '192.168.20.45' }, { id: 'c', text: '10.0.10.45' } ] },
          { id: 'gateway', label: 'PC-2 default gateway', options: [
            { id: 'a', text: '192.168.10.1' }, { id: 'b', text: '192.168.20.1' }, { id: 'c', text: '192.168.1.1' } ] }
        ] },
        answer: { slots: { ip: 'a', gateway: 'a' } } }
    ]
  },

  // 2 — wrong subnet mask, /25 vs /24 boundary
  {
    id: 'np-diag-mask-boundary-25',
    cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Correct the /25 mask mismatch',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'A small office subnet 192.168.30.0/24 hosts a router, a switch, and three PCs. One PC was imaged from a template used for a smaller /25 segment elsewhere and cannot see the rest of the LAN even though its IP looks fine at a glance.',
    assets: { reference: { kind: 'network',
      given: { networkId: '192.168.30.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'lan', ip: '192.168.30.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'lan', ip: '192.168.30.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'pc1', label: 'PC-1', type: 'pc', zone: 'lan', ip: '192.168.30.10', mask: '255.255.255.0', gateway: '192.168.30.1', x: 1, y: 2 },
        { id: 'pc3', label: 'PC-3', type: 'pc', zone: 'lan', ip: '192.168.30.140', mask: '255.255.255.128', gateway: '192.168.30.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'pc1' }, { from: 'sw1', to: 'pc3' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'pc3',
        prompt: 'PC-3’s IP is correct but it still can’t reach the rest of the LAN. Fix its subnet mask.',
        explanation: 'PC-3 holds a /25 mask (255.255.255.128) while the documented LAN is a /24 (255.255.255.0). With that /25 mask, PC-3’s address .140 falls in the upper half (.128–.255) while RTR-1, SW-1, and PC-1 sit in the lower half (.0–.127), so PC-3 sees them as a different network even though its IP itself is fine. Restoring the /24 mask puts PC-3 back in the single 192.168.30.0/24 block with everyone else.',
        payload: { slots: [
          { id: 'mask', label: 'PC-3 subnet mask', options: [
            { id: 'a', text: '255.255.255.0' }, { id: 'b', text: '255.255.255.128' }, { id: 'c', text: '255.255.255.192' } ] }
        ] },
        answer: { slots: { mask: 'a' } } }
    ]
  },

  // 3 — wrong default gateway, 10.x base
  {
    id: 'np-diag-datacenter-wrong-gw',
    cert: 'netplus', objective: '1.4', topic: 'Default gateways',
    title: 'Point the app server at the right gateway',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'A small data-center segment 10.20.30.0/24 hosts a router, a switch, a database server, and an application server. The app server can reach other hosts on the segment but cannot reach anything off-segment.',
    assets: { reference: { kind: 'network',
      given: { networkId: '10.20.30.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'dc', ip: '10.20.30.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'dc', ip: '10.20.30.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'db1', label: 'DB-1', type: 'server', zone: 'dc', ip: '10.20.30.10', mask: '255.255.255.0', gateway: '10.20.30.1', x: 1, y: 2 },
        { id: 'app1', label: 'APP-1', type: 'server', zone: 'dc', ip: '10.20.30.15', mask: '255.255.255.0', gateway: '10.20.31.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'db1' }, { from: 'sw1', to: 'app1' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'app1',
        prompt: 'APP-1 has a correct IP but no off-segment reachability. Fix its default gateway.',
        explanation: 'APP-1 was pointed at 10.20.31.1, an address on a different /24. The router’s actual interface on this segment is 10.20.30.1, so all off-segment traffic was silently dropped at the host.',
        payload: { slots: [
          { id: 'gateway', label: 'APP-1 default gateway', options: [
            { id: 'a', text: '10.20.30.1' }, { id: 'b', text: '10.20.31.1' }, { id: 'c', text: '10.30.30.1' } ] }
        ] },
        answer: { slots: { gateway: 'a' } } }
    ]
  },

  // 4 — off-by-one octet into wrong subnet, 172.16-31 range
  {
    id: 'np-diag-offbyone-172',
    cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Catch the off-by-one subnet',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'Warehouse network 172.20.5.0/24 connects a router, a switch, a scanner terminal, and a workstation. The workstation was recently swapped and now can’t print to the scanner terminal’s shared queue even though its address "looks close enough."',
    assets: { reference: { kind: 'network',
      given: { networkId: '172.20.5.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'wh', ip: '172.20.5.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'wh', ip: '172.20.5.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'scan1', label: 'SCAN-1', type: 'pc', zone: 'wh', ip: '172.20.5.30', mask: '255.255.255.0', gateway: '172.20.5.1', x: 1, y: 2 },
        { id: 'wks5', label: 'WKS-5', type: 'pc', zone: 'wh', ip: '172.20.6.31', mask: '255.255.255.0', gateway: '172.20.5.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'scan1' }, { from: 'sw1', to: 'wks5' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'wks5',
        prompt: 'WKS-5’s address is one octet off from the documented subnet. Fix its IP.',
        explanation: '172.20.6.31 falls in the 172.20.6.0/24 network, not 172.20.5.0/24 — a single-octet slip that fully isolates the host from the local segment despite an otherwise plausible-looking address.',
        payload: { slots: [
          { id: 'ip', label: 'WKS-5 IP address', options: [
            { id: 'a', text: '172.20.5.31' }, { id: 'b', text: '172.20.6.31' }, { id: 'c', text: '172.30.5.31' } ] }
        ] },
        answer: { slots: { ip: 'a' } } }
    ]
  },

  // 5 — wrong host IP, small office, 192.168.x
  {
    id: 'np-diag-printer-wrong-net',
    cert: 'netplus', objective: '1.4', topic: 'IPv4 addressing',
    title: 'Bring the network printer back on-subnet',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'A dentist office LAN 192.168.5.0/24 has a router, a switch, a front-desk PC, and a networked printer. Nobody in the office can print, though the printer powers on and shows a link light.',
    assets: { reference: { kind: 'network',
      given: { networkId: '192.168.5.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'office', ip: '192.168.5.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'office', ip: '192.168.5.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'pc1', label: 'FRONT-PC', type: 'pc', zone: 'office', ip: '192.168.5.10', mask: '255.255.255.0', gateway: '192.168.5.1', x: 1, y: 2 },
        { id: 'prn1', label: 'PRN-1', type: 'printer', zone: 'office', ip: '192.168.4.50', mask: '255.255.255.0', gateway: '192.168.5.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'pc1' }, { from: 'sw1', to: 'prn1' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'prn1',
        prompt: 'PRN-1 was configured on the wrong network. Fix its IP address.',
        explanation: 'PRN-1 holds 192.168.4.50, which belongs to a different /24 than the office LAN (192.168.5.0/24). Correcting the third octet returns it to the documented subnet.',
        payload: { slots: [
          { id: 'ip', label: 'PRN-1 IP address', options: [
            { id: 'a', text: '192.168.5.50' }, { id: 'b', text: '192.168.4.50' }, { id: 'c', text: '192.168.50.5' } ] }
        ] },
        answer: { slots: { ip: 'a' } } }
    ]
  },

  // 6 — wrong gateway, 172.16-31 range
  {
    id: 'np-diag-lab-wrong-gw-172',
    cert: 'netplus', objective: '1.4', topic: 'Default gateways',
    title: 'Repair the lab workstation gateway',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'A university lab segment 172.24.8.0/24 has a router, a switch, a lab server, and a student workstation. The workstation can reach the lab server but no internet resources.',
    assets: { reference: { kind: 'network',
      given: { networkId: '172.24.8.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'lab', ip: '172.24.8.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'lab', ip: '172.24.8.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'srv1', label: 'LAB-SRV', type: 'server', zone: 'lab', ip: '172.24.8.5', mask: '255.255.255.0', gateway: '172.24.8.1', x: 1, y: 2 },
        { id: 'wks9', label: 'WKS-9', type: 'pc', zone: 'lab', ip: '172.24.8.90', mask: '255.255.255.0', gateway: '172.24.9.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'srv1' }, { from: 'sw1', to: 'wks9' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'wks9',
        prompt: 'WKS-9 reaches local hosts but not the internet. Fix its default gateway.',
        explanation: 'WKS-9 points to 172.24.9.1, an address outside the 172.24.8.0/24 lab subnet, so off-subnet packets are never forwarded. The correct gateway is the router’s interface on this segment, 172.24.8.1.',
        payload: { slots: [
          { id: 'gateway', label: 'WKS-9 default gateway', options: [
            { id: 'a', text: '172.24.8.1' }, { id: 'b', text: '172.24.9.1' }, { id: 'c', text: '172.16.8.1' } ] }
        ] },
        answer: { slots: { gateway: 'a' } } }
    ]
  },

  // 7 — diagnose + reconfigure, 10.x, wrong host IP
  {
    id: 'np-diag-hq-diagnose-ip',
    cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Diagnose then fix the HQ finance PC',
    estMinutes: 5, archetype: 'diagram',
    scenario: 'HQ finance segment 10.10.40.0/24 has a router, a switch, a file server, and a finance PC. The finance user reports the shared drive times out and pings to the file server fail.',
    assets: { reference: { kind: 'network',
      given: { networkId: '10.10.40.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'finance', ip: '10.10.40.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'finance', ip: '10.10.40.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'fs2', label: 'FS-2', type: 'server', zone: 'finance', ip: '10.10.40.20', mask: '255.255.255.0', gateway: '10.10.40.1', x: 1, y: 2 },
        { id: 'pcf1', label: 'PC-F1', type: 'pc', zone: 'finance', ip: '10.10.41.77', mask: '255.255.255.0', gateway: '10.10.40.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'fs2' }, { from: 'sw1', to: 'pcf1' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1,
        prompt: 'Which device is misconfigured?',
        explanation: 'PC-F1 holds 10.10.41.77, a different /24 than the documented finance subnet 10.10.40.0/24, stranding it from FS-2.',
        payload: { slots: [
          { id: 'device', label: 'Misconfigured device', options: [
            { id: 'a', text: 'FS-2' }, { id: 'b', text: 'PC-F1' }, { id: 'c', text: 'RTR-1' } ] }
        ] },
        answer: { slots: { device: 'b' } } },
      { id: 's2', type: 'configure', points: 1, deviceId: 'pcf1',
        prompt: 'Fix PC-F1’s IP address so it can reach FS-2.',
        explanation: 'Changing the third octet from 41 to 40 places PC-F1 back inside the documented 10.10.40.0/24 subnet.',
        payload: { slots: [
          { id: 'ip', label: 'PC-F1 IP address', options: [
            { id: 'a', text: '10.10.40.77' }, { id: 'b', text: '10.10.41.77' }, { id: 'c', text: '10.40.10.77' } ] }
        ] },
        answer: { slots: { ip: 'a' } } }
    ]
  },

  // 8 — wrong mask, /26 vs /24, 192.168.x
  {
    id: 'np-diag-mask-26-retail',
    cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Widen the retail POS mask',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'A retail store LAN 192.168.60.0/24 hosts a router, a switch, a POS terminal, and a back-office PC. The POS terminal cannot process card transactions that route through the back-office PC’s validation service.',
    assets: { reference: { kind: 'network',
      given: { networkId: '192.168.60.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'store', ip: '192.168.60.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'store', ip: '192.168.60.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'office1', label: 'OFFICE-PC', type: 'pc', zone: 'store', ip: '192.168.60.15', mask: '255.255.255.0', gateway: '192.168.60.1', x: 1, y: 2 },
        { id: 'pos1', label: 'POS-1', type: 'pc', zone: 'store', ip: '192.168.60.80', mask: '255.255.255.192', gateway: '192.168.60.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'office1' }, { from: 'sw1', to: 'pos1' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'pos1',
        prompt: 'POS-1’s mask is too narrow for the LAN. Fix it.',
        explanation: 'POS-1 carries a /26 mask (255.255.255.192), which only spans 192.168.60.64–.127. OFFICE-PC at .15 falls outside that range from POS-1’s point of view, so POS-1 treats it as remote. The documented LAN mask is /24.',
        payload: { slots: [
          { id: 'mask', label: 'POS-1 subnet mask', options: [
            { id: 'a', text: '255.255.255.0' }, { id: 'b', text: '255.255.255.192' }, { id: 'c', text: '255.255.255.224' } ] }
        ] },
        answer: { slots: { mask: 'a' } } }
    ]
  },

  // 9 — wrong host IP, 10.x, server
  {
    id: 'np-diag-backup-server-wrongnet',
    cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Recover the backup server’s address',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'A backup segment 10.5.5.0/24 has a router, a switch, a primary server, and a backup server. Scheduled backups have been failing to connect all week.',
    assets: { reference: { kind: 'network',
      given: { networkId: '10.5.5.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'backup', ip: '10.5.5.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'backup', ip: '10.5.5.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'prim1', label: 'PRIMARY-1', type: 'server', zone: 'backup', ip: '10.5.5.10', mask: '255.255.255.0', gateway: '10.5.5.1', x: 1, y: 2 },
        { id: 'bkp1', label: 'BACKUP-1', type: 'server', zone: 'backup', ip: '10.6.5.10', mask: '255.255.255.0', gateway: '10.5.5.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'prim1' }, { from: 'sw1', to: 'bkp1' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'bkp1',
        prompt: 'BACKUP-1 sits on the wrong network. Fix its IP address.',
        explanation: 'BACKUP-1 was assigned 10.6.5.10 instead of an address in 10.5.5.0/24, isolating it from PRIMARY-1 despite both being cabled to the same switch.',
        payload: { slots: [
          { id: 'ip', label: 'BACKUP-1 IP address', options: [
            { id: 'a', text: '10.5.5.10' }, { id: 'b', text: '10.6.5.10' }, { id: 'c', text: '10.5.6.10' } ] }
        ] },
        answer: { slots: { ip: 'a' } },
      }
    ]
  },

  // 10 — wrong gateway, VLAN framing, 192.168.x
  {
    id: 'np-diag-vlan20-wrong-gw',
    cert: 'netplus', objective: '1.4', topic: 'VLANs',
    title: 'Fix the Guest VLAN gateway',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'Guest Wi-Fi VLAN 20 (192.168.20.0/24) serves visitor devices behind an access switch. A guest laptop connects and gets an in-range IP but reports "no internet" while other guests are fine.',
    assets: { reference: { kind: 'network',
      given: { networkId: '192.168.20.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'guest', ip: '192.168.20.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'swb', label: 'SW-B', type: 'switch', zone: 'guest', ip: '192.168.20.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'pc7', label: 'PC-7', type: 'pc', zone: 'guest', ip: '192.168.20.31', mask: '255.255.255.0', gateway: '192.168.20.1', x: 1, y: 2 },
        { id: 'lap3', label: 'LAP-3', type: 'pc', zone: 'guest', ip: '192.168.20.62', mask: '255.255.255.0', gateway: '192.168.10.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'swb' }, { from: 'swb', to: 'pc7' }, { from: 'swb', to: 'lap3' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'lap3',
        prompt: 'LAP-3 has a valid Guest VLAN address but no internet. Fix its default gateway.',
        explanation: 'LAP-3 was pointed at 192.168.10.1, the Staff VLAN’s gateway, which cannot route Guest-subnet traffic. The correct gateway for VLAN 20 hosts is 192.168.20.1.',
        payload: { slots: [
          { id: 'gateway', label: 'LAP-3 default gateway', options: [
            { id: 'a', text: '192.168.20.1' }, { id: 'b', text: '192.168.10.1' }, { id: 'c', text: '192.168.2.1' } ] }
        ] },
        answer: { slots: { gateway: 'a' } } }
    ]
  },

  // 11 — off-by-one, 10.x
  {
    id: 'np-diag-offbyone-10',
    cert: 'netplus', objective: '1.4', topic: 'IPv4 addressing',
    title: 'Spot the near-miss subnet',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'Engineering LAN 10.15.20.0/24 has a router, a switch, a build server, and an engineer’s workstation. The workstation can browse the internet fine but cannot reach the build server for code deploys.',
    assets: { reference: { kind: 'network',
      given: { networkId: '10.15.20.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'eng', ip: '10.15.20.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'eng', ip: '10.15.20.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'build1', label: 'BUILD-1', type: 'server', zone: 'eng', ip: '10.15.20.40', mask: '255.255.255.0', gateway: '10.15.20.1', x: 1, y: 2 },
        { id: 'eng1', label: 'ENG-1', type: 'pc', zone: 'eng', ip: '10.15.21.40', mask: '255.255.255.0', gateway: '10.15.20.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'build1' }, { from: 'sw1', to: 'eng1' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'eng1',
        prompt: 'ENG-1 can reach the internet through the gateway but not local hosts. Fix its IP address.',
        explanation: 'ENG-1 holds 10.15.21.40 — the third octet is off by one from the documented 10.15.20.0/24 segment, so its local subnet mask excludes BUILD-1 even though the gateway still routes its internet-bound traffic.',
        payload: { slots: [
          { id: 'ip', label: 'ENG-1 IP address', options: [
            { id: 'a', text: '10.15.20.40' }, { id: 'b', text: '10.15.21.40' }, { id: 'c', text: '10.16.20.40' } ] }
        ] },
        answer: { slots: { ip: 'a' } } }
    ]
  },

  // 12 — wrong gateway, small 172 office
  {
    id: 'np-diag-clinic-wrong-gw',
    cert: 'netplus', objective: '1.4', topic: 'Default gateways',
    title: 'Restore the clinic kiosk’s gateway',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'A clinic check-in network 172.18.2.0/24 has a router, a switch, a records server, and a check-in kiosk. The kiosk can reach the records server on the LAN but its cloud scheduling sync has been failing.',
    assets: { reference: { kind: 'network',
      given: { networkId: '172.18.2.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'clinic', ip: '172.18.2.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'clinic', ip: '172.18.2.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'rec1', label: 'RECORDS-1', type: 'server', zone: 'clinic', ip: '172.18.2.10', mask: '255.255.255.0', gateway: '172.18.2.1', x: 1, y: 2 },
        { id: 'kiosk1', label: 'KIOSK-1', type: 'pc', zone: 'clinic', ip: '172.18.2.50', mask: '255.255.255.0', gateway: '172.18.3.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'rec1' }, { from: 'sw1', to: 'kiosk1' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'kiosk1',
        prompt: 'KIOSK-1 syncs locally but not to the cloud. Fix its default gateway.',
        explanation: 'KIOSK-1 points to 172.18.3.1, which is outside the 172.18.2.0/24 clinic subnet, so cloud-bound traffic is never forwarded. The router’s interface on this segment is 172.18.2.1.',
        payload: { slots: [
          { id: 'gateway', label: 'KIOSK-1 default gateway', options: [
            { id: 'a', text: '172.18.2.1' }, { id: 'b', text: '172.18.3.1' }, { id: 'c', text: '172.28.2.1' } ] }
        ] },
        answer: { slots: { gateway: 'a' } } }
    ]
  },

  // 13 — wrong mask, /28 vs /24, 192.168.x with server + 2 PCs
  {
    id: 'np-diag-mask-28-conference',
    cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Correct the conference room mask',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'A conference room LAN 192.168.70.0/24 has a router, a switch, a media server, and a presenter’s laptop. The laptop can’t stream to the media server despite a healthy link light.',
    assets: { reference: { kind: 'network',
      given: { networkId: '192.168.70.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'conf', ip: '192.168.70.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'conf', ip: '192.168.70.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'media1', label: 'MEDIA-1', type: 'server', zone: 'conf', ip: '192.168.70.20', mask: '255.255.255.0', gateway: '192.168.70.1', x: 1, y: 2 },
        { id: 'lap9', label: 'LAP-9', type: 'pc', zone: 'conf', ip: '192.168.70.35', mask: '255.255.255.240', gateway: '192.168.70.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'media1' }, { from: 'sw1', to: 'lap9' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'lap9',
        prompt: 'LAP-9’s mask disagrees with the documented LAN. Fix it.',
        explanation: 'LAP-9 carries a /28 mask (255.255.255.240), spanning only 192.168.70.32–.47. MEDIA-1 at .20 falls outside that block from LAP-9’s view. The documented LAN mask is /24.',
        payload: { slots: [
          { id: 'mask', label: 'LAP-9 subnet mask', options: [
            { id: 'a', text: '255.255.255.0' }, { id: 'b', text: '255.255.255.240' }, { id: 'c', text: '255.255.255.248' } ] }
        ] },
        answer: { slots: { mask: 'a' } } }
    ]
  },

  // 14 — diagnose + reconfigure, wrong gateway, 172.16-31
  {
    id: 'np-diag-warehouse-diagnose-gw',
    cert: 'netplus', objective: '1.4', topic: 'Default gateways',
    title: 'Diagnose and repair the scanner gateway',
    estMinutes: 5, archetype: 'diagram',
    scenario: 'Warehouse inventory segment 172.29.12.0/24 has a router, a switch, an inventory server, and a handheld scanner base station. The base station can sync to the inventory server but can’t reach the cloud inventory API.',
    assets: { reference: { kind: 'network',
      given: { networkId: '172.29.12.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'wh2', ip: '172.29.12.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'wh2', ip: '172.29.12.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'inv1', label: 'INV-1', type: 'server', zone: 'wh2', ip: '172.29.12.15', mask: '255.255.255.0', gateway: '172.29.12.1', x: 1, y: 2 },
        { id: 'scanbase1', label: 'SCANBASE-1', type: 'pc', zone: 'wh2', ip: '172.29.12.60', mask: '255.255.255.0', gateway: '172.29.13.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'inv1' }, { from: 'sw1', to: 'scanbase1' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1,
        prompt: 'Which device is misconfigured?',
        explanation: 'SCANBASE-1’s gateway (172.29.13.1) is outside the documented 172.29.12.0/24 subnet, so it cannot forward off-segment traffic to the cloud API.',
        payload: { slots: [
          { id: 'device', label: 'Misconfigured device', options: [
            { id: 'a', text: 'INV-1' }, { id: 'b', text: 'SCANBASE-1' }, { id: 'c', text: 'SW-1' } ] }
        ] },
        answer: { slots: { device: 'b' } } },
      { id: 's2', type: 'configure', points: 1, deviceId: 'scanbase1',
        prompt: 'Fix SCANBASE-1’s default gateway.',
        explanation: 'The router’s interface on this segment is 172.29.12.1; pointing SCANBASE-1 there restores its route to the cloud API.',
        payload: { slots: [
          { id: 'gateway', label: 'SCANBASE-1 default gateway', options: [
            { id: 'a', text: '172.29.12.1' }, { id: 'b', text: '172.29.13.1' }, { id: 'c', text: '172.19.12.1' } ] }
        ] },
        answer: { slots: { gateway: 'a' } } }
    ]
  },

  // 15 — wrong host IP, 192.168.x, small office with 2 PCs + printer
  {
    id: 'np-diag-accounting-wrongnet',
    cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Move the accounting PC back on-net',
    estMinutes: 4, archetype: 'diagram',
    scenario: 'Accounting office LAN 192.168.90.0/24 has a router, a switch, a shared printer, and an accounting PC. The accountant can’t print month-end reports and gets destination-unreachable errors.',
    assets: { reference: { kind: 'network',
      given: { networkId: '192.168.90.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'acct', ip: '192.168.90.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'acct', ip: '192.168.90.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'prn2', label: 'PRN-2', type: 'printer', zone: 'acct', ip: '192.168.90.25', mask: '255.255.255.0', gateway: '192.168.90.1', x: 1, y: 2 },
        { id: 'actpc1', label: 'ACCT-PC1', type: 'pc', zone: 'acct', ip: '192.168.91.25', mask: '255.255.255.0', gateway: '192.168.90.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'prn2' }, { from: 'sw1', to: 'actpc1' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'actpc1',
        prompt: 'ACCT-PC1 is on the wrong network. Fix its IP address.',
        explanation: 'ACCT-PC1 holds 192.168.91.25, a different /24 than the documented accounting LAN (192.168.90.0/24), so it cannot reach PRN-2 despite sharing a switch.',
        payload: { slots: [
          { id: 'ip', label: 'ACCT-PC1 IP address', options: [
            { id: 'a', text: '192.168.90.25' }, { id: 'b', text: '192.168.91.25' }, { id: 'c', text: '192.168.9.25' } ] }
        ] },
        answer: { slots: { ip: 'a' } } }
    ]
  },

  // 16 — wrong mask AND wrong gateway (ip-only slot unaffected), 10.x
  {
    id: 'np-diag-remote-office-mask-gw',
    cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Fix the remote office workstation fully',
    estMinutes: 5, archetype: 'diagram',
    scenario: 'Remote sales office 10.40.2.0/24 has a router, a switch, a CRM server, and a sales workstation. The salesperson’s workstation can’t log into the CRM server or reach the VPN back to headquarters.',
    assets: { reference: { kind: 'network',
      given: { networkId: '10.40.2.0', mask: '255.255.255.0' },
      devices: [
        { id: 'rtr1', label: 'RTR-1', type: 'router', zone: 'sales', ip: '10.40.2.1', mask: '255.255.255.0', x: 2, y: 0 },
        { id: 'sw1', label: 'SW-1', type: 'switch', zone: 'sales', ip: '10.40.2.2', mask: '255.255.255.0', x: 2, y: 1 },
        { id: 'crm1', label: 'CRM-1', type: 'server', zone: 'sales', ip: '10.40.2.10', mask: '255.255.255.0', gateway: '10.40.2.1', x: 1, y: 2 },
        { id: 'sales1', label: 'SALES-1', type: 'pc', zone: 'sales', ip: '10.40.2.140', mask: '255.255.255.128', gateway: '10.40.3.1', x: 3, y: 2, state: 'affected' }
      ],
      links: [ { from: 'rtr1', to: 'sw1' }, { from: 'sw1', to: 'crm1' }, { from: 'sw1', to: 'sales1' } ]
    } },
    steps: [
      { id: 's1', type: 'configure', points: 1, deviceId: 'sales1',
        prompt: 'SALES-1 has two configuration problems. Fix its subnet mask and default gateway.',
        explanation: 'SALES-1’s /25 mask (255.255.255.128) puts its address .140 in the upper half (.128–.255) of the subnet, while RTR-1, SW-1, and CRM-1 (.1/.2/.10) sit in the lower half (.0–.127) — so SALES-1 sees CRM-1 as being on a different network. Its gateway 10.40.3.1 also sits outside the 10.40.2.0/24 segment entirely. Correcting both to the /24 mask and the router’s 10.40.2.1 interface restores both local and VPN reachability.',
        payload: { slots: [
          { id: 'mask', label: 'SALES-1 subnet mask', options: [
            { id: 'a', text: '255.255.255.0' }, { id: 'b', text: '255.255.255.128' }, { id: 'c', text: '255.255.255.192' } ] },
          { id: 'gateway', label: 'SALES-1 default gateway', options: [
            { id: 'a', text: '10.40.2.1' }, { id: 'b', text: '10.40.3.1' }, { id: 'c', text: '10.4.2.1' } ] }
        ] },
        answer: { slots: { mask: 'a', gateway: 'a' } } }
    ]
  },

  // ── Defense in Depth (Task 14, 2-agent gated) ──
  { id: 'netplus-did-flat-office', cert: 'netplus',
    objective: 'N10-009 Domain 4.1 — Explain common security concepts (defense in depth, network segmentation)',
    topic: 'Defense in Depth', title: 'One firewall, one flat network', estMinutes: 5, archetype: 'defense',
    scenario: 'A small office has a stateful firewall at the edge and nothing else. Behind it, every device including the public-facing web server sits on one flat internal subnet. The perimeter looks solid, but it is the only real control in the whole design.',
    assets: { reference: { kind: 'layered',
      layers: [
        { id: 'perimeter', label: 'Perimeter', control: 'Stateful firewall', state: 'present' },
        { id: 'dmz', label: 'Screened subnet (DMZ)', state: 'missing' },
        { id: 'internal', label: 'Internal LAN', control: 'Single flat subnet, no VLANs', state: 'missing' }
      ],
      core: { label: 'Servers and data', assets: [
        { id: 'web1', label: 'WEB-1 (public web server)', exposed: true },
        { id: 'fs1', label: 'FS-1 (file server)', exposed: true }
      ] }
    } },
    steps: [
      { id: 'd1', type: 'configure', points: 1,
        prompt: 'Which layer of defense is missing in this design?',
        explanation: 'Past the one firewall, everything is flat. The public web server sits right next to internal data with no screened subnet or segmentation between them, so a single breach reaches everything.',
        payload: { slots: [ { id: 'layer', label: 'Missing layer', options: [
          { id: 'l1', text: 'A screened subnet (DMZ) isolating the public web server' },
          { id: 'l2', text: 'A second stateful firewall at the edge' },
          { id: 'l3', text: 'A faster internet connection' },
          { id: 'l4', text: 'A larger switch chassis' }
        ] } ] },
        answer: { slots: { layer: 'l1' } } },
      { id: 'f1', type: 'configure', points: 1,
        prompt: 'Add the correct control at each layer.',
        explanation: 'A DMZ isolates the public server between two firewalls so a compromise stays away from internal data, and VLAN segmentation stops one foothold from reaching every device.',
        payload: { slots: [
          { id: 'perimeter', label: 'Perimeter', options: [
            { id: 'p1', text: 'Stateful firewall at the edge' }, { id: 'p2', text: 'Open all inbound ports for compatibility' } ] },
          { id: 'dmz', label: 'Public-facing servers', options: [
            { id: 'd1', text: 'Place in a screened subnet (DMZ) between two firewalls' }, { id: 'd2', text: 'Place directly on the internal LAN' } ] },
          { id: 'internal', label: 'Internal network', options: [
            { id: 'i1', text: 'Segment into VLANs by role' }, { id: 'i2', text: 'Keep as one flat subnet' } ] }
        ] },
        answer: { slots: { perimeter: 'p1', dmz: 'd1', internal: 'i1' } } }
    ]
  },

  { id: 'netplus-did-wifi-no-acl', cert: 'netplus',
    objective: 'N10-009 Domain 4.1 — Explain common security concepts (segmentation, access control lists, hardening)',
    topic: 'Defense in Depth', title: 'Guest Wi-Fi with a straight line to payroll', estMinutes: 5, archetype: 'defense',
    scenario: 'A retail branch has a firewall at the edge and a guest Wi-Fi SSID for customers. The guest network shares the same VLAN as the back-office LAN, and there is no ACL restricting traffic between them, so any guest device can reach the payroll server.',
    assets: { reference: { kind: 'layered',
      layers: [
        { id: 'perimeter', label: 'Perimeter', control: 'Edge firewall', state: 'present' },
        { id: 'network', label: 'Network segmentation', control: 'Guest Wi-Fi shares VLAN with back office, no ACL', state: 'missing' },
        { id: 'endpoint', label: 'Endpoint', control: 'Host firewall on payroll server', state: 'present' }
      ],
      core: { label: 'Back-office systems', assets: [
        { id: 'pay1', label: 'PAY-1 (payroll server)', exposed: true }
      ] }
    } },
    steps: [
      { id: 'd1', type: 'configure', points: 1,
        prompt: 'Which layer has the gap in this design?',
        explanation: 'The edge firewall and the payroll server\'s host firewall are both present, but guest and back-office traffic share one VLAN with no ACL between them, so the segmentation layer is the gap.',
        payload: { slots: [ { id: 'layer', label: 'Missing layer', options: [
          { id: 'l1', text: 'Network segmentation between guest Wi-Fi and back office' },
          { id: 'l2', text: 'The edge firewall' },
          { id: 'l3', text: 'The payroll server\'s host firewall' },
          { id: 'l4', text: 'Physical door locks on the server room' }
        ] } ] },
        answer: { slots: { layer: 'l1' } } },
      { id: 'f1', type: 'configure', points: 1,
        prompt: 'Add the correct control at each layer.',
        explanation: 'A dedicated guest VLAN with an ACL blocking guest-to-back-office traffic closes the gap, while keeping the existing perimeter and endpoint controls in place.',
        payload: { slots: [
          { id: 'perimeter', label: 'Perimeter', options: [
            { id: 'p1', text: 'Edge firewall filtering inbound/outbound traffic' }, { id: 'p2', text: 'No perimeter control needed' } ] },
          { id: 'network', label: 'Network', options: [
            { id: 'n1', text: 'Separate guest VLAN with an ACL denying access to the back-office VLAN' }, { id: 'n2', text: 'Same VLAN for guests and staff to simplify support' } ] },
          { id: 'endpoint', label: 'Endpoint', options: [
            { id: 'e1', text: 'Host-based firewall on the payroll server' }, { id: 'e2', text: 'Disable the payroll server\'s firewall for easier troubleshooting' } ] }
        ] },
        answer: { slots: { perimeter: 'p1', network: 'n1', endpoint: 'e1' } } }
    ]
  },

  { id: 'netplus-did-unmanaged-switch', cert: 'netplus',
    objective: 'N10-009 Domain 4.1 — Explain common security concepts (port security, hardening, segmentation)',
    topic: 'Defense in Depth', title: 'A closet switch anyone can plug into', estMinutes: 5, archetype: 'defense',
    scenario: 'A branch office has a firewall at the edge and VLANs separating departments. In the wiring closet, an unmanaged switch feeds the finance VLAN, and any of its open ports will hand out an address and full access to whoever plugs in, no authentication required.',
    assets: { reference: { kind: 'layered',
      layers: [
        { id: 'perimeter', label: 'Perimeter', control: 'Edge firewall', state: 'present' },
        { id: 'network', label: 'Network segmentation', control: 'VLANs by department', state: 'present' },
        { id: 'endpoint', label: 'Endpoint / port access', control: 'Open ports on an unmanaged switch, no port security', state: 'missing' }
      ],
      core: { label: 'Finance VLAN', assets: [
        { id: 'fin1', label: 'FIN-DB (finance database)', exposed: true }
      ] }
    } },
    steps: [
      { id: 'd1', type: 'configure', points: 1,
        prompt: 'Which layer has the gap in this design?',
        explanation: 'The perimeter and VLAN segmentation are both in place, but the finance VLAN\'s wiring closet uses an unmanaged switch with no port security, so anyone who plugs in gets full network access. The endpoint/port-access layer is the gap.',
        payload: { slots: [ { id: 'layer', label: 'Missing layer', options: [
          { id: 'l1', text: 'Port security on the access-layer switch' },
          { id: 'l2', text: 'The edge firewall' },
          { id: 'l3', text: 'VLAN segmentation' },
          { id: 'l4', text: 'DNS filtering' }
        ] } ] },
        answer: { slots: { layer: 'l1' } } },
      { id: 'f1', type: 'configure', points: 1,
        prompt: 'Add the correct control at each layer.',
        explanation: 'Replacing the unmanaged switch with a managed switch running 802.1X or MAC-based port security stops unauthenticated devices from joining the finance VLAN, while the perimeter and segmentation layers stay as they are.',
        payload: { slots: [
          { id: 'perimeter', label: 'Perimeter', options: [
            { id: 'p1', text: 'Edge firewall filtering traffic to the internet' }, { id: 'p2', text: 'No firewall, rely on VLANs alone' } ] },
          { id: 'network', label: 'Network', options: [
            { id: 'n1', text: 'VLANs segmenting finance from other departments' }, { id: 'n2', text: 'One VLAN for the entire building' } ] },
          { id: 'endpoint', label: 'Port access', options: [
            { id: 'e1', text: 'Managed switch with 802.1X port security' }, { id: 'e2', text: 'Unmanaged switch with all ports open' } ] }
        ] },
        answer: { slots: { perimeter: 'p1', network: 'n1', endpoint: 'e1' } } }
    ]
  },

  { id: 'netplus-did-vpn-split-tunnel', cert: 'netplus',
    objective: 'N10-009 Domain 4.1 — Explain common security concepts (remote access security, segmentation)',
    topic: 'Defense in Depth', title: 'A remote worker with a shortcut around the firewall', estMinutes: 5, archetype: 'defense',
    scenario: 'The company firewall inspects all traffic entering headquarters, and the internal LAN is segmented into VLANs. Remote employees connect over a site-to-site capable VPN, but split tunneling is enabled, so their internet traffic bypasses the corporate firewall entirely while their VPN tunnel still reaches internal servers.',
    assets: { reference: { kind: 'layered',
      layers: [
        { id: 'perimeter', label: 'Perimeter', control: 'Edge firewall inspecting inbound HQ traffic', state: 'present' },
        { id: 'remote', label: 'Remote access', control: 'VPN with split tunneling enabled', state: 'missing' },
        { id: 'network', label: 'Network segmentation', control: 'VLANs by department', state: 'present' }
      ],
      core: { label: 'Internal servers', assets: [
        { id: 'app1', label: 'APP-1 (internal app server)', exposed: true }
      ] }
    } },
    steps: [
      { id: 'd1', type: 'configure', points: 1,
        prompt: 'Which layer has the gap in this design?',
        explanation: 'The edge firewall and internal VLANs are both fine, but split tunneling lets a remote laptop reach the open internet unfiltered at the same time its VPN tunnel reaches internal servers. A compromised laptop becomes a bridge straight past the perimeter.',
        payload: { slots: [ { id: 'layer', label: 'Missing layer', options: [
          { id: 'l1', text: 'Remote access control (split tunneling bypasses the firewall)' },
          { id: 'l2', text: 'The edge firewall inspecting HQ traffic' },
          { id: 'l3', text: 'VLAN segmentation inside HQ' },
          { id: 'l4', text: 'Physical security of the server room' }
        ] } ] },
        answer: { slots: { layer: 'l1' } } },
      { id: 'f1', type: 'configure', points: 1,
        prompt: 'Add the correct control at each layer.',
        explanation: 'Forcing full-tunnel VPN routes all remote traffic through the corporate firewall for inspection, closing the bypass while the existing perimeter and segmentation layers remain effective.',
        payload: { slots: [
          { id: 'perimeter', label: 'Perimeter', options: [
            { id: 'p1', text: 'Edge firewall inspecting all inbound and outbound traffic' }, { id: 'p2', text: 'Firewall inspecting only inbound traffic' } ] },
          { id: 'remote', label: 'Remote access', options: [
            { id: 'r1', text: 'Full-tunnel VPN routing all traffic through the corporate firewall' }, { id: 'r2', text: 'Split-tunnel VPN so internet traffic bypasses the firewall' } ] },
          { id: 'network', label: 'Network', options: [
            { id: 'n1', text: 'VLANs segmenting internal servers by department' }, { id: 'n2', text: 'One flat VLAN for all internal servers' } ] }
        ] },
        answer: { slots: { perimeter: 'p1', remote: 'r1', network: 'n1' } } }
    ]
  },

  { id: 'netplus-did-iot-vlan', cert: 'netplus',
    objective: 'N10-009 Domain 4.1 — Explain common security concepts (IoT segmentation, hardening)',
    topic: 'Defense in Depth', title: 'Smart cameras on the same VLAN as the servers', estMinutes: 5, archetype: 'defense',
    scenario: 'A warehouse has an edge firewall and VLAN segmentation for its office network. Recently installed IoT security cameras were plugged into the same VLAN as the inventory servers because it was the quickest way to get them online, and the cameras still use their factory-default credentials.',
    assets: { reference: { kind: 'layered',
      layers: [
        { id: 'perimeter', label: 'Perimeter', control: 'Edge firewall', state: 'present' },
        { id: 'network', label: 'Network segmentation', control: 'IoT cameras share the server VLAN', state: 'missing' },
        { id: 'endpoint', label: 'Endpoint hardening', control: 'Cameras still use default credentials', state: 'missing' }
      ],
      core: { label: 'Inventory servers', assets: [
        { id: 'inv1', label: 'INV-1 (inventory server)', exposed: true },
        { id: 'cam1', label: 'CAM-1 (default-credential camera)', exposed: true }
      ] }
    } },
    steps: [
      { id: 'd1', type: 'configure', points: 1,
        prompt: 'Which layer has the biggest gap here?',
        explanation: 'Unhardened IoT devices sharing a VLAN with production servers is the core problem: a camera with default credentials is an easy foothold, and because there is no segmentation, that foothold reaches the inventory server directly.',
        payload: { slots: [ { id: 'layer', label: 'Missing layer', options: [
          { id: 'l1', text: 'IoT devices are not segmented from servers and still use default credentials' },
          { id: 'l2', text: 'The edge firewall is misconfigured' },
          { id: 'l3', text: 'The warehouse has too much bandwidth' },
          { id: 'l4', text: 'The inventory server is too old' }
        ] } ] },
        answer: { slots: { layer: 'l1' } } },
      { id: 'f1', type: 'configure', points: 1,
        prompt: 'Add the correct control at each layer.',
        explanation: 'Moving IoT devices to a dedicated VLAN with no route to servers, and changing default credentials on every camera, closes both gaps while the perimeter firewall stays as-is.',
        payload: { slots: [
          { id: 'perimeter', label: 'Perimeter', options: [
            { id: 'p1', text: 'Edge firewall filtering internet-bound traffic' }, { id: 'p2', text: 'No firewall needed for a warehouse' } ] },
          { id: 'network', label: 'Network', options: [
            { id: 'n1', text: 'Dedicated IoT VLAN isolated from the server VLAN' }, { id: 'n2', text: 'Keep IoT devices on the server VLAN for convenience' } ] },
          { id: 'endpoint', label: 'Endpoint', options: [
            { id: 'e1', text: 'Change default credentials on every camera' }, { id: 'e2', text: 'Leave factory-default credentials in place' } ] }
        ] },
        answer: { slots: { perimeter: 'p1', network: 'n1', endpoint: 'e1' } } }
    ]
  }

];

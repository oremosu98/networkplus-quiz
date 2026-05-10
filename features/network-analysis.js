// ════════════════════════════════════════════════════════════════════
// features/network-analysis.js — Phase 11b feature module (v4.99.36)
// ════════════════════════════════════════════════════════════════════
//
// Extracted from app.js lines 11393-12445 in v4.99.36 to lazy-load on
// first navigation to #page-network-analysis. Saves ~1,053 LOC + the
// associated render-block cost from the shell. Lazy-loaded via
// _loadFeature("network-analysis") in app.js.
//
// Contract (per PHASE_11B_CUT_POINTS.md):
//   - IIFE wraps everything to keep module-scoped state private
//   - Functions called from inline onclick handlers are attached to
//     window so the rendered HTML still finds them
//   - window._certanvilFeatures["network-analysis"].enter() is the
//     entry point invoked by the shell after lazy-load resolves
// ════════════════════════════════════════════════════════════════════

(function() {
  "use strict";

  const NA_CATEGORIES = ['tcpdump', 'wireshark', 'nmap', 'output-reading', 'filter'];
  const NA_CATEGORY_LABELS = {
    'tcpdump': 'tcpdump filters',
    'wireshark': 'Wireshark display filters',
    'nmap': 'Nmap scan types',
    'output-reading': 'Output reading',
    'filter': 'Filter syntax recognition'
  };
  
  const NETWORK_ANALYSIS_BANK = [
    // ── tcpdump filters (8) ──
    {
      id: 'na-tcpdump-001', category: 'tcpdump', difficulty: 'Foundational',
      question: 'You need to capture only HTTPS traffic going TO the server at <code>10.0.0.50</code>. Which tcpdump filter expresses this?',
      options: {
        A: '<code>tcp port 443 and dst host 10.0.0.50</code>',
        B: '<code>tcp.port == 443 &amp;&amp; ip.dst == 10.0.0.50</code>',
        C: '<code>port 443 and src host 10.0.0.50</code>',
        D: '<code>tcp dst port 443 and host 10.0.0.50</code>'
      },
      answer: 'A',
      explanation: 'tcpdump uses BPF (Berkeley Packet Filter) syntax — keywords like <code>tcp port</code>, <code>dst host</code>, joined by <code>and</code>/<code>or</code>/<code>not</code>. Option B is Wireshark display filter syntax (different grammar — uses <code>==</code> and <code>protocol.field</code> dot-notation). Option C captures traffic FROM the server, not TO it. Option D\'s <code>host</code> matches both directions — too broad.'
    },
    {
      id: 'na-tcpdump-002', category: 'tcpdump', difficulty: 'Foundational',
      question: 'Which tcpdump filter captures all UDP traffic on port 53 (DNS)?',
      options: {
        A: '<code>tcp port 53</code>',
        B: '<code>udp port 53</code>',
        C: '<code>port 53</code>',
        D: '<code>dns port 53</code>'
      },
      answer: 'B',
      explanation: '<code>udp port 53</code> captures only UDP DNS queries/responses. <code>tcp port 53</code> would catch only DNS over TCP (zone transfers, large responses). Bare <code>port 53</code> matches both TCP and UDP — broader than asked. There is no <code>dns</code> qualifier in BPF syntax.'
    },
    {
      id: 'na-tcpdump-003', category: 'tcpdump', difficulty: 'Foundational',
      question: 'You want to capture all traffic except ARP. Which filter?',
      options: {
        A: '<code>except arp</code>',
        B: '<code>!arp</code>',
        C: '<code>not arp</code>',
        D: '<code>noarp</code>'
      },
      answer: 'C',
      explanation: 'BPF supports <code>not</code>, <code>and</code>, <code>or</code> as primary boolean operators. <code>!</code> is also valid as a synonym for <code>not</code> in some tcpdump versions but <code>not arp</code> is the canonical form on the exam. <code>except</code> and <code>noarp</code> are not valid BPF keywords.'
    },
    {
      id: 'na-tcpdump-004', category: 'tcpdump', difficulty: 'Foundational',
      question: 'Which tcpdump filter captures traffic to or from any host in the <code>192.168.1.0/24</code> subnet?',
      options: {
        A: '<code>host 192.168.1.0/24</code>',
        B: '<code>subnet 192.168.1.0/24</code>',
        C: '<code>net 192.168.1.0/24</code>',
        D: '<code>range 192.168.1.0-255</code>'
      },
      answer: 'C',
      explanation: 'BPF uses <code>net X.X.X.X/Y</code> for subnet matching. <code>host</code> only matches a single IP (not a CIDR). <code>subnet</code> and <code>range</code> are not valid BPF qualifiers.'
    },
    {
      id: 'na-tcpdump-005', category: 'tcpdump', difficulty: 'Exam Level',
      question: 'A network engineer wants to capture only traffic FROM <code>10.0.0.5</code> (not destined to it). Which filter?',
      options: {
        A: '<code>host 10.0.0.5</code>',
        B: '<code>dst host 10.0.0.5</code>',
        C: '<code>src host 10.0.0.5</code>',
        D: '<code>from host 10.0.0.5</code>'
      },
      answer: 'C',
      explanation: '<code>src host X</code> matches packets where X is the source IP. Plain <code>host X</code> matches packets in EITHER direction (source or destination). <code>dst host X</code> would capture traffic TO X (the opposite of what was asked). <code>from</code> is not a valid BPF qualifier.'
    },
    {
      id: 'na-tcpdump-006', category: 'tcpdump', difficulty: 'Exam Level',
      question: 'Which filter captures HTTP traffic between <code>10.0.0.5</code> and the rest of the network?',
      options: {
        A: '<code>host 10.0.0.5 and tcp port 80</code>',
        B: '<code>src 10.0.0.5 and dst port 80</code>',
        C: '<code>10.0.0.5 port 80</code>',
        D: '<code>tcp 10.0.0.5 80</code>'
      },
      answer: 'A',
      explanation: '<code>host 10.0.0.5 and tcp port 80</code> matches HTTP traffic in either direction involving 10.0.0.5. Option B only catches outgoing requests (one direction). Option C is missing required keywords. Option D is invalid syntax.'
    },
    {
      id: 'na-tcpdump-007', category: 'tcpdump', difficulty: 'Exam Level',
      question: 'You need to write a filter that captures traffic on ports 80 OR 443 (web traffic). Which is valid?',
      options: {
        A: '<code>port 80,443</code>',
        B: '<code>port 80 or port 443</code>',
        C: '<code>port [80,443]</code>',
        D: '<code>tcp port 80&amp;443</code>'
      },
      answer: 'B',
      explanation: 'BPF requires explicit <code>or</code> between two qualifiers. Comma-separated lists are not valid in BPF (that is more of a Wireshark display filter convention via <code>in {80,443}</code>). Option C uses bracket notation that is not standard BPF.'
    },
    {
      id: 'na-tcpdump-008', category: 'tcpdump', difficulty: 'Exam Level',
      question: 'A pentester wants to capture all traffic EXCEPT SSH (port 22). Which filter?',
      options: {
        A: '<code>not tcp port 22</code>',
        B: '<code>port not 22</code>',
        C: '<code>tcp not port 22</code>',
        D: '<code>except tcp port 22</code>'
      },
      answer: 'A',
      explanation: '<code>not</code> goes BEFORE the qualifier in BPF. <code>not tcp port 22</code> excludes SSH. Options B and C have <code>not</code> in the wrong position; D uses an invalid keyword.'
    },
    // ── Wireshark display filters (6) ──
    {
      id: 'na-wireshark-001', category: 'wireshark', difficulty: 'Foundational',
      question: 'In Wireshark, which display filter shows ONLY HTTP requests (not responses)?',
      options: {
        A: '<code>http</code>',
        B: '<code>http.request</code>',
        C: '<code>http.method</code>',
        D: '<code>http == request</code>'
      },
      answer: 'B',
      explanation: '<code>http.request</code> is a boolean field — true on every HTTP request packet. <code>http</code> alone matches both requests AND responses. <code>http.method</code> is also true on requests but is redundant since <code>http.request</code> is the canonical filter for this.'
    },
    {
      id: 'na-wireshark-002', category: 'wireshark', difficulty: 'Foundational',
      question: 'Which Wireshark display filter shows traffic only from the host <code>10.0.0.5</code>?',
      options: {
        A: '<code>ip.src == 10.0.0.5</code>',
        B: '<code>src host 10.0.0.5</code>',
        C: '<code>ip.from = 10.0.0.5</code>',
        D: '<code>ip == 10.0.0.5</code>'
      },
      answer: 'A',
      explanation: 'Wireshark uses dot-notation for protocol fields: <code>protocol.field == value</code>. <code>ip.src</code> is the IP source field. Option B is tcpdump BPF syntax (different grammar). Option C uses <code>=</code> which is not the equality operator. Option D matches in both directions.'
    },
    {
      id: 'na-wireshark-003', category: 'wireshark', difficulty: 'Foundational',
      question: 'Which display filter shows only TCP traffic on port 80?',
      options: {
        A: '<code>tcp port == 80</code>',
        B: '<code>tcp.port == 80</code>',
        C: '<code>port.tcp == 80</code>',
        D: '<code>tcp port 80</code>'
      },
      answer: 'B',
      explanation: 'Wireshark display filter syntax is <code>protocol.field == value</code>. <code>tcp.port</code> matches both source AND destination port (use <code>tcp.srcport</code> / <code>tcp.dstport</code> for direction-specific). Option D is BPF/tcpdump syntax — not valid in Wireshark display filter.'
    },
    {
      id: 'na-wireshark-004', category: 'wireshark', difficulty: 'Exam Level',
      question: 'A user wants to find failed TCP connections (connections that received an RST). Which Wireshark display filter?',
      options: {
        A: '<code>tcp.flags == RST</code>',
        B: '<code>tcp.reset == 1</code>',
        C: '<code>tcp.flags.reset == 1</code>',
        D: '<code>tcp[RST]</code>'
      },
      answer: 'C',
      explanation: 'Wireshark exposes individual TCP flags as boolean fields: <code>tcp.flags.reset</code>, <code>tcp.flags.syn</code>, <code>tcp.flags.fin</code>, <code>tcp.flags.ack</code>, etc. Comparing each to <code>== 1</code> matches packets with that flag set. Option A would not match because <code>tcp.flags</code> is a numeric bitfield, not a string. Option D is BPF-style array indexing.'
    },
    {
      id: 'na-wireshark-005', category: 'wireshark', difficulty: 'Exam Level',
      question: 'Which display filter shows only DNS queries (not responses)?',
      options: {
        A: '<code>dns.query</code>',
        B: '<code>dns.flags.response == 0</code>',
        C: '<code>dns.request</code>',
        D: '<code>dns and not response</code>'
      },
      answer: 'B',
      explanation: 'In DNS, the QR (query/response) bit distinguishes queries from responses. Wireshark exposes this as <code>dns.flags.response</code> (1 = response, 0 = query). Options A and C use field names that do not exist in Wireshark. Option D mixes valid keywords incorrectly.'
    },
    {
      id: 'na-wireshark-006', category: 'wireshark', difficulty: 'Exam Level',
      question: 'A web admin wants to find all HTTP 404 (Not Found) responses. Which Wireshark filter?',
      options: {
        A: '<code>http.status == 404</code>',
        B: '<code>http.response.code == 404</code>',
        C: '<code>http.404</code>',
        D: '<code>http contains "404"</code>'
      },
      answer: 'B',
      explanation: '<code>http.response.code</code> is the canonical Wireshark field for HTTP status codes. Option A uses a field name that does not exist. Option C is invalid syntax. Option D would match anything with the literal string "404" anywhere in the packet — overly broad and would match traffic that happens to contain "404" in body content too.'
    },
    // ── Nmap scan types (8) ──
    {
      id: 'na-nmap-001', category: 'nmap', difficulty: 'Foundational',
      question: 'Which Nmap scan type sends a SYN, waits for SYN-ACK, then sends RST without completing the three-way handshake (avoiding logs on most systems)?',
      options: {
        A: 'TCP connect scan (<code>-sT</code>)',
        B: 'SYN scan / "half-open" scan (<code>-sS</code>)',
        C: 'FIN scan (<code>-sF</code>)',
        D: 'UDP scan (<code>-sU</code>)'
      },
      answer: 'B',
      explanation: 'The SYN scan (<code>-sS</code>) sends a SYN, observes the response (SYN-ACK = open, RST = closed), then sends RST instead of completing the handshake. This "half-open" technique avoids the connection being logged by most systems\' application logs (they only see fully-established connections). Requires root/admin privileges to craft raw packets.'
    },
    {
      id: 'na-nmap-002', category: 'nmap', difficulty: 'Foundational',
      question: 'Which Nmap flag scans UDP ports?',
      options: {
        A: '<code>-sU</code>',
        B: '<code>-sT</code>',
        C: '<code>-pu</code>',
        D: '<code>-udp</code>'
      },
      answer: 'A',
      explanation: '<code>-sU</code> performs a UDP port scan. UDP scanning is significantly slower than TCP because there is no equivalent of SYN-ACK to confirm an open port — Nmap relies on ICMP "port unreachable" responses (or lack thereof) plus optional service-specific probes.'
    },
    {
      id: 'na-nmap-003', category: 'nmap', difficulty: 'Foundational',
      question: 'A pentester runs <code>nmap -sV 192.168.1.10</code>. What is the primary purpose of <code>-sV</code>?',
      options: {
        A: 'Scan only verified ports',
        B: 'Detect service versions running on open ports',
        C: 'Verbose output mode',
        D: 'Skip the ping check'
      },
      answer: 'B',
      explanation: '<code>-sV</code> enables service version detection — Nmap connects to open ports and probes the service to identify the application name and version (e.g., "Apache httpd 2.4.41"). This is critical for vulnerability assessment because exploits are often version-specific. Verbose mode is <code>-v</code>; skipping ping is <code>-Pn</code>.'
    },
    {
      id: 'na-nmap-004', category: 'nmap', difficulty: 'Foundational',
      question: 'Which Nmap flag attempts to identify the operating system of a target?',
      options: {
        A: '<code>-O</code>',
        B: '<code>-osDetect</code>',
        C: '<code>-os</code>',
        D: '<code>-sO</code>'
      },
      answer: 'A',
      explanation: '<code>-O</code> (capital letter O) enables OS detection. Nmap analyzes TCP/IP stack fingerprints (response timing, TCP options ordering, sequence number generation patterns) and compares them to a database of known OS signatures. Note: <code>-sO</code> (lowercase s, capital O) is the IP protocol scan — different feature.'
    },
    {
      id: 'na-nmap-005', category: 'nmap', difficulty: 'Exam Level',
      question: 'A penetration tester wants to run an "aggressive" scan that combines OS detection, version detection, default scripts, and traceroute in one command. Which flag?',
      options: {
        A: '<code>-A</code>',
        B: '<code>-aggressive</code>',
        C: '<code>-sS -sV -O</code>',
        D: '<code>-T4</code>'
      },
      answer: 'A',
      explanation: '<code>-A</code> is shorthand for "aggressive" — equivalent to <code>-sV -O --script=default --traceroute</code>. It performs version detection, OS detection, runs the default NSE scripts, and traces the route. Option C is close but missing the script and traceroute components. <code>-T4</code> is a timing template (faster scanning), not a feature combination.'
    },
    {
      id: 'na-nmap-006', category: 'nmap', difficulty: 'Exam Level',
      question: 'A user without root privileges wants to scan TCP ports. Which scan type is appropriate?',
      options: {
        A: 'SYN scan (<code>-sS</code>)',
        B: 'FIN scan (<code>-sF</code>)',
        C: 'TCP connect scan (<code>-sT</code>)',
        D: 'NULL scan (<code>-sN</code>)'
      },
      answer: 'C',
      explanation: 'The TCP connect scan (<code>-sT</code>) uses the operating system\'s standard <code>connect()</code> system call — fully completing the three-way handshake. It does not require raw socket access (unlike <code>-sS</code>, <code>-sF</code>, <code>-sN</code> which all need root to craft custom packets). Trade-off: slower and easier to detect because connections are fully established and logged.'
    },
    {
      id: 'na-nmap-007', category: 'nmap', difficulty: 'Exam Level',
      question: 'A FIN scan (<code>-sF</code>) sends packets with only the FIN flag set. On a closed port, the target responds with RST. On an open port, what happens?',
      options: {
        A: 'The target responds with FIN-ACK',
        B: 'The target responds with SYN-ACK',
        C: 'The target sends no response',
        D: 'The target responds with ICMP unreachable'
      },
      answer: 'C',
      explanation: 'On open ports, RFC 793-compliant TCP stacks ignore unsolicited FIN packets (because there is no established connection to terminate). On closed ports, they respond with RST. Nmap interprets "no response" as open|filtered. This stealth technique only works on RFC-compliant stacks — Windows responds with RST regardless, defeating FIN scans.'
    },
    {
      id: 'na-nmap-008', category: 'nmap', difficulty: 'Exam Level',
      question: 'Which Nmap flag scans only port 80?',
      options: {
        A: '<code>-port 80</code>',
        B: '<code>-p 80</code>',
        C: '<code>--only-port 80</code>',
        D: '<code>-sp 80</code>'
      },
      answer: 'B',
      explanation: '<code>-p</code> specifies port(s) to scan. <code>-p 80</code> scans only port 80. Other syntax: <code>-p 80,443</code> for multiple, <code>-p 1-1000</code> for ranges, <code>-p-</code> for all 65535 ports. Option D (<code>-sP</code>) is the now-deprecated ping scan (<code>-sn</code> in modern Nmap).'
    },
    // ── Output reading (10) ──
    {
      id: 'na-output-001', category: 'output-reading', difficulty: 'Foundational',
      question: 'tcpdump shows a single packet with <code>Flags [S]</code>. What does this represent?',
      options: {
        A: 'A connection reset',
        B: 'A graceful connection close',
        C: 'An initial connection attempt (SYN)',
        D: 'A data transfer in progress'
      },
      answer: 'C',
      explanation: '<code>[S]</code> = SYN flag set, the first packet of a TCP three-way handshake. The sender is requesting to open a connection. <code>[R]</code> would be reset, <code>[F]</code> would be FIN (graceful close), and data transfer is typically <code>[P.]</code> (PSH+ACK) or <code>[.]</code> (ACK).'
    },
    {
      id: 'na-output-002', category: 'output-reading', difficulty: 'Foundational',
      question: 'tcpdump shows <code>Flags [R]</code> on a packet. What happened?',
      options: {
        A: 'A graceful connection teardown',
        B: 'A retransmission of a lost segment',
        C: 'A connection reset by the sender',
        D: 'A request for a routing update'
      },
      answer: 'C',
      explanation: '<code>[R]</code> = RST flag, an immediate connection abort. The sender is forcefully closing the connection without the four-way teardown. Common causes: connection refused (port closed), application error, firewall policy, or stateless responses to unexpected packets.'
    },
    {
      id: 'na-output-003', category: 'output-reading', difficulty: 'Foundational',
      question: 'A tcpdump capture shows three packets in this exact sequence: <code>[S]</code>, then <code>[S.]</code>, then <code>[.]</code>. What does this represent?',
      output: '14:22:08.103442 IP 10.0.0.5.52414 > 10.0.0.50.443: Flags [S], seq 1234567890, win 64240, length 0\n14:22:08.103998 IP 10.0.0.50.443 > 10.0.0.5.52414: Flags [S.], seq 9876543210, ack 1234567891, win 65535, length 0\n14:22:08.104210 IP 10.0.0.5.52414 > 10.0.0.50.443: Flags [.], ack 9876543211, win 64240, length 0',
      outputType: 'tcpdump',
      options: {
        A: 'A failed connection — the server reset the request',
        B: 'A TCP three-way handshake completing successfully (SYN, SYN-ACK, ACK)',
        C: 'A TLS handshake — the client and server exchanging certificates',
        D: 'A connection teardown via four-way handshake'
      },
      answer: 'B',
      explanation: 'The classic three-way handshake: client sends SYN <code>[S]</code>, server responds with SYN-ACK <code>[S.]</code> (the dot represents ACK), client sends final ACK <code>[.]</code>. This is the TCP connection establishment pattern. The sequence numbers visible (1234567890 → 1234567891) and acknowledgements confirm the handshake is completing correctly.'
    },
    {
      id: 'na-output-004', category: 'output-reading', difficulty: 'Foundational',
      question: 'Wireshark shows protocol = ICMP, type = 3, code = 1. What does this indicate?',
      options: {
        A: 'Echo Request (ping)',
        B: 'Destination Network Unreachable',
        C: 'Destination Host Unreachable',
        D: 'TTL expired in transit'
      },
      answer: 'C',
      explanation: 'ICMP Type 3 = Destination Unreachable. The CODE narrows it down: Code 0 = Network Unreachable, Code 1 = Host Unreachable, Code 3 = Port Unreachable, Code 13 = Communication Administratively Prohibited (firewall). Echo Request is Type 8; TTL Expired is Type 11.'
    },
    {
      id: 'na-output-005', category: 'output-reading', difficulty: 'Exam Level',
      question: 'A long tcpdump capture shows many packets with <code>Flags [P.]</code>. What is happening?',
      options: {
        A: 'A port scan in progress',
        B: 'Data being transferred (PSH+ACK packets pushing application data)',
        C: 'Repeated connection attempts',
        D: 'ICMP echo replies'
      },
      answer: 'B',
      explanation: '<code>[P.]</code> = PSH (push) + ACK flags. This is the standard pattern for application-layer data being transferred over an established TCP connection. The PSH flag tells the receiver to deliver the data to the application immediately rather than buffering. ICMP would not show TCP flags. Port scans typically use SYN <code>[S]</code> or other unusual flag combinations.'
    },
    {
      id: 'na-output-006', category: 'output-reading', difficulty: 'Exam Level',
      question: 'In Wireshark, the Info column shows <code>Client Hello</code>. Which protocol event is this?',
      options: {
        A: 'HTTP request initiation',
        B: 'TLS handshake initiation by the client',
        C: 'DHCP discovery message',
        D: 'BGP peer establishment'
      },
      answer: 'B',
      explanation: '"Client Hello" is the FIRST message of a TLS handshake — the client announces supported cipher suites, TLS versions, extensions, and a random number. Server responds with "Server Hello" + certificate. This is layer 6 (Presentation) in the OSI model. HTTP requests would show "GET" or "POST"; DHCP shows "Discover"; BGP shows "OPEN".'
    },
    {
      id: 'na-output-007', category: 'output-reading', difficulty: 'Exam Level',
      question: 'tcpdump shows <code>arp who-has 10.0.0.50 tell 10.0.0.5</code>. What is happening?',
      output: '14:30:12.001 ARP, Request who-has 10.0.0.50 tell 10.0.0.5, length 28\n14:30:12.002 ARP, Reply 10.0.0.50 is-at aa:bb:cc:dd:ee:ff, length 28',
      outputType: 'tcpdump',
      options: {
        A: 'A DNS query asking for the IP of <code>10.0.0.50</code>',
        B: 'A device at <code>10.0.0.5</code> asking which MAC owns IP <code>10.0.0.50</code>',
        C: 'A routing protocol exchange between two routers',
        D: 'A DHCP request for an IP address'
      },
      answer: 'B',
      explanation: 'ARP (Address Resolution Protocol) maps IPs to MACs. "Who-has X tell Y" means "anyone owning IP X, please reply to MAC owning IP Y." The reply tells the requester the destination MAC so it can construct the Ethernet frame. ARP operates at Layer 2/3 boundary. DNS would be a UDP query; routing protocols use specific ports.'
    },
    {
      id: 'na-output-008', category: 'output-reading', difficulty: 'Exam Level',
      question: 'A Wireshark capture shows multiple <code>[S]</code> packets from the same source to the same destination port within milliseconds, with no responses. What is most likely happening?',
      options: {
        A: 'A successful TCP connection',
        B: 'A SYN flood attack OR a host attempting to connect to a port that is filtered/dropped',
        C: 'Normal application traffic with retransmissions',
        D: 'An ARP storm'
      },
      answer: 'B',
      explanation: 'Repeated <code>[S]</code> packets from the same source/dest with no SYN-ACK response indicate the SYNs are being silently dropped. Two common causes: (1) a firewall is filtering with DROP (no response sent — looks like a black hole) instead of REJECT, (2) a SYN flood DoS attempt. A successful connection would show SYN-ACK + ACK after the first SYN. ARP is a different protocol entirely (no TCP flags).'
    },
    {
      id: 'na-output-009', category: 'output-reading', difficulty: 'Exam Level',
      question: 'tcpdump shows a UDP packet to port 53 with content matching a domain name lookup pattern. The Info column reads <code>A? example.com</code>. What is this?',
      options: {
        A: 'A reverse DNS lookup',
        B: 'A DNS query asking for the IPv4 address of <code>example.com</code>',
        C: 'A DNS query asking for the MX record',
        D: 'An HTTP request to <code>example.com</code>'
      },
      answer: 'B',
      explanation: '<code>A?</code> in DNS shorthand means "A record query" (IPv4 address lookup). Other DNS record types: <code>AAAA?</code> = IPv6, <code>MX?</code> = mail exchanger, <code>PTR?</code> = reverse lookup, <code>CNAME?</code> = canonical alias, <code>TXT?</code> = text record. Reverse DNS lookups are PTR queries and use the special <code>.in-addr.arpa</code> zone.'
    },
    {
      id: 'na-output-010', category: 'output-reading', difficulty: 'Exam Level',
      question: 'tcpdump shows a packet with <code>Flags [F.]</code>. What is happening?',
      options: {
        A: 'A SYN-FIN packet (uncommon, often malicious)',
        B: 'FIN+ACK — initiating graceful connection teardown',
        C: 'A retransmitted FIN packet',
        D: 'A failed TCP option negotiation'
      },
      answer: 'B',
      explanation: '<code>[F.]</code> = FIN flag + ACK flag. This is the first packet of the four-way TCP teardown: one side sends FIN-ACK, the other responds with ACK, then sends its own FIN-ACK, finally an ACK closes the connection. <code>[F]</code> alone (without ACK) is unusual — connection close without acknowledging prior data is irregular.'
    },
  
    // ── Filter syntax recognition (10) ──
    // Phase 2 (v4.85.0) — exam tests RECOGNITION of filter syntax, not construction.
    // The #1 trip-up: confusing BPF (tcpdump) with display filter (Wireshark) syntax.
    {
      id: 'na-filter-001', category: 'filter', difficulty: 'Foundational',
      question: 'Which of the following is a valid <strong>Wireshark display filter</strong>?',
      options: {
        A: 'tcp port 443',
        B: 'tcp.port == 443',
        C: 'port 443 and tcp',
        D: 'capture tcp 443'
      },
      answer: 'B',
      explanation: 'Wireshark display filters use dot-notation: <code>protocol.field operator value</code>. <code>tcp.port == 443</code> is the correct syntax. Options A and C use BPF (tcpdump) syntax with bare qualifiers like <code>port</code> and <code>tcp</code>. Option D is not valid in either system.'
    },
    {
      id: 'na-filter-002', category: 'filter', difficulty: 'Foundational',
      question: 'Which tool uses <strong>Berkeley Packet Filter (BPF)</strong> syntax for its capture filters?',
      options: {
        A: 'Wireshark display filter bar',
        B: 'Nmap port scanner',
        C: 'tcpdump',
        D: 'netstat'
      },
      answer: 'C',
      explanation: 'tcpdump uses BPF syntax at the command line: <code>tcpdump host 10.0.0.5 and port 80</code>. Wireshark also supports BPF, but only in its <em>capture filter</em> dialog — the green display filter bar at the top uses Wireshark\'s own dot-notation syntax. Nmap and netstat do not use BPF.'
    },
    {
      id: 'na-filter-003', category: 'filter', difficulty: 'Exam Level',
      question: 'A technician types <code>tcp.port == 80</code> into the tcpdump command line and gets a syntax error. Why?',
      options: {
        A: 'tcpdump requires root privileges to filter by port',
        B: 'The port number 80 is blocked by the firewall',
        C: 'tcpdump uses BPF syntax, not Wireshark display filter syntax',
        D: 'The <code>==</code> operator is invalid in any filter system'
      },
      answer: 'C',
      explanation: 'tcpdump uses BPF syntax: <code>tcp port 80</code> (no dots, no <code>==</code>). <code>tcp.port == 80</code> is Wireshark display filter syntax. This is the #1 conceptual trap — mixing up which syntax belongs to which tool. The <code>==</code> operator IS valid in Wireshark display filters, just not in BPF.'
    },
    {
      id: 'na-filter-004', category: 'filter', difficulty: 'Foundational',
      question: 'What does the tcpdump filter <code>src host 10.0.0.5 and dst port 443</code> capture?',
      options: {
        A: 'All traffic on port 443 regardless of source',
        B: 'Traffic originating from 10.0.0.5 destined for port 443',
        C: 'Traffic destined for 10.0.0.5 on port 443',
        D: 'Only HTTPS responses from 10.0.0.5'
      },
      answer: 'B',
      explanation: 'BPF reads left to right: <code>src host 10.0.0.5</code> = source IP must be 10.0.0.5; <code>and</code> = boolean AND; <code>dst port 443</code> = destination port must be 443. Combined: outbound HTTPS-bound traffic FROM 10.0.0.5. Option D is wrong because this captures requests going TO port 443, not responses coming back.'
    },
    {
      id: 'na-filter-005', category: 'filter', difficulty: 'Exam Level',
      question: 'You want to filter Wireshark to show only HTTP POST requests. Which display filter is correct?',
      options: {
        A: 'http.request.method == "POST"',
        B: 'tcp port 80 and method POST',
        C: 'http.post == true',
        D: 'filter http where method = POST'
      },
      answer: 'A',
      explanation: 'Wireshark display filters use dot-notation with specific field names: <code>http.request.method</code> is the field for the HTTP method. Option B uses BPF syntax (wrong context). Option C uses a non-existent field. Option D is SQL-like syntax that neither tool supports.'
    },
    {
      id: 'na-filter-006', category: 'filter', difficulty: 'Exam Level',
      question: 'Which pair correctly shows the <strong>same logical filter</strong> in BOTH tcpdump BPF and Wireshark display filter syntax?',
      options: {
        A: 'BPF: <code>host 10.0.0.5</code> / Display: <code>ip.addr == 10.0.0.5</code>',
        B: 'BPF: <code>ip.src == 10.0.0.5</code> / Display: <code>src host 10.0.0.5</code>',
        C: 'BPF: <code>tcp.port == 443</code> / Display: <code>port 443</code>',
        D: 'BPF: <code>host 10.0.0.5</code> / Display: <code>host 10.0.0.5</code>'
      },
      answer: 'A',
      explanation: 'BPF: <code>host 10.0.0.5</code> matches traffic to OR from that IP. The Wireshark display filter equivalent is <code>ip.addr == 10.0.0.5</code> (<code>ip.addr</code> matches either source or destination). Option B has the syntaxes reversed. Option C has the syntaxes reversed. Option D uses BPF syntax in both — display filters require dot-notation.'
    },
    {
      id: 'na-filter-007', category: 'filter', difficulty: 'Foundational',
      question: 'In Wireshark, where do you type a <strong>display filter</strong>?',
      options: {
        A: 'The Capture Options dialog before starting a capture',
        B: 'The green filter bar at the top of the packet list',
        C: 'The terminal command line before launching Wireshark',
        D: 'The Edit menu under Preferences'
      },
      answer: 'B',
      explanation: 'The green filter bar at the top of the main Wireshark window is where display filters go. It turns green when the filter syntax is valid and red when invalid. The Capture Options dialog (A) uses BPF capture filters — a common source of confusion. Display filters run AFTER capture; capture filters run DURING capture.'
    },
    {
      id: 'na-filter-008', category: 'filter', difficulty: 'Exam Level',
      question: 'A network admin needs to exclude ARP and STP traffic from a tcpdump capture. Which filter is correct?',
      options: {
        A: 'not arp and not stp',
        B: '!arp && !stp',
        C: 'exclude arp, stp',
        D: 'Both A and B are correct'
      },
      answer: 'D',
      explanation: 'BPF supports both word-form (<code>not</code> / <code>and</code> / <code>or</code>) and symbol-form (<code>!</code> / <code>&&</code> / <code>||</code>) boolean operators. Both <code>not arp and not stp</code> and <code>!arp && !stp</code> are valid and equivalent. Option C uses a fictional <code>exclude</code> keyword that does not exist in BPF.'
    },
    {
      id: 'na-filter-009', category: 'filter', difficulty: 'Exam Level',
      question: 'Which Wireshark display filter shows only DNS query packets (not responses)?',
      options: {
        A: 'udp port 53',
        B: 'dns.flags.response == 0',
        C: 'dns.query == true',
        D: 'port 53 and not response'
      },
      answer: 'B',
      explanation: 'In Wireshark display filters, <code>dns.flags.response == 0</code> matches DNS queries (the QR bit = 0 means query, 1 means response). Option A is BPF syntax, not display filter syntax. Option C uses a non-existent field. Option D mixes BPF with a fictional <code>response</code> keyword.'
    },
    {
      id: 'na-filter-010', category: 'filter', difficulty: 'Foundational',
      question: 'What is the key syntactical difference between tcpdump (BPF) filters and Wireshark display filters?',
      options: {
        A: 'BPF uses dot-notation (<code>tcp.port</code>); display filters use bare qualifiers (<code>port 80</code>)',
        B: 'BPF uses bare qualifiers (<code>host</code>, <code>port</code>); display filters use dot-notation (<code>ip.addr</code>, <code>tcp.port</code>)',
        C: 'BPF only works with TCP; display filters work with all protocols',
        D: 'There is no difference — both use the same syntax'
      },
      answer: 'B',
      explanation: 'The fundamental syntactical difference: BPF uses bare keyword qualifiers (<code>host X</code>, <code>port N</code>, <code>tcp</code>) while Wireshark display filters use <code>protocol.field</code> dot-notation (<code>ip.addr == X</code>, <code>tcp.port == N</code>). Both support all protocols — the difference is grammar, not capability.'
    }
  ];
  
  const NETWORK_ANALYSIS_LESSONS = [
    {
      id: 'tcpdump-cheatsheet',
      title: 'tcpdump filter cheatsheet',
      subtitle: 'BPF (Berkeley Packet Filter) syntax — what tcpdump uses on the command line',
      steps: [
        {
          title: 'Why tcpdump uses BPF',
          body: 'tcpdump captures packets at the kernel level on Linux/macOS/BSD. Filters are written in BPF (Berkeley Packet Filter) syntax — a compact grammar designed to compile down to fast in-kernel filtering. The grammar is built around <strong>qualifiers</strong> (<code>host</code>, <code>port</code>, <code>net</code>, protocol names) joined by <strong>boolean operators</strong> (<code>and</code>, <code>or</code>, <code>not</code>). Different from Wireshark display filters — those run AFTER capture in the GUI.',
          example: 'tcpdump -i eth0 -n                   # capture on eth0, no DNS lookup\ntcpdump -i any -c 100 \'tcp port 80\'  # max 100 packets, HTTP only'
        },
        {
          title: 'Filter by host or network',
          body: 'tcpdump\'s <code>host</code> qualifier matches a specific IP — by default in BOTH directions (source OR destination). Add <code>src</code> or <code>dst</code> to narrow it. Use <code>net X.X.X.X/Y</code> to match a whole subnet.',
          example: 'tcpdump host 10.0.0.5            # traffic to OR from 10.0.0.5\ntcpdump src host 10.0.0.5        # only FROM 10.0.0.5\ntcpdump dst host 10.0.0.5        # only TO 10.0.0.5\ntcpdump net 10.0.0.0/24          # whole subnet'
        },
        {
          title: 'Filter by port and protocol',
          body: 'The <code>port</code> qualifier matches both TCP and UDP unless you prefix it with <code>tcp</code> or <code>udp</code>. Direction works the same way as with <code>host</code>: <code>src port</code> / <code>dst port</code>. Protocol qualifiers like <code>tcp</code>, <code>udp</code>, <code>icmp</code>, <code>arp</code> can stand alone.',
          example: 'tcpdump port 53                  # any DNS traffic (TCP or UDP)\ntcpdump udp port 53              # only UDP DNS\ntcpdump tcp dst port 443         # only TCP traffic destined to 443\ntcpdump arp                      # only ARP packets'
        },
        {
          title: 'Boolean combinators',
          body: 'Combine qualifiers with <code>and</code> / <code>or</code> / <code>not</code>. Use parentheses (in single quotes — shell would expand them otherwise) for grouping. <code>not</code> goes BEFORE the qualifier, not after.',
          example: 'tcpdump \'host 10.0.0.5 and tcp port 80\'           # web traffic to/from host\ntcpdump \'port 80 or port 443\'                     # any web traffic\ntcpdump \'not arp and not stp\'                     # exclude ARP + STP\ntcpdump \'(src 10.0.0.5 or src 10.0.0.6) and dst port 22\''
        },
        {
          title: 'Common one-liners + cheatsheet',
          body: 'These cover ~80% of real diagnostic captures. Memorize the patterns, not specific filter strings — once the grammar clicks, you can build filters from any English description.'
        }
      ],
      cheatsheet: [
        { pattern: 'host X', desc: 'Match traffic to OR from IP X' },
        { pattern: 'src host X / dst host X', desc: 'Direction-specific match' },
        { pattern: 'net X.X.X.X/Y', desc: 'Match a whole subnet' },
        { pattern: 'port N / src port N / dst port N', desc: 'Port match (any/source-only/destination-only)' },
        { pattern: 'tcp / udp / icmp / arp', desc: 'Protocol match' },
        { pattern: 'and / or / not', desc: 'Boolean combinators (also && / || / !)' },
        { pattern: '\'expr1 and expr2\'', desc: 'Quote complex filters to escape shell metachars' }
      ]
    },
    {
      id: 'wireshark-cheatsheet',
      title: 'Wireshark display filter cheatsheet',
      subtitle: 'Display filter grammar — different from BPF, runs after capture in the GUI',
      steps: [
        {
          title: 'Display filter vs Capture filter (the #1 trip-up)',
          body: 'Wireshark has TWO filter types with completely different syntaxes: <strong>capture filter</strong> (uses BPF — same as tcpdump, applied DURING capture, written in the "Capture Options" dialog) and <strong>display filter</strong> (Wireshark\'s own grammar, applied AFTER capture, typed in the green filter bar at the top). 99% of "filter syntax" questions on exams ask about DISPLAY filter syntax — that is the green bar. Mixing the two is the #1 source of confusion.',
          example: 'Capture filter:   tcp port 80              <-- BPF (same as tcpdump)\nDisplay filter:   tcp.port == 80           <-- Wireshark grammar'
        },
        {
          title: 'Field-name pattern: protocol.field',
          body: 'Display filters reference fields by <code>protocol.field</code> dot-notation. Common protocols expose dozens of fields each. The autocomplete in Wireshark\'s filter bar shows valid fields as you type — that is the easiest discovery path.',
          example: 'ip.src                # source IP address (matches packets containing this field)\nip.dst                # destination IP address\ntcp.port              # TCP port (matches src OR dst)\ntcp.srcport           # TCP source port only\nhttp.request.method   # HTTP method (GET, POST, etc.)\ndns.qry.name          # the domain name being looked up'
        },
        {
          title: 'Operators',
          body: 'Comparison operators: <code>==</code> (equal), <code>!=</code> (not equal), <code>></code> / <code>&lt;</code> / <code>&gt;=</code> / <code>&lt;=</code>. String operators: <code>contains</code> (substring match) and <code>matches</code> (regex). Boolean fields like <code>http.request</code> match by mere presence — no operator needed.',
          example: 'ip.src == 10.0.0.5              # exact IP match\ntcp.port != 22                  # NOT SSH\nhttp.request.method == "POST"   # POST requests only\nhttp.user_agent contains "curl" # any request with curl in UA\nframe.len > 1000                # packets larger than 1000 bytes'
        },
        {
          title: 'Boolean combinators',
          body: 'Both word and symbolic forms work: <code>and</code> / <code>&&</code>, <code>or</code> / <code>||</code>, <code>not</code> / <code>!</code>. Use parentheses for precedence. Display filters do not need to be quoted (no shell expansion concerns — the input goes directly into Wireshark).',
          example: 'tcp.port == 80 and ip.src == 10.0.0.5\ndns or http\nnot arp and not stp\n(tcp.port == 80 or tcp.port == 443) and ip.dst == 10.0.0.50'
        },
        {
          title: 'Common queries + cheatsheet',
          body: 'Display filter cheatsheet for the most-used queries. Note how every query uses the <code>protocol.field</code> grammar — internalize that pattern first, then specifics fall into place.'
        }
      ],
      cheatsheet: [
        { pattern: 'http.request', desc: 'Show HTTP requests only (boolean field)' },
        { pattern: 'http.response.code == 404', desc: 'Show 404 Not Found responses' },
        { pattern: 'tcp.port == 443', desc: 'TLS / HTTPS traffic' },
        { pattern: 'tcp.flags.reset == 1', desc: 'Failed connections (RST flag set)' },
        { pattern: 'ip.src == X.X.X.X', desc: 'Traffic from specific source IP' },
        { pattern: 'dns.flags.response == 0', desc: 'DNS queries (not responses)' },
        { pattern: 'frame.len > 1000', desc: 'Large packets (filter on frame size)' },
        { pattern: 'eth.addr == aa:bb:cc:dd:ee:ff', desc: 'Match a specific MAC address' }
      ]
    },
    {
      id: 'nmap-decision-tree',
      title: 'Nmap scan-type decision tree',
      subtitle: 'What scan to use for what goal — and what each flag actually does',
      steps: [
        {
          title: 'What Nmap does',
          body: 'Nmap is a network scanner with four core capabilities: <strong>port scanning</strong> (which ports are open), <strong>service detection</strong> (what application is on each port + version), <strong>OS detection</strong> (which OS the host is running, via TCP/IP fingerprinting), and <strong>scripting</strong> (NSE — Nmap Scripting Engine — runs vulnerability checks, info gathering scripts, and automation against discovered services).',
          example: 'nmap 10.0.0.0/24                # default scan: top 1000 TCP ports\nnmap -sV 10.0.0.50              # add service version detection\nnmap -O 10.0.0.50               # add OS detection\nnmap -A 10.0.0.50               # aggressive: -sV + -O + scripts + traceroute'
        },
        {
          title: 'TCP scan types: SYN vs Connect',
          body: '<strong>SYN scan</strong> (<code>-sS</code>): sends SYN, sees SYN-ACK (open) or RST (closed), then sends RST without completing the handshake. Stealthier (most logs only record fully-established connections). Default mode but REQUIRES ROOT to craft raw packets.<br><br><strong>TCP connect</strong> (<code>-sT</code>): uses the OS\'s normal <code>connect()</code> call, fully completing the handshake. No root required. Slower and more visible in target logs.',
          example: 'sudo nmap -sS 10.0.0.50         # half-open scan (default if root)\nnmap -sT 10.0.0.50              # connect scan (no root needed)'
        },
        {
          title: 'UDP scanning (slow but necessary)',
          body: 'UDP scanning (<code>-sU</code>) is significantly slower than TCP because UDP has no equivalent of SYN-ACK to confirm a port is open. Nmap interprets responses: <strong>ICMP "port unreachable"</strong> = closed, <strong>no response</strong> = open|filtered (ambiguous), <strong>application response</strong> = open. Many UDP scans timeout on filtered ports — be patient (or use <code>--max-retries</code>).',
          example: 'sudo nmap -sU 10.0.0.50         # UDP scan (root required)\nsudo nmap -sU --top-ports 100 10.0.0.50  # speed up by limiting scope'
        },
        {
          title: 'Information gathering: -sV / -O / -A',
          body: 'After finding open ports, layer in detection: <strong>-sV</strong> (service version) probes each open port to identify the application + version. <strong>-O</strong> (OS detection) sends crafted packets and analyzes TCP/IP stack fingerprints to identify the OS. <strong>-A</strong> (aggressive) is shorthand for <code>-sV -O --script=default --traceroute</code> — runs everything. Use <code>-A</code> when noise is acceptable; use individual flags when you want surgical control.',
          example: 'nmap -sV -O 10.0.0.50           # version + OS detection\nnmap -A 10.0.0.50               # full enumeration\nnmap -sV --version-intensity 9 10.0.0.50  # most aggressive version probing'
        },
        {
          title: 'Common command patterns + cheatsheet',
          body: 'These are the patterns you should recognize on sight. The exam tests interpretation more than rote memorization — being able to read <code>nmap -sS -p 80,443 10.0.0.0/24</code> and explain what it does is more valuable than memorizing every flag.'
        }
      ],
      cheatsheet: [
        { pattern: '-sS', desc: 'SYN / "half-open" scan (stealthier, needs root)' },
        { pattern: '-sT', desc: 'TCP connect scan (no root, more visible)' },
        { pattern: '-sU', desc: 'UDP scan (slow — ICMP unreachable = closed)' },
        { pattern: '-sV', desc: 'Service version detection on open ports' },
        { pattern: '-O', desc: 'OS detection via TCP/IP fingerprinting' },
        { pattern: '-A', desc: 'Aggressive: -sV + -O + scripts + traceroute' },
        { pattern: '-p N / -p N1,N2 / -p N1-N2 / -p-', desc: 'Port specification (single, list, range, all 65535)' },
        { pattern: '-Pn', desc: 'Skip host discovery (treat all hosts as up)' }
      ]
    },
    {
      id: 'bpf-vs-display',
      title: 'BPF vs Display Filter — side-by-side',
      subtitle: 'The #1 exam trip-up: knowing which syntax belongs to which tool',
      steps: [
        {
          title: 'Why this matters on the exam',
          body: 'CompTIA N10-009 tests whether you can <strong>recognize</strong> filter syntax — "Which filter would you use in tcpdump?" or "What does this Wireshark filter show?" The #1 mistake is applying Wireshark display filter syntax in tcpdump (or vice versa). This lesson puts both side-by-side so the difference clicks visually.'
        },
        {
          title: 'The grammar difference',
          body: '<strong>BPF (tcpdump)</strong> uses bare keyword qualifiers: <code>host</code>, <code>port</code>, <code>net</code>, protocol names (<code>tcp</code>, <code>udp</code>, <code>arp</code>). No dots, no operators like <code>==</code>.<br><br><strong>Display filter (Wireshark)</strong> uses <code>protocol.field operator value</code> dot-notation: <code>ip.addr</code>, <code>tcp.port</code>, <code>http.request</code>. Always uses <code>==</code> / <code>!=</code> / <code>contains</code> operators.<br><br><em>Memory aid: if it has dots and equals signs, it\'s a display filter. If it reads like plain English qualifiers, it\'s BPF.</em>',
          example: 'BPF:     host 10.0.0.5\nDisplay: ip.addr == 10.0.0.5\n\nBPF:     tcp port 443\nDisplay: tcp.port == 443\n\nBPF:     not arp\nDisplay: !arp'
        },
        {
          title: 'Where each filter goes',
          body: '<strong>BPF filters</strong> are typed at the command line after <code>tcpdump</code> or in Wireshark\'s Capture Options dialog. They run DURING capture — the kernel drops non-matching packets before they reach the application.<br><br><strong>Display filters</strong> are typed in Wireshark\'s green filter bar at the top. They run AFTER capture — all packets are captured, but only matching ones are shown. This means you can change display filters without re-capturing.<br><br>Wireshark supports BOTH types — but in different places. That dual support is why the confusion exists.',
          example: 'tcpdump command line:     tcpdump -i eth0 \'tcp port 80\'\nWireshark capture dialog:  tcp port 80          (same BPF)\nWireshark filter bar:      tcp.port == 80       (display filter)'
        },
        {
          title: 'Common queries in both syntaxes',
          body: 'Below is the side-by-side cheatsheet. For the exam, focus on being able to <strong>identify</strong> which syntax is which — not memorize every filter. If you see dots and <code>==</code>, it\'s display. If you see bare <code>host</code>/<code>port</code>/<code>net</code>, it\'s BPF.'
        },
        {
          title: 'Side-by-side comparison + cheatsheet',
          body: 'The complete comparison table. <strong>Same query, two syntaxes.</strong> This is the core exam skill — recognizing which belongs where.'
        }
      ],
      cheatsheet: [
        { pattern: 'Traffic to/from an IP', desc: 'BPF: host 10.0.0.5 | Display: ip.addr == 10.0.0.5' },
        { pattern: 'Source IP only', desc: 'BPF: src host 10.0.0.5 | Display: ip.src == 10.0.0.5' },
        { pattern: 'Destination port', desc: 'BPF: dst port 443 | Display: tcp.dstport == 443' },
        { pattern: 'Any traffic on a port', desc: 'BPF: port 53 | Display: tcp.port == 53 or udp.port == 53' },
        { pattern: 'Protocol only', desc: 'BPF: arp | Display: arp (boolean field — no operator needed)' },
        { pattern: 'Exclude a protocol', desc: 'BPF: not arp | Display: !arp' },
        { pattern: 'HTTP requests', desc: 'BPF: tcp port 80 | Display: http.request' },
        { pattern: 'Boolean combo', desc: 'BPF: host X and port 80 | Display: ip.addr == X and tcp.port == 80' }
      ]
    }
  ];
  
  // ── Network Analysis Drill — module state + renderers ──
  let _naActiveTab = 'practice';     // 'practice' | 'lessons' | 'dashboard'
  let _naActiveCategory = null;       // null = all, or one of NA_CATEGORIES
  let _naActiveLesson = null;         // currently-open lesson id
  let _naActiveLessonStep = 0;        // 0-indexed step within active lesson
  let _naCurrentQuestion = null;      // currently-rendered Q for the practice flow
  let _naQuestionAnswered = false;    // toggles between pristine / revealed states
  
  function naGetMastery() {
    try {
      var m = JSON.parse(localStorage.getItem(STORAGE.NA_MASTERY) || 'null') || _naInitMastery();
      // Backfill any categories added after the user's data was first created (e.g. 'filter' in v4.85.0)
      NA_CATEGORIES.forEach(function(c) { if (!m[c]) m[c] = { right: 0, total: 0 }; });
      return m;
    }
    catch { return _naInitMastery(); }
  }
  function _naInitMastery() {
    const m = {};
    NA_CATEGORIES.forEach(c => { m[c] = { right: 0, total: 0 }; });
    return m;
  }
  function naSaveMastery(m) {
    try { localStorage.setItem(STORAGE.NA_MASTERY, JSON.stringify(m)); _cloudFlush(STORAGE.NA_MASTERY); } catch {}
  }
  function naGetLessonProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE.NA_LESSONS) || '{}') || {}; }
    catch { return {}; }
  }
  function naSaveLessonProgress(p) {
    try { localStorage.setItem(STORAGE.NA_LESSONS, JSON.stringify(p)); _cloudFlush(STORAGE.NA_LESSONS); } catch {}
  }
  
  // Entry point removed — now lives in the registered enter() at module bottom
  // and is invoked by the shell's startNetworkAnalysisDrill lazy-load wrapper.
  // Original body kept verbatim in window._certanvilFeatures registration.

  function naSetTab(tabId) {
    _naActiveTab = tabId;
    ['practice', 'lessons', 'dashboard'].forEach(t => {
      const tab = document.getElementById('na-tab-' + t);
      if (tab) tab.classList.toggle('is-hidden', t !== tabId);
      const btn = document.getElementById('na-tab-btn-' + t);
      if (btn) btn.classList.toggle('na-tab-active', t === tabId);
    });
    if (tabId === 'practice') naRenderPractice();
    if (tabId === 'lessons') naRenderLessonsIndex();
    if (tabId === 'dashboard') naRenderDashboard();
  }
  
  // Pick the next question — biased toward the user's weakest category if any
  // data exists, else random.
  function _naPickNextQuestion(forceCategory) {
    const m = naGetMastery();
    let pool = NETWORK_ANALYSIS_BANK;
    if (forceCategory) {
      pool = pool.filter(q => q.category === forceCategory);
    } else {
      // Weighted: weakest category gets 2x weight, next 1.5x, rest 1x.
      const stats = NA_CATEGORIES.map(c => ({
        cat: c,
        pct: m[c].total > 0 ? m[c].right / m[c].total : -1, // -1 = never tried (highest priority)
        total: m[c].total
      })).sort((a, b) => {
        if (a.pct === -1 && b.pct !== -1) return -1;
        if (b.pct === -1 && a.pct !== -1) return 1;
        return a.pct - b.pct;
      });
      const weights = [3, 2, 1, 1];
      const weighted = [];
      stats.forEach((s, i) => {
        const w = weights[i] || 1;
        const matching = pool.filter(q => q.category === s.cat);
        for (let k = 0; k < w; k++) weighted.push(...matching);
      });
      pool = weighted;
    }
    if (pool.length === 0) pool = NETWORK_ANALYSIS_BANK;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  
  function naRenderPractice() {
    const host = document.getElementById('na-practice-host');
    if (!host) return;
    if (!_naCurrentQuestion) {
      _naCurrentQuestion = _naPickNextQuestion(_naActiveCategory);
      _naQuestionAnswered = false;
    }
    const q = _naCurrentQuestion;
    const m = naGetMastery();
    const totalDone = NA_CATEGORIES.reduce((s, c) => s + m[c].total, 0);
    const totalRight = NA_CATEGORIES.reduce((s, c) => s + m[c].right, 0);
    const sessionPct = totalDone > 0 ? Math.round((totalRight / totalDone) * 100) : 0;
  
    const catLabel = NA_CATEGORY_LABELS[q.category] || q.category;
    const outputBlock = q.output ? `<pre class="na-output-block na-output-${escHtml(q.outputType || 'tcpdump')}">${_naFormatOutput(q.output, q.outputType)}</pre>` : '';
  
    const optionsHtml = ['A', 'B', 'C', 'D'].map(letter => {
      const text = q.options[letter];
      let cls = 'na-option';
      if (_naQuestionAnswered) {
        const isPicked = _naCurrentQuestion._userPick === letter;
        const isCorrect = letter === q.answer;
        if (isPicked && isCorrect) cls += ' is-correct';
        else if (isPicked && !isCorrect) cls += ' is-wrong';
        else if (isCorrect) cls += ' is-reveal-correct';
        else cls += ' is-dimmed';
      }
      const onclickAttr = _naQuestionAnswered ? '' : ` onclick="naSubmitAnswer('${letter}')"`;
      return `<button class="${cls}"${onclickAttr}><span class="na-option-letter">${letter}</span><span class="na-option-text">${text}</span></button>`;
    }).join('');
  
    const explanationHtml = _naQuestionAnswered ? `
      <div class="na-explanation ${_naCurrentQuestion._userPick === q.answer ? 'is-correct' : 'is-wrong'}">
        <div class="na-exp-label">${_naCurrentQuestion._userPick === q.answer ? '✓ Correct' : '✗ Wrong — correct answer: ' + q.answer}</div>
        <div class="na-exp-text">${q.explanation}</div>
      </div>
      <div class="na-next-row"><button class="btn btn-primary" onclick="naNextQuestion()">Next →</button></div>
    ` : '';
  
    host.innerHTML = `
      <div class="na-question-card">
        <div class="na-q-meta">
          <span class="na-q-num">Session: ${totalRight}/${totalDone} (${sessionPct}%)</span>
          <span class="na-cat-badge">${escHtml(catLabel)}</span>
          <span class="na-diff-badge na-diff-${q.difficulty.toLowerCase().replace(/[^a-z]/g, '')}">${escHtml(q.difficulty)}</span>
        </div>
        <div class="na-q-stem">${q.question}</div>
        ${outputBlock}
        <div class="na-options">${optionsHtml}</div>
        ${explanationHtml}
      </div>
    `;
  }
  
  // Lightweight syntax highlighting for the output block. Styles already
  // defined in CSS (na-out-time / na-out-ip / na-out-port / na-out-flag /
  // na-out-comment). Aggressive regex but operates on small snippets.
  function _naFormatOutput(raw, outputType) {
    let html = escHtml(raw);
    // Timestamps: HH:MM:SS.fffff
    html = html.replace(/(\d{2}:\d{2}:\d{2}\.\d{3,6})/g, '<span class="na-out-time">$1</span>');
    // IP addresses (loose match — won't capture IPv6 fully but fine for v1)
    html = html.replace(/(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)/g, '<span class="na-out-ip">$1</span>');
    // Port numbers (after colon or dot following an IP — already partially highlighted)
    html = html.replace(/(<span class="na-out-ip">[\d.]+<\/span>)\.(\d+)/g, '$1.<span class="na-out-port">$2</span>');
    // TCP flags: [S], [.], [S.], [F.], [P.], [R.], [F], [R], [P]
    html = html.replace(/\[([SRPFAU.]+)\]/g, '[<span class="na-out-flag">$1</span>]');
    // Comments after #
    html = html.replace(/(\s+#[^\n]*)/g, '<span class="na-out-comment">$1</span>');
    return html;
  }
  
  function naSubmitAnswer(letter) {
    if (_naQuestionAnswered || !_naCurrentQuestion) return;
    _naCurrentQuestion._userPick = letter;
    _naQuestionAnswered = true;
    const q = _naCurrentQuestion;
    const isRight = letter === q.answer;
    // Update mastery
    const m = naGetMastery();
    if (!m[q.category]) m[q.category] = { right: 0, total: 0 };
    m[q.category].total = (m[q.category].total || 0) + 1;
    if (isRight) m[q.category].right = (m[q.category].right || 0) + 1;
    naSaveMastery(m);
    // Re-render practice card with revealed state
    naRenderPractice();
  }
  
  function naNextQuestion() {
    _naCurrentQuestion = _naPickNextQuestion(_naActiveCategory);
    _naQuestionAnswered = false;
    naRenderPractice();
  }
  
  function naSetCategory(cat) {
    _naActiveCategory = cat;
    _naCurrentQuestion = null;
    naSetTab('practice');
  }
  
  function naRenderDashboard() {
    const host = document.getElementById('na-dashboard-host');
    if (!host) return;
    const m = naGetMastery();
    // Find weakest (lowest acc with at least 1 attempt)
    let weakest = null;
    let weakestPct = 1.01;
    NA_CATEGORIES.forEach(c => {
      if (m[c].total > 0) {
        const pct = m[c].right / m[c].total;
        if (pct < weakestPct) { weakestPct = pct; weakest = c; }
      }
    });
  
    const calloutHtml = weakest ? `
      <div class="na-dash-callout">
        <div>
          <div class="na-dash-eyebrow">Weakest area</div>
          <div class="na-dash-headline">${escHtml(NA_CATEGORY_LABELS[weakest])}</div>
          <div class="na-dash-sub">${Math.round(weakestPct * 100)}% accuracy across ${m[weakest].total} attempts</div>
        </div>
        <button class="btn btn-primary" onclick="naSetCategory('${weakest}')">Drill this →</button>
      </div>
    ` : `
      <div class="na-dash-callout">
        <div>
          <div class="na-dash-eyebrow">First time?</div>
          <div class="na-dash-headline">Start with Practice</div>
          <div class="na-dash-sub">Mixed-mode picks from all 5 categories. Returns here after a few attempts to show your weakest area.</div>
        </div>
        <button class="btn btn-primary" onclick="naSetCategory(null)">Start practice →</button>
      </div>
    `;
  
    const cardsHtml = NA_CATEGORIES.map(c => {
      const stat = m[c] || { right: 0, total: 0 };
      const pct = stat.total > 0 ? Math.round((stat.right / stat.total) * 100) : 0;
      const tier = stat.total === 0 ? 'empty' : pct >= 80 ? 'high' : pct >= 60 ? 'mid' : 'low';
      const tierLabel = stat.total === 0 ? 'Not started' : (c === weakest ? pct + '% mastery · weakest' : pct + '% mastery');
      return `
        <div class="na-cat-card" onclick="naSetCategory('${c}')">
          <div class="na-cat-head">
            <span class="na-cat-name">${escHtml(NA_CATEGORY_LABELS[c])}</span>
            <span class="na-cat-attempts">${stat.total} attempts</span>
          </div>
          <div class="na-cat-bar"><div class="na-cat-bar-fill na-cat-${tier}" style="width:${pct}%"></div></div>
          <span class="na-cat-pct na-cat-${tier}">${tierLabel}</span>
        </div>
      `;
    }).join('');
  
    host.innerHTML = calloutHtml + '<div class="na-cat-grid">' + cardsHtml + '</div>';
  }
  
  function naRenderLessonsIndex() {
    const host = document.getElementById('na-lessons-host');
    if (!host) return;
    const progress = naGetLessonProgress();
    if (_naActiveLesson) {
      naRenderLesson(_naActiveLesson);
      return;
    }
    const html = NETWORK_ANALYSIS_LESSONS.map((l, i) => {
      const p = progress[l.id] || {};
      const stepCount = l.steps.length;
      const lastStep = p.stepIdx || 0;
      const completed = p.completed === true;
      const progLabel = completed ? '✓ Completed' : lastStep > 0 ? `Step ${lastStep + 1} of ${stepCount}` : `${stepCount} steps`;
      return `
        <button class="na-lesson-tile" onclick="naOpenLesson('${l.id}')">
          <div class="na-lesson-tile-num">Lesson ${i + 1}</div>
          <div class="na-lesson-tile-title">${escHtml(l.title)}</div>
          <div class="na-lesson-tile-sub">${escHtml(l.subtitle)}</div>
          <div class="na-lesson-tile-progress">${progLabel}</div>
        </button>
      `;
    }).join('');
    host.innerHTML = '<div class="na-lessons-grid">' + html + '</div>';
  }
  
  function naOpenLesson(lessonId) {
    // Tolerate "1" / 1 shorthand for first lesson (per the v4.81.10 fix pattern)
    if ((lessonId === 1 || lessonId === '1') && NETWORK_ANALYSIS_LESSONS[0]) lessonId = NETWORK_ANALYSIS_LESSONS[0].id;
    _naActiveLesson = lessonId;
    const progress = naGetLessonProgress();
    _naActiveLessonStep = (progress[lessonId] && progress[lessonId].stepIdx) || 0;
    naRenderLesson(lessonId);
  }
  
  function naCloseLesson() {
    _naActiveLesson = null;
    _naActiveLessonStep = 0;
    naRenderLessonsIndex();
  }
  
  function naLessonStepNext() {
    if (!_naActiveLesson) return;
    const lesson = NETWORK_ANALYSIS_LESSONS.find(l => l.id === _naActiveLesson);
    if (!lesson) return;
    if (_naActiveLessonStep < lesson.steps.length - 1) {
      _naActiveLessonStep++;
      const progress = naGetLessonProgress();
      progress[_naActiveLesson] = progress[_naActiveLesson] || {};
      progress[_naActiveLesson].stepIdx = _naActiveLessonStep;
      naSaveLessonProgress(progress);
      naRenderLesson(_naActiveLesson);
    } else {
      // Last step — mark completed and return to index
      const progress = naGetLessonProgress();
      progress[_naActiveLesson] = { stepIdx: lesson.steps.length - 1, completed: true };
      naSaveLessonProgress(progress);
      _naActiveLesson = null;
      _naActiveLessonStep = 0;
      naRenderLessonsIndex();
    }
  }
  
  function naLessonStepPrev() {
    if (_naActiveLessonStep > 0) {
      _naActiveLessonStep--;
      naRenderLesson(_naActiveLesson);
    }
  }
  
  function naRenderLesson(lessonId) {
    const host = document.getElementById('na-lessons-host');
    if (!host) return;
    const lesson = NETWORK_ANALYSIS_LESSONS.find(l => l.id === lessonId);
    if (!lesson) return;
    const stepIdx = _naActiveLessonStep;
    const step = lesson.steps[stepIdx];
    const isLastStep = stepIdx === lesson.steps.length - 1;
  
    const stepProgressHtml = lesson.steps.map((_, i) => {
      let cls = 'na-step-pip';
      if (i < stepIdx) cls += ' done';
      else if (i === stepIdx) cls += ' current';
      return `<div class="${cls}"></div>`;
    }).join('');
  
    const exampleHtml = step.example ? `<pre class="na-step-example">${escHtml(step.example)}</pre>` : '';
  
    const cheatsheetHtml = isLastStep && lesson.cheatsheet ? `
      <div class="na-cheat-table">
        <div class="na-cheat-head">Quick reference</div>
        ${lesson.cheatsheet.map(row => `
          <div class="na-cheat-row">
            <span class="na-cheat-pattern">${escHtml(row.pattern)}</span>
            <span class="na-cheat-desc">${escHtml(row.desc)}</span>
          </div>
        `).join('')}
      </div>
    ` : '';
  
    host.innerHTML = `
      <div class="na-lesson-card">
        <button class="na-back-btn" onclick="naCloseLesson()">← All lessons</button>
        <div class="na-lesson-eyebrow">Lesson · ${escHtml(lesson.id)}</div>
        <div class="na-lesson-title">${escHtml(lesson.title)}</div>
        <div class="na-lesson-sub">${escHtml(lesson.subtitle)}</div>
        <div class="na-step-progress">${stepProgressHtml}</div>
        <div class="na-step-card">
          <div class="na-step-num">Step ${stepIdx + 1} of ${lesson.steps.length}</div>
          <div class="na-step-h3">${escHtml(step.title)}</div>
          <div class="na-step-body">${step.body}</div>
          ${exampleHtml}
        </div>
        ${cheatsheetHtml}
        <div class="na-lesson-cta-row">
          <button class="btn btn-ghost" onclick="naLessonStepPrev()" ${stepIdx === 0 ? 'disabled' : ''}>← Prev</button>
          <button class="btn btn-primary" onclick="naLessonStepNext()">${isLastStep ? 'Finish lesson' : 'Next step →'}</button>
        </div>
      </div>
    `;
  }

  // ── Expose to window so onclick handlers in rendered HTML find them ──
  window.naSetTab = naSetTab;
  window.naSubmitAnswer = naSubmitAnswer;
  window.naNextQuestion = naNextQuestion;
  window.naSetCategory = naSetCategory;
  window.naOpenLesson = naOpenLesson;
  window.naCloseLesson = naCloseLesson;
  window.naLessonStepNext = naLessonStepNext;
  window.naLessonStepPrev = naLessonStepPrev;

  // ── Register feature module entry point ──
  // Shell calls window._certanvilFeatures["network-analysis"].enter() after
  // lazy-load completes. Same contract as future features (PHT, IRW, etc.).
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures["network-analysis"] = {
    enter: function() {
      // Same body as the original startNetworkAnalysisDrill at app.js:12119.
      showPage("network-analysis");
      var m = naGetMastery();
      var totalAttempts = NA_CATEGORIES.reduce(function(s, c) { return s + (m[c].total || 0); }, 0);
      naSetTab(totalAttempts > 0 ? "dashboard" : "practice");
    },
    leave: function() {
      // Reset module state on page-leave so next entry feels fresh.
      _naCurrentQuestion = null;
      _naQuestionAnswered = false;
      _naActiveLesson = null;
      _naActiveLessonStep = 0;
    },
  };
})();

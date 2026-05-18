// ════════════════════════════════════════════════════════════════════
// features/port-drill.js — Phase 11b feature module (v4.99.38)
// ════════════════════════════════════════════════════════════════════
//
// Extracted from app.js lines 28666-29932 (Port Mastery feature, ~1,267 LOC).
// Lazy-loaded on first navigation to #page-ports. Saves ~50 KB transfer
// from the shell on first paint.
//
// Contains: portData (TCP/UDP port catalog), securePairs (insecure→secure
// protocol pairs), PT_CATEGORIES + PORT_MNEMONICS + PORT_LESSONS data,
// 38 pt* functions for the timed drill engine + lesson rendering.
//
// PT_CATEGORIES is THIS feature, not Packet Trace (which uses ptr* prefix
// + lives separately, still in shell). The pt* prefix is overloaded —
// it means "port timer" here, not "packet trace".
// ════════════════════════════════════════════════════════════════════

(function() {
  "use strict";

  // ══════════════════════════════════════════
  // FEATURE 2: PORT MASTERY (revamped v4.36.0)
  // ══════════════════════════════════════════
  const portData = [
    {proto:'FTP Data',port:'20',tp:'TCP'},{proto:'FTP Control',port:'21',tp:'TCP'},{proto:'SSH',port:'22',tp:'TCP'},
    {proto:'Telnet',port:'23',tp:'TCP'},{proto:'SMTP',port:'25',tp:'TCP'},{proto:'DNS',port:'53',tp:'TCP/UDP'},
    {proto:'DHCP Server',port:'67',tp:'UDP'},{proto:'DHCP Client',port:'68',tp:'UDP'},{proto:'TFTP',port:'69',tp:'UDP'},
    {proto:'HTTP',port:'80',tp:'TCP'},{proto:'Kerberos',port:'88',tp:'TCP/UDP'},{proto:'POP3',port:'110',tp:'TCP'},
    {proto:'NTP',port:'123',tp:'UDP'},{proto:'IMAP',port:'143',tp:'TCP'},{proto:'SNMP',port:'161',tp:'UDP'},
    {proto:'SNMP Trap',port:'162',tp:'UDP'},{proto:'LDAP',port:'389',tp:'TCP'},{proto:'HTTPS',port:'443',tp:'TCP'},
    {proto:'SMB',port:'445',tp:'TCP'},{proto:'Syslog',port:'514',tp:'UDP'},{proto:'SMTP TLS',port:'587',tp:'TCP'},
    {proto:'LDAPS',port:'636',tp:'TCP'},{proto:'iSCSI',port:'3260',tp:'TCP'},{proto:'TACACS+',port:'49',tp:'TCP'},
    {proto:'BGP',port:'179',tp:'TCP'},{proto:'RADIUS Auth',port:'1812',tp:'UDP'},{proto:'RADIUS Acct',port:'1813',tp:'UDP'},
    {proto:'MySQL',port:'3306',tp:'TCP'},{proto:'RDP',port:'3389',tp:'TCP'},{proto:'SIP',port:'5060',tp:'UDP'},
    {proto:'SIP TLS',port:'5061',tp:'TCP'},{proto:'IKE/IPsec',port:'500',tp:'UDP'},{proto:'L2TP',port:'1701',tp:'UDP'},
    {proto:'OpenVPN',port:'1194',tp:'UDP'},{proto:'NFS',port:'2049',tp:'TCP/UDP'},{proto:'FTPS',port:'990',tp:'TCP'},
    {proto:'NetBIOS Name',port:'137',tp:'UDP'},{proto:'NetBIOS Session',port:'139',tp:'TCP'},
    {proto:'IPsec NAT-T',port:'4500',tp:'UDP'},{proto:'VNC',port:'5900',tp:'TCP'}
  ];
  
  const securePairs = [
    { insecure: { proto: 'HTTP',   port: '80',  tp: 'TCP' }, secure: { proto: 'HTTPS',           port: '443', tp: 'TCP' } },
    { insecure: { proto: 'FTP',    port: '21',  tp: 'TCP' }, secure: { proto: 'FTPS',            port: '990', tp: 'TCP' }, qualifier: 'over SSL/TLS', siblingProto: 'SFTP' },
    { insecure: { proto: 'FTP',    port: '21',  tp: 'TCP' }, secure: { proto: 'SFTP',            port: '22',  tp: 'TCP' }, qualifier: 'over SSH',     siblingProto: 'FTPS' },
    { insecure: { proto: 'Telnet', port: '23',  tp: 'TCP' }, secure: { proto: 'SSH',             port: '22',  tp: 'TCP' } },
    { insecure: { proto: 'SMTP',   port: '25',  tp: 'TCP' }, secure: { proto: 'SMTPS',           port: '465', tp: 'TCP' }, qualifier: 'with implicit TLS', siblingProto: 'SMTP submission (STARTTLS)' },
    { insecure: { proto: 'SMTP',   port: '25',  tp: 'TCP' }, secure: { proto: 'SMTP submission (STARTTLS)', port: '587', tp: 'TCP' }, qualifier: 'using STARTTLS submission', siblingProto: 'SMTPS' },
    { insecure: { proto: 'LDAP',   port: '389', tp: 'TCP' }, secure: { proto: 'LDAPS',           port: '636', tp: 'TCP' } },
    { insecure: { proto: 'POP3',   port: '110', tp: 'TCP' }, secure: { proto: 'POP3S',           port: '995', tp: 'TCP' } },
    { insecure: { proto: 'IMAP',   port: '143', tp: 'TCP' }, secure: { proto: 'IMAPS',           port: '993', tp: 'TCP' } }
  ];
  
  // ── Port Mastery: categories, mnemonics, lessons ──
  const PT_CATEGORIES = [
    { id: 'web',       label: 'Web',              icon: '\uD83C\uDF10', color: '#60a5fa', protos: ['HTTP','HTTPS'] },
    { id: 'email',     label: 'Email',            icon: '\uD83D\uDCE7', color: '#f472b6', protos: ['SMTP','POP3','IMAP','SMTP TLS'] },
    { id: 'file',      label: 'File Transfer',    icon: '\uD83D\uDCC1', color: '#fb923c', protos: ['FTP Data','FTP Control','TFTP','FTPS','SMB','NFS','iSCSI'] },
    { id: 'remote',    label: 'Remote Access',    icon: '\uD83D\uDDA5\uFE0F', color: '#a78bfa', protos: ['SSH','Telnet','RDP','VNC'] },
    { id: 'name',      label: 'Name / Time',      icon: '\uD83D\uDD70\uFE0F', color: '#38bdf8', protos: ['DNS','NTP','NetBIOS Name','NetBIOS Session'] },
    { id: 'config',    label: 'Network Config',   icon: '\u2699\uFE0F',  color: '#34d399', protos: ['DHCP Server','DHCP Client'] },
    { id: 'auth',      label: 'Directory & Auth', icon: '\uD83D\uDD11', color: '#fbbf24', protos: ['Kerberos','LDAP','LDAPS','TACACS+','RADIUS Auth','RADIUS Acct'] },
    { id: 'mgmt',      label: 'Management',       icon: '\uD83D\uDCCA', color: '#4ade80', protos: ['SNMP','SNMP Trap','Syslog'] },
    { id: 'routing',   label: 'Routing',          icon: '\uD83D\uDEA6', color: '#e879f9', protos: ['BGP'] },
    { id: 'db',        label: 'Database & Secure',icon: '\uD83D\uDDC4\uFE0F', color: '#f87171', protos: ['MySQL'] },
    { id: 'voip',      label: 'VoIP',             icon: '\uD83D\uDCDE', color: '#2dd4bf', protos: ['SIP','SIP TLS'] },
    { id: 'vpn',       label: 'VPN / Tunneling',  icon: '\uD83D\uDD12', color: '#818cf8', protos: ['IKE/IPsec','L2TP','OpenVPN','IPsec NAT-T'] }
  ];
  const PT_CAT_IDS = PT_CATEGORIES.map(c => c.id);
  const _ptCatByProto = {};
  PT_CATEGORIES.forEach(c => c.protos.forEach(p => { _ptCatByProto[p] = c; }));
  function ptCatOf(proto) { return _ptCatByProto[proto] || PT_CATEGORIES[0]; }
  
  const PORT_MNEMONICS = {
    'FTP Data':    'FTP Data = 20. Think "2-0 = data flows"',
    'FTP Control': 'FTP Control = 21. Control channel is always one above data (20+1)',
    'SSH':         'SSH = 22. "Secure Shell, double-two"',
    'Telnet':      'Telnet = 23. One above SSH (22+1), and less secure',
    'SMTP':        'SMTP = 25. "Send Mail To People" — 25 letters in that phrase (roughly!)',
    'TACACS+':     'TACACS+ = 49. Think "4-9, the Cisco way"',
    'DNS':         'DNS = 53. "Five-Three, DNS is the key"',
    'DHCP Server': 'DHCP Server = 67. Server listens, client talks back on 68',
    'DHCP Client': 'DHCP Client = 68. Always one above the server (67+1)',
    'TFTP':        'TFTP = 69. "Trivial" — no auth, no frills, just 69',
    'HTTP':        'HTTP = 80. The OG web port — "eighty for the web, baby"',
    'Kerberos':    'Kerberos = 88. "8-8, authenticate"',
    'POP3':        'POP3 = 110. "POP = 1-1-0, download and go"',
    'NTP':         'NTP = 123. "1-2-3, sync the time for me"',
    'IMAP':        'IMAP = 143. Keeps mail on the server — 143 = "I love you" in pager code',
    'SNMP':        'SNMP = 161. Manages network devices — trap replies on 162',
    'SNMP Trap':   'SNMP Trap = 162. One above SNMP (161+1) — traps are alerts going back',
    'BGP':         'BGP = 179. "Border Gateway at 1-7-9"',
    'LDAP':        'LDAP = 389. "3-8-9, directory is fine"',
    'HTTPS':       'HTTPS = 443. "4-4-3, secure HTTP for me"',
    'SMB':         'SMB = 445. File sharing on Windows — "4-4-5, sharing drives"',
    'Syslog':      'Syslog = 514. "5-1-4, log everything more"',
    'SMTP TLS':    'SMTP TLS = 587. Submission port with STARTTLS — "5-8-7, mail to heaven"',
    'LDAPS':       'LDAPS = 636. Secure LDAP — "6-3-6, LDAP with a TLS fix"',
    'FTPS':        'FTPS = 990. FTP over SSL — "9-9-0, secure FTP go"',
    'iSCSI':       'iSCSI = 3260. Block storage over IP — "3-2-6-0, SAN over the network flow"',
    'RADIUS Auth': 'RADIUS Auth = 1812. "The War of 1812 — fighting for authentication"',
    'RADIUS Acct': 'RADIUS Acct = 1813. One above auth (1812+1) — accounting follows auth',
    'MySQL':       'MySQL = 3306. "3-3-0-6, database picks"',
    'RDP':         'RDP = 3389. "3-3-8-9, remote desktop time"',
    'SIP':         'SIP = 5060. VoIP signaling — "5-0-6-0, SIP says hello"',
    'SIP TLS':     'SIP TLS = 5061. Secure SIP — one above regular (5060+1)',
    'IKE/IPsec':   'IKE/IPsec = 500. "5-0-0, VPN tunnel through"',
    'L2TP':        'L2TP = 1701. "1-7-0-1, Layer 2 tunneling done"',
    'OpenVPN':     'OpenVPN = 1194. "1-1-9-4, open VPN at the door"',
    'NFS':         'NFS = 2049. Network File System — "2-0-4-9, Unix shares are fine"',
    'NetBIOS Name':'NetBIOS Name = 137. Legacy Windows naming — the "1-3-7" trio starts here',
    'NetBIOS Session':'NetBIOS Session = 139. NetBIOS sessions — "1-3-9, connect in time"',
    'IPsec NAT-T': 'IPsec NAT-T = 4500. NAT traversal for IPsec — "4-5-0-0, NAT lets VPN through"',
    'VNC':         'VNC = 5900. Screen sharing — "5-9-0-0, VNC in view"'
  };
  
  const PORT_LESSONS = [
    { id: 'web', title: 'Web Protocols', icon: '\uD83C\uDF10', catId: 'web', desc: 'HTTP (port 80) and HTTPS (port 443).',
      theory: [
        '<strong>HTTP (Port 80/TCP)</strong> — HyperText Transfer Protocol. The original web protocol. Sends data in cleartext — anyone on the network can read it. Uses request-response model: client sends GET/POST, server replies with status code (200 OK, 404 Not Found, 301 Redirect).',
        '<strong>HTTPS (Port 443/TCP)</strong> — HTTP over TLS. Encrypts the entire HTTP session. The browser verifies the server\'s certificate via PKI (chain of trust: leaf cert → intermediate CA → root CA). TLS 1.3 is the current standard. Look for the padlock icon.',
        '<strong>Exam tip:</strong> HTTP = 80, HTTPS = 443. HTTPS uses TLS (not SSL — SSL is deprecated). The exam loves asking about the TLS handshake and certificate chain. Remember: HTTPS = HTTP + TLS on port 443.'
      ] },
    { id: 'email', title: 'Email Pipeline', icon: '\uD83D\uDCE7', catId: 'email', desc: 'How email actually flows from sender to inbox.',
      theory: [
        '<strong>SMTP (Port 25/TCP)</strong> — Simple Mail Transfer Protocol. Used for <em>sending</em> mail between servers (MTA to MTA). Port 25 is the relay port — many ISPs block it to prevent spam.',
        '<strong>SMTP TLS / Submission (Port 587/TCP)</strong> — The port your email client uses to <em>submit</em> outgoing mail to your mail server. Uses STARTTLS to upgrade to encrypted. This is the modern replacement for port 25 on the client side.',
        '<strong>POP3 (Port 110/TCP)</strong> — Post Office Protocol v3. Downloads mail and (by default) deletes from server. Simple but limited — single-device use.',
        '<strong>IMAP (Port 143/TCP)</strong> — Internet Message Access Protocol. Keeps mail on the server, syncs across devices. The modern standard. 143 = "I love you" in pager code — a memory trick.',
        '<strong>Exam tip:</strong> Know the flow: Client sends via 587 (SMTP submission) → server relays via 25 (SMTP) → recipient retrieves via 143 (IMAP) or 110 (POP3). Secure variants: SMTPS=465, POP3S=995, IMAPS=993.'
      ] },
    { id: 'file', title: 'File Transfer', icon: '\uD83D\uDCC1', catId: 'file', desc: 'Every way to move files across a network.',
      theory: [
        '<strong>FTP (Ports 20-21/TCP)</strong> — File Transfer Protocol. Port 21 = control channel (commands), Port 20 = data channel (file content). Active mode: server connects back to client on 20. Passive mode: client connects to a random high port (firewall-friendly).',
        '<strong>TFTP (Port 69/UDP)</strong> — Trivial FTP. No authentication, no encryption, no directory listing. Used for firmware updates, PXE boot, and router config backups. UDP = fast but unreliable.',
        '<strong>FTPS (Port 990/TCP)</strong> — FTP over SSL/TLS (implicit). Wraps FTP in encryption. Don\'t confuse with SFTP (port 22) which is FTP over SSH — completely different protocol.',
        '<strong>SMB (Port 445/TCP)</strong> — Server Message Block. Windows file/printer sharing. The "Network Drive" protocol. Also used by Samba on Linux.',
        '<strong>NFS (Port 2049/TCP/UDP)</strong> — Network File System. Unix/Linux file sharing. NFSv4 consolidated everything onto port 2049.',
        '<strong>iSCSI (Port 3260/TCP)</strong> — Block-level storage over IP. Makes a remote disk appear local. Used in SANs (Storage Area Networks).',
        '<strong>Exam tip:</strong> FTP uses TWO ports (20+21). TFTP is UDP/69. FTPS ≠ SFTP. SMB = Windows, NFS = Unix. iSCSI = SAN over Ethernet.'
      ] },
    { id: 'remote', title: 'Remote Access', icon: '\uD83D\uDDA5\uFE0F', catId: 'remote', desc: 'Controlling machines from a distance.',
      theory: [
        '<strong>SSH (Port 22/TCP)</strong> — Secure Shell. Encrypted remote access. Replaced Telnet for everything. Also provides SFTP (secure file transfer) and SCP (secure copy). Uses public-key authentication.',
        '<strong>Telnet (Port 23/TCP)</strong> — The original remote terminal. Sends everything in <em>cleartext</em> — including passwords. Never use on production networks. Still on the exam because legacy systems exist.',
        '<strong>RDP (Port 3389/TCP)</strong> — Remote Desktop Protocol. Microsoft\'s graphical remote access. Provides full GUI desktop over the network. Commonly targeted by attackers — always secure with NLA.',
        '<strong>VNC (Port 5900/TCP)</strong> — Virtual Network Computing. Platform-independent screen sharing. Uses RFB protocol. Less efficient than RDP but works across OSes.',
        '<strong>Exam tip:</strong> SSH=22 is the secure default for CLI access. Telnet=23 is insecure and deprecated. RDP=3389 is Microsoft-specific GUI. The "secure pair" pattern: Telnet(23) → SSH(22).'
      ] },
    { id: 'name', title: 'Name & Time Services', icon: '\uD83D\uDD70\uFE0F', catId: 'name', desc: 'DNS resolution and time synchronization.',
      theory: [
        '<strong>DNS (Port 53/TCP/UDP)</strong> — Domain Name System. Translates names to IPs. Uses UDP for queries (fast), TCP for zone transfers and large responses (>512 bytes). Recursive: client asks resolver, resolver walks the tree. Iterative: resolver asks root → TLD → authoritative.',
        '<strong>NTP (Port 123/UDP)</strong> — Network Time Protocol. Syncs clocks across machines. Critical for Kerberos (which requires <5 min clock skew), log correlation, and certificate validation. Stratum 0 = atomic clock, Stratum 1 = directly connected.',
        '<strong>NetBIOS Name (Port 137/UDP)</strong> — Legacy Windows naming service. Maps NetBIOS names to IPs on the LAN. Largely replaced by DNS but still tested.',
        '<strong>NetBIOS Session (Port 139/TCP)</strong> — Legacy Windows file sharing sessions. Used by older SMB implementations. Modern SMB uses port 445 directly.',
        '<strong>Exam tip:</strong> DNS=53 uses BOTH TCP and UDP. NTP=123 is UDP only. "1-2-3 sync the time" is your memory trick. NetBIOS 137/139 are legacy but still testable.'
      ] },
    { id: 'config', title: 'Network Configuration', icon: '\u2699\uFE0F', catId: 'config', desc: 'DHCP and automatic network setup.',
      theory: [
        '<strong>DHCP Server (Port 67/UDP)</strong> — Dynamic Host Configuration Protocol. The server listens on port 67. Assigns IP addresses, subnet masks, default gateways, and DNS servers automatically.',
        '<strong>DHCP Client (Port 68/UDP)</strong> — The client sends from port 68. The DORA process: <strong>D</strong>iscover (broadcast "I need an IP") → <strong>O</strong>ffer (server proposes an IP) → <strong>R</strong>equest (client accepts) → <strong>A</strong>ck (server confirms). All using UDP because the client doesn\'t have an IP yet!',
        '<strong>DHCP Relay</strong> — Routers can forward DHCP broadcasts across subnets using the <code>ip helper-address</code> command. Without this, you\'d need a DHCP server on every subnet.',
        '<strong>Exam tip:</strong> Server=67, Client=68. Always a pair. DORA is the four-step handshake. DHCP uses UDP because the client has no IP address to establish a TCP connection. Lease renewal happens at 50% (T1) and 87.5% (T2) of the lease time.'
      ] },
    { id: 'auth', title: 'Directory & Authentication', icon: '\uD83D\uDD11', catId: 'auth', desc: 'AAA frameworks and directory services.',
      theory: [
        '<strong>Kerberos (Port 88/TCP/UDP)</strong> — Ticket-based authentication. Used by Active Directory. Flow: client → KDC for TGT (Ticket Granting Ticket) → KDC for service ticket → target server. Requires synchronized clocks (<5 min skew).',
        '<strong>LDAP (Port 389/TCP)</strong> — Lightweight Directory Access Protocol. Queries directory services (Active Directory, OpenLDAP). Organizes data in a tree: DC=example,DC=com → OU=Users → CN=John.',
        '<strong>LDAPS (Port 636/TCP)</strong> — LDAP over SSL/TLS. Encrypts the directory queries. The secure version of 389.',
        '<strong>TACACS+ (Port 49/TCP)</strong> — Cisco\'s AAA protocol. Encrypts the <em>entire</em> packet payload. Separates authentication, authorization, and accounting. TCP-based for reliability.',
        '<strong>RADIUS Auth (Port 1812/UDP)</strong> — Remote Authentication Dial-In User Service. Industry standard AAA. Only encrypts the password, not the full payload. UDP-based.',
        '<strong>RADIUS Acct (Port 1813/UDP)</strong> — RADIUS accounting — tracks session data (duration, bytes). One port above auth (1812+1).',
        '<strong>Exam tip:</strong> TACACS+ (49/TCP) encrypts everything, RADIUS (1812/UDP) only encrypts passwords. TACACS+=Cisco, RADIUS=industry standard. "War of 1812" = RADIUS auth port.'
      ] },
    { id: 'mgmt', title: 'Network Management', icon: '\uD83D\uDCCA', catId: 'mgmt', desc: 'Monitoring and logging your network.',
      theory: [
        '<strong>SNMP (Port 161/UDP)</strong> — Simple Network Management Protocol. Polls network devices for status (CPU, bandwidth, errors). Uses community strings for auth (v1/v2c) or username/password (v3). Manager asks, agent responds.',
        '<strong>SNMP Trap (Port 162/UDP)</strong> — Unsolicited alert FROM the device TO the manager. "Something happened!" — link down, high CPU, fan failure. One above SNMP (161+1).',
        '<strong>Syslog (Port 514/UDP)</strong> — Centralized logging. Devices send log messages to a syslog server. 8 severity levels: 0=Emergency to 7=Debug. "Every Awesome Cisco Engineer Will Need Icecream Daily" (Emerg/Alert/Crit/Error/Warning/Notice/Info/Debug).',
        '<strong>Exam tip:</strong> SNMP v3 adds encryption + authentication (v1/v2c are cleartext). SNMP=161 (query), SNMP Trap=162 (alert). Syslog=514/UDP. Know the 8 severity levels.'
      ] },
    { id: 'routing', title: 'Routing Protocols', icon: '\uD83D\uDEA6', catId: 'routing', desc: 'BGP: the routing protocol between autonomous systems.',
      theory: [
        '<strong>BGP (Port 179/TCP)</strong> — Border Gateway Protocol. The only EGP (Exterior Gateway Protocol) still in use. Routes between autonomous systems (AS). Every ISP, cloud provider, and CDN uses BGP.',
        '<strong>How it works:</strong> BGP peers establish TCP connections on port 179. They exchange route advertisements with AS_PATH attributes. The best path is selected based on shortest AS_PATH, local preference, and other attributes.',
        '<strong>eBGP vs iBGP:</strong> eBGP = between different autonomous systems (TTL=1 by default). iBGP = within the same AS (full mesh or route reflectors required).',
        '<strong>Exam tip:</strong> BGP=179/TCP. It\'s the ONLY port you need for routing protocols on the N10-009 (OSPF, EIGRP, RIP don\'t use well-known ports the exam tests). BGP is a path-vector protocol.'
      ] },
    { id: 'db', title: 'Database & Secure Ports', icon: '\uD83D\uDDC4\uFE0F', catId: 'db', desc: 'Database access and the secure port pattern.',
      theory: [
        '<strong>MySQL (Port 3306/TCP)</strong> — Default port for MySQL and MariaDB database connections. Applications connect here to query data. In the real world, this port should NEVER be exposed to the internet.',
        '<strong>The Secure Port Pattern:</strong> Many insecure protocols have a secure counterpart on a different port. The exam loves testing these pairs:',
        '<code>HTTP(80) → HTTPS(443)</code> · <code>FTP(21) → FTPS(990)</code> · <code>Telnet(23) → SSH(22)</code> · <code>SMTP(25) → SMTPS(465)/Submission(587)</code> · <code>LDAP(389) → LDAPS(636)</code> · <code>POP3(110) → POP3S(995)</code> · <code>IMAP(143) → IMAPS(993)</code> · <code>SIP(5060) → SIPS(5061)</code>',
        '<strong>Exam tip:</strong> When you see a question about "securing" a protocol, think: "same protocol + TLS wrapper on a different port." The secure port is almost always higher than the insecure one.'
      ] },
    { id: 'voip', title: 'Voice over IP', icon: '\uD83D\uDCDE', catId: 'voip', desc: 'SIP call signaling and VoIP.',
      theory: [
        '<strong>SIP (Port 5060/UDP)</strong> — Session Initiation Protocol. Handles VoIP call setup, teardown, and management (INVITE, BYE, REGISTER). SIP is the <em>signaling</em> protocol — it sets up the call but doesn\'t carry the actual voice.',
        '<strong>SIP TLS (Port 5061/TCP)</strong> — Encrypted SIP signaling. One above regular SIP (5060+1). Used when call metadata privacy matters.',
        '<strong>RTP (Real-time Transport Protocol)</strong> — Carries the actual voice/video data. Uses dynamic high ports (typically 16384-32767). Not a well-known port number but important to understand the SIP+RTP relationship.',
        '<strong>Exam tip:</strong> SIP=5060 (signaling, UDP), SIP TLS=5061 (secure signaling, TCP). SIP sets up the call, RTP carries the audio. QoS (DSCP EF marking) prioritizes voice traffic.'
      ] },
    { id: 'vpn', title: 'VPN & Tunneling', icon: '\uD83D\uDD12', catId: 'vpn', desc: 'Encrypted tunnels across untrusted networks.',
      theory: [
        '<strong>IKE/IPsec (Port 500/UDP)</strong> — Internet Key Exchange. The negotiation protocol for IPsec VPNs. Phase 1 establishes the IKE SA (security association), Phase 2 negotiates the IPsec SA for data encryption. IKEv2 is the modern standard.',
        '<strong>IPsec NAT-T (Port 4500/UDP)</strong> — NAT Traversal for IPsec. When either VPN endpoint is behind a NAT device, IPsec can\'t work natively (NAT modifies headers). NAT-T wraps ESP packets in UDP/4500 to traverse NAT.',
        '<strong>L2TP (Port 1701/UDP)</strong> — Layer 2 Tunneling Protocol. Creates the tunnel but provides NO encryption on its own. Always paired with IPsec for security (L2TP/IPsec). The combo uses ports 1701 + 500 + 4500.',
        '<strong>OpenVPN (Port 1194/UDP)</strong> — Open-source VPN using SSL/TLS. Can run on any port but defaults to UDP/1194. Popular for site-to-site and remote access VPNs.',
        '<strong>Exam tip:</strong> IKE=500, NAT-T=4500, L2TP=1701, OpenVPN=1194. L2TP alone has NO encryption — it needs IPsec. IPsec has two modes: transport (encrypts payload) and tunnel (encrypts entire packet).'
      ] }
  ];
  
  // ── Port Mastery state ──
  let ptQ = null, ptIdx = 0, ptCorrect = 0, ptTotal = 0, ptStreak = 0;
  let ptMode = 'drill', ptFocusCat = null, ptTimerInterval = null, ptTimerValue = 30;
  let ptQuestionStartTime = 0, ptActiveLesson = null;
  // Legacy compat — keep these for milestones/analytics
  let portTimer = null, portTimeLeft = PORT_DRILL_SECONDS, portScore = 0, portCurrentQ = null;
  let portMissed = [];
  let portMode = 'timed';
  let portSortMode = 'category';
  
  // ── Port Mastery engine ──
  function getPortMastery() {
    const raw = JSON.parse(localStorage.getItem(STORAGE.PORT_MASTERY) || 'null');
    if (raw && raw.perPort) return raw;
    const m = { currentLevel: 'beginner', totalAnswered: 0, totalCorrect: 0, perPort: {}, perCategory: {} };
    portData.forEach(p => { m.perPort[p.proto] = { seen: 0, correct: 0, box: 1, streak: 0, lastSeen: null }; });
    PT_CATEGORIES.forEach(c => { m.perCategory[c.id] = { seen: 0, correct: 0, box: 1, streak: 0 }; });
    return m;
  }
  function savePortMastery(m) { try { localStorage.setItem(STORAGE.PORT_MASTERY, JSON.stringify(m)); _cloudFlush(STORAGE.PORT_MASTERY); } catch {} }
  
  function updatePortMastery(proto, wasCorrect) {
    const m = getPortMastery();
    const cat = ptCatOf(proto);
    if (!m.perPort[proto]) m.perPort[proto] = { seen: 0, correct: 0, box: 1, streak: 0, lastSeen: null };
    if (!m.perCategory[cat.id]) m.perCategory[cat.id] = { seen: 0, correct: 0, box: 1, streak: 0 };
    const pp = m.perPort[proto];
    const pc = m.perCategory[cat.id];
    pp.seen++; pc.seen++; m.totalAnswered++;
    if (wasCorrect) {
      pp.correct++; pc.correct++; m.totalCorrect++;
      pp.streak++; pc.streak++;
      pp.box = Math.min(5, pp.box + 1);
      if (pc.seen > 0 && pc.correct / pc.seen > 0.8) pc.box = Math.min(5, pc.box + 1);
    } else {
      pp.streak = 0; pc.streak = 0;
      pp.box = 1;
      if (pc.seen > 0 && pc.correct / pc.seen < 0.5) pc.box = 1;
    }
    pp.lastSeen = Date.now();
    m.currentLevel = ptComputeLevel(m);
    savePortMastery(m);
    // Also update legacy PORT_STATS for backward compat
    const stats = getPortStats();
    if (!stats[proto]) stats[proto] = { seen: 0, correct: 0 };
    stats[proto].seen++;
    if (wasCorrect) stats[proto].correct++;
    savePortStats(stats);
  }
  
  function ptComputeLevel(m) {
    const acc = m.totalAnswered > 0 ? m.totalCorrect / m.totalAnswered : 0;
    if (m.totalAnswered >= 400 && acc >= 0.85) return 'expert';
    if (m.totalAnswered >= 200 && acc >= 0.75) return 'advanced';
    if (m.totalAnswered >= 50 && acc >= 0.60) return 'intermediate';
    return 'beginner';
  }
  
  function ptPickPort(focusCat) {
    const m = getPortMastery();
    let pool = portData;
    if (focusCat) {
      const cat = PT_CATEGORIES.find(c => c.id === focusCat);
      if (cat) pool = portData.filter(p => cat.protos.includes(p.proto));
    }
    const weights = pool.map(p => {
      const pp = m.perPort[p.proto];
      if (!pp || pp.seen === 0) return 1.2;
      if (pp.seen < 3) return 1.0;
      const acc = pp.correct / pp.seen;
      // Leitner: lower boxes get higher weight
      const boxW = (6 - (pp.box || 1)) / 5;
      if (acc >= 0.95) return 0.3 + boxW * 0.3;
      if (acc >= 0.85) return 0.7 + boxW * 0.5;
      return 1.0 + ((1 - acc) * 4) + boxW;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  
  function ptPickCategory() {
    const m = getPortMastery();
    const weights = PT_CATEGORIES.map(c => {
      const pc = m.perCategory[c.id];
      if (!pc || pc.seen === 0) return 1.2;
      const acc = pc.correct / pc.seen;
      return 1.0 + ((1 - acc) * 3) + ((6 - (pc.box || 1)) / 5);
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < PT_CATEGORIES.length; i++) { r -= weights[i]; if (r <= 0) return PT_CATEGORIES[i]; }
    return PT_CATEGORIES[PT_CATEGORIES.length - 1];
  }
  
  // ── Legacy compat helpers (still used by milestones, analytics, port reference) ──
  function getPortStats() {
    try { return JSON.parse(localStorage.getItem(STORAGE.PORT_STATS) || '{}'); } catch { return {}; }
  }
  function savePortStats(stats) {
    try { localStorage.setItem(STORAGE.PORT_STATS, JSON.stringify(stats)); } catch {}
  }
  function updatePortStat(proto, wasCorrect) {
    const stats = getPortStats();
    if (!stats[proto]) stats[proto] = { seen: 0, correct: 0 };
    stats[proto].seen++;
    if (wasCorrect) stats[proto].correct++;
    savePortStats(stats);
  }
  function portWeight(proto, stats) {
    const s = stats[proto];
    if (!s || s.seen === 0) return 1.2;
    if (s.seen < 3) return 1.0;
    const accuracy = s.correct / s.seen;
    if (accuracy >= 0.95) return 0.3;
    if (accuracy >= 0.85) return 0.7;
    return 1.0 + ((1 - accuracy) * 4);
  }
  function pickWeightedPort() {
    const stats = getPortStats();
    const weights = portData.map(p => portWeight(p.proto, stats));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < portData.length; i++) { r -= weights[i]; if (r <= 0) return portData[i]; }
    return portData[portData.length - 1];
  }
  function getWeakestPorts(limit = 3) {
    const stats = getPortStats();
    return Object.entries(stats)
      .filter(([, s]) => s.seen >= 3)
      .map(([proto, s]) => ({ proto, accuracy: s.correct / s.seen, seen: s.seen }))
      .filter(x => x.accuracy < 0.85)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, limit);
  }
  function getPortStatsSummary() {
    const stats = getPortStats();
    const entries = Object.values(stats);
    const totalSeen = entries.reduce((a, b) => a + b.seen, 0);
    const totalCorrect = entries.reduce((a, b) => a + b.correct, 0);
    const uniqueSeen = entries.filter(e => e.seen > 0).length;
    return { totalSeen, totalCorrect, overallAccuracy: totalSeen > 0 ? totalCorrect / totalSeen : 0, uniqueSeen, totalPorts: portData.length };
  }
  // v4.62.4: renderPortFocusInfo removed — was a legacy no-op stub with zero callers.
  function resetPortStats() {
    if (!confirm('Reset all port mastery data? Your best score will be kept.')) return;
    try { localStorage.removeItem(STORAGE.PORT_STATS); localStorage.removeItem(STORAGE.PORT_MASTERY); localStorage.removeItem(STORAGE.PORT_LESSONS); } catch {}
    ptRenderDashboard();
  }
  
  // ══════════════════════════════════════════
  // TRY IT IN TERMINAL (v4.16 / #68) — curated shell commands that demo
  // each protocol and each exam topic live. Memorization sticks harder when
  // you've seen the port actually do something once.
  // ══════════════════════════════════════════
  const portCommands = {
    'HTTP':        { cmd: 'curl -I http://example.com',                                     note: 'See the HTTP/1.1 200 status line and server headers.' },
    'HTTPS':       { cmd: 'curl -I https://example.com',                                    note: 'Same request, but over TLS. Watch for HTTP/2 200.' },
    'DNS':         { cmd: 'dig google.com',                                                 note: 'Look at the ANSWER SECTION — that\'s the A record.' },
    'SSH':         { cmd: 'ssh -v user@hostname',                                           note: 'Use -v to watch the key-exchange handshake.' },
    'Telnet':      { cmd: 'nc -zv towel.blinkenlights.nl 23',                               note: 'Telnet is plaintext and mostly dead — check reachability with netcat instead.' },
    'FTP Control': { cmd: 'ftp ftp.gnu.org',                                                note: 'Anonymous FTP. Type ls once connected.' },
    'FTP Data':    { cmd: 'ftp ftp.gnu.org',                                                note: 'FTP opens port 21 for control and port 20 for data transfer.' },
    'SMTP':        { cmd: 'openssl s_client -connect smtp.gmail.com:587 -starttls smtp',    note: 'Port 587 with STARTTLS. Type QUIT to exit.' },
    'SMTP TLS':    { cmd: 'openssl s_client -connect smtp.gmail.com:587 -starttls smtp',    note: 'SMTP submission with STARTTLS upgrade.' },
    'POP3':        { cmd: 'openssl s_client -connect pop.gmail.com:995',                    note: 'POP3S = POP3 over SSL (port 995).' },
    'IMAP':        { cmd: 'openssl s_client -connect imap.gmail.com:993',                   note: 'IMAPS = IMAP over SSL (port 993).' },
    'NTP':         { cmd: 'sntp time.apple.com',                                            note: 'Get the current time from an NTP server. Offset = local clock drift.' },
    'SNMP':        { cmd: 'snmpwalk -v2c -c public demo.snmplabs.com system',               note: 'Walk the system MIB on a public demo SNMP agent.' },
    'LDAP':        { cmd: 'ldapsearch -x -H ldap://ldap.forumsys.com -b dc=example,dc=com', note: 'Anonymous bind to a public LDAP test server.' },
    'LDAPS':       { cmd: 'openssl s_client -connect ldap.google.com:636',                  note: 'TLS-wrapped LDAP. See the cert chain.' },
    'DHCP Client': { cmd: 'ipconfig getpacket en0',                                         note: 'macOS: decode the DHCP packet your client received (lease, gateway, DNS).' },
    'DHCP Server': { cmd: 'ipconfig getpacket en0',                                         note: 'Shows what the DHCP server handed to your client.' },
    'Kerberos':    { cmd: 'nc -zv kerberos.mit.edu 88',                                     note: 'Check reachability on the canonical Kerberos server.' },
    'RDP':         { cmd: 'nc -zv example.com 3389',                                        note: 'Most hosts block 3389 — "Connection refused" is expected.' },
    'MySQL':       { cmd: 'nc -zv localhost 3306',                                          note: 'Check if a local MySQL/MariaDB server is listening.' },
    'VNC':         { cmd: 'nc -zv localhost 5900',                                          note: 'Check if VNC screen-sharing is listening locally.' },
    'SIP':         { cmd: 'nc -zv -u sip.example.com 5060',                                 note: 'SIP signalling on UDP 5060 — the VoIP handshake.' },
    'SIP TLS':     { cmd: 'openssl s_client -connect sip.example.com:5061',                 note: 'TLS-wrapped SIP — handshake visible.' },
    'SMB':         { cmd: 'nc -zv localhost 445',                                           note: 'SMB file sharing (Windows/macOS File Sharing uses this).' },
    'TFTP':        { cmd: 'tftp 192.168.1.1',                                               note: 'Stateless UDP/69 — often used for router firmware. Interactive prompt.' },
    'Syslog':      { cmd: 'logger -p user.info "hello syslog"',                             note: 'Send a message to your local syslog daemon (UDP/514).' },
    'BGP':         { cmd: 'whois -h whois.radb.net AS15169',                                note: 'Query a BGP routing registry for Google\'s ASN.' },
    'FTPS':        { cmd: 'openssl s_client -connect ftp.example.com:990',                  note: 'FTPS = FTP over implicit SSL/TLS.' },
    'OpenVPN':     { cmd: 'nc -zv -u vpn.example.com 1194',                                 note: 'OpenVPN default is UDP/1194.' },
    'IKE/IPsec':   { cmd: 'nc -zv -u vpn.example.com 500',                                  note: 'IKE phase 1 uses UDP/500. NAT-T uses 4500.' },
    'L2TP':        { cmd: 'nc -zv -u vpn.example.com 1701',                                 note: 'L2TP over UDP/1701 — usually paired with IPsec.' },
    'NFS':         { cmd: 'nc -zv nfs-server.example.com 2049',                             note: 'NFSv4 consolidates everything on port 2049.' },
    'iSCSI':       { cmd: 'nc -zv storage.example.com 3260',                                note: 'Block-level storage over IP. Default target port 3260.' },
    'RADIUS Auth': { cmd: 'nc -zv -u radius.example.com 1812',                              note: 'RADIUS auth over UDP/1812. Accounting is 1813.' },
    'RADIUS Acct': { cmd: 'nc -zv -u radius.example.com 1813',                              note: 'RADIUS accounting — separate port from auth (1812).' },
    'IPsec NAT-T': { cmd: 'nc -zv -u vpn.example.com 4500',                                 note: 'NAT traversal lets IPsec punch through NAT using UDP/4500.' },
    'TACACS+':     { cmd: 'nc -zv tacacs.example.com 49',                                   note: 'Cisco AAA — encrypts the full payload, unlike RADIUS.' }
  };
  
  // Topic-level command packs shown inside the Topic Deep Dive panel.
  // Keyed by canonical topic name (topicResources key).
  const topicCommands = {
    'Network Naming (DNS & DHCP)': [
      { cmd: 'dig google.com',        note: 'Basic A record lookup — the most common DNS query.' },
      { cmd: 'dig AAAA google.com',   note: 'IPv6 (quad-A) record.' },
      { cmd: 'dig MX google.com',     note: 'Mail exchanger records — where SMTP delivers for this domain.' },
      { cmd: 'dig +trace google.com', note: 'Walk the recursive resolution chain live: root → .com → Google.' },
      { cmd: 'nslookup google.com',   note: 'Legacy DNS tool — still on the exam.' }
    ],
    'DNS Records & DNSSEC': [
      { cmd: 'dig +dnssec google.com', note: 'Include DNSSEC RRSIG signatures in the answer.' },
      { cmd: 'dig NS google.com',      note: 'Authoritative nameservers for the zone.' },
      { cmd: 'dig TXT google.com',     note: 'TXT records — SPF, DKIM and DMARC live here.' },
      { cmd: 'dig CNAME www.github.com', note: 'Canonical name alias — follow the redirect chain.' }
    ],
    'Network Troubleshooting & Tools': [
      { cmd: 'ping -c 5 1.1.1.1',             note: 'Basic reachability + round-trip time.' },
      { cmd: 'traceroute -I 8.8.8.8',         note: 'ICMP traceroute — some firewalls block the UDP default.' },
      { cmd: 'ping -c 3 -s 1472 -D 1.1.1.1',  note: 'Don\'t-fragment MTU test: 1472 payload + 28 headers = 1500.' },
      { cmd: 'nslookup google.com 1.1.1.1',   note: 'Force a query through Cloudflare instead of your default resolver.' }
    ],
    'CompTIA Troubleshooting Methodology': [
      { cmd: 'ping google.com',       note: 'Step 3 — tests DNS and routing in one shot.' },
      { cmd: 'ping 8.8.8.8',          note: 'Isolates DNS failure from routing failure.' },
      { cmd: 'traceroute google.com', note: 'Step 3 — where does the path break down?' },
      { cmd: 'route -n get default',  note: 'Step 2 — is the default gateway configured correctly?' }
    ],
    'Routing Protocols': [
      { cmd: 'netstat -rn',                      note: 'Your local routing table.' },
      { cmd: 'traceroute 8.8.8.8',               note: 'Watch every router hop — dynamic routing in action.' },
      { cmd: 'whois -h whois.radb.net AS15169',  note: 'BGP routing registry lookup for Google\'s ASN.' }
    ],
    'NAT & IP Services': [
      { cmd: 'ifconfig en0 | grep "inet "', note: 'Your private IP (RFC1918: 10.x / 172.16-31.x / 192.168.x).' },
      { cmd: 'curl ifconfig.me',            note: 'Your public IP — the one your NAT router translates you to.' },
      { cmd: 'curl -4 ifconfig.co',         note: 'Same, forced IPv4.' }
    ],
    'Port Numbers': [
      { cmd: 'netstat -an | grep LISTEN',   note: 'Every port your machine is listening on.' },
      { cmd: 'lsof -i -P -n | grep LISTEN', note: 'Same listing, plus the process name.' },
      { cmd: 'nmap -sT localhost',          note: 'TCP connect scan on yourself — see what\'s open.' }
    ],
    'Subnetting & IP Addressing': [
      { cmd: 'ifconfig en0',               note: 'See your IP and netmask in one place.' },
      { cmd: 'ipcalc 192.168.1.0/24',      note: 'Subnet calculator. Install with brew install ipcalc if missing.' }
    ],
    'Securing TCP/IP': [
      { cmd: 'openssl s_client -connect google.com:443', note: 'Dump the TLS cert chain from a live HTTPS connection.' },
      { cmd: 'curl -vI https://example.com',              note: 'Verbose curl — watch the TLS handshake inline.' }
    ],
    'IPv6': [
      { cmd: 'ifconfig en0 | grep inet6',  note: 'Your link-local and (maybe) global IPv6 addresses.' },
      { cmd: 'dig AAAA google.com',        note: 'Query IPv6 (AAAA) records.' },
      { cmd: 'ping6 google.com',           note: 'Ping over IPv6. Some macOS versions use ping -6.' }
    ],
    'Network Monitoring & Observability': [
      { cmd: 'netstat -s',  note: 'Protocol-level counters (dropped packets, resets, errors).' },
      { cmd: 'lsof -i',     note: 'Every open network connection on your machine.' }
    ],
    'Switch Features & VLANs': [
      { cmd: 'arp -a',                     note: 'Your ARP cache — L2 neighbour discovery.' },
      { cmd: 'ifconfig en0 | grep ether',  note: 'Your MAC address. First 3 bytes = OUI (vendor ID).' }
    ],
    'Wireless Networking': [
      { cmd: 'networksetup -listallhardwareports', note: 'List all network interfaces including Wi-Fi.' },
      { cmd: 'networksetup -getairportnetwork en0', note: 'Current SSID on the Wi-Fi interface.' }
    ],
    'IPsec & VPN Protocols': [
      { cmd: 'nc -zv -u vpn.example.com 500',  note: 'IKE phase 1 — UDP/500.' },
      { cmd: 'nc -zv -u vpn.example.com 4500', note: 'IPsec NAT-T — UDP/4500.' }
    ],
    'TCP/IP Applications': [
      { cmd: 'curl -I https://example.com',      note: 'HTTP/HTTPS — the textbook application-layer protocol.' },
      { cmd: 'dig google.com',                   note: 'DNS — the app that makes every other app work.' },
      { cmd: 'sntp time.apple.com',              note: 'NTP — the app that keeps every clock on the network in sync.' }
    ]
  };
  
  
  // ══════════════════════════════════════════
  // PORT REFERENCE PANEL (v4.11) — studyable cheatsheet of all 40 ports
  // ══════════════════════════════════════════
  const portCategories = [
    { name: 'Web',              protos: ['HTTP','HTTPS'] },
    { name: 'Email',            protos: ['SMTP','POP3','IMAP','SMTP TLS'] },
    { name: 'File Transfer',    protos: ['FTP Data','FTP Control','TFTP','FTPS','SMB','NFS','iSCSI'] },
    { name: 'Remote Access',    protos: ['SSH','Telnet','RDP','VNC'] },
    { name: 'Name / Time',      protos: ['DNS','NTP','NetBIOS Name','NetBIOS Session'] },
    { name: 'Network Config',   protos: ['DHCP Server','DHCP Client'] },
    { name: 'Directory & Auth', protos: ['Kerberos','LDAP','LDAPS','TACACS+','RADIUS Auth','RADIUS Acct'] },
    { name: 'Management',       protos: ['SNMP','SNMP Trap','Syslog'] },
    { name: 'Routing',          protos: ['BGP'] },
    { name: 'Database',         protos: ['MySQL'] },
    { name: 'VoIP',             protos: ['SIP','SIP TLS'] },
    { name: 'VPN / Tunneling',  protos: ['IKE/IPsec','L2TP','OpenVPN','IPsec NAT-T'] },
  ];
  
  function _portCard(p) {
    // portData is static/controlled — no user input, no escaping needed
    const cmdEntry = portCommands[p.proto];
    const hasCmd = !!cmdEntry;
    const cmdRow = hasCmd ? `<div class="port-ref-cmd">
      <code class="port-ref-cmd-text">${escHtml(cmdEntry.cmd)}</code>
      <button type="button" class="port-ref-cmd-copy" onclick="copyCmd(event, '${escHtml(cmdEntry.cmd).replace(/'/g, '&#39;')}')" aria-label="Copy command">Copy</button>
    </div>` : '';
    return `<div class="port-ref-card ${hasCmd ? 'port-ref-card-has-cmd' : ''}" data-proto="${p.proto.toLowerCase()}" data-port="${p.port}">
      <div class="port-ref-card-top">
        <div class="port-ref-num">${p.port}</div>
        <div class="port-ref-meta">
          <div class="port-ref-proto">${p.proto}</div>
          <div class="port-ref-tp">${p.tp}</div>
        </div>
      </div>
      ${cmdRow}
    </div>`;
  }
  
  function renderPortReference() {
    const list = document.getElementById('port-ref-list');
    if (!list) return;
    const byProto = {};
    portData.forEach(p => { byProto[p.proto] = p; });
    let html = '';
    if (portSortMode === 'category') {
      portCategories.forEach(cat => {
        const cards = cat.protos.map(name => byProto[name]).filter(Boolean);
        if (!cards.length) return;
        html += `<div class="port-ref-group"><div class="port-ref-group-head">${cat.name} <span class="port-ref-group-count">${cards.length}</span></div><div class="port-ref-group-cards">${cards.map(_portCard).join('')}</div></div>`;
      });
    } else {
      const sorted = portData.slice();
      if (portSortMode === 'number') {
        sorted.sort((a, b) => parseInt(a.port) - parseInt(b.port));
      } else {
        sorted.sort((a, b) => a.proto.localeCompare(b.proto));
      }
      html = `<div class="port-ref-group-cards">${sorted.map(_portCard).join('')}</div>`;
    }
    list.innerHTML = html;
    filterPortReference();
  }
  
  function setPortSortMode(mode) {
    portSortMode = (mode === 'number' || mode === 'name') ? mode : 'category';
    ['cat','num','name'].forEach(key => {
      const btn = document.getElementById('port-ref-sort-' + key);
      if (!btn) return;
      const active = (key === 'cat' && portSortMode === 'category')
                  || (key === 'num' && portSortMode === 'number')
                  || (key === 'name' && portSortMode === 'name');
      btn.classList.toggle('port-ref-sort-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    renderPortReference();
  }
  
  function filterPortReference() {
    const input = document.getElementById('port-ref-search');
    const q = (input && input.value || '').trim().toLowerCase();
    const cards = document.querySelectorAll('#port-ref-list .port-ref-card');
    cards.forEach(c => {
      const proto = c.getAttribute('data-proto') || '';
      const port = c.getAttribute('data-port') || '';
      const match = !q || proto.includes(q) || port.includes(q);
      c.classList.toggle('is-hidden', !match);
    });
    // Hide empty category groups
    document.querySelectorAll('#port-ref-list .port-ref-group').forEach(g => {
      const visible = g.querySelectorAll('.port-ref-card:not(.is-hidden)').length;
      g.classList.toggle('is-hidden', !visible);
    });
  }
  
  // Original startPortDrill body inlined into enter() at module bottom.
  // ── Tabs ──
  function setPortTab(tabId) {
    ['learn','practice','dashboard'].forEach(t => {
      const btn = document.getElementById('pt-tab-btn-' + t);
      const panel = document.getElementById('pt-tab-' + t);
      if (btn) { btn.classList.toggle('pt-tab-active', t === tabId); }
      if (panel) { panel.classList.toggle('is-hidden', t !== tabId); }
    });
    if (tabId === 'learn') ptRenderLessonSidebar();
    if (tabId === 'practice') { ptIdx = 0; ptCorrect = 0; ptTotal = 0; ptStreak = 0; ptNextQuestion(); ptRenderHeatmap(); renderPortReference(); }
    if (tabId === 'dashboard') ptRenderDashboard();
  }
  
  // ── Practice modes ──
  function setPortPracticeMode(mode) {
    ptMode = mode;
    document.querySelectorAll('.pt-mode-btn').forEach(b => b.classList.remove('pt-mode-active'));
    const btn = document.getElementById('pt-mode-' + mode);
    if (btn) btn.classList.add('pt-mode-active');
    const timerW = document.getElementById('pt-timer-wrap');
    if (timerW) timerW.classList.toggle('is-hidden', mode !== 'timed');
    const fp = document.getElementById('pt-focus-picker');
    if (fp) fp.classList.toggle('is-hidden', mode !== 'focus');
    if (mode === 'focus') ptRenderFocusPicker();
    if (mode === 'timed') ptStartTimer();
    else ptStopTimer();
    ptIdx = 0; ptCorrect = 0; ptTotal = 0; ptStreak = 0;
    ptNextQuestion();
  }
  function ptSetFocusCat(catId) {
    ptFocusCat = catId;
    document.querySelectorAll('.pt-focus-chip').forEach(c => c.classList.toggle('pt-focus-chip-active', c.dataset.cat === catId));
    ptNextQuestion();
  }
  function ptRenderFocusPicker() {
    const el = document.getElementById('pt-focus-picker');
    if (!el) return;
    el.innerHTML = PT_CATEGORIES.map(c => {
      const active = ptFocusCat === c.id ? ' pt-focus-chip-active' : '';
      return `<button class="pt-focus-chip${active}" data-cat="${c.id}" onclick="ptSetFocusCat('${c.id}')">${escHtml(c.label)}</button>`;
    }).join('');
  }
  function ptStartTimer() {
    ptStopTimer();
    ptTimerValue = 30;
    const el = document.getElementById('pt-timer');
    if (el) el.textContent = '30';
    ptTimerInterval = setInterval(() => {
      ptTimerValue--;
      const el = document.getElementById('pt-timer');
      if (el) { el.textContent = ptTimerValue; el.className = ptTimerValue <= 5 ? 'pt-timer pt-timer-danger' : ptTimerValue <= 10 ? 'pt-timer pt-timer-warn' : 'pt-timer'; }
      if (ptTimerValue <= 0) { ptStopTimer(); ptEndTimedChallenge(); }
    }, 1000);
  }
  function ptStopTimer() { if (ptTimerInterval) { clearInterval(ptTimerInterval); ptTimerInterval = null; } }
  function ptEndTimedChallenge() {
    const card = document.getElementById('pt-q-card');
    if (card) card.innerHTML = `<div style="text-align:center;padding:30px"><div style="font-size:22px;font-weight:800;margin-bottom:8px">Time\u2019s Up!</div><div style="font-size:16px;color:var(--text-mid);margin-bottom:16px">You scored <strong>${ptCorrect}</strong> out of <strong>${ptTotal}</strong></div><button class="btn btn-primary" onclick="setPortPracticeMode('timed')">Try Again</button></div>`;
  }
  
  // ── Question generation ──
  function ptNextQuestion() {
    ptIdx++;
    const m = getPortMastery();
    let correct;
    if (ptMode === 'focus' && ptFocusCat) {
      correct = ptPickPort(ptFocusCat);
    } else if (ptMode === 'family') {
      ptGenFamilyQ(); return;
    } else if (ptMode === 'pairs') {
      ptGenPairsQ(); return;
    } else {
      correct = ptPickPort(null);
    }
    const cat = ptCatOf(correct.proto);
    // 50/50: ask for port or protocol
    const askPort = Math.random() < 0.5;
    const wrongPool = portData.filter(p => p.port !== correct.port && p.proto !== correct.proto);
    const wrongs = [];
    while (wrongs.length < 3 && wrongPool.length > 0) {
      const w = wrongPool.splice(Math.floor(Math.random() * wrongPool.length), 1)[0];
      if (!wrongs.find(x => (askPort ? x.port : x.proto) === (askPort ? w.port : w.proto))) wrongs.push(w);
    }
    const opts = [correct, ...wrongs].sort(() => Math.random() - 0.5);
    ptQ = { correct, cat, askPort, opts, type: 'single' };
    ptQuestionStartTime = Date.now();
  
    // Render
    const numEl = document.getElementById('pt-q-num');
    const qEl = document.getElementById('pt-question');
    const catBadge = document.getElementById('pt-cat-badge');
    if (numEl) numEl.textContent = 'Q' + ptIdx;
    if (qEl) qEl.innerHTML = askPort
      ? `What port is <strong>${escHtml(correct.proto)}</strong>?`
      : `Port <strong>${correct.port}/${correct.tp}</strong> is for?`;
    if (catBadge) catBadge.textContent = cat.label;
    const ansArea = document.getElementById('pt-answer-area');
    if (ansArea) {
      ansArea.innerHTML = `<div class="pt-mcq-grid">${opts.map(o => {
        const val = askPort ? `${o.port}/${o.tp}` : escHtml(o.proto);
        const chosen = askPort ? o.port : o.proto;
        const ans = askPort ? correct.port : correct.proto;
        return `<button class="pt-mcq-btn" onclick="ptPickAnswer(this,'${escHtml(chosen)}','${escHtml(ans)}')">${val}</button>`;
      }).join('')}</div>`;
    }
    const fb = document.getElementById('pt-feedback');
    if (fb) fb.innerHTML = '';
    const nb = document.getElementById('pt-next-btn');
    if (nb) nb.classList.add('is-hidden');
    document.getElementById('pt-score').textContent = ptCorrect + ' / ' + ptTotal;
    document.getElementById('pt-streak').textContent = '' + ptStreak;
    ptRenderLevelBadge();
  }
  
  function ptGenFamilyQ() {
    const byProto = {};
    portData.forEach(p => { byProto[p.proto] = p; });
    const eligible = PT_CATEGORIES.filter(c => c.protos.length >= 2);
    if (!eligible.length) { ptNextQuestion(); return; }
    const cat = eligible[Math.floor(Math.random() * eligible.length)];
    const correctPorts = cat.protos.map(n => byProto[n]).filter(Boolean);
    const correctKeys = new Set(correctPorts.map(p => p.proto));
    const wrongPool = portData.filter(p => !correctKeys.has(p.proto));
    const wrongs = [];
    while (wrongs.length < 4 && wrongPool.length > 0) {
      const w = wrongPool.splice(Math.floor(Math.random() * wrongPool.length), 1)[0];
      if (!wrongs.find(x => x.proto === w.proto)) wrongs.push(w);
    }
    const allOpts = [...correctPorts, ...wrongs].sort(() => Math.random() - 0.5);
    ptQ = { type: 'family', cat, correctKeys, allOpts, correctPorts };
    ptQuestionStartTime = Date.now();
    const n = correctPorts.length;
    const numEl = document.getElementById('pt-q-num');
    const qEl = document.getElementById('pt-question');
    const catBadge = document.getElementById('pt-cat-badge');
    if (numEl) numEl.textContent = 'Q' + ptIdx;
    if (qEl) qEl.innerHTML = `Select all <strong>${n}</strong> ports in the <strong>${escHtml(cat.label)}</strong> family`;
    if (catBadge) catBadge.textContent = cat.label;
    const ansArea = document.getElementById('pt-answer-area');
    if (ansArea) {
      ansArea.innerHTML = `<div class="pt-mcq-grid">${allOpts.map(o =>
        `<button class="pt-mcq-btn pt-mcq-multi" data-proto="${escHtml(o.proto)}" aria-pressed="false" onclick="this.classList.toggle('pt-mcq-selected');this.setAttribute('aria-pressed',String(this.classList.contains('pt-mcq-selected')))">${o.port}/${o.tp} <span style="font-size:11px;color:var(--text-dim);font-family:inherit">${escHtml(o.proto)}</span></button>`
      ).join('')}<button class="btn btn-primary btn-full" style="margin-top:10px" onclick="ptSubmitFamily()">Submit</button></div>`;
    }
    const fb = document.getElementById('pt-feedback');
    if (fb) fb.innerHTML = '';
    const nb = document.getElementById('pt-next-btn');
    if (nb) nb.classList.add('is-hidden');
  }
  
  function ptSubmitFamily() {
    if (!ptQ || ptQ.type !== 'family') return;
    const { correctKeys, allOpts, cat } = ptQ;
    const picked = new Set();
    document.querySelectorAll('#pt-answer-area .pt-mcq-selected').forEach(b => picked.add(b.getAttribute('data-proto')));
    let isCorrect = picked.size === correctKeys.size;
    if (isCorrect) { for (const k of correctKeys) { if (!picked.has(k)) { isCorrect = false; break; } } }
    const elapsed = ((Date.now() - ptQuestionStartTime) / 1000).toFixed(1);
    allOpts.forEach(o => {
      const correct = correctKeys.has(o.proto);
      const wasPicked = picked.has(o.proto);
      if (correct) updatePortMastery(o.proto, wasPicked);
      else if (wasPicked) updatePortMastery(o.proto, false);
    });
    ptTotal++;
    if (isCorrect) { ptCorrect++; ptStreak++; } else { ptStreak = 0; if (ptMode === 'family' || ptMode === 'endless') { ptRenderFeedback(ptQ, 'family', isCorrect, elapsed); return; } }
    ptRenderFeedback(ptQ, 'family', isCorrect, elapsed);
  }
  
  function ptGenPairsQ() {
    const pair = securePairs[Math.floor(Math.random() * securePairs.length)];
    const askPort = Math.random() < 0.5;
    const correct = pair.secure;
    const distractorPool = [];
    securePairs.forEach(p => { distractorPool.push(p.insecure, p.secure); });
    const correctKey = askPort ? correct.port : correct.proto;
    const siblingExclude = pair.siblingProto || null;
    const seen = new Set();
    const filtered = distractorPool.filter(o => {
      const key = askPort ? o.port : o.proto;
      if (key === correctKey) return false;
      if (!askPort && siblingExclude && o.proto === siblingExclude) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const wrongs = [];
    while (wrongs.length < 3 && filtered.length > 0) wrongs.push(filtered.splice(Math.floor(Math.random() * filtered.length), 1)[0]);
    const opts = [correct, ...wrongs].sort(() => Math.random() - 0.5);
    ptQ = { type: 'pairs', correct, pair, askPort, opts };
    ptQuestionStartTime = Date.now();
    const numEl = document.getElementById('pt-q-num');
    const qEl = document.getElementById('pt-question');
    const catBadge = document.getElementById('pt-cat-badge');
    if (numEl) numEl.textContent = 'Q' + ptIdx;
    const qual = pair.qualifier ? ` <em>${escHtml(pair.qualifier)}</em>` : '';
    if (qEl) qEl.innerHTML = askPort
      ? `<strong>${escHtml(correct.proto)}</strong> is the secure version of <strong>${escHtml(pair.insecure.proto)}</strong>. Which port?`
      : `Which protocol replaces <strong>${escHtml(pair.insecure.proto)}</strong> (port ${pair.insecure.port})${qual}?`;
    if (catBadge) catBadge.textContent = 'Secure Pairs';
    const ansArea = document.getElementById('pt-answer-area');
    if (ansArea) {
      ansArea.innerHTML = `<div class="pt-mcq-grid">${opts.map(o => {
        const val = askPort ? `${o.port}/${o.tp}` : escHtml(o.proto);
        const chosen = askPort ? o.port : o.proto;
        const ans = askPort ? correct.port : correct.proto;
        return `<button class="pt-mcq-btn" onclick="ptPickAnswer(this,'${escHtml(chosen)}','${escHtml(ans)}')">${val}</button>`;
      }).join('')}</div>`;
    }
    const fb = document.getElementById('pt-feedback');
    if (fb) fb.innerHTML = '';
    const nb = document.getElementById('pt-next-btn');
    if (nb) nb.classList.add('is-hidden');
  }
  
  function ptPickAnswer(btn, chosen, correct) {
    const isCorrect = (chosen === correct);
    const elapsed = ((Date.now() - ptQuestionStartTime) / 1000).toFixed(1);
    document.querySelectorAll('.pt-mcq-btn').forEach(b => { b.disabled = true; });
    if (ptQ && ptQ.correct) updatePortMastery(ptQ.correct.proto, isCorrect);
    ptTotal++;
    if (isCorrect) { ptCorrect++; ptStreak++; }
    else {
      ptStreak = 0;
      if (ptMode === 'endless' || ptMode === 'pairs') { ptRenderFeedback(ptQ, chosen, isCorrect, elapsed); return; }
      if (ptMode === 'timed') { ptTimerValue = Math.max(0, ptTimerValue - 1); const tel = document.getElementById('pt-timer'); if (tel) tel.textContent = ptTimerValue; }
    }
    ptRenderFeedback(ptQ, chosen, isCorrect, elapsed);
    document.getElementById('pt-score').textContent = ptCorrect + ' / ' + ptTotal;
    document.getElementById('pt-streak').textContent = '' + ptStreak;
    ptRenderLevelBadge();
    if (ptMode === 'timed' && isCorrect) { setTimeout(() => { if (ptTimerValue > 0) ptNextQuestion(); }, 800); }
  }
  
  // ── Feedback ──
  function ptRenderFeedback(q, userAnswer, isCorrect, elapsed) {
    const fb = document.getElementById('pt-feedback');
    if (!fb) return;
    let html = '';
    const proto = q.correct ? q.correct.proto : (q.correctPorts ? q.correctPorts.map(p => p.proto).join(', ') : '');
    const cat = q.cat || (q.correct ? ptCatOf(q.correct.proto) : PT_CATEGORIES[0]);
    if (isCorrect) {
      html = `<div class="pt-fb-correct"><strong>Correct!</strong> <span class="pt-fb-answer">${escHtml(proto)}</span><span class="pt-fb-time">${elapsed}s</span></div>`;
      if (ptStreak >= 5) html += `<div class="pt-fb-streak">${ptStreak} streak!</div>`;
    } else {
      html = `<div class="pt-fb-wrong"><strong>Incorrect.</strong></div>`;
      if (q.correct) html += `<div class="pt-fb-correct-answer">Correct: <strong>${q.correct.port}/${q.correct.tp} (${escHtml(q.correct.proto)})</strong></div>`;
      if (q.type === 'family' && q.correctPorts) {
        html += `<div class="pt-fb-correct-answer">Correct ports: <strong>${q.correctPorts.map(p => p.port + '/' + escHtml(p.proto)).join(', ')}</strong></div>`;
      }
      // Step-by-step explanation
      const steps = [];
      if (q.correct) {
        const c = q.correct;
        steps.push(`${escHtml(c.proto)} uses port <strong>${c.port}/${c.tp}</strong>`);
        steps.push(`It belongs to the <strong>${escHtml(cat.label)}</strong> family`);
        const mnemonic = PORT_MNEMONICS[c.proto];
        if (mnemonic) steps.push(`<strong>Memory hook:</strong> ${escHtml(mnemonic)}`);
        // Show secure pair context if applicable
        const pair = securePairs.find(p => p.secure.proto === c.proto || p.insecure.proto === c.proto);
        if (pair) steps.push(`Secure pair: ${escHtml(pair.insecure.proto)} (${pair.insecure.port}) \u2192 ${escHtml(pair.secure.proto)} (${pair.secure.port})`);
      }
      if (steps.length > 0) {
        html += '<div class="pt-steps"><div class="pt-steps-title">Why this is the answer:</div>';
        steps.forEach((s, i) => { html += `<div class="pt-step" style="animation-delay:${i * 150}ms"><span class="pt-step-num">${i + 1}</span> <span class="pt-step-text">${s}</span></div>`; });
        html += '</div>';
      }
      // AI Coach
      html += `<div style="margin-top:10px"><button class="btn btn-ghost" onclick="ptAskCoach()" style="font-size:12px">Ask Coach</button></div>`;
      html += '<div id="pt-coach-panel" class="pt-coach-panel"></div>';
    }
    fb.innerHTML = html;
    const nb = document.getElementById('pt-next-btn');
    if (nb) nb.classList.remove('is-hidden');
    ptRenderHeatmap();
    ptRenderLevelBadge();
    document.getElementById('pt-score').textContent = ptCorrect + ' / ' + ptTotal;
    document.getElementById('pt-streak').textContent = '' + ptStreak;
  }
  
  async function ptAskCoach() {
    const panel = document.getElementById('pt-coach-panel');
    if (!panel || !ptQ) return;
    const key = localStorage.getItem(STORAGE.KEY);
    if (!key) { panel.innerHTML = '<div class="pt-coach-msg">Set your API key in Settings to use the AI Coach.</div>'; return; }
    panel.innerHTML = '<div class="pt-coach-loading">\u23f3 Coach is thinking\u2026</div>';
    const proto = ptQ.correct ? ptQ.correct.proto : '';
    const port = ptQ.correct ? ptQ.correct.port : '';
    try {
      const res = await _claudeFetch( {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: CLAUDE_TEACHER_MODEL, max_tokens: MAX_TOKENS_TEACHER_BRIEF, messages: [{ role: 'user', content: `I'm studying for CompTIA Network+ N10-009. I just got a port number question wrong.\n\nAUTHORITATIVE FACT (do not contradict): ${proto} uses port ${port}.\n\nGive me a concise, memorable explanation of what this protocol does, a memory trick to remember its port number, and one exam tip. Keep it under 100 words.` }] })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || 'No response received.';
      panel.innerHTML = '<div class="pt-coach-msg">' + text.split('\n').map(p => '<p>' + escHtml(p) + '</p>').join('') + '</div>';
    } catch {
      panel.innerHTML = '<div class="pt-coach-msg pt-coach-error">Could not reach the AI Coach. Check your connection and API key.</div>';
    }
  }
  
  // ── Lesson system ──
  function ptGetLessonProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE.PORT_LESSONS) || '{}'); } catch { return {}; }
  }
  function ptSaveLessonProgress(p) { try { localStorage.setItem(STORAGE.PORT_LESSONS, JSON.stringify(p)); _cloudFlush(STORAGE.PORT_LESSONS); } catch {} }
  function ptIsLessonComplete(id) { const p = ptGetLessonProgress(); return p[id] && p[id].passed; }
  
  function ptRenderLessonSidebar() {
    const el = document.getElementById('pt-lesson-sidebar');
    if (!el) return;
    const progress = ptGetLessonProgress();
    el.innerHTML = PORT_LESSONS.map((l, i) => {
      const done = progress[l.id] && progress[l.id].passed;
      const locked = i > 0 && !ptIsLessonComplete(PORT_LESSONS[i - 1].id);
      const active = ptActiveLesson === l.id;
      const icon = '';
      return `<div class="pt-lesson-item${active ? ' pt-lesson-active' : ''}${locked ? ' pt-lesson-locked' : ''}${done ? ' pt-lesson-done' : ''}" onclick="${locked ? '' : `ptOpenLesson('${l.id}')`}">
        <span class="pt-lesson-icon">${icon}</span>
        <span class="pt-lesson-info"><span class="pt-lesson-num">Lesson ${i + 1}</span><span class="pt-lesson-title">${escHtml(l.title)}</span></span>
      </div>`;
    }).join('');
  }
  
  function ptOpenLesson(id) {
    // v4.81.10: tolerate "Start Lesson 1" CTA passing 1 / '1' — see
    // stOpenLesson for full context. Same fix across all 5 drill modules.
    if ((id === 1 || id === '1') && PORT_LESSONS[0]) id = PORT_LESSONS[0].id;
    ptActiveLesson = id;
    ptRenderLessonSidebar();
    const lesson = PORT_LESSONS.find(l => l.id === id);
    if (!lesson) return;
    const main = document.getElementById('pt-lesson-main');
    if (!main) return;
    let html = `<div class="pt-lesson-header"><span class="pt-lesson-header-icon"></span><h3>${escHtml(lesson.title)}</h3><p class="pt-lesson-desc">${escHtml(lesson.desc)}</p></div>`;
    html += '<div class="pt-lesson-theory">';
    lesson.theory.forEach(t => { html += `<div class="pt-theory-block">${t}</div>`; });
    // Show terminal commands for this category's ports
    const cat = PT_CATEGORIES.find(c => c.id === lesson.catId);
    if (cat) {
      const cmds = cat.protos.filter(p => portCommands[p]).map(p => ({ proto: p, ...portCommands[p], port: portData.find(d => d.proto === p) }));
      if (cmds.length > 0) {
        html += '<div class="pt-theory-block"><strong>Try it in Terminal:</strong><div style="margin-top:8px">';
        cmds.forEach(c => { if (c.port) html += `<div style="margin-bottom:6px;font-size:12px;color:var(--text-dim)">${c.port.port}/${c.port.tp} — ${escHtml(c.proto)}</div>` + _terminalCardHtml(c.cmd, c.note); });
        html += '</div></div>';
      }
    }
    html += '</div>';
    html += '<div class="pt-lesson-gate"><h4>Practice Gate \u2014 Get 3/5 to unlock the next lesson</h4>';
    html += '<div id="pt-gate-area"></div></div>';
    main.innerHTML = html;
    ptRenderGate(lesson);
  }
  
  function ptRenderGate(lesson) {
    const area = document.getElementById('pt-gate-area');
    if (!area) return;
    const cat = PT_CATEGORIES.find(c => c.id === lesson.catId);
    const catProtos = cat ? cat.protos : [];
    const pool = portData.filter(p => catProtos.includes(p.proto));
    const gateState = { current: 0, correct: 0, total: 5, questions: [], lessonId: lesson.id };
    for (let i = 0; i < 5; i++) {
      const p = pool[Math.floor(Math.random() * pool.length)];
      const askPort = Math.random() < 0.5;
      gateState.questions.push({ correct: p, askPort });
    }
    ptRenderGateQuestion(area, gateState);
  }
  
  function ptRenderGateQuestion(area, gs) {
    if (gs.current >= gs.total) {
      const passed = gs.correct >= 3;
      if (passed) {
        const p = ptGetLessonProgress();
        p[gs.lessonId] = { passed: true, date: Date.now() };
        ptSaveLessonProgress(p);
        ptRenderLessonSidebar();
      }
      area.innerHTML = `<div class="pt-gate-result ${passed ? 'pt-gate-pass' : 'pt-gate-fail'}">${passed ? 'Passed! ' + gs.correct + '/5 — Next lesson unlocked!' : '' + gs.correct + '/5 — Need 3/5. Try again!'}</div>${!passed ? '<button class="btn btn-primary" style="margin-top:12px" onclick="ptOpenLesson(\'' + gs.lessonId + '\')">Retry</button>' : ''}`;
      return;
    }
    const q = gs.questions[gs.current];
    const wrongPool = portData.filter(p => p.port !== q.correct.port && p.proto !== q.correct.proto);
    const wrongs = [];
    while (wrongs.length < 3 && wrongPool.length > 0) {
      const w = wrongPool.splice(Math.floor(Math.random() * wrongPool.length), 1)[0];
      wrongs.push(w);
    }
    const opts = [q.correct, ...wrongs].sort(() => Math.random() - 0.5);
    const prompt = q.askPort ? `What port is <strong>${escHtml(q.correct.proto)}</strong>?` : `Port <strong>${q.correct.port}/${q.correct.tp}</strong> is for?`;
    area.innerHTML = `<div class="pt-gate-q"><div class="pt-gate-progress">${gs.current + 1} / 5</div><div class="subnet-question" style="font-size:15px;margin-bottom:14px">${prompt}</div><div class="pt-mcq-grid">${opts.map(o => {
      const val = q.askPort ? `${o.port}/${o.tp}` : escHtml(o.proto);
      const chosen = q.askPort ? o.port : o.proto;
      const ans = q.askPort ? q.correct.port : q.correct.proto;
      return `<button class="pt-mcq-btn" onclick="ptCheckGate(this,'${escHtml(chosen)}','${escHtml(ans)}')">${val}</button>`;
    }).join('')}</div><div id="pt-gate-fb" class="pt-feedback"></div></div>`;
    // Store gate state on the area element
    area._gs = gs;
  }
  
  function ptCheckGate(btn, chosen, correct) {
    const area = document.getElementById('pt-gate-area');
    if (!area || !area._gs) return;
    const gs = area._gs;
    const isCorrect = chosen === correct;
    document.querySelectorAll('#pt-gate-area .pt-mcq-btn').forEach(b => { b.disabled = true; });
    if (isCorrect) gs.correct++;
    gs.current++;
    const q = gs.questions[gs.current - 1];
    if (q && q.correct) updatePortMastery(q.correct.proto, isCorrect);
    const fb = document.getElementById('pt-gate-fb');
    if (fb) {
      fb.innerHTML = isCorrect
        ? `<div class="pt-fb-correct">Correct! ${escHtml(q.correct.proto)} = ${q.correct.port}</div>`
        : `<div class="pt-fb-wrong">Incorrect. ${escHtml(q.correct.proto)} = ${q.correct.port}</div>`;
    }
    setTimeout(() => ptRenderGateQuestion(area, gs), 1200);
  }
  
  // ── Heatmap ──
  function ptRenderHeatmap() {
    const el = document.getElementById('pt-heatmap');
    if (!el) return;
    const m = getPortMastery();
    el.innerHTML = '<div class="pt-heatmap-title">Category Mastery</div><div class="pt-heatmap-grid">' + PT_CAT_IDS.map(c => {
      const cat = PT_CATEGORIES.find(x => x.id === c);
      const d = m.perCategory[c] || { seen: 0, correct: 0, box: 1, streak: 0 };
      const acc = d.seen > 0 ? Math.round(d.correct / d.seen * 100) : 0;
      const color = d.seen === 0 ? 'var(--text-dim)' : acc >= 80 ? 'var(--green)' : acc >= 50 ? 'var(--yellow)' : 'var(--red)';
      return `<div class="pt-heat-cell"><div class="pt-heat-icon"></div><div class="pt-heat-pct">${d.seen > 0 ? acc + '%' : '\u2014'}</div><div class="pt-heat-label">${cat.label.split(' ')[0]}</div><div class="pt-heat-box">Box ${d.box}/5</div></div>`;
    }).join('') + '</div>';
  }
  
  // ── Level badge ──
  function ptRenderLevelBadge() {
    const el = document.getElementById('pt-level-badge');
    if (!el) return;
    const m = getPortMastery();
    el.textContent = m.currentLevel.charAt(0).toUpperCase() + m.currentLevel.slice(1);
  }
  
  // ── Dashboard ──
  function ptRenderDashboard() {
    const el = document.getElementById('pt-dashboard-content');
    if (!el) return;
    const m = getPortMastery();
    const acc = m.totalAnswered > 0 ? Math.round(m.totalCorrect / m.totalAnswered * 100) : 0;
    const level = m.currentLevel;
    const nextLevel = level === 'expert' ? 'Mastered!' : level === 'advanced' ? 'Expert' : level === 'intermediate' ? 'Advanced' : 'Intermediate';
    const thresholds = { beginner: { need: 50, accNeed: 60 }, intermediate: { need: 200, accNeed: 75 }, advanced: { need: 400, accNeed: 85 }, expert: { need: 400, accNeed: 85 } };
    const th = thresholds[level];
    const pct = Math.min(100, Math.round(m.totalAnswered / th.need * 100));
  
    let html = '<div class="pt-dash-hero">';
    html += `<div class="pt-dash-level"><div class="pt-dash-level-title">${level.charAt(0).toUpperCase() + level.slice(1)}</div><div class="pt-dash-level-bar"><div class="pt-dash-level-fill" style="width:${pct}%"></div></div><div class="pt-dash-level-next">Next: ${nextLevel}</div></div>`;
    html += `<div class="pt-dash-stats"><div class="pt-dash-stat"><div class="pt-dash-stat-val">${m.totalAnswered}</div><div class="pt-dash-stat-label">Questions</div></div><div class="pt-dash-stat"><div class="pt-dash-stat-val">${acc}%</div><div class="pt-dash-stat-label">Accuracy</div></div><div class="pt-dash-stat"><div class="pt-dash-stat-val">${m.totalCorrect}</div><div class="pt-dash-stat-label">Correct</div></div></div>`;
    html += '</div>';
  
    // Category mastery cards
    html += '<h3 class="pt-dash-heading">Category Mastery</h3><div class="pt-dash-cats">';
    PT_CATEGORIES.forEach(cat => {
      const d = m.perCategory[cat.id] || { seen: 0, correct: 0, box: 1, streak: 0 };
      const catAcc = d.seen > 0 ? Math.round(d.correct / d.seen * 100) : 0;
      const barColor = catAcc >= 80 ? 'var(--green)' : catAcc >= 50 ? 'var(--yellow)' : 'var(--red)';
      html += `<div class="pt-dash-cat-card"><div class="pt-dash-cat-head">${escHtml(cat.label)}</div><div class="pt-dash-cat-bar"><div style="width:${catAcc}%;height:100%;border-radius:3px;transition:width .3s"></div></div><div class="pt-dash-cat-stats"><span>${catAcc}% acc</span><span>${d.seen} seen</span><span>Box ${d.box}/5</span><span>${d.streak} streak</span></div></div>`;
    });
    html += '</div>';
  
    // Weakest ports
    const weakPorts = Object.entries(m.perPort).filter(([, v]) => v.seen >= 3).map(([proto, v]) => ({ proto, acc: Math.round(v.correct / v.seen * 100), seen: v.seen, box: v.box })).sort((a, b) => a.acc - b.acc).slice(0, 5);
    if (weakPorts.length > 0) {
      html += '<h3 class="pt-dash-heading">Weakest Ports</h3><div class="pt-dash-weak">';
      weakPorts.forEach(w => {
        const p = portData.find(d => d.proto === w.proto);
        html += `<div class="pt-dash-weak-row"><span class="pt-dash-weak-proto">${escHtml(w.proto)}</span><span class="pt-dash-weak-port">${p ? p.port : '?'}</span><span class="pt-dash-weak-acc">${w.acc}%</span><span class="pt-dash-weak-seen">${w.seen} seen</span></div>`;
      });
      html += '</div>';
    }
  
    // Lesson progress
    const lp = ptGetLessonProgress();
    html += '<h3 class="pt-dash-heading">Lesson Progress</h3><div class="pt-dash-lessons">';
    PORT_LESSONS.forEach((l, i) => {
      const done = lp[l.id] && lp[l.id].passed;
      html += `<div class="pt-dash-lesson-row"><span class="pt-dash-lesson-dot${done ? ' pt-dash-lesson-done' : ''}"></span><span>Lesson ${i + 1}: ${escHtml(l.title)}</span></div>`;
    });
    html += '</div>';
  
    // Secure pairs matrix
    html += '<h3 class="pt-dash-heading">Secure Pairs</h3><div class="pt-dash-pairs">';
    const pairsDeduped = [];
    const seenPairs = new Set();
    securePairs.forEach(p => { const k = p.insecure.proto + '-' + p.secure.proto; if (!seenPairs.has(k)) { seenPairs.add(k); pairsDeduped.push(p); } });
    pairsDeduped.forEach(p => {
      const iData = m.perPort[p.insecure.proto] || { seen: 0, correct: 0 };
      const sData = m.perPort[p.secure.proto] || m.perPort[portData.find(d => d.proto === p.secure.proto)?.proto] || { seen: 0, correct: 0 };
      html += `<div class="pt-dash-pair-row"><span>${escHtml(p.insecure.proto)} (${p.insecure.port})</span><span>\u2192</span><span>${escHtml(p.secure.proto)} (${p.secure.port})</span></div>`;
    });
    html += '</div>';
  
    html += '<div style="margin-top:24px;text-align:center"><button class="btn btn-ghost" onclick="if(confirm(\'Reset all port mastery data?\')){localStorage.removeItem(STORAGE.PORT_MASTERY);localStorage.removeItem(STORAGE.PORT_LESSONS);ptRenderDashboard();}" style="font-size:12px;color:var(--text-dim)">Reset Mastery Data</button></div>';
    el.innerHTML = html;
  }
  
  // ── Legacy compat stubs (used by other parts of the app) ──
  // v4.62.4 Thursday tech-debt sweep: removed 4 actually-dead stubs
  // (setPortMode, nextPortQ, nextPortFamilyQ, pickPort) after grep-audit
  // found zero callers anywhere in app.js / index.html / tests / sw.js.
  // The survivors below still have real callers in TopicDeepDive commands
  // and guided labs so they stay.
  function beginPortDrill() { setPortTab('practice'); setPortPracticeMode(portMode === 'family' ? 'family' : portMode === 'pairs' ? 'pairs' : portMode === 'endless' ? 'endless' : 'drill'); }
  function endPortDrill() { ptStopTimer(); }
  function getFamilyEligibleCategories() {
    const byProto = {};
    portData.forEach(p => { byProto[p.proto] = p; });
    return portCategories.map(cat => ({ name: cat.name, ports: cat.protos.map(n => byProto[n]).filter(Boolean) })).filter(cat => cat.ports.length >= 2);
  }
  function renderPortTerminalList() {}
  function renderPortLabsList() {}
  function togglePortFamilyPick(btn) { btn.classList.toggle('pt-mcq-selected'); }
  function submitPortFamilyAnswer() { ptSubmitFamily(); }
  function nextPortPairsQ() { ptGenPairsQ(); }

  // ── Shell-callable teardown (v4.99.38) ──
  // goSetup() in shell needs to stop the port timer when user navigates away.
  // The portTimer / ptTimerInterval globals are now scoped to this IIFE, so
  // shell can't reach them directly. Expose a single teardown function that
  // shell can fire from goSetup() without needing to know the internal vars.
  window._portDrillTeardown = function() {
    try { ptStopTimer(); } catch (_) {}
    try { if (portTimer) { clearInterval(portTimer); portTimer = null; } } catch (_) {}
  };

  // ── Expose to window so onclick handlers + cross-feature CTAs find them ──
  window.setPortTab = setPortTab;
  window.ptOpenLesson = ptOpenLesson;
  window.ptStartTimer = ptStartTimer;
  window.ptStopTimer = ptStopTimer;
  window.ptEndTimedChallenge = ptEndTimedChallenge;
  window.ptNextQuestion = ptNextQuestion;
  window.ptPickAnswer = ptPickAnswer;
  window.ptSetFocusCat = ptSetFocusCat;
  window.ptCheckGate = ptCheckGate;
  window.ptSubmitFamily = ptSubmitFamily;
  window.beginPortDrill = beginPortDrill;
  window.endPortDrill = endPortDrill;
  window.getPortMastery = getPortMastery;
  window.setPortPracticeMode = setPortPracticeMode;
  window.togglePortFamilyPick = togglePortFamilyPick;
  window.submitPortFamilyAnswer = submitPortFamilyAnswer;
  window.nextPortPairsQ = nextPortPairsQ;

  // ── Register feature module entry point ──
  // enter(tab) accepts an optional tab argument so cross-feature CTAs can
  // jump directly to a specific pane (e.g. drill-mission card "Continue
  // practice" can pass 'practice'). Defaults to 'learn' (matches original
  // startPortDrill behavior at app.js:29402-29408).
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures["port-drill"] = {
    enter: function(tab) {
      // Original startPortDrill body inlined. Pro gate fires from shell stub,
      // so we don't double-gate here.
      var resolvedTab = tab || "learn";
      setPortTab(resolvedTab);
      ptRenderLevelBadge();
      // v4.81.10: Drill Mission Card (Codex r8). renderPortMission lives in
      // the shell — call it if it exists.
      if (typeof renderPortMission === "function") renderPortMission();
      // Open lesson 1 when caller wants the learn flow with auto-launch
      if (tab === "learn-with-lesson") ptOpenLesson(1);
    },
    leave: function() {
      // Clean up timer + reset core state on page-leave so next entry feels fresh.
      try { ptStopTimer(); } catch (_) {}
      ptCorrect = 0; ptTotal = 0; ptStreak = 0;
      ptQ = null; ptIdx = 0;
      ptActiveLesson = null;
    },
  };
})();

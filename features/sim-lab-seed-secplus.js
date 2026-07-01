/* DRAFT Sec+ PBQ seed scenarios — answers NOT yet founder-verified. Review before ship. */
window.SIM_LAB_SEED_SECPLUS = [
  // ===== Domain 1 — General Security Concepts (~3) =====
  {
    id: 'sp-seed-controls-cat-1', cert: 'secplus', objective: '1.1', topic: 'Security controls',
    title: 'Categorize controls by function', estMinutes: 4,
    scenario: 'Sort each security control by its control function: preventive, detective, or corrective.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each control under Preventive, Detective, or Corrective.',
        explanation: 'Preventive controls stop an incident before it happens (a firewall blocks traffic; a lock bars entry). Detective controls identify an incident in progress or after the fact (IDS alerts; log review). Corrective controls restore systems after an incident (restoring from backup; a patch that fixes the exploited flaw).',
        payload: {
          items: [
            { id: 'fw', label: 'Firewall rule blocking a port' },
            { id: 'lock', label: 'Door lock' },
            { id: 'ids', label: 'IDS alert on suspicious traffic' },
            { id: 'logrev', label: 'Reviewing audit logs' },
            { id: 'backup', label: 'Restoring data from backup' },
            { id: 'patch', label: 'Applying a patch after exploitation' }
          ],
          buckets: [
            { id: 'prev', label: 'Preventive' },
            { id: 'det', label: 'Detective' },
            { id: 'corr', label: 'Corrective' }
          ]
        },
        answer: { map: { fw: 'prev', lock: 'prev', ids: 'det', logrev: 'det', backup: 'corr', patch: 'corr' } } }
    ]
  },

  {
    id: 'sp-seed-control-types-cat-1', cert: 'secplus', objective: '1.1', topic: 'Security controls',
    title: 'Categorize controls by type', estMinutes: 4,
    scenario: 'SY0-701 groups controls into four types by how they are implemented: technical, managerial, operational, and physical. Sort each example.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each control under Technical, Managerial, Operational, or Physical.',
        explanation: 'Technical controls are implemented in technology (encryption, access control lists). Managerial controls are administrative direction (risk assessments, security policy). Operational controls are carried out by people day-to-day (security awareness training, change management). Physical controls protect the physical environment (bollards, fences, guards).',
        payload: {
          items: [
            { id: 'enc', label: 'Disk encryption' },
            { id: 'acl', label: 'Access control list' },
            { id: 'policy', label: 'Written security policy' },
            { id: 'risk', label: 'Annual risk assessment' },
            { id: 'training', label: 'Security awareness training' },
            { id: 'fence', label: 'Perimeter fence' }
          ],
          buckets: [
            { id: 'tech', label: 'Technical' },
            { id: 'mgr', label: 'Managerial' },
            { id: 'ops', label: 'Operational' },
            { id: 'phys', label: 'Physical' }
          ]
        },
        answer: { map: { enc: 'tech', acl: 'tech', policy: 'mgr', risk: 'mgr', training: 'ops', fence: 'phys' } } }
    ]
  },

  {
    id: 'sp-seed-cia-match-1', cert: 'secplus', objective: '1.2', topic: 'CIA / AAA',
    title: 'Match the foundational concept', estMinutes: 3,
    scenario: 'Match each security concept to its definition.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each concept with its meaning.',
        explanation: 'Confidentiality keeps data secret from unauthorized parties. Integrity ensures data is not altered. Availability keeps systems and data accessible. Non-repudiation proves an action cannot be denied by its actor (e.g., a digital signature). Authentication proves identity.',
        payload: {
          left: [
            { id: 'conf', label: 'Confidentiality' },
            { id: 'integ', label: 'Integrity' },
            { id: 'avail', label: 'Availability' },
            { id: 'nonrep', label: 'Non-repudiation' },
            { id: 'authn', label: 'Authentication' }
          ],
          right: [
            { id: 'dsecret', label: 'Keeps data secret from unauthorized parties' },
            { id: 'dunaltered', label: 'Ensures data has not been altered' },
            { id: 'daccess', label: 'Keeps systems and data accessible' },
            { id: 'ddeny', label: 'Proves an action cannot be denied by its actor' },
            { id: 'dident', label: 'Proves a claimed identity' }
          ]
        },
        answer: { pairs: { conf: 'dsecret', integ: 'dunaltered', avail: 'daccess', nonrep: 'ddeny', authn: 'dident' } } }
    ]
  },

  // ===== Domain 2 — Threats, Vulnerabilities & Mitigations (~6) =====
  {
    id: 'sp-seed-social-attacks-match-1', cert: 'secplus', objective: '2.2', topic: 'Social engineering',
    title: 'Match the social-engineering attack', estMinutes: 4,
    scenario: 'Match each social-engineering technique to its description.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each attack with how it is delivered.',
        explanation: 'Phishing uses fraudulent email. Smishing uses SMS/text messages. Vishing uses voice calls. A watering-hole attack compromises a website the target group is known to visit. Whaling is phishing aimed at a high-value executive.',
        payload: {
          left: [
            { id: 'phish', label: 'Phishing' },
            { id: 'smish', label: 'Smishing' },
            { id: 'vish', label: 'Vishing' },
            { id: 'water', label: 'Watering hole' },
            { id: 'whale', label: 'Whaling' }
          ],
          right: [
            { id: 'demail', label: 'Fraudulent email to many users' },
            { id: 'dsms', label: 'Fraudulent SMS / text message' },
            { id: 'dvoice', label: 'Fraudulent voice phone call' },
            { id: 'dsite', label: 'Compromising a site the target group visits' },
            { id: 'dexec', label: 'Phishing aimed at a senior executive' }
          ]
        },
        answer: { pairs: { phish: 'demail', smish: 'dsms', vish: 'dvoice', water: 'dsite', whale: 'dexec' } } }
    ]
  },

  {
    id: 'sp-seed-malware-match-1', cert: 'secplus', objective: '2.4', topic: 'Malware',
    title: 'Match the malware type', estMinutes: 4,
    scenario: 'Match each malware type to its defining behavior.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each malware type with its behavior.',
        explanation: 'A worm self-replicates and spreads across a network without user action. A Trojan hides inside a seemingly legitimate program. Ransomware encrypts files and demands payment. A rootkit hides itself and grants privileged access. A keylogger records keystrokes to steal credentials.',
        payload: {
          left: [
            { id: 'worm', label: 'Worm' },
            { id: 'trojan', label: 'Trojan' },
            { id: 'ransom', label: 'Ransomware' },
            { id: 'rootkit', label: 'Rootkit' },
            { id: 'keylog', label: 'Keylogger' }
          ],
          right: [
            { id: 'dspread', label: 'Self-replicates across a network without user action' },
            { id: 'dhide', label: 'Hides inside a seemingly legitimate program' },
            { id: 'dencrypt', label: 'Encrypts files and demands payment' },
            { id: 'dconceal', label: 'Conceals itself and grants privileged access' },
            { id: 'dkeys', label: 'Records keystrokes to steal credentials' }
          ]
        },
        answer: { pairs: { worm: 'dspread', trojan: 'dhide', ransom: 'dencrypt', rootkit: 'dconceal', keylog: 'dkeys' } } }
    ]
  },

  {
    id: 'sp-seed-appattacks-match-1', cert: 'secplus', objective: '2.3', topic: 'Application attacks',
    title: 'Match the application attack', estMinutes: 4,
    scenario: 'Match each application/web attack to its description.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each attack with what it does.',
        explanation: 'SQL injection inserts malicious SQL into an input to manipulate the database. XSS injects script that runs in another user’s browser. CSRF tricks an authenticated user’s browser into sending an unwanted request. A buffer overflow writes past a memory boundary to corrupt execution. Privilege escalation gains rights beyond those assigned.',
        payload: {
          left: [
            { id: 'sqli', label: 'SQL injection' },
            { id: 'xss', label: 'Cross-site scripting (XSS)' },
            { id: 'csrf', label: 'Cross-site request forgery (CSRF)' },
            { id: 'bof', label: 'Buffer overflow' },
            { id: 'privesc', label: 'Privilege escalation' }
          ],
          right: [
            { id: 'ddb', label: 'Inserts malicious SQL to manipulate the database' },
            { id: 'dscript', label: 'Injects script that runs in another user’s browser' },
            { id: 'dforge', label: 'Forces an authenticated browser to send an unwanted request' },
            { id: 'dmem', label: 'Writes past a memory boundary to corrupt execution' },
            { id: 'drights', label: 'Gains rights beyond those assigned' }
          ]
        },
        answer: { pairs: { sqli: 'ddb', xss: 'dscript', csrf: 'dforge', bof: 'dmem', privesc: 'drights' } } }
    ]
  },

  {
    id: 'sp-seed-threat-actors-match-1', cert: 'secplus', objective: '2.1', topic: 'Threat actors',
    title: 'Match the threat actor', estMinutes: 3,
    scenario: 'Match each threat actor to its primary motivation or trait.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each threat actor with its defining trait.',
        explanation: 'A nation-state actor is highly resourced and pursues espionage or strategic goals (often an APT). A hacktivist is driven by a political or social cause. An organized-crime group is motivated by financial gain. An insider threat originates from someone with legitimate access. An unskilled attacker (script kiddie) uses existing tools without deep expertise.',
        payload: {
          left: [
            { id: 'nation', label: 'Nation-state' },
            { id: 'hack', label: 'Hacktivist' },
            { id: 'crime', label: 'Organized crime' },
            { id: 'insider', label: 'Insider threat' },
            { id: 'script', label: 'Unskilled attacker' }
          ],
          right: [
            { id: 'despionage', label: 'Highly resourced; espionage / strategic goals' },
            { id: 'dcause', label: 'Driven by a political or social cause' },
            { id: 'dmoney', label: 'Motivated primarily by financial gain' },
            { id: 'daccess', label: 'Originates from someone with legitimate access' },
            { id: 'dtools', label: 'Uses existing tools without deep expertise' }
          ]
        },
        answer: { pairs: { nation: 'despionage', hack: 'dcause', crime: 'dmoney', insider: 'daccess', script: 'dtools' } } }
    ]
  },

  {
    id: 'sp-seed-vuln-scan-analyze-1', cert: 'secplus', objective: '4.3', topic: 'Vulnerability management',
    title: 'Read the vulnerability scan', estMinutes: 3,
    scenario: 'A vulnerability scanner returned the findings below for one host. Click the single finding that should be remediated first.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the finding with the highest remediation priority.',
        explanation: 'CVSS scores run 0–10; 9.0–10.0 is Critical. The unauthenticated remote code execution at CVSS 9.8 is the most severe and is remotely exploitable without credentials, so it is remediated first.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'CVE-2024-1001  TLS 1.0 enabled            CVSS 5.3 (Medium)' },
            { id: 'l2', text: 'CVE-2024-1002  Unauth. remote code execution CVSS 9.8 (Critical)' },
            { id: 'l3', text: 'CVE-2024-1003  Verbose error messages       CVSS 3.1 (Low)' },
            { id: 'l4', text: 'CVE-2024-1004  Missing HTTP security header  CVSS 4.0 (Medium)' }
          ]
        },
        answer: { selected: ['l2'] } }
    ]
  },

  {
    id: 'sp-seed-passwordattacks-cat-1', cert: 'secplus', objective: '2.4', topic: 'Password attacks',
    title: 'Classify the password attack', estMinutes: 3,
    scenario: 'Sort each password-cracking approach into brute-force, dictionary, or hybrid/other.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each technique under its category.',
        explanation: 'Brute force tries every possible combination. A dictionary attack tries words from a list. A rainbow-table attack uses precomputed hash lookups, and password spraying tries one common password across many accounts — both are distinct from pure brute force and dictionary.',
        payload: {
          items: [
            { id: 'allcombo', label: 'Trying every possible character combination' },
            { id: 'wordlist', label: 'Trying words from a wordlist' },
            { id: 'rainbow', label: 'Looking up precomputed hash values' },
            { id: 'spray', label: 'Trying one common password across many accounts' }
          ],
          buckets: [
            { id: 'brute', label: 'Brute force' },
            { id: 'dict', label: 'Dictionary' },
            { id: 'other', label: 'Other technique' }
          ]
        },
        answer: { map: { allcombo: 'brute', wordlist: 'dict', rainbow: 'other', spray: 'other' } } }
    ]
  },

  // ===== Domain 3 — Security Architecture (~4) =====
  {
    id: 'sp-seed-crypto-match-1', cert: 'secplus', objective: '1.4', topic: 'Cryptography',
    title: 'Match the cryptographic primitive', estMinutes: 4,
    scenario: 'Match each algorithm to its cryptographic category.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each algorithm with its category.',
        explanation: 'AES is a symmetric block cipher (one shared key). RSA is asymmetric (public/private key pair). SHA-256 is a hashing algorithm (one-way digest). HMAC provides message integrity and authenticity using a hash plus a secret key. ECC is asymmetric cryptography based on elliptic curves.',
        payload: {
          left: [
            { id: 'aes', label: 'AES' },
            { id: 'rsa', label: 'RSA' },
            { id: 'sha', label: 'SHA-256' },
            { id: 'hmac', label: 'HMAC' },
            { id: 'ecc', label: 'ECC' }
          ],
          right: [
            { id: 'dsym', label: 'Symmetric encryption' },
            { id: 'dasym', label: 'Asymmetric encryption' },
            { id: 'dhash', label: 'Hashing (one-way digest)' },
            { id: 'dintegrity', label: 'Keyed message integrity / authenticity' },
            { id: 'dcurve', label: 'Asymmetric cryptography on elliptic curves' }
          ]
        },
        answer: { pairs: { aes: 'dsym', rsa: 'dasym', sha: 'dhash', hmac: 'dintegrity', ecc: 'dcurve' } } }
    ]
  },

  {
    id: 'sp-seed-secureports-match-1', cert: 'secplus', objective: '4.5', topic: 'Secure protocols',
    title: 'Match secure protocol to port', estMinutes: 4,
    scenario: 'Match each secure protocol to the TCP port it uses by default.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each secure protocol with its default port.',
        explanation: 'HTTPS uses 443. SFTP runs over SSH on port 22. FTPS (implicit) uses 990. LDAPS uses 636. SNMPv3 uses 161 (the same port as earlier SNMP versions; the version, not the port, adds security).',
        payload: {
          left: [
            { id: 'https', label: 'HTTPS' },
            { id: 'sftp', label: 'SFTP' },
            { id: 'ftps', label: 'FTPS (implicit)' },
            { id: 'ldaps', label: 'LDAPS' },
            { id: 'snmp3', label: 'SNMPv3' }
          ],
          right: [
            { id: 'p443', label: '443' },
            { id: 'p22', label: '22' },
            { id: 'p990', label: '990' },
            { id: 'p636', label: '636' },
            { id: 'p161', label: '161' }
          ]
        },
        // Reviewed (security-eng + CompTIA examiner): implicit-FTPS control port 990 confirmed correct; 989 (data) is not an option here, so no ambiguity.
        answer: { pairs: { https: 'p443', sftp: 'p22', ftps: 'p990', ldaps: 'p636', snmp3: 'p161' } } }
    ]
  },

  {
    id: 'sp-seed-dmz-fillin-1', cert: 'secplus', objective: '3.1', topic: 'Network segmentation',
    title: 'Size the DMZ subnet', estMinutes: 5,
    scenario: 'You are carving a screened subnet (DMZ) out of 10.10.20.0 to host up to 12 public-facing servers. Answer both fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What is the smallest CIDR prefix that provides at least 12 usable host addresses?',
        explanation: 'A /28 yields 16 addresses, 14 usable (2^4 - 2) — the smallest block that fits 12 hosts. A /29 gives only 6 usable, which is too few.',
        payload: { fields: [{ id: 'cidr', label: 'CIDR prefix', inputmode: 'text' }] },
        answer: { cidr: ['/28', '28'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'How many usable host addresses does that prefix provide?',
        explanation: '2^4 - 2 = 14 usable addresses (minus the network and broadcast addresses).',
        payload: { fields: [{ id: 'hosts', label: 'Usable hosts', inputmode: 'numeric' }] },
        answer: { hosts: ['14'] } }
    ]
  },

  {
    id: 'sp-seed-pki-order-1', cert: 'secplus', objective: '1.4', topic: 'PKI',
    title: 'Order the certificate issuance flow', estMinutes: 4,
    scenario: 'A web server operator obtains a TLS certificate from a CA. Put the PKI issuance steps in order, first step at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the certificate issuance steps in order.',
        explanation: 'The operator generates a key pair, builds a Certificate Signing Request (CSR) containing the public key, submits it to the CA, the CA validates the requester and signs the certificate, then the operator installs the signed certificate on the server.',
        payload: { items: [
          { id: 'submit', label: 'Submit the CSR to the Certificate Authority' },
          { id: 'keygen', label: 'Generate the public/private key pair' },
          { id: 'install', label: 'Install the signed certificate on the server' },
          { id: 'csr', label: 'Create the Certificate Signing Request (CSR)' },
          { id: 'sign', label: 'CA validates the requester and signs the certificate' }
        ] },
        answer: { correctOrder: ['keygen', 'csr', 'submit', 'sign', 'install'] } }
    ]
  },

  // ===== Domain 4 — Security Operations (~7) =====
  {
    id: 'sp-seed-ir-order-1', cert: 'secplus', objective: '4.8', topic: 'Incident response',
    title: 'Order the incident-response lifecycle', estMinutes: 4,
    scenario: 'Your team handles a confirmed breach. Put the incident-response phases in the order SY0-701 defines, first phase at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the incident-response phases in order.',
        explanation: 'SY0-701 order: Preparation, Detection, Analysis, Containment, Eradication, Recovery, Lessons Learned. Preparation comes first; Lessons Learned closes the loop.',
        payload: { items: [
          { id: 'contain', label: 'Containment' },
          { id: 'prep', label: 'Preparation' },
          { id: 'lessons', label: 'Lessons Learned' },
          { id: 'detect', label: 'Detection' },
          { id: 'recover', label: 'Recovery' },
          { id: 'analyze', label: 'Analysis' },
          { id: 'eradicate', label: 'Eradication' }
        ] },
        // Reviewed (security-eng + CompTIA examiner): SY0-701 4.8 canonical 7-phase order confirmed; keep Detection and Analysis as separate phases.
        answer: { correctOrder: ['prep', 'detect', 'analyze', 'contain', 'eradicate', 'recover', 'lessons'] } }
    ]
  },

  {
    id: 'sp-seed-log-cat-1', cert: 'secplus', objective: '4.9', topic: 'Log analysis',
    title: 'Categorize the log source', estMinutes: 4,
    scenario: 'Sort each log entry by the source that most likely produced it.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each entry under Firewall, Authentication, or Web server.',
        explanation: 'A DENY on a source/destination IP and port is a firewall log. A failed/successful login for a user account is an authentication log. An HTTP method with a status code (GET / 200, POST / 401) is a web-server access log.',
        payload: {
          items: [
            { id: 'deny', label: 'DENY src=203.0.113.5 dst=10.0.0.8:3389' },
            { id: 'login', label: 'Failed password for user jdoe from 10.0.0.20' },
            { id: 'http', label: '"GET /login HTTP/1.1" 200 1340' },
            { id: 'accept', label: 'ALLOW src=10.0.0.5 dst=10.0.0.9:443' },
            { id: 'success', label: 'Accepted password for user admin from 10.0.0.7' },
            { id: 'post', label: '"POST /admin HTTP/1.1" 403 512' }
          ],
          buckets: [
            { id: 'fw', label: 'Firewall' },
            { id: 'auth', label: 'Authentication' },
            { id: 'web', label: 'Web server' }
          ]
        },
        answer: { map: { deny: 'fw', login: 'auth', http: 'web', accept: 'fw', success: 'auth', post: 'web' } } }
    ]
  },

  {
    id: 'sp-seed-scan-output-analyze-1', cert: 'secplus', objective: '4.3', topic: 'Security tooling',
    title: 'Port scan vs vulnerability scan', estMinutes: 3,
    scenario: 'Two tool outputs are shown. Click the single output that is from a port scan (not a vulnerability scan).',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the line that represents port-scan output.',
        explanation: 'A port scan reports open ports and the service/state on each (e.g., "443/tcp open https"). A vulnerability scan reports named weaknesses with severity (CVE + CVSS). The bare open-port/state line is the port-scan output.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: '443/tcp  open  https' },
            { id: 'l2', text: 'CVE-2023-4567  Outdated OpenSSL  CVSS 7.5 (High)' },
            { id: 'l3', text: 'Plugin: Weak cipher suites detected (Medium)' },
            { id: 'l4', text: 'Finding: Default credentials in use (Critical)' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sp-seed-iam-match-1', cert: 'secplus', objective: '4.6', topic: 'Identity and access',
    title: 'Match the IAM concept', estMinutes: 4,
    scenario: 'Match each identity and access-management concept to its definition.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each concept with its meaning.',
        explanation: 'Authentication proves who you are. Authorization decides what you can access. Accounting (auditing) records what you did. SSO lets one login grant access to many systems. MFA requires two or more distinct factors.',
        payload: {
          left: [
            { id: 'authn', label: 'Authentication' },
            { id: 'authz', label: 'Authorization' },
            { id: 'acct', label: 'Accounting' },
            { id: 'sso', label: 'Single sign-on (SSO)' },
            { id: 'mfa', label: 'Multifactor authentication (MFA)' }
          ],
          right: [
            { id: 'dwho', label: 'Proves who you are' },
            { id: 'dwhat', label: 'Decides what you are allowed to access' },
            { id: 'ddid', label: 'Records what you did' },
            { id: 'dmany', label: 'One login grants access to many systems' },
            { id: 'dfactors', label: 'Requires two or more distinct factors' }
          ]
        },
        answer: { pairs: { authn: 'dwho', authz: 'dwhat', acct: 'ddid', sso: 'dmany', mfa: 'dfactors' } } }
    ]
  },

  {
    id: 'sp-seed-mfa-factors-cat-1', cert: 'secplus', objective: '4.6', topic: 'Authentication factors',
    title: 'Classify the authentication factor', estMinutes: 3,
    scenario: 'Sort each authenticator by the factor category it belongs to.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each item under Something you know, Something you have, or Something you are.',
        explanation: 'A password or PIN is something you know. A hardware token or smartphone authenticator app is something you have. A fingerprint or retina scan is something you are (biometric).',
        payload: {
          items: [
            { id: 'pwd', label: 'Password' },
            { id: 'pin', label: 'PIN' },
            { id: 'token', label: 'Hardware security token' },
            { id: 'app', label: 'Authenticator app on a phone' },
            { id: 'finger', label: 'Fingerprint' },
            { id: 'retina', label: 'Retina scan' }
          ],
          buckets: [
            { id: 'know', label: 'Something you know' },
            { id: 'have', label: 'Something you have' },
            { id: 'are', label: 'Something you are' }
          ]
        },
        answer: { map: { pwd: 'know', pin: 'know', token: 'have', app: 'have', finger: 'are', retina: 'are' } } }
    ]
  },

  {
    id: 'sp-seed-firewall-analyze-1', cert: 'secplus', objective: '4.5', topic: 'Firewall rules',
    title: 'Find the overly permissive rule', estMinutes: 3,
    scenario: 'A firewall rule set is shown. Click the single rule that is the most dangerously permissive.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the most dangerously permissive rule.',
        explanation: 'A rule that allows ANY source to ANY destination on ANY port violates least privilege and effectively disables the firewall. The other rules scope source, destination, and port narrowly.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'ALLOW src=10.0.1.0/24 dst=10.0.2.10 port=443' },
            { id: 'l2', text: 'ALLOW src=ANY dst=ANY port=ANY' },
            { id: 'l3', text: 'ALLOW src=10.0.1.5 dst=10.0.2.20 port=22' },
            { id: 'l4', text: 'DENY  src=ANY dst=10.0.3.0/24 port=ANY' }
          ]
        },
        answer: { selected: ['l2'] } }
    ]
  },

  {
    id: 'sp-seed-backup-cat-1', cert: 'secplus', objective: '3.4', topic: 'Resilience and backups',
    title: 'Classify the backup type', estMinutes: 3,
    scenario: 'Sort each backup behavior into full, incremental, or differential.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each description under Full, Incremental, or Differential.',
        explanation: 'A full backup copies all selected data. An incremental backup copies only data changed since the last backup of any type (full or incremental). A differential backup copies all data changed since the last full backup, so it grows each day until the next full.',
        payload: {
          items: [
            { id: 'all', label: 'Copies all selected data every time' },
            { id: 'sincelast', label: 'Copies only data changed since the last backup of any type' },
            { id: 'sincefull', label: 'Copies all data changed since the last full backup' }
          ],
          buckets: [
            { id: 'full', label: 'Full' },
            { id: 'incr', label: 'Incremental' },
            { id: 'diff', label: 'Differential' }
          ]
        },
        answer: { map: { all: 'full', sincelast: 'incr', sincefull: 'diff' } } }
    ]
  },

  // ===== Domain 5 — Security Program Management & Oversight (~4) =====
  {
    id: 'sp-seed-risk-treatment-match-1', cert: 'secplus', objective: '5.2', topic: 'Risk management',
    title: 'Match the risk-treatment strategy', estMinutes: 4,
    scenario: 'Match each risk-treatment response to the action that represents it.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each strategy with the action that represents it.',
        explanation: 'Mitigate (reduce) lowers likelihood or impact with a control. Transfer shifts the risk to a third party, e.g., insurance. Avoid stops the risky activity entirely. Accept acknowledges the risk and takes no further action.',
        payload: {
          left: [
            { id: 'mitigate', label: 'Mitigate' },
            { id: 'transfer', label: 'Transfer' },
            { id: 'avoid', label: 'Avoid' },
            { id: 'accept', label: 'Accept' }
          ],
          right: [
            { id: 'dcontrol', label: 'Deploy a control to reduce likelihood or impact' },
            { id: 'dinsure', label: 'Buy cyber-insurance to shift the loss to an insurer' },
            { id: 'dstop', label: 'Discontinue the risky activity entirely' },
            { id: 'dnoaction', label: 'Acknowledge the risk and take no further action' }
          ]
        },
        answer: { pairs: { mitigate: 'dcontrol', transfer: 'dinsure', avoid: 'dstop', accept: 'dnoaction' } } }
    ]
  },

  {
    id: 'sp-seed-agreements-match-1', cert: 'secplus', objective: '5.3', topic: 'Vendor agreements',
    title: 'Match the agreement type', estMinutes: 4,
    scenario: 'Match each third-party agreement acronym to its purpose.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each agreement with its purpose.',
        explanation: 'An SLA defines the measurable service levels a provider must meet. An MOU is a non-binding statement of intent between parties. An NDA legally protects shared confidential information. A BPA governs a business partnership. An MSA sets the overarching terms for future contracts.',
        payload: {
          left: [
            { id: 'sla', label: 'SLA' },
            { id: 'mou', label: 'MOU' },
            { id: 'nda', label: 'NDA' },
            { id: 'bpa', label: 'BPA' },
            { id: 'msa', label: 'MSA' }
          ],
          right: [
            { id: 'dlevels', label: 'Defines measurable service levels to be met' },
            { id: 'dintent', label: 'Non-binding statement of intent between parties' },
            { id: 'dconfid', label: 'Legally protects shared confidential information' },
            { id: 'dpartner', label: 'Governs a business partnership' },
            { id: 'dmaster', label: 'Sets overarching terms for future contracts' }
          ]
        },
        answer: { pairs: { sla: 'dlevels', mou: 'dintent', nda: 'dconfid', bpa: 'dpartner', msa: 'dmaster' } } }
    ]
  },

  {
    id: 'sp-seed-data-roles-match-1', cert: 'secplus', objective: '5.1', topic: 'Data governance',
    title: 'Match the data-governance role', estMinutes: 3,
    scenario: 'Match each data-governance role to its responsibility.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each role with its responsibility.',
        explanation: 'The data owner is accountable for the data and sets its classification. The data controller determines the purposes and means of processing. The data processor processes data on behalf of the controller. The data custodian implements the technical handling and protection. The data steward manages day-to-day data quality and policy compliance.',
        payload: {
          left: [
            { id: 'owner', label: 'Data owner' },
            { id: 'controller', label: 'Data controller' },
            { id: 'processor', label: 'Data processor' },
            { id: 'custodian', label: 'Data custodian' },
            { id: 'steward', label: 'Data steward' }
          ],
          right: [
            { id: 'daccount', label: 'Accountable for the data; sets classification' },
            { id: 'dpurpose', label: 'Determines the purposes and means of processing' },
            { id: 'dbehalf', label: 'Processes data on behalf of the controller' },
            { id: 'dtech', label: 'Implements technical handling and protection' },
            { id: 'dquality', label: 'Manages day-to-day data quality and compliance' }
          ]
        },
        // Reviewed (security-eng + CompTIA examiner): SY0-701 split confirmed — custodian = technical handling, steward = data quality/policy; mapping is exam-safe.
        answer: { pairs: { owner: 'daccount', controller: 'dpurpose', processor: 'dbehalf', custodian: 'dtech', steward: 'dquality' } } }
    ]
  },

  {
    id: 'sp-seed-bcdr-fillin-1', cert: 'secplus', objective: '3.4', topic: 'BC/DR metrics',
    title: 'Recovery objectives and SLE', estMinutes: 4,
    scenario: 'A business-impact analysis asks you to define two recovery metrics and compute one risk figure. Answer all fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What metric defines the maximum acceptable downtime before a process must be restored? (acronym)',
        explanation: 'RTO (Recovery Time Objective) is the maximum tolerable time to restore a service after an outage.',
        payload: { fields: [{ id: 'rto', label: 'Acronym', inputmode: 'text' }] },
        answer: { rto: ['RTO', 'recovery time objective'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'What metric defines the maximum acceptable amount of data loss measured in time? (acronym)',
        explanation: 'RPO (Recovery Point Objective) is the maximum amount of data, measured in time, that can be lost — it drives backup frequency.',
        payload: { fields: [{ id: 'rpo', label: 'Acronym', inputmode: 'text' }] },
        answer: { rpo: ['RPO', 'recovery point objective'] } },
      { id: 's3', type: 'fillin', points: 1,
        prompt: 'An asset is valued at $50,000 and an incident would destroy 40% of its value. What is the single loss expectancy (SLE) in dollars?',
        explanation: 'SLE = Asset Value × Exposure Factor = $50,000 × 0.40 = $20,000.',
        payload: { fields: [{ id: 'sle', label: 'SLE (USD)', inputmode: 'numeric' }] },
        answer: { sle: ['20000', '$20000', '20,000', '$20,000'] } }
    ]
  },

  // ========================================================================
  // ===== APPENDED 26 NEW SCENARIOS (DRAFT — founder verification) ==========
  // ========================================================================

  // ===== Domain 1 — General Security Concepts (+2) =====
  {
    id: 'sp-seed-zerotrust-match-1', cert: 'secplus', objective: '1.2', topic: 'Zero Trust',
    title: 'Match the Zero Trust component', estMinutes: 4,
    scenario: 'SY0-701 splits Zero Trust into a Control Plane and a Data Plane. Match each Zero Trust component to its role.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each Zero Trust component with its function.',
        explanation: 'The Policy Engine decides whether to grant access using policy and signals. The Policy Administrator establishes or terminates the connection based on that decision. The Policy Enforcement Point (PEP) is the gateway that enforces the decision on the data plane. Adaptive identity adjusts trust based on context (location, device, behavior).',
        payload: {
          left: [
            { id: 'pe', label: 'Policy Engine' },
            { id: 'pa', label: 'Policy Administrator' },
            { id: 'pep', label: 'Policy Enforcement Point' },
            { id: 'adapt', label: 'Adaptive identity' }
          ],
          right: [
            { id: 'ddecide', label: 'Decides to grant access using policy and signals' },
            { id: 'dconnect', label: 'Establishes or terminates the connection per the decision' },
            { id: 'dgateway', label: 'Gateway that enforces the decision on the data plane' },
            { id: 'dcontext', label: 'Adjusts trust based on context such as location or device' }
          ]
        },
        answer: { pairs: { pe: 'ddecide', pa: 'dconnect', pep: 'dgateway', adapt: 'dcontext' } } }
    ]
  },

  {
    id: 'sp-seed-deception-cat-1', cert: 'secplus', objective: '1.2', topic: 'Deception technology',
    title: 'Classify the deception technique', estMinutes: 3,
    scenario: 'Sort each deception/disruption technology by what it actually is.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each item under Single decoy, Decoy network, or Bait data.',
        explanation: 'A honeypot is a single decoy host that lures and observes attackers. A honeynet is a network of honeypots that mimics a real environment. A honeyfile is bait data — a tempting file that should never be opened. A honeytoken is bait data too — a fake credential or record that signals misuse when used.',
        payload: {
          items: [
            { id: 'hpot', label: 'Honeypot' },
            { id: 'hnet', label: 'Honeynet' },
            { id: 'hfile', label: 'Honeyfile' },
            { id: 'htoken', label: 'Honeytoken' }
          ],
          buckets: [
            { id: 'decoy1', label: 'Single decoy host' },
            { id: 'decoynet', label: 'Decoy network' },
            { id: 'bait', label: 'Bait data' }
          ]
        },
        answer: { map: { hpot: 'decoy1', hnet: 'decoynet', hfile: 'bait', htoken: 'bait' } } }
    ]
  },

  // ===== Domain 2 — Threats, Vulnerabilities & Mitigations (+6) =====
  {
    id: 'sp-seed-vulnmgmt-order-1', cert: 'secplus', objective: '4.3', topic: 'Vulnerability management',
    title: 'Order the vulnerability-management lifecycle', estMinutes: 4,
    scenario: 'Your team runs a recurring vulnerability-management program. Put the lifecycle stages in order, first stage at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the vulnerability-management stages in order.',
        explanation: 'Identify the assets and scan to discover vulnerabilities, analyze and prioritize the findings (e.g., by CVSS and context), remediate or otherwise treat them, validate that the fix worked (rescan), and report/monitor on an ongoing basis.',
        payload: { items: [
          { id: 'remediate', label: 'Remediate the prioritized vulnerabilities' },
          { id: 'identify', label: 'Identify assets and scan for vulnerabilities' },
          { id: 'report', label: 'Report and continuously monitor' },
          { id: 'analyze', label: 'Analyze and prioritize the findings' },
          { id: 'validate', label: 'Validate the fix by rescanning' }
        ] },
        answer: { correctOrder: ['identify', 'analyze', 'remediate', 'validate', 'report'] } }
    ]
  },

  {
    id: 'sp-seed-vulntypes-match-1', cert: 'secplus', objective: '2.3', topic: 'Vulnerability types',
    title: 'Match the vulnerability type', estMinutes: 4,
    scenario: 'Match each vulnerability to its precise definition.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each vulnerability with its definition.',
        explanation: 'A zero-day is a flaw exploited before a patch exists. A race condition (TOCTOU) exploits the gap between check and use. A misconfiguration is an insecure setting left in place. Improper input validation lets untrusted data reach sensitive logic. A legacy/EOL system no longer receives security updates.',
        payload: {
          left: [
            { id: 'zeroday', label: 'Zero-day' },
            { id: 'race', label: 'Race condition (TOCTOU)' },
            { id: 'misconfig', label: 'Misconfiguration' },
            { id: 'inputval', label: 'Improper input validation' },
            { id: 'legacy', label: 'Legacy / end-of-life system' }
          ],
          right: [
            { id: 'dnopatch', label: 'Flaw exploited before a patch exists' },
            { id: 'dgap', label: 'Exploits the gap between time-of-check and time-of-use' },
            { id: 'dsetting', label: 'An insecure setting left in place' },
            { id: 'duntrusted', label: 'Untrusted data reaches sensitive logic unchecked' },
            { id: 'dnoupdate', label: 'No longer receives security updates' }
          ]
        },
        answer: { pairs: { zeroday: 'dnopatch', race: 'dgap', misconfig: 'dsetting', inputval: 'duntrusted', legacy: 'dnoupdate' } } }
    ]
  },

  {
    id: 'sp-seed-indicators-analyze-1', cert: 'secplus', objective: '2.4', topic: 'Indicators of compromise',
    title: 'Spot the data-exfiltration indicator', estMinutes: 3,
    scenario: 'A host’s monitoring summary is shown. Click the single line that most strongly indicates data exfiltration.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the strongest indicator of data exfiltration.',
        explanation: 'A large sustained outbound transfer to an unknown external host is the classic exfiltration signature. High CPU, a scheduled reboot, and a single failed login are normal or low-signal events by comparison.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'CPU utilization peaked at 78% during nightly backup' },
            { id: 'l2', text: '4.2 GB uploaded to 198.51.100.77 (unknown host) over 3 hours' },
            { id: 'l3', text: 'Scheduled OS reboot completed at 02:00' },
            { id: 'l4', text: 'One failed login for user mfaadmin, then success' }
          ]
        },
        answer: { selected: ['l2'] } }
    ]
  },

  {
    id: 'sp-seed-mitigations-match-1', cert: 'secplus', objective: '2.5', topic: 'Mitigation techniques',
    title: 'Match the mitigation technique', estMinutes: 4,
    scenario: 'Match each enterprise mitigation technique to what it does.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each mitigation with its effect.',
        explanation: 'Segmentation divides the network to limit lateral movement. Allow listing permits only approved applications to run. Least privilege grants only the minimum access required. Patching removes known vulnerabilities. Encryption protects data confidentiality at rest or in transit.',
        payload: {
          left: [
            { id: 'segment', label: 'Segmentation' },
            { id: 'allowlist', label: 'Application allow listing' },
            { id: 'leastpriv', label: 'Least privilege' },
            { id: 'patch', label: 'Patching' },
            { id: 'encrypt', label: 'Encryption' }
          ],
          right: [
            { id: 'dlateral', label: 'Divides the network to limit lateral movement' },
            { id: 'dapproved', label: 'Permits only approved applications to run' },
            { id: 'dminimum', label: 'Grants only the minimum access required' },
            { id: 'dknownvuln', label: 'Removes known vulnerabilities' },
            { id: 'dconfid', label: 'Protects data confidentiality' }
          ]
        },
        answer: { pairs: { segment: 'dlateral', allowlist: 'dapproved', leastpriv: 'dminimum', patch: 'dknownvuln', encrypt: 'dconfid' } } }
    ]
  },

  {
    id: 'sp-seed-attacksurface-cat-1', cert: 'secplus', objective: '2.4', topic: 'Network attacks',
    title: 'Classify the network attack', estMinutes: 4,
    scenario: 'Sort each attack by its category: on-path/spoofing, denial-of-service, or wireless.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each attack under On-path / spoofing, Denial of service, or Wireless.',
        explanation: 'ARP poisoning and DNS spoofing redirect traffic by falsifying address mappings (on-path/spoofing). A SYN flood and an amplified DDoS exhaust resources (denial of service). An evil twin and a deauthentication attack target Wi-Fi clients (wireless).',
        payload: {
          items: [
            { id: 'arp', label: 'ARP poisoning' },
            { id: 'dns', label: 'DNS spoofing' },
            { id: 'syn', label: 'SYN flood' },
            { id: 'ddos', label: 'Amplified DDoS' },
            { id: 'eviltwin', label: 'Evil twin access point' },
            { id: 'deauth', label: 'Deauthentication attack' }
          ],
          buckets: [
            { id: 'onpath', label: 'On-path / spoofing' },
            { id: 'dos', label: 'Denial of service' },
            { id: 'wireless', label: 'Wireless' }
          ]
        },
        answer: { map: { arp: 'onpath', dns: 'onpath', syn: 'dos', ddos: 'dos', eviltwin: 'wireless', deauth: 'wireless' } } }
    ]
  },

  {
    id: 'sp-seed-cvss-fillin-1', cert: 'secplus', objective: '4.3', topic: 'Vulnerability scoring',
    title: 'Read the CVSS severity bands', estMinutes: 3,
    scenario: 'A finding carries a CVSS v3.1 base score of 7.5. Answer both fields about CVSS severity.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What qualitative severity rating does a CVSS v3.1 base score of 7.5 fall into?',
        explanation: 'CVSS v3.1 bands: 0.0 None, 0.1–3.9 Low, 4.0–6.9 Medium, 7.0–8.9 High, 9.0–10.0 Critical. 7.5 is High.',
        payload: { fields: [{ id: 'rating', label: 'Severity rating', inputmode: 'text' }] },
        answer: { rating: ['High', 'high'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'What is the lowest base score that is rated Critical?',
        explanation: 'The Critical band begins at 9.0 and runs through 10.0.',
        payload: { fields: [{ id: 'crit', label: 'Lowest Critical score', inputmode: 'decimal' }] },
        answer: { crit: ['9.0', '9'] } }
    ]
  },

  // ===== Domain 3 — Security Architecture (+7) =====
  {
    id: 'sp-seed-cloudresp-cat-1', cert: 'secplus', objective: '3.1', topic: 'Cloud responsibility',
    title: 'Categorize cloud responsibility', estMinutes: 4,
    scenario: 'Under the shared responsibility model, sort each responsibility by who owns it across IaaS. Then think about the model boundary.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'In an IaaS deployment, place each responsibility under Customer or Cloud provider.',
        explanation: 'In IaaS the provider owns the physical datacenter, host hardware, and the virtualization/hypervisor layer. The customer owns the guest operating system, applications, and their own data. The customer always owns their data regardless of service model.',
        payload: {
          items: [
            { id: 'datacenter', label: 'Physical datacenter security' },
            { id: 'hypervisor', label: 'Hypervisor / virtualization layer' },
            { id: 'guestos', label: 'Guest operating system patching' },
            { id: 'app', label: 'Application configuration' },
            { id: 'custdata', label: 'Customer data' },
            { id: 'hardware', label: 'Host hardware' }
          ],
          buckets: [
            { id: 'customer', label: 'Customer' },
            { id: 'provider', label: 'Cloud provider' }
          ]
        },
        answer: { map: { datacenter: 'provider', hypervisor: 'provider', guestos: 'customer', app: 'customer', custdata: 'customer', hardware: 'provider' } } }
    ]
  },

  {
    id: 'sp-seed-cloudmodels-match-1', cert: 'secplus', objective: '3.1', topic: 'Cloud service models',
    title: 'Match the cloud service model', estMinutes: 3,
    scenario: 'Match each cloud-computing term to its meaning.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each cloud term with its definition.',
        explanation: 'IaaS provides virtualized infrastructure (compute, storage, network). PaaS provides a managed platform to build and run apps. SaaS delivers finished software over the web. A hybrid cloud combines private and public cloud. SASE converges networking and security as a cloud-delivered service.',
        payload: {
          left: [
            { id: 'iaas', label: 'IaaS' },
            { id: 'paas', label: 'PaaS' },
            { id: 'saas', label: 'SaaS' },
            { id: 'hybrid', label: 'Hybrid cloud' },
            { id: 'sase', label: 'SASE' }
          ],
          right: [
            { id: 'dinfra', label: 'Virtualized infrastructure (compute, storage, network)' },
            { id: 'dplatform', label: 'Managed platform to build and run apps' },
            { id: 'dsoftware', label: 'Finished software delivered over the web' },
            { id: 'dcombo', label: 'Combines private and public cloud' },
            { id: 'dconverge', label: 'Cloud-delivered convergence of networking and security' }
          ]
        },
        answer: { pairs: { iaas: 'dinfra', paas: 'dplatform', saas: 'dsoftware', hybrid: 'dcombo', sase: 'dconverge' } } }
    ]
  },

  {
    id: 'sp-seed-enclevels-cat-1', cert: 'secplus', objective: '1.4', topic: 'Encryption levels',
    title: 'Categorize the encryption level', estMinutes: 4,
    scenario: 'Encryption can be applied at different levels. Sort each scenario by the level of encryption it describes.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each item under Full-disk, File, Database, or Transport.',
        explanation: 'Full-disk encryption (e.g., BitLocker) protects the entire volume at rest. File-level encryption protects an individual file or folder. Database encryption (e.g., TDE) protects data inside the database. Transport encryption (e.g., TLS) protects data while it moves across the network.',
        payload: {
          items: [
            { id: 'bitlocker', label: 'BitLocker encrypting an entire laptop volume' },
            { id: 'efs', label: 'Encrypting a single sensitive document' },
            { id: 'tde', label: 'Transparent data encryption on a SQL table' },
            { id: 'tls', label: 'TLS protecting data between browser and server' }
          ],
          buckets: [
            { id: 'fde', label: 'Full-disk' },
            { id: 'filelvl', label: 'File' },
            { id: 'dblvl', label: 'Database' },
            { id: 'transport', label: 'Transport' }
          ]
        },
        answer: { map: { bitlocker: 'fde', efs: 'filelvl', tde: 'dblvl', tls: 'transport' } } }
    ]
  },

  {
    id: 'sp-seed-appliances-match-1', cert: 'secplus', objective: '3.2', topic: 'Network appliances',
    title: 'Match the network security appliance', estMinutes: 4,
    scenario: 'Match each network security appliance to its primary role.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each appliance with its primary role.',
        explanation: 'A next-generation firewall (NGFW) adds application awareness and deep inspection to traditional filtering. A WAF protects web applications from attacks like SQLi and XSS. A forward proxy mediates outbound user requests. An IDS detects and alerts on malicious traffic. An IPS detects and actively blocks malicious traffic inline.',
        payload: {
          left: [
            { id: 'ngfw', label: 'NGFW' },
            { id: 'waf', label: 'WAF' },
            { id: 'proxy', label: 'Forward proxy' },
            { id: 'ids', label: 'IDS' },
            { id: 'ips', label: 'IPS' }
          ],
          right: [
            { id: 'dappaware', label: 'Application-aware filtering with deep inspection' },
            { id: 'dweb', label: 'Protects web apps from SQLi and XSS' },
            { id: 'doutbound', label: 'Mediates outbound user requests' },
            { id: 'dalert', label: 'Detects and alerts on malicious traffic' },
            { id: 'dblock', label: 'Detects and actively blocks malicious traffic inline' }
          ]
        },
        answer: { pairs: { ngfw: 'dappaware', waf: 'dweb', proxy: 'doutbound', ids: 'dalert', ips: 'dblock' } } }
    ]
  },

  {
    id: 'sp-seed-wireless-match-1', cert: 'secplus', objective: '4.1', topic: 'Wireless security',
    title: 'Match the wireless security mechanism', estMinutes: 4,
    scenario: 'Match each wireless security mechanism to its description.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each wireless mechanism with its description.',
        explanation: 'WPA2 uses AES-CCMP and the 4-way handshake. WPA3 adds SAE (Simultaneous Authentication of Equals) for stronger handshake protection. EAP-TLS uses client and server certificates for mutual authentication. PEAP wraps an inner EAP method inside a server-side TLS tunnel. A RADIUS server provides centralized AAA for enterprise (802.1X) Wi-Fi.',
        payload: {
          left: [
            { id: 'wpa2', label: 'WPA2' },
            { id: 'wpa3', label: 'WPA3' },
            { id: 'eaptls', label: 'EAP-TLS' },
            { id: 'peap', label: 'PEAP' },
            { id: 'radius', label: 'RADIUS' }
          ],
          right: [
            { id: 'daesccmp', label: 'Uses AES-CCMP and the 4-way handshake' },
            { id: 'dsae', label: 'Adds SAE for stronger handshake protection' },
            { id: 'dcerts', label: 'Uses client and server certificates for mutual auth' },
            { id: 'dtunnel', label: 'Wraps an inner EAP method in a server-side TLS tunnel' },
            { id: 'daaa', label: 'Centralized AAA for enterprise 802.1X Wi-Fi' }
          ]
        },
        answer: { pairs: { wpa2: 'daesccmp', wpa3: 'dsae', eaptls: 'dcerts', peap: 'dtunnel', radius: 'daaa' } } }
    ]
  },

  {
    id: 'sp-seed-hardening-match-1', cert: 'secplus', objective: '2.5', topic: 'Hardening',
    title: 'Match the hardening technique', estMinutes: 4,
    scenario: 'Match each system-hardening technique to its purpose.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each hardening technique with its purpose.',
        explanation: 'Disabling unused services and ports shrinks the attack surface. Changing default credentials removes a well-known entry point. Applying a security baseline enforces a known-good configuration. Host-based firewalling restricts traffic at the endpoint. Removing unnecessary software eliminates code that could be exploited.',
        payload: {
          left: [
            { id: 'disable', label: 'Disable unused services and ports' },
            { id: 'defcred', label: 'Change default credentials' },
            { id: 'baseline', label: 'Apply a security baseline' },
            { id: 'hostfw', label: 'Host-based firewall' },
            { id: 'debloat', label: 'Remove unnecessary software' }
          ],
          right: [
            { id: 'dsurface', label: 'Shrinks the attack surface' },
            { id: 'dwellknown', label: 'Removes a well-known entry point' },
            { id: 'dknowngood', label: 'Enforces a known-good configuration' },
            { id: 'dendpoint', label: 'Restricts traffic at the endpoint' },
            { id: 'dcode', label: 'Eliminates code that could be exploited' }
          ]
        },
        answer: { pairs: { disable: 'dsurface', defcred: 'dwellknown', baseline: 'dknowngood', hostfw: 'dendpoint', debloat: 'dcode' } } }
    ]
  },

  {
    id: 'sp-seed-screened-fillin-1', cert: 'secplus', objective: '3.1', topic: 'Network segmentation',
    title: 'Plan the screened subnet', estMinutes: 4,
    scenario: 'You are deploying a screened subnet (DMZ) for public services. Answer both conceptual fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What is the older two-word name for the screened subnet that sits between the internet and the internal network? (the common acronym)',
        explanation: 'The screened subnet was historically called the DMZ (demilitarized zone) — a buffer network for internet-facing hosts between the untrusted internet and the trusted internal LAN.',
        payload: { fields: [{ id: 'dmz', label: 'Acronym', inputmode: 'text' }] },
        answer: { dmz: ['DMZ', 'dmz', 'demilitarized zone'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'A web server in the screened subnet is compromised. What network design property limits the attacker from reaching internal databases? (one word)',
        explanation: 'Segmentation (network segmentation) isolates the screened subnet from the internal network, so a compromised DMZ host cannot freely reach internal systems.',
        payload: { fields: [{ id: 'seg', label: 'One word', inputmode: 'text' }] },
        // Reviewed (CompTIA examiner): SY0-701 keys "segmentation"; "isolation" is a distractor (air-gap/quarantine) and is NOT accepted in exam mode.
        answer: { seg: ['segmentation', 'segment'] } }
    ]
  },

  // ===== Domain 4 — Security Operations (+7) =====
  {
    id: 'sp-seed-change-order-1', cert: 'secplus', objective: '1.3', topic: 'Change management',
    title: 'Order the change-management process', estMinutes: 4,
    scenario: 'A standard change must move through your change-management process. Put the steps in order, first step at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the change-management steps in order.',
        explanation: 'Submit a change request, have the Change Advisory Board (CAB) review and approve it, test the change in a non-production environment, implement it during the approved maintenance window with a backout plan ready, then document the change. Approval precedes testing and implementation.',
        payload: { items: [
          { id: 'test', label: 'Test the change in a non-production environment' },
          { id: 'request', label: 'Submit the change request' },
          { id: 'document', label: 'Document the completed change' },
          { id: 'approve', label: 'CAB reviews and approves the request' },
          { id: 'implement', label: 'Implement during the maintenance window' }
        ] },
        answer: { correctOrder: ['request', 'approve', 'test', 'implement', 'document'] } }
    ]
  },

  {
    id: 'sp-seed-forensics-order-1', cert: 'secplus', objective: '4.8', topic: 'Digital forensics',
    title: 'Order the forensic evidence-handling flow', estMinutes: 4,
    scenario: 'You are handling digital evidence after an incident. Put the forensic process in order, first step at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the digital-forensics steps in order.',
        explanation: 'Identify the relevant evidence, acquire it (create a forensic image), preserve it and maintain chain of custody, analyze the preserved copy, then report the findings. Acquisition and preservation precede analysis so the original is never altered.',
        payload: { items: [
          { id: 'analyze', label: 'Analyze the preserved copy' },
          { id: 'identify', label: 'Identify the relevant evidence' },
          { id: 'report', label: 'Report the findings' },
          { id: 'acquire', label: 'Acquire (image) the evidence' },
          { id: 'preserve', label: 'Preserve evidence and maintain chain of custody' }
        ] },
        answer: { correctOrder: ['identify', 'acquire', 'preserve', 'analyze', 'report'] } }
    ]
  },

  {
    id: 'sp-seed-volatility-order-1', cert: 'secplus', objective: '4.8', topic: 'Order of volatility',
    title: 'Order of volatility for evidence collection', estMinutes: 4,
    scenario: 'When collecting forensic evidence you collect the most volatile data first. Order these sources from MOST volatile (top) to LEAST volatile (bottom).',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the sources from most volatile to least volatile.',
        explanation: 'Order of volatility (most → least): CPU registers and cache, RAM (memory/running state), network/temp swap, disk/drive contents, then archival media such as backups. The most ephemeral data must be captured first before it is lost.',
        payload: { items: [
          { id: 'disk', label: 'Disk / drive contents' },
          { id: 'registers', label: 'CPU registers and cache' },
          { id: 'archive', label: 'Archival media (backups)' },
          { id: 'ram', label: 'RAM (running memory)' },
          { id: 'swap', label: 'Temporary swap / network state' }
        ] },
        answer: { correctOrder: ['registers', 'ram', 'swap', 'disk', 'archive'] } }
    ]
  },

  {
    id: 'sp-seed-siem-match-1', cert: 'secplus', objective: '4.4', topic: 'SIEM and log sources',
    title: 'Match the SIEM log source', estMinutes: 4,
    scenario: 'A SIEM ingests data from many sources. Match each log/data source to what it provides.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each source with what it provides to the SIEM.',
        explanation: 'Firewall logs show allowed/denied connections. Endpoint (EDR) telemetry shows process and host behavior. Authentication logs show login successes and failures. NetFlow shows traffic volume and conversations (who talked to whom). Vulnerability scan output shows weaknesses present on assets.',
        payload: {
          left: [
            { id: 'fwlog', label: 'Firewall logs' },
            { id: 'edr', label: 'Endpoint (EDR) telemetry' },
            { id: 'authlog', label: 'Authentication logs' },
            { id: 'netflow', label: 'NetFlow' },
            { id: 'vulnscan', label: 'Vulnerability scan output' }
          ],
          right: [
            { id: 'dconnections', label: 'Allowed and denied connections' },
            { id: 'dprocess', label: 'Process and host behavior' },
            { id: 'dlogins', label: 'Login successes and failures' },
            { id: 'dconvo', label: 'Traffic volume and conversations' },
            { id: 'dweakness', label: 'Weaknesses present on assets' }
          ]
        },
        answer: { pairs: { fwlog: 'dconnections', edr: 'dprocess', authlog: 'dlogins', netflow: 'dconvo', vulnscan: 'dweakness' } } }
    ]
  },

  {
    id: 'sp-seed-bruteforce-analyze-1', cert: 'secplus', objective: '4.4', topic: 'Log analysis',
    title: 'Identify the attack from the auth log', estMinutes: 3,
    scenario: 'An authentication log excerpt is shown. Click the single line that reveals the attack type in progress.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the line that identifies the attack.',
        explanation: 'Many rapid failed logins for one account from one source, followed by a success, is a brute-force/password-guessing attack that succeeded. The other lines are routine single events or normal administrative activity.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: '09:14 Accepted password for svc_backup from 10.0.0.4' },
            { id: 'l2', text: '09:15–09:16 187 failed passwords for admin from 203.0.113.9, then Accepted' },
            { id: 'l3', text: '09:20 sudo: jdoe ran /usr/bin/apt update' },
            { id: 'l4', text: '09:22 Session opened for user mraley (MFA verified)' }
          ]
        },
        answer: { selected: ['l2'] } }
    ]
  },

  {
    id: 'sp-seed-physical-match-1', cert: 'secplus', objective: '1.2', topic: 'Physical controls',
    title: 'Match the physical security control', estMinutes: 4,
    scenario: 'Match each physical security control to its primary purpose.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each physical control with its purpose.',
        explanation: 'Bollards are barriers that stop vehicles from ramming a building. An access control vestibule (mantrap) prevents tailgating by trapping one person at a time. A security guard provides human detection and response. CCTV provides surveillance and detective evidence. A proximity badge reader controls electronic door access.',
        payload: {
          left: [
            { id: 'bollard', label: 'Bollards' },
            { id: 'vestibule', label: 'Access control vestibule' },
            { id: 'guard', label: 'Security guard' },
            { id: 'cctv', label: 'CCTV' },
            { id: 'badge', label: 'Proximity badge reader' }
          ],
          right: [
            { id: 'dvehicle', label: 'Stops vehicles from ramming a building' },
            { id: 'dtailgate', label: 'Prevents tailgating, one person at a time' },
            { id: 'dhuman', label: 'Human detection and response' },
            { id: 'dsurveil', label: 'Surveillance and detective evidence' },
            { id: 'ddooraccess', label: 'Controls electronic door access' }
          ]
        },
        answer: { pairs: { bollard: 'dvehicle', vestibule: 'dtailgate', guard: 'dhuman', cctv: 'dsurveil', badge: 'ddooraccess' } } }
    ]
  },

  {
    id: 'sp-seed-accesscontrol-cat-1', cert: 'secplus', objective: '4.6', topic: 'Access control models',
    title: 'Classify the access control model', estMinutes: 3,
    scenario: 'Sort each access-control example by the model it represents.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each example under RBAC, ABAC, MAC, or DAC.',
        explanation: 'RBAC grants access by job role. ABAC grants access by evaluating attributes (department, time, location). MAC enforces access via system-set labels/clearances that users cannot change. DAC lets the data owner decide who gets access.',
        payload: {
          items: [
            { id: 'role', label: 'Access granted because the user is in the "Nurse" role' },
            { id: 'attr', label: 'Access granted only to Finance staff during business hours' },
            { id: 'label', label: 'Access enforced by Top Secret clearance labels set by the system' },
            { id: 'owner', label: 'The file owner chooses which colleagues may read the file' }
          ],
          buckets: [
            { id: 'rbac', label: 'RBAC' },
            { id: 'abac', label: 'ABAC' },
            { id: 'mac', label: 'MAC' },
            { id: 'dac', label: 'DAC' }
          ]
        },
        answer: { map: { role: 'rbac', attr: 'abac', label: 'mac', owner: 'dac' } } }
    ]
  },

  // ===== Domain 5 — Security Program Management & Oversight (+4) =====
  {
    id: 'sp-seed-dataclass-cat-1', cert: 'secplus', objective: '5.1', topic: 'Data classification',
    title: 'Classify the regulated data type', estMinutes: 4,
    scenario: 'Sort each data example by its inherent type, out of context: PII, PHI, or Financial/PCI.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each data item under PII, PHI, or Financial / PCI.',
        explanation: 'PII identifies a person (SSN, home address). PHI is health information tied to an individual under HIPAA (diagnosis, medical record number). Financial/PCI data covers cardholder and payment data (credit card PAN, bank account number).',
        payload: {
          items: [
            { id: 'ssn', label: 'Social Security number' },
            { id: 'address', label: 'Home address' },
            { id: 'diagnosis', label: 'Patient diagnosis' },
            { id: 'mrn', label: 'Medical record number' },
            { id: 'pan', label: 'Credit card number (PAN)' },
            { id: 'bank', label: 'Bank account number' }
          ],
          buckets: [
            { id: 'pii', label: 'PII' },
            { id: 'phi', label: 'PHI' },
            { id: 'fin', label: 'Financial / PCI' }
          ]
        },
        // Reviewed (CompTIA examiner): stem now specifies "by inherent type, out of context", so SSN/address = PII is exam-safe (they become PHI only inside a medical record).
        answer: { map: { ssn: 'pii', address: 'pii', diagnosis: 'phi', mrn: 'phi', pan: 'fin', bank: 'fin' } } }
    ]
  },

  {
    id: 'sp-seed-riskanalysis-fillin-1', cert: 'secplus', objective: '5.2', topic: 'Quantitative risk',
    title: 'Compute ALE from SLE and ARO', estMinutes: 4,
    scenario: 'A quantitative risk analysis gives you an asset value and an incident frequency. Compute the figures. SLE = AV × EF; ALE = SLE × ARO.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'An asset is worth $80,000 and an incident destroys 25% of its value. What is the SLE in dollars?',
        explanation: 'SLE = Asset Value × Exposure Factor = $80,000 × 0.25 = $20,000.',
        payload: { fields: [{ id: 'sle', label: 'SLE (USD)', inputmode: 'numeric' }] },
        answer: { sle: ['20000', '$20000', '20,000', '$20,000'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'If that incident is expected twice per year (ARO = 2), what is the ALE in dollars?',
        explanation: 'ALE = SLE × ARO = $20,000 × 2 = $40,000 per year.',
        payload: { fields: [{ id: 'ale', label: 'ALE (USD)', inputmode: 'numeric' }] },
        answer: { ale: ['40000', '$40000', '40,000', '$40,000'] } },
      { id: 's3', type: 'fillin', points: 1,
        prompt: 'Does "qualitative" or "quantitative" risk analysis use dollar figures like SLE and ALE? (one word)',
        explanation: 'Quantitative analysis assigns numeric/monetary values (SLE, ARO, ALE). Qualitative analysis uses relative ratings such as high/medium/low.',
        payload: { fields: [{ id: 'kind', label: 'One word', inputmode: 'text' }] },
        answer: { kind: ['quantitative', 'Quantitative'] } }
    ]
  },

  {
    id: 'sp-seed-assessment-match-1', cert: 'secplus', objective: '5.5', topic: 'Audits and assessments',
    title: 'Match the assessment type', estMinutes: 4,
    scenario: 'Match each security assessment or audit type to its description.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each assessment type with its description.',
        explanation: 'A penetration test actively exploits weaknesses to prove impact. A vulnerability assessment identifies weaknesses without exploiting them. An internal audit is performed by the organization’s own staff. An external/third-party audit is performed by an independent party. An attestation is a formal statement that controls meet a standard.',
        payload: {
          left: [
            { id: 'pentest', label: 'Penetration test' },
            { id: 'vulnassess', label: 'Vulnerability assessment' },
            { id: 'internal', label: 'Internal audit' },
            { id: 'external', label: 'External audit' },
            { id: 'attest', label: 'Attestation' }
          ],
          right: [
            { id: 'dexploit', label: 'Actively exploits weaknesses to prove impact' },
            { id: 'dnoexploit', label: 'Identifies weaknesses without exploiting them' },
            { id: 'downstaff', label: 'Performed by the organization’s own staff' },
            { id: 'dindependent', label: 'Performed by an independent third party' },
            { id: 'dstatement', label: 'Formal statement that controls meet a standard' }
          ]
        },
        answer: { pairs: { pentest: 'dexploit', vulnassess: 'dnoexploit', internal: 'downstaff', external: 'dindependent', attest: 'dstatement' } } }
    ]
  },

  {
    id: 'sp-seed-privacy-match-1', cert: 'secplus', objective: '5.1', topic: 'Privacy and governance',
    title: 'Match the governance / privacy term', estMinutes: 4,
    scenario: 'Match each governance or privacy concept to its meaning.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each term with its meaning.',
        explanation: 'GDPR is the EU regulation governing personal-data protection. The right to be forgotten lets a data subject request deletion of their data. Data sovereignty means data is subject to the laws of the country where it resides. Data minimization means collecting only the data you actually need. Anonymization irreversibly strips identifiers so data can no longer be tied to a person.',
        payload: {
          left: [
            { id: 'gdpr', label: 'GDPR' },
            { id: 'rtbf', label: 'Right to be forgotten' },
            { id: 'sovereignty', label: 'Data sovereignty' },
            { id: 'minimization', label: 'Data minimization' },
            { id: 'anon', label: 'Anonymization' }
          ],
          right: [
            { id: 'deureg', label: 'EU regulation governing personal-data protection' },
            { id: 'ddelete', label: 'A subject can request deletion of their data' },
            { id: 'dlaws', label: 'Data is subject to the laws of the country it resides in' },
            { id: 'donlyneed', label: 'Collect only the data you actually need' },
            { id: 'dstrip', label: 'Irreversibly strips identifiers from data' }
          ]
        },
        answer: { pairs: { gdpr: 'deureg', rtbf: 'ddelete', sovereignty: 'dlaws', minimization: 'donlyneed', anon: 'dstrip' } } }
    ]
  },

  // ===== Sec+ Incident Response PBQ bank (Task 13, 2-agent consensus gated) =====
  // 1. Phishing/BEC — Detection & Analysis emphasis
  {
    id: 'sp-ir-bec-wiretransfer', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'BEC wire-transfer fraud', estMinutes: 5, archetype: 'incident',
    scenario: 'The CFO\'s assistant received an email that appeared to come from the CEO, urgently requesting a same-day wire transfer to a "new vendor." The domain was one character off from the real company domain. The assistant initiated the transfer before Accounting flagged it.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'mail', label: 'Spoofed "CEO" email arrives requesting urgent wire transfer', time: 'T+0m', severity: 'med' },
      { id: 's2', icon: 'search', label: 'Assistant does not verify sender domain; replies to confirm details', time: 'T+12m', severity: 'med' },
      { id: 's3', icon: 'bank', label: 'Wire transfer of $42,000 initiated to attacker-controlled account', time: 'T+40m', severity: 'high' },
      { id: 's4', icon: 'alert', label: 'Accounting notices the vendor was never onboarded and halts further payments', time: 'T+70m', severity: 'crit' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'A look-alike domain plus a spoofed executive identity requesting an urgent, unverified wire transfer is the classic pattern for Business Email Compromise (BEC). Given money already left the organization, this is high severity, and the first action is to stop further loss by contacting the bank and freezing the transaction where possible.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'bank', text: 'Contact the bank to attempt to recall or freeze the wire transfer' },
            { id: 'reset', text: 'Reset the CFO assistant\'s email password' },
            { id: 'block', text: 'Block the sender domain at the email gateway' },
            { id: 'train', text: 'Schedule phishing-awareness training for Accounting' }
          ] }
        ] },
        answer: { slots: { sev: 'high', first: 'bank' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'NIST SP 800-61 sequencing: contain the financial loss (bank), then eradicate the vector (block spoofed domain), then recover (verify no other fraudulent payments) before lessons learned (payment-verification procedure).',
        payload: { items: [
          { id: 'a', label: 'Contact the bank to attempt to recall the wire transfer' },
          { id: 'b', label: 'Block the look-alike domain at the email gateway' },
          { id: 'c', label: 'Audit recent outgoing payments for other fraudulent transfers' },
          { id: 'd', label: 'Implement a call-back verification policy for wire requests' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 2. Ransomware — Containment emphasis
  {
    id: 'sp-ir-ransomware-fileserver', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Ransomware on the file server', estMinutes: 5, archetype: 'incident',
    scenario: 'Employees report they can no longer open shared documents. File names on SRV-FILE now end in ".locked" and a ransom note appears in every folder. The backup server on the same VLAN is also showing signs of encryption activity.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'lock', label: 'Users report shared files renamed with .locked extension', time: 'T+0m', severity: 'high' },
      { id: 's2', icon: 'note', label: 'Ransom note found in every network share', time: 'T+5m', severity: 'crit' },
      { id: 's3', icon: 'disk', label: 'Backup server on the same VLAN shows encryption activity starting', time: 'T+9m', severity: 'crit' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'Active ransomware spreading to the backup server is a critical incident — it threatens both production data and recovery capability. The first action must be to isolate the affected segment from the network to stop the encryption from spreading further, before any eradication or recovery work begins.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'isolate', text: 'Isolate SRV-FILE and the backup server from the network' },
            { id: 'restore', text: 'Immediately restore SRV-FILE from the most recent backup' },
            { id: 'pay', text: 'Pay the ransom to get the decryption key' },
            { id: 'patch', text: 'Patch SRV-FILE\'s operating system' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'isolate' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Isolate first to stop the spread, then eradicate the ransomware binary/persistence, then recover from a verified clean, offline backup, and finally document lessons learned (e.g., segmenting backups, tightening RDP/exposed services).',
        payload: { items: [
          { id: 'a', label: 'Isolate the affected servers from the network' },
          { id: 'b', label: 'Identify and remove the ransomware and any persistence mechanisms' },
          { id: 'c', label: 'Restore data from a verified offline/immutable backup' },
          { id: 'd', label: 'Document the incident and segment backups from production' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 3. DDoS — Preparation/Detection emphasis
  {
    id: 'sp-ir-ddos-webstore', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Volumetric DDoS against the storefront', estMinutes: 4, archetype: 'incident',
    scenario: 'The e-commerce site becomes unreachable. Monitoring shows inbound traffic spiking to 40x baseline from thousands of distinct source IPs, all hitting the homepage with identical GET requests. No unusual database queries or file changes are observed.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'chart', label: 'Inbound traffic spikes to 40x normal baseline', time: 'T+0m', severity: 'high' },
      { id: 's2', icon: 'globe', label: 'Thousands of distinct source IPs send identical GET requests', time: 'T+2m', severity: 'high' },
      { id: 's3', icon: 'down', label: 'Web servers become unresponsive; legitimate customers cannot check out', time: 'T+6m', severity: 'crit' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'A volumetric flood from many distinct IPs with no data compromise is a distributed denial-of-service attack against availability. Because the storefront is fully down, this is critical. The first action is to engage upstream DDoS mitigation (scrubbing/rate limiting via the CDN or ISP), not to patch or investigate individual hosts.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'scrub', text: 'Enable upstream DDoS scrubbing / rate limiting via the CDN or ISP' },
            { id: 'reboot', text: 'Reboot the web servers' },
            { id: 'patch', text: 'Patch the web application for SQL injection' },
            { id: 'forensics', text: 'Begin a full disk forensic image of the database server' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'scrub' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by engaging upstream mitigation, eradicate by blackholing/blocking the worst offending sources, recover by confirming normal service, then apply lessons learned by adding a standing DDoS mitigation contract or capacity plan.',
        payload: { items: [
          { id: 'a', label: 'Engage upstream DDoS scrubbing / rate limiting' },
          { id: 'b', label: 'Block or blackhole the highest-volume offending source ranges' },
          { id: 'c', label: 'Confirm the storefront is reachable and responsive again' },
          { id: 'd', label: 'Establish a standing DDoS mitigation service and capacity plan' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 4. Insider threat — Lessons learned emphasis, network reference
  {
    id: 'sp-ir-insider-exfil', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Departing employee data theft', estMinutes: 5, archetype: 'incident',
    scenario: 'A sales engineer submitted their resignation this morning. DLP logs show that last night, from their laptop, the entire customer contract repository was copied to a personal USB drive and uploaded to a personal cloud storage account.',
    assets: { reference: { kind: 'network', devices: [
      { id: 'lap', label: 'SE-LAPTOP', type: 'workstation', zone: 'internal', x: 60, y: 90, state: 'compromised' },
      { id: 'usb', label: 'USB Drive', type: 'device', zone: 'internal', x: 220, y: 90, state: 'affected' },
      { id: 'fs', label: 'CONTRACTS-SHARE', type: 'server', zone: 'internal', x: 60, y: 170, state: 'affected' },
      { id: 'cloud', label: 'Personal Cloud', type: 'external', zone: 'external', x: 400, y: 90, state: 'clean' }
    ], links: [
      { from: 'fs', to: 'lap', kind: 'attack' },
      { from: 'lap', to: 'usb', kind: 'attack' },
      { from: 'lap', to: 'cloud', kind: 'attack' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'A trusted insider exfiltrating an entire contract repository to personal storage right before departure is a high-severity insider threat and data-loss event. The first action is to immediately suspend the employee\'s account and access to prevent further exfiltration, before any conversation or investigation continues.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'suspend', text: 'Immediately suspend the employee\'s account and remote access' },
            { id: 'confront', text: 'Have the employee\'s manager ask them about the USB drive' },
            { id: 'wipe', text: 'Remote-wipe the laptop without preserving evidence' },
            { id: 'ignore', text: 'Wait until the employee\'s last day to review the logs' }
          ] }
        ] },
        answer: { slots: { sev: 'high', first: 'suspend' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by cutting off access, preserve evidence (forensic image) before eradicating anything, involve HR/Legal for the personnel and possible legal action, then update DLP/offboarding policy as the lessons-learned output.',
        payload: { items: [
          { id: 'a', label: 'Suspend account access and revoke remote/VPN sessions' },
          { id: 'b', label: 'Forensically preserve the laptop and DLP logs as evidence' },
          { id: 'c', label: 'Loop in HR and Legal regarding the data theft' },
          { id: 'd', label: 'Update the offboarding checklist and DLP policy' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 5. Malware/C2 beacon — Detection & Analysis emphasis
  {
    id: 'sp-ir-c2-beacon', cert: 'secplus', objective: '4.9', topic: 'Incident Response',
    title: 'Beaconing workstation', estMinutes: 4, archetype: 'incident',
    scenario: 'The SIEM flags a workstation making a DNS query to a newly registered domain every 60 seconds, each time exchanging a small, consistent amount of data. No user is logged in overnight when the beaconing continues.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'radio', label: 'SIEM detects periodic DNS queries to a newly registered domain every 60s', time: 'T+0m', severity: 'med' },
      { id: 's2', icon: 'moon', label: 'Beaconing continues overnight with no user logged in', time: 'T+8h', severity: 'high' },
      { id: 's3', icon: 'data', label: 'Small, consistent data exchange on each beacon suggests command-and-control', time: 'T+8h5m', severity: 'high' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'Regular, low-and-slow beaconing to a newly registered domain with no user activity is a textbook command-and-control (C2) indicator. This is high severity because an attacker likely has a foothold. The first action is to isolate the host from the network to cut off the C2 channel while preserving it for analysis.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'isolate', text: 'Isolate the workstation from the network (keep it powered on)' },
            { id: 'poweroff', text: 'Power off the workstation immediately' },
            { id: 'ignore', text: 'Whitelist the domain since it may be a false positive' },
            { id: 'reimage', text: 'Reimage the workstation right away' }
          ] }
        ] },
        answer: { slots: { sev: 'high', first: 'isolate' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Isolate to stop further C2 traffic while preserving volatile memory for analysis, analyze/eradicate the malware once identified, recover by reimaging or verifying clean, then feed the C2 domain into blocklists as lessons learned.',
        payload: { items: [
          { id: 'a', label: 'Isolate the host from the network without powering it off' },
          { id: 'b', label: 'Capture memory and identify the malware and its persistence mechanism' },
          { id: 'c', label: 'Reimage the host and restore from a known-good state' },
          { id: 'd', label: 'Add the C2 domain to threat intel blocklists' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 6. Web app attack — SQLi — Detection & Analysis emphasis
  {
    id: 'sp-ir-sqli-customerdb', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'SQL injection against the customer portal', estMinutes: 5, archetype: 'incident',
    scenario: 'WAF logs show a login form receiving requests with payloads like `\' OR 1=1--`. Shortly after, the database server logs an unusually large SELECT query returning the entire customers table, executed under the web application\'s service account.',
    assets: { reference: { kind: 'network', devices: [
      { id: 'atk', label: 'Attacker', type: 'external', zone: 'external', x: 40, y: 90, state: 'clean' },
      { id: 'waf', label: 'WAF', type: 'firewall', zone: 'dmz', x: 200, y: 90, state: 'clean' },
      { id: 'web', label: 'WEB-PORTAL', type: 'server', zone: 'dmz', x: 340, y: 90, state: 'affected' },
      { id: 'db', label: 'CUSTOMER-DB', type: 'database', zone: 'internal', x: 480, y: 90, state: 'compromised' }
    ], links: [
      { from: 'atk', to: 'waf', kind: 'attack' },
      { from: 'waf', to: 'web', kind: 'attack' },
      { from: 'web', to: 'db', kind: 'attack' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'A classic SQL injection payload followed by a bulk SELECT that dumped the entire customers table is a critical confirmed data breach. The first action is to take the vulnerable login form/endpoint offline (or block it at the WAF) to stop further injection while the application is fixed.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'block', text: 'Block the vulnerable endpoint at the WAF and take it offline' },
            { id: 'rotate', text: 'Rotate all customer passwords immediately without investigating' },
            { id: 'ignore', text: 'Monitor the endpoint for a few more days to gather evidence' },
            { id: 'delete', text: 'Delete the WAF logs to reduce noise' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'block' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by blocking the vulnerable endpoint, eradicate by patching the injection flaw (parameterized queries), recover by restoring the service and rotating exposed credentials, then notify affected customers/regulators as required and document lessons learned.',
        payload: { items: [
          { id: 'a', label: 'Block the vulnerable endpoint at the WAF' },
          { id: 'b', label: 'Patch the application to use parameterized queries' },
          { id: 'c', label: 'Rotate database credentials and restore the service' },
          { id: 'd', label: 'Notify affected customers per breach-notification requirements' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 7. Web app attack — XSS — Eradication emphasis
  {
    id: 'sp-ir-xss-comments', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Stored XSS harvesting session cookies', estMinutes: 4, archetype: 'incident',
    scenario: 'A support forum\'s comment field was found to store `<script>` tags that quietly send visiting users\' session cookies to an external server. Several customer accounts have since shown logins from unfamiliar locations.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'code', label: 'Malicious script stored in a public comment field', time: 'T-3d', severity: 'med' },
      { id: 's2', icon: 'cookie', label: 'Script silently exfiltrates visiting users\' session cookies', time: 'T-2d', severity: 'high' },
      { id: 's3', icon: 'login', label: 'Multiple customer accounts show logins from unfamiliar locations', time: 'T+0m', severity: 'crit' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'Stored XSS that has already led to session hijacking and unauthorized account access across multiple customers is a critical, active incident. The first action is to remove the malicious comment content and invalidate the stolen sessions so the attacker loses access even before the underlying flaw is patched.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'purge', text: 'Remove the malicious comment content and invalidate active sessions' },
            { id: 'shutdown', text: 'Permanently shut down the forum feature' },
            { id: 'ignore', text: 'Ask affected users to clear their browser cache' },
            { id: 'wait', text: 'Wait for the next scheduled maintenance window to fix it' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'purge' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by purging the payload and killing active sessions, eradicate the root cause by adding output encoding/CSP so injected scripts cannot execute, recover by having affected users re-authenticate, then document input-validation lessons learned.',
        payload: { items: [
          { id: 'a', label: 'Remove the malicious script and invalidate stolen sessions' },
          { id: 'b', label: 'Add output encoding and a Content Security Policy to the comment field' },
          { id: 'c', label: 'Force affected users to re-authenticate and reset passwords' },
          { id: 'd', label: 'Add input-validation testing to the secure development lifecycle' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 8. Credential stuffing / brute force — Forensics & Investigations (data-source selection, chain of custody)
  {
    id: 'sp-ir-credstuffing-login', cert: 'secplus', objective: '4.9', topic: 'Forensics & Investigations',
    title: 'Credential stuffing against the customer login — evidence handling', estMinutes: 4, archetype: 'incident',
    scenario: 'Tens of thousands of login attempts hit the customer login in an hour, using username/password pairs matching a recently leaked third-party breach dump. About 3% succeed. Legal has asked the security team to determine which requests came from which source IPs and to preserve evidence in case law enforcement gets involved.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'list', label: 'Tens of thousands of login attempts in one hour using leaked breach-dump credentials', time: 'T+0m', severity: 'med' },
      { id: 's2', icon: 'unlock', label: 'About 3% of attempts succeed (password reuse)', time: 'T+35m', severity: 'high' },
      { id: 's3', icon: 'key', label: 'Successful logins immediately followed by password-reset requests', time: 'T+36m', severity: 'high' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Select the investigation approach.',
        explanation: 'The application/authentication log is the correct data source here — it records username, source IP, timestamp, and outcome for every login attempt, which is exactly what\'s needed to correlate the attack pattern to specific accounts and sources. Once evidence is identified for a legal hold, the exported log data must be hashed at collection time so its integrity can be proven later; this is the starting point of chain of custody, not an optional extra step.',
        payload: { slots: [
          { id: 'source', label: 'Best data source to correlate attempts to accounts/IPs', options: [
            { id: 'authlog', text: 'Authentication/application logs (username, source IP, timestamp, outcome)' },
            { id: 'dnslog', text: 'DNS resolver query logs' },
            { id: 'netflow', text: 'NetFlow summary records only' },
            { id: 'antivirus', text: 'Endpoint antivirus logs' }
          ] },
          { id: 'first', label: 'First evidence-handling action', options: [
            { id: 'hash', text: 'Export the relevant log data and generate a cryptographic hash of it' },
            { id: 'editlogs', text: 'Edit the log file to remove unrelated entries before saving it' },
            { id: 'emailself', text: 'Email the raw log file to your personal account for safekeeping' },
            { id: 'deleteold', text: 'Delete older log entries to keep the file size manageable' }
          ] }
        ] },
        answer: { slots: { source: 'authlog', first: 'hash' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the evidence-handling steps to preserve a defensible chain of custody.',
        explanation: 'Proper evidence handling: identify and collect the relevant log source first, hash it immediately at collection to prove integrity, document who collected it and when on a chain-of-custody form, then store the original in a access-controlled, tamper-evident location and work only from a copy going forward.',
        payload: { items: [
          { id: 'a', label: 'Identify and export the relevant authentication log records' },
          { id: 'b', label: 'Generate a cryptographic hash of the exported log data' },
          { id: 'c', label: 'Complete a chain-of-custody form documenting collector, time, and hash' },
          { id: 'd', label: 'Store the original in a secured, access-controlled location and analyze only a copy' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 9. Data exfiltration — Recovery emphasis
  {
    id: 'sp-ir-exfil-cloudstorage', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Large outbound transfer to unknown cloud storage', estMinutes: 5, archetype: 'incident',
    scenario: 'DLP alerts on a database server sending 15GB to an unfamiliar cloud storage IP over HTTPS at 3am, well outside the nightly backup window. The transfer used credentials belonging to a service account that should only ever run internal batch jobs.',
    assets: { reference: { kind: 'network', devices: [
      { id: 'db', label: 'DB-PROD', type: 'database', zone: 'internal', x: 60, y: 90, state: 'compromised' },
      { id: 'fw', label: 'FW-EDGE', type: 'firewall', zone: 'dmz', x: 240, y: 90, state: 'clean' },
      { id: 'ext', label: 'Unknown Cloud Storage', type: 'external', zone: 'external', x: 420, y: 90, state: 'clean' }
    ], links: [
      { from: 'db', to: 'fw', kind: 'attack' },
      { from: 'fw', to: 'ext', kind: 'attack' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'A production database sending 15GB to unrecognized external cloud storage at an abnormal hour, using a service account outside its normal behavior, is a critical data-exfiltration event. The first action is to block outbound traffic to that destination and disable the misused service account to stop the ongoing transfer.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'blockeg', text: 'Block outbound traffic to the destination and disable the service account' },
            { id: 'restart', text: 'Restart the database service' },
            { id: 'ignorelog', text: 'Note it for the weekly security review' },
            { id: 'grantmore', text: 'Grant the service account broader access to investigate' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'blockeg' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by cutting the egress path and disabling the compromised credential, eradicate by finding how the credential was obtained (e.g., leaked key) and rotating it, recover by verifying database integrity and restoring least-privilege scope, then tighten egress filtering and DLP rules as lessons learned.',
        payload: { items: [
          { id: 'a', label: 'Block the outbound destination and disable the service account' },
          { id: 'b', label: 'Determine how the credential was compromised and rotate it' },
          { id: 'c', label: 'Verify database integrity and restore least-privilege scope' },
          { id: 'd', label: 'Tighten egress filtering and DLP rules for service accounts' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 10. Supply-chain — Preparation/Detection emphasis
  {
    id: 'sp-ir-supplychain-update', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Malicious vendor software update', estMinutes: 5, archetype: 'incident',
    scenario: 'A routine update from a trusted network-monitoring vendor was pushed to 200 endpoints overnight. The next morning, EDR flags that the updated binary is contacting a command-and-control server not associated with the vendor at all.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'download', label: 'Trusted vendor pushes a routine software update to 200 endpoints', time: 'T-8h', severity: 'low' },
      { id: 's2', icon: 'shield', label: 'EDR flags the updated binary contacting an unrecognized external server', time: 'T+0m', severity: 'crit' },
      { id: 's3', icon: 'network', label: 'The same binary is now present across all 200 endpoints', time: 'T+0m', severity: 'crit' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'A trusted vendor\'s update binary calling out to a server unrelated to that vendor, and already present across 200 machines, is a critical supply-chain compromise — the blast radius is organization-wide. The first action is to halt/roll back the update and block the malicious binary\'s network communication across all affected endpoints.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'rollback', text: 'Roll back the update and block the malicious binary\'s network access org-wide' },
            { id: 'trustvendor', text: 'Contact the vendor and wait for their guidance before acting' },
            { id: 'onehost', text: 'Isolate only the one endpoint that triggered the alert' },
            { id: 'reinstall', text: 'Reinstall the vendor software on all endpoints' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'rollback' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by rolling back the compromised update and blocking its C2 traffic fleet-wide, eradicate by removing the malicious binary from every endpoint, recover by validating a clean vendor build before redeploying, then add software supply-chain vetting (code signing verification, staged rollout) as lessons learned.',
        payload: { items: [
          { id: 'a', label: 'Roll back the update and block the malicious binary\'s C2 traffic fleet-wide' },
          { id: 'b', label: 'Remove the malicious binary from all 200 endpoints' },
          { id: 'c', label: 'Validate a clean vendor build before redeploying' },
          { id: 'd', label: 'Add staged rollout and code-signing verification for vendor updates' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 11. On-path / MITM — Detection & Analysis emphasis, network reference
  {
    id: 'sp-ir-onpath-conference', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'On-path attack at the branch office', estMinutes: 5, archetype: 'incident',
    scenario: 'Staff at a branch office report certificate warnings when reaching internal HR systems. Network captures show ARP tables listing a rogue laptop as the default gateway MAC address, and its traffic is being relayed on to the real gateway after being decrypted and re-encrypted.',
    assets: { reference: { kind: 'network', devices: [
      { id: 'wks', label: 'BRANCH-WKS', type: 'workstation', zone: 'internal', x: 40, y: 90, state: 'affected' },
      { id: 'rogue', label: 'Rogue Laptop', type: 'attacker', zone: 'internal', x: 200, y: 150, state: 'compromised' },
      { id: 'gw', label: 'GW-BRANCH', type: 'router', zone: 'internal', x: 360, y: 90, state: 'clean' },
      { id: 'hr', label: 'HR-APP', type: 'server', zone: 'internal', x: 500, y: 90, state: 'clean' }
    ], links: [
      { from: 'wks', to: 'rogue', kind: 'attack' },
      { from: 'rogue', to: 'gw', kind: 'attack' },
      { from: 'gw', to: 'hr', kind: 'normal' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'ARP spoofing that places a rogue device between clients and the real gateway, decrypting and re-encrypting traffic in transit, is a classic on-path (man-in-the-middle) attack capable of harvesting HR credentials. This is high severity given sensitive HR data is exposed. The first action is to physically or logically remove the rogue device from the network.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'removerogue', text: 'Disconnect the rogue laptop from the network' },
            { id: 'ignorecerts', text: 'Tell users to click through the certificate warnings' },
            { id: 'reboot', text: 'Reboot the branch gateway router' },
            { id: 'patchhr', text: 'Patch the HR application server' }
          ] }
        ] },
        answer: { slots: { sev: 'high', first: 'removerogue' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by removing the rogue device, eradicate by clearing poisoned ARP tables and confirming no other rogue devices exist, recover by having affected users change passwords entered during the attack, then add dynamic ARP inspection / 802.1X port security as lessons learned.',
        payload: { items: [
          { id: 'a', label: 'Disconnect the rogue laptop from the network' },
          { id: 'b', label: 'Clear poisoned ARP tables and sweep for other rogue devices' },
          { id: 'c', label: 'Have affected users change passwords entered during the attack' },
          { id: 'd', label: 'Enable dynamic ARP inspection and 802.1X port security' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 12. DNS poisoning — Containment emphasis
  {
    id: 'sp-ir-dns-poison-portal', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'DNS cache poisoning redirects the employee portal', estMinutes: 4, archetype: 'incident',
    scenario: 'Employees typing the internal HR portal URL are landing on a convincing fake login page that harvests credentials. The internal DNS resolver\'s cache shows the portal\'s hostname now resolves to an external IP address that was never configured by IT.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'dns', label: 'Internal DNS resolver cache shows the portal hostname resolving to an unfamiliar external IP', time: 'T+0m', severity: 'high' },
      { id: 's2', icon: 'globe', label: 'Employees are silently redirected to a fake login page', time: 'T+3m', severity: 'high' },
      { id: 's3', icon: 'key', label: 'Several employees have already entered their credentials on the fake page', time: 'T+15m', severity: 'crit' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'A poisoned DNS cache silently redirecting employees to a credential-harvesting page, with credentials already captured, is a critical incident. The first action is to flush the poisoned DNS cache and correct the record so users stop being redirected before any further credentials are stolen.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'flush', text: 'Flush the poisoned DNS cache and correct the record' },
            { id: 'shutdownportal', text: 'Permanently decommission the HR portal' },
            { id: 'emailall', text: 'Email all employees the new correct URL and take no other action' },
            { id: 'ignoreit', text: 'Wait for the TTL to expire naturally' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'flush' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by flushing and correcting the DNS cache, eradicate by identifying and closing the DNS server vulnerability that allowed poisoning, recover by forcing password resets for anyone who used the fake page, then enable DNSSEC as the lessons-learned control.',
        payload: { items: [
          { id: 'a', label: 'Flush the poisoned DNS cache and correct the record' },
          { id: 'b', label: 'Identify and patch the DNS server vulnerability that allowed poisoning' },
          { id: 'c', label: 'Force password resets for employees who used the fake login page' },
          { id: 'd', label: 'Enable DNSSEC on the internal DNS infrastructure' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 13. Privilege escalation — Eradication emphasis
  {
    id: 'sp-ir-privesc-admin', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Standard user escalates to domain admin', estMinutes: 5, archetype: 'incident',
    scenario: 'A help-desk technician\'s standard account is observed creating a new account and adding it to the Domain Admins group, an action that account has no legitimate reason to perform. The new account then accesses several servers it has never touched before.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'user', label: 'Help-desk standard account creates a new user account', time: 'T+0m', severity: 'med' },
      { id: 's2', icon: 'shield', label: 'New account is added to the Domain Admins group', time: 'T+1m', severity: 'crit' },
      { id: 's3', icon: 'server', label: 'New privileged account accesses multiple servers never touched before', time: 'T+6m', severity: 'crit' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'A low-privilege account performing a privilege-escalation action it has no business reason to perform, followed by that new privileged account touching unfamiliar servers, is a critical compromise — likely exploiting a vulnerability or stolen credentials to gain domain-wide control. The first action is to disable both the compromised account and the newly created rogue admin account.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'disableboth', text: 'Disable both the compromised help-desk account and the rogue admin account' },
            { id: 'reset1', text: 'Just reset the help-desk account\'s password and continue monitoring' },
            { id: 'ignoreacct', text: 'Leave the accounts active to see what else the attacker does' },
            { id: 'promote', text: 'Promote a different account to admin to compare behavior' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'disableboth' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by disabling both accounts, eradicate by finding and patching the privilege-escalation vector (misconfigured ACL or vulnerability) so it cannot be repeated, recover by auditing everything the rogue admin account touched and restoring integrity, then tighten group-membership change alerting as lessons learned.',
        payload: { items: [
          { id: 'a', label: 'Disable the compromised account and the rogue admin account' },
          { id: 'b', label: 'Identify and fix the privilege-escalation vector (misconfigured ACL/vuln)' },
          { id: 'c', label: 'Audit every server the rogue admin account touched and restore integrity' },
          { id: 'd', label: 'Enable real-time alerting on privileged group membership changes' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 14. Phishing/BEC — attachment dropper, single-step triage focus
  {
    id: 'sp-ir-phishing-macro-drop', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Macro-enabled attachment drops a loader', estMinutes: 4, archetype: 'incident',
    scenario: 'An HR employee opened an attachment titled "Candidate_Resume.docm" and enabled macros when prompted. Within a minute, EDR observed the Office process spawning PowerShell, which downloaded a second-stage payload from a paste site.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'mail', label: 'HR employee opens "Candidate_Resume.docm" and enables macros', time: 'T+0m', severity: 'med' },
      { id: 's2', icon: 'terminal', label: 'Office process spawns PowerShell (unusual parent-child relationship)', time: 'T+1m', severity: 'high' },
      { id: 's3', icon: 'download', label: 'PowerShell downloads a second-stage payload from a paste site', time: 'T+1m30s', severity: 'high' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'Office spawning PowerShell right after macros are enabled, followed by a payload download, is a well-known malicious-document infection chain (initial access via phishing, then execution). This is high severity since a second-stage payload is already on the host. The first action is to isolate the workstation from the network before the payload can call out again or spread.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'isolatehost', text: 'Isolate the HR employee\'s workstation from the network' },
            { id: 'deletefile', text: 'Just delete the attachment from the mail server' },
            { id: 'ignorepwsh', text: 'Assume PowerShell activity is normal admin scripting' },
            { id: 'rebootonly', text: 'Reboot the workstation and move on' }
          ] }
        ] },
        answer: { slots: { sev: 'high', first: 'isolatehost' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by isolating the host, eradicate the dropper and any second-stage payload, recover by reimaging or verifying a clean state, then disable Office macros by default org-wide as lessons learned.',
        payload: { items: [
          { id: 'a', label: 'Isolate the workstation from the network' },
          { id: 'b', label: 'Identify and remove the dropper and second-stage payload' },
          { id: 'c', label: 'Reimage the workstation or verify it is clean before returning to service' },
          { id: 'd', label: 'Disable Office macros by default across the organization' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 15. Ransomware — double extortion, network reference
  {
    id: 'sp-ir-ransomware-doubleextortion', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Double-extortion ransomware with data leak threat', estMinutes: 5, archetype: 'incident',
    scenario: 'Overnight, the accounting server was encrypted and a ransom note claims 200GB of financial data was also copied out before encryption, threatening to publish it if payment is not made within 72 hours. Firewall logs confirm a large outbound transfer to an unfamiliar IP just before the encryption began.',
    assets: { reference: { kind: 'network', devices: [
      { id: 'acct', label: 'ACCT-SRV', type: 'server', zone: 'internal', x: 60, y: 90, state: 'compromised' },
      { id: 'fw', label: 'FW-CORE', type: 'firewall', zone: 'dmz', x: 240, y: 90, state: 'clean' },
      { id: 'ext', label: 'Attacker Exfil Host', type: 'external', zone: 'external', x: 420, y: 90, state: 'clean' }
    ], links: [
      { from: 'acct', to: 'fw', kind: 'attack' },
      { from: 'fw', to: 'ext', kind: 'attack' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'Encryption combined with confirmed pre-encryption exfiltration and an extortion threat is double-extortion ransomware — a critical incident involving both availability loss and a confirmed breach. The first action is to isolate the accounting server and block the outbound path to the attacker\'s exfil host to stop any further data loss.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'isolateblock', text: 'Isolate the accounting server and block the outbound exfil path' },
            { id: 'paynow', text: 'Pay the ransom before the 72-hour deadline' },
            { id: 'restorefirst', text: 'Restore from backup immediately without isolating first' },
            { id: 'publicstatement', text: 'Issue a public statement before containing the incident' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'isolateblock' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by isolating the host and blocking exfil, eradicate the ransomware and access used for exfiltration, recover from clean backups once the environment is verified safe, then engage legal/breach-notification obligations given confirmed data theft as part of lessons learned.',
        payload: { items: [
          { id: 'a', label: 'Isolate the server and block the exfiltration path' },
          { id: 'b', label: 'Remove the ransomware and close the access used for exfiltration' },
          { id: 'c', label: 'Restore the server from a verified clean backup' },
          { id: 'd', label: 'Engage legal counsel for breach-notification obligations' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 16. Insider threat — sabotage variant, Recovery emphasis
  {
    id: 'sp-ir-insider-sabotage', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Disgruntled admin deletes production backups', estMinutes: 5, archetype: 'incident',
    scenario: 'A system administrator who was passed over for promotion used their still-active credentials after hours to delete the last 30 days of production database backups. The deletion was discovered the next morning when a routine restore test failed.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'clock', label: 'Admin logs in after hours using still-active credentials', time: 'T-14h', severity: 'med' },
      { id: 's2', icon: 'trash', label: '30 days of production database backups deleted', time: 'T-13h45m', severity: 'crit' },
      { id: 's3', icon: 'alert', label: 'Routine restore test fails the next morning, revealing the deletion', time: 'T+0m', severity: 'crit' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'Deliberate, after-hours deletion of a month of backups by a disgruntled insider is a critical sabotage incident — it directly threatens recovery capability if production data is ever lost. The first action is to revoke that administrator\'s credentials and access immediately to prevent further destructive actions.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'revoke', text: 'Revoke the administrator\'s credentials and access immediately' },
            { id: 'talkfirst', text: 'Schedule a one-on-one conversation before taking any action' },
            { id: 'restoreonly', text: 'Try to restore backups without addressing account access' },
            { id: 'ignorepast', text: 'Take no action since the backups are already gone' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'revoke' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by revoking access, eradicate by auditing for any other destructive actions or lingering access the admin retained, recover by pulling backups from an offsite/immutable copy if one exists and validating integrity, then require offboarding/access-review changes and separation-of-duties for backup deletion as lessons learned.',
        payload: { items: [
          { id: 'a', label: 'Revoke the administrator\'s credentials and access' },
          { id: 'b', label: 'Audit for other destructive actions or retained access' },
          { id: 'c', label: 'Recover backups from an offsite/immutable copy and validate integrity' },
          { id: 'd', label: 'Require approval workflows and offsite immutability for backup deletion' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 17. Malware — worm lateral spread, Containment emphasis, network reference
  {
    id: 'sp-ir-worm-lateral-spread', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Self-propagating worm spreading via SMB', estMinutes: 5, archetype: 'incident',
    scenario: 'Within 20 minutes, three additional workstations became infected after the first one, each exploiting an unpatched SMB vulnerability to spread automatically with no user interaction. The infection rate is accelerating.',
    assets: { reference: { kind: 'network', devices: [
      { id: 'w1', label: 'WKS-01', type: 'workstation', zone: 'internal', x: 40, y: 60, state: 'compromised' },
      { id: 'w2', label: 'WKS-02', type: 'workstation', zone: 'internal', x: 180, y: 60, state: 'compromised' },
      { id: 'w3', label: 'WKS-03', type: 'workstation', zone: 'internal', x: 320, y: 60, state: 'affected' },
      { id: 'w4', label: 'WKS-04', type: 'workstation', zone: 'internal', x: 460, y: 60, state: 'clean' }
    ], links: [
      { from: 'w1', to: 'w2', kind: 'attack' },
      { from: 'w2', to: 'w3', kind: 'attack' },
      { from: 'w3', to: 'w4', kind: 'normal' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'A self-propagating worm exploiting an unpatched SMB vulnerability with no user interaction and an accelerating infection rate is a critical incident that can compromise the entire network quickly. The first action is to segment/disable SMB (or the affected VLAN) network-wide to halt the automatic spread before individual hosts are cleaned.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'blocksmb', text: 'Block or disable SMB network-wide to halt automatic spread' },
            { id: 'cleanone', text: 'Clean only the first infected workstation and monitor' },
            { id: 'patchfirst', text: 'Patch the SMB vulnerability on all hosts before containing anything' },
            { id: 'waitandsee', text: 'Wait to see how many more hosts get infected before acting' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'blocksmb' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by blocking the spreading vector network-wide, eradicate the worm from every infected host, recover by patching the vulnerability before re-enabling SMB, then apply network segmentation as the lessons-learned control to limit future lateral movement.',
        payload: { items: [
          { id: 'a', label: 'Block SMB network-wide to halt the spread' },
          { id: 'b', label: 'Remove the worm from all infected hosts' },
          { id: 'c', label: 'Patch the SMB vulnerability before re-enabling SMB traffic' },
          { id: 'd', label: 'Segment the network to limit future lateral movement' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 18. Web app attack — API abuse / broken access control, Detection emphasis
  {
    id: 'sp-ir-api-idor', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Broken access control exposes other customers\' orders', estMinutes: 4, archetype: 'incident',
    scenario: 'A customer reports that changing an order ID number in the mobile app\'s API URL let them view a stranger\'s order details, including a shipping address and partial card number. Logs show the same technique being used by dozens of sequential requests from one IP over the past hour.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'bug', label: 'Customer reports viewing another customer\'s order by changing the ID in the URL', time: 'T+0m', severity: 'high' },
      { id: 's2', icon: 'list', label: 'Logs show dozens of sequential order-ID requests from one IP over the past hour', time: 'T-1h', severity: 'crit' },
      { id: 's3', icon: 'data', label: 'Exposed data includes shipping addresses and partial card numbers', time: 'T-1h', severity: 'crit' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'An insecure direct object reference (IDOR) letting one user enumerate and view other customers\' orders — already actively exploited for at least an hour, exposing PII and partial payment data — is a critical incident. The first action is to disable or patch the vulnerable API endpoint immediately to stop further data exposure.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'disableapi', text: 'Disable or patch the vulnerable API endpoint immediately' },
            { id: 'thankcustomer', text: 'Thank the reporting customer and take no further action' },
            { id: 'blockip', text: 'Block only the one reporting customer\'s IP address' },
            { id: 'ignoreapi', text: 'Schedule the fix for the next sprint' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'disableapi' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by shutting off the exposed endpoint, eradicate by adding proper authorization checks to every order-lookup call, recover by determining the scope of exposed records and notifying affected customers, then add automated access-control testing as lessons learned.',
        payload: { items: [
          { id: 'a', label: 'Disable or patch the vulnerable API endpoint' },
          { id: 'b', label: 'Add proper authorization checks to all order-lookup calls' },
          { id: 'c', label: 'Determine the scope of exposed records and notify affected customers' },
          { id: 'd', label: 'Add automated access-control testing to the release pipeline' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 19. Credential/password attack — brute force against VPN — Forensics & Investigations (log-source selection, artifact correlation)
  {
    id: 'sp-ir-bruteforce-vpn', cert: 'secplus', objective: '4.9', topic: 'Forensics & Investigations',
    title: 'Brute-force attack against the VPN gateway — investigating scope', estMinutes: 4, archetype: 'incident',
    scenario: 'The VPN concentrator logs show over 5,000 failed login attempts against a single username from one external IP over 30 minutes, followed by one successful authentication using that same username. The investigator now needs to determine what the attacker actually did once inside, and to build a timeline other analysts can reproduce.',
    assets: { reference: { kind: 'network', devices: [
      { id: 'atk', label: 'Attacker', type: 'external', zone: 'external', x: 40, y: 90, state: 'clean' },
      { id: 'vpn', label: 'VPN-GW', type: 'router', zone: 'dmz', x: 240, y: 90, state: 'affected' },
      { id: 'internal', label: 'Internal Network', type: 'network', zone: 'internal', x: 440, y: 90, state: 'clean' }
    ], links: [
      { from: 'atk', to: 'vpn', kind: 'attack' },
      { from: 'vpn', to: 'internal', kind: 'attack' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Select the investigation approach.',
        explanation: 'To see what the attacker did after authenticating — which internal hosts they touched and what actions they took — the investigator needs internal firewall/NetFlow records and endpoint/authentication logs from the systems the session reached, not just the VPN concentrator\'s own login log (which only proves the successful auth, not post-auth activity). Because clocks drift between devices, correlating the VPN log against those other sources first requires normalizing all timestamps to a common reference (e.g., UTC/NTP-synced) so events can be placed on one accurate timeline.',
        payload: { slots: [
          { id: 'source', label: 'Best additional data source for post-authentication activity', options: [
            { id: 'internallogs', text: 'Internal firewall/NetFlow and endpoint logs for hosts reached via the VPN session' },
            { id: 'dnszone', text: 'The public DNS zone file for the company domain' },
            { id: 'vendoradvisory', text: 'The VPN vendor\'s public security advisory page' },
            { id: 'helpdesk', text: 'General help-desk ticket volume for the day' }
          ] },
          { id: 'first', label: 'Prerequisite before correlating events across sources', options: [
            { id: 'normalize', text: 'Normalize all log timestamps to a common time reference (e.g., UTC/NTP)' },
            { id: 'deletevpn', text: 'Delete the VPN log once the internal logs are pulled' },
            { id: 'guesstime', text: 'Estimate timing by eye without reconciling clocks' },
            { id: 'skipauth', text: 'Skip the VPN log since the internal logs are more detailed' }
          ] }
        ] },
        answer: { slots: { source: 'internallogs', first: 'normalize' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the investigation steps to build a reproducible timeline.',
        explanation: 'Sound artifact correlation: pull the VPN log establishing the successful-auth timestamp, gather internal firewall/NetFlow and endpoint logs covering that session window, normalize all timestamps to a common reference so events line up correctly, then correlate the sources into a single reproducible timeline of attacker activity.',
        payload: { items: [
          { id: 'a', label: 'Pull the VPN concentrator log establishing the successful-authentication timestamp' },
          { id: 'b', label: 'Gather internal firewall/NetFlow and endpoint logs covering that session window' },
          { id: 'c', label: 'Normalize timestamps across all sources to a common time reference' },
          { id: 'd', label: 'Correlate the sources into a single reproducible timeline of attacker activity' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // 20. DDoS — application-layer variant, Lessons learned emphasis
  {
    id: 'sp-ir-ddos-applayer-api', cert: 'secplus', objective: '4.8', topic: 'Incident Response',
    title: 'Application-layer DDoS against the search API', estMinutes: 4, archetype: 'incident',
    scenario: 'The product search API begins timing out under a flood of expensive, complex search queries sent from a botnet of a few hundred hosts — low in volume compared to a typical flood, but each request consumes significant database CPU. The database server is pegged at 100% CPU.',
    assets: { reference: { kind: 'timeline', stages: [
      { id: 's1', icon: 'search', label: 'Search API receives a flood of expensive, complex queries from ~300 hosts', time: 'T+0m', severity: 'high' },
      { id: 's2', icon: 'cpu', label: 'Database server CPU pegged at 100%', time: 'T+4m', severity: 'crit' },
      { id: 's3', icon: 'down', label: 'Search functionality becomes unusable site-wide', time: 'T+6m', severity: 'crit' }
    ] } },
    steps: [
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Triage this incident.',
        explanation: 'A relatively low request volume causing full resource exhaustion is application-layer (Layer 7) DDoS — attackers targeting the most expensive operation rather than raw bandwidth. Because search is unusable site-wide, this is critical. The first action is to rate-limit or throttle the expensive search endpoint to relieve database load.',
        payload: { slots: [
          { id: 'sev', label: 'Severity', options: [
            { id: 'low', text: 'Low' }, { id: 'med', text: 'Medium' },
            { id: 'high', text: 'High' }, { id: 'crit', text: 'Critical' }
          ] },
          { id: 'first', label: 'First containment action', options: [
            { id: 'throttle', text: 'Rate-limit or throttle the expensive search endpoint' },
            { id: 'scaledb', text: 'Permanently upgrade database hardware as the only fix' },
            { id: 'blockall', text: 'Block all inbound traffic to the entire site' },
            { id: 'ignoreload', text: 'Ignore it since the flood volume is relatively low' }
          ] }
        ] },
        answer: { slots: { sev: 'crit', first: 'throttle' } } },
      { id: 'o1', type: 'order', points: 1,
        prompt: 'Order the response steps.',
        explanation: 'Contain by throttling the abused endpoint, eradicate by blocking the identified botnet source ranges, recover by confirming search returns to normal performance, then add query complexity limits and WAF rules as the lessons-learned control against future application-layer floods.',
        payload: { items: [
          { id: 'a', label: 'Rate-limit or throttle the expensive search endpoint' },
          { id: 'b', label: 'Block the identified botnet source IP ranges' },
          { id: 'c', label: 'Confirm search performance has returned to normal' },
          { id: 'd', label: 'Add query complexity limits and WAF rules for future protection' }
        ] },
        answer: { correctOrder: ['a', 'b', 'c', 'd'] } }
    ]
  },

  // ── Defense in Depth (Task 14, 2-agent gated) ──
  { id: 'secplus-did-hollow-perimeter', cert: 'secplus',
    objective: 'SY0-701 Domain 3.2 — Compare and contrast security implications of architecture models (defense in depth, control categories)',
    topic: 'Defense in Depth', title: 'Strong wall, hollow inside', estMinutes: 6, archetype: 'defense',
    scenario: 'A security review of Northwind HQ finds a capable next-gen firewall at the edge and almost nothing behind it. Endpoints are unmanaged, the database stores records in clear text, and one shared admin account opens everything. A single phishing click puts an attacker next to the crown jewels.',
    assets: { reference: { kind: 'layered', layout: 'stacked',
      layers: [
        { id: 'perimeter', label: 'Perimeter', control: 'Next-gen firewall', state: 'present' },
        { id: 'endpoint', label: 'Endpoint', control: 'EDR and host hardening', state: 'missing' },
        { id: 'data', label: 'Data', control: 'Encryption at rest and DLP', state: 'missing' },
        { id: 'identity', label: 'Identity', control: 'MFA and least privilege', state: 'missing' }
      ],
      core: { label: 'Crown-jewel data', assets: [
        { id: 'db1', label: 'DB-1 (customer records, clear text)', exposed: true },
        { id: 'dc1', label: 'DC-1 (identity store)', exposed: true }
      ] }
    } },
    steps: [
      { id: 'd1', type: 'configure', points: 1,
        prompt: 'What is the core flaw in this architecture?',
        explanation: 'Everything rides on one control. Once the perimeter is bypassed, by phishing or an insider, nothing else slows the attacker before the data because there are no endpoint, data, or identity controls behind the firewall.',
        payload: { slots: [ { id: 'flaw', label: 'Core flaw', options: [
          { id: 'f1', text: 'It is a hard shell with a soft center: one perimeter, no inner controls' },
          { id: 'f2', text: 'The firewall vendor is not on the approved list' },
          { id: 'f3', text: 'The network uses too many subnets' },
          { id: 'f4', text: 'The database server is running on outdated hardware' }
        ] } ] },
        answer: { slots: { flaw: 'f1' } } },
      { id: 'f1', type: 'configure', points: 1,
        prompt: 'Build the inner layers.',
        explanation: 'EDR and hardening give each host its own line of defense, encryption and DLP protect the data itself, and MFA with least privilege shrinks what a stolen credential can do.',
        payload: { slots: [
          { id: 'endpoint', label: 'Endpoint layer', options: [
            { id: 'a1', text: 'EDR plus host hardening' }, { id: 'a2', text: 'A louder antivirus pop-up' }, { id: 'a3', text: 'Local admin rights for every user' } ] },
          { id: 'data', label: 'Data layer', options: [
            { id: 'b1', text: 'Encryption at rest plus DLP' }, { id: 'b2', text: 'A nightly backup, nothing else' }, { id: 'b3', text: 'Public read access for convenience' } ] },
          { id: 'identity', label: 'Identity layer', options: [
            { id: 'c1', text: 'MFA plus least privilege' }, { id: 'c2', text: 'One shared admin account' }, { id: 'c3', text: 'Longer passwords, no other change' } ] }
        ] },
        answer: { slots: { endpoint: 'a1', data: 'b1', identity: 'c1' } } },
      { id: 't1', type: 'configure', points: 1,
        prompt: 'MFA is best classified as which control type?',
        explanation: 'MFA is enforced by technology (technical) and stops misuse before it happens (preventive), not after an event has already occurred.',
        payload: { slots: [ { id: 'type', label: 'Control type', options: [
          { id: 't1', text: 'Technical, preventive' },
          { id: 't2', text: 'Physical, detective' },
          { id: 't3', text: 'Managerial, corrective' },
          { id: 't4', text: 'Operational, compensating' }
        ] } ] },
        answer: { slots: { type: 't1' } } }
    ]
  },

  { id: 'secplus-did-clinic-breach', cert: 'secplus',
    objective: 'SY0-701 Domain 3.2 — Compare and contrast security implications of architecture models (zero trust, control categories)',
    topic: 'Defense in Depth', title: 'A clinic that trusts anything already inside', estMinutes: 6, archetype: 'defense',
    scenario: 'A regional clinic passed its firewall audit with flying colors, but once inside the network every workstation can reach the patient records database directly, there is no logging on that database, and staff share one login for the scheduling system. An attacker who lands on any workstation has an unmonitored path to patient data.',
    assets: { reference: { kind: 'layered', layout: 'stacked',
      layers: [
        { id: 'perimeter', label: 'Perimeter', control: 'Audited edge firewall', state: 'present' },
        { id: 'network', label: 'Network segmentation', control: 'Micro-segmentation isolating the records database', state: 'missing' },
        { id: 'monitoring', label: 'Monitoring', control: 'Database access logging and alerting', state: 'missing' },
        { id: 'identity', label: 'Identity', control: 'Unique accounts and least privilege', state: 'missing' }
      ],
      core: { label: 'Patient records', assets: [
        { id: 'phi1', label: 'PHI-DB (patient records)', exposed: true }
      ] }
    } },
    steps: [
      { id: 'd1', type: 'configure', points: 1,
        prompt: 'What is the core flaw in this architecture?',
        explanation: 'The design assumes anything past the firewall is safe. Every workstation has an unrestricted, unlogged path to the database, and shared logins mean no one can be held accountable for access. This is the opposite of zero trust.',
        payload: { slots: [ { id: 'flaw', label: 'Core flaw', options: [
          { id: 'f1', text: 'Implicit trust inside the network: no segmentation, no logging, no accountability' },
          { id: 'f2', text: 'The firewall audit was performed by an unqualified vendor' },
          { id: 'f3', text: 'The clinic uses too many workstations' },
          { id: 'f4', text: 'The database server needs a hardware upgrade' }
        ] } ] },
        answer: { slots: { flaw: 'f1' } } },
      { id: 'f1', type: 'configure', points: 1,
        prompt: 'Build the inner layers.',
        explanation: 'Micro-segmentation limits which hosts can reach the database at all, logging and alerting give visibility into who touches patient data, and unique accounts with least privilege restore accountability.',
        payload: { slots: [
          { id: 'network', label: 'Network layer', options: [
            { id: 'a1', text: 'Micro-segmentation restricting database access to approved application servers' }, { id: 'a2', text: 'Allow every workstation to reach the database directly' }, { id: 'a3', text: 'Remove the firewall since it already passed audit' } ] },
          { id: 'monitoring', label: 'Monitoring layer', options: [
            { id: 'b1', text: 'Database access logging with alerting on anomalous queries' }, { id: 'b2', text: 'No logging, to save disk space' }, { id: 'b3', text: 'A monthly manual spreadsheet review' } ] },
          { id: 'identity', label: 'Identity layer', options: [
            { id: 'c1', text: 'Unique accounts per staff member with least privilege' }, { id: 'c2', text: 'One shared scheduling login for the whole clinic' }, { id: 'c3', text: 'Passwords that never expire' } ] }
        ] },
        answer: { slots: { network: 'a1', monitoring: 'b1', identity: 'c1' } } },
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Database access logging and alerting is best classified as which control type?',
        explanation: 'Logging and alerting are enforced through technology (technical) and identify malicious activity after it has started rather than preventing it outright, which makes it detective.',
        payload: { slots: [ { id: 'type', label: 'Control type', options: [
          { id: 't1', text: 'Technical, detective' },
          { id: 't2', text: 'Managerial, preventive' },
          { id: 't3', text: 'Physical, deterrent' },
          { id: 't4', text: 'Operational, corrective' }
        ] } ] },
        answer: { slots: { type: 't1' } } }
    ]
  },

  { id: 'secplus-did-cloud-bucket', cert: 'secplus',
    objective: 'SY0-701 Domain 3.2 — Compare and contrast security implications of architecture models (cloud security, control categories)',
    topic: 'Defense in Depth', title: 'A cloud app with one line of defense', estMinutes: 6, archetype: 'defense',
    scenario: 'A startup moved its customer app to the cloud and configured a web application firewall in front of it. Behind the WAF, the storage bucket holding customer uploads is publicly readable, the application server runs with an overly permissive IAM role, and there is no vulnerability scanning of the container images before they deploy.',
    assets: { reference: { kind: 'layered', layout: 'stacked',
      layers: [
        { id: 'perimeter', label: 'Perimeter', control: 'Web application firewall', state: 'present' },
        { id: 'data', label: 'Data', control: 'Private bucket policy with least-privilege access', state: 'missing' },
        { id: 'identity', label: 'Identity', control: 'Scoped IAM role for the application server', state: 'missing' },
        { id: 'application', label: 'Application', control: 'Vulnerability scanning in the CI/CD pipeline', state: 'missing' }
      ],
      core: { label: 'Customer data', assets: [
        { id: 'bkt1', label: 'BKT-1 (public storage bucket)', exposed: true }
      ] }
    } },
    steps: [
      { id: 'd1', type: 'configure', points: 1,
        prompt: 'What is the core flaw in this architecture?',
        explanation: 'The WAF only inspects web traffic to the app; it does nothing to protect a publicly readable storage bucket, an overprivileged IAM role, or unscanned container images. One control at the edge cannot cover every layer of a cloud stack.',
        payload: { slots: [ { id: 'flaw', label: 'Core flaw', options: [
          { id: 'f1', text: 'A single WAF is treated as sufficient while storage, identity, and the build pipeline are left uncontrolled' },
          { id: 'f2', text: 'The WAF vendor is not FedRAMP certified' },
          { id: 'f3', text: 'The application server is undersized for the traffic' },
          { id: 'f4', text: 'The cloud region is too far from customers' }
        ] } ] },
        answer: { slots: { flaw: 'f1' } } },
      { id: 'f1', type: 'configure', points: 1,
        prompt: 'Build the inner layers.',
        explanation: 'A private bucket policy stops public read access to customer uploads, a scoped IAM role limits what the app server can do if compromised, and pipeline scanning catches vulnerable images before they ever deploy.',
        payload: { slots: [
          { id: 'data', label: 'Data layer', options: [
            { id: 'a1', text: 'Private bucket policy granting access only to the application role' }, { id: 'a2', text: 'Public read access so the app can serve files directly' }, { id: 'a3', text: 'No bucket policy, rely on the WAF' } ] },
          { id: 'identity', label: 'Identity layer', options: [
            { id: 'b1', text: 'IAM role scoped to only the permissions the app needs' }, { id: 'b2', text: 'Administrator role for the application server, to avoid access errors' }, { id: 'b3', text: 'Shared root credentials for all services' } ] },
          { id: 'application', label: 'Application layer', options: [
            { id: 'c1', text: 'Vulnerability scanning of container images in CI/CD' }, { id: 'c2', text: 'Skip scanning to speed up deployments' }, { id: 'c3', text: 'Scan images once per year' } ] }
        ] },
        answer: { slots: { data: 'a1', identity: 'b1', application: 'c1' } } },
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Scoping the IAM role to least privilege is best classified as which control type?',
        explanation: 'Least-privilege IAM scoping is enforced by the cloud platform itself (technical) and limits what an attacker can do before any damage occurs, making it preventive.',
        payload: { slots: [ { id: 'type', label: 'Control type', options: [
          { id: 't1', text: 'Technical, preventive' },
          { id: 't2', text: 'Managerial, detective' },
          { id: 't3', text: 'Physical, preventive' },
          { id: 't4', text: 'Operational, corrective' }
        ] } ] },
        answer: { slots: { type: 't1' } } }
    ]
  },

  { id: 'secplus-did-vendor-remote-access', cert: 'secplus',
    objective: 'SY0-701 Domain 3.2 — Compare and contrast security implications of architecture models (third-party access, control categories)',
    topic: 'Defense in Depth', title: 'A vendor with the keys to everything', estMinutes: 6, archetype: 'defense',
    scenario: 'A manufacturing plant lets a third-party HVAC vendor remote into its network to service building controls. The vendor connects through a properly configured VPN, but from there the vendor account can reach the plant\'s production control systems, sessions are never recorded, and the vendor account has never been reviewed since it was created two years ago.',
    assets: { reference: { kind: 'layered', layout: 'stacked',
      layers: [
        { id: 'perimeter', label: 'Perimeter', control: 'VPN gateway for vendor remote access', state: 'present' },
        { id: 'network', label: 'Network segmentation', control: 'Jump host isolating vendor access from production systems', state: 'missing' },
        { id: 'monitoring', label: 'Monitoring', control: 'Session recording for third-party access', state: 'missing' },
        { id: 'identity', label: 'Identity', control: 'Periodic access review of vendor accounts', state: 'missing' }
      ],
      core: { label: 'Production control systems', assets: [
        { id: 'ics1', label: 'ICS-1 (production controller)', exposed: true }
      ] }
    } },
    steps: [
      { id: 'd1', type: 'configure', points: 1,
        prompt: 'What is the core flaw in this architecture?',
        explanation: 'The VPN itself is fine, but past it the vendor has an unrestricted, unrecorded, never-reviewed path straight to production controllers. A compromised vendor credential or a disgruntled contractor would go unnoticed indefinitely.',
        payload: { slots: [ { id: 'flaw', label: 'Core flaw', options: [
          { id: 'f1', text: 'Third-party access is unrestricted, unmonitored, and never reviewed once inside the VPN' },
          { id: 'f2', text: 'The VPN uses outdated encryption' },
          { id: 'f3', text: 'The HVAC vendor is not licensed in the state' },
          { id: 'f4', text: 'The production controllers need a firmware update' }
        ] } ] },
        answer: { slots: { flaw: 'f1' } } },
      { id: 'f1', type: 'configure', points: 1,
        prompt: 'Build the inner layers.',
        explanation: 'A jump host limits the vendor to only the systems they need, session recording gives an audit trail of everything the vendor does, and periodic access review catches accounts that should have been revoked long ago.',
        payload: { slots: [
          { id: 'network', label: 'Network layer', options: [
            { id: 'a1', text: 'Jump host restricting vendor access to HVAC systems only' }, { id: 'a2', text: 'Direct vendor access to the full production network' }, { id: 'a3', text: 'No restriction, since the VPN is already trusted' } ] },
          { id: 'monitoring', label: 'Monitoring layer', options: [
            { id: 'b1', text: 'Session recording for all third-party remote access' }, { id: 'b2', text: 'No session logging, to respect vendor privacy' }, { id: 'b3', text: 'A yearly vendor satisfaction survey' } ] },
          { id: 'identity', label: 'Identity layer', options: [
            { id: 'c1', text: 'Quarterly access review of vendor accounts' }, { id: 'c2', text: 'Vendor accounts that never expire or get reviewed' }, { id: 'c3', text: 'One shared vendor account for all contractors' } ] }
        ] },
        answer: { slots: { network: 'a1', monitoring: 'b1', identity: 'c1' } } },
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Periodic access review of vendor accounts is best classified as which control type?',
        explanation: 'Access reviews are a managerial policy activity, typically carried out on a schedule as part of governance, and they identify problems (like stale accounts) after the fact, which makes them detective.',
        payload: { slots: [ { id: 'type', label: 'Control type', options: [
          { id: 't1', text: 'Managerial, detective' },
          { id: 't2', text: 'Technical, preventive' },
          { id: 't3', text: 'Physical, deterrent' },
          { id: 't4', text: 'Operational, compensating' }
        ] } ] },
        answer: { slots: { type: 't1' } } }
    ]
  },

  { id: 'secplus-did-branch-office-ransomware', cert: 'secplus',
    objective: 'SY0-701 Domain 3.2 — Compare and contrast security implications of architecture models (defense in depth, control categories)',
    topic: 'Defense in Depth', title: 'One phishing email away from total loss', estMinutes: 6, archetype: 'defense',
    scenario: 'A law firm\'s branch office relies on email spam filtering as its only defense against ransomware. Endpoints have no EDR, backups are stored on a network share reachable from every workstation, and there is no security awareness training, so staff routinely click on suspicious attachments.',
    assets: { reference: { kind: 'layered', layout: 'stacked',
      layers: [
        { id: 'perimeter', label: 'Perimeter', control: 'Email spam filtering', state: 'present' },
        { id: 'endpoint', label: 'Endpoint', control: 'EDR with ransomware behavior detection', state: 'missing' },
        { id: 'backup', label: 'Backup', control: 'Immutable, network-isolated backups', state: 'missing' },
        { id: 'awareness', label: 'Personnel', control: 'Security awareness training', state: 'missing' }
      ],
      core: { label: 'Case files and client data', assets: [
        { id: 'case-files', label: 'Case files & client data', exposed: true },
        { id: 'shr1', label: 'SHR-1 (backup share reachable from every workstation)', exposed: true }
      ] }
    } },
    steps: [
      { id: 'd1', type: 'configure', points: 1,
        prompt: 'What is the core flaw in this architecture?',
        explanation: 'Spam filtering alone is not defense in depth. With no EDR to catch what slips through, no isolated backups to fall back on, and no trained staff to hesitate before clicking, one successful phishing email can encrypt both production data and its own backup.',
        payload: { slots: [ { id: 'flaw', label: 'Core flaw', options: [
          { id: 'f1', text: 'A single email filter is the only defense, with no endpoint, backup, or human layer behind it' },
          { id: 'f2', text: 'The law firm uses too much email' },
          { id: 'f3', text: 'The spam filter vendor changed pricing' },
          { id: 'f4', text: 'The office needs a faster printer' }
        ] } ] },
        answer: { slots: { flaw: 'f1' } } },
      { id: 'f1', type: 'configure', points: 1,
        prompt: 'Build the inner layers.',
        explanation: 'EDR catches ransomware behavior that slips past email filtering, immutable and network-isolated backups survive an encryption event, and trained staff are far less likely to trigger the infection in the first place.',
        payload: { slots: [
          { id: 'endpoint', label: 'Endpoint layer', options: [
            { id: 'a1', text: 'EDR with ransomware behavior detection' }, { id: 'a2', text: 'Rely on spam filtering alone' }, { id: 'a3', text: 'Disable antivirus to improve performance' } ] },
          { id: 'backup', label: 'Backup layer', options: [
            { id: 'b1', text: 'Immutable backups isolated from the production network' }, { id: 'b2', text: 'Backups on a share reachable from every workstation' }, { id: 'b3', text: 'No backups, restore from vendor support instead' } ] },
          { id: 'awareness', label: 'Personnel layer', options: [
            { id: 'c1', text: 'Regular security awareness training with phishing simulations' }, { id: 'c2', text: 'No training, trust staff judgment' }, { id: 'c3', text: 'A one-time training video at hiring only' } ] }
        ] },
        answer: { slots: { endpoint: 'a1', backup: 'b1', awareness: 'c1' } } },
      { id: 't1', type: 'configure', points: 1,
        prompt: 'Security awareness training is best classified as which control type?',
        explanation: 'Awareness training is a managerial/administrative program that reduces the likelihood of an incident before it happens, which makes it preventive rather than detective or corrective.',
        payload: { slots: [ { id: 'type', label: 'Control type', options: [
          { id: 't1', text: 'Managerial, preventive' },
          { id: 't2', text: 'Technical, detective' },
          { id: 't3', text: 'Physical, compensating' },
          { id: 't4', text: 'Operational, corrective' }
        ] } ] },
        answer: { slots: { type: 't1' } } }
    ]
  }
];

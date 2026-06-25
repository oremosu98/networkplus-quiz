/* DRAFT sc900 Decision Lab seed scenarios · answers NOT yet founder-verified. Review before ship. */
window.DECISION_LAB_SEED_SC900 = [
  // ========================================================================
  // ===== Domain 1 · Security, compliance & identity concepts (~25%) =======
  // ========================================================================
  {
    id: 'sc900-dl-concepts-1', cert: 'sc900', objective: '1.1', topic: 'Zero Trust',
    title: 'Pick the Zero Trust guiding principle', estMinutes: 3,
    pair: 'Zero Trust vs Defense in depth', family: 'Security concepts',
    scenario: 'A security lead says every access request must be fully authenticated, authorized, and encrypted <mark>before access is granted, regardless of where the request originates</mark> · the corporate network is no longer treated as trusted.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which model does this describe?',
        explanation: 'The tell is "regardless of where the request originates" plus "never trust the network." Zero Trust verifies explicitly on every request and assumes breach; it does not grant implicit trust based on network location.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Zero Trust' },
            { id: 'l2', text: 'Defense in depth', why: 'Layers multiple independent controls (perimeter, host, data) so one failure is not fatal · it is about stacking controls, not about removing implicit network trust on every request.' },
            { id: 'l3', text: 'The shared responsibility model', why: 'Divides security duties between the cloud provider and the customer by service type · it does not describe how individual access requests are evaluated.' },
            { id: 'l4', text: 'The CIA triad', why: 'Names the three goals of security (confidentiality, integrity, availability) · it is a goal framework, not an access-evaluation strategy.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-concepts-2', cert: 'sc900', objective: '1.1', topic: 'CIA triad',
    title: 'Match each CIA goal to its breach', estMinutes: 3,
    pair: 'Confidentiality vs Integrity vs Availability', family: 'Security concepts',
    scenario: 'Map each incident to the element of the CIA triad it primarily violates.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each incident with the CIA element it breaks.',
        explanation: 'Confidentiality = secrecy (leaked data). Integrity = data is unaltered (tampering). Availability = systems remain reachable (an outage or DDoS).',
        payload: {
          left: [
            { id: 'leak', label: 'A database of customer records is copied and posted publicly' },
            { id: 'tamper', label: 'An attacker silently edits values in a financial record' },
            { id: 'ddos', label: 'A flood of traffic takes the website offline' }
          ],
          right: [
            { id: 'conf', label: 'Confidentiality' },
            { id: 'integ', label: 'Integrity' },
            { id: 'avail', label: 'Availability' }
          ]
        },
        answer: { pairs: { leak: 'conf', tamper: 'integ', ddos: 'avail' } } }
    ]
  },

  {
    id: 'sc900-dl-concepts-3', cert: 'sc900', objective: '1.1', topic: 'Encryption',
    title: 'Pick the encryption state', estMinutes: 3,
    pair: 'Encryption at rest vs in transit', family: 'Security concepts',
    scenario: 'A team must ensure that data <mark>stored on a disk</mark> in a storage account cannot be read if the physical media is stolen.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which protection applies here?',
        explanation: 'The tell is "stored on a disk." Encryption at rest protects data sitting in storage; in-transit protects data moving over a network. Stolen media is a rest scenario.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Encryption at rest' },
            { id: 'l2', text: 'Encryption in transit', why: 'Protects data while it moves across a network (e.g., TLS on the wire) · it does nothing for a disk sitting powered off in a stolen server.' },
            { id: 'l3', text: 'Hashing', why: 'Produces a one-way fingerprint to verify integrity · it cannot be reversed to read the data back, so it is not how you protect stored, retrievable records.' },
            { id: 'l4', text: 'Tokenization', why: 'Swaps a sensitive value for a non-sensitive token in an application flow · it is a substitution technique, not the at-rest disk encryption the scenario asks for.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-concepts-4', cert: 'sc900', objective: '1.2', topic: 'Defense in depth',
    title: 'Name the layered-control strategy', estMinutes: 3,
    pair: 'Zero Trust vs Defense in depth', family: 'Security concepts',
    scenario: 'A design uses a perimeter firewall, network segmentation, host antivirus, and data encryption so that <mark>if one control is bypassed, others still protect the asset</mark>.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which approach is this?',
        explanation: 'The tell is "if one control is bypassed, others still protect" · stacked, independent layers. That is defense in depth.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Defense in depth' },
            { id: 'l2', text: 'Zero Trust', why: 'Centers on verifying each request explicitly and never trusting network location · it is an access-evaluation philosophy, not the act of stacking multiple redundant control layers.' },
            { id: 'l3', text: 'Least privilege', why: 'Grants each identity only the minimum rights it needs · a single principle about permission scope, not a multi-layer control architecture.' },
            { id: 'l4', text: 'Separation of duties', why: 'Splits a sensitive task across two people so no one can complete it alone · a process control, not a layered technical defense.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-concepts-5', cert: 'sc900', objective: '1.2', topic: 'Governance, risk & compliance',
    title: 'Match each GRC term', estMinutes: 3,
    family: 'Compliance concepts',
    scenario: 'Match each governance, risk, and compliance term to its meaning.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each term with its definition.',
        explanation: 'A risk is the potential for loss. A regulation is a legally mandated rule. A policy is an internal directive. A standard is an agreed baseline for meeting a policy.',
        payload: {
          left: [
            { id: 'risk', label: 'Risk' },
            { id: 'reg', label: 'Regulation' },
            { id: 'policy', label: 'Policy' },
            { id: 'std', label: 'Standard' }
          ],
          right: [
            { id: 'dloss', label: 'The potential for loss or harm' },
            { id: 'dlaw', label: 'A rule imposed by law or an authority' },
            { id: 'ddir', label: 'An internal organizational directive' },
            { id: 'dbase', label: 'An agreed baseline for meeting a directive' }
          ]
        },
        answer: { pairs: { risk: 'dloss', reg: 'dlaw', policy: 'ddir', std: 'dbase' } } }
    ]
  },

  {
    id: 'sc900-dl-concepts-6', cert: 'sc900', objective: '1.2', topic: 'Data residency & sovereignty',
    title: 'Pick the data residency concept', estMinutes: 3,
    pair: 'Data residency vs Data sovereignty', family: 'Compliance concepts',
    scenario: 'A regulator requires that customer data <mark>be physically stored within the country\'s borders</mark>, independent of which laws govern it.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which concept does this requirement describe?',
        explanation: 'The tell is "physically stored within the borders." Data residency is about where data physically lives; sovereignty is about which jurisdiction\'s laws apply to it.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Data residency' },
            { id: 'l2', text: 'Data sovereignty', why: 'Concerns which country\'s laws govern the data · a legal-jurisdiction question, not the physical storage-location requirement stated here.' },
            { id: 'l3', text: 'Data classification', why: 'Labels data by sensitivity (public, confidential, etc.) so controls can be applied · it does not dictate the geographic location of storage.' },
            { id: 'l4', text: 'Data loss prevention', why: 'Detects and blocks risky sharing of sensitive content · a control mechanism, not a statement about where data must physically reside.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-concepts-7', cert: 'sc900', objective: '1.3', topic: 'Identity as the security perimeter',
    title: 'Pick the modern security perimeter', estMinutes: 3,
    family: 'Identity concepts',
    scenario: 'With users on personal devices and SaaS apps outside the corporate firewall, leadership asks what the <mark>primary security perimeter</mark> should now be.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'What is the primary perimeter in a modern, cloud-first environment?',
        explanation: 'The tell is users and apps living outside the network edge. When the network boundary dissolves, identity becomes the primary control plane and perimeter.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Identity' },
            { id: 'l2', text: 'The corporate network firewall', why: 'Was the classic perimeter, but it cannot see or control SaaS apps and personal devices that never touch the corporate network · exactly the gap the scenario describes.' },
            { id: 'l3', text: 'The physical datacenter', why: 'Protects on-premises hardware, which is irrelevant when users reach cloud apps directly from anywhere.' },
            { id: 'l4', text: 'The VPN concentrator', why: 'Tunnels remote users back to the network, but modern SaaS access often bypasses the VPN entirely, so it is not the primary control plane.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-concepts-8', cert: 'sc900', objective: '1.3', topic: 'Authentication methods',
    title: 'Match the authentication factor type', estMinutes: 3,
    family: 'Identity concepts',
    scenario: 'Match each authentication method to the factor category it belongs to.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each method with its factor category.',
        explanation: 'Something you know = a secret (password/PIN). Something you have = a possession (token/phone). Something you are = a biometric (fingerprint/face).',
        payload: {
          left: [
            { id: 'pwd', label: 'Password or PIN' },
            { id: 'token', label: 'Authenticator app code on a phone' },
            { id: 'bio', label: 'Fingerprint scan' }
          ],
          right: [
            { id: 'know', label: 'Something you know' },
            { id: 'have', label: 'Something you have' },
            { id: 'are', label: 'Something you are' }
          ]
        },
        answer: { pairs: { pwd: 'know', token: 'have', bio: 'are' } } }
    ]
  },

  {
    id: 'sc900-dl-concepts-9', cert: 'sc900', objective: '1.3', topic: 'Federation vs SSO',
    title: 'Pick federation vs single sign-on', estMinutes: 3,
    pair: 'Federation vs SSO', family: 'Identity concepts',
    scenario: 'Two separate organizations with their own identity providers want users in one org to access an app in the other <mark>using a trust relationship between the two identity systems</mark>.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which concept enables this cross-organization access?',
        explanation: 'The tell is "trust relationship between two separate identity systems / organizations." That is federation. SSO is one sign-in across many apps within a single trust domain.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Federation' },
            { id: 'l2', text: 'Single sign-on (SSO)', why: 'Lets a user authenticate once to reach many apps inside one trust domain · it does not by itself establish trust between two separate organizations\' identity providers.' },
            { id: 'l3', text: 'Multi-factor authentication', why: 'Strengthens a single sign-in with extra factors · it is about proving identity more strongly, not about linking two organizations\' directories.' },
            { id: 'l4', text: 'Conditional Access', why: 'Applies access policies based on signals like device and location · it governs access decisions, not the cross-org directory trust being described.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-concepts-10', cert: 'sc900', objective: '1.2', topic: 'Compliance principles',
    title: 'Pick what a Data Subject Request fulfills', estMinutes: 3,
    family: 'Compliance concepts',
    scenario: 'An individual asks a company to provide and then delete all personal data the company holds about them, citing their <mark>privacy rights as the person the data describes</mark>.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'What kind of request is this?',
        explanation: 'The tell is the person exercising rights over data about themselves. That is a Data Subject Request (DSR / DSAR), the mechanism that satisfies privacy rights like access and erasure.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'A Data Subject Request (DSR)' },
            { id: 'l2', text: 'An eDiscovery hold', why: 'Preserves content for a legal case driven by the organization or courts · it freezes data rather than fulfilling an individual\'s personal access-and-erasure rights.' },
            { id: 'l3', text: 'A data loss prevention policy', why: 'Automatically blocks risky outbound sharing of sensitive data · it is an ongoing control, not a one-time response to a person\'s rights request.' },
            { id: 'l4', text: 'A retention policy', why: 'Defines how long content is kept or deleted on a schedule · it operates on the organization\'s timeline, not on an individual\'s erasure demand.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-concepts-11', cert: 'sc900', objective: '1.2', topic: 'Shared responsibility model',
    title: 'Sort responsibilities by service model', estMinutes: 4,
    family: 'Shared responsibility',
    scenario: 'Under the Microsoft cloud shared responsibility model, sort who always owns each task. For SaaS the provider handles most of the stack, but some duties never transfer to the provider regardless of service model.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each responsibility under "Always the customer", "Always the cloud provider", or "Varies by service model (IaaS/PaaS/SaaS)".',
        explanation: 'Data, accounts/identities, and devices are always the customer\'s responsibility. Physical hosts, the physical network, and the physical datacenter are always the provider\'s. Operating system, network controls, and applications shift between customer and provider depending on IaaS vs PaaS vs SaaS.',
        payload: {
          items: [
            { id: 'data', label: 'Information and data' },
            { id: 'accounts', label: 'Accounts and identities' },
            { id: 'physhost', label: 'Physical hosts' },
            { id: 'physnet', label: 'Physical network' },
            { id: 'physdc', label: 'Physical datacenter' },
            { id: 'os', label: 'Operating system' },
            { id: 'netctrl', label: 'Network controls' },
            { id: 'apps', label: 'Applications' }
          ],
          buckets: [
            { id: 'cust', label: 'Always the customer' },
            { id: 'prov', label: 'Always the cloud provider' },
            { id: 'varies', label: 'Varies by service model' }
          ]
        },
        answer: { map: { data: 'cust', accounts: 'cust', physhost: 'prov', physnet: 'prov', physdc: 'prov', os: 'varies', netctrl: 'varies', apps: 'varies' } } }
    ]
  },

  {
    id: 'sc900-dl-concepts-12', cert: 'sc900', objective: '1.1', topic: 'Hashing vs encryption',
    title: 'Pick hashing vs encryption', estMinutes: 3,
    pair: 'Hashing vs Encryption', family: 'Security concepts',
    scenario: 'A developer must store passwords so that the original value <mark>can never be recovered, even by an administrator</mark>, but a submitted password can still be verified.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which technique fits?',
        explanation: 'The tell is "can never be recovered" yet still verifiable. Hashing is one-way; encryption is reversible with a key. Passwords are hashed, not encrypted.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Hashing' },
            { id: 'l2', text: 'Symmetric encryption', why: 'Is reversible with the shared key, so an administrator holding the key could recover the original password · the opposite of the irreversibility required.' },
            { id: 'l3', text: 'Asymmetric encryption', why: 'Uses a key pair and is also reversible with the private key · it protects data you intend to read back, not values that must never be recoverable.' },
            { id: 'l4', text: 'Digital signing', why: 'Proves authenticity and integrity of a message · it does not store a secret in an irreversible-yet-verifiable form the way password hashing does.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-concepts-13', cert: 'sc900', objective: '1.3', topic: 'Identity providers',
    title: 'Pick the role of an identity provider', estMinutes: 3,
    family: 'Identity concepts',
    scenario: 'A SaaS application redirects users to <mark>a central service that verifies the user and issues a security token</mark> the app then trusts.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'What is the central service called?',
        explanation: 'The tell is "verifies the user and issues a security token the app trusts." That is the identity provider (IdP); the app is the relying party.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'An identity provider (IdP)' },
            { id: 'l2', text: 'A certificate authority', why: 'Issues and signs digital certificates to vouch for keys/identities in PKI · it does not authenticate users into apps and issue sign-in tokens.' },
            { id: 'l3', text: 'A reverse proxy', why: 'Forwards and filters web traffic to back-end servers · it can sit in the path but is not the service that verifies the user and mints the token.' },
            { id: 'l4', text: 'A domain controller', why: 'Authenticates within an on-premises Active Directory domain, but the cloud SaaS token-issuance flow described here is the job of a cloud identity provider.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  // ========================================================================
  // ===== Domain 2 · Microsoft Entra identity (~25%) =======================
  // ========================================================================
  {
    id: 'sc900-dl-entra-1', cert: 'sc900', objective: '2.1', topic: 'Authentication vs authorization',
    title: 'Match authN vs authZ', estMinutes: 3,
    pair: 'Authentication vs Authorization', family: 'Microsoft Entra',
    scenario: 'Match each step of the sign-in process to whether it is authentication or authorization.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each action with authentication or authorization.',
        explanation: 'Authentication (authN) proves who you are. Authorization (authZ) decides what you are allowed to do. Verifying a password is authN; checking whether you may open a file is authZ.',
        payload: {
          left: [
            { id: 'verify', label: 'Verifying the user\'s password and MFA prompt' },
            { id: 'permit', label: 'Deciding whether the user may open a finance report' }
          ],
          right: [
            { id: 'authn', label: 'Authentication' },
            { id: 'authz', label: 'Authorization' }
          ]
        },
        answer: { pairs: { verify: 'authn', permit: 'authz' } } }
    ]
  },

  {
    id: 'sc900-dl-entra-2', cert: 'sc900', objective: '2.2', topic: 'MFA vs Conditional Access',
    title: 'Pick MFA vs Conditional Access', estMinutes: 3,
    pair: 'MFA vs Conditional Access', family: 'Microsoft Entra',
    scenario: 'Security wants a rule that says: <mark>require an extra verification prompt only when a user signs in from an unfamiliar location or a non-compliant device</mark> · and skip it on trusted, managed devices.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which capability evaluates the signals and decides when to enforce the extra prompt?',
        explanation: 'The tell is "only when" plus signals like location and device state. Conditional Access is the policy engine that evaluates signals and can require MFA conditionally. MFA is the control it can invoke, not the engine that decides when.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Conditional Access' },
            { id: 'l2', text: 'Multi-factor authentication (MFA)', why: 'Is the extra-verification control itself · it strengthens a sign-in, but on its own it cannot evaluate location or device signals to decide when to apply. That decision is Conditional Access.' },
            { id: 'l3', text: 'Self-service password reset', why: 'Lets users reset their own passwords · it has nothing to do with conditionally requiring extra verification based on risk signals.' },
            { id: 'l4', text: 'Privileged Identity Management', why: 'Manages just-in-time elevation of admin roles · it governs privileged access timing, not signal-based MFA enforcement at sign-in.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-entra-3', cert: 'sc900', objective: '2.2', topic: 'Conditional Access flow',
    title: 'Order the Conditional Access evaluation', estMinutes: 4,
    pair: 'MFA vs Conditional Access', family: 'Microsoft Entra',
    scenario: 'Put the stages of a Conditional Access policy evaluation in order, first step at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the Conditional Access flow from first to last.',
        explanation: 'A sign-in is attempted, which triggers Conditional Access. The policy first authenticates the user, then collects signals (user, location, device, app, risk), evaluates those signals against the assignments, and finally enforces an access decision (grant, grant with controls like MFA, or block).',
        payload: { items: [
          { id: 'signin', label: 'A user attempts to sign in to an app' },
          { id: 'signals', label: 'Conditional Access gathers signals (user, location, device, risk)' },
          { id: 'evaluate', label: 'Signals are evaluated against the policy assignments' },
          { id: 'enforce', label: 'Access decision is enforced (allow, require MFA, or block)' }
        ] },
        answer: { correctOrder: ['signin', 'signals', 'evaluate', 'enforce'] } }
    ]
  },

  {
    id: 'sc900-dl-entra-4', cert: 'sc900', objective: '2.3', topic: 'PIM vs Entra ID Governance',
    title: 'Pick PIM for just-in-time admin', estMinutes: 3,
    pair: 'PIM vs Entra ID Governance', family: 'Microsoft Entra',
    scenario: 'Admins should hold no standing privileged access; instead they must <mark>activate a privileged role only when needed, for a limited time, with approval and an audit trail</mark>.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Microsoft Entra capability provides this?',
        explanation: 'The tell is "activate a privileged role just-in-time, time-bound, with approval." That is Privileged Identity Management (PIM).',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Privileged Identity Management (PIM)' },
            { id: 'l2', text: 'Entra ID Governance access reviews', why: 'Periodically recertifies whether users should keep their existing access · it is a recurring review process, not the just-in-time, time-bound activation of a privileged role.' },
            { id: 'l3', text: 'Conditional Access', why: 'Decides whether to allow a sign-in based on signals · it gates access broadly but does not provide eligible-role activation with approval and expiry.' },
            { id: 'l4', text: 'Entitlement management', why: 'Packages access into bundles users can request for projects · it streamlines granting standing access, not the temporary elevation of admin roles.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-entra-5', cert: 'sc900', objective: '2.3', topic: 'PIM activation flow',
    title: 'Order the PIM role activation', estMinutes: 4,
    pair: 'PIM vs Entra ID Governance', family: 'Microsoft Entra',
    scenario: 'An admin is eligible for a privileged role in Privileged Identity Management. Put the activation steps in order, first step at the top.',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange the PIM activation steps from first to last.',
        explanation: 'The admin is assigned as eligible for the role, requests activation when needed (often with MFA and a justification), an approver grants it if approval is required, the role is active for a time-bound window, and PIM deactivates it automatically when the window expires.',
        payload: { items: [
          { id: 'eligible', label: 'Admin is assigned as eligible for the role' },
          { id: 'request', label: 'Admin requests activation with justification and MFA' },
          { id: 'approve', label: 'Approver grants the request (if approval is required)' },
          { id: 'active', label: 'Role is active for a time-bound window' },
          { id: 'expire', label: 'PIM deactivates the role when the window expires' }
        ] },
        answer: { correctOrder: ['eligible', 'request', 'approve', 'active', 'expire'] } }
    ]
  },

  {
    id: 'sc900-dl-entra-6', cert: 'sc900', objective: '2.1', topic: 'Entra identity types',
    title: 'Match the Entra identity type', estMinutes: 3,
    family: 'Microsoft Entra',
    scenario: 'Match each Microsoft Entra identity type to what it represents.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each identity type with its description.',
        explanation: 'A user is a human account. A service principal / app registration is an identity for an application. A managed identity is an automatically managed identity in Entra ID for Azure resources to authenticate without stored or rotated credentials. A group bundles users for assignment.',
        payload: {
          left: [
            { id: 'user', label: 'User' },
            { id: 'sp', label: 'Service principal' },
            { id: 'mi', label: 'Managed identity' },
            { id: 'grp', label: 'Group' }
          ],
          right: [
            { id: 'dhuman', label: 'A human account that signs in' },
            { id: 'dapp', label: 'An identity that represents an application' },
            { id: 'dnosecret', label: 'An auto-managed Entra ID identity for Azure resources, no stored or rotated credentials' },
            { id: 'dbundle', label: 'A bundle of users for easier access assignment' }
          ]
        },
        answer: { pairs: { user: 'dhuman', sp: 'dapp', mi: 'dnosecret', grp: 'dbundle' } } }
    ]
  },

  {
    id: 'sc900-dl-entra-7', cert: 'sc900', objective: '2.1', topic: 'Hybrid identity',
    title: 'Pick the hybrid identity tool', estMinutes: 3,
    family: 'Microsoft Entra',
    scenario: 'A company with an on-premises Active Directory wants those accounts <mark>synchronized into Microsoft Entra ID</mark> so users keep one identity across on-prem and cloud.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which tool provides this synchronization?',
        explanation: 'The tell is "synchronize on-premises AD accounts into Entra ID." Microsoft Entra Connect (Connect Sync) is the directory-synchronization tool for hybrid identity.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Entra Connect' },
            { id: 'l2', text: 'Conditional Access', why: 'Applies access policies at sign-in · it does not synchronize directory objects between on-prem AD and the cloud.' },
            { id: 'l3', text: 'Privileged Identity Management', why: 'Manages just-in-time privileged role activation · it has no role in replicating on-prem accounts into Entra ID.' },
            { id: 'l4', text: 'Microsoft Entra ID Protection', why: 'Detects identity risk and risky sign-ins · it consumes identities but does not create the hybrid sync between AD and Entra ID.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-entra-8', cert: 'sc900', objective: '2.2', topic: 'Passwordless authentication',
    title: 'Pick the passwordless method', estMinutes: 3,
    family: 'Microsoft Entra',
    scenario: 'Security wants users to sign in <mark>with no password at all</mark>, using a phishing-resistant method tied to the device and a biometric or PIN.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which is a Microsoft passwordless authentication method?',
        explanation: 'The tell is "no password at all" plus device-bound biometric/PIN. Windows Hello for Business is a passwordless method. A password plus SMS is still password-based MFA.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Windows Hello for Business' },
            { id: 'l2', text: 'Password plus an SMS one-time code', why: 'Is multi-factor but still relies on a password as the first factor · the scenario specifically requires no password at all.' },
            { id: 'l3', text: 'Security questions', why: 'Are knowledge-based recovery prompts, not a primary sign-in method, and they are not passwordless or phishing-resistant.' },
            { id: 'l4', text: 'A password with complexity requirements', why: 'Is still a password · strengthening the password does not make the method passwordless.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-entra-9', cert: 'sc900', objective: '2.3', topic: 'Access reviews',
    title: 'Pick the tool for periodic access recertification', estMinutes: 3,
    pair: 'PIM vs Entra ID Governance', family: 'Microsoft Entra',
    scenario: 'Compliance requires that every quarter, group owners <mark>re-confirm whether each member still needs their existing access</mark>, removing those who no longer do.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Entra ID Governance feature handles this?',
        explanation: 'The tell is "periodically re-confirm existing access." Access reviews recertify standing access on a schedule. PIM activates roles just-in-time; it does not run recurring recertification campaigns.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Access reviews' },
            { id: 'l2', text: 'Privileged Identity Management (PIM)', why: 'Provides just-in-time, time-bound activation of privileged roles · it controls when access is elevated, not the recurring recertification of who should keep standing access.' },
            { id: 'l3', text: 'Conditional Access', why: 'Decides whether a given sign-in is allowed based on signals · it does not periodically review and prune group memberships.' },
            { id: 'l4', text: 'Multi-factor authentication', why: 'Adds verification factors at sign-in · it does nothing to recertify existing access assignments.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-entra-10', cert: 'sc900', objective: '2.2', topic: 'External identities (B2B)',
    title: 'Pick the external collaboration feature', estMinutes: 3,
    family: 'Microsoft Entra',
    scenario: 'A company wants to invite <mark>partner vendors to use their own existing credentials</mark> to access a shared SharePoint site, without creating internal accounts for them.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Microsoft Entra capability fits?',
        explanation: 'The tell is "external partners use their own credentials to collaborate." Entra External ID B2B collaboration invites guests who sign in with their own identities.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Entra External ID (B2B collaboration)' },
            { id: 'l2', text: 'Entra External ID for customers (B2C customer identity)', why: 'Provides sign-up and sign-in for an app\'s external consumers (customer identity and access management) · the scenario is partner-business collaboration on a shared resource (B2B), not building a customer-facing app identity store (B2C).' },
            { id: 'l3', text: 'Microsoft Entra Connect', why: 'Synchronizes on-premises AD into Entra ID · it is for the company\'s own hybrid identities, not for inviting external partners as guests.' },
            { id: 'l4', text: 'Self-service password reset', why: 'Lets users reset their own passwords · unrelated to inviting external guests with their own credentials.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-entra-11', cert: 'sc900', objective: '2.1', topic: 'Azure RBAC',
    title: 'Pick how to grant scoped permissions', estMinutes: 3,
    family: 'Access management',
    scenario: 'An admin must grant a support team permission to <mark>only restart virtual machines in one resource group</mark>, nothing more, using built-in role definitions.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which mechanism grants this least-privilege, scoped access?',
        explanation: 'The tell is "specific permissions, scoped to a resource group, using role definitions." Azure role-based access control (RBAC) assigns a role at a scope on the Azure resource plane. That is authorization, distinct from authentication. Note Azure RBAC is not the same as Entra directory roles: Entra roles govern directory tasks (managing users, groups, app registrations), while Azure RBAC governs access to Azure resources like VMs and resource groups.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure role-based access control (RBAC)' },
            { id: 'l2', text: 'Conditional Access', why: 'Governs whether a sign-in is permitted based on signals · it does not assign granular resource permissions like "restart VMs in this resource group."' },
            { id: 'l3', text: 'Multi-factor authentication', why: 'Verifies identity more strongly at sign-in · it is authentication, not the authorization mechanism that scopes what an identity can do.' },
            { id: 'l4', text: 'Privileged Identity Management', why: 'Times and approves the activation of privileged roles, but the underlying scoped permission grant itself is defined through RBAC role assignments.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-entra-12', cert: 'sc900', objective: '2.3', topic: 'Entitlement management',
    title: 'Pick the access-package tool', estMinutes: 3,
    family: 'Microsoft Entra',
    scenario: 'New project members should be able to <mark>request a bundle of apps, groups, and SharePoint sites in one self-service request</mark> that expires when the project ends.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Entra ID Governance feature provides this?',
        explanation: 'The tell is "request a bundle of resources together, with a lifecycle." Entitlement management packages access into access packages users can request, with approval and expiration.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Entitlement management' },
            { id: 'l2', text: 'Privileged Identity Management', why: 'Elevates individual privileged roles just-in-time · it does not bundle apps, groups, and sites into a single requestable package.' },
            { id: 'l3', text: 'Access reviews', why: 'Recertify whether existing access should continue · they audit access rather than provisioning a new bundle on request.' },
            { id: 'l4', text: 'Conditional Access', why: 'Decides whether a sign-in is allowed · it does not provision bundled resource access for project members.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  // ========================================================================
  // ===== Domain 3 · Microsoft security solutions (~30%) ===================
  // ========================================================================
  {
    id: 'sc900-dl-defender-1', cert: 'sc900', objective: '3.2', topic: 'Defender for Cloud Apps',
    title: 'Pick the SaaS shadow-IT control', estMinutes: 3,
    pair: 'Defender for Endpoint vs Cloud Apps', family: 'Defender family',
    scenario: 'Security must <mark>block downloads of sensitive data from unmanaged personal devices accessing a SaaS app like Salesforce</mark>, and discover shadow-IT cloud usage.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Defender product is built for this?',
        explanation: 'The tell is "SaaS app / unmanaged device session control / shadow IT." Microsoft Defender for Cloud Apps is the CASB that governs SaaS sessions and discovers shadow IT.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Defender for Cloud Apps' },
            { id: 'l2', text: 'Microsoft Defender for Endpoint', why: 'Protects managed endpoints (laptops, servers) with EDR · but here the device is unmanaged and the asset is a SaaS app, which is the cloud-app broker\'s job, not endpoint EDR.' },
            { id: 'l3', text: 'Microsoft Defender for Office 365', why: 'Protects email and collaboration content from phishing and malicious links · it does not control SaaS session downloads from unmanaged devices.' },
            { id: 'l4', text: 'Microsoft Defender for Cloud', why: 'Secures Azure/multicloud resource posture and workloads · it governs cloud infrastructure, not user sessions to third-party SaaS apps.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-defender-2', cert: 'sc900', objective: '3.2', topic: 'Defender for Endpoint',
    title: 'Pick the endpoint EDR product', estMinutes: 3,
    pair: 'Defender for Endpoint vs Identity', family: 'Defender family',
    scenario: 'A laptop shows suspicious process behavior. The SOC needs <mark>endpoint detection and response on the managed device</mark>, with the ability to isolate the machine from the network.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Defender product protects the managed endpoint?',
        explanation: 'The tell is "managed device / EDR / isolate the machine." Microsoft Defender for Endpoint is the EDR for devices.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Defender for Endpoint' },
            { id: 'l2', text: 'Microsoft Defender for Identity', why: 'Watches on-premises Active Directory signals for identity attacks (lateral movement, pass-the-hash) · it monitors the directory, not endpoint process behavior on a laptop.' },
            { id: 'l3', text: 'Microsoft Defender for Cloud Apps', why: 'Brokers and governs SaaS app sessions · it does not run EDR or device isolation on an endpoint.' },
            { id: 'l4', text: 'Microsoft Defender for Office 365', why: 'Defends email and collaboration from phishing and malware · it does not provide endpoint detection and response on a device.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-defender-3', cert: 'sc900', objective: '3.2', topic: 'Defender for Identity',
    title: 'Pick the on-prem AD attack detector', estMinutes: 3,
    pair: 'Defender for Endpoint vs Identity', family: 'Defender family',
    scenario: 'The SOC wants to detect <mark>lateral movement and pass-the-hash attacks against on-premises Active Directory domain controllers</mark>.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Defender product is designed for this?',
        explanation: 'The tell is "on-premises Active Directory, lateral movement, pass-the-hash." Microsoft Defender for Identity monitors AD signals for identity-based attacks.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Defender for Identity' },
            { id: 'l2', text: 'Microsoft Defender for Endpoint', why: 'Provides EDR on individual devices · it detects threats on the endpoint, not the directory-wide lateral-movement signals seen at domain controllers.' },
            { id: 'l3', text: 'Microsoft Entra ID Protection', why: 'Detects risky sign-ins and user risk for cloud identities in Entra ID · it does not monitor on-premises Active Directory domain-controller traffic.' },
            { id: 'l4', text: 'Microsoft Defender for Cloud Apps', why: 'Governs SaaS app usage and sessions · it has no visibility into on-prem AD attack patterns.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-defender-4', cert: 'sc900', objective: '3.2', topic: 'Defender for Office 365',
    title: 'Pick the email/collaboration protector', estMinutes: 3,
    pair: 'Defender for Office 365 vs Cloud Apps', family: 'Defender family',
    scenario: 'Users keep receiving phishing emails with malicious links and weaponized attachments. Security wants to <mark>scan links and attachments in email and Teams at delivery time</mark>.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Defender product covers email and collaboration?',
        explanation: 'The tell is "phishing emails, malicious links/attachments, Teams." Microsoft Defender for Office 365 protects email and collaboration (Safe Links, Safe Attachments).',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Defender for Office 365' },
            { id: 'l2', text: 'Microsoft Defender for Endpoint', why: 'Protects the device after a payload runs · it is not the layer that scans inbound email links and attachments at delivery.' },
            { id: 'l3', text: 'Microsoft Defender for Cloud Apps', why: 'Governs third-party SaaS app sessions and shadow IT · it does not perform Safe Links/Safe Attachments scanning on mail and Teams.' },
            { id: 'l4', text: 'Microsoft Defender for Cloud', why: 'Secures cloud infrastructure posture and workloads · it has no role in scanning user email and collaboration messages.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-defender-5', cert: 'sc900', objective: '3.3', topic: 'Defender for Cloud',
    title: 'Pick the cloud posture / workload tool', estMinutes: 3,
    pair: 'Sentinel vs Defender for Cloud', family: 'Defender family',
    scenario: 'A team wants <mark>continuous security posture assessment and a secure score for Azure and multicloud resources</mark>, with workload protection for VMs and storage.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which product provides cloud security posture management?',
        explanation: 'The tell is "posture / secure score / workload protection for cloud resources." Microsoft Defender for Cloud is the CSPM and CWPP for Azure and multicloud.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Defender for Cloud' },
            { id: 'l2', text: 'Microsoft Sentinel', why: 'Is the cloud SIEM/SOAR that collects and correlates signals for threat detection across the estate · it does not itself produce the resource posture secure score the way Defender for Cloud does.' },
            { id: 'l3', text: 'Microsoft Defender for Cloud Apps', why: 'Governs SaaS app sessions and shadow IT · it is not the posture-management tool for Azure infrastructure.' },
            { id: 'l4', text: 'Microsoft Defender for Endpoint', why: 'Provides device EDR · it secures endpoints, not the multicloud resource posture and workload protection described.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-defender-6', cert: 'sc900', objective: '3.1', topic: 'Sentinel vs Defender for Cloud',
    title: 'Pick the SIEM that correlates org-wide signals', estMinutes: 3,
    pair: 'Sentinel vs Defender for Cloud', family: 'Defender family',
    scenario: 'The SOC needs to <mark>collect logs from across the whole environment (cloud, on-prem, firewalls, identities), correlate them, and run automated playbooks on incidents</mark>.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which solution is the cloud-native SIEM/SOAR?',
        explanation: 'The tell is "collect logs from everywhere, correlate, automated playbooks." Microsoft Sentinel is the SIEM/SOAR. Defender for Cloud is posture/workload protection, not the org-wide log correlation engine.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Sentinel' },
            { id: 'l2', text: 'Microsoft Defender for Cloud', why: 'Assesses cloud resource posture and protects workloads · it feeds signals in, but it is not the SIEM that ingests and correlates logs from across all sources with playbooks.' },
            { id: 'l3', text: 'Microsoft Purview', why: 'Handles data governance, classification, and compliance · it is not a security operations SIEM/SOAR.' },
            { id: 'l4', text: 'Microsoft Defender for Endpoint', why: 'Provides device EDR signals · a source for Sentinel, but not the central correlation-and-automation platform itself.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-defender-7', cert: 'sc900', objective: '3.1', topic: 'SIEM vs SOAR',
    title: 'Match SIEM vs SOAR', estMinutes: 3,
    pair: 'SIEM vs SOAR', family: 'Defender family',
    scenario: 'Match each capability to whether it is the SIEM or the SOAR aspect of a security operations platform.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each capability with SIEM or SOAR.',
        explanation: 'SIEM (security information and event management) collects, aggregates, and correlates security data to detect threats. SOAR (security orchestration, automation, and response) automates the response with playbooks. Microsoft Sentinel does both.',
        payload: {
          left: [
            { id: 'collect', label: 'Aggregating and correlating logs to surface incidents' },
            { id: 'auto', label: 'Running an automated playbook to respond to an incident' }
          ],
          right: [
            { id: 'siem', label: 'SIEM' },
            { id: 'soar', label: 'SOAR' }
          ]
        },
        answer: { pairs: { collect: 'siem', auto: 'soar' } } }
    ]
  },

  {
    id: 'sc900-dl-defender-8', cert: 'sc900', objective: '3.2', topic: 'Defender XDR',
    title: 'Pick the unified XDR portal', estMinutes: 3,
    family: 'Defender family',
    scenario: 'An analyst wants a <mark>single portal that correlates alerts across endpoints, identities, email, and cloud apps into one incident</mark> view.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which offering unifies these signals?',
        explanation: 'The tell is "single portal correlating across endpoints, identities, email, and cloud apps into one incident." Microsoft Defender XDR is the unified extended detection and response suite.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Defender XDR' },
            { id: 'l2', text: 'Microsoft Defender for Endpoint', why: 'Is one workload (devices) within the suite · it does not by itself correlate identity, email, and cloud-app signals into a single cross-domain incident.' },
            { id: 'l3', text: 'Microsoft Sentinel', why: 'Is the broader SIEM that can ingest sources beyond Microsoft 365 · but the question asks for the unified XDR portal that natively stitches the Defender workloads together.' },
            { id: 'l4', text: 'Microsoft Defender for Cloud', why: 'Focuses on cloud resource posture and workload protection · it is not the cross-workload XDR incident correlation portal.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-defender-9', cert: 'sc900', objective: '3.2', topic: 'Defender family sorter',
    title: 'Sort each Defender product by what it protects', estMinutes: 4,
    family: 'Defender family',
    scenario: 'Sort each Microsoft Defender product under the primary asset it protects.',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each Defender product under the asset it primarily protects.',
        explanation: 'Defender for Endpoint protects devices. Defender for Identity protects on-prem Active Directory identities. Defender for Office 365 protects email and collaboration. Defender for Cloud Apps protects SaaS app usage. Defender for Cloud protects cloud infrastructure posture and workloads.',
        payload: {
          items: [
            { id: 'mde', label: 'Defender for Endpoint' },
            { id: 'mdi', label: 'Defender for Identity' },
            { id: 'mdo', label: 'Defender for Office 365' },
            { id: 'mca', label: 'Defender for Cloud Apps' },
            { id: 'mdc', label: 'Defender for Cloud' }
          ],
          buckets: [
            { id: 'devices', label: 'Devices / endpoints' },
            { id: 'identities', label: 'On-prem AD identities' },
            { id: 'email', label: 'Email & collaboration' },
            { id: 'saas', label: 'SaaS apps' },
            { id: 'infra', label: 'Cloud infrastructure' }
          ]
        },
        answer: { map: { mde: 'devices', mdi: 'identities', mdo: 'email', mca: 'saas', mdc: 'infra' } } }
    ]
  },

  {
    id: 'sc900-dl-defender-10', cert: 'sc900', objective: '3.3', topic: 'Entra ID Protection',
    title: 'Pick the risky sign-in detector', estMinutes: 3,
    pair: 'Entra ID Protection vs Defender for Identity', family: 'Microsoft Entra',
    scenario: 'Security wants to automatically flag <mark>risky cloud sign-ins (impossible travel, leaked credentials) for Entra ID accounts</mark> and feed that risk into Conditional Access.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which capability detects this cloud identity risk?',
        explanation: 'The tell is "cloud sign-in risk in Entra ID, impossible travel, leaked credentials, feeds Conditional Access." That is Microsoft Entra ID Protection. Defender for Identity is for on-prem AD.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Entra ID Protection' },
            { id: 'l2', text: 'Microsoft Defender for Identity', why: 'Detects identity attacks against on-premises Active Directory · the scenario is about cloud Entra ID sign-in risk feeding Conditional Access, which is Entra ID Protection.' },
            { id: 'l3', text: 'Microsoft Defender for Endpoint', why: 'Provides device EDR · it does not score cloud sign-in risk for identities.' },
            { id: 'l4', text: 'Microsoft Sentinel', why: 'Can ingest and correlate risk signals, but it is not the Entra-native engine that computes user and sign-in risk for Conditional Access.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-defender-11', cert: 'sc900', objective: '3.1', topic: 'Azure network security basics',
    title: 'Match each Azure network protection to its asset', estMinutes: 3,
    family: 'Azure security',
    scenario: 'At a high level, match each basic Azure network-security capability to the kind of protection it provides.',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each capability with what it is for.',
        explanation: 'At SC-900 altitude: Azure DDoS Protection keeps services available during large traffic floods. A Web Application Firewall (WAF) protects web apps from common web exploits. A network security group (NSG) allows or denies traffic by basic IP and port rules. Azure Firewall is a managed, stateful network firewall for a virtual network.',
        payload: {
          left: [
            { id: 'ddos', label: 'Azure DDoS Protection' },
            { id: 'waf', label: 'Web Application Firewall (WAF)' },
            { id: 'nsg', label: 'Network security group (NSG)' },
            { id: 'fw', label: 'Azure Firewall' }
          ],
          right: [
            { id: 'rflood', label: 'Keeps a service available during a large traffic flood' },
            { id: 'rweb', label: 'Protects a web app from common web exploits' },
            { id: 'riprule', label: 'Allows or denies traffic by basic IP and port rules' },
            { id: 'rmanaged', label: 'A managed, stateful firewall for a virtual network' }
          ]
        },
        answer: { pairs: { ddos: 'rflood', waf: 'rweb', nsg: 'riprule', fw: 'rmanaged' } } }
    ]
  },

  {
    id: 'sc900-dl-defender-12', cert: 'sc900', objective: '3.1', topic: 'Sentinel vs Defender for Cloud',
    title: 'Pick the right tool to investigate a multi-source incident', estMinutes: 3,
    pair: 'Sentinel vs Defender for Cloud', family: 'Defender family',
    scenario: 'After an alert fires, the SOC wants to <mark>hunt across months of collected logs from firewalls, identities, and endpoints in one workspace and visualize the incident on a timeline</mark> · not just see the posture of Azure resources.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which solution is built for org-wide log hunting and incident investigation?',
        explanation: 'The tell is "hunt across collected logs from many sources in one workspace, timeline." That is the SIEM job of Microsoft Sentinel. Defender for Cloud reports the posture of cloud resources; it is not the cross-source log-hunting workspace.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Sentinel' },
            { id: 'l2', text: 'Microsoft Defender for Cloud', why: 'Assesses the security posture and workload protection of Azure and multicloud resources · it is not the workspace where you hunt across months of firewall, identity, and endpoint logs.' },
            { id: 'l3', text: 'Microsoft Secure Score', why: 'Summarizes security posture as a single number with actions · it is a posture metric, not a log-hunting and incident-investigation tool.' },
            { id: 'l4', text: 'Microsoft Purview', why: 'Governs and classifies organizational data for compliance · it is not a SIEM for correlating security logs across sources.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-defender-13', cert: 'sc900', objective: '3.1', topic: 'Secure Score',
    title: 'Pick the Microsoft Secure Score purpose', estMinutes: 3,
    pair: 'Compliance Score vs Secure Score', family: 'Defender family',
    scenario: 'A SOC lead wants a single measurement of the organization\'s <mark>security posture across identities, devices, apps, and data, with recommended improvement actions</mark>.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which score measures security posture?',
        explanation: 'The tell is "security posture with improvement actions." Microsoft Secure Score measures security posture. Compliance Manager\'s compliance score measures progress against regulatory requirements, not security posture.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Secure Score' },
            { id: 'l2', text: 'Compliance score (Compliance Manager)', why: 'Measures progress toward regulatory and standards requirements · it tracks compliance obligations, not the technical security posture across identities and devices.' },
            { id: 'l3', text: 'Microsoft Sentinel analytics', why: 'Detect and correlate threats from log data · they are about active detection, not a posture-improvement score.' },
            { id: 'l4', text: 'Azure Advisor', why: 'Recommends optimizations across cost, performance, reliability, and security for Azure resources · it is not the cross-workload Secure Score for overall security posture.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-defender-14', cert: 'sc900', objective: '3.2', topic: 'Defender vs Cloud Apps boundary',
    title: 'Pick the right Defender for a SaaS data-leak', estMinutes: 3,
    pair: 'Defender for Endpoint vs Cloud Apps', family: 'Defender family',
    scenario: 'A user on a managed laptop is uploading large volumes of customer data to a <mark>personal cloud storage SaaS app</mark>. Security wants to detect and govern this risky SaaS activity.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which product governs the risky SaaS app activity?',
        explanation: 'The tell is "risky activity to a SaaS app." Even though the device is managed, the asset and risk are the SaaS app, so Defender for Cloud Apps governs it. Endpoint EDR watches the device, not SaaS session governance.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Defender for Cloud Apps' },
            { id: 'l2', text: 'Microsoft Defender for Endpoint', why: 'Protects and investigates the device itself · but the risk here is governance of the third-party SaaS app session, which is the cloud-app broker\'s domain.' },
            { id: 'l3', text: 'Microsoft Defender for Office 365', why: 'Secures Microsoft 365 email and collaboration · it does not govern uploads to a third-party personal cloud storage app.' },
            { id: 'l4', text: 'Microsoft Defender for Cloud', why: 'Manages Azure/multicloud infrastructure posture · it does not govern user activity into a SaaS storage app.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  // ========================================================================
  // ===== Domain 4 · Microsoft Purview / compliance (~20%) =================
  // ========================================================================
  {
    id: 'sc900-dl-purview-1', cert: 'sc900', objective: '4.2', topic: 'Sensitivity vs retention labels',
    title: 'Pick the sensitivity label use', estMinutes: 3,
    pair: 'Sensitivity vs Retention labels', family: 'Microsoft Purview',
    scenario: 'A company wants documents marked "Confidential" to be <mark>automatically encrypted and watermarked, with access restricted</mark> wherever the file travels.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Purview label does this?',
        explanation: 'The tell is "classify and protect: encrypt, watermark, restrict access." Sensitivity labels classify and protect content. Retention labels govern how long content is kept or deleted.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Sensitivity label' },
            { id: 'l2', text: 'Retention label', why: 'Controls how long content is kept and when it is deleted · it manages lifecycle, not encryption, watermarking, or access protection that travels with the file.' },
            { id: 'l3', text: 'A DLP policy', why: 'Detects and blocks risky sharing of sensitive content in motion · it enforces conditions, but it does not apply persistent encryption and watermarks as a classification on the document.' },
            { id: 'l4', text: 'An eDiscovery hold', why: 'Preserves content for legal cases · it freezes data, it does not classify and encrypt it for everyday protection.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-purview-2', cert: 'sc900', objective: '4.2', topic: 'Sensitivity vs retention labels',
    title: 'Pick the retention label use', estMinutes: 3,
    pair: 'Sensitivity vs Retention labels', family: 'Microsoft Purview',
    scenario: 'A regulation requires that financial records <mark>be kept for exactly seven years and then deleted</mark>, regardless of who has access to them.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Purview label enforces this?',
        explanation: 'The tell is "keep for seven years then delete." Retention labels govern data lifecycle (keep/delete schedules). Sensitivity labels are about classification and protection, not how long to keep content.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Retention label' },
            { id: 'l2', text: 'Sensitivity label', why: 'Classifies and protects content (encryption, access restriction) · it does not define a keep-for-seven-years-then-delete lifecycle.' },
            { id: 'l3', text: 'A DLP policy', why: 'Blocks risky sharing of sensitive data · it controls movement, not the mandated retention-and-deletion timeline.' },
            { id: 'l4', text: 'A sensitivity-based watermark', why: 'Is a visual marking applied by a sensitivity label · it has nothing to do with keeping records for a fixed retention period.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-purview-3', cert: 'sc900', objective: '4.2', topic: 'Data loss prevention',
    title: 'Pick the DLP use case', estMinutes: 3,
    pair: 'DLP vs Sensitivity label', family: 'Microsoft Purview',
    scenario: 'Security wants to <mark>automatically block an email if it contains credit-card numbers being sent to an external recipient</mark>.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Purview capability does this?',
        explanation: 'The tell is "detect sensitive content in motion and block sharing." Data loss prevention (DLP) detects sensitive data and enforces actions like blocking risky sharing.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Data loss prevention (DLP)' },
            { id: 'l2', text: 'A retention policy', why: 'Governs how long content is kept or deleted · it does not inspect outbound messages and block sharing of credit-card data.' },
            { id: 'l3', text: 'A sensitivity label', why: 'Classifies and protects a document, but the real-time inspect-and-block of an outbound email based on its content is the job of a DLP policy.' },
            { id: 'l4', text: 'eDiscovery', why: 'Finds and preserves content for legal cases · it is investigative, not a real-time block of risky outbound sharing.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-purview-4', cert: 'sc900', objective: '4.3', topic: 'Compliance Score vs Secure Score',
    title: 'Pick what compliance score measures', estMinutes: 3,
    pair: 'Compliance Score vs Secure Score', family: 'Microsoft Purview',
    scenario: 'A compliance officer wants a measurement of <mark>progress toward meeting regulatory requirements like GDPR or ISO 27001</mark>, with improvement actions mapped to controls.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which score and tool measures regulatory compliance progress?',
        explanation: 'The tell is "progress toward regulations/standards mapped to controls." Compliance Manager produces a compliance score against regulatory templates. Secure Score measures security posture, not regulatory compliance.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Compliance score in Microsoft Purview Compliance Manager' },
            { id: 'l2', text: 'Microsoft Secure Score', why: 'Measures technical security posture across identities, devices, apps, and data · it does not track progress against regulations like GDPR or ISO 27001.' },
            { id: 'l3', text: 'Microsoft Sentinel workbooks', why: 'Visualize security operations data · they are for SOC monitoring, not regulatory compliance scoring.' },
            { id: 'l4', text: 'Azure Advisor', why: 'Recommends resource optimizations · it does not measure compliance against legal or regulatory frameworks.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-purview-5', cert: 'sc900', objective: '4.3', topic: 'eDiscovery',
    title: 'Pick the legal-hold capability', estMinutes: 3,
    family: 'Microsoft Purview',
    scenario: 'Legal counsel needs to <mark>identify, preserve, and export content relevant to a lawsuit</mark> so it cannot be deleted while the case is open.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Purview solution supports this?',
        explanation: 'The tell is "identify, preserve, and export content for a legal case." eDiscovery finds and holds content for litigation; the hold prevents deletion.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'eDiscovery' },
            { id: 'l2', text: 'Data loss prevention (DLP)', why: 'Blocks risky sharing of sensitive data in real time · it does not collect and preserve content for a legal matter.' },
            { id: 'l3', text: 'A sensitivity label', why: 'Classifies and protects documents · it does not search, hold, and export content for litigation.' },
            { id: 'l4', text: 'A retention policy', why: 'Keeps or deletes content on a fixed schedule, but a legal hold via eDiscovery is what preserves specific case content against deletion.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-purview-6', cert: 'sc900', objective: '4.2', topic: 'Insider risk management',
    title: 'Pick the insider-risk solution', estMinutes: 3,
    pair: 'Insider Risk vs DLP', family: 'Microsoft Purview',
    scenario: 'A company wants to detect when a <mark>departing employee starts mass-downloading and exfiltrating internal documents</mark>, balancing detection with employee privacy.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Purview solution is designed for this?',
        explanation: 'The tell is "internal user risky behavior, exfiltration by an employee." Insider Risk Management detects and manages risks from internal users.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Insider Risk Management' },
            { id: 'l2', text: 'Data loss prevention (DLP)', why: 'Blocks specific risky sharing actions on sensitive content · it does not build a behavioral risk picture of an individual departing user over time.' },
            { id: 'l3', text: 'eDiscovery', why: 'Preserves and exports content for legal cases · it is reactive litigation support, not proactive insider-threat detection.' },
            { id: 'l4', text: 'Microsoft Defender for Endpoint', why: 'Provides device EDR against external malware/threats · it is not the insider-risk behavioral analytics solution.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-purview-7', cert: 'sc900', objective: '4.1', topic: 'Service Trust Portal',
    title: 'Pick where to get audit reports', estMinutes: 3,
    family: 'Microsoft Purview',
    scenario: 'A customer auditor asks for <mark>Microsoft\'s independent third-party audit reports and certifications (SOC, ISO)</mark> for the cloud services.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Where does Microsoft publish these compliance documents?',
        explanation: 'The tell is "Microsoft\'s own audit reports and certifications." The Service Trust Portal publishes Microsoft\'s independent audit reports and compliance documentation.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'The Service Trust Portal' },
            { id: 'l2', text: 'Compliance Manager', why: 'Helps you manage and score your own compliance posture with improvement actions · it is not the library of Microsoft\'s third-party audit reports.' },
            { id: 'l3', text: 'Microsoft Secure Score', why: 'Measures your security posture · it does not host Microsoft\'s SOC and ISO audit certifications.' },
            { id: 'l4', text: 'The Microsoft Entra admin center', why: 'Manages identities and access · it is not where Microsoft\'s compliance audit reports are published.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-purview-8', cert: 'sc900', objective: '4.2', topic: 'Data classification / sensitive info types',
    title: 'Pick how content is auto-detected', estMinutes: 3,
    pair: 'SIT vs labels', family: 'Microsoft Purview',
    scenario: 'Purview must <mark>automatically recognize patterns like passport numbers and bank account numbers in documents</mark> so labels and DLP can act on them.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Purview building block detects these patterns?',
        explanation: 'The tell is "recognize patterns like passport/bank numbers." Sensitive information types are the pattern definitions Purview uses to detect such data.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Sensitive information types' },
            { id: 'l2', text: 'Retention labels', why: 'Govern how long content is kept · they are an action applied to content, not the pattern-matching that detects passport or bank numbers.' },
            { id: 'l3', text: 'Conditional Access policies', why: 'Govern sign-in access in Entra · they have no role in detecting sensitive content patterns inside documents.' },
            { id: 'l4', text: 'eDiscovery search', why: 'Finds content for legal cases on demand · it is not the reusable pattern definition that auto-classifies sensitive data types.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-purview-9', cert: 'sc900', objective: '4.2', topic: 'Records management',
    title: 'Pick the immutable-records control', estMinutes: 3,
    pair: 'Retention vs Records management', family: 'Microsoft Purview',
    scenario: 'A regulation requires certain documents to be <mark>declared as records that cannot be edited or deleted until their retention period ends</mark>, with proof of disposition.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which Purview capability enforces immutable records?',
        explanation: 'The tell is "declare as a record, immutable, proof of disposition." Records management in Purview declares content as records and locks it. A plain sensitivity label only classifies and protects.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Records management' },
            { id: 'l2', text: 'A sensitivity label', why: 'Classifies and protects content (encryption, access) · it does not declare immutable records with a disposition review.' },
            { id: 'l3', text: 'A DLP policy', why: 'Blocks risky sharing in real time · it does not lock documents as undeletable records for a retention period.' },
            { id: 'l4', text: 'eDiscovery hold', why: 'Preserves content for a specific legal case · it is case-scoped, not a formal records-declaration program with disposition.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'sc900-dl-purview-10', cert: 'sc900', objective: '4.2', topic: 'Purview vs Defender boundary',
    title: 'Pick Purview vs Defender for data governance', estMinutes: 3,
    pair: 'Purview vs Defender', family: 'Microsoft Purview',
    scenario: 'Leadership asks which platform owns <mark>classifying, labeling, and governing the lifecycle of organizational data for compliance</mark>, as opposed to detecting and responding to threats.',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Which platform is the data governance and compliance suite?',
        explanation: 'The tell is "classify, label, govern data lifecycle for compliance" versus "detect/respond to threats." Microsoft Purview is the data governance and compliance suite; Defender is the threat-protection suite.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Purview' },
            { id: 'l2', text: 'Microsoft Defender XDR', why: 'Detects and responds to threats across endpoints, identities, email, and apps · it is threat protection, not the data classification and compliance governance suite.' },
            { id: 'l3', text: 'Microsoft Sentinel', why: 'Is the SIEM/SOAR for security operations · it correlates and responds to security signals, not the data-governance and labeling platform.' },
            { id: 'l4', text: 'Microsoft Entra ID', why: 'Manages identity and access · it governs who can sign in, not the classification and lifecycle of organizational data.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  }
];

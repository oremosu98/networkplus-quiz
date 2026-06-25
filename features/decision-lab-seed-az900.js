/* DRAFT az900 Decision Lab seed scenarios · answers NOT yet founder-verified. Review before ship. */
window.DECISION_LAB_SEED_AZ900 = [
  {
    id: 'az900-dl-concepts-1', cert: 'az900', objective: '1.1', topic: 'Cloud service models',
    title: 'Pick the model that removes OS patching', estMinutes: 3,
    scenario: 'A team wants to run a custom web app but no longer wants to patch the <mark>operating system</mark> or manage the runtime. They still want to deploy their own application code. Which cloud service model fits?',
    pair: 'IaaS vs PaaS vs SaaS',
    family: 'Cloud service models',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service model.',
        explanation: 'The tell is "no longer patch the OS or manage the runtime" BUT "deploy their own application code". PaaS hands the OS, runtime, and patching to the provider while you still own the app code. IaaS would still leave the OS to you; SaaS gives no place to deploy custom code.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'IaaS (Infrastructure as a Service)', why: 'IaaS gives you the VM but you still patch the guest OS and manage the runtime · exactly the work they want to drop.' },
            { id: 'l2', text: 'PaaS (Platform as a Service)' },
            { id: 'l3', text: 'SaaS (Software as a Service)', why: 'SaaS is finished software you just consume; there is no surface to deploy your own custom application code.' },
            { id: 'l4', text: 'On-premises', why: 'On-prem means you own everything from hardware up · the opposite of offloading OS patching.' }
          ]
        },
        answer: { selected: ['l2'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-2', cert: 'az900', objective: '1.1', topic: 'Cloud service models',
    title: 'Pick the model for a ready-to-use mail product', estMinutes: 3,
    scenario: 'A small business wants company email and calendaring with <mark>nothing to install or maintain</mark> · they just sign in and use it. Which model?',
    pair: 'IaaS vs PaaS vs SaaS',
    family: 'Cloud service models',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best service model.',
        explanation: 'The tell is "nothing to install or maintain, just sign in and use it" · that is finished software, SaaS (e.g. Microsoft 365). No code to deploy, no platform to manage.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'SaaS (Software as a Service)' },
            { id: 'l2', text: 'PaaS (Platform as a Service)', why: 'PaaS is for deploying your OWN application code on a managed platform · there is no app to build here, just a product to use.' },
            { id: 'l3', text: 'IaaS (Infrastructure as a Service)', why: 'IaaS would make them build and run the mail server on a VM themselves, the opposite of "nothing to maintain".' },
            { id: 'l4', text: 'Hybrid cloud', why: 'Hybrid describes WHERE resources live (mix of on-prem and cloud), not the as-a-service consumption level being asked about.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-3', cert: 'az900', objective: '1.1', topic: 'Cloud economics',
    title: 'Pick the term for pay-as-you-go spend', estMinutes: 3,
    scenario: 'A CFO notes that moving to Azure converts large up-front hardware purchases into a <mark>variable monthly bill based on usage</mark>. Which cost model describes the new spend?',
    pair: 'CapEx vs OpEx',
    family: 'Cloud economics',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the cost model.',
        explanation: 'The tell is "variable monthly bill based on usage" replacing "large up-front purchases". Ongoing usage-based spend is operational expenditure (OpEx); the up-front hardware buy was capital expenditure (CapEx).',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Operational expenditure (OpEx)' },
            { id: 'l2', text: 'Capital expenditure (CapEx)', why: 'CapEx is the big up-front asset purchase they are moving AWAY from, not the new usage-based bill.' },
            { id: 'l3', text: 'Total cost of ownership (TCO)', why: 'TCO is the lifetime sum of all costs for a comparison, not the accounting category of the new spend.' },
            { id: 'l4', text: 'Return on investment (ROI)', why: 'ROI measures gain relative to cost; it is not the term for how the spend itself is classified.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-4', cert: 'az900', objective: '1.1', topic: 'Scalability vs elasticity',
    title: 'Pick the trait for automatic scale to load', estMinutes: 3,
    scenario: 'A retailer wants resources to <mark>automatically add capacity at a traffic spike and remove it when traffic drops</mark>, with no human intervention. Which cloud characteristic is this?',
    pair: 'Scalability vs elasticity',
    family: 'Cloud benefits',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the characteristic.',
        explanation: 'The tell is "automatically add and remove capacity as demand changes, no human intervention". That automatic, demand-driven flex is elasticity. Scalability is the ability to grow, but not necessarily automatically or back down.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Elasticity' },
            { id: 'l2', text: 'Scalability', why: 'Scalability is the capacity to grow (often a planned, manual resize up or out); it does not imply automatic shrink-back when load falls · elasticity is the automatic two-way flex.' },
            { id: 'l3', text: 'Vertical scaling (scale up)', why: 'Scaling up adds CPU/RAM to a single instance and usually means a manual resize and reboot; it is a sizing action, not automatic demand-driven add/remove.' },
            { id: 'l4', text: 'Over-provisioning', why: 'Over-provisioning means paying up front for peak capacity that sits idle most of the time · the opposite of elastically matching capacity to live demand.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-5', cert: 'az900', objective: '1.1', topic: 'Cloud deployment models',
    title: 'Pick the deployment model for keep-some-on-prem', estMinutes: 3,
    scenario: 'A bank must keep a <mark>regulated workload in its own datacenter</mark> but wants to burst other workloads into Azure and connect the two. Which deployment model?',
    pair: 'Public vs private vs hybrid',
    family: 'Cloud deployment models',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the deployment model.',
        explanation: 'The tell is "keep a regulated workload on-prem AND use Azure for others, connected together". Mixing on-prem (private) with public cloud is the hybrid model.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Hybrid cloud' },
            { id: 'l2', text: 'Public cloud', why: 'Public cloud alone cannot satisfy the requirement to keep the regulated workload in their own datacenter.' },
            { id: 'l3', text: 'Private cloud', why: 'Private cloud alone is just the on-prem side; it misses the requirement to also use Azure for the other workloads.' },
            { id: 'l4', text: 'Community cloud', why: 'Community cloud is shared by organizations with common concerns; it does not describe mixing on-prem with public cloud.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-6', cert: 'az900', objective: '1.2', topic: 'Azure global infrastructure',
    title: 'Pick the construct that survives a datacenter failure', estMinutes: 3,
    scenario: 'An architect wants a VM deployment that stays up if <mark>one physically separate datacenter within the same region</mark> loses power. Which Azure construct delivers this?',
    pair: 'Region vs Availability Zone',
    family: 'Global infrastructure',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the construct.',
        explanation: 'The tell is "physically separate datacenter within the same region". Availability Zones are physically separate datacenters inside one region with independent power, cooling, and networking · spreading across zones survives a single-datacenter failure.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Availability Zones' },
            { id: 'l2', text: 'Region pairs', why: 'Region pairs protect against a whole-region disaster across distant regions; the ask is about separate datacenters WITHIN one region.' },
            { id: 'l3', text: 'Resource groups', why: 'A resource group is a logical management container for billing and lifecycle; it provides no physical fault isolation.' },
            { id: 'l4', text: 'Availability sets', why: 'Availability sets spread VMs across fault and update domains in ONE datacenter; they do not survive a full datacenter loss like zones do.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-7', cert: 'az900', objective: '1.2', topic: 'Azure global infrastructure',
    title: 'Pick the unit for data-residency placement', estMinutes: 3,
    scenario: 'A government customer requires that all data physically reside <mark>within a specific country geography</mark>. Which Azure boundary do you choose deployments against?',
    pair: 'Region vs Geography',
    family: 'Global infrastructure',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the boundary.',
        explanation: 'The tell is "within a specific country geography" for data residency. An Azure geography is the data-residency and compliance boundary (often a country) that contains one or more regions.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure geography' },
            { id: 'l2', text: 'Availability Zone', why: 'A zone is a datacenter-level fault boundary inside a region; it is far below the country-level residency boundary being asked about.' },
            { id: 'l3', text: 'Resource group', why: 'A resource group is a logical container and does not enforce a country-level data-residency boundary.' },
            { id: 'l4', text: 'Subscription', why: 'A subscription is a billing and access boundary; data residency is governed by the geography, not the subscription itself.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-8', cert: 'az900', objective: '1.2', topic: 'Management hierarchy',
    title: 'Order the Azure management scopes', estMinutes: 3,
    scenario: 'Put the Azure resource-management scopes in order from the broadest (top) to the most specific (bottom).',
    family: 'Management hierarchy',
    steps: [
      { id: 's1', type: 'order', points: 1,
        prompt: 'Arrange from broadest to most specific.',
        explanation: 'The hierarchy, broadest to narrowest: Management group (organizes subscriptions) > Subscription (billing/access boundary) > Resource group (logical container) > Resource (the individual service instance). Policy and RBAC applied higher up inherit downward.',
        payload: { items: [
          { id: 'rg', label: 'Resource group' },
          { id: 'mg', label: 'Management group' },
          { id: 'res', label: 'Resource' },
          { id: 'sub', label: 'Subscription' }
        ] },
        answer: { correctOrder: ['mg', 'sub', 'rg', 'res'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-9', cert: 'az900', objective: '1.1', topic: 'Cloud benefits',
    title: 'Pick the benefit for fixed-cost spikes', estMinutes: 3,
    scenario: 'A startup wants to <mark>pay only for the compute it actually consumes</mark> and owe nothing when an app is idle. Which cloud benefit is this?',
    pair: 'Consumption-based vs reserved',
    family: 'Cloud benefits',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the benefit.',
        explanation: 'The tell is "pay only for what you consume, nothing when idle". That is the consumption-based (pay-as-you-go) pricing model. Reserved capacity bills whether you use it or not.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Consumption-based pricing' },
            { id: 'l2', text: 'Reserved capacity (Reserved Instances)', why: 'Reservations commit you to (and bill you for) capacity for 1 or 3 years even when idle · the opposite of paying nothing when idle.' },
            { id: 'l3', text: 'Capital expenditure (CapEx) model', why: 'CapEx means a large up-front purchase of fixed capacity; it does not flex to zero when an app is idle the way consumption billing does.' },
            { id: 'l4', text: 'Azure Hybrid Benefit', why: 'Hybrid Benefit reuses existing Windows/SQL licenses to cut compute cost; it is a licensing discount, not the pay-only-for-what-you-consume model.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-10', cert: 'az900', objective: '1.2', topic: 'Resilience constructs',
    title: 'Match the resilience construct', estMinutes: 4,
    scenario: 'Match each Azure resilience construct to what it protects against.',
    family: 'Resilience constructs',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each construct with the failure it mitigates.',
        explanation: 'Availability sets protect against rack-level hardware and planned-maintenance failures within one datacenter. Availability Zones protect against a whole-datacenter failure within a region. Region pairs protect against a region-wide disaster. Load balancing distributes traffic across healthy instances.',
        payload: {
          left: [
            { id: 'set', label: 'Availability set' },
            { id: 'zone', label: 'Availability Zone' },
            { id: 'pair', label: 'Region pair' },
            { id: 'lb', label: 'Load balancer' }
          ],
          right: [
            { id: 'drack', label: 'Rack/maintenance failure in one datacenter' },
            { id: 'ddc', label: 'Loss of an entire datacenter in a region' },
            { id: 'dregion', label: 'A region-wide disaster' },
            { id: 'ddistribute', label: 'Spreads traffic across healthy instances' }
          ]
        },
        answer: { pairs: { set: 'drack', zone: 'ddc', pair: 'dregion', lb: 'ddistribute' } } }
    ]
  },

  {
    id: 'az900-dl-concepts-11', cert: 'az900', objective: '1.1', topic: 'Cloud service models',
    title: 'Categorize who manages each layer (PaaS web app)', estMinutes: 4,
    scenario: 'A team deploys a web app on Azure App Service (PaaS). Sort each layer by who is responsible for it.',
    pair: 'IaaS vs PaaS responsibility',
    family: 'Shared responsibility',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each layer under Customer or Microsoft.',
        explanation: 'On PaaS App Service, Microsoft runs the physical hosts, OS, and runtime/platform; the customer still owns their application code, their data, and their accounts/identities. Compared to IaaS, PaaS shifts the OS and runtime to Microsoft.',
        payload: {
          items: [
            { id: 'physical', label: 'Physical datacenter and hosts' },
            { id: 'os', label: 'Guest OS patching' },
            { id: 'runtime', label: 'Application runtime/platform' },
            { id: 'appcode', label: 'Your application code' },
            { id: 'data', label: 'Your data' },
            { id: 'identity', label: 'User accounts and access' }
          ],
          buckets: [
            { id: 'ms', label: 'Microsoft' },
            { id: 'cust', label: 'Customer' }
          ]
        },
        answer: { map: { physical: 'ms', os: 'ms', runtime: 'ms', appcode: 'cust', data: 'cust', identity: 'cust' } } }
    ]
  },

  {
    id: 'az900-dl-compute-1', cert: 'az900', objective: '2.1', topic: 'Compute services',
    title: 'Pick compute for a short event-driven function', estMinutes: 3,
    scenario: 'A developer needs to run a small piece of code <mark>only when a message lands on a queue</mark>, paying nothing when no messages arrive, with no server to manage. Which compute service?',
    pair: 'Functions vs App Service vs VMs',
    family: 'Compute services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best compute service.',
        explanation: 'The tell is "run code only on an event, pay nothing when idle, no server to manage". Azure Functions is the serverless, event-triggered, consumption-billed option.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Functions' },
            { id: 'l2', text: 'Azure App Service', why: 'App Service hosts always-on web apps; it bills for the plan even when idle and is not the event-triggered serverless model described.' },
            { id: 'l3', text: 'Azure Virtual Machines', why: 'A VM runs continuously and you manage the OS · heavyweight for a tiny event handler that should cost nothing when idle.' },
            { id: 'l4', text: 'Azure Kubernetes Service', why: 'AKS orchestrates long-running containers and a cluster you manage; overkill for a single event-driven snippet.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-compute-2', cert: 'az900', objective: '2.1', topic: 'Compute services',
    title: 'Pick compute for a hosted web app, no OS work', estMinutes: 3,
    scenario: 'A team has a standard web application and wants it hosted with built-in scaling and deployment slots, but <mark>does not want to manage the underlying OS</mark>. Which service?',
    pair: 'Functions vs App Service vs VMs',
    family: 'Compute services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best compute service.',
        explanation: 'The tell is "standard always-on web app, built-in scaling and deployment slots, no OS to manage". Azure App Service is the PaaS web-hosting platform with those exact features.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure App Service' },
            { id: 'l2', text: 'Azure Functions', why: 'Functions is for short event-driven snippets, not an always-on web app with deployment slots; long-running web hosting is not its model.' },
            { id: 'l3', text: 'Azure Virtual Machines', why: 'A VM would force them to manage the OS and patching · the very thing they want to avoid.' },
            { id: 'l4', text: 'Azure Container Instances', why: 'ACI runs single isolated containers without web-app features like deployment slots or built-in autoscale plans.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-compute-3', cert: 'az900', objective: '2.1', topic: 'Compute services',
    title: 'Pick compute for full OS control / legacy app', estMinutes: 3,
    scenario: 'A company must run a legacy application that requires a <mark>specific OS configuration and full administrative control of the server</mark>. Which compute service?',
    pair: 'Functions vs App Service vs VMs',
    family: 'Compute services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best compute service.',
        explanation: 'The tell is "specific OS configuration and full administrative control of the server". Azure Virtual Machines (IaaS) gives complete control of the guest OS, which legacy/custom apps often require.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Virtual Machines' },
            { id: 'l2', text: 'Azure App Service', why: 'App Service abstracts away the OS, so you cannot make the specific low-level OS changes a legacy app may need.' },
            { id: 'l3', text: 'Azure Functions', why: 'Functions gives you no control of the OS at all and targets short event-driven code, not a full legacy server.' },
            { id: 'l4', text: 'Azure Container Instances', why: 'ACI runs a container, not a full configurable guest OS with administrative control of the host.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-compute-4', cert: 'az900', objective: '2.1', topic: 'Compute services',
    title: 'Pick compute for a single quick container', estMinutes: 3,
    scenario: 'A developer wants to run a <mark>single container for a short batch job</mark> without standing up an orchestrator or cluster. Which service is the simplest fit?',
    pair: 'ACI vs AKS',
    family: 'Compute services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best compute service.',
        explanation: 'The tell is "single container, short job, no orchestrator or cluster". Azure Container Instances runs an individual container fast with no cluster to manage. AKS is for orchestrating many containers at scale.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Container Instances (ACI)' },
            { id: 'l2', text: 'Azure Kubernetes Service (AKS)', why: 'AKS is a full orchestrator for fleets of containers; standing up a cluster is overkill for one short batch container.' },
            { id: 'l3', text: 'Azure Virtual Machines', why: 'A VM means installing a container runtime and managing the OS yourself · heavier than just running the container.' },
            { id: 'l4', text: 'Azure App Service', why: 'App Service targets always-on web apps, not a one-off short-lived batch container.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-storage-1', cert: 'az900', objective: '2.1', topic: 'Storage services',
    title: 'Pick storage for unstructured object data', estMinutes: 3,
    scenario: 'An app must store millions of <mark>images and video files</mark> for cheap, accessed over HTTP. Which Azure storage service?',
    pair: 'Blob vs Files vs Disk',
    family: 'Storage services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best storage service.',
        explanation: 'The tell is "millions of images/video, unstructured objects over HTTP". Azure Blob Storage is built for massive unstructured object data accessed via HTTP/REST.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Blob Storage' },
            { id: 'l2', text: 'Azure Files', why: 'Azure Files is an SMB/NFS file share for lift-and-shift file-server scenarios, not optimized for serving millions of objects over HTTP.' },
            { id: 'l3', text: 'Azure managed disks', why: 'Disks are block storage attached to a single VM, not an HTTP-accessible object store for shared unstructured data.' },
            { id: 'l4', text: 'Azure Table Storage', why: 'Table Storage holds structured NoSQL key-value rows, not large binary media files.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-storage-2', cert: 'az900', objective: '2.1', topic: 'Storage services',
    title: 'Pick storage for a shared network drive', estMinutes: 3,
    scenario: 'Several VMs and on-prem users need a <mark>shared file share they can mount with SMB</mark>, like a traditional network drive. Which service?',
    pair: 'Blob vs Files vs Disk',
    family: 'Storage services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best storage service.',
        explanation: 'The tell is "shared file share mounted over SMB, like a network drive". Azure Files provides fully managed SMB/NFS file shares that multiple clients can mount.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Files' },
            { id: 'l2', text: 'Azure Blob Storage', why: 'Blob is object storage accessed over HTTP/REST; it is not mounted as an SMB network drive that apps treat like a file system.' },
            { id: 'l3', text: 'Azure managed disks', why: 'A managed disk attaches to one VM as block storage; it is not a multi-client SMB share.' },
            { id: 'l4', text: 'Azure Queue Storage', why: 'Queue Storage holds messages for app decoupling, not a mountable file share.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-storage-3', cert: 'az900', objective: '2.1', topic: 'Blob access tiers',
    title: 'Pick the tier for rarely-touched archives', estMinutes: 3,
    scenario: 'A firm must retain compliance records for 7 years. The data is <mark>almost never read, can tolerate hours to retrieve</mark>, and lowest storage cost is the priority. Which Blob access tier?',
    pair: 'Hot vs Cool vs Archive',
    family: 'Storage services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best access tier.',
        explanation: 'The tell is "almost never read, can tolerate hours to retrieve, lowest storage cost". The Archive tier has the lowest storage price and accepts rehydration latency measured in hours.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Archive tier' },
            { id: 'l2', text: 'Cool tier', why: 'Cool offers millisecond access just like Hot; its real cost is a 30-day minimum storage commitment and higher per-read access charges, and its storage price is still above Archive · wrong when data is almost never read and hours-to-retrieve is acceptable.' },
            { id: 'l3', text: 'Hot tier', why: 'Hot is the most expensive storage tier, meant for frequently accessed data · wrong when data is almost never read.' },
            { id: 'l4', text: 'Premium block blob', why: 'Premium targets high-transaction, low-latency workloads at the highest storage cost · the opposite of cheap cold archives.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-storage-4', cert: 'az900', objective: '2.1', topic: 'Storage redundancy',
    title: 'Pick redundancy that survives a region loss', estMinutes: 3,
    scenario: 'Data must remain available even if an <mark>entire Azure region is lost</mark>. Which storage redundancy option meets this with the least configuration?',
    pair: 'LRS vs ZRS vs GRS',
    family: 'Storage redundancy',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the redundancy option.',
        explanation: 'The tell is "available even if an entire region is lost". Geo-redundant storage (GRS) replicates to a secondary region. LRS and ZRS stay within a single region and cannot survive a full-region loss.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Geo-redundant storage (GRS)' },
            { id: 'l2', text: 'Zone-redundant storage (ZRS)', why: 'ZRS copies data across zones within ONE region; a region-wide loss takes all those copies with it.' },
            { id: 'l3', text: 'Locally redundant storage (LRS)', why: 'LRS keeps three copies in a single datacenter; it protects against drive failure, not the loss of a whole region.' },
            { id: 'l4', text: 'Read-access geo-redundant storage (RA-GRS)', why: 'RA-GRS does survive a region loss, but its distinguishing feature is read access to the secondary copy · the ask was the least-configuration option to survive region loss, which is plain GRS; RA-GRS adds read access you did not require.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-network-1', cert: 'az900', objective: '2.1', topic: 'Networking services',
    title: 'Pick the connection for private, dedicated link', estMinutes: 3,
    scenario: 'An enterprise wants a <mark>private connection from its datacenter to Azure that does not traverse the public internet</mark>, with predictable bandwidth. Which service?',
    pair: 'VPN Gateway vs ExpressRoute',
    family: 'Networking services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the connectivity service.',
        explanation: 'The tell is "private connection that does NOT traverse the public internet, predictable bandwidth". ExpressRoute provides a dedicated private circuit via a connectivity provider. A VPN Gateway tunnels over the public internet.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure ExpressRoute' },
            { id: 'l2', text: 'VPN Gateway (site-to-site)', why: 'A site-to-site VPN encrypts traffic but still rides over the PUBLIC internet, so it cannot meet the no-public-internet requirement.' },
            { id: 'l3', text: 'Azure Application Gateway', why: 'Application Gateway is a layer-7 web load balancer inside Azure, not a private link from on-prem to Azure.' },
            { id: 'l4', text: 'Azure Virtual Network peering', why: 'VNet peering links two Azure VNets to each other; it does not connect an on-prem datacenter to Azure.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-network-2', cert: 'az900', objective: '2.1', topic: 'Networking services',
    title: 'Pick the load balancer for URL-based routing', estMinutes: 3,
    scenario: 'A web platform needs to route requests to different backends <mark>based on the URL path and offload TLS</mark> at layer 7. Which service?',
    pair: 'Load Balancer vs Application Gateway',
    family: 'Networking services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the service.',
        explanation: 'The tell is "route based on URL path and offload TLS at layer 7". Azure Application Gateway is the layer-7 (HTTP/S) load balancer with URL path-based routing and TLS termination. Azure Load Balancer is layer 4 only.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Application Gateway' },
            { id: 'l2', text: 'Azure Load Balancer', why: 'Azure Load Balancer works at layer 4 (TCP/UDP); it cannot read URL paths or terminate TLS like a layer-7 gateway.' },
            { id: 'l3', text: 'Azure Firewall', why: 'Azure Firewall is a stateful network security service for filtering traffic, not a URL-path web load balancer.' },
            { id: 'l4', text: 'Azure Front Door', why: 'Front Door also does layer-7 path-based routing and TLS, but it is a GLOBAL CDN-style entry point across regions; Application Gateway is the regional layer-7 load balancer for backends inside one VNet, which is what this single-region web platform needs.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-network-3', cert: 'az900', objective: '2.1', topic: 'Networking services',
    title: 'Pick the control to filter subnet traffic', estMinutes: 3,
    scenario: 'A team must <mark>allow or deny traffic to a subnet by IP, port, and protocol</mark> at no extra cost, as a basic firewall on the VNet. Which feature?',
    pair: 'NSG vs Azure Firewall',
    family: 'Networking services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the feature.',
        explanation: 'The tell is "allow/deny by IP, port, protocol at no extra cost, basic subnet filtering". A Network Security Group (NSG) is the free, basic packet filter on subnets and NICs. Azure Firewall is a separately billed managed firewall service.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Network Security Group (NSG)' },
            { id: 'l2', text: 'Azure Firewall', why: 'Azure Firewall is a managed, separately billed stateful firewall with advanced features; the ask was a basic no-extra-cost subnet filter.' },
            { id: 'l3', text: 'Azure DDoS Protection', why: 'DDoS Protection defends against volumetric attacks; it does not provide per-rule allow/deny by port and protocol.' },
            { id: 'l4', text: 'Application Gateway WAF', why: 'A WAF inspects layer-7 web traffic for exploits; it is not a basic IP/port/protocol subnet filter.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-identity-1', cert: 'az900', objective: '2.2', topic: 'Identity',
    title: 'Pick the term for proving who you are', estMinutes: 3,
    scenario: 'A user signs in by entering a username and password. The system is confirming <mark>who the user is</mark>, not what they may access. Which process is this?',
    pair: 'Authentication vs Authorization',
    family: 'Identity & access',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the process.',
        explanation: 'The tell is "confirming who the user is, not what they may access". Proving identity is authentication (authN). Authorization (authZ) is the separate step of deciding what an authenticated user is allowed to do.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Authentication' },
            { id: 'l2', text: 'Authorization', why: 'Authorization decides what an already-identified user can access; it is the step AFTER proving identity, not the proof itself.' },
            { id: 'l3', text: 'Accounting', why: 'Accounting/auditing records what a user did; it does not establish their identity at sign-in.' },
            { id: 'l4', text: 'Federation', why: 'Federation lets one identity provider be trusted by another; it is a trust relationship, not the act of proving identity here.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-identity-2', cert: 'az900', objective: '2.2', topic: 'Identity',
    title: 'Pick the control for risk-based sign-in rules', estMinutes: 3,
    scenario: 'Security wants to <mark>require MFA only when a sign-in comes from an unfamiliar location or risky device</mark>, and block legacy auth. Which Entra ID capability?',
    pair: 'MFA vs Conditional Access',
    family: 'Identity & access',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the capability.',
        explanation: 'The tell is "require MFA ONLY under certain conditions (location, device risk) and block legacy auth". Conditional Access evaluates signals and applies policies; MFA is just one control it can enforce.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Conditional Access' },
            { id: 'l2', text: 'Multi-factor authentication (MFA)', why: 'MFA is the control being applied; on its own it cannot decide WHEN to require it based on location or device risk · that logic is Conditional Access.' },
            { id: 'l3', text: 'Single sign-on (SSO)', why: 'SSO lets users authenticate once across apps; it does not enforce risk-based conditional policies.' },
            { id: 'l4', text: 'Privileged Identity Management (PIM)', why: 'PIM provides just-in-time elevation for admin roles; it does not gate ordinary sign-ins by location or device risk.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-identity-3', cert: 'az900', objective: '2.2', topic: 'Identity',
    title: 'Pick the feature for sign-in-once across apps', estMinutes: 3,
    scenario: 'Employees complain they re-enter credentials for every app. IT wants them to <mark>authenticate once and access many applications</mark> without signing in again. Which capability?',
    pair: 'SSO vs MFA',
    family: 'Identity & access',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the capability.',
        explanation: 'The tell is "authenticate once and access many apps without re-signing-in". That is single sign-on (SSO). MFA adds factors at sign-in; it does not reduce the number of sign-ins.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Single sign-on (SSO)' },
            { id: 'l2', text: 'Multi-factor authentication (MFA)', why: 'MFA strengthens each sign-in with extra factors; it does not let users skip signing in to additional apps.' },
            { id: 'l3', text: 'Conditional Access', why: 'Conditional Access enforces policy conditions on access; it is not the mechanism that grants one-time sign-in across many apps.' },
            { id: 'l4', text: 'Role-based access control (RBAC)', why: 'RBAC governs what resources a user can manage, not how many times they must sign in.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-identity-4', cert: 'az900', objective: '2.2', topic: 'Identity',
    title: 'Pick identity for external partner collaboration', estMinutes: 3,
    scenario: 'A company wants <mark>external partners to sign in with their own existing credentials</mark> to access shared resources, without creating new internal accounts. Which Entra feature?',
    pair: 'B2B vs B2C',
    family: 'Identity & access',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the feature.',
        explanation: 'The tell is "external business partners sign in with their own credentials to access shared resources". Entra External ID B2B collaboration invites partner identities as guests. B2C is for customer-facing consumer apps.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Entra B2B collaboration (guest users)' },
            { id: 'l2', text: 'Entra B2C', why: 'B2C is for consumer/customer identities in a public-facing app, not for inviting known business partners into shared corporate resources.' },
            { id: 'l3', text: 'Privileged Identity Management', why: 'PIM manages just-in-time admin role elevation for internal staff, not external partner access.' },
            { id: 'l4', text: 'Managed identities', why: 'Managed identities give Azure resources an automatic identity to call other services; they are not for human partner sign-in.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-compute-5', cert: 'az900', objective: '2.1', topic: 'Compute services',
    title: 'Categorize compute services by management level', estMinutes: 4,
    scenario: 'Sort each Azure compute service by how much infrastructure the customer manages.',
    family: 'Compute services',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each service under You manage the OS (IaaS) or Provider manages the platform (PaaS/serverless).',
        explanation: 'Virtual Machines are IaaS: you own the guest OS. App Service, Functions, and AKS are managed platforms where Microsoft runs the underlying OS/platform and you bring code or containers.',
        payload: {
          items: [
            { id: 'vm', label: 'Virtual Machines' },
            { id: 'appsvc', label: 'App Service' },
            { id: 'func', label: 'Azure Functions' },
            { id: 'aks', label: 'Azure Kubernetes Service' }
          ],
          buckets: [
            { id: 'iaas', label: 'You manage the OS (IaaS)' },
            { id: 'paas', label: 'Provider manages the platform' }
          ]
        },
        answer: { map: { vm: 'iaas', appsvc: 'paas', func: 'paas', aks: 'paas' } } }
    ]
  },

  {
    id: 'az900-dl-storage-6', cert: 'az900', objective: '2.1', topic: 'Storage migration tools',
    title: 'Pick the tool for offline bulk data transfer', estMinutes: 3,
    scenario: 'A company must move <mark>hundreds of terabytes to Azure but has limited network bandwidth</mark> and a deadline. Which approach moves the data fastest?',
    pair: 'Data Box vs network upload',
    family: 'Storage services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the approach.',
        explanation: 'The tell is "hundreds of terabytes, limited bandwidth, deadline". Azure Data Box ships a physical appliance you load and return, bypassing the slow network link for very large offline transfers.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Data Box (ship a physical appliance)' },
            { id: 'l2', text: 'Upload over the existing internet link with AzCopy', why: 'With limited bandwidth, pushing hundreds of TB over the wire could take weeks and miss the deadline · the constraint rules it out.' },
            { id: 'l3', text: 'Azure ExpressRoute provisioned today', why: 'Provisioning a dedicated circuit takes time and still streams the data over the link; it is not the fast offline path for a one-time bulk move.' },
            { id: 'l4', text: 'Azure File Sync', why: 'File Sync tiers and syncs ongoing file-server data; it is not a bulk one-time TB-scale seeding tool over a constrained link.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-cost-1', cert: 'az900', objective: '3.2', topic: 'Cost management tools',
    title: 'Pick the tool to compare on-prem vs Azure before migrating', estMinutes: 3,
    scenario: 'A finance team wants to know how much they will <mark>save versus their current on-prem datacenter before moving anything</mark> to Azure. Which tool?',
    pair: 'Pricing vs TCO vs Cost Management',
    family: 'Cost & pricing tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best cost tool.',
        explanation: 'The tell is "save versus current on-prem BEFORE moving anything". The TCO Calculator compares an existing on-prem footprint against Azure pre-migration · exactly this ask.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Pricing Calculator', why: 'The Pricing Calculator estimates the cost of NEW Azure services you are about to build; it has no on-prem baseline to compare against.' },
            { id: 'l2', text: 'TCO Calculator' },
            { id: 'l3', text: 'Microsoft Cost Management', why: 'Cost Management monitors and analyzes spend on resources you ALREADY run in Azure; there is nothing migrated yet to track.' },
            { id: 'l4', text: 'Azure Advisor', why: 'Advisor recommends optimizations on deployed resources; it does not model a pre-migration on-prem-versus-Azure comparison.' }
          ]
        },
        answer: { selected: ['l2'] } }
    ]
  },

  {
    id: 'az900-dl-cost-2', cert: 'az900', objective: '3.2', topic: 'Cost management tools',
    title: 'Pick the tool to estimate a planned new deployment', estMinutes: 3,
    scenario: 'An architect is designing a new solution and wants to <mark>estimate the monthly cost of the specific Azure services they plan to deploy</mark>, before building it. Which tool?',
    pair: 'Pricing vs TCO vs Cost Management',
    family: 'Cost & pricing tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best cost tool.',
        explanation: 'The tell is "estimate the cost of specific NEW Azure services before building". The Pricing Calculator prices a hypothetical set of Azure services you intend to deploy.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Pricing Calculator' },
            { id: 'l2', text: 'TCO Calculator', why: 'The TCO Calculator compares an EXISTING on-prem setup against Azure; here there is no on-prem baseline, just new Azure services to price.' },
            { id: 'l3', text: 'Microsoft Cost Management', why: 'Cost Management reports on resources you are ALREADY running; it cannot price a deployment that does not exist yet.' },
            { id: 'l4', text: 'Azure Advisor', why: 'Advisor optimizes resources already deployed; it does not produce an up-front estimate for a planned build.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-cost-3', cert: 'az900', objective: '3.2', topic: 'Cost management tools',
    title: 'Pick the tool to track and alert on current spend', estMinutes: 3,
    scenario: 'A team is already running workloads in Azure and wants to <mark>monitor actual spend, set budgets, and get alerts</mark> when costs trend over budget. Which tool?',
    pair: 'Pricing vs TCO vs Cost Management',
    family: 'Cost & pricing tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the best cost tool.',
        explanation: 'The tell is "already running, monitor actual spend, set budgets, get alerts". Microsoft Cost Management analyzes real consumption and supports budgets and alerts on existing resources.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Microsoft Cost Management' },
            { id: 'l2', text: 'Pricing Calculator', why: 'The Pricing Calculator only estimates costs for services not yet deployed; it does not track actual spend or fire budget alerts.' },
            { id: 'l3', text: 'TCO Calculator', why: 'The TCO Calculator is a one-time pre-migration comparison; it does not monitor live spend or set ongoing budgets.' },
            { id: 'l4', text: 'Azure Advisor', why: 'Advisor surfaces cost-saving recommendations but is not the budgeting-and-alerting tool for tracking actual spend over time.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-cost-4', cert: 'az900', objective: '3.2', topic: 'Cost management tools',
    title: 'Match the cost tool to its job', estMinutes: 4,
    scenario: 'Match each Azure cost-related tool to the question it answers.',
    pair: 'Pricing vs TCO vs Cost Management',
    family: 'Cost & pricing tools',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each tool with the question it answers.',
        explanation: 'Pricing Calculator: what will a planned NEW deployment cost? TCO Calculator: how much do I save moving on-prem to Azure? Cost Management: what am I spending now and am I over budget? Azure Advisor: how can I optimize what I already run?',
        payload: {
          left: [
            { id: 'pricing', label: 'Pricing Calculator' },
            { id: 'tco', label: 'TCO Calculator' },
            { id: 'costmgmt', label: 'Cost Management' },
            { id: 'advisor', label: 'Azure Advisor' }
          ],
          right: [
            { id: 'dnew', label: 'What will a planned new deployment cost?' },
            { id: 'dmigrate', label: 'How much do I save moving on-prem to Azure?' },
            { id: 'dspend', label: 'What am I spending now and am I over budget?' },
            { id: 'doptimize', label: 'How do I optimize resources I already run?' }
          ]
        },
        answer: { pairs: { pricing: 'dnew', tco: 'dmigrate', costmgmt: 'dspend', advisor: 'doptimize' } } }
    ]
  },

  {
    id: 'az900-dl-cost-5', cert: 'az900', objective: '3.2', topic: 'Cost savings',
    title: 'Pick the discount for steady 3-year compute', estMinutes: 3,
    scenario: 'A workload runs <mark>24/7 with predictable demand for the next three years</mark>. Finance wants the biggest discount versus pay-as-you-go without changing the workload. Which option?',
    pair: 'Reservations vs Spot vs PAYG',
    family: 'Cost & pricing tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the option.',
        explanation: 'The tell is "predictable 24/7 demand for three years, biggest discount, no workload change". Azure Reservations (reserved instances) give a large discount for committing to 1- or 3-year steady capacity.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Reservations (1- or 3-year)' },
            { id: 'l2', text: 'Azure Spot VMs', why: 'Spot is cheapest but can be evicted at any time; it suits interruptible batch work, not a steady 24/7 production workload.' },
            { id: 'l3', text: 'Pay-as-you-go', why: 'Pay-as-you-go is the baseline rate with no commitment discount, so it costs the most for a predictable long-running workload.' },
            { id: 'l4', text: 'Azure Hybrid Benefit only', why: 'Hybrid Benefit reuses existing Windows/SQL licenses for savings, but it is a license benefit, not the term-commitment discount being asked for.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-gov-1', cert: 'az900', objective: '3.1', topic: 'Governance tools',
    title: 'Pick the tool to enforce allowed regions', estMinutes: 3,
    scenario: 'Governance wants to <mark>deny creation of any resource outside approved regions</mark>, automatically, across many subscriptions. Which tool?',
    pair: 'Policy vs RBAC vs Locks',
    family: 'Governance tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the governance tool.',
        explanation: 'The tell is "deny creation of resources that violate a rule (allowed regions), automatically". Azure Policy enforces rules on resource properties and can deny non-compliant deployments. RBAC controls who can act; Locks prevent delete/change.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Policy' },
            { id: 'l2', text: 'Role-based access control (RBAC)', why: 'RBAC decides WHO can perform actions; it cannot enforce a property rule like "only these regions" on the resources themselves.' },
            { id: 'l3', text: 'Resource locks', why: 'Locks stop a resource from being deleted or modified; they do not evaluate or deny new deployments by region.' },
            { id: 'l4', text: 'Management groups', why: 'Management groups are a scope to apply policy/RBAC across subscriptions, but the enforcing rule itself is Azure Policy.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-gov-2', cert: 'az900', objective: '3.1', topic: 'Governance tools',
    title: 'Pick the tool to let one auditor view but not change', estMinutes: 3,
    scenario: 'An admin must let a single named auditor <mark>see the configuration of a resource group but change nothing</mark>, and the restriction must apply only to that one person. Which mechanism assigns that?',
    pair: 'Policy vs RBAC vs Locks',
    family: 'Governance tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the mechanism.',
        explanation: 'The tell is "ONE named person can view but not change" · scoping a permission to a specific user is about WHO can do WHAT, so it is RBAC (assign that user the Reader role). A ReadOnly resource lock looks similar but applies to EVERYONE regardless of identity, so it cannot single out one auditor. Policy governs resource properties, not per-user access.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Role-based access control (RBAC) · assign the Reader role to that user' },
            { id: 'l2', text: 'A ReadOnly resource lock', why: 'A ReadOnly lock blocks changes for EVERYONE on the scope; it cannot grant view-only rights to one specific auditor while leaving others unaffected.' },
            { id: 'l3', text: 'Azure Policy', why: 'Policy enforces rules on resource configuration (e.g. allowed SKUs); it does not grant a specific user scoped view access.' },
            { id: 'l4', text: 'Azure Blueprints', why: 'Blueprints package environment setup (policies, roles, templates) together; for a single per-user view grant, RBAC alone is the direct tool.' } // note: Azure Blueprints is on Microsoft's retirement path (preview, being superseded by Template Specs + deployment stacks) · still on the AZ-900 objectives today, swap if the outline drops it
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-gov-3', cert: 'az900', objective: '3.1', topic: 'Governance tools',
    title: 'Pick the tool to prevent accidental deletion', estMinutes: 3,
    scenario: 'An admin wants to ensure a critical resource <mark>cannot be deleted even by users who have permission to delete it</mark>. Which feature?',
    pair: 'Policy vs RBAC vs Locks',
    family: 'Governance tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the feature.',
        explanation: 'The tell is "cannot be deleted even by users who HAVE delete permission". A resource lock (CanNotDelete / ReadOnly) overrides RBAC permissions to block deletion or modification.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Resource lock (CanNotDelete)' },
            { id: 'l2', text: 'Role-based access control (RBAC)', why: 'RBAC could remove delete rights, but the requirement is to block deletion EVEN for users who keep that permission · that is the lock’s job.' },
            { id: 'l3', text: 'Azure Policy', why: 'Policy governs resource configuration and compliance; it is not the mechanism that overrides delete permission on an existing resource.' },
            { id: 'l4', text: 'Tags', why: 'Tags are metadata labels for organization and billing; they have no power to prevent deletion.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-gov-4', cert: 'az900', objective: '3.1', topic: 'Governance tools',
    title: 'Pick the tool to deploy a repeatable compliant environment', estMinutes: 3,
    scenario: 'A platform team wants to <mark>stamp out new subscriptions that already include the right policies, role assignments, and resource templates</mark> as one repeatable package. Which tool?',
    pair: 'Blueprints vs Policy vs ARM template',
    family: 'Governance tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the tool.',
        explanation: 'The tell is "one repeatable package bundling policies, role assignments, AND templates for new subscriptions". Azure Blueprints orchestrates policies, RBAC, and ARM templates together as a single deployable, governed package.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Blueprints' }, // note: Azure Blueprints is on Microsoft's retirement path (preview, being superseded by Template Specs + deployment stacks) · still keyed on the AZ-900 objectives today, swap if the outline drops it
            { id: 'l2', text: 'Azure Policy alone', why: 'Policy enforces individual rules but does not, by itself, bundle role assignments and resource templates into one repeatable environment package.' },
            { id: 'l3', text: 'An ARM/Bicep template alone', why: 'A template deploys resources but does not natively package policy assignments and RBAC as a governed, trackable blueprint.' },
            { id: 'l4', text: 'Resource locks', why: 'Locks only prevent change/delete on existing resources; they do not provision a compliant environment.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-gov-5', cert: 'az900', objective: '3.1', topic: 'Governance tools',
    title: 'Match the governance tool to its purpose', estMinutes: 4,
    scenario: 'Match each Azure governance tool to what it controls.',
    pair: 'Policy vs RBAC vs Locks',
    family: 'Governance tools',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each tool with what it governs.',
        explanation: 'Azure Policy enforces rules on resource properties (the WHAT of resources). RBAC controls who can do what (the WHO). Resource locks prevent delete/modify (protect from change). Tags label resources for organization and cost. Blueprints package the whole governed environment.',
        payload: {
          left: [
            { id: 'policy', label: 'Azure Policy' },
            { id: 'rbac', label: 'RBAC' },
            { id: 'lock', label: 'Resource lock' },
            { id: 'tag', label: 'Tags' },
            { id: 'blueprint', label: 'Azure Blueprints' } // note: Azure Blueprints is on Microsoft's retirement path (preview, being superseded by Template Specs + deployment stacks) · still keyed on the AZ-900 objectives today, swap if the outline drops it
          ],
          right: [
            { id: 'drules', label: 'Enforces rules on resource configuration' },
            { id: 'dwho', label: 'Controls which users can perform which actions' },
            { id: 'dprotect', label: 'Prevents delete or modify of a resource' },
            { id: 'dlabel', label: 'Labels resources for organization and cost' },
            { id: 'dpackage', label: 'Packages policies, roles, and templates together' }
          ]
        },
        answer: { pairs: { policy: 'drules', rbac: 'dwho', lock: 'dprotect', tag: 'dlabel', blueprint: 'dpackage' } } }
    ]
  },

  {
    id: 'az900-dl-monitor-1', cert: 'az900', objective: '3.3', topic: 'Monitoring tools',
    title: 'Pick the tool for personalized best-practice advice', estMinutes: 3,
    scenario: 'A team wants <mark>personalized recommendations to improve cost, security, reliability, operational excellence, and performance</mark> of their deployed resources. Which service?',
    pair: 'Advisor vs Service Health vs Monitor',
    family: 'Monitoring & advisory',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the service.',
        explanation: 'The tell is "personalized recommendations across cost, security, reliability, operational excellence, and performance" · those are exactly Azure Advisor\'s five pillars. Advisor analyzes your resources and gives tailored best-practice recommendations.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Advisor' },
            { id: 'l2', text: 'Azure Service Health', why: 'Service Health reports on Azure platform incidents and planned maintenance affecting you; it does not recommend optimizations for your resources.' },
            { id: 'l3', text: 'Azure Monitor', why: 'Azure Monitor collects metrics and logs and fires alerts; it is the telemetry pipeline, not the curated best-practice recommender.' },
            { id: 'l4', text: 'Microsoft Defender for Cloud', why: 'Defender for Cloud focuses on security posture and threat protection, not the full cost/reliability/performance recommendation set.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-monitor-2', cert: 'az900', objective: '3.3', topic: 'Monitoring tools',
    title: 'Pick the tool to learn about an Azure outage', estMinutes: 3,
    scenario: 'Users report an app is down. An admin needs to know whether there is a <mark>known Azure platform outage or planned maintenance in their region</mark>. Which service?',
    pair: 'Advisor vs Service Health vs Monitor',
    family: 'Monitoring & advisory',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the service.',
        explanation: 'The tell is "known Azure platform outage or planned maintenance in my region". Azure Service Health reports the health of Azure services impacting your specific resources and regions.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Service Health' },
            { id: 'l2', text: 'Azure Advisor', why: 'Advisor gives optimization recommendations; it does not report live platform outages or maintenance events.' },
            { id: 'l3', text: 'Azure Monitor', why: 'Azure Monitor shows YOUR resource telemetry; it is not the authoritative source for Azure-wide platform incident status.' },
            { id: 'l4', text: 'Microsoft Cost Management', why: 'Cost Management tracks spend; it has nothing to do with platform outage status.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-monitor-3', cert: 'az900', objective: '3.3', topic: 'Monitoring tools',
    title: 'Pick the tool to collect metrics and fire alerts', estMinutes: 3,
    scenario: 'A team wants to <mark>collect performance metrics and logs from their VMs and apps and trigger alerts</mark> on thresholds. Which service?',
    pair: 'Advisor vs Service Health vs Monitor',
    family: 'Monitoring & advisory',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the service.',
        explanation: 'The tell is "collect metrics and logs from my resources and trigger alerts on thresholds". Azure Monitor is the telemetry platform that ingests metrics/logs and raises alerts.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Monitor' },
            { id: 'l2', text: 'Azure Service Health', why: 'Service Health reports Azure platform incidents, not your own VM/app metrics and threshold alerts.' },
            { id: 'l3', text: 'Azure Advisor', why: 'Advisor issues periodic best-practice recommendations; it is not a real-time metrics and alerting pipeline.' },
            { id: 'l4', text: 'Azure Policy', why: 'Policy enforces governance rules on resources; it does not collect telemetry or fire performance alerts.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-sla-1', cert: 'az900', objective: '3.3', topic: 'Composite SLA',
    title: 'Compute the composite SLA of two services in series', estMinutes: 4,
    scenario: 'An application depends on two Azure services in series: a web tier with a <mark>99.95% SLA</mark> and a database with a <mark>99.99% SLA</mark>. Both must be up for the app to work.',
    family: 'Service-level agreements',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'Enter the composite SLA percentage for the two services in series (round to two decimals).',
        explanation: 'The tell is "in series, both must be up" · multiply the two SLAs as decimals, then convert back to a percent. 0.9995 x 0.9999 = 0.99940005, i.e. about 99.94%. Adding a dependency in series always LOWERS the composite availability below the weakest single SLA.',
        payload: { fields: [{ id: 'composite', label: 'Composite SLA (%)', inputmode: 'text' }] },
        answer: { composite: ['99.94', '99.94%', '99.9400', '0.9994'] } }
    ]
  },

  {
    id: 'az900-dl-sla-2', cert: 'az900', objective: '3.3', topic: 'Composite SLA',
    title: 'Compute the composite SLA of three services in series', estMinutes: 4,
    scenario: 'A workload chains three services in series, each with a <mark>99.9% SLA</mark>. All three must be available for the workload to function.',
    family: 'Service-level agreements',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'Enter the composite SLA percentage for three 99.9% services in series (round to two decimals).',
        explanation: 'The tell is "three in series, all must be up" · multiply the three SLAs as decimals, then convert back to a percent: 0.999 x 0.999 x 0.999 = 0.997002999, about 99.70%. Each added series dependency drives the composite further below any single 99.9% SLA.',
        payload: { fields: [{ id: 'composite', label: 'Composite SLA (%)', inputmode: 'text' }] },
        answer: { composite: ['99.70', '99.70%', '99.7', '99.7%', '0.997'] } }
    ]
  },

  {
    id: 'az900-dl-shared-1', cert: 'az900', objective: '3.1', topic: 'Shared responsibility',
    title: 'Categorize shared responsibility across deployment types', estMinutes: 5,
    scenario: 'Across On-prem, IaaS, PaaS, and SaaS, who is always responsible for the layer? Sort each layer by the LOWEST service model at which Microsoft (the provider) takes it over.',
    family: 'Shared responsibility',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each layer under Always the customer, Provider from PaaS up, or Provider from IaaS up.',
        explanation: 'Physical hosts are the provider’s from IaaS up. The OS/runtime shifts to the provider at PaaS. But data, accounts/identities, and access management are ALWAYS the customer’s responsibility (even in SaaS) · that is the classic exam trap.',
        payload: {
          items: [
            { id: 'physical', label: 'Physical datacenter security' },
            { id: 'host', label: 'Physical hosts/network' },
            { id: 'os', label: 'Operating system' },
            { id: 'data', label: 'Data' },
            { id: 'accounts', label: 'Accounts and identities' },
            { id: 'access', label: 'Information and access management' }
          ],
          buckets: [
            { id: 'cust', label: 'Always the customer' },
            { id: 'paas', label: 'Provider from PaaS up' },
            { id: 'iaas', label: 'Provider from IaaS up' }
          ]
        },
        answer: { map: { physical: 'iaas', host: 'iaas', os: 'paas', data: 'cust', accounts: 'cust', access: 'cust' } } }
    ]
  },

  {
    id: 'az900-dl-shared-2', cert: 'az900', objective: '3.1', topic: 'Shared responsibility',
    title: 'Pick what moving to cloud REMOVES from the customer', estMinutes: 3,
    scenario: 'Reverse-framed: when an organization moves a workload to an Azure IaaS VM, which responsibility does it <mark>NO LONGER</mark> hold compared to on-premises?',
    family: 'Shared responsibility',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select what the customer no longer manages on IaaS.',
        explanation: 'The tell is the reverse frame "NO LONGER hold compared to on-prem" on IaaS. Physical datacenter and hardware security move to Microsoft. The guest OS, data, and accounts remain the customer’s on IaaS.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Physical datacenter and hardware security' },
            { id: 'l2', text: 'Guest operating system patching', why: 'On IaaS the customer STILL patches the guest OS; that responsibility does not move to Microsoft until PaaS.' },
            { id: 'l3', text: 'Data classification and protection', why: 'Data is always the customer’s responsibility at every service model, including IaaS.' },
            { id: 'l4', text: 'User account and identity management', why: 'Managing accounts and identities stays with the customer across all models, so it is never removed.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-gov-7', cert: 'az900', objective: '3.1', topic: 'Governance scope',
    title: 'Pick where to assign policy for all subscriptions', estMinutes: 3,
    scenario: 'A governance lead must apply one policy that <mark>automatically inherits down to every current and future subscription</mark> in the organization. Where do they assign it?',
    pair: 'Management group vs Subscription',
    family: 'Governance tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the assignment scope.',
        explanation: 'The tell is "inherits down to every current AND future subscription". Assigning the policy at the management group level cascades to all subscriptions beneath it, including ones added later.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'At the management group' },
            { id: 'l2', text: 'At each subscription individually', why: 'Per-subscription assignment does not auto-apply to FUTURE subscriptions and means repeating the work everywhere · the inheritance requirement rules it out.' },
            { id: 'l3', text: 'At each resource group', why: 'Resource-group scope is far too narrow; it would not cover whole subscriptions, let alone future ones.' },
            { id: 'l4', text: 'On each individual resource', why: 'Per-resource assignment is the narrowest scope and cannot inherit org-wide; it is the opposite of what is needed.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-14', cert: 'az900', objective: '3.4', topic: 'Tools & SDKs',
    title: 'Match the Azure management tool to its use', estMinutes: 4,
    scenario: 'Match each Azure management interface to when you would use it.',
    family: 'Management tools',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each tool with its best use.',
        explanation: 'The Azure portal is the graphical web UI. Azure CLI is a cross-platform command-line tool. Azure PowerShell uses cmdlets for scripting. Cloud Shell is a browser-based shell with tools pre-installed. ARM/Bicep templates declare infrastructure as code.',
        payload: {
          left: [
            { id: 'portal', label: 'Azure portal' },
            { id: 'cli', label: 'Azure CLI' },
            { id: 'ps', label: 'Azure PowerShell' },
            { id: 'shell', label: 'Cloud Shell' },
            { id: 'arm', label: 'ARM/Bicep templates' }
          ],
          right: [
            { id: 'dgui', label: 'Graphical web interface for point-and-click' },
            { id: 'dcli', label: 'Cross-platform command-line commands' },
            { id: 'dcmdlet', label: 'Cmdlet-based scripting interface' },
            { id: 'dbrowser', label: 'Browser-based shell with tools pre-installed' },
            { id: 'diac', label: 'Declarative infrastructure as code' }
          ]
        },
        answer: { pairs: { portal: 'dgui', cli: 'dcli', ps: 'dcmdlet', shell: 'dbrowser', arm: 'diac' } } }
    ]
  },

  {
    id: 'az900-dl-concepts-15', cert: 'az900', objective: '3.4', topic: 'Tools & SDKs',
    title: 'Pick the tool for declarative infrastructure as code', estMinutes: 3,
    scenario: 'A team wants to define their Azure infrastructure in <mark>declarative files they can version-control and redeploy identically</mark>. Which Azure tool?',
    pair: 'ARM template vs CLI script',
    family: 'Management tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the tool.',
        explanation: 'The tell is "declarative files, version-controlled, redeploy identically". ARM templates (and Bicep) declare the desired end state as code for repeatable deployments. CLI/PowerShell scripts are imperative step-by-step instead.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'ARM/Bicep templates' },
            { id: 'l2', text: 'An Azure CLI shell script', why: 'A CLI script is imperative (a sequence of commands); it is not the declarative desired-state model the requirement calls for.' },
            { id: 'l3', text: 'The Azure portal', why: 'The portal is manual point-and-click; it is not a version-controllable declarative artifact you can redeploy identically.' },
            { id: 'l4', text: 'Azure Advisor', why: 'Advisor only issues recommendations; it does not define or deploy infrastructure.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-cost-6', cert: 'az900', objective: '3.2', topic: 'Cost savings',
    title: 'Pick the benefit to reuse existing Windows licenses', estMinutes: 3,
    scenario: 'A company has existing Windows Server and SQL Server licenses with Software Assurance and wants to <mark>apply them to Azure to lower compute cost</mark>. Which benefit?',
    pair: 'Hybrid Benefit vs Reservations',
    family: 'Cost & pricing tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the benefit.',
        explanation: 'The tell is "apply EXISTING Windows/SQL licenses to Azure to lower cost". Azure Hybrid Benefit lets you reuse on-prem licenses with Software Assurance to reduce Azure compute pricing.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Hybrid Benefit' },
            { id: 'l2', text: 'Azure Reservations', why: 'Reservations discount capacity via a 1- or 3-year term commitment; they do not reuse your existing licenses.' },
            { id: 'l3', text: 'Azure Spot VMs', why: 'Spot gives cheap interruptible capacity; it has nothing to do with applying licenses you already own.' },
            { id: 'l4', text: 'Pay-as-you-go', why: 'Pay-as-you-go is the baseline rate with no license reuse or discount mechanism.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-17', cert: 'az900', objective: '1.2', topic: 'Azure global infrastructure',
    title: 'Categorize the global-infrastructure term by scope', estMinutes: 4,
    scenario: 'Sort each Azure global-infrastructure term by whether it is a physical fault boundary or a logical management/billing boundary.',
    family: 'Global infrastructure',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each term under Physical fault boundary or Logical management boundary.',
        explanation: 'Regions, Availability Zones, and datacenters are physical fault/locality boundaries. Subscriptions, resource groups, and management groups are logical management and billing constructs with no physical fault isolation.',
        payload: {
          items: [
            { id: 'region', label: 'Region' },
            { id: 'zone', label: 'Availability Zone' },
            { id: 'dc', label: 'Datacenter' },
            { id: 'sub', label: 'Subscription' },
            { id: 'rg', label: 'Resource group' },
            { id: 'mg', label: 'Management group' }
          ],
          buckets: [
            { id: 'physical', label: 'Physical fault boundary' },
            { id: 'logical', label: 'Logical management boundary' }
          ]
        },
        answer: { map: { region: 'physical', zone: 'physical', dc: 'physical', sub: 'logical', rg: 'logical', mg: 'logical' } } }
    ]
  },

  {
    id: 'az900-dl-concepts-18', cert: 'az900', objective: '2.2', topic: 'Hybrid & multicloud management',
    title: 'Pick the tool to manage on-prem servers from Azure', estMinutes: 3,
    scenario: 'An ops team wants to <mark>project their on-premises and other-cloud servers into Azure so they can apply Azure Policy and governance to them</mark>, without moving the workloads. Which service?',
    pair: 'Arc vs Migrate',
    family: 'Hybrid & multicloud',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the service.',
        explanation: 'The tell is "manage and govern servers that stay on-prem or in another cloud, without moving them". Azure Arc extends Azure management (Policy, RBAC, monitoring) to resources running outside Azure.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Azure Arc' },
            { id: 'l2', text: 'Azure Migrate', why: 'Azure Migrate discovers and MOVES workloads INTO Azure; the requirement is to govern servers where they already are, not migrate them.' },
            { id: 'l3', text: 'Azure Lighthouse', why: 'Lighthouse lets a service provider manage MULTIPLE customers’ Azure tenants at scale; it does not project non-Azure servers into Azure management.' },
            { id: 'l4', text: 'Azure Stack HCI', why: 'Azure Stack HCI is hyperconverged on-prem infrastructure you buy and run; it is not the control plane for governing existing external servers.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'az900-dl-concepts-19', cert: 'az900', objective: '2.2', topic: 'Defense in depth',
    title: 'Pick the layered-security concept', estMinutes: 3,
    scenario: 'A security architect wants <mark>multiple independent layers of protection so that if one control fails, another still stops the attacker</mark>, from the perimeter down to the data. Which concept describes this?',
    pair: 'Defense in depth vs Zero Trust',
    family: 'Security concepts',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Select the concept.',
        explanation: 'The tell is "multiple independent layers so a single failure is not fatal, perimeter through data". That layered model is defense in depth. Zero Trust is the related but distinct principle of never trusting implicitly and always verifying each request.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Defense in depth' },
            { id: 'l2', text: 'Zero Trust', why: 'Zero Trust says "verify explicitly, assume breach, least privilege" for every request; it is about not trusting by default, not specifically about stacking redundant protective layers.' },
            { id: 'l3', text: 'Shared responsibility', why: 'Shared responsibility splits security duties between customer and provider; it does not describe layering independent controls against one attack.' },
            { id: 'l4', text: 'Single sign-on', why: 'SSO is an authentication convenience that reduces sign-ins; it is not a layered-defense security model.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  }
];

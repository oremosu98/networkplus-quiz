/* DRAFT clfc02 Decision Lab seed scenarios · answers NOT yet founder-verified. Review before ship. */
window.DECISION_LAB_SEED_CLFC02 = [
  // ========================================================================
  // ===== Cloud concepts & CAF (~24%, ~12) =================================
  // ========================================================================
  {
    id: 'clfc02-dl-concepts-1', cert: 'clfc02', objective: '1.1', topic: 'Cloud value proposition',
    title: 'Pick the benefit that fits the need', estMinutes: 3,
    scenario: 'A retailer cannot predict its Black Friday traffic and refuses to buy servers sized for a peak that may never arrive. During quiet weeks they want to <mark>pay only for the capacity actually in use</mark>, with that capacity tracking the traffic up and back down on its own.',
    pair: 'Elasticity vs High availability', family: 'AWS cloud concepts',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the cloud benefit that best matches this requirement.',
        explanation: 'The buried constraint is capacity that "tracks the traffic up and back down on its own" so you "pay only for the capacity actually in use". That is elasticity: capacity scales out and back in to match load. High availability is about staying up through failures, not matching demand.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Elasticity' },
            { id: 'l2', text: 'High availability', why: 'High availability keeps a workload running through component or AZ failures; it does not, by itself, grow and shrink capacity to follow demand.' },
            { id: 'l3', text: 'Fault tolerance', why: 'Fault tolerance lets a system keep working with zero downtime despite a failure; it speaks to resilience, not to scaling capacity up and down with traffic.' },
            { id: 'l4', text: 'Economies of scale', why: 'Economies of scale explains why AWS unit prices fall as aggregate usage grows; it does not describe a workload auto-scaling to its own demand.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-concepts-2', cert: 'clfc02', objective: '1.1', topic: 'CapEx vs OpEx',
    title: 'Name the financial shift', estMinutes: 3,
    scenario: 'A finance director notes that since moving to AWS the company no longer buys datacenter hardware up front; instead it is billed monthly for what it consumed. They ask what this change in spending model is called.',
    pair: 'CapEx vs OpEx', family: 'AWS cloud economics',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the term for this spending change.',
        explanation: 'The tell is "no longer buys hardware up front" replaced by "billed monthly for what it consumed". Trading large upfront capital purchases for ongoing usage-based cost is the move from CapEx to OpEx.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Shifting capital expense (CapEx) to operational expense (OpEx)' },
            { id: 'l2', text: 'Shifting operational expense (OpEx) to capital expense (CapEx)', why: 'This is backwards: buying datacenter hardware up front is the CapEx model, and AWS pay-as-you-go is the OpEx model.' },
            { id: 'l3', text: 'Total Cost of Ownership (TCO)', why: 'TCO is a method for comparing all costs of two options; it is an analysis technique, not the name for the CapEx-to-OpEx shift itself.' },
            { id: 'l4', text: 'Return on investment (ROI)', why: 'ROI measures gain relative to cost; it does not describe converting upfront purchases into ongoing usage charges.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-concepts-3', cert: 'clfc02', objective: '1.2', topic: 'Global infrastructure',
    title: 'Pick the deployment for low latency', estMinutes: 3,
    scenario: 'A gaming company in Sydney complains that players in Sydney see noticeable lag because the app runs only in a US Region. They want to reduce round-trip latency for Australian players with <mark>the least change to their architecture</mark>.',
    pair: 'Region vs Edge location', family: 'AWS global infrastructure',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best way to cut latency for Sydney players.',
        explanation: 'The tell is "reduce round-trip latency" for users in a specific geography. Deploying in or near an AWS Region close to the users (an Asia Pacific Region) puts the workload physically nearer to them. An Availability Zone is a sub-part of a Region, not a separate geography you "pick" for latency.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Deploy the workload in an AWS Region geographically close to the players' },
            { id: 'l2', text: 'Add another Availability Zone in the existing US Region', why: 'AZs add resilience within one Region; they are all in the same geography, so this does not move the workload closer to Sydney users.' },
            { id: 'l3', text: 'Move to a larger EC2 instance type', why: 'A bigger instance adds compute capacity, but latency here is driven by physical distance, which instance size does not change.' },
            { id: 'l4', text: 'Enable Multi-AZ on the database', why: 'Multi-AZ is for database failover/availability; it does not reduce the network distance between Sydney players and a US Region.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-concepts-4', cert: 'clfc02', objective: '1.2', topic: 'Edge / content delivery',
    title: 'Pick the service for global static content', estMinutes: 3,
    scenario: 'A news site serves the same images and videos to readers worldwide and wants to <mark>cache that static content close to users</mark> to speed up page loads, without re-architecting the origin.',
    pair: 'CloudFront vs Region', family: 'AWS networking & content delivery',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best service for this.',
        explanation: 'The tell is "cache static content close to users" globally. Amazon CloudFront is the content delivery network that caches content at edge locations near viewers. Deploying more Regions would not provide an automatic global edge cache.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon CloudFront' },
            { id: 'l2', text: 'Amazon S3 alone', why: 'S3 durably stores the objects, but on its own it serves them from one Region; it is the origin, not the global edge cache.' },
            { id: 'l3', text: 'Elastic Load Balancing', why: 'ELB distributes traffic across targets within a Region; it does not cache content at edge locations near worldwide users.' },
            { id: 'l4', text: 'AWS Global Accelerator', why: 'Global Accelerator improves routing to your endpoints over the AWS backbone, but it does not cache static content; CloudFront is the caching CDN.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-concepts-5', cert: 'clfc02', objective: '1.3', topic: 'AWS Cloud Adoption Framework (CAF)',
    title: 'Place each CAF perspective', estMinutes: 4,
    scenario: 'The AWS Cloud Adoption Framework groups capabilities into six perspectives. Sort each concern into the perspective that owns it.',
    family: 'AWS Cloud Adoption Framework',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each concern under the CAF perspective that owns it.',
        explanation: 'CAF has six perspectives. Business and People are non-technical (value/outcomes and culture/skills). Governance manages portfolio, risk, and cloud financial management. Platform builds the cloud environment. Security protects data and workloads. Operations runs and supports the workloads day to day.',
        payload: {
          items: [
            { id: 'roi', label: 'Measuring business outcomes and ROI' },
            { id: 'skills', label: 'Reskilling staff and change management' },
            { id: 'finops', label: 'Cloud financial management and risk' },
            { id: 'landing', label: 'Building the landing zone and platform' },
            { id: 'protect', label: 'Protecting data and managing identity' },
            { id: 'monitor', label: 'Monitoring, event management, and support' }
          ],
          buckets: [
            { id: 'business', label: 'Business' },
            { id: 'people', label: 'People' },
            { id: 'governance', label: 'Governance' },
            { id: 'platform', label: 'Platform' },
            { id: 'security', label: 'Security' },
            { id: 'operations', label: 'Operations' }
          ]
        },
        answer: { map: { roi: 'business', skills: 'people', finops: 'governance', landing: 'platform', protect: 'security', monitor: 'operations' } } }
    ]
  },

  {
    id: 'clfc02-dl-concepts-6', cert: 'clfc02', objective: '1.3', topic: 'Migration strategies (the 6 Rs)',
    title: 'Pick the migration strategy', estMinutes: 3,
    scenario: 'A team must move a legacy app to AWS quickly to exit a closing datacenter. They will <mark>move it as-is, without changing the application code</mark>, and optimize later.',
    pair: 'Rehost vs Replatform vs Refactor', family: 'AWS migration strategies',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the migration strategy that matches.',
        explanation: 'The tell is "move it as-is, without changing the application code". That is rehosting (lift-and-shift). Replatform makes minor optimizations; refactor rewrites the app, which the constraint explicitly rules out.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Rehost (lift-and-shift)' },
            { id: 'l2', text: 'Replatform (lift-tinker-and-shift)', why: 'Replatform makes a few cloud optimizations during the move (for example swapping a self-managed DB for RDS); the requirement is to move with no code changes at all.' },
            { id: 'l3', text: 'Refactor / re-architect', why: 'Refactoring rewrites the application to be cloud-native; that is the opposite of moving it as-is and is the slowest path, which the "quickly" constraint rules out.' },
            { id: 'l4', text: 'Retire', why: 'Retire means decommissioning an app you no longer need; here the app is being kept and moved, not shut down.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-concepts-7', cert: 'clfc02', objective: '1.1', topic: 'Cloud deployment models',
    title: 'Name the deployment model', estMinutes: 3,
    scenario: 'A bank keeps a mainframe in its own datacenter for regulated workloads but also runs new web apps on AWS, with a secure network link between the two so they work together.',
    pair: 'Hybrid vs Cloud vs On-premises', family: 'AWS cloud concepts',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the deployment model in use.',
        explanation: 'The tell is "keeps a mainframe in its own datacenter" AND "runs new web apps on AWS" connected together. Running on-premises and in the cloud as one connected environment is a hybrid deployment.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Hybrid' },
            { id: 'l2', text: 'Cloud (all-in)', why: 'An all-in cloud model runs everything on AWS; here a regulated mainframe deliberately stays on-premises, so it is not fully cloud.' },
            { id: 'l3', text: 'On-premises (private only)', why: 'On-premises-only means no cloud at all; this company also runs production web apps on AWS, so it is more than on-premises.' },
            { id: 'l4', text: 'Multi-cloud', why: 'Multi-cloud means using two or more cloud providers; nothing here describes a second cloud provider, only AWS plus an on-premises datacenter.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-concepts-8', cert: 'clfc02', objective: '1.2', topic: 'Well-Architected Framework',
    title: 'Map the goal to a pillar', estMinutes: 3,
    scenario: 'During a design review, a team wants guidance on running and monitoring systems to deliver business value and to <mark>continually improve supporting processes and procedures</mark>. They ask which Well-Architected pillar covers this.',
    pair: 'Operational excellence vs Reliability', family: 'AWS Well-Architected Framework',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the Well-Architected pillar that fits.',
        explanation: 'The tell is "run and monitor systems" and "continually improve supporting processes and procedures". That is the Operational Excellence pillar. Reliability is about recovering from failure and meeting demand, not improving processes.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Operational Excellence' },
            { id: 'l2', text: 'Reliability', why: 'Reliability covers recovering from failures and dynamically acquiring resources to meet demand; the ask here is about improving operational processes, not failure recovery.' },
            { id: 'l3', text: 'Performance Efficiency', why: 'Performance Efficiency is about using computing resources efficiently as demand changes; it does not center on improving processes and procedures.' },
            { id: 'l4', text: 'Cost Optimization', why: 'Cost Optimization focuses on avoiding unnecessary spend; the requirement is about running and improving operations, not reducing cost.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-concepts-9', cert: 'clfc02', objective: '1.1', topic: 'Cloud value proposition',
    title: 'Pick the benefit of going global fast', estMinutes: 3,
    scenario: 'A startup wants to launch in Europe and Asia next quarter but has no staff or hardware on those continents. They ask which cloud advantage lets them <mark>serve users on other continents almost immediately, without first building any local datacenters</mark>.',
    pair: 'Go global in minutes vs Trade CapEx for OpEx', family: 'AWS cloud concepts',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the cloud benefit that fits.',
        explanation: 'The buried constraint is "serve users on other continents almost immediately, without building local datacenters". That is the "go global in minutes" advantage enabled by AWS Regions worldwide. Trading CapEx for OpEx is about cost model, not speed of geographic expansion.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Go global in minutes' },
            { id: 'l2', text: 'Trade fixed expense for variable expense', why: 'That benefit is about paying for what you use instead of buying hardware; it does not describe deploying into new regions of the world quickly.' },
            { id: 'l3', text: 'Stop guessing capacity', why: 'This benefit is about scaling to actual demand instead of over- or under-provisioning; it is not about geographic reach.' },
            { id: 'l4', text: 'Benefit from massive economies of scale', why: 'Economies of scale lower unit prices through aggregate usage; it does not speak to launching in new continents in minutes.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-concepts-10', cert: 'clfc02', objective: '1.2', topic: 'Availability Zones',
    title: 'Pick the design for AZ resilience', estMinutes: 3,
    scenario: 'A workload runs on EC2 in a single Availability Zone. Leadership wants it to <mark>survive the loss of an entire AZ</mark> within the same Region, with the least architectural change.',
    pair: 'Multi-AZ vs Multi-Region', family: 'AWS global infrastructure',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best approach.',
        explanation: 'The tell is "survive the loss of an entire AZ" within the same Region. Spreading instances across multiple Availability Zones in the Region provides that. Multi-Region is for surviving a whole-Region failure and is a bigger change than asked.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Run instances across multiple Availability Zones in the Region' },
            { id: 'l2', text: 'Deploy a copy in a second AWS Region', why: 'Multi-Region protects against an entire-Region outage; that is more than the AZ-level resilience asked for and is a larger change.' },
            { id: 'l3', text: 'Use a larger instance type in the same AZ', why: 'A bigger instance adds capacity but is still in one AZ, so an AZ failure still takes the workload down.' },
            { id: 'l4', text: 'Add an edge location with CloudFront', why: 'CloudFront caches content at the edge; it does not make a single-AZ compute workload survive an AZ outage.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-concepts-11', cert: 'clfc02', objective: '1.1', topic: 'Cloud value proposition',
    title: 'Match each cloud benefit to its meaning', estMinutes: 4,
    scenario: 'Match each AWS Cloud value-proposition benefit to the statement that describes it.',
    family: 'AWS cloud concepts',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each benefit with its description.',
        explanation: 'Trade fixed for variable expense: pay only for what you consume instead of buying capacity up front. Stop guessing capacity: scale to actual demand. Increase speed and agility: spin up resources in minutes. Stop spending on running datacenters: let AWS handle the heavy lifting of infrastructure. Go global in minutes: deploy to Regions worldwide quickly.',
        payload: {
          left: [
            { id: 'variable', label: 'Trade fixed expense for variable expense' },
            { id: 'capacity', label: 'Stop guessing capacity' },
            { id: 'agility', label: 'Increase speed and agility' },
            { id: 'datacenter', label: 'Stop spending to run datacenters' },
            { id: 'global', label: 'Go global in minutes' }
          ],
          right: [
            { id: 'dpayuse', label: 'Pay only for what you consume' },
            { id: 'dscale', label: 'Scale to actual demand, not a guess' },
            { id: 'dfast', label: 'Provision new resources in minutes' },
            { id: 'dheavy', label: 'Let AWS run the underlying infrastructure' },
            { id: 'dregions', label: 'Deploy to Regions worldwide quickly' }
          ]
        },
        answer: { pairs: { variable: 'dpayuse', capacity: 'dscale', agility: 'dfast', datacenter: 'dheavy', global: 'dregions' } } }
    ]
  },

  {
    id: 'clfc02-dl-concepts-12', cert: 'clfc02', objective: '1.2', topic: 'Connectivity options',
    title: 'Pick the link for consistent throughput', estMinutes: 3,
    scenario: 'A company moves large nightly data transfers between its datacenter and AWS and is frustrated by inconsistent speeds over the public internet. They want a <mark>dedicated, private physical connection</mark> with predictable bandwidth.',
    pair: 'Direct Connect vs Site-to-Site VPN', family: 'AWS networking & content delivery',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best connectivity option.',
        explanation: 'The tell is "dedicated, private physical connection" with "predictable bandwidth". AWS Direct Connect provides a dedicated network link from your premises into AWS. A Site-to-Site VPN still rides the public internet, so throughput remains variable.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS Direct Connect' },
            { id: 'l2', text: 'AWS Site-to-Site VPN', why: 'A VPN is encrypted but travels over the public internet, so it cannot guarantee the consistent, predictable bandwidth a dedicated link provides.' },
            { id: 'l3', text: 'Amazon CloudFront', why: 'CloudFront is a content delivery network for caching content to viewers; it does not provide a private datacenter-to-AWS link for bulk transfers.' },
            { id: 'l4', text: 'AWS Transit Gateway', why: 'Transit Gateway interconnects VPCs and on-premises networks at scale, but it is not itself the dedicated physical circuit; Direct Connect provides that.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  // ========================================================================
  // ===== Security & compliance (~30%, ~15) ================================
  // ========================================================================
  {
    id: 'clfc02-dl-security-1', cert: 'clfc02', objective: '3.1', topic: 'Shared responsibility model',
    title: 'Split responsibility for an EC2 workload', estMinutes: 4,
    scenario: 'A workload runs on Amazon EC2 instances. Sort each task by who is responsible under the shared responsibility model when the customer uses EC2.',
    pair: 'AWS vs Customer responsibility', family: 'AWS shared responsibility',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each task under AWS or Customer for an EC2 workload.',
        explanation: 'AWS is responsible for security OF the cloud: the physical hardware, the host hypervisor, and the global infrastructure. With EC2 (IaaS), the customer is responsible for security IN the cloud: patching the guest OS, configuring security groups, managing IAM users, and encrypting their data.',
        payload: {
          items: [
            { id: 'datacenter', label: 'Physical datacenter security' },
            { id: 'hypervisor', label: 'Patching the host hypervisor' },
            { id: 'guestos', label: 'Patching the guest operating system' },
            { id: 'sg', label: 'Configuring security groups' },
            { id: 'iam', label: 'Managing IAM users and permissions' },
            { id: 'dataenc', label: 'Encrypting customer data' }
          ],
          buckets: [
            { id: 'aws', label: 'AWS' },
            { id: 'customer', label: 'Customer' }
          ]
        },
        answer: { map: { datacenter: 'aws', hypervisor: 'aws', guestos: 'customer', sg: 'customer', iam: 'customer', dataenc: 'customer' } } }
    ]
  },

  {
    id: 'clfc02-dl-security-2', cert: 'clfc02', objective: '3.1', topic: 'Shared responsibility model',
    title: 'Who patches the OS on RDS?', estMinutes: 3,
    scenario: 'A team runs its database on Amazon RDS (a managed service). A new operating-system security patch is released for the underlying host. They ask <mark>who is responsible for applying the OS patch</mark> on the RDS instance.',
    pair: 'EC2 vs RDS responsibility', family: 'AWS shared responsibility',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick who patches the OS for RDS.',
        explanation: 'The tell is "Amazon RDS (a managed service)". Moving from EC2 to a managed service shifts the boundary: AWS patches the underlying OS and host for RDS. (On EC2 the customer would patch the guest OS.) The customer still controls when engine patches apply via the maintenance window and chooses major-version upgrades, and still owns their data, accounts, and access settings.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS' },
            { id: 'l2', text: 'The customer', why: 'The customer patches the guest OS on EC2, but RDS is managed: AWS patches the underlying OS and host, so this is wrong for RDS. (The customer still schedules engine patches via the maintenance window, but not the host OS patch.)' },
            { id: 'l3', text: 'Shared equally between AWS and the customer', why: 'OS patching for a managed service is not split; it falls to AWS. The customer still owns data and access, but not the host OS patch.' },
            { id: 'l4', text: 'A third-party managed service provider', why: 'No external provider is involved; the responsibility split here is strictly between AWS and the customer, and for RDS OS patching it is AWS.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-3', cert: 'clfc02', objective: '3.2', topic: 'IAM principle of least privilege',
    title: 'Grant access the right way', estMinutes: 3,
    scenario: 'A new analyst needs read-only access to exactly one S3 bucket and nothing else. A junior admin proposes sharing the root user credentials. You want the analyst to <mark>have no more access than that single read task strictly requires</mark>.',
    pair: 'IAM policy vs Root user', family: 'AWS identity & access',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best way to grant this access.',
        explanation: 'The buried constraint is "no more access than the single read task strictly requires" on one bucket. That is the principle of least privilege: create an IAM user (or role) with a policy granting only read on that bucket. Sharing root credentials violates least privilege and the rule to never use the root user for daily tasks.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Create an IAM identity with a policy allowing read-only on that one bucket' },
            { id: 'l2', text: 'Share the AWS account root user credentials', why: 'The root user has unrestricted access to everything and must never be shared or used for daily work; this grossly violates least privilege.' },
            { id: 'l3', text: 'Attach AdministratorAccess to a new IAM user', why: 'AdministratorAccess grants full control of the account; the analyst needs read on one bucket, so this far exceeds least privilege.' },
            { id: 'l4', text: 'Make the bucket public so anyone can read it', why: 'A public bucket exposes the data to the entire internet; the requirement is to grant access to one analyst, not to the world.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-4', cert: 'clfc02', objective: '3.2', topic: 'IAM roles vs users',
    title: 'Give an EC2 app access to S3', estMinutes: 3,
    scenario: 'An application on an EC2 instance must read objects from S3. The developer wants AWS best practice and <mark>does not want to store long-term access keys on the instance</mark>.',
    pair: 'IAM role vs IAM access keys', family: 'AWS identity & access',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best way to grant the app access.',
        explanation: 'The tell is "does not want to store long-term access keys on the instance". Attaching an IAM role to the EC2 instance supplies temporary, automatically rotated credentials; no static keys are stored on disk.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Attach an IAM role to the EC2 instance' },
            { id: 'l2', text: 'Hard-code IAM user access keys in the application', why: 'Embedding long-term access keys is exactly what the requirement forbids; keys on the instance are a leak risk and must be avoided.' },
            { id: 'l3', text: 'Store the root access keys in a file on the instance', why: 'Root keys grant full account access and should never exist as static keys, let alone be placed on an instance.' },
            { id: 'l4', text: 'Make the S3 bucket public', why: 'Making the bucket public exposes data to everyone and does not implement scoped, credential-free access for this one app.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-5', cert: 'clfc02', objective: '3.2', topic: 'Multi-factor authentication',
    title: 'Harden the root account', estMinutes: 3,
    scenario: 'A security review finds the AWS account root user is protected only by a password. The reviewer wants to <mark>add a second factor</mark> so a stolen password alone cannot grant access.',
    pair: 'MFA vs IAM policy', family: 'AWS identity & access',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the control that adds a second factor.',
        explanation: 'The tell is "add a second factor" so a stolen password alone is not enough. Enabling multi-factor authentication (MFA) on the root user requires both the password and a device-generated code.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Enable multi-factor authentication (MFA) on the root user' },
            { id: 'l2', text: 'Attach a more restrictive IAM policy', why: 'IAM policies limit what an identity can do, but the root user is not constrained by IAM policies and a policy adds no second authentication factor.' },
            { id: 'l3', text: 'Rotate the root password monthly', why: 'Rotating the password is good hygiene but it is still a single factor; a stolen current password would still grant access.' },
            { id: 'l4', text: 'Create a strong password policy', why: 'A password policy strengthens the first factor only; it does not add the second factor the requirement calls for.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-6', cert: 'clfc02', objective: '3.3', topic: 'DDoS protection',
    title: 'Pick the DDoS defense', estMinutes: 3,
    scenario: 'A public web app behind CloudFront is being hit by a volumetric network flood. The team wants the AWS service <mark>purpose-built to protect against DDoS attacks</mark>.',
    pair: 'Shield vs WAF', family: 'AWS security services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the DDoS-protection service.',
        explanation: 'The tell is "protect against DDoS attacks", specifically a volumetric flood. AWS Shield is the managed DDoS protection service. AWS WAF filters malicious web requests (like SQL injection) but is not the DDoS-specific service.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS Shield' },
            { id: 'l2', text: 'AWS WAF', why: 'WAF inspects HTTP/HTTPS requests for web exploits such as SQL injection and cross-site scripting; the dedicated DDoS service is Shield.' },
            { id: 'l3', text: 'Amazon GuardDuty', why: 'GuardDuty is a threat-detection service that analyzes logs for malicious activity; it alerts, it does not absorb or block a DDoS flood.' },
            { id: 'l4', text: 'AWS Config', why: 'AWS Config records and evaluates resource configuration over time; it has nothing to do with mitigating a DDoS attack.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-7', cert: 'clfc02', objective: '3.3', topic: 'Web application firewall',
    title: 'Block SQL injection at the edge', estMinutes: 3,
    scenario: 'A web app is receiving requests that attempt SQL injection and cross-site scripting. The team wants to <mark>filter malicious HTTP requests</mark> before they reach the application.',
    pair: 'Shield vs WAF', family: 'AWS security services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the service to filter these requests.',
        explanation: 'The tell is "filter malicious HTTP requests" like SQL injection and XSS. AWS WAF is the web application firewall that inspects and blocks bad web requests. Shield handles DDoS, not application-layer request filtering.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS WAF' },
            { id: 'l2', text: 'AWS Shield', why: 'Shield protects against DDoS volumetric and protocol attacks; it does not inspect request content for SQL injection or XSS.' },
            { id: 'l3', text: 'Amazon Inspector', why: 'Inspector scans EC2 and container workloads for software vulnerabilities; it does not filter live inbound web requests.' },
            { id: 'l4', text: 'AWS Trusted Advisor', why: 'Trusted Advisor gives best-practice recommendations across cost, security, and limits; it does not block malicious requests in real time.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-8', cert: 'clfc02', objective: '3.3', topic: 'Sensitive data discovery',
    title: 'Find PII sitting in S3', estMinutes: 3,
    scenario: 'A compliance officer must locate which S3 buckets contain personally identifiable information like names and credit-card numbers. They want a service that <mark>uses machine learning to discover and classify sensitive data</mark> in S3.',
    pair: 'Inspector vs Macie vs GuardDuty', family: 'AWS security services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the service for this.',
        explanation: 'The tell is "discover and classify sensitive data (PII)" in S3. Amazon Macie uses machine learning to find and classify sensitive data stored in S3. Inspector scans for software vulnerabilities; GuardDuty detects threats from log analysis.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon Macie' },
            { id: 'l2', text: 'Amazon Inspector', why: 'Inspector finds software vulnerabilities and unintended network exposure on workloads; it does not scan S3 objects to classify PII.' },
            { id: 'l3', text: 'Amazon GuardDuty', why: 'GuardDuty detects malicious or anomalous activity from logs (VPC Flow, DNS, CloudTrail); it does not inventory and classify sensitive data in buckets.' },
            { id: 'l4', text: 'AWS Config', why: 'Config tracks resource configuration and compliance state; it does not inspect the contents of S3 objects for PII.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-9', cert: 'clfc02', objective: '3.3', topic: 'Threat detection',
    title: 'Detect malicious account activity', estMinutes: 3,
    scenario: 'A security team wants continuous monitoring that <mark>analyzes account and network logs to flag anomalous or malicious behavior</mark>, such as crypto-mining or compromised credentials, with no agents to install.',
    pair: 'Inspector vs Macie vs GuardDuty', family: 'AWS security services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the threat-detection service.',
        explanation: 'The tell is "analyzes account and network logs to flag anomalous or malicious behavior" with no agents. Amazon GuardDuty continuously analyzes CloudTrail, VPC Flow, and DNS logs for threats. Macie classifies data; Inspector scans for vulnerabilities.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon GuardDuty' },
            { id: 'l2', text: 'Amazon Macie', why: 'Macie classifies sensitive data in S3; it does not analyze account/network logs for malicious activity like compromised credentials.' },
            { id: 'l3', text: 'Amazon Inspector', why: 'Inspector assesses workloads for software vulnerabilities and exposure; it is not a log-driven anomaly/threat detector.' },
            { id: 'l4', text: 'AWS Shield', why: 'Shield mitigates DDoS attacks; it does not analyze logs to detect compromised credentials or crypto-mining behavior.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-10', cert: 'clfc02', objective: '3.3', topic: 'Vulnerability assessment',
    title: 'Scan workloads for CVEs', estMinutes: 3,
    scenario: 'A team must continuously check their EC2 instances and container images for <mark>known software vulnerabilities (CVEs) and unintended network exposure</mark> and get prioritized findings.',
    pair: 'Inspector vs Macie vs GuardDuty', family: 'AWS security services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the right service.',
        explanation: 'The tell is "known software vulnerabilities (CVEs)" on EC2 and container images. Amazon Inspector automatically scans workloads for vulnerabilities and unintended exposure. Macie classifies data; GuardDuty does log-based threat detection.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon Inspector' },
            { id: 'l2', text: 'Amazon GuardDuty', why: 'GuardDuty detects active threats from logs; it does not scan instances and images for known software vulnerabilities (CVEs).' },
            { id: 'l3', text: 'Amazon Macie', why: 'Macie discovers and classifies sensitive data in S3; it has nothing to do with CVE scanning of compute workloads.' },
            { id: 'l4', text: 'AWS Artifact', why: 'Artifact is a portal for AWS compliance reports and agreements; it does not scan your workloads for vulnerabilities.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-11', cert: 'clfc02', objective: '3.4', topic: 'Compliance reports',
    title: 'Get a SOC 2 report for an auditor', estMinutes: 3,
    scenario: 'An external auditor asks for AWS SOC 2 and ISO compliance reports. The customer needs to <mark>download these on-demand AWS compliance documents</mark> themselves.',
    pair: 'Artifact vs Config', family: 'AWS compliance & governance',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the service that provides these reports.',
        explanation: 'The tell is "download on-demand AWS compliance documents" like SOC 2 and ISO. AWS Artifact is the self-service portal for AWS compliance reports and agreements. Config evaluates your resource configurations, not AWS audit reports.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS Artifact' },
            { id: 'l2', text: 'AWS Config', why: 'Config records and evaluates the configuration of your resources for compliance with rules; it does not host AWS audit reports like SOC 2.' },
            { id: 'l3', text: 'AWS Trusted Advisor', why: 'Trusted Advisor recommends best practices across cost, performance, and security; it does not supply downloadable compliance attestation documents.' },
            { id: 'l4', text: 'Amazon Inspector', why: 'Inspector scans workloads for vulnerabilities; it does not provide AWS compliance reports for an auditor.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-12', cert: 'clfc02', objective: '3.3', topic: 'Secrets and key management',
    title: 'Manage encryption keys centrally', estMinutes: 3,
    scenario: 'An app must encrypt data at rest and the security team wants to <mark>create, control, and audit the encryption keys</mark> centrally, with AWS integration across services.',
    pair: 'KMS vs Secrets Manager', family: 'AWS security services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the service for encryption-key management.',
        explanation: 'The tell is "create, control, and audit the encryption keys". AWS Key Management Service (KMS) creates and manages cryptographic keys with usage logged in CloudTrail. Secrets Manager stores credentials/secrets, not the encryption keys themselves.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS Key Management Service (KMS)' },
            { id: 'l2', text: 'AWS Secrets Manager', why: 'Secrets Manager stores and rotates secrets like database passwords and API keys; the requirement is to manage cryptographic encryption keys, which is KMS.' },
            { id: 'l3', text: 'AWS IAM', why: 'IAM manages identities and permissions; it does not create or manage encryption keys for data at rest.' },
            { id: 'l4', text: 'Amazon Macie', why: 'Macie discovers sensitive data in S3; it does not create, control, or audit encryption keys.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-13', cert: 'clfc02', objective: '3.2', topic: 'Multi-account governance',
    title: 'Restrict actions across many accounts', estMinutes: 3,
    scenario: 'A company runs dozens of AWS accounts and wants a central way to <mark>enforce a guardrail that no account can disable CloudTrail</mark>, regardless of that account admin permissions.',
    pair: 'Organizations SCP vs IAM policy', family: 'AWS compliance & governance',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the mechanism for this guardrail.',
        explanation: 'The tell is "central guardrail" across "dozens of accounts" that even an account admin cannot override. Service control policies (SCPs) in AWS Organizations set the maximum permissions across accounts. An IAM policy only affects identities within one account.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'A service control policy (SCP) in AWS Organizations' },
            { id: 'l2', text: 'An IAM policy attached in each account', why: 'IAM policies grant or deny within a single account and can be changed by that account admin; they cannot impose an org-wide ceiling that admins cannot override.' },
            { id: 'l3', text: 'A security group rule', why: 'Security groups control network traffic to resources; they cannot govern which API actions accounts are allowed to perform.' },
            { id: 'l4', text: 'AWS Trusted Advisor checks', why: 'Trusted Advisor reports recommendations; it advises but does not enforce a hard guardrail preventing an action across accounts.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-14', cert: 'clfc02', objective: '3.1', topic: 'Shared responsibility model',
    title: 'What the cloud removes for Lambda', estMinutes: 3,
    scenario: 'A team rewrites a workload to run on AWS Lambda. They ask which responsibility moving to this fully managed, serverless compute service <mark>removes from the customer entirely</mark>.',
    pair: 'EC2 vs Lambda responsibility', family: 'AWS shared responsibility',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick what Lambda removes from the customer.',
        explanation: 'The tell is "fully managed, serverless" and what it "removes from the customer". With Lambda, AWS manages the servers and the operating system, so the customer no longer patches or manages the underlying OS. The customer still owns their code, data, and IAM permissions.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Managing and patching the underlying operating system' },
            { id: 'l2', text: 'Writing and securing the function code', why: 'The customer still writes the application code and is responsible for its security; Lambda does not remove that.' },
            { id: 'l3', text: 'Setting IAM permissions for the function', why: 'Configuring least-privilege IAM for the function remains the customer responsibility under any compute model.' },
            { id: 'l4', text: 'Classifying and protecting the data', why: 'Data is always the customer responsibility regardless of how managed the compute is; Lambda does not remove it.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-security-15', cert: 'clfc02', objective: '3.2', topic: 'IAM identities',
    title: 'Match the IAM building block', estMinutes: 4,
    scenario: 'Match each IAM concept to what it does.',
    family: 'AWS identity & access',
    steps: [
      { id: 's1', type: 'match', points: 1,
        prompt: 'Pair each IAM concept with its description.',
        explanation: 'An IAM user is a long-term identity for a person or app. An IAM group is a collection of users that share permissions. An IAM role grants temporary credentials to whoever assumes it. An IAM policy is the JSON document defining allowed/denied actions. The root user is the all-powerful account owner identity to be used rarely.',
        payload: {
          left: [
            { id: 'user', label: 'IAM user' },
            { id: 'group', label: 'IAM group' },
            { id: 'role', label: 'IAM role' },
            { id: 'policy', label: 'IAM policy' },
            { id: 'root', label: 'Root user' }
          ],
          right: [
            { id: 'dlongterm', label: 'Long-term identity for a person or app' },
            { id: 'dcollection', label: 'A collection of users sharing permissions' },
            { id: 'dtemp', label: 'Grants temporary credentials when assumed' },
            { id: 'djson', label: 'JSON document defining allowed/denied actions' },
            { id: 'downer', label: 'All-powerful account owner; use rarely' }
          ]
        },
        answer: { pairs: { user: 'dlongterm', group: 'dcollection', role: 'dtemp', policy: 'djson', root: 'downer' } } }
    ]
  },

  // ========================================================================
  // ===== Technology & services (~34%, ~17) ================================
  // ========================================================================
  {
    id: 'clfc02-dl-tech-1', cert: 'clfc02', objective: '4.1', topic: 'Most-managed compute that fits',
    title: 'Deploy a web app with minimal ops', estMinutes: 4,
    scenario: 'A startup with minimal upfront budget and <mark>limited AWS expertise</mark> wants to deploy a standard web app and focus on writing code, not managing infrastructure, while still keeping control of the underlying environment if needed.',
    pair: 'EC2 vs Elastic Beanstalk', family: 'AWS compute',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best compute option.',
        explanation: 'The tell is "limited AWS expertise" plus "focus on writing code, not managing infrastructure". Elastic Beanstalk deploys and manages the capacity, load balancing, and scaling for you from your uploaded code, while still letting you access the underlying resources. Raw EC2 leaves all of that to the team.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS Elastic Beanstalk' },
            { id: 'l2', text: 'EC2 with Auto Scaling configured manually', why: 'This works but the team must build and operate the load balancer, scaling, and OS themselves; the constraint is limited expertise and a wish to avoid infrastructure work.' },
            { id: 'l3', text: 'A fleet of bare EC2 instances', why: 'Bare EC2 puts every operational task on the team; that is the opposite of focusing on code with limited expertise.' },
            { id: 'l4', text: 'AWS Lambda for the whole app', why: 'Lambda fits event-driven functions, but a standard always-on web app that the team wants some control over maps more cleanly to Elastic Beanstalk; Lambda also re-architects the app.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-2', cert: 'clfc02', objective: '4.1', topic: 'Simple managed app stack',
    title: 'Run a small site at a fixed monthly price', estMinutes: 3,
    scenario: 'A solo developer wants to launch a small blog and is intimidated by AWS. They want the <mark>simplest possible bundle</mark> with a predictable fixed monthly price that includes a VM, storage, and networking.',
    pair: 'Lightsail vs EC2', family: 'AWS compute',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best fit.',
        explanation: 'The tell is "simplest possible bundle" with a "predictable fixed monthly price" including compute, storage, and networking. Amazon Lightsail packages these for a flat monthly fee aimed at simple workloads and newcomers. EC2 is more flexible but more complex and usage-billed.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon Lightsail' },
            { id: 'l2', text: 'Amazon EC2', why: 'EC2 is powerful and flexible but exposes many options and is billed per usage; the developer asked for the simplest bundled service at a fixed monthly price.' },
            { id: 'l3', text: 'AWS Elastic Beanstalk', why: 'Beanstalk orchestrates EC2, scaling, and load balancing for app code; it is more than a solo blog needs and is not a flat-fee bundle.' },
            { id: 'l4', text: 'AWS Lambda', why: 'Lambda is serverless functions billed per request and duration; it does not provide the simple all-in-one VM-plus-storage bundle described.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-3', cert: 'clfc02', objective: '4.1', topic: 'Event-driven serverless compute',
    title: 'Run code only when a file lands', estMinutes: 3,
    scenario: 'A team needs to run a short image-resizing function each time a photo is uploaded to S3. There is no steady traffic and they want <mark>no servers to manage and to pay only when the code runs</mark>.',
    pair: 'Lambda vs EC2', family: 'AWS compute',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best compute service.',
        explanation: 'The tell is "no servers to manage", "pay only when the code runs", and event-triggered by an S3 upload. AWS Lambda runs code in response to events with no server management and per-invocation billing. EC2 would run continuously and bill even when idle.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS Lambda' },
            { id: 'l2', text: 'Amazon EC2', why: 'An EC2 instance runs (and bills) continuously even with no uploads; the requirement is to pay only when code runs and manage no servers.' },
            { id: 'l3', text: 'AWS Elastic Beanstalk', why: 'Beanstalk provisions and runs EC2 capacity for an app; it is not the pay-per-invocation, event-triggered model this sporadic task needs.' },
            { id: 'l4', text: 'Amazon Lightsail', why: 'Lightsail is a flat-fee always-on VM bundle; it does not give event-driven, pay-per-run execution with no servers to manage.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-4', cert: 'clfc02', objective: '4.2', topic: 'Object vs block vs file storage',
    title: 'Store large static media cheaply', estMinutes: 3,
    scenario: 'A media company must store millions of large video files that are written once and read often over the internet, with virtually unlimited capacity and <mark>the lowest cost per GB</mark>. The files are accessed by their URL, not as a mounted drive.',
    pair: 'EBS vs EFS vs S3', family: 'AWS storage',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best storage service.',
        explanation: 'The tell is "accessed by URL", "virtually unlimited capacity", and "lowest cost per GB" for static objects. Amazon S3 is object storage built for exactly this. EBS and EFS are mounted as drives/file systems to compute, which the requirement rules out.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon S3' },
            { id: 'l2', text: 'Amazon EBS', why: 'EBS is block storage attached to a single EC2 instance like a hard drive; it is not internet-addressable object storage and is pricier per GB for this use.' },
            { id: 'l3', text: 'Amazon EFS', why: 'EFS is a shared file system mounted by Linux instances; the files here are accessed by URL as objects, not via a mounted file system, and EFS costs more per GB.' },
            { id: 'l4', text: 'Amazon FSx', why: 'FSx provides managed Windows/Lustre file systems for compute; like EFS it is a mounted file system, not the lowest-cost object store accessed by URL.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-5', cert: 'clfc02', objective: '4.2', topic: 'Block storage',
    title: 'Attach a fast disk to one instance', estMinutes: 3,
    scenario: 'A database runs on a single EC2 instance and needs a <mark>persistent, low-latency block volume</mark> attached to that one instance to act as its disk.',
    pair: 'EBS vs EFS vs S3', family: 'AWS storage',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the right storage type.',
        explanation: 'The tell is "block volume attached to one instance" acting as its disk. Amazon EBS is block storage for a single EC2 instance, ideal for a database disk. EFS is a shared file system; S3 is object storage, neither is a block device.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon EBS' },
            { id: 'l2', text: 'Amazon EFS', why: 'EFS is a shared, network file system mounted by many instances; the requirement is a block device acting as one instance disk, which is EBS.' },
            { id: 'l3', text: 'Amazon S3', why: 'S3 is object storage accessed over an API, not a block volume you attach to an instance as its disk.' },
            { id: 'l4', text: 'AWS Storage Gateway', why: 'Storage Gateway bridges on-premises apps to AWS storage; it is not a block disk you attach directly to an EC2 database instance.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-6', cert: 'clfc02', objective: '4.2', topic: 'Shared file storage',
    title: 'Share files across many instances', estMinutes: 3,
    scenario: 'A fleet of Linux EC2 instances behind a load balancer must all <mark>read and write the same files at the same time</mark> from a shared, elastic file system.',
    pair: 'EBS vs EFS vs S3', family: 'AWS storage',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the right storage service.',
        explanation: 'The tell is "many instances read and write the same files at the same time" via a shared file system. Amazon EFS is a managed, elastic file system mountable by many Linux instances concurrently. A single EBS volume attaches to one instance; S3 is object storage, not a POSIX file system.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon EFS' },
            { id: 'l2', text: 'Amazon EBS', why: 'A standard EBS volume attaches to one instance at a time; it cannot serve as a shared file system across a whole fleet.' },
            { id: 'l3', text: 'Amazon S3', why: 'S3 is object storage accessed via API; it is not a mountable shared POSIX file system for concurrent read/write across instances.' },
            { id: 'l4', text: 'Amazon S3 Glacier', why: 'Glacier is archival object storage for cold data; it is neither shared nor low-latency for active concurrent file access.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-7', cert: 'clfc02', objective: '4.2', topic: 'Archival storage',
    title: 'Archive compliance data cheaply', estMinutes: 3,
    scenario: 'A company must retain audit logs for seven years for compliance. The data is <mark>almost never accessed, retrieval within about 12 hours is acceptable, and cost must be the absolute lowest</mark> of any storage option.',
    pair: 'S3 Glacier Deep Archive vs Glacier Flexible Retrieval', family: 'AWS storage',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the lowest-cost storage class.',
        explanation: 'The tell is "almost never accessed", "retrieval within about 12 hours is acceptable", and "the absolute lowest cost". S3 Glacier Deep Archive is the cheapest storage class AWS offers, with standard retrieval measured in hours (up to ~12). Glacier Flexible Retrieval is a tier up in price because it offers faster retrieval the requirement does not need.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon S3 Glacier Deep Archive' },
            { id: 'l2', text: 'Amazon S3 Glacier Flexible Retrieval', why: 'Flexible Retrieval is cold storage too, but it costs more than Deep Archive to buy minutes-to-hours retrieval; when ~12-hour retrieval is fine and cost must be absolute lowest, Deep Archive wins.' },
            { id: 'l3', text: 'Amazon S3 Standard', why: 'S3 Standard is built for frequent access and is the most expensive of these tiers; for cold seven-year archives it wastes money.' },
            { id: 'l4', text: 'Amazon EBS', why: 'EBS is block storage for an active instance disk; it is far costlier than archival object storage and is not designed for long-term cold archives.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-8', cert: 'clfc02', objective: '4.3', topic: 'Relational vs NoSQL database',
    title: 'Pick the managed relational database', estMinutes: 3,
    scenario: 'A team is migrating a traditional application that relies on <mark>SQL joins and a fixed relational schema</mark> with strong transactional consistency, and wants AWS to manage backups, patching, and failover.',
    pair: 'RDS vs DynamoDB', family: 'AWS databases',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best database service.',
        explanation: 'The tell is "SQL joins and a fixed relational schema" with managed operations. Amazon RDS is the managed relational database service for engines like MySQL and PostgreSQL. DynamoDB is a NoSQL key-value store without SQL joins or a fixed relational schema.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon RDS' },
            { id: 'l2', text: 'Amazon DynamoDB', why: 'DynamoDB is a NoSQL key-value/document database; it does not provide SQL joins or a fixed relational schema, which the app requires.' },
            { id: 'l3', text: 'Amazon S3', why: 'S3 is object storage, not a queryable relational database with transactions and joins.' },
            { id: 'l4', text: 'Amazon ElastiCache', why: 'ElastiCache is an in-memory cache (Redis/Memcached) for speed; it is not a durable relational database of record.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-9', cert: 'clfc02', objective: '4.3', topic: 'NoSQL database',
    title: 'Pick the database for huge scale and flexible items', estMinutes: 3,
    scenario: 'A mobile game needs a database for player profiles with <mark>single-digit millisecond latency at massive scale</mark>, flexible item attributes, and no schema to manage as it grows.',
    pair: 'RDS vs DynamoDB', family: 'AWS databases',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best database service.',
        explanation: 'The tell is "single-digit millisecond latency at massive scale" with "flexible item attributes" and no schema. Amazon DynamoDB is the managed NoSQL key-value/document database built for that. RDS is relational with a fixed schema and is not the natural fit for this pattern.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon DynamoDB' },
            { id: 'l2', text: 'Amazon RDS', why: 'RDS is relational with a fixed schema; the requirement is schema-flexible items at massive scale with millisecond latency, which is DynamoDB.' },
            { id: 'l3', text: 'Amazon Redshift', why: 'Redshift is a data-warehouse for analytical queries over large datasets; it is not a low-latency operational store for live player profiles.' },
            { id: 'l4', text: 'Amazon Aurora', why: 'Aurora is a high-performance relational engine; it still uses a relational schema and is not the schemaless key-value store described.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-10', cert: 'clfc02', objective: '4.3', topic: 'Data warehouse',
    title: 'Run analytics over petabytes', estMinutes: 3,
    scenario: 'An analytics team must run complex SQL aggregations and reporting queries across <mark>petabytes of historical data</mark> in a data warehouse, separate from the live transactional system.',
    pair: 'Redshift vs RDS', family: 'AWS databases',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best service.',
        explanation: 'The tell is "data warehouse", "complex SQL aggregations and reporting over petabytes". Amazon Redshift is the managed data-warehouse service for large-scale analytics (OLAP). RDS is tuned for transactional (OLTP) workloads, not petabyte analytical reporting.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon Redshift' },
            { id: 'l2', text: 'Amazon RDS', why: 'RDS targets transactional (OLTP) workloads; it is not optimized for petabyte-scale analytical aggregations, which is what a data warehouse like Redshift does.' },
            { id: 'l3', text: 'Amazon DynamoDB', why: 'DynamoDB is a NoSQL operational store for fast key lookups; it is not a SQL data warehouse for large analytical reporting.' },
            { id: 'l4', text: 'Amazon ElastiCache', why: 'ElastiCache is an in-memory cache for speed, not a warehouse for analyzing petabytes of historical data.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-11', cert: 'clfc02', objective: '4.4', topic: 'Monitoring vs auditing',
    title: 'Watch performance metrics and alarms', estMinutes: 3,
    scenario: 'An ops team wants to track CPU utilization, set alarms, and view <mark>performance metrics and logs</mark> for their AWS resources to know how the system is performing.',
    pair: 'CloudWatch vs CloudTrail', family: 'AWS monitoring & audit',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the monitoring service.',
        explanation: 'The tell is "performance metrics, logs, and alarms" about how the system performs. Amazon CloudWatch collects metrics and logs and triggers alarms. CloudTrail records API activity for auditing (who did what), not performance metrics.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon CloudWatch' },
            { id: 'l2', text: 'AWS CloudTrail', why: 'CloudTrail logs API calls for auditing (who did what, when); it does not collect performance metrics like CPU utilization or fire performance alarms.' },
            { id: 'l3', text: 'AWS Config', why: 'Config tracks resource configuration changes and compliance; it is not the service for live performance metrics and alarms.' },
            { id: 'l4', text: 'AWS Trusted Advisor', why: 'Trusted Advisor gives periodic best-practice recommendations; it does not stream real-time metrics or fire CPU alarms.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-12', cert: 'clfc02', objective: '4.4', topic: 'API auditing',
    title: 'Find out who deleted a resource', estMinutes: 3,
    scenario: 'After an S3 bucket was deleted, security must determine <mark>which user made which API call and when</mark> across the account, for an audit trail.',
    pair: 'CloudWatch vs CloudTrail', family: 'AWS monitoring & audit',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the right service.',
        explanation: 'The tell is "which user made which API call and when" for an audit trail. AWS CloudTrail records account API activity for governance and auditing. CloudWatch is for performance metrics and logs, not a who-did-what audit record.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS CloudTrail' },
            { id: 'l2', text: 'Amazon CloudWatch', why: 'CloudWatch tracks performance metrics and operational logs; it is not the API-call audit trail that records which identity performed each action.' },
            { id: 'l3', text: 'Amazon GuardDuty', why: 'GuardDuty analyzes logs to detect threats; it consumes CloudTrail data but is not itself the system-of-record audit trail of every API call.' },
            { id: 'l4', text: 'AWS Config', why: 'Config records resource configuration state over time; it shows what changed, not the per-user API call history CloudTrail provides.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-13', cert: 'clfc02', objective: '4.5', topic: 'AI/ML abstraction layer (pre-trained API)',
    title: 'Add image labeling with no ML team', estMinutes: 4,
    scenario: 'A retailer wants to automatically detect objects and text in product photos. The team has no data scientists and wants to <mark>call a finished service and get results back today, without building or training anything</mark>.',
    pair: 'Rekognition API vs SageMaker', family: 'AWS AI/ML services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best AI/ML option.',
        explanation: 'The buried constraint is "call a finished service and get results back today, without building or training anything". A pre-trained AI service like Amazon Rekognition does image and text detection out of the box. SageMaker is for teams that build and train custom models, which the constraint rules out.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon Rekognition (pre-trained image API)' },
            { id: 'l2', text: 'Amazon SageMaker', why: 'SageMaker is the platform for building, training, and tuning your own ML models; the team has no ML expertise and explicitly does not want to train a model.' },
            { id: 'l3', text: 'Amazon EC2 with a custom ML framework', why: 'Rolling your own ML stack on EC2 demands deep ML and ops skills; that is the opposite of the no-expertise, ready-to-use API requirement.' },
            { id: 'l4', text: 'AWS Lambda only', why: 'Lambda runs code but provides no built-in vision model; you would still need an ML model, which a pre-trained service like Rekognition supplies directly.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-14', cert: 'clfc02', objective: '4.5', topic: 'AI/ML abstraction layer (build custom model)',
    title: 'Build and train a custom model', estMinutes: 4,
    scenario: 'A data-science team has labeled proprietary data and wants to <mark>build, train, tune, and deploy their own custom machine-learning model</mark> with full control over the algorithm.',
    pair: 'SageMaker vs pre-trained AI API', family: 'AWS AI/ML services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best AI/ML option.',
        explanation: 'The tell is "build, train, tune, and deploy their own custom model" with control over the algorithm. Amazon SageMaker is the managed platform for the full custom-model lifecycle. Pre-trained APIs like Rekognition or Comprehend cannot be trained from scratch on proprietary data this way.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon SageMaker' },
            { id: 'l2', text: 'Amazon Rekognition', why: 'Rekognition is a pre-trained vision API; you consume it as-is and cannot build and train an arbitrary custom model on it, which this team requires.' },
            { id: 'l3', text: 'Amazon Comprehend', why: 'Comprehend is a pre-trained NLP service; it is not a platform for building, training, and tuning a custom model end to end.' },
            { id: 'l4', text: 'Amazon Q', why: 'Amazon Q is a generative-AI assistant; it does not provide the build/train/tune/deploy lifecycle for a custom model that SageMaker does.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-15', cert: 'clfc02', objective: '4.5', topic: 'Generative AI foundation models',
    title: 'Build a generative-AI app on foundation models', estMinutes: 4,
    scenario: 'A team wants to build a generative-AI chatbot using existing <mark>foundation models from multiple providers through a single managed API</mark>, without training their own model and without managing infrastructure.',
    pair: 'Bedrock vs SageMaker', family: 'AWS AI/ML services',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the best AI/ML service.',
        explanation: 'The tell is "foundation models from multiple providers through a single managed API" for generative AI, without training a model. Amazon Bedrock provides access to multiple foundation models via one managed API. SageMaker is for building/training your own models, which this team does not want.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon Bedrock' },
            { id: 'l2', text: 'Amazon SageMaker', why: 'SageMaker is for building and training your own models; the requirement is to consume existing foundation models through a managed API, which is Bedrock.' },
            { id: 'l3', text: 'Amazon Rekognition', why: 'Rekognition is a pre-trained computer-vision API for images and video; it is not a generative-AI foundation-model platform for a chatbot.' },
            { id: 'l4', text: 'Amazon EC2 with self-hosted models', why: 'Self-hosting models on EC2 means managing the infrastructure yourself, which the constraint of no infrastructure management rules out.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-16', cert: 'clfc02', objective: '4.1', topic: 'Decoupling with messaging',
    title: 'Decouple a spiky workload', estMinutes: 3,
    scenario: 'An order system gets traffic spikes that overwhelm the processing tier. The architect wants to <mark>buffer requests in a managed message queue</mark> so producers and consumers are decoupled and messages are not lost during spikes.',
    pair: 'SQS vs SNS', family: 'AWS application integration',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the right service.',
        explanation: 'The tell is "buffer requests in a managed message queue" to decouple producers and consumers. Amazon SQS is a managed message queue that holds messages until a consumer processes them. SNS is pub/sub fan-out notification, not a durable work queue buffer.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Amazon SQS' },
            { id: 'l2', text: 'Amazon SNS', why: 'SNS is a publish/subscribe notification service that pushes a message to many subscribers; it is not a queue that buffers work for one consumer to pull at its own pace.' },
            { id: 'l3', text: 'Amazon CloudWatch', why: 'CloudWatch monitors metrics and logs; it does not buffer application messages between producers and consumers.' },
            { id: 'l4', text: 'Elastic Load Balancing', why: 'A load balancer distributes live requests across servers; it does not durably queue messages so none are lost during a spike.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-tech-17', cert: 'clfc02', objective: '4.2', topic: 'Service-family sorter',
    title: 'Sort each service into its family', estMinutes: 4,
    scenario: 'Sort each AWS service into the category it belongs to.',
    family: 'AWS service families',
    steps: [
      { id: 's1', type: 'categorize', points: 1,
        prompt: 'Place each service under Compute, Storage, Database, or Networking.',
        explanation: 'EC2 and Lambda are compute. S3 and EBS are storage. RDS and DynamoDB are databases. VPC and Route 53 are networking (a virtual network and a DNS service).',
        payload: {
          items: [
            { id: 'ec2', label: 'Amazon EC2' },
            { id: 'lambda', label: 'AWS Lambda' },
            { id: 's3', label: 'Amazon S3' },
            { id: 'ebs', label: 'Amazon EBS' },
            { id: 'rds', label: 'Amazon RDS' },
            { id: 'dynamo', label: 'Amazon DynamoDB' },
            { id: 'vpc', label: 'Amazon VPC' },
            { id: 'route53', label: 'Amazon Route 53' }
          ],
          buckets: [
            { id: 'compute', label: 'Compute' },
            { id: 'storage', label: 'Storage' },
            { id: 'database', label: 'Database' },
            { id: 'networking', label: 'Networking' }
          ]
        },
        answer: { map: { ec2: 'compute', lambda: 'compute', s3: 'storage', ebs: 'storage', rds: 'database', dynamo: 'database', vpc: 'networking', route53: 'networking' } } }
    ]
  },

  // ========================================================================
  // ===== Billing, pricing & support (~12%, ~6) ============================
  // ========================================================================
  {
    id: 'clfc02-dl-billing-1', cert: 'clfc02', objective: '2.1', topic: 'Pre-purchase cost estimation',
    title: 'Estimate cost before you build', estMinutes: 3,
    scenario: 'An architect is designing a new workload and wants to <mark>estimate the monthly AWS cost before any resources are deployed</mark>, by modeling the services they plan to use.',
    pair: 'Cost Explorer vs Pricing Calculator', family: 'AWS cost & pricing tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the right cost tool.',
        explanation: 'The tell is "estimate the monthly cost before any resources are deployed". The AWS Pricing Calculator models the cost of a planned architecture up front. Cost Explorer analyzes spend you have already incurred, so it has nothing to model yet.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS Pricing Calculator' },
            { id: 'l2', text: 'AWS Cost Explorer', why: 'Cost Explorer visualizes and analyzes spend you have ALREADY incurred; with nothing deployed yet there is no historical spend to explore.' },
            { id: 'l3', text: 'AWS Budgets', why: 'Budgets alerts you when actual or forecast spend crosses a threshold; it does not produce an upfront estimate for an architecture not yet built.' },
            { id: 'l4', text: 'AWS Cost and Usage Report', why: 'The CUR is a detailed line-item export of actual usage and cost; it reports on real deployed usage, not a pre-deployment estimate.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-billing-2', cert: 'clfc02', objective: '2.2', topic: 'Analyzing past spend',
    title: 'Analyze where the money went', estMinutes: 3,
    scenario: 'A FinOps analyst wants to <mark>visualize and explore historical AWS spend</mark> over the past several months, broken down by service and tag, to spot trends.',
    pair: 'Cost Explorer vs Pricing Calculator', family: 'AWS cost & pricing tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the right cost tool.',
        explanation: 'The tell is "visualize and explore historical spend" by service and tag to spot trends. AWS Cost Explorer is the tool for analyzing past and forecasted usage and cost. The Pricing Calculator only estimates future, not-yet-incurred cost.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS Cost Explorer' },
            { id: 'l2', text: 'AWS Pricing Calculator', why: 'The Pricing Calculator estimates the cost of a planned, not-yet-deployed architecture; it does not analyze your actual historical spend.' },
            { id: 'l3', text: 'AWS Budgets', why: 'Budgets sets thresholds and alerts on spend; it is not the interactive tool for slicing and visualizing historical cost trends by service and tag.' },
            { id: 'l4', text: 'AWS Trusted Advisor', why: 'Trusted Advisor flags cost-optimization opportunities, but it does not provide the historical spend visualization and trend analysis Cost Explorer does.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-billing-3', cert: 'clfc02', objective: '2.2', topic: 'Spend alerting',
    title: 'Get alerted before you overspend', estMinutes: 3,
    scenario: 'A finance lead sets a hard monthly dollar ceiling and wants the team notified <mark>while there is still time to act, before the bill actually arrives</mark>, if spend is trending past that ceiling.',
    pair: 'Budgets vs Cost Explorer', family: 'AWS cost & pricing tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the right cost tool.',
        explanation: 'The buried constraint is a fixed dollar ceiling plus notification "before the bill arrives" when spend trends past it. AWS Budgets lets you set custom cost/usage budgets and triggers alerts when actual or forecasted spend crosses them. Cost Explorer analyzes spend but does not, by itself, send threshold alerts.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS Budgets' },
            { id: 'l2', text: 'AWS Cost Explorer', why: 'Cost Explorer visualizes and forecasts spend, but the threshold-crossing alert mechanism is AWS Budgets.' },
            { id: 'l3', text: 'AWS Pricing Calculator', why: 'The Pricing Calculator estimates future architecture cost; it does not watch live spend or send alerts when a threshold is approached.' },
            { id: 'l4', text: 'AWS Cost and Usage Report', why: 'The CUR is a detailed billing data export for analysis; it does not actively alert you when forecast spend exceeds a budget.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-billing-4', cert: 'clfc02', objective: '2.1', topic: 'EC2 pricing models',
    title: 'Save on steady 24x7 compute', estMinutes: 3,
    scenario: 'A team commits to a steady dollar-per-hour of compute for a year but expects to shift across EC2 instance families, Fargate, and Lambda as it refactors. They want the commitment discount that <mark>applies automatically across those compute services as usage moves</mark>.',
    pair: 'Reserved Instances vs Savings Plans', family: 'AWS cost & pricing tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the most cost-effective pricing model.',
        explanation: 'The tell is a commitment that "applies automatically across compute services as usage moves" between EC2 families, Fargate, and Lambda. Compute Savings Plans commit to a $/hour of compute spend and flex across instance family, Region, OS, tenancy, Fargate, and Lambda. Standard Reserved Instances lock the discount to a specific instance attribute set, so they do not follow the workload as it shifts services.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'Compute Savings Plans' },
            { id: 'l2', text: 'Standard Reserved Instances', why: 'A Standard RI ties its discount to a fixed instance family/Region/OS commitment; it does not flex across Fargate and Lambda the way a Compute Savings Plan does, so it cannot follow a workload that shifts compute services.' },
            { id: 'l3', text: 'Spot Instances', why: 'Spot is cheapest but AWS can reclaim the capacity with little notice and gives no committed-rate discount; that interruption is unacceptable for a steady, must-stay-up workload.' },
            { id: 'l4', text: 'On-Demand Instances', why: 'On-Demand has no commitment and the highest per-hour price; for a year-long steady commitment it forgoes the discount the team is willing to commit for.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-billing-5', cert: 'clfc02', objective: '2.1', topic: 'EC2 pricing for interruptible work',
    title: 'Run interruptible batch jobs cheapest', estMinutes: 3,
    scenario: 'A team runs <mark>fault-tolerant batch processing that can be interrupted and resumed</mark> at any time, and wants the deepest possible discount on the compute.',
    pair: 'Spot vs Reserved', family: 'AWS cost & pricing tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the cheapest fitting pricing model.',
        explanation: 'The tell is "fault-tolerant, can be interrupted and resumed" plus "deepest possible discount". EC2 Spot Instances offer the steepest discount precisely because AWS can reclaim them, which suits interruption-tolerant batch work.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'EC2 Spot Instances' },
            { id: 'l2', text: 'Reserved Instances', why: 'Reserved Instances suit steady always-on workloads via a 1- or 3-year commitment; they do not offer the deepest discount that interruption-tolerant Spot does.' },
            { id: 'l3', text: 'On-Demand Instances', why: 'On-Demand is the highest per-hour price with no discount; for interruptible batch work it leaves the biggest savings on the table.' },
            { id: 'l4', text: 'Dedicated Hosts', why: 'Dedicated Hosts are a premium option for isolation and licensing; they are the opposite of the cheapest choice for interruptible batch jobs.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-billing-7', cert: 'clfc02', objective: '2.1', topic: 'EC2 commitment discounts',
    title: 'Lock the deepest discount on one fixed instance', estMinutes: 3,
    scenario: 'A database runs 24x7 on one specific EC2 instance type in one Region and will not change for three years. The team wants the <mark>single deepest possible committed discount for that exact, unchanging instance</mark> and does not need the commitment to flex across other compute services.',
    pair: 'Reserved Instances vs Savings Plans', family: 'AWS cost & pricing tools',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the most cost-effective pricing model.',
        explanation: 'The tell is "one specific instance type in one Region", "unchanging", and "single deepest discount" with no need to flex. A 3-year Standard Reserved Instance gives the maximum discount when you commit to a fixed instance configuration. A Savings Plan trades a little of that peak discount for flexibility the team explicitly does not need here.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'A 3-year Standard Reserved Instance' },
            { id: 'l2', text: 'A Compute Savings Plan', why: 'A Compute Savings Plan buys flexibility across instance families, Fargate, and Lambda, but for a single fixed unchanging instance that flexibility is unused and it does not reach the absolute deepest discount a Standard RI gives.' },
            { id: 'l3', text: 'Spot Instances', why: 'Spot can be reclaimed by AWS at short notice; that interruption is unacceptable for an always-on production database that must not stop.' },
            { id: 'l4', text: 'On-Demand Instances', why: 'On-Demand carries no commitment and the highest per-hour price; for a fixed three-year workload it forgoes the large commitment discount entirely.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  },

  {
    id: 'clfc02-dl-billing-6', cert: 'clfc02', objective: '2.3', topic: 'AWS Support plans',
    title: 'Pick the support plan with a TAM', estMinutes: 3,
    scenario: 'A large enterprise running business-critical workloads wants a designated <mark>Technical Account Manager (TAM) and the fastest response for business-critical system-down cases</mark>.',
    pair: 'Enterprise vs Business support', family: 'AWS support & billing',
    steps: [
      { id: 's1', type: 'analyze', points: 1,
        prompt: 'Pick the support plan.',
        explanation: 'The tell is "designated Technical Account Manager (TAM)" and the fastest critical-case response. The AWS Enterprise Support plan includes a designated TAM and the quickest response time for business-critical issues. Business support lacks a designated TAM.',
        payload: {
          multi: false,
          lines: [
            { id: 'l1', text: 'AWS Enterprise Support' },
            { id: 'l2', text: 'AWS Business Support', why: 'Business Support offers 24/7 technical support but does NOT include a designated Technical Account Manager; that TAM is an Enterprise plan feature.' },
            { id: 'l3', text: 'AWS Developer Support', why: 'Developer Support is for non-production/early development with business-hours email support; it has no TAM and slower response, unfit for business-critical workloads.' },
            { id: 'l4', text: 'AWS Basic Support', why: 'Basic Support is included for all accounts and provides only documentation and account/billing help, no technical case support or TAM.' }
          ]
        },
        answer: { selected: ['l1'] } }
    ]
  }
];

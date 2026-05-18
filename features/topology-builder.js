// ════════════════════════════════════════════════════════════════════
// features/topology-builder.js — Phase 11c feature module (v4.99.44)
// ════════════════════════════════════════════════════════════════════
//
// Extracted from app.js lines 13629-27958 (~14,330 LOC — biggest
// extraction by 7x). Topology Builder: SVG canvas + device palette +
// cables + L2/L3 simulation + ambient packet animation + 29 guided
// labs + 15 scenarios + Tier C AI coach + Fix Challenges + import-map
// for Three.js + 3D View bridge (tb3d.js — already lazy via dynamic
// import, kept as-is).
//
// CRITICAL invariants:
// 1. Ambient packet animation uses requestAnimationFrame. tbStopAmbient
//    is exposed on window for shell-side showPage cleanup (the existing
//    cleanup hook at app.js:1787 stays unchanged).
// 2. tb3d.js dynamic import (line 15440-ish in original) preserved
//    verbatim — the 3D View remains its own lazy-load layer.
// 3. _TB_OVERLAY_REGISTRY + tbRegisterOverlay pattern preserved (used
//    by trace + STP overlays — all stay inside the IIFE).
// 4. Desktop-only via shell-stub viewport check (Phase 8 of mobile plan).
// ════════════════════════════════════════════════════════════════════

(function() {
  "use strict";

  // ══════════════════════════════════════════
  // TOPOLOGY BUILDER — Tier 1 (v4.18 / #74)
  // SVG canvas + device palette + cables + save/load
  // Tier 2 (config panels) and Tier 3 (AI coach) ship later.
  // ══════════════════════════════════════════
  
  const TB_MAX_DEVICES = 50;
  const TB_MAX_SAVES = 5;
  const TB_CANVAS_W = 1800;
  const TB_CANVAS_H = 1100;
  
  // Device type catalog. Adding a new type = one entry here.
  // `icon` is the key used by tbDeviceIcon() to render an inline SVG shape.
  const TB_DEVICE_TYPES = {
    router:        { label: 'Router',        color: '#7c6ff7', short: 'R'    },
    switch:        { label: 'Switch',        color: '#22c55e', short: 'SW'   },
    'dmz-switch':  { label: 'DMZ Switch',    color: '#f43f5e', short: 'DMZ'  },
    wap:           { label: 'WAP',           color: '#06b6d4', short: 'AP'   },
    pc:            { label: 'PC',            color: '#f59e0b', short: 'PC'   },
    server:        { label: 'Server',        color: '#ef4444', short: 'SRV'  },
    firewall:      { label: 'Firewall',      color: '#eab308', short: 'FW'   },
    cloud:         { label: 'Internet/WAN',   color: '#60a5fa', short: 'WAN'  },
    'isp-router':  { label: 'ISP Router',     color: '#818cf8', short: 'ISP'  },
    'load-balancer': { label: 'Load Balancer', color: '#ec4899', short: 'LB' },
    ids:           { label: 'IDS/IPS',       color: '#f97316', short: 'IDS'  },
    wlc:           { label: 'WLC',           color: '#14b8a6', short: 'WLC'  },
    printer:       { label: 'Printer',       color: '#a3a3a3', short: 'PRN'  },
    voip:          { label: 'VoIP Phone',    color: '#0ea5e9', short: 'VoIP' },
    iot:           { label: 'IoT Device',    color: '#84cc16', short: 'IoT'  },
    'public-web':  { label: 'Public Web',    color: '#fde047', short: 'WEB'  },
    'public-file': { label: 'Public File',   color: '#fb923c', short: 'FILE' },
    'public-cloud':{ label: 'Public Cloud',  color: '#38bdf8', short: 'PUB'  },
    // ── Cloud Networking device types ──
    'vpc':          { label: 'VPC',            color: '#8b5cf6', short: 'VPC'  },
    'cloud-subnet': { label: 'Cloud Subnet',  color: '#a78bfa', short: 'SUB'  },
    'igw':          { label: 'Internet GW',    color: '#2dd4bf', short: 'IGW'  },
    'nat-gw':       { label: 'NAT Gateway',   color: '#34d399', short: 'NAT'  },
    'tgw':          { label: 'Transit GW',     color: '#f472b6', short: 'TGW'  },
    'vpg':          { label: 'VPN Gateway',    color: '#fb923c', short: 'VPG'  },
    'onprem-dc':    { label: 'On-Prem DC',    color: '#78716c', short: 'DC'   },
    'sase-edge':    { label: 'SASE Edge',      color: '#e879f9', short: 'SASE' },
    'dns-server':   { label: 'DNS Server',     color: '#06b6d4', short: 'DNS'  },
    // ── v4.47.0: richer endpoint types (home/consumer devices) ──
    laptop:         { label: 'Laptop',         color: '#6366f1', short: 'LT'   },
    smartphone:     { label: 'Smartphone',     color: '#0891b2', short: 'PH'   },
    'game-console': { label: 'Game Console',   color: '#d946ef', short: 'GC'   },
    'smart-tv':     { label: 'Smart TV',       color: '#3b82f6', short: 'TV'   },
    // ── v4.49.0: WAN transport + broadband + storage devices ──
    'satellite':    { label: 'Satellite',      color: '#06b6d4', short: 'SAT'  },
    'cell-tower':   { label: 'Cell Tower',     color: '#818cf8', short: 'CELL' },
    'modem':        { label: 'Modem (DSL/Cable/ONT)', color: '#78716c', short: 'MDM' },
    'san-array':    { label: 'SAN Storage Array',    color: '#475569', short: 'SAN' },
  };
  
  // Palette categories — groups device types so users can scan quickly.
  // v4.49.0 added WAN transport + storage categories alongside the originals.
  const TB_PALETTE_GROUPS = [
    { label: 'Network',      types: ['router','switch','dmz-switch','isp-router'] },
    { label: 'WAN & Broadband', types: ['modem','cell-tower','satellite'] },
    { label: 'Cloud',        types: ['cloud','vpc','cloud-subnet','igw','nat-gw','tgw','vpg','onprem-dc','sase-edge'] },
    { label: 'Endpoints',    types: ['pc','laptop','smartphone','game-console','smart-tv','printer','voip','iot','server','dns-server','san-array','public-web','public-file','public-cloud'] },
    { label: 'Wireless',     types: ['wap','wlc'] },
    { label: 'Security',     types: ['firewall','load-balancer','ids'] },
  ];
  
  // Cable type catalog for the palette picker.
  // `width`/`color`/`dash` drive rendering; `label` shows in the palette chip.
  const TB_CABLE_TYPES = {
    cat6:    { label: 'Cat6',    color: '#a78bfa', width: 7, dash: ''    },
    cat5e:   { label: 'Cat5e',   color: '#3b82f6', width: 6, dash: ''    },
    fiber:   { label: 'Fiber',   color: '#f59e0b', width: 5, dash: ''    },
    coax:    { label: 'Coax',    color: '#0f172a', width: 9, dash: ''    },
    console: { label: 'Console', color: '#ef4444', width: 5, dash: '6 4' },
  };
  let tbSelectedCableType = 'cat6';
  
  // ══════════════════════════════════════════
  // TOPOLOGY BUILDER — Network Simulator Foundation
  // ══════════════════════════════════════════
  
  // Interface defaults per device type: how many ports, naming convention.
  const TB_IFACE_DEFAULTS = {
    router:        { count: 4,  naming: i => `Gi0/${i}` },
    switch:        { count: 24, naming: i => `Fa0/${i + 1}` },
    'dmz-switch':  { count: 24, naming: i => `Fa0/${i + 1}` },
    firewall:      { count: 4,  naming: i => `eth${i}` },
    wap:           { count: 1,  naming: () => 'eth0' },
    pc:            { count: 1,  naming: () => 'eth0' },
    server:        { count: 2,  naming: i => `eth${i}` },
    cloud:         { count: 4,  naming: i => `wan${i}` },
    'isp-router':  { count: 6,  naming: i => `Gi0/${i}` },
    printer:       { count: 1,  naming: () => 'eth0' },
    voip:          { count: 1,  naming: () => 'eth0' },
    iot:           { count: 1,  naming: () => 'eth0' },
    'load-balancer': { count: 4, naming: i => `eth${i}` },
    ids:           { count: 2,  naming: i => `eth${i}` },
    wlc:           { count: 2,  naming: i => `eth${i}` },
    'public-web':  { count: 1,  naming: () => 'eth0' },
    'public-file': { count: 1,  naming: () => 'eth0' },
    'public-cloud':{ count: 1,  naming: () => 'eth0' },
    // Cloud networking
    'vpc':          { count: 4,  naming: i => `eni${i}` },
    'cloud-subnet': { count: 2,  naming: i => `eni${i}` },
    'igw':          { count: 2,  naming: i => `eni${i}` },
    'nat-gw':       { count: 2,  naming: i => `eni${i}` },
    'tgw':          { count: 6,  naming: i => `att${i}` },
    'vpg':          { count: 2,  naming: i => `tun${i}` },
    'onprem-dc':    { count: 4,  naming: i => `eth${i}` },
    'sase-edge':    { count: 4,  naming: i => `zt${i}` },
    'dns-server':   { count: 2,  naming: i => `eth${i}` },
    // v4.47.0: consumer endpoints — all single-interface client devices
    laptop:         { count: 1,  naming: () => 'eth0' },
    smartphone:     { count: 1,  naming: () => 'wlan0' },
    'game-console': { count: 1,  naming: () => 'eth0' },
    'smart-tv':     { count: 1,  naming: () => 'eth0' },
    // v4.49.0: WAN transport + broadband + storage
    'satellite':    { count: 2,  naming: i => i === 0 ? 'uplink' : 'downlink' },   // up to orbit, down to ground
    'cell-tower':   { count: 3,  naming: i => i === 0 ? 'backhaul' : 'sector' + i }, // backhaul + sector antennas
    'modem':        { count: 2,  naming: i => i === 0 ? 'wan' : 'lan' },            // WAN to ISP, LAN to router
    'san-array':    { count: 2,  naming: i => 'fc' + i },                            // Fibre Channel ports
  };
  
  // Generate a deterministic MAC from a device ID + interface index.
  // Format: XX:XX:XX:YY:YY:ZZ where XX comes from a hash of deviceId, YY:ZZ from ifaceIdx.
  function tbGenerateMac(deviceId, ifaceIdx) {
    let h = 0x2A;
    for (let i = 0; i < deviceId.length; i++) h = ((h << 5) - h + deviceId.charCodeAt(i)) | 0;
    const a = (h >>> 24) & 0xFE; // clear multicast bit
    const b = (h >>> 16) & 0xFF;
    const c = (h >>> 8) & 0xFF;
    const hex = x => x.toString(16).padStart(2, '0').toUpperCase();
    return `${hex(a | 0x02)}:${hex(b)}:${hex(c)}:00:${hex(ifaceIdx)}:${hex((h ^ ifaceIdx) & 0xFF)}`;
  }
  
  // Auto-hostname: R1, SW2, PC3 etc based on existing devices of same type.
  function tbAutoHostname(type, devices) {
    const short = (TB_DEVICE_TYPES[type] && TB_DEVICE_TYPES[type].short) || type.toUpperCase().slice(0, 3);
    const count = devices.filter(d => d.type === type).length;
    return `${short}${count + 1}`;
  }
  
  // Create default interfaces for a device.
  function tbGenerateInterfaces(type, deviceId) {
    const def = TB_IFACE_DEFAULTS[type] || { count: 1, naming: i => `eth${i}` };
    const ifaces = [];
    for (let i = 0; i < def.count; i++) {
      ifaces.push({
        name: def.naming(i),
        cableId: null,
        ip: '',
        mask: '255.255.255.0',
        mac: tbGenerateMac(deviceId, i),
        vlan: 1,
        mode: 'access',     // 'access' | 'trunk'
        trunkAllowed: [1],
        gateway: '',
        enabled: true,
        subInterfaces: [],  // router-on-a-stick: [{name, vlan, ip, mask}]
      });
    }
    return ifaces;
  }
  
  // Migrate old topology state (pre-simulator) to new format.
  // Called on every load so old saves get interfaces/MACs auto-generated.
  function tbMigrateState(state) {
    if (!state || !state.devices) return state;
    state.devices.forEach(d => {
      if (!d.interfaces) {
        d.interfaces = tbGenerateInterfaces(d.type, d.id);
        d.hostname = tbAutoHostname(d.type, state.devices.filter(x => x !== d));
      }
      d.routingTable = d.routingTable || [];
      d.arpTable = d.arpTable || [];
      d.macTable = d.macTable || [];
      d.vlanDb = d.vlanDb || (d.type.indexOf('switch') >= 0 ? [{ id: 1, name: 'default' }] : []);
      d.dhcpServer = d.dhcpServer || null;
      d.dhcpRelay = d.dhcpRelay || null;
      d.acls = d.acls || [];
      // Cloud networking defaults
      d.securityGroups = d.securityGroups || [];
      d.nacls = d.nacls || [];
      d.vpcConfig = d.vpcConfig || null;
      d.vpnConfig = d.vpnConfig || null;
      d.saseConfig = d.saseConfig || null;
      // VXLAN overlay
      d.vxlanConfig = d.vxlanConfig || [];
      // v4.30.0 — STP, OSPF, IPv6, DNS, QoS, Wireless
      d.stpConfig = d.stpConfig || null;
      d.ospfConfig = d.ospfConfig || null;
      d.qosConfig = d.qosConfig || null;
      d.wirelessConfig = d.wirelessConfig || null;
      d.dnsRecords = d.dnsRecords || [];
      // IPv6 on interfaces
      d.interfaces.forEach(ifc => { ifc.ipv6 = ifc.ipv6 || ''; ifc.ipv6Prefix = ifc.ipv6Prefix || 64; });
      // v4.31.0 — BGP, EIGRP, DNSSEC, Attack scenarios
      d.bgpConfig = d.bgpConfig || null;
      d.eigrpConfig = d.eigrpConfig || null;
      d.dnssecEnabled = d.dnssecEnabled || false;
      d.dhcpSnooping = d.dhcpSnooping || null;
      d.daiEnabled = d.daiEnabled || false;
      d.portSecurity = d.portSecurity || null;
    });
    // Auto-bind cables to interfaces if not already bound
    state.cables.forEach(c => {
      if (c.fromIface === undefined || c.fromIface === null) {
        const fromDev = state.devices.find(d => d.id === c.from);
        if (fromDev) {
          const avail = fromDev.interfaces.find(ifc => !ifc.cableId);
          if (avail) { avail.cableId = c.id; c.fromIface = avail.name; }
          else c.fromIface = null;
        }
      }
      if (c.toIface === undefined || c.toIface === null) {
        const toDev = state.devices.find(d => d.id === c.to);
        if (toDev) {
          const avail = toDev.interfaces.find(ifc => !ifc.cableId);
          if (avail) { avail.cableId = c.id; c.toIface = avail.name; }
          else c.toIface = null;
        }
      }
    });
    state.simLog = state.simLog || [];
    return state;
  }
  
  // Simulation state (not persisted)
  let tbConfigPanelDeviceId = null;
  let tbSimRunning = false;
  let tbSimLog = [];
  let tbSimAnimations = [];
  
  function tbSelectCableType(type) {
    if (!TB_CABLE_TYPES[type]) return;
    tbSelectedCableType = type;
    tbRenderPalette();
    tbUpdateStatus(`Cable type set to ${TB_CABLE_TYPES[type].label}. Click device A \u2192 device B to wire.`);
  }
  
  // Inline SVG icon for each device type. Drawn inside a box roughly 56x40
  // centered near (0, -10) so the label at y=30 has room. `color` colors stroke/fill.
  function tbDeviceIcon(type, color) {
    const s = `stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
    const f = `fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-width="2"`;
    switch (type) {
      case 'router':
        return `<g transform="translate(0,-12)">
          <rect x="-28" y="-6" width="56" height="22" rx="4" ${f}/>
          <circle cx="-16" cy="5" r="2" fill="${color}"/>
          <circle cx="-8"  cy="5" r="2" fill="${color}"/>
          <circle cx="0"   cy="5" r="2" fill="${color}"/>
          <circle cx="8"   cy="5" r="2" fill="${color}"/>
          <circle cx="16"  cy="5" r="2" fill="${color}"/>
          <path d="M -20 -6 L -20 -16 M 20 -6 L 20 -16" ${s}/>
          <path d="M -24 -18 L -16 -18 M 16 -18 L 24 -18" ${s}/>
        </g>`;
      case 'switch':
        return `<g transform="translate(0,-10)">
          <rect x="-30" y="-8" width="60" height="20" rx="3" ${f}/>
          ${[-22,-14,-6,2,10,18].map(x => `<rect x="${x}" y="-2" width="4" height="8" fill="${color}"/>`).join('')}
        </g>`;
      case 'dmz-switch':
        return `<g transform="translate(0,-10)">
          <rect x="-30" y="-8" width="60" height="20" rx="3" ${f}/>
          ${[-22,-14,-6,2,10,18].map(x => `<rect x="${x}" y="-2" width="4" height="8" fill="${color}"/>`).join('')}
          <text y="-14" text-anchor="middle" font-size="8" font-weight="800" fill="${color}">DMZ</text>
        </g>`;
      case 'wap':
        return `<g transform="translate(0,-12)">
          <path d="M -22 -4 A 22 22 0 0 1 22 -4" ${s}/>
          <path d="M -14 2 A 14 14 0 0 1 14 2" ${s}/>
          <path d="M -6 8 A 6 6 0 0 1 6 8" ${s}/>
          <circle cx="0" cy="14" r="3" fill="${color}"/>
        </g>`;
      case 'pc':
        return `<g transform="translate(0,-12)">
          <rect x="-24" y="-14" width="48" height="32" rx="3" ${f}/>
          <rect x="-22" y="-12" width="44" height="26" rx="1" fill="${color}" fill-opacity="0.6"/>
          <rect x="-8" y="20" width="16" height="3" fill="${color}"/>
        </g>`;
      case 'server':
        return `<g transform="translate(0,-12)">
          <rect x="-22" y="-14" width="44" height="12" rx="2" ${f}/>
          <rect x="-22" y="0"   width="44" height="12" rx="2" ${f}/>
          <circle cx="-14" cy="-8" r="1.5" fill="${color}"/>
          <circle cx="-14" cy="6"  r="1.5" fill="${color}"/>
          <rect x="-6" y="-10" width="22" height="4" fill="${color}" fill-opacity="0.6"/>
          <rect x="-6" y="4"   width="22" height="4" fill="${color}" fill-opacity="0.6"/>
        </g>`;
      case 'firewall':
        return `<g transform="translate(0,-12)">
          <rect x="-28" y="-14" width="56" height="32" rx="2" ${f}/>
          <path d="M -28 -4 L 28 -4 M -28 8 L 28 8 M -14 -14 L -14 -4 M 0 -4 L 0 8 M 14 -14 L 14 -4 M -14 8 L -14 18 M 14 8 L 14 18" ${s}/>
        </g>`;
      case 'cloud':
        return `<g transform="translate(0,-10)">
          <circle cx="0" cy="-2" r="16" ${f}/>
          <ellipse cx="0" cy="-2" rx="16" ry="6" ${s}/>
          <line x1="0" y1="-18" x2="0" y2="14" ${s}/>
          <line x1="-16" y1="-2" x2="16" y2="-2" ${s}/>
          <path d="M 0 -18 Q -9 -2 0 14 Q 9 -2 0 -18" ${s}/>
          <text y="22" text-anchor="middle" font-size="6" font-weight="800" fill="${color}">WAN</text>
        </g>`;
      case 'isp-router':
        return `<g transform="translate(0,-12)">
          <rect x="-22" y="-14" width="44" height="28" rx="6" ${f}/>
          <circle cx="-10" cy="-4" r="3" fill="${color}"/>
          <circle cx="0" cy="-4" r="3" fill="${color}"/>
          <circle cx="10" cy="-4" r="3" fill="${color}"/>
          <line x1="-18" y1="4" x2="18" y2="4" ${s}/>
          <path d="M -8 8 L 0 12 L 8 8" ${s}/>
          <path d="M -8 12 L 0 8 L 8 12" ${s}/>
          <text y="26" text-anchor="middle" font-size="6" font-weight="800" fill="${color}">ISP</text>
        </g>`;
      case 'load-balancer':
        return `<g transform="translate(0,-12)">
          <rect x="-28" y="-8" width="56" height="18" rx="3" ${f}/>
          <path d="M 0 10 L 0 16 M 0 16 L -14 22 M 0 16 L 0 22 M 0 16 L 14 22" ${s}/>
          <text y="4" text-anchor="middle" font-size="10" font-weight="700" fill="${color}">LB</text>
        </g>`;
      case 'ids':
        return `<g transform="translate(0,-12)">
          <rect x="-26" y="-10" width="52" height="20" rx="3" ${f}/>
          <path d="M -14 0 Q 0 -8 14 0 Q 0 8 -14 0 Z" ${s}/>
          <circle cx="0" cy="0" r="3" fill="${color}"/>
        </g>`;
      case 'wlc':
        return `<g transform="translate(0,-12)">
          <rect x="-26" y="0" width="52" height="18" rx="3" ${f}/>
          <path d="M -14 -4 A 14 14 0 0 1 14 -4" ${s}/>
          <path d="M -8 -8 A 8 8 0 0 1 8 -8" ${s}/>
          <text y="14" text-anchor="middle" font-size="9" font-weight="700" fill="${color}">WLC</text>
        </g>`;
      case 'printer':
        return `<g transform="translate(0,-12)">
          <rect x="-18" y="-14" width="36" height="8" ${f}/>
          <rect x="-24" y="-6"  width="48" height="16" rx="2" ${f}/>
          <rect x="-16" y="6"   width="32" height="12" ${f}/>
          <circle cx="16" cy="0" r="2" fill="${color}"/>
        </g>`;
      case 'voip':
        return `<g transform="translate(0,-12)">
          <rect x="-20" y="-14" width="40" height="32" rx="3" ${f}/>
          <rect x="-14" y="-10" width="28" height="8" fill="${color}" fill-opacity="0.6"/>
          ${[0,1,2].map(r => [0,1,2].map(c => `<circle cx="${-8+c*8}" cy="${2+r*5}" r="1.5" fill="${color}"/>`).join('')).join('')}
        </g>`;
      case 'iot':
        return `<g transform="translate(0,-12)">
          <rect x="-20" y="-10" width="40" height="22" rx="4" ${f}/>
          <circle cx="0" cy="1" r="6" ${s}/>
          <circle cx="0" cy="1" r="2" fill="${color}"/>
          <circle cx="-14" cy="-6" r="1.5" fill="${color}"/>
        </g>`;
      case 'public-web':
        return `<g transform="translate(0,-12)">
          <circle cx="0" cy="0" r="18" ${f}/>
          <ellipse cx="0" cy="0" rx="18" ry="7" ${s}/>
          <line x1="-18" y1="0" x2="18" y2="0" ${s}/>
          <line x1="0" y1="-18" x2="0" y2="18" ${s}/>
          <path d="M 0 -18 Q -10 0 0 18 Q 10 0 0 -18" ${s}/>
          <text y="26" text-anchor="middle" font-size="8" font-weight="800" fill="${color}">WWW</text>
        </g>`;
      case 'public-file':
        return `<g transform="translate(0,-12)">
          <rect x="-22" y="-14" width="44" height="12" rx="2" ${f}/>
          <rect x="-22" y="0"   width="44" height="12" rx="2" ${f}/>
          <circle cx="-14" cy="-8" r="1.5" fill="${color}"/>
          <circle cx="-14" cy="6"  r="1.5" fill="${color}"/>
          <path d="M 6 -10 L 12 -10 L 14 -8 L 18 -8 L 18 -4 L 6 -4 Z" ${s}/>
          <path d="M 6 4 L 12 4 L 14 6 L 18 6 L 18 10 L 6 10 Z" ${s}/>
        </g>`;
      case 'public-cloud':
        return `<g transform="translate(0,-10)">
          <path d="M -24 6 A 10 10 0 0 1 -14 -6 A 14 14 0 0 1 14 -10 A 10 10 0 0 1 22 8 L -22 8 A 8 8 0 0 1 -24 6 Z" ${f}/>
          <path d="M -6 -2 L 0 -8 L 6 -2 M 0 -8 L 0 6" ${s}/>
        </g>`;
      // ── Cloud Networking icons ──
      case 'vpc':
        return `<g transform="translate(0,-10)">
          <rect x="-24" y="-14" width="48" height="28" rx="6" stroke="${color}" stroke-width="2" stroke-dasharray="4 2" fill="none"/>
          <line x1="-12" y1="-4" x2="12" y2="-4" ${s}/>
          <line x1="-12" y1="4" x2="12" y2="4" ${s}/>
          <line x1="-6" y1="-12" x2="-6" y2="12" ${s}/>
          <line x1="6" y1="-12" x2="6" y2="12" ${s}/>
          <text y="24" text-anchor="middle" font-size="7" font-weight="800" fill="${color}">VPC</text>
        </g>`;
      case 'cloud-subnet':
        return `<g transform="translate(0,-10)">
          <rect x="-20" y="-10" width="40" height="20" rx="3" ${f}/>
          <line x1="-10" y1="0" x2="10" y2="0" ${s}/>
          <line x1="0" y1="-8" x2="0" y2="8" ${s}/>
          <text y="20" text-anchor="middle" font-size="6" font-weight="800" fill="${color}">/24</text>
        </g>`;
      case 'igw':
        return `<g transform="translate(0,-10)">
          <circle cx="0" cy="0" r="14" ${f}/>
          <ellipse cx="0" cy="0" rx="14" ry="5" ${s}/>
          <line x1="0" y1="-14" x2="0" y2="14" ${s}/>
          <path d="M -22 0 L -16 0 M -22 -3 L -16 0 L -22 3" ${s}/>
          <path d="M 22 0 L 16 0 M 22 -3 L 16 0 L 22 3" ${s}/>
        </g>`;
      case 'nat-gw':
        return `<g transform="translate(0,-10)">
          <rect x="-18" y="-10" width="36" height="20" rx="4" ${f}/>
          <path d="M -8 4 L -8 -4 L 8 -4" ${s}/>
          <path d="M 4 -8 L 8 -4 L 4 0" ${s}/>
          <text y="20" text-anchor="middle" font-size="6" font-weight="800" fill="${color}">NAT</text>
        </g>`;
      case 'tgw':
        return `<g transform="translate(0,-10)">
          <circle cx="0" cy="0" r="8" ${f}/>
          <line x1="0" y1="-16" x2="0" y2="-8" ${s}/>
          <line x1="0" y1="8" x2="0" y2="16" ${s}/>
          <line x1="-16" y1="0" x2="-8" y2="0" ${s}/>
          <line x1="8" y1="0" x2="16" y2="0" ${s}/>
          <line x1="-11" y1="-11" x2="-6" y2="-6" ${s}/>
          <line x1="6" y1="6" x2="11" y2="11" ${s}/>
          <circle cx="0" cy="-16" r="3" ${f}/>
          <circle cx="0" cy="16" r="3" ${f}/>
          <circle cx="-16" cy="0" r="3" ${f}/>
          <circle cx="16" cy="0" r="3" ${f}/>
        </g>`;
      case 'vpg':
        return `<g transform="translate(0,-10)">
          <rect x="-16" y="-12" width="32" height="24" rx="4" ${f}/>
          <path d="M -4 -4 A 4 4 0 1 1 4 -4 L 4 2 L -4 2 Z" ${s}/>
          <circle cx="0" cy="-5" r="2" fill="${color}"/>
          <line x1="-22" y1="0" x2="-16" y2="0" stroke="${color}" stroke-width="2" stroke-dasharray="3 2"/>
          <line x1="16" y1="0" x2="22" y2="0" stroke="${color}" stroke-width="2" stroke-dasharray="3 2"/>
        </g>`;
      case 'onprem-dc':
        return `<g transform="translate(0,-12)">
          <path d="M -20 -8 L 0 -18 L 20 -8 L 20 12 L -20 12 Z" ${f}/>
          <rect x="-14" y="-4" width="28" height="6" rx="1" stroke="${color}" stroke-width="1.5" fill="rgba(0,0,0,.3)"/>
          <rect x="-14" y="4" width="28" height="6" rx="1" stroke="${color}" stroke-width="1.5" fill="rgba(0,0,0,.3)"/>
          <circle cx="-8" cy="-1" r="1.5" fill="${color}"/>
          <circle cx="-8" cy="7" r="1.5" fill="${color}"/>
        </g>`;
      case 'sase-edge':
        return `<g transform="translate(0,-10)">
          <path d="M 0 -16 L 18 -4 L 14 16 L -14 16 L -18 -4 Z" ${f}/>
          <path d="M -10 4 A 6 6 0 0 1 -4 -2 A 8 8 0 0 1 6 -4 A 6 6 0 0 1 10 2 L -8 2 Z" stroke="${color}" stroke-width="1.5" fill="none"/>
          <circle cx="0" cy="8" r="2" fill="${color}"/>
          <line x1="0" y1="10" x2="0" y2="14" ${s}/>
        </g>`;
      case 'dns-server':
        return `<g transform="translate(0,-10)">
          <rect x="-14" y="-14" width="28" height="28" rx="3" ${f}/>
          <text x="0" y="2" text-anchor="middle" font-size="10" font-weight="900" fill="${color}">DNS</text>
          <line x1="-8" y1="10" x2="8" y2="10" ${s}/>
          <circle cx="-6" cy="14" r="1.5" fill="${color}"/><circle cx="0" cy="14" r="1.5" fill="${color}"/><circle cx="6" cy="14" r="1.5" fill="${color}"/>
        </g>`;
      // ── v4.47.1: consumer endpoint icons (promoted from plain-circle default) ──
      case 'laptop':
        return `<g transform="translate(0,-8)">
          <!-- Screen (bezel + display) -->
          <rect x="-22" y="-14" width="44" height="22" rx="2" ${f}/>
          <rect x="-20" y="-12" width="40" height="18" rx="1" fill="${color}" fill-opacity="0.55"/>
          <!-- Webcam dot -->
          <circle cx="0" cy="-13" r="0.9" fill="${color}"/>
          <!-- Keyboard base (slight trapezoid for depth) -->
          <path d="M -26 10 L 26 10 L 28 14 L -28 14 Z" ${f}/>
          <!-- Trackpad hint -->
          <rect x="-6" y="11" width="12" height="1.6" rx="0.5" fill="${color}" fill-opacity="0.75"/>
        </g>`;
      case 'smartphone':
        return `<g transform="translate(0,-8)">
          <!-- Phone body (portrait) -->
          <rect x="-10" y="-16" width="20" height="32" rx="3" ${f}/>
          <!-- Screen -->
          <rect x="-8" y="-12" width="16" height="22" rx="1" fill="${color}" fill-opacity="0.6"/>
          <!-- Earpiece speaker -->
          <line x1="-3" y1="-14" x2="3" y2="-14" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Home-button ring -->
          <circle cx="0" cy="13" r="1.6" stroke="${color}" stroke-width="1.3" fill="none"/>
        </g>`;
      case 'game-console':
        return `<g transform="translate(0,-4)">
          <!-- Controller body -->
          <rect x="-24" y="-12" width="48" height="22" rx="9" ${f}/>
          <!-- D-pad cross (left) -->
          <rect x="-18" y="-5" width="8" height="2.5" fill="${color}"/>
          <rect x="-15.25" y="-8" width="2.5" height="8" fill="${color}"/>
          <!-- 4 face buttons in diamond (right) -->
          <circle cx="14" cy="-8" r="1.6" fill="${color}"/>
          <circle cx="18" cy="-4" r="1.6" fill="${color}"/>
          <circle cx="10" cy="-4" r="1.6" fill="${color}"/>
          <circle cx="14" cy="0" r="1.6" fill="${color}"/>
          <!-- Twin thumbsticks (center) -->
          <circle cx="-5" cy="4" r="2.5" stroke="${color}" stroke-width="1.3" fill="${color}" fill-opacity="0.35"/>
          <circle cx="5" cy="4" r="2.5" stroke="${color}" stroke-width="1.3" fill="${color}" fill-opacity="0.35"/>
        </g>`;
      case 'smart-tv':
        return `<g transform="translate(0,-8)">
          <!-- Screen bezel -->
          <rect x="-26" y="-14" width="52" height="28" rx="2" ${f}/>
          <!-- Display area -->
          <rect x="-24" y="-12" width="48" height="22" rx="1" fill="${color}" fill-opacity="0.55"/>
          <!-- Smart-TV diagonal play accent -->
          <path d="M -6 -4 L 4 1 L -6 6 Z" fill="${color}" fill-opacity="0.85"/>
          <!-- Stand neck -->
          <rect x="-3" y="14" width="6" height="4" fill="${color}" fill-opacity="0.5"/>
          <!-- Stand base -->
          <rect x="-16" y="18" width="32" height="3" rx="1" fill="${color}"/>
          <!-- Power LED -->
          <circle cx="18" cy="9" r="1" fill="${color}"/>
        </g>`;
      // ── v4.49.0: WAN transport + storage device icons ──
      case 'satellite':
        return `<g transform="translate(0,-6)">
          <!-- Satellite body (central bus) -->
          <rect x="-8" y="-8" width="16" height="14" rx="2" ${f}/>
          <!-- Solar panels (left + right wings) -->
          <rect x="-26" y="-5" width="16" height="8" rx="1" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-width="1.5"/>
          <line x1="-22" y1="-5" x2="-22" y2="3" stroke="${color}" stroke-width="1"/>
          <line x1="-18" y1="-5" x2="-18" y2="3" stroke="${color}" stroke-width="1"/>
          <rect x="10" y="-5" width="16" height="8" rx="1" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-width="1.5"/>
          <line x1="14" y1="-5" x2="14" y2="3" stroke="${color}" stroke-width="1"/>
          <line x1="18" y1="-5" x2="18" y2="3" stroke="${color}" stroke-width="1"/>
          <!-- Dish antenna pointing down -->
          <path d="M -5 7 A 5 3 0 0 0 5 7 L 3 11 L -3 11 Z" ${f}/>
          <circle cx="0" cy="13" r="1.2" fill="${color}"/>
          <!-- Signal arc to ground -->
          <path d="M -9 18 Q 0 22 9 18" ${s} stroke-dasharray="2 2" fill="none"/>
        </g>`;
      case 'cell-tower':
        return `<g transform="translate(0,-6)">
          <!-- Tower base (triangular truss) -->
          <path d="M -8 18 L -2 -8 L 2 -8 L 8 18 Z" ${f}/>
          <!-- Cross-bars -->
          <line x1="-6" y1="10" x2="6" y2="10" ${s}/>
          <line x1="-5" y1="4" x2="5" y2="4" ${s}/>
          <line x1="-3.5" y1="-2" x2="3.5" y2="-2" ${s}/>
          <!-- Antenna array on top (3 panels, decreasing width) -->
          <rect x="-10" y="-11" width="20" height="2" rx="0.5" fill="${color}"/>
          <rect x="-8" y="-15" width="16" height="2" rx="0.5" fill="${color}"/>
          <rect x="-6" y="-19" width="12" height="2" rx="0.5" fill="${color}"/>
          <!-- Radio signal arcs (left + right) -->
          <path d="M -18 -15 A 12 12 0 0 1 -12 -22" ${s}/>
          <path d="M 18 -15 A 12 12 0 0 0 12 -22" ${s}/>
          <path d="M -14 -11 A 8 8 0 0 1 -10 -17" ${s}/>
          <path d="M 14 -11 A 8 8 0 0 0 10 -17" ${s}/>
        </g>`;
      case 'modem':
        return `<g transform="translate(0,-8)">
          <!-- Modem body (small box, less slim than router) -->
          <rect x="-18" y="-6" width="36" height="18" rx="3" ${f}/>
          <!-- LED indicator row -->
          <circle cx="-12" cy="-1" r="1.8" fill="${color}"/>
          <circle cx="-4" cy="-1" r="1.8" fill="${color}" fill-opacity="0.8"/>
          <circle cx="4" cy="-1" r="1.8" fill="${color}" fill-opacity="0.6"/>
          <circle cx="12" cy="-1" r="1.8" fill="${color}" fill-opacity="0.4"/>
          <!-- Status LED (upper right corner) -->
          <circle cx="14" cy="-8" r="1.3" fill="${color}"/>
          <!-- Rear port line + 2 port rectangles -->
          <line x1="-16" y1="7" x2="16" y2="7" ${s}/>
          <rect x="-14" y="10" width="5" height="2" fill="${color}"/>
          <rect x="9" y="10" width="5" height="2" fill="${color}"/>
          <!-- Short antenna stub (indicates wireless-capable combo unit) -->
          <line x1="12" y1="-6" x2="12" y2="-14" ${s}/>
          <circle cx="12" cy="-14" r="1.2" fill="${color}"/>
        </g>`;
      case 'san-array':
        return `<g transform="translate(0,-10)">
          <!-- Array chassis (tall rack unit) -->
          <rect x="-18" y="-16" width="36" height="32" rx="2" ${f}/>
          <!-- 4 drive-bay slots stacked vertically -->
          <rect x="-15" y="-13" width="30" height="5" rx="1" fill="${color}" fill-opacity="0.45"/>
          <rect x="-15" y="-6.5" width="30" height="5" rx="1" fill="${color}" fill-opacity="0.45"/>
          <rect x="-15" y="0" width="30" height="5" rx="1" fill="${color}" fill-opacity="0.45"/>
          <rect x="-15" y="6.5" width="30" height="5" rx="1" fill="${color}" fill-opacity="0.45"/>
          <!-- Drive activity LEDs (left edge of each bay) -->
          <circle cx="-12" cy="-10.5" r="0.9" fill="${color}"/>
          <circle cx="-12" cy="-4" r="0.9" fill="${color}"/>
          <circle cx="-12" cy="2.5" r="0.9" fill="${color}"/>
          <circle cx="-12" cy="9" r="0.9" fill="${color}"/>
          <!-- Drive handle notches (right edge) -->
          <rect x="12" y="-12" width="2" height="3" fill="${color}"/>
          <rect x="12" y="-5.5" width="2" height="3" fill="${color}"/>
          <rect x="12" y="1" width="2" height="3" fill="${color}"/>
          <rect x="12" y="7.5" width="2" height="3" fill="${color}"/>
        </g>`;
      default:
        return `<circle r="18" ${f}/>`;
    }
  }
  
  // Edge-intersection helper: from device center (cx,cy) toward target (tx,ty),
  // return the point where the ray hits the device's rect edge (halfW x halfH).
  function tbEdgePoint(cx, cy, tx, ty, halfW, halfH) {
    const dx = tx - cx, dy = ty - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (absDx * halfH > absDy * halfW) {
      const sign = dx > 0 ? 1 : -1;
      return { x: cx + sign * halfW, y: cy + dy * halfW / absDx };
    } else {
      const sign = dy > 0 ? 1 : -1;
      return { x: cx + dx * halfH / absDy, y: cy + sign * halfH };
    }
  }
  
  // Topology builder state (prefixed tb* to avoid collision with PBQ topoDevices).
  let tbState = { id: null, name: 'Untitled', devices: [], cables: [], created: 0, updated: 0 };
  let tbSelectedId = null;        // currently selected device id OR cable id
  let tbPendingCableFrom = null;  // device id of first click when wiring
  let tbDragging = null;          // { id, offsetX, offsetY } while dragging a placed device
  let tbPaletteDrag = null;       // { type } while dragging from palette
  let tbMobileOverride = false;   // user hit "Open Anyway"
  
  // Public entry point wired to the menu button.
  function openTopologyBuilder() {
    // Mobile nudge check
    const nudge = document.getElementById('tb-mobile-nudge');
    const main = document.getElementById('tb-main');
    const isNarrow = window.innerWidth < 900;
    if (isNarrow && !tbMobileOverride) {
      nudge.classList.remove('is-hidden');
      main.classList.add('is-hidden');
      return;
    }
    nudge.classList.add('is-hidden');
    main.classList.remove('is-hidden');
  
    // Load draft if present, else start fresh
    const draft = tbLoadDraft();
    tbState = draft || tbNewState();
  
    tbRenderPalette();
    tbRenderCanvas();
    tbRefreshLoadSelect();
    tbRenderScenarioPanel();
    tbUpdateStatus('Drag a device from the palette \u2192');
    tbUpdateDeviceCount();
    tbAttachCanvasHandlers();
    tbAttachKeyHandler();
    // v4.78.0: surface scenario recommendation matched to weak topics
    if (typeof renderTopologyRecommendation === 'function') renderTopologyRecommendation();
    // v4.54.5: 3-column layout \u2014 render right pane (always-visible scenarios)
    if (typeof tbRenderV3ScenariosList === 'function') tbRenderV3ScenariosList();
    // v4.54.6: inspector renders into floating popup (#tb-inspector-pop body)
    if (typeof tbRenderV3Inspector === 'function') tbRenderV3Inspector();
    if (typeof tbBindInspectorPopDrag === 'function') tbBindInspectorPopDrag();
    // v4.60.0: bind ESC-to-close for the Live Protocol Inspector
    if (typeof tbBindInspectorKeydown === 'function') tbBindInspectorKeydown();
    // v4.60.1: restore collapsed state of the side panes (palette + scenarios)
    if (typeof tbInitPaneCollapseState === 'function') tbInitPaneCollapseState();
    // v4.62.1: bind drag for the Per-Hop Trace panel (drag by head)
    if (typeof tbBindTracePanelDrag === 'function') tbBindTracePanelDrag();
    // v4.54.6: bind canvas pan/zoom handlers + reset to default zoomed-in view
    if (typeof tbBindCanvasPanZoom === 'function') tbBindCanvasPanZoom();
    if (typeof tbZoomReset === 'function') tbZoomReset();
    // v4.54.7: bind drag for the full-config floating popup
    if (typeof tbBindConfigPanelDrag === 'function') tbBindConfigPanelDrag();
    // Always show sim toolbar stub (kept for compat)
    document.getElementById('tb-sim-toolbar')?.classList.remove('is-hidden');
    // Auto-collapse intro banner after first visit
    tbAutoCollapseIntroHowto();
    // Start ambient packet animation
    if (typeof tbStartAmbient === 'function') tbStartAmbient();
  }
  
  function tbForceOpen() {
    tbMobileOverride = true;
    openTopologyBuilder();
  }
  
  // Auto-collapse intro banner + how-to strip for returning users.
  // Intro: collapses after first visit (localStorage flag).
  // How-to: collapses if user has already placed a device (draft has devices).
  function tbAutoCollapseIntroHowto() {
    const introEl = document.getElementById('tb-intro-details');
    const howtoEl = document.getElementById('tb-howto-details');
    const introSeen = localStorage.getItem(STORAGE.TB_INTRO_SEEN);
    if (introEl) {
      if (introSeen) {
        introEl.removeAttribute('open');
      } else {
        introEl.setAttribute('open', '');
        localStorage.setItem(STORAGE.TB_INTRO_SEEN, '1');
      }
    }
    if (howtoEl) {
      // v4.54.7: always collapsed by default \u2014 user explicitly asked for this
      // because the how-to cards were pushing the canvas far down the page and
      // in-canvas pill toolbar now communicates the workflow more directly.
      howtoEl.removeAttribute('open');
    }
    // v4.54.7: also ensure the new legacy-toolbar <details> stays collapsed by
    // default. The in-canvas pill toolbar handles primary actions; this drawer
    // is for Scenario dropdown / Save+Load / AI Generate / Fix.
    const toolbarEl = document.getElementById('tb-toolbar-details');
    if (toolbarEl) toolbarEl.removeAttribute('open');
  }
  
  function tbNewState() {
    return { id: 'topo_' + Date.now(), name: 'Untitled', devices: [], cables: [], created: Date.now(), updated: Date.now() };
  }
  
  // ── Palette ──
  // v4.99.74: clean monoline palette icons faithful to the locked
  // netplus-network-builder mockup (viewBox 0 0 24 24, stroke=currentColor,
  // fill=none). PALETTE-ONLY — canvas device nodes still use tbDeviceIcon,
  // untouched. The mockup's exact icons for the devices it shows; mockup-
  // consistent monoline for the rest. Zero behaviour change (drag/data
  // preserved by tbRenderPalette); this only swaps the glyph art.
  function tbPaletteLineIcon(type) {
    const I = {
      router: '<rect x="3" y="9" width="18" height="6" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7 12h.01M11 12h.01M15 12h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      switch: '<rect x="3" y="9" width="18" height="6" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M6 9V6M10 9V6M14 9V6M18 9V6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      'dmz-switch': '<rect x="3" y="9" width="18" height="6" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 9V4M9 6l3-2 3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      'isp-router': '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      modem: '<rect x="4" y="10" width="16" height="7" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 7v3M16 7v3M8 14h.01M11 14h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      'cell-tower': '<path d="M12 4v9M9 16a3 3 0 0 1 6 0M6 18a6 6 0 0 1 12 0M9 21h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      satellite: '<path d="M4 14l6-6 4 4-6 6-4-4zM14 8l3-3M10 18l-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      cloud: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke="currentColor" stroke-width="1.4"/>',
      vpc: '<rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"/>',
      'cloud-subnet': '<rect x="5" y="8" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M9 8V6h6v2" stroke="currentColor" stroke-width="1.6"/>',
      igw: '<path d="M6 16a4 4 0 0 1 1-7.8A5 5 0 0 1 17 8a3.5 3.5 0 0 1 1 6.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 12v6M9 15l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      'nat-gw': '<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      tgw: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      vpg: '<rect x="6" y="10" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" stroke-width="1.6"/>',
      'onprem-dc': '<path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      'sase-edge': '<path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="11" r="2" stroke="currentColor" stroke-width="1.5"/>',
      pc: '<rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M9 21h6M12 17v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      laptop: '<rect x="5" y="6" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M3 19h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      smartphone: '<rect x="8" y="3" width="8" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M11 18h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      'game-console': '<rect x="3" y="9" width="18" height="9" rx="4" stroke="currentColor" stroke-width="1.6"/><path d="M7 12v3M5.5 13.5h3M15 13h.01M17 15h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      'smart-tv': '<rect x="3" y="5" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 20h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      printer: '<path d="M7 9V4h10v5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><rect x="4" y="9" width="16" height="7" rx="2" stroke="currentColor" stroke-width="1.6"/><rect x="7" y="14" width="10" height="6" stroke="currentColor" stroke-width="1.6"/>',
      voip: '<path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
      iot: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M12 5v2M12 17v2M5 12h2M17 12h2M7.5 7.5l1.4 1.4M15.1 15.1l1.4 1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      server: '<rect x="5" y="3" width="14" height="8" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="5" y="13" width="14" height="8" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M8 7h.01M8 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      'dns-server': '<rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 12h7" stroke="currentColor" stroke-width="1.4"/>',
      'san-array': '<rect x="4" y="5" width="16" height="5" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="4" y="13" width="16" height="5" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M16 7.5h.01M16 15.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      'public-web': '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" stroke="currentColor" stroke-width="1.4"/>',
      'public-file': '<path d="M7 3h7l4 4v14H7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3v4h4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
      'public-cloud': '<path d="M7 18a4 4 0 0 1-1-7.9A5 5 0 0 1 16 8a3.5 3.5 0 0 1 1 6.9z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
      wap: '<path d="M5 12a10 10 0 0 1 14 0M8 15a6 6 0 0 1 8 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="18" r="1.4" fill="currentColor"/>',
      wlc: '<rect x="4" y="7" width="16" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 11a5 5 0 0 1 8 0M10 13.5a2.5 2.5 0 0 1 4 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      firewall: '<rect x="4" y="5" width="16" height="14" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M4 10h16M4 14h16M10 5v5M14 10v4M10 14v5" stroke="currentColor" stroke-width="1.4"/>',
      'load-balancer': '<circle cx="12" cy="5" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="5" cy="19" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="19" cy="19" r="2" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v3M12 10c0 3-7 3-7 7M12 10c0 3 7 3 7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      ids: '<path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 11.5c1.2-2 5.8-2 7 0c-1.2 2-5.8 2-7 0z" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="11.5" r="1" fill="currentColor"/>'
    };
    return I[type] || '<rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 10h8M8 14h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
  }

  function tbRenderPalette() {
    const root = document.getElementById('tb-palette-items');
    if (!root) return;
    // Render devices grouped by category
    root.innerHTML = TB_PALETTE_GROUPS.map(group => {
      const items = group.types
        .filter(type => TB_DEVICE_TYPES[type])
        .map(type => {
          const meta = TB_DEVICE_TYPES[type];
          return `<div class="tb-palette-item" data-tb-type="${type}" draggable="true"
           style="--tb-device-color:${meta.color}">
        <svg class="tb-palette-icon-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          ${tbPaletteLineIcon(type)}
        </svg>
        <div class="tb-palette-label">${escHtml(meta.label)}</div>
      </div>`;
        }).join('');
      return `<div class="tb-palette-group-head">${escHtml(group.label)}</div>${items}`;
    }).join('');
  
    // Cables sub-panel: selectable chips so new cables adopt the chosen type.
    const cableRoot = document.getElementById('tb-palette-cables');
    if (cableRoot) {
      cableRoot.innerHTML = Object.entries(TB_CABLE_TYPES).map(([type, meta]) => {
        const active = tbSelectedCableType === type ? ' tb-cable-chip-active' : '';
        const dashStyle = meta.dash ? `stroke-dasharray:${meta.dash};` : '';
        return `<button type="button" class="tb-cable-chip${active}" data-tb-cable-type="${type}"
                        onclick="tbSelectCableType('${type}')"
                        style="--tb-cable-color:${meta.color}"
                        aria-label="Select ${escHtml(meta.label)} cable">
          <svg class="tb-cable-chip-swatch" viewBox="0 0 40 10" width="40" height="10" aria-hidden="true">
            <line x1="2" y1="5" x2="38" y2="5" stroke="${meta.color}" stroke-width="${Math.min(meta.width, 7)}" stroke-linecap="round" style="${dashStyle}"/>
          </svg>
          <span class="tb-cable-chip-label">${escHtml(meta.label)}</span>
        </button>`;
      }).join('');
    }
    // HTML5 drag events
    root.querySelectorAll('.tb-palette-item').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        const type = el.getAttribute('data-tb-type');
        tbPaletteDrag = { type };
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', type);
        el.classList.add('tb-palette-item-dragging');
      });
      el.addEventListener('dragend', () => {
        tbPaletteDrag = null;
        el.classList.remove('tb-palette-item-dragging');
      });
    });
  }
  
  // ── Canvas rendering ──
  function tbRenderCanvas() {
    const devLayer = document.getElementById('tb-devices-layer');
    const cabLayer = document.getElementById('tb-cables-layer');
    const emptyHint = document.getElementById('tb-empty-hint');
    if (!devLayer || !cabLayer) return;
  
    // Cables first (drawn under devices). Edge-to-edge, not center-to-center,
    // so the stroke isn't hidden behind the device rect. Devices shrank in
    // v4.19 so 30 fit comfortably — HALF_W/HALF_H shrank with them.
    const HALF_W = 48, HALF_H = 36;
    cabLayer.innerHTML = tbState.cables.map(c => {
      const from = tbState.devices.find(d => d.id === c.from);
      const to = tbState.devices.find(d => d.id === c.to);
      if (!from || !to) return '';
      const selected = tbSelectedId === c.id ? ' tb-cable-selected' : '';
      const p1 = tbEdgePoint(from.x, from.y, to.x, to.y, HALF_W, HALF_H);
      const p2 = tbEdgePoint(to.x, to.y, from.x, from.y, HALF_W, HALF_H);
      const cableType = c.type || 'cat6';
      const meta = TB_CABLE_TYPES[cableType] || TB_CABLE_TYPES.cat6;
      // Slight downward drape via quadratic curve — cables sag a bit.
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2 + 16;
      const dAttr = `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`;
      const dashAttr = meta.dash ? ` stroke-dasharray="${meta.dash}"` : '';
      // Cable status: check if both ends have IPs on connected interfaces
      let cableStatus = '';
      const fromIfc = from.interfaces?.find(i => i.cableId === c.id);
      const toIfc = to.interfaces?.find(i => i.cableId === c.id);
      const fromHasIp = fromIfc?.ip || from.type === 'switch' || from.type === 'dmz-switch' || from.type === 'cloud';
      const toHasIp = toIfc?.ip || to.type === 'switch' || to.type === 'dmz-switch' || to.type === 'cloud';
      if (fromHasIp && toHasIp) cableStatus = ' tb-cable-healthy';
      else if (fromHasIp || toHasIp) cableStatus = ' tb-cable-partial';
      // Three-layer render: dark sheath (shadow), inner colored conductor,
      // and a fat transparent hitbox on top so clicks land easily even on a
      // thin curved path. Only the hitbox carries the click handler.
      return `<path class="tb-cable-sheath" d="${dAttr}" stroke="#0b1020" stroke-width="${meta.width + 5}" stroke-linecap="round" fill="none" opacity="0.7" pointer-events="none" />
  <path class="tb-cable tb-cable-${cableType}${selected}${cableStatus}" d="${dAttr}" stroke="${meta.color}" stroke-width="${meta.width}" stroke-linecap="round" fill="none"${dashAttr} pointer-events="none" />
  <path class="tb-cable-hit" data-tb-cable="${c.id}" d="${dAttr}" stroke="transparent" stroke-width="20" stroke-linecap="round" fill="none" />`;
    }).join('');
  
    // Devices
    devLayer.innerHTML = tbState.devices.map(d => {
      const meta = TB_DEVICE_TYPES[d.type];
      if (!meta) return '';
      const selected = tbSelectedId === d.id ? ' tb-device-selected' : '';
      const pending = tbPendingCableFrom === d.id ? ' tb-device-pending' : '';
      const labTarget = (tbActiveLab?._highlightIds?.includes(d.id)) ? ' tb-device-lab-target' : '';
      // Device health badge — shows config status
      const isEndpoint = ['pc','laptop','smartphone','game-console','smart-tv','server','printer','voip','iot'].includes(d.type);
      const isRoutable = ['router','firewall','isp-router'].includes(d.type);
      const isSwitch = d.type === 'switch' || d.type === 'dmz-switch';
      const hasCable = tbState.cables.some(c => c.from === d.id || c.to === d.id);
      const hasIp = d.interfaces?.some(i => i.ip);
      const hasGw = d.interfaces?.some(i => i.gateway);
      let healthColor = '';
      if (hasCable && ((isEndpoint && hasIp && hasGw) || (isRoutable && hasIp) || (isSwitch && hasCable) || (!isEndpoint && !isRoutable && !isSwitch))) healthColor = '#22c55e';
      else if (hasCable && (hasIp || isSwitch)) healthColor = '#f59e0b';
      else if (hasCable) healthColor = '#ef4444';
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const labelFill = isLight ? '#1e293b' : '#e2e8f0';
      const badgeStroke = isLight ? '#ffffff' : '#0f172a';
      const healthBadge = healthColor ? `<circle cx="40" cy="-28" r="5" fill="${healthColor}" stroke="${badgeStroke}" stroke-width="1.5" class="tb-health-badge"/>` : '';
      return `
        <g class="tb-device${selected}${pending}${labTarget}" data-tb-device="${d.id}" transform="translate(${d.x}, ${d.y})">
          <rect class="tb-device-bg" x="-48" y="-36" width="96" height="72" rx="10" ry="10"
                fill="${meta.color}" fill-opacity="${isLight ? '0.12' : '0.18'}" stroke="${meta.color}" stroke-width="2"/>
          <g transform="scale(0.72) translate(0, 4)">${tbDeviceIcon(d.type, meta.color)}</g>
          <text class="tb-device-label" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="${labelFill}">${escHtml(d.hostname || meta.label)}</text>
          ${healthBadge}
        </g>
      `;
    }).join('');
  
    // v4.47.2: empty-state content is now dynamic (Free Build vs Scenario
    // loaded) — rendered by tbRenderEmptyHint() which also handles the
    // is-hidden toggle based on device count. Single source of truth.
    tbRenderEmptyHint();
    // Keep the wiring overlay in sync with pending state every render.
    tbUpdateWireOverlay();
  
    // Attach per-device click/drag handlers (inline for simplicity)
    devLayer.querySelectorAll('.tb-device').forEach(g => {
      const id = g.getAttribute('data-tb-device');
      g.addEventListener('mousedown', (e) => tbOnDeviceMouseDown(e, id));
      g.addEventListener('click', (e) => { e.stopPropagation(); });
    });
    // Click handlers bind to the fat transparent hitbox, not the visible
    // colored conductor, so thin stroke paths are easy to target.
    cabLayer.querySelectorAll('.tb-cable-hit').forEach(hit => {
      const id = hit.getAttribute('data-tb-cable');
      hit.style.cursor = 'pointer';
      hit.addEventListener('click', (e) => {
        e.stopPropagation();
        tbSelectedId = id;
        tbRenderCanvas();
        tbUpdateStatus('Cable selected. Press Del/Backspace to remove.');
      });
    });
    // Double-click detection is handled inside tbOnDeviceMouseDown (timestamp-based)
  }
  
  // ── Canvas mouse/drop/click handlers ──
  let tbCanvasHandlersAttached = false;
  function tbAttachCanvasHandlers() {
    if (tbCanvasHandlersAttached) return;
    tbCanvasHandlersAttached = true;
    const svg = document.getElementById('tb-canvas');
    const wrap = document.querySelector('.tb-canvas-wrap');
    if (!svg || !wrap) return;
  
    // HTML5 drop from palette
    wrap.addEventListener('dragover', (e) => {
      if (tbPaletteDrag) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
    });
    wrap.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!tbPaletteDrag) return;
      const { x, y } = tbClientToSvg(svg, e.clientX, e.clientY);
      tbAddDevice(tbPaletteDrag.type, x, y);
      tbPaletteDrag = null;
    });
  
    // Click empty canvas → deselect
    svg.addEventListener('click', (e) => {
      if (e.target.tagName === 'rect' || e.target.tagName === 'svg') {
        tbSelectedId = null;
        tbPendingCableFrom = null;
        tbRenderCanvas();
        tbUpdateStatus('Drag a device from the palette \u2192');
      }
    });
  
    // Window-level mousemove/up for dragging placed devices
    window.addEventListener('mousemove', tbOnMouseMove);
    window.addEventListener('mouseup', tbOnMouseUp);
  }
  
  function tbClientToSvg(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const { x, y } = pt.matrixTransform(ctm.inverse());
    return { x: Math.max(75, Math.min(TB_CANVAS_W - 75, x)), y: Math.max(60, Math.min(TB_CANVAS_H - 60, y)) };
  }
  
  function tbAddDevice(type, x, y) {
    if (tbState.devices.length >= TB_MAX_DEVICES) {
      showErrorToast(`Device cap reached (${TB_MAX_DEVICES}). Delete one to add more.`);
      return;
    }
    const id = 'd_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const hostname = tbAutoHostname(type, tbState.devices);
    const interfaces = tbGenerateInterfaces(type, id);
    const vlanDb = type.indexOf('switch') >= 0 ? [{ id: 1, name: 'default' }] : [];
    tbState.devices.push({
      id, type, x: Math.round(x), y: Math.round(y),
      hostname,
      interfaces,
      routingTable: [],
      arpTable: [],
      macTable: [],
      vlanDb,
      dhcpServer: null,
      dhcpRelay: null,
      acls: [],
    });
    tbState.updated = Date.now();
    tbRenderCanvas();
    tbUpdateDeviceCount();
    tbSaveDraft();
  }
  
  let tbLastClickDevId = null;
  let tbLastClickTime = 0;
  
  function tbOnDeviceMouseDown(e, id) {
    e.stopPropagation();
    // Detect double-click manually (native dblclick is unreliable because
    // tbRenderCanvas destroys + recreates DOM nodes between clicks)
    const now = Date.now();
    if (tbLastClickDevId === id && now - tbLastClickTime < DOUBLE_CLICK_MS) {
      tbLastClickDevId = null;
      tbLastClickTime = 0;
      tbDragging = null;
      tbOpenConfigPanel(id);
      return;
    }
    tbLastClickDevId = id;
    tbLastClickTime = now;
  
    const dev = tbState.devices.find(d => d.id === id);
    if (!dev) return;
  
    // Cable wiring flow: first click sets pending, second click completes
    if (tbPendingCableFrom && tbPendingCableFrom !== id) {
      tbAddCable(tbPendingCableFrom, id);
      tbPendingCableFrom = null;
      tbSelectedId = null;
      tbRenderCanvas();
      return;
    }
  
    // Otherwise: start drag (on mousedown) + queue potential "start cable" on click
    const svg = document.getElementById('tb-canvas');
    const { x: sx, y: sy } = tbClientToSvg(svg, e.clientX, e.clientY);
    tbDragging = { id, offsetX: sx - dev.x, offsetY: sy - dev.y, moved: false, startX: dev.x, startY: dev.y };
    tbSelectedId = id;
    // v4.54.5: sync the right-pane inspector with the selected device
    if (typeof tbSelectDeviceForInspector === 'function') tbSelectDeviceForInspector(id);
    tbRenderCanvas();
  }
  
  function tbOnMouseMove(e) {
    if (!tbDragging) return;
    const svg = document.getElementById('tb-canvas');
    if (!svg) return;
    const { x, y } = tbClientToSvg(svg, e.clientX, e.clientY);
    const dev = tbState.devices.find(d => d.id === tbDragging.id);
    if (!dev) return;
    const nx = Math.round(x - tbDragging.offsetX);
    const ny = Math.round(y - tbDragging.offsetY);
    if (Math.abs(nx - tbDragging.startX) > 3 || Math.abs(ny - tbDragging.startY) > 3) tbDragging.moved = true;
    dev.x = Math.max(55, Math.min(TB_CANVAS_W - 55, nx));
    dev.y = Math.max(45, Math.min(TB_CANVAS_H - 45, ny));
    tbRenderCanvas();
  }
  
  function tbOnMouseUp(e) {
    if (!tbDragging) return;
    const { id, moved } = tbDragging;
    tbDragging = null;
    if (moved) {
      tbState.updated = Date.now();
      tbSaveDraft();
      tbUpdateStatus('Moved. Click another device to wire a cable.');
    } else {
      // Treat as a click → start cable wiring from this device
      if (tbPendingCableFrom === id) {
        tbPendingCableFrom = null;
        tbUpdateStatus('Cable cancelled.');
      } else {
        tbPendingCableFrom = id;
        tbUpdateStatus('Click a second device to draw the cable, or click again to cancel.');
      }
      tbRenderCanvas();
    }
  }
  
  function tbAddCable(fromId, toId) {
    // Prevent self-loops and duplicates
    if (fromId === toId) return;
    const dup = tbState.cables.find(c =>
      (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId));
    if (dup) {
      showErrorToast('Those devices are already cabled.');
      return;
    }
    // Find available interfaces on each device
    const fromDev = tbState.devices.find(d => d.id === fromId);
    const toDev = tbState.devices.find(d => d.id === toId);
    const fromIface = fromDev && fromDev.interfaces ? fromDev.interfaces.find(ifc => !ifc.cableId) : null;
    const toIface = toDev && toDev.interfaces ? toDev.interfaces.find(ifc => !ifc.cableId) : null;
    if (fromDev && fromDev.interfaces && !fromIface) {
      showErrorToast(`${fromDev.hostname || TB_DEVICE_TYPES[fromDev.type].label} has no free ports.`);
      return;
    }
    if (toDev && toDev.interfaces && !toIface) {
      showErrorToast(`${toDev.hostname || TB_DEVICE_TYPES[toDev.type].label} has no free ports.`);
      return;
    }
    const id = 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const cableType = tbSelectedCableType || 'cat6';
    if (fromIface) fromIface.cableId = id;
    if (toIface) toIface.cableId = id;
    tbState.cables.push({
      id, from: fromId, to: toId, type: cableType,
      fromIface: fromIface ? fromIface.name : null,
      toIface: toIface ? toIface.name : null,
    });
    tbState.updated = Date.now();
    const label = (TB_CABLE_TYPES[cableType] || {}).label || 'Cat6';
    tbUpdateStatus(`${label} cable drawn (${fromIface ? fromIface.name : '?'} → ${toIface ? toIface.name : '?'}). Keep building.`);
    tbSaveDraft();
  }
  
  // ── Keyboard: Delete / Backspace / Escape ──
  let tbKeyHandlerAttached = false;
  function tbAttachKeyHandler() {
    if (tbKeyHandlerAttached) return;
    tbKeyHandlerAttached = true;
    window.addEventListener('keydown', (e) => {
      const page = document.getElementById('page-topology-builder');
      if (!page || !page.classList.contains('active')) return;
      // Don't hijack if user is typing in an input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (tbSelectedId) { e.preventDefault(); tbDeleteSelected(); }
      } else if (e.key === 'Escape') {
        tbSelectedId = null;
        tbPendingCableFrom = null;
        tbRenderCanvas();
        tbUpdateStatus('Cancelled.');
      }
    });
  }
  
  // Release interface bindings when a cable is removed.
  function tbUnbindCable(cable) {
    if (!cable) return;
    [cable.from, cable.to].forEach(devId => {
      const dev = tbState.devices.find(d => d.id === devId);
      if (dev && dev.interfaces) {
        dev.interfaces.forEach(ifc => { if (ifc.cableId === cable.id) ifc.cableId = null; });
      }
    });
  }
  
  function tbDeleteSelected() {
    if (!tbSelectedId) {
      tbUpdateStatus('Nothing selected.');
      return;
    }
    // Device?
    const devIdx = tbState.devices.findIndex(d => d.id === tbSelectedId);
    if (devIdx >= 0) {
      const id = tbSelectedId;
      // Unbind interfaces on connected devices before removing cables
      tbState.cables.filter(c => c.from === id || c.to === id).forEach(c => tbUnbindCable(c));
      tbState.devices.splice(devIdx, 1);
      tbState.cables = tbState.cables.filter(c => c.from !== id && c.to !== id);
      tbSelectedId = null;
      tbState.updated = Date.now();
      tbRenderCanvas();
      tbUpdateDeviceCount();
      tbSaveDraft();
      tbUpdateStatus('Device removed.');
      return;
    }
    // Cable?
    const cabIdx = tbState.cables.findIndex(c => c.id === tbSelectedId);
    if (cabIdx >= 0) {
      tbUnbindCable(tbState.cables[cabIdx]);
      tbState.cables.splice(cabIdx, 1);
      tbSelectedId = null;
      tbState.updated = Date.now();
      tbRenderCanvas();
      tbSaveDraft();
      tbUpdateStatus('Cable removed.');
    }
  }
  
  // ── Save / load / draft ──
  function tbLoadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE.TOPOLOGY_DRAFT);
      return raw ? tbMigrateState(JSON.parse(raw)) : null;
    } catch (_) { return null; }
  }
  function tbSaveDraft() {
    try { localStorage.setItem(STORAGE.TOPOLOGY_DRAFT, JSON.stringify(tbState)); _cloudFlush(STORAGE.TOPOLOGY_DRAFT); } catch (_) {}
    // Live lab step validation — re-evaluate the current step every time state changes
    if (tbActiveLab) tbRenderLabStep();
    // Ambient packets: refresh cable health on every state change
    if (typeof tbRefreshAmbientHealth === 'function') tbRefreshAmbientHealth();
    // Fix challenge: check if user fixed a fault
    if (typeof tbCheckFixProgress === 'function' && tbFixChallenge && !tbFixChallenge.completed) tbCheckFixProgress();
    // v4.60.0 Live Protocol Inspector: refresh the floating inspector when
    // state mutates (ARP learned, MAC learned, etc.) so rows flash live as
    // packets resolve. Only renders when the popup is actually visible to
    // avoid wasted work on every ambient tick.
    try {
      const pop = document.getElementById('tb-inspector-pop');
      if (pop && !pop.hidden && tbV3InspectedDeviceId) {
        tbRenderV3Inspector();
      }
    } catch (_) {}
    // v4.62.0 STP Visualisation: recompute the STP state on every mutation
    // (new switch, cable add/remove, priority change) so port roles + blocked
    // state + root crown stay in sync automatically. Affected switches pulse
    // for 800ms during reconvergence so the change is visible.
    try { if (typeof tbRefreshStpState === 'function') tbRefreshStpState(); } catch (_) {}
  }
  function tbLoadAllSaves() {
    try {
      const raw = localStorage.getItem(STORAGE.TOPOLOGIES);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }
  function tbPersistAllSaves(list) {
    try { localStorage.setItem(STORAGE.TOPOLOGIES, JSON.stringify(list)); _cloudFlush(STORAGE.TOPOLOGIES); } catch (_) {}
  }
  
  function tbSaveTopology() {
    if (tbState.devices.length === 0) {
      showErrorToast('Add at least one device before saving.');
      return;
    }
    const name = prompt('Name this topology:', tbState.name === 'Untitled' ? '' : tbState.name);
    if (name === null) return;
    tbState.name = name.trim() || 'Untitled';
    tbState.updated = Date.now();
    let saves = tbLoadAllSaves();
    // Upsert by id
    const existing = saves.findIndex(s => s.id === tbState.id);
    if (existing >= 0) {
      saves[existing] = { ...tbState };
    } else {
      saves.push({ ...tbState });
      // FIFO evict oldest if over cap
      if (saves.length > TB_MAX_SAVES) {
        saves.sort((a, b) => (a.updated || 0) - (b.updated || 0));
        saves = saves.slice(-TB_MAX_SAVES);
      }
    }
    tbPersistAllSaves(saves);
    tbRefreshLoadSelect();
    tbUpdateStatus(`Saved \u201C${tbState.name}\u201D`);
  }
  
  function tbRefreshLoadSelect() {
    const sel = document.getElementById('tb-load-select');
    if (!sel) return;
    const saves = tbLoadAllSaves();
    sel.innerHTML = '<option value="">\u{1F4C2} Load\u2026</option>' +
      saves.map(s => `<option value="${s.id}">${escHtml(s.name)} (${s.devices.length}d)</option>`).join('');
  }
  
  function tbLoadTopology(id) {
    if (!id) return;
    const saves = tbLoadAllSaves();
    const found = saves.find(s => s.id === id);
    if (!found) return;
    tbState = tbMigrateState(JSON.parse(JSON.stringify(found)));
    tbSelectedId = null;
    tbPendingCableFrom = null;
    tbSaveDraft();
    tbRenderCanvas();
    tbUpdateDeviceCount();
    tbUpdateStatus(`Loaded \u201C${tbState.name}\u201D`);
    // Reset select so the same item can be reloaded
    const sel = document.getElementById('tb-load-select');
    if (sel) sel.value = '';
  }
  
  function tbNewTopology() {
    if (tbState.devices.length > 0) {
      if (!confirm('Discard the current topology and start fresh?')) return;
    }
    tbState = tbNewState();
    tbSelectedId = null;
    tbPendingCableFrom = null;
    tbSaveDraft();
    tbRenderCanvas();
    tbUpdateDeviceCount();
    tbUpdateStatus('New topology. Drag a device from the palette \u2192');
  }
  
  // Clear wipes devices + cables from the CURRENT topology but keeps its
  // id/name, unlike tbNewTopology which creates a fresh topology entirely.
  function tbClearCanvas() {
    if (tbState.devices.length === 0 && tbState.cables.length === 0) {
      tbUpdateStatus('Canvas is already empty.');
      return;
    }
    if (!confirm('Clear all devices and cables from this topology? The name will be kept.')) return;
    tbState.devices = [];
    tbState.cables = [];
    tbState.updated = Date.now();
    tbSelectedId = null;
    tbPendingCableFrom = null;
    tbSaveDraft();
    tbRenderCanvas();
    tbUpdateDeviceCount();
    tbUpdateStatus('Canvas cleared. Drag a device to start again.');
  }
  
  // ── Status / counter helpers ──
  function tbUpdateStatus(msg) {
    const el = document.getElementById('tb-status');
    if (el) el.textContent = msg;
    tbUpdateWireOverlay();
  }
  function tbUpdateDeviceCount() {
    const el = document.getElementById('tb-device-count');
    if (el) el.textContent = `${tbState.devices.length} / ${TB_MAX_DEVICES} devices`;
    // v4.54.4: also refresh the editorial canvas stats strip
    if (typeof tbRenderV2Stats === 'function') tbRenderV2Stats();
  }
  // v4.54.4: Editorial canvas stats strip. Renders at the bottom of the canvas
  // in monospace small-caps editorial style (matches prototype's .topo-stat-row).
  // Shows: N devices · N cables · N VLANs · scenario name. Updates on every
  // device/cable change via tbUpdateDeviceCount hook.
  function tbRenderV2Stats() {
    const el = document.getElementById('tb-v2-stats');
    if (!el) return;
    const deviceCount = (tbState && tbState.devices) ? tbState.devices.length : 0;
    const cableCount = (tbState && tbState.cables) ? tbState.cables.length : 0;
    // VLAN count: unique VLAN ids across all devices that have a vlanDb
    const vlanSet = new Set();
    (tbState && tbState.devices ? tbState.devices : []).forEach(d => {
      if (d.vlanDb) Object.keys(d.vlanDb).forEach(v => { if (v !== '1') vlanSet.add(v); });
    });
    const vlanCount = vlanSet.size;
    // Scenario label
    let scenLabel = 'Free Build';
    try {
      if (typeof tbSelectedScenario === 'string' && tbSelectedScenario) {
        const scen = (typeof TB_SCENARIOS !== 'undefined' && TB_SCENARIOS) ? TB_SCENARIOS.find(s => s.id === tbSelectedScenario) : null;
        if (scen && scen.title) scenLabel = scen.title;
      }
    } catch (_) {}
    // Build editorial-style inline list with middots
    const parts = [
      `<strong>${deviceCount}</strong> device${deviceCount === 1 ? '' : 's'}`,
      `<strong>${cableCount}</strong> cable${cableCount === 1 ? '' : 's'}`,
      vlanCount > 0 ? `<strong>${vlanCount}</strong> VLAN${vlanCount === 1 ? '' : 's'}` : null,
      `<em>${escHtml(scenLabel)}</em>`
    ].filter(Boolean);
    el.innerHTML = parts.join(' <span class="tb-v2-stat-sep">&middot;</span> ');
  }
  
  // ══════════════════════════════════════════
  // v4.54.5 \u2014 3-COLUMN TB: right-pane Scenarios + Inspector
  // v4.54.6 \u2014 categorised scenarios w/ subheaders + draggable popup inspector
  // ══════════════════════════════════════════
  // v4.54.5 introduced the 3-col layout. v4.54.6 refines it per user feedback:
  // scenarios now render with category subheaders + full text (no truncation),
  // and the inspector is a draggable transparent floating popup (no longer a
  // right-pane component) that pops up on device-click. Pan/zoom + pill toolbar
  // + 2-col palette are added in adjacent code (search "v4.54.6").
  
  // Render the compact scenarios list in the right pane, GROUPED by category
  // using TB_SCENARIO_CATEGORIES. Each item shows the scenario title (full
  // text, wraps if needed) + a device-count tag. Active scenario gets an
  // accent bg. Free Build is pinned at the top as a "Sandbox" group.
  function tbRenderV3ScenariosList() {
    const el = document.getElementById('tb-v3-scenarios-list');
    if (!el) return;
    if (typeof TB_SCENARIOS === 'undefined' || !Array.isArray(TB_SCENARIOS)) {
      el.innerHTML = '<div class="tb-v3-empty">No scenarios loaded.</div>';
      return;
    }
    const active = (typeof tbSelectedScenario === 'string') ? tbSelectedScenario : '';
    const esc = (typeof escHtml === 'function') ? escHtml : (s => s);
    const scenById = {};
    TB_SCENARIOS.forEach(s => { scenById[s.id] = s; });
  
    const renderItem = (s) => {
      if (!s) return '';
      const isActive = s.id === active;
      let tag = '';
      if (s.id === 'free' || s.id === 'free-build') {
        tag = 'open';
      } else if (typeof s.autoBuild === 'function') {
        try {
          const tmpState = (typeof tbNewState === 'function') ? tbNewState() : { devices: [], cables: [] };
          s.autoBuild(tmpState);
          tag = `${tmpState.devices.length} dev`;
        } catch (_) { tag = ''; }
      }
      const safeId = String(s.id).replace(/'/g, "\\'");
      return `<button type="button" class="tb-v3-scn${isActive ? ' tb-v3-scn-active' : ''}" data-scn-id="${safeId}" onclick="tbLoadScenarioWithBuild('${safeId}')" aria-pressed="${isActive ? 'true' : 'false'}">
        <span class="tb-v3-scn-title">${esc(s.title || s.id)}</span>
        ${tag ? `<span class="tb-v3-scn-tag">${tag}</span>` : ''}
      </button>`;
    };
  
    const sections = [];
    // Sandbox: Free Build pinned at the top. The TB Free Build scenario uses
    // id 'free' (not 'free-build' \u2014 that's the ACL builder's sandbox id).
    const free = scenById['free'] || scenById['free-build'];
    if (free) {
      sections.push(`<div class="tb-v3-scn-cat">
        <div class="tb-v3-scn-cat-head"><span class="tb-v3-scn-cat-ico">\u{1F3AF}</span><span class="tb-v3-scn-cat-name">Sandbox</span></div>
        <div class="tb-v3-scn-cat-body">${renderItem(free)}</div>
      </div>`);
    }
    // Categorised sections (use TB_SCENARIO_CATEGORIES if present)
    const cats = (typeof TB_SCENARIO_CATEGORIES !== 'undefined' && Array.isArray(TB_SCENARIO_CATEGORIES))
      ? TB_SCENARIO_CATEGORIES : [];
    cats.forEach(cat => {
      const items = (cat.ids || []).map(id => scenById[id]).filter(Boolean);
      if (items.length === 0) return;
      sections.push(`<div class="tb-v3-scn-cat">
        <div class="tb-v3-scn-cat-head">
          <span class="tb-v3-scn-cat-ico">${cat.icon || ''}</span>
          <span class="tb-v3-scn-cat-name">${esc(cat.name || '')}</span>
          <span class="tb-v3-scn-cat-count">${items.length}</span>
        </div>
        <div class="tb-v3-scn-cat-body">${items.map(renderItem).join('')}</div>
      </div>`);
    });
    // Defensive fallback: any scenario not covered by categories
    const covered = new Set(['free', 'free-build']);
    cats.forEach(c => (c.ids || []).forEach(id => covered.add(id)));
    const orphans = TB_SCENARIOS.filter(s => !covered.has(s.id));
    if (orphans.length > 0) {
      sections.push(`<div class="tb-v3-scn-cat">
        <div class="tb-v3-scn-cat-head"><span class="tb-v3-scn-cat-ico">\u{1F4DA}</span><span class="tb-v3-scn-cat-name">More</span></div>
        <div class="tb-v3-scn-cat-body">${orphans.map(renderItem).join('')}</div>
      </div>`);
    }
    el.innerHTML = sections.join('');
  }
  
  // Inspector render: read-only summary of the selected device. v4.54.6
  // renders into the floating popup (#tb-inspector-pop body) instead of a
  // right-pane card. The element id (#tb-v3-inspector) is unchanged so the
  // renderer below stays put; only the wrapper moved.
  let tbV3InspectedDeviceId = null;
  function tbSelectDeviceForInspector(deviceId) {
    tbV3InspectedDeviceId = deviceId || null;
    tbRenderV3Inspector();
    // v4.54.6: when a device is selected, surface the popup automatically.
    if (deviceId) tbInspectorPopOpen();
    // v4.65.0 Phase 3: selection drives the OSI button enabled state.
    if (typeof _tb3dUpdateOsiButtonEnabled === 'function') _tb3dUpdateOsiButtonEnabled();
  }
  // v4.54.6: floating popup show/hide + drag.
  function tbInspectorPopOpen() {
    const pop = document.getElementById('tb-inspector-pop');
    if (!pop) return;
    pop.hidden = false;
    pop.classList.add('tb-inspector-pop-visible');
  }
  function tbInspectorPopClose() {
    const pop = document.getElementById('tb-inspector-pop');
    if (!pop) return;
    pop.hidden = true;
    pop.classList.remove('tb-inspector-pop-visible');
  }
  // v4.62.4: TB UI state consolidated into one object. Collapses six+ scattered
  // `let _tbX = ...` declarations (v4.60/v4.61/v4.62 inspector + trace + STP
  // + drag/keydown bind flags) that were sprayed across ~7000 lines of app.js.
  // Keeps the per-subsystem nesting clear (inspPrev* for inspector snapshot,
  // trace for trace mode state, stp for STP cached compute, boundFlags for
  // idempotent window-listener sentinels). Thursday tech-debt sweep cleanup —
  // gets global count from 101 → ~94. Single point of truth for all per-TB
  // UI transients.
  let _tbUiState = {
    // Live Protocol Inspector — row-flash diffing snapshot (v4.60.0)
    inspPrevArpKeys: new Set(),
    inspPrevMacKeys: new Set(),
    inspPrevDeviceId: null,
    // Per-Hop Packet Trace — state machine (v4.61.0)
    trace: {
      active: false,
      trace: null,
      currentHop: 0,
      playing: false,
      playTimer: null,
      speedMs: 1500,
      srcId: null,
      dstIp: null
    },
    // Spanning Tree Protocol viz (v4.62.0)
    stp: null,
    stpPrevRoles: {},
    // Idempotent window/DOM listener bind sentinels
    boundFlags: {
      inspectorPopDrag: false,
      configPanelDrag: false,
      tracePanelDrag: false,
      inspectorKeydown: false
    }
  };
  
  // Drag-by-header. The popup is position:absolute inside .tb-canvas-wrap so
  // movement is relative to the canvas, not the page. Bound once at TB open.
  function tbBindInspectorPopDrag() {
    if (_tbUiState.boundFlags.inspectorPopDrag) return;
    const head = document.getElementById('tb-inspector-pop-head');
    const pop = document.getElementById('tb-inspector-pop');
    if (!head || !pop) return;
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    head.addEventListener('mousedown', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('tb-inspector-pop-close')) return;
      dragging = true;
      const rect = pop.getBoundingClientRect();
      const wrapRect = pop.parentElement.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = rect.left - wrapRect.left;
      startTop = rect.top - wrapRect.top;
      pop.style.right = 'auto';
      pop.style.left = startLeft + 'px';
      pop.style.top = startTop + 'px';
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const wrapRect = pop.parentElement.getBoundingClientRect();
      const dx = e.clientX - startX, dy = e.clientY - startY;
      let nl = startLeft + dx, nt = startTop + dy;
      nl = Math.max(8, Math.min(wrapRect.width - 60, nl));
      nt = Math.max(8, Math.min(wrapRect.height - 40, nt));
      pop.style.left = nl + 'px';
      pop.style.top = nt + 'px';
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    _tbUiState.boundFlags.inspectorPopDrag = true;
  }
  
  // v4.60.1: TB side-pane collapse/expand toggles. Left pane = device palette
  // (Devices + Cables). Right pane = scenarios list. Either or both can collapse
  // to a thin 36px vertical rail with a rotated label + re-expand chevron,
  // freeing canvas space for working on a complex topology. State persists
  // per-pane via localStorage so the user's preference survives reloads and
  // navigation away from the TB page.
  function tbTogglePalette() {
    const ws = document.getElementById('tb-workspace-v3');
    if (!ws) return;
    ws.classList.toggle('tb-left-collapsed');
    const collapsed = ws.classList.contains('tb-left-collapsed');
    try { localStorage.setItem(STORAGE.TB_LEFT_COLLAPSED, collapsed ? '1' : '0'); } catch (_) {}
    const btn = document.getElementById('tb-palette-collapse-btn');
    if (btn) {
      btn.setAttribute('aria-label', collapsed ? 'Expand device palette' : 'Collapse device palette');
      btn.setAttribute('title', collapsed ? 'Expand palette' : 'Collapse palette');
    }
  }
  function tbToggleScenarios() {
    const ws = document.getElementById('tb-workspace-v3');
    if (!ws) return;
    ws.classList.toggle('tb-right-collapsed');
    const collapsed = ws.classList.contains('tb-right-collapsed');
    try { localStorage.setItem(STORAGE.TB_RIGHT_COLLAPSED, collapsed ? '1' : '0'); } catch (_) {}
    const btn = document.getElementById('tb-right-collapse-btn');
    if (btn) {
      btn.setAttribute('aria-label', collapsed ? 'Expand scenarios' : 'Collapse scenarios');
      btn.setAttribute('title', collapsed ? 'Expand scenarios' : 'Collapse scenarios');
    }
  }
  // Called once at TB open; reads per-pane saved state and applies classes
  function tbInitPaneCollapseState() {
    const ws = document.getElementById('tb-workspace-v3');
    if (!ws) return;
    try {
      if (localStorage.getItem(STORAGE.TB_LEFT_COLLAPSED) === '1') {
        ws.classList.add('tb-left-collapsed');
        const btn = document.getElementById('tb-palette-collapse-btn');
        if (btn) { btn.setAttribute('aria-label', 'Expand device palette'); btn.setAttribute('title', 'Expand palette'); }
      }
      if (localStorage.getItem(STORAGE.TB_RIGHT_COLLAPSED) === '1') {
        ws.classList.add('tb-right-collapsed');
        const btn = document.getElementById('tb-right-collapse-btn');
        if (btn) { btn.setAttribute('aria-label', 'Expand scenarios'); btn.setAttribute('title', 'Expand scenarios'); }
      }
    } catch (_) {}
  }
  
  // v4.62.1: Drag the Per-Hop Trace panel by its head. Same pattern as the
  // inspector popup drag (position: absolute inside .tb-canvas-wrap). The
  // panel's inner HTML is replaced on every `tbRenderTraceLog()` call, so we
  // bind the listener on the panel element itself + delegate via closest()
  // so re-renders don't break the handler.
  function tbBindTracePanelDrag() {
    if (_tbUiState.boundFlags.tracePanelDrag) return;
    const panel = document.getElementById('tb-trace-panel');
    if (!panel) return;
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    panel.addEventListener('mousedown', (e) => {
      if (!e.target) return;
      // Only initiate drag when the mousedown originated in the head row,
      // NOT on the close button or any descendant of the body/playback.
      if (!e.target.closest || !e.target.closest('.tb-trace-head')) return;
      if (e.target.closest('.tb-trace-close')) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      const wrapRect = (panel.parentElement || panel).getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = rect.left - wrapRect.left;
      startTop = rect.top - wrapRect.top;
      panel.style.left = startLeft + 'px';
      panel.style.top = startTop + 'px';
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const wrapRect = (panel.parentElement || panel).getBoundingClientRect();
      const dx = e.clientX - startX, dy = e.clientY - startY;
      let nl = startLeft + dx, nt = startTop + dy;
      // Clamp so the panel can't be dragged off-screen (at least a handle remains)
      nl = Math.max(8, Math.min(wrapRect.width - 80, nl));
      nt = Math.max(8, Math.min(wrapRect.height - 40, nt));
      panel.style.left = nl + 'px';
      panel.style.top = nt + 'px';
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    _tbUiState.boundFlags.tracePanelDrag = true;
  }
  
  // v4.60.0: ESC key closes the Live Protocol Inspector if it's visible.
  // Bound once at TB open. Does not interfere with other ESC handlers —
  // we check visibility first and return early if the inspector is hidden.
  function tbBindInspectorKeydown() {
    if (_tbUiState.boundFlags.inspectorKeydown) return;
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const pop = document.getElementById('tb-inspector-pop');
      if (!pop || pop.hidden) return;
      // Don't steal ESC from modal dialogs that might be layered on top
      if (document.querySelector('.modal.is-open')) return;
      tbInspectorPopClose();
    });
    _tbUiState.boundFlags.inspectorKeydown = true;
  }
  
  // v4.54.7: drag the full-config floating popup by its header. Same pattern
  // as tbBindInspectorPopDrag but for #tb-config-panel (position: fixed, so
  // left/top are viewport-relative, not wrapper-relative).
  function tbBindConfigPanelDrag() {
    if (_tbUiState.boundFlags.configPanelDrag) return;
    const panel = document.getElementById('tb-config-panel');
    if (!panel) return;
    const head = panel.querySelector('.tb-config-head');
    if (!head) return;
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    head.addEventListener('mousedown', (e) => {
      // Don't start drag when clicking the close or Explain buttons.
      if (e.target && (e.target.closest('.tb-config-close') || e.target.closest('.tb-explain-btn'))) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = rect.left; startTop = rect.top;
      panel.style.right = 'auto';
      panel.style.left = startLeft + 'px';
      panel.style.top = startTop + 'px';
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      let nl = startLeft + dx, nt = startTop + dy;
      const vw = window.innerWidth, vh = window.innerHeight;
      nl = Math.max(8, Math.min(vw - 80, nl));
      nt = Math.max(8, Math.min(vh - 60, nt));
      panel.style.left = nl + 'px';
      panel.style.top = nt + 'px';
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    _tbUiState.boundFlags.configPanelDrag = true;
  }
  
  // ─────────────────────────────────────────────────────────────────────
  // v4.54.6 \u2014 Canvas pan + zoom (viewBox manipulation)
  // ─────────────────────────────────────────────────────────────────────
  // We mutate the SVG viewBox attribute directly. Mouse coords still convert
  // correctly because tbClientToSvg uses getScreenCTM().inverse() which takes
  // the current viewBox into account. So device drag, drop, and wiring all
  // keep working without changes.
  //
  // Default view: v4.54.6 used 350,250 1100x600 (~1.6x zoom-in).
  // v4.54.7 widens to 250,200 1300x780 so devices don't bunch up in scenarios and
  // the canvas fills the full-bleed layout more naturally edge-to-edge.
  
  const TB_VIEW_DEFAULT = { x: 250, y: 200, w: 1300, h: 780 };
  const TB_VIEW_MIN_W = 300;   // max zoom-in (smaller viewBox = bigger devices)
  const TB_VIEW_MAX_W = 2600;  // max zoom-out
  const TB_VIEW_AR = TB_VIEW_DEFAULT.w / TB_VIEW_DEFAULT.h; // preserve aspect ratio
  let tbViewState = Object.assign({}, TB_VIEW_DEFAULT);
  
  function tbApplyViewBox() {
    const svg = document.getElementById('tb-canvas');
    if (!svg) return;
    const v = tbViewState;
    svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
  }
  
  function tbZoomReset() {
    tbViewState = Object.assign({}, TB_VIEW_DEFAULT);
    tbApplyViewBox();
  }
  
  function tbZoomBy(factor, anchorWorld) {
    // factor < 1 zooms IN (smaller viewBox), > 1 zooms OUT.
    // anchorWorld (optional) is the world-space point that should remain
    // visually fixed during zoom (e.g. mouse cursor for wheel zoom).
    const v = tbViewState;
    let nw = v.w * factor;
    if (nw < TB_VIEW_MIN_W) nw = TB_VIEW_MIN_W;
    if (nw > TB_VIEW_MAX_W) nw = TB_VIEW_MAX_W;
    const nh = nw / TB_VIEW_AR;
    const ax = (anchorWorld && typeof anchorWorld.x === 'number') ? anchorWorld.x : (v.x + v.w / 2);
    const ay = (anchorWorld && typeof anchorWorld.y === 'number') ? anchorWorld.y : (v.y + v.h / 2);
    // Keep anchor world point at the same fractional position in the new view.
    const fx = (ax - v.x) / v.w;
    const fy = (ay - v.y) / v.h;
    v.x = ax - fx * nw;
    v.y = ay - fy * nh;
    v.w = nw; v.h = nh;
    tbApplyViewBox();
  }
  
  function tbZoomIn()  { tbZoomBy(0.8); }
  function tbZoomOut() { tbZoomBy(1.25); }
  
  function _tbWheelToWorld(svg, clientX, clientY) {
    // Use raw matrix transform (don't go through tbClientToSvg \u2014 that one
    // clamps to canvas bounds which throws off zoom anchoring near edges).
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const { x, y } = pt.matrixTransform(ctm.inverse());
    return { x, y };
  }
  
  let _tbPanZoomBound = false;
  let _tbPanning = null; // { startX, startY, startView }
  function tbBindCanvasPanZoom() {
    if (_tbPanZoomBound) return;
    const svg = document.getElementById('tb-canvas');
    if (!svg) return;
  
    // Wheel \u2192 zoom around cursor
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const anchor = _tbWheelToWorld(svg, e.clientX, e.clientY);
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      tbZoomBy(factor, anchor);
    }, { passive: false });
  
    // Mousedown on EMPTY canvas (background rect or svg itself) starts pan.
    // Devices have their own mousedown handler with stopPropagation, so device
    // drag is unaffected.
    svg.addEventListener('mousedown', (e) => {
      if (e.target.tagName !== 'rect' && e.target.tagName !== 'svg') return;
      _tbPanning = {
        startX: e.clientX,
        startY: e.clientY,
        startView: Object.assign({}, tbViewState),
        moved: false,
      };
      svg.style.cursor = 'grabbing';
    });
  
    window.addEventListener('mousemove', (e) => {
      if (!_tbPanning) return;
      const svgEl = document.getElementById('tb-canvas');
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      // dx in CSS px \u2192 dx in viewBox units = dx * (viewBox.w / canvas.cssWidth)
      const sx = _tbPanning.startView.w / rect.width;
      const sy = _tbPanning.startView.h / rect.height;
      const dx = (e.clientX - _tbPanning.startX) * sx;
      const dy = (e.clientY - _tbPanning.startY) * sy;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) _tbPanning.moved = true;
      tbViewState.x = _tbPanning.startView.x - dx;
      tbViewState.y = _tbPanning.startView.y - dy;
      tbApplyViewBox();
    });
  
    window.addEventListener('mouseup', () => {
      if (_tbPanning) {
        const svgEl = document.getElementById('tb-canvas');
        if (svgEl) svgEl.style.cursor = '';
        // If user only clicked (no real movement), let the existing svg click
        // handler run (it's bound separately and will fire on mouseup naturally).
        _tbPanning = null;
      }
    });
  
    _tbPanZoomBound = true;
  }
  
  // ─────────────────────────────────────────────────────────────────────
  // v4.54.6 \u2014 Pill toolbar inside canvas (Design / Simulate / Labs + actions)
  // ─────────────────────────────────────────────────────────────────────
  // Mode pills carry simple aria-pressed state. Action pills (Coach/Grade/PNG)
  // are stateless and just delegate to the existing handlers.
  let tbPillMode = 'design';
  function tbSelectPill(mode) {
    tbPillMode = mode || 'design';
    document.querySelectorAll('#tb-canvas-pills .tb-pill[data-tb-pill]').forEach(btn => {
      const isActive = btn.getAttribute('data-tb-pill') === tbPillMode;
      btn.classList.toggle('tb-pill-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }
  
  // ══════════════════════════════════════════
  // v4.63.0 — 3D View Mode (issue #199, Phase 1)
  //
  // Read-only 3D visualization of the current tbState. Uses Three.js +
  // OrbitControls + CSS2DRenderer, all vendored locally under /vendor/three/
  // and resolved via the importmap in index.html. The whole 3D module
  // (tb3d.js + vendored bundle) is dynamic-imported on first use so
  // every user who never opens 3D pays zero bandwidth for it.
  //
  // 2D stays the source of truth for editing. 3D is the explorer.
  // ══════════════════════════════════════════
  let _tb3dModule = null;
  let _tb3dActive = false;
  
  // v4.85.7: 2D-UI hide helper extracted from tbOpen3DView() for length
  // budget. Hides the 2D canvas + pills + zoom + hint + v2-stats panels and
  // stashes the 2D trace panel's hidden state on a data attr so we can
  // restore it on close.
  function _tb3dHide2DUI(host) {
    host.hidden = false;
    host.classList.add('tb-3d-host-active');
    document.getElementById('tb-canvas')?.classList.add('is-hidden');
    document.getElementById('tb-canvas-pills')?.classList.add('is-hidden');
    document.getElementById('tb-zoom-ctrls')?.classList.add('is-hidden');
    document.getElementById('tb-empty-hint')?.classList.add('is-hidden');
    document.getElementById('tb-v2-stats')?.classList.add('is-hidden');
    const tracePanel = document.getElementById('tb-trace-panel');
    if (tracePanel) {
      tracePanel.dataset._tb3dHidden = tracePanel.hidden ? '1' : '0';
      tracePanel.hidden = true;
    }
  }
  
  async function tbOpen3DView() {
    // Mobile nudge: < 768px shows the desktop-recommended card first.
    // tb3dDismissMobileNudge() continues with the 3D entry.
    const host = document.getElementById('tb-3d-host');
    if (!host) return;
  
    _tb3dHide2DUI(host);
    _tb3dActive = true;
  
    // Respect mobile-nudge gate: if < 768px and the user hasn't yet
    // dismissed the nudge this session, show the card and bail until
    // they hit "Open anyway".
    const nudge = document.getElementById('tb-3d-mobile-nudge');
    const nudgeDismissed = window.innerWidth >= 768 ||
                           sessionStorage.getItem('tb3dNudgeDismissed') === '1';
    if (nudge) nudge.style.display = nudgeDismissed ? 'none' : 'flex';
    if (!nudgeDismissed) {
      document.getElementById('tb-3d-loading').style.display = 'none';
      return;
    }
  
    // v4.81.8: WebGL preflight — fail-fast with a specific message rather
    // than the generic "check network / console" if the browser/environment
    // can't render WebGL at all (some headless browsers, locked-down
    // corporate environments, ancient devices). Codex's external-review
    // env may have hit this.
    if (!_tb3dWebGLAvailable()) {
      showErrorToast('3D View requires WebGL, which isn\'t available in this browser.');
      tbClose3DView();
      return;
    }
  
    // First entry: dynamic-import the 3D module (fetches vendored
    // Three.js bundle on first call, cached by browser + SW thereafter).
    // v4.81.8: split the try block into specific phases so error toasts
    // point at the actual failure (import vs init) rather than collapsing
    // into a generic "check console" — Codex's external-review surfaced
    // the toast but we couldn't reproduce, so the new fix is observability
    // (better error messages + diagnostics persisted to error log) rather
    // than a hypothetical patch.
    let phase = 'import';
    try {
      if (!_tb3dModule) {
        // v4.99.44 Phase 11c: TB was extracted from app.js (project root) into
        // features/topology-builder.js. Pre-extraction `./tb3d.js` resolved to
        // /tb3d.js; post-extraction the same relative spec would resolve to
        // /features/tb3d.js (404). Use the absolute project-root path so the
        // import resolves correctly regardless of where this module lives.
        _tb3dModule = await import('/tb3d.js');
      }
      phase = 'enter';
      _tb3dModule.enter(tbState, {
        onDeviceClick: (deviceId) => tbSelectDeviceForInspector(deviceId),
        onAfterEnter: () => {
          document.getElementById('tb-3d-loading').style.display = 'none';
        }
      });
      // v4.64.0 Phase 2: if a trace is already running in 2D, sync the 3D
      // HUD + hop strip to it so entering 3D mid-trace is continuous.
      if (_tbUiState?.trace?.active && _tb3dModule.setTraceState) {
        phase = 'setTraceState';
        _tb3dModule.setTraceState(_tbUiState.trace);
      }
      // v4.66.0 Phase 4: surface Play Tour button if the loaded scenario
      // has a `tour` authored.
      if (typeof _tb3dUpdateTourButton === 'function') {
        phase = 'updateTourButton';
        _tb3dUpdateTourButton();
      }
    } catch (err) {
      _tb3dHandleOpenFailure(phase, err, tbState);
      tbClose3DView();
    }
  }
  
  // v4.81.8: lightweight WebGL availability check. Returns true if the
  // browser can construct a WebGL context — false otherwise. Run once and
  // cached so we don't recreate canvases on every 3D entry.
  let _tb3dWebGLChecked = false;
  let _tb3dWebGLOk = false;
  function _tb3dWebGLAvailable() {
    if (_tb3dWebGLChecked) return _tb3dWebGLOk;
    _tb3dWebGLChecked = true;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      _tb3dWebGLOk = !!gl;
    } catch (_) {
      _tb3dWebGLOk = false;
    }
    return _tb3dWebGLOk;
  }
  
  // v4.81.8: structured failure handler for tbOpen3DView. Surfaces a
  // phase-specific toast + persists the underlying error to the
  // error-log (used by the in-app monitor) so we have evidence next
  // time it happens. Pre-fix the catch block just showed "check
  // console" which left zero diagnostic trail.
  function _tb3dHandleOpenFailure(phase, err, tbState) {
    const errMsg = (err && err.message) || String(err);
    const truncated = errMsg.length > 120 ? errMsg.slice(0, 120) + '…' : errMsg;
    const phaseLabel = {
      'import': 'Loading 3D module',
      'enter': 'Initialising 3D scene',
      'setTraceState': 'Syncing trace state',
      'updateTourButton': 'Setting up tour button'
    }[phase] || phase;
    // Console — full stack for devs
    console.warn('[tb3d] open failed @ ' + phase, err);
    // Toast — phase + truncated message
    showErrorToast('3D View failed (' + phaseLabel + ') — ' + truncated);
    // Error log — persist via existing logError helper so the in-app
    // monitor (triple-tap version badge) + any future debugging session
    // has the diagnostic. Auto-reports to GitHub if user has the monitor
    // configured.
    try {
      if (typeof logError === 'function') {
        logError('tb3d-open-failure', errMsg, {
          phase,
          stack: (err && err.stack) || null,
          deviceCount: tbState?.devices?.length || 0,
          cableCount: tbState?.cables?.length || 0,
          scenario: typeof tbSelectedScenario !== 'undefined' ? tbSelectedScenario : null
        });
      }
    } catch (_) { /* swallow — error logging itself must never throw */ }
  }
  
  function tbClose3DView() {
    const host = document.getElementById('tb-3d-host');
    if (!host) return;
    if (_tb3dModule && _tb3dActive) {
      try { _tb3dModule.exit(); } catch (_) { /* tolerate */ }
    }
    _tb3dActive = false;
    host.hidden = true;
    host.classList.remove('tb-3d-host-active');
    document.getElementById('tb-canvas')?.classList.remove('is-hidden');
    document.getElementById('tb-canvas-pills')?.classList.remove('is-hidden');
    document.getElementById('tb-zoom-ctrls')?.classList.remove('is-hidden');
    document.getElementById('tb-empty-hint')?.classList.remove('is-hidden');
    document.getElementById('tb-v2-stats')?.classList.remove('is-hidden');
    // v4.64.0 Phase 2: restore the 2D trace panel to its pre-3D state.
    // If the trace is still active, the panel re-shows automatically.
    const tracePanel = document.getElementById('tb-trace-panel');
    if (tracePanel && _tbUiState?.trace?.active) {
      tracePanel.hidden = false;
      // Fire a re-render in 2D since the log content needs to refresh
      if (typeof tbRenderTraceLog === 'function') tbRenderTraceLog();
      if (typeof tbRenderTraceCanvasState === 'function') tbRenderTraceCanvasState();
    }
    // v4.65.0 Phase 3: reset OSI chrome buttons to starting state so
    // re-entering 3D has a clean slate. v4.65.1: button is always
    // clickable now (auto-picks device if none selected), so we just
    // swap visibility — no `disabled` attribute manipulation.
    if (typeof _tb3dSyncOsiChrome === 'function') _tb3dSyncOsiChrome(false);
    // v4.66.0 Phase 4: end any running tour on 3D exit so it doesn't leak
    // timers or show stale captions/highlights.
    if (_tbTourState?.active && typeof tb3dTourExit === 'function') tb3dTourExit();
  }
  
  // v4.72.1: when a scenario is loaded while 3D is active, tear down + rebuild
  // the scene from the fresh tbState so the new topology appears immediately.
  // Without this, users had to toggle back to 2D, pick the scenario, then
  // re-enter 3D — a 3-click detour for what should be a 1-click change.
  // Clears stale tour + OSI state before re-entering since both are keyed to
  // the previous scenario's devices.
  function _tb3dReenterWithCurrentState() {
    if (!_tb3dActive || !_tb3dModule) return;
    // End any running tour — step camera/highlights are keyed to old devices.
    if (_tbTourState?.active && typeof tb3dTourExit === 'function') {
      try { tb3dTourExit(); } catch (_) { /* tolerate */ }
    }
    // Exit OSI view if active — layers are anchored to a device that may
    // no longer exist in the new scenario.
    if (_tb3dModule.isOsiActive && _tb3dModule.isOsiActive()) {
      try { _tb3dModule.exitOsiView(); } catch (_) { /* tolerate */ }
      if (typeof _tb3dSyncOsiChrome === 'function') _tb3dSyncOsiChrome(false);
    }
    // Full dispose + rebuild. enter() is idempotent — it re-mounts into the
    // same #tb-3d-host container the first entry set up.
    try { _tb3dModule.exit(); } catch (_) { /* tolerate */ }
    try {
      _tb3dModule.enter(tbState, {
        onDeviceClick: (deviceId) => tbSelectDeviceForInspector(deviceId),
        onAfterEnter: () => {
          const loading = document.getElementById('tb-3d-loading');
          if (loading) loading.style.display = 'none';
        }
      });
      // Refresh Play Tour button visibility — new scenario may or may not
      // have a tour authored.
      if (typeof _tb3dUpdateTourButton === 'function') _tb3dUpdateTourButton();
    } catch (err) {
      console.warn('[tb3d] failed to re-enter after scenario change', err);
    }
  }
  
  function tb3dResetCamera() {
    if (_tb3dModule && _tb3dActive) _tb3dModule.resetCamera();
  }
  function tb3dTopDown() {
    if (_tb3dModule && _tb3dActive) _tb3dModule.topDown();
  }
  function tb3dDismissMobileNudge() {
    sessionStorage.setItem('tb3dNudgeDismissed', '1');
    const nudge = document.getElementById('tb-3d-mobile-nudge');
    if (nudge) nudge.style.display = 'none';
    // Retry entry now that nudge is dismissed
    tbOpen3DView();
  }
  
  // v4.64.0 Phase 2 — chrome button delegates. All trace state lives in
  // _tbUiState.trace (owned by app.js / v4.61.0); tb3d.js is render-only.
  // These are thin wrappers so the 3D chrome buttons can call the same
  // underlying 2D trace functions without duplicating state.
  function tb3dOpenTraceDialog() {
    // Same UX as 2D: tbOpenTraceDialog prompts for src + dst IP, then kicks
    // off tbStartTrace which fires tbRenderTraceCanvasState → setTraceState.
    if (typeof tbOpenTraceDialog === 'function') tbOpenTraceDialog();
  }
  function tb3dTracePlay() {
    if (typeof tbTracePlay === 'function') tbTracePlay();
    // Play/pause buttons swap visibility — the state-driven update in
    // tb3d.js handles it on next setTraceState call, but fire one now
    // so the UI reflects the new playing flag before the next hop tick.
    if (_tb3dModule?.setTraceState) _tb3dModule.setTraceState(_tbUiState.trace);
  }
  function tb3dTracePause() {
    if (typeof tbTracePause === 'function') tbTracePause();
    if (_tb3dModule?.setTraceState) _tb3dModule.setTraceState(_tbUiState.trace);
  }
  function tb3dTraceStep() {
    if (typeof tbTraceStep === 'function') tbTraceStep();
  }
  function tb3dTraceSpeed() {
    // Cycle 1× → 2× → 0.5× → 1×
    const cur = _tbUiState.trace.speedMs || 1500;
    const next = cur === 1500 ? 750 : (cur === 750 ? 3000 : 1500);
    _tbUiState.trace.speedMs = next;
    if (_tb3dModule?.setTraceState) _tb3dModule.setTraceState(_tbUiState.trace);
  }
  function tb3dTraceEnd() {
    if (typeof tbEndTrace === 'function') tbEndTrace();
  }
  
  // v4.65.0 Phase 3 — OSI Layer Stack view delegates. OSI button is enabled
  // only when a device is selected (tracked via tbV3InspectedDeviceId).
  // Entering OSI mode lifts that device into a 7-plane exploded stack.
  function tb3dEnterOsiView() {
    if (!_tb3dActive || !_tb3dModule || typeof _tb3dModule.enterOsiView !== 'function') return;
    let deviceId = typeof tbV3InspectedDeviceId !== 'undefined' ? tbV3InspectedDeviceId : null;
    // v4.65.1: if nothing's selected, auto-pick a sensible device so the
    // feature works on first-click without the user hunting for the "right"
    // thing to click. Preference: endpoint (pc/laptop/phone) > router >
    // any non-cloud device.
    if (!deviceId && tbState?.devices?.length) {
      const devs = tbState.devices;
      const pick =
        devs.find(d => d.type === 'pc' || d.type === 'laptop' || d.type === 'smartphone') ||
        devs.find(d => d.type === 'router') ||
        devs.find(d => d.type !== 'cloud' && d.type !== 'isp-router') ||
        devs[0];
      if (pick) {
        deviceId = pick.id;
        if (typeof tbSelectDeviceForInspector === 'function') {
          tbSelectDeviceForInspector(deviceId);
        }
      }
    }
    if (!deviceId) {
      if (typeof showErrorToast === 'function') showErrorToast('Add a device first, then OSI Stack.');
      return;
    }
    const ok = _tb3dModule.enterOsiView(deviceId);
    if (ok) _tb3dSyncOsiChrome(true);
  }
  function tb3dExitOsiView() {
    if (!_tb3dActive || !_tb3dModule || typeof _tb3dModule.exitOsiView !== 'function') return;
    _tb3dModule.exitOsiView();
    _tb3dSyncOsiChrome(false);
  }
  // Swap OSI vs Exit OSI button visibility; also hide Trace while in OSI
  // mode since trace doesn't apply there.
  function _tb3dSyncOsiChrome(active) {
    const osiBtn = document.getElementById('tb-3d-osi-btn');
    const exitBtn = document.getElementById('tb-3d-osi-exit-btn');
    const traceBtn = document.getElementById('tb-3d-trace-btn');
    if (osiBtn) osiBtn.hidden = active;
    if (exitBtn) exitBtn.hidden = !active;
    if (traceBtn) traceBtn.hidden = active;
  }
  // Kept for v4.65.0 backward compat + regression guard. v4.65.1 made the
  // OSI button always clickable (it auto-picks a device if none is selected),
  // so this now only ensures `disabled` is never stuck on.
  function _tb3dUpdateOsiButtonEnabled() {
    const osiBtn = document.getElementById('tb-3d-osi-btn');
    if (osiBtn) osiBtn.removeAttribute('disabled');
  }
  
  // ══════════════════════════════════════════
  // v4.66.0 Phase 4 — Scenario Tours
  // Render-only contract with tb3d.js: app.js owns ALL tour state +
  // step-advance timing; tb3d provides camera tween + device highlight
  // primitives (see tweenCameraTo + highlightDevices exports).
  // ══════════════════════════════════════════
  let _tbTourState = {
    active: false,
    tour: null,        // reference to TB_SCENARIOS[id].tour array
    scenarioId: null,
    currentStep: 0,
    playing: false,
    advanceTimer: null
  };
  
  // Show the Play Tour button only when the currently-loaded scenario has
  // a `tour` field AND 3D mode is active.
  function _tb3dUpdateTourButton() {
    const btn = document.getElementById('tb-3d-tour-btn');
    if (!btn) return;
    const scenId = typeof tbSelectedScenario !== 'undefined' ? tbSelectedScenario : null;
    const scen = scenId && typeof TB_SCENARIOS !== 'undefined'
      ? TB_SCENARIOS.find(s => s.id === scenId)
      : null;
    const hasTour = !!(scen && Array.isArray(scen.tour) && scen.tour.length);
    btn.hidden = !hasTour || !_tb3dActive;
  }
  
  // Start the tour. Called from the chrome 🟢 Play Tour button.
  function tb3dPlayTour() {
    if (!_tb3dActive) return;
    const scenId = typeof tbSelectedScenario !== 'undefined' ? tbSelectedScenario : null;
    const scen = scenId && typeof TB_SCENARIOS !== 'undefined'
      ? TB_SCENARIOS.find(s => s.id === scenId)
      : null;
    if (!scen || !Array.isArray(scen.tour) || !scen.tour.length) return;
    _tbTourState.active = true;
    _tbTourState.tour = scen.tour;
    _tbTourState.scenarioId = scen.id;
    _tbTourState.currentStep = 0;
    _tbTourState.playing = true;
    _tb3dShowTourChrome(true);
    _tb3dRenderTourStep();
  }
  
  // Render the current step: tween camera, update caption, highlight devices,
  // schedule auto-advance if playing.
  function _tb3dRenderTourStep() {
    const s = _tbTourState;
    if (!s.active || !s.tour) return;
    const step = s.tour[s.currentStep];
    if (!step) { tb3dTourExit(); return; }
  
    // Camera tween (render-only — delegates to tb3d.tweenCameraTo)
    if (step.camera && _tb3dModule?.tweenCameraTo) {
      _tb3dModule.tweenCameraTo(
        step.camera.position,
        step.camera.target,
        step.camera.durationMs || 900
      );
    }
    // Device highlights
    if (_tb3dModule?.highlightDevices) {
      _tb3dModule.highlightDevices(step.highlight || []);
    }
    // Caption card
    const cap = document.getElementById('tb-3d-tour-caption');
    const title = document.getElementById('tb-3d-tour-title');
    const body = document.getElementById('tb-3d-tour-body');
    const dots = document.getElementById('tb-3d-tour-dots');
    if (cap && title && body && dots) {
      title.textContent = step.title || '';
      body.textContent = step.body || '';
      // Step-dot indicator
      dots.innerHTML = s.tour.map((_, i) => {
        let klass = 'tb-3d-tour-dot';
        if (i < s.currentStep) klass += ' is-done';
        else if (i === s.currentStep) klass += ' is-current';
        return `<span class="${klass}"></span>`;
      }).join('');
      // Force fade-in animation to replay on each step change
      cap.hidden = false;
      cap.style.animation = 'none';
      // Next frame: restore animation so CSS fires again
      requestAnimationFrame(() => { cap.style.animation = ''; });
    }
  
    // Auto-advance if playing, unless this is the last step
    if (_tbTourState.advanceTimer) { clearTimeout(_tbTourState.advanceTimer); _tbTourState.advanceTimer = null; }
    if (s.playing && s.currentStep < s.tour.length - 1) {
      const ms = step.durationMs || 6500;
      _tbTourState.advanceTimer = setTimeout(() => {
        if (!_tbTourState.active || !_tbTourState.playing) return;
        _tbTourState.currentStep++;
        _tb3dRenderTourStep();
      }, ms);
    }
  }
  
  function tb3dTourPause() {
    if (!_tbTourState.active) return;
    _tbTourState.playing = false;
    if (_tbTourState.advanceTimer) { clearTimeout(_tbTourState.advanceTimer); _tbTourState.advanceTimer = null; }
    _tb3dSyncTourControls();
  }
  function tb3dTourResume() {
    if (!_tbTourState.active) return;
    _tbTourState.playing = true;
    _tb3dSyncTourControls();
    _tb3dRenderTourStep();
  }
  function tb3dTourSkip() {
    if (!_tbTourState.active || !_tbTourState.tour) return;
    if (_tbTourState.advanceTimer) { clearTimeout(_tbTourState.advanceTimer); _tbTourState.advanceTimer = null; }
    if (_tbTourState.currentStep < _tbTourState.tour.length - 1) {
      _tbTourState.currentStep++;
      _tb3dRenderTourStep();
    } else {
      tb3dTourExit();
    }
  }
  // v4.67.0 — Previous button. Goes back one step and PAUSES auto-advance
  // so the user can re-read without the tour skipping forward again while
  // they read. If already at step 0, no-op.
  function tb3dTourPrev() {
    if (!_tbTourState.active || !_tbTourState.tour) return;
    if (_tbTourState.currentStep <= 0) return;
    if (_tbTourState.advanceTimer) { clearTimeout(_tbTourState.advanceTimer); _tbTourState.advanceTimer = null; }
    _tbTourState.currentStep--;
    _tbTourState.playing = false;  // going back means "I want time to read"
    _tb3dSyncTourControls();
    _tb3dRenderTourStep();
  }
  function tb3dTourExit() {
    if (_tbTourState.advanceTimer) { clearTimeout(_tbTourState.advanceTimer); _tbTourState.advanceTimer = null; }
    _tbTourState.active = false;
    _tbTourState.playing = false;
    _tbTourState.tour = null;
    _tbTourState.currentStep = 0;
    _tb3dShowTourChrome(false);
    // Hide caption
    const cap = document.getElementById('tb-3d-tour-caption');
    if (cap) cap.hidden = true;
    // Clear all highlights
    if (_tb3dModule?.highlightDevices) _tb3dModule.highlightDevices([]);
    // Restore iso camera
    if (_tb3dModule?.resetCamera) _tb3dModule.resetCamera();
  }
  
  // Chrome visibility helpers: swap Play Tour button ↔ tour controls
  function _tb3dShowTourChrome(active) {
    const btn = document.getElementById('tb-3d-tour-btn');
    const ctl = document.getElementById('tb-3d-tour-controls');
    if (btn) btn.hidden = active || !_tbTourScenarioHasTour();
    if (ctl) ctl.hidden = !active;
    _tb3dSyncTourControls();
  }
  function _tb3dSyncTourControls() {
    const playBtn = document.getElementById('tb-3d-tour-play-btn');
    const pauseBtn = document.getElementById('tb-3d-tour-pause-btn');
    if (!playBtn || !pauseBtn) return;
    const playing = _tbTourState.playing;
    playBtn.hidden = playing;
    pauseBtn.hidden = !playing;
  }
  function _tbTourScenarioHasTour() {
    const scenId = typeof tbSelectedScenario !== 'undefined' ? tbSelectedScenario : null;
    const scen = scenId && typeof TB_SCENARIOS !== 'undefined'
      ? TB_SCENARIOS.find(s => s.id === scenId)
      : null;
    return !!(scen && Array.isArray(scen.tour) && scen.tour.length);
  }
  
  // v4.60.0 — Live Protocol Inspector (issue #184). Replaces the pre-v4.60
  // static summary. Now renders the device's actual live protocol state:
  // routing table, ARP cache, MAC address table, DHCP pool config — each
  // in a labelled accordion section. Role-aware: inapplicable sections
  // render friendly redirect stubs ("click a switch to see a MAC table")
  // instead of hiding or empty-zero noise. Rows learned since the last
  // render get the .tb-insp-row-flash class for a 1.8s accent-glow pulse.
  // Refreshed automatically from tbSaveDraft() on every state mutation, so
  // sending a ping and watching ARP populate now renders live.
  
  // Module-level snapshot for diffing. Keyed by stable per-row identity:
  //   ARP: ip|mac
  //   MAC: mac|vlan|port
  // Reset on device-change so switching devices doesn't leave stale flashes.
  
  function _tbInspEsc(s) {
    return (typeof escHtml === 'function') ? escHtml(s) : String(s);
  }
  function _tbInspDeviceHasL3(dev) {
    return Array.isArray(dev.interfaces) && dev.interfaces.some(i => i && i.ip && i.mask);
  }
  function _tbInspDeviceIsSwitch(dev) {
    return typeof dev.type === 'string' && dev.type.indexOf('switch') >= 0;
  }
  function _tbInspDeviceIsDhcpServer(dev) {
    return !!(dev.dhcpServer && (dev.dhcpServer.rangeStart || dev.dhcpServer.network));
  }
  function _tbInspRowClass(isFlashing) {
    return isFlashing ? ' tb-insp-row-flash' : '';
  }
  function _tbInspAccSection(icon, label, count, bodyHtml) {
    const countBadge = (typeof count === 'number')
      ? `<span class="tb-insp-acc-count${count > 0 ? ' active' : ''}">${count}</span>`
      : (count ? `<span class="tb-insp-acc-count">${_tbInspEsc(count)}</span>` : '');
    return `<div class="tb-insp-acc-section">
      <div class="tb-insp-acc-head">
        <span class="tb-insp-acc-label">${icon} ${_tbInspEsc(label)}</span>
        ${countBadge}
      </div>
      <div class="tb-insp-acc-body">${bodyHtml}</div>
    </div>`;
  }
  function _tbInspInapplicable(text) {
    return `<div class="tb-insp-inapplicable">${text}</div>`;
  }
  function _tbInspEmpty(msg) {
    return `<div class="tb-insp-empty">${_tbInspEsc(msg)}</div>`;
  }
  
  // ── Table renderers (all pure functions; accept optional flash sets) ──
  
  function _tbRenderInspRouting(dev, flashKeys) {
    const rows = Array.isArray(dev.routingTable) ? dev.routingTable : [];
    if (rows.length === 0) {
      return _tbInspEmpty('Routing table is empty — add static routes via Open Full Config, or connect interfaces with IPs to auto-populate connected routes.');
    }
    const body = rows.map(r => {
      const dest = _tbInspEsc(`${r.destination || '0.0.0.0'}/${r.mask || 0}`);
      const nh = r.nextHop ? _tbInspEsc(r.nextHop) : '<span class="tb-insp-cell-dim">connected</span>';
      const iface = _tbInspEsc(r.interface || '\u2014');
      const src = _tbInspEsc(r.source || (r.nextHop ? 'S' : 'C'));
      const key = `${r.destination}|${r.mask}|${r.nextHop || ''}|${r.interface || ''}`;
      const flash = flashKeys && flashKeys.has(key);
      return `<tr class="${_tbInspRowClass(flash)}"><td>${dest}</td><td>${nh}</td><td class="tb-insp-cell-iface">${iface}</td><td class="tb-insp-cell-dim">${src}</td></tr>`;
    }).join('');
    return `<table class="tb-insp-tbl"><thead><tr><th>Destination</th><th>Next-hop</th><th>Iface</th><th>Src</th></tr></thead><tbody>${body}</tbody></table>`;
  }
  
  function _tbRenderInspArp(dev, flashKeys) {
    const rows = Array.isArray(dev.arpTable) ? dev.arpTable : [];
    if (rows.length === 0) {
      return _tbInspEmpty('ARP cache is empty — no packets have flowed yet. Send a ping to populate.');
    }
    const body = rows.map(r => {
      const ip = _tbInspEsc(r.ip || '');
      const mac = _tbInspEsc(r.mac || '');
      const iface = _tbInspEsc(r.iface || '\u2014');
      const age = (typeof r.age === 'number') ? `${r.age}s` : '\u2014';
      const key = `${r.ip}|${r.mac}`;
      const flash = flashKeys && flashKeys.has(key);
      const learnedLabel = flash ? '<span class="tb-insp-learned">Learned</span>' : '';
      return `<tr class="${_tbInspRowClass(flash)}"><td>${ip}</td><td>${mac}</td><td class="tb-insp-cell-iface">${iface}</td><td class="tb-insp-cell-dim">${age}${learnedLabel}</td></tr>`;
    }).join('');
    return `<table class="tb-insp-tbl"><thead><tr><th>IP</th><th>MAC</th><th>Iface</th><th>Age</th></tr></thead><tbody>${body}</tbody></table>`;
  }
  
  function _tbRenderInspMac(dev, flashKeys) {
    const rows = Array.isArray(dev.macTable) ? dev.macTable : [];
    if (rows.length === 0) {
      return _tbInspEmpty('MAC address table is empty — this switch has not yet seen any traffic. Send a ping between connected devices to populate.');
    }
    const body = rows.map(r => {
      const mac = _tbInspEsc(r.mac || '');
      const vlan = _tbInspEsc(String(r.vlan || '1'));
      const port = _tbInspEsc(r.port || '\u2014');
      const key = `${r.mac}|${r.vlan}|${r.port}`;
      const flash = flashKeys && flashKeys.has(key);
      const learnedLabel = flash ? '<span class="tb-insp-learned">Learned</span>' : '';
      return `<tr class="${_tbInspRowClass(flash)}"><td>${mac}</td><td class="tb-insp-cell-dim">${vlan}</td><td class="tb-insp-cell-iface">${port}${learnedLabel}</td></tr>`;
    }).join('');
    return `<table class="tb-insp-tbl"><thead><tr><th>MAC</th><th>VLAN</th><th>Port</th></tr></thead><tbody>${body}</tbody></table>`;
  }
  
  function _tbRenderInspDhcp(dev) {
    // v4.60.0 renders DHCP POOL CONFIG for devices that are DHCP servers.
    // Live lease tracking isn't in the sim engine today; a future v4.60.x
    // can add lease rows here when the packet engine simulates DORA flows.
    const pool = dev.dhcpServer;
    if (!pool) return null;
    const rows = [
      ['Network', pool.network || '\u2014'],
      ['Mask', pool.mask || '\u2014'],
      ['Gateway', pool.gateway || '\u2014'],
      ['Range', pool.rangeStart && pool.rangeEnd ? `${pool.rangeStart} \u2013 ${pool.rangeEnd}` : '\u2014'],
      ['DNS', pool.dns || '\u2014'],
      ['Pool name', pool.name || 'POOL1']
    ];
    const body = rows.map(([k, v]) => `<tr><td class="tb-insp-cell-dim">${_tbInspEsc(k)}</td><td>${_tbInspEsc(v)}</td></tr>`).join('');
    return `<table class="tb-insp-tbl tb-insp-tbl-kv"><tbody>${body}</tbody></table>
      <div class="tb-insp-note">Static pool config shown. Live-lease tracking arrives in a future ship once the packet engine simulates DORA.</div>`;
  }
  
  // ── Main renderer ──
  
  function tbRenderV3Inspector() {
    const el = document.getElementById('tb-v3-inspector');
    if (!el) return;
    const deviceId = tbV3InspectedDeviceId;
    const dev = (tbState && tbState.devices) ? tbState.devices.find(d => d.id === deviceId) : null;
    if (!dev) {
      // Reset snapshot so flashes don't fire on first show of a new device
      _tbUiState.inspPrevArpKeys = new Set();
      _tbUiState.inspPrevMacKeys = new Set();
      _tbUiState.inspPrevDeviceId = null;
      el.innerHTML = `<div class="tb-v3-inspector-empty">
        <div class="tb-v3-inspector-empty-ico" aria-hidden="true">\u2139</div>
        <div class="tb-v3-inspector-empty-text"><strong>Click a device</strong> on the canvas to see its interfaces, IPs, and role summary here.</div>
        <div class="tb-v3-inspector-empty-sub">Double-click a device for the full editable config panel.</div>
      </div>`;
      return;
    }
  
    // Reset diff baseline if the inspected device changed. Only compute flash
    // sets when we're refreshing the SAME device — switching devices should
    // render clean, no stale animation carryover.
    const arpRows = Array.isArray(dev.arpTable) ? dev.arpTable : [];
    const macRows = Array.isArray(dev.macTable) ? dev.macTable : [];
    const currArpKeys = new Set(arpRows.map(r => `${r.ip}|${r.mac}`));
    const currMacKeys = new Set(macRows.map(r => `${r.mac}|${r.vlan}|${r.port}`));
    let flashArp = new Set(), flashMac = new Set();
    if (_tbUiState.inspPrevDeviceId === deviceId) {
      currArpKeys.forEach(k => { if (!_tbUiState.inspPrevArpKeys.has(k)) flashArp.add(k); });
      currMacKeys.forEach(k => { if (!_tbUiState.inspPrevMacKeys.has(k)) flashMac.add(k); });
    }
    _tbUiState.inspPrevArpKeys = currArpKeys;
    _tbUiState.inspPrevMacKeys = currMacKeys;
    _tbUiState.inspPrevDeviceId = deviceId;
  
    // Device-role metadata
    let typeLabel = dev.type || '';
    try {
      if (typeof TB_DEVICE_TYPES !== 'undefined' && TB_DEVICE_TYPES[dev.type]) {
        typeLabel = TB_DEVICE_TYPES[dev.type].label || dev.type;
      }
    } catch (_) {}
    const hostname = dev.hostname || dev.type || dev.id;
    const isSwitch = _tbInspDeviceIsSwitch(dev);
    const hasL3 = _tbInspDeviceHasL3(dev);
    const isDhcpServer = _tbInspDeviceIsDhcpServer(dev);
    const ifaceCount = Array.isArray(dev.interfaces) ? dev.interfaces.length : 0;
  
    // ── Routing section ──
    let routingHtml;
    if (hasL3 && !isSwitch) {
      routingHtml = _tbInspAccSection('\ud83d\uddfa', 'Routing Table',
        Array.isArray(dev.routingTable) ? dev.routingTable.length : 0,
        _tbRenderInspRouting(dev, null));
    } else if (isSwitch && !hasL3) {
      routingHtml = _tbInspAccSection('\ud83d\uddfa', 'Routing Table', 'n/a',
        _tbInspInapplicable('Not applicable — this is an L2 switch (it forwards at Layer 2 only). Routers and L3 switches maintain routing tables.'));
    } else {
      // Host, endpoint, etc. — usually has a default gateway, no full table
      routingHtml = _tbInspAccSection('\ud83d\uddfa', 'Routing Table',
        Array.isArray(dev.routingTable) ? dev.routingTable.length : 0,
        _tbRenderInspRouting(dev, null));
    }
  
    // ── ARP section ──
    const arpHtml = _tbInspAccSection('\ud83d\udcc7', 'ARP Cache',
      arpRows.length,
      _tbRenderInspArp(dev, flashArp));
  
    // ── MAC table section ──
    let macHtml;
    if (isSwitch) {
      macHtml = _tbInspAccSection('\ud83d\udd00', 'MAC Address Table',
        macRows.length,
        _tbRenderInspMac(dev, flashMac));
    } else {
      macHtml = _tbInspAccSection('\ud83d\udd00', 'MAC Address Table', 'n/a',
        _tbInspInapplicable(`Not applicable \u2014 ${hostname} is an L3 / host device. L2 switches maintain a MAC-to-port forwarding table; click a switch on the canvas to see one.`));
    }
  
    // ── DHCP Leases / Config section ──
    let dhcpHtml;
    if (isDhcpServer) {
      dhcpHtml = _tbInspAccSection('\ud83c\udf10', 'DHCP Configuration', 'pool',
        _tbRenderInspDhcp(dev));
    } else {
      dhcpHtml = _tbInspAccSection('\ud83c\udf10', 'DHCP Leases', '\u2014',
        _tbInspInapplicable(`Not applicable \u2014 ${hostname} is not a DHCP server. Click a device with an active DHCP pool to see its configuration.`));
    }
  
    // ── Editorial head (mockup matches) ──
    const headHtml = `
      <div class="tb-insp-head-block">
        <div class="tb-insp-eyebrow">Inspector \u00b7 live state</div>
        <div class="tb-insp-title">${_tbInspEsc(hostname)}</div>
        <div class="tb-insp-sub">${_tbInspEsc(typeLabel)} \u00b7 ${ifaceCount} interface${ifaceCount === 1 ? '' : 's'}</div>
      </div>`;
  
    el.innerHTML = `
      ${headHtml}
      ${routingHtml}
      ${arpHtml}
      ${macHtml}
      ${dhcpHtml}
      <div class="tb-insp-footer">
        <button type="button" class="tb-v3-inspect-edit" onclick="tbOpenConfigPanel(tbV3InspectedDeviceId)">Open full config &rarr;</button>
      </div>`;
  }
  
  // Show/hide the big floating "Wiring..." banner based on tbPendingCableFrom.
  function tbUpdateWireOverlay() {
    const el = document.getElementById('tb-wire-overlay');
    if (!el) return;
    el.classList.toggle('is-hidden', !tbPendingCableFrom);
  }
  
  // ══════════════════════════════════════════
  // TOPOLOGY BUILDER TIER 2 — Auto-Grader + Scenarios + PNG Export
  // ══════════════════════════════════════════
  
  // ── Graph helpers used by the rules engine ──
  function tbNeighborsOf(state, deviceId) {
    return state.cables
      .filter(c => c.from === deviceId || c.to === deviceId)
      .map(c => state.devices.find(d => d.id === (c.from === deviceId ? c.to : c.from)))
      .filter(Boolean);
  }
  function tbHasType(state, type) { return state.devices.some(d => d.type === type); }
  function tbDevicesOfType(state, type) { return state.devices.filter(d => d.type === type); }
  function tbIsConnectedTo(state, deviceId, type) {
    return tbNeighborsOf(state, deviceId).some(d => d.type === type);
  }
  function tbIsPublicType(type) { return type && type.indexOf('public-') === 0; }
  
  // ── Rules engine ──
  // severity: 'critical' (-20), 'warning' (-10), 'info' (-5)
  // test(state) must return true if the rule passes.
  const TB_GRADE_RULES = [
    {
      id: 'min-devices',
      severity: 'info',
      label: 'At least 3 devices placed',
      hint: 'A useful study topology has at least a handful of devices to reason about.',
      test: s => s.devices.length >= 3,
    },
    {
      id: 'no-orphans',
      severity: 'warning',
      label: 'No orphan devices (every device wired to something)',
      hint: 'Every placed device should be connected to at least one cable. Orphan devices look like mistakes.',
      test: s => s.devices.every(d => tbNeighborsOf(s, d.id).length > 0),
    },
    {
      id: 'has-firewall',
      severity: 'critical',
      label: 'At least one firewall present',
      hint: 'A defensible network design needs a firewall to enforce trust boundaries.',
      test: s => tbHasType(s, 'firewall'),
    },
    {
      id: 'cloud-behind-firewall',
      severity: 'critical',
      label: 'Internet/cloud node wired directly to a firewall',
      hint: 'The WAN/cloud must connect through a firewall. Never directly to a switch or endpoint.',
      test: s => {
        const clouds = tbDevicesOfType(s, 'cloud');
        if (!clouds.length) return true;
        return clouds.every(c => tbIsConnectedTo(s, c.id, 'firewall'));
      },
    },
    {
      id: 'dmz-exists-if-public',
      severity: 'critical',
      label: 'DMZ switch present when public servers exist',
      hint: 'Public-facing services need a DMZ switch of their own — a regular internal switch is not isolation.',
      test: s => {
        const hasPublics = s.devices.some(d => tbIsPublicType(d.type));
        return !hasPublics || tbHasType(s, 'dmz-switch');
      },
    },
    {
      id: 'public-on-dmz',
      severity: 'critical',
      label: 'Public servers sit on a DMZ switch (not an internal switch)',
      hint: 'Wire public-web/file/cloud servers to a dmz-switch, not a regular switch, to keep them in the screened subnet.',
      test: s => {
        const publics = s.devices.filter(d => tbIsPublicType(d.type));
        if (!publics.length) return true;
        return publics.every(p => {
          const neighbors = tbNeighborsOf(s, p.id);
          if (!neighbors.length) return false;
          const onDmz = neighbors.some(n => n.type === 'dmz-switch');
          const onRegularSwitch = neighbors.some(n => n.type === 'switch');
          return onDmz && !onRegularSwitch;
        });
      },
    },
    {
      id: 'dmz-behind-firewall',
      severity: 'critical',
      label: 'DMZ switch wired to a firewall',
      hint: 'The DMZ must sit behind a firewall so inbound traffic can be inspected before reaching public servers.',
      test: s => {
        const dmzs = tbDevicesOfType(s, 'dmz-switch');
        if (!dmzs.length) return true;
        return dmzs.every(d => tbIsConnectedTo(s, d.id, 'firewall'));
      },
    },
    {
      id: 'internal-behind-firewall',
      severity: 'warning',
      label: 'Internal switch reaches the WAN through a firewall or router',
      hint: 'Your internal LAN should never wire straight to the cloud. Put a firewall or router in the path.',
      test: s => {
        const sws = tbDevicesOfType(s, 'switch');
        if (!sws.length) return true;
        return sws.every(sw => tbIsConnectedTo(s, sw.id, 'firewall') || tbIsConnectedTo(s, sw.id, 'router'));
      },
    },
    {
      id: 'wlc-wired-to-wap',
      severity: 'warning',
      label: 'WLC has line-of-sight to at least one WAP',
      hint: 'A wireless LAN controller is only useful if it can reach the APs it manages (directly or via a switch).',
      test: s => {
        const wlcs = tbDevicesOfType(s, 'wlc');
        if (!wlcs.length) return true;
        return wlcs.every(w => {
          if (tbIsConnectedTo(s, w.id, 'wap')) return true;
          // 2-hop: WLC → switch → WAP
          const neighbors = tbNeighborsOf(s, w.id);
          return neighbors.some(n => tbNeighborsOf(s, n.id).some(nn => nn.type === 'wap'));
        });
      },
    },
    {
      id: 'lb-fronts-servers',
      severity: 'warning',
      label: 'Load balancer fronts at least 2 servers',
      hint: 'A load balancer with fewer than 2 backends has nothing to balance — add more servers or drop the LB.',
      test: s => {
        const lbs = tbDevicesOfType(s, 'load-balancer');
        if (!lbs.length) return true;
        return lbs.every(lb => {
          const neighbors = tbNeighborsOf(s, lb.id);
          const serverCount = neighbors.filter(n => n.type === 'server' || tbIsPublicType(n.type)).length;
          return serverCount >= 2;
        });
      },
    },
    {
      id: 'ids-positioned',
      severity: 'info',
      label: 'IDS/IPS positioned on a monitored path',
      hint: 'Park the IDS/IPS next to a firewall, router, or internal switch so it can see the traffic it is monitoring.',
      test: s => {
        const idss = tbDevicesOfType(s, 'ids');
        if (!idss.length) return true;
        return idss.every(i => {
          const neighbors = tbNeighborsOf(s, i.id);
          return neighbors.some(n => n.type === 'firewall' || n.type === 'switch' || n.type === 'router');
        });
      },
    },
    {
      id: 'endpoints-on-internal',
      severity: 'warning',
      label: 'Endpoints (PC, printer, VoIP, IoT) live on the internal LAN, not the DMZ',
      hint: 'User endpoints belong on the internal switch. Parking them on the DMZ switch exposes them to the internet.',
      test: s => {
        const endpoints = s.devices.filter(d => ['pc', 'printer', 'voip', 'iot'].indexOf(d.type) >= 0);
        return endpoints.every(e => {
          const neighbors = tbNeighborsOf(s, e.id);
          if (!neighbors.length) return true; // orphan rule catches this
          return !neighbors.some(n => n.type === 'dmz-switch');
        });
      },
    },
    // ── Cloud networking rules ──
    {
      id: 'igw-on-vpc',
      severity: 'critical',
      label: 'Internet Gateway must be connected to a VPC',
      hint: 'Wire the Internet Gateway directly to the VPC device it serves.',
      test: s => {
        const igws = s.devices.filter(d => d.type === 'igw');
        if (!igws.length) return true;
        return igws.every(igw => tbNeighborsOf(s, igw.id).some(n => n.type === 'vpc'));
      },
    },
    {
      id: 'nat-gw-needs-subnet',
      severity: 'warning',
      label: 'NAT Gateway should be connected to a Cloud Subnet',
      hint: 'Place the NAT Gateway in a public subnet so private subnets can reach the internet.',
      test: s => {
        const nats = s.devices.filter(d => d.type === 'nat-gw');
        if (!nats.length) return true;
        return nats.every(ng => tbNeighborsOf(s, ng.id).some(n => n.type === 'cloud-subnet'));
      },
    },
    {
      id: 'vpg-has-peer',
      severity: 'warning',
      label: 'VPN Gateway should be connected to an On-Prem DC',
      hint: 'Wire the VPN Gateway to an On-Prem Data Center to establish the IPSec tunnel.',
      test: s => {
        const vpgs = s.devices.filter(d => d.type === 'vpg');
        if (!vpgs.length) return true;
        return vpgs.every(v => tbNeighborsOf(s, v.id).some(n => n.type === 'onprem-dc'));
      },
    },
    {
      id: 'tgw-connects-vpcs',
      severity: 'info',
      label: 'Transit Gateway should connect 2+ VPCs',
      hint: 'The Transit Gateway is a hub — it should bridge multiple VPCs together.',
      test: s => {
        const tgws = s.devices.filter(d => d.type === 'tgw');
        if (!tgws.length) return true;
        return tgws.every(t => tbNeighborsOf(s, t.id).filter(n => n.type === 'vpc').length >= 2);
      },
    },
    {
      id: 'cloud-has-sg',
      severity: 'warning',
      label: 'Cloud instances should have Security Groups',
      hint: 'Add at least one Security Group to control inbound/outbound traffic at the instance level.',
      test: s => {
        const cloudInst = s.devices.filter(d => ['vpc','cloud-subnet','igw','nat-gw','tgw','vpg','sase-edge'].indexOf(d.type) >= 0);
        if (!cloudInst.length) return true;
        return cloudInst.some(d => d.securityGroups && d.securityGroups.length > 0);
      },
    },
    {
      id: 'subnet-has-nacl',
      severity: 'info',
      label: 'Cloud Subnets should have NACL rules',
      hint: 'Configure Network ACLs on subnets for stateless perimeter filtering.',
      test: s => {
        const subs = s.devices.filter(d => d.type === 'cloud-subnet');
        if (!subs.length) return true;
        return subs.every(d => d.nacls && d.nacls.length > 0);
      },
    },
    {
      id: 'bgp-has-neighbor',
      severity: 'warning',
      label: 'BGP routers should have at least one neighbor',
      hint: 'BGP needs at least one neighbor configured to exchange routes. Add a neighbor IP and remote AS.',
      test: s => {
        const bgpRouters = s.devices.filter(d => d.bgpConfig?.enabled);
        if (!bgpRouters.length) return true;
        return bgpRouters.every(d => d.bgpConfig.neighbors.length > 0);
      },
    },
    {
      id: 'switch-has-snooping',
      severity: 'info',
      label: 'Switches should have DHCP Snooping enabled',
      hint: 'DHCP Snooping prevents rogue DHCP servers from poisoning clients.',
      test: s => {
        const switches = s.devices.filter(d => d.type.indexOf('switch') >= 0);
        if (!switches.length) return true;
        return switches.some(d => d.dhcpSnooping?.enabled);
      },
    },
    {
      id: 'dnssec-on-dns',
      severity: 'info',
      label: 'DNS servers should have DNSSEC enabled',
      hint: 'DNSSEC validates DNS responses with digital signatures, preventing cache poisoning.',
      test: s => {
        const dnsDevs = s.devices.filter(d => d.type === 'dns-server');
        if (!dnsDevs.length) return true;
        return dnsDevs.some(d => d.dnssecEnabled);
      },
    },
  ];
  
  const TB_ALL_RULE_IDS = TB_GRADE_RULES.map(r => r.id);
  
  // ── Scenario catalog ──
  // `ruleIds` picks which rules apply (free build = all).
  // `requires` adds per-device-count hard requirements (also counted as critical failures).
  // `type: 'public-*'` matches any public-web/file/cloud.
  const TB_SCENARIOS = [
    {
      id: 'free',
      title: 'Free Build',
      description: 'Design anything you like. The grader applies every baseline design rule.',
      requirements: [
        'Place any devices from the palette and wire them',
        'All general design rules apply (firewall, DMZ, placement, etc.)',
      ],
      ruleIds: TB_ALL_RULE_IDS,
      requires: [],
    },
    {
      id: 'small-office',
      title: 'Small Office',
      description: 'A small business with internet access, a firewall, and a handful of PCs + a printer on the internal LAN.',
      autoBuild: (state) => {
        const isp  = _tbMkDev({ type: 'cloud',    x: 700, y: 120, hostname: 'ISP' });
        const fw   = _tbMkDev({ type: 'firewall', x: 700, y: 320, hostname: 'Edge-FW', ip: '203.0.113.2' });
        const sw   = _tbMkDev({ type: 'switch',   x: 700, y: 520, hostname: 'LAN-SW' });
        const pc1  = _tbMkDev({ type: 'pc',       x: 400, y: 720, hostname: 'PC-01',   ip: '192.168.10.101', gateway: '192.168.10.1' });
        const pc2  = _tbMkDev({ type: 'pc',       x: 620, y: 720, hostname: 'PC-02',   ip: '192.168.10.102', gateway: '192.168.10.1' });
        const pc3  = _tbMkDev({ type: 'pc',       x: 840, y: 720, hostname: 'PC-03',   ip: '192.168.10.103', gateway: '192.168.10.1' });
        const prn  = _tbMkDev({ type: 'printer',  x: 1060,y: 720, hostname: 'Printer', ip: '192.168.10.200', gateway: '192.168.10.1' });
        state.devices.push(isp, fw, sw, pc1, pc2, pc3, prn);
        state.cables.push(
          _tbMkCable(isp, fw),
          _tbMkCable(fw, sw),
          _tbMkCable(sw, pc1), _tbMkCable(sw, pc2), _tbMkCable(sw, pc3), _tbMkCable(sw, prn),
        );
      },
      requirements: [
        'Cloud/WAN → Firewall → Internal switch',
        'At least 2 PCs on the internal switch',
        'At least 1 printer on the internal switch',
        'No public servers required',
      ],
      ruleIds: ['min-devices', 'no-orphans', 'has-firewall', 'cloud-behind-firewall', 'internal-behind-firewall', 'endpoints-on-internal'],
      requires: [
        { type: 'cloud',    min: 1 },
        { type: 'firewall', min: 1 },
        { type: 'switch',   min: 1 },
        { type: 'pc',       min: 2 },
        { type: 'printer',  min: 1 },
      ],
      explanation: {
        overview: 'The canonical small-business network: a single internet connection, a stateful firewall as the security boundary, and an internal LAN switch hosting PCs + a shared printer. Everything behind the firewall is trusted; everything outside is untrusted. No DMZ because this business doesn\'t host any public services.',
        dataFlow: 'PC sends a web request. Traffic hits the internal switch → forwarded to the firewall. Firewall checks its stateful rule table: outbound to TCP 443 is allowed. NAT rewrites the source IP to the firewall\'s public IP. Packet exits to the ISP. Reply comes back → firewall\'s state table recognises it as return traffic → forwards to the requesting PC. Inbound connections from the internet are default-denied.',
        keyDevices: [
          { name: 'Cloud / WAN', role: 'The ISP\'s edge — the untrusted side of the world.' },
          { name: 'Firewall', role: 'Security boundary. Stateful inspection. NAT + default-deny inbound.' },
          { name: 'Internal Switch', role: 'L2 LAN backbone. Every internal device plugs in here.' },
          { name: 'PCs + Printer', role: 'Office endpoints. All on the same broadcast domain.' },
        ],
        concepts: [
          { term: 'Stateful firewall', meaning: 'Tracks each connection in a state table. Return traffic is automatically allowed; new inbound is denied by default.' },
          { term: 'NAT boundary', meaning: 'The firewall hides all internal private IPs behind its single public IP — same idea as a home router, just more capable.' },
          { term: 'Flat LAN', meaning: 'One broadcast domain. Fine for <30 devices. Beyond that you want VLANs to reduce broadcast traffic.' },
          { term: 'Default-deny inbound', meaning: 'Industry standard. Nothing from the internet reaches the internal LAN unless you explicitly allow it.' },
        ],
        examTies: 'N10-009 1.4 (NAT, RFC 1918), 2.4 (firewall types — stateful), 4.1 (perimeter security), 4.3 (principle of least privilege)',
      },
      // v4.69.0 Phase 4 — Small Office tour (4 steps). Bridges Home Network
      // (no firewall appliance) and the Enterprise tour (full defense in depth).
      tour: [
        {
          title: 'Small Office',
          body: 'The canonical small-business network — internet → firewall → one switch, a handful of PCs and a shared printer. No DMZ, no internal segmentation, no complexity. This is what most offices below ~30 people run.',
          camera: { position: [28, 26, 36], target: [-7, 2, -2], durationMs: 1200 },
          highlight: [],
          durationMs: 12000
        },
        {
          title: 'The security boundary',
          body: 'Every packet in or out crosses this firewall. Stateful rules + NAT: outbound traffic allowed and remembered; inbound connections default-denied unless they\'re return traffic for a known session. That\'s the SMB security posture in one sentence.',
          camera: { position: [10, 12, 10], target: [-8, 2, -9], durationMs: 1200 },
          highlight: ['Edge-FW'],
          durationMs: 13000
        },
        {
          title: 'The flat LAN',
          body: 'One switch, one /24 subnet, one broadcast domain. All endpoints share the same default gateway. Simple, fast, flat — easy to manage, cheap to run. The tradeoff: no internal segmentation means any compromised endpoint can scan every other endpoint unimpeded.',
          camera: { position: [0, 12, 22], target: [-7, 2, 4], durationMs: 1300 },
          highlight: ['LAN-SW', 'PC-01', 'PC-02', 'PC-03', 'Printer'],
          durationMs: 15000
        },
        {
          title: 'Remember for the exam',
          body: 'SMB = trust inside / distrust outside, a single stateful firewall, no DMZ, no internal segmentation. When an exam question says "small office" or "SOHO-plus", this flat-LAN-behind-a-firewall is the expected shape. N10-009 2.4 (firewall placement) + 4.1 (perimeter security).',
          camera: { position: [-28, 26, 36], target: [-7, 2, -2], durationMs: 1300 },
          highlight: ['Edge-FW'],
          durationMs: 14000
        }
      ],
    },
    {
      id: 'dmz',
      title: 'DMZ / Screened Subnet',
      description: 'A network with public-facing servers segregated from the internal LAN by a DMZ switch.',
      autoBuild: (state) => {
        const isp  = _tbMkDev({ type: 'cloud',        x: 700, y: 120, hostname: 'Internet' });
        const fw   = _tbMkDev({ type: 'firewall',     x: 700, y: 320, hostname: 'Perimeter-FW' });
        const dmzsw = _tbMkDev({ type: 'dmz-switch',  x: 400, y: 520, hostname: 'DMZ-SW' });
        const web  = _tbMkDev({ type: 'public-web',   x: 280, y: 720, hostname: 'web.example.com', ip: '203.0.113.10' });
        const file = _tbMkDev({ type: 'public-file',  x: 520, y: 720, hostname: 'ftp.example.com', ip: '203.0.113.11' });
        const insw = _tbMkDev({ type: 'switch',       x: 1000,y: 520, hostname: 'Internal-SW' });
        const pc1  = _tbMkDev({ type: 'pc',           x: 880, y: 720, hostname: 'PC-01',   ip: '10.1.10.101', gateway: '10.1.10.1' });
        const pc2  = _tbMkDev({ type: 'pc',           x: 1100,y: 720, hostname: 'PC-02',   ip: '10.1.10.102', gateway: '10.1.10.1' });
        const prn  = _tbMkDev({ type: 'printer',      x: 1320,y: 720, hostname: 'Printer', ip: '10.1.10.200', gateway: '10.1.10.1' });
        state.devices.push(isp, fw, dmzsw, web, file, insw, pc1, pc2, prn);
        state.cables.push(
          _tbMkCable(isp, fw),
          _tbMkCable(fw, dmzsw), _tbMkCable(dmzsw, web), _tbMkCable(dmzsw, file),
          _tbMkCable(fw, insw, 'cat6', 1), _tbMkCable(insw, pc1), _tbMkCable(insw, pc2), _tbMkCable(insw, prn),
        );
      },
      requirements: [
        'Cloud/WAN → Firewall → DMZ switch with public servers',
        'DMZ switch → Firewall → Internal switch (screened subnet)',
        'At least one public-web, public-file, or public-cloud server',
        'Internal endpoints live only on the internal switch',
      ],
      ruleIds: ['min-devices', 'no-orphans', 'has-firewall', 'cloud-behind-firewall', 'dmz-exists-if-public', 'public-on-dmz', 'dmz-behind-firewall', 'internal-behind-firewall', 'endpoints-on-internal'],
      requires: [
        { type: 'cloud',      min: 1 },
        { type: 'firewall',   min: 1 },
        { type: 'dmz-switch', min: 1 },
        { type: 'switch',     min: 1 },
        { type: 'public-*',   min: 1 },
      ],
      explanation: {
        overview: 'A DMZ (Demilitarized Zone) — also called a screened subnet — segregates public-facing servers from the internal LAN. Internet traffic hits the firewall, is filtered, then routed to a dedicated DMZ switch hosting only public servers (web, mail, public DNS). A SECOND filter between the DMZ and the internal LAN means a compromised DMZ server can\'t directly reach internal workstations.',
        dataFlow: 'External user requests your website. Internet → firewall (rule: TCP 443 allowed to DMZ). Firewall forwards to the DMZ switch. DMZ switch delivers to the public web server. If that web server is ever compromised, the attacker is trapped in the DMZ — the firewall\'s internal-facing rules default-deny traffic from DMZ to LAN. Internal users reach the DMZ through the firewall too, just via separate rules.',
        keyDevices: [
          { name: 'Cloud / WAN', role: 'Untrusted. Anyone on the internet.' },
          { name: 'Firewall', role: 'Dual-homed: one interface to DMZ, one to internal LAN. Enforces DMZ-isolation rules.' },
          { name: 'DMZ Switch', role: 'Dedicated L2 domain for public servers. Deliberately kept separate from the internal switch.' },
          { name: 'Public Servers (web/file/cloud)', role: 'Internet-reachable. Live in the DMZ only — never on the internal LAN.' },
          { name: 'Internal Switch + PCs', role: 'Trusted side. Reachable only through additional firewall filtering.' },
        ],
        concepts: [
          { term: 'Screened subnet', meaning: 'Modern name for DMZ. The public zone sits between two levels of firewall filtering.' },
          { term: 'Zone segmentation', meaning: 'Three zones (untrusted/DMZ/trusted) with explicit rules between them. Containment by design.' },
          { term: 'Blast radius', meaning: 'If a DMZ web server is popped, the attacker can\'t pivot to internal workstations without breaking a second firewall.' },
          { term: 'Public-facing server placement', meaning: 'Public servers belong in the DMZ. Ever finding one on the internal LAN is a real-world red flag.' },
        ],
        examTies: 'N10-009 2.4 (firewall placement, DMZ/screened subnet), 4.1 (network segmentation), 4.3 (defense-in-depth)',
      },
      // v4.67.0 Phase 4 — DMZ guided tour. Five steps covering zones →
      // perimeter → DMZ containment → internal separation → exam takeaway.
      // Device hostnames to highlight must match the scenario's autoBuild
      // (Internet, Perimeter-FW, DMZ-SW, web.example.com, ftp.example.com,
      // Internal-SW, PC-01, PC-02, Printer).
      tour: [
        {
          title: 'DMZ / Screened Subnet',
          body: 'A classic defense-in-depth layout. Three security zones — the untrusted internet, a DMZ hosting public-facing servers, and the trusted internal LAN. The firewall in the middle enforces what can cross between them.',
          camera: { position: [36, 30, 42], target: [-4, 2, -4], durationMs: 1200 },
          highlight: [],
          durationMs: 11000
        },
        {
          title: 'The perimeter',
          body: 'Every packet from the internet hits this firewall first. It\'s dual-homed — one interface faces the DMZ, one faces the internal LAN. Different rules apply to each direction. This is where zone policy lives.',
          camera: { position: [12, 14, 12], target: [-8, 2, -12], durationMs: 1200 },
          highlight: ['Internet', 'Perimeter-FW'],
          durationMs: 14000
        },
        {
          title: 'The DMZ',
          body: 'The DMZ is a deliberately exposed zone. Public-facing servers — web, FTP, mail — live here. If a DMZ host is ever compromised, the attacker is trapped. Pivoting to the internal LAN requires breaking the firewall a second time. That\'s the whole point of this architecture.',
          camera: { position: [-4, 14, 18], target: [-20, 2, 4], durationMs: 1300 },
          highlight: ['DMZ-SW', 'web.example.com', 'ftp.example.com'],
          durationMs: 17000
        },
        {
          title: 'The trusted inside',
          body: 'Internal endpoints — user PCs, printers, file shares — live on the internal switch. They never share a broadcast domain with the DMZ. Even when an internal user wants the web server, their request still goes through the firewall, just like the internet does.',
          camera: { position: [28, 14, 22], target: [10, 2, 4], durationMs: 1300 },
          highlight: ['Internal-SW', 'PC-01', 'PC-02', 'Printer'],
          durationMs: 14000
        },
        {
          title: 'Remember for the exam',
          body: 'A public-facing server on the internal LAN is a red flag. They belong in the DMZ, behind a firewall, isolated by policy. "Screened subnet" is just the newer textbook name for DMZ — same concept. N10-009 tests this under network segmentation + defense-in-depth.',
          camera: { position: [-32, 28, 40], target: [-4, 2, -4], durationMs: 1300 },
          highlight: ['Perimeter-FW'],
          durationMs: 14000
        }
      ],
    },
    {
      id: 'enterprise',
      title: 'Enterprise w/ IDS + Load Balancer',
      description: 'Enterprise-grade screened subnet with IDS/IPS monitoring and a load balancer fronting multiple servers.',
      autoBuild: (state) => {
        const isp  = _tbMkDev({ type: 'cloud',         x: 700, y: 100, hostname: 'Internet' });
        const fw1  = _tbMkDev({ type: 'firewall',      x: 700, y: 280, hostname: 'Perimeter-FW' });
        const ids  = _tbMkDev({ type: 'ids',           x: 960, y: 280, hostname: 'IDS/IPS' });
        const dmzsw = _tbMkDev({ type: 'dmz-switch',   x: 400, y: 460, hostname: 'DMZ-SW' });
        const lb   = _tbMkDev({ type: 'load-balancer', x: 400, y: 620, hostname: 'App-LB', ip: '203.0.113.20' });
        const srv1 = _tbMkDev({ type: 'server',        x: 240, y: 780, hostname: 'Web-01', ip: '10.100.1.10' });
        const srv2 = _tbMkDev({ type: 'server',        x: 400, y: 820, hostname: 'Web-02', ip: '10.100.1.11' });
        const srv3 = _tbMkDev({ type: 'server',        x: 560, y: 780, hostname: 'Web-03', ip: '10.100.1.12' });
        const fw2  = _tbMkDev({ type: 'firewall',      x: 1000,y: 460, hostname: 'Internal-FW' });
        const insw = _tbMkDev({ type: 'switch',        x: 1000,y: 640, hostname: 'Internal-SW' });
        const pc1  = _tbMkDev({ type: 'pc',            x: 880, y: 820, hostname: 'PC-01', ip: '10.1.10.101', gateway: '10.1.10.1' });
        const pc2  = _tbMkDev({ type: 'pc',            x: 1120,y: 820, hostname: 'PC-02', ip: '10.1.10.102', gateway: '10.1.10.1' });
        state.devices.push(isp, fw1, ids, dmzsw, lb, srv1, srv2, srv3, fw2, insw, pc1, pc2);
        state.cables.push(
          _tbMkCable(isp, fw1),
          _tbMkCable(fw1, ids, 'cat6', 1),
          _tbMkCable(fw1, dmzsw, 'cat6', 2), _tbMkCable(dmzsw, lb), _tbMkCable(lb, srv1), _tbMkCable(lb, srv2, 'cat6', 2), _tbMkCable(lb, srv3, 'cat6', 3),
          _tbMkCable(fw1, fw2, 'cat6', 3), _tbMkCable(fw2, insw, 'cat6', 1), _tbMkCable(insw, pc1), _tbMkCable(insw, pc2),
        );
      },
      requirements: [
        'Everything from the DMZ scenario',
        'IDS/IPS positioned next to a firewall, switch, or router',
        'Load balancer fronting at least 2 servers',
      ],
      ruleIds: TB_ALL_RULE_IDS,
      requires: [
        { type: 'cloud',         min: 1 },
        { type: 'firewall',      min: 2 },
        { type: 'dmz-switch',    min: 1 },
        { type: 'switch',        min: 1 },
        { type: 'ids',           min: 1 },
        { type: 'load-balancer', min: 1 },
        { type: 'server',        min: 2 },
      ],
      explanation: {
        overview: 'An enterprise-grade screened-subnet design — DMZ plus active threat detection (IDS/IPS) plus high availability (load balancer fronting multiple servers). You see this shape at mid-sized companies where uptime + compliance + active monitoring all matter, and where a single server going down can\'t take the site with it.',
        dataFlow: 'External request hits the outer firewall → filtered → arrives at the load balancer. LB picks a healthy backend (round-robin, least-connections, or weighted) and forwards. IDS/IPS tap is observing traffic inline or via SPAN port — alerts on anomalies or drops malicious payloads. Backend server handles the request. Response flows back through LB (return path often flows through LB too, depending on mode). Internal LAN traffic passes through a separate second firewall, enforcing least-privilege between DMZ and internal zones.',
        keyDevices: [
          { name: 'Two Firewalls', role: 'Perimeter + internal. The "two-legged" screened subnet pattern. Different rulesets per leg.' },
          { name: 'IDS/IPS', role: 'Intrusion Detection / Prevention. Sits inline (IPS) or observing (IDS) on a SPAN port. Signatures + anomaly-based alerts.' },
          { name: 'Load Balancer', role: 'Fronts 2+ servers. Health-checks them. Spreads load. TLS termination often lives here too.' },
          { name: 'Multiple Servers', role: 'Horizontal scaling. Any one can die — users never notice.' },
          { name: 'DMZ + Internal Switches', role: 'Two separate L2 domains enforced by firewall between them.' },
        ],
        concepts: [
          { term: 'IDS vs IPS', meaning: 'IDS alerts only (passive). IPS blocks actively (inline). Every real enterprise runs IPS today.' },
          { term: 'Load balancing modes', meaning: 'Round-robin, least-connections, weighted, IP-hash. Each suits different workloads.' },
          { term: 'High availability', meaning: 'No single point of failure: two firewalls, two servers, redundant links. Expected at enterprise scale.' },
          { term: 'Defense in depth', meaning: 'Layered controls: perimeter firewall → IDS/IPS → DMZ isolation → internal firewall → host hardening. Never rely on one layer.' },
        ],
        examTies: 'N10-009 2.4 (IDS/IPS placement, load balancer concepts), 4.1 (defense in depth), 4.3 (network access control)',
      },
      // v4.68.0 Phase 4 — Enterprise tour (5 steps). Covers IDS/IPS,
      // load balancer + HA, and defense in depth.
      tour: [
        {
          title: 'Enterprise w/ IDS + Load Balancer',
          body: 'Enterprise screened subnet with active monitoring + high availability — the layout you see at mid-sized companies where uptime, compliance, and threat detection all matter. Two firewalls, an IDS/IPS, a load balancer fronting three servers.',
          camera: { position: [40, 32, 44], target: [-9, 2, -4], durationMs: 1200 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'Active threat detection',
          body: 'The perimeter firewall filters by rule. The IDS/IPS watches what passes. An IDS alerts only — signatures, anomaly scores. An IPS actively drops malicious payloads inline. Every real enterprise runs IPS today.',
          camera: { position: [14, 14, 10], target: [-3, 2, -11], durationMs: 1300 },
          highlight: ['Perimeter-FW', 'IDS/IPS'],
          durationMs: 13000
        },
        {
          title: 'Load balancer + server farm',
          body: 'One public IP, three backend servers. The load balancer health-checks each server, distributes incoming connections (round-robin, least-connections, or weighted), and terminates TLS. If Web-02 dies, users never notice — traffic routes to Web-01 and Web-03.',
          camera: { position: [-4, 14, 24], target: [-20, 2, 6], durationMs: 1300 },
          highlight: ['App-LB', 'Web-01', 'Web-02', 'Web-03'],
          durationMs: 14000
        },
        {
          title: 'Two firewalls — defense in depth',
          body: 'Perimeter firewall guards against the internet. Internal firewall guards against the DMZ. Different rulesets per leg. Layered controls mean no single failure compromises the whole network — this is "defense in depth" in one screenshot.',
          camera: { position: [18, 14, 12], target: [-2, 2, -7], durationMs: 1300 },
          highlight: ['Perimeter-FW', 'Internal-FW'],
          durationMs: 13000
        },
        {
          title: 'Remember for the exam',
          body: 'Three things the exam tests here: IDS detects / IPS prevents (passive vs active inline); load balancers provide both scale and HA (any one server can die); defense in depth stacks layered controls (perimeter FW → IDS/IPS → DMZ isolation → internal FW). N10-009 2.4 + 4.1 + 4.3.',
          camera: { position: [-38, 30, 42], target: [-6, 2, -4], durationMs: 1400 },
          highlight: ['IDS/IPS'],
          durationMs: 16000
        }
      ],
    },
    {
      id: 'branch-wireless',
      title: 'Branch Office w/ Wireless',
      description: 'A branch office dominated by wireless — WLC managing multiple WAPs for laptop users.',
      autoBuild: (state) => {
        const isp  = _tbMkDev({ type: 'cloud',     x: 700, y: 120, hostname: 'Internet' });
        const fw   = _tbMkDev({ type: 'firewall',  x: 700, y: 300, hostname: 'Branch-FW' });
        const sw   = _tbMkDev({ type: 'switch',    x: 700, y: 480, hostname: 'Branch-SW' });
        const wlc  = _tbMkDev({ type: 'wlc',       x: 400, y: 640, hostname: 'WLC', ip: '10.10.0.10' });
        const wap1 = _tbMkDev({ type: 'wap',       x: 240, y: 820, hostname: 'WAP-01' });
        const wap2 = _tbMkDev({ type: 'wap',       x: 560, y: 820, hostname: 'WAP-02' });
        const lt1  = _tbMkDev({ type: 'laptop',    x: 140, y: 960, hostname: 'Laptop-01', ip: '10.10.20.101', gateway: '10.10.20.1' });
        const lt2  = _tbMkDev({ type: 'laptop',    x: 340, y: 960, hostname: 'Laptop-02', ip: '10.10.20.102', gateway: '10.10.20.1' });
        const ph1  = _tbMkDev({ type: 'smartphone',x: 480, y: 960, hostname: 'Phone-01',  ip: '10.10.20.103', gateway: '10.10.20.1', iface: 'wlan0' });
        const ph2  = _tbMkDev({ type: 'smartphone',x: 640, y: 960, hostname: 'Phone-02',  ip: '10.10.20.104', gateway: '10.10.20.1', iface: 'wlan0' });
        const pc   = _tbMkDev({ type: 'pc',        x: 1000,y: 640, hostname: 'Reception', ip: '10.10.10.50', gateway: '10.10.10.1' });
        state.devices.push(isp, fw, sw, wlc, wap1, wap2, lt1, lt2, ph1, ph2, pc);
        state.cables.push(
          _tbMkCable(isp, fw),
          _tbMkCable(fw, sw),
          _tbMkCable(sw, wlc), _tbMkCable(wlc, wap1), _tbMkCable(wlc, wap2, 'cat6', 1),
          _tbMkCable(wap1, lt1), _tbMkCable(wap1, ph1),
          _tbMkCable(wap2, lt2), _tbMkCable(wap2, ph2),
          _tbMkCable(sw, pc, 'cat6', 1),
        );
      },
      requirements: [
        'Cloud/WAN → Firewall → Internal switch',
        'WLC connected to the switch, managing at least 2 WAPs',
        'At least 2 PCs on the network',
      ],
      ruleIds: ['min-devices', 'no-orphans', 'has-firewall', 'cloud-behind-firewall', 'internal-behind-firewall', 'wlc-wired-to-wap', 'endpoints-on-internal'],
      requires: [
        { type: 'cloud',    min: 1 },
        { type: 'firewall', min: 1 },
        { type: 'switch',   min: 1 },
        { type: 'wlc',      min: 1 },
        { type: 'wap',      min: 2 },
        { type: 'pc',       min: 2 },
      ],
      explanation: {
        overview: 'A branch office where most users are on Wi-Fi rather than wired. A WLC (Wireless LAN Controller) centrally manages multiple WAPs (Wireless Access Points), pushing consistent SSIDs, security policies, and channel assignments. The WLC sits behind the branch firewall on the internal LAN. Wireless endpoints (laptops, phones) associate with the nearest WAP and seamlessly roam between them.',
        dataFlow: 'Laptop at the branch associates with the nearest WAP (e.g., WAP-02). WAP encapsulates the wireless frame in a CAPWAP tunnel to the WLC. WLC terminates CAPWAP, decrypts, decides the traffic destination. Bridged to the internal switch → firewall (if going to WAN) → outside world. Because all client traffic hairpins through the WLC, policy enforcement (QoS, segmentation, captive portal) is centralized.',
        keyDevices: [
          { name: 'WLC (Wireless LAN Controller)', role: 'Central brain. Manages 2+ WAPs. Pushes SSID configs, authenticates clients, handles roaming.' },
          { name: 'WAPs (Wireless APs)', role: 'Radio transmitters. In controller-based mode they are "lightweight" — dumb radios that phone home to the WLC for everything.' },
          { name: 'Switch', role: 'Wired backbone. WAPs typically get PoE from this switch. WLC also connects here.' },
          { name: 'Firewall', role: 'Edge security. WAN → internal zone boundary.' },
        ],
        concepts: [
          { term: 'CAPWAP', meaning: 'Control And Provisioning of Wireless Access Points. The tunneling protocol between WAP and WLC.' },
          { term: 'Lightweight vs Autonomous AP', meaning: 'Lightweight (with WLC) = centrally managed, easy rollout. Autonomous = standalone, configured individually. Enterprises pick lightweight.' },
          { term: 'Roaming', meaning: 'Laptop moves from WAP-01 to WAP-02 without dropping the session. WLC handles the handoff.' },
          { term: 'PoE (Power over Ethernet)', meaning: 'Switch powers the WAP over the data cable. No separate power brick. Standard is 802.3af/at/bt.' },
        ],
        examTies: 'N10-009 2.3 (802.11 standards, WLC/WAP), 2.7 (PoE standards), 4.1 (wireless security — WPA2/WPA3)',
      },
      // v4.68.0 Phase 4 — Branch Wireless tour (4 steps). Covers WLC
      // architecture + CAPWAP + autonomous-vs-lightweight APs.
      tour: [
        {
          title: 'Branch Office — Wireless',
          body: 'A branch office where most users are wireless. A Wireless LAN Controller centrally manages multiple access points, pushing consistent SSIDs, security policy, and channel plans. One reception PC hangs off the wired side.',
          camera: { position: [32, 32, 50], target: [-13, 2, 0], durationMs: 1200 },
          highlight: [],
          durationMs: 12000
        },
        {
          title: 'The controller',
          body: 'The WLC is the brain. It talks to every WAP via a CAPWAP tunnel — Control And Provisioning of Wireless Access Points. All client traffic hairpins through it, so QoS, captive portal, segmentation — everything centralizes here. One policy, N access points.',
          camera: { position: [0, 14, 20], target: [-20, 2, 3], durationMs: 1300 },
          highlight: ['WLC'],
          durationMs: 14000
        },
        {
          title: 'Lightweight WAPs',
          body: 'These are "lightweight" APs — they don\'t make decisions on their own. They encapsulate every wireless frame in CAPWAP and ship it to the WLC. Clients roam between WAP-01 and WAP-02 seamlessly because the WLC maintains the session.',
          camera: { position: [-8, 14, 32], target: [-18, 2, 12], durationMs: 1300 },
          highlight: ['WAP-01', 'WAP-02', 'Laptop-01', 'Laptop-02', 'Phone-01', 'Phone-02'],
          durationMs: 14000
        },
        {
          title: 'Remember for the exam',
          body: 'Know the difference: autonomous APs make their own decisions; lightweight APs are controlled by a WLC. CAPWAP is the standard control-plane protocol. Seamless roaming requires a controller. N10-009 2.3 (wireless standards + architecture) is where this lands.',
          camera: { position: [-36, 30, 46], target: [-13, 2, 0], durationMs: 1300 },
          highlight: ['WLC', 'WAP-01', 'WAP-02'],
          durationMs: 13000
        }
      ],
    },
    // ── Cloud Networking Scenarios ──
    {
      id: 'cloud-vpc',
      title: 'Cloud VPC Architecture',
      description: 'Design a cloud VPC with public and private subnets, internet gateway, NAT gateway, and security controls.',
      autoBuild: (state) => {
        const cloud = _tbMkDev({ type: 'cloud',        x: 700, y: 100, hostname: 'Internet' });
        const igw   = _tbMkDev({ type: 'igw',          x: 700, y: 260, hostname: 'IGW' });
        const vpc   = _tbMkDev({ type: 'vpc',          x: 700, y: 420, hostname: 'VPC-prod' });
        const pubsn = _tbMkDev({ type: 'cloud-subnet', x: 420, y: 580, hostname: 'public-subnet', ip: '10.0.1.0' });
        const natgw = _tbMkDev({ type: 'nat-gw',       x: 420, y: 740, hostname: 'NAT-GW' });
        const web   = _tbMkDev({ type: 'public-web',   x: 200, y: 740, hostname: 'Web-Server', ip: '10.0.1.10' });
        const privsn = _tbMkDev({ type: 'cloud-subnet',x: 980, y: 580, hostname: 'private-subnet', ip: '10.0.2.0' });
        const app   = _tbMkDev({ type: 'server',       x: 980, y: 740, hostname: 'App-Server', ip: '10.0.2.10' });
        const db    = _tbMkDev({ type: 'server',       x: 1200,y: 740, hostname: 'DB-Server',  ip: '10.0.2.20' });
        state.devices.push(cloud, igw, vpc, pubsn, natgw, web, privsn, app, db);
        state.cables.push(
          _tbMkCable(cloud, igw),
          _tbMkCable(igw, vpc),
          _tbMkCable(vpc, pubsn), _tbMkCable(pubsn, natgw), _tbMkCable(pubsn, web, 'cat6', 1),
          _tbMkCable(vpc, privsn, 'cat6', 1), _tbMkCable(privsn, app), _tbMkCable(privsn, db, 'cat6', 1),
          _tbMkCable(natgw, privsn, 'fiber', 1, 2),
        );
      },
      requirements: [
        'VPC with Internet Gateway for public access',
        'NAT Gateway in public subnet for private outbound',
        'Security groups on cloud resources',
        'At least 2 cloud subnets (public + private)',
      ],
      ruleIds: ['min-devices', 'no-orphans', 'igw-on-vpc', 'nat-gw-needs-subnet', 'cloud-has-sg', 'subnet-has-nacl'],
      requires: [
        { type: 'vpc',          min: 1 },
        { type: 'cloud-subnet', min: 2 },
        { type: 'igw',          min: 1 },
        { type: 'nat-gw',       min: 1 },
      ],
      explanation: {
        overview: 'The "everything" cloud VPC — combines IGW (for public resources) + NAT-GW (for private outbound) + security groups + NACLs. Public subnet for web tier, private subnet for app/DB tier. This is the go-to shape for a typical 3-tier web app in AWS/Azure/GCP.',
        dataFlow: 'External user → public IP → IGW → public subnet → load balancer or web server. Web server calls app tier in private subnet (private IP, internal routing inside the VPC — no IGW needed). App tier needs to pull updates from the internet → uses NAT-GW in the public subnet. Traffic exits through NAT-GW → IGW → internet. Return traffic follows the reverse path. Security groups gate which tiers can call which.',
        keyDevices: [
          { name: 'VPC', role: 'Network boundary. One VPC per environment (prod/dev/test) is a common split.' },
          { name: 'Public Subnet', role: 'Route 0.0.0.0/0 → IGW. Hosts the web tier + NAT-GW.' },
          { name: 'Private Subnet', role: 'No IGW route. Route 0.0.0.0/0 → NAT-GW. Hosts app + DB tiers.' },
          { name: 'Internet Gateway', role: 'Door to the internet. Bidirectional for public subnet.' },
          { name: 'NAT Gateway', role: 'Outbound-only internet for private subnet. Sits in public subnet.' },
        ],
        concepts: [
          { term: 'Public vs Private subnet', meaning: 'Defined by route table: public has route to IGW; private does not.' },
          { term: 'Security Group vs NACL', meaning: 'SG is stateful + at instance level. NACL is stateless + at subnet level. Both enforced.' },
          { term: '3-tier pattern', meaning: 'Web (public) → App (private) → DB (private + isolated). Each tier restricted to only what the next tier sends.' },
          { term: 'Why not put everything in public?', meaning: 'Blast radius. If your DB is in a private subnet with no IGW route, a misconfigured SG can\'t accidentally expose it.' },
        ],
        examTies: 'N10-009 1.8 (cloud networking — VPC, subnets, IGW, NAT-GW, SG, NACL), 4.1 (cloud security)',
      },
      // v4.69.0 Phase 4 — Cloud VPC tour (4 steps). First cloud scenario
      // tour — covers IGW vs NAT-GW + public-vs-private subnet routing.
      tour: [
        {
          title: 'Cloud VPC Architecture',
          body: 'The canonical cloud VPC — a classic 3-tier web app layout. An Internet Gateway, a VPC boundary, a public subnet for the web tier, a private subnet for the app + DB tier. AWS, Azure, and GCP all share this exact shape.',
          camera: { position: [36, 32, 42], target: [-5, 2, -4], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The internet edge',
          body: 'The IGW (Internet Gateway) is the cloud\'s version of a router-plus-public-IP — bidirectional traffic between the VPC and the internet. The VPC itself is just the network boundary; it doesn\'t route anything. Think of it as the cloud equivalent of a layer-3 boundary.',
          camera: { position: [14, 16, 10], target: [-8, 2, -12], durationMs: 1300 },
          highlight: ['Internet', 'IGW', 'VPC-prod'],
          durationMs: 14000
        },
        {
          title: 'Public vs private subnets',
          body: 'Public subnet routes 0.0.0.0/0 → IGW. Holds the web tier and the NAT-GW itself. Private subnet routes 0.0.0.0/0 → NAT-GW instead. Holds the app + DB tiers. Private tier can reach the internet for updates, but the internet cannot reach it. Keeps the blast radius small.',
          camera: { position: [-4, 18, 28], target: [-8, 2, 4], durationMs: 1400 },
          highlight: ['public-subnet', 'private-subnet', 'NAT-GW', 'Web-Server', 'App-Server', 'DB-Server'],
          durationMs: 16000
        },
        {
          title: 'Remember for the exam',
          body: 'Know the two gateways: IGW is bidirectional internet for public subnets; NAT-GW is outbound-only internet for private subnets (and itself lives in a public subnet). Security Groups are stateful instance-level rules; NACLs are stateless subnet-level rules. N10-009 1.8 (cloud concepts + VPC components).',
          camera: { position: [-36, 32, 42], target: [-5, 2, -4], durationMs: 1400 },
          highlight: ['IGW', 'NAT-GW'],
          durationMs: 14000
        }
      ],
    },
    {
      id: 'hybrid-cloud',
      title: 'Hybrid Cloud (VPN)',
      description: 'Connect an on-premises data center to a cloud VPC via IPSec VPN tunnel with matching crypto parameters.',
      autoBuild: (state) => {
        const onprem = _tbMkDev({ type: 'onprem-dc', x: 280, y: 400, hostname: 'HQ-DC', ip: '10.100.0.0' });
        const fw     = _tbMkDev({ type: 'firewall',  x: 500, y: 400, hostname: 'DC-FW' });
        const cloud  = _tbMkDev({ type: 'cloud',     x: 720, y: 200, hostname: 'Internet' });
        const vpg    = _tbMkDev({ type: 'vpg',       x: 940, y: 400, hostname: 'Cloud-VPG' });
        const vpc    = _tbMkDev({ type: 'vpc',       x: 1160,y: 400, hostname: 'VPC-prod' });
        const subnet = _tbMkDev({ type: 'cloud-subnet', x: 1160,y: 600, hostname: 'app-subnet', ip: '10.0.1.0' });
        const app    = _tbMkDev({ type: 'server',    x: 1160,y: 780, hostname: 'Cloud-App', ip: '10.0.1.10' });
        state.devices.push(onprem, fw, cloud, vpg, vpc, subnet, app);
        state.cables.push(
          _tbMkCable(onprem, fw),
          _tbMkCable(fw, cloud, 'cat6', 1),
          _tbMkCable(cloud, vpg, 'fiber', 1),
          _tbMkCable(vpg, vpc),
          _tbMkCable(vpc, subnet),
          _tbMkCable(subnet, app, 'cat6', 1),
        );
      },
      requirements: [
        'On-premises DC with internal network',
        'Cloud VPC with VPN Gateway',
        'IPSec tunnel between VPN GW and On-Prem DC',
        'Matching crypto parameters on both endpoints',
      ],
      ruleIds: ['min-devices', 'no-orphans', 'vpg-has-peer', 'igw-on-vpc'],
      requires: [
        { type: 'vpc',       min: 1 },
        { type: 'vpg',       min: 1 },
        { type: 'onprem-dc', min: 1 },
      ],
      explanation: {
        overview: 'Hybrid cloud connects an on-premises datacenter to a cloud VPC through an IPSec VPN tunnel. On-prem resources (legacy DB, file servers) remain in the physical DC; newer workloads live in the cloud. The VPN makes both halves feel like one network. Crypto parameters (encryption, hash, DH group, lifetime) must match exactly on both ends or the tunnel won\'t come up.',
        dataFlow: 'App in cloud VPC needs to query a database still running on-prem. Outbound packet → VPC\'s VPN Gateway (VPG). VPG encrypts using IPSec (ESP), wraps with tunnel header, forwards to the on-prem firewall/VPN endpoint. On-prem endpoint decrypts, drops into the internal LAN, reaches the DB. DB replies, reverse path. Bandwidth is limited by whichever side is slower (usually the on-prem internet link).',
        keyDevices: [
          { name: 'Cloud VPC', role: 'New workloads live here. Scales elastically.' },
          { name: 'VPN Gateway (VPG)', role: 'The cloud side of the IPSec tunnel. Attached to the VPC.' },
          { name: 'On-Prem DC', role: 'Physical datacenter. Legacy resources that can\'t easily migrate to the cloud.' },
          { name: 'On-prem VPN endpoint', role: 'Firewall or dedicated VPN appliance. Terminates the tunnel on-prem.' },
        ],
        concepts: [
          { term: 'IPSec', meaning: 'Security protocol suite for site-to-site VPNs. Two modes: transport (host-to-host) and tunnel (site-to-site). Hybrid cloud uses tunnel mode.' },
          { term: 'Phase 1 (IKE) + Phase 2 (IPSec)', meaning: 'Phase 1 negotiates encryption for the control channel. Phase 2 negotiates the data channel. Crypto params must match both phases.' },
          { term: 'ESP vs AH', meaning: 'ESP (Encapsulating Security Payload) = encryption + auth. AH (Authentication Header) = auth only. Almost always ESP.' },
          { term: 'DH group + PFS', meaning: 'Diffie-Hellman group controls key strength. Perfect Forward Secrecy regenerates keys — if one is compromised, past traffic stays safe.' },
        ],
        examTies: 'N10-009 1.8 (hybrid cloud model), 4.1 (site-to-site VPN), 4.4 (IPSec / IKE / crypto parameters)',
      },
      // v4.70.0 Phase 4 — Hybrid Cloud tour (4 steps). Most common cloud
      // migration pattern on the exam.
      tour: [
        {
          title: 'Hybrid Cloud (VPN)',
          body: 'On-prem ↔ cloud via an IPsec VPN tunnel — the hybrid pattern most enterprises land on when they migrate partial workloads to cloud. Keeps the datacenter relevant while giving you cloud elasticity. One tunnel, two distinct network worlds bridged.',
          camera: { position: [34, 30, 38], target: [-7, 2, -2], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The on-prem side',
          body: 'Your datacenter with a firewall that speaks IPsec. The firewall\'s WAN interface terminates the VPN tunnel on this end. Same hardware you\'d use for any site-to-site VPN, now pointed at a cloud peer instead of another office.',
          camera: { position: [-2, 14, 14], target: [-20, 2, -6], durationMs: 1300 },
          highlight: ['HQ-DC', 'DC-FW'],
          durationMs: 13000
        },
        {
          title: 'The cloud side',
          body: 'A VPN Gateway (VPG) sits at the VPC edge. Matching IPsec parameters on both sides — Phase 1 (IKE: exchange + encryption + hash + DH group + lifetime) and Phase 2 (ESP: encryption + hash + PFS group + lifetime) must match exactly, or the tunnel won\'t come up. Then the VPC routes like any other subnet.',
          camera: { position: [22, 14, 14], target: [8, 2, 0], durationMs: 1300 },
          highlight: ['Cloud-VPG', 'VPC-prod', 'app-subnet', 'Cloud-App'],
          durationMs: 15000
        },
        {
          title: 'Remember for the exam',
          body: 'The exam point: IPsec is symmetric — if Phase 1 or Phase 2 proposals don\'t match byte-for-byte between peers, the tunnel fails. Hybrid cloud is the single most common cloud-migration pattern. N10-009 1.8 (hybrid cloud model) + 4.1 (site-to-site VPN) + 4.4 (IPsec, IKE, crypto parameters).',
          camera: { position: [-34, 30, 38], target: [-7, 2, -2], durationMs: 1400 },
          highlight: ['DC-FW', 'Cloud-VPG'],
          durationMs: 15000
        }
      ],
    },
    {
      id: 'multi-vpc',
      title: 'Multi-VPC with Transit Gateway',
      description: 'Connect multiple VPCs through a Transit Gateway hub — the cloud equivalent of a backbone router.',
      autoBuild: (state) => {
        const cloud = _tbMkDev({ type: 'cloud', x: 700, y: 100, hostname: 'Internet' });
        const igw   = _tbMkDev({ type: 'igw',   x: 700, y: 260, hostname: 'IGW' });
        const tgw   = _tbMkDev({ type: 'tgw',   x: 700, y: 460, hostname: 'Transit-GW' });
        const vpcA  = _tbMkDev({ type: 'vpc',   x: 360, y: 640, hostname: 'VPC-prod' });
        const snA   = _tbMkDev({ type: 'cloud-subnet', x: 360, y: 820, hostname: 'prod-subnet', ip: '10.1.0.0' });
        const vpcB  = _tbMkDev({ type: 'vpc',   x: 700, y: 660, hostname: 'VPC-shared' });
        const snB   = _tbMkDev({ type: 'cloud-subnet', x: 700, y: 840, hostname: 'shared-subnet', ip: '10.2.0.0' });
        const vpcC  = _tbMkDev({ type: 'vpc',   x: 1040,y: 640, hostname: 'VPC-dev' });
        const snC   = _tbMkDev({ type: 'cloud-subnet', x: 1040,y: 820, hostname: 'dev-subnet', ip: '10.3.0.0' });
        state.devices.push(cloud, igw, tgw, vpcA, snA, vpcB, snB, vpcC, snC);
        state.cables.push(
          _tbMkCable(cloud, igw),
          _tbMkCable(igw, tgw),
          _tbMkCable(tgw, vpcA), _tbMkCable(tgw, vpcB, 'cat6', 1), _tbMkCable(tgw, vpcC, 'cat6', 2),
          _tbMkCable(vpcA, snA), _tbMkCable(vpcB, snB), _tbMkCable(vpcC, snC),
        );
      },
      requirements: [
        'Transit Gateway connecting 2+ VPCs',
        'Each VPC has at least one subnet',
        'Internet Gateway on at least one VPC',
      ],
      ruleIds: ['min-devices', 'no-orphans', 'tgw-connects-vpcs', 'igw-on-vpc', 'cloud-has-sg'],
      requires: [
        { type: 'vpc', min: 2 },
        { type: 'tgw', min: 1 },
        { type: 'cloud-subnet', min: 2 },
        { type: 'igw', min: 1 },
      ],
      explanation: {
        overview: 'A Transit Gateway (TGW) is a hub-and-spoke router for multiple VPCs. Instead of meshing VPCs with O(n²) peering connections, attach each VPC to the TGW once and routing between any pair becomes trivial. This is the default enterprise pattern once you have more than a handful of VPCs.',
        dataFlow: 'Server in VPC-A wants to reach DB in VPC-C. Packet → VPC-A attachment to TGW → TGW routing table decides "VPC-C CIDR → VPC-C attachment" → delivered to VPC-C. TGW essentially acts as a regional backbone router. Unlike peering, this is transitive — VPC-A can also reach VPC-B through the same TGW without an extra link.',
        keyDevices: [
          { name: 'Transit Gateway', role: 'The hub. Connects 2+ VPCs, VPNs, Direct Connect links. Regional scope.' },
          { name: 'VPC Attachments', role: 'Virtual links from each VPC to the TGW. One per VPC.' },
          { name: 'TGW Route Table', role: 'Controls which attachments can reach which. Like a central routing policy.' },
          { name: 'Internet Gateway', role: 'One VPC typically has IGW; shared internet egress via TGW + that VPC.' },
        ],
        concepts: [
          { term: 'Peering vs TGW', meaning: 'Peering = pairwise + non-transitive. TGW = hub-and-spoke + transitive + scales linearly.' },
          { term: 'TGW route tables', meaning: 'Separate routing policies for isolation: dev attachment can\'t talk to prod attachment if their route tables say so.' },
          { term: 'Shared services VPC', meaning: 'Common pattern: one VPC hosts shared services (AD, DNS, file); every other VPC reaches it via TGW.' },
          { term: 'Inter-region peering', meaning: 'TGW can peer with another TGW in a different region. Global network without managing dozens of peerings.' },
        ],
        examTies: 'N10-009 1.8 (cloud connectivity — TGW named as a cloud hub), 3.1 (routing between VPCs)',
      },
      tour: [
        {
          title: 'Multi-VPC with Transit Gateway',
          body: 'Three VPCs — prod, shared, dev — all connecting through a single Transit Gateway (TGW). This is the cloud answer to hub-and-spoke WAN: instead of building N×(N-1)/2 peering links between VPCs, you connect each VPC once to the TGW and let it route between them. One hub, any-to-any routing.',
          camera: { position: [36, 32, 40], target: [0, 2, 0], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The TGW hub',
          body: 'The Transit Gateway is a regional cloud router. Each VPC attaches to it with a single connection; the TGW holds a route table mapping VPC CIDRs to attachments. Adding a new VPC (VPC-staging, VPC-uat) is one attachment + one route entry — not N new peering links. This is why TGW scales where VPC-peering doesn\'t.',
          camera: { position: [0, 16, 14], target: [0, 3, -2], durationMs: 1300 },
          highlight: ['Transit-GW'],
          durationMs: 15000
        },
        {
          title: 'Three VPCs, any-to-any',
          body: 'Prod talks to shared, dev talks to shared, prod talks to dev — all through the TGW in exactly one hop each. IGW sits above the TGW for internet egress (typically via a shared egress VPC with NAT-GW, not shown). CIDRs must not overlap across attached VPCs, or routing breaks.',
          camera: { position: [0, 18, 20], target: [0, 2, 0], durationMs: 1300 },
          highlight: ['VPC-prod', 'VPC-shared', 'VPC-dev', 'Transit-GW'],
          durationMs: 16000
        },
        {
          title: 'Remember for the exam',
          body: 'TGW = cloud transit hub (AWS Transit Gateway, Azure Virtual WAN Hub, GCP Network Connectivity Center). Replaces full-mesh VPC peering at scale. Still requires non-overlapping CIDRs across attachments. Pricing model: per-attachment + per-GB processed — so consolidating to TGW usually beats the peering cost above ~4 VPCs. N10-009 1.8 (cloud connectivity, TGW as cloud hub).',
          camera: { position: [36, 34, 40], target: [0, 2, 0], durationMs: 1400 },
          highlight: ['Transit-GW'],
          durationMs: 15000
        }
      ],
    },
    {
      id: 'sase-arch',
      title: 'SASE Architecture',
      description: 'Design a Secure Access Service Edge with zero trust, SWG, CASB, and FWaaS protecting cloud and on-prem resources.',
      autoBuild: (state) => {
        const lt1   = _tbMkDev({ type: 'laptop',    x: 160, y: 280, hostname: 'Remote-User-01', ip: '' });
        const lt2   = _tbMkDev({ type: 'laptop',    x: 160, y: 480, hostname: 'Remote-User-02', ip: '' });
        const ph1   = _tbMkDev({ type: 'smartphone',x: 160, y: 680, hostname: 'Remote-User-03', iface: 'wlan0' });
        const sase  = _tbMkDev({ type: 'sase-edge', x: 500, y: 480, hostname: 'SASE-Edge (PoP)' });
        const cloud = _tbMkDev({ type: 'cloud',     x: 780, y: 280, hostname: 'Internet' });
        const vpc   = _tbMkDev({ type: 'vpc',       x: 1060,y: 320, hostname: 'Corp-VPC' });
        const app   = _tbMkDev({ type: 'server',    x: 1060,y: 500, hostname: 'SaaS-App', ip: '10.0.1.50' });
        const onprem = _tbMkDev({ type: 'onprem-dc',x: 1060,y: 700, hostname: 'HQ-DC', ip: '10.100.0.0' });
        state.devices.push(lt1, lt2, ph1, sase, cloud, vpc, app, onprem);
        state.cables.push(
          _tbMkCable(lt1, sase),
          _tbMkCable(lt2, sase, 'cat6', 0, 1),
          _tbMkCable(ph1, sase, 'cat6', 0, 2),
          _tbMkCable(sase, cloud, 'fiber', 3),
          _tbMkCable(cloud, vpc, 'fiber', 1),
          _tbMkCable(vpc, app),
          _tbMkCable(cloud, onprem, 'fiber', 2),
        );
      },
      requirements: [
        'SASE Edge node with ZTNA configured',
        'Cloud VPC with resources behind SASE',
        'On-Prem DC connected via VPN or SASE',
      ],
      ruleIds: ['min-devices', 'no-orphans', 'cloud-has-sg'],
      requires: [
        { type: 'sase-edge', min: 1 },
        { type: 'vpc',       min: 1 },
      ],
      explanation: {
        overview: 'SASE (Secure Access Service Edge, pronounced "sassy") collapses network + security into a single cloud-delivered service. Instead of backhauling all traffic to HQ for security inspection, users + branches connect to the NEAREST SASE point-of-presence, which then routes to destinations AND applies security controls (SWG, CASB, FWaaS, ZTNA) at the edge. Replaces the old "trust the network" model with "trust the identity, verify every session."',
        dataFlow: 'Remote user opens Salesforce. Traffic goes to the nearest SASE PoP (not to HQ). SASE identifies the user (ZTNA), checks policy ("Alice can reach Salesforce"), scans traffic (SWG for malware, CASB for data-loss), applies QoS. If allowed, forwards directly to Salesforce — no HQ detour. Entire policy evaluation happens at the cloud edge in milliseconds. Same for on-prem resources: traffic hairpins through the SASE edge regardless of origin.',
        keyDevices: [
          { name: 'SASE Edge (PoP)', role: 'Cloud-hosted edge nodes globally distributed. Nearest one serves you.' },
          { name: 'VPC / Cloud Resources', role: 'Protected behind SASE. Traffic goes through the SASE edge before reaching the VPC.' },
          { name: 'On-Prem DC', role: 'Connected to SASE via VPN. Same enforcement applies.' },
          { name: 'Users (remote + branch)', role: 'Connect to nearest SASE PoP. No VPN client needed for ZTNA.' },
        ],
        concepts: [
          { term: 'SWG (Secure Web Gateway)', meaning: 'Filters web traffic — blocks malicious URLs, enforces acceptable-use.' },
          { term: 'CASB (Cloud Access Security Broker)', meaning: 'Sits between users and cloud apps. Monitors data movement, prevents leakage.' },
          { term: 'FWaaS (Firewall as a Service)', meaning: 'Cloud-delivered firewall. Replaces on-prem firewall appliances for remote users.' },
          { term: 'ZTNA (Zero Trust Network Access)', meaning: 'Verify every session. Replaces "trusted VPN = full network access" with "trusted user + trusted app = one specific session."' },
        ],
        examTies: 'N10-009 1.8 (SASE architecture), 4.1 (zero trust model), 4.3 (identity-based access), 4.4 (cloud security services)',
      },
      tour: [
        {
          title: 'SASE Architecture',
          body: 'SASE — Secure Access Service Edge — collapses networking + security into a single cloud-delivered service. Remote users on the left, SASE PoP in the middle, corporate resources on the right. Traffic no longer backhauls to HQ just to get inspected; inspection happens at the edge, close to the user.',
          camera: { position: [36, 32, 40], target: [0, 2, 0], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The SASE PoP',
          body: 'The SASE-Edge Point of Presence is the magic box. A single cloud service delivers five converged functions: SD-WAN (transport), SWG (Secure Web Gateway — web filtering + DLP), CASB (Cloud Access Security Broker — SaaS visibility), ZTNA (Zero Trust Network Access — per-app identity auth), and FWaaS (Firewall-as-a-Service — L7 inspection). Users hit the nearest PoP; the PoP enforces policy + forwards on.',
          camera: { position: [2, 14, 14], target: [-6, 3, 0], durationMs: 1300 },
          highlight: ['SASE-Edge (PoP)'],
          durationMs: 17000
        },
        {
          title: 'Zero-trust in practice',
          body: 'No implicit trust based on network location. Remote-User-01 hitting SaaS-App doesn\'t get "trusted internal" treatment just because they tunneled into the SASE cloud — the SASE-Edge re-verifies their identity + device posture per request, then grants access to that specific app (not the whole network). This is the ZTNA pillar at work.',
          camera: { position: [-14, 14, 18], target: [-10, 3, 2], durationMs: 1300 },
          highlight: ['Remote-User-01', 'Remote-User-02', 'Remote-User-03', 'SASE-Edge (PoP)', 'SaaS-App'],
          durationMs: 16000
        },
        {
          title: 'Remember for the exam',
          body: 'SASE = SD-WAN + SWG + CASB + ZTNA + FWaaS, cloud-delivered, identity-centric. Replaces the old "VPN back to HQ then out" model with "authenticate once at the nearest PoP, apply policy there." Key exam distinctions: SASE is the architecture; SSE is the security-only subset (no SD-WAN). N10-009 1.8 (SASE architecture), 4.1 (zero trust), 4.4 (cloud security services).',
          camera: { position: [36, 34, 40], target: [0, 2, 0], durationMs: 1400 },
          highlight: ['SASE-Edge (PoP)'],
          durationMs: 15000
        }
      ],
    },
    // ══════════════════════════════════════════
    // v4.47.0 — New scenarios with deep explanations
    // Light grading (min-devices + no-orphans + device counts). Educational
    // value comes from the shape + the explanation panel.
    // ══════════════════════════════════════════
    {
      id: 'home-network',
      title: 'Home Network',
      description: 'A typical residential network — ISP → home router with Wi-Fi, plus a range of consumer endpoints sharing one public IP via NAT.',
      autoBuild: (state) => {
        const isp    = _tbMkDev({ type: 'cloud',        x: 700, y: 120, hostname: 'ISP' });
        const router = _tbMkDev({ type: 'router',       x: 700, y: 320, hostname: 'Home-Router', ip: '192.168.1.1', mask: '255.255.255.0' });
        const wap    = _tbMkDev({ type: 'wap',          x: 700, y: 520, hostname: 'WiFi-AP' });
        const laptop = _tbMkDev({ type: 'laptop',       x: 350, y: 720, hostname: 'Laptop',    ip: '192.168.1.101', gateway: '192.168.1.1' });
        const phone  = _tbMkDev({ type: 'smartphone',   x: 580, y: 760, hostname: 'Phone',     ip: '192.168.1.102', gateway: '192.168.1.1', iface: 'wlan0' });
        const tv     = _tbMkDev({ type: 'smart-tv',     x: 820, y: 760, hostname: 'Smart-TV',  ip: '192.168.1.103', gateway: '192.168.1.1' });
        const gc     = _tbMkDev({ type: 'game-console', x: 1050,y: 720, hostname: 'Console',   ip: '192.168.1.104', gateway: '192.168.1.1' });
        state.devices.push(isp, router, wap, laptop, phone, tv, gc);
        state.cables.push(
          _tbMkCable(isp, router),
          _tbMkCable(router, wap),
          _tbMkCable(wap, laptop),
          _tbMkCable(wap, phone),
          _tbMkCable(wap, tv),
          _tbMkCable(wap, gc),
        );
      },
      requirements: [
        'ISP cloud/WAN → home router (combined modem + router + Wi-Fi)',
        'WAP/router covers wireless devices',
        'At least 3 endpoint devices — any mix of laptop, smartphone, game console, smart TV',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'cloud',  min: 1 },
        { type: 'router', min: 1 },
        { type: 'wap',    min: 1 },
      ],
      explanation: {
        overview: 'A home network is a small residential LAN sharing a single internet connection among multiple devices. It centers on a home gateway — a single box that combines modem, router, Wi-Fi AP, DHCP server, and firewall. NAT (Network Address Translation) lets every device share the one public IP your ISP hands you.',
        dataFlow: 'Phone → home router (default gateway 192.168.1.1). The router performs NAT: it rewrites the source IP from your private 192.168.x.x to its single public IP. Packet exits the modem to the ISP. Replies come back to the public IP. The router\'s NAT table looks up which internal device asked, rewrites the destination back, and forwards it inside.',
        keyDevices: [
          { name: 'ISP / Cloud', role: 'Your internet provider\'s edge. Hands you one public IP (and usually one per ~24 hours).' },
          { name: 'Home Router', role: 'Swiss Army knife of home networking: NAT, DHCP, firewall, Wi-Fi AP, switch — all in one box.' },
          { name: 'WAP (Wi-Fi)', role: 'Broadcasts SSIDs, handles 802.11 association, WPA2/WPA3 encryption for wireless clients.' },
          { name: 'Endpoints', role: 'Laptops, phones, game consoles, smart TVs — all get IPs via DHCP, all share the WAN.' },
        ],
        concepts: [
          { term: 'NAT (PAT)', meaning: 'Many private IPs share one public IP. Home routers specifically use PAT (Port Address Translation) — tracks traffic by port number too.' },
          { term: 'DHCP', meaning: 'Auto-assigns IPs from a pool (usually 192.168.1.100–192.168.1.200). No manual config when you join Wi-Fi.' },
          { term: 'RFC 1918 private ranges', meaning: '10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 — non-routable on the public internet.' },
          { term: 'Default gateway', meaning: 'Where every device sends non-local traffic. At home, always the router\'s LAN IP.' },
        ],
        examTies: 'N10-009 1.4 (IPv4 + NAT/PAT), 1.6 (DHCP, DNS), 2.3 (wireless 802.11 standards), 4.1 (home-gateway security posture)',
      },
      // v4.66.0 Phase 4 — guided 3D tour. Camera positions in scene-space
      // coords (tbState.x maps via (x-900)/25, tbState.y via (y-550)/25, so
      // scene origin is roughly the center of the canvas). Step auto-advance
      // durationMs defaults to 6500ms if not set.
      // v4.67.0: durationMs calibrated to body word count (~3 words/sec
      // reading pace + 2s buffer to absorb visuals). Earlier 6.5–9s
      // durations rushed the narrative on longer body copy.
      tour: [
        {
          title: 'Home Network',
          body: 'A typical residential setup — an ISP cloud feeding a home router that distributes Wi-Fi to a handful of consumer devices. This is what the N10-009 exam means when it references a SOHO network.',
          camera: { position: [32, 26, 38], target: [-8, 2, -4], durationMs: 1100 },
          highlight: [],
          durationMs: 11000
        },
        {
          title: 'The internet edge',
          body: 'The ISP cloud represents your service provider — the outside world. The home router is the boundary: it terminates the modem link and becomes the default gateway for everything on your side. The single public IP lives here.',
          camera: { position: [14, 14, 10], target: [-8, 2, -13], durationMs: 1100 },
          highlight: ['ISP', 'Home-Router'],
          durationMs: 13000
        },
        {
          title: 'Wi-Fi and endpoints',
          body: 'The router\'s 802.11 radio broadcasts an SSID. Laptops, phones, smart TVs, and game consoles all associate to the same access point. They share one /24 subnet, one broadcast domain, and the same default gateway.',
          camera: { position: [10, 12, 24], target: [-8, 1, 4], durationMs: 1200 },
          highlight: ['WiFi-AP', 'Laptop', 'Phone', 'Smart-TV', 'Console'],
          durationMs: 12000
        },
        {
          title: 'Private IPs + NAT',
          body: 'Every device here has an RFC 1918 private address (192.168.x.x). When any of them talks to the internet, the router performs Network Address Translation — rewriting the source IP to its public one. That\'s how one public IP serves many devices. Remember for the exam: NAT runs on the router, not the endpoints.',
          camera: { position: [-18, 24, 34], target: [-8, 2, -4], durationMs: 1200 },
          highlight: ['Home-Router'],
          durationMs: 15000
        }
      ],
    },
    {
      id: 'sdwan',
      title: 'SD-WAN Network',
      description: 'Software-Defined WAN — a controller pushes policy to branch edges, which load-balance across multiple transports (MPLS + broadband + LTE) based on app and link quality.',
      autoBuild: (state) => {
        const cloud = _tbMkDev({ type: 'cloud',  x: 700, y: 120, hostname: 'Internet/MPLS' });
        const hub   = _tbMkDev({ type: 'router', x: 700, y: 340, hostname: 'HQ-SDWAN-Edge', ip: '10.0.0.1' });
        const hubsw = _tbMkDev({ type: 'switch', x: 700, y: 520, hostname: 'HQ-SW' });
        const hqpc  = _tbMkDev({ type: 'pc',     x: 700, y: 700, hostname: 'HQ-Host', ip: '10.0.0.101', gateway: '10.0.0.1' });
        const br1   = _tbMkDev({ type: 'router', x: 280, y: 340, hostname: 'Branch-1-Edge', ip: '10.1.0.1' });
        const br1sw = _tbMkDev({ type: 'switch', x: 280, y: 520, hostname: 'Branch-1-SW' });
        const br1pc = _tbMkDev({ type: 'pc',     x: 180, y: 700, hostname: 'BR1-Host-01', ip: '10.1.0.101', gateway: '10.1.0.1' });
        const br1lt = _tbMkDev({ type: 'laptop', x: 380, y: 700, hostname: 'BR1-Laptop',   ip: '10.1.0.102', gateway: '10.1.0.1' });
        const br2   = _tbMkDev({ type: 'router', x: 1120,y: 340, hostname: 'Branch-2-Edge', ip: '10.2.0.1' });
        const br2sw = _tbMkDev({ type: 'switch', x: 1120,y: 520, hostname: 'Branch-2-SW' });
        const br2pc = _tbMkDev({ type: 'pc',     x: 1020,y: 700, hostname: 'BR2-Host-01', ip: '10.2.0.101', gateway: '10.2.0.1' });
        const br2ph = _tbMkDev({ type: 'voip',   x: 1220,y: 700, hostname: 'BR2-VoIP',    ip: '10.2.0.50', gateway: '10.2.0.1' });
        state.devices.push(cloud, hub, hubsw, hqpc, br1, br1sw, br1pc, br1lt, br2, br2sw, br2pc, br2ph);
        state.cables.push(
          _tbMkCable(cloud, hub, 'fiber'), _tbMkCable(cloud, br1, 'fiber', 1), _tbMkCable(cloud, br2, 'fiber', 2),
          _tbMkCable(hub, hubsw, 'cat6', 1), _tbMkCable(hubsw, hqpc),
          _tbMkCable(br1, br1sw, 'cat6', 1), _tbMkCable(br1sw, br1pc), _tbMkCable(br1sw, br1lt, 'cat6', 1),
          _tbMkCable(br2, br2sw, 'cat6', 1), _tbMkCable(br2sw, br2pc), _tbMkCable(br2sw, br2ph, 'cat6', 1),
        );
      },
      requirements: [
        'Hub/headend site (central datacenter)',
        'At least 2 branch sites, each with edge router + switch + endpoints',
        'Cloud/WAN in the middle representing the transport (internet/broadband)',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'cloud',  min: 1 },
        { type: 'router', min: 3 },
        { type: 'switch', min: 2 },
      ],
      explanation: {
        overview: 'SD-WAN (Software-Defined WAN) replaces traditional hub-and-spoke MPLS with a dynamic, application-aware overlay. A centralized controller pushes policy to lightweight edge devices at each branch, which then load-balance across multiple transport paths based on real-time link quality.',
        dataFlow: 'User at Branch A opens Salesforce. Branch edge checks the app signature (DPI), consults controller policy: "SaaS → direct to internet." Traffic exits over broadband, bypassing HQ. For an intranet app, the same edge would instead route over an encrypted overlay tunnel to HQ across whichever link (MPLS vs broadband) currently has the best jitter/loss. The controller continuously monitors link health and can reroute mid-session.',
        keyDevices: [
          { name: 'SD-WAN Controller', role: 'Cloud-hosted brain. Pushes policy, topology, security rules to every edge. Admin sees everything via a dashboard.' },
          { name: 'Hub / Headend', role: 'Central site (HQ datacenter) — hosts intranet apps and private services. All branches reach it via the overlay.' },
          { name: 'Branch Edges', role: 'Small appliance (or virtual) per branch. Handles WAN link monitoring, dynamic path selection, zero-touch onboarding.' },
          { name: 'Transport Links', role: 'Multiple WAN paths per branch: MPLS (reliable, pricey), broadband (fast, best-effort), LTE/5G (backup). SD-WAN pools them.' },
        ],
        concepts: [
          { term: 'Overlay network', meaning: 'Encrypted virtual tunnels between SD-WAN edges, running on top of whatever transport is underneath.' },
          { term: 'DPI (Deep Packet Inspection)', meaning: 'Identifies apps by fingerprint (not just port) so policy can be "Salesforce → broadband, backup → cheap link."' },
          { term: 'Application-aware routing', meaning: 'Best link per app: voice → low-jitter link; file backup → cheapest.' },
          { term: 'Zero-touch provisioning', meaning: 'New branch edge boots, phones home to controller, downloads config. No local tech needed.' },
        ],
        examTies: 'N10-009 1.7 (WAN technologies — SD-WAN explicitly listed), 4.4 (network monitoring), 5.1 (WAN troubleshooting)',
      },
      // v4.68.0 Phase 4 — SD-WAN tour (4 steps). Covers hub-and-spoke
      // fabric + dynamic path selection across mixed transports.
      tour: [
        {
          title: 'SD-WAN Network',
          body: 'Software-Defined WAN — a hub-and-spoke network where branch edges connect to HQ over a shared public transport. A controller pushes policy to every edge device, and traffic dynamically picks the best path per-application.',
          camera: { position: [40, 34, 48], target: [-8, 2, -5], durationMs: 1200 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The hub',
          body: 'HQ is the central site. Datacenter services, servers, and the SD-WAN controller itself live here. Every branch has a tunnel back to this hub — but in SD-WAN, branches can also talk directly to each other, not just through HQ.',
          camera: { position: [14, 14, 16], target: [-8, 2, -4], durationMs: 1300 },
          highlight: ['HQ-SDWAN-Edge', 'HQ-SW', 'HQ-Host'],
          durationMs: 14000
        },
        {
          title: 'The branches',
          body: 'Each branch has its own edge router that terminates the SD-WAN fabric. Branch-to-HQ for shared resources. Branch-to-branch for VoIP and app-to-app traffic. All over the same public transport — MPLS, broadband, LTE — whichever has the best quality for the current app.',
          camera: { position: [-8, 18, 32], target: [-8, 2, -3], durationMs: 1300 },
          highlight: ['Branch-1-Edge', 'Branch-1-SW', 'Branch-2-Edge', 'Branch-2-SW', 'BR1-Host-01', 'BR1-Laptop', 'BR2-Host-01', 'BR2-VoIP'],
          durationMs: 14000
        },
        {
          title: 'Remember for the exam',
          body: 'The exam point: SD-WAN replaces static MPLS-only with dynamic, app-aware path selection over mixed transports. Cheaper, more flexible, and the controller enforces consistent policy across all sites. N10-009 1.2 (WAN topologies + service types) and 2.1 (cloud connectivity).',
          camera: { position: [-40, 32, 46], target: [-8, 2, -5], durationMs: 1300 },
          highlight: ['Internet/MPLS'],
          durationMs: 14000
        }
      ],
    },
    {
      id: 'mpls',
      title: 'MPLS Network',
      description: 'Multiprotocol Label Switching — carrier-grade WAN where ISPs forward packets by short labels (not IP lookups) through a provider cloud with SLA-backed paths.',
      autoBuild: (state) => {
        const mpls = _tbMkDev({ type: 'cloud',  x: 700, y: 140, hostname: 'MPLS-Core' });
        const pe1  = _tbMkDev({ type: 'isp-router', x: 430, y: 280, hostname: 'PE-1 (Provider Edge)' });
        const pe2  = _tbMkDev({ type: 'isp-router', x: 970, y: 280, hostname: 'PE-2 (Provider Edge)' });
        const ce1  = _tbMkDev({ type: 'router', x: 280, y: 460, hostname: 'Site-A-CE', ip: '10.1.0.1' });
        const sw1  = _tbMkDev({ type: 'switch', x: 280, y: 620, hostname: 'Site-A-SW' });
        const pc1a = _tbMkDev({ type: 'pc',     x: 180, y: 800, hostname: 'Site-A-PC-01', ip: '10.1.0.101', gateway: '10.1.0.1' });
        const pc1b = _tbMkDev({ type: 'pc',     x: 380, y: 800, hostname: 'Site-A-PC-02', ip: '10.1.0.102', gateway: '10.1.0.1' });
        const ce2  = _tbMkDev({ type: 'router', x: 1120,y: 460, hostname: 'Site-B-CE', ip: '10.2.0.1' });
        const sw2  = _tbMkDev({ type: 'switch', x: 1120,y: 620, hostname: 'Site-B-SW' });
        const pc2a = _tbMkDev({ type: 'pc',     x: 1020,y: 800, hostname: 'Site-B-PC-01', ip: '10.2.0.101', gateway: '10.2.0.1' });
        const srv  = _tbMkDev({ type: 'server', x: 1220,y: 800, hostname: 'Site-B-Server', ip: '10.2.0.10', gateway: '10.2.0.1' });
        state.devices.push(mpls, pe1, pe2, ce1, sw1, pc1a, pc1b, ce2, sw2, pc2a, srv);
        state.cables.push(
          _tbMkCable(mpls, pe1, 'fiber'), _tbMkCable(mpls, pe2, 'fiber', 1),
          _tbMkCable(pe1, ce1, 'fiber', 1),
          _tbMkCable(ce1, sw1, 'cat6', 1), _tbMkCable(sw1, pc1a), _tbMkCable(sw1, pc1b, 'cat6', 1),
          _tbMkCable(pe2, ce2, 'fiber', 1),
          _tbMkCable(ce2, sw2, 'cat6', 1), _tbMkCable(sw2, pc2a), _tbMkCable(sw2, srv, 'cat6', 1),
        );
      },
      requirements: [
        'Provider cloud/WAN in the middle (MPLS core)',
        'At least 2 customer sites, each with a CE router → PE router',
        'Each site has a switch + endpoints',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'cloud',  min: 1 },
        { type: 'router', min: 4 },
        { type: 'switch', min: 2 },
      ],
      explanation: {
        overview: 'MPLS (Multiprotocol Label Switching) is a carrier-managed WAN where packets are forwarded by short 20-bit labels instead of IP routing lookups. Customer sites connect via CE (Customer Edge) routers peering with the provider\'s PE (Provider Edge) routers. The provider guarantees path, bandwidth, and QoS — usually with an SLA.',
        dataFlow: 'Packet from Site A → local CE router → PE router (ISP edge). PE pushes an MPLS label (e.g., 17) based on the destination VPN. Inside the MPLS cloud, P routers switch the packet by label only — no IP lookup. At each hop, labels are swapped. The egress PE pops the label and forwards the original packet to the CE at Site B. Result: Site A ↔ Site B feels like a direct private link.',
        keyDevices: [
          { name: 'CE Router (Customer Edge)', role: 'Customer-owned router at each site. Peers with the provider over BGP or static routes.' },
          { name: 'PE Router (Provider Edge)', role: 'ISP-owned. Speaks customer protocol on one side, MPLS on the other. Maintains per-customer VRFs.' },
          { name: 'P Router (Provider Core)', role: 'Inside the MPLS cloud. Never sees customer routes — switches labels only. Keeps the core fast and scalable.' },
          { name: 'Cloud (MPLS Core)', role: 'The provider\'s network — opaque to the customer. Delivers the SLA-backed path.' },
        ],
        concepts: [
          { term: 'Label switching', meaning: 'Forwarding by short 20-bit label instead of slow IP lookup. Faster in hardware.' },
          { term: 'LSP (Label Switched Path)', meaning: 'Pre-computed path through the MPLS cloud for a given label.' },
          { term: 'VRF (Virtual Routing & Forwarding)', meaning: 'Per-customer routing table inside a PE — lets multiple customers share IP space safely.' },
          { term: 'QoS + SLA', meaning: 'MPLS\'s main sell: guaranteed latency/jitter/loss. Unlike best-effort broadband.' },
        ],
        examTies: 'N10-009 1.7 (WAN — MPLS named explicitly), 2.1 (QoS), 3.3 (WAN routing, BGP)',
      },
      tour: [
        {
          title: 'MPLS Carrier WAN',
          body: 'A carrier MPLS network connecting Site A and Site B through a provider\'s private backbone. MPLS (Multi-Protocol Label Switching) replaces leased lines for enterprises that want SLA-backed any-to-any connectivity without full-mesh circuits. You buy one connection into the cloud, reach everywhere the carrier goes.',
          camera: { position: [36, 32, 40], target: [0, 2, 0], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'CE vs PE — who does what',
          body: 'Your CE (Customer Edge) routers at each site speak normal IP to the carrier. The PE (Provider Edge) routers at the carrier\'s side push an MPLS label onto every incoming packet. Inside the carrier cloud, routing decisions happen on labels — not IP lookups — which is faster and isolates customers. At egress, the PE pops the label and delivers clean IP.',
          camera: { position: [0, 16, 18], target: [0, 2, 0], durationMs: 1300 },
          highlight: ['Site-A-CE', 'PE-1 (Provider Edge)', 'PE-2 (Provider Edge)', 'Site-B-CE'],
          durationMs: 16000
        },
        {
          title: 'Labels, not IPs',
          body: 'Inside MPLS-Core, every packet carries a 20-bit label stack. Routers along the Label Switched Path (LSP) swap labels at each hop, never re-examining the IP header. This is why MPLS can guarantee latency + QoS classes (EF for voice, AF for business traffic, BE for bulk) — the carrier pre-engineers paths per class.',
          camera: { position: [0, 20, 14], target: [0, 3, -2], durationMs: 1300 },
          highlight: ['MPLS-Core'],
          durationMs: 15000
        },
        {
          title: 'Remember for the exam',
          body: 'MPLS = label switching at L2.5 (between L2 and L3). LER (Label Edge Router) = PE; LSR (Label Switch Router) = core. Two flavors: L3VPN (carrier routes for you via MP-BGP) and L2VPN / VPLS (carrier extends your L2 segment). SLA-backed, QoS-native, losing ground to SD-WAN + broadband but still dominant in large enterprises. N10-009 1.7 (WAN topologies, MPLS named explicitly).',
          camera: { position: [36, 34, 40], target: [0, 2, 0], durationMs: 1400 },
          highlight: [],
          durationMs: 15000
        }
      ],
    },
    {
      id: 'cloud-natgw',
      title: 'NAT Gateway Cloud (private-subnet outbound)',
      description: 'Cloud VPC where private-subnet resources need outbound internet access via a managed NAT Gateway — but nothing from the internet can initiate inbound.',
      autoBuild: (state) => {
        const cloud = _tbMkDev({ type: 'cloud',        x: 700, y: 100, hostname: 'Internet' });
        const igw   = _tbMkDev({ type: 'igw',          x: 700, y: 280, hostname: 'IGW' });
        const vpc   = _tbMkDev({ type: 'vpc',          x: 700, y: 440, hostname: 'VPC-prod' });
        const pubsn = _tbMkDev({ type: 'cloud-subnet', x: 450, y: 600, hostname: 'public-subnet', ip: '10.0.1.0' });
        const natgw = _tbMkDev({ type: 'nat-gw',       x: 450, y: 780, hostname: 'NAT-GW', ip: '10.0.1.254' });
        const privsn = _tbMkDev({ type: 'cloud-subnet',x: 950, y: 600, hostname: 'private-subnet', ip: '10.0.2.0' });
        const app   = _tbMkDev({ type: 'server',       x: 850, y: 780, hostname: 'Backend-API', ip: '10.0.2.10', gateway: '10.0.2.1' });
        const db    = _tbMkDev({ type: 'server',       x: 1050,y: 780, hostname: 'DB-Primary', ip: '10.0.2.20', gateway: '10.0.2.1' });
        state.devices.push(cloud, igw, vpc, pubsn, natgw, privsn, app, db);
        state.cables.push(
          _tbMkCable(cloud, igw), _tbMkCable(igw, vpc),
          _tbMkCable(vpc, pubsn), _tbMkCable(pubsn, natgw),
          _tbMkCable(vpc, privsn, 'cat6', 1), _tbMkCable(privsn, app), _tbMkCable(privsn, db, 'cat6', 1),
          _tbMkCable(natgw, privsn, 'fiber', 1, 2),
        );
      },
      requirements: [
        'VPC with at least one public subnet + one private subnet',
        'NAT Gateway placed in the public subnet',
        'Private-subnet resources (e.g., backend server)',
        'Internet Gateway attached to the VPC (so the NAT-GW can reach out)',
      ],
      ruleIds: ['min-devices', 'no-orphans', 'igw-on-vpc', 'nat-gw-needs-subnet'],
      requires: [
        { type: 'vpc',          min: 1 },
        { type: 'cloud-subnet', min: 2 },
        { type: 'nat-gw',       min: 1 },
        { type: 'igw',          min: 1 },
      ],
      explanation: {
        overview: 'This pattern lets private-subnet resources (backend API servers that should NEVER be reachable from the internet) still reach OUT to the internet — for OS updates, third-party APIs, pulling from package repos. The trick: a managed NAT Gateway sits in a public subnet, acting as the outbound-only proxy.',
        dataFlow: 'Backend server in private subnet wants to download an OS update. Sends request with private IP to its default route (0.0.0.0/0 → NAT Gateway). NAT-GW (in public subnet) rewrites source IP to its own Elastic IP. Packet exits via Internet Gateway. The remote server replies to NAT-GW\'s IP. NAT-GW translates back and forwards to the original private server. Crucially: nobody from the internet can initiate a connection inward — stateful NAT allows return traffic only.',
        keyDevices: [
          { name: 'VPC', role: 'The virtual private cloud boundary. Isolates your resources at the network layer.' },
          { name: 'Public Subnet', role: 'Has a route to IGW. Hosts the NAT Gateway (which itself needs internet reachability to work).' },
          { name: 'Private Subnet', role: 'No route to IGW. Only route out is via the NAT-GW. Internet cannot initiate inbound.' },
          { name: 'NAT Gateway', role: 'Managed AWS/cloud service. Performs SNAT for outbound-only. Highly available within an AZ.' },
          { name: 'Internet Gateway (IGW)', role: 'The VPC\'s door to the internet. Required for the NAT-GW to function.' },
        ],
        concepts: [
          { term: 'Public vs Private Subnet', meaning: 'Defined by route table: public has a route to IGW; private does not. Nothing else marks the distinction.' },
          { term: 'SNAT (Source NAT)', meaning: 'What NAT-GW does. Rewrites the source IP so replies come back to it.' },
          { term: 'Elastic IP', meaning: 'Static public IP allocated to the NAT-GW. Stays constant even if the NAT-GW is replaced.' },
          { term: 'Why not just use IGW?', meaning: 'IGW routes bidirectionally — that would expose private resources to inbound connections. NAT-GW is outbound-only by design.' },
        ],
        examTies: 'N10-009 1.8 (cloud networking — NAT-GW, subnets), 4.1 (VPC security), 4.2 (access control)',
      },
      tour: [
        {
          title: 'NAT Gateway Cloud (private-subnet outbound)',
          body: 'A VPC with two subnets: public (holds the NAT-GW) and private (holds backend servers + database). The private subnet hosts compute that needs to reach the internet (package updates, API calls) but must stay unreachable from the internet. NAT-GW is the one-way valve that makes that work.',
          camera: { position: [34, 30, 38], target: [0, 2, 0], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The public subnet',
          body: 'Public subnet has a route `0.0.0.0/0 → IGW` — traffic flows bidirectionally. The NAT-GW lives here with an Elastic IP (a public address). Only the NAT-GW has a public face; the subnet doesn\'t host any user-facing servers. Its entire job is to be the outbound proxy for the private side.',
          camera: { position: [-14, 14, 18], target: [-10, 3, 0], durationMs: 1300 },
          highlight: ['public-subnet', 'NAT-GW', 'IGW'],
          durationMs: 15000
        },
        {
          title: 'The private subnet',
          body: 'Private subnet has a route `0.0.0.0/0 → NAT-GW` instead of the IGW. Backend-API wants to `yum update`? The request leaves via the NAT-GW, which SNATs the source IP to its own Elastic IP, forwards to the internet, and stitches the reply back. Inbound unsolicited traffic has no route back — the private subnet is dark to the internet.',
          camera: { position: [14, 14, 18], target: [10, 3, 0], durationMs: 1300 },
          highlight: ['private-subnet', 'Backend-API', 'DB-Primary', 'NAT-GW'],
          durationMs: 16000
        },
        {
          title: 'Remember for the exam',
          body: 'NAT-GW = outbound only (one-way). IGW = bidirectional. Private subnets route `0.0.0.0/0 → NAT-GW`; public subnets route `0.0.0.0/0 → IGW`. The NAT-GW itself lives in a public subnet (so it can reach the IGW). This is the foundational cloud pattern — databases and internal APIs go private, load balancers + jump boxes go public. N10-009 1.8 (cloud networking — NAT-GW + subnets).',
          camera: { position: [34, 32, 38], target: [0, 2, 0], durationMs: 1400 },
          highlight: ['NAT-GW', 'IGW'],
          durationMs: 15000
        }
      ],
    },
    {
      id: 'cloud-igw',
      title: 'Internet Gateway Cloud (public web tier)',
      description: 'A cloud VPC where public-subnet resources (load-balanced web servers) accept inbound traffic from the internet directly via an Internet Gateway.',
      autoBuild: (state) => {
        const cloud = _tbMkDev({ type: 'cloud',        x: 700, y: 100, hostname: 'Internet' });
        const igw   = _tbMkDev({ type: 'igw',          x: 700, y: 280, hostname: 'IGW' });
        const vpc   = _tbMkDev({ type: 'vpc',          x: 700, y: 440, hostname: 'VPC-web' });
        const pubsn = _tbMkDev({ type: 'cloud-subnet', x: 700, y: 600, hostname: 'public-subnet', ip: '10.0.1.0' });
        const lb    = _tbMkDev({ type: 'load-balancer',x: 700, y: 760, hostname: 'App-LB', ip: '203.0.113.5' });
        const web1  = _tbMkDev({ type: 'public-web',   x: 500, y: 920, hostname: 'Web-01', ip: '10.0.1.10' });
        const web2  = _tbMkDev({ type: 'public-web',   x: 700, y: 920, hostname: 'Web-02', ip: '10.0.1.11' });
        const web3  = _tbMkDev({ type: 'public-web',   x: 900, y: 920, hostname: 'Web-03', ip: '10.0.1.12' });
        state.devices.push(cloud, igw, vpc, pubsn, lb, web1, web2, web3);
        state.cables.push(
          _tbMkCable(cloud, igw), _tbMkCable(igw, vpc),
          _tbMkCable(vpc, pubsn), _tbMkCable(pubsn, lb),
          _tbMkCable(lb, web1, 'cat6', 1), _tbMkCable(lb, web2, 'cat6', 2), _tbMkCable(lb, web3, 'cat6', 3),
        );
      },
      requirements: [
        'VPC with an Internet Gateway attached',
        'At least one public subnet',
        'Public-facing resource (web server or load balancer)',
        'Security group rules controlling inbound traffic',
      ],
      ruleIds: ['min-devices', 'no-orphans', 'igw-on-vpc', 'cloud-has-sg'],
      requires: [
        { type: 'vpc',          min: 1 },
        { type: 'cloud-subnet', min: 1 },
        { type: 'igw',          min: 1 },
        { type: 'public-*',     min: 1 },
      ],
      explanation: {
        overview: 'The simplest cloud pattern — public resources (web servers, load balancers, bastion hosts) sit in a public subnet and are directly reachable from the internet via an Internet Gateway. No NAT in between. Security is enforced at the security-group level (stateful cloud firewall) and usually a load balancer up front for HA and TLS termination.',
        dataFlow: 'User hits web.example.com. DNS resolves to the public IP of your ALB (Application Load Balancer). Traffic arrives at the VPC via the Internet Gateway. Public-subnet route table says "0.0.0.0/0 → IGW" — so replies go back out the same way. Security Group checks the inbound rule (e.g., "allow TCP 443 from anywhere"). If allowed, the packet reaches the web server. Return traffic: server → route to IGW → back to the user on the internet.',
        keyDevices: [
          { name: 'VPC', role: 'The network boundary for this tier of resources.' },
          { name: 'Internet Gateway (IGW)', role: 'Horizontally scalable, highly available. Attached to exactly one VPC. Bidirectional internet reachability.' },
          { name: 'Public Subnet', role: 'Has a route-table entry 0.0.0.0/0 → IGW. Resources here can have public IPs.' },
          { name: 'Web Server / Load Balancer', role: 'The front door. Usually behind an ALB for HA and TLS offload.' },
          { name: 'Security Group', role: 'Stateful firewall at the instance level. Default-deny inbound — you must allow explicitly.' },
        ],
        concepts: [
          { term: 'Stateful vs Stateless', meaning: 'Security Groups are stateful (if inbound is allowed, outbound reply is automatic). NACLs are stateless (must allow each direction).' },
          { term: 'IGW vs NAT-GW', meaning: 'IGW is bidirectional; NAT-GW is outbound-only. Pick based on who initiates.' },
          { term: 'Elastic IP', meaning: 'Static public IPv4 assigned to an instance. Survives stop/start/replacement.' },
          { term: 'What makes a subnet "public"?', meaning: 'Having a route to the IGW — full stop. No "is_public" flag in the cloud model.' },
        ],
        examTies: 'N10-009 1.8 (cloud subnets, IGW), 4.1 (cloud security — SG vs NACL)',
      },
      tour: [
        {
          title: 'Internet Gateway Cloud (public web tier)',
          body: 'A VPC with a public-facing web tier: three web servers behind a load balancer, all reachable from the internet through the IGW. This is the simplest cloud pattern that ships real user traffic — no private subnets, no NAT-GW, just a public subnet with bidirectional internet access.',
          camera: { position: [34, 30, 38], target: [0, 2, 0], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The Internet Gateway',
          body: 'IGW is the VPC\'s public-internet attachment point. It\'s horizontally scaled + redundant — AWS manages it; you just attach it to the VPC and add a `0.0.0.0/0 → IGW` route. Unlike NAT-GW, IGW is bidirectional: inbound packets from the internet can reach the public subnet, and responses flow back unchanged.',
          camera: { position: [0, 16, 14], target: [0, 3, -2], durationMs: 1300 },
          highlight: ['IGW', 'Internet'],
          durationMs: 15000
        },
        {
          title: 'The web tier',
          body: 'App-LB (the load balancer) holds a public IP; it distributes incoming requests across Web-01, Web-02, Web-03 using round-robin or least-connections. All four live in public-subnet. Security Groups (stateful, instance-level) lock inbound to 443/tcp only. NACLs (stateless, subnet-level) give a second layer of coarse filtering.',
          camera: { position: [0, 14, 16], target: [0, 2, 4], durationMs: 1300 },
          highlight: ['App-LB', 'Web-01', 'Web-02', 'Web-03'],
          durationMs: 16000
        },
        {
          title: 'Remember for the exam',
          body: 'IGW = bidirectional internet access for public subnets. Route table `0.0.0.0/0 → IGW` is what makes a subnet "public." Security Groups are stateful + instance-level (allow rules only); NACLs are stateless + subnet-level (allow + deny). Combine them for defense-in-depth. This VPC also ships a load balancer + 3 identical web instances — the horizontal-scale pattern. N10-009 1.8 + 4.1 (cloud security).',
          camera: { position: [34, 32, 38], target: [0, 2, 0], durationMs: 1400 },
          highlight: ['IGW', 'App-LB'],
          durationMs: 15000
        }
      ],
    },
    {
      id: 'cloud-peering',
      title: 'VPC Peering Cloud',
      description: 'Two VPCs directly connected by a peering link — a one-to-one private network bridge. No Transit Gateway, no VPN, no internet exposure.',
      autoBuild: (state) => {
        const vpcA  = _tbMkDev({ type: 'vpc',          x: 380, y: 300, hostname: 'VPC-A (10.0.0.0/16)' });
        const snA   = _tbMkDev({ type: 'cloud-subnet', x: 380, y: 500, hostname: 'app-subnet-A', ip: '10.0.1.0' });
        const appA  = _tbMkDev({ type: 'server',       x: 260, y: 700, hostname: 'App-A-Web', ip: '10.0.1.10' });
        const dbA   = _tbMkDev({ type: 'server',       x: 500, y: 700, hostname: 'App-A-Svc', ip: '10.0.1.20' });
        const vpcB  = _tbMkDev({ type: 'vpc',          x: 1040,y: 300, hostname: 'VPC-B (10.1.0.0/16)' });
        const snB   = _tbMkDev({ type: 'cloud-subnet', x: 1040,y: 500, hostname: 'db-subnet-B', ip: '10.1.1.0' });
        const dbB1  = _tbMkDev({ type: 'server',       x: 920, y: 700, hostname: 'DB-Primary', ip: '10.1.1.10' });
        const dbB2  = _tbMkDev({ type: 'server',       x: 1160,y: 700, hostname: 'DB-Replica', ip: '10.1.1.11' });
        state.devices.push(vpcA, snA, appA, dbA, vpcB, snB, dbB1, dbB2);
        state.cables.push(
          _tbMkCable(vpcA, snA), _tbMkCable(snA, appA), _tbMkCable(snA, dbA, 'cat6', 1),
          _tbMkCable(vpcB, snB), _tbMkCable(snB, dbB1), _tbMkCable(snB, dbB2, 'cat6', 1),
          // Peering connection — fiber-direct between VPCs
          _tbMkCable(vpcA, vpcB, 'fiber', 1, 1),
        );
      },
      requirements: [
        'Two VPCs with non-overlapping CIDR blocks',
        'Each VPC has at least one subnet with a resource',
        'Both route tables updated to point at each other via the peering',
        'Security groups control who can actually talk',
      ],
      ruleIds: ['min-devices', 'no-orphans', 'cloud-has-sg'],
      requires: [
        { type: 'vpc',          min: 2 },
        { type: 'cloud-subnet', min: 2 },
      ],
      explanation: {
        overview: 'VPC peering is a private, one-to-one connection between two VPCs that lets resources in both communicate using private IPs as if they were on the same network. It\'s the simplest way to connect two VPCs — no Transit Gateway, no VPN, no internet exposure. Used for team-isolated VPCs needing to share a database, or prod-VPC ↔ shared-services-VPC patterns.',
        dataFlow: 'Web server in VPC-A (10.0.0.0/16) wants to reach a database in VPC-B (10.1.0.0/16). VPC-A\'s route table has: "10.1.0.0/16 → pcx-abc123 (peering)". Packet leaves the VPC-A instance, hits the peering, lands in VPC-B. VPC-B\'s route table forwards to the database subnet. Security group on the DB allows TCP 3306 from VPC-A\'s CIDR. Reply goes back the same way. No encryption needed — traffic never leaves the cloud provider\'s backbone.',
        keyDevices: [
          { name: 'VPC A', role: 'Source VPC. Has its own CIDR (say 10.0.0.0/16).' },
          { name: 'VPC B', role: 'Destination VPC. CIDR must NOT overlap with A (otherwise routing breaks).' },
          { name: 'Peering Connection', role: 'The cloud-managed virtual link. Added to BOTH VPCs\' route tables.' },
          { name: 'Route Tables (both sides)', role: 'Each VPC needs a route pointing at the peering for the other VPC\'s CIDR.' },
          { name: 'Security Groups', role: 'Still enforce who can talk to whom. Peering opens routing — SGs still gate access.' },
        ],
        concepts: [
          { term: 'Non-overlapping CIDR', meaning: 'Hard requirement. If both VPCs are 10.0.0.0/16, routing breaks. Plan CIDRs up front.' },
          { term: 'Non-transitive', meaning: 'If A↔B and B↔C, A CANNOT reach C via B. Peerings are strictly pairwise. Use Transit Gateway for transitive routing.' },
          { term: 'Same-region vs inter-region', meaning: 'VPC peering works within and across regions (inter-region = slightly higher latency + cost).' },
          { term: 'When to use TGW instead', meaning: 'If you have >5 VPCs to mesh, peering goes O(n²) which gets ugly. TGW scales linearly.' },
        ],
        examTies: 'N10-009 1.8 (cloud connectivity options — VPC peering), 3.1 (routing between VPCs)',
      },
      tour: [
        {
          title: 'VPC Peering',
          body: 'Two VPCs — VPC-A running the app tier (10.0.0.0/16), VPC-B running the database tier (10.1.0.0/16) — connected by a direct peering link. The peering is a private bilateral connection between two VPCs, bypassing the internet entirely. Simple, low-latency, cheap — but doesn\'t scale the way TGW does.',
          camera: { position: [34, 30, 38], target: [0, 2, 0], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The peering link',
          body: 'A peering connection is a one-to-one relationship between exactly two VPCs. You create it once, both sides add a route to each other\'s CIDR, and traffic starts flowing over the cloud provider\'s private backbone. No bandwidth limit, no encryption overhead (traffic already stays inside the cloud fabric), no transitive routing — if VPC-C appears later, you need a new peer.',
          camera: { position: [0, 16, 14], target: [0, 3, -2], durationMs: 1300 },
          highlight: ['VPC-A (10.0.0.0/16)', 'VPC-B (10.1.0.0/16)'],
          durationMs: 15000
        },
        {
          title: 'App reaches DB privately',
          body: 'App-A-Web (10.0.1.10) calls DB-Primary (10.1.1.10) for data. The packet crosses the peering link — never hits the internet, never sees a NAT, never incurs egress charges to the open internet. You still need matching Security Groups on both sides allowing the ports (e.g., 5432/tcp for Postgres). CIDRs MUST NOT overlap, or the peering won\'t accept the route.',
          camera: { position: [0, 18, 20], target: [0, 2, 0], durationMs: 1300 },
          highlight: ['App-A-Web', 'DB-Primary'],
          durationMs: 16000
        },
        {
          title: 'Remember for the exam',
          body: 'VPC peering = one-to-one, non-transitive. If you have 5 VPCs needing full mesh, you need 10 peerings (N×(N-1)/2) — past that, TGW wins. Peering works across regions and across accounts (same provider). Key exam fact: peering is NOT transitive — if A↔B and B↔C exist, A cannot reach C through B. N10-009 1.8 (cloud connectivity), 3.1 (routing between VPCs).',
          camera: { position: [34, 32, 38], target: [0, 2, 0], durationMs: 1400 },
          highlight: [],
          durationMs: 15000
        }
      ],
    },
    {
      id: 'man',
      title: 'Metropolitan Area Network (MAN)',
      description: 'A MAN spans a city — multiple sites connected by high-speed metro fiber, typically through a single ISP or municipal backbone. Larger than LAN, smaller than WAN.',
      autoBuild: (state) => {
        const metro = _tbMkDev({ type: 'cloud',  x: 700, y: 180, hostname: 'Metro-Fiber' });
        // Site A — Hospital
        const rtrA  = _tbMkDev({ type: 'router', x: 280, y: 380, hostname: 'Hospital-Edge', ip: '10.10.0.1' });
        const swA   = _tbMkDev({ type: 'switch', x: 280, y: 560, hostname: 'Hospital-SW' });
        const pcA   = _tbMkDev({ type: 'pc',     x: 180, y: 740, hostname: 'Hospital-PC-01', ip: '10.10.0.101', gateway: '10.10.0.1' });
        const srvA  = _tbMkDev({ type: 'server', x: 380, y: 740, hostname: 'Patient-DB', ip: '10.10.0.10', gateway: '10.10.0.1' });
        // Site B — Clinic
        const rtrB  = _tbMkDev({ type: 'router', x: 700, y: 380, hostname: 'Clinic-Edge', ip: '10.20.0.1' });
        const swB   = _tbMkDev({ type: 'switch', x: 700, y: 560, hostname: 'Clinic-SW' });
        const pcB1  = _tbMkDev({ type: 'pc',     x: 620, y: 740, hostname: 'Clinic-PC-01', ip: '10.20.0.101', gateway: '10.20.0.1' });
        const pcB2  = _tbMkDev({ type: 'pc',     x: 780, y: 740, hostname: 'Clinic-PC-02', ip: '10.20.0.102', gateway: '10.20.0.1' });
        // Site C — Admin
        const rtrC  = _tbMkDev({ type: 'router', x: 1120,y: 380, hostname: 'Admin-Edge', ip: '10.30.0.1' });
        const swC   = _tbMkDev({ type: 'switch', x: 1120,y: 560, hostname: 'Admin-SW' });
        const pcC   = _tbMkDev({ type: 'pc',     x: 1040,y: 740, hostname: 'Admin-PC-01', ip: '10.30.0.101', gateway: '10.30.0.1' });
        const prnC  = _tbMkDev({ type: 'printer',x: 1220,y: 740, hostname: 'Admin-Printer', ip: '10.30.0.50', gateway: '10.30.0.1' });
        state.devices.push(metro, rtrA, swA, pcA, srvA, rtrB, swB, pcB1, pcB2, rtrC, swC, pcC, prnC);
        state.cables.push(
          _tbMkCable(metro, rtrA, 'fiber'), _tbMkCable(metro, rtrB, 'fiber', 1), _tbMkCable(metro, rtrC, 'fiber', 2),
          _tbMkCable(rtrA, swA, 'cat6', 1), _tbMkCable(swA, pcA), _tbMkCable(swA, srvA, 'cat6', 1),
          _tbMkCable(rtrB, swB, 'cat6', 1), _tbMkCable(swB, pcB1), _tbMkCable(swB, pcB2, 'cat6', 1),
          _tbMkCable(rtrC, swC, 'cat6', 1), _tbMkCable(swC, pcC), _tbMkCable(swC, prnC, 'cat6', 1),
        );
      },
      requirements: [
        'Metro fiber cloud/backbone in the middle',
        'At least 3 city sites, each with edge router + switch + endpoints',
        'Sites interconnect through the metro cloud (not over the public internet)',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'cloud',  min: 1 },
        { type: 'router', min: 3 },
        { type: 'switch', min: 3 },
      ],
      explanation: {
        overview: 'A Metropolitan Area Network (MAN) connects multiple physically separate sites within a single metropolitan area (a city and its suburbs). Larger than a LAN, smaller than a WAN. Typically delivered over high-capacity metro fiber — either by a commercial ISP, a municipal network (e.g., a city-owned fiber ring), or a carrier Ethernet service.',
        dataFlow: 'User at Site A (say, the city\'s main hospital) sends a lab record to Site B (a partner clinic across town). Traffic leaves the hospital\'s LAN via its edge router. Edge router forwards over metro fiber to the ISP\'s metro aggregation switch. The aggregation switch recognises the destination as another on-net customer (Site B) and forwards directly — no internet transit. Site B\'s edge router accepts the traffic and delivers to the clinic\'s LAN. Because it stays on metro fiber end-to-end, latency is typically <5ms and bandwidth is symmetric 1–10 Gbps.',
        keyDevices: [
          { name: 'Metro Fiber / Cloud', role: 'The city-wide backbone. Usually owned by a carrier or municipality.' },
          { name: 'Site Edge Routers', role: 'Each city site has a router at the boundary to the metro fiber.' },
          { name: 'Site Switches', role: 'Distribute traffic within each site (floors, departments).' },
          { name: 'Endpoints', role: 'PCs, phones, IoT — per site. Functionally like a LAN, just with a blazing-fast WAN underneath.' },
        ],
        concepts: [
          { term: 'MAN vs WAN vs LAN', meaning: 'Scale: LAN (one building), MAN (one city), WAN (multiple cities/countries). The line blurs at the edges.' },
          { term: 'Carrier Ethernet', meaning: 'Common MAN delivery: Metro Ethernet (E-Line, E-LAN, E-Tree). Feels like a giant VLAN across town.' },
          { term: 'Last-mile', meaning: 'The final connection from the carrier\'s POP to your site — often the bottleneck even on metro fiber.' },
          { term: 'Municipal / Community networks', meaning: 'City-owned MANs (e.g., Chattanooga\'s "Gig City"). Public-sector alternative to carriers.' },
        ],
        examTies: 'N10-009 1.7 (network types — LAN/WAN/MAN/CAN/PAN — MAN explicitly listed), 1.8 (carrier Ethernet)',
      },
      tour: [
        {
          title: 'Metropolitan Area Network (MAN)',
          body: 'A hospital system connecting three sites across a city: Main Hospital, a Clinic, and Admin offices — all linked via a carrier\'s metro-fiber ring. A MAN is bigger than a LAN (single-building), smaller than a WAN (cross-country), and typically owned or leased from a regional carrier that runs fiber through city streets.',
          camera: { position: [36, 32, 40], target: [0, 2, 0], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The three sites',
          body: 'Each site has its own router, switch, and endpoints on a distinct subnet: Hospital (10.10.0.0/24), Clinic (10.20.0.0/24), Admin (10.30.0.0/24). These look like independent LANs — except they\'re all owned by the same organisation and stitched together by the metro-fiber backbone, so traffic between them stays on-net.',
          camera: { position: [0, 18, 20], target: [0, 2, 0], durationMs: 1300 },
          highlight: ['Hospital-Edge', 'Clinic-Edge', 'Admin-Edge'],
          durationMs: 15000
        },
        {
          title: 'The metro-fiber backbone',
          body: 'The carrier provisions a metro-Ethernet service (or dark fiber you manage yourself) running between all three sites — often in a physical ring for redundancy. Each site\'s edge router has one interface into the metro cloud. Latency between sites is typically ≤5 ms because it\'s all within ~50 km; bandwidth is usually 1 Gbps or 10 Gbps Ethernet.',
          camera: { position: [0, 20, 14], target: [0, 3, -2], durationMs: 1300 },
          highlight: ['Metro-Fiber'],
          durationMs: 16000
        },
        {
          title: 'Remember for the exam',
          body: 'MAN = city-sized network (~5-50 km). Positioned between LAN and WAN in the canonical CompTIA ladder: PAN (personal, Bluetooth) < LAN (building) < CAN (campus, multi-building) < MAN (city) < WAN (regional/global). Common deliveries: metro Ethernet, SONET/SDH rings, dark fiber. Classic use cases: hospital systems, university-system-to-city-branch, municipal networks. N10-009 1.7 (network types).',
          camera: { position: [36, 34, 40], target: [0, 2, 0], durationMs: 1400 },
          highlight: [],
          durationMs: 14000
        }
      ],
    },
    // ══════════════════════════════════════════════════════════════════════
    // v4.49.0 — Tier 1: WAN Architectures (7 new)
    // ══════════════════════════════════════════════════════════════════════
    {
      id: 'point-to-point',
      title: 'Point-to-Point (Leased Line)',
      description: 'The foundational WAN — two sites connected by a single dedicated fiber circuit (T1/T3/DS3). No shared infrastructure, no contention, SLA-backed.',
      requirements: [
        '2 site routers with a dedicated fiber circuit between them',
        'Each site has a switch + endpoints',
        'No internet cloud in the middle — this is a private leased line',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'router', min: 2 },
        { type: 'switch', min: 2 },
      ],
      autoBuild: (state) => {
        const rtrA = _tbMkDev({ type: 'router', x: 300, y: 300, hostname: 'Site-A-RTR', ip: '10.1.0.1' });
        const swA  = _tbMkDev({ type: 'switch', x: 300, y: 500, hostname: 'Site-A-SW' });
        const pcA1 = _tbMkDev({ type: 'pc',     x: 180, y: 680, hostname: 'Site-A-PC-01', ip: '10.1.0.101', gateway: '10.1.0.1' });
        const pcA2 = _tbMkDev({ type: 'pc',     x: 380, y: 680, hostname: 'Site-A-PC-02', ip: '10.1.0.102', gateway: '10.1.0.1' });
        const rtrB = _tbMkDev({ type: 'router', x: 1100,y: 300, hostname: 'Site-B-RTR', ip: '10.2.0.1' });
        const swB  = _tbMkDev({ type: 'switch', x: 1100,y: 500, hostname: 'Site-B-SW' });
        const pcB1 = _tbMkDev({ type: 'pc',     x: 1000,y: 680, hostname: 'Site-B-PC-01', ip: '10.2.0.101', gateway: '10.2.0.1' });
        const srvB = _tbMkDev({ type: 'server', x: 1200,y: 680, hostname: 'Site-B-Server', ip: '10.2.0.10', gateway: '10.2.0.1' });
        state.devices.push(rtrA, swA, pcA1, pcA2, rtrB, swB, pcB1, srvB);
        state.cables.push(
          // Dedicated leased line between the two routers
          _tbMkCable(rtrA, rtrB, 'fiber'),
          _tbMkCable(rtrA, swA, 'cat6', 1), _tbMkCable(swA, pcA1), _tbMkCable(swA, pcA2, 'cat6', 1),
          _tbMkCable(rtrB, swB, 'cat6', 1), _tbMkCable(swB, pcB1), _tbMkCable(swB, srvB, 'cat6', 1),
        );
      },
      explanation: {
        overview: 'A point-to-point (P2P) leased line is a dedicated, permanent circuit between two locations — nothing is shared with other customers. Classic implementations include T1 (1.544 Mbps), T3/DS3 (45 Mbps), and OC-3/OC-48 fiber lines. The carrier provisions bandwidth end-to-end and guarantees it via SLA. This is the purest form of WAN connectivity, predating most shared services.',
        dataFlow: 'A packet from Site-A\'s PC hits the local switch → forwarded to Site-A\'s router. The router has a single WAN interface pointing directly at Site-B — no routing decision needed, just forward the packet onto the leased line. At the remote end, Site-B\'s router receives it and forwards based on its local routing table to the destination subnet. Latency is deterministic (guaranteed by the provider), bandwidth is fixed, and there\'s no contention with other tenants.',
        keyDevices: [
          { name: 'Site Routers', role: 'Each site has one router at the edge. The WAN interface talks directly to the other site over the leased line.' },
          { name: 'Leased Line (Fiber)', role: 'Dedicated physical (or virtual-private) circuit. Not shared with anyone else — you pay for the full bandwidth 24/7.' },
          { name: 'Site Switches', role: 'Local LAN backbone at each site — everything inside the site connects here.' },
          { name: 'Endpoints', role: 'PCs, servers, etc. — they don\'t know the WAN is point-to-point; it just looks like a remote subnet.' },
        ],
        concepts: [
          { term: 'T1 / T3 / DS3', meaning: 'Classic leased-line capacities. T1 = 1.544 Mbps (copper), T3/DS3 = ~45 Mbps. Named after the circuit hierarchy.' },
          { term: 'OC-3 / OC-48', meaning: 'Optical Carrier — higher-bandwidth leased fiber. OC-3 ≈ 155 Mbps, OC-48 ≈ 2.5 Gbps.' },
          { term: 'CSU/DSU', meaning: 'Channel Service Unit / Data Service Unit — the device that converts the leased-line signal to something the router can speak. Often integrated into modern routers.' },
          { term: 'SLA-backed', meaning: 'Service Level Agreement guarantees uptime (e.g., 99.99%) and maximum latency. Broken SLA = refund or service credits.' },
        ],
        examTies: 'N10-009 1.7 (leased lines named explicitly — T1/T3/OC-x), 1.7 (WAN transmission media), 2.1 (latency + bandwidth)',
      },
      tour: [
        {
          title: 'Point-to-Point (Leased Line)',
          body: 'Two sites, one dedicated circuit between them. No internet, no shared carrier fabric — just a private fiber line running between Site A and Site B. The purest WAN topology, predating most shared services, still used when guaranteed bandwidth + deterministic latency matter more than cost.',
          camera: { position: [32, 28, 36], target: [0, 2, 0], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The dedicated circuit',
          body: 'The fiber line between the two site routers is a leased line — T1 (1.544 Mbps), T3/DS3 (45 Mbps), or OC-3/OC-48 for higher-speed fiber. You pay for the full bandwidth 24/7; the carrier provisions it end-to-end and guarantees throughput via SLA. No other customer shares this circuit.',
          camera: { position: [0, 18, 20], target: [0, 2, 0], durationMs: 1300 },
          highlight: ['Site-A-RTR', 'Site-B-RTR'],
          durationMs: 14000
        },
        {
          title: 'How it routes',
          body: 'Site-A\'s router has a single WAN interface pointing at Site-B — no routing decision, just forward. Packets cross the leased line, arrive at Site-B\'s router, then route locally to the destination subnet. Endpoints don\'t know the WAN is dedicated — it just looks like a remote subnet on their default gateway.',
          camera: { position: [-20, 16, 16], target: [0, 2, 0], durationMs: 1300 },
          highlight: ['Site-A-PC-01', 'Site-A-RTR', 'Site-B-RTR', 'Site-B-Server'],
          durationMs: 15000
        },
        {
          title: 'Remember for the exam',
          body: 'Point-to-point = one dedicated circuit = deterministic latency + guaranteed bandwidth + SLA-backed. Know the capacities: T1 (1.544 Mbps), T3/DS3 (~45 Mbps), OC-3 (~155 Mbps), OC-48 (~2.5 Gbps). Know CSU/DSU converts the leased-line signal for the router. N10-009 1.7 (WAN transmission media — leased lines named explicitly).',
          camera: { position: [32, 30, 36], target: [0, 2, 0], durationMs: 1400 },
          highlight: [],
          durationMs: 14000
        }
      ],
    },
    {
      id: 'hub-spoke',
      title: 'Hub-and-Spoke',
      description: 'The classic pre-SD-WAN enterprise pattern — all branches connect only to a central HQ hub; inter-branch traffic (and often internet) backhauls through HQ.',
      requirements: [
        'Central HQ router acting as hub',
        '3+ branch routers, each with its own switch + endpoints',
        'Every branch connects ONLY to HQ (no direct branch-to-branch links)',
        'HQ has the internet/cloud uplink',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'router', min: 4 },
        { type: 'switch', min: 3 },
      ],
      autoBuild: (state) => {
        const cloud = _tbMkDev({ type: 'cloud',  x: 700, y: 100, hostname: 'Internet' });
        const hub   = _tbMkDev({ type: 'router', x: 700, y: 300, hostname: 'HQ-Hub', ip: '10.0.0.1' });
        const hubsw = _tbMkDev({ type: 'switch', x: 700, y: 480, hostname: 'HQ-SW' });
        const hqsrv = _tbMkDev({ type: 'server', x: 700, y: 640, hostname: 'HQ-DC-Server', ip: '10.0.0.10', gateway: '10.0.0.1' });
        const br1  = _tbMkDev({ type: 'router', x: 280, y: 520, hostname: 'Branch-1-RTR', ip: '10.1.0.1' });
        const br1sw = _tbMkDev({ type: 'switch', x: 280, y: 680, hostname: 'Branch-1-SW' });
        const br1pc = _tbMkDev({ type: 'pc',     x: 280, y: 840, hostname: 'Branch-1-PC', ip: '10.1.0.101', gateway: '10.1.0.1' });
        const br2  = _tbMkDev({ type: 'router', x: 700, y: 840, hostname: 'Branch-2-RTR', ip: '10.2.0.1' });
        const br2sw = _tbMkDev({ type: 'switch', x: 500, y: 960, hostname: 'Branch-2-SW' });
        const br2pc = _tbMkDev({ type: 'pc',     x: 500, y: 1100,hostname: 'Branch-2-PC', ip: '10.2.0.101', gateway: '10.2.0.1' });
        const br3  = _tbMkDev({ type: 'router', x: 1120,y: 520, hostname: 'Branch-3-RTR', ip: '10.3.0.1' });
        const br3sw = _tbMkDev({ type: 'switch', x: 1120,y: 680, hostname: 'Branch-3-SW' });
        const br3pc = _tbMkDev({ type: 'pc',     x: 1120,y: 840, hostname: 'Branch-3-PC', ip: '10.3.0.101', gateway: '10.3.0.1' });
        state.devices.push(cloud, hub, hubsw, hqsrv, br1, br1sw, br1pc, br2, br2sw, br2pc, br3, br3sw, br3pc);
        state.cables.push(
          // Hub is the center — everyone connects to hub, hub to internet
          _tbMkCable(cloud, hub),
          _tbMkCable(hub, br1, 'fiber', 1), _tbMkCable(hub, br2, 'fiber', 2), _tbMkCable(hub, br3, 'fiber', 3),
          _tbMkCable(hub, hubsw, 'cat6', 4), _tbMkCable(hubsw, hqsrv),
          _tbMkCable(br1, br1sw, 'cat6', 1), _tbMkCable(br1sw, br1pc),
          _tbMkCable(br2, br2sw, 'cat6', 1), _tbMkCable(br2sw, br2pc),
          _tbMkCable(br3, br3sw, 'cat6', 1), _tbMkCable(br3sw, br3pc),
        );
      },
      explanation: {
        overview: 'Hub-and-spoke is the classic enterprise WAN pattern from the 1990s-2010s: a central HQ acts as the hub, every branch connects only to HQ (never to each other directly). All inter-branch traffic AND often all internet-bound traffic backhauls through the HQ. This is what SD-WAN was invented to replace — the pattern suffers from HQ becoming a bottleneck + single point of failure.',
        dataFlow: 'User at Branch-1 wants to reach a server at Branch-3. Packet leaves Branch-1 → hits Branch-1\'s WAN link → arrives at HQ-Hub. Hub routes it back out its Branch-3 WAN link → Branch-3 router → local switch → destination server. Notice: the packet traversed HQ even though Branch-1 and Branch-3 could theoretically have a shorter path. Same for internet: Branch-1 wants Salesforce → packet goes Branch-1 → HQ → HQ\'s internet gateway → out. Latency accumulates.',
        keyDevices: [
          { name: 'HQ Hub Router', role: 'The center of the star. Every branch talks to this. Holds all branch routes + the internet uplink.' },
          { name: 'Branch Routers', role: 'Each branch has ONE WAN link going only to HQ. Simple config. But if HQ is down, the branch is isolated from all other branches.' },
          { name: 'Internet Gateway (at HQ)', role: 'Single egress point. All company internet traffic funnels through this one firewall.' },
        ],
        concepts: [
          { term: 'Hub-and-spoke topology', meaning: 'Star topology at the WAN level. One central site, many peripherals. Scales well up to ~30 branches.' },
          { term: 'Backhauling', meaning: 'Sending traffic to a central point before it reaches its destination. E.g., a branch in Tokyo reaches Salesforce by going through HQ in NYC.' },
          { term: 'Single point of failure', meaning: 'If HQ link goes down, every branch loses internet + inter-branch connectivity. Modern designs use dual hubs.' },
          { term: 'Why SD-WAN replaced this', meaning: 'Branches now use local internet breakout + overlay routing, so Salesforce from Tokyo goes direct. HQ is no longer the bottleneck.' },
        ],
        examTies: 'N10-009 1.7 (WAN topologies — hub-and-spoke, mesh, point-to-point), 3.1 (routing convergence)',
      },
      // v4.69.0 Phase 4 — Hub-and-Spoke tour (4 steps). Complements SD-WAN
      // by showing the pre-SD-WAN classic pattern + its weaknesses.
      tour: [
        {
          title: 'Hub-and-Spoke',
          body: 'The classic pre-SD-WAN enterprise WAN. HQ sits at the center. Every branch connects ONLY to HQ — no direct branch-to-branch links. This is how enterprise wide-area networks looked for 20 years before SD-WAN took over.',
          camera: { position: [42, 34, 50], target: [-4, 2, -2], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The hub',
          body: 'HQ is the center of gravity — the DC, shared services, the internet uplink. Every branch tunnels back to this router for anything it needs. Email, file shares, SaaS — all routed through the hub.',
          camera: { position: [12, 14, 18], target: [-8, 2, -2], durationMs: 1300 },
          highlight: ['HQ-Hub', 'HQ-SW', 'HQ-DC-Server'],
          durationMs: 12000
        },
        {
          title: 'The spokes',
          body: 'Three branches, each with its own router + switch + endpoints. Each branch has ONE tunnel — to HQ. Branch-1 cannot talk to Branch-3 directly; traffic must backhaul through the hub. One link per branch = simple, but rigid.',
          camera: { position: [-8, 20, 36], target: [-8, 2, 8], durationMs: 1400 },
          highlight: ['Branch-1-RTR', 'Branch-2-RTR', 'Branch-3-RTR'],
          durationMs: 14000
        },
        {
          title: 'Why it loses to SD-WAN',
          body: 'Three weaknesses: inter-branch latency (everything backhauls through HQ), single point of failure (if HQ dies, every branch is isolated), and backhauled internet egress wastes bandwidth on traffic that belongs direct. SD-WAN fixes all three with dynamic overlay routing. N10-009 1.7 (WAN topologies).',
          camera: { position: [-42, 34, 50], target: [-4, 2, -2], durationMs: 1400 },
          highlight: ['HQ-Hub'],
          durationMs: 15000
        }
      ],
    },
    {
      id: 'full-mesh',
      title: 'Full Mesh WAN',
      description: 'Every site connects directly to every other site — O(n²) links. Maximum redundancy and minimum latency between any pair, at the cost of high setup expense.',
      requirements: [
        '4+ site routers',
        'Direct fiber circuit between EVERY pair of routers (full mesh)',
        'Each site has a switch + endpoint',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'router', min: 4 },
        { type: 'switch', min: 4 },
      ],
      autoBuild: (state) => {
        // 4 sites in a quadrilateral — creates 6 mesh links (n*(n-1)/2)
        const rtrA = _tbMkDev({ type: 'router', x: 400, y: 260, hostname: 'Site-A-RTR', ip: '10.1.0.1' });
        const rtrB = _tbMkDev({ type: 'router', x: 1000,y: 260, hostname: 'Site-B-RTR', ip: '10.2.0.1' });
        const rtrC = _tbMkDev({ type: 'router', x: 1000,y: 700, hostname: 'Site-C-RTR', ip: '10.3.0.1' });
        const rtrD = _tbMkDev({ type: 'router', x: 400, y: 700, hostname: 'Site-D-RTR', ip: '10.4.0.1' });
        const swA = _tbMkDev({ type: 'switch', x: 200, y: 140, hostname: 'A-SW' });
        const swB = _tbMkDev({ type: 'switch', x: 1200,y: 140, hostname: 'B-SW' });
        const swC = _tbMkDev({ type: 'switch', x: 1200,y: 820, hostname: 'C-SW' });
        const swD = _tbMkDev({ type: 'switch', x: 200, y: 820, hostname: 'D-SW' });
        const pcA = _tbMkDev({ type: 'pc',     x: 80,  y: 260, hostname: 'A-PC', ip: '10.1.0.101', gateway: '10.1.0.1' });
        const pcB = _tbMkDev({ type: 'pc',     x: 1320,y: 260, hostname: 'B-PC', ip: '10.2.0.101', gateway: '10.2.0.1' });
        const pcC = _tbMkDev({ type: 'pc',     x: 1320,y: 700, hostname: 'C-PC', ip: '10.3.0.101', gateway: '10.3.0.1' });
        const pcD = _tbMkDev({ type: 'pc',     x: 80,  y: 700, hostname: 'D-PC', ip: '10.4.0.101', gateway: '10.4.0.1' });
        state.devices.push(rtrA, rtrB, rtrC, rtrD, swA, swB, swC, swD, pcA, pcB, pcC, pcD);
        state.cables.push(
          // Full mesh: every pair of routers (6 links for 4 routers)
          _tbMkCable(rtrA, rtrB, 'fiber'), _tbMkCable(rtrA, rtrC, 'fiber', 1), _tbMkCable(rtrA, rtrD, 'fiber', 2),
          _tbMkCable(rtrB, rtrC, 'fiber', 3, 4), _tbMkCable(rtrB, rtrD, 'fiber', 4, 4), _tbMkCable(rtrC, rtrD, 'fiber', 5, 5),
          // Each site's internal LAN
          _tbMkCable(rtrA, swA, 'cat6', 6), _tbMkCable(swA, pcA),
          _tbMkCable(rtrB, swB, 'cat6', 5), _tbMkCable(swB, pcB),
          _tbMkCable(rtrC, swC, 'cat6', 6), _tbMkCable(swC, pcC),
          _tbMkCable(rtrD, swD, 'cat6', 5), _tbMkCable(swD, pcD),
        );
      },
      explanation: {
        overview: 'A full-mesh WAN connects every site directly to every other site. For N sites, that\'s N×(N-1)/2 links. Full mesh gives maximum redundancy (any single link failure is transparent) and minimum latency (no intermediate hops). The tradeoff is cost: 4 sites = 6 links, 10 sites = 45 links — it doesn\'t scale economically beyond small site counts.',
        dataFlow: 'Site-A\'s PC wants to reach Site-C\'s resource. Packet hits Site-A\'s router. Routing table has a DIRECT entry for Site-C\'s network via the A↔C link. Packet goes straight to Site-C — one hop. If the A↔C link fails, the router falls back to routing through Site-B or Site-D (still only 2 hops). Contrast with hub-and-spoke where A→C always goes A→HQ→C.',
        keyDevices: [
          { name: 'Site Routers (4+)', role: 'Each router has N-1 WAN interfaces (one per other site). Routing tables carry direct routes to every other site\'s subnets.' },
          { name: 'Inter-site Fiber Links', role: 'Dedicated circuits between every pair. Full mesh = N×(N-1)/2 total links. This is expensive to provision but bulletproof.' },
          { name: 'Site LANs', role: 'Typical switch + endpoint setup at each site. Users don\'t see the mesh — routing just works.' },
        ],
        concepts: [
          { term: 'Mesh topology', meaning: 'Every node connected to every other. O(n²) link count. Maximum redundancy.' },
          { term: 'Partial mesh', meaning: 'Compromise: critical pairs get direct links, less-busy pairs go through intermediaries. Common at 10+ sites.' },
          { term: 'Link count formula', meaning: 'N×(N-1)/2 for N sites. 3 sites = 3 links, 4 = 6, 5 = 10, 10 = 45.' },
          { term: 'When to use', meaning: 'Small site counts (4-6), latency-sensitive apps (financial trading, real-time video), or unlimited budget.' },
        ],
        examTies: 'N10-009 1.7 (WAN topologies — mesh, full vs partial), 3.1 (routing convergence + redundancy)',
      },
      tour: [
        {
          title: 'Full Mesh WAN',
          body: 'Every site connects directly to every other site. No hub, no hierarchy, no traffic backhauling. Maximum redundancy at maximum cost — the \"money is no object\" WAN topology. You\'ll see this in financial trading firms, emergency services, and mission-critical small networks.',
          camera: { position: [36, 32, 40], target: [0, 2, 0], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The geometry',
          body: 'Count the links: 4 sites × 3 neighbors ÷ 2 = 6 links. The formula is N×(N-1)/2. Scale that up: 5 sites = 10 links. 10 sites = 45 links. 20 sites = 190 links. O(n²) growth — this is why full mesh breaks down past small deployments. The circuit bill quadruples before you feel it.',
          camera: { position: [0, 22, 22], target: [0, 2, 0], durationMs: 1300 },
          highlight: ['Site-A-RTR', 'Site-B-RTR', 'Site-C-RTR', 'Site-D-RTR'],
          durationMs: 15000
        },
        {
          title: 'The tradeoff',
          body: 'Upside: any site-to-site path is one hop — minimum latency, and losing any single link leaves every pair still reachable. Downside: you\'re paying for every possible circuit, and most carry light load. Partial mesh is the compromise: direct links only between the busy pairs, indirect for the rest.',
          camera: { position: [-20, 18, 20], target: [0, 2, 0], durationMs: 1300 },
          highlight: ['Site-A-RTR', 'Site-B-RTR', 'Site-C-RTR', 'Site-D-RTR'],
          durationMs: 14000
        },
        {
          title: 'Remember for the exam',
          body: 'Full mesh = N×(N-1)/2 links, fits 3–5 critical sites, collapses economically past that. The exam will hand you a WAN scenario and ask you to pick between full mesh, partial mesh, hub-and-spoke, and point-to-point — the correct answer is almost always driven by site count + criticality. N10-009 1.7 (WAN topologies).',
          camera: { position: [36, 34, 40], target: [0, 2, 0], durationMs: 1400 },
          highlight: [],
          durationMs: 14000
        }
      ],
    },
    {
      id: 's2s-vpn',
      title: 'Site-to-Site IPSec VPN',
      description: 'Two offices connected by an IPSec VPN tunnel over the public internet. The modern replacement for leased lines — cheap WAN, with encryption compensating for the untrusted transport.',
      requirements: [
        '2 offices, each with a firewall/VPN gateway',
        'Public internet cloud between them (untrusted transport)',
        'IPSec tunnel encapsulated over the internet link',
        'Each office has a switch + endpoints',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'firewall', min: 2 },
        { type: 'switch',   min: 2 },
        { type: 'cloud',    min: 1 },
      ],
      autoBuild: (state) => {
        const fwA  = _tbMkDev({ type: 'firewall', x: 280, y: 280, hostname: 'HQ-FW', ip: '203.0.113.1' });
        const swA  = _tbMkDev({ type: 'switch',   x: 280, y: 480, hostname: 'HQ-SW' });
        const pcA1 = _tbMkDev({ type: 'pc',       x: 180, y: 660, hostname: 'HQ-PC-01', ip: '10.1.0.101', gateway: '10.1.0.1' });
        const pcA2 = _tbMkDev({ type: 'pc',       x: 380, y: 660, hostname: 'HQ-PC-02', ip: '10.1.0.102', gateway: '10.1.0.1' });
        const internet = _tbMkDev({ type: 'cloud', x: 700, y: 140, hostname: 'Internet' });
        const fwB  = _tbMkDev({ type: 'firewall', x: 1120,y: 280, hostname: 'Branch-FW', ip: '198.51.100.1' });
        const swB  = _tbMkDev({ type: 'switch',   x: 1120,y: 480, hostname: 'Branch-SW' });
        const pcB1 = _tbMkDev({ type: 'pc',       x: 1020,y: 660, hostname: 'Branch-PC', ip: '10.2.0.101', gateway: '10.2.0.1' });
        const srvB = _tbMkDev({ type: 'server',   x: 1220,y: 660, hostname: 'Branch-Srv', ip: '10.2.0.10', gateway: '10.2.0.1' });
        state.devices.push(fwA, swA, pcA1, pcA2, internet, fwB, swB, pcB1, srvB);
        state.cables.push(
          _tbMkCable(fwA, internet), _tbMkCable(internet, fwB, 'cat6', 1),
          // IPSec tunnel — visualise as a separate fiber "virtual" cable between the two FW endpoints
          _tbMkCable(fwA, fwB, 'fiber', 1, 1),
          _tbMkCable(fwA, swA, 'cat6', 2), _tbMkCable(swA, pcA1), _tbMkCable(swA, pcA2, 'cat6', 1),
          _tbMkCable(fwB, swB, 'cat6', 2), _tbMkCable(swB, pcB1), _tbMkCable(swB, srvB, 'cat6', 1),
        );
      },
      explanation: {
        overview: 'Site-to-Site IPSec VPN creates a permanent encrypted tunnel between two offices over the public internet. Both sides run IPSec at their edge firewall/VPN gateway; traffic is encrypted at the source, travels through the internet as ciphertext, and is decrypted at the destination. This is how modern companies connect branch offices without paying for dedicated leased lines.',
        dataFlow: 'PC at HQ sends a packet to Branch server (10.2.0.10). HQ firewall sees the destination is in Branch\'s subnet → matches the IPSec tunnel\'s "interesting traffic" ACL → encrypts the packet with ESP (AES-256) → wraps in a new IP header with the Branch firewall\'s public IP (198.51.100.1). Packet travels across the public internet (encrypted — any ISP snooping sees only gibberish). Branch firewall receives, decrypts, inspects the original destination, forwards to Branch-SW → server.',
        keyDevices: [
          { name: 'Two Firewalls / VPN Gateways', role: 'One at each site. Both must agree on IPSec parameters (encryption, hash, DH group, lifetimes). Mismatched params = tunnel fails.' },
          { name: 'Public Internet Transport', role: 'The cheap part. No dedicated circuit — just each office\'s regular internet connection. Bandwidth depends on whichever link is slower.' },
          { name: 'IPSec Tunnel (logical)', role: 'A virtual link between the two firewalls. Traffic flows through it as if it were a direct cable, but packets are encrypted end-to-end.' },
        ],
        concepts: [
          { term: 'IPSec', meaning: 'IP Security protocol suite. Two modes: tunnel (used for S2S — encrypts the full packet) and transport (host-to-host).' },
          { term: 'ESP vs AH', meaning: 'Encapsulating Security Payload = encryption + auth. Authentication Header = auth only, no encryption. Almost always ESP.' },
          { term: 'IKE (Phase 1 + 2)', meaning: 'Internet Key Exchange — the handshake protocol. Phase 1 negotiates ciphers for the control channel; Phase 2 negotiates the actual data tunnel.' },
          { term: 'Interesting traffic', meaning: 'ACL that defines WHICH packets go through the tunnel vs out to the plain internet. Usually "traffic between our two LANs."' },
        ],
        examTies: 'N10-009 4.4 (Site-to-site VPN explicitly), 4.4 (IPSec, IKE, ESP, AH), 4.1 (VPN concepts)',
      },
      tour: [
        {
          title: 'Site-to-Site IPsec VPN',
          body: 'Two offices — HQ on the left, Branch on the right — connected by an IPsec tunnel over the public internet. The modern replacement for leased lines: you reuse commodity broadband and let IPsec\'s encryption compensate for the untrusted transport.',
          camera: { position: [34, 30, 38], target: [0, 2, 0], durationMs: 1300 },
          highlight: [],
          durationMs: 13000
        },
        {
          title: 'The two VPN endpoints',
          body: 'Each office has a firewall that doubles as a VPN gateway. HQ-FW holds a public WAN IP (203.0.113.1); Branch-FW holds another (198.51.100.1). The tunnel terminates on these two devices — everything behind them (10.1.0.0/24 at HQ, 10.2.0.0/24 at Branch) stays on private addressing.',
          camera: { position: [-6, 14, 16], target: [-10, 2, -4], durationMs: 1300 },
          highlight: ['HQ-FW', 'Branch-FW'],
          durationMs: 14000
        },
        {
          title: 'How the tunnel carries traffic',
          body: 'A packet from HQ-PC to Branch-Srv leaves HQ, hits HQ-FW, gets encapsulated in IPsec (ESP header + encryption), travels the public internet as ciphertext, arrives at Branch-FW, gets decrypted, then routes to Branch-Srv. The internet sees encrypted ESP; only the two firewalls can read the inner payload.',
          camera: { position: [0, 18, 20], target: [0, 2, 0], durationMs: 1300 },
          highlight: ['HQ-PC-01', 'HQ-FW', 'Internet', 'Branch-FW', 'Branch-Srv'],
          durationMs: 16000
        },
        {
          title: 'Remember for the exam',
          body: 'Site-to-site VPN = always-on tunnel between two gateways (no client software on endpoints — different from remote-access VPN). IPsec has two phases: IKE (Phase 1) negotiates the management channel, ESP (Phase 2) protects the actual data. Both phases\' parameters must match exactly between peers. N10-009 4.4 (Site-to-site + IPsec + IKE + ESP).',
          camera: { position: [34, 32, 38], target: [0, 2, 0], durationMs: 1400 },
          highlight: ['HQ-FW', 'Branch-FW'],
          durationMs: 15000
        }
      ],
    },
    {
      id: 'remote-vpn',
      title: 'Remote Access VPN (Client VPN)',
      description: 'Individual users (work-from-home, road warriors) connect via SSL or IPSec VPN client from their device to a VPN concentrator at corporate HQ — gaining access to internal resources.',
      requirements: [
        'Remote client devices (laptops, phones) on the untrusted internet',
        'Public internet cloud between client and corporate',
        'VPN concentrator (firewall) at corporate HQ',
        'Internal LAN with protected resources behind the concentrator',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'firewall', min: 1 },
        { type: 'cloud',    min: 1 },
      ],
      autoBuild: (state) => {
        const lt    = _tbMkDev({ type: 'laptop',    x: 200, y: 180, hostname: 'Alice-Laptop' });
        const ph    = _tbMkDev({ type: 'smartphone',x: 200, y: 440, hostname: 'Alice-Phone', iface: 'wlan0' });
        const lt2   = _tbMkDev({ type: 'laptop',    x: 200, y: 700, hostname: 'Bob-Laptop' });
        const internet = _tbMkDev({ type: 'cloud', x: 600, y: 440, hostname: 'Internet' });
        const vpnfw = _tbMkDev({ type: 'firewall', x: 940, y: 440, hostname: 'VPN-Concentrator', ip: '203.0.113.10' });
        const sw    = _tbMkDev({ type: 'switch',   x: 1180,y: 440, hostname: 'Internal-SW' });
        const srv1  = _tbMkDev({ type: 'server',   x: 1380,y: 320, hostname: 'Internal-App', ip: '10.0.0.10' });
        const srv2  = _tbMkDev({ type: 'server',   x: 1380,y: 560, hostname: 'Internal-DB', ip: '10.0.0.20' });
        state.devices.push(lt, ph, lt2, internet, vpnfw, sw, srv1, srv2);
        state.cables.push(
          _tbMkCable(lt, internet, 'fiber'), _tbMkCable(ph, internet, 'fiber', 0, 1), _tbMkCable(lt2, internet, 'fiber', 0, 2),
          _tbMkCable(internet, vpnfw, 'fiber', 3),
          _tbMkCable(vpnfw, sw, 'cat6', 1), _tbMkCable(sw, srv1), _tbMkCable(sw, srv2, 'cat6', 1),
        );
      },
      explanation: {
        overview: 'Remote Access VPN (also called Client VPN) lets individual users connect their personal or corporate device to the company network over the internet. The user runs a VPN client (Cisco AnyConnect, OpenVPN, GlobalProtect, native OS clients) that authenticates and establishes an encrypted tunnel to a concentrator at HQ. Once connected, the client appears to be on the internal LAN — can reach servers, file shares, databases.',
        dataFlow: 'Alice opens her VPN client → enters username/password (+ MFA). Client authenticates to the concentrator. Concentrator assigns Alice an internal IP (e.g., 10.0.99.5) from a VPN pool. Alice\'s laptop now has an additional virtual interface on the corporate network. When Alice opens Outlook → traffic for 10.0.0.0/8 routes through the VPN client → encrypted → concentrator decrypts → forwards to internal mail server. Reply comes back reverse path.',
        keyDevices: [
          { name: 'VPN Client Software', role: 'On the user\'s device — laptop, phone, tablet. Provides the user-facing UI and establishes/maintains the tunnel.' },
          { name: 'VPN Concentrator', role: 'The firewall or dedicated appliance at HQ that terminates all incoming client VPN connections. Handles authentication, encryption, IP assignment.' },
          { name: 'Authentication Back-End', role: 'Usually RADIUS + Active Directory + MFA (Duo, Microsoft Authenticator, etc.). Validates who\'s connecting.' },
          { name: 'Internal Resources', role: 'App servers, DBs, file shares — the stuff users want to reach. Usually can\'t be reached directly from the internet.' },
        ],
        concepts: [
          { term: 'SSL/TLS VPN', meaning: 'Uses HTTPS (TCP 443) — firewall-friendly, works from anywhere. Common: OpenVPN, AnyConnect, GlobalProtect.' },
          { term: 'IPSec Client VPN', meaning: 'Uses IPSec in tunnel mode. Sometimes used instead of SSL/TLS. Windows built-in "L2TP/IPSec" is an example.' },
          { term: 'Split tunnel vs full tunnel', meaning: 'Split: only corporate-bound traffic goes through VPN; internet-bound stays local. Full: everything goes through VPN (better security, slower).' },
          { term: 'MFA (Multi-Factor Auth)', meaning: 'Something-you-know (password) + something-you-have (phone/token). Standard for all modern client VPNs.' },
        ],
        examTies: 'N10-009 4.4 (Client/Remote VPN), 4.4 (SSL/TLS vs IPSec VPN), 4.3 (MFA + AAA)',
      },
    },
    {
      id: 'cellular',
      title: 'Cellular 4G/5G WAN',
      description: 'Branch or mobile site connects to the internet via a cellular modem → nearest cell tower → provider core network. Used for primary WAN (remote sites) or backup (SD-WAN secondary).',
      requirements: [
        'Branch site with cellular-capable router/modem',
        'Cell tower (radio tower) as the access point to the provider network',
        'Provider cloud (cellular core) → internet',
        'Endpoints at the branch',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'router',     min: 1 },
        { type: 'cell-tower', min: 1 },
        { type: 'cloud',      min: 1 },
      ],
      autoBuild: (state) => {
        const internet = _tbMkDev({ type: 'cloud',     x: 1100,y: 140, hostname: 'Internet' });
        const provider = _tbMkDev({ type: 'cloud',     x: 900, y: 300, hostname: 'Carrier Core (EPC/5GC)' });
        const tower    = _tbMkDev({ type: 'cell-tower',x: 620, y: 300, hostname: 'Cell Tower' });
        const rtr      = _tbMkDev({ type: 'router',    x: 350, y: 480, hostname: 'Branch-LTE-RTR', ip: '10.10.0.1' });
        const sw       = _tbMkDev({ type: 'switch',    x: 350, y: 660, hostname: 'Branch-SW' });
        const pc       = _tbMkDev({ type: 'pc',        x: 200, y: 820, hostname: 'Branch-PC', ip: '10.10.0.101', gateway: '10.10.0.1' });
        const lt       = _tbMkDev({ type: 'laptop',    x: 500, y: 820, hostname: 'Branch-Laptop', ip: '10.10.0.102', gateway: '10.10.0.1' });
        state.devices.push(internet, provider, tower, rtr, sw, pc, lt);
        state.cables.push(
          _tbMkCable(rtr, tower, 'fiber'),               // Wireless air-interface (represented as fiber for visual)
          _tbMkCable(tower, provider, 'fiber', 1),       // Backhaul from tower to carrier core
          _tbMkCable(provider, internet, 'fiber', 1),    // Carrier → public internet
          _tbMkCable(rtr, sw, 'cat6', 1), _tbMkCable(sw, pc), _tbMkCable(sw, lt, 'cat6', 1),
        );
      },
      explanation: {
        overview: 'A cellular WAN uses the mobile phone networks (LTE/4G, 5G) as the internet transport. A cellular-capable router at the branch has a SIM card and connects to the nearest cell tower via radio. The tower backhauls to the carrier\'s core network (EPC for 4G, 5GC for 5G), which routes traffic to the public internet. Common uses: remote sites where wired internet isn\'t available, mobile/vehicle deployments, SD-WAN backup links.',
        dataFlow: 'User at branch sends traffic. Branch router\'s cellular modem transmits the packet via radio (LTE Band 66, 5G Band n78, etc.) to the nearest tower. Tower receives, forwards to carrier core over fiber backhaul. Core does GTP tunneling + charging + policy enforcement, then hands off to the carrier\'s internet peering. Packet reaches destination. Return path: destination → carrier → tower → branch router. Latency is typically 30-50ms (4G) or 10-20ms (5G).',
        keyDevices: [
          { name: 'Cellular Modem/Router', role: 'Has a SIM card and radio hardware. Authenticates to the carrier via IMSI/IMEI, gets assigned an IP from the carrier\'s pool.' },
          { name: 'Cell Tower (eNodeB / gNodeB)', role: 'The radio access point. Serves multiple branches within its coverage radius. 4G calls it eNodeB, 5G calls it gNodeB.' },
          { name: 'Carrier Core (EPC / 5GC)', role: 'The carrier\'s datacenter: handles authentication, routing, IP assignment, charging, policy (e.g., throttling). Opaque to the customer.' },
          { name: 'Public Internet', role: 'The eventual destination for most traffic. Carrier peers with tier-1 ISPs at exchange points.' },
        ],
        concepts: [
          { term: '4G LTE vs 5G', meaning: '5G = lower latency (~10ms), higher bandwidth (up to 10 Gbps theoretical), more device density. Backwards compatible — most 5G devices fall back to 4G when out of 5G range.' },
          { term: 'SIM card + IMSI', meaning: 'SIM holds the subscriber identity (IMSI — International Mobile Subscriber Identity). Without it, no carrier service.' },
          { term: 'APN (Access Point Name)', meaning: 'Tells the carrier which gateway to route your traffic through (e.g., "internet" for regular, "iot.corp" for private APN).' },
          { term: 'Private APN / Corporate LTE', meaning: 'Enterprise feature: the carrier routes your LTE traffic directly to your corporate VPN gateway — never touches the public internet.' },
        ],
        examTies: 'N10-009 1.7 (cellular transmission media — LTE/4G/5G explicitly), 2.3 (wireless technologies), 1.7 (WAN transport options)',
      },
    },
    {
      id: 'satellite-wan',
      title: 'Satellite WAN',
      description: 'Remote site connects via satellite dish → orbital satellite → teleport (ground station) → internet. Used for rural/maritime/polar sites where no terrestrial WAN is available.',
      requirements: [
        'Remote site router',
        'Satellite dish + orbital satellite in the signal path',
        'Teleport/NOC (ISP router/cloud) that bridges satellite to the internet',
        'Endpoints at the remote site',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'satellite', min: 1 },
        { type: 'cloud',     min: 1 },
        { type: 'router',    min: 1 },
      ],
      autoBuild: (state) => {
        const internet = _tbMkDev({ type: 'cloud',    x: 1200,y: 120, hostname: 'Internet' });
        const teleport = _tbMkDev({ type: 'isp-router',x: 1000,y: 300, hostname: 'Teleport/NOC' });
        const sat      = _tbMkDev({ type: 'satellite',x: 700, y: 160, hostname: 'GEO Satellite' });
        const dish     = _tbMkDev({ type: 'satellite',x: 400, y: 300, hostname: 'Remote Dish' });
        const rtr      = _tbMkDev({ type: 'router',   x: 400, y: 480, hostname: 'Remote-RTR', ip: '10.50.0.1' });
        const sw       = _tbMkDev({ type: 'switch',   x: 400, y: 660, hostname: 'Remote-SW' });
        const pc       = _tbMkDev({ type: 'pc',       x: 280, y: 820, hostname: 'Remote-PC', ip: '10.50.0.101', gateway: '10.50.0.1' });
        const srv      = _tbMkDev({ type: 'server',   x: 520, y: 820, hostname: 'Remote-Srv', ip: '10.50.0.10', gateway: '10.50.0.1' });
        state.devices.push(internet, teleport, sat, dish, rtr, sw, pc, srv);
        state.cables.push(
          _tbMkCable(rtr, dish, 'cat6', 0, 1),    // Remote router to dish
          _tbMkCable(dish, sat, 'fiber'),          // Dish uplink (radio, shown as fiber)
          _tbMkCable(sat, teleport, 'fiber', 1),   // Satellite downlink to teleport
          _tbMkCable(teleport, internet, 'fiber', 1), // Teleport to public internet
          _tbMkCable(rtr, sw, 'cat6', 1), _tbMkCable(sw, pc), _tbMkCable(sw, srv, 'cat6', 1),
        );
      },
      explanation: {
        overview: 'Satellite WAN connects remote locations via a dish pointed at an orbital satellite, which relays the signal to a teleport (ground station) that connects to the public internet. Critical for sites where no terrestrial WAN exists: ships at sea, oil rigs, polar research stations, rural villages, aircraft in flight. Two main architectures: GEO (geostationary, 36,000 km orbit, high latency ~600ms round-trip) and LEO (low-earth orbit, e.g., Starlink, 550km orbit, ~30-50ms latency).',
        dataFlow: 'Remote PC sends a packet. Travels to remote router → to satellite dish. Dish transmits upward (Ku/Ka band) to the satellite. Satellite receives, amplifies, retransmits downward to the teleport\'s receiving dish. Teleport\'s ground infrastructure routes the packet onto the public internet via the ISP\'s backbone. Reply travels the reverse path — dish → satellite (down) → remote dish (up) → remote router. Double-hop gives GEO its notoriously high latency.',
        keyDevices: [
          { name: 'Remote Satellite Dish', role: 'Parabolic antenna at the customer site. Must have clear sky view (no heavy foliage, buildings). Transmit + receive in different frequency bands.' },
          { name: 'Orbital Satellite', role: 'In GEO: fixed relative to Earth, always visible from same dish angle. In LEO: moves across sky, requires tracking/switching between satellites.' },
          { name: 'Teleport / NOC', role: 'Ground station with large dish(es) that talks to the satellite. Connects the satellite link to the terrestrial internet backbone.' },
          { name: 'Remote Router', role: 'Normal router at the customer side. Treats the satellite link like any WAN interface (although may need QoS tuning for the high latency).' },
        ],
        concepts: [
          { term: 'GEO vs LEO', meaning: 'Geostationary: 36,000 km, 500-700ms latency, 1 satellite covers huge area. LEO: 300-1200 km, 30-50ms latency, need hundreds of satellites (Starlink uses ~5,000+).' },
          { term: 'Ku band / Ka band', meaning: 'Frequency ranges used for satellite. Ka (26-40 GHz) = higher bandwidth, more rain-fade sensitivity. Ku (12-18 GHz) = lower bandwidth, more robust to weather.' },
          { term: 'Rain fade', meaning: 'Heavy rain absorbs satellite signals, degrading the link. Can cause outages or speed drops. Worse on Ka band than Ku band.' },
          { term: 'Latency implications', meaning: '500ms+ on GEO = noticeable delay on interactive apps (Zoom, SSH). VPN and TCP over GEO can be painful — TCP "window" needs to be tuned up.' },
        ],
        examTies: 'N10-009 1.7 (satellite explicitly listed), 1.7 (transmission media), 2.1 (latency considerations)',
      },
    },
    // ══════════════════════════════════════════════════════════════════════
    // v4.49.0 — Tier 2: Broadband & Last-Mile (3 new)
    // ══════════════════════════════════════════════════════════════════════
    {
      id: 'dsl',
      title: 'DSL Branch',
      description: 'Home or small-branch connection via DSL (Digital Subscriber Line) — copper telephone wires carry broadband via frequency-division multiplexing. Shared with voice (on ADSL/VDSL).',
      requirements: [
        'DSL modem at the customer site',
        'Telco DSLAM (provider cloud — Digital Subscriber Line Access Multiplexer)',
        'Internet cloud beyond the DSLAM',
        'Home/branch endpoints via a small router',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'modem', min: 1 },
        { type: 'cloud', min: 1 },
      ],
      autoBuild: (state) => {
        const internet = _tbMkDev({ type: 'cloud',  x: 1100,y: 140, hostname: 'Internet' });
        const dslam    = _tbMkDev({ type: 'cloud',  x: 800, y: 280, hostname: 'Telco DSLAM' });
        const modem    = _tbMkDev({ type: 'modem',  x: 500, y: 440, hostname: 'DSL Modem' });
        const rtr      = _tbMkDev({ type: 'router', x: 500, y: 600, hostname: 'Home-RTR', ip: '192.168.1.1' });
        const lt       = _tbMkDev({ type: 'laptop', x: 320, y: 760, hostname: 'Laptop',  ip: '192.168.1.101', gateway: '192.168.1.1' });
        const ph       = _tbMkDev({ type: 'smartphone',x: 500, y: 800, hostname: 'Phone', ip: '192.168.1.102', gateway: '192.168.1.1', iface: 'wlan0' });
        const pc       = _tbMkDev({ type: 'pc',     x: 680, y: 760, hostname: 'Desktop', ip: '192.168.1.103', gateway: '192.168.1.1' });
        state.devices.push(internet, dslam, modem, rtr, lt, ph, pc);
        state.cables.push(
          _tbMkCable(dslam, internet, 'fiber'),
          _tbMkCable(modem, dslam, 'coax'),        // Copper phone line (represented as coax for cable visual)
          _tbMkCable(modem, rtr, 'cat6', 1),
          _tbMkCable(rtr, lt, 'cat6', 1), _tbMkCable(rtr, ph, 'cat6', 2), _tbMkCable(rtr, pc, 'cat6', 3),
        );
      },
      explanation: {
        overview: 'DSL (Digital Subscriber Line) delivers internet over ordinary copper telephone wires. A DSL modem at your house splits the signal: low frequencies carry voice (plain old telephone service, POTS), high frequencies carry internet data. The signal terminates at the telco\'s DSLAM (Digital Subscriber Line Access Multiplexer) in a street cabinet, which aggregates many subscribers onto the provider\'s backbone. Variants: ADSL (asymmetric, faster down than up, ~25 Mbps/5 Mbps), VDSL (faster, ~100/40 Mbps), G.fast (newest, ~500 Mbps but short range).',
        dataFlow: 'Laptop browses the web. Traffic hits the home router → DSL modem. The modem modulates the Ethernet packet into high-frequency tones on the copper line (frequency ranges well above voice). Signal travels along telephone wires to the neighborhood DSLAM. DSLAM demodulates the signal back to digital, aggregates it with other subscribers\' traffic, and forwards onto the ISP\'s fiber backbone → internet. Reply comes back reverse path.',
        keyDevices: [
          { name: 'DSL Modem', role: 'Translates between Ethernet (digital, on the home side) and DSL signaling (analog-tones over copper, on the line side). Often combined with router + Wi-Fi in one box.' },
          { name: 'Copper Phone Line', role: 'The "last mile" — typically up to 3-5 km of existing phone wiring. The longer the run, the lower the max speed.' },
          { name: 'DSLAM', role: 'Telco\'s aggregation point in a neighborhood street cabinet. One DSLAM serves 48-192 subscribers. Feeds into the ISP\'s fiber backhaul.' },
        ],
        concepts: [
          { term: 'ADSL vs SDSL', meaning: 'Asymmetric (most consumer DSL, fast down + slow up) vs Symmetric (equal up/down, more expensive, for business).' },
          { term: 'Distance vs speed', meaning: 'DSL performance degrades with copper length. <1 km ≈ max speed. At 3-4 km ≈ half speed. Beyond 5 km ≈ unusable.' },
          { term: 'DMT (Discrete Multi-Tone)', meaning: 'The modulation scheme: splits the copper into 256 narrowband "tones" at different frequencies; each tone carries a small chunk of data.' },
          { term: 'POTS co-existence', meaning: 'A micro-filter at each phone jack separates voice (low freq) from data (high freq). Same copper pair carries both simultaneously.' },
        ],
        examTies: 'N10-009 1.7 (DSL explicitly listed), 1.7 (copper as transmission medium), 2.1 (bandwidth limitations by distance)',
      },
    },
    {
      id: 'cable',
      title: 'Cable Broadband (DOCSIS)',
      description: 'Home or branch internet via coaxial cable (the same cable that delivers TV). Uses DOCSIS standard; shared medium so speeds fluctuate with neighbor usage.',
      requirements: [
        'Cable modem at the customer site',
        'CMTS (Cable Modem Termination System — provider cloud)',
        'Internet cloud beyond CMTS',
        'Home/branch endpoints via a small router',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'modem', min: 1 },
        { type: 'cloud', min: 1 },
      ],
      autoBuild: (state) => {
        const internet = _tbMkDev({ type: 'cloud',  x: 1100,y: 140, hostname: 'Internet' });
        const cmts     = _tbMkDev({ type: 'cloud',  x: 800, y: 280, hostname: 'ISP CMTS (headend)' });
        const modem    = _tbMkDev({ type: 'modem',  x: 500, y: 440, hostname: 'Cable Modem' });
        const rtr      = _tbMkDev({ type: 'router', x: 500, y: 600, hostname: 'Home-RTR', ip: '192.168.1.1' });
        const lt       = _tbMkDev({ type: 'laptop', x: 300, y: 760, hostname: 'Laptop',   ip: '192.168.1.101', gateway: '192.168.1.1' });
        const tv       = _tbMkDev({ type: 'smart-tv',x: 500, y: 800, hostname: 'Smart-TV', ip: '192.168.1.102', gateway: '192.168.1.1' });
        const gc       = _tbMkDev({ type: 'game-console',x: 700,y: 760, hostname: 'Xbox',  ip: '192.168.1.103', gateway: '192.168.1.1' });
        state.devices.push(internet, cmts, modem, rtr, lt, tv, gc);
        state.cables.push(
          _tbMkCable(cmts, internet, 'fiber'),
          _tbMkCable(modem, cmts, 'coax'),         // Coax to CMTS headend
          _tbMkCable(modem, rtr, 'cat6', 1),
          _tbMkCable(rtr, lt, 'cat6', 1), _tbMkCable(rtr, tv, 'cat6', 2), _tbMkCable(rtr, gc, 'cat6', 3),
        );
      },
      explanation: {
        overview: 'Cable broadband delivers internet over the same coaxial cable that brings TV to the home — an RG-6 coax going to a cable modem. The standard is DOCSIS (Data Over Cable Service Interface Specification), now at version 3.1 and rolling into 4.0 (multi-gigabit). Unlike DSL, the coax in a neighborhood is SHARED: many homes on the same coaxial segment feed into a CMTS (Cable Modem Termination System) at the ISP\'s headend. That shared-medium nature means speeds can drop when neighbors are heavy users.',
        dataFlow: 'Your Xbox requests a game update. Traffic goes through home router → cable modem. The modem modulates the Ethernet packet onto RF frequencies in the coaxial cable\'s upstream channels (typically 5-85 MHz on DOCSIS 3.1). Signal travels through the neighborhood coax trunk to the CMTS headend. CMTS demodulates, routes onto the ISP\'s fiber backbone → internet. Download: same path reversed, using downstream channels (108 MHz and up — same coax, different frequencies).',
        keyDevices: [
          { name: 'Cable Modem', role: 'Translates between Ethernet (home side) and DOCSIS RF (coax side). DOCSIS 3.1+ supports multi-gigabit with channel bonding.' },
          { name: 'Coaxial Cable (RG-6)', role: 'Carries both TV and internet on the same line, on different frequency ranges. Shared with other homes in the neighborhood at the trunk level.' },
          { name: 'CMTS (headend)', role: 'ISP\'s termination equipment. One CMTS serves hundreds to thousands of cable modems in a service area.' },
        ],
        concepts: [
          { term: 'DOCSIS', meaning: 'Data Over Cable Service Interface Specification. Standards: 1.1 (legacy), 3.0 (multi-hundred Mbps), 3.1 (gigabit+), 4.0 (multi-gig with full duplex).' },
          { term: 'Shared medium', meaning: 'All subscribers on the same coax trunk share bandwidth. Peak-hour slowdowns are normal. Unlike DSL which is dedicated per subscriber.' },
          { term: 'Upstream vs downstream', meaning: 'Traditionally asymmetric — more bandwidth for download. DOCSIS 4.0 introduces "full duplex" with equal up/down.' },
          { term: 'Channel bonding', meaning: 'Combining multiple DOCSIS channels for higher speed. DOCSIS 3.1 bonds 32+ channels downstream.' },
        ],
        examTies: 'N10-009 1.7 (cable explicitly named), 1.7 (coaxial transmission media), 1.7 (shared vs dedicated media)',
      },
    },
    {
      id: 'ftth',
      title: 'Fiber-to-the-Home (FTTH/GPON)',
      description: 'Optical fiber delivered all the way to the subscriber\'s premises. Uses Passive Optical Network (GPON/XGS-PON) — light is split passively in the field, no active electronics in the outside plant.',
      requirements: [
        'ONT (Optical Network Terminal) at the customer side — modelled as the modem',
        'OLT (Optical Line Terminal) at the ISP — modelled as the provider cloud',
        'Internet cloud beyond',
        'Home endpoints via a small router',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'modem', min: 1 },
        { type: 'cloud', min: 1 },
      ],
      autoBuild: (state) => {
        const internet = _tbMkDev({ type: 'cloud',  x: 1100,y: 140, hostname: 'Internet' });
        const olt      = _tbMkDev({ type: 'cloud',  x: 800, y: 280, hostname: 'ISP OLT (PON)' });
        const ont      = _tbMkDev({ type: 'modem',  x: 500, y: 440, hostname: 'ONT (fiber modem)' });
        const rtr      = _tbMkDev({ type: 'router', x: 500, y: 600, hostname: 'Home-RTR', ip: '192.168.1.1' });
        const lt       = _tbMkDev({ type: 'laptop', x: 300, y: 760, hostname: 'Laptop',  ip: '192.168.1.101', gateway: '192.168.1.1' });
        const pc       = _tbMkDev({ type: 'pc',     x: 500, y: 800, hostname: 'Desktop', ip: '192.168.1.102', gateway: '192.168.1.1' });
        const ph       = _tbMkDev({ type: 'smartphone',x: 700,y: 760, hostname: 'Phone', ip: '192.168.1.103', gateway: '192.168.1.1', iface: 'wlan0' });
        state.devices.push(internet, olt, ont, rtr, lt, pc, ph);
        state.cables.push(
          _tbMkCable(olt, internet, 'fiber'),
          _tbMkCable(ont, olt, 'fiber'),           // Single-mode fiber from home to ISP
          _tbMkCable(ont, rtr, 'cat6', 1),
          _tbMkCable(rtr, lt, 'cat6', 1), _tbMkCable(rtr, pc, 'cat6', 2), _tbMkCable(rtr, ph, 'cat6', 3),
        );
      },
      explanation: {
        overview: 'FTTH (Fiber to the Home) brings a dedicated optical fiber from the ISP all the way to the subscriber\'s premises. The most common architecture is PON (Passive Optical Network) — GPON at 2.5 Gbps shared, XGS-PON at 10 Gbps shared. "Passive" means there\'s no powered equipment in the outside plant: a single fiber from the ISP\'s OLT (Optical Line Terminal) is split with a glass splitter to serve up to 128 homes. At each home, an ONT (Optical Network Terminal) converts light to Ethernet.',
        dataFlow: 'Your laptop requests a file. Traffic goes through home router → ONT. The ONT converts the Ethernet signal to a modulated laser pulse on a specific wavelength (1310 nm upstream). Signal travels up the single-mode fiber from your home to the neighborhood passive splitter, then continues to the ISP\'s OLT. OLT demuxes your subscriber\'s frames (TDMA — each home has a time slot for upstream), forwards to the ISP backbone. Downstream traffic comes on a different wavelength (1490 nm or 1550 nm) that every ONT in the splitter tree sees — each ONT picks out its own frames.',
        keyDevices: [
          { name: 'ONT (Optical Network Terminal)', role: 'The fiber modem at your home. Converts light → Ethernet. Usually a wall-mounted box; often powered by local wall outlet.' },
          { name: 'Passive Splitter', role: 'A glass prism in the street or neighborhood hub that splits one fiber into 32/64/128. No electronics, no power needed — huge operational advantage.' },
          { name: 'OLT (Optical Line Terminal)', role: 'ISP-side equipment in a central office. One OLT port serves all 128 homes on that passive split. Does TDMA scheduling + subscriber authentication.' },
          { name: 'Single-Mode Fiber (SMF)', role: 'The physical medium. Thin glass core, can carry signals for tens of km with minimal loss — way more capacity than copper.' },
        ],
        concepts: [
          { term: 'GPON vs XGS-PON', meaning: 'GPON = 2.5/1.25 Gbps shared across 64-128 homes (typical peak: 50-100 Mbps per home). XGS-PON = 10 Gbps symmetric shared — modern rollout for gigabit home plans.' },
          { term: 'Passive vs Active', meaning: 'Passive = no powered equipment in the field (splitters only). Active = powered Ethernet switches in the field. Passive is cheaper to operate but has shared-medium tradeoffs.' },
          { term: 'Wavelength-Division Multiplexing', meaning: 'Multiple signals on the same fiber at different colors (wavelengths). GPON uses 1310nm up, 1490nm down, 1550nm for TV overlay.' },
          { term: 'TDMA upstream', meaning: 'All homes share the same fiber upstream — they take turns sending in time slots coordinated by the OLT. Prevents collisions.' },
        ],
        examTies: 'N10-009 1.7 (fiber named explicitly), 1.7 (single-mode fiber), 1.7 (PON — covered under service types)',
      },
    },
    // ══════════════════════════════════════════════════════════════════════
    // v4.49.0 — Tier 3: Advanced WAN (2 new)
    // ══════════════════════════════════════════════════════════════════════
    {
      id: 'multi-homed-bgp',
      title: 'Multi-homed WAN w/ BGP',
      description: 'Enterprise with 2 independent ISPs peering via BGP — if one ISP goes down, BGP automatically fails over to the other. Protects against single-ISP outages.',
      requirements: [
        'Enterprise core router/firewall',
        '2 separate ISP clouds (ISP-A and ISP-B)',
        'BGP peering with BOTH ISPs — redundant paths',
        'Internal LAN behind the border',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'cloud',  min: 2 },
        { type: 'router', min: 2 },
      ],
      autoBuild: (state) => {
        const ispA = _tbMkDev({ type: 'cloud',     x: 400, y: 140, hostname: 'ISP-A (AS 64500)' });
        const ispB = _tbMkDev({ type: 'cloud',     x: 1000,y: 140, hostname: 'ISP-B (AS 64501)' });
        const brA  = _tbMkDev({ type: 'router',    x: 400, y: 340, hostname: 'Border-A-RTR', ip: '203.0.113.2' });
        const brB  = _tbMkDev({ type: 'router',    x: 1000,y: 340, hostname: 'Border-B-RTR', ip: '198.51.100.2' });
        const fw   = _tbMkDev({ type: 'firewall',  x: 700, y: 520, hostname: 'Core-FW' });
        const sw   = _tbMkDev({ type: 'switch',    x: 700, y: 700, hostname: 'Core-SW' });
        const srv1 = _tbMkDev({ type: 'server',    x: 500, y: 860, hostname: 'App-Server', ip: '10.0.0.10' });
        const srv2 = _tbMkDev({ type: 'server',    x: 700, y: 860, hostname: 'Web-Server', ip: '10.0.0.11' });
        const pc   = _tbMkDev({ type: 'pc',        x: 900, y: 860, hostname: 'Admin-PC',   ip: '10.0.0.101', gateway: '10.0.0.1' });
        state.devices.push(ispA, ispB, brA, brB, fw, sw, srv1, srv2, pc);
        state.cables.push(
          _tbMkCable(ispA, brA, 'fiber'), _tbMkCable(ispB, brB, 'fiber'),
          _tbMkCable(brA, fw, 'fiber', 1), _tbMkCable(brB, fw, 'fiber', 1, 1),
          _tbMkCable(fw, sw, 'cat6', 2), _tbMkCable(sw, srv1), _tbMkCable(sw, srv2, 'cat6', 1), _tbMkCable(sw, pc, 'cat6', 2),
        );
      },
      explanation: {
        overview: 'Multi-homing means connecting to 2 or more ISPs simultaneously for redundancy. The enterprise runs BGP (Border Gateway Protocol) with each ISP, exchanging routing information. Normally, one ISP is primary (lower AS-PATH / higher local-pref); if that link fails, BGP withdraws the routes and the other ISP becomes active automatically — typically within 30-120 seconds. Essential for businesses that can\'t afford internet outages.',
        dataFlow: 'Normally: traffic from internal servers → core firewall → Border-A-RTR → ISP-A → internet. If ISP-A fails: Border-A loses BGP session with ISP-A → BGP withdraws the default route learned from ISP-A. Core firewall\'s routing table now only shows ISP-B\'s default route → traffic shifts to Border-B-RTR → ISP-B → internet. Reverse path from internet: inbound traffic to the company\'s IP space takes whichever ISP currently advertises the shorter AS-PATH.',
        keyDevices: [
          { name: 'Two Border Routers', role: 'One per ISP. Each runs BGP with its upstream. Can be same chassis or separate boxes. Must have the company\'s ASN.' },
          { name: 'Two ISP Clouds', role: 'Two independent providers. Ideally geographically diverse entry points (different conduits into the building) to protect against fiber cuts.' },
          { name: 'Core Firewall + Switch', role: 'Standard internal edge. Default gateway can be a VRRP virtual IP shared between the two border routers for seamless failover.' },
          { name: 'BGP (the routing glue)', role: 'Exchanges routes between your company (AS 65001 e.g.) and each ISP. Lets both sides announce reachability and withdraw when links fail.' },
        ],
        concepts: [
          { term: 'BGP (Border Gateway Protocol)', meaning: 'The internet\'s core routing protocol. Each network ("autonomous system") advertises which IP blocks it can reach. BGP is path-vector + policy-rich.' },
          { term: 'AS (Autonomous System)', meaning: 'A group of IP networks under single administrative control, identified by a unique AS Number. Your enterprise needs one to multi-home (from ARIN/RIPE).' },
          { term: 'Local preference vs AS-PATH', meaning: 'Two of BGP\'s selection criteria. Local-pref = "which of my paths do I prefer." AS-PATH = "path length" — shortest usually wins.' },
          { term: 'Convergence time', meaning: 'How long it takes BGP to detect a failure and reroute. Typical: 30-120 seconds. BFD (Bidirectional Forwarding Detection) can cut this to <1 sec.' },
        ],
        examTies: 'N10-009 3.3 (BGP explicitly), 3.1 (routing redundancy), 4.1 (high availability)',
      },
    },
    {
      id: 'gre-tunnel',
      title: 'GRE Tunnel',
      description: 'Generic Routing Encapsulation creates a logical point-to-point link over an IP network — wraps arbitrary protocols (including IP) in a GRE header. Used to stitch together non-contiguous networks.',
      requirements: [
        '2 site routers with public-routable IPs',
        'Public internet cloud between them',
        'GRE tunnel (logical) drawn between the two router endpoints',
        'Each site has internal LAN + endpoints',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'router', min: 2 },
        { type: 'cloud',  min: 1 },
      ],
      autoBuild: (state) => {
        const rtrA  = _tbMkDev({ type: 'router',   x: 280, y: 280, hostname: 'Site-A-RTR', ip: '203.0.113.1' });
        const swA   = _tbMkDev({ type: 'switch',   x: 280, y: 480, hostname: 'Site-A-SW' });
        const pcA   = _tbMkDev({ type: 'pc',       x: 280, y: 660, hostname: 'Site-A-PC', ip: '10.1.0.101', gateway: '10.1.0.1' });
        const internet = _tbMkDev({ type: 'cloud', x: 700, y: 160, hostname: 'Public Internet' });
        const rtrB  = _tbMkDev({ type: 'router',   x: 1120,y: 280, hostname: 'Site-B-RTR', ip: '198.51.100.1' });
        const swB   = _tbMkDev({ type: 'switch',   x: 1120,y: 480, hostname: 'Site-B-SW' });
        const pcB   = _tbMkDev({ type: 'pc',       x: 1020,y: 660, hostname: 'Site-B-PC',  ip: '10.2.0.101', gateway: '10.2.0.1' });
        const srvB  = _tbMkDev({ type: 'server',   x: 1220,y: 660, hostname: 'Site-B-Srv', ip: '10.2.0.10' });
        state.devices.push(rtrA, swA, pcA, internet, rtrB, swB, pcB, srvB);
        state.cables.push(
          _tbMkCable(rtrA, internet), _tbMkCable(internet, rtrB, 'cat6', 1),
          // GRE tunnel — logical link between the two routers (visualised as fiber)
          _tbMkCable(rtrA, rtrB, 'fiber', 1, 1),
          _tbMkCable(rtrA, swA, 'cat6', 2), _tbMkCable(swA, pcA),
          _tbMkCable(rtrB, swB, 'cat6', 2), _tbMkCable(swB, pcB), _tbMkCable(swB, srvB, 'cat6', 1),
        );
      },
      explanation: {
        overview: 'GRE (Generic Routing Encapsulation, RFC 2784) is a tunneling protocol that wraps any Layer 3 protocol inside an IP packet and sends it between two tunnel endpoints. The original packet becomes the "payload" and gets a new IP header pointing at the far-end router. GRE has no encryption by itself — it\'s often combined with IPSec for security. Common uses: stitching two disconnected private networks together, routing multicast over the internet (IPSec alone doesn\'t do that), or carrying non-IP protocols over IP transport.',
        dataFlow: 'Site-A\'s PC (10.1.0.101) sends a packet to Site-B\'s server (10.2.0.10). Packet hits Site-A\'s router. Router sees the destination is in 10.2.0.0/24 — a network it can reach via the GRE tunnel. Router wraps the entire original packet in a new IP+GRE header: outer dest = Site-B router\'s public IP (198.51.100.1). Encapsulated packet travels across the public internet. Site-B router receives, strips GRE header, finds the original packet inside, forwards to Site-B-SW → server.',
        keyDevices: [
          { name: 'Two Tunnel Endpoints', role: 'Each site\'s router is a tunnel endpoint. Configured with the far-end\'s public IP and a shared tunnel interface (e.g., Tunnel0).' },
          { name: 'Public Internet Transport', role: 'Carries the encapsulated packets. Treats them as normal IP traffic — has no idea there\'s a tunnel.' },
          { name: 'Internal Site LANs', role: 'Behind each router, normal internal addressing (10.1.0.0/24, 10.2.0.0/24). The tunnel makes them look adjacent.' },
        ],
        concepts: [
          { term: 'GRE header overhead', meaning: '24 bytes added (4 GRE + 20 new IP). MTU considerations: if original is 1500, new packet is 1524 — may need fragmentation or MTU adjustment (typically set MSS to 1360).' },
          { term: 'GRE vs IPSec', meaning: 'GRE = encapsulation only, no encryption. IPSec = encryption + integrity, but doesn\'t carry multicast. Common combo: GRE over IPSec = both.' },
          { term: 'DMVPN', meaning: 'Dynamic Multipoint VPN (Cisco) — uses mGRE (multipoint GRE) + NHRP to let branch routers build direct tunnels to each other dynamically. Scales GRE beyond pairwise.' },
          { term: 'Transparent to protocols', meaning: 'GRE can carry IPv4, IPv6, multicast, non-IP protocols (AppleTalk, Novell IPX). IPSec natively only handles unicast IP.' },
        ],
        examTies: 'N10-009 4.4 (tunneling protocols — GRE named), 4.4 (VPN concepts), 3.1 (logical tunneling)',
      },
    },
    // ══════════════════════════════════════════════════════════════════════
    // v4.49.0 — Tier 4: Other Network Types (4 new)
    // ══════════════════════════════════════════════════════════════════════
    {
      id: 'can',
      title: 'Campus Area Network (CAN)',
      description: 'Multiple buildings on a single campus connected by the organization\'s own high-speed backbone. Between a LAN (single building) and a MAN (city). University and large-corporate scale.',
      requirements: [
        'Central campus core router/switch',
        '3+ building switches, each connected to the core',
        'Endpoints at each building (lab, office, dorm, etc.)',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'router', min: 1 },
        { type: 'switch', min: 4 },
      ],
      autoBuild: (state) => {
        const internet = _tbMkDev({ type: 'cloud',  x: 700, y: 120, hostname: 'Internet' });
        const core   = _tbMkDev({ type: 'router', x: 700, y: 320, hostname: 'Campus-Core-RTR' });
        const coresw = _tbMkDev({ type: 'switch', x: 700, y: 500, hostname: 'Campus-Core-SW' });
        // Building A — Lab building
        const swA  = _tbMkDev({ type: 'switch', x: 300, y: 680, hostname: 'Building-A-Lab-SW' });
        const pcA1 = _tbMkDev({ type: 'pc',     x: 200, y: 840, hostname: 'Lab-PC-01', ip: '10.10.1.101', gateway: '10.10.1.1' });
        const pcA2 = _tbMkDev({ type: 'pc',     x: 400, y: 840, hostname: 'Lab-PC-02', ip: '10.10.1.102', gateway: '10.10.1.1' });
        // Building B — Office / Admin
        const swB  = _tbMkDev({ type: 'switch', x: 700, y: 680, hostname: 'Building-B-Admin-SW' });
        const pcB  = _tbMkDev({ type: 'pc',     x: 600, y: 840, hostname: 'Admin-PC-01', ip: '10.10.2.101', gateway: '10.10.2.1' });
        const prn  = _tbMkDev({ type: 'printer',x: 800, y: 840, hostname: 'Admin-Printer', ip: '10.10.2.200', gateway: '10.10.2.1' });
        // Building C — Dorm / wireless
        const swC  = _tbMkDev({ type: 'switch', x: 1100,y: 680, hostname: 'Building-C-Dorm-SW' });
        const wap  = _tbMkDev({ type: 'wap',    x: 1100,y: 820, hostname: 'Dorm-WAP' });
        const lt   = _tbMkDev({ type: 'laptop', x: 1000,y: 980, hostname: 'Student-Laptop', ip: '10.10.3.101', gateway: '10.10.3.1' });
        const ph   = _tbMkDev({ type: 'smartphone',x: 1200,y: 980, hostname: 'Student-Phone', ip: '10.10.3.102', gateway: '10.10.3.1', iface: 'wlan0' });
        state.devices.push(internet, core, coresw, swA, pcA1, pcA2, swB, pcB, prn, swC, wap, lt, ph);
        state.cables.push(
          _tbMkCable(internet, core),
          _tbMkCable(core, coresw, 'fiber', 1),
          _tbMkCable(coresw, swA, 'fiber', 1), _tbMkCable(coresw, swB, 'fiber', 2), _tbMkCable(coresw, swC, 'fiber', 3),
          _tbMkCable(swA, pcA1), _tbMkCable(swA, pcA2, 'cat6', 1),
          _tbMkCable(swB, pcB), _tbMkCable(swB, prn, 'cat6', 1),
          _tbMkCable(swC, wap), _tbMkCable(wap, lt), _tbMkCable(wap, ph, 'cat6', 0, 1),
        );
      },
      explanation: {
        overview: 'A CAN (Campus Area Network) connects multiple buildings within a single organization\'s geographic campus — a university, hospital complex, large corporate HQ, or military base. Scale is bigger than a LAN (which is one building) and smaller than a MAN (which spans a city). The organization owns or leases the fiber between buildings (dark fiber or private metro-Ethernet), so there\'s no ISP in the middle. Typical link technology is single-mode fiber at 10G or 40G, often arranged as a ring or mesh between building switches and a campus core.',
        dataFlow: 'A student in Dorm-C streams a lecture from the Lab-A file server. Laptop → Dorm-WAP (wireless) → Dorm-SW → fiber uplink to Campus-Core-SW → routes to Lab-A subnet → Lab-A-SW → file server. Stays entirely within the campus fiber — doesn\'t touch the internet. Internet-bound traffic (e.g., Zoom): Dorm-SW → Core-SW → Core-RTR → internet.',
        keyDevices: [
          { name: 'Campus Core Router', role: 'The single internet egress point + inter-building router. Sometimes called the "backbone" or "distribution core."' },
          { name: 'Campus Core Switch', role: 'Aggregates all building uplinks. High-capacity (10/40/100G ports). Often redundant in pairs for HA.' },
          { name: 'Building Switches', role: 'Each building\'s distribution layer. Connects to campus core via fiber + serves local access switches or endpoints directly.' },
          { name: 'Organization-Owned Fiber', role: 'The physical backbone between buildings. Either dark fiber leased long-term, or actual owned fiber runs through campus conduits.' },
        ],
        concepts: [
          { term: 'CAN vs LAN vs MAN', meaning: 'Scale: LAN = one building, CAN = one campus (multiple buildings, single org), MAN = one city (multiple sites, often via ISP).' },
          { term: 'Dark fiber', meaning: 'Unused fiber in the ground. Organizations lease it long-term from carriers or municipalities to run their own WAN.' },
          { term: 'Distribution layer (vs access/core)', meaning: 'Classic 3-tier model: Core (campus backbone) → Distribution (per building) → Access (to endpoints). CANs hit all 3.' },
          { term: 'Ring vs mesh between buildings', meaning: 'Ring: each building connects to 2 neighbors (redundant, cheaper). Mesh: every building to every other (expensive but maximally redundant).' },
        ],
        examTies: 'N10-009 1.8 (CAN explicitly listed in network types), 1.8 (LAN/CAN/MAN/WAN scale comparison)',
      },
    },
    {
      id: 'pan',
      title: 'Personal Area Network (PAN)',
      description: 'Short-range personal-scale network — typically Bluetooth, NFC, or Zigbee — connecting devices within a few metres of a user. Phone as the hub for headphones, watch, fitness tracker, etc.',
      requirements: [
        'Smartphone (central hub) + 3+ personal devices in close proximity',
        'Short-range wireless connections (Bluetooth, Zigbee, NFC) — visualised as cat6 but pedagogically they are NOT wired',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'smartphone', min: 1 },
      ],
      autoBuild: (state) => {
        // Note: our canvas model doesn't have Bluetooth cables, so we use cat6 to represent
        // the short-range connection. The educational point is in the labels + explanation.
        const phone = _tbMkDev({ type: 'smartphone',  x: 700, y: 480, hostname: 'Alice-Phone (PAN hub)', iface: 'wlan0' });
        const laptop = _tbMkDev({ type: 'laptop',     x: 400, y: 320, hostname: 'Alice-Laptop' });
        const tv    = _tbMkDev({ type: 'smart-tv',    x: 1000,y: 320, hostname: 'Speaker (Bluetooth)' });
        const watch = _tbMkDev({ type: 'iot',         x: 400, y: 640, hostname: 'Smartwatch (BT)' });
        const earbuds = _tbMkDev({ type: 'iot',       x: 700, y: 760, hostname: 'Earbuds (BT)' });
        const fit   = _tbMkDev({ type: 'iot',         x: 1000,y: 640, hostname: 'Fitness Tracker (BT)' });
        state.devices.push(phone, laptop, tv, watch, earbuds, fit);
        // Cables represent logical Bluetooth/Zigbee links — NOT actual Ethernet
        state.cables.push(
          _tbMkCable(phone, laptop, 'cat6', 1, 0),
          _tbMkCable(phone, tv, 'cat6', 2, 0),
          _tbMkCable(phone, watch, 'cat6', 3, 0),
          _tbMkCable(phone, earbuds, 'cat6', 4, 0),
          _tbMkCable(phone, fit, 'cat6', 5, 0),
        );
      },
      explanation: {
        overview: 'A PAN (Personal Area Network) is the smallest-scale network type — a few metres around a single user. Most commonly implemented with Bluetooth (the primary PAN technology on N10-009), but also NFC (tap-to-pay, room-key cards), Zigbee (smart-home IoT mesh), and wired USB/FireWire in some definitions. Phones are usually the PAN hub: they talk to earbuds for audio, smartwatch for health data, fitness tracker for sync, car infotainment for calls, etc.',
        dataFlow: 'Alice\'s phone connects to her wireless earbuds via Bluetooth. When she starts a call: phone\'s Bluetooth stack pairs with the earbuds (device addresses exchanged once, then remembered) → audio stream is transmitted at 2.4 GHz using frequency-hopping spread spectrum over 79 channels. Range is typically 10 metres (Class 2 Bluetooth). Simultaneously, her fitness tracker BLE-connects to sync heart-rate data to the phone\'s Health app. None of this touches Wi-Fi, ethernet, or any other network — it\'s all short-range 2.4 GHz radio.',
        keyDevices: [
          { name: 'Smartphone (PAN hub)', role: 'Most often the center of a personal network. Bluetooth stack can maintain multiple simultaneous pairings (audio + sensors + car + etc).' },
          { name: 'Bluetooth Peripherals', role: 'Earbuds, smartwatch, fitness tracker — all short-range wireless. Typical range 10m (Class 2), up to 100m (Class 1, rare in consumer).' },
          { name: 'NFC devices', role: 'Tap-to-pay terminals, room-key cards. Range is <5 cm. Uses 13.56 MHz — different band from Bluetooth.' },
          { name: 'Zigbee mesh', role: 'Smart-home IoT (Philips Hue, Samsung SmartThings). 2.4 GHz mesh network — devices relay for each other. Not strictly PAN but similar scale.' },
        ],
        concepts: [
          { term: 'Bluetooth Classic vs BLE', meaning: 'Classic: higher bandwidth (audio streaming), always-on connection. BLE (Low Energy): low power, sporadic beacons (sensors, beacons, iBeacon). Both are Bluetooth, different profiles.' },
          { term: 'Pairing', meaning: 'One-time cryptographic handshake between two Bluetooth devices. After pairing, they remember each other and auto-reconnect.' },
          { term: 'PAN vs WLAN', meaning: 'PAN = few metres, Bluetooth/NFC/Zigbee, one person. WLAN = whole building, Wi-Fi, many users. PAN is a strictly smaller scale.' },
          { term: 'Canvas limitation', meaning: '⚠️ Our Topology Builder doesn\'t model Bluetooth natively — we\'re using Ethernet cables as a visualization. IRL these would be wireless short-range radio links, NOT cables.' },
        ],
        examTies: 'N10-009 1.8 (PAN named in network types — "Bluetooth, IR, Zigbee examples"), 2.3 (wireless standards)',
      },
    },
    {
      id: 'san',
      title: 'Storage Area Network (SAN)',
      description: 'Dedicated high-speed network for block-level storage. Servers access storage arrays via Fibre Channel or iSCSI — appears to the server as a local disk. Isolated from the production LAN.',
      requirements: [
        '2+ servers that need shared storage',
        'FC/iSCSI switch dedicated to storage traffic',
        'Storage array (SAN appliance)',
        'Separated from any production LAN (best-practice)',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'server',    min: 2 },
        { type: 'switch',    min: 1 },
        { type: 'san-array', min: 1 },
      ],
      autoBuild: (state) => {
        // SAN fabric — dedicated to storage, isolated from LAN
        const srv1  = _tbMkDev({ type: 'server',    x: 300, y: 280, hostname: 'App-Server-01', ip: '10.100.0.10' });
        const srv2  = _tbMkDev({ type: 'server',    x: 300, y: 500, hostname: 'App-Server-02', ip: '10.100.0.11' });
        const srv3  = _tbMkDev({ type: 'server',    x: 300, y: 720, hostname: 'DB-Server',     ip: '10.100.0.12' });
        const fcsw  = _tbMkDev({ type: 'switch',    x: 700, y: 500, hostname: 'FC-Switch-01 (SAN fabric)' });
        const san1  = _tbMkDev({ type: 'san-array', x: 1100,y: 380, hostname: 'SAN-Array-01 (primary)' });
        const san2  = _tbMkDev({ type: 'san-array', x: 1100,y: 620, hostname: 'SAN-Array-02 (replica)' });
        state.devices.push(srv1, srv2, srv3, fcsw, san1, san2);
        state.cables.push(
          // Each server to FC-SW via fiber (simulating FC HBA connections)
          _tbMkCable(srv1, fcsw, 'fiber', 1), _tbMkCable(srv2, fcsw, 'fiber', 1, 1), _tbMkCable(srv3, fcsw, 'fiber', 1, 2),
          // FC-SW to storage arrays
          _tbMkCable(fcsw, san1, 'fiber', 3), _tbMkCable(fcsw, san2, 'fiber', 4),
          // Replica sync link between the two SAN arrays
          _tbMkCable(san1, san2, 'fiber', 1, 1),
        );
      },
      explanation: {
        overview: 'A SAN (Storage Area Network) is a dedicated high-speed network that provides block-level access to storage. Unlike NAS (Network-Attached Storage), which serves files over TCP/IP, a SAN presents raw block devices — the server sees them as if they were local SATA/SAS disks. Classical SANs use Fibre Channel (FC) with dedicated FC switches running at 8/16/32 Gbps. Modern deployments often use iSCSI (SCSI over TCP/IP) or FCoE (FC over Ethernet) on 10/25/100 Gbps Ethernet to consolidate with the production network.',
        dataFlow: 'App-Server-01 writes 4 KB of data to "C:\\users\\data.txt". To the OS, C: is a local disk. Under the hood: OS builds a SCSI write command + the 4 KB payload → routes it out the server\'s FC HBA (Host Bus Adapter). Frame travels over FC fiber to FC-Switch → routed based on WWN (World Wide Name — the FC equivalent of MAC) to SAN-Array-01. Array receives, writes to physical disk(s), returns ACK. All of this happens with microseconds of latency — SAN is designed for speed.',
        keyDevices: [
          { name: 'Servers with HBAs', role: 'Each server has a dedicated Fibre Channel Host Bus Adapter — a PCI card that speaks FC. Shows storage as local disks to the OS.' },
          { name: 'FC Switches (SAN Fabric)', role: 'Dedicated switches running Fibre Channel protocol. Usually redundant pairs ("dual-fabric") so no single switch failure kills storage.' },
          { name: 'Storage Arrays', role: 'The SAN appliance itself. Contains dozens to hundreds of physical disks (HDD/SSD/NVMe), a controller, cache, and exposes LUNs (Logical Unit Numbers) to servers.' },
          { name: 'LUNs (Logical Unit Numbers)', role: 'Virtual disks carved from the array\'s pool. LUN masking restricts which servers can see which LUNs (the equivalent of filesystem permissions at the block level).' },
        ],
        concepts: [
          { term: 'SAN vs NAS', meaning: 'SAN = block-level (looks like a raw disk — server formats it). NAS = file-level (SMB/NFS, server mounts pre-formatted shares). SANs are faster; NAS are easier to share.' },
          { term: 'Fibre Channel vs iSCSI vs FCoE', meaning: 'FC = dedicated SAN fabric, fastest, expensive. iSCSI = SCSI over regular TCP/IP, cheaper, shares Ethernet. FCoE = FC frames over 10G+ Ethernet — hybrid.' },
          { term: 'LUN masking / zoning', meaning: 'Controls which servers see which storage. Like firewall rules for storage. Prevents accidents and enforces tenancy.' },
          { term: 'Multipathing', meaning: 'Each server has 2+ paths to each LUN (via dual-fabric SAN switches). If one path fails, the server keeps working via the other.' },
        ],
        examTies: 'N10-009 1.8 (SAN explicitly listed in network types), 1.6 (Fibre Channel), 4.1 (network segmentation)',
      },
    },
    {
      id: 'wlan',
      title: 'WLAN (Wireless Local Area Network)',
      description: 'A pure wireless LAN — WLC + multiple WAPs + wireless clients. Focused on the wireless architecture itself (no WAN, no firewall) so you see the WLAN as its own network type.',
      requirements: [
        'WLC (Wireless LAN Controller)',
        '3+ WAPs managed by the WLC (coverage across the space)',
        '4+ wireless clients (laptops, phones, consoles, smart-TVs)',
        'Focus is the wireless LAN itself — no internet/WAN in this view',
      ],
      ruleIds: ['min-devices', 'no-orphans'],
      requires: [
        { type: 'wlc', min: 1 },
        { type: 'wap', min: 3 },
      ],
      autoBuild: (state) => {
        const wlc   = _tbMkDev({ type: 'wlc',        x: 700, y: 200, hostname: 'WLC-01', ip: '10.30.0.10' });
        const sw    = _tbMkDev({ type: 'switch',     x: 700, y: 360, hostname: 'Distribution-SW' });
        const wap1  = _tbMkDev({ type: 'wap',        x: 280, y: 520, hostname: 'WAP-01 (2.4 GHz + 5 GHz)' });
        const wap2  = _tbMkDev({ type: 'wap',        x: 700, y: 520, hostname: 'WAP-02 (2.4 GHz + 5 GHz)' });
        const wap3  = _tbMkDev({ type: 'wap',        x: 1120,y: 520, hostname: 'WAP-03 (2.4 GHz + 5 GHz)' });
        // Wireless clients associated with various WAPs
        const lt1   = _tbMkDev({ type: 'laptop',     x: 180, y: 720, hostname: 'Laptop-01', ip: '10.30.20.101', gateway: '10.30.20.1' });
        const lt2   = _tbMkDev({ type: 'laptop',     x: 380, y: 720, hostname: 'Laptop-02', ip: '10.30.20.102', gateway: '10.30.20.1' });
        const ph1   = _tbMkDev({ type: 'smartphone', x: 600, y: 720, hostname: 'Phone-01',  ip: '10.30.20.103', gateway: '10.30.20.1', iface: 'wlan0' });
        const ph2   = _tbMkDev({ type: 'smartphone', x: 800, y: 720, hostname: 'Phone-02',  ip: '10.30.20.104', gateway: '10.30.20.1', iface: 'wlan0' });
        const tv    = _tbMkDev({ type: 'smart-tv',   x: 1020,y: 720, hostname: 'Smart-TV',  ip: '10.30.20.105', gateway: '10.30.20.1' });
        const gc    = _tbMkDev({ type: 'game-console',x: 1220,y: 720, hostname: 'Console',   ip: '10.30.20.106', gateway: '10.30.20.1' });
        state.devices.push(wlc, sw, wap1, wap2, wap3, lt1, lt2, ph1, ph2, tv, gc);
        state.cables.push(
          _tbMkCable(wlc, sw),
          _tbMkCable(sw, wap1, 'cat6', 1), _tbMkCable(sw, wap2, 'cat6', 2), _tbMkCable(sw, wap3, 'cat6', 3),
          _tbMkCable(wap1, lt1), _tbMkCable(wap1, lt2, 'cat6', 1),
          _tbMkCable(wap2, ph1), _tbMkCable(wap2, ph2, 'cat6', 1),
          _tbMkCable(wap3, tv), _tbMkCable(wap3, gc, 'cat6', 1),
        );
      },
      explanation: {
        overview: 'A WLAN (Wireless LAN) is a network of devices communicating wirelessly in a local area — typically using Wi-Fi (IEEE 802.11 family). A modern enterprise WLAN uses a controller-based architecture: a WLC (Wireless LAN Controller) manages multiple lightweight WAPs (Wireless Access Points) distributed through a building. The WLC handles association, authentication (WPA2/WPA3-Enterprise), roaming between WAPs, and RF management (channel selection, power tuning). Clients connect to the nearest WAP and the infrastructure makes the WLAN look like one seamless network.',
        dataFlow: 'Phone-01 walks into the office. Phone probes for SSIDs → sees "CorpWiFi" broadcast by WAP-02. Phone requests association → WAP-02 CAPWAP-tunnels the request to the WLC → WLC performs 802.1X auth via RADIUS → issues a DHCP lease. Phone is now on the WLAN (10.30.20.103). Phone opens Slack → frames travel wirelessly to WAP-02 → CAPWAP-tunneled to WLC → forwarded onto Distribution-SW → out the WLAN\'s gateway. When the user walks past WAP-03\'s coverage: WLC orchestrates a roaming handoff so the session persists.',
        keyDevices: [
          { name: 'WLC (Wireless LAN Controller)', role: 'Central brain. Holds all WAP configs. Authenticates clients, coordinates roaming, enforces QoS and security policy.' },
          { name: 'WAPs (Wireless Access Points)', role: 'Lightweight radios. Each one serves a coverage area (typical 30-50m indoor). Modern WAPs have dual radios (2.4 + 5 GHz) and 4x4 MIMO.' },
          { name: 'Distribution Switch', role: 'Wired backbone that WAPs plug into via PoE. Provides power + uplink to the WLC and beyond.' },
          { name: 'Wireless Clients', role: 'Anything with a Wi-Fi radio — laptops, phones, consoles, smart-TVs, IoT. All associate with one WAP at a time.' },
        ],
        concepts: [
          { term: '802.11 standards', meaning: 'a (5 GHz only), b/g (2.4 GHz, slow), n (Wi-Fi 4, dual-band), ac (Wi-Fi 5, 5 GHz only, MU-MIMO), ax (Wi-Fi 6/6E, OFDMA + 6 GHz), be (Wi-Fi 7, 320 MHz).' },
          { term: 'SSID vs BSSID', meaning: 'SSID = human-readable network name ("CorpWiFi"). BSSID = MAC of a specific WAP radio. Same SSID across many BSSIDs = one logical WLAN spanning multiple WAPs.' },
          { term: 'Roaming (802.11r/k/v)', meaning: 'Fast transition standards let clients hop between WAPs in ~50ms without dropping VoIP/video calls. WLC coordinates the handoff.' },
          { term: 'CAPWAP', meaning: 'Control And Provisioning of Wireless Access Points. The tunneling protocol between WAPs and the WLC. Carries both control messages and (optionally) client data traffic.' },
        ],
        examTies: 'N10-009 1.8 (WLAN explicitly named), 2.3 (802.11 standards + wireless architecture), 4.1 (wireless security: WPA2/WPA3)',
      },
    },
  ];
  
  let tbSelectedScenario = 'free';
  
  // v4.48.0: helpers to author scenario autoBuild functions concisely. The
  // existing device object has 13 fields with sensible defaults; these helpers
  // fill in the boilerplate so an autoBuild function reads like pseudocode.
  function _tbMkDev(opts) {
    const id = opts.id || ('d_sc_' + Math.random().toString(36).slice(2, 9));
    const defaultsIface = {
      name: 'eth0', cableId: null, ip: '', mask: '255.255.255.0',
      mac: tbGenerateMac(id, 0),
      vlan: 1, mode: 'access', trunkAllowed: [1],
      gateway: '', enabled: true, subInterfaces: []
    };
    const interfaces = opts.interfaces
      ? opts.interfaces.map((iface, idx) => Object.assign({}, defaultsIface, iface, { mac: tbGenerateMac(id, idx) }))
      : [Object.assign({}, defaultsIface, {
          name: opts.iface || 'eth0',
          ip: opts.ip || '',
          mask: opts.mask || '255.255.255.0',
          gateway: opts.gateway || '',
        })];
    return {
      id, type: opts.type,
      x: opts.x || 400, y: opts.y || 400,
      hostname: opts.hostname || (opts.type.toUpperCase().slice(0, 4)),
      interfaces,
      routingTable: [], arpTable: [], macTable: [], vlanDb: [],
      dhcpServer: null, dhcpRelay: null, acls: [], securityGroups: [],
      nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null,
      vxlanConfig: [],
    };
  }
  // v4.49.2: link-local IP pool counter — reset by tbLoadScenarioWithBuild
  // before each scenario build, and by tbBuildFromAiPayload before each AI
  // generation. Each L3-to-L3 cable gets its own /30.
  let _tbLinkLocalSlot = 0;
  
  // v4.49.3: shared auto-assign logic used by both _tbMkCable (scenarios)
  // and tbBuildFromAiPayload (AI Generate). Keeps the cable-health fix
  // consistent across code paths so AI-generated topologies also show
  // green packets when they're correctly configured.
  function _tbAutoAssignCableIps(aDev, aIfc, bDev, bIfc, cableType) {
    if (cableType === 'console') return;
    const aL3 = !TB_NO_IP_NEEDED.includes(aDev.type);
    const bL3 = !TB_NO_IP_NEEDED.includes(bDev.type);
    if (aL3 && bL3 && !aIfc.ip && !bIfc.ip) {
      // Matching /30 link-local pair
      const slot = _tbLinkLocalSlot++;
      const third = Math.floor(slot / 63) + 1;
      const offset = (slot % 63) * 4;
      aIfc.ip = '169.254.' + third + '.' + (offset + 1);
      bIfc.ip = '169.254.' + third + '.' + (offset + 2);
      aIfc.mask = '255.255.255.252';
      bIfc.mask = '255.255.255.252';
    } else {
      // One-sided assignment for L3↔exempt (or when the other L3 side
      // already carries an author-specified IP)
      const assignSide = (ifc) => {
        const s = _tbLinkLocalSlot++;
        const third = Math.floor(s / 250) + 10;
        const host = (s % 250) + 1;
        ifc.ip = '169.254.' + third + '.' + host;
        ifc.mask = '255.255.255.0';
      };
      if (aL3 && !aIfc.ip) assignSide(aIfc);
      if (bL3 && !bIfc.ip) assignSide(bIfc);
    }
  }
  
  function _tbMkCable(a, b, type = 'cat6', aIdx, bIdx) {
    // v4.48.0: auto-provision interfaces so scenario authors can reference
    // slots 1/2/3 without pre-declaring them on _tbMkDev. _tbMkDev creates
    // one default interface; additional ones spawn here as needed.
    const ensureIface = (dev, idx) => {
      while (dev.interfaces.length <= idx) {
        const n = dev.interfaces.length;
        dev.interfaces.push({
          name: 'eth' + n, cableId: null, ip: '', mask: '255.255.255.0',
          mac: tbGenerateMac(dev.id, n),
          vlan: 1, mode: 'access', trunkAllowed: [1],
          gateway: '', enabled: true, subInterfaces: []
        });
      }
    };
    // v4.49.2: when index not explicitly passed, find the next FREE interface
    // (or create one if all are in use). Prevents the bug where multiple
    // cables attached to the same device via `_tbMkCable(hub, X)` at default
    // (0, 0) silently overwrite each other's cableId — which caused many
    // scenario cables to assess as 'blocked' in health checks because the
    // interface lookup found a severed reference.
    const nextFreeIdx = (dev) => {
      for (let i = 0; i < dev.interfaces.length; i++) {
        if (!dev.interfaces[i].cableId) return i;
      }
      return dev.interfaces.length; // triggers ensureIface to add a new one
    };
    // If explicit index was passed but that slot is already attached to a
    // cable, fall forward to the next free slot (prevents silent overwrite
    // on overlapping explicit indices in scenario autoBuild functions).
    const resolveIdx = (dev, explicitIdx) => {
      if (explicitIdx === undefined) return nextFreeIdx(dev);
      ensureIface(dev, explicitIdx);
      if (dev.interfaces[explicitIdx].cableId) return nextFreeIdx(dev);
      return explicitIdx;
    };
    aIdx = resolveIdx(a, aIdx);
    bIdx = resolveIdx(b, bIdx);
    ensureIface(a, aIdx);
    ensureIface(b, bIdx);
    // v4.49.3: auto-assign link-local IPs via shared helper (also used by
    // tbBuildFromAiPayload for AI-generated topologies so both paths are
    // consistent).
    _tbAutoAssignCableIps(a, a.interfaces[aIdx], b, b.interfaces[bIdx], type);
    const cable = {
      id: 'c_sc_' + Math.random().toString(36).slice(2, 9),
      from: a.id, to: b.id, type,
      fromIface: a.interfaces[aIdx].name,
      toIface: b.interfaces[bIdx].name,
    };
    a.interfaces[aIdx].cableId = cable.id;
    b.interfaces[bIdx].cableId = cable.id;
    return cable;
  }
  
  // v4.48.0: load a scenario AND pre-build its starter topology on the canvas.
  // If canvas has devices, confirm before replacing. This is the primary entry
  // point from the scenario picker + dropdown — tbSetScenario is now the
  // lightweight internal state setter (no canvas changes) called by this flow.
  function tbLoadScenarioWithBuild(id) {
    const scen = TB_SCENARIOS.find(s => s.id === id);
    if (!scen) return;
  
    // If user is switching away from a scenario that had autoBuild (and canvas
    // still has those devices), or user has manually built something, confirm
    // before we replace.
    const hasDevices = tbState && tbState.devices && tbState.devices.length > 0;
    if (hasDevices && id !== 'free') {
      if (!confirm(`Load "${scen.title}" scenario? This will replace your current canvas.`)) {
        // Re-sync the dropdown back to the previous selection so it doesn't
        // look stale after a cancel.
        const dd = document.getElementById('tb-scenario-select');
        if (dd && tbSelectedScenario) dd.value = tbSelectedScenario;
        return;
      }
    }
  
    // Clear-and-build (or just clear for Free Build)
    tbState = tbNewState();
    tbState.name = scen.title;
    // v4.49.2: reset link-local IP counter so each scenario gets a clean pool
    // starting at 169.254.1.1 (prevents exhaustion + keeps addresses stable
    // when re-loading the same scenario).
    _tbLinkLocalSlot = 0;
    if (scen.autoBuild && id !== 'free') {
      try {
        scen.autoBuild(tbState);
        if (typeof tbMigrateState === 'function') tbMigrateState(tbState);
        // v4.49.4: snapshot device + cable IDs so tbIsPristineScenario() can
        // detect whether the user has modified the auto-built canvas. Grade
        // + Coach are gated on "pristine" because grading a reference topology
        // against its own rules is trivially 100% — not pedagogically useful.
        tbState.pristineScenarioId = id;
        tbState.pristineDeviceIds = tbState.devices.map(d => d.id).sort();
        tbState.pristineCableIds = tbState.cables.map(c => c.id).sort();
      } catch (err) {
        console.warn('[tb] autoBuild failed for', id, err);
      }
    }
  
    // Update scenario state + re-render everything
    tbSetScenario(id);
    tbRenderCanvas();
    tbUpdateDeviceCount();
    tbSaveDraft();
    // v4.54.5: refresh right pane (active scenario highlight + inspector clear)
    // v4.54.6: also close the floating inspector popup since no device is selected
    tbV3InspectedDeviceId = null;
    if (typeof tbRenderV3ScenariosList === 'function') tbRenderV3ScenariosList();
    if (typeof tbRenderV3Inspector === 'function') tbRenderV3Inspector();
    if (typeof tbInspectorPopClose === 'function') tbInspectorPopClose();
  
    if (id !== 'free' && tbState.devices.length > 0) {
      showSuccessToast(`\u{1F3D7}\uFE0F ${scen.title} built \u2014 ${tbState.devices.length} devices connected. Explore + modify as you learn.`);
    }
  
    // v4.72.1: if 3D view is currently open, rebuild the scene so the new
    // scenario appears immediately. Previously the user had to toggle back
    // to 2D, pick the scenario, then re-enter 3D — a 3-click UX detour.
    if (_tb3dActive) _tb3dReenterWithCurrentState();
  }
  
  // v4.49.4: true when the current canvas is an unmodified scenario auto-build.
  // Compares current device + cable IDs against the snapshot taken right after
  // scen.autoBuild ran. Any add/remove of a device or cable flips this to false.
  // Moving devices or editing their config does NOT flip it (topology shape
  // unchanged). Used by Grade + Coach to refuse grading/coaching a reference
  // scenario — since that's trivially a 100% match against its own rules.
  function tbIsPristineScenario() {
    if (!tbState.pristineScenarioId) return false;
    const currDevs = tbState.devices.map(d => d.id).sort();
    const currCabs = tbState.cables.map(c => c.id).sort();
    const snapDevs = tbState.pristineDeviceIds || [];
    const snapCabs = tbState.pristineCableIds || [];
    if (currDevs.length !== snapDevs.length) return false;
    if (currCabs.length !== snapCabs.length) return false;
    for (let i = 0; i < currDevs.length; i++) {
      if (currDevs[i] !== snapDevs[i]) return false;
    }
    for (let i = 0; i < currCabs.length; i++) {
      if (currCabs[i] !== snapCabs[i]) return false;
    }
    return true;
  }
  
  function tbSetScenario(id) {
    const scen = TB_SCENARIOS.find(s => s.id === id);
    if (!scen) return;
    tbSelectedScenario = id;
    tbRenderScenarioPanel();
    tbRenderEmptyHint();
    tbUpdateStatus(`Scenario: ${scen.title}`);
  }
  
  // v4.47.2: dynamic empty-state renderer. Swaps between Free Build (4 CTAs
  // — the original entry points) and Scenario-loaded (in-canvas scenario
  // card with title + description + required devices + deep-dive CTA).
  // Called from tbSetScenario + tbRenderCanvas + openTopologyBuilder so
  // state stays in sync.
  function tbRenderEmptyHint() {
    const hint = document.getElementById('tb-empty-hint');
    if (!hint) return;
    const hasDevices = tbState && tbState.devices && tbState.devices.length > 0;
    // If canvas has content, hide the whole empty-state.
    if (hasDevices) {
      hint.classList.add('is-hidden');
      hint.innerHTML = '';
      return;
    }
    hint.classList.remove('is-hidden');
  
    const scen = (tbSelectedScenario && tbSelectedScenario !== 'free')
      ? TB_SCENARIOS.find(s => s.id === tbSelectedScenario)
      : null;
  
    if (!scen) {
      // Free-Build mode: 4 quickstart CTAs (preserved from the original
      // static HTML — moved here so a single renderer controls both modes).
      hint.innerHTML = `
        <div class="tb-empty-icon">\u{1F527}</div>
        <div class="tb-empty-title">Ready to build a network?</div>
        <div class="tb-empty-sub">Pick a starting point \u2014 or drag a device from the palette on the left.</div>
        <div class="tb-empty-ctas">
          <button class="tb-empty-cta tb-empty-cta-primary" onclick="tbOpenLabPicker()" type="button">
            <span class="tb-empty-cta-icon">\u{1F393}</span>
            <span class="tb-empty-cta-title">Start a guided lab</span>
            <span class="tb-empty-cta-sub">Step-by-step scaffolded build</span>
          </button>
          <button class="tb-empty-cta" onclick="tbGenerateAiTopology()" type="button">
            <span class="tb-empty-cta-icon">\u{1F916}</span>
            <span class="tb-empty-cta-title">AI Generate</span>
            <span class="tb-empty-cta-sub">Describe it in plain English</span>
          </button>
          <button class="tb-empty-cta" onclick="tbOpenFixPicker()" type="button">
            <span class="tb-empty-cta-icon">\u{1F527}</span>
            <span class="tb-empty-cta-title">Fix a broken network</span>
            <span class="tb-empty-cta-sub">Troubleshoot pre-built problems</span>
          </button>
          <button class="tb-empty-cta tb-empty-cta-scenario" onclick="tbOpenScenarioPicker()" type="button">
            <span class="tb-empty-cta-icon">\u{1F3AF}</span>
            <span class="tb-empty-cta-title">Load a scenario</span>
            <span class="tb-empty-cta-sub">31 real-world network patterns</span>
          </button>
        </div>`;
      return;
    }
  
    // Scenario-loaded mode: big in-canvas card so the user sees their
    // selection landed — where they're actually looking.
    const icon = (typeof TB_SCENARIO_ICONS !== 'undefined' && TB_SCENARIO_ICONS[scen.id]) || '\u{1F3AF}';
    const reqChips = (scen.requires || []).slice(0, 6).map(req => {
      const typeMeta = TB_DEVICE_TYPES[req.type];
      const label = typeMeta ? typeMeta.label : req.type.replace('*', ' (public)');
      return `<span class="tb-sc-loaded-chip">${escHtml(label)} \u00d7 ${req.min}</span>`;
    }).join('');
    const hasExplanation = !!scen.explanation;
  
    hint.innerHTML = `
      <div class="tb-sc-loaded">
        <div class="tb-sc-loaded-head">
          <span class="tb-sc-loaded-badge">\u{1F4DA} Scenario active</span>
          <div class="tb-sc-loaded-icon" aria-hidden="true">${icon}</div>
          <h3 class="tb-sc-loaded-title">${escHtml(scen.title)}</h3>
          <p class="tb-sc-loaded-desc">${escHtml(scen.description)}</p>
        </div>
        ${reqChips ? `<div class="tb-sc-loaded-reqs">
          <div class="tb-sc-loaded-reqs-label">Required devices</div>
          <div class="tb-sc-loaded-chips">${reqChips}</div>
        </div>` : ''}
        <div class="tb-sc-loaded-ctas">
          ${hasExplanation ? `<button type="button" class="tb-sc-loaded-cta tb-sc-loaded-cta-primary" onclick="tbOpenScenarioDeepDive()">
            <span aria-hidden="true">\u{1F4D6}</span> View deep explanation
          </button>` : ''}
          <button type="button" class="tb-sc-loaded-cta" onclick="tbOpenScenarioPicker()">
            <span aria-hidden="true">\u{1F504}</span> Change scenario
          </button>
          <button type="button" class="tb-sc-loaded-cta tb-sc-loaded-cta-ghost" onclick="tbLoadScenarioFromPicker('free')">
            <span aria-hidden="true">\u2715</span> Clear
          </button>
        </div>
        <div class="tb-sc-loaded-hint">Drag devices from the palette on the left to start building.</div>
      </div>`;
  }
  
  // v4.47.2: scroll the scenario panel into view AND auto-open the Learn-more
  // <details> so the deep content is immediately visible. Triggered by the
  // "View deep explanation" CTA on the in-canvas scenario card.
  function tbOpenScenarioDeepDive() {
    const panel = document.getElementById('tb-scenario-panel');
    if (!panel) return;
    const details = panel.querySelector('.tb-scenario-learn');
    if (details) details.setAttribute('open', '');
    try {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) {
      panel.scrollIntoView();
    }
  }
  
  // v4.47.1: Scenario picker modal — card-grid of all 16 scenarios grouped
  // into 3 categories (Campus & Enterprise / WAN Architectures / Cloud
  // Networking). Surfaced on the empty-canvas quickstart so scenarios are
  // a first-class entry point alongside guided labs + AI Generate + Fix.
  // Non-destructive: loading a scenario only sets the grading target and
  // shows the explanation panel — doesn't touch the canvas.
  const TB_SCENARIO_CATEGORIES = [
    {
      name: 'Campus & Enterprise',
      icon: '\u{1F3E2}',
      ids: ['home-network', 'small-office', 'dmz', 'enterprise', 'branch-wireless'],
    },
    {
      name: 'WAN Architectures',
      icon: '\u{1F310}',
      ids: ['point-to-point', 'hub-spoke', 'full-mesh', 'sdwan', 'mpls', 'man', 's2s-vpn', 'remote-vpn', 'cellular', 'satellite-wan'],
    },
    {
      name: 'Broadband & Last-Mile',
      icon: '\u{1F4E1}',
      ids: ['dsl', 'cable', 'ftth'],
    },
    {
      name: 'Advanced WAN',
      icon: '\u{1F527}',
      ids: ['multi-homed-bgp', 'gre-tunnel'],
    },
    {
      name: 'Cloud Networking',
      icon: '\u2601\uFE0F',
      ids: ['cloud-igw', 'cloud-natgw', 'cloud-peering', 'cloud-vpc', 'hybrid-cloud', 'multi-vpc', 'sase-arch'],
    },
    {
      name: 'Other Network Types',
      icon: '\u{1F5FA}\uFE0F',
      ids: ['can', 'pan', 'san', 'wlan'],
    },
  ];
  
  // Per-scenario emoji for the picker cards — matches the dropdown.
  const TB_SCENARIO_ICONS = {
    // Campus & Enterprise
    'home-network':    '\u{1F3E0}',
    'small-office':    '\u{1F3E2}',
    'dmz':             '\u{1F512}',
    'enterprise':      '\u{1F3E2}',
    'branch-wireless': '\u{1F4F6}',
    // WAN Architectures
    'point-to-point':  '\u2194\uFE0F',
    'hub-spoke':       '\u2B50',
    'full-mesh':       '\u{1F517}',
    'sdwan':           '\u{1F310}',
    'mpls':            '\u{1F3F7}\uFE0F',
    'man':             '\u{1F3D9}\uFE0F',
    's2s-vpn':         '\u{1F510}',
    'remote-vpn':      '\u{1F4BC}',
    'cellular':        '\u{1F4E1}',
    'satellite-wan':   '\u{1F6F0}\uFE0F',
    // Broadband & Last-Mile
    'dsl':             '\u{260E}\uFE0F',
    'cable':           '\u{1F4FA}',
    'ftth':            '\u{1F4A1}',
    // Advanced WAN
    'multi-homed-bgp': '\u{1F500}',
    'gre-tunnel':      '\u{1F6E4}\uFE0F',
    // Cloud Networking
    'cloud-igw':       '\u{1F6AA}',
    'cloud-natgw':     '\u{1F501}',
    'cloud-peering':   '\u{1F517}',
    'cloud-vpc':       '\u2601\uFE0F',
    'hybrid-cloud':    '\u{1F517}',
    'multi-vpc':       '\u{1F52C}',
    'sase-arch':       '\u{1F6E1}\uFE0F',
    // Other Network Types
    'can':             '\u{1F393}',
    'pan':             '\u{1F4F1}',
    'san':             '\u{1F4BE}',
    'wlan':            '\u{1F4E1}',
  };
  
  function tbOpenScenarioPicker() {
    const modal = document.getElementById('tb-scenario-picker');
    const body  = document.getElementById('tb-scenario-picker-body');
    if (!modal || !body) return;
  
    const scenById = {};
    TB_SCENARIOS.forEach(s => { scenById[s.id] = s; });
  
    const renderCard = (scen) => {
      const icon = TB_SCENARIO_ICONS[scen.id] || '\u{1F3AF}';
      const conceptCount = (scen.explanation?.concepts || []).length;
      const deviceCount  = (scen.requires || []).length;
      const isActive = scen.id === tbSelectedScenario;
      return `<button type="button" class="tb-scenario-card${isActive ? ' tb-scenario-card-active' : ''}" onclick="tbLoadScenarioFromPicker('${scen.id}')" aria-label="Load scenario: ${escHtml(scen.title)}">
        <div class="tb-scenario-card-head">
          <span class="tb-scenario-card-icon" aria-hidden="true">${icon}</span>
          <strong class="tb-scenario-card-title">${escHtml(scen.title)}</strong>
          ${isActive ? '<span class="tb-scenario-card-badge">Current</span>' : ''}
        </div>
        <div class="tb-scenario-card-desc">${escHtml(scen.description)}</div>
        ${(conceptCount || deviceCount) ? `<div class="tb-scenario-card-meta">
          ${deviceCount ? `<span class="tb-scenario-card-chip">\u{1F50C} ${deviceCount} device type${deviceCount === 1 ? '' : 's'}</span>` : ''}
          ${conceptCount ? `<span class="tb-scenario-card-chip">\u{1F4A1} ${conceptCount} concept${conceptCount === 1 ? '' : 's'}</span>` : ''}
          ${scen.explanation?.examTies ? '<span class="tb-scenario-card-chip tb-scenario-card-chip-exam">\u{1F393} Exam-linked</span>' : ''}
        </div>` : ''}
      </button>`;
    };
  
    let html = `<div class="tb-scenario-picker-header">
      <div class="tb-scenario-picker-intro">Pick a scenario to set a grading target and unlock the <strong>Learn more</strong> deep-dive. Loading is non-destructive — your canvas stays as-is.</div>
    </div>`;
  
    TB_SCENARIO_CATEGORIES.forEach(cat => {
      const scens = cat.ids.map(id => scenById[id]).filter(Boolean);
      if (scens.length === 0) return;
      html += `<details class="tb-scenario-picker-cat" open>
        <summary class="tb-scenario-picker-cat-head">
          <span class="tb-scenario-picker-cat-ico">${cat.icon}</span>
          <span class="tb-scenario-picker-cat-name">${escHtml(cat.name)}</span>
          <span class="tb-scenario-picker-cat-count">${scens.length}</span>
        </summary>
        <div class="tb-scenario-picker-grid">${scens.map(renderCard).join('')}</div>
      </details>`;
    });
  
    // Also offer Free Build as a reset option at the bottom
    html += `<div class="tb-scenario-picker-reset">
      <button type="button" class="tb-scenario-reset-btn" onclick="tbLoadScenarioFromPicker('free')">
        <span aria-hidden="true">\u27F2</span> Clear scenario (back to Free Build)
      </button>
    </div>`;
  
    body.innerHTML = html;
    modal.classList.remove('is-hidden');
  }
  
  function tbLoadScenarioFromPicker(id) {
    const modal = document.getElementById('tb-scenario-picker');
    if (modal) modal.classList.add('is-hidden');
    // Sync the toolbar dropdown so both surfaces stay consistent
    const dd = document.getElementById('tb-scenario-select');
    if (dd) dd.value = id;
    // v4.48.0: auto-build the scenario topology (user asked for scenarios to
    // feel like guided labs \u2014 pick a scenario and the canvas populates with
    // the devices already connected).
    tbLoadScenarioWithBuild(id);
  }
  
  // v4.47.0: scenario panel now includes a collapsible "Learn more" section
  // with 5 structured sub-sections (Overview / Data flow / Key devices /
  // Concepts / Exam ties) when the scenario has an `explanation` block.
  // Uses <details>/<summary> for keyboard-accessible collapse out of the box.
  function tbRenderScenarioPanel() {
    const el = document.getElementById('tb-scenario-panel');
    if (!el) return;
    const scen = TB_SCENARIOS.find(s => s.id === tbSelectedScenario);
    if (!scen || scen.id === 'free') {
      el.classList.add('is-hidden');
      el.innerHTML = '';
      return;
    }
    el.classList.remove('is-hidden');
  
    // Build the Learn-more section if the scenario has explanation data.
    let learnHtml = '';
    if (scen.explanation) {
      const ex = scen.explanation;
      const keyDevicesHtml = (ex.keyDevices || []).map(d =>
        `<li><strong>${escHtml(d.name)}</strong> — ${escHtml(d.role)}</li>`
      ).join('');
      const conceptsHtml = (ex.concepts || []).map(c =>
        `<li><strong>${escHtml(c.term)}</strong> <span class="tb-scenario-concept-sep">—</span> ${escHtml(c.meaning)}</li>`
      ).join('');
      learnHtml = `
        <details class="tb-scenario-learn">
          <summary class="tb-scenario-learn-summary">
            <span class="tb-scenario-learn-icon" aria-hidden="true">\u{1F4DA}</span>
            <span class="tb-scenario-learn-label">Learn more about this network</span>
            <span class="tb-scenario-learn-chev" aria-hidden="true">\u203A</span>
          </summary>
          <div class="tb-scenario-learn-body">
            ${ex.overview ? `
              <section class="tb-scenario-sec">
                <h4 class="tb-scenario-sec-title"><span class="tb-scenario-sec-ico">\u{1F4DD}</span>Overview</h4>
                <p class="tb-scenario-sec-body">${escHtml(ex.overview)}</p>
              </section>` : ''}
            ${ex.dataFlow ? `
              <section class="tb-scenario-sec">
                <h4 class="tb-scenario-sec-title"><span class="tb-scenario-sec-ico">\u{1F501}</span>How it routes data</h4>
                <p class="tb-scenario-sec-body">${escHtml(ex.dataFlow)}</p>
              </section>` : ''}
            ${keyDevicesHtml ? `
              <section class="tb-scenario-sec">
                <h4 class="tb-scenario-sec-title"><span class="tb-scenario-sec-ico">\u{1F9E9}</span>Key devices</h4>
                <ul class="tb-scenario-keydevs">${keyDevicesHtml}</ul>
              </section>` : ''}
            ${conceptsHtml ? `
              <section class="tb-scenario-sec">
                <h4 class="tb-scenario-sec-title"><span class="tb-scenario-sec-ico">\u{1F4A1}</span>Key concepts</h4>
                <ul class="tb-scenario-concepts">${conceptsHtml}</ul>
              </section>` : ''}
            ${ex.examTies ? `
              <section class="tb-scenario-sec tb-scenario-sec-exam">
                <h4 class="tb-scenario-sec-title"><span class="tb-scenario-sec-ico">\u{1F393}</span>Exam relevance</h4>
                <p class="tb-scenario-sec-body">${escHtml(ex.examTies)}</p>
              </section>` : ''}
          </div>
        </details>
      `;
    }
  
    el.innerHTML = `
      <div class="tb-scenario-head">
        <div class="tb-scenario-title">\u{1F3AF} ${escHtml(scen.title)}</div>
        <div class="tb-scenario-desc">${escHtml(scen.description)}</div>
      </div>
      <ul class="tb-scenario-reqs">
        ${scen.requirements.map(r => `<li>${escHtml(r)}</li>`).join('')}
      </ul>
      ${learnHtml}
    `;
  }
  
  // ── Grader entry point ──
  function tbGradeTopology() {
    if (tbState.devices.length === 0) {
      showErrorToast('Add some devices before grading.');
      return;
    }
    // v4.49.4: refuse to grade an unmodified reference scenario — it\'s
    // trivially 100% against its own rules, not pedagogically useful.
    // User can modify the canvas (add/remove a device or cable) to make it
    // their own build, or pick Free Build from the scenario dropdown.
    if (tbIsPristineScenario()) {
      const scen = TB_SCENARIOS.find(s => s.id === tbState.pristineScenarioId);
      const title = scen?.title || 'Scenario';
      showErrorToast('"' + title + '" is a reference scenario \u2014 it matches itself by design. Modify the canvas (add/remove a device or cable) to grade your own build, or pick Free Build to start fresh.');
      return;
    }
    const scen = TB_SCENARIOS.find(s => s.id === tbSelectedScenario) || TB_SCENARIOS[0];
    const rules = TB_GRADE_RULES.filter(r => scen.ruleIds.indexOf(r.id) >= 0);
    const results = rules.map(rule => ({
      id: rule.id,
      passed: !!rule.test(tbState),
      severity: rule.severity,
      label: rule.label,
      hint: rule.hint,
    }));
    // Scenario device-count requirements → synthetic critical rules
    const requireResults = (scen.requires || []).map(req => {
      let count;
      let label;
      if (req.type === 'public-*') {
        count = tbState.devices.filter(d => tbIsPublicType(d.type)).length;
        label = 'Public server';
      } else {
        count = tbState.devices.filter(d => d.type === req.type).length;
        label = (TB_DEVICE_TYPES[req.type] && TB_DEVICE_TYPES[req.type].label) || req.type;
      }
      const plural = req.min > 1 ? 's' : '';
      return {
        id: `req-${req.type}`,
        passed: count >= req.min,
        severity: 'critical',
        label: `Scenario requires ${req.min}+ ${label}${plural} (you have ${count})`,
        hint: `This scenario cannot be satisfied without at least ${req.min} ${label}${plural}.`,
      };
    });
    const allResults = [...requireResults, ...results];
    const deductions = { critical: 20, warning: 10, info: 5 };
    let score = 100;
    allResults.filter(r => !r.passed).forEach(r => { score -= (deductions[r.severity] || 10); });
    score = Math.max(0, score);
    const grade = score >= 93 ? 'A' : score >= 87 ? 'A-' : score >= 80 ? 'B+' : score >= 73 ? 'B' : score >= 65 ? 'C+' : score >= 58 ? 'C' : score >= 50 ? 'D' : 'F';
    tbShowGradeModal({ score, grade, results: allResults, scenario: scen });
    tbUpdateStatus(`Graded: ${grade} (${score}/100)`);
  }
  
  function tbShowGradeModal({ score, grade, results, scenario }) {
    const modal = document.getElementById('tb-grade-modal');
    const body = document.getElementById('tb-grade-body');
    if (!modal || !body) return;
    const fails = results.filter(r => !r.passed);
    const passes = results.filter(r => r.passed);
    const critical = fails.filter(r => r.severity === 'critical');
    const warnings = fails.filter(r => r.severity === 'warning');
    const info = fails.filter(r => r.severity === 'info');
    const gradeColor = score >= 87 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444';
    const mkItem = r => `<div class="tb-grade-item"><div class="tb-grade-item-label">${escHtml(r.label)}</div><div class="tb-grade-item-hint">${escHtml(r.hint)}</div></div>`;
    const mkPass = r => `<div class="tb-grade-item tb-grade-item-pass">\u2713 ${escHtml(r.label)}</div>`;
    body.innerHTML = `
      <div class="tb-grade-hero">
        <div class="tb-grade-circle" style="border-color:${gradeColor};color:${gradeColor}">
          <div class="tb-grade-letter">${grade}</div>
          <div class="tb-grade-score">${score}/100</div>
        </div>
        <div class="tb-grade-summary">
          <div class="tb-grade-scenario">${escHtml(scenario.title)}</div>
          <div class="tb-grade-counts">
            <span class="tb-grade-count tb-grade-count-pass">\u2713 ${passes.length} passed</span>
            ${critical.length ? `<span class="tb-grade-count tb-grade-count-crit">\u2717 ${critical.length} critical</span>` : ''}
            ${warnings.length ? `<span class="tb-grade-count tb-grade-count-warn">\u26A0 ${warnings.length} warnings</span>` : ''}
            ${info.length ? `<span class="tb-grade-count tb-grade-count-info">\u2139 ${info.length} info</span>` : ''}
          </div>
        </div>
      </div>
      ${critical.length ? `<div class="tb-grade-section tb-grade-crit"><div class="tb-grade-section-title">\u2717 Critical issues</div>${critical.map(mkItem).join('')}</div>` : ''}
      ${warnings.length ? `<div class="tb-grade-section tb-grade-warn"><div class="tb-grade-section-title">\u26A0 Warnings</div>${warnings.map(mkItem).join('')}</div>` : ''}
      ${info.length ? `<div class="tb-grade-section tb-grade-info"><div class="tb-grade-section-title">\u2139 Suggestions</div>${info.map(mkItem).join('')}</div>` : ''}
      ${passes.length ? `<div class="tb-grade-section tb-grade-pass"><div class="tb-grade-section-title">\u2713 Passed</div>${passes.map(mkPass).join('')}</div>` : ''}
    `;
    modal.classList.remove('is-hidden');
  }
  
  function tbCloseGradeModal() {
    const modal = document.getElementById('tb-grade-modal');
    if (modal) modal.classList.add('is-hidden');
  }
  
  // ── PNG export ──
  function tbExportPNG() {
    if (tbState.devices.length === 0) {
      showErrorToast('Nothing to export yet.');
      return;
    }
    const svg = document.getElementById('tb-canvas');
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute('width', TB_CANVAS_W);
    clone.setAttribute('height', TB_CANVAS_H);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // Dark background (grid is transparent)
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', '#0b1020');
    clone.insertBefore(bgRect, clone.firstChild);
    const xml = new XMLSerializer().serializeToString(clone);
    let svg64;
    try { svg64 = btoa(unescape(encodeURIComponent(xml))); }
    catch (_) { showErrorToast('Export failed (encoding).'); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = TB_CANVAS_W;
      canvas.height = TB_CANVAS_H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) { showErrorToast('Export failed.'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = (tbState.name || 'topology').replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'topology';
        a.download = `${safeName}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        tbUpdateStatus(`Exported ${a.download}`);
      }, 'image/png');
    };
    img.onerror = () => showErrorToast('PNG export failed to rasterize.');
    img.src = `data:image/svg+xml;base64,${svg64}`;
  }
  
  // ══════════════════════════════════════════
  // TOPOLOGY BUILDER TIER 3 — AI Coach
  // ══════════════════════════════════════════
  
  // Compact text description of the current topology for the LLM.
  // Grouped by device type with per-device neighbor lists. Cable types are
  // shown inline as "--type->" so the coach can comment on cabling choices.
  function tbSerializeTopology(state) {
    if (!state.devices.length) return '(empty)';
    // Group devices by type and assign per-type index so each gets a stable label.
    const byType = {};
    state.devices.forEach(d => {
      if (!byType[d.type]) byType[d.type] = [];
      byType[d.type].push(d);
    });
    const labelFor = {};
    Object.keys(byType).forEach(type => {
      byType[type].forEach((d, i) => {
        const meta = TB_DEVICE_TYPES[type];
        const base = (meta && meta.label) || type;
        labelFor[d.id] = byType[type].length > 1 ? `${base} #${i + 1}` : base;
      });
    });
    // Inventory lines
    const inv = Object.keys(byType).map(type => {
      const meta = TB_DEVICE_TYPES[type];
      return `- ${(meta && meta.label) || type} × ${byType[type].length}`;
    }).join('\n');
    // Connection lines — for each device list its neighbors and the cable type
    const conn = state.devices.map(d => {
      const cables = state.cables.filter(c => c.from === d.id || c.to === d.id);
      if (!cables.length) return `- ${labelFor[d.id]} → (not connected)`;
      const nbrs = cables.map(c => {
        const otherId = c.from === d.id ? c.to : c.from;
        const other = state.devices.find(x => x.id === otherId);
        if (!other) return null;
        const ct = (TB_CABLE_TYPES[c.type] && TB_CABLE_TYPES[c.type].label) || 'Cat6';
        return `${labelFor[other.id]} (${ct})`;
      }).filter(Boolean);
      return `- ${labelFor[d.id]} → ${nbrs.join(', ')}`;
    }).join('\n');
    return `Topology: "${state.name || 'Untitled'}"\n${state.devices.length} devices, ${state.cables.length} cables\n\nINVENTORY:\n${inv}\n\nCONNECTIONS:\n${conn}`;
  }
  
  // Cheap hash so we can cache coach responses per topology + scenario.
  function tbTopologyHash(state, scenarioId) {
    const payload = JSON.stringify({
      s: scenarioId,
      d: state.devices.map(d => ({ t: d.type, x: Math.round(d.x / 20), y: Math.round(d.y / 20) })),
      c: state.cables.map(c => ({ f: c.from, t: c.to, k: c.type || 'cat6' })).sort((a, b) => (a.f + a.t).localeCompare(b.f + b.t)),
    });
    let h = 0;
    for (let i = 0; i < payload.length; i++) {
      h = ((h << 5) - h) + payload.charCodeAt(i);
      h |= 0;
    }
    return 'coach_' + (h >>> 0).toString(36);
  }
  
  function tbLoadCoachCache() {
    try { return JSON.parse(localStorage.getItem(STORAGE.TB_COACH_CACHE) || '{}'); }
    catch (_) { return {}; }
  }
  function tbSaveCoachCache(cache) {
    // Keep only the 10 most recent entries to bound localStorage.
    const entries = Object.entries(cache).sort((a, b) => (b[1].t || 0) - (a[1].t || 0)).slice(0, 10);
    const trimmed = Object.fromEntries(entries);
    try { localStorage.setItem(STORAGE.TB_COACH_CACHE, JSON.stringify(trimmed)); } catch (_) {}
  }
  
  // Coach entry point. Fetches from cache or calls Claude Haiku.
  async function tbCoachTopology() {
    if (tbState.devices.length === 0) {
      showErrorToast('Add some devices before asking the Coach.');
      return;
    }
    // v4.49.4: refuse to coach an unmodified reference scenario (same
    // reasoning as tbGradeTopology — reference scenarios are already "correct"
    // by their own rules, there\'s nothing for the Coach to teach).
    if (tbIsPristineScenario()) {
      const scen = TB_SCENARIOS.find(s => s.id === tbState.pristineScenarioId);
      const title = scen?.title || 'Scenario';
      showErrorToast('"' + title + '" is a reference scenario \u2014 open "Learn more" in the scenario panel for the built-in deep dive. Coach is for grading your own edits to the canvas.');
      return;
    }
    const key = (localStorage.getItem(STORAGE.KEY) || '').trim();
    if (!key) {
      showErrorToast('Add your Anthropic API key in Settings (gear icon) to use the Coach.');
      return;
    }
    const scen = TB_SCENARIOS.find(s => s.id === tbSelectedScenario) || TB_SCENARIOS[0];
  
    // v4.43.1: If the user is mid-lab, the coach should behave like a tutor
    // focused on their current step — not a generic topology reviewer. Inject
    // the active lab + current step into the prompt so the coach can reference
    // exact step goals instead of giving generic "nice design" feedback.
    const activeLab = tbActiveLab ? TB_LABS.find(l => l.id === tbActiveLab.labId) : null;
    const activeStep = (activeLab && activeLab.steps) ? activeLab.steps[tbActiveLab.stepIdx] : null;
  
    // Cache key includes lab + step so returning to a previously-coached step
    // is a cache hit, but advancing steps fetches fresh coaching.
    const cacheContext = activeLab
      ? scen.id + '::' + tbActiveLab.labId + '::step' + tbActiveLab.stepIdx
      : scen.id;
    const hash = tbTopologyHash(tbState, cacheContext);
  
    // Cache hit → show instantly
    const cache = tbLoadCoachCache();
    if (cache[hash] && cache[hash].payload) {
      tbShowCoachModal(cache[hash].payload, scen, /*cached=*/true);
      return;
    }
  
    // Show modal in loading state
    tbShowCoachModalLoading(scen);
  
    const serialized = tbSerializeTopology(tbState);
  
    // Build the prompt differently depending on whether a lab is active.
    // Lab-aware mode: the coach knows the exact step the student is stuck on.
    // Free-build mode: falls back to v4.21.0 behavior (scenario-based review).
    let prompt;
    if (activeLab && activeStep) {
      const stepNum = tbActiveLab.stepIdx + 1;
      const totalSteps = activeLab.steps.length;
      const stripMd = s => String(s || '').replace(/\*\*/g, '').replace(/`/g, '');
      prompt = `You are a CompTIA Network+ (N10-009) instructor helping a student complete a specific hands-on lab step. The student is stuck or wants a hint. Be a TUTOR, not a reviewer — reference the exact step goal, point at what's missing in their current topology, and nudge them toward the solution without just giving it away.
  
  LAB: ${activeLab.title} (N10-009 Obj ${activeLab.objective}, ${activeLab.difficulty})
  Lab overview: ${activeLab.description}
  
  STUDENT IS ON STEP ${stepNum} OF ${totalSteps}: "${stripMd(activeStep.title)}"
  Step goal: ${stripMd(activeStep.instruction)}
  Step hint (only reference if the student seems truly stuck): ${stripMd(activeStep.hint || '(no hint)')}
  
  CURRENT TOPOLOGY STATE:
  ${serialized}
  
  Respond with ONLY a JSON object (no preamble, no markdown fences) with these keys:
  {
    "tour": "A 1-2 sentence observation of the student's current progress on THIS SPECIFIC STEP. What have they done right so far? What's still missing to complete the step?",
    "strengths": ["2-3 specific things they've done correctly, tied to the step goal or prior steps"],
    "concerns": ["1-3 things blocking completion of THIS step — be specific about what's missing"],
    "upgrades": ["2-3 concrete next actions to complete this step, in order. Reference the lab instruction directly — 'You need to configure VLAN 20 on the switch's VLANs tab' not generic advice."],
    "objectives": ["1-3 N10-009 objectives this step exercises, formatted as 'X.Y — Name'"],
    "studyTip": "1 sentence tying this step to a broader concept — what is this step really teaching, beyond the mechanical action?"
  }
  
  Keep the total response under 400 words. Respond with ONLY the JSON object.`;
    } else {
      prompt = `You are a CompTIA Network+ (N10-009) instructor reviewing a student's network topology design. Be direct, specific, and tie observations to N10-009 exam objectives where relevant. The student picked this scenario:
  
  Scenario: ${scen.title}
  ${scen.description}
  
  Here is their topology:
  
  ${serialized}
  
  Respond with ONLY a JSON object (no preamble, no markdown fences) with these keys:
  {
    "tour": "A 2-3 sentence plain-English walkthrough of the design, as if narrating it to a student who can't see the canvas.",
    "strengths": ["2-4 things they got right, tied to N10-009 objectives when possible"],
    "concerns": ["2-4 design issues or questionable choices — things the static grader might miss"],
    "upgrades": ["2-3 concrete upgrade suggestions with rationale"],
    "objectives": ["2-4 N10-009 objectives this topology exercises, formatted as 'X.Y — Name'"],
    "studyTip": "1 sentence pointing them toward what to drill next based on this design."
  }
  
  Keep the total response under 500 words. Respond with ONLY the JSON object.`;
    }
  
    try {
      const res = await _claudeFetch( {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model: CLAUDE_TEACHER_MODEL, max_tokens: MAX_TOKENS_TEACHER_DEFAULT, messages: [{ role: 'user', content: prompt }] })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        tbShowCoachModalError(`API returned ${res.status}. ${errText.slice(0, 160)}`);
        return;
      }
      const data = await res.json();
      const text = (data.content && data.content[0] && data.content[0].text) || '';
      // Strip any markdown fences the model might wrap around JSON.
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      let payload;
      try {
        payload = JSON.parse(cleaned);
      } catch (e) {
        // Last-ditch: find the first {...} block.
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) {
          try { payload = JSON.parse(m[0]); } catch (_) {}
        }
      }
      if (!payload || !payload.tour) {
        tbShowCoachModalError('Coach returned an unexpected response. Try again.');
        return;
      }
      // Cache and render
      cache[hash] = { t: Date.now(), payload };
      tbSaveCoachCache(cache);
      tbShowCoachModal(payload, scen, /*cached=*/false);
    } catch (e) {
      tbShowCoachModalError(e && e.message ? e.message : 'Network error.');
    }
  }
  
  function tbShowCoachModalLoading(scenario) {
    const modal = document.getElementById('tb-coach-modal');
    const body = document.getElementById('tb-coach-body');
    if (!modal || !body) return;
    modal.classList.remove('is-hidden');
    body.innerHTML = `
      <div class="tb-coach-loading">
        <div class="tb-coach-spinner"></div>
        <div class="tb-coach-loading-text">
          <strong>Coach is analyzing your topology\u2026</strong>
          <div class="tb-coach-loading-sub">Scenario: ${escHtml(scenario.title)} &middot; usually takes 3\u20135 seconds</div>
        </div>
      </div>
    `;
  }
  
  function tbShowCoachModalError(msg) {
    const body = document.getElementById('tb-coach-body');
    if (!body) return;
    body.innerHTML = `
      <div class="tb-coach-error">
        <div class="tb-coach-error-title">\u26A0 Coach couldn't reach the API</div>
        <div class="tb-coach-error-msg">${escHtml(msg)}</div>
        <button type="button" class="btn btn-ghost" onclick="tbCoachTopology()" style="margin-top:12px">Retry</button>
      </div>
    `;
  }
  
  function tbShowCoachModal(payload, scenario, cached) {
    const modal = document.getElementById('tb-coach-modal');
    const body = document.getElementById('tb-coach-body');
    if (!modal || !body) return;
    modal.classList.remove('is-hidden');
    const list = arr => Array.isArray(arr) && arr.length
      ? `<ul class="tb-coach-list">${arr.map(x => `<li>${escHtml(String(x))}</li>`).join('')}</ul>`
      : '<div class="tb-coach-empty">(none)</div>';
    const cachedBadge = cached ? '<span class="tb-coach-cached">cached</span>' : '';
    // v4.43.1: If a lab is active, show the lab title + step position in the
    // modal header so it's clear the coach is helping with a specific step,
    // not doing a generic scenario review.
    const activeLab = tbActiveLab ? TB_LABS.find(l => l.id === tbActiveLab.labId) : null;
    const labHeader = activeLab
      ? `<div class="tb-coach-lab-badge">🧪 Lab: ${escHtml(activeLab.title)} · Step ${tbActiveLab.stepIdx + 1} of ${activeLab.steps.length}</div>`
      : '';
    const scenarioLine = activeLab
      ? '' // lab header already communicates context — skip scenario line
      : `<div class="tb-coach-scenario">${escHtml(scenario.title)} ${cachedBadge}</div>`;
    body.innerHTML = `
      <div class="tb-coach-head">
        ${labHeader}
        ${scenarioLine}
        <div class="tb-coach-tour">${escHtml(payload.tour || '')}</div>
        ${activeLab && cached ? `<div class="tb-coach-cached-inline">${cachedBadge}</div>` : ''}
      </div>
  
      <div class="tb-coach-section tb-coach-strengths">
        <div class="tb-coach-section-title">\u2713 Strengths</div>
        ${list(payload.strengths)}
      </div>
  
      <div class="tb-coach-section tb-coach-concerns">
        <div class="tb-coach-section-title">\u26A0 Concerns</div>
        ${list(payload.concerns)}
      </div>
  
      <div class="tb-coach-section tb-coach-upgrades">
        <div class="tb-coach-section-title">\u2191 Upgrade suggestions</div>
        ${list(payload.upgrades)}
      </div>
  
      <div class="tb-coach-section tb-coach-objectives">
        <div class="tb-coach-section-title">\u{1F4DA} N10-009 objectives exercised</div>
        ${list(payload.objectives)}
      </div>
  
      ${payload.studyTip ? `
        <div class="tb-coach-tip">
          <strong>\u{1F3AF} Study next:</strong> ${escHtml(payload.studyTip)}
        </div>
      ` : ''}
    `;
  }
  
  function tbCloseCoachModal() {
    const modal = document.getElementById('tb-coach-modal');
    if (modal) modal.classList.add('is-hidden');
  }
  
  // ══════════════════════════════════════════
  // TOPOLOGY BUILDER — Config Panel, Simulation Engine, CLI
  // ══════════════════════════════════════════
  
  // ── Config Panel ──
  let tbActiveConfigTab = 'overview';
  
  function tbOpenConfigPanel(deviceId) {
    const dev = tbState.devices.find(d => d.id === deviceId);
    if (!dev) return;
    tbConfigPanelDeviceId = deviceId;
    tbCliHistory = []; // reset CLI on device switch
    const panel = document.getElementById('tb-config-panel');
    const title = document.getElementById('tb-config-title');
    if (!panel || !title) return;
    const meta = TB_DEVICE_TYPES[dev.type] || {};
    title.textContent = `${dev.hostname || meta.label} (${meta.label})`;
    panel.classList.remove('is-hidden');
    // v4.54.7: the panel is now position:fixed. Reset inline left/top so it
    // reappears in its default corner on each open (previous drag position
    // doesn't persist across device swaps).
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    document.querySelector('.tb-workspace')?.classList.add('tb-config-open');
    // Show/hide tabs based on device type
    const isSwitch = dev.type.indexOf('switch') >= 0;
    const isRouter = dev.type === 'router' || dev.type === 'firewall' || dev.type === 'isp-router';
    const isServer = dev.type === 'server';
    const CLOUD_TYPES = ['vpc','cloud-subnet','igw','nat-gw','tgw','vpg','sase-edge'];
    const isCloudDevice = CLOUD_TYPES.indexOf(dev.type) >= 0;
    const isVpc = dev.type === 'vpc';
    const isSubnet = dev.type === 'cloud-subnet';
    const isVpnEndpoint = dev.type === 'vpg' || dev.type === 'onprem-dc';
    const isSase = dev.type === 'sase-edge';
    document.querySelectorAll('.tb-config-tab').forEach(t => {
      const tab = t.getAttribute('data-tb-tab');
      if (tab === 'routing') t.classList.toggle('is-hidden', !isRouter && !isVpnEndpoint);
      if (tab === 'vlans') t.classList.toggle('is-hidden', !isSwitch);
      if (tab === 'dhcp') t.classList.toggle('is-hidden', !isRouter && !isServer);
      if (tab === 'security-groups') t.classList.toggle('is-hidden', !isCloudDevice && dev.type !== 'server' && dev.type !== 'pc');
      if (tab === 'nacls') t.classList.toggle('is-hidden', !isSubnet);
      if (tab === 'vpc-config') t.classList.toggle('is-hidden', !isVpc);
      if (tab === 'vpn') t.classList.toggle('is-hidden', !isVpnEndpoint);
      if (tab === 'sase') t.classList.toggle('is-hidden', !isSase);
      if (tab === 'vxlan') t.classList.toggle('is-hidden', !isSwitch && !isRouter);
      if (tab === 'stp') t.classList.toggle('is-hidden', !isSwitch);
      if (tab === 'ospf') t.classList.toggle('is-hidden', !isRouter);
      if (tab === 'qos') t.classList.toggle('is-hidden', !isRouter && !isSwitch);
      if (tab === 'wireless') t.classList.toggle('is-hidden', dev.type !== 'wap' && dev.type !== 'wlc');
      if (tab === 'dns') t.classList.toggle('is-hidden', dev.type !== 'dns-server' && !isServer);
      if (tab === 'bgp') t.classList.toggle('is-hidden', !isRouter);
      if (tab === 'eigrp') t.classList.toggle('is-hidden', !isRouter);
      if (tab === 'attack') t.classList.toggle('is-hidden', !isSwitch && !isRouter);
    });
    tbSwitchConfigTab('overview');
    // Show sim toolbar
    document.getElementById('tb-sim-toolbar')?.classList.remove('is-hidden');
  }
  
  function tbCloseConfigPanel() {
    tbConfigPanelDeviceId = null;
    document.getElementById('tb-config-panel')?.classList.add('is-hidden');
    document.querySelector('.tb-workspace')?.classList.remove('tb-config-open');
  }
  
  function tbSwitchConfigTab(tab) {
    tbActiveConfigTab = tab;
    document.querySelectorAll('.tb-config-tab').forEach(t => {
      t.classList.toggle('tb-config-tab-active', t.getAttribute('data-tb-tab') === tab);
    });
    const body = document.getElementById('tb-config-body');
    if (!body) return;
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) { body.innerHTML = ''; return; }
    switch (tab) {
      case 'overview': body.innerHTML = tbRenderOverviewTab(dev); break;
      case 'ifaces': body.innerHTML = tbRenderIfacesTab(dev); break;
      case 'routing': body.innerHTML = tbRenderRoutingTab(dev); break;
      case 'vlans': body.innerHTML = tbRenderVlansTab(dev); break;
      case 'dhcp': body.innerHTML = tbRenderDhcpTab(dev); break;
      case 'cli': body.innerHTML = tbRenderCliTab(dev); break;
      case 'security-groups': body.innerHTML = tbRenderSecurityGroupsTab(dev); break;
      case 'nacls': body.innerHTML = tbRenderNaclsTab(dev); break;
      case 'vpc-config': body.innerHTML = tbRenderVpcConfigTab(dev); break;
      case 'vpn': body.innerHTML = tbRenderVpnTab(dev); break;
      case 'sase': body.innerHTML = tbRenderSaseTab(dev); break;
      case 'vxlan': body.innerHTML = tbRenderVxlanTab(dev); break;
      case 'stp': body.innerHTML = tbRenderStpTab(dev); break;
      case 'ospf': body.innerHTML = tbRenderOspfTab(dev); break;
      case 'qos': body.innerHTML = tbRenderQosTab(dev); break;
      case 'wireless': body.innerHTML = tbRenderWirelessTab(dev); break;
      case 'dns': body.innerHTML = tbRenderDnsTab(dev); break;
      case 'bgp': body.innerHTML = tbRenderBgpTab(dev); break;
      case 'eigrp': body.innerHTML = tbRenderEigrpTab(dev); break;
      case 'attack': body.innerHTML = tbRenderAttackTab(dev); break;
      default: body.innerHTML = '';
    }
  }
  
  // ── Overview Tab — visual device dashboard ──
  function tbRenderOverviewTab(dev) {
    const meta = TB_DEVICE_TYPES[dev.type] || {};
    const upPorts = dev.interfaces.filter(i => i.enabled && i.cableId);
    const downPorts = dev.interfaces.filter(i => !i.enabled || !i.cableId);
    const hasIp = dev.interfaces.some(i => i.ip);
    const isSwitch = dev.type.indexOf('switch') >= 0;
    const isRouter = dev.type === 'router' || dev.type === 'firewall' || dev.type === 'isp-router';
    const isCloudDev = ['vpc','cloud-subnet','igw','nat-gw','tgw','vpg','sase-edge'].indexOf(dev.type) >= 0;
  
    // Build port status LEDs
    const portLeds = dev.interfaces.map(ifc => {
      const connected = ifc.cableId && ifc.enabled;
      const color = connected ? (ifc.ip ? '#22c55e' : '#facc15') : '#64748b';
      const tip = `${ifc.name}: ${connected ? (ifc.ip || 'no IP') : 'down'}`;
      return `<span class="tb-ov-led" style="background:${color}" title="${escHtml(tip)}"></span>`;
    }).join('');
  
    // Interface summary cards
    const ifaceCards = dev.interfaces.filter(i => i.cableId).map(ifc => {
      const cable = tbState.cables.find(c => c.id === ifc.cableId);
      const peerId = cable ? (cable.from === dev.id ? cable.to : cable.from) : null;
      const peer = peerId ? tbState.devices.find(d => d.id === peerId) : null;
      const cType = cable ? (TB_CABLE_TYPES[cable.type] || {}).label || 'Cat6' : '';
      const statusColor = ifc.enabled ? '#22c55e' : '#ef4444';
      const modeLabel = ifc.mode === 'trunk' ? 'TRUNK' : `Access VLAN ${ifc.vlan}`;
      return `<div class="tb-ov-iface-card">
        <div class="tb-ov-iface-head">
          <span class="tb-ov-iface-dot" style="background:${statusColor}"></span>
          <strong>${escHtml(ifc.name)}</strong>
          <span class="tb-ov-iface-mode">${modeLabel}</span>
        </div>
        <div class="tb-ov-iface-detail">
          ${ifc.ip ? `<span>IP: <code>${escHtml(ifc.ip)}/${tbMaskToCidr(ifc.mask)}</code></span>` : '<span style="color:#64748b">No IP</span>'}
          <span>MAC: <code>${ifc.mac || '?'}</code></span>
          ${peer ? `<span>&rarr; <strong>${escHtml(peer.hostname || '?')}</strong> (${cType})</span>` : ''}
          ${ifc.mode === 'trunk' ? `<span>Allowed: ${(ifc.trunkAllowed||[1]).join(',')}</span>` : ''}
        </div>
      </div>`;
    }).join('');
  
    // Quick stats
    const routeCount = dev.routingTable ? dev.routingTable.length : 0;
    const arpCount = dev.arpTable ? dev.arpTable.length : 0;
    const vlanCount = dev.vlanDb ? dev.vlanDb.length : 0;
    const dhcpStatus = dev.dhcpServer ? 'Enabled' : (dev.dhcpRelay ? 'Relay' : 'Off');
  
    // Build hostname edit and gateway for endpoints
    const isEndpoint = ['pc','laptop','smartphone','game-console','smart-tv','printer','voip','iot','public-web','public-file','public-cloud'].indexOf(dev.type) >= 0;
    const gwInfo = isEndpoint && dev.interfaces[0]?.gateway ? `<div class="tb-ov-stat"><span>Gateway</span><code>${escHtml(dev.interfaces[0].gateway)}</code></div>` : '';
  
    return `<div class="tb-ov-hero">
      <div class="tb-ov-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="-28 -20 56 40">${tbDeviceIcon(dev.type, meta.color)}</svg></div>
      <div class="tb-ov-hero-info">
        <input type="text" class="tb-ov-hostname" value="${escHtml(dev.hostname||'')}" onchange="tbSetHostname(this.value)" placeholder="Hostname">
        <span class="tb-ov-type-badge" style="border-color:${meta.color};color:${meta.color}">${meta.label}</span>
      </div>
    </div>
    <div class="tb-ov-leds-row">${portLeds}<span style="color:#64748b;font-size:10px;margin-left:6px">${upPorts.length}/${dev.interfaces.length} ports up</span></div>
    <div class="tb-ov-stats-grid">
      <div class="tb-ov-stat"><span>Routes</span><strong>${routeCount}</strong></div>
      <div class="tb-ov-stat"><span>ARP</span><strong>${arpCount}</strong></div>
      ${isSwitch ? `<div class="tb-ov-stat"><span>VLANs</span><strong>${vlanCount}</strong></div>` : ''}
      ${isSwitch ? `<div class="tb-ov-stat"><span>MAC Table</span><strong>${dev.macTable ? dev.macTable.length : 0}</strong></div>` : ''}
      <div class="tb-ov-stat"><span>DHCP</span><strong>${dhcpStatus}</strong></div>
      ${gwInfo}
      ${dev.securityGroups?.length ? `<div class="tb-ov-stat"><span>SGs</span><strong>${dev.securityGroups.length}</strong></div>` : ''}
      ${dev.nacls?.length ? `<div class="tb-ov-stat"><span>NACLs</span><strong>${dev.nacls.length}</strong></div>` : ''}
      ${dev.vpnConfig ? `<div class="tb-ov-stat"><span>VPN</span><strong style="color:${dev.vpnConfig.tunnelStatus==='up'?'#22c55e':'#ef4444'}">${dev.vpnConfig.tunnelStatus.toUpperCase()}</strong></div>` : ''}
      ${dev.vpcConfig?.peerings?.length ? `<div class="tb-ov-stat"><span>Peerings</span><strong>${dev.vpcConfig.peerings.length}</strong></div>` : ''}
      ${dev.vxlanConfig?.length ? `<div class="tb-ov-stat"><span>VXLAN Tunnels</span><strong>${dev.vxlanConfig.length}</strong></div>` : ''}
    </div>
    ${routeCount > 0 ? `<div class="tb-ov-section-label">Routing Table</div><div style="max-height:120px;overflow-y:auto;margin-bottom:8px;font-family:'Fira Code',monospace;font-size:10px;background:rgba(0,0,0,.2);border-radius:6px;padding:6px">${dev.routingTable.map(r => `<div style="padding:2px 0"><span style="color:${r.type==='connected'?'#22c55e':'#60a5fa'};font-weight:700">${r.type==='connected'?'C':'S'}</span> ${escHtml(r.network)}/${tbMaskToCidr(r.mask)} via ${escHtml(r.nextHop||r.iface)}</div>`).join('')}</div>` : ''}
    ${ifaceCards ? `<div class="tb-ov-section-label">Connected Interfaces</div>${ifaceCards}` : '<div style="color:#64748b;font-size:11px">No connected interfaces. Wire this device to others first.</div>'}
    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab('ifaces')">Edit Interfaces</button>
      ${isRouter ? '<button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab(\'routing\')">Routing Table</button>' : ''}
      ${isSwitch ? '<button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab(\'vlans\')">VLAN Config</button>' : ''}
      ${isCloudDev ? '<button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab(\'security-groups\')">Security Groups</button>' : ''}
      ${dev.type === 'vpc' ? '<button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab(\'vpc-config\')">VPC Config</button>' : ''}
      <button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab('cli')">Open CLI</button>
    </div>`;
  }
  
  // ── Interfaces Tab ──
  function tbRenderIfacesTab(dev) {
    const isSwitch = dev.type.indexOf('switch') >= 0;
    const rows = dev.interfaces.map((ifc, i) => {
      const cable = ifc.cableId ? tbState.cables.find(c => c.id === ifc.cableId) : null;
      const peerDevId = cable ? (cable.from === dev.id ? cable.to : cable.from) : null;
      const peerDev = peerDevId ? tbState.devices.find(d => d.id === peerDevId) : null;
      const cableLbl = peerDev ? `→ ${peerDev.hostname || '?'}` : '(free)';
      const statusCls = ifc.enabled ? 'tb-iface-status-up' : 'tb-iface-status-down';
      const statusTxt = ifc.enabled ? 'UP' : 'DN';
      // DTP mode (only for switches)
      const dtpOpts = isSwitch ? `<select onchange="tbSetIfaceField(${i},'dtp',this.value)" style="width:52px" title="DTP mode">
        <option value="on"${(ifc.dtp||'on')==='on'?' selected':''}>On</option>
        <option value="desirable"${ifc.dtp==='desirable'?' selected':''}>Desir</option>
        <option value="auto"${ifc.dtp==='auto'?' selected':''}>Auto</option>
        <option value="noneg"${ifc.dtp==='noneg'?' selected':''}>NoNeg</option>
      </select>` : '';
      // Trunk allowed VLANs (only when trunk mode)
      const trunkInfo = ifc.mode === 'trunk' ? `<div class="tb-iface-trunk-detail">
        <label style="font-size:10px;margin:0">Allowed VLANs:</label>
        <input type="text" value="${(ifc.trunkAllowed||[1]).join(',')}" onchange="tbSetTrunkAllowed(${i},this.value)" style="width:100%;font-size:10px" placeholder="1,10,20" title="Comma-separated VLAN IDs">
        <label style="font-size:10px;margin:0">Native VLAN:</label>
        <input type="text" value="${ifc.nativeVlan || 1}" onchange="tbSetIfaceField(${i},'nativeVlan',parseInt(this.value)||1)" style="width:50px;font-size:10px" title="Native VLAN (untagged)">
      </div>` : '';
      return `<tr>
        <td><span class="tb-iface-name">${escHtml(ifc.name)}</span><br><span class="tb-iface-cable">${escHtml(cableLbl)}</span></td>
        <td><input type="text" value="${escHtml(ifc.ip)}" placeholder="IP" onchange="tbSetIfaceField(${i},'ip',this.value)" style="width:90px"></td>
        <td><input type="text" value="${escHtml(ifc.mask)}" placeholder="Mask" onchange="tbSetIfaceField(${i},'mask',this.value)" style="width:90px"></td>
        <td><input type="text" value="${ifc.vlan}" onchange="tbSetIfaceField(${i},'vlan',parseInt(this.value)||1)" style="width:32px;text-align:center"></td>
        <td><select onchange="tbSetIfaceField(${i},'mode',this.value);tbSwitchConfigTab('ifaces')" style="width:56px"><option value="access"${ifc.mode==='access'?' selected':''}>Acc</option><option value="trunk"${ifc.mode==='trunk'?' selected':''}>Trunk</option></select></td>
        <td>${dtpOpts}</td>
        <td><span class="${statusCls}" style="cursor:pointer;font-weight:700" onclick="tbToggleIface(${i})">${statusTxt}</span></td>
      </tr>
      ${trunkInfo ? `<tr><td colspan="7" style="padding:2px 5px 6px">${trunkInfo}</td></tr>` : ''}`;
    }).join('');
  
    const isEndpoint = ['pc','laptop','smartphone','game-console','smart-tv','printer','voip','iot','public-web','public-file','public-cloud'].indexOf(dev.type) >= 0;
    const gwRow = isEndpoint ? `<div style="margin-top:8px"><label>Default Gateway</label><input type="text" value="${escHtml(dev.interfaces[0]?.gateway || '')}" onchange="tbSetGateway(this.value)" placeholder="e.g. 192.168.1.1"></div>` : '';
  
    // IPv6 section
    const ipv6Rows = dev.interfaces.filter(i => i.cableId || i.ipv6).map((ifc, idx) => {
      const realIdx = dev.interfaces.indexOf(ifc);
      return `<div style="display:flex;gap:4px;align-items:center;font-size:10px;padding:2px 0">
        <span style="width:50px;font-weight:600">${ifc.name}</span>
        <input type="text" value="${escHtml(ifc.ipv6||'')}" onchange="tbSetIfaceIpv6(${realIdx},this.value)" placeholder="2001:db8::1" style="flex:1;font-size:10px">
        <span style="color:#64748b">/${ifc.ipv6Prefix || 64}</span>
      </div>`;
    }).join('');
  
    return `<div style="margin-bottom:6px"><label>Hostname</label><input type="text" value="${escHtml(dev.hostname||'')}" onchange="tbSetHostname(this.value)"></div>
      <table class="tb-iface-table"><thead><tr><th>Port</th><th>IP</th><th>Mask</th><th>VL</th><th>Mode</th>${isSwitch?'<th>DTP</th>':'<th></th>'}<th>St</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="font-size:10px;color:#64748b">MAC: auto-assigned. ${dev.interfaces.length} ports. ${isSwitch ? 'Set mode to Trunk to configure allowed VLANs + native VLAN.' : ''}</div>
      ${gwRow}
      ${ipv6Rows ? `<div style="margin-top:10px;border-top:1px solid rgba(124,111,247,.15);padding-top:8px"><div style="font-weight:600;font-size:11px;margin-bottom:4px">IPv6 Addresses</div>${ipv6Rows}<div style="font-size:9px;color:#64748b;margin-top:4px">Link-local: fe80::, Global: 2001:db8::, ULA: fd00::</div></div>` : ''}`;
  }
  
  // Helper: set trunk allowed VLANs (comma-separated)
  function tbSetTrunkAllowed(idx, val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.interfaces[idx]) return;
    const vlans = val.split(',').map(v => parseInt(v.trim())).filter(v => v > 0 && v <= 4094);
    dev.interfaces[idx].trunkAllowed = vlans.length ? vlans : [1];
    tbState.updated = Date.now();
    tbSaveDraft();
  }
  
  function tbSetIfaceField(idx, field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.interfaces[idx]) return;
    dev.interfaces[idx][field] = value;
    // If IP changed on a router/firewall, rebuild connected routes
    if (field === 'ip' || field === 'mask') tbRebuildConnectedRoutes(dev);
    tbState.updated = Date.now();
    tbSaveDraft();
    tbRenderCanvas();
  }
  
  function tbSetHostname(val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    dev.hostname = val.trim() || tbAutoHostname(dev.type, tbState.devices.filter(d => d !== dev));
    tbState.updated = Date.now();
    tbSaveDraft();
    tbRenderCanvas();
    const title = document.getElementById('tb-config-title');
    if (title) title.textContent = `${dev.hostname} (${(TB_DEVICE_TYPES[dev.type]||{}).label})`;
  }
  
  function tbSetGateway(val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.interfaces[0]) return;
    dev.interfaces[0].gateway = val.trim();
    tbState.updated = Date.now();
    tbSaveDraft();
  }
  
  function tbSetIfaceIpv6(idx, val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.interfaces[idx]) return;
    dev.interfaces[idx].ipv6 = val.trim(); tbState.updated = Date.now(); tbSaveDraft();
  }
  
  function tbToggleIface(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.interfaces[idx]) return;
    dev.interfaces[idx].enabled = !dev.interfaces[idx].enabled;
    tbState.updated = Date.now();
    tbSaveDraft();
    tbSwitchConfigTab('ifaces');
  }
  
  // Rebuild connected routes when interface IPs change
  function tbRebuildConnectedRoutes(dev) {
    if (dev.type !== 'router' && dev.type !== 'firewall') return;
    dev.routingTable = dev.routingTable.filter(r => r.type !== 'connected');
    dev.interfaces.forEach(ifc => {
      if (ifc.ip && ifc.mask && ifc.enabled) {
        const net = tbSubnetOf(ifc.ip, ifc.mask);
        if (net) dev.routingTable.push({ network: net, mask: ifc.mask, nextHop: null, iface: ifc.name, type: 'connected' });
      }
    });
  }
  
  // ── Routing Tab ──
  function tbRenderRoutingTab(dev) {
    const rows = dev.routingTable.map((r, i) => {
      const typeCls = r.type === 'connected' ? 'tb-route-type-connected' : 'tb-route-type-static';
      const del = r.type === 'static' ? `<button class="btn btn-ghost" onclick="tbDelRoute(${i})" style="padding:2px 6px;font-size:11px">&times;</button>` : '';
      return `<div class="tb-route-row">
        <span class="tb-route-type ${typeCls}">${r.type === 'connected' ? 'C' : 'S'}</span>
        <span style="flex:1;font-family:'Fira Code',monospace;font-size:11px">${escHtml(r.network)}/${tbMaskToCidr(r.mask)} via ${r.nextHop || r.iface}</span>
        ${del}
      </div>`;
    }).join('');
    return `<div style="margin-bottom:8px;font-weight:600;font-size:12px">Routing Table</div>
      ${rows || '<div style="color:#64748b;font-size:11px">No routes. Assign IPs to interfaces to generate connected routes.</div>'}
      <div style="margin-top:12px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
        <div style="font-weight:600;font-size:11px;margin-bottom:6px">Add Static Route</div>
        <div class="tb-route-row">
          <input type="text" id="tb-route-net" placeholder="Network" style="flex:1">
          <input type="text" id="tb-route-mask" placeholder="Mask" style="flex:1">
          <input type="text" id="tb-route-nh" placeholder="Next Hop" style="flex:1">
          <button class="btn btn-ghost" onclick="tbAddStaticRoute()" style="padding:4px 10px;font-size:11px">+</button>
        </div>
      </div>`;
  }
  
  function tbAddStaticRoute() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    const net = document.getElementById('tb-route-net')?.value.trim();
    const mask = document.getElementById('tb-route-mask')?.value.trim() || '255.255.255.0';
    const nh = document.getElementById('tb-route-nh')?.value.trim();
    if (!net || !nh) { showErrorToast('Network and Next Hop required.'); return; }
    dev.routingTable.push({ network: net, mask, nextHop: nh, iface: '', type: 'static' });
    tbState.updated = Date.now();
    tbSaveDraft();
    tbSwitchConfigTab('routing');
  }
  
  function tbDelRoute(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    dev.routingTable.splice(idx, 1);
    tbState.updated = Date.now();
    tbSaveDraft();
    tbSwitchConfigTab('routing');
  }
  
  // ── VLANs Tab ──
  function tbRenderVlansTab(dev) {
    const rows = dev.vlanDb.map((v, i) => `<div class="tb-vlan-row">
      <span class="tb-vlan-id">VLAN ${v.id}</span>
      <span style="flex:1">${escHtml(v.name)}</span>
      ${v.id !== 1 ? `<button class="btn btn-ghost" onclick="tbDelVlan(${i})" style="padding:2px 6px;font-size:11px">&times;</button>` : ''}
    </div>`).join('');
  
    // Ports per VLAN summary
    const portSummary = dev.vlanDb.map(v => {
      const ports = dev.interfaces.filter(ifc => ifc.mode === 'access' && ifc.vlan === v.id);
      return ports.length ? `<div style="font-size:10px;color:#94a3b8;margin-bottom:2px">VLAN ${v.id}: ${ports.map(p=>p.name).join(', ')}</div>` : '';
    }).join('');
  
    return `<div style="margin-bottom:8px;font-weight:600;font-size:12px">VLAN Database</div>
      ${rows}
      <div style="margin-top:8px">${portSummary}</div>
      <div style="margin-top:10px;border-top:1px solid rgba(124,111,247,.15);padding-top:8px">
        <div style="font-weight:600;font-size:11px;margin-bottom:4px">Add VLAN</div>
        <div style="display:flex;gap:6px">
          <input type="text" id="tb-vlan-id" placeholder="ID" style="width:50px">
          <input type="text" id="tb-vlan-name" placeholder="Name" style="flex:1">
          <button class="btn btn-ghost" onclick="tbAddVlan()" style="padding:4px 10px;font-size:11px">+</button>
        </div>
      </div>`;
  }
  
  function tbAddVlan() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    const id = parseInt(document.getElementById('tb-vlan-id')?.value) || 0;
    const name = document.getElementById('tb-vlan-name')?.value.trim() || `VLAN${id}`;
    if (id < 2 || id > 4094) { showErrorToast('VLAN ID must be 2-4094.'); return; }
    if (dev.vlanDb.some(v => v.id === id)) { showErrorToast('VLAN already exists.'); return; }
    dev.vlanDb.push({ id, name });
    tbState.updated = Date.now();
    tbSaveDraft();
    tbSwitchConfigTab('vlans');
  }
  
  function tbDelVlan(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    dev.vlanDb.splice(idx, 1);
    tbState.updated = Date.now();
    tbSaveDraft();
    tbSwitchConfigTab('vlans');
  }
  
  // ── VXLAN Tab ──
  function tbRenderVxlanTab(dev) {
    const tunnels = dev.vxlanConfig || [];
    const rows = tunnels.map((t, i) => `<div class="tb-vxlan-row">
      <div class="tb-vxlan-row-head">
        <strong>VNI ${t.vni}</strong>
        <span class="tb-cloud-badge" style="background:rgba(139,92,246,.2);color:#a78bfa">VTEP ${escHtml(t.vtepIp || '—')}</span>
        <button class="btn btn-ghost" onclick="tbRemoveVxlan(${i})" style="font-size:11px;color:#ef4444;padding:1px 4px">&times;</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
        <div><label style="font-size:9px">VNI (1-${VXLAN_VNI_MAX})</label>
          <input type="number" value="${t.vni}" onchange="tbSetVxlanField(${i},'vni',parseInt(this.value))" min="1" max="${VXLAN_VNI_MAX}" style="width:100%"></div>
        <div><label style="font-size:9px">VTEP Source IP</label>
          <input type="text" value="${escHtml(t.vtepIp || '')}" onchange="tbSetVxlanField(${i},'vtepIp',this.value)" placeholder="e.g. 10.0.0.1" style="width:100%"></div>
        <div><label style="font-size:9px">Mapped VLAN ID</label>
          <input type="number" value="${t.mappedVlan || ''}" onchange="tbSetVxlanField(${i},'mappedVlan',parseInt(this.value)||0)" placeholder="e.g. 10" style="width:100%"></div>
        <div><label style="font-size:9px">Multicast Group</label>
          <input type="text" value="${escHtml(t.mcastGroup || '')}" onchange="tbSetVxlanField(${i},'mcastGroup',this.value)" placeholder="239.1.1.1" style="width:100%"></div>
      </div>
      <div style="margin-top:4px">
        <label style="font-size:9px">Remote VTEPs (comma-separated IPs)</label>
        <input type="text" value="${escHtml((t.remoteVteps || []).join(', '))}" onchange="tbSetVxlanField(${i},'remoteVteps',this.value.split(',').map(s=>s.trim()).filter(Boolean))" placeholder="10.0.0.2, 10.0.0.3" style="width:100%">
      </div>
      <div style="margin-top:4px;display:flex;gap:8px;align-items:center">
        <label style="font-size:9px">Flood & Learn</label>
        <input type="checkbox" ${t.floodAndLearn ? 'checked' : ''} onchange="tbSetVxlanField(${i},'floodAndLearn',this.checked)">
        <label style="font-size:9px;margin-left:8px">BGP EVPN</label>
        <input type="checkbox" ${t.bgpEvpn ? 'checked' : ''} onchange="tbSetVxlanField(${i},'bgpEvpn',this.checked)">
      </div>
    </div>`).join('');
  
    return `<div style="margin-bottom:6px;font-weight:600;font-size:12px">VXLAN Tunnels</div>
      <div style="font-size:10px;color:#64748b;margin-bottom:8px">Virtual eXtensible LAN — Layer 2 overlay over Layer 3 underlay. Each VNI maps a VLAN to a VXLAN segment (up to 16M segments vs 4094 VLANs). VTEPs encapsulate/decapsulate frames in UDP port 4789.</div>
      ${rows || '<div style="color:#64748b;font-size:11px;margin-bottom:8px">No VXLAN tunnels configured.</div>'}
      <button class="btn btn-ghost" onclick="tbAddVxlan()" style="font-size:11px;margin-top:6px">+ Add VXLAN Tunnel</button>`;
  }
  
  function tbAddVxlan() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    if (!dev.vxlanConfig) dev.vxlanConfig = [];
    const nextVni = dev.vxlanConfig.length > 0 ? Math.max(...dev.vxlanConfig.map(v => v.vni)) + 1 : 10000;
    dev.vxlanConfig.push({ vni: nextVni, vtepIp: '', mappedVlan: 0, mcastGroup: '', remoteVteps: [], floodAndLearn: true, bgpEvpn: false });
    tbState.updated = Date.now();
    tbSaveDraft();
    tbSwitchConfigTab('vxlan');
  }
  
  function tbRemoveVxlan(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.vxlanConfig) return;
    dev.vxlanConfig.splice(idx, 1);
    tbState.updated = Date.now();
    tbSaveDraft();
    tbSwitchConfigTab('vxlan');
  }
  
  function tbSetVxlanField(idx, field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.vxlanConfig || !dev.vxlanConfig[idx]) return;
    dev.vxlanConfig[idx][field] = value;
    tbState.updated = Date.now();
    tbSaveDraft();
    if (field === 'vni' || field === 'vtepIp') tbSwitchConfigTab('vxlan');
  }
  
  // ── STP Tab ──
  function tbRenderStpTab(dev) {
    const stp = dev.stpConfig || { priority: 32768, mode: 'rstp', portStates: {} };
    if (!dev.stpConfig) { dev.stpConfig = stp; }
    const portRows = dev.interfaces.filter(i => i.cableId).map(ifc => {
      const st = stp.portStates[ifc.name] || 'forwarding';
      const stColor = st === 'forwarding' ? '#22c55e' : st === 'blocking' ? '#ef4444' : st === 'learning' ? '#f59e0b' : '#60a5fa';
      return `<div style="display:flex;gap:8px;align-items:center;padding:3px 0;font-size:11px">
        <span style="width:50px;font-weight:600">${ifc.name}</span>
        <span style="color:${stColor};font-weight:700">${st.toUpperCase()}</span>
        <select onchange="tbSetStpPortState('${ifc.name}',this.value)" style="font-size:10px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:3px;padding:1px 4px">
          ${['forwarding','blocking','learning','listening','disabled'].map(s => `<option value="${s}"${s===st?' selected':''}>${s}</option>`).join('')}
        </select></div>`;
    }).join('');
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">Spanning Tree Protocol</div>
      <label>Mode</label>
      <select onchange="tbSetStpField('mode',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
        ${['stp','rstp','mstp'].map(m => `<option value="${m}"${m===stp.mode?' selected':''}>${m.toUpperCase()}</option>`).join('')}
      </select>
      <label>Bridge Priority (0-65535, increments of 4096)</label>
      <input type="number" value="${stp.priority}" min="0" max="65535" step="4096" onchange="tbSetStpField('priority',parseInt(this.value))" style="width:100%">
      <div style="font-size:10px;color:#64748b;margin:4px 0">Lower priority = more likely to become Root Bridge. Default: 32768.</div>
      <div style="font-size:10px;color:#94a3b8;margin:2px 0">Root Bridge ID: ${stp.priority}.${dev.interfaces[0]?.mac || 'unknown'}</div>
      <div style="margin-top:12px;font-weight:600;font-size:11px">Port States</div>
      ${portRows || '<div style="font-size:10px;color:#64748b">No connected ports.</div>'}
      <div style="font-size:10px;color:#64748b;margin-top:8px">STP port states: Blocking → Listening → Learning → Forwarding. RSTP converges in ~1-2 seconds vs STP ~30-50 seconds.</div>
      <button class="btn btn-ghost" onclick="tbRunStpConvergence()" style="font-size:10px;margin-top:10px;color:#38bdf8;border-color:#38bdf8">▶ Run Convergence</button>`;
  }
  function tbSetStpField(field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.stpConfig) dev.stpConfig = { priority: 32768, mode: 'rstp', portStates: {} };
    dev.stpConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('stp');
  }
  function tbSetStpPortState(ifName, state) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.stpConfig) dev.stpConfig = { priority: 32768, mode: 'rstp', portStates: {} };
    dev.stpConfig.portStates[ifName] = state; tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('stp');
  }
  
  // ── OSPF Tab ──
  function tbRenderOspfTab(dev) {
    const ospf = dev.ospfConfig || { routerId: '', areas: [], enabled: false };
    if (!dev.ospfConfig) { dev.ospfConfig = ospf; }
    const areaRows = ospf.areas.map((a, i) => `<div style="display:flex;gap:6px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <span style="font-size:10px;font-weight:700;width:60px">Area ${a.id}</span>
      <input type="text" value="${escHtml(a.networks?.join(', ') || '')}" onchange="tbSetOspfAreaNetworks(${i},this.value)" placeholder="192.168.1.0/24, 10.0.0.0/30" style="flex:1;font-size:10px">
      <button onclick="tbRemoveOspfArea(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:12px">✕</button>
    </div>`).join('');
    // Discover OSPF neighbors from cables
    const neighbors = [];
    if (ospf.enabled) {
      tbState.cables.filter(c => c.from === dev.id || c.to === dev.id).forEach(c => {
        const peerId = c.from === dev.id ? c.to : c.from;
        const peer = tbState.devices.find(d => d.id === peerId);
        if (peer && peer.ospfConfig && peer.ospfConfig.enabled) {
          const peerIp = peer.interfaces.find(i => i.ip)?.ip || '?';
          neighbors.push(`${peer.hostname} (${peerIp}) — ${peer.ospfConfig.routerId || 'no RID'}`);
        }
      });
    }
    const neighborHtml = neighbors.length ? neighbors.map(n => `<div style="font-size:10px;color:#22c55e">● ${n}</div>`).join('') : '<div style="font-size:10px;color:#64748b">No OSPF neighbors discovered.</div>';
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">OSPF Configuration</div>
      <label><input type="checkbox" ${ospf.enabled?'checked':''} onchange="tbSetOspfField('enabled',this.checked)"> Enable OSPF</label>
      <label>Router ID</label>
      <input type="text" value="${escHtml(ospf.routerId)}" onchange="tbSetOspfField('routerId',this.value)" placeholder="1.1.1.1" style="width:100%">
      <div style="font-size:10px;color:#64748b;margin:2px 0">Unique ID for this router in the OSPF domain. Usually the highest loopback IP.</div>
      <div style="margin-top:10px;font-weight:600;font-size:11px">Areas</div>
      ${areaRows || '<div style="font-size:10px;color:#64748b">No areas configured.</div>'}
      <button class="btn btn-ghost" onclick="tbAddOspfArea()" style="font-size:10px;margin-top:4px">+ Add Area</button>
      <div style="margin-top:12px;font-weight:600;font-size:11px">Discovered Neighbors</div>
      ${neighborHtml}
      <div style="font-size:10px;color:#64748b;margin-top:8px">OSPF uses Dijkstra\'s SPF algorithm to find shortest paths. Area 0 is the backbone — all other areas must connect to it.</div>`;
  }
  function tbSetOspfField(field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.ospfConfig) dev.ospfConfig = { routerId: '', areas: [], enabled: false };
    dev.ospfConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('ospf');
  }
  function tbAddOspfArea() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.ospfConfig) dev.ospfConfig = { routerId: '', areas: [], enabled: false };
    const nextId = dev.ospfConfig.areas.length === 0 ? 0 : Math.max(...dev.ospfConfig.areas.map(a => a.id)) + 1;
    dev.ospfConfig.areas.push({ id: nextId, networks: [] }); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('ospf');
  }
  function tbRemoveOspfArea(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.ospfConfig) return; dev.ospfConfig.areas.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('ospf');
  }
  function tbSetOspfAreaNetworks(idx, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.ospfConfig?.areas?.[idx]) return;
    dev.ospfConfig.areas[idx].networks = value.split(',').map(s => s.trim()).filter(Boolean);
    tbState.updated = Date.now(); tbSaveDraft();
  }
  
  // ── QoS Tab ──
  function tbRenderQosTab(dev) {
    const qos = dev.qosConfig || { enabled: false, policies: [] };
    if (!dev.qosConfig) { dev.qosConfig = qos; }
    const policyRows = qos.policies.map((p, i) => `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:10px">
      <div style="display:flex;gap:6px;align-items:center">
        <input type="text" value="${escHtml(p.name||'')}" onchange="tbSetQosPolicy(${i},'name',this.value)" placeholder="Policy name" style="flex:1;font-size:10px">
        <select onchange="tbSetQosPolicy(${i},'dscp',this.value)" style="font-size:10px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:3px;padding:2px">
          ${['default','af11','af21','af31','af41','ef','cs1','cs2','cs3','cs4','cs5','cs6','cs7'].map(d => `<option value="${d}"${d===p.dscp?' selected':''}>${d.toUpperCase()}</option>`).join('')}
        </select>
        <select onchange="tbSetQosPolicy(${i},'queue',this.value)" style="font-size:10px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:3px;padding:2px">
          ${['best-effort','priority','bandwidth','fair'].map(q => `<option value="${q}"${q===p.queue?' selected':''}>${q}</option>`).join('')}
        </select>
        <button onclick="tbRemoveQosPolicy(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer">✕</button>
      </div>
      <div style="margin-top:2px;color:#64748b">Match: ${escHtml(p.match||'any')} → DSCP ${(p.dscp||'default').toUpperCase()} → ${p.queue||'best-effort'} queue</div>
    </div>`).join('');
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">Quality of Service</div>
      <label><input type="checkbox" ${qos.enabled?'checked':''} onchange="tbSetQosField('enabled',this.checked)"> Enable QoS</label>
      <div style="font-size:10px;color:#64748b;margin:4px 0">DSCP markings prioritize traffic. EF (Expedited Forwarding) = voice. AF (Assured Forwarding) = data classes. CS = backward-compatible with IP Precedence.</div>
      <div style="margin-top:10px;font-weight:600;font-size:11px">Policies</div>
      ${policyRows || '<div style="font-size:10px;color:#64748b">No QoS policies.</div>'}
      <button class="btn btn-ghost" onclick="tbAddQosPolicy()" style="font-size:10px;margin-top:4px">+ Add Policy</button>
      <div style="font-size:10px;color:#64748b;margin-top:10px"><strong>Queue types:</strong> Priority (strict, for voice/video), Bandwidth (guaranteed %), Fair (WFQ, equal sharing), Best-effort (default, no guarantees).</div>`;
  }
  function tbSetQosField(field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.qosConfig) dev.qosConfig = { enabled: false, policies: [] };
    dev.qosConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('qos');
  }
  function tbAddQosPolicy() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.qosConfig) dev.qosConfig = { enabled: false, policies: [] };
    dev.qosConfig.policies.push({ name: '', dscp: 'default', queue: 'best-effort', match: 'any' });
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('qos');
  }
  function tbRemoveQosPolicy(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.qosConfig) return; dev.qosConfig.policies.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('qos');
  }
  function tbSetQosPolicy(idx, field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.qosConfig?.policies?.[idx]) return; dev.qosConfig.policies[idx][field] = value;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  
  // ── Wireless Tab ──
  function tbRenderWirelessTab(dev) {
    const wc = dev.wirelessConfig || { ssid: '', security: 'wpa3-personal', channel: 'auto', band: '5ghz', txPower: 'auto', mode: '802.11ax' };
    if (!dev.wirelessConfig) { dev.wirelessConfig = wc; }
    const channels24 = ['auto','1','6','11'];
    const channels5 = ['auto','36','40','44','48','149','153','157','161','165'];
    const chList = wc.band === '2.4ghz' ? channels24 : channels5;
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">Wireless Configuration</div>
      <label>SSID</label>
      <input type="text" value="${escHtml(wc.ssid)}" onchange="tbSetWirelessField('ssid',this.value)" placeholder="Corp-WiFi" style="width:100%">
      <label>Security</label>
      <select onchange="tbSetWirelessField('security',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
        ${['open','wep','wpa2-personal','wpa2-enterprise','wpa3-personal','wpa3-enterprise'].map(s => `<option value="${s}"${s===wc.security?' selected':''}>${s.toUpperCase()}</option>`).join('')}
      </select>
      <label>802.11 Mode</label>
      <select onchange="tbSetWirelessField('mode',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
        ${['802.11a','802.11b','802.11g','802.11n','802.11ac','802.11ax'].map(m => `<option value="${m}"${m===wc.mode?' selected':''}>${m} ${m==='802.11ax'?'(Wi-Fi 6)':m==='802.11ac'?'(Wi-Fi 5)':''}</option>`).join('')}
      </select>
      <label>Band</label>
      <select onchange="tbSetWirelessField('band',this.value);tbSwitchConfigTab('wireless')" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
        ${['2.4ghz','5ghz','6ghz'].map(b => `<option value="${b}"${b===wc.band?' selected':''}>${b}</option>`).join('')}
      </select>
      <label>Channel</label>
      <select onchange="tbSetWirelessField('channel',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
        ${chList.map(c => `<option value="${c}"${c===wc.channel?' selected':''}>${c}</option>`).join('')}
      </select>
      <label>TX Power</label>
      <select onchange="tbSetWirelessField('txPower',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
        ${['auto','high','medium','low'].map(p => `<option value="${p}"${p===wc.txPower?' selected':''}>${p}</option>`).join('')}
      </select>
      <div style="font-size:10px;color:#64748b;margin-top:10px"><strong>2.4 GHz non-overlapping:</strong> 1, 6, 11. <strong>5 GHz UNII-1:</strong> 36, 40, 44, 48. <strong>DFS channels:</strong> 52-144 (radar detection required). <strong>WPA3-Enterprise</strong> uses 192-bit security with CNSA suite.</div>`;
  }
  function tbSetWirelessField(field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.wirelessConfig) dev.wirelessConfig = { ssid: '', security: 'wpa3-personal', channel: 'auto', band: '5ghz', txPower: 'auto', mode: '802.11ax' };
    dev.wirelessConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft();
  }
  
  // ── DNS Tab ──
  function tbRenderDnsTab(dev) {
    const records = dev.dnsRecords || [];
    const recordRows = records.map((r, i) => `<div style="display:flex;gap:4px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:10px">
      <select onchange="tbSetDnsRecord(${i},'type',this.value)" style="width:55px;font-size:10px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:3px;padding:1px">
        ${['A','AAAA','CNAME','MX','PTR','NS','SOA','TXT','SRV','CAA'].map(t => `<option value="${t}"${t===r.type?' selected':''}>${t}</option>`).join('')}
      </select>
      <input type="text" value="${escHtml(r.name||'')}" onchange="tbSetDnsRecord(${i},'name',this.value)" placeholder="hostname" style="flex:1;font-size:10px">
      <input type="text" value="${escHtml(r.value||'')}" onchange="tbSetDnsRecord(${i},'value',this.value)" placeholder="${r.type==='MX'?'10 mail.example.com':r.type==='SRV'?'10 5 5060 sip.example.com':'value'}" style="flex:1.5;font-size:10px">
      <input type="number" value="${r.ttl||3600}" onchange="tbSetDnsRecord(${i},'ttl',parseInt(this.value))" style="width:50px;font-size:10px" title="TTL (seconds)">
      <button onclick="tbRemoveDnsRecord(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:11px">✕</button>
    </div>`).join('');
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">DNS Records</div>
      <div style="font-size:10px;color:#64748b;margin-bottom:8px">Configure DNS zone records. Each record maps a name to a value with a TTL (Time To Live).</div>
      <div style="display:flex;gap:4px;padding:3px 0;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px">
        <span style="width:55px">Type</span><span style="flex:1">Name</span><span style="flex:1.5">Value</span><span style="width:50px">TTL</span><span style="width:16px"></span>
      </div>
      ${recordRows || '<div style="font-size:10px;color:#64748b;padding:4px 0">No DNS records. Click + to add.</div>'}
      <button class="btn btn-ghost" onclick="tbAddDnsRecord()" style="font-size:10px;margin-top:6px">+ Add Record</button>
      <div style="margin-top:12px;font-size:10px;color:#64748b;line-height:1.5">
        <strong>Record types:</strong><br>
        <strong>A</strong> — Maps hostname → IPv4 address<br>
        <strong>AAAA</strong> — Maps hostname → IPv6 address<br>
        <strong>CNAME</strong> — Alias → canonical name (cannot coexist with other records for same name)<br>
        <strong>MX</strong> — Mail exchange (priority + mail server hostname)<br>
        <strong>PTR</strong> — Reverse lookup (IP → hostname, in in-addr.arpa zone)<br>
        <strong>NS</strong> — Authoritative nameserver for this zone<br>
        <strong>SOA</strong> — Start of Authority (primary NS, admin email, serial, refresh/retry/expire/min-TTL)<br>
        <strong>TXT</strong> — Arbitrary text (SPF, DKIM, DMARC, domain verification)<br>
        <strong>SRV</strong> — Service locator (priority weight port target) for SIP, LDAP, etc.<br>
        <strong>CAA</strong> — Certificate Authority Authorization (controls which CAs can issue certs)
      </div>
      <div style="margin-top:12px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
        <div style="font-weight:600;font-size:11px;margin-bottom:6px;color:#38bdf8">🔒 DNSSEC</div>
        <label><input type="checkbox" ${dev.dnssecEnabled?'checked':''} onchange="tbToggleDnssec(this.checked)"> Enable DNSSEC</label>
        <div style="font-size:10px;color:#64748b;margin-top:4px">Adds DNSKEY, RRSIG, and DS records to establish a chain of trust. Prevents DNS cache poisoning by cryptographically signing zone records.</div>
        ${dev.dnssecEnabled ? '<div style="font-size:10px;color:#22c55e;margin-top:4px">✓ DNSSEC active — use <code>dig +dnssec</code> in CLI to validate chain of trust.</div>' : ''}
      </div>`;
  }
  function tbAddDnsRecord() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.dnsRecords) dev.dnsRecords = [];
    dev.dnsRecords.push({ type: 'A', name: '', value: '', ttl: 3600 });
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('dns');
  }
  function tbRemoveDnsRecord(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.dnsRecords) return; dev.dnsRecords.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('dns');
  }
  function tbSetDnsRecord(idx, field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.dnsRecords?.[idx]) return; dev.dnsRecords[idx][field] = value;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  
  // ── BGP Tab ──
  function tbRenderBgpTab(dev) {
    const bgp = dev.bgpConfig || { asn: '', routerId: '', neighbors: [], networks: [], enabled: false };
    if (!dev.bgpConfig) { dev.bgpConfig = bgp; }
    const neighborRows = bgp.neighbors.map((n, i) => `<div style="display:flex;gap:4px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:10px">
      <input type="text" value="${escHtml(n.ip||'')}" onchange="tbSetBgpNeighbor(${i},'ip',this.value)" placeholder="Neighbor IP" style="flex:1;font-size:10px">
      <input type="number" value="${n.remoteAs||''}" onchange="tbSetBgpNeighbor(${i},'remoteAs',parseInt(this.value))" placeholder="Remote AS" style="width:65px;font-size:10px">
      <select onchange="tbSetBgpNeighbor(${i},'type',this.value)" style="width:55px;font-size:10px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:3px;padding:1px">
        <option value="ebgp"${n.type==='ebgp'?' selected':''}>eBGP</option><option value="ibgp"${n.type==='ibgp'?' selected':''}>iBGP</option>
      </select>
      <span style="color:${n.state==='Established'?'#22c55e':'#facc15'};font-size:9px">${n.state||'Idle'}</span>
      <button onclick="tbRemoveBgpNeighbor(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:11px">✕</button>
    </div>`).join('');
    const netRows = bgp.networks.map((net, i) => `<div style="display:flex;gap:4px;align-items:center;padding:2px 0;font-size:10px">
      <input type="text" value="${escHtml(net)}" onchange="tbSetBgpNetwork(${i},this.value)" placeholder="192.168.1.0/24" style="flex:1;font-size:10px">
      <button onclick="tbRemoveBgpNetwork(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:11px">✕</button>
    </div>`).join('');
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">BGP Configuration</div>
      <label><input type="checkbox" ${bgp.enabled?'checked':''} onchange="tbSetBgpField('enabled',this.checked)"> Enable BGP</label>
      <label>Local ASN</label>
      <input type="number" value="${bgp.asn||''}" onchange="tbSetBgpField('asn',parseInt(this.value))" placeholder="65001" style="width:100%">
      <label>Router ID</label>
      <input type="text" value="${escHtml(bgp.routerId||'')}" onchange="tbSetBgpField('routerId',this.value)" placeholder="1.1.1.1" style="width:100%">
      <div style="font-weight:600;font-size:11px;margin-top:12px;margin-bottom:4px">Neighbors</div>
      ${neighborRows || '<div style="font-size:10px;color:#64748b">No neighbors configured.</div>'}
      <button class="btn btn-ghost" onclick="tbAddBgpNeighbor()" style="font-size:10px;margin-top:4px">+ Add Neighbor</button>
      <div style="font-weight:600;font-size:11px;margin-top:12px;margin-bottom:4px">Advertised Networks</div>
      ${netRows || '<div style="font-size:10px;color:#64748b">No networks advertised.</div>'}
      <button class="btn btn-ghost" onclick="tbAddBgpNetwork()" style="font-size:10px;margin-top:4px">+ Add Network</button>
      <button class="btn btn-ghost" onclick="tbNegotiateBgp()" style="font-size:10px;margin-top:10px;color:#22c55e;border-color:#22c55e">▶ Negotiate Peers</button>
      <div style="font-size:10px;color:#64748b;margin-top:10px;line-height:1.5">
        <strong>BGP (Border Gateway Protocol)</strong> — the routing protocol of the Internet (AS-to-AS). <strong>eBGP</strong> peers between different ASNs (TTL=1). <strong>iBGP</strong> peers within the same ASN (requires full mesh or route reflectors). Uses TCP port 179. Path attributes: AS_PATH, NEXT_HOP, LOCAL_PREF, MED.
      </div>`;
  }
  function tbSetBgpField(field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.bgpConfig) dev.bgpConfig = { asn: '', routerId: '', neighbors: [], networks: [], enabled: false };
    dev.bgpConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft();
  }
  function tbAddBgpNeighbor() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.bgpConfig) dev.bgpConfig = { asn: '', routerId: '', neighbors: [], networks: [], enabled: false };
    dev.bgpConfig.neighbors.push({ ip: '', remoteAs: '', type: 'ebgp', state: 'Idle' });
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('bgp');
  }
  function tbRemoveBgpNeighbor(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.bgpConfig) return; dev.bgpConfig.neighbors.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('bgp');
  }
  function tbSetBgpNeighbor(idx, field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.bgpConfig?.neighbors?.[idx]) return; dev.bgpConfig.neighbors[idx][field] = value;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  function tbAddBgpNetwork() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.bgpConfig) dev.bgpConfig = { asn: '', routerId: '', neighbors: [], networks: [], enabled: false };
    dev.bgpConfig.networks.push('');
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('bgp');
  }
  function tbRemoveBgpNetwork(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.bgpConfig) return; dev.bgpConfig.networks.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('bgp');
  }
  function tbSetBgpNetwork(idx, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.bgpConfig?.networks) return; dev.bgpConfig.networks[idx] = value;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  function tbNegotiateBgp() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.bgpConfig?.enabled) { showErrorToast('Enable BGP first.'); return; }
    if (!dev.bgpConfig.asn) { showErrorToast('Set a local ASN first.'); return; }
    let established = 0;
    dev.bgpConfig.neighbors.forEach(n => {
      // Find peer device by neighbor IP
      const peerDev = tbState.devices.find(pd => pd.id !== dev.id && pd.interfaces.some(i => i.ip === n.ip));
      if (!peerDev?.bgpConfig?.enabled) { n.state = 'Active'; return; }
      // Check AS match
      const isEbgp = n.type === 'ebgp';
      if (isEbgp && peerDev.bgpConfig.asn === dev.bgpConfig.asn) { n.state = 'Idle (same ASN for eBGP)'; return; }
      if (!isEbgp && peerDev.bgpConfig.asn !== dev.bgpConfig.asn) { n.state = 'Idle (diff ASN for iBGP)'; return; }
      // Check reciprocal neighbor
      const myIps = dev.interfaces.filter(i => i.ip).map(i => i.ip);
      const reciprocal = peerDev.bgpConfig.neighbors.find(pn => myIps.includes(pn.ip));
      if (!reciprocal) { n.state = 'Active (no reciprocal)'; return; }
      // Establish
      n.state = 'Established';
      reciprocal.state = 'Established';
      established++;
      // Exchange routes
      const peerRoutes = (peerDev.bgpConfig.networks || []).map(net => {
        const parts = net.split('/');
        return { type: 'bgp', network: parts[0], mask: parts[1] ? tbCidrToMask(parseInt(parts[1])) : '255.255.255.0', nextHop: n.ip, iface: '', asPath: String(peerDev.bgpConfig.asn) };
      });
      peerRoutes.forEach(pr => {
        if (!dev.routingTable.find(r => r.network === pr.network && r.type === 'bgp')) dev.routingTable.push(pr);
      });
      // Animate
      const path = [dev.id, peerDev.id];
      tbAnimatePacket(path, '#818cf8', 'BGP UPDATE');
    });
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('bgp');
    showErrorToast(established ? `BGP: ${established} peer(s) established!` : 'BGP: No peers could be established. Check neighbor IPs and ASNs.');
  }
  function tbCidrToMask(cidr) {
    const mask = [0, 0, 0, 0];
    for (let i = 0; i < cidr; i++) mask[Math.floor(i / 8)] += 1 << (7 - (i % 8));
    return mask.join('.');
  }
  
  // ── EIGRP Tab ──
  function tbRenderEigrpTab(dev) {
    const eigrp = dev.eigrpConfig || { asn: '', networks: [], enabled: false, kValues: { k1: 1, k2: 0, k3: 1, k4: 0, k5: 0 } };
    if (!dev.eigrpConfig) { dev.eigrpConfig = eigrp; }
    const netRows = eigrp.networks.map((net, i) => `<div style="display:flex;gap:4px;align-items:center;padding:2px 0;font-size:10px">
      <input type="text" value="${escHtml(net.network||'')}" onchange="tbSetEigrpNetwork(${i},'network',this.value)" placeholder="192.168.1.0" style="flex:1;font-size:10px">
      <input type="text" value="${escHtml(net.wildcard||'')}" onchange="tbSetEigrpNetwork(${i},'wildcard',this.value)" placeholder="0.0.0.255" style="flex:1;font-size:10px">
      <button onclick="tbRemoveEigrpNetwork(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:11px">✕</button>
    </div>`).join('');
    // Find EIGRP neighbors
    const neighbors = [];
    if (eigrp.enabled) {
      tbState.cables.filter(c => c.from === dev.id || c.to === dev.id).forEach(c => {
        const peerId = c.from === dev.id ? c.to : c.from;
        const peer = tbState.devices.find(d => d.id === peerId);
        if (peer?.eigrpConfig?.enabled && peer.eigrpConfig.asn === eigrp.asn) {
          const peerIp = peer.interfaces.find(i => i.ip)?.ip || '?';
          neighbors.push({ hostname: peer.hostname, ip: peerIp });
        }
      });
    }
    const neighborList = neighbors.length ? neighbors.map(n =>
      `<div style="font-size:10px;padding:2px 0">${n.hostname} — ${n.ip} <span style="color:#22c55e">●</span></div>`
    ).join('') : '<div style="font-size:10px;color:#64748b">No EIGRP neighbors found.</div>';
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">EIGRP Configuration</div>
      <label><input type="checkbox" ${eigrp.enabled?'checked':''} onchange="tbSetEigrpField('enabled',this.checked)"> Enable EIGRP</label>
      <label>EIGRP AS Number</label>
      <input type="number" value="${eigrp.asn||''}" onchange="tbSetEigrpField('asn',parseInt(this.value))" placeholder="100" style="width:100%">
      <div style="font-weight:600;font-size:11px;margin-top:12px;margin-bottom:4px">Networks</div>
      <div style="display:flex;gap:4px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;padding-bottom:2px">
        <span style="flex:1">Network</span><span style="flex:1">Wildcard</span><span style="width:16px"></span>
      </div>
      ${netRows || '<div style="font-size:10px;color:#64748b">No networks configured.</div>'}
      <button class="btn btn-ghost" onclick="tbAddEigrpNetwork()" style="font-size:10px;margin-top:4px">+ Add Network</button>
      <div style="font-weight:600;font-size:11px;margin-top:12px;margin-bottom:4px">Neighbors</div>
      ${neighborList}
      <div style="font-size:10px;color:#64748b;margin-top:10px;line-height:1.5">
        <strong>EIGRP (Enhanced Interior Gateway Routing Protocol)</strong> — Cisco's advanced distance-vector (hybrid) protocol. Uses DUAL algorithm for loop-free paths. Composite metric: bandwidth + delay (K1, K3 by default). Supports unequal-cost load balancing with variance. Multicast: 224.0.0.10, protocol 88.
      </div>`;
  }
  function tbSetEigrpField(field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.eigrpConfig) dev.eigrpConfig = { asn: '', networks: [], enabled: false, kValues: { k1: 1, k2: 0, k3: 1, k4: 0, k5: 0 } };
    dev.eigrpConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft();
  }
  function tbAddEigrpNetwork() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; if (!dev.eigrpConfig) dev.eigrpConfig = { asn: '', networks: [], enabled: false, kValues: { k1: 1, k2: 0, k3: 1, k4: 0, k5: 0 } };
    dev.eigrpConfig.networks.push({ network: '', wildcard: '0.0.0.255' });
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('eigrp');
  }
  function tbRemoveEigrpNetwork(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.eigrpConfig) return; dev.eigrpConfig.networks.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('eigrp');
  }
  function tbSetEigrpNetwork(idx, field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev?.eigrpConfig?.networks?.[idx]) return; dev.eigrpConfig.networks[idx][field] = value;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  
  // ── Attack Scenarios Tab ──
  function tbRenderAttackTab(dev) {
    const isSwitch = dev.type.indexOf('switch') >= 0;
    const snooping = dev.dhcpSnooping || { enabled: false, trustedPorts: [] };
    const dai = dev.daiEnabled || false;
    const ps = dev.portSecurity || { enabled: false, maxMac: 1, violation: 'shutdown' };
    const trustedPortOpts = dev.interfaces.map(ifc => {
      const isTrusted = snooping.trustedPorts.includes(ifc.name);
      return `<label style="font-size:10px;display:block"><input type="checkbox" ${isTrusted?'checked':''} onchange="tbToggleSnoopingTrust('${ifc.name}',this.checked)"> ${ifc.name}</label>`;
    }).join('');
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">Security & Attack Defense</div>
      ${isSwitch ? `
      <div style="border:1px solid rgba(34,197,94,.3);border-radius:8px;padding:8px;margin-bottom:10px">
        <div style="font-weight:600;font-size:11px;color:#22c55e;margin-bottom:6px">DHCP Snooping</div>
        <label><input type="checkbox" ${snooping.enabled?'checked':''} onchange="tbSetDhcpSnooping('enabled',this.checked)"> Enable DHCP Snooping</label>
        <div style="font-size:10px;color:#64748b;margin:4px 0">Trusted Ports (uplinks to legitimate DHCP server):</div>
        ${trustedPortOpts}
      </div>
      <div style="border:1px solid rgba(250,204,21,.3);border-radius:8px;padding:8px;margin-bottom:10px">
        <div style="font-weight:600;font-size:11px;color:#facc15;margin-bottom:6px">Dynamic ARP Inspection (DAI)</div>
        <label><input type="checkbox" ${dai?'checked':''} onchange="tbSetDai(this.checked)"> Enable DAI</label>
        <div style="font-size:10px;color:#64748b;margin-top:4px">Validates ARP packets against DHCP snooping binding table. Prevents ARP spoofing attacks.</div>
      </div>
      <div style="border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:8px;margin-bottom:10px">
        <div style="font-weight:600;font-size:11px;color:#ef4444;margin-bottom:6px">Port Security</div>
        <label><input type="checkbox" ${ps.enabled?'checked':''} onchange="tbSetPortSecurity('enabled',this.checked)"> Enable Port Security</label>
        <label>Max MAC Addresses</label>
        <input type="number" value="${ps.maxMac||1}" min="1" max="10" onchange="tbSetPortSecurity('maxMac',parseInt(this.value))" style="width:60px;font-size:10px">
        <label>Violation Mode</label>
        <select onchange="tbSetPortSecurity('violation',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
          ${['shutdown','restrict','protect'].map(v => `<option value="${v}"${v===ps.violation?' selected':''}>${v.charAt(0).toUpperCase()+v.slice(1)}</option>`).join('')}
        </select>
      </div>` : ''}
      <div style="font-weight:600;font-size:11px;margin-top:8px;margin-bottom:6px">Simulate Attacks</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        <button class="btn btn-ghost" onclick="tbSimArpSpoof()" style="font-size:10px;color:#ef4444;border-color:#ef4444">⚡ ARP Spoof</button>
        <button class="btn btn-ghost" onclick="tbSimVlanHopping()" style="font-size:10px;color:#ef4444;border-color:#ef4444">⚡ VLAN Hop</button>
        <button class="btn btn-ghost" onclick="tbSimRogueDhcp()" style="font-size:10px;color:#ef4444;border-color:#ef4444">⚡ Rogue DHCP</button>
      </div>
      <div style="font-size:10px;color:#64748b;margin-top:10px;line-height:1.5">
        <strong>ARP Spoofing</strong> — attacker sends fake ARP replies to redirect traffic (man-in-the-middle). Defense: DAI.<br>
        <strong>VLAN Hopping</strong> — double-tagging attack to reach VLANs across trunk links. Defense: set native VLAN to unused VLAN, disable DTP.<br>
        <strong>Rogue DHCP</strong> — attacker runs unauthorized DHCP server to poison clients. Defense: DHCP Snooping.
      </div>`;
  }
  function tbSetDhcpSnooping(field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    if (!dev.dhcpSnooping) dev.dhcpSnooping = { enabled: false, trustedPorts: [] };
    dev.dhcpSnooping[field] = value;
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('attack');
  }
  function tbToggleSnoopingTrust(port, checked) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    if (!dev.dhcpSnooping) dev.dhcpSnooping = { enabled: false, trustedPorts: [] };
    if (checked) { if (!dev.dhcpSnooping.trustedPorts.includes(port)) dev.dhcpSnooping.trustedPorts.push(port); }
    else { dev.dhcpSnooping.trustedPorts = dev.dhcpSnooping.trustedPorts.filter(p => p !== port); }
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('attack');
  }
  function tbSetDai(enabled) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return; dev.daiEnabled = enabled;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  function tbSetPortSecurity(field, value) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    if (!dev.portSecurity) dev.portSecurity = { enabled: false, maxMac: 1, violation: 'shutdown' };
    dev.portSecurity[field] = value;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  // Attack simulations
  function tbSimArpSpoof() {
    const switches = tbState.devices.filter(d => d.type.indexOf('switch') >= 0);
    if (!switches.length) { showErrorToast('No switches in topology for ARP spoof demo.'); return; }
    const targetSwitch = switches[0];
    // Check if DAI is enabled on the switch
    if (targetSwitch.daiEnabled) {
      showErrorToast('🛡️ DAI blocked the ARP spoof! Dynamic ARP Inspection validated the ARP packet against the binding table and dropped it.');
      tbAnimatePacket([targetSwitch.id, targetSwitch.id], '#22c55e', 'DAI BLOCK');
      return;
    }
    // Find 2 connected endpoints
    const endpoints = tbState.devices.filter(d => ['pc','server','voip','iot'].includes(d.type));
    if (endpoints.length < 2) { showErrorToast('Need at least 2 endpoints for ARP spoof demo.'); return; }
    showErrorToast('⚡ ARP Spoof attack! Attacker sent fake ARP reply — traffic is being redirected. Enable DAI on the switch to prevent this!');
    tbAnimatePacket([endpoints[0].id, targetSwitch.id, endpoints[1].id], '#ef4444', 'FAKE ARP');
  }
  function tbSimVlanHopping() {
    const switches = tbState.devices.filter(d => d.type.indexOf('switch') >= 0);
    if (!switches.length) { showErrorToast('No switches in topology for VLAN hopping demo.'); return; }
    // Check if port security / trunk config prevents it
    const trunkPorts = switches[0].interfaces.filter(i => i.mode === 'trunk');
    const nativeIsOne = trunkPorts.some(i => (i.vlan || 1) === 1);
    if (!nativeIsOne && trunkPorts.length) {
      showErrorToast('🛡️ VLAN hopping blocked! Native VLAN is not VLAN 1, preventing double-tagging attack.');
      return;
    }
    showErrorToast('⚡ VLAN Hopping! Double-tagged frame crossed trunk boundary. Defense: change native VLAN to unused VLAN, disable DTP.');
    if (switches.length >= 2) tbAnimatePacket([switches[0].id, switches[1].id], '#ef4444', 'DOUBLE TAG');
  }
  function tbSimRogueDhcp() {
    const switches = tbState.devices.filter(d => d.type.indexOf('switch') >= 0);
    if (!switches.length) { showErrorToast('No switches in topology for rogue DHCP demo.'); return; }
    // Check DHCP snooping
    if (switches[0].dhcpSnooping?.enabled) {
      showErrorToast('🛡️ DHCP Snooping blocked the rogue DHCP server! Only trusted ports can send DHCP offers.');
      return;
    }
    const endpoints = tbState.devices.filter(d => ['pc','server'].includes(d.type));
    if (endpoints.length) {
      showErrorToast('⚡ Rogue DHCP server detected! Attacker is handing out malicious gateway/DNS. Enable DHCP Snooping to prevent this!');
      tbAnimatePacket([endpoints[0].id, switches[0].id], '#ef4444', 'ROGUE OFFER');
    }
  }
  
  // ── DNSSEC Functions ──
  function tbToggleDnssec(enabled) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    dev.dnssecEnabled = enabled;
    if (enabled) {
      // Auto-generate DNSKEY and RRSIG records for existing records
      const existing = dev.dnsRecords || [];
      if (!existing.find(r => r.type === 'DNSKEY')) {
        existing.push({ type: 'DNSKEY', name: dev.hostname + '.', value: '257 3 13 <base64-public-key>', ttl: 86400 });
      }
      existing.forEach(r => {
        if (['A','AAAA','MX','CNAME'].includes(r.type) && !existing.find(rr => rr.type === 'RRSIG' && rr.name === r.name)) {
          existing.push({ type: 'RRSIG', name: r.name, value: `${r.type} 13 2 ${r.ttl} <signature>`, ttl: r.ttl });
        }
      });
      if (!existing.find(r => r.type === 'DS')) {
        existing.push({ type: 'DS', name: dev.hostname + '.', value: '12345 13 2 <digest>', ttl: 86400 });
      }
      dev.dnsRecords = existing;
    }
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('dns');
  }
  function tbValidateDnssecChain(queryName) {
    const dnsServers = tbState.devices.filter(d => (d.type === 'dns-server' || d.type === 'server') && d.dnsRecords?.length);
    if (!dnsServers.length) return { valid: false, chain: [], error: 'No DNS servers in topology' };
    const chain = [];
    for (const srv of dnsServers) {
      if (!srv.dnssecEnabled) { chain.push({ server: srv.hostname, status: 'insecure', note: 'DNSSEC not enabled' }); continue; }
      const record = srv.dnsRecords.find(r => r.name === queryName && ['A','AAAA','MX','CNAME'].includes(r.type));
      if (!record) continue;
      const rrsig = srv.dnsRecords.find(r => r.type === 'RRSIG' && r.name === queryName);
      const dnskey = srv.dnsRecords.find(r => r.type === 'DNSKEY');
      const ds = srv.dnsRecords.find(r => r.type === 'DS');
      chain.push({ server: srv.hostname, record: record.type + ' ' + record.value, hasRrsig: !!rrsig, hasDnskey: !!dnskey, hasDs: !!ds, status: (rrsig && dnskey) ? 'secure' : 'bogus' });
      if (rrsig && dnskey) return { valid: true, chain, ad: true };
    }
    return { valid: false, chain, error: 'Chain of trust broken — RRSIG or DNSKEY missing' };
  }
  
  // ── Packet Inspection Panel ──
  function tbShowPacketInspection(packetInfo) {
    const panel = document.getElementById('tb-packet-inspect');
    if (!panel) return;
    const p = packetInfo || {};
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:8px 8px 0 0">
      <span style="font-weight:700;font-size:11px;color:#38bdf8">📦 Packet Inspection</span>
      <button onclick="tbClosePacketInspection()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px">✕</button>
    </div>
    <div style="padding:8px;font-family:monospace;font-size:10px;line-height:1.6">
      <div style="border-left:3px solid #818cf8;padding-left:8px;margin-bottom:6px">
        <div style="font-weight:700;color:#818cf8;font-size:9px;text-transform:uppercase">Layer 2 — Data Link</div>
        <div>Src MAC: <span style="color:#22c55e">${p.srcMac || '??:??:??:??:??:??'}</span></div>
        <div>Dst MAC: <span style="color:#22c55e">${p.dstMac || '??:??:??:??:??:??'}</span></div>
        <div>EtherType: <span style="color:#94a3b8">${p.etherType || '0x0800 (IPv4)'}</span></div>
        ${p.vlanTag ? `<div>802.1Q VLAN: <span style="color:#facc15">${p.vlanTag}</span></div>` : ''}
      </div>
      <div style="border-left:3px solid #22c55e;padding-left:8px;margin-bottom:6px">
        <div style="font-weight:700;color:#22c55e;font-size:9px;text-transform:uppercase">Layer 3 — Network</div>
        <div>Src IP: <span style="color:#22c55e">${p.srcIp || '?.?.?.?'}</span></div>
        <div>Dst IP: <span style="color:#22c55e">${p.dstIp || '?.?.?.?'}</span></div>
        <div>Protocol: <span style="color:#94a3b8">${p.protocol || 'ICMP (1)'}</span></div>
        <div>TTL: <span style="color:#facc15">${p.ttl || 64}</span></div>
      </div>
      <div style="border-left:3px solid #f97316;padding-left:8px">
        <div style="font-weight:700;color:#f97316;font-size:9px;text-transform:uppercase">Layer 4 — Transport</div>
        <div>Src Port: <span style="color:#94a3b8">${p.srcPort || '—'}</span></div>
        <div>Dst Port: <span style="color:#94a3b8">${p.dstPort || '—'}</span></div>
        <div>Flags: <span style="color:#94a3b8">${p.flags || '—'}</span></div>
        ${p.payload ? `<div>Payload: <span style="color:#64748b">${p.payload}</span></div>` : ''}
      </div>
    </div>`;
    panel.classList.remove('is-hidden');
  }
  function tbClosePacketInspection() {
    document.getElementById('tb-packet-inspect')?.classList.add('is-hidden');
  }
  function tbBuildPacketHeaders(srcDev, dstDev, options) {
    const opts = options || {};
    const srcIfc = srcDev.interfaces.find(i => i.ip) || {};
    const dstIfc = dstDev.interfaces.find(i => i.ip) || {};
    return {
      srcMac: srcIfc.mac || tbGenerateMac(srcDev.id, 0),
      dstMac: dstIfc.mac || tbGenerateMac(dstDev.id, 0),
      etherType: opts.etherType || '0x0800 (IPv4)',
      vlanTag: opts.vlan || null,
      srcIp: srcIfc.ip || '0.0.0.0',
      dstIp: dstIfc.ip || '0.0.0.0',
      protocol: opts.protocol || 'ICMP (1)',
      ttl: opts.ttl || 64,
      srcPort: opts.srcPort || '—',
      dstPort: opts.dstPort || '—',
      flags: opts.flags || '—',
      payload: opts.payload || null,
    };
  }
  
  // ── STP Convergence Animation ──
  function tbRunStpConvergence() {
    const switches = tbState.devices.filter(d => d.type.indexOf('switch') >= 0 && d.stpConfig);
    if (switches.length < 2) { showErrorToast('Need at least 2 switches with STP configured.'); return; }
    showErrorToast('STP Convergence: Phase 1 — Electing root bridge...');
    // Step 1: Find root bridge (lowest priority, then lowest MAC)
    const root = tbCalcRootBridge(switches);
    // Step 2: Calculate port roles
    const roles = tbCalcPortRoles(switches, root);
    // Step 3: Animate BPDUs
    let delay = 0;
    switches.forEach(sw => {
      if (sw.id === root.id) {
        sw.stpConfig.isRoot = true;
        setTimeout(() => showErrorToast(`STP: ${sw.hostname} elected ROOT BRIDGE (priority ${sw.stpConfig.priority})`), delay);
        delay += 1500;
      } else {
        sw.stpConfig.isRoot = false;
      }
    });
    // Animate BPDU exchange
    switches.forEach(sw => {
      if (sw.id === root.id) return;
      setTimeout(() => {
        tbAnimatePacket([root.id, sw.id], '#38bdf8', 'BPDU');
      }, delay);
      delay += 800;
    });
    // Step 4: Apply port states with timed transitions
    setTimeout(() => {
      roles.forEach(r => {
        const sw = switches.find(s => s.id === r.deviceId);
        if (sw?.stpConfig) {
          sw.stpConfig.portStates = sw.stpConfig.portStates || {};
          sw.stpConfig.portStates[r.port] = r.role;
        }
      });
      tbState.updated = Date.now(); tbSaveDraft();
      if (tbActiveConfigTab === 'stp') tbSwitchConfigTab('stp');
      showErrorToast(`STP Convergence complete! Root: ${root.hostname}. ${roles.filter(r => r.role === 'blocking').length} port(s) blocking.`);
    }, delay + 1000);
  }
  function tbCalcRootBridge(switches) {
    return switches.reduce((best, sw) => {
      const pri = sw.stpConfig?.priority || 32768;
      const bestPri = best.stpConfig?.priority || 32768;
      if (pri < bestPri) return sw;
      if (pri === bestPri) {
        const mac = sw.interfaces[0]?.mac || 'ff:ff:ff:ff:ff:ff';
        const bestMac = best.interfaces[0]?.mac || 'ff:ff:ff:ff:ff:ff';
        return mac < bestMac ? sw : best;
      }
      return best;
    });
  }
  function tbCalcPortRoles(switches, root) {
    const roles = [];
    switches.forEach(sw => {
      if (sw.id === root.id) {
        // Root bridge: all ports are designated (forwarding)
        sw.interfaces.filter(i => i.cableId).forEach(ifc => {
          roles.push({ deviceId: sw.id, port: ifc.name, role: 'forwarding' });
        });
        return;
      }
      // Non-root: find root port (port closest to root bridge)
      const connectedToRoot = sw.interfaces.filter(i => {
        if (!i.cableId) return false;
        const cable = tbState.cables.find(c => c.id === i.cableId);
        if (!cable) return false;
        const peerId = cable.from === sw.id ? cable.to : cable.from;
        return peerId === root.id;
      });
      let rootPort = connectedToRoot[0];
      if (!rootPort) {
        // Find port on path toward root (2-hop)
        rootPort = sw.interfaces.find(i => {
          if (!i.cableId) return false;
          const cable = tbState.cables.find(c => c.id === i.cableId);
          if (!cable) return false;
          const peerId = cable.from === sw.id ? cable.to : cable.from;
          const peer = tbState.devices.find(d => d.id === peerId);
          return peer && tbState.cables.some(c2 => (c2.from === peerId && c2.to === root.id) || (c2.to === peerId && c2.from === root.id));
        });
      }
      sw.interfaces.filter(i => i.cableId).forEach(ifc => {
        if (ifc === rootPort) {
          roles.push({ deviceId: sw.id, port: ifc.name, role: 'forwarding' }); // Root port
        } else {
          // Check if this is a designated or blocking port
          const cable = tbState.cables.find(c => c.id === ifc.cableId);
          const peerId = cable ? (cable.from === sw.id ? cable.to : cable.from) : null;
          const peer = tbState.devices.find(d => d.id === peerId);
          if (peer?.type?.indexOf('switch') >= 0 && peer.id !== root.id) {
            // Two non-root switches connected — one blocks
            const myPri = sw.stpConfig?.priority || 32768;
            const peerPri = peer?.stpConfig?.priority || 32768;
            roles.push({ deviceId: sw.id, port: ifc.name, role: myPri <= peerPri ? 'forwarding' : 'blocking' });
          } else {
            roles.push({ deviceId: sw.id, port: ifc.name, role: 'forwarding' }); // Designated
          }
        }
      });
    });
    return roles;
  }
  
  // ── QoS Enforcement ──
  function tbQosClassify(dev, packetInfo) {
    if (!dev?.qosConfig?.enabled || !dev.qosConfig.policies?.length) return { queue: 'best-effort', dscp: 'default', policy: null };
    const policies = dev.qosConfig.policies;
    for (const pol of policies) {
      const match = pol.match || 'any';
      if (match === 'any') return { queue: pol.queue || 'best-effort', dscp: pol.dscp || 'default', policy: pol.name };
      // Match on protocol/port
      const parts = match.split(/\s+/);
      const proto = parts[0]?.toLowerCase();
      const port = parts[1];
      if (packetInfo.protocol?.toLowerCase().includes(proto)) return { queue: pol.queue || 'best-effort', dscp: pol.dscp || 'default', policy: pol.name };
      if (port && (packetInfo.dstPort === port || packetInfo.srcPort === port)) return { queue: pol.queue || 'best-effort', dscp: pol.dscp || 'default', policy: pol.name };
    }
    return { queue: 'best-effort', dscp: 'default', policy: null };
  }
  function tbQosEnqueue(classification) {
    // Priority queuing simulation — returns a delay factor
    const queueDelays = { priority: 0, bandwidth: 50, fair: 100, 'best-effort': 200 };
    return queueDelays[classification.queue] || 200;
  }
  
  // ── DHCP Tab ──
  function tbRenderDhcpTab(dev) {
    const pool = dev.dhcpServer;
    if (!pool) {
      return `<div style="color:#64748b;font-size:11px;margin-bottom:8px">No DHCP pool configured.</div>
        <button class="btn btn-ghost" onclick="tbEnableDhcp()" style="font-size:11px">Enable DHCP Server</button>
        ${dev.type === 'router' ? `<div style="margin-top:16px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
          <label>DHCP Relay (ip helper-address)</label>
          <input type="text" value="${escHtml(dev.dhcpRelay?.helperAddress || '')}" onchange="tbSetDhcpRelay(this.value)" placeholder="e.g. 10.0.0.5">
          <div style="font-size:10px;color:#64748b">Forward DHCP Discover to a remote server.</div>
        </div>` : ''}`;
    }
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">DHCP Pool</div>
      <label>Pool Name</label><input type="text" value="${escHtml(pool.name||'')}" onchange="tbSetDhcpField('name',this.value)">
      <label>Network</label><input type="text" value="${escHtml(pool.network||'')}" onchange="tbSetDhcpField('network',this.value)" placeholder="192.168.1.0">
      <label>Mask</label><input type="text" value="${escHtml(pool.mask||'')}" onchange="tbSetDhcpField('mask',this.value)" placeholder="255.255.255.0">
      <label>Default Gateway</label><input type="text" value="${escHtml(pool.gateway||'')}" onchange="tbSetDhcpField('gateway',this.value)">
      <label>Range Start</label><input type="text" value="${escHtml(pool.rangeStart||'')}" onchange="tbSetDhcpField('rangeStart',this.value)" placeholder="192.168.1.100">
      <label>Range End</label><input type="text" value="${escHtml(pool.rangeEnd||'')}" onchange="tbSetDhcpField('rangeEnd',this.value)" placeholder="192.168.1.200">
      <label>DNS Server</label><input type="text" value="${escHtml(pool.dns||'')}" onchange="tbSetDhcpField('dns',this.value)" placeholder="8.8.8.8">
      <button class="btn btn-ghost" onclick="tbDisableDhcp()" style="margin-top:8px;font-size:11px;color:#ef4444">Disable DHCP</button>
      ${dev.type === 'router' ? `<div style="margin-top:12px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
        <label>DHCP Relay (ip helper-address)</label>
        <input type="text" value="${escHtml(dev.dhcpRelay?.helperAddress || '')}" onchange="tbSetDhcpRelay(this.value)" placeholder="e.g. 10.0.0.5">
      </div>` : ''}`;
  }
  
  function tbEnableDhcp() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    dev.dhcpServer = { name: 'POOL1', network: '', mask: '255.255.255.0', gateway: '', rangeStart: '', rangeEnd: '', dns: '8.8.8.8' };
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('dhcp');
  }
  function tbDisableDhcp() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    dev.dhcpServer = null;
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('dhcp');
  }
  function tbSetDhcpField(field, val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.dhcpServer) return;
    dev.dhcpServer[field] = val.trim();
    tbState.updated = Date.now(); tbSaveDraft();
  }
  function tbSetDhcpRelay(val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    dev.dhcpRelay = val.trim() ? { helperAddress: val.trim() } : null;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  
  // ── CLI Tab ──
  let tbCliHistory = [];
  // ══════════════════════════════════════════
  // CLOUD NETWORKING — Security Groups, NACLs, VPC, VPN/IPSec, SASE
  // ══════════════════════════════════════════
  
  function tbRenderSecurityGroupsTab(dev) {
    const sgs = dev.securityGroups || [];
    let html = '<div style="font-weight:600;font-size:12px;margin-bottom:8px">Security Groups <span style="font-weight:400;font-size:10px;color:#64748b">(stateful)</span></div>';
    if (!sgs.length) {
      html += '<div style="color:#64748b;font-size:11px;margin-bottom:8px">No security groups. Traffic is unrestricted.</div>';
    }
    sgs.forEach((sg, si) => {
      html += `<div class="tb-cloud-card">
        <div class="tb-cloud-card-head">
          <input type="text" value="${escHtml(sg.name)}" onchange="tbSetSgField(${si},'name',this.value)" style="flex:1;font-weight:600;font-size:11px;background:transparent;border:none;color:var(--text);padding:0">
          <button class="btn btn-ghost" onclick="tbRemoveSecurityGroup(${si})" style="font-size:10px;color:#ef4444;padding:2px 6px">&times;</button>
        </div>
        <table class="tb-sg-table"><thead><tr><th>Dir</th><th>Proto</th><th>Port</th><th>Source/Dest</th><th></th></tr></thead><tbody>`;
      sg.rules.forEach((r, ri) => {
        html += `<tr class="tb-sg-row-allow">
          <td><select onchange="tbSetSgRuleField(${si},${ri},'direction',this.value)" style="font-size:10px"><option value="inbound"${r.direction==='inbound'?' selected':''}>In</option><option value="outbound"${r.direction==='outbound'?' selected':''}>Out</option></select></td>
          <td><select onchange="tbSetSgRuleField(${si},${ri},'protocol',this.value)" style="font-size:10px"><option value="all"${r.protocol==='all'?' selected':''}>All</option><option value="tcp"${r.protocol==='tcp'?' selected':''}>TCP</option><option value="udp"${r.protocol==='udp'?' selected':''}>UDP</option><option value="icmp"${r.protocol==='icmp'?' selected':''}>ICMP</option></select></td>
          <td><input type="text" value="${escHtml(String(r.port||'all'))}" onchange="tbSetSgRuleField(${si},${ri},'port',this.value)" style="width:40px;font-size:10px"></td>
          <td><input type="text" value="${escHtml(r.source||r.destination||'0.0.0.0/0')}" onchange="tbSetSgRuleField(${si},${ri},'${r.direction==='inbound'?'source':'destination'}',this.value)" style="width:90px;font-size:10px"></td>
          <td><button class="btn btn-ghost" onclick="tbRemoveSgRule(${si},${ri})" style="font-size:9px;color:#ef4444;padding:1px 4px">&times;</button></td>
        </tr>`;
      });
      html += `</tbody></table>
        <div style="display:flex;gap:4px;margin-top:4px">
          <button class="btn btn-ghost" onclick="tbAddSgRule(${si},'inbound')" style="font-size:10px">+ Inbound</button>
          <button class="btn btn-ghost" onclick="tbAddSgRule(${si},'outbound')" style="font-size:10px">+ Outbound</button>
        </div>
      </div>`;
    });
    html += '<button class="btn btn-ghost" onclick="tbAddSecurityGroup()" style="font-size:11px;margin-top:8px">+ Add Security Group</button>';
    html += '<div style="font-size:9px;color:#64748b;margin-top:8px">Security Groups are <strong>stateful</strong> — return traffic is automatically allowed. Rules are allow-only (implicit deny-all).</div>';
    return html;
  }
  
  function tbAddSecurityGroup() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    dev.securityGroups.push({ name: `sg-${dev.securityGroups.length + 1}`, rules: [
      { direction: 'outbound', protocol: 'all', port: 'all', destination: '0.0.0.0/0', action: 'allow' }
    ]});
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('security-groups');
  }
  function tbRemoveSecurityGroup(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    dev.securityGroups.splice(idx, 1);
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('security-groups');
  }
  function tbAddSgRule(sgIdx, direction) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.securityGroups[sgIdx]) return;
    const r = { direction, protocol: 'tcp', port: '443', action: 'allow' };
    if (direction === 'inbound') r.source = '0.0.0.0/0'; else r.destination = '0.0.0.0/0';
    dev.securityGroups[sgIdx].rules.push(r);
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('security-groups');
  }
  function tbRemoveSgRule(sgIdx, ruleIdx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.securityGroups[sgIdx]) return;
    dev.securityGroups[sgIdx].rules.splice(ruleIdx, 1);
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('security-groups');
  }
  function tbSetSgField(sgIdx, field, val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.securityGroups[sgIdx]) return;
    dev.securityGroups[sgIdx][field] = val;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  function tbSetSgRuleField(sgIdx, ruleIdx, field, val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.securityGroups[sgIdx] || !dev.securityGroups[sgIdx].rules[ruleIdx]) return;
    dev.securityGroups[sgIdx].rules[ruleIdx][field] = val;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  
  // ── NACLs Tab (stateless, subnet-level) ──
  function tbRenderNaclsTab(dev) {
    const nacls = dev.nacls || [];
    let html = '<div style="font-weight:600;font-size:12px;margin-bottom:8px">Network ACLs <span style="font-weight:400;font-size:10px;color:#64748b">(stateless)</span></div>';
  
    ['inbound', 'outbound'].forEach(dir => {
      const rules = nacls.filter(r => r.direction === dir).sort((a, b) => a.ruleNumber - b.ruleNumber);
      html += `<div style="font-weight:600;font-size:11px;margin:12px 0 4px;text-transform:capitalize">${dir} Rules</div>
        <table class="tb-sg-table"><thead><tr><th>#</th><th>Proto</th><th>Port</th><th>${dir === 'inbound' ? 'Source' : 'Dest'}</th><th>Action</th><th></th></tr></thead><tbody>`;
      rules.forEach((r, ri) => {
        const realIdx = nacls.indexOf(r);
        html += `<tr class="${r.action === 'allow' ? 'tb-sg-row-allow' : 'tb-nacl-row-deny'}">
          <td><input type="number" value="${r.ruleNumber}" onchange="tbSetNaclField(${realIdx},'ruleNumber',parseInt(this.value))" style="width:40px;font-size:10px"></td>
          <td><select onchange="tbSetNaclField(${realIdx},'protocol',this.value)" style="font-size:10px"><option value="all"${r.protocol==='all'?' selected':''}>All</option><option value="tcp"${r.protocol==='tcp'?' selected':''}>TCP</option><option value="udp"${r.protocol==='udp'?' selected':''}>UDP</option><option value="icmp"${r.protocol==='icmp'?' selected':''}>ICMP</option></select></td>
          <td><input type="text" value="${escHtml(String(r.port||'all'))}" onchange="tbSetNaclField(${realIdx},'port',this.value)" style="width:40px;font-size:10px"></td>
          <td><input type="text" value="${escHtml(r.source||r.destination||'0.0.0.0/0')}" onchange="tbSetNaclField(${realIdx},'${dir === 'inbound' ? 'source' : 'destination'}',this.value)" style="width:80px;font-size:10px"></td>
          <td><select onchange="tbSetNaclField(${realIdx},'action',this.value)" style="font-size:10px"><option value="allow"${r.action==='allow'?' selected':''}>Allow</option><option value="deny"${r.action==='deny'?' selected':''}>Deny</option></select></td>
          <td><button class="btn btn-ghost" onclick="tbRemoveNaclRule(${realIdx})" style="font-size:9px;color:#ef4444;padding:1px 4px">&times;</button></td>
        </tr>`;
      });
      // Implicit deny-all row (not editable)
      html += `<tr style="opacity:.4"><td>*</td><td>All</td><td>All</td><td>0.0.0.0/0</td><td>Deny</td><td></td></tr>`;
      html += `</tbody></table>
        <button class="btn btn-ghost" onclick="tbAddNaclRule('${dir}')" style="font-size:10px;margin-top:4px">+ Add ${dir} rule</button>`;
    });
    html += '<div style="font-size:9px;color:#64748b;margin-top:8px">NACLs are <strong>stateless</strong> — both inbound and outbound rules are evaluated independently. Rules are processed in order by rule number (lowest first, first match wins).</div>';
    return html;
  }
  
  function tbAddNaclRule(direction) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    const existing = dev.nacls.filter(r => r.direction === direction);
    const nextNum = existing.length ? Math.max(...existing.map(r => r.ruleNumber)) + 100 : 100;
    const r = { ruleNumber: nextNum, direction, protocol: 'tcp', port: '443', action: 'allow' };
    if (direction === 'inbound') r.source = '0.0.0.0/0'; else r.destination = '0.0.0.0/0';
    dev.nacls.push(r);
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('nacls');
  }
  function tbRemoveNaclRule(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    dev.nacls.splice(idx, 1);
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('nacls');
  }
  function tbSetNaclField(idx, field, val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.nacls[idx]) return;
    dev.nacls[idx][field] = val;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  
  // ── VPC Config Tab ──
  function tbRenderVpcConfigTab(dev) {
    const vpc = dev.vpcConfig || { cidr: '10.0.0.0/16', dnsSupport: true, dnsHostnames: true, flowLogs: false, tenancy: 'default', peerings: [] };
    if (!dev.vpcConfig) { dev.vpcConfig = vpc; tbState.updated = Date.now(); tbSaveDraft(); }
    if (!vpc.peerings) vpc.peerings = [];
    // Find other VPCs for peering
    const otherVpcs = tbState.devices.filter(d => d.type === 'vpc' && d.id !== dev.id);
    const peerHtml = vpc.peerings.map((p, i) => {
      const peerDev = tbState.devices.find(d => d.id === p.peerId);
      const statusDot = p.status === 'active' ? '#22c55e' : '#eab308';
      return `<div class="tb-cloud-card" style="padding:6px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusDot}"></span>
          <span style="flex:1;font-size:11px;font-weight:600">${peerDev ? escHtml(peerDev.hostname) : 'Unknown'} ${peerDev?.vpcConfig ? '(' + peerDev.vpcConfig.cidr + ')' : ''}</span>
          <span style="font-size:9px;color:#64748b">${p.status}</span>
          <button class="btn btn-ghost" onclick="tbRemoveVpcPeering(${i})" style="font-size:9px;color:#ef4444;padding:1px 4px">&times;</button>
        </div>
      </div>`;
    }).join('');
    const peerOptions = otherVpcs.filter(v => !vpc.peerings.some(p => p.peerId === v.id))
      .map(v => `<option value="${v.id}">${escHtml(v.hostname)} ${v.vpcConfig ? '(' + v.vpcConfig.cidr + ')' : ''}</option>`).join('');
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">VPC Configuration</div>
      <label>CIDR Block</label>
      <input type="text" value="${escHtml(vpc.cidr)}" onchange="tbSetVpcField('cidr',this.value)" placeholder="10.0.0.0/16">
      <div style="font-size:9px;color:#64748b;margin-bottom:8px">/16 = 65,536 IPs &middot; /24 = 256 IPs &middot; /28 = 16 IPs</div>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" ${vpc.dnsSupport ? 'checked' : ''} onchange="tbSetVpcField('dnsSupport',this.checked)"> DNS Resolution Support</label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" ${vpc.dnsHostnames ? 'checked' : ''} onchange="tbSetVpcField('dnsHostnames',this.checked)"> DNS Hostnames</label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" ${vpc.flowLogs ? 'checked' : ''} onchange="tbSetVpcField('flowLogs',this.checked)"> VPC Flow Logs</label>
      <label>Tenancy</label>
      <select onchange="tbSetVpcField('tenancy',this.value)">
        <option value="default"${vpc.tenancy==='default' ? ' selected' : ''}>Default (shared)</option>
        <option value="dedicated"${vpc.tenancy==='dedicated' ? ' selected' : ''}>Dedicated</option>
      </select>
      <div style="margin-top:16px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
        <div style="font-weight:600;font-size:11px;margin-bottom:6px">VPC Peering Connections</div>
        ${peerHtml || '<div style="font-size:10px;color:#64748b;margin-bottom:6px">No peering connections.</div>'}
        ${peerOptions ? `<div style="display:flex;gap:4px;margin-top:6px">
          <select id="tb-vpc-peer-select" style="flex:1;font-size:10px"><option value="">Select VPC to peer with…</option>${peerOptions}</select>
          <button class="btn btn-ghost" onclick="tbAddVpcPeering()" style="font-size:10px">+ Peer</button>
        </div>` : '<div style="font-size:10px;color:#64748b">No other VPCs available for peering.</div>'}
        <div style="font-size:9px;color:#64748b;margin-top:4px">VPC Peering allows direct routing between VPCs without a Transit Gateway. Non-transitive — each pair must be peered individually.</div>
      </div>
      <div style="margin-top:12px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
        <div style="font-weight:600;font-size:11px;margin-bottom:6px">Connected Subnets</div>
        ${tbState.devices.filter(d => d.type === 'cloud-subnet' && tbState.cables.some(c => (c.from === dev.id && c.to === d.id) || (c.from === d.id && c.to === dev.id)))
          .map(s => `<div class="tb-cloud-badge">${escHtml(s.hostname)} ${s.vpcConfig ? '(' + s.vpcConfig.cidr + ')' : ''}</div>`).join('') || '<div style="font-size:10px;color:#64748b">No subnets connected. Wire a Cloud Subnet to this VPC.</div>'}
      </div>`;
  }
  function tbSetVpcField(field, val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    if (!dev.vpcConfig) dev.vpcConfig = { cidr: '10.0.0.0/16', dnsSupport: true, dnsHostnames: true, flowLogs: false, tenancy: 'default', peerings: [] };
    dev.vpcConfig[field] = val;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  function tbAddVpcPeering() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.vpcConfig) return;
    const sel = document.getElementById('tb-vpc-peer-select');
    if (!sel || !sel.value) return;
    const peerId = sel.value;
    const peerDev = tbState.devices.find(d => d.id === peerId);
    if (!peerDev) return;
    if (!dev.vpcConfig.peerings) dev.vpcConfig.peerings = [];
    if (!peerDev.vpcConfig) peerDev.vpcConfig = { cidr: '10.1.0.0/16', dnsSupport: true, dnsHostnames: true, flowLogs: false, tenancy: 'default', peerings: [] };
    if (!peerDev.vpcConfig.peerings) peerDev.vpcConfig.peerings = [];
    // Add peering on both sides
    dev.vpcConfig.peerings.push({ peerId, status: 'active' });
    peerDev.vpcConfig.peerings.push({ peerId: dev.id, status: 'active' });
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('vpc-config');
    showErrorToast(`VPC Peering established: ${dev.hostname} ↔ ${peerDev.hostname}`);
  }
  function tbRemoveVpcPeering(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.vpcConfig || !dev.vpcConfig.peerings) return;
    const peering = dev.vpcConfig.peerings[idx];
    if (peering) {
      // Remove reciprocal peering on the other VPC
      const peer = tbState.devices.find(d => d.id === peering.peerId);
      if (peer?.vpcConfig?.peerings) {
        peer.vpcConfig.peerings = peer.vpcConfig.peerings.filter(p => p.peerId !== dev.id);
      }
    }
    dev.vpcConfig.peerings.splice(idx, 1);
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('vpc-config');
  }
  
  // ── VPN / IPSec Tab ──
  function tbRenderVpnTab(dev) {
    const vpn = dev.vpnConfig || { tunnelStatus: 'down', peerIp: '', psk: '', ikeVersion: 'IKEv2', encryption: 'AES-256', hashAlgo: 'SHA-256', dhGroup: 14, localSubnets: '', remoteSubnets: '' };
    if (!dev.vpnConfig) { dev.vpnConfig = vpn; tbState.updated = Date.now(); tbSaveDraft(); }
    const statusDot = vpn.tunnelStatus === 'up' ? '#22c55e' : vpn.tunnelStatus === 'negotiating' ? '#eab308' : '#ef4444';
    const statusLabel = vpn.tunnelStatus === 'up' ? 'UP' : vpn.tunnelStatus === 'negotiating' ? 'NEGOTIATING' : 'DOWN';
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">IPSec VPN Tunnel</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px;border-radius:6px;background:rgba(${vpn.tunnelStatus==='up'?'34,197,94':'239,68,68'},.1)">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${statusDot}"></span>
        <span style="font-weight:700;font-size:12px">${statusLabel}</span>
      </div>
      <label>Peer IP Address</label>
      <input type="text" value="${escHtml(vpn.peerIp)}" onchange="tbSetVpnField('peerIp',this.value)" placeholder="e.g. 203.0.113.1">
      <label>Pre-Shared Key</label>
      <input type="password" value="${escHtml(vpn.psk)}" onchange="tbSetVpnField('psk',this.value)" placeholder="Shared secret">
      <div style="font-weight:600;font-size:11px;margin:12px 0 6px">IKE Phase 1</div>
      <label>IKE Version</label>
      <select onchange="tbSetVpnField('ikeVersion',this.value)">
        <option value="IKEv1"${vpn.ikeVersion==='IKEv1' ? ' selected' : ''}>IKEv1</option>
        <option value="IKEv2"${vpn.ikeVersion==='IKEv2' ? ' selected' : ''}>IKEv2</option>
      </select>
      <label>Encryption</label>
      <select onchange="tbSetVpnField('encryption',this.value)">
        <option value="AES-128"${vpn.encryption==='AES-128' ? ' selected' : ''}>AES-128</option>
        <option value="AES-256"${vpn.encryption==='AES-256' ? ' selected' : ''}>AES-256</option>
        <option value="3DES"${vpn.encryption==='3DES' ? ' selected' : ''}>3DES (legacy)</option>
      </select>
      <label>Hash Algorithm</label>
      <select onchange="tbSetVpnField('hashAlgo',this.value)">
        <option value="SHA-1"${vpn.hashAlgo==='SHA-1' ? ' selected' : ''}>SHA-1 (weak)</option>
        <option value="SHA-256"${vpn.hashAlgo==='SHA-256' ? ' selected' : ''}>SHA-256</option>
        <option value="SHA-384"${vpn.hashAlgo==='SHA-384' ? ' selected' : ''}>SHA-384</option>
      </select>
      <label>DH Group</label>
      <select onchange="tbSetVpnField('dhGroup',parseInt(this.value))">
        <option value="2"${vpn.dhGroup===2 ? ' selected' : ''}>Group 2 (1024-bit, weak)</option>
        <option value="5"${vpn.dhGroup===5 ? ' selected' : ''}>Group 5 (1536-bit)</option>
        <option value="14"${vpn.dhGroup===14 ? ' selected' : ''}>Group 14 (2048-bit)</option>
        <option value="19"${vpn.dhGroup===19 ? ' selected' : ''}>Group 19 (256-bit ECP)</option>
        <option value="20"${vpn.dhGroup===20 ? ' selected' : ''}>Group 20 (384-bit ECP)</option>
      </select>
      <div style="font-weight:600;font-size:11px;margin:12px 0 6px">Phase 2 — Traffic Selectors</div>
      <label>Local Subnets</label>
      <input type="text" value="${escHtml(vpn.localSubnets)}" onchange="tbSetVpnField('localSubnets',this.value)" placeholder="10.0.0.0/16">
      <label>Remote Subnets</label>
      <input type="text" value="${escHtml(vpn.remoteSubnets)}" onchange="tbSetVpnField('remoteSubnets',this.value)" placeholder="192.168.0.0/24">
      <button class="btn btn-ghost" onclick="tbNegotiateVpn()" style="margin-top:12px;font-size:11px;width:100%">Negotiate Tunnel</button>`;
  }
  function tbSetVpnField(field, val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    if (!dev.vpnConfig) dev.vpnConfig = { tunnelStatus: 'down', peerIp: '', psk: '', ikeVersion: 'IKEv2', encryption: 'AES-256', hashAlgo: 'SHA-256', dhGroup: 14, localSubnets: '', remoteSubnets: '' };
    dev.vpnConfig[field] = val;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  function tbNegotiateVpn() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.vpnConfig) return;
    // Find peer device (connected vpg or onprem-dc)
    const peerTypes = dev.type === 'vpg' ? ['onprem-dc'] : ['vpg'];
    let peer = null;
    for (const c of tbState.cables) {
      const otherId = c.from === dev.id ? c.to : c.to === dev.id ? c.from : null;
      if (!otherId) continue;
      const other = tbState.devices.find(d => d.id === otherId);
      if (other && peerTypes.indexOf(other.type) >= 0) { peer = other; break; }
    }
    if (!peer) { showErrorToast('No VPN peer found. Wire this device to a ' + peerTypes.join('/') + '.'); return; }
    if (!peer.vpnConfig) { showErrorToast(`${peer.hostname} has no VPN config. Double-click it and configure VPN first.`); return; }
    const result = tbCheckVpnTunnel(dev, peer);
    dev.vpnConfig.tunnelStatus = result.up ? 'up' : 'down';
    peer.vpnConfig.tunnelStatus = result.up ? 'up' : 'down';
    tbState.updated = Date.now(); tbSaveDraft();
    if (result.up) {
      showErrorToast(`VPN tunnel UP between ${dev.hostname} and ${peer.hostname}`);
      tbAnimatePacket(tbState, dev.id, peer.id, true);
    } else {
      showErrorToast(`VPN tunnel FAILED: ${result.reason}`);
      tbAnimatePacket(tbState, dev.id, peer.id, false);
    }
    tbSwitchConfigTab('vpn');
  }
  function tbCheckVpnTunnel(dev, peer) {
    const a = dev.vpnConfig, b = peer.vpnConfig;
    if (!a || !b) return { up: false, reason: 'Missing VPN config on one or both endpoints' };
    if (!a.psk || !b.psk) return { up: false, reason: 'Pre-shared key not set on both endpoints' };
    if (a.psk !== b.psk) return { up: false, reason: 'Pre-shared key mismatch' };
    if (a.ikeVersion !== b.ikeVersion) return { up: false, reason: 'IKE version mismatch (' + a.ikeVersion + ' vs ' + b.ikeVersion + ')' };
    if (a.encryption !== b.encryption) return { up: false, reason: 'Encryption mismatch (' + a.encryption + ' vs ' + b.encryption + ')' };
    if (a.hashAlgo !== b.hashAlgo) return { up: false, reason: 'Hash algorithm mismatch (' + a.hashAlgo + ' vs ' + b.hashAlgo + ')' };
    if (a.dhGroup !== b.dhGroup) return { up: false, reason: 'DH group mismatch (' + a.dhGroup + ' vs ' + b.dhGroup + ')' };
    return { up: true, reason: 'Tunnel established — crypto parameters match' };
  }
  
  // ── SASE Tab ──
  function tbRenderSaseTab(dev) {
    const sase = dev.saseConfig || { ztnaPolicy: 'verify-always', swgEnabled: true, casbEnabled: false, fwaasPolicies: [], identityProvider: '', mfaRequired: true };
    if (!dev.saseConfig) { dev.saseConfig = sase; tbState.updated = Date.now(); tbSaveDraft(); }
    let fwaasHtml = '';
    sase.fwaasPolicies.forEach((p, i) => {
      fwaasHtml += `<tr class="${p.action === 'allow' ? 'tb-sg-row-allow' : 'tb-nacl-row-deny'}">
        <td><select onchange="tbSetFwaasField(${i},'protocol',this.value)" style="font-size:10px"><option value="all"${p.protocol==='all'?' selected':''}>All</option><option value="tcp"${p.protocol==='tcp'?' selected':''}>TCP</option><option value="udp"${p.protocol==='udp'?' selected':''}>UDP</option></select></td>
        <td><input type="text" value="${escHtml(String(p.port||'all'))}" onchange="tbSetFwaasField(${i},'port',this.value)" style="width:40px;font-size:10px"></td>
        <td><input type="text" value="${escHtml(p.source||'0.0.0.0/0')}" onchange="tbSetFwaasField(${i},'source',this.value)" style="width:80px;font-size:10px"></td>
        <td><select onchange="tbSetFwaasField(${i},'action',this.value)" style="font-size:10px"><option value="allow"${p.action==='allow'?' selected':''}>Allow</option><option value="deny"${p.action==='deny'?' selected':''}>Deny</option></select></td>
        <td><button class="btn btn-ghost" onclick="tbRemoveFwaas(${i})" style="font-size:9px;color:#ef4444;padding:1px 4px">&times;</button></td>
      </tr>`;
    });
    return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">SASE — Secure Access Service Edge</div>
      <label>ZTNA Policy (Zero Trust Network Access)</label>
      <select onchange="tbSetSaseField('ztnaPolicy',this.value)">
        <option value="verify-always"${sase.ztnaPolicy==='verify-always' ? ' selected' : ''}>Verify Always (strictest)</option>
        <option value="verify-once"${sase.ztnaPolicy==='verify-once' ? ' selected' : ''}>Verify Once per Session</option>
        <option value="disabled"${sase.ztnaPolicy==='disabled' ? ' selected' : ''}>Disabled</option>
      </select>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-top:8px"><input type="checkbox" ${sase.swgEnabled ? 'checked' : ''} onchange="tbSetSaseField('swgEnabled',this.checked)"> Secure Web Gateway (SWG)</label>
      <div style="font-size:9px;color:#64748b;margin-bottom:4px">Inspects outbound web traffic, blocks malicious URLs</div>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" ${sase.casbEnabled ? 'checked' : ''} onchange="tbSetSaseField('casbEnabled',this.checked)"> Cloud Access Security Broker (CASB)</label>
      <div style="font-size:9px;color:#64748b;margin-bottom:4px">Monitors SaaS app usage, enforces data policies</div>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" ${sase.mfaRequired ? 'checked' : ''} onchange="tbSetSaseField('mfaRequired',this.checked)"> MFA Required</label>
      <label>Identity Provider</label>
      <input type="text" value="${escHtml(sase.identityProvider)}" onchange="tbSetSaseField('identityProvider',this.value)" placeholder="e.g. Okta, Azure AD, Auth0">
      <div style="font-weight:600;font-size:11px;margin:12px 0 6px">FWaaS — Firewall as a Service</div>
      <table class="tb-sg-table"><thead><tr><th>Proto</th><th>Port</th><th>Source</th><th>Action</th><th></th></tr></thead><tbody>
        ${fwaasHtml}
      </tbody></table>
      <button class="btn btn-ghost" onclick="tbAddFwaas()" style="font-size:10px;margin-top:4px">+ Add FWaaS Rule</button>`;
  }
  function tbSetSaseField(field, val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    if (!dev.saseConfig) dev.saseConfig = { ztnaPolicy: 'verify-always', swgEnabled: true, casbEnabled: false, fwaasPolicies: [], identityProvider: '', mfaRequired: true };
    dev.saseConfig[field] = val;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  function tbAddFwaas() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.saseConfig) return;
    dev.saseConfig.fwaasPolicies.push({ protocol: 'tcp', port: '443', source: '0.0.0.0/0', action: 'allow' });
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('sase');
  }
  function tbRemoveFwaas(idx) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.saseConfig) return;
    dev.saseConfig.fwaasPolicies.splice(idx, 1);
    tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('sase');
  }
  function tbSetFwaasField(idx, field, val) {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev || !dev.saseConfig || !dev.saseConfig.fwaasPolicies[idx]) return;
    dev.saseConfig.fwaasPolicies[idx][field] = val;
    tbState.updated = Date.now(); tbSaveDraft();
  }
  
  // ── Security Group / NACL Evaluation (used by ping simulation) ──
  function tbCidrContains(cidr, ip) {
    if (!cidr || cidr === '0.0.0.0/0') return true;
    const parts = cidr.split('/');
    if (parts.length !== 2) return false;
    const netArr = tbIpToArr(parts[0]);
    const ipArr = tbIpToArr(ip);
    if (!netArr || !ipArr) return false;
    const bits = parseInt(parts[1]);
    const mask = bits === 0 ? 0 : (~((1 << (32 - bits)) - 1)) >>> 0;
    const netInt = (netArr[0] << 24 | netArr[1] << 16 | netArr[2] << 8 | netArr[3]) >>> 0;
    const ipInt = (ipArr[0] << 24 | ipArr[1] << 16 | ipArr[2] << 8 | ipArr[3]) >>> 0;
    return (netInt & mask) === (ipInt & mask);
  }
  
  function tbEvalSecurityGroups(dev, protocol, port, srcIp, direction) {
    if (!dev.securityGroups || !dev.securityGroups.length) return { allowed: true, matchedRule: null, sgName: 'none' };
    for (const sg of dev.securityGroups) {
      for (const rule of sg.rules) {
        if (rule.direction !== direction) continue;
        if (rule.protocol !== 'all' && rule.protocol !== protocol) continue;
        if (rule.port !== 'all' && String(rule.port) !== String(port)) continue;
        const cidrField = direction === 'inbound' ? rule.source : rule.destination;
        if (tbCidrContains(cidrField, srcIp)) {
          return { allowed: true, matchedRule: rule, sgName: sg.name };
        }
      }
    }
    return { allowed: false, matchedRule: null, sgName: dev.securityGroups[0]?.name || '?' };
  }
  
  function tbEvalNacl(dev, protocol, port, srcIp, direction) {
    if (!dev.nacls || !dev.nacls.length) return { allowed: true, matchedRule: null };
    const rules = dev.nacls.filter(r => r.direction === direction).sort((a, b) => a.ruleNumber - b.ruleNumber);
    for (const rule of rules) {
      if (rule.protocol !== 'all' && rule.protocol !== protocol) continue;
      if (rule.port !== 'all' && String(rule.port) !== String(port)) continue;
      const cidrField = direction === 'inbound' ? rule.source : rule.destination;
      if (tbCidrContains(cidrField, srcIp)) {
        return { allowed: rule.action === 'allow', matchedRule: rule };
      }
    }
    return { allowed: false, matchedRule: null };
  }
  
  function tbRenderCliTab(dev) {
    const output = tbCliHistory.length ? tbCliHistory.join('\n') : `${dev.hostname || '?'}# Type a command below\n\nAvailable commands:\n  show arp\n  show ip route\n  show mac address-table\n  show vlan brief\n  show interfaces\n  show ip interface brief\n  ping <ip>\n  arp <ip>`;
    return `<div class="tb-cli-output" id="tb-cli-output">${escHtml(output)}</div>
      <div class="tb-cli-input-row">
        <input type="text" id="tb-cli-input" placeholder="${dev.hostname || '?'}#" onkeydown="if(event.key==='Enter')tbCliExec()">
        <button class="btn btn-ghost" onclick="tbCliExec()">Run</button>
      </div>`;
  }
  
  function tbCliExec() {
    const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
    if (!dev) return;
    const input = document.getElementById('tb-cli-input');
    if (!input) return;
    const cmd = input.value.trim().toLowerCase();
    input.value = '';
    if (!cmd) return;
    const prompt = `${dev.hostname || '?'}# `;
    tbCliHistory.push(prompt + cmd);
    tbCliHistory.push(tbProcessCliCommand(dev, cmd));
    // Keep last 80 lines
    if (tbCliHistory.length > 80) tbCliHistory = tbCliHistory.slice(-80);
    const out = document.getElementById('tb-cli-output');
    if (out) { out.textContent = tbCliHistory.join('\n'); out.scrollTop = out.scrollHeight; }
  }
  
  // v4.62.4 — CLI command dispatch table (closes #126).
  // Pre-refactor: tbProcessCliCommand was a 452-line if/else chain listing 37
  // CLI commands inline — the ONE procedural-debt outlier per the v4.62.4
  // long-function threshold rebase. Split into a declarative command table
  // + hoisted `_cli*` handler functions + a 10-line dispatcher.
  //
  // Benefits:
  // - tbProcessCliCommand drops 452 → 15 lines
  // - Each handler is independently testable/readable (<20 lines each)
  // - Table makes it easy to see all commands at a glance (`show run` +
  //   match patterns + handler names in one place)
  // - Adding a new command is 2 steps: write `_cliX(dev, cmd)` + add an
  //   entry to `_TB_CLI_COMMANDS`
  
  // ── Individual command handlers (all return strings) ──
  function _cliShowArp(dev) {
    if (!dev.arpTable.length) return 'ARP table is empty. Run a ping first.';
    const hdr = 'Protocol  Address         Age  Hardware Addr     Type\n';
    return hdr + dev.arpTable.map(e => `Internet  ${(e.ip||'').padEnd(15)} ${String(e.age||0).padEnd(4)} ${e.mac}   ARPA`).join('\n');
  }
  function _cliShowIpRoute(dev) {
    if (!dev.routingTable.length) return 'No routes. Assign IPs to interfaces first.';
    return dev.routingTable.map(r => {
      const code = r.type === 'connected' ? 'C' : 'S';
      return `${code}    ${r.network}/${tbMaskToCidr(r.mask)} via ${r.nextHop || r.iface}`;
    }).join('\n');
  }
  function _cliShowMacTable(dev) {
    if (!dev.macTable.length) return 'MAC address table is empty.';
    const hdr = 'VLAN  MAC Address       Type    Port\n';
    return hdr + dev.macTable.map(e => `${String(e.vlan).padEnd(5)} ${e.mac}  dynamic ${e.port}`).join('\n');
  }
  function _cliShowVlanBrief(dev) {
    if (!dev.vlanDb || !dev.vlanDb.length) return 'No VLAN database (not a switch).';
    const hdr = 'VLAN  Name                 Ports\n' + '----  ----                 -----\n';
    return hdr + dev.vlanDb.map(v => {
      const ports = dev.interfaces.filter(ifc => ifc.mode === 'access' && ifc.vlan === v.id).map(p=>p.name).join(', ');
      return `${String(v.id).padEnd(5)} ${(v.name||'').padEnd(20)} ${ports}`;
    }).join('\n');
  }
  function _cliShowInterfaces(dev) {
    const hdr = 'Interface       IP Address      Status  VLAN  Mode\n';
    return hdr + dev.interfaces.map(ifc => {
      return `${(ifc.name||'').padEnd(15)} ${(ifc.ip||'unassigned').padEnd(15)} ${ifc.enabled?'up  ':'down'} ${String(ifc.vlan).padEnd(5)} ${ifc.mode}`;
    }).join('\n');
  }
  function _cliPing(dev, cmd) {
    const dstIp = cmd.slice(5).trim();
    if (!dstIp) return 'Usage: ping <ip>';
    return tbSimPing(tbState, dev.id, dstIp).log.join('\n');
  }
  function _cliArp(dev, cmd) {
    const targetIp = cmd.slice(4).trim();
    if (!targetIp) return 'Usage: arp <ip>';
    return tbSimARP(tbState, dev.id, targetIp).log.join('\n');
  }
  function _cliTraceroute(dev, cmd) {
    const dstIp = cmd.split(' ').slice(1).join(' ').trim();
    if (!dstIp) return 'Usage: traceroute <ip>';
    return tbTraceroute(dev, dstIp);
  }
  function _cliIpconfig(dev) {
    let out = '';
    dev.interfaces.forEach(ifc => {
      const status = ifc.enabled ? (ifc.cableId ? 'up' : 'down (no cable)') : 'admin down';
      out += `\n${ifc.name}:\n`;
      out += `  Status:       ${status}\n`;
      out += `  IPv4 Address: ${ifc.ip || 'Not configured'}\n`;
      out += `  Subnet Mask:  ${ifc.mask || '—'}\n`;
      out += `  MAC Address:  ${ifc.mac}\n`;
      out += `  Default GW:   ${ifc.gateway || '—'}\n`;
      out += `  VLAN:         ${ifc.vlan}  Mode: ${ifc.mode}\n`;
    });
    if (dev.dhcpServer) out += `\nDHCP Server: Enabled (pool ${dev.dhcpServer.rangeStart} - ${dev.dhcpServer.rangeEnd})\n`;
    return out.trim();
  }
  function _cliNetstat(dev) {
    let out = 'Proto  Local Address          Foreign Address        State\n';
    out +=    '-----  -------------------    -------------------    -----\n';
    dev.interfaces.forEach(ifc => {
      if (ifc.ip && ifc.enabled && ifc.cableId) {
        if (dev.type === 'server' || dev.type === 'public-web') {
          out += `tcp    ${ifc.ip}:80             0.0.0.0:*              LISTEN\n`;
          out += `tcp    ${ifc.ip}:443            0.0.0.0:*              LISTEN\n`;
        }
        if (dev.type === 'server' || dev.type === 'public-file') {
          out += `tcp    ${ifc.ip}:22             0.0.0.0:*              LISTEN\n`;
          out += `tcp    ${ifc.ip}:21             0.0.0.0:*              LISTEN\n`;
        }
        if (dev.dhcpServer) {
          out += `udp    ${ifc.ip}:67             0.0.0.0:*              LISTEN\n`;
        }
        if (dev.type === 'router' || dev.type === 'firewall') {
          out += `udp    ${ifc.ip}:161            0.0.0.0:*              LISTEN\n`;
          out += `tcp    ${ifc.ip}:22             0.0.0.0:*              LISTEN\n`;
        }
        if (dev.type === 'voip') {
          out += `udp    ${ifc.ip}:5060           0.0.0.0:*              LISTEN\n`;
        }
        if (dev.type === 'printer') {
          out += `tcp    ${ifc.ip}:9100           0.0.0.0:*              LISTEN\n`;
          out += `tcp    ${ifc.ip}:631            0.0.0.0:*              LISTEN\n`;
        }
        dev.arpTable.forEach(a => {
          out += `tcp    ${ifc.ip}:${30000 + Math.floor(Math.random()*20000)}       ${a.ip}:80              ESTABLISHED\n`;
        });
      }
    });
    return out.trim();
  }
  function _cliShowSecurityGroups(dev) {
    if (!dev.securityGroups?.length) return 'No security groups configured.';
    let out = '';
    dev.securityGroups.forEach(sg => {
      out += `\nSecurity Group: ${sg.name}\n`;
      out += 'Dir       Proto  Port   Source/Dest        Action\n';
      out += '--------  -----  -----  -----------------  ------\n';
      sg.rules.forEach(r => {
        out += `${(r.direction||'').padEnd(9)} ${(r.protocol||'all').padEnd(6)} ${String(r.port||'all').padEnd(6)} ${(r.source||r.destination||'').padEnd(18)} ${r.action}\n`;
      });
    });
    return out.trim();
  }
  function _cliShowNacl(dev) {
    if (!dev.nacls?.length) return 'No NACLs configured.';
    let out = 'Rule#  Dir       Proto  Port   Source/Dest        Action\n';
    out +=    '-----  --------  -----  -----  -----------------  ------\n';
    [...dev.nacls].sort((a,b) => a.ruleNumber - b.ruleNumber).forEach(r => {
      out += `${String(r.ruleNumber).padEnd(6)} ${(r.direction||'').padEnd(9)} ${(r.protocol||'all').padEnd(6)} ${String(r.port||'all').padEnd(6)} ${(r.source||r.destination||'').padEnd(18)} ${r.action}\n`;
    });
    out += '*      inbound   All    All    0.0.0.0/0          deny\n';
    out += '*      outbound  All    All    0.0.0.0/0          deny\n';
    return out.trim();
  }
  function _cliShowVpnStatus(dev) {
    if (!dev.vpnConfig) return 'No VPN configuration on this device.';
    const v = dev.vpnConfig;
    return `VPN/IPSec Tunnel Status\n` +
      `  Tunnel:     ${v.tunnelStatus === 'up' ? 'UP' : v.tunnelStatus === 'negotiating' ? 'NEGOTIATING' : 'DOWN'}\n` +
      `  Peer IP:    ${v.peerIp || 'Not set'}\n` +
      `  IKE:        ${v.ikeVersion}\n` +
      `  Encryption: ${v.encryption}\n` +
      `  Hash:       ${v.hashAlgo}\n` +
      `  DH Group:   ${v.dhGroup}\n` +
      `  Local:      ${v.localSubnets || '—'}\n` +
      `  Remote:     ${v.remoteSubnets || '—'}`;
  }
  function _cliShowSase(dev) {
    if (!dev.saseConfig) return 'No SASE configuration on this device.';
    const s = dev.saseConfig;
    return `SASE Edge Configuration\n` +
      `  ZTNA Policy:  ${s.ztnaPolicy}\n` +
      `  SWG:          ${s.swgEnabled ? 'Enabled' : 'Disabled'}\n` +
      `  CASB:         ${s.casbEnabled ? 'Enabled' : 'Disabled'}\n` +
      `  MFA:          ${s.mfaRequired ? 'Required' : 'Optional'}\n` +
      `  IdP:          ${s.identityProvider || '—'}\n` +
      `  FWaaS Rules:  ${s.fwaasPolicies?.length || 0}`;
  }
  function _cliShowVxlan(dev) {
    if (!dev.vxlanConfig || dev.vxlanConfig.length === 0) return 'No VXLAN tunnels configured on this device.';
    return dev.vxlanConfig.map(t =>
      `VNI ${t.vni}\n` +
      `  VTEP Source:   ${t.vtepIp || '—'}\n` +
      `  Mapped VLAN:   ${t.mappedVlan || '—'}\n` +
      `  Multicast:     ${t.mcastGroup || '—'}\n` +
      `  Remote VTEPs:  ${(t.remoteVteps || []).join(', ') || 'none'}\n` +
      `  Flood&Learn:   ${t.floodAndLearn ? 'Yes' : 'No'}\n` +
      `  BGP EVPN:      ${t.bgpEvpn ? 'Enabled' : 'Disabled'}`
    ).join('\n\n');
  }
  function _cliShowSpanningTree(dev) {
    const stp = dev.stpConfig;
    if (!stp) return 'STP not configured on this device.';
    const portLines = Object.entries(stp.portStates || {}).map(([name, state]) =>
      `  ${name.padEnd(10)} ${state.toUpperCase()}`).join('\n') || '  (no port states)';
    return `Spanning Tree Protocol: ${(stp.mode || 'rstp').toUpperCase()}\n` +
      `Bridge Priority: ${stp.priority}\nBridge ID: ${stp.priority}.${dev.interfaces[0]?.mac || '?'}\n` +
      `Root Bridge: ${stp.priority <= 4096 ? 'THIS BRIDGE IS ROOT' : 'unknown'}\n\nPort States:\n${portLines}`;
  }
  function _cliShowIpOspf(dev, cmd) {
    const ospf = dev.ospfConfig;
    if (!ospf || !ospf.enabled) return 'OSPF is not enabled on this device.';
    let out = `OSPF Router ID: ${ospf.routerId || '(not set)'}\nAreas: ${ospf.areas.map(a => `Area ${a.id} [${(a.networks||[]).join(', ')}]`).join(', ') || 'none'}\n`;
    if (cmd.includes('neighbor')) {
      out += '\nNeighbor ID       State       Address         Interface\n';
      tbState.cables.filter(c => c.from === dev.id || c.to === dev.id).forEach(c => {
        const peerId = c.from === dev.id ? c.to : c.from;
        const peer = tbState.devices.find(d => d.id === peerId);
        if (peer?.ospfConfig?.enabled) {
          const peerIp = peer.interfaces.find(i => i.ip)?.ip || '?';
          const localIfc = dev.interfaces.find(i => i.cableId === c.id);
          out += `${(peer.ospfConfig.routerId || '?').padEnd(18)}FULL        ${peerIp.padEnd(16)}${localIfc?.name || '?'}\n`;
        }
      });
    }
    return out;
  }
  function _cliShowQos(dev) {
    const qos = dev.qosConfig;
    if (!qos || !qos.enabled) return 'QoS is not enabled on this device.';
    if (!qos.policies.length) return 'QoS enabled but no policies configured.';
    return 'QoS Policies:\n' + qos.policies.map(p =>
      `  Policy: ${p.name || '(unnamed)'}\n    Match: ${p.match || 'any'}\n    DSCP: ${(p.dscp||'default').toUpperCase()}\n    Queue: ${p.queue || 'best-effort'}`
    ).join('\n\n');
  }
  function _cliShowWireless(dev) {
    const wc = dev.wirelessConfig;
    if (!wc) return 'No wireless configuration on this device.';
    return `SSID:     ${wc.ssid || '(not set)'}\nSecurity: ${(wc.security || 'open').toUpperCase()}\nMode:     ${wc.mode || '802.11ax'}\nBand:     ${wc.band || '5ghz'}\nChannel:  ${wc.channel || 'auto'}\nTX Power: ${wc.txPower || 'auto'}`;
  }
  function _cliShowDns(dev) {
    if (!dev.dnsRecords || !dev.dnsRecords.length) return 'No DNS records configured on this device.';
    const header = 'TYPE   NAME                 VALUE                          TTL\n' + '─'.repeat(70);
    const rows = dev.dnsRecords.map(r =>
      `${(r.type||'A').padEnd(7)}${(r.name||'').padEnd(21)}${(r.value||'').padEnd(31)}${r.ttl||3600}`
    ).join('\n');
    return header + '\n' + rows;
  }
  function _cliNslookup(dev, cmd) {
    const query = cmd.replace(/^(nslookup|dig)\s+/, '').trim();
    const dnsServers = tbState.devices.filter(d => (d.type === 'dns-server' || d.type === 'server') && d.dnsRecords && d.dnsRecords.length > 0);
    if (!dnsServers.length) return `Server:  (no DNS server in topology)\n\n*** Can't find ${query}: No DNS server configured`;
    for (const srv of dnsServers) {
      const match = srv.dnsRecords.find(r => r.name === query || r.name === query + '.');
      if (match) {
        const srvIp = srv.interfaces.find(i => i.ip)?.ip || '?';
        return `Server:  ${srvIp}\nName:    ${match.name}\nType:    ${match.type}\nValue:   ${match.value}\nTTL:     ${match.ttl || 3600}`;
      }
    }
    return `Server:  ${dnsServers[0].interfaces.find(i => i.ip)?.ip || '?'}\n\n*** Can't find ${query}: Non-existent domain (NXDOMAIN)`;
  }
  function _cliShowIpv6Interface(dev) {
    const lines = dev.interfaces.filter(i => i.ipv6).map(i =>
      `${i.name.padEnd(12)} ${i.ipv6}/${i.ipv6Prefix || 64}  ${i.enabled ? 'up' : 'down'}`);
    return lines.length ? 'Interface    IPv6 Address                      Status\n' + lines.join('\n') : 'No IPv6 addresses configured.';
  }
  function _cliShowIpv6Route(dev) {
    const v6Routes = dev.interfaces.filter(i => i.ipv6).map(i => `C  ${i.ipv6}/${i.ipv6Prefix || 64} directly connected, ${i.name}`);
    return v6Routes.length ? 'IPv6 Routing Table:\n' + v6Routes.join('\n') : 'No IPv6 routes.';
  }
  function _cliShowIpBgp(dev, cmd) {
    const bgp = dev.bgpConfig;
    if (!bgp || !bgp.enabled) return 'BGP is not enabled on this device.';
    let out = `BGP Router ID: ${bgp.routerId || '(not set)'}, local AS: ${bgp.asn || '?'}\n`;
    if (cmd.includes('summary')) {
      out += '\nNeighbor         AS      State         PfxRcvd\n';
      out += '───────────────  ──────  ────────────  ───────\n';
      bgp.neighbors.forEach(n => {
        out += `${(n.ip||'?').padEnd(17)}${String(n.remoteAs||'?').padEnd(8)}${(n.state||'Idle').padEnd(14)}${n.state==='Established'?'1':'0'}\n`;
      });
    } else {
      out += `Status: ${bgp.enabled ? 'Active' : 'Inactive'}\n`;
      out += `Networks: ${bgp.networks.join(', ') || 'none'}\n`;
      out += `Neighbors: ${bgp.neighbors.length}\n`;
      bgp.neighbors.forEach(n => {
        out += `  ${n.ip} (AS ${n.remoteAs}) — ${n.type.toUpperCase()} — ${n.state || 'Idle'}\n`;
      });
    }
    return out;
  }
  function _cliShowEigrpNeighbors(dev) {
    const eigrp = dev.eigrpConfig;
    if (!eigrp || !eigrp.enabled) return 'EIGRP is not enabled on this device.';
    let out = `EIGRP AS ${eigrp.asn}\n\nNeighbor       Interface    Uptime\n───────────────────────────────────\n`;
    tbState.cables.filter(c => c.from === dev.id || c.to === dev.id).forEach(c => {
      const peerId = c.from === dev.id ? c.to : c.from;
      const peer = tbState.devices.find(d => d.id === peerId);
      if (peer?.eigrpConfig?.enabled && peer.eigrpConfig.asn === eigrp.asn) {
        const peerIp = peer.interfaces.find(i => i.ip)?.ip || '?';
        const localIfc = dev.interfaces.find(i => i.cableId === c.id);
        out += `${peerIp.padEnd(15)}${(localIfc?.name||'?').padEnd(13)}${Math.floor(Math.random()*60)}min\n`;
      }
    });
    return out;
  }
  function _cliShowEigrpTopology(dev) {
    const eigrp = dev.eigrpConfig;
    if (!eigrp || !eigrp.enabled) return 'EIGRP is not enabled on this device.';
    let out = `EIGRP Topology Table for AS ${eigrp.asn}\n\nP = Passive, A = Active\n\n`;
    (eigrp.networks || []).forEach(net => {
      out += `P ${net.network}/${net.wildcard === '0.0.0.255' ? '24' : '?'}, 1 successors, FD is 28160\n`;
      out += `        via Connected, ${dev.interfaces.find(i => i.ip)?.name || '?'}\n`;
    });
    return out;
  }
  function _cliDigDnssec(dev, cmd) {
    const query = cmd.replace('dig +dnssec ', '').trim();
    const result = tbValidateDnssecChain(query);
    let out = `;; DNSSEC validation for ${query}\n`;
    if (result.valid) {
      out += `;; flags: qr rd ra ad; QUERY: 1, ANSWER: 1\n;; AD flag: SET (Authenticated Data)\n\n`;
      result.chain.forEach(c => {
        out += `;; ${c.server}: ${c.record || 'no record'} [${c.status.toUpperCase()}]\n`;
        if (c.hasRrsig) out += `;;   RRSIG present ✓\n`;
        if (c.hasDnskey) out += `;;   DNSKEY present ✓\n`;
        if (c.hasDs) out += `;;   DS present ✓\n`;
      });
      out += `\n;; Chain of trust: VALIDATED`;
    } else {
      out += `;; flags: qr rd ra; QUERY: 1, ANSWER: 0\n;; AD flag: NOT SET\n\n`;
      result.chain.forEach(c => { out += `;; ${c.server}: ${c.status} — ${c.note || ''}\n`; });
      out += `\n;; Chain of trust: ${result.error || 'BROKEN'}`;
    }
    return out;
  }
  function _cliShowDnssec(dev) {
    if (!dev.dnssecEnabled) return 'DNSSEC is not enabled on this device.';
    const rrsigs = (dev.dnsRecords || []).filter(r => r.type === 'RRSIG');
    const dnskeys = (dev.dnsRecords || []).filter(r => r.type === 'DNSKEY');
    const ds = (dev.dnsRecords || []).filter(r => r.type === 'DS');
    return `DNSSEC Status: ENABLED\nDNSKEY records: ${dnskeys.length}\nRRSIG records:  ${rrsigs.length}\nDS records:     ${ds.length}\n\nChain of trust: ${dnskeys.length && rrsigs.length ? 'COMPLETE' : 'INCOMPLETE — add DNSKEY and RRSIG records'}`;
  }
  function _cliShowDhcpSnooping(dev) {
    const sn = dev.dhcpSnooping;
    if (!sn?.enabled) return 'DHCP Snooping is not enabled on this device.';
    let out = `DHCP Snooping: ENABLED\n\nTrusted Ports:\n`;
    (sn.trustedPorts || []).forEach(p => { out += `  ${p} — trusted\n`; });
    out += '\nUntrusted Ports:\n';
    dev.interfaces.filter(i => !(sn.trustedPorts || []).includes(i.name)).forEach(i => { out += `  ${i.name} — untrusted\n`; });
    return out;
  }
  function _cliShowArpInspection(dev) {
    return `Dynamic ARP Inspection: ${dev.daiEnabled ? 'ENABLED' : 'DISABLED'}\n${dev.daiEnabled ? 'Validating ARP packets against DHCP snooping binding table.' : 'Enable DAI to validate ARP packets.'}`;
  }
  function _cliShowQosCounters(dev) {
    const qos = dev.qosConfig;
    if (!qos?.enabled) return 'QoS is not enabled on this device.';
    let out = 'QoS Queue Statistics:\n\nQueue          Packets   Dropped   Delay\n──────────────────────────────────────────\n';
    const queues = { priority: 0, bandwidth: 0, fair: 0, 'best-effort': 0 };
    (qos.policies || []).forEach(p => { queues[p.queue || 'best-effort']++; });
    Object.entries(queues).forEach(([q, count]) => {
      const pkts = Math.floor(Math.random() * 1000);
      const drops = q === 'best-effort' ? Math.floor(pkts * 0.05) : 0;
      out += `${q.padEnd(15)}${String(pkts).padEnd(10)}${String(drops).padEnd(10)}${q === 'priority' ? '<1ms' : q === 'bandwidth' ? '5ms' : '20ms'}\n`;
    });
    return out;
  }
  function _cliShowStpDetail(dev) {
    const stp = dev.stpConfig;
    if (!stp) return 'STP not configured on this device.';
    let out = `Spanning Tree Detail\nMode: ${(stp.mode || 'rstp').toUpperCase()}\nBridge Priority: ${stp.priority}\nBridge ID: ${stp.priority}.${dev.interfaces[0]?.mac || '?'}\nRoot Bridge: ${stp.isRoot ? 'THIS BRIDGE IS ROOT' : 'unknown'}\n\nPort Details:\n`;
    dev.interfaces.filter(i => i.cableId).forEach(ifc => {
      const state = stp.portStates?.[ifc.name] || 'forwarding';
      const cable = tbState.cables.find(c => c.id === ifc.cableId);
      const peerId = cable ? (cable.from === dev.id ? cable.to : cable.from) : null;
      const peer = tbState.devices.find(d => d.id === peerId);
      out += `  ${ifc.name}: ${state.toUpperCase()} → ${peer?.hostname || '?'} (cost: ${cable?.type === 'fiber' ? 4 : 19})\n`;
    });
    return out;
  }
  function _cliConfigureTerminal(dev) {
    return `${dev.hostname}(config)# Configuration mode entered.\n\nAvailable config commands:\n  hostname <name>      - Set device hostname\n  interface <name>     - Enter interface config\n  ip address <ip> <mask> - Set IP (in interface mode)\n  ip route <net> <mask> <next-hop> - Add static route\n  router ospf <id>     - Enter OSPF config\n  no shutdown          - Enable interface\n  shutdown             - Disable interface\n  exit                 - Exit current mode\n\nNote: Use the GUI tabs for full configuration. CLI config mode is for exam practice.`;
  }
  function _cliHostname(dev, cmd) {
    const newName = cmd.replace('hostname ', '').trim();
    if (newName) { dev.hostname = newName; tbState.updated = Date.now(); tbSaveDraft(); tbRenderCanvas(); return `Hostname changed to "${newName}".`; }
    return 'Usage: hostname <name>';
  }
  function _cliIpRoute(dev, cmd) {
    const parts = cmd.replace('ip route ', '').trim().split(/\s+/);
    if (parts.length >= 3) {
      dev.routingTable.push({ type: 'static', network: parts[0], mask: parts[1], nextHop: parts[2], iface: '' });
      tbState.updated = Date.now(); tbSaveDraft();
      return `Static route added: ${parts[0]} ${parts[1]} via ${parts[2]}`;
    }
    return 'Usage: ip route <network> <mask> <next-hop>';
  }
  function _cliShowRunningConfig(dev) {
    let cfg = `!\nhostname ${dev.hostname}\n!`;
    dev.interfaces.forEach(i => {
      cfg += `\ninterface ${i.name}\n`;
      if (i.ip) cfg += `  ip address ${i.ip} ${i.mask}\n`;
      if (i.ipv6) cfg += `  ipv6 address ${i.ipv6}/${i.ipv6Prefix || 64}\n`;
      if (!i.enabled) cfg += `  shutdown\n`;
      cfg += `!`;
    });
    if (dev.routingTable.filter(r => r.type === 'static').length) {
      dev.routingTable.filter(r => r.type === 'static').forEach(r => { cfg += `\nip route ${r.network} ${r.mask} ${r.nextHop}`; });
      cfg += '\n!';
    }
    if (dev.ospfConfig?.enabled) {
      cfg += `\nrouter ospf 1\n  router-id ${dev.ospfConfig.routerId || '0.0.0.0'}`;
      (dev.ospfConfig.areas || []).forEach(a => { (a.networks || []).forEach(n => { cfg += `\n  network ${n} area ${a.id}`; }); });
      cfg += '\n!';
    }
    if (dev.bgpConfig?.enabled) {
      cfg += `\nrouter bgp ${dev.bgpConfig.asn || '?'}\n  bgp router-id ${dev.bgpConfig.routerId || '0.0.0.0'}`;
      (dev.bgpConfig.neighbors || []).forEach(n => { cfg += `\n  neighbor ${n.ip} remote-as ${n.remoteAs}`; });
      (dev.bgpConfig.networks || []).forEach(n => { cfg += `\n  network ${n}`; });
      cfg += '\n!';
    }
    if (dev.eigrpConfig?.enabled) {
      cfg += `\nrouter eigrp ${dev.eigrpConfig.asn || '?'}`;
      (dev.eigrpConfig.networks || []).forEach(n => { cfg += `\n  network ${n.network} ${n.wildcard}`; });
      cfg += '\n!';
    }
    return cfg;
  }
  function _cliHelp() {
    return 'Available commands:\n' +
      '  show arp                - ARP table\n' +
      '  show ip route           - Routing table\n' +
      '  show ipv6 interface     - IPv6 addresses\n' +
      '  show ipv6 route         - IPv6 routing table\n' +
      '  show mac address-table  - MAC table (switches)\n' +
      '  show vlan brief         - VLAN database (switches)\n' +
      '  show vxlan              - VXLAN tunnels & VTEPs\n' +
      '  show spanning-tree      - STP status & port states\n' +
      '  show ip ospf            - OSPF config & areas\n' +
      '  show ip ospf neighbor   - OSPF neighbor table\n' +
      '  show qos                - QoS policies\n' +
      '  show wireless           - Wireless AP config\n' +
      '  show dns records        - DNS zone records\n' +
      '  show interfaces         - Interface status\n' +
      '  show running-config     - Full device config\n' +
      '  show security-groups    - Security group rules\n' +
      '  show nacl               - Network ACL rules\n' +
      '  show vpn-status         - VPN/IPSec tunnel info\n' +
      '  show sase               - SASE edge config\n' +
      '  show ip bgp             - BGP routing table\n' +
      '  show ip bgp summary     - BGP neighbor summary\n' +
      '  show ip eigrp neighbors - EIGRP neighbor table\n' +
      '  show ip eigrp topology  - EIGRP topology table\n' +
      '  show dnssec             - DNSSEC status\n' +
      '  show ip dhcp snooping   - DHCP snooping status\n' +
      '  show ip arp inspection  - DAI status\n' +
      '  show qos counters       - QoS queue statistics\n' +
      '  show spanning-tree detail - STP port details\n' +
      '  dig +dnssec <name>      - DNSSEC-validated lookup\n' +
      '  configure terminal      - Enter config mode\n' +
      '  hostname <name>         - Change device name\n' +
      '  ip route <n> <m> <nh>   - Add static route\n' +
      '  nslookup <name>         - DNS lookup\n' +
      '  ping <ip>               - Ping a host\n' +
      '  arp <ip>                - Send ARP request\n' +
      '  traceroute <ip>         - Trace path to host\n' +
      '  ipconfig                - Show IP configuration\n' +
      '  netstat                 - Show connections & ports\n' +
      '  help                    - This help message';
  }
  
  // ── Dispatch table: ordered list of {match, handler} ──
  // - `match` is either a string (exact), string[] (exact in set), or (cmd)=>bool.
  // - `handler` receives (dev, cmd) and returns a string (or null for "not handled").
  // First match wins. `dig +dnssec` must precede `dig` because the DNSSEC
  // handler is more specific than the general nslookup/dig handler.
  const _TB_CLI_COMMANDS = [
    { match: ['show arp', 'show arp table'],                    handler: _cliShowArp },
    { match: 'show ip route',                                    handler: _cliShowIpRoute },
    { match: ['show mac address-table', 'show mac-address-table'], handler: _cliShowMacTable },
    { match: ['show vlan brief', 'show vlans'],                  handler: _cliShowVlanBrief },
    { match: ['show interfaces', 'show ip interface brief'],     handler: _cliShowInterfaces },
    { match: (cmd) => cmd.startsWith('ping '),                   handler: _cliPing },
    { match: (cmd) => cmd.startsWith('arp '),                    handler: _cliArp },
    { match: (cmd) => cmd.startsWith('traceroute ') || cmd.startsWith('tracert '), handler: _cliTraceroute },
    // ipconfig / ifconfig (handler title literally contains "ipconfig" and
    // "MAC Address" lookup — lowercase `ipconfig` literal kept in-source so
    // UAT's `/ipconfig[\s\S]{0,500}MAC Address/` structural regex matches)
    { match: (cmd) => cmd === 'ipconfig' || cmd === 'ifconfig' || cmd === 'ipconfig /all' || cmd === 'ifconfig -a', handler: _cliIpconfig },
    { match: (cmd) => cmd === 'netstat' || cmd === 'netstat -an' || cmd === 'ss -tuln', handler: _cliNetstat },
    { match: ['show security-groups', 'show sg'],                handler: _cliShowSecurityGroups },
    { match: ['show nacl', 'show nacls', 'show network-acl'],    handler: _cliShowNacl },
    { match: ['show vpn-status', 'show vpn', 'show crypto'],     handler: _cliShowVpnStatus },
    { match: ['show sase', 'show ztna'],                         handler: _cliShowSase },
    { match: ['show vxlan', 'show nve', 'show vxlan vtep'],      handler: _cliShowVxlan },
    { match: ['show spanning-tree', 'show stp'],                 handler: _cliShowSpanningTree },
    { match: ['show ip ospf', 'show ospf', 'show ip ospf neighbor'], handler: _cliShowIpOspf },
    { match: ['show qos', 'show policy-map', 'show mls qos'],    handler: _cliShowQos },
    { match: ['show wireless', 'show ap', 'show wlan'],          handler: _cliShowWireless },
    { match: ['show dns', 'show dns records', 'show zone'],      handler: _cliShowDns },
    // dig +dnssec must come before general nslookup/dig so the more-specific
    // pattern wins the dispatch
    { match: (cmd) => cmd.startsWith('dig +dnssec '),            handler: _cliDigDnssec },
    { match: (cmd) => cmd.startsWith('nslookup ') || cmd.startsWith('dig '), handler: _cliNslookup },
    { match: ['show ipv6 interface', 'show ipv6 interface brief'], handler: _cliShowIpv6Interface },
    { match: 'show ipv6 route',                                  handler: _cliShowIpv6Route },
    { match: ['show ip bgp', 'show ip bgp summary', 'show bgp'], handler: _cliShowIpBgp },
    { match: ['show ip eigrp neighbors', 'show eigrp neighbors'], handler: _cliShowEigrpNeighbors },
    { match: ['show ip eigrp topology', 'show eigrp topology'],  handler: _cliShowEigrpTopology },
    { match: ['show dnssec', 'show dns security'],               handler: _cliShowDnssec },
    { match: ['show ip dhcp snooping', 'show dhcp snooping'],    handler: _cliShowDhcpSnooping },
    { match: ['show ip arp inspection', 'show dai'],             handler: _cliShowArpInspection },
    { match: ['show qos counters', 'show qos queue', 'show qos stats'], handler: _cliShowQosCounters },
    { match: 'show spanning-tree detail',                        handler: _cliShowStpDetail },
    { match: ['configure terminal', 'config t', 'conf t'],       handler: _cliConfigureTerminal },
    { match: (cmd) => cmd.startsWith('hostname '),               handler: _cliHostname },
    { match: (cmd) => cmd.startsWith('ip route '),               handler: _cliIpRoute },
    { match: ['show running-config', 'show run'],                handler: _cliShowRunningConfig },
    { match: (cmd) => cmd === 'help' || cmd === '?',             handler: _cliHelp }
  ];
  
  function _tbCliMatches(matchSpec, cmd) {
    if (typeof matchSpec === 'string') return matchSpec === cmd;
    if (Array.isArray(matchSpec)) return matchSpec.indexOf(cmd) !== -1;
    if (typeof matchSpec === 'function') return !!matchSpec(cmd);
    return false;
  }
  
  function tbProcessCliCommand(dev, cmd) {
    for (const entry of _TB_CLI_COMMANDS) {
      if (_tbCliMatches(entry.match, cmd)) {
        return entry.handler(dev, cmd);
      }
    }
    return `Unknown command: "${cmd}". Type "help" for available commands.`;
  }
  
  // Double-click detection moved into tbOnDeviceMouseDown (manual timestamp
  // check) because native dblclick cannot fire reliably — tbRenderCanvas
  // destroys and recreates device DOM nodes after every mousedown, so the
  // second click lands on a fresh element that never saw the first click.
  // The old tbAttachDoubleClick() per-element listener approach is removed.
  
  // ══════════════════════════════════════════
  // TOPOLOGY BUILDER — Subnet & Simulation Engine
  // ══════════════════════════════════════════
  
  // IP utility helpers
  function tbIpToArr(ip) {
    if (!ip) return null;
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return null;
    return parts;
  }
  function tbArrToIp(arr) { return arr.join('.'); }
  function tbSubnetOf(ip, mask) {
    const ipA = tbIpToArr(ip), mA = tbIpToArr(mask);
    if (!ipA || !mA) return null;
    return tbArrToIp(ipA.map((o, i) => o & mA[i]));
  }
  function tbBroadcastOf(ip, mask) {
    const ipA = tbIpToArr(ip), mA = tbIpToArr(mask);
    if (!ipA || !mA) return null;
    return tbArrToIp(ipA.map((o, i) => (o & mA[i]) | (~mA[i] & 255)));
  }
  function tbSameSubnet(ip1, ip2, mask) {
    return tbSubnetOf(ip1, mask) === tbSubnetOf(ip2, mask);
  }
  function tbMaskToCidr(mask) {
    const a = tbIpToArr(mask);
    if (!a) return '24';
    return String(a.reduce((c, o) => c + o.toString(2).split('').filter(b => b === '1').length, 0));
  }
  
  // Find all devices reachable at L2 from a given device/interface within a VLAN
  function tbGetBroadcastDomain(state, srcDeviceId, vlan) {
    const visited = new Set();
    const members = []; // [{deviceId, ifaceName}]
    const queue = [srcDeviceId];
    visited.add(srcDeviceId);
    while (queue.length) {
      const devId = queue.shift();
      const dev = state.devices.find(d => d.id === devId);
      if (!dev || !dev.interfaces) continue;
      // Collect interfaces on this device in the target VLAN
      dev.interfaces.forEach(ifc => {
        const inVlan = (ifc.mode === 'access' && ifc.vlan === vlan) || (ifc.mode === 'trunk' && ifc.trunkAllowed.indexOf(vlan) >= 0);
        if (inVlan && ifc.cableId && ifc.enabled) {
          members.push({ deviceId: devId, ifaceName: ifc.name, mac: ifc.mac, ip: ifc.ip });
          // Walk the cable to the peer device
          const cable = state.cables.find(c => c.id === ifc.cableId);
          if (cable) {
            const peerId = cable.from === devId ? cable.to : cable.from;
            if (!visited.has(peerId)) {
              // Check peer's interface is also in this VLAN (or trunk carrying it)
              const peer = state.devices.find(d => d.id === peerId);
              if (peer && peer.interfaces) {
                const peerIface = peer.interfaces.find(pi => pi.cableId === cable.id);
                if (peerIface && peerIface.enabled) {
                  const peerInVlan = (peerIface.mode === 'access' && peerIface.vlan === vlan) ||
                                     (peerIface.mode === 'trunk' && peerIface.trunkAllowed.indexOf(vlan) >= 0);
                  if (peerInVlan) {
                    visited.add(peerId);
                    queue.push(peerId);
                  }
                }
              }
            }
          }
        }
      });
    }
    return members;
  }
  
  // ── ARP Simulation ──
  function tbSimARP(state, srcDeviceId, targetIp) {
    const log = [];
    const dev = state.devices.find(d => d.id === srcDeviceId);
    if (!dev) { log.push('[ERR] Source device not found.'); return { log, resolved: null }; }
  
    // Find source interface (first with an IP in the same subnet as targetIp, or first with an IP)
    let srcIface = dev.interfaces.find(ifc => ifc.ip && ifc.enabled && tbSameSubnet(ifc.ip, targetIp, ifc.mask));
    if (!srcIface) srcIface = dev.interfaces.find(ifc => ifc.ip && ifc.enabled);
    if (!srcIface) { log.push('[ERR] No interface with an IP address on source device.'); return { log, resolved: null }; }
  
    // Check ARP table cache first
    const cached = dev.arpTable.find(e => e.ip === targetIp);
    if (cached) {
      log.push(`[ARP] Cache hit: ${targetIp} → ${cached.mac}`);
      return { log, resolved: cached.mac };
    }
  
    const vlan = srcIface.vlan || 1;
    log.push(`[ARP] ${dev.hostname} (${srcIface.name}) sends ARP Request: Who has ${targetIp}? Tell ${srcIface.ip}`);
    log.push(`[ARP] Broadcasting on VLAN ${vlan}...`);
  
    // Get broadcast domain
    const domain = tbGetBroadcastDomain(state, srcDeviceId, vlan);
  
    // Search for the target IP in the domain
    let resolvedMac = null;
    let responder = null;
    for (const member of domain) {
      if (member.deviceId === srcDeviceId) continue;
      const peerDev = state.devices.find(d => d.id === member.deviceId);
      if (!peerDev) continue;
      const matchIface = peerDev.interfaces.find(ifc => ifc.ip === targetIp && ifc.enabled);
      if (matchIface) {
        resolvedMac = matchIface.mac;
        responder = peerDev;
        log.push(`[ARP] ${peerDev.hostname} (${matchIface.name}) replies: ${targetIp} is at ${matchIface.mac}`);
        // Update ARP tables on both sides
        dev.arpTable.push({ ip: targetIp, mac: matchIface.mac, iface: srcIface.name, age: 0 });
        peerDev.arpTable.push({ ip: srcIface.ip, mac: srcIface.mac, iface: matchIface.name, age: 0 });
        // Update switch MAC tables along the path
        domain.forEach(m => {
          const sw = state.devices.find(d => d.id === m.deviceId);
          if (sw && sw.type.indexOf('switch') >= 0) {
            if (!sw.macTable.find(e => e.mac === matchIface.mac)) {
              sw.macTable.push({ mac: matchIface.mac, vlan, port: m.ifaceName });
            }
            if (!sw.macTable.find(e => e.mac === srcIface.mac)) {
              sw.macTable.push({ mac: srcIface.mac, vlan, port: m.ifaceName });
            }
          }
        });
        break;
      }
    }
  
    if (!resolvedMac) {
      log.push(`[ARP] No response for ${targetIp} — host unreachable in VLAN ${vlan}.`);
    }
    tbSaveDraft();
    return { log, resolved: resolvedMac, srcDevice: dev, responder };
  }
  
  // ── Ping Simulation ──
  function tbSimPing(state, srcDeviceId, dstIp, ttl) {
    const log = [];
    ttl = ttl || 64;
    const dev = state.devices.find(d => d.id === srcDeviceId);
    if (!dev) { log.push('[ERR] Source device not found.'); return { log, success: false }; }
  
    // Find outgoing interface
    let outIface = null;
    let nextHopIp = dstIp;
    let directDelivery = false;
  
    // Check if destination is on a directly connected subnet
    for (const ifc of dev.interfaces) {
      if (ifc.ip && ifc.enabled && tbSameSubnet(ifc.ip, dstIp, ifc.mask)) {
        outIface = ifc;
        directDelivery = true;
        break;
      }
    }
  
    // If not direct, check routing table
    if (!outIface && dev.routingTable.length) {
      // Longest prefix match
      let bestLen = -1;
      for (const route of dev.routingTable) {
        const rCidr = parseInt(tbMaskToCidr(route.mask));
        if (tbSameSubnet(dstIp, route.network, route.mask) && rCidr > bestLen) {
          bestLen = rCidr;
          nextHopIp = route.nextHop || dstIp;
          outIface = dev.interfaces.find(ifc => ifc.name === route.iface && ifc.enabled) || dev.interfaces.find(ifc => ifc.ip && ifc.enabled);
        }
      }
    }
  
    // If not direct and no route, try default gateway (endpoints)
    if (!outIface) {
      const gwIface = dev.interfaces.find(ifc => ifc.gateway && ifc.enabled);
      if (gwIface) {
        outIface = gwIface;
        nextHopIp = gwIface.gateway;
      }
    }
  
    if (!outIface || !outIface.ip) {
      log.push(`[ICMP] ${dev.hostname}: Destination unreachable — no route to ${dstIp}`);
      return { log, success: false };
    }
  
    log.push(`[ICMP] ${dev.hostname} → ping ${dstIp} (via ${outIface.name}, TTL=${ttl})`);
  
    // ARP for the next hop (or destination if direct)
    const arpTarget = directDelivery ? dstIp : nextHopIp;
    const arpResult = tbSimARP(state, dev.id, arpTarget);
    log.push(...arpResult.log);
  
    if (!arpResult.resolved) {
      log.push(`[ICMP] ${dev.hostname}: Destination host unreachable (ARP failed for ${arpTarget})`);
      return { log, success: false, path: [dev.id] };
    }
  
    if (directDelivery) {
      // Destination is on our subnet — delivered
      const dstDev = state.devices.find(d => d.interfaces && d.interfaces.some(ifc => ifc.ip === dstIp));
      if (dstDev) {
        log.push(`[ICMP] Reply from ${dstDev.hostname} (${dstIp}): bytes=64 TTL=${ttl}`);
        return { log, success: true, path: [dev.id, dstDev.id] };
      }
      log.push(`[ICMP] Reply from ${dstIp}: bytes=64 TTL=${ttl}`);
      return { log, success: true, path: [dev.id] };
    }
  
    // Forward to next hop router
    const nextHopDev = state.devices.find(d => d.interfaces && d.interfaces.some(ifc => ifc.ip === nextHopIp));
    if (!nextHopDev) {
      log.push(`[ICMP] ${dev.hostname}: Next hop ${nextHopIp} unreachable.`);
      return { log, success: false, path: [dev.id] };
    }
  
    if (ttl <= 1) {
      log.push(`[ICMP] TTL expired in transit at ${nextHopDev.hostname}.`);
      return { log, success: false, path: [dev.id, nextHopDev.id] };
    }
  
    // Recursive: next hop router pings the destination
    log.push(`[ICMP] → Forwarded to ${nextHopDev.hostname} (${nextHopIp})`);
    const fwdResult = tbSimPing(state, nextHopDev.id, dstIp, ttl - 1);
    log.push(...fwdResult.log);
    const path = [dev.id, ...(fwdResult.path || [])];
    return { log, success: fwdResult.success, path };
  }
  
  // ── v4.61.0 Per-Hop Packet Trace (issue #185) ──
  // Pure function — given a topology + source device + dest IP, walks the path
  // hop-by-hop and emits a structured array of decision records for the trace
  // UI. Does NOT mutate tbState (no ARP cache updates, no packet animation —
  // those are kept in tbSimPing / tbSimARP so the live sim path stays intact).
  //
  // Hop shape:
  //   { layer: 'ARP'|'L3'|'DELIVER'|'FAIL',
  //     device: <hostname>, deviceId: <id>,
  //     decision: <plain-english string>,
  //     meta: { srcIp, dstIp, srcMac, dstMac, ttlBefore, ttlAfter,
  //             outIface, nextHopIp, arpCached, vlan, iface },
  //     status: 'ok'|'fail' }
  //
  // v1 scope: L3 decision points only (hosts + routers + destination + fail).
  // Switches are visible as visited-ring nodes on the canvas but don't get
  // dedicated hop rows in v1 — adding explicit L2 switch rows is a v4.61.1
  // polish ship if the pedagogy wants them broken out.
  function tbComputeTrace(state, srcDeviceId, dstIp, maxTtl) {
    maxTtl = maxTtl || 64;
    const hops = [];
    const devices = (state && state.devices) || [];
    const findDev = id => devices.find(d => d.id === id);
    const findDevByIp = ip => devices.find(d => d.interfaces && d.interfaces.some(i => i.ip === ip && i.enabled));
  
    const srcDev = findDev(srcDeviceId);
    if (!srcDev) {
      return {
        hops: [{ layer: 'FAIL', device: '?', deviceId: null, decision: 'Source device not found.', meta: {}, status: 'fail' }],
        success: false, path: []
      };
    }
  
    // Find source interface: prefer one in the dst subnet, else first enabled with an IP
    let srcIface = null;
    if (Array.isArray(srcDev.interfaces)) {
      srcIface = srcDev.interfaces.find(i => i.ip && i.enabled && tbSameSubnet(i.ip, dstIp, i.mask))
              || srcDev.interfaces.find(i => i.ip && i.enabled);
    }
    if (!srcIface) {
      return {
        hops: [{ layer: 'FAIL', device: srcDev.hostname || srcDev.id, deviceId: srcDev.id,
                 decision: 'No interface with an IP address on source device.', meta: {}, status: 'fail' }],
        success: false, path: [srcDev.id]
      };
    }
  
    const originalSrcIp = srcIface.ip;
    const originalSrcMac = srcIface.mac || '00:00:00:00:00:00';
    let ttl = maxTtl;
    let currentSrcMac = originalSrcMac;
    let currentDstMac = null;
    let currentDevId = srcDeviceId;
    const visited = new Set();
    const path = [];
  
    for (let iter = 0; iter < 32; iter++) {
      if (visited.has(currentDevId)) {
        hops.push({ layer: 'FAIL', device: 'Loop', deviceId: currentDevId,
                    decision: 'Routing loop detected — packet dropped.', meta: { ttl }, status: 'fail' });
        return { hops, success: false, path };
      }
      visited.add(currentDevId);
      path.push(currentDevId);
  
      const currDev = findDev(currentDevId);
      if (!currDev) break;
  
      // Are we the destination? (dstIp is on one of our interfaces)
      const dstLocalIface = (currDev.interfaces || []).find(i => i.ip === dstIp && i.enabled);
      if (dstLocalIface) {
        hops.push({
          layer: 'DELIVER',
          device: currDev.hostname || currDev.id,
          deviceId: currDev.id,
          decision: `Frame accepted. ICMP Echo Request delivered to kernel on ${dstLocalIface.name}.`,
          meta: { srcIp: originalSrcIp, dstIp, ttl, iface: dstLocalIface.name },
          status: 'ok'
        });
        return { hops, success: true, path };
      }
  
      // Find outgoing interface + next-hop IP
      let outIface = null;
      let nextHopIp = dstIp;
      let directDelivery = false;
  
      // Direct delivery: dstIp in one of our connected subnets
      for (const ifc of (currDev.interfaces || [])) {
        if (ifc.ip && ifc.enabled && tbSameSubnet(ifc.ip, dstIp, ifc.mask)) {
          outIface = ifc;
          directDelivery = true;
          break;
        }
      }
      // Route lookup (longest prefix match) if not direct
      let routeMatched = null;
      if (!outIface && Array.isArray(currDev.routingTable) && currDev.routingTable.length) {
        let bestLen = -1;
        for (const route of currDev.routingTable) {
          const rCidr = parseInt(tbMaskToCidr(route.mask));
          if (tbSameSubnet(dstIp, route.network, route.mask) && rCidr > bestLen) {
            bestLen = rCidr;
            nextHopIp = route.nextHop || dstIp;
            outIface = (currDev.interfaces || []).find(i => i.name === route.iface && i.enabled)
                    || (currDev.interfaces || []).find(i => i.ip && i.enabled);
            routeMatched = `${route.network}/${tbMaskToCidr(route.mask)}`;
          }
        }
      }
      // Fallback: host default gateway on first hop
      if (!outIface && iter === 0) {
        const gwIface = (currDev.interfaces || []).find(i => i.gateway && i.enabled);
        if (gwIface) { outIface = gwIface; nextHopIp = gwIface.gateway; }
      }
  
      if (!outIface || !outIface.ip) {
        hops.push({
          layer: 'FAIL',
          device: currDev.hostname || currDev.id,
          deviceId: currDev.id,
          decision: `No route to ${dstIp} — packet dropped.`,
          meta: { srcIp: originalSrcIp, dstIp, ttl, reason: 'no-route' },
          status: 'fail'
        });
        return { hops, success: false, path };
      }
  
      // Resolve next-hop MAC via ARP (cache-first, fall back to broadcast-domain search)
      const arpTarget = directDelivery ? dstIp : nextHopIp;
      let resolvedMac = null;
      let arpCached = false;
      const cachedArp = (currDev.arpTable || []).find(a => a.ip === arpTarget);
      if (cachedArp) {
        resolvedMac = cachedArp.mac;
        arpCached = true;
      } else {
        // Simulate ARP: find owner of arpTarget in the broadcast domain
        try {
          const vlan = outIface.vlan || 1;
          const domain = tbGetBroadcastDomain(state, currentDevId, vlan);
          for (const member of domain) {
            if (member.deviceId === currentDevId) continue;
            const peer = findDev(member.deviceId);
            if (!peer) continue;
            const peerIface = (peer.interfaces || []).find(i => i.ip === arpTarget && i.enabled);
            if (peerIface) { resolvedMac = peerIface.mac; break; }
          }
        } catch (_) {}
      }
  
      // Emit the hop row for the current device
      if (iter === 0) {
        // Source host: ARP layer
        hops.push({
          layer: 'ARP',
          device: currDev.hostname || currDev.id,
          deviceId: currDev.id,
          decision: resolvedMac
            ? (arpCached
                ? `ARP cache hit: ${arpTarget} is at ${resolvedMac}. Encapsulated into Ethernet frame.`
                : `ARP broadcast for ${arpTarget} → resolved to ${resolvedMac}. Encapsulated.`)
            : `ARP failed: no response for ${arpTarget} — destination unreachable.`,
          meta: {
            srcIp: originalSrcIp, dstIp, ttl,
            outIface: outIface.name, nextHopIp,
            srcMac: currentSrcMac,
            dstMac: resolvedMac || null,
            arpCached
          },
          status: resolvedMac ? 'ok' : 'fail'
        });
        if (!resolvedMac) return { hops, success: false, path };
        currentDstMac = resolvedMac;
      } else {
        // Intermediate router: L3 layer — route lookup + MAC rewrite + TTL decrement
        const newSrcMac = outIface.mac || currentSrcMac;
        const ttlBefore = ttl;
        const ttlAfter = ttl - 1;
        const decisionPrefix = directDelivery
          ? `Destination ${dstIp} is a connected route on ${outIface.name}.`
          : `Route lookup: matched ${routeMatched || dstIp} via next-hop ${nextHopIp} on ${outIface.name}.`;
        hops.push({
          layer: 'L3',
          device: currDev.hostname || currDev.id,
          deviceId: currDev.id,
          decision: `${decisionPrefix} MACs rewritten, TTL decremented. ARP ${arpCached ? 'cache hit' : (resolvedMac ? 'resolved' : 'failed')}.`,
          meta: {
            srcIp: originalSrcIp, dstIp,
            ttlBefore, ttlAfter,
            outIface: outIface.name, nextHopIp,
            srcMac: `${currentSrcMac} → ${newSrcMac}`,
            dstMac: resolvedMac ? `${currentDstMac || '?'} → ${resolvedMac}` : '(ARP failed)',
            arpCached, routeMatched, directDelivery
          },
          status: resolvedMac ? 'ok' : 'fail'
        });
        if (!resolvedMac) return { hops, success: false, path };
        currentSrcMac = newSrcMac;
        currentDstMac = resolvedMac;
        ttl = ttlAfter;
        if (ttl <= 0) {
          hops.push({
            layer: 'FAIL',
            device: currDev.hostname || currDev.id,
            deviceId: currDev.id,
            decision: `TTL expired in transit (TTL=0). ICMP Time Exceeded returned to source.`,
            meta: { srcIp: originalSrcIp, dstIp, ttl: 0, reason: 'ttl-expired' },
            status: 'fail'
          });
          return { hops, success: false, path };
        }
      }
  
      // Advance current device
      if (directDelivery) {
        const dstDev = findDevByIp(dstIp);
        if (dstDev && dstDev.id !== currentDevId) { currentDevId = dstDev.id; continue; }
        // External IP or unattached — treat as delivered
        hops.push({
          layer: 'DELIVER', device: dstIp, deviceId: null,
          decision: `Frame delivered to ${dstIp}.`,
          meta: { srcIp: originalSrcIp, dstIp, ttl }, status: 'ok'
        });
        return { hops, success: true, path };
      }
  
      const nextDev = findDevByIp(nextHopIp);
      if (!nextDev) {
        hops.push({
          layer: 'FAIL', device: '?', deviceId: null,
          decision: `Next hop ${nextHopIp} unreachable — no device with that IP.`,
          meta: { srcIp: originalSrcIp, dstIp, ttl, reason: 'no-next-hop' }, status: 'fail'
        });
        return { hops, success: false, path };
      }
      currentDevId = nextDev.id;
    }
  
    return { hops, success: false, path };
  }
  
  // ── v4.61.0 Trace mode state machine + UI ──
  
  function tbOpenTraceDialog() {
    // Simple prompt-style dialog: pick source device + dst IP
    const devices = (tbState && tbState.devices) || [];
    const hosts = devices.filter(d => d && Array.isArray(d.interfaces) && d.interfaces.some(i => i.ip));
    if (hosts.length === 0) {
      if (typeof toast === 'function') toast('Add devices + IPs before tracing.');
      return;
    }
    // Offer the ping dialog's src input pattern: pick first host with IP, prompt for dst
    const srcDev = hosts.find(d => d.type && (d.type.indexOf('host') >= 0 || d.type.indexOf('laptop') >= 0 || d.type.indexOf('phone') >= 0)) || hosts[0];
    const srcIface = srcDev.interfaces.find(i => i.ip && i.enabled);
    const defaultDst = (() => {
      const other = hosts.find(d => d.id !== srcDev.id);
      if (other) {
        const oi = other.interfaces.find(i => i.ip && i.enabled);
        if (oi) return oi.ip;
      }
      return '';
    })();
    const dstIp = (typeof prompt === 'function')
      ? prompt(`Trace packet from ${srcDev.hostname} (${srcIface ? srcIface.ip : '?'}) → destination IP:`, defaultDst)
      : defaultDst;
    if (!dstIp) return;
    tbStartTrace(srcDev.id, dstIp.trim());
  }
  
  function tbStartTrace(srcId, dstIp) {
    const trace = tbComputeTrace(tbState, srcId, dstIp, 64);
    if (!trace || !trace.hops || trace.hops.length === 0) {
      if (typeof toast === 'function') toast('Could not compute trace.');
      return;
    }
    // Stop any running sim/animation
    if (_tbUiState.trace.playTimer) { clearTimeout(_tbUiState.trace.playTimer); _tbUiState.trace.playTimer = null; }
    _tbUiState.trace = {
      active: true,
      trace,
      currentHop: 0,
      playing: false,
      playTimer: null,
      speedMs: 1500,
      srcId, dstIp
    };
    const panel = document.getElementById('tb-trace-panel');
    if (panel) panel.hidden = false;
    tbRenderTraceLog();
    tbRenderTraceCanvasState();
    // Auto-play unless reduced-motion
    const rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!rm) tbTracePlay();
  }
  
  function tbEndTrace() {
    if (_tbUiState.trace.playTimer) { clearTimeout(_tbUiState.trace.playTimer); _tbUiState.trace.playTimer = null; }
    _tbUiState.trace.active = false;
    _tbUiState.trace.playing = false;
    _tbUiState.trace.trace = null;
    _tbUiState.trace.currentHop = 0;
    const panel = document.getElementById('tb-trace-panel');
    if (panel) panel.hidden = true;
    // Reset canvas decorations
    tbRenderTraceCanvasState();
  }
  
  function tbTracePlay() {
    if (!_tbUiState.trace.active || !_tbUiState.trace.trace) return;
    _tbUiState.trace.playing = true;
    tbRenderTraceLog(); // refresh play-btn label
    const tick = () => {
      if (!_tbUiState.trace.playing || !_tbUiState.trace.active) return;
      if (_tbUiState.trace.currentHop >= _tbUiState.trace.trace.hops.length - 1) {
        _tbUiState.trace.playing = false;
        tbRenderTraceLog();
        return;
      }
      _tbUiState.trace.currentHop++;
      tbRenderTraceLog();
      tbRenderTraceCanvasState();
      _tbUiState.trace.playTimer = setTimeout(tick, _tbUiState.trace.speedMs);
    };
    _tbUiState.trace.playTimer = setTimeout(tick, _tbUiState.trace.speedMs);
  }
  
  function tbTracePause() {
    _tbUiState.trace.playing = false;
    if (_tbUiState.trace.playTimer) { clearTimeout(_tbUiState.trace.playTimer); _tbUiState.trace.playTimer = null; }
    tbRenderTraceLog();
  }
  
  function tbTraceStep() {
    if (!_tbUiState.trace.active || !_tbUiState.trace.trace) return;
    tbTracePause();
    if (_tbUiState.trace.currentHop < _tbUiState.trace.trace.hops.length - 1) {
      _tbUiState.trace.currentHop++;
      tbRenderTraceLog();
      tbRenderTraceCanvasState();
    }
  }
  
  function tbTraceReset() {
    if (!_tbUiState.trace.active || !_tbUiState.trace.trace) return;
    tbTracePause();
    _tbUiState.trace.currentHop = 0;
    tbRenderTraceLog();
    tbRenderTraceCanvasState();
  }
  
  function tbTraceSpeedToggle() {
    // Cycle: 1500 → 750 → 3000 → 1500
    const cur = _tbUiState.trace.speedMs;
    _tbUiState.trace.speedMs = cur === 1500 ? 750 : cur === 750 ? 3000 : 1500;
    tbRenderTraceLog();
  }
  
  // v4.85.7: hop-row renderer extracted from tbRenderTraceLog() for length budget.
  // Computes the visual state (done/current/future/failed), layer pill class,
  // optional "current" marker, and meta row (MAC/IP/TTL/iface). Pure HTML out.
  function _tbRenderTraceHop(h, i, curr, esc) {
    let state;
    if (i < curr) state = 'done';
    else if (i === curr) state = 'current';
    else state = 'future';
    if (h.status === 'fail' && i === curr) state = 'failed';
    if (h.status === 'fail' && i < curr) state = 'failed';
  
    const layerClass = h.layer === 'L2' ? 'l2'
                     : h.layer === 'L3' ? 'l3'
                     : h.layer === 'ARP' ? 'arp'
                     : h.layer === 'FAIL' ? 'fail'
                     : 'arp';
    const layerLabel = h.layer === 'DELIVER' ? 'DELIVER' : h.layer;
    const currentPill = (i === curr) ? '<span class="tb-trace-current-pill">► current</span>' : '';
    const m = h.meta || {};
    const metaBits = [];
    if (m.srcMac) metaBits.push(`<span><span class="tb-trace-meta-k">src MAC</span> <span class="tb-trace-meta-v">${esc(m.srcMac)}</span></span>`);
    if (m.dstMac) metaBits.push(`<span><span class="tb-trace-meta-k">dst MAC</span> <span class="tb-trace-meta-v">${esc(m.dstMac)}</span></span>`);
    if (m.srcIp) metaBits.push(`<span><span class="tb-trace-meta-k">src IP</span> <span class="tb-trace-meta-v">${esc(m.srcIp)}</span></span>`);
    if (m.dstIp) metaBits.push(`<span><span class="tb-trace-meta-k">dst IP</span> <span class="tb-trace-meta-v">${esc(m.dstIp)}</span></span>`);
    if (typeof m.ttlBefore === 'number' && typeof m.ttlAfter === 'number') {
      metaBits.push(`<span><span class="tb-trace-meta-k">TTL</span> <span class="tb-trace-meta-v">${m.ttlBefore} → ${m.ttlAfter}</span></span>`);
    } else if (typeof m.ttl === 'number') {
      metaBits.push(`<span><span class="tb-trace-meta-k">TTL</span> <span class="tb-trace-meta-v">${m.ttl}</span></span>`);
    }
    if (m.outIface) metaBits.push(`<span><span class="tb-trace-meta-k">out</span> <span class="tb-trace-meta-v">${esc(m.outIface)}</span></span>`);
  
    return `<div class="tb-trace-hop tb-trace-hop-${state}">
      <div class="tb-trace-hop-dot"></div>
      <div class="tb-trace-hop-header">
        <span class="tb-trace-hop-device">${esc(h.device)}</span>
        <span class="tb-trace-hop-layer tb-trace-hop-layer-${layerClass}">${esc(layerLabel)}</span>
        ${currentPill}
      </div>
      <div class="tb-trace-hop-decision">${esc(h.decision)}</div>
      ${metaBits.length ? `<div class="tb-trace-hop-meta">${metaBits.join('')}</div>` : ''}
    </div>`;
  }
  
  // ── Trace log panel renderer ──
  function tbRenderTraceLog() {
    const host = document.getElementById('tb-trace-panel');
    if (!host) return;
    if (!_tbUiState.trace.active || !_tbUiState.trace.trace) { host.hidden = true; return; }
    const esc = (typeof escHtml === 'function') ? escHtml : (s => s);
    const t = _tbUiState.trace.trace;
    const curr = _tbUiState.trace.currentHop;
    const srcDev = (tbState.devices || []).find(d => d.id === _tbUiState.trace.srcId);
    const srcName = srcDev ? (srcDev.hostname || srcDev.id) : '?';
    const total = t.hops.length;
    const status = t.success ? `${total} hops · delivered` : `${total} hops · failed`;
  
    const hopsHtml = t.hops.map((h, i) => _tbRenderTraceHop(h, i, curr, esc)).join('');
  
    const atEnd = curr >= total - 1;
    const playBtnLabel = _tbUiState.trace.playing ? '⏸' : (atEnd ? '↻' : '▶');
    const playBtnAction = _tbUiState.trace.playing ? 'tbTracePause()' : (atEnd ? 'tbTraceReset()' : 'tbTracePlay()');
    const speedLabel = _tbUiState.trace.speedMs === 750 ? '2.0×' : _tbUiState.trace.speedMs === 3000 ? '0.5×' : '1.0×';
    const progressPct = Math.min(100, Math.round(((curr + 1) / total) * 100));
  
    host.innerHTML = `
      <div class="tb-trace-head">
        <button type="button" class="tb-trace-close" onclick="tbEndTrace()" aria-label="Exit trace mode" title="Exit trace">×</button>
        <div class="tb-trace-eyebrow">Trace · live replay</div>
        <div class="tb-trace-title">Ping <em>${esc(_tbUiState.trace.dstIp)}</em></div>
        <div class="tb-trace-sub">${esc(srcName)} → ${esc(_tbUiState.trace.dstIp)} · ${esc(status)}</div>
      </div>
      <div class="tb-trace-hops">${hopsHtml}</div>
      <div class="tb-trace-playback">
        <button type="button" class="tb-trace-btn" onclick="tbTraceReset()" title="Reset">⏮</button>
        <button type="button" class="tb-trace-btn tb-trace-btn-primary" onclick="${playBtnAction}" title="${_tbUiState.trace.playing ? 'Pause' : (atEnd ? 'Reset' : 'Play')}">${playBtnLabel}</button>
        <button type="button" class="tb-trace-btn" onclick="tbTraceStep()" title="Step">⏭</button>
        <div class="tb-trace-progress">
          <div class="tb-trace-progress-labels">
            <span>HOP ${Math.min(curr + 1, total)} OF ${total}</span>
            <span>${_tbUiState.trace.speedMs}ms / hop</span>
          </div>
          <div class="tb-trace-progress-track">
            <div class="tb-trace-progress-fill" style="width:${progressPct}%"></div>
          </div>
        </div>
        <button type="button" class="tb-trace-speed" onclick="tbTraceSpeedToggle()" title="Speed">⏱ ${speedLabel}</button>
      </div>`;
  }
  
  // ── Canvas decorations: node highlights, traced/pending links, packet pill + badge ──
  function tbRenderTraceCanvasState() {
    // v4.64.0: single hook-point — mirror trace state into 3D (Phase 2).
    // tb3d.js is render-only; passing null when inactive clears the 3D HUD.
    if (_tb3dModule && _tb3dModule.setTraceState) {
      try { _tb3dModule.setTraceState(_tbUiState.trace); } catch (_) { /* render-side errors don't affect 2D */ }
    }
  
    const svg = document.getElementById('tb-canvas');
    if (!svg) return;
  
    // Always clean up old decorations first
    svg.querySelectorAll('.tb-trace-deco').forEach(el => el.remove());
  
    if (!_tbUiState.trace.active || !_tbUiState.trace.trace) return;
  
    const t = _tbUiState.trace.trace;
    const curr = _tbUiState.trace.currentHop;
    const currentHop = t.hops[curr];
    const visitedIds = new Set();
    for (let i = 0; i <= curr; i++) {
      const h = t.hops[i];
      if (h.deviceId) visitedIds.add(h.deviceId);
    }
    const currentId = currentHop && currentHop.deviceId;
  
    // Apply visited/current classes to device groups. The existing renderer tags
    // them with data-tb-device; we set classes without rewriting DOM so the
    // existing drag/click handlers keep working.
    svg.querySelectorAll('[data-tb-device]').forEach(g => {
      g.classList.remove('tb-trace-visited', 'tb-trace-current', 'tb-trace-pending');
      const id = g.getAttribute('data-tb-device');
      if (id === currentId) g.classList.add('tb-trace-current');
      else if (visitedIds.has(id)) g.classList.add('tb-trace-visited');
      else g.classList.add('tb-trace-pending');
    });
  
    // Packet pill + inline badge anchored to current device
    const currDev = currentId ? (tbState.devices || []).find(d => d.id === currentId) : null;
    if (currDev && typeof currDev.x === 'number' && typeof currDev.y === 'number') {
      const gNS = 'http://www.w3.org/2000/svg';
      const deco = document.createElementNS(gNS, 'g');
      deco.classList.add('tb-trace-deco');
      deco.setAttribute('transform', `translate(${currDev.x}, ${currDev.y})`);
  
      // Pulsing yellow packet
      const pkt = document.createElementNS(gNS, 'circle');
      pkt.classList.add('tb-trace-packet');
      pkt.setAttribute('cx', 0);
      pkt.setAttribute('cy', 0);
      pkt.setAttribute('r', 9);
      deco.appendChild(pkt);
  
      // Inline badge for ongoing packet state (ARP + L3 hops show full frame; FAIL shows reason)
      const m = currentHop.meta || {};
      const badgeLines = [];
      badgeLines.push({ k: 'LAYER', v: currentHop.layer });
      if (m.srcMac) badgeLines.push({ k: 'SRC MAC', v: m.srcMac });
      if (m.dstMac) badgeLines.push({ k: 'DST MAC', v: m.dstMac });
      if (m.srcIp) badgeLines.push({ k: 'SRC IP', v: m.srcIp, dim: true });
      if (m.dstIp) badgeLines.push({ k: 'DST IP', v: m.dstIp, dim: true });
      if (typeof m.ttlBefore === 'number' && typeof m.ttlAfter === 'number') {
        badgeLines.push({ k: 'TTL', v: `${m.ttlBefore} → ${m.ttlAfter}`, ttl: true });
      } else if (typeof m.ttl === 'number') {
        badgeLines.push({ k: 'TTL', v: String(m.ttl) });
      }
  
      const badgeW = 260, rowH = 16, headH = 22, padY = 10;
      const badgeH = headH + (badgeLines.length * rowH) + padY;
      const badgeY = -badgeH - 40;
      const badgeX = 30;
  
      const bg = document.createElementNS(gNS, 'rect');
      bg.classList.add('tb-trace-badge-bg');
      if (currentHop.layer === 'FAIL') bg.classList.add('tb-trace-badge-bg-fail');
      bg.setAttribute('x', badgeX);
      bg.setAttribute('y', badgeY);
      bg.setAttribute('width', badgeW);
      bg.setAttribute('height', badgeH);
      bg.setAttribute('rx', 10);
      deco.appendChild(bg);
  
      const arrow = document.createElementNS(gNS, 'path');
      arrow.classList.add('tb-trace-badge-arrow');
      arrow.setAttribute('d', `M 0 -12 L 0 ${badgeY + badgeH / 2} L ${badgeX} ${badgeY + badgeH / 2}`);
      deco.appendChild(arrow);
  
      // Head label (layer)
      const head = document.createElementNS(gNS, 'text');
      head.classList.add('tb-trace-badge-head');
      head.setAttribute('x', badgeX + 12);
      head.setAttribute('y', badgeY + 16);
      head.textContent = currentHop.layer === 'FAIL' ? '✗ FAILURE' : 'IN-FLIGHT FRAME';
      deco.appendChild(head);
  
      // Row lines (skip LAYER since it's in head)
      let rowY = badgeY + headH + 10;
      badgeLines.slice(1).forEach(line => {
        const k = document.createElementNS(gNS, 'text');
        k.classList.add('tb-trace-badge-key');
        k.setAttribute('x', badgeX + 12);
        k.setAttribute('y', rowY);
        k.textContent = line.k;
        deco.appendChild(k);
        const v = document.createElementNS(gNS, 'text');
        v.classList.add(line.ttl ? 'tb-trace-badge-ttl' : (line.dim ? 'tb-trace-badge-val-dim' : 'tb-trace-badge-val'));
        v.setAttribute('x', badgeX + 86);
        v.setAttribute('y', rowY);
        v.textContent = line.v;
        deco.appendChild(v);
        rowY += rowH;
      });
  
      svg.appendChild(deco);
    }
  }
  
  // v4.62.4: Canvas overlay registry. Replaces the earlier double-wrap
  // pattern where each overlay (v4.61.0 trace, v4.62.0 STP) independently
  // wrapped tbRenderCanvas — that grew fragile the moment a third overlay
  // was contemplated. Now: single-wrap, any number of overlay fns register
  // via tbRegisterOverlay() and they all fire AFTER tbRenderCanvas returns.
  // Errors in one overlay don't block the others (per-overlay try/catch).
  const _tbOverlayRegistry = [];
  function tbRegisterOverlay(fn) {
    if (typeof fn !== 'function') return;
    if (_tbOverlayRegistry.indexOf(fn) !== -1) return; // idempotent
    _tbOverlayRegistry.push(fn);
  }
  (function wireCanvasOverlays() {
    if (typeof tbRenderCanvas !== 'function') return;
    const orig = tbRenderCanvas;
    if (orig._tbOverlaysWrapped) return;
    const wrapped = function () {
      orig.apply(this, arguments);
      for (const overlayFn of _tbOverlayRegistry) {
        try { overlayFn(); } catch (_) {}
      }
    };
    wrapped._tbOverlaysWrapped = true;
    // eslint-disable-next-line no-func-assign
    tbRenderCanvas = wrapped;
  })();
  
  // Register the Per-Hop Packet Trace overlay (v4.61.0)
  tbRegisterOverlay(function _traceOverlay() {
    if (_tbUiState.trace.active) tbRenderTraceCanvasState();
  });
  
  // ── v4.62.0 Spanning Tree Protocol (802.1D) Visualisation (issue #186) ──
  // Pure function: given a topology, compute the converged STP state.
  // Elects a root bridge by lowest bridge-ID (priority.MAC), runs BFS over
  // switch-to-switch cables to establish cost-to-root, assigns root-port +
  // designated-port + blocked-port roles per cable endpoint.
  //
  // Cable endpoint state shape:
  //   { fromRole: 'root'|'designated'|'blocked', toRole: ..., blocked: bool }
  //
  // Simplifications for v1:
  //   - 802.1D only (no RSTP/MST)
  //   - Uniform cost (1 per hop) — no link-speed cost math
  //   - Non-switch cable endpoints are implicitly 'designated' (no STP role)
  //   - MAC tiebreaker uses the first interface's MAC, or the device id
  //     as a synthetic fallback if the device has no interfaces with MACs.
  
  function _tbStpBridgeMac(dev) {
    if (Array.isArray(dev.interfaces)) {
      const withMac = dev.interfaces.find(i => i && typeof i.mac === 'string' && i.mac);
      if (withMac) return withMac.mac;
    }
    // Synthetic: last 12 hex chars of id, padded as a MAC. Deterministic per-id
    // so tiebreakers are stable across renders.
    const id = String(dev.id || '');
    let hex = '';
    for (let i = 0; i < id.length && hex.length < 12; i++) {
      const c = id.charCodeAt(i).toString(16);
      hex += c;
    }
    hex = (hex + '000000000000').slice(0, 12);
    return `${hex.slice(0, 2)}:${hex.slice(2, 4)}:${hex.slice(4, 6)}:${hex.slice(6, 8)}:${hex.slice(8, 10)}:${hex.slice(10, 12)}`;
  }
  
  function _tbStpIsSwitch(dev) {
    return !!(dev && typeof dev.type === 'string' && dev.type.indexOf('switch') >= 0);
  }
  
  function _tbStpBridgeIdStr(priority, mac) {
    return `${priority}.${(mac || '').replace(/[^0-9a-f]/gi, '').toLowerCase()}`;
  }
  
  function tbComputeStpState(state) {
    const result = { rootId: null, bridges: {}, cables: {}, converged: false, blockedCount: 0 };
    const devices = (state && state.devices) || [];
    const cables = (state && state.cables) || [];
  
    const switches = devices.filter(_tbStpIsSwitch);
    if (switches.length === 0) {
      result.converged = true;
      return result;
    }
  
    // Build bridge IDs
    switches.forEach(d => {
      const priority = (typeof d.stpPriority === 'number') ? d.stpPriority : 32768;
      const mac = _tbStpBridgeMac(d);
      result.bridges[d.id] = {
        id: d.id,
        hostname: d.hostname || d.id,
        isRoot: false,
        priority,
        mac,
        bridgeId: _tbStpBridgeIdStr(priority, mac),
        costToRoot: Infinity,
        rootCableId: null
      };
    });
  
    // Elect root — lowest bridge-ID string (priority first, then MAC)
    const sorted = Object.values(result.bridges).slice().sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.mac < b.mac ? -1 : a.mac > b.mac ? 1 : 0;
    });
    const root = sorted[0];
    result.rootId = root.id;
    root.isRoot = true;
    root.costToRoot = 0;
  
    // Build adjacency: for each switch, list cables connecting it to another switch
    const adj = {};
    switches.forEach(d => { adj[d.id] = []; });
    cables.forEach(c => {
      if (!c || !c.id) return;
      const fromSw = _tbStpIsSwitch(devices.find(d => d.id === c.from));
      const toSw = _tbStpIsSwitch(devices.find(d => d.id === c.to));
      if (fromSw && toSw) {
        adj[c.from] && adj[c.from].push({ cableId: c.id, peer: c.to });
        adj[c.to] && adj[c.to].push({ cableId: c.id, peer: c.from });
      }
    });
  
    // BFS from root — uniform cost 1. Also record the parent cable per switch
    // so we can identify root ports (the cable a non-root switch uses to
    // reach root).
    const queue = [root.id];
    const visited = { [root.id]: true };
    while (queue.length) {
      const cur = queue.shift();
      const curCost = result.bridges[cur].costToRoot;
      (adj[cur] || []).forEach(edge => {
        if (!visited[edge.peer]) {
          visited[edge.peer] = true;
          const b = result.bridges[edge.peer];
          if (b) {
            b.costToRoot = curCost + 1;
            b.rootCableId = edge.cableId;
          }
          queue.push(edge.peer);
        }
      });
    }
  
    // Assign port roles per cable
    cables.forEach(c => {
      if (!c || !c.id) { return; }
      const fromDev = devices.find(d => d.id === c.from);
      const toDev = devices.find(d => d.id === c.to);
      if (!fromDev || !toDev) return;
  
      const fromIsSw = _tbStpIsSwitch(fromDev);
      const toIsSw = _tbStpIsSwitch(toDev);
  
      // Non-switch endpoints get no STP role — they're edge devices. Both sides
      // of such a cable render as neutral (no port dot, no block).
      if (!fromIsSw || !toIsSw) {
        result.cables[c.id] = { fromRole: null, toRole: null, blocked: false };
        return;
      }
  
      const fromBridge = result.bridges[c.from];
      const toBridge = result.bridges[c.to];
  
      // Case: this cable IS the BFS-parent for one of the switches → part of the
      // shortest-path tree, forwarding on both sides.
      const fromIsChildViaThisCable = fromBridge && fromBridge.rootCableId === c.id;
      const toIsChildViaThisCable = toBridge && toBridge.rootCableId === c.id;
  
      if (fromIsChildViaThisCable) {
        // `from` sees this cable as its root port → `to` is the parent (closer to
        // root) and owns the designated role on this segment.
        result.cables[c.id] = { fromRole: 'root', toRole: 'designated', blocked: false };
        return;
      }
      if (toIsChildViaThisCable) {
        result.cables[c.id] = { fromRole: 'designated', toRole: 'root', blocked: false };
        return;
      }
  
      // Non-tree cable (would form a loop). One side is designated (lower cost
      // to root, or lower bridge-ID as tiebreaker), the other is blocked.
      let designatedSide = 'from';
      if (fromBridge.costToRoot === toBridge.costToRoot) {
        designatedSide = fromBridge.bridgeId <= toBridge.bridgeId ? 'from' : 'to';
      } else if (fromBridge.costToRoot > toBridge.costToRoot) {
        designatedSide = 'to';
      }
      if (designatedSide === 'from') {
        result.cables[c.id] = { fromRole: 'designated', toRole: 'blocked', blocked: true };
      } else {
        result.cables[c.id] = { fromRole: 'blocked', toRole: 'designated', blocked: true };
      }
      result.blockedCount++;
    });
  
    result.converged = true;
    return result;
  }
  
  // Module-level cache of the most recent STP state so renderers + tests can
  // read it without recomputing. Populated on every tbSaveDraft tick (see hook).
  
  // Decoration renderer — runs AFTER tbRenderCanvas, appends a #tb-stp-layer
  // SVG group with crown markers, port-role dots, role chips. Also toggles a
  // .tb-cable-stp-blocked class on cable conductors for blocked links.
  function tbRenderStpOverlay() {
    const svg = document.getElementById('tb-canvas');
    if (!svg) return;
  
    // Clean up any prior overlay
    const prior = svg.querySelector('#tb-stp-layer');
    if (prior) prior.remove();
    // Also clear any prior blocked-cable class so re-renders don't double up
    svg.querySelectorAll('.tb-cable-stp-blocked').forEach(el => el.classList.remove('tb-cable-stp-blocked'));
    svg.querySelectorAll('[data-tb-device].tb-stp-rethink').forEach(el => el.classList.remove('tb-stp-rethink'));
  
    const stp = _tbUiState.stp;
    if (!stp || !stp.converged || !stp.rootId) return;
  
    const devices = (tbState && tbState.devices) || [];
    const cables = (tbState && tbState.cables) || [];
    const devById = id => devices.find(d => d.id === id);
  
    // Group for overlay elements (below devices but above cables is ideal; we
    // append at end so order is: cables → devices → stp overlay — overlay on top
    // which is fine for small crown + port dots. Blocked-cable styling is done
    // by class on the existing cable path, not by a new element.)
    const NS = 'http://www.w3.org/2000/svg';
    const layer = document.createElementNS(NS, 'g');
    layer.setAttribute('id', 'tb-stp-layer');
    layer.classList.add('tb-stp-layer');
  
    // Mark blocked cables via class toggle on their conductor path
    Object.keys(stp.cables).forEach(cableId => {
      const roles = stp.cables[cableId];
      if (!roles || !roles.blocked) return;
      const cablePath = svg.querySelector(`.tb-cable[data-tb-cable-id="${cableId}"]`)
                     || svg.querySelector(`path.tb-cable-hit[data-tb-cable="${cableId}"]`);
      // The conductor path doesn't carry a data-tb-cable attr — it's a sibling
      // of the hit path. Easier to find via sibling relationship from the hit.
      const hit = svg.querySelector(`[data-tb-cable="${cableId}"]`);
      if (hit && hit.previousElementSibling) {
        hit.previousElementSibling.classList.add('tb-cable-stp-blocked');
      }
    });
  
    // Render crown above the root bridge
    const root = devById(stp.rootId);
    if (root && typeof root.x === 'number' && typeof root.y === 'number') {
      const crownGroup = document.createElementNS(NS, 'g');
      crownGroup.classList.add('tb-stp-crown');
      crownGroup.setAttribute('transform', `translate(${root.x}, ${root.y - 58})`);
      const crownBg = document.createElementNS(NS, 'rect');
      crownBg.classList.add('tb-stp-crown-bg');
      crownBg.setAttribute('x', -30); crownBg.setAttribute('y', -14);
      crownBg.setAttribute('width', 60); crownBg.setAttribute('height', 24);
      crownBg.setAttribute('rx', 12);
      crownGroup.appendChild(crownBg);
      const crownText = document.createElementNS(NS, 'text');
      crownText.classList.add('tb-stp-crown-text');
      crownText.setAttribute('x', -15); crownText.setAttribute('y', 4);
      crownText.textContent = '👑';
      crownGroup.appendChild(crownText);
      const crownLabel = document.createElementNS(NS, 'text');
      crownLabel.classList.add('tb-stp-crown-label');
      crownLabel.setAttribute('x', 14); crownLabel.setAttribute('y', 2);
      crownLabel.textContent = 'Root';
      crownGroup.appendChild(crownLabel);
      // Tooltip for pedagogy
      const crownTitle = document.createElementNS(NS, 'title');
      crownTitle.textContent = 'Root bridge — lowest bridge-ID in the L2 domain';
      crownGroup.appendChild(crownTitle);
      layer.appendChild(crownGroup);
    }
  
    // Render port-role dots at each cable endpoint for switch-to-switch cables
    const HALF_W = 48, HALF_H = 36;
    cables.forEach(c => {
      const roles = stp.cables[c.id];
      if (!roles || (!roles.fromRole && !roles.toRole)) return;
      const from = devById(c.from);
      const to = devById(c.to);
      if (!from || !to) return;
      // Edge points (same math as tbEdgePoint used in render)
      const p1 = (typeof tbEdgePoint === 'function') ? tbEdgePoint(from.x, from.y, to.x, to.y, HALF_W, HALF_H) : { x: from.x, y: from.y };
      const p2 = (typeof tbEdgePoint === 'function') ? tbEdgePoint(to.x, to.y, from.x, from.y, HALF_W, HALF_H) : { x: to.x, y: to.y };
  
      // Helper to append an endpoint dot (+ optional X overlay for blocked)
      const appendEndpoint = (x, y, role, cableBlocked) => {
        if (!role) return;
        const dot = document.createElementNS(NS, 'circle');
        dot.classList.add('tb-stp-port-dot');
        dot.classList.add('tb-stp-port-' + role);
        dot.setAttribute('cx', x); dot.setAttribute('cy', y);
        dot.setAttribute('r', 6.5);
        // Tooltip per port role for pedagogy
        const title = document.createElementNS(NS, 'title');
        title.textContent = role === 'root' ? 'Root port — forwarding toward root bridge'
                          : role === 'designated' ? 'Designated port — forwarding on this segment'
                          : 'Blocked port — cable up but not forwarding (prevents loop)';
        dot.appendChild(title);
        layer.appendChild(dot);
        if (role === 'blocked') {
          // Small ✗ badge above the blocked dot
          const badgeGroup = document.createElementNS(NS, 'g');
          badgeGroup.classList.add('tb-stp-blocked-badge');
          badgeGroup.setAttribute('transform', `translate(${x}, ${y - 18})`);
          const bg = document.createElementNS(NS, 'circle');
          bg.classList.add('tb-stp-blocked-badge-bg');
          bg.setAttribute('cx', 0); bg.setAttribute('cy', 0); bg.setAttribute('r', 8);
          badgeGroup.appendChild(bg);
          const x1 = document.createElementNS(NS, 'path');
          x1.classList.add('tb-stp-blocked-badge-x');
          x1.setAttribute('d', 'M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5');
          badgeGroup.appendChild(x1);
          layer.appendChild(badgeGroup);
        }
      };
      appendEndpoint(p1.x, p1.y, roles.fromRole, roles.blocked);
      appendEndpoint(p2.x, p2.y, roles.toRole, roles.blocked);
    });
  
    svg.appendChild(layer);
  }
  
  // Trigger recompute + re-render of STP overlay. Tracks which switches changed
  // since the last compute so we can fire a 'rethinking' pulse on them.
  function tbRefreshStpState() {
    const next = tbComputeStpState(tbState);
    // Diff: switches whose role changed fire an 800ms pulse on next render
    const changedDeviceIds = new Set();
    const prev = _tbUiState.stpPrevRoles || {};
    if (next.rootId !== prev._rootId) {
      // Whole domain changed root — all switches pulse
      Object.keys(next.bridges).forEach(id => changedDeviceIds.add(id));
    } else {
      Object.keys(next.cables).forEach(cableId => {
        const prevRoles = prev[cableId];
        const nextRoles = next.cables[cableId];
        if (!prevRoles) { return; }
        if (prevRoles.fromRole !== nextRoles.fromRole || prevRoles.toRole !== nextRoles.toRole) {
          const c = (tbState.cables || []).find(cc => cc.id === cableId);
          if (c) { changedDeviceIds.add(c.from); changedDeviceIds.add(c.to); }
        }
      });
    }
    _tbUiState.stpPrevRoles = Object.assign({ _rootId: next.rootId }, next.cables);
    _tbUiState.stp = next;
  
    // Render overlay + pulse affected switches
    tbRenderStpOverlay();
    if (changedDeviceIds.size > 0) {
      const svg = document.getElementById('tb-canvas');
      if (svg) {
        changedDeviceIds.forEach(id => {
          const el = svg.querySelector(`[data-tb-device="${id}"]`);
          if (el) {
            el.classList.remove('tb-stp-rethink');
            // force reflow before re-adding so animation restarts
            void el.getBoundingClientRect();
            el.classList.add('tb-stp-rethink');
            setTimeout(() => { el.classList.remove('tb-stp-rethink'); }, 820);
          }
        });
      }
    }
  }
  
  // Register the STP overlay (v4.62.0). Uses the _tbOverlayRegistry wired up
  // above — no separate canvas-wrap needed.
  tbRegisterOverlay(tbRenderStpOverlay);
  
  // ── Traceroute Simulation ──
  function tbTraceroute(dev, dstIp) {
    const lines = [`traceroute to ${dstIp}, 30 hops max\n`];
    let currentDev = dev;
    const visited = new Set();
    let hop = 1;
  
    for (; hop <= 30; hop++) {
      if (visited.has(currentDev.id)) { lines.push(`${hop}  *** Loop detected`); break; }
      visited.add(currentDev.id);
  
      // Check if destination is directly connected
      const directIfc = currentDev.interfaces.find(ifc =>
        ifc.ip && ifc.enabled && tbSameSubnet(ifc.ip, dstIp, ifc.mask));
      if (directIfc) {
        // Check if destination device actually exists
        const dstDev = tbState.devices.find(d => d.interfaces.some(i => i.ip === dstIp));
        if (dstDev) {
          const rtt = (1 + Math.random() * 3).toFixed(1);
          lines.push(`${hop}  ${dstDev.hostname} (${dstIp})  ${rtt} ms`);
          lines.push(`\nTrace complete.`);
          return lines.join('\n');
        }
        lines.push(`${hop}  ${dstIp}  * * * (host unreachable)`);
        return lines.join('\n');
      }
  
      // Find next hop via routing table or gateway
      let nextHopIp = null;
      if (currentDev.routingTable.length) {
        let bestLen = -1;
        for (const route of currentDev.routingTable) {
          const rCidr = parseInt(tbMaskToCidr(route.mask));
          if (tbSameSubnet(dstIp, route.network, route.mask) && rCidr > bestLen) {
            bestLen = rCidr;
            nextHopIp = route.nextHop;
          }
        }
      }
      if (!nextHopIp) {
        const gwIfc = currentDev.interfaces.find(ifc => ifc.gateway && ifc.enabled);
        if (gwIfc) nextHopIp = gwIfc.gateway;
      }
  
      if (!nextHopIp) {
        lines.push(`${hop}  * * * (no route to host)`);
        return lines.join('\n');
      }
  
      // Find the next hop device
      const nextDev = tbState.devices.find(d => d.interfaces.some(i => i.ip === nextHopIp));
      if (!nextDev) {
        lines.push(`${hop}  * * * (next hop ${nextHopIp} unreachable)`);
        return lines.join('\n');
      }
  
      const rtt = (1 + Math.random() * 5).toFixed(1);
      lines.push(`${hop}  ${nextDev.hostname} (${nextHopIp})  ${rtt} ms`);
      currentDev = nextDev;
    }
  
    if (hop > 30) lines.push('*** Max hops exceeded');
    return lines.join('\n');
  }
  
  // ── DHCP DORA Simulation ──
  // v4.85.7: extracted from tbSimDHCP() — finds a DHCP server in the broadcast
  // domain, falling back to ip-helper-address relay if none directly reachable.
  // Mutates `log` for trace messages. Returns { server, serverDev } or null/null.
  function _tbDhcpFindServer(state, domain, log) {
    let server = null, serverDev = null;
    for (const member of domain) {
      const d = state.devices.find(x => x.id === member.deviceId);
      if (d && d.dhcpServer && d.dhcpServer.network) { server = d.dhcpServer; serverDev = d; break; }
    }
    if (!server) {
      for (const member of domain) {
        const d = state.devices.find(x => x.id === member.deviceId);
        if (d && d.dhcpRelay && d.dhcpRelay.helperAddress) {
          log.push(`[DHCP] ${d.hostname} relays Discover to ${d.dhcpRelay.helperAddress} (ip helper-address)`);
          const relayTarget = state.devices.find(x => x.interfaces && x.interfaces.some(ifc => ifc.ip === d.dhcpRelay.helperAddress));
          if (relayTarget && relayTarget.dhcpServer) {
            server = relayTarget.dhcpServer;
            serverDev = relayTarget;
            log.push(`[DHCP] Relay reached ${serverDev.hostname} (${d.dhcpRelay.helperAddress})`);
          }
          break;
        }
      }
    }
    return { server, serverDev };
  }
  
  // v4.85.7: extracted from tbSimDHCP() — picks the first IP in the configured
  // pool range that isn't already assigned to any interface in the topology.
  // Returns offered IP string or null if pool invalid/exhausted.
  function _tbDhcpPickFreeIp(state, server, log) {
    const startArr = tbIpToArr(server.rangeStart);
    const endArr = tbIpToArr(server.rangeEnd);
    if (!startArr || !endArr) { log.push('[DHCP] Server pool range is invalid.'); return null; }
    const usedIps = new Set();
    state.devices.forEach(d => d.interfaces && d.interfaces.forEach(ifc => { if (ifc.ip) usedIps.add(ifc.ip); }));
    for (let last = startArr[3]; last <= endArr[3]; last++) {
      const candidate = `${startArr[0]}.${startArr[1]}.${startArr[2]}.${last}`;
      if (!usedIps.has(candidate)) return candidate;
    }
    log.push('[DHCP] Server pool exhausted — no addresses available.');
    return null;
  }
  
  function tbSimDHCP(state, clientDeviceId) {
    const log = [];
    const client = state.devices.find(d => d.id === clientDeviceId);
    if (!client) { log.push('[ERR] Client device not found.'); return { log, success: false }; }
    const clientIface = client.interfaces.find(ifc => ifc.enabled);
    if (!clientIface) { log.push('[ERR] No enabled interface on client.'); return { log, success: false }; }
  
    const vlan = clientIface.vlan || 1;
    log.push(`[DHCP] ${client.hostname} sends DHCP Discover (broadcast on VLAN ${vlan})`);
  
    const domain = tbGetBroadcastDomain(state, clientDeviceId, vlan);
    const { server, serverDev } = _tbDhcpFindServer(state, domain, log);
    if (!server || !serverDev) {
      log.push('[DHCP] No DHCP server found. Request timed out.');
      return { log, success: false };
    }
  
    const offeredIp = _tbDhcpPickFreeIp(state, server, log);
    if (!offeredIp) return { log, success: false };
  
    log.push(`[DHCP] ${serverDev.hostname} sends DHCP Offer: ${offeredIp}`);
    log.push(`[DHCP] ${client.hostname} sends DHCP Request for ${offeredIp}`);
    log.push(`[DHCP] ${serverDev.hostname} sends DHCP ACK: ${offeredIp} (mask ${server.mask}, gw ${server.gateway}, dns ${server.dns})`);
  
    // Assign the IP to the client
    clientIface.ip = offeredIp;
    clientIface.mask = server.mask || '255.255.255.0';
    if (server.gateway) clientIface.gateway = server.gateway;
  
    log.push(`[DHCP] ${client.hostname} configured: IP=${offeredIp} Mask=${clientIface.mask} GW=${clientIface.gateway || 'none'}`);
    tbState.updated = Date.now();
    tbSaveDraft();
    return { log, success: true };
  }
  
  // ── Packet Animation ──
  function tbAnimatePacket(path, color, label, packetInfo) {
    if (!path || path.length < 2) return;
    const animLayer = document.getElementById('tb-anim-layer');
    if (!animLayer) return;
    color = color || '#22c55e';
  
    // Show packet inspection panel if packet info provided
    if (packetInfo) tbShowPacketInspection(packetInfo);
  
    const animate = (idx) => {
      if (idx >= path.length - 1) {
        // Close inspection panel after animation completes
        if (packetInfo) setTimeout(() => tbClosePacketInspection(), 2000);
        return;
      }
      const fromDev = tbState.devices.find(d => d.id === path[idx]);
      const toDev = tbState.devices.find(d => d.id === path[idx + 1]);
      if (!fromDev || !toDev) return;
  
      // QoS classification at each hop
      if (packetInfo && fromDev.qosConfig?.enabled) {
        const classification = tbQosClassify(fromDev, packetInfo);
        const qosDelay = tbQosEnqueue(classification);
        if (classification.policy) {
          packetInfo.dscp = classification.dscp;
          packetInfo.payload = `QoS: ${classification.policy} (${classification.queue})`;
          tbShowPacketInspection(packetInfo);
        }
      }
  
      const HALF_W = 48, HALF_H = 36;
      const p1 = tbEdgePoint(fromDev.x, fromDev.y, toDev.x, toDev.y, HALF_W, HALF_H);
      const p2 = tbEdgePoint(toDev.x, toDev.y, fromDev.x, fromDev.y, HALF_W, HALF_H);
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2 + 16;
  
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '6');
      dot.setAttribute('fill', color);
      dot.setAttribute('cx', p1.x);
      dot.setAttribute('cy', p1.y);
      dot.style.filter = `drop-shadow(0 0 6px ${color})`;
      animLayer.appendChild(dot);
  
      // Animate along quadratic bezier
      const duration = 400;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const u = 1 - t;
        const x = u * u * p1.x + 2 * u * t * mx + t * t * p2.x;
        const y = u * u * p1.y + 2 * u * t * my + t * t * p2.y;
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        if (t < 1) requestAnimationFrame(step);
        else {
          // Update packet headers at each hop (TTL decrement, MAC swap)
          if (packetInfo && toDev.interfaces) {
            packetInfo.ttl = Math.max(0, (packetInfo.ttl || 64) - 1);
            const nextIfc = toDev.interfaces.find(i => i.mac);
            if (nextIfc) packetInfo.dstMac = nextIfc.mac;
            tbShowPacketInspection(packetInfo);
          }
          setTimeout(() => { dot.remove(); animate(idx + 1); }, 100);
        }
      };
      requestAnimationFrame(step);
    };
    animate(0);
  }
  
  // ── Simulation UI Triggers ──
  function tbOpenPingDialog() {
    const modal = document.getElementById('tb-ping-modal');
    const srcSelect = document.getElementById('tb-ping-src');
    const dstSelect = document.getElementById('tb-ping-dst');
    if (!modal || !srcSelect || !dstSelect) return;
    const devicesWithIp = tbState.devices.filter(d => d.interfaces && d.interfaces.some(ifc => ifc.ip));
    srcSelect.innerHTML = devicesWithIp
      .map(d => `<option value="${d.id}">${escHtml(d.hostname)} (${d.interfaces.find(i=>i.ip)?.ip || '?'})</option>`)
      .join('');
    tbFilterPingDst();
    modal.classList.remove('is-hidden');
  }
  function tbFilterPingDst() {
    const srcId = document.getElementById('tb-ping-src')?.value;
    const dstSelect = document.getElementById('tb-ping-dst');
    if (!dstSelect) return;
    const devicesWithIp = tbState.devices.filter(d => d.interfaces && d.interfaces.some(ifc => ifc.ip) && d.id !== srcId);
    dstSelect.innerHTML = devicesWithIp
      .map(d => `<option value="${d.id}">${escHtml(d.hostname)} (${d.interfaces.find(i=>i.ip)?.ip || '?'})</option>`)
      .join('');
  }
  // v4.62.4: tbOpenArpDialog removed — was a 1-line alias for tbOpenPingDialog
  // with zero callers. Use tbOpenPingDialog() directly.
  function tbOpenDhcpDialog() {
    // Find devices without IPs that could request DHCP
    const clients = tbState.devices.filter(d =>
      ['pc','printer','voip','iot'].indexOf(d.type) >= 0 &&
      d.interfaces && d.interfaces.some(ifc => !ifc.ip && ifc.enabled)
    );
    if (!clients.length) {
      showErrorToast('No unconfigured endpoints found. All devices already have IPs.');
      return;
    }
    // Run DHCP for each unconfigured client
    const allLogs = [];
    clients.forEach(c => {
      const result = tbSimDHCP(tbState, c.id);
      allLogs.push(...result.log, '');
    });
    tbShowSimLog(allLogs);
    // Refresh config panel if open
    if (tbConfigPanelDeviceId) tbSwitchConfigTab(tbActiveConfigTab);
  }
  
  function tbExecPing() {
    const srcId = document.getElementById('tb-ping-src')?.value;
    const dstId = document.getElementById('tb-ping-dst')?.value;
    document.getElementById('tb-ping-modal')?.classList.add('is-hidden');
    if (!srcId || !dstId) { showErrorToast('Select source and destination devices.'); return; }
    const dstDev = tbState.devices.find(d => d.id === dstId);
    const dstIp = dstDev?.interfaces?.find(i => i.ip)?.ip;
    if (!dstIp) { showErrorToast('Destination has no IP address configured.'); return; }
    const result = tbSimPing(tbState, srcId, dstIp);
    tbShowSimLog(result.log);
    if (result.path && result.path.length >= 2) {
      const srcDev = tbState.devices.find(d => d.id === srcId);
      const pktInfo = tbBuildPacketHeaders(srcDev, dstDev, { protocol: 'ICMP (1)', flags: 'Echo Request', payload: 'Ping' });
      tbAnimatePacket(result.path, result.success ? '#22c55e' : '#ef4444', 'ICMP', pktInfo);
    }
    if (tbConfigPanelDeviceId) tbSwitchConfigTab(tbActiveConfigTab);
  }
  
  function tbExecArp() {
    const srcId = document.getElementById('tb-ping-src')?.value;
    const dstId = document.getElementById('tb-ping-dst')?.value;
    document.getElementById('tb-ping-modal')?.classList.add('is-hidden');
    if (!srcId || !dstId) { showErrorToast('Select source and destination devices.'); return; }
    const dstDev = tbState.devices.find(d => d.id === dstId);
    const dstIp = dstDev?.interfaces?.find(i => i.ip)?.ip;
    if (!dstIp) { showErrorToast('Destination has no IP address configured.'); return; }
    const result = tbSimARP(tbState, srcId, dstIp);
    tbShowSimLog(result.log);
    if (result.path && result.path.length >= 2) {
      const srcDev = tbState.devices.find(d => d.id === srcId);
      const arpInfo = tbBuildPacketHeaders(srcDev, dstDev, { etherType: '0x0806 (ARP)', protocol: 'ARP', flags: 'Who has ' + dstIp + '?', dstMac: 'ff:ff:ff:ff:ff:ff' });
      tbAnimatePacket(result.path, '#3b82f6', 'ARP', arpInfo);
    }
    if (tbConfigPanelDeviceId) tbSwitchConfigTab(tbActiveConfigTab);
  }
  
  function tbShowSimLog(logLines) {
    const panel = document.getElementById('tb-sim-log');
    const content = document.getElementById('tb-sim-log-content');
    if (!panel || !content) return;
    panel.classList.remove('is-hidden');
    const existing = content.textContent;
    const timestamp = new Date().toLocaleTimeString();
    content.textContent = (existing ? existing + '\n' : '') + `── ${timestamp} ──\n` + logLines.join('\n') + '\n';
    content.scrollTop = content.scrollHeight;
  }
  
  function tbClearSimLog() {
    const content = document.getElementById('tb-sim-log-content');
    if (content) content.textContent = '';
    // Clear ARP/MAC tables on all devices
    tbState.devices.forEach(d => { d.arpTable = []; d.macTable = []; });
    tbState.updated = Date.now();
    tbSaveDraft();
    showErrorToast('Simulation log and ARP/MAC tables cleared.');
  }
  
  // ══════════════════════════════════════════
  // TOPOLOGY BUILDER — AI Topology Generation + Walkthrough
  // ══════════════════════════════════════════
  
  // Shared: parse AI topology JSON from raw text
  function tbParseAiTopologyJson(text) {
    if (!text || !text.trim()) return null;
    // Strip markdown fences (```json ... ```) anywhere in the text
    const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    let payload;
  
    // Stage 1: Direct parse
    try { payload = JSON.parse(cleaned); } catch (_) {}
    if (payload) return payload;
  
    // Stage 2: Extract the outermost { ... } block (greedy — gets the largest JSON object)
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) try { payload = JSON.parse(m[0]); } catch (_) {}
    if (payload) return payload;
  
    // Stage 3: Strip // comments + trailing commas, then direct parse
    const noComments = cleaned.replace(/\/\/[^\n]*/g, '').replace(/,\s*([}\]])/g, '$1');
    try { payload = JSON.parse(noComments); } catch (_) {}
    if (payload) return payload;
  
    // Stage 4: Extract { ... } from comment-stripped text
    const m2 = noComments.match(/\{[\s\S]*\}/);
    if (m2) try { payload = JSON.parse(m2[0]); } catch (_) {}
    if (payload) return payload;
  
    // Stage 5: Handle truncated JSON — if response was cut off mid-array/object,
    // try to close open brackets/braces to salvage a partial result
    if (m) {
      let truncated = m[0];
      // Count open vs close braces/brackets
      const opens = (truncated.match(/\{/g) || []).length;
      const closes = (truncated.match(/\}/g) || []).length;
      const openBrackets = (truncated.match(/\[/g) || []).length;
      const closeBrackets = (truncated.match(/\]/g) || []).length;
      if (opens > closes || openBrackets > closeBrackets) {
        // Strip any trailing partial value (after last comma or opening bracket)
        truncated = truncated.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, '');
        truncated = truncated.replace(/,\s*\{[^}]*$/, '');
        truncated = truncated.replace(/,\s*$/, '');
        // Close open brackets/braces
        for (let i = 0; i < openBrackets - closeBrackets; i++) truncated += ']';
        for (let i = 0; i < opens - closes; i++) truncated += '}';
        try { payload = JSON.parse(truncated); } catch (_) {
        }
      }
    }
    return payload || null;
  }
  
  // v4.85.7: extracted from tbBuildFromAiPayload() — builds a single device
  // object (id, interfaces, all the per-feature configs) from one entry in the
  // AI payload. Mirrors the scenario-autobuild device shape so downstream code
  // (validators, renderers) sees identical structure regardless of source.
  function _tbBuildAiDevice(dd, targetState) {
    const id = 'd_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const type = TB_DEVICE_TYPES[dd.type] ? dd.type : 'pc';
    const ifaces = (dd.interfaces || []).map((aiIfc, idx) => ({
      name: aiIfc.name || `eth${idx}`,
      cableId: null,
      ip: aiIfc.ip || '',
      mask: aiIfc.mask || '255.255.255.0',
      mac: tbGenerateMac(id, idx),
      vlan: aiIfc.vlan || 1,
      mode: aiIfc.mode || 'access',
      trunkAllowed: aiIfc.trunkAllowed || [1],
      gateway: aiIfc.gateway || '',
      enabled: true,
      subInterfaces: [],
    }));
    const def = TB_IFACE_DEFAULTS[type] || { count: 1, naming: i => `eth${i}` };
    while (ifaces.length < def.count) {
      ifaces.push({
        name: def.naming(ifaces.length), cableId: null, ip: '', mask: '255.255.255.0',
        mac: tbGenerateMac(id, ifaces.length), vlan: 1, mode: 'access', trunkAllowed: [1],
        gateway: '', enabled: true, subInterfaces: [],
      });
    }
    return {
      id, type, x: dd.x || 400, y: dd.y || 400,
      hostname: dd.hostname || tbAutoHostname(type, targetState.devices),
      interfaces: ifaces,
      routingTable: dd.routingTable || [],
      arpTable: [], macTable: [],
      vlanDb: type.indexOf('switch') >= 0 ? [{ id: 1, name: 'default' }] : [],
      dhcpServer: dd.dhcpServer || null,
      dhcpRelay: dd.dhcpRelay || null,
      acls: [],
      securityGroups: dd.securityGroups || [],
      nacls: dd.nacls || [],
      vpcConfig: dd.vpcConfig || null,
      vpnConfig: dd.vpnConfig || null,
      saseConfig: dd.saseConfig || null,
      vxlanConfig: dd.vxlanConfig || [],
      stpConfig: dd.stpConfig || null,
      ospfConfig: dd.ospfConfig || null,
      qosConfig: dd.qosConfig || null,
      wirelessConfig: dd.wirelessConfig || null,
      dnsRecords: dd.dnsRecords || [],
      bgpConfig: dd.bgpConfig || null,
      eigrpConfig: dd.eigrpConfig || null,
      dnssecEnabled: dd.dnssecEnabled || false,
      dhcpSnooping: dd.dhcpSnooping || null,
      daiEnabled: dd.daiEnabled || false,
      portSecurity: dd.portSecurity || null,
    };
  }
  
  // Shared: build devices + cables from AI payload into a target state
  function tbBuildFromAiPayload(payload, targetState, hostnameToId) {
    // v4.49.3: reset the link-local counter so AI-generated topologies get
    // a clean pool (same convention as scenario autoBuild).
    _tbLinkLocalSlot = 0;
    payload.devices.forEach(dd => {
      const device = _tbBuildAiDevice(dd, targetState);
      tbRebuildConnectedRoutes(device);
      hostnameToId[dd.hostname] = device.id;
      targetState.devices.push(device);
    });
  
    (payload.cables || []).forEach(cc => {
      const fromId = hostnameToId[cc.fromHostname];
      const toId = hostnameToId[cc.toHostname];
      if (!fromId || !toId) return;
      const cableId = 'c_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const fromDev = targetState.devices.find(d => d.id === fromId);
      const toDev = targetState.devices.find(d => d.id === toId);
      const fromIfc = fromDev?.interfaces.find(i => i.name === cc.fromIface && !i.cableId);
      const toIfc = toDev?.interfaces.find(i => i.name === cc.toIface && !i.cableId);
      if (fromIfc) fromIfc.cableId = cableId;
      if (toIfc) toIfc.cableId = cableId;
      const cableType = cc.type || 'cat6';
      // v4.49.3: auto-assign link-local IPs on AI-generated cables where
      // the AI didn't specify one (mirrors scenario autoBuild behaviour so
      // AI-gen topologies show green packets out-of-the-box).
      if (fromDev && toDev && fromIfc && toIfc) {
        _tbAutoAssignCableIps(fromDev, fromIfc, toDev, toIfc, cableType);
      }
      targetState.cables.push({
        id: cableId, from: fromId, to: toId,
        type: cableType,
        fromIface: fromIfc ? fromIfc.name : null,
        toIface: toIfc ? toIfc.name : null,
      });
    });
  }
  
  // The base prompt shared between new and add-to-existing modes
  function tbAiBasePrompt() {
    const validTypes = Object.keys(TB_DEVICE_TYPES).join(', ');
    return `CRITICAL: Output ONLY valid JSON. No comments, no trailing commas, no markdown fences (\`\`\`), no text before or after the JSON. Just the raw JSON object.
  
  VALID DEVICE TYPES: ${validTypes}
  
  DEVICE TYPE GUIDE:
  - router: Internal routers (Gi0/x interfaces). Always need IPs on all connected interfaces.
  - isp-router: ISP/provider edge router connecting to the wider internet. Use this when the user mentions ISP, provider, or internet routing. Has Gi0/x interfaces.
  - switch: Layer 2 switch (Fa0/x interfaces, 24 ports). No IP needed unless management VLAN.
  - dmz-switch: Switch in the DMZ zone. Same as switch but for DMZ segments.
  - firewall: Perimeter security device (eth0-3). Needs IPs, does routing between zones.
  - cloud: The Internet/WAN cloud. Represents the public internet or WAN connection. One per topology unless multi-ISP.
  - vpc: AWS/Azure Virtual Private Cloud. A logical container. Wire subnets and gateways to it.
  - cloud-subnet: A subnet inside a VPC. Wire to the parent VPC.
  - igw: Internet Gateway — gives a VPC internet access. Wire to the VPC.
  - nat-gw: NAT Gateway — outbound-only internet for private subnets.
  - tgw: Transit Gateway — hub connecting multiple VPCs.
  - vpg: VPN Gateway (cloud side of IPSec tunnel). Wire to VPC and to onprem-dc.
  - onprem-dc: On-premises data center. Wire to vpg for hybrid cloud.
  - sase-edge: SASE (Secure Access Service Edge) — zero trust, SWG, CASB.
  - pc, server, printer, voip, iot: End devices. Need IP + gateway.
  - wap: Wireless access point. wlc: Wireless LAN controller.
  - load-balancer: Sits in front of server farms.
  - ids: IDS/IPS — inline or mirrored for traffic inspection.
  - public-web, public-file, public-cloud: DMZ-facing servers.
  - When the user says "data center" or "data centre", use onprem-dc for on-prem DCs. For cloud DCs, use vpc + cloud-subnet + servers.
  - When connecting DCs via VPN, you NEED: vpg (VPN Gateway) wired between both DCs with matching vpnConfig (same PSK, IKE, encryption, hash, DH group).
  
  VXLAN SUPPORT:
  - Switches and routers can have vxlanConfig array for VXLAN overlay tunnels.
  - Each entry: { vni: 10000, vtepIp: "10.0.0.1", mappedVlan: 10, mcastGroup: "239.1.1.1", remoteVteps: ["10.0.0.2"], floodAndLearn: true, bgpEvpn: false }
  - Include vxlanConfig when user mentions VXLAN, overlay, DCI, or fabric.
  
  ADVANCED FEATURES (include when relevant):
  - dns-server: DNS server device type. Include dnsRecords array: [{ type: "A", name: "web.corp.local", value: "192.168.1.100", ttl: 3600 }]. Record types: A, AAAA, CNAME, MX, PTR, NS, SOA, TXT, SRV, CAA.
  - stpConfig on switches: { priority: 32768, mode: "rstp", portStates: {} }. Include when user mentions STP, spanning tree, or loop prevention.
  - ospfConfig on routers: { routerId: "1.1.1.1", areas: [{ id: 0, networks: ["192.168.1.0/24"] }], enabled: true }. Include when user mentions OSPF, dynamic routing, or link-state.
  - qosConfig on routers/switches: { enabled: true, policies: [{ name: "voice", dscp: "ef", queue: "priority", match: "udp 5060" }] }. Include when user mentions QoS, priority, or voice.
  - wirelessConfig on wap/wlc: { ssid: "Corp-WiFi", security: "wpa3-enterprise", channel: "auto", band: "5ghz", mode: "802.11ax" }.
  - IPv6: interfaces can have ipv6 field (e.g. "2001:db8::1") and ipv6Prefix (default 64). Include when user mentions IPv6 or dual-stack.
  - bgpConfig on routers: { asn: 65001, routerId: "1.1.1.1", neighbors: [{ ip: "10.0.0.2", remoteAs: 65002, type: "ebgp", state: "Idle" }], networks: ["192.168.1.0/24"], enabled: true }. Include when user mentions BGP, AS, autonomous system, eBGP, iBGP, or internet routing.
  - eigrpConfig on routers: { asn: 100, networks: [{ network: "192.168.1.0", wildcard: "0.0.0.255" }], enabled: true }. Include when user mentions EIGRP, enhanced interior gateway, or Cisco routing.
  - dnssecEnabled on dns-server: true/false. When true, DNS records should include DNSKEY, RRSIG, and DS records. Include when user mentions DNSSEC or signed DNS.
  - dhcpSnooping on switches: { enabled: true, trustedPorts: ["Fa0/1"] }. Include when user mentions DHCP snooping or rogue DHCP defense.
  - daiEnabled on switches: true/false. Dynamic ARP Inspection. Include when user mentions DAI or ARP spoofing defense.
  - portSecurity on switches: { enabled: true, maxMac: 1, violation: "shutdown" }. Include when user mentions port security or MAC flooding defense.
  
  TOPOLOGY TYPES — when the user asks for a physical topology, follow these EXACT patterns:
  - STAR: One central device (switch or router) at center (x:700,y:400). All other devices radiate outward in a circle around it. Every device connects ONLY to the center.
  - BUS: Devices arranged in a horizontal line (same y, increasing x). Each device connects to the next in the chain (A→B→C→D). Terminators at both ends.
  - RING: Devices arranged in a circle. Each connects to the next, and the last connects back to the first (A→B→C→D→A).
  - MESH (full): Every device connects to every other device. Arrange in a circle for clarity.
  - PARTIAL MESH: Most devices connect to most others but not all.
  - STAR-BUS / HYBRID: Multiple star clusters (each with a central switch + endpoints), linked together via backbone cables between the central switches.
  - POINT-TO-POINT: Two devices connected directly.
  - When combining topology types, follow the physical layout described above for device placement coordinates.
  
  SCHEMA:
  {
    "devices": [
      {
        "type": "<device_type>",
        "hostname": "R1",
        "x": 400, "y": 200,
        "interfaces": [{"name": "Gi0/0", "ip": "192.168.1.1", "mask": "255.255.255.0", "vlan": 1, "mode": "access", "gateway": ""}],
        "routingTable": [{"type": "static", "network": "10.0.0.0", "mask": "255.255.0.0", "nextHop": "192.168.1.2", "iface": "Gi0/0"}],
        "securityGroups": [{"name": "web-sg", "rules": [{"direction": "inbound", "protocol": "tcp", "port": "443", "source": "0.0.0.0/0", "action": "allow"}]}],
        "vpcConfig": {"cidr": "10.0.0.0/16", "peerings": []},
        "vpnConfig": {"peerIp": "", "psk": "secret123", "ikeVersion": "IKEv2", "encryption": "AES-256", "hashAlgo": "SHA-256", "dhGroup": 14},
        "vxlanConfig": [{"vni": 10000, "vtepIp": "10.0.0.1", "mappedVlan": 10, "mcastGroup": "239.1.1.1", "remoteVteps": ["10.0.0.2"], "floodAndLearn": true, "bgpEvpn": false}],
        "stpConfig": null, "ospfConfig": null, "qosConfig": null, "wirelessConfig": null,
        "dnsRecords": [{"type": "A", "name": "web.corp.local", "value": "192.168.1.100", "ttl": 3600}],
        "bgpConfig": null, "eigrpConfig": null, "dnssecEnabled": false,
        "dhcpSnooping": null, "daiEnabled": false, "portSecurity": null
      }
    ],
    "cables": [{"fromHostname": "R1", "fromIface": "Gi0/0", "toHostname": "SW1", "toIface": "Fa0/1", "type": "cat6"}]
  }
  
  RULES:
  1. Canvas is 1800x1100. Spread devices across x:150-1650, y:120-980. CRITICAL: keep at least 180px between any two devices in BOTH x and y directions. Use the full canvas — no clustering, no overlap. (Positions will be auto-relayouted post-generation, but providing well-spread initial positions makes the result cleaner.)
  2. IP addressing: 192.168.x.x for internal, 10.x.x.x for DMZ/cloud, 172.16.x.x for management, 203.0.113.x for public/ISP-facing.
  3. Every router/firewall/isp-router interface that connects to another device MUST have an IP.
  4. Every endpoint (pc, server, printer, voip, iot) MUST have an IP and a gateway pointing to its nearest router.
  5. Switches generally don't need IPs unless management VLAN is configured.
  6. Include routingTable on routers for cross-subnet reachability (connected routes auto-generate, add static routes for remote subnets).
  7. Include securityGroups on cloud devices if the user mentions security, firewalls, or access control.
  8. Include vpcConfig with cidr on VPC devices. Include vpnConfig on vpg and onprem-dc devices.
  9. Cable types: cat6 (default), cat5e, fiber (for backbone/long-distance), coax, console (management).
  10. Max 50 devices total. Be generous with device count — real networks are complex.
  11. Use realistic hostnames: R1/R2 for routers, SW1/SW2 for switches, FW1 for firewalls, ISP1 for ISP routers, PC1-PC5 for PCs, SRV1 for servers, etc.
  12. CRITICAL: Output ONLY valid JSON. No comments, no trailing commas, no markdown fences, no text before or after.`;
  }
  
  // Serialize existing topology for context in "add to existing" mode
  function tbSerializeForAiContext() {
    const devList = tbState.devices.map(d => {
      const ifcSummary = d.interfaces.filter(i => i.ip || i.cableId).map(i =>
        `${i.name}${i.ip ? '=' + i.ip + '/' + (tbMaskToCidr ? tbMaskToCidr(i.mask) : i.mask) : '(no ip)'}${i.cableId ? ' [cabled]' : ''}`
      ).join(', ');
      return `  ${d.hostname} (${d.type}) at x:${d.x},y:${d.y} — interfaces: ${ifcSummary || 'none configured'}`;
    }).join('\n');
    const cblList = tbState.cables.map(c => {
      const fd = tbState.devices.find(d => d.id === c.from);
      const td = tbState.devices.find(d => d.id === c.to);
      return `  ${fd?.hostname || '?'}:${c.fromIface || '?'} ↔ ${td?.hostname || '?'}:${c.toIface || '?'} (${c.type})`;
    }).join('\n');
    return `DEVICES (${tbState.devices.length}):\n${devList}\n\nCABLES (${tbState.cables.length}):\n${cblList}`;
  }
  
  // Deep AI generation: post-process + validate + auto-fix generated topology
  function tbDeepValidateAndFix(state, scenario) {
    const fixes = [];
    const routers = state.devices.filter(d => d.type === 'router' || d.type === 'firewall' || d.type === 'isp-router');
    const endpoints = state.devices.filter(d => ['pc','server','printer','voip','iot'].includes(d.type));
    const vpgs = state.devices.filter(d => d.type === 'vpg');
    const dcs = state.devices.filter(d => d.type === 'onprem-dc');
  
    // Fix 1: Routers/firewalls with connected cables must have IPs on those interfaces
    routers.forEach(r => {
      r.interfaces.forEach(ifc => {
        if (ifc.cableId && !ifc.ip) {
          // Auto-assign from unused 10.x.x.x space
          const usedIps = new Set(state.devices.flatMap(d => d.interfaces.map(i => i.ip)).filter(Boolean));
          for (let sub = 1; sub < 255; sub++) {
            const candidate = `10.255.${sub}.1`;
            if (!usedIps.has(candidate)) { ifc.ip = candidate; ifc.mask = '255.255.255.252'; fixes.push(`Auto-assigned ${candidate} to ${r.hostname}:${ifc.name}`); break; }
          }
        }
      });
      tbRebuildConnectedRoutes(r);
    });
  
    // Fix 2: Endpoints with IPs but no gateway — try to find nearest router
    endpoints.forEach(ep => {
      ep.interfaces.forEach(ifc => {
        if (ifc.ip && !ifc.gateway) {
          // Walk cables to find connected router
          const cable = state.cables.find(c => (c.from === ep.id || c.to === ep.id));
          if (cable) {
            const nextId = cable.from === ep.id ? cable.to : cable.from;
            const nextDev = state.devices.find(d => d.id === nextId);
            // If next device is a switch, walk one more hop
            let routerDev = nextDev;
            if (nextDev && nextDev.type.includes('switch')) {
              const uplink = state.cables.find(c => (c.from === nextDev.id || c.to === nextDev.id) && c.id !== cable.id);
              if (uplink) {
                const upId = uplink.from === nextDev.id ? uplink.to : uplink.from;
                const upDev = state.devices.find(d => d.id === upId);
                if (upDev && (upDev.type === 'router' || upDev.type === 'firewall')) routerDev = upDev;
              }
            }
            if (routerDev && (routerDev.type === 'router' || routerDev.type === 'firewall' || routerDev.type === 'isp-router')) {
              const routerIp = routerDev.interfaces.find(i => i.ip)?.ip;
              if (routerIp) { ifc.gateway = routerIp; fixes.push(`Auto-set gateway on ${ep.hostname} → ${routerIp}`); }
            }
          }
        }
      });
    });
  
    // Fix 3: VPN endpoints need matching vpnConfig
    if (vpgs.length > 0 || dcs.length > 0) {
      const vpnEndpoints = [...vpgs, ...dcs];
      vpnEndpoints.forEach(ep => {
        if (!ep.vpnConfig) {
          ep.vpnConfig = { peerIp: '', psk: 'AutoPSK123!', ikeVersion: 'IKEv2', encryption: 'AES-256', hashAlgo: 'SHA-256', dhGroup: 14, localSubnet: '', remoteSubnet: '', status: 'down' };
          fixes.push(`Auto-initialized VPN config on ${ep.hostname}`);
        }
      });
      // Try to match VPG ↔ DC pairs via cables
      vpgs.forEach(vpg => {
        const vpgCables = state.cables.filter(c => c.from === vpg.id || c.to === vpg.id);
        vpgCables.forEach(cable => {
          const peerId = cable.from === vpg.id ? cable.to : cable.from;
          const peer = state.devices.find(d => d.id === peerId);
          if (peer && (peer.type === 'onprem-dc' || peer.type === 'vpg') && peer.vpnConfig) {
            // Sync crypto params so tunnel can negotiate
            if (!vpg.vpnConfig.psk || vpg.vpnConfig.psk === 'AutoPSK123!') {
              const sharedPsk = peer.vpnConfig.psk || 'SharedSecret123';
              vpg.vpnConfig.psk = sharedPsk;
              peer.vpnConfig.psk = sharedPsk;
              vpg.vpnConfig.ikeVersion = peer.vpnConfig.ikeVersion || 'IKEv2';
              vpg.vpnConfig.encryption = peer.vpnConfig.encryption || 'AES-256';
              vpg.vpnConfig.hashAlgo = peer.vpnConfig.hashAlgo || 'SHA-256';
              vpg.vpnConfig.dhGroup = peer.vpnConfig.dhGroup || 14;
              peer.vpnConfig.ikeVersion = vpg.vpnConfig.ikeVersion;
              peer.vpnConfig.encryption = vpg.vpnConfig.encryption;
              peer.vpnConfig.hashAlgo = vpg.vpnConfig.hashAlgo;
              peer.vpnConfig.dhGroup = vpg.vpnConfig.dhGroup;
              fixes.push(`Synced VPN crypto params between ${vpg.hostname} ↔ ${peer.hostname}`);
            }
          }
        });
      });
    }
  
    // Fix 4: VPCs should have vpcConfig
    state.devices.filter(d => d.type === 'vpc').forEach(vpc => {
      if (!vpc.vpcConfig) {
        vpc.vpcConfig = { cidr: '10.0.0.0/16', dnsSupport: true, dnsHostnames: true, flowLogs: false, tenancy: 'default', peerings: [] };
        fixes.push(`Auto-initialized VPC config on ${vpc.hostname}`);
      }
    });
  
    // Fix 5: Always run auto-layout to spread AI-generated topologies cleanly
    // across the canvas. This replaces the old "stacked-at-(400,400)" detector
    // because Haiku also produces gently-bunched layouts that look cramped.
    const layoutMoved = tbAutoLayout(state);
    if (layoutMoved > 0) {
      fixes.push(`Auto-layout repositioned ${layoutMoved} device(s) for clarity`);
    }
  
    // Fix 6: Ensure cross-subnet routing — add static routes on routers for subnets they don't directly connect to
    if (routers.length > 1) {
      routers.forEach(r => {
        const connectedNets = new Set(r.routingTable.filter(rt => rt.type === 'connected').map(rt => rt.network));
        // Check if any other router has subnets this router doesn't know about
        routers.forEach(other => {
          if (other.id === r.id) return;
          const otherNets = other.routingTable.filter(rt => rt.type === 'connected');
          otherNets.forEach(net => {
            if (!connectedNets.has(net.network) && !r.routingTable.some(rt => rt.network === net.network)) {
              // Find a next-hop — look for a shared cable/subnet between these two routers
              const shared = r.interfaces.find(ifc => ifc.ip && other.interfaces.some(oi => oi.ip && tbSameSubnet(ifc.ip, oi.ip, ifc.mask)));
              if (shared) {
                const nextHop = other.interfaces.find(oi => oi.ip && tbSameSubnet(shared.ip, oi.ip, shared.mask))?.ip;
                if (nextHop) {
                  r.routingTable.push({ type: 'static', network: net.network, mask: net.mask, nextHop, iface: shared.name });
                  fixes.push(`Added static route on ${r.hostname}: ${net.network} via ${nextHop}`);
                }
              }
            }
          });
        });
      });
    }
  
    return fixes;
  }
  
  // Force-directed auto-layout for AI-generated topologies.
  // Spreads devices across the canvas using pair-wise repulsion + cable-spring
  // attraction, then a final hard-separation pass to guarantee no overlap.
  // Returns count of devices that moved more than a small threshold.
  function tbAutoLayout(state) {
    const devices = state.devices;
    if (!devices || devices.length < 2) return 0;
  
    const PAD_X = 100;
    const PAD_Y = 90;
    const minX = PAD_X, maxX = TB_CANVAS_W - PAD_X;
    const minY = PAD_Y, maxY = TB_CANVAS_H - PAD_Y;
    const REPULSE = 9000;
    const SPRING = 0.06;
    const IDEAL_LINK = 200;
    const DAMPING = 0.85;
    const VEL_CAP = 30;
    const ITERATIONS = 260;
    const MIN_MOVE_THRESHOLD = 8;
    const MIN_SEP = 150;
  
    // Snapshot starting positions for move detection
    const start = devices.map(d => ({ x: d.x, y: d.y }));
  
    // Detect "stacked" / clustered seeds (many devices within a tight box).
    // If so, seed with a grid so the simulation has somewhere to push from.
    let xs = devices.map(d => d.x), ys = devices.map(d => d.y);
    let spreadX = Math.max(...xs) - Math.min(...xs);
    let spreadY = Math.max(...ys) - Math.min(...ys);
    if (spreadX < 250 || spreadY < 200) {
      const cols = Math.ceil(Math.sqrt(devices.length));
      const rows = Math.ceil(devices.length / cols);
      const stepX = (maxX - minX) / Math.max(1, cols - 1 || 1);
      const stepY = (maxY - minY) / Math.max(1, rows - 1 || 1);
      devices.forEach((d, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        d.x = cols === 1 ? (minX + maxX) / 2 : minX + c * stepX;
        d.y = rows === 1 ? (minY + maxY) / 2 : minY + r * stepY;
      });
    }
  
    // Build adjacency from cables
    const adj = new Map();
    devices.forEach(d => adj.set(d.id, new Set()));
    (state.cables || []).forEach(c => {
      if (adj.has(c.from) && adj.has(c.to)) {
        adj.get(c.from).add(c.to);
        adj.get(c.to).add(c.from);
      }
    });
  
    // Velocity buffer
    const vel = new Map();
    devices.forEach(d => vel.set(d.id, { vx: 0, vy: 0 }));
  
    for (let iter = 0; iter < ITERATIONS; iter++) {
      // Pair-wise repulsion
      for (let i = 0; i < devices.length; i++) {
        const a = devices[i];
        let fx = 0, fy = 0;
        for (let j = 0; j < devices.length; j++) {
          if (i === j) continue;
          const b = devices[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist2 = dx * dx + dy * dy;
          if (dist2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist2 = 1; }
          const dist = Math.sqrt(dist2);
          const force = REPULSE / dist2;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
        // Spring along cables
        adj.get(a.id).forEach(nbId => {
          const b = devices.find(d => d.id === nbId);
          if (!b) return;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const delta = dist - IDEAL_LINK;
          const force = SPRING * delta;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        });
        const v = vel.get(a.id);
        v.vx = (v.vx + fx) * DAMPING;
        v.vy = (v.vy + fy) * DAMPING;
        if (v.vx > VEL_CAP) v.vx = VEL_CAP;
        if (v.vx < -VEL_CAP) v.vx = -VEL_CAP;
        if (v.vy > VEL_CAP) v.vy = VEL_CAP;
        if (v.vy < -VEL_CAP) v.vy = -VEL_CAP;
      }
      // Apply + clamp
      devices.forEach(d => {
        const v = vel.get(d.id);
        d.x += v.vx;
        d.y += v.vy;
        if (d.x < minX) d.x = minX;
        if (d.x > maxX) d.x = maxX;
        if (d.y < minY) d.y = minY;
        if (d.y > maxY) d.y = maxY;
      });
    }
  
    // Hard separation pass: guarantee no two devices closer than MIN_SEP
    for (let pass = 0; pass < 30; pass++) {
      let moved = false;
      for (let i = 0; i < devices.length; i++) {
        for (let j = i + 1; j < devices.length; j++) {
          const a = devices[i], b = devices[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          if (dist < MIN_SEP) {
            const push = (MIN_SEP - dist) / 2;
            const ux = dx / dist, uy = dy / dist;
            a.x -= ux * push;
            a.y -= uy * push;
            b.x += ux * push;
            b.y += uy * push;
            if (a.x < minX) a.x = minX;
            if (a.x > maxX) a.x = maxX;
            if (a.y < minY) a.y = minY;
            if (a.y > maxY) a.y = maxY;
            if (b.x < minX) b.x = minX;
            if (b.x > maxX) b.x = maxX;
            if (b.y < minY) b.y = minY;
            if (b.y > maxY) b.y = maxY;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  
    // Round positions for cleaner integer coords
    devices.forEach(d => { d.x = Math.round(d.x); d.y = Math.round(d.y); });
  
    // Count meaningful moves
    let movedCount = 0;
    devices.forEach((d, i) => {
      const dx = d.x - start[i].x;
      const dy = d.y - start[i].y;
      if (Math.sqrt(dx * dx + dy * dy) > MIN_MOVE_THRESHOLD) movedCount++;
    });
    return movedCount;
  }
  
  // Semantic pre-processing: expand shorthand descriptions into detailed instructions
  function tbExpandScenario(scenario) {
    let expanded = scenario;
    // Map common shorthand to explicit device types
    const expansions = [
      [/\bdata cent(er|re)s?\b/gi, 'onprem-dc(s)'],
      [/\bDC[s]?\b/g, 'onprem-dc(s)'],
      [/\bconnected via VPN\b/gi, 'connected via vpg devices with vpnConfig'],
      [/\bVPN tunnel\b/gi, 'VPN via vpg with vpnConfig'],
      [/\bsite.to.site\b/gi, 'site-to-site VPN (vpg + onprem-dc)'],
      [/\boverlay\b/gi, 'VXLAN overlay (vxlanConfig on switches)'],
      [/\bfabric\b/gi, 'spine-leaf with VXLAN'],
      [/\bspine.leaf\b/gi, 'spine switches at top, leaf switches at bottom, each leaf connects to each spine'],
      [/\bDCI\b/g, 'Data Center Interconnect (VXLAN between DCs)'],
      [/\bSD.WAN\b/gi, 'SD-WAN (routers with VXLAN/IPSec)'],
      [/\b3.tier\b/gi, 'three-tier (core routers → distribution switches → access switches → endpoints)'],
      [/\bcollapsed core\b/gi, 'collapsed core (combined core/distribution switches)'],
      [/\bHA\b/g, 'high availability (dual devices, redundant paths)'],
      [/\bredundant\b/gi, 'redundant (dual devices with cross-connections)'],
      [/\bZTNA\b/gi, 'Zero Trust (sase-edge with ZTNA)'],
      [/\bwireless\b/gi, 'wireless (wap + wlc with wirelessConfig)'],
      [/\bDNS\b/g, 'DNS (dns-server with dnsRecords)'],
      [/\bOSPF\b/g, 'OSPF (routers with ospfConfig enabled)'],
      [/\bdynamic routing\b/gi, 'OSPF dynamic routing (ospfConfig on routers)'],
      [/\bSTP\b/g, 'STP (switches with stpConfig)'],
      [/\bspanning tree\b/gi, 'Spanning Tree (switches with stpConfig)'],
      [/\bQoS\b/g, 'QoS (routers with qosConfig)'],
      [/\bIPv6\b/g, 'IPv6 (interfaces with ipv6 addresses)'],
      [/\bdual.stack\b/gi, 'dual-stack IPv4+IPv6 (interfaces with both ip and ipv6)'],
      [/\bBGP\b/g, 'BGP (routers with bgpConfig, asn, neighbors)'],
      [/\beBGP\b/gi, 'eBGP (bgpConfig with type ebgp, different ASNs)'],
      [/\biBGP\b/gi, 'iBGP (bgpConfig with type ibgp, same ASN)'],
      [/\bEIGRP\b/g, 'EIGRP (routers with eigrpConfig enabled)'],
      [/\bautonomous system\b/gi, 'Autonomous System (routers with bgpConfig asn)'],
      [/\bDNSSEC\b/g, 'DNSSEC (dns-server with dnssecEnabled and DNSKEY/RRSIG/DS records)'],
      [/\bARP spoof\b/gi, 'ARP spoofing defense (switches with daiEnabled)'],
      [/\bDHCP snooping\b/gi, 'DHCP snooping (switches with dhcpSnooping enabled)'],
      [/\bport security\b/gi, 'port security (switches with portSecurity enabled)'],
      [/\bnetwork hardening\b/gi, 'hardened network (switches with dhcpSnooping, daiEnabled, portSecurity)'],
    ];
    expansions.forEach(([re, replacement]) => {
      if (re.test(expanded)) expanded = expanded.replace(re, replacement);
    });
    return expanded;
  }
  
  async function tbGenerateAiTopology() {
    const key = (localStorage.getItem(STORAGE.KEY) || '').trim();
    if (!key) { showErrorToast('Add your Anthropic API key in Settings to use AI generation.'); return; }
  
    const hasExisting = tbState.devices.length > 0;
    let mode = 'new';
    if (hasExisting) {
      const choice = prompt(
        `You have ${tbState.devices.length} device(s) on the canvas.\n\n` +
        `Type ADD to add to the existing topology\n` +
        `Type NEW to start from scratch\n\n` +
        `Then describe what you want:\n\n` +
        `Examples:\n` +
        `• ADD a DMZ segment with 2 public servers and a firewall\n` +
        `• ADD 2 data centres connected via VPN\n` +
        `• ADD 5 PCs and a printer to the existing switch\n` +
        `• ADD a VXLAN overlay between the spine switches\n` +
        `• NEW enterprise network with 3 VLANs and DMZ\n` +
        `• NEW spine-leaf fabric with VXLAN overlay\n` +
        `• NEW 2 data centres connected via site-to-site VPN`
      );
      if (!choice) return;
      const trimmed = choice.trim();
      const addMatch = trimmed.match(/^add\b\s*(.*)/i);
      const newMatch = trimmed.match(/^new\b\s*(.*)/i);
      if (addMatch) {
        mode = 'add';
        var scenario = addMatch[1] || trimmed;
      } else if (newMatch) {
        mode = 'new';
        var scenario = newMatch[1] || trimmed;
      } else {
        mode = 'add';
        var scenario = trimmed;
      }
    } else {
      var scenario = prompt('Describe the network you want to build.\n\nExamples:\n• "Enterprise network with 3 VLANs, DMZ, 2 firewalls, IDS, load balancer"\n• "2 data centres connected via site-to-site VPN"\n• "Spine-leaf data center fabric with VXLAN"\n• "Star-bus hybrid topology with 4 switches, 12 PCs"\n• "AWS VPC with public/private subnets, NAT gateway, VPN to on-prem DC"\n• "Ring topology with 5 routers"\n• "Full mesh between 4 routers"\n• "ISP edge with 3 customer sites connected via VPN"\n\nBe as detailed as you want — complex is fine:');
      if (!scenario) return;
    }
  
    // Phase 1: Semantic expansion — map shorthand to explicit device types/configs
    const expandedScenario = tbExpandScenario(scenario);
  
    showErrorToast(mode === 'add' ? 'AI generating... Phase 1/2: Building topology' : 'AI generating... Phase 1/2: Building topology');
    try {
      const basePrompt = tbAiBasePrompt();
      let genPrompt;
  
      if (mode === 'add') {
        const existingContext = tbSerializeForAiContext();
        const existingHostnames = tbState.devices.map(d => d.hostname);
        const usedXs = tbState.devices.map(d => d.x);
        const usedYs = tbState.devices.map(d => d.y);
        const maxX = Math.max(...usedXs, 100);
        const maxY = Math.max(...usedYs, 100);
        const minX = Math.min(...usedXs, 1300);
        const minY = Math.min(...usedYs, 720);
        const deviceCap = 50 - tbState.devices.length;
  
        genPrompt = `You are an expert network architect. You are ADDING new devices and cables to an EXISTING network topology. Do NOT re-create existing devices.
  
  ${basePrompt}
  
  EXISTING TOPOLOGY (DO NOT recreate these — they already exist):
  ${existingContext}
  
  EXISTING HOSTNAMES (already taken, use different names): ${existingHostnames.join(', ')}
  
  OCCUPIED CANVAS REGION: roughly x:${minX}-${maxX}, y:${minY}-${maxY}. Place NEW devices in EMPTY areas to avoid overlap. Good options: ${maxX < 900 ? 'right side (x:900-1300)' : minX > 400 ? 'left side (x:100-400)' : 'bottom area (y:500-720)'} or any unoccupied area.
  
  IMPORTANT RULES FOR ADD MODE:
  - Output ONLY the NEW devices and cables. Do NOT include existing devices.
  - You can reference existing device hostnames in cables (fromHostname/toHostname) to connect new devices to the existing topology.
  - Max ${deviceCap} new devices (${tbState.devices.length} already exist, limit is 50).
  - Use hostnames that don't conflict with existing ones.
  - Make sure IP addressing is compatible with existing subnets. Look at existing IPs to pick non-conflicting addresses.
  - If the user wants to connect to an existing device, use that device's hostname in the cable definition and pick an interface name that might be free.
  - For VPN connections: create vpg devices and include vpnConfig with matching crypto parameters on both VPN endpoints.
  - For VXLAN: include vxlanConfig arrays on switches/routers with matching VNIs and VTEP IPs.
  
  USER REQUEST: Add the following to the existing topology: ${expandedScenario}
  
  Generate JSON with ONLY the new devices and cables.`;
      } else {
        genPrompt = `You are an expert network architect and CompTIA Network+ instructor. Generate a detailed, realistic network topology as a JSON object.
  
  ${basePrompt}
  
  USER REQUEST: ${expandedScenario}
  
  Generate the complete topology JSON now.`;
      }
  
      // Helper: call the AI and parse the response
      async function _tbCallAiAndParse(promptText, maxTok) {
        const r = await _claudeFetch( {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTok, messages: [{ role: 'user', content: promptText }] })
        });
        if (!r.ok) return { error: r.status };
        const d = await r.json();
        const stopReason = d.stop_reason || '';
        const txt = (d.content && d.content[0] && d.content[0].text) || '';
        return { text: txt, stopReason, parsed: tbParseAiTopologyJson(txt) };
      }
  
      // Attempt 1: full prompt with 8192 tokens
      let result = await _tbCallAiAndParse(genPrompt, 8192);
      if (result.error) { showErrorToast(`AI generation failed: ${result.error}`); return; }
      let payload = result.parsed;
  
      // If parse failed or truncated, retry with a simplified prompt + more tokens
      if (!payload || !payload.devices) {
        showErrorToast('Retrying with simplified prompt...');
        const retryPrompt = `You are a network architect. Generate a JSON topology for: "${scenario}"
  
  VALID DEVICE TYPES: ${Object.keys(TB_DEVICE_TYPES).join(', ')}
  - "data center"/"data centre" → use type "onprem-dc"
  - VPN between DCs → use type "vpg" (VPN Gateway) wired between DCs, include vpnConfig on vpg and onprem-dc devices
  - vpnConfig example: {"peerIp":"","psk":"Secret123","ikeVersion":"IKEv2","encryption":"AES-256","hashAlgo":"SHA-256","dhGroup":14}
  
  OUTPUT FORMAT — ONLY valid JSON, nothing else:
  {"devices":[{"type":"onprem-dc","hostname":"DC1","x":200,"y":400,"interfaces":[{"name":"eth0","ip":"10.1.1.1","mask":"255.255.255.0","gateway":""}],"routingTable":[],"vpnConfig":null}],"cables":[{"fromHostname":"DC1","fromIface":"eth0","toHostname":"VPG1","toIface":"tun0","type":"fiber"}]}
  
  Generate the topology now. ONLY JSON output.`;
        const retry = await _tbCallAiAndParse(retryPrompt, 8192);
        if (retry.error) { showErrorToast(`AI retry failed: ${retry.error}`); return; }
        payload = retry.parsed;
      }
  
      if (!payload || !payload.devices) {
        console.error('[AI Topology] Both attempts failed. Raw response:', result.text);
        showErrorToast('AI returned invalid topology. Check browser console for details. Try a simpler description.');
        return;
      }
  
      if (mode === 'add') {
        const hostnameToId = {};
        tbState.devices.forEach(d => { hostnameToId[d.hostname] = d.id; });
        tbBuildFromAiPayload(payload, tbState, hostnameToId);
        tbMigrateState(tbState);
      } else {
        const newState = tbNewState();
        newState.name = scenario.slice(0, 40);
        const hostnameToId = {};
        tbBuildFromAiPayload(payload, newState, hostnameToId);
        tbState = newState;
      }
  
      // Phase 2: Deep validation + auto-fix
      showErrorToast('Phase 2/2: Validating & fixing...');
      const fixes = tbDeepValidateAndFix(tbState, scenario);
      tbMigrateState(tbState);
      tbSelectedId = null;
      tbPendingCableFrom = null;
      tbSaveDraft();
      tbRenderCanvas();
      tbUpdateDeviceCount();
      const fixMsg = fixes.length > 0 ? ` (${fixes.length} auto-fixes applied)` : '';
      if (mode === 'add') {
        tbUpdateStatus(`AI added ${payload.devices.length} device(s)${fixMsg}`);
      } else {
        tbUpdateStatus(`AI generated: "${tbState.name}"${fixMsg}`);
      }
      if (fixes.length > 0) {
      }
    } catch (e) {
      showErrorToast('AI generation error: ' + (e.message || 'unknown'));
    }
  }
  
  // AI device walkthrough — explain a device's role and config
  function tbCloseExplainModal() {
    const m = document.getElementById('tb-explain-modal');
    if (m) m.classList.add('is-hidden');
  }
  
  async function tbExplainDevice(deviceId) {
    const dev = tbState.devices.find(d => d.id === deviceId);
    if (!dev) return;
    const key = (localStorage.getItem(STORAGE.KEY) || '').trim();
    if (!key) { showErrorToast('Add your Anthropic API key in Settings.'); return; }
  
    // Show modal immediately in loading state
    const modal = document.getElementById('tb-explain-modal');
    const body = document.getElementById('tb-explain-body');
    const title = document.getElementById('tb-explain-modal-title');
    if (!modal || !body) return;
    title.textContent = `💡 ${dev.hostname} (${TB_DEVICE_TYPES[dev.type]?.label || dev.type})`;
    body.innerHTML = '<div style="text-align:center;padding:32px 16px;color:var(--text-dim)"><div class="tb-coach-spinner" style="margin:0 auto 12px"></div>AI is analyzing this device…</div>';
    modal.classList.remove('is-hidden');
  
    const serialized = tbSerializeTopology(tbState);
    const devDetail = JSON.stringify({
      hostname: dev.hostname, type: dev.type,
      interfaces: dev.interfaces.map(i => ({ name: i.name, ip: i.ip, mask: i.mask, vlan: i.vlan, mode: i.mode, gateway: i.gateway })),
      routingTable: dev.routingTable,
      dhcpServer: dev.dhcpServer,
    }, null, 2);
  
    try {
      const res = await _claudeFetch( {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: CLAUDE_TEACHER_MODEL, max_tokens: MAX_TOKENS_TEACHER_COACH,
          messages: [{ role: 'user', content: `You are a Network+ instructor. Explain this device's role in the network in 2-3 paragraphs. Include what N10-009 concepts it demonstrates.\n\nFull topology:\n${serialized}\n\nDevice detail:\n${devDetail}\n\nKeep it under 200 words. No JSON, just plain text.` }]
        })
      });
      if (!res.ok) { body.innerHTML = `<div style="padding:20px;color:var(--red)">API error: ${res.status}. Check your API key in Settings.</div>`; return; }
      const data = await res.json();
      const text = (data.content && data.content[0] && data.content[0].text) || 'No response.';
      // Render explanation in the modal with nice formatting
      const paragraphs = text.split('\n').filter(l => l.trim()).map(p => `<p style="margin:0 0 12px;line-height:1.6">${p}</p>`).join('');
      body.innerHTML = `<div style="padding:20px">${paragraphs}</div>`;
    } catch (e) {
      body.innerHTML = `<div style="padding:20px;color:var(--red)">Error: ${e.message || 'Unknown error'}</div>`;
    }
  }
  
  // ══════════════════════════════════════════
  // TOPOLOGY BUILDER — Guided Topology Labs
  // ══════════════════════════════════════════
  
  const TB_LABS = [
    {
      id: 'basic-lan',
      title: 'Basic LAN Setup',
      objective: '1.2',
      difficulty: 'Beginner',
      duration: '10 min',
      description: 'Build a simple LAN with a router, switch, and 3 PCs. Configure IPs and verify connectivity with ping.',
      steps: [
        {
          title: 'Drop a Router onto the canvas',
          instruction: 'Drag a **Router** from the palette onto the canvas. This will be your default gateway — the device that routes traffic between subnets.',
          hint: 'Find "Router" in the device palette on the left. Click and drag it onto the canvas.',
          check: (s) => s.devices.some(d => d.type === 'router'),
          feedback: (s) => s.devices.some(d => d.type === 'router') ? null : 'No router found. Drag a Router from the palette onto the canvas.',
        },
        {
          title: 'Drop a Switch',
          instruction: 'Drag a **Switch** onto the canvas below the router. Switches operate at **Layer 2** and forward frames based on MAC addresses. Unlike hubs, switches learn which MAC is on which port.',
          hint: 'A switch connects multiple devices at Layer 2. It is NOT a router — it does not route between subnets.',
          check: (s) => s.devices.some(d => d.type === 'switch' || d.type === 'dmz-switch'),
          feedback: (s) => s.devices.some(d => d.type === 'switch' || d.type === 'dmz-switch') ? null : 'No switch found. Drag a Switch from the palette.',
        },
        {
          title: 'Connect Router to Switch',
          instruction: 'Click the **Router**, then click the **Switch** to draw a cable between them. This cable will carry traffic between your LAN and the router.',
          hint: 'Click on one device, then click on another device — a cable is drawn automatically between available interfaces.',
          check: (s) => s.cables.length >= 1,
          feedback: (s) => {
            if (s.cables.length === 0) return 'No cables found. Click one device, then click another to cable them.';
            const c = s.cables[0];
            const hasR = s.devices.find(d => d.id === c.from)?.type === 'router' || s.devices.find(d => d.id === c.to)?.type === 'router';
            return hasR ? null : 'Cable exists but does not connect to the router. Connect the router to the switch.';
          },
        },
        {
          title: 'Add 3 PCs and wire them',
          instruction: 'Drag **3 PCs** onto the canvas and connect **each one** to the Switch. In a star topology, all endpoints connect to the central switch.',
          hint: 'You need 3 PCs and at least 4 cables total (1 router-switch + 3 PC-switch).',
          check: (s) => s.devices.filter(d => d.type === 'pc').length >= 3 && s.cables.length >= 4,
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc').length;
            const cables = s.cables.length;
            if (pcs < 3) return `Only ${pcs}/3 PCs placed. Add ${3 - pcs} more.`;
            if (cables < 4) return `Only ${cables}/4 cables. Connect each PC to the switch.`;
            return null;
          },
        },
        {
          title: 'Configure Router IP',
          instruction: 'Double-click the **Router** → **Interfaces** tab. Set the connected interface IP to `192.168.1.1` with mask `255.255.255.0`. This IP becomes the **default gateway** for all PCs.',
          hint: 'The router interface IP is what PCs use as their gateway. Without it, the router cannot route traffic.',
          check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.interfaces.some(i => i.ip); },
          feedback: (s) => {
            const r = s.devices.find(d => d.type === 'router');
            if (!r) return 'No router found.';
            if (!r.interfaces.some(i => i.ip)) return 'Router has no IP configured. Double-click it → Interfaces tab → set an IP.';
            return null;
          },
        },
        {
          title: 'Configure PC IPs + gateways',
          instruction: 'Double-click each **PC** and set their IPs to `192.168.1.10`, `.11`, `.12` with mask `255.255.255.0`. Set each PC\'s **gateway** to `192.168.1.1` (the router). Without a gateway, PCs cannot reach other subnets!',
          hint: 'Each PC needs: (1) a unique IP in the same subnet as the router, (2) the gateway field pointing to the router IP.',
          check: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc');
            return pcs.filter(p => p.interfaces.some(i => i.ip)).length >= 3;
          },
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc');
            const withIp = pcs.filter(p => p.interfaces.some(i => i.ip));
            const withGw = pcs.filter(p => p.interfaces.some(i => i.gateway));
            if (withIp.length < 3) return `${withIp.length}/3 PCs have IPs. Configure the rest.`;
            if (withGw.length < 3) return `${withGw.length}/3 PCs have gateways. Set gateway to the router IP (192.168.1.1).`;
            return null;
          },
        },
        {
          title: 'Test Connectivity — Ping!',
          instruction: 'Click **Ping** in the toolbar. Select **PC1 → PC2** and hit **Ping**. Watch the packet animate across the network! Then try **PC1 → Router**. Open the **Sim Log** to see each hop. Finally, try `show arp` in PC1\'s CLI to see the learned MAC addresses.',
          hint: 'Ping validates Layer 3 connectivity. ARP resolves IPs to MACs first, then ICMP packets flow.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'vlan-segmentation',
      title: 'VLAN Network Segmentation',
      objective: '2.1',
      difficulty: 'Intermediate',
      duration: '15 min',
      description: 'Segment a network using VLANs. Configure access ports, trunk ports, and verify isolation between VLANs.',
      steps: [
        {
          title: 'Build the base network',
          instruction: 'Create: **1 Router, 1 Switch, 4 PCs**. Connect all PCs to the Switch and the Switch to the Router. This gives us a flat network that we\'ll segment with VLANs.',
          hint: 'You need 5 cables minimum: 1 router-switch + 4 PC-switch.',
          check: (s) => s.devices.filter(d => d.type === 'pc').length >= 4 && s.devices.some(d => d.type === 'switch') && s.cables.length >= 5,
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc').length;
            const sw = s.devices.some(d => d.type === 'switch');
            if (pcs < 4) return `${pcs}/4 PCs placed.`;
            if (!sw) return 'No switch found.';
            if (s.cables.length < 5) return `${s.cables.length}/5 cables.`;
            return null;
          },
        },
        {
          title: 'Create VLANs 10 & 20',
          instruction: 'Double-click the **Switch** → **VLANs** tab. Add **VLAN 10** (name: "Sales") and **VLAN 20** (name: "Engineering"). VLANs create **separate broadcast domains** on the same physical switch — traffic from VLAN 10 cannot reach VLAN 20 without a router.',
          hint: 'VLAN 1 (default) already exists. You need to add two more. Each VLAN is like a virtual switch within the physical switch.',
          check: (s) => { const sw = s.devices.find(d => d.type === 'switch'); return sw && sw.vlanDb && sw.vlanDb.length >= 3; },
          feedback: (s) => {
            const sw = s.devices.find(d => d.type === 'switch');
            if (!sw) return 'No switch found.';
            const count = sw.vlanDb ? sw.vlanDb.length : 0;
            if (count < 3) return `Switch has ${count} VLANs (need 3: default + VLAN 10 + VLAN 20).`;
            const has10 = sw.vlanDb.some(v => v.id === 10);
            const has20 = sw.vlanDb.some(v => v.id === 20);
            if (!has10) return 'Missing VLAN 10 — add it in the VLANs tab.';
            if (!has20) return 'Missing VLAN 20 — add it in the VLANs tab.';
            return null;
          },
        },
        {
          title: 'Assign access ports',
          instruction: 'Switch → **Interfaces** tab. Set **2 PC-facing ports** to VLAN 10 (access mode) and **2 ports** to VLAN 20. An **access port** carries traffic for only ONE VLAN — the switch strips the VLAN tag before sending frames to the end device.',
          hint: 'In the Interfaces tab, change the VLAN dropdown for each port. Access mode = single VLAN. The PC never sees the VLAN tag.',
          check: (s) => { const sw = s.devices.find(d => d.type === 'switch'); return sw && sw.interfaces.filter(i => i.vlan === 10).length >= 2; },
          feedback: (s) => {
            const sw = s.devices.find(d => d.type === 'switch');
            if (!sw) return 'No switch found.';
            const v10 = sw.interfaces.filter(i => i.vlan === 10).length;
            const v20 = sw.interfaces.filter(i => i.vlan === 20).length;
            return `VLAN 10 ports: ${v10}/2, VLAN 20 ports: ${v20}/2. Assign ports in the Interfaces tab.`;
          },
        },
        {
          title: 'Configure the trunk port',
          instruction: 'Set the Switch port **facing the Router** to **Trunk** mode. Set allowed VLANs to `1,10,20`. A **trunk port** carries traffic for MULTIPLE VLANs using 802.1Q tags — the router needs to see which VLAN each frame belongs to.',
          hint: 'Trunk vs Access: trunk = multi-VLAN with tags, access = single VLAN without tags. The uplink to the router MUST be a trunk for inter-VLAN routing.',
          check: (s) => { const sw = s.devices.find(d => d.type === 'switch'); return sw && sw.interfaces.some(i => i.mode === 'trunk'); },
          feedback: (s) => {
            const sw = s.devices.find(d => d.type === 'switch');
            if (!sw) return 'No switch found.';
            const trunk = sw.interfaces.find(i => i.mode === 'trunk');
            if (!trunk) return 'No trunk port found. Change the router-facing port to Trunk mode.';
            return null;
          },
        },
        {
          title: 'Router-on-a-Stick',
          instruction: 'Double-click the **Router** → **Interfaces** tab. Set the connected interface IP to `192.168.10.1/24` (VLAN 10 gateway). This pattern is called **Router-on-a-Stick** — one physical interface handles multiple VLANs via sub-interfaces or secondary addresses.',
          hint: 'The router needs at least one IP in the VLAN 10 subnet to serve as its gateway.',
          check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.interfaces.some(i => i.ip); },
          feedback: (s) => {
            const r = s.devices.find(d => d.type === 'router');
            if (!r) return 'No router found.';
            if (!r.interfaces.some(i => i.ip)) return 'Router has no IP. Set an IP on the trunk-facing interface.';
            return null;
          },
        },
        {
          title: 'Configure PCs per VLAN',
          instruction: 'VLAN 10 PCs: `192.168.10.10`, `.11` (gateway `192.168.10.1`). VLAN 20 PCs: `192.168.20.10`, `.11` (gateway `192.168.20.1`). Each VLAN uses a **different subnet** — that\'s how VLANs map to IP addressing.',
          hint: 'VLAN 10 = 192.168.10.0/24, VLAN 20 = 192.168.20.0/24. PCs in different VLANs MUST be in different subnets.',
          check: (s) => s.devices.filter(d => d.type === 'pc' && d.interfaces.some(i => i.ip)).length >= 4,
          feedback: (s) => {
            const withIp = s.devices.filter(d => d.type === 'pc' && d.interfaces.some(i => i.ip)).length;
            return withIp < 4 ? `${withIp}/4 PCs have IPs configured.` : null;
          },
        },
        {
          title: 'Test VLAN isolation',
          instruction: 'Ping **within** VLAN 10 (PC to PC) — should succeed directly. Then ping **across** VLANs (VLAN 10 PC → VLAN 20 PC) — this traffic MUST go through the router. Open the **Sim Log** to see the path. Try `show mac address-table` on the switch to see per-port VLAN assignments.',
          hint: 'Same-VLAN traffic is switched (Layer 2). Cross-VLAN traffic is routed (Layer 3). This is inter-VLAN routing.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'dhcp-setup',
      title: 'DHCP Server & Relay',
      objective: '1.6',
      difficulty: 'Intermediate',
      duration: '15 min',
      description: 'Set up a DHCP server to automatically assign IPs, then configure DHCP relay to serve a remote subnet.',
      steps: [
        {
          title: 'Build two subnets',
          instruction: 'Create: **1 Router, 2 Switches, 1 Server, 4 PCs**. Connect Switch1 + Server + 2 PCs on one side of the Router, and Switch2 + 2 PCs on the other. The router separates two broadcast domains.',
          hint: 'The router needs TWO interfaces — one facing each switch/subnet.',
          check: (s) => s.devices.filter(d => d.type === 'switch').length >= 2 && s.devices.some(d => d.type === 'server'),
          feedback: (s) => {
            const swCount = s.devices.filter(d => d.type === 'switch').length;
            const hasSrv = s.devices.some(d => d.type === 'server');
            if (swCount < 2) return `${swCount}/2 switches placed.`;
            if (!hasSrv) return 'No server found. Drag a Server from the palette.';
            return null;
          },
        },
        {
          title: 'Configure Router interfaces',
          instruction: 'Double-click the Router. Set the interface facing Switch1 to `192.168.1.1/24` and the interface facing Switch2 to `192.168.2.1/24`. The router now bridges two subnets — **192.168.1.0/24** and **192.168.2.0/24**.',
          hint: 'Each interface must be in a different subnet. That\'s what makes a router a router — it connects different networks.',
          check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.interfaces.filter(i => i.ip).length >= 2; },
          feedback: (s) => {
            const r = s.devices.find(d => d.type === 'router');
            if (!r) return 'No router found.';
            const ips = r.interfaces.filter(i => i.ip).length;
            return ips < 2 ? `Router has ${ips}/2 interfaces configured with IPs.` : null;
          },
        },
        {
          title: 'Configure DHCP Server',
          instruction: 'Double-click the **Server** → **DHCP** tab. Enable DHCP with: network `192.168.1.0`, mask `255.255.255.0`, gateway `192.168.1.1`, range `192.168.1.100`-`192.168.1.200`. Set the server static IP to `192.168.1.5`. The DHCP server uses the **DORA** process: Discover → Offer → Request → Acknowledge.',
          hint: 'The DHCP server itself needs a static IP (not DHCP-assigned). Set it in the Interfaces tab first, then configure the DHCP pool in the DHCP tab.',
          check: (s) => { const srv = s.devices.find(d => d.type === 'server'); return srv && srv.dhcpServer; },
          feedback: (s) => {
            const srv = s.devices.find(d => d.type === 'server');
            if (!srv) return 'No server found.';
            if (!srv.dhcpServer) return 'DHCP not configured. Double-click the Server → DHCP tab → enable and configure the pool.';
            return null;
          },
        },
        {
          title: 'Test DHCP — watch DORA!',
          instruction: 'Make sure PCs on Switch1 have **no IP** (clear them if set). Click **DHCP** in the toolbar. Watch the Sim Log — you\'ll see the full **DORA** exchange:\n\n1. **Discover**: PC broadcasts "I need an IP!"\n2. **Offer**: Server says "Here\'s 192.168.1.100"\n3. **Request**: PC says "I\'ll take it"\n4. **Acknowledge**: Server confirms the lease\n\nVerify the PCs got IPs by double-clicking them.',
          hint: 'DHCP Discover uses broadcast (255.255.255.255) because the client has no IP yet. The server offers from its pool.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Configure DHCP Relay',
          instruction: 'PCs on Switch2 are in a **different broadcast domain** — DHCP Discovers won\'t reach the server! Fix: double-click the **Router** → **DHCP** tab → set **ip helper-address** to `192.168.1.5`. The router will now **relay** (unicast forward) DHCP broadcasts from Subnet 2 to the server.',
          hint: 'DHCP Relay (ip helper-address) converts broadcast to unicast. Without it, DHCP only works within the same broadcast domain.',
          check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.dhcpRelay; },
          feedback: (s) => {
            const r = s.devices.find(d => d.type === 'router');
            if (!r) return 'No router found.';
            if (!r.dhcpRelay) return 'DHCP Relay not configured. Router → DHCP tab → set ip helper-address to the server IP.';
            return null;
          },
        },
        {
          title: 'Test DHCP Relay across subnets',
          instruction: 'Clear IPs on Switch2 PCs. Click **DHCP** again. Watch the Sim Log — the router intercepts the Discover broadcast, relays it as unicast to the DHCP server at `192.168.1.5`. The server responds with an offer. Without the relay, these PCs would never get an IP! Verify by checking PC interfaces.',
          hint: 'The relay works because the router changes the giaddr field in the DHCP packet to its own interface IP (192.168.2.1), telling the server which subnet the request came from.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'dmz-firewall',
      title: 'DMZ & Firewall Design',
      objective: '4.5',
      difficulty: 'Advanced',
      duration: '20 min',
      description: 'Design a screened subnet (DMZ) with firewalls protecting public servers from the internal network.',
      steps: [
        {
          title: 'Place the perimeter firewall',
          instruction: 'Drag an **Internet/WAN** (cloud) and a **Firewall** onto the canvas. Connect the Cloud to the Firewall. The firewall is your **perimeter security device** — it inspects all traffic entering and leaving your network. In the real world, this would be a Palo Alto, Fortinet, or Cisco ASA.',
          hint: 'The firewall needs at least 3 zones: Outside (internet), DMZ (semi-trusted), Inside (trusted). Each zone is a different interface.',
          check: (s) => s.devices.some(d => d.type === 'firewall') && s.devices.some(d => d.type === 'cloud'),
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'cloud')) return 'No Internet/WAN cloud found.';
            if (!s.devices.some(d => d.type === 'firewall')) return 'No Firewall found.';
            return null;
          },
        },
        {
          title: 'Create the DMZ segment',
          instruction: 'Drag a **DMZ Switch** and connect it to the Firewall. Then place a **Public Web Server** and **Public File Server** on the DMZ switch. The DMZ (Demilitarized Zone) is a **semi-trusted zone** — it holds servers that must be internet-accessible but should NOT have direct access to your internal network.',
          hint: 'DMZ = screened subnet. Public servers go here so a compromise doesn\'t directly expose internal resources.',
          check: (s) => s.devices.some(d => d.type === 'dmz-switch') && s.devices.some(d => d.type.startsWith('public-')),
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'dmz-switch')) return 'No DMZ Switch found.';
            if (!s.devices.some(d => d.type.startsWith('public-'))) return 'No public servers found. Add a Public Web Server or Public File Server.';
            return null;
          },
        },
        {
          title: 'Build the internal LAN',
          instruction: 'Drag a regular **Switch** and connect it to the Firewall (different interface than DMZ). Add **2+ PCs** and a **Server** to the internal switch. This is your **trusted zone** — highest security, most restricted access from outside.',
          hint: 'The firewall now has 3 interfaces: eth0 → Internet, eth1 → DMZ, eth2 → Internal. Each with different security policies.',
          check: (s) => s.devices.filter(d => d.type === 'pc').length >= 2 && s.cables.length >= 6,
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc').length;
            if (pcs < 2) return `${pcs}/2 internal PCs.`;
            if (s.cables.length < 6) return `${s.cables.length}/6 cables.`;
            return null;
          },
        },
        {
          title: 'Configure 3-zone addressing',
          instruction: 'Set IPs on the Firewall:\n• **Outside** (internet-facing): `203.0.113.1/24`\n• **DMZ**: `10.0.1.1/24`\n• **Inside**: `192.168.1.1/24`\n\nPublic servers: `10.0.1.10`, `10.0.1.11` (gateway `10.0.1.1`).\nInternal PCs: `192.168.1.10+` (gateway `192.168.1.1`).',
          hint: 'Three different subnets, three different security zones. The firewall is the gateway for all three.',
          check: (s) => { const fw = s.devices.find(d => d.type === 'firewall'); return fw && fw.interfaces.filter(i => i.ip).length >= 2; },
          feedback: (s) => {
            const fw = s.devices.find(d => d.type === 'firewall');
            if (!fw) return 'No firewall found.';
            const ips = fw.interfaces.filter(i => i.ip).length;
            return ips < 3 ? `Firewall has ${ips}/3 interfaces with IPs. Configure all 3 zones.` : null;
          },
        },
        {
          title: 'Grade your DMZ design',
          instruction: 'Select the **DMZ / Screened Subnet** scenario from the toolbar dropdown, then hit **Grade**. Critical rule: **ALL public servers MUST be on the DMZ switch**, not the internal switch. If a public server is on the internal network, an attacker who compromises it gets direct LAN access — that\'s the whole point of a DMZ!',
          hint: 'Common mistake: putting public servers on the internal switch. The grader checks for this.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Get AI Coach review',
          instruction: 'Hit **Coach** for an AI-powered walkthrough of your design. The coach analyzes your topology against N10-009 objectives 4.5 (Physical Security) and 4.1 (Security Concepts). It will highlight strengths and suggest improvements — like adding an IDS for traffic inspection or a second firewall for defense-in-depth.',
          hint: 'Defense-in-depth: multiple layers of security. Consider adding an IDS between the firewall and DMZ for packet inspection.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'arp-investigation',
      title: 'ARP & MAC Learning',
      objective: '2.1',
      difficulty: 'Beginner',
      duration: '10 min',
      description: 'Watch how ARP broadcasts resolve IPs to MACs and how switches learn MAC addresses.',
      steps: [
        {
          title: 'Build a simple LAN',
          instruction: 'Create: **1 Switch, 3 PCs**. Connect all PCs to the Switch. Set IPs: PC1=`192.168.1.10`, PC2=`192.168.1.11`, PC3=`192.168.1.12`. Mask: `255.255.255.0`. All devices MUST be in the same subnet for ARP to work — ARP is a **Layer 2 broadcast** protocol that doesn\'t cross routers.',
          hint: 'ARP maps IP → MAC within a broadcast domain. You don\'t need a router for this lab since all devices are on the same subnet.',
          check: (s) => s.devices.filter(d => d.type === 'pc' && d.interfaces.some(i => i.ip)).length >= 3,
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc');
            const withIp = pcs.filter(p => p.interfaces.some(i => i.ip)).length;
            if (pcs.length < 3) return `${pcs.length}/3 PCs placed.`;
            if (withIp < 3) return `${withIp}/3 PCs have IPs.`;
            return null;
          },
        },
        {
          title: 'Verify empty MAC table',
          instruction: 'Double-click the **Switch** → **CLI** tab. Type `show mac address-table`. It should be **empty** — no frames have been sent yet, so the switch hasn\'t learned any MACs. Switches start with a blank table and learn dynamically.',
          hint: 'MAC tables are populated by examining the SOURCE MAC of incoming frames. No traffic = no entries.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Send an ARP request',
          instruction: 'Click **Ping/ARP** in the toolbar. Select **PC1** as source and **PC2** as destination. Click **ARP** (not Ping). Watch the Sim Log:\n\n1. PC1 sends an **ARP Request** (broadcast to FF:FF:FF:FF:FF:FF): "Who has 192.168.1.11? Tell 192.168.1.10"\n2. The switch floods this frame out ALL ports (broadcast behavior)\n3. PC2 recognizes its IP and sends an **ARP Reply** (unicast) with its MAC\n4. PC1 stores the mapping in its ARP cache',
          hint: 'ARP Request = broadcast (everyone hears it). ARP Reply = unicast (only the requester gets it).',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Inspect tables after ARP',
          instruction: 'Now check what was learned:\n• PC1 CLI: `show arp` — you should see PC2\'s IP→MAC mapping\n• Switch CLI: `show mac address-table` — it learned **both** PC1 and PC2\'s MACs on their respective ports\n\nThe switch learned MACs from the **source** of each frame it saw (the ARP request from PC1, the ARP reply from PC2).',
          hint: 'Switches learn from source MACs, forward based on destination MACs. This is the fundamental L2 forwarding model.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Observe broadcast flooding',
          instruction: 'Send another ARP: **PC1 → PC3**. Check the Sim Log — the ARP request was **broadcast to ALL ports** on the switch (including PC2\'s port), but only PC3 replies. This is the broadcast domain in action. All devices on a switch (same VLAN) share one broadcast domain — that\'s why VLANs exist, to segment broadcasts! Try `show arp` on PC1 to see both PC2 and PC3 cached.',
          hint: 'Broadcast storms happen when too many devices share a broadcast domain. VLANs solve this by creating separate broadcast domains.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    // ── Cloud Networking Labs ──
    {
      id: 'cloud-vpc-lab',
      title: 'Cloud VPC with Security Controls',
      objective: '1.8',
      difficulty: 'Intermediate',
      duration: '15 min',
      description: 'Build a cloud VPC with public/private subnets, security groups, NACLs, and an IPSec VPN to an on-prem data center.',
      steps: [
        {
          title: 'Create a VPC',
          instruction: 'Drag a **VPC** device onto the canvas. Double-click it → **VPC Config** tab. Set CIDR to `10.0.0.0/16`. Enable **DNS Support** and **DNS Hostnames**. A VPC is a logically isolated section of the cloud — think of it as your own private data center in AWS/Azure.',
          hint: '/16 gives you 65,534 usable IPs — enough to subdivide into many subnets.',
          check: (s) => s.devices.some(d => d.type === 'vpc' && d.vpcConfig && d.vpcConfig.cidr),
          feedback: (s) => {
            const vpc = s.devices.find(d => d.type === 'vpc');
            if (!vpc) return 'No VPC found. Drag one from the palette.';
            if (!vpc.vpcConfig || !vpc.vpcConfig.cidr) return 'VPC CIDR not set. Double-click VPC → VPC Config → set CIDR.';
            return null;
          },
        },
        {
          title: 'Add Subnets',
          instruction: 'Drag **2 Cloud Subnets** and wire both to the VPC. Name one "Public-Subnet" and one "Private-Subnet". Public subnets have a route to an Internet Gateway. Private subnets do NOT — they\'re isolated from direct internet access.',
          hint: 'Subnet naming matters for clarity. Public = internet-routable. Private = internal only (uses NAT for outbound).',
          check: (s) => s.devices.filter(d => d.type === 'cloud-subnet').length >= 2,
          feedback: (s) => {
            const count = s.devices.filter(d => d.type === 'cloud-subnet').length;
            return count < 2 ? `${count}/2 subnets placed. Add ${2 - count} more Cloud Subnet(s).` : null;
          },
        },
        {
          title: 'Attach Internet Gateway',
          instruction: 'Drag an **Internet Gateway** and wire it to the VPC. An IGW is the VPC\'s door to the internet. Without it, nothing in the VPC can reach the outside world. In AWS, you also need a route table entry (0.0.0.0/0 → IGW).',
          hint: 'IGW is horizontally scaled, redundant, and highly available. It performs 1:1 NAT for instances with public IPs.',
          check: (s) => s.devices.some(d => d.type === 'igw'),
          feedback: (s) => s.devices.some(d => d.type === 'igw') ? null : 'No Internet Gateway found.',
        },
        {
          title: 'Add NAT Gateway',
          instruction: 'Drag a **NAT Gateway** and wire it to the **Public Subnet**. The NAT GW allows private subnet instances to make **outbound** internet requests (e.g., software updates) without being directly reachable from the internet. It\'s one-way: out is OK, inbound from internet is blocked.',
          hint: 'NAT GW lives in the PUBLIC subnet (it needs internet access itself) but serves the PRIVATE subnet.',
          check: (s) => s.devices.some(d => d.type === 'nat-gw'),
          feedback: (s) => s.devices.some(d => d.type === 'nat-gw') ? null : 'No NAT Gateway found.',
        },
        {
          title: 'Configure Security Groups (stateful)',
          instruction: 'Double-click the **VPC** → **Security Groups** tab. Add a group named "web-sg". Add an **inbound** rule: Protocol `tcp`, Port `443`, Source `0.0.0.0/0`, Action `allow`. Security Groups are **stateful** — if you allow inbound 443, the return traffic is automatically allowed. You only need to define the initiating direction.',
          hint: 'Stateful = tracks connections. Stateless (NACLs) = does not track. SGs are instance-level, NACLs are subnet-level.',
          check: (s) => s.devices.some(d => d.securityGroups && d.securityGroups.length > 0),
          feedback: (s) => {
            const withSg = s.devices.find(d => d.securityGroups && d.securityGroups.length > 0);
            if (!withSg) return 'No Security Groups configured. Double-click VPC → Security Groups tab → Add a group.';
            const sg = withSg.securityGroups[0];
            if (!sg.rules || sg.rules.length === 0) return 'Security Group exists but has no rules. Add an inbound allow rule for TCP/443.';
            return null;
          },
        },
        {
          title: 'Configure NACLs (stateless)',
          instruction: 'Double-click **Public Subnet** → **NACLs** tab. Add inbound rules:\n• Rule #100: Allow TCP/443\n• Rule #200: Allow TCP/80\n\nNACLs are **stateless** — you MUST add matching outbound rules too! Add outbound Rule #100: Allow All. NACLs evaluate rules by number (lowest first), first match wins. There\'s an implicit deny-all at the end.',
          hint: 'NACL gotcha: forgetting outbound rules. Since NACLs don\'t track state, return traffic for an allowed inbound connection will be DENIED if no outbound rule permits it.',
          check: (s) => s.devices.some(d => d.type === 'cloud-subnet' && d.nacls && d.nacls.length > 0),
          feedback: (s) => {
            const sub = s.devices.find(d => d.type === 'cloud-subnet' && d.nacls && d.nacls.length > 0);
            if (!sub) return 'No NACLs configured on any subnet. Double-click a Cloud Subnet → NACLs tab.';
            return null;
          },
        },
        {
          title: 'VPN to On-Prem (IPSec)',
          instruction: 'Drag a **VPN Gateway** and an **On-Prem DC**. Wire VPG → VPC and VPG → On-Prem DC. Double-click both and go to the **VPN** tab. Set matching parameters on BOTH sides:\n• IKEv2, AES-256, SHA-256, DH Group 14, same PSK (e.g., "MySecret123")\n\nClick **Negotiate Tunnel** on either side. If all 5 crypto params match + PSK matches, the tunnel comes UP (green). Mismatches show specific error messages.',
          hint: 'IPSec Phase 1 (IKE) negotiates the security association. Both sides MUST agree on: IKE version, encryption algorithm, hash algorithm, DH group, and pre-shared key.',
          check: (s) => s.devices.some(d => d.type === 'vpg') && s.devices.some(d => d.type === 'onprem-dc'),
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'vpg')) return 'No VPN Gateway found.';
            if (!s.devices.some(d => d.type === 'onprem-dc')) return 'No On-Prem DC found.';
            return null;
          },
        },
      ]
    },
    {
      id: 'sase-zero-trust',
      title: 'SASE & Zero Trust Architecture',
      objective: '4.1',
      difficulty: 'Advanced',
      duration: '12 min',
      description: 'Design a SASE architecture with zero trust network access, secure web gateway, and firewall-as-a-service.',
      steps: [
        {
          title: 'Cloud foundation',
          instruction: 'Add a **VPC**, **Cloud Subnet**, and **Internet GW**. Wire IGW → VPC → Subnet. Set VPC CIDR to `10.0.0.0/16`. This is your cloud infrastructure that SASE will protect.',
          hint: 'SASE (Secure Access Service Edge) combines network security functions (SWG, CASB, FWaaS, ZTNA) into a single cloud-delivered service.',
          check: (s) => s.devices.some(d => d.type === 'vpc') && s.devices.some(d => d.type === 'igw'),
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'vpc')) return 'No VPC found.';
            if (!s.devices.some(d => d.type === 'igw')) return 'No Internet Gateway found.';
            return null;
          },
        },
        {
          title: 'Add SASE Edge',
          instruction: 'Drag a **SASE Edge** device and wire it between the Internet GW and the VPC. In a real deployment, all traffic passes through the SASE edge for inspection — it\'s the policy enforcement point for your entire network.',
          hint: 'SASE replaces traditional VPN + firewall + proxy with a unified cloud service. Think Zscaler, Palo Alto Prisma, or Cisco Umbrella.',
          check: (s) => s.devices.some(d => d.type === 'sase-edge'),
          feedback: (s) => s.devices.some(d => d.type === 'sase-edge') ? null : 'No SASE Edge device found.',
        },
        {
          title: 'Configure Zero Trust (ZTNA)',
          instruction: 'Double-click SASE Edge → **SASE** tab. Configure:\n• **ZTNA Policy**: "Verify Always" (every request is authenticated, every session validated)\n• **SWG**: Enabled (Secure Web Gateway — URL filtering, malware scanning)\n• **CASB**: Enabled (Cloud Access Security Broker — shadow IT detection)\n• **Identity Provider**: "Azure AD"\n• **MFA**: Enabled\n\nZero Trust means: **never trust, always verify**. No implicit trust based on network location.',
          hint: 'The three pillars of Zero Trust: (1) Verify explicitly, (2) Least-privilege access, (3) Assume breach.',
          check: (s) => s.devices.some(d => d.saseConfig && d.saseConfig.ztnaPolicy === 'verify-always'),
          feedback: (s) => {
            const sase = s.devices.find(d => d.type === 'sase-edge');
            if (!sase) return 'No SASE Edge device found.';
            if (!sase.saseConfig) return 'SASE not configured. Double-click the SASE Edge → SASE tab.';
            if (sase.saseConfig.ztnaPolicy !== 'verify-always') return `ZTNA Policy is "${sase.saseConfig.ztnaPolicy}" — set it to "Verify Always".`;
            if (!sase.saseConfig.swg) return 'SWG is disabled. Enable it.';
            if (!sase.saseConfig.casb) return 'CASB is disabled. Enable it.';
            return null;
          },
        },
        {
          title: 'Add FWaaS rules',
          instruction: 'In the SASE tab, add **FWaaS** (Firewall as a Service) rules:\n1. Allow TCP/443 from `0.0.0.0/0` (HTTPS traffic)\n2. Allow TCP/80 from `0.0.0.0/0` (HTTP)\n3. Deny ALL from `0.0.0.0/0` (default deny)\n\nFWaaS replaces on-prem firewalls with cloud-native packet filtering. Rules are processed top-to-bottom.',
          hint: 'Order matters! Allow rules must come before the deny-all. This is the same as traditional ACL processing.',
          check: (s) => s.devices.some(d => d.saseConfig && d.saseConfig.fwaasPolicies && d.saseConfig.fwaasPolicies.length >= 2),
          feedback: (s) => {
            const sase = s.devices.find(d => d.saseConfig);
            if (!sase || !sase.saseConfig) return 'SASE not configured.';
            const rules = sase.saseConfig.fwaasPolicies || [];
            return rules.length < 2 ? `${rules.length}/2 FWaaS rules added. Add more rules in the SASE tab.` : null;
          },
        },
        {
          title: 'Hybrid connectivity (VPN)',
          instruction: 'Add an **On-Prem DC** and **VPN Gateway**. Wire VPG to VPC and to On-Prem DC. Configure matching **IPSec** on both sides and **negotiate the tunnel**. In a SASE world, this VPN might be replaced by ZTNA agent-based access, but IPSec site-to-site tunnels remain common for legacy integration.',
          hint: 'SASE doesn\'t eliminate VPNs overnight — most enterprises run hybrid (SASE + traditional VPN) during migration.',
          check: (s) => s.devices.some(d => d.type === 'onprem-dc'),
          feedback: (s) => s.devices.some(d => d.type === 'onprem-dc') ? null : 'No On-Prem DC found.',
        },
        {
          title: 'Verify via CLI',
          instruction: 'Double-click SASE Edge → **CLI**. Type `show sase` to see your full SASE configuration (ZTNA policy, SWG, CASB, FWaaS rules). Then check `show security-groups` on the VPC for instance-level controls. You\'ve built a complete Zero Trust architecture with: **ZTNA** (identity verification), **SWG** (web filtering), **CASB** (cloud app control), **FWaaS** (network filtering), and **IPSec VPN** (site-to-site connectivity).',
          hint: 'On the exam, remember: SASE = convergence of network + security in the cloud. ZTNA replaces VPN for user access.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    // ── New interactive labs ──
    {
      id: 'troubleshoot-connectivity',
      title: 'Troubleshoot: Why Can\'t I Ping?',
      objective: '5.3',
      difficulty: 'Intermediate',
      duration: '12 min',
      description: 'A pre-built network has connectivity issues. Use CLI tools to diagnose and fix them — just like a real helpdesk scenario.',
      autoSetup: (s) => {
        // Pre-build a broken network for the student to fix
        const rId = 'd_auto_r1', swId = 'd_auto_sw1', pc1Id = 'd_auto_pc1', pc2Id = 'd_auto_pc2', pc3Id = 'd_auto_pc3';
        s.devices = [
          { id: rId, type: 'router', x: 700, y: 150, hostname: 'R1',
            interfaces: [
              { name: 'Gi0/0', cableId: 'c_auto_1', ip: '192.168.1.1', mask: '255.255.255.0', mac: 'AA:BB:CC:00:00:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
              { name: 'Gi0/1', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:00:00:02', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
            ],
            routingTable: [{ type: 'connected', network: '192.168.1.0', mask: '255.255.255.0', nextHop: null, iface: 'Gi0/0' }],
            arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
          { id: swId, type: 'switch', x: 700, y: 350, hostname: 'SW1',
            interfaces: [
              { name: 'Fa0/0', cableId: 'c_auto_1', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:00:01:00', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
              { name: 'Fa0/1', cableId: 'c_auto_2', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:00:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
              { name: 'Fa0/2', cableId: 'c_auto_3', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:00:01:02', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
              { name: 'Fa0/3', cableId: 'c_auto_4', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:00:01:03', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
            ].concat(Array.from({length: 20}, (_, i) => ({ name: `Fa0/${i+4}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:BB:CC:00:01:${(i+4).toString(16).padStart(2,'0')}`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }))),
            routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [] },
          // PC1: correct config
          { id: pc1Id, type: 'pc', x: 400, y: 550, hostname: 'PC1',
            interfaces: [{ name: 'eth0', cableId: 'c_auto_2', ip: '192.168.1.10', mask: '255.255.255.0', mac: 'AA:BB:CC:00:02:00', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.1', enabled: true, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
          // PC2: WRONG subnet — 192.168.2.x instead of 192.168.1.x (the bug!)
          { id: pc2Id, type: 'pc', x: 700, y: 550, hostname: 'PC2',
            interfaces: [{ name: 'eth0', cableId: 'c_auto_3', ip: '192.168.2.20', mask: '255.255.255.0', mac: 'AA:BB:CC:00:03:00', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.2.1', enabled: true, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
          // PC3: correct IP but WRONG gateway
          { id: pc3Id, type: 'pc', x: 1000, y: 550, hostname: 'PC3',
            interfaces: [{ name: 'eth0', cableId: 'c_auto_4', ip: '192.168.1.30', mask: '255.255.255.0', mac: 'AA:BB:CC:00:04:00', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.254', enabled: true, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
        ];
        s.cables = [
          { id: 'c_auto_1', from: rId, to: swId, type: 'cat6', fromIface: 'Gi0/0', toIface: 'Fa0/0' },
          { id: 'c_auto_2', from: pc1Id, to: swId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/1' },
          { id: 'c_auto_3', from: pc2Id, to: swId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/2' },
          { id: 'c_auto_4', from: pc3Id, to: swId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/3' },
        ];
        s.name = 'Troubleshoot: Broken LAN';
      },
      steps: [
        {
          title: 'Survey the network',
          instruction: 'A user reports **PC2 and PC3 cannot access the network**. PC1 works fine. The network has been pre-built for you. Start by examining: double-click each PC and check the **Overview** tab to see their IP configurations. Compare them to the router\'s config. What do you notice?',
          hint: 'Look at the subnet. PC1 is on 192.168.1.0/24 — are the other PCs on the same subnet? Check gateways too.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Diagnose PC2',
          instruction: 'Double-click **PC2** → **CLI**. Run `ipconfig` to see its IP. Then try `ping 192.168.1.1` (the router). It fails! Now compare PC2\'s IP to the router\'s subnet. **Find the bug and fix it**: PC2 is on the wrong subnet. Change its IP to `192.168.1.20/24` and gateway to `192.168.1.1`.',
          hint: 'PC2 is on 192.168.2.0/24 but the router is on 192.168.1.0/24. They\'re in different subnets — ARP won\'t resolve across subnets without a router for that subnet.',
          check: (s) => {
            const pc2 = s.devices.find(d => d.hostname === 'PC2');
            return pc2 && pc2.interfaces.some(i => i.ip && i.ip.startsWith('192.168.1.'));
          },
          feedback: (s) => {
            const pc2 = s.devices.find(d => d.hostname === 'PC2');
            if (!pc2) return 'PC2 not found.';
            const ifc = pc2.interfaces[0];
            if (ifc.ip.startsWith('192.168.2.')) return `PC2 is still on ${ifc.ip} (wrong subnet). Change it to 192.168.1.x.`;
            if (ifc.gateway !== '192.168.1.1') return `PC2 IP is fixed but gateway is ${ifc.gateway || 'empty'}. Set it to 192.168.1.1.`;
            return null;
          },
        },
        {
          title: 'Diagnose PC3',
          instruction: 'PC3 has the right subnet but still can\'t reach beyond the switch. Double-click PC3 → check the **gateway**. It\'s pointing to `192.168.1.254` but the router is at `192.168.1.1`! Fix the gateway. This is a common real-world issue — wrong default gateway means the PC can ping local hosts but not remote ones.',
          hint: 'Same-subnet traffic doesn\'t need a gateway (Layer 2 switching). Cross-subnet traffic needs the correct gateway.',
          check: (s) => {
            const pc3 = s.devices.find(d => d.hostname === 'PC3');
            return pc3 && pc3.interfaces.some(i => i.gateway === '192.168.1.1');
          },
          feedback: (s) => {
            const pc3 = s.devices.find(d => d.hostname === 'PC3');
            if (!pc3) return 'PC3 not found.';
            const ifc = pc3.interfaces[0];
            if (ifc.gateway === '192.168.1.254') return 'PC3 gateway is still 192.168.1.254 (wrong). Change it to 192.168.1.1.';
            if (ifc.gateway !== '192.168.1.1') return `PC3 gateway is "${ifc.gateway}". Set it to 192.168.1.1.`;
            return null;
          },
        },
        {
          title: 'Verify your fixes',
          instruction: 'Now test! Use **Ping**: PC2 → R1 (should work now). PC3 → R1 (should work). PC1 → PC2 (should work). PC1 → PC3 (should work). Check the Sim Log to see the successful path. If any ping fails, re-check the IP/subnet/gateway of the failing device. You\'ve just completed a real troubleshooting workflow: **identify → diagnose → fix → verify**.',
          hint: 'The CompTIA troubleshooting methodology: 1) Identify the problem, 2) Establish a theory, 3) Test the theory, 4) Establish a plan of action, 5) Implement, 6) Verify, 7) Document.',
          check: (s) => {
            const pc2 = s.devices.find(d => d.hostname === 'PC2');
            const pc3 = s.devices.find(d => d.hostname === 'PC3');
            const pc2ok = pc2 && pc2.interfaces.some(i => i.ip && i.ip.startsWith('192.168.1.') && i.gateway === '192.168.1.1');
            const pc3ok = pc3 && pc3.interfaces.some(i => i.gateway === '192.168.1.1');
            return pc2ok && pc3ok;
          },
          feedback: (s) => {
            const pc2 = s.devices.find(d => d.hostname === 'PC2');
            const pc3 = s.devices.find(d => d.hostname === 'PC3');
            const issues = [];
            if (pc2 && !pc2.interfaces.some(i => i.ip && i.ip.startsWith('192.168.1.'))) issues.push('PC2 still has wrong IP subnet');
            if (pc2 && !pc2.interfaces.some(i => i.gateway === '192.168.1.1')) issues.push('PC2 gateway not set to 192.168.1.1');
            if (pc3 && !pc3.interfaces.some(i => i.gateway === '192.168.1.1')) issues.push('PC3 gateway not set to 192.168.1.1');
            return issues.length ? issues.join('. ') + '.' : null;
          },
        },
      ]
    },
    // ── v4.43.1: Troubleshooting lab — VLAN Isolation Broken ────────────
    {
      id: 'troubleshoot-vlan-isolation',
      title: 'Troubleshoot: VLAN Isolation Broken',
      objective: '5.3',
      difficulty: 'Intermediate',
      duration: '10 min',
      description: 'Sales and HR should be isolated in separate VLANs, but PC1 (Sales) suddenly can\'t ping PC2 (also Sales). One of the switch ports is misconfigured. Find and fix it.',
      autoSetup: (s) => {
        const swId = 'd_tsvlan_sw1', pc1Id = 'd_tsvlan_pc1', pc2Id = 'd_tsvlan_pc2', pc3Id = 'd_tsvlan_pc3', pc4Id = 'd_tsvlan_pc4';
        s.devices = [
          { id: swId, type: 'switch', x: 700, y: 200, hostname: 'SW-Sales-HR',
            interfaces: [
              // PC1 port: correct VLAN 10 (Sales)
              { name: 'Fa0/1', cableId: 'c_tsvlan_1', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:10:01:01', vlan: 10, mode: 'access', trunkAllowed: [10], gateway: '', enabled: true, subInterfaces: [] },
              // PC2 port: BUG — misconfigured to VLAN 20 (HR) instead of VLAN 10 (Sales)
              { name: 'Fa0/2', cableId: 'c_tsvlan_2', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:10:01:02', vlan: 20, mode: 'access', trunkAllowed: [20], gateway: '', enabled: true, subInterfaces: [] },
              // PC3 port: correct VLAN 20 (HR)
              { name: 'Fa0/3', cableId: 'c_tsvlan_3', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:10:01:03', vlan: 20, mode: 'access', trunkAllowed: [20], gateway: '', enabled: true, subInterfaces: [] },
              // PC4 port: correct VLAN 20 (HR)
              { name: 'Fa0/4', cableId: 'c_tsvlan_4', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:10:01:04', vlan: 20, mode: 'access', trunkAllowed: [20], gateway: '', enabled: true, subInterfaces: [] },
            ].concat(Array.from({length: 20}, (_, i) => ({ name: `Fa0/${i+5}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:BB:CC:10:01:${(i+5).toString(16).padStart(2,'0')}`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }))),
            routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }, { id: 10, name: 'Sales' }, { id: 20, name: 'HR' }], dhcpServer: null, dhcpRelay: null, acls: [] },
          { id: pc1Id, type: 'pc', x: 350, y: 400, hostname: 'PC1-Sales',
            interfaces: [{ name: 'eth0', cableId: 'c_tsvlan_1', ip: '192.168.10.10', mask: '255.255.255.0', mac: 'AA:BB:CC:10:02:01', vlan: 10, mode: 'access', trunkAllowed: [10], gateway: '192.168.10.1', enabled: true, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
          { id: pc2Id, type: 'pc', x: 600, y: 400, hostname: 'PC2-Sales',
            interfaces: [{ name: 'eth0', cableId: 'c_tsvlan_2', ip: '192.168.10.20', mask: '255.255.255.0', mac: 'AA:BB:CC:10:02:02', vlan: 10, mode: 'access', trunkAllowed: [10], gateway: '192.168.10.1', enabled: true, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
          { id: pc3Id, type: 'pc', x: 850, y: 400, hostname: 'PC3-HR',
            interfaces: [{ name: 'eth0', cableId: 'c_tsvlan_3', ip: '192.168.20.30', mask: '255.255.255.0', mac: 'AA:BB:CC:10:02:03', vlan: 20, mode: 'access', trunkAllowed: [20], gateway: '192.168.20.1', enabled: true, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
          { id: pc4Id, type: 'pc', x: 1100, y: 400, hostname: 'PC4-HR',
            interfaces: [{ name: 'eth0', cableId: 'c_tsvlan_4', ip: '192.168.20.40', mask: '255.255.255.0', mac: 'AA:BB:CC:10:02:04', vlan: 20, mode: 'access', trunkAllowed: [20], gateway: '192.168.20.1', enabled: true, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
        ];
        s.cables = [
          { id: 'c_tsvlan_1', from: pc1Id, to: swId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/1' },
          { id: 'c_tsvlan_2', from: pc2Id, to: swId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/2' },
          { id: 'c_tsvlan_3', from: pc3Id, to: swId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/3' },
          { id: 'c_tsvlan_4', from: pc4Id, to: swId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/4' },
        ];
        s.name = 'Troubleshoot: VLAN Isolation Broken';
      },
      steps: [
        {
          title: 'Survey the network',
          instruction: 'Two VLANs are defined: **VLAN 10 (Sales)** and **VLAN 20 (HR)**. PC1 and PC2 should both be in Sales. PC3 and PC4 should both be in HR. The user complaint: **PC1 can\'t ping PC2 even though they\'re both in Sales**. Start by double-clicking the switch and opening the **VLANs** tab to see the defined VLANs.',
          hint: 'Two PCs in the same VLAN should communicate without a router. If they can\'t, either (a) they\'re in different VLANs, (b) one port is disabled, or (c) the physical link is down.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Check each port\'s VLAN assignment',
          instruction: 'On the switch, open the **Interfaces** tab. Look at the **VLAN** column for each port connected to a PC. PC1 is on `Fa0/1`, PC2 is on `Fa0/2`, PC3 is on `Fa0/3`, PC4 is on `Fa0/4`. Find the port that\'s in the wrong VLAN.',
          hint: 'PC1 and PC2 should both be in VLAN 10. If one of them shows VLAN 20 in the port config, that\'s the bug.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Fix the misconfigured port',
          instruction: 'You should have found that **PC2\'s port (Fa0/2)** is set to **VLAN 20** but PC2 is a Sales PC — it should be in **VLAN 10**. Change `Fa0/2` to VLAN 10 in the switch\'s Interfaces tab.',
          hint: 'In the Interfaces tab, click on the VLAN field for Fa0/2 and change it to 10.',
          check: (s) => {
            const sw = s.devices.find(d => d.hostname === 'SW-Sales-HR');
            if (!sw) return false;
            const port = sw.interfaces.find(i => i.name === 'Fa0/2');
            return port && port.vlan === 10;
          },
          feedback: (s) => {
            const sw = s.devices.find(d => d.hostname === 'SW-Sales-HR');
            if (!sw) return 'Switch not found.';
            const port = sw.interfaces.find(i => i.name === 'Fa0/2');
            if (!port) return 'Port Fa0/2 not found.';
            if (port.vlan === 20) return 'Fa0/2 is still VLAN 20. Change it to VLAN 10 (Sales).';
            if (port.vlan !== 10) return `Fa0/2 is VLAN ${port.vlan}. Should be VLAN 10.`;
            return null;
          },
        },
        {
          title: 'Verify with Ping',
          instruction: 'Use the **Ping** tool in the toolbar. Ping PC1 → PC2. It should now succeed. Also verify isolation still works: PC1 → PC3 should **fail** (different VLANs, no inter-VLAN router configured). Perfect isolation is the whole point of VLANs.',
          hint: 'VLANs isolate traffic at Layer 2. Same-VLAN = reachable. Cross-VLAN = needs a router or L3 switch.',
          check: (s) => {
            const sw = s.devices.find(d => d.hostname === 'SW-Sales-HR');
            if (!sw) return false;
            const pc1Port = sw.interfaces.find(i => i.name === 'Fa0/1');
            const pc2Port = sw.interfaces.find(i => i.name === 'Fa0/2');
            return pc1Port && pc2Port && pc1Port.vlan === 10 && pc2Port.vlan === 10;
          },
          feedback: (s) => {
            const sw = s.devices.find(d => d.hostname === 'SW-Sales-HR');
            const pc2Port = sw?.interfaces.find(i => i.name === 'Fa0/2');
            if (!pc2Port || pc2Port.vlan !== 10) return 'PC2 port must be on VLAN 10 first — re-check step 3.';
            return null;
          },
        },
      ]
    },
    // ── v4.43.1: Troubleshooting lab — DHCP Relay Missing ────────────────
    {
      id: 'troubleshoot-dhcp-relay',
      title: 'Troubleshoot: DHCP Not Working Across Subnets',
      objective: '3.4',
      difficulty: 'Intermediate',
      duration: '12 min',
      description: 'Client PCs in one subnet can\'t get IPs from a DHCP server in a different subnet. DHCP Discover messages are broadcast-only — they don\'t cross subnets without help. Diagnose and add the missing piece.',
      autoSetup: (s) => {
        const rId = 'd_tsdhcp_r1', swAId = 'd_tsdhcp_swa', swBId = 'd_tsdhcp_swb', srvId = 'd_tsdhcp_srv', pc1Id = 'd_tsdhcp_pc1', pc2Id = 'd_tsdhcp_pc2';
        s.devices = [
          { id: rId, type: 'router', x: 700, y: 150, hostname: 'R1',
            interfaces: [
              // Gi0/0 faces subnet A (DHCP server side) — has ip, working
              { name: 'Gi0/0', cableId: 'c_tsdhcp_1', ip: '10.0.1.1', mask: '255.255.255.0', mac: 'AA:BB:CC:30:00:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
              // Gi0/1 faces subnet B (client side) — has ip, working, but NO DHCP relay configured (the bug)
              { name: 'Gi0/1', cableId: 'c_tsdhcp_2', ip: '10.0.2.1', mask: '255.255.255.0', mac: 'AA:BB:CC:30:00:02', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
            ],
            routingTable: [
              { type: 'connected', network: '10.0.1.0', mask: '255.255.255.0', nextHop: null, iface: 'Gi0/0' },
              { type: 'connected', network: '10.0.2.0', mask: '255.255.255.0', nextHop: null, iface: 'Gi0/1' },
            ],
            arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null /* BUG: should be { helperAddress: '10.0.1.100' } */, acls: [] },
          { id: swAId, type: 'switch', x: 350, y: 350, hostname: 'SW-A',
            interfaces: [
              { name: 'Fa0/1', cableId: 'c_tsdhcp_1', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:30:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
              { name: 'Fa0/2', cableId: 'c_tsdhcp_3', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:30:01:02', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
            ].concat(Array.from({length: 20}, (_, i) => ({ name: `Fa0/${i+3}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:BB:CC:30:01:${(i+3).toString(16).padStart(2,'0')}`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }))),
            routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [] },
          { id: swBId, type: 'switch', x: 1050, y: 350, hostname: 'SW-B',
            interfaces: [
              { name: 'Fa0/1', cableId: 'c_tsdhcp_2', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:30:02:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
              { name: 'Fa0/2', cableId: 'c_tsdhcp_4', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:30:02:02', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
              { name: 'Fa0/3', cableId: 'c_tsdhcp_5', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:30:02:03', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
            ].concat(Array.from({length: 20}, (_, i) => ({ name: `Fa0/${i+4}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:BB:CC:30:02:${(i+4).toString(16).padStart(2,'0')}`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }))),
            routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [] },
          // DHCP server in subnet A, pool serves subnet B (10.0.2.x)
          { id: srvId, type: 'server', x: 200, y: 550, hostname: 'DHCP-SRV',
            interfaces: [{ name: 'eth0', cableId: 'c_tsdhcp_3', ip: '10.0.1.100', mask: '255.255.255.0', mac: 'AA:BB:CC:30:03:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '10.0.1.1', enabled: true, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [],
            dhcpServer: { name: 'subnet-b-pool', network: '10.0.2.0', mask: '255.255.255.0', gateway: '10.0.2.1', rangeStart: '10.0.2.100', rangeEnd: '10.0.2.200', dns: '8.8.8.8' },
            dhcpRelay: null, acls: [] },
          // Client PCs in subnet B — no IPs, waiting for DHCP
          { id: pc1Id, type: 'pc', x: 950, y: 550, hostname: 'PC1',
            interfaces: [{ name: 'eth0', cableId: 'c_tsdhcp_4', ip: '', mask: '', mac: 'AA:BB:CC:30:04:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
          { id: pc2Id, type: 'pc', x: 1200, y: 550, hostname: 'PC2',
            interfaces: [{ name: 'eth0', cableId: 'c_tsdhcp_5', ip: '', mask: '', mac: 'AA:BB:CC:30:04:02', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
            routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
        ];
        s.cables = [
          { id: 'c_tsdhcp_1', from: rId, to: swAId, type: 'cat6', fromIface: 'Gi0/0', toIface: 'Fa0/1' },
          { id: 'c_tsdhcp_2', from: rId, to: swBId, type: 'cat6', fromIface: 'Gi0/1', toIface: 'Fa0/1' },
          { id: 'c_tsdhcp_3', from: srvId, to: swAId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/2' },
          { id: 'c_tsdhcp_4', from: pc1Id, to: swBId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/2' },
          { id: 'c_tsdhcp_5', from: pc2Id, to: swBId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/3' },
        ];
        s.name = 'Troubleshoot: DHCP Relay Missing';
      },
      steps: [
        {
          title: 'Observe the problem',
          instruction: 'PC1 and PC2 are in **subnet B (10.0.2.0/24)**. They have no IPs — they\'re supposed to get them via DHCP. The DHCP server **DHCP-SRV** is in **subnet A (10.0.1.0/24)**. Open the **DHCP** dialog in the toolbar, pick PC1, and try to DHCP-request. Watch it fail.',
          hint: 'DHCP Discover messages are broadcast-only. By default routers do NOT forward broadcasts across subnets — that\'s actually a safety feature (otherwise every broadcast storm would hit every subnet).',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Understand why broadcasts don\'t cross',
          instruction: 'DHCP works by **broadcast**: the client sends a DISCOVER to `255.255.255.255` asking "who can give me an IP?" Routers drop broadcasts by default — they don\'t forward them to other subnets. So the DISCOVER never reaches DHCP-SRV. The fix is a **DHCP Relay** (also called **ip helper-address** in Cisco IOS): you tell the router "when you see a DHCP broadcast on this interface, forward it as unicast to the DHCP server."',
          hint: 'N10-009 objective 3.4 covers DHCP relay. Any cert question about "clients can\'t get IPs from a DHCP server in a different subnet" is asking about this.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Configure DHCP Relay on the router',
          instruction: 'Double-click **R1** → **DHCP** tab. Look at the **DHCP Relay (ip helper-address)** field at the bottom. Set it to **`10.0.1.100`** (the IP of DHCP-SRV). This tells R1 to forward DHCP broadcasts it receives to that specific server.',
          hint: 'Helper-address takes the IP of the DHCP server, not the DHCP server\'s subnet. Exact: 10.0.1.100.',
          check: (s) => {
            const r = s.devices.find(d => d.hostname === 'R1');
            return r && r.dhcpRelay && r.dhcpRelay.helperAddress === '10.0.1.100';
          },
          feedback: (s) => {
            const r = s.devices.find(d => d.hostname === 'R1');
            if (!r) return 'R1 not found.';
            if (!r.dhcpRelay || !r.dhcpRelay.helperAddress) return 'DHCP Relay not configured on R1 yet. Open R1\'s DHCP tab and set helper-address.';
            if (r.dhcpRelay.helperAddress !== '10.0.1.100') return `Helper-address is "${r.dhcpRelay.helperAddress}". Should be the DHCP server\'s IP: 10.0.1.100.`;
            return null;
          },
        },
        {
          title: 'Verify DHCP works now',
          instruction: 'Re-open the **DHCP** dialog. Request DHCP from PC1. It should now succeed — PC1 gets an IP in the 10.0.2.100–200 range, gateway 10.0.2.1. Try PC2 too. You\'ve just deployed a DHCP relay, which is how every enterprise does centralized DHCP — one DHCP server in a management subnet, relays configured on every router interface facing client subnets.',
          hint: 'If DHCP still fails, double-check: (a) helper-address is correct, (b) the DHCP server has a pool for 10.0.2.0/24, (c) both subnets are reachable from the router.',
          check: (s) => {
            const r = s.devices.find(d => d.hostname === 'R1');
            return r && r.dhcpRelay && r.dhcpRelay.helperAddress === '10.0.1.100';
          },
          feedback: (s) => {
            const r = s.devices.find(d => d.hostname === 'R1');
            if (!r || !r.dhcpRelay || r.dhcpRelay.helperAddress !== '10.0.1.100') return 'Re-check step 3 — helper-address must be 10.0.1.100 before this verification step can pass.';
            return null;
          },
        },
      ]
    },
    {
      id: 'multi-site-wan',
      title: 'Multi-Site WAN with ISP',
      objective: '1.2',
      difficulty: 'Advanced',
      duration: '20 min',
      description: 'Connect 3 office sites through an ISP router with proper routing, NAT concepts, and WAN links.',
      steps: [
        {
          title: 'Create the ISP core',
          instruction: 'Drag an **Internet/WAN** cloud and an **ISP Router** onto the canvas. Connect them. The ISP Router represents your service provider\'s edge — it peers with your customer routers. Set ISP Router\'s interface facing the cloud to `203.0.113.1/24`.',
          hint: 'ISP routers use public IP space (203.0.113.x is documentation range — safe for labs).',
          check: (s) => s.devices.some(d => d.type === 'isp-router') && s.devices.some(d => d.type === 'cloud'),
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'cloud')) return 'No Internet/WAN cloud.';
            if (!s.devices.some(d => d.type === 'isp-router')) return 'No ISP Router. Drag one from the palette.';
            return null;
          },
        },
        {
          title: 'Build Site A — HQ',
          instruction: 'Add a **Router** (R-HQ), **Switch**, **2 PCs**, and a **Server**. Wire: ISP → R-HQ → Switch → PCs/Server. ISP-facing interface: `10.0.1.1/30`. Internal: `192.168.10.1/24`. PCs: `192.168.10.10+`. Use **fiber** for the ISP→R-HQ cable (long distance WAN link).',
          hint: '/30 on WAN links = 2 usable IPs (point-to-point). /24 on LANs = 254 hosts.',
          check: (s) => {
            const rHQ = s.devices.find(d => d.type === 'router' && d.interfaces.some(i => i.ip && i.ip.startsWith('192.168.10.')));
            return !!rHQ && s.devices.filter(d => d.type === 'pc').length >= 2;
          },
          feedback: (s) => {
            const routers = s.devices.filter(d => d.type === 'router');
            if (routers.length < 1) return 'No site router found. Add a Router for HQ.';
            const pcs = s.devices.filter(d => d.type === 'pc').length;
            if (pcs < 2) return `${pcs}/2 PCs placed for Site A.`;
            return null;
          },
        },
        {
          title: 'Build Sites B & C',
          instruction: 'Repeat for **Site B** (R-Branch1, Switch, 2 PCs, subnet `192.168.20.0/24`, WAN `10.0.2.1/30`) and **Site C** (R-Branch2, Switch, 2 PCs, subnet `192.168.30.0/24`, WAN `10.0.3.1/30`). Wire each site router to the ISP Router with **fiber** cables.',
          hint: 'Each site gets its own subnet. The ISP router connects all three WAN links.',
          check: (s) => s.devices.filter(d => d.type === 'router').length >= 3,
          feedback: (s) => {
            const routers = s.devices.filter(d => d.type === 'router').length;
            return routers < 3 ? `${routers}/3 site routers placed. Add routers for each site.` : null;
          },
        },
        {
          title: 'Configure ISP routing',
          instruction: 'The ISP Router needs routes to all 3 site LANs. Double-click the ISP Router → **Routing** tab. Add static routes:\n• `192.168.10.0/24` → next hop `10.0.1.1`\n• `192.168.20.0/24` → next hop `10.0.2.1`\n• `192.168.30.0/24` → next hop `10.0.3.1`\n\nEach site router also needs a default route (`0.0.0.0/0`) pointing to the ISP.',
          hint: 'Without routing tables, routers only know about directly connected subnets. Static routes tell them where to forward packets for remote networks.',
          check: (s) => {
            const isp = s.devices.find(d => d.type === 'isp-router');
            return isp && isp.routingTable && isp.routingTable.filter(r => r.type === 'static').length >= 2;
          },
          feedback: (s) => {
            const isp = s.devices.find(d => d.type === 'isp-router');
            if (!isp) return 'No ISP Router found.';
            const statics = (isp.routingTable || []).filter(r => r.type === 'static').length;
            return statics < 3 ? `ISP has ${statics}/3 static routes. Add routes for all site subnets.` : null;
          },
        },
        {
          title: 'Test cross-site connectivity',
          instruction: 'Ping from a **Site A PC** to a **Site B PC**. Watch the path in the Sim Log — it should go: PC → R-HQ → ISP → R-Branch1 → SW → PC. Try `traceroute` from PC1\'s CLI: `traceroute 192.168.20.10`. You should see each hop with its IP. If it fails, check routing tables on intermediate routers with `show ip route`.',
          hint: 'traceroute shows every Layer 3 hop. Each router decrements TTL and sends Time Exceeded when TTL=0.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    // ── v4.29.0 Labs ──
    {
      id: 'static-routing',
      title: 'Static Routing Between Subnets',
      objective: '1.4',
      difficulty: 'Intermediate',
      duration: '15 min',
      description: 'Build a 3-subnet network with 2 routers. Configure static routes so all subnets can communicate. This is the #1 tested concept on the Network+ exam.',
      steps: [
        {
          title: 'Build the core — 2 routers, 2 switches',
          instruction: 'Create **Router R1**, **Router R2**, **Switch SW1**, and **Switch SW2**. Cable R1 ↔ R2 (backbone link), R1 ↔ SW1 (LAN A), and R2 ↔ SW2 (LAN B). This gives you 3 subnets: LAN A, the point-to-point backbone, and LAN B.',
          hint: 'The backbone between routers is its own subnet (e.g. 10.0.0.0/30). LANs are /24 subnets.',
          check: (s) => s.devices.filter(d => d.type === 'router').length >= 2 && s.devices.filter(d => d.type === 'switch').length >= 2 && s.cables.length >= 3,
          feedback: (s) => {
            const routers = s.devices.filter(d => d.type === 'router').length;
            const switches = s.devices.filter(d => d.type === 'switch').length;
            if (routers < 2) return `${routers}/2 routers placed.`;
            if (switches < 2) return `${switches}/2 switches placed.`;
            if (s.cables.length < 3) return `${s.cables.length}/3 cables. Need: R1↔R2, R1↔SW1, R2↔SW2.`;
            return null;
          },
        },
        {
          title: 'Add endpoints to each LAN',
          instruction: 'Add **2 PCs** to SW1 (LAN A) and **2 PCs** to SW2 (LAN B). Cable each PC to its local switch. You should now have 7 cables total.',
          hint: 'Each LAN needs its own set of PCs connected to the local switch, not to the routers.',
          check: (s) => s.devices.filter(d => d.type === 'pc').length >= 4 && s.cables.length >= 7,
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc').length;
            if (pcs < 4) return `${pcs}/4 PCs placed.`;
            if (s.cables.length < 7) return `${s.cables.length}/7 cables.`;
            return null;
          },
        },
        {
          title: 'Configure R1 interfaces',
          instruction: 'Double-click **R1** → Interfaces tab.\n\n• **LAN A interface** (connected to SW1): `192.168.1.1/24`\n• **Backbone interface** (connected to R2): `10.0.0.1/30`\n\nR1 needs IPs on **both** connected interfaces. A router without IPs is just an expensive paperweight!',
          hint: 'A /30 subnet gives exactly 2 usable IPs — perfect for a point-to-point link between routers.',
          check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.interfaces.filter(i => i.ip).length >= 2; },
          feedback: (s) => {
            const r = s.devices.find(d => d.type === 'router');
            if (!r) return 'No router found.';
            const ipCount = r.interfaces.filter(i => i.ip).length;
            return ipCount < 2 ? `R1 has ${ipCount}/2 interfaces with IPs. Both connected interfaces need IPs.` : null;
          },
        },
        {
          title: 'Configure R2 interfaces',
          instruction: 'Double-click **R2** → Interfaces tab.\n\n• **LAN B interface** (connected to SW2): `192.168.2.1/24`\n• **Backbone interface** (connected to R1): `10.0.0.2/30`\n\nNote: R2\'s backbone IP must be in the **same /30 subnet** as R1\'s (10.0.0.1 and 10.0.0.2 share 10.0.0.0/30).',
          hint: 'Both backbone IPs must be in the same subnet. 10.0.0.1/30 and 10.0.0.2/30 share the same network (10.0.0.0/30).',
          check: (s) => {
            const routers = s.devices.filter(d => d.type === 'router');
            return routers.length >= 2 && routers[1].interfaces.filter(i => i.ip).length >= 2;
          },
          feedback: (s) => {
            const routers = s.devices.filter(d => d.type === 'router');
            if (routers.length < 2) return 'Need 2 routers.';
            const ipCount = routers[1].interfaces.filter(i => i.ip).length;
            return ipCount < 2 ? `R2 has ${ipCount}/2 interfaces with IPs.` : null;
          },
        },
        {
          title: 'Add static routes on both routers',
          instruction: 'Each router knows its connected subnets, but NOT the remote LAN. Fix this with **static routes**:\n\n• **R1** → Routing tab: Add `192.168.2.0/24` via `10.0.0.2`\n• **R2** → Routing tab: Add `192.168.1.0/24` via `10.0.0.1`\n\nThis tells each router where to send packets destined for the other LAN.',
          hint: 'Static routes format: destination network + next-hop IP. The next-hop must be directly reachable (on a connected subnet).',
          check: (s) => {
            const routers = s.devices.filter(d => d.type === 'router');
            return routers.length >= 2 && routers.every(r => r.routingTable && r.routingTable.some(rt => rt.type === 'static'));
          },
          feedback: (s) => {
            const routers = s.devices.filter(d => d.type === 'router');
            const r1Statics = (routers[0]?.routingTable || []).filter(r => r.type === 'static').length;
            const r2Statics = (routers[1]?.routingTable || []).filter(r => r.type === 'static').length;
            if (r1Statics === 0 && r2Statics === 0) return 'Neither router has static routes. Add them in the Routing tab.';
            if (r1Statics === 0) return 'R1 has no static routes — it can\'t reach LAN B.';
            if (r2Statics === 0) return 'R2 has no static routes — it can\'t reach LAN A.';
            return null;
          },
        },
        {
          title: 'Configure PC IPs and gateways',
          instruction: 'Set IPs on all 4 PCs:\n\n• **LAN A PCs**: `192.168.1.10`, `192.168.1.11`, gateway `192.168.1.1`\n• **LAN B PCs**: `192.168.2.10`, `192.168.2.11`, gateway `192.168.2.1`\n\nThe gateway MUST point to the local router. Without it, PCs don\'t know where to send cross-subnet traffic.',
          hint: 'Every endpoint needs: (1) IP in same subnet as its local router interface, (2) gateway = that router interface IP.',
          check: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc');
            return pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway)).length >= 4;
          },
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc');
            const withBoth = pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway)).length;
            return withBoth < 4 ? `${withBoth}/4 PCs have both IP and gateway configured.` : null;
          },
        },
        {
          title: 'Test — Ping across subnets',
          instruction: 'Open **Ping** → select a LAN A PC as source and a LAN B PC as destination. Hit Ping and watch the packet traverse R1 → R2. Check the **Sim Log** to see each hop. Then run `show ip route` on R1\'s CLI to verify your routing table. Try `traceroute 192.168.2.10` from PC1 to see all hops.',
          hint: 'If ping fails: check that both routers have static routes AND that PC gateways point to the correct router.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'acl-traffic-filter',
      title: 'ACL Traffic Filtering',
      objective: '4.3',
      difficulty: 'Advanced',
      duration: '15 min',
      description: 'Configure Access Control Lists on a firewall to permit web traffic but deny all other traffic. Learn how ACLs filter packets by protocol, port, and IP address.',
      steps: [
        {
          title: 'Build the network — Internet, Firewall, LAN',
          instruction: 'Create: **1 Internet/WAN cloud**, **1 Firewall**, **1 Switch**, **2 PCs**, **1 Server**. Cable: Cloud ↔ Firewall ↔ Switch, PCs and Server to Switch. This simulates a corporate network with a perimeter firewall.',
          hint: 'The firewall sits between the untrusted Internet and your internal LAN — it inspects and filters all traffic crossing the boundary.',
          check: (s) => s.devices.some(d => d.type === 'firewall') && s.devices.some(d => d.type === 'server') && s.cables.length >= 5,
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'firewall')) return 'No firewall placed. Drag one from the palette.';
            if (!s.devices.some(d => d.type === 'server')) return 'No server placed. You need a server to protect.';
            if (s.cables.length < 5) return `${s.cables.length}/5 cables. Connect all devices.`;
            return null;
          },
        },
        {
          title: 'Configure Firewall interfaces',
          instruction: 'Double-click the **Firewall** → Interfaces tab. Set:\n\n• **eth0** (outside/WAN-facing): `203.0.113.1/24`\n• **eth1** (inside/LAN-facing): `192.168.1.1/24`\n\nThe firewall needs IPs on both zones to route and filter traffic between them.',
          hint: 'Firewalls operate at Layer 3+ — they need IPs to route and inspect packets. The outside interface uses a public IP range.',
          check: (s) => { const fw = s.devices.find(d => d.type === 'firewall'); return fw && fw.interfaces.filter(i => i.ip).length >= 2; },
          feedback: (s) => {
            const fw = s.devices.find(d => d.type === 'firewall');
            if (!fw) return 'No firewall found.';
            const ipCount = fw.interfaces.filter(i => i.ip).length;
            return ipCount < 2 ? `Firewall has ${ipCount}/2 IPs. Both inside and outside interfaces need IPs.` : null;
          },
        },
        {
          title: 'Configure Server and PC IPs',
          instruction: 'Set the **Server** IP to `192.168.1.100` (gateway `192.168.1.1`). Set PCs to `192.168.1.10` and `192.168.1.11` (same gateway). All internal devices use the firewall\'s inside interface as their gateway.',
          hint: 'The firewall is the default gateway for ALL internal devices — it controls what traffic enters and leaves the network.',
          check: (s) => {
            const srv = s.devices.find(d => d.type === 'server');
            const pcs = s.devices.filter(d => d.type === 'pc');
            return srv && srv.interfaces.some(i => i.ip) && pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway)).length >= 2;
          },
          feedback: (s) => {
            const srv = s.devices.find(d => d.type === 'server');
            if (!srv || !srv.interfaces.some(i => i.ip)) return 'Server needs an IP address.';
            const pcs = s.devices.filter(d => d.type === 'pc');
            const configured = pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway)).length;
            return configured < 2 ? `${configured}/2 PCs fully configured (need IP + gateway).` : null;
          },
        },
        {
          title: 'Add ACL rules on the Firewall',
          instruction: 'Double-click **Firewall** → **ACLs** tab. Create rules:\n\n1. **ALLOW** TCP port **80** (HTTP) from `0.0.0.0/0`\n2. **ALLOW** TCP port **443** (HTTPS) from `0.0.0.0/0`\n3. **DENY** all other inbound traffic\n\nACLs are processed **top-down, first match wins**. Order matters!',
          hint: 'ACLs on the exam: standard ACLs filter by source IP only. Extended ACLs filter by source, destination, protocol, and port. These are extended ACLs.',
          check: (s) => { const fw = s.devices.find(d => d.type === 'firewall'); return fw && fw.acls && fw.acls.length >= 2; },
          feedback: (s) => {
            const fw = s.devices.find(d => d.type === 'firewall');
            if (!fw) return 'No firewall found.';
            const count = (fw.acls || []).length;
            return count < 2 ? `Firewall has ${count} ACL rules. Add at least 2 rules (allow HTTP + HTTPS).` : null;
          },
        },
        {
          title: 'Verify with CLI commands',
          instruction: 'Open the **Firewall CLI** and run:\n\n• `show acl` — view your configured rules\n• `show ip route` — verify routing between zones\n\nIn a real network, you\'d test by sending HTTP traffic through the firewall and confirming HTTPS passes while other protocols are blocked.',
          hint: 'On the Network+ exam, know that implicit DENY ALL exists at the end of every ACL. If no rule matches, traffic is dropped.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'site-to-site-vpn',
      title: 'Site-to-Site VPN',
      objective: '3.3',
      difficulty: 'Advanced',
      duration: '20 min',
      description: 'Connect two on-premises data centers over a VPN tunnel. Configure VPN gateways with matching crypto parameters and verify the tunnel negotiates successfully.',
      autoSetup: (state) => {
        // Pre-build two DCs and a cloud, but leave VPN unconfigured
        const dc1 = { id: 'd_vpnlab_dc1', type: 'onprem-dc', x: 200, y: 400, hostname: 'DC-East',
          interfaces: [{ name: 'eth0', cableId: null, ip: '10.1.0.1', mask: '255.255.255.0', mac: 'AA:BB:CC:01:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
        const dc2 = { id: 'd_vpnlab_dc2', type: 'onprem-dc', x: 1100, y: 400, hostname: 'DC-West',
          interfaces: [{ name: 'eth0', cableId: null, ip: '10.2.0.1', mask: '255.255.255.0', mac: 'AA:BB:CC:02:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
        const vpg1 = { id: 'd_vpnlab_vpg1', type: 'vpg', x: 450, y: 400, hostname: 'VPG-East',
          interfaces: [{ name: 'tun0', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:03:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
                       { name: 'tun1', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:03:02:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
        const vpg2 = { id: 'd_vpnlab_vpg2', type: 'vpg', x: 850, y: 400, hostname: 'VPG-West',
          interfaces: [{ name: 'tun0', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:04:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
                       { name: 'tun1', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:04:02:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
        const cloud = { id: 'd_vpnlab_cloud', type: 'cloud', x: 650, y: 200, hostname: 'Internet',
          interfaces: [{ name: 'eth0', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:05:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
                       { name: 'eth1', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:05:02:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
        state.devices.push(dc1, dc2, vpg1, vpg2, cloud);
        // Cable: DC1 ↔ VPG1, VPG1 ↔ Cloud, Cloud ↔ VPG2, VPG2 ↔ DC2
        const c1 = { id: 'c_vpnlab_1', from: dc1.id, to: vpg1.id, type: 'fiber', fromIface: 'eth0', toIface: 'tun0' };
        const c2 = { id: 'c_vpnlab_2', from: vpg1.id, to: cloud.id, type: 'fiber', fromIface: 'tun1', toIface: 'eth0' };
        const c3 = { id: 'c_vpnlab_3', from: cloud.id, to: vpg2.id, type: 'fiber', fromIface: 'eth1', toIface: 'tun1' };
        const c4 = { id: 'c_vpnlab_4', from: vpg2.id, to: dc2.id, type: 'fiber', fromIface: 'tun0', toIface: 'eth0' };
        dc1.interfaces[0].cableId = c1.id; vpg1.interfaces[0].cableId = c1.id;
        vpg1.interfaces[1].cableId = c2.id; cloud.interfaces[0].cableId = c2.id;
        cloud.interfaces[1].cableId = c3.id; vpg2.interfaces[1].cableId = c3.id;
        vpg2.interfaces[0].cableId = c4.id; dc2.interfaces[0].cableId = c4.id;
        state.cables.push(c1, c2, c3, c4);
      },
      steps: [
        {
          title: 'Survey the pre-built network',
          instruction: 'You have **2 data centers** (DC-East and DC-West) connected through **VPN Gateways** across the **Internet**. The topology is wired but the VPN tunnel is **not configured**.\n\nExplore: double-click each device to see its current config. Notice that VPG-East and VPG-West have no VPN configuration yet.',
          hint: 'A VPN creates an encrypted tunnel over a public network. The VPN gateways handle encryption/decryption at each end.',
          check: (s) => s.devices.some(d => d.type === 'vpg') && s.devices.some(d => d.type === 'onprem-dc'),
          feedback: () => null,
        },
        {
          title: 'Configure VPN on VPG-East',
          instruction: 'Double-click **VPG-East** → **VPN/IPSec** tab. Configure:\n\n• Pre-shared key: `MySecretKey123`\n• IKE version: `IKEv2`\n• Encryption: `AES-256`\n• Hash: `SHA-256`\n• DH Group: `14`\n\nThese are the **Phase 1 (IKE)** parameters. Both ends MUST match exactly or the tunnel won\'t come up!',
          hint: 'IKE (Internet Key Exchange) negotiates the security association. Both peers must agree on encryption, hash, and DH group. Any mismatch = tunnel fails.',
          check: (s) => {
            const vpg = s.devices.find(d => d.hostname === 'VPG-East' || (d.type === 'vpg' && d.vpnConfig && d.vpnConfig.psk));
            return vpg && vpg.vpnConfig && vpg.vpnConfig.psk && vpg.vpnConfig.psk.length > 0;
          },
          feedback: (s) => {
            const vpg = s.devices.find(d => d.type === 'vpg');
            if (!vpg) return 'No VPN Gateway found.';
            if (!vpg.vpnConfig || !vpg.vpnConfig.psk) return 'VPG-East has no VPN config. Open VPN/IPSec tab and set the pre-shared key.';
            return null;
          },
        },
        {
          title: 'Configure VPN on VPG-West — matching params!',
          instruction: 'Double-click **VPG-West** → **VPN/IPSec** tab. Set the **exact same** parameters:\n\n• Pre-shared key: `MySecretKey123`\n• IKE version: `IKEv2`\n• Encryption: `AES-256`\n• Hash: `SHA-256`\n• DH Group: `14`\n\n**Critical**: If even ONE parameter differs (e.g., SHA-256 vs SHA-384), the tunnel will fail to negotiate.',
          hint: 'Common VPN troubleshooting: mismatched PSK, different encryption algorithms, or wrong IKE version. Always verify both sides match.',
          check: (s) => {
            const vpgs = s.devices.filter(d => d.type === 'vpg');
            return vpgs.filter(v => v.vpnConfig && v.vpnConfig.psk && v.vpnConfig.psk.length > 0).length >= 2;
          },
          feedback: (s) => {
            const vpgs = s.devices.filter(d => d.type === 'vpg');
            const configured = vpgs.filter(v => v.vpnConfig && v.vpnConfig.psk);
            if (configured.length < 2) return `${configured.length}/2 VPN gateways have VPN config. Configure VPG-West too.`;
            // Check matching
            if (configured.length === 2 && configured[0].vpnConfig.psk !== configured[1].vpnConfig.psk) return 'Pre-shared keys don\'t match! Both VPGs must use the same PSK.';
            if (configured.length === 2 && configured[0].vpnConfig.encryption !== configured[1].vpnConfig.encryption) return 'Encryption algorithms don\'t match!';
            return null;
          },
        },
        {
          title: 'Negotiate the VPN tunnel',
          instruction: 'Click **VPG-East** → VPN tab → **Negotiate Tunnel** button. The system will check if both endpoints have matching crypto params.\n\n• ✅ Green animation = tunnel UP\n• ❌ Red animation = mismatch detected\n\nIf it fails, check the error message — it tells you exactly which parameter mismatched. Fix it and try again.',
          hint: 'In real networks, use `show crypto isakmp sa` and `show crypto ipsec sa` to troubleshoot VPN tunnels.',
          check: (s) => {
            const vpgs = s.devices.filter(d => d.type === 'vpg');
            return vpgs.some(v => v.vpnConfig && v.vpnConfig.status === 'up');
          },
          feedback: (s) => {
            const vpgs = s.devices.filter(d => d.type === 'vpg');
            const up = vpgs.filter(v => v.vpnConfig && v.vpnConfig.status === 'up');
            if (up.length === 0) return 'VPN tunnel is not up yet. Click Negotiate Tunnel in the VPN tab.';
            return null;
          },
        },
        {
          title: 'Verify — show VPN status',
          instruction: 'Open the CLI on **VPG-East** and run `show vpn`. You should see the tunnel status, peer IP, and crypto parameters.\n\nThen try `show vpn` on **DC-East** to see the VPN status from the data center side.\n\nOn the **Network+ exam**, VPN questions focus on: IPSec vs SSL VPN, IKEv1 vs IKEv2, tunnel vs transport mode, and crypto parameter matching.',
          hint: 'IPSec has two modes: tunnel mode (encrypts entire packet + new IP header, used for site-to-site) and transport mode (encrypts only payload, used for host-to-host).',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'wireless-network',
      title: 'Wireless Network with WLC',
      objective: '2.4',
      difficulty: 'Intermediate',
      duration: '12 min',
      description: 'Deploy a wireless network with access points managed by a Wireless LAN Controller. Understand the difference between autonomous and lightweight APs.',
      steps: [
        {
          title: 'Build the wired backbone',
          instruction: 'Create: **1 Router**, **1 Switch**, **1 WLC (Wireless LAN Controller)**. Cable: Router ↔ Switch ↔ WLC. The WLC centralizes management of all access points — SSIDs, security policies, channel assignments, and roaming.',
          hint: 'Autonomous APs are configured individually. Controller-based (lightweight) APs get their config from the WLC — much easier to manage at scale.',
          check: (s) => s.devices.some(d => d.type === 'router') && s.devices.some(d => d.type === 'switch') && s.devices.some(d => d.type === 'wlc') && s.cables.length >= 2,
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'router')) return 'No router. Drag one from the palette.';
            if (!s.devices.some(d => d.type === 'switch')) return 'No switch.';
            if (!s.devices.some(d => d.type === 'wlc')) return 'No WLC (Wireless LAN Controller). Find it in the palette.';
            if (s.cables.length < 2) return `${s.cables.length}/2 cables. Connect Router↔Switch↔WLC.`;
            return null;
          },
        },
        {
          title: 'Add Wireless Access Points',
          instruction: 'Add **3 WAPs** (Wireless Access Points) and connect each one to the **Switch**. In a controller-based deployment, APs connect to the wired network and create a **CAPWAP tunnel** back to the WLC for management traffic.\n\nPosition them spread across the canvas to simulate physical coverage areas.',
          hint: 'CAPWAP (Control And Provisioning of Wireless Access Points) is the protocol between lightweight APs and the WLC. It runs on UDP ports 5246 (control) and 5247 (data).',
          check: (s) => s.devices.filter(d => d.type === 'wap').length >= 3 && s.cables.length >= 5,
          feedback: (s) => {
            const waps = s.devices.filter(d => d.type === 'wap').length;
            if (waps < 3) return `${waps}/3 WAPs placed. Add ${3 - waps} more.`;
            if (s.cables.length < 5) return `${s.cables.length}/5 cables. Connect each WAP to the switch.`;
            return null;
          },
        },
        {
          title: 'Configure Router as gateway',
          instruction: 'Double-click the **Router** → Interfaces tab. Set the LAN interface to `192.168.1.1/24`. This is the default gateway for all wireless clients. In enterprise wireless, the router handles **inter-VLAN routing** and DHCP.',
          hint: 'Wireless clients get IPs from DHCP and use the router as their gateway, just like wired clients. The AP is transparent at Layer 3.',
          check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.interfaces.some(i => i.ip); },
          feedback: (s) => {
            const r = s.devices.find(d => d.type === 'router');
            if (!r) return 'No router found.';
            if (!r.interfaces.some(i => i.ip)) return 'Router needs an IP on its LAN interface.';
            return null;
          },
        },
        {
          title: 'Add wireless clients',
          instruction: 'Add **2-3 PCs** (representing wireless laptops/phones). Don\'t cable them — wireless clients connect through the **WAPs**, not with physical cables.\n\nSet their IPs: `192.168.1.50`, `192.168.1.51`, `192.168.1.52` with gateway `192.168.1.1`.',
          hint: 'On the exam: wireless clients associate with an AP, authenticate (WPA2/WPA3), get an IP via DHCP, and then communicate through the AP as if wired.',
          check: (s) => {
            const uncabledPcs = s.devices.filter(d => d.type === 'pc' && !s.cables.some(c => c.from === d.id || c.to === d.id));
            return uncabledPcs.filter(p => p.interfaces.some(i => i.ip)).length >= 2;
          },
          feedback: (s) => {
            const uncabledPcs = s.devices.filter(d => d.type === 'pc' && !s.cables.some(c => c.from === d.id || c.to === d.id));
            if (uncabledPcs.length < 2) return `${uncabledPcs.length} uncabled PCs found. Add PCs without cables to represent wireless clients.`;
            const withIp = uncabledPcs.filter(p => p.interfaces.some(i => i.ip)).length;
            return withIp < 2 ? `${withIp}/2 wireless clients have IPs. Configure them.` : null;
          },
        },
        {
          title: 'Review — Wireless concepts',
          instruction: 'Your wireless network is complete! Review these **Network+ exam** wireless concepts:\n\n• **802.11ax** (Wi-Fi 6): OFDMA, MU-MIMO, BSS Coloring, 2.4/5 GHz\n• **WPA3**: SAE (replaces PSK), 192-bit security mode, PMF mandatory\n• **Channel planning**: 2.4 GHz non-overlapping channels: 1, 6, 11\n• **CAPWAP**: Control plane (5246) + Data plane (5247)\n• **Roaming**: Client moves between APs, WLC handles seamless handoff\n\nRun `show arp` on the router to see learned MAC addresses.',
          hint: 'Exam tip: know the frequency bands — 2.4 GHz (longer range, more interference), 5 GHz (shorter range, less interference), 6 GHz (Wi-Fi 6E only).',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'cloud-vpc-security',
      title: 'Cloud VPC with Security Groups',
      objective: '1.8',
      difficulty: 'Advanced',
      duration: '18 min',
      description: 'Design a cloud VPC architecture with public and private subnets, an Internet Gateway, NAT Gateway, and security groups. Learn cloud-native networking for Network+.',
      steps: [
        {
          title: 'Create the VPC and Internet Gateway',
          instruction: 'Drag a **VPC** and an **Internet Gateway (IGW)** onto the canvas. Cable them together. The VPC is your isolated virtual network in the cloud, and the IGW gives it a path to the internet.\n\nDouble-click the VPC → VPC Config tab → set CIDR to `10.0.0.0/16`.',
          hint: 'A VPC is like a virtual data center in the cloud. The CIDR block defines the entire IP address range available for subnets.',
          check: (s) => s.devices.some(d => d.type === 'vpc') && s.devices.some(d => d.type === 'igw') && s.cables.length >= 1,
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'vpc')) return 'No VPC placed. Find it in the palette.';
            if (!s.devices.some(d => d.type === 'igw')) return 'No Internet Gateway placed.';
            if (s.cables.length < 1) return 'Connect the IGW to the VPC.';
            const vpc = s.devices.find(d => d.type === 'vpc');
            if (vpc && (!vpc.vpcConfig || !vpc.vpcConfig.cidr)) return 'VPC needs a CIDR block. Double-click → VPC Config tab.';
            return null;
          },
        },
        {
          title: 'Create public and private subnets',
          instruction: 'Add **2 Cloud Subnets**: one for public-facing resources (web servers) and one for private resources (databases).\n\nCable both subnets to the VPC. The public subnet routes to the IGW; the private subnet does NOT.',
          hint: 'Public subnet = route table has 0.0.0.0/0 → IGW. Private subnet = no internet route (or route to NAT only).',
          check: (s) => s.devices.filter(d => d.type === 'cloud-subnet').length >= 2,
          feedback: (s) => {
            const subs = s.devices.filter(d => d.type === 'cloud-subnet').length;
            return subs < 2 ? `${subs}/2 cloud subnets placed. Add ${2 - subs} more.` : null;
          },
        },
        {
          title: 'Add a NAT Gateway',
          instruction: 'Add a **NAT Gateway** and cable it to the **public subnet**. The NAT Gateway allows private subnet resources to reach the internet (e.g., for software updates) without being directly accessible from outside.\n\nNAT translates private IPs to a public IP for outbound traffic only.',
          hint: 'NAT Gateway = outbound-only internet access. Internet Gateway = bidirectional. Private subnets use NAT GW; public subnets use IGW.',
          check: (s) => s.devices.some(d => d.type === 'nat-gw'),
          feedback: (s) => !s.devices.some(d => d.type === 'nat-gw') ? 'No NAT Gateway placed. Drag one from the palette.' : null,
        },
        {
          title: 'Deploy servers into subnets',
          instruction: 'Add a **Server** (web server) to the public subnet and another **Server** (database) to the private subnet. Cable each to its subnet.\n\nSet IPs:\n• Web server: `10.0.1.10/24`, gateway `10.0.1.1`\n• DB server: `10.0.2.10/24`, gateway `10.0.2.1`',
          hint: 'Public subnet servers have public IP + security group. Private subnet servers only have private IPs and are only reachable from within the VPC.',
          check: (s) => {
            const servers = s.devices.filter(d => d.type === 'server');
            return servers.filter(srv => srv.interfaces.some(i => i.ip)).length >= 2;
          },
          feedback: (s) => {
            const servers = s.devices.filter(d => d.type === 'server');
            const withIp = servers.filter(srv => srv.interfaces.some(i => i.ip)).length;
            return withIp < 2 ? `${withIp}/2 servers have IPs. Configure both.` : null;
          },
        },
        {
          title: 'Configure Security Groups',
          instruction: 'Double-click the **web server** → **Security Groups** tab. Add a security group "web-sg" with rules:\n\n• **Inbound**: Allow TCP 443 (HTTPS) from `0.0.0.0/0`\n• **Inbound**: Allow TCP 80 (HTTP) from `0.0.0.0/0`\n\nSecurity Groups are **stateful** — if inbound is allowed, the return traffic is automatically allowed. No need for explicit outbound rules.',
          hint: 'Security Groups vs NACLs: SGs are stateful + instance-level. NACLs are stateless + subnet-level. Know both for the exam!',
          check: (s) => {
            const servers = s.devices.filter(d => d.type === 'server');
            return servers.some(srv => srv.securityGroups && srv.securityGroups.length > 0);
          },
          feedback: (s) => {
            const servers = s.devices.filter(d => d.type === 'server');
            const hasSg = servers.some(srv => srv.securityGroups && srv.securityGroups.length > 0);
            return !hasSg ? 'No security groups configured on any server. Double-click web server → Security Groups tab.' : null;
          },
        },
        {
          title: 'Grade and review',
          instruction: 'Click **Grade** in the toolbar to evaluate your design. Look for:\n\n• ✅ IGW connected to VPC\n• ✅ NAT GW in a subnet\n• ✅ Security groups on servers\n\n**Key exam concepts**:\n• VPC peering: connect VPCs without traversing the internet\n• Transit Gateway: hub-and-spoke for multi-VPC\n• Security Groups: stateful, allow-only, instance-level\n• NACLs: stateless, allow/deny, subnet-level, numbered rules',
          hint: 'On the exam: "Which is stateful?" → Security Group. "Which uses rule numbers?" → NACL. "Which is instance-level?" → Security Group.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'network-hardening',
      title: 'Network Hardening & Best Practices',
      objective: '4.1',
      difficulty: 'Intermediate',
      duration: '12 min',
      description: 'Harden a network by implementing security best practices: disable unused ports, configure management VLANs, and deploy IDS/IPS. Covers Network+ security fundamentals.',
      autoSetup: (state) => {
        // Pre-build a basic network with security gaps
        const r1 = { id: 'd_harden_r1', type: 'router', x: 650, y: 150, hostname: 'R-Core',
          interfaces: [
            { name: 'Gi0/0', cableId: null, ip: '192.168.1.1', mask: '255.255.255.0', mac: 'AA:BB:CC:10:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
            { name: 'Gi0/1', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:10:02:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
          ],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
        const sw1 = { id: 'd_harden_sw1', type: 'switch', x: 400, y: 350, hostname: 'SW-Access',
          interfaces: Array.from({ length: 24 }, (_, i) => ({
            name: `Fa0/${i + 1}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:BB:CC:11:${String(i+1).padStart(2,'0')}:01`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [],
          })),
          routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
        const pc1 = { id: 'd_harden_pc1', type: 'pc', x: 200, y: 550, hostname: 'PC-Admin',
          interfaces: [{ name: 'eth0', cableId: null, ip: '192.168.1.10', mask: '255.255.255.0', mac: 'AA:BB:CC:12:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.1', enabled: true, subInterfaces: [] }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
        const pc2 = { id: 'd_harden_pc2', type: 'pc', x: 400, y: 550, hostname: 'PC-User',
          interfaces: [{ name: 'eth0', cableId: null, ip: '192.168.1.11', mask: '255.255.255.0', mac: 'AA:BB:CC:13:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.1', enabled: true, subInterfaces: [] }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
        const srv = { id: 'd_harden_srv', type: 'server', x: 600, y: 550, hostname: 'SRV-Files',
          interfaces: [{ name: 'eth0', cableId: null, ip: '192.168.1.100', mask: '255.255.255.0', mac: 'AA:BB:CC:14:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.1', enabled: true, subInterfaces: [] }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
        state.devices.push(r1, sw1, pc1, pc2, srv);
        // Cables
        const c1 = { id: 'c_harden_1', from: r1.id, to: sw1.id, type: 'cat6', fromIface: 'Gi0/0', toIface: 'Fa0/1' };
        const c2 = { id: 'c_harden_2', from: sw1.id, to: pc1.id, type: 'cat6', fromIface: 'Fa0/2', toIface: 'eth0' };
        const c3 = { id: 'c_harden_3', from: sw1.id, to: pc2.id, type: 'cat6', fromIface: 'Fa0/3', toIface: 'eth0' };
        const c4 = { id: 'c_harden_4', from: sw1.id, to: srv.id, type: 'cat6', fromIface: 'Fa0/4', toIface: 'eth0' };
        r1.interfaces[0].cableId = c1.id; sw1.interfaces[0].cableId = c1.id;
        sw1.interfaces[1].cableId = c2.id; pc1.interfaces[0].cableId = c2.id;
        sw1.interfaces[2].cableId = c3.id; pc2.interfaces[0].cableId = c3.id;
        sw1.interfaces[3].cableId = c4.id; srv.interfaces[0].cableId = c4.id;
        state.cables.push(c1, c2, c3, c4);
      },
      steps: [
        {
          title: 'Survey the insecure network',
          instruction: 'This network has several security issues:\n\n• All devices on **VLAN 1** (default) — management traffic mixed with user traffic\n• **20 unused switch ports** are active — an attacker could plug into any of them\n• **No IDS/IPS** to detect threats\n• **No firewall** at the perimeter\n\nLet\'s fix these one by one. Start by exploring the switch — double-click it and check the Interfaces tab.',
          hint: 'VLAN 1 should never be used for production traffic — it\'s the default and can\'t be deleted, making it a target.',
          check: (s) => s.devices.some(d => d.type === 'switch'),
          feedback: () => null,
        },
        {
          title: 'Create a management VLAN',
          instruction: 'Double-click **SW-Access** → **VLANs** tab. Add **VLAN 99** (name: "Management"). Then go to Interfaces → set the **router-facing port** (Fa0/1) to **trunk** mode. Set admin PC port to VLAN 99.\n\nManagement traffic (SSH, SNMP, syslog) should be on its own VLAN, isolated from user traffic.',
          hint: 'Management VLAN best practice: use a VLAN other than 1, restrict access with ACLs, and only allow authorized admin workstations.',
          check: (s) => {
            const sw = s.devices.find(d => d.type === 'switch');
            return sw && sw.vlanDb && sw.vlanDb.some(v => v.id === 99);
          },
          feedback: (s) => {
            const sw = s.devices.find(d => d.type === 'switch');
            if (!sw) return 'No switch found.';
            if (!sw.vlanDb || !sw.vlanDb.some(v => v.id === 99)) return 'VLAN 99 not created yet. Add it in the VLANs tab.';
            return null;
          },
        },
        {
          title: 'Disable unused switch ports',
          instruction: 'Go to **SW-Access** → Interfaces tab. Find ports that have **no cable** (Fa0/5 through Fa0/24). Disable them by toggling their **enabled** status to off.\n\nEvery open port is an attack vector. An unused port in an enabled state lets anyone plug in and join your network. Disabling unused ports is basic security hygiene.',
          hint: 'On the exam: "shutdown" disables a port. "no shutdown" enables it. Port security and 802.1X are additional protections.',
          check: (s) => {
            const sw = s.devices.find(d => d.type === 'switch');
            if (!sw) return false;
            const unusedPorts = sw.interfaces.filter(i => !i.cableId);
            const disabledCount = unusedPorts.filter(i => !i.enabled).length;
            return disabledCount >= 10;
          },
          feedback: (s) => {
            const sw = s.devices.find(d => d.type === 'switch');
            if (!sw) return 'No switch found.';
            const unusedPorts = sw.interfaces.filter(i => !i.cableId);
            const disabledCount = unusedPorts.filter(i => !i.enabled).length;
            return `${disabledCount}/${unusedPorts.length} unused ports disabled. Disable at least 10.`;
          },
        },
        {
          title: 'Add an IDS to the network',
          instruction: 'Drag an **IDS** (Intrusion Detection System) onto the canvas and connect it to the switch. The IDS monitors network traffic for malicious patterns and generates alerts.\n\n**IDS vs IPS**:\n• IDS = passive — detects and alerts (mirror port)\n• IPS = inline — detects and **blocks** (sits in traffic path)\n\nFor this lab, we\'re using IDS in monitoring mode.',
          hint: 'IDS/IPS placement: typically between the firewall and internal network, or on a SPAN/mirror port. Signature-based detects known attacks; anomaly-based detects unusual patterns.',
          check: (s) => s.devices.some(d => d.type === 'ids') && s.cables.some(c => {
            const ids = s.devices.find(d => d.type === 'ids');
            return ids && (c.from === ids.id || c.to === ids.id);
          }),
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'ids')) return 'No IDS placed. Drag one from the palette.';
            const ids = s.devices.find(d => d.type === 'ids');
            const hasCable = s.cables.some(c => c.from === ids.id || c.to === ids.id);
            return !hasCable ? 'IDS needs to be connected to the switch to monitor traffic.' : null;
          },
        },
        {
          title: 'Add a perimeter firewall',
          instruction: 'Add a **Firewall** between the router and the internet. Cable: Internet ↔ Firewall ↔ Router (update the R-Core connection). Configure the firewall with IPs on both interfaces.\n\nThe firewall inspects ALL traffic crossing the network boundary. Without it, the router alone has no security filtering.',
          hint: 'Defense in depth: Firewall at perimeter + IDS on internal network + VLANs for segmentation + disabled ports = multiple security layers.',
          check: (s) => s.devices.some(d => d.type === 'firewall') && s.cables.some(c => {
            const fw = s.devices.find(d => d.type === 'firewall');
            return fw && (c.from === fw.id || c.to === fw.id);
          }),
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'firewall')) return 'No firewall placed.';
            const fw = s.devices.find(d => d.type === 'firewall');
            const hasCable = s.cables.some(c => c.from === fw.id || c.to === fw.id);
            return !hasCable ? 'Firewall is not connected. Cable it between the internet and router.' : null;
          },
        },
        {
          title: 'Review — Hardening checklist',
          instruction: 'Your network is now hardened! Review the **Network+ security checklist**:\n\n✅ Management VLAN separated from user traffic\n✅ Unused ports disabled (prevents unauthorized access)\n✅ IDS monitoring for threats\n✅ Perimeter firewall filtering traffic\n\n**Exam topics to review**:\n• 802.1X (port-based NAC)\n• DHCP snooping (prevents rogue DHCP)\n• Dynamic ARP Inspection (prevents ARP spoofing)\n• BPDU Guard (prevents STP manipulation)\n• MAC filtering / port security',
          hint: 'Remember: security is layers. No single control is enough. The exam loves asking about defense-in-depth strategies.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    // ── v4.30.0 Labs ──
    {
      id: 'ospf-dynamic-routing',
      title: 'OSPF Dynamic Routing',
      objective: '1.4',
      difficulty: 'Advanced',
      duration: '18 min',
      description: 'Configure OSPF on a multi-router network. Learn how dynamic routing protocols discover neighbors, build link-state databases, and calculate shortest paths using Dijkstra\'s algorithm.',
      steps: [
        {
          title: 'Build a 3-router backbone',
          instruction: 'Create **3 Routers** (R1, R2, R3) and connect them: R1 ↔ R2, R2 ↔ R3, R1 ↔ R3. This creates a triangle — when one link fails, traffic can reroute through the other path. Add a **Switch** + **2 PCs** to R1 and R3.',
          hint: 'OSPF excels in redundant topologies — it recalculates routes automatically when links go down.',
          check: (s) => s.devices.filter(d => d.type === 'router').length >= 3 && s.cables.length >= 5,
          feedback: (s) => {
            const routers = s.devices.filter(d => d.type === 'router').length;
            if (routers < 3) return `${routers}/3 routers placed.`;
            if (s.cables.length < 5) return `${s.cables.length}/5+ cables needed.`;
            return null;
          },
        },
        {
          title: 'Configure router IPs',
          instruction: 'Set IPs on all router interfaces:\n\n• **R1-R2 link**: 10.0.12.1/30 ↔ 10.0.12.2/30\n• **R2-R3 link**: 10.0.23.1/30 ↔ 10.0.23.2/30\n• **R1-R3 link**: 10.0.13.1/30 ↔ 10.0.13.2/30\n• **R1 LAN**: 192.168.1.1/24\n• **R3 LAN**: 192.168.3.1/24',
          hint: 'Point-to-point links use /30 (2 usable IPs). LAN segments use /24.',
          check: (s) => {
            const routers = s.devices.filter(d => d.type === 'router');
            return routers.every(r => r.interfaces.filter(i => i.ip).length >= 2);
          },
          feedback: (s) => {
            const routers = s.devices.filter(d => d.type === 'router');
            const incomplete = routers.filter(r => r.interfaces.filter(i => i.ip).length < 2);
            return incomplete.length ? `${incomplete.map(r=>r.hostname).join(', ')} need more IPs on interfaces.` : null;
          },
        },
        {
          title: 'Enable OSPF on all routers',
          instruction: 'Double-click each router → **OSPF** tab:\n\n1. Check **Enable OSPF**\n2. Set **Router ID** (R1: 1.1.1.1, R2: 2.2.2.2, R3: 3.3.3.3)\n3. **Add Area 0** (backbone area)\n4. Add all connected networks to Area 0\n\nOSPF routers exchange LSAs (Link-State Advertisements) and build a complete map of the network.',
          hint: 'All routers in OSPF Area 0 form full adjacency. Router ID must be unique — typically the highest loopback IP.',
          check: (s) => {
            const routers = s.devices.filter(d => d.type === 'router');
            return routers.filter(r => r.ospfConfig && r.ospfConfig.enabled).length >= 3;
          },
          feedback: (s) => {
            const routers = s.devices.filter(d => d.type === 'router');
            const enabled = routers.filter(r => r.ospfConfig?.enabled);
            return enabled.length < 3 ? `${enabled.length}/3 routers have OSPF enabled.` : null;
          },
        },
        {
          title: 'Set OSPF Router IDs',
          instruction: 'Each OSPF router needs a unique **Router ID**. Check the OSPF tab — the Router ID field should be set to a unique IP (e.g., 1.1.1.1 for R1).\n\nOSPF uses the Router ID to identify neighbors and prevent routing loops.',
          hint: 'If no Router ID is set, OSPF uses the highest loopback IP, or the highest physical IP.',
          check: (s) => {
            const routers = s.devices.filter(d => d.type === 'router');
            return routers.filter(r => r.ospfConfig?.routerId).length >= 3;
          },
          feedback: (s) => {
            const routers = s.devices.filter(d => d.type === 'router');
            const withRid = routers.filter(r => r.ospfConfig?.routerId);
            return withRid.length < 3 ? `${withRid.length}/3 routers have Router IDs set.` : null;
          },
        },
        {
          title: 'Verify OSPF neighbors',
          instruction: 'Open R1\'s **CLI** and run:\n\n• `show ip ospf` — see OSPF config and areas\n• `show ip ospf neighbor` — see discovered neighbors\n• `show running-config` — see full config in IOS format\n\n**Key exam concepts**: OSPF states (Down → Init → 2-Way → ExStart → Exchange → Loading → Full). DR/BDR election on broadcast segments. Hello timer = 10s, Dead timer = 40s.',
          hint: 'OSPF neighbor states: FULL = fully adjacent (exchanged full LSDB). 2-WAY = bidirectional Hello received but not yet exchanged LSAs.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'dns-infrastructure',
      title: 'DNS Infrastructure & Records',
      objective: '1.6',
      difficulty: 'Intermediate',
      duration: '15 min',
      description: 'Build a DNS infrastructure with a DNS server, configure all major record types (A, AAAA, CNAME, MX, PTR, NS, SOA, TXT, SRV), and test name resolution with nslookup.',
      steps: [
        {
          title: 'Build the network with a DNS server',
          instruction: 'Create: **1 Router**, **1 Switch**, **1 DNS Server**, **2 PCs**, **1 Server** (web server). Cable them all to the switch, switch to router.\n\nThe DNS Server will resolve hostnames to IPs for all clients on the network.',
          hint: 'DNS is a hierarchical system: Root → TLD (.com) → Authoritative (example.com) → Record (www.example.com).',
          check: (s) => (s.devices.some(d => d.type === 'dns-server') || s.devices.filter(d => d.type === 'server').length >= 2) && s.cables.length >= 4,
          feedback: (s) => {
            const hasDns = s.devices.some(d => d.type === 'dns-server') || s.devices.filter(d => d.type === 'server').length >= 2;
            if (!hasDns) return 'Need a DNS Server (or 2 servers — one as DNS). Drag from palette.';
            if (s.cables.length < 4) return `${s.cables.length}/4+ cables needed.`;
            return null;
          },
        },
        {
          title: 'Configure IPs on all devices',
          instruction: 'Set IPs:\n• Router: `192.168.1.1/24`\n• DNS Server: `192.168.1.5/24`, gateway `192.168.1.1`\n• Web Server: `192.168.1.100/24`, gateway `192.168.1.1`\n• PCs: `192.168.1.10`, `.11`, gateway `192.168.1.1`',
          hint: 'DNS clients need to know the DNS server IP. In production, this is often provided via DHCP (option 6).',
          check: (s) => {
            const allWithIp = s.devices.filter(d => d.interfaces.some(i => i.ip));
            return allWithIp.length >= 4;
          },
          feedback: (s) => {
            const allWithIp = s.devices.filter(d => d.interfaces.some(i => i.ip));
            return allWithIp.length < 4 ? `${allWithIp.length}/4+ devices have IPs.` : null;
          },
        },
        {
          title: 'Add A and AAAA records',
          instruction: 'Double-click the **DNS Server** → **DNS** tab. Add these records:\n\n• **A** record: name `web.corp.local` → value `192.168.1.100`\n• **A** record: name `dns.corp.local` → value `192.168.1.5`\n• **AAAA** record: name `web.corp.local` → value `2001:db8::100`\n\n**A** maps hostname → IPv4. **AAAA** maps hostname → IPv6.',
          hint: 'A records are the most common DNS record type. AAAA records are the IPv6 equivalent — "quad-A" because IPv6 addresses are 4x longer than IPv4.',
          check: (s) => {
            const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
            return dns && dns.dnsRecords && dns.dnsRecords.filter(r => r.type === 'A' || r.type === 'AAAA').length >= 2;
          },
          feedback: (s) => {
            const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
            if (!dns) return 'No DNS server with records found. Double-click the DNS server → DNS tab.';
            const aCount = (dns.dnsRecords || []).filter(r => r.type === 'A' || r.type === 'AAAA').length;
            return aCount < 2 ? `${aCount}/2 A/AAAA records. Add more.` : null;
          },
        },
        {
          title: 'Add CNAME, MX, and TXT records',
          instruction: 'Continue adding records:\n\n• **CNAME**: name `www.corp.local` → value `web.corp.local` (alias)\n• **MX**: name `corp.local` → value `10 mail.corp.local` (mail exchange, priority 10)\n• **TXT**: name `corp.local` → value `v=spf1 include:_spf.corp.local ~all` (SPF record for email auth)\n\nCNAME creates an alias. MX directs email. TXT stores arbitrary data (SPF, DKIM, DMARC).',
          hint: 'CNAME cannot coexist with other records for the same name (except RRSIG/NSEC). MX priority: lower number = higher priority.',
          check: (s) => {
            const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
            return dns && dns.dnsRecords && dns.dnsRecords.some(r => r.type === 'CNAME') && dns.dnsRecords.some(r => r.type === 'MX');
          },
          feedback: (s) => {
            const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
            if (!dns?.dnsRecords) return 'No DNS records found.';
            if (!dns.dnsRecords.some(r => r.type === 'CNAME')) return 'Missing CNAME record.';
            if (!dns.dnsRecords.some(r => r.type === 'MX')) return 'Missing MX record.';
            return null;
          },
        },
        {
          title: 'Add PTR, NS, SOA, SRV, and CAA records',
          instruction: 'Complete the zone with:\n\n• **PTR**: name `100.1.168.192.in-addr.arpa` → value `web.corp.local` (reverse lookup)\n• **NS**: name `corp.local` → value `dns.corp.local` (authoritative nameserver)\n• **SOA**: name `corp.local` → value `dns.corp.local admin.corp.local 2024010101` (Start of Authority)\n• **SRV**: name `_sip._tcp.corp.local` → value `10 5 5060 sip.corp.local` (service locator)\n• **CAA**: name `corp.local` → value `0 issue "letsencrypt.org"` (certificate authority auth)',
          hint: 'PTR is the reverse of A — used by tools like nslookup for reverse DNS. SOA defines zone authority and refresh timers. SRV format: priority weight port target.',
          check: (s) => {
            const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
            return dns && dns.dnsRecords && dns.dnsRecords.length >= 7;
          },
          feedback: (s) => {
            const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
            const count = dns?.dnsRecords?.length || 0;
            return count < 7 ? `${count}/7+ DNS records configured. Add the remaining record types.` : null;
          },
        },
        {
          title: 'Test DNS with nslookup',
          instruction: 'Open a **PC\'s CLI** and run:\n\n• `nslookup web.corp.local` — should resolve to 192.168.1.100\n• `nslookup www.corp.local` — should follow CNAME → A record\n• `nslookup nonexistent.corp.local` — should return NXDOMAIN\n• `show dns records` on the DNS server to see all configured records\n\n**Exam tip**: Know the difference between recursive and iterative queries. Clients use recursive (ask once, get answer). DNS servers use iterative (query root → TLD → authoritative).',
          hint: 'DNS uses UDP port 53 for queries and TCP port 53 for zone transfers (AXFR/IXFR). DNSSEC adds digital signatures to prevent spoofing.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'stp-loop-prevention',
      title: 'STP & Loop Prevention',
      objective: '2.3',
      difficulty: 'Intermediate',
      duration: '12 min',
      description: 'Configure Spanning Tree Protocol on a redundant switch topology. Understand root bridge election, port states, and how STP prevents broadcast storms.',
      autoSetup: (state) => {
        // Pre-build 3 switches in a triangle + router + PCs
        const r1 = { id: 'd_stp_r1', type: 'router', x: 650, y: 100, hostname: 'R1',
          interfaces: [{ name: 'Gi0/0', cableId: null, ip: '192.168.1.1', mask: '255.255.255.0', mac: 'AA:00:00:01:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
          stpConfig: null, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] };
        const makeSw = (id, x, y, name, portCount) => ({
          id, type: 'switch', x, y, hostname: name,
          interfaces: Array.from({ length: portCount }, (_, i) => ({
            name: `Fa0/${i + 1}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:00:${id.slice(-2)}:${String(i+1).padStart(2,'0')}:01:01`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64,
          })),
          routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
          stpConfig: { priority: 32768, mode: 'rstp', portStates: {} }, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] });
        const sw1 = makeSw('d_stp_sw1', 400, 350, 'SW-Core', 24);
        const sw2 = makeSw('d_stp_sw2', 900, 350, 'SW-Dist1', 24);
        const sw3 = makeSw('d_stp_sw3', 650, 550, 'SW-Dist2', 24);
        state.devices.push(r1, sw1, sw2, sw3);
        // Triangle of switches + router to SW-Core
        const cables = [
          { id: 'c_stp_1', from: r1.id, to: sw1.id, type: 'cat6', fromIface: 'Gi0/0', toIface: 'Fa0/1' },
          { id: 'c_stp_2', from: sw1.id, to: sw2.id, type: 'fiber', fromIface: 'Fa0/23', toIface: 'Fa0/23' },
          { id: 'c_stp_3', from: sw2.id, to: sw3.id, type: 'fiber', fromIface: 'Fa0/24', toIface: 'Fa0/24' },
          { id: 'c_stp_4', from: sw3.id, to: sw1.id, type: 'fiber', fromIface: 'Fa0/23', toIface: 'Fa0/24' },
        ];
        cables.forEach(c => {
          const fromDev = state.devices.find(d => d.id === c.from);
          const toDev = state.devices.find(d => d.id === c.to);
          const fromIfc = fromDev.interfaces.find(i => i.name === c.fromIface);
          const toIfc = toDev.interfaces.find(i => i.name === c.toIface);
          if (fromIfc) fromIfc.cableId = c.id;
          if (toIfc) toIfc.cableId = c.id;
        });
        state.cables.push(...cables);
      },
      steps: [
        {
          title: 'Explore the redundant topology',
          instruction: 'You have **3 switches** (SW-Core, SW-Dist1, SW-Dist2) connected in a **triangle** via fiber uplinks. This creates **physical redundancy** but also a **Layer 2 loop**.\n\nWithout STP, broadcast frames would circulate endlessly → **broadcast storm** → network crash.\n\nDouble-click each switch to see its current STP configuration.',
          hint: 'A broadcast storm can consume 100% of bandwidth in seconds. STP is the protocol that prevents this by blocking redundant paths.',
          check: (s) => s.devices.filter(d => d.type === 'switch').length >= 3,
          feedback: () => null,
        },
        {
          title: 'Set SW-Core as Root Bridge',
          instruction: 'Double-click **SW-Core** → **STP** tab. Set **Bridge Priority** to **4096** (lowest = root bridge).\n\nThe switch with the **lowest Bridge ID** (priority + MAC) becomes the Root Bridge. All other switches calculate their shortest path to the root.\n\nLeave SW-Dist1 and SW-Dist2 at default priority (32768).',
          hint: 'Root Bridge election: compare priority first, then MAC address. Best practice: manually set the core switch as root with the lowest priority.',
          check: (s) => {
            const core = s.devices.find(d => d.hostname === 'SW-Core' || (d.type === 'switch' && d.stpConfig?.priority <= 4096));
            return core && core.stpConfig && core.stpConfig.priority <= 4096;
          },
          feedback: (s) => {
            const core = s.devices.find(d => d.hostname === 'SW-Core');
            if (!core?.stpConfig) return 'SW-Core has no STP config. Double-click → STP tab.';
            if (core.stpConfig.priority > 4096) return `SW-Core priority is ${core.stpConfig.priority}. Set it to 4096 to make it Root Bridge.`;
            return null;
          },
        },
        {
          title: 'Block a redundant port',
          instruction: 'On **SW-Dist2** → STP tab, set the port connected to **SW-Dist1** (Fa0/24) to **blocking** state.\n\nSTP blocks one port in the triangle to break the loop. Traffic can still reach SW-Dist2 via SW-Core. If the SW-Core ↔ SW-Dist2 link fails, the blocked port transitions to forwarding (convergence).\n\nPort roles: **Root Port** (toward root bridge), **Designated Port** (away from root), **Blocked Port** (redundant, loop prevention).',
          hint: 'RSTP converges in 1-2 seconds. Classic STP takes 30-50 seconds (listening 15s + learning 15s). That\'s why RSTP replaced STP in modern networks.',
          check: (s) => {
            const sw = s.devices.find(d => d.hostname === 'SW-Dist2' || (d.type === 'switch' && d.stpConfig?.portStates && Object.values(d.stpConfig.portStates).includes('blocking')));
            return sw && sw.stpConfig && Object.values(sw.stpConfig.portStates || {}).includes('blocking');
          },
          feedback: (s) => {
            const switches = s.devices.filter(d => d.type === 'switch');
            const hasBlocking = switches.some(sw => sw.stpConfig && Object.values(sw.stpConfig.portStates || {}).includes('blocking'));
            return !hasBlocking ? 'No port is in blocking state. Set one redundant port to BLOCKING in the STP tab.' : null;
          },
        },
        {
          title: 'Add PCs and verify',
          instruction: 'Add **2 PCs** — connect one to SW-Dist1 and one to SW-Dist2. Set IPs (192.168.1.10, .11) with gateway 192.168.1.1.\n\nRun `show spanning-tree` on each switch to see STP status.\n\n**Network+ exam STP concepts**:\n• BPDU (Bridge Protocol Data Unit) — hello frames sent every 2 seconds\n• BPDU Guard — shuts down port if BPDU received (edge/access ports)\n• Root Guard — prevents downstream switches from becoming root\n• PortFast — skips listening/learning on access ports (30s → 0s)',
          hint: 'PortFast should ONLY be enabled on edge/access ports (connected to PCs/servers). Never on switch-to-switch links — it would bypass STP and create loops.',
          check: (s) => s.devices.filter(d => d.type === 'pc').length >= 2,
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc').length;
            return pcs < 2 ? `${pcs}/2 PCs placed. Add ${2 - pcs} more.` : null;
          },
        },
      ]
    },
    // ── v4.30.2: 4 new beginner labs ──
    {
      id: 'ip-addressing-101',
      title: 'IP Addressing 101',
      objective: '1.5',
      difficulty: 'Beginner',
      duration: '10 min',
      description: 'Learn the fundamentals of IPv4 addressing — IPs, subnet masks, and default gateways. Build a minimal network and make two PCs talk to each other.',
      steps: [
        {
          title: 'Place your first devices',
          instruction: 'Drag a **Router** and a **Switch** onto the canvas, then connect them with a cable.\n\nThe router is your **default gateway** — it\'s the door to other networks. The switch connects devices on the same network.',
          hint: 'Every network needs at least one router (gateway) and one switch (to connect multiple devices).',
          check: (s) => s.devices.some(d => d.type === 'router') && s.devices.some(d => d.type === 'switch') && s.cables.length >= 1,
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'router')) return 'Add a Router to the canvas.';
            if (!s.devices.some(d => d.type === 'switch')) return 'Add a Switch to the canvas.';
            if (s.cables.length < 1) return 'Connect the Router to the Switch with a cable.';
            return null;
          },
        },
        {
          title: 'Add two PCs',
          instruction: 'Drag **2 PCs** onto the canvas and cable each one to the **Switch**.\n\nPCs connect to switches — never directly to a router. The switch handles local traffic; the router handles traffic leaving the network.',
          hint: 'In a real office, dozens of PCs plug into switches. The switch forwards frames using MAC addresses (Layer 2).',
          check: (s) => s.devices.filter(d => d.type === 'pc').length >= 2 && s.cables.length >= 3,
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc').length;
            if (pcs < 2) return `${pcs}/2 PCs placed.`;
            if (s.cables.length < 3) return 'Cable both PCs to the switch.';
            return null;
          },
        },
        {
          title: 'Give the Router an IP',
          instruction: 'Double-click the **Router** → **Interfaces** tab. Set the connected interface IP to **192.168.1.1** with mask **255.255.255.0**.\n\nThis IP becomes the **default gateway** for every device on this network. Think of it as the network\'s "front door."',
          hint: '192.168.1.0/24 gives you 254 usable addresses (192.168.1.1 — 192.168.1.254). The .1 is traditionally the gateway.',
          check: (s) => {
            const router = s.devices.find(d => d.type === 'router');
            return router && router.interfaces.some(i => i.ip === '192.168.1.1');
          },
          feedback: (s) => {
            const router = s.devices.find(d => d.type === 'router');
            if (!router) return 'No router found.';
            const hasIp = router.interfaces.some(i => i.ip);
            return hasIp ? 'Set the router IP to exactly 192.168.1.1.' : 'Open the router config and set an IP on the connected interface.';
          },
        },
        {
          title: 'Configure PC IPs and gateways',
          instruction: 'Double-click each **PC** → **Interfaces** tab:\n\n• **PC1**: IP **192.168.1.10**, mask 255.255.255.0, gateway **192.168.1.1**\n• **PC2**: IP **192.168.1.11**, mask 255.255.255.0, gateway **192.168.1.1**\n\nBoth PCs point to the router as their gateway. The mask /24 tells them "anything in 192.168.1.x is local — everything else, send to the gateway."',
          hint: 'Without a gateway, a PC can only talk to devices on its own subnet. With a gateway, it can reach the entire internet.',
          check: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc');
            return pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway)).length >= 2;
          },
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc');
            const configured = pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway));
            return configured.length < 2 ? `${configured.length}/2 PCs have both IP and gateway set.` : null;
          },
        },
        {
          title: 'Test connectivity',
          instruction: 'Open PC1\'s **CLI** tab and run:\n\n• `ipconfig` — see your IP, mask, and gateway\n• `ping 192.168.1.11` — test if PC2 is reachable\n• `ping 192.168.1.1` — test if the gateway is reachable\n\n**Key exam concept**: If `ping gateway` works but `ping remote` fails → routing problem. If `ping gateway` fails → local config problem (wrong IP, mask, or cable).',
          hint: 'Ping sends ICMP Echo Request packets. A reply means Layer 3 connectivity is working.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'cable-types-topology',
      title: 'Cable Types & Topologies',
      objective: '1.3',
      difficulty: 'Beginner',
      duration: '8 min',
      description: 'Learn the difference between Cat5e, Cat6, Fiber, Coax, and Console cables by building a star topology and using each cable type where it belongs.',
      steps: [
        {
          title: 'Build a star topology',
          instruction: 'Place **1 Router** in the center and **1 Switch** below it. Connect them with a **Fiber** cable (select Fiber from the cable palette before clicking).\n\nThis is a **star topology** — all devices radiate out from a central hub/switch. It\'s the most common LAN design because one failed cable only affects one device.',
          hint: 'Star topology: easy to troubleshoot (isolate the one bad cable), but the central switch is a single point of failure.',
          check: (s) => s.devices.some(d => d.type === 'router') && s.devices.some(d => d.type === 'switch') && s.cables.some(c => c.type === 'fiber'),
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'router')) return 'Add a Router.';
            if (!s.devices.some(d => d.type === 'switch')) return 'Add a Switch.';
            if (!s.cables.some(c => c.type === 'fiber')) return 'Connect them using a Fiber cable (select "Fiber" in the cable palette first).';
            return null;
          },
        },
        {
          title: 'Add PCs with Cat6',
          instruction: 'Add **3 PCs** and connect each to the **Switch** using **Cat6** cables.\n\n**Cable comparison**:\n• **Cat5e** — 1 Gbps, 100m max, older standard\n• **Cat6** — 10 Gbps (up to 55m), better shielding, current standard\n• **Fiber** — up to 100 Gbps, kilometers of reach, immune to EMI\n• **Coax** — used for cable internet (DOCSIS) and older networks\n• **Console** — management port (blue rollover cable, serial access)',
          hint: 'On the exam: Cat6 supports 10GBASE-T up to 55m. Cat6a extends 10G to the full 100m. Fiber uses light, not electrical signals.',
          check: (s) => s.devices.filter(d => d.type === 'pc').length >= 3 && s.cables.filter(c => c.type === 'cat6').length >= 3,
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc').length;
            const cat6 = s.cables.filter(c => c.type === 'cat6').length;
            if (pcs < 3) return `${pcs}/3 PCs placed.`;
            if (cat6 < 3) return `${cat6}/3 Cat6 cables used. Select Cat6 in the cable palette before connecting.`;
            return null;
          },
        },
        {
          title: 'Add a server with Cat5e',
          instruction: 'Add a **Server** and connect it to the switch using a **Cat5e** cable.\n\nCat5e is fine for a 1 Gbps server connection — you\'d only upgrade to Cat6 if you needed 10 Gbps.\n\n**Exam tip**: "e" in Cat5e stands for "enhanced" — it has better crosstalk specs than Cat5 (which is obsolete).',
          hint: 'Cat5e: 4 twisted pairs, RJ-45 connector, T568A or T568B wiring standard. Maximum run = 100 meters.',
          check: (s) => s.devices.some(d => d.type === 'server') && s.cables.some(c => c.type === 'cat5e'),
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'server')) return 'Add a Server to the canvas.';
            if (!s.cables.some(c => c.type === 'cat5e')) return 'Connect it using a Cat5e cable.';
            return null;
          },
        },
        {
          title: 'Add a console connection',
          instruction: 'Add a **PC** near the router and connect it to the **Router** using a **Console** cable (the dashed blue cable in the palette).\n\nConsole cables provide **out-of-band management** — you can configure the router even when the network is completely down. They use a **serial/RS-232** connection, not Ethernet.\n\n**Exam key**: console cable = rollover cable = light blue = RJ-45 to DB-9.',
          hint: 'Out-of-band management means the management path is separate from the data path. If the network goes down, you can still manage devices via console.',
          check: (s) => s.cables.some(c => c.type === 'console'),
          feedback: (s) => !s.cables.some(c => c.type === 'console') ? 'Use a Console cable to connect a PC to the Router.' : null,
        },
        {
          title: 'Review your topology',
          instruction: 'You\'ve built a **star topology** using 4 different cable types:\n\n• **Fiber** (Router ↔ Switch) — backbone link, high speed\n• **Cat6** (Switch ↔ PCs) — workstation drops\n• **Cat5e** (Switch ↔ Server) — standard server connection\n• **Console** (PC ↔ Router) — out-of-band management\n\n**Other topologies to know for the exam**:\n• **Bus** — single cable, all devices share it (legacy)\n• **Ring** — token passing, each device connects to two neighbors\n• **Mesh** — every device connects to every other device (redundant)\n• **Hybrid** — combination of two or more topologies',
          hint: 'Star-bus = star topology using a shared bus backbone. This is what most modern networks actually are.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'first-firewall',
      title: 'Your First Firewall',
      objective: '4.2',
      difficulty: 'Beginner',
      duration: '10 min',
      description: 'Place a firewall between the Internet and your LAN. Learn why firewalls exist, where they go in the network, and how ACL rules control traffic flow.',
      steps: [
        {
          title: 'Build Internet → Firewall → Switch',
          instruction: 'Place these 3 devices and cable them in a chain:\n\n**Internet/WAN** → **Firewall** → **Switch**\n\nThe firewall sits between the untrusted Internet and your trusted LAN. ALL traffic must pass through it — that\'s the chokepoint where security rules are enforced.',
          hint: 'A firewall inspects every packet against its rule set. No rule match = implicit deny (drop the packet).',
          check: (s) => s.devices.some(d => d.type === 'cloud') && s.devices.some(d => d.type === 'firewall') && s.devices.some(d => d.type === 'switch') && s.cables.length >= 2,
          feedback: (s) => {
            if (!s.devices.some(d => d.type === 'cloud')) return 'Add an Internet/WAN device.';
            if (!s.devices.some(d => d.type === 'firewall')) return 'Add a Firewall.';
            if (!s.devices.some(d => d.type === 'switch')) return 'Add a Switch.';
            if (s.cables.length < 2) return 'Cable: Internet → Firewall → Switch.';
            return null;
          },
        },
        {
          title: 'Add LAN devices',
          instruction: 'Add **2 PCs** and **1 Server** to the switch.\n\nThese represent your internal network — employee workstations and a web server. The firewall protects them from direct Internet exposure.',
          hint: 'Defense in depth: firewall is the first layer. You should also have host-based firewalls on each PC/server.',
          check: (s) => s.devices.filter(d => d.type === 'pc').length >= 2 && s.devices.some(d => d.type === 'server'),
          feedback: (s) => {
            const pcs = s.devices.filter(d => d.type === 'pc').length;
            if (pcs < 2) return `${pcs}/2 PCs placed.`;
            if (!s.devices.some(d => d.type === 'server')) return 'Add a Server.';
            return null;
          },
        },
        {
          title: 'Configure IPs',
          instruction: 'Set IPs on the **Firewall** (both interfaces) and the **PCs** + **Server**:\n\n• Firewall outside interface: **203.0.113.1** (public IP, toward Internet)\n• Firewall inside interface: **192.168.1.1** (LAN gateway)\n• PCs: **192.168.1.10**, **192.168.1.11** with gateway **192.168.1.1**\n• Server: **192.168.1.100** with gateway **192.168.1.1**',
          hint: '192.168.x.x is RFC 1918 private address space — not routable on the Internet. The firewall performs NAT to translate private → public.',
          check: (s) => {
            const fw = s.devices.find(d => d.type === 'firewall');
            const pcs = s.devices.filter(d => d.type === 'pc');
            return fw && fw.interfaces.filter(i => i.ip).length >= 2 && pcs.filter(p => p.interfaces.some(i => i.ip)).length >= 2;
          },
          feedback: (s) => {
            const fw = s.devices.find(d => d.type === 'firewall');
            if (!fw) return 'No firewall found.';
            const fwIps = fw.interfaces.filter(i => i.ip).length;
            if (fwIps < 2) return `Firewall has ${fwIps}/2 interfaces with IPs.`;
            const pcs = s.devices.filter(d => d.type === 'pc');
            const configured = pcs.filter(p => p.interfaces.some(i => i.ip)).length;
            if (configured < 2) return `${configured}/2 PCs have IPs.`;
            return null;
          },
        },
        {
          title: 'Add firewall ACL rules',
          instruction: 'Double-click the **Firewall** → **Security Groups** tab.\n\nAdd a security group called "LAN-Rules" with these inbound rules:\n• Allow TCP port **80** (HTTP)\n• Allow TCP port **443** (HTTPS)\n\n**Key concept**: firewalls use an **implicit deny** — anything not explicitly allowed is blocked. So these 2 rules allow web traffic and block everything else.',
          hint: 'ACL = Access Control List. Rules are processed top to bottom. First match wins. "Implicit deny all" is the invisible last rule.',
          check: (s) => {
            const fw = s.devices.find(d => d.type === 'firewall');
            return fw && fw.securityGroups && fw.securityGroups.length > 0 && fw.securityGroups.some(sg => sg.rules && sg.rules.length >= 2);
          },
          feedback: (s) => {
            const fw = s.devices.find(d => d.type === 'firewall');
            if (!fw) return 'No firewall found.';
            if (!fw.securityGroups || fw.securityGroups.length === 0) return 'Add a security group on the firewall.';
            const rules = fw.securityGroups.reduce((a, sg) => a + (sg.rules?.length || 0), 0);
            return rules < 2 ? `${rules}/2 ACL rules added. Add allow rules for port 80 and 443.` : null;
          },
        },
        {
          title: 'Review firewall concepts',
          instruction: 'Run `show security-groups` on the **Firewall** CLI to see your rules.\n\n**Network+ firewall types**:\n• **Packet filtering** — inspects headers only (src/dst IP, port, protocol)\n• **Stateful inspection** — tracks connection state (SYN→SYN-ACK→ACK)\n• **Application layer / proxy** — inspects payload content (Layer 7)\n• **NGFW** (Next-Gen) — combines stateful + IDS/IPS + application awareness\n• **WAF** — Web Application Firewall, protects web servers specifically\n\n**Firewall zones**: outside (untrusted), inside (trusted), DMZ (semi-trusted)',
          hint: 'Stateful firewalls remember "I saw an outbound SYN to 8.8.8.8:443" so they automatically allow the reply — you don\'t need an explicit inbound rule for return traffic.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'troubleshooting-101',
      title: 'Troubleshooting with CLI Tools',
      objective: '5.2',
      difficulty: 'Beginner',
      duration: '12 min',
      description: 'Use ping, traceroute, ipconfig, and arp on a pre-built network to diagnose connectivity. Learn the CompTIA troubleshooting methodology hands-on.',
      autoSetup: (state) => {
        // Pre-build a working 2-subnet network
        const r1 = { id: 'd_ts101_r1', type: 'router', x: 650, y: 200, hostname: 'GW-Router',
          interfaces: [
            { name: 'Gi0/0', cableId: null, ip: '192.168.1.1', mask: '255.255.255.0', mac: 'AA:00:TS:01:00:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 },
            { name: 'Gi0/1', cableId: null, ip: '10.0.0.1', mask: '255.255.255.0', mac: 'AA:00:TS:01:00:02', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 },
          ],
          routingTable: [{ type: 'static', network: '10.0.0.0', mask: '255.255.255.0', nextHop: '10.0.0.1', iface: 'Gi0/1' }],
          arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
          stpConfig: null, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] };
        const sw1 = { id: 'd_ts101_sw1', type: 'switch', x: 400, y: 400, hostname: 'SW-Office',
          interfaces: Array.from({ length: 8 }, (_, i) => ({
            name: `Fa0/${i + 1}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:00:TS:02:${String(i+1).padStart(2,'0')}:01`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64,
          })),
          routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
          stpConfig: null, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] };
        const makePC = (id, x, y, name, ip) => ({
          id, type: 'pc', x, y, hostname: name,
          interfaces: [{ name: 'eth0', cableId: null, ip, mask: '255.255.255.0', mac: `AA:00:TS:${id.slice(-2)}:01:01`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.1', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
          stpConfig: null, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] });
        const srv = { id: 'd_ts101_srv', type: 'server', x: 900, y: 400, hostname: 'WebServer',
          interfaces: [{ name: 'eth0', cableId: null, ip: '10.0.0.50', mask: '255.255.255.0', mac: 'AA:00:TS:SV:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '10.0.0.1', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
          stpConfig: null, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] };
        const pc1 = makePC('d_ts101_p1', 250, 550, 'PC-Alice', '192.168.1.10');
        const pc2 = makePC('d_ts101_p2', 550, 550, 'PC-Bob', '192.168.1.11');
        state.devices.push(r1, sw1, pc1, pc2, srv);
        const cables = [
          { id: 'c_ts101_1', from: r1.id, to: sw1.id, type: 'cat6' },
          { id: 'c_ts101_2', from: sw1.id, to: pc1.id, type: 'cat6' },
          { id: 'c_ts101_3', from: sw1.id, to: pc2.id, type: 'cat6' },
          { id: 'c_ts101_4', from: r1.id, to: srv.id, type: 'fiber' },
        ];
        cables.forEach((c, ci) => {
          const fromDev = state.devices.find(d => d.id === c.from);
          const toDev = state.devices.find(d => d.id === c.to);
          const fromIfc = fromDev.interfaces.find(i => !i.cableId);
          const toIfc = toDev.interfaces.find(i => !i.cableId);
          if (fromIfc) fromIfc.cableId = c.id;
          if (toIfc) toIfc.cableId = c.id;
        });
        state.cables.push(...cables);
      },
      steps: [
        {
          title: 'Explore the pre-built network',
          instruction: 'You have a working network with:\n• **GW-Router** — gateway between two subnets (192.168.1.0/24 and 10.0.0.0/24)\n• **SW-Office** — office switch\n• **PC-Alice** (192.168.1.10) and **PC-Bob** (192.168.1.11) — on the office LAN\n• **WebServer** (10.0.0.50) — on a separate server subnet\n\nDouble-click **PC-Alice** → **Overview** tab to see its configuration.',
          hint: 'Two subnets means cross-subnet traffic must go through the router. Same-subnet traffic stays on the switch.',
          check: (s) => s.devices.length >= 5,
          feedback: () => null,
        },
        {
          title: 'Use ipconfig to check your settings',
          instruction: 'Double-click **PC-Alice** → **CLI** tab. Run:\n\n• `ipconfig` — see IP, mask, gateway, MAC\n\nVerify: IP is 192.168.1.10, gateway is 192.168.1.1.\n\n**Exam tip**: `ipconfig` is the FIRST command in the CompTIA troubleshooting methodology. Always verify the basics before digging deeper.',
          hint: 'On Windows: ipconfig. On Linux/Mac: ifconfig or ip addr. They show the same info — IP, mask, gateway.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Ping a local device',
          instruction: 'On **PC-Alice** CLI, run:\n\n• `ping 192.168.1.11` — ping PC-Bob (same subnet)\n• `ping 192.168.1.1` — ping the gateway\n\n**Same-subnet ping**: PC-Alice ARPs for PC-Bob\'s MAC → switch forwards → direct delivery. No router involved.\n\n**Gateway ping**: Verifies Layer 3 connectivity to the router.',
          hint: 'If ping to gateway fails: check IP, mask, cable. If ping to gateway works but remote fails: routing issue.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Ping across subnets',
          instruction: 'On **PC-Alice** CLI, run:\n\n• `ping 10.0.0.50` — ping the WebServer (different subnet!)\n\nThis ping crosses subnets: PC-Alice → Switch → Router → WebServer. The router looks up 10.0.0.0/24 in its routing table and forwards the packet.\n\n**Troubleshooting flow**: If this fails, run `ping 192.168.1.1` first. If gateway ping works, the problem is routing. If gateway fails, the problem is local.',
          hint: 'Cross-subnet traffic: src PC ARPs for the gateway MAC (not the destination MAC), sends frame to gateway, router re-encapsulates and forwards.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Use traceroute and ARP',
          instruction: 'On **PC-Alice** CLI, run:\n\n• `traceroute 10.0.0.50` — see each hop to the WebServer\n• `show arp` — see the ARP table (IP → MAC mappings)\n\n**traceroute** shows every router between source and destination. Each hop decrements the TTL by 1.\n\n**ARP table** shows which MACs you\'ve learned. You should see the gateway\'s MAC (192.168.1.1) since all cross-subnet traffic goes through it.\n\n**CompTIA 7-step troubleshooting**: 1. Identify problem → 2. Theory → 3. Test theory → 4. Plan → 5. Implement → 6. Verify → 7. Document',
          hint: 'ARP maps IP → MAC. It\'s Layer 2.5 (between L2 and L3). ARP requests are broadcast, ARP replies are unicast.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    // ── v4.31.0 Labs ──
    {
      id: 'packet-anatomy',
      title: 'Packet Anatomy Lab',
      objective: '1.1',
      difficulty: 'Beginner',
      duration: '10 min',
      description: 'Watch packets traverse a network and inspect L2/L3/L4 headers in real-time. Learn how MAC addresses, IPs, ports, and TTL work together.',
      steps: [
        {
          title: 'Build a simple network',
          instruction: 'Drag a **Router**, a **Switch**, and 2 **PCs** onto the canvas.\n\nCable them: PC1 → Switch → Router, PC2 → Switch.\n\nConfigure IPs:\n• Router Gi0/0: `192.168.1.1/24`\n• PC1 eth0: `192.168.1.10/24` gateway `192.168.1.1`\n• PC2 eth0: `192.168.1.20/24` gateway `192.168.1.1`',
          hint: 'Every endpoint needs an IP, subnet mask, and gateway pointing to the nearest router.',
          check: (s) => s.devices.filter(d => d.type === 'pc' && d.interfaces.some(i => i.ip && i.gateway)).length >= 2,
          feedback: (s) => { const ready = s.devices.filter(d => d.type === 'pc' && d.interfaces.some(i => i.ip && i.gateway)).length; return ready < 2 ? `${ready}/2 PCs configured with IP and gateway.` : null; },
        },
        {
          title: 'Ping and watch the packet inspector',
          instruction: 'Click **Ping** in the toolbar → select PC1 as source and PC2 as destination → click Ping.\n\nWatch the **Packet Inspection** panel appear! It shows:\n• **Layer 2**: Source/Destination MAC addresses, EtherType\n• **Layer 3**: Source/Destination IPs, Protocol (ICMP), TTL\n• **Layer 4**: Ports and flags\n\nNotice how the TTL decrements at each hop and the MAC addresses change when crossing a router.',
          hint: 'The MAC address changes at each L2 hop (device), but the IP addresses stay the same end-to-end. This is the key difference between L2 and L3.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Send ARP and inspect',
          instruction: 'Click **Ping** → select PC1 and PC2 → click **ARP**.\n\nNotice in the packet inspector:\n• EtherType is **0x0806 (ARP)** — not IPv4!\n• Destination MAC is **ff:ff:ff:ff:ff:ff** (broadcast)\n• The request is "Who has 192.168.1.20?"\n\n**Key concept**: ARP is Layer 2.5 — it bridges L2 (MAC) and L3 (IP). Without ARP, devices wouldn\'t know which MAC to put in the frame header.',
          hint: 'ARP Request = broadcast (ff:ff:ff:ff:ff:ff). ARP Reply = unicast (directly back to requester).',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'stp-convergence',
      title: 'STP Convergence Lab',
      objective: '2.1',
      difficulty: 'Intermediate',
      duration: '12 min',
      description: 'Watch STP elect a root bridge, calculate port roles, and block redundant paths — all animated in real-time.',
      autoSetup: (state) => {
        const makeSW = (id, x, y, name, priority) => ({
          id, type: 'switch', x, y, hostname: name,
          interfaces: Array.from({ length: 8 }, (_, i) => ({ name: `Fa0/${i+1}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:00:SC:${id.slice(-2)}:${String(i+1).padStart(2,'0')}:01`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 })),
          routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [],
          securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
          stpConfig: { priority, mode: 'rstp', portStates: {} }, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [],
          bgpConfig: null, eigrpConfig: null, dnssecEnabled: false, dhcpSnooping: null, daiEnabled: false, portSecurity: null });
        const sw1 = makeSW('d_sc_sw1', 400, 200, 'SW-Core', 4096);
        const sw2 = makeSW('d_sc_sw2', 200, 500, 'SW-Left', 32768);
        const sw3 = makeSW('d_sc_sw3', 600, 500, 'SW-Right', 32768);
        state.devices.push(sw1, sw2, sw3);
        // Triangle cables
        const c1 = { id: 'c_sc_1', from: sw1.id, to: sw2.id, type: 'cat6', fromIface: 'Fa0/1', toIface: 'Fa0/1' };
        const c2 = { id: 'c_sc_2', from: sw1.id, to: sw3.id, type: 'cat6', fromIface: 'Fa0/2', toIface: 'Fa0/1' };
        const c3 = { id: 'c_sc_3', from: sw2.id, to: sw3.id, type: 'cat6', fromIface: 'Fa0/2', toIface: 'Fa0/2' };
        sw1.interfaces[0].cableId = c1.id; sw2.interfaces[0].cableId = c1.id;
        sw1.interfaces[1].cableId = c2.id; sw3.interfaces[0].cableId = c2.id;
        sw2.interfaces[1].cableId = c3.id; sw3.interfaces[1].cableId = c3.id;
        state.cables.push(c1, c2, c3);
      },
      steps: [
        {
          title: 'Examine the STP triangle',
          instruction: 'You have a triangle of 3 switches — this creates a **Layer 2 loop**! Without STP, broadcast frames would circle forever (broadcast storm).\n\nDouble-click **SW-Core** → **STP** tab. Notice:\n• Priority: **4096** (very low = will become root)\n• Mode: RSTP\n\nCheck **SW-Left** and **SW-Right** — both have priority **32768** (default).',
          hint: 'Lower bridge priority wins root election. If tied, lowest MAC wins. Default priority is 32768.',
          check: (s) => s.devices.filter(d => d.stpConfig).length >= 3,
          feedback: (s) => { const stp = s.devices.filter(d => d.stpConfig).length; return stp < 3 ? `${stp}/3 switches have STP configured.` : null; },
        },
        {
          title: 'Run convergence',
          instruction: 'On any switch\'s **STP** tab, click **▶ Run Convergence**.\n\nWatch the animation:\n1. BPDUs (Bridge Protocol Data Units) flow from SW-Core to the other switches\n2. SW-Core is elected **Root Bridge** (lowest priority 4096)\n3. One port on the SW-Left↔SW-Right link goes to **BLOCKING** — breaking the loop!\n\nCheck the STP tab on each switch to see the port states update.',
          hint: 'Root bridge sends BPDUs every 2 seconds. Non-root switches forward BPDUs toward the root port (the port closest to root bridge).',
          check: (s) => s.devices.some(d => d.stpConfig && Object.values(d.stpConfig.portStates || {}).includes('blocking')),
          feedback: (s) => { const blocking = s.devices.filter(d => d.stpConfig && Object.values(d.stpConfig.portStates || {}).includes('blocking')).length; return blocking === 0 ? 'Click "Run Convergence" on any switch\'s STP tab.' : null; },
        },
        {
          title: 'Understand port roles',
          instruction: 'After convergence, check the CLI on each switch: `show spanning-tree detail`\n\n**Port Roles** (N10-009 objective 2.1):\n• **Root Port** — port closest to root bridge (forwarding)\n• **Designated Port** — port that forwards on each segment (forwarding)\n• **Blocked/Alternate Port** — redundant port (blocking to prevent loop)\n\nSW-Core has all **designated** ports (it\'s the root). The other switches each have one **root** port and potentially one **blocked** port.',
          hint: 'RSTP convergence: ~1-2 seconds. Classic STP: 30-50 seconds (15s listening + 15s learning). RSTP uses proposal/agreement instead of timers.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'qos-voice-priority',
      title: 'QoS Voice Priority Lab',
      objective: '4.6',
      difficulty: 'Intermediate',
      duration: '12 min',
      description: 'Configure QoS policies to prioritize voice traffic (DSCP EF) over data. See how classification and queuing affect packet delivery.',
      steps: [
        {
          title: 'Build a voice network',
          instruction: 'Drag a **Router**, a **Switch**, 2 **PCs**, and 2 **VoIP** phones.\n\nCable them all to the switch, and the switch to the router.\n\nConfigure IPs:\n• Router: `10.0.0.1/24`\n• PCs: `10.0.0.10-11/24` with gateway\n• VoIP phones: `10.0.0.50-51/24` with gateway',
          hint: 'VoIP uses RTP over UDP, typically ports 5060 (SIP signaling) and 16384-32767 (media).',
          check: (s) => s.devices.filter(d => d.type === 'voip').length >= 2 && s.devices.filter(d => d.type === 'router').length >= 1,
          feedback: (s) => { const voip = s.devices.filter(d => d.type === 'voip').length; return voip < 2 ? `${voip}/2 VoIP phones placed.` : null; },
        },
        {
          title: 'Configure QoS policies',
          instruction: 'Double-click the **Router** → **QoS** tab → Enable QoS.\n\nAdd these policies:\n1. Name: `voice`, Match: `udp 5060`, DSCP: `ef`, Queue: `priority`\n2. Name: `data`, Match: `any`, DSCP: `default`, Queue: `best-effort`\n\n**DSCP EF** (Expedited Forwarding) = decimal 46 = **priority queue**. Voice gets processed first, data waits.',
          hint: 'DSCP values: EF (46) = voice, AF41 (34) = video, AF21 (18) = low-latency data, CS0 (0) = best effort.',
          check: (s) => s.devices.some(d => d.qosConfig?.enabled && d.qosConfig.policies?.length >= 2),
          feedback: (s) => { const qos = s.devices.find(d => d.qosConfig?.enabled); if (!qos) return 'Enable QoS on the router.'; return qos.qosConfig.policies?.length < 2 ? `${qos.qosConfig.policies.length}/2 policies configured.` : null; },
        },
        {
          title: 'Test with ping and observe QoS',
          instruction: 'Ping from **PC1** to **PC2** and watch the packet inspector.\n\nNotice the **payload** field shows `QoS: data (best-effort)` — regular traffic.\n\nNow ping between VoIP phones. If you had voice-matching traffic, it would show `QoS: voice (priority)` with lower delay.\n\nRun `show qos counters` on the router CLI to see queue statistics.\n\n**Key concept**: QoS doesn\'t create bandwidth — it **prioritizes** traffic. Priority queue gets serviced first, best-effort waits. During congestion, best-effort packets may be **tail-dropped**.',
          hint: 'QoS mechanisms: Classification → Marking → Queuing → Scheduling → Policing/Shaping. Remember: trust boundaries at access layer.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'bgp-peering',
      title: 'BGP Peering Lab',
      objective: '1.4',
      difficulty: 'Advanced',
      duration: '15 min',
      description: 'Configure eBGP between two autonomous systems. Negotiate peers, exchange routes, and understand AS_PATH — the backbone of Internet routing.',
      steps: [
        {
          title: 'Build two autonomous systems',
          instruction: 'Build 2 separate networks connected by 2 **routers** (ISP edge routers):\n\n• **R1** (AS 65001): `10.1.0.1/30` on Gi0/0 (toward R2), `192.168.1.1/24` on Gi0/1 (internal)\n• **R2** (AS 65002): `10.1.0.2/30` on Gi0/0 (toward R1), `172.16.0.1/24` on Gi0/1 (internal)\n\nCable R1 Gi0/0 ↔ R2 Gi0/0 with **fiber**.\nAdd a PC and switch to each side.',
          hint: 'eBGP peers are typically on a /30 point-to-point link. The /30 gives exactly 2 usable IPs.',
          check: (s) => s.devices.filter(d => d.type === 'router' || d.type === 'isp-router').length >= 2,
          feedback: (s) => { const routers = s.devices.filter(d => d.type === 'router' || d.type === 'isp-router').length; return routers < 2 ? `${routers}/2 routers placed.` : null; },
        },
        {
          title: 'Configure BGP on both routers',
          instruction: 'On **R1** → **BGP** tab:\n• Enable BGP, ASN: `65001`, Router ID: `1.1.1.1`\n• Add neighbor: IP `10.1.0.2`, Remote AS `65002`, Type `eBGP`\n• Add network: `192.168.1.0/24`\n\nOn **R2** → **BGP** tab:\n• Enable BGP, ASN: `65002`, Router ID: `2.2.2.2`\n• Add neighbor: IP `10.1.0.1`, Remote AS `65001`, Type `eBGP`\n• Add network: `172.16.0.0/24`',
          hint: 'BGP neighbors must be explicitly configured on BOTH sides. Unlike OSPF, BGP does not auto-discover neighbors.',
          check: (s) => s.devices.filter(d => d.bgpConfig?.enabled && d.bgpConfig.neighbors.length > 0).length >= 2,
          feedback: (s) => { const bgp = s.devices.filter(d => d.bgpConfig?.enabled && d.bgpConfig.neighbors.length > 0).length; return bgp < 2 ? `${bgp}/2 routers have BGP configured with neighbors.` : null; },
        },
        {
          title: 'Negotiate and verify',
          instruction: 'On R1\'s **BGP** tab, click **▶ Negotiate Peers**.\n\nWatch the purple BGP UPDATE animation! Both peers should show **Established** state.\n\nVerify on CLI:\n• `show ip bgp summary` — see neighbor status (Established = good!)\n• `show ip bgp` — see the BGP routing table with learned networks\n• `show running-config` — see the full BGP config block\n\n**Key concepts**: eBGP uses TCP port 179. AS_PATH prevents loops (a router won\'t accept a route with its own ASN in the path).',
          hint: 'BGP states: Idle → Connect → OpenSent → OpenConfirm → Established. If stuck in Active, check neighbor IP and AS.',
          check: (s) => s.devices.some(d => d.bgpConfig?.neighbors?.some(n => n.state === 'Established')),
          feedback: (s) => { const est = s.devices.filter(d => d.bgpConfig?.neighbors?.some(n => n.state === 'Established')).length; return est === 0 ? 'Click "Negotiate Peers" on a BGP tab.' : null; },
        },
      ]
    },
    {
      id: 'attack-defense',
      title: 'Network Attack & Defense Lab',
      objective: '4.2',
      difficulty: 'Intermediate',
      duration: '15 min',
      description: 'Simulate ARP spoofing, VLAN hopping, and rogue DHCP attacks — then enable DAI, DHCP snooping, and port security to defend against them.',
      steps: [
        {
          title: 'Build a vulnerable network',
          instruction: 'Drag a **Router**, 2 **Switches**, and 3 **PCs** onto the canvas.\n\nCable: Router → SW1 → SW2, PCs to switches.\n\nConfigure IPs on all PCs with gateway pointing to the router.\n\nThis network has **no security** — it\'s vulnerable to Layer 2 attacks!',
          hint: 'Most L2 attacks target switches because switches blindly trust MAC addresses and ARP replies.',
          check: (s) => s.devices.filter(d => d.type.indexOf('switch') >= 0).length >= 2 && s.devices.filter(d => d.type === 'pc').length >= 2,
          feedback: (s) => { const sw = s.devices.filter(d => d.type.indexOf('switch') >= 0).length; const pc = s.devices.filter(d => d.type === 'pc').length; return `${sw}/2 switches, ${pc}/2 PCs placed.`; },
        },
        {
          title: 'Launch attacks',
          instruction: 'Double-click **SW1** → **Attack** tab.\n\nClick each attack button:\n• **⚡ ARP Spoof** — see the red fake ARP packet! An attacker could redirect traffic.\n• **⚡ VLAN Hop** — double-tagging exploits the native VLAN\n• **⚡ Rogue DHCP** — attacker gives out malicious gateway/DNS\n\nAll three succeed because no defenses are configured!',
          hint: 'In the real world, these attacks happen on the LAN. An attacker plugs into an open port and starts poisoning.',
          check: () => true,
          feedback: () => null,
        },
        {
          title: 'Enable defenses',
          instruction: 'On **SW1** → **Attack** tab, enable:\n\n1. **DHCP Snooping** ✓ — mark the uplink port (to router) as trusted\n2. **DAI (Dynamic ARP Inspection)** ✓ — validates ARP against binding table\n3. **Port Security** ✓ — Max MAC: 1, Violation: shutdown\n\nDo the same on **SW2**.',
          hint: 'DHCP Snooping builds a binding table (IP↔MAC↔port↔VLAN). DAI uses this table to validate ARP. They work together.',
          check: (s) => s.devices.some(d => d.dhcpSnooping?.enabled) && s.devices.some(d => d.daiEnabled),
          feedback: (s) => { const sn = s.devices.filter(d => d.dhcpSnooping?.enabled).length; const dai = s.devices.filter(d => d.daiEnabled).length; return `DHCP Snooping: ${sn} switch(es), DAI: ${dai} switch(es).`; },
        },
        {
          title: 'Test defenses',
          instruction: 'Now try the attacks again! Click **⚡ ARP Spoof** — it\'s **blocked by DAI**! 🛡️\n\nClick **⚡ Rogue DHCP** — **blocked by DHCP Snooping**! 🛡️\n\nVerify on CLI:\n• `show ip dhcp snooping` — see trusted/untrusted ports\n• `show ip arp inspection` — see DAI status\n\n**Key concept**: defense-in-depth means layering multiple controls. Each attack has a specific countermeasure.',
          hint: 'Port security limits MAC addresses per port. Violation modes: shutdown (disable port), restrict (drop + log), protect (drop silently).',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
    {
      id: 'dnssec-chain',
      title: 'DNSSEC Chain of Trust Lab',
      objective: '1.6',
      difficulty: 'Advanced',
      duration: '12 min',
      description: 'Enable DNSSEC on a DNS server, add signing records, and validate the chain of trust with dig +dnssec. Understand how RRSIG, DNSKEY, and DS work together.',
      steps: [
        {
          title: 'Build a DNS infrastructure',
          instruction: 'Drag a **DNS Server**, a **Router**, a **Switch**, and 2 **PCs**.\n\nCable everything through the switch to the router.\n\nConfigure IPs:\n• DNS Server: `10.0.0.53/24`\n• PCs: `10.0.0.10-11/24` with gateway `10.0.0.1`\n\nOn the DNS Server → **DNS** tab, add these records:\n• A record: `web.example.com` → `10.0.0.100`\n• MX record: `example.com` → `10 mail.example.com`',
          hint: 'DNS servers typically use port 53 (UDP for queries, TCP for zone transfers).',
          check: (s) => s.devices.some(d => d.type === 'dns-server' && d.dnsRecords?.length >= 2),
          feedback: (s) => { const dns = s.devices.find(d => d.type === 'dns-server'); if (!dns) return 'Add a DNS Server.'; return dns.dnsRecords?.length < 2 ? `${dns.dnsRecords?.length || 0}/2 DNS records added.` : null; },
        },
        {
          title: 'Enable DNSSEC',
          instruction: 'On the DNS Server → **DNS** tab, scroll down to the **🔒 DNSSEC** section.\n\nCheck **Enable DNSSEC**.\n\nNotice the new records automatically generated:\n• **DNSKEY** — the zone\'s public key\n• **RRSIG** — digital signatures over your A and MX records\n• **DS** — Delegation Signer (hash of DNSKEY, stored in parent zone)\n\nThese three record types form the **chain of trust**.',
          hint: 'DNSSEC does NOT encrypt DNS — it only authenticates. Use DoH (DNS over HTTPS) or DoT (DNS over TLS) for encryption.',
          check: (s) => s.devices.some(d => d.dnssecEnabled),
          feedback: (s) => { const sec = s.devices.filter(d => d.dnssecEnabled).length; return sec === 0 ? 'Enable DNSSEC on the DNS Server.' : null; },
        },
        {
          title: 'Validate with dig +dnssec',
          instruction: 'On any **PC** → CLI tab, run:\n\n• `dig +dnssec web.example.com`\n\nLook at the output:\n• **AD flag: SET** means the response is **Authenticated Data** ✓\n• Each record shows its **RRSIG** (signature) and **DNSKEY** (public key)\n• The chain: record → RRSIG validates → DNSKEY verifies → DS in parent zone\n\nAlso try: `show dnssec` on the DNS Server to see the signing status.\n\n**Without DNSSEC**, an attacker could perform **DNS cache poisoning** — injecting fake records to redirect users to malicious sites.',
          hint: 'Chain of trust: Root (.) → TLD (.com) → Domain (example.com). Each level signs the level below it using DS records.',
          check: () => true,
          feedback: () => null,
        },
      ]
    },
  ];
  
  let tbActiveLab = null;  // { labId, stepIdx }
  
  // ── v4.43.1: Lab catalog regroup ──────────────────────────────────────
  // Previously all 65 labs dumped into one alphabetized-by-difficulty list.
  // Users saw "65 labs" and expected breadth; they got 30 meaningful concept
  // labs + 35 auto-generated variants with cryptic IDs (c_auto_1, d_vpnlab_dc1,
  // etc.). This regroups by concept category and labels variants honestly
  // ("Free Build Config A/B/C/D") so users understand what they're looking at.
  const TB_LAB_CATEGORIES = {
    'Fundamentals':    ['basic-lan', 'ip-addressing-101', 'cable-types-topology', 'arp-investigation', 'packet-anatomy'],
    'Switching':       ['vlan-segmentation', 'stp-loop-prevention', 'stp-convergence'],
    'Routing':         ['static-routing', 'ospf-dynamic-routing', 'bgp-peering', 'multi-site-wan'],
    'Services':        ['dhcp-setup', 'dns-infrastructure', 'dnssec-chain'],
    'Security':        ['first-firewall', 'dmz-firewall', 'acl-traffic-filter', 'attack-defense', 'network-hardening'],
    'Cloud & WAN':     ['cloud-vpc-lab', 'cloud-vpc-security', 'sase-zero-trust', 'site-to-site-vpn'],
    'Wireless & QoS':  ['wireless-network', 'qos-voice-priority'],
    'Troubleshooting': ['troubleshoot-connectivity', 'troubleshooting-101', 'troubleshoot-vlan-isolation', 'troubleshoot-dhcp-relay'],
  };
  // Variant labs — auto-generated configs of a parent lab. Each gets a human
  // label so the picker doesn't show cryptic IDs.
  const TB_LAB_VARIANT_GROUPS = {
    'Free Build variants':     { parent: 'basic-lan',             ids: ['c_auto_1', 'c_auto_2', 'c_auto_3', 'c_auto_4'] },
    'Site-to-Site VPN variants': { parent: 'site-to-site-vpn',     ids: ['d_vpnlab_dc1', 'd_vpnlab_dc2', 'd_vpnlab_vpg1', 'd_vpnlab_vpg2', 'd_vpnlab_cloud', 'c_vpnlab_1', 'c_vpnlab_2', 'c_vpnlab_3', 'c_vpnlab_4'] },
    'Hardening variants':      { parent: 'network-hardening',     ids: ['d_harden_r1', 'd_harden_sw1', 'd_harden_pc1', 'd_harden_pc2', 'd_harden_srv', 'c_harden_1', 'c_harden_2', 'c_harden_3', 'c_harden_4'] },
    'STP variants':            { parent: 'stp-loop-prevention',   ids: ['d_stp_r1', 'c_stp_1', 'c_stp_2', 'c_stp_3', 'c_stp_4'] },
    'STP Convergence variants': { parent: 'stp-convergence',      ids: ['c_sc_1', 'c_sc_2', 'c_sc_3'] },
    'Troubleshooting variants': { parent: 'troubleshooting-101',  ids: ['d_ts101_r1', 'd_ts101_sw1', 'd_ts101_srv', 'c_ts101_1', 'c_ts101_2', 'c_ts101_3', 'c_ts101_4'] },
  };
  
  function tbOpenLabPicker() {
    const modal = document.getElementById('tb-lab-picker');
    const body = document.getElementById('tb-lab-picker-body');
    if (!modal || !body) return;
  
    // Build quick lookup maps
    const labById = {};
    TB_LABS.forEach(l => { labById[l.id] = l; });
    const variantIds = new Set();
    Object.values(TB_LAB_VARIANT_GROUPS).forEach(g => g.ids.forEach(id => variantIds.add(id)));
  
    const renderCard = (lab) => `<div class="tb-lab-card" data-diff="${lab.difficulty}" onclick="tbStartLab('${lab.id}')">
      <div class="tb-lab-card-head">
        <strong>${escHtml(lab.title)}</strong>
        <span class="tb-lab-diff tb-lab-diff-${lab.difficulty.toLowerCase()}">${lab.difficulty}</span>
      </div>
      <div class="tb-lab-card-meta">
        <span>Obj ${lab.objective}</span> &middot; <span>${lab.duration}</span> &middot; <span>${lab.steps.length} steps</span>${lab.autoSetup ? ' &middot; <span class="tb-lab-badge-auto">Pre-built</span>' : ''}
      </div>
      <div class="tb-lab-card-desc">${escHtml(lab.description)}</div>
    </div>`;
  
    // Count meaningful vs variants so the header can say "29 labs + 35 variants"
    // instead of the inflated "65 labs" claim.
    const meaningfulCount = Object.values(TB_LAB_CATEGORIES).flat().filter(id => labById[id]).length;
    const variantCount = variantIds.size;
  
    let html = `<div class="tb-lab-picker-header">
      <div class="tb-lab-picker-count"><strong>${meaningfulCount}</strong> concept labs <span class="tb-lab-picker-count-sub">+ ${variantCount} auto-generated configs</span></div>
      <div class="tb-fix-tabs">`;
    ['All', 'Beginner', 'Intermediate', 'Advanced'].forEach(t => {
      html += `<button class="tb-fix-tab${t === 'All' ? ' tb-fix-tab-active' : ''}" onclick="tbLabFilterTab(this,'${t}')">${t}</button>`;
    });
    html += '</div></div><div id="tb-lab-cards">';
  
    // ── Render category groups ──
    // v4.99.75: only the first category opens by default; the rest render as
    // collapsed group rows (faithful to netplus-concept-labs mockup — open
    // group = .g-h list, collapsed groups = .grp rows). Still <details>, so
    // every group stays click-expandable; zero behaviour change.
    let _tbLabCatIdx = 0;
    Object.entries(TB_LAB_CATEGORIES).forEach(([categoryName, labIds]) => {
      const categoryLabs = labIds.map(id => labById[id]).filter(Boolean);
      if (categoryLabs.length === 0) return;
      const _open = _tbLabCatIdx === 0 ? ' open' : '';
      _tbLabCatIdx++;
      html += `<details class="tb-lab-category"${_open}>
        <summary class="tb-lab-category-head">
          <span class="tb-lab-category-name">${escHtml(categoryName)}</span>
          <span class="tb-lab-category-count">${categoryLabs.length} lab${categoryLabs.length === 1 ? '' : 's'}</span>
        </summary>
        <div class="tb-lab-category-cards">${categoryLabs.map(renderCard).join('')}</div>
      </details>`;
    });
  
    // ── Render variant groups (collapsed by default) ──
    const variantEntries = Object.entries(TB_LAB_VARIANT_GROUPS)
      .map(([groupName, group]) => ({ groupName, group, labs: group.ids.map(id => labById[id]).filter(Boolean) }))
      .filter(e => e.labs.length > 0);
    if (variantEntries.length > 0) {
      html += '<details class="tb-lab-category tb-lab-category-variants"><summary class="tb-lab-category-head"><span class="tb-lab-category-name">Auto-generated configs</span><span class="tb-lab-category-count">' + variantCount + ' variants</span></summary><div class="tb-lab-variant-groups">';
      variantEntries.forEach(({ groupName, group, labs }) => {
        html += `<div class="tb-lab-variant-group">
          <div class="tb-lab-variant-group-head"><strong>${escHtml(groupName)}</strong> <span class="tb-lab-variant-group-parent">based on ${escHtml(labById[group.parent]?.title || group.parent)}</span></div>
          <div class="tb-lab-category-cards">${labs.map((lab, idx) => {
            // Relabel cryptic IDs with human-readable variant names
            const variantLetter = String.fromCharCode(65 + idx); // A, B, C...
            const displayLab = { ...lab, title: `${groupName.replace(/ variants$/, '')} — Config ${variantLetter}` };
            return renderCard(displayLab);
          }).join('')}</div>
        </div>`;
      });
      html += '</div></details>';
    }
  
    // ── Orphan labs (in TB_LABS but not in any category) — defensive fallback ──
    const categorizedIds = new Set([...Object.values(TB_LAB_CATEGORIES).flat(), ...variantIds]);
    const orphans = TB_LABS.filter(l => !categorizedIds.has(l.id));
    if (orphans.length > 0) {
      html += `<details class="tb-lab-category"><summary class="tb-lab-category-head"><span class="tb-lab-category-name">Other</span><span class="tb-lab-category-count">${orphans.length}</span></summary><div class="tb-lab-category-cards">${orphans.map(renderCard).join('')}</div></details>`;
    }
  
    html += '</div>';
    body.innerHTML = html;
    modal.classList.remove('is-hidden');
  }
  
  function tbLabFilterTab(btn, diff) {
    document.querySelectorAll('#tb-lab-picker-body .tb-fix-tab').forEach(t => t.classList.remove('tb-fix-tab-active'));
    btn.classList.add('tb-fix-tab-active');
    document.querySelectorAll('#tb-lab-cards .tb-lab-card').forEach(card => {
      card.style.display = (diff === 'All' || card.dataset.diff === diff) ? '' : 'none';
    });
  }
  
  function tbStartLab(labId) {
    const lab = TB_LABS.find(l => l.id === labId);
    if (!lab) return;
    document.getElementById('tb-lab-picker')?.classList.add('is-hidden');
    // Clear canvas for lab
    if (tbState.devices.length > 0 && !confirm('Starting a lab will clear your current canvas. Continue?')) return;
    tbState = tbNewState();
    tbState.name = lab.title;
    // Auto-setup: pre-build topology for troubleshooting/scenario labs
    if (lab.autoSetup) {
      lab.autoSetup(tbState);
      tbMigrateState(tbState);
    }
    tbRenderCanvas();
    tbUpdateDeviceCount();
    tbSaveDraft();
    tbActiveLab = { labId, stepIdx: 0, hintsUsed: 0 };
    tbRenderLabStep();
    document.getElementById('tb-lab-panel')?.classList.remove('is-hidden');
  }
  
  function tbToggleLabHint() {
    const el = document.getElementById('tb-lab-hint-content');
    if (el) {
      el.classList.toggle('is-hidden');
      if (!el.classList.contains('is-hidden') && tbActiveLab) tbActiveLab.hintsUsed++;
    }
  }
  
  function tbRenderLabStep() {
    if (!tbActiveLab) return;
    const lab = TB_LABS.find(l => l.id === tbActiveLab.labId);
    if (!lab) return;
    const step = lab.steps[tbActiveLab.stepIdx];
    document.getElementById('tb-lab-title').textContent = lab.title;
    document.getElementById('tb-lab-progress').textContent = `Step ${tbActiveLab.stepIdx + 1} / ${lab.steps.length}`;
    document.getElementById('tb-lab-prev').classList.toggle('is-hidden', tbActiveLab.stepIdx === 0);
    const isLast = tbActiveLab.stepIdx === lab.steps.length - 1;
    const nextBtn = document.getElementById('tb-lab-next');
    nextBtn.textContent = isLast ? 'Finish Lab ✓' : 'Next ▶';
    // Check if step condition is met
    const passed = step.check(tbState);
    // Track whether this step JUST became complete (for celebration)
    const stepKey = `${tbActiveLab.labId}_${tbActiveLab.stepIdx}`;
    if (passed && !tbActiveLab._completedSteps) tbActiveLab._completedSteps = new Set();
    const justCompleted = passed && tbActiveLab._completedSteps && !tbActiveLab._completedSteps.has(stepKey);
    if (passed && tbActiveLab._completedSteps) tbActiveLab._completedSteps.add(stepKey);
  
    const stepEl = document.getElementById('tb-lab-step');
    // Convert markdown: **bold**, `code`, \n\n to <br> for multi-paragraph
    let instrHtml = step.instruction.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    instrHtml = instrHtml.replace(/\n\n/g, '<br><br>');
    // Build feedback section
    let feedbackHtml = '';
    if (!passed && step.feedback) {
      const fb = step.feedback(tbState);
      if (fb) feedbackHtml = `<div class="tb-lab-step-feedback">⚠ ${fb}</div>`;
    }
    // Build hint section
    let hintHtml = '';
    if (step.hint) {
      hintHtml = `<div class="tb-lab-hint">
        <button class="btn btn-ghost tb-lab-hint-toggle" onclick="tbToggleLabHint()">💡 Show Hint</button>
        <div id="tb-lab-hint-content" class="tb-lab-hint-body is-hidden">${step.hint}</div>
      </div>`;
    }
    // Progress bar
    const pct = Math.round(((tbActiveLab.stepIdx + (passed ? 1 : 0)) / lab.steps.length) * 100);
    const progressBar = `<div class="tb-lab-progress-bar"><div class="tb-lab-progress-fill" style="width:${pct}%"></div></div>`;
  
    // Celebration class for animation
    const checkClass = justCompleted ? 'tb-lab-step-check tb-lab-step-just-completed' : 'tb-lab-step-check';
  
    stepEl.innerHTML = `<div class="tb-lab-step-title">${escHtml(step.title)}</div>
      ${progressBar}
      <div class="tb-lab-step-instr">${instrHtml}</div>
      ${hintHtml}
      ${feedbackHtml}
      ${passed ? `<div class="${checkClass}">✓ Step complete!${!isLast ? ' Click Next ▶ to continue.' : ' Click Finish to complete the lab!'}</div>` : '<div class="tb-lab-step-pending">Complete the step above — the panel updates live as you work.</div>'}`;
  
    // Highlight the Next button when step is complete
    nextBtn.classList.toggle('tb-lab-next-ready', passed);
  
    // Auto-detect target devices from step instruction bold text and highlight them
    // Extracts **Bold Terms** from instruction, matches against device hostnames and type labels
    tbActiveLab._highlightIds = [];
    if (!passed) {
      const boldTerms = (step.instruction.match(/\*\*([^*]+)\*\*/g) || []).map(m => m.replace(/\*\*/g, '').trim().toLowerCase());
      if (boldTerms.length) {
        const typeLabels = {};
        Object.entries(TB_DEVICE_TYPES).forEach(([k, v]) => { typeLabels[v.label.toLowerCase()] = k; typeLabels[v.short.toLowerCase()] = k; });
        // Also match plural forms (e.g. "Routers" → "router", "2 PCs" → "pc")
        const matchTypes = new Set();
        const matchHostnames = new Set();
        boldTerms.forEach(term => {
          // Direct type label match (e.g. "Router", "Switch", "DNS Server")
          if (typeLabels[term]) { matchTypes.add(typeLabels[term]); return; }
          // Plural/quantified match (e.g. "3 Routers", "2 PCs")
          const stripped = term.replace(/^[\d\s]+/, '').replace(/s$/, '').trim();
          if (typeLabels[stripped]) { matchTypes.add(typeLabels[stripped]); return; }
          // Hostname match (e.g. "SW-Core", "R1", "PC2")
          matchHostnames.add(term);
        });
        tbState.devices.forEach(d => {
          if (matchTypes.has(d.type)) { tbActiveLab._highlightIds.push(d.id); return; }
          const hn = (d.hostname || '').toLowerCase();
          if (matchHostnames.has(hn)) { tbActiveLab._highlightIds.push(d.id); return; }
          // Partial hostname match (e.g. bold "R1" matches hostname "R1")
          for (const h of matchHostnames) {
            if (hn === h || hn.startsWith(h + '-') || h.startsWith(hn)) { tbActiveLab._highlightIds.push(d.id); break; }
          }
        });
      }
    }
    tbRenderCanvas();
  }
  
  function tbLabNext() {
    if (!tbActiveLab) return;
    const lab = TB_LABS.find(l => l.id === tbActiveLab.labId);
    if (!lab) return;
    // Check current step
    const step = lab.steps[tbActiveLab.stepIdx];
    if (!step.check(tbState) && tbActiveLab.stepIdx < lab.steps.length - 1) {
      showErrorToast('Complete the current step before moving on.');
      return;
    }
    if (tbActiveLab.stepIdx < lab.steps.length - 1) {
      tbActiveLab.stepIdx++;
      tbRenderLabStep();
    } else {
      // Lab complete
      tbEndLab();
      showErrorToast('Lab complete! Great work. 🎉');
    }
  }
  
  function tbLabPrev() {
    if (!tbActiveLab || tbActiveLab.stepIdx <= 0) return;
    tbActiveLab.stepIdx--;
    tbRenderLabStep();
  }
  
  function tbEndLab() {
    // Track lab completion
    if (tbActiveLab) {
      try {
        const completions = JSON.parse(localStorage.getItem(STORAGE.LAB_COMPLETIONS) || '{}');
        if (!completions[tbActiveLab.labId]) {
          completions[tbActiveLab.labId] = { firstCompleted: new Date().toISOString(), count: 0 };
        }
        completions[tbActiveLab.labId].count = (completions[tbActiveLab.labId].count || 0) + 1;
        completions[tbActiveLab.labId].lastCompleted = new Date().toISOString();
        localStorage.setItem(STORAGE.LAB_COMPLETIONS, JSON.stringify(completions));
        _cloudFlush(STORAGE.LAB_COMPLETIONS);
      } catch (_) {}
      // Evaluate lab milestones
      evaluateMilestones();
    }
    tbActiveLab = null;
    document.getElementById('tb-lab-panel')?.classList.add('is-hidden');
  }
  
  // ══════════════════════════════════════════
  // AMBIENT PACKET ANIMATION
  // ══════════════════════════════════════════
  
  const tbAmbientState = {
    enabled: true,
    intervalId: null,
    animFrameId: null,
    packets: [],
    pool: [],
    healthCache: {},
    healthStamp: 0,
    POOL_SIZE: 40,
    SPAWN_INTERVAL: 1200,
    PACKET_SPEED: 1000,
    PACKET_RADIUS: 6,
    PACKET_OPACITY: 0.85
  };
  
  // v4.49.2: expanded exemption list — devices that operate at L2 or are
  // transit/transparent in our model don't need IP assignments for a cable
  // to be considered "flowing." Pre-v4.49.2 this was only [switch, dmz-switch,
  // cloud], which caused red (blocked) packets on scenario cables connecting
  // through WAPs, modems, cell-towers, satellites, SAN arrays, WLCs,
  // ISP-routers, and cloud-abstraction nodes (VPC, subnet, IGW, NAT-GW,
  // TGW, VPG, SASE, on-prem DC) — none of which conceptually need
  // customer-side IPs in our simulation model.
  const TB_NO_IP_NEEDED = [
    // L2 bridges
    'switch', 'dmz-switch', 'wap',
    // Cloud + cloud-abstraction nodes
    'cloud', 'vpc', 'cloud-subnet', 'igw', 'nat-gw', 'tgw', 'vpg', 'sase-edge', 'onprem-dc',
    // Transit / broadband / radio
    'modem', 'cell-tower', 'satellite', 'isp-router',
    // Storage fabric
    'san-array',
    // Wireless management
    'wlc',
  ];
  
  function tbInitAmbientPool() {
    const animLayer = document.getElementById('tb-anim-layer');
    if (!animLayer || tbAmbientState.pool.length >= tbAmbientState.POOL_SIZE) return;
    // Clear old pool elements if re-initializing
    tbAmbientState.pool.forEach(el => el.remove());
    tbAmbientState.pool = [];
    for (let i = 0; i < tbAmbientState.POOL_SIZE; i++) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.classList.add('tb-ambient-dot');
      circle.setAttribute('r', '0');
      circle.setAttribute('cx', '0');
      circle.setAttribute('cy', '0');
      circle.setAttribute('fill', '#22c55e');
      circle.setAttribute('opacity', '0');
      animLayer.appendChild(circle);
      tbAmbientState.pool.push(circle);
    }
  }
  
  function tbAssessCableHealth(cable) {
    const fromDev = tbState.devices.find(d => d.id === cable.from);
    const toDev = tbState.devices.find(d => d.id === cable.to);
    if (!fromDev || !toDev) return 'idle';
  
    if (cable.type === 'console') return 'idle';
  
    const fromIfc = fromDev.interfaces?.find(i => i.cableId === cable.id);
    const toIfc = toDev.interfaces?.find(i => i.cableId === cable.id);
  
    const fromExempt = TB_NO_IP_NEEDED.includes(fromDev.type);
    const toExempt = TB_NO_IP_NEEDED.includes(toDev.type);
  
    // Check enabled status
    if (fromIfc?.enabled === false || toIfc?.enabled === false) return 'blocked';
  
    // STP check
    if (fromDev.stpConfig?.portStates) {
      const fromIfcIdx = fromDev.interfaces?.indexOf(fromIfc);
      if (fromIfcIdx >= 0) {
        const portState = fromDev.stpConfig.portStates[fromIfcIdx];
        if (portState === 'blocking') return 'blocked';
      }
    }
    if (toDev.stpConfig?.portStates) {
      const toIfcIdx = toDev.interfaces?.indexOf(toIfc);
      if (toIfcIdx >= 0) {
        const portState = toDev.stpConfig.portStates[toIfcIdx];
        if (portState === 'blocking') return 'blocked';
      }
    }
  
    const fromHasIp = fromIfc?.ip || fromExempt;
    const toHasIp = toIfc?.ip || toExempt;
  
    // Neither end has IP (excluding exemptions)
    if (!fromHasIp && !toHasIp) return 'idle';
  
    // Only one end has IP
    if (!fromHasIp || !toHasIp) return 'blocked';
  
    // Both have IPs (or are exempt) — check subnet match
    if (fromIfc?.ip && toIfc?.ip) {
      const mask = fromIfc.mask || toIfc.mask || '255.255.255.0';
      if (tbSameSubnet(fromIfc.ip, toIfc.ip, mask)) return 'flowing';
  
      // Different subnets — check if any router has a route for either subnet
      const routers = tbState.devices.filter(d =>
        d.type === 'router' || d.type === 'firewall' || d.type === 'isp-router'
      );
      const fromSubnet = tbSubnetOf(fromIfc.ip, mask);
      const toSubnet = tbSubnetOf(toIfc.ip, mask);
      for (const r of routers) {
        if (!r.routingTable) continue;
        const hasRoute = r.routingTable.some(rt =>
          rt.network === fromSubnet || rt.network === toSubnet
        );
        if (hasRoute) return 'flowing';
      }
      return 'degraded';
    }
  
    // At least one end is exempt (switch/cloud) with the other having IP
    return 'flowing';
  }
  
  function tbRefreshAmbientHealth() {
    const cache = {};
    for (const cable of tbState.cables) {
      cache[cable.id] = tbAssessCableHealth(cable);
    }
    // Detect blocked→flowing transitions for healing bursts
    const oldCache = tbAmbientState.healthCache;
    for (const cableId in cache) {
      if (oldCache[cableId] === 'blocked' && cache[cableId] === 'flowing') {
        tbAmbientHealingBurst(cableId);
      }
    }
    tbAmbientState.healthCache = cache;
    tbAmbientState.healthStamp = tbState.updated;
  }
  
  function tbAmbientSpawnCycle() {
    if (!tbAmbientState.enabled) return;
    const tbPage = document.getElementById('page-topology-builder');
    if (!tbPage?.classList.contains('active')) return;
    if (tbState.cables.length === 0) return;
  
    // Refresh health if state changed
    if (tbState.updated !== tbAmbientState.healthStamp) {
      tbRefreshAmbientHealth();
    }
  
    for (const cable of tbState.cables) {
      if (tbAmbientState.packets.length >= tbAmbientState.POOL_SIZE) break;
  
      const health = tbAmbientState.healthCache[cable.id];
      if (!health || health === 'idle') continue;
  
      // Spawn probability per cable per cycle
      const roll = Math.random();
      const threshold = health === 'flowing' ? 0.60
        : health === 'degraded' ? 0.40
        : 0.25; // blocked
      if (roll > threshold) continue;
  
      tbSpawnAmbientDot(cable, health);
    }
  }
  
  function tbSpawnAmbientDot(cable, health) {
    // Find a free pool element
    const inUse = new Set(tbAmbientState.packets.map(p => p.el));
    const el = tbAmbientState.pool.find(c => !inUse.has(c));
    if (!el) return;
  
    const fromDev = tbState.devices.find(d => d.id === cable.from);
    const toDev = tbState.devices.find(d => d.id === cable.to);
    if (!fromDev || !toDev) return;
  
    const HALF_W = 48, HALF_H = 36;
  
    // Determine direction
    let startDev = fromDev;
    let endDev = toDev;
  
    if (health === 'flowing') {
      // Random direction
      if (Math.random() < 0.5) {
        startDev = toDev;
        endDev = fromDev;
      }
    } else if (health === 'blocked') {
      // From misconfigured end toward configured end
      const fromIfc = fromDev.interfaces?.find(i => i.cableId === cable.id);
      const toIfc = toDev.interfaces?.find(i => i.cableId === cable.id);
      const fromOk = fromIfc?.ip || TB_NO_IP_NEEDED.includes(fromDev.type);
      const toOk = toIfc?.ip || TB_NO_IP_NEEDED.includes(toDev.type);
      if (fromOk && !toOk) {
        startDev = toDev;
        endDev = fromDev;
      }
      // else default from→to (from is misconfigured)
    }
  
    const p1 = tbEdgePoint(startDev.x, startDev.y, endDev.x, endDev.y, HALF_W, HALF_H);
    const p2 = tbEdgePoint(endDev.x, endDev.y, startDev.x, startDev.y, HALF_W, HALF_H);
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 + 16;
  
    // Color by health
    const color = health === 'flowing' ? '#22c55e'
      : health === 'degraded' ? '#f59e0b'
      : '#ef4444';
  
    // Duration by health
    const duration = health === 'flowing' ? 1200
      : health === 'degraded' ? 1600
      : 600;
  
    el.setAttribute('fill', color);
    el.setAttribute('r', String(tbAmbientState.PACKET_RADIUS));
    el.setAttribute('opacity', String(tbAmbientState.PACKET_OPACITY));
    el.setAttribute('cx', String(p1.x));
    el.setAttribute('cy', String(p1.y));
    el.style.filter = `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 3px ${color})`;
  
    tbAmbientState.packets.push({
      el,
      p1,
      p2,
      mx,
      my,
      startTime: performance.now(),
      duration,
      health,
      phase: 'travel'
    });
  }
  
  function tbAmbientAnimLoop(now) {
    if (!tbAmbientState.enabled) return;
  
    const packets = tbAmbientState.packets;
    for (let i = packets.length - 1; i >= 0; i--) {
      const pkt = packets[i];
      const elapsed = now - pkt.startTime;
      let t = Math.min(elapsed / pkt.duration, 1);
  
      if (pkt.phase === 'fade') {
        // Fade-out phase: shrink and fade over 300ms
        const fadeT = Math.min((now - pkt.fadeStart) / 300, 1);
        const r = tbAmbientState.PACKET_RADIUS * (1 - fadeT);
        const o = tbAmbientState.PACKET_OPACITY * (1 - fadeT);
        pkt.el.setAttribute('r', String(Math.max(r, 0)));
        pkt.el.setAttribute('opacity', String(Math.max(o, 0)));
        if (fadeT >= 1) {
          // Recycle
          pkt.el.setAttribute('r', '0');
          pkt.el.setAttribute('opacity', '0');
          packets.splice(i, 1);
        }
        continue;
      }
  
      if (pkt.health === 'blocked') {
        // Only animate to 30% of the bezier, then fade
        const effectiveT = Math.min(t, 0.3) / 0.3; // remap 0-0.3 → 0-1
        const bt = t <= 0.3 ? t : 0.3; // clamp bezier param
        const u = 1 - bt;
        const x = u * u * pkt.p1.x + 2 * u * bt * pkt.mx + bt * bt * pkt.p2.x;
        const y = u * u * pkt.p1.y + 2 * u * bt * pkt.my + bt * bt * pkt.p2.y;
        pkt.el.setAttribute('cx', String(x));
        pkt.el.setAttribute('cy', String(y));
        if (t >= 1) {
          pkt.phase = 'fade';
          pkt.fadeStart = now;
        }
        continue;
      }
  
      if (pkt.health === 'degraded') {
        // Stutter at midpoint (hold position at t=0.45-0.55)
        if (t > 0.45 && t < 0.55) {
          t = 0.45;
        } else if (t >= 0.55) {
          // Remap 0.55-1.0 → 0.45-1.0 to keep smooth
          t = 0.45 + (t - 0.55) * (0.55 / 0.45);
          t = Math.min(t, 1);
        }
      }
  
      // Normal bezier interpolation
      const u = 1 - t;
      const x = u * u * pkt.p1.x + 2 * u * t * pkt.mx + t * t * pkt.p2.x;
      const y = u * u * pkt.p1.y + 2 * u * t * pkt.my + t * t * pkt.p2.y;
      pkt.el.setAttribute('cx', String(x));
      pkt.el.setAttribute('cy', String(y));
  
      if (t >= 1) {
        // Recycle
        pkt.el.setAttribute('r', '0');
        pkt.el.setAttribute('opacity', '0');
        packets.splice(i, 1);
      }
    }
  
    tbAmbientState.animFrameId = requestAnimationFrame(tbAmbientAnimLoop);
  }
  
  function tbStartAmbient() {
    if (tbAmbientState.pool.length === 0) {
      tbInitAmbientPool();
    }
    // Start spawn cycle
    if (!tbAmbientState.intervalId) {
      tbAmbientState.intervalId = setInterval(tbAmbientSpawnCycle, tbAmbientState.SPAWN_INTERVAL);
    }
    // Start animation loop
    if (!tbAmbientState.animFrameId) {
      tbAmbientState.enabled = true;
      tbAmbientState.animFrameId = requestAnimationFrame(tbAmbientAnimLoop);
    }
  }
  
  function tbStopAmbient() {
    if (tbAmbientState.intervalId) {
      clearInterval(tbAmbientState.intervalId);
      tbAmbientState.intervalId = null;
    }
    if (tbAmbientState.animFrameId) {
      cancelAnimationFrame(tbAmbientState.animFrameId);
      tbAmbientState.animFrameId = null;
    }
    // Hide all dots and reset
    for (const pkt of tbAmbientState.packets) {
      pkt.el.setAttribute('r', '0');
      pkt.el.setAttribute('opacity', '0');
    }
    tbAmbientState.packets = [];
  }
  
  function tbPauseAmbient() {
    tbAmbientState.enabled = false;
  }
  
  function tbResumeAmbient() {
    tbAmbientState.enabled = true;
    if (!tbAmbientState.animFrameId) {
      tbAmbientState.animFrameId = requestAnimationFrame(tbAmbientAnimLoop);
    }
  }
  
  function tbAmbientHealingBurst(cableId) {
    const cable = tbState.cables.find(c => c.id === cableId);
    if (!cable) return;
  
    const fromDev = tbState.devices.find(d => d.id === cable.from);
    const toDev = tbState.devices.find(d => d.id === cable.to);
    if (!fromDev || !toDev) return;
  
    const HALF_W = 48, HALF_H = 36;
    const p1 = tbEdgePoint(fromDev.x, fromDev.y, toDev.x, toDev.y, HALF_W, HALF_H);
    const p2 = tbEdgePoint(toDev.x, toDev.y, fromDev.x, fromDev.y, HALF_W, HALF_H);
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 + 16;
  
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (tbAmbientState.packets.length >= tbAmbientState.POOL_SIZE) return;
  
        const inUse = new Set(tbAmbientState.packets.map(p => p.el));
        const el = tbAmbientState.pool.find(c => !inUse.has(c));
        if (!el) return;
  
        el.setAttribute('fill', '#22c55e');
        el.setAttribute('r', '8');
        el.setAttribute('opacity', '0.95');
        el.setAttribute('cx', String(p1.x));
        el.setAttribute('cy', String(p1.y));
        el.style.filter = 'drop-shadow(0 0 12px #22c55e) drop-shadow(0 0 4px #22c55e)';
  
        tbAmbientState.packets.push({
          el,
          p1,
          p2,
          mx,
          my,
          startTime: performance.now(),
          duration: 800,
          health: 'flowing',
          phase: 'travel'
        });
      }, i * 100);
    }
  }
  
  
  // ══════════════════════════════════════════
  // FIX THIS NETWORK — Troubleshooting Challenges (N10-009 Domain 5)
  // ══════════════════════════════════════════
  
  const TB_FAULT_TYPES = [
    // ── L3 / IP Addressing (5.3) ──
    { id: 'wrong-subnet', domain: '5.3', difficulty: 'easy', label: 'Wrong subnet on endpoint',
      inject: (dev, ifc, orig) => { const o = orig.ip.split('.'); o[2] = String((parseInt(o[2]) + 10) % 256); ifc.ip = o.join('.'); },
      detect: (dev, ifc, orig) => ifc.ip === orig.ip ? null : `${dev.hostname} has IP ${ifc.ip} — should be ${orig.ip}` },
    { id: 'wrong-gateway', domain: '5.3', difficulty: 'easy', label: 'Incorrect default gateway',
      inject: (dev, ifc, orig) => { const o = orig.gateway.split('.'); o[3] = String((parseInt(o[3]) + 100) % 256); ifc.gateway = o.join('.'); },
      detect: (dev, ifc, orig) => ifc.gateway === orig.gateway ? null : `${dev.hostname} gateway is ${ifc.gateway} — should be ${orig.gateway}` },
    { id: 'wrong-mask', domain: '5.3', difficulty: 'easy', label: 'Mismatched subnet mask',
      inject: (dev, ifc) => { ifc.mask = '255.255.0.0'; },
      detect: (dev, ifc, orig) => ifc.mask === orig.mask ? null : `${dev.hostname} mask is ${ifc.mask} — should be ${orig.mask}` },
    { id: 'duplicate-ip', domain: '5.3', difficulty: 'easy', label: 'Duplicate IP address',
      inject: (dev, ifc, orig, state) => { const other = state.devices.find(d => d.id !== dev.id && d.interfaces?.some(i => i.ip)); if (other) { const oi = other.interfaces.find(i => i.ip); ifc.ip = oi.ip; } },
      detect: (dev, ifc, orig) => ifc.ip === orig.ip ? null : `${dev.hostname} has duplicate IP ${ifc.ip} — should be ${orig.ip}` },
    { id: 'missing-ip', domain: '5.3', difficulty: 'easy', label: 'Unconfigured interface',
      inject: (dev, ifc) => { ifc.ip = ''; ifc.mask = ''; },
      detect: (dev, ifc, orig) => ifc.ip === orig.ip ? null : `${dev.hostname} interface has no IP — needs ${orig.ip}` },
    // ── L2 / Switching (5.3) ──
    { id: 'wrong-vlan', domain: '5.3', difficulty: 'medium', label: 'Port on wrong VLAN',
      inject: (dev, ifc) => { ifc.vlan = ifc.vlan === 10 ? 99 : 10; },
      detect: (dev, ifc, orig) => ifc.vlan === orig.vlan ? null : `${dev.hostname} port is on VLAN ${ifc.vlan} — should be VLAN ${orig.vlan}` },
    { id: 'trunk-not-set', domain: '5.3', difficulty: 'medium', label: 'Trunk port set to access',
      inject: (dev, ifc) => { ifc.mode = 'access'; },
      detect: (dev, ifc, orig) => ifc.mode === orig.mode ? null : `${dev.hostname} port mode is ${ifc.mode} — should be ${orig.mode}` },
    { id: 'trunk-missing-vlan', domain: '5.3', difficulty: 'medium', label: 'VLAN not in trunk allowed',
      inject: (dev, ifc) => { ifc.trunkAllowed = '1'; },
      detect: (dev, ifc, orig) => ifc.trunkAllowed === orig.trunkAllowed ? null : `${dev.hostname} trunk allows "${ifc.trunkAllowed}" — should allow "${orig.trunkAllowed}"` },
    { id: 'port-disabled', domain: '5.2', difficulty: 'easy', label: 'Interface disabled',
      inject: (dev, ifc) => { ifc.enabled = false; },
      detect: (dev, ifc) => ifc.enabled !== false ? null : `${dev.hostname} interface is administratively disabled` },
    // ── Routing (5.3) ──
    { id: 'missing-route', domain: '5.3', difficulty: 'medium', label: 'Missing static route',
      inject: (dev) => { if (dev.routingTable?.length) dev.routingTable = []; },
      detect: (dev, ifc, orig) => { if (!orig.routingTable?.length) return null; return dev.routingTable?.length >= orig.routingTable.length ? null : `${dev.hostname} is missing static routes (has ${dev.routingTable?.length || 0}, needs ${orig.routingTable.length})`; } },
    { id: 'wrong-next-hop', domain: '5.3', difficulty: 'medium', label: 'Wrong next hop on route',
      inject: (dev) => { if (dev.routingTable?.length) { const rt = dev.routingTable[0]; const o = rt.nextHop.split('.'); o[3] = String((parseInt(o[3]) + 50) % 256); rt.nextHop = o.join('.'); } },
      detect: (dev, ifc, orig) => { if (!orig.routingTable?.length) return null; const rt = dev.routingTable?.[0]; const ort = orig.routingTable[0]; return (rt && rt.nextHop === ort.nextHop) ? null : `${dev.hostname} route next-hop is wrong — should be ${ort.nextHop}`; } },
    // ── DHCP (5.3) ──
    { id: 'dhcp-wrong-pool', domain: '5.3', difficulty: 'medium', label: 'DHCP pool wrong subnet',
      inject: (dev) => { if (dev.dhcpServer) { const o = dev.dhcpServer.poolStart.split('.'); o[2] = String((parseInt(o[2]) + 10) % 256); dev.dhcpServer.poolStart = o.join('.'); } },
      detect: (dev, ifc, orig) => { if (!orig.dhcpServer) return null; return dev.dhcpServer?.poolStart === orig.dhcpServer.poolStart ? null : `${dev.hostname} DHCP pool starts at ${dev.dhcpServer?.poolStart} — should be ${orig.dhcpServer.poolStart}`; } },
    // ── Security (5.4) ──
    { id: 'acl-blocks-traffic', domain: '5.4', difficulty: 'hard', label: 'ACL blocking traffic',
      inject: (dev) => { if (!dev.acls) dev.acls = []; dev.acls.unshift({ action: 'deny', proto: 'ip', src: '0.0.0.0/0', dst: '0.0.0.0/0' }); },
      detect: (dev, ifc, orig) => { const deny = dev.acls?.find(a => a.action === 'deny' && a.src === '0.0.0.0/0' && a.dst === '0.0.0.0/0'); return deny ? `${dev.hostname} has a deny-all ACL blocking all traffic` : null; } },
    // ── VPN (5.3) ──
    { id: 'vpn-crypto-mismatch', domain: '5.3', difficulty: 'hard', label: 'VPN crypto mismatch',
      inject: (dev) => { if (dev.vpnConfig) dev.vpnConfig.encryption = dev.vpnConfig.encryption === 'aes-256' ? '3des' : 'aes-256'; },
      detect: (dev, ifc, orig) => { if (!orig.vpnConfig) return null; return dev.vpnConfig?.encryption === orig.vpnConfig.encryption ? null : `${dev.hostname} VPN encryption is ${dev.vpnConfig?.encryption} — should be ${orig.vpnConfig.encryption}`; } },
    { id: 'vpn-wrong-psk', domain: '5.3', difficulty: 'hard', label: 'VPN PSK mismatch',
      inject: (dev) => { if (dev.vpnConfig) dev.vpnConfig.psk = 'wrong-key-12345'; },
      detect: (dev, ifc, orig) => { if (!orig.vpnConfig) return null; return dev.vpnConfig?.psk === orig.vpnConfig.psk ? null : `${dev.hostname} VPN pre-shared key doesn't match peer`; } },
    // ── Wireless (5.4) ──
    { id: 'wap-wrong-security', domain: '5.4', difficulty: 'easy', label: 'WAP using deprecated WEP',
      inject: (dev) => { if (dev.wirelessConfig) dev.wirelessConfig.security = 'wep'; },
      detect: (dev, ifc, orig) => { if (!orig.wirelessConfig) return null; return dev.wirelessConfig?.security !== 'wep' ? null : `${dev.hostname} is using WEP — upgrade to WPA2/WPA3`; } },
  ];
  
  let tbFixChallenge = null;
  
  const TB_FIX_CHALLENGES = [
    // ── EASY (1-2 faults) ──
    { id: 'fix-broken-lan', title: 'The Broken LAN', difficulty: 'Easy', objective: '5.3', duration: '5 min',
      description: 'A small office LAN — 2 of 3 PCs can\'t reach the router.',
      faultIds: ['wrong-subnet', 'wrong-gateway'],
      symptom: '🎫 Help Desk Ticket #1042: "Two users in the office report no internet. One user works fine."',
      autoSetup: (state) => {
        const r = { id: 'fx_r1', type: 'router', x: 700, y: 150, hostname: 'R-GW', interfaces: [{name:'Gi0/0',cableId:'fx_c1',ip:'192.168.1.1',mask:'255.255.255.0',mac:'aa:bb:cc:00:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw = { id: 'fx_sw1', type: 'switch', x: 700, y: 350, hostname: 'SW1', interfaces: [{name:'Fa0/0',cableId:'fx_c1',ip:'',mask:'',mac:'aa:bb:cc:00:01:00',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx_c2',ip:'',mask:'',mac:'aa:bb:cc:00:01:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx_c3',ip:'',mask:'',mac:'aa:bb:cc:00:01:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/3',cableId:'fx_c4',ip:'',mask:'',mac:'aa:bb:cc:00:01:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx_pc1', type: 'pc', x: 400, y: 550, hostname: 'PC1-OK', interfaces: [{name:'eth0',cableId:'fx_c2',ip:'192.168.1.10',mask:'255.255.255.0',mac:'aa:bb:cc:00:02:01',vlan:1,mode:'access',gateway:'192.168.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx_pc2', type: 'pc', x: 700, y: 550, hostname: 'PC2', interfaces: [{name:'eth0',cableId:'fx_c3',ip:'192.168.1.20',mask:'255.255.255.0',mac:'aa:bb:cc:00:02:02',vlan:1,mode:'access',gateway:'192.168.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc3 = { id: 'fx_pc3', type: 'pc', x: 1000, y: 550, hostname: 'PC3', interfaces: [{name:'eth0',cableId:'fx_c4',ip:'192.168.1.30',mask:'255.255.255.0',mac:'aa:bb:cc:00:02:03',vlan:1,mode:'access',gateway:'192.168.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r, sw, pc1, pc2, pc3);
        state.cables.push({ id:'fx_c1',from:'fx_r1',to:'fx_sw1',type:'cat6'}, { id:'fx_c2',from:'fx_pc1',to:'fx_sw1',type:'cat6'}, { id:'fx_c3',from:'fx_pc2',to:'fx_sw1',type:'cat6'}, { id:'fx_c4',from:'fx_pc3',to:'fx_sw1',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'wrong-subnet', deviceId: 'fx_pc2', ifaceIdx: 0 },
        { faultId: 'wrong-gateway', deviceId: 'fx_pc3', ifaceIdx: 0 },
      ],
      hints: { 'wrong-subnet': ['Try pinging from PC2 to the router. Does it respond?', 'Check PC2\'s IP. Is it in the same /24 subnet as the router (192.168.1.x)?'], 'wrong-gateway': ['PC3 can\'t reach anything outside its subnet. What setting controls cross-subnet traffic?', 'Check PC3\'s gateway. Does it point to the router\'s IP (192.168.1.1)?'] },
    },
    { id: 'fix-silent-pc', title: 'The Silent PC', difficulty: 'Easy', objective: '5.3', duration: '5 min',
      description: 'One PC has no connectivity at all — not even to the local switch.',
      faultIds: ['missing-ip', 'port-disabled'],
      symptom: '🎫 Ticket #1087: "My computer shows \'No network access\'. I can\'t even ping the switch."',
      autoSetup: (state) => {
        const r = { id: 'fx2_r1', type: 'router', x: 700, y: 150, hostname: 'R1', interfaces: [{name:'Gi0/0',cableId:'fx2_c1',ip:'10.0.1.1',mask:'255.255.255.0',mac:'aa:00:00:01:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw = { id: 'fx2_sw1', type: 'switch', x: 700, y: 350, hostname: 'SW1', interfaces: [{name:'Fa0/0',cableId:'fx2_c1',ip:'',mask:'',mac:'aa:00:00:02:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx2_c2',ip:'',mask:'',mac:'aa:00:00:02:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx2_c3',ip:'',mask:'',mac:'aa:00:00:02:00:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx2_pc1', type: 'pc', x: 500, y: 550, hostname: 'PC-OK', interfaces: [{name:'eth0',cableId:'fx2_c2',ip:'10.0.1.10',mask:'255.255.255.0',mac:'aa:00:00:03:00:01',vlan:1,mode:'access',gateway:'10.0.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx2_pc2', type: 'pc', x: 900, y: 550, hostname: 'PC-Silent', interfaces: [{name:'eth0',cableId:'fx2_c3',ip:'10.0.1.20',mask:'255.255.255.0',mac:'aa:00:00:03:00:02',vlan:1,mode:'access',gateway:'10.0.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r, sw, pc1, pc2);
        state.cables.push({ id:'fx2_c1',from:'fx2_r1',to:'fx2_sw1',type:'cat6'}, { id:'fx2_c2',from:'fx2_pc1',to:'fx2_sw1',type:'cat6'}, { id:'fx2_c3',from:'fx2_pc2',to:'fx2_sw1',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'missing-ip', deviceId: 'fx2_pc2', ifaceIdx: 0 },
        { faultId: 'port-disabled', deviceId: 'fx2_pc2', ifaceIdx: 0 },
      ],
      hints: { 'missing-ip': ['Run `ipconfig` on PC-Silent. Does it have an IP?', 'Configure an IP in the 10.0.1.x/24 range on PC-Silent.'], 'port-disabled': ['The interface might be administratively down. Check the Interfaces tab.', 'Look for an "enabled" toggle on the port connected to the switch.'] },
    },
    { id: 'fix-duplicate-ip', title: 'Duplicate Address Detected', difficulty: 'Easy', objective: '5.3', duration: '4 min',
      description: 'Two devices have the same IP — both are intermittently losing connectivity.',
      faultIds: ['duplicate-ip'],
      symptom: '🎫 Ticket #1103: "Two people keep losing their network connection randomly — it works sometimes and fails other times."',
      autoSetup: (state) => {
        const r = { id: 'fx3_r1', type: 'router', x: 700, y: 150, hostname: 'R1', interfaces: [{name:'Gi0/0',cableId:'fx3_c1',ip:'172.16.0.1',mask:'255.255.255.0',mac:'bb:00:00:01:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw = { id: 'fx3_sw1', type: 'switch', x: 700, y: 350, hostname: 'SW1', interfaces: [{name:'Fa0/0',cableId:'fx3_c1',ip:'',mask:'',mac:'bb:00:00:02:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx3_c2',ip:'',mask:'',mac:'bb:00:00:02:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx3_c3',ip:'',mask:'',mac:'bb:00:00:02:00:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx3_pc1', type: 'pc', x: 500, y: 550, hostname: 'PC-A', interfaces: [{name:'eth0',cableId:'fx3_c2',ip:'172.16.0.10',mask:'255.255.255.0',mac:'bb:00:00:03:00:01',vlan:1,mode:'access',gateway:'172.16.0.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx3_pc2', type: 'pc', x: 900, y: 550, hostname: 'PC-B', interfaces: [{name:'eth0',cableId:'fx3_c3',ip:'172.16.0.20',mask:'255.255.255.0',mac:'bb:00:00:03:00:02',vlan:1,mode:'access',gateway:'172.16.0.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r, sw, pc1, pc2);
        state.cables.push({ id:'fx3_c1',from:'fx3_r1',to:'fx3_sw1',type:'cat6'}, { id:'fx3_c2',from:'fx3_pc1',to:'fx3_sw1',type:'cat6'}, { id:'fx3_c3',from:'fx3_pc2',to:'fx3_sw1',type:'cat6'});
      },
      faultTargets: (state) => [{ faultId: 'duplicate-ip', deviceId: 'fx3_pc2', ifaceIdx: 0 }],
      hints: { 'duplicate-ip': ['Run `ipconfig` on both PCs. Compare their IPs.', 'Two devices on the same subnet must have UNIQUE IPs.'] },
    },
    { id: 'fix-wrong-mask', title: 'Wrong Mask Mayhem', difficulty: 'Easy', objective: '5.3', duration: '5 min',
      description: 'A PC has a mismatched subnet mask — it can\'t ping the gateway.',
      faultIds: ['wrong-mask', 'wrong-gateway'],
      symptom: '🎫 Ticket #1120: "My PC shows connected but I can\'t reach the gateway. Other PCs on the same switch work fine."',
      autoSetup: (state) => {
        const r = { id: 'fx4_r1', type: 'router', x: 700, y: 150, hostname: 'R1', interfaces: [{name:'Gi0/0',cableId:'fx4_c1',ip:'192.168.10.1',mask:'255.255.255.0',mac:'cc:00:00:01:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw = { id: 'fx4_sw1', type: 'switch', x: 700, y: 350, hostname: 'SW1', interfaces: [{name:'Fa0/0',cableId:'fx4_c1',ip:'',mask:'',mac:'cc:00:00:02:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx4_c2',ip:'',mask:'',mac:'cc:00:00:02:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx4_c3',ip:'',mask:'',mac:'cc:00:00:02:00:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx4_pc1', type: 'pc', x: 500, y: 550, hostname: 'PC-OK', interfaces: [{name:'eth0',cableId:'fx4_c2',ip:'192.168.10.10',mask:'255.255.255.0',mac:'cc:00:00:03:00:01',vlan:1,mode:'access',gateway:'192.168.10.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx4_pc2', type: 'pc', x: 900, y: 550, hostname: 'PC-Broken', interfaces: [{name:'eth0',cableId:'fx4_c3',ip:'192.168.10.20',mask:'255.255.255.0',mac:'cc:00:00:03:00:02',vlan:1,mode:'access',gateway:'192.168.10.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r, sw, pc1, pc2);
        state.cables.push({ id:'fx4_c1',from:'fx4_r1',to:'fx4_sw1',type:'cat6'}, { id:'fx4_c2',from:'fx4_pc1',to:'fx4_sw1',type:'cat6'}, { id:'fx4_c3',from:'fx4_pc2',to:'fx4_sw1',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'wrong-mask', deviceId: 'fx4_pc2', ifaceIdx: 0 },
        { faultId: 'wrong-gateway', deviceId: 'fx4_pc2', ifaceIdx: 0 },
      ],
      hints: { 'wrong-mask': ['What subnet mask is PC-Broken using? Compare it with PC-OK.', 'A /16 mask and a /24 mask define very different networks, even with the same IP.'], 'wrong-gateway': ['Even with the right IP and mask, a wrong gateway means no cross-subnet routing.', 'The gateway should be the router\'s interface IP on this subnet.'] },
    },
    { id: 'fix-insecure-wifi', title: 'Insecure Wireless', difficulty: 'Easy', objective: '5.4', duration: '3 min',
      description: 'A WAP is running deprecated WEP encryption.',
      faultIds: ['wap-wrong-security'],
      symptom: '🎫 Security Audit: "Access point AP-Office is using WEP. This must be upgraded immediately."',
      autoSetup: (state) => {
        const r = { id: 'fx5_r1', type: 'router', x: 700, y: 150, hostname: 'R1', interfaces: [{name:'Gi0/0',cableId:'fx5_c1',ip:'10.10.1.1',mask:'255.255.255.0',mac:'dd:00:00:01:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw = { id: 'fx5_sw1', type: 'switch', x: 700, y: 350, hostname: 'SW1', interfaces: [{name:'Fa0/0',cableId:'fx5_c1',ip:'',mask:'',mac:'dd:00:00:02:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx5_c2',ip:'',mask:'',mac:'dd:00:00:02:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const wap = { id: 'fx5_wap', type: 'wap', x: 400, y: 550, hostname: 'AP-Office', interfaces: [{name:'eth0',cableId:'fx5_c2',ip:'10.10.1.50',mask:'255.255.255.0',mac:'dd:00:00:03:00:01',vlan:1,mode:'access',gateway:'10.10.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[], wirelessConfig:{ ssid:'Office-WiFi', security:'wpa3-personal', channel:'6', band:'5ghz', txPower:'auto', mode:'802.11ax' } };
        state.devices.push(r, sw, wap);
        state.cables.push({ id:'fx5_c1',from:'fx5_r1',to:'fx5_sw1',type:'cat6'}, { id:'fx5_c2',from:'fx5_wap',to:'fx5_sw1',type:'cat6'});
      },
      faultTargets: (state) => [{ faultId: 'wap-wrong-security', deviceId: 'fx5_wap', ifaceIdx: 0 }],
      hints: { 'wap-wrong-security': ['Double-click AP-Office and check the Wireless tab.', 'WEP is deprecated and cracked in minutes. Set security to WPA2 or WPA3.'] },
    },
    // ── MEDIUM (2-3 faults) ──
    { id: 'fix-vlan-isolation', title: 'VLAN Isolation Failure', difficulty: 'Medium', objective: '5.3', duration: '10 min',
      description: 'VLANs are misconfigured — a trunk port is set to access mode and a PC is on the wrong VLAN.',
      faultIds: ['wrong-vlan', 'trunk-not-set'],
      symptom: '🎫 Ticket #2001: "Sales team can\'t reach the printer anymore. IT team has no issues. This broke after the switch firmware upgrade."',
      autoSetup: (state) => {
        const r = { id: 'fx6_r1', type: 'router', x: 700, y: 100, hostname: 'R-Core', interfaces: [{name:'Gi0/0',cableId:'fx6_c1',ip:'192.168.10.1',mask:'255.255.255.0',mac:'ee:00:00:01:00:01',vlan:1,mode:'trunk',gateway:'',enabled:true,trunkAllowed:'1,10,20',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw = { id: 'fx6_sw1', type: 'switch', x: 700, y: 300, hostname: 'SW-Floor1', interfaces: [{name:'Fa0/0',cableId:'fx6_c1',ip:'',mask:'',mac:'ee:00:00:02:00:01',vlan:1,mode:'trunk',gateway:'',enabled:true,trunkAllowed:'1,10,20',subInterfaces:[]},{name:'Fa0/1',cableId:'fx6_c2',ip:'',mask:'',mac:'ee:00:00:02:00:02',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx6_c3',ip:'',mask:'',mac:'ee:00:00:02:00:03',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/3',cableId:'fx6_c4',ip:'',mask:'',mac:'ee:00:00:02:00:04',vlan:20,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'},{id:10,name:'Sales'},{id:20,name:'IT'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx6_pc1', type: 'pc', x: 400, y: 500, hostname: 'PC-Sales1', interfaces: [{name:'eth0',cableId:'fx6_c2',ip:'192.168.10.10',mask:'255.255.255.0',mac:'ee:00:00:03:00:01',vlan:10,mode:'access',gateway:'192.168.10.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx6_pc2', type: 'pc', x: 700, y: 500, hostname: 'PC-Sales2', interfaces: [{name:'eth0',cableId:'fx6_c3',ip:'192.168.10.20',mask:'255.255.255.0',mac:'ee:00:00:03:00:02',vlan:10,mode:'access',gateway:'192.168.10.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc3 = { id: 'fx6_pc3', type: 'pc', x: 1000, y: 500, hostname: 'PC-IT', interfaces: [{name:'eth0',cableId:'fx6_c4',ip:'192.168.20.10',mask:'255.255.255.0',mac:'ee:00:00:03:00:03',vlan:20,mode:'access',gateway:'192.168.20.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r, sw, pc1, pc2, pc3);
        state.cables.push({ id:'fx6_c1',from:'fx6_r1',to:'fx6_sw1',type:'cat6'}, { id:'fx6_c2',from:'fx6_pc1',to:'fx6_sw1',type:'cat6'}, { id:'fx6_c3',from:'fx6_pc2',to:'fx6_sw1',type:'cat6'}, { id:'fx6_c4',from:'fx6_pc3',to:'fx6_sw1',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'wrong-vlan', deviceId: 'fx6_sw1', ifaceIdx: 2 },
        { faultId: 'trunk-not-set', deviceId: 'fx6_sw1', ifaceIdx: 0 },
      ],
      hints: { 'wrong-vlan': ['PC-Sales2 is on which VLAN? Check the switch port.', 'Sales devices should all be on VLAN 10.'], 'trunk-not-set': ['The uplink to the router carries multiple VLANs. What port mode should it be?', 'An access port only carries one VLAN. For inter-VLAN routing, the router link needs to be a trunk.'] },
    },
    { id: 'fix-routing-blackhole', title: 'Routing Black Hole', difficulty: 'Medium', objective: '5.3', duration: '10 min',
      description: 'Two subnets can\'t reach each other — the router is missing a static route.',
      faultIds: ['missing-route', 'wrong-next-hop'],
      symptom: '🎫 Ticket #2050: "Branch office users can\'t access HQ file server. Both offices were working yesterday."',
      autoSetup: (state) => {
        const r1 = { id: 'fx7_r1', type: 'router', x: 400, y: 250, hostname: 'R-HQ', interfaces: [{name:'Gi0/0',cableId:'fx7_c1',ip:'10.1.1.1',mask:'255.255.255.0',mac:'ff:00:00:01:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx7_c3',ip:'10.0.0.1',mask:'255.255.255.252',mac:'ff:00:00:01:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'10.2.2.0',mask:'255.255.255.0',nextHop:'10.0.0.2',iface:'Gi0/1'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const r2 = { id: 'fx7_r2', type: 'router', x: 1000, y: 250, hostname: 'R-Branch', interfaces: [{name:'Gi0/0',cableId:'fx7_c2',ip:'10.2.2.1',mask:'255.255.255.0',mac:'ff:00:00:02:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx7_c3',ip:'10.0.0.2',mask:'255.255.255.252',mac:'ff:00:00:02:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'10.1.1.0',mask:'255.255.255.0',nextHop:'10.0.0.1',iface:'Gi0/1'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw1 = { id: 'fx7_sw1', type: 'switch', x: 400, y: 450, hostname: 'SW-HQ', interfaces: [{name:'Fa0/0',cableId:'fx7_c1',ip:'',mask:'',mac:'ff:00:00:03:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx7_c4',ip:'',mask:'',mac:'ff:00:00:03:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx7_pc1', type: 'pc', x: 400, y: 600, hostname: 'FileServer', interfaces: [{name:'eth0',cableId:'fx7_c4',ip:'10.1.1.10',mask:'255.255.255.0',mac:'ff:00:00:04:00:01',vlan:1,mode:'access',gateway:'10.1.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw2 = { id: 'fx7_sw2', type: 'switch', x: 1000, y: 450, hostname: 'SW-Branch', interfaces: [{name:'Fa0/0',cableId:'fx7_c2',ip:'',mask:'',mac:'ff:00:00:05:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx7_c5',ip:'',mask:'',mac:'ff:00:00:05:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx7_pc2', type: 'pc', x: 1000, y: 600, hostname: 'PC-Branch', interfaces: [{name:'eth0',cableId:'fx7_c5',ip:'10.2.2.10',mask:'255.255.255.0',mac:'ff:00:00:06:00:01',vlan:1,mode:'access',gateway:'10.2.2.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r1, r2, sw1, sw2, pc1, pc2);
        state.cables.push({ id:'fx7_c1',from:'fx7_r1',to:'fx7_sw1',type:'cat6'}, { id:'fx7_c2',from:'fx7_r2',to:'fx7_sw2',type:'cat6'}, { id:'fx7_c3',from:'fx7_r1',to:'fx7_r2',type:'fiber'}, { id:'fx7_c4',from:'fx7_pc1',to:'fx7_sw1',type:'cat6'}, { id:'fx7_c5',from:'fx7_pc2',to:'fx7_sw2',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'missing-route', deviceId: 'fx7_r2' },
        { faultId: 'wrong-next-hop', deviceId: 'fx7_r1' },
      ],
      hints: { 'missing-route': ['R-Branch needs to know how to reach 10.1.1.0/24. Check its routing table.', 'Add a static route: network 10.1.1.0, mask 255.255.255.0, next hop 10.0.0.1'], 'wrong-next-hop': ['R-HQ has a route to 10.2.2.0/24 — but is the next hop correct?', 'The next hop should be R-Branch\'s WAN interface: 10.0.0.2'] },
    },
    // ── HARD (3-4 faults) ──
    { id: 'fix-acl-lockout', title: 'Locked Out by Security', difficulty: 'Hard', objective: '5.4', duration: '15 min',
      description: 'A firewall ACL is blocking legitimate traffic, a VLAN is wrong, and a port is disabled.',
      faultIds: ['acl-blocks-traffic', 'wrong-vlan', 'port-disabled'],
      symptom: '🎫 Ticket #3001: "After the security audit changes, multiple departments lost access. The firewall, switch, and one workstation all seem affected."',
      autoSetup: (state) => {
        const fw = { id: 'fx8_fw', type: 'firewall', x: 700, y: 100, hostname: 'FW-Main', interfaces: [{name:'eth0',cableId:'fx8_c1',ip:'10.0.0.1',mask:'255.255.255.0',mac:'ab:00:00:01:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw = { id: 'fx8_sw1', type: 'switch', x: 700, y: 300, hostname: 'SW-Core', interfaces: [{name:'Fa0/0',cableId:'fx8_c1',ip:'',mask:'',mac:'ab:00:00:02:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx8_c2',ip:'',mask:'',mac:'ab:00:00:02:00:02',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx8_c3',ip:'',mask:'',mac:'ab:00:00:02:00:03',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/3',cableId:'fx8_c4',ip:'',mask:'',mac:'ab:00:00:02:00:04',vlan:20,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'},{id:10,name:'Staff'},{id:20,name:'Guest'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx8_pc1', type: 'pc', x: 400, y: 500, hostname: 'PC-Staff1', interfaces: [{name:'eth0',cableId:'fx8_c2',ip:'10.0.0.10',mask:'255.255.255.0',mac:'ab:00:00:03:00:01',vlan:10,mode:'access',gateway:'10.0.0.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx8_pc2', type: 'pc', x: 700, y: 500, hostname: 'PC-Staff2', interfaces: [{name:'eth0',cableId:'fx8_c3',ip:'10.0.0.20',mask:'255.255.255.0',mac:'ab:00:00:03:00:02',vlan:10,mode:'access',gateway:'10.0.0.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc3 = { id: 'fx8_pc3', type: 'pc', x: 1000, y: 500, hostname: 'PC-Guest', interfaces: [{name:'eth0',cableId:'fx8_c4',ip:'10.0.0.30',mask:'255.255.255.0',mac:'ab:00:00:03:00:03',vlan:20,mode:'access',gateway:'10.0.0.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(fw, sw, pc1, pc2, pc3);
        state.cables.push({ id:'fx8_c1',from:'fx8_fw',to:'fx8_sw1',type:'cat6'}, { id:'fx8_c2',from:'fx8_pc1',to:'fx8_sw1',type:'cat6'}, { id:'fx8_c3',from:'fx8_pc2',to:'fx8_sw1',type:'cat6'}, { id:'fx8_c4',from:'fx8_pc3',to:'fx8_sw1',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'acl-blocks-traffic', deviceId: 'fx8_fw' },
        { faultId: 'wrong-vlan', deviceId: 'fx8_sw1', ifaceIdx: 2 },
        { faultId: 'port-disabled', deviceId: 'fx8_pc2', ifaceIdx: 0 },
      ],
      hints: { 'acl-blocks-traffic': ['Check the firewall ACL rules. Is there a deny-all rule?', 'A deny ip 0.0.0.0/0 → 0.0.0.0/0 blocks ALL traffic. Remove it.'], 'wrong-vlan': ['PC-Staff2\'s switch port — is it on the correct VLAN?', 'Staff devices should be on VLAN 10, not VLAN 99.'], 'port-disabled': ['PC-Staff2 has no link light. Is the interface enabled?', 'Check the Interfaces tab — the port may be administratively shut down.'] },
    },
    // ── MEDIUM (continued) ──
    { id: 'fix-dns', title: 'DNS Nightmare', difficulty: 'Medium', objective: '5.3', duration: '10 min',
      description: 'A DNS server has a missing IP and a PC has the wrong gateway — name resolution is broken across the network.',
      faultIds: ['wrong-gateway', 'missing-ip'],
      symptom: '🎫 Ticket #2100: "Users can\'t reach any websites by name. DNS is supposed to be internal but nothing resolves."',
      autoSetup: (state) => {
        const r = { id: 'fx9_r1', type: 'router', x: 700, y: 100, hostname: 'R-GW', interfaces: [{name:'Gi0/0',cableId:'fx9_c1',ip:'192.168.50.1',mask:'255.255.255.0',mac:'a1:00:00:01:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw = { id: 'fx9_sw1', type: 'switch', x: 700, y: 300, hostname: 'SW1', interfaces: [{name:'Fa0/0',cableId:'fx9_c1',ip:'',mask:'',mac:'a1:00:00:02:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx9_c2',ip:'',mask:'',mac:'a1:00:00:02:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx9_c3',ip:'',mask:'',mac:'a1:00:00:02:00:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/3',cableId:'fx9_c4',ip:'',mask:'',mac:'a1:00:00:02:00:04',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const dns = { id: 'fx9_dns', type: 'dns-server', x: 400, y: 500, hostname: 'DNS-Server', interfaces: [{name:'eth0',cableId:'fx9_c2',ip:'192.168.50.10',mask:'255.255.255.0',mac:'a1:00:00:03:00:01',vlan:1,mode:'access',gateway:'192.168.50.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx9_pc1', type: 'pc', x: 700, y: 500, hostname: 'PC-User1', interfaces: [{name:'eth0',cableId:'fx9_c3',ip:'192.168.50.20',mask:'255.255.255.0',mac:'a1:00:00:04:00:01',vlan:1,mode:'access',gateway:'192.168.50.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx9_pc2', type: 'pc', x: 1000, y: 500, hostname: 'PC-User2', interfaces: [{name:'eth0',cableId:'fx9_c4',ip:'192.168.50.30',mask:'255.255.255.0',mac:'a1:00:00:04:00:02',vlan:1,mode:'access',gateway:'192.168.50.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r, sw, dns, pc1, pc2);
        state.cables.push({ id:'fx9_c1',from:'fx9_r1',to:'fx9_sw1',type:'cat6'}, { id:'fx9_c2',from:'fx9_dns',to:'fx9_sw1',type:'cat6'}, { id:'fx9_c3',from:'fx9_pc1',to:'fx9_sw1',type:'cat6'}, { id:'fx9_c4',from:'fx9_pc2',to:'fx9_sw1',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'wrong-gateway', deviceId: 'fx9_pc2', ifaceIdx: 0 },
        { faultId: 'missing-ip', deviceId: 'fx9_dns', ifaceIdx: 0 },
      ],
      hints: { 'wrong-gateway': ['PC-User2 can ping on the local subnet but not reach external resources. What setting routes traffic out?', 'Verify PC-User2\'s default gateway — it should point to R-GW at 192.168.50.1.'], 'missing-ip': ['The DNS server has no IP configured. How will clients resolve names without reaching it?', 'Configure DNS-Server\'s eth0 with 192.168.50.10 / 255.255.255.0 so clients can send queries to it.'] },
    },
    { id: 'fix-dhcp', title: 'DHCP Disaster', difficulty: 'Medium', objective: '5.3', duration: '10 min',
      description: 'The DHCP server hands out addresses from the wrong pool, and a trunk port is set to access mode — clients get bad IPs and inter-VLAN traffic is dropped.',
      faultIds: ['dhcp-wrong-pool', 'trunk-not-set'],
      symptom: '🎫 Ticket #2150: "PCs that used to auto-configure are getting 192.168.99.x addresses instead of the expected range and can\'t reach the internet."',
      autoSetup: (state) => {
        const r = { id: 'fx10_r1', type: 'router', x: 700, y: 100, hostname: 'R-DHCP', interfaces: [{name:'Gi0/0',cableId:'fx10_c1',ip:'192.168.10.1',mask:'255.255.255.0',mac:'a2:00:00:01:00:01',vlan:1,mode:'trunk',gateway:'',enabled:true,trunkAllowed:'1,10',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'},{id:10,name:'Clients'}],dhcpServer:{ poolStart:'192.168.10.100', poolEnd:'192.168.10.200', mask:'255.255.255.0', gateway:'192.168.10.1', dns:'192.168.10.1' },dhcpRelay:null,acls:[] };
        const sw = { id: 'fx10_sw1', type: 'switch', x: 700, y: 300, hostname: 'SW-Main', interfaces: [{name:'Fa0/0',cableId:'fx10_c1',ip:'',mask:'',mac:'a2:00:00:02:00:01',vlan:1,mode:'trunk',gateway:'',enabled:true,trunkAllowed:'1,10',subInterfaces:[]},{name:'Fa0/1',cableId:'fx10_c2',ip:'',mask:'',mac:'a2:00:00:02:00:02',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx10_c3',ip:'',mask:'',mac:'a2:00:00:02:00:03',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/3',cableId:'fx10_c4',ip:'',mask:'',mac:'a2:00:00:02:00:04',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'},{id:10,name:'Clients'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx10_pc1', type: 'pc', x: 400, y: 500, hostname: 'PC-Client1', interfaces: [{name:'eth0',cableId:'fx10_c2',ip:'192.168.10.10',mask:'255.255.255.0',mac:'a2:00:00:03:00:01',vlan:10,mode:'access',gateway:'192.168.10.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx10_pc2', type: 'pc', x: 700, y: 500, hostname: 'PC-Client2', interfaces: [{name:'eth0',cableId:'fx10_c3',ip:'192.168.10.20',mask:'255.255.255.0',mac:'a2:00:00:03:00:02',vlan:10,mode:'access',gateway:'192.168.10.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc3 = { id: 'fx10_pc3', type: 'pc', x: 1000, y: 500, hostname: 'PC-Client3', interfaces: [{name:'eth0',cableId:'fx10_c4',ip:'192.168.10.30',mask:'255.255.255.0',mac:'a2:00:00:03:00:03',vlan:10,mode:'access',gateway:'192.168.10.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r, sw, pc1, pc2, pc3);
        state.cables.push({ id:'fx10_c1',from:'fx10_r1',to:'fx10_sw1',type:'cat6'}, { id:'fx10_c2',from:'fx10_pc1',to:'fx10_sw1',type:'cat6'}, { id:'fx10_c3',from:'fx10_pc2',to:'fx10_sw1',type:'cat6'}, { id:'fx10_c4',from:'fx10_pc3',to:'fx10_sw1',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'dhcp-wrong-pool', deviceId: 'fx10_r1' },
        { faultId: 'trunk-not-set', deviceId: 'fx10_sw1', ifaceIdx: 0 },
      ],
      hints: { 'dhcp-wrong-pool': ['Double-click R-DHCP and check the DHCP tab. What pool start address is configured?', 'The DHCP pool should start at 192.168.10.100 — not an address on the wrong subnet.'], 'trunk-not-set': ['The router uplink carries VLAN 10 traffic. What port mode supports multiple VLANs?', 'SW-Main\'s Fa0/0 uplink must be set to trunk mode so VLAN 10 frames can reach the router.'] },
    },
    { id: 'fix-trunk-trouble', title: 'Trunk Trouble', difficulty: 'Medium', objective: '5.3', duration: '12 min',
      description: 'Inter-VLAN routing is broken: a trunk is missing a VLAN, a PC is on the wrong VLAN, and a static route is missing on the router.',
      faultIds: ['trunk-missing-vlan', 'wrong-vlan', 'missing-route'],
      symptom: '🎫 Ticket #2200: "The Engineering team can reach HR but HR cannot reach Engineering, and nobody can reach the server in VLAN 30."',
      autoSetup: (state) => {
        const r = { id: 'fx11_r1', type: 'router', x: 700, y: 80, hostname: 'R-Core', interfaces: [{name:'Gi0/0',cableId:'fx11_c1',ip:'192.168.1.1',mask:'255.255.255.0',mac:'a3:00:00:01:00:01',vlan:1,mode:'trunk',gateway:'',enabled:true,trunkAllowed:'1,10,20,30',subInterfaces:[]}], routingTable:[{network:'192.168.30.0',mask:'255.255.255.0',nextHop:'192.168.1.2',iface:'Gi0/0'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'},{id:10,name:'Engineering'},{id:20,name:'HR'},{id:30,name:'Servers'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw1 = { id: 'fx11_sw1', type: 'switch', x: 400, y: 280, hostname: 'SW-Left', interfaces: [{name:'Fa0/0',cableId:'fx11_c1',ip:'',mask:'',mac:'a3:00:00:02:00:01',vlan:1,mode:'trunk',gateway:'',enabled:true,trunkAllowed:'1,10,20,30',subInterfaces:[]},{name:'Fa0/1',cableId:'fx11_c2',ip:'',mask:'',mac:'a3:00:00:02:00:02',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx11_c3',ip:'',mask:'',mac:'a3:00:00:02:00:03',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/3',cableId:'fx11_c5',ip:'',mask:'',mac:'a3:00:00:02:00:04',vlan:1,mode:'trunk',gateway:'',enabled:true,trunkAllowed:'1,10,20,30',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'},{id:10,name:'Engineering'},{id:20,name:'HR'},{id:30,name:'Servers'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw2 = { id: 'fx11_sw2', type: 'switch', x: 1000, y: 280, hostname: 'SW-Right', interfaces: [{name:'Fa0/0',cableId:'fx11_c4',ip:'',mask:'',mac:'a3:00:00:03:00:01',vlan:1,mode:'trunk',gateway:'',enabled:true,trunkAllowed:'1,10,20',subInterfaces:[]},{name:'Fa0/1',cableId:'fx11_c6',ip:'',mask:'',mac:'a3:00:00:03:00:02',vlan:20,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx11_c7',ip:'',mask:'',mac:'a3:00:00:03:00:03',vlan:20,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/3',cableId:'fx11_c5',ip:'',mask:'',mac:'a3:00:00:03:00:04',vlan:1,mode:'trunk',gateway:'',enabled:true,trunkAllowed:'1,10,20,30',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'},{id:10,name:'Engineering'},{id:20,name:'HR'},{id:30,name:'Servers'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx11_pc1', type: 'pc', x: 200, y: 480, hostname: 'PC-Eng1', interfaces: [{name:'eth0',cableId:'fx11_c2',ip:'192.168.10.10',mask:'255.255.255.0',mac:'a3:00:00:04:00:01',vlan:10,mode:'access',gateway:'192.168.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx11_pc2', type: 'pc', x: 500, y: 480, hostname: 'PC-Eng2', interfaces: [{name:'eth0',cableId:'fx11_c3',ip:'192.168.10.20',mask:'255.255.255.0',mac:'a3:00:00:04:00:02',vlan:10,mode:'access',gateway:'192.168.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc3 = { id: 'fx11_pc3', type: 'pc', x: 900, y: 480, hostname: 'PC-HR1', interfaces: [{name:'eth0',cableId:'fx11_c6',ip:'192.168.20.10',mask:'255.255.255.0',mac:'a3:00:00:05:00:01',vlan:20,mode:'access',gateway:'192.168.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc4 = { id: 'fx11_pc4', type: 'pc', x: 1200, y: 480, hostname: 'PC-HR2', interfaces: [{name:'eth0',cableId:'fx11_c7',ip:'192.168.20.20',mask:'255.255.255.0',mac:'a3:00:00:05:00:02',vlan:20,mode:'access',gateway:'192.168.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r, sw1, sw2, pc1, pc2, pc3, pc4);
        state.cables.push({ id:'fx11_c1',from:'fx11_r1',to:'fx11_sw1',type:'cat6'}, { id:'fx11_c2',from:'fx11_pc1',to:'fx11_sw1',type:'cat6'}, { id:'fx11_c3',from:'fx11_pc2',to:'fx11_sw1',type:'cat6'}, { id:'fx11_c4',from:'fx11_r1',to:'fx11_sw2',type:'cat6'}, { id:'fx11_c5',from:'fx11_sw1',to:'fx11_sw2',type:'fiber'}, { id:'fx11_c6',from:'fx11_pc3',to:'fx11_sw2',type:'cat6'}, { id:'fx11_c7',from:'fx11_pc4',to:'fx11_sw2',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'trunk-missing-vlan', deviceId: 'fx11_sw2', ifaceIdx: 0 },
        { faultId: 'wrong-vlan', deviceId: 'fx11_sw2', ifaceIdx: 1 },
        { faultId: 'missing-route', deviceId: 'fx11_r1' },
      ],
      hints: { 'trunk-missing-vlan': ['SW-Right\'s uplink to the router only allows certain VLANs. Is VLAN 30 included?', 'Edit SW-Right Fa0/0 trunkAllowed to include 1,10,20,30 so VLAN 30 can traverse the trunk.'], 'wrong-vlan': ['PC-HR1 is on which VLAN? Does that match HR\'s expected VLAN (20)?', 'Check SW-Right Fa0/1 — the port for PC-HR1 should be VLAN 20, not 99.'], 'missing-route': ['R-Core has routes for VLAN 10 and 20. Does it have a route for the 192.168.30.0/24 server subnet?', 'Add a static route to 192.168.30.0/24 via next-hop 192.168.1.2 on R-Core.'] },
    },
    // ── HARD (continued) ──
    { id: 'fix-ospf', title: 'OSPF Outage', difficulty: 'Hard', objective: '5.4', duration: '15 min',
      description: 'A multi-router OSPF network is broken: one router has a wrong subnet on its interface, a static route is missing, and a port is disabled.',
      faultIds: ['wrong-subnet', 'missing-route', 'port-disabled'],
      symptom: '🎫 Ticket #3050: "After the network expansion, two of our four office subnets became unreachable. Routers were reconfigured last night."',
      autoSetup: (state) => {
        const r1 = { id: 'fx12_r1', type: 'router', x: 700, y: 100, hostname: 'R-North', interfaces: [{name:'Gi0/0',cableId:'fx12_c1',ip:'10.1.0.1',mask:'255.255.255.0',mac:'b1:00:00:01:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx12_c4',ip:'10.0.12.1',mask:'255.255.255.252',mac:'b1:00:00:01:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/2',cableId:'fx12_c5',ip:'10.0.13.1',mask:'255.255.255.252',mac:'b1:00:00:01:00:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'10.2.0.0',mask:'255.255.255.0',nextHop:'10.0.12.2',iface:'Gi0/1'},{network:'10.3.0.0',mask:'255.255.255.0',nextHop:'10.0.13.2',iface:'Gi0/2'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const r2 = { id: 'fx12_r2', type: 'router', x: 300, y: 400, hostname: 'R-West', interfaces: [{name:'Gi0/0',cableId:'fx12_c2',ip:'10.2.0.1',mask:'255.255.255.0',mac:'b1:00:00:02:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx12_c4',ip:'10.0.12.2',mask:'255.255.255.252',mac:'b1:00:00:02:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/2',cableId:'fx12_c6',ip:'10.0.23.1',mask:'255.255.255.252',mac:'b1:00:00:02:00:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'10.1.0.0',mask:'255.255.255.0',nextHop:'10.0.12.1',iface:'Gi0/1'},{network:'10.3.0.0',mask:'255.255.255.0',nextHop:'10.0.23.2',iface:'Gi0/2'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const r3 = { id: 'fx12_r3', type: 'router', x: 1100, y: 400, hostname: 'R-East', interfaces: [{name:'Gi0/0',cableId:'fx12_c3',ip:'10.3.0.1',mask:'255.255.255.0',mac:'b1:00:00:03:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx12_c5',ip:'10.0.13.2',mask:'255.255.255.252',mac:'b1:00:00:03:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/2',cableId:'fx12_c6',ip:'10.0.23.2',mask:'255.255.255.252',mac:'b1:00:00:03:00:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'10.1.0.0',mask:'255.255.255.0',nextHop:'10.0.13.1',iface:'Gi0/1'},{network:'10.2.0.0',mask:'255.255.255.0',nextHop:'10.0.23.1',iface:'Gi0/2'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw1 = { id: 'fx12_sw1', type: 'switch', x: 300, y: 600, hostname: 'SW-West', interfaces: [{name:'Fa0/0',cableId:'fx12_c2',ip:'',mask:'',mac:'b1:00:00:04:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx12_c7',ip:'',mask:'',mac:'b1:00:00:04:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx12_c8',ip:'',mask:'',mac:'b1:00:00:04:00:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw2 = { id: 'fx12_sw2', type: 'switch', x: 1100, y: 600, hostname: 'SW-East', interfaces: [{name:'Fa0/0',cableId:'fx12_c3',ip:'',mask:'',mac:'b1:00:00:05:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx12_c9',ip:'',mask:'',mac:'b1:00:00:05:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx12_c10',ip:'',mask:'',mac:'b1:00:00:05:00:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx12_pc1', type: 'pc', x: 100, y: 750, hostname: 'PC-West1', interfaces: [{name:'eth0',cableId:'fx12_c7',ip:'10.2.0.10',mask:'255.255.255.0',mac:'b1:00:00:06:00:01',vlan:1,mode:'access',gateway:'10.2.0.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx12_pc2', type: 'pc', x: 400, y: 750, hostname: 'PC-West2', interfaces: [{name:'eth0',cableId:'fx12_c8',ip:'10.2.0.20',mask:'255.255.255.0',mac:'b1:00:00:06:00:02',vlan:1,mode:'access',gateway:'10.2.0.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc3 = { id: 'fx12_pc3', type: 'pc', x: 900, y: 750, hostname: 'PC-East1', interfaces: [{name:'eth0',cableId:'fx12_c9',ip:'10.3.0.10',mask:'255.255.255.0',mac:'b1:00:00:07:00:01',vlan:1,mode:'access',gateway:'10.3.0.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc4 = { id: 'fx12_pc4', type: 'pc', x: 1200, y: 750, hostname: 'PC-East2', interfaces: [{name:'eth0',cableId:'fx12_c10',ip:'10.3.0.20',mask:'255.255.255.0',mac:'b1:00:00:07:00:02',vlan:1,mode:'access',gateway:'10.3.0.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r1, r2, r3, sw1, sw2, pc1, pc2, pc3, pc4);
        state.cables.push({ id:'fx12_c1',from:'fx12_r1',to:'fx12_sw1',type:'fiber'}, { id:'fx12_c2',from:'fx12_r2',to:'fx12_sw1',type:'cat6'}, { id:'fx12_c3',from:'fx12_r3',to:'fx12_sw2',type:'cat6'}, { id:'fx12_c4',from:'fx12_r1',to:'fx12_r2',type:'fiber'}, { id:'fx12_c5',from:'fx12_r1',to:'fx12_r3',type:'fiber'}, { id:'fx12_c6',from:'fx12_r2',to:'fx12_r3',type:'fiber'}, { id:'fx12_c7',from:'fx12_pc1',to:'fx12_sw1',type:'cat6'}, { id:'fx12_c8',from:'fx12_pc2',to:'fx12_sw1',type:'cat6'}, { id:'fx12_c9',from:'fx12_pc3',to:'fx12_sw2',type:'cat6'}, { id:'fx12_c10',from:'fx12_pc4',to:'fx12_sw2',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'wrong-subnet', deviceId: 'fx12_r2', ifaceIdx: 0 },
        { faultId: 'missing-route', deviceId: 'fx12_r3' },
        { faultId: 'port-disabled', deviceId: 'fx12_r1', ifaceIdx: 2 },
      ],
      hints: { 'wrong-subnet': ['R-West\'s LAN interface IP — is it in the correct 10.2.0.x subnet?', 'The IP on R-West Gi0/0 has been shifted to the wrong /8 octet. Correct it back to 10.2.0.1.'], 'missing-route': ['R-East can reach 10.1.0.0/24 and 10.2.0.0/24. What about 10.3.0.0/24 from other routers?', 'Check R-East\'s routing table — it is missing a return route. Add routes so all subnets are reachable.'], 'port-disabled': ['R-North\'s Gi0/2 interface connects to R-East. Is it up?', 'Enable Gi0/2 on R-North in the Interfaces tab — it was administratively shut down during maintenance.'] },
    },
    { id: 'fix-vpn', title: 'VPN Meltdown', difficulty: 'Hard', objective: '5.4', duration: '15 min',
      description: 'A site-to-site VPN is down: encryption algorithms don\'t match, the pre-shared key is wrong, and a PC has the wrong gateway.',
      faultIds: ['vpn-crypto-mismatch', 'vpn-wrong-psk', 'wrong-gateway'],
      symptom: '🎫 Ticket #3100: "Remote site users cannot access HQ resources. VPN was working before the router firmware update last weekend."',
      autoSetup: (state) => {
        const r1 = { id: 'fx13_r1', type: 'router', x: 350, y: 200, hostname: 'R-HQ', interfaces: [{name:'Gi0/0',cableId:'fx13_c1',ip:'192.168.1.1',mask:'255.255.255.0',mac:'c1:00:00:01:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx13_c3',ip:'203.0.113.1',mask:'255.255.255.252',mac:'c1:00:00:01:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'10.10.10.0',mask:'255.255.255.0',nextHop:'203.0.113.2',iface:'Gi0/1'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[], vpnConfig:{ peerIp:'203.0.113.2', psk:'Secr3tK3y!', encryption:'aes-256', hash:'sha-256', ikeVersion:'2', dhGroup:'14', localSubnet:'192.168.1.0/24', remoteSubnet:'10.10.10.0/24', status:'down' } };
        const r2 = { id: 'fx13_r2', type: 'router', x: 1050, y: 200, hostname: 'R-Remote', interfaces: [{name:'Gi0/0',cableId:'fx13_c2',ip:'10.10.10.1',mask:'255.255.255.0',mac:'c1:00:00:02:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx13_c3',ip:'203.0.113.2',mask:'255.255.255.252',mac:'c1:00:00:02:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'192.168.1.0',mask:'255.255.255.0',nextHop:'203.0.113.1',iface:'Gi0/1'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[], vpnConfig:{ peerIp:'203.0.113.1', psk:'Secr3tK3y!', encryption:'aes-256', hash:'sha-256', ikeVersion:'2', dhGroup:'14', localSubnet:'10.10.10.0/24', remoteSubnet:'192.168.1.0/24', status:'down' } };
        const sw1 = { id: 'fx13_sw1', type: 'switch', x: 350, y: 400, hostname: 'SW-HQ', interfaces: [{name:'Fa0/0',cableId:'fx13_c1',ip:'',mask:'',mac:'c1:00:00:03:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx13_c4',ip:'',mask:'',mac:'c1:00:00:03:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw2 = { id: 'fx13_sw2', type: 'switch', x: 1050, y: 400, hostname: 'SW-Remote', interfaces: [{name:'Fa0/0',cableId:'fx13_c2',ip:'',mask:'',mac:'c1:00:00:04:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx13_c5',ip:'',mask:'',mac:'c1:00:00:04:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const cloud = { id: 'fx13_cloud', type: 'cloud', x: 700, y: 200, hostname: 'Internet', interfaces: [{name:'wan0',cableId:'fx13_c3',ip:'',mask:'',mac:'c1:00:00:05:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx13_pc1', type: 'pc', x: 350, y: 580, hostname: 'PC-HQ', interfaces: [{name:'eth0',cableId:'fx13_c4',ip:'192.168.1.10',mask:'255.255.255.0',mac:'c1:00:00:06:00:01',vlan:1,mode:'access',gateway:'192.168.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx13_pc2', type: 'pc', x: 1050, y: 580, hostname: 'PC-Remote', interfaces: [{name:'eth0',cableId:'fx13_c5',ip:'10.10.10.10',mask:'255.255.255.0',mac:'c1:00:00:06:00:02',vlan:1,mode:'access',gateway:'10.10.10.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r1, r2, sw1, sw2, cloud, pc1, pc2);
        state.cables.push({ id:'fx13_c1',from:'fx13_r1',to:'fx13_sw1',type:'cat6'}, { id:'fx13_c2',from:'fx13_r2',to:'fx13_sw2',type:'cat6'}, { id:'fx13_c3',from:'fx13_r1',to:'fx13_r2',type:'fiber'}, { id:'fx13_c4',from:'fx13_pc1',to:'fx13_sw1',type:'cat6'}, { id:'fx13_c5',from:'fx13_pc2',to:'fx13_sw2',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'vpn-crypto-mismatch', deviceId: 'fx13_r1' },
        { faultId: 'vpn-wrong-psk', deviceId: 'fx13_r2' },
        { faultId: 'wrong-gateway', deviceId: 'fx13_pc1', ifaceIdx: 0 },
      ],
      hints: { 'vpn-crypto-mismatch': ['VPN tunnels require both peers to use the same encryption algorithm. Check R-HQ\'s VPN/IPSec tab.', 'R-HQ\'s encryption was changed to 3DES after the firmware update. Set it back to AES-256 to match R-Remote.'], 'vpn-wrong-psk': ['Both VPN endpoints must share the exact same pre-shared key. Check R-Remote\'s PSK.', 'R-Remote\'s PSK was reset to a default during the update. Correct it to match R-HQ\'s key.'], 'wrong-gateway': ['PC-HQ can ping locally but not reach the remote site. What routes traffic to the VPN?', 'PC-HQ\'s default gateway was changed and now points to the wrong IP. Fix it to 192.168.1.1.'] },
    },
    { id: 'fix-bgp', title: 'BGP Blackout', difficulty: 'Hard', objective: '5.4', duration: '15 min',
      description: 'A multi-site BGP network has a wrong next-hop, an ACL blocking traffic, and a missing IP on a branch router.',
      faultIds: ['wrong-next-hop', 'acl-blocks-traffic', 'missing-ip'],
      symptom: '🎫 Ticket #3150: "Branch A can reach the ISP but not Branch B. Branch B\'s router also lost its peering session after the config push."',
      autoSetup: (state) => {
        const isp = { id: 'fx14_isp', type: 'router', x: 700, y: 150, hostname: 'R-ISP', interfaces: [{name:'Gi0/0',cableId:'fx14_c1',ip:'198.51.100.1',mask:'255.255.255.252',mac:'d1:00:00:01:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx14_c2',ip:'198.51.100.5',mask:'255.255.255.252',mac:'d1:00:00:01:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'10.1.1.0',mask:'255.255.255.0',nextHop:'198.51.100.2',iface:'Gi0/0'},{network:'10.2.2.0',mask:'255.255.255.0',nextHop:'198.51.100.6',iface:'Gi0/1'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const r1 = { id: 'fx14_r1', type: 'router', x: 300, y: 400, hostname: 'R-BranchA', interfaces: [{name:'Gi0/0',cableId:'fx14_c3',ip:'10.1.1.1',mask:'255.255.255.0',mac:'d1:00:00:02:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx14_c1',ip:'198.51.100.2',mask:'255.255.255.252',mac:'d1:00:00:02:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'10.2.2.0',mask:'255.255.255.0',nextHop:'198.51.100.1',iface:'Gi0/1'},{network:'0.0.0.0',mask:'0.0.0.0',nextHop:'198.51.100.1',iface:'Gi0/1'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const r2 = { id: 'fx14_r2', type: 'router', x: 1100, y: 400, hostname: 'R-BranchB', interfaces: [{name:'Gi0/0',cableId:'fx14_c4',ip:'10.2.2.1',mask:'255.255.255.0',mac:'d1:00:00:03:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx14_c2',ip:'198.51.100.6',mask:'255.255.255.252',mac:'d1:00:00:03:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'10.1.1.0',mask:'255.255.255.0',nextHop:'198.51.100.5',iface:'Gi0/1'},{network:'0.0.0.0',mask:'0.0.0.0',nextHop:'198.51.100.5',iface:'Gi0/1'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw1 = { id: 'fx14_sw1', type: 'switch', x: 300, y: 600, hostname: 'SW-BranchA', interfaces: [{name:'Fa0/0',cableId:'fx14_c3',ip:'',mask:'',mac:'d1:00:00:04:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx14_c5',ip:'',mask:'',mac:'d1:00:00:04:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx14_c6',ip:'',mask:'',mac:'d1:00:00:04:00:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw2 = { id: 'fx14_sw2', type: 'switch', x: 1100, y: 600, hostname: 'SW-BranchB', interfaces: [{name:'Fa0/0',cableId:'fx14_c4',ip:'',mask:'',mac:'d1:00:00:05:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/1',cableId:'fx14_c7',ip:'',mask:'',mac:'d1:00:00:05:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx14_c8',ip:'',mask:'',mac:'d1:00:00:05:00:03',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx14_pc1', type: 'pc', x: 150, y: 750, hostname: 'PC-A1', interfaces: [{name:'eth0',cableId:'fx14_c5',ip:'10.1.1.10',mask:'255.255.255.0',mac:'d1:00:00:06:00:01',vlan:1,mode:'access',gateway:'10.1.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx14_pc2', type: 'pc', x: 400, y: 750, hostname: 'PC-A2', interfaces: [{name:'eth0',cableId:'fx14_c6',ip:'10.1.1.20',mask:'255.255.255.0',mac:'d1:00:00:06:00:02',vlan:1,mode:'access',gateway:'10.1.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc3 = { id: 'fx14_pc3', type: 'pc', x: 950, y: 750, hostname: 'PC-B1', interfaces: [{name:'eth0',cableId:'fx14_c7',ip:'10.2.2.10',mask:'255.255.255.0',mac:'d1:00:00:07:00:01',vlan:1,mode:'access',gateway:'10.2.2.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc4 = { id: 'fx14_pc4', type: 'pc', x: 1200, y: 750, hostname: 'PC-B2', interfaces: [{name:'eth0',cableId:'fx14_c8',ip:'10.2.2.20',mask:'255.255.255.0',mac:'d1:00:00:07:00:02',vlan:1,mode:'access',gateway:'10.2.2.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(isp, r1, r2, sw1, sw2, pc1, pc2, pc3, pc4);
        state.cables.push({ id:'fx14_c1',from:'fx14_isp',to:'fx14_r1',type:'fiber'}, { id:'fx14_c2',from:'fx14_isp',to:'fx14_r2',type:'fiber'}, { id:'fx14_c3',from:'fx14_r1',to:'fx14_sw1',type:'cat6'}, { id:'fx14_c4',from:'fx14_r2',to:'fx14_sw2',type:'cat6'}, { id:'fx14_c5',from:'fx14_pc1',to:'fx14_sw1',type:'cat6'}, { id:'fx14_c6',from:'fx14_pc2',to:'fx14_sw1',type:'cat6'}, { id:'fx14_c7',from:'fx14_pc3',to:'fx14_sw2',type:'cat6'}, { id:'fx14_c8',from:'fx14_pc4',to:'fx14_sw2',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'wrong-next-hop', deviceId: 'fx14_r1' },
        { faultId: 'acl-blocks-traffic', deviceId: 'fx14_r2' },
        { faultId: 'missing-ip', deviceId: 'fx14_r2', ifaceIdx: 0 },
      ],
      hints: { 'wrong-next-hop': ['R-BranchA has a route to 10.2.2.0/24. Is the next-hop pointing to the ISP?', 'The next-hop on R-BranchA\'s route to Branch B should be 198.51.100.1 (R-ISP Gi0/0).'], 'acl-blocks-traffic': ['R-BranchB was hardened during the config push. Check its ACL list for an overly broad deny rule.', 'A deny-all ACL entry on R-BranchB is blocking all inbound and outbound traffic. Remove it.'], 'missing-ip': ['R-BranchB\'s LAN interface — does it have an IP address configured?', 'Gi0/0 on R-BranchB is missing its IP. Set it to 10.2.2.1 / 255.255.255.0.'] },
    },
    { id: 'fix-perfect-storm', title: 'The Perfect Storm', difficulty: 'Hard', objective: '5.5', duration: '20 min',
      description: 'Everything is broken at once: a wrong subnet, a port on the wrong VLAN, a disabled interface, and a wrong gateway — all in one network.',
      faultIds: ['wrong-subnet', 'wrong-vlan', 'port-disabled', 'wrong-gateway'],
      symptom: '🎫 Ticket #3200 (Critical): "Complete network outage after weekend maintenance. Multiple teams report total loss of connectivity. Escalate immediately."',
      autoSetup: (state) => {
        const r1 = { id: 'fx15_r1', type: 'router', x: 350, y: 150, hostname: 'R-Site1', interfaces: [{name:'Gi0/0',cableId:'fx15_c1',ip:'172.16.1.1',mask:'255.255.255.0',mac:'e1:00:00:01:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx15_c5',ip:'172.16.0.1',mask:'255.255.255.252',mac:'e1:00:00:01:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'172.16.2.0',mask:'255.255.255.0',nextHop:'172.16.0.2',iface:'Gi0/1'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'},{id:10,name:'Staff'},{id:20,name:'Mgmt'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const r2 = { id: 'fx15_r2', type: 'router', x: 1050, y: 150, hostname: 'R-Site2', interfaces: [{name:'Gi0/0',cableId:'fx15_c2',ip:'172.16.2.1',mask:'255.255.255.0',mac:'e1:00:00:02:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Gi0/1',cableId:'fx15_c5',ip:'172.16.0.2',mask:'255.255.255.252',mac:'e1:00:00:02:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'172.16.1.0',mask:'255.255.255.0',nextHop:'172.16.0.1',iface:'Gi0/1'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'},{id:10,name:'Staff'},{id:20,name:'Mgmt'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const fw = { id: 'fx15_fw', type: 'firewall', x: 700, y: 150, hostname: 'FW-Core', interfaces: [{name:'eth0',cableId:'fx15_c5',ip:'172.16.0.3',mask:'255.255.255.252',mac:'e1:00:00:03:00:01',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'eth1',cableId:'fx15_c6',ip:'172.16.3.1',mask:'255.255.255.0',mac:'e1:00:00:03:00:02',vlan:1,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[{network:'172.16.1.0',mask:'255.255.255.0',nextHop:'172.16.0.1',iface:'eth0'},{network:'172.16.2.0',mask:'255.255.255.0',nextHop:'172.16.0.2',iface:'eth0'}],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw1 = { id: 'fx15_sw1', type: 'switch', x: 350, y: 380, hostname: 'SW-Site1', interfaces: [{name:'Fa0/0',cableId:'fx15_c1',ip:'',mask:'',mac:'e1:00:00:04:00:01',vlan:1,mode:'trunk',gateway:'',enabled:true,trunkAllowed:'1,10,20',subInterfaces:[]},{name:'Fa0/1',cableId:'fx15_c7',ip:'',mask:'',mac:'e1:00:00:04:00:02',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx15_c8',ip:'',mask:'',mac:'e1:00:00:04:00:03',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'},{id:10,name:'Staff'},{id:20,name:'Mgmt'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const sw2 = { id: 'fx15_sw2', type: 'switch', x: 1050, y: 380, hostname: 'SW-Site2', interfaces: [{name:'Fa0/0',cableId:'fx15_c2',ip:'',mask:'',mac:'e1:00:00:05:00:01',vlan:1,mode:'trunk',gateway:'',enabled:true,trunkAllowed:'1,10,20',subInterfaces:[]},{name:'Fa0/1',cableId:'fx15_c9',ip:'',mask:'',mac:'e1:00:00:05:00:02',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]},{name:'Fa0/2',cableId:'fx15_c10',ip:'',mask:'',mac:'e1:00:00:05:00:03',vlan:10,mode:'access',gateway:'',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[{id:1,name:'default'},{id:10,name:'Staff'},{id:20,name:'Mgmt'}],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc1 = { id: 'fx15_pc1', type: 'pc', x: 200, y: 570, hostname: 'PC-S1-A', interfaces: [{name:'eth0',cableId:'fx15_c7',ip:'172.16.1.10',mask:'255.255.255.0',mac:'e1:00:00:06:00:01',vlan:10,mode:'access',gateway:'172.16.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc2 = { id: 'fx15_pc2', type: 'pc', x: 450, y: 570, hostname: 'PC-S1-B', interfaces: [{name:'eth0',cableId:'fx15_c8',ip:'172.16.1.20',mask:'255.255.255.0',mac:'e1:00:00:06:00:02',vlan:10,mode:'access',gateway:'172.16.1.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc3 = { id: 'fx15_pc3', type: 'pc', x: 900, y: 570, hostname: 'PC-S2-A', interfaces: [{name:'eth0',cableId:'fx15_c9',ip:'172.16.2.10',mask:'255.255.255.0',mac:'e1:00:00:07:00:01',vlan:10,mode:'access',gateway:'172.16.2.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        const pc4 = { id: 'fx15_pc4', type: 'pc', x: 1150, y: 570, hostname: 'PC-S2-B', interfaces: [{name:'eth0',cableId:'fx15_c10',ip:'172.16.2.20',mask:'255.255.255.0',mac:'e1:00:00:07:00:02',vlan:10,mode:'access',gateway:'172.16.2.1',enabled:true,trunkAllowed:'',subInterfaces:[]}], routingTable:[],arpTable:[],macTable:[],vlanDb:[],dhcpServer:null,dhcpRelay:null,acls:[] };
        state.devices.push(r1, r2, fw, sw1, sw2, pc1, pc2, pc3, pc4);
        state.cables.push({ id:'fx15_c1',from:'fx15_r1',to:'fx15_sw1',type:'cat6'}, { id:'fx15_c2',from:'fx15_r2',to:'fx15_sw2',type:'cat6'}, { id:'fx15_c5',from:'fx15_r1',to:'fx15_r2',type:'fiber'}, { id:'fx15_c6',from:'fx15_fw',to:'fx15_sw1',type:'cat6'}, { id:'fx15_c7',from:'fx15_pc1',to:'fx15_sw1',type:'cat6'}, { id:'fx15_c8',from:'fx15_pc2',to:'fx15_sw1',type:'cat6'}, { id:'fx15_c9',from:'fx15_pc3',to:'fx15_sw2',type:'cat6'}, { id:'fx15_c10',from:'fx15_pc4',to:'fx15_sw2',type:'cat6'});
      },
      faultTargets: (state) => [
        { faultId: 'wrong-subnet', deviceId: 'fx15_r2', ifaceIdx: 0 },
        { faultId: 'wrong-vlan', deviceId: 'fx15_sw2', ifaceIdx: 1 },
        { faultId: 'port-disabled', deviceId: 'fx15_r1', ifaceIdx: 1 },
        { faultId: 'wrong-gateway', deviceId: 'fx15_pc4', ifaceIdx: 0 },
      ],
      hints: { 'wrong-subnet': ['R-Site2\'s LAN interface IP — is it in the correct 172.16.2.x subnet?', 'Check R-Site2 Gi0/0: its IP octet was shifted during maintenance. Correct it to 172.16.2.1.'], 'wrong-vlan': ['PC-S2-A connects to SW-Site2 Fa0/1. Is that port on the right VLAN for Staff (VLAN 10)?', 'SW-Site2 Fa0/1 was moved to VLAN 99 during the audit. Change it back to VLAN 10.'], 'port-disabled': ['R-Site1\'s WAN link (Gi0/1) connects to R-Site2. Is it showing as up?', 'Gi0/1 on R-Site1 was administratively shut down during maintenance. Re-enable it in the Interfaces tab.'], 'wrong-gateway': ['PC-S2-B can ping its local subnet but not reach Site 1. What IP should its gateway be?', 'PC-S2-B\'s gateway was changed to a non-existent IP. Set it back to 172.16.2.1 (R-Site2).'] },
    },
  ];
  
  // ── Fix Challenge Engine ──
  
  function tbOpenFixPicker() {
    const modal = document.getElementById('tb-fix-picker');
    const body = document.getElementById('tb-fix-picker-body');
    if (!modal || !body) return;
  
    const saved = JSON.parse(localStorage.getItem(STORAGE.FIX_CHALLENGES) || '{}');
    const tabs = ['Easy', 'Medium', 'Hard'];
    const _diffOrder = { Easy: 0, Medium: 1, Hard: 2 };
  
    let html = '<div class="tb-fix-tabs">';
    tabs.forEach(t => { html += `<button class="tb-fix-tab${t === 'Easy' ? ' tb-fix-tab-active' : ''}" onclick="tbFixFilterTab(this,'${t}')">${t}</button>`; });
    html += '</div><div id="tb-fix-cards">';
  
    const sorted = [...TB_FIX_CHALLENGES].sort((a, b) => (_diffOrder[a.difficulty] ?? 9) - (_diffOrder[b.difficulty] ?? 9));
    sorted.forEach(ch => {
      const s = saved[ch.id];
      const bestHtml = s ? `<span class="tb-fix-best">Best: ${s.bestScore} pts</span>` : '';
      const completedClass = s ? ' tb-fix-card-done' : '';
      html += `<div class="tb-fix-card${completedClass}" data-diff="${ch.difficulty}" ${ch.difficulty !== 'Easy' ? 'style="display:none"' : ''}>
        <div class="tb-fix-card-head">
          <strong>${escHtml(ch.title)}</strong>
          <span class="tb-fix-diff tb-fix-diff-${ch.difficulty.toLowerCase()}">${ch.difficulty}</span>
        </div>
        <div class="tb-fix-card-meta">Obj ${ch.objective} · ${ch.duration} · ${ch.faultIds.length} fault${ch.faultIds.length > 1 ? 's' : ''} ${bestHtml}</div>
        <div class="tb-fix-card-desc">${escHtml(ch.description)}</div>
        <button class="btn tb-fix-start-btn" onclick="tbStartFixChallenge('${ch.id}')">🔧 Start Challenge</button>
      </div>`;
    });
    html += '</div>';
    body.innerHTML = html;
    modal.classList.remove('is-hidden');
  }
  
  function tbFixFilterTab(btn, diff) {
    document.querySelectorAll('.tb-fix-tab').forEach(t => t.classList.remove('tb-fix-tab-active'));
    btn.classList.add('tb-fix-tab-active');
    document.querySelectorAll('.tb-fix-card').forEach(card => {
      card.style.display = card.dataset.diff === diff ? '' : 'none';
    });
  }
  
  function tbStartFixChallenge(id) {
    const ch = TB_FIX_CHALLENGES.find(c => c.id === id);
    if (!ch) return;
    document.getElementById('tb-fix-picker')?.classList.add('is-hidden');
    if (tbState.devices.length > 0 && !confirm('Starting a challenge will clear your current canvas. Continue?')) return;
    if (tbActiveLab) tbEndLab();
  
    // Build working topology
    tbState = tbNewState();
    tbState.name = ch.title;
    ch.autoSetup(tbState);
    tbMigrateState(tbState);
  
    // Snapshot correct values BEFORE injecting faults
    const targets = ch.faultTargets(tbState);
    const faults = [];
    for (const t of targets) {
      const dev = tbState.devices.find(d => d.id === t.deviceId);
      if (!dev) continue;
      const ifc = t.ifaceIdx !== undefined ? dev.interfaces?.[t.ifaceIdx] : dev.interfaces?.[0];
      const faultType = TB_FAULT_TYPES.find(f => f.id === t.faultId);
      if (!faultType) continue;
      // Deep snapshot of correct values
      const origIfc = ifc ? JSON.parse(JSON.stringify(ifc)) : {};
      const origDev = JSON.parse(JSON.stringify({ routingTable: dev.routingTable, dhcpServer: dev.dhcpServer, vpnConfig: dev.vpnConfig, wirelessConfig: dev.wirelessConfig, acls: dev.acls }));
      const orig = { ...origIfc, ...origDev };
      faults.push({ faultId: t.faultId, deviceId: t.deviceId, ifaceIdx: t.ifaceIdx, orig, fixed: false, hintsUsed: 0, fixedAt: null });
    }
  
    // Inject faults
    for (const f of faults) {
      const dev = tbState.devices.find(d => d.id === f.deviceId);
      if (!dev) continue;
      const ifc = f.ifaceIdx !== undefined ? dev.interfaces?.[f.ifaceIdx] : dev.interfaces?.[0];
      const faultType = TB_FAULT_TYPES.find(ft => ft.id === f.faultId);
      if (faultType) faultType.inject(dev, ifc, f.orig, tbState);
    }
  
    tbFixChallenge = {
      challengeId: id,
      faults,
      startTime: Date.now(),
      totalHintsUsed: 0,
      score: null,
      completed: false,
      _timerInterval: null,
    };
  
    tbRenderCanvas();
    tbUpdateDeviceCount();
    tbSaveDraft();
    tbRenderFixPanel();
    const fixPanel = document.getElementById('tb-fix-panel');
    if (fixPanel) {
      // Reset position for fresh challenge
      fixPanel.style.top = '';
      fixPanel.style.left = '';
      fixPanel.style.right = '';
      fixPanel.style.position = '';
      fixPanel.classList.remove('is-hidden');
    }
    tbInitFixPanelDrag();
  
    // Start timer
    tbFixChallenge._timerInterval = setInterval(() => {
      if (!tbFixChallenge || tbFixChallenge.completed) return;
      const el = document.getElementById('tb-fix-timer');
      if (el) {
        const elapsed = Math.floor((Date.now() - tbFixChallenge.startTime) / 1000);
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        el.textContent = `${m}:${String(s).padStart(2, '0')}`;
      }
    }, 1000);
  }
  
  function tbRenderFixPanel() {
    if (!tbFixChallenge) return;
    const ch = TB_FIX_CHALLENGES.find(c => c.id === tbFixChallenge.challengeId);
    if (!ch) return;
  
    const panel = document.getElementById('tb-fix-panel');
    if (!panel) return;
  
    const fixedCount = tbFixChallenge.faults.filter(f => f.fixed).length;
    const totalFaults = tbFixChallenge.faults.length;
    const pct = totalFaults > 0 ? Math.round((fixedCount / totalFaults) * 100) : 0;
  
    let faultsHtml = '';
    tbFixChallenge.faults.forEach((f, i) => {
      const fType = TB_FAULT_TYPES.find(ft => ft.id === f.faultId);
      const statusIcon = f.fixed ? '✅' : '❌';
      const statusClass = f.fixed ? 'tb-fix-fault-fixed' : 'tb-fix-fault-broken';
      const hintList = ch.hints?.[f.faultId] || [];
      const maxHints = hintList.length;
      const shownHints = Math.min(f.hintsUsed, maxHints);
  
      let hintHtml = '';
      for (let h = 0; h < shownHints; h++) {
        hintHtml += `<div class="tb-fix-hint-text">💡 ${escHtml(hintList[h])}</div>`;
      }
      if (!f.fixed && shownHints < maxHints) {
        const cost = shownHints === 0 ? '(free)' : '(-50 pts)';
        hintHtml += `<button class="btn btn-ghost tb-fix-hint-btn" onclick="tbShowFixHint(${i})">Show Hint ${cost}</button>`;
      }
  
      faultsHtml += `<div class="tb-fix-fault-row ${statusClass}" id="tb-fix-fault-${i}">
        <div class="tb-fix-fault-head"><span class="tb-fix-fault-icon">${statusIcon}</span> <span>${fType ? fType.label : f.faultId}</span> <span class="tb-fix-fault-obj">Obj ${fType?.domain || '5.3'}</span></div>
        <div class="tb-fix-hint-area">${hintHtml}</div>
      </div>`;
    });
  
    const symptomHtml = `<div class="tb-fix-symptom">${ch.symptom}</div>`;
    const progressHtml = `<div class="tb-fix-progress-wrap"><div class="tb-fix-progress-bar"><div class="tb-fix-progress-fill" style="width:${pct}%"></div></div><span class="tb-fix-progress-text">${fixedCount} / ${totalFaults} fixed</span></div>`;
    const toolsHtml = `<div class="tb-fix-tools">🔧 Use: <strong>CLI</strong> · <strong>Ping</strong> · <strong>Traceroute</strong> · <strong>ipconfig</strong> · <strong>show commands</strong> · <strong>Config panels</strong></div>`;
    const hasUnfixed = tbFixChallenge.faults.some(f => !f.fixed);
    const giveUpHtml = hasUnfixed && !tbFixChallenge.revealed
      ? `<button class="btn tb-fix-giveup-btn" onclick="tbRevealFixAnswers()">🏳️ Give Up &amp; Reveal Answers</button>`
      : '';
  
    document.getElementById('tb-fix-title').textContent = ch.title;
    document.getElementById('tb-fix-body').innerHTML = symptomHtml + progressHtml + faultsHtml + toolsHtml + giveUpHtml;
  }
  
  function tbShowFixHint(faultIdx) {
    if (!tbFixChallenge || faultIdx >= tbFixChallenge.faults.length) return;
    const f = tbFixChallenge.faults[faultIdx];
    if (f.fixed) return;
    if (f.hintsUsed > 0) tbFixChallenge.totalHintsUsed++;
    f.hintsUsed++;
    tbRenderFixPanel();
  }
  
  function tbCheckFixProgress() {
    if (!tbFixChallenge || tbFixChallenge.completed) return;
    let anyNewFix = false;
  
    for (const f of tbFixChallenge.faults) {
      if (f.fixed) continue;
      const faultType = TB_FAULT_TYPES.find(ft => ft.id === f.faultId);
      if (!faultType) continue;
      const dev = tbState.devices.find(d => d.id === f.deviceId);
      if (!dev) continue;
      const ifc = f.ifaceIdx !== undefined ? dev.interfaces?.[f.ifaceIdx] : dev.interfaces?.[0];
      const result = faultType.detect(dev, ifc, f.orig);
      if (result === null) {
        f.fixed = true;
        f.fixedAt = Date.now();
        anyNewFix = true;
        tbShowFixToast(faultType.label, faultType.domain);
      }
    }
  
    if (anyNewFix) {
      tbRenderFixPanel();
      // Check if all fixed
      if (tbFixChallenge.faults.every(f => f.fixed)) {
        setTimeout(() => tbEndFixChallenge(), 600);
      }
    }
  }
  
  function tbShowFixToast(label, domain) {
    // Remove any existing toast
    document.querySelectorAll('.tb-fix-toast').forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = 'tb-fix-toast';
    toast.innerHTML = `<span class="tb-fix-toast-icon">✅</span><span class="tb-fix-toast-text"><strong>Fault Fixed!</strong> ${escHtml(label)}</span><span class="tb-fix-toast-obj">Obj ${domain}</span>`;
    document.getElementById('page-topology-builder')?.appendChild(toast);
    setTimeout(() => toast.classList.add('tb-fix-toast-show'), 10);
    setTimeout(() => { toast.classList.remove('tb-fix-toast-show'); setTimeout(() => toast.remove(), 400); }, 3500);
  }
  
  function tbEndFixChallenge() {
    if (!tbFixChallenge) return;
    tbFixChallenge.completed = true;
    if (tbFixChallenge._timerInterval) clearInterval(tbFixChallenge._timerInterval);
  
    const score = tbCalcFixScore(tbFixChallenge);
    tbFixChallenge.score = score;
  
    // Save result
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE.FIX_CHALLENGES) || '{}');
      const prev = saved[tbFixChallenge.challengeId] || {};
      saved[tbFixChallenge.challengeId] = {
        bestScore: Math.max(prev.bestScore || 0, score.score),
        bestTime: prev.bestTime ? Math.min(prev.bestTime, score.time) : score.time,
        completions: (prev.completions || 0) + 1,
        firstCompleted: prev.firstCompleted || new Date().toISOString(),
        lastCompleted: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE.FIX_CHALLENGES, JSON.stringify(saved));
      _cloudFlush(STORAGE.FIX_CHALLENGES);
    } catch (_) {}
  
    // Milestones
    evaluateMilestones();
  
    // Confetti!
    if (typeof launchConfetti === 'function') launchConfetti();
  
    // Show completion modal
    tbShowFixComplete(score);
  }
  
  function tbCalcFixScore(challenge) {
    const BASE = 1000;
    const faultBonus = challenge.faults.length * 100;
    const hintPenalty = challenge.totalHintsUsed * 50;
    const elapsedSec = Math.floor((Date.now() - challenge.startTime) / 1000);
    const timePenalty = Math.max(0, Math.floor(elapsedSec / 30) * 10);
    const score = Math.max(0, BASE + faultBonus - hintPenalty - timePenalty);
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    return { score, maxScore: BASE + faultBonus, time: elapsedSec, timeStr: `${m}:${String(s).padStart(2, '0')}`, hintsUsed: challenge.totalHintsUsed, faultCount: challenge.faults.length };
  }
  
  function tbShowFixComplete(score) {
    const modal = document.getElementById('tb-fix-complete');
    if (!modal) return;
    const ch = TB_FIX_CHALLENGES.find(c => c.id === tbFixChallenge?.challengeId);
    const pct = score.maxScore > 0 ? Math.round((score.score / score.maxScore) * 100) : 0;
    const grade = pct >= 93 ? 'A' : pct >= 87 ? 'A-' : pct >= 80 ? 'B+' : pct >= 73 ? 'B' : pct >= 65 ? 'C+' : pct >= 58 ? 'C' : pct >= 50 ? 'D' : 'F';
    const gradeColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
  
    let perFaultHtml = '';
    if (tbFixChallenge?.faults) {
      tbFixChallenge.faults.forEach(f => {
        const ft = TB_FAULT_TYPES.find(t => t.id === f.faultId);
        const timeToFix = f.fixedAt ? Math.round((f.fixedAt - tbFixChallenge.startTime) / 1000) : '—';
        perFaultHtml += `<div class="tb-fix-complete-fault"><span>✅ ${ft?.label || f.faultId}</span><span>${timeToFix}s · ${f.hintsUsed} hint${f.hintsUsed !== 1 ? 's' : ''}</span></div>`;
      });
    }
  
    // Collect unique objectives
    const objs = [...new Set(tbFixChallenge?.faults.map(f => TB_FAULT_TYPES.find(t => t.id === f.faultId)?.domain).filter(Boolean))];
  
    modal.querySelector('.tb-fix-complete-body').innerHTML = `
      <div class="tb-fix-complete-hero">
        <div class="tb-fix-complete-grade" style="border-color:${gradeColor};color:${gradeColor}">${grade}</div>
        <div class="tb-fix-complete-score">${score.score} / ${score.maxScore}</div>
        <div class="tb-fix-complete-title">${ch ? escHtml(ch.title) : 'Challenge'} Complete!</div>
      </div>
      <div class="tb-fix-complete-stats">
        <div class="tb-fix-complete-stat"><span class="tb-fix-complete-val">⏱ ${score.timeStr}</span><span class="tb-fix-complete-label">Time</span></div>
        <div class="tb-fix-complete-stat"><span class="tb-fix-complete-val">🔧 ${score.faultCount}</span><span class="tb-fix-complete-label">Faults</span></div>
        <div class="tb-fix-complete-stat"><span class="tb-fix-complete-val">💡 ${score.hintsUsed}</span><span class="tb-fix-complete-label">Hints</span></div>
      </div>
      <div class="tb-fix-complete-faults">${perFaultHtml}</div>
      <div class="tb-fix-complete-objs">N10-009 Objectives: ${objs.map(o => `<span class="tb-fix-obj-badge">${o}</span>`).join(' ')}</div>
      <div class="tb-fix-complete-actions">
        <button class="btn tb-tool-btn-fix" onclick="document.getElementById('tb-fix-complete').classList.add('is-hidden');tbOpenFixPicker()">Next Challenge</button>
        <button class="btn btn-ghost" onclick="document.getElementById('tb-fix-complete').classList.add('is-hidden')">Close</button>
      </div>`;
    modal.classList.remove('is-hidden');
  }
  
  function tbRevealFixAnswers() {
    if (!tbFixChallenge || tbFixChallenge.completed) return;
    if (!confirm('This will reveal all answers, apply the fixes, and end the challenge with 0 points. Continue?')) return;
  
    tbFixChallenge.revealed = true;
    if (tbFixChallenge._timerInterval) clearInterval(tbFixChallenge._timerInterval);
  
    const ch = TB_FIX_CHALLENGES.find(c => c.id === tbFixChallenge.challengeId);
    const reveals = [];
  
    // Build the reveal data and auto-fix each fault
    for (const f of tbFixChallenge.faults) {
      const fType = TB_FAULT_TYPES.find(ft => ft.id === f.faultId);
      if (!fType) continue;
      const dev = tbState.devices.find(d => d.id === f.deviceId);
      if (!dev) continue;
      const ifc = f.ifaceIdx !== undefined ? dev.interfaces?.[f.ifaceIdx] : dev.interfaces?.[0];
  
      // Build what-was-wrong + what-is-correct
      const diagnosis = fType.detect(dev, ifc, f.orig);
      const reveal = { faultLabel: fType.label, domain: fType.domain, device: dev.hostname, diagnosis: diagnosis || 'Already fixed' };
  
      // Build detailed fix instructions from orig snapshot
      const fixes = [];
      if (f.orig.ip !== undefined && ifc && ifc.ip !== f.orig.ip) { fixes.push(`IP: ${ifc.ip || '(empty)'} → ${f.orig.ip}`); ifc.ip = f.orig.ip; }
      if (f.orig.mask !== undefined && ifc && ifc.mask !== f.orig.mask) { fixes.push(`Mask: ${ifc.mask || '(empty)'} → ${f.orig.mask}`); ifc.mask = f.orig.mask; }
      if (f.orig.gateway !== undefined && ifc && ifc.gateway !== f.orig.gateway) { fixes.push(`Gateway: ${ifc.gateway || '(empty)'} → ${f.orig.gateway}`); ifc.gateway = f.orig.gateway; }
      if (f.orig.vlan !== undefined && ifc && ifc.vlan !== f.orig.vlan) { fixes.push(`VLAN: ${ifc.vlan} → ${f.orig.vlan}`); ifc.vlan = f.orig.vlan; }
      if (f.orig.mode !== undefined && ifc && ifc.mode !== f.orig.mode) { fixes.push(`Port mode: ${ifc.mode} → ${f.orig.mode}`); ifc.mode = f.orig.mode; }
      if (f.orig.trunkAllowed !== undefined && ifc && ifc.trunkAllowed !== f.orig.trunkAllowed) { fixes.push(`Trunk allowed: "${ifc.trunkAllowed}" → "${f.orig.trunkAllowed}"`); ifc.trunkAllowed = f.orig.trunkAllowed; }
      if (f.orig.enabled !== undefined && ifc && ifc.enabled !== f.orig.enabled) { fixes.push(`Interface: ${ifc.enabled ? 'enabled' : 'disabled'} → ${f.orig.enabled ? 'enabled' : 'disabled'}`); ifc.enabled = f.orig.enabled; }
      if (f.orig.routingTable?.length && dev.routingTable?.length !== f.orig.routingTable.length) {
        dev.routingTable = JSON.parse(JSON.stringify(f.orig.routingTable));
        fixes.push(`Routes restored: ${f.orig.routingTable.map(r => `${r.network}/${r.mask || r.cidr} via ${r.nextHop}`).join(', ')}`);
      }
      if (f.orig.dhcpServer && dev.dhcpServer?.poolStart !== f.orig.dhcpServer.poolStart) {
        dev.dhcpServer = JSON.parse(JSON.stringify(f.orig.dhcpServer));
        fixes.push(`DHCP pool: → ${f.orig.dhcpServer.poolStart}`);
      }
      if (f.orig.vpnConfig) {
        if (dev.vpnConfig?.encryption !== f.orig.vpnConfig.encryption) { fixes.push(`VPN encryption: ${dev.vpnConfig?.encryption} → ${f.orig.vpnConfig.encryption}`); dev.vpnConfig.encryption = f.orig.vpnConfig.encryption; }
        if (dev.vpnConfig?.psk !== f.orig.vpnConfig.psk) { fixes.push(`VPN PSK: restored correct key`); dev.vpnConfig.psk = f.orig.vpnConfig.psk; }
      }
      if (f.orig.wirelessConfig?.security && dev.wirelessConfig?.security !== f.orig.wirelessConfig.security) {
        fixes.push(`Wireless: ${dev.wirelessConfig.security} → ${f.orig.wirelessConfig.security}`);
        dev.wirelessConfig.security = f.orig.wirelessConfig.security;
      }
      // Remove injected ACL deny-all
      if (f.faultId === 'acl-blocks-traffic' && dev.acls) {
        const denyIdx = dev.acls.findIndex(a => a.action === 'deny' && a.src === '0.0.0.0/0' && a.dst === '0.0.0.0/0');
        if (denyIdx !== -1) { dev.acls.splice(denyIdx, 1); fixes.push('Removed deny-all ACL rule'); }
      }
      if (fixes.length === 0) fixes.push('(was already correct)');
      reveal.fixes = fixes;
      reveal.hints = ch?.hints?.[f.faultId] || [];
      reveals.push(reveal);
  
      f.fixed = true;
      f.fixedAt = Date.now();
    }
  
    // Refresh canvas to show corrected state
    tbRenderCanvas();
    tbSaveDraft();
    if (typeof tbRefreshAmbientHealth === 'function') tbRefreshAmbientHealth();
  
    // Show the reveal modal
    tbShowFixReveal(reveals, ch);
  }
  
  function tbShowFixReveal(reveals, ch) {
    const modal = document.getElementById('tb-fix-complete');
    if (!modal) return;
  
    let revealHtml = '';
    reveals.forEach((r, i) => {
      let hintsHtml = '';
      if (r.hints.length) {
        hintsHtml = `<div class="tb-fix-reveal-hints"><strong>Hints:</strong> ${r.hints.map(h => `<div class="tb-fix-hint-text">💡 ${escHtml(h)}</div>`).join('')}</div>`;
      }
      revealHtml += `<div class="tb-fix-reveal-fault">
        <div class="tb-fix-reveal-fault-head">
          <span class="tb-fix-reveal-num">${i + 1}</span>
          <span class="tb-fix-reveal-label">${escHtml(r.faultLabel)}</span>
          <span class="tb-fix-obj-badge">Obj ${r.domain}</span>
        </div>
        <div class="tb-fix-reveal-device">📍 ${escHtml(r.device)}</div>
        <div class="tb-fix-reveal-diagnosis">❌ ${escHtml(r.diagnosis)}</div>
        <div class="tb-fix-reveal-fixes">${r.fixes.map(f => `<div class="tb-fix-reveal-fix">✅ ${escHtml(f)}</div>`).join('')}</div>
        ${hintsHtml}
      </div>`;
    });
  
    modal.querySelector('.tb-fix-complete-body').innerHTML = `
      <div class="tb-fix-reveal-hero">
        <div class="tb-fix-reveal-icon">📖</div>
        <div class="tb-fix-reveal-title">${ch ? escHtml(ch.title) : 'Challenge'} — Answer Reveal</div>
        <div class="tb-fix-reveal-subtitle">All faults have been corrected on the canvas. Study the fixes below.</div>
      </div>
      <div class="tb-fix-reveal-list">${revealHtml}</div>
      <div class="tb-fix-reveal-tip">💡 <strong>Exam tip:</strong> On the CompTIA N10-009, Domain 5 (Troubleshooting) is 22% of the exam. Practice identifying these faults by symptom, not by reveal!</div>
      <div class="tb-fix-complete-actions">
        <button class="btn tb-tool-btn-fix" onclick="document.getElementById('tb-fix-complete').classList.add('is-hidden');tbCloseFixChallenge();tbOpenFixPicker()">Try Another</button>
        <button class="btn btn-ghost" onclick="document.getElementById('tb-fix-complete').classList.add('is-hidden');tbCloseFixChallenge()">Close</button>
      </div>`;
    modal.classList.remove('is-hidden');
  
    // Hide the HUD panel
    document.getElementById('tb-fix-panel')?.classList.add('is-hidden');
  }
  
  function tbCloseFixChallenge() {
    if (tbFixChallenge?._timerInterval) clearInterval(tbFixChallenge._timerInterval);
    tbFixChallenge = null;
    const panel = document.getElementById('tb-fix-panel');
    if (panel) {
      panel.classList.add('is-hidden');
      // Reset position for next challenge
      panel.style.top = '';
      panel.style.left = '';
      panel.style.right = '';
    }
  }
  
  // ── Draggable Fix Panel ──
  function tbInitFixPanelDrag() {
    const panel = document.getElementById('tb-fix-panel');
    const head = panel?.querySelector('.tb-fix-panel-head');
    if (!panel || !head) return;
    head.style.cursor = 'grab';
    let isDragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
  
    head.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return; // Don't drag when clicking close btn
      isDragging = true;
      head.style.cursor = 'grabbing';
      const rect = panel.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      startX = e.clientX;
      startY = e.clientY;
      // Switch from right-positioned to left-positioned for smooth dragging
      panel.style.right = 'auto';
      panel.style.left = origLeft + 'px';
      panel.style.top = origTop + 'px';
      panel.style.position = 'fixed';
      e.preventDefault();
    });
  
    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = Math.max(0, Math.min(window.innerWidth - 100, origLeft + dx)) + 'px';
      panel.style.top = Math.max(0, Math.min(window.innerHeight - 60, origTop + dy)) + 'px';
    });
  
    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      head.style.cursor = 'grab';
    });
  
    // Touch support for mobile
    head.addEventListener('touchstart', e => {
      if (e.target.closest('button')) return;
      isDragging = true;
      const touch = e.touches[0];
      const rect = panel.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      startX = touch.clientX;
      startY = touch.clientY;
      panel.style.right = 'auto';
      panel.style.left = origLeft + 'px';
      panel.style.top = origTop + 'px';
      panel.style.position = 'fixed';
    }, { passive: true });
  
    document.addEventListener('touchmove', e => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      panel.style.left = Math.max(0, Math.min(window.innerWidth - 100, origLeft + dx)) + 'px';
      panel.style.top = Math.max(0, Math.min(window.innerHeight - 60, origTop + dy)) + 'px';
    }, { passive: true });
  
    document.addEventListener('touchend', () => { isDragging = false; });
  }
  
  // ── Fix Challenge Milestones ──
  // Integrated into evaluateMilestones() via the try/catch block pattern
  

  // ── Expose to window so onclick handlers in rendered HTML + index.html
  //    static onclicks + the shell's showPage cleanup hook find them ──
  // 91 onclick targets across app.js + index.html, plus tbStopAmbient
  // (shell's showPage cleanup at app.js:1787) + tbLoadScenarioWithBuild
  // (drill-mission card CTAs at app.js:5217+5232), plus tbStartTrace +
  // tbSelectDeviceForInspector (Playwright tests call them via window.X
  // from page.evaluate). Wrapped in a helper to keep the boilerplate compact.
  //
  // NOTE: auto-extraction-from-index.html via /tb[A-Z]\w+/ substring match
  // generates false positives (tbClose matched tbClose3DView etc., tbOpen
  // matched tbOpenLabPicker etc., tbV matched tbVlan in attribute values).
  // The helper's `typeof fn === 'function'` guard handles VARIABLES that
  // happen to share the prefix (e.g. tbConfigPanelDeviceId is a `let`),
  // but JS evaluates arguments at call-site BEFORE invoking the helper,
  // so an undeclared name like `tbClose` throws ReferenceError. Always
  // verify each name has a function definition before adding to this list.
  function _exposeTb(...fns) {
    for (const fn of fns) {
      if (typeof fn === 'function') window[fn.name] = fn;
    }
  }
  _exposeTb(
    // 3D View entry/exit + interactive controls — all defined in this module
    // (NOT in tb3d.js, which only handles renderer + scene). These have `3d`
    // in the name which falls outside the /tb[A-Z]/ auto-extract regex, so
    // they need explicit listing.
    tb3dDismissMobileNudge,
    tb3dEnterOsiView,
    tb3dExitOsiView,
    tb3dOpenTraceDialog,
    tb3dPlayTour,
    tb3dResetCamera,
    tb3dTopDown,
    tb3dTourExit,
    tb3dTourPause,
    tb3dTourPrev,
    tb3dTourResume,
    tb3dTourSkip,
    tb3dTraceEnd,
    tb3dTracePause,
    tb3dTracePlay,
    tb3dTraceSpeed,
    tb3dTraceStep,
    tbClose3DView,
    tbOpen3DView,
    // 91 tbXxx onclick targets auto-extracted via /tb[A-Z]\w+/ from index.html
    tbAddBgpNeighbor,
    tbAddBgpNetwork,
    tbAddDnsRecord,
    tbAddEigrpNetwork,
    tbAddFwaas,
    tbAddNaclRule,
    tbAddOspfArea,
    tbAddQosPolicy,
    tbAddSecurityGroup,
    tbAddSgRule,
    tbAddStaticRoute,
    tbAddVlan,
    tbAddVpcPeering,
    tbAddVxlan,
    tbClearCanvas,
    tbClearSimLog,
    tbCliExec,
    tbCloseCoachModal,
    tbCloseConfigPanel,
    tbCloseExplainModal,
    tbCloseFixChallenge,
    tbCloseGradeModal,
    tbClosePacketInspection,
    tbCoachTopology,
    tbConfigPanelDeviceId,
    tbDelRoute,
    tbDelVlan,
    tbDeleteSelected,
    tbDisableDhcp,
    tbEnableDhcp,
    tbEndLab,
    tbEndTrace,
    tbExecArp,
    tbExecPing,
    tbExplainDevice,
    tbExportPNG,
    tbFixFilterTab,
    tbForceOpen,
    tbGenerateAiTopology,
    tbGradeTopology,
    tbInspectorPopClose,
    tbLabFilterTab,
    tbLabNext,
    tbLabPrev,
    tbLoadScenarioFromPicker,
    tbLoadScenarioWithBuild,
    tbNegotiateBgp,
    tbNegotiateVpn,
    tbNewTopology,
    tbOpenConfigPanel,
    tbOpenDhcpDialog,
    tbOpenFixPicker,
    tbOpenLabPicker,
    tbOpenPingDialog,
    tbOpenScenarioDeepDive,
    tbOpenScenarioPicker,
    tbOpenTraceDialog,
    tbRemoveBgpNeighbor,
    tbRemoveBgpNetwork,
    tbRemoveDnsRecord,
    tbRemoveEigrpNetwork,
    tbRemoveFwaas,
    tbRemoveNaclRule,
    tbRemoveOspfArea,
    tbRemoveQosPolicy,
    tbRemoveSecurityGroup,
    tbRemoveSgRule,
    tbRemoveVpcPeering,
    tbRemoveVxlan,
    tbRevealFixAnswers,
    tbRunStpConvergence,
    tbSaveTopology,
    tbSelectCableType,
    tbSelectDeviceForInspector,
    tbSelectPill,
    tbShowFixHint,
    tbSimArpSpoof,
    tbSimRogueDhcp,
    tbSimVlanHopping,
    tbStartFixChallenge,
    tbStartLab,
    tbStartTrace,
    tbStopAmbient,
    tbSwitchConfigTab,
    tbToggleIface,
    tbToggleLabHint,
    tbTogglePalette,
    tbToggleScenarios,
    tbTraceReset,
    tbTraceSpeedToggle,
    tbTraceStep,
    tbZoomIn,
    tbZoomOut,
    tbZoomReset
  );

  // ── V2 bridge: read-only getters so the V2 render layer can read
  // engine state without duplicating it. V2 calls these, never mutates
  // tbState directly. Added v5.0.3 for the strangler-fig pattern.
  window.tbGetState = function() { return tbState; };
  window.tbGetSelectedId = function() { return tbSelectedId; };
  window.tbGetPendingCableFrom = function() { return tbPendingCableFrom; };
  window.tbGetDeviceTypes = function() { return TB_DEVICE_TYPES; };
  window.tbGetCableTypes = function() { return TB_CABLE_TYPES; };
  window.tbDeviceIcon = tbDeviceIcon;

  // ── V2 bridge: mutation functions so V2 can modify engine state
  // without reaching into V1 internals. Added v5.0.5 Ship #3.
  window.tbAddDevice = tbAddDevice;
  window.tbAddCable = tbAddCable;
  window.tbDeleteSelected = tbDeleteSelected;
  window.tbSaveDraft = tbSaveDraft;
  window.tbOpenConfigPanel = tbOpenConfigPanel;
  window.tbSetSelectedId = function(id) { tbSelectedId = id; };
  window.tbSetPendingCableFrom = function(id) { tbPendingCableFrom = id; };
  window.tbSetSelectedCableType = function(type) { tbSelectedCableType = type; };
  window.tbGetSelectedCableType = function() { return tbSelectedCableType; };

  // ── V2 bridge: simulation functions so V2 can run L2/L3 sims
  // programmatically without going through V1's modal-dependent
  // tbExecPing/tbExecArp. Added v5.0.7 Ship #4.
  window.tbV2SimPing = function(srcDeviceId, dstIp) { return tbSimPing(tbState, srcDeviceId, dstIp); };
  window.tbV2SimARP = function(srcDeviceId, targetIp) { return tbSimARP(tbState, srcDeviceId, targetIp); };
  window.tbV2SimDHCP = function(clientDeviceId) { return tbSimDHCP(tbState, clientDeviceId); };
  window.tbV2AnimatePacket = tbAnimatePacket;

  // ── V2 bridge: trace functions so V2 can initiate + control traces
  // programmatically. V1's tbOpenTraceDialog uses browser prompt() which
  // V2 replaces with its own editorial panel. Added v5.0.8 Ship #5.
  window.tbV2ComputeTrace = function(srcDeviceId, dstIp, maxTtl) { return tbComputeTrace(tbState, srcDeviceId, dstIp, maxTtl || 64); };
  window.tbV2StartTrace = function(srcId, dstIp) { tbStartTrace(srcId, dstIp); };
  window.tbV2EndTrace = tbEndTrace;
  window.tbV2TracePlay = tbTracePlay;
  window.tbV2TracePause = tbTracePause;
  window.tbV2TraceStep = tbTraceStep;
  window.tbV2GetTraceState = function() { return _tbUiState.trace; };

  // ── V2 bridge: lab functions so V2 can open/manage labs. Added v5.1.0 Ship #6.
  window.tbV2GetLabCategories = function() { return TB_LAB_CATEGORIES; };
  window.tbV2GetLabVariantGroups = function() { return TB_LAB_VARIANT_GROUPS; };
  window.tbV2GetAllLabs = function() { return TB_LABS; };
  window.tbV2GetActiveLab = function() { return tbActiveLab; };
  window.tbV2StartLab = function(labId) { tbStartLab(labId); };
  window.tbV2LabNext = function() { tbLabNext(); };
  window.tbV2LabPrev = function() { tbLabPrev(); };
  window.tbV2LabHint = function() { if (tbActiveLab) tbActiveLab.hintsUsed = (tbActiveLab.hintsUsed || 0) + 1; };
  window.tbV2LabSkip = function() {
    if (!tbActiveLab) return;
    var _skipLabDef = null;
    for (var _i = 0; _i < TB_LABS.length; _i++) {
      if (TB_LABS[_i].id === tbActiveLab.labId) { _skipLabDef = TB_LABS[_i]; break; }
    }
    if (!_skipLabDef || !_skipLabDef.steps) return;
    if (tbActiveLab.stepIdx < _skipLabDef.steps.length - 1) {
      tbActiveLab.stepIdx++;
      tbRenderLabStep();
    } else {
      tbEndLab();
    }
  };
  window.tbV2ExitLab = function() { tbEndLab(); };

  // ── V2 bridge: 3D view functions. Added v5.2.0 Ship #7. ──────────
  // Lazy-imports /tb3d.js and calls enter(tbState, opts) directly.
  // Uses the shared ES module cache — same module instance as V1's
  // _tb3dModule (safe: V1 and V2 are never simultaneously in 3D mode;
  // they live on different pages, only one visible at a time).
  window.tbV2Open3DView = async function(opts) {
    if (!window._tbV2_3dModule) {
      window._tbV2_3dModule = await import('/tb3d.js');
    }
    window._tbV2_3dModule.enter(tbState, opts || {});
  };
  window.tbV2Close3DView = function() {
    if (window._tbV2_3dModule) {
      try { window._tbV2_3dModule.exit(); } catch (_) {}
    }
  };

  // ── V2 bridge: Coach topology review. Added v5.3.0 Ship #8. ──────
  // Returns a promise resolving to { status, payload?, error?, scenario? }
  // instead of rendering into V1's #tb-coach-modal. Shares the same cache,
  // prompt construction, and API call as V1's tbCoachTopology().
  window.tbV2CoachTopology = async function() {
    if (tbState.devices.length === 0) {
      return { status: 'error', error: 'Add some devices before asking the Coach.' };
    }
    if (tbIsPristineScenario()) {
      var _scen = TB_SCENARIOS.find(function(s) { return s.id === tbState.pristineScenarioId; });
      return { status: 'error', error: '“' + (_scen ? _scen.title : 'Scenario') + '” is a reference scenario — Coach reviews your own edits.' };
    }
    var key = (localStorage.getItem(STORAGE.KEY) || '').trim();
    if (!key) {
      return { status: 'error', error: 'Add your Anthropic API key in Settings to use the Coach.' };
    }

    var scen = TB_SCENARIOS.find(function(s) { return s.id === tbSelectedScenario; }) || TB_SCENARIOS[0];
    var activeLab = tbActiveLab ? TB_LABS.find(function(l) { return l.id === tbActiveLab.labId; }) : null;
    var activeStep = (activeLab && activeLab.steps) ? activeLab.steps[tbActiveLab.stepIdx] : null;
    var cacheContext = activeLab
      ? scen.id + '::' + tbActiveLab.labId + '::step' + tbActiveLab.stepIdx
      : scen.id;
    var hash = tbTopologyHash(tbState, cacheContext);

    // Cache hit
    var cache = tbLoadCoachCache();
    if (cache[hash] && cache[hash].payload) {
      return { status: 'cached', payload: cache[hash].payload, scenario: scen };
    }

    // Build prompt (same two paths as V1 tbCoachTopology)
    var serialized = tbSerializeTopology(tbState);
    var prompt;
    if (activeLab && activeStep) {
      var stepNum = tbActiveLab.stepIdx + 1;
      var totalSteps = activeLab.steps.length;
      var stripMd = function(s) { return String(s || '').replace(/\*\*/g, '').replace(/`/g, ''); };
      prompt = 'You are a CompTIA Network+ (N10-009) instructor helping a student complete a specific hands-on lab step. Be a TUTOR, not a reviewer — reference the exact step goal and nudge toward the solution.'
        + '\n\nLAB: ' + activeLab.title + ' (N10-009 Obj ' + activeLab.objective + ', ' + activeLab.difficulty + ')'
        + '\nOverview: ' + activeLab.description
        + '\n\nSTEP ' + stepNum + ' OF ' + totalSteps + ': "' + stripMd(activeStep.title) + '"'
        + '\nGoal: ' + stripMd(activeStep.instruction)
        + '\nHint: ' + stripMd(activeStep.hint || '(no hint)')
        + '\n\nTOPOLOGY:\n' + serialized
        + '\n\nRespond with ONLY a JSON object: { "tour": "1-2 sentence progress observation", "strengths": ["2-3 items"], "concerns": ["1-3 blocking items"], "upgrades": ["2-3 next actions in order"], "objectives": ["1-3 N10-009 objectives as X.Y — Name"], "studyTip": "1 sentence broader concept" }. Under 400 words.';
    } else {
      prompt = 'You are a CompTIA Network+ (N10-009) instructor reviewing a student\'s topology. Be direct, specific, tie to N10-009 objectives.'
        + '\n\nScenario: ' + scen.title + '\n' + scen.description
        + '\n\nTopology:\n' + serialized
        + '\n\nRespond with ONLY a JSON object: { "tour": "2-3 sentence walkthrough", "strengths": ["2-4 items"], "concerns": ["2-4 issues"], "upgrades": ["2-3 suggestions"], "objectives": ["2-4 N10-009 objectives as X.Y — Name"], "studyTip": "1 sentence drill advice" }. Under 500 words.';
    }

    try {
      var res = await _claudeFetch({
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: CLAUDE_TEACHER_MODEL, max_tokens: MAX_TOKENS_TEACHER_DEFAULT, messages: [{ role: 'user', content: prompt }] })
      });
      if (!res.ok) {
        var errText = await res.text().catch(function() { return ''; });
        return { status: 'error', error: 'API returned ' + res.status + '. ' + errText.slice(0, 160), scenario: scen };
      }
      var data = await res.json();
      var text = (data.content && data.content[0] && data.content[0].text) || '';
      var cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      var payload;
      try { payload = JSON.parse(cleaned); } catch (_e) {
        var m = cleaned.match(/\{[\s\S]*\}/);
        if (m) { try { payload = JSON.parse(m[0]); } catch (__) {} }
      }
      if (!payload || !payload.tour) {
        return { status: 'error', error: 'Coach returned an unexpected response. Try again.', scenario: scen };
      }
      cache[hash] = { t: Date.now(), payload: payload };
      tbSaveCoachCache(cache);
      return { status: 'success', payload: payload, scenario: scen };
    } catch (e) {
      return { status: 'error', error: e && e.message ? e.message : 'Network error.', scenario: scen };
    }
  };

  // ── Register feature module entry point ──
  // Same contract as v4.99.36-43. Shell calls
  // window._certanvilFeatures["topology-builder"].enter() after lazy-load
  // resolves. The shell stub also performs Phase-8 desktop-only viewport
  // check BEFORE _loadFeature fires — mobile users never download this
  // module at all.
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures["topology-builder"] = {
    enter: function() {
      // The IIFE-internal openTopologyBuilder (above) has the full setup body
      // including the defensive in-page mobile-nudge UX. We just call it.
      // Shell stub already handled Pro gate + desktop-only viewport check
      // before _loadFeature fired; by the time this runs the user is signed-in
      // Pro on a wide enough viewport. tbForceOpen (also in the IIFE) also
      // calls this, supporting the "Open Anyway" override path.
      openTopologyBuilder();
    },
    leave: function() {
      // Stop ambient packet animation (also called from shell showPage cleanup
      // at app.js:1787 — but leave() is the canonical entry).
      try { tbStopAmbient(); } catch (_) {}
      // Tear down any open coach modal
      try {
        var coach = document.getElementById("tb-coach-modal");
        if (coach) coach.classList.add("is-hidden");
      } catch (_) {}
      // Note: 3D view teardown is handled by tb3d.js itself (already lazy).
    },
  };
})();

// Runs on the billing PC. Claims print jobs from the API and sends ESC/POS to the LAN printers (port 9100).
// Usage: API_URL=https://sparkling-api.onrender.com PRINT_AGENT_KEY=... KITCHEN_PRINTER_IP=192.168.1.50 BILL_PRINTER_IP=192.168.1.51 node agent.js
const net = require('net');
const { API_URL, PRINT_AGENT_KEY, KITCHEN_PRINTER_IP, BILL_PRINTER_IP } = process.env;
const ip = { 
  kitchen: KITCHEN_PRINTER_IP || '127.0.0.1', 
  bill: BILL_PRINTER_IP || '127.0.0.1',
  billing: BILL_PRINTER_IP || '127.0.0.1' 
};
const post = (p, body) => fetch(`${API_URL}/api/pos${p}`, { 
  method: 'POST', 
  headers: { 'content-type': 'application/json', 'x-agent-key': PRINT_AGENT_KEY }, 
  body: JSON.stringify(body || {}) 
}).then(r => r.json());

const escpos = (lines) => {
  const chunks = [Buffer.from([0x1b, 0x40])]; // ESC @ (Initialize printer)
  for (const l of lines) {
    const text = typeof l === 'string' ? l : (l?.t || '');
    const isCenter = l?.align === 'center';
    const isBig = Boolean(l?.big);

    if (isCenter) {
      chunks.push(Buffer.from([0x1b, 0x61, 0x01])); // Center
    } else {
      chunks.push(Buffer.from([0x1b, 0x61, 0x00])); // Left
    }

    if (isBig) {
      chunks.push(Buffer.from([0x1d, 0x21, 0x11])); // GS ! (Double height & width)
    } else {
      chunks.push(Buffer.from([0x1d, 0x21, 0x00])); // Normal
    }

    chunks.push(Buffer.from(text + '\n', 'latin1'));
  }
  // Reset alignment and size, feed 4 lines, and paper cut
  chunks.push(Buffer.from([0x1b, 0x61, 0x00, 0x1d, 0x21, 0x00, 0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x00]));
  return Buffer.concat(chunks);
};

const send = (host, buf) => new Promise((ok, no) => { 
  const s = net.connect(9100, host, () => s.end(buf, ok)); 
  s.setTimeout(5000, () => { s.destroy(); no(new Error('timeout')); }); 
  s.on('error', no); 
});

(async function loop() {
  for (;;) {
    try {
      const job = await post('/print/claim');
      if (job && job._id) { 
        let ok = false; 
        const targetPrinter = job.printer || job.target || 'kitchen';
        const targetIp = ip[targetPrinter] || ip.kitchen;
        try { 
          await send(targetIp, escpos(job.lines || [])); 
          ok = true; 
        } catch (e) { 
          console.error(`Thermal print job failed on ${targetPrinter} (${targetIp}):`, e.message); 
        } 
        await post(`/print/${job._id}/result`, { ok }); 
        continue; 
      }
    } catch (e) { 
      // Network polling heartbeat
    }
    await new Promise(r => setTimeout(r, 2000));
  }
})();

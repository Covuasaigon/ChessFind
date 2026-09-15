import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const artifactDir = 'C:\\Users\\SGPC\\.gemini\\antigravity-ide\\brain\\e42087c0-84a2-4e12-b612-0bd161c29c23';

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'http://localhost:3005/?t=demo&p=demo-1'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const res = await fetch('http://127.0.0.1:9222/json/list');
    const pages = await res.json() as any[];
    console.log('Pages found:', pages.length);
    const page = pages.find(p => p.url.includes('3005')) || pages[0];
    if (!page || !page.webSocketDebuggerUrl) {
      console.error('No websocket debugger url');
      return;
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    function send(method: string, params: any = {}): Promise<any> {
      const id = msgId++;
      return new Promise((resolve) => {
        const handler = (evt: MessageEvent) => {
          const parsed = JSON.parse(evt.data.toString());
          if (parsed.id === id) {
            ws.removeEventListener('message', handler);
            resolve(parsed.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('DOM.enable');
    await send('Runtime.enable');

    await new Promise(r => setTimeout(r, 3000));

    const viewports = [
      { name: 'mobile_320px.png', width: 320, height: 800 },
      { name: 'mobile_360px.png', width: 360, height: 800 },
      { name: 'mobile_375px.png', width: 375, height: 812 },
      { name: 'mobile_390px.png', width: 390, height: 844 },
      { name: 'mobile_414px.png', width: 414, height: 896 }
    ];

    for (const vp of viewports) {
      console.log('Capturing ' + vp.name + ' at ' + vp.width + 'x' + vp.height + '...');
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 500));

      // Scroll down to Hành trình thi đấu section
      await send('Runtime.evaluate', {
        expression: `
          const section = document.querySelector('.recent-panel, .round-list, .mobile-match-cards');
          if (section) section.scrollIntoView({ block: 'start' });
        `
      });

      await new Promise(r => setTimeout(r, 300));

      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      if (screenshot && screenshot.data) {
        const outPath = path.join(artifactDir, vp.name);
        fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
        console.log('Saved ' + outPath + ' (' + fs.statSync(outPath).size + ' bytes)');
      }
    }

    ws.close();
  } catch (err) {
    console.error('CDP Error:', err);
  } finally {
    edgeProc.kill();
  }
}

main();

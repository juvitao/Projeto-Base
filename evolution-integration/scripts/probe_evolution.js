const API_DOMAIN = 'evo.jotabot.site';
const API_KEY = 'JotaBotEVO2025_API_Key_Definitiva';
const INSTANCE_NAME = 'userdcfdce54';
const PHONE_NUMBER = '5511999999999';

async function probe() {
    const protocols = ['https']; // We know it's HTTPS now
    const endpoints = [
        { name: 'v2-QR-qrcode-nested', path: `/instance/connect/qrcode/${INSTANCE_NAME}`, method: 'GET' },
        { name: 'v2-QR-qrcode-direct', path: `/instance/qrcode/${INSTANCE_NAME}`, method: 'GET' },
        { name: 'v2-QR-connect-direct', path: `/instance/connect/${INSTANCE_NAME}`, method: 'GET' },
        { name: 'v2-QR-connect-POST', path: `/instance/connect/${INSTANCE_NAME}`, method: 'POST' },
        { name: 'v2-QR-qrcode-POST', path: `/instance/connect/qrcode/${INSTANCE_NAME}`, method: 'POST' },
    ];

    for (const proto of protocols) {
        const baseUrl = `${proto}://${API_DOMAIN}`;
        console.log(`\n--- Probing ${baseUrl} ---`);
        for (const ep of endpoints) {
            process.stdout.write(`Testing ${ep.name}... `);
            try {
                const url = `${baseUrl}${ep.path}`;
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(url, {
                    method: ep.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': API_KEY
                    },
                    body: ep.method === 'POST' ? JSON.stringify(ep.body) : undefined,
                    signal: controller.signal
                });
                clearTimeout(timeout);

                const text = await response.text();
                console.log(`Status: ${response.status}`);
                console.log(`Response: ${text}`);
                if (response.ok) {
                    console.log(`SUCCESS! Protocol: ${proto}, Endpoint: ${ep.name}`);
                }
            } catch (e) {
                console.log(`Error: ${e.name === 'AbortError' ? 'Timeout' : e.message}`);
            }
        }
    }
}

probe();

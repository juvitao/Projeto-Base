// Script para atualizar senha do usuário no Supabase
const https = require('https');

const SUPABASE_URL = 'https://kvuxjnvovygcooxoijpm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2dXhqbnZvdnlnY29veG9panBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA0MDE4MCwiZXhwIjoyMDg0NjE2MTgwfQ.5PtB3szSEbuPcg2HcwCFSYMwroenQMMOq20FxVJ9r6E';

async function fetchUsers() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/auth/v1/admin/users`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function updatePassword(userId) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`);
    const body = JSON.stringify({
      password: '03903227684'
    });
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🔍 Buscando usuário Renatamss77@gmail.com...');
  const users = await fetchUsers();
  const targetUser = users.users?.find(u => u.email === 'Renatamss77@gmail.com');
  
  if (!targetUser) {
    console.log('❌ Usuário não encontrado.');
    return;
  }

  console.log(`✅ Usuário encontrado! ID: ${targetUser.id}`);
  console.log('🔄 Atualizando senha...');
  
  const result = await updatePassword(targetUser.id);
  
  if (result.status === 200) {
    console.log('✅ Senha atualizada com sucesso!');
    console.log(`   Email: ${result.data.email}`);
    console.log('   Senha: 03903227684');
  } else {
    console.log('❌ Erro:', result.data);
  }
}

main().catch(console.error);

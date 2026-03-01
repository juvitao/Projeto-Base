const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkDB() {
    try {
        const env = fs.readFileSync('.env', 'utf8');
        const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
        const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

        if (!urlMatch || !keyMatch) {
            console.log("Could not find Supabase credentials in .env");
            return;
        }

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        console.log("Fetching master_brands...");
        const brandsRes = await supabase.from('master_brands').select('*').limit(2);
        console.log("Brands Response:", JSON.stringify(brandsRes, null, 2));

        console.log("-------------------");

        console.log("Fetching master_products...");
        const productsRes = await supabase.from('master_products').select('*').limit(2);
        console.log("Products Response:", JSON.stringify(productsRes, null, 2));

    } catch (err) {
        console.error("Error:", err);
    }
}

checkDB();

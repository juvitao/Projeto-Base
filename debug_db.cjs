const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkDB() {
    try {
        const env = fs.readFileSync('.env', 'utf8');
        const urlMatch = env.match(/VITE_SUPABASE_URL="?(.*?)"?$/m);
        const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="?(.*?)"?$/m);

        if (!urlMatch || !keyMatch) {
            console.log("Could not find Supabase credentials in .env");
            return;
        }

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        console.log("Fetching master_brands...");
        const brandsRes = await supabase.from('master_brands').select('*').limit(2);
        console.log("Brands Response data:", brandsRes.data);
        console.log("Brands Response error:", brandsRes.error);

        console.log("-------------------");

        console.log("Fetching master_products...");
        const productsRes = await supabase.from('master_products').select('*').limit(2);
        console.log("Products Response data:", productsRes.data);
        console.log("Products Response error:", productsRes.error);

    } catch (err) {
        console.error("Error:", err);
    }
}

checkDB();

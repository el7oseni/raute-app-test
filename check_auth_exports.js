
try {
    const authHelpers = require('@supabase/auth-helpers-nextjs');
    console.log("📦 Exports available:");
    console.log(JSON.stringify(Object.keys(authHelpers), null, 2));
} catch (e) {
    console.error("❌ Failed:", e.message);
}

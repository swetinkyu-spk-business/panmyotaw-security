// ==========================================
// ⚙️ PMT EV Taxi - Master Configuration File
// ဤဖိုင်တစ်ခုတည်းတွင်သာ Key များကို ပြင်ဆင်ရပါမည်။
// ==========================================

const CONFIG = {
    // 1. Supabase Settings (Database)
    SUPABASE_URL: 'https://lbpnfqxfagapxwyeaqkq.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicG5mcXhmYWdhcHh3eWVhcWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTc1OTcsImV4cCI6MjA4MTIzMzU5N30.pXzji4fsxaMUE05dpJSKpkmHDbdrAr4PhX49Dxy-n98',
    SB_URL: 'https://lbpnfqxfagapxwyeaqkq.supabase.co',
    SB_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicG5mcXhmYWdhcHh3eWVhcWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTc1OTcsImV4cCI6MjA4MTIzMzU5N30.pXzji4fsxaMUE05dpJSKpkmHDbdrAr4PhX49Dxy-n98',
    
    // 2. Telegram Bot Settings (Notifications)
    TELEGRAM_BOT_TOKEN: '8376761873:AAGw2-ht9ggDsxpI3wrE0fVHhIdh89xCbuM', 
    TELEGRAM_CHAT_ID: '-1003140710930', 

    // ==========================================
    // 🌟 3. Business Rules & Financial Settings (လုပ်ငန်းပိုင်းဆိုင်ရာ သတ်မှတ်ချက်များ)
    // ==========================================
    DEFAULT_SAVING_AMOUNT: 2000,      // ယာဉ်မောင်း တစ်ရက် မဖြစ်မနေ စုဆောင်းငွေ (Ks)
    DEFAULT_GATE_FEE_PERCENT: 0.04,   // ပုံမှန် ခရီးစဉ်များအတွက် ဂိတ်ကြေး (၄%)
    
    // (အခြား သတ်မှတ်ချက်များ ရှိပါက ဤနေရာတွင် ဆက်ထားပါ)
};

// ==========================================
// 🚀 Supabase Initialization (Singleton Pattern)
// Multiple Instances Error မတက်စေရန်နှင့် Offline Stability ရရှိစေရန်
// ==========================================

if (!window._supabase) {
    window._supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
        auth: {
            persistSession: true,    // Session ကို Browser ထဲတွင် အမြဲမှတ်ထားရန် 
            autoRefreshToken: true,  // Token သက်တမ်းကုန်လျှင် အလိုအလျောက် အသစ်ပြန်ယူပေးရန်
            detectSessionInUrl: false 
        }
    });
}

// သင့်ရဲ့ ငွေစာရင်း (Finance) စနစ်က _financeSupabase ဆိုတဲ့ နာမည်နဲ့ သုံးထားတာ တွေ့ရလို့ 
// သီးခြား အသစ်ထပ်မဆောက်တော့ဘဲ ရှိပြီးသား _supabase ကိုပဲ မျှဝေသုံးစွဲစေပါမယ်။
if (!window._financeSupabase) {
    window._financeSupabase = window._supabase;
}

// ==========================================
// 🧹 Service Worker ရှင်းလင်းခြင်း (Cache ရှင်းလင်းရန်)
// ==========================================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister().then(function(boolean) {
                console.log('Old Service Worker unregistered:', boolean);
            });
        }
    }).catch(function(error) {
        console.error('Error unregistering service worker:', error);
    });
}
// ==========================================
// 🛡️ Panmyotaw Device Security Add-in Logic
// ==========================================

geotab.addin.deviceLock = function(api, state) {
  return {
    initialize: function(api, state, callback) {
      callback();
    },
    // focus: async function(api, state) {
    //   try {
    //     api.getSession(async function(session) {
    //       const geotabUser = session.userName;

    //       // ၁။ FingerprintJS မှ လက်ရှိစက်၏ Device ID ကို ရယူမည်
    //       const fp = await window.FingerprintJS.load();
    //       const result = await fp.get();
    //       const currentDeviceId = result.visitorId;

    //       const statusDiv = document.getElementById('security-status');

    //       // ၂။ Database မှ ခွင့်ပြုထားသော Device ID များနှင့် အရေအတွက်ကို ဆွဲယူမည်
    //       const { data, error } = await window._supabase
    //         .from('profiles')
    //         .select('registered_device_id, registered_device_id_2, allowed_device_count')
    //         .eq('email', geotabUser)
    //         .maybeSingle();

    //       if (error) {
    //           console.error("Supabase Error:", error);
    //           statusDiv.innerHTML = "⚠️ စနစ်ချိတ်ဆက်မှု အမှားအယွင်းဖြစ်နေပါသည်။";
    //           return;
    //       }

    //       let id1 = data ? data.registered_device_id : null;
    //       let id2 = data ? data.registered_device_id_2 : null;
    //       let limit = data && data.allowed_device_count ? data.allowed_device_count : 1;

    //       // ၃။ လုံခြုံရေး စစ်ဆေးခြင်း အဆင့်ဆင့်
    //       // အခြေအနေ (က) - လက်ရှိစက်သည် မှတ်ပုံတင်ထားသော စက်ဖြစ်နေပါက
    //       if (currentDeviceId === id1 || currentDeviceId === id2) {
    //         statusDiv.innerHTML = "✅ လုံခြုံရေး အတည်ပြုပြီးပါပြီ။ (Verified Device)";
    //         statusDiv.style.color = "#155724";
    //         statusDiv.style.background = "#d4edda";
    //         statusDiv.style.borderColor = "#c3e6cb";

    //       // အခြေအနေ (ခ) - ပထမစက် လွတ်နေသေးလျှင် မှတ်ပုံတင်မည်
    //       } else if (!id1) {
    //         await window._supabase.from('profiles').update({ 
    //             registered_device_id: currentDeviceId 
    //         }).eq('email', geotabUser);

    //         statusDiv.innerHTML = "✅ ဤစက်ကို ပထမစက်အဖြစ် မှတ်ပုံတင်ပြီးပါပြီ။";
    //         statusDiv.style.color = "#155724";
    //         statusDiv.style.background = "#d4edda";

    //       // အခြေအနေ (ဂ) - ဒုတိယစက် လွတ်နေသေးလျှင် (Limit အရ) မှတ်ပုံတင်မည်
    //       } else if (!id2 && limit > 1) {
    //         await window._supabase.from('profiles').update({ 
    //             registered_device_id_2: currentDeviceId 
    //         }).eq('email', geotabUser);

    //         statusDiv.innerHTML = "✅ ဤစက်ကို ဒုတိယစက်အဖြစ် မှတ်ပုံတင်ပြီးပါပြီ။";
    //         statusDiv.style.color = "#155724";
    //         statusDiv.style.background = "#d4edda";

    //       // အခြေအနေ (ဃ) - ခွင့်ပြုထားသော စက်အရေအတွက် ပြည့်သွားပါက ဝင်ခွင့်ပိတ်မည်
    //       } else {
    //         statusDiv.innerHTML = `⚠️ ဤအကောင့်သည် ခွင့်ပြုထားသော စက်အရေအတွက် (${limit} ခု) ပြည့်သွားပါပြီ။`;
    //         statusDiv.style.color = "#721c24";
    //         statusDiv.style.background = "#f8d7da";
    //         statusDiv.style.borderColor = "#f5c6cb";
            
    //         alert(`⚠️ လုံခြုံရေးသတိပေးချက်: ဤအကောင့်သည် ခွင့်ပြုထားသော စက်အရေအတွက် ပြည့်သွားပါပြီ။ အခြားစက်မှ ဝင်ရောက်လိုပါက Admin ထံ ဆက်သွယ်ပါ။ သင့်အား စနစ်မှ ထွက်ပါမည်။`);
            
    //         // Geotab မှ အလိုအလျောက် Logout လုပ်ခြင်း
    //         api.forget(); 
    //         window.location.reload();
    //       }
    //     });
    //   } catch (e) {
    //     console.error("Security Add-in Error:", e);
    //   }
    // },
    focus: async function(api, state) {
      try {
        api.getSession(async function(session) {
          const geotabUser = session.userName;

          // ၁။ FingerprintJS မှ လက်ရှိစက်၏ Device ID ကို ရယူမည်
          const fp = await window.FingerprintJS.load();
          const result = await fp.get();
          const currentDeviceId = result.visitorId;

          const statusDiv = document.getElementById('security-status');

          // ၂။ Database မှ ခွင့်ပြုထားသော Device ID များနှင့် အရေအတွက်ကို ဆွဲယူမည်
          const { data, error } = await window._supabase
            .from('profiles')
            .select('registered_device_id, registered_device_id_2, allowed_device_count')
            .eq('email', geotabUser)
            .maybeSingle();

          if (error) {
              statusDiv.innerHTML = "⚠️ စနစ်ချိတ်ဆက်မှု အမှားအယွင်းဖြစ်နေပါသည်။";
              return;
          }

          // 🌟 (အရေးကြီး) Database ထဲမှာ အကောင့်မရှိသေးရင် ဆက်မလုပ်ဘဲ ရပ်မယ် 🌟
          if (!data) {
              statusDiv.innerHTML = "⚠️ သင့်အကောင့် (Email) ကို စနစ်ထဲတွင် မတွေ့ပါ။ Admin သို့ ဆက်သွယ်ပါ။";
              statusDiv.style.color = "#721c24";
              statusDiv.style.background = "#f8d7da";
              return;
          }

          let id1 = data.registered_device_id;
          let id2 = data.registered_device_id_2;
          let limit = data.allowed_device_count ? data.allowed_device_count : 1;

          // ၃။ လုံခြုံရေး စစ်ဆေးခြင်း အဆင့်ဆင့်
          // (က) စက်ဟောင်းဖြစ်နေလျှင် (စစ်ဆေးပြီးသား) ဝင်ခွင့်ပြုမည်
          if (currentDeviceId === id1 || currentDeviceId === id2) {
            statusDiv.innerHTML = "✅ လုံခြုံရေး အတည်ပြုပြီးပါပြီ။ (Verified Device)";
            statusDiv.style.color = "#155724";
            statusDiv.style.background = "#d4edda";
            statusDiv.style.borderColor = "#c3e6cb";

          // (ခ) ပထမစက်နေရာ လွတ်နေသေးလျှင် (Limit က ၁ ဖြစ်ဖြစ်၊ ၂ ဖြစ်ဖြစ် ပထမဆုံးစက်ကို မှတ်မည်)
          } else if (!id1 && limit >= 1) {
            const { error: updateError } = await window._supabase.from('profiles').update({ 
                registered_device_id: currentDeviceId 
            }).eq('email', geotabUser);

            if (!updateError) {
                statusDiv.innerHTML = "✅ ဤစက်ကို ပထမစက်အဖြစ် မှတ်ပုံတင်ပြီးပါပြီ။";
                statusDiv.style.color = "#155724";
                statusDiv.style.background = "#d4edda";
            } else {
                statusDiv.innerHTML = `⚠️ မှတ်ပုံတင်ရာတွင် အမှားအယွင်းရှိပါသည်။ (${updateError.message})`;
            }

          // (ဂ) ပထမစက် ပြည့်နေပြီး၊ ဒုတိယစက်နေရာ လွတ်နေသေးကာ၊ Limit ကလည်း ၂ (သို့) ၂ ထက်ကြီးလျှင်
          } else if (id1 && !id2 && limit >= 2) {
            const { error: updateError } = await window._supabase.from('profiles').update({ 
                registered_device_id_2: currentDeviceId 
            }).eq('email', geotabUser);

            if (!updateError) {
                statusDiv.innerHTML = "✅ ဤစက်ကို ဒုတိယစက်အဖြစ် မှတ်ပုံတင်ပြီးပါပြီ။";
                statusDiv.style.color = "#155724";
                statusDiv.style.background = "#d4edda";
            } else {
                statusDiv.innerHTML = `⚠️ မှတ်ပုံတင်ရာတွင် အမှားအယွင်းရှိပါသည်။ (${updateError.message})`;
            }

          // (ဃ) Limit ပြည့်သွားပြီဆိုလျှင် (ဥပမာ- Limit က 1 ပဲပေးထားပြီး id1 ပြည့်နေပြီဆိုရင် ဒီကိုရောက်လာမယ်)
          } else {
            statusDiv.innerHTML = `⚠️ ဤအကောင့်သည် ခွင့်ပြုထားသော စက်အရေအတွက် (${limit} ခု) ပြည့်သွားပါပြီ။`;
            statusDiv.style.color = "#721c24";
            statusDiv.style.background = "#f8d7da";
            statusDiv.style.borderColor = "#f5c6cb";
            
            alert(`⚠️ လုံခြုံရေးသတိပေးချက်: ဤအကောင့်သည် ခွင့်ပြုထားသော စက်အရေအတွက် (${limit} ခု) ပြည့်သွားပါပြီ။ အခြားစက်မှ ဝင်ရောက်လိုပါက Admin ထံ ဆက်သွယ်ပါ။ သင့်အား စနစ်မှ ထွက်ပါမည်။`);
            
            api.forget(); 
            window.location.reload();
          }
        });
      } catch (e) {
        console.error("Security Add-in Error:", e);
      }
    },
    blur: function(api, state) {}
  };
};

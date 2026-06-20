// ၁။ Supabase ချိတ်ဆက်မှု

const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

// --- Network Status Monitor ---
window.addEventListener('online', () => updateNetworkStatus(true));
window.addEventListener('offline', () => updateNetworkStatus(false));

function updateNetworkStatus(isOnline) {
    let banner = document.getElementById('offline-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; background: #e74c3c; color: white; text-align: center; padding: 10px; z-index: 9999; font-weight: bold; font-size: 14px; display: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";
        banner.innerHTML = "⚠️ အင်တာနက်လိုင်း ပြတ်တောက်နေပါသည်။ (Offline Mode) ဒေတာများ သိမ်းဆည်း၍ မရနိုင်ပါ။";
        document.body.prepend(banner);
    }
    banner.style.display = isOnline ? 'none' : 'block';
}

// စတင်ဖွင့်ချိန်တွင် အင်တာနက်ရှိမရှိ စစ်ဆေးရန်
if (!navigator.onLine) {
    updateNetworkStatus(false);
}

// --- Global Route Guard & Security Check ---
async function checkUser() {
    try {
        // Supabase မှ လက်ရှိ Session ကို ရယူခြင်း
        const { data: { session }, error } = await _supabase.auth.getSession();
        if (error) throw error;

        const isLoginPage = window.location.pathname.includes('login.html');

        // Session မရှိလျှင် (Login မဝင်ရသေးလျှင်) Login စာမျက်နှာသို့ ပို့မည်
        if (!session) {
            if (!isLoginPage) {
                window.location.replace('login.html');
            }
            return;
        }

        // Login ဝင်ပြီးသားဆိုလျှင် Admin Panel သို့ပို့မည်
        if (session && isLoginPage) {
            window.location.replace('admin-panel.html');
            return;
        }

        // JWT Token ထဲမှ Role ကို ဆွဲယူခြင်း (Database သို့ Query ထပ်လုပ်ရန် မလိုတော့ပါ)
        const userRole = session.user.app_metadata?.role || 'operator';

        // Admin Header တွင် Email နှင့် Role ကို ပြသခြင်း
        const emailSpan = document.getElementById('admin-email');
        if (emailSpan) {
            emailSpan.innerHTML = `${session.user.email} <span style="background:#f1c40f; color:#333; padding:2px 6px; border-radius:4px; font-size:11px; margin-left:5px; font-weight:bold;">${userRole.toUpperCase()}</span>`;
        }

        // Role အရ UI များကို ကန့်သတ်ခြင်း (Dynamic UI)
        applyRoleBasedAccess(userRole);

    } catch (err) {
        console.error("Authentication Error:", err.message);
        // အင်တာနက်ပြတ်တောက်မှုကြောင့် Error တက်ပါက ချက်ချင်း Logout မလုပ်ဘဲ ခေတ္တဆိုင်းငံ့မည်
        if (err.message.includes("Failed to fetch") || !navigator.onLine) {
            console.warn("အင်တာနက် ချိတ်ဆက်မှု နှေးကွေးနေပါသည်။ (Offline Mode)");
        } else {
            window.location.replace('login.html');
        }
    }
}

// --- Role-Based UI Control (Dynamic from Database) ---
async function applyRoleBasedAccess(role) {
    if (role === 'founder') {
        // Founder သည် အကုန်မြင်ရမည်
        const allBoxes = document.querySelectorAll('.admin-box, .partner-box');
        allBoxes.forEach(b => b.style.display = 'block');
        
        if (typeof fetchStaffList === 'function') fetchStaffList();
        
        // Matrix ဇယားကို ဆွဲတင်မည်
        fetchPermissionMatrix();
        return;
    }

    // Founder မဟုတ်ပါက Database မှ သတ်မှတ်ချက်ကို ယူမည်
    try {
        const { data, error } = await _supabase.from('role_permissions').select('*').eq('role_name', role).single();
        if (error) throw error;

        if (data && data.allowed_boxes) {
            const allowed = data.allowed_boxes;
            const allBoxes = document.querySelectorAll('.admin-box, .partner-box');
            allBoxes.forEach(box => {
                if (box.id && allowed.includes(box.id)) {
                    box.style.display = 'block';
                } else {
                    box.style.display = 'none';
                }
            });
        }
    } catch (e) {
        console.error("Error loading permissions", e);
    }
}

// ==========================================
// 🛡️ DYNAMIC PERMISSION MATRIX LOGIC (FOUNDER)
// ==========================================

// စနစ်တွင်ရှိသော Box များ၏ နာမည်စာရင်း
const featureList = [
    { id: 'box-manage-partners', name: '✅ Partner နှင့် ယာဉ်စာရင်း စီမံရန်' },
    { id: 'box-pending-drivers', name: '👨‍✈️ ယာဉ်မောင်းအသစ် လျှောက်ထားမှုများ' },
    { id: 'box-city-fare', name: '💰 မြို့တွင်းခရီးစဉ် ဈေးနှုန်းသတ်မှတ်ရန်' },
    { id: 'box-company-settings', name: '⚙️ ကုမ္ပဏီ အထွေထွေ သတ်မှတ်ချက်များ' },
    { id: 'box-promotions', name: '🎉 အထူးပရိုမိုရှင်း စီမံရန်' },
    { id: 'box-special-packages', name: '🗺️ အထူးခရီးစဉ်များ စီမံရန်' },
    { id: 'box-driver-reset', name: '🔑 ယာဉ်မောင်း စကားဝှက် ပြန်လည်သတ်မှတ်ရန်' },
    { id: 'box-manual-saving', name: '🛠 စုဆောင်းငွေ တိုက်ရိုက်ပြင်ဆင်ရန် (Manual)' },
    { id: 'box-missing-locations', name: '📍 ဝန်ဆောင်မှုမရှိသေးသော နေရာများ' },
    { id: 'box-news-upload', name: '📰 သတင်းအသစ်တင်ရန်' },
    { id: 'box-news-list', name: '📋 လက်ရှိတင်ထားသော သတင်းများ' }
];

async function fetchPermissionMatrix() {
    const tbody = document.getElementById('permission-matrix-body');
    if (!tbody) return;

    try {
        const { data, error } = await _supabase.from('role_permissions').select('*');
        if (error) throw error;

        let adminPerms = data.find(d => d.role_name === 'admin')?.allowed_boxes || [];
        let operatorPerms = data.find(d => d.role_name === 'operator')?.allowed_boxes || [];

        tbody.innerHTML = '';
        featureList.forEach(feature => {
            let adminChecked = adminPerms.includes(feature.id) ? 'checked' : '';
            let operatorChecked = operatorPerms.includes(feature.id) ? 'checked' : '';

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="text-align: left; font-weight: bold; color: #444;">${feature.name}</td>
                    <td><input type="checkbox" class="cb-admin" value="${feature.id}" ${adminChecked} style="width: 18px; height: 18px; cursor: pointer;"></td>
                    <td><input type="checkbox" class="cb-operator" value="${feature.id}" ${operatorChecked} style="width: 18px; height: 18px; cursor: pointer;"></td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:red;">Error loading matrix: ${err.message}</td></tr>`;
    }
}

async function saveRolePermissions() {
    const btn = document.querySelector('#box-role-permissions .btn-primary');
    btn.innerHTML = "⏳ သိမ်းဆည်းနေပါသည်...";
    btn.disabled = true;

    // Admin အတွက် ရွေးချယ်ထားသော Box များကို စုစည်းခြင်း
    const adminBoxes = Array.from(document.querySelectorAll('.cb-admin:checked')).map(cb => cb.value);
    // Operator အတွက် ရွေးချယ်ထားသော Box များကို စုစည်းခြင်း
    const operatorBoxes = Array.from(document.querySelectorAll('.cb-operator:checked')).map(cb => cb.value);

    try {
        const { error: err1 } = await _supabase.from('role_permissions').update({ allowed_boxes: adminBoxes }).eq('role_name', 'admin');
        if (err1) throw err1;

        const { error: err2 } = await _supabase.from('role_permissions').update({ allowed_boxes: operatorBoxes }).eq('role_name', 'operator');
        if (err2) throw err2;

        alert("✅ သတ်မှတ်ချက်များ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။ ၎င်းတို့ နောက်တစ်ကြိမ် Login ဝင်သည့်အခါ စတင်အသက်ဝင်ပါမည်။");
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.innerHTML = "💾 သတ်မှတ်ချက်များ သိမ်းဆည်းမည်";
        btn.disabled = false;
    }
}

checkUser();


// =========================================
// 1. MISSING LOCATIONS (With Add Fare Button)
// =========================================
async function fetchMissingLocations() {
    try {
        const { data, error } = await _supabase
            .from('missing_locations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const listBody = document.getElementById('missing-locations-list');
        if (!listBody) return;

        listBody.innerHTML = '';
        if (!data || data.length === 0) {
            listBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">မှတ်တမ်းမရှိသေးပါ။</td></tr>';
            return;
        }

        data.forEach(item => {
            const date = new Date(item.created_at).toLocaleString();
            
            // Google Maps Links
            // let pickupLink = item.pickup_lat ? `<a href="https://www.google.com/maps?q=${item.pickup_lat},${item.pickup_lng}" target="_blank" style="color:#d9534f;text-decoration:none;">📍 Pickup Map</a>` : '-';
            let pickupLink = item.pickup_lat ? `<a href="https://maps.google.com/?q=${item.pickup_lat},${item.pickup_lng}" target="_blank" ...>📍 Pickup Map</a>` : '-';
            let dropoffLink = item.destination_lat ? `<a href="https://www.google.com/maps?q=${item.destination_lat},${item.destination_lng}" target="_blank" style="color:#008450;text-decoration:none;">🏁 Dropoff Map</a>` : '-';

            listBody.innerHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; font-size: 0.85rem; color:#555;">${date}</td>
                    <td style="padding: 12px;">${pickupLink}</td>
                    <td style="padding: 12px;">${dropoffLink}</td>
                    <td style="padding: 12px; display:flex; gap:5px;">
                        <button onclick="openFareModal()" 
                            style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                            ➕ Add Fare
                        </button>
                        
                        <button onclick="deleteMissingLocation(${item.id})" 
                            style="background: #ff4d4d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}


// Modal ဖွင့်လျှင် Form ပြန်ရှင်းမည်
function openFareModal() {
    document.getElementById('fare-modal').style.display = 'flex';
    document.getElementById('fare-pickup').value = '';
    document.getElementById('fare-dropoff').value = '';
    document.getElementById('fare-price').value = '';
    document.getElementById('fare-extra').value = '';
    document.getElementById('fare-remarks').value = ''; 
}


function closeFareModal() {
    document.getElementById('fare-modal').style.display = 'none';
}


// Data သိမ်းဆည်းမည်
async function saveNewFare() {
    const pickup = document.getElementById('fare-pickup').value;
    const dropoff = document.getElementById('fare-dropoff').value;
    const price = document.getElementById('fare-price').value;
    const extra = document.getElementById('fare-extra').value;
    const remarks = document.getElementById('fare-remarks').value; 
    const serviceType = document.getElementById('fare-service-type').value;

    if (!pickup || !dropoff || !price) {
        alert("ကျေးဇူးပြု၍ နေရာနှင့် ဈေးနှုန်းများကို ပြည့်စုံစွာဖြည့်ပါ");
        return;
    }

    const btn = document.querySelector('#fare-modal .btn-primary');
    btn.innerText = "Saving...";
    btn.disabled = true;

    // Supabase Insert
    const { error } = await _supabase
        .from('fare_prices')
        .insert([{
            pickup_zone: pickup,
            dropoff_zone: dropoff,
            base_fare: price,
            extra_pickup_fee: extra || 0,
            service_type: serviceType,
            remarks: remarks || null,
            is_active: true
        }]);

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("ဈေးနှုန်းအသစ် သတ်မှတ်ပြီးပါပြီ ✅");
        closeFareModal();
    }

    btn.innerText = "💾 သိမ်းဆည်းမည်";
    btn.disabled = false;
}

async function deleteMissingLocation(id) {
    if (confirm("ဤမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?")) {
        const { error } = await _supabase.from('missing_locations').delete().eq('id', id);
        if (error) {
            alert("Error: " + error.message);
        } else {
            fetchMissingLocations();
        }
    }
}

// Page ပွင့်တာနဲ့ Missing Locations ကို ချက်ချင်းဆွဲတင်ရန်
document.addEventListener('DOMContentLoaded', () => {
    fetchMissingLocations();
});

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!navigator.onLine) {
            errorMsg.innerText = "အင်တာနက်လိုင်း မရှိပါ။ ကျေးဇူးပြု၍ လိုင်းစစ်ဆေးပြီး ပြန်လည်ကြိုးစားပါ။";
            errorMsg.style.display = "block";
            return;
        }

        const submitBtn = loginForm.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.innerHTML = "စစ်ဆေးနေပါသည်... <span class='spinner'></span>";

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
            
            if (error) {
                // Error စာသားများကို မြန်မာလို ပြောင်းလဲပြသခြင်း
                let myanmarError = "ဝင်ရောက်၍မရပါ။ စကားဝှက် သို့မဟုတ် အီးမေးလ် မှားယွင်းနေပါသည်။";
                if (error.message.includes("fetch")) myanmarError = "အင်တာနက်ချိတ်ဆက်မှု နှေးကွေးနေပါသည်။ ပြန်လည်ကြိုးစားပါ။";
                
                errorMsg.innerText = myanmarError;
                errorMsg.style.display = "block";
                submitBtn.disabled = false;
                submitBtn.innerText = "Login ဝင်မည်";
            } else {
                window.location.href = "admin-panel.html";
            }
        } catch (err) {
            errorMsg.innerText = "စနစ်ချို့ယွင်းမှုရှိပါသည်- အင်တာနက်လိုင်းကို စစ်ဆေးပါ။";
            errorMsg.style.display = "block";
            submitBtn.disabled = false;
            submitBtn.innerText = "Login ဝင်မည်";
        }
    });
}

// ဈေးနှုန်းဟောင်းများကို Load လုပ်ခြင်း
async function loadCityFareSettings() {
    const { data, error } = await _supabase.from('city_fare_settings').select('*').eq('id', 1).single();
    if (data) {
        document.getElementById('city-base-fare').value = data.base_fare;
        document.getElementById('city-base-km').value = data.base_km;
        document.getElementById('city-per-km').value = data.per_km;
    }
}

// ဈေးနှုန်းအသစ် သိမ်းဆည်းခြင်း
async function updateCityFare() {
    const baseFare = document.getElementById('city-base-fare').value;
    const baseKm = document.getElementById('city-base-km').value;
    const perKm = document.getElementById('city-per-km').value;

    const { error } = await _supabase.from('city_fare_settings').update({
        base_fare: baseFare,
        base_km: baseKm,
        per_km: perKm,
        updated_at: new Date()
    }).eq('id', 1);

    if (error) {
        alert("Error updating fare: " + error.message);
    } else {
        alert("မြို့တွင်းခရီးစဉ် ဈေးနှုန်းကို အောင်မြင်စွာ ပြောင်းလဲပြီးပါပြီ။");
    }
}

async function handleUpload() {
    const title = document.getElementById('news-title').value;
    const content = document.getElementById('news-content').value;
    const imageFiles = document.getElementById('news-image').files;
    const statusDiv = document.getElementById('status');

    if (!title || !content) {
        alert("ခေါင်းစဉ်နှင့် အကြောင်းအရာ ပြည့်စုံစွာ ဖြည့်ပါ");
        return;
    }

    statusDiv.innerHTML = '<div class="spinner"></div> တင်နေပါသည်...';

    try {
        let imageUrls = [];
        
        if (imageFiles && imageFiles.length > 0) {
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
                const filePath = `news-images/${fileName}`;

                const { data, error: uploadError } = await _supabase.storage
                    .from('news-images')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = _supabase.storage
                    .from('news-images')
                    .getPublicUrl(filePath);
                
                imageUrls.push(publicUrlData.publicUrl);
            }
        }

        const { error: insertError } = await _supabase
            .from('news')
            .insert([{
                title: title,
                content: content,
                image_url: imageUrls.length > 0 ? imageUrls[0] : null,
                all_images: imageUrls
            }]);

        if (insertError) throw insertError;

        alert("သတင်းတင်ခြင်း အောင်မြင်ပါသည်");
        location.reload(); 

    } catch (err) {
        console.error("Upload Error:", err);
        statusDiv.innerHTML = `<span style="color:red;">Error: ${err.message}</span>`;
    }
}

async function logout() {
    await _supabase.auth.signOut();
    window.location.href = "login.html";
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAdminNews(); 
});

let newsList = []; 

document.addEventListener('DOMContentLoaded', fetchAdminNews);

async function fetchApprovedPartners() {
    const tbody = document.getElementById('approved-partners-list');
    if (!tbody) return; 

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    const { data, error } = await _supabase
        .from('profiles')
        .select('id, full_name, phone_number, status, pmt_vehicles(id, vehicle_no, vehicle_model, status)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Error: ${error.message}</td></tr>`;
        return;
    }
    
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">အတည်ပြုထားသော Partner မရှိသေးပါ</td></tr>';
        return;
    }

    data.forEach(p => {
        let vehiclesHTML = '<span style="color:#999; font-size:0.9rem;">- No Vehicle -</span>';
          
        // if (p.pmt_vehicles && p.pmt_vehicles.length > 0) {
        //     vehiclesHTML = p.pmt_vehicles.map(v => 
        //         `<span style="background:#e3f2fd; color:#0d47a1; padding:3px 8px; border-radius:4px; font-size:0.85rem; margin-right:5px; display:inline-block; border:1px solid #bbdefb;">
        //             🚗 ${v.vehicle_no}
        //             <span onclick="removeSingleVehicle('${v.id}', '${v.vehicle_no}')" style="color: #e74c3c; margin-left: 6px; cursor: pointer; font-weight: bold; font-size: 1rem; line-height: 1;" title="ဤကားကို ဖယ်ရှားမည်">&times;</span>
        //         </span>`
        //     ).join('');
        // } 
        if (p.pmt_vehicles && p.pmt_vehicles.length > 0) {
            // 🌟 Archived မဟုတ်သော ကားများကိုသာ စစ်ထုတ်ယူမည် 🌟
            const activeVehicles = p.pmt_vehicles.filter(v => v.status !== 'archived');
            
            if (activeVehicles.length > 0) {
                vehiclesHTML = activeVehicles.map(v => 
                    `<span style="background:#e3f2fd; color:#0d47a1; padding:3px 8px; border-radius:4px; font-size:0.85rem; margin-right:5px; display:inline-block; border:1px solid #bbdefb; margin-bottom:5px;">
                        🚗 ${v.vehicle_no}
                        <span onclick="openVehicleActionModal('${v.id}', '${v.vehicle_no}')" style="color: #e74c3c; margin-left: 6px; cursor: pointer; font-weight: bold; font-size: 1rem; line-height: 1;" title="ယာဉ်စီမံရန်">&times;</span>
                    </span>`
                ).join('');
            }
        }
        
        // const row = document.createElement('tr');
        // row.innerHTML = `
        //     <td><strong>${p.full_name}</strong></td>
        //     <td>${p.phone_number}</td>
        //     <td><span style="background:#d4edda; color:#155724; padding:2px 8px; border-radius:10px; font-size:0.8rem;">Approved</span></td>
        //     <td>${vehiclesHTML}</td>
        //     <td style="display: flex; gap: 8px; align-items: center; border-bottom: none;">
        //         <button onclick="openVehicleModal('${p.id}', '${p.full_name}')" style="background: #008450; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; height: 35px; white-space: nowrap;">➕ Add</button>
        //         <button onclick="openPasswordModal('${p.id}', '${p.full_name}')" style="background: #f39c12; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; height: 35px; white-space: nowrap;">🔑 Pass</button>
                
        //         <button onclick="removePartner('${p.id}')" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; height: 35px; white-space: nowrap;">🗑️ ဖျက်မည်</button>
        //     </td>
        // `;
        // tbody.appendChild(row);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${p.full_name}</strong></td>
            <td>${p.phone_number}</td>
            <td><span style="background:#d4edda; color:#155724; padding:2px 8px; border-radius:10px; font-size:0.8rem;">Approved</span></td>
            <td>${vehiclesHTML}</td>
            <td style="display: flex; gap: 8px; align-items: center; border-bottom: none;">
                <button onclick="openVehicleModal('${p.id}', '${p.full_name}')" style="background: #008450; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; height: 35px; white-space: nowrap;">➕ Add</button>
                <button onclick="openPasswordModal('${p.id}', '${p.full_name}')" style="background: #f39c12; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; height: 35px; white-space: nowrap;">🔑 Pass</button>
                
                <button onclick="resetDeviceLock('${p.id}', '${p.full_name}')" style="background: #8e44ad; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; height: 35px; white-space: nowrap;" title="ဖုန်း/စက် Lock ကို ဖြုတ်ပေးမည်">🔓 Unlock</button>

                <button onclick="removePartner('${p.id}')" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; height: 35px; white-space: nowrap;">🗑️ ဖျက်မည်</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ၁။ Modal ကို ဖွင့်ပြီး ပိုင်ရှင်စာရင်း ဆွဲယူမည်
async function openVehicleActionModal(vehicleId, vehicleNo) {
    const modal = document.getElementById('vehicle-action-modal');
    if(!modal) return;

    document.getElementById('action-vehicle-id').value = vehicleId;
    document.getElementById('action-vehicle-no').innerText = vehicleNo;
    
    const ownerSelect = document.getElementById('transfer-owner-select');
    ownerSelect.innerHTML = '<option value="">ဆွဲယူနေပါသည်...</option>';
    
    // 🌟 အသစ်ပြင်ဆင်ချက်: Modal ကို အရင်ဖွင့်ပြမည် 🌟
    modal.style.display = 'flex';
    
    try {
        const { data, error } = await _supabase
            .from('profiles')
            .select('id, full_name, phone_number')
            .eq('status', 'approved')
            .order('full_name');
            
        if (error) throw error;
        
        ownerSelect.innerHTML = '<option value="">ပိုင်ရှင်သစ် ရွေးချယ်ပါ...</option>';
        data.forEach(p => {
            ownerSelect.innerHTML += `<option value="${p.id}">${p.full_name} (${p.phone_number})</option>`;
        });
    } catch (err) {
        ownerSelect.innerHTML = '<option value="">Error loading partners</option>';
    }
}

// 🌟 အသစ်ပြင်ဆင်ချက်: Modal ကို ပိတ်မည် 🌟
function closeVehicleActionModal() {
    document.getElementById('vehicle-action-modal').style.display = 'none';
}

// Modal ကို ပိတ်မည်
// function closeVehicleActionModal() {
//     document.getElementById('vehicle-action-modal').classList.add('hidden');
// }
// ============================================
// 🌟 Modal ပြန်ပိတ်မည့် Function 
// ============================================
// function closeVehicleActionModal() {
//     const modal = document.getElementById('vehicle-action-modal');
//     if (modal) {
//         modal.style.display = 'none';
//     }
// }

// ၂။ 🔄 ပိုင်ရှင်သစ်ထံ လွှဲပြောင်းခြင်း (Transfer)
async function transferVehicle() {
    const vehicleId = document.getElementById('action-vehicle-id').value;
    const newOwnerId = document.getElementById('transfer-owner-select').value;
    const vehicleNo = document.getElementById('action-vehicle-no').innerText;
    
    if (!newOwnerId) return alert("ကျေးဇူးပြု၍ ပိုင်ရှင်သစ်ကို ရွေးချယ်ပါ။");
    if (!confirm(`[ ${vehicleNo} ] အား ပိုင်ရှင်သစ်ထံသို့ အပြီးအပိုင် လွှဲပြောင်းမည်မှာ သေချာပါသလား?`)) return;

    try {
        const { error } = await _supabase.from('pmt_vehicles').update({ profile_id: newOwnerId }).eq('id', vehicleId);
        if (error) throw error;
        
        alert("✅ ယာဉ်နှင့် မှတ်တမ်းများကို ပိုင်ရှင်သစ်ထံသို့ အောင်မြင်စွာ လွှဲပြောင်းပေးလိုက်ပါပြီ။");
        closeVehicleActionModal();
        fetchApprovedPartners(); // ဇယားကို Refresh လုပ်မည်
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ၃။ 📦 စာရင်းမှ အပြီးနားခြင်း (Archive - Soft Delete)
async function archiveVehicle() {
    const vehicleId = document.getElementById('action-vehicle-id').value;
    const vehicleNo = document.getElementById('action-vehicle-no').innerText;
    
    if (!confirm(`⚠️ [ ${vehicleNo} ] အား ယာဉ်စာရင်းမှ အပြီးနားမည် (Archive) မှာ သေချာပါသလား?\n\n(ယခင်စာရင်းဟောင်းများ ဆက်လက်တည်ရှိနေမည်ဖြစ်သော်လည်း ဤကားအား စနစ်တွင် ထပ်မံရွေးချယ်၍ ရတော့မည်မဟုတ်ပါ။)`)) return;

    try {
        const { error } = await _supabase.from('pmt_vehicles').update({ status: 'archived' }).eq('id', vehicleId);
        if (error) throw error;
        
        alert("✅ ယာဉ်အား Archive စာရင်းသို့ အောင်မြင်စွာ ရွှေ့ပြောင်းလိုက်ပါပြီ။");
        closeVehicleActionModal();
        fetchApprovedPartners(); // ဇယားကို Refresh လုပ်မည်
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ============================================
// 🗑️ Partner အား ဖယ်ရှားမည့် Function (Soft Delete)
// ============================================
async function removePartner(partnerId) {
    if(!confirm("ဤ Partner အကောင့်ကို ဖယ်ရှားမည်မှာ သေချာပါသလား? \n(စာရင်းဇယားများ မပျက်စီးစေရန် အကောင့်ကိုသာ ပိတ်သိမ်းပါမည်)")) return;
    
    try {
        // 🌟 အပြီးတိုင်မဖျက်တော့ဘဲ status ကို 'banned' လို့ ပြောင်းလိုက်ပါမည် 🌟
        const { error } = await _supabase.from('profiles').update({ status: 'banned' }).eq('id', partnerId);
        
        if (error) throw error;
        
        alert("✅ Partner အကောင့်ကို အောင်မြင်စွာ ဖယ်ရှားလိုက်ပါပြီ။");
        fetchApprovedPartners(); // ဇယားကို Refresh ပြန်လုပ်မည်
        
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ၁။ သတင်းများ ဆွဲယူပြသခြင်း
async function fetchAdminNews() {
    const container = document.getElementById('admin-news-list');
    if (!container) return;

    container.innerHTML = '<p>Loading news...</p>';

    const { data, error } = await _supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
        return;
    }

    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color:#666;">သတင်းများ မရှိသေးပါ</p>';
        return;
    }

    data.forEach(news => {
        const item = document.createElement('div');
        item.style.background = "#fff";
        item.style.border = "1px solid #ddd";
        item.style.padding = "15px";
        item.style.marginBottom = "10px";
        item.style.borderRadius = "8px";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "start";

        const safeTitle = news.title.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const safeContent = news.content.replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " ");

        item.innerHTML = `
            <div style="flex-grow: 1; padding-right: 20px;">
                <h4 style="margin: 0 0 5px 0; color: #008450;">${news.title}</h4>
                <small style="color: #888;">📅 ${new Date(news.created_at).toLocaleDateString()}</small>
                <p style="margin: 5px 0; color: #555; font-size: 0.9rem;">${news.content.substring(0, 100)}...</p>
            </div>
            
            <div style="min-width: 160px; text-align: right;">
                <button onclick="openEditModal('${news.id}', '${safeContent}')" 
                    style="background: #f1c40f; color: #333; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-weight: bold;">
                    ✏️ ပြင်
                </button>

                <button onclick="deleteNews('${news.id}')" 
                    style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    🗑️ ဖျက်
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

// ၂။ သတင်းဖျက်ခြင်း
async function deleteNews(id) {
    if (!confirm("ဤသတင်းကို ဖျက်ရန် သေချာပါသလား?")) return;

    const { error } = await _supabase.from('news').delete().eq('id', id);

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("သတင်းကို ဖျက်လိုက်ပါပြီ");
        fetchAdminNews(); 
    }
}

// ၃။ ပြင်ဆင်ရန် Modal ဖွင့်ခြင်း
function openEditModal(id, content) {
    const modal = document.getElementById('edit-modal');
    if(modal) {
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-content').value = content; 
        modal.style.display = 'flex';
    } else {
        alert("Edit Modal မတွေ့ပါ");
    }
}

// ၄။ သတင်းပြင်ဆင်ပြီး သိမ်းခြင်း
async function updateNews() {
    const id = document.getElementById('edit-id').value;
    const newContent = document.getElementById('edit-content').value;

    if (!newContent) return alert("အကြောင်းအရာ ရေးပါ");

    const btn = document.querySelector('#edit-modal .btn-primary');
    btn.innerText = "Saving...";

    const { error } = await _supabase.from('news').update({ content: newContent }).eq('id', id);

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("ပြင်ဆင်ပြီးပါပြီ");
        closeEdit();
        fetchAdminNews();
    }
    btn.innerText = "💾 သိမ်းဆည်းမည်";
}

function closeEdit() {
    document.getElementById('edit-modal').style.display = 'none';
}

// ============================================
// ၂။ Vehicle Modal Logic
// ============================================
async function openVehicleModal(partnerId, partnerName) {
    document.getElementById('vehicle-modal').style.display = 'flex';
    document.getElementById('modal-partner-name').innerText = partnerName;
    document.getElementById('modal-partner-id').value = partnerId;

    document.getElementById('new-vehicle-no').value = '';
    document.getElementById('new-vehicle-model').value = '';
    
    loadExistingVehicles(partnerId);
}

async function loadExistingVehicles(partnerId) {
    const list = document.getElementById('existing-vehicles-list');
    list.innerHTML = '<li>Loading...</li>';

    const { data, error } = await _supabase.from('pmt_vehicles').select('*').eq('profile_id', partnerId);

    if (!error) {
        list.innerHTML = '';
        if (data.length === 0) {
            list.innerHTML = '<li style="color:#888;">ယာဉ်စာရင်း မရှိသေးပါ</li>';
        } else {
            data.forEach(v => {
                list.innerHTML += `<li style="margin-bottom:5px;">
                    <strong>${v.vehicle_no}</strong> - ${v.vehicle_model} 
                    <span style="color:blue; font-size:0.8em;">[ID: ${v.id}]</span>
                </li>`;
            });
        }
    }
}

async function addNewVehicle() {
    const partnerId = document.getElementById('modal-partner-id').value;
    const vNo = document.getElementById('new-vehicle-no').value.trim();
    const vModel = document.getElementById('new-vehicle-model').value.trim();

    if (!vNo || !vModel) return alert("အချက်အလက် ပြည့်စုံစွာဖြည့်ပါ");

    const btn = document.querySelector('#vehicle-modal .btn-primary');
    btn.innerText = "Saving...";
    btn.disabled = true;

    const { error } = await _supabase.from('pmt_vehicles').insert([{
        profile_id: partnerId,
        vehicle_no: vNo,
        vehicle_model: vModel,
        status: 'approved'
    }]);

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("ယာဉ်စာရင်း ထည့်သွင်းပြီးပါပြီ");
        document.getElementById('new-vehicle-no').value = '';
        document.getElementById('new-vehicle-model').value = '';
        loadExistingVehicles(partnerId); 
    }
    btn.innerText = "💾 ယာဉ်စာရင်းသွင်းမည်";
    btn.disabled = false;
}

function closeVehicleModal() {
    document.getElementById('vehicle-modal').style.display = 'none';
}

// ============================================
// Password Change Logic 
// ============================================
function openPasswordModal(id, name) {
    document.getElementById('password-modal').style.display = 'flex';
    document.getElementById('pwd-partner-name').innerText = name;
    document.getElementById('pwd-partner-id').value = id;
    document.getElementById('new-password').value = '';
}

function closePasswordModal() {
    document.getElementById('password-modal').style.display = 'none';
}

async function changePartnerPassword() {
    const partnerId = document.getElementById('pwd-partner-id').value;
    const newPass = document.getElementById('new-password').value;

    if (newPass.length < 6) return alert("Password အနည်းဆုံး ၆ လုံး ရှိရပါမည်။");

    const btn = document.querySelector('#password-modal .btn-primary');
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        // ၁။ Admin ၏ လုံခြုံရေး Token ကို ယူမည်
        const { data: { session } } = await _supabase.auth.getSession();
        
        // ၂။ ဝန်ထမ်း Password ပြောင်းသည့် Cloud Function ကို အသုံးပြုမည် 
        // (Partner များသည်လည်း Auth User များဖြစ်သဖြင့် ဤ Function ကို အသုံးပြုနိုင်ပါသည်)
        const functionUrl = "https://reset-staff-pwd-q6ehdtlmra-as.a.run.app";
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}` // Admin Token ထည့်သွင်းခြင်း
            },
            body: JSON.stringify({ userId: partnerId, newPassword: newPass })
        });

        const result = await response.json();

        if (response.ok) {
            alert("✅ Partner ၏ Password ကို အောင်မြင်စွာ ပြောင်းလဲပြီးပါပြီ။");
            closePasswordModal();
        } else {
            throw new Error(result.error || "Password ပြောင်းလဲခြင်း မအောင်မြင်ပါ။");
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.innerText = "💾 Password ပြောင်းမည်";
        btn.disabled = false;
    }
}

// ==========================================
// 🎉 PROMOTION MANAGEMENT (DYNAMIC)
// ==========================================
async function savePromotion() {
    const code = document.getElementById('promo-code').value.trim();
    const name = document.getElementById('promo-name').value.trim();
    const price = document.getElementById('promo-price').value;
    const oriPrice = document.getElementById('promo-ori-price').value || null;
    const start = document.getElementById('promo-start').value;
    const end = document.getElementById('promo-end').value;
    const remark = document.getElementById('promo-remark').value.trim();

    if (!code || !name || !price || !start || !end) {
        alert("ကျေးဇူးပြု၍ လိုအပ်သော အချက်အလက်များ ပြည့်စုံစွာ ထည့်ပါ။");
        return;
    }

    try {
        const { error } = await _supabase.from('promotions').insert([{
            route_code: code,
            route_name: name,
            promo_price: parseFloat(price),
            original_price: oriPrice ? parseFloat(oriPrice) : null,
            start_date: start,
            end_date: end,
            remark: remark,
            is_active: true
        }]);

        if (error) throw error;
        
        alert("✅ ပရိုမိုရှင်းအသစ် အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။");
        
        document.getElementById('promo-code').value = '';
        document.getElementById('promo-name').value = '';
        document.getElementById('promo-price').value = '';
        document.getElementById('promo-ori-price').value = '';
        document.getElementById('promo-start').value = '';
        document.getElementById('promo-end').value = '';
        document.getElementById('promo-remark').value = '';

        fetchPromotions(); 

    } catch (error) {
        alert("Error: " + error.message);
    }
}

async function fetchPromotions() {
    const tbody = document.getElementById('promo-list');
    if(!tbody) return;

    try {
        const { data, error } = await _supabase.from('promotions').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">ပရိုမိုရှင်း မရှိသေးပါ။</td></tr>';
            return;
        }

        data.forEach(p => {
            const statusBadge = p.is_active 
                ? `<span style="background:#e6f4ea; color:#1e8e3e; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:bold;">Active</span>`
                : `<span style="background:#fce8e6; color:#d93025; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:bold;">Inactive</span>`;
            
            const actionBtn = p.is_active
                ? `<button onclick="togglePromoStatus('${p.id}', false)" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px;">ပိတ်မည် (Disable)</button>`
                : `<button onclick="togglePromoStatus('${p.id}', true)" style="background:#2ecc71; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px;">ဖွင့်မည် (Enable)</button>`;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${p.route_name}</strong><br><small style="color:#7f8c8d;">${p.route_code}</small></td>
                    <td><span style="color:#d35400; font-weight:bold;">${p.promo_price.toLocaleString()} Ks</span><br>
                        ${p.original_price ? `<del style="font-size:11px; color:#999;">${p.original_price.toLocaleString()} Ks</del>` : ''}
                    </td>
                    <td style="font-size:13px;">${p.start_date} မှ<br>${p.end_date} ထိ</td>
                    <td>${statusBadge}</td>
                    <td>${actionBtn} <button onclick="deletePromo('${p.id}')" style="background:transparent; color:#c0392b; border:1px solid #c0392b; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px; margin-left:5px;">🗑️ ဖျက်မည်</button></td>
                </tr>
            `;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Error loading promotions.</td></tr>';
    }
}

async function togglePromoStatus(id, newStatus) {
    try {
        const { error } = await _supabase.from('promotions').update({ is_active: newStatus }).eq('id', id);
        if (error) throw error;
        fetchPromotions();
    } catch (error) {
        alert("Status change error: " + error.message);
    }
}

async function deletePromo(id) {
    if(!confirm("ဤပရိုမိုရှင်းကို အပြီးတိုင်ဖျက်မည်မှာ သေချာပါသလား?")) return;
    try {
        const { error } = await _supabase.from('promotions').delete().eq('id', id);
        if (error) throw error;
        fetchPromotions();
    } catch (error) {
        alert("Delete error: " + error.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(fetchPromotions, 1000); 
});

// ==========================================
// 🗺️ SPECIAL PACKAGES (JSONB) MANAGEMENT
// ==========================================
let specialPackagesData = []; // Data မှတ်သားရန် ကိန်းရှင်ကြေညာခြင်း

// စာမျက်နှာပွင့်တာနဲ့ ခရီးစဉ်များကို အလိုအလျောက် ဆွဲယူပြသရန်
document.addEventListener('DOMContentLoaded', () => {
    fetchSpecialPackages();
});


// ... (အောက်က မူလကုဒ်များကို အတိုင်းဆက်ထားပါ) ...
function addSpOptionRow() {
    const container = document.getElementById('sp-options-container');
    const row = document.createElement('div');
    row.className = 'sp-option-row';
    row.style.cssText = "display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: #fdfefe; padding: 10px; border: 1px solid #ebdef0; border-radius: 5px;";
    
    row.innerHTML = `
        <div style="flex: 2;"><input type="text" class="opt-label" placeholder="Option အမည် (ဥပမာ- ၁ ညအိပ်)" style="width:100%; padding:8px;"></div>
        <div style="flex: 1;"><input type="number" class="opt-price" placeholder="ဈေးနှုန်း" style="width:100%; padding:8px;"></div>
        <div style="flex: 1; display:flex; align-items:center; gap:5px;">
            <input type="checkbox" class="opt-return" style="width:16px; height:16px;"> 
            <label style="margin:0; font-size:12px;">အပြန်ရက်တောင်းမည် (Return Trip)</label>
        </div>
        <button onclick="this.parentElement.remove()" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">❌</button>
    `;
    container.appendChild(row);
}

async function saveSpecialPackage() {
    const name = document.getElementById('sp-name').value.trim();
    const basePrice = document.getElementById('sp-base').value;

    if (!name || !basePrice) return alert("ခရီးစဉ်အမည် နှင့် Base Price ကို ထည့်ပါ။");

    const optionRows = document.querySelectorAll('.sp-option-row');
    let pricingOptions = [];
    
    optionRows.forEach(row => {
        const label = row.querySelector('.opt-label').value.trim();
        const price = row.querySelector('.opt-price').value;
        const isReturn = row.querySelector('.opt-return').checked;
        
        if (label && price) {
            pricingOptions.push({
                label: label,
                price: parseFloat(price),
                is_return: isReturn
            });
        }
    });

    try {
        const { error } = await _supabase.from('special_packages').insert([{
            package_name: name,
            base_price: parseFloat(basePrice),
            pricing_options: pricingOptions.length > 0 ? pricingOptions : null 
        }]);

        if (error) throw error;
        
        alert("✅ အထူးခရီးစဉ် အသစ်သိမ်းဆည်းပြီးပါပြီ။");
        
        document.getElementById('sp-name').value = '';
        document.getElementById('sp-base').value = '';
        document.getElementById('sp-options-container').innerHTML = '';
        
        fetchSpecialPackages(); 
    } catch (error) {
        alert("Error: " + error.message);
    }
}

async function fetchSpecialPackages() {
    const tbody = document.getElementById('sp-list');
    if(!tbody) return;

    try {
        const { data, error } = await _supabase.from('special_packages').select('*').order('id', { ascending: false });
        if (error) throw error;

        specialPackagesData = data; 
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">ခရီးစဉ် မရှိသေးပါ။</td></tr>';
            return;
        }

        data.forEach(p => {
            let optionsCount = 0;
            if (p.pricing_options) {
                try {
                    const opts = typeof p.pricing_options === 'string' ? JSON.parse(p.pricing_options) : p.pricing_options;
                    if (Array.isArray(opts)) optionsCount = opts.length;
                } catch(e) {}
            }

            tbody.innerHTML += `
                <tr>
                    <td><strong>${p.package_name}</strong></td>
                    <td>${parseInt(p.base_price).toLocaleString()} Ks</td>
                    <td><span style="background:#e8daef; color:#6c3483; padding:3px 8px; border-radius:10px; font-size:12px;">${optionsCount} Options</span></td>
                    <td style="min-width: 140px;">
                        <button onclick="openEditSpModal(${p.id})" style="background:#f1c40f; color:#333; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; margin-right:5px; font-weight:bold;">✏️ Edit</button>
                        <button onclick="deleteSpecialPackage(${p.id})" style="background:transparent; color:#c0392b; border:1px solid #c0392b; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px;">🗑️ ဖျက်မည်</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) { console.error(error); }
}

async function deleteSpecialPackage(id) {
    if(!confirm("ဤခရီးစဉ်ကို အပြီးတိုင်ဖျက်မည်မှာ သေချာပါသလား?")) return;
    try {
        const { error } = await _supabase.from('special_packages').delete().eq('id', id);
        if (error) throw error;
        fetchSpecialPackages();
    } catch (error) {
        alert("Delete error: " + error.message);
    }
}

// ==========================================
// 🌟 EDIT SPECIAL PACKAGE LOGIC 🌟
// ==========================================
function openEditSpModal(id) {
    const pkg = specialPackagesData.find(p => p.id === id);
    if(!pkg) return;
    
    document.getElementById('edit-sp-id').value = pkg.id;
    document.getElementById('edit-sp-name').value = pkg.package_name;
    document.getElementById('edit-sp-base').value = pkg.base_price;
    
    const container = document.getElementById('edit-sp-options-container');
    container.innerHTML = '';
    
    let opts = [];
    if (pkg.pricing_options) {
        opts = typeof pkg.pricing_options === 'string' ? JSON.parse(pkg.pricing_options) : pkg.pricing_options;
    }
    
    if (Array.isArray(opts)) {
        opts.forEach(opt => {
            addEditSpOptionRow(opt.label, opt.price, opt.is_return);
        });
    }
    
    document.getElementById('edit-sp-modal').style.display = 'flex';
}

function closeEditSpModal() {
    document.getElementById('edit-sp-modal').style.display = 'none';
}

function addEditSpOptionRow(label = '', price = '', isReturn = false) {
    const container = document.getElementById('edit-sp-options-container');
    const row = document.createElement('div');
    row.className = 'edit-sp-option-row';
    row.style.cssText = "display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 5px;";
    
    const checkedStr = isReturn ? 'checked' : '';
    
    row.innerHTML = `
        <div style="flex: 2;"><input type="text" class="opt-label" placeholder="Option အမည်" value="${label}" style="width:100%; padding:8px;"></div>
        <div style="flex: 1;"><input type="number" class="opt-price" placeholder="ဈေးနှုန်း" value="${price}" style="width:100%; padding:8px;"></div>
        <div style="flex: 1; display:flex; align-items:center; gap:5px;">
            <input type="checkbox" class="opt-return" style="width:16px; height:16px;" ${checkedStr}> 
            <label style="margin:0; font-size:12px;">အပြန်ရက်တောင်းမည်</label>
        </div>
        <button onclick="this.parentElement.remove()" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">❌</button>
    `;
    container.appendChild(row);
}

async function updateSpecialPackage() {
    const id = document.getElementById('edit-sp-id').value;
    const name = document.getElementById('edit-sp-name').value.trim();
    const basePrice = document.getElementById('edit-sp-base').value;

    if (!name || !basePrice) return alert("ခရီးစဉ်အမည် နှင့် Base Price ကို ထည့်ပါ။");

    const optionRows = document.querySelectorAll('.edit-sp-option-row');
    let pricingOptions = [];
    
    optionRows.forEach(row => {
        const label = row.querySelector('.opt-label').value.trim();
        const price = row.querySelector('.opt-price').value;
        const isReturn = row.querySelector('.opt-return').checked;
        
        if (label && price) {
            pricingOptions.push({ label, price: parseFloat(price), is_return: isReturn });
        }
    });

    try {
        const { error } = await _supabase.from('special_packages').update({
            package_name: name,
            base_price: parseFloat(basePrice),
            pricing_options: pricingOptions.length > 0 ? pricingOptions : null
        }).eq('id', id);

        if (error) throw error;
        
        alert("✅ ခရီးစဉ်ကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။");
        closeEditSpModal();
        fetchSpecialPackages(); 
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// ==========================================
// 👨‍✈️ PENDING DRIVERS MANAGEMENT (APPROVAL LOGIC)
// ==========================================
let pendingDriversData = [];

async function fetchPendingDrivers() {
    const tbody = document.getElementById('pending-drivers-list');
    if(!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading Pending Drivers...</td></tr>';

    try {
        const { data, error } = await _supabase
            .from('drivers')
            .select('*')
            .eq('admin_approved', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        pendingDriversData = data;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">ယာဉ်မောင်းအသစ် လျှောက်ထားမှု မရှိသေးပါ။</td></tr>';
            return;
        }

        data.forEach(d => {
            const tgStatus = d.telegram_chat_id 
                ? '<span style="background:#d4edda; color:#155724; padding:2px 8px; border-radius:10px; font-size:0.8rem;">✅ Connected</span>' 
                : '<span style="background:#f8d7da; color:#721c24; padding:2px 8px; border-radius:10px; font-size:0.8rem;">⏳ Waiting Bot</span>';

            tbody.innerHTML += `
                <tr>
                    <td><strong>${d.name}</strong></td>
                    <td>${d.phone_number}</td>
                    <td>${d.Drv_LicenNo} <span style="background:#e3f2fd; color:#0d47a1; padding:2px 6px; border-radius:4px; font-size:0.8rem; margin-left:5px;">Class ${d.licen_type}</span></td>
                    <td>${tgStatus}</td>
                    <td><button onclick="openDriverReviewModal('${d.id}')" style="background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: bold;">🔍 Review</button></td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
    }
}

// 🌟 Modal ပြသရန်
function openDriverReviewModal(id) {
    const drv = pendingDriversData.find(d => d.id === id);
    if (!drv) return;

    document.getElementById('rev-drv-id').value = drv.id;
    document.getElementById('rev-drv-name').innerText = drv.name;
    document.getElementById('rev-drv-phone').innerText = drv.phone_number;
    document.getElementById('rev-drv-nrc').innerText = drv.Drv_NRC;
    document.getElementById('rev-drv-licno').innerText = drv.Drv_LicenNo;
    document.getElementById('rev-drv-lictype').innerText = drv.licen_type;
    document.getElementById('rev-drv-licdate').innerText = drv.licen_validation_date || 'N/A';
    document.getElementById('rev-drv-tg').innerText = drv.telegram_chat_id ? drv.telegram_chat_id : 'Not Connected Yet';

    // 🌟 လိုင်စင် ရှေ့ဘက်ပုံ ပြသခြင်း 🌟
    const imgFrontEl = document.getElementById('rev-drv-img-front');
    const imgFrontNone = document.getElementById('rev-drv-img-front-none');
    if (drv.license_front_url) {
        imgFrontEl.src = drv.license_front_url;
        imgFrontEl.style.display = 'block';
        imgFrontNone.style.display = 'none';
    } else {
        imgFrontEl.style.display = 'none';
        imgFrontNone.style.display = 'block';
    }

    // 🌟 လိုင်စင် ကျောဘက်ပုံ ပြသခြင်း 🌟
    const imgBackEl = document.getElementById('rev-drv-img-back');
    const imgBackNone = document.getElementById('rev-drv-img-back-none');
    if (drv.license_back_url) {
        imgBackEl.src = drv.license_back_url;
        imgBackEl.style.display = 'block';
        imgBackNone.style.display = 'none';
    } else {
        imgBackEl.style.display = 'none';
        imgBackNone.style.display = 'block';
    }

    document.getElementById('driver-review-modal').style.display = 'flex';
}

// 🌟 Modal ပြန်ပိတ်ရန် 🌟
function closeDriverReviewModal() {
    document.getElementById('driver-review-modal').style.display = 'none';
}

// ၃။ အတည်ပြုခြင်း (Approve) နှင့် Account အလိုအလျောက် ဖွင့်ပေးခြင်း
async function approveDriver() {
    const id = document.getElementById('rev-drv-id').value;
    const tgChatId = document.getElementById('rev-drv-tg').innerText; 
    const phoneNo = document.getElementById('rev-drv-phone').innerText; // ဖုန်းနံပါတ်ကို ယူမည်

    if (!confirm("ဤယာဉ်မောင်းအား အတည်ပြုမည်မှာ သေချာပါသလား?")) return;

    try {
        // ၁။ Database တွင် အတည်ပြုကြောင်း Update လုပ်ခြင်း
        const { error } = await _supabase.from('drivers').update({ admin_approved: true }).eq('id', id);
        if (error) throw error;
        
        // ၂။ Google Cloud Function သို့လှမ်း၍ Account ဖွင့်ခိုင်းခြင်း & Telegram ပို့ခိုင်းခြင်း
        const gcfUrl = 'https://create-driver-account-818408786879.europe-west1.run.app'; // 🌟 Cloud Function URL ထည့်ပါ
        
        const response = await fetch(gcfUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone_number: phoneNo,
                telegram_chat_id: tgChatId
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert("✅ ယာဉ်မောင်းအား အတည်ပြုပြီး Account ဖွင့်ပေးလိုက်ပါပြီ။ Password ကို Telegram သို့ ပို့ထားပါသည်။");
        } else {
            alert("⚠️ အတည်ပြုပြီးပါပြီ။ သို့သော် Account ဖွင့်ရာတွင် အခက်အခဲရှိပါသည်။ (Error: " + result.error + ")");
        }

        closeDriverReviewModal();
        fetchPendingDrivers(); // ဇယားကို Refresh လုပ်မည်
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ၄။ ပယ်ဖျက်ခြင်း (Reject / Delete)
async function rejectDriver() {
    const id = document.getElementById('rev-drv-id').value;
    const tgChatId = document.getElementById('rev-drv-tg').innerText; 

    if (!confirm("⚠️ ဤလျှောက်လွှာကို ပယ်ဖျက်ပြီး အပြီးတိုင် ဖျက်ပစ်မည်မှာ သေချာပါသလား?")) return;

    try {
        // Telegram သို့ ပယ်ဖျက်ကြောင်း Message အရင်ပို့ခြင်း 
        if (tgChatId && tgChatId !== 'Not Connected Yet') {
            const botToken = 'YOUR_TELEGRAM_BOT_TOKEN'; // 🌟 ဤနေရာတွင် သင့် Bot Token အစစ်ကို ထည့်ပါ 🌟
            const message = "❌ တောင်းပန်ပါတယ်။ သင့်၏ ယာဉ်မောင်းလျှောက်လွှာအား အချက်အလက်မပြည့်စုံမှုကြောင့် ပယ်ဖျက်လိုက်ပါသည်။ ကျေးဇူးပြု၍ မှန်ကန်သောအချက်အလက်များဖြင့် ပြန်လည်လျှောက်ထားပေးပါ။";
            const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${tgChatId}&text=${encodeURIComponent(message)}`;
            
            await fetch(url).catch(err => console.error("Telegram API Error:", err));
        }

        const { error } = await _supabase.from('drivers').delete().eq('id', id);
        if (error) throw error;
        
        alert("❌ လျှောက်လွှာကို ပယ်ဖျက်လိုက်ပါပြီ။");
        closeDriverReviewModal();
        fetchPendingDrivers(); 
    } catch (err) {
        alert("Error: " + err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(fetchPendingDrivers, 1500); 
});
document.addEventListener('DOMContentLoaded', () => {
    fetchApprovedPartners();
});

// ============================================
// 🔑 Driver Password Reset Logic (စကားဝှက်ပြောင်းခြင်း)
// ============================================

// ၁။ Modal ကို ဖွင့်ပြီး ယာဉ်မောင်းစာရင်းကို ဆွဲယူမည်
async function openDriverResetModal() {
    document.getElementById('driver-reset-modal').style.display = 'flex';
    const select = document.getElementById('reset-driver-select');
    select.innerHTML = '<option value="">Loading...</option>';
    document.getElementById('reset-new-pwd').value = '';
    document.getElementById('reset-fine-amt').value = '5000'; // Default ဒဏ်ကြေး

    try {
        // အတည်ပြုပြီးသား ယာဉ်မောင်းများကိုသာ ရွေးမည်
        const { data, error } = await _supabase.from('drivers').select('id, name, phone_number').eq('admin_approved', true);
        if (error) throw error;
        
        select.innerHTML = '<option value="">ယာဉ်မောင်း ရွေးချယ်ပါ</option>';
        data.forEach(d => {
            select.innerHTML += `<option value="${d.id}" data-phone="${d.phone_number}">${d.name} (${d.phone_number})</option>`;
        });
    } catch(err) {
        select.innerHTML = '<option value="">Error loading drivers</option>';
    }
}

// ၂။ Modal ပြန်ပိတ်မည်
function closeDriverResetModal() {
    document.getElementById('driver-reset-modal').style.display = 'none';
}

// --- Password Reset API Call ---
async function submitDriverPasswordReset() {
    const driverId = document.getElementById('reset-driver-select').value;
    const newPassword = document.getElementById('reset-new-pwd').value;
    const fineAmount = document.getElementById('reset-fine-amt').value;
    const submitBtn = document.getElementById('reset-submit-btn');

    if (!driverId || !newPassword) {
        alert("ကျေးဇူးပြု၍ ယာဉ်မောင်းနှင့် စကားဝှက်အသစ်ကို ပြည့်စုံစွာ ထည့်ပါ။");
        return;
    }

    if (newPassword.length < 6) {
        alert("စကားဝှက် အသစ်သည် အနည်းဆုံး ဂဏန်း/စာလုံး ၆ လုံး ရှိရပါမည်။");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = "ပြင်ဆင်နေပါသည်... ⏳";

    try {
        // Admin ၏ လက်ရှိ JWT Token ကို ယူမည် (Backend သို့ ပို့ပြီး Admin ဟုတ်မဟုတ် စစ်ဆေးရန်)
        const { data: { session } } = await _supabase.auth.getSession();
        
        // မှတ်ချက် - ဤနေရာတွင် သင်၏ Google Cloud Function သို့မဟုတ် API URL ကို အစားထိုးပါ
        // const CLOUD_FUNCTION_URL = "https://asia-southeast1-tensile-nebula-476207-s8.cloudfunctions.net/driver-pwd-reset";
        const CLOUD_FUNCTION_URL = "https://driver-pwd-reset-q6ehdtlmra-as.a.run.app";

        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}` // Admin ၏ Token
            },
            body: JSON.stringify({
                targetUserId: driverId,
                newPassword: newPassword,
                fineAmount: fineAmount
            })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Password ပြင်ဆင်ခြင်း မအောင်မြင်ပါ။");

        alert("✅ စကားဝှက် ပြန်လည်သတ်မှတ်ခြင်း အောင်မြင်ပါသည်။ ဒဏ်ကြေးကိုလည်း ဖြတ်တောက်ပြီးပါပြီ။");
        closeDriverResetModal();

    } catch (err) {
        console.error("Password Reset Error:", err);
        alert(`❌ အမှားအယွင်းဖြစ်ပေါ်နေပါသည်- ${err.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "💾 အတည်ပြုမည်";
    }
}
// =========================================
// 🌟 DRIVER SAVING MANUAL OVERRIDE (ADMIN) 🌟
// =========================================

let allDriversList = [];

// Modal ဖွင့်ခြင်း နှင့် Driver List ဆွဲယူခြင်း
async function openManualSavingModal() {
    const modal = document.getElementById('manual-saving-modal');
    modal.style.display = 'flex';
    document.getElementById('ms-date').valueAsDate = new Date();
    
    const driverSelect = document.getElementById('ms-driver');
    driverSelect.innerHTML = '<option value="">ဆွဲယူနေပါသည်...</option>';

    try {
        const { data, error } = await _supabase.from('drivers').select('id, name').order('name');
        if (error) throw error;
        allDriversList = data || [];
        
        driverSelect.innerHTML = '<option value="">ယာဉ်မောင်း ရွေးချယ်ပါ</option>' + 
            allDriversList.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
            
    } catch (err) {
        driverSelect.innerHTML = '<option value="">Error Loading Drivers</option>';
    }
}

function closeManualSavingModal() {
    document.getElementById('manual-saving-modal').style.display = 'none';
    document.getElementById('ms-driver').value = '';
    document.getElementById('ms-in').value = '0';
    document.getElementById('ms-out').value = '0';
    document.getElementById('ms-balance').value = '0';
    document.getElementById('ms-remark').value = '';
}

// ယာဉ်မောင်းရွေးလိုက်ပါက လက်ရှိ Summary ကို လှမ်းပြပေးမည် (Admin ပြင်ရလွယ်စေရန်)
async function fetchCurrentSavingSummary() {
    const driverId = document.getElementById('ms-driver').value;
    if (!driverId) {
        document.getElementById('ms-in').value = '0';
        document.getElementById('ms-out').value = '0';
        document.getElementById('ms-balance').value = '0';
        return;
    }

    try {
        const { data } = await _supabase.from('driver_savings_summary').select('*').eq('driver_id', driverId).single();
        if (data) {
            document.getElementById('ms-in').value = data.total_amount_in || 0;
            document.getElementById('ms-out').value = data.total_amount_out || 0;
            document.getElementById('ms-balance').value = data.balance || 0;
        } else {
            document.getElementById('ms-in').value = '0';
            document.getElementById('ms-out').value = '0';
            document.getElementById('ms-balance').value = '0';
        }
    } catch (err) {
        console.log("No existing summary found for this driver.");
    }
}

// ဒေတာများ သိမ်းဆည်းခြင်း (Upsert & Transaction Log)
async function submitManualSaving(e) {
    e.preventDefault();
    
    if(!confirm("ဤကိန်းဂဏန်းများအတိုင်း ယာဉ်မောင်း၏ စုဆောင်းငွေစာရင်းကို အပြီးသတ် ပြောင်းလဲသတ်မှတ်မည်မှာ သေချာပါသလား?")) return;

    const btn = document.getElementById('ms-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> သိမ်းဆည်းနေပါသည်...';

    try {
        const date = document.getElementById('ms-date').value;
        const driverId = document.getElementById('ms-driver').value;
        const inAmt = parseFloat(document.getElementById('ms-in').value);
        const outAmt = parseFloat(document.getElementById('ms-out').value);
        const balAmt = parseFloat(document.getElementById('ms-balance').value);
        const remark = document.getElementById('ms-remark').value;

        // ၁။ Summary Table တွင် ရှိ/မရှိ အရင်ရှာမည်
        const { data: existingSummary } = await _supabase.from('driver_savings_summary').select('id').eq('driver_id', driverId).single();

        // ၂။ ရှိလျှင် Update လုပ်မည်၊ မရှိလျှင် Insert လုပ်မည်
        if (existingSummary) {
            await _supabase.from('driver_savings_summary')
                .update({ 
                    total_amount_in: inAmt, 
                    total_amount_out: outAmt, 
                    balance: balAmt, 
                    last_transaction_date: date 
                }).eq('id', existingSummary.id);
        } else {
            await _supabase.from('driver_savings_summary')
                .insert([{ 
                    driver_id: driverId, 
                    total_amount_in: inAmt, 
                    total_amount_out: outAmt, 
                    balance: balAmt, 
                    last_transaction_date: date 
                }]);
        }

        // ၃။ Audit Trail အတွက် Transaction ဇယားထဲတွင် မှတ်တမ်းတင်မည်
        // မှတ်ချက် - Admin Override ဖြစ်ကြောင်း သိသာစေရန် description တွင် တိတိကျကျ ရေးမှတ်ပါမည်
        await _supabase.from('driver_savings_transactions').insert([{
            driver_id: driverId,
            transaction_date: date,
            transaction_type: 'in', // Check constraint ကြောင့် 'in' အဖြစ်ထားပါသည်
            amount: balAmt, // Balance ကို amount အနေဖြင့် မှတ်ထားပါမည်
            description: `[Admin Override] ${remark} (Set Bal: ${balAmt})`
        }]);

        alert("✅ စုဆောင်းငွေ အချက်အလက်များကို အောင်မြင်စွာ ပြင်ဆင်သတ်မှတ်ပြီးပါပြီ။");
        closeManualSavingModal();

    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> အတည်ပြု သိမ်းဆည်းမည်';
    }
}

// ၁။ fetchStaffList ကို အစားထိုးရန်
async function fetchStaffList() {
    const tbody = document.getElementById('staff-list');
    if (!tbody) return;

    try {
        // allowed_pages ကိုပါ ထပ်မံဆွဲယူမည်
        const { data, error } = await _supabase
            .from('user_roles')
            .select('id, email, role, allowed_pages')
            .in('role', ['admin', 'operator', 'founder'])
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        tbody.innerHTML = '';
        data.forEach(staff => {
            const roleColor = staff.role === 'founder' ? '#e74c3c' : (staff.role === 'admin' ? '#f1c40f' : '#3498db');
            const allowedStr = encodeURIComponent(JSON.stringify(staff.allowed_pages || []));
            
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">${staff.email}</td>
                    <td style="padding: 10px;">
                        <span style="background: ${roleColor}; color: ${staff.role==='founder'?'white':'#333'}; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                            ${staff.role.toUpperCase()}
                        </span>
                    </td>                    
                    
                    <td style="padding: 10px; display:flex; gap:5px; align-items:center;">
                        ${staff.role !== 'founder' ? `
                            <button onclick="openPageAccessModal('${staff.id}', '${staff.email}', '${allowedStr}')" style="background: #f4ecf7; color: #8e44ad; border: 1px solid #8e44ad; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight:bold;">🌐 Access</button>
                            <button onclick="openStaffPwdModal('${staff.id}', '${staff.email}')" style="background: transparent; color: #f39c12; border: 1px solid #f39c12; padding: 4px 8px; border-radius: 4px; cursor: pointer;">🔑 Pass</button>
                            <button onclick="deleteStaff('${staff.id}')" style="background: transparent; color: #e74c3c; border: 1px solid #e74c3c; padding: 4px 8px; border-radius: 4px; cursor: pointer;">🗑️ ဖျက်မည်</button>
                        ` : `
                            <span style="color:#e74c3c; font-weight:bold; margin-right:10px;">🛡️ Super Admin</span>
                            <button onclick="openStaffPwdModal('${staff.id}', '${staff.email}')" style="background: transparent; color: #f39c12; border: 1px solid #f39c12; padding: 4px 8px; border-radius: 4px; cursor: pointer;">🔑 Pass</button>
                        `}
                    </td>
                    
                </tr>
            `;
        });
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
    }
}

function openPageAccessModal(id, email, allowedPagesStr) {
    const accessBox = document.getElementById('box-page-access');
    if (!accessBox) return;

    accessBox.style.display = 'block'; 
    accessBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

    document.getElementById('access-staff-email').innerText = email;
    document.getElementById('access-staff-id').value = id;
    
    let allowedPages = [];
    try { allowedPages = JSON.parse(decodeURIComponent(allowedPagesStr)); } catch(e){}
    
    document.querySelectorAll('.page-checkbox').forEach(cb => {
        cb.checked = allowedPages.includes(cb.value);
    });
}

function closePageAccessBox() { 
    document.getElementById('box-page-access').style.display = 'none'; 
}

async function savePageAccess() {
    const id = document.getElementById('access-staff-id').value;
    const checkboxes = document.querySelectorAll('.page-checkbox:checked');
    const allowedPages = Array.from(checkboxes).map(cb => cb.value);
    
    const btn = document.getElementById('btn-save-access');
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Saving..."; 
    btn.disabled = true;
    
    try {
        const { error } = await _supabase.from('user_roles').update({ allowed_pages: allowedPages }).eq('id', id);
        if (error) throw error;
        alert("✅ စာမျက်နှာ ဝင်ခွင့်ကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။");
        closePageAccessBox();
        fetchStaffList(); 
    } catch(e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerHTML = "💾 ဝင်ခွင့် သိမ်းဆည်းမည်"; 
        btn.disabled = false;
    }
}

async function createNewStaff() {
    const name = document.getElementById('staff-name').value.trim();
    const email = document.getElementById('staff-email').value.trim();
    const password = document.getElementById('staff-password').value;
    const role = document.getElementById('staff-role').value;
    const btn = document.getElementById('btn-create-staff');

    if (!email || !password) return alert("အီးမေးလ် နှင့် စကားဝှက် ပြည့်စုံစွာ ထည့်ပါ။");
    if (password.length < 6) return alert("စကားဝှက်သည် အနည်းဆုံး ၆ လုံး ရှိရပါမည်။");

    btn.disabled = true;
    btn.innerHTML = "⏳ အကောင့်ဖွင့်ပေးနေပါသည်...";

    try {
        // Admin (Founder) ၏ Token ယူမည်
        const { data: { session } } = await _supabase.auth.getSession();
        
        // နောက်တစ်ဆင့်တွင် ရေးသားမည့် Google Cloud Function URL အသစ်ကို ဤနေရာတွင် ထည့်ရမည်
        // const CLOUD_FUNCTION_URL = "https://asia-southeast1-tensile-nebula-476207-s8.cloudfunctions.net/create-staff-account"; 
        const CLOUD_FUNCTION_URL = "https://create-staff-account-q6ehdtlmra-as.a.run.app";
        
        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ email, password, role, name })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "အကောင့်ဖွင့်ရာတွင် အခက်အခဲရှိပါသည်။");

        alert(`✅ ဝန်ထမ်းအကောင့် (${role}) အောင်မြင်စွာ ဖွင့်ပေးပြီးပါပြီ။`);
        
        // Form ပြန်ရှင်းမည်
        document.getElementById('staff-name').value = '';
        document.getElementById('staff-email').value = '';
        document.getElementById('staff-password').value = '';
        
        fetchStaffList(); // ဇယားကို Refresh လုပ်မည်
        
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = "➕ အကောင့်သစ် ဖွင့်ပေးမည်";
    }
}

function openStaffPwdModal(id, email) {
    document.getElementById('staff-pwd-modal').style.display = 'flex';
    document.getElementById('staff-pwd-email').innerText = email;
    document.getElementById('staff-pwd-id').value = id;
    document.getElementById('staff-new-password').value = '';
}

function closeStaffPwdModal() {
    document.getElementById('staff-pwd-modal').style.display = 'none';
}

async function submitStaffPassword() {
    const id = document.getElementById('staff-pwd-id').value;
    const newPass = document.getElementById('staff-new-password').value;

    if(newPass.length < 6) return alert("စကားဝှက်သည် အနည်းဆုံး ၆ လုံး ရှိရပါမည်။");

    const btn = document.querySelector('#staff-pwd-modal .btn-primary');
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        const { data: { session } } = await _supabase.auth.getSession();
        
        // နောက်အဆင့်တွင် ထည့်သွင်းမည့် Cloud Function URL အသစ်
        const url = "https://reset-staff-pwd-q6ehdtlmra-as.a.run.app"; 
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${session.access_token}` 
            },
            body: JSON.stringify({ userId: id, newPassword: newPass })
        });
        
        const resData = await response.json();
        if(!response.ok) throw new Error(resData.error);
        
        alert("✅ ဝန်ထမ်း၏ စကားဝှက်ကို အောင်မြင်စွာ ပြောင်းလဲလိုက်ပါပြီ။");
        closeStaffPwdModal();
    } catch(e) {
        alert("Error: " + e.message);
    }
    
    btn.innerText = "💾 Password ပြောင်းမည်";
    btn.disabled = false;
}

async function deleteStaff(userId) {
    if(!confirm("ဤဝန်ထမ်း၏ အကောင့်ကို အပြီးတိုင် ဖျက်ပစ်မည်မှာ သေချာပါသလား?")) return;
    
    // (မှတ်ချက် - Auth User ဖျက်ရန်အတွက်လည်း Cloud Function လိုအပ်ပါသည်။ 
    // လောလောဆယ်တွင် user_roles table မှသာ ဖျက်ထားပါမည်။)
    try {
        const { error } = await _supabase.from('user_roles').delete().eq('id', userId);
        if (error) throw error;
        
        alert("ဝန်ထမ်းအကောင့်ကို စာရင်းမှ ဖယ်ရှားလိုက်ပါပြီ။");
        fetchStaffList();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ==========================================
// 🌐 Page Access (Admin Box) Logic
// ==========================================

// Access Box ဖွင့်ရန် (ဇယားထဲက ခလုတ်ကို နှိပ်သည့်အခါ)
function openPageAccessModal(id, email, allowedPagesStr) {
    const accessBox = document.getElementById('box-page-access');
    if (!accessBox) return alert("Page Access Box ကို ရှာမတွေ့ပါ!");
    
    // Box ကို ဖော်ပြမည်
    accessBox.style.display = 'block'; 
    // Box ဆီသို့ Screen ကို အလိုအလျောက် ဆွဲချပေးမည် (Scroll)
    accessBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    document.getElementById('access-staff-email').innerText = email;
    document.getElementById('access-staff-id').value = id;
    
    let allowedPages = [];
    try { allowedPages = JSON.parse(decodeURIComponent(allowedPagesStr)); } catch(e){}
    
    // ဝင်ခွင့်ရှိပြီးသား Checkbox များကို အမှန်ခြစ်ပေးမည်
    document.querySelectorAll('.page-checkbox').forEach(cb => {
        cb.checked = allowedPages.includes(cb.value);
    });
}

// Access Box ပိတ်ရန်
function closePageAccessBox() { 
    document.getElementById('box-page-access').style.display = 'none'; 
}

// ဝင်ခွင့်များ သိမ်းဆည်းရန်
async function savePageAccess() {
    const id = document.getElementById('access-staff-id').value;
    const checkboxes = document.querySelectorAll('.page-checkbox:checked');
    const allowedPages = Array.from(checkboxes).map(cb => cb.value);
    
    const btn = document.getElementById('btn-save-access');
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Saving..."; 
    btn.disabled = true;
    
    try {
        const { error } = await _supabase.from('user_roles').update({ allowed_pages: allowedPages }).eq('id', id);
        if (error) throw error;
        
        alert("✅ စာမျက်နှာ ဝင်ခွင့်ကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။");
        closePageAccessBox();
        fetchStaffList(); // ဇယားကို Refresh ပြန်လုပ်မည်
    } catch(e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerHTML = "💾 ဝင်ခွင့် သိမ်းဆည်းမည်";
        btn.disabled = false;
    }
}

// ==========================================
// 🌟 ယာဉ်အကြွေး အစလက်ကျန် (O/B) သတ်မှတ်ခြင်း 🌟
// ==========================================

window.openOBModal = async function() {
    document.getElementById('ob-modal').style.display = 'flex';
    await fetchOBList();
};

window.closeOBModal = function() {
    document.getElementById('ob-modal').style.display = 'none';
};

// ==========================================
// 🌟 ယာဉ်အကြွေး အစလက်ကျန် (O/B) သတ်မှတ်ခြင်း (AR Ledger သို့ တိုက်ရိုက်သွင်းမည်) 🌟
// ==========================================
window.fetchOBList = async function() {
    const tbody = document.getElementById('ob-tbody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> ဆွဲယူနေပါသည်...</td></tr>';

    try {
        const { data: vehicles, error: vErr } = await _supabase.from('pmt_vehicles').select('id, vehicle_no').order('vehicle_no');
        if (vErr) throw vErr;

        // 🌟 ar_ledger ထဲမှ ar_type = 'opening_balance' ကိုသာ ဆွဲယူမည် 🌟
        const { data: obRecords, error: obErr } = await _supabase.from('ar_ledger').select('vehicle_id, amount, paid_amount').eq('ar_type', 'opening_balance');
        if (obErr) throw obErr;

        let html = '';
        vehicles.forEach(v => {
            let obRecord = obRecords.find(o => String(o.vehicle_id) === String(v.id));
            let obAmount = obRecord ? parseFloat(obRecord.amount || 0) : 0;
            let paidAmount = obRecord ? parseFloat(obRecord.paid_amount || 0) : 0;
            
            // ဆပ်ပြီးသားငွေရှိပါက ပြသပေးမည်
            let paidText = paidAmount > 0 ? `<br><span style="font-size:11px; color:#27ae60;"><i class="fas fa-check-circle"></i> ဆပ်ပြီး: ${paidAmount.toLocaleString()} Ks</span>` : '';

            html += `
            <tr style="border-bottom: 1px solid #eee; transition: background 0.2s;" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='transparent'">
                <td style="padding: 14px 12px; font-weight: bold; color: #2c3e50;">${v.vehicle_no}</td>
                <td style="padding: 14px 12px; text-align: right; font-weight: bold; color: #e74c3c;">${obAmount.toLocaleString()} Ks ${paidText}</td>
                <td style="padding: 14px 12px; text-align: center;">
                    <button onclick="setOpeningBalance('${v.id}', '${v.vehicle_no}', ${obAmount})" class="btn-ob-edit">
                        <i class="fas fa-edit"></i> ပြင်မည်
                    </button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (err) { tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: red; padding: 20px;">Error: ${err.message}</td></tr>`; }
};

window.setOpeningBalance = async function(vehicleId, vehicleNo, currentOB) {
    let input = prompt(`🚗 ${vehicleNo} အတွက် အစလက်ကျန် (Opening Balance) အသစ်ကို ရိုက်ထည့်ပါ:`, currentOB);
    if (input === null || input.trim() === '') return;
    
    let newOB = parseFloat(input);
    if (isNaN(newOB) || newOB < 0) return alert("ကိန်းဂဏန်းအမှန် ရိုက်ထည့်ပါ။");

    try {
        // ar_ledger တွင် ဤကားအတွက် O/B ရှိမရှိ အရင်ရှာမည်
        const { data: existingOB } = await _supabase.from('ar_ledger').select('id, paid_amount').eq('vehicle_id', vehicleId).eq('ar_type', 'opening_balance').maybeSingle();

        if (existingOB) {
            // အကယ်၍ Partial Payment တစ်စိတ်တစ်ပိုင်း ဆပ်ပြီးသားဖြစ်နေလျှင်၊ ဆပ်ပြီးငွေအောက် လျှော့၍မရပါ
            let paid = parseFloat(existingOB.paid_amount || 0);
            if (newOB > 0 && newOB < paid) return alert(`⚠️ ဤကားသည် O/B အကြွေး (${paid} Ks) ဆပ်ပြီးဖြစ်သဖြင့် ထိုပမာဏအောက် လျှော့၍ မရပါ။`);
            
            await _supabase.from('ar_ledger').update({ amount: newOB }).eq('id', existingOB.id);
        } else {
            if (newOB === 0) return; // 0 ဆိုလျှင် အသစ်မသွင်းပါ
            const today = new Date().toISOString().split('T')[0];
            await _supabase.from('ar_ledger').insert([{ 
                record_date: today,
                vehicle_id: vehicleId, 
                driver_id: 'ALL',
                ar_type: 'opening_balance',
                amount: newOB, 
                paid_amount: 0,
                status: 'pending',
                description: 'Opening Balance (အစလက်ကျန်)'
            }]);
        }

        alert(`✅ ${vehicleNo} ၏ အစလက်ကျန်ကို ${newOB.toLocaleString()} Ks သို့ ပြင်ဆင်ပြီးပါပြီ။`);
        fetchOBList(); // ဇယားကို ပြန် Refresh လုပ်မည်
    } catch (err) { alert("Error: " + err.message); }
};
// ============================================
// 🔓 Device Lock Reset Function (ဖုန်းလဲလျှင် Lock ဖြုတ်ပေးရန်)
// ============================================
async function resetDeviceLock(partnerId, partnerName) {
    if(!confirm(`⚠️ ${partnerName} ၏ ဖုန်း/စက် အကန့်အသတ် (Device Lock) ကို ဖြုတ်ပေးမည်မှာ သေချာပါသလား?\n\n(ဖြုတ်ပေးလိုက်ပါက ၎င်းတို့အနေဖြင့် ဖုန်းအသစ်ဖြင့် ပြန်လည် ဝင်ရောက်နိုင်မည် ဖြစ်ပါသည်။)`)) return;

    try {
        // Supabase ထဲရှိ registered_device_id ကို null ပြောင်းပြီး Lock ဖြုတ်ပေးခြင်း
        const { error } = await _supabase
            .from('profiles')
            .update({ registered_device_id: null })
            .eq('id', partnerId);

        if (error) throw error;
        
        alert(`✅ ${partnerName} အတွက် Device Lock ကို အောင်မြင်စွာ ဖြုတ်ပေးလိုက်ပါပြီ။ ယခု ဖုန်းအသစ်ဖြင့် ပြန်ဝင်နိုင်ပါပြီ။`);
        
    } catch (err) {
        alert("Error resetting device lock: " + err.message);
    }
}

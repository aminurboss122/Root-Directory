document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration ---
    const firebaseConfig = {
        apiKey: "AIzaSyDuVtPPtG_uMRvRUuErk4WiJI7mBFnJa8s", authDomain: "am-vip-signal-f92d2.firebaseapp.com", projectId: "am-vip-signal-f92d2", storageBucket: "am-vip-signal-f92d2.firebasestorage.app", messagingSenderId: "207075173570", appId: "1:207075173570:web:bfd173948e8b1d50ec875b", measurementId: "G-1SRFTBE1RR"
    };
    try { firebase.initializeApp(firebaseConfig); firebase.analytics(); } catch(e) { console.error("Firebase Init Error:", e); }
    
    // --- আপনার দেওয়া Prediction Logic Data ---
    const predictionData = {
        "0/0":"Big","0/1":"Big","0/2":"Small","0/3":"Big","0/4":"Small","0/5":"Small","0/6":"Big","0/7":"Small","0/8":"Small","0/9":"Big", "1/0":"Big","1/1":"Small","1/2":"Small","1/3":"Small","1/4":"Big","1/5":"Small","1/6":"Big","1/7":"Big","1/8":"Small","1/9":"Small", "2/0":"Small","2/1":"Big","2/2":"Big","2/3":"Big","2/4":"Small","2/5":"Big","2/6":"Small","2/7":"Big","2/8":"Small","2/9":"Small", "3/0":"Big","3/1":"Big","3/2":"Big","3/3":"Big","3/4":"Small","3/5":"Small","3/6":"Small","3/7":"Big","3/8":"Small","3/9":"Small", "4/0":"Big","4/1":"Big","4/2":"Big","4/3":"Big","4/4":"Small","4/5":"Big","4/6":"Small","4/7":"Big","4/8":"Small","4/9":"Small", "5/0":"Small","5/1":"Big","5/2":"Small","5/3":"Small","5/4":"Big","5/5":"Small","5/6":"Small","5/7":"Small","5/8":"Big","5/9":"Big", "6/0":"Big","6/1":"Small","6/2":"Small","6/3":"Big","6/4":"Small","6/5":"Big","6/6":"Big","6/7":"Small","6/8":"Small","6/9":"Small", "7/0":"Big","7/1":"Big","7/2":"Big","7/3":"Small","7/4":"Small","7/5":"Big","7/6":"Big","7/7":"Big","7/8":"Small","7/9":"Small", "8/0":"Small","8/1":"Small","8/2":"Big","8/3":"Big","8/4":"Big","8/5":"Big","8/6":"Small","8/7":"Big","8/8":"Big","8/9":"Small", "9/0":"Small","9/1":"Small","9/2":"Small","9/3":"Big","9/4":"Big","9/5":"Big","9/6":"Big","9/7":"Small","9/8":"Big","9/9":"Small"
    };

    // --- State & DOM Elements ---
    let currentMarket = '', winCount = 0, lossCount = 0, consecutiveLosses = 0;
    let isVoiceOn = true, dataFetchInterval, lastProcessedPeriod = null;
    const elements = {};
    ['login-page', 'main-menu-page', 'vip-signal-hack-page', 'signal-page', 'login-btn', 'password', 'error-msg', 'notice-text', 'vip-signal-hack-btn', 'back-to-menu-btn', 'back-to-hack-page-btn', 'voice-toggle', 'market-title', 'win-count', 'loss-count', 'next-period', 'prediction-result', 'result-notification', 'notification-message'].forEach(id => {
        elements[id.replace(/-./g, c => c.substring(1).toUpperCase())] = document.getElementById(id);
    });
    elements.pages = document.querySelectorAll('.page');
    elements.marketButtons = document.querySelectorAll('.market-btn');
    elements.historyTableBody = document.querySelector('#history-table tbody');

    // --- Core Functions ---
    const showPage = (pageId) => elements.pages.forEach(p => p.classList.toggle('active', p.id === pageId));
    
    const speak = (text) => {
        if (!isVoiceOn || !text || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel(); // আগের ভয়েস বলা বন্ধ করে
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        // নরম ও মেয়েলি কন্ঠ খোঁজার চেষ্টা
        let femaleVoice = voices.find(v => v.lang.startsWith('bn') && v.name.toLowerCase().includes('female')) || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) || voices.find(v => v.name.toLowerCase().includes('female')) || null;
        
        utterance.voice = femaleVoice;
        utterance.lang = 'bn-BD'; 
        utterance.rate = 0.9; // কথার গতি
        utterance.pitch = 1.1; // কন্ঠের তীক্ষ্ণতা
        window.speechSynthesis.speak(utterance);
    };
    // ব্রাউজারে ভয়েস লোড হওয়ার জন্য অপেক্ষা
    speechSynthesis.onvoiceschanged = () => { speak(''); };

    const getBigSmall = (numStr) => parseInt(numStr, 10) >= 5 ? 'Big' : 'Small';
    
    const getPrediction = (history) => {
        if (!history || history.length < 2) return "Waiting...";
        const lastNum = parseInt(history[0].number, 10) % 10;
        const secondLastNum = parseInt(history[1].number, 10) % 10;
        const key = `${secondLastNum}/${lastNum}`;
        return predictionData[key] || "Pattern Miss";
    };

    const showNotification = (message, type) => {
        elements.notificationMessage.innerHTML = message; //innerHTML ব্যবহার করে ইমোজি সাপোর্ট নিশ্চিত করা
        elements.resultNotification.className = `${type}-popup`;
        setTimeout(() => elements.resultNotification.classList.add('hidden'), 3000);
    };

    const updateUI = (historyData) => {
        if (!historyData || historyData.length === 0) return;
        const latestPeriod = historyData[0];
        
        if (latestPeriod.issue === lastProcessedPeriod) return; // একই ডেটা বারবার প্রসেস করা বন্ধ করা
        
        const predictionForLastPeriod = getPrediction(historyData.slice(1));
        const actualResultOfLastPeriod = getBigSmall(latestPeriod.number);
        
        // শুধু তখনই Win/Loss গণনা করবে যখন সফলভাবে Prediction করা গিয়েছিল
        if (lastProcessedPeriod && predictionForLastPeriod !== "Waiting..." && predictionForLastPeriod !== "Pattern Miss") {
            if (predictionForLastPeriod === actualResultOfLastPeriod) {
                winCount++; 
                consecutiveLosses = 0;
                showNotification(`অভিনন্দন আপনি বিজয়ী 🎉`, 'win');
                speak(`অভিনন্দন আপনি বিজয়ী`);
            } else {
                lossCount++; 
                consecutiveLosses++;
                showNotification(`দুঃখিত এটা লস 😢`, 'loss');
                speak(`দুঃখিত এটা লস`);
            }
        }
        
        lastProcessedPeriod = latestPeriod.issue; 
        
        elements.winCount.textContent = winCount;
        elements.lossCount.textContent = lossCount;
        elements.historyTableBody.innerHTML = '';
        
        // শুধু ৭টি হিস্টোরি দেখাবে
        historyData.slice(0, 7).forEach((item, index) => {
            const row = document.createElement('tr');
            const predictionForThisRow = getPrediction(historyData.slice(index + 1));
            const actualResult = getBigSmall(item.number);
            let status = '', statusClass = '';

            if (predictionForThisRow !== "Waiting..." && predictionForThisRow !== "Pattern Miss") {
                status = actualResult === predictionForThisRow ? 'WIN' : 'LOSS';
                statusClass = `status-${status.toLowerCase()}`;
            }
            row.innerHTML = `<td>${item.issue}</td><td>${item.number}</td><td>${actualResult}</td><td><span class="${statusClass}">${status}</span></td>`;
            elements.historyTableBody.appendChild(row);
        });

        const nextPrediction = getPrediction(historyData);
        elements.nextPeriod.textContent = (BigInt(latestPeriod.issue) + 1n).toString();
        elements.predictionResult.textContent = nextPrediction;

        // ভয়েস বলার লজিক
        if (consecutiveLosses >= 4) {
            speak("চিন্তা করার কিছু নেই। প্রিয়, স্টেপমেন্ট করে খেলো, ইনশাআল্লাহ প্রফিট হবে।");
            consecutiveLosses = 0; // রিসেট করে দেওয়া যাতে বারবার না বলে
        } else if (nextPrediction === 'Big' || nextPrediction === 'Small') {
            speak(nextPrediction === 'Big' ? "সবাই বিগ এন্ট্রি নাও" : "সবাই স্মলে এন্ট্রি নাও");
        }
    };

    const fetchData = async () => {
        try {
            // আমাদের নিজেদের Node.js সার্ভার থেকে ডেটা আনছি
            const response = await fetch(`/api/get-history?market=${currentMarket}`);
            if (!response.ok) throw new Error(`Server Error: ${response.status}`);
            const data = await response.json();
            
            if (data.error) throw new Error(`API Error from our server: ${data.error}`);
            
            // আসল API থেকে পাওয়া ডেটা লিস্ট আকারে আছে কিনা তা পরীক্ষা করা
            let historyList = [];
            if(data && data.data && Array.isArray(data.data.list)) {
                historyList = data.data.list;
            } else if (data && Array.isArray(data.list)) { // কিছু API সরাসরি list পাঠায়
                historyList = data.list;
            } else {
                 console.error("Unexpected API data structure:", data);
            }

            if (historyList.length > 0) {
                updateUI(historyList);
            } else {
                elements.predictionResult.textContent = "No History Data";
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            elements.predictionResult.textContent = "API Fetch Error";
        }
    };
    
    const startSignalGeneration = (market) => {
        currentMarket = market;
        elements.marketTitle.textContent = market === 'wingo1m' ? 'Win Go 1 Minute' : 'Win Go 30 Second';
        winCount = 0; lossCount = 0; consecutiveLosses = 0; lastProcessedPeriod = null;
        elements.winCount.textContent = '0';
        elements.lossCount.textContent = '0';
        elements.historyTableBody.innerHTML = '<tr><td colspan="4">Loading history...</td></tr>';
        elements.predictionResult.textContent = "Loading...";
        elements.nextPeriod.textContent = "Loading...";
        
        showPage('signal-page');
        fetchData();
        if (dataFetchInterval) clearInterval(dataFetchInterval);
        const intervalTime = market === 'wingo30s' ? 10000 : 20000; // ৩০ সেকেন্ডের জন্য ১০ সেকেন্ড, ১ মিনিটের জন্য ২০ সেকেন্ড পর পর ডেটা আনবে
        dataFetchInterval = setInterval(fetchData, intervalTime);
    };

    // --- Event Listeners ---
    elements.loginBtn.addEventListener('click', () => {
        if (elements.password.value === '12345') {
            showPage('main-menu-page');
        } else {
            elements.errorMsg.textContent = 'Incorrect Password!';
            setTimeout(() => (elements.errorMsg.textContent = ''), 3000);
        }
    });
    elements.vipSignalHackBtn.addEventListener('click', () => showPage('vip-signal-hack-page'));
    elements.marketButtons.forEach(button => {
        button.addEventListener('click', () => startSignalGeneration(button.dataset.market));
    });
    elements.backToMenuBtn.addEventListener('click', () => showPage('main-menu-page'));
    elements.backToHackPageBtn.addEventListener('click', () => {
        if (dataFetchInterval) clearInterval(dataFetchInterval);
        showPage('vip-signal-hack-page');
    });
    elements.voiceToggle.addEventListener('change', (e) => (isVoiceOn = e.target.checked));
    
    showPage('login-page');
});
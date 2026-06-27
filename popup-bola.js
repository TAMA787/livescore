(function () {
    "use strict";
    var JADWAL_OTOMATIS_URL =
        "https://a3d4pt0.vendorscore.live/api/pialadunia/matches";

    var MOBILE_MAX_WIDTH = 720;
    var MOBILE_MEDIA_QUERY = "(max-width: " + MOBILE_MAX_WIDTH + "px)";

    var TANGGAL_JADWAL = "";

    var AMBIL_JADWAL_KEMARIN = false;
    var AMBIL_JADWAL_BESOK = true;
    var LINK_KLIK_DISINI = "https://link.zonalivebola.com/";
    var TARGET_SELECTOR = "#livescore-banner-slot, .owl-wrapper-outer";
    var TARGET_INDEX = 0;
    var TAMPILKAN_SEBELUM_KICKOFF_SEPANJANG_WAKTU = true;
    var HANYA_MOBILE = typeof window !== "undefined" && window.POPUP_BOLA_HANYA_MOBILE === true ? true : false;
    var PAKAI_NOCACHE_WORKER = false;
    var MENIT_SEBELUM_KICKOFF = 10;
    var DURASI_PERTANDINGAN_MENIT = 105;
    var REFRESH_DATA_LIVE_MS = 5 * 1000;
    var REFRESH_DATA_IDLE_MS = 60 * 60 * 1000;
    var DURASI_REFRESH_LIVE_MENIT = 180;
    var TAHAN_FULL_TIME_MENIT = 10;
    var TAHAN_FULL_TIME_MS = TAHAN_FULL_TIME_MENIT * 60 * 1000;
    var REQUEST_TIMEOUT_MS = 8000;
    var CEK_POPUP_MS = 1000;
    var POPUP_ID = "popup-bola-auto-saranglive-v3";
    var STYLE_ID = "popup-bola-auto-saranglive-style-v3";
    var pertandingan = [];
    var popupDitutup = {};
    var sedangAmbilData = false;
    var waktuAmbilDataTerakhir = 0;
    var tanggalAktifTerakhir = null;
    var intervalRekomendasiWorkerMs = REFRESH_DATA_IDLE_MS;
    var waktuCacheTerakhir = 0;
    var REQUEST_LOCK_KEY = "popup_bola_worker_request_lock_v2";
    var REQUEST_LOCK_MS = Math.max(REQUEST_TIMEOUT_MS + 2000, 12000);
    var TAB_ID = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    var waktuSelesaiLokal = {};
    var jamPertandinganLokal = {};
    var CACHE_KEY_PERTANDINGAN = "popup_bola_production_live_ht_ft_hhmmss_v2";
    var CACHE_MAX_AGE_MS = 60 * 60 * 1000;

    function hapusStyleLama() {
        var ids = [
            STYLE_ID,
            "popup-bola-after-owl-style-v2",
            "popup-bola-scoreboard-style",
            "popup-bola-scoreboard-saranglive-style",
            "popup-bola-final-manual-style",
            "popup-bola-auto-saranglive-style",
            "popup-bola-auto-saranglive-style-v2"
        ];

        for (var i = 0; i < ids.length; i++) {
            var style = document.getElementById(ids[i]);

            if (style && style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }
    }

    function pasangFilterBendera() {
        if (document.getElementById("popup-flag-wave-svg")) {
            return;
        }

        var svgNS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("id", "popup-flag-wave-svg");
        svg.setAttribute("width", "0");
        svg.setAttribute("height", "0");
        svg.setAttribute("aria-hidden", "true");
        svg.style.position = "absolute";
        svg.style.width = "0";
        svg.style.height = "0";
        svg.style.overflow = "hidden";
        svg.style.pointerEvents = "none";

        svg.innerHTML =
            '<defs>' +
            '<filter id="popupFlagWaveFilter" x="-35%" y="-45%" width="170%" height="190%">' +
            '<feTurbulence type="fractalNoise" baseFrequency="0.007 0.022" numOctaves="2" seed="2" result="noise">' +
            '<animate attributeName="seed" dur="12s" ' +
            'values="2; 12" calcMode="linear" repeatCount="indefinite"/>' +
            '</feTurbulence>' +
            '<feDisplacementMap in="SourceGraphic" in2="noise" ' +
            'xChannelSelector="R" yChannelSelector="G" result="disp">' +
            '<animate attributeName="scale" dur="5s" ' +
            'values="8; 14; 8" calcMode="spline" keyTimes="0; 0.5; 1" ' +
            'keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" repeatCount="indefinite"/>' +
            '</feDisplacementMap>' +
            '</filter>' +
            '</defs>';

        document.body.appendChild(svg);
    }

    function pasangCSS() {
        var styleLama = document.getElementById(STYLE_ID);
        if (
            styleLama &&
            styleLama.getAttribute("data-versi") ===
            "popup-rapi-cta-samping-v3-always-show"
        ) {
            return;
        }

        if (styleLama && styleLama.parentNode) {
            styleLama.parentNode.removeChild(styleLama);
        }

        var css = `
      #${POPUP_ID} {
        box-sizing: border-box !important;
        width: calc(100% - 10px) !important;
        max-width: 920px !important;
        min-height: 76px !important;
        margin: 6px auto 9px auto !important;
        padding: 8px 34px 8px 8px !important;
        border-radius: 9px !important;
        border: 2px solid #f5c542 !important;
        background: linear-gradient(270deg, rgba(120,8,8,1) 0%, rgba(190,20,20,1) 21%, rgba(214,28,28,1) 40%, rgba(160,12,12,1) 60%, rgba(200,24,24,1) 80%, rgba(120,8,8,1) 100%);
        box-shadow: inset 0 1px 0 rgb(255 220 120 / 55%), 0 0 0 1px rgba(0, 0, 0, 0.3), 0 3px 8px rgba(0, 0, 0, 0.5) !important;
        color: #ffffff !important;
        display: block !important;
        position: relative !important;
        z-index: 999999 !important;
        clear: both !important;
        overflow: visible !important;
        font-family: Arial, Helvetica, sans-serif !important;
      }

      #${POPUP_ID} * {
        box-sizing: border-box !important;
      }

      #${POPUP_ID}::before {
        content: attr(data-countdown);
        display: none !important;
        position: absolute !important;
        top: 5px !important;
        left: 6px !important;
        min-width: 33px !important;
        height: 16px !important;
        padding: 2px 4px !important;
        border-radius: 5px !important;
        background: #111111 !important;
        color: #ffffff !important;
        font-size: 8px !important;
        font-weight: 900 !important;
        line-height: 12px !important;
        text-align: center !important;
        letter-spacing: 0.2px !important;
        z-index: 3 !important;
        pointer-events: none !important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.18),
          0 2px 4px rgba(0,0,0,0.35) !important;
      }

      #${POPUP_ID}[data-countdown]:not([data-countdown=""])::before {
        display: block !important;
      }

      #${POPUP_ID}.popup-score-is-live::before {
        background: #d90000 !important;
        color: #ffffff !important;
      }

      #${POPUP_ID} .popup-score-main {
        width: 100% !important;
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) !important;
        align-items: center !important;
        gap: 5px !important;
      }

      #${POPUP_ID} .popup-score-team {
        min-width: 0 !important;
        color: #ffffff !important;
        text-shadow: 0 1px 2px rgba(0,0,0,0.55), 0 0 1px rgba(245,197,66,0.6) !important;
        font-size: clamp(12px, 3.4vw, 17px) !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-transform: uppercase !important;
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        letter-spacing: -0.35px !important;
        word-break: normal !important;
        overflow-wrap: normal !important;
      }

      #${POPUP_ID} .popup-score-team-left {
        text-align: right !important;
        justify-self: stretch !important;
      }

      #${POPUP_ID} .popup-score-team-right {
        text-align: left !important;
        justify-self: stretch !important;
      }

      #${POPUP_ID} .popup-score-center {
        flex: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 5px !important;
        padding: 4px 6px !important;
        border-radius: 6px !important;
        background: #111111 !important;
        border: 1px solid rgba(0,0,0,0.75) !important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.18),
          0 2px 4px rgba(0,0,0,0.45) !important;
        min-width: 102px !important;
      }

      #${POPUP_ID} .popup-score-middle {
        min-width: 44px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 1px !important;
        flex: 0 0 auto !important;
      }

      #${POPUP_ID} .popup-score-clock {
        display: none !important;
        min-height: 8px !important;
        color: #fff000 !important;
        font-size: 7px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        letter-spacing: 0.15px !important;
        text-align: center !important;
        white-space: nowrap !important;
      }

      #${POPUP_ID} .popup-score-clock[data-visible="1"] {
        display: block !important;
      }

      #${POPUP_ID} .popup-score-flag {
        position: relative !important;
        width: 30px !important;
        height: 20px !important;
        display: block !important;
        border-radius: 0 !important;
        border: 0 !important;
        background: transparent !important;
        flex: 0 0 auto !important;
        overflow: visible !important;
      }

      #${POPUP_ID} .popup-score-flag-canvas {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        display: block !important;
        pointer-events: none !important;
      }

      /* Gambar sumber disembunyikan; yang tampil adalah versi canvas.
         Saat canvas belum siap, img dipakai sebagai cadangan. */
      #${POPUP_ID} .popup-score-flag-source {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: fill !important;
        border-radius: 0 !important;
        opacity: 0 !important;
      }
      #${POPUP_ID} .popup-score-flag:not([data-flag-ready="1"]) .popup-score-flag-source {
        opacity: 1 !important;
      }

      @media (prefers-reduced-motion: reduce) {
        #${POPUP_ID} .popup-score-flag-canvas {
          display: none !important;
        }
        #${POPUP_ID} .popup-score-flag-source {
          opacity: 1 !important;
        }
      }

      #${POPUP_ID} .popup-score-number {
        min-width: 44px !important;
        text-align: center !important;
        color: #ffffff !important;
        font-size: 19px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        letter-spacing: 1px !important;
        text-shadow: 0 2px 2px rgba(0,0,0,0.65) !important;
        flex: 0 0 auto !important;
      }

      #${POPUP_ID} .popup-score-cta-row {
        width: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 6px !important;
        margin-top: 6px !important;
      }

      #${POPUP_ID} .popup-score-bottom {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        position: static !important;
        height: auto !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        pointer-events: none !important;
      }

      #${POPUP_ID} .popup-score-desc {
        box-sizing: border-box !important;
        width: 100% !important;
        max-width: none !important;
        padding: 4px 9px !important;
        border-radius: 999px !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-size: 10.7px !important;
        font-weight: 800 !important;
        line-height: 1.2 !important;
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        text-align: center !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.8) !important;
      }

      #${POPUP_ID} .popup-score-live-dot {
        display: inline-block !important;
        width: 8px !important;
        height: 8px !important;
        margin-right: 5px !important;
        border-radius: 50% !important;
        vertical-align: -1px !important;
      }

      #${POPUP_ID} .popup-score-dot-live {
        background: #14bb00 !important;
        box-shadow: 0 0 7px #33ff00 !important;
        animation: popupScoreDotBlink 0.85s infinite ease-in-out !important;
      }

      #${POPUP_ID} .popup-score-dot-soon {
        background: #14bb00 !important;
        box-shadow: 0 0 7px #33ff00 !important;
        animation: popupScoreDotBlink 0.85s infinite ease-in-out !important;
      }

      @keyframes popupScoreDotBlink {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }

        50% {
          opacity: 0.35;
          transform: scale(0.72);
        }
      }

      /* Animasi pergantian pertandingan: slide masuk dari atas ke bawah */
      @keyframes popupSlideTurunMasuk {
        0%   { opacity: 0; transform: translateY(-22px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      #${POPUP_ID}.popup-score-slide-masuk .popup-score-main,
      #${POPUP_ID}.popup-score-slide-masuk .popup-score-cta-row {
        animation: popupSlideTurunMasuk 0.45s cubic-bezier(0.22, 1, 0.36, 1) both !important;
      }
      /* baris bawah sedikit delay supaya berurutan, lebih hidup */
      #${POPUP_ID}.popup-score-slide-masuk .popup-score-cta-row {
        animation-delay: 0.06s !important;
      }

      #${POPUP_ID} .popup-score-link {
        flex: 0 0 auto !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 92px !important;
        height: 24px !important;
        padding: 5px 12px !important;
        border-radius: 999px !important;
        background: linear-gradient(180deg, #b8860b 0%, #f9e08c 18%, #fff7d6 48%, #f2cf66 60%, #c8920c 88%, #9c6f06 100%) !important;
        color: #6b0000 !important;
        text-shadow: 0 1px 0 rgba(255,250,220,0.55) !important;
        font-size: 11px !important;
        font-style: italic !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-decoration: none !important;
        white-space: nowrap !important;
        text-transform: uppercase !important;
        box-shadow:
          inset 0 1px 1px rgba(255,255,255,0.75),
          inset 0 -1px 1px rgba(120,80,0,0.5),
          0 2px 5px rgba(0,0,0,0.5) !important;
          border: 1.5px solid #ffefb0;
      }

      #${POPUP_ID} .popup-score-link:hover {
        filter: brightness(1.08) !important;
      }

      #${POPUP_ID} .popup-score-close {
        position: absolute !important;
        top: 5px !important;
        right: 5px !important;
        transform: none !important;
        width: 24px !important;
        height: 24px !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: rgba(0,0,0,0.45) !important;
        color: #ffffff !important;
        font-size: 18px !important;
        font-weight: 900 !important;
        line-height: 24px !important;
        cursor: pointer !important;
        padding: 0 !important;
        text-align: center !important;
        z-index: 2 !important;
      }

      @media (min-width: 600px) {
        #${POPUP_ID} {
          min-height: 78px !important;
          padding: 9px 42px 9px 10px !important;
        }

        #${POPUP_ID}::before {
          top: 6px !important;
          left: 7px !important;
          min-width: 42px !important;
          height: 20px !important;
          font-size: 10px !important;
          line-height: 14px !important;
        }

        #${POPUP_ID} .popup-score-main {
          gap: 18px !important;
        }

        #${POPUP_ID} .popup-score-team {
          font-size: clamp(18px, 2.5vw, 28px) !important;
          letter-spacing: -0.6px !important;
        }

        #${POPUP_ID} .popup-score-center {
          min-width: 210px !important;
          gap: 10px !important;
          padding: 5px 13px !important;
        }

        #${POPUP_ID} .popup-score-middle {
          min-width: 80px !important;
        }

        #${POPUP_ID} .popup-score-clock {
          min-height: 11px !important;
          font-size: 10px !important;
        }

        #${POPUP_ID} .popup-score-flag {
          width: 44px !important;
          height: 29px !important;
        }

        #${POPUP_ID} .popup-score-number {
          min-width: 80px !important;
          font-size: 34px !important;
          letter-spacing: 2px !important;
        }

        #${POPUP_ID} .popup-score-cta-row {
          margin-top: 7px !important;
          gap: 10px !important;
        }

        #${POPUP_ID} .popup-score-desc {
          font-size: 14px !important;
          padding: 4px 14px !important;
        }

        #${POPUP_ID} .popup-score-link {
          min-width: 150px !important;
          height: 30px !important;
          padding: 7px 18px !important;
          font-size: 18px !important;
        }

        #${POPUP_ID} .popup-score-close {
          width: 30px !important;
          height: 30px !important;
          line-height: 30px !important;
          font-size: 22px !important;
          top: 6px !important;
          right: 6px !important;
        }
      }

      @media (max-width: 720px) {
        #${POPUP_ID} {
          width: calc(100% - 8px) !important;
          min-height: 60px !important;
          padding: 8px 20px 1px 20px !important;
        }

        #${POPUP_ID}::before {
          top: 2px !important;
          left: 6px !important;
          min-width: 31px !important;
          height: 15px !important;
          padding: 2px 4px !important;
          font-size: 7.5px !important;
          line-height: 11px !important;
        }

        #${POPUP_ID} .popup-score-main {
          gap: 4px !important;
        }

        #${POPUP_ID} .popup-score-team {
          font-size: clamp(12px, 3.8vw, 16px) !important;
          letter-spacing: -0.5px !important;
        }

        #${POPUP_ID} .popup-score-center {
          min-width: 96px !important;
          gap: 4px !important;
          padding: 4px 5px !important;
        }

        #${POPUP_ID} .popup-score-middle {
          min-width: 42px !important;
        }

        #${POPUP_ID} .popup-score-clock {
          min-height: 8px !important;
          font-size: 7px !important;
        }

        #${POPUP_ID} .popup-score-flag {
          width: 22px !important;
          height: 15px !important;
        }

        #${POPUP_ID} .popup-score-number {
          min-width: 42px !important;
          font-size: 18px !important;
          letter-spacing: 1px !important;
        }

        #${POPUP_ID} .popup-score-cta-row {
          margin-top: 6px !important;
          gap: 10px !important;
        }

        #${POPUP_ID} .popup-score-desc {
          font-size: 9px !important;
          padding: 3px 8px !important;
        }

        #${POPUP_ID} .popup-score-link {
          min-width: 84px !important;
          height: 23px !important;
          padding: 5px 10px !important;
          font-size: 10.5px !important;
          margin-left: 4px !important;
          margin-right: 2px !important;
        }

        #${POPUP_ID} .popup-score-close {
          width: 23px !important;
          height: 23px !important;
          line-height: 23px !important;
          font-size: 17px !important;
          top: 5px !important;
          right: 5px !important;
        }
      }

      @media (max-width: 350px) {
        #${POPUP_ID} {
          padding-right: 30px !important;
        }

        #${POPUP_ID}::before {
          min-width: 28px !important;
          height: 14px !important;
          font-size: 7px !important;
          line-height: 10px !important;
        }

        #${POPUP_ID} .popup-score-team {
          font-size: 11px !important;
        }

        #${POPUP_ID} .popup-score-center {
          min-width: 88px !important;
        }

        #${POPUP_ID} .popup-score-flag {
          width: 20px !important;
          height: 14px !important;
        }

        #${POPUP_ID} .popup-score-number {
          min-width: 38px !important;
          font-size: 17px !important;
        }

        #${POPUP_ID} .popup-score-desc {
          font-size: 9.5px !important;
        }

        #${POPUP_ID} .popup-score-link {
          min-width: 78px !important;
          font-size: 9.5px !important;
          padding-left: 8px !important;
          padding-right: 8px !important;
        }
      }
    `;

        var style = document.createElement("style");
        style.id = STYLE_ID;
        style.type = "text/css";
        style.setAttribute("data-versi", "popup-rapi-cta-samping-v3-always-show");
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    function teksBersih(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value).replace(/\s+/g, " ").trim();
    }

    function duaDigit(angka) {
        angka = parseInt(angka, 10);

        if (isNaN(angka)) {
            angka = 0;
        }

        return angka < 10 ? "0" + angka : String(angka);
    }

    function normalisasiJam(jam) {
        jam = teksBersih(jam || "00:00").replace(".", ":");

        var bagian = jam.split(":");

        if (bagian.length === 2) {
            return duaDigit(bagian[0]) + ":" + duaDigit(bagian[1]) + ":00";
        }

        if (bagian.length === 3) {
            return (
                duaDigit(bagian[0]) +
                ":" +
                duaDigit(bagian[1]) +
                ":" +
                duaDigit(bagian[2])
            );
        }

        return "00:00:00";
    }

    function angkaSkor(value) {
        var angka = parseInt(value, 10);

        if (isNaN(angka)) {
            return 0;
        }

        return angka;
    }

    function angkaAtauNull(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        var angka = Number(value);

        if (!Number.isFinite(angka)) {
            return null;
        }

        return Math.max(0, Math.floor(angka));
    }

    function slugify(value) {
        return teksBersih(value)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function bersihkanUrlGambar(src) {
        src = teksBersih(src);

        if (!src) {
            return "";
        }

        try {
            var absolute = new URL(src, window.location.href).href;
            var url = new URL(absolute);
            var original = url.searchParams.get("url");

            if (original && /^https?:\/\//i.test(original)) {
                return decodeURIComponent(original);
            }

            return absolute;
        } catch (e) {
            return src;
        }
    }

    function ambilKickoff(match) {
        if (match.kickoff) {
            var dariKickoff = new Date(match.kickoff);

            if (!isNaN(dariKickoff.getTime())) {
                return dariKickoff;
            }
        }

        var tanggal = teksBersih(match.tanggal);
        var jam = normalisasiJam(match.jam);
        var zonaWaktu = match.zonaWaktu || "+07:00";

        return new Date(tanggal + "T" + jam + zonaWaktu);
    }

    function normalisasiStatusApi(status) {
        status = teksBersih(status).toUpperCase();

        switch (status) {
            case "SCHEDULED":
            case "TIMED":
                return "NS";

            case "IN_PLAY":
            case "LIVE":
                return "LIVE";

            case "PAUSED":
                return "HT";

            case "FINISHED":
            case "AWARDED":
                return "FT";

            case "POSTPONED":
                return "POSTP";

            case "CANCELLED":
                return "CANC";

            case "SUSPENDED":
                return "SUSP";

            default:
                return status;
        }
    }

    function statusSelesai(status) {
        status = normalisasiStatusApi(status);

        return (
            status === "FT" ||
            status === "AET" ||
            status === "PEN" ||
            status === "CANC" ||
            status === "POSTP"
        );
    }

    function statusFullTime(status) {
        status = normalisasiStatusApi(status);

        return status === "FT" || status === "AET" || status === "PEN";
    }

    function statusTidakDimainkan(status) {
        status = normalisasiStatusApi(status);

        return status === "CANC" || status === "POSTP";
    }

    function statusSedangLive(status) {
        status = normalisasiStatusApi(status);

        if (!status || statusSelesai(status)) {
            return false;
        }

        if (status === "LIVE" || status === "HT" || status === "SUSP") {
            return true;
        }

        if (/^\d{1,3}'/.test(status)) {
            return true;
        }

        return false;
    }

    function nilaiPertamaTerisi() {
        for (var i = 0; i < arguments.length; i++) {
            var value = arguments[i];

            if (value !== null && value !== undefined && value !== "") {
                return value;
            }
        }

        return "";
    }

    function formatTanggalJamWIB(value) {
        var date = new Date(value);

        if (isNaN(date.getTime())) {
            return {
                tanggal: "",
                jam: ""
            };
        }

        try {
            var parts = new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Jakarta",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                hourCycle: "h23"
            }).formatToParts(date);

            var obj = {};

            for (var i = 0; i < parts.length; i++) {
                obj[parts[i].type] = parts[i].value;
            }

            var jam = obj.hour === "24" ? "00" : obj.hour;

            return {
                tanggal: obj.year + "-" + obj.month + "-" + obj.day,
                jam: jam + ":" + obj.minute
            };
        } catch (e) {
            var wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);

            return {
                tanggal:
                    wib.getUTCFullYear() +
                    "-" +
                    duaDigit(wib.getUTCMonth() + 1) +
                    "-" +
                    duaDigit(wib.getUTCDate()),
                jam: duaDigit(wib.getUTCHours()) + ":" + duaDigit(wib.getUTCMinutes())
            };
        }
    }
    var PETA_KODE_BENDERA = {
        MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz", CAN: "ca", BIH: "ba",
        USA: "us", PAR: "py", QAT: "qa", SUI: "ch", BRA: "br", MOR: "ma",
        HAI: "ht", SCO: "gb-sct", AUS: "au", TUR: "tr", GER: "de", NED: "nl",
        JPN: "jp", CIV: "ci", ECU: "ec", SWE: "se", TUN: "tn", ESP: "es",
        CPV: "cv", BEL: "be", EGY: "eg", KSA: "sa", URU: "uy", IRI: "ir",
        NZL: "nz", FRA: "fr", SEN: "sn", IRA: "iq", ARG: "ar", DZA: "dz",
        POR: "pt", DCO: "cd", ENG: "gb-eng", CRO: "hr", GHA: "gh", PAN: "pa",
        UZB: "uz", COL: "co", JOR: "jo", NOR: "no", AUT: "at", WAL: "gb-wls"
    };

    function benderaDariKode(kode) {
        if (!kode) {
            return "";
        }
        var k = String(kode).toUpperCase();
        var iso = PETA_KODE_BENDERA[k];
        if (!iso) {
        }
        return "https://flagcdn.com/w1280/" + iso + ".png";
    }

    function normalisasiMatch(raw) {
        if (!raw) {
            return null;
        }
        var homeTeam = raw.homeTeam || raw.home_team || {};
        var awayTeam = raw.awayTeam || raw.away_team || {};
        var scoreData = raw.score || {};
        var fullTime = scoreData.fullTime || scoreData.full_time || {};
        var home = teksBersih(
            nilaiPertamaTerisi(
                raw.home,
                raw.homeName,
                raw.home_name,
                homeTeam.shortName,
                homeTeam.name,
                homeTeam.tla
            )
        );

        var away = teksBersih(
            nilaiPertamaTerisi(
                raw.away,
                raw.awayName,
                raw.away_name,
                awayTeam.shortName,
                awayTeam.name,
                awayTeam.tla
            )
        );

        if (!home || !away) {
            return null;
        }

        var kickoff = teksBersih(nilaiPertamaTerisi(raw.kickoff, raw.utcDate, raw.utc_date, raw.matchDate));
        var waktuWIB = formatTanggalJamWIB(kickoff);
        var tanggal = teksBersih(nilaiPertamaTerisi(raw.tanggal, raw.date, raw.match_date, waktuWIB.tanggal));

        var jam = teksBersih(
            nilaiPertamaTerisi(
                raw.jam,
                raw.time,
                raw.match_time,
                waktuWIB.jam,
                "00:00"
            )
        );

        var id =
            teksBersih(raw.id || raw.match_id || raw.fixture_id) ||
            slugify(home + "-vs-" + away + "-" + tanggal + "-" + jam);

        var homeScore = nilaiPertamaTerisi(
            raw.homeScore,
            raw.home_score,
            raw.score_home,
            scoreData.home,
            fullTime.home,
            0
        );

        var awayScore = nilaiPertamaTerisi(
            raw.awayScore,
            raw.away_score,
            raw.score_away,
            scoreData.away,
            fullTime.away,
            0
        );

        return {
            id: id,

            tanggal: tanggal,
            jam: jam,
            zonaWaktu: raw.zonaWaktu || raw.timezone || "+07:00",

            kickoff: kickoff,

            status: normalisasiStatusApi(raw.status || ""),

            minute: angkaAtauNull(
                nilaiPertamaTerisi(raw.minute, raw.matchMinute, raw.match_minute)
            ),
            injuryTime: angkaAtauNull(
                nilaiPertamaTerisi(
                    raw.injuryTime,
                    raw.injury_time,
                    raw.stoppageTime,
                    raw.stoppage_time
                )
            ),
            lastUpdated: teksBersih(
                nilaiPertamaTerisi(raw.lastUpdated, raw.last_updated)
            ),
            finishedAt: teksBersih(
                nilaiPertamaTerisi(raw.finishedAt, raw.finished_at)
            ),

            home: home.toUpperCase(),
            away: away.toUpperCase(),

            homeScore: angkaSkor(homeScore),
            awayScore: angkaSkor(awayScore),

            homeFlagImg: bersihkanUrlGambar(
                nilaiPertamaTerisi(
                    raw.homeFlagImg,
                    raw.home_flag_img,
                    raw.homeFlag,
                    raw.home_flag,
                    benderaDariKode(homeTeam.code),
                    homeTeam.crest,
                    homeTeam.logo
                )
            ),

            awayFlagImg: bersihkanUrlGambar(
                nilaiPertamaTerisi(
                    raw.awayFlagImg,
                    raw.away_flag_img,
                    raw.awayFlag,
                    raw.away_flag,
                    benderaDariKode(awayTeam.code),
                    awayTeam.crest,
                    awayTeam.logo
                )
            ),

            link: LINK_KLIK_DISINI || raw.link || raw.matchUrl || "#",
            matchUrl: raw.matchUrl || raw.url || ""
        };
    }

    function tanggalWIB(offsetHari) {
        offsetHari = offsetHari || 0;

        try {
            var target = new Date(Date.now() + offsetHari * 24 * 60 * 60 * 1000);

            var parts = new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Jakarta",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).formatToParts(target);

            var obj = {};

            for (var i = 0; i < parts.length; i++) {
                obj[parts[i].type] = parts[i].value;
            }

            return obj.year + "-" + obj.month + "-" + obj.day;
        } catch (e) {
            var d = new Date(Date.now() + offsetHari * 24 * 60 * 60 * 1000);

            return (
                d.getFullYear() +
                "-" +
                duaDigit(d.getMonth() + 1) +
                "-" +
                duaDigit(d.getDate())
            );
        }
    }

    function daftarTanggalJadwal() {
        if (TANGGAL_JADWAL) {
            return [TANGGAL_JADWAL];
        }

        var daftar = [];

        if (AMBIL_JADWAL_KEMARIN) {
            daftar.push(tanggalWIB(-1));
        }

        daftar.push(tanggalWIB(0));

        if (AMBIL_JADWAL_BESOK) {
            daftar.push(tanggalWIB(1));
        }

        return daftar;
    }

    function buatUrlApi() {
        var params = [];

        if (PAKAI_NOCACHE_WORKER) {
            params.push("nocache=1");
        }

        if (params.length === 0) {
            return JADWAL_OTOMATIS_URL;
        }

        var pemisah = JADWAL_OTOMATIS_URL.indexOf("?") >= 0 ? "&" : "?";

        return JADWAL_OTOMATIS_URL + pemisah + params.join("&");
    }
    function simpanCachePertandingan(data) {
        try {
            localStorage.setItem(
                CACHE_KEY_PERTANDINGAN,
                JSON.stringify({
                    waktu: Date.now(),
                    data: data
                })
            );
        } catch (e) { }
    }

    function ambilCachePertandingan() {
        try {
            var raw = localStorage.getItem(CACHE_KEY_PERTANDINGAN);

            if (!raw) {
                return [];
            }

            var parsed = JSON.parse(raw);

            if (!parsed || !Array.isArray(parsed.data)) {
                return [];
            }

            waktuCacheTerakhir = Number(parsed.waktu) || 0;

            if (Date.now() - waktuCacheTerakhir > CACHE_MAX_AGE_MS) {
                waktuCacheTerakhir = 0;
                return [];
            }

            return parsed.data;
        } catch (e) {
            return [];
        }
    }

    function pakaiCachePertandingan() {
        var cache = ambilCachePertandingan();

        if (cache.length === 0) {
            return false;
        }

        setDataPertandinganDariArray(cache, false, false);

        if (waktuCacheTerakhir > 0) {
            waktuAmbilDataTerakhir = Math.max(
                waktuAmbilDataTerakhir,
                waktuCacheTerakhir
            );
        }

        console.log("Popup bola: memakai cache jadwal:", pertandingan);

        return true;
    }

    function ambilKunciRequest() {
        try {
            var sekarang = Date.now();
            var raw = localStorage.getItem(REQUEST_LOCK_KEY);
            var lock = raw ? JSON.parse(raw) : null;

            if (
                lock &&
                lock.owner !== TAB_ID &&
                Number(lock.until || 0) > sekarang
            ) {
                return false;
            }

            var kandidat = {
                owner: TAB_ID,
                until: sekarang + REQUEST_LOCK_MS
            };

            localStorage.setItem(REQUEST_LOCK_KEY, JSON.stringify(kandidat));

            var verifikasi = JSON.parse(
                localStorage.getItem(REQUEST_LOCK_KEY) || "null"
            );

            return Boolean(verifikasi && verifikasi.owner === TAB_ID);
        } catch (e) {
            return true;
        }
    }

    function lepasKunciRequest() {
        try {
            var raw = localStorage.getItem(REQUEST_LOCK_KEY);
            var lock = raw ? JSON.parse(raw) : null;

            if (lock && lock.owner === TAB_ID) {
                localStorage.removeItem(REQUEST_LOCK_KEY);
            }
        } catch (e) { }
    }

    function setDataPertandinganDariArray(
        arr,
        simpanCache,
        batasiKeTanggalTerpilih
    ) {
        var hasil = [];
        var tanggalDiizinkan = daftarTanggalJadwal();

        for (var i = 0; i < arr.length; i++) {
            var item = normalisasiMatch(arr[i]);

            if (!item) {
                continue;
            }

            if (
                batasiKeTanggalTerpilih !== false &&
                tanggalDiizinkan.indexOf(item.tanggal) === -1
            ) {
                continue;
            }

            hasil.push(item);
        }

        hasil.sort(function (a, b) {
            return ambilKickoff(a).getTime() - ambilKickoff(b).getTime();
        });

        if (hasil.length > 0) {
            pertandingan = hasil;

            if (simpanCache !== false) {
                simpanCachePertandingan(hasil);
            }

            return true;
        }

        return false;
    }

    function ambilJadwalOtomatis(callback) {
        if (sedangAmbilData) {
            if (typeof callback === "function") {
                callback();
            }

            return;
        }

        if (!ambilKunciRequest()) {
            pakaiCachePertandingan();

            if (typeof callback === "function") {
                callback();
            }

            return;
        }

        sedangAmbilData = true;

        var controller = typeof AbortController !== "undefined"
            ? new AbortController()
            : null;

        var timeoutId = controller
            ? setTimeout(function () {
                controller.abort();
            }, REQUEST_TIMEOUT_MS)
            : null;

        fetch(buatUrlApi(), {
            method: "GET",
            cache: "default",
            headers: {
                Accept: "application/json"
            },
            signal: controller ? controller.signal : undefined
        })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error("Worker mengembalikan HTTP " + res.status);
                }

                return res.json();
            })
            .then(function (data) {
                var semuaMatches = [];

                var rekomendasi = Number(data && data.recommendedPollMs);

                if (Number.isFinite(rekomendasi)) {
                    intervalRekomendasiWorkerMs = Math.max(
                        REFRESH_DATA_LIVE_MS,
                        Math.min(REFRESH_DATA_IDLE_MS, rekomendasi)
                    );
                }

                if (data && data.ok && Array.isArray(data.matches)) {
                    semuaMatches = data.matches;
                } else if (data && data.success && Array.isArray(data.matches)) {
                    semuaMatches = data.matches;
                } else if (Array.isArray(data && data.data)) {
                    semuaMatches = data.data;
                } else if (Array.isArray(data)) {
                    semuaMatches = data;
                }

                if (semuaMatches.length > 0) {
                    var berhasil = setDataPertandinganDariArray(
                        semuaMatches,
                        true,
                        true
                    );

                    if (berhasil) {
                        console.log(
                            "Popup bola: jadwal berhasil:",
                            pertandingan
                        );
                    } else {
                        console.warn(
                            "Popup bola: data API tersedia, tetapi tidak ada pertandingan pada rentang tanggal yang dipilih:",
                            daftarTanggalJadwal()
                        );
                    }
                } else {
                    console.warn(
                        "Popup bola: Worker berhasil diakses, tapi matches kosong. Data lama tidak dihapus.",
                        data
                    );
                }
            })
            .catch(function (err) {
                console.warn("Popup bola: gagal mengambil data", err);
            })
            .finally(function () {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                sedangAmbilData = false;
                waktuAmbilDataTerakhir = Date.now();
                lepasKunciRequest();

                if (typeof callback === "function") {
                    callback();
                }
            });
    }

    function adaPertandinganSedangBerlangsung() {
        var sekarangMs = Date.now();

        for (var i = 0; i < pertandingan.length; i++) {
            var match = pertandingan[i];

            if (statusSelesai(match.status)) {
                continue;
            }

            if (statusSedangLive(match.status)) {
                return true;
            }

            var kickoff = ambilKickoff(match);

            if (isNaN(kickoff.getTime())) {
                continue;
            }

            var selesaiMaksimumMs =
                kickoff.getTime() + DURASI_REFRESH_LIVE_MENIT * 60 * 1000;

            if (
                sekarangMs >= kickoff.getTime() &&
                sekarangMs <= selesaiMaksimumMs
            ) {
                return true;
            }
        }

        return false;
    }

    function ambilIntervalRefreshSaatIni() {
        var intervalLokal = adaPertandinganSedangBerlangsung()
            ? REFRESH_DATA_LIVE_MS
            : REFRESH_DATA_IDLE_MS;

        return Math.max(
            REFRESH_DATA_LIVE_MS,
            Math.min(
                REFRESH_DATA_IDLE_MS,
                intervalLokal,
                intervalRekomendasiWorkerMs
            )
        );
    }

    function perluAmbilDataUlang() {
        if (!waktuAmbilDataTerakhir) {
            return true;
        }

        return (
            Date.now() - waktuAmbilDataTerakhir >= ambilIntervalRefreshSaatIni()
        );
    }

    function formatSisaDurasi(ms) {
        var totalDetik = Math.max(0, Math.ceil(ms / 1000));
        var menit = Math.floor(totalDetik / 60);
        var detik = totalDetik % 60;

        return duaDigit(menit) + ":" + duaDigit(detik);
    }

    function ambilWaktuSelesaiMs(match, sekarang) {
        var kandidat = [match.finishedAt, match.lastUpdated];

        for (var i = 0; i < kandidat.length; i++) {
            var parsed = Date.parse(kandidat[i] || "");

            if (Number.isFinite(parsed)) {
                waktuSelesaiLokal[match.id] = parsed;
                return parsed;
            }
        }

        if (!waktuSelesaiLokal[match.id]) {
            waktuSelesaiLokal[match.id] = sekarang.getTime();
        }

        return waktuSelesaiLokal[match.id];
    }

    function formatDurasiHMS(totalDetik) {
        totalDetik = Math.max(0, Math.floor(Number(totalDetik) || 0));

        var jam = Math.floor(totalDetik / 3600);
        var menit = Math.floor((totalDetik % 3600) / 60);
        var detik = totalDetik % 60;

        return duaDigit(jam) + ":" + duaDigit(menit) + ":" + duaDigit(detik);
    }

    function formatJamPertandingan(match, sekarang) {
        sekarang = sekarang || new Date();

        var status = normalisasiStatusApi(match.status);
        var menitApi = angkaAtauNull(match.minute);
        var injuryApi = angkaAtauNull(match.injuryTime);

        if (
            menitApi !== null &&
            (status === "HT" ||
                status === "FT" ||
                status === "AET" ||
                status === "PEN" ||
                status === "SUSP")
        ) {
            var injuryTetap =
                injuryApi !== null && injuryApi > 0 ? injuryApi : 0;

            return formatDurasiHMS(
                (Math.max(0, menitApi) + injuryTetap) * 60
            );
        }

        if (menitApi !== null) {
            var injury = injuryApi !== null && injuryApi > 0 ? injuryApi : 0;
            var menitGabungan = Math.max(0, menitApi) + injury;
            var idJam = String(match.id || (match.home + "-" + match.away));
            var signatureJam =
                String(status) + "|" + String(menitApi) + "|" + String(injury);
            var state = jamPertandinganLokal[idJam];

            if (!state || state.signature !== signatureJam) {
                var detikAwal = 0;
                var waktuUpdateProvider = Date.parse(match.lastUpdated || "");

                if (Number.isFinite(waktuUpdateProvider)) {
                    detikAwal = Math.max(
                        0,
                        Math.min(
                            59,
                            Math.floor((sekarang.getTime() - waktuUpdateProvider) / 1000)
                        )
                    );
                }

                var kandidatDetik = menitGabungan * 60 + detikAwal;

                if (state && Number.isFinite(state.detikTerakhir)) {
                    kandidatDetik = Math.max(kandidatDetik, state.detikTerakhir);
                }

                state = {
                    signature: signatureJam,
                    mulaiMs: sekarang.getTime(),
                    detikDasar: kandidatDetik,
                    detikTerakhir: kandidatDetik
                };

                jamPertandinganLokal[idJam] = state;
            }

            var tambahanDetik = Math.max(
                0,
                Math.floor((sekarang.getTime() - state.mulaiMs) / 1000)
            );
            var totalDetik = state.detikDasar + tambahanDetik;

            state.detikTerakhir = Math.max(state.detikTerakhir || 0, totalDetik);

            return formatDurasiHMS(state.detikTerakhir);
        }

        var kickoff = ambilKickoff(match);

        if (isNaN(kickoff.getTime())) {
            return "00:00:00";
        }

        var detikSejakKickoff = Math.max(
            0,
            Math.floor((sekarang.getTime() - kickoff.getTime()) / 1000)
        );

        if (detikSejakKickoff > 60 * 60) {
            detikSejakKickoff -= 15 * 60;
        }

        return formatDurasiHMS(detikSejakKickoff);
    }

    function ambilInfoPertandingan(match, sekarang) {
        var kickoff = ambilKickoff(match);

        if (isNaN(kickoff.getTime())) {
            return null;
        }

        sekarang = sekarang || new Date();

        var status = normalisasiStatusApi(match.status);
        var mulaiTampil = TAMPILKAN_SEBELUM_KICKOFF_SEPANJANG_WAKTU
            ? new Date(0)
            : new Date(kickoff.getTime() - MENIT_SEBELUM_KICKOFF * 60 * 1000);

        var selesaiTampil = new Date(
            kickoff.getTime() + DURASI_PERTANDINGAN_MENIT * 60 * 1000
        );

        if (statusTidakDimainkan(status)) {
            return {
                aktif: false,
                fase: "tidak_dimainkan",
                deskripsi: "Pertandingan tidak dimainkan",
                kickoff: kickoff,
                mulaiTampil: mulaiTampil,
                selesaiTampil: selesaiTampil,
                jarakKeKickoff: Math.abs(sekarang.getTime() - kickoff.getTime()),
                isLive: false,
                isFuture: false,
                isFinishedHold: false,
                prioritas: 9
            };
        }

        if (statusFullTime(status)) {
            var waktuSelesaiMs = ambilWaktuSelesaiMs(match, sekarang);
            var batasFullTimeMs = waktuSelesaiMs + TAHAN_FULL_TIME_MS;
            var sisaFullTimeMs = batasFullTimeMs - sekarang.getTime();

            if (sisaFullTimeMs > 0) {
                return {
                    aktif: true,
                    fase: "full_time",
                    deskripsi: "Pertandingan selesai",
                    kickoff: kickoff,
                    mulaiTampil: mulaiTampil,
                    selesaiTampil: new Date(batasFullTimeMs),
                    waktuSelesaiMs: waktuSelesaiMs,
                    sisaFullTimeMs: sisaFullTimeMs,
                    jarakKeKickoff: Math.abs(sekarang.getTime() - kickoff.getTime()),
                    isLive: false,
                    isFuture: false,
                    isFinishedHold: true,
                    prioritas: 0
                };
            }

            return {
                aktif: false,
                fase: "selesai",
                deskripsi: "Pertandingan selesai",
                kickoff: kickoff,
                mulaiTampil: mulaiTampil,
                selesaiTampil: new Date(batasFullTimeMs),
                jarakKeKickoff: Math.abs(sekarang.getTime() - kickoff.getTime()),
                isLive: false,
                isFuture: false,
                isFinishedHold: false,
                prioritas: 9
            };
        }

        var liveDariStatus = statusSedangLive(status);
        var sudahLewatDariJam = sekarang > selesaiTampil && !liveDariStatus;
        var sebelumKickoff = sekarang < kickoff;
        var dalamWaktuTampil = sekarang >= mulaiTampil && sekarang <= selesaiTampil;
        var dalamWaktuPertandingan =
            sekarang >= kickoff && sekarang <= selesaiTampil;

        if (sudahLewatDariJam) {
            return {
                aktif: false,
                fase: "selesai_tanpa_status",
                deskripsi: "Pertandingan selesai",
                kickoff: kickoff,
                mulaiTampil: mulaiTampil,
                selesaiTampil: selesaiTampil,
                jarakKeKickoff: Math.abs(sekarang.getTime() - kickoff.getTime()),
                isLive: false,
                isFuture: false,
                isFinishedHold: false,
                prioritas: 9
            };
        }

        var aktif =
            liveDariStatus ||
            dalamWaktuPertandingan ||
            dalamWaktuTampil ||
            (TAMPILKAN_SEBELUM_KICKOFF_SEPANJANG_WAKTU && sebelumKickoff);

        var fase;
        var deskripsi;

        if (status === "HT") {
            fase = "half_time";
            deskripsi = "Half time, pertandingan akan dilanjutkan";
        } else if (status === "SUSP") {
            fase = "suspended";
            deskripsi = "Pertandingan dihentikan sementara";
        } else if (sebelumKickoff && !liveDariStatus) {
            fase = "akan_mulai";
            deskripsi = "Pertandingan akan di mulai, ayo tonton gratis";
        } else {
            fase = "sedang_berlangsung";
            deskripsi = "Sedang berlangsung, ayo tonton gratis";
        }

        return {
            aktif: aktif,
            fase: fase,
            deskripsi: deskripsi,
            kickoff: kickoff,
            mulaiTampil: mulaiTampil,
            selesaiTampil: selesaiTampil,
            jarakKeKickoff: Math.abs(sekarang.getTime() - kickoff.getTime()),
            isLive: liveDariStatus || dalamWaktuPertandingan,
            isFuture: sebelumKickoff,
            isFinishedHold: false,
            prioritas: liveDariStatus || dalamWaktuPertandingan ? 1 : 2
        };
    }
    function ambilDaftarPertandinganAktif() {
        var sekarang = new Date();
        var tanggalHariIni = tanggalWIB(0); 
        var kandidat = [];

        for (var i = 0; i < pertandingan.length; i++) {
            var match = pertandingan[i];

            if (popupDitutup[match.id]) {
                continue;
            }
            if (match.tanggal && match.tanggal < tanggalHariIni) {
                continue;
            }

            var info = ambilInfoPertandingan(match, sekarang);

            if (!info || !info.aktif) {
                continue;
            }

            kandidat.push({
                match: match,
                info: info
            });
        }

        kandidat.sort(function (a, b) {
            if (a.info.prioritas !== b.info.prioritas) {
                return a.info.prioritas - b.info.prioritas;
            }
            if (a.info.isFinishedHold && b.info.isFinishedHold) {
                return b.info.waktuSelesaiMs - a.info.waktuSelesaiMs;
            }
            if (a.info.isFuture && b.info.isFuture) {
                return a.info.kickoff.getTime() - b.info.kickoff.getTime();
            }
            return a.info.jarakKeKickoff - b.info.jarakKeKickoff;
        });

        return kandidat;
    }

    var ROTASI_MS = 5000;            
    var rotasiIndex = 0;           
    var rotasiTerakhirMs = 0;       
    var rotasiIdTampil = null;      

    function ambilPertandinganAktif() {
        var daftar = ambilDaftarPertandinganAktif();

        if (daftar.length === 0) {
            rotasiIdTampil = null;
            return null;
        }

        var now = Date.now();
        if (rotasiTerakhirMs === 0) {
            rotasiTerakhirMs = now;
        } else if (now - rotasiTerakhirMs >= ROTASI_MS && daftar.length > 1) {
            rotasiIndex++;
            rotasiTerakhirMs = now;
        }

        if (rotasiIndex >= daftar.length) {
            rotasiIndex = rotasiIndex % daftar.length;
        }

        var dipilih = daftar[rotasiIndex];
        dipilih.isGanti = rotasiIdTampil !== null && rotasiIdTampil !== dipilih.match.id;
        rotasiIdTampil = dipilih.match.id;

        return dipilih;
    }


    function formatCountdown(match, info) {
        var kickoff = ambilKickoff(match);

        if (isNaN(kickoff.getTime())) {
            return "";
        }

        var sekarang = new Date();

        if (info && info.fase === "full_time") {
            return "FULL TIME";
        }

        if (info && info.fase === "half_time") {
            return "HALF TIME";
        }

        if (info && info.fase === "suspended") {
            return "SUSPENDED";
        }

        var diffMs = kickoff.getTime() - sekarang.getTime();

        if (diffMs > 0) {
            var totalDetik = Math.max(0, Math.floor(diffMs / 1000));
            var jam = Math.floor(totalDetik / 3600);
            var menit = Math.floor((totalDetik % 3600) / 60);
            var detik = totalDetik % 60;

            if (jam > 0) {
                return (
                    duaDigit(jam) +
                    ":" +
                    duaDigit(menit) +
                    ":" +
                    duaDigit(detik)
                );
            }

            return duaDigit(menit) + ":" + duaDigit(detik);
        }

        if (info && info.fase === "sedang_berlangsung") {
            return "LIVE";
        }

        return "";
    }

    function formatJamDiAtasSkor(match, info) {
        if (!info) {
            return "";
        }

        if (
            info.fase === "sedang_berlangsung" ||
            info.fase === "half_time" ||
            info.fase === "suspended"
        ) {
            return formatJamPertandingan(match, new Date());
        }

        return "";
    }

    function updateCountdown(popup, match, info) {
        var teks = formatCountdown(match, info);

        popup.setAttribute("data-countdown", teks);

        if (
            info &&
            (info.fase === "sedang_berlangsung" || info.fase === "half_time")
        ) {
            popup.classList.add("popup-score-is-live");
        } else {
            popup.classList.remove("popup-score-is-live");
        }
    }


    function ambilTargetOwl() {
        var daftarTarget = document.querySelectorAll(TARGET_SELECTOR);

        if (!daftarTarget || daftarTarget.length === 0) {
            return null;
        }

        return daftarTarget[TARGET_INDEX] || daftarTarget[0];
    }

    function hapusPopup() {
        hentikanMesinGelombang();

        var ids = [
            POPUP_ID,
            "popup-bola-after-owl",
            "popup-bola-scoreboard",
            "popup-bola-scoreboard-saranglive",
            "popup-bola-final-manual",
            "popup-bola-auto-saranglive",
            "popup-bola-auto-saranglive-v2"
        ];

        for (var i = 0; i < ids.length; i++) {
            var popup = document.getElementById(ids[i]);

            if (popup && popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }
    }

    var mesinGelombangAktif = false;
    var WAVE_AMPLITUDO = 0.08;   
    var WAVE_KECEPATAN = 1.0;  
    var WAVE_REDAM_PANGKAL = true; 
    var WAVE_SHADING = 0.22;    
    var WAVE_LEBAR_IRIS = 2;     
    var WAVE_LAPIS = [
        { panjang: 1.1, amp: 0.6, kecepatan: 1.0 },
        { panjang: 2.3, amp: 0.3, kecepatan: 1.45 },
        { panjang: 0.6, amp: 0.25, kecepatan: 0.7 }
    ];

    function gambarBenderaGelombang(span, waktuDetik) {
        if (span.getAttribute("data-flag-ready") !== "1") {
            return;
        }

        var canvas = span.querySelector(".popup-score-flag-canvas");
        var img = span.querySelector(".popup-score-flag-source");
        if (!canvas || !img || !img.naturalWidth) {
            return;
        }

        var rect = span.getBoundingClientRect();
        var cssW = Math.max(8, Math.round(rect.width));
        var cssH = Math.max(6, Math.round(rect.height));
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.round(cssW * dpr);
        var h = Math.round(cssH * dpr);

        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }

        var ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        var fase = parseFloat(span.getAttribute("data-wave-phase")) || 0;
        var amp = h * WAVE_AMPLITUDO;
        var TAU = Math.PI * 2;

        function offsetDi(x) {
            var nx = x / w; 
            var total = 0;
            for (var i = 0; i < WAVE_LAPIS.length; i++) {
                var L = WAVE_LAPIS[i];
                total +=
                    L.amp *
                    Math.sin(
                        TAU * L.panjang * nx - waktuDetik * WAVE_KECEPATAN * L.kecepatan - fase * (i + 1)
                    );
            }
            var redam = WAVE_REDAM_PANGKAL ? (0.25 + 0.75 * nx) : 1;
            return total * amp * redam;
        }

        try {
            var iris = Math.max(1, Math.round(WAVE_LEBAR_IRIS * dpr));
            var sX = 0;
            var sY = 0;
            var sW = img.naturalWidth;
            var sH = img.naturalHeight;
            var srcPerPx = sW / w;
            var margin = amp * 0.5;
            var tinggiBendera = Math.max(2, h - margin * 2);

            for (var x = 0; x < w; x += iris) {
                var lebar = Math.min(iris, w - x);
                var xMid = x + lebar / 2;

                var geser = offsetDi(xMid);
                var grad = offsetDi(xMid + 1) - offsetDi(xMid - 1);
                var skala = 1 - 0.06 * Math.min(1, Math.abs(grad) / 3);

                var dyTinggi = tinggiBendera * skala;
                var dy = margin + (tinggiBendera - dyTinggi) / 2 + geser;

                ctx.drawImage(
                    img,
                    sX + x * srcPerPx, sY, lebar * srcPerPx, sH,
                    x, dy, lebar + 1, dyTinggi
                );

                if (WAVE_SHADING > 0) {
                    var shade = Math.max(-1, Math.min(1, grad * 0.6));
                    if (shade > 0) {
                        ctx.fillStyle = "rgba(0,0,0," + (shade * WAVE_SHADING).toFixed(3) + ")";
                    } else {
                        ctx.fillStyle = "rgba(255,255,255," + (-shade * WAVE_SHADING * 0.7).toFixed(3) + ")";
                    }
                    ctx.fillRect(x, dy, lebar + 1, dyTinggi);
                }
            }
        } catch (e) {
            span.removeAttribute("data-flag-ready");
            var srcImg = span.querySelector(".popup-score-flag-source");
            var cv = span.querySelector(".popup-score-flag-canvas");
            if (srcImg) srcImg.style.opacity = "1";
            if (cv) cv.style.display = "none";
        }
    }

    function tickGelombang(timestamp) {
        if (!mesinGelombangAktif) {
            return;
        }

        var detik = timestamp / 1000;
        var popup = document.getElementById(POPUP_ID);

        if (popup) {
            var flags = popup.querySelectorAll(".popup-score-flag");
            for (var i = 0; i < flags.length; i++) {
                gambarBenderaGelombang(flags[i], detik);
            }
        }

        window.__POPUP_BOLA_WAVE_RAF__ = requestAnimationFrame(tickGelombang);
    }

    function pasangMesinGelombang() {
        if (
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            return;
        }

        if (mesinGelombangAktif) {
            return;
        }

        mesinGelombangAktif = true;
        window.__POPUP_BOLA_WAVE_RAF__ = requestAnimationFrame(tickGelombang);
    }

    function hentikanMesinGelombang() {
        mesinGelombangAktif = false;
        if (window.__POPUP_BOLA_WAVE_RAF__) {
            cancelAnimationFrame(window.__POPUP_BOLA_WAVE_RAF__);
            window.__POPUP_BOLA_WAVE_RAF__ = null;
        }
    }

    function buatImgFlag(src, alt) {
        var span = document.createElement("span");
        span.className = "popup-score-flag";
        span.setAttribute("role", "img");
        span.setAttribute("aria-label", alt || "");
        span.setAttribute("data-wave-phase", String(Math.random() * Math.PI * 2));
        span.setAttribute("data-flag-src", src || "");

        var canvas = document.createElement("canvas");
        canvas.className = "popup-score-flag-canvas";
        canvas.setAttribute("aria-hidden", "true");

        var img = document.createElement("img");
        img.className = "popup-score-flag-source";
        img.alt = alt || "";
        img.loading = "eager";
        img.setAttribute("decoding", "async");

        span.appendChild(canvas);
        span.appendChild(img);

        muatBenderaDuaTahap(span, img, canvas, src);

        return span;
    }
    var PAKAI_PROXY_BENDERA = true;
    var PROXY_BENDERA_BASE = "https://wsrv.nl/?url=";

    function urlProxiBendera(src) {
        if (!PAKAI_PROXY_BENDERA || !src) {
            return src;
        }
        if (src.indexOf("wsrv.nl") !== -1 || src.charAt(0) === "/") {
            return src;
        }
        return PROXY_BENDERA_BASE + encodeURIComponent(src) + "&output=png";
    }

    function muatBenderaDuaTahap(span, img, canvas, src) {
        if (!src) {
            return;
        }

        span.removeAttribute("data-flag-ready");
        var srcProxy = urlProxiBendera(src);
        var percobaanCors = new Image();
        percobaanCors.crossOrigin = "anonymous";
        percobaanCors.decoding = "async";

        percobaanCors.onload = function () {
            img.crossOrigin = "anonymous";
            img.onload = function () {
                span.setAttribute("data-flag-ready", "1");
                canvas.style.display = "";
                pasangMesinGelombang();
            };
            img.onerror = function () {
                muatBenderaBiasa(span, img, canvas, src);
            };
            img.src = srcProxy;
        };

        percobaanCors.onerror = function () {
            muatBenderaBiasa(span, img, canvas, src);
        };

        percobaanCors.src = srcProxy;
    }
    function muatBenderaBiasa(span, img, canvas, src) {
        span.removeAttribute("data-flag-ready");
        if (canvas) {
            canvas.style.display = "none";
        }
        img.removeAttribute("crossorigin");
        img.style.opacity = "1";
        img.style.visibility = "visible";
        img.onload = null;
        img.onerror = function () {
            img.style.visibility = "hidden";
        };
        img.src = src;
    }

    function buatPopup(match) {
        var popup = document.createElement("div");
        popup.id = POPUP_ID;
        popup.setAttribute("data-match-id", match.id);
        var mainRow = document.createElement("div");
        mainRow.className = "popup-score-main";
        var teamLeft = document.createElement("div");
        teamLeft.className = "popup-score-team popup-score-team-left";
        var center = document.createElement("div");
        center.className = "popup-score-center";
        var homeFlag = buatImgFlag(match.homeFlagImg, match.home);
        var middle = document.createElement("div");
        middle.className = "popup-score-middle";
        var matchClock = document.createElement("div");
        matchClock.className = "popup-score-clock";
        matchClock.setAttribute("aria-live", "off");
        var score = document.createElement("div");
        score.className = "popup-score-number";
        middle.appendChild(matchClock);
        middle.appendChild(score);
        var awayFlag = buatImgFlag(match.awayFlagImg, match.away);
        center.appendChild(homeFlag);
        center.appendChild(middle);
        center.appendChild(awayFlag);
        var teamRight = document.createElement("div");
        teamRight.className = "popup-score-team popup-score-team-right";
        mainRow.appendChild(teamLeft);
        mainRow.appendChild(center);
        mainRow.appendChild(teamRight);
        var ctaRow = document.createElement("div");
        ctaRow.className = "popup-score-cta-row";
        var bottom = document.createElement("div");
        bottom.className = "popup-score-bottom";
        var desc = document.createElement("div");
        desc.className = "popup-score-desc";
        bottom.appendChild(desc);
        var link = document.createElement("a");
        link.className = "popup-score-link";
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "KLIK DISINI";
        ctaRow.appendChild(bottom);
        ctaRow.appendChild(link);
        var close = document.createElement("button");
        close.className = "popup-score-close";
        close.type = "button";
        close.textContent = "\u00d7";
        close.onclick = function () {
            popupDitutup[match.id] = true;
            hapusPopup();
        };
        popup.appendChild(mainRow);
        popup.appendChild(ctaRow);
        popup.appendChild(close);
        return popup;
    }

    function updateGambar(spanFlag, src, alt) {
        if (!spanFlag) {
            return;
        }
        var img = spanFlag.querySelector(".popup-score-flag-source");
        var canvas = spanFlag.querySelector(".popup-score-flag-canvas");
        if (spanFlag.getAttribute("data-flag-src") !== src) {
            spanFlag.setAttribute("data-flag-src", src || "");
            if (img) {
                muatBenderaDuaTahap(spanFlag, img, canvas, src);
            }
        }

        if (img) {
            img.alt = alt || "";
        }
        spanFlag.setAttribute("aria-label", alt || "");
    }

    function updateIsiPopup(popup, match, info) {
        var teamLeft = popup.querySelector(".popup-score-team-left");
        var teamRight = popup.querySelector(".popup-score-team-right");
        var score = popup.querySelector(".popup-score-number");
        var matchClock = popup.querySelector(".popup-score-clock");
        var desc = popup.querySelector(".popup-score-desc");
        var link = popup.querySelector(".popup-score-link");
        var flags = popup.querySelectorAll(".popup-score-flag");

        var homeText = match.home;
        var awayText = match.away;
        var scoreText =
            angkaSkor(match.homeScore) + " : " + angkaSkor(match.awayScore);
        var clockText = formatJamDiAtasSkor(match, info);
        var descText = info.deskripsi;

        if (teamLeft && popup.getAttribute("data-home-text") !== homeText) {
            teamLeft.textContent = homeText;
            popup.setAttribute("data-home-text", homeText);
        }

        if (teamRight && popup.getAttribute("data-away-text") !== awayText) {
            teamRight.textContent = awayText;
            popup.setAttribute("data-away-text", awayText);
        }

        if (score && popup.getAttribute("data-score-text") !== scoreText) {
            score.textContent = scoreText;
            popup.setAttribute("data-score-text", scoreText);
        }

        if (matchClock) {
            if (popup.getAttribute("data-clock-text") !== clockText) {
                matchClock.textContent = clockText;
                popup.setAttribute("data-clock-text", clockText);
            }

            matchClock.setAttribute("data-visible", clockText ? "1" : "0");
        }

        if (flags.length >= 2) {
            updateGambar(flags[0], match.homeFlagImg, match.home);
            updateGambar(flags[1], match.awayFlagImg, match.away);
        }

        if (
            desc &&
            (popup.getAttribute("data-desc-text") !== descText ||
                popup.getAttribute("data-fase") !== info.fase)
        ) {
            while (desc.firstChild) {
                desc.removeChild(desc.firstChild);
            }

            if (info.fase !== "full_time") {
                var liveDot = document.createElement("span");

                liveDot.className =
                    info.fase === "akan_mulai" || info.fase === "suspended"
                        ? "popup-score-live-dot popup-score-dot-soon"
                        : "popup-score-live-dot popup-score-dot-live";

                desc.appendChild(liveDot);
            }

            desc.appendChild(document.createTextNode(descText));

            popup.setAttribute("data-desc-text", descText);
            popup.setAttribute("data-fase", info.fase);
        }

        if (link) {
            link.href = match.link || LINK_KLIK_DISINI || "#";
        }

        updateCountdown(popup, match, info);
    }

    function pasangPopup(match, info) {
        var target = ambilTargetOwl();

        if (!target || !target.parentNode) {
            console.warn("Popup bola: target tidak ditemukan:", TARGET_SELECTOR);
            return false;
        }

        var popup = document.getElementById(POPUP_ID);
        var bikinBaru = false;

        if (!popup || popup.getAttribute("data-match-id") !== match.id) {
            hapusPopup();
            popup = buatPopup(match);
            bikinBaru = true;
        }

        updateIsiPopup(popup, match, info);
        var slotKhusus = target.id === "livescore-banner-slot";
        if (slotKhusus) {
            if (popup.parentNode !== target) {
                target.appendChild(popup);
            }
        } else if (target.nextElementSibling !== popup) {
            target.insertAdjacentElement("afterend", popup);
        }

        if (bikinBaru && (info.isGanti || rotasiIdTampil)) {
            popup.classList.remove("popup-score-slide-masuk");
            void popup.offsetWidth;
            popup.classList.add("popup-score-slide-masuk");
        }

        return true;
    }

    function modeMobileAktif() {
        if (!HANYA_MOBILE) {
            return true;
        }

        if (window.matchMedia) {
            return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
        }

        return window.innerWidth <= MOBILE_MAX_WIDTH;
    }

    function hentikanModeDesktop() {
        if (window.__POPUP_BOLA_AUTO_INTERVAL__) {
            clearInterval(window.__POPUP_BOLA_AUTO_INTERVAL__);
            window.__POPUP_BOLA_AUTO_INTERVAL__ = null;
        }

        if (window.__POPUP_BOLA_AUTO_OBSERVER__) {
            window.__POPUP_BOLA_AUTO_OBSERVER__.disconnect();
            window.__POPUP_BOLA_AUTO_OBSERVER__ = null;
        }

        hapusPopup();
        hapusStyleLama();
    }

    function cekDanTampilkanPopup() {
        if (!modeMobileAktif()) {
            hentikanModeDesktop();
            return;
        }

        pasangCSS();

        var aktif = ambilPertandinganAktif();

        if (!aktif) {
            if (sedangAmbilData || pertandingan.length === 0) {
                return;
            }

            hapusPopup();
            return;
        }

        pasangPopup(aktif.match, aktif.info);
    }

    function tick() {
        if (!modeMobileAktif()) {
            hentikanModeDesktop();
            return;
        }

        if (document.hidden) {
            return;
        }
        var tanggalSekarang = tanggalWIB(0);
        if (tanggalAktifTerakhir === null) {
            tanggalAktifTerakhir = tanggalSekarang;
        } else if (tanggalSekarang !== tanggalAktifTerakhir) {
            tanggalAktifTerakhir = tanggalSekarang;
            waktuAmbilDataTerakhir = 0;
            popupDitutup = {};         
            rotasiIndex = 0;
            rotasiTerakhirMs = 0;
            rotasiIdTampil = null;
        }

        if (perluAmbilDataUlang()) {
            ambilJadwalOtomatis(function () {
                cekDanTampilkanPopup();
            });
        } else {
            cekDanTampilkanPopup();
        }
    }


    function mulai() {
        if (!modeMobileAktif()) {
            hentikanModeDesktop();
            return;
        }

        if (window.__POPUP_BOLA_AUTO_INTERVAL__) {
            clearInterval(window.__POPUP_BOLA_AUTO_INTERVAL__);
        }

        if (window.__POPUP_BOLA_AUTO_OBSERVER__) {
            window.__POPUP_BOLA_AUTO_OBSERVER__.disconnect();
        }

        hapusStyleLama();
        hapusPopup();
        pasangCSS();

        var cacheDipakai = pakaiCachePertandingan();
        cekDanTampilkanPopup();

        if (!cacheDipakai || perluAmbilDataUlang()) {
            ambilJadwalOtomatis(function () {
                cekDanTampilkanPopup();
            });
        }

        window.__POPUP_BOLA_AUTO_INTERVAL__ = setInterval(function () {
            tick();
        }, CEK_POPUP_MS);

        if (window.MutationObserver) {
            window.__POPUP_BOLA_AUTO_OBSERVER__ = new MutationObserver(function () {
                cekDanTampilkanPopup();
            });

            window.__POPUP_BOLA_AUTO_OBSERVER__.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    function pasangPemantauUkuranMobile() {
        if (!window.matchMedia) {
            return;
        }

        var mediaLama = window.__POPUP_BOLA_MOBILE_MEDIA__;
        var handlerLama = window.__POPUP_BOLA_MOBILE_HANDLER__;

        if (mediaLama && handlerLama) {
            if (typeof mediaLama.removeEventListener === "function") {
                mediaLama.removeEventListener("change", handlerLama);
            } else if (typeof mediaLama.removeListener === "function") {
                mediaLama.removeListener(handlerLama);
            }
        }

        var mediaMobile = window.matchMedia(MOBILE_MEDIA_QUERY);

        var handlerMobile = function (event) {
            if (event.matches) {
                waktuAmbilDataTerakhir = 0;
                mulai();
            } else {
                hentikanModeDesktop();
            }
        };

        if (typeof mediaMobile.addEventListener === "function") {
            mediaMobile.addEventListener("change", handlerMobile);
        } else if (typeof mediaMobile.addListener === "function") {
            mediaMobile.addListener(handlerMobile);
        }

        window.__POPUP_BOLA_MOBILE_MEDIA__ = mediaMobile;
        window.__POPUP_BOLA_MOBILE_HANDLER__ = handlerMobile;
    }

    function inisialisasiMobileOnly() {
        pasangPemantauUkuranMobile();

        if (modeMobileAktif()) {
            mulai();
        } else {
            hentikanModeDesktop();
        }
    }

    if (!window.__POPUP_BOLA_REALTIME_EVENTS__) {
        window.__POPUP_BOLA_REALTIME_EVENTS__ = true;

        document.addEventListener("visibilitychange", function () {
            if (!document.hidden && modeMobileAktif()) {
                if (adaPertandinganSedangBerlangsung()) {
                    waktuAmbilDataTerakhir = 0;
                }

                tick();
            }
        });

        window.addEventListener("online", function () {
            if (modeMobileAktif()) {
                if (
                    adaPertandinganSedangBerlangsung() ||
                    waktuAmbilDataTerakhir === 0
                ) {
                    waktuAmbilDataTerakhir = 0;
                }

                tick();
            }
        });
    }

    window.addEventListener("storage", function (event) {
        if (event.key !== CACHE_KEY_PERTANDINGAN || !modeMobileAktif()) {
            return;
        }

        if (pakaiCachePertandingan()) {
            cekDanTampilkanPopup();
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inisialisasiMobileOnly);
    } else {
        inisialisasiMobileOnly();
    }
})();
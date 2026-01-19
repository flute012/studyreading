(function () {
    'use strict';

    // 等待原程式載入完成
    function waitForApp() {
        if (typeof Vue !== 'undefined' && document.querySelector('#app').__vue__) {
            initAnalytics();
        } else {
            setTimeout(waitForApp, 500);
        }
    }

    function initAnalytics() {
        // GA4 和 Clarity 初始化
        initGA4();
        initClarity();

        // 設置自動追蹤
        setupAutoTracking();

        console.log('📊 Analytics loaded');
    }

    function initGA4() {
        // 避免在本地環境初始化
        const blockedHosts = ["127.0.0.1", "localhost"];
        if (blockedHosts.includes(window.location.hostname)) {
            console.log("GA4 disabled in local environment");
            return;
        }

        const GA_ID = "G-K71JEFRBPX";

        // 動態載入 GA4
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        document.head.appendChild(script);

        // 初始化 dataLayer 與 gtag
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        window.gtag = gtag;

        gtag('js', new Date());
        gtag('config', GA_ID, { send_page_view: false });
    }

    function initClarity() {
        (function (c, l, a, r, i, t, y) {
            c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) };
            var t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
            var y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
        })(window, document, "clarity", "script", "swiwtlvud8");
    }

    function setupAutoTracking() {
        // 追蹤頁面瀏覽
        trackPageView();

        // 監聽 Vue 數據變化
        observeVueData();

        // 監聽所有點擊
        document.addEventListener('click', handleClicks);

        // 監聽音頻（當可用時）
        observeAudioElement();

        // 監聽翻譯切換
        observeTranslationToggle();
    }

    function trackPageView() {
        const lessonId = new URLSearchParams(location.search).get('lesson') || 'unknown';
        const lessonTitle = getCurrentLessonTitle();

        if (window.gtag) {
            gtag('event', 'page_view', {
                lesson_id: lessonId,
                lesson_title: lessonTitle,
                page_title: lessonTitle
            });
        }

        console.log(`📊 Page view tracked: ${lessonTitle} (${lessonId})`);
    }

    // 獲取當前課程標題
    function getCurrentLessonTitle() {
        let title = '';

        // 方法1: 從 h1 元素獲取
        const h1Element = document.querySelector('h1');
        if (h1Element && h1Element.textContent.trim()) {
            title = h1Element.textContent.trim();
        }

        // 方法2: 從 Vue 實例獲取（如果可訪問）
        if (!title) {
            try {
                const app = document.querySelector('#app').__vue__;
                if (app && app.lessonTitle) {
                    title = app.lessonTitle;
                }
            } catch (e) {
                // 忽略錯誤，繼續其他方法
            }
        }

        // 方法3: 從 URL 參數推斷
        if (!title) {
            const lessonId = new URLSearchParams(location.search).get('lesson');
            if (lessonId) {
                title = `${lessonId} - Reading`; // 基本格式
            }
        }

        // 方法4: 使用 document.title 作為後備
        if (!title) {
            title = document.title || 'B1 Reading';
        }

        // 確保標題包含 " - Reading" 後綴
        if (title && !title.includes(' - Reading')) {
            title = `${title} - Reading`;
        }

        return title;
    }

    // 監聽 Vue 數據變化
    function observeVueData() {
        let lastTitle = '';
        let lastLessonId = '';

        // 定期檢查標題變化
        const checkTitleChange = () => {
            const currentTitle = getCurrentLessonTitle();
            const currentLessonId = new URLSearchParams(location.search).get('lesson') || '';

            // 如果標題或課程ID發生變化
            if (currentTitle !== lastTitle || currentLessonId !== lastLessonId) {
                lastTitle = currentTitle;
                lastLessonId = currentLessonId;

                // 更新 document.title
                if (currentTitle && currentTitle !== document.title) {
                    document.title = currentTitle;
                }

                // 重新追蹤頁面瀏覽
                trackPageView();

                console.log(`📊 Title updated: ${currentTitle}`);
            }
        };

        // 使用 MutationObserver 監聽 DOM 變化
        const observer = new MutationObserver(() => {
            checkTitleChange();
        });

        // 監聽 h1 元素變化
        const h1Element = document.querySelector('h1');
        if (h1Element) {
            observer.observe(h1Element, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }

        // 監聽整個 app 區域變化（作為備用）
        const appElement = document.querySelector('#app');
        if (appElement) {
            observer.observe(appElement, {
                childList: true,
                subtree: true
            });
        }

        // 定期檢查（每2秒）作為最後保障
        setInterval(checkTitleChange, 2000);

        // 初始檢查
        setTimeout(checkTitleChange, 1000);
    }

    function handleClicks(e) {
        const target = e.target;

        // 詞彙點擊
        if (target.closest('b[id], [data-id], .vocab-word')) {
            const word = target.textContent.trim();
            track('vocabulary_click', { word_text: word });
        }

        // 播放按鈕
        if (target.closest('#playPauseBtn')) {
            track('audio_control', { action: 'toggle' });
        }

        // 速度按鈕
        if (target.closest('#speedBtn')) {
            track('speed_modal', { action: 'open' });
        }

        // 說明按鈕
        if (target.closest('#instructionsBtn')) {
            track('instructions_modal', { action: 'open' });
        }

        // 首頁按鈕
        if (target.closest('.home-button')) {
            track('home_button_click', {
                from_lesson: new URLSearchParams(location.search).get('lesson') || 'unknown'
            });
        }
    }

    function observeAudioElement() {
        const observer = new MutationObserver(() => {
            const audio = document.querySelector('audio');
            if (audio && !audio.hasAttribute('data-tracked')) {
                audio.setAttribute('data-tracked', 'true');
                setupAudioTracking(audio);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function setupAudioTracking(audio) {
        audio.addEventListener('play', () => track('audio_play'));
        audio.addEventListener('pause', () => track('audio_pause'));
        audio.addEventListener('ended', () => track('audio_ended'));

        // 追蹤播放進度（每30秒記錄一次）
        let progressTimer;
        audio.addEventListener('play', () => {
            progressTimer = setInterval(() => {
                if (!audio.paused) {
                    const progress = Math.round((audio.currentTime / audio.duration) * 100);
                    if (progress % 25 === 0) { // 25%, 50%, 75%, 100%
                        track('audio_progress', {
                            progress_percent: progress,
                            current_time: Math.round(audio.currentTime)
                        });
                    }
                }
            }, 30000);
        });

        audio.addEventListener('pause', () => {
            if (progressTimer) clearInterval(progressTimer);
        });

        audio.addEventListener('ended', () => {
            if (progressTimer) clearInterval(progressTimer);
        });
    }

    function observeTranslationToggle() {
        const observer = new MutationObserver(() => {
            const toggle = document.querySelector('#translationToggle');
            if (toggle && !toggle.hasAttribute('data-tracked')) {
                toggle.setAttribute('data-tracked', 'true');
                toggle.addEventListener('change', (e) => {
                    track('translation_toggle', { enabled: e.target.checked });
                });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function track(eventName, params = {}) {
        const lessonId = new URLSearchParams(location.search).get('lesson') || 'unknown';
        const currentTitle = getCurrentLessonTitle();

        if (window.gtag) {
            gtag('event', eventName, {
                lesson_id: lessonId,
                page_title: currentTitle,
                ...params
            });
        }

        if (window.clarity) {
            clarity('event', eventName, params);
        }
    }

    // 啟動
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForApp);
    } else {
        waitForApp();
    }

})();
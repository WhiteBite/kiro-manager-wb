#!/usr/bin/env node
/**
 * Add missing proxy and OAuth translations to all locales
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/webview/i18n/locales');

// Missing translations to add
const missingTranslations = {
    en: {
        // Proxy
        proxyAddress: 'Proxy Address',
        proxyAddressPlaceholder: 'http://user:pass@host:port',
        testProxy: 'Test Proxy',
        testingProxy: 'Testing...',
        proxyWorking: 'Proxy is working',
        proxyNotWorking: 'Proxy is not working',
        proxyNotConfigured: 'Proxy not configured',
        proxyResponseTime: 'Response time',
        proxyIpAddress: 'IP Address',
        useProxyForRegistration: 'Use proxy for registration',
        useProxyForRegistrationDesc: 'Route registration traffic through proxy',
        proxyTestSuccess: 'Proxy test successful',
        proxyTestFailed: 'Proxy test failed',
        // OAuth (for locales missing it)
        oauthProvider: 'OAuth Provider',
        oauthProviderDesc: 'Choose provider for WebView registration',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: 'Ask every time',
        oauthProviderAskDesc: 'Show provider selection dialog',
        selectOAuthProvider: 'Select OAuth Provider',
        selectOAuthProviderDesc: 'Choose how to sign in to Kiro',
    },
    ru: {
        proxyAddress: 'Адрес прокси',
        proxyAddressPlaceholder: 'http://user:pass@host:port',
        testProxy: 'Тест прокси',
        testingProxy: 'Тестирование...',
        proxyWorking: 'Прокси работает',
        proxyNotWorking: 'Прокси не работает',
        proxyNotConfigured: 'Прокси не настроен',
        proxyResponseTime: 'Время ответа',
        proxyIpAddress: 'IP адрес',
        useProxyForRegistration: 'Использовать прокси для регистрации',
        useProxyForRegistrationDesc: 'Направлять трафик регистрации через прокси',
        proxyTestSuccess: 'Тест прокси успешен',
        proxyTestFailed: 'Тест прокси не пройден',
    },
    zh: {
        proxyAddress: '代理地址',
        proxyAddressPlaceholder: 'http://user:pass@host:port',
        testProxy: '测试代理',
        testingProxy: '测试中...',
        proxyWorking: '代理正常',
        proxyNotWorking: '代理不可用',
        proxyNotConfigured: '未配置代理',
        proxyResponseTime: '响应时间',
        proxyIpAddress: 'IP地址',
        useProxyForRegistration: '注册时使用代理',
        useProxyForRegistrationDesc: '通过代理路由注册流量',
        proxyTestSuccess: '代理测试成功',
        proxyTestFailed: '代理测试失败',
        oauthProvider: 'OAuth提供商',
        oauthProviderDesc: '选择WebView注册的提供商',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: '每次询问',
        oauthProviderAskDesc: '显示提供商选择对话框',
        selectOAuthProvider: '选择OAuth提供商',
        selectOAuthProviderDesc: '选择如何登录Kiro',
    },
    es: {
        proxyAddress: 'Dirección del proxy',
        proxyAddressPlaceholder: 'http://user:pass@host:port',
        testProxy: 'Probar proxy',
        testingProxy: 'Probando...',
        proxyWorking: 'El proxy funciona',
        proxyNotWorking: 'El proxy no funciona',
        proxyNotConfigured: 'Proxy no configurado',
        proxyResponseTime: 'Tiempo de respuesta',
        proxyIpAddress: 'Dirección IP',
        useProxyForRegistration: 'Usar proxy para registro',
        useProxyForRegistrationDesc: 'Enrutar tráfico de registro a través del proxy',
        proxyTestSuccess: 'Prueba de proxy exitosa',
        proxyTestFailed: 'Prueba de proxy fallida',
        oauthProvider: 'Proveedor OAuth',
        oauthProviderDesc: 'Elegir proveedor para registro WebView',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: 'Preguntar cada vez',
        oauthProviderAskDesc: 'Mostrar diálogo de selección',
        selectOAuthProvider: 'Seleccionar proveedor OAuth',
        selectOAuthProviderDesc: 'Elegir cómo iniciar sesión en Kiro',
    },
    pt: {
        proxyAddress: 'Endereço do proxy',
        proxyAddressPlaceholder: 'http://user:pass@host:port',
        testProxy: 'Testar proxy',
        testingProxy: 'Testando...',
        proxyWorking: 'Proxy funcionando',
        proxyNotWorking: 'Proxy não funciona',
        proxyNotConfigured: 'Proxy não configurado',
        proxyResponseTime: 'Tempo de resposta',
        proxyIpAddress: 'Endereço IP',
        useProxyForRegistration: 'Usar proxy para registro',
        useProxyForRegistrationDesc: 'Rotear tráfego de registro pelo proxy',
        proxyTestSuccess: 'Teste de proxy bem-sucedido',
        proxyTestFailed: 'Teste de proxy falhou',
        oauthProvider: 'Provedor OAuth',
        oauthProviderDesc: 'Escolher provedor para registro WebView',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: 'Perguntar sempre',
        oauthProviderAskDesc: 'Mostrar diálogo de seleção',
        selectOAuthProvider: 'Selecionar provedor OAuth',
        selectOAuthProviderDesc: 'Escolher como entrar no Kiro',
    },
    ja: {
        proxyAddress: 'プロキシアドレス',
        proxyAddressPlaceholder: 'http://user:pass@host:port',
        testProxy: 'プロキシテスト',
        testingProxy: 'テスト中...',
        proxyWorking: 'プロキシ正常',
        proxyNotWorking: 'プロキシ不可',
        proxyNotConfigured: 'プロキシ未設定',
        proxyResponseTime: '応答時間',
        proxyIpAddress: 'IPアドレス',
        useProxyForRegistration: '登録にプロキシを使用',
        useProxyForRegistrationDesc: '登録トラフィックをプロキシ経由',
        proxyTestSuccess: 'プロキシテスト成功',
        proxyTestFailed: 'プロキシテスト失敗',
        oauthProvider: 'OAuthプロバイダー',
        oauthProviderDesc: 'WebView登録のプロバイダーを選択',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: '毎回確認',
        oauthProviderAskDesc: 'プロバイダー選択ダイアログを表示',
        selectOAuthProvider: 'OAuthプロバイダーを選択',
        selectOAuthProviderDesc: 'Kiroへのログイン方法を選択',
    },
    de: {
        proxyAddress: 'Proxy-Adresse',
        proxyAddressPlaceholder: 'http://user:pass@host:port',
        testProxy: 'Proxy testen',
        testingProxy: 'Teste...',
        proxyWorking: 'Proxy funktioniert',
        proxyNotWorking: 'Proxy funktioniert nicht',
        proxyNotConfigured: 'Proxy nicht konfiguriert',
        proxyResponseTime: 'Antwortzeit',
        proxyIpAddress: 'IP-Adresse',
        useProxyForRegistration: 'Proxy für Registrierung verwenden',
        useProxyForRegistrationDesc: 'Registrierungsverkehr über Proxy leiten',
        proxyTestSuccess: 'Proxy-Test erfolgreich',
        proxyTestFailed: 'Proxy-Test fehlgeschlagen',
        oauthProvider: 'OAuth-Anbieter',
        oauthProviderDesc: 'Anbieter für WebView-Registrierung wählen',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: 'Jedes Mal fragen',
        oauthProviderAskDesc: 'Anbieterauswahl anzeigen',
        selectOAuthProvider: 'OAuth-Anbieter auswählen',
        selectOAuthProviderDesc: 'Wählen Sie, wie Sie sich bei Kiro anmelden',
    },
    fr: {
        proxyAddress: 'Adresse du proxy',
        proxyAddressPlaceholder: 'http://user:pass@host:port',
        testProxy: 'Tester le proxy',
        testingProxy: 'Test en cours...',
        proxyWorking: 'Le proxy fonctionne',
        proxyNotWorking: 'Le proxy ne fonctionne pas',
        proxyNotConfigured: 'Proxy non configuré',
        proxyResponseTime: 'Temps de réponse',
        proxyIpAddress: 'Adresse IP',
        useProxyForRegistration: 'Utiliser le proxy pour l\'inscription',
        useProxyForRegistrationDesc: 'Acheminer le trafic d\'inscription via le proxy',
        proxyTestSuccess: 'Test du proxy réussi',
        proxyTestFailed: 'Test du proxy échoué',
    },
    ko: {
        proxyAddress: '프록시 주소',
        proxyAddressPlaceholder: 'http://user:pass@host:port',
        testProxy: '프록시 테스트',
        testingProxy: '테스트 중...',
        proxyWorking: '프록시 작동 중',
        proxyNotWorking: '프록시 작동 안 함',
        proxyNotConfigured: '프록시 미설정',
        proxyResponseTime: '응답 시간',
        proxyIpAddress: 'IP 주소',
        useProxyForRegistration: '등록에 프록시 사용',
        useProxyForRegistrationDesc: '등록 트래픽을 프록시로 라우팅',
        proxyTestSuccess: '프록시 테스트 성공',
        proxyTestFailed: '프록시 테스트 실패',
        oauthProvider: 'OAuth 제공자',
        oauthProviderDesc: 'WebView 등록용 제공자 선택',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: '매번 묻기',
        oauthProviderAskDesc: '제공자 선택 대화상자 표시',
        selectOAuthProvider: 'OAuth 제공자 선택',
        selectOAuthProviderDesc: 'Kiro 로그인 방법 선택',
    },
    hi: {
        proxyAddress: 'प्रॉक्सी पता',
        proxyAddressPlaceholder: 'http://user:pass@host:port',
        testProxy: 'प्रॉक्सी टेस्ट',
        testingProxy: 'परीक्षण...',
        proxyWorking: 'प्रॉक्सी काम कर रहा है',
        proxyNotWorking: 'प्रॉक्सी काम नहीं कर रहा',
        proxyNotConfigured: 'प्रॉक्सी कॉन्फ़िगर नहीं',
        proxyResponseTime: 'प्रतिक्रिया समय',
        proxyIpAddress: 'IP पता',
        useProxyForRegistration: 'पंजीकरण के लिए प्रॉक्सी उपयोग करें',
        useProxyForRegistrationDesc: 'पंजीकरण ट्रैफ़िक को प्रॉक्सी के माध्यम से रूट करें',
        proxyTestSuccess: 'प्रॉक्सी टेस्ट सफल',
        proxyTestFailed: 'प्रॉक्सी टेस्ट विफल',
        oauthProvider: 'OAuth प्रदाता',
        oauthProviderDesc: 'WebView पंजीकरण के लिए प्रदाता चुनें',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: 'हर बार पूछें',
        oauthProviderAskDesc: 'प्रदाता चयन संवाद दिखाएं',
        selectOAuthProvider: 'OAuth प्रदाता चुनें',
        selectOAuthProviderDesc: 'Kiro में साइन इन करने का तरीका चुनें',
    },
};

// Process each locale file
const locales = ['en', 'ru', 'zh', 'es', 'pt', 'ja', 'de', 'fr', 'ko', 'hi'];

for (const locale of locales) {
    const filePath = path.join(localesDir, `${locale}.ts`);
    let content = fs.readFileSync(filePath, 'utf8');

    const translations = missingTranslations[locale] || missingTranslations.en;

    // Find the closing }; of the export
    const closingIndex = content.lastIndexOf('};');
    if (closingIndex === -1) {
        console.error(`Could not find closing }; in ${locale}.ts`);
        continue;
    }

    // Check which keys are missing
    const keysToAdd = [];
    for (const [key, value] of Object.entries(translations)) {
        // Check if key already exists
        const keyRegex = new RegExp(`\\b${key}\\s*:`);
        if (!keyRegex.test(content)) {
            keysToAdd.push([key, value]);
        }
    }

    if (keysToAdd.length === 0) {
        console.log(`${locale}.ts - all keys present`);
        continue;
    }

    // Build the new entries
    let newEntries = '\n  // Proxy & OAuth (auto-added)\n';
    for (const [key, value] of keysToAdd) {
        const escapedValue = typeof value === 'string' ? value.replace(/'/g, "\\'") : value;
        newEntries += `  ${key}: '${escapedValue}',\n`;
    }

    // Insert before closing };
    content = content.slice(0, closingIndex) + newEntries + content.slice(closingIndex);

    fs.writeFileSync(filePath, content);
    console.log(`${locale}.ts - added ${keysToAdd.length} keys`);
}

console.log('Done!');

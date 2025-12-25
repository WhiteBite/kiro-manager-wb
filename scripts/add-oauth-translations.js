const fs = require('fs');
const path = require('path');

const localesDir = 'src/webview/i18n/locales';
const locales = ['zh', 'es', 'pt', 'ja', 'de', 'fr', 'ko', 'hi'];

const translations = {
    zh: {
        oauthProvider: 'OAuth 提供商',
        oauthProviderDesc: '选择 WebView 注册的提供商',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: '每次询问',
        oauthProviderAskDesc: '显示提供商选择对话框',
        selectOAuthProvider: '选择 OAuth 提供商',
        selectOAuthProviderDesc: '选择如何登录 Kiro',
    },
    es: {
        oauthProvider: 'Proveedor OAuth',
        oauthProviderDesc: 'Elegir proveedor para registro WebView',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: 'Preguntar cada vez',
        oauthProviderAskDesc: 'Mostrar diálogo de selección',
        selectOAuthProvider: 'Seleccionar proveedor OAuth',
        selectOAuthProviderDesc: 'Cómo iniciar sesión en Kiro',
    },
    pt: {
        oauthProvider: 'Provedor OAuth',
        oauthProviderDesc: 'Escolher provedor para registro WebView',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: 'Perguntar sempre',
        oauthProviderAskDesc: 'Mostrar diálogo de seleção',
        selectOAuthProvider: 'Selecionar provedor OAuth',
        selectOAuthProviderDesc: 'Como entrar no Kiro',
    },
    ja: {
        oauthProvider: 'OAuthプロバイダー',
        oauthProviderDesc: 'WebView登録用のプロバイダーを選択',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: '毎回確認',
        oauthProviderAskDesc: 'プロバイダー選択ダイアログを表示',
        selectOAuthProvider: 'OAuthプロバイダーを選択',
        selectOAuthProviderDesc: 'Kiroへのログイン方法',
    },
    de: {
        oauthProvider: 'OAuth-Anbieter',
        oauthProviderDesc: 'Anbieter für WebView-Registrierung wählen',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: 'Jedes Mal fragen',
        oauthProviderAskDesc: 'Anbieter-Auswahldialog anzeigen',
        selectOAuthProvider: 'OAuth-Anbieter auswählen',
        selectOAuthProviderDesc: 'Wie bei Kiro anmelden',
    },
    fr: {
        oauthProvider: 'Fournisseur OAuth',
        oauthProviderDesc: 'Choisir le fournisseur pour WebView',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: 'Demander à chaque fois',
        oauthProviderAskDesc: 'Afficher le dialogue de sélection',
        selectOAuthProvider: 'Sélectionner le fournisseur OAuth',
        selectOAuthProviderDesc: 'Comment se connecter à Kiro',
    },
    ko: {
        oauthProvider: 'OAuth 제공자',
        oauthProviderDesc: 'WebView 등록용 제공자 선택',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: '매번 묻기',
        oauthProviderAskDesc: '제공자 선택 대화상자 표시',
        selectOAuthProvider: 'OAuth 제공자 선택',
        selectOAuthProviderDesc: 'Kiro 로그인 방법',
    },
    hi: {
        oauthProvider: 'OAuth प्रदाता',
        oauthProviderDesc: 'WebView पंजीकरण के लिए प्रदाता चुनें',
        oauthProviderGoogle: 'Google',
        oauthProviderGithub: 'GitHub',
        oauthProviderAsk: 'हर बार पूछें',
        oauthProviderAskDesc: 'प्रदाता चयन संवाद दिखाएं',
        selectOAuthProvider: 'OAuth प्रदाता चुनें',
        selectOAuthProviderDesc: 'Kiro में कैसे लॉगिन करें',
    },
};

for (const locale of locales) {
    const filePath = path.join(localesDir, `${locale}.ts`);
    let content = fs.readFileSync(filePath, 'utf8');

    const trans = translations[locale];
    const insertText = `
  // OAuth Provider Selection
  oauthProvider: '${trans.oauthProvider}',
  oauthProviderDesc: '${trans.oauthProviderDesc}',
  oauthProviderGoogle: '${trans.oauthProviderGoogle}',
  oauthProviderGithub: '${trans.oauthProviderGithub}',
  oauthProviderAsk: '${trans.oauthProviderAsk}',
  oauthProviderAskDesc: '${trans.oauthProviderAskDesc}',
  selectOAuthProvider: '${trans.selectOAuthProvider}',
  selectOAuthProviderDesc: '${trans.selectOAuthProviderDesc}',
`;

    // Insert after manual: line
    content = content.replace(
        /(manual:.*?,\n)/,
        `$1${insertText}`
    );

    fs.writeFileSync(filePath, content);
    console.log('Updated:', locale);
}
console.log('Done!');

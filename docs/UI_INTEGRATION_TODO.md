# UI Integration TODO

## ✅ Сделано

1. **Переводы добавлены** (en, ru)
   - `registrationStrategy` - название настройки
   - `strategyWebView` / `strategyAutomated` - названия стратегий
   - `deferQuotaCheck` - опция отложенной проверки
   - Ban risk индикаторы

## 📝 Нужно добавить

### 1. Settings UI (src/webview/components/Settings.ts)

Добавить секцию "Registration Strategy" после "Automation":

```typescript
// Registration Strategy Section
<div class="setting-section">
  <h3>${t.registrationStrategy}</h3>
  <p class="setting-desc">${t.registrationStrategyDesc}</p>
  
  <!-- Strategy Selector -->
  <div class="setting-item">
    <label>
      <input type="radio" name="regStrategy" value="webview" 
             ${strategy === 'webview' ? 'checked' : ''}
             onchange="handleMessage({type:'updateSetting',key:'autoreg.strategy',value:'webview'})">
      <div>
        <strong>${t.strategyWebView}</strong>
        <div class="setting-desc">${t.strategyWebViewDesc}</div>
        <div class="badge badge-success">${t.strategyWebViewBanRisk}</div>
        <div class="badge badge-warning">${t.manualInputRequired}</div>
      </div>
    </label>
  </div>
  
  <div class="setting-item">
    <label>
      <input type="radio" name="regStrategy" value="automated"
             ${strategy === 'automated' ? 'checked' : ''}
             onchange="handleMessage({type:'updateSetting',key:'autoreg.strategy',value:'automated'})">
      <div>
        <strong>${t.strategyAutomated}</strong>
        <div class="setting-desc">${t.strategyAutomatedDesc}</div>
        <div class="badge badge-danger">${t.strategyAutomatedBanRisk}</div>
      </div>
    </label>
  </div>
  
  <!-- Defer Quota Check (только для Automated) -->
  ${strategy === 'automated' ? `
    <div class="setting-item">
      <label>
        <input type="checkbox" ${deferQuota ? 'checked' : ''}
               onchange="handleMessage({type:'updateSetting',key:'autoreg.deferQuotaCheck',value:this.checked})">
        <div>
          <strong>${t.deferQuotaCheck}</strong>
          <div class="setting-desc">${t.deferQuotaCheckDesc}</div>
        </div>
      </label>
    </div>
  ` : ''}
</div>
```

### 2. VS Code Settings (package.json)

Добавить новые настройки:

```json
{
  "kiroAccountSwitcher.autoreg.strategy": {
    "type": "string",
    "enum": ["webview", "automated"],
    "default": "webview",
    "description": "Registration strategy (webview = low ban risk, automated = legacy)"
  },
  "kiroAccountSwitcher.autoreg.deferQuotaCheck": {
    "type": "boolean",
    "default": true,
    "description": "Do NOT check quota immediately after registration (reduces ban risk)"
  }
}
```

### 3. Команда autoreg (src/commands/autoreg.ts)

Обновить `runAutoReg()` для поддержки стратегий:

```typescript
export async function runAutoReg(context: vscode.ExtensionContext, provider: KiroAccountsProvider, count?: number) {
  const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
  
  // Получаем стратегию
  const strategy = config.get<string>('autoreg.strategy', 'webview');
  const deferQuotaCheck = config.get<boolean>('autoreg.deferQuotaCheck', true);
  
  // Для WebView стратегии
  if (strategy === 'webview') {
    // Показываем предупреждение о ручном вводе
    const proceed = await vscode.window.showInformationMessage(
      'WebView strategy requires manual input. Browser will open for each account.',
      'Continue', 'Cancel'
    );
    
    if (proceed !== 'Continue') {
      return;
    }
    
    // Запускаем WebView регистрацию
    const scriptArgs = ['-m', 'autoreg.cli_registration', 'register-webview'];
    // ... остальная логика
  } else {
    // Automated стратегия (старый код)
    const scriptArgs = ['-m', 'registration.register_auto'];
    
    if (deferQuotaCheck) {
      scriptArgs.push('--no-check-quota');
    }
    
    // ... остальная логика
  }
}
```

### 4. Стили (src/webview/styles/settings.ts)

Добавить стили для badge:

```typescript
export const settingsStyles = `
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
    margin-right: 6px;
    margin-top: 4px;
  }
  
  .badge-success {
    background: rgba(76, 175, 80, 0.2);
    color: #4CAF50;
  }
  
  .badge-warning {
    background: rgba(255, 152, 0, 0.2);
    color: #FF9800;
  }
  
  .badge-danger {
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
  }
`;
```

### 5. Остальные языки (опционально)

Добавить переводы в:
- `src/webview/i18n/locales/zh.ts` (китайский)
- `src/webview/i18n/locales/es.ts` (испанский)
- `src/webview/i18n/locales/pt.ts` (португальский)
- `src/webview/i18n/locales/ja.ts` (японский)
- `src/webview/i18n/locales/de.ts` (немецкий)
- `src/webview/i18n/locales/fr.ts` (французский)
- `src/webview/i18n/locales/ko.ts` (корейский)
- `src/webview/i18n/locales/hi.ts` (хинди)

Можно скопировать английские строки как fallback.

---

## 🎯 Приоритет

1. **Высокий**: Settings UI + package.json настройки
2. **Высокий**: Обновить команду autoreg
3. **Средний**: Стили для badge
4. **Низкий**: Переводы для остальных языков

---

## 📝 Примечания

- WebView стратегия требует ручного ввода - нужно предупредить пользователя
- Для Automated стратегии показывать опцию `deferQuotaCheck`
- По умолчанию использовать WebView (низкий ban risk)
- Старый код полностью совместим - просто добавляем новые опции

# Метрики и проверки браузера

Данный документ описывает все метрики и проверки, которые выполняет минифицированный JS-модуль `app-min.js` для аудита браузера и действий пользователя.

**Легенда статуса:**

- ✅ — реализовано в коде
- ❌ — не реализовано
- ⚠️ — частично реализовано

## Технические проверки и метрики

| Категория проверки                   | Что собирает (суть)                               | Как найти в коде (ключевые слова/функции)                                               | Статус |
| ------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| Информация о браузере                | Версия браузера, движок рендеринга, поддержка API | `navigator.userAgent`, `navigator.vendor`, `navigator.platform`, `navigator.product`    | ✅     |
| Поддержка JavaScript                 | Проверка поддержки современных возможностей JS    | `try-catch` блоки, проверки на `typeof`, `eval`, `Function`                             | ✅     |
| Поддержка DOM API                    | Наличие и работоспособность DOM-интерфейсов       | `document.querySelector`, `document.getElementById`, `Element.prototype`, `HTMLElement` | ✅     |
| Поддержка Canvas/WebGL               | Графические возможности браузера                  | `CanvasRenderingContext2D`, `WebGLRenderingContext`, `OffscreenCanvas`                  | ✅     |
| Поддержка Web Storage                | localStorage, sessionStorage                      | `localStorage`, `sessionStorage`, `Storage`                                             | ✅     |
| Поддержка Web Workers                | Фоновые вычисления                                | `Worker`, `SharedWorker`, `navigator.serviceWorker`                                     | ✅     |
| Поддержка Crypto API                 | Криптографические функции                         | `crypto`, `Crypto`, `SubtleCrypto`, `getRandomValues`                                   | ✅     |
| Поддержка Fetch API                  | Современные методы сетевых запросов               | `fetch`, `XMLHttpRequest`, `AbortController`                                            | ✅     |
| Поддержка WebSockets                 | Двусторонняя связь по сети                        | `WebSocket`, `onopen`, `onmessage`, `onerror`                                           | ✅     |
| Поддержка WebRTC                     | Видео/аудио коммуникации                          | `RTCPeerConnection`, `getUserMedia`, `MediaStream`                                      | ❌     |
| Поддержка Service Workers            | Офлайн режим и push-уведомления                   | `navigator.serviceWorker`, `ServiceWorker`, `Cache`                                     | ✅     |
| Поддержка Pointer Events             | Мультитач и события указателя                     | `PointerEvent`, `pointerdown`, `pointerup`, `pointermove`                               | ✅     |
| Поддержка Touch Events               | Сенсорные события                                 | `TouchEvent`, `touchstart`, `touchend`, `touchmove`                                     | ✅     |
| Поддержка Drag & Drop                | Перетаскивание элементов                          | `drag`, `drop`, `dragstart`, `dragend`                                                  | ✅     |
| Поддержка Clipboard API              | Работа с буфером обмена                           | `navigator.clipboard`, `ClipboardEvent`, `copy`, `paste`                                | ✅     |
| Поддержка Intersection Observer      | Определение видимости элементов                   | `IntersectionObserver`, `isIntersecting`                                                | ✅     |
| Поддержка Resize Observer            | Отслеживание изменения размеров                   | `ResizeObserver`, `contentRect`                                                         | ✅     |
| Поддержка Web Animations API         | Управление анимациями                             | `animate`, `Animation`, `Element.animate`                                               | ⚠️     |
| Поддержка Web Audio API              | Аудиообработка                                    | `AudioContext`, `AudioNode`, `AudioBuffer`                                              | ❌     |
| Поддержка Web Components             | Пользовательские элементы                         | `customElements`, `HTMLElement`, `shadowRoot`                                           | ⚠️     |
| Поддержка Shadow DOM                 | Инкапсуляция DOM-элементов                        | `attachShadow`, `shadowRoot`, `ShadowRoot`                                              | ⚠️     |
| Поддержка CSS Grid/Flexbox           | Современные методы верстки                        | `CSS.supports`, `display: grid`, `display: flex`                                        | ⚠️     |
| Поддержка CSS Variables              | Кастомные CSS-переменные                          | `CSS.supports`, `--variable-name`                                                       | ⚠️     |
| Поддержка CSS Media Queries          | Адаптивная верстка                                | `@media`, `matchMedia`, `window.innerWidth`                                             | ✅     |
| Поддержка CSS Animations/Transitions | CSS-анимации                                      | `@keyframes`, `transition`, `animation`                                                 | ⚠️     |
| Поддержка CSS Filters                | Графические эффекты                               | `filter`, `backdrop-filter`, `blur`, `brightness`                                       | ⚠️     |
| Поддержка CSS Shapes                 | Нестандартные формы                               | `shape-outside`, `shape-margin`, `shape-image-threshold`                                | ❌     |
| Поддержка CSS Masks                  | Маскирование элементов                            | `mask`, `mask-image`, `mask-position`                                                   | ❌     |
| Поддержка CSS Blend Modes            | Режимы наложения                                  | `mix-blend-mode`, `background-blend-mode`                                               | ❌     |
| Поддержка CSS Containment            | Оптимизация производительности                    | `contain`, `content-visibility`, `contain-intrinsic-size`                               | ❌     |
| Поддержка CSS Overscroll Behavior    | Поведение при прокрутке                           | `overscroll-behavior`, `overscroll-behavior-y`, `overscroll-behavior-x`                 | ❌     |
| Поддержка CSS Scroll Snap            | Привязка к позициям при прокрутке                 | `scroll-snap-type`, `scroll-snap-align`, `scroll-margin`                                | ❌     |
| Поддержка CSS Scroll Timeline        | Анимации на основе прокрутки                      | `scroll-timeline`, `animation-timeline`                                                 | ❌     |
| Поддержка Viewport Units             | Адаптивные единицы измерения                      | `vw`, `vh`, `vmin`, `vmax`, `window.innerHeight`                                        | ✅     |
| Поддержка Viewport Meta Tag          | Адаптивный дизайн                                 | `meta[name="viewport"]`, `document.querySelector`                                       | ⚠️     |
| Поддержка Picture-in-Picture         | Видео в плавающем окне                            | `pictureInPictureEnabled`, `requestPictureInPicture`                                    | ❌     |
| Поддержка Web Share API              | Системное деление контентом                       | `navigator.share`, `canShare`                                                           | ❌     |
| Поддержка Payment Request API        | Платежи через браузер                             | `PaymentRequest`, `PaymentMethodChangeEvent`                                            | ❌     |
| Поддержка Credential Management API  | Управление учетными данными                       | `navigator.credentials`, `PasswordCredential`, `FederatedCredential`                    | ❌     |
| Поддержка Web Authentication API     | Безопасная аутентификация                         | `navigator.credentials.create`, `navigator.credentials.get`, `PublicKeyCredential`      | ❌     |
| Поддержка Permissions API            | Запрос разрешений                                 | `navigator.permissions.query`, `PermissionStatus`                                       | ❌     |
| Поддержка Network Information API    | Информация о сети                                 | `navigator.connection`, `navigator.onLine`, `Connection`                                | ❌     |
| Поддержка Battery Status API         | Состояние аккумулятора                            | `navigator.getBattery`, `BatteryManager`                                                | ❌     |
| Поддержка Vibration API              | Вибрация устройства                               | `navigator.vibrate`                                                                     | ❌     |
| Поддержка Ambient Light Sensor       | Датчик освещенности                               | `AmbientLightSensor`, `reading`, `illumination`                                         | ❌     |
| Поддержка Accelerometer              | Датчик ускорения                                  | `Accelerometer`, `linearAcceleration`, `x`, `y`, `z`                                    | ❌     |
| Поддержка Gyroscope                  | Датчик вращения                                   | `Gyroscope`, `angularVelocity`, `x`, `y`, `z`                                           | ❌     |
| Поддержка Magnetometer               | Магнитометр                                       | `Magnetometer`, `magneticField`, `x`, `y`, `z`                                          | ❌     |
| Поддержка Device Orientation         | Ориентация устройства                             | `deviceorientation`, `DeviceOrientationEvent`                                           | ❌     |
| Поддержка Device Motion              | Движение устройства                               | `devicemotion`, `DeviceMotionEvent`                                                     | ❌     |
| Поддержка Geolocation                | Геолокация                                        | `navigator.geolocation.getCurrentPosition`, `Position`                                  | ❌     |
| Поддержка Media Devices              | Камеры и микрофоны                                | `navigator.mediaDevices.getUserMedia`, `MediaStream`                                    | ❌     |
| Поддержка Screen Orientation         | Ориентация экрана                                 | `screen.orientation`, `ScreenOrientation`                                               | ❌     |
| Поддержка Fullscreen API             | Полноэкранный режим                               | `requestFullscreen`, `exitFullscreen`, `fullscreenElement`                              | ❌     |
| Поддержка Pointer Lock API           | Блокировка указателя                              | `requestPointerLock`, `exitPointerLock`, `pointerLockElement`                           | ❌     |
| Поддержка Wake Lock API              | Блокировка спящего режима                         | `navigator.wakeLock`, `WakeLockSentinel`                                                | ❌     |
| Поддержка Web MIDI API               | Музыкальные инструменты                           | `navigator.requestMIDIAccess`, `MIDIInput`, `MIDIOutput`                                | ❌     |
| Поддержка Gamepad API                | Игровые контроллеры                               | `navigator.getGamepads`, `Gamepad`, `gamepadconnected`                                  | ❌     |
| Поддержка WebVR/WebXR                | Виртуальная/дополненная реальность                | `navigator.xr`, `XRSession`, `requestSession`                                           | ❌     |
| Поддержка File API                   | Работа с файлами                                  | `File`, `FileReader`, `FileList`, `DataTransfer`                                        | ✅     |
| Поддержка File System Access API     | Доступ к файловой системе                         | `showOpenFilePicker`, `showSaveFilePicker`, `FileSystemFileHandle`                      | ❌     |
| Поддержка Streams API                | Работа с потоками данных                          | `ReadableStream`, `WritableStream`, `TransformStream`                                   | ❌     |
| Поддержка Encoding API               | Кодировки текста                                  | `TextEncoder`, `TextDecoder`, `encode`, `decode`                                        | ✅     |
| Поддержка Compression API            | Сжатие данных                                     | `CompressionStream`, `DecompressionStream`                                              | ❌     |
| Поддержка WebAssembly                | Высокопроизводительные модули                     | `WebAssembly`, `instantiate`, `compile`                                                 | ❌     |
| Поддержка SIMD                       | Векторные операции                                | `SIMD`, `Float32x4`, `Int32x4`                                                          | ❌     |
| Поддержка Intl API                   | Интернационализация                               | `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.Collator`                             | ✅     |
| Поддержка Performance API            | Измерение производительности                      | `performance.now`, `performance.timing`, `PerformanceEntry`                             | ✅     |
| Поддержка Navigation Timing API      | Время загрузки страницы                           | `performance.timing`, `navigationStart`, `loadEventEnd`                                 | ✅     |
| Поддержка Resource Timing API        | Время загрузки ресурсов                           | `PerformanceResourceTiming`, `connectStart`, `responseEnd`                              | ⚠️     |
| Поддержка User Timing API            | Профилирование пользовательского кода             | `performance.mark`, `performance.measure`, `measure`                                    | ⚠️     |
| Поддержка Event Timing API           | Время обработки событий                           | `PerformanceEventTiming`, `processingStart`, `processingEnd`                            | ❌     |
| Поддержка Long Tasks API             | Долгие задачи                                     | `PerformanceLongTaskTiming`, `duration`, `attribution`                                  | ❌     |
| Поддержка Page Visibility API        | Видимость вкладки                                 | `document.hidden`, `visibilitychange`, `document.visibilityState`                       | ✅     |
| Поддержка Focus Management           | Управление фокусом                                | `document.activeElement`, `focus`, `blur`, `focusin`, `focusout`                        | ✅     |
| Поддержка Keyboard Events            | События клавиатуры                                | `keydown`, `keyup`, `keypress`, `KeyboardEvent`                                         | ✅     |
| Поддержка Mouse Events               | События мыши                                      | `mousedown`, `mouseup`, `mousemove`, `click`, `MouseEvents`                             | ✅     |
| Поддержка Wheel Events               | События прокрутки                                 | `wheel`, `mousewheel`, `DOMMouseScroll`, `WheelEvent`                                   | ✅     |
| Поддержка Touch Events               | Сенсорные события                                 | `touchstart`, `touchend`, `touchmove`, `TouchEvent`                                     | ✅     |
| Поддержка Pointer Events             | События указателя                                 | `pointerdown`, `pointerup`, `pointermove`, `PointerEvent`                               | ✅     |
| Поддержка Drag Events                | События перетаскивания                            | `dragstart`, `dragend`, `dragover`, `drop`, `DragEvent`                                 | ✅     |
| Поддержка Animation Events           | События CSS-анимаций                              | `animationstart`, `animationend`, `animationiteration`                                  | ⚠️     |
| Поддержка Transition Events          | События CSS-переходов                             | `transitionstart`, `transitionend`, `transitionrun`                                     | ⚠️     |
| Поддержка Input Events               | События ввода                                     | `input`, `change`, `beforeinput`, `InputEvent`                                          | ✅     |
| Поддержка Form Events                | События форм                                      | `submit`, `reset`, `FormEvent`                                                          | ✅     |
| Поддержка Media Events               | События медиа                                     | `play`, `pause`, `ended`, `volumechange`, `MediaEvent`                                  | ⚠️     |
| Поддержка Network Events             | События сети                                      | `online`, `offline`, `load`, `error`, `NetworkEvent`                                    | ⚠️     |
| Поддержка Storage Events             | События хранилища                                 | `storage`, `StorageEvent`                                                               | ⚠️     |
| Поддержка Custom Events              | Пользовательские события                          | `CustomEvent`, `dispatchEvent`, `addEventListener`                                      | ✅     |
| Поддержка Mutation Events            | Изменения DOM                                     | `DOMSubtreeModified`, `DOMNodeInserted`, `MutationEvent`                                | ❌     |
| Поддержка MutationObserver           | Наблюдение за изменениями DOM                     | `MutationObserver`, `observe`, `mutations`                                              | ✅     |
| Поддержка ResizeObserver             | Наблюдение за изменением размеров                 | `ResizeObserver`, `observe`, `entries`                                                  | ✅     |
| Поддержка IntersectionObserver       | Наблюдение за пересечением                        | `IntersectionObserver`, `observe`, `entries`                                            | ✅     |
| Поддержка Performance Observer       | Наблюдение за производительностью                 | `PerformanceObserver`, `observe`, `entries`                                             | ⚠️     |
| Поддержка ReportingObserver          | Наблюдение за отчетами об ошибках                 | `ReportingObserver`, `observe`, `reports`                                               | ❌     |
| Поддержка Document Events            | События документа                                 | `DOMContentLoaded`, `load`, `beforeunload`, `unload`                                    | ✅     |
| Поддержка Window Events              | События окна                                      | `resize`, `scroll`, `hashchange`, `popstate`                                            | ✅     |
| Поддержка History API                | Управление историей                               | `history.pushState`, `history.replaceState`, `popstate`                                 | ✅     |
| Поддержка Location API               | Управление адресом                                | `window.location`, `history`, `pathname`, `hash`                                        | ✅     |
| Поддержка URL API                    | Работа с URL                                      | `URL`, `URLSearchParams`, `href`, `origin`                                              | ✅     |
| Поддержка Blob API                   | Работа с бинарными объектами                      | `Blob`, `ArrayBuffer`, `Uint8Array`, `slice`                                            | ✅     |
| Поддержка ArrayBuffer API            | Работа с бинарными данными                        | `ArrayBuffer`, `DataView`, `TypedArray`, `byteLength`                                   | ✅     |
| Поддержка SharedArrayBuffer          | Разделяемый буфер                                 | `SharedArrayBuffer`, `Atomics`, `wait`, `notify`                                        | ❌     |
| Поддержка Atomics                    | Атомарные операции                                | `Atomics`, `load`, `store`, `add`, `sub`                                                | ❌     |
| Поддержка Promise                    | Асинхронные операции                              | `Promise`, `then`, `catch`, `finally`                                                   | ✅     |
| Поддержка Async/Await                | Асинхронные функции                               | `async`, `await`, `Promise`                                                             | ✅     |
| Поддержка Generators                 | Генераторы                                        | `function*`, `yield`, `Generator`                                                       | ✅     |
| Поддержка Iterators                  | Итераторы                                         | `Symbol.iterator`, `next`, `for...of`                                                   | ✅     |
| Поддержка Symbols                    | Символы                                           | `Symbol`, `Symbol.iterator`, `Symbol.toPrimitive`                                       | ✅     |
| Поддержка Proxy                      | Прокси-объекты                                    | `Proxy`, `handler`, `get`, `set`                                                        | ✅     |
| Поддержка Reflect                    | Рефлексия                                         | `Reflect`, `Reflect.get`, `Reflect.set`                                                 | ✅     |
| Поддержка WeakMap/WeakSet            | Слабые коллекции                                  | `WeakMap`, `WeakSet`, `get`, `add`                                                      | ✅     |
| Поддержка Map/Set                    | Коллекции                                         | `Map`, `Set`, `get`, `add`, `has`                                                       | ✅     |
| Поддержка Typed Arrays               | Типизированные массивы                            | `Int8Array`, `Float32Array`, `ArrayBuffer`, `buffer`                                    | ✅     |
| Поддержка DataView                   | Просмотр данных                                   | `DataView`, `getInt32`, `getFloat64`, `buffer`                                          | ✅     |
| Поддержка JSON                       | Работа с JSON                                     | `JSON.parse`, `JSON.stringify`                                                          | ✅     |
| Поддержка Base64                     | Кодирование/декодирование                         | `btoa`, `atob`                                                                          | ✅     |
| Поддержка TextEncoder/TextDecoder    | Кодирование текста                                | `TextEncoder.encode`, `TextDecoder.decode`                                              | ✅     |
| Поддержка Console API                | Отладка                                           | `console.log`, `console.error`, `console.time`                                          | ✅     |
| Поддержка Error Handling             | Обработка ошибок                                  | `try-catch`, `Error`, `error.stack`, `error.message`                                    | ✅     |
| Поддержка Stack Trace                | Трассировка стека                                 | `Error.stack`, `stack trace`, `source maps`                                             | ✅     |
| Поддержка Source Maps                | Отображение исходного кода                        | `//# sourceMappingURL=`, `sourceMappingURL`                                             | ❌     |
| Поддержка CSP                        | Политика безопасности контента                    | `Content-Security-Policy`, `report-uri`, `nonce`                                        | ❌     |
| Поддержка Referrer Policy            | Политика отправки referrer                        | `Referrer-Policy`, `no-referrer`, `origin`                                              | ❌     |
| Поддержка Feature Policy             | Политика использования фич                        | `Feature-Policy`, `permissions-policy`, `camera`, `microphone`                          | ❌     |
| Поддержка Cross-Origin Isolation     | Изоляция по происхождению                         | `Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`                            | ❌     |
| Поддержка Subresource Integrity      | Целостность подресурсов                           | `integrity`, `sha256`, `sha384`, `sha512`                                               | ❌     |
| Поддержка Trusted Types              | Защита от XSS                                     | `trustedTypes`, `createPolicy`, `TrustedHTML`                                           | ❌     |
| Поддержка Sec-Fetch-\* Headers       | Безопасные заголовки                              | `Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site`                                    | ❌     |
| Поддержка Permissions Policy         | Политика разрешений                               | `Permissions-Policy`, `geolocation`, `camera`, `microphone`                             | ❌     |
| Поддержка CORB                       | Защита от загрузки ресурсов                       | `CORB`, `Cross-Origin-Resource-Policy`                                                  | ❌     |
| Поддержка COOP                       | Защита от атаки с всплывающими окнами             | `Cross-Origin-Opener-Policy`, `same-origin`                                             | ❌     |
| Поддержка COEP                       | Защита от утечки ресурсов                         | `Cross-Origin-Embedder-Policy`, `require-corp`                                          | ❌     |
| Поддержка SameSite Cookies           | Защита от CSRF                                    | `SameSite`, `Strict`, `Lax`, `None`                                                     | ⚠️     |
| Поддержка Secure Cookies             | Защита передачи cookies                           | `Secure`, `HttpOnly`, `cookie`                                                          | ⚠️     |
| Поддержка HSTS                       | Защита от downgrade-атак                          | `Strict-Transport-Security`, `max-age`                                                  | ❌     |
| Поддержка X-Frame-Options            | Защита от clickjacking                            | `X-Frame-Options`, `DENY`, `SAMEORIGIN`                                                 | ❌     |
| Поддержка X-Content-Type-Options     | Защита от MIME-сканирования                       | `X-Content-Type-Options`, `nosniff`                                                     | ❌     |
| Поддержка X-XSS-Protection           | Защита от XSS                                     | `X-XSS-Protection`, `1; mode=block`                                                     | ❌     |
| Поддержка Referrer-Policy            | Политика отправки referrer                        | `Referrer-Policy`, `no-referrer`, `origin-when-cross-origin`                            | ❌     |
| Поддержка Feature-Policy             | Политика использования фич                        | `Feature-Policy`, `accelerometer`, `camera`, `geolocation`                              | ❌     |

## Поведенческие проверки и метрики

| Категория проверки                                     | Что собирает (суть)                             | Как найти в коде (ключевые слова/функции)                        | Статус |
| ------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------- | ------ |
| Активность пользователя                                | Время до первого взаимодействия                 | `mousedown`, `keydown`, `touchstart`, `performance.now`          | ✅     |
| Длительность сессии                                    | Время активного использования сайта             | `beforeunload`, `unload`, `visibilitychange`, `setInterval`      | ✅     |
| Поведение при прокрутке                                | Скорость и направление прокрутки                | `scroll`, `wheel`, `scrollY`, `scrollX`, `requestAnimationFrame` | ✅     |
| Клик-трекинг                                           | Позиции кликов, частота, распределение          | `click`, `clientX`, `clientY`, `target`, `event`                 | ✅     |
| Движение мыши                                          | Траектория движения, области интереса           | `mousemove`, `clientX`, `clientY`, `requestAnimationFrame`       | ✅     |
| Ввод текста                                            | Скорость набора, корректировки, шаблоны         | `input`, `keydown`, `keypress`, `value`, `selectionStart`        | ✅     |
| Время загрузки                                         | Время до готовности DOM, ресурсов               | `DOMContentLoaded`, `load`, `performance.timing`                 | ✅     |
| Время отклика                                          | Время от события до реакции интерфейса          | `event.timeStamp`, `performance.now`, `requestAnimationFrame`    | ✅     |
| Ошибки ввода                                           | Частота и типы ошибок при заполнении форм       | `input`, `change`, `validation`, `ValidityState`                 | ⚠️     |
| Повторные попытки                                      | Повторные действия после ошибок                 | `retry`, `attempts`, `failure`, `success`                        | ⚠️     |
| Время между действиями                                 | Интервалы между пользовательскими событиями     | `setTimeout`, `setInterval`, `performance.now`                   | ✅     |
| Сессионные данные                                      | Временные данные сессии                         | `sessionStorage`, `localStorage`, `cookie`                       | ✅     |
| События фокуса                                         | Порядок и продолжительность фокуса на элементах | `focus`, `blur`, `focusin`, `focusout`, `activeElement`          | ✅     |
| Время ответа на события                                | Время выполнения обработчиков событий           | `performance.now`, `event.timeStamp`, `requestAnimationFrame`    | ✅     |
| Поведение при переполнении                             | Действия при переполнении буфера ввода          | `input`, `overflow`, `scrollHeight`, `clientHeight`              | ⚠️     |
| Поведение при масштабировании                          | Ответ на изменение масштаба                     | `resize`, `devicePixelRatio`, `window.matchMedia`                | ✅     |
| Поведение при изменении ориентации                     | Ответ на поворот устройства                     | `orientationchange`, `screen.orientation`, `window.innerWidth`   | ⚠️     |
| Использование горячих клавиш                           | Частота и типы комбинаций клавиш                | `keydown`, `ctrlKey`, `altKey`, `shiftKey`, `metaKey`            | ✅     |
| Поведение при автозаполнении                           | Использование и реакция на автозаполнение       | `input`, `autocomplete`, `change`, `focus`                       | ✅     |
| Время до отправки формы                                | Время от начала заполнения до отправки          | `focus`, `input`, `submit`, `performance.now`                    | ✅     |
| Частота переключения вкладок                           | Смена активной вкладки, потеря фокуса           | `visibilitychange`, `focus`, `blur`, `document.hidden`           | ✅     |
| Поведение при оффлайн-режиме                           | Действия при отсутствии сети                    | `navigator.onLine`, `offline`, `online`, `service worker`        | ❌     |
| Взаимодействие с модальными окнами                     | Открытие, закрытие, время нахождения            | `click`, `keydown`, `ESC`, `modal`, `dialog`, `aria-modal`       | ✅     |
| Поведение при прерывании                               | Прерывание текущих операций                     | `AbortController`, `abort`, `cancel`, `event`                    | ⚠️     |
| Поведение при драг-н-дроп                              | Перетаскивание элементов                        | `dragstart`, `dragend`, `drop`, `dragover`, `dataTransfer`       | ✅     |
| Поведение при маске ввода                              | Ввод данных с маской                            | `input`, `keydown`, `keypress`, `selectionStart`, `selectionEnd` | ⚠️     |
| Поведение при валидации                                | Время и результаты валидации                    | `input`, `change`, `blur`, `validity`, `validationMessage`       | ✅     |
| Поведение при аутентификации                           | Время и успешность входа                        | `submit`, `login`, `password`, `authentication`, `XHR`           | ✅     |
| Поведение при регистрации                              | Процесс и успешность регистрации                | `submit`, `signup`, `registration`, `form`, `validation`         | ✅     |
| Поведение при покупке                                  | Время и шаги процесса покупки                   | `click`, `submit`, `checkout`, `purchase`, `conversion`          | ✅     |
| Поведение при навигации                                | Переходы между страницами                       | `click`, `location`, `history`, `SPA`, `router`                  | ✅     |
| Поведение при поиске                                   | Поисковые запросы и результаты                  | `input`, `search`, `submit`, `query`, `results`                  | ✅     |
| Поведение при фильтрации                               | Использование фильтров                          | `input`, `click`, `change`, `filter`, `sort`                     | ✅     |
| Поведение при сортировке                               | Использование сортировки                        | `click`, `change`, `sort`, `order`, `direction`                  | ✅     |
| Поведение при добавлении в избранное                   | Добавление/удаление из избранного               | `click`, `favorite`, `like`, `bookmark`, `save`                  | ⚠️     |
| Поведение при обновлении страницы                      | Частота и причины обновления                    | `beforeunload`, `unload`, `load`, `refresh`, `reload`            | ✅     |
| Поведение при открытии ссылок                          | Открытие внешних/внутренних ссылок              | `click`, `target`, `_blank`, `href`, `navigation`                | ✅     |
| Поведение при работе с вкладками                       | Открытие/закрытие вкладок                       | `click`, `target`, `_blank`, `window.open`, `tab`                | ✅     |
| Поведение при работе с буфером обмена                  | Копирование/вставка                             | `copy`, `paste`, `cut`, `clipboard`, `event`                     | ✅     |
| Поведение при работе с куками                          | Принятие/отклонение кук                         | `cookie`, `consent`, `banner`, `accept`, `decline`               | ✅     |
| Поведение при работе с уведомлениями                   | Открытие/закрытие уведомлений                   | `notification`, `click`, `close`, `dismiss`, `show`              | ⚠️     |
| Поведение при работе с модальными диалогами            | Открытие/закрытие диалогов                      | `dialog`, `modal`, `click`, `keydown`, `ESC`                     | ✅     |
| Поведение при работе с выпадающими списками            | Открытие/выбор элементов                        | `click`, `change`, `select`, `option`, `dropdown`                | ✅     |
| Поведение при работе с чекбоксами                      | Выбор/снятие чекбоксов                          | `click`, `change`, `checkbox`, `checked`, `input`                | ✅     |
| Поведение при работе с радиокнопками                   | Выбор радиокнопок                               | `click`, `change`, `radio`, `checked`, `input`                   | ✅     |
| Поведение при работе с переключателями                 | Переключение состояний                          | `click`, `change`, `switch`, `toggle`, `input`                   | ✅     |
| Поведение при работе с ползунками                      | Изменение значений ползунков                    | `input`, `change`, `slider`, `range`, `value`                    | ✅     |
| Поведение при работе с кнопками                        | Нажатия на кнопки                               | `click`, `mousedown`, `mouseup`, `button`, `submit`              | ✅     |
| Поведение при работе с формами                         | Заполнение и отправка форм                      | `input`, `change`, `submit`, `focus`, `blur`, `form`             | ✅     |
| Поведение при работе с таблицами                       | Сортировка, фильтрация, выбор строк             | `click`, `change`, `sort`, `filter`, `table`, `row`              | ✅     |
| Поведение при работе с деревьями                       | Раскрытие/сворачивание узлов                    | `click`, `expand`, `collapse`, `tree`, `node`                    | ⚠️     |
| Поведение при работе с табами                          | Переключение между табами                       | `click`, `change`, `tab`, `tabpanel`, `selected`                 | ✅     |
| Поведение при работе с прогресс-баром                  | Отслеживание прогресса                          | `progress`, `change`, `value`, `max`, `min`                      | ⚠️     |
| Поведение при работе с лоадером                        | Отображение и скрытие loader'ов                 | `loading`, `show`, `hide`, `spinner`, `progress`                 | ⚠️     |
| Поведение при работе с тултипами                       | Показ/скрытие тултипов                          | `mouseenter`, `mouseleave`, `mouseover`, `tooltip`               | ✅     |
| Поведение при работе с поповерами                      | Открытие/закрытие поповеров                     | `click`, `focus`, `blur`, `popover`, `show`, `hide`              | ✅     |
| Поведение при работе с меню                            | Открытие/закрытие меню                          | `click`, `keydown`, `menu`, `submenu`, `open`, `close`           | ✅     |
| Поведение при работе с навигацией                      | Переходы по навигационным элементам             | `click`, `keydown`, `navigation`, `breadcrumb`, `link`           | ✅     |
| Поведение при работе с карточками                      | Взаимодействие с карточками                     | `click`, `hover`, `card`, `select`, `deselect`                   | ✅     |
| Поведение при работе с гридами                         | Просмотр и взаимодействие с гридами             | `click`, `scroll`, `grid`, `cell`, `row`, `column`               | ✅     |
| Поведение при работе с графиками                       | Взаимодействие с графиками                      | `click`, `hover`, `mousemove`, `chart`, `graph`, `plot`          | ⚠️     |
| Поведение при работе с картами                         | Взаимодействие с картами                        | `click`, `mousemove`, `drag`, `map`, `marker`, `zoom`            | ❌     |
| Поведение при работе с видео                           | Воспроизведение, пауза, перемотка               | `play`, `pause`, `seek`, `video`, `currentTime`, `duration`      | ⚠️     |
| Поведение при работе с аудио                           | Воспроизведение, пауза, перемотка               | `play`, `pause`, `seek`, `audio`, `currentTime`, `duration`      | ⚠️     |
| Поведение при работе с изображениями                   | Просмотр, увеличение, слайдшоу                  | `click`, `load`, `error`, `image`, `gallery`, `lightbox`         | ⚠️     |
| Поведение при работе с текстом                         | Выделение, копирование, поиск                   | `select`, `copy`, `find`, `text`, `selection`, `highlight`       | ✅     |
| Поведение при работе с файлами                         | Загрузка, скачивание, просмотр                  | `input[type=file]`, `click`, `download`, `upload`, `file`        | ✅     |
| Поведение при работе с печатью                         | Инициация печати                                | `beforeprint`, `afterprint`, `print`, `window.print`             | ⚠️     |
| Поведение при работе с обновлением                     | Обновление страницы/данных                      | `click`, `refresh`, `reload`, `update`, `sync`                   | ✅     |
| Поведение при работе с кешированием                    | Использование кеша                              | `cache`, `localStorage`, `sessionStorage`, `IndexedDB`           | ✅     |
| Поведение при работе с офлайн-режимом                  | Работа без интернета                            | `navigator.onLine`, `offline`, `online`, `service worker`        | ❌     |
| Поведение при работе с уведомлениями об ошибках        | Отображение и закрытие ошибок                   | `error`, `show`, `dismiss`, `notification`, `toast`              | ✅     |
| Поведение при работе с уведомлениями о успехе          | Отображение и закрытие сообщений об успехе      | `success`, `show`, `dismiss`, `notification`, `toast`            | ✅     |
| Поведение при работе с предупреждениями                | Отображение и закрытие предупреждений           | `warning`, `show`, `dismiss`, `notification`, `toast`            | ✅     |
| Поведение при работе с информационными сообщениями     | Отображение и закрытие информационных сообщений | `info`, `show`, `dismiss`, `notification`, `toast`               | ✅     |
| Поведение при работе с прогрессивными веб-приложениями | Установка, обновление, offline                  | `beforeinstallprompt`, `appinstalled`, `service worker`          | ❌     |

## Специфические проверки на ботов

| Категория проверки                                          | Что собирает (суть)                                          | Как найти в коде (ключевые слова/функции)                                        | Статус |
| ----------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------ |
| Проверка на автоматизацию                                   | Наличие инструментов автоматизации (Selenium, Puppeteer)     | `webdriver`, `__driver_evaluate`, `__webdriver_evaluate`, `selenium`, `headless` | ✅     |
| Проверка на подозрительные события                          | Ненатуральные последовательности событий                     | `event.timeStamp`, `performance.now`, `timing`, `interval`                       | ✅     |
| Проверка на скорость действий                               | Слишком быстрые действия (подозрение на бота)                | `performance.now`, `Date.now`, `setTimeout`, `setInterval`                       | ✅     |
| Проверка на отсутствие мыши                                 | Только клавиатурные или программные события                  | `mousemove`, `mouseenter`, `touchstart`, `pointermove`                           | ✅     |
| Проверка на поведение при невидимости                       | Действия при невидимой вкладке                               | `visibilitychange`, `document.hidden`, `pagehide`                                | ✅     |
| Проверка на отсутствие человеческого фактора                | Нет задержек, нет ошибок ввода, идеальная последовательность | `typing speed`, `error rate`, `sequence`, `pattern`                              | ✅     |
| Проверка на подозрительные заголовки                        | Наличие заголовков, характерных для ботов                    | `navigator.webdriver`, `navigator.plugins`, `navigator.languages`                | ✅     |
| Проверка на подозрительные настройки браузера               | Нетипичные настройки для человека                            | `screen`, `window`, `navigator`, `userAgent`                                     | ✅     |
| Проверка на подозрительное использование API                | Неправдоподобное использование API                           | `crypto`, `performance`, `timing`, `API usage`                                   | ✅     |
| Проверка на отсутствие пользовательских данных              | Нет cookies, нет истории, нет профиля                        | `localStorage`, `sessionStorage`, `cookie`, `history`                            | ✅     |
| Проверка на аномальное поведение                            | Невозможные или непредсказуемые действия                     | `behavior`, `anomaly`, `pattern`, `sequence`                                     | ✅     |
| Проверка на частые повторы                                  | Повторяющиеся действия с высокой частотой                    | `frequency`, `repeat`, `interval`, `rate`                                        | ✅     |
| Проверка на отсутствие фокуса                               | Нет фокуса на элементах управления                           | `focus`, `blur`, `activeElement`, `document.hasFocus`                            | ✅     |
| Проверка на нулевое время отклика                           | Мгновенные реакции на события                                | `event timing`, `response time`, `delay`, `latency`                              | ✅     |
| Проверка на отсутствие прокрутки                            | Нет прокрутки страницы                                       | `scroll`, `scrollY`, `scrollX`, `scrollTop`, `scrollLeft`                        | ✅     |
| Проверка на отсутствие изменения размера                    | Нет изменения размера окна                                   | `resize`, `window.innerWidth`, `window.innerHeight`                              | ✅     |
| Проверка на отсутствие взаимодействия с UI                  | Нет кликов, нет ввода, нет наведений                         | `click`, `input`, `focus`, `hover`, `touch`                                      | ✅     |
| Проверка на подозрительную активность мыши                  | Неправдоподобные траектории движения                         | `mousemove`, `clientX`, `clientY`, `path`, `trajectory`                          | ✅     |
| Проверка на подозрительную активность клавиатуры            | Неправдоподобные комбинации клавиш                           | `keydown`, `keyup`, `keypress`, `combination`, `sequence`                        | ✅     |
| Проверка на подозрительную активность сенсора               | Неправдоподобные значения датчиков                           | `deviceorientation`, `devicemotion`, `accelerometer`, `gyroscope`                | ❌     |
| Проверка на подозрительную активность геолокации            | Неправдоподобные координаты                                  | `navigator.geolocation`, `getCurrentPosition`, `coordinates`                     | ❌     |
| Проверка на подозрительную активность камеры                | Неправдоподобные параметры камеры                            | `navigator.mediaDevices`, `getUserMedia`, `video`, `constraints`                 | ❌     |
| Проверка на подозрительную активность микрофона             | Неправдоподобные параметры микрофона                         | `navigator.mediaDevices`, `getUserMedia`, `audio`, `constraints`                 | ❌     |
| Проверка на подозрительную активность аккумулятора          | Неправдоподобные значения                                    | `navigator.getBattery`, `BatteryManager`, `level`, `charging`                    | ❌     |
| Проверка на подозрительную активность сети                  | Неправдоподобные параметры                                   | `navigator.connection`, `connection`, `effectiveType`, `downlink`                | ❌     |
| Проверка на подозрительную активность вибрации              | Неправдоподобные параметры                                   | `navigator.vibrate`, `vibrate`, `duration`, `pattern`                            | ❌     |
| Проверка на подозрительную активность датчиков освещенности | Неправдоподобные параметры                                   | `AmbientLightSensor`, `illumination`, `reading`                                  | ❌     |
| Проверка на подозрительную активность датчиков ускорения    | Неправдоподобные параметры                                   | `Accelerometer`, `linearAcceleration`, `x`, `y`, `z`                             | ❌     |
| Проверка на подозрительную активность датчиков вращения     | Неправдоподобные параметры                                   | `Gyroscope`, `angularVelocity`, `x`, `y`, `z`                                    | ❌     |
| Проверка на подозрительную активность магнитометра          | Неправдоподобные параметры                                   | `Magnetometer`, `magneticField`, `x`, `y`, `z`                                   | ❌     |
| Проверка на подозрительную активность игровых контроллеров  | Неправдоподобные параметры                                   | `navigator.getGamepads`, `Gamepad`, `buttons`, `axes`                            | ❌     |
| Проверка на подозрительную активность MIDI                  | Неправдоподобные параметры                                   | `navigator.requestMIDIAccess`, `MIDIInput`, `MIDIOutput`                         | ❌     |
| Проверка на подозрительную активность VR/AR                 | Неправдоподобные параметры                                   | `navigator.xr`, `XRSession`, `requestSession`, `device`                          | ❌     |
| Проверка на подозрительную активность файловой системы      | Неправдоподобные параметры                                   | `showOpenFilePicker`, `showSaveFilePicker`, `FileSystemFileHandle`               | ❌     |
| Проверка на подозрительную активность веб-сокетов           | Неправдоподобные параметры                                   | `WebSocket`, `onopen`, `onmessage`, `onerror`, `url`                             | ✅     |
| Проверка на подозрительную активность веб-rtc               | Неправдоподобные параметры                                   | `RTCPeerConnection`, `getUserMedia`, `MediaStream`, `tracks`                     | ❌     |
| Проверка на подозрительную активность веб-воркеров          | Неправдоподобные параметры                                   | `Worker`, `SharedWorker`, `onmessage`, `postMessage`                             | ✅     |
| Проверка на подозрительную активность сервис-воркеров       | Неправдоподобные параметры                                   | `navigator.serviceWorker`, `ServiceWorker`, `register`, `controller`             | ✅     |

## Сводка по реализации

| Статус            | Количество | Процент |
| ----------------- | ---------- | ------- |
| ✅ Реализовано    | ~130       | ~60%    |
| ⚠️ Частично       | ~25        | ~11%    |
| ❌ Не реализовано | ~65        | ~29%    |

### CDP Spoofer покрывает (autoreg/spoofers/cdp_spoofer.py):

| Проверка              | Метод спуфинга                                                    | Статус |
| --------------------- | ----------------------------------------------------------------- | ------ |
| User-Agent            | CDP `Emulation.setUserAgentOverride`                              | ✅     |
| Platform              | CDP + JS `navigator.platform`                                     | ✅     |
| Timezone              | CDP `Emulation.setTimezoneOverride` + JS `Date.getTimezoneOffset` | ✅     |
| Geolocation           | CDP `Emulation.setGeolocationOverride`                            | ✅     |
| Screen metrics        | CDP `Emulation.setDeviceMetricsOverride` + JS screen props        | ✅     |
| WebGL vendor/renderer | JS `getParameter` override (37445, 37446)                         | ✅     |
| Canvas fingerprint    | JS `toDataURL` + `getImageData` noise                             | ✅     |
| Automation detection  | JS удаление webdriver, selenium, puppeteer props                  | ✅     |
| Plugins               | JS `navigator.plugins` с PluginArray                              | ✅     |
| DoNotTrack            | JS `navigator.doNotTrack`, `msDoNotTrack`, `window.doNotTrack`    | ✅     |
| Chrome runtime        | JS `window.chrome.runtime`, `csi`, `loadTimes`                    | ✅     |
| Permissions API       | JS `navigator.permissions.query` override                         | ✅     |
| Battery API           | JS `navigator.getBattery` fake                                    | ✅     |
| Network Info          | JS `navigator.connection` fake                                    | ✅     |
| Intl API              | JS `Intl.DateTimeFormat.resolvedOptions`                          | ✅     |

### Критичные нереализованные проверки (низкий приоритет):

1. **WebRTC** — fingerprinting через ICE candidates (сложно спуфить)
2. **Web Audio API** — audio fingerprinting (редко используется AWS)
3. **Device Orientation/Motion** — детекция мобильных устройств (не критично для desktop)
4. **Датчики (Accelerometer, Gyroscope)** — только для мобильных

### Использование CDP Spoofer:

```python
from autoreg.spoof import apply_pre_navigation_spoofing

# ВАЖНО: Вызывать ДО навигации на страницу AWS!
spoofer = apply_pre_navigation_spoofing(browser.page)
browser.page.get('https://profile.aws.amazon.com/...')
# Спуфинг уже применён
```

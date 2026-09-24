// jPit MAIN World Unblocking Engine
(function () {
  if (window.__jPitEngineInitialized) return;
  window.__jPitEngineInitialized = true;

  // Active configuration state
  const config = {
    active: true,
    unblockPaste: true,
    unblockCopy: true,
    unblockContextMenu: false,
    unblockSelection: false,
    unblockDevTools: false,
    devToolsShield: false,
    hotkeyShield: true,
    frameworkSynthesizer: true
  };

  // Synchronous session cache check for document_start execution timing
  try {
    if (sessionStorage.getItem('__jpit_devtools_shield__') === '1') {
      config.unblockDevTools = true;
      config.devToolsShield = true;
    }
  } catch {}

  // --- DEVTOOLS SHIELD ACTIVITY LOGGER ---
  const devToolsActivityLog = [];
  let devToolsActivityCounter = 0;

  function logDevToolsShieldDetection(technique, detail) {
    const item = {
      id: ++devToolsActivityCounter,
      timestamp: Date.now(),
      technique, // 'devtools-shortcut' | 'debugger-loop' | 'window-dimension-heuristic' | 'console-getter-trap' | 'contextmenu-block'
      detail
    };
    devToolsActivityLog.push(item);
    if (devToolsActivityLog.length > 50) devToolsActivityLog.shift();

    // Log to DevTools debug console with distinct badge styling
    console.info(
      `%c[jPit DevTools Shield]%c ${detail}`,
      'background: #0D9488; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;',
      'color: #14B8A6; font-weight: 500;'
    );

    // Relay to isolated bridge for popup / stats transparency
    try {
      window.dispatchEvent(new CustomEvent('jPit_DevToolsDetection', { detail: item }));
    } catch {}
  }

  // Listen for config updates from isolated bridge script
  window.addEventListener('jPit_ConfigUpdate', (event) => {
    if (event.detail) {
      Object.assign(config, event.detail);
      if (typeof event.detail.unblockDevTools !== 'undefined') {
        config.devToolsShield = !!event.detail.unblockDevTools;
      }
      try {
        if (config.devToolsShield || config.unblockDevTools) {
          sessionStorage.setItem('__jpit_devtools_shield__', '1');
        } else {
          sessionStorage.removeItem('__jpit_devtools_shield__');
        }
      } catch {}
      applyCssSelectionState();
    }
  });

  // Preserve pristine native prototypes before site scripts modify them
  const rawAddEventListener = EventTarget.prototype.addEventListener;
  const rawAttachShadow = Element.prototype.attachShadow;
  const rawFunction = window.Function;
  const rawEval = window.eval;
  const rawSetInterval = window.setInterval;
  const rawSetTimeout = window.setTimeout;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  const rawOuterWidthDesc = Object.getOwnPropertyDescriptor(window, 'outerWidth') || Object.getOwnPropertyDescriptor(Window.prototype, 'outerWidth');
  const rawOuterHeightDesc = Object.getOwnPropertyDescriptor(window, 'outerHeight') || Object.getOwnPropertyDescriptor(Window.prototype, 'outerHeight');

  // Helper to recognize DevTools keyboard shortcuts
  function isDevToolsShortcut(e) {
    if (!e) return false;
    const key = (e.key || '').toLowerCase();
    const keyCode = e.keyCode || e.which || 0;

    // F12
    if (key === 'f12' || keyCode === 123) {
      return 'F12';
    }

    const isCtrlShift = (e.ctrlKey && e.shiftKey) && !e.altKey && !e.metaKey;
    const isCmdOpt = (e.metaKey && e.altKey) && !e.ctrlKey; // macOS

    // Ctrl+Shift+I / Cmd+Opt+I (DevTools Elements/Inspect)
    if ((isCtrlShift || isCmdOpt) && (key === 'i' || keyCode === 73)) {
      return isCmdOpt ? 'Cmd+Opt+I' : 'Ctrl+Shift+I';
    }

    // Ctrl+Shift+J / Cmd+Opt+J (Console)
    if ((isCtrlShift || isCmdOpt) && (key === 'j' || keyCode === 74)) {
      return isCmdOpt ? 'Cmd+Opt+J' : 'Ctrl+Shift+J';
    }

    // Ctrl+Shift+C / Cmd+Opt+C (Inspect Element)
    if ((isCtrlShift || isCmdOpt) && (key === 'c' || keyCode === 67)) {
      return isCmdOpt ? 'Cmd+Opt+C' : 'Ctrl+Shift+C';
    }

    // Ctrl+U / Cmd+Opt+U (View Source)
    if (((e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) || isCmdOpt) && (key === 'u' || keyCode === 85)) {
      return isCmdOpt ? 'Cmd+Opt+U' : 'Ctrl+U';
    }

    return false;
  }

  // --- MODULE 1: PROTOTYPE HOOKS & SHADOW DOM TRAVERSAL ---

  // Patch EventTarget.prototype.addEventListener to intercept site anti-paste and anti-devtools handlers at registration
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    let effectiveListener = listener;

    if (type === 'keydown' && typeof listener === 'function') {
      effectiveListener = function (event) {
        if (config.active && (config.devToolsShield || config.unblockDevTools)) {
          const devtoolKey = isDevToolsShortcut(event);
          if (devtoolKey) {
            logDevToolsShieldDetection('devtools-shortcut', `Neutralized site keydown listener interception for ${devtoolKey}`);
            return;
          }
        }
        return listener.apply(this, arguments);
      };
    } else if (type === 'contextmenu' && typeof listener === 'function') {
      effectiveListener = function (event) {
        if (config.active && (config.unblockContextMenu || config.devToolsShield || config.unblockDevTools)) {
          const originalPreventDefault = event.preventDefault;
          event.preventDefault = function () {
            logDevToolsShieldDetection('contextmenu-block', 'Suppressed site contextmenu preventDefault()');
          };
          const res = listener.apply(this, arguments);
          event.preventDefault = originalPreventDefault;
          return res;
        }
        return listener.apply(this, arguments);
      };
    }

    return rawAddEventListener.call(this, type, effectiveListener, options);
  };

  // Patch Element.prototype.attachShadow to auto-register unblock shields inside Web Components
  Element.prototype.attachShadow = function (init) {
    const shadowRoot = rawAttachShadow.apply(this, arguments);
    attachCapturingShield(shadowRoot);
    return shadowRoot;
  };

  // Neutralize inline properties like element.onpaste = () => false
  ['onpaste', 'oncopy', 'oncut', 'oncontextmenu', 'onselectstart'].forEach(prop => {
    try {
      Object.defineProperty(HTMLElement.prototype, prop, {
        get() {
          return this[`__jpit_${prop}`] || null;
        },
        set(handler) {
          this[`__jpit_${prop}`] = handler;
        },
        configurable: true,
        enumerable: true
      });
    } catch {
      // Ignore if non-configurable in specific browsers
    }
  });

  // Guard window.onkeydown to prevent inline return false on DevTools keys
  try {
    let inlineWinKeyDown = null;
    Object.defineProperty(window, 'onkeydown', {
      get() { return inlineWinKeyDown; },
      set(handler) {
        if (typeof handler === 'function') {
          inlineWinKeyDown = function (event) {
            if (config.active && (config.devToolsShield || config.unblockDevTools) && isDevToolsShortcut(event)) {
              logDevToolsShieldDetection('devtools-shortcut', 'Neutralized inline window.onkeydown blocking');
              return true;
            }
            return handler.apply(this, arguments);
          };
        } else {
          inlineWinKeyDown = handler;
        }
      },
      configurable: true,
      enumerable: true
    });
  } catch {}

  // --- MODULE 2: FRAMEWORK STATE SYNTHESIZER ---

  function updateControlledInputValue(element, text) {
    if (!element || (!nativeInputValueSetter && !nativeTextareaValueSetter)) return;

    const isTextArea = element.tagName === 'TEXTAREA';
    const setter = isTextArea ? nativeTextareaValueSetter : nativeInputValueSetter;
    
    if (typeof setter !== 'function') return;

    const start = element.selectionStart ?? element.value?.length ?? 0;
    const end = element.selectionEnd ?? element.value?.length ?? 0;
    const currentVal = element.value || '';
    const newVal = currentVal.substring(0, start) + text + currentVal.substring(end);

    try {
      // Execute native setter in scope of element
      setter.call(element, newVal);

      // Restore cursor position after pasted payload
      if (typeof element.setSelectionRange === 'function') {
        element.setSelectionRange(start + text.length, start + text.length);
      }

      // Dispatch bubbling synthetic input and change events for React/Vue/Angular
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    } catch (e) {
      console.debug('[jPit] Framework synthesizer fallback:', e);
    }
  }

  // --- MODULE 3: CAPTURING EVENT SHIELD ---

  function handlePasteEvent(e) {
    if (!config.active || !config.unblockPaste) return;

    e.stopImmediatePropagation();

    const target = e.target;
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData ? clipboardData.getData('text/plain') : '';

    // If target is an input or textarea, ensure value updates via framework synthesizer
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      if (pastedText && config.frameworkSynthesizer) {
        updateControlledInputValue(target, pastedText);
      }
    }
  }

  function handleBeforeInputEvent(e) {
    if (!config.active || !config.unblockPaste) return;

    if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') {
      e.stopImmediatePropagation();
    }
  }

  function handleCopyCutEvent(e) {
    if (!config.active || !config.unblockCopy) return;
    e.stopImmediatePropagation();
  }

  function handleContextMenuEvent(e) {
    if (!config.active) return;
    const shouldUnblock = config.unblockContextMenu || config.devToolsShield || config.unblockDevTools;
    if (!shouldUnblock) return;
    
    // Allow Shift + Right Click to force native context menu
    if (e.shiftKey) return;

    // Check for full-screen transparent anti-inspect overlay element
    if (e.target && e.target !== document.body && e.target !== document.documentElement) {
      try {
        const style = window.getComputedStyle(e.target);
        const isFixedOrAbs = style.position === 'fixed' || style.position === 'absolute';
        const isTransparent = style.opacity === '0' || style.backgroundColor === 'transparent' || style.backgroundColor === 'rgba(0, 0, 0, 0)';
        const isFullScreen = e.target.offsetWidth >= window.innerWidth * 0.9 && e.target.offsetHeight >= window.innerHeight * 0.9;
        if (isFixedOrAbs && isTransparent && isFullScreen && e.target.children.length === 0) {
          e.target.style.pointerEvents = 'none';
          logDevToolsShieldDetection('contextmenu-block', 'Deactivated transparent anti-inspect overlay');
        }
      } catch {}
    }

    e.stopImmediatePropagation();
    if (config.devToolsShield || config.unblockDevTools) {
      logDevToolsShieldDetection('contextmenu-block', 'Restored context menu / Inspect element access');
    }
  }

  function handleMouseDownEvent(e) {
    if (!config.active) return;
    if (e.button === 2 && (config.unblockContextMenu || config.devToolsShield || config.unblockDevTools)) {
      // Stop site mousedown interception designed to suppress context menu
      e.stopImmediatePropagation();
    }
  }

  function handleSelectStartEvent(e) {
    if (!config.active || !config.unblockSelection) return;
    e.stopImmediatePropagation();
  }

  function handleKeyDownEvent(e) {
    if (!config.active) return;

    // Priority 1: DevTools shortcut unblocking
    if (config.devToolsShield || config.unblockDevTools) {
      const devtoolKey = isDevToolsShortcut(e);
      if (devtoolKey) {
        // Stop propagation so page capturing/bubbling listeners cannot preventDefault on devtools keys
        e.stopImmediatePropagation();
        logDevToolsShieldDetection('devtools-shortcut', `Allowed blocked shortcut: ${devtoolKey}`);
        return;
      }
    }

    // Priority 2: System clipboard hotkey unblocking (Ctrl+V, Ctrl+C, Ctrl+X, Ctrl+A)
    if (!config.hotkeyShield) return;

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const key = e.key ? e.key.toLowerCase() : '';

    if (isCtrlOrCmd && ['v', 'c', 'x', 'a'].includes(key)) {
      if ((key === 'v' && config.unblockPaste) || 
          (['c', 'x', 'a'].includes(key) && config.unblockCopy)) {
        e.stopImmediatePropagation();
      }
    }
  }

  function attachCapturingShield(targetNode) {
    targetNode.addEventListener('paste', handlePasteEvent, true);
    targetNode.addEventListener('beforeinput', handleBeforeInputEvent, true);
    targetNode.addEventListener('copy', handleCopyCutEvent, true);
    targetNode.addEventListener('cut', handleCopyCutEvent, true);
    targetNode.addEventListener('contextmenu', handleContextMenuEvent, true);
    targetNode.addEventListener('mousedown', handleMouseDownEvent, true);
    targetNode.addEventListener('selectstart', handleSelectStartEvent, true);
    targetNode.addEventListener('keydown', handleKeyDownEvent, true);
  }

  // --- MODULE 4: CSS SELECTION LOCK ENGINE ---

  function applyCssSelectionState() {
    let styleEl = document.getElementById('jpit-selection-style');
    const shouldUnblock = config.active && (config.unblockSelection || config.devToolsShield || config.unblockDevTools);
    if (shouldUnblock) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'jpit-selection-style';
        styleEl.textContent = `
          *, input, textarea, [contenteditable="true"] {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: default !important;
          }
        `;
        (document.head || document.documentElement).appendChild(styleEl);
      }
    } else if (styleEl) {
      styleEl.remove();
    }
  }

  // --- MODULE 5: DEVTOOLS SHIELD ENGINE ---

  const DEBUGGER_PATTERN = /\bdebugger\s*;?/g;

  function hasDebugger(code) {
    return typeof code === 'string' && /\bdebugger\b/.test(code);
  }

  function sanitizeDebuggerCode(code) {
    if (typeof code !== 'string') return code;
    return code.replace(DEBUGGER_PATTERN, '/* [jPit neutralized debugger] */');
  }

  // 1. Debugger statement flooding neutralization via Function and eval
  function PatchedFunction(...args) {
    if (config.active && (config.devToolsShield || config.unblockDevTools)) {
      let containsDebugger = false;
      const sanitized = args.map(arg => {
        if (hasDebugger(arg)) {
          containsDebugger = true;
          return sanitizeDebuggerCode(arg);
        }
        return arg;
      });

      if (containsDebugger) {
        logDevToolsShieldDetection('debugger-loop', 'Neutralized dynamic debugger; in Function() constructor');
      }

      if (new.target) {
        return new rawFunction(...sanitized);
      }
      return rawFunction(...sanitized);
    }

    if (new.target) {
      return new rawFunction(...args);
    }
    return rawFunction(...args);
  }

  PatchedFunction.prototype = rawFunction.prototype;
  PatchedFunction.prototype.constructor = PatchedFunction;
  PatchedFunction.toString = function () {
    return 'function Function() { [native code] }';
  };
  try {
    Object.defineProperty(PatchedFunction, 'name', { value: 'Function', configurable: true });
    Object.defineProperty(PatchedFunction, 'length', { value: 1, configurable: true });
    window.Function = PatchedFunction;
    Function.prototype.constructor = PatchedFunction;
  } catch {}

  // Hook window.eval to sanitize debugger statements
  window.eval = function (code) {
    if (config.active && (config.devToolsShield || config.unblockDevTools) && hasDebugger(code)) {
      logDevToolsShieldDetection('debugger-loop', 'Neutralized dynamic debugger; statement in eval()');
      code = sanitizeDebuggerCode(code);
    }
    return rawEval.call(this, code);
  };
  window.eval.toString = function () {
    return 'function eval() { [native code] }';
  };

  // 2. Intercept periodic debugger-loop intervals and timeouts
  window.setInterval = function (handler, timeout, ...args) {
    if (config.active && (config.devToolsShield || config.unblockDevTools)) {
      if (typeof handler === 'string' && hasDebugger(handler)) {
        logDevToolsShieldDetection('debugger-loop', 'Neutralized debugger; string in setInterval()');
        handler = sanitizeDebuggerCode(handler);
      } else if (typeof handler === 'function') {
        const fnStr = Function.prototype.toString.call(handler);
        // Neutralize functions whose sole code is debugger;
        if (/^\s*(function\s*\w*\s*\([^)]*\)\s*\{|\([^)]*\)\s*=>\s*\{?)\s*debugger;?\s*\}?\s*$/.test(fnStr)) {
          logDevToolsShieldDetection('debugger-loop', 'Neutralized static debugger-loop in setInterval()');
          return rawSetInterval.call(this, () => {}, timeout, ...args);
        }
      }
    }
    return rawSetInterval.call(this, handler, timeout, ...args);
  };
  window.setInterval.toString = function () {
    return 'function setInterval() { [native code] }';
  };

  window.setTimeout = function (handler, timeout, ...args) {
    if (config.active && (config.devToolsShield || config.unblockDevTools)) {
      if (typeof handler === 'string' && hasDebugger(handler)) {
        logDevToolsShieldDetection('debugger-loop', 'Neutralized debugger; string in setTimeout()');
        handler = sanitizeDebuggerCode(handler);
      } else if (typeof handler === 'function') {
        const fnStr = Function.prototype.toString.call(handler);
        if (/^\s*(function\s*\w*\s*\([^)]*\)\s*\{|\([^)]*\)\s*=>\s*\{?)\s*debugger;?\s*\}?\s*$/.test(fnStr)) {
          logDevToolsShieldDetection('debugger-loop', 'Neutralized static debugger-loop in setTimeout()');
          return rawSetTimeout.call(this, () => {}, timeout, ...args);
        }
      }
    }
    return rawSetTimeout.call(this, handler, timeout, ...args);
  };
  window.setTimeout.toString = function () {
    return 'function setTimeout() { [native code] }';
  };

  // 3. Spoof window.outerWidth & window.outerHeight DevTools detection heuristics
  const getOuterWidth = function () {
    const rawVal = rawOuterWidthDesc?.get ? rawOuterWidthDesc.get.call(this) : (this.innerWidth);
    if (config.active && (config.devToolsShield || config.unblockDevTools)) {
      const diff = rawVal - this.innerWidth;
      // Normal difference without devtools is scrollbar/border (0-20px)
      // When devtools is open docked to the side, diff exceeds 160px
      if (diff > 160) {
        logDevToolsShieldDetection('window-dimension-heuristic', `Spoofed outerWidth (hidden ${diff}px DevTools dock)`);
        return this.innerWidth + 16;
      }
    }
    return rawVal;
  };

  const getOuterHeight = function () {
    const rawVal = rawOuterHeightDesc?.get ? rawOuterHeightDesc.get.call(this) : (this.innerHeight);
    if (config.active && (config.devToolsShield || config.unblockDevTools)) {
      const diff = rawVal - this.innerHeight;
      // Normal difference without devtools is browser chrome / titlebar (70-120px)
      // When devtools is open docked to the bottom, diff exceeds 160px
      if (diff > 160) {
        logDevToolsShieldDetection('window-dimension-heuristic', `Spoofed outerHeight (hidden ${diff}px DevTools dock)`);
        return this.innerHeight + 80;
      }
    }
    return rawVal;
  };

  try {
    Object.defineProperty(window, 'outerWidth', {
      get: getOuterWidth,
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(window, 'outerHeight', {
      get: getOuterHeight,
      configurable: true,
      enumerable: true
    });
  } catch {}

  // 4. Neutralize console.log/console.table getter-based traps and console.clear flooding
  function sanitizeConsoleArg(arg) {
    if (!arg || typeof arg !== 'object') return arg;

    // Check RegExp toString trap
    if (arg instanceof RegExp) {
      if (Object.prototype.hasOwnProperty.call(arg, 'toString') || arg.toString !== RegExp.prototype.toString) {
        logDevToolsShieldDetection('console-getter-trap', 'Neutralized RegExp toString console trap');
        return new RegExp(arg.source, arg.flags);
      }
    }

    // Check Object or DOM element custom getter traps
    try {
      const descriptors = Object.getOwnPropertyDescriptors(arg);
      let hasGetter = false;
      for (const key of Object.keys(descriptors)) {
        if (typeof descriptors[key].get === 'function') {
          hasGetter = true;
          break;
        }
      }
      if (hasGetter) {
        logDevToolsShieldDetection('console-getter-trap', 'Neutralized getter trap on console argument');
        const safeClone = {};
        for (const [k, desc] of Object.entries(descriptors)) {
          safeClone[k] = (typeof desc.get === 'function') ? '[Protected Getter]' : desc.value;
        }
        return safeClone;
      }
    } catch {}

    return arg;
  }

  ['log', 'info', 'warn', 'debug', 'table', 'dir'].forEach(method => {
    const rawMethod = console[method];
    if (typeof rawMethod === 'function') {
      console[method] = function (...args) {
        if (config.active && (config.devToolsShield || config.unblockDevTools)) {
          const sanitized = args.map(sanitizeConsoleArg);
          return rawMethod.apply(this, sanitized);
        }
        return rawMethod.apply(this, args);
      };
      try {
        console[method].toString = function () {
          return `function ${method}() { [native code] }`;
        };
      } catch {}
    }
  });

  let lastConsoleClearTime = 0;
  const rawConsoleClear = console.clear;
  console.clear = function () {
    if (config.active && (config.devToolsShield || config.unblockDevTools)) {
      const now = Date.now();
      if (now - lastConsoleClearTime < 2000) {
        logDevToolsShieldDetection('console-getter-trap', 'Blocked repetitive console.clear() flooding');
        return;
      }
      lastConsoleClearTime = now;
    }
    return rawConsoleClear ? rawConsoleClear.apply(this, arguments) : undefined;
  };
  try {
    console.clear.toString = function () {
      return 'function clear() { [native code] }';
    };
  } catch {}

  // Initialize main document capturing shield
  attachCapturingShield(document);
  attachCapturingShield(window);
  applyCssSelectionState();

  console.log('[jPit v1.0] MAIN World Unblocking Engine initialized with DevTools Shield module. Created by Thanmai.');
})();

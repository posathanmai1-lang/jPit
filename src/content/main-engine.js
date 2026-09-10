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
    hotkeyShield: true,
    frameworkSynthesizer: true
  };

  // Listen for config updates from isolated bridge script
  window.addEventListener('jPit_ConfigUpdate', (event) => {
    if (event.detail) {
      Object.assign(config, event.detail);
      applyCssSelectionState();
    }
  });

  // Preserve pristine native prototypes before site scripts modify them
  const rawAddEventListener = EventTarget.prototype.addEventListener;
  const rawAttachShadow = Element.prototype.attachShadow;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;

  // --- MODULE 1: PROTOTYPE HOOKS & SHADOW DOM TRAVERSAL ---

  // Patch EventTarget.prototype.addEventListener to suppress site anti-paste handlers at definition time
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (config.active) {
      if (type === 'paste' && config.unblockPaste) {
        // Wrap or filter site blocking listener if necessary
      }
    }
    return rawAddEventListener.call(this, type, listener, options);
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
    if (!config.active || !config.unblockContextMenu) return;
    
    // Allow Shift + Right Click to force native context menu
    if (e.shiftKey) return;

    e.stopImmediatePropagation();
  }

  function handleSelectStartEvent(e) {
    if (!config.active || !config.unblockSelection) return;
    e.stopImmediatePropagation();
  }

  function handleKeyDownEvent(e) {
    if (!config.active || !config.hotkeyShield) return;

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
    targetNode.addEventListener('selectstart', handleSelectStartEvent, true);
    targetNode.addEventListener('keydown', handleKeyDownEvent, true);
  }

  // --- MODULE 4: CSS SELECTION LOCK ENGINE ---

  function applyCssSelectionState() {
    let styleEl = document.getElementById('jpit-selection-style');
    if (config.active && config.unblockSelection) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'jpit-selection-style';
        styleEl.textContent = `
          *, input, textarea, [contenteditable="true"] {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
          }
        `;
        (document.head || document.documentElement).appendChild(styleEl);
      }
    } else if (styleEl) {
      styleEl.remove();
    }
  }

  // Initialize main document capturing shield
  attachCapturingShield(document);
  attachCapturingShield(window);
  applyCssSelectionState();

  console.log('[jPit v1.0] MAIN World Unblocking Engine initialized. Created by Thanmai.');
})();

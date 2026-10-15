export function createDialogs(getRenderId) {
  // Native dialogs plus a small fallback for older browser versions.
  let modalState;
  function showDialog(dialog, opener = document.activeElement) {
    if (dialog.open) return;
    modalState = { top: window.scrollY, opener, token: getRenderId() };
    document.body.style.top = `-${modalState.top}px`;
    document.body.classList.add('is-modal-open');
    dialog.returnValue = '';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else {
      dialog.setAttribute('open', '');
      dialog.classList.add('dialog-fallback');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.querySelector('button:not(:disabled)')?.focus();
    }
  }
  function unlockPage() {
    if (!modalState || document.querySelector('dialog[open]')) return;
    const saved = modalState;
    modalState = undefined;
    document.body.classList.remove('is-modal-open');
    document.body.style.top = '';
    if (saved.token === getRenderId()) {
      window.scrollTo(0, saved.top);
      if (saved.opener?.isConnected) saved.opener.focus({ preventScroll: true });
    }
  }
  function closeDialog(dialog, value = '') {
    if (!dialog.open) return;
    if (typeof dialog.close === 'function') dialog.close(value);
    else {
      dialog.returnValue = value;
      dialog.removeAttribute('open');
      dialog.classList.remove('dialog-fallback');
      dialog.dispatchEvent(new Event('close'));
    }
    unlockPage();
  }
  document
    .querySelectorAll('dialog')
    .forEach((dialog) => dialog.addEventListener('close', unlockPage));
  document.addEventListener('keydown', (event) => {
    const dialog = document.querySelector('dialog[open]');
    if (!dialog) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog(dialog, 'cancel');
    }
    if (event.key === 'Tab') {
      const items = [...dialog.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')];
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  });
  let zoom = 1;
  function openImage(src, alt, opener) {
    const image = document.querySelector('#zoom-image');
    image.src = src;
    image.alt = alt;
    zoom = 1;
    setZoom();
    const scroll = document.querySelector('#image-scroll');
    scroll.scrollTop = 0;
    scroll.scrollLeft = 0;
    showDialog(document.querySelector('#image-dialog'), opener);
  }
  function setZoom() {
    document.querySelector('#zoom-image').style.width = `${zoom * 100}%`;
    document.querySelector('#zoom-label').textContent = `${Math.round(zoom * 100)}%`;
    document.querySelector('#zoom-out').disabled = zoom <= 1;
    document.querySelector('#zoom-in').disabled = zoom >= 4;
  }
  document
    .querySelector('#close-image')
    .addEventListener('click', () => closeDialog(document.querySelector('#image-dialog')));
  document.querySelector('#zoom-in').addEventListener('click', () => {
    zoom = Math.min(4, zoom + 0.5);
    setZoom();
  });
  document.querySelector('#zoom-out').addEventListener('click', () => {
    zoom = Math.max(1, zoom - 0.5);
    setZoom();
  });
  function confirmAction(title, description, label, opener) {
    return new Promise((resolve) => {
      const dialog = document.querySelector('#confirm-dialog');
      document.querySelector('#confirm-title').textContent = title;
      document.querySelector('#confirm-description').textContent = description;
      document.querySelector('#confirm-ok').textContent = label;
      document.querySelector('#confirm-ok').onclick = () => closeDialog(dialog, 'ok');
      document.querySelector('#confirm-cancel').onclick = () => closeDialog(dialog, 'cancel');
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
      showDialog(dialog, opener);
    });
  }

  return {
    openImage,
    confirmAction,
    closeAll() {
      closeDialog(document.querySelector('#image-dialog'));
      closeDialog(document.querySelector('#confirm-dialog'), 'cancel');
    },
  };
}

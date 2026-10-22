/**
 * ============================================================================
 * ATA DE PRÉ-IMPLANTAÇÃO TÉCNICA E OPERACIONAL - GRUPO BURGUÊS
 * Script Principal (Vanilla JS: LocalStorage, Máscaras, Canvas & Print)
 * ============================================================================
 */

(function () {
  'use strict';

  // Chaves de Armazenamento
  const STORAGE_KEY_DATA = 'grupo_burgues_ata_pre_implantacao_dados';
  const STORAGE_KEY_PHOTO = 'grupo_burgues_ata_pre_implantacao_foto';
  const STORAGE_KEY_SIGS = 'grupo_burgues_ata_pre_implantacao_sigs';

  // Elementos do DOM
  const form = document.getElementById('ataForm');
  const btnExportarPdf = document.getElementById('btnExportarPdf');
  const btnLimpar = document.getElementById('btnLimpar');
  const saveToast = document.getElementById('saveNotification');
  const saveToastText = document.getElementById('saveNotificationText');

  // Modal de Limpeza
  const modalConfirmarLimpeza = document.getElementById('modalConfirmarLimpeza');
  const btnCancelarLimpeza = document.getElementById('btnCancelarLimpeza');
  const btnConfirmarLimpeza = document.getElementById('btnConfirmarLimpeza');

  // Evidência Técnica (Upload / Preview)
  const dropzone = document.getElementById('dropzoneEvidencia');
  const inputFoto = document.getElementById('inputFotoEvidencia');
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  const previewContainer = document.getElementById('previewContainer');
  const imgPreview = document.getElementById('imgPreview');
  const btnRemoverFoto = document.getElementById('btnRemoverFoto');
  const printFallbackBox = document.getElementById('printFallbackBox');

  // Canvas de Assinaturas
  const sigCanvases = {
    sigCanvasTI: document.getElementById('sigCanvasTI'),
    sigCanvasOperacao: document.getElementById('sigCanvasOperacao'),
    sigCanvasUnidade: document.getElementById('sigCanvasUnidade')
  };

  // Estado de controle das assinaturas
  const signaturePads = {};

  let toastTimeout = null;
  let autoSaveTimeout = null;

  /* ==========================================================================
     1. INICIALIZAÇÃO E CICLO DE VIDA
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initSignaturePads();
    initMasks();
    initEvidenceUploader();
    initDataSync();
    restoreAllData();
    setupEventListeners();
  });

  /* ==========================================================================
     2. MÁSCARAS DE ENTRADA (CNPJ & TELEFONE BRASIL)
     ========================================================================== */
  function initMasks() {
    // Máscara CNPJ: 00.000.000/0000-00
    const cnpjInput = document.getElementById('cnpj');
    if (cnpjInput) {
      cnpjInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 14) value = value.substring(0, 14);

        if (value.length > 12) {
          value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
        } else if (value.length > 8) {
          value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
        } else if (value.length > 5) {
          value = value.replace(/^(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
        } else if (value.length > 2) {
          value = value.replace(/^(\d{2})(\d{1,3})/, '$1.$2');
        }
        e.target.value = value;
      });
    }

    // Máscara Telefones: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    const phoneInputs = [
      'contatoLocal',
      'contatoTI',
      'contatoOperacao',
      'sigContatoTI',
      'sigContatoOperacao',
      'sigContatoUnidade'
    ];

    phoneInputs.forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', (e) => {
          let value = e.target.value.replace(/\D/g, '');
          if (value.length > 11) value = value.substring(0, 11);

          if (value.length > 10) {
            value = value.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
          } else if (value.length > 6) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
          } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
          } else if (value.length > 0) {
            value = value.replace(/^(\d{0,2})/, '($1');
          }
          e.target.value = value;
        });
      }
    });
  }

  /* ==========================================================================
     3. SINCRONIZAÇÃO INTELIGENTE DE CONTATOS (RESPONSÁVEIS -> ASSINATURAS)
     ========================================================================== */
  function initDataSync() {
    // Sincroniza TI
    const respTI = document.getElementById('respTI');
    const sigNomeTI = document.getElementById('sigNomeTI');
    const contatoTI = document.getElementById('contatoTI');
    const sigContatoTI = document.getElementById('sigContatoTI');

    if (respTI && sigNomeTI) {
      respTI.addEventListener('input', () => {
        if (!sigNomeTI.dataset.customized) sigNomeTI.value = respTI.value;
      });
      sigNomeTI.addEventListener('input', () => {
        sigNomeTI.dataset.customized = 'true';
      });
    }

    if (contatoTI && sigContatoTI) {
      contatoTI.addEventListener('input', () => {
        if (!sigContatoTI.dataset.customized) sigContatoTI.value = contatoTI.value;
      });
      sigContatoTI.addEventListener('input', () => {
        sigContatoTI.dataset.customized = 'true';
      });
    }

    // Sincroniza Operação
    const respOperacao = document.getElementById('respOperacao');
    const sigNomeOperacao = document.getElementById('sigNomeOperacao');
    const contatoOperacao = document.getElementById('contatoOperacao');
    const sigContatoOperacao = document.getElementById('sigContatoOperacao');

    if (respOperacao && sigNomeOperacao) {
      respOperacao.addEventListener('input', () => {
        if (!sigNomeOperacao.dataset.customized) sigNomeOperacao.value = respOperacao.value;
      });
      sigNomeOperacao.addEventListener('input', () => {
        sigNomeOperacao.dataset.customized = 'true';
      });
    }

    if (contatoOperacao && sigContatoOperacao) {
      contatoOperacao.addEventListener('input', () => {
        if (!sigContatoOperacao.dataset.customized) sigContatoOperacao.value = contatoOperacao.value;
      });
      sigContatoOperacao.addEventListener('input', () => {
        sigContatoOperacao.dataset.customized = 'true';
      });
    }

    // Sincroniza Responsável da Unidade com Responsável Contatado Local
    const respContatado = document.getElementById('respContatado');
    const sigNomeUnidade = document.getElementById('sigNomeUnidade');
    const contatoLocal = document.getElementById('contatoLocal');
    const sigContatoUnidade = document.getElementById('sigContatoUnidade');

    if (respContatado && sigNomeUnidade) {
      respContatado.addEventListener('input', () => {
        if (!sigNomeUnidade.dataset.customized) sigNomeUnidade.value = respContatado.value;
      });
      sigNomeUnidade.addEventListener('input', () => {
        sigNomeUnidade.dataset.customized = 'true';
      });
    }

    if (contatoLocal && sigContatoUnidade) {
      contatoLocal.addEventListener('input', () => {
        if (!sigContatoUnidade.dataset.customized) sigContatoUnidade.value = contatoLocal.value;
      });
      sigContatoUnidade.addEventListener('input', () => {
        sigContatoUnidade.dataset.customized = 'true';
      });
    }
  }

  /* ==========================================================================
     4. ASSINATURAS DIGITAIS VIA CANVAS (TOUCH & MOUSE DE ALTA RESOLUÇÃO)
     ========================================================================== */
  function initSignaturePads() {
    Object.keys(sigCanvases).forEach((key) => {
      const canvas = sigCanvases[key];
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      setupHiDPICanvas(canvas, ctx);

      const state = {
        isDrawing: false,
        hasSignature: false,
        lastX: 0,
        lastY: 0,
        ctx: ctx,
        canvas: canvas
      };

      signaturePads[key] = state;

      // Eventos Pointer (suporte nativo unificado para mouse, stylus e touch)
      canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        const rect = canvas.getBoundingClientRect();
        state.isDrawing = true;
        state.lastX = e.clientX - rect.left;
        state.lastY = e.clientY - rect.top;
      });

      canvas.addEventListener('pointermove', (e) => {
        if (!state.isDrawing) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(state.lastX, state.lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        state.lastX = currentX;
        state.lastY = currentY;
        state.hasSignature = true;
      });

      const stopDrawing = (e) => {
        if (state.isDrawing) {
          state.isDrawing = false;
          if (e && e.pointerId) {
            try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
          }
          triggerAutoSave();
        }
      };

      canvas.addEventListener('pointerup', stopDrawing);
      canvas.addEventListener('pointercancel', stopDrawing);
      canvas.addEventListener('pointerout', stopDrawing);
    });

    // Botões de Limpar Assinatura
    document.querySelectorAll('.btn-clear-sig').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-target');
        clearSignature(targetId);
        triggerAutoSave();
      });
    });

    // Ajuste de redimensionamento de janela
    window.addEventListener('resize', debounce(() => {
      Object.keys(signaturePads).forEach((key) => {
        const pad = signaturePads[key];
        if (pad.hasSignature) {
          const tempImg = pad.canvas.toDataURL();
          setupHiDPICanvas(pad.canvas, pad.ctx);
          const img = new Image();
          img.onload = () => pad.ctx.drawImage(img, 0, 0, pad.canvas.width / (window.devicePixelRatio || 1), pad.canvas.height / (window.devicePixelRatio || 1));
          img.src = tempImg;
        } else {
          setupHiDPICanvas(pad.canvas, pad.ctx);
        }
      });
    }, 250));
  }

  function setupHiDPICanvas(canvas, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 340;
    const height = 120;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
  }

  function clearSignature(canvasId) {
    const pad = signaturePads[canvasId];
    if (!pad) return;
    const dpr = window.devicePixelRatio || 1;
    pad.ctx.clearRect(0, 0, pad.canvas.width / dpr, pad.canvas.height / dpr);
    pad.hasSignature = false;
  }

  function saveSignaturesToStorage() {
    const signatures = {};
    Object.keys(signaturePads).forEach((key) => {
      const pad = signaturePads[key];
      if (pad.hasSignature) {
        signatures[key] = pad.canvas.toDataURL('image/png');
      } else {
        signatures[key] = null;
      }
    });

    try {
      localStorage.setItem(STORAGE_KEY_SIGS, JSON.stringify(signatures));
    } catch (err) {
      console.warn('Erro ao salvar assinaturas no localStorage:', err);
    }
  }

  function restoreSignaturesFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SIGS);
      if (!raw) return;
      const signatures = JSON.parse(raw);

      Object.keys(signatures).forEach((key) => {
        const dataUrl = signatures[key];
        const pad = signaturePads[key];
        if (dataUrl && pad) {
          const img = new Image();
          img.onload = () => {
            const dpr = window.devicePixelRatio || 1;
            pad.ctx.drawImage(img, 0, 0, pad.canvas.width / dpr, pad.canvas.height / dpr);
            pad.hasSignature = true;
          };
          img.src = dataUrl;
        }
      });
    } catch (err) {
      console.warn('Erro ao restaurar assinaturas:', err);
    }
  }

  /* ==========================================================================
     5. GESTÃO DE EVIDÊNCIA TÉCNICA (UPLOAD, CTRL+V, COMPRESSÃO & PREVIEW)
     ========================================================================== */
  function initEvidenceUploader() {
    if (!dropzone || !inputFoto) return;

    // Clique na dropzone dispara seleção de arquivo
    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('#btnRemoverFoto')) return;
      inputFoto.click();
    });

    // Mudança no input file
    inputFoto.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) processImageFile(file);
    });

    // Drag and Drop
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt.files && dt.files[0];
      if (file && file.type.startsWith('image/')) {
        processImageFile(file);
      }
    });

    // Colar Print direto da área de transferência (Ctrl+V)
    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob);
            showToast('Print colado com sucesso!');
            break;
          }
        }
      }
    });

    // Botão de remover foto
    if (btnRemoverFoto) {
      btnRemoverFoto.addEventListener('click', (e) => {
        e.stopPropagation();
        removeEvidenceImage();
        triggerAutoSave();
      });
    }
  }

  function processImageFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target.result;
      // Comprime a imagem para garantir que não estoure o localStorage de 5MB
      compressImage(rawDataUrl, 1200, 0.75, (compressedDataUrl) => {
        displayEvidenceImage(compressedDataUrl);
        savePhotoToStorage(compressedDataUrl);
        triggerAutoSave();
      });
    };
    reader.readAsDataURL(file);
  }

  function compressImage(base64Str, maxWidth, quality, callback) {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedUrl = canvas.toDataURL('image/jpeg', quality);
      callback(compressedUrl);
    };
    img.onerror = () => {
      callback(base64Str);
    };
  }

  function displayEvidenceImage(dataUrl) {
    imgPreview.src = dataUrl;
    uploadPlaceholder.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    if (printFallbackBox) printFallbackBox.classList.add('hidden');
  }

  function removeEvidenceImage() {
    imgPreview.src = '';
    inputFoto.value = '';
    previewContainer.classList.add('hidden');
    uploadPlaceholder.classList.remove('hidden');
    if (printFallbackBox) printFallbackBox.classList.remove('hidden');
    try {
      localStorage.removeItem(STORAGE_KEY_PHOTO);
    } catch (_) {}
  }

  function savePhotoToStorage(dataUrl) {
    try {
      localStorage.setItem(STORAGE_KEY_PHOTO, dataUrl);
    } catch (err) {
      console.warn('Quota de localStorage excedida ao salvar imagem:', err);
      showToast('Aviso: Imagem mantida apenas nesta sessão (armazenamento cheio).');
    }
  }

  function restorePhotoFromStorage() {
    try {
      const dataUrl = localStorage.getItem(STORAGE_KEY_PHOTO);
      if (dataUrl) {
        displayEvidenceImage(dataUrl);
      }
    } catch (_) {}
  }

  /* ==========================================================================
     6. PERSISTÊNCIA COMPLETA EM LOCALSTORAGE (AUTO-SAVE)
     ========================================================================== */
  function collectFormData() {
    const data = {};
    const elements = form.querySelectorAll('input, select, textarea');

    elements.forEach((el) => {
      if (!el.name || el.type === 'file') return;

      if (el.type === 'checkbox') {
        if (!data[el.name]) {
          data[el.name] = [];
        }
        if (el.checked) {
          data[el.name].push(el.value);
        }
      } else if (el.type === 'radio') {
        if (el.checked) {
          data[el.name] = el.value;
        }
      } else {
        data[el.name] = el.value;
      }
    });

    return data;
  }

  function saveFormDataToStorage() {
    const formData = collectFormData();
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(formData));
      saveSignaturesToStorage();
      showToast('Alterações salvas automaticamente');
    } catch (err) {
      console.error('Falha ao salvar no localStorage:', err);
    }
  }

  function restoreAllData() {
    // 1. Restaura campos normais do formulário
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DATA);
      if (raw) {
        const data = JSON.parse(raw);
        Object.keys(data).forEach((name) => {
          const val = data[name];
          const fields = form.querySelectorAll(`[name="${name}"]`);

          if (fields.length > 0) {
            const first = fields[0];
            if (first.type === 'radio') {
              fields.forEach((radio) => {
                radio.checked = radio.value === val;
              });
            } else if (first.type === 'checkbox') {
              fields.forEach((checkbox) => {
                checkbox.checked = Array.isArray(val) && val.includes(checkbox.value);
              });
            } else {
              first.value = val;
            }
          }
        });
      }
    } catch (err) {
      console.error('Erro ao recuperar dados do formulário:', err);
    }

    // 2. Restaura imagem de evidência técnica
    restorePhotoFromStorage();

    // 3. Restaura assinaturas digitais
    restoreSignaturesFromStorage();

    // Se a data de implantação estiver vazia, inicializa com a data atual
    const dataImplantacao = document.getElementById('dataImplantacao');
    if (dataImplantacao && !dataImplantacao.value) {
      const today = new Date().toISOString().split('T')[0];
      dataImplantacao.value = today;
    }

    // Se data/hora de desativação estiver vazia, inicializa com o momento atual
    const dataHoraDesativacao = document.getElementById('dataHoraDesativacao');
    if (dataHoraDesativacao && !dataHoraDesativacao.value) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      dataHoraDesativacao.value = now.toISOString().slice(0, 16);
    }
  }

  function triggerAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveFormDataToStorage();
    }, 350);
  }

  function setupEventListeners() {
    // Dispara auto-save em tempo real para qualquer alteração
    form.addEventListener('input', triggerAutoSave);
    form.addEventListener('change', triggerAutoSave);

    // Botão Finalizar e Salvar PDF
    btnExportarPdf.addEventListener('click', handleExportPdf);

    // Modal de Limpeza
    btnLimpar.addEventListener('click', () => {
      if (typeof modalConfirmarLimpeza.showModal === 'function') {
        modalConfirmarLimpeza.showModal();
      } else {
        if (confirm('Deseja realmente limpar todos os campos e apagar os dados salvos?')) {
          resetAllFormData();
        }
      }
    });

    btnCancelarLimpeza.addEventListener('click', () => {
      modalConfirmarLimpeza.close();
    });

    btnConfirmarLimpeza.addEventListener('click', () => {
      resetAllFormData();
      modalConfirmarLimpeza.close();
      showToast('Formulário limpo com sucesso');
    });
  }

  function resetAllFormData() {
    // 1. Reseta os valores do formulário HTML
    form.reset();

    // 2. Limpa imagem de evidência
    removeEvidenceImage();

    // 3. Limpa todos os canvas de assinatura
    Object.keys(signaturePads).forEach((key) => {
      clearSignature(key);
    });

    // 4. Remove do localStorage
    try {
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_PHOTO);
      localStorage.removeItem(STORAGE_KEY_SIGS);
    } catch (_) {}

    // 5. Reinicializa datas padrão
    const dataImplantacao = document.getElementById('dataImplantacao');
    if (dataImplantacao) dataImplantacao.value = new Date().toISOString().split('T')[0];

    const dataHoraDesativacao = document.getElementById('dataHoraDesativacao');
    if (dataHoraDesativacao) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      dataHoraDesativacao.value = now.toISOString().slice(0, 16);
    }
  }

  /* ==========================================================================
     7. EXPORTAÇÃO PDF E IMPRESSÃO OFICIAL (WINDOW.PRINT)
     ========================================================================== */
  function handleExportPdf() {
    // Validação básica amigável para alertar o técnico sobre campos fundamentais
    const unidadePraca = document.getElementById('unidadePraca')?.value.trim();
    const cnpj = document.getElementById('cnpj')?.value.trim();
    const hashDesativacao = document.getElementById('hashDesativacao')?.value.trim();

    const marcasSelecionadas = form.querySelectorAll('input[name="marcas"]:checked');

    if (!unidadePraca || !cnpj) {
      const confirmar = confirm(
        'Atenção: A "Unidade / Praça" ou "CNPJ" ainda não foram preenchidos.\n\nDeseja prosseguir para a geração do PDF mesmo assim?'
      );
      if (!confirmar) return;
    } else if (marcasSelecionadas.length === 0) {
      const confirmar = confirm(
        'Nenhuma Loja/Marca foi marcada no cabeçalho.\n\nDeseja continuar para o PDF?'
      );
      if (!confirmar) return;
    }

    // Salva o estado atual antes de imprimir
    saveFormDataToStorage();

    // Dispara a impressão nativa / exportação PDF
    window.print();
  }

  /* ==========================================================================
     8. TOAST NOTIFICATION
     ========================================================================== */
  function showToast(message) {
    if (!saveToast) return;
    if (saveToastText) saveToastText.textContent = message;

    saveToast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      saveToast.classList.remove('visible');
    }, 2200);
  }

  /* ==========================================================================
     9. UTILITÁRIOS
     ========================================================================== */
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

})();

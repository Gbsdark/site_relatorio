/**
 * ============================================================================
 * SCRIPT PRINCIPAL DA APLICAÇÃO - GRUPO BURGUÊS
 * Arquivo: src/assets/js/main.js
 * 
 * Orquestrador da Aplicação:
 * - Sincronização e Ciclo de Vida do Formulário
 * - Salvamento Automático no Navegador (LocalStorage)
 * - Captura, Compressão e Validação de Foto de Evidência
 * - Integração de Assinaturas Digitais em Canvas
 * - Download Direto de Arquivo PDF (.pdf) via html2pdf
 * - Impressão Oficial Nativa via window.print()
 * ============================================================================
 */

(function (global) {
  'use strict';

  // Submódulos globais (Compatibilidade universal sem dependência de ES Modules no file://)
  const GBStorage = global.GBStorage || {};
  const GBCanvas = global.GBCanvas || {};

  const saveFormData = GBStorage.saveFormData || function () {};
  const restoreFormData = GBStorage.restoreFormData || function () { return null; };
  const saveSignatures = GBStorage.saveSignatures || function () {};
  const restoreSignatures = GBStorage.restoreSignatures || function () { return null; };
  const savePhoto = GBStorage.savePhoto || function () {};
  const restorePhoto = GBStorage.restorePhoto || function () { return null; };
  const removePhoto = GBStorage.removePhoto || function () {};
  const clearAllStoredData = GBStorage.clearAllStoredData || function () {};

  const initSignaturePads = GBCanvas.initSignaturePads || function () {};
  const clearAllSignatures = GBCanvas.clearAllSignatures || function () {};
  const exportSignatures = GBCanvas.exportSignatures || function () { return {}; };
  const importSignatures = GBCanvas.importSignatures || function () {};

  // Elementos do DOM Principal
  const form = document.getElementById('ataForm');
  const btnExportarPdf = document.getElementById('btnExportarPdf');
  const btnPrintNative = document.getElementById('btnPrintNative');
  const btnPreviewPdf = document.getElementById('btnPreviewPdf');
  const btnLimpar = document.getElementById('btnLimpar');
  const saveToast = document.getElementById('saveNotification');
  const saveToastText = document.getElementById('saveNotificationText');

  // Modal de Pré-visualização do PDF Oficial
  const modalPreviewPdf = document.getElementById('modalPreviewPdf');
  const previewSheetFrame = document.getElementById('previewSheetFrame');
  const btnClosePreview = document.getElementById('btnClosePreview');
  const btnPrintFromPreview = document.getElementById('btnPrintFromPreview');
  const btnDownloadFromPreview = document.getElementById('btnDownloadFromPreview');

  // Modal de Limpeza Manual do Formulário
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

  let toastTimeout = null;
  let autoSaveTimeout = null;

  /* ==========================================================================
     1. INICIALIZAÇÃO DA APLICAÇÃO
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initMasks();
    initDataSync();
    initEvidenceUploader();
    initSignaturePads(triggerAutoSave);
    setupEventListeners();
    initDefaultDates();

    // Restaura dados salvos localmente
    const savedData = restoreFormData();
    if (savedData) {
      populateFormFields(savedData);
    }
    restorePhotoEvidence();
    restoreDigitalSignatures();
    syncPrintTemplate();

    if (savedData) {
      showToast('Progresso restaurado automaticamente');
    }
  });

  /* ==========================================================================
     2. MÁSCARAS DE ENTRADA (CNPJ & TELEFONE)
     ========================================================================== */
  function initMasks() {
    const cnpjInput = document.getElementById('cnpj');
    if (cnpjInput && !cnpjInput.dataset.maskBound) {
      cnpjInput.dataset.maskBound = 'true';
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
      if (input && !input.dataset.maskBound) {
        input.dataset.maskBound = 'true';
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
     3. SINCRONIZAÇÃO INTELIGENTE DE CONTATOS
     ========================================================================== */
  function initDataSync() {
    const bindSync = (sourceId, targetId) => {
      const source = document.getElementById(sourceId);
      const target = document.getElementById(targetId);
      if (!source || !target || source.dataset.syncBound) return;

      source.dataset.syncBound = 'true';
      source.addEventListener('input', () => {
        if (!target.dataset.customized) target.value = source.value;
      });
      target.addEventListener('input', () => {
        target.dataset.customized = 'true';
      });
    };

    bindSync('respTI', 'sigNomeTI');
    bindSync('contatoTI', 'sigContatoTI');
    bindSync('respOperacao', 'sigNomeOperacao');
    bindSync('contatoOperacao', 'sigContatoOperacao');
    bindSync('respContatado', 'sigNomeUnidade');
    bindSync('contatoLocal', 'sigContatoUnidade');
  }

  /* ==========================================================================
     4. GESTÃO DE EVIDÊNCIA TÉCNICA E UPLOAD
     ========================================================================== */
  function initEvidenceUploader() {
    if (!dropzone || !inputFoto || dropzone.dataset.uploaderBound) return;
    dropzone.dataset.uploaderBound = 'true';

    // Impede que o clique no input propague de volta para o dropzone (evita duplo clique e cancelamento)
    inputFoto.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('#btnRemoverFoto') || e.target === inputFoto) return;
      inputFoto.click();
    });

    inputFoto.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        handleImageFile(file);
      }
      inputFoto.value = ''; // Permite selecionar o mesmo arquivo novamente
    });

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
      if (file) handleImageFile(file);
    });

    if (!window.__pasteBound) {
      window.__pasteBound = true;
      window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              handleImageFile(blob);
              break;
            }
          }
        }
      });
    }

    if (btnRemoverFoto && !btnRemoverFoto.dataset.bound) {
      btnRemoverFoto.dataset.bound = 'true';
      btnRemoverFoto.addEventListener('click', (e) => {
        e.stopPropagation();
        removeEvidenceImage();
        triggerAutoSave();
        showToast('Foto de evidência removida');
      });
    }
  }

  function handleImageFile(file) {
    if (!file) return;

    const fileName = (file.name || '').toLowerCase();
    const fileType = (file.type || '').toLowerCase();

    // Validação flexível: aceita MIME image/* ou extensões comuns
    const isImage = fileType.startsWith('image/') ||
      /\.(jpe?g|png|webp|bmp|gif|svg)$/i.test(fileName);

    if (!isImage) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP ou BMP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target.result;
      compressImage(rawDataUrl, 1200, 0.8, (compressedDataUrl) => {
        displayEvidenceImage(compressedDataUrl);
        savePhoto(compressedDataUrl);
        triggerAutoSave();
        showToast('Foto de evidência anexada com sucesso');
      });
    };
    reader.onerror = () => {
      alert('Erro ao carregar a imagem selecionada.');
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
      // Preenchimento branco para não ficar fundo preto em PNGs transparentes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressedUrl = canvas.toDataURL('image/jpeg', quality);
        callback(compressedUrl);
      } catch (_) {
        callback(base64Str);
      }
    };
    img.onerror = () => {
      callback(base64Str);
    };
  }

  function displayEvidenceImage(dataUrl) {
    if (!imgPreview) return;
    imgPreview.src = dataUrl;
    if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
    if (previewContainer) previewContainer.classList.remove('hidden');
    if (printFallbackBox) printFallbackBox.classList.add('hidden');
    syncPrintTemplate();
  }

  function removeEvidenceImage() {
    if (imgPreview) imgPreview.src = '';
    if (inputFoto) inputFoto.value = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    if (uploadPlaceholder) uploadPlaceholder.classList.remove('hidden');
    if (printFallbackBox) printFallbackBox.classList.remove('hidden');
    removePhoto();
    syncPrintTemplate();
  }

  function restorePhotoEvidence() {
    const photoDataUrl = restorePhoto();
    if (photoDataUrl) {
      displayEvidenceImage(photoDataUrl);
    }
  }

  function restoreDigitalSignatures() {
    const sigs = restoreSignatures();
    if (sigs) {
      importSignatures(sigs);
    }
  }

  /* ==========================================================================
     5. PERSISTÊNCIA E AUTO-SAVE NO NAVEGADOR
     ========================================================================== */
  function collectFormData() {
    const data = {};
    const elements = form.querySelectorAll('input, select, textarea');

    elements.forEach((el) => {
      if (!el.name || el.type === 'file') return;

      if (el.type === 'checkbox') {
        if (!data[el.name]) data[el.name] = [];
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

  function populateFormFields(data) {
    if (!data || typeof data !== 'object') return;

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
          first.value = val !== undefined && val !== null ? val : '';
        }
      }
    });

    // Preservação de customizações manuais nos campos de assinatura
    const syncPairs = [
      { sourceId: 'respTI', targetId: 'sigNomeTI' },
      { sourceId: 'contatoTI', targetId: 'sigContatoTI' },
      { sourceId: 'respOperacao', targetId: 'sigNomeOperacao' },
      { sourceId: 'contatoOperacao', targetId: 'sigContatoOperacao' },
      { sourceId: 'respContatado', targetId: 'sigNomeUnidade' },
      { sourceId: 'contatoLocal', targetId: 'sigContatoUnidade' }
    ];

    syncPairs.forEach(({ sourceId, targetId }) => {
      const source = document.getElementById(sourceId);
      const target = document.getElementById(targetId);
      if (source && target && target.value.trim() !== '' && target.value !== source.value) {
        target.dataset.customized = 'true';
      }
    });
  }

  function saveAllDataToStorage() {
    const formData = collectFormData();
    try {
      saveFormData(formData);
      saveSignatures(exportSignatures());
      showToast('Alterações salvas automaticamente');
    } catch (err) {
      console.error('[Storage] Erro ao salvar dados:', err);
    }
  }

  function triggerAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveAllDataToStorage();
    }, 350);
  }

  function initDefaultDates() {
    const dataImplantacao = document.getElementById('dataImplantacao');
    if (dataImplantacao && !dataImplantacao.value) {
      dataImplantacao.value = new Date().toISOString().split('T')[0];
    }

    const dataHoraDesativacao = document.getElementById('dataHoraDesativacao');
    if (dataHoraDesativacao && !dataHoraDesativacao.value) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      dataHoraDesativacao.value = now.toISOString().slice(0, 16);
    }
  }

  /* ==========================================================================
     6. EVENT LISTENERS E CONTROLES DE INTERFACE
     ========================================================================== */
  function setupEventListeners() {
    if (form && !form.dataset.eventsBound) {
      form.dataset.eventsBound = 'true';
      form.addEventListener('input', () => {
        triggerAutoSave();
        syncPrintTemplate();
      });
      form.addEventListener('change', () => {
        triggerAutoSave();
        syncPrintTemplate();
      });
    }

    // Botão Principal: Baixar Arquivo PDF (.pdf)
    if (btnExportarPdf && !btnExportarPdf.dataset.eventsBound) {
      btnExportarPdf.dataset.eventsBound = 'true';
      btnExportarPdf.addEventListener('click', generateAndDownloadPdf);
    }

    // Botão Secundário: Imprimir pelo Navegador (window.print)
    if (btnPrintNative && !btnPrintNative.dataset.eventsBound) {
      btnPrintNative.dataset.eventsBound = 'true';
      btnPrintNative.addEventListener('click', handlePrintDirect);
    }

    // Modal de Pré-visualização
    if (btnPreviewPdf && !btnPreviewPdf.dataset.eventsBound) {
      btnPreviewPdf.dataset.eventsBound = 'true';
      btnPreviewPdf.addEventListener('click', handleOpenPreview);
    }

    if (btnClosePreview && !btnClosePreview.dataset.eventsBound) {
      btnClosePreview.dataset.eventsBound = 'true';
      btnClosePreview.addEventListener('click', handleClosePreview);
    }

    if (btnPrintFromPreview && !btnPrintFromPreview.dataset.eventsBound) {
      btnPrintFromPreview.dataset.eventsBound = 'true';
      btnPrintFromPreview.addEventListener('click', () => {
        handleClosePreview();
        handlePrintDirect();
      });
    }

    if (btnDownloadFromPreview && !btnDownloadFromPreview.dataset.eventsBound) {
      btnDownloadFromPreview.dataset.eventsBound = 'true';
      btnDownloadFromPreview.addEventListener('click', () => {
        handleClosePreview();
        generateAndDownloadPdf();
      });
    }

    // Fechar modal ao clicar fora (backdrop)
    if (modalPreviewPdf && !modalPreviewPdf.dataset.backdropBound) {
      modalPreviewPdf.dataset.backdropBound = 'true';
      modalPreviewPdf.addEventListener('click', (e) => {
        if (e.target === modalPreviewPdf) {
          handleClosePreview();
        }
      });
    }

    // Modal de Limpeza
    if (btnLimpar && !btnLimpar.dataset.eventsBound) {
      btnLimpar.dataset.eventsBound = 'true';
      btnLimpar.addEventListener('click', () => {
        if (modalConfirmarLimpeza && typeof modalConfirmarLimpeza.showModal === 'function') {
          modalConfirmarLimpeza.showModal();
        } else {
          if (confirm('Deseja realmente limpar todos os campos e apagar os dados salvos?')) {
            resetAllFormData();
          }
        }
      });
    }

    if (btnCancelarLimpeza && !btnCancelarLimpeza.dataset.eventsBound) {
      btnCancelarLimpeza.dataset.eventsBound = 'true';
      btnCancelarLimpeza.addEventListener('click', () => {
        modalConfirmarLimpeza.close();
      });
    }

    if (btnConfirmarLimpeza && !btnConfirmarLimpeza.dataset.eventsBound) {
      btnConfirmarLimpeza.dataset.eventsBound = 'true';
      btnConfirmarLimpeza.addEventListener('click', () => {
        resetAllFormData();
        modalConfirmarLimpeza.close();
        showToast('Formulário limpo com sucesso');
      });
    }

    // Gancho de sincronização nativa antes da impressão
    window.addEventListener('beforeprint', syncPrintTemplate);
  }

  function handleOpenPreview() {
    syncPrintTemplate();
    const printDoc = document.getElementById('printTemplate');
    if (printDoc && previewSheetFrame) {
      previewSheetFrame.innerHTML = '';
      const clone = printDoc.cloneNode(true);
      clone.id = 'printTemplateClone';
      previewSheetFrame.appendChild(clone);
    }
    if (modalPreviewPdf && typeof modalPreviewPdf.showModal === 'function') {
      modalPreviewPdf.showModal();
    }
  }

  function handleClosePreview() {
    if (modalPreviewPdf && typeof modalPreviewPdf.close === 'function') {
      modalPreviewPdf.close();
    }
  }

  function resetAllFormData() {
    form.reset();
    removeEvidenceImage();
    clearAllSignatures();
    clearAllStoredData();
    initDefaultDates();
    syncPrintTemplate();
  }

  function isScheduleCompatible(inicio, fim) {
    if (!inicio || !fim) return true;
    return fim > inicio;
  }

  /**
   * Sincroniza em tempo real todos os dados do formulário interativo
   * com o modelo de impressão oficial (#printTemplate).
   * Garante correspondência 100% idêntica ao padrão oficial do PDF do Grupo Burguês.
   */
  function syncPrintTemplate() {
    const setElemText = (id, text, fallback) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = (text !== undefined && text !== null && text.trim() !== '') ? text : (fallback || '');
    };

    // 1. DADOS DA OPERAÇÃO E IDENTIFICAÇÃO (SEÇÃO 1)
    const unidadePraca = document.getElementById('unidadePraca')?.value.trim();
    const razaoSocial = document.getElementById('razaoSocial')?.value.trim();
    const cnpj = document.getElementById('cnpj')?.value.trim();
    const respContatado = document.getElementById('respContatado')?.value.trim();
    const respTI = document.getElementById('respTI')?.value.trim();
    const respOperacao = document.getElementById('respOperacao')?.value.trim();

    setElemText('print_unidadePraca', unidadePraca, '____________________________________________');
    setElemText('print_razaoSocial', razaoSocial, '____________________________________________');
    setElemText('print_cnpj', cnpj, '____________________________________________');
    setElemText('print_respContatado', respContatado, '____________________________________________');
    setElemText('print_respTI', respTI, '____________________________________________');
    setElemText('print_respOperacao', respOperacao, '____________________________________________');

    // Data da Implantação
    const dataImplantacaoRaw = document.getElementById('dataImplantacao')?.value;
    if (dataImplantacaoRaw) {
      const parts = dataImplantacaoRaw.split('-');
      if (parts.length === 3) {
        setElemText('print_dataImplantacao', `${parts[2]} / ${parts[1]} / ${parts[0]}`, '____ / ____ / 2026');
      } else {
        setElemText('print_dataImplantacao', dataImplantacaoRaw, '____ / ____ / 2026');
      }
    } else {
      setElemText('print_dataImplantacao', '', '____ / ____ / 2026');
    }

    // Horários (HH:MM às HH:MM)
    const hInicio = document.getElementById('horarioInicio')?.value.trim();
    const hFim = document.getElementById('horarioFim')?.value.trim();
    if (hInicio || hFim) {
      setElemText('print_horario', `${hInicio || '____:____'} às ${hFim || '____:____'}`);
    } else {
      setElemText('print_horario', '', '____:____ às ____:____');
    }

    // Lojas / Marcas
    const marcaBurgues = document.getElementById('marcaBurgues')?.checked;
    const marcaExTouro = document.getElementById('marcaExTouro')?.checked;
    const marcaSeuVidal = document.getElementById('marcaSeuVidal')?.checked;
    const marcaBdeBurger = document.getElementById('marcaBdeBurger')?.checked;

    setElemText('print_marcaBurgues', marcaBurgues ? '[X]' : '[ ]');
    setElemText('print_marcaExTouro', marcaExTouro ? '[X]' : '[ ]');
    setElemText('print_marcaSeuVidal', marcaSeuVidal ? '[X]' : '[ ]');
    setElemText('print_marcaBdeBurger', marcaBdeBurger ? '[X]' : '[ ]');

    // Contatos
    setElemText('print_contatoLocal', document.getElementById('contatoLocal')?.value.trim(), '(____) ____________________');
    setElemText('print_contatoTI', document.getElementById('contatoTI')?.value.trim(), '(____) ____________________');
    setElemText('print_contatoOperacao', document.getElementById('contatoOperacao')?.value.trim(), '(____) ____________________');

    // 2. CHECKLIST DE VERIFICAÇÃO TÉCNICA E OPERACIONAL (SEÇÃO 2)
    // Item 1: Conectividade
    const statusConectividade = form.querySelector('input[name="status_conectividade"]:checked')?.value || 'OK';
    setElemText('print_status_conectividade_ok', statusConectividade === 'OK' ? '[X]' : '[ ]');
    setElemText('print_status_conectividade_pendente', statusConectividade === 'Pendente' ? '[X]' : '[ ]');

    const ipFixo = form.querySelector('input[name="ip_fixo"]:checked')?.value || 'Não';
    setElemText('print_ip_fixo_sim', ipFixo === 'Sim' ? '[X]' : '[ ]');
    setElemText('print_ip_fixo_nao', ipFixo === 'Não' ? '[X]' : '[ ]');

    setElemText('print_obs_conectividade', document.getElementById('obs_conectividade')?.value.trim(), '_________________________________');

    // Item 2: Terminais PDV
    const statusPdv = form.querySelector('input[name="status_pdv"]:checked')?.value || 'OK';
    setElemText('print_status_pdv_ok', statusPdv === 'OK' ? '[X]' : '[ ]');
    setElemText('print_status_pdv_pendente', statusPdv === 'Pendente' ? '[X]' : '[ ]');

    setElemText('print_pdvs_testados', document.getElementById('pdvs_testados')?.value.trim(), '_______');
    setElemText('print_obs_pdv', document.getElementById('obs_pdv')?.value.trim(), '_________________________________');

    // Item 3: Impressoras
    const statusImp = form.querySelector('input[name="status_impressoras"]:checked')?.value || 'OK';
    setElemText('print_status_impressoras_ok', statusImp === 'OK' ? '[X]' : '[ ]');
    setElemText('print_status_impressoras_pendente', statusImp === 'Pendente' ? '[X]' : '[ ]');

    const impCom = document.getElementById('imp_comunicacao')?.checked;
    const impCorte = document.getElementById('imp_corte')?.checked;
    setElemText('print_imp_comunicacao', impCom ? '[X]' : '[ ]');
    setElemText('print_imp_corte', impCorte ? '[X]' : '[ ]');
    setElemText('print_obs_impressoras', document.getElementById('obs_impressoras')?.value.trim(), '_____________________');

    // Item 4: Cardápios
    const statusCardapio = form.querySelector('input[name="status_cardapio"]:checked')?.value || 'OK';
    setElemText('print_status_cardapio_ok', statusCardapio === 'OK' ? '[X]' : '[ ]');
    setElemText('print_status_cardapio_pendente', statusCardapio === 'Pendente' ? '[X]' : '[ ]');

    const cardapioSinc = document.getElementById('cardapio_sincronizacao')?.checked;
    setElemText('print_cardapio_sincronizacao', cardapioSinc ? '[X]' : '[ ]');
    setElemText('print_obs_cardapio', document.getElementById('obs_cardapio')?.value.trim(), '___________________________________');

    // Item 5: Delivery
    const statusDelivery = form.querySelector('input[name="status_delivery"]:checked')?.value || 'OK';
    setElemText('print_status_delivery_ok', statusDelivery === 'OK' ? '[X]' : '[ ]');
    setElemText('print_status_delivery_pendente', statusDelivery === 'Pendente' ? '[X]' : '[ ]');

    setElemText('print_pedido_teste_id', document.getElementById('pedido_teste_id')?.value.trim(), '_______________________________________________');

    // Item 6: OPDV Antigo
    const statusOpdvAntigo = form.querySelector('input[name="status_opdv_antigo"]:checked')?.value || 'OK';
    setElemText('print_status_opdv_antigo_ok', statusOpdvAntigo === 'OK' ? '[X]' : '[ ]');
    setElemText('print_status_opdv_antigo_pendente', statusOpdvAntigo === 'Pendente' ? '[X]' : '[ ]');

    const desatPainel = form.querySelector('input[name="desativacao_painel_sistema"]:checked')?.value || 'Sim';
    setElemText('print_desativacao_painel_sim', desatPainel === 'Sim' ? '[X]' : '[ ]');
    setElemText('print_desativacao_painel_nao', desatPainel === 'Não' ? '[X]' : '[ ]');

    // 3. EVIDÊNCIA TÉCNICA (SEÇÃO 3)
    const opdvDesativado = document.getElementById('opdv_desativado_sucesso')?.checked;
    setElemText('print_opdv_desativado', opdvDesativado ? '[X]' : '[ ]');

    const dataHoraRaw = document.getElementById('dataHoraDesativacao')?.value;
    if (dataHoraRaw) {
      const [dPart, tPart] = dataHoraRaw.split('T');
      if (dPart && tPart) {
        const dPieces = dPart.split('-');
        setElemText('print_dataHoraDesativacao', `${dPieces[2]}/${dPieces[1]}/${dPieces[0]} às ${tPart}h`);
      } else {
        setElemText('print_dataHoraDesativacao', dataHoraRaw, '_____/_____/2026 às _____:_____h');
      }
    } else {
      setElemText('print_dataHoraDesativacao', '', '_____/_____/2026 às _____:_____h');
    }

    // Imagem da Evidência
    const printFallback = document.getElementById('print_evidence_fallback');
    const printImg = document.getElementById('print_evidence_img');
    const previewImg = document.getElementById('imgPreview');
    const hasPhoto = previewImg && previewImg.src && previewImg.src.startsWith('data:image') && !previewImg.closest('.hidden');

    if (printFallback && printImg) {
      if (hasPhoto) {
        printImg.src = previewImg.src;
        printImg.classList.remove('hidden');
        printFallback.classList.add('hidden');
      } else {
        printImg.src = '';
        printImg.classList.add('hidden');
        printFallback.classList.remove('hidden');
      }
    }

    setElemText('print_hashDesativacao', document.getElementById('hashDesativacao')?.value.trim(), '____________________________________________________________________________________________');

    // 4. RELATO DA VISITA (SEÇÃO 4)
    const relato = document.getElementById('relatoVisita')?.value.trim();
    if (relato) {
      const lines = relato.split('\n').filter(l => l.trim() !== '');
      if (lines.length >= 2) {
        setElemText('print_relato_line1', lines[0].replace(/^1[\.\-\)]\s*/, ''));
        setElemText('print_relato_line2', lines.slice(1).join(' ').replace(/^2[\.\-\)]\s*/, ''));
      } else if (lines.length === 1) {
        setElemText('print_relato_line1', lines[0].replace(/^1[\.\-\)]\s*/, ''));
        setElemText('print_relato_line2', '', '_______________________________________________________________________________________________________________________');
      }
    } else {
      setElemText('print_relato_line1', '', '_______________________________________________________________________________________________________________________');
      setElemText('print_relato_line2', '', '_______________________________________________________________________________________________________________________');
    }

    // 5. ASSINATURAS E RESPONSÁVEIS (SEÇÃO 6)
    const signatures = exportSignatures();

    const updateSigImg = (imgId, dataUrl) => {
      const img = document.getElementById(imgId);
      if (!img) return;
      if (dataUrl) {
        img.src = dataUrl;
        img.classList.remove('hidden');
      } else {
        img.src = '';
        img.classList.add('hidden');
      }
    };

    updateSigImg('print_sig_img_ti', signatures.sigCanvasTI);
    updateSigImg('print_sig_img_operacao', signatures.sigCanvasOperacao);
    updateSigImg('print_sig_img_unidade', signatures.sigCanvasUnidade);

    setElemText('print_sigNomeTI', document.getElementById('sigNomeTI')?.value.trim(), '____________________________');
    setElemText('print_sigContatoTI', document.getElementById('sigContatoTI')?.value.trim(), '(____) ___________________');

    setElemText('print_sigNomeOperacao', document.getElementById('sigNomeOperacao')?.value.trim(), '____________________________');
    setElemText('print_sigContatoOperacao', document.getElementById('sigContatoOperacao')?.value.trim(), '(____) ___________________');

    setElemText('print_sigNomeUnidade', document.getElementById('sigNomeUnidade')?.value.trim(), '____________________________');
    setElemText('print_sigContatoUnidade', document.getElementById('sigContatoUnidade')?.value.trim(), '(____) ___________________');
  }

  /* ==========================================================================
     7. DOWNLOAD DIRETO DO PDF E IMPRESSÃO NATIVA
     ========================================================================== */
  
  /**
   * Gera o arquivo PDF oficial de alta resolução e dispara o download direto no navegador.
   */
  function generateAndDownloadPdf() {
    saveAllDataToStorage();
    syncPrintTemplate();

    const printDoc = document.getElementById('printTemplate');
    if (!printDoc) {
      alert('Modelo de impressão não localizado.');
      return;
    }

    const unidade = document.getElementById('unidadePraca')?.value.trim() || 'Unidade';
    const data = document.getElementById('dataImplantacao')?.value.trim() || '';
    const cleanUnidade = unidade.replace(/[^a-zA-Z0-9À-ÿ_-]/g, '_').substring(0, 30);
    const filename = `Ata_Pre_Implantacao_${cleanUnidade}${data ? '_' + data : ''}.pdf`;

    // Se a biblioteca html2pdf estiver disponível, gera e baixa o arquivo .pdf
    if (typeof html2pdf !== 'undefined') {
      showToast('Gerando arquivo PDF, aguarde...');

      // Cria um wrapper fora da tela com largura exata A4 (794px = 210mm a 96 DPI)
      const wrapper = document.createElement('div');
      wrapper.id = 'html2pdf_temp_wrapper';
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      wrapper.style.width = '794px';
      wrapper.style.background = '#ffffff';
      wrapper.style.zIndex = '-9999';
      wrapper.style.boxSizing = 'border-box';

      const clone = printDoc.cloneNode(true);
      clone.style.display = 'block';
      clone.style.width = '794px';
      clone.style.margin = '0 auto';
      clone.style.padding = '8mm 10mm';
      clone.style.background = '#ffffff';
      clone.style.boxSizing = 'border-box';

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const opt = {
        margin: [0, 0, 0, 0],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 794
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };

      html2pdf()
        .set(opt)
        .from(clone)
        .save()
        .then(() => {
          if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
          }
          showToast('PDF baixado com sucesso!');
        })
        .catch((err) => {
          console.error('[PDF] Falha ao exportar com html2pdf:', err);
          if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
          }
          // Fallback para impressão nativa caso o html2canvas encontre restrições
          window.print();
        });
    } else {
      // Fallback nativo: abre o diálogo de impressão do navegador
      showToast('Abrindo diálogo de impressão para Salvar como PDF...');
      window.print();
    }
  }

  /**
   * Abre a caixa de diálogo nativa de impressão do navegador (window.print).
   */
  function handlePrintDirect() {
    saveAllDataToStorage();
    syncPrintTemplate();
    window.print();
  }

  /* ==========================================================================
     8. NOTIFICAÇÃO TOAST
     ========================================================================== */
  function showToast(message) {
    if (!saveToast) return;
    if (saveToastText) saveToastText.textContent = message;

    saveToast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      saveToast.classList.remove('visible');
    }, 2800);
  }

})(typeof window !== 'undefined' ? window : this);

/**
 * Validação matemática de CNPJ pelos dígitos verificadores (Módulo 11).
 * @param {string} cnpj - String do CNPJ
 * @returns {boolean} True se válido
 */
function validateCNPJ(cnpj) {
  if (!cnpj || typeof cnpj !== 'string') return false;

  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(clean.charAt(i), 10) * weights1[i];
  }
  let remainder1 = sum1 % 11;
  let digit1 = remainder1 < 2 ? 0 : 11 - remainder1;
  if (parseInt(clean.charAt(12), 10) !== digit1) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(clean.charAt(i), 10) * weights2[i];
  }
  let remainder2 = sum2 % 11;
  let digit2 = remainder2 < 2 ? 0 : 11 - remainder2;
  if (parseInt(clean.charAt(13), 10) !== digit2) return false;

  return true;
}

if (typeof window !== 'undefined') {
  window.validateCNPJ = validateCNPJ;
}

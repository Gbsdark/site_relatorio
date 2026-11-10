/**
 * ============================================================================
 * MÓDULO DE ASSINATURAS DIGITAIS EM CANVAS - GRUPO BURGUÊS
 * Arquivo: src/assets/js/canvas.js
 * 
 * Responsabilidades:
 * - Gerenciamento de Canvas HiDPI com Suporte Universal a Touch, Stylus e Mouse
 * - Captura e Renderização de Traços Biométricos
 * - Exportação e Importação de Assinaturas Digitais em Base64 PNG
 * - Redimensionamento Responsivo sem Perda de Resolução
 * ============================================================================
 */

(function (global) {
  'use strict';

  // Estado interno dos pads de assinatura
  const signaturePads = {};

  /**
   * Inicializa os painéis de assinatura digital.
   * @param {Function} onDrawingEnd - Callback invocado ao término de cada traço (para auto-save)
   */
  function initSignaturePads(onDrawingEnd) {
    const canvasIds = ['sigCanvasTI', 'sigCanvasOperacao', 'sigCanvasUnidade'];

    canvasIds.forEach((id) => {
      const canvas = document.getElementById(id);
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      setupHiDPICanvas(canvas, ctx);

      const padState = {
        canvas: canvas,
        ctx: ctx,
        isDrawing: false,
        hasSignature: false,
        lastX: 0,
        lastY: 0
      };

      signaturePads[id] = padState;

      // Eventos Pointer: Suporte unificado para Mouse, Stylus e Touch
      if (canvas.dataset.padBound) return;
      canvas.dataset.padBound = 'true';

      canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        const rect = canvas.getBoundingClientRect();
        padState.isDrawing = true;
        padState.lastX = e.clientX - rect.left;
        padState.lastY = e.clientY - rect.top;
      });

      canvas.addEventListener('pointermove', (e) => {
        if (!padState.isDrawing) return;
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(padState.lastX, padState.lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        padState.lastX = currentX;
        padState.lastY = currentY;
        padState.hasSignature = true;
      });

      const stopDrawing = (e) => {
        if (padState.isDrawing) {
          padState.isDrawing = false;
          if (e && e.pointerId) {
            try {
              canvas.releasePointerCapture(e.pointerId);
            } catch (_) {}
          }
          if (typeof onDrawingEnd === 'function') {
            onDrawingEnd();
          }
        }
      };

      canvas.addEventListener('pointerup', stopDrawing);
      canvas.addEventListener('pointercancel', stopDrawing);
      canvas.addEventListener('pointerout', stopDrawing);
    });

    // Botões de Limpar Assinatura
    document.querySelectorAll('.btn-clear-sig').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';

      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-target');
        clearSignature(targetId);
        if (typeof onDrawingEnd === 'function') {
          onDrawingEnd();
        }
      });
    });

    // Ajuste com debounce para redimensionamento da janela
    if (!window.__canvasResizeBound) {
      window.__canvasResizeBound = true;
      let resizeTimeout = null;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          Object.keys(signaturePads).forEach((key) => {
            const pad = signaturePads[key];
            if (pad && pad.hasSignature) {
              const tempImg = pad.canvas.toDataURL();
              setupHiDPICanvas(pad.canvas, pad.ctx);
              const img = new Image();
              img.onload = () => {
                const dpr = window.devicePixelRatio || 1;
                pad.ctx.drawImage(img, 0, 0, pad.canvas.width / dpr, pad.canvas.height / dpr);
              };
              img.src = tempImg;
            } else if (pad) {
              setupHiDPICanvas(pad.canvas, pad.ctx);
            }
          });
        }, 250);
      });
    }
  }

  /**
   * Configura o Canvas com suporte a telas de alta densidade de pixels (HiDPI / Retina).
   */
  function setupHiDPICanvas(canvas, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 340;
    const height = 120;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
  }

  /**
   * Limpa o conteúdo de uma assinatura específica.
   * @param {string} canvasId - ID do elemento canvas
   */
  function clearSignature(canvasId) {
    const pad = signaturePads[canvasId];
    if (!pad) return;

    const dpr = window.devicePixelRatio || 1;
    pad.ctx.clearRect(0, 0, pad.canvas.width / dpr, pad.canvas.height / dpr);
    pad.hasSignature = false;
  }

  /**
   * Limpa todos os canvas de assinatura digital.
   */
  function clearAllSignatures() {
    Object.keys(signaturePads).forEach((key) => {
      clearSignature(key);
    });
  }

  /**
   * Exporta todas as assinaturas preenchidas como dataURL em Base64 PNG.
   * @returns {object} Dicionário { sigCanvasTI: "data:image/png;base64,...", ... }
   */
  function exportSignatures() {
    const signatures = {};
    Object.keys(signaturePads).forEach((key) => {
      const pad = signaturePads[key];
      if (pad && pad.hasSignature) {
        signatures[key] = pad.canvas.toDataURL('image/png');
      } else {
        signatures[key] = null;
      }
    });
    return signatures;
  }

  /**
   * Restaura as assinaturas digitais desenhando-as nos respectivos canvas.
   * @param {object} signaturesDict - Objeto recuperado do armazenamento
   */
  function importSignatures(signaturesDict) {
    if (!signaturesDict || typeof signaturesDict !== 'object') return;

    Object.keys(signaturesDict).forEach((key) => {
      const dataUrl = signaturesDict[key];
      const pad = signaturePads[key];

      if (dataUrl && pad && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/png;base64,')) {
        const img = new Image();
        img.onload = () => {
          clearSignature(key);
          const dpr = window.devicePixelRatio || 1;
          pad.ctx.drawImage(img, 0, 0, pad.canvas.width / dpr, pad.canvas.height / dpr);
          pad.hasSignature = true;
        };
        img.src = dataUrl;
      }
    });
  }

  // Exportação Global Universal (Compatível com duplo-clique local e bundlers)
  const GBCanvas = {
    initSignaturePads,
    clearSignature,
    clearAllSignatures,
    exportSignatures,
    importSignatures
  };

  global.GBCanvas = GBCanvas;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GBCanvas;
  }
})(typeof window !== 'undefined' ? window : this);

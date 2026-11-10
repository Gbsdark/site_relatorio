/**
 * ============================================================================
 * MÓDULO DE PERSISTÊNCIA LOCAL (LOCALSTORAGE) - GRUPO BURGUÊS
 * Arquivo: src/assets/js/storage.js
 * 
 * Responsabilidades:
 * - Persistência automática no navegador dos dados do formulário
 * - Salvamento de assinaturas digitais em Base64
 * - Armazenamento de foto de evidência comprimida
 * - Limpeza e restauração de dados para nova auditoria
 * ============================================================================
 */

(function (global) {
  'use strict';

  // Chaves de armazenamento no LocalStorage
  const STORAGE_KEYS = {
    DATA: 'gb_ata_pre_implantacao_dados',
    PHOTO: 'gb_ata_pre_implantacao_foto',
    SIGS: 'gb_ata_pre_implantacao_sigs'
  };

  /**
   * Salva os dados do formulário no LocalStorage em formato JSON.
   * @param {object} formData - Objeto com os dados dos campos
   */
  function saveFormData(formData) {
    try {
      localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(formData));
    } catch (err) {
      console.warn('[Storage] Falha ao salvar dados do formulário:', err);
    }
  }

  /**
   * Recupera os dados salvos do formulário.
   * @returns {object|null}
   */
  function restoreFormData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DATA);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('[Storage] Falha ao recuperar formulário:', err);
      return null;
    }
  }

  /**
   * Salva o estado das assinaturas digitais em Base64.
   * @param {object} signaturesDict - Objeto com os dataURLs de cada canvas
   */
  function saveSignatures(signaturesDict) {
    try {
      const hasAny = Object.values(signaturesDict || {}).some(Boolean);
      if (!hasAny) {
        localStorage.removeItem(STORAGE_KEYS.SIGS);
        return;
      }
      localStorage.setItem(STORAGE_KEYS.SIGS, JSON.stringify(signaturesDict));
    } catch (err) {
      console.warn('[Storage] Falha ao salvar assinaturas:', err);
    }
  }

  /**
   * Recupera as assinaturas digitais salvas.
   * @returns {object|null}
   */
  function restoreSignatures() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SIGS);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('[Storage] Falha ao restaurar assinaturas:', err);
      return null;
    }
  }

  /**
   * Salva a foto de comprovação em Base64 no LocalStorage.
   * @param {string} dataUrl - String Base64 da imagem
   */
  function savePhoto(dataUrl) {
    try {
      if (!dataUrl) {
        removePhoto();
        return;
      }
      localStorage.setItem(STORAGE_KEYS.PHOTO, dataUrl);
    } catch (err) {
      console.warn('[Storage] Falha ao salvar foto no LocalStorage:', err);
    }
  }

  /**
   * Recupera a foto de comprovação salva.
   * @returns {string|null}
   */
  function restorePhoto() {
    try {
      const photo = localStorage.getItem(STORAGE_KEYS.PHOTO);
      if (photo && photo.startsWith('data:image/')) {
        return photo;
      }
      return null;
    } catch (err) {
      console.warn('[Storage] Falha ao restaurar foto:', err);
      return null;
    }
  }

  /**
   * Remove a foto de comprovação salva.
   */
  function removePhoto() {
    try {
      localStorage.removeItem(STORAGE_KEYS.PHOTO);
    } catch (_) {}
  }

  /**
   * Limpa todos os dados salvos deste formulário no LocalStorage.
   */
  function clearAllStoredData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.DATA);
      localStorage.removeItem(STORAGE_KEYS.PHOTO);
      localStorage.removeItem(STORAGE_KEYS.SIGS);
    } catch (_) {}
  }

  // Exportação Global Universal (Compatível com duplo-clique local e bundlers)
  const GBStorage = {
    saveFormData,
    restoreFormData,
    saveSignatures,
    restoreSignatures,
    savePhoto,
    restorePhoto,
    removePhoto,
    clearAllStoredData
  };

  global.GBStorage = GBStorage;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GBStorage;
  }
})(typeof window !== 'undefined' ? window : this);

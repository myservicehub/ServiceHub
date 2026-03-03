import apiClient from './client';

export async function getTradespeopleVerificationFileBase64(filename) {
  try {
    if (!filename) return '';
    if (typeof filename === 'string' && filename.startsWith('data:')) return filename;

    // First try the base64 endpoint (prioritizes DB-stored base64)
    try {
      const b64Res = await apiClient.get(`/admin/tradespeople-verifications/document-base64/${encodeURIComponent(filename)}`, {
        timeout: 15000 // 15s timeout for individual file fetch
      });
      const data = b64Res?.data || {};
      if (data?.data_url) {
        return data.data_url;
      }
      if (data?.image_base64) {
        const ct = data?.content_type || 'application/octet-stream';
        return `data:${ct};base64,${data.image_base64}`;
      }
    } catch (e) {
      // Fall through to blob method if base64 endpoint fails
    }

    // Fallback: fetch the file as blob and convert client-side
    const blobRes = await apiClient.get(`/admin/tradespeople-verifications/document/${encodeURIComponent(filename)}`, { 
      responseType: 'blob',
      timeout: 20000 // 20s timeout for fallback blob fetch
    });
    const blob = blobRes?.data;
    const contentType = blob?.type || 'application/octet-stream';
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, uint8Array.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.error('getTradespeopleVerificationFileBase64 failed', filename, err);
    throw err;
  }
}
import apiClient from './client';

export async function getTradespeopleVerificationFileBase64(filename) {
  const url = `/admin/tradespeople-verifications/document/${filename}`;
  const response = await apiClient.get(url, { responseType: 'blob' });
  const blob = response.data;
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
}
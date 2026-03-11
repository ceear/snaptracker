import client from './client.js';

export async function getImages(params = {}) {
  const { data } = await client.get('/images', { params });
  return data;
}

export async function getImageDates(owner) {
  const { data } = await client.get('/images/dates', { params: { owner } });
  return data;
}

export async function getImageDetail(id) {
  const { data } = await client.get(`/images/${id}`);
  return data;
}

export async function deleteImage(id) {
  const { data } = await client.delete(`/images/${id}`);
  return data;
}

export async function getOwners() {
  const { data } = await client.get('/images/owners/list');
  return data;
}

function getToken() {
  try {
    const stored = JSON.parse(localStorage.getItem('snaptracker-auth') || '{}');
    return stored.state?.token || '';
  } catch {
    return '';
  }
}

export function getThumbUrl(id) {
  const token = getToken();
  return `/api/v1/images/${id}/thumb${token ? `?token=${token}` : ''}`;
}

export function getFullUrl(id) {
  const token = getToken();
  return `/api/v1/images/${id}/full${token ? `?token=${token}` : ''}`;
}

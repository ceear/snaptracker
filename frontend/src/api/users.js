import client from './client.js';

export async function getUsers() {
  const { data } = await client.get('/users');
  return data;
}

export async function createUser(userData) {
  const { data } = await client.post('/users', userData);
  return data;
}

export async function updateUser(id, updates) {
  const { data } = await client.patch(`/users/${id}`, updates);
  return data;
}

export async function deleteUser(id) {
  const { data } = await client.delete(`/users/${id}`);
  return data;
}

export async function rotateApiKey(id) {
  const { data } = await client.post(`/users/${id}/rotate-key`);
  return data;
}

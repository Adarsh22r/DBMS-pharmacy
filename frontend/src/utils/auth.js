export function getAuthUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    // JWT structure: header.payload.signature
    const base64Payload = token.split('.')[1];
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));
    return decoded; // { staff_id, username, role, full_name, iat, exp }
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
}

export function getRole() {
  return getAuthUser()?.role ?? null;
}

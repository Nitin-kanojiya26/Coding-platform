export const getAvatarSrc = (avatar) => {
  // If avatar is a string (file‑based URL), use it directly
  if (typeof avatar === 'string') {
    return avatar;
  }

  // If avatar is an object with data and contentType
  if (avatar?.data && avatar?.contentType) {
    let byteArray;

    // Handle the Buffer serialization format from Mongoose
    if (avatar.data.type === 'Buffer' && Array.isArray(avatar.data.data)) {
      byteArray = avatar.data.data; // { type: 'Buffer', data: [...] }
    } else if (Array.isArray(avatar.data)) {
      byteArray = avatar.data; // plain array
    } else if (typeof avatar.data === 'string') {
      // If it's already a base64 string
      return `data:${avatar.contentType};base64,${avatar.data}`;
    } else {
      // Fallback
      return `https://ui-avatars.com/api/?name=User&size=80&background=1a1a1a&color=ffffff`;
    }

    // Convert byte array to base64
    const uint8Array = new Uint8Array(byteArray);
    let binary = '';
    uint8Array.forEach(byte => binary += String.fromCharCode(byte));
    const base64 = btoa(binary);

    return `data:${avatar.contentType};base64,${base64}`;
  }

  // Fallback avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(avatar?.name || 'User')}&size=80&background=1a1a1a&color=ffffff`;
};
function generateRandomId(username, phoneNumber, date, length = 12) {
    const validUsername = username.replace(/\s+/g, '').substring(0, 3);
    const validPhoneNumber = phoneNumber.replace(/\D/g, '').substring(0, 3);
    const validDate = date.replace(/-/g, '').substring(2, 8);
    const base = (validUsername + validPhoneNumber + validDate).substring(0, length - 3);
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < length - base.length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomPart += characters[randomIndex];
    }
    return base + randomPart;
}
export default generateRandomId;

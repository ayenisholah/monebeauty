export function normalizeInternationalPhone(
  value: string,
  defaultCountryCode = "358",
) {
  let phone = value.trim().replace(/[\s().-]+/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  else if (phone.startsWith("+"))
    phone = `+${phone.slice(1).replace(/\D/g, "")}`;
  else if (phone.startsWith("0"))
    phone = `+${defaultCountryCode}${phone.slice(1).replace(/\D/g, "")}`;
  else phone = `+${phone.replace(/\D/g, "")}`;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

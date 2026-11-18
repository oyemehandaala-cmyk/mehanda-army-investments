export function buildWhatsAppEnquiryUrl(enquiry) {
  const inquiryText = encodeURIComponent(
    `Hello Mehanda Army Investments!\n` +
      `Name: ${enquiry.fullName}\n` +
      `Phone: ${enquiry.phone}\n` +
      `Email: ${enquiry.email || 'Not provided'}\n` +
      `Interest: ${enquiry.serviceInterest || 'Not specified'}\n` +
      `Message: ${enquiry.message || 'I would like to schedule a consultation.'}`
  );

  return `https://wa.me/919812947813?text=${inquiryText}`;
}

const generateWhatsAppLink = (data) => {
  const message = `Hello ${data.name},
Thank you for visiting Akar Fourwheel. Your Quotation for ${data.varient} is here:
  
Sales Agent: ${data.salesPerson}
HPN: ${data.HPN}
YEAR: ${data.year}
Fuel: ${data.fuel}
Variant: ${data.varient}
Color: ${data.color}
Ex-Showroom Price: ${data.ESP}
Total Discount Amount: ${data.totalDisc}
RTO Type: ${data.rtoType}
RTO Amount: ${data.rtoAmt}
Insurance Total: ${data.incTotal}
FastTag: ${data.fasttag}
TCS: ${data.tcs}
EW Type: ${data.ewType}
EW Amount: ${data.ew}
Accessory Amount: ${data.accTotal}
Coating Type: ${data.vasType}
Coating Amount: ${data.vas}
Final Deal Price: ${data.grandTotal}

Download the detailed quotation here: ${data.fileUrl}`;
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/91${data.mobile}?text=${encodedMessage}`;
};
export default generateWhatsAppLink;

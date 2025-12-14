import React, { useState, useRef, useEffect } from 'react';
import { X, Banknote, Receipt, User, Phone, FileText, AlertCircle, Loader2, Download } from 'lucide-react';

// --- THEME CONSTANTS (Based on Belle Studio Logo Colors) ---
const THEME = {
  primaryText: "text-[#8FBC8F] dark:text-[#8FBC8F]",
  headingText: "text-[#2F4F4F] dark:text-white",
  subText: "text-gray-500 dark:text-gray-400",

  gradientText: "bg-gradient-to-r from-[#6B8E6B] to-[#8FBC8F] bg-clip-text text-transparent",
  gradientBg: "bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8]",

  modalBg: "bg-white dark:bg-[#1e1e1e]",

  inputBase: "w-full px-4 py-3 rounded-xl border-2 border-[#E8D5C4] dark:border-[#8FBC8F]/30 bg-white dark:bg-[#1A1A1D] text-gray-900 dark:text-white font-medium focus:border-[#8FBC8F] dark:focus:border-[#8FBC8F] outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600",

  buttonPrimary: "bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8] text-white shadow-lg shadow-[#8FBC8F]/30 hover:shadow-[#8FBC8F]/50 hover:-translate-y-0.5 transition-all duration-200",
};

const CheckoutModal = ({ isOpen, onClose, cartItems, totals, onCheckout }) => {
  const [amountPaid, setAmountPaid] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [phoneError, setPhoneError] = useState('');
  const receiptRef = useRef(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setPhoneError('');
      setReceiptData(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const isPaymentAmountValid = amountPaid && parseFloat(amountPaid) >= totals.total;
  const isPhoneValid = /^09\d{9}$/.test(customerPhone);
  const isCustomerValid = customerName.trim() !== '' && isPhoneValid;
  const isFormValid = isPaymentAmountValid && isCustomerValid;

  const change = amountPaid ? (parseFloat(amountPaid) - totals.total) : 0;

  const handlePhoneChange = (e) => {
    let value = e.target.value;

    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');

    // Limit to 11 digits and ensure it starts with 09
    if (cleaned.length > 0) {
      if (cleaned.startsWith('09')) {
        value = cleaned.substring(0, 11);
      } else if (cleaned.startsWith('9')) {
        value = '0' + cleaned.substring(0, 10);
      } else if (cleaned.startsWith('0')) {
        value = cleaned.substring(0, 11);
      } else {
        value = '09' + cleaned.substring(0, 9);
      }
    } else {
      value = '';
    }

    setCustomerPhone(value);

    // Validate phone format: 09XXXXXXXXX (11 digits total)
    const regex = /^09\d{9}$/;
    if (value && !regex.test(value)) {
      setPhoneError('Format: 09XXXXXXXXX (11 digits, e.g., 09175550123)');
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsProcessing(true);

    const checkoutData = {
      items: cartItems.map(item => ({
        product: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: 0
      })),
      payment_method: 'CASH',
      amount_paid: parseFloat(amountPaid),
      payment_reference: '',
      customer_name: customerName,
      customer_phone: customerPhone,
      notes: notes,
      subtotal: totals.subtotal,
      tax: 0,
      total_amount: totals.total,
      discount: 0
    };

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create receipt data
    const receipt = {
      ...checkoutData,
      transactionId: 'TRX' + Date.now(),
      timestamp: new Date(),
      change: change
    };

    setReceiptData(receipt);
    setIsProcessing(false);

    // Call onCheckout if provided (non-blocking)
    if (onCheckout) {
      try {
        await onCheckout(checkoutData);
      } catch (error) {
        console.error('Checkout error:', error);
      }
    }
  };

  const resetForm = () => {
    setAmountPaid('');
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setPhoneError('');
  };

  const closeReceipt = () => {
    setReceiptData(null);
    resetForm();
    onClose(); // Close the entire modal when done with receipt
  };

  const handleQuickAmount = (amount) => setAmountPaid(amount.toString());

  // Download receipt as image
  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `receipt_${receiptData.transactionId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to download receipt:', error);
    }
  };

  if (!isOpen) return null;

  const labelClass = `flex items-center gap-1.5 text-xs font-bold ${THEME.subText} mb-1.5 uppercase tracking-wide`;

  // RECEIPT VIEW - Compact thermal receipt style
  if (receiptData) {
    return (
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className={`rounded-2xl w-full max-w-xs shadow-2xl flex flex-col border border-gray-200 dark:border-[#8FBC8F]/20 ${THEME.modalBg}`}>

          {/* Receipt Header - Compact */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-[#8FBC8F]/10 bg-gray-50/50 dark:bg-[#1e1e1e]">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#8FBC8F]" />
              <span className={`text-sm font-bold ${THEME.headingText}`}>Receipt</span>
            </div>
            <button
              onClick={closeReceipt}
              className="p-1.5 text-gray-400 hover:text-[#8FBC8F] hover:bg-[#8FBC8F]/10 rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Receipt Content - Thermal Paper Style */}
          <div ref={receiptRef} className="p-4 space-y-3 overflow-y-auto max-h-[60vh] bg-white text-gray-900" style={{ fontFamily: 'monospace' }}>

            {/* Store Header */}
            <div className="text-center border-b border-dashed border-gray-300 pb-3">
              <img src="/logo.jpg" alt="Belle Studio" className="w-16 h-16 mx-auto mb-2 rounded-lg" />
              <p className="text-xs font-bold">BELLE STUDIO</p>
              <p className="text-[10px] text-gray-500">Flower Shop</p>
              <p className="text-[10px] text-gray-500">Malamig, Bustos, Philippines</p>
              <p className="text-[10px] text-gray-500">Tel: 0950 373 9003</p>
            </div>

            {/* Transaction Info */}
            <div className="text-[10px] space-y-0.5 border-b border-dashed border-gray-300 pb-2">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{receiptData.timestamp.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{receiptData.timestamp.toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>TXN#:</span>
                <span className="font-bold">{receiptData.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{receiptData.customer_name}</span>
              </div>
            </div>

            {/* Items */}
            <div className="text-[10px] space-y-1 border-b border-dashed border-gray-300 pb-2">
              <div className="flex justify-between font-bold border-b border-gray-200 pb-1">
                <span>ITEM</span>
                <span>AMOUNT</span>
              </div>
              {receiptData.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="truncate max-w-[140px]">{item.product}</span>
                    <span className="font-semibold">₱{(item.quantity * item.unit_price).toFixed(2)}</span>
                  </div>
                  <div className="text-gray-500 text-[9px] pl-2">
                    {item.quantity} x ₱{item.unit_price.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₱{receiptData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs border-t border-gray-300 pt-1 mt-1">
                <span>TOTAL:</span>
                <span>₱{receiptData.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="text-[10px] space-y-0.5 border-t border-dashed border-gray-300 pt-2">
              <div className="flex justify-between">
                <span>Cash:</span>
                <span>₱{receiptData.amount_paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Change:</span>
                <span>₱{receiptData.change.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {receiptData.notes && (
              <div className="text-[9px] text-gray-500 border-t border-dashed border-gray-300 pt-2">
                <span className="font-bold">Note:</span> {receiptData.notes}
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-[9px] text-gray-400 border-t border-dashed border-gray-300 pt-2">
              <p>Thank you for your purchase!</p>
              <p>Please keep this receipt</p>
            </div>
          </div>

          {/* Receipt Actions */}
          <div className="p-3 border-t border-gray-200 dark:border-[#8FBC8F]/10 bg-white dark:bg-[#1e1e1e] flex gap-2 shrink-0">
            <button
              onClick={handleDownloadReceipt}
              className="flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border-2 border-[#8FBC8F] text-[#8FBC8F] hover:bg-[#8FBC8F]/10 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={closeReceipt}
              className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 ${THEME.buttonPrimary}`}
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CHECKOUT VIEW - User Friendly Design
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
      <div className={`rounded-2xl w-full max-w-lg max-h-[95vh] overflow-hidden shadow-2xl flex flex-col border border-gray-200 dark:border-[#8FBC8F]/20 ${THEME.modalBg}`}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#8FBC8F]/10 bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Complete Payment</h3>
              <p className="text-xs text-white/80">{cartItems.length} item{cartItems.length > 1 ? 's' : ''} • ₱{totals.total.toFixed(2)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#151515]">

          {/* Order Summary */}
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Order Summary</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{item.quantity}x {item.name}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">₱{(item.quantity * item.unit_price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3 flex justify-between">
              <span className="font-bold text-gray-900 dark:text-white">Total</span>
              <span className="text-xl font-extrabold text-[#8FBC8F]">₱{totals.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Section */}
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Payment</p>

            {/* Amount Input */}
            <div className="mb-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Cash Received</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">₱</span>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  step="0.01"
                  className={`w-full pl-10 pr-4 py-3 text-2xl font-bold rounded-xl border-2 ${amountPaid && change >= 0
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : amountPaid && change < 0
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1A1D] text-gray-900 dark:text-white'
                    } outline-none transition-all`}
                  placeholder="0.00"
                  disabled={isProcessing}
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleQuickAmount(totals.total)}
                disabled={isProcessing}
                className="py-2 px-3 bg-[#8FBC8F]/10 border border-[#8FBC8F]/30 text-[#8FBC8F] rounded-lg text-xs font-bold hover:bg-[#8FBC8F]/20 transition-all"
              >
                Exact
              </button>
              {[50, 100, 200, 500, 1000, 2000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleQuickAmount(amount)}
                  disabled={isProcessing || amount < totals.total}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${amount < totals.total
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-[#8FBC8F]/20 hover:text-[#8FBC8F] hover:border-[#8FBC8F]'
                    }`}
                >
                  ₱{amount}
                </button>
              ))}
            </div>

            {/* Change Display */}
            {amountPaid && (
              <div className={`p-3 rounded-xl flex justify-between items-center ${change >= 0
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                <span className="font-semibold text-sm">{change >= 0 ? '💵 Change' : '⚠️ Need more'}</span>
                <span className="text-xl font-extrabold">₱{Math.abs(change).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Customer Details */}
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Customer Details</p>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <User size={12} /> Customer Name <span className="text-[#8FBC8F]">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border-2 ${customerName.trim() !== ''
                    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-[#1A1A1D] text-gray-900 dark:text-white outline-none focus:border-[#8FBC8F] transition-all`}
                  placeholder="Enter customer name"
                  disabled={isProcessing}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Phone size={12} /> Phone Number <span className="text-[#8FBC8F]">*</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  className={`w-full px-4 py-2.5 rounded-xl border-2 ${phoneError
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                    : isPhoneValid
                      ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                      : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-[#1A1A1D] text-gray-900 dark:text-white outline-none focus:border-[#8FBC8F] transition-all`}
                  placeholder="09XXXXXXXXX"
                  disabled={isProcessing}
                />
                {phoneError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {phoneError}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <FileText size={12} /> Notes <span className="text-gray-400 text-[10px]">(Optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="2"
                  className={`w-full px-4 py-2.5 rounded-xl border-2 resize-none ${notes.trim() !== ''
                    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-[#1A1A1D] text-gray-900 dark:text-white outline-none focus:border-[#8FBC8F] transition-all`}
                  placeholder="Add notes (e.g., Delivery instructions)"
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-[#8FBC8F]/10 bg-white dark:bg-[#1e1e1e] flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isProcessing}
            className={`flex-[2] py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${THEME.buttonPrimary}`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Pay ₱{totals.total.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
